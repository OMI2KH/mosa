/**
 * 🎯 MOSA FORGE: Enterprise Prisma Client
 * 
 * @module PrismaClient
 * @description Enterprise-grade database client with connection pooling, monitoring, and resilience
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Connection pooling with health checks
 * - Query performance monitoring
 * - Automatic retry with exponential backoff
 * - Real-time metrics and observability
 * - Production-ready error handling
 */

const { PrismaClient } = require('@prisma/client');
const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');

// 🏗️ Enterprise Constants
const DATABASE_ERRORS = {
  CONNECTION_TIMEOUT: 'DATABASE_CONNECTION_TIMEOUT',
  QUERY_TIMEOUT: 'DATABASE_QUERY_TIMEOUT',
  CONNECTION_LIMIT: 'DATABASE_CONNECTION_LIMIT',
  DEADLOCK_DETECTED: 'DATABASE_DEADLOCK',
  VALIDATION_ERROR: 'DATABASE_VALIDATION_ERROR'
};

const QUERY_TYPES = {
  READ: 'READ',
  WRITE: 'WRITE',
  TRANSACTION: 'TRANSACTION',
  RAW: 'RAW'
};

/**
 * 🏗️ Enterprise Prisma Client Class
 * @class MosaPrismaClient
 * @extends PrismaClient
 */
