/**
 * 🎯 MOSA FORGE: Enterprise Staging Environment Configuration
 * 
 * @module StagingEnvironment
 * @description Staging environment configuration for testing and validation
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Complete staging environment setup
 * - Integration testing configurations
 * - Performance testing parameters
 * - Security and access controls
 * - Monitoring and debugging tools
 */

const { v4: uuidv4 } = require('uuid');

/**
 * 🏗️ Enterprise Staging Configuration
 * @constant {Object} stagingConfig
 */
const stagingConfig = {
  // 🎯 ENVIRONMENT IDENTIFICATION
  environment: {
    name: 'staging',
    version: '1.0.0',
    release: `staging-${uuidv4().slice(0, 8)}`,
    deployment: {
      region: 'eu-central-1',
      cluster: 'mosa-forge-staging',
      namespace: 'mosa-staging'
    }
  },

  // 🔐 AUTHENTICATION & SECURITY
  auth: {
    // Fayda ID Integration (Staging)
    fayda: {
      baseUrl: 'https://staging-fayda-api.et.gov.et/v1',
      apiKey: process.env.STAGING_FAYDA_API_KEY || 'staging-test-key-2024',
      timeout: 10000,
      retryAttempts: 3,
      validation: {
        strictMode: false, // Allow test IDs in staging
        testIds: ['1234567890123', '9876543210987'] // Test Fayda IDs
      }
    },

    // JWT Configuration
    jwt: {
      secret: process.env.STAGING_JWT_SECRET || 'staging-super-secret-jwt-key-2024-mosa-forge',
      issuer: 'mosa-forge-staging',
      audience: 'mosa-staging-client',
      accessTokenExpiry: '24h', // Extended for testing
      refreshTokenExpiry: '7d'
    },

    // OTP Configuration
    otp: {
      length: 6,
      expiry: 600, // 10 minutes
      provider: 'twilio', // Use Twilio for staging SMS
      testNumbers: ['+251911223344', '+251922334455'] // Test numbers
    }
  },

  // 💰 PAYMENT CONFIGURATION
  payment: {
    // Revenue Distribution (Staging)
    revenueSplit: {
      mosa: 1000,
      expert: 999,
      currency: 'ETB'
    },

    // Payout Schedule
    payoutSchedule: {
      upfront: 333,
      milestone: 333,
      completion: 333,
      currency: 'ETB'
    },

    // Payment Gateways (Staging)
    gateways: {
      telebirr: {
        baseUrl: 'https://staging-telebirr.ethiotelecom.et/api',
        merchantId: process.env.STAGING_TELEBIRR_MERCHANT_ID || 'staging-merchant-001',
        apiKey: process.env.STAGING_TELEBIRR_API_KEY || 'staging-telebirr-test-key',
        callbackUrl: 'https://staging-api.mosaforge.com/payments/telebirr/callback',
        timeout: 30000
      },
      cbebirr: {
        baseUrl: 'https://staging-cbebirr.cbe.com.et/api',
        merchantCode: process.env.STAGING_CBEBIRR_MERCHANT_CODE || 'STAGING_CBE_001',
        apiSecret: process.env.STAGING_CBEBIRR_SECRET || 'staging-cbe-test-secret',
        callbackUrl: 'https://staging-api.mosaforge.com/payments/cbebirr/callback'
      }
    },

    // Bundle Pricing
    bundles: {
      standard: {
        price: 1999,
        currency: 'ETB',
        description: 'Staging Training Bundle - Full Access',
        validity: 120 // days
      }
    },

    // Test Payment Data
    testing: {
      allowedTestCards: [
        '4111111111111111', // Visa test
        '5555555555554444'  // Mastercard test
      ],
      testAmounts: [1999, 1000, 500],
      bypassAuthentication: true // For testing only
    }
  },

  // 🎯 QUALITY GUARANTEE SYSTEM
  quality: {
    // Quality Thresholds (Staging - Slightly relaxed)
    thresholds: {
      minimumRating: 3.5, // Lower for testing
      completionRate: 0.65, // 65% minimum
      responseTime: 36, // hours - extended for testing
      studentSatisfaction: 0.75 // 75% minimum
    },

    // Expert Tiers (Staging)
    tiers: {
      master: {
        minRating: 4.5,
        minCompletion: 0.75,
        maxStudents: 15, // Lower for staging
        bonusMultiplier: 1.2
      },
      senior: {
        minRating: 4.0,
        minCompletion: 0.70,
        maxStudents: 10,
        bonusMultiplier: 1.1
      },
      standard: {
        minRating: 3.5,
        minCompletion: 0.65,
        maxStudents: 8,
        bonusMultiplier: 1.0
      }
    },

    // Auto-Enforcement
    autoEnforcement: {
      enabled: true,
      checkInterval: 300000, // 5 minutes
      gracePeriod: 86400000 // 24 hours
    }
  },

  // 📚 LEARNING ENGINE CONFIGURATION
  learning: {
    // Duolingo-style Engine
    exerciseEngine: {
      batchSize: 50,
      timeout: 30000,
      retryAttempts: 2
    },

    // Phase Durations (Staging - Shorter for testing)
    phases: {
      mindset: {
        duration: 7, // 1 week for testing
        exercisesPerWeek: 5
      },
      theory: {
        duration: 15, // 15 days for testing
        exercisesTotal: 20
      },
      handsOn: {
        duration: 15, // 15 days for testing
        sessionsPerWeek: 2
      },
      certification: {
        duration: 5, // 5 days for testing
        assessmentExercises: 5
      }
    },

    // Progress Tracking
    progress: {
      updateInterval: 60000, // 1 minute
      batchProcessing: true,
      realTimeUpdates: true
    }
  },

  // 🗃️ DATABASE CONFIGURATION
  database: {
    postgresql: {
      host: process.env.STAGING_DB_HOST || 'staging-db.mosaforge.com',
      port: process.env.STAGING_DB_PORT || 5432,
      database: process.env.STAGING_DB_NAME || 'mosa_forge_staging',
      username: process.env.STAGING_DB_USER || 'mosa_staging_user',
      password: process.env.STAGING_DB_PASSWORD || 'staging-secure-password-2024',
      ssl: {
        rejectUnauthorized: false,
        ca: process.env.STAGING_DB_SSL_CA
      },
      pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000
      },
      logging: process.env.STAGING_DB_LOGGING === 'true' // SQL query logging
    },

    redis: {
      host: process.env.STAGING_REDIS_HOST || 'staging-redis.mosaforge.com',
      port: process.env.STAGING_REDIS_PORT || 6379,
      password: process.env.STAGING_REDIS_PASSWORD || 'staging-redis-pass-2024',
      db: 1, // Separate DB for staging
      keyPrefix: 'staging:',
      ttl: {
        session: 86400, // 24 hours
        cache: 3600, // 1 hour
        rateLimit: 900 // 15 minutes
      }
    }
  },

  // 🔧 MICROSERVICES CONFIGURATION
  services: {
    // Service Discovery
    discovery: {
      registry: 'consul://staging-consul.mosaforge.com:8500',
      healthCheck: '/health',
      checkInterval: 30000
    },

    // API Gateway
    gateway: {
      url: 'https://staging-api.mosaforge.com',
      timeout: 30000,
      rateLimit: {
        windowMs: 900000, // 15 minutes
        max: 500 // Increased for testing
      }
    },

    // Individual Services
    authService: {
      url: 'http://auth-service.staging.svc.cluster.local:3001',
      timeout: 15000
    },
    paymentService: {
      url: 'http://payment-service.staging.svc.cluster.local:3002',
      timeout: 25000
    },
    expertService: {
      url: 'http://expert-service.staging.svc.cluster.local:3003',
      timeout: 20000
    },
    studentService: {
      url: 'http://student-service.staging.svc.cluster.local:3004',
      timeout: 20000
    },
    qualityService: {
      url: 'http://quality-service.staging.svc.cluster.local:3005',
      timeout: 20000
    },
    learningService: {
      url: 'http://learning-service.staging.svc.cluster.local:3006',
      timeout: 25000
    }
  },

  // 📊 MONITORING & OBSERVABILITY
  monitoring: {
    // Application Performance Monitoring
    apm: {
      enabled: true,
      provider: 'elastic-apm-node',
      serverUrl: 'https://staging-apm.mosaforge.com',
      secretToken: process.env.STAGING_APM_SECRET,
      environment: 'staging'
    },

    // Logging Configuration
    logging: {
      level: 'debug', // More verbose in staging
      transports: ['console', 'file', 'elasticsearch'],
      elasticsearch: {
        node: 'https://staging-logs.mosaforge.com:9200',
        index: 'mosa-staging-logs'
      },
      file: {
        path: '/var/log/mosa-forge/staging',
        maxSize: '100m',
        maxFiles: '10'
      }
    },

    // Metrics Collection
    metrics: {
      enabled: true,
      port: 9090,
      path: '/metrics',
      collectDefaultMetrics: true,
      timeout: 5000
    },

    // Health Checks
    health: {
      endpoint: '/health',
      checkInterval: 30000,
      timeout: 5000
    }
  },

  // 🧪 TESTING CONFIGURATION
  testing: {
    // Integration Testing
    integration: {
      enabled: true,
      baseUrl: 'https://staging-api.mosaforge.com',
      apiKey: process.env.STAGING_TEST_API_KEY || 'staging-test-key-2024',
      timeout: 30000
    },

    // Performance Testing
    performance: {
      enabled: true,
      concurrentUsers: 50,
      rampUpTime: 60,
      testDuration: 300
    },

    // Load Testing
    load: {
      enabled: true,
      maxUsers: 100,
      spawnRate: 10,
      runTime: 600
    },

    // Test Data Management
    testData: {
      autoCleanup: true,
      cleanupInterval: 86400000, // 24 hours
      preserveTestUsers: ['test-admin', 'qa-user']
    }
  },

  // 🔐 SECURITY CONFIGURATION
  security: {
    // CORS Configuration
    cors: {
      origin: [
        'https://staging.mosaforge.com',
        'https://staging-app.mosaforge.com',
        'http://localhost:3000',
        'http://localhost:3001'
      ],
      credentials: true,
      maxAge: 86400
    },

    // Rate Limiting
    rateLimit: {
      auth: {
        windowMs: 900000, // 15 minutes
        max: 10 // Login attempts
      },
      api: {
        windowMs: 900000, // 15 minutes
        max: 500 // General API requests
      },
      payment: {
        windowMs: 3600000, // 1 hour
        max: 50 // Payment requests
      }
    },

    // Headers Security
    headers: {
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      csp: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://staging-analytics.mosaforge.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://staging-cdn.mosaforge.com"]
      }
    }
  },

  // 📧 NOTIFICATIONS & COMMUNICATIONS
  notifications: {
    // Email Configuration
    email: {
      provider: 'sendgrid',
      apiKey: process.env.STAGING_SENDGRID_API_KEY || 'staging-sendgrid-key',
      from: {
        name: 'Mosa Forge Staging',
        email: 'staging@mosaforge.com'
      },
      templates: {
        welcome: 'd-staging-welcome-template-id',
        payment: 'd-staging-payment-template-id',
        completion: 'd-staging-completion-template-id'
      }
    },

    // SMS Configuration
    sms: {
      provider: 'twilio',
      accountSid: process.env.STAGING_TWILIO_ACCOUNT_SID,
      authToken: process.env.STAGING_TWILIO_AUTH_TOKEN,
      fromNumber: process.env.STAGING_TWILIO_FROM_NUMBER || '+15005550006' // Twilio test number
    },

    // Push Notifications
    push: {
      enabled: true,
      provider: 'expo',
      accessToken: process.env.STAGING_EXPO_ACCESS_TOKEN
    }
  },

  // 🔄 EXTERNAL INTEGRATIONS
  integrations: {
    // Yachi Platform Integration (Staging)
    yachi: {
      baseUrl: 'https://staging-yachi.et/api/v1',
      apiKey: process.env.STAGING_YACHI_API_KEY || 'staging-yachi-test-key',
      timeout: 15000,
      webhook: {
        url: 'https://staging-api.mosaforge.com/integrations/yachi/webhook',
        secret: process.env.STAGING_YACHI_WEBHOOK_SECRET
      }
    },

    // Analytics Integration
    analytics: {
      mixpanel: {
        token: process.env.STAGING_MIXPANEL_TOKEN || 'staging-mixpanel-token',
        debug: true
      },
      googleAnalytics: {
        measurementId: 'G-STAGING-MOSA-FORGE'
      }
    },

    // Error Tracking
    errorTracking: {
      sentry: {
        dsn: process.env.STAGING_SENTRY_DSN,
        environment: 'staging',
        debug: true,
        tracesSampleRate: 0.5 // 50% of transactions
      }
    }
  },

  // 🚀 DEPLOYMENT & SCALING
  deployment: {
    // Kubernetes Configuration
    kubernetes: {
      namespace: 'mosa-staging',
      replicas: {
        apiGateway: 2,
        authService: 2,
        paymentService: 2,
        expertService: 3,
        studentService: 3,
        qualityService: 2,
        learningService: 3
      },
      resources: {
        requests: {
          memory: '256Mi',
          cpu: '250m'
        },
        limits: {
          memory: '512Mi',
          cpu: '500m'
        }
      },
      autoscaling: {
        enabled: true,
        minReplicas: 1,
        maxReplicas: 5,
        targetCPU: 70
      }
    },

    // Docker Configuration
    docker: {
      registry: 'registry.staging.mosaforge.com',
      imageTag: 'staging-latest',
      pullPolicy: 'Always'
    },

    // CI/CD Configuration
    cicd: {
      branch: 'develop',
      autoDeploy: true,
      tests: {
        unit: true,
        integration: true,
        e2e: true,
        performance: false // Disable in staging for speed
      }
    }
  },

  // 🎯 FEATURE FLAGS
  features: {
    // Gradual Feature Rollout
    flags: {
      // Payment Features
      enableTelebirr: true,
      enableCbeBirr: true,
      enableInstallments: true,
      
      // Learning Features
      enableDuolingoEngine: true,
      enableRealTimeCharts: true,
      enableMindsetAssessment: true,
      
      // Quality Features
      enableAutoEnforcement: true,
      enableExpertTiers: true,
      enableQualityBonuses: true,
      
      // Experimental Features
      enableAIRecommendations: false,
      enableGamification: true,
      enableSocialLearning: false
    },

    // A/B Testing
    experiments: {
      pricingModel: {
        enabled: true,
        variants: ['1999', '2199', '1799'],
        distribution: [0.5, 0.25, 0.25]
      },
      onboardingFlow: {
        enabled: true,
        variants: ['standard', 'accelerated', 'guided'],
        distribution: [0.4, 0.3, 0.3]
      }
    }
  },

  // 📝 DEBUGGING & DEVELOPMENT
  debugging: {
    // Debug Mode
    enabled: process.env.STAGING_DEBUG === 'true',
    
    // Log Levels
    logLevel: 'debug',
    
    // Debug Endpoints
    exposeEndpoints: true,
    
    // Query Logging
    logQueries: true,
    
    // Performance Profiling
    profiling: {
      enabled: true,
      interval: 30000
    }
  }
};

