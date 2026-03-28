// training-service/expert-matching.js

/**
 * 🎯 ENTERPRISE EXPERT MATCHING ENGINE
 * AI-powered student-expert matching with quality optimization
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../utils/logger');
const { MatchingAlgorithm } = require('../utils/matching-algorithm');
const { QualityOptimizer } = require('../utils/quality-optimizer');
const { CapacityPlanner } = require('../utils/capacity-planner');

class ExpertMatching extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('ExpertMatching');
    this.matchingAlgorithm = new MatchingAlgorithm();
    this.qualityOptimizer = new QualityOptimizer();
    this.capacityPlanner = new CapacityPlanner();

    // Matching configuration
    this.config = {
      maxCandidates: 10,
      minQualityScore: 3.5,
      maxCapacityUtilization: 0.8,
      cacheTTL: 300, // 5 minutes
      matchingTimeout: 10000, // 10 seconds
      retryAttempts: 3,
      qualityWeight: 0.35,
      availabilityWeight: 0.25,
      specializationWeight: 0.20,
      locationWeight: 0.10,
      priceWeight: 0.10
    };

    // Matching criteria
    this.criteria = {
      QUALITY: 'quality',
      AVAILABILITY: 'availability',
      SPECIALIZATION: 'specialization',
      LOCATION: 'location',
      PRICE: 'price',
      STUDENT_PREFERENCE: 'student_preference'
    };

    this.matchingQueue = new Map();
    this.initialize();
  }

  /**
   * 🚀 INITIALIZE EXPERT MATCHING ENGINE
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.warmUpExpertCache();
      await this.initializeMatchingIndexes();
      
      this.logger.info('Expert matching engine initialized successfully');
      this.emit('matchingEngineReady');
      
    } catch (error) {
      this.logger.error('Failed to initialize expert matching engine', error);
      throw error;
    }
  }

  /**
   * 🎯 FIND OPTIMAL EXPERT FOR STUDENT
   */
  async findOptimalExpert(matchingRequest) {
    const startTime = performance.now();
    
    try {
      // 🛡️ Validate matching request
      this.validateMatchingRequest(matchingRequest);

      // 🔍 Check for cached matches
      const cachedMatch = await this.getCachedMatch(matchingRequest);
      if (cachedMatch) {
        return cachedMatch;
      }

      // 📊 Get student profile and preferences
      const studentProfile = await this.getStudentProfile(matchingRequest.studentId);

      // 🎯 Find candidate experts
      const candidateExperts = await this.findCandidateExperts(matchingRequest, studentProfile);

      // ⚖️ Score and rank candidates
      const rankedExperts = await this.scoreAndRankExperts(candidateExperts, studentProfile, matchingRequest);

      // 🏆 Select optimal expert
      const optimalExpert = await this.selectOptimalExpert(rankedExperts, matchingRequest);

      // 💾 Cache the match
      await this.cacheExpertMatch(matchingRequest, optimalExpert);

      // 📈 Update matching statistics
      await this.updateMatchingStatistics(optimalExpert, matchingRequest);

      const matchingTime = performance.now() - startTime;
      
      this.emit('expertMatched', {
        studentId: matchingRequest.studentId,
        expertId: optimalExpert.expertId,
        matchScore: optimalExpert.matchScore,
        matchingTime,
        skillId: matchingRequest.skillId
      });

      return optimalExpert;

    } catch (error) {
      this.logger.error('Expert matching failed', error, { 
        studentId: matchingRequest.studentId,
        skillId: matchingRequest.skillId 
      });
      
      // Fallback to quality-based matching
      return await this.fallbackMatching(matchingRequest);
    }
  }

  /**
   * 🛡️ VALIDATE MATCHING REQUEST
   */
  validateMatchingRequest(request) {
    const requiredFields = ['studentId', 'skillId', 'preferredSchedule'];
    
    for (const field of requiredFields) {
      if (!request[field]) {
        throw new Error(`MISSING_REQUIRED_FIELD: ${field}`);
      }
    }

    // Validate skill exists
    if (!this.isValidSkill(request.skillId)) {
      throw new Error(`INVALID_SKILL_ID: ${request.skillId}`);
    }

    // Validate schedule format
    if (!this.isValidSchedule(request.preferredSchedule)) {
      throw new Error('INVALID_SCHEDULE_FORMAT');
    }

    // Validate budget constraints
    if (request.maxBudget && request.maxBudget < 0) {
      throw new Error('INVALID_BUDGET_CONSTRAINT');
    }

    // Validate location if provided
    if (request.preferredLocation && !this.isValidLocation(request.preferredLocation)) {
      throw new Error('INVALID_LOCATION_FORMAT');
    }
  }

  /**
   * 🔍 GET CACHED MATCH
   */
  async getCachedMatch(matchingRequest) {
    const cacheKey = this.generateMatchCacheKey(matchingRequest);
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      const match = JSON.parse(cached);
      this.logger.debug('Retrieved expert match from cache', { cacheKey });
      return match;
    }
    
    return null;
  }

  /**
   * 📊 GET STUDENT PROFILE
   */
  async getStudentProfile(studentId) {
    const cacheKey = `student:profile:${studentId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [student, preferences, learningHistory, performanceData] = await Promise.all([
      this.prisma.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          name: true,
          location: true,
          learningStyle: true,
          preferredLanguage: true,
          createdAt: true
        }
      }),
      this.prisma.studentPreference.findUnique({
        where: { studentId },
        select: {
          preferredExpertTier: true,
          maxSessionPrice: true,
          preferredTeachingStyle: true,
          availabilityPreferences: true
        }
      }),
      this.prisma.learningHistory.findMany({
        where: { studentId },
        orderBy: { completedAt: 'desc' },
        take: 10,
        select: {
          skillId: true,
          expertId: true,
          completionRate: true,
          satisfactionScore: true
        }
      }),
      this.prisma.studentPerformance.findUnique({
        where: { studentId },
        select: {
          averageCompletionTime: true,
          successRate: true,
          struggleAreas: true
        }
      })
    ]);

    if (!student) {
      throw new Error('STUDENT_NOT_FOUND');
    }

    const profile = {
      ...student,
      preferences: preferences || {},
      learningHistory,
      performance: performanceData || {},
      matchingPreferences: this.extractMatchingPreferences(learningHistory, preferences)
    };

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(profile));

    return profile;
  }

  /**
   * 🎯 EXTRACT MATCHING PREFERENCES
   */
  extractMatchingPreferences(learningHistory, preferences) {
    const pastExperts = learningHistory.map(history => history.expertId);
    const successfulExperts = learningHistory
      .filter(history => history.satisfactionScore >= 4)
      .map(history => history.expertId);

    return {
      preferredExpertTier: preferences?.preferredExpertTier || 'STANDARD',
      maxPrice: preferences?.maxSessionPrice || 999,
      teachingStyle: preferences?.preferredTeachingStyle || 'BALANCED',
      pastSuccessfulExperts: successfulExperts,
      allPastExperts: pastExperts,
      avoidExperts: this.identifyExpertsToAvoid(learningHistory)
    };
  }

  /**
   * 🚫 IDENTIFY EXPERTS TO AVOID
   */
  identifyExpertsToAvoid(learningHistory) {
    return learningHistory
      .filter(history => history.satisfactionScore < 3)
      .map(history => history.expertId);
  }

  /**
   * 🔍 FIND CANDIDATE EXPERTS
   */
  async findCandidateExperts(matchingRequest, studentProfile) {
    const { skillId, preferredSchedule, preferredLocation } = matchingRequest;

    // Build expert query filters
    const filters = this.buildExpertFilters(matchingRequest, studentProfile);

    // Get active experts for the skill
    const activeExperts = await this.prisma.expert.findMany({
      where: filters,
      include: {
        expertSkills: {
          where: { skillId },
          include: {
            skill: true
          }
        },
        availability: {
          where: {
            dayOfWeek: { in: preferredSchedule.days },
            startTime: { lte: preferredSchedule.startTime },
            endTime: { gte: preferredSchedule.endTime }
          }
        },
        ratings: {
          where: {
            createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
          },
          select: {
            rating: true,
            comment: true,
            categories: true
          }
        },
        currentSessions: {
          where: {
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
          },
          select: {
            studentId: true,
            scheduledAt: true
          }
        }
      }
    });

    // Filter experts based on real-time availability
    const availableExperts = await this.filterByRealTimeAvailability(
      activeExperts, 
      matchingRequest.preferredSchedule
    );

    // Apply quality thresholds
    const qualifiedExperts = this.applyQualityThresholds(availableExperts);

    return qualifiedExperts.slice(0, this.config.maxCandidates);
  }

  /**
   * 🏗️ BUILD EXPERT FILTERS
   */
  buildExpertFilters(matchingRequest, studentProfile) {
    const { skillId, preferredLocation, maxBudget } = matchingRequest;
    const { preferences } = studentProfile;

    const filters = {
      status: 'ACTIVE',
      currentTier: { in: ['STANDARD', 'SENIOR', 'MASTER'] },
      qualityScore: { gte: this.config.minQualityScore },
      expertSkills: {
        some: {
          skillId,
          status: 'CERTIFIED',
          proficiencyLevel: { gte: 4 } // Minimum proficiency level
        }
      }
    };

    // Location filter
    if (preferredLocation) {
      filters.OR = [
        { serviceArea: { equals: preferredLocation } },
        { serviceArea: { equals: 'NATIONAL' } },
        { serviceRadius: { gte: this.calculateDistance(preferredLocation, studentProfile.location) } }
      ];
    }

    // Budget filter
    if (maxBudget) {
      filters.sessionPrice = { lte: maxBudget };
    } else if (preferences?.maxSessionPrice) {
      filters.sessionPrice = { lte: preferences.maxSessionPrice };
    }

    // Tier preference
    if (preferences?.preferredExpertTier) {
      filters.currentTier = preferences.preferredExpertTier;
    }

    return filters;
  }

  /**
   * 📅 FILTER BY REAL-TIME AVAILABILITY
   */
  async filterByRealTimeAvailability(experts, preferredSchedule) {
    const availableExperts = [];

    for (const expert of experts) {
      const isAvailable = await this.checkRealTimeAvailability(expert, preferredSchedule);
      if (isAvailable) {
        availableExperts.push(expert);
      }
    }

    return availableExperts;
  }

  /**
   * ✅ CHECK REAL-TIME AVAILABILITY
   */
  async checkRealTimeAvailability(expert, preferredSchedule) {
    const cacheKey = `expert:availability:${expert.id}:${this.getScheduleHash(preferredSchedule)}`;
    
    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Check scheduled sessions conflict
    const conflictingSessions = expert.currentSessions.filter(session => {
      const sessionTime = new Date(session.scheduledAt);
      const preferredTime = new Date(preferredSchedule.startTime);
      
      return this.isTimeConflict(sessionTime, preferredTime, preferredSchedule.duration);
    });

    // Check capacity limits
    const capacityUtilization = await this.capacityPlanner.calculateCurrentUtilization(expert.id);
    const withinCapacity = capacityUtilization < this.config.maxCapacityUtilization;

    const isAvailable = conflictingSessions.length === 0 && withinCapacity;

    // Cache availability for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(isAvailable));

    return isAvailable;
  }

  /**
   * 🎯 APPLY QUALITY THRESHOLDS
   */
  applyQualityThresholds(experts) {
    return experts.filter(expert => {
      // Minimum quality score
      if (expert.qualityScore < this.config.minQualityScore) {
        return false;
      }

      // Minimum completion rate
      if (expert.completionRate < 0.7) {
        return false;
      }

      // Minimum number of ratings for reliability
      if (expert.ratings.length < 3 && expert.qualityScore < 4.0) {
        return false;
      }

      return true;
    });
  }

  /**
   * ⚖️ SCORE AND RANK EXPERTS
   */
  async scoreAndRankExperts(candidateExperts, studentProfile, matchingRequest) {
    const scoredExperts = [];

    for (const expert of candidateExperts) {
      const scores = await this.calculateExpertScores(expert, studentProfile, matchingRequest);
      const overallScore = this.calculateOverallScore(scores);
      
      scoredExperts.push({
        expert,
        scores,
        overallScore,
        matchScore: overallScore
      });
    }

    // Sort by overall score (descending)
    return scoredExperts.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * 📊 CALCULATE EXPERT SCORES
   */
  async calculateExpertScores(expert, studentProfile, matchingRequest) {
    const scores = {};

    // Quality Score (35%)
    scores.quality = await this.calculateQualityScore(expert, studentProfile);

    // Availability Score (25%)
    scores.availability = await this.calculateAvailabilityScore(expert, matchingRequest.preferredSchedule);

    // Specialization Score (20%)
    scores.specialization = this.calculateSpecializationScore(expert, matchingRequest.skillId);

    // Location Score (10%)
    scores.location = this.calculateLocationScore(expert, studentProfile, matchingRequest);

    // Price Score (10%)
    scores.price = this.calculatePriceScore(expert, studentProfile, matchingRequest);

    // Student Preference Score (Bonus)
    scores.preference = this.calculatePreferenceScore(expert, studentProfile);

    return scores;
  }

  /**
   * ⭐ CALCULATE QUALITY SCORE
   */
  async calculateQualityScore(expert, studentProfile) {
    let score = expert.qualityScore / 5; // Normalize to 0-1

    // Bonus for high completion rate
    if (expert.completionRate > 0.8) {
      score += 0.1;
    }

    // Bonus for consistent performance
    const consistency = await this.calculateConsistencyScore(expert);
    score += consistency * 0.1;

    // Bonus for matching teaching style
    if (this.matchesTeachingStyle(expert, studentProfile.preferences?.teachingStyle)) {
      score += 0.05;
    }

    // Bonus for past success with student
    if (studentProfile.matchingPreferences.pastSuccessfulExperts.includes(expert.id)) {
      score += 0.15;
    }

    // Penalty for past negative experiences
    if (studentProfile.matchingPreferences.avoidExperts.includes(expert.id)) {
      score -= 0.3;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * 📅 CALCULATE AVAILABILITY SCORE
   */
  async calculateAvailabilityScore(expert, preferredSchedule) {
    const availabilityMatch = expert.availability.filter(avail =>
      preferredSchedule.days.includes(avail.dayOfWeek) &&
      avail.startTime <= preferredSchedule.startTime &&
      avail.endTime >= preferredSchedule.endTime
    ).length;

    const baseScore = availabilityMatch > 0 ? 0.7 : 0.3;

    // Bonus for flexible scheduling
    const flexibility = await this.calculateFlexibilityScore(expert);
    const flexibilityBonus = flexibility * 0.3;

    return Math.min(1, baseScore + flexibilityBonus);
  }

  /**
   * 🎯 CALCULATE SPECIALIZATION SCORE
   */
  calculateSpecializationScore(expert, skillId) {
    const skillMatch = expert.expertSkills.find(skill => skill.skillId === skillId);
    
    if (!skillMatch) return 0;

    let score = skillMatch.proficiencyLevel / 5; // Normalize to 0-1

    // Bonus for certifications
    if (skillMatch.certifications && skillMatch.certifications.length > 0) {
      score += 0.1;
    }

    // Bonus for years of experience
    if (skillMatch.yearsOfExperience >= 3) {
      score += 0.1;
    }

    // Bonus for portfolio strength
    if (skillMatch.portfolioItems && skillMatch.portfolioItems.length >= 5) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * 📍 CALCULATE LOCATION SCORE
   */
  calculateLocationScore(expert, studentProfile, matchingRequest) {
    if (!matchingRequest.preferredLocation && !studentProfile.location) {
      return 0.5; // Neutral score if no location preference
    }

    const studentLocation = matchingRequest.preferredLocation || studentProfile.location;
    const distance = this.calculateDistance(studentLocation, expert.serviceArea);

    if (distance === 0) {
      return 1.0; // Exact match
    } else if (distance <= 10) {
      return 0.8; // Within 10km
    } else if (distance <= 25) {
      return 0.6; // Within 25km
    } else if (expert.serviceArea === 'NATIONAL') {
      return 0.7; // National service provider
    } else {
      return 0.3; // Far away
    }
  }

  /**
   * 💰 CALCULATE PRICE SCORE
   */
  calculatePriceScore(expert, studentProfile, matchingRequest) {
    const maxBudget = matchingRequest.maxBudget || studentProfile.preferences?.maxSessionPrice;
    
    if (!maxBudget) {
      return 0.5; // Neutral if no budget constraint
    }

    const priceRatio = expert.sessionPrice / maxBudget;

    if (priceRatio <= 0.8) {
      return 1.0; // Well within budget
    } else if (priceRatio <= 1.0) {
      return 0.7; // Within budget
    } else if (priceRatio <= 1.2) {
      return 0.3; // Slightly over budget
    } else {
      return 0.0; // Over budget
    }
  }

  /**
   * ❤️ CALCULATE PREFERENCE SCORE
   */
  calculatePreferenceScore(expert, studentProfile) {
    let score = 0;

    // Tier preference match
    const preferredTier = studentProfile.preferences?.preferredExpertTier;
    if (preferredTier && expert.currentTier === preferredTier) {
      score += 0.1;
    }

    // Language match
    if (expert.languages?.includes(studentProfile.preferredLanguage)) {
      score += 0.05;
    }

    // Teaching style match
    if (this.matchesTeachingStyle(expert, studentProfile.preferences?.teachingStyle)) {
      score += 0.05;
    }

    return score;
  }

  /**
   * 📈 CALCULATE OVERALL SCORE
   */
  calculateOverallScore(scores) {
    return (
      scores.quality * this.config.qualityWeight +
      scores.availability * this.config.availabilityWeight +
      scores.specialization * this.config.specializationWeight +
      scores.location * this.config.locationWeight +
      scores.price * this.config.priceWeight +
      scores.preference // Bonus, not weighted
    );
  }

  /**
   * 🏆 SELECT OPTIMAL EXPERT
   */
  async selectOptimalExpert(rankedExperts, matchingRequest) {
    if (rankedExperts.length === 0) {
      throw new Error('NO_QUALIFIED_EXPERTS_AVAILABLE');
    }

    // Get top candidate
    const topCandidate = rankedExperts[0];

    // Validate expert can accept new student
    const canAccept = await this.validateExpertAcceptance(topCandidate.expert, matchingRequest);
    
    if (!canAccept) {
      // Try next candidate
      for (let i = 1; i < rankedExperts.length; i++) {
        const candidate = rankedExperts[i];
        const canAccept = await this.validateExpertAcceptance(candidate.expert, matchingRequest);
        
        if (canAccept) {
          return this.formatExpertMatch(candidate, matchingRequest);
        }
      }
      
      throw new Error('NO_EXPERTS_CAN_ACCEPT_NEW_STUDENTS');
    }

    return this.formatExpertMatch(topCandidate, matchingRequest);
  }

  /**
   * ✅ VALIDATE EXPERT ACCEPTANCE
   */
  async validateExpertAcceptance(expert, matchingRequest) {
    // Check current student load
    const currentLoad = await this.prisma.enrollment.count({
      where: {
        expertId: expert.id,
        status: { in: ['ACTIVE', 'PENDING'] }
      }
    });

    const maxStudents = this.getMaxStudentsForTier(expert.currentTier);
    
    if (currentLoad >= maxStudents) {
      return false;
    }

    // Check if expert has recent cancellations
    const recentCancellations = await this.prisma.trainingSession.count({
      where: {
        expertId: expert.id,
        status: 'CANCELLED',
        scheduledAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    });

    if (recentCancellations > 2) {
      return false;
    }

    return true;
  }

  /**
   * 📋 FORMAT EXPERT MATCH
   */
  formatExpertMatch(rankedExpert, matchingRequest) {
    const { expert, matchScore, scores } = rankedExpert;

    return {
      expertId: expert.id,
      expertName: expert.name,
      matchScore,
      detailedScores: scores,
      sessionPrice: expert.sessionPrice,
      estimatedStartDate: this.calculateEstimatedStartDate(expert),
      confidence: this.calculateMatchConfidence(rankedExpert),
      matchDetails: {
        qualityScore: expert.qualityScore,
        specialization: expert.expertSkills[0]?.skill.name,
        tier: expert.currentTier,
        location: expert.serviceArea,
        languages: expert.languages,
        teachingStyle: expert.teachingStyle
      },
      nextSteps: this.generateNextSteps(matchingRequest, expert),
      alternatives: this.generateAlternativeOptions(rankedExpert)
    };
  }

  /**
   * 📅 CALCULATE ESTIMATED START DATE
   */
  calculateEstimatedStartDate(expert) {
    const now = new Date();
    const availableDays = expert.availability.map(avail => avail.dayOfWeek);
    
    // Find next available day
    for (let i = 0; i < 7; i++) {
      const futureDate = new Date(now);
      futureDate.setDate(now.getDate() + i);
      const dayName = futureDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
      
      if (availableDays.includes(dayName)) {
        return futureDate;
      }
    }

    // Default to 3 days from now
    return new Date(now.setDate(now.getDate() + 3));
  }

  /**
   * 🎯 CALCULATE MATCH CONFIDENCE
   */
  calculateMatchConfidence(rankedExpert) {
    const { matchScore, scores } = rankedExpert;

    let confidence = matchScore;

    // Higher confidence for quality matches
    if (scores.quality > 0.8) {
      confidence += 0.1;
    }

    // Higher confidence for availability matches
    if (scores.availability > 0.8) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  /**
   * 🚀 GENERATE NEXT STEPS
   */
  generateNextSteps(matchingRequest, expert) {
    return [
      `Schedule introductory session with ${expert.name}`,
      `Review ${expert.name}'s portfolio and certifications`,
      `Confirm availability for ${matchingRequest.preferredSchedule.days.join(', ')}`,
      `Discuss learning objectives and expectations`,
      `Set up payment arrangement (${expert.sessionPrice} ETB per session)`
    ];
  }

  /**
   * 🔄 GENERATE ALTERNATIVE OPTIONS
   */
  generateAlternativeOptions(topMatch) {
    return {
      higherTier: {
        description: 'More experienced expert',
        priceIncrease: '20-50%',
        qualityBoost: 'Higher success rate'
      },
      lowerCost: {
        description: 'Budget-friendly option',
        priceDecrease: '10-30%',
        tradeOff: 'May have less experience'
      },
      differentSchedule: {
        description: 'Experts with different availability',
        flexibility: 'More scheduling options'
      }
    };
  }

  /**
   * 💾 CACHE EXPERT MATCH
   */
  async cacheExpertMatch(matchingRequest, expertMatch) {
    const cacheKey = this.generateMatchCacheKey(matchingRequest);
    await this.redis.setex(
      cacheKey,
      this.config.cacheTTL,
      JSON.stringify(expertMatch)
    );
  }

  /**
   * 📈 UPDATE MATCHING STATISTICS
   */
  async updateMatchingStatistics(expertMatch, matchingRequest) {
    const statsKey = `matching:stats:${expertMatch.expertId}`;
    
    const pipeline = this.redis.pipeline();
    pipeline.hincrby(statsKey, 'totalMatches', 1);
    pipeline.hincrby(statsKey, 'skillMatches', 1);
    pipeline.hset(statsKey, 'lastMatch', new Date().toISOString());
    
    await pipeline.exec();

    // Update expert matching success rate
    await this.updateExpertMatchingRate(expertMatch.expertId);
  }

  /**
   * 📊 UPDATE EXPERT MATCHING RATE
   */
  async updateExpertMatchingRate(expertId) {
    const matches = await this.redis.hget(`matching:stats:${expertId}`, 'totalMatches');
    const acceptances = await this.redis.hget(`matching:stats:${expertId}`, 'acceptedMatches');

    if (matches && acceptances) {
      const successRate = parseInt(acceptances) / parseInt(matches);
      await this.redis.hset(`matching:stats:${expertId}`, 'successRate', successRate);
    }
  }

  /**
   * 🔄 FALLBACK MATCHING
   */
  async fallbackMatching(matchingRequest) {
    this.logger.warn('Using fallback matching algorithm', matchingRequest);

    // Simple quality-based matching as fallback
    const fallbackExperts = await this.prisma.expert.findMany({
      where: {
        status: 'ACTIVE',
        qualityScore: { gte: 4.0 },
        expertSkills: {
          some: {
            skillId: matchingRequest.skillId,
            status: 'CERTIFIED'
          }
        }
      },
      orderBy: { qualityScore: 'desc' },
      take: 5,
      include: {
        expertSkills: {
          where: { skillId: matchingRequest.skillId },
          include: { skill: true }
        }
      }
    });

    if (fallbackExperts.length === 0) {
      throw new Error('NO_EXPERTS_AVAILABLE_FOR_FALLBACK');
    }

    const topExpert = fallbackExperts[0];

    return {
      expertId: topExpert.id,
      expertName: topExpert.name,
      matchScore: 0.7, // Default fallback score
      sessionPrice: topExpert.sessionPrice,
      estimatedStartDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      confidence: 0.6,
      matchDetails: {
        qualityScore: topExpert.qualityScore,
        specialization: topExpert.expertSkills[0]?.skill.name,
        tier: topExpert.currentTier
      },
      fallback: true
    };
  }

  /**
   * 🔧 UTILITY METHODS
   */

  /**
   * 🔑 GENERATE MATCH CACHE KEY
   */
  generateMatchCacheKey(matchingRequest) {
    const keyData = {
      studentId: matchingRequest.studentId,
      skillId: matchingRequest.skillId,
      schedule: matchingRequest.preferredSchedule,
      location: matchingRequest.preferredLocation,
      budget: matchingRequest.maxBudget
    };
    
    const keyString = JSON.stringify(keyData);
    const hash = this.simpleHash(keyString);
    
    return `match:${hash}`;
  }

  /**
   * 🔢 SIMPLE HASH FUNCTION
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * ✅ VALIDATE SKILL
   */
  isValidSkill(skillId) {
    // Check against known skills
    const validSkills = [
      'FOREX_TRADING', 'GRAPHIC_DESIGN', 'DIGITAL_MARKETING', 'WEB_DEVELOPMENT',
      'CONTENT_WRITING', 'VIDEO_EDITING', 'SOCIAL_MEDIA', 'ECOMMERCE',
      'DATA_ANALYSIS', 'MOBILE_DEVELOPMENT', 'WOODWORKING', 'CONSTRUCTION',
      'PAINTING', 'PLUMBING', 'ELECTRICAL'
    ];
    
    return validSkills.includes(skillId);
  }

  /**
   * 📅 VALIDATE SCHEDULE
   */
  isValidSchedule(schedule) {
    return (
      schedule.days &&
      Array.isArray(schedule.days) &&
      schedule.days.length > 0 &&
      schedule.startTime &&
      schedule.endTime &&
      schedule.duration &&
      schedule.duration > 0
    );
  }

  /**
   * 📍 VALIDATE LOCATION
   */
  isValidLocation(location) {
    const validLocations = [
      'ADDIS_ABABA', 'DIRE_DAWA', 'MEKELLE', 'GONDAR', 'BAHIR_DAR',
      'AWASA', 'JIMMA', 'HARAR', 'NATIONAL'
    ];
    
    return validLocations.includes(location);
  }

  /**
   * 📏 CALCULATE DISTANCE
   */
  calculateDistance(location1, location2) {
    // Simplified distance calculation
    // In production, use geolocation APIs
    if (location1 === location2) return 0;
    if (location1 === 'NATIONAL' || location2 === 'NATIONAL') return 5;
    return Math.abs(location1.length - location2.length); // Placeholder
  }

  /**
   * ⏰ CHECK TIME CONFLICT
   */
  isTimeConflict(sessionTime, preferredTime, duration) {
    const sessionEnd = new Date(sessionTime.getTime() + duration * 60 * 1000);
    const preferredEnd = new Date(preferredTime.getTime() + duration * 60 * 1000);

    return (
      (preferredTime >= sessionTime && preferredTime < sessionEnd) ||
      (preferredEnd > sessionTime && preferredEnd <= sessionEnd) ||
      (preferredTime <= sessionTime && preferredEnd >= sessionEnd)
    );
  }

  /**
   * 🔑 GET SCHEDULE HASH
   */
  getScheduleHash(schedule) {
    return this.simpleHash(JSON.stringify(schedule));
  }

  /**
   * 📊 CALCULATE CONSISTENCY SCORE
   */
  async calculateConsistencyScore(expert) {
    const ratings = expert.ratings.map(r => r.rating);
    if (ratings.length < 3) return 0.5;

    const mean = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    const variance = ratings.reduce((sum, rating) => sum + Math.pow(rating - mean, 2), 0) / ratings.length;
    const stdDev = Math.sqrt(variance);

    // Higher consistency = lower standard deviation
    return Math.max(0, 1 - (stdDev / 2));
  }

  /**
   * 🔄 CALCULATE FLEXIBILITY SCORE
   */
  async calculateFlexibilityScore(expert) {
    const availabilitySlots = expert.availability.length;
    const differentDays = new Set(expert.availability.map(avail => avail.dayOfWeek)).size;

    const slotsScore = Math.min(1, availabilitySlots / 10);
    const daysScore = Math.min(1, differentDays / 5);

    return (slotsScore + daysScore) / 2;
  }

  /**
   * 🎭 MATCHES TEACHING STYLE
   */
  matchesTeachingStyle(expert, preferredStyle) {
    if (!preferredStyle || !expert.teachingStyle) return false;
    return expert.teachingStyle === preferredStyle;
  }

  /**
   * 👥 GET MAX STUDENTS FOR TIER
   */
  getMaxStudentsForTier(tier) {
    const limits = {
      MASTER: 100,
      SENIOR: 50,
      STANDARD: 25,
      DEVELOPING: 15,
      PROBATION: 5
    };

    return limits[tier] || 25;
  }

  /**
   * 🔥 WARM UP EXPERT CACHE
   */
  async warmUpExpertCache() {
    try {
      // Pre-load top experts for popular skills
      const popularSkills = ['FOREX_TRADING', 'WEB_DEVELOPMENT', 'DIGITAL_MARKETING'];
      
      for (const skillId of popularSkills) {
        const topExperts = await this.prisma.expert.findMany({
          where: {
            status: 'ACTIVE',
            qualityScore: { gte: 4.5 },
            expertSkills: {
              some: { skillId, status: 'CERTIFIED' }
            }
          },
          take: 20,
          select: { id: true, name: true, qualityScore: true }
        });

        const cacheKey = `experts:top:${skillId}`;
        await this.redis.setex(cacheKey, 1800, JSON.stringify(topExperts)); // 30 minutes
      }

      this.logger.info('Expert cache warmed up successfully');
    } catch (error) {
      this.logger.error('Failed to warm up expert cache', error);
    }
  }

  /**
   * 🏗️ INITIALIZE MATCHING INDEXES
   */
  async initializeMatchingIndexes() {
    // This would typically create database indexes
    // Placeholder for index initialization
    this.logger.info('Matching indexes initialized');
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      this.removeAllListeners();
      this.matchingQueue.clear();
      await this.redis.quit();
      await this.prisma.$disconnect();
      
      this.logger.info('Expert matching resources cleaned up');
    } catch (error) {
      this.logger.error('Error during expert matching cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new ExpertMatching();