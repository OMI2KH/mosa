/**
 * 🎯 MOSA FORGE: Enterprise Server Entry Point
 * 
 * @file server.js
 * @description Enterprise-grade microservices orchestration server
 * @version 2.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Microservices orchestration
 * - Load balancing & service discovery
 * - Health monitoring & circuit breaking
 * - Security middleware & rate limiting
 * - Performance optimization
 * - Graceful shutdown & zero-downtime deployment
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { createTerminus } = require('@godaddy/terminus');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const prometheus = require('prom-client');
const responseTime = require('response-time');

// 🏗️ Enterprise Configuration
const config = {
  environment: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  clusterEnabled: process.env.CLUSTER_ENABLED === 'true',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
  },
  security: {
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['https://mosaforge.com'],
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    slowDownWindow: parseInt(process.env.SLOW_DOWN_WINDOW) || 15 * 60 * 1000,
    slowDownDelayAfter: parseInt(process.env.SLOW_DOWN_DELAY_AFTER) || 50,
    slowDownDelayMs: parseInt(process.env.SLOW_DOWN_DELAY_MS) || 500
  },
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3002',
    expert: process.env.EXPERT_SERVICE_URL || 'http://localhost:3003',
    student: process.env.STUDENT_SERVICE_URL || 'http://localhost:3004',
    quality: process.env.QUALITY_SERVICE_URL || 'http://localhost:3005',
    learning: process.env.LEARNING_SERVICE_URL || 'http://localhost:3006',
    training: process.env.TRAINING_SERVICE_URL || 'http://localhost:3007',
    certification: process.env.CERTIFICATION_SERVICE_URL || 'http://localhost:3008',
    analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3009'
  }
};

/**
 * 🏗️ Enterprise Server Class
 * @class MosaForgeServer
 */
class MosaForgeServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.redis = null;
    this.prisma = null;
    this.metrics = this._initializeMetrics();
    this.serviceHealth = new Map();
    
    this._initializeServices();
    this._configureMiddleware();
    this._configureRoutes();
    this._configureErrorHandling();
    this._initializeServiceDiscovery();
  }

  /**
   * 🏗️ Initialize Prometheus Metrics
   * @private
   */
  _initializeMetrics() {
    const collectDefaultMetrics = prometheus.collectDefaultMetrics;
    collectDefaultMetrics({ timeout: 5000 });

    return {
      httpRequestDuration: new prometheus.Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.1, 0.5, 1, 2, 5]
      }),
      httpRequestsTotal: new prometheus.Counter({
        name: 'http_requests_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code']
      }),
      serviceHealth: new prometheus.Gauge({
        name: 'service_health_status',
        help: 'Health status of microservices (1 = healthy, 0 = unhealthy)',
        labelNames: ['service_name']
      }),
      activeConnections: new prometheus.Gauge({
        name: 'active_connections',
        help: 'Number of active connections'
      })
    };
  }

  /**
   * 🏗️ Initialize Enterprise Services
   * @private
   */
  _initializeServices() {
    try {
      // Initialize Redis with connection pooling
      this.redis = new Redis(config.redis);
      
      // Initialize Prisma with connection management
      this.prisma = new PrismaClient({
        log: config.environment === 'development' ? ['query', 'error', 'warn'] : ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });

      this._setupRedisEventHandlers();
      this._setupPrismaEventHandlers();

      console.log('🏗️ Enterprise services initialized successfully');
    } catch (error) {
      console.error('💥 Failed to initialize enterprise services:', error);
      process.exit(1);
    }
  }

  /**
   * 🏗️ Setup Redis Event Handlers
   * @private
   */
  _setupRedisEventHandlers() {
    this.redis.on('connect', () => {
      console.log('🔗 Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      console.error('💥 Redis connection error:', error);
    });

    this.redis.on('close', () => {
      console.warn('⚠️ Redis connection closed');
    });
  }

  /**
   * 🏗️ Setup Prisma Event Handlers
   * @private
   */
  _setupPrismaEventHandlers() {
    this.prisma.$on('query', (event) => {
      if (config.environment === 'development') {
        console.log(`📊 Database Query: ${event.query} | Duration: ${event.duration}ms`);
      }
    });

    this.prisma.$on('error', (error) => {
      console.error('💥 Database error:', error);
    });
  }

  /**
   * 🏗️ Configure Enterprise Middleware
   * @private
   */
  _configureMiddleware() {
    // 🛡️ Security Middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // 🌐 CORS Configuration
    this.app.use(cors({
      origin: config.security.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Trace-ID']
    }));

    // 📦 Compression
    this.app.use(compression({
      level: 6,
      threshold: 1024
    }));

    // 📊 Metrics Middleware
    this.app.use(responseTime((req, res, time) => {
      const route = req.route?.path || req.path;
      this.metrics.httpRequestDuration
        .labels(req.method, route, res.statusCode)
        .observe(time / 1000);
      
      this.metrics.httpRequestsTotal
        .labels(req.method, route, res.statusCode)
        .inc();
    }));

    // 🎯 Request Tracing
    this.app.use((req, res, next) => {
      req.id = uuidv4();
      req.startTime = Date.now();
      res.setHeader('X-Request-ID', req.id);
      next();
    });

    // 📝 Body Parsing
    this.app.use(express.json({
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));

    this.app.use(express.urlencoded({
      extended: true,
      limit: '10mb'
    }));

    // 🚦 Rate Limiting
    const rateLimiter = rateLimit({
      windowMs: config.security.rateLimitWindow,
      max: config.security.rateLimitMax,
      message: {
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: config.security.rateLimitWindow / 1000
      },
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.ip || req.headers['x-forwarded-for']
    });

    // 🐌 Slow Down
    const speedLimiter = slowDown({
      windowMs: config.security.slowDownWindow,
      delayAfter: config.security.slowDownDelayAfter,
      delayMs: config.security.slowDownDelayMs
    });

    // Apply rate limiting to all routes
    this.app.use(rateLimiter);
    this.app.use(speedLimiter);

    // 📊 Request Logging
    this.app.use((req, res, next) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        requestId: req.id,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type')
      };

      console.log(JSON.stringify(logEntry));
      next();
    });
  }

  /**
   * 🏗️ Configure Enterprise Routes
   * @private
   */
  _configureRoutes() {
    // 🏠 Health Check Endpoint
    this.app.get('/health', async (req, res) => {
      const health = await this._getHealthStatus();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    });

    // 📊 Metrics Endpoint (Prometheus)
    this.app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', prometheus.register.contentType);
        const metrics = await prometheus.register.metrics();
        res.end(metrics);
      } catch (error) {
        res.status(500).end(error);
      }
    });

    // 🎯 API Gateway Routes
    this.app.use('/api/v1/auth', this._createServiceProxy('auth'));
    this.app.use('/api/v1/payment', this._createServiceProxy('payment'));
    this.app.use('/api/v1/expert', this._createServiceProxy('expert'));
    this.app.use('/api/v1/student', this._createServiceProxy('student'));
    this.app.use('/api/v1/quality', this._createServiceProxy('quality'));
    this.app.use('/api/v1/learning', this._createServiceProxy('learning'));
    this.app.use('/api/v1/training', this._createServiceProxy('training'));
    this.app.use('/api/v1/certification', this._createServiceProxy('certification'));
    this.app.use('/api/v1/analytics', this._createServiceProxy('analytics'));

    // 🎯 Root Endpoint
    this.app.get('/', (req, res) => {
      res.json({
        message: '🚀 MOSA FORGE Enterprise API Gateway',
        version: '2.0.0',
        environment: config.environment,
        timestamp: new Date().toISOString(),
        services: Object.keys(config.services),
        documentation: 'https://docs.mosaforge.com'
      });
    });

    // 🔍 Service Discovery Endpoint
    this.app.get('/services', (req, res) => {
      const services = {};
      for (const [name, url] of Object.entries(config.services)) {
        services[name] = {
          url,
          health: this.serviceHealth.get(name) || 'unknown'
        };
      }
      res.json(services);
    });
  }

  /**
   * 🏗️ Create Service Proxy with Circuit Breaker
   * @private
   */
  _createServiceProxy(serviceName) {
    const { createProxyMiddleware } = require('http-proxy-middleware');
    
    return createProxyMiddleware({
      target: config.services[serviceName],
      changeOrigin: true,
      pathRewrite: {
        [`^/api/v1/${serviceName}`]: '/api/v1'
      },
      on: {
        proxyReq: (proxyReq, req, res) => {
          // Add tracing headers
          proxyReq.setHeader('X-Request-ID', req.id);
          proxyReq.setHeader('X-Trace-ID', req.id);
          proxyReq.setHeader('X-Forwarded-For', req.ip);
          
          console.log(`🔀 Proxying ${req.method} ${req.url} to ${serviceName} service`);
        },
        proxyRes: (proxyRes, req, res) => {
          // Update service health on successful response
          if (proxyRes.statusCode < 500) {
            this.serviceHealth.set(serviceName, 'healthy');
            this.metrics.serviceHealth.labels(serviceName).set(1);
          }
        },
        error: (err, req, res) => {
          console.error(`💥 ${serviceName} service error:`, err.message);
          this.serviceHealth.set(serviceName, 'unhealthy');
          this.metrics.serviceHealth.labels(serviceName).set(0);
          
          res.status(503).json({
            error: 'Service temporarily unavailable',
            service: serviceName,
            requestId: req.id,
            timestamp: new Date().toISOString()
          });
        }
      },
      timeout: 30000,
      retries: 3
    });
  }

  /**
   * 🏗️ Configure Enterprise Error Handling
   * @private
   */
  _configureErrorHandling() {
    // 404 Handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        requestId: req.id,
        timestamp: new Date().toISOString()
      });
    });

    // 🎯 Global Error Handler
    this.app.use((error, req, res, next) => {
      const errorId = uuidv4();
      
      console.error('💥 Global error handler:', {
        errorId,
        requestId: req.id,
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
      });

      // Determine status code
      const statusCode = error.statusCode || error.status || 500;

      // Security: Don't leak error details in production
      const response = {
        error: statusCode >= 500 ? 'Internal Server Error' : error.message,
        requestId: req.id,
        errorId: statusCode >= 500 ? errorId : undefined,
        timestamp: new Date().toISOString()
      };

      res.status(statusCode).json(response);
    });
  }

  /**
   * 🏗️ Initialize Service Discovery
   * @private
   */
  _initializeServiceDiscovery() {
    // Periodically check service health
    setInterval(() => {
      this._checkAllServicesHealth();
    }, 30000); // Every 30 seconds

    // Initial health check
    setTimeout(() => {
      this._checkAllServicesHealth();
    }, 5000);
  }

  /**
   * 🏗️ Check All Services Health
   * @private
   */
  async _checkAllServicesHealth() {
    const axios = require('axios');
    
    for (const [serviceName, serviceUrl] of Object.entries(config.services)) {
      try {
        const response = await axios.get(`${serviceUrl}/health`, { timeout: 5000 });
        this.serviceHealth.set(serviceName, response.data.status);
        this.metrics.serviceHealth.labels(serviceName).set(1);
      } catch (error) {
        console.warn(`⚠️ ${serviceName} service health check failed:`, error.message);
        this.serviceHealth.set(serviceName, 'unhealthy');
        this.metrics.serviceHealth.labels(serviceName).set(0);
      }
    }
  }

  /**
   * 🏗️ Get Comprehensive Health Status
   * @private
   */
  async _getHealthStatus() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.environment,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      dependencies: {}
    };

    // Check Redis
    try {
      await this.redis.ping();
      health.dependencies.redis = 'healthy';
    } catch (error) {
      health.dependencies.redis = 'unhealthy';
      health.status = 'degraded';
    }

    // Check Database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      health.dependencies.database = 'healthy';
    } catch (error) {
      health.dependencies.database = 'unhealthy';
      health.status = 'degraded';
    }

    // Check Services
    health.services = {};
    for (const [serviceName, status] of this.serviceHealth.entries()) {
      health.services[serviceName] = status;
      if (status !== 'healthy') {
        health.status = 'degraded';
      }
    }

    return health;
  }

  /**
   * 🏗️ Start Enterprise Server
   */
  async start() {
    try {
      // Verify database connection
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');

      // Verify Redis connection
      await this.redis.ping();
      console.log('✅ Redis connected successfully');

      // Create HTTP server
      this.server = this.app.listen(config.port, () => {
        console.log(`
🚀 MOSA FORGE ENTERPRISE SERVER
📍 Port: ${config.port}
🌍 Environment: ${config.environment}
🕒 Started: ${new Date().toISOString()}
📊 Metrics: http://localhost:${config.port}/metrics
❤️ Health: http://localhost:${config.port}/health
🔍 Services: http://localhost:${config.port}/services

🎯 MICROSERVICES ORCHESTRATION READY
        `);
      });

      // Configure graceful shutdown
      this._configureGracefulShutdown();

      // Start service health monitoring
      this._initializeServiceDiscovery();

      return this.server;
    } catch (error) {
      console.error('💥 Failed to start server:', error);
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * 🏗️ Configure Graceful Shutdown
   * @private
   */
  _configureGracefulShutdown() {
    createTerminus(this.server, {
      signals: ['SIGTERM', 'SIGINT', 'SIGHUP'],
      timeout: 30000,
      healthChecks: {
        '/health': async () => {
          const health = await this._getHealthStatus();
          if (health.status !== 'healthy') {
            throw new Error('Service unhealthy');
          }
        }
      },
      onSignal: async () => {
        console.log('🛑 Received shutdown signal, starting graceful shutdown...');
        await this.shutdown();
      },
      onShutdown: async () => {
        console.log('✅ Graceful shutdown completed');
      },
      onSendFailureDuringShutdown: async () => {
        console.log('💥 Failed to send response during shutdown');
      }
    });
  }

  /**
   * 🏗️ Graceful Shutdown Procedure
   */
  async shutdown() {
    console.log('🛑 Initiating graceful shutdown...');

    try {
      // Close HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close((err) => {
            if (err) {
              console.error('💥 Error closing server:', err);
            }
            resolve();
          });
        });
        console.log('✅ HTTP server closed');
      }

      // Close Redis connection
      if (this.redis) {
        await this.redis.quit();
        console.log('✅ Redis connection closed');
      }

      // Close Database connection
      if (this.prisma) {
        await this.prisma.$disconnect();
        console.log('✅ Database connection closed');
      }

      console.log('🎯 All connections closed gracefully');
    } catch (error) {
      console.error('💥 Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * 🏗️ Get Server Instance
   */
  getInstance() {
    return this.app;
  }
}

/**
 * 🏗️ Enterprise Server Bootstrap
 */
async function bootstrap() {
  try {
    const server = new MosaForgeServer();
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    // Start the server
    await server.start();

    return server;
  } catch (error) {
    console.error('💥 Failed to bootstrap server:', error);
    process.exit(1);
  }
}

// 🏗️ Start server if this file is run directly
if (require.main === module) {
  bootstrap().catch((error) => {
    console.error('💥 Critical bootstrap failure:', error);
    process.exit(1);
  });
}

// 🏗️ Enterprise Export
module.exports = {
  MosaForgeServer,
  bootstrap,
  config
};