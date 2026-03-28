// auth-service/password-recovery.js

/**
 * 🏢 MOSA FORGE - Enterprise Password Recovery Service
 * 🔐 Secure password reset with multi-factor authentication & Fayda ID integration
 * 💰 Revenue-protected security system for 1,999 ETB bundle platform
 * 🛡️ Quality-guaranteed authentication with auto-enforcement
 * 
 * @module PasswordRecoveryService
 * @version Enterprise 1.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Redis = require('@redis/client');
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

// Enterprise Dependencies
const EnterpriseLogger = require('./utils/enterprise-logger');
const SecurityMetrics = require('./utils/security-metrics');
const QualityEnforcer = require('./utils/quality-enforcer');
const RateLimitManager = require('./utils/rate-limit-manager');
const AuditLogger = require('./utils/audit-logger');

class PasswordRecoveryService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 🏗️ ENTERPRISE CONFIGURATION
    this.config = {
      // 🔐 Security Configuration
      tokenExpiry: 900, // 15 minutes for 1,999 ETB security
      maxAttempts: 3, // Quality-guaranteed attempt limits
      tokenLength: 64, // Bank-level security
      
      // 🎯 MOSA FORGE Business Rules
      requireFaydaVerification: true, // Government ID integration
      requireQualityCheck: true, // Auto-enforcement system
      enableRevenueProtection: true, // Protect 1,999 ETB bundles
      
      // 📱 Multi-Channel Delivery
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: false, // Future enhancement
      
      // 🔒 Password Policy (Enterprise Grade)
      minPasswordLength: 8,
      requireSpecialChar: true,
      requireNumbers: true,
      requireUppercase: true,
      passwordHistory: 5, // Prevent reuse
      
      // 📊 Monitoring & Analytics
      enableRealTimeMetrics: true,
      enableQualityTracking: true,
      enableRevenueImpact: true,
      
      // 🚀 Performance Optimization
      redisCluster: true,
      databaseReplication: true,
      cacheLayers: 2,
      
      ...options
    };

    // 🏗️ ENTERPRISE SERVICE INITIALIZATION
    this.initializeEnterpriseServices();
    this.initializeBusinessRules();
    this.initializeSecuritySystems();
    
    this.stats = {
      recoveryRequests: 0,
      successfulRecoveries: 0,
      failedAttempts: 0,
      qualityEnforcements: 0,
      revenueProtected: 0,
      securityEvents: 0
    };

    this.initialized = false;
  }

  /**
   * 🏗️ Initialize Enterprise Services
   */
  initializeEnterpriseServices() {
    try {
      // 📊 Enterprise Logger
      this.logger = new EnterpriseLogger({
        service: 'password-recovery',
        module: 'authentication',
        environment: process.env.NODE_ENV
      });

      // 🛡️ Security Metrics
      this.metrics = new SecurityMetrics({
        service: 'password-recovery',
        businessUnit: 'auth-service'
      });

      // 🎯 Quality Enforcer
      this.qualityEnforcer = new QualityEnforcer({
        service: 'password-recovery',
        autoEnforcement: true,
        qualityThreshold: 4.0 // MOSA FORGE quality standard
      });

      // 🚦 Rate Limit Manager
      this.rateLimiter = new RateLimitManager({
        maxAttempts: this.config.maxAttempts,
        windowMs: 3600000, // 1 hour
        skipSuccessfulRequests: true
      });

      // 📝 Audit Logger
      this.auditLogger = new AuditLogger({
        service: 'password-recovery',
        retentionDays: 365
      });

      // 💾 Database Client
      this.prisma = new PrismaClient({
        log: ['warn', 'error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });

      // 🔄 Redis Cluster
      this.redis = Redis.createCluster({
        rootNodes: [
          { url: process.env.REDIS_URL_1 },
          { url: process.env.REDIS_URL_2 },
          { url: process.env.REDIS_URL_3 }
        ],
        defaults: {
          socket: {
            tls: true,
            connectTimeout: 10000,
            lazyConnect: false
          }
        }
      });

      this.logger.system('Enterprise services initialized', {
        service: 'password-recovery',
        features: Object.keys(this.config).filter(k => this.config[k] === true)
      });

    } catch (error) {
      this.logger.critical('Enterprise service initialization failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 💼 Initialize Business Rules
   */
  initializeBusinessRules() {
    this.businessRules = {
      // 💰 Revenue Protection Rules
      bundleProtection: {
        maxRecoveriesPerMonth: 3,
        requirePaymentVerification: true,
        protectActiveEnrollments: true
      },
      
      // 🎯 Quality Guarantee Rules
      qualityStandards: {
        minSuccessRate: 0.95,
        maxResponseTime: 5000, // 5 seconds
        requireMultiFactor: true,
        autoEscalation: true
      },
      
      // 🔐 Security Protocols
      securityProtocols: {
        faydaIntegration: true,
        biometricFallback: true,
        deviceFingerprinting: true,
        geographicValidation: true
      }
    };
  }

  /**
   * 🛡️ Initialize Security Systems
   */
  initializeSecuritySystems() {
    this.security = {
      // 🔑 Cryptographic Systems
      encryption: {
        algorithm: 'aes-256-gcm',
        key: process.env.ENCRYPTION_KEY,
        ivLength: 16
      },
      
      // 🎯 Token Management
      tokens: {
        generation: 'cryptographic',
        storage: 'encrypted',
        transmission: 'secure'
      },
      
      // 📱 Delivery Channels
      channels: {
        email: 'encrypted',
        sms: 'tokenized',
        push: 'secured'
      }
    };
  }

  /**
   * 🚀 INITIATE PASSWORD RECOVERY - Enterprise Grade
   */
  async initiateRecovery(identifier, context = {}) {
    const startTime = performance.now();
    const transactionId = this.generateTransactionId();

    try {
      // 🛡️ PRE-FLIGHT SECURITY CHECKS
      await this.performSecurityPreChecks(identifier, context);
      
      // 👤 USER IDENTIFICATION & FAYDA VERIFICATION
      const user = await this.identifyAndVerifyUser(identifier, context);
      if (!user) {
        return await this.handleSecureUserNotFound(identifier, context);
      }

      // 💰 REVENUE PROTECTION CHECK
      await this.validateRevenueProtection(user.id, context);

      // 🎯 QUALITY GUARANTEE VALIDATION
      await this.validateQualityStandards(user.id, context);

      // 🔐 TOKEN GENERATION & SECURE STORAGE
      const recoverySession = await this.createSecureRecoverySession(user, context);

      // 📱 MULTI-CHANNEL NOTIFICATION DELIVERY
      const deliveryResults = await this.dispatchRecoveryNotifications(user, recoverySession, context);

      // 📊 SUCCESS METRICS & AUDITING
      await this.recordSuccessfulInitiation(user, recoverySession, deliveryResults, context);

      const responseTime = performance.now() - startTime;

      this.logger.security('Password recovery initiated successfully', {
        transactionId,
        userId: user.id,
        identifier: this.maskSensitiveData(identifier),
        responseTime: responseTime.toFixed(2),
        deliveryMethods: deliveryResults.methods
      });

      return {
        success: true,
        transactionId,
        sessionId: recoverySession.sessionId,
        expiresAt: recoverySession.expiresAt,
        deliveryMethods: deliveryResults.methods,
        requiresMFA: user.mfaEnabled,
        message: 'Recovery instructions sent to your verified contact methods'
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      await this.handleRecoveryFailure(transactionId, identifier, error, context, responseTime);
      throw error;
    }
  }

  /**
   * 🛡️ PERFORM SECURITY PRE-CHECKS
   */
  async performSecurityPreChecks(identifier, context) {
    // 🚦 RATE LIMITING
    await this.enforceRateLimits(identifier, context);
    
    // 🌍 GEOGRAPHIC VALIDATION
    await this.validateGeographicLocation(context);
    
    // 📱 DEVICE FINGERPRINTING
    await this.validateDeviceFingerprint(context);
    
    // 🔍 MALICIOUS PATTERN DETECTION
    await this.detectMaliciousPatterns(identifier, context);
    
    this.logger.security('Security pre-checks completed', {
      identifier: this.maskSensitiveData(identifier),
      checks: ['rate_limiting', 'geographic', 'device', 'patterns']
    });
  }

  /**
   * 👤 IDENTIFY AND VERIFY USER
   */
  async identifyAndVerifyUser(identifier, context) {
    const user = await this.findUserByIdentifier(identifier);
    
    if (!user) {
      return null;
    }

    // 🆔 FAYDA ID VERIFICATION
    if (this.config.requireFaydaVerification && user.faydaId) {
      await this.verifyFaydaIdStatus(user.faydaId);
    }

    // 🎯 QUALITY STATUS CHECK
    await this.checkUserQualityStatus(user.id);

    // 🔐 ACCOUNT STATUS VALIDATION
    this.validateAccountStatus(user);

    return user;
  }

  /**
   * 💰 VALIDATE REVENUE PROTECTION
   */
  async validateRevenueProtection(userId, context) {
    const activeEnrollments = await this.prisma.enrollment.count({
      where: {
        userId,
        status: 'ACTIVE',
        bundlePrice: 1999 // 1,999 ETB bundle protection
      }
    });

    if (activeEnrollments > 0) {
      this.stats.revenueProtected++;
      this.logger.business('Revenue protection activated', {
        userId,
        activeEnrollments,
        bundleValue: '1999 ETB'
      });
    }

    // 🗓️ MONTHLY RECOVERY LIMITS
    const monthlyRecoveries = await this.prisma.passwordRecoveryAudit.count({
      where: {
        userId,
        action: 'RECOVERY_INITIATED',
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    if (monthlyRecoveries >= this.businessRules.bundleProtection.maxRecoveriesPerMonth) {
      throw new PasswordRecoveryError(
        'RECOVERY_LIMIT_EXCEEDED',
        'Monthly recovery limit exceeded for revenue protection',
        { limit: this.businessRules.bundleProtection.maxRecoveriesPerMonth }
      );
    }
  }

  /**
   * 🎯 VALIDATE QUALITY STANDARDS
   */
  async validateQualityStandards(userId, context) {
    const qualityMetrics = await this.qualityEnforcer.getUserQualityMetrics(userId);
    
    if (qualityMetrics.score < this.businessRules.qualityStandards.minSuccessRate) {
      throw new PasswordRecoveryError(
        'QUALITY_STANDARD_NOT_MET',
        'User quality standards not met for recovery',
        { currentScore: qualityMetrics.score, requiredScore: this.businessRules.qualityStandards.minSuccessRate }
      );
    }

    this.logger.quality('Quality standards validated', {
      userId,
      qualityScore: qualityMetrics.score,
      standard: this.businessRules.qualityStandards.minSuccessRate
    });
  }

  /**
   * 🔐 CREATE SECURE RECOVERY SESSION
   */
  async createSecureRecoverySession(user, context) {
    const sessionId = this.generateSessionId();
    const token = this.generateCryptographicToken();
    const expiresAt = Date.now() + (this.config.tokenExpiry * 1000);

    const recoverySession = {
      sessionId,
      userId: user.id,
      token: this.encryptToken(token),
      originalToken: token,
      expiresAt,
      attempts: 0,
      status: 'ACTIVE',
      context: this.sanitizeContext(context),
      createdAt: Date.now()
    };

    // 💾 SECURE STORAGE WITH ENCRYPTION
    await this.storeRecoverySessionSecurely(recoverySession);
    
    // 📝 ENTERPRISE AUDIT LOGGING
    await this.auditLogger.logRecoveryAction({
      action: 'SESSION_CREATED',
      userId: user.id,
      sessionId,
      ipAddress: context.ip,
      userAgent: context.userAgent,
      deviceInfo: context.deviceInfo
    });

    return recoverySession;
  }

  /**
   * 📱 DISPATCH RECOVERY NOTIFICATIONS
   */
  async dispatchRecoveryNotifications(user, recoverySession, context) {
    const deliveryResults = {
      methods: [],
      successes: 0,
      failures: 0
    };

    // 📧 ENTERPRISE EMAIL DELIVERY
    if (this.config.emailEnabled && user.email) {
      try {
        await this.sendEnterpriseRecoveryEmail(user, recoverySession, context);
        deliveryResults.methods.push('email');
        deliveryResults.successes++;
      } catch (error) {
        deliveryResults.failures++;
        this.logger.error('Enterprise email delivery failed', {
          userId: user.id,
          error: error.message
        });
      }
    }

    // 📱 ENTERPRISE SMS DELIVERY
    if (this.config.smsEnabled && user.phone) {
      try {
        await this.sendEnterpriseRecoverySMS(user, recoverySession, context);
        deliveryResults.methods.push('sms');
        deliveryResults.successes++;
      } catch (error) {
        deliveryResults.failures++;
        this.logger.error('Enterprise SMS delivery failed', {
          userId: user.id,
          error: error.message
        });
      }
    }

    if (deliveryResults.successes === 0) {
      throw new PasswordRecoveryError(
        'NOTIFICATION_DELIVERY_FAILED',
        'All notification delivery methods failed',
        { attempts: deliveryResults.failures }
      );
    }

    return deliveryResults;
  }

  /**
   * 📧 SEND ENTERPRISE RECOVERY EMAIL
   */
  async sendEnterpriseRecoveryEmail(user, recoverySession, context) {
    const emailData = {
      to: user.email,
      subject: 'MOSA FORGE - Secure Password Recovery Request',
      template: 'password-recovery-enterprise',
      data: {
        user: {
          firstName: user.firstName,
          lastName: user.lastName
        },
        recovery: {
          token: recoverySession.originalToken,
          expiresIn: this.config.tokenExpiry / 60,
          sessionId: recoverySession.sessionId
        },
        security: {
          ipAddress: context.ip,
          location: context.geoLocation,
          device: context.deviceInfo
        }
      }
    };

    // 🎯 ENTERPRISE EMAIL SERVICE INTEGRATION
    await this.emailService.sendTemplatedEmail(emailData);

    this.logger.notification('Enterprise recovery email dispatched', {
      userId: user.id,
      email: this.maskSensitiveData(user.email),
      template: emailData.template
    });
  }

  /**
   * 📱 SEND ENTERPRISE RECOVERY SMS
   */
  async sendEnterpriseRecoverySMS(user, recoverySession, context) {
    const smsData = {
      to: user.phone,
      message: `MOSA FORGE: Use ${recoverySession.originalToken} to reset your password. Expires in ${this.config.tokenExpiry / 60} minutes.`,
      template: 'password-recovery-sms',
      data: {
        token: recoverySession.originalToken,
        expiresIn: this.config.tokenExpiry / 60
      }
    };

    // 🎯 ENTERPRISE SMS SERVICE INTEGRATION
    await this.smsService.sendSecureSMS(smsData);

    this.logger.notification('Enterprise recovery SMS dispatched', {
      userId: user.id,
      phone: this.maskSensitiveData(user.phone),
      template: smsData.template
    });
  }

  /**
   * ✅ VERIFY RECOVERY TOKEN - Enterprise Grade
   */
  async verifyRecoveryToken(token, identifier, context = {}) {
    const startTime = performance.now();
    const verificationId = this.generateVerificationId();

    try {
      // 🛡️ TOKEN VALIDATION PIPELINE
      const validationResult = await this.executeTokenValidationPipeline(token, identifier, context);
      
      if (!validationResult.valid) {
        throw new PasswordRecoveryError(
          'TOKEN_VALIDATION_FAILED',
          'Recovery token validation failed',
          { reason: validationResult.reason }
        );
      }

      const { session, user } = validationResult;

      // 🎯 QUALITY METRICS UPDATE
      await this.updateQualityMetrics(user.id, 'token_verified', true);

      // 📊 SUCCESSFUL VERIFICATION METRICS
      this.metrics.recordVerificationSuccess({
        userId: user.id,
        sessionId: session.sessionId,
        responseTime: performance.now() - startTime
      });

      this.logger.security('Recovery token verified successfully', {
        verificationId,
        userId: user.id,
        sessionId: session.sessionId,
        responseTime: performance.now() - startTime
      });

      return {
        valid: true,
        sessionId: session.sessionId,
        userId: user.id,
        requiresMFA: user.mfaEnabled,
        expiresAt: session.expiresAt
      };

    } catch (error) {
      await this.handleVerificationFailure(verificationId, identifier, error, context);
      throw error;
    }
  }

  /**
   * 🔄 RESET PASSWORD - Enterprise Grade
   */
  async resetPassword(token, identifier, newPassword, mfaCode = null, context = {}) {
    const startTime = performance.now();
    const resetId = this.generateResetId();

    try {
      // ✅ TOKEN VERIFICATION
      const verification = await this.verifyRecoveryToken(token, identifier, context);
      
      if (!verification.valid) {
        throw new PasswordRecoveryError('INVALID_RECOVERY_TOKEN');
      }

      const { userId, sessionId, requiresMFA } = verification;

      // 🔐 MFA VERIFICATION
      if (requiresMFA) {
        await this.verifyMultiFactorAuthentication(userId, mfaCode, context);
      }

      // 🛡️ PASSWORD VALIDATION
      await this.validateEnterprisePassword(newPassword, userId);

      // 🔄 PASSWORD UPDATE
      await this.executeSecurePasswordUpdate(userId, newPassword, context);

      // 🚫 SESSION CLEANUP
      await this.invalidateRecoverySession(sessionId, 'password_reset_success');

      // 📊 PASSWORD CHANGE AUDIT
      await this.auditPasswordChange(userId, context);

      // 🎯 QUALITY METRICS
      await this.updateQualityMetrics(userId, 'password_reset', true);

      this.stats.successfulRecoveries++;

      this.logger.security('Password reset completed successfully', {
        resetId,
        userId,
        sessionId,
        responseTime: performance.now() - startTime
      });

      return {
        success: true,
        resetId,
        userId,
        timestamp: new Date().toISOString(),
        message: 'Password has been reset successfully. All active sessions have been terminated.'
      };

    } catch (error) {
      this.stats.failedAttempts++;
      
      await this.handlePasswordResetFailure(resetId, identifier, error, context);
      throw error;
    }
  }

  /**
   * 🛡️ EXECUTE SECURE PASSWORD UPDATE
   */
  async executeSecurePasswordUpdate(userId, newPassword, context) {
    const transaction = await this.prisma.$transaction(async (prisma) => {
      // 🔐 HASH NEW PASSWORD
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // 💾 UPDATE USER PASSWORD
      await prisma.user.update({
        where: { id: userId },
        data: { 
          password: hashedPassword,
          passwordChangedAt: new Date()
        }
      });

      // 📚 STORE PASSWORD HISTORY
      await prisma.passwordHistory.create({
        data: {
          userId,
          passwordHash: hashedPassword,
          changedAt: new Date(),
          changedBy: 'password_recovery_system',
          ipAddress: context.ip
        }
      });

      // 🧹 CLEANUP OLD PASSWORD HISTORY
      await this.cleanupPasswordHistory(userId);

      return hashedPassword;
    });

    // 🚫 INVALIDATE ALL ACTIVE SESSIONS
    await this.invalidateAllUserSessions(userId, 'password_change');

    return transaction;
  }

  /**
   * 📊 GET ENTERPRISE ANALYTICS
   */
  async getEnterpriseAnalytics(timeframe = '30d') {
    const analytics = {
      overview: await this.getRecoveryOverview(timeframe),
      successMetrics: await this.getSuccessMetrics(timeframe),
      qualityMetrics: await this.getQualityMetrics(timeframe),
      securityMetrics: await this.getSecurityMetrics(timeframe),
      businessImpact: await this.getBusinessImpact(timeframe)
    };

    return analytics;
  }

  /**
   * 🔧 UTILITY METHODS
   */

  generateTransactionId() {
    return `pwr_txn_${crypto.randomBytes(16).toString('hex')}`;
  }

  generateSessionId() {
    return `pwr_ses_${crypto.randomBytes(16).toString('hex')}`;
  }

  generateVerificationId() {
    return `pwr_ver_${crypto.randomBytes(16).toString('hex')}`;
  }

  generateResetId() {
    return `pwr_rst_${crypto.randomBytes(16).toString('hex')}`;
  }

  generateCryptographicToken() {
    return crypto.randomBytes(this.config.tokenLength / 2).toString('hex');
  }

  encryptToken(token) {
    const cipher = crypto.createCipher(this.security.encryption.algorithm, this.security.encryption.key);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decryptToken(encryptedToken) {
    const decipher = crypto.createDecipher(this.security.encryption.algorithm, this.security.encryption.key);
    let decrypted = decipher.update(encryptedToken, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  maskSensitiveData(data) {
    if (!data) return '***';
    if (data.includes('@')) {
      // Email masking
      const [name, domain] = data.split('@');
      return `${name.substring(0, 2)}***@${domain}`;
    } else {
      // Phone masking
      return data.replace(/(\d{3})\d+(\d{3})/, '$1***$2');
    }
  }

  sanitizeContext(context) {
    const sanitized = { ...context };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.mfaCode;
    return sanitized;
  }

  /**
   * 🎯 ENTERPRISE ERROR HANDLING
   */
  async handleRecoveryFailure(transactionId, identifier, error, context, responseTime) {
    this.stats.failedAttempts++;
    
    this.logger.error('Password recovery initiation failed', {
      transactionId,
      identifier: this.maskSensitiveData(identifier),
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2),
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logRecoveryAction({
      action: 'RECOVERY_FAILED',
      identifier: this.maskSensitiveData(identifier),
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ip,
      userAgent: context.userAgent
    });

    this.metrics.recordRecoveryFailure({
      errorCode: error.code,
      identifier: this.maskSensitiveData(identifier),
      responseTime
    });
  }

  async handleVerificationFailure(verificationId, identifier, error, context) {
    this.logger.error('Recovery token verification failed', {
      verificationId,
      identifier: this.maskSensitiveData(identifier),
      error: error.message,
      errorCode: error.code,
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logRecoveryAction({
      action: 'VERIFICATION_FAILED',
      identifier: this.maskSensitiveData(identifier),
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ip
    });
  }

  async handlePasswordResetFailure(resetId, identifier, error, context) {
    this.logger.error('Password reset failed', {
      resetId,
      identifier: this.maskSensitiveData(identifier),
      error: error.message,
      errorCode: error.code,
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logRecoveryAction({
      action: 'PASSWORD_RESET_FAILED',
      identifier: this.maskSensitiveData(identifier),
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ip
    });
  }
}

/**
 * 🎯 ENTERPRISE ERROR CLASS
 */
class PasswordRecoveryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'PasswordRecoveryError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }
}

// 🎯 ENTERPRISE ERROR CODES
PasswordRecoveryError.CODES = {
  // 🔐 Security Errors
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_GEO_LOCATION: 'INVALID_GEO_LOCATION',
  SUSPICIOUS_DEVICE: 'SUSPICIOUS_DEVICE',
  MALICIOUS_PATTERN_DETECTED: 'MALICIOUS_PATTERN_DETECTED',
  
  // 👤 User Errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  FAYDA_VERIFICATION_FAILED: 'FAYDA_VERIFICATION_FAILED',
  
  // 💰 Business Errors
  RECOVERY_LIMIT_EXCEEDED: 'RECOVERY_LIMIT_EXCEEDED',
  REVENUE_PROTECTION_ACTIVE: 'REVENUE_PROTECTION_ACTIVE',
  QUALITY_STANDARD_NOT_MET: 'QUALITY_STANDARD_NOT_MET',
  
  // 🔐 Token Errors
  INVALID_RECOVERY_TOKEN: 'INVALID_RECOVERY_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_VALIDATION_FAILED: 'TOKEN_VALIDATION_FAILED',
  
  // 📱 Notification Errors
  NOTIFICATION_DELIVERY_FAILED: 'NOTIFICATION_DELIVERY_FAILED',
  
  // 🔐 MFA Errors
  MFA_REQUIRED: 'MFA_REQUIRED',
  INVALID_MFA_CODE: 'INVALID_MFA_CODE',
  
  // 🔐 Password Errors
  PASSWORD_VALIDATION_FAILED: 'PASSWORD_VALIDATION_FAILED',
  PASSWORD_HISTORY_VIOLATION: 'PASSWORD_HISTORY_VIOLATION'
};

module.exports = {
  PasswordRecoveryService,
  PasswordRecoveryError
};