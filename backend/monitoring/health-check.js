/**
 * 🎯 MOSA FORGE: Enterprise Health Monitoring Service
 * 
 * @module HealthCheck
 * @description Comprehensive health monitoring for all microservices
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Multi-service health aggregation
 * - Circuit breaker status monitoring
 * - Performance metrics collection
 * - Alerting and notification system
 * - Dependency health tracking
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

// 🏗️ Enterprise Health Constants
const HEALTH_STATES = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  UNKNOWN: 'unknown'
};

const SERVICE_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high', 
  MEDIUM: 'medium',
  LOW: 'low'
};

const ALERT_SEVERITY = {
  CRITICAL: 'CRITICAL',
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO'
};

/**
 * 🏗️ Enterprise Health Check Class
 * @class HealthCheck
 * @extends EventEmitter
 */
class HealthCheck extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 🏗️ Enterprise Configuration
    this.config = {
      checkInterval: options.checkInterval || 30000, // 30 seconds
      timeout: options.timeout || 10000, // 10 seconds per service
      redis: options.redis || {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      },
      prisma: options.prisma || new PrismaClient(),
      services: options.services || this._getDefaultServicesConfig(),
      alertWebhook: options.alertWebhook || process.env.ALERT_WEBHOOK_URL
    };

    // 🏗️ Service Dependencies
    this.redis = new Redis(this.config.redis);
    this.prisma = this.config.prisma;
    this.httpClient = axios.create({
      timeout: this.config.timeout,
      validateStatus: () => true // Accept all status codes for health checks
    });

    // 🏗️ Health State Management
    this.healthState = {
      overall: HEALTH_STATES.UNKNOWN,
      services: {},
      dependencies: {},
      lastCheck: null,
      consecutiveFailures: 0
    };

    // 🏗️ Performance Metrics
    this.metrics = {
      totalChecks: 0,
      failedChecks: 0,
      averageResponseTime: 0,
      alertsTriggered: 0,
      recoveryEvents: 0
    };

    // 🏗️ Alert Management
    this.activeAlerts = new Map();
    this.alertCooldown = new Map();

    this._initializeEventHandlers();
    this._startHealthMonitoring();
  }

  /**
   * 🏗️ Get Default Services Configuration
   * @private
   */
  _getDefaultServicesConfig() {
    return {
      'api-gateway': {
        url: process.env.API_GATEWAY_URL || 'http://localhost:3001/health',
        level: SERVICE_LEVELS.CRITICAL,
        timeout: 5000
      },
      'auth-service': {
        url: process.env.AUTH_SERVICE_URL || 'http://localhost:3002/health',
        level: SERVICE_LEVELS.CRITICAL,
        timeout: 5000
      },
      'payment-service': {
        url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3003/health',
        level: SERVICE_LEVELS.CRITICAL,
        timeout: 8000
      },
      'expert-service': {
        url: process.env.EXPERT_SERVICE_URL || 'http://localhost:3004/health',
        level: SERVICE_LEVELS.HIGH,
        timeout: 5000
      },
      'student-service': {
        url: process.env.STUDENT_SERVICE_URL || 'http://localhost:3005/health',
        level: SERVICE_LEVELS.HIGH,
        timeout: 5000
      },
      'quality-service': {
        url: process.env.QUALITY_SERVICE_URL || 'http://localhost:3006/health',
        level: SERVICE_LEVELS.HIGH,
        timeout: 5000
      },
      'learning-service': {
        url: process.env.LEARNING_SERVICE_URL || 'http://localhost:3007/health',
        level: SERVICE_LEVELS.HIGH,
        timeout: 5000
      },
      'training-service': {
        url: process.env.TRAINING_SERVICE_URL || 'http://localhost:3008/health',
        level: SERVICE_LEVELS.MEDIUM,
        timeout: 5000
      },
      'certification-service': {
        url: process.env.CERTIFICATION_SERVICE_URL || 'http://localhost:3009/health',
        level: SERVICE_LEVELS.MEDIUM,
        timeout: 5000
      },
      'analytics-service': {
        url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3010/health',
        level: SERVICE_LEVELS.LOW,
        timeout: 5000
      }
    };
  }

  /**
   * 🏗️ Initialize Enterprise Event Handlers
   * @private
   */
  _initializeEventHandlers() {
    this.on('health.check.started', (data) => {
      this._logEvent('HEALTH_CHECK_STARTED', data);
    });

    this.on('health.check.completed', (data) => {
      this._logEvent('HEALTH_CHECK_COMPLETED', data);
      this.metrics.totalChecks++;
    });

    this.on('service.health.changed', (data) => {
      this._logEvent('SERVICE_HEALTH_CHANGED', data);
      this._handleServiceHealthChange(data);
    });

    this.on('alert.triggered', (data) => {
      this._logEvent('ALERT_TRIGGERED', data);
      this.metrics.alertsTriggered++;
      this._sendAlertNotification(data);
    });

    this.on('alert.resolved', (data) => {
      this._logEvent('ALERT_RESOLVED', data);
      this.metrics.recoveryEvents++;
      this._sendRecoveryNotification(data);
    });

    this.on('dependency.health.changed', (data) => {
      this._logEvent('DEPENDENCY_HEALTH_CHANGED', data);
    });
  }

  /**
   * 🏗️ Start Health Monitoring Loop
   * @private
   */
  _startHealthMonitoring() {
    // Initial health check
    this._performHealthCheck();

    // Periodic health checks
    this.healthInterval = setInterval(() => {
      this._performHealthCheck();
    }, this.config.checkInterval);

    // Dependency health checks (more frequent)
    this.dependencyInterval = setInterval(() => {
      this._checkDependencies();
    }, 15000); // Every 15 seconds

    // Alert cleanup (remove resolved alerts after 24 hours)
    this.cleanupInterval = setInterval(() => {
      this._cleanupResolvedAlerts();
    }, 3600000); // Every hour
  }

  /**
   * 🏗️ Perform Comprehensive Health Check
   * @private
   */
  async _performHealthCheck() {
    const checkId = uuidv4();
    const startTime = Date.now();

    this.emit('health.check.started', { checkId, timestamp: new Date().toISOString() });

    try {
      // 🏗️ Check all microservices in parallel with timeout
      const serviceChecks = Object.entries(this.config.services).map(
        ([serviceName, config]) => this._checkServiceHealth(serviceName, config)
      );

      const results = await Promise.allSettled(serviceChecks);
      
      // 🏗️ Process results and update health state
      const serviceHealth = {};
      let unhealthyCriticalServices = 0;

      results.forEach((result, index) => {
        const serviceName = Object.keys(this.config.services)[index];
        if (result.status === 'fulfilled') {
          serviceHealth[serviceName] = result.value;
          if (result.value.health === HEALTH_STATES.UNHEALTHY && 
              this.config.services[serviceName].level === SERVICE_LEVELS.CRITICAL) {
            unhealthyCriticalServices++;
          }
        } else {
          serviceHealth[serviceName] = {
            health: HEALTH_STATES.UNHEALTHY,
            error: result.reason.message,
            responseTime: null,
            timestamp: new Date().toISOString()
          };
          if (this.config.services[serviceName].level === SERVICE_LEVELS.CRITICAL) {
            unhealthyCriticalServices++;
          }
        }
      });

      // 🏗️ Update overall health state
      this.healthState.services = serviceHealth;
      this.healthState.lastCheck = new Date().toISOString();

      // 🏗️ Determine overall system health
      if (unhealthyCriticalServices > 0) {
        this.healthState.overall = HEALTH_STATES.UNHEALTHY;
        this.healthState.consecutiveFailures++;
      } else if (Object.values(serviceHealth).some(s => s.health === HEALTH_STATES.DEGRADED)) {
        this.healthState.overall = HEALTH_STATES.DEGRADED;
        this.healthState.consecutiveFailures = 0;
      } else {
        this.healthState.overall = HEALTH_STATES.HEALTHY;
        this.healthState.consecutiveFailures = 0;
      }

      const processingTime = Date.now() - startTime;

      // 🏗️ Store health state in Redis for other services
      await this._storeHealthState();

      this.emit('health.check.completed', {
        checkId,
        overallHealth: this.healthState.overall,
        processingTime,
        servicesChecked: Object.keys(serviceHealth).length,
        timestamp: new Date().toISOString()
      });

      this._logSuccess('HEALTH_CHECK_COMPLETED', {
        checkId,
        overallHealth: this.healthState.overall,
        processingTime
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      this.healthState.overall = HEALTH_STATES.UNHEALTHY;
      this.healthState.consecutiveFailures++;

      this.emit('health.check.failed', {
        checkId,
        error: error.message,
        processingTime,
        timestamp: new Date().toISOString()
      });

      this._logError('HEALTH_CHECK_FAILED', error, { checkId });
    }
  }

  /**
   * 🏗️ Check Individual Service Health
   * @private
   */
  async _checkServiceHealth(serviceName, config) {
    const startTime = Date.now();
    const checkId = uuidv4();

    try {
      const response = await this.httpClient.get(config.url, {
        timeout: config.timeout,
        headers: {
          'User-Agent': 'MosaForge-HealthCheck/1.0.0',
          'X-Health-Check-ID': checkId
        }
      });

      const responseTime = Date.now() - startTime;

      let healthState = HEALTH_STATES.UNHEALTHY;
      
      if (response.status === 200) {
        const healthData = response.data;
        
        if (healthData.status === 'healthy') {
          healthState = HEALTH_STATES.HEALTHY;
        } else if (healthData.status === 'degraded') {
          healthState = HEALTH_STATES.DEGRADED;
        } else {
          healthState = HEALTH_STATES.UNHEALTHY;
        }
      } else if (response.status === 503) {
        healthState = HEALTH_STATES.DEGRADED;
      } else {
        healthState = HEALTH_STATES.UNHEALTHY;
      }

      const previousHealth = this.healthState.services[serviceName]?.health;
      
      const result = {
        health: healthState,
        responseTime,
        statusCode: response.status,
        timestamp: new Date().toISOString(),
        data: response.data || {}
      };

      // 🏗️ Emit event if health state changed
      if (previousHealth && previousHealth !== healthState) {
        this.emit('service.health.changed', {
          service: serviceName,
          previous: previousHealth,
          current: healthState,
          level: config.level,
          responseTime,
          timestamp: new Date().toISOString()
        });
      }

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const previousHealth = this.healthState.services[serviceName]?.health;

      const result = {
        health: HEALTH_STATES.UNHEALTHY,
        responseTime,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      // 🏗️ Emit event if health state changed
      if (previousHealth && previousHealth !== HEALTH_STATES.UNHEALTHY) {
        this.emit('service.health.changed', {
          service: serviceName,
          previous: previousHealth,
          current: HEALTH_STATES.UNHEALTHY,
          level: config.level,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }

      return result;
    }
  }

  /**
   * 🏗️ Check System Dependencies
   * @private
   */
  async _checkDependencies() {
    const dependencies = {};

    try {
      // 🏗️ Check Redis
      const redisStart = Date.now();
      await this.redis.ping();
      dependencies.redis = {
        health: HEALTH_STATES.HEALTHY,
        responseTime: Date.now() - redisStart,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      dependencies.redis = {
        health: HEALTH_STATES.UNHEALTHY,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }

    try {
      // 🏗️ Check Database
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dependencies.database = {
        health: HEALTH_STATES.HEALTHY,
        responseTime: Date.now() - dbStart,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      dependencies.database = {
        health: HEALTH_STATES.UNHEALTHY,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }

    try {
      // 🏗️ Check External Payment Gateways
      const paymentGateways = await this._checkPaymentGateways();
      dependencies.paymentGateways = paymentGateways;
    } catch (error) {
      dependencies.paymentGateways = {
        health: HEALTH_STATES.UNHEALTHY,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }

    // 🏗️ Update dependencies state
    const previousDependencies = this.healthState.dependencies;
    this.healthState.dependencies = dependencies;

    // 🏗️ Emit events for dependency health changes
    Object.entries(dependencies).forEach(([depName, depHealth]) => {
      const previousHealth = previousDependencies?.[depName]?.health;
      if (previousHealth && previousHealth !== depHealth.health) {
        this.emit('dependency.health.changed', {
          dependency: depName,
          previous: previousHealth,
          current: depHealth.health,
          timestamp: new Date().toISOString()
        });
      }
    });

    await this._storeHealthState();
  }

  /**
   * 🏗️ Check Payment Gateways Health
   * @private
   */
  async _checkPaymentGateways() {
    const gateways = {};

    try {
      // Check Telebirr gateway (simulated - would be actual API call in production)
      const telebirrStart = Date.now();
      // Simulate API call - in production this would be actual Telebirr health check
      await new Promise(resolve => setTimeout(resolve, 100));
      gateways.telebirr = {
        health: HEALTH_STATES.HEALTHY,
        responseTime: Date.now() - telebirrStart,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      gateways.telebirr = {
        health: HEALTH_STATES.UNHEALTHY,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }

    try {
      // Check CBE Birr gateway (simulated)
      const cbeStart = Date.now();
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 150));
      gateways.cbeBirr = {
        health: HEALTH_STATES.HEALTHY,
        responseTime: Date.now() - cbeStart,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      gateways.cbeBirr = {
        health: HEALTH_STATES.UNHEALTHY,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }

    return gateways;
  }

  /**
   * 🏗️ Handle Service Health Change
   * @private
   */
  _handleServiceHealthChange(data) {
    const { service, previous, current, level } = data;

    // 🏗️ Trigger alerts for critical services going unhealthy
    if (current === HEALTH_STATES.UNHEALTHY && level === SERVICE_LEVELS.CRITICAL) {
      this._triggerAlert({
        service,
        severity: ALERT_SEVERITY.CRITICAL,
        message: `Critical service ${service} is unhealthy`,
        data: data
      });
    } else if (current === HEALTH_STATES.DEGRADED && level === SERVICE_LEVELS.CRITICAL) {
      this._triggerAlert({
        service,
        severity: ALERT_SEVERITY.WARNING,
        message: `Critical service ${service} is degraded`,
        data: data
      });
    } else if (previous === HEALTH_STATES.UNHEALTHY && current === HEALTH_STATES.HEALTHY) {
      this._resolveAlert(service, `Service ${service} recovered`);
    }
  }

  /**
   * 🏗️ Trigger Alert
   * @private
   */
  _triggerAlert(alertData) {
    const alertKey = `${alertData.service}-${alertData.severity}`;
    
    // 🏗️ Check cooldown to prevent alert spam
    const lastAlert = this.alertCooldown.get(alertKey);
    if (lastAlert && Date.now() - lastAlert < 300000) { // 5 minute cooldown
      return;
    }

    const alert = {
      id: uuidv4(),
      ...alertData,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };

    this.activeAlerts.set(alert.id, alert);
    this.alertCooldown.set(alertKey, Date.now());

    this.emit('alert.triggered', alert);
  }

  /**
   * 🏗️ Resolve Alert
   * @private
   */
  _resolveAlert(service, message) {
    const alertsToResolve = [];
    
    this.activeAlerts.forEach((alert, id) => {
      if (alert.service === service && !alert.acknowledged) {
        alertsToResolve.push(id);
      }
    });

    alertsToResolve.forEach(alertId => {
      const alert = this.activeAlerts.get(alertId);
      if (alert) {
        alert.resolvedAt = new Date().toISOString();
        alert.resolutionMessage = message;
        
        this.emit('alert.resolved', alert);
        
        // Keep resolved alerts for 24 hours for reporting
        setTimeout(() => {
          this.activeAlerts.delete(alertId);
        }, 24 * 60 * 60 * 1000);
      }
    });
  }

  /**
   * 🏗️ Send Alert Notification
   * @private
   */
  async _sendAlertNotification(alert) {
    if (!this.config.alertWebhook) {
      return;
    }

    try {
      const notification = {
        platform: 'mosa-forge',
        environment: process.env.NODE_ENV || 'development',
        type: 'ALERT',
        severity: alert.severity,
        title: `Health Alert: ${alert.service}`,
        message: alert.message,
        data: alert.data,
        timestamp: alert.timestamp,
        alertId: alert.id
      };

      await this.httpClient.post(this.config.alertWebhook, notification, {
        timeout: 5000
      });

      this._logSuccess('ALERT_NOTIFICATION_SENT', { alertId: alert.id });

    } catch (error) {
      this._logError('ALERT_NOTIFICATION_FAILED', error, { alertId: alert.id });
    }
  }

  /**
   * 🏗️ Send Recovery Notification
   * @private
   */
  async _sendRecoveryNotification(alert) {
    if (!this.config.alertWebhook) {
      return;
    }

    try {
      const notification = {
        platform: 'mosa-forge',
        environment: process.env.NODE_ENV || 'development',
        type: 'RECOVERY',
        severity: 'INFO',
        title: `Service Recovered: ${alert.service}`,
        message: alert.resolutionMessage,
        timestamp: alert.resolvedAt,
        alertId: alert.id
      };

      await this.httpClient.post(this.config.alertWebhook, notification, {
        timeout: 5000
      });

      this._logSuccess('RECOVERY_NOTIFICATION_SENT', { alertId: alert.id });

    } catch (error) {
      this._logError('RECOVERY_NOTIFICATION_FAILED', error, { alertId: alert.id });
    }
  }

  /**
   * 🏗️ Store Health State in Redis
   * @private
   */
  async _storeHealthState() {
    try {
      const healthData = {
        ...this.healthState,
        metrics: this.metrics,
        activeAlerts: Array.from(this.activeAlerts.values()).filter(a => !a.resolvedAt),
        timestamp: new Date().toISOString()
      };

      await this.redis.setex(
        'health:overall',
        60, // Expire in 60 seconds
        JSON.stringify(healthData)
      );

      // Store individual service health for quick access
      for (const [service, health] of Object.entries(this.healthState.services)) {
        await this.redis.setex(
          `health:service:${service}`,
          60,
          JSON.stringify(health)
        );
      }

    } catch (error) {
      this._logError('HEALTH_STATE_STORE_FAILED', error);
    }
  }

  /**
   * 🏗️ Cleanup Resolved Alerts
   * @private
   */
  _cleanupResolvedAlerts() {
    const now = Date.now();
    this.activeAlerts.forEach((alert, id) => {
      if (alert.resolvedAt && (now - new Date(alert.resolvedAt).getTime() > 24 * 60 * 60 * 1000)) {
        this.activeAlerts.delete(id);
      }
    });
  }

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Get Comprehensive Health Status
   * @returns {Object} Complete health status
   */
  async getHealthStatus() {
    return {
      overall: this.healthState.overall,
      services: this.healthState.services,
      dependencies: this.healthState.dependencies,
      metrics: this.metrics,
      activeAlerts: Array.from(this.activeAlerts.values()).filter(a => !a.resolvedAt),
      lastCheck: this.healthState.lastCheck,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🎯 Get Service Health
   * @param {string} serviceName - Service to check
   * @returns {Object} Service health status
   */
  async getServiceHealth(serviceName) {
    if (!this.config.services[serviceName]) {
      throw new Error(`Service ${serviceName} not configured for health checks`);
    }

    return this.healthState.services[serviceName] || {
      health: HEALTH_STATES.UNKNOWN,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🎯 Force Immediate Health Check
   * @returns {Promise} Health check completion
   */
  async forceHealthCheck() {
    return this._performHealthCheck();
  }

  /**
   * 🎯 Acknowledge Alert
   * @param {string} alertId - Alert to acknowledge
   */
  async acknowledgeAlert(alertId) {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      this.activeAlerts.set(alertId, alert);
      
      this.emit('alert.acknowledged', alert);
    }
  }

  /**
   * 🎯 Get Health Metrics
   * @returns {Object} Health monitoring metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      overallHealth: this.healthState.overall,
      consecutiveFailures: this.healthState.consecutiveFailures,
      activeAlertsCount: Array.from(this.activeAlerts.values()).filter(a => !a.resolvedAt).length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🏗️ Enterprise Logging
   * @private
   */
  _logEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'health-check',
      event: eventType,
      data,
      environment: process.env.NODE_ENV || 'development'
    };

    console.log(JSON.stringify(logEntry));

    // In production, send to centralized logging
    if (process.env.NODE_ENV === 'production') {
      this.redis.publish('monitoring-logs', JSON.stringify(logEntry));
    }
  }

  /**
   * 🏗️ Success Logging
   * @private
   */
  _logSuccess(operation, data) {
    this._logEvent('SUCCESS', {
      operation,
      ...data,
      severity: 'INFO'
    });
  }

  /**
   * 🏗️ Error Logging
   * @private
   */
  _logError(operation, error, context = {}) {
    this._logEvent('ERROR', {
      operation,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context,
      severity: 'ERROR'
    });
  }

  /**
   * 🏗️ Graceful Shutdown
   */
  async shutdown() {
    try {
      this.emit('health.monitoring.shutdown.started');
      
      // Clear intervals
      if (this.healthInterval) clearInterval(this.healthInterval);
      if (this.dependencyInterval) clearInterval(this.dependencyInterval);
      if (this.cleanupInterval) clearInterval(this.cleanupInterval);
      
      // Close connections
      await this.redis.quit();
      await this.prisma.$disconnect();
      
      this.emit('health.monitoring.shutdown.completed');
    } catch (error) {
      this.emit('health.monitoring.shutdown.failed', { error: error.message });
      throw error;
    }
  }
}

// 🏗️ Enterprise Export Pattern
module.exports = {
  HealthCheck,
  HEALTH_STATES,
  SERVICE_LEVELS,
  ALERT_SEVERITY
};

// 🏗️ Singleton Instance for Microservice Architecture
let healthCheckInstance = null;

module.exports.getInstance = (options = {}) => {
  if (!healthCheckInstance) {
    healthCheckInstance = new HealthCheck(options);
  }
  return healthCheckInstance;
};

// 🏗️ Health Check Endpoint for Express.js
module.exports.healthCheckMiddleware = (healthCheckInstance) => {
  return async (req, res) => {
    try {
      const healthStatus = await healthCheckInstance.getHealthStatus();
      
      // Determine HTTP status code based on overall health
      let statusCode = 200;
      if (healthStatus.overall === HEALTH_STATES.UNHEALTHY) {
        statusCode = 503;
      } else if (healthStatus.overall === HEALTH_STATES.DEGRADED) {
        statusCode = 206; // Partial content
      }

      res.status(statusCode).json({
        status: healthStatus.overall,
        timestamp: healthStatus.timestamp,
        services: healthStatus.services,
        dependencies: healthStatus.dependencies,
        metrics: healthStatus.metrics,
        activeAlerts: healthStatus.activeAlerts.length
      });
    } catch (error) {
      res.status(503).json({
        status: HEALTH_STATES.UNHEALTHY,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };
};