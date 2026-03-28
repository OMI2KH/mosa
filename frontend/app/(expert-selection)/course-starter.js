/**
 * 🎯 MOSA FORGE: Enterprise Expert Selection & Course Starter Service
 * 
 * @module ExpertSelectionCourseStarter
 * @description Advanced expert matching algorithm with quality-guaranteed course initiation
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - AI-powered expert matching algorithm
 * - Quality guarantee enforcement
 * - Real-time capacity optimization
 * - Multi-dimensional scoring system
 * - Student-expert compatibility analysis
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');

// 🏗️ Enterprise Constants
const MATCHING_ALGORITHMS = {
  QUALITY_FIRST: 'quality_first',
  LOAD_BALANCED: 'load_balanced',
  TIER_PRIORITIZED: 'tier_prioritized',
  STUDENT_CENTERED: 'student_centered'
};

const EXPERT_TIERS = {
  MASTER: { weight: 1.0, minQuality: 4.7, bonus: 0.2 },
  SENIOR: { weight: 0.8, minQuality: 4.3, bonus: 0.1 },
  STANDARD: { weight: 0.6, minQuality: 4.0, bonus: 0.0 },
  DEVELOPING: { weight: 0.4, minQuality: 3.5, bonus: -0.1 },
  PROBATION: { weight: 0.2, minQuality: 0.0, bonus: -0.2 }
};

const MATCHING_WEIGHTS = {
  QUALITY_SCORE: 0.25,
  COMPLETION_RATE: 0.20,
  RESPONSE_TIME: 0.15,
  STUDENT_LOAD: 0.15,
  TIER_SCORE: 0.15,
  GEO_PROXIMITY: 0.10
};

/**
 * 🏗️ Enterprise Expert Selection & Course Starter Class
 * @class ExpertSelectionCourseStarter
 * @extends EventEmitter
 */
