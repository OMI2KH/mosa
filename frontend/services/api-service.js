/**
 * 🎯 MOSA FORGE: Enterprise API Service
 * 
 * @module ApiService
 * @description Base API service for enterprise microservices communication
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Circuit breaker pattern implementation
 * - Request/response interceptors
 * - Automatic retry with exponential backoff
 * - Distributed tracing
 * - Rate limiting and throttling
 * - Comprehensive error handling
 * - Performance monitoring
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const Redis = require('ioredis');
const { performance } = require('perf_hooks');

// 🏗️ Enterprise Constants
const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE'
};

const API_ERRORS = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  RATE_LIMITED: 'RATE_LIMITED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

const DEFAULT_CONFIG = {
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  maxRedirects: 5,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000,
  rateLimit: {
    requests: 100,
    window: 60000 // 1 minute
  }
};

/**
 * 🏗️ Enterprise API Service Class
 * @class ApiService
 * @extends EventEmitter
 */
class ApiService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 🏗️ Enterprise Configuration
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      baseURL: config.baseURL || process.env.API_BASE_URL,
      headers: {
        'User-Agent': 'MosaForge-Enterprise/1.0.0',
        'Content-Type': 'application/json',
        ...config.headers
      }
    };

    // 🏗️ Service Dependencies
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    });

    // 🏗️ Circuit Breaker Registry
    this.circuitBreakers = new Map();
    
    // 🏗️ Request Queue for Rate Limiting
    this.requestQueue = new Map();
    
    // 🏗️ Performance Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      circuitBreakerTrips: 0,
      rateLimitHits: 0
    };

    // 🏗️ Initialize Axios Instance with Interceptors
    this.httpClient = this._createHttpClient();
    
    this._initializeEventHandlers();
    this._startMetricsCollection();
  }

  /**
   * 🏗️ Create Configured HTTP Client
   * @private
   */
  _createHttpClient() {
    const client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      maxRedirects: this.config.maxRedirects,
      headers: this.config.headers,
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    });

    // 🏗️ Request Interceptor
    client.interceptors.request.use(
      (config) => this._requestInterceptor(config),
      (error) => this._requestErrorInterceptor(error)
    );

    // 🏗️ Response Interceptor
    client.interceptors.response.use(
      (response) => this._responseInterceptor(response),
      (error) => this._responseErrorInterceptor(error)
    );

    return client;
  }

  /**
   * 🏗️ Request Interceptor
   * @private
   */
  _requestInterceptor(config) {
    const traceId = uuidv4();
    const startTime = performance.now();

    // Add tracing headers
    config.headers['x-trace-id'] = traceId;
    config.headers['x-request-id'] = uuidv4();
    config.headers['x-service-name'] = 'mosa-forge-api-service';
    config.headers['x-timestamp'] = new Date().toISOString();

    // Store request metadata
    config.metadata = {
      traceId,
      startTime,
      url: config.url,
      method: config.method,
      service: this._extractServiceName(config.url)
    };

    this.emit('request.started', config.metadata);

    return config;
  }

  /**
   * 🏗️ Request Error Interceptor
   * @private
   */
  _requestErrorInterceptor(error) {
    const errorData = {
      message: 'Request configuration error',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    this.emit('request.failed', errorData);
    this._logError('REQUEST_CONFIG_ERROR', error);

    return Promise.reject(this._formatApiError(error, 'REQUEST_CONFIG_ERROR'));
  }

  /**
   * 🏗️ Response Interceptor
   * @private
   */
  _responseInterceptor(response) {
    const { metadata } = response.config;
    const endTime = performance.now();
    const responseTime = endTime - metadata.startTime;

    const responseData = {
      ...metadata,
      responseTime,
      statusCode: response.status,
      statusText: response.statusText,
      headers: response.headers
    };

    // Update metrics
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this._updateResponseTimeMetrics(responseTime);

    this.emit('request.completed', responseData);

    // Log slow requests
    if (responseTime > 5000) { // 5 seconds threshold
      this._logWarning('SLOW_REQUEST', {
        ...responseData,
        threshold: 5000
      });
    }

    return response;
  }

  /**
   * 🏗️ Response Error Interceptor
   * @private
   */
  _responseErrorInterceptor(error) {
    const metadata = error.config?.metadata || {};
    const errorData = {
      ...metadata,
      error: error.message,
      code: error.code,
      response: error.response?.data,
      statusCode: error.response?.status,
      timestamp: new Date().toISOString()
    };

    // Update metrics
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;

    this.emit('request.failed', errorData);

    // Handle specific error types
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(this._formatApiError(error, API_ERRORS.TIMEOUT_ERROR));
    }

    if (error.response) {
      const status = error.response.status;
      switch (status) {
        case 401:
          return Promise.reject(this._formatApiError(error, API_ERRORS.UNAUTHORIZED));
        case 403:
          return Promise.reject(this._formatApiError(error, API_ERRORS.FORBIDDEN));
        case 404:
          return Promise.reject(this._formatApiError(error, API_ERRORS.NOT_FOUND));
        case 422:
          return Promise.reject(this._formatApiError(error, API_ERRORS.VALIDATION_ERROR));
        case 429:
          this.metrics.rateLimitHits++;
          return Promise.reject(this._formatApiError(error, API_ERRORS.RATE_LIMITED));
        case 503:
          return Promise.reject(this._formatApiError(error, API_ERRORS.SERVICE_UNAVAILABLE));
        default:
          return Promise.reject(this._formatApiError(error, API_ERRORS.NETWORK_ERROR));
      }
    }

    return Promise.reject(this._formatApiError(error, API_ERRORS.NETWORK_ERROR));
  }

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Execute API Request
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} data - Request data
   * @param {Object} options - Request options
   * @returns {Promise<Object>} API response
   */
  async execute(method, url, data = null, options = {}) {
    const serviceName = this._extractServiceName(url);
    const circuitBreaker = this._getCircuitBreaker(serviceName);
    
    const requestOptions = {
      method,
      url,
      ...options,
      data: method !== HTTP_METHODS.GET ? data : undefined,
      params: method === HTTP_METHODS.GET ? data : options.params
    };

    try {
      // Check rate limiting
      await this._checkRateLimit(serviceName);

      // Execute with circuit breaker
      const response = await circuitBreaker.execute(() => 
        this.httpClient(requestOptions)
      );

      return this._formatSuccessResponse(response);

    } catch (error) {
      // Handle retry logic for retryable errors
      if (this._isRetryableError(error) && options.retry !== false) {
        return this._executeWithRetry(method, url, data, options, error);
      }

      throw error;
    }
  }

  /**
   * 🏗️ Execute Request with Retry Logic
   * @private
   */
  async _executeWithRetry(method, url, data, options, initialError, attempt = 1) {
    const maxRetries = options.maxRetries || this.config.maxRetries;
    
    if (attempt > maxRetries) {
      this.emit('retry.exhausted', {
        url,
        method,
        attempts: attempt,
        finalError: initialError.message
      });
      throw initialError;
    }

    // Exponential backoff with jitter
    const delay = this._calculateRetryDelay(attempt);
    
    this.emit('retry.attempt', {
      url,
      method,
      attempt,
      maxRetries,
      delay
    });

    await this._sleep(delay);

    try {
      const response = await this.httpClient({
        method,
        url,
        data: method !== HTTP_METHODS.GET ? data : undefined,
        params: method === HTTP_METHODS.GET ? data : options.params,
        ...options
      });

      this.emit('retry.success', {
        url,
        method,
        attempt,
        totalAttempts: attempt + 1
      });

      return this._formatSuccessResponse(response);

    } catch (error) {
      if (this._isRetryableError(error)) {
        return this._executeWithRetry(method, url, data, options, error, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * 🏗️ Calculate Retry Delay with Jitter
   * @private
   */
  _calculateRetryDelay(attempt) {
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = exponentialDelay * 0.1 * Math.random(); // 10% jitter
    return exponentialDelay + jitter;
  }

  /**
   * 🏗️ Sleep Utility
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🏗️ Check Rate Limit
   * @private
   */
  async _checkRateLimit(serviceName) {
    const now = Date.now();
    const window = this.config.rateLimit.window;
    const key = `rate_limit:${serviceName}:${Math.floor(now / window)}`;
    
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, window / 1000);
    }
    
    if (current > this.config.rateLimit.requests) {
      this.emit('rate.limited', {
        serviceName,
        current,
        limit: this.config.rateLimit.requests,
        window
      });
      
      throw this._formatApiError(
        new Error(`Rate limit exceeded for ${serviceName}`),
        API_ERRORS.RATE_LIMITED
      );
    }
    
    return current;
  }

  /**
   * 🏗️ Get Circuit Breaker for Service
   * @private
   */
  _getCircuitBreaker(serviceName) {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, this._createCircuitBreaker(serviceName));
    }
    return this.circuitBreakers.get(serviceName);
  }

  /**
   * 🏗️ Create Circuit Breaker
   * @private
   */
  _createCircuitBreaker(serviceName) {
    let state = 'CLOSED';
    let failureCount = 0;
    let lastFailureTime = null;
    const threshold = this.config.circuitBreakerThreshold;
    const timeout = this.config.circuitBreakerTimeout;

    return {
      execute: async (operation) => {
        if (state === 'OPEN') {
          if (Date.now() - lastFailureTime > timeout) {
            state = 'HALF_OPEN';
            this.emit('circuit.half_open', { serviceName });
          } else {
            this.metrics.circuitBreakerTrips++;
            throw this._formatApiError(
              new Error(`Circuit breaker is OPEN for ${serviceName}`),
              API_ERRORS.CIRCUIT_OPEN
            );
          }
        }

        try {
          const result = await operation();
          
          if (state === 'HALF_OPEN') {
            state = 'CLOSED';
            failureCount = 0;
            this.emit('circuit.closed', { serviceName });
          }
          
          return result;
        } catch (error) {
          failureCount++;
          lastFailureTime = Date.now();
          
          if (failureCount >= threshold || state === 'HALF_OPEN') {
            state = 'OPEN';
            this.emit('circuit.opened', { 
              serviceName, 
              failureCount,
              threshold 
            });
          }
          
          throw error;
        }
      },
      getState: () => state
    };
  }

  /**
   * 🏗️ Extract Service Name from URL
   * @private
   */
  _extractServiceName(url) {
    const match = url.match(/\/\/([^\/]+)/);
    return match ? match[1] : 'unknown';
  }

  /**
   * 🏗️ Check if Error is Retryable
   * @private
   */
  _isRetryableError(error) {
    const retryableCodes = [
      'ECONNRESET',
      'ETIMEDOUT', 
      'ECONNABORTED',
      'ENOTFOUND'
    ];
    
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    
    return (
      retryableCodes.includes(error.code) ||
      (error.response && retryableStatuses.includes(error.response.status))
    );
  }

  /**
   * 🏗️ Format Success Response
   * @private
   */
  _formatSuccessResponse(response) {
    return {
      success: true,
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      metadata: {
        responseTime: response.config.metadata?.responseTime,
        traceId: response.config.metadata?.traceId
      }
    };
  }

  /**
   * 🏗️ Format API Error
   * @private
   */
  _formatApiError(error, code) {
    const apiError = new Error(error.message);
    apiError.code = code;
    apiError.originalError = error;
    apiError.timestamp = new Date().toISOString();
    apiError.isApiError = true;
    
    if (error.response) {
      apiError.status = error.response.status;
      apiError.data = error.response.data;
    }
    
    return apiError;
  }

  /**
   * 🏗️ Update Response Time Metrics
   * @private
   */
  _updateResponseTimeMetrics(responseTime) {
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.successfulRequests - 1) + responseTime) / 
      this.metrics.successfulRequests;
  }

  /**
   * 🏗️ Initialize Event Handlers
   * @private
   */
  _initializeEventHandlers() {
    this.on('request.started', (data) => {
      this._logInfo('REQUEST_STARTED', data);
    });

    this.on('request.completed', (data) => {
      this._logInfo('REQUEST_COMPLETED', data);
    });

    this.on('request.failed', (data) => {
      this._logError('REQUEST_FAILED', data);
    });

    this.on('circuit.opened', (data) => {
      this._logWarning('CIRCUIT_OPENED', data);
    });

    this.on('circuit.closed', (data) => {
      this._logInfo('CIRCUIT_CLOSED', data);
    });

    this.on('rate.limited', (data) => {
      this._logWarning('RATE_LIMITED', data);
    });
  }

  /**
   * 🏗️ Start Metrics Collection
   * @private
   */
  _startMetricsCollection() {
    setInterval(() => {
      this._collectAndEmitMetrics();
    }, 60000); // Every minute
  }

  /**
   * 🏗️ Collect and Emit Metrics
   * @private
   */
  async _collectAndEmitMetrics() {
    const metrics = this.getMetrics();
    
    // Store metrics in Redis for monitoring
    await this.redis.set(
      `metrics:api-service:${Date.now()}`,
      JSON.stringify(metrics),
      'EX',
      300 // 5 minutes TTL
    );
    
    this.emit('metrics.collected', metrics);
  }

  /**
   * 🏗️ Enterprise Logging
   * @private
   */
  _logEvent(level, event, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'api-service',
      level,
      event,
      data,
      environment: process.env.NODE_ENV || 'development'
    };

    console.log(JSON.stringify(logEntry));

    // Send to centralized logging in production
    if (process.env.NODE_ENV === 'production') {
      this.redis.publish('service-logs', JSON.stringify(logEntry));
    }
  }

  _logInfo(event, data) {
    this._logEvent('INFO', event, data);
  }

  _logWarning(event, data) {
    this._logEvent('WARN', event, data);
  }

  _logError(event, data) {
    this._logEvent('ERROR', event, data);
  }

  /**
   * 🎯 CONVENIENCE METHODS: HTTP Verb Shortcuts
   */

  async get(url, params = {}, options = {}) {
    return this.execute(HTTP_METHODS.GET, url, params, options);
  }

  async post(url, data = {}, options = {}) {
    return this.execute(HTTP_METHODS.POST, url, data, options);
  }

  async put(url, data = {}, options = {}) {
    return this.execute(HTTP_METHODS.PUT, url, data, options);
  }

  async patch(url, data = {}, options = {}) {
    return this.execute(HTTP_METHODS.PATCH, url, data, options);
  }

  async delete(url, data = {}, options = {}) {
    return this.execute(HTTP_METHODS.DELETE, url, data, options);
  }

  /**
   * 🏗️ Service Health Check
   * @returns {Object} Health status
   */
  async healthCheck() {
    const health = {
      service: 'api-service',
      timestamp: new Date().toISOString(),
      status: 'healthy',
      dependencies: {},
      metrics: this.getMetrics()
    };

    try {
      // Check Redis connection
      await this.redis.ping();
      health.dependencies.redis = 'healthy';
    } catch (error) {
      health.dependencies.redis = 'unhealthy';
      health.status = 'degraded';
    }

    // Check circuit breaker states
    health.circuitBreakers = {};
    for (const [serviceName, breaker] of this.circuitBreakers.entries()) {
      health.circuitBreakers[serviceName] = breaker.getState();
    }

    return health;
  }

  /**
   * 🏗️ Get Service Metrics
   * @returns {Object} Service performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      circuitBreakerStates: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([service, breaker]) => [
          service,
          breaker.getState()
        ])
      )
    };
  }

  /**
   * 🏗️ Update Configuration
   * @param {Object} newConfig - New configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.httpClient = this._createHttpClient(); // Recreate client with new config
    
    this.emit('config.updated', { config: this.config });
  }

  /**
   * 🏗️ Graceful Shutdown
   */
  async shutdown() {
    try {
      this.emit('service.shutdown.started');
      
      // Close Redis connection
      await this.redis.quit();
      
      // Cancel pending requests
      // Note: This depends on the axios version and cancellation token support
      
      this.emit('service.shutdown.completed');
    } catch (error) {
      this.emit('service.shutdown.failed', { error: error.message });
      throw error;
    }
  }
}

// 🏗️ Enterprise Export Pattern
module.exports = {
  ApiService,
  HTTP_METHODS,
  API_ERRORS
};

// 🏗️ Singleton Instance for Microservice Architecture
let apiServiceInstance = null;

module.exports.getInstance = (config = {}) => {
  if (!apiServiceInstance) {
    apiServiceInstance = new ApiService(config);
  }
  return apiServiceInstance;
};

// 🏗️ Utility Functions for External Use
module.exports.createApiError = (message, code, originalError = null) => {
  const error = new Error(message);
  error.code = code;
  error.originalError = originalError;
  error.timestamp = new Date().toISOString();
  error.isApiError = true;
  return error;
};

module.exports.isApiError = (error) => {
  return error && error.isApiError === true;
};