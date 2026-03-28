/**
 * 🎯 MOSA FORGE: Enterprise Application Constants
 * 
 * @module AppConstants
 * @description Centralized configuration and constants for the Mosa Forge platform
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Centralized configuration management
 * - Environment-specific settings
 * - Business rule definitions
 * - Payment and revenue configurations
 * - Quality guarantee thresholds
 */

// 🏗️ Environment Detection
const ENVIRONMENT = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test'
};

const CURRENT_ENV = process.env.NODE_ENV || ENVIRONMENT.DEVELOPMENT;

// 🏗️ Platform Configuration
const PLATFORM_CONFIG = {
  // 🎯 Platform Identity
  PLATFORM_NAME: 'MOSA FORGE',
  PLATFORM_VERSION: '1.0.0',
  FOUNDER: 'Oumer Muktar',
  POWERED_BY: 'Chereka',
  SUPPORT_EMAIL: 'enterprise@mosaforge.com',
  SUPPORT_PHONE: '+251 XXX XXX XXX',
  
  // 🎯 Business Configuration
  BUNDLE_PRICE: 1999, // ETB
  REVENUE_SPLIT: {
    MOSA: 1000,
    EXPERT: 999
  },
  PAYOUT_SCHEDULE: [333, 333, 333],
  
  // 🎯 Platform Limits
  MAX_STUDENTS_PER_EXPERT: {
    MASTER: null, // Unlimited with quality maintenance
    SENIOR: 100,
    STANDARD: 50,
    DEVELOPING: 25,
    PROBATION: 10
  },
  
  // 🎯 Course Configuration
  COURSE_DURATION: {
    MINDSET_PHASE: 28, // days
    THEORY_PHASE: 60, // days
    HANDS_ON_PHASE: 60, // days
    CERTIFICATION_PHASE: 14, // days
    TOTAL_DURATION: 162 // days (~4 months)
  },
  
  // 🎯 Quality Guarantee Thresholds
  QUALITY_THRESHOLDS: {
    MINIMUM_EXPERT_RATING: 4.0,
    MINIMUM_COMPLETION_RATE: 0.7, // 70%
    MAX_RESPONSE_TIME: 24, // hours
    MIN_STUDENT_SATISFACTION: 0.8 // 80%
  },
  
  // 🎯 Performance Bonuses
  PERFORMANCE_BONUSES: {
    MASTER_TIER: 0.2, // 20%
    SENIOR_TIER: 0.1, // 10%
    STANDARD_TIER: 0.0, // 0%
    DEVELOPING_TIER: -0.1, // -10% penalty
    PROBATION_TIER: -0.2 // -20% penalty
  }
};

// 🏗️ Payment Configuration
const PAYMENT_CONFIG = {
  // 💰 Payment Gateways
  GATEWAYS: {
    TELEBIRR: {
      NAME: 'Telebirr',
      API_BASE_URL: process.env.TELEBIRR_API_URL || 'https://api.telebirr.com/v1',
      MERCHANT_ID: process.env.TELEBIRR_MERCHANT_ID,
      API_KEY: process.env.TELEBIRR_API_KEY,
      TIMEOUT: 30000
    },
    CBE_BIRR: {
      NAME: 'CBE Birr',
      API_BASE_URL: process.env.CBE_BIRR_API_URL || 'https://api.cbebirr.com/v1',
      MERCHANT_ID: process.env.CBE_BIRR_MERCHANT_ID,
      API_KEY: process.env.CBE_BIRR_API_KEY,
      TIMEOUT: 30000
    }
  },
  
  // 💰 Payment Statuses
  STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled'
  },
  
  // 💰 Revenue Distribution
  REVENUE_DISTRIBUTION: {
    MOSA_PLATFORM: 1000,
    EXPERT_EARNINGS: 999,
    DISTRIBUTION_PHASES: [
      { phase: 'COURSE_START', amount: 333, trigger: 'enrollment_start' },
      { phase: 'MIDPOINT', amount: 333, trigger: '75%_completion' },
      { phase: 'COMPLETION', amount: 333, trigger: 'certification' }
    ]
  },
  
  // 💰 Refund Policy
  REFUND_POLICY: {
    COOLING_PERIOD: 7, // days
    PRORATED_REFUNDS: true,
    MINIMUM_REFUND_AMOUNT: 100 // ETB
  }
};

