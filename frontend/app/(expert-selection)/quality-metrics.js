/**
 * 🎯 MOSA FORGE: Enterprise Expert Quality Metrics System
 * 
 * @module QualityMetrics
 * @description Real-time expert quality scoring, monitoring, and tier management
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time quality score calculation
 * - Dynamic tier management (Master/Senior/Standard)
 * - Performance-based bonus calculation
 * - Quality threshold enforcement
 * - Auto-expert switching triggers
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');

// 🏗️ Enterprise Quality Constants
const QUALITY_THRESHOLDS = {
  MASTER: {
    minScore: 4.7,
    completionRate: 0.8,
    responseTime: 12, // hours
    studentSatisfaction: 0.9,
    bonusMultiplier: 1.2 // +20%
  },
  SENIOR: {
    minScore: 4.3,
    completionRate: 0.75,
    responseTime: 18, // hours
    studentSatisfaction: 0.85,
    bonusMultiplier: 1.1 // +10%
  },
  STANDARD: {
    minScore: 4.0,
    completionRate: 0.7,
    responseTime: 24, // hours
    studentSatisfaction: 0.8,
    bonusMultiplier: 1.0 // base
  },
  DEVELOPING: {
    minScore: 3.5,
    completionRate: 0.6,
    responseTime: 36, // hours
    studentSatisfaction: 0.7,
    bonusMultiplier: 0.9 // -10%
  },
  PROBATION: {
    minScore: 0,
    completionRate: 0.5,
    responseTime: 48, // hours
    studentSatisfaction: 0.6,
    bonusMultiplier: 0.8 // -20%
  }
};

const QUALITY_WEIGHTS = {
  RATING: 0.35,
  COMPLETION_RATE: 0.25,
  RESPONSE_TIME: 0.15,
  STUDENT_SATISFACTION: 0.15,
  ON_TIME_COMPLETION: 0.10
};

/**
 * 🏗️ Enterprise Quality Metrics Class
 * @class QualityMetrics
 * @extends EventEmitter
 */
