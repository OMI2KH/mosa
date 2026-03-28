/**
 * 🎯 MOSA FORGE: Enterprise Payment Methods Service
 * 
 * @module PaymentMethods
 * @description Manages payment methods, gateway integrations, and transaction processing
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Multi-gateway integration (Telebirr, CBE Birr)
 * - 1,999 ETB bundle payment processing
 * - Revenue split automation (1000/999)
 * - Installment plan management
 * - Fraud detection and security
 * - Payment method validation
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');

// 🏗️ Enterprise Constants
const PAYMENT_METHODS = {
  TELEBIRR: 'telebirr',
  CBE_BIRR: 'cbe_birr',
  BANK_TRANSFER: 'bank_transfer',
  CARD: 'card',
  INSTALLMENT: 'installment'
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
};

const GATEWAY_CONFIG = {
  [PAYMENT_METHODS.TELEBIRR]: {
    name: 'Telebirr',
    baseUrl: process.env.TELEBIRR_BASE_URL || 'https://api.telebirr.com',
    apiKey: process.env.TELEBIRR_API_KEY,
    secret: process.env.TELEBIRR_SECRET,
    timeout: 30000,
    retryAttempts: 3
  },
  [PAYMENT_METHODS.CBE_BIRR]: {
    name: 'CBE Birr',
    baseUrl: process.env.CBE_BIRR_BASE_URL || 'https://api.cbebirr.com',
    apiKey: process.env.CBE_BIRR_API_KEY,
    secret: process.env.CBE_BIRR_SECRET,
    timeout: 30000,
    retryAttempts: 3
  }
};

/**
 * 🏗️ Enterprise Payment Methods Class
 * @class PaymentMethods
 * @extends EventEmitter
 */
