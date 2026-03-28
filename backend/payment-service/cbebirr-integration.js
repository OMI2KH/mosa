/**
 * 🏢 MOSA FORGE - Enterprise CBE Birr Integration Service
 * 💰 Secure 1,999 ETB Bundle Payment Processing
 * 🏦 Commercial Bank of Ethiopia Digital Payment Gateway
 * 🔐 Bank-Grade Security with AES-256 & RSA Encryption
 * 📊 Real-time Analytics & Automated Reconciliation
 * 🚀 Microservice-Ready Enterprise Architecture
 * 
 * @module CBEBirrIntegration
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const axios = require('axios');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

// 🏗️ Enterprise Dependencies
const EnterpriseLogger = require('../../utils/enterprise-logger');
const SecurityMetrics = require('../../utils/security-metrics');
const AuditLogger = require('../../utils/audit-logger');
const CircuitBreaker = require('../../utils/circuit-breaker');
const RateLimiter = require('../../utils/rate-limiter');
const EncryptionService = require('../../utils/encryption-service');

class CBEBirrIntegration extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 🎯 Enterprise Configuration
    this.config = {
      // 🔗 API Configuration
      baseUrl: process.env.CBE_BIRR_BASE_URL || 'https://api.cbe.com.et/birr/v2',
      merchantId: process.env.CBE_MERCHANT_ID,
      terminalId: process.env.CBE_TERMINAL_ID,
      apiKey: process.env.CBE_API_KEY,
      apiSecret: process.env.CBE_API_SECRET,
      timeout: 30000,

      // 💰 Payment Configuration
      bundleAmount: 1999,
      currency: 'ETB',
      paymentMethods: ['USSD', 'APP', 'QR', 'WEB'],

      // 🔐 Security Configuration
      encryption: {
        algorithm: 'aes-256-gcm',
        key: process.env.CBE_ENCRYPTION_KEY,
        ivLength: 16
      },
      signature: {
        algorithm: 'RSA-SHA512',
        privateKey: process.env.CBE_PRIVATE_KEY,
        publicKey: process.env.CBE_PUBLIC_KEY
      },

      // 🔄 Resilience Configuration
      retryPolicy: {
        maxRetries: 3,
        retryDelay: 2000,
        backoffMultiplier: 2
      },
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60000,
        halfOpenMaxAttempts: 3
      },

      // 📊 Monitoring Configuration
      enableMetrics: true,
      enableAuditTrail: true,
      enablePerformanceTracking: true,

      ...config
    };

    // 🏗️ Service State
    this.serviceState = {
      initialized: false,
      healthy: false,
      lastHealthCheck: null,
      activeTransactions: 0
    };

    this.metrics = {
      paymentsInitiated: 0,
      paymentsCompleted: 0,
      paymentsFailed: 0,
      callbacksProcessed: 0,
      reconciliations: 0,
      revenueProcessed: 0,
      averageResponseTime: 0
    };

    this.initializeEnterpriseServices();
  }

  /**
   * 🏗️ Initialize Enterprise Services
   */
  async initializeEnterpriseServices() {
    try {
      // 📊 Enterprise Logging
      this.logger = new EnterpriseLogger({
        service: 'cbe-birr-integration',
        module: 'payment-service',
        environment: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL || 'info'
      });

      // 🛡️ Security Metrics
      this.securityMetrics = new SecurityMetrics({
        service: 'cbe-birr-integration',
        businessUnit: 'revenue-operations'
      });

      // 📝 Audit Logger
      this.auditLogger = new AuditLogger({
        service: 'cbe-birr-integration',
        retentionPeriod: '365d',
        encryption: true
      });

      // ⚡ Circuit Breaker
      this.circuitBreaker = new CircuitBreaker({
        failureThreshold: this.config.circuitBreaker.failureThreshold,
        resetTimeout: this.config.circuitBreaker.resetTimeout,
        name: 'cbe-birr-integration'
      });

      // 🚦 Rate Limiter
      this.rateLimiter = new RateLimiter({
        requestsPerMinute: 100,
        namespace: 'cbe_birr_api'
      });

      // 🔐 Encryption Service
      this.encryptionService = new EncryptionService({
        algorithm: this.config.encryption.algorithm,
        key: this.config.encryption.key
      });

      // 💾 Database Client
      this.prisma = new PrismaClient({
        log: ['error', 'warn'],
        datasourceUrl: process.env.DATABASE_URL,
        transactionTimeout: 30000
      });

      // 🔄 Redis Cluster
      this.redis = new Redis.Cluster([
        { host: process.env.REDIS_HOST_1, port: process.env.REDIS_PORT_1 },
        { host: process.env.REDIS_HOST_2, port: process.env.REDIS_PORT_2 },
        { host: process.env.REDIS_HOST_3, port: process.env.REDIS_PORT_3 }
      ], {
        scaleReads: 'slave',
        redisOptions: {
          password: process.env.REDIS_PASSWORD,
          tls: process.env.NODE_ENV === 'production' ? {} : undefined
        }
      });

      // 🔗 API Clients
      this.initializeAPIClients();

      // 🏥 Health Check
      await this.performHealthCheck();

      this.serviceState.initialized = true;
      this.serviceState.healthy = true;
      this.serviceState.lastHealthCheck = new Date();

      this.logger.system('CBE Birr Enterprise Integration initialized successfully', {
        service: 'cbe-birr-integration',
        version: '2.0.0',
        baseUrl: this.config.baseUrl,
        features: Object.keys(this.config).filter(k => this.config[k] === true)
      });

    } catch (error) {
      this.logger.critical('CBE Birr Enterprise Integration initialization failed', {
        error: error.message,
        stack: error.stack,
        service: 'cbe-birr-integration'
      });
      throw error;
    }
  }

  /**
   * 🔗 Initialize Enterprise API Clients
   */
  initializeAPIClients() {
    const commonConfig = {
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MosaForge-Enterprise/2.0',
        'X-Platform': 'MOSA-FORGE',
        'X-Service': 'payment-service'
      }
    };

    this.apiClients = {
      // 💰 Payment Processing
      payments: axios.create({
        ...commonConfig,
        baseURL: `${this.config.baseUrl}/payments`
      }),

      // 🔍 Transaction Inquiry
      transactions: axios.create({
        ...commonConfig,
        baseURL: `${this.config.baseUrl}/transactions`
      }),

      // 📊 Reconciliation
      reconciliation: axios.create({
        ...commonConfig,
        baseURL: `${this.config.baseUrl}/reconciliation`
      }),

      // 🏦 Account Services
      accounts: axios.create({
        ...commonConfig,
        baseURL: `${this.config.baseUrl}/accounts`
      })
    };

    // 🔐 Add authentication interceptors
    Object.values(this.apiClients).forEach(client => {
      client.interceptors.request.use(
        config => this.authenticateRequest(config),
        error => Promise.reject(error)
      );

      client.interceptors.response.use(
        response => response,
        error => this.handleAPIError(error)
      );
    });
  }

  /**
   * 💰 INITIATE BUNDLE PAYMENT - Enterprise Grade
   */
  async initiateBundlePayment(paymentRequest, context = {}) {
    const startTime = performance.now();
    const paymentId = this.generatePaymentId();
    const traceId = context.traceId || paymentId;

    try {
      // 🛡️ Pre-flight Checks
      await this.performPreFlightChecks();

      // ✅ Validate Payment Request
      await this.validateBundlePaymentRequest(paymentRequest);

      // 🏦 Validate CBE Account
      const accountValidation = await this.validateCBEAcount(paymentRequest.customerAccount);

      // 🔐 Encrypt Payment Data
      const encryptedPayload = await this.encryptPaymentPayload({
        ...paymentRequest,
        accountValidation,
        traceId
      });

      // 📝 Create Digital Signature
      const signature = await this.createDigitalSignature(encryptedPayload);

      // 🔗 Execute Payment Request with Retry Logic
      const cbeResponse = await this.executeWithRetry(
        () => this.sendPaymentRequest(encryptedPayload, signature, traceId)
      );

      // 💾 Store Payment Record
      const paymentRecord = await this.storePaymentRecord({
        paymentId,
        paymentRequest,
        cbeResponse,
        accountValidation,
        traceId
      });

      // 📊 Record Metrics
      await this.recordPaymentMetrics({
        paymentId,
        amount: paymentRequest.amount,
        responseTime: performance.now() - startTime,
        status: 'initiated'
      });

      this.metrics.paymentsInitiated++;
      this.serviceState.activeTransactions++;

      this.logger.business('Bundle payment initiated successfully', {
        paymentId,
        traceId,
        transactionId: cbeResponse.transactionId,
        amount: paymentRequest.amount,
        customerAccount: this.maskAccountNumber(paymentRequest.customerAccount)
      });

      return {
        success: true,
        paymentId,
        transactionId: cbeResponse.transactionId,
        paymentMethods: this.generatePaymentMethods(cbeResponse),
        expiresAt: cbeResponse.expiresAt,
        nextSteps: this.generateNextSteps('initiated')
      };

    } catch (error) {
      await this.handlePaymentFailure({
        paymentId,
        paymentRequest,
        error,
        context,
        responseTime: performance.now() - startTime,
        traceId
      });
      throw error;
    }
  }

  /**
   * ✅ VALIDATE BUNDLE PAYMENT REQUEST
   */
  async validateBundlePaymentRequest(paymentRequest) {
    const validationRules = {
      // 🔍 Required Fields Validation
      requiredFields: ['customerAccount', 'customerName', 'amount', 'currency', 'orderId', 'description'],
      
      // 💰 Amount Validation
      amount: {
        exact: this.config.bundleAmount,
        tolerance: 0.01,
        currency: this.config.currency
      },
      
      // 🏦 Account Validation
      account: {
        pattern: /^\d{13}$/,
        bank: 'CBE'
      },
      
      // 📝 Business Rules
      business: {
        maxAmount: 10000,
        minAmount: 100,
        allowedCurrencies: ['ETB']
      }
    };

    const errors = [];

    // ✅ Check Required Fields
    const missingFields = validationRules.requiredFields.filter(field => !paymentRequest[field]);
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // ✅ Validate Bundle Amount
    if (paymentRequest.amount !== validationRules.amount.exact) {
      errors.push(`Amount must be exactly ${validationRules.amount.exact} ETB`);
    }

    // ✅ Validate Currency
    if (paymentRequest.currency !== validationRules.amount.currency) {
      errors.push(`Currency must be ${validationRules.amount.currency}`);
    }

    // ✅ Validate Account Number
    if (!validationRules.account.pattern.test(paymentRequest.customerAccount)) {
      errors.push('Invalid CBE account number format');
    }

    // ✅ Check for Duplicate Payment
    const duplicateCheck = await this.checkDuplicatePayment(paymentRequest.orderId);
    if (duplicateCheck.exists) {
      errors.push(`Duplicate payment detected for order: ${paymentRequest.orderId}`);
    }

    if (errors.length > 0) {
      throw new CBEError('PAYMENT_VALIDATION_FAILED', 'Payment request validation failed', {
        errors,
        orderId: paymentRequest.orderId,
        amount: paymentRequest.amount
      });
    }

    this.logger.security('Bundle payment validation passed', {
      orderId: paymentRequest.orderId,
      amount: paymentRequest.amount,
      validations: Object.keys(validationRules)
    });
  }

  /**
   * 🏦 VALIDATE CBE ACCOUNT
   */
  async validateCBEAcount(accountNumber) {
    try {
      const cacheKey = `cbe_account_validation:${accountNumber}`;
      const cachedValidation = await this.redis.get(cacheKey);

      if (cachedValidation) {
        return JSON.parse(cachedValidation);
      }

      const response = await this.apiClients.accounts.get(`/validate/${accountNumber}`, {
        headers: this.generateAuthHeaders()
      });

      if (!response.data.isValid) {
        throw new CBEError('INVALID_ACCOUNT', 'CBE account validation failed', {
          account: this.maskAccountNumber(accountNumber)
        });
      }

      const validationResult = {
        isValid: true,
        accountName: response.data.accountName,
        accountType: response.data.accountType,
        branch: response.data.branch,
        validatedAt: new Date().toISOString()
      };

      // 💾 Cache validation result
      await this.redis.setex(cacheKey, 3600, JSON.stringify(validationResult));

      this.logger.security('CBE account validation successful', {
        account: this.maskAccountNumber(accountNumber),
        accountName: validationResult.accountName,
        accountType: validationResult.accountType
      });

      return validationResult;

    } catch (error) {
      this.logger.error('CBE account validation failed', {
        account: this.maskAccountNumber(accountNumber),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🔐 ENCRYPT PAYMENT PAYLOAD
   */
  async encryptPaymentPayload(paymentData) {
    try {
      const payload = {
        merchantId: this.config.merchantId,
        terminalId: this.config.terminalId,
        customerAccount: paymentData.customerAccount,
        customerName: paymentData.customerName,
        amount: paymentData.amount,
        currency: paymentData.currency,
        orderId: paymentData.orderId,
        description: paymentData.description,
        timestamp: Date.now(),
        traceId: paymentData.traceId,
        callbackUrl: `${process.env.API_BASE_URL}/v1/payments/cbe-birr/callback`,
        metadata: {
          platform: 'mosa-forge',
          version: '2.0',
          service: 'payment-service'
        }
      };

      const encryptedData = await this.encryptionService.encrypt(JSON.stringify(payload));

      return {
        encryptedData,
        merchantId: this.config.merchantId,
        terminalId: this.config.terminalId,
        timestamp: payload.timestamp,
        traceId: payload.traceId
      };

    } catch (error) {
      this.logger.error('Payment payload encryption failed', {
        traceId: paymentData.traceId,
        error: error.message
      });
      throw new CBEError('ENCRYPTION_FAILED', 'Failed to encrypt payment data');
    }
  }

  /**
   * 📝 CREATE DIGITAL SIGNATURE
   */
  async createDigitalSignature(encryptedPayload) {
    try {
      const sign = crypto.createSign(this.config.signature.algorithm);
      const dataToSign = `${encryptedPayload.merchantId}${encryptedPayload.terminalId}${encryptedPayload.encryptedData}${encryptedPayload.timestamp}`;
      
      sign.update(dataToSign);
      sign.end();

      const signature = sign.sign(this.config.signature.privateKey, 'base64');

      return {
        signature,
        algorithm: this.config.signature.algorithm,
        timestamp: encryptedPayload.timestamp
      };

    } catch (error) {
      this.logger.error('Digital signature creation failed', {
        error: error.message
      });
      throw new CBEError('SIGNATURE_FAILED', 'Failed to create digital signature');
    }
  }

  /**
   * 🔗 SEND PAYMENT REQUEST
   */
  async sendPaymentRequest(encryptedPayload, signature, traceId) {
    const requestPayload = {
      merchantId: encryptedPayload.merchantId,
      terminalId: encryptedPayload.terminalId,
      encryptedData: encryptedPayload.encryptedData,
      signature: signature.signature,
      timestamp: encryptedPayload.timestamp,
      algorithm: signature.algorithm,
      traceId
    };

    const response = await this.apiClients.payments.post('/initiate', requestPayload, {
      headers: this.generateAuthHeaders()
    });

    if (!response.data.success) {
      throw new CBEError('CBE_API_ERROR', response.data.message || 'CBE Birr API error', {
        cbeErrorCode: response.data.errorCode,
        traceId
      });
    }

    return {
      transactionId: response.data.transactionId,
      referenceNumber: response.data.referenceNumber,
      paymentUrl: response.data.paymentUrl,
      qrCode: response.data.qrCode,
      ussdCode: response.data.ussdCode,
      expiresAt: new Date(response.data.expiresAt),
      rawResponse: response.data
    };
  }

  /**
   * 🔄 PROCESS PAYMENT CALLBACK - Enterprise Grade
   */
  async processPaymentCallback(callbackData, context = {}) {
    const startTime = performance.now();
    const callbackId = this.generateCallbackId();
    const traceId = context.traceId || callbackId;

    try {
      // 🛡️ Validate Callback Signature
      await this.validateCallbackSignature(callbackData);

      // 🔓 Decrypt Callback Data
      const decryptedData = await this.decryptCallbackData(callbackData);

      // 🏦 Verify Bank Transaction
      const verification = await this.verifyBankTransaction(decryptedData);

      // 💾 Update Payment Status
      const updatedPayment = await this.updatePaymentStatus(decryptedData, verification);

      // 📧 Send Notifications
      await this.sendPaymentNotifications(updatedPayment, decryptedData);

      // 📊 Record Metrics
      await this.recordPaymentMetrics({
        paymentId: decryptedData.paymentId,
        amount: decryptedData.amount,
        responseTime: performance.now() - startTime,
        status: 'completed'
      });

      this.metrics.callbacksProcessed++;
      this.metrics.revenueProcessed += decryptedData.amount;
      this.serviceState.activeTransactions--;

      this.logger.business('Payment callback processed successfully', {
        callbackId,
        traceId,
        transactionId: decryptedData.transactionId,
        status: decryptedData.status,
        amount: decryptedData.amount
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
      await this.handleCallbackFailure({
        callbackId,
        callbackData,
        error,
        context,
        responseTime: performance.now() - startTime,
        traceId
      });
      throw error;
    }
  }

  /**
   * 🏦 VERIFY BANK TRANSACTION
   */
  async verifyBankTransaction(decryptedData) {
    try {
      const response = await this.apiClients.transactions.get(
        `/${decryptedData.transactionId}`,
        { headers: this.generateAuthHeaders() }
      );

      if (!response.data.success) {
        throw new CBEError('TRANSACTION_VERIFICATION_FAILED', 'Bank transaction verification failed');
      }

      const bankData = response.data.transaction;

      // ✅ Verify Amount Match
      if (bankData.amount !== decryptedData.amount) {
        throw new CBEError('AMOUNT_MISMATCH', 'Transaction amount mismatch', {
          expected: decryptedData.amount,
          actual: bankData.amount
        });
      }

      // ✅ Verify Merchant ID
      if (bankData.merchantId !== this.config.merchantId) {
        throw new CBEError('MERCHANT_MISMATCH', 'Merchant ID verification failed');
      }

      // ✅ Verify Transaction Status
      if (!['COMPLETED', 'SUCCESS'].includes(bankData.status)) {
        throw new CBEError('INVALID_TRANSACTION_STATUS', 'Transaction not completed', {
          status: bankData.status
        });
      }

      return {
        verified: true,
        status: bankData.status,
        amount: bankData.amount,
        referenceNumber: bankData.referenceNumber,
        processedAt: bankData.processedAt,
        bankConfirmation: bankData.bankConfirmation
      };

    } catch (error) {
      this.logger.error('Bank transaction verification failed', {
        transactionId: decryptedData.transactionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🔧 UTILITY METHODS
   */

  generatePaymentId() {
    return `cbe_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  generateCallbackId() {
    return `callback_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  maskAccountNumber(accountNumber) {
    return accountNumber ? `${accountNumber.slice(0, 3)}****${accountNumber.slice(-3)}` : '***';
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
      'X-Signature': signature,
      'X-Merchant-ID': this.config.merchantId,
      'X-Terminal-ID': this.config.terminalId
    };
  }

  authenticateRequest(config) {
    const authHeaders = this.generateAuthHeaders();
    Object.assign(config.headers, authHeaders);
    return config;
  }

  async executeWithRetry(operation, context = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.retryPolicy.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < this.config.retryPolicy.maxRetries) {
          const delay = this.config.retryPolicy.retryDelay * Math.pow(this.config.retryPolicy.backoffMultiplier, attempt - 1);
          await this.delay(delay);
        }
      }
    }

    throw lastError;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generatePaymentMethods(cbeResponse) {
    return {
      USSD: cbeResponse.ussdCode,
      QR_CODE: cbeResponse.qrCode,
      MOBILE_APP: cbeResponse.paymentUrl,
      WEB: cbeResponse.paymentUrl
    };
  }

  generateNextSteps(status) {
    const nextSteps = {
      initiated: ['complete_payment', 'await_callback', 'verify_status'],
      completed: ['notify_student', 'update_enrollment', 'distribute_revenue'],
      failed: ['notify_student', 'suggest_alternative', 'log_failure']
    };

    return nextSteps[status] || [];
  }

  /**
   * 🏥 HEALTH CHECK
   */
  async performHealthCheck() {
    try {
      const response = await this.apiClients.accounts.get('/health', {
        timeout: 10000,
        headers: this.generateAuthHeaders()
      });

      this.serviceState.healthy = response.data.status === 'healthy';
      this.serviceState.lastHealthCheck = new Date();

      if (!this.serviceState.healthy) {
        this.logger.warn('CBE Birr service health check failed', {
          status: response.data.status,
          message: response.data.message
        });
      }

      return this.serviceState.healthy;

    } catch (error) {
      this.serviceState.healthy = false;
      this.logger.error('CBE Birr service health check failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * 📊 GET SERVICE METRICS
   */
  getServiceMetrics() {
    return {
      service: 'cbe-birr-integration',
      timestamp: new Date().toISOString(),
      state: this.serviceState,
      metrics: this.metrics,
      configuration: {
        baseUrl: this.config.baseUrl,
        merchantId: this.config.merchantId,
        bundleAmount: this.config.bundleAmount
      }
    };
  }

  /**
   * 🎯 ERROR HANDLING
   */
  async handlePaymentFailure({ paymentId, paymentRequest, error, context, responseTime, traceId }) {
    this.metrics.paymentsFailed++;

    this.logger.error('Bundle payment initiation failed', {
      paymentId,
      traceId,
      orderId: paymentRequest.orderId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2)
    });

    await this.auditLogger.logSecurityEvent({
      event: 'PAYMENT_INITIATION_FAILED',
      paymentId,
      orderId: paymentRequest.orderId,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    // 🔄 Circuit Breaker Tracking
    if (error.isOperational) {
      this.circuitBreaker.recordFailure();
    }
  }

  async handleCallbackFailure({ callbackId, callbackData, error, context, responseTime, traceId }) {
    this.logger.error('Payment callback processing failed', {
      callbackId,
      traceId,
      transactionId: callbackData.transactionId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2)
    });

    await this.auditLogger.logSecurityEvent({
      event: 'CALLBACK_PROCESSING_FAILED',
      callbackId,
      transactionId: callbackData.transactionId,
      error: error.message,
      errorCode: error.code
    });
  }

  handleAPIError(error) {
    const apiError = new CBEError(
      'CBE_API_ERROR',
      `CBE Birr API request failed: ${error.message}`,
      {
        statusCode: error.response?.status,
        cbeError: error.response?.data?.error
      }
    );

    this.logger.error('CBE Birr API request failed', {
      error: error.message,
      statusCode: error.response?.status,
      url: error.config?.url
    });

    return Promise.reject(apiError);
  }
}

/**
 * 🎯 ENTERPRISE ERROR CLASS
 */
class CBEError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'CBEError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
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

// 🎯 Enterprise Error Codes
CBEError.CODES = {
  // 🔐 Validation Errors
  PAYMENT_VALIDATION_FAILED: 'PAYMENT_VALIDATION_FAILED',
  INVALID_BUNDLE_AMOUNT: 'INVALID_BUNDLE_AMOUNT',
  INVALID_CURRENCY: 'INVALID_CURRENCY',
  INVALID_ACCOUNT: 'INVALID_ACCOUNT',
  DUPLICATE_PAYMENT: 'DUPLICATE_PAYMENT',

  // 🔐 Security Errors
  ENCRYPTION_FAILED: 'ENCRYPTION_FAILED',
  SIGNATURE_FAILED: 'SIGNATURE_FAILED',
  CALLBACK_VALIDATION_FAILED: 'CALLBACK_VALIDATION_FAILED',

  // 🏦 Banking Errors
  TRANSACTION_VERIFICATION_FAILED: 'TRANSACTION_VERIFICATION_FAILED',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  MERCHANT_MISMATCH: 'MERCHANT_MISMATCH',
  INVALID_TRANSACTION_STATUS: 'INVALID_TRANSACTION_STATUS',

  // 🔗 API Errors
  CBE_API_ERROR: 'CBE_API_ERROR',
  CIRCUIT_BREAKER_OPEN: 'CIRCUIT_BREAKER_OPEN',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

module.exports = {
  CBEBirrIntegration,
  CBEError
};