class QualityMetrics extends EventEmitter {
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
      updateInterval: options.updateInterval || 3600000, // 1 hour
      minDataPoints: options.minDataPoints || 5,
      cacheTTL: options.cacheTTL || 1800 // 30 minutes
    };

    // 🏗️ Service Dependencies
    this.redis = new Redis(this.config.redis);
    this.prisma = this.config.prisma;
    
    // 🏗️ Performance Monitoring
    this.metrics = {
      qualityUpdates: 0,
      tierChanges: 0,
      bonusCalculations: 0,
      qualityAlerts: 0
    };

    this._initializeEventHandlers();
    this._startPeriodicUpdates();
  }

  /**
   * 🏗️ Initialize Enterprise Event Handlers
   * @private
   */
  _initializeEventHandlers() {
    this.on('quality.updated', (data) => {
      this._logEvent('QUALITY_UPDATED', data);
      this.metrics.qualityUpdates++;
    });

    this.on('tier.changed', (data) => {
      this._logEvent('TIER_CHANGED', data);
      this.metrics.tierChanges++;
    });

    this.on('bonus.calculated', (data) => {
      this._logEvent('BONUS_CALCULATED', data);
      this.metrics.bonusCalculations++;
    });

    this.on('quality.alert', (data) => {
      this._logEvent('QUALITY_ALERT', data);
      this.metrics.qualityAlerts++;
    });

    this.on('expert.atRisk', (data) => {
      this._logEvent('EXPERT_AT_RISK', data);
    });
  }

  /**
   * 🏗️ Start Periodic Quality Updates
   * @private
   */
  _startPeriodicUpdates() {
    setInterval(async () => {
      try {
        await this._updateAllExpertsQuality();
      } catch (error) {
        this._logError('PERIODIC_UPDATE_FAILED', error);
      }
    }, this.config.updateInterval);
  }

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Get Expert Quality Score
   * @param {string} expertId - Expert identifier
   * @param {boolean} forceRefresh - Force cache refresh
   * @returns {Promise<Object>} Comprehensive quality metrics
   */
  async getExpertQualityMetrics(expertId, forceRefresh = false) {
    const traceId = uuidv4();
    const cacheKey = `quality:expert:${expertId}`;

    try {
      // 🏗️ Check cache first for performance
      if (!forceRefresh) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // 🏗️ Validate expert exists
      await this._validateExpert(expertId);

      // 🏗️ Calculate comprehensive quality metrics
      const qualityData = await this._calculateQualityMetrics(expertId);
      
      // 🏗️ Determine current tier
      const tier = this._determineExpertTier(qualityData.overallScore, qualityData);
      
      // 🏗️ Calculate performance bonus
      const bonusData = await this._calculatePerformanceBonus(expertId, tier, qualityData);

      // 🏗️ Build comprehensive response
      const result = {
        expertId,
        overallScore: qualityData.overallScore,
        tier,
        tierScore: this._getTierScore(tier),
        metrics: qualityData,
        bonus: bonusData,
        recommendations: this._generateImprovementRecommendations(qualityData, tier),
        lastUpdated: new Date().toISOString(),
        traceId
      };

      // 🏗️ Cache results
      await this.redis.set(cacheKey, JSON.stringify(result), 'EX', this.config.cacheTTL);

      // 🏗️ Check for tier changes
      await this._checkAndUpdateTier(expertId, tier, qualityData.overallScore);

      this.emit('quality.updated', { expertId, overallScore: qualityData.overallScore, tier });

      return result;

    } catch (error) {
      this._logError('QUALITY_METRICS_FAILED', error, { expertId, traceId });
      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🎯 ENTERPRISE METHOD: Update Quality Metrics (Triggered by Events)
   * @param {string} expertId - Expert identifier
   * @param {string} eventType - Type of quality event
   * @param {Object} eventData - Event-specific data
   * @returns {Promise<Object>} Update result
   */
  async updateQualityMetrics(expertId, eventType, eventData) {
    const traceId = uuidv4();

    try {
      let updateResult;

      switch (eventType) {
        case 'SESSION_COMPLETED':
          updateResult = await this._handleSessionCompleted(expertId, eventData);
          break;
        
        case 'STUDENT_RATING':
          updateResult = await this._handleStudentRating(expertId, eventData);
          break;
        
        case 'RESPONSE_TIME':
          updateResult = await this._handleResponseTime(expertId, eventData);
          break;
        
        case 'COMPLETION_RATE':
          updateResult = await this._handleCompletionRate(expertId, eventData);
          break;
        
        default:
          throw new Error(`Unknown event type: ${eventType}`);
      }

      // 🏗️ Invalidate cache
      await this.redis.del(`quality:expert:${expertId}`);

      // 🏗️ Trigger real-time quality check
      await this._performRealTimeQualityCheck(expertId);

      this.emit('quality.updated', { 
        expertId, 
        eventType, 
        ...updateResult,
        traceId 
      });

      return {
        success: true,
        expertId,
        eventType,
        ...updateResult,
        traceId
      };

    } catch (error) {
      this._logError('QUALITY_UPDATE_FAILED', error, { expertId, eventType, traceId });
      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🎯 ENTERPRISE METHOD: Get Quality Dashboard
   * @param {string} expertId - Expert identifier
   * @returns {Promise<Object>} Comprehensive quality dashboard
   */
  async getQualityDashboard(expertId) {
    const traceId = uuidv4();

    try {
      // 🏗️ Get current quality metrics
      const qualityMetrics = await this.getExpertQualityMetrics(expertId);
      
      // 🏗️ Get historical trends
      const historicalData = await this._getHistoricalTrends(expertId);
      
      // 🏗️ Get peer comparison
      const peerComparison = await this._getPeerComparison(expertId, qualityMetrics.tier);
      
      // 🏗️ Get improvement suggestions
      const improvementPlan = await this._generateImprovementPlan(expertId, qualityMetrics);

      const dashboard = {
        expertId,
        currentMetrics: qualityMetrics,
        historicalTrends: historicalData,
        peerComparison,
        improvementPlan,
        alerts: this._generateQualityAlerts(qualityMetrics),
        performanceProjection: await this._calculatePerformanceProjection(expertId),
        lastUpdated: new Date().toISOString(),
        traceId
      };

      return dashboard;

    } catch (error) {
      this._logError('DASHBOARD_GENERATION_FAILED', error, { expertId, traceId });
      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🏗️ Calculate Comprehensive Quality Metrics
   * @private
   */
  async _calculateQualityMetrics(expertId) {
    const [
      ratingData,
      completionData,
      responseData,
      satisfactionData,
      onTimeData
    ] = await Promise.all([
      this._calculateAverageRating(expertId),
      this._calculateCompletionRate(expertId),
      this._calculateResponseTime(expertId),
      this._calculateStudentSatisfaction(expertId),
      this._calculateOnTimeCompletion(expertId)
    ]);

    // 🏗️ Weighted overall score calculation
    const overallScore = 
      (ratingData.score * QUALITY_WEIGHTS.RATING) +
      (completionData.rate * QUALITY_WEIGHTS.COMPLETION_RATE) +
      (responseData.score * QUALITY_WEIGHTS.RESPONSE_TIME) +
      (satisfactionData.score * QUALITY_WEIGHTS.STUDENT_SATISFACTION) +
      (onTimeData.rate * QUALITY_WEIGHTS.ON_TIME_COMPLETION);

    return {
      overallScore: this._normalizeScore(overallScore),
      rating: ratingData,
      completion: completionData,
      responseTime: responseData,
      satisfaction: satisfactionData,
      onTimeCompletion: onTimeData,
      dataPoints: {
        totalRatings: ratingData.count,
        totalSessions: completionData.totalSessions,
        totalStudents: completionData.totalStudents
      }
    };
  }

  /**
   * 🏗️ Calculate Average Rating with Confidence
   * @private
   */
  async _calculateAverageRating(expertId) {
    const ratings = await this.prisma.rating.findMany({
      where: { 
        expertId,
        createdAt: { 
          gte: new Date(Date.now() - (90 * 24 * 60 * 60 * 1000)) // Last 90 days
        }
      },
      select: {
        score: true,
        createdAt: true,
        studentId: true
      }
    });

    if (ratings.length === 0) {
      return { score: 0, count: 0, trend: 0, confidence: 'LOW' };
    }

    const totalScore = ratings.reduce((sum, rating) => sum + rating.score, 0);
    const averageScore = totalScore / ratings.length;

    // 🏗️ Calculate trend (last 30 days vs previous)
    const recentCutoff = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    const recentRatings = ratings.filter(r => r.createdAt >= recentCutoff);
    const previousRatings = ratings.filter(r => r.createdAt < recentCutoff);

    const recentAverage = recentRatings.length > 0 ? 
      recentRatings.reduce((sum, r) => sum + r.score, 0) / recentRatings.length : averageScore;
    
    const previousAverage = previousRatings.length > 0 ? 
      previousRatings.reduce((sum, r) => sum + r.score, 0) / previousRatings.length : averageScore;

    const trend = recentAverage - previousAverage;

    // 🏗️ Calculate confidence based on data points
    const confidence = ratings.length >= 10 ? 'HIGH' : 
                      ratings.length >= 5 ? 'MEDIUM' : 'LOW';

    return {
      score: this._normalizeScore(averageScore),
      count: ratings.length,
      trend: this._normalizeScore(trend),
      confidence,
      distribution: this._calculateRatingDistribution(ratings)
    };
  }

  /**
   * 🏗️ Calculate Completion Rate
   * @private
   */
  async _calculateCompletionRate(expertId) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { 
        expertId,
        createdAt: { 
          gte: new Date(Date.now() - (180 * 24 * 60 * 60 * 1000)) // Last 6 months
        }
      },
      select: {
        id: true,
        status: true,
        studentId: true,
        createdAt: true
      }
    });

    if (enrollments.length === 0) {
      return { rate: 0, totalSessions: 0, completed: 0, abandoned: 0, totalStudents: 0 };
    }

    const completed = enrollments.filter(e => e.status === 'COMPLETED').length;
    const abandoned = enrollments.filter(e => e.status === 'CANCELLED').length;
    const completionRate = completed / (enrollments.length - abandoned);

    // 🏗️ Unique students count
    const uniqueStudents = new Set(enrollments.map(e => e.studentId)).size;

    return {
      rate: this._normalizeScore(completionRate),
      totalSessions: enrollments.length,
      completed,
      abandoned,
      totalStudents: uniqueStudents,
      trend: await this._calculateCompletionTrend(expertId)
    };
  }

  /**
   * 🏗️ Calculate Response Time Metrics
   * @private
   */
  async _calculateResponseTime(expertId) {
    const responses = await this.prisma.expertResponse.findMany({
      where: { 
        expertId,
        createdAt: { 
          gte: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000)) // Last 30 days
        }
      },
      select: {
        responseTimeHours: true,
        messageType: true,
        createdAt: true
      }
    });

    if (responses.length === 0) {
      return { averageHours: 48, score: 0, count: 0, trend: 0 };
    }

    const totalResponseTime = responses.reduce((sum, r) => sum + r.responseTimeHours, 0);
    const averageResponseTime = totalResponseTime / responses.length;

    // 🏗️ Convert to score (lower is better)
    const score = Math.max(0, (48 - averageResponseTime) / 48);

    // 🏗️ Calculate trend
    const recentCutoff = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    const recentResponses = responses.filter(r => r.createdAt >= recentCutoff);
    const recentAverage = recentResponses.length > 0 ? 
      recentResponses.reduce((sum, r) => sum + r.responseTimeHours, 0) / recentResponses.length : averageResponseTime;

    const trend = averageResponseTime - recentAverage; // Negative trend means improving

    return {
      averageHours: averageResponseTime,
      score: this._normalizeScore(score),
      count: responses.length,
      trend: this._normalizeScore(-trend / 24), // Normalize trend
      byMessageType: this._calculateResponseTimeByType(responses)
    };
  }

  /**
   * 🏗️ Calculate Student Satisfaction
   * @private
   */
  async _calculateStudentSatisfaction(expertId) {
    const feedback = await this.prisma.feedback.findMany({
      where: { 
        expertId,
        createdAt: { 
          gte: new Date(Date.now() - (90 * 24 * 60 * 60 * 1000))
        }
      },
      select: {
        satisfactionScore: true,
        wouldRecommend: true,
        createdAt: true,
        category: true
      }
    });

    if (feedback.length === 0) {
      return { score: 0, count: 0, recommendationRate: 0, trend: 0 };
    }

    const totalSatisfaction = feedback.reduce((sum, f) => sum + f.satisfactionScore, 0);
    const averageSatisfaction = totalSatisfaction / feedback.length;

    const wouldRecommend = feedback.filter(f => f.wouldRecommend).length;
    const recommendationRate = wouldRecommend / feedback.length;

    // 🏗️ Calculate trend
    const recentCutoff = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    const recentFeedback = feedback.filter(f => f.createdAt >= recentCutoff);
    const recentSatisfaction = recentFeedback.length > 0 ? 
      recentFeedback.reduce((sum, f) => sum + f.satisfactionScore, 0) / recentFeedback.length : averageSatisfaction;

    const trend = recentSatisfaction - averageSatisfaction;

    return {
      score: this._normalizeScore(averageSatisfaction / 5), // Normalize to 0-1
      count: feedback.length,
      recommendationRate: this._normalizeScore(recommendationRate),
      trend: this._normalizeScore(trend / 5),
      byCategory: this._calculateSatisfactionByCategory(feedback)
    };
  }

  /**
   * 🏗️ Calculate On-Time Completion Rate
   * @private
   */
  async _calculateOnTimeCompletion(expertId) {
    const completedSessions = await this.prisma.trainingSession.findMany({
      where: { 
        expertId,
        status: 'COMPLETED',
        actualEndDate: { not: null },
        scheduledEndDate: { not: null }
      },
      select: {
        scheduledEndDate: true,
        actualEndDate: true,
        createdAt: true
      }
    });

    if (completedSessions.length === 0) {
      return { rate: 0, total: 0, onTime: 0, delayed: 0 };
    }

    const onTimeSessions = completedSessions.filter(session => 
      session.actualEndDate <= session.scheduledEndDate
    ).length;

    const onTimeRate = onTimeSessions / completedSessions.length;

    return {
      rate: this._normalizeScore(onTimeRate),
      total: completedSessions.length,
      onTime: onTimeSessions,
      delayed: completedSessions.length - onTimeSessions,
      averageDelay: this._calculateAverageDelay(completedSessions)
    };
  }

  /**
   * 🏗️ Determine Expert Tier
   * @private
   */
  _determineExpertTier(overallScore, qualityData) {
    if (overallScore >= QUALITY_THRESHOLDS.MASTER.minScore &&
        qualityData.completion.rate >= QUALITY_THRESHOLDS.MASTER.completionRate &&
        qualityData.responseTime.averageHours <= QUALITY_THRESHOLDS.MASTER.responseTime &&
        qualityData.satisfaction.score >= QUALITY_THRESHOLDS.MASTER.studentSatisfaction) {
      return 'MASTER';
    }

    if (overallScore >= QUALITY_THRESHOLDS.SENIOR.minScore &&
        qualityData.completion.rate >= QUALITY_THRESHOLDS.SENIOR.completionRate &&
        qualityData.responseTime.averageHours <= QUALITY_THRESHOLDS.SENIOR.responseTime &&
        qualityData.satisfaction.score >= QUALITY_THRESHOLDS.SENIOR.studentSatisfaction) {
      return 'SENIOR';
    }

    if (overallScore >= QUALITY_THRESHOLDS.STANDARD.minScore &&
        qualityData.completion.rate >= QUALITY_THRESHOLDS.STANDARD.completionRate &&
        qualityData.responseTime.averageHours <= QUALITY_THRESHOLDS.STANDARD.responseTime &&
        qualityData.satisfaction.score >= QUALITY_THRESHOLDS.STANDARD.studentSatisfaction) {
      return 'STANDARD';
    }

    if (overallScore >= QUALITY_THRESHOLDS.DEVELOPING.minScore) {
      return 'DEVELOPING';
    }

    return 'PROBATION';
  }

  /**
   * 🏗️ Calculate Performance Bonus
   * @private
   */
  async _calculatePerformanceBonus(expertId, tier, qualityData) {
    const baseEarning = 999; // Base expert earning per student
    const tierMultiplier = QUALITY_THRESHOLDS[tier].bonusMultiplier;
    
    // 🏗️ Quality-based bonus adjustments
    let qualityBonus = 0;
    
    // Bonus for exceeding tier thresholds
    if (qualityData.overallScore > QUALITY_THRESHOLDS[tier].minScore + 0.2) {
      qualityBonus += 0.05; // +5% for exceptional quality
    }
    
    if (qualityData.completion.rate > QUALITY_THRESHOLDS[tier].completionRate + 0.1) {
      qualityBonus += 0.05; // +5% for high completion
    }

    const totalMultiplier = Math.min(tierMultiplier + qualityBonus, 1.2); // Cap at +20%

    return {
      baseEarning,
      tierMultiplier,
      qualityBonus,
      totalMultiplier,
      potentialEarning: baseEarning * totalMultiplier,
      nextTierBonus: await this._calculateNextTierPotential(expertId, tier)
    };
  }

  /**
   * 🏗️ Check and Update Expert Tier
   * @private
   */
  async _checkAndUpdateTier(expertId, newTier, overallScore) {
    const currentTier = await this.prisma.expert.findUnique({
      where: { id: expertId },
      select: { tier: true }
    });

    if (currentTier.tier !== newTier) {
      // 🏗️ Update expert tier
      await this.prisma.expert.update({
        where: { id: expertId },
        data: { 
          tier: newTier,
          tierUpdatedAt: new Date()
        }
      });

      // 🏗️ Log tier change
      await this.prisma.tierHistory.create({
        data: {
          expertId,
          fromTier: currentTier.tier,
          toTier: newTier,
          overallScore,
          reason: 'AUTOMATIC_QUALITY_UPDATE'
        }
      });

      this.emit('tier.changed', {
        expertId,
        fromTier: currentTier.tier,
        toTier: newTier,
        overallScore
      });

      // 🏗️ Trigger bonus recalculation
      this.emit('bonus.calculated', { expertId, newTier });
    }
  }

  /**
   * 🏗️ Handle Session Completed Event
   * @private
   */
  async _handleSessionCompleted(expertId, sessionData) {
    // Update completion metrics
    await this.prisma.expertMetrics.upsert({
      where: { expertId },
      update: {
        totalSessions: { increment: 1 },
        completedSessions: { increment: 1 },
        lastSessionAt: new Date()
      },
      create: {
        expertId,
        totalSessions: 1,
        completedSessions: 1,
        lastSessionAt: new Date()
      }
    });

    return { metric: 'completion', value: 1 };
  }

  /**
   * 🏗️ Handle Student Rating Event
   * @private
   */
  async _handleStudentRating(expertId, ratingData) {
    // Store individual rating
    await this.prisma.rating.create({
      data: {
        expertId,
        studentId: ratingData.studentId,
        score: ratingData.score,
        comment: ratingData.comment,
        category: ratingData.category
      }
    });

    return { metric: 'rating', value: ratingData.score };
  }

  /**
   * 🏗️ Generate Improvement Recommendations
   * @private
   */
  _generateImprovementRecommendations(qualityData, tier) {
    const recommendations = [];

    if (qualityData.rating.score < QUALITY_THRESHOLDS[tier].minScore) {
      recommendations.push({
        area: 'RATING',
        priority: 'HIGH',
        suggestion: 'Focus on improving student feedback through better communication and session quality',
        target: `Increase rating to ${QUALITY_THRESHOLDS[tier].minScore}+`
      });
    }

    if (qualityData.completion.rate < QUALITY_THRESHOLDS[tier].completionRate) {
      recommendations.push({
        area: 'COMPLETION',
        priority: 'HIGH',
        suggestion: 'Improve student retention through better engagement and support',
        target: `Achieve ${(QUALITY_THRESHOLDS[tier].completionRate * 100)}%+ completion rate`
      });
    }

    if (qualityData.responseTime.averageHours > QUALITY_THRESHOLDS[tier].responseTime) {
      recommendations.push({
        area: 'RESPONSE_TIME',
        priority: 'MEDIUM',
        suggestion: 'Reduce response time to student inquiries',
        target: `Respond within ${QUALITY_THRESHOLDS[tier].responseTime} hours`
      });
    }

    return recommendations;
  }

  /**
   * 🏗️ Utility: Normalize Score to 0-5 scale
   * @private
   */
  _normalizeScore(score) {
    return Math.min(5, Math.max(0, Number(score.toFixed(2))));
  }

  /**
   * 🏗️ Utility: Get Tier Score
   * @private
   */
  _getTierScore(tier) {
    return QUALITY_THRESHOLDS[tier].minScore;
  }

  /**
   * 🏗️ Utility: Validate Expert Exists
   * @private
   */
  async _validateExpert(expertId) {
    const expert = await this.prisma.expert.findUnique({
      where: { id: expertId },
      select: { id: true, status: true }
    });

    if (!expert) {
      throw new Error(`Expert not found: ${expertId}`);
    }

    if (expert.status !== 'ACTIVE') {
      throw new Error(`Expert is not active: ${expertId}`);
    }

    return true;
  }

  /**
   * 🏗️ Enterprise Logging
   * @private
   */
  _logEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'quality-metrics',
      event: eventType,
      data,
      environment: process.env.NODE_ENV || 'development'
    };

    console.log(JSON.stringify(logEntry));

    if (process.env.NODE_ENV === 'production') {
      this.redis.publish('service-logs', JSON.stringify(logEntry));
    }
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
   * 🏗️ Format Enterprise Error
   * @private
   */
  _formatEnterpriseError(error) {
    const enterpriseError = new Error(error.message);
    enterpriseError.code = error.code || 'QUALITY_SYSTEM_ERROR';
    enterpriseError.timestamp = new Date().toISOString();
    enterpriseError.severity = 'HIGH';
    
    return enterpriseError;
  }

  // 🏗️ Additional helper methods would be implemented here...
  // _calculateRatingDistribution, _calculateCompletionTrend, 
  // _calculateResponseTimeByType, _calculateSatisfactionByCategory,
  // _calculateAverageDelay, _getHistoricalTrends, _getPeerComparison,
  // _generateImprovementPlan, _generateQualityAlerts, 
  // _calculatePerformanceProjection, _calculateNextTierPotential,
  // _performRealTimeQualityCheck, _updateAllExpertsQuality

  /**
   * 🏗️ Get Service Metrics
   * @returns {Object} Service performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }

  /**
   * 🏗️ Graceful Shutdown
   */
  async shutdown() {
    try {
      this.emit('service.shutdown.started');
      await this.redis.quit();
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
  QualityMetrics,
  QUALITY_THRESHOLDS,
  QUALITY_WEIGHTS
};

// 🏗️ Singleton Instance for Microservice Architecture
let qualityMetricsInstance = null;

module.exports.getInstance = (options = {}) => {
  if (!qualityMetricsInstance) {
    qualityMetricsInstance = new QualityMetrics(options);
  }
  return qualityMetricsInstance;
};