// 🏗️ Expert Configuration
const EXPERT_CONFIG = {
  // 👨‍🏫 Expert Tiers
  TIERS: {
    MASTER: {
      NAME: 'Master Expert',
      MIN_RATING: 4.7,
      MIN_COMPLETION_RATE: 0.8,
      MAX_RESPONSE_TIME: 12, // hours
      BONUS_RATE: 0.2,
      STUDENT_LIMIT: null, // Unlimited
      BADGE_COLOR: '#FFD700' // Gold
    },
    SENIOR: {
      NAME: 'Senior Expert',
      MIN_RATING: 4.3,
      MIN_COMPLETION_RATE: 0.75,
      MAX_RESPONSE_TIME: 18, // hours
      BONUS_RATE: 0.1,
      STUDENT_LIMIT: 100,
      BADGE_COLOR: '#C0C0C0' // Silver
    },
    STANDARD: {
      NAME: 'Standard Expert',
      MIN_RATING: 4.0,
      MIN_COMPLETION_RATE: 0.7,
      MAX_RESPONSE_TIME: 24, // hours
      BONUS_RATE: 0.0,
      STUDENT_LIMIT: 50,
      BADGE_COLOR: '#CD7F32' // Bronze
    },
    DEVELOPING: {
      NAME: 'Developing Expert',
      MIN_RATING: 3.5,
      MIN_COMPLETION_RATE: 0.6,
      MAX_RESPONSE_TIME: 36, // hours
      BONUS_RATE: -0.1,
      STUDENT_LIMIT: 25,
      BADGE_COLOR: '#808080' // Gray
    },
    PROBATION: {
      NAME: 'Probation Expert',
      MIN_RATING: 0,
      MIN_COMPLETION_RATE: 0.5,
      MAX_RESPONSE_TIME: 48, // hours
      BONUS_RATE: -0.2,
      STUDENT_LIMIT: 10,
      BADGE_COLOR: '#FF0000' // Red
    }
  },
  
  // 👨‍🏫 Verification Requirements
  VERIFICATION: {
    REQUIRED_DOCUMENTS: [
      'FAYDA_ID',
      'PORTFOLIO',
      'CERTIFICATES',
      'PROOF_OF_EXPERIENCE'
    ],
    VERIFICATION_TIMEOUT: 48, // hours
    AUTO_APPROVAL_THRESHOLD: 4.5 // Auto-approve highly rated experts
  },
  
  // 👨‍🏫 Quality Metrics
  QUALITY_METRICS: {
    WEIGHTS: {
      COMPLETION_RATE: 0.3,
      AVERAGE_RATING: 0.25,
      RESPONSE_TIME: 0.2,
      STUDENT_SATISFACTION: 0.15,
      PROGRESS_RATE: 0.1
    },
    UPDATE_FREQUENCY: 24 // hours
  }
};

// 🏗️ Student Configuration
const STUDENT_CONFIG = {
  // 🎓 Enrollment Statuses
  ENROLLMENT_STATUS: {
    PENDING: 'pending',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    PAUSED: 'paused',
    EXPIRED: 'expired'
  },
  
  // 🎓 Learning Phases
  LEARNING_PHASES: {
    MINDSET: {
      NAME: 'Mindset Foundation',
      DURATION: 28,
      IS_FREE: true,
      EXERCISE_COUNT: 20,
      COMPLETION_THRESHOLD: 0.8 // 80%
    },
    THEORY: {
      NAME: 'Theory Mastery',
      DURATION: 60,
      EXERCISE_COUNT: 100,
      COMPLETION_THRESHOLD: 0.75 // 75%
    },
    HANDS_ON: {
      NAME: 'Hands-on Immersion',
      DURATION: 60,
      SESSION_COUNT: 20,
      COMPLETION_THRESHOLD: 0.8 // 80%
    },
    CERTIFICATION: {
      NAME: 'Certification & Launch',
      DURATION: 14,
      ASSESSMENT_COUNT: 1,
      COMPLETION_THRESHOLD: 0.7 // 70%
    }
  },
  
  // 🎓 Progress Tracking
  PROGRESS: {
    UPDATE_FREQUENCY: 24, // hours
    STALE_THRESHOLD: 7, // days
    MIN_WEEKLY_PROGRESS: 0.05 // 5%
  },
  
  // 🎓 Rating System
  RATING: {
    MIN_RATING: 1,
    MAX_RATING: 5,
    RATING_CATEGORIES: [
      'teaching_quality',
      'responsiveness',
      'professionalism',
      'support_quality'
    ]
  }
};

