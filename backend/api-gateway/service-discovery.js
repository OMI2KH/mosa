// api-gateway/service-discovery.js

/**
 * 🏢 MOSA FORGE - Enterprise Service Discovery
 * 🔍 Dynamic service registration, health checking, and load balancing
 * 🔧 Powered by Chereka | Founded by Oumer Muktar
 * 
 * @module ServiceDiscovery
 * @version Enterprise 1.0
 */

const { EventEmitter } = require('events');
const Redis = require('redis');
const { performance } = require('perf_hooks');
const { Logger } = require('../utils/logger');
const { MetricsCollector } = require('../utils/metrics-collector');

class ServiceDiscovery extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // Redis configuration
      redisUrl: options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      
      // Service registration
      registrationTTL: options.registrationTTL || 30000, // 30 seconds
      heartbeatInterval: options.heartbeatInterval || 15000, // 15 seconds
      
      // Health checking
      healthCheckEnabled: options.healthCheckEnabled !== false,
      healthCheckInterval: options.healthCheckInterval || 30000, // 30 seconds
      healthCheckTimeout: options.healthCheckTimeout || 5000, // 5 seconds
      healthCheckRetries: options.healthCheckRetries || 3,
      
      // Load balancing
      loadBalancingEnabled: options.loadBalancingEnabled !== false,
      loadBalancerType: options.loadBalancerType || 'round_robin', // round_robin, least_conn, ip_hash
      stickySessions: options.stickySessions !== false,
      sessionDuration: options.sessionDuration || 3600000, // 1 hour
      
      // Service discovery
      refreshInterval: options.refreshInterval || 10000, // 10 seconds
      cacheEnabled: options.cacheEnabled !== false,
      cacheTTL: options.cacheTTL || 5000, // 5 seconds
      
      // Failure detection
      failureThreshold: options.failureThreshold || 3,
      failureWindow: options.failureWindow || 60000, // 1 minute
      isolationEnabled: options.isolationEnabled !== false,
      isolationDuration: options.isolationDuration || 300000, // 5 minutes
      
      // Auto-scaling
      autoScalingEnabled: options.autoScalingEnabled !== false,
      scaleUpThreshold: options.scaleUpThreshold || 80, // 80% CPU/Memory
      scaleDownThreshold: options.scaleDownThreshold || 20, // 20% CPU/Memory
      
      // Monitoring
      enableMetrics: options.enableMetrics !== false,
      enableLogging: options.enableLogging !== false,
      
      // Environment
      environment: process.env.NODE_ENV || 'development',
      clusterName: options.clusterName || 'mosa-forge-cluster',
      
      ...options
    };

    this.redis = Redis.createClient({
      url: this.options.redisUrl,
      socket: {
        tls: this.options.environment === 'production',
        reconnectStrategy: (retries) => Math.min(retries * 100, 5000)
      }
    });

    this.logger = new Logger({
      service: 'service-discovery',
      level: this.options.environment === 'production' ? 'info' : 'debug'
    });

    this.metrics = new MetricsCollector({
      service: 'service-discovery',
      discovery: true
    });

    // Service registry
    this.services = new Map();
    this.serviceInstances = new Map();
    this.healthStatus = new Map();
    this.loadBalancers = new Map();
    
    // Caching
    this.serviceCache = new Map();
    this.instanceCache = new Map();
    
    // Failure tracking
    this.failureCounts = new Map();
    this.isolatedServices = new Map();
    
    // Statistics
    this.stats = {
      totalRegistrations: 0,
      activeRegistrations: 0,
      healthChecks: 0,
      failedHealthChecks: 0,
      serviceDiscoveries: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    this.initialized = false;
    this.shuttingDown = false;

    this.initialize();
  }

  /**
   * 🏗️ Initialize service discovery
   */
  async initialize() {
    try {
      await this.redis.connect();
      await this.loadExistingServices();
      this.startHealthMonitoring();
      this.startServiceRefresh();
      this.startMetricsCollection();
      this.startCleanupTasks();
      
      this.initialized = true;
      
      this.logger.info('Service Discovery initialized successfully', {
        cluster: this.options.clusterName,
        features: {
          healthChecking: this.options.healthCheckEnabled,
          loadBalancing: this.options.loadBalancingEnabled,
          autoScaling: this.options.autoScalingEnabled,
          failureIsolation: this.options.isolationEnabled
        }
      });

      this.emit('initialized', {
        timestamp: new Date().toISOString(),
        cluster: this.options.clusterName,
        services: Array.from(this.services.keys())
      });

    } catch (error) {
      this.logger.error('Service Discovery initialization failed', {
        error: error.message,
        stack: error.stack
      });

      this.emit('initializationFailed', {
        timestamp: new Date().toISOString(),
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 📝 Register a service instance
   */
  async registerService(serviceInfo) {
    if (!this.initialized) {
      throw new DiscoveryError('SERVICE_DISCOVERY_NOT_INITIALIZED');
    }

    const startTime = performance.now();

    try {
      const serviceInstance = this.validateServiceInfo(serviceInfo);
      const instanceKey = this.generateInstanceKey(serviceInstance);
      
      // Store service metadata
      await this.storeServiceMetadata(serviceInstance);
      
      // Store instance information
      await this.storeInstanceInfo(instanceKey, serviceInstance);
      
      // Update local registry
      this.updateLocalRegistry(serviceInstance, instanceKey);
      
      // Initialize load balancer for service
      await this.initializeLoadBalancer(serviceInstance.serviceName);
      
      this.stats.totalRegistrations++;
      this.stats.activeRegistrations++;

      const responseTime = performance.now() - startTime;

      this.logger.info('Service instance registered', {
        service: serviceInstance.serviceName,
        instance: serviceInstance.instanceId,
        address: `${serviceInstance.host}:${serviceInstance.port}`,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('serviceRegistered', {
        service: serviceInstance.serviceName,
        instance: serviceInstance.instanceId,
        metadata: serviceInstance,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        instanceId: serviceInstance.instanceId,
        registrationKey: instanceKey,
        ttl: this.options.registrationTTL
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      this.logger.error('Service registration failed', {
        service: serviceInfo.serviceName,
        error: error.message,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('registrationFailed', {
        service: serviceInfo.serviceName,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * 🔄 Refresh service registration (heartbeat)
   */
  async refreshRegistration(instanceKey) {
    if (!this.initialized) return false;

    try {
      const ttl = Math.ceil(this.options.registrationTTL / 1000);
      const result = await this.redis.expire(instanceKey, ttl);
      
      if (result) {
        this.logger.debug('Service registration refreshed', { instanceKey });
        this.emit('registrationRefreshed', { instanceKey, timestamp: new Date().toISOString() });
      } else {
        this.logger.warn('Service registration refresh failed - instance not found', { instanceKey });
      }

      return result;

    } catch (error) {
      this.logger.error('Service registration refresh failed', {
        instanceKey,
        error: error.message
      });
      return false;
    }
  }

  /**
   * 🗑️ Unregister a service instance
   */
  async unregisterService(instanceKey) {
    if (!this.initialized) return false;

    try {
      // Remove from Redis
      await this.redis.del(instanceKey);
      
      // Remove service metadata if this is the last instance
      await this.cleanupServiceMetadata(instanceKey);
      
      // Update local registry
      this.removeFromLocalRegistry(instanceKey);
      
      this.stats.activeRegistrations--;

      this.logger.info('Service instance unregistered', { instanceKey });

      this.emit('serviceUnregistered', {
        instanceKey,
        timestamp: new Date().toISOString()
      });

      return true;

    } catch (error) {
      this.logger.error('Service unregistration failed', {
        instanceKey,
        error: error.message
      });
      return false;
    }
  }

  /**
   * 🔍 Discover service instances
   */
  async discoverService(serviceName, options = {}) {
    if (!this.initialized) {
      throw new DiscoveryError('SERVICE_DISCOVERY_NOT_INITIALIZED');
    }

    const startTime = performance.now();
    this.stats.serviceDiscoveries++;

    try {
      // Check cache first
      if (this.options.cacheEnabled) {
        const cached = this.getCachedInstances(serviceName);
        if (cached) {
          this.stats.cacheHits++;
          return this.applyLoadBalancing(cached, options);
        }
        this.stats.cacheMisses++;
      }

      // Get instances from Redis
      const instances = await this.getServiceInstances(serviceName);
      
      // Cache the results
      if (this.options.cacheEnabled) {
        this.cacheInstances(serviceName, instances);
      }

      // Apply load balancing
      const selectedInstance = this.applyLoadBalancing(instances, options);

      const responseTime = performance.now() - startTime;

      this.logger.debug('Service discovery completed', {
        service: serviceName,
        instances: instances.length,
        selected: selectedInstance?.instanceId,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('serviceDiscovered', {
        service: serviceName,
        instances: instances.length,
        selectedInstance: selectedInstance?.instanceId,
        responseTime,
        timestamp: new Date().toISOString()
      });

      return selectedInstance;

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      this.logger.error('Service discovery failed', {
        service: serviceName,
        error: error.message,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('discoveryFailed', {
        service: serviceName,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * 🩺 Get service health status
   */
  async getServiceHealth(serviceName) {
    if (!this.initialized) {
      throw new DiscoveryError('SERVICE_DISCOVERY_NOT_INITIALIZED');
    }

    const instances = await this.getServiceInstances(serviceName);
    const healthStatus = this.healthStatus.get(serviceName) || new Map();
    
    const healthReport = {
      service: serviceName,
      timestamp: new Date().toISOString(),
      totalInstances: instances.length,
      healthyInstances: 0,
      unhealthyInstances: 0,
      unknownInstances: 0,
      instances: []
    };

    for (const instance of instances) {
      const instanceHealth = healthStatus.get(instance.instanceId) || { status: 'unknown', lastCheck: null };
      
      const instanceStatus = {
        instanceId: instance.instanceId,
        address: `${instance.host}:${instance.port}`,
        status: instanceHealth.status,
        lastCheck: instanceHealth.lastCheck,
        responseTime: instanceHealth.responseTime,
        metadata: instance.metadata
      };

      healthReport.instances.push(instanceStatus);

      if (instanceHealth.status === 'healthy') {
        healthReport.healthyInstances++;
      } else if (instanceHealth.status === 'unhealthy') {
        healthReport.unhealthyInstances++;
      } else {
        healthReport.unknownInstances++;
      }
    }

    return healthReport;
  }

  /**
   * 📊 Get service statistics
   */
  async getServiceStats(serviceName) {
    const instances = await this.getServiceInstances(serviceName);
    const loadBalancer = this.loadBalancers.get(serviceName);
    
    return {
      service: serviceName,
      timestamp: new Date().toISOString(),
      totalInstances: instances.length,
      loadBalancer: loadBalancer ? loadBalancer.getStats() : null,
      failureCount: this.failureCounts.get(serviceName) || 0,
      isIsolated: this.isolatedServices.has(serviceName),
      instances: instances.map(instance => ({
        instanceId: instance.instanceId,
        address: `${instance.host}:${instance.port}`,
        registeredAt: instance.registeredAt,
        lastSeen: instance.lastSeen,
        metadata: instance.metadata
      }))
    };
  }

  /**
   * 🎯 Get all available services
   */
  async getAllServices() {
    if (!this.initialized) {
      throw new DiscoveryError('SERVICE_DISCOVERY_NOT_INITIALIZED');
    }

    try {
      const serviceKeys = await this.redis.keys('service:*:metadata');
      const services = [];

      for (const key of serviceKeys) {
        const serviceName = key.split(':')[1];
        const instances = await this.getServiceInstances(serviceName);
        
        if (instances.length > 0) {
          services.push({
            name: serviceName,
            instances: instances.length,
            loadBalancer: this.loadBalancers.get(serviceName)?.getStats() || null
          });
        }
      }

      return services;

    } catch (error) {
      this.logger.error('Failed to get all services', { error: error.message });
      throw error;
    }
  }

  /**
   * 🚫 Isolate a service instance
   */
  async isolateInstance(instanceKey, reason = 'manual', duration = null) {
    const isolationDuration = duration || this.options.isolationDuration;
    const isolatedUntil = Date.now() + isolationDuration;

    this.isolatedServices.set(instanceKey, {
      until: isolatedUntil,
      reason,
      isolatedAt: new Date().toISOString()
    });

    this.logger.warn('Service instance isolated', {
      instanceKey,
      reason,
      isolatedUntil: new Date(isolatedUntil).toISOString()
    });

    this.emit('instanceIsolated', {
      instanceKey,
      reason,
      isolatedUntil: new Date(isolatedUntil).toISOString(),
      timestamp: new Date().toISOString()
    });

    return true;
  }

  /**
   * ✅ Remove service instance isolation
   */
  async removeIsolation(instanceKey) {
    const wasIsolated = this.isolatedServices.delete(instanceKey);

    if (wasIsolated) {
      this.logger.info('Service instance isolation removed', { instanceKey });
      
      this.emit('isolationRemoved', {
        instanceKey,
        timestamp: new Date().toISOString()
      });
    }

    return wasIsolated;
  }

  // 🔧 PRIVATE METHODS

  /**
   * 📥 Load existing services from Redis
   */
  async loadExistingServices() {
    try {
      const instanceKeys = await this.redis.keys('service:*:instance:*');
      
      for (const key of instanceKeys) {
        const instanceData = await this.redis.get(key);
        
        if (instanceData) {
          const instance = JSON.parse(instanceData);
          this.updateLocalRegistry(instance, key);
        }
      }

      this.logger.info('Existing services loaded from Redis', {
        instances: instanceKeys.length,
        services: Array.from(this.services.keys())
      });

    } catch (error) {
      this.logger.error('Failed to load existing services', { error: error.message });
    }
  }

  /**
   * ✅ Validate service information
   */
  validateServiceInfo(serviceInfo) {
    const required = ['serviceName', 'instanceId', 'host', 'port'];
    const missing = required.filter(field => !serviceInfo[field]);
    
    if (missing.length > 0) {
      throw new DiscoveryError('INVALID_SERVICE_INFO', {
        missingFields: missing,
        provided: serviceInfo
      });
    }

    // Set default values
    return {
      protocol: 'http',
      healthCheckPath: '/health',
      metadata: {},
      registeredAt: new Date().toISOString(),
      lastSeen: Date.now(),
      ...serviceInfo
    };
  }

  /**
   * 🆔 Generate instance key
   */
  generateInstanceKey(serviceInstance) {
    return `service:${serviceInstance.serviceName}:instance:${serviceInstance.instanceId}`;
  }

  /**
   * 💾 Store service metadata
   */
  async storeServiceMetadata(serviceInstance) {
    const metadataKey = `service:${serviceInstance.serviceName}:metadata`;
    const metadata = {
      name: serviceInstance.serviceName,
      description: serviceInstance.description || '',
      version: serviceInstance.version || '1.0.0',
      tags: serviceInstance.tags || [],
      lastUpdated: new Date().toISOString()
    };

    await this.redis.set(metadataKey, JSON.stringify(metadata));
  }

  /**
   * 💾 Store instance information
   */
  async storeInstanceInfo(instanceKey, serviceInstance) {
    const ttl = Math.ceil(this.options.registrationTTL / 1000);
    await this.redis.setex(instanceKey, ttl, JSON.stringify(serviceInstance));
  }

  /**
   * 📝 Update local registry
   */
  updateLocalRegistry(serviceInstance, instanceKey) {
    const { serviceName } = serviceInstance;

    // Update services map
    if (!this.services.has(serviceName)) {
      this.services.set(serviceName, new Set());
    }
    this.services.get(serviceName).add(instanceKey);

    // Update instances map
    this.serviceInstances.set(instanceKey, serviceInstance);

    // Update health status
    if (!this.healthStatus.has(serviceName)) {
      this.healthStatus.set(serviceName, new Map());
    }
  }

  /**
   * 🗑️ Remove from local registry
   */
  removeFromLocalRegistry(instanceKey) {
    // Find which service this instance belongs to
    for (const [serviceName, instances] of this.services.entries()) {
      if (instances.has(instanceKey)) {
        instances.delete(instanceKey);
        
        // Remove service if no instances left
        if (instances.size === 0) {
          this.services.delete(serviceName);
          this.loadBalancers.delete(serviceName);
        }
        
        break;
      }
    }

    this.serviceInstances.delete(instanceKey);
    this.serviceCache.delete(instanceKey.split(':')[1]); // Clear cache for this service
  }

  /**
   * 🧹 Cleanup service metadata
   */
  async cleanupServiceMetadata(instanceKey) {
    const serviceName = instanceKey.split(':')[1];
    const instances = this.services.get(serviceName);

    if (!instances || instances.size === 0) {
      // No more instances for this service, remove metadata
      await this.redis.del(`service:${serviceName}:metadata`);
    }
  }

  /**
   * 🔧 Initialize load balancer
   */
  async initializeLoadBalancer(serviceName) {
    if (!this.options.loadBalancingEnabled) return;

    if (!this.loadBalancers.has(serviceName)) {
      const loadBalancer = new LoadBalancer({
        type: this.options.loadBalancerType,
        stickySessions: this.options.stickySessions,
        sessionDuration: this.options.sessionDuration
      });

      this.loadBalancers.set(serviceName, loadBalancer);
      
      this.logger.debug('Load balancer initialized', { service: serviceName });
    }
  }

  /**
   * 🔍 Get service instances
   */
  async getServiceInstances(serviceName) {
    // Check if service is isolated
    if (this.isolatedServices.has(serviceName)) {
      const isolation = this.isolatedServices.get(serviceName);
      if (Date.now() < isolation.until) {
        throw new DiscoveryError('SERVICE_ISOLATED', {
          service: serviceName,
          reason: isolation.reason,
          isolatedUntil: new Date(isolation.until).toISOString()
        });
      } else {
        // Isolation expired, remove it
        this.isolatedServices.delete(serviceName);
      }
    }

    const instanceKeys = await this.redis.keys(`service:${serviceName}:instance:*`);
    const instances = [];

    for (const key of instanceKeys) {
      try {
        const instanceData = await this.redis.get(key);
        
        if (instanceData) {
          const instance = JSON.parse(instanceData);
          
          // Check if instance is isolated
          if (!this.isolatedServices.has(key)) {
            instances.push(instance);
          }
        }
      } catch (error) {
        this.logger.warn('Failed to parse instance data', { key, error: error.message });
      }
    }

    return instances;
  }

  /**
   * ⚖️ Apply load balancing
   */
  applyLoadBalancing(instances, options = {}) {
    if (instances.length === 0) {
      throw new DiscoveryError('NO_INSTANCES_AVAILABLE', { service: options.serviceName });
    }

    if (instances.length === 1) {
      return instances[0];
    }

    const serviceName = instances[0].serviceName;
    const loadBalancer = this.loadBalancers.get(serviceName);

    if (!loadBalancer) {
      // Use round-robin as default
      return this.roundRobinSelection(instances, serviceName);
    }

    return loadBalancer.selectInstance(instances, options);
  }

  /**
   * 🔄 Round-robin selection
   */
  roundRobinSelection(instances, serviceName) {
    if (!this.roundRobinIndexes) {
      this.roundRobinIndexes = new Map();
    }

    const currentIndex = this.roundRobinIndexes.get(serviceName) || 0;
    const nextIndex = (currentIndex + 1) % instances.length;
    
    this.roundRobinIndexes.set(serviceName, nextIndex);

    return instances[currentIndex];
  }

  /**
   * 💾 Get cached instances
   */
  getCachedInstances(serviceName) {
    const cached = this.serviceCache.get(serviceName);
    
    if (cached && Date.now() < cached.expires) {
      return cached.instances;
    }
    
    if (cached) {
      this.serviceCache.delete(serviceName);
    }
    
    return null;
  }

  /**
   * 💾 Cache instances
   */
  cacheInstances(serviceName, instances) {
    this.serviceCache.set(serviceName, {
      instances,
      expires: Date.now() + this.options.cacheTTL
    });
  }

  /**
   * 🩺 Start health monitoring
   */
  startHealthMonitoring() {
    if (!this.options.healthCheckEnabled) return;

    this.healthInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.options.healthCheckInterval);

    this.logger.info('Health monitoring started', {
      interval: this.options.healthCheckInterval
    });
  }

  /**
   * 🩺 Perform health checks
   */
  async performHealthChecks() {
    for (const [serviceName, instanceKeys] of this.services.entries()) {
      for (const instanceKey of instanceKeys) {
        await this.checkInstanceHealth(serviceName, instanceKey);
      }
    }
  }

  /**
   * 🩺 Check instance health
   */
  async checkInstanceHealth(serviceName, instanceKey) {
    const instance = this.serviceInstances.get(instanceKey);
    
    if (!instance) {
      this.logger.warn('Instance not found for health check', { instanceKey });
      return;
    }

    this.stats.healthChecks++;

    try {
      const healthCheckUrl = this.buildHealthCheckUrl(instance);
      const health = await this.performHealthCheckRequest(healthCheckUrl);
      
      this.updateHealthStatus(serviceName, instanceKey, health);
      
      // Reset failure count on successful health check
      this.resetFailureCount(serviceName, instanceKey);

      this.logger.debug('Health check passed', {
        service: serviceName,
        instance: instance.instanceId,
        responseTime: health.responseTime
      });

    } catch (error) {
      this.stats.failedHealthChecks++;
      
      this.logger.warn('Health check failed', {
        service: serviceName,
        instance: instance.instanceId,
        error: error.message
      });

      this.recordFailure(serviceName, instanceKey, error.message);
    }
  }

  /**
   * 🌐 Build health check URL
   */
  buildHealthCheckUrl(instance) {
    const { protocol, host, port, healthCheckPath } = instance;
    return `${protocol}://${host}:${port}${healthCheckPath}`;
  }

  /**
   * 📡 Perform health check request
   */
  async performHealthCheckRequest(url) {
    const startTime = performance.now();
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.healthCheckTimeout);

    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mosa-Forge-Service-Discovery/1.0'
        }
      });

      clearTimeout(timeout);

      const responseTime = performance.now() - startTime;

      return {
        status: response.status,
        healthy: response.ok,
        responseTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * 📊 Update health status
   */
  updateHealthStatus(serviceName, instanceKey, health) {
    if (!this.healthStatus.has(serviceName)) {
      this.healthStatus.set(serviceName, new Map());
    }

    this.healthStatus.get(serviceName).set(instanceKey, {
      status: health.healthy ? 'healthy' : 'unhealthy',
      lastCheck: health.timestamp,
      responseTime: health.responseTime,
      details: health
    });
  }

  /**
   * 📉 Record failure
   */
  recordFailure(serviceName, instanceKey, reason) {
    const failureKey = `${serviceName}:${instanceKey}`;
    const now = Date.now();
    
    // Initialize failure tracking
    if (!this.failureCounts.has(failureKey)) {
      this.failureCounts.set(failureKey, {
        count: 0,
        firstFailure: now,
        lastFailure: now
      });
    }

    const failureInfo = this.failureCounts.get(failureKey);
    failureInfo.count++;
    failureInfo.lastFailure = now;

    // Check if we should isolate this instance
    if (failureInfo.count >= this.options.failureThreshold) {
      const windowStart = now - this.options.failureWindow;
      
      if (failureInfo.firstFailure >= windowStart) {
        // Too many failures in the time window, isolate the instance
        this.isolateInstance(
          instanceKey, 
          `health_check_failures:${failureInfo.count}`,
          this.options.isolationDuration
        );

        this.logger.error('Service instance isolated due to health check failures', {
          service: serviceName,
          instance: instanceKey,
          failureCount: failureInfo.count,
          isolationDuration: this.options.isolationDuration
        });

        // Reset failure count after isolation
        this.failureCounts.delete(failureKey);
      }
    }
  }

  /**
   * 📈 Reset failure count
   */
  resetFailureCount(serviceName, instanceKey) {
    const failureKey = `${serviceName}:${instanceKey}`;
    this.failureCounts.delete(failureKey);
  }

  /**
   * 🔄 Start service refresh
   */
  startServiceRefresh() {
    this.refreshInterval = setInterval(() => {
      this.refreshServices();
    }, this.options.refreshInterval);
  }

  /**
   * 🔄 Refresh services
   */
  async refreshServices() {
    try {
      await this.loadExistingServices();
      
      this.logger.debug('Services refreshed', {
        services: Array.from(this.services.keys()),
        totalInstances: Array.from(this.serviceInstances.keys()).length
      });

    } catch (error) {
      this.logger.error('Service refresh failed', { error: error.message });
    }
  }

  /**
   * 📈 Start metrics collection
   */
  startMetricsCollection() {
    if (!this.options.enableMetrics) return;

    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute
  }

  /**
   * 📊 Collect metrics
   */
  async collectMetrics() {
    try {
      const stats = this.getStatistics();

      // Record basic metrics
      this.metrics.recordGauge('service_discovery.registrations.total', stats.totalRegistrations);
      this.metrics.recordGauge('service_discovery.registrations.active', stats.activeRegistrations);
      this.metrics.recordGauge('service_discovery.health_checks.total', stats.healthChecks);
      this.metrics.recordGauge('service_discovery.health_checks.failed', stats.failedHealthChecks);
      this.metrics.recordGauge('service_discovery.discoveries.total', stats.serviceDiscoveries);

      // Record service metrics
      this.metrics.recordGauge('service_discovery.services.total', this.services.size);
      this.metrics.recordGauge('service_discovery.instances.total', this.serviceInstances.size);
      this.metrics.recordGauge('service_discovery.isolated_instances', this.isolatedServices.size);

      // Record cache metrics
      this.metrics.recordGauge('service_discovery.cache.hits', stats.cacheHits);
      this.metrics.recordGauge('service_discovery.cache.misses', stats.cacheMisses);
      this.metrics.recordGauge('service_discovery.cache.hit_rate', 
        stats.serviceDiscoveries > 0 ? (stats.cacheHits / stats.serviceDiscoveries) * 100 : 0
      );

      this.emit('metricsCollected', {
        stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Metrics collection failed', { error: error.message });
    }
  }

  /**
   * 🧹 Start cleanup tasks
   */
  startCleanupTasks() {
    // Clean expired instances every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredInstances();
    }, 60000);

    // Clean failure counts every 5 minutes
    this.failureCleanupInterval = setInterval(() => {
      this.cleanupFailureCounts();
    }, 300000);
  }

  /**
   * 🧹 Cleanup expired instances
   */
  async cleanupExpiredInstances() {
    try {
      const instanceKeys = await this.redis.keys('service:*:instance:*');
      let cleaned = 0;

      for (const key of instanceKeys) {
        const ttl = await this.redis.ttl(key);
        
        if (ttl < 0) {
          // Key has expired, remove it
          await this.unregisterService(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.info('Expired instances cleaned up', { cleaned });
      }

    } catch (error) {
      this.logger.error('Failed to cleanup expired instances', { error: error.message });
    }
  }

  /**
   * 🧹 Cleanup failure counts
   */
  cleanupFailureCounts() {
    const now = Date.now();
    const windowStart = now - this.options.failureWindow;
    let cleaned = 0;

    for (const [key, failureInfo] of this.failureCounts.entries()) {
      if (failureInfo.lastFailure < windowStart) {
        this.failureCounts.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug('Failure counts cleaned up', { cleaned });
    }
  }

  /**
   * 📊 Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      timestamp: new Date().toISOString(),
      services: this.services.size,
      instances: this.serviceInstances.size,
      isolated: this.isolatedServices.size,
      loadBalancers: this.loadBalancers.size
    };
  }

  /**
   * 🧹 Graceful shutdown
   */
  async shutdown() {
    this.shuttingDown = true;
    
    try {
      // Clear intervals
      if (this.healthInterval) clearInterval(this.healthInterval);
      if (this.refreshInterval) clearInterval(this.refreshInterval);
      if (this.metricsInterval) clearInterval(this.metricsInterval);
      if (this.cleanupInterval) clearInterval(this.cleanupInterval);
      if (this.failureCleanupInterval) clearInterval(this.failureCleanupInterval);

      // Close Redis connection
      if (this.redis.isOpen) {
        await this.redis.quit();
      }

      this.logger.info('Service Discovery shut down gracefully');

      this.emit('shutdownCompleted', {
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Service Discovery shutdown failed', { error: error.message });
      throw error;
    }
  }
}

// 🏢 Enterprise-grade error handling
class DiscoveryError extends Error {
  constructor(code, context = {}) {
    super(code);
    this.name = 'DiscoveryError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Set appropriate HTTP status codes
    const statusCodes = {
      'SERVICE_DISCOVERY_NOT_INITIALIZED': 503,
      'INVALID_SERVICE_INFO': 400,
      'NO_INSTANCES_AVAILABLE': 503,
      'SERVICE_ISOLATED': 503,
      'DEFAULT': 500
    };
    
    this.statusCode = statusCodes[code] || statusCodes.DEFAULT;
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp
    };
  }
}

// ⚖️ Load Balancer Implementation
class LoadBalancer {
  constructor(options = {}) {
    this.type = options.type || 'round_robin';
    this.stickySessions = options.stickySessions || false;
    this.sessionDuration = options.sessionDuration || 3600000;
    
    this.currentIndex = new Map();
    this.connectionCounts = new Map();
    this.sessionMapping = new Map();
  }

  selectInstance(instances, options = {}) {
    switch (this.type) {
      case 'round_robin':
        return this.roundRobin(instances, options.serviceName);
      case 'least_conn':
        return this.leastConnections(instances);
      case 'ip_hash':
        return this.ipHash(instances, options.clientIp);
      case 'sticky_session':
        return this.stickySession(instances, options.sessionId);
      default:
        return this.roundRobin(instances, options.serviceName);
    }
  }

  roundRobin(instances, serviceName) {
    const currentIndex = this.currentIndex.get(serviceName) || 0;
    const nextIndex = (currentIndex + 1) % instances.length;
    
    this.currentIndex.set(serviceName, nextIndex);
    return instances[currentIndex];
  }

  leastConnections(instances) {
    return instances.reduce((minInstance, instance) => {
      const minConnections = this.connectionCounts.get(minInstance.instanceId) || 0;
      const currentConnections = this.connectionCounts.get(instance.instanceId) || 0;
      
      return currentConnections < minConnections ? instance : minInstance;
    });
  }

  ipHash(instances, clientIp) {
    if (!clientIp) {
      return this.roundRobin(instances, 'default');
    }

    const hash = this.stringHash(clientIp);
    const index = hash % instances.length;
    return instances[index];
  }

  stickySession(instances, sessionId) {
    if (!sessionId) {
      return this.roundRobin(instances, 'default');
    }

    // Check if we have a mapping for this session
    const mapping = this.sessionMapping.get(sessionId);
    
    if (mapping && Date.now() < mapping.expires) {
      const instance = instances.find(inst => inst.instanceId === mapping.instanceId);
      if (instance) {
        return instance;
      }
    }

    // Create new mapping
    const instance = this.roundRobin(instances, 'sticky');
    this.sessionMapping.set(sessionId, {
      instanceId: instance.instanceId,
      expires: Date.now() + this.sessionDuration
    });

    return instance;
  }

  stringHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  getStats() {
    return {
      type: this.type,
      stickySessions: this.stickySessions,
      currentIndex: Object.fromEntries(this.currentIndex),
      connectionCounts: Object.fromEntries(this.connectionCounts),
      activeSessions: this.sessionMapping.size
    };
  }
}

module.exports = {
  ServiceDiscovery,
  DiscoveryError,
  LoadBalancer
};