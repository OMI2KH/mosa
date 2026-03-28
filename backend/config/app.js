// config/app.js

/**
 * 🎯 ENTERPRISE APPLICATION CONFIGURATION
 * Production-ready app configuration for Mosa Forge
 * Features: Microservices config, security, monitoring, scaling
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const Redis = require('ioredis');
const { Logger } = require('../utils/logger');
const { Monitoring } = require('../utils/monitoring');
const { Security } = require('../utils/security');

class AppConfig extends EventEmitter {
  constructor() {
    super();
    this.logger = new Logger('AppConfig');
    this.monitoring = new Monitoring();
    this.security = new Security();
    
    this.environment = process.env.NODE_ENV || 'development';
    this.isProduction = this.environment === 'production';
    this.isStaging = this.environment === 'staging';
    this.isDevelopment = this.environment === 'development';
    
    this.config = {};
    this.redis = null;
    this.healthCheckInterval = null;
    
    this.initialize();
  }

  /**
   * 🚀 INITIALIZE APPLICATION CONFIGURATION
   */
  async initialize() {
    try {
      this.logger.info(`Initializing Mosa Forge Enterprise - Environment: ${this.environment}`);
      
      // Load configuration based on environment
      await this.loadEnvironmentConfig();
      
      // Initialize Redis for caching and sessions
      await this.initializeRedis();
      
      // Initialize security configurations
      await this.initializeSecurity();
      
      // Start health monitoring
      await this.startHealthMonitoring();
      
      // Validate critical configuration
      await this.validateConfiguration();
      
      this.logger.info('Application configuration initialized successfully');
      this.emit('configReady', this.config);
      
    } catch (error) {
      this.logger.error('Failed to initialize application configuration', error);
      throw error;
    }
  }

  /**
   * 📋 LOAD ENVIRONMENT-SPECIFIC CONFIGURATION
   */
  async loadEnvironmentConfig() {
    const baseConfig = {
      // 🏗️ PLATFORM CONFIGURATION
      platform: {
        name: 'Mosa Forge Enterprise',
        version: '1.0.0',
        founder: 'Oumer Muktar',
        poweredBy: 'Chereka',
        environment: this.environment,
        launchDate: '2024-10-01'
      },

      // 💰 PAYMENT CONFIGURATION
      payment: {
        bundlePrice: 1999, // ETB
        revenueSplit: {
          mosa: 1000, // 50.03%
          expert: 999  // 49.97%
        },
        payoutSchedule: [333, 333, 333], // 3-part payout
        qualityBonuses: {
          master: 0.20, // +20%
          senior: 0.10, // +10%
          standard: 0.00,
          developing: -0.10, // -10%
          probation: -0.20 // -20%
        },
        paymentGateways: {
          telebirr: {
            enabled: true,
            apiKey: process.env.TELEBIRR_API_KEY,
            secret: process.env.TELEBIRR_SECRET,
            baseUrl: process.env.TELEBIRR_BASE_URL
          },
          cbebirr: {
            enabled: true,
            apiKey: process.env.CBEBIRR_API_KEY,
            secret: process.env.CBEBIRR_SECRET,
            baseUrl: process.env.CBEBIRR_BASE_URL
          }
        },
        refundPolicy: {
          coolingPeriod: 7, // days
          proratedRefunds: true,
          autoApproval: true
        }
      },

      // 🛡️ QUALITY GUARANTEE CONFIGURATION
      quality: {
        thresholds: {
          master: 4.7,
          senior: 4.3,
          standard: 4.0,
          developing: 3.5,
          probation: 3.0
        },
        metrics: {
          completionRate: 0.70, // 70% minimum
          responseTime: 24, // hours
          studentSatisfaction: 0.80, // 80% minimum
          weeklyProgress: 0.05 // 5% minimum
        },
        enforcement: {
          autoPause: true,
          tierAdjustment: true,
          studentProtection: true,
          expertSwitching: true
        },
        monitoring: {
          realTime: true,
          alerts: true,
          dashboard: true,
          reports: true
        }
      },

      // 🎓 LEARNING ENGINE CONFIGURATION
      learning: {
        phases: {
          mindset: {
            duration: 30, // days
            free: true,
            required: true
          },
          theory: {
            duration: 60, // days
            interactive: true,
            exercisesPerSkill: 100
          },
          handsOn: {
            duration: 60, // days
            sessionsPerWeek: 3,
            studentsPerSession: 5
          }
        },
        duolingoEngine: {
          exerciseTypes: ['multiple-choice', 'scenario', 'matching', 'fill-blank'],
          adaptiveLearning: true,
          progressTracking: true,
          realTimeCharts: true
        },
        completion: {
          minimumProgress: 0.80, // 80% completion required
          finalAssessment: true,
          certificateIssuance: true
        }
      },

      // 👨‍🏫 EXPERT NETWORK CONFIGURATION
      expert: {
        requirements: {
          faydaVerification: true,
          portfolioValidation: true,
          skillCertification: true,
          qualityCommitment: true
        },
        tiers: {
          master: {
            studentLimit: null, // Unlimited
            bonusMultiplier: 1.20,
            requirements: {
              rating: 4.7,
              completionRate: 0.80,
              minStudents: 50
            }
          },
          senior: {
            studentLimit: 100,
            bonusMultiplier: 1.10,
            requirements: {
              rating: 4.3,
              completionRate: 0.75,
              minStudents: 25
            }
          },
          standard: {
            studentLimit: 50,
            bonusMultiplier: 1.00,
            requirements: {
              rating: 4.0,
              completionRate: 0.70,
              minStudents: 10
            }
          }
        },
        payout: {
          schedule: [0.333, 0.333, 0.334], // 33.3% each phase
          processingDays: 3,
          autoDistribution: true
        }
      },

      // 🔐 SECURITY CONFIGURATION
      security: {
        authentication: {
          faydaIntegration: {
            enabled: true,
            baseUrl: process.env.FAYDA_API_URL,
            apiKey: process.env.FAYDA_API_KEY
          },
          jwt: {
            secret: process.env.JWT_SECRET,
            expiresIn: '7d',
            refreshExpiresIn: '30d'
          },
          otp: {
            length: 6,
            expiresIn: 300, // 5 minutes
            maxAttempts: 3
          }
        },
        dataProtection: {
          encryption: {
            algorithm: 'aes-256-gcm',
            key: process.env.ENCRYPTION_KEY
          },
          masking: {
            faydaId: true,
            phone: true,
            email: true
          },
          compliance: {
            gdpr: true,
            ethiopianDataProtection: true
          }
        },
        rateLimiting: {
          general: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // requests per window
          },
          auth: {
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 5 // login attempts
          },
          payment: {
            windowMs: 60 * 1000, // 1 minute
            max: 10 // payment attempts
          }
        }
      },

      // 🗃️ DATABASE CONFIGURATION
      database: {
        postgresql: {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME || 'mosa_forge',
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          pool: {
            max: 20,
            min: 5,
            acquire: 30000,
            idle: 10000
          },
          ssl: this.isProduction
        },
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD,
          db: 0
        }
      },

      // 🌐 MICROSERVICES CONFIGURATION
      microservices: {
        apiGateway: {
          port: parseInt(process.env.API_GATEWAY_PORT) || 3000,
          rateLimit: 1000,
          timeout: 30000
        },
        authService: {
          port: parseInt(process.env.AUTH_SERVICE_PORT) || 3001,
          healthCheck: '/health'
        },
        paymentService: {
          port: parseInt(process.env.PAYMENT_SERVICE_PORT) || 3002,
          healthCheck: '/health'
        },
        expertService: {
          port: parseInt(process.env.EXPERT_SERVICE_PORT) || 3003,
          healthCheck: '/health'
        },
        studentService: {
          port: parseInt(process.env.STUDENT_SERVICE_PORT) || 3004,
          healthCheck: '/health'
        },
        qualityService: {
          port: parseInt(process.env.QUALITY_SERVICE_PORT) || 3005,
          healthCheck: '/health'
        },
        learningService: {
          port: parseInt(process.env.LEARNING_SERVICE_PORT) || 3006,
          healthCheck: '/health'
        },
        trainingService: {
          port: parseInt(process.env.TRAINING_SERVICE_PORT) || 3007,
          healthCheck: '/health'
        },
        certificationService: {
          port: parseInt(process.env.CERTIFICATION_SERVICE_PORT) || 3008,
          healthCheck: '/health'
        },
        analyticsService: {
          port: parseInt(process.env.ANALYTICS_SERVICE_PORT) || 3009,
          healthCheck: '/health'
        }
      },

      // 📊 MONITORING & ANALYTICS
      monitoring: {
        healthChecks: {
          interval: 30000, // 30 seconds
          timeout: 5000
        },
        metrics: {
          enabled: true,
          port: parseInt(process.env.METRICS_PORT) || 9090,
          path: '/metrics'
        },
        logging: {
          level: this.isProduction ? 'info' : 'debug',
          file: this.isProduction ? '/var/log/mosa-forge/app.log' : './logs/app.log',
          maxFiles: '10',
          maxSize: '10m'
        },
        alerts: {
          slack: {
            enabled: true,
            webhook: process.env.SLACK_WEBHOOK_URL
          },
          email: {
            enabled: true,
            recipients: process.env.ALERT_EMAILS?.split(',') || []
          }
        }
      },

      // 🚀 SCALING CONFIGURATION
      scaling: {
        autoScaling: {
          enabled: true,
          minInstances: 2,
          maxInstances: 10,
          cpuThreshold: 80,
          memoryThreshold: 85
        },
        loadBalancing: {
          strategy: 'round-robin',
          healthCheck: true,
          stickySessions: true
        },
        caching: {
          redis: {
            enabled: true,
            ttl: 3600, // 1 hour
            maxMemory: '1gb'
          },
          cdn: {
            enabled: true,
            domains: process.env.CDN_DOMAINS?.split(',') || []
          }
        }
      },

      // 🔧 THIRD-PARTY INTEGRATIONS
      integrations: {
        yachi: {
          enabled: true,
          apiUrl: process.env.YACHI_API_URL,
          apiKey: process.env.YACHI_API_KEY,
          autoVerification: true
        },
        sms: {
          provider: 'twilio',
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          fromNumber: process.env.TWILIO_FROM_NUMBER
        },
        email: {
          provider: 'sendgrid',
          apiKey: process.env.SENDGRID_API_KEY,
          fromEmail: process.env.FROM_EMAIL
        }
      }
    };

    // Apply environment-specific overrides
    const environmentConfig = await this.loadEnvironmentOverrides();
    this.config = this.deepMerge(baseConfig, environmentConfig);
    
    this.logger.debug('Configuration loaded successfully');
  }

  /**
   * 🎯 LOAD ENVIRONMENT-SPECIFIC OVERRIDES
   */
  async loadEnvironmentOverrides() {
    const overrides = {
      development: {
        database: {
          postgresql: {
            pool: { max: 10, min: 2 }
          }
        },
        monitoring: {
          logging: { level: 'debug' }
        },
        security: {
          rateLimiting: {
            general: { max: 1000 }, // More lenient in development
            auth: { max: 10 }
          }
        }
      },
      staging: {
        payment: {
          paymentGateways: {
            telebirr: { enabled: false }, // Use sandbox in staging
            cbebirr: { enabled: false }
          }
        },
        security: {
          authentication: {
            faydaIntegration: { enabled: false } // Mock in staging
          }
        }
      },
      production: {
        security: {
          rateLimiting: {
            general: { max: 100 },
            auth: { max: 5 },
            payment: { max: 10 }
          }
        },
        monitoring: {
          alerts: {
            enabled: true,
            criticalOnly: false
          }
        },
        scaling: {
          autoScaling: {
            enabled: true,
            minInstances: 3,
            maxInstances: 20
          }
        }
      }
    };

    return overrides[this.environment] || {};
  }

  /**
   * 🔄 INITIALIZE REDIS CONNECTION
   */
  async initializeRedis() {
    try {
      const redisConfig = this.config.database.redis;
      
      this.redis = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        autoResubscribe: true,
        lazyConnect: true
      });

      // Event handlers for Redis
      this.redis.on('connect', () => {
        this.logger.info('Redis connected successfully');
      });

      this.redis.on('error', (error) => {
        this.logger.error('Redis connection error', error);
      });

      this.redis.on('close', () => {
        this.logger.warn('Redis connection closed');
      });

      await this.redis.connect();
      
      // Test Redis connection
      await this.redis.ping();
      this.logger.info('Redis connection test passed');
      
    } catch (error) {
      this.logger.error('Failed to initialize Redis', error);
      throw error;
    }
  }

  /**
   * 🛡️ INITIALIZE SECURITY CONFIGURATIONS
   */
  async initializeSecurity() {
    try {
      // Initialize security middleware configurations
      this.securityConfig = {
        helmet: this.getHelmetConfig(),
        cors: this.getCorsConfig(),
        rateLimit: this.getRateLimitConfig(),
        slowDown: this.getSlowDownConfig()
      };

      this.logger.info('Security configurations initialized');
      
    } catch (error) {
      this.logger.error('Failed to initialize security configurations', error);
      throw error;
    }
  }

  /**
   * 🛡️ GET HELMET SECURITY CONFIG
   */
  getHelmetConfig() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    });
  }

  /**
   * 🌐 GET CORS CONFIGURATION
   */
  getCorsConfig() {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    return cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
          const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
          return callback(new Error(msg), false);
        }
        
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Fayda-ID',
        'X-Device-ID'
      ],
      maxAge: 86400 // 24 hours
    });
  }

  /**
   * 🚦 GET RATE LIMIT CONFIG
   */
  getRateLimitConfig() {
    const generalLimit = rateLimit({
      windowMs: this.config.security.rateLimiting.general.windowMs,
      max: this.config.security.rateLimiting.general.max,
      message: {
        error: 'Too many requests',
        message: 'Please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    const authLimit = rateLimit({
      windowMs: this.config.security.rateLimiting.auth.windowMs,
      max: this.config.security.rateLimiting.auth.max,
      message: {
        error: 'Too many authentication attempts',
        message: 'Please try again in an hour.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });

    return { generalLimit, authLimit };
  }

  /**
   * 🐌 GET SLOW DOWN CONFIG
   */
  getSlowDownConfig() {
    return slowDown({
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50, // allow 50 requests per 15 minutes
      delayMs: 100 // begin adding 100ms of delay per request above 50
    });
  }

  /**
   * 📊 START HEALTH MONITORING
   */
  async startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        this.logger.error('Health check failed', error);
      }
    }, this.config.monitoring.healthChecks.interval);

    this.logger.info('Health monitoring started');
  }

  /**
   * ❤️ PERFORM COMPREHENSIVE HEALTH CHECKS
   */
  async performHealthChecks() {
    const healthStatus = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      services: {}
    };

    // Check Redis
    try {
      await this.redis.ping();
      healthStatus.services.redis = 'healthy';
    } catch (error) {
      healthStatus.services.redis = 'unhealthy';
      this.logger.error('Redis health check failed', error);
    }

    // Check Database (simplified - would require DB connection)
    healthStatus.services.database = 'healthy'; // Assuming healthy

    // Check Microservices (would require actual HTTP checks)
    healthStatus.services.microservices = await this.checkMicroservicesHealth();

    // Emit health status
    this.emit('healthStatus', healthStatus);

    // Log if any service is unhealthy
    const unhealthyServices = Object.entries(healthStatus.services)
      .filter(([_, status]) => status === 'unhealthy')
      .map(([service]) => service);

    if (unhealthyServices.length > 0) {
      this.logger.warn(`Unhealthy services detected: ${unhealthyServices.join(', ')}`);
    }

    return healthStatus;
  }

  /**
   * 🔍 CHECK MICROSERVICES HEALTH
   */
  async checkMicroservicesHealth() {
    const services = this.config.microservices;
    const healthStatus = {};

    // This would be implemented with actual HTTP health checks
    // For now, returning mock status
    for (const [serviceName, config] of Object.entries(services)) {
      healthStatus[serviceName] = 'healthy'; // Mock status
    }

    return healthStatus;
  }

  /**
   * ✅ VALIDATE CRITICAL CONFIGURATION
   */
  async validateConfiguration() {
    const requiredEnvVars = [
      'JWT_SECRET',
      'DB_HOST',
      'DB_NAME',
      'DB_USERNAME',
      'DB_PASSWORD'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate payment configuration
    if (this.config.payment.bundlePrice !== 1999) {
      throw new Error('Invalid bundle price configuration');
    }

    // Validate revenue split
    const { mosa, expert } = this.config.payment.revenueSplit;
    if (mosa + expert !== 1999) {
      throw new Error('Invalid revenue split configuration');
    }

    this.logger.info('Configuration validation passed');
  }

  /**
   * 🔧 GET EXPRESS MIDDLEWARE CONFIG
   */
  getMiddlewareConfig() {
    return {
      security: this.securityConfig,
      compression: compression({
        level: 6,
        threshold: 1024,
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        }
      }),
      bodyParser: {
        json: { limit: '10mb' },
        urlencoded: { extended: true, limit: '10mb' }
      }
    };
  }

  /**
   * 📱 GET CLIENT-SIDE CONFIG
   */
  getClientConfig() {
    return {
      platform: this.config.platform,
      payment: {
        bundlePrice: this.config.payment.bundlePrice,
        revenueSplit: this.config.payment.revenueSplit
      },
      quality: {
        thresholds: this.config.quality.thresholds
      },
      features: {
        duolingoStyle: this.config.learning.duolingoEngine.enabled,
        realTimeCharts: this.config.learning.duolingoEngine.realTimeCharts,
        expertSwitching: this.config.quality.enforcement.expertSwitching
      }
    };
  }

  /**
   * 🔄 DEEP MERGE OBJECTS
   */
  deepMerge(target, source) {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }

  /**
   * 🏷️ CHECK IF VALUE IS OBJECT
   */
  isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * 🎯 GET CONFIGURATION BY PATH
   */
  get(path, defaultValue = null) {
    return path.split('.').reduce((obj, key) => {
      return obj && obj[key] !== undefined ? obj[key] : defaultValue;
    }, this.config);
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      if (this.redis) {
        await this.redis.quit();
      }

      this.removeAllListeners();
      this.logger.info('Application configuration cleaned up');
      
    } catch (error) {
      this.logger.error('Error during configuration cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new AppConfig();