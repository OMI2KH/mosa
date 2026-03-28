/**
 * 🎯 MOSA FORGE: Enterprise Expert Matching Service
 * 
 * @module ExpertFinder
 * @description Advanced expert discovery and matching algorithm with quality guarantees
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - AI-powered expert matching algorithm
 * - Real-time quality score calculations
 * - Dynamic tier-based capacity management
 * - Multi-factor ranking system
 * - Geographic optimization
 * - Load balancing across experts
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const NodeGeocoder = require('node-geocoder');

// 🏗️ Enterprise Constants
const EXPERT_TIERS = {
  MASTER: { weight: 1.0, minQuality: 4.7, capacity: null },
  SENIOR: { weight: 0.8, minQuality: 4.3, capacity: 100 },
  STANDARD: { weight: 0.6, minQuality: 4.0, capacity: 50 },
  DEVELOPING: { weight: 0.4, minQuality: 3.5, capacity: 25 },
  PROBATION: { weight: 0.2, minQuality: 0, capacity: 10 }
};

const MATCHING_ALGORITHMS = {
  QUALITY_FIRST: 'quality_first',
  LOAD_BALANCED: 'load_balanced',
  GEO_OPTIMIZED: 'geo_optimized',
  TIER_PRIORITY: 'tier_priority'
};

const MATCHING_ERRORS = {
  NO_EXPERTS_AVAILABLE: 'NO_EXPERTS_AVAILABLE',
  QUALITY_THRESHOLD_NOT_MET: 'QUALITY_THRESHOLD_NOT_MET',
  CAPACITY_EXCEEDED: 'CAPACITY_EXCEEDED',
  GEOGRAPHIC_LIMITATION: 'GEOGRAPHIC_LIMITATION',
  SKILL_UNAVAILABLE: 'SKILL_UNAVAILABLE'
};

/**
 * 🏗️ Enterprise Expert Finder Class
 * @class ExpertFinder
 * @extends EventEmitter
 */