class PaymentMethods extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 🏗️ Enterprise Configuration
    this.config = {
      redis: options.redis || {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      },
      prisma: options.prisma || new PrismaClient(),
      bundlePrice: 1999,
      revenueSplit: { mosa: 1000, expert: 999 },
      defaultTimeout: 30000,
      maxRetries: 3
    };

    // 🏗️ Service Dependencies
    this.redis = new Redis(this.config.redis);
    this.prisma = this.config.prisma;
    this.circuitBreakers = this._initializeCircuitBreakers();
    
    // 🏗️ Payment Gateways
    this.gateways = this._initializeGateways();
    
    // 🏗️ Performance Monitoring
    this.metrics = {
      paymentsInitiated: 0,
      paymentsCompleted: 0,
      paymentsFailed: 0,
      totalRevenue: 0,
      gatewayStats: {}
    };

    this._initializeEventHandlers();
    this._startHealthChecks();
  }

  /**
   * 🏗️ Initialize Circuit Breakers for Payment Gateways
   * @private
   */
  _initializeCircuitBreakers() {
    const breakers = {};
    
    Object.keys(PAYMENT_METHODS).forEach(method => {
      let state = 'CLOSED';
      let failureCount = 0;
      const failureThreshold = 5;
      const resetTimeout = 60000;
      let lastFailureTime = null;

      breakers[method] = {
        execute: async (operation) => {
          if (state === 'OPEN') {
            if (Date.now() - lastFailureTime > resetTimeout) {
              state = 'HALF_OPEN';
            } else {
              throw new Error(`Payment gateway ${method} circuit breaker is OPEN`);
            }
          }

          try {
            const result = await operation();
            if (state === 'HALF_OPEN') {
              failureCount = 0;
              state = 'CLOSED';
            }
            return result;
          } catch (error) {
            failureCount++;
            lastFailureTime = Date.now();
            
            if (failureCount >= failureThreshold) {
              state = 'OPEN';
              this.emit('gateway.circuit.open', { gateway: method, error: error.message });
            }
            throw error;
          }
        },
        getState: () => state
      };
    });

    return breakers;
  }

  /**
   * 🏗️ Initialize Payment Gateways
   * @private
   */
  _initializeGateways() {
    return {
      [PAYMENT_METHODS.TELEBIRR]: {
        processPayment: async (paymentData) => this._processTelebirrPayment(paymentData),
        validate: async (paymentData) => this._validateTelebirrPayment(paymentData),
        refund: async (paymentId) => this._processTelebirrRefund(paymentId)
      },
      [PAYMENT_METHODS.CBE_BIRR]: {
        processPayment: async (paymentData) => this._processCbeBirrPayment(paymentData),
        validate: async (paymentData) => this._validateCbeBirrPayment(paymentData),
        refund: async (paymentId) => this._processCbeBirrRefund(paymentId)
      }
    };
  }

  /**
   * 🏗️ Initialize Enterprise Event Handlers
   * @private
   */
  _initializeEventHandlers() {
    this.on('payment.initiated', (data) => {
      this._logEvent('PAYMENT_INITIATED', data);
      this.metrics.paymentsInitiated++;
    });

    this.on('payment.completed', (data) => {
      this._logEvent('PAYMENT_COMPLETED', data);
      this.metrics.paymentsCompleted++;
      this.metrics.totalRevenue += data.amount;
    });

    this.on('payment.failed', (data) => {
      this._logEvent('PAYMENT_FAILED', data);
      this.metrics.paymentsFailed++;
    });

    this.on('revenue.split', (data) => {
      this._logEvent('REVENUE_SPLIT', data);
    });

    this.on('gateway.status', (data) => {
      this._logEvent('GATEWAY_STATUS', data);
    });
  }

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Get Available Payment Methods
   * @param {Object} userData - User information and context
   * @returns {Promise<Object>} Available payment methods with details
   */
  async getAvailablePaymentMethods(userData) {
    const traceId = uuidv4();
    
    try {
      this.emit('payment.methods.requested', { traceId, userData });

      // 🏗️ Validate user and context
      await this._validateUserContext(userData);

      // 🏗️ Get user payment history for personalized options
      const userPaymentHistory = await this._getUserPaymentHistory(userData.userId);
      
      // 🏗️ Check gateway availability
      const availableGateways = await this._getAvailableGateways();
      
      // 🏗️ Build payment methods response
      const paymentMethods = await this._buildPaymentMethodsResponse(
        userData, 
        availableGateways, 
        userPaymentHistory
      );

      this.emit('payment.methods.provided', { traceId, methods: paymentMethods });

      return {
        success: true,
        paymentMethods,
        bundlePrice: this.config.bundlePrice,
        revenueSplit: this.config.revenueSplit,
        traceId
      };

    } catch (error) {
      this.emit('payment.methods.failed', { traceId, error: error.message });
      this._logError('GET_PAYMENT_METHODS_FAILED', error, { traceId, userData });
      
      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🎯 PROCESS PAYMENT: Handle payment processing for 1,999 ETB bundle
   * @param {Object} paymentRequest - Payment request data
   * @returns {Promise<Object>} Payment processing result
   */
  async processBundlePayment(paymentRequest) {
    const startTime = Date.now();
    const paymentId = uuidv4();
    const traceId = paymentRequest.traceId || uuidv4();

    try {
      this.emit('payment.initiated', { paymentId, traceId, paymentRequest });

      // 🏗️ Validate payment request
      await this._validatePaymentRequest(paymentRequest);

      // 🏗️ Fraud detection check
      await this._performFraudCheck(paymentRequest);

      // 🏗️ Process payment through selected gateway
      const paymentResult = await this._processPaymentThroughGateway(paymentRequest, paymentId);

      // 🏗️ Create payment record
      const paymentRecord = await this._createPaymentRecord({
        ...paymentRequest,
        paymentId,
        traceId,
        gatewayResponse: paymentResult
      });

      // 🏗️ Initialize revenue split
      await this._initializeRevenueSplit(paymentRecord.id);

      // 🏗️ Update enrollment status
      await this._updateEnrollmentStatus(paymentRequest.enrollmentId, 'ACTIVE');

      const processingTime = Date.now() - startTime;

      const result = {
        success: true,
        paymentId: paymentRecord.id,
        status: PAYMENT_STATUS.COMPLETED,
        amount: paymentRecord.amount,
        gateway: paymentRecord.gateway,
        transactionId: paymentResult.transactionId,
        revenueSplit: this.config.revenueSplit,
        nextPayout: this._getNextPayoutSchedule(),
        traceId,
        processingTime
      };

      this.emit('payment.completed', result);
      this._logSuccess('PAYMENT_PROCESSED', { paymentId, processingTime });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      const errorResult = {
        success: false,
        paymentId,
        error: error.message,
        errorCode: error.code || 'PAYMENT_FAILED',
        traceId,
        timestamp: new Date().toISOString(),
        processingTime
      };

      this.emit('payment.failed', errorResult);
      this._logError('PAYMENT_PROCESSING_FAILED', error, { paymentId, traceId });

      // 🏗️ Update payment status to failed
      await this._updatePaymentStatus(paymentId, PAYMENT_STATUS.FAILED, error.message);

      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🎯 GET INSTALLMENT PLANS: Calculate installment options
   * @param {Object} installmentRequest - Installment calculation request
   * @returns {Promise<Object>} Installment plan options
   */
  async getInstallmentPlans(installmentRequest) {
    const traceId = uuidv4();

    try {
      this.emit('installment.plans.requested', { traceId, installmentRequest });

      // 🏗️ Validate installment request
      await this._validateInstallmentRequest(installmentRequest);

      // 🏗️ Calculate installment plans
      const plans = this._calculateInstallmentPlans(installmentRequest);

      // 🏗️ Check user eligibility for installments
      const eligibility = await this._checkInstallmentEligibility(installmentRequest.userId);

      const result = {
        success: true,
        bundlePrice: this.config.bundlePrice,
        installmentPlans: plans,
        eligibility,
        terms: this._getInstallmentTerms(),
        traceId
      };

      this.emit('installment.plans.provided', { traceId, plans: result });

      return result;

    } catch (error) {
      this.emit('installment.plans.failed', { traceId, error: error.message });
      this._logError('INSTALLMENT_PLANS_FAILED', error, { traceId, installmentRequest });
      
      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🏗️ Validate User Context
   * @private
   */
  async _validateUserContext(userData) {
    if (!userData.userId) {
      throw new Error('User ID is required');
    }

    // Check if user exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: userData.userId },
      select: { id: true, status: true, faydaId: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('User account is not active');
    }

    return true;
  }

  /**
   * 🏗️ Get User Payment History
   * @private
   */
  async _getUserPaymentHistory(userId) {
    return await this.prisma.payment.findMany({
      where: {
        userId,
        status: {
          in: [PAYMENT_STATUS.COMPLETED, PAYMENT_STATUS.FAILED]
        }
      },
      select: {
        gateway: true,
        status: true,
        amount: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
  }

  /**
   * 🏗️ Get Available Gateways with Health Check
   * @private
   */
  async _getAvailableGateways() {
    const availableGateways = {};
    
    for (const [method, gateway] of Object.entries(this.gateways)) {
      try {
        const isAvailable = await this._checkGatewayHealth(method);
        availableGateways[method] = {
          available: isAvailable,
          config: GATEWAY_CONFIG[method]
        };
      } catch (error) {
        availableGateways[method] = {
          available: false,
          error: error.message
        };
      }
    }

    return availableGateways;
  }

  /**
   * 🏗️ Check Gateway Health
   * @private
   */
  async _checkGatewayHealth(gateway) {
    const cacheKey = `gateway:health:${gateway}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return cached === 'healthy';
    }

    try {
      // Simulate gateway health check
      // In production, this would make an actual API call
      const isHealthy = await this._performGatewayHealthCheck(gateway);
      
      await this.redis.set(
        cacheKey, 
        isHealthy ? 'healthy' : 'unhealthy', 
        'EX', 
        300 // 5 minutes cache
      );

      this.emit('gateway.health.checked', { gateway, healthy: isHealthy });
      
      return isHealthy;
    } catch (error) {
      await this.redis.set(cacheKey, 'unhealthy', 'EX', 60); // 1 minute cache on error
      return false;
    }
  }

  /**
   * 🏗️ Perform Gateway Health Check
   * @private
   */
  async _performGatewayHealthCheck(gateway) {
    // 🏗️ Implement actual gateway health checks
    switch (gateway) {
      case PAYMENT_METHODS.TELEBIRR:
        return await this._checkTelebirrHealth();
      case PAYMENT_METHODS.CBE_BIRR:
        return await this._checkCbeBirrHealth();
      default:
        return false;
    }
  }

  /**
   * 🏗️ Build Payment Methods Response
   * @private
   */
  async _buildPaymentMethodsResponse(userData, availableGateways, paymentHistory) {
    const methods = [];

    // 🏗️ Telebirr Payment Method
    if (availableGateways[PAYMENT_METHODS.TELEBIRR]?.available) {
      methods.push({
        id: PAYMENT_METHODS.TELEBIRR,
        name: 'Telebirr',
        description: 'Instant payment via Telebirr mobile money',
        icon: 'telebirr-icon',
        processingFee: 0,
        estimatedTime: 'Instant',
        limits: {
          min: 1,
          max: 50000,
          daily: 100000
        },
        features: [
          'Instant confirmation',
          'Mobile money integration',
          '24/7 availability',
          'Secure encryption'
        ],
        recommended: paymentHistory.some(p => p.gateway === PAYMENT_METHODS.TELEBIRR && p.status === PAYMENT_STATUS.COMPLETED)
      });
    }

    // 🏗️ CBE Birr Payment Method
    if (availableGateways[PAYMENT_METHODS.CBE_BIRR]?.available) {
      methods.push({
        id: PAYMENT_METHODS.CBE_BIRR,
        name: 'CBE Birr',
        description: 'Secure payment through Commercial Bank of Ethiopia',
        icon: 'cbe-birr-icon',
        processingFee: 0,
        estimatedTime: '2-5 minutes',
        limits: {
          min: 1,
          max: 100000,
          daily: 500000
        },
        features: [
          'Bank-level security',
          'CBE integration',
          'Transaction history',
          'Customer support'
        ],
        recommended: paymentHistory.some(p => p.gateway === PAYMENT_METHODS.CBE_BIRR && p.status === PAYMENT_STATUS.COMPLETED)
      });
    }

    // 🏗️ Installment Plan Method
    methods.push({
      id: PAYMENT_METHODS.INSTALLMENT,
      name: 'Installment Plan',
      description: 'Pay in flexible monthly installments',
      icon: 'installment-icon',
      processingFee: 100, // 100 ETB processing fee
      estimatedTime: 'Instant approval',
      features: [
        '3-month payment plan',
        'No credit check required',
        'Flexible payments',
        'Instant course access'
      ],
      eligibility: await this._checkInstallmentEligibility(userData.userId)
    });

    return {
      oneTimePayment: methods.filter(m => m.id !== PAYMENT_METHODS.INSTALLMENT),
      installmentPlan: methods.find(m => m.id === PAYMENT_METHODS.INSTALLMENT),
      bundleDetails: {
        price: this.config.bundlePrice,
        includes: [
          '4-month complete training',
          'Expert hands-on sessions',
          'Mosa certification',
          'Yachi verification',
          'Lifetime community access'
        ],
        revenueBreakdown: this.config.revenueSplit
      }
    };
  }

  /**
   * 🏗️ Validate Payment Request
   * @private
   */
  async _validatePaymentRequest(paymentRequest) {
    const requiredFields = ['userId', 'enrollmentId', 'paymentMethod', 'amount'];
    const missingFields = requiredFields.filter(field => !paymentRequest[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (paymentRequest.amount !== this.config.bundlePrice) {
      throw new Error(`Invalid amount. Expected ${this.config.bundlePrice} ETB`);
    }

    if (!Object.values(PAYMENT_METHODS).includes(paymentRequest.paymentMethod)) {
      throw new Error('Invalid payment method');
    }

    // Check if enrollment exists and is pending payment
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: paymentRequest.enrollmentId },
      select: { id: true, status: true, studentId: true }
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.status !== 'PENDING_PAYMENT') {
      throw new Error('Enrollment is not in pending payment status');
    }

    if (enrollment.studentId !== paymentRequest.userId) {
      throw new Error('Enrollment does not belong to user');
    }

    return true;
  }

  /**
   * 🏗️ Perform Fraud Detection Check
   * @private
   */
  async _performFraudCheck(paymentRequest) {
    const fraudIndicators = [];

    // Check for multiple rapid payments
    const recentPayments = await this.prisma.payment.count({
      where: {
        userId: paymentRequest.userId,
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000) // Last 10 minutes
        }
      }
    });

    if (recentPayments > 3) {
      fraudIndicators.push('Multiple rapid payment attempts');
    }

    // Check IP address reputation (simplified)
    const ipReputation = await this._checkIpReputation(paymentRequest.ipAddress);
    if (!ipReputation.trusted) {
      fraudIndicators.push('Suspicious IP address');
    }

    // Check device fingerprint
    const deviceRisk = await this._analyzeDeviceFingerprint(paymentRequest.deviceInfo);
    if (deviceRisk.score > 0.7) {
      fraudIndicators.push('High-risk device detected');
    }

    if (fraudIndicators.length > 0) {
      throw new Error(`Fraud detection triggered: ${fraudIndicators.join(', ')}`);
    }

    return true;
  }

  /**
   * 🏗️ Process Payment Through Gateway
   * @private
   */
  async _processPaymentThroughGateway(paymentRequest, paymentId) {
    const gateway = this.gateways[paymentRequest.paymentMethod];
    
    if (!gateway) {
      throw new Error('Payment gateway not available');
    }

    return await this.circuitBreakers[paymentRequest.paymentMethod].execute(async () => {
      return await gateway.processPayment({
        ...paymentRequest,
        paymentId,
        callbackUrl: this._getCallbackUrl(paymentId)
      });
    });
  }

  /**
   * 🏗️ Process Telebirr Payment
   * @private
   */
  async _processTelebirrPayment(paymentData) {
    // 🏗️ Implement actual Telebirr API integration
    const config = GATEWAY_CONFIG[PAYMENT_METHODS.TELEBIRR];
    
    const requestPayload = {
      apiKey: config.apiKey,
      amount: paymentData.amount,
      currency: 'ETB',
      customerPhone: paymentData.phoneNumber,
      transactionId: paymentData.paymentId,
      callbackUrl: paymentData.callbackUrl,
      timestamp: Date.now()
    };

    // Generate signature
    const signature = this._generateSignature(requestPayload, config.secret);
    requestPayload.signature = signature;

    try {
      // Make API call to Telebirr
      const response = await this._makeApiCall(
        `${config.baseUrl}/api/v1/payment`,
        'POST',
        requestPayload,
        config.timeout
      );

      if (response.success) {
        return {
          transactionId: response.transactionId,
          status: 'COMPLETED',
          gatewayReference: response.reference,
          processedAt: new Date()
        };
      } else {
        throw new Error(response.errorMessage || 'Telebirr payment failed');
      }
    } catch (error) {
      this._logError('TELEBIRR_PAYMENT_FAILED', error, { paymentId: paymentData.paymentId });
      throw new Error(`Telebirr payment processing failed: ${error.message}`);
    }
  }

  /**
   * 🏗️ Process CBE Birr Payment
   * @private
   */
  async _processCbeBirrPayment(paymentData) {
    // 🏗️ Implement actual CBE Birr API integration
    const config = GATEWAY_CONFIG[PAYMENT_METHODS.CBE_BIRR];
    
    const requestPayload = {
      merchantId: config.apiKey,
      amount: paymentData.amount,
      currency: 'ETB',
      customerAccount: paymentData.accountNumber,
      transactionId: paymentData.paymentId,
      description: `Mosa Forge Bundle - ${paymentData.enrollmentId}`,
      timestamp: new Date().toISOString()
    };

    // Generate authentication token
    const authToken = this._generateAuthToken(requestPayload, config.secret);

    try {
      const response = await this._makeApiCall(
        `${config.baseUrl}/payment/process`,
        'POST',
        requestPayload,
        config.timeout,
        { 'Authorization': `Bearer ${authToken}` }
      );

      if (response.status === 'SUCCESS') {
        return {
          transactionId: response.transactionId,
          status: 'COMPLETED',
          gatewayReference: response.referenceNumber,
          processedAt: new Date()
        };
      } else {
        throw new Error(response.message || 'CBE Birr payment failed');
      }
    } catch (error) {
      this._logError('CBE_BIRR_PAYMENT_FAILED', error, { paymentId: paymentData.paymentId });
      throw new Error(`CBE Birr payment processing failed: ${error.message}`);
    }
  }

  /**
   * 🏗️ Create Payment Record
   * @private
   */
  async _createPaymentRecord(paymentData) {
    return await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          id: paymentData.paymentId,
          userId: paymentData.userId,
          enrollmentId: paymentData.enrollmentId,
          amount: paymentData.amount,
          currency: 'ETB',
          gateway: paymentData.paymentMethod,
          status: PAYMENT_STATUS.COMPLETED,
          transactionId: paymentData.gatewayResponse.transactionId,
          gatewayReference: paymentData.gatewayResponse.gatewayReference,
          metadata: {
            bundleType: 'STANDARD_1999',
            revenueSplit: this.config.revenueSplit,
            gatewayResponse: paymentData.gatewayResponse,
            traceId: paymentData.traceId
          },
          processedAt: new Date()
        }
      });

      // Create revenue split record
      await tx.revenueSplit.create({
        data: {
          paymentId: payment.id,
          mosaRevenue: this.config.revenueSplit.mosa,
          expertRevenue: this.config.revenueSplit.expert,
          status: 'PENDING_DISTRIBUTION',
          payoutSchedule: this._createPayoutSchedule()
        }
      });

      return payment;
    });
  }

  /**
   * 🏗️ Initialize Revenue Split
   * @private
   */
  async _initializeRevenueSplit(paymentId) {
    this.emit('revenue.split', {
      paymentId,
      mosaRevenue: this.config.revenueSplit.mosa,
      expertRevenue: this.config.revenueSplit.expert,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 🏗️ Calculate Installment Plans
   * @private
   */
  _calculateInstallmentPlans(installmentRequest) {
    const baseAmount = this.config.bundlePrice;
    const processingFee = 100;

    return [
      {
        id: 'installment_3_month',
        name: '3-Month Installment',
        duration: 3,
        monthlyPayment: Math.ceil((baseAmount + processingFee) / 3),
        totalAmount: baseAmount + processingFee,
        processingFee,
        breakdown: [
          { month: 1, amount: Math.ceil((baseAmount + processingFee) / 3), dueDate: this._getDueDate(1) },
          { month: 2, amount: Math.ceil((baseAmount + processingFee) / 3), dueDate: this._getDueDate(2) },
          { month: 3, amount: (baseAmount + processingFee) - (2 * Math.ceil((baseAmount + processingFee) / 3)), dueDate: this._getDueDate(3) }
        ],
        features: [
          'Instant course access',
          'No interest charges',
          'Flexible payment dates',
          'Auto-debit available'
        ]
      }
    ];
  }

  /**
   * 🏗️ Check Installment Eligibility
   * @private
   */
  async _checkInstallmentEligibility(userId) {
    // Check payment history
    const paymentHistory = await this.prisma.payment.findMany({
      where: { userId, status: PAYMENT_STATUS.COMPLETED },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const hasGoodHistory = paymentHistory.length > 0 && 
      paymentHistory.every(p => p.status === PAYMENT_STATUS.COMPLETED);

    return {
      eligible: hasGoodHistory || paymentHistory.length === 0, // New users are eligible
      reason: hasGoodHistory ? 'Good payment history' : 'New user eligibility',
      limit: this.config.bundlePrice + 100, // Bundle price + processing fee
      requiredDocuments: ['Fayda ID', 'Recent photo']
    };
  }

  /**
   * 🏗️ Get Installment Terms
   * @private
   */
  _getInstallmentTerms() {
    return {
      lateFee: 50,
      gracePeriod: 7,
      maxLateDays: 30,
      suspensionPolicy: 'After 30 days late',
      reactivationFee: 100,
      creditImpact: 'Reported to credit bureau after 60 days'
    };
  }

  /**
   * 🏗️ Get Next Payout Schedule
   * @private
   */
  _getNextPayoutSchedule() {
    return {
      expertPayouts: [
        { phase: 'Course Start', amount: 333, due: 'Immediate' },
        { phase: '75% Completion', amount: 333, due: 'After 3 months' },
        { phase: 'Certification', amount: 333, due: 'After 4 months' }
      ],
      mosaRevenue: {
        amount: 1000,
        allocation: {
          platformOperations: 400,
          qualityEnforcement: 300,
          profitGrowth: 300
        }
      }
    };
  }

  /**
   * 🏗️ Create Payout Schedule
   * @private
   */
  _createPayoutSchedule() {
    return [
      {
        phase: 'START',
        amount: 333,
        dueDate: new Date(),
        status: 'PENDING',
        type: 'EXPERT_PAYOUT'
      },
      {
        phase: 'MIDPOINT',
        amount: 333,
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        status: 'PENDING',
        type: 'EXPERT_PAYOUT'
      },
      {
        phase: 'COMPLETION',
        amount: 333,
        dueDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days
        status: 'PENDING',
        type: 'EXPERT_PAYOUT'
      }
    ];
  }

  /**
   * 🏗️ Generate Signature for API Security
   * @private
   */
  _generateSignature(payload, secret) {
    const data = Object.keys(payload)
      .sort()
      .map(key => `${key}=${payload[key]}`)
      .join('&');
    
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  /**
   * 🏗️ Generate Auth Token
   * @private
   */
  _generateAuthToken(payload, secret) {
    return crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(payload))
      .digest('base64');
  }

  /**
   * 🏗️ Make API Call with Retry Logic
   * @private
   */
  async _makeApiCall(url, method, data, timeout, headers = {}) {
    const fetch = (await import('node-fetch')).default;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout
    };

    if (method !== 'GET' && data) {
      options.body = JSON.stringify(data);
    }

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (attempt === this.config.maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  /**
   * 🏗️ Get Due Date for Installments
   * @private
   */
  _getDueDate(monthOffset) {
    const date = new Date();
    date.setMonth(date.getMonth() + monthOffset);
    return date.toISOString().split('T')[0];
  }

  /**
   * 🏗️ Get Callback URL
   * @private
   */
  _getCallbackUrl(paymentId) {
    return `${process.env.BASE_URL}/api/payments/callback/${paymentId}`;
  }

  /**
   * 🏗️ Update Payment Status
   * @private
   */
  async _updatePaymentStatus(paymentId, status, errorMessage = null) {
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        errorMessage,
        updatedAt: new Date()
      }
    });
  }

  /**
   * 🏗️ Update Enrollment Status
   * @private
   */
  async _updateEnrollmentStatus(enrollmentId, status) {
    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status,
        updatedAt: new Date()
      }
    });
  }

  /**
   * 🏗️ Check IP Reputation (Simplified)
   * @private
   */
  async _checkIpReputation(ipAddress) {
    // 🏗️ Implement actual IP reputation service
    return {
      trusted: true,
      riskScore: 0.1,
      country: 'ET',
      isp: 'Ethio Telecom'
    };
  }

  /**
   * 🏗️ Analyze Device Fingerprint
   * @private
   */
  async _analyzeDeviceFingerprint(deviceInfo) {
    // 🏗️ Implement actual device fingerprint analysis
    return {
      score: 0.2,
      trusted: true,
      deviceId: deviceInfo?.fingerprint || 'unknown'
    };
  }

  /**
   * 🏗️ Start Health Checks
   * @private
   */
  _startHealthChecks() {
    setInterval(() => {
      this._checkPaymentGatewayHealth();
    }, 60000); // Every minute
  }

  /**
   * 🏗️ Check Payment Gateway Health
   * @private
   */
  async _checkPaymentGatewayHealth() {
    for (const gateway of Object.keys(PAYMENT_METHODS)) {
      await this._checkGatewayHealth(gateway);
    }
  }

  /**
   * 🏗️ Format Enterprise Error
   * @private
   */
  _formatEnterpriseError(error) {
    const enterpriseError = new Error(error.message);
    enterpriseError.code = error.code || 'PAYMENT_ERROR';
    enterpriseError.timestamp = new Date().toISOString();
    enterpriseError.severity = this._getErrorSeverity(error.code);
    
    return enterpriseError;
  }

  /**
   * 🏗️ Get Error Severity
   * @private
   */
  _getErrorSeverity(errorCode) {
    const severityMap = {
      'PAYMENT_FAILED': 'HIGH',
      'FRAUD_DETECTED': 'CRITICAL',
      'GATEWAY_UNAVAILABLE': 'MEDIUM',
      'VALIDATION_ERROR': 'LOW',
      'NETWORK_ERROR': 'MEDIUM'
    };

    return severityMap[errorCode] || 'MEDIUM';
  }

  /**
   * 🏗️ Enterprise Logging
   * @private
   */
  _logEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'payment-methods',
      event: eventType,
      data,
      environment: process.env.NODE_ENV || 'development'
    };

    console.log(JSON.stringify(logEntry));

    // In production, this would send to centralized logging
    if (process.env.NODE_ENV === 'production') {
      this.redis.publish('payment-logs', JSON.stringify(logEntry));
    }
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
        stack: error.stack,
        code: error.code
      },
      context,
      severity: 'ERROR'
    });
  }

  /**
   * 🏗️ Get Service Metrics
   * @returns {Object} Service performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      circuitBreakerStates: Object.fromEntries(
        Object.entries(this.circuitBreakers).map(([method, breaker]) => [
          method,
          breaker.getState()
        ])
      ),
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  /**
   * 🏗️ Graceful Shutdown
   */
  async shutdown() {
    try {
      this.emit('service.shutdown.started');
      
      // Close Redis connection
      await this.redis.quit();
      
      // Close Database connection
      await this.prisma.$disconnect();
      
      this.emit('service.shutdown.completed');
    } catch (error) {
      this.emit('service.shutdown.failed', { error: error.message });
      throw error;
    }
  }
}

// 🏗️ Enterprise Export Pattern
module.exports = {
  PaymentMethods,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  GATEWAY_CONFIG
};

// 🏗️ Singleton Instance for Microservice Architecture
let paymentMethodsInstance = null;

module.exports.getInstance = (options = {}) => {
  if (!paymentMethodsInstance) {
    paymentMethodsInstance = new PaymentMethods(options);
  }
  return paymentMethodsInstance;
};