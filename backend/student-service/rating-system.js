// student-service/rating-system.js

/**
 * 🎯 ENTERPRISE RATING SYSTEM
 * Production-ready rating system for Mosa Forge
 * Features: Quality metrics, fraud detection, tier calculations, real-time updates
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../utils/logger');
const { QualityCalculator } = require('../utils/quality-calculations');
const { RateLimiterRedis } = require('rate-limiter-flexible');

class RatingSystem extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('RatingSystem');
    this.qualityCalculator = new QualityCalculator();
    
    // Rate limiting: max 10 ratings per hour per student
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (req) => `rating_limit:${req.studentId}`,
      points: 10,
      duration: 3600, // 1 hour
    });
    
    this.initialize();
  }

  /**
   * Initialize rating system
   */
  async initialize() {
    try {
      await this.redis.ping();
      this.logger.info('Rating system initialized successfully');
      
      // Warm up cache with active experts
      await this.warmUpExpertCache();
      
    } catch (error) {
      this.logger.error('Failed to initialize rating system', error);
      throw error;
    }
  }

  /**
   * 🎯 SUBMIT RATING - Core rating submission with validation
   */
  async submitRating(ratingData) {
    const startTime = performance.now();
    
    try {
      // 🛡️ VALIDATION PHASE
      await this.validateRatingSubmission(ratingData);

      // 🔍 FRAUD DETECTION
      const fraudScore = await this.calculateFraudScore(ratingData);
      if (fraudScore > 0.8) {
        throw new Error('RATING_REJECTED_FRAUD_DETECTED');
      }

      // 💾 TRANSACTION PROCESSING
      const result = await this.processRatingTransaction(ratingData, fraudScore);

      // 📊 REAL-TIME UPDATES
      await this.updateRealTimeMetrics(result);

      // 🔔 EMIT EVENTS
      this.emit('ratingSubmitted', result);

      const processingTime = performance.now() - startTime;
      this.logger.metric('rating_processing_time', processingTime, {
        expertId: ratingData.expertId,
        studentId: ratingData.studentId
      });

      return {
        success: true,
        ratingId: result.id,
        expertTier: result.newExpertTier,
        qualityScore: result.newQualityScore,
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Rating submission failed', error, { ratingData });
      throw error;
    }
  }

  /**
   * 🛡️ COMPREHENSIVE RATING VALIDATION
   */
  async validateRatingSubmission(ratingData) {
    const {
      studentId,
      expertId,
      sessionId,
      rating,
      comment,
      categories
    } = ratingData;

    // Required fields validation
    if (!studentId || !expertId || !sessionId || !rating) {
      throw new Error('MISSING_REQUIRED_FIELDS');
    }

    // Rating range validation (1-5 stars)
    if (rating < 1 || rating > 5) {
      throw new Error('INVALID_RATING_RANGE');
    }

    // Rate limiting check
    try {
      await this.rateLimiter.consume(`student:${studentId}`);
    } catch (rateLimitError) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    // Session completion validation
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: { enrollment: true }
    });

    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }

    if (session.enrollment.studentId !== studentId) {
      throw new Error('UNAUTHORIZED_RATING_ATTEMPT');
    }

    if (session.status !== 'COMPLETED') {
      throw new Error('SESSION_NOT_COMPLETED');
    }

    // Duplicate rating prevention
    const existingRating = await this.prisma.rating.findFirst({
      where: {
        studentId,
        sessionId,
        expertId
      }
    });

    if (existingRating) {
      throw new Error('DUPLICATE_RATING_NOT_ALLOWED');
    }

    // Comment length validation
    if (comment && comment.length > 1000) {
      throw new Error('COMMENT_TOO_LONG');
    }

    this.logger.debug('Rating validation passed', { studentId, expertId, sessionId });
  }

  /**
   * 🔍 ADVANCED FRAUD DETECTION
   */
  async calculateFraudScore(ratingData) {
    const { studentId, expertId, rating } = ratingData;
    let fraudScore = 0;

    // Check for rating pattern anomalies
    const studentRatings = await this.prisma.rating.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Pattern 1: All ratings are 5 stars (potential fraud)
    if (studentRatings.length >= 3) {
      const allFiveStars = studentRatings.every(r => r.rating === 5);
      if (allFiveStars) fraudScore += 0.3;
    }

    // Pattern 2: Multiple ratings in short time
    if (studentRatings.length >= 2) {
      const timeDiff = Math.abs(
        new Date(studentRatings[0].createdAt) - new Date(studentRatings[1].createdAt)
      );
      if (timeDiff < 300000) { // 5 minutes
        fraudScore += 0.2;
      }
    }

    // Pattern 3: Same student-expert multiple ratings
    const expertRatingsFromStudent = studentRatings.filter(r => r.expertId === expertId);
    if (expertRatingsFromStudent.length > 0) {
      fraudScore += 0.2;
    }

    // Pattern 4: Rating velocity (sudden changes)
    const expertRecentRatings = await this.getExpertRecentRatings(expertId, 20);
    if (expertRecentRatings.length >= 5) {
      const avgRating = this.calculateAverageRating(expertRecentRatings);
      if (Math.abs(rating - avgRating) > 2) {
        fraudScore += 0.3;
      }
    }

    this.logger.debug('Fraud score calculated', { studentId, expertId, fraudScore });
    return Math.min(fraudScore, 1.0);
  }

  /**
   * 💾 TRANSACTIONAL RATING PROCESSING
   */
  async processRatingTransaction(ratingData, fraudScore) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create rating record
      const ratingRecord = await tx.rating.create({
        data: {
          studentId: ratingData.studentId,
          expertId: ratingData.expertId,
          sessionId: ratingData.sessionId,
          rating: ratingData.rating,
          comment: ratingData.comment,
          categories: ratingData.categories || {},
          fraudScore,
          status: fraudScore > 0.8 ? 'FLAGGED' : 'ACTIVE',
          metadata: {
            ipAddress: ratingData.ipAddress,
            userAgent: ratingData.userAgent,
            submissionTime: new Date().toISOString()
          }
        },
        include: {
          student: {
            select: { name: true, faydaId: true }
          },
          expert: {
            select: { name: true, currentTier: true }
          }
        }
      });

      // 2. Update expert quality metrics
      const expertUpdate = await this.updateExpertQualityMetrics(ratingData.expertId, tx);

      // 3. Update session rating status
      await tx.trainingSession.update({
        where: { id: ratingData.sessionId },
        data: { isRated: true, ratingId: ratingRecord.id }
      });

      // 4. Cache update for real-time dashboard
      await this.updateExpertCache(ratingData.expertId, expertUpdate.newQualityScore);

      return {
        ...ratingRecord,
        newExpertTier: expertUpdate.newTier,
        newQualityScore: expertUpdate.newQualityScore
      };
    }, {
      maxWait: 5000,
      timeout: 10000
    });
  }

  /**
   * 📊 UPDATE EXPERT QUALITY METRICS
   */
  async updateExpertQualityMetrics(expertId, transaction) {
    const expertRatings = await transaction.rating.findMany({
      where: {
        expertId,
        status: 'ACTIVE',
        createdAt: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
        }
      },
      select: { rating: true, categories: true, createdAt: true }
    });

    if (expertRatings.length === 0) {
      return { newTier: 'STANDARD', newQualityScore: 4.0 };
    }

    // Calculate comprehensive quality score
    const qualityScore = this.qualityCalculator.calculateExpertScore(expertRatings);
    
    // Determine new tier based on quality score
    const newTier = this.calculateExpertTier(qualityScore, expertRatings.length);

    // Update expert record
    await transaction.expert.update({
      where: { id: expertId },
      data: {
        qualityScore,
        currentTier: newTier,
        totalRatings: { increment: 1 },
        lastRatingAt: new Date(),
        ratingHistory: {
          push: {
            score: qualityScore,
            timestamp: new Date(),
            ratingCount: expertRatings.length
          }
        }
      }
    });

    return { newTier, newQualityScore: qualityScore };
  }

  /**
   * 🎯 CALCULATE EXPERT TIER
   */
  calculateExpertTier(qualityScore, ratingCount) {
    if (ratingCount < 5) return 'STANDARD'; // Minimum ratings for tier evaluation

    if (qualityScore >= 4.7) return 'MASTER';
    if (qualityScore >= 4.3) return 'SENIOR';
    if (qualityScore >= 4.0) return 'STANDARD';
    if (qualityScore >= 3.5) return 'DEVELOPING';
    return 'PROBATION';
  }

  /**
   * 📈 UPDATE REAL-TIME METRICS
   */
  async updateRealTimeMetrics(ratingResult) {
    const { expertId, newQualityScore, newExpertTier } = ratingResult;

    const metricsKey = `expert:metrics:${expertId}`;
    const pipeline = this.redis.pipeline();

    pipeline.hset(metricsKey, {
      qualityScore: newQualityScore,
      tier: newExpertTier,
      lastUpdated: Date.now()
    });

    pipeline.expire(metricsKey, 3600); // 1 hour TTL

    // Update sorted set for expert leaderboard
    pipeline.zadd('expert_leaderboard', newQualityScore, expertId);

    await pipeline.exec();

    this.logger.debug('Real-time metrics updated', { expertId, newQualityScore, newExpertTier });
  }

  /**
   * 🔍 GET EXPERT RECENT RATINGS
   */
  async getExpertRecentRatings(expertId, limit = 20) {
    const cacheKey = `expert:ratings:${expertId}:recent`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Database fallback
    const ratings = await this.prisma.rating.findMany({
      where: {
        expertId,
        status: 'ACTIVE'
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        rating: true,
        comment: true,
        createdAt: true,
        student: {
          select: { name: true }
        }
      }
    });

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(ratings));

    return ratings;
  }

  /**
   * 📊 CALCULATE AVERAGE RATING
   */
  calculateAverageRating(ratings) {
    if (!ratings.length) return 0;
    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    return sum / ratings.length;
  }

  /**
   * 🔥 WARM UP EXPERT CACHE
   */
  async warmUpExpertCache() {
    try {
      const activeExperts = await this.prisma.expert.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, qualityScore: true, currentTier: true }
      });

      const pipeline = this.redis.pipeline();
      activeExperts.forEach(expert => {
        const key = `expert:metrics:${expert.id}`;
        pipeline.hset(key, {
          qualityScore: expert.qualityScore,
          tier: expert.currentTier,
          lastUpdated: Date.now()
        });
        pipeline.expire(key, 3600);
      });

      await pipeline.exec();
      this.logger.info(`Expert cache warmed up with ${activeExperts.length} experts`);
    } catch (error) {
      this.logger.error('Failed to warm up expert cache', error);
    }
  }

  /**
   * 🗄️ UPDATE EXPERT CACHE
   */
  async updateExpertCache(expertId, qualityScore, tier) {
    const key = `expert:metrics:${expertId}`;
    await this.redis.hset(key, {
      qualityScore,
      tier,
      lastUpdated: Date.now()
    });
    await this.redis.expire(key, 3600);
  }

  /**
   * 📈 GET EXPERT RATING ANALYTICS
   */
  async getExpertRatingAnalytics(expertId, period = '90d') {
    const cacheKey = `analytics:expert:${expertId}:${period}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const ratings = await this.prisma.rating.findMany({
      where: {
        expertId,
        status: 'ACTIVE',
        createdAt: { gte: startDate }
      },
      select: {
        rating: true,
        createdAt: true,
        categories: true
      }
    });

    const analytics = {
      totalRatings: ratings.length,
      averageRating: this.calculateAverageRating(ratings),
      ratingDistribution: this.calculateRatingDistribution(ratings),
      trend: this.calculateRatingTrend(ratings),
      categoryBreakdown: this.calculateCategoryBreakdown(ratings)
    };

    // Cache for 15 minutes
    await this.redis.setex(cacheKey, 900, JSON.stringify(analytics));

    return analytics;
  }

  /**
   * 📊 CALCULATE RATING DISTRIBUTION
   */
  calculateRatingDistribution(ratings) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(rating => {
      distribution[rating.rating]++;
    });
    return distribution;
  }

  /**
   * 📈 CALCULATE RATING TREND
   */
  calculateRatingTrend(ratings) {
    if (ratings.length < 2) return 'stable';

    const recentHalf = ratings.slice(0, Math.floor(ratings.length / 2));
    const olderHalf = ratings.slice(Math.floor(ratings.length / 2));

    const recentAvg = this.calculateAverageRating(recentHalf);
    const olderAvg = this.calculateAverageRating(olderHalf);

    if (recentAvg > olderAvg + 0.1) return 'improving';
    if (recentAvg < olderAvg - 0.1) return 'declining';
    return 'stable';
  }

  /**
   * 🏷️ CALCULATE CATEGORY BREAKDOWN
   */
  calculateCategoryBreakdown(ratings) {
    const categories = {};
    
    ratings.forEach(rating => {
      if (rating.categories) {
        Object.entries(rating.categories).forEach(([category, score]) => {
          if (!categories[category]) {
            categories[category] = { total: 0, count: 0 };
          }
          categories[category].total += score;
          categories[category].count++;
        });
      }
    });

    // Calculate averages
    const result = {};
    Object.entries(categories).forEach(([category, data]) => {
      result[category] = data.total / data.count;
    });

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
      this.logger.info('Rating system resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new RatingSystem();