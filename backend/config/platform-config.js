/**
 * 🎯 MOSA FORGE: Enterprise Platform Configuration
 * 
 * @module PlatformConfig
 * @description Centralized platform configuration management with validation, encryption, and hot-reload
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Environment-aware configuration
 * - Encrypted sensitive data
 * - Validation schemas
 * - Hot-reload capabilities
 * - Feature flags
 * - Audit logging
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');

// 🏗️ Encryption Key (In production, use KMS or environment secrets)
const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 
  crypto.scryptSync('mosa-forge-enterprise-2024', 'salt', 32);
const ALGORITHM = 'aes-256-gcm';

/**
 * 🏗️ Enterprise Configuration Manager
 * @class PlatformConfig
 * @extends EventEmitter
 */
class PlatformConfig extends EventEmitter {
  constructor() {
    super();
    
    this._config = new Map();
    this._validators = new Map();
    this._encryptedFields = new Set();
    this._environment = process.env.NODE_ENV || 'development';
    this._lastReload = new Date();
    
    this._initializeValidators();
    this._loadConfiguration();
    this._startConfigWatcher();
  }

  /**
   * 🏗️ Initialize Enterprise Validators
   * @private
   */
  _initializeValidators() {
    // 🎯 Payment Configuration Validator
    this._validators.set('payment', (config) => {
      const schema = {
        bundlePrice: { type: 'number', min: 1999, max: 1999 },
        revenueSplit: {
          type: 'object',
          required: ['mosa', 'expert'],
          properties: {
            mosa: { type: 'number', min: 1000, max: 1000 },
            expert: { type: 'number', min: 999, max: 999 }
          }
        },
        payoutSchedule: {
          type: 'array',
          length: 3,
          items: {
            type: 'object',
            required: ['phase', 'amount'],
            properties: {
              phase: { type: 'string', enum: ['START', 'MIDPOINT', 'COMPLETION'] },
              amount: { type: 'number', min: 333, max: 333 }
            }
          }
        }
      };
      return this._validateSchema(config, schema, 'payment');
    });

    // 🎯 Quality Configuration Validator
    this._validators.set('quality', (config) => {
      const schema = {
        thresholds: {
          type: 'object',
          required: ['master', 'senior', 'standard', 'minimum'],
          properties: {
            master: { type: 'number', min: 4.7, max: 5.0 },
            senior: { type: 'number', min: 4.3, max: 4.6 },
            standard: { type: 'number', min: 4.0, max: 4.2 },
            minimum: { type: 'number', min: 3.5, max: 4.0 }
          }
        },
        autoEnforcement: {
          type: 'object',
          required: ['enabled', 'checkInterval', 'gracePeriod'],
          properties: {
            enabled: { type: 'boolean' },
            checkInterval: { type: 'number', min: 300000 }, // 5 minutes minimum
            gracePeriod: { type: 'number', min: 86400000 } // 24 hours minimum
          }
        }
      };
      return this._validateSchema(config, schema, 'quality');
    });

    // 🎯 Learning Configuration Validator
    this._validators.set('learning', (config) => {
      const schema = {
        phases: {
          type: 'object',
          required: ['mindset', 'theory', 'handsOn', 'certification'],
          properties: {
            mindset: {
              type: 'object',
              required: ['durationWeeks', 'cost', 'exercisesPerWeek'],
              properties: {
                durationWeeks: { type: 'number', min: 4, max: 4 },
                cost: { type: 'string', pattern: /^FREE$/ },
                exercisesPerWeek: { type: 'number', min: 5, max: 5 }
              }
            },
            theory: {
              type: 'object',
              required: ['durationMonths', 'exercisesTotal', 'advancementThreshold'],
              properties: {
                durationMonths: { type: 'number', min: 2, max: 2 },
                exercisesTotal: { type: 'number', min: 100 },
                advancementThreshold: { type: 'number', min: 0.8, max: 1.0 }
              }
            }
          }
        }
      };
      return this._validateSchema(config, schema, 'learning');
    });

    // 🎯 Platform Scaling Validator
    this._validators.set('scaling', (config) => {
      const schema = {
        limits: {
          type: 'object',
          required: ['expertStudents', 'studentCourses', 'sessionSize'],
          properties: {
            expertStudents: {
              type: 'object',
              required: ['master', 'senior', 'standard', 'developing', 'probation'],
              properties: {
                master: { type: 'number', min: 0 }, // Unlimited
                senior: { type: 'number', min: 100, max: 100 },
                standard: { type: 'number', min: 50, max: 50 },
                developing: { type: 'number', min: 25, max: 25 },
                probation: { type: 'number', min: 10, max: 10 }
              }
            },
            studentCourses: { type: 'number', min: 1, max: 5 },
            sessionSize: { type: 'number', min: 1, max: 5 }
          }
        },
        autoScaling: {
          type: 'object',
          required: ['enabled', 'metrics', 'thresholds'],
          properties: {
            enabled: { type: 'boolean' },
            metrics: {
              type: 'array',
              items: { type: 'string', enum: ['responseTime', 'errorRate', 'throughput'] }
            },
            thresholds: {
              type: 'object',
              required: ['responseTimeMs', 'errorRatePercent', 'cpuUsagePercent'],
              properties: {
                responseTimeMs: { type: 'number', min: 100 },
                errorRatePercent: { type: 'number', min: 0, max: 5 },
                cpuUsagePercent: { type: 'number', min: 0, max: 80 }
              }
            }
          }
        }
      };
      return this._validateSchema(config, schema, 'scaling');
    });
  }