class MosaPrismaClient extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 🏗️ Enterprise Configuration
    this.config = {
      // Database Configuration
      datasources: {
        db: {
          url: process.env.DATABASE_URL || options.databaseUrl
        }
      },
      
      // Connection Pool Configuration
      connectionPool: {
        max: options.maxConnections || 20,
        min: options.minConnections || 5,
        acquireTimeout: options.acquireTimeout || 60000,
        timeout: options.timeout || 10000
      },
      
      // Performance Configuration
      performance: {
        slowQueryThreshold: options.slowQueryThreshold || 5000, // 5 seconds
        maxRetries: options.maxRetries || 3,
        retryDelay: options.retryDelay || 1000
      },
      
      // Monitoring Configuration
      monitoring: {
        enabled: options.monitoringEnabled !== false,
        metricsInterval: options.metricsInterval || 30000,
        healthCheckInterval: options.healthCheckInterval || 30000
      },
      
      // Redis for caching and metrics
      redis: options.redis || {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      }
    };

    // 🏗️ Initialize Prisma Client with Enterprise Config
    this.prisma = new PrismaClient({
      datasources: this.config.datasources,
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'query', emit: 'event' }
      ],
      errorFormat: 'minimal'
    });

    // 🏗️ Service Dependencies
    this.redis = new Redis(this.config.redis);
    
    // 🏗️ Performance Monitoring
    this.metrics = {
      queries: {
        total: 0,
        read: 0,
        write: 0,
        transaction: 0,
        failed: 0
      },
      performance: {
        averageQueryTime: 0,
        slowQueries: 0,
        connectionPool: {
          active: 0,
          idle: 0,
          total: 0
        }
      },
      errors: {
        connection: 0,
        timeout: 0,
        validation: 0,
        deadlock: 0
      }
    };

    // 🏗️ Circuit Breaker State
    this.circuitState = 'CLOSED';
    this.failureCount = 0;
    this.circuitThreshold = 5;
    this.lastFailureTime = null;

    this._initializeEventHandlers();
    this._startHealthMonitoring();
    this._startMetricsCollection();

    // 🏗️ Warm up connection pool
    this._warmupConnectionPool();
  }

  /**
   * 🏗️ Initialize Enterprise Event Handlers
   * @private
   */
  _initializeEventHandlers() {
    // Query Performance Monitoring
    this.prisma.$on('query', (e) => {
      this._handleQueryEvent(e);
    });

    // Error Event Handling
    this.prisma.$on('error', (e) => {
      this._handleErrorEvent(e);
    });

    // Info Event Handling
    this.prisma.$on('info', (e) => {
      this._handleInfoEvent(e);
    });

    // Custom Event Handlers
    this.on('query.slow', (data) => {
      this._logSlowQuery(data);
    });

    this.on('connection.healthy', () => {
      this._logEvent('DATABASE_CONNECTION_HEALTHY');
    });

    this.on('connection.unhealthy', (error) => {
      this._logEvent('DATABASE_CONNECTION_UNHEALTHY', { error: error.message });
    });
  }

  /**
   * 🏗️ Handle Query Events with Performance Monitoring
   * @private
   */
  _handleQueryEvent(event) {
    const queryStartTime = performance.now();
    const queryId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const queryData = {
      id: queryId,
      timestamp: new Date().toISOString(),
      query: event.query,
      params: event.params,
      duration: event.duration,
      target: event.target,
      type: this._determineQueryType(event.query)
    };

    // Update metrics
    this.metrics.queries.total++;
    this.metrics.queries[queryData.type.toLowerCase()]++;

    // Calculate performance metrics
    const queryTime = event.duration;
    this.metrics.performance.averageQueryTime = 
      (this.metrics.performance.averageQueryTime * (this.metrics.queries.total - 1) + queryTime) / 
      this.metrics.queries.total;

    // Check for slow queries
    if (queryTime > this.config.performance.slowQueryThreshold) {
      this.metrics.performance.slowQueries++;
      this.emit('query.slow', {
        ...queryData,
        threshold: this.config.performance.slowQueryThreshold
      });
    }

    // Log query for debugging in development
    if (process.env.NODE_ENV === 'development') {
      this._logQuery(queryData);
    }
  }

  /**
   * 🏗️ Determine Query Type for Metrics
   * @private
   */
  _determineQueryType(query) {
    const normalizedQuery = query.trim().toUpperCase();
    
    if (normalizedQuery.startsWith('SELECT')) return QUERY_TYPES.READ;
    if (normalizedQuery.startsWith('INSERT') || 
        normalizedQuery.startsWith('UPDATE') || 
        normalizedQuery.startsWith('DELETE')) return QUERY_TYPES.WRITE;
    if (normalizedQuery.startsWith('BEGIN') || 
        normalizedQuery.includes('COMMIT') || 
        normalizedQuery.includes('ROLLBACK')) return QUERY_TYPES.TRANSACTION;
    
    return QUERY_TYPES.RAW;
  }

  /**
   * 🏗️ Handle Error Events with Circuit Breaker
   * @private
   */
  _handleErrorEvent(error) {
    this.metrics.queries.failed++;
    
    const errorData = {
      timestamp: new Date().toISOString(),
      message: error.message,
      code: this._classifyDatabaseError(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };

    // Update error metrics
    this.metrics.errors[errorData.code]++;

    // Circuit breaker logic
    this._updateCircuitBreaker(error);

    this.emit('database.error', errorData);
    this._logError('DATABASE_ERROR', error);
  }

  /**
   * 🏗️ Classify Database Errors
   * @private
   */
  _classifyDatabaseError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    } else if (message.includes('connection') || message.includes('connect')) {
      return 'connection';
    } else if (message.includes('deadlock') || message.includes('lock')) {
      return 'deadlock';
    } else if (message.includes('validation') || message.includes('constraint')) {
      return 'validation';
    } else {
      return 'unknown';
    }
  }

  /**
   * 🏗️ Update Circuit Breaker State
   * @private
   */
  _updateCircuitBreaker(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.circuitThreshold && this.circuitState === 'CLOSED') {
      this.circuitState = 'OPEN';
      this.emit('circuit.opened', { 
        failureCount: this.failureCount,
        lastError: error.message 
      });
      
      // Schedule circuit reset
      setTimeout(() => {
        this.circuitState = 'HALF_OPEN';
        this.emit('circuit.half_open');
      }, 60000); // 1 minute
    }
  }

  /**
   * 🏗️ Reset Circuit Breaker on Success
   * @private
   */
  _resetCircuitBreaker() {
    if (this.circuitState === 'HALF_OPEN') {
      this.circuitState = 'CLOSED';
      this.failureCount = 0;
      this.emit('circuit.closed');
    }
  }

  /**
   * 🏗️ Handle Info Events
   * @private
   */
  _handleInfoEvent(event) {
    this.emit('database.info', {
      timestamp: new Date().toISOString(),
      message: event.message,
      target: event.target
    });
  }

  /**
   * 🏗️ Start Health Monitoring
   * @private
   */
  _startHealthMonitoring() {
    setInterval(async () => {
      await this._performHealthCheck();
    }, this.config.monitoring.healthCheckInterval);
  }

  /**
   * 🏗️ Perform Database Health Check
   * @private
   */
  async _performHealthCheck() {
    try {
      const startTime = performance.now();
      
      // Simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1 as health_check`;
      
      const responseTime = performance.now() - startTime;
      
      const healthStatus = {
        timestamp: new Date().toISOString(),
        status: 'healthy',
        responseTime,
        activeConnections: this.metrics.performance.connectionPool.active,
        circuitState: this.circuitState
      };

      this.emit('health.check', healthStatus);
      this.emit('connection.healthy');

      // Store health status in Redis for monitoring
      await this.redis.set(
        'database:health:status',
        JSON.stringify(healthStatus),
        'EX',
        60
      );

      // Reset circuit breaker on successful health check
      if (this.circuitState === 'HALF_OPEN') {
        this._resetCircuitBreaker();
      }

    } catch (error) {
      const healthStatus = {
        timestamp: new Date().toISOString(),
        status: 'unhealthy',
        error: error.message,
        circuitState: this.circuitState
      };

      this.emit('health.check', healthStatus);
      this.emit('connection.unhealthy', error);

      await this.redis.set(
        'database:health:status',
        JSON.stringify(healthStatus),
        'EX',
        60
      );
    }
  }

  /**
   * 🏗️ Start Metrics Collection
   * @private
   */
  _startMetricsCollection() {
    setInterval(() => {
      this._collectAndEmitMetrics();
    }, this.config.monitoring.metricsInterval);
  }

  /**
   * 🏗️ Collect and Emit Performance Metrics
   * @private
   */
  async _collectAndEmitMetrics() {
    const metrics = {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      circuitState: this.circuitState,
      uptime: process.uptime()
    };

    // Emit metrics event
    this.emit('metrics.updated', metrics);

    // Store metrics in Redis for dashboards
    if (this.config.monitoring.enabled) {
      await this.redis.set(
        'database:metrics:current',
        JSON.stringify(metrics),
        'EX',
        120
      );

      // Store historical metrics (keep last 24 hours)
      await this.redis.lpush(
        'database:metrics:history',
        JSON.stringify(metrics)
      );
      
      await this.redis.ltrim('database:metrics:history', 0, 2880); // 24 hours of 30-second intervals
    }
  }

  /**
   * 🏗️ Warm Up Connection Pool
   * @private
   */
  async _warmupConnectionPool() {
    try {
      // Execute a few simple queries to warm up connections
      await Promise.all([
        this.prisma.$queryRaw`SELECT 1`,
        this.prisma.$queryRaw`SELECT version()`,
        this.prisma.user.count() // Simple count query
      ]);

      this.emit('pool.warmed');
      this._logEvent('CONNECTION_POOL_WARMED');
    } catch (error) {
      this._logError('POOL_WARMUP_FAILED', error);
    }
  }

  /**
   * 🎯 ENTERPRISE QUERY METHOD: Execute with Retry Logic
   * @param {Function} queryFn - Prisma query function
   * @param {Object} options - Query options
   * @returns {Promise<*>} Query result
   */
  async executeQuery(queryFn, options = {}) {
    if (this.circuitState === 'OPEN') {
      throw new Error('Circuit breaker is OPEN - database unavailable');
    }

    const startTime = performance.now();
    const queryId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const maxRetries = options.maxRetries || this.config.performance.maxRetries;
    
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await queryFn();
        
        const duration = performance.now() - startTime;
        
        // Record successful query
        this._recordSuccessfulQuery(queryId, duration, attempt);
        
        // Reset circuit breaker on success
        if (this.circuitState === 'HALF_OPEN') {
          this._resetCircuitBreaker();
        }

        return result;

      } catch (error) {
        lastError = error;
        
        this._recordFailedQuery(queryId, error, attempt);
        
        // Check if we should retry
        if (attempt === maxRetries || !this._shouldRetry(error)) {
          break;
        }

        // Exponential backoff
        const delay = this.config.performance.retryDelay * Math.pow(2, attempt - 1);
        await this._sleep(delay);
      }
    }

    throw this._formatEnterpriseError(lastError, queryId);
  }

  /**
   * 🏗️ Determine if Query Should Be Retried
   * @private
   */
  _shouldRetry(error) {
    const retryableErrors = [
      'connection',
      'timeout',
      'deadlock'
    ];

    const errorType = this._classifyDatabaseError(error);
    return retryableErrors.includes(errorType);
  }

  /**
   * 🏗️ Record Successful Query
   * @private
   */
  _recordSuccessfulQuery(queryId, duration, attempt) {
    this.emit('query.success', {
      queryId,
      duration,
      attempt,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 🏗️ Record Failed Query
   * @private
   */
  _recordFailedQuery(queryId, error, attempt) {
    this.emit('query.failed', {
      queryId,
      error: error.message,
      attempt,
      errorType: this._classifyDatabaseError(error),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 🏗️ Sleep Utility Function
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🏗️ Format Enterprise Error
   * @private
   */
  _formatEnterpriseError(error, queryId) {
    const enterpriseError = new Error(error.message);
    enterpriseError.queryId = queryId;
    enterpriseError.timestamp = new Date().toISOString();
    enterpriseError.originalError = error;
    enterpriseError.code = DATABASE_ERRORS[this._classifyDatabaseError(error).toUpperCase()] || 'DATABASE_ERROR';
    
    return enterpriseError;
  }

  /**
   * 🏗️ Enterprise Logging - Query
   * @private
   */
  _logQuery(queryData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'prisma-client',
      type: 'QUERY',
      data: queryData,
      environment: process.env.NODE_ENV
    };

    console.log(JSON.stringify(logEntry));
  }

  /**
   * 🏗️ Enterprise Logging - Slow Query
   * @private
   */
  _logSlowQuery(slowQueryData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'prisma-client',
      type: 'SLOW_QUERY',
      severity: 'WARN',
      data: slowQueryData,
      environment: process.env.NODE_ENV
    };

    console.warn(JSON.stringify(logEntry));

    // Send to monitoring in production
    if (process.env.NODE_ENV === 'production') {
      this.redis.publish('slow-queries', JSON.stringify(logEntry));
    }
  }

  /**
   * 🏗️ Enterprise Logging - Event
   * @private
   */
  _logEvent(eventType, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'prisma-client',
      event: eventType,
      data,
      environment: process.env.NODE_ENV
    };

    console.log(JSON.stringify(logEntry));
  }

  /**
   * 🏗️ Enterprise Logging - Error
   * @private
   */
  _logError(operation, error, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'prisma-client',
      type: 'ERROR',
      operation,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context,
      severity: 'ERROR',
      environment: process.env.NODE_ENV
    };

    console.error(JSON.stringify(logEntry));

    if (process.env.NODE_ENV === 'production') {
      this.redis.publish('database-errors', JSON.stringify(logEntry));
    }
  }

  /**
   * 🏗️ Get Current Metrics
   * @returns {Object} Current performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      circuitState: this.circuitState,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  /**
   * 🏗️ Get Health Status
   * @returns {Promise<Object>} Current health status
   */
  async getHealthStatus() {
    try {
      const cachedHealth = await this.redis.get('database:health:status');
      if (cachedHealth) {
        return JSON.parse(cachedHealth);
      }

      await this._performHealthCheck();
      const updatedHealth = await this.redis.get('database:health:status');
      return JSON.parse(updatedHealth);
    } catch (error) {
      return {
        timestamp: new Date().toISOString(),
        status: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * 🏗️ Graceful Shutdown
   */
  async shutdown() {
    try {
      this.emit('shutdown.started');
      
      // Close Redis connection
      await this.redis.quit();
      
      // Close Prisma connection
      await this.prisma.$disconnect();
      
      this.emit('shutdown.completed');
    } catch (error) {
      this.emit('shutdown.failed', { error: error.message });
      throw error;
    }
  }

  /**
   * 🏗️ Proxy Prisma Methods with Enterprise Features
   */
  get user() {
    return new Proxy(this.prisma.user, {
      get: (target, property) => {
        return (...args) => this.executeQuery(() => target[property](...args));
      }
    });
  }

  get expert() {
    return new Proxy(this.prisma.expert, {
      get: (target, property) => {
        return (...args) => this.executeQuery(() => target[property](...args));
      }
    });
  }

  get enrollment() {
    return new Proxy(this.prisma.enrollment, {
      get: (target, property) => {
        return (...args) => this.executeQuery(() => target[property](...args));
      }
    });
  }

  get payment() {
    return new Proxy(this.prisma.payment, {
      get: (target, property) => {
        return (...args) => this.executeQuery(() => target[property](...args));
      }
    });
  }

  get skill() {
    return new Proxy(this.prisma.skill, {
      get: (target, property) => {
        return (...args) => this.executeQuery(() => target[property](...args));
      }
    });
  }

  // 🏗️ Raw query with enterprise features
  $queryRaw(strings, ...values) {
    return this.executeQuery(() => this.prisma.$queryRaw(strings, ...values));
  }

  $executeRaw(strings, ...values) {
    return this.executeQuery(() => this.prisma.$executeRaw(strings, ...values));
  }

  $transaction(queries, options) {
    return this.executeQuery(() => this.prisma.$transaction(queries, options));
  }
}

// 🏗️ Singleton Instance for Microservice Architecture
let prismaInstance = null;

/**
 * 🎯 Get Enterprise Prisma Client Instance
 * @param {Object} options - Configuration options
 * @returns {MosaPrismaClient} Enterprise Prisma client instance
 */
const getPrismaClient = (options = {}) => {
  if (!prismaInstance) {
    prismaInstance = new MosaPrismaClient(options);
  }
  return prismaInstance;
};

// 🏗️ Enterprise Export Pattern
module.exports = {
  MosaPrismaClient,
  getPrismaClient,
  DATABASE_ERRORS,
  QUERY_TYPES
};

// 🏗️ Default export for convenience
module.exports.default = getPrismaClient;