// quality-service/metrics-calculator.js

/**
 * 📊 ENTERPRISE METRICS CALCULATION ENGINE
 * Advanced performance metrics, scoring algorithms, and quality analytics
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../utils/logger');
const { StatisticalEngine } = require('../utils/statistical-engine');
const { OutlierDetector } = require('../utils/outlier-detector');

class MetricsCalculator extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('MetricsCalculator');
    this.statsEngine = new StatisticalEngine();
    this.outlierDetector = new OutlierDetector();
    
    // Weight configurations for different metrics
    this.weights = {
      QUALITY_SCORE: {
        ratingAverage: 0.35,
        ratingConsistency: 0.15,
        completionRate: 0.25,
        responseTime: 0.15,
        studentSatisfaction: 0.10
      },
      TIER_SCORE: {
        qualityScore: 0.40,
        studentRetention: 0.20,
        sessionVolume: 0.15,
        complaintResolution: 0.15,
        certificationRate: 0.10
      },
      BONUS_ELIGIBILITY: {
        qualityThreshold: 0.50,
        volumeThreshold: 0.30,
        retentionThreshold: 0.20
      }
    };

    // Calculation parameters
    this.calculationParams = {
      ratingTimeframe: 90, // days
      minRatingsForAccuracy: 5,
      outlierThreshold: 2.5,
      trendWindow: 30, // days
      confidenceLevel: 0.95
    };

    this.cache = new Map();
    this.initialize();
  }

  /**
   * 🚀 INITIALIZE METRICS CALCULATOR
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.warmUpCalculationCache();
      
      this.logger.info('Metrics calculator initialized successfully');
      this.emit('calculatorReady');
      
    } catch (error) {
      this.logger.error('Failed to initialize metrics calculator', error);
      throw error;
    }
  }

  /**
   * 🎯 CALCULATE COMPREHENSIVE QUALITY SCORE
   */
  async calculateExpertQualityScore(expertId, timeframe = '90d') {
    const cacheKey = `quality:score:${expertId}:${timeframe}`;
    const startTime = performance.now();

    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fetch raw data for calculation
      const rawData = await this.fetchExpertRawData(expertId, timeframe);
      
      // Calculate component scores
      const componentScores = await this.calculateComponentScores(rawData);
      
      // Apply weights and calculate final score
      const finalScore = this.applyWeightedScoring(componentScores);
      
      // Detect anomalies and trends
      const analytics = await this.calculateScoreAnalytics(expertId, finalScore, rawData);
      
      const result = {
        expertId,
        qualityScore: finalScore,
        componentScores,
        analytics,
        confidence: this.calculateConfidenceInterval(rawData),
        timestamp: new Date(),
        timeframe,
        calculationTime: performance.now() - startTime
      };

      // Cache result with dynamic TTL based on confidence
      const ttl = this.calculateCacheTTL(result.confidence);
      await this.redis.setex(cacheKey, ttl, JSON.stringify(result));

      this.emit('qualityScoreCalculated', result);
      return result;

    } catch (error) {
      this.logger.error('Quality score calculation failed', error, { expertId, timeframe });
      throw error;
    }
  }

  /**
   * 📥 FETCH EXPERT RAW DATA FOR CALCULATIONS
   */
  async fetchExpertRawData(expertId, timeframe) {
    const days = this.parseTimeframe(timeframe);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      ratings,
      sessions,
      complaints,
      enrollments,
      completions
    ] = await Promise.all([
      this.prisma.rating.findMany({
        where: {
          expertId,
          status: 'ACTIVE',
          createdAt: { gte: startDate }
        },
        select: {
          rating: true,
          categories: true,
          createdAt: true,
          fraudScore: true
        }
      }),
      this.prisma.trainingSession.findMany({
        where: {
          expertId,
          scheduledAt: { gte: startDate }
        },
        select: {
          status: true,
          scheduledAt: true,
          completedAt: true,
          duration: true,
          studentSatisfaction: true
        }
      }),
      this.prisma.complaint.findMany({
        where: {
          expertId,
          createdAt: { gte: startDate }
        },
        select: {
          severity: true,
          status: true,
          resolvedAt: true,
          createdAt: true
        }
      }),
      this.prisma.enrollment.findMany({
        where: {
          expertId,
          createdAt: { gte: startDate }
        },
        select: {
          status: true,
          createdAt: true,
          studentId: true
        }
      }),
      this.prisma.certification.findMany({
        where: {
          expertId,
          issuedAt: { gte: startDate }
        },
        select: {
          studentId: true,
          issuedAt: true,
          score: true
        }
      })
    ]);

    return {
      ratings,
      sessions,
      complaints,
      enrollments,
      completions,
      timeframe: {
        days,
        startDate,
        endDate: new Date()
      }
    };
  }

  /**
   * 📊 CALCULATE COMPONENT SCORES
   */
  async calculateComponentScores(rawData) {
    const {
      ratingAverage,
      ratingConsistency,
      completionRate,
      responseTime,
      studentSatisfaction
    } = await this.calculateRatingMetrics(rawData.ratings);

    const sessionMetrics = this.calculateSessionMetrics(rawData.sessions);
    const complaintMetrics = this.calculateComplaintMetrics(rawData.complaints);
    const retentionMetrics = this.calculateRetentionMetrics(rawData.enrollments);
    const certificationMetrics = this.calculateCertificationMetrics(rawData.completions);

    return {
      ratingAverage: this.normalizeScore(ratingAverage, 1, 5),
      ratingConsistency: this.normalizeScore(ratingConsistency, 0, 1),
      completionRate: this.normalizeScore(completionRate, 0, 1),
      responseTime: this.normalizeResponseTime(responseTime),
      studentSatisfaction: this.normalizeScore(studentSatisfaction, 1, 5),
      sessionVolume: this.normalizeSessionVolume(sessionMetrics.totalSessions),
      complaintResolution: this.normalizeScore(complaintMetrics.resolutionRate, 0, 1),
      studentRetention: this.normalizeScore(retentionMetrics.retentionRate, 0, 1),
      certificationRate: this.normalizeScore(certificationMetrics.certificationRate, 0, 1)
    };
  }

  /**
   * ⭐ CALCULATE RATING METRICS
   */
  async calculateRatingMetrics(ratings) {
    if (ratings.length === 0) {
      return {
        ratingAverage: 4.0,
        ratingConsistency: 0.8,
        completionRate: 0.8,
        responseTime: 12,
        studentSatisfaction: 4.0
      };
    }

    // Filter out fraudulent ratings
    const validRatings = ratings.filter(r => r.fraudScore < 0.7);
    
    // Calculate weighted average (recent ratings have more weight)
    const ratingAverage = this.calculateWeightedRatingAverage(validRatings);
    
    // Calculate consistency (standard deviation inverse)
    const ratingConsistency = this.calculateRatingConsistency(validRatings);
    
    // Calculate completion rate from ratings
    const completionRate = this.calculateRatingBasedCompletion(validRatings);
    
    // Estimate response time from rating patterns
    const responseTime = this.estimateResponseTime(validRatings);
    
    // Calculate student satisfaction from categories
    const studentSatisfaction = this.calculateStudentSatisfaction(validRatings);

    return {
      ratingAverage,
      ratingConsistency,
      completionRate,
      responseTime,
      studentSatisfaction
    };
  }

  /**
   * ⚖️ CALCULATE WEIGHTED RATING AVERAGE
   */
  calculateWeightedRatingAverage(ratings) {
    const now = Date.now();
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds

    const weightedSum = ratings.reduce((sum, rating) => {
      const age = now - new Date(rating.createdAt).getTime();
      const weight = 1 - (age / maxAge); // Recent ratings have higher weight
      return sum + (rating.rating * Math.max(weight, 0.1));
    }, 0);

    const totalWeight = ratings.reduce((sum, rating) => {
      const age = now - new Date(rating.createdAt).getTime();
      const weight = 1 - (age / maxAge);
      return sum + Math.max(weight, 0.1);
    }, 0);

    return weightedSum / totalWeight;
  }

  /**
   * 📈 CALCULATE RATING CONSISTENCY
   */
  calculateRatingConsistency(ratings) {
    if (ratings.length < 2) return 0.8;

    const ratingsArray = ratings.map(r => r.rating);
    const mean = ratingsArray.reduce((sum, val) => sum + val, 0) / ratingsArray.length;
    const variance = ratingsArray.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / ratingsArray.length;
    const stdDev = Math.sqrt(variance);

    // Convert to consistency score (higher stdDev = lower consistency)
    const maxStdDev = 2; // Maximum expected standard deviation
    const consistency = 1 - (stdDev / maxStdDev);
    
    return Math.max(0, Math.min(1, consistency));
  }

  /**
   * ✅ CALCULATE RATING-BASED COMPLETION
   */
  calculateRatingBasedCompletion(ratings) {
    // Assume ratings only exist for completed sessions
    // This is a proxy for completion rate
    const expectedSessions = Math.max(ratings.length * 1.2, 10); // Estimate total sessions
    const completionRate = ratings.length / expectedSessions;
    
    return Math.min(1, completionRate);
  }

  /**
   * ⏱️ ESTIMATE RESPONSE TIME
   */
  estimateResponseTime(ratings) {
    if (ratings.length < 3) return 12; // Default response time

    // Analyze rating patterns to estimate response behavior
    const responseTimes = [];
    
    for (let i = 1; i < ratings.length; i++) {
      const timeDiff = new Date(ratings[i].createdAt) - new Date(ratings[i-1].createdAt);
      // Convert to hours and cap at reasonable maximum
      responseTimes.push(Math.min(timeDiff / (60 * 60 * 1000), 72));
    }

    return this.statsEngine.calculateMedian(responseTimes);
  }

  /**
   * 😊 CALCULATE STUDENT SATISFACTION
   */
  calculateStudentSatisfaction(ratings) {
    if (ratings.length === 0) return 4.0;

    let satisfactionSum = 0;
    let satisfactionCount = 0;

    ratings.forEach(rating => {
      if (rating.categories) {
        const categoryScores = Object.values(rating.categories);
        if (categoryScores.length > 0) {
          satisfactionSum += categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length;
          satisfactionCount++;
        }
      }
    });

    // Fallback to main rating if no category data
    if (satisfactionCount === 0) {
      return ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    }

    return satisfactionSum / satisfactionCount;
  }

  /**
   * 📅 CALCULATE SESSION METRICS
   */
  calculateSessionMetrics(sessions) {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
    const cancelledSessions = sessions.filter(s => s.status === 'CANCELLED').length;
    
    const completionRate = totalSessions > 0 ? completedSessions / totalSessions : 0.8;
    
    // Calculate average session duration
    const completedWithDuration = sessions.filter(s => s.duration && s.status === 'COMPLETED');
    const averageDuration = completedWithDuration.length > 0 
      ? completedWithDuration.reduce((sum, s) => sum + s.duration, 0) / completedWithDuration.length 
      : 60; // Default 60 minutes

    return {
      totalSessions,
      completedSessions,
      cancelledSessions,
      completionRate,
      averageDuration
    };
  }

  /**
   * 🚨 CALCULATE COMPLAINT METRICS
   */
  calculateComplaintMetrics(complaints) {
    const totalComplaints = complaints.length;
    const resolvedComplaints = complaints.filter(c => c.status === 'RESOLVED').length;
    const criticalComplaints = complaints.filter(c => c.severity === 'CRITICAL').length;
    
    const resolutionRate = totalComplaints > 0 ? resolvedComplaints / totalComplaints : 1;
    
    // Calculate average resolution time
    const resolvedWithTime = complaints.filter(c => c.resolvedAt && c.status === 'RESOLVED');
    let averageResolutionTime = 24; // Default 24 hours
    
    if (resolvedWithTime.length > 0) {
      const totalTime = resolvedWithTime.reduce((sum, complaint) => {
        const resolutionTime = new Date(complaint.resolvedAt) - new Date(complaint.createdAt);
        return sum + (resolutionTime / (60 * 60 * 1000)); // Convert to hours
      }, 0);
      averageResolutionTime = totalTime / resolvedWithTime.length;
    }

    return {
      totalComplaints,
      resolvedComplaints,
      criticalComplaints,
      resolutionRate,
      averageResolutionTime
    };
  }

  /**
   * 🔄 CALCULATE RETENTION METRICS
   */
  calculateRetentionMetrics(enrollments) {
    const totalEnrollments = enrollments.length;
    const activeEnrollments = enrollments.filter(e => e.status === 'ACTIVE').length;
    const completedEnrollments = enrollments.filter(e => e.status === 'COMPLETED').length;
    
    const retentionRate = totalEnrollments > 0 
      ? (activeEnrollments + completedEnrollments) / totalEnrollments 
      : 0.8;

    // Calculate unique students
    const uniqueStudents = new Set(enrollments.map(e => e.studentId)).size;

    return {
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      retentionRate,
      uniqueStudents
    };
  }

  /**
   * 🏆 CALCULATE CERTIFICATION METRICS
   */
  calculateCertificationMetrics(certifications) {
    const totalCertifications = certifications.length;
    const averageCertificationScore = totalCertifications > 0
      ? certifications.reduce((sum, c) => sum + c.score, 0) / totalCertifications
      : 85; // Default score

    // Estimate certification rate (this would normally come from completion data)
    const certificationRate = Math.min(totalCertifications / 10, 1); // Proxy calculation

    return {
      totalCertifications,
      averageCertificationScore,
      certificationRate
    };
  }

  /**
   * ⚖️ APPLY WEIGHTED SCORING
   */
  applyWeightedScoring(componentScores) {
    const weights = this.weights.QUALITY_SCORE;
    
    const weightedScore = 
      (componentScores.ratingAverage * weights.ratingAverage) +
      (componentScores.ratingConsistency * weights.ratingConsistency) +
      (componentScores.completionRate * weights.completionRate) +
      (componentScores.responseTime * weights.responseTime) +
      (componentScores.studentSatisfaction * weights.studentSatisfaction);

    // Convert to 1-5 scale
    const normalizedScore = 1 + (weightedScore * 4);
    
    return this.applyScoreAdjustments(normalizedScore, componentScores);
  }

  /**
   * 🎯 APPLY SCORE ADJUSTMENTS
   */
  applyScoreAdjustments(baseScore, componentScores) {
    let adjustedScore = baseScore;

    // Penalty for low volume (if applicable)
    if (componentScores.sessionVolume < 0.3) {
      adjustedScore -= 0.3;
    }

    // Bonus for high consistency
    if (componentScores.ratingConsistency > 0.9) {
      adjustedScore += 0.2;
    }

    // Penalty for complaint issues
    if (componentScores.complaintResolution < 0.5) {
      adjustedScore -= 0.5;
    }

    return Math.max(1, Math.min(5, adjustedScore));
  }

  /**
   * 📈 CALCULATE SCORE ANALYTICS
   */
  async calculateScoreAnalytics(expertId, currentScore, rawData) {
    const historicalScores = await this.getHistoricalScores(expertId);
    const trend = this.calculateScoreTrend(historicalScores, currentScore);
    const volatility = this.calculateScoreVolatility(historicalScores);
    const outliers = this.outlierDetector.detectQualityOutliers(rawData.ratings);
    const predictions = this.predictFutureScores(historicalScores, currentScore);

    return {
      trend,
      volatility,
      outlierCount: outliers.length,
      prediction: predictions,
      percentile: await this.calculatePercentileRank(currentScore),
      improvementPotential: this.calculateImprovementPotential(currentScore, rawData)
    };
  }

  /**
   * 📊 CALCULATE SCORE TREND
   */
  calculateScoreTrend(historicalScores, currentScore) {
    if (historicalScores.length < 3) return 'stable';

    const recentScores = historicalScores.slice(-3);
    const previousAverage = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    
    const difference = currentScore - previousAverage;
    
    if (difference > 0.3) return 'improving';
    if (difference < -0.3) return 'declining';
    return 'stable';
  }

  /**
   * 📉 CALCULATE SCORE VOLATILITY
   */
  calculateScoreVolatility(historicalScores) {
    if (historicalScores.length < 2) return 0;

    const mean = historicalScores.reduce((sum, score) => sum + score, 0) / historicalScores.length;
    const variance = historicalScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / historicalScores.length;
    
    return Math.sqrt(variance);
  }

  /**
   * 🔮 PREDICT FUTURE SCORES
   */
  predictFutureScores(historicalScores, currentScore) {
    if (historicalScores.length < 4) {
      return {
        next30Days: currentScore,
        confidence: 0.5
      };
    }

    // Simple linear regression for prediction
    const scores = [...historicalScores, currentScore];
    const n = scores.length;
    
    const xSum = scores.reduce((sum, _, i) => sum + i, 0);
    const ySum = scores.reduce((sum, score) => sum + score, 0);
    const xySum = scores.reduce((sum, score, i) => sum + (i * score), 0);
    const x2Sum = scores.reduce((sum, _, i) => sum + (i * i), 0);

    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
    const intercept = (ySum - slope * xSum) / n;

    const next30Days = slope * n + intercept;
    const confidence = Math.max(0.1, 1 - Math.abs(slope) * 2); // Higher volatility = lower confidence

    return {
      next30Days: Math.max(1, Math.min(5, next30Days)),
      confidence: Math.min(0.9, confidence)
    };
  }

  /**
   * 🏆 CALCULATE PERCENTILE RANK
   */
  async calculatePercentileRank(score) {
    const cacheKey = 'quality:score_distribution';
    
    let distribution = await this.redis.get(cacheKey);
    if (!distribution) {
      distribution = await this.calculateScoreDistribution();
      await this.redis.setex(cacheKey, 3600, JSON.stringify(distribution)); // Cache for 1 hour
    } else {
      distribution = JSON.parse(distribution);
    }

    const scores = distribution.scores;
    const belowCount = scores.filter(s => s < score).length;
    
    return scores.length > 0 ? belowCount / scores.length : 0.5;
  }

  /**
   * 📈 CALCULATE SCORE DISTRIBUTION
   */
  async calculateScoreDistribution() {
    const experts = await this.prisma.expert.findMany({
      where: { status: 'ACTIVE' },
      select: { qualityScore: true }
    });

    const scores = experts.map(e => e.qualityScore).filter(score => score !== null);
    
    return {
      scores,
      mean: this.statsEngine.calculateMean(scores),
      median: this.statsEngine.calculateMedian(scores),
      stdDev: this.statsEngine.calculateStandardDeviation(scores)
    };
  }

  /**
   * 💡 CALCULATE IMPROVEMENT POTENTIAL
   */
  calculateImprovementPotential(currentScore, rawData) {
    let potential = 0;
    
    // Analyze component scores for improvement areas
    if (rawData.ratings.length < 10) {
      potential += 0.3; // More ratings needed
    }
    
    if (rawData.complaints.length > 2) {
      potential += 0.2; // Complaint resolution improvement
    }
    
    const completionRate = rawData.sessions.filter(s => s.status === 'COMPLETED').length / Math.max(rawData.sessions.length, 1);
    if (completionRate < 0.7) {
      potential += 0.2; // Session completion improvement
    }

    return Math.min(1, potential);
  }

  /**
   * 🎯 CALCULATE BONUS ELIGIBILITY SCORE
   */
  async calculateBonusEligibility(expertId) {
    const cacheKey = `bonus:eligibility:${expertId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [qualityScore, volumeScore, retentionScore] = await Promise.all([
      this.calculateQualityBonusComponent(expertId),
      this.calculateVolumeBonusComponent(expertId),
      this.calculateRetentionBonusComponent(expertId)
    ]);

    const weights = this.weights.BONUS_ELIGIBILITY;
    const eligibilityScore = 
      (qualityScore * weights.qualityThreshold) +
      (volumeScore * weights.volumeThreshold) +
      (retentionScore * weights.retentionThreshold);

    const result = {
      expertId,
      eligibilityScore,
      components: { qualityScore, volumeScore, retentionScore },
      isEligible: eligibilityScore >= 0.8,
      timestamp: new Date()
    };

    await this.redis.setex(cacheKey, 1800, JSON.stringify(result)); // Cache for 30 minutes
    return result;
  }

  /**
   * ⭐ CALCULATE QUALITY BONUS COMPONENT
   */
  async calculateQualityBonusComponent(expertId) {
    const qualityData = await this.calculateExpertQualityScore(expertId);
    const baseScore = qualityData.qualityScore;
    
    // Convert to 0-1 scale and apply bonuses for consistency
    let score = (baseScore - 1) / 4; // Convert 1-5 to 0-1
    
    // Bonus for high consistency
    if (qualityData.analytics.volatility < 0.2) {
      score += 0.1;
    }
    
    // Bonus for positive trend
    if (qualityData.analytics.trend === 'improving') {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * 📊 CALCULATE VOLUME BONUS COMPONENT
   */
  async calculateVolumeBonusComponent(expertId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const sessionCount = await this.prisma.trainingSession.count({
      where: {
        expertId,
        scheduledAt: { gte: thirtyDaysAgo },
        status: 'COMPLETED'
      }
    });

    // Normalize session count (0-1 scale)
    const maxExpectedSessions = 50; // Maximum expected sessions in 30 days
    return Math.min(1, sessionCount / maxExpectedSessions);
  }

  /**
   * 🔄 CALCULATE RETENTION BONUS COMPONENT
   */
  async calculateRetentionBonusComponent(expertId) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        expertId,
        createdAt: { gte: ninetyDaysAgo }
      },
      select: { status: true, studentId: true }
    });

    const uniqueStudents = new Set(enrollments.map(e => e.studentId)).size;
    const repeatStudents = enrollments.filter(e => 
      enrollments.filter(e2 => e2.studentId === e.studentId).length > 1
    ).length;

    const retentionRate = uniqueStudents > 0 ? repeatStudents / uniqueStudents : 0;
    return Math.min(1, retentionRate * 2); // Scale retention rate
  }

  /**
   * 🔧 NORMALIZATION FUNCTIONS
   */
  normalizeScore(score, min, max) {
    return (score - min) / (max - min);
  }

  normalizeResponseTime(hours) {
    // Convert response time to score (lower time = higher score)
    const maxResponseTime = 72; // 3 days
    return Math.max(0, 1 - (hours / maxResponseTime));
  }

  normalizeSessionVolume(count) {
    const maxExpected = 100; // Maximum expected sessions
    return Math.min(1, count / maxExpected);
  }

  /**
   * 📐 CALCULATE CONFIDENCE INTERVAL
   */
  calculateConfidenceInterval(rawData) {
    const ratingCount = rawData.ratings.length;
    const sessionCount = rawData.sessions.length;
    
    // Base confidence on data volume and consistency
    let confidence = 0.5; // Default confidence
    
    if (ratingCount >= 10) confidence += 0.3;
    if (sessionCount >= 5) confidence += 0.2;
    
    // Adjust for data consistency
    if (rawData.ratings.length > 0) {
      const consistency = this.calculateRatingConsistency(rawData.ratings);
      confidence += consistency * 0.2;
    }

    return Math.min(0.95, confidence);
  }

  /**
   * ⏰ CALCULATE CACHE TTL
   */
  calculateCacheTTL(confidence) {
    // Higher confidence = longer cache TTL
    const baseTTL = 300; // 5 minutes
    const confidenceBonus = Math.floor(confidence * 600); // Up to 10 minutes bonus
    return baseTTL + confidenceBonus;
  }

  /**
   * 📅 PARSE TIMEFRAME
   */
  parseTimeframe(timeframe) {
    const match = timeframe.match(/(\d+)([dwm])/);
    if (!match) return 90; // Default to 90 days
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'd': return value;
      case 'w': return value * 7;
      case 'm': return value * 30;
      default: return 90;
    }
  }

  /**
   * 📚 GET HISTORICAL SCORES
   */
  async getHistoricalScores(expertId) {
    const cacheKey = `quality:history:${expertId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const historical = await this.prisma.qualityHistory.findMany({
      where: { expertId },
      orderBy: { recordedAt: 'desc' },
      take: 12, // Last 12 records
      select: { qualityScore: true }
    });

    const scores = historical.map(h => h.qualityScore);
    
    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(scores));
    
    return scores;
  }

  /**
   * 🔥 WARM UP CALCULATION CACHE
   */
  async warmUpCalculationCache() {
    try {
      // Pre-calculate distribution data
      await this.calculateScoreDistribution();
      
      this.logger.info('Calculation cache warmed up successfully');
    } catch (error) {
      this.logger.error('Failed to warm up calculation cache', error);
    }
  }
  /**
   * 🏆 CALCULATE TIER SCORE FOR EXPERT PROMOTION
   */
  async calculateTierScore(expertId) {
    const cacheKey = `tier:score:${expertId}`;
    const startTime = performance.now();

    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const [
        qualityScore,
        retentionData,
        volumeData,
        complaintData,
        certificationData
      ] = await Promise.all([
        this.calculateExpertQualityScore(expertId),
        this.calculateAdvancedRetentionMetrics(expertId),
        this.calculateVolumeMetrics(expertId),
        this.calculateComplaintPerformance(expertId),
        this.calculateCertificationPerformance(expertId)
      ]);

      const componentScores = {
        qualityScore: qualityScore.qualityScore,
        studentRetention: retentionData.retentionScore,
        sessionVolume: volumeData.volumeScore,
        complaintResolution: complaintData.resolutionScore,
        certificationRate: certificationData.certificationScore
      };

      // Apply tier-specific weighting
      const tierScore = this.applyTierWeighting(componentScores);
      
      const result = {
        expertId,
        tierScore,
        componentScores,
        recommendedTier: this.determineRecommendedTier(tierScore, componentScores),
        timestamp: new Date(),
        calculationTime: performance.now() - startTime
      };

      // Cache for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(result));

      this.emit('tierScoreCalculated', result);
      return result;

    } catch (error) {
      this.logger.error('Tier score calculation failed', error, { expertId });
      throw error;
    }
  }

  /**
   * 🔄 CALCULATE ADVANCED RETENTION METRICS
   */
  async calculateAdvancedRetentionMetrics(expertId) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        expertId,
        createdAt: { gte: ninetyDaysAgo }
      },
      include: {
        student: {
          select: { id: true, createdAt: true }
        }
      }
    });

    if (enrollments.length === 0) {
      return { retentionScore: 0.7, repeatRate: 0, churnRate: 0.3 };
    }

    // Calculate repeat student rate
    const studentEnrollmentCount = {};
    enrollments.forEach(enrollment => {
      const studentId = enrollment.studentId;
      studentEnrollmentCount[studentId] = (studentEnrollmentCount[studentId] || 0) + 1;
    });

    const repeatStudents = Object.values(studentEnrollmentCount).filter(count => count > 1).length;
    const uniqueStudents = Object.keys(studentEnrollmentCount).length;
    const repeatRate = uniqueStudents > 0 ? repeatStudents / uniqueStudents : 0;

    // Calculate churn rate
    const completedEnrollments = enrollments.filter(e => e.status === 'COMPLETED').length;
    const cancelledEnrollments = enrollments.filter(e => e.status === 'CANCELLED').length;
    const churnRate = completedEnrollments > 0 ? cancelledEnrollments / completedEnrollments : 0.3;

    // Calculate retention score (0-1 scale)
    const retentionScore = Math.max(0, 1 - (churnRate * 0.7) + (repeatRate * 0.3));

    return {
      retentionScore: Math.min(1, retentionScore),
      repeatRate,
      churnRate,
      uniqueStudents,
      totalEnrollments: enrollments.length
    };
  }

  /**
   * 📊 CALCULATE VOLUME METRICS
   */
  async calculateVolumeMetrics(expertId) {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    
    const [sessions, enrollments] = await Promise.all([
      this.prisma.trainingSession.count({
        where: {
          expertId,
          scheduledAt: { gte: sixtyDaysAgo },
          status: 'COMPLETED'
        }
      }),
      this.prisma.enrollment.count({
        where: {
          expertId,
          createdAt: { gte: sixtyDaysAgo },
          status: { in: ['ACTIVE', 'COMPLETED'] }
        }
      })
    ]);

    // Calculate volume score based on industry benchmarks
    const sessionScore = Math.min(1, sessions / 40); // 40 sessions in 60 days = perfect score
    const enrollmentScore = Math.min(1, enrollments / 20); // 20 enrollments in 60 days = perfect score
    
    const volumeScore = (sessionScore * 0.6) + (enrollmentScore * 0.4);

    return {
      volumeScore,
      sessionCount: sessions,
      enrollmentCount: enrollments,
      sessionScore,
      enrollmentScore
    };
  }

  /**
   * 🚨 CALCULATE COMPLAINT PERFORMANCE
   */
  async calculateComplaintPerformance(expertId) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const complaints = await this.prisma.complaint.findMany({
      where: {
        expertId,
        createdAt: { gte: ninetyDaysAgo }
      },
      select: {
        severity: true,
        status: true,
        resolvedAt: true,
        createdAt: true
      }
    });

    if (complaints.length === 0) {
      return { resolutionScore: 1, responseTime: 0, severityIndex: 0 };
    }

    const resolvedComplaints = complaints.filter(c => c.status === 'RESOLVED');
    const resolutionRate = resolvedComplaints.length / complaints.length;

    // Calculate average response time for resolved complaints
    let averageResponseTime = 0;
    if (resolvedComplaints.length > 0) {
      const totalTime = resolvedComplaints.reduce((sum, complaint) => {
        const responseTime = new Date(complaint.resolvedAt) - new Date(complaint.createdAt);
        return sum + (responseTime / (60 * 60 * 1000)); // Convert to hours
      }, 0);
      averageResponseTime = totalTime / resolvedComplaints.length;
    }

    // Calculate severity index (weighted by complaint severity)
    const severityWeights = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const severityIndex = complaints.reduce((sum, complaint) => {
      return sum + (severityWeights[complaint.severity] || 1);
    }, 0) / complaints.length;

    // Calculate resolution score (0-1 scale)
    const responseTimeScore = Math.max(0, 1 - (averageResponseTime / 168)); // 1 week max
    const resolutionScore = (resolutionRate * 0.6) + (responseTimeScore * 0.4) - (severityIndex * 0.1);

    return {
      resolutionScore: Math.max(0, Math.min(1, resolutionScore)),
      resolutionRate,
      averageResponseTime,
      severityIndex,
      totalComplaints: complaints.length
    };
  }

  /**
   * 🏅 CALCULATE CERTIFICATION PERFORMANCE
   */
  async calculateCertificationPerformance(expertId) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const [certifications, enrollments] = await Promise.all([
      this.prisma.certification.findMany({
        where: {
          expertId,
          issuedAt: { gte: ninetyDaysAgo }
        },
        select: { score: true, studentId: true }
      }),
      this.prisma.enrollment.count({
        where: {
          expertId,
          createdAt: { gte: ninetyDaysAgo },
          status: 'COMPLETED'
        }
      })
    ]);

    if (certifications.length === 0) {
      return { certificationScore: 0.5, averageScore: 0, certificationRate: 0 };
    }

    const averageScore = certifications.reduce((sum, cert) => sum + cert.score, 0) / certifications.length;
    const certificationRate = enrollments > 0 ? certifications.length / enrollments : 0;

    // Calculate certification score (0-1 scale)
    const scoreComponent = (averageScore - 60) / 40; // Normalize 60-100 to 0-1
    const rateComponent = Math.min(1, certificationRate * 2); // 50% certification rate = perfect score
    
    const certificationScore = (scoreComponent * 0.7) + (rateComponent * 0.3);

    return {
      certificationScore: Math.max(0, Math.min(1, certificationScore)),
      averageScore,
      certificationRate,
      totalCertifications: certifications.length,
      completedEnrollments: enrollments
    };
  }

  /**
   * ⚖️ APPLY TIER WEIGHTING
   */
  applyTierWeighting(componentScores) {
    const weights = this.weights.TIER_SCORE;
    
    return (
      (componentScores.qualityScore * weights.qualityScore) +
      (componentScores.studentRetention * weights.studentRetention) +
      (componentScores.sessionVolume * weights.sessionVolume) +
      (componentScores.complaintResolution * weights.complaintResolution) +
      (componentScores.certificationRate * weights.certificationRate)
    );
  }

  /**
   * 🎯 DETERMINE RECOMMENDED TIER
   */
  determineRecommendedTier(tierScore, componentScores) {
    const { qualityScore, studentRetention, complaintResolution } = componentScores;

    if (tierScore >= 0.9 && qualityScore >= 4.7 && studentRetention >= 0.8 && complaintResolution >= 0.9) {
      return 'MASTER';
    } else if (tierScore >= 0.8 && qualityScore >= 4.3 && studentRetention >= 0.7 && complaintResolution >= 0.8) {
      return 'SENIOR';
    } else if (tierScore >= 0.7 && qualityScore >= 4.0 && studentRetention >= 0.6 && complaintResolution >= 0.7) {
      return 'STANDARD';
    } else if (tierScore >= 0.6 && qualityScore >= 3.5) {
      return 'DEVELOPING';
    } else {
      return 'PROBATION';
    }
  }

  /**
   * 📈 CALCULATE PLATFORM-WIDE QUALITY METRICS
   */
  async calculatePlatformQualityMetrics() {
    const cacheKey = 'platform:quality:metrics';
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [
      expertCount,
      averageQuality,
      tierDistribution,
      completionRates,
      complaintStats
    ] = await Promise.all([
      this.prisma.expert.count({ where: { status: 'ACTIVE' } }),
      this.prisma.expert.aggregate({
        where: { status: 'ACTIVE' },
        _avg: { qualityScore: true }
      }),
      this.prisma.expert.groupBy({
        by: ['currentTier'],
        where: { status: 'ACTIVE' },
        _count: { id: true }
      }),
      this.calculatePlatformCompletionRates(),
      this.calculatePlatformComplaintStats()
    ]);

    const metrics = {
      timestamp: new Date(),
      expertCount,
      averageQualityScore: averageQuality._avg.qualityScore || 4.0,
      tierDistribution: tierDistribution.reduce((acc, tier) => {
        acc[tier.currentTier] = tier._count.id;
        return acc;
      }, {}),
      completionRates,
      complaintStats,
      platformHealth: this.calculatePlatformHealthScore(
        averageQuality._avg.qualityScore || 4.0,
        completionRates.overallCompletionRate,
        complaintStats.resolutionRate
      )
    };

    // Cache for 15 minutes
    await this.redis.setex(cacheKey, 900, JSON.stringify(metrics));

    return metrics;
  }

  /**
   * ✅ CALCULATE PLATFORM COMPLETION RATES
   */
  async calculatePlatformCompletionRates() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const enrollments = await this.prisma.enrollment.groupBy({
      by: ['status'],
      where: { createdAt: { gte: ninetyDaysAgo } },
      _count: { id: true }
    });

    const totalEnrollments = enrollments.reduce((sum, item) => sum + item._count.id, 0);
    const completedEnrollments = enrollments.find(item => item.status === 'COMPLETED')?._count.id || 0;
    const activeEnrollments = enrollments.find(item => item.status === 'ACTIVE')?._count.id || 0;

    const overallCompletionRate = totalEnrollments > 0 ? completedEnrollments / totalEnrollments : 0;
    const activeCompletionRate = (completedEnrollments + activeEnrollments) > 0 ? 
      completedEnrollments / (completedEnrollments + activeEnrollments) : 0;

    return {
      overallCompletionRate,
      activeCompletionRate,
      totalEnrollments,
      completedEnrollments,
      activeEnrollments
    };
  }

  /**
   * 🚨 CALCULATE PLATFORM COMPLAINT STATS
   */
  async calculatePlatformComplaintStats() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    const complaints = await this.prisma.complaint.groupBy({
      by: ['status', 'severity'],
      where: { createdAt: { gte: ninetyDaysAgo } },
      _count: { id: true }
    });

    const totalComplaints = complaints.reduce((sum, item) => sum + item._count.id, 0);
    const resolvedComplaints = complaints
      .filter(item => item.status === 'RESOLVED')
      .reduce((sum, item) => sum + item._count.id, 0);

    const resolutionRate = totalComplaints > 0 ? resolvedComplaints / totalComplaints : 1;

    // Calculate severity distribution
    const severityDistribution = complaints.reduce((acc, item) => {
      acc[item.severity] = (acc[item.severity] || 0) + item._count.id;
      return acc;
    }, {});

    return {
      totalComplaints,
      resolvedComplaints,
      resolutionRate,
      severityDistribution
    };
  }

  /**
   * 🏥 CALCULATE PLATFORM HEALTH SCORE
   */
  calculatePlatformHealthScore(averageQuality, completionRate, resolutionRate) {
    const qualityComponent = (averageQuality - 1) / 4; // Convert 1-5 to 0-1
    const completionComponent = completionRate;
    const resolutionComponent = resolutionRate;

    const healthScore = (
      (qualityComponent * 0.5) +
      (completionComponent * 0.3) +
      (resolutionComponent * 0.2)
    ) * 100;

    return Math.round(healthScore);
  }

  /**
   * 🔍 BATCH CALCULATE EXPERT METRICS
   */
  async batchCalculateExpertMetrics(expertIds, options = {}) {
    const {
      includeQuality = true,
      includeTier = false,
      includeBonus = false,
      timeframe = '90d'
    } = options;

    const results = [];
    const errors = [];

    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    for (let i = 0; i < expertIds.length; i += batchSize) {
      const batch = expertIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (expertId) => {
        try {
          const metrics = { expertId };
          
          if (includeQuality) {
            metrics.quality = await this.calculateExpertQualityScore(expertId, timeframe);
          }
          
          if (includeTier) {
            metrics.tier = await this.calculateTierScore(expertId);
          }
          
          if (includeBonus) {
            metrics.bonus = await this.calculateBonusEligibility(expertId);
          }

          return metrics;
        } catch (error) {
          errors.push({ expertId, error: error.message });
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null));

      // Small delay between batches to prevent resource exhaustion
      if (i + batchSize < expertIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      results,
      errors,
      totalProcessed: results.length,
      totalErrors: errors.length,
      timestamp: new Date()
    };
  }

  /**
   * 📊 GENERATE METRICS REPORT
   */
  async generateMetricsReport(timeframe = '90d', reportType = 'COMPREHENSIVE') {
    const cacheKey = `metrics:report:${timeframe}:${reportType}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const startTime = performance.now();
    
    const [
      platformMetrics,
      topPerformers,
      improvementAreas,
      trendAnalysis
    ] = await Promise.all([
      this.calculatePlatformQualityMetrics(),
      this.identifyTopPerformers(10),
      this.identifyImprovementAreas(),
      this.analyzeQualityTrends(timeframe)
    ]);

    const report = {
      timeframe,
      reportType,
      generatedAt: new Date(),
      platformMetrics,
      topPerformers,
      improvementAreas,
      trendAnalysis,
      recommendations: this.generateReportRecommendations(platformMetrics, improvementAreas),
      generationTime: performance.now() - startTime
    };

    // Cache report for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(report));

    this.emit('metricsReportGenerated', report);
    return report;
  }

  /**
   * 🏆 IDENTIFY TOP PERFORMERS
   */
  async identifyTopPerformers(limit = 10) {
    const experts = await this.prisma.expert.findMany({
      where: { 
        status: 'ACTIVE',
        qualityScore: { gte: 4.5 }
      },
      orderBy: { qualityScore: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        qualityScore: true,
        currentTier: true,
        completionRate: true
      }
    });

    return experts.map(expert => ({
      ...expert,
      performanceLevel: this.determinePerformanceLevel(expert.qualityScore)
    }));
  }

  /**
   * 📈 IDENTIFY IMPROVEMENT AREAS
   */
  async identifyImprovementAreas() {
    const experts = await this.prisma.expert.findMany({
      where: { 
        status: 'ACTIVE',
        OR: [
          { qualityScore: { lt: 3.5 } },
          { completionRate: { lt: 0.6 } }
        ]
      },
      select: {
        id: true,
        name: true,
        qualityScore: true,
        completionRate: true,
        currentTier: true
      }
    });

    return experts.map(expert => ({
      ...expert,
      improvementPriority: this.calculateImprovementPriority(expert),
      suggestedActions: this.suggestImprovementActions(expert)
    }));
  }

  /**
   * 📈 ANALYZE QUALITY TRENDS
   */
  async analyzeQualityTrends(timeframe) {
    const days = this.parseTimeframe(timeframe);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const historicalData = await this.prisma.qualityHistory.groupBy({
      by: ['recordedAt'],
      where: { recordedAt: { gte: startDate } },
      _avg: { qualityScore: true },
      _count: { id: true }
    });

    // Calculate trend metrics
    const scores = historicalData.map(item => item._avg.qualityScore).filter(score => score !== null);
    const trend = this.calculateTrendFromScores(scores);

    return {
      timeframe,
      dataPoints: historicalData.length,
      averageScore: this.statsEngine.calculateMean(scores),
      trend,
      volatility: this.calculateScoreVolatility(scores),
      prediction: this.predictTrend(scores)
    };
  }

  /**
   * 🎯 DETERMINE PERFORMANCE LEVEL
   */
  determinePerformanceLevel(qualityScore) {
    if (qualityScore >= 4.7) return 'EXCEPTIONAL';
    if (qualityScore >= 4.3) return 'EXCELLENT';
    if (qualityScore >= 4.0) return 'GOOD';
    if (qualityScore >= 3.5) return 'SATISFACTORY';
    return 'NEEDS_IMPROVEMENT';
  }

  /**
   * 🎯 CALCULATE IMPROVEMENT PRIORITY
   */
  calculateImprovementPriority(expert) {
    let priority = 0;
    
    if (expert.qualityScore < 3.0) priority += 3;
    else if (expert.qualityScore < 3.5) priority += 2;
    else priority += 1;
    
    if (expert.completionRate < 0.5) priority += 2;
    else if (expert.completionRate < 0.7) priority += 1;

    return priority;
  }

  /**
   * 💡 SUGGEST IMPROVEMENT ACTIONS
   */
  suggestImprovementActions(expert) {
    const actions = [];

    if (expert.qualityScore < 3.5) {
      actions.push('Quality improvement training');
      actions.push('Mentorship program enrollment');
    }

    if (expert.completionRate < 0.7) {
      actions.push('Session management training');
      actions.push('Student engagement workshop');
    }

    if (expert.qualityScore < 3.0 || expert.completionRate < 0.5) {
      actions.push('Performance improvement plan');
      actions.push('Regular quality check-ins');
    }

    return actions;
  }

  /**
   * 📈 CALCULATE TREND FROM SCORES
   */
  calculateTrendFromScores(scores) {
    if (scores.length < 3) return 'INSUFFICIENT_DATA';

    const recent = scores.slice(-3);
    const older = scores.slice(0, -3);

    if (older.length === 0) return 'STABLE';

    const recentAvg = this.statsEngine.calculateMean(recent);
    const olderAvg = this.statsEngine.calculateMean(older);

    const difference = recentAvg - olderAvg;
    
    if (difference > 0.2) return 'IMPROVING';
    if (difference < -0.2) return 'DECLINING';
    return 'STABLE';
  }

  /**
   * 🔮 PREDICT TREND
   */
  predictTrend(scores) {
    if (scores.length < 4) return { direction: 'UNKNOWN', confidence: 0 };

    const trend = this.calculateTrendFromScores(scores);
    const volatility = this.calculateScoreVolatility(scores);
    const confidence = Math.max(0.1, 1 - volatility);

    return { direction: trend, confidence };
  }

  /**
   * 💡 GENERATE REPORT RECOMMENDATIONS
   */
  generateReportRecommendations(platformMetrics, improvementAreas) {
    const recommendations = [];

    if (platformMetrics.averageQualityScore < 4.0) {
      recommendations.push({
        type: 'PLATFORM_QUALITY',
        priority: 'HIGH',
        action: 'Implement platform-wide quality improvement program',
        description: `Average quality score (${platformMetrics.averageQualityScore}) below target threshold`
      });
    }

    if (improvementAreas.length > platformMetrics.expertCount * 0.1) {
      recommendations.push({
        type: 'TARGETED_TRAINING',
        priority: 'MEDIUM',
        action: 'Develop targeted training for underperforming experts',
        description: `${improvementAreas.length} experts need quality improvement`
      });
    }

    if (platformMetrics.complaintStats.resolutionRate < 0.8) {
      recommendations.push({
        type: 'COMPLAINT_RESOLUTION',
        priority: 'HIGH',
        action: 'Improve complaint resolution processes',
        description: `Complaint resolution rate (${platformMetrics.complaintStats.resolutionRate}) needs improvement`
      });
    }

    return recommendations;
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      this.removeAllListeners();
      this.cache.clear();
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.logger.info('Metrics calculator resources cleaned up');
    } catch (error) {
      this.logger.error('Error during metrics calculator cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new MetricsCalculator();