class ExpertSelectionCourseStarter extends EventEmitter {
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
      matchingAlgorithm: options.matchingAlgorithm || MATCHING_ALGORITHMS.QUALITY_FIRST,
      maxCandidates: options.maxCandidates || 15,
      qualityThreshold: options.qualityThreshold || 4.0,
      cacheTTL: options.cacheTTL || 300, // 5 minutes
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60000
      }
    };

    // 🏗️ Service Dependencies
    this.redis = new Redis(this.config.redis);
    this.prisma = this.config.prisma;
    this.circuitBreaker = this._initializeCircuitBreaker();
    
    // 🏗️ Performance Monitoring
    this.metrics = {
      matchesProcessed: 0,
      matchesSuccessful: 0,
      matchesFailed: 0,
      averageMatchingTime: 0,
      algorithmDistribution: {},
      qualityScores: []
    };

    // 🏗️ Cache Keys
    this.cacheKeys = {
      expertPool: (skillId) => `expert:pool:${skillId}`,
      studentPreferences: (studentId) => `student:prefs:${studentId}`,
      matchResult: (enrollmentId) => `match:result:${enrollmentId}`
    };

    this._initializeEventHandlers();
    this._startMetricsCollection();
  }

  /**
   * 🏗️ Initialize Circuit Breaker
   * @private
   */
  _initializeCircuitBreaker() {
    let state = 'CLOSED';
    let failureCount = 0;
    let lastFailureTime = null;

    return {
      execute: async (operation) => {
        if (state === 'OPEN') {
          if (Date.now() - lastFailureTime > this.config.circuitBreaker.resetTimeout) {
            state = 'HALF_OPEN';
          } else {
            throw new Error('Expert matching circuit breaker is OPEN');
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
          
          if (failureCount >= this.config.circuitBreaker.failureThreshold) {
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
    this.on('matching.started', (data) => {
      this._logEvent('MATCHING_STARTED', data);
      this.metrics.matchesProcessed++;
    });

    this.on('matching.completed', (data) => {
      this._logEvent('MATCHING_COMPLETED', data);
      this.metrics.matchesSuccessful++;
      this.metrics.qualityScores.push(data.qualityScore);
    });

    this.on('matching.failed', (data) => {
      this._logEvent('MATCHING_FAILED', data);
      this.metrics.matchesFailed++;
    });

    this.on('expert.selected', (data) => {
      this._logEvent('EXPERT_SELECTED', data);
    });

    this.on('quality.validated', (data) => {
      this._logEvent('QUALITY_VALIDATED', data);
    });
  }

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Select Expert & Start Course
   * @param {Object} matchingData - Student and course data
   * @returns {Promise<Object>} Expert match and course start result
   */
  async selectExpertAndStartCourse(matchingData) {
    const startTime = performance.now();
    const matchId = uuidv4();
    const traceId = matchingData.traceId || uuidv4();

    try {
      this.emit('matching.started', { matchId, traceId, matchingData });

      // 🏗️ Enterprise Validation Chain
      await this._validateMatchingData(matchingData);
      
      // 🏗️ Get Qualified Expert Pool
      const expertPool = await this._getQualifiedExpertPool(
        matchingData.skillId, 
        matchingData.studentId
      );

      // 🏗️ Advanced Matching Algorithm
      const matchedExpert = await this._executeMatchingAlgorithm(
        expertPool, 
        matchingData
      );

      // 🏗️ Quality Guarantee Validation
      await this._validateExpertQuality(matchedExpert.id);
      
      // 🏗️ Start Course with Selected Expert
      const courseResult = await this._startCourseWithExpert(
        matchingData, 
        matchedExpert, 
        matchId
      );

      const processingTime = performance.now() - startTime;
      this._updateMatchingMetrics(processingTime);

      const result = {
        success: true,
        matchId,
        expert: this._formatExpertResponse(matchedExpert),
        course: courseResult,
        matchingScore: matchedExpert.finalScore,
        qualityAssurance: this._getQualityAssurance(matchedExpert),
        traceId
      };

      this.emit('matching.completed', {
        matchId,
        expertId: matchedExpert.id,
        studentId: matchingData.studentId,
        qualityScore: matchedExpert.qualityScore,
        processingTime
      });

      this._logSuccess('EXPERT_MATCHED', { matchId, expertId: matchedExpert.id });

      return result;

    } catch (error) {
      const processingTime = performance.now() - startTime;
      this._updateMatchingMetrics(processingTime);
      
      const errorResult = {
        success: false,
        error: error.message,
        errorCode: error.code || 'MATCHING_FAILED',
        matchId,
        traceId,
        timestamp: new Date().toISOString()
      };

      this.emit('matching.failed', errorResult);
      this._logError('EXPERT_MATCHING_FAILED', error, { matchId, traceId });

      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🏗️ Validate Matching Data
   * @private
   */
  async _validateMatchingData(matchingData) {
    const requiredFields = ['studentId', 'skillId', 'paymentId', 'bundleType'];
    const missingFields = requiredFields.filter(field => !matchingData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate student readiness
    const student = await this.prisma.student.findUnique({
      where: { id: matchingData.studentId },
      include: {
        mindsetAssessment: {
          orderBy: { completedAt: 'desc' },
          take: 1
        }
      }
    });

    if (!student) {
      throw new Error('Student not found');
    }

    if (student.status !== 'READY_FOR_TRAINING') {
      throw new Error('Student not ready for expert matching');
    }

    // Validate mindset completion
    const latestAssessment = student.mindsetAssessment[0];
    if (!latestAssessment || latestAssessment.status !== 'COMPLETED') {
      throw new Error('Mindset phase not completed');
    }

    if (latestAssessment.overallScore < 70) {
      throw new Error('Mindset assessment score below threshold');
    }

    return true;
  }

  /**
   * 🏗️ Get Qualified Expert Pool with Caching
   * @private
   */
  async _getQualifiedExpertPool(skillId, studentId) {
    const cacheKey = this.cacheKeys.expertPool(skillId);
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // 🎯 Advanced Expert Query with Multiple Dimensions
    const experts = await this.prisma.expert.findMany({
      where: {
        // Skill matching
        skills: {
          some: {
            skillId,
            isVerified: true,
            isActive: true
          }
        },
        // Availability and status
        status: 'ACTIVE',
        isAvailable: true,
        // Quality thresholds
        qualityScore: {
          gte: this.config.qualityThreshold
        },
        // Capacity management
        currentStudents: {
          lt: this.prisma.expert.fields.maxStudents
        },
        // Recent activity
        lastActive: {
          gte: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)) // Active in last 7 days
        }
      },
      include: {
        skills: {
          where: { skillId },
          select: {
            certificationLevel: true,
            yearsExperience: true,
            portfolioItems: true
          }
        },
        qualityMetrics: {
          select: {
            completionRate: true,
            averageRating: true,
            responseTime: true,
            studentSatisfaction: true,
            onTimeCompletion: true
          }
        },
        _count: {
          select: {
            activeEnrollments: true,
            completedEnrollments: true
          }
        },
        availability: {
          where: {
            isActive: true
          }
        }
      },
      orderBy: {
        qualityScore: 'desc'
      }
    });

    if (experts.length === 0) {
      throw new Error('No qualified experts available for this skill');
    }

    // 🎯 Enhanced Expert Pool with Calculated Metrics
    const enhancedExperts = experts.map(expert => ({
      ...expert,
      calculatedMetrics: this._calculateExpertMetrics(expert),
      matchingFactors: this._extractMatchingFactors(expert)
    }));

    // Cache the expert pool
    await this.redis.set(
      cacheKey, 
      JSON.stringify(enhancedExperts), 
      'EX', 
      this.config.cacheTTL
    );

    return enhancedExperts;
  }

  /**
   * 🏗️ Calculate Expert Performance Metrics
   * @private
   */
  _calculateExpertMetrics(expert) {
    const metrics = expert.qualityMetrics;
    const counts = expert._count;

    return {
      overallPerformance: this._calculateOverallPerformance(metrics),
      reliabilityScore: this._calculateReliabilityScore(metrics, counts),
      capacityUtilization: expert.currentStudents / expert.maxStudents,
      experienceLevel: this._calculateExperienceLevel(expert),
      studentRetention: counts.completedEnrollments / 
                       (counts.activeEnrollments + counts.completedEnrollments || 1)
    };
  }

  /**
   * 🏗️ Calculate Overall Performance Score
   * @private
   */
  _calculateOverallPerformance(metrics) {
    if (!metrics) return 0;

    const weights = {
      completionRate: 0.30,
      averageRating: 0.25,
      responseTime: 0.20,
      studentSatisfaction: 0.15,
      onTimeCompletion: 0.10
    };

    let score = 0;
    
    // Completion Rate (0-100 scale)
    score += (metrics.completionRate || 0) * weights.completionRate;
    
    // Average Rating (0-5 scale converted to 0-100)
    score += ((metrics.averageRating || 0) / 5) * 100 * weights.averageRating;
    
    // Response Time (inverse - faster is better)
    const responseScore = Math.max(0, 24 - (metrics.responseTime || 24)) / 24 * 100;
    score += responseScore * weights.responseTime;
    
    // Student Satisfaction (0-100 scale)
    score += (metrics.studentSatisfaction || 0) * weights.studentSatisfaction;
    
    // On-time Completion (0-100 scale)
    score += (metrics.onTimeCompletion || 0) * weights.onTimeCompletion;

    return Math.min(100, score);
  }

  /**
   * 🏗️ Calculate Reliability Score
   * @private
   */
  _calculateReliabilityScore(metrics, counts) {
    const totalEnrollments = counts.activeEnrollments + counts.completedEnrollments;
    if (totalEnrollments === 0) return 50; // Default for new experts

    const factors = {
      completionRate: (metrics.completionRate || 0) * 0.4,
      ratingConsistency: ((metrics.averageRating || 0) / 5) * 100 * 0.3,
      volumeExperience: Math.min(100, totalEnrollments * 2) * 0.2, // Cap at 50 enrollments
      responseReliability: metrics.responseTime <= 12 ? 100 : 50 * 0.1
    };

    return Object.values(factors).reduce((sum, score) => sum + score, 0);
  }

  /**
   * 🏗️ Calculate Experience Level
   * @private
   */
  _calculateExperienceLevel(expert) {
    const skillData = expert.skills[0];
    if (!skillData) return 0;

    let experienceScore = 0;
    
    // Years of experience (capped at 10 years)
    experienceScore += Math.min(50, (skillData.yearsExperience || 0) * 10);
    
    // Certification level
    const certLevels = { BEGINNER: 10, INTERMEDIATE: 30, ADVANCED: 60, EXPERT: 100 };
    experienceScore += certLevels[skillData.certificationLevel] || 0;
    
    // Portfolio items
    experienceScore += Math.min(20, (skillData.portfolioItems || 0) * 2);

    return Math.min(100, experienceScore);
  }

  /**
   * 🏗️ Extract Matching Factors
   * @private
   */
  _extractMatchingFactors(expert) {
    return {
      tier: expert.tier,
      qualityScore: expert.qualityScore,
      studentCapacity: expert.maxStudents - expert.currentStudents,
      responseTime: expert.qualityMetrics?.responseTime || 24,
      availabilitySlots: expert.availability?.length || 0,
      specialization: expert.skills[0]?.certificationLevel || 'BEGINNER'
    };
  }

  /**
   * 🏗️ Execute Advanced Matching Algorithm
   * @private
   */
  async _executeMatchingAlgorithm(expertPool, matchingData) {
    const scoredExperts = expertPool.map(expert => ({
      ...expert,
      finalScore: this._calculateExpertMatchScore(expert, matchingData),
      componentScores: this._calculateComponentScores(expert, matchingData)
    }));

    // Sort by final score (descending)
    scoredExperts.sort((a, b) => b.finalScore - a.finalScore);

    // Take top candidates based on configuration
    const topCandidates = scoredExperts.slice(0, this.config.maxCandidates);

    if (topCandidates.length === 0) {
      throw new Error('No suitable experts found after scoring');
    }

    // Apply matching algorithm strategy
    const selectedExpert = this._applyMatchingStrategy(topCandidates);

    this.emit('expert.selected', {
      expertId: selectedExpert.id,
      finalScore: selectedExpert.finalScore,
      ranking: 1,
      totalCandidates: expertPool.length
    });

    return selectedExpert;
  }

  /**
   * 🏗️ Calculate Expert Match Score
   * @private
   */
  _calculateExpertMatchScore(expert, matchingData) {
    const factors = expert.matchingFactors;
    const metrics = expert.calculatedMetrics;

    let totalScore = 0;

    // 🎯 Quality Score Component (25%)
    totalScore += (expert.qualityScore / 5) * 100 * MATCHING_WEIGHTS.QUALITY_SCORE;

    // 🎯 Completion Rate Component (20%)
    totalScore += (metrics.overallPerformance / 100) * 100 * MATCHING_WEIGHTS.COMPLETION_RATE;

    // 🎯 Response Time Component (15%) - Faster is better
    const responseScore = Math.max(0, 24 - factors.responseTime) / 24 * 100;
    totalScore += responseScore * MATCHING_WEIGHTS.RESPONSE_TIME;

    // 🎯 Student Load Component (15%) - Lower utilization is better
    const loadScore = (1 - metrics.capacityUtilization) * 100;
    totalScore += loadScore * MATCHING_WEIGHTS.STUDENT_LOAD;

    // 🎯 Tier Score Component (15%)
    const tierWeight = EXPERT_TIERS[expert.tier]?.weight || 0.5;
    totalScore += tierWeight * 100 * MATCHING_WEIGHTS.TIER_SCORE;

    // 🎯 Geographic Proximity Component (10%)
    const proximityScore = this._calculateProximityScore(expert, matchingData);
    totalScore += proximityScore * MATCHING_WEIGHTS.GEO_PROXIMITY;

    // 🎯 Apply Algorithm-Specific Adjustments
    totalScore = this._applyAlgorithmAdjustments(totalScore, expert, matchingData);

    return Math.min(100, totalScore);
  }

  /**
   * 🏗️ Calculate Component Scores for Transparency
   * @private
   */
  _calculateComponentScores(expert, matchingData) {
    const factors = expert.matchingFactors;
    const metrics = expert.calculatedMetrics;

    return {
      qualityScore: (expert.qualityScore / 5) * 100,
      completionRate: metrics.overallPerformance,
      responseTime: Math.max(0, 24 - factors.responseTime) / 24 * 100,
      studentLoad: (1 - metrics.capacityUtilization) * 100,
      tierScore: (EXPERT_TIERS[expert.tier]?.weight || 0.5) * 100,
      proximityScore: this._calculateProximityScore(expert, matchingData)
    };
  }

  /**
   * 🏗️ Calculate Geographic Proximity Score
   * @private
   */
  _calculateProximityScore(expert, matchingData) {
    // Simplified proximity calculation
    // In production, this would use actual geographic coordinates
    if (!expert.city || !matchingData.studentCity) {
      return 50; // Default score if location data unavailable
    }

    if (expert.city === matchingData.studentCity) {
      return 100;
    } else if (expert.region === matchingData.studentRegion) {
      return 75;
    } else {
      return 50;
    }
  }

  /**
   * 🏗️ Apply Matching Strategy Adjustments
   * @private
   */
  _applyAlgorithmAdjustments(baseScore, expert, matchingData) {
    switch (this.config.matchingAlgorithm) {
      case MATCHING_ALGORITHMS.QUALITY_FIRST:
        // Emphasize quality metrics
        return baseScore * 1.1;

      case MATCHING_ALGORITHMS.LOAD_BALANCED:
        // Prefer experts with lower current load
        const loadFactor = 1 - (expert.currentStudents / expert.maxStudents);
        return baseScore * (0.9 + loadFactor * 0.2);

      case MATCHING_ALGORITHMS.TIER_PRIORITIZED:
        // Boost higher tier experts
        const tierBoost = EXPERT_TIERS[expert.tier]?.weight || 0.5;
        return baseScore * (0.8 + tierBoost * 0.4);

      case MATCHING_ALGORITHMS.STUDENT_CENTERED:
        // Consider student preferences and learning style
        return this._applyStudentPreferences(baseScore, expert, matchingData);

      default:
        return baseScore;
    }
  }

  /**
   * 🏗️ Apply Student Preferences
   * @private
   */
  _applyStudentPreferences(baseScore, expert, matchingData) {
    let adjustedScore = baseScore;

    // Teaching style matching
    if (matchingData.preferredTeachingStyle && expert.teachingStyle) {
      if (matchingData.preferredTeachingStyle === expert.teachingStyle) {
        adjustedScore *= 1.15;
      }
    }

    // Language preference
    if (matchingData.preferredLanguage && expert.languages) {
      if (expert.languages.includes(matchingData.preferredLanguage)) {
        adjustedScore *= 1.1;
      }
    }

    // Schedule compatibility
    if (matchingData.availabilityPreference && expert.availability) {
      const compatibility = this._calculateScheduleCompatibility(
        matchingData.availabilityPreference, 
        expert.availability
      );
      adjustedScore *= (0.9 + compatibility * 0.2);
    }

    return Math.min(100, adjustedScore);
  }

  /**
   * 🏗️ Calculate Schedule Compatibility
   * @private
   */
  _calculateScheduleCompatibility(studentPref, expertAvailability) {
    // Simplified compatibility calculation
    // In production, this would analyze actual time slots
    const matchingSlots = expertAvailability.filter(slot =>
      studentPref.some(pref => 
        pref.dayOfWeek === slot.dayOfWeek &&
        this._timeOverlaps(pref.timeRange, slot.timeRange)
      )
    ).length;

    return matchingSlots / studentPref.length || 0;
  }

  /**
   * 🏗️ Check Time Overlap
   * @private
   */
  _timeOverlaps(range1, range2) {
    // Simplified time overlap check
    return true; // In production, implement actual time comparison
  }

  /**
   * 🏗️ Apply Matching Strategy
   * @private
   */
  _applyMatchingStrategy(candidates) {
    switch (this.config.matchingAlgorithm) {
      case MATCHING_ALGORITHMS.QUALITY_FIRST:
        return candidates[0]; // Highest score

      case MATCHING_ALGORITHMS.LOAD_BALANCED:
        return candidates.sort((a, b) => 
          b.calculatedMetrics.capacityUtilization - a.calculatedMetrics.capacityUtilization
        )[0];

      case MATCHING_ALGORITHMS.TIER_PRIORITIZED:
        return candidates.sort((a, b) => {
          const tierA = EXPERT_TIERS[a.tier]?.weight || 0;
          const tierB = EXPERT_TIERS[b.tier]?.weight || 0;
          return tierB - tierA;
        })[0];

      case MATCHING_ALGORITHMS.STUDENT_CENTERED:
        return candidates[0]; // Already sorted by comprehensive score

      default:
        return candidates[0];
    }
  }

  /**
   * 🏗️ Validate Expert Quality
   * @private
   */
  async _validateExpertQuality(expertId) {
    const qualityCheck = await this.prisma.qualityMetrics.findFirst({
      where: {
        expertId,
        isValid: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!qualityCheck) {
      throw new Error('Expert quality metrics not available');
    }

    const tierRequirements = EXPERT_TIERS[qualityCheck.tier];
    if (!tierRequirements || qualityCheck.overallScore < tierRequirements.minQuality) {
      throw new Error('Expert does not meet tier quality requirements');
    }

    if (qualityCheck.completionRate < 0.7) {
      throw new Error('Expert completion rate below platform threshold');
    }

    this.emit('quality.validated', { 
      expertId, 
      qualityScore: qualityCheck.overallScore,
      tier: qualityCheck.tier 
    });

    return true;
  }

  /**
   * 🏗️ Start Course with Selected Expert
   * @private
   */
  async _startCourseWithExpert(matchingData, expert, matchId) {
    return await this.prisma.$transaction(async (tx) => {
      // Create enrollment record
      const enrollment = await tx.enrollment.create({
        data: {
          id: matchId,
          studentId: matchingData.studentId,
          expertId: expert.id,
          skillId: matchingData.skillId,
          paymentId: matchingData.paymentId,
          status: 'ACTIVE',
          startDate: new Date(),
          expectedEndDate: new Date(Date.now() + (120 * 24 * 60 * 60 * 1000)), // 4 months
          currentPhase: 'THEORY',
          matchingScore: expert.finalScore,
          matchingMetadata: {
            algorithm: this.config.matchingAlgorithm,
            componentScores: expert.componentScores,
            rankedPosition: 1,
            totalCandidates: expert.totalCandidates
          },
          metadata: {
            bundleType: matchingData.bundleType,
            revenueSplit: {
              mosa: 1000,
              expert: 999
            },
            payoutSchedule: this._createPayoutSchedule(expert.tier)
          }
        }
      });

      // Update expert student count
      await tx.expert.update({
        where: { id: expert.id },
        data: {
          currentStudents: {
            increment: 1
          },
          lastAssignment: new Date()
        }
      });

      // Initialize theory phase
      await tx.learningProgress.create({
        data: {
          enrollmentId: enrollment.id,
          phase: 'THEORY',
          progress: 0,
          completedExercises: 0,
          totalExercises: this._getTheoryExerciseCount(matchingData.skillId),
          lastActivity: new Date(),
          startedAt: new Date()
        }
      });

      // Create first session schedule
      await tx.trainingSession.create({
        data: {
          enrollmentId: enrollment.id,
          sessionNumber: 1,
          scheduledDate: new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)), // 2 days from now
          status: 'SCHEDULED',
          sessionType: 'ORIENTATION',
          duration: 60, // minutes
          objectives: ['Course overview', 'Goal setting', 'Initial assessment']
        }
      });

      return {
        enrollmentId: enrollment.id,
        startDate: enrollment.startDate,
        currentPhase: enrollment.currentPhase,
        firstSession: this._getFirstSessionDetails(),
        progressTracking: this._getProgressTrackingSetup()
      };
    });
  }

  /**
   * 🏗️ Create Tier-Based Payout Schedule
   * @private
   */
  _createPayoutSchedule(tier) {
    const basePayouts = [
      { phase: 'START', amount: 333, paid: false },
      { phase: 'MIDPOINT', amount: 333, paid: false },
      { phase: 'COMPLETION', amount: 333, paid: false }
    ];

    const tierBonus = EXPERT_TIERS[tier]?.bonus || 0;
    
    if (tierBonus > 0) {
      const bonusAmount = 999 * tierBonus;
      basePayouts.push({
        phase: 'QUALITY_BONUS',
        amount: bonusAmount,
        paid: false,
        conditions: ['maintain_quality', 'high_completion', 'student_satisfaction']
      });
    }

    return basePayouts;
  }

  /**
   * 🏗️ Get Theory Exercise Count
   * @private
   */
  _getTheoryExerciseCount(skillId) {
    // In production, this would query skill configuration
    const exerciseCounts = {
      'forex-trading': 120,
      'graphic-design': 80,
      'web-development': 150,
      'digital-marketing': 100
    };

    return exerciseCounts[skillId] || 100;
  }

  /**
   * 🏗️ Get First Session Details
   * @private
   */
  _getFirstSessionDetails() {
    return {
      type: 'ORIENTATION',
      duration: '60 minutes',
      objectives: [
        'Course overview and roadmap',
        'Goal setting and expectations',
        'Platform orientation',
        'Initial skill assessment',
        'Q&A session'
      ],
      preparation: [
        'Stable internet connection',
        'Notebook for taking notes',
        'List of learning goals',
        'Questions for expert'
      ]
    };
  }

  /**
   * 🏗️ Get Progress Tracking Setup
   * @private
   */
  _getProgressTrackingSetup() {
    return {
      phases: [
        { name: 'THEORY', duration: '2 months', exercises: 100, weight: 40 },
        { name: 'HANDS_ON', duration: '2 months', projects: 5, weight: 50 },
        { name: 'CERTIFICATION', duration: '2 weeks', assessment: 1, weight: 10 }
      ],
      milestones: [
        { phase: 'THEORY', target: 25, reward: 'Basic Concepts Mastered' },
        { phase: 'THEORY', target: 50, reward: 'Intermediate Level Achieved' },
        { phase: 'THEORY', target: 75, reward: 'Advanced Concepts Understood' },
        { phase: 'THEORY', target: 100, reward: 'Theory Phase Completed' }
      ]
    };
  }

  /**
   * 🏗️ Format Expert Response
   * @private
   */
  _formatExpertResponse(expert) {
    return {
      id: expert.id,
      name: expert.name,
      tier: expert.tier,
      qualityScore: expert.qualityScore,
      matchScore: expert.finalScore,
      experience: expert.calculatedMetrics.experienceLevel,
      specialization: expert.skills[0]?.certificationLevel,
      languages: expert.languages,
      teachingStyle: expert.teachingStyle,
      availability: expert.availability,
      rating: expert.qualityMetrics?.averageRating,
      completionRate: expert.qualityMetrics?.completionRate
    };
  }

  /**
   * 🏗️ Get Quality Assurance Details
   * @private
   */
  _getQualityAssurance(expert) {
    return {
      tier: expert.tier,
      qualityScore: expert.qualityScore,
      completionRate: expert.qualityMetrics?.completionRate,
      studentSatisfaction: expert.qualityMetrics?.studentSatisfaction,
      autoSwitchGuarantee: true,
      qualityMonitoring: 'REAL_TIME',
      supportLevel: this._getSupportLevel(expert.tier)
    };
  }

  /**
   * 🏗️ Get Support Level by Tier
   * @private
   */
  _getSupportLevel(tier) {
    const supportLevels = {
      MASTER: 'PREMIUM',
      SENIOR: 'ENHANCED',
      STANDARD: 'STANDARD',
      DEVELOPING: 'BASIC',
      PROBATION: 'MONITORED'
    };

    return supportLevels[tier] || 'STANDARD';
  }

  /**
   * 🏗️ Update Matching Metrics
   * @private
   */
  _updateMatchingMetrics(processingTime) {
    this.metrics.averageMatchingTime = 
      (this.metrics.averageMatchingTime * (this.metrics.matchesSuccessful - 1) + processingTime) / 
      this.metrics.matchesSuccessful;

    // Track algorithm distribution
    this.metrics.algorithmDistribution[this.config.matchingAlgorithm] = 
      (this.metrics.algorithmDistribution[this.config.matchingAlgorithm] || 0) + 1;
  }

  /**
   * 🏗️ Start Metrics Collection
   * @private
   */
  _startMetricsCollection() {
    setInterval(() => {
      this._collectAndReportMetrics();
    }, 60000); // Every minute
  }

  /**
   * 🏗️ Collect and Report Metrics
   * @private
   */
  async _collectAndReportMetrics() {
    const metricsSnapshot = {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      circuitBreakerState: this.circuitBreaker.getState(),
      cacheHitRate: await this._calculateCacheHitRate()
    };

    // Store metrics for monitoring
    await this.redis.set(
      `metrics:expert-selection:${Date.now()}`,
      JSON.stringify(metricsSnapshot),
      'EX',
      3600 // 1 hour
    );

    this.emit('metrics.collected', metricsSnapshot);
  }

  /**
   * 🏗️ Calculate Cache Hit Rate
   * @private
   */
  async _calculateCacheHitRate() {
    // Simplified cache hit rate calculation
    // In production, use Redis INFO command or monitoring system
    return 0.85; // Example value
  }

  /**
   * 🏗️ Format Enterprise Error
   * @private
   */
  _formatEnterpriseError(error) {
    const enterpriseError = new Error(error.message);
    enterpriseError.code = error.code || 'MATCHING_ERROR';
    enterpriseError.timestamp = new Date().toISOString();
    enterpriseError.severity = this._getErrorSeverity(error.code);
    enterpriseError.retryable = this._isRetryableError(error.code);
    
    return enterpriseError;
  }

  /**
   * 🏗️ Get Error Severity
   * @private
   */
  _getErrorSeverity(errorCode) {
    const severityMap = {
      'NO_EXPERTS_AVAILABLE': 'HIGH',
      'QUALITY_THRESHOLD': 'HIGH',
      'CAPACITY_EXCEEDED': 'MEDIUM',
      'VALIDATION_ERROR': 'LOW',
      'MATCHING_ERROR': 'CRITICAL'
    };

    return severityMap[errorCode] || 'MEDIUM';
  }

  /**
   * 🏗️ Check if Error is Retryable
   * @private
   */
  _isRetryableError(errorCode) {
    const retryableErrors = [
      'CAPACITY_EXCEEDED',
      'TEMPORARY_UNAVAILABLE'
    ];

    return retryableErrors.includes(errorCode);
  }

  /**
   * 🏗️ Enterprise Logging
   * @private
   */
  _logEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'expert-selection-course-starter',
      event: eventType,
      data,
      environment: process.env.NODE_ENV || 'development'
    };

    // Add persistent and console logging in a safe, non-blocking way
    try {
      // Push to a Redis list for centralized logs (best-effort)
      if (this.redis && typeof this.redis.lpush === 'function') {
        this.redis.lpush('logs:expert-selection', JSON.stringify(logEntry)).catch(() => {});
      }
    } catch (e) {
      // swallow any logging errors to avoid breaking matching flows
    }

    if (process.env.NODE_ENV !== 'production') {
      // Lightweight console debug for local/dev
      // eslint-disable-next-line no-console
      console.log('[expert-selection]', JSON.stringify(logEntry));
    }
  }

  // Minimal helper used elsewhere in the class
  _logSuccess(eventType, data) {
    this._logEvent(eventType, { ...data, level: 'success' });
  }

  _logError(eventType, error, meta = {}) {
    const payload = {
      message: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : undefined,
      meta
    };
    this._logEvent(eventType, { ...payload, level: 'error' });
  }
}

// Export the class
module.exports = ExpertSelectionCourseStarter;