  /**
   * 🏗️ Schema Validation Engine
   * @private
   */
  _validateSchema(config, schema, domain) {
    const errors = [];

    const validateObject = (obj, schema, path = '') => {
      if (schema.required && Array.isArray(schema.required)) {
        for (const field of schema.required) {
          if (obj[field] === undefined || obj[field] === null) {
            errors.push(`Missing required field: ${path}${field}`);
          }
        }
      }

      for (const [key, value] of Object.entries(obj)) {
        const fieldPath = path ? `${path}.${key}` : key;
        const fieldSchema = schema.properties?.[key];

        if (!fieldSchema) {
          errors.push(`Unknown field: ${fieldPath}`);
          continue;
        }

        // Type validation
        if (fieldSchema.type && typeof value !== fieldSchema.type) {
          errors.push(`Invalid type for ${fieldPath}: expected ${fieldSchema.type}, got ${typeof value}`);
        }

        // Number range validation
        if (fieldSchema.type === 'number') {
          if (fieldSchema.min !== undefined && value < fieldSchema.min) {
            errors.push(`Value too low for ${fieldPath}: ${value} < ${fieldSchema.min}`);
          }
          if (fieldSchema.max !== undefined && value > fieldSchema.max) {
            errors.push(`Value too high for ${fieldPath}: ${value} > ${fieldSchema.max}`);
          }
        }

        // String pattern validation
        if (fieldSchema.type === 'string' && fieldSchema.pattern) {
          if (!fieldSchema.pattern.test(value)) {
            errors.push(`Invalid format for ${fieldPath}: ${value}`);
          }
        }

        // Enum validation
        if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
          errors.push(`Invalid value for ${fieldPath}: ${value}. Allowed: ${fieldSchema.enum.join(', ')}`);
        }

        // Array validation
        if (fieldSchema.type === 'array') {
          if (!Array.isArray(value)) {
            errors.push(`Expected array for ${fieldPath}`);
          } else {
            if (fieldSchema.length && value.length !== fieldSchema.length) {
              errors.push(`Invalid array length for ${fieldPath}: expected ${fieldSchema.length}, got ${value.length}`);
            }
            if (fieldSchema.items) {
              value.forEach((item, index) => {
                if (fieldSchema.items.type === 'object') {
                  validateObject(item, fieldSchema.items, `${fieldPath}[${index}]`);
                }
              });
            }
          }
        }

        // Nested object validation
        if (fieldSchema.type === 'object' && fieldSchema.properties) {
          validateObject(value, fieldSchema, fieldPath);
        }
      }
    };

