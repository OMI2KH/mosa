// payment-service/telebirr-integration.js

/**
 * 🏢 MOSA FORGE - Enterprise Telebirr Integration
 * 💰 Secure 1,999 ETB bundle payment processing via Telebirr
 * 🔐 Bank-grade security with encryption and digital signatures
 * 🔄 Real-time payment status synchronization
 * 📊 Comprehensive transaction analytics and reporting
 * 
 * @module TelebirrIntegration
 * @version Enterprise 1.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const axios = require('axios');
const Redis = require('@redis/client');
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

// Enterprise Dependencies
const EnterpriseLogger = require('../utils/enterprise-logger');
const SecurityMetrics = require('../utils/security-metrics');
const AuditLogger = require('../utils/audit-logger');
const CacheManager = require('../utils/cache-manager');

class TelebirrIntegration extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 🏗️ ENTERPRISE CONFIGURATION
    this.config = {
      // 🔗 API Configuration
      baseUrl: process.env.TELEBIRR_BASE_URL || 'https://api.telebirr.com/v1',
      merchantId: process.env.TELEBIRR_MERCHANT_ID,
      apiKey: process.env.TELEBIRR_API_KEY,
      apiSecret: process.env.TELEBIRR_API_SECRET,
      timeout: 30000, // 30 seconds
      
      // 💰 Payment Configuration
      bundleAmount: 1999, // 1,999 ETB
      currency: 'ETB',
      paymentMethods: ['USSD', 'APP', 'WEB'],
      
      // 🔐 Security Configuration
      encryption: {
        algorithm: 'aes-256-gcm',
        key: process.env.TELEBIRR_ENCRYPTION_KEY,
        ivLength: 16
      },
      signature: {
        algorithm: 'RSA-SHA256',
        privateKey: process.env.TELEBIRR_PRIVATE_KEY,
        publicKey: process.env.TELEBIRR_PUBLIC_KEY
      },
      
      // 🔄 Retry & Circuit Breaker
      maxRetries: 3,
      retryDelay: 2000,
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60000
      },
      
      // 📊 Monitoring
      enableRealTimeMetrics: true,
      enableTransactionAnalytics: true,
      enablePerformanceTracking: true,
      
      ...options
    };

    // 🏗️ ENTERPRISE SERVICE INITIALIZATION
    this.initializeEnterpriseServices();
    this.initializeAPIClients();
    this.initializeSecuritySystems();
    this.initializeCircuitBreaker();
    
    this.stats = {
      paymentsInitiated: 0,
      paymentsCompleted: 0,
      paymentsFailed: 0,
      callbacksProcessed: 0,
      retryAttempts: 0,
      revenueProcessed: 0
    };

    this.circuitState = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.initialized = false;
  }

  /**
   * 🏗️ Initialize Enterprise Services
   */
  async initializeEnterpriseServices() {
    try {
      // 📊 Enterprise Logger
      this.logger = new EnterpriseLogger({
        service: 'telebirr-integration',
        module: 'payment',
        environment: process.env.NODE_ENV
      });

      // 🛡️ Security Metrics
      this.metrics = new SecurityMetrics({
        service: 'telebirr-integration',
        businessUnit: 'payment-service'
      });

      // 📝 Audit Logger
      this.auditLogger = new AuditLogger({
        service: 'telebirr-integration',
        retentionDays: 365
      });

      // 💾 Cache Manager
      this.cacheManager = new CacheManager({
        prefix: 'telebirr',
        ttl: 600, // 10 minutes
        maxSize: 10000
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

      this.logger.system('Enterprise Telebirr integration initialized', {
        service: 'telebirr-integration',
        baseUrl: this.config.baseUrl,
        merchantId: this.config.merchantId,
        features: Object.keys(this.config).filter(k => this.config[k] === true)
      });

      this.initialized = true;

    } catch (error) {
      this.logger.critical('Enterprise Telebirr integration initialization failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 🔗 Initialize API Clients
   */
  initializeAPIClients() {
    this.apiClients = {
      // 💰 Payment Processing
      payments: axios.create({
        baseURL: `${this.config.baseUrl}/payments`,
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MOSA-FORGE-ENTERPRISE/1.0'
        }
      }),
      
      // 🔍 Transaction Inquiry
      transactions: axios.create({
        baseURL: `${this.config.baseUrl}/transactions`,
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MOSA-FORGE-ENTERPRISE/1.0'
        }
      }),
      
      // 📊 Reporting
      reports: axios.create({
        baseURL: `${this.config.baseUrl}/reports`,
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MOSA-FORGE-ENTERPRISE/1.0'
        }
      })
    };

    // 🔐 Add request interceptors for authentication
    this.apiClients.payments.interceptors.request.use(
      (config) => this.authenticateRequest(config),
      (error) => Promise.reject(error)
    );

    this.apiClients.transactions.interceptors.request.use(
      (config) => this.authenticateRequest(config),
      (error) => Promise.reject(error)
    );

    this.apiClients.reports.interceptors.request.use(
      (config) => this.authenticateRequest(config),
      (error) => Promise.reject(error)
    );
  }

  /**
   * 🛡️ Initialize Security Systems
   */
  initializeSecuritySystems() {
    this.security = {
      // 🔑 Encryption Systems
      encryption: {
        algorithm: this.config.encryption.algorithm,
        key: Buffer.from(this.config.encryption.key, 'hex'),
        ivLength: this.config.encryption.ivLength
      },
      
      // 📝 Digital Signatures
      signatures: {
        algorithm: this.config.signature.algorithm,
        privateKey: this.config.signature.privateKey,
        publicKey: this.config.signature.publicKey
      },
      
      // 🎯 Validation Rules
      validation: {
        amountTolerance: 0.01, // 1% tolerance
        timestampTolerance: 300000, // 5 minutes
        signatureRequired: true
      }
    };
  }

  /**
   * ⚡ Initialize Circuit Breaker
   */
  initializeCircuitBreaker() {
    this.circuitBreaker = {
      state: 'CLOSED',
      failureCount: 0,
      lastFailureTime: null,
      nextAttempt: null
    };
  }

  /**
   * 💰 INITIATE PAYMENT - Enterprise Grade
   */
  async initiatePayment(paymentRequest, context = {}) {
    const startTime = performance.now();
    const paymentId = this.generatePaymentId();

    try {
      // 🛡️ CHECK CIRCUIT BREAKER
      await this.checkCircuitBreaker();

      // ✅ VALIDATE PAYMENT REQUEST
      await this.validatePaymentRequest(paymentRequest, context);

      // 🔐 ENCRYPT SENSITIVE DATA
      const encryptedRequest = await this.encryptPaymentData(paymentRequest);

      // 📝 CREATE DIGITAL SIGNATURE
      const signature = await this.createSignature(encryptedRequest);

      // 🔗 SEND PAYMENT REQUEST TO TELEBIRR
      const telebirrResponse = await this.sendPaymentRequest(encryptedRequest, signature, context);

      // 💾 STORE PAYMENT RECORD
      const paymentRecord = await this.storePaymentRecord(paymentRequest, telebirrResponse, context);

      // 📊 RECORD SUCCESS METRICS
      await this.recordPaymentInitiation(paymentId, paymentRecord, context);

      const responseTime = performance.now() - startTime;

      this.stats.paymentsInitiated++;
      this.resetCircuitBreaker();

      this.logger.security('Telebirr payment initiated successfully', {
        paymentId,
        transactionId: telebirrResponse.transactionId,
        amount: paymentRequest.amount,
        responseTime: responseTime.toFixed(2)
      });

      return {
        success: true,
        paymentId,
        transactionId: telebirrResponse.transactionId,
        paymentUrl: telebirrResponse.paymentUrl,
        qrCode: telebirrResponse.qrCode,
        ussdCode: telebirrResponse.ussdCode,
        expiresAt: telebirrResponse.expiresAt,
        nextSteps: ['complete_payment', 'await_callback', 'verify_status']
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      await this.handlePaymentInitiationFailure(paymentId, paymentRequest, error, context, responseTime);
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE PAYMENT REQUEST
   */
  async validatePaymentRequest(paymentRequest, context) {
    // ✅ VALIDATE REQUIRED FIELDS
    const requiredFields = ['customerPhone', 'amount', 'currency', 'orderId', 'description'];
    const missingFields = requiredFields.filter(field => !paymentRequest[field]);
    
    if (missingFields.length > 0) {
      throw new TelebirrIntegrationError(
        'MISSING_REQUIRED_FIELDS',
        'Required payment fields are missing',
        { missingFields }
      );
    }

    // ✅ VALIDATE BUNDLE AMOUNT
    if (paymentRequest.amount !== this.config.bundleAmount) {
      throw new TelebirrIntegrationError(
        'INVALID_BUNDLE_AMOUNT',
        `Bundle amount must be exactly ${this.config.bundleAmount} ETB`,
        { 
          providedAmount: paymentRequest.amount,
          requiredAmount: this.config.bundleAmount
        }
      );
    }

    // ✅ VALIDATE CURRENCY
    if (paymentRequest.currency !== this.config.currency) {
      throw new TelebirrIntegrationError(
        'INVALID_CURRENCY',
        `Only ${this.config.currency} currency is supported`,
        { providedCurrency: paymentRequest.currency }
      );
    }

    // ✅ VALIDATE PHONE NUMBER
    if (!this.isValidEthiopianPhone(paymentRequest.customerPhone)) {
      throw new TelebirrIntegrationError(
        'INVALID_PHONE_NUMBER',
        'Phone number must be a valid Ethiopian number',
        { phone: paymentRequest.customerPhone }
      );
    }

    // ✅ CHECK DUPLICATE PAYMENT
    await this.checkDuplicatePayment(paymentRequest.orderId, context);

    this.logger.security('Payment request validation passed', {
      orderId: paymentRequest.orderId,
      amount: paymentRequest.amount,
      validations: ['required_fields', 'bundle_amount', 'currency', 'phone_number', 'duplicate_check']
    });
  }

  /**
   * 🔐 ENCRYPT PAYMENT DATA
   */
  async encryptPaymentData(paymentRequest) {
    try {
      const iv = crypto.randomBytes(this.security.encryption.ivLength);
      const cipher = crypto.createCipheriv(
        this.security.encryption.algorithm,
        this.security.encryption.key,
        iv
      );

      const paymentData = {
        merchantId: this.config.merchantId,
        customerPhone: paymentRequest.customerPhone,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        orderId: paymentRequest.orderId,
        description: paymentRequest.description,
        timestamp: Date.now(),
        callbackUrl: `${process.env.API_BASE_URL}/payments/telebirr/callback`
      };

      let encrypted = cipher.update(JSON.stringify(paymentData), 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return {
        iv: iv.toString('hex'),
        data: encrypted,
        authTag: authTag.toString('hex'),
        timestamp: paymentData.timestamp
      };

    } catch (error) {
      this.logger.error('Payment data encryption failed', {
        orderId: paymentRequest.orderId,
        error: error.message
      });

      throw new TelebirrIntegrationError(
        'ENCRYPTION_FAILED',
        'Failed to encrypt payment data',
        { originalError: error.message }
      );
    }
  }

  /**
   * 📝 CREATE DIGITAL SIGNATURE
   */
  async createSignature(encryptedData) {
    try {
      const sign = crypto.createSign(this.security.signatures.algorithm);
      const dataToSign = `${encryptedData.iv}${encryptedData.data}${encryptedData.timestamp}`;
      
      sign.update(dataToSign);
      sign.end();

      const signature = sign.sign(this.security.signatures.privateKey, 'hex');
      
      return {
        signature,
        algorithm: this.security.signatures.algorithm,
        timestamp: encryptedData.timestamp
      };

    } catch (error) {
      this.logger.error('Digital signature creation failed', {
        error: error.message
      });

      throw new TelebirrIntegrationError(
        'SIGNATURE_FAILED',
        'Failed to create digital signature',
        { originalError: error.message }
      );
    }
  }

  /**
   * 🔗 SEND PAYMENT REQUEST
   */
  async sendPaymentRequest(encryptedData, signature, context) {
    let attempt = 0;
    let lastError;

    while (attempt < this.config.maxRetries) {
      try {
        const requestPayload = {
          merchantId: this.config.merchantId,
          encryptedData: encryptedData.data,
          iv: encryptedData.iv,
          authTag: encryptedData.authTag,
          signature: signature.signature,
          timestamp: encryptedData.timestamp,
          algorithm: signature.algorithm
        };

        const response = await this.apiClients.payments.post('/initiate', requestPayload, {
          headers: this.generateAuthHeaders()
        });

        if (response.data.success) {
          this.logger.business('Telebirr payment request successful', {
            transactionId: response.data.transactionId,
            attempt: attempt + 1
          });

          return {
            transactionId: response.data.transactionId,
            paymentUrl: response.data.paymentUrl,
            qrCode: response.data.qrCode,
            ussdCode: response.data.ussdCode,
            expiresAt: new Date(response.data.expiresAt),
            rawResponse: response.data
          };
        } else {
          throw new TelebirrIntegrationError(
            'TELEBIRR_API_ERROR',
            response.data.message || 'Telebirr API returned error',
            { telebirrError: response.data.error }
          );
        }

      } catch (error) {
        attempt++;
        lastError = error;
        
        this.logger.warn('Telebirr payment request attempt failed', {
          attempt,
          error: error.message
        });

        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    await this.recordCircuitBreakerFailure();
    
    throw new TelebirrIntegrationError(
      'TELEBIRR_REQUEST_RETRIES_EXCEEDED',
      'All Telebirr payment request attempts failed',
      { 
        attempts: this.config.maxRetries,
        lastError: lastError?.message 
      }
    );
  }

  /**
   * 🔄 PROCESS PAYMENT CALLBACK - Enterprise Grade
   */
  async processPaymentCallback(callbackData, context = {}) {
    const startTime = performance.now();
    const callbackId = this.generateCallbackId();

    try {
      // 🛡️ VALIDATE CALLBACK SIGNATURE
      await this.validateCallbackSignature(callbackData, context);

      // 🔓 DECRYPT CALLBACK DATA
      const decryptedData = await this.decryptCallbackData(callbackData);

      // 🔍 VERIFY TRANSACTION
      const transactionVerification = await this.verifyTransaction(decryptedData);

      // 💾 UPDATE PAYMENT STATUS
      const updatedPayment = await this.updatePaymentStatus(decryptedData, transactionVerification, context);

      // 📧 SEND NOTIFICATIONS
      await this.sendPaymentNotifications(updatedPayment, decryptedData, context);

      // 📊 RECORD METRICS
      await this.recordCallbackProcessing(callbackId, updatedPayment, context);

      const responseTime = performance.now() - startTime;

      this.stats.callbacksProcessed++;

      this.logger.security('Payment callback processed successfully', {
        callbackId,
        transactionId: decryptedData.transactionId,
        status: decryptedData.status,
        responseTime: responseTime.toFixed(2)
      });

      return {
        success: true,
        callbackId,
        transactionId: decryptedData.transactionId,
        status: decryptedData.status,
        amount: decryptedData.amount,
        processedAt: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      await this.handleCallbackProcessingFailure(callbackId, callbackData, error, context, responseTime);
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE CALLBACK SIGNATURE
   */
  async validateCallbackSignature(callbackData, context) {
    try {
      const { signature, data, timestamp } = callbackData;
      
      if (!signature || !data || !timestamp) {
        throw new TelebirrIntegrationError(
          'INVALID_CALLBACK_DATA',
          'Callback data is missing required fields'
        );
      }

      // ⏰ CHECK TIMESTAMP
      const currentTime = Date.now();
      const callbackTime = parseInt(timestamp);
      
      if (Math.abs(currentTime - callbackTime) > this.security.validation.timestampTolerance) {
        throw new TelebirrIntegrationError(
          'EXPIRED_CALLBACK',
          'Callback timestamp is outside acceptable range'
        );
      }

      // ✅ VERIFY SIGNATURE
      const verify = crypto.createVerify(this.security.signatures.algorithm);
      const dataToVerify = `${data}${timestamp}`;
      
      verify.update(dataToVerify);
      verify.end();

      const isValid = verify.verify(this.security.signatures.publicKey, signature, 'hex');

      if (!isValid) {
        throw new TelebirrIntegrationError(
          'INVALID_SIGNATURE',
          'Callback signature verification failed'
        );
      }

      this.logger.security('Callback signature validation passed', {
        transactionId: callbackData.transactionId,
        validations: ['required_fields', 'timestamp', 'signature']
      });

    } catch (error) {
      this.logger.error('Callback signature validation failed', {
        transactionId: callbackData.transactionId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 🔍 VERIFY TRANSACTION
   */
  async verifyTransaction(decryptedData) {
    try {
      // 🔗 INQUIRE TRANSACTION STATUS FROM TELEBIRR
      const inquiryResponse = await this.apiClients.transactions.get(
        `/${decryptedData.transactionId}`,
        {
          headers: this.generateAuthHeaders()
        }
      );

      if (!inquiryResponse.data.success) {
        throw new TelebirrIntegrationError(
          'TRANSACTION_VERIFICATION_FAILED',
          'Failed to verify transaction with Telebirr',
          { telebirrError: inquiryResponse.data.error }
        );
      }

      const telebirrData = inquiryResponse.data.transaction;

      // ✅ VERIFY AMOUNT MATCH
      if (Math.abs(telebirrData.amount - decryptedData.amount) > this.security.validation.amountTolerance) {
        throw new TelebirrIntegrationError(
          'AMOUNT_MISMATCH',
          'Transaction amount does not match expected amount',
          {
            expected: decryptedData.amount,
            actual: telebirrData.amount
          }
        );
      }

      // ✅ VERIFY MERCHANT ID
      if (telebirrData.merchantId !== this.config.merchantId) {
        throw new TelebirrIntegrationError(
          'MERCHANT_MISMATCH',
          'Transaction merchant ID does not match'
        );
      }

      this.logger.security('Transaction verification completed', {
        transactionId: decryptedData.transactionId,
        status: telebirrData.status,
        amount: telebirrData.amount
      });

      return {
        verified: true,
        status: telebirrData.status,
        amount: telebirrData.amount,
        currency: telebirrData.currency,
        processedAt: telebirrData.processedAt,
        rawData: telebirrData
      };

    } catch (error) {
      this.logger.error('Transaction verification failed', {
        transactionId: decryptedData.transactionId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 🔄 CHECK PAYMENT STATUS - Enterprise Grade
   */
  async checkPaymentStatus(transactionId, context = {}) {
    const startTime = performance.now();
    const statusId = this.generateStatusId();

    try {
      // 🛡️ CHECK CIRCUIT BREAKER
      await this.checkCircuitBreaker();

      // 🔍 INQUIRE TRANSACTION STATUS
      const statusResponse = await this.apiClients.transactions.get(
        `/${transactionId}`,
        {
          headers: this.generateAuthHeaders()
        }
      );

      if (!statusResponse.data.success) {
        throw new TelebirrIntegrationError(
          'STATUS_CHECK_FAILED',
          'Failed to check payment status',
          { telebirrError: statusResponse.data.error }
        );
      }

      const transactionData = statusResponse.data.transaction;

      // 💾 UPDATE LOCAL STATUS
      await this.updateLocalPaymentStatus(transactionId, transactionData, context);

      const responseTime = performance.now() - startTime;

      this.resetCircuitBreaker();

      this.logger.system('Payment status check completed', {
        statusId,
        transactionId,
        status: transactionData.status,
        responseTime: responseTime.toFixed(2)
      });

      return {
        success: true,
        statusId,
        transactionId,
        status: transactionData.status,
        amount: transactionData.amount,
        currency: transactionData.currency,
        processedAt: transactionData.processedAt,
        rawData: transactionData
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      await this.handleStatusCheckFailure(statusId, transactionId, error, context, responseTime);
      throw error;
    }
  }

  /**
   * 📊 GET TRANSACTION ANALYTICS - Enterprise Grade
   */
  async getTransactionAnalytics(timeframe = '30d', context = {}) {
    const startTime = performance.now();
    const analyticsId = this.generateAnalyticsId();

    try {
      // 🛡️ CHECK CIRCUIT BREAKER
      await this.checkCircuitBreaker();

      // 📈 FETCH TELEBIRR ANALYTICS
      const telebirrAnalytics = await this.fetchTelebirrAnalytics(timeframe);

      // 📊 COMBINE WITH LOCAL DATA
      const localAnalytics = await this.fetchLocalAnalytics(timeframe);

      // 🎯 GENERATE COMPREHENSIVE REPORT
      const comprehensiveReport = this.generateComprehensiveReport(telebirrAnalytics, localAnalytics, timeframe);

      const responseTime = performance.now() - startTime;

      this.resetCircuitBreaker();

      this.logger.system('Transaction analytics generated', {
        analyticsId,
        timeframe,
        responseTime: responseTime.toFixed(2)
      });

      return {
        success: true,
        analyticsId,
        timeframe,
        generatedAt: new Date().toISOString(),
        data: comprehensiveReport
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      await this.handleAnalyticsFailure(analyticsId, timeframe, error, context, responseTime);
      throw error;
    }
  }

  /**
   * 🔧 UTILITY METHODS
   */

  generatePaymentId() {
    return `telebirr_pay_${crypto.randomBytes(16).toString('hex')}`;
  }

  generateCallbackId() {
    return `telebirr_cb_${crypto.randomBytes(16).toString('hex')}`;
  }

  generateStatusId() {
    return `telebirr_status_${crypto.randomBytes(16).toString('hex')}`;
  }

  generateAnalyticsId() {
    return `telebirr_analytics_${crypto.randomBytes(16).toString('hex')}`;
  }

  authenticateRequest(config) {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const signature = crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(`${this.config.apiKey}${timestamp}${nonce}`)
      .digest('hex');

    config.headers['X-API-Key'] = this.config.apiKey;
    config.headers['X-Timestamp'] = timestamp;
    config.headers['X-Nonce'] = nonce;
    config.headers['X-Signature'] = signature;

    return config;
  }

  generateAuthHeaders() {
    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const signature = crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(`${this.config.apiKey}${timestamp}${nonce}`)
      .digest('hex');

    return {
      'X-API-Key': this.config.apiKey,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature
    };
  }

  isValidEthiopianPhone(phone) {
    const ethiopianPhoneRegex = /^(\+251|251|0)?9\d{8}$/;
    return ethiopianPhoneRegex.test(phone);
  }

  async checkCircuitBreaker() {
    if (this.circuitState === 'OPEN') {
      const now = Date.now();
      const resetTime = this.lastFailureTime + this.config.circuitBreaker.resetTimeout;
      
      if (now < resetTime) {
        throw new TelebirrIntegrationError(
          'CIRCUIT_BREAKER_OPEN',
          'Telebirr service is temporarily unavailable',
          { retryAfter: resetTime - now }
        );
      }
      
      // Attempt to reset circuit breaker
      this.circuitState = 'HALF_OPEN';
    }
  }

  async recordCircuitBreakerFailure() {
    this.failureCount++;
    
    if (this.failureCount >= this.config.circuitBreaker.failureThreshold) {
      this.circuitState = 'OPEN';
      this.lastFailureTime = Date.now();
      
      this.logger.error('Circuit breaker opened due to repeated failures', {
        failureCount: this.failureCount,
        resetTimeout: this.config.circuitBreaker.resetTimeout
      });
    }
  }

  resetCircuitBreaker() {
    this.circuitState = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = null;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  sanitizeContext(context) {
    const sanitized = { ...context };
    delete sanitized.apiKey;
    delete sanitized.apiSecret;
    delete sanitized.privateKey;
    return sanitized;
  }

  /**
   * 🎯 ENTERPRISE ERROR HANDLING
   */
  async handlePaymentInitiationFailure(paymentId, paymentRequest, error, context, responseTime) {
    this.stats.paymentsFailed++;
    
    this.logger.error('Telebirr payment initiation failed', {
      paymentId,
      orderId: paymentRequest.orderId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2),
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logTelebirrAction({
      action: 'PAYMENT_INITIATION_FAILED',
      orderId: paymentRequest.orderId,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ip
    });
  }

  async handleCallbackProcessingFailure(callbackId, callbackData, error, context, responseTime) {
    this.logger.error('Payment callback processing failed', {
      callbackId,
      transactionId: callbackData.transactionId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2),
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logTelebirrAction({
      action: 'CALLBACK_PROCESSING_FAILED',
      transactionId: callbackData.transactionId,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ip
    });
  }

  async handleStatusCheckFailure(statusId, transactionId, error, context, responseTime) {
    this.logger.error('Payment status check failed', {
      statusId,
      transactionId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2),
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logTelebirrAction({
      action: 'STATUS_CHECK_FAILED',
      transactionId,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ip
    });
  }

  async handleAnalyticsFailure(analyticsId, timeframe, error, context, responseTime) {
    this.logger.error('Transaction analytics generation failed', {
      analyticsId,
      timeframe,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2),
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logTelebirrAction({
      action: 'ANALYTICS_GENERATION_FAILED',
      timeframe,
      error: error.message,
      errorCode: error.code
    });
  }
}

/**
 * 🎯 ENTERPRISE ERROR CLASS
 */
class TelebirrIntegrationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'TelebirrIntegrationError';
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
TelebirrIntegrationError.CODES = {
  // 🔐 Validation Errors
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  INVALID_BUNDLE_AMOUNT: 'INVALID_BUNDLE_AMOUNT',
  INVALID_CURRENCY: 'INVALID_CURRENCY',
  INVALID_PHONE_NUMBER: 'INVALID_PHONE_NUMBER',
  DUPLICATE_PAYMENT: 'DUPLICATE_PAYMENT',
  
  // 🔐 Security Errors
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  SIGNATURE_FAILED: 'SIGNATURE_FAILED',
  INVALID_CALLBACK_DATA: 'INVALID_CALLBACK_DATA',
  EXPIRED_CALLBACK: 'EXPIRED_CALLBACK',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  MERCHANT_MISMATCH: 'MERCHANT_MISMATCH',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  
  // 🔗 API Errors
  TELEBIRR_API_ERROR: 'TELEBIRR_API_ERROR',
  TELEBIRR_REQUEST_RETRIES_EXCEEDED: 'TELEBIRR_REQUEST_RETRIES_EXCEEDED',
  TRANSACTION_VERIFICATION_FAILED: 'TRANSACTION_VERIFICATION_FAILED',
  STATUS_CHECK_FAILED: 'STATUS_CHECK_FAILED',
  
  // ⚡ Circuit Breaker Errors
  CIRCUIT_BREAKER_OPEN: 'CIRCUIT_BREAKER_OPEN',
  
  // 📊 Analytics Errors
  ANALYTICS_GENERATION_FAILED: 'ANALYTICS_GENERATION_FAILED'
};

module.exports = {
  TelebirrIntegration,
  TelebirrIntegrationError
};