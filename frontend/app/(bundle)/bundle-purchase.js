// bundle-purchase.js

/**
 * 🎯 ENTERPRISE BUNDLE PURCHASE SYSTEM
 * Production-ready 1,999 ETB bundle purchase with revenue distribution
 * Features: Payment processing, revenue split, expert matching, quality enforcement
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../utils/logger');
const { PaymentProcessor } = require('../services/payment-processor');
const { RevenueDistributor } = require('../services/revenue-distributor');
const { ExpertMatcher } = require('../services/expert-matcher');
const { RateLimiterRedis } = require('rate-limiter-flexible');

class BundlePurchaseSystem extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('BundlePurchaseSystem');
    this.paymentProcessor = new PaymentProcessor();
    this.revenueDistributor = new RevenueDistributor();
    this.expertMatcher = new ExpertMatcher();

    // Bundle configuration
    this.bundleConfig = {
      price: 1999, // ETB
      revenueSplit: {
        mosa: 1000, // 50.03%
        expert: 999  // 49.97%
      },
      payoutSchedule: [333, 333, 333], // 333/333/333 payout
      validityPeriod: 120, // days (4 months)
      coolingPeriod: 7, // days for refund
      maxActiveBundles: 3 // per student
    };

    // Rate limiting: max 5 purchases per hour per student
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (req) => `purchase_limit:${req.studentId}`,
      points: 5,
      duration: 3600,
    });

    this.initialize();
  }

  /**
   * Initialize purchase system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.paymentProcessor.initialize();
      await this.revenueDistributor.initialize();
      
      this.logger.info('Bundle purchase system initialized successfully');
      
      // Start background jobs
      this.startBackgroundJobs();
      
    } catch (error) {
      this.logger.error('Failed to initialize bundle purchase system', error);
      throw error;
    }
  }

  /**
   * 🎯 PURCHASE BUNDLE - Core purchase flow
   */
  async purchaseBundle(purchaseData) {
    const startTime = performance.now();
    const transactionId = this.generateTransactionId();

    try {
      this.logger.info('Starting bundle purchase', { transactionId, ...purchaseData });

      // 🛡️ VALIDATION PHASE
      await this.validatePurchaseRequest(purchaseData);

      // 💰 PAYMENT PROCESSING
      const paymentResult = await this.processPayment(purchaseData, transactionId);

      // 📦 BUNDLE CREATION
      const bundle = await this.createStudentBundle(purchaseData, paymentResult);

      // 💸 REVENUE DISTRIBUTION
      const revenueResult = await this.distributeRevenue(bundle, paymentResult);

      // 👨‍🏫 EXPERT MATCHING
      const matchingResult = await this.matchExpertToStudent(bundle);

      // 📊 REAL-TIME UPDATES
      await this.updateRealTimeMetrics(bundle, revenueResult, matchingResult);

      // 🔔 EMIT EVENTS
      this.emit('bundlePurchased', {
        bundle,
        paymentResult,
        revenueResult,
        matchingResult,
        transactionId
      });

      const processingTime = performance.now() - startTime;
      this.logger.metric('bundle_purchase_time', processingTime, {
        studentId: purchaseData.studentId,
        skillId: purchaseData.skillId,
        transactionId
      });

      return {
        success: true,
        bundleId: bundle.id,
        transactionId,
        paymentStatus: 'COMPLETED',
        expertAssigned: matchingResult.expert ? matchingResult.expert.id : null,
        revenueSplit: revenueResult,
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Bundle purchase failed', error, { transactionId, purchaseData });
      
      // Emit failure event
      this.emit('bundlePurchaseFailed', {
        transactionId,
        purchaseData,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 🛡️ COMPREHENSIVE PURCHASE VALIDATION
   */
  async validatePurchaseRequest(purchaseData) {
    const {
      studentId,
      skillId,
      paymentMethod,
      paymentDetails,
      installmentPlan
    } = purchaseData;

    // Required fields validation
    if (!studentId || !skillId || !paymentMethod) {
      throw new Error('MISSING_REQUIRED_FIELDS');
    }

    // Student validation
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { 
        activeBundles: {
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

    // Skill validation
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId }
    });

    if (!skill) {
      throw new Error('SKILL_NOT_FOUND');
    }

    if (skill.status !== 'ACTIVE') {
      throw new Error('SKILL_NOT_AVAILABLE');
    }

    // Active bundles limit
    if (student.activeBundles.length >= this.bundleConfig.maxActiveBundles) {
      throw new Error('MAX_ACTIVE_BUNDLES_REACHED');
    }

    // Rate limiting
    try {
      await this.rateLimiter.consume(`student:${studentId}`);
    } catch (rateLimitError) {
      throw new Error('PURCHASE_RATE_LIMIT_EXCEEDED');
    }

    // Payment method validation
    const validPaymentMethods = ['TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER', 'CARD'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      throw new Error('INVALID_PAYMENT_METHOD');
    }

    // Installment plan validation
    if (installmentPlan) {
      const validPlans = ['FULL', 'TWO_PART', 'THREE_PART'];
      if (!validPlans.includes(installmentPlan)) {
        throw new Error('INVALID_INSTALLMENT_PLAN');
      }
    }

    // Mindset phase completion check (if applicable)
    if (skill.requiresMindsetCompletion) {
      const mindsetCompletion = await this.checkMindsetCompletion(studentId, skillId);
      if (!mindsetCompletion.completed) {
        throw new Error('MINDSET_PHASE_NOT_COMPLETED');
      }
    }

    this.logger.debug('Purchase validation passed', { studentId, skillId });
  }

  /**
   * 💰 PAYMENT PROCESSING
   */
  async processPayment(purchaseData, transactionId) {
    const {
      studentId,
      skillId,
      paymentMethod,
      paymentDetails,
      installmentPlan
    } = purchaseData;

    try {
      const paymentPayload = {
        amount: this.bundleConfig.price,
        currency: 'ETB',
        studentId,
        skillId,
        paymentMethod,
        paymentDetails: this.sanitizePaymentDetails(paymentDetails),
        installmentPlan: installmentPlan || 'FULL',
        metadata: {
          transactionId,
          bundleType: 'STANDARD_1999',
          timestamp: new Date().toISOString()
        }
      };

      const paymentResult = await this.paymentProcessor.processPayment(paymentPayload);

      if (!paymentResult.success) {
        throw new Error(`PAYMENT_FAILED: ${paymentResult.error}`);
      }

      // Record payment in database
      const paymentRecord = await this.prisma.payment.create({
        data: {
          studentId,
          skillId,
          amount: this.bundleConfig.price,
          currency: 'ETB',
          paymentMethod,
          transactionId: paymentResult.transactionId,
          gatewayTransactionId: paymentResult.gatewayTransactionId,
          status: paymentResult.status,
          installmentPlan: installmentPlan || 'FULL',
          metadata: {
            ...paymentResult.metadata,
            revenueSplit: this.bundleConfig.revenueSplit
          }
        }
      });

      this.logger.info('Payment processed successfully', {
        transactionId,
        paymentRecordId: paymentRecord.id,
        amount: this.bundleConfig.price
      });

      return {
        ...paymentResult,
        paymentRecordId: paymentRecord.id
      };

    } catch (error) {
      this.logger.error('Payment processing failed', error, { transactionId });
      throw new Error(`PAYMENT_PROCESSING_FAILED: ${error.message}`);
    }
  }

  /**
   * 📦 CREATE STUDENT BUNDLE
   */
  async createStudentBundle(purchaseData, paymentResult) {
    const {
      studentId,
      skillId,
      installmentPlan
    } = purchaseData;

    const bundleExpiry = new Date();
    bundleExpiry.setDate(bundleExpiry.getDate() + this.bundleConfig.validityPeriod);

    const coolingPeriodEnd = new Date();
    coolingPeriodEnd.setDate(coolingPeriodEnd.getDate() + this.bundleConfig.coolingPeriod);

    return await this.prisma.studentBundle.create({
      data: {
        studentId,
        skillId,
        paymentId: paymentResult.paymentRecordId,
        price: this.bundleConfig.price,
        status: 'ACTIVE',
        installmentPlan: installmentPlan || 'FULL',
        coolingPeriodEnd,
        expiryDate: bundleExpiry,
        revenueSplit: this.bundleConfig.revenueSplit,
        payoutSchedule: this.bundleConfig.payoutSchedule,
        currentPayoutIndex: 0,
        metadata: {
          purchaseTime: new Date().toISOString(),
          transactionId: paymentResult.transactionId,
          features: [
            'MINDSET_PHASE',
            'THEORY_PHASE',
            'HANDS_ON_TRAINING',
            'CERTIFICATION',
            'YACHI_VERIFICATION'
          ]
        }
      },
      include: {
        student: {
          select: { name: true, faydaId: true, phone: true }
        },
        skill: {
          select: { name: true, category: true, duration: true }
        }
      }
    });
  }

  /**
   * 💸 REVENUE DISTRIBUTION
   */
  async distributeRevenue(bundle, paymentResult) {
    try {
      const distributionResult = await this.revenueDistributor.distributeRevenue({
        bundleId: bundle.id,
        studentId: bundle.studentId,
        skillId: bundle.skillId,
        totalAmount: bundle.price,
        revenueSplit: bundle.revenueSplit,
        payoutSchedule: bundle.payoutSchedule,
        paymentRecordId: paymentResult.paymentRecordId
      });

      // Update bundle with distribution info
      await this.prisma.studentBundle.update({
        where: { id: bundle.id },
        data: {
          revenueDistributionId: distributionResult.distributionId,
          firstPayoutScheduled: distributionResult.firstPayoutDate
        }
      });

      this.logger.info('Revenue distribution scheduled', {
        bundleId: bundle.id,
        distributionId: distributionResult.distributionId
      });

      return distributionResult;

    } catch (error) {
      this.logger.error('Revenue distribution failed', error, { bundleId: bundle.id });
      
      // Mark bundle for manual review
      await this.prisma.studentBundle.update({
        where: { id: bundle.id },
        data: { status: 'REVENUE_DISTRIBUTION_FAILED' }
      });

      throw new Error(`REVENUE_DISTRIBUTION_FAILED: ${error.message}`);
    }
  }

  /**
   * 👨‍🏫 EXPERT MATCHING
   */
  async matchExpertToStudent(bundle) {
    try {
      const matchingCriteria = {
        skillId: bundle.skillId,
        studentLevel: 'BEGINNER',
        preferredTier: 'MASTER', // Start with highest quality
        location: bundle.student.location, // If available
        language: bundle.student.language || 'amharic'
      };

      const matchingResult = await this.expertMatcher.findBestExpert(matchingCriteria);

      if (!matchingResult.expert) {
        this.logger.warn('No expert available for immediate matching', { bundleId: bundle.id });
        
        // Queue for expert matching
        await this.queueForExpertMatching(bundle);
        
        return {
          status: 'QUEUED',
          estimatedWaitTime: '24-48 hours',
          queuePosition: await this.getQueuePosition(bundle.id)
        };
      }

      // Create enrollment with matched expert
      const enrollment = await this.createEnrollment(bundle, matchingResult.expert);

      // Update bundle with expert info
      await this.prisma.studentBundle.update({
        where: { id: bundle.id },
        data: {
          assignedExpertId: matchingResult.expert.id,
          enrollmentId: enrollment.id,
          matchingScore: matchingResult.score
        }
      });

      this.logger.info('Expert matched successfully', {
        bundleId: bundle.id,
        expertId: matchingResult.expert.id,
        matchingScore: matchingResult.score
      });

      return {
        status: 'MATCHED',
        expert: matchingResult.expert,
        enrollmentId: enrollment.id,
        matchingScore: matchingResult.score
      };

    } catch (error) {
      this.logger.error('Expert matching failed', error, { bundleId: bundle.id });
      
      // Queue for retry
      await this.queueForExpertMatching(bundle);
      
      return {
        status: 'QUEUED_RETRY',
        error: error.message
      };
    }
  }

  /**
   * 🎓 CREATE ENROLLMENT
   */
  async createEnrollment(bundle, expert) {
    const startDate = new Date();
    const theoryEndDate = new Date(startDate);
    theoryEndDate.setDate(theoryEndDate.getDate() + 60); // 2 months theory

    const handsOnEndDate = new Date(theoryEndDate);
    handsOnEndDate.setDate(handsOnEndDate.getDate() + 60); // 2 months hands-on

    return await this.prisma.enrollment.create({
      data: {
        studentId: bundle.studentId,
        expertId: expert.id,
        skillId: bundle.skillId,
        bundleId: bundle.id,
        startDate,
        theoryEndDate,
        handsOnEndDate,
        status: 'ACTIVE',
        currentPhase: 'MINDSET',
        progress: 0,
        qualityMetrics: {
          expertRating: expert.qualityScore,
          expectedCompletion: handsOnEndDate,
          sessionQuality: 0,
          studentSatisfaction: 0
        }
      }
    });
  }

  /**
   * 📊 UPDATE REAL-TIME METRICS
   */
  async updateRealTimeMetrics(bundle, revenueResult, matchingResult) {
    const pipeline = this.redis.pipeline();

    // Update student metrics
    pipeline.hincrby(`student:${bundle.studentId}:metrics`, 'totalBundles', 1);
    pipeline.hset(`student:${bundle.studentId}:metrics`, 'lastBundlePurchase', new Date().toISOString());

    // Update skill metrics
    pipeline.hincrby(`skill:${bundle.skillId}:metrics`, 'totalEnrollments', 1);
    pipeline.zincrby('skill_popularity', 1, bundle.skillId);

    // Update platform metrics
    pipeline.hincrby('platform:metrics', 'totalRevenue', bundle.price);
    pipeline.hincrby('platform:metrics', 'totalBundles', 1);
    pipeline.hincrby('platform:metrics', 'activeStudents', 1);

    // Update revenue metrics
    if (revenueResult.distributionId) {
      pipeline.hincrby('revenue:metrics', 'distributedAmount', bundle.price);
    }

    await pipeline.exec();

    this.logger.debug('Real-time metrics updated', { bundleId: bundle.id });
  }

  /**
   * 🔄 QUEUE FOR EXPERT MATCHING
   */
  async queueForExpertMatching(bundle) {
    const queueData = {
      bundleId: bundle.id,
      studentId: bundle.studentId,
      skillId: bundle.skillId,
      queuedAt: new Date(),
      priority: 'NORMAL',
      retryCount: 0
    };

    await this.redis.lpush('expert_matching_queue', JSON.stringify(queueData));
    await this.redis.hset(`bundle:${bundle.id}:matching`, 'status', 'queued');

    this.logger.info('Bundle queued for expert matching', { bundleId: bundle.id });
  }

  /**
   * 📍 GET QUEUE POSITION
   */
  async getQueuePosition(bundleId) {
    const queue = await this.redis.lrange('expert_matching_queue', 0, -1);
    const position = queue.findIndex(item => {
      const data = JSON.parse(item);
      return data.bundleId === bundleId;
    });
    
    return position >= 0 ? position + 1 : null;
  }

  /**
   * 🧠 CHECK MINDSET COMPLETION
   */
  async checkMindsetCompletion(studentId, skillId) {
    const cacheKey = `mindset:completion:${studentId}:${skillId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const completion = await this.prisma.mindsetCompletion.findFirst({
      where: {
        studentId,
        skillId,
        status: 'COMPLETED'
      },
      select: {
        completedAt: true,
        score: true,
        assessmentResults: true
      }
    });

    const result = {
      completed: !!completion,
      ...completion
    };

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));

    return result;
  }

  /**
   * 🧹 SANITIZE PAYMENT DETAILS
   */
  sanitizePaymentDetails(paymentDetails) {
    if (!paymentDetails) return {};

    const sanitized = { ...paymentDetails };
    
    // Remove sensitive information
    delete sanitized.cvv;
    delete sanitized.pin;
    delete sanitized.password;

    // Mask card numbers
    if (sanitized.cardNumber) {
      sanitized.cardNumber = `****${sanitized.cardNumber.slice(-4)}`;
    }

    // Mask account numbers
    if (sanitized.accountNumber) {
      sanitized.accountNumber = `****${sanitized.accountNumber.slice(-4)}`;
    }

    return sanitized;
  }

  /**
   * 🆔 GENERATE TRANSACTION ID
   */
  generateTransactionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `MOSA_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * 🔄 START BACKGROUND JOBS
   */
  startBackgroundJobs() {
    // Process expert matching queue every 5 minutes
    setInterval(() => this.processExpertMatchingQueue(), 5 * 60 * 1000);

    // Clean up expired bundles daily
    setInterval(() => this.cleanupExpiredBundles(), 24 * 60 * 60 * 1000);

    // Monitor payment statuses hourly
    setInterval(() => this.monitorPaymentStatuses(), 60 * 60 * 1000);

    this.logger.info('Background jobs started');
  }

  /**
   * 🔄 PROCESS EXPERT MATCHING QUEUE
   */
  async processExpertMatchingQueue() {
    try {
      const queueLength = await this.redis.llen('expert_matching_queue');
      
      if (queueLength === 0) return;

      this.logger.debug('Processing expert matching queue', { queueLength });

      // Process up to 10 items per run
      for (let i = 0; i < Math.min(queueLength, 10); i++) {
        const queueItem = await this.redis.rpop('expert_matching_queue');
        if (!queueItem) continue;

        const data = JSON.parse(queueItem);
        await this.retryExpertMatching(data);
      }
    } catch (error) {
      this.logger.error('Expert matching queue processing failed', error);
    }
  }

  /**
   * 🔄 RETRY EXPERT MATCHING
   */
  async retryExpertMatching(queueData) {
    const { bundleId, studentId, skillId, retryCount } = queueData;

    try {
      const bundle = await this.prisma.studentBundle.findUnique({
        where: { id: bundleId },
        include: { student: true, skill: true }
      });

      if (!bundle || bundle.status !== 'ACTIVE') {
        this.logger.warn('Bundle not found or inactive for matching', { bundleId });
        return;
      }

      const matchingResult = await this.matchExpertToStudent(bundle);

      if (matchingResult.status === 'MATCHED') {
        this.logger.info('Expert matched from queue', { bundleId, retryCount });
        return;
      }

      // Retry logic
      if (retryCount < 5) {
        queueData.retryCount++;
        queueData.lastRetry = new Date();
        
        // Exponential backoff
        const backoffDelay = Math.min(5 * 60 * 1000 * Math.pow(2, retryCount), 24 * 60 * 60 * 1000);
        setTimeout(() => {
          this.redis.lpush('expert_matching_queue', JSON.stringify(queueData));
        }, backoffDelay);
      } else {
        this.logger.error('Max retries reached for expert matching', { bundleId });
        await this.prisma.studentBundle.update({
          where: { id: bundleId },
          data: { status: 'EXPERT_MATCHING_FAILED' }
        });
      }

    } catch (error) {
      this.logger.error('Expert matching retry failed', error, { bundleId });
    }
  }

  /**
   * 🗑️ CLEANUP EXPIRED BUNDLES
   */
  async cleanupExpiredBundles() {
    try {
      const expiredBundles = await this.prisma.studentBundle.findMany({
        where: {
          expiryDate: { lt: new Date() },
          status: 'ACTIVE'
        },
        select: { id: true, studentId: true }
      });

      for (const bundle of expiredBundles) {
        await this.prisma.studentBundle.update({
          where: { id: bundle.id },
          data: { status: 'EXPIRED' }
        });

        this.logger.info('Bundle expired', { bundleId: bundle.id, studentId: bundle.studentId });
      }

      this.logger.info('Expired bundles cleanup completed', { count: expiredBundles.length });
    } catch (error) {
      this.logger.error('Expired bundles cleanup failed', error);
    }
  }

  /**
   * 📊 MONITOR PAYMENT STATUSES
   */
  async monitorPaymentStatuses() {
    try {
      const pendingPayments = await this.prisma.payment.findMany({
        where: {
          status: 'PENDING',
          createdAt: { 
            lt: new Date(Date.now() - 30 * 60 * 1000) // Older than 30 minutes
          }
        },
        include: {
          bundle: true
        }
      });

      for (const payment of pendingPayments) {
        const status = await this.paymentProcessor.checkPaymentStatus(payment.transactionId);
        
        if (status !== 'PENDING') {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status }
          });

          if (status === 'FAILED' && payment.bundle) {
            await this.prisma.studentBundle.update({
              where: { id: payment.bundle.id },
              data: { status: 'PAYMENT_FAILED' }
            });
          }
        }
      }

      this.logger.debug('Payment status monitoring completed', { count: pendingPayments.length });
    } catch (error) {
      this.logger.error('Payment status monitoring failed', error);
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
      await this.revenueDistributor.destroy();
      
      this.removeAllListeners();
      this.logger.info('Bundle purchase system resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new BundlePurchaseSystem();