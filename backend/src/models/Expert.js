// models/Expert.js

/**
 * 🎯 ENTERPRISE EXPERT MODEL
 * Production-ready Expert data model with quality tracking, tier management,
 * and performance analytics for Mosa Forge
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { DataTypes, Model, Op } = require('sequelize');
const sequelize = require('../config/database');
const Logger = require('../utils/logger');
const { QualityCalculator } = require('../utils/quality-calculations');
const Redis = require('ioredis');

class Expert extends Model {
  static async initialize() {
    try {
      await this.sync({ force: false });
      Logger.info('Expert model synchronized successfully');
    } catch (error) {
      Logger.error('Expert model synchronization failed', error);
      throw error;
    }
  }

  /**
   * 🎯 CREATE EXPERT WITH VALIDATION
   */
  static async createExpert(expertData) {
    const transaction = await sequelize.transaction();
    
    try {
      // 🛡️ VALIDATION PHASE
      await this.validateExpertCreation(expertData);

      // 🔍 DUPLICATE DETECTION
      await this.checkDuplicateExpert(expertData.faydaId, expertData.email);

      // 💾 CREATE EXPERT RECORD
      const expert = await this.create({
        ...expertData,
        status: 'PENDING_VERIFICATION',
        currentTier: 'STANDARD',
        qualityScore: 4.0, // Default starting score
        totalStudents: 0,
        activeStudents: 0,
        completionRate: 0,
        ratingCount: 0,
        metadata: {
          createdAt: new Date().toISOString(),
          createdBy: 'system',
          verificationAttempts: 0
        }
      }, { transaction });

      // 📧 TRIGGER VERIFICATION WORKFLOW
      await this.triggerVerificationWorkflow(expert, transaction);

      await transaction.commit();

      // 🔔 EMIT EXPERT CREATION EVENT
      this.emit('expertCreated', expert);

      Logger.info('Expert created successfully', { expertId: expert.id, faydaId: expert.faydaId });

      return expert;

    } catch (error) {
      await transaction.rollback();
      Logger.error('Expert creation failed', error, { faydaId: expertData.faydaId });
      throw error;
    }
  }

  /**
   * 🛡️ EXPERT CREATION VALIDATION
   */
  static async validateExpertCreation(expertData) {
    const requiredFields = [
      'faydaId', 'firstName', 'lastName', 'email', 
      'phone', 'primarySkill', 'experienceLevel'
    ];

    const missingFields = requiredFields.filter(field => !expertData[field]);
    if (missingFields.length > 0) {
      throw new Error(`MISSING_REQUIRED_FIELDS: ${missingFields.join(', ')}`);
    }

    // Fayda ID validation (Ethiopian government ID format)
    if (!this.isValidFaydaId(expertData.faydaId)) {
      throw new Error('INVALID_FAYDA_ID_FORMAT');
    }

    // Email validation
    if (!this.isValidEmail(expertData.email)) {
      throw new Error('INVALID_EMAIL_FORMAT');
    }

    // Phone validation (Ethiopian format)
    if (!this.isValidEthiopianPhone(expertData.phone)) {
      throw new Error('INVALID_PHONE_FORMAT');
    }

    // Skill validation against catalog
    if (!this.isValidSkill(expertData.primarySkill)) {
      throw new Error('INVALID_PRIMARY_SKILL');
    }

    // Experience level validation
    const validLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
    if (!validLevels.includes(expertData.experienceLevel)) {
      throw new Error('INVALID_EXPERIENCE_LEVEL');
    }

    Logger.debug('Expert creation validation passed', { faydaId: expertData.faydaId });
  }

  /**
   * 🔍 DUPLICATE EXPERT DETECTION
   */
  static async checkDuplicateExpert(faydaId, email) {
    const existingExpert = await this.findOne({
      where: {
        [Op.or]: [
          { faydaId },
          { email },
          { phone: email } // Also check phone as potential duplicate
        ]
      },
      paranoid: false // Include soft-deleted records
    });

    if (existingExpert) {
      if (existingExpert.faydaId === faydaId) {
        throw new Error('DUPLICATE_FAYDA_ID');
      }
      if (existingExpert.email === email) {
        throw new Error('DUPLICATE_EMAIL');
      }
      throw new Error('DUPLICATE_EXPERT_RECORD');
    }
  }

  /**
   * 📧 TRIGGER VERIFICATION WORKFLOW
   */
  static async triggerVerificationWorkflow(expert, transaction) {
    // Create verification record
    await sequelize.models.ExpertVerification.create({
      expertId: expert.id,
      status: 'PENDING',
      documents: expert.documents || [],
      verificationType: 'INITIAL',
      metadata: {
        submittedAt: new Date().toISOString(),
        autoVerified: false
      }
    }, { transaction });

    // Queue background verification tasks
    await this.queueVerificationTasks(expert);

    Logger.debug('Verification workflow triggered', { expertId: expert.id });
  }

  /**
   * 🎯 UPDATE EXPERT QUALITY METRICS
   */
  static async updateQualityMetrics(expertId, newRating) {
    const transaction = await sequelize.transaction();
    
    try {
      const expert = await this.findByPk(expertId, { transaction });
      if (!expert) {
        throw new Error('EXPERT_NOT_FOUND');
      }

      // 📊 CALCULATE NEW QUALITY SCORE
      const updatedMetrics = await this.calculateUpdatedMetrics(expert, newRating, transaction);

      // 🎯 UPDATE EXPERT RECORD
      await expert.update({
        qualityScore: updatedMetrics.qualityScore,
        currentTier: updatedMetrics.newTier,
        ratingCount: expert.ratingCount + 1,
        averageRating: updatedMetrics.averageRating,
        completionRate: updatedMetrics.completionRate,
        lastRatingAt: new Date(),
        ratingHistory: [
          ...(expert.ratingHistory || []),
          {
            rating: newRating.rating,
            timestamp: new Date(),
            sessionId: newRating.sessionId,
            studentId: newRating.studentId
          }
        ].slice(-100), // Keep last 100 ratings
        metadata: {
          ...expert.metadata,
          lastQualityUpdate: new Date().toISOString(),
          metricsVersion: 'v2'
        }
      }, { transaction });

      // 🔄 UPDATE TIER-BASED CAPACITY
      await this.updateExpertCapacity(expert, updatedMetrics.newTier, transaction);

      await transaction.commit();

      // 🔔 EMIT QUALITY UPDATE EVENT
      this.emit('expertQualityUpdated', {
        expertId: expert.id,
        previousTier: expert.currentTier,
        newTier: updatedMetrics.newTier,
        qualityScore: updatedMetrics.qualityScore
      });

      Logger.info('Expert quality metrics updated', {
        expertId,
        previousTier: expert.currentTier,
        newTier: updatedMetrics.newTier,
        qualityScore: updatedMetrics.qualityScore
      });

      return updatedMetrics;

    } catch (error) {
      await transaction.rollback();
      Logger.error('Failed to update expert quality metrics', error, { expertId });
      throw error;
    }
  }

  /**
   * 📊 CALCULATE UPDATED METRICS
   */
  static async calculateUpdatedMetrics(expert, newRating, transaction) {
    // Get recent ratings (last 90 days)
    const recentRatings = await sequelize.models.Rating.findAll({
      where: {
        expertId: expert.id,
        status: 'ACTIVE',
        createdAt: {
          [Op.gte]: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      },
      transaction
    });

    // Calculate quality score using weighted algorithm
    const qualityScore = QualityCalculator.calculateExpertQualityScore(
      recentRatings,
      expert.completionRate,
      expert.responseTime
    );

    // Calculate completion rate from enrollments
    const completionStats = await this.getCompletionStats(expert.id, transaction);
    
    // Determine new tier
    const newTier = this.calculateExpertTier(qualityScore, recentRatings.length, completionStats.rate);

    return {
      qualityScore,
      newTier,
      averageRating: this.calculateAverageRating([...recentRatings, newRating]),
      completionRate: completionStats.rate
    };
  }

  /**
   * 🎯 CALCULATE EXPERT TIER
   */
  static calculateExpertTier(qualityScore, ratingCount, completionRate) {
    // Minimum requirements for tier evaluation
    if (ratingCount < 5 || completionRate < 0.7) {
      return 'STANDARD';
    }

    // Master Tier: Exceptional performance
    if (qualityScore >= 4.7 && completionRate >= 0.85) {
      return 'MASTER';
    }

    // Senior Tier: High performance
    if (qualityScore >= 4.3 && completionRate >= 0.75) {
      return 'SENIOR';
    }

    // Standard Tier: Meets basic requirements
    if (qualityScore >= 4.0 && completionRate >= 0.7) {
      return 'STANDARD';
    }

    // Developing Tier: Needs improvement
    if (qualityScore >= 3.5) {
      return 'DEVELOPING';
    }

    // Probation Tier: Below standards
    return 'PROBATION';
  }

  /**
   * 📈 GET COMPLETION STATISTICS
   */
  static async getCompletionStats(expertId, transaction) {
    const enrollments = await sequelize.models.Enrollment.findAll({
      where: { expertId },
      include: [{
        model: sequelize.models.TrainingSession,
        attributes: ['status', 'completedAt']
      }],
      transaction
    });

    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter(e => 
      e.TrainingSessions?.some(s => s.status === 'COMPLETED')
    ).length;

    const completionRate = totalEnrollments > 0 ? completedEnrollments / totalEnrollments : 0;

    return {
      total: totalEnrollments,
      completed: completedEnrollments,
      rate: completionRate
    };
  }

  /**
   * 🔄 UPDATE EXPERT CAPACITY
   */
  static async updateExpertCapacity(expert, newTier, transaction) {
    const capacityLimits = {
      MASTER: null, // Unlimited
      SENIOR: 100,
      STANDARD: 50,
      DEVELOPING: 25,
      PROBATION: 10
    };

    const newCapacity = capacityLimits[newTier];

    await expert.update({
      maxStudents: newCapacity,
      metadata: {
        ...expert.metadata,
        capacityLastUpdated: new Date().toISOString(),
        previousCapacity: expert.maxStudents
      }
    }, { transaction });

    Logger.debug('Expert capacity updated', {
      expertId: expert.id,
      previousCapacity: expert.maxStudents,
      newCapacity,
      tier: newTier
    });
  }

  /**
   * 💰 CALCULATE EARNINGS PROJECTION
   */
  static async calculateEarnings(expertId, period = 'current') {
    const expert = await this.findByPk(expertId);
    if (!expert) {
      throw new Error('EXPERT_NOT_FOUND');
    }

    const earnings = await sequelize.models.Payment.findAll({
      where: {
        expertId,
        status: 'COMPLETED',
        ...this.getPeriodFilter(period)
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalEarnings'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'paymentCount']
      ]
    });

    const baseEarnings = parseFloat(earnings[0]?.get('totalEarnings') || 0);
    const bonusEarnings = this.calculatePerformanceBonus(expert, baseEarnings);

    return {
      baseEarnings,
      bonusEarnings,
      totalEarnings: baseEarnings + bonusEarnings,
      paymentCount: parseInt(earnings[0]?.get('paymentCount') || 0),
      tier: expert.currentTier,
      qualityScore: expert.qualityScore,
      bonusRate: this.getBonusRate(expert.currentTier)
    };
  }

  /**
   * 🎁 CALCULATE PERFORMANCE BONUS
   */
  static calculatePerformanceBonus(expert, baseEarnings) {
    const bonusRates = {
      MASTER: 0.20, // 20% bonus
      SENIOR: 0.10, // 10% bonus
      STANDARD: 0.00, // No bonus
      DEVELOPING: -0.10, // 10% penalty
      PROBATION: -0.20 // 20% penalty
    };

    const bonusRate = bonusRates[expert.currentTier] || 0;
    return baseEarnings * bonusRate;
  }

  /**
   * 📅 GET PERIOD FILTER
   */
  static getPeriodFilter(period) {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'current':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'last_90_days':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getFullYear(), 0, 1); // Year start
    }

    return {
      createdAt: {
        [Op.gte]: startDate
      }
    };
  }

  /**
   * 🔍 FIND EXPERTS BY CRITERIA
   */
  static async findExpertsByCriteria(criteria = {}) {
    const {
      skill,
      tier,
      minRating,
      maxStudents,
      location,
      availability,
      page = 1,
      limit = 20
    } = criteria;

    const whereClause = { status: 'ACTIVE' };
    const havingClause = {};

    // Build filter conditions
    if (skill) whereClause.primarySkill = skill;
    if (tier) whereClause.currentTier = tier;
    if (minRating) havingClause.qualityScore = { [Op.gte]: minRating };
    if (maxStudents) whereClause.activeStudents = { [Op.lte]: maxStudents };
    if (location) whereClause.location = { [Op.iLike]: `%${location}%` };
    if (availability) whereClause.availabilityStatus = availability;

    const offset = (page - 1) * limit;

    const { count, rows } = await this.findAndCountAll({
      where: whereClause,
      having: havingClause,
      order: [
        ['qualityScore', 'DESC'],
        ['currentTier', 'DESC'],
        ['ratingCount', 'DESC']
      ],
      limit,
      offset,
      attributes: {
        include: [
          [sequelize.literal('(SELECT COUNT(*) FROM enrollments WHERE enrollments.expert_id = Expert.id AND enrollments.status = \'ACTIVE\')'), 'activeStudentCount']
        ]
      }
    });

    return {
      experts: rows,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * 🏆 GET TOP PERFORMING EXPERTS
   */
  static async getTopPerformers(limit = 10, skill = null) {
    const whereClause = {
      status: 'ACTIVE',
      currentTier: ['MASTER', 'SENIOR'],
      ratingCount: { [Op.gte]: 5 }
    };

    if (skill) whereClause.primarySkill = skill;

    return await this.findAll({
      where: whereClause,
      order: [
        ['qualityScore', 'DESC'],
        ['completionRate', 'DESC'],
        ['ratingCount', 'DESC']
      ],
      limit,
      attributes: [
        'id', 'firstName', 'lastName', 'primarySkill', 
        'currentTier', 'qualityScore', 'completionRate',
        'ratingCount', 'totalStudents'
      ]
    });
  }

  /**
   * 📊 GET EXPERT PERFORMANCE ANALYTICS
   */
  static async getPerformanceAnalytics(expertId) {
    const expert = await this.findByPk(expertId);
    if (!expert) {
      throw new Error('EXPERT_NOT_FOUND');
    }

    const [
      earnings,
      studentStats,
      ratingDistribution,
      recentSessions
    ] = await Promise.all([
      this.calculateEarnings(expertId, 'last_90_days'),
      this.getStudentStatistics(expertId),
      this.getRatingDistribution(expertId),
      this.getRecentSessions(expertId)
    ]);

    return {
      expert: {
        id: expert.id,
        name: `${expert.firstName} ${expert.lastName}`,
        tier: expert.currentTier,
        qualityScore: expert.qualityScore,
        primarySkill: expert.primarySkill
      },
      financial: earnings,
      students: studentStats,
      ratings: ratingDistribution,
      recentActivity: recentSessions,
      recommendations: this.generatePerformanceRecommendations(expert, earnings, studentStats)
    };
  }

  /**
   * 👥 GET STUDENT STATISTICS
   */
  static async getStudentStatistics(expertId) {
    const stats = await sequelize.models.Enrollment.findAll({
      where: { expertId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalEnrollments'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN status = \'COMPLETED\' THEN 1 ELSE 0 END')), 'completedEnrollments'],
        [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating']
      ],
      raw: true
    });

    return {
      totalEnrollments: parseInt(stats[0]?.totalEnrollments || 0),
      completedEnrollments: parseInt(stats[0]?.completedEnrollments || 0),
      completionRate: stats[0]?.completedEnrollments / stats[0]?.totalEnrollments || 0,
      averageRating: parseFloat(stats[0]?.averageRating || 0)
    };
  }

  /**
   * 📈 GET RATING DISTRIBUTION
   */
  static async getRatingDistribution(expertId) {
    const distribution = await sequelize.models.Rating.findAll({
      where: { expertId, status: 'ACTIVE' },
      attributes: [
        'rating',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['rating'],
      raw: true
    });

    const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach(item => {
      result[item.rating] = parseInt(item.count);
    });

    return result;
  }

  /**
   * 📅 GET RECENT SESSIONS
   */
  static async getRecentSessions(expertId, limit = 5) {
    return await sequelize.models.TrainingSession.findAll({
      where: { expertId },
      include: [{
        model: sequelize.models.Student,
        attributes: ['firstName', 'lastName']
      }],
      order: [['scheduledAt', 'DESC']],
      limit,
      attributes: ['id', 'status', 'scheduledAt', 'duration', 'studentSatisfaction']
    });
  }

  /**
   * 💡 GENERATE PERFORMANCE RECOMMENDATIONS
   */
  static generatePerformanceRecommendations(expert, earnings, studentStats) {
    const recommendations = [];

    if (expert.qualityScore < 4.0) {
      recommendations.push({
        type: 'QUALITY_IMPROVEMENT',
        priority: 'HIGH',
        message: 'Focus on improving student satisfaction ratings',
        action: 'Review recent feedback and adjust teaching methods'
      });
    }

    if (studentStats.completionRate < 0.7) {
      recommendations.push({
        type: 'COMPLETION_RATE',
        priority: 'HIGH',
        message: 'Student completion rate below platform standards',
        action: 'Implement better progress tracking and student engagement'
      });
    }

    if (expert.currentTier === 'STANDARD' && expert.qualityScore >= 4.3) {
      recommendations.push({
        type: 'TIER_PROMOTION',
        priority: 'MEDIUM',
        message: 'Eligible for Senior Tier promotion',
        action: 'Maintain current performance for 2 more weeks'
      });
    }

    if (earnings.bonusEarnings < 0) {
      recommendations.push({
        type: 'PERFORMANCE_PENALTY',
        priority: 'HIGH',
        message: 'Current performance results in earnings penalty',
        action: 'Focus on quality metrics to remove penalty'
      });
    }

    return recommendations;
  }

  /**
   * 🛡️ VALIDATION HELPERS
   */
  static isValidFaydaId(faydaId) {
    // Ethiopian government ID validation logic
    const faydaRegex = /^[A-Z0-9]{10,15}$/;
    return faydaRegex.test(faydaId);
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidEthiopianPhone(phone) {
    const phoneRegex = /^(\+251|0)(9|7)\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  static isValidSkill(skill) {
    const validSkills = require('../constants/skills-catalog').SKILLS_LIST;
    return validSkills.includes(skill);
  }

  static getBonusRate(tier) {
    const rates = {
      MASTER: 0.20,
      SENIOR: 0.10,
      STANDARD: 0.00,
      DEVELOPING: -0.10,
      PROBATION: -0.20
    };
    return rates[tier] || 0;
  }

  static calculateAverageRating(ratings) {
    if (!ratings.length) return 0;
    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    return sum / ratings.length;
  }
}

// 🗃️ EXPERT MODEL DEFINITION
Expert.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  faydaId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  primarySkill: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  secondarySkills: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  experienceLevel: {
    type: DataTypes.ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'),
    allowNull: false
  },
  yearsOfExperience: {
    type: DataTypes.INTEGER,
    validate: {
      min: 0,
      max: 50
    }
  },
  currentTier: {
    type: DataTypes.ENUM('MASTER', 'SENIOR', 'STANDARD', 'DEVELOPING', 'PROBATION'),
    defaultValue: 'STANDARD'
  },
  qualityScore: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 4.0,
    validate: {
      min: 1.0,
      max: 5.0
    }
  },
  ratingCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  averageRating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.0,
    validate: {
      min: 1.0,
      max: 5.0
    }
  },
  completionRate: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0.0,
    validate: {
      min: 0.0,
      max: 1.0
    }
  },
  totalStudents: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  activeStudents: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  maxStudents: {
    type: DataTypes.INTEGER,
    defaultValue: 50
  },
  responseTime: {
    type: DataTypes.INTEGER, // in hours
    defaultValue: 24
  },
  location: {
    type: DataTypes.STRING(255)
  },
  availabilityStatus: {
    type: DataTypes.ENUM('AVAILABLE', 'BUSY', 'UNAVAILABLE'),
    defaultValue: 'AVAILABLE'
  },
  documents: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  portfolio: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  ratingHistory: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  status: {
    type: DataTypes.ENUM(
      'PENDING_VERIFICATION',
      'ACTIVE',
      'SUSPENDED',
      'INACTIVE',
      'BLACKLISTED'
    ),
    defaultValue: 'PENDING_VERIFICATION'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  lastRatingAt: {
    type: DataTypes.DATE
  },
  verifiedAt: {
    type: DataTypes.DATE
  }
}, {
  sequelize,
  modelName: 'Expert',
  tableName: 'experts',
  timestamps: true,
  paranoid: true, // Soft deletes
  indexes: [
    {
      unique: true,
      fields: ['faydaId']
    },
    {
      unique: true,
      fields: ['email']
    },
    {
      fields: ['primarySkill']
    },
    {
      fields: ['currentTier']
    },
    {
      fields: ['qualityScore']
    },
    {
      fields: ['status']
    },
    {
      fields: ['location']
    },
    {
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeCreate: (expert) => {
      expert.metadata = {
        ...expert.metadata,
        createdAt: new Date().toISOString(),
        version: 'v2'
      };
    },
    beforeUpdate: (expert) => {
      if (expert.changed('qualityScore') || expert.changed('currentTier')) {
        expert.metadata = {
          ...expert.metadata,
          lastMetricsUpdate: new Date().toISOString()
        };
      }
    }
  }
});

module.exports = Expert;