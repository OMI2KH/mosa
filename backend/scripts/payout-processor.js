// scripts/payout-processor.js

/**
 * 💰 ENTERPRISE PAYOUT PROCESSOR
 * Production-ready payment processing for Mosa Forge
 * Features: 333/333/333 payout schedule, revenue distribution, quality bonuses
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../utils/logger');
const { PaymentValidator } = require('../utils/payment-utils');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const axios = require('axios');

class PayoutProcessor extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('PayoutProcessor');
    this.validator = new PaymentValidator();
    
    // Payment gateway clients
    this.telebirrClient = this.createTelebirrClient();
    this.cbeBirrClient = this.createCbeBirrClient();
    
    // Rate limiting for payment APIs
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (key) => `payout_limit:${key}`,
      points: 100, // 100 payouts per minute
      duration: 60,
    });

    // Configuration
    this.config = {
      BUNDLE_PRICE: 1999,
      MOSA_SHARE: 1000,
      EXPERT_SHARE: 999,
      PAYOUT_SCHEDULE: [333, 333, 333], // 333/333/333 structure
      QUALITY_BONUS_RATES: {
        MASTER: 0.20, // 20% bonus
        SENIOR: 0.10, // 10% bonus  
        STANDARD: 0.00, // Base rate
        DEVELOPING: -0.10, // 10% penalty
        PROBATION: -0.20 // 20% penalty
      },
      MAX_RETRIES: 3,
      RETRY_DELAY: 5000 // 5 seconds
    };

    this.initialize();
  }

  /**
   * Initialize payout processor
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.warmUpPendingPayouts();
      this.startScheduledProcessing();
      this.logger.info('Payout processor initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize payout processor', error);
      throw error;
    }
  }

  /**
   * 🎯 PROCESS ENROLLMENT PAYMENT - Core payment processing
   */
  async processEnrollmentPayment(paymentData) {
    const startTime = performance.now();
    const transactionId = this.generateTransactionId();

    try {
      this.logger.info('Processing enrollment payment', { 
        transactionId, 
        studentId: paymentData.studentId,
        amount: this.config.BUNDLE_PRICE 
      });

      // 🛡️ VALIDATION PHASE
      await this.validatePaymentData(paymentData);

      // 💳 PAYMENT GATEWAY PROCESSING
      const paymentResult = await this.processPaymentGateway(paymentData, transactionId);

      // 💰 REVENUE DISTRIBUTION
      const distribution = await this.distributeRevenue(paymentData, paymentResult);

      // 📊 RECORD KEEPING
      await this.recordTransaction(paymentData, paymentResult, distribution, transactionId);

      // 🔔 NOTIFICATIONS
      await this.sendPaymentNotifications(paymentData, distribution);

      const processingTime = performance.now() - startTime;
      
      this.logger.metric('payment_processing_time', processingTime, {
        transactionId,
        studentId: paymentData.studentId,
        amount: this.config.BUNDLE_PRICE
      });

      this.emit('paymentProcessed', {
        transactionId,
        studentId: paymentData.studentId,
        expertId: paymentData.expertId,
        distribution,
        processingTime
      });

      return {
        success: true,
        transactionId,
        distribution,
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Payment processing failed', error, { 
        transactionId, 
        paymentData 
      });
      
      await this.handlePaymentFailure(paymentData, error, transactionId);
      throw error;
    }
  }

  /**
   * 🛡️ COMPREHENSIVE PAYMENT VALIDATION
   */
  async validatePaymentData(paymentData) {
    const { studentId, expertId, enrollmentId, paymentMethod, amount } = paymentData;

    // Required fields validation
    if (!studentId || !expertId || !enrollmentId || !paymentMethod) {
      throw new Error('MISSING_REQUIRED_PAYMENT_FIELDS');
    }

    // Amount validation
    if (amount !== this.config.BUNDLE_PRICE) {
      throw new Error('INVALID_PAYMENT_AMOUNT');
    }

    // Rate limiting
    try {
      await this.rateLimiter.consume(`student:${studentId}`);
    } catch (rateLimitError) {
      throw new Error('PAYMENT_RATE_LIMIT_EXCEEDED');
    }

    // Student validation
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, status: true, faydaId: true }
    });

    if (!student) {
      throw new Error('STUDENT_NOT_FOUND');
    }

    if (student.status !== 'ACTIVE') {
      throw new Error('STUDENT_NOT_ACTIVE');
    }

    // Expert validation
    const expert = await this.prisma.expert.findUnique({
      where: { id: expertId },
      select: { id: true, status: true, currentTier: true, qualityScore: true }
    });

    if (!expert) {
      throw new Error('EXPERT_NOT_FOUND');
    }

    if (expert.status !== 'ACTIVE') {
      throw new Error('EXPERT_NOT_ACTIVE');
    }

    // Enrollment validation
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { payments: true }
    });

    if (!enrollment) {
      throw new Error('ENROLLMENT_NOT_FOUND');
    }

    if (enrollment.status !== 'PENDING_PAYMENT') {
      throw new Error('INVALID_ENROLLMENT_STATUS');
    }

    // Duplicate payment prevention
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        enrollmentId,
        status: { in: ['SUCCESS', 'PENDING'] }
      }
    });

    if (existingPayment) {
      throw new Error('DUPLICATE_PAYMENT_ATTEMPT');
    }

    this.logger.debug('Payment validation passed', { studentId, expertId, enrollmentId });
  }

  /**
   * 💳 PAYMENT GATEWAY PROCESSING
   */
  async processPaymentGateway(paymentData, transactionId) {
    const { paymentMethod, amount, studentId } = paymentData;
    
    let paymentResult;

    try {
      switch (paymentMethod) {
        case 'TELEBIRR':
          paymentResult = await this.processTelebirrPayment({
            amount,
            studentId,
            transactionId
          });
          break;

        case 'CBE_BIRR':
          paymentResult = await this.processCbeBirrPayment({
            amount,
            studentId,
            transactionId
          });
          break;

        default:
          throw new Error('UNSUPPORTED_PAYMENT_METHOD');
      }

      if (!paymentResult.success) {
        throw new Error(`PAYMENT_GATEWAY_FAILED: ${paymentResult.errorCode}`);
      }

      return paymentResult;

    } catch (error) {
      this.logger.error('Payment gateway processing failed', error, {
        transactionId,
        paymentMethod,
        amount
      });
      throw error;
    }
  }

  /**
   * 📱 TELEBIRR PAYMENT PROCESSING
   */
  async processTelebirrPayment(paymentRequest) {
    const maxRetries = this.config.MAX_RETRIES;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.telebirrClient.post('/payment/initiate', {
          amount: paymentRequest.amount,
          customerId: paymentRequest.studentId,
          transactionId: paymentRequest.transactionId,
          callbackUrl: `${process.env.API_BASE_URL}/payments/telebirr/callback`
        });

        if (response.data.status === 'SUCCESS') {
          return {
            success: true,
            gateway: 'TELEBIRR',
            gatewayTransactionId: response.data.transactionId,
            amount: paymentRequest.amount,
            timestamp: new Date()
          };
        }

        // If not successful, retry after delay
        if (attempt < maxRetries) {
          await this.delay(this.config.RETRY_DELAY);
        }

      } catch (error) {
        this.logger.warn(`Telebirr payment attempt ${attempt} failed`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`TELEBIRR_PAYMENT_FAILED: ${error.message}`);
        }
        
        await this.delay(this.config.RETRY_DELAY);
      }
    }

    throw new Error('TELEBIRR_PAYMENT_MAX_RETRIES_EXCEEDED');
  }

  /**
   * 🏦 CBE BIRR PAYMENT PROCESSING
   */
  async processCbeBirrPayment(paymentRequest) {
    const maxRetries = this.config.MAX_RETRIES;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.cbeBirrClient.post('/transaction/initiate', {
          amount: paymentRequest.amount,
          customerId: paymentRequest.studentId,
          referenceNumber: paymentRequest.transactionId,
          description: `Mosa Forge Enrollment - ${paymentRequest.transactionId}`
        });

        if (response.data.responseCode === '00') { // Success code
          return {
            success: true,
            gateway: 'CBE_BIRR',
            gatewayTransactionId: response.data.transactionId,
            amount: paymentRequest.amount,
            timestamp: new Date()
          };
        }

        if (attempt < maxRetries) {
          await this.delay(this.config.RETRY_DELAY);
        }

      } catch (error) {
        this.logger.warn(`CBE Birr payment attempt ${attempt} failed`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`CBE_BIRR_PAYMENT_FAILED: ${error.message}`);
        }
        
        await this.delay(this.config.RETRY_DELAY);
      }
    }

    throw new Error('CBE_BIRR_PAYMENT_MAX_RETRIES_EXCEEDED');
  }

  /**
   * 💰 REVENUE DISTRIBUTION - 1000/999 split with quality bonuses
   */
  async distributeRevenue(paymentData, paymentResult) {
    const { expertId, enrollmentId } = paymentData;
    
    return await this.prisma.$transaction(async (tx) => {
      // Get expert current tier and quality score
      const expert = await tx.expert.findUnique({
        where: { id: expertId },
        select: { currentTier: true, qualityScore: true }
      });

      // Calculate quality bonus
      const bonusRate = this.config.QUALITY_BONUS_RATES[expert.currentTier] || 0;
      const bonusAmount = Math.floor(this.config.EXPERT_SHARE * bonusRate);
      const totalExpertShare = this.config.EXPERT_SHARE + bonusAmount;

      // Create payout schedule (333/333/333)
      const payoutSchedule = this.config.PAYOUT_SCHEDULE.map((amount, index) => ({
        amount: index === 0 ? amount + bonusAmount : amount, // Add bonus to first payout
        scheduledDate: this.calculatePayoutDate(index),
        status: index === 0 ? 'PENDING' : 'SCHEDULED',
        type: index === 0 ? 'UPFRONT' : index === 1 ? 'MILESTONE' : 'COMPLETION'
      }));

      // Record platform revenue
      const platformRevenue = await tx.platformRevenue.create({
        data: {
          enrollmentId,
          amount: this.config.MOSA_SHARE,
          type: 'ENROLLMENT',
          status: 'RECEIVED',
          metadata: {
            bundlePrice: this.config.BUNDLE_PRICE,
            expertShare: this.config.EXPERT_SHARE,
            qualityBonus: bonusAmount,
            expertTier: expert.currentTier
          }
        }
      });

      // Create expert payouts
      const expertPayouts = await tx.expertPayout.createMany({
        data: payoutSchedule.map(payout => ({
          expertId,
          enrollmentId,
          amount: payout.amount,
          scheduledDate: payout.scheduledDate,
          status: payout.status,
          type: payout.type,
          qualityBonus: payout.type === 'UPFRONT' ? bonusAmount : 0,
          baseAmount: this.config.EXPERT_SHARE / 3
        }))
      });

      // Update enrollment status
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: { 
          status: 'ACTIVE',
          startedAt: new Date()
        }
      });

      const distribution = {
        platformRevenue: {
          amount: this.config.MOSA_SHARE,
          revenueId: platformRevenue.id
        },
        expertPayouts: {
          baseAmount: this.config.EXPERT_SHARE,
          qualityBonus: bonusAmount,
          totalAmount: totalExpertShare,
          payoutCount: payoutSchedule.length,
          tier: expert.currentTier,
          bonusRate: bonusRate
        },
        payoutSchedule
      };

      this.logger.info('Revenue distributed successfully', {
        enrollmentId,
        expertId,
        distribution
      });

      return distribution;

    }, {
      maxWait: 10000,
      timeout: 30000
    });
  }

  /**
   * 📊 RECORD PAYMENT TRANSACTION
   */
  async recordTransaction(paymentData, paymentResult, distribution, transactionId) {
    await this.prisma.payment.create({
      data: {
        id: transactionId,
        studentId: paymentData.studentId,
        expertId: paymentData.expertId,
        enrollmentId: paymentData.enrollmentId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        gateway: paymentResult.gateway,
        gatewayTransactionId: paymentResult.gatewayTransactionId,
        status: 'SUCCESS',
        revenueDistribution: distribution,
        metadata: {
          processingTime: paymentResult.timestamp,
          bundlePrice: this.config.BUNDLE_PRICE,
          qualityBonus: distribution.expertPayouts.qualityBonus
        }
      }
    });

    // Cache payment success for quick access
    await this.redis.setex(
      `payment:success:${transactionId}`, 
      3600, 
      JSON.stringify({ status: 'SUCCESS', enrollmentId: paymentData.enrollmentId })
    );
  }

  /**
   * 🔔 SEND PAYMENT NOTIFICATIONS
   */
  async sendPaymentNotifications(paymentData, distribution) {
    const { studentId, expertId } = paymentData;
    
    const notifications = [];

    // Student notification
    notifications.push(
      this.sendStudentNotification(studentId, {
        type: 'PAYMENT_SUCCESS',
        amount: paymentData.amount,
        enrollmentId: paymentData.enrollmentId
      })
    );

    // Expert notification (first payout)
    const firstPayout = distribution.payoutSchedule[0];
    notifications.push(
      this.sendExpertNotification(expertId, {
        type: 'ENROLLMENT_CONFIRMED',
        studentId,
        payoutAmount: firstPayout.amount,
        scheduledDate: firstPayout.scheduledDate,
        qualityBonus: distribution.expertPayouts.qualityBonus
      })
    );

    // Platform notification
    notifications.push(
      this.sendPlatformNotification({
        type: 'REVENUE_RECEIVED',
        amount: distribution.platformRevenue.amount,
        enrollmentId: paymentData.enrollmentId,
        transactionId: paymentData.transactionId
      })
    );

    await Promise.allSettled(notifications);
  }

  /**
   * ⏰ SCHEDULED PAYOUT PROCESSING
   */
  async processScheduledPayouts() {
    const startTime = performance.now();
    const today = new Date();
    
    try {
      this.logger.info('Starting scheduled payout processing', { date: today });

      // Find due payouts
      const duePayouts = await this.prisma.expertPayout.findMany({
        where: {
          scheduledDate: {
            lte: today
          },
          status: {
            in: ['SCHEDULED', 'PENDING', 'FAILED']
          }
        },
        include: {
          expert: {
            select: {
              id: true,
              name: true,
              paymentMethod: true,
              paymentDetails: true,
              currentTier: true
            }
          },
          enrollment: {
            select: {
              id: true,
              student: {
                select: { name: true }
              }
            }
          }
        }
      });

      this.logger.info(`Found ${duePayouts.length} due payouts`);

      let successfulPayouts = 0;
      let failedPayouts = 0;

      // Process payouts in batches
      const batchSize = 10;
      for (let i = 0; i < duePayouts.length; i += batchSize) {
        const batch = duePayouts.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(payout => this.processSinglePayout(payout))
        );

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successfulPayouts++;
          } else {
            failedPayouts++;
            this.logger.error('Payout processing failed', result.reason, {
              payoutId: batch[index].id
            });
          }
        });

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < duePayouts.length) {
          await this.delay(1000);
        }
      }

      const processingTime = performance.now() - startTime;
      
      this.logger.metric('scheduled_payouts_processed', {
        total: duePayouts.length,
        successful: successfulPayouts,
        failed: failedPayouts,
        processingTime
      });

      this.emit('scheduledPayoutsCompleted', {
        total: duePayouts.length,
        successful: successfulPayouts,
        failed: failedPayouts,
        processingTime
      });

      return { successful: successfulPayouts, failed: failedPayouts, total: duePayouts.length };

    } catch (error) {
      this.logger.error('Scheduled payout processing failed', error);
      throw error;
    }
  }

  /**
   * 💸 PROCESS SINGLE PAYOUT
   */
  async processSinglePayout(payout) {
    return await this.prisma.$transaction(async (tx) => {
      try {
        // Update payout status to processing
        await tx.expertPayout.update({
          where: { id: payout.id },
          data: { status: 'PROCESSING', processedAt: new Date() }
        });

        // Process payment based on expert's preferred method
        const paymentResult = await this.processExpertPayment(payout);

        // Update payout status to completed
        await tx.expertPayout.update({
          where: { id: payout.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            gatewayTransactionId: paymentResult.gatewayTransactionId,
            metadata: {
              ...payout.metadata,
              paymentGateway: paymentResult.gateway,
              processedAt: new Date().toISOString()
            }
          }
        });

        // Send notification to expert
        await this.sendExpertNotification(payout.expertId, {
          type: 'PAYOUT_COMPLETED',
          amount: payout.amount,
          payoutId: payout.id,
          type: payout.type
        });

        this.logger.info('Payout processed successfully', {
          payoutId: payout.id,
          expertId: payout.expertId,
          amount: payout.amount
        });

        return { success: true, payoutId: payout.id };

      } catch (error) {
        // Update payout status to failed
        await tx.expertPayout.update({
          where: { id: payout.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
            retryCount: { increment: 1 },
            nextRetryAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Retry in 24 hours
          }
        });

        throw error;
      }
    });
  }

  /**
   * 🏦 PROCESS EXPERT PAYMENT
   */
  async processExpertPayment(payout) {
    const { expert, amount } = payout;
    
    switch (expert.paymentMethod) {
      case 'BANK_TRANSFER':
        return await this.processBankTransfer(expert, amount);
      
      case 'TELEBIRR':
        return await this.processTelebirrPayout(expert, amount);
      
      case 'CBE_BIRR':
        return await this.processCbeBirrPayout(expert, amount);
      
      default:
        throw new Error(`UNSUPPORTED_PAYOUT_METHOD: ${expert.paymentMethod}`);
    }
  }

  /**
   * 🏦 BANK TRANSFER PROCESSING
   */
  async processBankTransfer(expert, amount) {
    // Integration with Ethiopian banking APIs
    const bankDetails = expert.paymentDetails;
    
    const response = await axios.post(`${process.env.BANK_API_URL}/transfer`, {
      accountNumber: bankDetails.accountNumber,
      accountName: bankDetails.accountName,
      amount,
      bankCode: bankDetails.bankCode,
      reference: `MOSA_PAYOUT_${Date.now()}`
    });

    if (response.data.status === 'SUCCESS') {
      return {
        success: true,
        gateway: 'BANK_TRANSFER',
        gatewayTransactionId: response.data.transactionId
      };
    }

    throw new Error(`BANK_TRANSFER_FAILED: ${response.data.errorMessage}`);
  }

  /**
   * 💰 CALCULATE PAYOUT DATE
   */
  calculatePayoutDate(payoutIndex) {
    const date = new Date();
    
    switch (payoutIndex) {
      case 0: // Upfront - immediately
        return date;
      
      case 1: // Milestone - 75% completion (approx 6 weeks)
        date.setDate(date.getDate() + 42);
        return date;
      
      case 2: // Completion - course end (approx 12 weeks)
        date.setDate(date.getDate() + 84);
        return date;
      
      default:
        return date;
    }
  }

  /**
   * 🔥 WARM UP PENDING PAYOUTS
   */
  async warmUpPendingPayouts() {
    try {
      const pendingPayouts = await this.prisma.expertPayout.count({
        where: {
          status: { in: ['PENDING', 'SCHEDULED'] },
          scheduledDate: { lte: new Date() }
        }
      });

      await this.redis.set('pending_payouts_count', pendingPayouts);
      this.logger.info(`Warmed up pending payouts cache: ${pendingPayouts} payouts`);
    } catch (error) {
      this.logger.error('Failed to warm up pending payouts', error);
    }
  }

  /**
   * ⏰ START SCHEDULED PROCESSING
   */
  startScheduledProcessing() {
    // Process payouts every hour
    setInterval(async () => {
      try {
        await this.processScheduledPayouts();
      } catch (error) {
        this.logger.error('Scheduled payout processing failed', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    // Update pending payouts count every 30 minutes
    setInterval(async () => {
      try {
        await this.warmUpPendingPayouts();
      } catch (error) {
        this.logger.error('Failed to update pending payouts count', error);
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * 🛡️ HANDLE PAYMENT FAILURE
   */
  async handlePaymentFailure(paymentData, error, transactionId) {
    try {
      // Record failed payment
      await this.prisma.payment.create({
        data: {
          id: transactionId,
          studentId: paymentData.studentId,
          expertId: paymentData.expertId,
          enrollmentId: paymentData.enrollmentId,
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod,
          status: 'FAILED',
          errorMessage: error.message,
          metadata: {
            error: error.message,
            timestamp: new Date().toISOString()
          }
        }
      });

      // Send failure notification
      await this.sendStudentNotification(paymentData.studentId, {
        type: 'PAYMENT_FAILED',
        amount: paymentData.amount,
        error: error.message
      });

      this.emit('paymentFailed', {
        transactionId,
        studentId: paymentData.studentId,
        error: error.message
      });

    } catch (logError) {
      this.logger.error('Failed to record payment failure', logError);
    }
  }

  /**
   * 📧 SEND STUDENT NOTIFICATION
   */
  async sendStudentNotification(studentId, data) {
    // Implementation for student notifications (SMS, email, push)
    this.logger.debug('Student notification sent', { studentId, ...data });
  }

  /**
   * 📧 SEND EXPERT NOTIFICATION
   */
  async sendExpertNotification(expertId, data) {
    // Implementation for expert notifications
    this.logger.debug('Expert notification sent', { expertId, ...data });
  }

  /**
   * 📧 SEND PLATFORM NOTIFICATION
   */
  async sendPlatformNotification(data) {
    // Implementation for platform admin notifications
    this.logger.debug('Platform notification sent', data);
  }

  /**
   * 🆔 GENERATE TRANSACTION ID
   */
  generateTransactionId() {
    return `MOSA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
  }

  /**
   * ⏳ DELAY FUNCTION
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🏦 CREATE TELEBIRR CLIENT
   */
  createTelebirrClient() {
    return axios.create({
      baseURL: process.env.TELEBIRR_API_URL,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${process.env.TELEBIRR_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 🏦 CREATE CBE BIRR CLIENT
   */
  createCbeBirrClient() {
    return axios.create({
      baseURL: process.env.CBE_BIRR_API_URL,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${process.env.CBE_BIRR_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 📊 GET PAYMENT ANALYTICS
   */
  async getPaymentAnalytics(period = '30d') {
    const cacheKey = `analytics:payments:${period}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const analytics = await this.prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_revenue,
        AVG(amount) as average_payment,
        COUNT(DISTINCT studentId) as unique_students,
        COUNT(DISTINCT expertId) as unique_experts,
        payment_method,
        status
      FROM payments 
      WHERE created_at >= ${startDate}
      GROUP BY payment_method, status
    `;

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(analytics));

    return analytics;
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Payout processor resources cleaned up');
    } catch (error) {
      this.logger.error('Error during payout processor cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new PayoutProcessor();