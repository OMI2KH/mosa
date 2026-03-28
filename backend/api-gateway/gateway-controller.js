// api-gateway/gateway-controller.js

/**
 * 🏢 MOSA FORGE - Enterprise API Gateway Controller
 * 🌐 Centralized request routing, load balancing, and service orchestration
 * 🔧 Powered by Chereka | Founded by Oumer Muktar
 * 
 * @module GatewayController
 * @version Enterprise 1.0
 */

const { EventEmitter } = require('events');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const Redis = require('redis');
const { createClient } = require('redis');
const { performance } = require('perf_hooks');
const { CircuitBreakerManager } = require('./circuit-breaker');
const { RateLimiter } = require('./rate-limiter');
const { ServiceDiscovery } = require('./service-discovery');
const { SecurityManager } = require('./security-manager');
const { Logger } = require('../utils/logger');
const { MetricsCollector } = require('../utils/metrics-collector');

class GatewayController extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Server configuration
      port: config.port || process.env.PORT || 3000,
      environment: process.env.NODE_ENV || 'development',
      clusterEnabled: config.clusterEnabled || false,
      
      // Security configuration
      enableSecurity: config.enableSecurity !== false,
      enableCORS: config.enableCORS !== false,
      enableCompression: config.enableCompression !== false,
      
      // Redis configuration
      redisUrl: config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      
      // Service configuration
      services: config.services || {},
      defaultTimeout: config.defaultTimeout || 30000,
      maxRetries: config.maxRetries || 3,
      
      // Monitoring configuration
      enableMetrics: config.enableMetrics !== false,
      enableHealthChecks: config.enableHealthChecks !== false,
      enableRequestLogging: config.enableRequestLogging !== false,
      
      // Advanced features
      enableCaching: config.enableCaching !== false,
      enableCircuitBreaker: config.enableCircuitBreaker !== false,
      enableRateLimiting: config.enableRateLimiting !== false,
      enableServiceDiscovery: config.enableServiceDiscovery !== false,
      
      ...config
    };

    // Core components
    this.app = express();
    this.redis = createClient({
      url: this.config.redisUrl,
      socket: {
        tls: this.config.environment === 'production',
        reconnectStrategy: (retries) => Math.min(retries * 100, 5000)
      }
    });

    this.logger = new Logger({
      service: 'api-gateway',
      level: this.config.environment === 'production' ? 'info' : 'debug'
    });

    this.metrics = new MetricsCollector({
      service: 'api-gateway',
      gateway: true
    });

    // Service management
    this.circuitBreakerManager = new CircuitBreakerManager();
    this.rateLimiter = new RateLimiter({ redis: this.redis });
    this.serviceDiscovery = new ServiceDiscovery({ redis: this.redis });
    this.securityManager = new SecurityManager({ redis: this.redis });

    // State management
    this.services = new Map();
    this.routes = new Map();
    this.middleware = new Map();
    this.healthStatus = new Map();
    
    this.server = null;
    this.isInitialized = false;
    this.isShuttingDown = false;

    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      blockedRequests: 0,
      activeConnections: 0,
      serviceCalls: new Map()
    };

    this.initialize();
  }

  /**
   * 🏗️ Initialize gateway controller
   */
  async initialize() {
    try {
      this.logger.info('Initializing API Gateway Controller', {
        environment: this.config.environment,
        port: this.config.port
      });

      // Initialize Redis
      await this.initializeRedis();

      // Initialize security
      await this.initializeSecurity();

      // Initialize services
      await this.initializeServices();

      // Initialize middleware
      await this.initializeMiddleware();

      // Initialize routes
      await this.initializeRoutes();

      // Initialize health checks
      await this.initializeHealthChecks();

      // Initialize monitoring
      await this.initializeMonitoring();

      this.isInitialized = true;

      this.logger.info('API Gateway Controller initialized successfully', {
        services: Array.from(this.services.keys()),
        routes: Array.from(this.routes.keys())
      });

      this.emit('initialized', {
        timestamp: new Date().toISOString(),
        services: Array.from(this.services.keys()),
        config: this.getConfigSummary()
      });

    } catch (error) {
      this.logger.error('API Gateway Controller initialization failed', {
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
   * 💾 Initialize Redis connections
   */
  async initializeRedis() {
    try {
      await this.redis.connect();
      
      this.logger.info('Redis connection established', {
        url: this.config.redisUrl
      });

      this.redis.on('error', (error) => {
        this.logger.error('Redis connection error', { error: error.message });
        this.emit('redisError', { error: error.message, timestamp: new Date().toISOString() });
      });

      this.redis.on('connect', () => {
        this.logger.info('Redis connection restored');
        this.emit('redisReconnected', { timestamp: new Date().toISOString() });
      });

    } catch (error) {
      this.logger.error('Redis connection failed', { error: error.message });
      throw new GatewayError('REDIS_CONNECTION_FAILED', { error: error.message });
    }
  }

  /**
   * 🛡️ Initialize security middleware
   */
  async initializeSecurity() {
    if (!this.config.enableSecurity) return;

    // Security headers
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS
    if (this.config.enableCORS) {
      this.app.use(cors({
        origin: this.getCorsOrigins(),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      }));
    }

    // Compression
    if (this.config.enableCompression) {
      this.app.use(compression());
    }

    // Body parsing
    this.app.use(express.json({
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));

    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    this.logger.info('Security middleware initialized');
  }

  /**
   * 🔧 Initialize service configurations
   */
  async initializeServices() {
    const serviceConfigs = {
      'auth-service': {
        baseUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
        endpoints: ['/auth/*', '/users/*'],
        timeout: 15000,
        circuitBreaker: true,
        rateLimit: { windowMs: 60000, max: 100 }
      },
      'payment-service': {
        baseUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3002',
        endpoints: ['/payments/*', '/payouts/*'],
        timeout: 30000,
        circuitBreaker: true,
        rateLimit: { windowMs: 60000, max: 50 }
      },
      'expert-service': {
        baseUrl: process.env.EXPERT_SERVICE_URL || 'http://localhost:3003',
        endpoints: ['/experts/*', '/students/*'],
        timeout: 20000,
        circuitBreaker: true,
        rateLimit: { windowMs: 60000, max: 200 }
      },
      'learning-service': {
        baseUrl: process.env.LEARNING_SERVICE_URL || 'http://localhost:3004',
        endpoints: ['/learning/*', '/courses/*'],
        timeout: 25000,
        circuitBreaker: true,
        rateLimit: { windowMs: 60000, max: 150 }
      },
      ...this.config.services
    };

    for (const [serviceName, serviceConfig] of Object.entries(serviceConfigs)) {
      await this.registerService(serviceName, serviceConfig);
    }

    this.logger.info('Services initialized', {
      count: this.services.size,
      services: Array.from(this.services.keys())
    });
  }

  /**
   * 📍 Initialize API routes
   */
  async initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', this.healthCheck.bind(this));

    // Metrics endpoint
    if (this.config.enableMetrics) {
      this.app.get('/metrics', this.getMetrics.bind(this));
    }

    // Gateway info endpoint
    this.app.get('/gateway/info', this.getGatewayInfo.bind(this));

    // Service status endpoint
    this.app.get('/gateway/services', this.getServicesStatus.bind(this));

    // Dynamic route registration
    for (const [serviceName, service] of this.services) {
      for (const endpoint of service.endpoints) {
        this.registerRoute(endpoint, serviceName);
      }
    }

    // 404 handler
    this.app.use('*', this.handleNotFound.bind(this));

    // Global error handler
    this.app.use(this.handleError.bind(this));

    this.logger.info('Routes initialized', {
      routes: Array.from(this.routes.keys())
    });
  }

  /**
   * ⚙️ Initialize middleware stack
   */
  async initializeMiddleware() {
    // Request logging
    if (this.config.enableRequestLogging) {
      this.app.use(this.requestLogger.bind(this));
    }

    // Request ID generation
    this.app.use(this.requestIdGenerator.bind(this));

    // Security validation
    this.app.use(this.securityValidation.bind(this));

    // Rate limiting
    if (this.config.enableRateLimiting) {
      this.app.use(this.rateLimiting.bind(this));
    }

    // Service discovery
    if (this.config.enableServiceDiscovery) {
      this.app.use(this.serviceDiscoveryMiddleware.bind(this));
    }

    this.logger.info('Middleware stack initialized');
  }

  /**
   * 🩺 Initialize health checks
   */
  async initializeHealthChecks() {
    if (!this.config.enableHealthChecks) return;

    // Start health monitoring
    this.healthInterval = setInterval(() => {
      this.performHealthChecks();
    }, 30000); // Every 30 seconds

    this.logger.info('Health checks initialized');
  }

  /**
   * 📊 Initialize monitoring
   */
  async initializeMonitoring() {
    if (!this.config.enableMetrics) return;

    // Start metrics collection
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute

    this.logger.info('Monitoring initialized');
  }

  /**
   * 📝 Register a service with the gateway
   */
  async registerService(serviceName, config) {
    const service = {
      name: serviceName,
      baseUrl: config.baseUrl,
      endpoints: config.endpoints || [],
      timeout: config.timeout || this.config.defaultTimeout,
      circuitBreaker: config.circuitBreaker !== false,
      rateLimit: config.rateLimit,
      healthCheck: config.healthCheck || `${config.baseUrl}/health`,
      retryConfig: {
        maxRetries: config.maxRetries || this.config.maxRetries,
        retryDelay: config.retryDelay || 1000
      },
      ...config
    };

    // Initialize circuit breaker for service
    if (service.circuitBreaker && this.config.enableCircuitBreaker) {
      service.circuitBreaker = this.circuitBreakerManager.getBreaker(serviceName, {
        failureThreshold: 5,
        successThreshold: 3,
        timeout: service.timeout,
        resetTimeout: 60000
      });
    }

    // Initialize rate limiter for service
    if (service.rateLimit && this.config.enableRateLimiting) {
      service.rateLimiter = await this.rateLimiter.createLimiter(
        serviceName,
        service.rateLimit
      );
    }

    this.services.set(serviceName, service);
    
    this.logger.info('Service registered', {
      service: serviceName,
      baseUrl: service.baseUrl,
      endpoints: service.endpoints
    });

    this.emit('serviceRegistered', {
      service: serviceName,
      config: service,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 🛣️ Register a route for a service
   */
  registerRoute(path, serviceName) {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new GatewayError('SERVICE_NOT_FOUND', { serviceName, path });
    }

    // Create route handler
    const routeHandler = this.createRouteHandler(service);

    // Register all HTTP methods
    const methods = ['get', 'post', 'put', 'delete', 'patch', 'options'];
    
    methods.forEach(method => {
      this.app[method](path, routeHandler);
    });

    this.routes.set(path, {
      service: serviceName,
      path,
      methods,
      handler: routeHandler
    });

    this.logger.debug('Route registered', {
      path,
      service: serviceName,
      methods
    });
  }

  /**
   * 🎯 Create route handler for service
   */
  createRouteHandler(service) {
    return async (req, res, next) => {
      const requestId = req.requestId;
      const startTime = performance.now();

      try {
        this.stats.totalRequests++;
        this.stats.activeConnections++;

        // Update service call statistics
        this.updateServiceStats(service.name);

        // Check service health
        if (!await this.isServiceHealthy(service.name)) {
          throw new GatewayError('SERVICE_UNAVAILABLE', {
            service: service.name,
            requestId
          });
        }

        // Apply rate limiting
        if (service.rateLimiter) {
          await this.applyRateLimiting(req, res, service.rateLimiter);
        }

        // Execute request through circuit breaker if enabled
        let response;
        if (service.circuitBreaker && this.config.enableCircuitBreaker) {
          response = await service.circuitBreaker.execute(
            () => this.forwardRequest(req, service),
            () => this.executeFallback(req, service),
            { requestId, service: service.name }
          );
        } else {
          response = await this.forwardRequest(req, service);
        }

        const responseTime = performance.now() - startTime;

        // Send successful response
        this.sendSuccessResponse(res, response, responseTime, requestId);

        this.stats.successfulRequests++;
        this.stats.activeConnections--;

      } catch (error) {
        const responseTime = performance.now() - startTime;
        
        this.handleRouteError(error, req, res, responseTime, service.name);
        
        this.stats.failedRequests++;
        this.stats.activeConnections--;
      }
    };
  }

  /**
   * 📨 Forward request to target service
   */
  async forwardRequest(req, service) {
    const requestId = req.requestId;
    const targetUrl = this.buildTargetUrl(req, service);
    
    const options = {
      method: req.method,
      headers: {
        ...this.forwardHeaders(req),
        'x-request-id': requestId,
        'x-gateway-service': service.name,
        'user-agent': 'Mosa-Forge-Gateway/1.0'
      },
      timeout: service.timeout,
      body: this.shouldForwardBody(req) ? req.body : undefined
    };

    this.logger.debug('Forwarding request', {
      requestId,
      service: service.name,
      method: req.method,
      targetUrl,
      originalUrl: req.originalUrl
    });

    const response = await fetch(targetUrl, options);

    if (!response.ok) {
      throw new GatewayError('SERVICE_ERROR', {
        service: service.name,
        status: response.status,
        statusText: response.statusText,
        requestId
      });
    }

    const data = await response.json();

    return {
      status: response.status,
      headers: this.filterResponseHeaders(response.headers),
      data
    };
  }

  /**
   * 🛟 Execute fallback for failed requests
   */
  async executeFallback(req, service) {
    const requestId = req.requestId;
    
    this.logger.warn('Executing fallback', {
      requestId,
      service: service.name,
      originalUrl: req.originalUrl
    });

    // Implement fallback strategies based on service and request type
    const fallbackResponse = await this.getFallbackResponse(req, service);

    this.emit('fallbackExecuted', {
      service: service.name,
      requestId,
      timestamp: new Date().toISOString(),
      fallbackType: fallbackResponse.type
    });

    return fallbackResponse;
  }

  /**
   * 🎪 Get fallback response
   */
  async getFallbackResponse(req, service) {
    // Default fallback responses based on service
    const fallbackStrategies = {
      'auth-service': {
        '/auth/login': { status: 503, data: { error: 'Service temporarily unavailable', code: 'AUTH_UNAVAILABLE' }},
        '/auth/verify': { status: 503, data: { error: 'Service temporarily unavailable', code: 'AUTH_UNAVAILABLE' }}
      },
      'payment-service': {
        '/payments/process': { status: 503, data: { error: 'Payment service unavailable', code: 'PAYMENT_UNAVAILABLE' }}
      },
      'default': {
        status: 503,
        data: { error: 'Service temporarily unavailable', code: 'SERVICE_UNAVAILABLE' }
      }
    };

    const serviceFallbacks = fallbackStrategies[service.name] || fallbackStrategies.default;
    const specificFallback = serviceFallbacks[req.path] || serviceFallbacks;

    return {
      status: specificFallback.status,
      headers: { 'content-type': 'application/json' },
      data: specificFallback.data,
      type: 'static_fallback'
    };
  }

  /**
   * 🩺 Health check endpoint
   */
  async healthCheck(req, res) {
    const health = await this.getHealthStatus();

    if (health.status === 'healthy') {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: health.services,
        gateway: {
          totalRequests: this.stats.totalRequests,
          activeConnections: this.stats.activeConnections,
          memoryUsage: process.memoryUsage()
        }
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        issues: health.issues,
        services: health.services
      });
    }
  }

  /**
   * 📊 Metrics endpoint
   */
  async getMetrics(req, res) {
    const metrics = await this.collectDetailedMetrics();

    res.status(200).json({
      timestamp: new Date().toISOString(),
      gateway: {
        totalRequests: this.stats.totalRequests,
        successfulRequests: this.stats.successfulRequests,
        failedRequests: this.stats.failedRequests,
        blockedRequests: this.stats.blockedRequests,
        activeConnections: this.stats.activeConnections
      },
      services: Object.fromEntries(this.stats.serviceCalls),
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        version: process.version
      }
    });
  }

  /**
   * ℹ️ Gateway info endpoint
   */
  async getGatewayInfo(req, res) {
    res.status(200).json({
      name: 'Mosa Forge API Gateway',
      version: '1.0.0',
      environment: this.config.environment,
      timestamp: new Date().toISOString(),
      services: Array.from(this.services.keys()),
      features: {
        circuitBreaker: this.config.enableCircuitBreaker,
        rateLimiting: this.config.enableRateLimiting,
        serviceDiscovery: this.config.enableServiceDiscovery,
        caching: this.config.enableCaching,
        metrics: this.config.enableMetrics
      }
    });
  }

  /**
   * 🔧 Services status endpoint
   */
  async getServicesStatus(req, res) {
    const servicesStatus = {};

    for (const [serviceName, service] of this.services) {
      servicesStatus[serviceName] = {
        baseUrl: service.baseUrl,
        healthy: this.healthStatus.get(serviceName) || false,
        circuitBreaker: service.circuitBreaker ? service.circuitBreaker.getStatus() : null,
        stats: this.stats.serviceCalls.get(serviceName) || { calls: 0, errors: 0 }
      };
    }

    res.status(200).json({
      timestamp: new Date().toISOString(),
      services: servicesStatus
    });
  }

  /**
   * 🚀 Start the gateway server
   */
  async start() {
    if (!this.isInitialized) {
      throw new GatewayError('GATEWAY_NOT_INITIALIZED');
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, (error) => {
        if (error) {
          this.logger.error('Failed to start gateway server', { error: error.message });
          reject(new GatewayError('SERVER_START_FAILED', { error: error.message }));
          return;
        }

        this.logger.info('Gateway server started successfully', {
          port: this.config.port,
          environment: this.config.environment
        });

        this.emit('serverStarted', {
          port: this.config.port,
          timestamp: new Date().toISOString()
        });

        resolve(this.server);
      });

      // Graceful shutdown handlers
      process.on('SIGTERM', this.gracefulShutdown.bind(this));
      process.on('SIGINT', this.gracefulShutdown.bind(this));
    });
  }

  /**
   * 🛑 Graceful shutdown
   */
  async gracefulShutdown(signal = 'SIGTERM') {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    
    this.logger.info('Initiating graceful shutdown', { signal });

    try {
      // Stop accepting new connections
      if (this.server) {
        this.server.close(() => {
          this.logger.info('HTTP server closed');
        });
      }

      // Clear intervals
      if (this.healthInterval) clearInterval(this.healthInterval);
      if (this.metricsInterval) clearInterval(this.metricsInterval);

      // Shutdown circuit breakers
      await this.circuitBreakerManager.shutdown();

      // Close Redis connection
      if (this.redis.isOpen) {
        await this.redis.quit();
      }

      // Wait for active connections to complete
      await this.waitForActiveConnections();

      this.logger.info('Graceful shutdown completed');
      
      this.emit('shutdownCompleted', {
        timestamp: new Date().toISOString(),
        signal
      });

      process.exit(0);

    } catch (error) {
      this.logger.error('Graceful shutdown failed', { error: error.message });
      process.exit(1);
    }
  }

  // 🛠️ HELPER METHODS

  /**
   * 📝 Request logger middleware
   */
  async requestLogger(req, res, next) {
    const startTime = performance.now();
    
    res.on('finish', () => {
      const responseTime = performance.now() - startTime;
      
      this.logger.info('Request completed', {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        responseTime: responseTime.toFixed(2),
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        requestId: req.requestId
      });

      this.metrics.recordHistogram('http_request_duration_seconds', responseTime / 1000, {
        method: req.method,
        status: res.statusCode,
        route: req.route?.path || req.originalUrl
      });
    });

    next();
  }

  /**
   * 🆔 Request ID generator middleware
   */
  async requestIdGenerator(req, res, next) {
    req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('x-request-id', req.requestId);
    next();
  }

  /**
   * 🛡️ Security validation middleware
   */
  async securityValidation(req, res, next) {
    try {
      await this.securityManager.validateRequest(req);
      next();
    } catch (error) {
      this.stats.blockedRequests++;
      this.logger.warn('Request blocked by security validation', {
        requestId: req.requestId,
        reason: error.message,
        ip: req.ip,
        url: req.originalUrl
      });

      res.status(403).json({
        error: 'Request blocked',
        code: 'SECURITY_VALIDATION_FAILED',
        requestId: req.requestId
      });
    }
  }

  /**
   * 🚦 Rate limiting middleware
   */
  async rateLimiting(req, res, next) {
    try {
      await this.rateLimiter.checkRateLimit(req);
      next();
    } catch (error) {
      this.stats.blockedRequests++;
      this.logger.warn('Request rate limited', {
        requestId: req.requestId,
        ip: req.ip,
        url: req.originalUrl
      });

      res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        requestId: req.requestId
      });
    }
  }

  /**
   * 🔍 Service discovery middleware
   */
  async serviceDiscoveryMiddleware(req, res, next) {
    // Update service endpoints dynamically
    await this.serviceDiscovery.refreshServices();
    next();
  }

  /**
   * 🎯 Build target URL for service
   */
  buildTargetUrl(req, service) {
    const baseUrl = service.baseUrl;
    const path = req.originalUrl;
    return `${baseUrl}${path}`;
  }

  /**
   * 📨 Forward headers to service
   */
  forwardHeaders(req) {
    const headers = { ...req.headers };
    
    // Remove hop-by-hop headers
    const hopByHopHeaders = [
      'connection', 'keep-alive', 'proxy-authenticate',
      'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade'
    ];

    hopByHopHeaders.forEach(header => {
      delete headers[header];
    });

    return headers;
  }

  /**
   * 🎭 Filter response headers
   */
  filterResponseHeaders(headers) {
    const filtered = {};
    const allowedHeaders = ['content-type', 'cache-control', 'etag', 'last-modified'];
    
    allowedHeaders.forEach(header => {
      if (headers.get(header)) {
        filtered[header] = headers.get(header);
      }
    });

    return filtered;
  }

  /**
   * 📊 Send success response
   */
  sendSuccessResponse(res, serviceResponse, responseTime, requestId) {
    // Set headers
    if (serviceResponse.headers) {
      Object.entries(serviceResponse.headers).forEach(([key, value]) => {
        res.set(key, value);
      });
    }

    // Set response time header
    res.set('x-response-time', `${responseTime.toFixed(2)}ms`);

    // Send response
    res.status(serviceResponse.status).json(serviceResponse.data);

    this.metrics.recordCounter('http_requests_total', 1, {
      status: serviceResponse.status,
      service: res.get('x-gateway-service')
    });
  }

  /**
   * 🚨 Handle route errors
   */
  handleRouteError(error, req, res, responseTime, serviceName) {
    this.logger.error('Route handling failed', {
      requestId: req.requestId,
      service: serviceName,
      error: error.message,
      responseTime: responseTime.toFixed(2)
    });

    if (error instanceof GatewayError) {
      res.status(error.statusCode || 500).json({
        error: error.message,
        code: error.code,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Internal gateway error',
        code: 'INTERNAL_GATEWAY_ERROR',
        requestId: req.requestId,
        timestamp: new Date().toISOString()
      });
    }

    this.metrics.recordCounter('http_requests_total', 1, {
      status: res.statusCode,
      service: serviceName,
      error: true
    });
  }

  /**
   * 404 Handler
   */
  handleNotFound(req, res) {
    this.logger.warn('Route not found', {
      method: req.method,
      url: req.originalUrl,
      requestId: req.requestId
    });

    res.status(404).json({
      error: 'Route not found',
      code: 'ROUTE_NOT_FOUND',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 🚨 Global error handler
   */
  handleError(error, req, res, next) {
    this.logger.error('Unhandled error in gateway', {
      requestId: req.requestId,
      error: error.message,
      stack: error.stack
    });

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 🩺 Perform health checks
   */
  async performHealthChecks() {
    for (const [serviceName, service] of this.services) {
      try {
        const healthy = await this.checkServiceHealth(service);
        this.healthStatus.set(serviceName, healthy);
        
        if (!healthy) {
          this.logger.warn('Service health check failed', { service: serviceName });
        }
      } catch (error) {
        this.healthStatus.set(serviceName, false);
        this.logger.error('Service health check error', {
          service: serviceName,
          error: error.message
        });
      }
    }
  }

  /**
   * 📈 Collect metrics
   */
  async collectMetrics() {
    const metrics = {
      gateway: {
        totalRequests: this.stats.totalRequests,
        successfulRequests: this.stats.successfulRequests,
        failedRequests: this.stats.failedRequests,
        activeConnections: this.stats.activeConnections
      },
      services: Object.fromEntries(this.stats.serviceCalls),
      timestamp: new Date().toISOString()
    };

    // Send to metrics collector
    this.metrics.recordGauge('gateway_active_connections', this.stats.activeConnections);
    this.metrics.recordGauge('gateway_total_requests', this.stats.totalRequests);

    this.emit('metricsCollected', metrics);
  }

  /**
   * 🔧 Get CORS origins
   */
  getCorsOrigins() {
    if (this.config.environment === 'production') {
      return [
        'https://mosaforge.com',
        'https://www.mosaforge.com',
        'https://app.mosaforge.com'
      ];
    }
    
    return ['http://localhost:3000', 'http://localhost:3001'];
  }

  /**
   * 📋 Get configuration summary
   */
  getConfigSummary() {
    return {
      port: this.config.port,
      environment: this.config.environment,
      services: this.services.size,
      routes: this.routes.size,
      features: {
        circuitBreaker: this.config.enableCircuitBreaker,
        rateLimiting: this.config.enableRateLimiting,
        serviceDiscovery: this.config.enableServiceDiscovery,
        security: this.config.enableSecurity
      }
    };
  }

  /**
   * 📈 Update service statistics
   */
  updateServiceStats(serviceName) {
    if (!this.stats.serviceCalls.has(serviceName)) {
      this.stats.serviceCalls.set(serviceName, { calls: 0, errors: 0 });
    }
    
    const stats = this.stats.serviceCalls.get(serviceName);
    stats.calls++;
  }

  /**
   * ❤️ Get health status
   */
  async getHealthStatus() {
    const issues = [];
    const servicesHealth = {};

    // Check Redis health
    if (!this.redis.isOpen) {
      issues.push('Redis connection unavailable');
    }

    // Check services health
    for (const [serviceName] of this.services) {
      const healthy = this.healthStatus.get(serviceName) || false;
      servicesHealth[serviceName] = healthy;
      
      if (!healthy) {
        issues.push(`Service ${serviceName} is unhealthy`);
      }
    }

    return {
      status: issues.length === 0 ? 'healthy' : 'unhealthy',
      issues,
      services: servicesHealth
    };
  }

  /**
   * 🩺 Check if service is healthy
   */
  async isServiceHealthy(serviceName) {
    return this.healthStatus.get(serviceName) || false;
  }

  /**
   * 🩺 Check service health
   */
  async checkServiceHealth(service) {
    try {
      const response = await fetch(service.healthCheck, {
        method: 'GET',
        timeout: 5000
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 🚦 Apply rate limiting
   */
  async applyRateLimiting(req, res, rateLimiter) {
    const key = `${req.ip}:${req.path}`;
    const allowed = await rateLimiter.consume(key);
    
    if (!allowed) {
      throw new GatewayError('RATE_LIMIT_EXCEEDED', {
        requestId: req.requestId,
        ip: req.ip
      });
    }
  }

  /**
   * 📨 Check if should forward body
   */
  shouldForwardBody(req) {
    return ['POST', 'PUT', 'PATCH'].includes(req.method) && req.body;
  }

  /**
   * ⏳ Wait for active connections
   */
  async waitForActiveConnections() {
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.stats.activeConnections > 0 && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.stats.activeConnections > 0) {
      this.logger.warn('Force closing remaining active connections', {
        activeConnections: this.stats.activeConnections
      });
    }
  }

  /**
   * 📊 Collect detailed metrics
   */
  async collectDetailedMetrics() {
    const serviceMetrics = {};
    
    for (const [serviceName, stats] of this.stats.serviceCalls) {
      serviceMetrics[serviceName] = {
        ...stats,
        errorRate: stats.calls > 0 ? (stats.errors / stats.calls) * 100 : 0
      };
    }

    return {
      gateway: { ...this.stats },
      services: serviceMetrics,
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };
  }
}

// 🏢 Enterprise-grade error handling
class GatewayError extends Error {
  constructor(code, context = {}) {
    super(code);
    this.name = 'GatewayError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Set appropriate status codes
    const statusCodes = {
      'SERVICE_UNAVAILABLE': 503,
      'SERVICE_NOT_FOUND': 404,
      'RATE_LIMIT_EXCEEDED': 429,
      'SECURITY_VALIDATION_FAILED': 403,
      'ROUTE_NOT_FOUND': 404,
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

module.exports = {
  GatewayController,
  GatewayError
};