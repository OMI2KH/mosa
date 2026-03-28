/**
 * 🏢 MOSA FORGE - Enterprise Cancellation Handler System
 * ❌ Smart Cancellation Processing & Refund Management
 * 💰 Automated Refund Calculation & Payment Gateway Integration
 * 📊 Impact Analysis & Retention Optimization
 * 🚀 Microservice-Ready Enterprise Architecture
 * 
 * @module CancellationHandler
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

// 🏗️ Enterprise Dependencies
const EnterpriseLogger = require('../../utils/enterprise-logger');
const RefundCalculator = require('../../utils/refund-calculator');
const PaymentGateway = require('../../utils/payment-gateway');
const RetentionAnalyzer = require('../../utils/retention-analyzer');
const NotificationService = require('../../services/notification-service');

class CancellationHandler extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 🎯 Enterprise Configuration
    this.config = {
      // ❌ Cancellation Policy Configuration
      cancellationPolicy: {
        coolingPeriod: 7, // days
        coolingPeriodRefund: 1.0, // 100% refund
        partialRefundPeriod: 30, // days
        minCompletionForRefund: 0.25, // 25%
        serviceFee: 0.10, // 10%
        processingFee: 0.05 // 5%
      },

      // 💰 Refund Configuration
      refund: {
        autoProcessing: true,
        processingTime: '3-5 business days',
        methods: ['original', 'wallet_credit', 'bank_transfer'],
        minRefundAmount: 50,
        maxRefundAmount: 1999
      },

      // 📊 Impact Configuration
      impact: {
        trackExpertImpact: true,
        trackRevenueImpact: true,
        trackRetentionImpact: true,
        autoEscalation: true
      },

      // 🚨 Retention Configuration
      retention: {
        enableIntervention: true,
        interventionThreshold: 0.3, // 30% cancellation rate
        maxInterventions: 3,
        coolOffPeriod: 30 // days
      },

      // ⚡ Performance Configuration
      performance: {
        processingInterval: 300000, // 5 minutes
        realTimeUpdates: true,
        cacheDuration: 600, // 10 minutes
        batchSize: 50
      },

      ...config
    };

    // 🏗️ Service State
    this.serviceState = {
      initialized: false,
      healthy: false,
      activeCancellations: 0,
      pendingRefunds: 0,
      totalProcessed: 0,
      lastHealthCheck: null
    };

    this.metrics = {
      cancellationsInitiated: 0,
      cancellationsCompleted: 0,
      cancellationsReversed: 0,
      refundsProcessed: 0,
      revenueRecovered: 0,
      averageProcessingTime: 0
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
        service: 'cancellation-handler',
        module: 'student-service',
        environment: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL || 'info'
      });

      // 💰 Refund Calculator
      this.refundCalculator = new RefundCalculator({
        coolingPeriod: this.config.cancellationPolicy.coolingPeriod,
        coolingPeriodRefund: this.config.cancellationPolicy.coolingPeriodRefund,
        partialRefundPeriod: this.config.cancellationPolicy.partialRefundPeriod,
        minCompletionForRefund: this.config.cancellationPolicy.minCompletionForRefund,
        serviceFee: this.config.cancellationPolicy.serviceFee,
        processingFee: this.config.cancellationPolicy.processingFee
      });

      // 💸 Payment Gateway
      this.paymentGateway = new PaymentGateway({
        refundMethods: this.config.refund.methods,
        processingTime: this.config.refund.processingTime,
        minAmount: this.config.refund.minRefundAmount,
        maxAmount: this.config.refund.maxRefundAmount
      });

      // 📈 Retention Analyzer
      this.retentionAnalyzer = new RetentionAnalyzer({
        interventionThreshold: this.config.retention.interventionThreshold,
        maxInterventions: this.config.retention.maxInterventions,
        coolOffPeriod: this.config.retention.coolOffPeriod
      });

      // 📧 Notification Service
      this.notificationService = new NotificationService({
        templates: {
          cancellationConfirmed: 'cancellation_confirmed_v1',
          refundProcessed: 'refund_processed_v1',
          retentionOffer: 'retention_offer_v1',
          cancellationReversed: 'cancellation_reversed_v1'
        }
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

      // 🔄 Initialize Background Jobs
      this.initializeBackgroundJobs();

      // 🏥 Health Check
      await this.performHealthCheck();

      this.serviceState.initialized = true;
      this.serviceState.healthy = true;

      this.logger.system('Enterprise Cancellation Handler initialized successfully', {
        service: 'cancellation-handler',
        version: '2.0.0',
        features: {
          autoRefundProcessing: this.config.refund.autoProcessing,
          retentionIntervention: this.config.retention.enableIntervention,
          realTimeUpdates: this.config.performance.realTimeUpdates
        }
      });

    } catch (error) {
      this.logger.critical('Enterprise Cancellation Handler initialization failed', {
        error: error.message,
        stack: error.stack,
        service: 'cancellation-handler'
      });
      throw error;
    }
  }

  /**
   * 🔄 Initialize Background Jobs
   */
  initializeBackgroundJobs() {
    // 💰 Refund Processing Job
    this.refundInterval = setInterval(() => {
      this.processPendingRefunds().catch(error => {
        this.logger.error('Pending refunds processing failed', { error: error.message });
      });
    }, this.config.performance.processingInterval);

    // 📊 Impact Analysis Job
    this.impactInterval = setInterval(() => {
      this.analyzeCancellationImpact().catch(error => {
        this.logger.error('Cancellation impact analysis failed', { error: error.message });
      });
    }, 900000); // 15 minutes

    // 🚨 Retention Intervention Job
    this.retentionInterval = setInterval(() => {
      this.processRetentionInterventions().catch(error => {
        this.logger.error('Retention interventions processing failed', { error: error.message });
      });
    }, 1800000); // 30 minutes
  }

  /**
   * ❌ PROCESS CANCELLATION - Enterprise Grade
   */
  async processCancellation(cancellationRequest, context = {}) {
    const startTime = performance.now();
    const cancellationId = this.generateCancellationId();
    const traceId = context.traceId || cancellationId;

    try {
      // 🛡️ Pre-flight Checks
      await this.performPreFlightChecks();

      // ✅ Validate Cancellation Request
      await this.validateCancellationRequest(cancellationRequest);

      // 🔍 Get Enrollment Details
      const enrollment = await this.getEnrollmentDetails(cancellationRequest.enrollmentId);

      if (!enrollment) {
        throw new CancellationError('ENROLLMENT_NOT_FOUND', 'Enrollment not found for cancellation');
      }

      // 🎯 Check Cancellation Eligibility
      const eligibility = await this.checkCancellationEligibility(enrollment, cancellationRequest);

      if (!eligibility.eligible) {
        throw new CancellationError('CANCELLATION_NOT_ELIGIBLE', 'Cancellation request is not eligible', {
          reasons: eligibility.reasons
        });
      }

      // 💰 Calculate Refund Amount
      const refundCalculation = await this.calculateRefundAmount(enrollment, eligibility);

      // 📊 Analyze Cancellation Impact
      const impactAnalysis = await this.analyzeCancellationImpact(enrollment, refundCalculation);

      // 🚨 Check Retention Intervention
      const retentionCheck = await this.checkRetentionIntervention(enrollment, cancellationRequest);

      // 💾 Create Cancellation Record
      const cancellationRecord = await this.createCancellationRecord({
        cancellationId,
        cancellationRequest,
        enrollment,
        eligibility,
        refundCalculation,
        impactAnalysis,
        retentionCheck,
        traceId
      });

      // 🔄 Update Enrollment Status
      await this.updateEnrollmentStatus(enrollment.id, 'cancelled', cancellationId);

      // 👥 Update Expert Capacity
      if (enrollment.expertId) {
        await this.updateExpertCapacity(enrollment.expertId, -1);
      }

      // 📧 Send Cancellation Confirmation
      await this.sendCancellationConfirmation(cancellationRecord);

      // 🚨 Process Retention Intervention if Needed
      if (retentionCheck.interventionRecommended) {
        await this.processRetentionIntervention(cancellationRecord, retentionCheck);
      }

      // 📊 Update Metrics
      await this.updateCancellationMetrics({
        cancellationId,
        enrollmentId: cancellationRequest.enrollmentId,
        responseTime: performance.now() - startTime,
        refundAmount: refundCalculation.refundAmount,
        retentionOffered: retentionCheck.interventionRecommended
      });

      this.metrics.cancellationsInitiated++;
      this.serviceState.activeCancellations++;

      this.logger.business('Cancellation processed successfully', {
        cancellationId,
        traceId,
        enrollmentId: cancellationRequest.enrollmentId,
        studentId: enrollment.studentId,
        refundAmount: refundCalculation.refundAmount,
        retentionOffered: retentionCheck.interventionRecommended
      });

      return {
        success: true,
        cancellationId,
        enrollmentId: cancellationRequest.enrollmentId,
        status: 'cancelled',
        refundEligible: refundCalculation.refundAmount > 0,
        refundAmount: refundCalculation.refundAmount,
        refundMethod: refundCalculation.refundMethod,
        processingTime: refundCalculation.processingTime,
        retentionOffered: retentionCheck.interventionRecommended,
        nextSteps: this.generateCancellationNextSteps(refundCalculation.refundAmount, retentionCheck.interventionRecommended)
      };

    } catch (error) {
      await this.handleCancellationFailure({
        cancellationId,
        cancellationRequest,
        error,
        context,
        responseTime: performance.now() - startTime,
        traceId
      });
      throw error;
    }
  }

  /**
   * ✅ VALIDATE CANCELLATION REQUEST
   */
  async validateCancellationRequest(cancellationRequest) {
    const validationRules = {
      requiredFields: ['enrollmentId', 'reason', 'requestedBy'],
      validReasons: [
        'personal_circumstances',
        'dissatisfied_with_service',
        'financial_reasons',
        'time_constraints',
        'found_alternative',
        'quality_issues',
        'other'
      ],
      enrollmentRequirements: {
        mustExist: true,
        validStatus: ['active', 'pending_matching']
      },
      userRequirements: {
        mustBeStudentOrAdmin: true,
        mustHavePermission: true
      }
    };

    const errors = [];

    // ✅ Check Required Fields
    const missingFields = validationRules.requiredFields.filter(field => !cancellationRequest[field]);
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // ✅ Validate Reason
    if (!validationRules.validReasons.includes(cancellationRequest.reason)) {
      errors.push(`Invalid cancellation reason: ${cancellationRequest.reason}`);
    }

    // ✅ Verify Enrollment Exists
    if (cancellationRequest.enrollmentId) {
      const enrollmentValidation = await this.validateEnrollment(cancellationRequest.enrollmentId, validationRules.enrollmentRequirements);
      if (!enrollmentValidation.valid) {
        errors.push(`Enrollment validation failed: ${enrollmentValidation.reason}`);
      }
    }

    // ✅ Verify User Permissions
    if (cancellationRequest.requestedBy) {
      const userValidation = await this.validateUserPermissions(cancellationRequest.requestedBy, validationRules.userRequirements);
      if (!userValidation.valid) {
        errors.push(`User validation failed: ${userValidation.reason}`);
      }
    }

    if (errors.length > 0) {
      throw new CancellationError('CANCELLATION_VALIDATION_FAILED', 'Cancellation request validation failed', {
        errors,
        enrollmentId: cancellationRequest.enrollmentId,
        reason: cancellationRequest.reason
      });
    }

    this.logger.security('Cancellation request validation passed', {
      enrollmentId: cancellationRequest.enrollmentId,
      reason: cancellationRequest.reason,
      requestedBy: cancellationRequest.requestedBy
    });
  }

  /**
   * 🎯 CHECK CANCELLATION ELIGIBILITY
   */
  async checkCancellationEligibility(enrollment, cancellationRequest) {
    const eligibilityStartTime = performance.now();

    try {
      const eligibilityCriteria = {};
      const reasons = [];

      // ✅ Enrollment Status Check
      eligibilityCriteria.validStatus = this.isValidCancellationStatus(enrollment.status);
      if (!eligibilityCriteria.validStatus) {
        reasons.push(`Enrollment status '${enrollment.status}' cannot be cancelled`);
      }

      // ✅ Time-Based Eligibility
      eligibilityCriteria.timeEligibility = await this.checkTimeEligibility(enrollment);
      if (!eligibilityCriteria.timeEligibility.eligible) {
        reasons.push(eligibilityCriteria.timeEligibility.reason);
      }

      // ✅ Progress-Based Eligibility
      eligibilityCriteria.progressEligibility = await this.checkProgressEligibility(enrollment);
      if (!eligibilityCriteria.progressEligibility.eligible) {
        reasons.push(eligibilityCriteria.progressEligibility.reason);
      }

      // ✅ Previous Cancellations Check
      eligibilityCriteria.previousCancellations = await this.checkPreviousCancellations(enrollment.studentId);
      if (!eligibilityCriteria.previousCancellations.eligible) {
        reasons.push(...eligibilityCriteria.previousCancellations.reasons);
      }

      // ✅ Financial Eligibility
      eligibilityCriteria.financialEligibility = await this.checkFinancialEligibility(enrollment);
      if (!eligibilityCriteria.financialEligibility.eligible) {
        reasons.push(eligibilityCriteria.financialEligibility.reason);
      }

      const eligible = Object.values(eligibilityCriteria).every(criterion => {
        if (typeof criterion === 'boolean') return criterion;
        if (typeof criterion === 'object') return criterion.eligible !== false;
        return true;
      });

      const eligibilityCheck = {
        eligible,
        criteria: eligibilityCriteria,
        reasons: eligible ? ['All eligibility criteria met'] : reasons,
        checkTime: performance.now() - eligibilityStartTime,
        checkedAt: new Date().toISOString()
      };

      this.logger.debug('Cancellation eligibility check completed', {
        enrollmentId: enrollment.id,
        eligible,
        criteria: Object.keys(eligibilityCriteria).filter(k => eligibilityCriteria[k].eligible !== false)
      });

      return eligibilityCheck;

    } catch (error) {
      this.logger.error('Cancellation eligibility check failed', {
        enrollmentId: enrollment.id,
        error: error.message
      });

      return {
        eligible: false,
        criteria: {},
        reasons: ['Eligibility check failed'],
        error: error.message
      };
    }
  }

  /**
   * 💰 CALCULATE REFUND AMOUNT
   */
  async calculateRefundAmount(enrollment, eligibility) {
    const calculationStartTime = performance.now();

    try {
      // 🎯 Get enrollment progress and details
      const enrollmentDetails = await this.getEnrollmentProgressDetails(enrollment.id);

      // 💰 Calculate refund based on policy
      const refundCalculation = await this.refundCalculator.calculateRefund({
        enrollmentDate: enrollment.createdAt,
        enrollmentStatus: enrollment.status,
        paymentAmount: enrollment.paymentAmount,
        progress: enrollmentDetails.progress,
        sessionsCompleted: enrollmentDetails.sessionsCompleted,
        totalSessions: enrollmentDetails.totalSessions,
        reason: eligibility.cancellationReason
      });

      // 🎯 Determine refund method
      const refundMethod = this.determineRefundMethod(enrollment, refundCalculation.refundAmount);

      const refundResult = {
        refundAmount: refundCalculation.refundAmount,
        originalAmount: enrollment.paymentAmount,
        deduction: enrollment.paymentAmount - refundCalculation.refundAmount,
        deductionReason: refundCalculation.deductionReason,
        refundMethod,
        processingTime: this.config.refund.processingTime,
        calculationTime: performance.now() - calculationStartTime,
        calculatedAt: new Date().toISOString()
      };

      this.logger.debug('Refund amount calculated', {
        enrollmentId: enrollment.id,
        originalAmount: enrollment.paymentAmount,
        refundAmount: refundCalculation.refundAmount,
        refundMethod
      });

      return refundResult;

    } catch (error) {
      this.logger.error('Refund amount calculation failed', {
        enrollmentId: enrollment.id,
        error: error.message
      });

      throw new CancellationError('REFUND_CALCULATION_FAILED', 'Failed to calculate refund amount', {
        originalError: error.message
      });
    }
  }

  /**
   * 📊 ANALYZE CANCELLATION IMPACT
   */
  async analyzeCancellationImpact(enrollment, refundCalculation) {
    const analysisStartTime = performance.now();

    try {
      const impactAnalysis = {
        expertImpact: {},
        revenueImpact: {},
        systemImpact: {},
        studentImpact: {}
      };

      // 👥 Expert Impact Analysis
      if (enrollment.expertId) {
        impactAnalysis.expertImpact = await this.analyzeExpertImpact(enrollment.expertId, enrollment);
      }

      // 💰 Revenue Impact Analysis
      impactAnalysis.revenueImpact = await this.analyzeRevenueImpact(enrollment, refundCalculation);

      // 🏢 System Impact Analysis
      impactAnalysis.systemImpact = await this.analyzeSystemImpact(enrollment);

      // 🎓 Student Impact Analysis
      impactAnalysis.studentImpact = await this.analyzeStudentImpact(enrollment.studentId);

      impactAnalysis.analysisTime = performance.now() - analysisStartTime;
      impactAnalysis.analyzedAt = new Date().toISOString();

      this.logger.debug('Cancellation impact analysis completed', {
        enrollmentId: enrollment.id,
        expertImpact: impactAnalysis.expertImpact.impactLevel,
        revenueImpact: impactAnalysis.revenueImpact.amount
      });

      return impactAnalysis;

    } catch (error) {
      this.logger.error('Cancellation impact analysis failed', {
        enrollmentId: enrollment.id,
        error: error.message
      });

      return {
        expertImpact: { impactLevel: 'unknown' },
        revenueImpact: { amount: 0 },
        systemImpact: { impactLevel: 'unknown' },
        studentImpact: { impactLevel: 'unknown' },
        error: error.message
      };
    }
  }

  /**
   * 🚨 CHECK RETENTION INTERVENTION
   */
  async checkRetentionIntervention(enrollment, cancellationRequest) {
    if (!this.config.retention.enableIntervention) {
      return {
        interventionRecommended: false,
        reason: 'Retention interventions disabled'
      };
    }

    const checkStartTime = performance.now();

    try {
      const interventionCriteria = {};

      // 📊 Student Cancellation History
      interventionCriteria.cancellationHistory = await this.analyzeStudentCancellationHistory(enrollment.studentId);

      // 💰 Financial Value Analysis
      interventionCriteria.financialValue = await this.analyzeStudentFinancialValue(enrollment.studentId);

      // 🎯 Reason-Based Intervention
      interventionCriteria.reasonBased = this.analyzeCancellationReason(cancellationRequest.reason);

      // 📈 Progress-Based Intervention
      interventionCriteria.progressBased = await this.analyzeProgressForIntervention(enrollment.id);

      const interventionRecommended = this.shouldRecommendIntervention(interventionCriteria);

      const retentionCheck = {
        interventionRecommended,
        criteria: interventionCriteria,
        recommendedActions: interventionRecommended ? this.generateRetentionActions(interventionCriteria) : [],
        checkTime: performance.now() - checkStartTime,
        checkedAt: new Date().toISOString()
      };

      this.logger.debug('Retention intervention check completed', {
        enrollmentId: enrollment.id,
        interventionRecommended,
        criteria: Object.keys(interventionCriteria).filter(k => interventionCriteria[k])
      });

      return retentionCheck;

    } catch (error) {
      this.logger.error('Retention intervention check failed', {
        enrollmentId: enrollment.id,
        error: error.message
      });

      return {
        interventionRecommended: false,
        criteria: {},
        recommendedActions: [],
        error: error.message
      };
    }
  }

  /**
   * 💾 CREATE CANCELLATION RECORD
   */
  async createCancellationRecord(recordData) {
    const {
      cancellationId,
      cancellationRequest,
      enrollment,
      eligibility,
      refundCalculation,
      impactAnalysis,
      retentionCheck,
      traceId
    } = recordData;

    try {
      const cancellationRecord = await this.prisma.cancellation.create({
        data: {
          id: cancellationId,
          enrollmentId: cancellationRequest.enrollmentId,
          studentId: enrollment.studentId,
          expertId: enrollment.expertId,
          reason: cancellationRequest.reason,
          requestedBy: cancellationRequest.requestedBy,
          refundAmount: refundCalculation.refundAmount,
          refundMethod: refundCalculation.refundMethod,
          status: refundCalculation.refundAmount > 0 ? 'pending_refund' : 'completed',
          eligibilityDetails: eligibility,
          refundCalculation: refundCalculation,
          impactAnalysis: impactAnalysis,
          retentionCheck: retentionCheck,
          metadata: {
            traceId,
            originalPaymentAmount: enrollment.paymentAmount,
            enrollmentDuration: this.calculateEnrollmentDuration(enrollment),
            createdAt: new Date().toISOString()
          }
        },
        include: {
          enrollment: {
            include: {
              student: {
                select: {
                  personalInfo: true,
                  contactInfo: true
                }
              },
              expert: {
                select: {
                  personalInfo: true,
                  contactInfo: true
                }
              }
            }
          }
        }
      });

      this.logger.debug('Cancellation record created successfully', {
        cancellationId,
        enrollmentId: cancellationRequest.enrollmentId,
        refundAmount: refundCalculation.refundAmount
      });

      return cancellationRecord;

    } catch (error) {
      this.logger.error('Cancellation record creation failed', {
        cancellationId,
        error: error.message
      });

      throw new CancellationError('CANCELLATION_RECORD_CREATION_FAILED', 'Failed to create cancellation record', {
        originalError: error.message
      });
    }
  }

  /**
   * 💰 PROCESS REFUND - Enterprise Grade
   */
  async processRefund(refundRequest, context = {}) {
    const startTime = performance.now();
    const refundId = this.generateRefundId();
    const traceId = context.traceId || refundId;

    try {
      // 🛡️ Pre-flight Checks
      await this.performPreFlightChecks();

      // ✅ Validate Refund Request
      await this.validateRefundRequest(refundRequest);

      // 🔍 Get Cancellation Details
      const cancellation = await this.getCancellationDetails(refundRequest.cancellationId);

      if (!cancellation) {
        throw new CancellationError('CANCELLATION_NOT_FOUND', 'Cancellation not found for refund processing');
      }

      // 💸 Process Payment Gateway Refund
      const refundResult = await this.processPaymentRefund(cancellation, refundRequest);

      // 💾 Update Refund Record
      const refundRecord = await this.updateRefundRecord(cancellation.id, refundResult);

      // 📧 Send Refund Confirmation
      await this.sendRefundConfirmation(refundRecord);

      // 📊 Update Metrics
      await this.updateRefundMetrics({
        refundId,
        cancellationId: refundRequest.cancellationId,
        amount: refundResult.amount,
        responseTime: performance.now() - startTime
      });

      this.metrics.refundsProcessed++;
      this.metrics.revenueRecovered += refundResult.amount;
      this.serviceState.pendingRefunds--;

      this.logger.business('Refund processed successfully', {
        refundId,
        traceId,
        cancellationId: refundRequest.cancellationId,
        amount: refundResult.amount,
        gateway: refundResult.gateway,
        transactionId: refundResult.transactionId
      });

      return {
        success: true,
        refundId,
        cancellationId: refundRequest.cancellationId,
        amount: refundResult.amount,
        gateway: refundResult.gateway,
        transactionId: refundResult.transactionId,
        estimatedArrival: refundResult.estimatedArrival,
        nextSteps: this.generateRefundNextSteps(refundResult.gateway)
      };

    } catch (error) {
      await this.handleRefundFailure({
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
   * 🔄 REVERSE CANCELLATION - Enterprise Grade
   */
  async reverseCancellation(reversalRequest, context = {}) {
    const startTime = performance.now();
    const reversalId = this.generateReversalId();
    const traceId = context.traceId || reversalId;

    try {
      // 🛡️ Pre-flight Checks
      await this.performPreFlightChecks();

      // ✅ Validate Reversal Request
      await this.validateReversalRequest(reversalRequest);

      // 🔍 Get Cancellation Details
      const cancellation = await this.getCancellationDetails(reversalRequest.cancellationId);

      if (!cancellation) {
        throw new CancellationError('CANCELLATION_NOT_FOUND', 'Cancellation not found for reversal');
      }

      // 🎯 Check Reversal Eligibility
      const reversalEligibility = await this.checkReversalEligibility(cancellation);

      if (!reversalEligibility.eligible) {
        throw new CancellationError('REVERSAL_NOT_ELIGIBLE', 'Cancellation reversal is not eligible', {
          reasons: reversalEligibility.reasons
        });
      }

      // 🔄 Reverse Enrollment Status
      const reversedEnrollment = await this.reverseEnrollmentStatus(cancellation.enrollmentId);

      // 👥 Restore Expert Capacity
      if (cancellation.expertId) {
        await this.updateExpertCapacity(cancellation.expertId, 1);
      }

      // 💾 Create Reversal Record
      const reversalRecord = await this.createReversalRecord({
        reversalId,
        reversalRequest,
        cancellation,
        reversalEligibility,
        reversedEnrollment,
        traceId
      });

      // 📧 Send Reversal Confirmation
      await this.sendReversalConfirmation(reversalRecord);

      // 📊 Update Metrics
      this.metrics.cancellationsReversed++;

      this.logger.business('Cancellation reversed successfully', {
        reversalId,
        traceId,
        cancellationId: reversalRequest.cancellationId,
        enrollmentId: cancellation.enrollmentId,
        reversedBy: reversalRequest.requestedBy
      });

      return {
        success: true,
        reversalId,
        cancellationId: reversalRequest.cancellationId,
        enrollmentId: cancellation.enrollmentId,
        status: 'reversed',
        enrollmentStatus: 'active',
        nextSteps: this.generateReversalNextSteps()
      };

    } catch (error) {
      await this.handleReversalFailure({
        reversalId,
        reversalRequest,
        error,
        context,
        responseTime: performance.now() - startTime,
        traceId
      });
      throw error;
    }
  }

  /**
   * 💰 PROCESS PENDING REFUNDS - Background Job
   */
  async processPendingRefunds() {
    const processingStartTime = performance.now();
    const batchId = this.generateBatchId();

    try {
      this.logger.info('Processing pending refunds', { batchId });

      // 🔍 Get Pending Refunds
      const pendingRefunds = await this.getPendingRefunds();

      this.serviceState.pendingRefunds = pendingRefunds.length;

      let processed = 0;
      let totalAmount = 0;

      for (const refund of pendingRefunds) {
        try {
          const refundResult = await this.processRefund({
            cancellationId: refund.cancellationId,
            processedBy: 'system_batch'
          });

          if (refundResult.success) {
            processed++;
            totalAmount += refundResult.amount;
          }

        } catch (error) {
          this.logger.warn('Refund processing failed', {
            batchId,
            cancellationId: refund.cancellationId,
            error: error.message
          });
        }
      }

      this.logger.business('Pending refunds processing completed', {
        batchId,
        total: pendingRefunds.length,
        processed,
        totalAmount,
        processingTime: performance.now() - processingStartTime
      });

    } catch (error) {
      this.logger.error('Pending refunds processing failed', {
        batchId,
        error: error.message
      });
    }
  }

  /**
   * 📊 ANALYZE CANCELLATION IMPACT - Background Job
   */
  async analyzeCancellationImpact() {
    const analysisStartTime = performance.now();
    const analysisId = this.generateAnalysisId();

    try {
      this.logger.info('Analyzing cancellation impact', { analysisId });

      // 📈 Get Recent Cancellations
      const recentCancellations = await this.getRecentCancellations();

      let expertImpactTotal = 0;
      let revenueImpactTotal = 0;

      for (const cancellation of recentCancellations) {
        try {
          const impactAnalysis = await this.analyzeSingleCancellationImpact(cancellation);
          
          expertImpactTotal += impactAnalysis.expertImpact.score || 0;
          revenueImpactTotal += impactAnalysis.revenueImpact.amount || 0;

        } catch (error) {
          this.logger.warn('Single cancellation impact analysis failed', {
            analysisId,
            cancellationId: cancellation.id,
            error: error.message
          });
        }
      }

      // 💾 Store System Impact Analysis
      await this.storeSystemImpactAnalysis({
        analysisId,
        expertImpactTotal,
        revenueImpactTotal,
        totalCancellations: recentCancellations.length,
        analysisTime: performance.now() - analysisStartTime
      });

      this.logger.business('Cancellation impact analysis completed', {
        analysisId,
        totalCancellations: recentCancellations.length,
        expertImpactTotal,
        revenueImpactTotal,
        processingTime: performance.now() - analysisStartTime
      });

    } catch (error) {
      this.logger.error('Cancellation impact analysis failed', {
        analysisId,
        error: error.message
      });
    }
  }

  /**
   * 🚨 PROCESS RETENTION INTERVENTIONS - Background Job
   */
  async processRetentionInterventions() {
    const processingStartTime = performance.now();
    const interventionId = this.generateInterventionId();

    try {
      this.logger.info('Processing retention interventions', { interventionId });

      // 🔍 Get Candidates for Intervention
      const interventionCandidates = await this.getInterventionCandidates();

      let interventionsSent = 0;
      let interventionsAccepted = 0;

      for (const candidate of interventionCandidates) {
        try {
          const interventionResult = await this.sendRetentionIntervention(candidate);

          if (interventionResult.success) {
            interventionsSent++;
            
            if (interventionResult.accepted) {
              interventionsAccepted++;
            }
          }

        } catch (error) {
          this.logger.warn('Retention intervention failed', {
            interventionId,
            candidateId: candidate.studentId,
            error: error.message
          });
        }
      }

      this.logger.business('Retention interventions processing completed', {
        interventionId,
        candidates: interventionCandidates.length,
        interventionsSent,
        interventionsAccepted,
        acceptanceRate: interventionsSent > 0 ? (interventionsAccepted / interventionsSent) * 100 : 0,
        processingTime: performance.now() - processingStartTime
      });

    } catch (error) {
      this.logger.error('Retention interventions processing failed', {
        interventionId,
        error: error.message
      });
    }
  }

  /**
   * 📊 GET CANCELLATION ANALYTICS
   */
  async getCancellationAnalytics(timeRange = '30d') {
    const analytics = {
      summary: {
        totalCancellations: this.metrics.cancellationsInitiated,
        totalRefunds: this.metrics.refundsProcessed,
        revenueRecovered: this.metrics.revenueRecovered,
        reversalRate: this.calculateReversalRate()
      },
      performance: {
        processingStats: {
          initiated: this.metrics.cancellationsInitiated,
          completed: this.metrics.cancellationsCompleted,
          reversed: this.metrics.cancellationsReversed,
          averageProcessingTime: this.metrics.averageProcessingTime
        },
        refundProcessing: await this.getRefundProcessingMetrics(timeRange)
      },
      impact: {
        revenueImpact: await this.getRevenueImpact(timeRange),
        expertImpact: await this.getExpertImpact(timeRange),
        studentImpact: await this.getStudentImpact(timeRange)
      },
      retention: {
        interventionMetrics: await this.getInterventionMetrics(timeRange),
        successRates: await this.getRetentionSuccessRates(timeRange),
        improvementOpportunities: await this.getImprovementOpportunities(timeRange)
      }
    };

    return analytics;
  }

  /**
   * 🔧 UTILITY METHODS
   */

  generateCancellationId() {
    return `cancel_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateRefundId() {
    return `refund_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateReversalId() {
    return `reverse_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateBatchId() {
    return `batch_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateAnalysisId() {
    return `analysis_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateInterventionId() {
    return `intervene_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  calculateEnrollmentDuration(enrollment) {
    const startDate = new Date(enrollment.createdAt);
    const endDate = new Date();
    return Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)); // days
  }

  determineRefundMethod(enrollment, refundAmount) {
    // 🎯 Determine the most appropriate refund method
    if (refundAmount === 0) return 'none';

    const originalMethod = enrollment.paymentMethod;
    
    // Prefer original method for full refunds
    if (refundAmount === enrollment.paymentAmount) {
      return originalMethod;
    }

    // For partial refunds, use wallet credit to encourage retention
    if (refundAmount < enrollment.paymentAmount && refundAmount >= this.config.refund.minRefundAmount) {
      return 'wallet_credit';
    }

    return originalMethod;
  }

  isValidCancellationStatus(status) {
    const validStatuses = ['active', 'pending_matching', 'payment_pending'];
    return validStatuses.includes(status);
  }

  shouldRecommendIntervention(criteria) {
    // 🎯 Complex logic to determine if intervention should be recommended
    let score = 0;

    if (criteria.cancellationHistory.rate < 0.1) score += 3; // Low cancellation history
    if (criteria.financialValue.lifetimeValue > 5000) score += 2; // High lifetime value
    if (criteria.reasonBased.interventionLikely) score += 2; // Reason suggests intervention likely
    if (criteria.progressBased.highProgress) score += 1; // Good progress made

    return score >= 5; // Minimum threshold for intervention
  }

  generateCancellationNextSteps(refundAmount, retentionOffered) {
    if (retentionOffered) {
      return ['retention_offer_review', 'decision_pending', 'follow_up_scheduled'];
    } else if (refundAmount > 0) {
      return ['refund_processing', 'payment_gateway_communication', 'confirmation_notification'];
    } else {
      return ['cancellation_completion', 'feedback_collection', 'account_cleanup'];
    }
  }

  generateRefundNextSteps(gateway) {
    const nextSteps = {
      telebirr: ['transaction_verification', 'funds_transfer', 'sms_confirmation'],
      cbe_birr: ['bank_processing', 'account_credit', 'email_confirmation'],
      wallet_credit: ['wallet_update', 'balance_verification', 'notification_send'],
      bank_transfer: ['bank_initiation', 'processing_wait', 'completion_notification']
    };

    return nextSteps[gateway] || ['processing_initiated', 'status_monitoring'];
  }

  generateReversalNextSteps() {
    return ['enrollment_reactivation', 'expert_notification', 'progress_restoration'];
  }

  /**
   * 🏥 HEALTH CHECK
   */
  async performHealthCheck() {
    try {
      // 💾 Check Database
      await this.prisma.$queryRaw`SELECT 1`;
      
      // 🔄 Check Redis
      await this.redis.ping();

      // 📊 Check Background Jobs
      const backgroundJobsHealthy = this.refundInterval && this.impactInterval && this.retentionInterval;

      this.serviceState.healthy = backgroundJobsHealthy;
      this.serviceState.lastHealthCheck = new Date();

      if (!this.serviceState.healthy) {
        this.logger.warn('Cancellation handler health check failed', {
          backgroundJobsHealthy
        });
      }

      return this.serviceState.healthy;

    } catch (error) {
      this.serviceState.healthy = false;
      this.logger.error('Cancellation handler health check failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * 🎯 ERROR HANDLING
   */
  async handleCancellationFailure({ cancellationId, cancellationRequest, error, context, responseTime, traceId }) {
    this.metrics.cancellationsFailed++;

    this.logger.error('Cancellation processing failed', {
      cancellationId,
      traceId,
      enrollmentId: cancellationRequest.enrollmentId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2)
    });
  }

  async handleRefundFailure({ refundId, refundRequest, error, context, responseTime, traceId }) {
    this.logger.error('Refund processing failed', {
      refundId,
      traceId,
      cancellationId: refundRequest.cancellationId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2)
    });
  }

  async handleReversalFailure({ reversalId, reversalRequest, error, context, responseTime, traceId }) {
    this.logger.error('Cancellation reversal failed', {
      reversalId,
      traceId,
      cancellationId: reversalRequest.cancellationId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2)
    });
  }

  /**
   * 🧹 CLEANUP
   */
  async destroy() {
    if (this.refundInterval) clearInterval(this.refundInterval);
    if (this.impactInterval) clearInterval(this.impactInterval);
    if (this.retentionInterval) clearInterval(this.retentionInterval);
    
    await this.prisma.$disconnect();
    await this.redis.quit();
  }
}

/**
 * 🎯 ENTERPRISE CANCELLATION ERROR CLASS
 */
class CancellationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'CancellationError';
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

// 🎯 Enterprise Cancellation Error Codes
CancellationError.CODES = {
  // 🔐 Validation Errors
  CANCELLATION_VALIDATION_FAILED: 'CANCELLATION_VALIDATION_FAILED',
  REFUND_VALIDATION_FAILED: 'REFUND_VALIDATION_FAILED',
  REVERSAL_VALIDATION_FAILED: 'REVERSAL_VALIDATION_FAILED',

  // ❌ Eligibility Errors
  CANCELLATION_NOT_ELIGIBLE: 'CANCELLATION_NOT_ELIGIBLE',
  REVERSAL_NOT_ELIGIBLE: 'REVERSAL_NOT_ELIGIBLE',
  ENROLLMENT_NOT_FOUND: 'ENROLLMENT_NOT_FOUND',
  CANCELLATION_NOT_FOUND: 'CANCELLATION_NOT_FOUND',

  // 💰 Refund Errors
  REFUND_CALCULATION_FAILED: 'REFUND_CALCULATION_FAILED',
  PAYMENT_GATEWAY_FAILED: 'PAYMENT_GATEWAY_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',

  // 🔄 Processing Errors
  CANCELLATION_RECORD_CREATION_FAILED: 'CANCELLATION_RECORD_CREATION_FAILED',
  ENROLLMENT_STATUS_UPDATE_FAILED: 'ENROLLMENT_STATUS_UPDATE_FAILED',
  EXPERT_CAPACITY_UPDATE_FAILED: 'EXPERT_CAPACITY_UPDATE_FAILED',

  // 🚨 Retention Errors
  RETENTION_INTERVENTION_FAILED: 'RETENTION_INTERVENTION_FAILED',
  INTERVENTION_LIMIT_EXCEEDED: 'INTERVENTION_LIMIT_EXCEEDED'
};

module.exports = {
  CancellationHandler,
  CancellationError
};