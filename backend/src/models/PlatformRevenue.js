// models/PlatformRevenue.js

/**
 * 🎯 ENTERPRISE PLATFORM REVENUE MODEL
 * Production-ready revenue tracking for Mosa Forge
 * Features: Real-time revenue tracking, 1000/999 split, payout scheduling, analytics
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { DataTypes, Model, Op } = require('sequelize');
const sequelize = require('../config/database');
const Redis = require('ioredis');
const { Logger } = require('../utils/logger');

class PlatformRevenue extends Model {
  static async initialize() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('PlatformRevenue');
    
    // Initialize revenue tracking system
    await this.initializeRevenuePartitions();
  }

  /**
   * 🎯 INITIALIZE REVENUE PARTITIONS
   * Creates monthly partitions for performance
   */
  static async initializeRevenuePartitions() {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      // Check if partition exists for current month
      const partitionExists = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'platform_revenues_${currentMonth.replace('-', '_')}'
        )
      `);

      if (!partitionExists[0][0].exists) {
        await this.createMonthlyPartition(currentMonth);
      }

      this.logger.info('Revenue partitions initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize revenue partitions', error);
    }
  }

  /**
   * 🗄️ CREATE MONTHLY PARTITION
   */
  static async createMonthlyPartition(month) {
    const partitionName = `platform_revenues_${month.replace('-', '_')}`;
    
    await sequelize.query(`
      CREATE TABLE ${partitionName} 
      PARTITION OF platform_revenues 
      FOR VALUES FROM ('${month}-01') TO ('${this.getNextMonth(month)}-01')
    `);

    this.logger.info(`Created revenue partition: ${partitionName}`);
  }

  /**
   * 💰 PROCESS BUNDLE PAYMENT
   * Core revenue processing for 1,999 ETB bundles
   */
  static async processBundlePayment(paymentData) {
    const transaction = await sequelize.transaction({ 
      isolationLevel: 'REPEATABLE READ' 
    });

    try {
      const {
        studentId,
        expertId,
        bundleId,
        paymentAmount = 1999, // 1,999 ETB
        paymentMethod,
        transactionId,
        paymentGateway
      } = paymentData;

      // 🛡️ VALIDATION
      await this.validatePaymentData(paymentData);

      // 💸 REVENUE SPLIT CALCULATION
      const revenueSplit = this.calculateRevenueSplit(paymentAmount);
      
      // 🎯 CREATE REVENUE RECORDS
      const platformRevenue = await this.create({
        studentId,
        expertId,
        bundleId,
        transactionId,
        paymentGateway,
        paymentMethod,
        totalAmount: paymentAmount,
        platformShare: revenueSplit.platformShare, // 1,000 ETB
        expertShare: revenueSplit.expertShare,     // 999 ETB
        revenueSplitRatio: '1000/999',
        paymentStatus: 'COMPLETED',
        payoutStatus: 'SCHEDULED',
        revenuePeriod: new Date().toISOString().slice(0, 7), // YYYY-MM
        metadata: {
          processedAt: new Date().toISOString(),
          paymentGatewayResponse: paymentData.gatewayResponse,
          riskScore: paymentData.riskScore || 0
        }
      }, { transaction });

      // 📊 UPDATE REAL-TIME METRICS
      await this.updateRevenueMetrics(revenueSplit, transaction);

      // 🎯 SCHEDULE EXPERT PAYOUTS
      await this.scheduleExpertPayouts(platformRevenue, transaction);

      // 💾 COMMIT TRANSACTION
      await transaction.commit();

      // 🔔 EMIT REVENUE EVENT
      this.emitRevenueProcessed(platformRevenue);

      this.logger.info('Bundle payment processed successfully', {
        revenueId: platformRevenue.id,
        studentId,
        expertId,
        platformShare: revenueSplit.platformShare,
        expertShare: revenueSplit.expertShare
      });

      return platformRevenue;

    } catch (error) {
      await transaction.rollback();
      this.logger.error('Bundle payment processing failed', error, { paymentData });
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE PAYMENT DATA
   */
  static async validatePaymentData(paymentData) {
    const {
      studentId,
      expertId,
      bundleId,
      paymentAmount,
      transactionId
    } = paymentData;

    // Required fields validation
    if (!studentId || !expertId || !bundleId || !transactionId) {
      throw new Error('MISSING_REQUIRED_PAYMENT_FIELDS');
    }

    // Payment amount validation
    if (paymentAmount !== 1999) {
      throw new Error('INVALID_BUNDLE_AMOUNT');
    }

    // Duplicate transaction prevention
    const existingRevenue = await this.findOne({
      where: { transactionId }
    });

    if (existingRevenue) {
      throw new Error('DUPLICATE_TRANSACTION');
    }

    // Student existence validation
    const student = await sequelize.models.Student.findByPk(studentId);
    if (!student) {
      throw new Error('STUDENT_NOT_FOUND');
    }

    // Expert existence and status validation
    const expert = await sequelize.models.Expert.findByPk(expertId, {
      attributes: ['id', 'status', 'currentTier']
    });

    if (!expert) {
      throw new Error('EXPERT_NOT_FOUND');
    }

    if (expert.status !== 'ACTIVE') {
      throw new Error('EXPERT_NOT_ACTIVE');
    }

    this.logger.debug('Payment data validation passed', { studentId, expertId });
  }

  /**
   * 💸 CALCULATE REVENUE SPLIT
   * 1,000 ETB Platform | 999 ETB Expert
   */
  static calculateRevenueSplit(totalAmount) {
    const platformShare = 1000; // Fixed platform share
    const expertShare = 999;    // Fixed expert share

    // Validation: Ensure total matches 1,999 ETB
    if (platformShare + expertShare !== totalAmount) {
      throw new Error('REVENUE_SPLIT_MISMATCH');
    }

    return {
      platformShare,
      expertShare,
      platformPercentage: (platformShare / totalAmount * 100).toFixed(2),
      expertPercentage: (expertShare / totalAmount * 100).toFixed(2)
    };
  }

  /**
   * 🎯 SCHEDULE EXPERT PAYOUTS
   * 333/333/333 payout schedule implementation
   */
  static async scheduleExpertPayouts(revenueRecord, transaction) {
    const { id: revenueId, expertId, expertShare, studentId } = revenueRecord;

    // Create payout schedule (333/333/333)
    const payoutAmount = expertShare / 3; // 333 ETB per installment
    
    const payoutSchedule = [
      {
        revenueId,
        expertId,
        studentId,
        installmentNumber: 1,
        amount: payoutAmount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'SCHEDULED',
        payoutType: 'UPFRONT',
        triggerCondition: 'COURSE_START'
      },
      {
        revenueId,
        expertId,
        studentId,
        installmentNumber: 2,
        amount: payoutAmount,
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        status: 'SCHEDULED',
        payoutType: 'MILESTONE',
        triggerCondition: '75%_COMPLETION'
      },
      {
        revenueId,
        expertId,
        studentId,
        installmentNumber: 3,
        amount: payoutAmount,
        dueDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days
        status: 'SCHEDULED',
        payoutType: 'COMPLETION',
        triggerCondition: 'CERTIFICATION'
      }
    ];

    // Bulk create payout schedules
    await sequelize.models.ExpertPayout.bulkCreate(payoutSchedule, { transaction });

    this.logger.debug('Expert payout schedule created', {
      revenueId,
      expertId,
      installments: payoutSchedule.length,
      totalAmount: expertShare
    });
  }

  /**
   * 📊 UPDATE REAL-TIME REVENUE METRICS
   */
  static async updateRevenueMetrics(revenueSplit, transaction) {
    const currentDate = new Date();
    const metricsKey = `revenue:metrics:${currentDate.toISOString().slice(0, 10)}`;
    
    const pipeline = this.redis.pipeline();

    // Update daily metrics
    pipeline.hincrby(metricsKey, 'totalRevenue', revenueSplit.platformShare + revenueSplit.expertShare);
    pipeline.hincrby(metricsKey, 'platformRevenue', revenueSplit.platformShare);
    pipeline.hincrby(metricsKey, 'expertRevenue', revenueSplit.expertShare);
    pipeline.hincrby(metricsKey, 'transactionCount', 1);
    pipeline.expire(metricsKey, 30 * 24 * 60 * 60); // 30 days TTL

    // Update monthly leaderboard
    const monthKey = `revenue:leaderboard:${currentDate.toISOString().slice(0, 7)}`;
    pipeline.zincrby(monthKey, revenueSplit.platformShare, 'platform');
    pipeline.zincrby(monthKey, revenueSplit.expertShare, 'experts_total');
    pipeline.expire(monthKey, 365 * 24 * 60 * 60); // 1 year TTL

    await pipeline.exec();

    // Update database aggregates (for reporting)
    await this.updateDatabaseAggregates(revenueSplit, currentDate, transaction);
  }

  /**
   * 💾 UPDATE DATABASE AGGREGATES
   */
  static async updateDatabaseAggregates(revenueSplit, date, transaction) {
    const yearMonth = date.toISOString().slice(0, 7);
    
    // Find or create monthly aggregate
    const [aggregate] = await sequelize.models.RevenueAggregate.findOrCreate({
      where: { period: yearMonth, aggregateType: 'MONTHLY' },
      defaults: {
        period: yearMonth,
        aggregateType: 'MONTHLY',
        totalRevenue: 0,
        platformRevenue: 0,
        expertRevenue: 0,
        transactionCount: 0,
        averageRevenuePerTransaction: 0
      },
      transaction
    });

    // Update aggregate values
    await aggregate.update({
      totalRevenue: aggregate.totalRevenue + revenueSplit.platformShare + revenueSplit.expertShare,
      platformRevenue: aggregate.platformRevenue + revenueSplit.platformShare,
      expertRevenue: aggregate.expertRevenue + revenueSplit.expertShare,
      transactionCount: aggregate.transactionCount + 1,
      averageRevenuePerTransaction: (aggregate.totalRevenue + revenueSplit.platformShare + revenueSplit.expertShare) / 
                                   (aggregate.transactionCount + 1)
    }, { transaction });
  }

  /**
   * 🔔 EMIT REVENUE PROCESSED EVENT
   */
  static emitRevenueProcessed(revenueRecord) {
    // Emit to analytics service
    this.redis.publish('revenue:processed', JSON.stringify({
      revenueId: revenueRecord.id,
      studentId: revenueRecord.studentId,
      expertId: revenueRecord.expertId,
      platformShare: revenueRecord.platformShare,
      expertShare: revenueRecord.expertShare,
      timestamp: new Date().toISOString()
    }));

    // Emit to notification service
    this.redis.publish('notifications:revenue', JSON.stringify({
      type: 'REVENUE_PROCESSED',
      revenueId: revenueRecord.id,
      amount: revenueRecord.totalAmount,
      expertId: revenueRecord.expertId
    }));
  }

  /**
   * 📈 GET REVENUE ANALYTICS
   */
  static async getRevenueAnalytics(period = '30d', groupBy = 'daily') {
    const cacheKey = `analytics:revenue:${period}:${groupBy}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const startDate = this.calculateStartDate(period);
    
    const analytics = await this.findAll({
      where: {
        createdAt: {
          [Op.gte]: startDate
        },
        paymentStatus: 'COMPLETED'
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue'],
        [sequelize.fn('SUM', sequelize.col('platformShare')), 'platformRevenue'],
        [sequelize.fn('SUM', sequelize.col('expertShare')), 'expertRevenue'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactionCount']
      ],
      group: ['date'],
      order: [['date', 'ASC']],
      raw: true
    });

    // Calculate additional metrics
    const enhancedAnalytics = this.enhanceAnalytics(analytics, period);

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(enhancedAnalytics));

    return enhancedAnalytics;
  }

  /**
   * 📊 ENHANCE ANALYTICS WITH ADDITIONAL METRICS
   */
  static enhanceAnalytics(analytics, period) {
    const totalRevenue = analytics.reduce((sum, item) => sum + parseFloat(item.totalRevenue), 0);
    const totalPlatform = analytics.reduce((sum, item) => sum + parseFloat(item.platformRevenue), 0);
    const totalExpert = analytics.reduce((sum, item) => sum + parseFloat(item.expertRevenue), 0);
    const totalTransactions = analytics.reduce((sum, item) => sum + parseInt(item.transactionCount), 0);

    return {
      period,
      summary: {
        totalRevenue,
        totalPlatformRevenue: totalPlatform,
        totalExpertRevenue: totalExpert,
        totalTransactions,
        averageTransactionValue: totalRevenue / totalTransactions,
        platformSharePercentage: (totalPlatform / totalRevenue * 100).toFixed(2),
        expertSharePercentage: (totalExpert / totalRevenue * 100).toFixed(2)
      },
      trends: this.calculateRevenueTrends(analytics),
      dailyData: analytics
    };
  }

  /**
   * 📈 CALCULATE REVENUE TRENDS
   */
  static calculateRevenueTrends(analytics) {
    if (analytics.length < 2) {
      return { trend: 'stable', growthRate: 0 };
    }

    const recentData = analytics.slice(-7); // Last 7 days
    const previousData = analytics.slice(-14, -7); // Previous 7 days

    const recentAvg = recentData.reduce((sum, item) => sum + parseFloat(item.totalRevenue), 0) / recentData.length;
    const previousAvg = previousData.reduce((sum, item) => sum + parseFloat(item.totalRevenue), 0) / previousData.length;

    const growthRate = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg * 100) : 100;

    return {
      trend: growthRate > 5 ? 'growing' : growthRate < -5 ? 'declining' : 'stable',
      growthRate: growthRate.toFixed(2),
      weeklyAverage: recentAvg.toFixed(2)
    };
  }

  /**
   * 💰 PROCESS QUALITY BONUSES
   */
  static async processQualityBonuses(expertId, studentId, qualityScore) {
    try {
      const bonusRate = this.calculateBonusRate(qualityScore);
      
      if (bonusRate > 0) {
        const baseExpertShare = 999; // Base expert share
        const bonusAmount = (baseExpertShare * bonusRate) / 100;
        
        const bonusRecord = await this.create({
          studentId,
          expertId,
          totalAmount: bonusAmount,
          platformShare: 0, // Platform doesn't share in bonuses
          expertShare: bonusAmount,
          revenueSplitRatio: 'QUALITY_BONUS',
          paymentStatus: 'COMPLETED',
          payoutStatus: 'IMMEDIATE',
          revenueType: 'QUALITY_BONUS',
          metadata: {
            qualityScore,
            bonusRate: `${bonusRate}%`,
            baseAmount: baseExpertShare,
            calculatedAt: new Date().toISOString()
          }
        });

        this.logger.info('Quality bonus processed', {
          expertId,
          studentId,
          qualityScore,
          bonusRate: `${bonusRate}%`,
          bonusAmount
        });

        return bonusRecord;
      }

      return null;
    } catch (error) {
      this.logger.error('Quality bonus processing failed', error, { expertId, studentId, qualityScore });
      throw error;
    }
  }

  /**
   * 🎯 CALCULATE BONUS RATE BASED ON QUALITY
   */
  static calculateBonusRate(qualityScore) {
    if (qualityScore >= 4.7) return 20; // Master Tier: +20%
    if (qualityScore >= 4.3) return 10; // Senior Tier: +10%
    if (qualityScore >= 4.0) return 0;  // Standard Tier: Base
    if (qualityScore >= 3.5) return -10; // Developing Tier: -10%
    return -20; // Probation Tier: -20%
  }

  /**
   * 🔍 GET EXPERT EARNINGS SUMMARY
   */
  static async getExpertEarnings(expertId, period = '90d') {
    const cacheKey = `earnings:expert:${expertId}:${period}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const startDate = this.calculateStartDate(period);
    
    const earnings = await this.findAll({
      where: {
        expertId,
        createdAt: { [Op.gte]: startDate },
        paymentStatus: 'COMPLETED'
      },
      attributes: [
        'revenueType',
        [sequelize.fn('SUM', sequelize.col('expertShare')), 'totalEarnings'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactionCount']
      ],
      group: ['revenueType'],
      raw: true
    });

    const summary = {
      expertId,
      period,
      totalEarnings: earnings.reduce((sum, item) => sum + parseFloat(item.totalEarnings), 0),
      breakdown: earnings,
      performance: await this.calculateExpertPerformance(expertId, period)
    };

    // Cache for 15 minutes
    await this.redis.setex(cacheKey, 900, JSON.stringify(summary));

    return summary;
  }

  /**
   * 📊 CALCULATE EXPERT PERFORMANCE METRICS
   */
  static async calculateExpertPerformance(expertId, period) {
    const startDate = this.calculateStartDate(period);
    
    const stats = await this.findOne({
      where: {
        expertId,
        createdAt: { [Op.gte]: startDate },
        paymentStatus: 'COMPLETED'
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('expertShare')), 'averageEarningPerStudent'],
        [sequelize.fn('MAX', sequelize.col('expertShare')), 'maxEarningPerStudent'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalStudents']
      ],
      raw: true
    });

    return {
      averageEarningPerStudent: parseFloat(stats.averageEarningPerStudent) || 0,
      maxEarningPerStudent: parseFloat(stats.maxEarningPerStudent) || 0,
      totalStudents: parseInt(stats.totalStudents) || 0,
      estimatedMonthlyEarning: (parseFloat(stats.averageEarningPerStudent) || 0) * 10 // Projection
    };
  }

  /**
   * 📅 CALCULATE START DATE FOR PERIOD
   */
  static calculateStartDate(period) {
    const now = new Date();
    switch (period) {
      case '7d': return new Date(now.setDate(now.getDate() - 7));
      case '30d': return new Date(now.setDate(now.getDate() - 30));
      case '90d': return new Date(now.setDate(now.getDate() - 90));
      case '1y': return new Date(now.setFullYear(now.getFullYear() - 1));
      default: return new Date(now.setDate(now.getDate() - 30));
    }
  }

  /**
   * 📈 GET NEXT MONTH FOR PARTITIONING
   */
  static getNextMonth(month) {
    const [year, monthNum] = month.split('-').map(Number);
    return monthNum === 12 ? `${year + 1}-01` : `${year}-${String(monthNum + 1).padStart(2, '0')}`;
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  static async destroy() {
    try {
      await this.redis.quit();
      this.logger.info('PlatformRevenue resources cleaned up');
    } catch (error) {
      this.logger.error('Error during PlatformRevenue cleanup', error);
    }
  }
}

// 🗃️ ENTERPRISE DATABASE SCHEMA
PlatformRevenue.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    }
  },
  expertId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'experts',
      key: 'id'
    }
  },
  bundleId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'bundles',
      key: 'id'
    }
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  paymentGateway: {
    type: DataTypes.ENUM('TELEBIRR', 'CBE_BIRR', 'OTHER'),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false
  },
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  platformShare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Platform share (1,000 ETB)'
  },
  expertShare: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Expert share (999 ETB)'
  },
  revenueSplitRatio: {
    type: DataTypes.STRING,
    defaultValue: '1000/999'
  },
  revenueType: {
    type: DataTypes.ENUM('BUNDLE_PAYMENT', 'QUALITY_BONUS', 'REFUND', 'OTHER'),
    defaultValue: 'BUNDLE_PAYMENT'
  },
  paymentStatus: {
    type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'),
    defaultValue: 'PENDING'
  },
  payoutStatus: {
    type: DataTypes.ENUM('SCHEDULED', 'PROCESSING', 'PAID', 'FAILED', 'IMMEDIATE'),
    defaultValue: 'SCHEDULED'
  },
  revenuePeriod: {
    type: DataTypes.STRING(7), // YYYY-MM
    allowNull: false,
    index: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  sequelize,
  modelName: 'PlatformRevenue',
  tableName: 'platform_revenues',
  indexes: [
    {
      fields: ['studentId']
    },
    {
      fields: ['expertId']
    },
    {
      fields: ['revenuePeriod']
    },
    {
      fields: ['createdAt']
    },
    {
      fields: ['paymentStatus']
    }
  ],
  hooks: {
    beforeCreate: (revenue) => {
      // Auto-set revenue period if not provided
      if (!revenue.revenuePeriod) {
        revenue.revenuePeriod = new Date().toISOString().slice(0, 7);
      }
    }
  }
});

module.exports = PlatformRevenue;