/**
 * 🏗️ Environment Validation
 * @function validateStagingConfig
 * @returns {Object} Validation result
 */
function validateStagingConfig() {
  const errors = [];

  // Validate required environment variables
  if (!process.env.STAGING_DB_PASSWORD) {
    errors.push('STAGING_DB_PASSWORD is required');
  }

  if (!process.env.STAGING_JWT_SECRET) {
    errors.push('STAGING_JWT_SECRET is required');
  }

  // Validate service URLs
  if (!stagingConfig.services.gateway.url.includes('staging')) {
    errors.push('Gateway URL must point to staging environment');
  }

  // Validate payment configuration
  if (stagingConfig.payment.revenueSplit.mosa + stagingConfig.payment.revenueSplit.expert !== 1999) {
    errors.push('Revenue split must total 1999 ETB');
  }

  if (errors.length > 0) {
    throw new Error(`Staging configuration validation failed: ${errors.join(', ')}`);
  }

  return {
    valid: true,
    timestamp: new Date().toISOString(),
    environment: 'staging',
    version: stagingConfig.environment.version
  };
}

/**
 * 🏗️ Get Service Configuration
 * @function getServiceConfig
 * @param {string} serviceName - Name of the service
 * @returns {Object} Service-specific configuration
 */
function getServiceConfig(serviceName) {
  const serviceConfigs = {
    'auth-service': {
      database: stagingConfig.database.postgresql,
      redis: stagingConfig.database.redis,
      auth: stagingConfig.auth,
      services: stagingConfig.services
    },
    'payment-service': {
      database: stagingConfig.database.postgresql,
      payment: stagingConfig.payment,
      services: stagingConfig.services
    },
    'student-service': {
      database: stagingConfig.database.postgresql,
      learning: stagingConfig.learning,
      quality: stagingConfig.quality,
      services: stagingConfig.services
    },
    'expert-service': {
      database: stagingConfig.database.postgresql,
      quality: stagingConfig.quality,
      services: stagingConfig.services
    },
    'quality-service': {
      database: stagingConfig.database.postgresql,
      redis: stagingConfig.database.redis,
      quality: stagingConfig.quality,
      services: stagingConfig.services
    }
  };

  return serviceConfigs[serviceName] || stagingConfig;
}

