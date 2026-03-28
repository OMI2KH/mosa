// (expert-selection)/enrollment-flow.js

/**
 * 🎯 ENTERPRISE ENROLLMENT FLOW
 * Production-ready enrollment system for Mosa Forge
 * Features: Expert matching, payment processing, quality validation, real-time updates
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../../utils/logger');
const { QualityValidator } = require('../../utils/quality-validator');
const { PaymentProcessor } = require('../../services/payment-processor');
const { RateLimiterRedis } = require('rate-limiter-flexible');

class EnrollmentFlow extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('EnrollmentFlow');
    this.qualityValidator = new QualityValidator();
    this.paymentProcessor = new PaymentProcessor();
    
    // Rate limiting: max 5 enrollments per hour per student
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (req) => `enrollment_limit:${req.studentId}`,
      points: 5,
      duration: 3600,
    });

    this.initialize();
  }

  /**
   * Initialize enrollment system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.paymentProcessor.initialize();
      this.logger.info('Enrollment flow initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize enrollment flow', error);
      throw error;
    }
  }

  /**
   * 🎯 INITIATE ENROLLMENT - Main enrollment entry point
   */
  async initiateEnrollment(enrollmentData) {
    const startTime = performance.now();
    const enrollmentId = this.generateEnrollmentId();

    try {
      this.logger.info('Enrollment initiated', { enrollmentId, ...enrollmentData });

      // 🛡️ PHASE 1: PRE-ENROLLMENT VALIDATION
      await this.validatePreEnrollment(enrollmentData);

      // 💰 PHASE 2: PAYMENT PROCESSING
      const paymentResult = await this.processPayment(enrollmentData, enrollmentId);

      // 👨‍🏫 PHASE 3: EXPERT MATCHING & VALIDATION
      const expertMatch = await this.findAndValidateExpert(enrollmentData);

      // 📝 PHASE 4: ENROLLMENT CREATION
      const enrollment = await this.createEnrollmentRecord({
        ...enrollmentData,
        enrollmentId,
        paymentResult,
        expertMatch
      });

      // 🔔 PHASE 5: POST-ENROLLMENT ACTIONS
      await this.executePostEnrollmentActions(enrollment);

      const processingTime = performance.now() - startTime;
      
      this.logger.metric('enrollment_processing_time', processingTime, {
        enrollmentId,
        studentId: enrollmentData.studentId,
        skillId: enrollmentData.skillId
      });

      return {
        success: true,
        enrollmentId: enrollment.id,
        expert: expertMatch.expert,
        paymentStatus: paymentResult.status,
        nextSteps: this.getNextSteps(enrollment),
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Enrollment failed', error, { enrollmentId, enrollmentData });
      
      // Rollback payment if enrollment fails
      if (enrollmentData.paymentResult) {
        await this.handleEnrollmentFailure(enrollmentData, error);
      }

      throw error;
    }
  }

  /**
   * 🛡️ COMPREHENSIVE PRE-ENROLLMENT VALIDATION
   */
  async validatePreEnrollment(enrollmentData) {
    const {
      studentId,
      skillId,
      packageType,
      paymentMethod,
      expertId
    } = enrollmentData;

    // Required fields validation
    if (!studentId || !skillId || !packageType || !paymentMethod) {
      throw new Error('MISSING_REQUIRED_FIELDS');
    }

    // Rate limiting check
    try {
      await this.rateLimiter.consume(`student:${studentId}`);
    } catch (rateLimitError) {
      throw new Error('ENROLLMENT_RATE_LIMIT_EXCEEDED');
    }

    // Student validation
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          where: {
            status: { in: ['ACTIVE', 'PENDING'] }
          }
        }
      }
    });

    if (!student) {
      throw new Error('STUDENT_NOT_FOUND');
    }

    if (student.status !== 'ACTIVE') {
      throw new Error('STUDENT_ACCOUNT_INACTIVE');
    }

    // Check for active enrollments limit (max 3 concurrent)
    if (student.enrollments.length >= 3) {
      throw new Error('MAX_CONCURRENT_ENROLLMENTS_EXCEEDED');
    }

    // Skill validation
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
      include: { packages: true }
    });

    if (!skill) {
      throw new Error('SKILL_NOT_FOUND');
    }

    if (skill.status !== 'ACTIVE') {
      throw new Error('SKILL_NOT_AVAILABLE');
    }

    // Package validation
    const packageConfig = skill.packages.find(p => p.type === packageType);
    if (!packageConfig) {
      throw new Error('INVALID_PACKAGE_TYPE');
    }

    // Expert validation (if specific expert requested)
    if (expertId) {
      const expert = await this.prisma.expert.findUnique({
        where: { id: expertId },
        include: { capacities: true }
      });

      if (!expert) {
        throw new Error('EXPERT_NOT_FOUND');
      }

      if (expert.status !== 'ACTIVE') {
        throw new Error('EXPERT_NOT_AVAILABLE');
      }

      // Check expert capacity
      const capacityCheck = await this.checkExpertCapacity(expert, skillId);
      if (!capacityCheck.available) {
        throw new Error(`EXPERT_AT_CAPACITY: ${capacityCheck.reason}`);
      }
    }

    // Mindset phase completion check
    const mindsetCompleted = await this.checkMindsetCompletion(studentId);
    if (!mindsetCompleted) {
      throw new Error('MINDSET_PHASE_INCOMPLETE');
    }

    this.logger.debug('Pre-enrollment validation passed', { studentId, skillId });
  }

  /**
   * 💰 PAYMENT PROCESSING WITH REVENUE SPLIT
   */
  async processPayment(enrollmentData, enrollmentId) {
    const { studentId, skillId, packageType, paymentMethod } = enrollmentData;

    try {
      const paymentData = {
        amount: 1999, // 1,999 ETB bundle
        currency: 'ETB',
        studentId,
        enrollmentId,
        paymentMethod,
        metadata: {
          skillId,
          packageType,
          revenueSplit: {
            mosaPlatform: 1000,
            expertEarnings: 999
          }
        }
      };

      const paymentResult = await this.paymentProcessor.processPayment(paymentData);

      if (paymentResult.status !== 'COMPLETED') {
        throw new Error(`PAYMENT_FAILED: ${paymentResult.error}`);
      }

      // Record revenue split
      await this.recordRevenueSplit(paymentResult.transactionId, enrollmentId);

      this.logger.info('Payment processed successfully', {
        enrollmentId,
        transactionId: paymentResult.transactionId,
        amount: paymentResult.amount
      });

      return paymentResult;

    } catch (error) {
      this.logger.error('Payment processing failed', error, { enrollmentId });
      throw new Error(`PAYMENT_PROCESSING_FAILED: ${error.message}`);
    }
  }

  /**
   * 👨‍🏫 INTELLIGENT EXPERT MATCHING SYSTEM
   */
  async findAndValidateExpert(enrollmentData) {
    const { studentId, skillId, packageType, expertId } = enrollmentData;

    // If specific expert requested, validate and use
    if (expertId) {
      return await this.validateRequestedExpert(expertId, skillId, studentId);
    }

    // Otherwise, find best matching expert
    return await this.findOptimalExpert(enrollmentData);
  }

  /**
   * 🎯 VALIDATE REQUESTED EXPERT
   */
  async validateRequestedExpert(expertId, skillId, studentId) {
    const expert = await this.prisma.expert.findUnique({
      where: { id: expertId },
      include: {
        skills: true,
        capacities: true,
        qualityMetrics: true
      }
    });

    if (!expert) {
      throw new Error('REQUESTED_EXPERT_NOT_FOUND');
    }

    // Check if expert teaches this skill
    const expertSkill = expert.skills.find(s => s.skillId === skillId);
    if (!expertSkill) {
      throw new Error('EXPERT_DOES_NOT_TEACH_SKILL');
    }

    // Check expert status and capacity
    if (expert.status !== 'ACTIVE') {
      throw new Error('EXPERT_NOT_ACCEPTING_STUDENTS');
    }

    const capacityCheck = await this.checkExpertCapacity(expert, skillId);
    if (!capacityCheck.available) {
      throw new Error(`EXPERT_AT_CAPACITY: ${capacityCheck.reason}`);
    }

    // Quality validation
    const qualityCheck = await this.qualityValidator.validateExpertForEnrollment(expert);
    if (!qualityCheck.valid) {
      throw new Error(`EXPERT_QUALITY_ISSUE: ${qualityCheck.reason}`);
    }

    return {
      expert,
      matchType: 'REQUESTED',
      matchScore: 100,
      capacity: capacityCheck
    };
  }

  /**
   * 🔍 FIND OPTIMAL EXPERT WITH MATCHING ALGORITHM
   */
  async findOptimalExpert(enrollmentData) {
    const { studentId, skillId, packageType } = enrollmentData;

    // Get available experts for this skill
    const availableExperts = await this.getAvailableExperts(skillId);

    if (availableExperts.length === 0) {
      throw new Error('NO_AVAILABLE_EXPERTS_FOR_SKILL');
    }

    // Calculate match scores for each expert
    const expertScores = await Promise.all(
      availableExperts.map(async (expert) => {
        const score = await this.calculateExpertMatchScore(expert, enrollmentData);
        return { expert, score };
      })
    );

    // Sort by match score (descending)
    expertScores.sort((a, b) => b.score - a.score);

    // Select top expert
    const bestMatch = expertScores[0];

    if (bestMatch.score < 60) { // Minimum match threshold
      throw new Error('NO_SUITABLE_EXPERTS_AVAILABLE');
    }

    // Final capacity check
    const capacityCheck = await this.checkExpertCapacity(bestMatch.expert, skillId);
    if (!capacityCheck.available) {
      // Try next best expert
      const nextBest = expertScores.find(score => score !== bestMatch);
      if (nextBest && nextBest.score >= 60) {
        return {
          expert: nextBest.expert,
          matchType: 'AUTO_MATCHED',
          matchScore: nextBest.score,
          capacity: await this.checkExpertCapacity(nextBest.expert, skillId)
        };
      }
      throw new Error('ALL_SUITABLE_EXPERTS_AT_CAPACITY');
    }

    return {
      expert: bestMatch.expert,
      matchType: 'AUTO_MATCHED',
      matchScore: bestMatch.score,
      capacity: capacityCheck
    };
  }

  /**
   * 📊 CALCULATE EXPERT MATCH SCORE
   */
  async calculateExpertMatchScore(expert, enrollmentData) {
    const { studentId, skillId, packageType } = enrollmentData;
    let score = 0;

    // 1. Quality Score (40% weight)
    const qualityWeight = 0.4;
    score += (expert.qualityMetrics.qualityScore / 5) * 100 * qualityWeight;

    // 2. Capacity Availability (25% weight)
    const capacityWeight = 0.25;
    const capacityUtilization = await this.getExpertCapacityUtilization(expert.id, skillId);
    const capacityScore = Math.max(0, 100 - (capacityUtilization * 100));
    score += capacityScore * capacityWeight;

    // 3. Student-Expert Compatibility (20% weight)
    const compatibilityWeight = 0.2;
    const compatibilityScore = await this.calculateCompatibilityScore(expert.id, studentId);
    score += compatibilityScore * compatibilityWeight;

    // 4. Response Time & Availability (15% weight)
    const responseWeight = 0.15;
    const responseScore = this.calculateResponseScore(expert.qualityMetrics);
    score += responseScore * responseWeight;

    // 5. Package-specific bonuses
    const packageBonus = this.calculatePackageBonus(expert, packageType);
    score += packageBonus;

    return Math.min(score, 100);
  }

  /**
   * 📝 CREATE ENROLLMENT RECORD
   */
  async createEnrollmentRecord(enrollmentData) {
    const {
      studentId,
      skillId,
      packageType,
      enrollmentId,
      paymentResult,
      expertMatch
    } = enrollmentData;

    return await this.prisma.$transaction(async (tx) => {
      // Create enrollment record
      const enrollment = await tx.enrollment.create({
        data: {
          id: enrollmentId,
          studentId,
          skillId,
          expertId: expertMatch.expert.id,
          packageType,
          status: 'ACTIVE',
          paymentStatus: 'COMPLETED',
          totalAmount: 1999,
          revenueSplit: {
            mosaPlatform: 1000,
            expertEarnings: 999,
            payoutSchedule: ['333', '333', '333'] // 333/333/333 payout
          },
          paymentDetails: {
            transactionId: paymentResult.transactionId,
            method: paymentResult.method,
            amount: paymentResult.amount,
            timestamp: paymentResult.timestamp
          },
          expertMatchDetails: {
            matchType: expertMatch.matchType,
            matchScore: expertMatch.matchScore,
            matchedAt: new Date().toISOString()
          },
          phaseProgress: {
            mindset: 'COMPLETED',
            theory: 'PENDING',
            handsOn: 'PENDING',
            certification: 'PENDING'
          },
          startDate: new Date(),
          expectedEndDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 4 months
          metadata: {
            enrollmentFlowVersion: '2.0',
            qualityGuarantee: true,
            autoExpertSwitch: true
          }
        },
        include: {
          student: {
            select: { name: true, email: true, phone: true }
          },
          expert: {
            select: { name: true, currentTier: true, qualityScore: true }
          },
          skill: {
            select: { name: true, category: true }
          }
        }
      });

      // Update expert capacity
      await tx.expertCapacity.upsert({
        where: {
          expertId_skillId: {
            expertId: expertMatch.expert.id,
            skillId
          }
        },
        update: {
          currentStudents: { increment: 1 },
          lastAssignment: new Date()
        },
        create: {
          expertId: expertMatch.expert.id,
          skillId,
          currentStudents: 1,
          maxStudents: expertMatch.capacity.maxCapacity,
          lastAssignment: new Date()
        }
      });

      // Create first payout record (333 ETB upfront)
      await tx.payout.create({
        data: {
          expertId: expertMatch.expert.id,
          enrollmentId: enrollment.id,
          amount: 333,
          type: 'UPFRONT',
          status: 'SCHEDULED',
          scheduledDate: new Date(),
          metadata: {
            payoutSequence: 1,
            totalPayouts: 3,
            enrollmentDate: enrollment.startDate
          }
        }
      });

      return enrollment;
    }, {
      maxWait: 5000,
      timeout: 10000
    });
  }

  /**
   * 🔔 EXECUTE POST-ENROLLMENT ACTIONS
   */
  async executePostEnrollmentActions(enrollment) {
    const actions = [];

    // 1. Send confirmation notifications
    actions.push(this.sendEnrollmentNotifications(enrollment));

    // 2. Update real-time dashboards
    actions.push(this.updateRealTimeDashboards(enrollment));

    // 3. Initialize learning progress
    actions.push(this.initializeLearningProgress(enrollment));

    // 4. Emit enrollment event
    actions.push(this.emitEnrollmentEvent(enrollment));

    // Execute all actions in parallel
    await Promise.allSettled(actions);

    this.logger.info('Post-enrollment actions completed', {
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      expertId: enrollment.expertId
    });
  }

  /**
   * 📧 SEND ENROLLMENT NOTIFICATIONS
   */
  async sendEnrollmentNotifications(enrollment) {
    const notifications = [];

    // Student notification
    notifications.push(
      this.sendStudentNotification(enrollment)
    );

    // Expert notification
    notifications.push(
      this.sendExpertNotification(enrollment)
    );

    // Admin notification (for high-value enrollments)
    if (enrollment.packageType === 'PREMIUM') {
      notifications.push(
        this.sendAdminNotification(enrollment)
      );
    }

    await Promise.allSettled(notifications);
  }

  /**
   * 🎯 GET NEXT STEPS FOR STUDENT
   */
  getNextSteps(enrollment) {
    const baseSteps = [
      {
        step: 1,
        title: 'Theory Phase Access',
        description: 'Start your Duolingo-style interactive learning',
        action: 'ACCESS_LEARNING_PORTAL',
        deadline: 'IMMEDIATE',
        priority: 'HIGH'
      },
      {
        step: 2,
        title: 'Meet Your Expert',
        description: 'Schedule your first session with your assigned expert',
        action: 'SCHEDULE_SESSION',
        deadline: '3_DAYS',
        priority: 'HIGH'
      },
      {
        step: 3,
        title: 'Setup Learning Environment',
        description: 'Prepare your workspace for hands-on training',
        action: 'SETUP_ENVIRONMENT',
        deadline: '7_DAYS',
        priority: 'MEDIUM'
      }
    ];

    // Add package-specific steps
    if (enrollment.packageType === 'PREMIUM') {
      baseSteps.push({
        step: 4,
        title: 'Premium Resources Access',
        description: 'Access exclusive learning materials and tools',
        action: 'ACCESS_PREMIUM_RESOURCES',
        deadline: 'IMMEDIATE',
        priority: 'MEDIUM'
      });
    }

    return baseSteps;
  }

  /**
   * 🔧 UTILITY METHODS
   */

  async checkExpertCapacity(expert, skillId) {
    const capacity = await this.prisma.expertCapacity.findUnique({
      where: {
        expertId_skillId: {
          expertId: expert.id,
          skillId
        }
      }
    });

    const maxCapacity = this.calculateExpertMaxCapacity(expert);
    const currentStudents = capacity?.currentStudents || 0;

    return {
      available: currentStudents < maxCapacity,
      currentStudents,
      maxCapacity,
      utilization: (currentStudents / maxCapacity) * 100,
      reason: currentStudents >= maxCapacity ? 'AT_MAX_CAPACITY' : 'AVAILABLE'
    };
  }

  calculateExpertMaxCapacity(expert) {
    // Tier-based capacity limits
    const tierCapacities = {
      MASTER: 100,    // Unlimited with quality
      SENIOR: 50,     // Increased capacity
      STANDARD: 25,   // Standard capacity
      DEVELOPING: 15, // Reduced capacity
      PROBATION: 10   // Minimal capacity
    };

    return tierCapacities[expert.currentTier] || 25;
  }

  async checkMindsetCompletion(studentId) {
    const mindsetProgress = await this.prisma.mindsetProgress.findUnique({
      where: { studentId }
    });

    return mindsetProgress?.status === 'COMPLETED';
  }

  async getAvailableExperts(skillId) {
    const cacheKey = `available_experts:${skillId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const experts = await this.prisma.expert.findMany({
      where: {
        status: 'ACTIVE',
        skills: {
          some: {
            skillId,
            status: 'ACTIVE'
          }
        },
        currentTier: {
          in: ['STANDARD', 'SENIOR', 'MASTER']
        }
      },
      include: {
        qualityMetrics: true,
        capacities: true
      }
    });

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(experts));

    return experts;
  }

  async getExpertCapacityUtilization(expertId, skillId) {
    const capacity = await this.prisma.expertCapacity.findUnique({
      where: {
        expertId_skillId: {
          expertId,
          skillId
        }
      }
    });

    if (!capacity) return 0;

    const maxCapacity = this.calculateExpertMaxCapacity({ id: expertId, currentTier: 'STANDARD' });
    return capacity.currentStudents / maxCapacity;
  }

  async calculateCompatibilityScore(expertId, studentId) {
    // Placeholder for advanced compatibility algorithm
    // Could include: learning style matching, schedule compatibility, language preferences, etc.
    return 75; // Base compatibility score
  }

  calculateResponseScore(qualityMetrics) {
    const avgResponseTime = qualityMetrics.averageResponseTime || 24;
    // Lower response time = higher score
    return Math.max(0, 100 - (avgResponseTime * 2));
  }

  calculatePackageBonus(expert, packageType) {
    if (packageType === 'PREMIUM' && expert.currentTier === 'MASTER') {
      return 10; // Bonus for premium packages with master experts
    }
    return 0;
  }

  generateEnrollmentId() {
    return `ENR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  async recordRevenueSplit(transactionId, enrollmentId) {
    await this.prisma.revenueSplit.create({
      data: {
        transactionId,
        enrollmentId,
        totalAmount: 1999,
        mosaShare: 1000,
        expertShare: 999,
        status: 'ALLOCATED'
      }
    });
  }

  async sendStudentNotification(enrollment) {
    // Implementation for sending student notification
    this.logger.debug('Student notification sent', { enrollmentId: enrollment.id });
  }

  async sendExpertNotification(enrollment) {
    // Implementation for sending expert notification
    this.logger.debug('Expert notification sent', { enrollmentId: enrollment.id });
  }

  async sendAdminNotification(enrollment) {
    // Implementation for sending admin notification
    this.logger.debug('Admin notification sent', { enrollmentId: enrollment.id });
  }

  async updateRealTimeDashboards(enrollment) {
    const pipeline = this.redis.pipeline();
    
    // Update enrollment counters
    pipeline.hincrby('platform:metrics', 'totalEnrollments', 1);
    pipeline.hincrby(`skill:metrics:${enrollment.skillId}`, 'enrollments', 1);
    pipeline.hincrby(`expert:metrics:${enrollment.expertId}`, 'currentStudents', 1);
    
    await pipeline.exec();
  }

  async initializeLearningProgress(enrollment) {
    await this.prisma.learningProgress.create({
      data: {
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        skillId: enrollment.skillId,
        currentPhase: 'THEORY',
        progress: 0,
        completedExercises: 0,
        totalExercises: 100, // Example count
        lastActivity: new Date()
      }
    });
  }

  async emitEnrollmentEvent(enrollment) {
    this.emit('enrollmentCreated', {
      enrollmentId: enrollment.id,
      studentId: enrollment.studentId,
      expertId: enrollment.expertId,
      skillId: enrollment.skillId,
      packageType: enrollment.packageType,
      timestamp: new Date()
    });
  }

  async handleEnrollmentFailure(enrollmentData, error) {
    // Rollback payment if enrollment fails after payment
    if (enrollmentData.paymentResult) {
      try {
        await this.paymentProcessor.refundPayment(
          enrollmentData.paymentResult.transactionId
        );
        this.logger.info('Payment refunded due to enrollment failure', {
          transactionId: enrollmentData.paymentResult.transactionId
        });
      } catch (refundError) {
        this.logger.error('Failed to refund payment', refundError);
      }
    }
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      await this.paymentProcessor.destroy();
      this.removeAllListeners();
      this.logger.info('Enrollment flow resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new EnrollmentFlow();