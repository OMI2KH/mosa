/**
 * 🎯 MOSA FORGE: Enterprise Course Starter Service
 * 
 * @module CourseStarter
 * @description Manages student course enrollment, commencement, and initial setup
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Course enrollment with payment verification
 * - Expert-student matching algorithm
 * - Quality guarantee enforcement
 * - Multi-course management
 * - Real-time progress tracking
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');

// 🏗️ Enterprise Constants
const COURSE_STATES = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused'
};

const ENROLLMENT_ERRORS = {
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  EXPERT_UNAVAILABLE: 'EXPERT_UNAVAILABLE',
  QUALITY_THRESHOLD: 'QUALITY_THRESHOLD',
  DUPLICATE_ENROLLMENT: 'DUPLICATE_ENROLLMENT',
  CAPACITY_EXCEEDED: 'CAPACITY_EXCEEDED'
};

/**
 * 🏗️ Enterprise Course Starter Class
 * @class CourseStarter
 * @extends EventEmitter
 */
class CourseStarter extends EventEmitter {
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
      maxRetries: options.maxRetries || 3,
      timeout: options.timeout || 30000,
      qualityThreshold: options.qualityThreshold || 4.0
    };

    // 🏗️ Service Dependencies
    this.redis = new Redis(this.config.redis);
    this.prisma = this.config.prisma;
    this.circuitBreaker = this._initializeCircuitBreaker();
    
    // 🏗️ Performance Monitoring
    this.metrics = {
      enrollmentsStarted: 0,
      enrollmentsCompleted: 0,
      enrollmentsFailed: 0,
      averageProcessingTime: 0
    };

    this._initializeEventHandlers();
    this._startHealthChecks();
  }

  /**
   * 🏗️ Initialize Circuit Breaker for Fault Tolerance
   * @private
   */
  _initializeCircuitBreaker() {
    let state = 'CLOSED';
    let failureCount = 0;
    const failureThreshold = 5;
    const resetTimeout = 60000;
    let lastFailureTime = null;

    return {
      execute: async (operation) => {
        if (state === 'OPEN') {
          if (Date.now() - lastFailureTime > resetTimeout) {
            state = 'HALF_OPEN';
          } else {
            throw new Error('Circuit breaker is OPEN');
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
          }
          throw error;
        }
      },
      getState: () => state
    };
  }

  /**
   * 🏗️ Initialize Enterprise Event Handlers
   * @private
   */
  _initializeEventHandlers() {
    this.on('enrollment.started', (data) => {
      this._logEvent('ENROLLMENT_STARTED', data);
      this.metrics.enrollmentsStarted++;
    });

    this.on('enrollment.completed', (data) => {
      this._logEvent('ENROLLMENT_COMPLETED', data);
      this.metrics.enrollmentsCompleted++;
    });

    this.on('enrollment.failed', (data) => {
      this._logEvent('ENROLLMENT_FAILED', data);
      this.metrics.enrollmentsFailed++;
    });

    this.on('expert.matched', (data) => {
      this._logEvent('EXPERT_MATCHED', data);
    });

    this.on('quality.check.passed', (data) => {
      this._logEvent('QUALITY_CHECK_PASSED', data);
    });
  }

  /**
   * 🏗️ Start Health Monitoring
   * @private
   */
  _startHealthChecks() {
    setInterval(() => {
      this._checkHealth();
    }, 30000); // Every 30 seconds
  }

  /**
   * 🏗️ Health Check Implementation
   * @private
   */
  async _checkHealth() {
    const health = {
      service: 'course-starter',
      timestamp: new Date().toISOString(),
      status: 'healthy',
      dependencies: {}
    };

    try {
      // Check Redis connection
      await this.redis.ping();
      health.dependencies.redis = 'healthy';
    } catch (error) {
      health.dependencies.redis = 'unhealthy';
      health.status = 'degraded';
    }

    try {
      // Check Database connection
      await this.prisma.$queryRaw`SELECT 1`;
      health.dependencies.database = 'healthy';
    } catch (error) {
      health.dependencies.database = 'unhealthy';
      health.status = 'degraded';
    }

    // Store health status
    await this.redis.set(
      `health:course-starter:${Date.now()}`,
      JSON.stringify(health),
      'EX',
      60
    );

    this.emit('health.check', health);
  }

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Start Student Course
   * @param {Object} enrollmentData - Student enrollment data
   * @returns {Promise<Object>} Enrollment result
   */
  async startStudentCourse(enrollmentData) {
    const startTime = performance.now();
    const enrollmentId = uuidv4();
    const traceId = enrollmentData.traceId || uuidv4();

    try {
      this.emit('enrollment.started', { enrollmentId, traceId, enrollmentData });

      // 🏗️ Enterprise Validation Chain
      await this._validateEnrollmentData(enrollmentData);
      await this._checkDuplicateEnrollment(enrollmentData.studentId, enrollmentData.skillId);
      await this._verifyPaymentStatus(enrollmentData.paymentId);
      
      // 🏗️ Quality Guarantee Checks
      const expert = await this._findQualifiedExpert(enrollmentData.skillId);
      await this._validateExpertQuality(expert.id);
      
      // 🏗️ Create Enrollment Record
      const enrollment = await this._createEnrollmentRecord({
        ...enrollmentData,
        enrollmentId,
        expertId: expert.id,
        traceId
      });

      // 🏗️ Initialize Learning Progress
      await this._initializeLearningProgress(enrollment.id, enrollmentData.skillId);
      
      // 🏗️ Start Mindset Phase (FREE)
      await this._startMindsetPhase(enrollment.id);

      const processingTime = performance.now() - startTime;
      this._updateMetrics(processingTime);

      const result = {
        success: true,
        enrollmentId: enrollment.id,
        expertId: expert.id,
        expertName: expert.name,
        startDate: enrollment.startDate,
        mindsetPhase: this._getMindsetPhaseStructure(),
        nextSteps: this._getCourseTimeline(),
        traceId
      };

      this.emit('enrollment.completed', result);
      this._logSuccess('COURSE_STARTED', { enrollmentId, processingTime });

      return result;

    } catch (error) {
      const processingTime = performance.now() - startTime;
      this._updateMetrics(processingTime);
      
      const errorResult = {
        success: false,
        error: error.message,
        errorCode: error.code || 'ENROLLMENT_FAILED',
        enrollmentId,
        traceId,
        timestamp: new Date().toISOString()
      };

      this.emit('enrollment.failed', errorResult);
      this._logError('COURSE_START_FAILED', error, { enrollmentId, traceId });

      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🏗️ Enterprise Enrollment Validation
   * @private
   */
  async _validateEnrollmentData(enrollmentData) {
    const requiredFields = ['studentId', 'skillId', 'paymentId', 'bundleId'];
    const missingFields = requiredFields.filter(field => !enrollmentData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate student exists and is active
    const student = await this.prisma.student.findUnique({
      where: { id: enrollmentData.studentId },
      select: { id: true, status: true, faydaId: true }
    });

    if (!student) {
      throw new Error('Student not found');
    }

    if (student.status !== 'ACTIVE') {
      throw new Error('Student account is not active');
    }

    // Validate skill exists and is available
    const skill = await this.prisma.skill.findUnique({
      where: { id: enrollmentData.skillId },
      select: { id: true, name: true, isActive: true, category: true }
    });

    if (!skill || !skill.isActive) {
      throw new Error('Skill is not available for enrollment');
    }

    return true;
  }

  /**
   * 🏗️ Duplicate Enrollment Prevention
   * @private
   */
  async _checkDuplicateEnrollment(studentId, skillId) {
    const cacheKey = `enrollment:${studentId}:${skillId}`;
    
    // Check cache first for performance
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      throw new Error('Duplicate enrollment detected');
    }

    // Check database for active enrollments
    const existingEnrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        skillId,
        status: {
          in: [COURSE_STATES.PENDING, COURSE_STATES.ACTIVE]
        }
      }
    });

    if (existingEnrollment) {
      // Cache duplicate finding for 1 hour
      await this.redis.set(cacheKey, 'true', 'EX', 3600);
      throw new Error('Student already has an active enrollment for this skill');
    }

    // Cache non-duplicate for 5 minutes
    await this.redis.set(cacheKey, 'false', 'EX', 300);
    return true;
  }

  /**
   * 🏗️ Payment Verification with Circuit Breaker
   * @private
   */
  async _verifyPaymentStatus(paymentId) {
    return await this.circuitBreaker.execute(async () => {
      // In production, this would integrate with payment service
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { bundle: true }
      });

      if (!payment) {
        throw new Error('Payment record not found');
      }

      if (payment.status !== 'COMPLETED') {
        throw new Error('Payment not completed');
      }

      if (payment.bundle.amount !== 1999) {
        throw new Error('Invalid bundle amount');
      }

      // Verify revenue split configuration
      if (payment.bundle.mosaRevenue !== 1000 || payment.bundle.expertRevenue !== 999) {
        throw new Error('Invalid revenue split configuration');
      }

      return true;
    });
  }

  /**
   * 🏗️ Qualified Expert Matching Algorithm
   * @private
   */
  async _findQualifiedExpert(skillId) {
    const experts = await this.prisma.expert.findMany({
      where: {
        skills: {
          some: {
            skillId,
            isVerified: true
          }
        },
        status: 'ACTIVE',
        tier: {
          in: ['MASTER', 'SENIOR', 'STANDARD']
        },
        currentStudents: {
          lt: this.prisma.expert.fields.maxStudents
        },
        qualityScore: {
          gte: this.config.qualityThreshold
        }
      },
      include: {
        _count: {
          select: {
            enrollments: {
              where: {
                status: 'ACTIVE'
              }
            }
          }
        },
        qualityMetrics: {
          select: {
            completionRate: true,
            averageRating: true,
            responseTime: true
          }
        }
      },
      orderBy: [
        { tier: 'desc' },
        { qualityScore: 'desc' },
        { currentStudents: 'asc' }
      ],
      take: 10 // Consider top 10 experts for matching
    });

    if (experts.length === 0) {
      throw new Error('No qualified experts available for this skill');
    }

    // 🎯 Advanced Matching Algorithm
    const rankedExperts = experts.map(expert => ({
      ...expert,
      matchScore: this._calculateExpertMatchScore(expert)
    })).sort((a, b) => b.matchScore - a.matchScore);

    const selectedExpert = rankedExperts[0];
    
    this.emit('expert.matched', {
      expertId: selectedExpert.id,
      skillId,
      matchScore: selectedExpert.matchScore,
      tier: selectedExpert.tier
    });

    return selectedExpert;
  }

  /**
   * 🏗️ Expert Match Scoring Algorithm
   * @private
   */
  _calculateExpertMatchScore(expert) {
    let score = 0;

    // Tier-based scoring
    const tierWeights = {
      MASTER: 1.0,
      SENIOR: 0.8,
      STANDARD: 0.6
    };

    score += tierWeights[expert.tier] * 30;

    // Quality score weighting
    score += expert.qualityScore * 20;

    // Completion rate weighting
    if (expert.qualityMetrics?.completionRate) {
      score += expert.qualityMetrics.completionRate * 25;
    }

    // Response time weighting (faster is better)
    if (expert.qualityMetrics?.responseTime) {
      const responseScore = Math.max(0, 24 - expert.qualityMetrics.responseTime) / 24 * 15;
      score += responseScore;
    }

    // Load balancing - prefer experts with fewer students
    const loadFactor = 1 - (expert.currentStudents / expert.maxStudents);
    score += loadFactor * 10;

    return Math.min(100, score);
  }

  /**
   * 🏗️ Expert Quality Validation
   * @private
   */
  async _validateExpertQuality(expertId) {
    const qualityCheck = await this.prisma.qualityMetrics.findFirst({
      where: {
        expertId,
        isValid: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!qualityCheck) {
      throw new Error('Expert quality metrics not available');
    }

    if (qualityCheck.overallScore < this.config.qualityThreshold) {
      throw new Error('Expert does not meet quality requirements');
    }

    if (qualityCheck.completionRate < 0.7) {
      throw new Error('Expert completion rate below threshold');
    }

    this.emit('quality.check.passed', { expertId, qualityScore: qualityCheck.overallScore });
    return true;
  }

  /**
   * 🏗️ Create Enrollment Record with Transaction
   * @private
   */
  async _createEnrollmentRecord(enrollmentData) {
    return await this.prisma.$transaction(async (tx) => {
      // Create enrollment
      const enrollment = await tx.enrollment.create({
        data: {
          id: enrollmentData.enrollmentId,
          studentId: enrollmentData.studentId,
          expertId: enrollmentData.expertId,
          skillId: enrollmentData.skillId,
          paymentId: enrollmentData.paymentId,
          status: COURSE_STATES.ACTIVE,
          startDate: new Date(),
          expectedEndDate: new Date(Date.now() + (120 * 24 * 60 * 60 * 1000)), // 4 months
          currentPhase: 'MINDSET',
          traceId: enrollmentData.traceId,
          metadata: {
            bundleType: 'STANDARD_1999',
            revenueSplit: {
              mosa: 1000,
              expert: 999
            },
            payoutSchedule: [
              { phase: 'START', amount: 333, paid: false },
              { phase: 'MIDPOINT', amount: 333, paid: false },
              { phase: 'COMPLETION', amount: 333, paid: false }
            ]
          }
        }
      });

      // Update expert student count
      await tx.expert.update({
        where: { id: enrollmentData.expertId },
        data: {
          currentStudents: {
            increment: 1
          }
        }
      });

      // Create initial progress record
      await tx.learningProgress.create({
        data: {
          enrollmentId: enrollment.id,
          phase: 'MINDSET',
          progress: 0,
          completedExercises: 0,
          totalExercises: 20,
          lastActivity: new Date()
        }
      });

      return enrollment;
    });
  }

  /**
   * 🏗️ Initialize Learning Progress
   * @private
   */
  async _initializeLearningProgress(enrollmentId, skillId) {
    const skillConfig = await this.prisma.skillConfig.findUnique({
      where: { skillId }
    });

    if (!skillConfig) {
      throw new Error('Skill configuration not found');
    }

    // Initialize all learning phases
    const phases = ['MINDSET', 'THEORY', 'HANDS_ON', 'CERTIFICATION'];
    
    for (const phase of phases) {
      await this.prisma.learningProgress.create({
        data: {
          enrollmentId,
          phase,
          progress: phase === 'MINDSET' ? 0 : -1, // -1 indicates not started
          completedExercises: 0,
          totalExercises: this._getPhaseExerciseCount(phase, skillConfig),
          lastActivity: phase === 'MINDSET' ? new Date() : null
        }
      });
    }
  }

  /**
   * 🏗️ Start Mindset Phase (FREE)
   * @private
   */
  async _startMindsetPhase(enrollmentId) {
    // Initialize mindset assessment
    await this.prisma.mindsetAssessment.create({
      data: {
        enrollmentId,
        week: 1,
        topic: 'Wealth Consciousness',
        status: 'IN_PROGRESS',
        exercises: this._getMindsetExercises(1),
        startedAt: new Date()
      }
    });

    // Schedule weekly mindset phases
    const mindsetWeeks = [
      { week: 1, topic: 'Wealth Consciousness' },
      { week: 2, topic: 'Discipline Building' },
      { week: 3, topic: 'Action Taking' },
      { week: 4, topic: 'Financial Psychology' }
    ];

    for (const week of mindsetWeeks) {
      await this.prisma.mindsetSchedule.create({
        data: {
          enrollmentId,
          ...week,
          scheduledDate: new Date(Date.now() + ((week.week - 1) * 7 * 24 * 60 * 60 * 1000)),
          status: 'PENDING'
        }
      });
    }
  }

  /**
   * 🏗️ Get Mindset Phase Structure
   * @private
   */
  _getMindsetPhaseStructure() {
    return {
      duration: '4 weeks',
      cost: 'FREE',
      weeks: [
        {
          week: 1,
          topic: 'Wealth Consciousness',
          exercises: 5,
          duration: '7 days',
          objectives: ['Transform consumer mindset to creator mindset']
        },
        {
          week: 2,
          topic: 'Discipline Building', 
          exercises: 5,
          duration: '7 days',
          objectives: ['Develop consistent learning habits']
        },
        {
          week: 3,
          topic: 'Action Taking',
          exercises: 5, 
          duration: '7 days',
          objectives: ['Overcome procrastination and take action']
        },
        {
          week: 4,
          topic: 'Financial Psychology',
          exercises: 5,
          duration: '7 days', 
          objectives: ['Build healthy money mindset and identity']
        }
      ],
      completionRequirement: 'Complete all exercises and assessment'
    };
  }

  /**
   * 🏗️ Get Course Timeline
   * @private
   */
  _getCourseTimeline() {
    return {
      phase1: {
        name: 'Mindset Foundation',
        duration: '4 weeks',
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + (28 * 24 * 60 * 60 * 1000))
      },
      phase2: {
        name: 'Theory Mastery', 
        duration: '2 months',
        status: 'UPCOMING',
        startDate: new Date(Date.now() + (28 * 24 * 60 * 60 * 1000))
      },
      phase3: {
        name: 'Hands-on Immersion',
        duration: '2 months', 
        status: 'UPCOMING',
        startDate: new Date(Date.now() + (28 * 24 * 60 * 60 * 1000) + (60 * 24 * 60 * 60 * 1000))
      },
      phase4: {
        name: 'Certification & Launch',
        duration: '2 weeks',
        status: 'UPCOMING', 
        startDate: new Date(Date.now() + (28 * 24 * 60 * 60 * 1000) + (120 * 24 * 60 * 60 * 1000))
      }
    };
  }

  /**
   * 🏗️ Get Phase Exercise Count
   * @private
   */
  _getPhaseExerciseCount(phase, skillConfig) {
    const exerciseCounts = {
      MINDSET: 20,
      THEORY: skillConfig.theoryExercises || 100,
      HANDS_ON: skillConfig.practicalExercises || 50,
      CERTIFICATION: skillConfig.assessmentExercises || 10
    };

    return exerciseCounts[phase] || 0;
  }

  /**
   * 🏗️ Get Mindset Exercises
   * @private
   */
  _getMindsetExercises(week) {
    const exercisesByWeek = {
      1: [
        { id: 1, type: 'REFLECTION', question: 'What does wealth mean to you?' },
        { id: 2, type: 'ACTION', task: 'Identify 3 income opportunities around you' },
        { id: 3, type: 'QUIZ', question: 'Consumer vs Creator mindset differences' },
        { id: 4, type: 'JOURNAL', prompt: 'Daily wealth consciousness practice' },
        { id: 5, type: 'ASSESSMENT', topic: 'Current financial mindset evaluation' }
      ],
      2: [
        { id: 6, type: 'PLANNING', task: 'Create daily learning schedule' },
        { id: 7, type: 'HABIT', practice: 'Consistent study time establishment' },
        { id: 8, type: 'TRACKING', task: 'Monitor daily progress' },
        { id: 9, type: 'REFLECTION', question: 'Discipline challenges and solutions' },
        { id: 10, type: 'ACTION', task: 'Implement accountability system' }
      ]
      // ... weeks 3 and 4
    };

    return exercisesByWeek[week] || [];
  }

  /**
   * 🏗️ Update Performance Metrics
   * @private
   */
  _updateMetrics(processingTime) {
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.enrollmentsCompleted - 1) + processingTime) / 
      this.metrics.enrollmentsCompleted;
  }

  /**
   * 🏗️ Format Enterprise Error
   * @private
   */
  _formatEnterpriseError(error) {
    const enterpriseError = new Error(error.message);
    enterpriseError.code = error.code || 'INTERNAL_ERROR';
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
      'PAYMENT_PENDING': 'LOW',
      'EXPERT_UNAVAILABLE': 'MEDIUM', 
      'QUALITY_THRESHOLD': 'HIGH',
      'DUPLICATE_ENROLLMENT': 'MEDIUM',
      'CAPACITY_EXCEEDED': 'MEDIUM',
      'INTERNAL_ERROR': 'CRITICAL'
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
      service: 'course-starter',
      event: eventType,
      data,
      environment: process.env.NODE_ENV || 'development'
    };

    console.log(JSON.stringify(logEntry));

    // In production, this would send to centralized logging
    if (process.env.NODE_ENV === 'production') {
      this.redis.publish('service-logs', JSON.stringify(logEntry));
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
      circuitBreakerState: this.circuitBreaker.getState(),
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
  CourseStarter,
  COURSE_STATES,
  ENROLLMENT_ERRORS
};

// 🏗️ Singleton Instance for Microservice Architecture
let courseStarterInstance = null;

module.exports.getInstance = (options = {}) => {
  if (!courseStarterInstance) {
    courseStarterInstance = new CourseStarter(options);
  }
  return courseStarterInstance;
};