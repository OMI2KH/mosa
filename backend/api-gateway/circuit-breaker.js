// api-gateway/circuit-breaker.js

/**
 * 🏢 MOSA FORGE - Enterprise Circuit Breaker Pattern
 * ⚡ Fault tolerance, resilience, and graceful degradation
 * 🔧 Powered by Chereka | Founded by Oumer Muktar
 * 
 * @module CircuitBreaker
 * @version Enterprise 1.0
 */

const { EventEmitter } = require('events');
const Redis = require('redis');
const { performance } = require('perf_hooks');
const { Logger } = require('../utils/logger');
const { MetricsCollector } = require('../utils/metrics-collector');

class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // Circuit breaker configuration
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 3,
      timeout: options.timeout || 10000, // 10 seconds
      resetTimeout: options.resetTimeout || 30000, // 30 seconds
      
      // Monitoring configuration
      windowSize: options.windowSize || 100, // Last 100 requests
      percentile: options.percentile || 95, // 95th percentile
      
      // Service-specific configurations
      serviceName: options.serviceName || 'unknown-service',
      environment: process.env.NODE_ENV || 'development',
      
      // Redis configuration
      redisUrl: options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      
      // Advanced features
      halfOpenEnabled: options.halfOpenEnabled !== false,
      fallbackEnabled: options.fallbackEnabled !== false,
      timeoutEnabled: options.timeoutEnabled !== false,
      
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
      service: `circuit-breaker-${this.options.serviceName}`,
      level: this.options.environment === 'production' ? 'warn' : 'info'
    });

    this.metrics = new MetricsCollector({
      service: this.options.serviceName,
      circuitBreaker: true
    });

    // Circuit state management
    this.state = {
      status: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failureCount: 0,
      successCount: 0,
      lastFailure: null,
      nextAttempt: null,
      lastStateChange: Date.now()
    };

    // Request tracking
    this.requestHistory = [];
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;

    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timedOutRequests: 0,
      shortCircuitedRequests: 0,
      fallbackSuccesses: 0,
      fallbackFailures: 0
    };

    // Service health tracking
    this.healthMetrics = {
      responseTimes: [],
      errorRates: [],
      throughput: [],
      lastHealthCheck: Date.now()
    };

    this.initialized = false;
    this.shuttingDown = false;

    this.initialize();
  }

  /**
   * 🏗️ Initialize circuit breaker
   */
  async initialize() {
    try {
      await this.redis.connect();
      await this.loadStateFromRedis();
      
      this.startHealthMonitoring();
      this.startMetricsCollection();
      this.startStatePersistence();
      
      this.initialized = true;
      
      this.logger.info('Circuit breaker initialized', {
        service: this.options.serviceName,
        state: this.state.status,
        config: this.getConfigSummary()
      });

      this.emit('initialized', {
        service: this.options.serviceName,
        timestamp: new Date().toISOString(),
        state: this.state.status
      });

    } catch (error) {
      this.logger.error('Circuit breaker initialization failed', {
        service: this.options.serviceName,
        error: error.message,
        stack: error.stack
      });
      
      // Continue without Redis for resilience
      this.initialized = true;
      this.emit('initializationFailed', {
        service: this.options.serviceName,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🔌 Execute request with circuit breaker protection
   */
  async execute(operation, fallback = null, context = {}) {
    if (!this.initialized) {
      throw new CircuitBreakerError('CIRCUIT_BREAKER_NOT_INITIALIZED', {
        service: this.options.serviceName
      });
    }

    if (this.shuttingDown) {
      throw new CircuitBreakerError('CIRCUIT_BREAKER_SHUTTING_DOWN', {
        service: this.options.serviceName
      });
    }

    const requestId = this.generateRequestId();
    const startTime = performance.now();
    
    this.stats.totalRequests++;

    // Track request in history
    this.trackRequest({
      id: requestId,
      timestamp: Date.now(),
      context
    });

    try {
      // Check circuit state before proceeding
      await this.checkCircuitState();

      if (this.state.status === 'OPEN') {
        this.stats.shortCircuitedRequests++;
        
        this.logger.warn('Circuit is OPEN, request short-circuited', {
          service: this.options.serviceName,
          requestId,
          state: this.state
        });

        this.emit('requestShortCircuited', {
          service: this.options.serviceName,
          requestId,
          timestamp: new Date().toISOString()
        });

        // Try fallback if available
        if (this.options.fallbackEnabled && fallback) {
          return await this.executeFallback(fallback, requestId, context);
        }

        throw new CircuitBreakerError('CIRCUIT_OPEN', {
          service: this.options.serviceName,
          requestId,
          nextAttempt: this.state.nextAttempt
        });
      }

      // Execute the actual operation with timeout protection
      const result = await this.executeWithTimeout(operation, requestId);
      const responseTime = performance.now() - startTime;

      // Record successful request
      await this.recordSuccess(responseTime, requestId);

      this.logger.debug('Request executed successfully', {
        service: this.options.serviceName,
        requestId,
        responseTime: responseTime.toFixed(2),
        state: this.state.status
      });

      this.emit('requestSuccess', {
        service: this.options.serviceName,
        requestId,
        responseTime,
        timestamp: new Date().toISOString()
      });

      return result;

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      // Record failed request
      await this.recordFailure(error, responseTime, requestId);

      this.logger.error('Request execution failed', {
        service: this.options.serviceName,
        requestId,
        error: error.message,
        responseTime: responseTime.toFixed(2),
        state: this.state.status
      });

      this.emit('requestFailure', {
        service: this.options.serviceName,
        requestId,
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString()
      });

      // Try fallback if available
      if (this.options.fallbackEnabled && fallback) {
        try {
          return await this.executeFallback(fallback, requestId, context);
        } catch (fallbackError) {
          this.stats.fallbackFailures++;
          throw new CircuitBreakerError('FALLBACK_FAILED', {
            service: this.options.serviceName,
            requestId,
            originalError: error.message,
            fallbackError: fallbackError.message
          });
        }
      }

      throw error;
    }
  }

  /**
   * ⏱️ Execute operation with timeout protection
   */
  async executeWithTimeout(operation, requestId) {
    if (!this.options.timeoutEnabled) {
      return await operation();
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new CircuitBreakerError('OPERATION_TIMEOUT', {
          service: this.options.serviceName,
          requestId,
          timeout: this.options.timeout
        }));
      }, this.options.timeout);

      operation()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * 🛡️ Execute fallback operation
   */
  async executeFallback(fallback, requestId, context) {
    const startTime = performance.now();
    
    try {
      const result = await fallback(context);
      const responseTime = performance.now() - startTime;

      this.stats.fallbackSuccesses++;
      
      this.logger.info('Fallback operation executed successfully', {
        service: this.options.serviceName,
        requestId,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('fallbackSuccess', {
        service: this.options.serviceName,
        requestId,
        responseTime,
        timestamp: new Date().toISOString()
      });

      return result;

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      this.logger.error('Fallback operation failed', {
        service: this.options.serviceName,
        requestId,
        error: error.message,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('fallbackFailure', {
        service: this.options.serviceName,
        requestId,
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * 🔍 Check and update circuit state
   */
  async checkCircuitState() {
    const now = Date.now();

    // Handle OPEN state timeout
    if (this.state.status === 'OPEN' && this.state.nextAttempt <= now) {
      if (this.options.halfOpenEnabled) {
        await this.transitionToState('HALF_OPEN');
        this.logger.info('Circuit transitioned to HALF_OPEN state', {
          service: this.options.serviceName,
          state: this.state
        });
      } else {
        await this.transitionToState('CLOSED');
        this.logger.info('Circuit transitioned to CLOSED state', {
          service: this.options.serviceName,
          state: this.state
        });
      }
    }

    // Handle HALF_OPEN state success threshold
    if (this.state.status === 'HALF_OPEN' && 
        this.state.successCount >= this.options.successThreshold) {
      await this.transitionToState('CLOSED');
      this.logger.info('Circuit transitioned to CLOSED state after successful probes', {
        service: this.options.serviceName,
        state: this.state
      });
    }
  }

  /**
   * 📈 Record successful request
   */
  async recordSuccess(responseTime, requestId) {
    this.stats.successfulRequests++;
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;

    // Update health metrics
    this.updateHealthMetrics(responseTime, true);

    // Handle state transitions based on success
    if (this.state.status === 'HALF_OPEN') {
      this.state.successCount++;
      
      if (this.state.successCount >= this.options.successThreshold) {
        await this.transitionToState('CLOSED');
      }
    } else if (this.state.status === 'CLOSED') {
      // Reset failure count on consecutive successes
      if (this.consecutiveSuccesses >= this.options.successThreshold) {
        this.state.failureCount = Math.max(0, this.state.failureCount - 1);
      }
    }

    await this.persistState();
  }

  /**
   * 📉 Record failed request
   */
  async recordFailure(error, responseTime, requestId) {
    const isTimeout = error.code === 'OPERATION_TIMEOUT';
    
    if (isTimeout) {
      this.stats.timedOutRequests++;
    } else {
      this.stats.failedRequests++;
    }

    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;

    // Update health metrics
    this.updateHealthMetrics(responseTime, false);

    // Update failure count
    this.state.failureCount++;
    this.state.lastFailure = Date.now();

    // Check if we should open the circuit
    if (this.state.status === 'CLOSED' && 
        this.state.failureCount >= this.options.failureThreshold) {
      await this.transitionToState('OPEN');
    } else if (this.state.status === 'HALF_OPEN') {
      // Any failure in half-open state should open the circuit
      await this.transitionToState('OPEN');
    }

    await this.persistState();
  }

  /**
   * 🔄 Transition to new state
   */
  async transitionToState(newState) {
    const oldState = this.state.status;
    
    this.state.status = newState;
    this.state.lastStateChange = Date.now();

    // State-specific initialization
    switch (newState) {
      case 'OPEN':
        this.state.nextAttempt = Date.now() + this.options.resetTimeout;
        this.state.successCount = 0;
        break;
        
      case 'HALF_OPEN':
        this.state.failureCount = 0;
        this.state.successCount = 0;
        this.state.nextAttempt = null;
        break;
        
      case 'CLOSED':
        this.state.failureCount = 0;
        this.state.successCount = 0;
        this.state.nextAttempt = null;
        this.consecutiveFailures = 0;
        this.consecutiveSuccesses = 0;
        break;
    }

    this.logger.info(`Circuit state changed: ${oldState} -> ${newState}`, {
      service: this.options.serviceName,
      oldState,
      newState,
      state: this.state
    });

    this.emit('stateChanged', {
      service: this.options.serviceName,
      oldState,
      newState,
      timestamp: new Date().toISOString(),
      state: { ...this.state }
    });

    await this.persistState();
  }

  /**
   * 📊 Update health metrics
   */
  updateHealthMetrics(responseTime, success) {
    // Add response time to rolling window
    this.healthMetrics.responseTimes.push({
      timestamp: Date.now(),
      value: responseTime
    });

    // Keep only the last windowSize metrics
    if (this.healthMetrics.responseTimes.length > this.options.windowSize) {
      this.healthMetrics.responseTimes.shift();
    }

    // Track error rate
    this.healthMetrics.errorRates.push({
      timestamp: Date.now(),
      value: success ? 0 : 1
    });

    if (this.healthMetrics.errorRates.length > this.options.windowSize) {
      this.healthMetrics.errorRates.shift();
    }
  }

  /**
   * 🎯 Get current circuit status
   */
  getStatus() {
    return {
      service: this.options.serviceName,
      state: this.state.status,
      stats: { ...this.stats },
      health: this.getHealthMetrics(),
      config: this.getConfigSummary(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * ❤️ Get health metrics
   */
  getHealthMetrics() {
    const responseTimes = this.healthMetrics.responseTimes.map(r => r.value);
    const errorRates = this.healthMetrics.errorRates.map(r => r.value);
    
    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
    
    const currentErrorRate = errorRates.length > 0 ? 
      (errorRates.reduce((a, b) => a + b, 0) / errorRates.length) * 100 : 0;

    return {
      averageResponseTime: avgResponseTime,
      currentErrorRate,
      consecutiveFailures: this.consecutiveFailures,
      consecutiveSuccesses: this.consecutiveSuccesses,
      windowSize: this.options.windowSize,
      healthScore: this.calculateHealthScore(avgResponseTime, currentErrorRate)
    };
  }

  /**
   * 🎚️ Calculate health score
   */
  calculateHealthScore(avgResponseTime, errorRate) {
    const responseTimeScore = Math.max(0, 100 - (avgResponseTime / 100)); // Penalize >100ms
    const errorRateScore = Math.max(0, 100 - errorRate); // Penalize error rate
    
    return (responseTimeScore * 0.6) + (errorRateScore * 0.4);
  }

  /**
   * 💾 Persist state to Redis
   */
  async persistState() {
    if (!this.redis.isOpen) return;

    try {
      const key = `circuit-breaker:${this.options.serviceName}:state`;
      await this.redis.setex(key, 3600, JSON.stringify(this.state)); // 1 hour TTL
    } catch (error) {
      this.logger.warn('Failed to persist circuit state to Redis', {
        service: this.options.serviceName,
        error: error.message
      });
    }
  }

  /**
   * 📥 Load state from Redis
   */
  async loadStateFromRedis() {
    if (!this.redis.isOpen) return;

    try {
      const key = `circuit-breaker:${this.options.serviceName}:state`;
      const storedState = await this.redis.get(key);
      
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        
        // Only load state if it's recent (less than 1 hour old)
        if (Date.now() - parsedState.lastStateChange < 3600000) {
          this.state = parsedState;
          this.logger.info('Loaded circuit state from Redis', {
            service: this.options.serviceName,
            state: this.state
          });
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load circuit state from Redis', {
        service: this.options.serviceName,
        error: error.message
      });
    }
  }

  /**
   * 📈 Start health monitoring
   */
  startHealthMonitoring() {
    this.healthInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  /**
   * 📊 Perform health check
   */
  async performHealthCheck() {
    try {
      const health = this.getHealthMetrics();
      
      this.metrics.recordGauge('circuit_breaker.health_score', health.healthScore, {
        service: this.options.serviceName
      });

      this.metrics.recordGauge('circuit_breaker.error_rate', health.currentErrorRate, {
        service: this.options.serviceName
      });

      this.metrics.recordGauge('circuit_breaker.response_time', health.averageResponseTime, {
        service: this.options.serviceName
      });

      // Alert on poor health
      if (health.healthScore < 70) {
        this.emit('healthDegraded', {
          service: this.options.serviceName,
          healthScore: health.healthScore,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      this.logger.error('Health check failed', {
        service: this.options.serviceName,
        error: error.message
      });
    }
  }

  /**
   * 📋 Start metrics collection
   */
  startMetricsCollection() {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute
  }

  /**
   * 📈 Collect and report metrics
   */
  async collectMetrics() {
    try {
      // Record basic stats
      this.metrics.recordCounter('circuit_breaker.requests.total', this.stats.totalRequests, {
        service: this.options.serviceName
      });

      this.metrics.recordCounter('circuit_breaker.requests.successful', this.stats.successfulRequests, {
        service: this.options.serviceName
      });

      this.metrics.recordCounter('circuit_breaker.requests.failed', this.stats.failedRequests, {
        service: this.options.serviceName
      });

      this.metrics.recordCounter('circuit_breaker.requests.timed_out', this.stats.timedOutRequests, {
        service: this.options.serviceName
      });

      this.metrics.recordCounter('circuit_breaker.requests.short_circuited', this.stats.shortCircuitedRequests, {
        service: this.options.serviceName
      });

      // Record state gauge
      const stateValue = { CLOSED: 0, HALF_OPEN: 1, OPEN: 2 }[this.state.status] || 0;
      this.metrics.recordGauge('circuit_breaker.state', stateValue, {
        service: this.options.serviceName
      });

    } catch (error) {
      this.logger.error('Metrics collection failed', {
        service: this.options.serviceName,
        error: error.message
      });
    }
  }

  /**
   * 💾 Start state persistence
   */
  startStatePersistence() {
    this.persistenceInterval = setInterval(() => {
      this.persistState();
    }, 30000); // Every 30 seconds
  }

  /**
   * 🔧 Get configuration summary
   */
  getConfigSummary() {
    return {
      failureThreshold: this.options.failureThreshold,
      successThreshold: this.options.successThreshold,
      timeout: this.options.timeout,
      resetTimeout: this.options.resetTimeout,
      windowSize: this.options.windowSize,
      halfOpenEnabled: this.options.halfOpenEnabled,
      fallbackEnabled: this.options.fallbackEnabled
    };
  }

  /**
   * 🆔 Generate request ID
   */
  generateRequestId() {
    return `req_${this.options.serviceName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 📝 Track request in history
   */
  trackRequest(request) {
    this.requestHistory.push(request);
    
    // Keep only the last 1000 requests
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-1000);
    }
  }

  /**
   * 🧹 Graceful shutdown
   */
  async shutdown() {
    this.shuttingDown = true;
    
    try {
      // Clear intervals
      if (this.healthInterval) clearInterval(this.healthInterval);
      if (this.metricsInterval) clearInterval(this.metricsInterval);
      if (this.persistenceInterval) clearInterval(this.persistenceInterval);

      // Persist final state
      await this.persistState();

      // Close Redis connection
      if (this.redis.isOpen) {
        await this.redis.quit();
      }

      this.logger.info('Circuit breaker shut down gracefully', {
        service: this.options.serviceName
      });

      this.emit('shutdown', {
        service: this.options.serviceName,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Circuit breaker shutdown failed', {
        service: this.options.serviceName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🎯 Manual state control (for testing/admin)
   */
  async setState(newState) {
    const validStates = ['CLOSED', 'OPEN', 'HALF_OPEN'];
    
    if (!validStates.includes(newState)) {
      throw new CircuitBreakerError('INVALID_STATE', {
        service: this.options.serviceName,
        state: newState,
        validStates
      });
    }

    await this.transitionToState(newState);
    
    this.logger.info('Circuit state manually changed', {
      service: this.options.serviceName,
      newState,
      source: 'manual'
    });
  }

  /**
   * 🔄 Reset circuit breaker
   */
  async reset() {
    await this.transitionToState('CLOSED');
    
    // Reset statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timedOutRequests: 0,
      shortCircuitedRequests: 0,
      fallbackSuccesses: 0,
      fallbackFailures: 0
    };

    this.requestHistory = [];
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;

    this.logger.info('Circuit breaker reset', {
      service: this.options.serviceName
    });
  }
}

// 🏢 Enterprise-grade error handling
class CircuitBreakerError extends Error {
  constructor(code, context = {}) {
    super(code);
    this.name = 'CircuitBreakerError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.isCircuitBreakerError = true;
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

// 🔧 Factory function for creating circuit breakers
const createCircuitBreaker = (serviceName, options = {}) => {
  return new CircuitBreaker({
    serviceName,
    ...options
  });
};

// 🎯 Circuit Breaker Manager for multiple services
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
    this.logger = new Logger({ service: 'circuit-breaker-manager' });
  }

  getBreaker(serviceName, options = {}) {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, createCircuitBreaker(serviceName, options));
      this.logger.info('Created new circuit breaker', { serviceName });
    }
    
    return this.breakers.get(serviceName);
  }

  async shutdown() {
    const shutdownPromises = Array.from(this.breakers.values()).map(breaker => 
      breaker.shutdown().catch(error => {
        this.logger.error('Circuit breaker shutdown failed', {
          service: breaker.options.serviceName,
          error: error.message
        });
      })
    );

    await Promise.allSettled(shutdownPromises);
    this.breakers.clear();
    
    this.logger.info('Circuit breaker manager shut down');
  }

  getStatus() {
    const status = {};
    
    for (const [serviceName, breaker] of this.breakers) {
      status[serviceName] = breaker.getStatus();
    }
    
    return status;
  }
}

module.exports = {
  CircuitBreaker,
  CircuitBreakerError,
  createCircuitBreaker,
  CircuitBreakerManager
};