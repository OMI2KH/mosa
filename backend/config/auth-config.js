// config/auth-config.js

/**
 * 🎯 ENTERPRISE AUTHENTICATION CONFIGURATION
 * Production-ready authentication system for Mosa Forge
 * Features: Fayda ID integration, JWT management, OTP systems, security policies
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const crypto = require('crypto');
const { EventEmitter } = require('events');

class AuthConfig extends EventEmitter {
  constructor() {
    super();
    this.env = process.env.NODE_ENV || 'development';
    this.initializeConfig();
    this.validateConfig();
  }

  /**
   * 🏗️ INITIALIZE ENTERPRISE AUTH CONFIGURATION
   */
  initializeConfig() {
    this.config = {
      // 🔐 JWT CONFIGURATION
      jwt: {
        secret: process.env.JWT_SECRET || this.generateSecureSecret(),
        issuer: 'mosa-forge-enterprise',
        audience: 'mosa-forge-users',
        algorithms: ['HS256'],
        expiration: {
          access: '24h',           // Standard access token
          refresh: '7d',           // Refresh token
          shortLived: '15m',       // Short-lived operations
          faydaVerification: '10m' // Fayda ID verification
        },
        claims: {
          version: '1.0',
          platform: 'mosa-forge'
        }
      },

      // 🆔 FAYDA ID INTEGRATION
      fayda: {
        baseUrl: process.env.FAYDA_BASE_URL || 'https://api.fayda.gov.et/v1',
        apiKey: process.env.FAYDA_API_KEY,
        timeout: 10000, // 10 seconds
        retryAttempts: 3,
        endpoints: {
          verification: '/identity/verify',
          biometric: '/biometric/verify',
          duplicate: '/identity/check-duplicate'
        },
        validation: {
          minAge: 18,
          maxAge: 100,
          allowedNationalities: ['ET'],
          requiredFields: ['firstName', 'lastName', 'dateOfBirth', 'gender']
        }
      },

      // 📱 OTP CONFIGURATION
      otp: {
        length: 6,
        alphabet: '0123456789',
        expiration: 10 * 60 * 1000, // 10 minutes
        maxAttempts: 3,
        cooldownPeriod: 5 * 60 * 1000, // 5 minutes
        providers: {
          sms: {
            primary: 'twilio',
            fallback: 'ethio-telecom',
            timeout: 5000
          },
          email: {
            primary: 'sendgrid',
            fallback: 'ses',
            timeout: 5000
          }
        },
        templates: {
          sms: {
            registration: 'Your Mosa Forge verification code is: {code}',
            login: 'Your Mosa Forge login code is: {code}',
            recovery: 'Your Mosa Forge recovery code is: {code}'
          },
          email: {
            registration: 'email-verification.html',
            login: 'login-verification.html',
            recovery: 'password-recovery.html'
          }
        }
      },

      // 🔒 PASSWORD POLICY
      password: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
        history: 5, // Remember last 5 passwords
        lockout: {
          maxAttempts: 5,
          lockoutTime: 15 * 60 * 1000, // 15 minutes
          resetTime: 24 * 60 * 60 * 1000 // 24 hours
        }
      },

      // 🛡️ SECURITY POLICIES
      security: {
        // Session management
        session: {
          maxConcurrentSessions: 3,
          idleTimeout: 30 * 60 * 1000, // 30 minutes
          absoluteTimeout: 24 * 60 * 60 * 1000, // 24 hours
          renewOnActivity: true
        },

        // Rate limiting
        rateLimiting: {
          login: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            maxAttempts: 5,
            blockDuration: 30 * 60 * 1000 // 30 minutes
          },
          otp: {
            windowMs: 60 * 60 * 1000, // 1 hour
            maxRequests: 10,
            blockDuration: 2 * 60 * 60 * 1000 // 2 hours
          },
          fayda: {
            windowMs: 24 * 60 * 60 * 1000, // 24 hours
            maxRequests: 1000
          }
        },

        // Headers and CORS
        headers: {
          hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true
          },
          cors: {
            origins: this.getAllowedOrigins(),
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
            credentials: true,
            maxAge: 86400 // 24 hours
          },
          contentSecurity: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"]
          }
        },

        // Biometric authentication
        biometric: {
          enabled: true,
          required: false,
          fallback: 'otp',
          platforms: {
            android: {
              minSdk: 23,
              supportedTypes: ['FINGERPRINT', 'FACE']
            },
            ios: {
              minVersion: '13.0',
              supportedTypes: ['TOUCH_ID', 'FACE_ID']
            }
          }
        }
      },

      // 👥 ROLE-BASED ACCESS CONTROL (RBAC)
      rbac: {
        roles: {
          student: {
            permissions: [
              'course:read', 'course:enroll', 'payment:make',
              'expert:rate', 'session:join', 'progress:view'
            ],
            inherits: ['user']
          },
          expert: {
            permissions: [
              'student:manage', 'session:create', 'session:manage',
              'earnings:view', 'portfolio:manage', 'rating:view'
            ],
            inherits: ['user']
          },
          admin: {
            permissions: [
              'user:manage', 'expert:verify', 'payment:view',
              'analytics:view', 'system:manage', 'quality:monitor'
            ],
            inherits: ['user']
          },
          super_admin: {
            permissions: ['*'],
            inherits: ['admin']
          }
        },
        scopes: {
          user: ['profile:read', 'profile:update', 'auth:logout'],
          enterprise: ['reports:generate', 'bulk:operations']
        }
      },

      // 🔐 ENCRYPTION CONFIGURATION
      encryption: {
        algorithm: 'aes-256-gcm',
        key: process.env.ENCRYPTION_KEY || this.generateEncryptionKey(),
        ivLength: 16,
        saltRounds: 12 // For bcrypt
      },

      // 📊 AUDIT AND COMPLIANCE
      audit: {
        enabled: true,
        logLevel: 'info',
        events: [
          'login', 'logout', 'registration', 'password_change',
          'fayda_verification', 'role_change', 'suspicious_activity'
        ],
        retention: {
          logs: 365, // days
          sessions: 90, // days
          auditTrails: 7 // years
        }
      },

      // 🚀 PERFORMANCE AND SCALING
      performance: {
        cache: {
          session: {
            ttl: 3600, // 1 hour
            maxItems: 10000
          },
          otp: {
            ttl: 600, // 10 minutes
            maxItems: 50000
          },
          fayda: {
            ttl: 86400, // 24 hours
            maxItems: 100000
          }
        },
        connection: {
          pool: {
            min: 2,
            max: 20,
            acquireTimeout: 30000,
            idleTimeout: 30000
          },
          timeout: 10000,
          retry: {
            attempts: 3,
            backoff: 'exponential'
          }
        }
      },

      // 🌍 REGIONAL COMPLIANCE
      compliance: {
        ethiopia: {
          dataProtection: true,
          dataLocalization: true,
          governmentAccess: true,
          ageVerification: true
        },
        gdpr: {
          enabled: true,
          dataPortability: true,
          rightToErasure: true
        }
      }
    };
  }

  /**
   * 🛡️ VALIDATE CONFIGURATION ON STARTUP
   */
  validateConfig() {
    const errors = [];

    // JWT Secret validation
    if (!process.env.JWT_SECRET) {
      this.logger.warn('JWT_SECRET not set, using generated secret - not recommended for production');
    } else if (process.env.JWT_SECRET.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long');
    }

    // Fayda API validation
    if (!process.env.FAYDA_API_KEY) {
      errors.push('FAYDA_API_KEY is required for identity verification');
    }

    // Encryption key validation
    if (!process.env.ENCRYPTION_KEY) {
      this.logger.warn('ENCRYPTION_KEY not set, using generated key - not recommended for production');
    }

    // Environment-specific validations
    if (this.env === 'production') {
      if (!process.env.JWT_SECRET) {
        errors.push('JWT_SECRET must be set in production environment');
      }
      if (!process.env.ENCRYPTION_KEY) {
        errors.push('ENCRYPTION_KEY must be set in production environment');
      }
    }

    if (errors.length > 0) {
      const errorMessage = `Auth configuration validation failed:\n${errors.join('\n')}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.info('Auth configuration validated successfully');
  }

  /**
   * 🔧 GET ALLOWED ORIGINS BASED ON ENVIRONMENT
   */
  getAllowedOrigins() {
    const defaultOrigins = [
      'https://mosaforge.com',
      'https://www.mosaforge.com',
      'https://app.mosaforge.com'
    ];

    const environmentOrigins = {
      development: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        ...defaultOrigins
      ],
      staging: [
        'https://staging.mosaforge.com',
        'https://beta.mosaforge.com',
        ...defaultOrigins
      ],
      production: defaultOrigins
    };

    return environmentOrigins[this.env] || defaultOrigins;
  }

  /**
   * 🔑 GENERATE SECURE SECRET FOR JWT
   */
  generateSecureSecret() {
    const secret = crypto.randomBytes(64).toString('hex');
    this.logger.warn(`Generated JWT secret: ${secret.substring(0, 16)}...`);
    return secret;
  }

  /**
   * 🔐 GENERATE ENCRYPTION KEY
   */
  generateEncryptionKey() {
    const key = crypto.randomBytes(32).toString('hex');
    this.logger.warn(`Generated encryption key: ${key.substring(0, 16)}...`);
    return key;
  }

  /**
   * 🎯 GET ROLE PERMISSIONS
   */
  getRolePermissions(role) {
    const roleConfig = this.config.rbac.roles[role];
    if (!roleConfig) {
      throw new Error(`Invalid role: ${role}`);
    }

    const permissions = new Set(roleConfig.permissions);
    
    // Handle role inheritance
    if (roleConfig.inherits) {
      roleConfig.inherits.forEach(inheritedRole => {
        const inheritedPermissions = this.getRolePermissions(inheritedRole);
        inheritedPermissions.forEach(permission => permissions.add(permission));
      });
    }

    return Array.from(permissions);
  }

  /**
   * ✅ CHECK PERMISSION
   */
  hasPermission(role, permission) {
    const permissions = this.getRolePermissions(role);
    
    // Wildcard permission
    if (permissions.includes('*')) {
      return true;
    }

    // Exact permission match
    if (permissions.includes(permission)) {
      return true;
    }

    // Pattern matching (e.g., 'user:read' matches 'user:*')
    const permissionParts = permission.split(':');
    if (permissionParts.length === 2) {
      const wildcardPermission = `${permissionParts[0]}:*`;
      if (permissions.includes(wildcardPermission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 📱 GET OTP TEMPLATE
   */
  getOtpTemplate(type, provider = 'sms') {
    const template = this.config.otp.templates[provider]?.[type];
    if (!template) {
      throw new Error(`OTP template not found for type: ${type}, provider: ${provider}`);
    }
    return template;
  }

  /**
   * 🕒 GET EXPIRATION TIMESTAMP
   */
  getExpirationTimestamp(type) {
    const expiration = this.config.jwt.expiration[type];
    if (!expiration) {
      throw new Error(`Invalid expiration type: ${type}`);
    }

    const now = Date.now();
    let milliseconds;

    if (typeof expiration === 'string') {
      const unit = expiration.slice(-1);
      const value = parseInt(expiration.slice(0, -1));

      switch (unit) {
        case 's': milliseconds = value * 1000; break;
        case 'm': milliseconds = value * 60 * 1000; break;
        case 'h': milliseconds = value * 60 * 60 * 1000; break;
        case 'd': milliseconds = value * 24 * 60 * 60 * 1000; break;
        default: milliseconds = value;
      }
    } else {
      milliseconds = expiration;
    }

    return now + milliseconds;
  }

  /**
   * 🔍 VALIDATE PASSWORD STRENGTH
   */
  validatePasswordStrength(password) {
    const policy = this.config.password;
    const errors = [];

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 🌐 GET FAYDA ENDPOINT
   */
  getFaydaEndpoint(endpoint) {
    const endpointPath = this.config.fayda.endpoints[endpoint];
    if (!endpointPath) {
      throw new Error(`Invalid Fayda endpoint: ${endpoint}`);
    }
    return `${this.config.fayda.baseUrl}${endpointPath}`;
  }

  /**
   * 📊 GET CACHE CONFIG
   */
  getCacheConfig(type) {
    const cacheConfig = this.config.performance.cache[type];
    if (!cacheConfig) {
      throw new Error(`Invalid cache type: ${type}`);
    }
    return cacheConfig;
  }

  /**
   * 🚀 GET ENVIRONMENT-SPECIFIC CONFIG
   */
  getEnvironmentConfig() {
    return {
      isDevelopment: this.env === 'development',
      isStaging: this.env === 'staging',
      isProduction: this.env === 'production',
      name: this.env
    };
  }

  /**
   * 🔔 CONFIG UPDATE HANDLER
   */
  updateConfig(newConfig) {
    // Validate new config before applying
    this.validateConfigUpdate(newConfig);
    
    // Emit config change event
    this.emit('configUpdate', {
      oldConfig: { ...this.config },
      newConfig,
      timestamp: new Date()
    });

    // Apply updates
    this.config = { ...this.config, ...newConfig };
    
    this.logger.info('Auth configuration updated successfully');
  }

  /**
   * 🛡️ VALIDATE CONFIG UPDATE
   */
  validateConfigUpdate(newConfig) {
    const forbiddenUpdates = ['jwt.secret', 'encryption.key'];
    
    Object.keys(newConfig).forEach(key => {
      if (forbiddenUpdates.includes(key)) {
        throw new Error(`Cannot update sensitive configuration: ${key}`);
      }
    });
  }

  /**
   * 📝 LOGGER INTEGRATION
   */
  get logger() {
    return require('../utils/logger')('AuthConfig');
  }

  /**
   * 🎯 GET COMPLETE CONFIG (FOR DEBUGGING)
   */
  getCompleteConfig() {
    // Return safe copy without sensitive data
    const safeConfig = JSON.parse(JSON.stringify(this.config));
    
    // Redact sensitive information
    if (safeConfig.jwt.secret) {
      safeConfig.jwt.secret = '***REDACTED***';
    }
    if (safeConfig.encryption.key) {
      safeConfig.encryption.key = '***REDACTED***';
    }
    if (safeConfig.fayda.apiKey) {
      safeConfig.fayda.apiKey = '***REDACTED***';
    }

    return safeConfig;
  }
}

// Export singleton instance
module.exports = new AuthConfig();