// 🏗️ Skills Catalog Configuration
const SKILLS_CONFIG = {
  // 🛠️ Skill Categories
  CATEGORIES: {
    ONLINE: {
      NAME: 'Online Skills',
      DESCRIPTION: 'Digital and remote work skills',
      ICON: '💻',
      COLOR: '#3B82F6'
    },
    OFFLINE: {
      NAME: 'Offline Skills',
      DESCRIPTION: 'Traditional and hands-on skills',
      ICON: '🏗️',
      COLOR: '#10B981'
    },
    HEALTH_SPORTS: {
      NAME: 'Health & Sports',
      DESCRIPTION: 'Wellness, fitness, and sports skills',
      ICON: '🏥',
      COLOR: '#EF4444'
    },
    BEAUTY_FASHION: {
      NAME: 'Beauty & Fashion',
      DESCRIPTION: 'Aesthetics and personal care skills',
      ICON: '💄',
      COLOR: '#8B5CF6'
    }
  },
  
  // 🛠️ Skill Packages
  PACKAGES: {
    BASIC: {
      NAME: 'Basic Package',
      PRICE: 1999,
      FEATURES: [
        '4-month_complete_training',
        'expert_mentorship',
        'yachi_verification',
        'digital_certificate'
      ]
    },
    PREMIUM: {
      NAME: 'Premium Package',
      PRICE: 2999,
      FEATURES: [
        'all_basic_features',
        'priority_support',
        'advanced_portfolio',
        'job_placement_assistance'
      ]
    },
    ENTERPRISE: {
      NAME: 'Enterprise Package',
      PRICE: 4999,
      FEATURES: [
        'all_premium_features',
        'corporate_certification',
        'lifetime_community',
        'business_incubation'
      ]
    }
  }
};

// 🏗️ Authentication & Security
const AUTH_CONFIG = {
  // 🔐 JWT Configuration
  JWT: {
    SECRET: process.env.JWT_SECRET || 'mosa-forge-enterprise-secret',
    EXPIRES_IN: '30d',
    REFRESH_EXPIRES_IN: '90d',
    ISSUER: 'mosa-forge.com',
    AUDIENCE: 'mosa-forge-users'
  },
  
  // 🔐 FAYDA ID Configuration
  FAYDA: {
    API_BASE_URL: process.env.FAYDA_API_URL || 'https://api.fayda.gov.et/v1',
    API_KEY: process.env.FAYDA_API_KEY,
    TIMEOUT: 10000,
    VALIDATION_REQUIRED: true
  },
  
  // 🔐 OTP Configuration
  OTP: {
    LENGTH: 6,
    EXPIRES_IN: 600, // 10 minutes
    MAX_ATTEMPTS: 3,
    RESEND_COOLDOWN: 60 // 1 minute
  },
  
  // 🔐 Password Policy
  PASSWORD_POLICY: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: true,
    MAX_AGE: 90 // days
  },
  
  // 🔐 Rate Limiting
  RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 900000, // 15 minutes
    SKIP_SUCCESSFUL_REQUESTS: false
  }
};

// 🏗️ Database Configuration
const DATABASE_CONFIG = {
  // 🗃️ Primary Database (PostgreSQL)
  PRIMARY: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT) || 5432,
    USERNAME: process.env.DB_USERNAME || 'mosa_forge_user',
    PASSWORD: process.env.DB_PASSWORD || 'secure_password',
    DATABASE: process.env.DB_NAME || 'mosa_forge_enterprise',
    POOL: {
      MAX: 20,
      MIN: 5,
      ACQUIRE: 30000,
      IDLE: 10000
    }
  },
  
  // 🗃️ Cache (Redis)
  CACHE: {
    HOST: process.env.REDIS_HOST || 'localhost',
    PORT: parseInt(process.env.REDIS_PORT) || 6379,
    PASSWORD: process.env.REDIS_PASSWORD,
    DB: 0,
    KEY_PREFIX: 'mosa:',
    TTL: {
      SESSION: 86400, // 24 hours
      RATE_LIMIT: 900, // 15 minutes
      OTP: 600, // 10 minutes
      CONFIG: 3600 // 1 hour
    }
  },
  
  // 🗃️ Analytics Database (MongoDB)
  ANALYTICS: {
    URI: process.env.MONGO_URI || 'mongodb://localhost:27017/mosa_analytics',
    DATABASE: 'mosa_analytics',
    COLLECTIONS: {
      USER_ACTIVITY: 'user_activity',
      PAYMENT_LOGS: 'payment_logs',
      QUALITY_METRICS: 'quality_metrics',
      BUSINESS_INTELLIGENCE: 'business_intelligence'
    }
  }
};

