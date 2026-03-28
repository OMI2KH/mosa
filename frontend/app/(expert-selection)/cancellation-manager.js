// expert-selection/cancellation-manager.js

/**
 * 🎯 ENTERPRISE CANCELLATION MANAGER
 * Production-ready cancellation system with quality protection
 * Features: Auto-expert switching, refund processing, quality impact analysis
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../../utils/logger');
const { PaymentCalculator } = require('../../utils/payment-utils');
const { QualityAnalyzer } = require('../../utils/quality-calculations');

class CancellationManager extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('CancellationManager');
    this.paymentCalculator = new PaymentCalculator();
    this.qualityAnalyzer = new QualityAnalyzer();

    // Cancellation reasons classification
    this.cancellationReasons = {
      STUDENT_INITIATED: [
        'PERSONAL_REASONS',
        'FINANCIAL_CONSTRAINTS', 
        'DISSATISFIED_WITH_PROGRESS',
        'FOUND_BETTER_OPTION',
        'TIME_CONSTRAINTS',
        'HEALTH_ISSUES'
      ],
      EXPERT_RELATED: [
        'QUALITY_ISSUES',
        'COMMUNICATION_PROBLEMS',
        'AVAILABILITY_ISSUES',
        'PROFESSIONALISM_CONCERNS'
      ],
      PLATFORM_RELATED: [
        'TECHNICAL_ISSUES',
        'AUTO_EXPERT_SWITCHING',
        'QUALITY_GUARANTEE_TRIGGER'
      ]
    };

    this.initialize();
  }

  /**
   * Initialize cancellation system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.loadCancellationPolicies();
      this.logger.info('Cancellation manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize cancellation manager', error);
      throw error;
    }
  }

  /**
   * 🎯 INITIATE CANCELLATION - Core cancellation flow
   */
  async initiateCancellation(cancellationData) {
    const startTime = performance.now();
    const transactionId = `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.info('Initiating cancellation process', { 
        transactionId, 
        ...cancellationData 
      });

      // 🛡️ VALIDATION PHASE
      await this.validateCancellationRequest(cancellationData);

      // 📊 ANALYSIS PHASE
      const analysis = await this.analyzeCancellationImpact(cancellationData);

      // 💾 PROCESSING PHASE
      const result = await this.processCancellationTransaction(cancellationData, analysis, transactionId);

      // 🔄 AUTO-REMEDIATION PHASE
      if (analysis.requiresAutoRemediation) {
        await this.executeAutoRemediation(result);
      }

      // 📈 METRICS & REPORTING
      await this.updateCancellationMetrics(result);

      const processingTime = performance.now() - startTime;
      
      this.logger.metric('cancellation_processing_time', processingTime, {
        transactionId,
        enrollmentId: cancellationData.enrollmentId,
        cancellationType: result.cancellationType
      });

      this.emit('cancellationCompleted', {
        ...result,
        transactionId,
        processingTime: `${processingTime.toFixed(2)}ms`
      });

      return {
        success: true,
        transactionId,
        cancellationId: result.cancellationRecord.id,
        refundAmount: result.refundAmount,
        autoRemediation: result.autoRemediation,
        nextSteps: result.nextSteps
      };

    } catch (error) {
      this.logger.error('Cancellation process failed', error, {
        transactionId,
        cancellationData
      });

      this.emit('cancellationFailed', {
        transactionId,
        error: error.message,
        cancellationData
      });

      throw error;
    }
  }

  /**
   * 🛡️ COMPREHENSIVE CANCELLATION VALIDATION
   */
  async validateCancellationRequest(cancellationData) {
    const {
      enrollmentId,
      initiatedBy, // 'STUDENT', 'EXPERT', 'SYSTEM', 'ADMIN'
      reason,
      explanation,
      forceCancellation = false
    } = cancellationData;

    // Required fields validation
    if (!enrollmentId || !initiatedBy || !reason) {
      throw new Error('MISSING_REQUIRED_CANCELLATION_FIELDS');
    }

    // Validate enrollment exists and is active
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        expert: true,
        course: true,
        payments: {
          where: { status: 'COMPLETED' }
        }
      }
    });

    if (!enrollment) {
      throw new Error('ENROLLMENT_NOT_FOUND');
    }

    if (enrollment.status === 'CANCELLED') {
      throw new Error('ENROLLMENT_ALREADY_CANCELLED');
    }

    if (!['ACTIVE', 'PAUSED'].includes(enrollment.status)) {
      throw new Error('INVALID_ENROLLMENT_STATUS_FOR_CANCELLATION');
    }

    // Authorization validation
    await this.validateCancellationAuthorization(enrollment, initiatedBy, cancellationData);

    // Reason validation
    if (!this.isValidCancellationReason(reason, initiatedBy)) {
      throw new Error('INVALID_CANCELLATION_REASON');
    }

    // Explanation length validation
    if (explanation && explanation.length > 2000) {
      throw new Error('EXPLANATION_TOO_LONG');
    }

    this.logger.debug('Cancellation validation passed', { enrollmentId, initiatedBy, reason });
  }

  /**
   * 🔐 VALIDATE CANCELLATION AUTHORIZATION
   */
  async validateCancellationAuthorization(enrollment, initiatedBy, cancellationData) {
    switch (initiatedBy) {
      case 'STUDENT':
        if (enrollment.studentId !== cancellationData.studentId) {
          throw new Error('UNAUTHORIZED_STUDENT_CANCELLATION');
        }
        break;

      case 'EXPERT':
        if (enrollment.expertId !== cancellationData.expertId) {
          throw new Error('UNAUTHORIZED_EXPERT_CANCELLATION');
        }
        
        // Experts can only cancel for valid reasons
        const validExpertReasons = [
          'QUALITY_ISSUES',
          'COMMUNICATION_PROBLEMS', 
          'AVAILABILITY_ISSUES'
        ];
        if (!validExpertReasons.includes(cancellationData.reason)) {
          throw new Error('INVALID_EXPERT_CANCELLATION_REASON');
        }
        break;

      case 'SYSTEM':
        // System cancellations require specific triggers
        if (!cancellationData.systemTrigger) {
          throw new Error('SYSTEM_CANCELLATION_REQUIRES_VALID_TRIGGER');
        }
        break;

      case 'ADMIN':
        // Admin cancellations require admin privileges
        if (!cancellationData.adminId) {
          throw new Error('ADMIN_CANCELLATION_REQUIRES_ADMIN_ID');
        }
        break;

      default:
        throw new Error('INVALID_CANCELLATION_INITIATOR');
    }
  }

  /**
   * 📊 ANALYZE CANCELLATION IMPACT
   */
  async analyzeCancellationImpact(cancellationData) {
    const { enrollmentId, reason, initiatedBy } = cancellationData;

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        expert: true,
        course: true,
        trainingSessions: {
          where: { status: 'COMPLETED' }
        },
        payments: {
          where: { status: 'COMPLETED' }
        }
      }
    });

    const analysis = {
      enrollmentProgress: this.calculateEnrollmentProgress(enrollment),
      financialImpact: await this.calculateFinancialImpact(enrollment),
      qualityImpact: await this.analyzeQualityImpact(enrollment, reason, initiatedBy),
      studentImpact: await this.analyzeStudentImpact(enrollment.studentId),
      expertImpact: await this.analyzeExpertImpact(enrollment.expertId, reason),
      requiresAutoRemediation: false,
      autoRemediationType: null,
      priority: 'MEDIUM'
    };

    // Determine if auto-remediation is required
    if (this.shouldTriggerAutoRemediation(analysis, cancellationData)) {
      analysis.requiresAutoRemediation = true;
      analysis.autoRemediationType = this.determineAutoRemediationType(analysis, cancellationData);
      analysis.priority = 'HIGH';
    }

    // Set priority based on impact
    if (analysis.financialImpact.refundAmount > 1000 || analysis.qualityImpact.score < 3.0) {
      analysis.priority = 'HIGH';
    }

    this.logger.debug('Cancellation impact analysis completed', {
      enrollmentId,
      requiresAutoRemediation: analysis.requiresAutoRemediation,
      priority: analysis.priority
    });

    return analysis;
  }

  /**
   * 📈 CALCULATE ENROLLMENT PROGRESS
   */
  calculateEnrollmentProgress(enrollment) {
    const totalSessions = enrollment.course.totalSessions || 24; // Default 24 sessions
    const completedSessions = enrollment.trainingSessions.length;
    
    const progressPercentage = (completedSessions / totalSessions) * 100;
    
    return {
      completedSessions,
      totalSessions,
      progressPercentage: Math.round(progressPercentage),
      phase: this.determineLearningPhase(progressPercentage)
    };
  }

  /**
   * 🎯 DETERMINE LEARNING PHASE
   */
  determineLearningPhase(progressPercentage) {
    if (progressPercentage < 25) return 'MINDSET_FOUNDATION';
    if (progressPercentage < 50) return 'THEORY_MASTERY';
    if (progressPercentage < 75) return 'HANDS_ON_IMMERSION';
    return 'CERTIFICATION_READY';
  }

  /**
   * 💰 CALCULATE FINANCIAL IMPACT
   */
  async calculateFinancialImpact(enrollment) {
    const totalPaid = enrollment.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const progress = this.calculateEnrollmentProgress(enrollment);
    
    // Refund calculation based on progress and policies
    const refundAmount = this.calculateRefundAmount(totalPaid, progress.progressPercentage);
    
    // Expert payout adjustments
    const expertPayoutImpact = await this.calculateExpertPayoutImpact(enrollment, progress);
    
    // Platform revenue impact
    const platformRevenueImpact = this.calculatePlatformRevenueImpact(totalPaid, refundAmount);

    return {
      totalPaid,
      refundAmount,
      expertPayoutImpact,
      platformRevenueImpact,
      cancellationFee: this.calculateCancellationFee(progress.progressPercentage)
    };
  }

  /**
   * 🧮 CALCULATE REFUND AMOUNT
   */
  calculateRefundAmount(totalPaid, progressPercentage) {
    // Refund policy based on progress
    if (progressPercentage <= 10) {
      // Full refund within first 10% progress
      return totalPaid;
    } else if (progressPercentage <= 25) {
      // 75% refund up to 25% progress
      return totalPaid * 0.75;
    } else if (progressPercentage <= 50) {
      // 50% refund up to 50% progress  
      return totalPaid * 0.5;
    } else if (progressPercentage <= 75) {
      // 25% refund up to 75% progress
      return totalPaid * 0.25;
    } else {
      // No refund after 75% progress
      return 0;
    }
  }

  /**
   * 👨‍🏫 CALCULATE EXPERT PAYOUT IMPACT
   */
  async calculateExpertPayoutImpact(enrollment, progress) {
    const expert = await this.prisma.expert.findUnique({
      where: { id: enrollment.expertId },
      select: { currentTier: true, qualityScore: true }
    });

    const baseEarning = 999; // Base expert earning per student
    const completedPayouts = await this.getCompletedExpertPayouts(enrollment.id);

    let impact = {
      completedPayouts,
      pendingPayouts: 0,
      bonusImpact: 0,
      tierImpact: false
    };

    // Calculate pending payouts based on progress
    if (progress.progressPercentage < 33) {
      impact.pendingPayouts = baseEarning - completedPayouts;
    } else if (progress.progressPercentage < 66) {
      impact.pendingPayouts = (baseEarning * 0.66) - completedPayouts;
    } else {
      impact.pendingPayouts = (baseEarning * 0.33) - completedPayouts;
    }

    // Adjust for tier bonuses
    if (expert.currentTier === 'MASTER') {
      impact.bonusImpact = baseEarning * 0.2;
    } else if (expert.currentTier === 'SENIOR') {
      impact.bonusImpact = baseEarning * 0.1;
    }

    return impact;
  }

  /**
   * 🛡️ ANALYZE QUALITY IMPACT
   */
  async analyzeQualityImpact(enrollment, reason, initiatedBy) {
    const qualityMetrics = {
      score: 5.0, // Default high score
      triggers: [],
      recommendations: []
    };

    // Expert-related cancellations impact quality score
    if (this.cancellationReasons.EXPERT_RELATED.includes(reason)) {
      qualityMetrics.score -= 1.5;
      qualityMetrics.triggers.push('EXPERT_PERFORMANCE_ISSUE');
      qualityMetrics.recommendations.push('REVIEW_EXPERT_QUALITY_METRICS');
    }

    // Multiple cancellations from same expert
    const expertCancellations = await this.getExpertCancellationHistory(enrollment.expertId);
    if (expertCancellations.recentCount > 2) {
      qualityMetrics.score -= 0.5;
      qualityMetrics.triggers.push('HIGH_EXPERT_CANCELLATION_RATE');
      qualityMetrics.recommendations.push('CONSIDER_EXPERT_TIER_ADJUSTMENT');
    }

    // Student pattern analysis
    const studentCancellations = await this.getStudentCancellationHistory(enrollment.studentId);
    if (studentCancellations.total > 3) {
      qualityMetrics.triggers.push('FREQUENT_STUDENT_CANCELLATIONS');
      qualityMetrics.recommendations.push('REVIEW_STUDENT_ONBOARDING_PROCESS');
    }

    qualityMetrics.score = Math.max(1.0, qualityMetrics.score); // Minimum score 1.0

    return qualityMetrics;
  }

  /**
   * 🔄 AUTO-REMEDIATION DECISION ENGINE
   */
  shouldTriggerAutoRemediation(analysis, cancellationData) {
    const { reason, initiatedBy } = cancellationData;
    const { qualityImpact, enrollmentProgress } = analysis;

    // Auto-remediation triggers
    const triggers = [
      // Quality guarantee triggers
      qualityImpact.score < 3.0,
      qualityImpact.triggers.includes('EXPERT_PERFORMANCE_ISSUE'),
      
      // Student protection triggers
      enrollmentProgress.progressPercentage > 10 && reason === 'QUALITY_ISSUES',
      
      // System-initiated quality enforcement
      initiatedBy === 'SYSTEM' && cancellationData.systemTrigger === 'QUALITY_GUARANTEE'
    ];

    return triggers.some(trigger => trigger === true);
  }

  /**
   * 🎯 DETERMINE AUTO-REMEDIATION TYPE
   */
  determineAutoRemediationType(analysis, cancellationData) {
    const { enrollmentProgress, qualityImpact } = analysis;
    const { reason } = cancellationData;

    if (qualityImpact.score < 3.0 || reason === 'QUALITY_ISSUES') {
      if (enrollmentProgress.progressPercentage < 75) {
        return 'AUTO_EXPERT_SWITCH';
      }
    }

    if (enrollmentProgress.progressPercentage < 25 && analysis.financialImpact.refundAmount > 0) {
      return 'AUTO_REFUND_PROCESSING';
    }

    return 'QUALITY_REVIEW_REQUIRED';
  }

  /**
   * 💾 PROCESS CANCELLATION TRANSACTION
   */
  async processCancellationTransaction(cancellationData, analysis, transactionId) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create cancellation record
      const cancellationRecord = await tx.cancellation.create({
        data: {
          enrollmentId: cancellationData.enrollmentId,
          initiatedBy: cancellationData.initiatedBy,
          reason: cancellationData.reason,
          explanation: cancellationData.explanation,
          progressPercentage: analysis.enrollmentProgress.progressPercentage,
          refundAmount: analysis.financialImpact.refundAmount,
          qualityImpactScore: analysis.qualityImpact.score,
          status: 'PROCESSING',
          transactionId,
          metadata: {
            analysis,
            systemTrigger: cancellationData.systemTrigger,
            adminId: cancellationData.adminId,
            ipAddress: cancellationData.ipAddress,
            userAgent: cancellationData.userAgent
          }
        }
      });

      // 2. Update enrollment status
      await tx.enrollment.update({
        where: { id: cancellationData.enrollmentId },
        data: {
          status: 'CANCELLED',
          cancellationId: cancellationRecord.id,
          cancelledAt: new Date()
        }
      });

      // 3. Process financial adjustments
      const financialResult = await this.processFinancialAdjustments(
        cancellationData.enrollmentId, 
        analysis.financialImpact, 
        tx
      );

      // 4. Update quality metrics
      await this.updateQualityMetrics(cancellationData, analysis, tx);

      // 5. Handle session cancellations
      await this.cancelPendingSessions(cancellationData.enrollmentId, tx);

      return {
        cancellationRecord,
        financialResult,
        analysis,
        cancellationType: this.determineCancellationType(cancellationData, analysis),
        autoRemediation: {
          required: analysis.requiresAutoRemediation,
          type: analysis.autoRemediationType
        },
        nextSteps: this.generateNextSteps(cancellationData, analysis)
      };
    }, {
      maxWait: 10000,
      timeout: 30000
    });
  }

  /**
   * 🔄 EXECUTE AUTO-REMEDIATION
   */
  async executeAutoRemediation(cancellationResult) {
    const { autoRemediation, cancellationRecord, analysis } = cancellationResult;

    if (!autoRemediation.required) return;

    try {
      switch (autoRemediation.type) {
        case 'AUTO_EXPERT_SWITCH':
          await this.executeAutoExpertSwitch(cancellationRecord, analysis);
          break;

        case 'AUTO_REFUND_PROCESSING':
          await this.initiateAutomaticRefund(cancellationRecord, analysis);
          break;

        case 'QUALITY_REVIEW_REQUIRED':
          await this.triggerQualityReview(cancellationRecord, analysis);
          break;
      }

      this.logger.info('Auto-remediation executed successfully', {
        cancellationId: cancellationRecord.id,
        remediationType: autoRemediation.type
      });

    } catch (error) {
      this.logger.error('Auto-remediation execution failed', error, {
        cancellationId: cancellationRecord.id,
        remediationType: autoRemediation.type
      });

      // Don't throw error - remediation failure shouldn't break cancellation
    }
  }

  /**
   * 🔀 EXECUTE AUTO-EXPERT SWITCH
   */
  async executeAutoExpertSwitch(cancellationRecord, analysis) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: cancellationRecord.enrollmentId },
      include: { student: true, course: true }
    });

    // Find replacement expert with better quality metrics
    const replacementExpert = await this.findReplacementExpert(
      enrollment.course.skillId,
      enrollment.expertId, // Exclude current expert
      analysis.qualityImpact.score
    );

    if (replacementExpert) {
      // Create new enrollment with replacement expert
      const newEnrollment = await this.prisma.enrollment.create({
        data: {
          studentId: enrollment.studentId,
          expertId: replacementExpert.id,
          courseId: enrollment.courseId,
          status: 'ACTIVE',
          previousEnrollmentId: enrollment.id,
          progressData: {
            transferredFrom: enrollment.id,
            preservedProgress: analysis.enrollmentProgress.progressPercentage,
            transferredAt: new Date()
          }
        }
      });

      this.emit('expertAutoSwitched', {
        originalEnrollmentId: enrollment.id,
        newEnrollmentId: newEnrollment.id,
        originalExpertId: enrollment.expertId,
        newExpertId: replacementExpert.id,
        progressPreserved: analysis.enrollmentProgress.progressPercentage
      });

      this.logger.info('Auto expert switch completed', {
        originalEnrollmentId: enrollment.id,
        newEnrollmentId: newEnrollment.id,
        studentId: enrollment.studentId
      });
    }
  }

  /**
   * 🔍 FIND REPLACEMENT EXPERT
   */
  async findReplacementExpert(skillId, excludeExpertId, minQualityScore) {
    return await this.prisma.expert.findFirst({
      where: {
        skills: {
          some: { id: skillId }
        },
        id: { not: excludeExpertId },
        status: 'ACTIVE',
        currentTier: { in: ['MASTER', 'SENIOR'] },
        qualityScore: { gte: minQualityScore + 1.0 }, // Better quality than previous
        capacity: { gt: 0 }
      },
      orderBy: [
        { qualityScore: 'desc' },
        { currentTier: 'desc' }
      ]
    });
  }

  /**
   * 📊 UPDATE CANCELLATION METRICS
   */
  async updateCancellationMetrics(cancellationResult) {
    const { cancellationRecord, analysis } = cancellationResult;

    const metricsKey = `cancellation:metrics:${cancellationRecord.id}`;
    const pipeline = this.redis.pipeline();

    // Store cancellation metrics
    pipeline.hset(metricsKey, {
      enrollmentId: cancellationRecord.enrollmentId,
      progressPercentage: analysis.enrollmentProgress.progressPercentage,
      refundAmount: analysis.financialImpact.refundAmount,
      qualityImpact: analysis.qualityImpact.score,
      timestamp: Date.now()
    });

    pipeline.expire(metricsKey, 86400); // 24 hours TTL

    // Update real-time dashboard metrics
    pipeline.hincrby('platform:metrics:daily', 'cancellations', 1);
    pipeline.zincrby('expert:cancellations', 1, cancellationResult.analysis.expertImpact.expertId);

    await pipeline.exec();

    this.logger.debug('Cancellation metrics updated', {
      cancellationId: cancellationRecord.id,
      metricsKey
    });
  }

  /**
   * 🗃️ HELPER METHODS
   */

  async getCompletedExpertPayouts(enrollmentId) {
    const payouts = await this.prisma.payout.findMany({
      where: {
        enrollmentId,
        status: 'COMPLETED'
      },
      select: { amount: true }
    });

    return payouts.reduce((sum, payout) => sum + payout.amount, 0);
  }

  async getExpertCancellationHistory(expertId) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const cancellations = await this.prisma.cancellation.findMany({
      where: {
        enrollment: { expertId },
        createdAt: { gte: ninetyDaysAgo },
        reason: { in: this.cancellationReasons.EXPERT_RELATED }
      },
      select: { id: true, createdAt: true, reason: true }
    });

    return {
      total: cancellations.length,
      recentCount: cancellations.filter(c => 
        Date.now() - c.createdAt < 30 * 24 * 60 * 60 * 1000
      ).length,
      reasons: cancellations.reduce((acc, curr) => {
        acc[curr.reason] = (acc[curr.reason] || 0) + 1;
        return acc;
      }, {})
    };
  }

  async getStudentCancellationHistory(studentId) {
    const cancellations = await this.prisma.cancellation.findMany({
      where: {
        enrollment: { studentId }
      },
      select: { id: true, createdAt: true, reason: true }
    });

    return {
      total: cancellations.length,
      recent: cancellations.filter(c =>
        Date.now() - c.createdAt < 90 * 24 * 60 * 60 * 1000  
      ).length
    };
  }

  isValidCancellationReason(reason, initiatedBy) {
    const validReasons = [
      ...this.cancellationReasons.STUDENT_INITIATED,
      ...this.cancellationReasons.EXPERT_RELATED,
      ...this.cancellationReasons.PLATFORM_RELATED
    ];

    return validReasons.includes(reason);
  }

  determineCancellationType(cancellationData, analysis) {
    if (cancellationData.initiatedBy === 'SYSTEM') return 'SYSTEM_ENFORCED';
    if (analysis.qualityImpact.score < 3.0) return 'QUALITY_RELATED';
    if (analysis.financialImpact.refundAmount > 0) return 'FINANCIAL_CANCELLATION';
    return 'STANDARD_CANCELLATION';
  }

  generateNextSteps(cancellationData, analysis) {
    const steps = [];

    if (analysis.financialImpact.refundAmount > 0) {
      steps.push('REFUND_PROCESSING');
    }

    if (analysis.requiresAutoRemediation) {
      steps.push('AUTO_REMEDIATION_EXECUTION');
    }

    if (analysis.qualityImpact.triggers.length > 0) {
      steps.push('QUALITY_REVIEW_SCHEDULED');
    }

    steps.push('STUDENT_NOTIFICATION');
    steps.push('EXPERT_NOTIFICATION');

    return steps;
  }

  async loadCancellationPolicies() {
    // Load cancellation policies from configuration
    const policies = {
      refundThresholds: {
        fullRefund: 10,
        partialRefund: 50,
        noRefund: 75
      },
      qualityThresholds: {
        autoSwitch: 3.0,
        reviewRequired: 3.5
      },
      limits: {
        studentMonthlyCancellations: 2,
        expertMonthlyCancellations: 5
      }
    };

    await this.redis.set('cancellation:policies', JSON.stringify(policies));
    this.logger.debug('Cancellation policies loaded', { policies });
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Cancellation manager resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new CancellationManager();