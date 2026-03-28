/**
 * 🎯 MOSA FORGE: Enterprise System Health Monitoring
 * 
 * @module SystemHealthMonitor
 * @description Comprehensive real-time system health monitoring and alerting
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time microservices health monitoring
 * - Automated alerting and incident management
 * - Performance metrics and SLA tracking
 * - Capacity planning and resource utilization
 * - Multi-level dashboard with drill-down capabilities
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const os = require('os');
const { performance, PerformanceObserver } = require('perf_hooks');

// 🏗️ Enterprise Health Constants
const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance'
};

const ALERT_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

const SERVICE_CATEGORIES = {
  CORE: 'core',
  PAYMENT: 'payment',
  LEARNING: 'learning',
  QUALITY: 'quality',
  INFRASTRUCTURE: 'infrastructure',
  EXTERNAL: 'external'
};

/**
 * 🏗️ Enterprise System Health Monitor Class
 * @class SystemHealthMonitor
 * @extends EventEmitter
 */
class SystemHealthMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 🏗️ Enterprise Configuration
    this.config = {
      redis: options.redis || {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      },
      prisma: options.prisma || new PrismaClient(),
      checkInterval: options.checkInterval || 30000, // 30 seconds
      alertThresholds: options.alertThresholds || {
        responseTime: 5000, // 5 seconds
        errorRate: 0.05, // 5%
        cpuUsage: 0.8, // 80%
        memoryUsage: 0.85, // 85%
        diskUsage: 0.9 // 90%
      },
      services: options.services || this._getDefaultServicesConfig()
    };

    // 🏗️ Service Dependencies
    this.redis = new Redis(this.config.redis);
    this.prisma = this.config.prisma;
    this.httpClient = axios.create({
      timeout: 10000,
      validateStatus: () => true // Check all status codes
    });

    // 🏗️ Health State Management
    this.healthState = {
      overall: HEALTH_STATUS.HEALTHY,
      lastUpdated: new Date(),
      incidents: [],
      metrics: this._initializeMetrics(),
      dependencies: {}
    };

    // 🏗️ Alert Management
    this.activeAlerts = new Map();
    this.alertHistory = [];
    this.silencedAlerts = new Set();

    // 🏗️ Performance Monitoring
    this.performanceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        this._recordPerformanceMetric(entry);
      });
    });
    this.performanceObserver.observe({ entryTypes: ['measure'] });

    this._initializeHealthChecks();
    this._startMonitoring();
    this._initializeDashboard();
  }

  /**
   * 🏗️ Get Default Services Configuration
   * @private
   */
  _getDefaultServicesConfig() {
    return {
      'api-gateway': {
        name: 'API Gateway',
        category: SERVICE_CATEGORIES.CORE,
        healthEndpoint: '/health',
        critical: true,
        timeout: 5000
      },
      'auth-service': {
        name: 'Authentication Service',
        category: SERVICE_CATEGORIES.CORE,
        healthEndpoint: '/health',
        critical: true,
        timeout: 3000
      },
      'payment-service': {
        name: 'Payment Service',
        category: SERVICE_CATEGORIES.PAYMENT,
        healthEndpoint: '/health',
        critical: true,
        timeout: 5000
      },
      'expert-service': {
        name: 'Expert Service',
        category: SERVICE_CATEGORIES.CORE,
        healthEndpoint: '/health',
        critical: true,
        timeout: 3000
      },
      'student-service': {
        name: 'Student Service',
        category: SERVICE_CATEGORIES.CORE,
        healthEndpoint: '/health',
        critical: true,
        timeout: 3000
      },
      'quality-service': {
        name: 'Quality Service',
        category: SERVICE_CATEGORIES.QUALITY,
        healthEndpoint: '/health',
        critical: true,
        timeout: 3000
      },
      'learning-service': {
        name: 'Learning Service',
        category: SERVICE_CATEGORIES.LEARNING,
        healthEndpoint: '/health',
        critical: true,
        timeout: 3000
      },
      'training-service': {
        name: 'Training Service',
        category: SERVICE_CATEGORIES.LEARNING,
        healthEndpoint: '/health',
        critical: true,
        timeout: 3000
      },
      'certification-service': {
        name: 'Certification Service',
        category: SERVICE_CATEGORIES.CORE,
        healthEndpoint: '/health',
        critical: true,
        timeout: 3000
      },
      'analytics-service': {
        name: 'Analytics Service',
        category: SERVICE_CATEGORIES.CORE,
        healthEndpoint: '/health',
        critical: false,
        timeout: 5000
      },
      'postgresql': {
        name: 'PostgreSQL Database',
        category: SERVICE_CATEGORIES.INFRASTRUCTURE,
        critical: true,
        customCheck: this._checkDatabaseHealth.bind(this)
      },
      'redis': {
        name: 'Redis Cache',
        category: SERVICE_CATEGORIES.INFRASTRUCTURE,
        critical: true,
        customCheck: this._checkRedisHealth.bind(this)
      },
      'telebirr-api': {
        name: 'Telebirr Payment Gateway',
        category: SERVICE_CATEGORIES.EXTERNAL,
        healthEndpoint: process.env.TELEBIRR_HEALTH_ENDPOINT,
        critical: true,
        timeout: 10000
      },
      'cbe-birr-api': {
        name: 'CBE Birr Payment Gateway',
        category: SERVICE_CATEGORIES.EXTERNAL,
        healthEndpoint: process.env.CBE_BIRR_HEALTH_ENDPOINT,
        critical: true,
        timeout: 10000
      },
      'fayda-api': {
        name: 'Fayda ID Verification',
        category: SERVICE_CATEGORIES.EXTERNAL,
        healthEndpoint: process.env.FAYDA_HEALTH_ENDPOINT,
        critical: true,
        timeout: 10000
      }
    };
  }

  /**
   * 🏗️ Initialize Health Metrics
   * @private
   */
  _initializeMetrics() {
    return {
      system: {
        uptime: 0,
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        loadAverage: [0, 0, 0]
      },
      services: {
        total: Object.keys(this.config.services).length,
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        offline: 0
      },
      performance: {
        responseTime: {
          p50: 0,
          p95: 0,
          p99: 0
        },
        throughput: {
          requestsPerMinute: 0,
          errorRate: 0,
          successRate: 1
        },
        business: {
          activeStudents: 0,
          activeExperts: 0,
          enrollmentsToday: 0,
          revenueToday: 0,
          completionRate: 0
        }
      },
      capacity: {
        databaseConnections: 0,
        redisMemoryUsage: 0,
        queueLength: 0,
        storageAvailable: 0
      }
    };
  }

  /**
   * 🏗️ Initialize Health Checks
   * @private
   */
  _initializeHealthChecks() {
    // Register performance marks
    performance.mark('health-monitor-start');
    
    // Initialize service health states
    Object.keys(this.config.services).forEach(serviceId => {
      this.healthState.dependencies[serviceId] = {
        status: HEALTH_STATUS.HEALTHY,
        lastCheck: new Date(),
        responseTime: 0,
        error: null,
        metrics: {}
      };
    });
  }

  /**
   * 🏗️ Start Monitoring Loop
   * @private
   */
  _startMonitoring() {
    // Immediate first check
    this._performHealthChecks();
    
    // Periodic checks
    this.monitoringInterval = setInterval(() => {
      this._performHealthChecks();
    }, this.config.checkInterval);

    // Business metrics collection
    this.businessMetricsInterval = setInterval(() => {
      this._collectBusinessMetrics();
    }, 60000); // Every minute

    // System metrics collection
    this.systemMetricsInterval = setInterval(() => {
      this._collectSystemMetrics();
    }, 10000); // Every 10 seconds

    // Cleanup old alerts
    this.cleanupInterval = setInterval(() => {
      this._cleanupOldAlerts();
    }, 300000); // Every 5 minutes
  }

  /**
   * 🏗️ Initialize Dashboard
   * @private
   */
  _initializeDashboard() {
    this.dashboard = {
      lastRefresh: new Date(),
      widgets: {
        systemOverview: this._createSystemOverviewWidget(),
        serviceHealth: this._createServiceHealthWidget(),
        performanceMetrics: this._createPerformanceWidget(),
        businessMetrics: this._createBusinessMetricsWidget(),
        activeIncidents: this._createIncidentsWidget(),
        capacityPlanning: this._createCapacityWidget()
      }
    };
  }

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Get Comprehensive System Health
   * @param {Object} options - Health check options
   * @returns {Promise<Object>} Complete system health status
   */
  async getSystemHealth(options = {}) {
    const startTime = performance.now();
    const traceId = uuidv4();

    try {
      this.emit('health.check.requested', { traceId, options });

      // 🏗️ Perform real-time health checks if requested
      if (options.forceRefresh) {
        await this._performHealthChecks();
      }

      // 🏗️ Compile comprehensive health report
      const healthReport = {
        status: this.healthState.overall,
        timestamp: new Date().toISOString(),
        traceId,
        summary: await this._getHealthSummary(),
        services: await this._getServicesHealth(),
        infrastructure: await this._getInfrastructureHealth(),
        performance: await this._getPerformanceMetrics(),
        business: await this._getBusinessHealth(),
        alerts: await this._getActiveAlerts(),
        incidents: await this._getRecentIncidents(),
        recommendations: await this._getHealthRecommendations(),
        sla: await this._getSLACompliance()
      };

      const processingTime = performance.now() - startTime;
      
      this._logHealthCheck('SYSTEM_HEALTH_REPORT_GENERATED', {
        traceId,
        processingTime,
        overallStatus: healthReport.status
      });

      return healthReport;

    } catch (error) {
      this._logHealthError('SYSTEM_HEALTH_CHECK_FAILED', error, { traceId });
      throw this._formatHealthError(error);
    }
  }

  /**
   * 🏗️ Perform Comprehensive Health Checks
   * @private
   */
  async _performHealthChecks() {
    const checkPromises = [];
    const checkStartTime = Date.now();

    // 🏗️ Check all services in parallel with timeouts
    Object.entries(this.config.services).forEach(([serviceId, serviceConfig]) => {
      const checkPromise = this._checkServiceHealth(serviceId, serviceConfig)
        .then(health => ({ serviceId, health }))
        .catch(error => ({ serviceId, health: { status: HEALTH_STATUS.UNHEALTHY, error: error.message } }));

      checkPromises.push(checkPromise);
    });

    try {
      const results = await Promise.allSettled(checkPromises);
      
      // 🏗️ Process health check results
      let healthyServices = 0;
      let criticalServicesHealthy = true;

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          const { serviceId, health } = result.value;
          this.healthState.dependencies[serviceId] = {
            ...health,
            lastCheck: new Date()
          };

          if (health.status === HEALTH_STATUS.HEALTHY) {
            healthyServices++;
          }

          if (this.config.services[serviceId].critical && health.status !== HEALTH_STATUS.HEALTHY) {
            criticalServicesHealthy = false;
          }
        }
      });

      // 🏗️ Update overall health state
      const serviceHealthPercentage = healthyServices / Object.keys(this.config.services).length;
      
      if (!criticalServicesHealthy) {
        this.healthState.overall = HEALTH_STATUS.UNHEALTHY;
      } else if (serviceHealthPercentage < 0.8) {
        this.healthState.overall = HEALTH_STATUS.DEGRADED;
      } else {
        this.healthState.overall = HEALTH_STATUS.HEALTHY;
      }

      this.healthState.lastUpdated = new Date();
      this.healthState.metrics.services.healthy = healthyServices;
      this.healthState.metrics.services.unhealthy = Object.keys(this.config.services).length - healthyServices;

      this.emit('health.checks.completed', {
        timestamp: new Date(),
        duration: Date.now() - checkStartTime,
        overallStatus: this.healthState.overall,
        healthyServices,
        totalServices: Object.keys(this.config.services).length
      });

    } catch (error) {
      this.healthState.overall = HEALTH_STATUS.UNHEALTHY;
      this._logHealthError('HEALTH_CHECKS_FAILED', error);
    }
  }

  /**
   * 🏗️ Check Individual Service Health
   * @private
   */
  async _checkServiceHealth(serviceId, serviceConfig) {
    const startTime = Date.now();

    try {
      let healthData;

      if (serviceConfig.customCheck) {
        // 🏗️ Custom health check function
        healthData = await serviceConfig.customCheck();
      } else if (serviceConfig.healthEndpoint) {
        // 🏗️ HTTP health endpoint check
        healthData = await this._checkHttpService(serviceConfig);
      } else {
        // 🏗️ Default health check
        healthData = { status: HEALTH_STATUS.HEALTHY };
      }

      const responseTime = Date.now() - startTime;
      
      // 🏗️ Check against thresholds
      if (responseTime > serviceConfig.timeout) {
        healthData.status = HEALTH_STATUS.DEGRADED;
        this._createAlert(
          `HIGH_RESPONSE_TIME_${serviceId}`,
          ALERT_SEVERITY.MEDIUM,
          `Service ${serviceConfig.name} responding slowly: ${responseTime}ms`,
          { serviceId, responseTime, threshold: serviceConfig.timeout }
        );
      }

      healthData.responseTime = responseTime;
      healthData.lastCheck = new Date();

      return healthData;

    } catch (error) {
      this._createAlert(
        `SERVICE_UNHEALTHY_${serviceId}`,
        serviceConfig.critical ? ALERT_SEVERITY.CRITICAL : ALERT_SEVERITY.HIGH,
        `Service ${serviceConfig.name} is unhealthy: ${error.message}`,
        { serviceId, error: error.message }
      );

      return {
        status: HEALTH_STATUS.UNHEALTHY,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * 🏗️ Check HTTP Service Health
   * @private
   */
  async _checkHttpService(serviceConfig) {
    const response = await this.httpClient.get(serviceConfig.healthEndpoint, {
      timeout: serviceConfig.timeout
    });

    if (response.status >= 200 && response.status < 300) {
      return response.data;
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * 🏗️ Check Database Health
   * @private
   */
  async _checkDatabaseHealth() {
    const startTime = Date.now();

    try {
      // 🏗️ Check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      
      // 🏗️ Check connection pool
      const poolStatus = await this.prisma.$queryRaw`
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `;

      // 🏗️ Check database size and performance
      const dbSize = await this.prisma.$queryRaw`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `;

      const responseTime = Date.now() - startTime;

      return {
        status: HEALTH_STATUS.HEALTHY,
        metrics: {
          activeConnections: parseInt(poolStatus[0].active_connections),
          databaseSize: dbSize[0].size,
          responseTime
        }
      };

    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }

  /**
   * 🏗️ Check Redis Health
   * @private
   */
  async _checkRedisHealth() {
    try {
      // 🏗️ Check connectivity
      await this.redis.ping();

      // 🏗️ Get Redis info
      const info = await this.redis.info();
      const memoryInfo = await this.redis.info('memory');

      // 🏗️ Parse memory usage
      const usedMemory = memoryInfo.match(/used_memory:(\d+)/)?.[1];
      const maxMemory = memoryInfo.match(/maxmemory:(\d+)/)?.[1];
      const memoryUsage = maxMemory ? usedMemory / maxMemory : 0;

      return {
        status: HEALTH_STATUS.HEALTHY,
        metrics: {
          usedMemory: parseInt(usedMemory),
          maxMemory: parseInt(maxMemory),
          memoryUsage,
          connectedClients: parseInt(info.match(/connected_clients:(\d+)/)?.[1] || 0)
        }
      };

    } catch (error) {
      throw new Error(`Redis health check failed: ${error.message}`);
    }
  }

  /**
   * 🏗️ Collect Business Metrics
   * @private
   */
  async _collectBusinessMetrics() {
    try {
      const [
        activeStudents,
        activeExperts,
        enrollmentsToday,
        revenueToday,
        completionStats
      ] = await Promise.all([
        this.prisma.student.count({ where: { status: 'ACTIVE' } }),
        this.prisma.expert.count({ where: { status: 'ACTIVE' } }),
        this.prisma.enrollment.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        this.prisma.payment.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          },
          _sum: { amount: true }
        }),
        this.prisma.enrollment.aggregate({
          where: { status: 'COMPLETED' },
          _count: { id: true }
        })
      ]);

      const totalEnrollments = await this.prisma.enrollment.count();
      const completionRate = totalEnrollments > 0 ? completionStats._count.id / totalEnrollments : 0;

      this.healthState.metrics.business = {
        activeStudents,
        activeExperts,
        enrollmentsToday,
        revenueToday: revenueToday._sum.amount || 0,
        completionRate
      };

    } catch (error) {
      this._logHealthError('BUSINESS_METRICS_COLLECTION_FAILED', error);
    }
  }

  /**
   * 🏗️ Collect System Metrics
   * @private
   */
  async _collectSystemMetrics() {
    try {
      // 🏗️ CPU Usage
      const cpuUsage = await this._getCpuUsage();
      
      // 🏗️ Memory Usage
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memoryUsage = (totalMem - freeMem) / totalMem;

      // 🏗️ Disk Usage (simplified - in production use proper disk monitoring)
      const diskUsage = await this._getDiskUsage();

      this.healthState.metrics.system = {
        uptime: os.uptime(),
        cpuUsage,
        memoryUsage,
        diskUsage,
        loadAverage: os.loadavg()
      };

      // 🏗️ Check thresholds and create alerts
      this._checkSystemThresholds();

    } catch (error) {
      this._logHealthError('SYSTEM_METRICS_COLLECTION_FAILED', error);
    }
  }

  /**
   * 🏗️ Get CPU Usage
   * @private
   */
  async _getCpuUsage() {
    return new Promise((resolve) => {
      const startMeasure = this._cpuUsage();
      setTimeout(() => {
        const endMeasure = this._cpuUsage();
        const idleDiff = endMeasure.idle - startMeasure.idle;
        const totalDiff = endMeasure.total - startMeasure.total;
        resolve(1 - idleDiff / totalDiff);
      }, 1000);
    });
  }

  /**
   * 🏗️ CPU Usage Helper
   * @private
   */
  _cpuUsage() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        total += cpu.times[type];
      }
      idle += cpu.times.idle;
    });

    return { idle, total };
  }

  /**
   * 🏗️ Get Disk Usage
   * @private
   */
  async _getDiskUsage() {
    // Simplified - in production, use proper disk monitoring
    try {
      const fs = require('fs');
      const stats = fs.statSync('/');
      const total = stats.blocks * stats.blksize;
      const free = stats.bfree * stats.blksize;
      return (total - free) / total;
    } catch {
      return 0.5; // Default fallback
    }
  }

  /**
   * 🏗️ Check System Thresholds
   * @private
   */
  _checkSystemThresholds() {
    const { system } = this.healthState.metrics;
    const { alertThresholds } = this.config;

    if (system.cpuUsage > alertThresholds.cpuUsage) {
      this._createAlert(
        'HIGH_CPU_USAGE',
        ALERT_SEVERITY.HIGH,
        `CPU usage is high: ${(system.cpuUsage * 100).toFixed(1)}%`,
        { metric: 'cpuUsage', value: system.cpuUsage, threshold: alertThresholds.cpuUsage }
      );
    }

    if (system.memoryUsage > alertThresholds.memoryUsage) {
      this._createAlert(
        'HIGH_MEMORY_USAGE',
        ALERT_SEVERITY.HIGH,
        `Memory usage is high: ${(system.memoryUsage * 100).toFixed(1)}%`,
        { metric: 'memoryUsage', value: system.memoryUsage, threshold: alertThresholds.memoryUsage }
      );
    }

    if (system.diskUsage > alertThresholds.diskUsage) {
      this._createAlert(
        'HIGH_DISK_USAGE',
        ALERT_SEVERITY.CRITICAL,
        `Disk usage is critical: ${(system.diskUsage * 100).toFixed(1)}%`,
        { metric: 'diskUsage', value: system.diskUsage, threshold: alertThresholds.diskUsage }
      );
    }
  }

  /**
   * 🏗️ Create Alert
   * @private
   */
  _createAlert(alertId, severity, message, details = {}) {
    if (this.silencedAlerts.has(alertId)) {
      return;
    }

    const alert = {
      id: alertId,
      severity,
      message,
      details,
      timestamp: new Date(),
      acknowledged: false,
      service: details.serviceId || 'system'
    };

    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);

    // 🏗️ Keep only last 1000 alerts in history
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-1000);
    }

    this.emit('alert.created', alert);

    // 🏗️ Send critical alerts immediately
    if (severity === ALERT_SEVERITY.CRITICAL) {
      this._sendCriticalAlert(alert);
    }

    this._logHealthCheck('ALERT_CREATED', alert);
  }

  /**
   * 🏗️ Send Critical Alert
   * @private
   */
  _sendCriticalAlert(alert) {
    // 🏗️ In production, integrate with PagerDuty, Slack, etc.
    console.error('🚨 CRITICAL ALERT:', alert.message, alert.details);
    
    // Example integration:
    // this.slackClient.sendAlert(alert);
    // this.pagerDutyClient.triggerIncident(alert);
  }

  /**
   * 🏗️ Get Health Summary
   * @private
   */
  async _getHealthSummary() {
    const { services, business, system } = this.healthState.metrics;

    return {
      overallStatus: this.healthState.overall,
      uptime: system.uptime,
      serviceHealth: {
        total: services.total,
        healthy: services.healthy,
        unhealthy: services.unhealthy,
        healthPercentage: (services.healthy / services.total) * 100
      },
      businessHealth: {
        activeUsers: business.activeStudents + business.activeExperts,
        dailyEnrollments: business.enrollmentsToday,
        dailyRevenue: business.revenueToday,
        completionRate: business.completionRate
      },
      systemHealth: {
        cpuUsage: system.cpuUsage * 100,
        memoryUsage: system.memoryUsage * 100,
        diskUsage: system.diskUsage * 100
      }
    };
  }

  /**
   * 🏗️ Get Services Health
   * @private
   */
  async _getServicesHealth() {
    const servicesHealth = {};

    Object.entries(this.healthState.dependencies).forEach(([serviceId, health]) => {
      const serviceConfig = this.config.services[serviceId];
      
      servicesHealth[serviceId] = {
        name: serviceConfig.name,
        category: serviceConfig.category,
        status: health.status,
        critical: serviceConfig.critical,
        responseTime: health.responseTime,
        lastCheck: health.lastCheck,
        metrics: health.metrics,
        error: health.error
      };
    });

    return servicesHealth;
  }

  /**
   * 🏗️ Get Infrastructure Health
   * @private
   */
  async _getInfrastructureHealth() {
    return {
      database: await this._getDatabaseHealth(),
      cache: await this._getCacheHealth(),
      network: await this._getNetworkHealth(),
      storage: await this._getStorageHealth()
    };
  }

  /**
   * 🏗️ Get Database Health
   * @private
   */
  async _getDatabaseHealth() {
    try {
      const [connections, performance, size] = await Promise.all([
        this.prisma.$queryRaw`SELECT count(*) as connections FROM pg_stat_activity WHERE state = 'active'`,
        this.prisma.$queryRaw`SELECT xact_commit, xact_rollback FROM pg_stat_database WHERE datname = current_database()`,
        this.prisma.$queryRaw`SELECT pg_size_pretty(pg_database_size(current_database())) as size`
      ]);

      return {
        status: HEALTH_STATUS.HEALTHY,
        connections: parseInt(connections[0].connections),
        commitRate: parseInt(performance[0].xact_commit),
        rollbackRate: parseInt(performance[0].xact_rollback),
        size: size[0].size
      };
    } catch (error) {
      return {
        status: HEALTH_STATUS.UNHEALTHY,
        error: error.message
      };
    }
  }

  /**
   * 🏗️ Get Cache Health
   * @private
   */
  async _getCacheHealth() {
    try {
      const info = await this.redis.info();
      const memory = await this.redis.info('memory');

      return {
        status: HEALTH_STATUS.HEALTHY,
        usedMemory: parseInt(memory.match(/used_memory:(\d+)/)?.[1] || 0),
        connectedClients: parseInt(info.match(/connected_clients:(\d+)/)?.[1] || 0),
        hitRate: parseFloat(info.match(/keyspace_hit_rate:([\d.]+)/)?.[1] || 0)
      };
    } catch (error) {
      return {
        status: HEALTH_STATUS.UNHEALTHY,
        error: error.message
      };
    }
  }

  /**
   * 🏗️ Get Network Health
   * @private
   */
  async _getNetworkHealth() {
    // Simplified network health check
    return {
      status: HEALTH_STATUS.HEALTHY,
      latency: await this._checkNetworkLatency(),
      throughput: await this._checkNetworkThroughput()
    };
  }

  /**
   * 🏗️ Get Storage Health
   * @private
   */
  async _getStorageHealth() {
    return {
      status: HEALTH_STATUS.HEALTHY,
      usage: this.healthState.metrics.system.diskUsage * 100,
      available: (1 - this.healthState.metrics.system.diskUsage) * 100
    };
  }

  /**
   * 🏗️ Check Network Latency
   * @private
   */
  async _checkNetworkLatency() {
    // Simplified - in production, check multiple endpoints
    try {
      const start = Date.now();
      await this.httpClient.get('https://www.google.com', { timeout: 5000 });
      return Date.now() - start;
    } catch {
      return -1; // Unavailable
    }
  }

  /**
   * 🏗️ Check Network Throughput
   * @private
   */
  async _checkNetworkThroughput() {
    // Simplified - in production, use proper network monitoring
    return { upload: 0, download: 0 };
  }

  /**
   * 🏗️ Get Performance Metrics
   * @private
   */
  async _getPerformanceMetrics() {
    const serviceResponseTimes = Object.values(this.healthState.dependencies)
      .map(health => health.responseTime)
      .filter(time => time > 0);

    const sortedTimes = serviceResponseTimes.sort((a, b) => a - b);
    
    return {
      responseTime: {
        p50: this._getPercentile(sortedTimes, 50),
        p95: this._getPercentile(sortedTimes, 95),
        p99: this._getPercentile(sortedTimes, 99),
        average: sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length
      },
      throughput: {
        requestsPerMinute: await this._getRequestsPerMinute(),
        errorRate: await this._getErrorRate(),
        successRate: 1 - (await this._getErrorRate())
      }
    };
  }

  /**
   * 🏗️ Get Business Health
   * @private
   */
  async _getBusinessHealth() {
    return this.healthState.metrics.business;
  }

  /**
   * 🏗️ Get Active Alerts
   * @private
   */
  async _getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 🏗️ Get Recent Incidents
   * @private
   */
  async _getRecentIncidents() {
    return this.healthState.incidents.slice(-10); // Last 10 incidents
  }

  /**
   * 🏗️ Get Health Recommendations
   * @private
   */
  async _getHealthRecommendations() {
    const recommendations = [];

    // 🏗️ System resource recommendations
    if (this.healthState.metrics.system.memoryUsage > 0.8) {
      recommendations.push({
        severity: ALERT_SEVERITY.HIGH,
        category: 'infrastructure',
        message: 'Consider scaling up memory resources',
        action: 'Increase server RAM or optimize memory usage'
      });
    }

    if (this.healthState.metrics.system.diskUsage > 0.85) {
      recommendations.push({
        severity: ALERT_SEVERITY.CRITICAL,
        category: 'infrastructure',
        message: 'Disk space running low',
        action: 'Clean up logs and temporary files or increase storage'
      });
    }

    // 🏗️ Service performance recommendations
    const slowServices = Object.entries(this.healthState.dependencies)
      .filter(([_, health]) => health.responseTime > 5000)
      .map(([serviceId, _]) => serviceId);

    if (slowServices.length > 0) {
      recommendations.push({
        severity: ALERT_SEVERITY.MEDIUM,
        category: 'performance',
        message: `Slow services detected: ${slowServices.join(', ')}`,
        action: 'Optimize service performance or scale horizontally'
      });
    }

    return recommendations;
  }

  /**
   * 🏗️ Get SLA Compliance
   * @private
   */
  async _getSLACompliance() {
    const totalChecks = this.alertHistory.length;
    const criticalAlerts = this.alertHistory.filter(alert => 
      alert.severity === ALERT_SEVERITY.CRITICAL
    ).length;

    const slaCompliance = totalChecks > 0 ? 1 - (criticalAlerts / totalChecks) : 1;

    return {
      complianceRate: slaCompliance,
      uptime: this.healthState.metrics.system.uptime,
      criticalAlerts,
      totalChecks,
      slaStatus: slaCompliance >= 0.99 ? 'COMPLIANT' : 'NON_COMPLIANT'
    };
  }

  /**
   * 🏗️ Get Percentile
   * @private
   */
  _getPercentile(sortedArray, percentile) {
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    return sortedArray[lower] + (sortedArray[upper] - sortedArray[lower]) * (index - lower);
  }

  /**
   * 🏗️ Get Requests Per Minute
   * @private
   */
  async _getRequestsPerMinute() {
    // Simplified - in production, use proper metrics collection
    try {
      const count = await this.redis.get('requests:last_minute') || 0;
      return parseInt(count);
    } catch {
      return 0;
    }
  }

  /**
   * 🏗️ Get Error Rate
   * @private
   */
  async _getErrorRate() {
    // Simplified - in production, use proper error tracking
    const totalAlerts = this.alertHistory.length;
    const errorAlerts = this.alertHistory.filter(alert => 
      alert.severity !== ALERT_SEVERITY.INFO
    ).length;

    return totalAlerts > 0 ? errorAlerts / totalAlerts : 0;
  }

  /**
   * 🏗️ Dashboard Widget Creators
   * @private
   */
  _createSystemOverviewWidget() {
    return {
      type: 'system_overview',
      title: 'System Overview',
      data: {
        overallStatus: this.healthState.overall,
        uptime: this.healthState.metrics.system.uptime,
        services: this.healthState.metrics.services,
        lastUpdated: this.healthState.lastUpdated
      }
    };
  }

  _createServiceHealthWidget() {
    return {
      type: 'service_health',
      title: 'Service Health',
      data: Object.entries(this.healthState.dependencies).map(([id, health]) => ({
        id,
        name: this