    validateObject(config, schema);

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed for ${domain}:\n${errors.join('\n')}`);
    }

    return true;
  }

  /**
   * 🏗️ Load and Validate All Configuration
   * @private
   */
  _loadConfiguration() {
    const startTime = performance.now();

    try {
      // 🎯 PAYMENT CONFIGURATION
      const paymentConfig = {
        bundlePrice: 1999,
        currency: 'ETB',
        revenueSplit: {
          mosa: 1000,
          expert: 999
        },
        payoutSchedule: [
          { phase: 'START', amount: 333, description: 'Course commencement' },
          { phase: 'MIDPOINT', amount: 333, description: '75% completion milestone' },
          { phase: 'COMPLETION', amount: 333, description: 'Certification achieved' }
        ],
        paymentGateways: {
          telebirr: {
            enabled: true,
            apiKey: this._encrypt(process.env.TELEBIRR_API_KEY || ''),
            merchantId: process.env.TELEBIRR_MERCHANT_ID,
            testMode: this._environment !== 'production'
          },
          cbebirr: {
            enabled: true,
            apiKey: this._encrypt(process.env.CBEBIRR_API_KEY || ''),
            merchantId: process.env.CBEBIRR_MERCHANT_ID,
            testMode: this._environment !== 'production'
          }
        },
        qualityBonuses: {
          master: { threshold: 4.7, bonus: 0.2, description: '20% bonus for Master tier' },
          senior: { threshold: 4.3, bonus: 0.1, description: '10% bonus for Senior tier' },
          standard: { threshold: 4.0, bonus: 0.0, description: 'Base rate for Standard tier' }
        },
        refundPolicy: {
          coolingPeriod: 7, // days
          proratedRefunds: true,
          administrativeFee: 200
        }
      };

      // 🎯 QUALITY CONFIGURATION
      const qualityConfig = {
        thresholds: {
          master: 4.7,
          senior: 4.3,
          standard: 4.0,
          minimum: 3.5
        },
        autoEnforcement: {
          enabled: true,
          checkInterval: 900000, // 15 minutes
          gracePeriod: 172800000, // 48 hours
          actions: {
            pauseEnrollments: true,
            tierDemotion: true,
            financialPenalties: true,
            retrainingRequired: true
          }
        },
        metrics: {
          completionRate: { weight: 0.3, threshold: 0.7 },
          averageRating: { weight: 0.25, threshold: 4.0 },
          responseTime: { weight: 0.2, threshold: 24 }, // hours
          studentSatisfaction: { weight: 0.15, threshold: 0.8 },
          progressRate: { weight: 0.1, threshold: 0.05 } // weekly
        },
        monitoring: {
          realTimeAlerts: true,
          dashboardRefresh: 30000, // 30 seconds
          retentionPeriod: 90 // days
        }
      };

      // 🎯 LEARNING CONFIGURATION
      const learningConfig = {
        phases: {
          mindset: {
            durationWeeks: 4,
            cost: 'FREE',
            exercisesPerWeek: 5,
            topics: [
              'Wealth Consciousness',
              'Discipline Building', 
              'Action Taking',
              'Financial Psychology'
            ],
            completionRequirement: 0.8
          },
          theory: {
            durationMonths: 2,
            exercisesTotal: 100,
            advancementThreshold: 0.85,
            features: {
              duolingoStyle: true,
              realTimeCharts: true,
              decisionScenarios: true,
              progressTracking: true
            }
          },
          handsOn: {
            durationMonths: 2,
            sessionSize: 5,
            features: {
              expertMatching: true,
              projectWorkspace: true,
              attendanceTracking: true,
              progressVerification: true
            }
          },
          certification: {
            durationWeeks: 2,
            features: {
              finalAssessment: true,
              yachiIntegration: true,
              employerPortal: true,
              incomeLaunchpad: true
            }
          }
        },
        progression: {
          masteryBased: true,
          adaptiveLearning: true,
          skillBranching: true
        }
      };

      // 🎯 PLATFORM SCALING CONFIGURATION
      const scalingConfig = {
        limits: {
          expertStudents: {
            master: 0, // 0 means unlimited
            senior: 100,
            standard: 50,
            developing: 25,
            probation: 10
          },
          studentCourses: 3,
          sessionSize: 5
        },
        autoScaling: {
          enabled: true,
          metrics: ['responseTime', 'errorRate', 'throughput', 'concurrentUsers'],
          thresholds: {
            responseTimeMs: 500,
            errorRatePercent: 2,
            cpuUsagePercent: 75,
            memoryUsagePercent: 80,
            concurrentUsers: 10000
          },
          scalingFactors: {
            expertCapacity: 1.5,
            sessionCapacity: 2.0,
            paymentThroughput: 3.0
          }
        },
        performance: {
          cacheTtl: 300, // seconds
          rateLimiting: {
            enabled: true,
            requestsPerMinute: 100,
            burstCapacity: 150
          },
          database: {
            poolSize: 20,
            connectionTimeout: 30000,
            queryTimeout: 10000
          }
        }
      };

      // 🎯 SECURITY CONFIGURATION
      const securityConfig = {
        authentication: {
          faydaIntegration: {
            enabled: true,
            apiEndpoint: process.env.FAYDA_API_ENDPOINT,
            apiKey: this._encrypt(process.env.FAYDA_API_KEY || ''),
            timeout: 10000
          },
          jwt: {
            secret: this._encrypt(process.env.JWT_SECRET || 'mosa-forge-super-secret'),
            expiresIn: '24h',
            refreshExpiresIn: '7d'
          },
          otp: {
            length: 6,
            expiresIn: 600, // 10 minutes
            maxAttempts: 3
          }
        },
        encryption: {
          algorithm: 'aes-256-gcm',
          keyRotation: 90, // days
          dataRetention: 365 // days
        },
        compliance: {
          dataProtection: true,
          auditLogging: true,
          privacyPolicy: true,
          termsOfService: true
        }
      };

      // 🎯 FEATURE FLAGS
      const featureFlags = {
        multiCourseEnrollment: true,
        expertQualityDashboard: true,
        realTimeAnalytics: true,
        yachiIntegration: true,
        paymentPlans: true,
        advancedReporting: true,
        mobileApp: true,
        adminPortal: true
      };

      // 🎯 VALIDATE AND STORE CONFIGURATIONS
      this._setValidatedConfig('payment', paymentConfig);
      this._setValidatedConfig('quality', qualityConfig);
      this._setValidatedConfig('learning', learningConfig);
      this._setValidatedConfig('scaling', scalingConfig);
      this._setValidatedConfig('security', securityConfig);
      this._setValidatedConfig('features', featureFlags);

      const loadTime = performance.now() - startTime;
      
      this.emit('config.loaded', {
        timestamp: new Date().toISOString(),
        environment: this._environment,
        loadTime,
        domains: Array.from(this._config.keys())
      });

      this._logSuccess('CONFIGURATION_LOADED', {
        domains: Array.from(this._config.keys()),
        loadTime: `${loadTime.toFixed(2)}ms`
      });

    } catch (error) {
      this._logError('CONFIGURATION_LOAD_FAILED', error);
      throw new Error(`Failed to load platform configuration: ${error.message}`);
    }
  }

  /**
   * 🏗️ Set Validated Configuration
   * @private
   */
  _setValidatedConfig(domain, config) {
    const validator = this._validators.get(domain);
    if (validator) {
      validator(config);
    }
    this._config.set(domain, Object.freeze(config));
  }

  /**
   * 🏗️ Configuration Hot-Reload Watcher
   * @private
   */
  _startConfigWatcher() {
    if (this._environment === 'production') {
      // In production, watch for configuration changes via Redis pub/sub
      setInterval(() => {
        this._checkForConfigUpdates();
      }, 60000); // Check every minute
    } else {
      // In development, watch file system for changes
      if (require('fs').watch) {
        require('fs').watch(__filename, () => {
          this._logInfo('CONFIG_FILE_CHANGED', { file: __filename });
          this._reloadConfiguration();
        });
      }
    }
  }

  /**
   * 🏗️ Check for Configuration Updates
   * @private
   */
  async _checkForConfigUpdates() {
    try {
      // This would integrate with your configuration service
      // For now, we'll just log and potentially reload
      this.emit('config.update.check', {
        timestamp: new Date().toISOString(),
        lastReload: this._lastReload
      });
    } catch (error) {
      this._logError('CONFIG_UPDATE_CHECK_FAILED', error);
    }
  }

  /**
   * 🏗️ Hot-Reload Configuration
   * @private
   */
  _reloadConfiguration() {
    this.emit('config.reload.started');
    try {
      this._loadConfiguration();
      this._lastReload = new Date();
      this.emit('config.reload.completed');
    } catch (error) {
      this.emit('config.reload.failed', { error: error.message });
      this._logError('CONFIG_RELOAD_FAILED', error);
    }
  }

  /**
   * 🏗️ Encryption for Sensitive Data
   * @private
   */
  _encrypt(text) {
    if (!text) return '';
    
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
      cipher.setAAD(Buffer.from('mosa-forge'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    } catch (error) {
      this._logError('ENCRYPTION_FAILED', error);
      return '';
    }
  }

  /**
   * 🏗️ Decryption for Sensitive Data
   * @private
   */
  _decrypt(encryptedText) {
    if (!encryptedText) return '';
    
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) throw new Error('Invalid encrypted format');
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const authTag = Buffer.from(parts[2], 'hex');
      
      const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
      decipher.setAAD(Buffer.from('mosa-forge'));
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      this._logError('DECRYPTION_FAILED', error);
      return '';
    }
  }

  /**
   * 🎯 PUBLIC API: Get Configuration Domain
   * @param {string} domain - Configuration domain
   * @returns {Object} Configuration object
   */
  get(domain) {
    if (!this._config.has(domain)) {
      throw new Error(`Configuration domain not found: ${domain}`);
    }

    const config = this._config.get(domain);
    
    // Decrypt sensitive fields when accessing
    return this._decryptSensitiveFields(domain, config);
  }

  /**
   * 🏗️ Decrypt Sensitive Fields on Access
   * @private
   */
  _decryptSensitiveFields(domain, config) {
    const decryptedConfig = JSON.parse(JSON.stringify(config));
    
    if (domain === 'payment') {
      if (decryptedConfig.paymentGateways?.telebirr?.apiKey) {
        decryptedConfig.paymentGateways.telebirr.apiKey = 
          this._decrypt(decryptedConfig.paymentGateways.telebirr.apiKey);
      }
      if (decryptedConfig.paymentGateways?.cbebirr?.apiKey) {
        decryptedConfig.paymentGateways.cbebirr.apiKey = 
          this._decrypt(decryptedConfig.paymentGateways.cbebirr.apiKey);
      }
    }
    
    if (domain === 'security') {
      if (decryptedConfig.authentication?.faydaIntegration?.apiKey) {
        decryptedConfig.authentication.faydaIntegration.apiKey = 
          this._decrypt(decryptedConfig.authentication.faydaIntegration.apiKey);
      }
      if (decryptedConfig.authentication?.jwt?.secret) {
        decryptedConfig.authentication.jwt.secret = 
          this._decrypt(decryptedConfig.authentication.jwt.secret);
      }
    }
    
    return Object.freeze(decryptedConfig);
  }

  /**
   * 🎯 PUBLIC API: Get All Configuration
   * @returns {Object} All configuration domains
   */
  getAll() {
    const allConfig = {};
    for (const [domain] of this._config) {
      allConfig[domain] = this.get(domain);
    }
    return Object.freeze(allConfig);
  }

  /**
   * 🎯 PUBLIC API: Check Feature Flag
   * @param {string} feature - Feature name
   * @returns {boolean} Feature enabled status
   */
  isFeatureEnabled(feature) {
    const features = this.get('features');
    return !!features[feature];
  }

  /**
   * 🎯 PUBLIC API: Get Environment
   * @returns {string} Current environment
   */
  getEnvironment() {
    return this._environment;
  }

  /**
   * 🎯 PUBLIC API: Get Service Status
   * @returns {Object} Service status information
   */
  getStatus() {
    return {
      environment: this._environment,
      domains: Array.from(this._config.keys()),
      lastReload: this._lastReload.toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      validators: Array.from(this._validators.keys())
    };
  }

  /**
   * 🏗️ Enterprise Logging
   * @private
   */
  _logEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'platform-config',
      event: eventType,
      data,
      environment: this._environment
    };

    console.log(JSON.stringify(logEntry));
  }

  /**
   * 🏗️ Success Logging
   * @private
   */
  _logSuccess(operation, data) {
    this._logEvent('SUCCESS', {
      operation,
      ...data,
      severity: 'INFO'
    });
  }

  /**
   * 🏗️ Error Logging
   * @private
   */
  _logError(operation, error, context = {}) {
    this._logEvent('ERROR', {
      operation,
      error: {
        message: error.message,
        stack: error.stack
      },
      context,
      severity: 'ERROR'
    });
  }

  /**
   * 🏗️ Info Logging
   * @private
   */
  _logInfo(operation, data) {
    this._logEvent('INFO', {
      operation,
      ...data,
      severity: 'INFO'
    });
  }
}

// 🏗️ Singleton Instance for Enterprise Usage
let configInstance = null;

/**
 * 🎯 Get Platform Configuration Instance
 * @returns {PlatformConfig} Configuration instance
 */
const getPlatformConfig = () => {
  if (!configInstance) {
    configInstance = new PlatformConfig();
  }
  return configInstance;
};

// 🏗️ Enterprise Export Pattern
module.exports = {
  PlatformConfig,
  getPlatformConfig
};

// 🏗️ Auto-initialize for immediate use
module.exports.config = getPlatformConfig();