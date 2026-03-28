/**
 * 🎯 MOSA FORGE: Enterprise Development Environment Configuration
 * 
 * @module DevelopmentConfig
 * @description Development environment configuration with enterprise security practices
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Secure development environment setup
 * - Mock payment gateways with validation
 * - Fake data generation for testing
 * - Development-specific quality thresholds
 * - Comprehensive logging and debugging
 */

const { v4: uuidv4 } = require('uuid');

/**
 * 🏗️ Enterprise Development Configuration Class
 * @class DevelopmentConfig
 */
class DevelopmentConfig {
  constructor() {
    this.environment = 'development';
    this.releaseVersion = process.env.RELEASE_VERSION || '1.0.0-dev';
    this.buildId = process.env.BUILD_ID || `build-${uuidv4().slice(0, 8)}`;
    
    this._validateEnvironment();
    this._initializeConfiguration();
  }

  /**
   * 🏗️ Validate Development Environment
   * @private
   */
  _validateEnvironment() {
    const requiredVars = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
      console.warn('💡 Using development defaults. This should not happen in production.');
    }

    // Security warning for development
    if (process.env.NODE_ENV === 'development' && !process.env.IS_CI) {
      console.warn('🔐 DEVELOPMENT MODE - Security restrictions are relaxed');
    }
  }

  /**
   * 🏗️ Initialize Enterprise Configuration
   * @private
   */
  _initializeConfiguration() {
    this.config = {
      // 🏗️ Environment Identification
      environment: this.environment,
      releaseVersion: this.releaseVersion,
      buildId: this.buildId,
      isDevelopment: true,
      isProduction: false,

      // 🏗️ Application Settings
      app: {
        name: 'Mosa Forge Development',
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost',
        baseUrl: process.env.BASE_URL || 'http://localhost:3000',
        cors: {
          origin: [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5173',
            'http://127.0.0.1:3000'
          ],
          credentials: true
        }
      },

      // 🏗️ Database Configuration
      database: {
        url: process.env.DATABASE_URL || 'postgresql://mosa_forge:dev_password@localhost:5432/mosa_forge_dev',
        pool: {
          min: 2,
          max: 10,
          acquireTimeoutMillis: 30000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 100
        },
        logging: {
          enabled: true,
          level: 'query', // query, error, info, warn
          slowQueryThreshold: 1000 // ms
        },
        ssl: false
      },

      // 🏗️ Redis Configuration
      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null,
        db: 0,
        keyPrefix: 'mosa_dev:',
        ttl: {
          session: 86400, // 24 hours
          cache: 3600, // 1 hour
          rateLimit: 60 // 1 minute
        }
      },

      // 🏗️ Authentication & Security
      auth: {
        jwt: {
          secret: process.env.JWT_SECRET || 'development_jwt_secret_change_in_production',
          algorithm: 'HS256',
          accessToken: {
            expiresIn: '24h',
            issuer: 'mosa-forge-dev'
          },
          refreshToken: {
            expiresIn: '7d',
            issuer: 'mosa-forge-dev'
          }
        },
        fayda: {
          enabled: false, // Disabled in development
          mock: true,
          mockResponse: {
            success: true,
            data: {
              id: 'FAYDA_123456789',
              name: 'Development User',
              status: 'VERIFIED'
            }
          }
        },
        otp: {
          enabled: true,
          mock: true,
          length: 6,
          expiresIn: 300, // 5 minutes
          provider: 'mock' // mock, twilio, aws-sns
        }
      },

      // 🏗️ Payment Configuration
      payment: {
        enabled: true,
        mock: true,
        bundlePrice: 1999,
        revenueSplit: {
          mosa: 1000,
          expert: 999
        },
        payoutSchedule: [333, 333, 333],
        gateways: {
          telebirr: {
            enabled: false,
            mock: true,
            baseUrl: 'https://api.telebirr.com/dev',
            apiKey: 'telebirr_dev_key',
            callbackUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/payments/telebirr/callback`
          },
          cbebirr: {
            enabled: false,
            mock: true,
            baseUrl: 'https://api.cbebirr.com/dev',
            apiKey: 'cbebirr_dev_key',
            callbackUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/api/payments/cbebirr/callback`
          },
          mock: {
            enabled: true,
            successRate: 1.0, // 100% success in development
            delay: 1000 // 1 second processing delay
          }
        }
      },

      // 🏗️ Quality Guarantee System
      quality: {
        enabled: true,
        thresholds: {
          expert: {
            minimumScore: 3.5, // Lowered for development
            targetScore: 4.0,
            masterTier: 4.5
          },
          completion: {
            minimumRate: 0.6, // 60% for development
            targetRate: 0.7
          },
          response: {
            maximumTime: 48, // 48 hours in development
            targetTime: 24
          }
        },
        monitoring: {
          interval: 300000, // 5 minutes in development
          realTime: false
        }
      },

      // 🏗️ Expert Network Configuration
      expert: {
        tiers: {
          master: {
            minScore: 4.5,
            maxStudents: 100,
            bonusMultiplier: 1.2
          },
          senior: {
            minScore: 4.3,
            maxStudents: 50,
            bonusMultiplier: 1.1
          },
          standard: {
            minScore: 4.0,
            maxStudents: 25,
            bonusMultiplier: 1.0
          }
        },
        onboarding: {
          autoApprove: true, // Auto-approve in development
          documentVerification: {
            required: false,
            autoVerify: true
          }
        }
      },

      // 🏗️ Learning Engine Configuration
      learning: {
        phases: {
          mindset: {
            duration: 28, // 28 days
            exercises: 20,
            free: true
          },
          theory: {
            duration: 60, // 60 days
            exercises: 100,
            interactive: true
          },
          handsOn: {
            duration: 60, // 60 days
            sessions: 24,
            groupSize: 5
          },
          certification: {
            duration: 14, // 14 days
            assessment: true,
            yachiIntegration: false // Disabled in development
          }
        },
        duolingo: {
          enabled: true,
          exerciseTypes: ['multiple_choice', 'scenario', 'interactive', 'decision'],
          progression: {
            masteryThreshold: 0.8,
            adaptiveDifficulty: true
          }
        }
      },

      // 🏗️ Email & Notifications
      notifications: {
        email: {
          enabled: false,
          provider: 'sendgrid',
          from: 'dev@mosaforge.com',
          templates: {
            welcome: 'dev_welcome_template',
            enrollment: 'dev_enrollment_template',
            completion: 'dev_completion_template'
          }
        },
        sms: {
          enabled: false,
          provider: 'twilio',
          from: '+251900000000'
        },
        push: {
          enabled: true,
          provider: 'expo'
        }
      },

      // 🏗️ Monitoring & Logging
      monitoring: {
        enabled: true,
        level: 'debug',
        services: {
          console: true,
          file: true,
          remote: false
        },
        metrics: {
          enabled: true,
          port: 9090,
          path: '/metrics'
        }
      },

      // 🏗️ Analytics & Tracking
      analytics: {
        enabled: true,
        mixpanel: {
          token: process.env.MIXPANEL_TOKEN || 'dev_mixpanel_token',
          enabled: false
        },
        internal: {
          enabled: true,
          retention: 30 // days
        }
      },

      // 🏗️ File Storage
      storage: {
        provider: 'local', // local, s3, azure
        local: {
          path: './storage/uploads'
        },
        s3: {
          enabled: false,
          bucket: 'mosa-forge-dev',
          region: 'us-east-1'
        },
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB
          portfolioImages: 10,
          certificates: 5
        }
      },

      // 🏗️ API Rate Limiting
      rateLimiting: {
        enabled: true,
        general: {
          windowMs: 60000, // 1 minute
          max: 100 // requests per window
        },
        auth: {
          windowMs: 60000,
          max: 10
        },
        payments: {
          windowMs: 60000,
          max: 30
        }
      },

      // 🏗️ Development-Specific Features
      development: {
        // 🎯 Mock Data Generation
        mockData: {
          enabled: true,
          students: {
            count: 50,
            skillsPerStudent: 2
          },
          experts: {
            count: 20,
            skillsPerExpert: 3,
            qualityScores: {
              min: 3.5,
              max: 5.0
            }
          },
          enrollments: {
            count: 100,
            completionRate: 0.7
          }
        },

        // 🎯 Development Tools
        tools: {
          databaseReset: true,
          seedData: true,
          apiExplorer: true,
          debugEndpoints: true
        },

        // 🎯 Testing Configuration
        testing: {
          integration: {
            timeout: 30000,
            parallel: true
          },
          unit: {
            timeout: 5000,
            coverage: 0.7
          },
          e2e: {
            enabled: true,
            headless: false
          }
        },

        // 🎯 Development Overrides
        overrides: {
          skipPaymentVerification: true,
          skipExpertVerification: true,
          autoCompleteExercises: false,
          fastForwardTime: false
        }
      },

      // 🏗️ External Services
      services: {
        yachi: {
          enabled: false,
          baseUrl: 'https://api.yachi.com/dev',
          apiKey: 'yachi_dev_key'
        },
        fayda: {
          enabled: false,
          baseUrl: 'https://api.fayda.gov.et/dev',
          apiKey: 'fayda_dev_key'
        },
        telebirr: {
          enabled: false,
          baseUrl: 'https://api.telebirr.com/dev',
          apiKey: 'telebirr_dev_key'
        }
      },

      // 🏗️ Feature Flags
      features: {
        // 🎯 Core Platform Features
        multiCourseEnrollment: true,
        qualityGuarantee: true,
        expertTiers: true,
        revenueSharing: true,

        // 🎯 Learning Features
        duolingoEngine: true,
        mindsetPhase: true,
        handsOnTraining: true,
        certification: true,

        // 🎯 Payment Features
        installmentPlans: true,
        telebirrIntegration: false,
        cbebirrIntegration: false,

        // 🎯 Development Features
        mockMode: true,
        debugTools: true,
        apiDocumentation: true
      }
    };

    this._applyEnvironmentOverrides();
  }

  /**
   * 🏗️ Apply Environment-Specific Overrides
   * @private
   */
  _applyEnvironmentOverrides() {
    // Apply CI-specific configurations
    if (process.env.CI === 'true') {
      this.config.database.pool.min = 1;
      this.config.database.pool.max = 2;
      this.config.redis.ttl.session = 3600; // 1 hour in CI
      this.config.development.mockData.students.count = 10;
      this.config.development.mockData.experts.count = 5;
      this.config.development.tools.databaseReset = true;
    }

    // Apply Docker-specific configurations
    if (process.env.DOCKER === 'true') {
      this.config.database.host = 'postgres';
      this.config.redis.host = 'redis';
      this.config.app.host = '0.0.0.0';
    }

    // Apply testing-specific configurations
    if (process.env.NODE_ENV === 'test') {
      this.config.database.url = process.env.TEST_DATABASE_URL || 'postgresql://mosa_forge:test@localhost:5432/mosa_forge_test';
      this.config.redis.db = 1;
      this.config.rateLimiting.enabled = false;
      this.config.monitoring.enabled = false;
    }
  }

  /**
   * 🏗️ Get Configuration by Section
   * @param {string} section - Configuration section
   * @returns {Object} Configuration object
   */
  get(section = null) {
    if (!section) {
      return this.config;
    }

    const sections = section.split('.');
    let result = this.config;

    for (const sec of sections) {
      if (result[sec] === undefined) {
        throw new Error(`Configuration section '${section}' not found`);
      }
      result = result[sec];
    }

    return result;
  }

  /**
   * 🏗️ Validate Configuration Integrity
   * @returns {Object} Validation result
   */
  validate() {
    const issues = [];

    // Validate payment configuration
    if (this.config.payment.bundlePrice !== 1999) {
      issues.push('Bundle price must be 1999 ETB');
    }

    if (this.config.payment.revenueSplit.mosa + this.config.payment.revenueSplit.expert !== 1999) {
      issues.push('Revenue split must total 1999 ETB');
    }

    // Validate quality thresholds
    if (this.config.quality.thresholds.expert.minimumScore > this.config.quality.thresholds.expert.targetScore) {
      issues.push('Expert minimum score cannot be higher than target score');
    }

    // Validate database configuration
    if (!this.config.database.url) {
      issues.push('Database URL is required');
    }

    return {
      isValid: issues.length === 0,
      issues,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🏗️ Get Development-Specific Mock Data
   * @returns {Object} Mock data configuration
   */
  getMockData() {
    return {
      students: this.config.development.mockData.students,
      experts: this.config.development.mockData.experts,
      enrollments: this.config.development.mockData.enrollments,
      skills: this._getMockSkillsData()
    };
  }

  /**
   * 🏗️ Generate Mock Skills Data
   * @private
   */
  _getMockSkillsData() {
    return [
      {
        id: 'skill_forex',
        name: 'Forex Trading Mastery',
        category: 'online',
        packages: 5,
        duration: 120,
        exercises: 150,
        monthlyIncome: { min: 8000, max: 20000 }
      },
      {
        id: 'skill_graphic_design',
        name: 'Professional Graphic Design',
        category: 'online',
        packages: 5,
        duration: 120,
        exercises: 120,
        monthlyIncome: { min: 5000, max: 15000 }
      },
      {
        id: 'skill_woodworking',
        name: 'Professional Woodworking',
        category: 'offline',
        packages: 5,
        duration: 120,
        exercises: 100,
        monthlyIncome: { min: 6000, max: 18000 }
      }
    ];
  }

  /**
   * 🏗️ Get Feature Status
   * @param {string} feature - Feature name
   * @returns {boolean} Feature status
   */
  isFeatureEnabled(feature) {
    return this.config.features[feature] === true;
  }

  /**
   * 🏗️ Get Environment Summary
   * @returns {Object} Environment summary
   */
  getSummary() {
    const validation = this.validate();

    return {
      environment: this.environment,
      releaseVersion: this.releaseVersion,
      buildId: this.buildId,
      validation,
      features: {
        enabled: Object.keys(this.config.features).filter(f => this.config.features[f]),
        disabled: Object.keys(this.config.features).filter(f => !this.config.features[f])
      },
      services: {
        database: this.config.database.url ? 'configured' : 'missing',
        redis: this.config.redis.url ? 'configured' : 'missing',
        payment: this.config.payment.enabled ? 'enabled' : 'disabled',
        quality: this.config.quality.enabled ? 'enabled' : 'disabled'
      },
      security: {
        jwt: this.config.auth.jwt.secret !== 'development_jwt_secret_change_in_production' ? 'secure' : 'insecure',
        fayda: this.config.auth.fayda.enabled ? 'enabled' : 'disabled'
      }
    };
  }

  /**
   * 🏗️ Get Development Warnings
   * @returns {Array} Security and configuration warnings
   */
  getWarnings() {
    const warnings = [];

    // Security warnings
    if (this.config.auth.jwt.secret === 'development_jwt_secret_change_in_production') {
      warnings.push('Using default JWT secret. Change in production.');
    }

    if (this.config.auth.fayda.mock) {
      warnings.push('Fayda verification is mocked. Enable real verification in production.');
    }

    if (this.config.payment.mock) {
      warnings.push('Payment processing is mocked. Configure real payment gateways for production.');
    }

    // Configuration warnings
    if (this.config.quality.thresholds.expert.minimumScore < 4.0) {
      warnings.push('Quality thresholds are lowered for development.');
    }

    if (this.config.expert.onboarding.autoApprove) {
      warnings.push('Expert onboarding is auto-approved. Manual verification required in production.');
    }

    return warnings;
  }
}

// 🏗️ Enterprise Export Pattern
module.exports = DevelopmentConfig;

// 🏗️ Singleton Instance for Microservice Architecture
let developmentConfigInstance = null;

module.exports.getInstance = () => {
  if (!developmentConfigInstance) {
    developmentConfigInstance = new DevelopmentConfig();
    
    // Log initialization
    const summary = developmentConfigInstance.getSummary();
    const warnings = developmentConfigInstance.getWarnings();
    
    console.log('🚀 Mosa Forge Development Environment Initialized');
    console.log(`📦 Version: ${summary.releaseVersion}`);
    console.log(`🔧 Build: ${summary.buildId}`);
    console.log(`✅ Validation: ${summary.validation.isValid ? 'PASS' : 'FAIL'}`);
    
    if (warnings.length > 0) {
      console.log('⚠️  Development Warnings:');
      warnings.forEach(warning => console.log(`   - ${warning}`));
    }
  }
  
  return developmentConfigInstance;
};

// 🏗️ Helper function for quick configuration access
module.exports.getConfig = (section = null) => {
  const instance = module.exports.getInstance();
  return instance.get(section);
};