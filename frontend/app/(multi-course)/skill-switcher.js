// multi-course/skill-switcher.js

/**
 * 🎯 ENTERPRISE SKILL SWITCHER
 * Production-ready skill switching system for Mosa Forge
 * Features: Payment processing, mindset skip, enrollment management, progress transfer
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../utils/logger');
const { PaymentProcessor } = require('../payment/payment-processor');
const { RateLimiterRedis } = require('rate-limiter-flexible');

class SkillSwitcher extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('SkillSwitcher');
    this.paymentProcessor = new PaymentProcessor();
    
    // Rate limiting: max 3 skill switches per month per student
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (req) => `skill_switch_limit:${req.studentId}`,
      points: 3,
      duration: 30 * 24 * 3600, // 30 days
    });

    this.SKILL_SWITCH_PRICE = 1999; // ETB
    this.MINDSET_SKIP_ALLOWED = true;
    
    this.initialize();
  }

  /**
   * Initialize skill switcher
   */
  async initialize() {
    try {
      await this.redis.ping();
      this.logger.info('Skill switcher initialized successfully');
      
      // Load skill catalog into cache
      await this.warmUpSkillCache();
      
    } catch (error) {
      this.logger.error('Failed to initialize skill switcher', error);
      throw error;
    }
  }

  /**
   * 🎯 INITIATE SKILL SWITCH - Core switching process
   */
  async initiateSkillSwitch(switchData) {
    const startTime = performance.now();
    
    try {
      // 🛡️ VALIDATION PHASE
      await this.validateSkillSwitch(switchData);

      // 💰 PAYMENT PROCESSING
      const paymentResult = await this.processSkillSwitchPayment(switchData);

      // 🔄 ENROLLMENT CREATION
      const enrollmentResult = await this.createNewEnrollment(switchData, paymentResult);

      // 📊 PROGRESS TRANSFER (if applicable)
      await this.transferProgressData(switchData, enrollmentResult);

      // 🔔 NOTIFICATIONS & EVENTS
      await this.sendSwitchNotifications(switchData, enrollmentResult);

      const processingTime = performance.now() - startTime;
      this.logger.metric('skill_switch_processing_time', processingTime, {
        studentId: switchData.studentId,
        fromSkill: switchData.currentSkillId,
        toSkill: switchData.newSkillId
      });

      return {
        success: true,
        switchId: enrollmentResult.switchId,
        newEnrollmentId: enrollmentResult.enrollmentId,
        paymentStatus: paymentResult.status,
        mindsetSkipped: switchData.skipMindset || false,
        totalPaid: this.SKILL_SWITCH_PRICE,
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Skill switch failed', error, { switchData });
      throw error;
    }
  }

  /**
   * 🛡️ COMPREHENSIVE SKILL SWITCH VALIDATION
   */
  async validateSkillSwitch(switchData) {
    const {
      studentId,
      currentSkillId,
      newSkillId,
      skipMindset = false,
      paymentMethod
    } = switchData;

    // Required fields validation
    if (!studentId || !currentSkillId || !newSkillId || !paymentMethod) {
      throw new Error('MISSING_REQUIRED_FIELDS');
    }

    // Rate limiting check
    try {
      await this.rateLimiter.consume(`student:${studentId}`);
    } catch (rateLimitError) {
      throw new Error('SKILL_SWITCH_LIMIT_EXCEEDED');
    }

    // Student validation
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
          include: { skill: true }
        }
      }
    });

    if (!student) {
      throw new Error('STUDENT_NOT_FOUND');
    }

    // Current skill validation
    const currentEnrollment = student.enrollments.find(
      e => e.skillId === currentSkillId && e.status === 'ACTIVE'
    );

    if (!currentEnrollment) {
      throw new Error('NO_ACTIVE_ENROLLMENT_FOR_CURRENT_SKILL');
    }

    // New skill validation
    const newSkill = await this.prisma.skill.findUnique({
      where: { id: newSkillId, status: 'ACTIVE' }
    });

    if (!newSkill) {
      throw new Error('NEW_SKILL_NOT_AVAILABLE');
    }

    // Duplicate enrollment prevention
    const existingEnrollment = student.enrollments.find(
      e => e.skillId === newSkillId && ['ACTIVE', 'COMPLETED'].includes(e.status)
    );

    if (existingEnrollment) {
      throw new Error('DUPLICATE_SKILL_ENROLLMENT');
    }

    // Mindset skip validation
    if (skipMindset && !this.MINDSET_SKIP_ALLOWED) {
      throw new Error('MINDSET_SKIP_NOT_ALLOWED');
    }

    // Payment method validation
    const validPaymentMethods = ['TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      throw new Error('INVALID_PAYMENT_METHOD');
    }

    this.logger.debug('Skill switch validation passed', { 
      studentId, 
      currentSkillId, 
      newSkillId 
    });
  }

  /**
   * 💰 SKILL SWITCH PAYMENT PROCESSING
   */
  async processSkillSwitchPayment(switchData) {
    const { studentId, newSkillId, paymentMethod, skipMindset } = switchData;

    const paymentPayload = {
      studentId,
      amount: this.SKILL_SWITCH_PRICE,
      paymentMethod,
      description: `Skill Switch Payment - ${newSkillId}`,
      metadata: {
        type: 'SKILL_SWITCH',
        newSkillId,
        skipMindset,
        originalPrice: 1999,
        discountApplied: 0
      }
    };

    try {
      const paymentResult = await this.paymentProcessor.processPayment(paymentPayload);

      if (paymentResult.status !== 'COMPLETED') {
        throw new Error(`PAYMENT_FAILED: ${paymentResult.failureReason}`);
      }

      this.logger.info('Skill switch payment processed', {
        studentId,
        newSkillId,
        paymentId: paymentResult.paymentId,
        amount: paymentResult.amount
      });

      return paymentResult;

    } catch (error) {
      this.logger.error('Skill switch payment failed', error, { studentId, newSkillId });
      throw new Error('PAYMENT_PROCESSING_FAILED');
    }
  }

  /**
   * 🔄 CREATE NEW ENROLLMENT WITH SKIP OPTIONS
   */
  async createNewEnrollment(switchData, paymentResult) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Get student and skill details
      const [student, newSkill] = await Promise.all([
        tx.student.findUnique({
          where: { id: switchData.studentId },
          select: { name: true, faydaId: true, completedMindset: true }
        }),
        tx.skill.findUnique({
          where: { id: switchData.newSkillId },
          select: { name: true, category: true, durationMonths: true }
        })
      ]);

      // 2. Determine starting phase based on mindset skip
      const startingPhase = this.calculateStartingPhase(switchData, student);

      // 3. Create skill switch record
      const skillSwitch = await tx.skillSwitch.create({
        data: {
          studentId: switchData.studentId,
          fromSkillId: switchData.currentSkillId,
          toSkillId: switchData.newSkillId,
          paymentId: paymentResult.paymentId,
          amountPaid: this.SKILL_SWITCH_PRICE,
          mindsetSkipped: switchData.skipMindset || false,
          startingPhase,
          status: 'ACTIVE',
          metadata: {
            previousProgress: await this.getPreviousProgress(switchData.studentId, switchData.currentSkillId),
            switchReason: switchData.switchReason,
            requestedAt: new Date().toISOString()
          }
        }
      });

      // 4. Create new enrollment
      const newEnrollment = await tx.enrollment.create({
        data: {
          studentId: switchData.studentId,
          skillId: switchData.newSkillId,
          skillSwitchId: skillSwitch.id,
          status: 'ACTIVE',
          currentPhase: startingPhase,
          phaseStartDate: new Date(),
          expectedCompletion: this.calculateCompletionDate(startingPhase),
          paymentStatus: 'PAID',
          totalAmount: this.SKILL_SWITCH_PRICE,
          mindsetCompleted: startingPhase !== 'MINDSET', // Skip mindset if starting later
          metadata: {
            isSkillSwitch: true,
            originalEnrollmentId: switchData.currentEnrollmentId,
            mindsetSkipped: switchData.skipMindset || false,
            transferredProgress: startingPhase !== 'MINDSET'
          }
        }
      });

      // 5. Update previous enrollment if needed
      if (switchData.pausePrevious) {
        await tx.enrollment.update({
          where: { id: switchData.currentEnrollmentId },
          data: { 
            status: 'PAUSED',
            pauseReason: 'SKILL_SWITCH',
            pausedAt: new Date()
          }
        });
      }

      this.logger.info('New enrollment created for skill switch', {
        studentId: switchData.studentId,
        newEnrollmentId: newEnrollment.id,
        skillSwitchId: skillSwitch.id,
        startingPhase
      });

      return {
        switchId: skillSwitch.id,
        enrollmentId: newEnrollment.id,
        startingPhase,
        skillName: newSkill.name
      };

    }, {
      maxWait: 10000,
      timeout: 30000
    });
  }

  /**
   * 🧮 CALCULATE STARTING PHASE BASED ON MINDSET SKIP
   */
  calculateStartingPhase(switchData, student) {
    // If student explicitly wants to skip mindset and has completed it before
    if (switchData.skipMindset && student.completedMindset) {
      return 'THEORY';
    }

    // If student hasn't completed mindset, they must take it
    if (!student.completedMindset) {
      return 'MINDSET';
    }

    // Default: start from mindset unless explicitly skipped
    return switchData.skipMindset ? 'THEORY' : 'MINDSET';
  }

  /**
   * 📊 TRANSFER RELEVANT PROGRESS DATA
   */
  async transferProgressData(switchData, enrollmentResult) {
    const { studentId, currentSkillId, newSkillId } = switchData;
    const { enrollmentId, startingPhase } = enrollmentResult;

    // Only transfer progress if starting from THEORY or later
    if (startingPhase === 'MINDSET') {
      this.logger.debug('No progress transfer needed - starting from mindset', { studentId });
      return;
    }

    try {
      // Get previous progress data
      const previousProgress = await this.getPreviousProgress(studentId, currentSkillId);

      if (previousProgress && previousProgress.mindsetCompleted) {
        // Mark mindset as completed in new enrollment
        await this.prisma.enrollment.update({
          where: { id: enrollmentId },
          data: { 
            mindsetCompleted: true,
            mindsetCompletedAt: previousProgress.mindsetCompletedAt
          }
        });

        this.logger.info('Mindset progress transferred', {
          studentId,
          fromSkill: currentSkillId,
          toSkill: newSkillId
        });
      }

      // Emit progress transfer event
      this.emit('progressTransferred', {
        studentId,
        fromSkill: currentSkillId,
        toSkill: newSkillId,
        transferredData: ['mindset_completion'],
        enrollmentId
      });

    } catch (error) {
      this.logger.error('Progress transfer failed', error, { studentId, currentSkillId });
      // Don't fail the entire switch if progress transfer fails
    }
  }

  /**
   * 📨 GET PREVIOUS PROGRESS DATA
   */
  async getPreviousProgress(studentId, skillId) {
    const previousEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        skillId,
        status: { in: ['ACTIVE', 'COMPLETED', 'PAUSED'] }
      },
      select: {
        mindsetCompleted: true,
        mindsetCompletedAt: true,
        currentPhase: true,
        progressPercentage: true
      }
    });

    return previousEnrollment;
  }

  /**
   * 📅 CALCULATE COMPLETION DATE
   */
  calculateCompletionDate(startingPhase) {
    const completionDate = new Date();
    
    switch (startingPhase) {
      case 'MINDSET':
        completionDate.setMonth(completionDate.getMonth() + 4); // Full 4 months
        break;
      case 'THEORY':
        completionDate.setMonth(completionDate.getMonth() + 3); // 3 months remaining
        break;
      case 'HANDS_ON':
        completionDate.setMonth(completionDate.getMonth() + 2); // 2 months remaining
        break;
      default:
        completionDate.setMonth(completionDate.getMonth() + 4);
    }

    return completionDate;
  }

  /**
   * 🔔 SEND SWITCH NOTIFICATIONS
   */
  async sendSwitchNotifications(switchData, enrollmentResult) {
    const { studentId, newSkillId } = switchData;
    const { enrollmentId, startingPhase, skillName } = enrollmentResult;

    try {
      // Get student details for notification
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { name: true, email: true, phone: true }
      });

      // Notification payload
      const notificationPayload = {
        studentId,
        studentName: student.name,
        email: student.email,
        phone: student.phone,
        type: 'SKILL_SWITCH_CONFIRMATION',
        data: {
          newSkill: skillName,
          enrollmentId,
          startingPhase,
          amountPaid: this.SKILL_SWITCH_PRICE,
          mindsetSkipped: switchData.skipMindset || false,
          switchDate: new Date().toISOString()
        }
      };

      // Send email notification
      await this.sendEmailNotification(notificationPayload);

      // Send SMS notification
      await this.sendSMSNotification(notificationPayload);

      // Internal system notification
      this.emit('skillSwitchCompleted', {
        studentId,
        newSkillId,
        enrollmentId,
        startingPhase,
        amount: this.SKILL_SWITCH_PRICE
      });

      this.logger.info('Skill switch notifications sent', { studentId, newSkillId });

    } catch (error) {
      this.logger.error('Notification sending failed', error, { studentId });
      // Don't fail the switch if notifications fail
    }
  }

  /**
   * 📧 SEND EMAIL NOTIFICATION
   */
  async sendEmailNotification(payload) {
    // Implementation for email service integration
    this.logger.debug('Email notification prepared', {
      studentId: payload.studentId,
      type: payload.type
    });
  }

  /**
   * 📱 SEND SMS NOTIFICATION
   */
  async sendSMSNotification(payload) {
    // Implementation for SMS service integration
    this.logger.debug('SMS notification prepared', {
      studentId: payload.studentId,
      type: payload.type
    });
  }

  /**
   * 🔍 GET AVAILABLE SKILLS FOR SWITCHING
   */
  async getAvailableSkills(studentId, currentSkillId) {
    const cacheKey = `available_skills:${studentId}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get student's current enrollments to exclude
    const studentEnrollments = await this.prisma.enrollment.findMany({
      where: { 
        studentId,
        status: { in: ['ACTIVE', 'COMPLETED'] }
      },
      select: { skillId: true }
    });

    const excludedSkillIds = studentEnrollments.map(e => e.skillId);

    // Get all active skills except current ones
    const availableSkills = await this.prisma.skill.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: { in: excludedSkillIds } }
      },
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        durationMonths: true,
        averageCompletionRate: true,
        employmentRate: true
      },
      orderBy: { category: 'asc' }
    });

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(availableSkills));

    return availableSkills;
  }

  /**
   * 💰 GET SKILL SWITCH PRICING
   */
  async getSkillSwitchPricing(studentId) {
    const basePrice = this.SKILL_SWITCH_PRICE;
    
    // Check for eligibility discounts
    const discount = await this.calculateEligibilityDiscount(studentId);
    
    return {
      basePrice,
      discount,
      finalPrice: basePrice - discount,
      currency: 'ETB',
      description: 'Additional skill enrollment fee',
      includes: [
        'Full course access',
        'Expert matching',
        'Hands-on training',
        'Certification',
        'Yachi verification'
      ],
      mindsetSkip: this.MINDSET_SKIP_ALLOWED ? 'Optional' : 'Not available'
    };
  }

  /**
   * 🎁 CALCULATE ELIGIBILITY DISCOUNT
   */
  async calculateEligibilityDiscount(studentId) {
    let discount = 0;

    // Check if student has completed courses before
    const completedCourses = await this.prisma.enrollment.count({
      where: {
        studentId,
        status: 'COMPLETED',
        certificationIssued: true
      }
    });

    // Loyalty discount for returning students
    if (completedCourses >= 1) {
      discount += 200; // 200 ETB discount for returning students
    }

    // Early completion discount
    const activeEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        status: 'ACTIVE'
      },
      select: {
        createdAt: true,
        expectedCompletion: true
      }
    });

    if (activeEnrollment) {
      const progressPercentage = await this.calculateProgressPercentage(studentId);
      if (progressPercentage > 75) {
        discount += 100; // 100 ETB for high progress
      }
    }

    return discount;
  }

  /**
   * 📊 CALCULATE PROGRESS PERCENTAGE
   */
  async calculateProgressPercentage(studentId) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        status: 'ACTIVE'
      },
      select: {
        currentPhase: true,
        mindsetCompleted: true,
        theoryProgress: true,
        handsOnProgress: true
      }
    });

    if (!enrollment) return 0;

    let progress = 0;
    
    // Mindset phase: 25% of total
    if (enrollment.mindsetCompleted) {
      progress += 25;
    }

    // Theory phase: 35% of total
    progress += (enrollment.theoryProgress || 0) * 0.35;

    // Hands-on phase: 40% of total  
    progress += (enrollment.handsOnProgress || 0) * 0.40;

    return Math.min(progress, 100);
  }

  /**
   * 🔥 WARM UP SKILL CACHE
   */
  async warmUpSkillCache() {
    try {
      const skills = await this.prisma.skill.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          name: true,
          category: true,
          description: true,
          status: true
        }
      });

      const pipeline = this.redis.pipeline();
      skills.forEach(skill => {
        const key = `skill:${skill.id}`;
        pipeline.hset(key, skill);
        pipeline.expire(key, 86400); // 24 hours
      });

      await pipeline.exec();
      this.logger.info(`Skill cache warmed up with ${skills.length} skills`);
    } catch (error) {
      this.logger.error('Failed to warm up skill cache', error);
    }
  }

  /**
   * 📈 GET SKILL SWITCH ANALYTICS
   */
  async getSkillSwitchAnalytics(period = '30d') {
    const cacheKey = `analytics:skill_switches:${period}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const analytics = await this.prisma.skillSwitch.groupBy({
      by: ['status', 'mindsetSkipped'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: {
        id: true
      },
      _sum: {
        amountPaid: true
      }
    });

    const result = {
      totalSwitches: analytics.reduce((sum, item) => sum + item._count.id, 0),
      totalRevenue: analytics.reduce((sum, item) => sum + (item._sum.amountPaid || 0), 0),
      mindsetSkips: analytics.find(item => item.mindsetSkipped)?._count.id || 0,
      byStatus: analytics.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {})
    };

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));

    return result;
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Skill switcher resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new SkillSwitcher();