// auth-service/otp-manager.js

/**
 * 🏢 MOSA FORGE - Enterprise OTP Management Service
 * 🔐 Secure One-Time Password generation, validation, and delivery
 * 🔧 Powered by Chereka | Founded by Oumer Muktar
 * 
 * @module OTPManager
 * @version Enterprise 1.0
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const Redis = require('redis');
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');
const { Logger } = require('../../utils/logger');
const { MetricsCollector } = require('../../utils/metrics-collector');

class OTPManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // Redis configuration
      redisUrl: options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      
      // OTP Configuration
      otpLength: options.otpLength || 6,
      otpCharset: options.otpCharset || '0123456789',
      otpExpiry: options.otpExpiry || 300, // 5 minutes in seconds
      maxAttempts: options.maxAttempts || 3,
      
      // Rate limiting
      rateLimitEnabled: options.rateLimitEnabled !== false,
      rateLimitWindow: options.rateLimitWindow || 900, // 15 minutes in seconds
      rateLimitMax: options.rateLimitMax || 5,
      cooldownPeriod: options.cooldownPeriod || 60, // 1 minute in seconds
      
      // Delivery methods
      smsEnabled: options.smsEnabled !== false,
      emailEnabled: options.emailEnabled !== false,
      voiceEnabled: options.voiceEnabled || false,
      pushEnabled: options.pushEnabled || false,
      
      // SMS provider configuration
      smsProvider: options.smsProvider || 'twilio', // twilio, africastalking, ethio-telecom
      smsFrom: options.smsFrom || process.env.SMS_FROM_NUMBER,
      smsTemplate: options.smsTemplate || 'Your Mosa Forge verification code is: {code}',
      
      // Email provider configuration
      emailProvider: options.emailProvider || 'sendgrid', // sendgrid, aws-ses, mailgun
      emailFrom: options.emailFrom || process.env.EMAIL_FROM_ADDRESS,
      emailSubject: options.emailSubject || 'Your Mosa Forge Verification Code',
      
      // Security features
      enableHashing: options.enableHashing !== false,
      enableSalting: options.enableSalting !== false,
      enableBruteForceProtection: options.enableBruteForceProtection !== false,
      enableDeliveryTracking: options.enableDeliveryTracking !== false,
      
      // Monitoring
      enableMetrics: options.enableMetrics !== false,
      enableAuditLog: options.enableAuditLog !== false,
      
      // Environment
      environment: process.env.NODE_ENV || 'development',
      
      ...options
    };

    this.prisma = new PrismaClient({
      log: this.options.environment === 'production' ? ['error'] : ['query', 'error', 'warn']
    });

    this.redis = Redis.createClient({
      url: this.options.redisUrl,
      socket: {
        tls: this.options.environment === 'production',
        reconnectStrategy: (retries) => Math.min(retries * 100, 5000)
      }
    });

    this.logger = new Logger({
      service: 'otp-manager',
      level: this.options.environment === 'production' ? 'info' : 'debug'
    });

    this.metrics = new MetricsCollector({
      service: 'otp-manager',
      security: true
    });

    // Delivery providers
    this.smsProvider = this.initializeSMSProvider();
    this.emailProvider = this.initializeEmailProvider();
    
    // Statistics
    this.stats = {
      otpsGenerated: 0,
      otpsVerified: 0,
      otpsExpired: 0,
      otpsFailed: 0,
      deliveryAttempts: 0,
      deliverySuccess: 0,
      deliveryFailed: 0,
      bruteForceBlocks: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    // Active OTP tracking
    this.activeOtps = new Map();
    
    this.initialized = false;
    this.shuttingDown = false;

    this.initialize();
  }

  /**
   * 🏗️ Initialize OTP Manager
   */
  async initialize() {
    try {
      await this.redis.connect();
      this.startCleanupTasks();
      this.startMetricsCollection();
      
      this.initialized = true;
      
      this.logger.info('OTP Manager initialized successfully', {
        features: {
          smsDelivery: this.options.smsEnabled,
          emailDelivery: this.options.emailEnabled,
          voiceDelivery: this.options.voiceEnabled,
          bruteForceProtection: this.options.enableBruteForceProtection,
          deliveryTracking: this.options.enableDeliveryTracking
        },
        security: {
          hashing: this.options.enableHashing,
          salting: this.options.enableSalting,
          rateLimiting: this.options.rateLimitEnabled
        }
      });

      this.emit('initialized', {
        timestamp: new Date().toISOString(),
        deliveryMethods: this.getAvailableDeliveryMethods()
      });

    } catch (error) {
      this.logger.error('OTP Manager initialization failed', {
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
   * 🔐 Generate and Send OTP
   */
  async generateOTP(identifier, deliveryMethod, context = {}) {
    if (!this.initialized) {
      throw new OTPError('OTP_MANAGER_NOT_INITIALIZED');
    }

    const startTime = performance.now();

    try {
      // Validate inputs
      this.validateIdentifier(identifier);
      this.validateDeliveryMethod(deliveryMethod);
      
      // Check rate limits
      await this.checkRateLimit(identifier, context);
      
      // Check cooldown period
      await this.checkCooldown(identifier);
      
      // Generate OTP
      const otpData = await this.createOTP(identifier, deliveryMethod, context);
      
      // Store OTP securely
      await this.storeOTP(otpData);
      
      // Send OTP via specified delivery method
      const deliveryResult = await this.deliverOTP(otpData, context);
      
      // Track delivery
      await this.trackDelivery(otpData, deliveryResult, context);

      this.stats.otpsGenerated++;
      this.stats.deliveryAttempts++;

      if (deliveryResult.success) {
        this.stats.deliverySuccess++;
      } else {
        this.stats.deliveryFailed++;
      }

      const responseTime = performance.now() - startTime;

      this.logger.info('OTP generated and sent', {
        identifier: this.maskIdentifier(identifier),
        deliveryMethod,
        otpId: otpData.otpId,
        responseTime: responseTime.toFixed(2),
        deliverySuccess: deliveryResult.success
      });

      this.emit('otpGenerated', {
        otpId: otpData.otpId,
        identifier: this.maskIdentifier(identifier),
        deliveryMethod,
        timestamp: new Date().toISOString(),
        context: this.sanitizeContext(context)
      });

      return {
        success: true,
        otpId: otpData.otpId,
        deliveryMethod,
        expiresAt: otpData.expiresAt,
        length: this.options.otpLength,
        maskedIdentifier: this.maskIdentifier(identifier)
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      this.logger.error('OTP generation failed', {
        identifier: this.maskIdentifier(identifier),
        deliveryMethod,
        error: error.message,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('otpGenerationFailed', {
        identifier: this.maskIdentifier(identifier),
        deliveryMethod,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * ✅ Verify OTP
   */
  async verifyOTP(identifier, code, context = {}) {
    if (!this.initialized) {
      throw new OTPError('OTP_MANAGER_NOT_INITIALIZED');
    }

    const startTime = performance.now();

    try {
      // Validate inputs
      this.validateIdentifier(identifier);
      this.validateOTPCode(code);
      
      // Check brute force protection
      if (this.options.enableBruteForceProtection) {
        await this.checkBruteForceProtection(identifier, context);
      }
      
      // Retrieve OTP data
      const otpData = await this.retrieveOTP(identifier);
      if (!otpData) {
        throw new OTPError('OTP_NOT_FOUND');
      }
      
      // Check if OTP is expired
      if (this.isOTPExpired(otpData)) {
        await this.markOTPExpired(otpData.otpId);
        throw new OTPError('OTP_EXPIRED');
      }
      
      // Check attempt limits
      if (this.isMaxAttemptsExceeded(otpData)) {
        await this.markOTPFailed(otpData.otpId, 'max_attempts_exceeded');
        throw new OTPError('MAX_ATTEMPTS_EXCEEDED');
      }
      
      // Verify OTP code
      const isValid = await this.verifyOTPCode(otpData, code);
      
      // Update OTP status
      if (isValid) {
        await this.markOTPVerified(otpData.otpId, context);
        this.stats.otpsVerified++;
      } else {
        await this.incrementOTPAttempts(otpData.otpId);
        this.stats.otpsFailed++;
      }

      const responseTime = performance.now() - startTime;

      this.logger.info('OTP verification completed', {
        identifier: this.maskIdentifier(identifier),
        otpId: otpData.otpId,
        isValid,
        attempts: otpData.attempts + 1,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('otpVerified', {
        otpId: otpData.otpId,
        identifier: this.maskIdentifier(identifier),
        isValid,
        timestamp: new Date().toISOString(),
        context: this.sanitizeContext(context)
      });

      return {
        valid: isValid,
        otpId: otpData.otpId,
        remainingAttempts: isValid ? 0 : this.options.maxAttempts - (otpData.attempts + 1)
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      this.logger.error('OTP verification failed', {
        identifier: this.maskIdentifier(identifier),
        error: error.message,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('otpVerificationFailed', {
        identifier: this.maskIdentifier(identifier),
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * 🔄 Resend OTP
   */
  async resendOTP(identifier, deliveryMethod = null, context = {}) {
    if (!this.initialized) {
      throw new OTPError('OTP_MANAGER_NOT_INITIALIZED');
    }

    try {
      // Check if previous OTP exists and is still valid
      const existingOTP = await this.retrieveOTP(identifier);
      
      if (existingOTP && !this.isOTPExpired(existingOTP)) {
        // Revoke existing OTP
        await this.revokeOTP(existingOTP.otpId, 'resend_requested');
      }
      
      // Generate new OTP
      const newDeliveryMethod = deliveryMethod || existingOTP?.deliveryMethod || 'sms';
      return await this.generateOTP(identifier, newDeliveryMethod, context);

    } catch (error) {
      this.logger.error('OTP resend failed', {
        identifier: this.maskIdentifier(identifier),
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 🚫 Revoke OTP
   */
  async revokeOTP(otpId, reason = 'user_requested') {
    if (!this.initialized) {
      throw new OTPError('OTP_MANAGER_NOT_INITIALIZED');
    }

    try {
      // Remove from Redis
      const identifier = await this.getIdentifierByOTPId(otpId);
      if (identifier) {
        await this.redis.del(`otp:${identifier}`);
      }
      
      // Update status in database
      await this.updateOTPStatus(otpId, 'revoked', reason);

      this.logger.info('OTP revoked', {
        otpId,
        reason
      });

      this.emit('otpRevoked', {
        otpId,
        reason,
        timestamp: new Date().toISOString()
      });

      return { success: true, otpId, reason };

    } catch (error) {
      this.logger.error('OTP revocation failed', {
        otpId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 📊 Get OTP Status
   */
  async getOTPStatus(identifier) {
    try {
      const otpData = await this.retrieveOTP(identifier);
      
      if (!otpData) {
        return { status: 'not_found' };
      }

      const isExpired = this.isOTPExpired(otpData);
      const attemptsExceeded = this.isMaxAttemptsExceeded(otpData);

      let status = 'active';
      if (isExpired) status = 'expired';
      if (attemptsExceeded) status = 'max_attempts_exceeded';
      if (otpData.status !== 'active') status = otpData.status;

      return {
        status,
        otpId: otpData.otpId,
        deliveryMethod: otpData.deliveryMethod,
        createdAt: new Date(otpData.createdAt),
        expiresAt: new Date(otpData.expiresAt),
        attempts: otpData.attempts,
        maxAttempts: this.options.maxAttempts,
        remainingAttempts: Math.max(0, this.options.maxAttempts - otpData.attempts)
      };

    } catch (error) {
      this.logger.error('Failed to get OTP status', {
        identifier: this.maskIdentifier(identifier),
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 📈 Get OTP Statistics
   */
  async getStatistics(identifier = null) {
    const baseStats = this.getBaseStatistics();
    
    if (identifier) {
      const identifierStats = await this.getIdentifierStatistics(identifier);
      return {
        ...baseStats,
        identifier: this.maskIdentifier(identifier),
        ...identifierStats
      };
    }

    return baseStats;
  }

  // 🔧 PRIVATE METHODS

  /**
   * 🏗️ Initialize SMS Provider
   */
  initializeSMSProvider() {
    if (!this.options.smsEnabled) return null;

    switch (this.options.smsProvider) {
      case 'twilio':
        return this.initializeTwilioProvider();
      case 'africastalking':
        return this.initializeAfricasTalkingProvider();
      case 'ethio-telecom':
        return this.initializeEthioTelecomProvider();
      default:
        throw new OTPError('UNSUPPORTED_SMS_PROVIDER');
    }
  }

  /**
   * 🏗️ Initialize Twilio Provider
   */
  initializeTwilioProvider() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new OTPError('TWILIO_CREDENTIALS_MISSING');
    }

    return {
      name: 'twilio',
      send: async (to, message) => {
        // Implementation for Twilio SMS sending
        // This would use the Twilio SDK in production
        return { success: true, provider: 'twilio', messageId: `msg_${Date.now()}` };
      }
    };
  }

  /**
   * 🏗️ Initialize Africa's Talking Provider
   */
  initializeAfricasTalkingProvider() {
    const apiKey = process.env.AFRICASTALKING_API_KEY;
    const username = process.env.AFRICASTALKING_USERNAME;

    if (!apiKey || !username) {
      throw new OTPError('AFRICASTALKING_CREDENTIALS_MISSING');
    }

    return {
      name: 'africastalking',
      send: async (to, message) => {
        // Implementation for Africa's Talking SMS sending
        return { success: true, provider: 'africastalking', messageId: `msg_${Date.now()}` };
      }
    };
  }

  /**
   * 🏗️ Initialize Ethio Telecom Provider
   */
  initializeEthioTelecomProvider() {
    // Ethiopian telecom provider implementation
    return {
      name: 'ethio-telecom',
      send: async (to, message) => {
        // Implementation for Ethio Telecom SMS gateway
        return { success: true, provider: 'ethio-telecom', messageId: `msg_${Date.now()}` };
      }
    };
  }

  /**
   * 🏗️ Initialize Email Provider
   */
  initializeEmailProvider() {
    if (!this.options.emailEnabled) return null;

    switch (this.options.emailProvider) {
      case 'sendgrid':
        return this.initializeSendGridProvider();
      case 'aws-ses':
        return this.initializeSESProvider();
      case 'mailgun':
        return this.initializeMailgunProvider();
      default:
        throw new OTPError('UNSUPPORTED_EMAIL_PROVIDER');
    }
  }

  /**
   * 🏗️ Initialize SendGrid Provider
   */
  initializeSendGridProvider() {
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      throw new OTPError('SENDGRID_API_KEY_MISSING');
    }

    return {
      name: 'sendgrid',
      send: async (to, subject, html) => {
        // Implementation for SendGrid email sending
        return { success: true, provider: 'sendgrid', messageId: `email_${Date.now()}` };
      }
    };
  }

  /**
   * ✅ Validate Identifier
   */
  validateIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') {
      throw new OTPError('INVALID_IDENTIFIER');
    }

    // Validate based on identifier type
    if (identifier.includes('@')) {
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        throw new OTPError('INVALID_EMAIL_FORMAT');
      }
    } else {
      // Phone number validation (Ethiopian format)
      const phoneRegex = /^(\+251|251|0)?9\d{8}$/;
      if (!phoneRegex.test(identifier)) {
        throw new OTPError('INVALID_PHONE_FORMAT');
      }
    }
  }

  /**
   * ✅ Validate Delivery Method
   */
  validateDeliveryMethod(method) {
    const validMethods = this.getAvailableDeliveryMethods();
    
    if (!validMethods.includes(method)) {
      throw new OTPError('INVALID_DELIVERY_METHOD', {
        method,
        validMethods
      });
    }

    // Check if method is enabled
    if (method === 'sms' && !this.options.smsEnabled) {
      throw new OTPError('SMS_DELIVERY_DISABLED');
    }

    if (method === 'email' && !this.options.emailEnabled) {
      throw new OTPError('EMAIL_DELIVERY_DISABLED');
    }
  }

  /**
   * ✅ Validate OTP Code
   */
  validateOTPCode(code) {
    if (!code || typeof code !== 'string') {
      throw new OTPError('INVALID_OTP_CODE');
    }

    if (code.length !== this.options.otpLength) {
      throw new OTPError('INVALID_OTP_LENGTH', {
        expected: this.options.otpLength,
        actual: code.length
      });
    }

    if (!/^\d+$/.test(code)) {
      throw new OTPError('OTP_MUST_BE_NUMERIC');
    }
  }

  /**
   * 🚦 Check Rate Limit
   */
  async checkRateLimit(identifier, context) {
    if (!this.options.rateLimitEnabled) return;

    const rateLimitKey = `rate_limit:otp:${this.hashIdentifier(identifier)}`;
    
    const current = await this.redis.incr(rateLimitKey);
    
    if (current === 1) {
      await this.redis.expire(rateLimitKey, this.options.rateLimitWindow);
    }

    if (current > this.options.rateLimitMax) {
      throw new OTPError('RATE_LIMIT_EXCEEDED', {
        identifier: this.maskIdentifier(identifier),
        limit: this.options.rateLimitMax,
        window: this.options.rateLimitWindow
      });
    }
  }

  /**
   * ⏸️ Check Cooldown Period
   */
  async checkCooldown(identifier) {
    const cooldownKey = `cooldown:otp:${this.hashIdentifier(identifier)}`;
    const inCooldown = await this.redis.exists(cooldownKey);
    
    if (inCooldown) {
      const ttl = await this.redis.ttl(cooldownKey);
      throw new OTPError('COOLDOWN_ACTIVE', {
        identifier: this.maskIdentifier(identifier),
        remainingSeconds: ttl
      });
    }
  }

  /**
   * 🔐 Create OTP
   */
  async createOTP(identifier, deliveryMethod, context) {
    const otpId = this.generateOTPId();
    const code = this.generateOTPCode();
    const now = Date.now();
    const expiresAt = now + (this.options.otpExpiry * 1000);

    // Hash the OTP code for secure storage
    const hashedCode = this.options.enableHashing ? 
      this.hashOTPCode(code, identifier) : code;

    const otpData = {
      otpId,
      identifier,
      deliveryMethod,
      code: hashedCode,
      originalCode: this.options.enableHashing ? null : code,
      createdAt: now,
      expiresAt,
      attempts: 0,
      status: 'active',
      context: this.sanitizeContext(context)
    };

    // Set cooldown period
    await this.redis.setex(
      `cooldown:otp:${this.hashIdentifier(identifier)}`,
      this.options.cooldownPeriod,
      '1'
    );

    return otpData;
  }

  /**
   * 🔢 Generate OTP Code
   */
  generateOTPCode() {
    let code = '';
    const charset = this.options.otpCharset;
    
    for (let i = 0; i < this.options.otpLength; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      code += charset[randomIndex];
    }
    
    return code;
  }

  /**
   * 🆔 Generate OTP ID
   */
  generateOTPId() {
    return `otp_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * 🔐 Hash OTP Code
   */
  hashOTPCode(code, identifier) {
    const salt = this.options.enableSalting ? 
      crypto.randomBytes(16).toString('hex') : '';
    
    const data = `${code}:${identifier}:${salt}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * 🔐 Hash Identifier
   */
  hashIdentifier(identifier) {
    return crypto.createHash('sha256').update(identifier).digest('hex');
  }

  /**
   * 💾 Store OTP
   */
  async storeOTP(otpData) {
    const redisKey = `otp:${otpData.identifier}`;
    const ttl = Math.ceil((otpData.expiresAt - Date.now()) / 1000);

    // Store in Redis with TTL
    await this.redis.hset(redisKey, {
      otpId: otpData.otpId,
      code: otpData.code,
      deliveryMethod: otpData.deliveryMethod,
      createdAt: otpData.createdAt.toString(),
      expiresAt: otpData.expiresAt.toString(),
      attempts: otpData.attempts.toString(),
      status: otpData.status
    });

    await this.redis.expire(redisKey, ttl);

    // Store in database for audit
    if (this.options.enableAuditLog) {
      await this.storeOTPAudit(otpData);
    }
  }

  /**
   * 💾 Store OTP Audit
   */
  async storeOTPAudit(otpData) {
    try {
      await this.prisma.otpAudit.create({
        data: {
          otpId: otpData.otpId,
          identifier: this.hashIdentifier(otpData.identifier),
          deliveryMethod: otpData.deliveryMethod,
          action: 'GENERATE',
          ipAddress: otpData.context.ip,
          userAgent: otpData.context.userAgent,
          timestamp: new Date()
        }
      });
    } catch (error) {
      this.logger.error('Failed to store OTP audit', {
        otpId: otpData.otpId,
        error: error.message
      });
    }
  }

  /**
   * 📨 Deliver OTP
   */
  async deliverOTP(otpData, context) {
    const { identifier, deliveryMethod, code } = otpData;
    
    try {
      let result;
      
      switch (deliveryMethod) {
        case 'sms':
          result = await this.deliverViaSMS(identifier, code, context);
          break;
        case 'email':
          result = await this.deliverViaEmail(identifier, code, context);
          break;
        case 'voice':
          result = await this.deliverViaVoice(identifier, code, context);
          break;
        case 'push':
          result = await this.deliverViaPush(identifier, code, context);
          break;
        default:
          throw new OTPError('UNSUPPORTED_DELIVERY_METHOD');
      }

      return result;

    } catch (error) {
      this.logger.error('OTP delivery failed', {
        identifier: this.maskIdentifier(identifier),
        deliveryMethod,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        provider: deliveryMethod
      };
    }
  }

  /**
   * 📱 Deliver via SMS
   */
  async deliverViaSMS(phoneNumber, code, context) {
    if (!this.smsProvider) {
      throw new OTPError('SMS_PROVIDER_NOT_CONFIGURED');
    }

    const message = this.options.smsTemplate.replace('{code}', code);
    
    const result = await this.smsProvider.send(phoneNumber, message);
    
    return {
      success: true,
      method: 'sms',
      provider: this.smsProvider.name,
      ...result
    };
  }

  /**
   * 📧 Deliver via Email
   */
  async deliverViaEmail(email, code, context) {
    if (!this.emailProvider) {
      throw new OTPError('EMAIL_PROVIDER_NOT_CONFIGURED');
    }

    const subject = this.options.emailSubject;
    const html = this.generateEmailTemplate(code);
    
    const result = await this.emailProvider.send(email, subject, html);
    
    return {
      success: true,
      method: 'email',
      provider: this.emailProvider.name,
      ...result
    };
  }

  /**
   * 📞 Deliver via Voice (placeholder)
   */
  async deliverViaVoice(phoneNumber, code, context) {
    // Voice OTP delivery implementation
    return {
      success: true,
      method: 'voice',
      provider: 'twilio-voice'
    };
  }

  /**
   * 📲 Deliver via Push (placeholder)
   */
  async deliverViaPush(deviceToken, code, context) {
    // Push notification delivery implementation
    return {
      success: true,
      method: 'push',
      provider: 'fcm'
    };
  }

  /**
   * 📧 Generate Email Template
   */
  generateEmailTemplate(code) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .code { font-size: 32px; font-weight: bold; text-align: center; margin: 20px 0; }
          .footer { margin-top: 30px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Mosa Forge Verification Code</h2>
          <p>Use the following code to verify your identity:</p>
          <div class="code">${code}</div>
          <p>This code will expire in ${this.options.otpExpiry / 60} minutes.</p>
          <div class="footer">
            <p>If you didn't request this code, please ignore this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 📊 Track Delivery
   */
  async trackDelivery(otpData, deliveryResult, context) {
    if (!this.options.enableDeliveryTracking) return;

    try {
      await this.prisma.otpDelivery.create({
        data: {
          otpId: otpData.otpId,
          identifier: this.hashIdentifier(otpData.identifier),
          deliveryMethod: otpData.deliveryMethod,
          success: deliveryResult.success,
          provider: deliveryResult.provider,
          messageId: deliveryResult.messageId,
          error: deliveryResult.error,
          ipAddress: context.ip,
          userAgent: context.userAgent,
          timestamp: new Date()
        }
      });
    } catch (error) {
      this.logger.error('Failed to track delivery', {
        otpId: otpData.otpId,
        error: error.message
      });
    }
  }

  /**
   * 🛡️ Check Brute Force Protection
   */
  async checkBruteForceProtection(identifier, context) {
    const bruteForceKey = `brute_force:otp:${this.hashIdentifier(identifier)}`;
    const attempts = await this.redis.get(bruteForceKey);
    
    if (attempts && parseInt(attempts) >= this.options.maxAttempts * 2) {
      this.stats.bruteForceBlocks++;
      
      this.logger.warn('Brute force protection triggered', {
        identifier: this.maskIdentifier(identifier),
        attempts
      });

      throw new OTPError('BRUTE_FORCE_BLOCKED');
    }
  }

  /**
   * 🔍 Retrieve OTP
   */
  async retrieveOTP(identifier) {
    const redisKey = `otp:${identifier}`;
    const otpData = await this.redis.hgetall(redisKey);
    
    if (!otpData || Object.keys(otpData).length === 0) {
      return null;
    }

    return {
      otpId: otpData.otpId,
      identifier,
      code: otpData.code,
      deliveryMethod: otpData.deliveryMethod,
      createdAt: parseInt(otpData.createdAt),
      expiresAt: parseInt(otpData.expiresAt),
      attempts: parseInt(otpData.attempts),
      status: otpData.status
    };
  }

  /**
   * ⏰ Check if OTP is Expired
   */
  isOTPExpired(otpData) {
    return Date.now() > otpData.expiresAt;
  }

  /**
   * 🚫 Check if Max Attempts Exceeded
   */
  isMaxAttemptsExceeded(otpData) {
    return otpData.attempts >= this.options.maxAttempts;
  }

  /**
   * ✅ Verify OTP Code
   */
  async verifyOTPCode(otpData, code) {
    if (this.options.enableHashing) {
      const hashedCode = this.hashOTPCode(code, otpData.identifier);
      return hashedCode === otpData.code;
    } else {
      return code === otpData.originalCode;
    }
  }

  /**
   * ✅ Mark OTP as Verified
   */
  async markOTPVerified(otpId, context) {
    // Remove from Redis
    const identifier = await this.getIdentifierByOTPId(otpId);
    if (identifier) {
      await this.redis.del(`otp:${identifier}`);
    }
    
    // Update status in database
    await this.updateOTPStatus(otpId, 'verified', 'successful_verification');

    // Clear cooldown
    await this.redis.del(`cooldown:otp:${this.hashIdentifier(identifier)}`);
  }

  /**
   * ❌ Mark OTP as Expired
   */
  async markOTPExpired(otpId) {
    await this.updateOTPStatus(otpId, 'expired', 'auto_expired');
    this.stats.otpsExpired++;
  }

  /**
   * ❌ Mark OTP as Failed
   */
  async markOTPFailed(otpId, reason) {
    await this.updateOTPStatus(otpId, 'failed', reason);
  }

  /**
   * 🔼 Increment OTP Attempts
   */
  async incrementOTPAttempts(otpId) {
    const identifier = await this.getIdentifierByOTPId(otpId);
    if (identifier) {
      await this.redis.hincrby(`otp:${identifier}`, 'attempts', 1);
      
      // Update brute force counter
      if (this.options.enableBruteForceProtection) {
        await this.redis.incr(`brute_force:otp:${this.hashIdentifier(identifier)}`);
        await this.redis.expire(`brute_force:otp:${this.hashIdentifier(identifier)}`, 3600); // 1 hour
      }
    }
  }

  /**
   * 🔄 Update OTP Status
   */
  async updateOTPStatus(otpId, status, reason) {
    // This would update the status in the database
    // For Redis, we update the hash field
    const identifier = await this.getIdentifierByOTPId(otpId);
    if (identifier) {
      await this.redis.hset(`otp:${identifier}`, 'status', status);
    }

    // Log status change
    this.logger.debug('OTP status updated', {
      otpId,
      status,
      reason
    });
  }

  /**
   * 🔍 Get Identifier by OTP ID
   */
  async getIdentifierByOTPId(otpId) {
    // This would query the database or maintain a mapping
    // For simplicity, we're using a pattern that might need adjustment
    const keys = await this.redis.keys('otp:*');
    
    for (const key of keys) {
      const storedOtpId = await this.redis.hget(key, 'otpId');
      if (storedOtpId === otpId) {
        return key.replace('otp:', '');
      }
    }
    
    return null;
  }

  /**
   * 🎭 Mask Identifier
   */
  maskIdentifier(identifier) {
    if (!identifier) return '***';
    
    if (identifier.includes('@')) {
      // Email masking
      const [local, domain] = identifier.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    } else {
      // Phone number masking
      return `${identifier.substring(0, 4)}***${identifier.substring(identifier.length - 2)}`;
    }
  }

  /**
   * 🎭 Sanitize Context
   */
  sanitizeContext(context) {
    return {
      ip: context.ip ? `${context.ip.split('.')[0]}.***.***.***` : null,
      userAgent: context.userAgent ? context.userAgent.substring(0, 50) + '...' : null,
      deviceId: context.deviceId ? `${context.deviceId.substring(0, 8)}***` : null
    };
  }

  /**
   * 📋 Get Available Delivery Methods
   */
  getAvailableDeliveryMethods() {
    const methods = [];
    
    if (this.options.smsEnabled) methods.push('sms');
    if (this.options.emailEnabled) methods.push('email');
    if (this.options.voiceEnabled) methods.push('voice');
    if (this.options.pushEnabled) methods.push('push');
    
    return methods;
  }

  /**
   * 📊 Get Base Statistics
   */
  getBaseStatistics() {
    return {
      ...this.stats,
      timestamp: new Date().toISOString(),
      deliveryMethods: this.getAvailableDeliveryMethods(),
      configuration: {
        otpLength: this.options.otpLength,
        otpExpiry: this.options.otpExpiry,
        maxAttempts: this.options.maxAttempts,
        rateLimitEnabled: this.options.rateLimitEnabled
      }
    };
  }

  /**
   * 📊 Get Identifier Statistics
   */
  async getIdentifierStatistics(identifier) {
    const hashedIdentifier = this.hashIdentifier(identifier);
    
    const recentOtps = await this.prisma.otpAudit.count({
      where: {
        identifier: hashedIdentifier,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    const successfulDeliveries = await this.prisma.otpDelivery.count({
      where: {
        identifier: hashedIdentifier,
        success: true,
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    return {
      recentOtps24h: recentOtps,
      successfulDeliveries24h: successfulDeliveries,
      deliverySuccessRate: recentOtps > 0 ? (successfulDeliveries / recentOtps) * 100 : 0
    };
  }

  /**
   * 🧹 Start Cleanup Tasks
   */
  startCleanupTasks() {
    // Clean expired OTPs every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredOTPs();
    }, 3600000); // 1 hour

    // Clean old audit logs daily
    this.auditCleanupInterval = setInterval(() => {
      this.cleanupOldAuditLogs();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * 🧹 Cleanup Expired OTPs
   */
  async cleanupExpiredOTPs() {
    try {
      const otpKeys = await this.redis.keys('otp:*');
      let cleaned = 0;

      for (const key of otpKeys) {
        const expiresAt = await this.redis.hget(key, 'expiresAt');
        if (expiresAt && Date.now() > parseInt(expiresAt)) {
          await this.redis.del(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.debug('Expired OTPs cleaned up', { cleaned });
      }

    } catch (error) {
      this.logger.error('OTP cleanup failed', { error: error.message });
    }
  }

  /**
   * 🧹 Cleanup Old Audit Logs
   */
  async cleanupOldAuditLogs() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await this.prisma.otpAudit.deleteMany({
        where: {
          timestamp: {
            lt: thirtyDaysAgo
          }
        }
      });

      if (result.count > 0) {
        this.logger.debug('Old OTP audit logs cleaned up', { count: result.count });
      }

    } catch (error) {
      this.logger.error('Audit log cleanup failed', { error: error.message });
    }
  }

  /**
   * 📈 Start Metrics Collection
   */
  startMetricsCollection() {
    if (!this.options.enableMetrics) return;

    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute
  }

  /**
   * 📊 Collect Metrics
   */
  async collectMetrics() {
    try {
      const stats = this.getBaseStatistics();

      // Record OTP metrics
      this.metrics.recordGauge('otp.generated', stats.otpsGenerated);
      this.metrics.recordGauge('otp.verified', stats.otpsVerified);
      this.metrics.recordGauge('otp.expired', stats.otpsExpired);
      this.metrics.recordGauge('otp.failed', stats.otpsFailed);

      // Record delivery metrics
      this.metrics.recordGauge('otp.delivery.attempts', stats.deliveryAttempts);
      this.metrics.recordGauge('otp.delivery.success', stats.deliverySuccess);
      this.metrics.recordGauge('otp.delivery.failed', stats.deliveryFailed);
      this.metrics.recordGauge('otp.delivery.success_rate', 
        stats.deliveryAttempts > 0 ? (stats.deliverySuccess / stats.deliveryAttempts) * 100 : 0
      );

      // Record security metrics
      this.metrics.recordGauge('otp.security.brute_force_blocks', stats.bruteForceBlocks);

      this.emit('metricsCollected', {
        stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Metrics collection failed', { error: error.message });
    }
  }

  /**
   * 🧹 Graceful Shutdown
   */
  async shutdown() {
    this.shuttingDown = true;
    
    try {
      // Clear intervals
      if (this.cleanupInterval) clearInterval(this.cleanupInterval);
      if (this.auditCleanupInterval) clearInterval(this.auditCleanupInterval);
      if (this.metricsInterval) clearInterval(this.metricsInterval);

      // Close Redis connection
      if (this.redis.isOpen) {
        await this.redis.quit();
      }

      // Close database connection
      await this.prisma.$disconnect();

      this.logger.info('OTP Manager shut down gracefully');

      this.emit('shutdownCompleted', {
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('OTP Manager shutdown failed', { error: error.message });
      throw error;
    }
  }
}

// 🏢 Enterprise-grade error handling
class OTPError extends Error {
  constructor(code, context = {}) {
    super(code);
    this.name = 'OTPError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Set appropriate HTTP status codes
    const statusCodes = {
      'OTP_MANAGER_NOT_INITIALIZED': 503,
      'INVALID_IDENTIFIER': 400,
      'INVALID_EMAIL_FORMAT': 400,
      'INVALID_PHONE_FORMAT': 400,
      'INVALID_DELIVERY_METHOD': 400,
      'INVALID_OTP_CODE': 400,
      'INVALID_OTP_LENGTH': 400,
      'OTP_MUST_BE_NUMERIC': 400,
      'RATE_LIMIT_EXCEEDED': 429,
      'COOLDOWN_ACTIVE': 429,
      'OTP_NOT_FOUND': 404,
      'OTP_EXPIRED': 410,
      'MAX_ATTEMPTS_EXCEEDED': 429,
      'BRUTE_FORCE_BLOCKED': 429,
      'SMS_DELIVERY_DISABLED': 403,
      'EMAIL_DELIVERY_DISABLED': 403,
      'UNSUPPORTED_SMS_PROVIDER': 500,
      'UNSUPPORTED_EMAIL_PROVIDER': 500,
      'TWILIO_CREDENTIALS_MISSING': 500,
      'AFRICASTALKING_CREDENTIALS_MISSING': 500,
      'SENDGRID_API_KEY_MISSING': 500,
      'SMS_PROVIDER_NOT_CONFIGURED': 500,
      'EMAIL_PROVIDER_NOT_CONFIGURED': 500,
      'UNSUPPORTED_DELIVERY_METHOD': 400,
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
  OTPManager,
  OTPError
};