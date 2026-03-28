// models/QualityMetrics.js

/**
 * 🎯 ENTERPRISE QUALITY METRICS MODEL
 * Production-ready quality tracking system for Mosa Forge
 * Comprehensive quality monitoring, tier management, and performance analytics
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { DataTypes, Model, Op } = require('sequelize');
const sequelize = require('../config/database');
const Redis = require('ioredis');
const { Logger } = require('../utils/logger');

class QualityMetrics extends Model {
  static async initialize() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('QualityMetrics');
    
    // Create database table if not exists
    await this.sync({ force: false });
    this.logger.info('QualityMetrics model initialized');
  }

  /**
   * 🎯 CALCULATE COMPREHENSIVE QUALITY SCORE
   */
  static async calculateExpertQualityScore(expertId, timeRange = '90d') {
    const cacheKey = `quality:score:${expertId}:${timeRange}`;
    
    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const days = parseInt(timeRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const metrics = await this.getExpertMetrics(expertId, startDate);
      const qualityScore = this.computeWeightedQualityScore(metrics);

      const result = {
        expertId,
        qualityScore: Math.round(qualityScore * 100) / 100,
        tier: this.determineExpertTier(qualityScore, metrics.ratingCount),
        metrics: this.aggregateMetrics(metrics),
        calculatedAt: new Date(),
        timeRange
      };

      // Cache for 15 minutes
      await this.redis.setex(cacheKey, 900, JSON.stringify(result));
      
      return result;

    } catch (error) {
      this.logger.error('Failed to calculate quality score', error, { expertId });
      throw error;
    }
  }

  /**
   * 📊 GET COMPREHENSIVE EXPERT METRICS
   */
  static async getExpertMetrics(expertId, startDate) {
    const [
      ratingMetrics,
      completionMetrics,
      responseMetrics,
      studentMetrics,
      sessionMetrics
    ] = await Promise.all([
      this.getRatingMetrics(expertId, startDate),
      this.getCompletionMetrics(expertId, startDate),
      this.getResponseMetrics(expertId, startDate),
      this.getStudentMetrics(expertId, startDate),
      this.getSessionMetrics(expertId, startDate)
    ]);

    return {
      ...ratingMetrics,
      ...completionMetrics,
      ...responseMetrics,
      ...studentMetrics,
      ...sessionMetrics,
      expertId,
      period: {
        start: startDate,
        end: new Date()
      }
    };
  }

  /**
   * ⭐ RATING-BASED METRICS
   */
  static async getRatingMetrics(expertId, startDate) {
    const ratings = await this.sequelize.models.Rating.findAll({
      where: {
        expertId,
        status: 'ACTIVE',
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        'rating',
        'categories',
        'createdAt'
      ]
    });

    const ratingValues = ratings.map(r => r.rating);
    const totalRatings = ratingValues.length;

    if (totalRatings === 0) {
      return {
        ratingCount: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        ratingTrend: 'insufficient_data',
        categoryScores: {}
      };
    }

    // Calculate weighted average (recent ratings have more weight)
    const weightedAverage = this.calculateWeightedAverage(ratings);
    
    // Rating distribution
    const distribution = ratingValues.reduce((acc, rating) => {
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });

    // Category-based scores
    const categoryScores = this.calculateCategoryScores(ratings);

    return {
      ratingCount: totalRatings,
      averageRating: weightedAverage,
      ratingDistribution: distribution,
      ratingTrend: this.calculateRatingTrend(ratings),
      categoryScores,
      ratingVelocity: this.calculateRatingVelocity(ratings)
    };
  }

  /**
   * ✅ COMPLETION METRICS
   */
  static async getCompletionMetrics(expertId, startDate) {
    const enrollments = await this.sequelize.models.Enrollment.findAll({
      where: {
        expertId,
        createdAt: { [Op.gte]: startDate }
      },
      include: [{
        model: this.sequelize.models.TrainingSession,
        attributes: ['id', 'status', 'completedAt']
      }]
    });

    const totalEnrollments = enrollments.length;
    if (totalEnrollments === 0) {
      return {
        completionRate: 0,
        totalCompletions: 0,
        averageCompletionTime: 0,
        dropoutRate: 0
      };
    }

    const completedEnrollments = enrollments.filter(e => 
      e.TrainingSessions?.some(s => s.status === 'COMPLETED')
    ).length;

    const completionRate = (completedEnrollments / totalEnrollments) * 100;
    
    // Calculate average completion time
    const completionTimes = enrollments
      .filter(e => e.completedAt)
      .map(e => {
        const start = new Date(e.createdAt);
        const end = new Date(e.completedAt);
        return (end - start) / (1000 * 60 * 60 * 24); // Convert to days
      });

    const averageCompletionTime = completionTimes.length > 0 
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length 
      : 0;

    return {
      completionRate: Math.round(completionRate * 100) / 100,
      totalCompletions: completedEnrollments,
      averageCompletionTime: Math.round(averageCompletionTime * 100) / 100,
      dropoutRate: Math.round(((totalEnrollments - completedEnrollments) / totalEnrollments) * 10000) / 100
    };
  }

  /**
   * ⏰ RESPONSE METRICS
   */
  static async getResponseMetrics(expertId, startDate) {
    const sessions = await this.sequelize.models.TrainingSession.findAll({
      where: {
        expertId,
        createdAt: { [Op.gte]: startDate }
      },
      attributes: ['id', 'scheduledAt', 'startedAt', 'responseTime']
    });

    const responseTimes = sessions
      .filter(s => s.responseTime)
      .map(s => s.responseTime);

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const onTimeSessions = sessions.filter(s => {
      if (!s.startedAt || !s.scheduledAt) return false;
      const delay = Math.abs(new Date(s.startedAt) - new Date(s.scheduledAt));
      return delay <= 300000; // 5 minutes tolerance
    }).length;

    const punctualityRate = sessions.length > 0
      ? (onTimeSessions / sessions.length) * 100
      : 0;

    return {
      averageResponseTime: Math.round(averageResponseTime),
      punctualityRate: Math.round(punctualityRate * 100) / 100,
      totalSessions: sessions.length,
      onTimeSessions
    };
  }

  /**
   * 👥 STUDENT METRICS
   */
  static async getStudentMetrics(expertId, startDate) {
    const students = await this.sequelize.models.Student.findAll({
      include: [{
        model: this.sequelize.models.Enrollment,
        where: {
          expertId,
          createdAt: { [Op.gte]: startDate }
        },
        required: true
      }],
      attributes: ['id', 'satisfactionScore', 'retentionRate']
    });

    const satisfactionScores = students
      .filter(s => s.satisfactionScore)
      .map(s => s.satisfactionScore);

    const averageSatisfaction = satisfactionScores.length > 0
      ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length
      : 0;

    const retentionRates = students
      .filter(s => s.retentionRate)
      .map(s => s.retentionRate);

    const averageRetention = retentionRates.length > 0
      ? retentionRates.reduce((a, b) => a + b, 0) / retentionRates.length
      : 0;

    return {
      totalStudents: students.length,
      averageSatisfaction: Math.round(averageSatisfaction * 100) / 100,
      averageRetention: Math.round(averageRetention * 100) / 100,
      studentGrowth: await this.calculateStudentGrowth(expertId, startDate)
    };
  }

  /**
   * 🏋️ SESSION METRICS
   */
  static async getSessionMetrics(expertId, startDate) {
    const sessions = await this.sequelize.models.TrainingSession.findAll({
      where: {
        expertId,
        createdAt: { [Op.gte]: startDate }
      },
      attributes: [
        'id', 
        'status', 
        'duration', 
        'attendanceRate',
        'resourceUtilization',
        'createdAt'
      ]
    });

    const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
    const sessionCompletionRate = sessions.length > 0
      ? (completedSessions.length / sessions.length) * 100
      : 0;

    const averageDuration = completedSessions.length > 0
      ? completedSessions.reduce((sum, session) => sum + (session.duration || 0), 0) / completedSessions.length
      : 0;

    const averageAttendance = completedSessions.length > 0
      ? completedSessions.reduce((sum, session) => sum + (session.attendanceRate || 0), 0) / completedSessions.length
      : 0;

    return {
      totalSessions: sessions.length,
      completedSessions: completedSessions.length,
      sessionCompletionRate: Math.round(sessionCompletionRate * 100) / 100,
      averageDuration: Math.round(averageDuration),
      averageAttendance: Math.round(averageAttendance * 100) / 100,
      resourceUtilization: this.calculateResourceUtilization(sessions)
    };
  }

  /**
   * 🎯 COMPUTE WEIGHTED QUALITY SCORE
   */
  static computeWeightedQualityScore(metrics) {
    const weights = {
      rating: 0.35,           // 35% - Average rating
      completion: 0.25,       // 25% - Completion rate
      response: 0.15,         // 15% - Response time & punctuality
      student: 0.15,          // 15% - Student satisfaction & retention
      session: 0.10           // 10% - Session quality
    };

    let totalScore = 0;
    let totalWeight = 0;

    // Rating component (0-5 scale normalized to 0-1)
    if (metrics.averageRating > 0) {
      totalScore += (metrics.averageRating / 5) * weights.rating;
      totalWeight += weights.rating;
    }

    // Completion component (0-100% normalized to 0-1)
    if (metrics.completionRate > 0) {
      totalScore += (metrics.completionRate / 100) * weights.completion;
      totalWeight += weights.completion;
    }

    // Response component (inverse of response time, normalized)
    if (metrics.averageResponseTime > 0) {
      const responseScore = Math.max(0, 1 - (metrics.averageResponseTime / 3600000)); // 1 hour max
      totalScore += responseScore * weights.response;
      totalWeight += weights.response;
    }

    // Student satisfaction component (0-5 scale normalized)
    if (metrics.averageSatisfaction > 0) {
      totalScore += (metrics.averageSatisfaction / 5) * weights.student;
      totalWeight += weights.student;
    }

    // Session quality component
    if (metrics.sessionCompletionRate > 0) {
      totalScore += (metrics.sessionCompletionRate / 100) * weights.session;
      totalWeight += weights.session;
    }

    // Normalize to 0-5 scale
    const normalizedScore = totalWeight > 0 ? (totalScore / totalWeight) * 5 : 0;
    return Math.min(5, Math.max(0, normalizedScore));
  }

  /**
   * 🏆 DETERMINE EXPERT TIER
   */
  static determineExpertTier(qualityScore, ratingCount) {
    if (ratingCount < 5) return 'STANDARD'; // Insufficient data

    if (qualityScore >= 4.7 && ratingCount >= 20) return 'MASTER';
    if (qualityScore >= 4.3 && ratingCount >= 10) return 'SENIOR';
    if (qualityScore >= 4.0) return 'STANDARD';
    if (qualityScore >= 3.5) return 'DEVELOPING';
    return 'PROBATION';
  }

  /**
   * 📈 CALCULATE WEIGHTED AVERAGE (Recent ratings weighted higher)
   */
  static calculateWeightedAverage(ratings) {
    if (ratings.length === 0) return 0;

    const now = new Date();
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

    let totalWeight = 0;
    let weightedSum = 0;

    ratings.forEach(rating => {
      const age = now - new Date(rating.createdAt);
      const weight = Math.max(0, 1 - (age / maxAge)); // Linear decay
      
      weightedSum += rating.rating * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * 📊 CALCULATE CATEGORY SCORES
   */
  static calculateCategoryScores(ratings) {
    const categoryScores = {};

    ratings.forEach(rating => {
      if (rating.categories && typeof rating.categories === 'object') {
        Object.entries(rating.categories).forEach(([category, score]) => {
          if (!categoryScores[category]) {
            categoryScores[category] = { total: 0, count: 0 };
          }
          categoryScores[category].total += score;
          categoryScores[category].count++;
        });
      }
    });

    // Calculate averages
    const result = {};
    Object.entries(categoryScores).forEach(([category, data]) => {
      result[category] = Math.round((data.total / data.count) * 100) / 100;
    });

    return result;
  }

  /**
   * 📉 CALCULATE RATING TREND
   */
  static calculateRatingTrend(ratings) {
    if (ratings.length < 4) return 'insufficient_data';

    // Split into two halves
    const midPoint = Math.floor(ratings.length / 2);
    const recentRatings = ratings.slice(0, midPoint);
    const olderRatings = ratings.slice(midPoint);

    const recentAvg = recentRatings.reduce((sum, r) => sum + r.rating, 0) / recentRatings.length;
    const olderAvg = olderRatings.reduce((sum, r) => sum + r.rating, 0) / olderRatings.length;

    const difference = recentAvg - olderAvg;

    if (difference > 0.3) return 'improving';
    if (difference < -0.3) return 'declining';
    return 'stable';
  }

  /**
   * 🚀 CALCULATE RATING VELOCITY
   */
  static calculateRatingVelocity(ratings) {
    if (ratings.length < 2) return 0;

    const sortedRatings = ratings.sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    );

    const timeSpan = new Date(sortedRatings[sortedRatings.length - 1].createdAt) - 
                     new Date(sortedRatings[0].createdAt);
    
    const days = timeSpan / (1000 * 60 * 60 * 24);
    
    return days > 0 ? ratings.length / days : 0;
  }

  /**
   * 👥 CALCULATE STUDENT GROWTH
   */
  static async calculateStudentGrowth(expertId, startDate) {
    const periods = [
      { name: 'current', start: new Date(startDate.getTime() + (Date.now() - startDate.getTime()) / 2), end: new Date() },
      { name: 'previous', start: startDate, end: new Date(startDate.getTime() + (Date.now() - startDate.getTime()) / 2) }
    ];

    const studentCounts = await Promise.all(
      periods.map(async (period) => {
        const count = await this.sequelize.models.Enrollment.count({
          where: {
            expertId,
            createdAt: {
              [Op.between]: [period.start, period.end]
            }
          }
        });
        return count;
      })
    );

    const previousCount = studentCounts[1];
    if (previousCount === 0) return studentCounts[0] > 0 ? 100 : 0;

    const growth = ((studentCounts[0] - previousCount) / previousCount) * 100;
    return Math.round(growth * 100) / 100;
  }

  /**
   * 💾 CALCULATE RESOURCE UTILIZATION
   */
  static calculateResourceUtilization(sessions) {
    const utilizedSessions = sessions.filter(s => 
      s.resourceUtilization && s.resourceUtilization > 0
    );

    if (utilizedSessions.length === 0) return 0;

    const totalUtilization = utilizedSessions.reduce(
      (sum, session) => sum + session.resourceUtilization, 0
    );

    return Math.round((totalUtilization / utilizedSessions.length) * 100) / 100;
  }

  /**
   * 📋 AGGREGATE METRICS FOR DISPLAY
   */
  static aggregateMetrics(metrics) {
    return {
      core: {
        qualityScore: Math.round(this.computeWeightedQualityScore(metrics) * 100) / 100,
        tier: this.determineExpertTier(metrics.averageRating, metrics.ratingCount),
        overallRating: metrics.averageRating
      },
      performance: {
        completionRate: metrics.completionRate,
        responseTime: metrics.averageResponseTime,
        punctuality: metrics.punctualityRate
      },
      engagement: {
        studentSatisfaction: metrics.averageSatisfaction,
        retentionRate: metrics.averageRetention,
        sessionAttendance: metrics.averageAttendance
      },
      volume: {
        totalStudents: metrics.totalStudents,
        totalSessions: metrics.totalSessions,
        ratingCount: metrics.ratingCount
      }
    };
  }

  /**
   * 🔔 CHECK QUALITY THRESHOLDS AND TRIGGER ACTIONS
   */
  static async checkQualityThresholds(expertId) {
    const qualityData = await this.calculateExpertQualityScore(expertId);
    
    const thresholds = {
      MASTER: { min: 4.7, action: 'maintain' },
      SENIOR: { min: 4.3, max: 4.69, action: 'promote' },
      STANDARD: { min: 4.0, max: 4.29, action: 'monitor' },
      DEVELOPING: { min: 3.5, max: 3.99, action: 'support' },
      PROBATION: { max: 3.49, action: 'intervene' }
    };

    const currentTier = qualityData.tier;
    const currentScore = qualityData.qualityScore;
    const threshold = thresholds[currentTier];

    let actionRequired = null;
    let severity = 'info';

    if (currentTier === 'PROBATION' && currentScore <= 3.0) {
      actionRequired = { type: 'SUSPEND_EXPERT', reason: 'Consistently low quality score' };
      severity = 'critical';
    } else if (currentTier === 'DEVELOPING' && currentScore < 3.5) {
      actionRequired = { type: 'DEMOTE_TO_PROBATION', reason: 'Quality below developing threshold' };
      severity = 'high';
    } else if (currentTier === 'STANDARD' && currentScore >= 4.3) {
      actionRequired = { type: 'PROMOTE_TO_SENIOR', reason: 'Quality above senior threshold' };
      severity = 'low';
    } else if (currentTier === 'SENIOR' && currentScore >= 4.7) {
      actionRequired = { type: 'PROMOTE_TO_MASTER', reason: 'Quality above master threshold' };
      severity = 'low';
    }

    if (actionRequired) {
      await this.triggerQualityAction(expertId, actionRequired, severity, qualityData);
    }

    return {
      expertId,
      currentTier,
      qualityScore: currentScore,
      actionRequired,
      severity,
      timestamp: new Date()
    };
  }

  /**
   * ⚡ TRIGGER QUALITY ACTIONS
   */
  static async triggerQualityAction(expertId, action, severity, qualityData) {
    const actionRecord = await this.create({
      expertId,
      actionType: action.type,
      severity,
      reason: action.reason,
      qualityScore: qualityData.qualityScore,
      previousTier: qualityData.tier,
      newTier: action.type.includes('PROMOTE') 
        ? (action.type === 'PROMOTE_TO_MASTER' ? 'MASTER' : 'SENIOR')
        : (action.type === 'DEMOTE_TO_PROBATION' ? 'PROBATION' : qualityData.tier),
      metadata: {
        triggeredAt: new Date(),
        qualityData: qualityData.metrics,
        automated: true
      }
    });

    // Emit event for real-time processing
    this.emit('qualityActionTriggered', {
      expertId,
      action: actionRecord,
      qualityData
    });

    this.logger.info(`Quality action triggered`, {
      expertId,
      action: action.type,
      severity,
      qualityScore: qualityData.qualityScore
    });

    return actionRecord;
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  static async destroy() {
    if (this.redis) {
      await this.redis.quit();
    }
    this.logger.info('QualityMetrics resources cleaned up');
  }
}

// 🗃️ DATABASE SCHEMA DEFINITION
QualityMetrics.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  expertId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'experts',
      key: 'id'
    }
  },
  actionType: {
    type: DataTypes.ENUM(
      'PROMOTE_TO_MASTER',
      'PROMOTE_TO_SENIOR', 
      'DEMOTE_TO_PROBATION',
      'SUSPEND_EXPERT',
      'QUALITY_WARNING',
      'AUTO_CORRECT'
    ),
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('info', 'low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  qualityScore: {
    type: DataTypes.DECIMAL(3, 2),
    validate: { min: 0, max: 5 }
  },
  previousTier: {
    type: DataTypes.ENUM('MASTER', 'SENIOR', 'STANDARD', 'DEVELOPING', 'PROBATION')
  },
  newTier: {
    type: DataTypes.ENUM('MASTER', 'SENIOR', 'STANDARD', 'DEVELOPING', 'PROBATION')
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  resolvedAt: {
    type: DataTypes.DATE
  },
  resolvedBy: {
    type: DataTypes.UUID,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'QualityMetrics',
  tableName: 'quality_metrics',
  indexes: [
    {
      fields: ['expertId']
    },
    {
      fields: ['actionType']
    },
    {
      fields: ['severity']
    },
    {
      fields: ['createdAt']
    }
  ],
  hooks: {
    beforeCreate: (qualityMetric) => {
      qualityMetric.metadata = {
        ...qualityMetric.metadata,
        systemVersion: '1.0',
        calculatedAt: new Date().toISOString()
      };
    }
  }
});

module.exports = QualityMetrics;