// 🏗️ Microservices Configuration
const MICROSERVICES_CONFIG = {
  // 🚀 Service Registry
  SERVICES: {
    API_GATEWAY: {
      NAME: 'api-gateway',
      PORT: 3000,
      HEALTH_CHECK: '/health',
      VERSION: '1.0.0'
    },
    AUTH_SERVICE: {
      NAME: 'auth-service',
      PORT: 3001,
      HEALTH_CHECK: '/auth/health',
      VERSION: '1.0.0'
    },
    PAYMENT_SERVICE: {
      NAME: 'payment-service',
      PORT: 3002,
      HEALTH_CHECK: '/payment/health',
      VERSION: '1.0.0'
    },
    EXPERT_SERVICE: {
      NAME: 'expert-service',
      PORT: 3003,
      HEALTH_CHECK: '/expert/health',
      VERSION: '1.0.0'
    },
    STUDENT_SERVICE: {
      NAME: 'student-service',
      PORT: 3004,
      HEALTH_CHECK: '/student/health',
      VERSION: '1.0.0'
    },
    QUALITY_SERVICE: {
      NAME: 'quality-service',
      PORT: 3005,
      HEALTH_CHECK: '/quality/health',
      VERSION: '1.0.0'
    },
    LEARNING_SERVICE: {
      NAME: 'learning-service',
      PORT: 3006,
      HEALTH_CHECK: '/learning/health',
      VERSION: '1.0.0'
    },
    TRAINING_SERVICE: {
      NAME: 'training-service',
      PORT: 3007,
      HEALTH_CHECK: '/training/health',
      VERSION: '1.0.0'
    },
    CERTIFICATION_SERVICE: {
      NAME: 'certification-service',
      PORT: 3008,
      HEALTH_CHECK: '/certification/health',
      VERSION: '1.0.0'
    },
    ANALYTICS_SERVICE: {
      NAME: 'analytics-service',
      PORT: 3009,
      HEALTH_CHECK: '/analytics/health',
      VERSION: '1.0.0'
    }
  },
  
  // 🚀 Service Communication
  COMMUNICATION: {
    TIMEOUT: 30000,
    MAX_RETRIES: 3,
    CIRCUIT_BREAKER: {
      FAILURE_THRESHOLD: 5,
      SUCCESS_THRESHOLD: 3,
      TIMEOUT: 60000
    }
  }
};

// 🏗️ Monitoring & Analytics
const MONITORING_CONFIG = {
  // 📊 Performance Metrics
  METRICS: {
    COLLECTION_INTERVAL: 15000, // 15 seconds
    RETENTION_PERIOD: 30, // days
    ALERT_THRESHOLDS: {
      CPU_USAGE: 0.8, // 80%
      MEMORY_USAGE: 0.85, // 85%
      RESPONSE_TIME: 1000, // 1 second
      ERROR_RATE: 0.01 // 1%
    }
  },
  
  // 📊 Business Metrics
  BUSINESS_METRICS: {
    DAILY_ACTIVE_USERS: true,
    MONTHLY_ACTIVE_USERS: true,
    COMPLETION_RATE: true,
    REVENUE_TRACKING: true,
    EXPERT_PERFORMANCE: true,
    STUDENT_PROGRESS: true
  },
  
  // 📊 Logging
  LOGGING: {
    LEVEL: CURRENT_ENV === 'production' ? 'info' : 'debug',
    FORMAT: 'json',
    DIRECTORY: './logs',
    RETENTION: '30d',
    SENTRY_DSN: process.env.SENTRY_DSN
  }
};

