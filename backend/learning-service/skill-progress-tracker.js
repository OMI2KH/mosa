// learning-service/skill-progress-tracker.js

/**
 * 📊 ENTERPRISE SKILL PROGRESS TRACKING SYSTEM
 * Real-time progress monitoring, analytics, and adaptive learning pathways
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../utils/logger');
const { AnalyticsEngine } = require('../utils/analytics-engine');
const { RecommendationEngine } = require('../utils/recommendation-engine');

class SkillProgressTracker extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('SkillProgressTracker');
    this.analyticsEngine = new AnalyticsEngine();
    this.recommendationEngine = new RecommendationEngine();

    // Progress configuration
    this.config = {
      updateInterval: 5000, // 5 seconds for real-time updates
      analyticsInterval: 60000, // 1 minute for analytics
      cacheTTL: 300, // 5 minutes
      batchSize: 50,
      retentionPeriod: 365, // days
      masteryThreshold: 0.8, // 80% for skill mastery
      completionThreshold: 0.7, // 70% for course completion
      streakBonus: 0.1 // 10% bonus for consistent progress
    };

    // Progress metrics weights
    this.weights = {
      EXERCISE_COMPLETION: 0.25,
      EXERCISE_ACCURACY: 0.35,
      TIME_SPENT: 0.15,
      CONSISTENCY: 0.15,
      ASSESSMENT_SCORE: 0.10
    };

    // Skill proficiency levels
    this.proficiencyLevels = {
      BEGINNER: { threshold: 0.0, label: 'Beginner', color: '#FF6B6B' },
      NOVICE: { threshold: 0.2, label: 'Novice', color: '#FFA726' },
      INTERMEDIATE: { threshold: 0.4, label: 'Intermediate', color: '#29B6F6' },
      ADVANCED: { threshold: 0.6, label: 'Advanced', color: '#66BB6A' },
      EXPERT: { threshold: 0.8, label: 'Expert', color: '#5C6BC0' },
      MASTER: { threshold: 0.9, label: 'Master', color: '#AB47BC' }
    };

    this.trackingQueue = new Map();
    this.initialize();
  }

  /**
   * 🚀 INITIALIZE PROGRESS TRACKER
   */
  async initialize() {
    try {
      await this.redis.ping();
      
      // Start real-time tracking
      this.startRealTimeTracking();
      
      // Start analytics processing
      this.startAnalyticsProcessing();
      
      // Warm up progress cache
      await this.warmUpProgressCache();
      
      this.logger.info('Skill progress tracker initialized successfully');
      this.emit('trackerReady');
      
    } catch (error) {
      this.logger.error('Failed to initialize progress tracker', error);
      throw error;
    }
  }

  /**
   * 📈 UPDATE SKILL PROGRESS - Core tracking method
   */
  async updateProgress(progressData) {
    const startTime = performance.now();
    
    try {
      // 🛡️ Validate progress data
      this.validateProgressData(progressData);

      // 🔍 Enhance with context
      const enhancedData = await this.enhanceProgressData(progressData);

      // 📊 Calculate progress metrics
      const progressMetrics = await this.calculateProgressMetrics(enhancedData);

      // 💾 Store progress update
      const progressRecord = await this.storeProgressUpdate(enhancedData, progressMetrics);

      // 🎯 Update real-time progress
      await this.updateRealTimeProgress(progressRecord);

      // 🔔 Check for milestones
      await this.checkMilestones(progressRecord);

      const processingTime = performance.now() - startTime;

      this.emit('progressUpdated', {
        studentId: progressData.studentId,
        skillId: progressData.skillId,
        progress: progressMetrics.overallProgress,
        metrics: progressMetrics,
        processingTime
      });

      return {
        success: true,
        progressId: progressRecord.id,
        overallProgress: progressMetrics.overallProgress,
        proficiencyLevel: progressMetrics.proficiencyLevel,
        nextMilestone: progressMetrics.nextMilestone
      };

    } catch (error) {
      this.logger.error('Progress update failed', error, {
        studentId: progressData.studentId,
        skillId: progressData.skillId
      });

      // Queue for retry
      await this.queueForRetry(progressData);
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE PROGRESS DATA
   */
  validateProgressData(progressData) {
    const requiredFields = ['studentId', 'skillId', 'activityType', 'timestamp'];
    
    for (const field of requiredFields) {
      if (!progressData[field]) {
        throw new Error(`MISSING_REQUIRED_FIELD: ${field}`);
      }
    }

    // Validate activity types
    const validActivityTypes = [
      'EXERCISE_COMPLETION',
      'EXERCISE_ATTEMPT',
      'ASSESSMENT_COMPLETION',
      'TIME_SPENT',
      'VIDEO_WATCHED',
      'RESOURCE_ACCESSED'
    ];

    if (!validActivityTypes.includes(progressData.activityType)) {
      throw new Error(`INVALID_ACTIVITY_TYPE: ${progressData.activityType}`);
    }

    // Validate progress values
    if (progressData.score !== undefined && (progressData.score < 0 || progressData.score > 1)) {
      throw new Error('INVALID_SCORE_RANGE');
    }

    if (progressData.timeSpent !== undefined && progressData.timeSpent < 0) {
      throw new Error('INVALID_TIME_SPENT');
    }

    // Validate timestamp
    const timestamp = new Date(progressData.timestamp);
    if (isNaN(timestamp.getTime())) {
      throw new Error('INVALID_TIMESTAMP');
    }

    // Prevent future-dated progress
    if (timestamp > new Date()) {
      throw new Error('FUTURE_DATED_PROGRESS');
    }
  }

  /**
   * 🔍 ENHANCE PROGRESS DATA
   */
  async enhanceProgressData(progressData) {
    const [studentContext, skillContext, learningContext] = await Promise.all([
      this.getStudentContext(progressData.studentId),
      this.getSkillContext(progressData.skillId),
      this.getLearningContext(progressData.studentId, progressData.skillId)
    ]);

    return {
      ...progressData,
      context: {
        student: studentContext,
        skill: skillContext,
        learning: learningContext,
        system: {
          version: process.env.APP_VERSION,
          environment: process.env.NODE_ENV,
          processedAt: new Date()
        }
      },
      metadata: {
        streak: await this.calculateCurrentStreak(progressData.studentId, progressData.skillId),
        weeklyActivity: await this.getWeeklyActivity(progressData.studentId, progressData.skillId),
        peerComparison: await this.getPeerComparison(progressData.studentId, progressData.skillId)
      }
    };
  }

  /**
   * 👤 GET STUDENT CONTEXT
   */
  async getStudentContext(studentId) {
    const cacheKey = `student:context:${studentId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        learningStyle: true,
        preferredDifficulty: true,
        timezone: true,
        createdAt: true
      }
    });

    if (!student) {
      throw new Error('STUDENT_NOT_FOUND');
    }

    const context = {
      ...student,
      activeEnrollments: await this.getActiveEnrollments(studentId),
      completedSkills: await this.getCompletedSkills(studentId),
      averageProgress: await this.getAverageProgress(studentId)
    };

    await this.redis.setex(cacheKey, 1800, JSON.stringify(context)); // 30 minutes
    return context;
  }

  /**
   * 🎯 GET SKILL CONTEXT
   */
  async getSkillContext(skillId) {
    const cacheKey = `skill:context:${skillId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        prerequisites: {
          include: { prerequisite: true }
        },
        learningObjectives: true,
        difficultyProfile: true
      }
    });

    if (!skill) {
      throw new Error('SKILL_NOT_FOUND');
    }

    const context = {
      ...skill,
      averageCompletionTime: await this.getAverageCompletionTime(skillId),
      successRate: await this.getSkillSuccessRate(skillId),
      popularResources: await this.getPopularResources(skillId)
    };

    await this.redis.setex(cacheKey, 3600, JSON.stringify(context)); // 1 hour
    return context;
  }

  /**
   * 📚 GET LEARNING CONTEXT
   */
  async getLearningContext(studentId, skillId) {
    return {
      currentEnrollment: await this.getCurrentEnrollment(studentId, skillId),
      progressHistory: await this.getProgressHistory(studentId, skillId),
      knowledgeGaps: await this.getKnowledgeGaps(studentId, skillId),
      recommendedNext: await this.getRecommendedNext(studentId, skillId),
      learningVelocity: await this.calculateLearningVelocity(studentId, skillId)
    };
  }

  /**
   * 📊 CALCULATE PROGRESS METRICS
   */
  async calculateProgressMetrics(enhancedData) {
    const {
      currentProgress,
      progressDelta,
      confidenceScore
    } = await this.calculateCurrentProgress(enhancedData);

    const proficiencyLevel = this.determineProficiencyLevel(currentProgress);
    const learningVelocity = await this.calculateLearningVelocity(
      enhancedData.studentId,
      enhancedData.skillId
    );

    const metrics = {
      overallProgress: currentProgress,
      progressDelta,
      confidenceScore,
      proficiencyLevel,
      learningVelocity,
      streakBonus: await this.calculateStreakBonus(enhancedData),
      consistencyScore: await this.calculateConsistencyScore(enhancedData),
      engagementScore: await this.calculateEngagementScore(enhancedData),
      knowledgeRetention: await this.calculateKnowledgeRetention(enhancedData),
      nextMilestone: this.getNextMilestone(currentProgress, proficiencyLevel)
    };

    // Calculate weighted overall progress
    metrics.weightedProgress = this.calculateWeightedProgress(metrics);

    return metrics;
  }

  /**
   * 🎯 CALCULATE CURRENT PROGRESS
   */
  async calculateCurrentProgress(enhancedData) {
    const {
      studentId,
      skillId,
      activityType,
      score,
      timeSpent
    } = enhancedData;

    // Get existing progress
    const existingProgress = await this.getCurrentProgress(studentId, skillId);
    
    // Calculate progress delta based on activity type
    let progressDelta = 0;
    let confidenceScore = 0.8; // Base confidence

    switch (activityType) {
      case 'EXERCISE_COMPLETION':
        progressDelta = await this.calculateExerciseProgress(enhancedData);
        confidenceScore += 0.1;
        break;

      case 'ASSESSMENT_COMPLETION':
        progressDelta = await this.calculateAssessmentProgress(enhancedData);
        confidenceScore += 0.15;
        break;

      case 'TIME_SPENT':
        progressDelta = await this.calculateTimeProgress(enhancedData);
        confidenceScore += 0.05;
        break;

      default:
        progressDelta = await this.calculateGenericProgress(enhancedData);
    }

    // Apply streak bonus
    const streakBonus = await this.calculateStreakBonus(enhancedData);
    progressDelta *= (1 + streakBonus);

    // Cap progress delta
    progressDelta = Math.min(progressDelta, 0.1); // Max 10% per activity

    // Calculate new progress
    const currentProgress = Math.min(1, existingProgress + progressDelta);

    return {
      currentProgress,
      progressDelta,
      confidenceScore: Math.min(1, confidenceScore)
    };
  }

  /**
   * 💪 CALCULATE EXERCISE PROGRESS
   */
  async calculateExerciseProgress(enhancedData) {
    const { score, difficulty, timeSpent, context } = enhancedData;

    let progress = 0;

    // Base progress from score
    if (score !== undefined) {
      progress += score * this.weights.EXERCISE_ACCURACY;
    }

    // Difficulty bonus
    if (difficulty) {
      const difficultyMultiplier = this.getDifficultyMultiplier(difficulty);
      progress *= difficultyMultiplier;
    }

    // Time efficiency bonus
    if (timeSpent) {
      const timeEfficiency = await this.calculateTimeEfficiency(
        enhancedData.studentId,
        enhancedData.skillId,
        timeSpent,
        difficulty
      );
      progress *= timeEfficiency;
    }

    // Learning style alignment bonus
    const styleAlignment = this.calculateLearningStyleAlignment(enhancedData);
    progress *= (1 + styleAlignment);

    return progress;
  }

  /**
   * 📝 CALCULATE ASSESSMENT PROGRESS
   */
  async calculateAssessmentProgress(enhancedData) {
    const { score, assessmentType, context } = enhancedData;

    let progress = 0;

    // Base progress from assessment score
    progress += (score || 0) * this.weights.ASSESSMENT_SCORE;

    // Assessment type multiplier
    const typeMultiplier = this.getAssessmentMultiplier(assessmentType);
    progress *= typeMultiplier;

    // Knowledge retention factor
    const retentionFactor = await this.calculateRetentionFactor(enhancedData);
    progress *= retentionFactor;

    return progress;
  }

  /**
   * ⏱️ CALCULATE TIME PROGRESS
   */
  async calculateTimeProgress(enhancedData) {
    const { timeSpent, activityType, context } = enhancedData;

    // Base progress from time spent (diminishing returns)
    const baseProgress = Math.min(timeSpent / 3600, 0.05); // Max 5% per hour

    // Engagement quality factor
    const engagementQuality = await this.calculateEngagementQuality(enhancedData);
    
    return baseProgress * engagementQuality * this.weights.TIME_SPENT;
  }

  /**
   * 🔄 CALCULATE GENERIC PROGRESS
   */
  async calculateGenericProgress(enhancedData) {
    // Default progress for other activity types
    return 0.01; // 1% base progress
  }

  /**
   * 🏆 DETERMINE PROFICIENCY LEVEL
   */
  determineProficiencyLevel(progress) {
    const levels = Object.entries(this.proficiencyLevels)
      .sort(([,a], [,b]) => b.threshold - a.threshold);

    for (const [level, config] of levels) {
      if (progress >= config.threshold) {
        return {
          level,
          label: config.label,
          color: config.color,
          threshold: config.threshold
        };
      }
    }

    return this.proficiencyLevels.BEGINNER;
  }

  /**
   * 🚀 CALCULATE LEARNING VELOCITY
   */
  async calculateLearningVelocity(studentId, skillId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const progressHistory = await this.prisma.skillProgress.findMany({
      where: {
        studentId,
        skillId,
        timestamp: { gte: thirtyDaysAgo }
      },
      orderBy: { timestamp: 'asc' },
      select: { overallProgress: true, timestamp: true }
    });

    if (progressHistory.length < 2) {
      return 0;
    }

    const firstProgress = progressHistory[0].overallProgress;
    const lastProgress = progressHistory[progressHistory.length - 1].overallProgress;
    const timeDiff = (progressHistory[progressHistory.length - 1].timestamp - progressHistory[0].timestamp) / (1000 * 60 * 60 * 24); // days

    const progressDiff = lastProgress - firstProgress;
    const velocity = progressDiff / timeDiff; // progress per day

    return Math.max(0, velocity);
  }

  /**
   * 🔥 CALCULATE STREAK BONUS
   */
  async calculateStreakBonus(enhancedData) {
    const { studentId, skillId } = enhancedData;
    const streak = await this.getCurrentStreak(studentId, skillId);
    
    // Diminishing returns for long streaks
    return Math.min(this.config.streakBonus, streak * 0.02);
  }

  /**
   * 📈 CALCULATE CONSISTENCY SCORE
   */
  async calculateConsistencyScore(enhancedData) {
    const { studentId, skillId } = enhancedData;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const activities = await this.prisma.learningActivity.count({
      where: {
        studentId,
        skillId,
        timestamp: { gte: sevenDaysAgo }
      }
    });

    // Ideal: 5 activities per week
    const idealActivities = 5;
    const consistency = Math.min(activities / idealActivities, 1);

    return consistency * this.weights.CONSISTENCY;
  }

  /**
   * 💡 CALCULATE ENGAGEMENT SCORE
   */
  async calculateEngagementScore(enhancedData) {
    const { studentId, skillId, activityType, timeSpent } = enhancedData;

    let engagement = 0;

    // Activity type engagement
    const activityEngagement = this.getActivityEngagement(activityType);
    engagement += activityEngagement;

    // Time-based engagement
    if (timeSpent) {
      const timeEngagement = Math.min(timeSpent / 1800, 1); // 30 minutes = max engagement
      engagement += timeEngagement * 0.5;
    }

    // Recent activity bonus
    const recentActivity = await this.getRecentActivity(studentId, skillId);
    engagement += recentActivity * 0.3;

    return Math.min(1, engagement);
  }

  /**
   * 🧠 CALCULATE KNOWLEDGE RETENTION
   */
  async calculateKnowledgeRetention(enhancedData) {
    const { studentId, skillId } = enhancedData;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const assessments = await this.prisma.learningActivity.findMany({
      where: {
        studentId,
        skillId,
        activityType: 'ASSESSMENT_COMPLETION',
        timestamp: { gte: thirtyDaysAgo }
      },
      select: { score: true, timestamp: true }
    });

    if (assessments.length < 2) {
      return 0.5; // Default retention
    }

    // Calculate score trend (positive trend = good retention)
    const sortedAssessments = assessments.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    const firstScore = sortedAssessments[0].score;
    const lastScore = sortedAssessments[sortedAssessments.length - 1].score;
    
    return Math.max(0, lastScore - firstScore);
  }

  /**
   * ⚖️ CALCULATE WEIGHTED PROGRESS
   */
  calculateWeightedProgress(metrics) {
    const weights = {
      overallProgress: 0.4,
      consistencyScore: 0.2,
      engagementScore: 0.2,
      knowledgeRetention: 0.1,
      learningVelocity: 0.1
    };

    let weightedProgress = 0;
    
    weightedProgress += metrics.overallProgress * weights.overallProgress;
    weightedProgress += metrics.consistencyScore * weights.consistencyScore;
    weightedProgress += metrics.engagementScore * weights.engagementScore;
    weightedProgress += metrics.knowledgeRetention * weights.knowledgeRetention;
    weightedProgress += metrics.learningVelocity * weights.learningVelocity;

    return Math.min(1, weightedProgress);
  }

  /**
   * 💾 STORE PROGRESS UPDATE
   */
  async storeProgressUpdate(enhancedData, progressMetrics) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create learning activity record
      const activity = await tx.learningActivity.create({
        data: {
          studentId: enhancedData.studentId,
          skillId: enhancedData.skillId,
          activityType: enhancedData.activityType,
          score: enhancedData.score,
          timeSpent: enhancedData.timeSpent,
          metadata: enhancedData.metadata,
          context: enhancedData.context,
          timestamp: new Date(enhancedData.timestamp)
        }
      });

      // 2. Update or create skill progress record
      const progressRecord = await tx.skillProgress.upsert({
        where: {
          studentId_skillId: {
            studentId: enhancedData.studentId,
            skillId: enhancedData.skillId
          }
        },
        update: {
          overallProgress: progressMetrics.weightedProgress,
          proficiencyLevel: progressMetrics.proficiencyLevel.level,
          learningVelocity: progressMetrics.learningVelocity,
          consistencyScore: progressMetrics.consistencyScore,
          engagementScore: progressMetrics.engagementScore,
          knowledgeRetention: progressMetrics.knowledgeRetention,
          lastActivityAt: new Date(),
          activityCount: { increment: 1 },
          totalTimeSpent: { increment: enhancedData.timeSpent || 0 },
          metrics: progressMetrics,
          updatedAt: new Date()
        },
        create: {
          studentId: enhancedData.studentId,
          skillId: enhancedData.skillId,
          overallProgress: progressMetrics.weightedProgress,
          proficiencyLevel: progressMetrics.proficiencyLevel.level,
          learningVelocity: progressMetrics.learningVelocity,
          consistencyScore: progressMetrics.consistencyScore,
          engagementScore: progressMetrics.engagementScore,
          knowledgeRetention: progressMetrics.knowledgeRetention,
          lastActivityAt: new Date(),
          activityCount: 1,
          totalTimeSpent: enhancedData.timeSpent || 0,
          metrics: progressMetrics,
          startedAt: new Date()
        }
      });

      // 3. Update progress history
      await tx.progressHistory.create({
        data: {
          studentId: enhancedData.studentId,
          skillId: enhancedData.skillId,
          overallProgress: progressMetrics.weightedProgress,
          proficiencyLevel: progressMetrics.proficiencyLevel.level,
          activityId: activity.id,
          metrics: progressMetrics,
          timestamp: new Date()
        }
      });

      return {
        ...progressRecord,
        activityId: activity.id
      };
    });
  }

  /**
   * 🔄 UPDATE REAL-TIME PROGRESS
   */
  async updateRealTimeProgress(progressRecord) {
    const pipeline = this.redis.pipeline();

    // Update student progress cache
    const studentKey = `progress:student:${progressRecord.studentId}:${progressRecord.skillId}`;
    pipeline.setex(studentKey, this.config.cacheTTL, JSON.stringify(progressRecord));

    // Update leaderboard
    const leaderboardKey = `leaderboard:skill:${progressRecord.skillId}`;
    pipeline.zadd(leaderboardKey, progressRecord.overallProgress, progressRecord.studentId);

    // Update class progress (if applicable)
    const classKey = `progress:class:${progressRecord.skillId}`;
    pipeline.hincrbyfloat(classKey, 'totalProgress', progressRecord.overallProgress);
    pipeline.hincrby(classKey, 'studentCount', 1);

    await pipeline.exec();
  }

  /**
   * 🎯 CHECK MILESTONES
   */
  async checkMilestones(progressRecord) {
    const milestones = await this.getSkillMilestones(progressRecord.skillId);
    const achievedMilestones = [];

    for (const milestone of milestones) {
      if (progressRecord.overallProgress >= milestone.threshold && 
          !(await this.isMilestoneAchieved(progressRecord.studentId, milestone.id))) {
        
        await this.recordMilestoneAchievement(progressRecord.studentId, milestone.id);
        achievedMilestones.push(milestone);

        this.emit('milestoneAchieved', {
          studentId: progressRecord.studentId,
          skillId: progressRecord.skillId,
          milestone,
          progress: progressRecord.overallProgress,
          timestamp: new Date()
        });
      }
    }

    // Check for skill mastery
    if (progressRecord.overallProgress >= this.config.masteryThreshold && 
        !(await this.isSkillMastered(progressRecord.studentId, progressRecord.skillId))) {
      
      await this.recordSkillMastery(progressRecord.studentId, progressRecord.skillId);
      
      this.emit('skillMastered', {
        studentId: progressRecord.studentId,
        skillId: progressRecord.skillId,
        progress: progressRecord.overallProgress,
        timestamp: new Date()
      });
    }

    return achievedMilestones;
  }

  /**
   * 📊 GET STUDENT PROGRESS OVERVIEW
   */
  async getStudentProgress(studentId, options = {}) {
    const cacheKey = `progress:overview:${studentId}:${JSON.stringify(options)}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const {
      includeDetails = false,
      timeframe = 'all',
      skillCategory = null
    } = options;

    const progressRecords = await this.prisma.skillProgress.findMany({
      where: {
        studentId,
        ...(skillCategory && {
          skill: { category: skillCategory }
        })
      },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            category: true,
            difficulty: true
          }
        }
      }
    });

    const overview = {
      studentId,
      generatedAt: new Date(),
      summary: await this.calculateProgressSummary(progressRecords),
      skills: progressRecords.map(record => ({
        skillId: record.skillId,
        skillName: record.skill.name,
        category: record.skill.category,
        progress: record.overallProgress,
        proficiency: record.proficiencyLevel,
        lastActivity: record.lastActivityAt,
        learningVelocity: record.learningVelocity,
        consistency: record.consistencyScore
      })),
      analytics: await this.calculateProgressAnalytics(studentId, progressRecords)
    };

    if (includeDetails) {
      overview.detailedMetrics = await this.getDetailedMetrics(studentId, progressRecords);
    }

    await this.redis.setex(cacheKey, 300, JSON.stringify(overview)); // 5 minutes
    return overview;
  }

  /**
   * 📈 CALCULATE PROGRESS SUMMARY
   */
  async calculateProgressSummary(progressRecords) {
    const totalSkills = progressRecords.length;
    const completedSkills = progressRecords.filter(r => 
      r.overallProgress >= this.config.completionThreshold
    ).length;
    
    const averageProgress = progressRecords.length > 0 
      ? progressRecords.reduce((sum, r) => sum + r.overallProgress, 0) / progressRecords.length
      : 0;

    const totalTimeSpent = progressRecords.reduce((sum, r) => sum + (r.totalTimeSpent || 0), 0);
    const totalActivities = progressRecords.reduce((sum, r) => sum + (r.activityCount || 0), 0);

    return {
      totalSkills,
      completedSkills,
      completionRate: totalSkills > 0 ? completedSkills / totalSkills : 0,
      averageProgress,
      totalTimeSpent,
      totalActivities,
      averageProficiency: this.calculateAverageProficiency(progressRecords)
    };
  }

  /**
   * 📊 CALCULATE PROGRESS ANALYTICS
   */
  async calculateProgressAnalytics(studentId, progressRecords) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recentActivities = await this.prisma.learningActivity.count({
      where: {
        studentId,
        timestamp: { gte: thirtyDaysAgo }
      }
    });

    const weeklyProgress = await this.calculateWeeklyProgress(studentId);
    const learningPatterns = await this.analyzeLearningPatterns(studentId);
    const recommendationReady = await this.isRecommendationReady(studentId);

    return {
      recentActivity: recentActivities,
      weeklyProgress,
      learningPatterns,
      recommendationReady,
      engagementLevel: this.calculateEngagementLevel(recentActivities),
      progressTrend: await this.analyzeProgressTrend(studentId)
    };
  }

  /**
   * 🔮 GET PROGRESS PREDICTIONS
   */
  async getProgressPredictions(studentId, skillId) {
    const cacheKey = `predictions:${studentId}:${skillId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const progressHistory = await this.prisma.progressHistory.findMany({
      where: {
        studentId,
        skillId,
        timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { timestamp: 'asc' },
      select: { overallProgress: true, timestamp: true }
    });

    const predictions = this.analyticsEngine.predictFutureProgress(progressHistory);

    const result = {
      studentId,
      skillId,
      predictions,
      confidence: this.calculatePredictionConfidence(progressHistory),
      recommendations: await this.generateProgressRecommendations(studentId, skillId, predictions)
    };

    await this.redis.setex(cacheKey, 1800, JSON.stringify(result)); // 30 minutes
    return result;
  }

  /**
   * 💡 GENERATE PROGRESS RECOMMENDATIONS
   */
  async generateProgressRecommendations(studentId, skillId, predictions) {
    const recommendations = [];

    const currentProgress = await this.getCurrentProgress(studentId, skillId);
    const learningVelocity = await this.calculateLearningVelocity(studentId, skillId);

    // Time-based recommendations
    if (learningVelocity < 0.01) {
      recommendations.push({
        type: 'INCREASE_FREQUENCY',
        priority: 'HIGH',
        message: 'Try to practice more regularly to maintain progress',
        action: 'Schedule daily practice sessions'
      });
    }

    // Progress-based recommendations
    if (currentProgress < 0.3) {
      recommendations.push({
        type: 'FOUNDATION_BUILDING',
        priority: 'MEDIUM',
        message: 'Focus on building strong foundational knowledge',
        action: 'Review basic concepts and exercises'
      });
    }

    // Engagement-based recommendations
    const engagement = await this.calculateEngagementScore({
      studentId,
      skillId,
      activityType: 'ANALYSIS',
      timestamp: new Date()
    });

    if (engagement < 0.5) {
      recommendations.push({
        type: 'INCREASE_ENGAGEMENT',
        priority: 'MEDIUM',
        message: 'Try different types of learning activities',
        action: 'Explore interactive exercises and projects'
      });
    }

    return recommendations;
  }

  /**
   * 🔄 REAL-TIME TRACKING
   */
  startRealTimeTracking() {
    setInterval(async () => {
      try {
        await this.processRealTimeUpdates();
      } catch (error) {
        this.logger.error('Real-time tracking error', error);
      }
    }, this.config.updateInterval);

    this.logger.info('Real-time progress tracking started');
  }

  /**
   * 📊 ANALYTICS PROCESSING
   */
  startAnalyticsProcessing() {
    setInterval(async () => {
      try {
        await this.processAnalytics();
      } catch (error) {
        this.logger.error('Analytics processing error', error);
      }
    }, this.config.analyticsInterval);

    this.logger.info('Analytics processing started');
  }

  /**
   * 🔧 UTILITY METHODS
   */

  /**
   * 📥 QUEUE FOR RETRY
   */
  async queueForRetry(progressData) {
    const queueKey = `progress:retry:${progressData.studentId}:${Date.now()}`;
    await this.redis.setex(queueKey, 3600, JSON.stringify(progressData)); // 1 hour
  }

  /**
   * 🔥 WARM UP PROGRESS CACHE
   */
  async warmUpProgressCache() {
    try {
      // Pre-load progress for active students
      const activeStudents = await this.prisma.student.findMany({
        where: { status: 'ACTIVE' },
        take: 100,
        select: { id: true }
      });

      for (const student of activeStudents) {
        try {
          await this.getStudentProgress(student.id);
        } catch (error) {
          // Skip if no progress data
        }
      }

      this.logger.info('Progress cache warmed up successfully');
    } catch (error) {
      this.logger.error('Failed to warm up progress cache', error);
    }
  }

  // Additional helper methods would be implemented here...
  // [Previous helper methods implementation continues...]

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      this.removeAllListeners();
      this.trackingQueue.clear();
      await this.redis.quit();
      await this.prisma.$disconnect();
      
      this.logger.info('Skill progress tracker resources cleaned up');
    } catch (error) {
      this.logger.error('Error during progress tracker cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new SkillProgressTracker();