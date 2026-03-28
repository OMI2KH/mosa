/**
 * 🏢 MOSA FORGE - Enterprise Refund Management System
 * 💰 Automated 1,999 ETB Bundle Refund Processing
 * 🛡️ Quality-Guarantee Driven Refund Policies
 * 📊 Real-time Revenue Protection & Analytics
 * 🔄 Multi-Gateway Refund Orchestration (CBE Birr, Telebirr)
 * 🚀 Microservice-Ready Enterprise Architecture
 * 
 * @module RefundHandler
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
const NotificationService = require('../../services/notification-service');
const RevenueCalculator = require('../../utils/revenue-calculator');

class RefundHandler extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 🎯 Enterprise Configuration
    this.config = {
      // 💰 Refund Policy Configuration
      refundPolicies: {
        coolingPeriod: {
          enabled: true,
          durationDays: 7,
          fullRefund: true,
          automatic: true
        },
        qualityGuarantee: {
          enabled: true,
          triggerConditions: ['expert_quality_below_3.5', 'service_not_delivered', 'platform_failure'],
          partialRefund: true,
          autoEscalation: true
        },
        partialRefund: {
          enabled: true,
          calculationMethod: 'pro_rata',
          minCompletionForCharge: 0.25, // 25%
          serviceFee: 0.10 // 10% platform fee
        }
      },

      // 🔄 Payment Gateway Configuration
      gateways: {
        cbeBirr: {
          enabled: true,
          maxRefundAmount: 10000,
          processingTime: '2-5 business days'
        },
        telebirr: {
          enabled: true,
          maxRefundAmount: 10000,
          processingTime: '1-3 business days'
        }
      },

      // ⚡ Processing Configuration
      batchProcessing: {
        enabled: true,
        batchSize: 50,
        processingInterval: 300000, // 5 minutes
        maxConcurrent: 10
      },

      // 📊 Monitoring Configuration
      enableRealTimeAnalytics: true,
      enableFraudDetection: true,
      enableAutoEscalation: true,

      ...config
    };

    // 🏗️ Service State
    this.serviceState = {
      initialized: false,
      healthy: false,
      activeRefunds: 0,
      lastBatchProcessed: null,
      queueSize: 0
    };

    this.metrics = {
      refundsInitiated: 0,
      refundsCompleted: 0,
      refundsFailed: 0,
      refundsPending: 0,
      totalAmountRefunded: 0,
      averageProcessingTime: 0,
      fraudAttemptsBlocked: 0
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
        service: 'refund-handler',
        module: 'payment-service',
        environment: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL || 'info'
      });

      // 🛡️ Security Metrics
      this.securityMetrics = new SecurityMetrics({
        service: 'refund-handler',
        businessUnit: 'risk-management'
      });

      // 📝 Audit Logger
      this.auditLogger = new AuditLogger({
        service: 'refund-handler',
        retentionPeriod: '730d', // 2 years for financial records
        encryption: true
      });

      // ⚡ Circuit Breaker
      this.circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 300000, // 5 minutes
        name: 'refund-processing'
      });

      // 🚦 Rate Limiter
      this.rateLimiter = new RateLimiter({
        requestsPerMinute: 50,
        namespace: 'refund_processing'
      });

      // 📧 Notification Service
      this.notificationService = new NotificationService({
        templates: {
          refundInitiated: 'refund_initiated_v1',
          refundCompleted: 'refund_completed_v1',
          refundFailed: 'refund_failed_v1',
          escalationRequired: 'refund_escalation_v1'
        }
      });

      // 💰 Revenue Calculator
      this.revenueCalculator = new RevenueCalculator({
        bundleAmount: 1999,
        revenueSplit: { mosa: 1000, expert: 999 },
        payoutSchedule: [333, 333, 333]
      });

      // 💾 Database Client
      this.prisma = new PrismaClient({
        log: ['error', 'warn'],
        datasourceUrl: process.env.DATABASE_URL,
        transactionTimeout: 60000
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

      // 🔗 Gateway Clients
      this.initializeGatewayClients();

      // 🔄 Start Batch Processing
      this.startBatchProcessing();

      this.serviceState.initialized = true;
      this.serviceState.healthy = true;

      this.logger.system('Enterprise Refund Handler initialized successfully', {
        service: 'refund-handler',
        version: '2.0.0',
        features: Object.keys(this.config).filter(k => this.config[k] === true)
      });

    } catch (error) {
      this.logger.critical('Enterprise Refund Handler initialization failed', {
        error: error.message,
        stack: error.stack,
        service: 'refund-handler'
      });
      throw error;
    }
  }

  /**
   * 🔗 Initialize Payment Gateway Clients
   */
  initializeGatewayClients() {
    this.gatewayClients = {};

    if (this.config.gateways.cbeBirr.enabled) {
      this.gatewayClients.cbeBirr = axios.create({
        baseURL: process.env.CBE_BIRR_REFUND_URL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MosaForge-Enterprise/2.0'
        }
      });
    }

    if (this.config.gateways.telebirr.enabled) {
      this.gatewayClients.telebirr = axios.create({
        baseURL: process.env.TELEBIRR_REFUND_URL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'MosaForge-Enterprise/2.0'
        }
      });
    }
  }

  /**
   * 💰 INITIATE REFUND - Enterprise Grade
   */
  async initiateRefund(refundRequest, context = {}) {
    const startTime = performance.now();
    const refundId = this.generateRefundId();
    const traceId = context.traceId || refundId;

    try {
      // 🛡️ Pre-flight Checks
      await this.performPreFlightChecks();

      // ✅ Validate Refund Request
      await this.validateRefundRequest(refundRequest);

      // 🔍 Check Refund Eligibility
      const eligibility = await this.checkRefundEligibility(refundRequest);

      if (!eligibility.eligible) {
        throw new RefundError('REFUND_NOT_ELIGIBLE', 'Refund request is not eligible', {
          reasons: eligibility.reasons,
          policy: eligibility.appliedPolicy
        });
      }

      // 💰 Calculate Refund Amount
      const refundAmount = await this.calculateRefundAmount(refundRequest, eligibility);

      // 🛡️ Fraud Detection
      const fraudCheck = await this.performFraudDetection(refundRequest, refundAmount, context);

      if (fraudCheck.riskLevel === 'HIGH') {
        await this.handleFraudAttempt(refundRequest, fraudCheck, context);
        throw new RefundError('POTENTIAL_FRAUD_DETECTED', 'Refund request flagged for fraud review', {
          riskLevel: fraudCheck.riskLevel,
          triggers: fraudCheck.triggers
        });
      }

      // 📝 Create Refund Record
      const refundRecord = await this.createRefundRecord({
        refundId,
        refundRequest,
        eligibility,
        refundAmount,
        fraudCheck,
        traceId
      });

      // 🔄 Process Refund Based on Priority
      if (eligibility.priority === 'HIGH') {
        await this.processImmediateRefund(refundRecord);
      } else {
        await this.queueRefundForProcessing(refundRecord);
      }

      // 📧 Send Notifications
      await this.sendRefundNotifications(refundRecord, 'initiated');

      // 📊 Record Metrics
      await this.recordRefundMetrics({
        refundId,
        amount: refundAmount.total,
        responseTime: performance.now() - startTime,
        status: 'initiated',
        reason: refundRequest.reason
      });

      this.metrics.refundsInitiated++;
      this.serviceState.activeRefunds++;

      this.logger.business('Refund initiated successfully', {
        refundId,
        traceId,
        orderId: refundRequest.orderId,
        amount: refundAmount.total,
        reason: refundRequest.reason,
        eligibility: eligibility.appliedPolicy
      });

      return {
        success: true,
        refundId,
        orderId: refundRequest.orderId,
        refundAmount: refundAmount.total,
        estimatedProcessing: this.getEstimatedProcessingTime(eligibility.priority),
        nextSteps: this.generateRefundNextSteps('initiated', eligibility.priority)
      };

    } catch (error) {
      await this.handleRefundInitiationFailure({
        refundId,
        refundRequest,
        error,
        context,
        responseTime: performance.now() - startTime,
        traceId
      });
      throw error;
    }
  }

  /**
   * ✅ VALIDATE REFUND REQUEST
   */
  async validateRefundRequest(refundRequest) {
    const validationRules = {
      requiredFields: ['orderId', 'studentId', 'reason', 'requestedBy'],
      reasonCategories: [
        'cooling_period',
        'expert_quality',
        'service_not_delivered',
        'platform_issue',
        'student_circumstances',
        'other'
      ],
      maxRefundAmount: 1999,
      timeLimits: {
        maxDaysAfterCompletion: 30,
        minDaysAfterEnrollment: 1
      }
    };

    const errors = [];

    // ✅ Required Fields
    const missingFields = validationRules.requiredFields.filter(field => !refundRequest[field]);
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // ✅ Valid Reason Category
    if (!validationRules.reasonCategories.includes(refundRequest.reason)) {
      errors.push(`Invalid refund reason. Must be one of: ${validationRules.reasonCategories.join(', ')}`);
    }

    // ✅ Check for Duplicate Refund Request
    const duplicateCheck = await this.checkDuplicateRefund(refundRequest.orderId);
    if (duplicateCheck.exists) {
      errors.push(`Duplicate refund request for order: ${refundRequest.orderId}`);
    }

    if (errors.length > 0) {
      throw new RefundError('REFUND_VALIDATION_FAILED', 'Refund request validation failed', {
        errors,
        orderId: refundRequest.orderId,
        reason: refundRequest.reason
      });
    }

    this.logger.security('Refund request validation passed', {
      orderId: refundRequest.orderId,
      reason: refundRequest.reason,
      validations: Object.keys(validationRules)
    });
  }

  /**
   * 🔍 CHECK REFUND ELIGIBILITY
   */
  async checkRefundEligibility(refundRequest) {
    const eligibilityChecks = {
      coolingPeriod: await this.checkCoolingPeriodEligibility(refundRequest),
      qualityGuarantee: await this.checkQualityGuaranteeEligibility(refundRequest),
      courseProgress: await this.checkCourseProgressEligibility(refundRequest),
      previousRefunds: await this.checkPreviousRefunds(refundRequest.studentId),
      paymentStatus: await this.checkPaymentStatus(refundRequest.orderId)
    };

    const eligibleChecks = Object.values(eligibilityChecks).filter(check => check.eligible);
    const appliedPolicy = eligibleChecks.length > 0 ? eligibleChecks[0].policy : null;

    return {
      eligible: eligibleChecks.length > 0,
      appliedPolicy,
      priority: this.determineRefundPriority(eligibleChecks),
      reasons: eligibleChecks.map(check => check.reason),
      details: eligibilityChecks
    };
  }

  /**
   * ❄️ CHECK COOLING PERIOD ELIGIBILITY
   */
  async checkCoolingPeriodEligibility(refundRequest) {
    try {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { orderId: refundRequest.orderId },
        select: { createdAt: true, status: true }
      });

      if (!enrollment) {
        return { eligible: false, reason: 'Enrollment not found' };
      }

      const coolingPeriodEnd = new Date(enrollment.createdAt);
      coolingPeriodEnd.setDate(coolingPeriodEnd.getDate() + this.config.refundPolicies.coolingPeriod.durationDays);

      const isWithinCoolingPeriod = new Date() <= coolingPeriodEnd;
      const hasNotStarted = enrollment.status === 'pending' || enrollment.status === 'payment_completed';

      if (isWithinCoolingPeriod && hasNotStarted) {
        return {
          eligible: true,
          policy: 'cooling_period',
          reason: 'Within 7-day cooling period and course not started',
          fullRefund: true,
          priority: 'HIGH'
        };
      }

      return { eligible: false, reason: 'Not within cooling period or course already started' };

    } catch (error) {
      this.logger.error('Cooling period eligibility check failed', {
        orderId: refundRequest.orderId,
        error: error.message
      });
      return { eligible: false, reason: 'Eligibility check failed' };
    }
  }

  /**
   * 🛡️ CHECK QUALITY GUARANTEE ELIGIBILITY
   */
  async checkQualityGuaranteeEligibility(refundRequest) {
    try {
      if (refundRequest.reason !== 'expert_quality') {
        return { eligible: false, reason: 'Not a quality-related refund request' };
      }

      const enrollment = await this.prisma.enrollment.findUnique({
        where: { orderId: refundRequest.orderId },
        include: {
          expert: {
            select: { qualityScore: true, currentTier: true }
          },
          sessions: {
            where: { status: 'completed' },
            select: { studentRating: true, completedAt: true }
          }
        }
      });

      if (!enrollment || !enrollment.expert) {
        return { eligible: false, reason: 'Enrollment or expert not found' };
      }

      const qualityBelowThreshold = enrollment.expert.qualityScore < 3.5;
      const hasLowRatedSessions = enrollment.sessions.some(session => session.studentRating && session.studentRating < 2);
      const noSessionsCompleted = enrollment.sessions.length === 0;

      if (qualityBelowThreshold || hasLowRatedSessions) {
        return {
          eligible: true,
          policy: 'quality_guarantee',
          reason: 'Expert quality below acceptable standards',
          partialRefund: true,
          priority: 'HIGH',
          qualityScore: enrollment.expert.qualityScore,
          lowRatedSessions: enrollment.sessions.filter(s => s.studentRating && s.studentRating < 2).length
        };
      }

      return { eligible: false, reason: 'Quality standards met' };

    } catch (error) {
      this.logger.error('Quality guarantee eligibility check failed', {
        orderId: refundRequest.orderId,
        error: error.message
      });
      return { eligible: false, reason: 'Eligibility check failed' };
    }
  }

  /**
   * 💰 CALCULATE REFUND AMOUNT
   */
  async calculateRefundAmount(refundRequest, eligibility) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { orderId: refundRequest.orderId },
      include: {
        payments: {
          where: { status: 'completed' },
          select: { amount: true, gateway: true, transactionId: true }
        },
        sessions: {
          where: { status: 'completed' },
          select: { id: true, duration: true, completedAt: true }
        },
        progress: {
          select: { completionPercentage: true, lastActivityAt: true }
        }
      }
    });

    if (!enrollment) {
      throw new RefundError('ENROLLMENT_NOT_FOUND', 'Cannot find enrollment for refund calculation');
    }

    const totalPaid = enrollment.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const completionPercentage = enrollment.progress?.completionPercentage || 0;
    const sessionsCompleted = enrollment.sessions.length;

    let refundCalculation;

    // 🎯 Apply Different Calculation Methods Based on Policy
    switch (eligibility.appliedPolicy) {
      case 'cooling_period':
        refundCalculation = this.calculateCoolingPeriodRefund(totalPaid, completionPercentage);
        break;

      case 'quality_guarantee':
        refundCalculation = this.calculateQualityRefund(totalPaid, completionPercentage, sessionsCompleted);
        break;

      case 'partial_refund':
        refundCalculation = this.calculatePartialRefund(totalPaid, completionPercentage);
        break;

      default:
        refundCalculation = this.calculateStandardRefund(totalPaid, completionPercentage);
    }

    // 🛡️ Apply Platform Service Fee
    if (refundCalculation.refundableAmount > 0) {
      const serviceFee = this.calculateServiceFee(refundCalculation.refundableAmount, eligibility);
      refundCalculation.serviceFee = serviceFee;
      refundCalculation.netRefundAmount = refundCalculation.refundableAmount - serviceFee;
    }

    return {
      ...refundCalculation,
      totalPaid,
      completionPercentage,
      sessionsCompleted,
      policyApplied: eligibility.appliedPolicy,
      gateway: enrollment.payments[0]?.gateway || 'unknown'
    };
  }

  /**
   * ❄️ CALCULATE COOLING PERIOD REFUND
   */
  calculateCoolingPeriodRefund(totalPaid, completionPercentage) {
    if (completionPercentage === 0) {
      return {
        refundableAmount: totalPaid,
        deduction: 0,
        deductionReason: null,
        fullRefund: true
      };
    }

    // Partial completion during cooling period
    const deduction = totalPaid * (completionPercentage / 100) * 0.5; // 50% of consumed value
    return {
      refundableAmount: totalPaid - deduction,
      deduction,
      deductionReason: 'partial_completion_during_cooling_period',
      fullRefund: false
    };
  }

  /**
   * 🛡️ CALCULATE QUALITY REFUND
   */
  calculateQualityRefund(totalPaid, completionPercentage, sessionsCompleted) {
    const baseRefund = totalPaid * 0.8; // 80% base refund for quality issues
    
    let qualityPenalty = 0;
    if (completionPercentage > 50) {
      qualityPenalty = totalPaid * 0.1; // Additional 10% penalty for high completion
    }

    return {
      refundableAmount: baseRefund - qualityPenalty,
      deduction: totalPaid - (baseRefund - qualityPenalty),
      deductionReason: 'quality_guarantee_penalty',
      fullRefund: false,
      qualityAdjustment: qualityPenalty
    };
  }

  /**
   * 🛡️ PERFORM FRAUD DETECTION
   */
  async performFraudDetection(refundRequest, refundAmount, context) {
    const fraudIndicators = [];

    // 🔍 Check Refund Patterns
    const studentRefundHistory = await this.getStudentRefundHistory(refundRequest.studentId);
    if (studentRefundHistory.totalRefunds > 2) {
      fraudIndicators.push('high_refund_frequency');
    }

    // ⏰ Check Timing Patterns
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { orderId: refundRequest.orderId },
      select: { createdAt: true }
    });

    const daysSinceEnrollment = Math.floor((new Date() - enrollment.createdAt) / (1000 * 60 * 60 * 24));
    if (daysSinceEnrollment < 2) {
      fraudIndicators.push('very_early_refund_request');
    }

    // 💰 Check Amount Patterns
    if (refundAmount.netRefundAmount === refundAmount.totalPaid) {
      fraudIndicators.push('full_refund_request');
    }

    // 🌍 Check Geographic Patterns
    if (context.ipAddress) {
      const geographicRisk = await this.assessGeographicRisk(context.ipAddress, refundRequest.studentId);
      if (geographicRisk.riskLevel === 'HIGH') {
        fraudIndicators.push('suspicious_geographic_pattern');
      }
    }

    const riskLevel = this.calculateRiskLevel(fraudIndicators);

    return {
      riskLevel,
      triggers: fraudIndicators,
      score: fraudIndicators.length * 10,
      requiresManualReview: riskLevel === 'HIGH'
    };
  }

  /**
   * 🔄 PROCESS IMMEDIATE REFUND
   */
  async processImmediateRefund(refundRecord) {
    try {
      const gatewayClient = this.gatewayClients[refundRecord.gateway];
      
      if (!gatewayClient) {
        throw new RefundError('GATEWAY_NOT_AVAILABLE', `Refund gateway not available: ${refundRecord.gateway}`);
      }

      const refundPayload = {
        transactionId: refundRecord.originalTransactionId,
        amount: refundRecord.netRefundAmount,
        currency: 'ETB',
        reason: refundRecord.reason,
        referenceId: refundRecord.refundId
      };

      const response = await gatewayClient.post('/refund', refundPayload, {
        headers: this.generateGatewayHeaders(refundRecord.gateway)
      });

      if (response.data.success) {
        await this.updateRefundStatus(refundRecord.refundId, 'completed', {
          gatewayRefundId: response.data.refundId,
          processedAt: new Date(),
          gatewayResponse: response.data
        });

        this.metrics.refundsCompleted++;
        this.metrics.totalAmountRefunded += refundRecord.netRefundAmount;

        this.logger.business('Immediate refund processed successfully', {
          refundId: refundRecord.refundId,
          amount: refundRecord.netRefundAmount,
          gateway: refundRecord.gateway,
          gatewayRefundId: response.data.refundId
        });

      } else {
        throw new RefundError('GATEWAY_REFUND_FAILED', 'Payment gateway refund failed', {
          gatewayError: response.data.error
        });
      }

    } catch (error) {
      await this.updateRefundStatus(refundRecord.refundId, 'failed', {
        error: error.message,
        failedAt: new Date()
      });

      this.metrics.refundsFailed++;

      throw error;
    }
  }

  /**
   * 📋 QUEUE REFUND FOR BATCH PROCESSING
   */
  async queueRefundForProcessing(refundRecord) {
    const queueItem = {
      refundId: refundRecord.refundId,
      record: refundRecord,
      queuedAt: new Date(),
      priority: refundRecord.priority,
      attempts: 0
    };

    await this.redis.lpush('refund_queue', JSON.stringify(queueItem));
    await this.redis.hset('refund_records', refundRecord.refundId, JSON.stringify(refundRecord));

    this.serviceState.queueSize = await this.redis.llen('refund_queue');

    this.logger.system('Refund queued for batch processing', {
      refundId: refundRecord.refundId,
      queuePosition: this.serviceState.queueSize,
      priority: refundRecord.priority
    });
  }

  /**
   * 🔄 BATCH REFUND PROCESSING
   */
  async processRefundBatch() {
    if (this.serviceState.queueSize === 0) {
      return;
    }

    const batchStartTime = performance.now();
    let processedCount = 0;
    let failedCount = 0;

    try {
      const batchItems = await this.redis.lrange('refund_queue', 0, this.config.batchProcessing.batchSize - 1);
      
      const processingPromises = batchItems.map(async (itemJson, index) => {
        const queueItem = JSON.parse(itemJson);
        
        try {
          await this.processSingleRefund(queueItem);
          processedCount++;
          
          // Remove from queue
          await this.redis.lrem('refund_queue', 1, itemJson);
          
        } catch (error) {
          failedCount++;
          queueItem.attempts++;
          queueItem.lastError = error.message;
          
          // Update queue item or move to dead letter queue
          if (queueItem.attempts >= 3) {
            await this.moveToDeadLetterQueue(queueItem, error);
            await this.redis.lrem('refund_queue', 1, itemJson);
          } else {
            const updatedItem = JSON.stringify(queueItem);
            await this.redis.lset('refund_queue', index, updatedItem);
          }
        }
      });

      await Promise.allSettled(processingPromises);

      this.serviceState.queueSize = await this.redis.llen('refund_queue');
      this.serviceState.lastBatchProcessed = new Date();

      const batchProcessingTime = performance.now() - batchStartTime;

      this.logger.business('Refund batch processing completed', {
        processed: processedCount,
        failed: failedCount,
        queueSize: this.serviceState.queueSize,
        processingTime: batchProcessingTime.toFixed(2)
      });

    } catch (error) {
      this.logger.error('Refund batch processing failed', {
        error: error.message,
        batchSize: this.config.batchProcessing.batchSize
      });
    }
  }

  /**
   * 🔄 START BATCH PROCESSING
   */
  startBatchProcessing() {
    this.batchInterval = setInterval(() => {
      this.processRefundBatch();
    }, this.config.batchProcessing.processingInterval);

    this.logger.system('Refund batch processing started', {
      interval: this.config.batchProcessing.processingInterval,
      batchSize: this.config.batchProcessing.batchSize
    });
  }

  /**
   * 📊 GET REFUND ANALYTICS
   */
  async getRefundAnalytics(timeRange = '30d') {
    const analytics = {
      summary: {
        totalRefunds: this.metrics.refundsInitiated,
        totalAmount: this.metrics.totalAmountRefunded,
        successRate: this.metrics.refundsInitiated > 0 ? 
          (this.metrics.refundsCompleted / this.metrics.refundsInitiated) * 100 : 0,
        averageProcessingTime: this.metrics.averageProcessingTime
      },
      byReason: await this.getRefundsByReason(timeRange),
      byGateway: await this.getRefundsByGateway(timeRange),
      byTime: await this.getRefundsByTimePeriod(timeRange),
      trends: await this.getRefundTrends(timeRange)
    };

    return analytics;
  }

  /**
   * 🔧 UTILITY METHODS
   */

  generateRefundId() {
    return `ref_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  determineRefundPriority(eligibleChecks) {
    const priorities = {
      cooling_period: 'HIGH',
      quality_guarantee: 'HIGH',
      service_not_delivered: 'HIGH',
      platform_issue: 'HIGH',
      student_circumstances: 'MEDIUM',
      other: 'LOW'
    };

    const highestPriority = eligibleChecks.reduce((highest, check) => {
      const priority = priorities[check.policy] || 'LOW';
      return this.comparePriority(priority, highest) > 0 ? priority : highest;
    }, 'LOW');

    return highestPriority;
  }

  comparePriority(a, b) {
    const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return priorityOrder[a] - priorityOrder[b];
  }

  calculateRiskLevel(fraudIndicators) {
    const score = fraudIndicators.length;
    if (score >= 3) return 'HIGH';
    if (score >= 2) return 'MEDIUM';
    if (score >= 1) return 'LOW';
    return 'VERY_LOW';
  }

  getEstimatedProcessingTime(priority) {
    const processingTimes = {
      HIGH: '24-48 hours',
      MEDIUM: '3-5 business days',
      LOW: '5-7 business days'
    };
    return processingTimes[priority] || '5-7 business days';
  }

  generateRefundNextSteps(status, priority) {
    const nextSteps = {
      initiated: {
        HIGH: ['immediate_processing', 'gateway_communication', 'student_notification'],
        MEDIUM: ['batch_queuing', 'scheduled_processing', 'student_notification'],
        LOW: ['batch_queuing', 'weekly_processing', 'student_notification']
      },
      processing: ['gateway_communication', 'funds_transfer', 'status_update'],
      completed: ['student_notification', 'records_archiving', 'analytics_update'],
      failed: ['error_analysis', 'retry_scheduling', 'manual_review']
    };

    return nextSteps[status] || [];
  }

  generateGatewayHeaders(gateway) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'MosaForge-Enterprise/2.0'
    };

    if (gateway === 'cbeBirr') {
      headers['X-API-Key'] = process.env.CBE_BIRR_API_KEY;
      headers['X-Merchant-ID'] = process.env.CBE_MERCHANT_ID;
    } else if (gateway === 'telebirr') {
      headers['X-API-Key'] = process.env.TELEBIRR_API_KEY;
      headers['X-Merchant-Code'] = process.env.TELEBIRR_MERCHANT_CODE;
    }

    return headers;
  }

  /**
   * 🎯 ERROR HANDLING
   */
  async handleRefundInitiationFailure({ refundId, refundRequest, error, context, responseTime, traceId }) {
    this.metrics.refundsFailed++;

    this.logger.error('Refund initiation failed', {
      refundId,
      traceId,
      orderId: refundRequest.orderId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2)
    });

    await this.auditLogger.logSecurityEvent({
      event: 'REFUND_INITIATION_FAILED',
      refundId,
      orderId: refundRequest.orderId,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ipAddress
    });

    // 🔄 Circuit Breaker Tracking
    if (error.isOperational) {
      this.circuitBreaker.recordFailure();
    }
  }

  async handleFraudAttempt(refundRequest, fraudCheck, context) {
    this.metrics.fraudAttemptsBlocked++;

    this.logger.security('Potential fraud attempt detected and blocked', {
      orderId: refundRequest.orderId,
      studentId: refundRequest.studentId,
      riskLevel: fraudCheck.riskLevel,
      triggers: fraudCheck.triggers,
      ipAddress: context.ipAddress
    });

    await this.auditLogger.logSecurityEvent({
      event: 'FRAUD_ATTEMPT_BLOCKED',
      orderId: refundRequest.orderId,
      studentId: refundRequest.studentId,
      riskLevel: fraudCheck.riskLevel,
      triggers: fraudCheck.triggers,
      ipAddress: context.ipAddress
    });
  }
}

/**
 * 🎯 ENTERPRISE REFUND ERROR CLASS
 */
class RefundError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'RefundError';
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

// 🎯 Enterprise Refund Error Codes
RefundError.CODES = {
  // 🔐 Validation Errors
  REFUND_VALIDATION_FAILED: 'REFUND_VALIDATION_FAILED',
  REFUND_NOT_ELIGIBLE: 'REFUND_NOT_ELIGIBLE',
  DUPLICATE_REFUND_REQUEST: 'DUPLICATE_REFUND_REQUEST',

  // 🛡️ Fraud & Security
  POTENTIAL_FRAUD_DETECTED: 'POTENTIAL_FRAUD_DETECTED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',

  // 💰 Calculation Errors
  REFUND_CALCULATION_FAILED: 'REFUND_CALCULATION_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',

  // 🔄 Processing Errors
  GATEWAY_NOT_AVAILABLE: 'GATEWAY_NOT_AVAILABLE',
  GATEWAY_REFUND_FAILED: 'GATEWAY_REFUND_FAILED',
  BATCH_PROCESSING_FAILED: 'BATCH_PROCESSING_FAILED',

  // 📊 Data Errors
  ENROLLMENT_NOT_FOUND: 'ENROLLMENT_NOT_FOUND',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND'
};

module.exports = {
  RefundHandler,
  RefundError
};