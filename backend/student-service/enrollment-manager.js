/**
 * 🏢 MOSA FORGE - Enterprise Enrollment Management System
 * 🎓 Student Journey Orchestration & Course Enrollment
 * 📊 Capacity Management & Expert Matching
 * 🔄 Multi-Course Enrollment & Progress Tracking
 * 🚀 Microservice-Ready Enterprise Architecture
 * 
 * @module EnrollmentManager
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
const PaymentValidator = require('../../utils/payment-validator');
const ExpertMatcher = require('../../utils/expert-matcher');
const NotificationService = require('../../services/notification-service');
const ProgressTracker = require('../../utils/progress-tracker');

class EnrollmentManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 🎯 Enterprise Configuration
    this.config = {
      // 🎓 Enrollment Configuration
      enrollment: {
        maxActiveCourses: 3,
        minAgeRequirement: 16,
        coolingPeriod: 7, // days
        autoEnrollment: true,
        prerequisiteChecking: true
      },

      // 💰 Payment Configuration
      payment: {
        bundlePrice: 1999,
        paymentMethods: ['telebirr', 'cbe_birr', 'bank_transfer'],
        installmentPlans: {
          full: { amount: 1999, installments: 1 },
          two_payments: { amount: 999.5, installments: 2 },
          three_payments: { amount: 666.33, installments: 3 }
        },
        refundPolicy: {
          coolingPeriod: 7, // days
          partialRefund: true,
          processingFee: 0.1 // 10%
        }
      },

      // 👥 Matching Configuration
      matching: {
        algorithm: 'quality_optimized',
        factors: {
          expertise_match: 0.35,
          quality_score: 0.25,
          availability: 0.20,
          student_preference: 0.20
        },
        maxMatchingAttempts: 3,
        fallbackEnabled: true
      },

      // 📊 Performance Configuration
      performance: {
        processingInterval: 60000, // 1 minute
        realTimeUpdates: true,
        cacheDuration: 300, // 5 minutes
        batchSize: 100
      },

      ...config
    };

    // 🏗️ Service State
    this.serviceState = {
      initialized: false,
      healthy: false,
      activeEnrollments: 0,
      pendingEnrollments: 0,
      totalEnrollments: 0,
      lastHealthCheck: null
    };

    this.metrics = {
      enrollmentsInitiated: 0,
      enrollmentsCompleted: 0,
      enrollmentsFailed: 0,
      matchingSuccessRate: 0,
      averageProcessingTime: 0,
      revenueGenerated: 0
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
        service: 'enrollment-manager',
        module: 'student-service',
        environment: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL || 'info'
      });

      // 💰 Payment Validator
      this.paymentValidator = new PaymentValidator({
        bundlePrice: this.config.payment.bundlePrice,
        paymentMethods: this.config.payment.paymentMethods,
        installmentPlans: this.config.payment.installmentPlans
      });

      // 👥 Expert Matcher
      this.expertMatcher = new ExpertMatcher({
        algorithm: this.config.matching.algorithm,
        factors: this.config.matching.factors,
        maxAttempts: this.config.matching.maxMatchingAttempts
      });

      // 📧 Notification Service
      this.notificationService = new NotificationService({
        templates: {
          enrollmentSuccess: 'enrollment_success_v1',
          expertAssigned: 'expert_assigned_v1',
          paymentConfirmed: 'payment_confirmed_v1',
          courseStarted: 'course_started_v1'
        }
      });

      // 📈 Progress Tracker
      this.progressTracker = new ProgressTracker({
        updateInterval: 300000, // 5 minutes
        realTimeTracking: true
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

      // 📊 Load Initial Metrics
      await this.loadInitialMetrics();

      this.serviceState.initialized = true;
      this.serviceState.healthy = true;

      this.logger.system('Enterprise Enrollment Manager initialized successfully', {
        service: 'enrollment-manager',
        version: '2.0.0',
        features: {
          autoEnrollment: this.config.enrollment.autoEnrollment,
          realTimeUpdates: this.config.performance.realTimeUpdates,
          multiCourseSupport: true
        }
      });

    } catch (error) {
      this.logger.critical('Enterprise Enrollment Manager initialization failed', {
        error: error.message,
        stack: error.stack,
        service: 'enrollment-manager'
      });
      throw error;
    }
  }

  /**
   * 🔄 Initialize Background Jobs
   */
  initializeBackgroundJobs() {
    // 📊 Enrollment Processing
    this.processingInterval = setInterval(() => {
      this.processPendingEnrollments().catch(error => {
        this.logger.error('Pending enrollments processing failed', { error: error.message });
      });
    }, this.config.performance.processingInterval);

    // 🔍 Expert Matching
    this.matchingInterval = setInterval(() => {
      this.processExpertMatching().catch(error => {
        this.logger.error('Expert matching processing failed', { error: error.message });
      });
    }, 30000); // 30 seconds

    // 📈 Analytics Update
    this.analyticsInterval = setInterval(() => {
      this.updateEnrollmentAnalytics().catch(error => {
        this.logger.error('Enrollment analytics update failed', { error: error.message });
      });
    }, 300000); // 5 minutes
  }

  /**
   * 🎓 INITIATE ENROLLMENT - Enterprise Grade
   */
  async initiateEnrollment(enrollmentRequest, context = {}) {
    const startTime = performance.now();
    const enrollmentId = this.generateEnrollmentId();
    const traceId = context.traceId || enrollmentId;

    try {
      // 🛡️ Pre-flight Checks
      await this.performPreFlightChecks();

      // ✅ Validate Enrollment Request
      await this.validateEnrollmentRequest(enrollmentRequest);

      // 🔍 Check Student Eligibility
      const eligibilityCheck = await this.checkStudentEligibility(enrollmentRequest.studentId);

      if (!eligibilityCheck.eligible) {
        throw new EnrollmentError('STUDENT_NOT_ELIGIBLE', 'Student is not eligible for enrollment', {
          reasons: eligibilityCheck.reasons
        });
      }

      // 💰 Process Payment
      const paymentResult = await this.processEnrollmentPayment(enrollmentRequest.payment);

      // 🎯 Create Enrollment Record
      const enrollmentRecord = await this.createEnrollmentRecord({
        enrollmentId,
        enrollmentRequest,
        eligibilityCheck,
        paymentResult,
        traceId
      });

      // 🔄 Queue for Expert Matching
      await this.queueForExpertMatching(enrollmentRecord);

      // 📧 Send Enrollment Confirmation
      await this.sendEnrollmentConfirmation(enrollmentRecord);

      // 📊 Update Metrics
      await this.updateEnrollmentMetrics({
        enrollmentId,
        studentId: enrollmentRequest.studentId,
        skillId: enrollmentRequest.skillId,
        responseTime: performance.now() - startTime,
        status: 'pending_matching'
      });

      this.metrics.enrollmentsInitiated++;
      this.serviceState.pendingEnrollments++;

      this.logger.business('Enrollment initiated successfully', {
        enrollmentId,
        traceId,
        studentId: enrollmentRequest.studentId,
        skillId: enrollmentRequest.skillId,
        paymentAmount: paymentResult.amount,
        status: 'pending_matching'
      });

      return {
        success: true,
        enrollmentId,
        studentId: enrollmentRequest.studentId,
        skillId: enrollmentRequest.skillId,
        status: 'pending_matching',
        paymentStatus: 'completed',
        nextSteps: this.generateEnrollmentNextSteps('pending_matching'),
        estimatedMatchingTime: '1-24 hours'
      };

    } catch (error) {
      await this.handleEnrollmentFailure({
        enrollmentId,
        enrollmentRequest,
        error,
        context,
        responseTime: performance.now() - startTime,
        traceId
      });
      throw error;
    }
  }

  /**
   * ✅ VALIDATE ENROLLMENT REQUEST
   */
  async validateEnrollmentRequest(enrollmentRequest) {
    const validationRules = {
      requiredFields: ['studentId', 'skillId', 'payment', 'preferences'],
      studentRequirements: {
        mustExist: true,
        validStatus: ['active', 'pending_verification'],
        minAge: this.config.enrollment.minAgeRequirement
      },
      skillRequirements: {
        mustExist: true,
        mustBeActive: true,
        mustHaveExperts: true
      },
      paymentRequirements: {
        validMethods: this.config.payment.paymentMethods,
        minAmount: this.config.payment.bundlePrice * 0.1, // 10% minimum
        maxAmount: this.config.payment.bundlePrice * 1.1 // 10% tolerance
      }
    };

    const errors = [];

    // ✅ Check Required Fields
    const missingFields = validationRules.requiredFields.filter(field => !enrollmentRequest[field]);
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // ✅ Validate Student
    if (enrollmentRequest.studentId) {
      const studentValidation = await this.validateStudent(enrollmentRequest.studentId, validationRules.studentRequirements);
      if (!studentValidation.valid) {
        errors.push(`Student validation failed: ${studentValidation.reason}`);
      }
    }

    // ✅ Validate Skill
    if (enrollmentRequest.skillId) {
      const skillValidation = await this.validateSkill(enrollmentRequest.skillId, validationRules.skillRequirements);
      if (!skillValidation.valid) {
        errors.push(`Skill validation failed: ${skillValidation.reason}`);
      }
    }

    // ✅ Validate Payment
    if (enrollmentRequest.payment) {
      const paymentErrors = await this.validatePayment(enrollmentRequest.payment, validationRules.paymentRequirements);
      errors.push(...paymentErrors);
    }

    // ✅ Check Active Course Limit
    const activeCourses = await this.getStudentActiveCourses(enrollmentRequest.studentId);
    if (activeCourses >= this.config.enrollment.maxActiveCourses) {
      errors.push(`Maximum active courses limit (${this.config.enrollment.maxActiveCourses}) reached`);
    }

    if (errors.length > 0) {
      throw new EnrollmentError('ENROLLMENT_VALIDATION_FAILED', 'Enrollment request validation failed', {
        errors,
        studentId: enrollmentRequest.studentId,
        skillId: enrollmentRequest.skillId
      });
    }

    this.logger.security('Enrollment request validation passed', {
      studentId: enrollmentRequest.studentId,
      skillId: enrollmentRequest.skillId,
      activeCourses
    });
  }

  /**
   * 🔍 CHECK STUDENT ELIGIBILITY
   */
  async checkStudentEligibility(studentId) {
    const eligibilityStartTime = performance.now();

    try {
      const eligibilityCriteria = {};
      const reasons = [];

      // ✅ Age Requirement Check
      eligibilityCriteria.ageRequirement = await this.checkAgeRequirement(studentId);
      if (!eligibilityCriteria.ageRequirement.met) {
        reasons.push(eligibilityCriteria.ageRequirement.reason);
      }

      // ✅ Account Status Check
      eligibilityCriteria.accountStatus = await this.checkAccountStatus(studentId);
      if (!eligibilityCriteria.accountStatus.valid) {
        reasons.push(eligibilityCriteria.accountStatus.reason);
      }

      // ✅ Previous Enrollment Check
      eligibilityCriteria.previousEnrollments = await this.checkPreviousEnrollments(studentId);
      if (!eligibilityCriteria.previousEnrollments.eligible) {
        reasons.push(...eligibilityCriteria.previousEnrollments.reasons);
      }

      // ✅ Prerequisite Check
      if (this.config.enrollment.prerequisiteChecking) {
        eligibilityCriteria.prerequisites = await this.checkPrerequisites(studentId);
        if (!eligibilityCriteria.prerequisites.met) {
          reasons.push(...eligibilityCriteria.prerequisites.missingPrerequisites);
        }
      }

      const eligible = Object.values(eligibilityCriteria).every(criterion => {
        if (typeof criterion === 'boolean') return criterion;
        if (typeof criterion === 'object') return criterion.met !== false;
        return true;
      });

      const eligibilityCheck = {
        eligible,
        criteria: eligibilityCriteria,
        reasons: eligible ? ['All eligibility criteria met'] : reasons,
        checkTime: performance.now() - eligibilityStartTime,
        checkedAt: new Date().toISOString()
      };

      this.logger.debug('Student eligibility check completed', {
        studentId,
        eligible,
        criteria: Object.keys(eligibilityCriteria).filter(k => eligibilityCriteria[k].met !== false)
      });

      return eligibilityCheck;

    } catch (error) {
      this.logger.error('Student eligibility check failed', {
        studentId,
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
   * 💰 PROCESS ENROLLMENT PAYMENT
   */
  async processEnrollmentPayment(paymentData) {
    const paymentStartTime = performance.now();
    const paymentId = this.generatePaymentId();

    try {
      // 🎯 Validate Payment Data
      const paymentValidation = await this.paymentValidator.validatePayment(paymentData);

      if (!paymentValidation.valid) {
        throw new EnrollmentError('PAYMENT_VALIDATION_FAILED', 'Payment validation failed', {
          errors: paymentValidation.errors
        });
      }

      // 💸 Process Payment Gateway
      const gatewayResult = await this.processPaymentGateway(paymentData, paymentId);

      // 💾 Create Payment Record
      const paymentRecord = await this.createPaymentRecord({
        paymentId,
        paymentData,
        paymentValidation,
        gatewayResult
      });

      const paymentResult = {
        success: true,
        paymentId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        method: paymentData.method,
        gatewayTransactionId: gatewayResult.transactionId,
        processingTime: performance.now() - paymentStartTime,
        processedAt: new Date().toISOString()
      };

      this.metrics.revenueGenerated += paymentData.amount;

      this.logger.business('Enrollment payment processed successfully', {
        paymentId,
        amount: paymentData.amount,
        method: paymentData.method,
        gateway: gatewayResult.gateway
      });

      return paymentResult;

    } catch (error) {
      this.logger.error('Enrollment payment processing failed', {
        paymentId,
        error: error.message
      });

      throw new EnrollmentError('PAYMENT_PROCESSING_FAILED', 'Failed to process enrollment payment', {
        originalError: error.message
      });
    }
  }

  /**
   * 🎯 CREATE ENROLLMENT RECORD
   */
  async createEnrollmentRecord(recordData) {
    const {
      enrollmentId,
      enrollmentRequest,
      eligibilityCheck,
      paymentResult,
      traceId
    } = recordData;

    try {
      const enrollmentRecord = await this.prisma.enrollment.create({
        data: {
          id: enrollmentId,
          studentId: enrollmentRequest.studentId,
          skillId: enrollmentRequest.skillId,
          status: 'pending_matching',
          paymentStatus: 'completed',
          paymentAmount: paymentResult.amount,
          paymentMethod: paymentResult.method,
          paymentTransactionId: paymentResult.gatewayTransactionId,
          preferences: enrollmentRequest.preferences,
          metadata: {
            traceId,
            eligibilityCheck,
            paymentResult,
            createdAt: new Date().toISOString()
          }
        },
        include: {
          student: {
            select: {
              personalInfo: true,
              contactInfo: true
            }
          },
          skill: {
            select: {
              name: true,
              category: true,
              difficulty: true
            }
          }
        }
      });

      this.logger.debug('Enrollment record created successfully', {
        enrollmentId,
        studentId: enrollmentRequest.studentId,
        skillId: enrollmentRequest.skillId
      });

      return enrollmentRecord;

    } catch (error) {
      this.logger.error('Enrollment record creation failed', {
        enrollmentId,
        error: error.message
      });

      throw new EnrollmentError('ENROLLMENT_CREATION_FAILED', 'Failed to create enrollment record', {
        originalError: error.message
      });
    }
  }

  /**
   * 🔄 QUEUE FOR EXPERT MATCHING
   */
  async queueForExpertMatching(enrollmentRecord) {
    const matchingItem = {
      enrollmentId: enrollmentRecord.id,
      studentId: enrollmentRecord.studentId,
      skillId: enrollmentRecord.skillId,
      preferences: enrollmentRecord.preferences,
      queuedAt: new Date(),
      priority: this.calculateMatchingPriority(enrollmentRecord),
      metadata: enrollmentRecord.metadata
    };

    await this.redis.lpush('expert_matching_queue', JSON.stringify(matchingItem));
    await this.redis.hset('enrollment_matching_data', enrollmentRecord.id, JSON.stringify(enrollmentRecord));

    this.logger.debug('Enrollment queued for expert matching', {
      enrollmentId: enrollmentRecord.id,
      queuePosition: await this.redis.llen('expert_matching_queue'),
      priority: matchingItem.priority
    });
  }

  /**
   * 👥 PROCESS EXPERT MATCHING - Background Job
   */
  async processExpertMatching() {
    const matchingStartTime = performance.now();
    const matchingBatchId = this.generateMatchingBatchId();

    try {
      // 🔍 Get Pending Matching Enrollments
      const pendingMatches = await this.getPendingMatchingEnrollments();

      if (pendingMatches.length === 0) {
        return;
      }

      let matched = 0;
      let failed = 0;

      for (const enrollment of pendingMatches) {
        try {
          const matchingResult = await this.matchExpertToEnrollment(enrollment);

          if (matchingResult.success) {
            matched++;
            
            // 💾 Update Enrollment with Expert Assignment
            await this.updateEnrollmentWithExpert(enrollment.id, matchingResult.expertId);

            // 📧 Send Expert Assignment Notification
            await this.sendExpertAssignmentNotification(enrollment, matchingResult);

            this.logger.info('Expert matched successfully', {
              enrollmentId: enrollment.id,
              expertId: matchingResult.expertId,
              matchScore: matchingResult.matchScore
            });

          } else {
            failed++;
            
            // 🔄 Handle Matching Failure
            await this.handleMatchingFailure(enrollment, matchingResult);
          }

        } catch (error) {
          this.logger.warn('Expert matching failed for enrollment', {
            enrollmentId: enrollment.id,
            error: error.message
          });
          failed++;
        }
      }

      this.metrics.matchingSuccessRate = matched / (matched + failed) * 100;

      this.logger.business('Expert matching batch completed', {
        matchingBatchId,
        total: pendingMatches.length,
        matched,
        failed,
        successRate: this.metrics.matchingSuccessRate,
        processingTime: performance.now() - matchingStartTime
      });

    } catch (error) {
      this.logger.error('Expert matching batch processing failed', {
        matchingBatchId,
        error: error.message
      });
    }
  }

  /**
   * 👥 MATCH EXPERT TO ENROLLMENT
   */
  async matchExpertToEnrollment(enrollment) {
    const matchingStartTime = performance.now();

    try {
      let attempts = 0;
      let bestMatch = null;

      while (attempts < this.config.matching.maxMatchingAttempts) {
        attempts++;

        // 🔍 Find Available Experts
        const availableExperts = await this.findAvailableExperts(enrollment.skillId, enrollment.preferences);

        if (availableExperts.length === 0) {
          if (this.config.matching.fallbackEnabled && attempts === this.config.matching.maxMatchingAttempts) {
            return await this.fallbackToBestAvailableExpert(enrollment);
          }
          continue;
        }

        // 🎯 Calculate Match Scores
        const scoredExperts = await this.calculateExpertScores(availableExperts, enrollment);

        // 🏆 Select Best Match
        const currentBestMatch = this.selectBestExpertMatch(scoredExperts, enrollment);

        if (currentBestMatch && currentBestMatch.matchScore >= 0.6) {
          bestMatch = currentBestMatch;
          break;
        }

        // 🔄 Adjust matching parameters for next attempt
        await this.adjustMatchingParameters(attempts);
      }

      if (!bestMatch) {
        throw new EnrollmentError('NO_EXPERT_AVAILABLE', 'No suitable expert found after maximum attempts', {
          attempts,
          enrollmentId: enrollment.id
        });
      }

      const matchingResult = {
        success: true,
        expertId: bestMatch.expertId,
        expertName: bestMatch.expertName,
        matchScore: bestMatch.matchScore,
        matchFactors: bestMatch.matchFactors,
        processingTime: performance.now() - matchingStartTime,
        matchedAt: new Date().toISOString()
      };

      return matchingResult;

    } catch (error) {
      this.logger.error('Expert matching failed', {
        enrollmentId: enrollment.id,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        matchedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 🔍 FIND AVAILABLE EXPERTS
   */
  async findAvailableExperts(skillId, preferences) {
    const cacheKey = `available_experts:${skillId}`;
    
    try {
      // 💾 Try cache first
      const cachedExperts = await this.redis.get(cacheKey);
      if (cachedExperts) {
        return JSON.parse(cachedExperts);
      }

      // 🗃️ Query database for available experts
      const availableExperts = await this.prisma.expert.findMany({
        where: {
          status: 'active',
          qualityScore: { gte: 4.0 },
          skills: {
            some: {
              skillId: skillId,
              verified: true
            }
          },
          currentStudents: { lt: this.prisma.expert.fields.currentStudents } // Dynamic limit based on tier
        },
        include: {
          skills: {
            where: { skillId: skillId },
            select: { proficiency: true, experience: true }
          },
          qualityMetrics: {
            orderBy: { calculatedAt: 'desc' },
            take: 1
          },
          availability: {
            where: { status: 'available' },
            select: { schedule: true, timezone: true }
          }
        },
        orderBy: { qualityScore: 'desc' }
      });

      // 🛡️ Filter based on preferences
      const filteredExperts = this.filterExpertsByPreferences(availableExperts, preferences);

      // 💾 Cache results
      await this.redis.setex(cacheKey, 300, JSON.stringify(filteredExperts)); // 5 minutes cache

      this.logger.debug('Available experts retrieved', {
        skillId,
        totalAvailable: availableExperts.length,
        afterFiltering: filteredExperts.length
      });

      return filteredExperts;

    } catch (error) {
      this.logger.error('Failed to find available experts', {
        skillId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 📊 PROCESS PENDING ENROLLMENTS - Background Job
   */
  async processPendingEnrollments() {
    const processingStartTime = performance.now();
    const processingBatchId = this.generateProcessingBatchId();

    try {
      this.logger.info('Processing pending enrollments', { processingBatchId });

      // 🔍 Get Pending Enrollments
      const pendingEnrollments = await this.getPendingEnrollments();

      this.serviceState.pendingEnrollments = pendingEnrollments.length;

      let processed = 0;
      let completed = 0;

      for (const enrollment of pendingEnrollments) {
        try {
          // 🎯 Check if expert is assigned
          if (enrollment.expertId) {
            await this.activateEnrollment(enrollment);
            completed++;
          }

          processed++;

        } catch (error) {
          this.logger.warn('Enrollment processing failed', {
            enrollmentId: enrollment.id,
            error: error.message
          });
        }
      }

      this.serviceState.pendingEnrollments -= completed;
      this.serviceState.activeEnrollments += completed;

      this.logger.business('Pending enrollments processing completed', {
        processingBatchId,
        total: pendingEnrollments.length,
        processed,
        completed,
        processingTime: performance.now() - processingStartTime
      });

    } catch (error) {
      this.logger.error('Pending enrollments processing failed', {
        processingBatchId,
        error: error.message
      });
    }
  }

  /**
   * 🎯 ACTIVATE ENROLLMENT
   */
  async activateEnrollment(enrollment) {
    try {
      // 💾 Update Enrollment Status
      const updatedEnrollment = await this.prisma.enrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'active',
          startDate: new Date(),
          metadata: {
            ...enrollment.metadata,
            activatedAt: new Date().toISOString(),
            activatedBy: 'system'
          }
        },
        include: {
          student: true,
          expert: true,
          skill: true
        }
      });

      // 📈 Initialize Progress Tracking
      await this.progressTracker.initializeProgressTracking(enrollment.id);

      // 📧 Send Activation Notification
      await this.sendEnrollmentActivationNotification(updatedEnrollment);

      this.metrics.enrollmentsCompleted++;

      this.logger.business('Enrollment activated successfully', {
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        expertId: enrollment.expertId,
        skillId: enrollment.skillId
      });

      return updatedEnrollment;

    } catch (error) {
      this.logger.error('Enrollment activation failed', {
        enrollmentId: enrollment.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🔄 CANCEL ENROLLMENT
   */
  async cancelEnrollment(cancellationRequest, context = {}) {
    const startTime = performance.now();
    const cancellationId = this.generateCancellationId();
    const traceId = context.traceId || cancellationId;

    try {
      // ✅ Validate Cancellation Request
      await this.validateCancellationRequest(cancellationRequest);

      // 🔍 Get Enrollment Details
      const enrollment = await this.getEnrollmentDetails(cancellationRequest.enrollmentId);

      if (!enrollment) {
        throw new EnrollmentError('ENROLLMENT_NOT_FOUND', 'Enrollment not found for cancellation');
      }

      // 🕐 Check Cooling Period Eligibility
      const coolingPeriodEligible = this.isWithinCoolingPeriod(enrollment);

      // 💰 Process Refund if Eligible
      let refundResult = null;
      if (coolingPeriodEligible) {
        refundResult = await this.processEnrollmentRefund(enrollment, cancellationRequest.reason);
      }

      // 💾 Update Enrollment Status
      const cancelledEnrollment = await this.updateEnrollmentStatus({
        enrollmentId: cancellationRequest.enrollmentId,
        status: 'cancelled',
        cancellationReason: cancellationRequest.reason,
        refundAmount: refundResult?.amount || 0,
        traceId
      });

      // 🔄 Update Expert Capacity
      if (enrollment.expertId) {
        await this.updateExpertCapacity(enrollment.expertId, -1);
      }

      // 📧 Send Cancellation Notification
      await this.sendCancellationNotification(cancelledEnrollment, refundResult);

      this.logger.business('Enrollment cancelled successfully', {
        cancellationId,
        traceId,
        enrollmentId: cancellationRequest.enrollmentId,
        coolingPeriodEligible,
        refundAmount: refundResult?.amount || 0
      });

      return {
        success: true,
        cancellationId,
        enrollmentId: cancellationRequest.enrollmentId,
        status: 'cancelled',
        coolingPeriodEligible,
        refundProcessed: !!refundResult,
        refundAmount: refundResult?.amount || 0
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
   * 📊 UPDATE ENROLLMENT ANALYTICS - Background Job
   */
  async updateEnrollmentAnalytics() {
    try {
      // 📈 System-wide Enrollment Metrics
      const systemMetrics = await this.calculateSystemEnrollmentMetrics();

      // 🎯 Performance Analytics
      const performanceAnalytics = await this.generateEnrollmentPerformanceAnalytics();

      // 📊 Trend Analysis
      const trendAnalysis = await this.analyzeEnrollmentTrends();

      // 💾 Update Redis Cache
      await this.redis.setex(
        'enrollment_analytics',
        600, // 10 minutes
        JSON.stringify({
          systemMetrics,
          performanceAnalytics,
          trendAnalysis,
          updatedAt: new Date().toISOString()
        })
      );

      this.logger.debug('Enrollment analytics updated', {
        totalEnrollments: systemMetrics.totalEnrollments,
        activeEnrollments: systemMetrics.activeEnrollments,
        successRate: systemMetrics.successRate
      });

    } catch (error) {
      this.logger.error('Enrollment analytics update failed', {
        error: error.message
      });
    }
  }

  /**
   * 📊 GET ENROLLMENT ANALYTICS
   */
  async getEnrollmentAnalytics(timeRange = '30d') {
    const analytics = {
      summary: {
        totalEnrollments: this.serviceState.totalEnrollments,
        activeEnrollments: this.serviceState.activeEnrollments,
        pendingEnrollments: this.serviceState.pendingEnrollments,
        successRate: this.calculateEnrollmentSuccessRate()
      },
      performance: {
        enrollmentStats: {
          initiated: this.metrics.enrollmentsInitiated,
          completed: this.metrics.enrollmentsCompleted,
          failed: this.metrics.enrollmentsFailed,
          averageProcessingTime: this.metrics.averageProcessingTime
        },
        matchingSuccessRate: this.metrics.matchingSuccessRate
      },
      financial: {
        revenueGenerated: this.metrics.revenueGenerated,
        averageRevenuePerEnrollment: this.calculateAverageRevenue(),
        refundRate: await this.calculateRefundRate(timeRange)
      },
      insights: {
        popularSkills: await this.getPopularSkills(timeRange),
        enrollmentTrends: await this.getEnrollmentTrends(timeRange),
        studentSatisfaction: await this.getStudentSatisfactionMetrics(timeRange)
      }
    };

    return analytics;
  }

  /**
   * 🔧 UTILITY METHODS
   */

  generateEnrollmentId() {
    return `enroll_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generatePaymentId() {
    return `pay_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateMatchingBatchId() {
    return `match_batch_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateProcessingBatchId() {
    return `process_batch_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateCancellationId() {
    return `cancel_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  calculateMatchingPriority(enrollmentRecord) {
    // 🎯 Calculate priority based on various factors
    let priority = 0;

    // ⭐ Payment method priority
    if (enrollmentRecord.paymentMethod === 'full_payment') priority += 2;
    
    // 📊 Student history priority
    const studentHistory = this.getStudentEnrollmentHistory(enrollmentRecord.studentId);
    if (studentHistory.previousEnrollments > 0) priority += 1;

    // 🕐 Time in queue penalty
    const timeInQueue = Date.now() - new Date(enrollmentRecord.createdAt).getTime();
    if (timeInQueue > 24 * 60 * 60 * 1000) priority += 3; // 24+ hours

    return priority;
  }

  isWithinCoolingPeriod(enrollment) {
    const enrollmentDate = new Date(enrollment.createdAt);
    const coolingPeriodEnd = new Date(enrollmentDate.getTime() + this.config.enrollment.coolingPeriod * 24 * 60 * 60 * 1000);
    return new Date() <= coolingPeriodEnd;
  }

  filterExpertsByPreferences(experts, preferences) {
    if (!preferences) return experts;

    return experts.filter(expert => {
      // 🎯 Language preference
      if (preferences.language && expert.language !== preferences.language) {
        return false;
      }

      // 🕐 Availability preference
      if (preferences.availability && !this.checkAvailabilityMatch(expert.availability, preferences.availability)) {
        return false;
      }

      // 👥 Gender preference (if specified)
      if (preferences.gender && expert.personalInfo?.gender !== preferences.gender) {
        return false;
      }

      return true;
    });
  }

  generateEnrollmentNextSteps(status) {
    const nextSteps = {
      pending_matching: ['expert_matching', 'system_allocation', 'confirmation_notification'],
      active: ['course_material_access', 'first_session_scheduling', 'progress_tracking_setup'],
      completed: ['certification_processing', 'feedback_collection', 'next_course_recommendation']
    };

    return nextSteps[status] || ['status_verification'];
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
      const backgroundJobsHealthy = this.processingInterval && this.matchingInterval && this.analyticsInterval;

      this.serviceState.healthy = backgroundJobsHealthy;
      this.serviceState.lastHealthCheck = new Date();

      if (!this.serviceState.healthy) {
        this.logger.warn('Enrollment manager health check failed', {
          backgroundJobsHealthy
        });
      }

      return this.serviceState.healthy;

    } catch (error) {
      this.serviceState.healthy = false;
      this.logger.error('Enrollment manager health check failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * 📊 LOAD INITIAL METRICS
   */
  async loadInitialMetrics() {
    try {
      const enrollmentStats = await this.prisma.enrollment.aggregate({
        _count: { id: true },
        _sum: { paymentAmount: true }
      });

      this.serviceState.totalEnrollments = enrollmentStats._count.id;
      this.metrics.revenueGenerated = enrollmentStats._sum.paymentAmount || 0;

      const activeEnrollments = await this.prisma.enrollment.count({
        where: { status: 'active' }
      });

      this.serviceState.activeEnrollments = activeEnrollments;

    } catch (error) {
      this.logger.error('Failed to load initial metrics', {
        error: error.message
      });
    }
  }

  /**
   * 🎯 ERROR HANDLING
   */
  async handleEnrollmentFailure({ enrollmentId, enrollmentRequest, error, context, responseTime, traceId }) {
    this.metrics.enrollmentsFailed++;

    this.logger.error('Enrollment initiation failed', {
      enrollmentId,
      traceId,
      studentId: enrollmentRequest.studentId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2)
    });
  }

  async handleCancellationFailure({ cancellationId, cancellationRequest, error, context, responseTime, traceId }) {
    this.logger.error('Enrollment cancellation failed', {
      cancellationId,
      traceId,
      enrollmentId: cancellationRequest.enrollmentId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2)
    });
  }

  /**
   * 🧹 CLEANUP
   */
  async destroy() {
    if (this.processingInterval) clearInterval(this.processingInterval);
    if (this.matchingInterval) clearInterval(this.matchingInterval);
    if (this.analyticsInterval) clearInterval(this.analyticsInterval);
    
    await this.prisma.$disconnect();
    await this.redis.quit();
  }
}

/**
 * 🎯 ENTERPRISE ENROLLMENT ERROR CLASS
 */
class EnrollmentError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'EnrollmentError';
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

// 🎯 Enterprise Enrollment Error Codes
EnrollmentError.CODES = {
  // 🔐 Validation Errors
  ENROLLMENT_VALIDATION_FAILED: 'ENROLLMENT_VALIDATION_FAILED',
  STUDENT_NOT_ELIGIBLE: 'STUDENT_NOT_ELIGIBLE',
  SKILL_NOT_AVAILABLE: 'SKILL_NOT_AVAILABLE',
  MAX_COURSES_EXCEEDED: 'MAX_COURSES_EXCEEDED',

  // 💰 Payment Errors
  PAYMENT_VALIDATION_FAILED: 'PAYMENT_VALIDATION_FAILED',
  PAYMENT_PROCESSING_FAILED: 'PAYMENT_PROCESSING_FAILED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',

  // 👥 Matching Errors
  NO_EXPERT_AVAILABLE: 'NO_EXPERT_AVAILABLE',
  EXPERT_MATCHING_FAILED: 'EXPERT_MATCHING_FAILED',
  MATCHING_CRITERIA_NOT_MET: 'MATCHING_CRITERIA_NOT_MET',

  // 🔄 Processing Errors
  ENROLLMENT_CREATION_FAILED: 'ENROLLMENT_CREATION_FAILED',
  ENROLLMENT_NOT_FOUND: 'ENROLLMENT_NOT_FOUND',
  ENROLLMENT_ACTIVATION_FAILED: 'ENROLLMENT_ACTIVATION_FAILED',

  // ❌ Cancellation Errors
  CANCELLATION_NOT_ALLOWED: 'CANCELLATION_NOT_ALLOWED',
  REFUND_PROCESSING_FAILED: 'REFUND_PROCESSING_FAILED',
  COOLING_PERIOD_EXPIRED: 'COOLING_PERIOD_EXPIRED'
};

module.exports = {
  EnrollmentManager,
  EnrollmentError
};