/**
 * 🏗️ Environment Initialization
 * @function initializeStagingEnvironment
 * @returns {Promise<Object>} Initialization result
 */
async function initializeStagingEnvironment() {
  try {
    // Validate configuration
    const validation = validateStagingConfig();
    
    // Initialize monitoring
    if (stagingConfig.monitoring.apm.enabled) {
      require('elastic-apm-node').start({
        serviceName: 'mosa-forge-staging',
        secretToken: stagingConfig.monitoring.apm.secretToken,
        serverUrl: stagingConfig.monitoring.apm.serverUrl,
        environment: 'staging'
      });
    }

    // Log initialization
    console.log('🎯 MOSA FORGE Staging Environment Initialized', {
      timestamp: new Date().toISOString(),
      version: stagingConfig.environment.version,
      release: stagingConfig.environment.release,
      validation
    });

    return {
      success: true,
      environment: 'staging',
      timestamp: new Date().toISOString(),
      config: stagingConfig
    };

  } catch (error) {
    console.error('❌ Staging environment initialization failed:', error);
    throw error;
  }
}

// 🏗️ Enterprise Export Pattern
module.exports = {
  stagingConfig,
  validateStagingConfig,
  getServiceConfig,
  initializeStagingEnvironment
};

// 🏗️ Auto-initialize in non-production environments
if (process.env.NODE_ENV === 'staging' && require.main === module) {
  initializeStagingEnvironment().catch(console.error);
}