class ExpertFinder extends EventEmitter {
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
      geocoder: options.geocoder || NodeGeocoder({
        provider: 'openstreetmap',
        timeout: 5000
      }),
      maxCandidates: options.maxCandidates || 20,
      cacheTTL: options.cacheTTL || 300, // 5 minutes
      defaultAlgorithm: options.defaultAlgorithm || MATCHING_ALGORITHMS.QUALITY_FIRST,
      qualityThreshold: options.qualityThreshold || 4.0,
      enableGeoOptimization: options.enableGeoOptimization !== false
    };

    // 🏗️ Service Dependencies
    this.redis = new Redis(this.config.redis);
    this.prisma = this.config.prisma;
    this.geocoder = this.config.geocoder;
    this.circuitBreaker = this._initializeCircuitBreaker();
    
    // 🏗️ Performance Monitoring
    this.metrics = {
      matchesRequested: 0,
      matchesSuccessful: 0,
      matchesFailed: 0,
      averageMatchingTime: 0,
      cacheHitRate: 0,
      cacheMissRate: 0
    };

    // 🏗️ Algorithm Weights (Configurable)
    this.algorithmWeights = {
      quality: 0.35,
      capacity: 0.25,
      responseTime: 0.15,
      geography: 0.15,
      rating: 0.10
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
    this.on('expert.search.started', (data) => {
      this._logEvent('EXPERT_SEARCH_STARTED', data);
      this.metrics.matchesRequested++;
    });

    this.on('expert.search.completed', (data) => {
      this._logEvent('EXPERT_SEARCH_COMPLETED', data);
      this.metrics.matchesSuccessful++;
    });

    this.on('expert.search.failed', (data) => {
      this._logEvent('EXPERT_SEARCH_FAILED', data);
      this.metrics.matchesFailed++;
    });

    this.on('expert.cache.hit', (data) => {
      this.metrics.cacheHitRate++;
    });

    this.on('expert.cache.miss', (data) => {
      this.metrics.cacheMissRate++;
    });

    this.on('expert.quality.checked', (data) => {
      this._logEvent('EXPERT_QUALITY_CHECKED', data);
    });
  }

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Find Qualified Expert
   * @param {Object} searchCriteria - Expert search criteria
   * @returns {Promise<Object>} Expert matching result
   */
  async findQualifiedExpert(searchCriteria) {
    const startTime = performance.now();
    const searchId = uuidv4();
    const traceId = searchCriteria.traceId || uuidv4();

    try {
      this.emit('expert.search.started', { searchId, traceId, searchCriteria });

      // 🏗️ Validate search criteria
      await this._validateSearchCriteria(searchCriteria);

      // 🏗️ Check cache first for performance
      const cachedResult = await this._getCachedExpertMatch(searchCriteria);
      if (cachedResult) {
        this.emit('expert.cache.hit', { searchId, traceId });
        return cachedResult;
      }

      this.emit('expert.cache.miss', { searchId, traceId });

      // 🏗️ Find potential expert candidates
      const candidates = await this._findExpertCandidates(searchCriteria);
      
      if (candidates.length === 0) {
        throw new Error('No qualified experts available for the specified criteria');
      }

      // 🏗️ Apply matching algorithm
      const rankedExperts = await this._rankExperts(candidates, searchCriteria);
      
      // 🏗️ Select best match
      const selectedExpert = await this._selectBestExpert(rankedExperts, searchCriteria);
      
      // 🏗️ Validate final selection
      await this._validateExpertSelection(selectedExpert, searchCriteria);

      const processingTime = performance.now() - startTime;
      this._updateMetrics(processingTime);

      const result = {
        success: true,
        expert: this._formatExpertResponse(selectedExpert),
        matchScore: selectedExpert.matchScore,
        ranking: selectedExpert.ranking,
        algorithm: searchCriteria.algorithm || this.config.defaultAlgorithm,
        alternatives: rankedExperts.slice(1, 4).map(expert => ({
          id: expert.id,
          name: expert.name,
          matchScore: expert.matchScore,
          tier: expert.tier
        })),
        searchId,
        traceId,
        processingTime: `${processingTime.toFixed(2)}ms`
      };

      // 🏗️ Cache successful match
      await this._cacheExpertMatch(searchCriteria, result);

      this.emit('expert.search.completed', result);
      this._logSuccess('EXPERT_FOUND', { searchId, expertId: selectedExpert.id, matchScore: selectedExpert.matchScore });

      return result;

    } catch (error) {
      const processingTime = performance.now() - startTime;
      this._updateMetrics(processingTime);
      
      const errorResult = {
        success: false,
        error: error.message,
        errorCode: error.code || MATCHING_ERRORS.NO_EXPERTS_AVAILABLE,
        searchId,
        traceId,
        timestamp: new Date().toISOString(),
        criteria: searchCriteria
      };

      this.emit('expert.search.failed', errorResult);
      this._logError('EXPERT_SEARCH_FAILED', error, { searchId, traceId, criteria: searchCriteria });

      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🏗️ Validate Search Criteria
   * @private
   */
  async _validateSearchCriteria(criteria) {
    const requiredFields = ['skillId', 'studentLevel'];
    const missingFields = requiredFields.filter(field => !criteria[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate skill exists and is active
    const skill = await this.prisma.skill.findUnique({
      where: { id: criteria.skillId },
      select: { id: true, name: true, isActive: true, category: true }
    });

    if (!skill) {
      throw new Error('Specified skill not found');
    }

    if (!skill.isActive) {
      throw new Error('Skill is not currently available for training');
    }

    // Validate student level
    const validLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    if (!validLevels.includes(criteria.studentLevel)) {
      throw new Error('Invalid student level specified');
    }

    return true;
  }

  /**
   * 🏗️ Get Cached Expert Match
   * @private
   */
  async _getCachedExpertMatch(criteria) {
    try {
      const cacheKey = this._generateCacheKey(criteria);
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      // Cache failure shouldn't break the main flow
      this._logError('CACHE_READ_FAILED', error, { criteria });
    }
    return null;
  }

  /**
   * 🏗️ Cache Expert Match
   * @private
   */
  async _cacheExpertMatch(criteria, result) {
    try {
      const cacheKey = this._generateCacheKey(criteria);
      await this.redis.setex(
        cacheKey,
        this.config.cacheTTL,
        JSON.stringify(result)
      );
    } catch (error) {
      // Cache failure shouldn't break the main flow
      this._logError('CACHE_WRITE_FAILED', error, { criteria });
    }
  }

  /**
   * 🏗️ Generate Cache Key
   * @private
   */
  _generateCacheKey(criteria) {
    const keyComponents = {
      skillId: criteria.skillId,
      studentLevel: criteria.studentLevel,
      location: criteria.studentLocation || 'any',
      algorithm: criteria.algorithm || this.config.defaultAlgorithm,
      tierPreference: criteria.tierPreference || 'any'
    };

    return `expert_match:${Buffer.from(JSON.stringify(keyComponents)).toString('base64')}`;
  }

  /**
   * 🏗️ Find Expert Candidates
   * @private
   */
  async _findExpertCandidates(criteria) {
    const whereConditions = this._buildWhereConditions(criteria);
    
    const experts = await this.prisma.expert.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            profileImage: true
          }
        },
        skills: {
          where: {
            skillId: criteria.skillId,
            isVerified: true
          },
          include: {
            skill: {
              select: {
                name: true,
                category: true
              }
            }
          }
        },
        qualityMetrics: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: {
            activeEnrollments: {
              where: {
                status: { in: ['ACTIVE', 'PENDING'] }
              }
            },
            completedEnrollments: true,
            studentRatings: true
          }
        },
        certificates: {
          where: { isVerified: true },
          take: 5
        },
        portfolioItems: {
          where: { isApproved: true },
          take: 10
        }
      },
      orderBy: [
        { tier: 'desc' },
        { qualityScore: 'desc' }
      ],
      take: this.config.maxCandidates
    });

    return experts;
  }

  /**
   * 🏗️ Build Database Where Conditions
   * @private
   */
  _buildWhereConditions(criteria) {
    const conditions = {
      status: 'ACTIVE',
      isVerified: true,
      skills: {
        some: {
          skillId: criteria.skillId,
          isVerified: true
        }
      },
      qualityScore: {
        gte: this.config.qualityThreshold
      }
    };

    // Apply tier filter if specified
    if (criteria.tierPreference && criteria.tierPreference !== 'any') {
      conditions.tier = criteria.tierPreference;
    }

    // Apply geographic filter if enabled
    if (this.config.enableGeoOptimization && criteria.studentLocation) {
      conditions.OR = [
        { serviceRadius: 'NATIONAL' },
        { 
          AND: [
            { serviceRadius: 'REGIONAL' },
            { region: criteria.studentLocation.region }
          ]
        },
        {
          AND: [
            { serviceRadius: 'LOCAL' },
            { city: criteria.studentLocation.city }
          ]
        }
      ];
    }

    // Capacity management - exclude experts at full capacity
    conditions.OR = conditions.OR || [];
    conditions.OR.push(
      {
        AND: [
          { tier: 'MASTER' },
          { currentStudents: { lt: this.prisma.expert.fields.maxStudents } }
        ]
      },
      {
        AND: [
          { tier: { in: ['SENIOR', 'STANDARD', 'DEVELOPING', 'PROBATION'] } },
          { currentStudents: { lt: this.prisma.expert.fields.maxStudents } }
        ]
      }
    );

    return conditions;
  }

  /**
   * 🏗️ Rank Experts Using Advanced Algorithm
   * @private
   */
  async _rankExperts(candidates, criteria) {
    const rankedExperts = await Promise.all(
      candidates.map(async (expert) => {
        const scores = await this._calculateExpertScores(expert, criteria);
        const matchScore = this._calculateOverallMatchScore(scores);
        
        return {
          ...expert,
          matchScore,
          ranking: this._calculateRanking(matchScore),
          detailedScores: scores
        };
      })
    );

    // Sort by match score (descending)
    return rankedExperts.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * 🏗️ Calculate Expert Scores
   * @private
   */
  async _calculateExpertScores(expert, criteria) {
    const scores = {};

    // 🎯 Quality Score (35%)
    scores.quality = this._calculateQualityScore(expert);

    // 🎯 Capacity Score (25%)
    scores.capacity = this._calculateCapacityScore(expert);

    // 🎯 Response Time Score (15%)
    scores.responseTime = this._calculateResponseTimeScore(expert);

    // 🎯 Geographic Score (15%)
    scores.geography = await this._calculateGeographicScore(expert, criteria);

    // 🎯 Rating Score (10%)
    scores.rating = this._calculateRatingScore(expert);

    return scores;
  }

  /**
   * 🏗️ Calculate Quality Score
   * @private
   */
  _calculateQualityScore(expert) {
    let score = expert.qualityScore || 0;

    // Adjust based on recent quality metrics
    if (expert.qualityMetrics && expert.qualityMetrics.length > 0) {
      const latestMetrics = expert.qualityMetrics[0];
      
      // Completion rate weighting
      if (latestMetrics.completionRate) {
        score += (latestMetrics.completionRate - 0.7) * 0.5; // Bonus for >70%
      }

      // Student satisfaction weighting
      if (latestMetrics.satisfactionScore) {
        score += (latestMetrics.satisfactionScore - 0.8) * 0.3; // Bonus for >80%
      }
    }

    // Tier-based quality adjustment
    const tierWeights = {
      MASTER: 0.3,
      SENIOR: 0.2,
      STANDARD: 0.1,
      DEVELOPING: 0,
      PROBATION: -0.2
    };

    score += tierWeights[expert.tier] || 0;

    return Math.min(1, Math.max(0, score / 5)); // Normalize to 0-1
  }

  /**
   * 🏗️ Calculate Capacity Score
   * @private
   */
  _calculateCapacityScore(expert) {
    const currentLoad = expert._count.activeEnrollments;
    const maxCapacity = expert.maxStudents;
    const capacityUtilization = currentLoad / maxCapacity;

    // Prefer experts with lower utilization (more capacity)
    return Math.max(0, 1 - capacityUtilization);
  }

  /**
   * 🏗️ Calculate Response Time Score
   * @private
   */
  _calculateResponseTimeScore(expert) {
    if (!expert.qualityMetrics || expert.qualityMetrics.length === 0) {
      return 0.5; // Default score if no data
    }

    const latestMetrics = expert.qualityMetrics[0];
    const responseTime = latestMetrics.averageResponseTime || 24; // Default to 24 hours

    // Score based on response time (faster is better)
    if (responseTime <= 4) return 1.0;    // 4 hours or less
    if (responseTime <= 8) return 0.8;    // 8 hours or less
    if (responseTime <= 12) return 0.6;   // 12 hours or less
    if (responseTime <= 24) return 0.4;   // 24 hours or less
    return 0.2;                           // More than 24 hours
  }

  /**
   * 🏗️ Calculate Geographic Score
   * @private
   */
  async _calculateGeographicScore(expert, criteria) {
    if (!this.config.enableGeoOptimization || !criteria.studentLocation) {
      return 0.5; // Neutral score if no geographic preference
    }

    try {
      // Simple geographic matching based on service radius
      switch (expert.serviceRadius) {
        case 'LOCAL':
          return expert.city === criteria.studentLocation.city ? 1.0 : 0.3;
        case 'REGIONAL':
          return expert.region === criteria.studentLocation.region ? 0.8 : 0.4;
        case 'NATIONAL':
          return 0.6;
        default:
          return 0.5;
      }
    } catch (error) {
      this._logError('GEOGRAPHIC_SCORE_CALCULATION_FAILED', error, { expertId: expert.id });
      return 0.5; // Fallback score
    }
  }

  /**
   * 🏗️ Calculate Rating Score
   * @private
   */
  _calculateRatingScore(expert) {
    if (expert._count.studentRatings === 0) {
      return 0.3; // Default score for no ratings
    }

    // Use average rating normalized to 0-1 scale
    const averageRating = expert.averageRating || 0;
    return averageRating / 5;
  }

  /**
   * 🏗️ Calculate Overall Match Score
   * @private
   */
  _calculateOverallMatchScore(scores) {
    let totalScore = 0;
    let totalWeight = 0;

    for (const [factor, weight] of Object.entries(this.algorithmWeights)) {
      if (scores[factor] !== undefined) {
        totalScore += scores[factor] * weight;
        totalWeight += weight;
      }
    }

    // Normalize to 0-100 scale
    return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
  }

  /**
   * 🏗️ Calculate Ranking
   * @private
   */
  _calculateRanking(matchScore) {
    if (matchScore >= 90) return 'EXCELLENT';
    if (matchScore >= 80) return 'VERY_GOOD';
    if (matchScore >= 70) return 'GOOD';
    if (matchScore >= 60) return 'FAIR';
    return 'POOR';
  }

  /**
   * 🏗️ Select Best Expert
   * @private
   */
  async _selectBestExpert(rankedExperts, criteria) {
    if (rankedExperts.length === 0) {
      throw new Error('No experts available for selection');
    }

    // Apply different selection strategies based on algorithm
    const algorithm = criteria.algorithm || this.config.defaultAlgorithm;

    switch (algorithm) {
      case MATCHING_ALGORITHMS.LOAD_BALANCED:
        return this._selectLoadBalancedExpert(rankedExperts);
      
      case MATCHING_ALGORITHMS.GEO_OPTIMIZED:
        return this._selectGeoOptimizedExpert(rankedExperts, criteria);
      
      case MATCHING_ALGORITHMS.TIER_PRIORITY:
        return this._selectTierPriorityExpert(rankedExperts);
      
      case MATCHING_ALGORITHMS.QUALITY_FIRST:
      default:
        return rankedExperts[0]; // Highest match score
    }
  }

  /**
   * 🏗️ Select Load Balanced Expert
   * @private
   */
  _selectLoadBalancedExpert(experts) {
    // Prefer experts with lower current load among top candidates
    const topCandidates = experts.slice(0, 5); // Consider top 5
    return topCandidates.reduce((best, current) => {
      const bestLoad = best._count.activeEnrollments / best.maxStudents;
      const currentLoad = current._count.activeEnrollments / current.maxStudents;
      return currentLoad < bestLoad ? current : best;
    });
  }

  /**
   * 🏗️ Select Geo Optimized Expert
   * @private
   */
  _selectGeoOptimizedExpert(experts, criteria) {
    if (!criteria.studentLocation) {
      return experts[0]; // Fallback to best match
    }

    // Prefer experts with better geographic scores among top candidates
    const topCandidates = experts.slice(0, 5);
    return topCandidates.reduce((best, current) => {
      return current.detailedScores.geography > best.detailedScores.geography ? current : best;
    });
  }

  /**
   * 🏗️ Select Tier Priority Expert
   * @private
   */
  _selectTierPriorityExpert(experts) {
    // Prefer higher tier experts among top candidates
    const tierOrder = { MASTER: 5, SENIOR: 4, STANDARD: 3, DEVELOPING: 2, PROBATION: 1 };
    const topCandidates = experts.slice(0, 5);
    return topCandidates.reduce((best, current) => {
      return tierOrder[current.tier] > tierOrder[best.tier] ? current : best;
    });
  }

  /**
   * 🏗️ Validate Expert Selection
   * @private
   */
  async _validateExpertSelection(expert, criteria) {
    // Check if expert is still available
    const currentExpert = await this.prisma.expert.findUnique({
      where: { id: expert.id },
      select: {
        status: true,
        currentStudents: true,
        maxStudents: true,
        qualityScore: true
      }
    });

    if (!currentExpert || currentExpert.status !== 'ACTIVE') {
      throw new Error('Selected expert is no longer available');
    }

    if (currentExpert.currentStudents >= currentExpert.maxStudents) {
      throw new Error('Selected expert has reached maximum capacity');
    }

    if (currentExpert.qualityScore < this.config.qualityThreshold) {
      throw new Error('Selected expert no longer meets quality requirements');
    }

    this.emit('expert.quality.checked', {
      expertId: expert.id,
      qualityScore: currentExpert.qualityScore,
      status: 'VALID'
    });

    return true;
  }

  /**
   * 🏗️ Format Expert Response
   * @private
   */
  _formatExpertResponse(expert) {
    return {
      id: expert.id,
      name: `${expert.user.firstName} ${expert.user.lastName}`,
      tier: expert.tier,
      qualityScore: expert.qualityScore,
      matchScore: expert.matchScore,
      ranking: expert.ranking,
      contact: {
        phone: expert.user.phone,
        email: expert.user.email
      },
      profileImage: expert.user.profileImage,
      skills: expert.skills.map(skill => ({
        name: skill.skill.name,
        category: skill.skill.category,
        experience: skill.yearsExperience,
        verified: skill.isVerified
      })),
      metrics: {
        completionRate: expert.qualityMetrics?.[0]?.completionRate || 0,
        averageRating: expert.averageRating || 0,
        totalStudents: expert._count.completedEnrollments,
        responseTime: expert.qualityMetrics?.[0]?.averageResponseTime || 24,
        capacity: {
          current: expert._count.activeEnrollments,
          max: expert.maxStudents,
          available: expert.maxStudents - expert._count.activeEnrollments
        }
      },
      portfolio: {
        items: expert.portfolioItems.length,
        certificates: expert.certificates.length
      },
      serviceDetails: {
        radius: expert.serviceRadius,
        region: expert.region,
        city: expert.city
      }
    };
  }

  /**
   * 🏗️ Update Performance Metrics
   * @private
   */
  _updateMetrics(processingTime) {
    const totalRequests = this.metrics.matchesSuccessful + this.metrics.matchesFailed;
    this.metrics.averageMatchingTime = 
      (this.metrics.averageMatchingTime * (totalRequests - 1) + processingTime) / totalRequests;

    // Update cache hit rate
    const totalCacheOperations = this.metrics.cacheHitRate + this.metrics.cacheMissRate;
    if (totalCacheOperations > 0) {
      this.metrics.cacheHitRate = (this.metrics.cacheHitRate / totalCacheOperations) * 100;
      this.metrics.cacheMissRate = (this.metrics.cacheMissRate / totalCacheOperations) * 100;
    }
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
      'NO_EXPERTS_AVAILABLE': 'HIGH',
      'QUALITY_THRESHOLD_NOT_MET': 'MEDIUM',
      'CAPACITY_EXCEEDED': 'MEDIUM',
      'GEOGRAPHIC_LIMITATION': 'LOW',
      'SKILL_UNAVAILABLE': 'MEDIUM',
      'INTERNAL_ERROR': 'CRITICAL'
    };

    return severityMap[errorCode] || 'MEDIUM';
  }

  /**
   * 🏗️ Start Health Monitoring
   * @private
   */
  _startHealthChecks() {
    setInterval(() => {
      this._checkHealth();
    }, 30000);
  }

  /**
   * 🏗️ Health Check Implementation
   * @private
   */
  async _checkHealth() {
    const health = {
      service: 'expert-finder',
      timestamp: new Date().toISOString(),
      status: 'healthy',
      dependencies: {},
      metrics: this.getMetrics()
    };

    try {
      await this.redis.ping();
      health.dependencies.redis = 'healthy';
    } catch (error) {
      health.dependencies.redis = 'unhealthy';
      health.status = 'degraded';
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      health.dependencies.database = 'healthy';
    } catch (error) {
      health.dependencies.database = 'unhealthy';
      health.status = 'degraded';
    }

    await this.redis.set(
      `health:expert-finder:${Date.now()}`,
      JSON.stringify(health),
      'EX',
      60
    );

    this.emit('health.check', health);
  }

  /**
   * 🏗️ Enterprise Logging
   * @private
   */
  _logEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'expert-finder',
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
   * 🎯 Get Expert by ID with Full Profile
   * @param {string} expertId - Expert ID
   * @returns {Promise<Object>} Expert profile
   */
  async getExpertProfile(expertId, options = {}) {
    const includeRatings = options.includeRatings !== false;
    const includePortfolio = options.includePortfolio !== false;

    const expert = await this.prisma.expert.findUnique({
      where: { id: expertId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            profileImage: true,
            joinedAt: true
          }
        },
        skills: {
          include: {
            skill: {
              select: {
                name: true,
                category: true,
                description: true
              }
            }
          }
        },
        qualityMetrics: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        certificates: {
          where: { isVerified: true }
        },
        portfolioItems: {
          where: { isApproved: true },
          take: 20
        },
        ...(includeRatings && {
          studentRatings: {
            include: {
              student: {
                select: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }),
        _count: {
          select: {
            activeEnrollments: true,
            completedEnrollments: true,
            studentRatings: true
          }
        }
      }
    });

    if (!expert) {
      throw new Error('Expert not found');
    }

    return this._formatExpertResponse(expert);
  }

  /**
   * 🎯 Search Experts by Multiple Criteria
   * @param {Object} filters - Search filters
   * @returns {Promise<Object>} Search results
   */
  async searchExperts(filters = {}) {
    const {
      skillIds = [],
      tiers = [],
      minQuality = this.config.qualityThreshold,
      location = null,
      availability = null,
      page = 1,
      limit = 20
    } = filters;

    const whereConditions = {
      status: 'ACTIVE',
      isVerified: true,
      qualityScore: { gte: minQuality }
    };

    // Apply skill filters
    if (skillIds.length > 0) {
      whereConditions.skills = {
        some: {
          skillId: { in: skillIds },
          isVerified: true
        }
      };
    }

    // Apply tier filters
    if (tiers.length > 0) {
      whereConditions.tier = { in: tiers };
    }

    // Apply geographic filters
    if (location) {
      whereConditions.OR = [
        { serviceRadius: 'NATIONAL' },
        { 
          AND: [
            { serviceRadius: 'REGIONAL' },
            { region: location.region }
          ]
        },
        {
          AND: [
            { serviceRadius: 'LOCAL' },
            { city: location.city }
          ]
        }
      ];
    }

    // Apply availability filters
    if (availability === 'available') {
      whereConditions.currentStudents = { lt: this.prisma.expert.fields.maxStudents };
    }

    const [experts, totalCount] = await Promise.all([
      this.prisma.expert.findMany({
        where: whereConditions,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              profileImage: true
            }
          },
          skills: {
            include: {
              skill: {
                select: {
                  name: true,
                  category: true
                }
              }
            }
          },
          _count: {
            select: {
              activeEnrollments: true,
              completedEnrollments: true
            }
          }
        },
        orderBy: [
          { tier: 'desc' },
          { qualityScore: 'desc' },
          { averageRating: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.expert.count({ where: whereConditions })
    ]);

    return {
      experts: experts.map(expert => this._formatExpertResponse(expert)),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * 🏗️ Get Service Metrics
   * @returns {Object} Service performance metrics
   */
  getMetrics() {
    const totalRequests = this.metrics.matchesRequested;
    const successRate = totalRequests > 0 
      ? (this.metrics.matchesSuccessful / totalRequests) * 100 
      : 0;

    return {
      ...this.metrics,
      successRate: `${successRate.toFixed(2)}%`,
      circuitBreakerState: this.circuitBreaker.getState(),
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  /**
   * 🏗️ Update Algorithm Weights
   * @param {Object} newWeights - New algorithm weights
   */
  updateAlgorithmWeights(newWeights) {
    // Validate weights sum to