// 🏗️ Deployment & Infrastructure
const DEPLOYMENT_CONFIG = {
  // 🐳 Docker Configuration
  DOCKER: {
    REGISTRY: 'registry.mosaforge.com',
    NAMESPACE: 'mosa-forge',
    TAG: process.env.DOCKER_TAG || 'latest'
  },
  
  // ☸️ Kubernetes Configuration
  KUBERNETES: {
    NAMESPACE: 'mosa-forge',
    REPLICA_COUNT: {
      PRODUCTION: 3,
      STAGING: 2,
      DEVELOPMENT: 1
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
  },
  
  // 🌐 Network Configuration
  NETWORK: {
    CORS_ORIGINS: [
      'https://mosaforge.com',
      'https://app.mosaforge.com',
      'https://admin.mosaforge.com'
    ],
    RATE_LIMIT_BY_IP: true,
    TRUST_PROXY: true
  }
};

// 🏗️ Feature Flags
const FEATURE_FLAGS = {
  // 🚀 Experimental Features
  EXPERIMENTAL: {
    AI_DUPLICATE_DETECTION: true,
    ADVANCED_EXPERT_MATCHING: true,
    REAL_TIME_COLLABORATION: false,
    GAMIFICATION_ELEMENTS: true
  },
  
  // 🚀 Business Features
  BUSINESS: {
    MULTI_COURSE_ENROLLMENT: true,
    PAYMENT_INSTALLMENTS: true,
    CORPORATE_TRAINING: false,
    API_MARKETPLACE: false
  },
  
  // 🚀 Integration Features
  INTEGRATIONS: {
    YACHI_PLATFORM: true,
    TELEBIRR_PAYMENTS: true,
    CBE_BIRR_PAYMENTS: true,
    FAYDA_VERIFICATION: true
  }
};

// 🏗️ Error Codes & Messages
const ERROR_CODES = {
  // 🔴 Authentication Errors
  AUTH: {
    INVALID_CREDENTIALS: 'AUTH_001',
    EXPIRED_TOKEN: 'AUTH_002',
    INSUFFICIENT_PERMISSIONS: 'AUTH_003',
    FAYDA_VERIFICATION_FAILED: 'AUTH_004',
    DUPLICATE_USER: 'AUTH_005'
  },
  
  // 🔴 Payment Errors
  PAYMENT: {
    INSUFFICIENT_FUNDS: 'PAY_001',
    PAYMENT_GATEWAY_ERROR: 'PAY_002',
    TRANSACTION_FAILED: 'PAY_003',
    REFUND_PROCESSING_ERROR: 'PAY_004'
  },
  
  // 🔴 Enrollment Errors
  ENROLLMENT: {
    DUPLICATE_ENROLLMENT: 'ENROLL_001',
    EXPERT_UNAVAILABLE: 'ENROLL_002',
    QUALITY_THRESHOLD_NOT_MET: 'ENROLL_003',
    CAPACITY_EXCEEDED: 'ENROLL_004'
  },
  
  // 🔴 Quality Errors
  QUALITY: {
    LOW_PERFORMANCE: 'QUALITY_001',
    STUDENT_COMPLAINT: 'QUALITY_002',
    AUTO_ENFORCEMENT_TRIGGERED: 'QUALITY_003'
  },
  
  // 🔴 System Errors
  SYSTEM: {
    DATABASE_CONNECTION: 'SYS_001',
    EXTERNAL_SERVICE_UNAVAILABLE: 'SYS_002',
    RATE_LIMIT_EXCEEDED: 'SYS_003',
    MAINTENANCE_MODE: 'SYS_004'
  }
};

// 🏗️ Environment-Specific Overrides
const getEnvironmentConfig = () => {
  const baseConfig = {
    // Base configuration applied to all environments
    IS_PRODUCTION: CURRENT_ENV === ENVIRONMENT.PRODUCTION,
    IS_DEVELOPMENT: CURRENT_ENV === ENVIRONMENT.DEVELOPMENT,
    IS_STAGING: CURRENT_ENV === ENVIRONMENT.STAGING,
    IS_TEST: CURRENT_ENV === ENVIRONMENT.TEST,
    
    // Environment-specific logging
    LOG_LEVEL: CURRENT_ENV === 'production' ? 'info' : 'debug',
    
    // Feature flags by environment
    FEATURE_FLAGS: {
      ...FEATURE_FLAGS,
      EXPERIMENTAL: {
        ...FEATURE_FLAGS.EXPERIMENTAL,
        REAL_TIME_COLLABORATION: CURRENT_ENV !== 'production'
      }
    }
  };

  // Environment-specific overrides
  const environmentOverrides = {
    [ENVIRONMENT.DEVELOPMENT]: {
      DEBUG_MODE: true,
      ENABLE_TEST_DATA: true,
      SKIP_PAYMENT_VERIFICATION: true,
      LOG_LEVEL: 'debug'
    },
    
    [ENVIRONMENT.STAGING]: {
      DEBUG_MODE: false,
      ENABLE_TEST_DATA: false,
      SKIP_PAYMENT_VERIFICATION: false,
      LOG_LEVEL: 'info'
    },
    
    [ENVIRONMENT.PRODUCTION]: {
      DEBUG_MODE: false,
      ENABLE_TEST_DATA: false,
      SKIP_PAYMENT_VERIFICATION: false,
      LOG_LEVEL: 'warn',
      ENABLE_ANALYTICS: true
    },
    
    [ENVIRONMENT.TEST]: {
      DEBUG_MODE: true,
      ENABLE_TEST_DATA: true,
      SKIP_PAYMENT_VERIFICATION: true,
      LOG_LEVEL: 'error'
    }
  };

  return {
    ...baseConfig,
    ...(environmentOverrides[CURRENT_ENV] || {})
  };
};

// 🏗️ Export Configuration
module.exports = {
  // Core Configuration
  ENVIRONMENT,
  CURRENT_ENV,
  PLATFORM_CONFIG,
  
  // Business Configuration
  PAYMENT_CONFIG,
  EXPERT_CONFIG,
  STUDENT_CONFIG,
  SKILLS_CONFIG,
  
  // Technical Configuration
  AUTH_CONFIG,
  DATABASE_CONFIG,
  MICROSERVICES_CONFIG,
  MONITORING_CONFIG,
  DEPLOYMENT_CONFIG,
  
  // Feature Management
  FEATURE_FLAGS,
  ERROR_CODES,
  
  // Environment Configuration
  ...getEnvironmentConfig(),
  
  // Utility Functions
  isProduction: () => CURRENT_ENV === ENVIRONMENT.PRODUCTION,
  isDevelopment: () => CURRENT_ENV === ENVIRONMENT.DEVELOPMENT,
  isStaging: () => CURRENT_ENV === ENVIRONMENT.STAGING,
  isTest: () => CURRENT_ENV === ENVIRONMENT.TEST,
  
  // Validation Functions
  isValidSkillCategory: (category) => {
    return Object.keys(SKILLS_CONFIG.CATEGORIES).includes(category);
  },
  
  isValidExpertTier: (tier) => {
    return Object.keys(EXPERT_CONFIG.TIERS).includes(tier);
  },
  
  isValidEnrollmentStatus: (status) => {
    return Object.values(STUDENT_CONFIG.ENROLLMENT_STATUS).includes(status);
  },
  
  // Calculation Functions
  calculateExpertEarnings: (baseEarnings, tier, performanceBonus = 0) => {
    const tierBonus = EXPERT_CONFIG.TIERS[tier]?.BONUS_RATE || 0;
    const totalBonus = tierBonus + performanceBonus;
    return Math.floor(baseEarnings * (1 + totalBonus));
  },
  
  calculateProgressPercentage: (completed, total) => {
    if (total === 0) return 0;
    return Math.min(100, Math.round((completed / total) * 100));
  },
  
  // Configuration Getters
  getServiceConfig: (serviceName) => {
    return MICROSERVICES_CONFIG.SERVICES[serviceName];
  },
  
  getSkillCategory: (category) => {
    return SKILLS_CONFIG.CATEGORIES[category];
  },
  
  getExpertTierConfig: (tier) => {
    return EXPERT_CONFIG.TIERS[tier];
  }
};

// 🏗️ Singleton Configuration Instance
let configInstance = null;

module.exports.getInstance = () => {
  if (!configInstance) {
    configInstance = module.exports;
  }
  return configInstance;
};