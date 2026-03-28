// environments/production.js

/**
 * 🚀 MOSA FORGE PRODUCTION ENVIRONMENT
 * Enterprise-grade production configuration
 * Optimized for performance, security, and scalability
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { config } = require('dotenv');
const { join } = require('path');

// Load environment variables
config({ path: join(__dirname, '../.env.production') });

module.exports = {
  // 🎯 APPLICATION IDENTIFICATION
  APP: {
    NAME: 'Mosa Forge Enterprise',
    VERSION: process.env.APP_VERSION || '1.0.0',
    ENVIRONMENT: 'production',
    RELEASE: process.env.APP_RELEASE || `build-${Date.now()}`,
    POWERED_BY: 'Chereka',
    FOUNDER: 'Oumer Muktar'
  },

  // 🌐 SERVER CONFIGURATION
  SERVER: {
    PORT: process.env.PORT || 3000,
    HOST: process.env.HOST || '0.0.0.0',
    CLUSTER_MODE: process.env.CLUSTER_MODE === 'true',
    CLUSTER_INSTANCES: process.env.CLUSTER_INSTANCES || 'max',
    BODY_LIMIT: '10mb',
    CORS: {
      origin: [
        'https://mosaforge.com',
        'https://app.mosaforge.com',
        'https://admin.mosaforge.com',
        'https://api.mosaforge.com'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Fayda-ID',
        'X-Device-ID'
      ]
    },
    RATE_LIMIT: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Limit each IP to 1000 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      skipSuccessfulRequests: false,
      enableDraftSpec: false
    }
  },

  // 🗃️ DATABASE CONFIGURATION - PostgreSQL with Prisma
  DATABASE: {
    POSTGRES: {
      URL: process.env.DATABASE_URL,
      HOST: process.env.DB_HOST || 'mosa-forge-cluster.production.eth',
      PORT: parseInt(process.env.DB_PORT) || 5432,
      USER: process.env.DB_USER || 'mosa_forge_prod',
      PASSWORD: process.env.DB_PASSWORD,
      NAME: process.env.DB_NAME || 'mosa_forge_production',
      SSL: {
        rejectUnauthorized: true,
        ca: process.env.DB_SSL_CA
      },
      POOL: {
        max: 50, // Maximum number of clients in the pool
        min: 10, // Minimum number of clients in the pool
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100
      },
      CONNECTION_TIMEOUT: 60000,
      QUERY_TIMEOUT: 30000,
      IDLE_IN_TRANSACTION_SESSION_TIMEOUT: 60000
    }
  },

  // 🔐 AUTHENTICATION & SECURITY
  AUTH: {
    JWT: {
      SECRET: process.env.JWT_SECRET,
      ACCESS_EXPIRY: '15m', // 15 minutes
      REFRESH_EXPIRY: '7d', // 7 days
      ISSUER: 'mosa-forge.com',
      AUDIENCE: 'mosa-forge-users'
    },
    FAYDA: {
      API_URL: process.env.FAYDA_API_URL || 'https://api.fayda.gov.et/v1',
      API_KEY: process.env.FAYDA_API_KEY,
      TIMEOUT: 30000,
      RETRY_ATTEMPTS: 3
    },
    OTP: {
      LENGTH: 6,
      EXPIRY: 10 * 60 * 1000, // 10 minutes
      MAX_ATTEMPTS: 3
    },
    PASSWORD: {
      MIN_LENGTH: 8,
      REQUIRE_SPECIAL_CHAR: true,
      REQUIRE_NUMBER: true,
      REQUIRE_UPPERCASE: true,
      BCRYPT_ROUNDS: 12
    }
  },

  // 💰 PAYMENT CONFIGURATION
  PAYMENT: {
    BUNDLE_PRICE: 1999, // ETB
    REVENUE_SPLIT: {
      MOSA_PLATFORM: 1000,
      EXPERT_EARNINGS: 999
    },
    PAYOUT_SCHEDULE: {
      UPFRONT: 333,
      MILESTONE: 333,
      COMPLETION: 333
    },
    QUALITY_BONUSES: {
      MASTER_TIER: 0.20, // 20% bonus
      SENIOR_TIER: 0.10, // 10% bonus
      STANDARD_TIER: 0.00 // Base rate
    },
    GATEWAYS: {
      TELEBIRR: {
        API_URL: process.env.TELEBIRR_API_URL || 'https://api.telebirr.com/v1',
        MERCHANT_ID: process.env.TELEBIRR_MERCHANT_ID,
        PUBLIC_KEY: process.env.TELEBIRR_PUBLIC_KEY,
        PRIVATE_KEY: process.env.TELEBIRR_PRIVATE_KEY,
        TIMEOUT: 30000
      },
      CBE_BIRR: {
        API_URL: process.env.CBE_BIRR_API_URL || 'https://api.cbebirr.com/v1',
        CLIENT_ID: process.env.CBE_BIRR_CLIENT_ID,
        CLIENT_SECRET: process.env.CBE_BIRR_CLIENT_SECRET,
        TIMEOUT: 30000
      }
    },
    REFUND: {
      COOLING_PERIOD: 7, // 7 days
      PRORATED_CALCULATION: true,
      PROCESSING_DAYS: 3
    }
  },

  // 🛡️ QUALITY GUARANTEE SYSTEM
  QUALITY: {
    METRICS: {
      COMPLETION_RATE_THRESHOLD: 0.70, // 70% minimum
      AVERAGE_RATING_THRESHOLD: 4.0, // 4.0 stars minimum
      RESPONSE_TIME_THRESHOLD: 24 * 60 * 60 * 1000, // 24 hours
      WEEKLY_PROGRESS_THRESHOLD: 0.05, // 5% weekly progress
      STUDENT_SATISFACTION_THRESHOLD: 0.80 // 80% satisfaction
    },
    TIERS: {
      MASTER: {
        MIN_SCORE: 4.7,
        MAX_STUDENTS: null, // Unlimited
        BONUS_RATE: 0.20,
        REQUIREMENTS: {
          minRatings: 10,
          completionRate: 0.80
        }
      },
      SENIOR: {
        MIN_SCORE: 4.3,
        MAX_STUDENTS: 100,
        BONUS_RATE: 0.10,
        REQUIREMENTS: {
          minRatings: 5,
          completionRate: 0.75
        }
      },
      STANDARD: {
        MIN_SCORE: 4.0,
        MAX_STUDENTS: 50,
        BONUS_RATE: 0.00,
        REQUIREMENTS: {
          minRatings: 3,
          completionRate: 0.70
        }
      },
      DEVELOPING: {
        MIN_SCORE: 3.5,
        MAX_STUDENTS: 25,
        BONUS_RATE: -0.10,
        REQUIREMENTS: {
          minRatings: 1,
          completionRate: 0.60
        }
      },
      PROBATION: {
        MIN_SCORE: 0,
        MAX_STUDENTS: 10,
        BONUS_RATE: -0.20,
        REQUIREMENTS: {
          minRatings: 0,
          completionRate: 0.50
        }
      }
    },
    AUTO_ENFORCEMENT: {
      CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
      GRACE_PERIOD: 24 * 60 * 60 * 1000, // 24 hours
      MAX_VIOLATIONS: 3
    }
  },

  // 🎓 LEARNING ENGINE
  LEARNING: {
    PHASES: {
      MINDSET: {
        DURATION: 30, // 30 days
        IS_FREE: true,
        COMPLETION_REQUIRED: true
      },
      THEORY: {
        DURATION: 60, // 60 days
        EXERCISES_PER_DAY: 10,
        MASTERY_THRESHOLD: 0.80 // 80% correct
      },
      HANDS_ON: {
        DURATION: 60, // 60 days
        SESSIONS_PER_WEEK: 3,
        STUDENTS_PER_SESSION: 5,
        ATTENDANCE_THRESHOLD: 0.80 // 80% attendance
      }
    },
    PROGRESS: {
      UPDATE_INTERVAL: 60 * 60 * 1000, // 1 hour
      SNAPSHOT_FREQUENCY: 24 * 60 * 60 * 1000, // Daily
      RETENTION_DAYS: 365 // 1 year
    }
  },

  // 🔄 CACHE CONFIGURATION - Redis
  CACHE: {
    REDIS: {
      URL: process.env.REDIS_URL,
      HOST: process.env.REDIS_HOST || 'mosa-forge-redis.production.eth',
      PORT: parseInt(process.env.REDIS_PORT) || 6379,
      PASSWORD: process.env.REDIS_PASSWORD,
      DB: parseInt(process.env.REDIS_DB) || 0,
      KEY_PREFIX: 'mosa:prod:',
      TTL: {
        SHORT: 5 * 60, // 5 minutes
        MEDIUM: 30 * 60, // 30 minutes
        LONG: 24 * 60 * 60, // 24 hours
        SESSION: 7 * 24 * 60 * 60 // 7 days
      }
    },
    STRATEGIES: {
      EXPERT_METRICS: 60 * 60, // 1 hour
      RATING_ANALYTICS: 15 * 60, // 15 minutes
      STUDENT_PROGRESS: 30 * 60, // 30 minutes
      PAYMENT_STATUS: 5 * 60, // 5 minutes
      SKILL_CATALOG: 24 * 60 * 60 // 24 hours
    }
  },

  // 📧 NOTIFICATIONS & COMMUNICATIONS
  NOTIFICATIONS: {
    EMAIL: {
      PROVIDER: 'sendgrid',
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
      FROM_EMAIL: 'noreply@mosaforge.com',
      FROM_NAME: 'Mosa Forge',
      TEMPLATES: {
        WELCOME: 'd-welcome-template-id',
        PAYMENT_CONFIRMATION: 'd-payment-template-id',
        COURSE_COMPLETION: 'd-completion-template-id',
        QUALITY_ALERT: 'd-quality-alert-template-id'
      }
    },
    SMS: {
      PROVIDER: 'twilio',
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
      TEMPLATES: {
        OTP: 'Your Mosa Forge verification code is: {code}',
        PAYMENT_SUCCESS: 'Payment of {amount} ETB received for {skill} course',
        SESSION_REMINDER: 'Reminder: Your {skill} session starts in 1 hour'
      }
    },
    PUSH: {
      EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN,
      CHANNELS: {
        PAYMENTS: 'payments',
        LEARNING: 'learning',
        QUALITY: 'quality',
        SYSTEM: 'system'
      }
    }
  },

  // 📊 MONITORING & OBSERVABILITY
  MONITORING: {
    LOGGING: {
      LEVEL: 'info',
      TRANSPORTS: ['file', 'console', 'elasticsearch'],
      ELASTICSEARCH: {
        NODE: process.env.ELASTICSEARCH_URL || 'http://elasticsearch.production.eth:9200',
        INDEX: 'mosa-forge-logs'
      },
      FILE: {
        PATH: '/var/log/mosa-forge',
        MAX_SIZE: '100m',
        MAX_FILES: '30d'
      }
    },
    METRICS: {
      PROMETHEUS: {
        ENABLED: true,
        PORT: 9090,
        PATH: '/metrics',
        COLLECT_DEFAULT_METRICS: true
      },
      CUSTOM_METRICS: {
        RATING_PROCESSING_TIME: 'rating_processing_time',
        PAYMENT_SUCCESS_RATE: 'payment_success_rate',
        EXPERT_QUALITY_SCORE: 'expert_quality_score',
        STUDENT_COMPLETION_RATE: 'student_completion_rate'
      }
    },
    APM: {
      ENABLED: true,
      PROVIDER: 'elastic-apm',
      SERVER_URL: process.env.APM_SERVER_URL,
      SERVICE_NAME: 'mosa-forge-backend',
      ENVIRONMENT: 'production',
      CAPTURE_BODY: 'all',
      CAPTURE_ERROR_LOG_STACK_TRACES: 'always'
    },
    HEALTH_CHECK: {
      PATH: '/health',
      INTERVAL: 30000, // 30 seconds
      TIMEOUT: 5000
    }
  },

  // 🚀 MICROSERVICES CONFIGURATION
  MICROSERVICES: {
    API_GATEWAY: {
      URL: process.env.API_GATEWAY_URL || 'http://api-gateway.production.eth:3000',
      TIMEOUT: 10000
    },
    SERVICES: {
      AUTH: {
        URL: process.env.AUTH_SERVICE_URL || 'http://auth-service.production.eth:3001',
        HEALTH_CHECK: '/health'
      },
      PAYMENT: {
        URL: process.env.PAYMENT_SERVICE_URL || 'http://payment-service.production.eth:3002',
        HEALTH_CHECK: '/health'
      },
      EXPERT: {
        URL: process.env.EXPERT_SERVICE_URL || 'http://expert-service.production.eth:3003',
        HEALTH_CHECK: '/health'
      },
      STUDENT: {
        URL: process.env.STUDENT_SERVICE_URL || 'http://student-service.production.eth:3004',
        HEALTH_CHECK: '/health'
      },
      QUALITY: {
        URL: process.env.QUALITY_SERVICE_URL || 'http://quality-service.production.eth:3005',
        HEALTH_CHECK: '/health'
      },
      LEARNING: {
        URL: process.env.LEARNING_SERVICE_URL || 'http://learning-service.production.eth:3006',
        HEALTH_CHECK: '/health'
      }
    },
    SERVICE_DISCOVERY: {
      ENABLED: true,
      PROVIDER: 'consul',
      CONSUL_HOST: process.env.CONSUL_HOST || 'consul.production.eth',
      CONSUL_PORT: parseInt(process.env.CONSUL_PORT) || 8500
    }
  },

  // 🔗 EXTERNAL INTEGRATIONS
  INTEGRATIONS: {
    YACHI: {
      API_URL: process.env.YACHI_API_URL || 'https://api.yachi.et/v1',
      API_KEY: process.env.YACHI_API_KEY,
      VERIFICATION_ENDPOINT: '/providers/verify',
      CERTIFICATION_ENDPOINT: '/certificates/issue',
      TIMEOUT: 30000
    },
    FOREX_DATA: {
      PROVIDER: 'oanda',
      API_URL: process.env.FOREX_API_URL || 'https://api-fxtrade.oanda.com/v3',
      API_KEY: process.env.FOREX_API_KEY,
      STREAMING_ENDPOINT: '/accounts/{accountId}/pricing/stream',
      TIMEOUT: 60000
    }
  },

  // 🛠️ DEPLOYMENT & INFRASTRUCTURE
  INFRASTRUCTURE: {
    KUBERNETES: {
      NAMESPACE: 'mosa-forge-production',
      DEPLOYMENT: {
        REPLICAS: {
          API_GATEWAY: 3,
          AUTH_SERVICE: 2,
          PAYMENT_SERVICE: 2,
          EXPERT_SERVICE: 3,
          STUDENT_SERVICE: 3,
          QUALITY_SERVICE: 2,
          LEARNING_SERVICE: 4
        },
        RESOURCES: {
          REQUESTS: {
            CPU: '100m',
            MEMORY: '128Mi'
          },
          LIMITS: {
            CPU: '500m',
            MEMORY: '512Mi'
          }
        }
      }
    },
    LOAD_BALANCER: {
      ENABLED: true,
      STRATEGY: 'round_robin',
      HEALTH_CHECK_INTERVAL: 10000
    },
    CDN: {
      ENABLED: true,
      PROVIDER: 'cloudfront',
      DOMAIN: process.env.CDN_DOMAIN || 'cdn.mosaforge.com'
    }
  },

  // 🔒 SECURITY & COMPLIANCE
  SECURITY: {
    ENCRYPTION: {
      ALGORITHM: 'aes-256-gcm',
      KEY: process.env.ENCRYPTION_KEY,
      IV_LENGTH: 16
    },
    HEADERS: {
      STRICT_TRANSPORT_SECURITY: 'max-age=31536000; includeSubDomains',
      CONTENT_SECURITY_POLICY: "default-src 'self'; script-src 'self' 'unsafe-inline'",
      X_CONTENT_TYPE_OPTIONS: 'nosniff',
      X_FRAME_OPTIONS: 'DENY',
      X_XSS_PROTECTION: '1; mode=block'
    },
    DATA_RETENTION: {
      USER_DATA: 7 * 365, // 7 years
      PAYMENT_RECORDS: 10 * 365, // 10 years
      AUDIT_LOGS: 5 * 365, // 5 years
      ANALYTICS_DATA: 3 * 365 // 3 years
    },
    COMPLIANCE: {
      ETHIOPIAN_DATA_PROTECTION: true,
      FINANCIAL_REGULATIONS: true,
      TAX_COMPLIANCE: true
    }
  },

  // 🎯 BUSINESS RULES
  BUSINESS: {
    SKILLS: {
      TOTAL_CATEGORIES: 4,
      SKILLS_PER_CATEGORY: 10,
      PACKAGES_PER_SKILL: 5
    },
    TRAINING: {
      MAX_CONCURRENT_COURSES: 3,
      MIN_AGE_REQUIREMENT: 18,
      MAX_ENROLLMENT_DURATION: 180 // 6 months
    },
    REFERRAL: {
      ENABLED: true,
      COMMISSION_RATE: 0.10, // 10% commission
      MAX_REFERRALS: 5
    }
  },

  // 🚨 ALERTING & INCIDENT MANAGEMENT
  ALERTING: {
    CRITICAL: {
      PAYMENT_FAILURE_RATE: 0.05, // 5%
      SYSTEM_UPTIME: 0.99, // 99% uptime
      RESPONSE_TIME: 5000, // 5 seconds
      ERROR_RATE: 0.01 // 1% error rate
    },
    CHANNELS: {
      SLACK: {
        WEBHOOK_URL: process.env.SLACK_ALERT_WEBHOOK,
        CHANNEL: '#production-alerts'
      },
      PAGERDUTY: {
        API_KEY: process.env.PAGERDUTY_API_KEY,
        SERVICE_ID: process.env.PAGERDUTY_SERVICE_ID
      },
      EMAIL: {
        CRITICAL: 'alerts@mosaforge.com',
        OPERATIONAL: 'ops@mosaforge.com'
      }
    }
  }
};

// 🛡️ Environment Validation
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'REDIS_URL',
  'TELEBIRR_MERCHANT_ID',
  'SENDGRID_API_KEY',
  'TWILIO_ACCOUNT_SID'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`❌ Missing required environment variable: ${envVar}`);
  }
});

// 📊 Performance Optimizations
if (process.env.NODE_ENV === 'production') {
  // Optimize for production
  require('v8').setFlagsFromString('--max_old_space_size=4096');
  require('events').EventEmitter.defaultMaxListeners = 100;
}

console.log('🚀 Mosa Forge Production Environment Loaded');
console.log(`🏗️ Powered by Chereka | Founded by Oumer Muktar`);
console.log(`🌍 Environment: ${module.exports.APP.ENVIRONMENT}`);
console.log(`📱 Version: ${module.exports.APP.VERSION}`);
console.log(`🔐 Security: Ethiopian Data Protection Compliant`);

module.exports.IS_PRODUCTION = true;
module.exports.IS_ENTERPRISE = true;