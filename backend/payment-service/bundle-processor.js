// payment-service/bundle-processor.js

/**
 * 🏢 MOSA FORGE - Enterprise Bundle Processor
 * 💰 1,999 ETB Bundle Payment Processing & Revenue Management
 * 🔄 Multi-stage payment processing with 1000/999 revenue split
 * 🛡️ Fraud detection and payment security with Ethiopian gateways
 * 📊 Real-time revenue tracking and financial analytics
 * 
 * @module BundleProcessor
 * @version Enterprise 1.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const Redis = require('@redis/client');
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

// Enterprise Dependencies
const EnterpriseLogger = require('../utils/enterprise-logger');
const SecurityMetrics = require('../utils/security-metrics');
const QualityEnforcer = require('../utils/quality-enforcer');
const TelebirrIntegration = require('./telebirr-integration');
const CBEIntegration = require('./cbe-integration');
const AuditLogger = require('../utils/audit-logger');
const RateLimitManager = require('../utils/rate-limit-manager');

class BundleProcessor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 🏗️ ENTERPRISE CONFIGURATION
    this.config = {
      // 💰 Bundle Pricing & Revenue
      bundlePrice: 1999, // 1,999 ETB
      revenueSplit: {
        mosa: 1000, // 1,000 ETB to MOSA FORGE
        expert: 999  // 999 ETB to Expert
      },
      payoutSchedule: {
        upfront: 333,    // Course start
        milestone: 333,  // 75% completion
        completion: 333  // Certification
      },
      
      // 🔄 Payment Gateway Configuration
      gateways: {
        TELEBIRR: 'telebirr',
        CBE_BIRR: 'cbe_birr',
        AWASH: 'awash', // Future integration
        DAShen: 'dashen' // Future integration
      },
      defaultGateway: 'telebirr',
      
      // 🛡️ Security Configuration
      encryptionLevel: 'aes-256-gcm',
      require3DS: true,
      fraudDetection: true,
      maxRetryAttempts: 3,
      
      // ⚡ Performance Configuration
      processingTimeout: 30000, // 30 seconds
      cacheTTL: 600, // 10 minutes
      batchSize: 50,
      
      // 📊 Analytics Configuration
      enableRealTimeMetrics: true,
      enableRevenueAnalytics: true,
      enableFraudMonitoring: true,
      
      ...options
    };

    // 🏗️ ENTERPRISE SERVICE INITIALIZATION
    this.initializeEnterpriseServices();
    this.initializePaymentGateways();
    this.initializeRevenueSystems();
    this.initializeSecuritySystems();
    
    this.stats = {
      bundlesInitiated: 0,
      bundlesCompleted: 0,
      bundlesFailed: 0,
      revenueProcessed: 0,
      fraudPrevented: 0,
      chargebacks: 0
    };

    this.initialized = false;
  }

  /**
   * 🏗️ Initialize Enterprise Services
   */
  async initializeEnterpriseServices() {
    try {
      // 📊 Enterprise Logger
      this.logger = new EnterpriseLogger({
        service: 'bundle-processor',
        module: 'payment',
        environment: process.env.NODE_ENV
      });

      // 🛡️ Security Metrics
      this.metrics = new SecurityMetrics({
        service: 'bundle-processor',
        businessUnit: 'payment-service'
      });

      // 🎯 Quality Enforcer
      this.qualityEnforcer = new QualityEnforcer({
        service: 'bundle-processor',
        autoEnforcement: true,
        qualityThreshold: 4.0
      });

      // 📱 Telebirr Integration
      this.telebirr = new TelebirrIntegration({
        apiKey: process.env.TELEBIRR_API_KEY,
        merchantId: process.env.TELEBIRR_MERCHANT_ID,
        callbackUrl: process.env.TELEBIRR_CALLBACK_URL
      });

      // 🏦 CBE Birr Integration
      this.cbeBirr = new CBEIntegration({
        apiKey: process.env.CBE_API_KEY,
        merchantCode: process.env.CBE_MERCHANT_CODE,
        terminalId: process.env.CBE_TERMINAL_ID
      });

      // 📝 Audit Logger
      this.auditLogger = new AuditLogger({
        service: 'bundle-processor',
        retentionDays: 365
      });

      // 🚦 Rate Limit Manager
      this.rateLimiter = new RateLimitManager({
        maxRequests: 1000, // 1000 requests per hour
        windowMs: 3600000,
        skipSuccessfulRequests: false
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

      this.logger.system('Enterprise bundle processor initialized', {
        service: 'bundle-processor',
        bundlePrice: this.config.bundlePrice,
        revenueSplit: this.config.revenueSplit,
        features: Object.keys(this.config).filter(k => this.config[k] === true)
      });

      this.initialized = true;

    } catch (error) {
      this.logger.critical('Enterprise bundle processor initialization failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 💰 Initialize Payment Gateways
   */
  initializePaymentGateways() {
    this.gateways = {
      [this.config.gateways.TELEBIRR]: {
        name: 'Telebirr',
        enabled: true,
        priority: 1,
        feePercentage: 0.015, // 1.5%
        minAmount: 1,
        maxAmount: 50000,
        features: ['3DS', 'QR', 'USSD', 'App']
      },
      [this.config.gateways.CBE_BIRR]: {
        name: 'CBE Birr',
        enabled: true,
        priority: 2,
        feePercentage: 0.02, // 2%
        minAmount: 1,
        maxAmount: 100000,
        features: ['3DS', 'QR', 'USSD']
      }
    };
  }

  /**
   * 💵 Initialize Revenue Systems
   */
  initializeRevenueSystems() {
    this.revenueSystems = {
      // 💰 Revenue Distribution
      distribution: {
        mosa: this.config.revenueSplit.mosa,
        expert: this.config.revenueSplit.expert,
        total: this.config.revenueSplit.mosa + this.config.revenueSplit.expert
      },
      
      // 📅 Payout Scheduling
      payouts: this.config.payoutSchedule,
      
      // 🏦 Bank Account Mapping
      accounts: {
        mosa: process.env.MOSA_BANK_ACCOUNT,
        expert: process.env.EXPERT_BANK_ACCOUNT_PREFIX
      },
      
      // 📊 Revenue Tracking
      tracking: {
        daily: 0,
        weekly: 0,
        monthly: 0,
        total: 0
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
        algorithm: this.config.encryptionLevel,
        key: process.env.PAYMENT_ENCRYPTION_KEY,
        ivLength: 16
      },
      
      // 🎯 Fraud Detection
      fraud: {
        maxAmountPerDay: 50000, // 50,000 ETB
        maxTransactionsPerHour: 10,
        suspiciousPatterns: ['multiple_attempts', 'rapid_succession', 'amount_variation']
      },
      
      // ⚠️ Risk Management
      risk: {
        highRiskThreshold: 0.7,
        mediumRiskThreshold: 0.4,
        autoDeclineThreshold: 0.9
      }
    };
  }

  /**
   * 🚀 PROCESS BUNDLE PAYMENT - Enterprise Grade
   */
  async processBundlePayment(paymentRequest, context = {}) {
    const startTime = performance.now();
    const paymentId = this.generatePaymentId();

    try {
      // 🛡️ PRE-PROCESSING VALIDATION
      await this.validatePaymentRequest(paymentRequest, context);

      // 💳 PAYMENT GATEWAY SELECTION
      const gateway = await this.selectPaymentGateway(paymentRequest, context);

      // 🎯 FRAUD DETECTION & RISK ASSESSMENT
      const riskAssessment = await this.assessPaymentRisk(paymentRequest, context);

      // 🔄 PAYMENT EXECUTION
      const paymentResult = await this.executePayment(paymentRequest, gateway, riskAssessment, context);

      // 💰 REVENUE DISTRIBUTION SETUP
      const revenueDistribution = await this.setupRevenueDistribution(paymentRequest, paymentResult);

      // 📝 PAYMENT RECORD CREATION
      const paymentRecord = await this.createPaymentRecord(paymentRequest, paymentResult, revenueDistribution, context);

      // 📧 NOTIFICATION & CONFIRMATION
      await this.sendPaymentConfirmation(paymentRequest, paymentRecord, context);

      // 📊 SUCCESS METRICS & AUDITING
      await this.recordSuccessfulPayment(paymentId, paymentRecord, context);

      const responseTime = performance.now() - startTime;

      this.logger.security('Bundle payment processed successfully', {
        paymentId,
        amount: paymentRequest.amount,
        gateway: paymentResult.gateway,
        responseTime: responseTime.toFixed(2)
      });

      return {
        success: true,
        paymentId,
        transactionId: paymentResult.transactionId,
        amount: paymentRequest.amount,
        gateway: paymentResult.gateway,
        status: paymentResult.status,
        revenueDistribution,
        nextSteps: ['enrollment_activation', 'expert_assignment', 'learning_materials_access']
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      await this.handlePaymentFailure(paymentId, paymentRequest, error, context, responseTime);
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE PAYMENT REQUEST
   */
  async validatePaymentRequest(paymentRequest, context) {
    // ✅ VALIDATE REQUIRED FIELDS
    const requiredFields = ['userId', 'skillId', 'amount', 'paymentMethod', 'currency'];
    const missingFields = requiredFields.filter(field => !paymentRequest[field]);
    
    if (missingFields.length > 0) {
      throw new BundleProcessorError(
        'MISSING_REQUIRED_FIELDS',
        'Required payment fields are missing',
        { missingFields }
      );
    }

    // ✅ VALIDATE BUNDLE PRICE
    if (paymentRequest.amount !== this.config.bundlePrice) {
      throw new BundleProcessorError(
        'INVALID_BUNDLE_AMOUNT',
        `Bundle price must be exactly ${this.config.bundlePrice} ETB`,
        { 
          providedAmount: paymentRequest.amount,
          requiredAmount: this.config.bundlePrice
        }
      );
    }

    // ✅ VALIDATE CURRENCY
    if (paymentRequest.currency !== 'ETB') {
      throw new BundleProcessorError(
        'INVALID_CURRENCY',
        'Only ETB currency is supported for bundle payments',
        { providedCurrency: paymentRequest.currency }
      );
    }

    // ✅ VALIDATE USER EXISTS
    const user = await this.prisma.user.findUnique({
      where: { id: paymentRequest.userId },
      select: { id: true, status: true, faydaId: true }
    });

    if (!user) {
      throw new BundleProcessorError('USER_NOT_FOUND', `User ${paymentRequest.userId} not found`);
    }

    if (user.status !== 'ACTIVE') {
      throw new BundleProcessorError('USER_INACTIVE', 'User account is not active');
    }

    // ✅ VALIDATE SKILL EXISTS
    const skill = await this.prisma.skill.findUnique({
      where: { id: paymentRequest.skillId }
    });

    if (!skill) {
      throw new BundleProcessorError('SKILL_NOT_FOUND', `Skill ${paymentRequest.skillId} not found`);
    }

    // ✅ CHECK FOR DUPLICATE PAYMENTS
    await this.checkDuplicatePayment(paymentRequest, context);

    this.logger.security('Payment request validation passed', {
      userId: paymentRequest.userId,
      skillId: paymentRequest.skillId,
      validations: ['required_fields', 'bundle_amount', 'currency', 'user_active', 'skill_exists', 'duplicate_check']
    });
  }

  /**
   * 💳 SELECT PAYMENT GATEWAY
   */
  async selectPaymentGateway(paymentRequest, context) {
    const availableGateways = Object.entries(this.gateways)
      .filter(([_, config]) => config.enabled)
      .sort(([_, a], [__, b]) => a.priority - b.priority);

    for (const [gatewayId, gatewayConfig] of availableGateways) {
      try {
        // ✅ CHECK GATEWAY AVAILABILITY
        const isAvailable = await this.checkGatewayAvailability(gatewayId);
        
        if (isAvailable) {
          this.logger.system('Payment gateway selected', {
            gateway: gatewayId,
            userId: paymentRequest.userId,
            priority: gatewayConfig.priority
          });

          return {
            id: gatewayId,
            ...gatewayConfig
          };
        }
      } catch (error) {
        this.logger.warn('Gateway availability check failed', {
          gateway: gatewayId,
          error: error.message
        });
        continue;
      }
    }

    throw new BundleProcessorError(
      'NO_AVAILABLE_GATEWAYS',
      'No payment gateways are currently available',
      { availableGateways: availableGateways.map(([id]) => id) }
    );
  }

  /**
   * 🎯 ASSESS PAYMENT RISK
   */
  async assessPaymentRisk(paymentRequest, context) {
    const riskScore = {
      overall: 0,
      factors: [],
      level: 'LOW',
      recommendations: []
    };

    try {
      // 📊 CALCULATE RISK FACTORS
      const riskFactors = await this.calculateRiskFactors(paymentRequest, context);
      
      riskScore.overall = riskFactors.overallScore;
      riskScore.factors = riskFactors.factors;
      riskScore.level = this.determineRiskLevel(riskFactors.overallScore);

      // ⚠️ HIGH RISK VALIDATION
      if (riskScore.level === 'HIGH') {
        const shouldProceed = await this.handleHighRiskPayment(paymentRequest, riskFactors);
        
        if (!shouldProceed) {
          throw new BundleProcessorError(
            'HIGH_RISK_PAYMENT_DECLINED',
            'Payment declined due to high risk assessment',
            { riskScore: riskScore.overall, factors: riskScore.factors }
          );
        }
      }

      // 💡 GENERATE RECOMMENDATIONS
      riskScore.recommendations = this.generateRiskRecommendations(riskScore);

      this.logger.security('Payment risk assessment completed', {
        userId: paymentRequest.userId,
        riskScore: riskScore.overall,
        riskLevel: riskScore.level,
        factors: riskScore.factors.length
      });

      return riskScore;

    } catch (error) {
      this.logger.error('Payment risk assessment failed', {
        userId: paymentRequest.userId,
        error: error.message
      });

      // Default to medium risk on failure
      return {
        overall: 0.5,
        factors: ['RISK_ASSESSMENT_FAILED'],
        level: 'MEDIUM',
        recommendations: ['MANUAL_REVIEW_RECOMMENDED']
      };
    }
  }

  /**
   * 🔄 EXECUTE PAYMENT
   */
  async executePayment(paymentRequest, gateway, riskAssessment, context) {
    let attempt = 0;
    let lastError;

    while (attempt < this.config.maxRetryAttempts) {
      try {
        const paymentPayload = this.buildPaymentPayload(paymentRequest, gateway, riskAssessment);
        
        let paymentResult;
        
        switch (gateway.id) {
          case this.config.gateways.TELEBIRR:
            paymentResult = await this.telebirr.processPayment(paymentPayload);
            break;
            
          case this.config.gateways.CBE_BIRR:
            paymentResult = await this.cbeBirr.processPayment(paymentPayload);
            break;
            
          default:
            throw new BundleProcessorError(
              'UNSUPPORTED_GATEWAY',
              `Payment gateway ${gateway.id} is not supported`
            );
        }

        if (paymentResult.success) {
          this.logger.business('Payment execution successful', {
            gateway: gateway.id,
            transactionId: paymentResult.transactionId,
            amount: paymentRequest.amount,
            attempt: attempt + 1
          });

          return {
            success: true,
            gateway: gateway.id,
            transactionId: paymentResult.transactionId,
            status: paymentResult.status,
            authorizationCode: paymentResult.authorizationCode,
            gatewayFee: paymentResult.gatewayFee,
            metadata: paymentResult.metadata
          };
        } else {
          throw new BundleProcessorError(
            'GATEWAY_PAYMENT_FAILED',
            paymentResult.message || 'Payment gateway processing failed',
            { gatewayError: paymentResult.error }
          );
        }

      } catch (error) {
        attempt++;
        lastError = error;
        
        this.logger.warn('Payment execution attempt failed', {
          gateway: gateway.id,
          attempt,
          error: error.message
        });

        if (attempt < this.config.maxRetryAttempts) {
          await this.delay(1000 * attempt); // Exponential backoff
        }
      }
    }

    throw new BundleProcessorError(
      'PAYMENT_RETRIES_EXCEEDED',
      'All payment execution attempts failed',
      { 
        attempts: this.config.maxRetryAttempts,
        gateway: gateway.id,
        lastError: lastError?.message 
      }
    );
  }

  /**
   * 💰 SETUP REVENUE DISTRIBUTION
   */
  async setupRevenueDistribution(paymentRequest, paymentResult) {
    try {
      const distribution = {
        total: this.config.bundlePrice,
        mosa: this.revenueSystems.distribution.mosa,
        expert: this.revenueSystems.distribution.expert,
        gatewayFee: paymentResult.gatewayFee,
        netRevenue: this.config.bundlePrice - paymentResult.gatewayFee,
        payouts: this.revenueSystems.payouts
      };

      // 💾 CREATE REVENUE RECORDS
      await this.createRevenueRecords(paymentRequest, distribution, paymentResult);

      // 🏦 SETUP PAYOUT SCHEDULES
      const payoutSchedules = await this.createPayoutSchedules(paymentRequest, distribution);

      // 📊 UPDATE REVENUE METRICS
      await this.updateRevenueMetrics(distribution);

      this.stats.revenueProcessed += distribution.total;

      this.logger.business('Revenue distribution setup completed', {
        transactionId: paymentResult.transactionId,
        mosaRevenue: distribution.mosa,
        expertRevenue: distribution.expert,
        gatewayFee: distribution.gatewayFee
      });

      return distribution;

    } catch (error) {
      this.logger.error('Revenue distribution setup failed', {
        transactionId: paymentResult.transactionId,
        error: error.message
      });

      throw new BundleProcessorError(
        'REVENUE_DISTRIBUTION_FAILED',
        'Failed to setup revenue distribution',
        { originalError: error.message }
      );
    }
  }

  /**
   * 📝 CREATE PAYMENT RECORD
   */
  async createPaymentRecord(paymentRequest, paymentResult, revenueDistribution, context) {
    const transaction = await this.prisma.$transaction(async (prisma) => {
      // 💳 CREATE PAYMENT RECORD
      const payment = await prisma.payment.create({
        data: {
          id: this.generatePaymentRecordId(),
          userId: paymentRequest.userId,
          skillId: paymentRequest.skillId,
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          gateway: paymentResult.gateway,
          transactionId: paymentResult.transactionId,
          status: paymentResult.status,
          authorizationCode: paymentResult.authorizationCode,
          gatewayFee: paymentResult.gatewayFee,
          metadata: {
            riskAssessment: context.riskAssessment,
            revenueDistribution,
            context: this.sanitizeContext(context)
          }
        }
      });

      // 💰 CREATE REVENUE ALLOCATION
      await prisma.revenueAllocation.create({
        data: {
          paymentId: payment.id,
          mosaAmount: revenueDistribution.mosa,
          expertAmount: revenueDistribution.expert,
          gatewayFee: revenueDistribution.gatewayFee,
          status: 'ALLOCATED',
          allocationDate: new Date()
        }
      });

      // 📅 CREATE PAYOUT SCHEDULES
      for (const [stage, amount] of Object.entries(revenueDistribution.payouts)) {
        await prisma.payoutSchedule.create({
          data: {
            paymentId: payment.id,
            stage: stage.toUpperCase(),
            amount: amount,
            scheduledDate: this.calculatePayoutDate(stage),
            status: 'PENDING'
          }
        });
      }

      // 📝 AUDIT LOG
      await this.auditLogger.logPaymentAction({
        action: 'BUNDLE_PAYMENT_PROCESSED',
        paymentId: payment.id,
        userId: paymentRequest.userId,
        amount: paymentRequest.amount,
        gateway: paymentResult.gateway,
        ipAddress: context.ip,
        userAgent: context.userAgent,
        metadata: {
          transactionId: paymentResult.transactionId,
          revenueDistribution
        }
      });

      return payment;
    });

    this.stats.bundlesCompleted++;

    return transaction;
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

      // 🔍 FIND RELATED PAYMENT
      const payment = await this.findPaymentByTransaction(callbackData.transactionId);

      if (!payment) {
        throw new BundleProcessorError(
          'PAYMENT_NOT_FOUND',
          `Payment not found for transaction: ${callbackData.transactionId}`
        );
      }

      // 📊 UPDATE PAYMENT STATUS
      const updatedPayment = await this.updatePaymentStatus(payment, callbackData.status);

      // 🔄 HANDLE PAYMENT STATUS
      await this.handlePaymentStatusUpdate(updatedPayment, callbackData);

      // 📧 SEND STATUS NOTIFICATION
      await this.sendStatusNotification(updatedPayment, callbackData);

      const responseTime = performance.now() - startTime;

      this.logger.system('Payment callback processed', {
        callbackId,
        transactionId: callbackData.transactionId,
        status: callbackData.status,
        responseTime: responseTime.toFixed(2)
      });

      return {
        success: true,
        callbackId,
        paymentId: updatedPayment.id,
        status: updatedPayment.status,
        actionsTaken: this.getCallbackActions(callbackData.status)
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      await this.handleCallbackFailure(callbackId, callbackData, error, context, responseTime);
      throw error;
    }
  }

  /**
   * 💵 PROCESS PAYOUT - Enterprise Grade
   */
  async processPayout(payoutRequest, context = {}) {
    const startTime = performance.now();
    const payoutId = this.generatePayoutId();

    try {
      // 🛡️ VALIDATE PAYOUT REQUEST
      await this.validatePayoutRequest(payoutRequest, context);

      // 💰 EXECUTE PAYOUT
      const payoutResult = await this.executePayout(payoutRequest, context);

      // 📝 UPDATE PAYOUT RECORD
      const updatedPayout = await this.updatePayoutRecord(payoutRequest, payoutResult);

      // 📊 UPDATE REVENUE METRICS
      await this.updatePayoutMetrics(payoutRequest, payoutResult);

      // 📧 SEND PAYOUT NOTIFICATION
      await this.sendPayoutNotification(payoutRequest, payoutResult);

      const responseTime = performance.now() - startTime;

      this.logger.business('Payout processed successfully', {
        payoutId,
        expertId: payoutRequest.expertId,
        amount: payoutRequest.amount,
        stage: payoutRequest.stage,
        responseTime: responseTime.toFixed(2)
      });

      return {
        success: true,
        payoutId,
        expertId: payoutRequest.expertId,
        amount: payoutRequest.amount,
        stage: payoutRequest.stage,
        transactionId: payoutResult.transactionId,
        status: payoutResult.status,
        processedAt: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      await this.handlePayoutFailure(payoutId, payoutRequest, error, context, responseTime);
      throw error;
    }
  }

  /**
   * 📊 GET PAYMENT ANALYTICS - Enterprise Grade
   */
  async getPaymentAnalytics(timeframe = '30d', context = {}) {
    const startTime = performance.now();
    const analyticsId = this.generateAnalyticsId();

    try {
      const analytics = {
        overview: await this.getPaymentOverview(timeframe),
        revenue: await this.getRevenueAnalytics(timeframe),
        gateways: await this.getGatewayAnalytics(timeframe),
        fraud: await this.getFraudAnalytics(timeframe),
        trends: await this.getPaymentTrends(timeframe)
      };

      const responseTime = performance.now() - startTime;

      this.logger.system('Payment analytics generated', {
        analyticsId,
        timeframe,
        responseTime: responseTime.toFixed(2)
      });

      return {
        success: true,
        analyticsId,
        timeframe,
        generatedAt: new Date().toISOString(),
        data: analytics
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
    return `pay_${crypto.randomBytes(16).toString('hex')}`;
  }

  generatePaymentRecordId() {
    return `pmt_${crypto.randomBytes(16).toString('hex')}`;
  }

  generateCallbackId() {
    return `cb_${crypto.randomBytes(16).toString('hex')}`;
  }

  generatePayoutId() {
    return `payout_${crypto.randomBytes(16).toString('hex')}`;
  }

  generateAnalyticsId() {
    return `analytics_${crypto.randomBytes(16).toString('hex')}`;
  }

  buildPaymentPayload(paymentRequest, gateway, riskAssessment) {
    return {
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      customer: {
        id: paymentRequest.userId,
        email: paymentRequest.email,
        phone: paymentRequest.phone
      },
      order: {
        id: this.generateOrderId(),
        description: `MOSA FORGE Bundle - ${paymentRequest.skillName}`,
        items: [
          {
            name: `Skill Training: ${paymentRequest.skillName}`,
            quantity: 1,
            price: paymentRequest.amount
          }
        ]
      },
      risk: {
        score: riskAssessment.overall,
        level: riskAssessment.level
      },
      metadata: {
        bundle: true,
        skillId: paymentRequest.skillId,
        source: 'MOSA_FORGE'
      }
    };
  }

  calculatePayoutDate(stage) {
    const baseDate = new Date();
    
    switch (stage) {
      case 'upfront':
        return new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days
      case 'milestone':
        return new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      case 'completion':
        return new Date(baseDate.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days
      default:
        return baseDate;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  sanitizeContext(context) {
    const sanitized = { ...context };
    delete sanitized.apiKey;
    delete sanitized.secret;
    delete sanitized.token;
    delete sanitized.password;
    return sanitized;
  }

  /**
   * 🎯 ENTERPRISE ERROR HANDLING
   */
  async handlePaymentFailure(paymentId, paymentRequest, error, context, responseTime) {
    this.stats.bundlesFailed++;
    
    this.logger.error('Bundle payment processing failed', {
      paymentId,
      userId: paymentRequest.userId,
      amount: paymentRequest.amount,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2),
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logPaymentAction({
      action: 'BUNDLE_PAYMENT_FAILED',
      userId: paymentRequest.userId,
      amount: paymentRequest.amount,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ip
    });
  }

  async handleCallbackFailure(callbackId, callbackData, error, context, responseTime) {
    this.logger.error('Payment callback processing failed', {
      callbackId,
      transactionId: callbackData.transactionId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2),
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logPaymentAction({
      action: 'PAYMENT_CALLBACK_FAILED',
      transactionId: callbackData.transactionId,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ip
    });
  }

  async handlePayoutFailure(payoutId, payoutRequest, error, context, responseTime) {
    this.logger.error('Payout processing failed', {
      payoutId,
      expertId: payoutRequest.expertId,
      amount: payoutRequest.amount,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2),
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logPaymentAction({
      action: 'PAYOUT_PROCESSING_FAILED',
      expertId: payoutRequest.expertId,
      amount: payoutRequest.amount,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ip
    });
  }

  async handleAnalyticsFailure(analyticsId, timeframe, error, context, responseTime) {
    this.logger.error('Payment analytics generation failed', {
      analyticsId,
      timeframe,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2),
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logPaymentAction({
      action: 'ANALYTICS_GENERATION_FAILED',
      timeframe,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ip
    });
  }
}

/**
 * 🎯 ENTERPRISE ERROR CLASS
 */
class BundleProcessorError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'BundleProcessorError';
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
BundleProcessorError.CODES = {
  // 🔐 Validation Errors
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  INVALID_BUNDLE_AMOUNT: 'INVALID_BUNDLE_AMOUNT',
  INVALID_CURRENCY: 'INVALID_CURRENCY',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_INACTIVE: 'USER_INACTIVE',
  SKILL_NOT_FOUND: 'SKILL_NOT_FOUND',
  DUPLICATE_PAYMENT: 'DUPLICATE_PAYMENT',
  
  // 💳 Gateway Errors
  NO_AVAILABLE_GATEWAYS: 'NO_AVAILABLE_GATEWAYS',
  UNSUPPORTED_GATEWAY: 'UNSUPPORTED_GATEWAY',
  GATEWAY_PAYMENT_FAILED: 'GATEWAY_PAYMENT_FAILED',
  PAYMENT_RETRIES_EXCEEDED: 'PAYMENT_RETRIES_EXCEEDED',
  
  // 🛡️ Security Errors
  HIGH_RISK_PAYMENT_DECLINED: 'HIGH_RISK_PAYMENT_DECLINED',
  CALLBACK_SIGNATURE_INVALID: 'CALLBACK_SIGNATURE_INVALID',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  
  // 💰 Revenue Errors
  REVENUE_DISTRIBUTION_FAILED: 'REVENUE_DISTRIBUTION_FAILED',
  PAYOUT_PROCESSING_FAILED: 'PAYOUT_PROCESSING_FAILED',
  REVENUE_ALLOCATION_FAILED: 'REVENUE_ALLOCATION_FAILED',
  
  // 📊 Analytics Errors
  ANALYTICS_GENERATION_FAILED: 'ANALYTICS_GENERATION_FAILED'
};

module.exports = {
  BundleProcessor,
  BundleProcessorError
};