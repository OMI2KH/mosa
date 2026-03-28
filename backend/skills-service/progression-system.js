// skills-service/progression-system.js

/**
 * 🎯 ENTERPRISE SKILL PROGRESSION SYSTEM
 * Advanced progression tracking, milestone management, and learning path optimization
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

class ProgressionSystem extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('ProgressionSystem');
    this.analyticsEngine = new AnalyticsEngine();
    this.recommendationEngine = new RecommendationEngine();

    // Progression configuration
    this.progressionConfig = {
      LEVELS: {
        BEGINNER: { threshold: 0, xpRequired: 0, title: 'Beginner' },
        NOVICE: { threshold: 25, xpRequired: 1000, title: 'Novice' },
        INTERMEDIATE: { threshold: 50, xpRequired: 2500, title: 'Intermediate' },
        ADVANCED: { threshold: 75, xpRequired: 5000, title: 'Advanced' },
        EXPERT: { threshold: 90, xpRequired: 10000, title: 'Expert' },
        MASTER: { threshold: 95, xpRequired: 20000, title: 'Master' }
      },
      MILESTONES: [10, 25, 50, 75, 90, 100], // Percentage milestones
      DAILY_XP_CAP: 500,
      WEEKLY_XP_CAP: 2500,
      SKILL_DECAY_RATE: 0.01, // 1% skill decay per week of inactivity
      MINIMUM_ACTIVITY: 2 // Minimum sessions per week to avoid decay
    };

    // XP rewards configuration
    this.xpRewards = {
      SESSION_COMPLETION: 100,
      ASSESSMENT_PASS: 50,
      ASSESSMENT_PERFECT: 100,
      PROJECT_SUBMISSION: 150,
      PROJECT_APPROVAL: 200,
      DAILY_STREAK: 25,
      WEEKLY_GOAL: 100,
      MILESTONE_REACHED: 500,
      LEVEL_UP: 1000,
      PEER_HELP: 50,
      COMMUNITY_CONTRIBUTION: 75
    };

    // Learning path configurations
    this.learningPaths = {
      STANDARD: {
        name: 'Standard Path',
        description: 'Balanced learning with theory and practice',
        focus: 'balanced',
        intensity: 'medium',
        duration: '8 weeks'
      },
      ACCELERATED: {
        name: 'Accelerated Path',
        description: 'Fast-track learning for experienced learners',
        focus: 'practical',
        intensity: 'high',
        duration: '4 weeks'
      },
      FOUNDATIONAL: {
        name: 'Foundational Path',
        description: 'Comprehensive learning with strong foundations',
        focus: 'theory',
        intensity: 'low',
        duration: '12 weeks'
      },
      PROJECT_FOCUSED: {
        name: 'Project-Focused Path',
        description: 'Learn by doing with real-world projects',
        focus: 'projects',
        intensity: 'medium',
        duration: '10 weeks'
      }
    };

    this.progressionQueue = new Map();
    this.initialize();
  }

  /**
   * 🚀 INITIALIZE PROGRESSION SYSTEM
   */
  async initialize() {
    try {
      await this.redis.ping();
      
      // Start progression processors
      this.startProgressionProcessor();
      this.startDecayMonitor();
      this.startAchievementProcessor();
      
      // Warm up progression cache
      await this.warmUpProgressionCache();
      
      this.logger.info('Progression system initialized successfully');
      this.emit('progressionReady');
      
    } catch (error) {
      this.logger.error('Failed to initialize progression system', error);
      throw error;
    }
  }

  /**
   * 📈 UPDATE SKILL PROGRESSION
   */
  async updateProgression(progressionData) {
    const startTime = performance.now();
    
    try {
      // 🛡️ Validate progression data
      await this.validateProgressionData(progressionData);

      // 🔍 Get current progression state
      const currentState = await this.getCurrentProgression(
        progressionData.studentId,
        progressionData.skillId
      );

      // 🎯 Calculate new progression
      const updatedProgression = await this.calculateProgressionUpdate(
        currentState,
        progressionData
      );

      // 💾 Update progression record
      const progressionRecord = await this.updateProgressionRecord(updatedProgression);

      // 🏆 Check for achievements and milestones
      const achievements = await this.checkAchievements(progressionRecord);

      // 📊 Update analytics
      await this.updateProgressionAnalytics(progressionRecord);

      // 🎪 Emit progression events
      this.emitProgressionEvents(progressionRecord, achievements);

      const processingTime = performance.now() - startTime;

      return {
        success: true,
        progressionId: progressionRecord.id,
        newLevel: progressionRecord.currentLevel,
        progressPercentage: progressionRecord.progressPercentage,
        xpGained: progressionData.xpEarned || 0,
        achievementsUnlocked: achievements.length,
        processingTime
      };

    } catch (error) {
      this.logger.error('Progression update failed', error, progressionData);
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE PROGRESSION DATA
   */
  async validateProgressionData(progressionData) {
    const requiredFields = ['studentId', 'skillId', 'activityType'];
    
    for (const field of requiredFields) {
      if (!progressionData[field]) {
        throw new Error(`MISSING_REQUIRED_FIELD: ${field}`);
      }
    }

    // Validate activity type
    const validActivities = [
      'SESSION_COMPLETION', 'ASSESSMENT_PASS', 'ASSESSMENT_PERFECT',
      'PROJECT_SUBMISSION', 'PROJECT_APPROVAL', 'DAILY_STREAK',
      'WEEKLY_GOAL', 'MILESTONE_REACHED', 'LEVEL_UP',
      'PEER_HELP', 'COMMUNITY_CONTRIBUTION'
    ];

    if (!validActivities.includes(progressionData.activityType)) {
      throw new Error(`INVALID_ACTIVITY_TYPE: ${progressionData.activityType}`);
    }

    // Validate XP amount if provided
    if (progressionData.xpEarned && progressionData.xpEarned < 0) {
      throw new Error('INVALID_XP_AMOUNT');
    }

    // Verify student and skill exist
    const [student, skill] = await Promise.all([
      this.prisma.student.findUnique({
        where: { id: progressionData.studentId }
      }),
      this.prisma.skill.findUnique({
        where: { id: progressionData.skillId }
      })
    ]);

    if (!student) {
      throw new Error('STUDENT_NOT_FOUND');
    }

    if (!skill) {
      throw new Error('SKILL_NOT_FOUND');
    }

    this.logger.debug('Progression data validation passed', {
      studentId: progressionData.studentId,
      skillId: progressionData.skillId
    });
  }

  /**
   * 🔍 GET CURRENT PROGRESSION
   */
  async getCurrentProgression(studentId, skillId) {
    const cacheKey = `progression:${studentId}:${skillId}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get from database or create new
    let progression = await this.prisma.skillProgression.findUnique({
      where: {
        studentId_skillId: {
          studentId,
          skillId
        }
      }
    });

    if (!progression) {
      progression = await this.createInitialProgression(studentId, skillId);
    }

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(progression));

    return progression;
  }

  /**
   * 🆕 CREATE INITIAL PROGRESSION
   */
  async createInitialProgression(studentId, skillId) {
    return await this.prisma.skillProgression.create({
      data: {
        studentId,
        skillId,
        currentLevel: 'BEGINNER',
        progressPercentage: 0,
        totalXP: 0,
        currentStreak: 0,
        longestStreak: 0,
        sessionsCompleted: 0,
        assessmentsPassed: 0,
        projectsCompleted: 0,
        milestonesAchieved: [],
        lastActivityAt: new Date(),
        learningPath: this.determineInitialLearningPath(studentId, skillId),
        metadata: {
          createdAt: new Date(),
          initialAssessment: null,
          learningStyle: 'balanced',
          pace: 'medium'
        }
      }
    });
  }

  /**
   * 🎯 DETERMINE INITIAL LEARNING PATH
   */
  async determineInitialLearningPath(studentId, skillId) {
    // Get student learning preferences
    const studentProfile = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { learningStyle: true, pacePreference: true }
    });

    // Get skill difficulty
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
      select: { difficulty: true, category: true }
    });

    // Simple algorithm to determine best path
    if (studentProfile?.pacePreference === 'fast' && skill?.difficulty !== 'BEGINNER') {
      return 'ACCELERATED';
    } else if (studentProfile?.learningStyle === 'practical') {
      return 'PROJECT_FOCUSED';
    } else if (skill?.difficulty === 'BEGINNER') {
      return 'FOUNDATIONAL';
    }

    return 'STANDARD';
  }

  /**
   * 📊 CALCULATE PROGRESSION UPDATE
   */
  async calculateProgressionUpdate(currentState, progressionData) {
    const update = { ...currentState };
    
    // Calculate XP earned
    const xpEarned = progressionData.xpEarned || 
                     this.calculateXPReward(progressionData.activityType, progressionData);

    // Apply XP caps
    const cappedXP = await this.applyXPCaps(currentState.studentId, xpEarned);

    // Update total XP
    update.totalXP += cappedXP;

    // Update activity counters
    update.sessionsCompleted += progressionData.activityType === 'SESSION_COMPLETION' ? 1 : 0;
    update.assessmentsPassed += progressionData.activityType.includes('ASSESSMENT') ? 1 : 0;
    update.projectsCompleted += progressionData.activityType.includes('PROJECT') ? 1 : 0;

    // Update streak
    update.currentStreak = await this.calculateStreak(
      currentState.studentId,
      currentState.skillId,
      currentState.currentStreak
    );

    update.longestStreak = Math.max(update.currentStreak, currentState.longestStreak);

    // Calculate new progress percentage
    update.progressPercentage = this.calculateProgressPercentage(update.totalXP);

    // Determine new level
    update.currentLevel = this.calculateLevel(update.progressPercentage);

    // Update last activity
    update.lastActivityAt = new Date();

    // Update metadata
    update.metadata = {
      ...update.metadata,
      lastUpdate: new Date(),
      recentActivities: [
        ...(update.metadata.recentActivities || []).slice(-9),
        {
          type: progressionData.activityType,
          xpEarned: cappedXP,
          timestamp: new Date()
        }
      ]
    };

    return update;
  }

  /**
   * 💰 CALCULATE XP REWARD
   */
  calculateXPReward(activityType, progressionData) {
    let baseXP = this.xpRewards[activityType] || 50;

    // Apply modifiers
    if (progressionData.performanceScore > 90) {
      baseXP *= 1.5; // 50% bonus for excellent performance
    } else if (progressionData.performanceScore > 75) {
      baseXP *= 1.25; // 25% bonus for good performance
    }

    // Streak bonus
    if (progressionData.currentStreak > 7) {
      baseXP *= 1.1; // 10% bonus for 7+ day streak
    }

    return Math.round(baseXP);
  }

  /**
   * 🎪 APPLY XP CAPS
   */
  async applyXPCaps(studentId, xpEarned) {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = this.getWeekStartDate();

    const [dailyXP, weeklyXP] = await Promise.all([
      this.getDailyXP(studentId, today),
      this.getWeeklyXP(studentId, weekStart)
    ]);

    const remainingDaily = Math.max(0, this.progressionConfig.DAILY_XP_CAP - dailyXP);
    const remainingWeekly = Math.max(0, this.progressionConfig.WEEKLY_XP_CAP - weeklyXP);

    const cappedXP = Math.min(xpEarned, remainingDaily, remainingWeekly);

    if (cappedXP < xpEarned) {
      this.logger.debug('XP capped', {
        studentId,
        earned: xpEarned,
        capped: cappedXP,
        dailyRemaining: remainingDaily,
        weeklyRemaining: remainingWeekly
      });
    }

    return cappedXP;
  }

  /**
   * 📅 GET DAILY XP
   */
  async getDailyXP(studentId, date) {
    const cacheKey = `xp:daily:${studentId}:${date}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return parseInt(cached);
    }

    const dailyXP = await this.prisma.progressionActivity.aggregate({
      where: {
        studentId,
        activityDate: date,
        activityType: { not: 'LEVEL_UP' } // Level ups don't count toward cap
      },
      _sum: { xpEarned: true }
    });

    const total = dailyXP._sum.xpEarned || 0;
    
    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, total.toString());

    return total;
  }

  /**
   * 📅 GET WEEKLY XP
   */
  async getWeeklyXP(studentId, weekStart) {
    const cacheKey = `xp:weekly:${studentId}:${weekStart}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return parseInt(cached);
    }

    const weeklyXP = await this.prisma.progressionActivity.aggregate({
      where: {
        studentId,
        activityDate: { gte: weekStart },
        activityType: { not: 'LEVEL_UP' }
      },
      _sum: { xpEarned: true }
    });

    const total = weeklyXP._sum.xpEarned || 0;
    
    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, total.toString());

    return total;
  }

  /**
   * 🔥 CALCULATE STREAK
   */
  async calculateStreak(studentId, skillId, currentStreak) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const hadActivityYesterday = await this.prisma.progressionActivity.findFirst({
      where: {
        studentId,
        skillId,
        activityDate: yesterdayStr
      }
    });

    if (hadActivityYesterday) {
      return currentStreak + 1;
    } else {
      // Check if today is the first activity after a break
      const today = new Date().toISOString().split('T')[0];
      const hadActivityToday = await this.prisma.progressionActivity.findFirst({
        where: {
          studentId,
          skillId,
          activityDate: today
        }
      });

      return hadActivityToday ? currentStreak : 1;
    }
  }

  /**
   * 📊 CALCULATE PROGRESS PERCENTAGE
   */
  calculateProgressPercentage(totalXP) {
    const masterXP = this.progressionConfig.LEVELS.MASTER.xpRequired;
    return Math.min(100, (totalXP / masterXP) * 100);
  }

  /**
   * 🎯 CALCULATE LEVEL
   */
  calculateProgressPercentage(totalXP) {
    const masterXP = this.progressionConfig.LEVELS.MASTER.xpRequired;
    return Math.min(100, (totalXP / masterXP) * 100);
  }

  /**
   * 🎯 CALCULATE LEVEL
   */
  calculateLevel(progressPercentage) {
    const levels = Object.entries(this.progressionConfig.LEVELS)
      .sort(([,a], [,b]) => b.threshold - a.threshold);

    for (const [level, config] of levels) {
      if (progressPercentage >= config.threshold) {
        return level;
      }
    }

    return 'BEGINNER';
  }

  /**
   * 💾 UPDATE PROGRESSION RECORD
   */
  async updateProgressionRecord(progressionUpdate) {
    return await this.prisma.$transaction(async (tx) => {
      // Update progression
      const updatedProgression = await tx.skillProgression.update({
        where: {
          studentId_skillId: {
            studentId: progressionUpdate.studentId,
            skillId: progressionUpdate.skillId
          }
        },
        data: progressionUpdate
      });

      // Log activity
      await tx.progressionActivity.create({
        data: {
          studentId: progressionUpdate.studentId,
          skillId: progressionUpdate.skillId,
          activityType: progressionUpdate.metadata?.recentActivities?.[0]?.type || 'UNKNOWN',
          xpEarned: progressionUpdate.metadata?.recentActivities?.[0]?.xpEarned || 0,
          activityDate: new Date().toISOString().split('T')[0],
          metadata: {
            progressPercentage: progressionUpdate.progressPercentage,
            currentLevel: progressionUpdate.currentLevel,
            timestamp: new Date()
          }
        }
      });

      // Update cache
      const cacheKey = `progression:${progressionUpdate.studentId}:${progressionUpdate.skillId}`;
      await this.redis.del(cacheKey);

      return updatedProgression;
    });
  }

  /**
   * 🏆 CHECK ACHIEVEMENTS
   */
  async checkAchievements(progressionRecord) {
    const achievements = [];

    // Check for level up
    const levelUpAchievement = await this.checkLevelUp(progressionRecord);
    if (levelUpAchievement) {
      achievements.push(levelUpAchievement);
    }

    // Check for milestone achievements
    const milestoneAchievements = await this.checkMilestones(progressionRecord);
    achievements.push(...milestoneAchievements);

    // Check for streak achievements
    const streakAchievements = await this.checkStreakAchievements(progressionRecord);
    achievements.push(...streakAchievements);

    // Check for activity achievements
    const activityAchievements = await this.checkActivityAchievements(progressionRecord);
    achievements.push(...activityAchievements);

    // Save achievements
    if (achievements.length > 0) {
      await this.saveAchievements(progressionRecord.studentId, progressionRecord.skillId, achievements);
    }

    return achievements;
  }

  /**
   * ⬆️ CHECK LEVEL UP
   */
  async checkLevelUp(progressionRecord) {
    const previousProgress = await this.getPreviousProgress(
      progressionRecord.studentId,
      progressionRecord.skillId
    );

    if (!previousProgress) return null;

    const previousLevel = this.calculateLevel(previousProgress.progressPercentage);
    const currentLevel = progressionRecord.currentLevel;

    if (previousLevel !== currentLevel) {
      return {
        type: 'LEVEL_UP',
        title: `Reached ${currentLevel} Level`,
        description: `Advanced from ${previousLevel} to ${currentLevel} in ${progressionRecord.skillId}`,
        xpReward: this.xpRewards.LEVEL_UP,
        metadata: {
          fromLevel: previousLevel,
          toLevel: currentLevel,
          skillId: progressionRecord.skillId
        }
      };
    }

    return null;
  }

  /**
   * 🎯 CHECK MILESTONES
   */
  async checkMilestones(progressionRecord) {
    const achievements = [];
    const milestones = this.progressionConfig.MILESTONES;

    const previousProgress = await this.getPreviousProgress(
      progressionRecord.studentId,
      progressionRecord.skillId
    );

    if (!previousProgress) return achievements;

    for (const milestone of milestones) {
      const previousReached = previousProgress.milestonesAchieved.includes(milestone);
      const currentReached = progressionRecord.progressPercentage >= milestone;

      if (!previousReached && currentReached) {
        achievements.push({
          type: 'MILESTONE_REACHED',
          title: `${milestone}% Milestone`,
          description: `Reached ${milestone}% progress in ${progressionRecord.skillId}`,
          xpReward: this.xpRewards.MILESTONE_REACHED,
          metadata: {
            milestone,
            skillId: progressionRecord.skillId,
            progressPercentage: progressionRecord.progressPercentage
          }
        });

        // Update milestones achieved
        await this.updateMilestonesAchieved(
          progressionRecord.studentId,
          progressionRecord.skillId,
          milestone
        );
      }
    }

    return achievements;
  }

  /**
   * 🔥 CHECK STREAK ACHIEVEMENTS
   */
  async checkStreakAchievements(progressionRecord) {
    const achievements = [];
    const streak = progressionRecord.currentStreak;

    // Streak milestones
    const streakMilestones = [7, 14, 30, 60, 90];

    for (const milestone of streakMilestones) {
      if (streak === milestone) {
        achievements.push({
          type: 'STREAK_MILESTONE',
          title: `${milestone}-Day Streak`,
          description: `Maintained a ${milestone}-day learning streak`,
          xpReward: milestone * 10, // 10 XP per day of streak
          metadata: {
            streakLength: milestone,
            skillId: progressionRecord.skillId
          }
        });
      }
    }

    return achievements;
  }

  /**
   * 📊 CHECK ACTIVITY ACHIEVEMENTS
   */
  async checkActivityAchievements(progressionRecord) {
    const achievements = [];

    // Session milestones
    const sessionMilestones = [10, 25, 50, 100, 250];
    for (const milestone of sessionMilestones) {
      if (progressionRecord.sessionsCompleted === milestone) {
        achievements.push({
          type: 'SESSION_MILESTONE',
          title: `${milestone} Sessions Completed`,
          description: `Completed ${milestone} learning sessions`,
          xpReward: milestone * 5,
          metadata: {
            sessionsCompleted: milestone,
            skillId: progressionRecord.skillId
          }
        });
      }
    }

    // Assessment milestones
    const assessmentMilestones = [5, 15, 30, 50];
    for (const milestone of assessmentMilestones) {
      if (progressionRecord.assessmentsPassed === milestone) {
        achievements.push({
          type: 'ASSESSMENT_MILESTONE',
          title: `${milestone} Assessments Passed`,
          description: `Successfully passed ${milestone} assessments`,
          xpReward: milestone * 10,
          metadata: {
            assessmentsPassed: milestone,
            skillId: progressionRecord.skillId
          }
        });
      }
    }

    return achievements;
  }

  /**
   * 💾 SAVE ACHIEVEMENTS
   */
  async saveAchievements(studentId, skillId, achievements) {
    for (const achievement of achievements) {
      await this.prisma.achievement.create({
        data: {
          studentId,
          skillId,
          type: achievement.type,
          title: achievement.title,
          description: achievement.description,
          xpReward: achievement.xpReward,
          metadata: achievement.metadata,
          achievedAt: new Date()
        }
      });

      // Award XP for achievement
      await this.updateProgression({
        studentId,
        skillId,
        activityType: achievement.type,
        xpEarned: achievement.xpReward
      });
    }
  }

  /**
   * 📈 UPDATE PROGRESSION ANALYTICS
   */
  async updateProgressionAnalytics(progressionRecord) {
    const analyticsData = {
      studentId: progressionRecord.studentId,
      skillId: progressionRecord.skillId,
      progressPercentage: progressionRecord.progressPercentage,
      currentLevel: progressionRecord.currentLevel,
      totalXP: progressionRecord.totalXP,
      sessionsCompleted: progressionRecord.sessionsCompleted,
      timestamp: new Date()
    };

    await this.analyticsEngine.recordProgression(analyticsData);
  }

  /**
   * 🎪 EMIT PROGRESSION EVENTS
   */
  emitProgressionEvents(progressionRecord, achievements) {
    this.emit('progressionUpdated', {
      studentId: progressionRecord.studentId,
      skillId: progressionRecord.skillId,
      progressPercentage: progressionRecord.progressPercentage,
      currentLevel: progressionRecord.currentLevel,
      totalXP: progressionRecord.totalXP,
      timestamp: new Date()
    });

    for (const achievement of achievements) {
      this.emit('achievementUnlocked', {
        studentId: progressionRecord.studentId,
        skillId: progressionRecord.skillId,
        achievement: achievement,
        timestamp: new Date()
      });
    }
  }

  /**
   * 🔄 START PROGRESSION PROCESSOR
   */
  startProgressionProcessor() {
    setInterval(async () => {
      try {
        await this.processProgressionQueue();
      } catch (error) {
        this.logger.error('Progression processor failed', error);
      }
    }, 10000); // Every 10 seconds

    this.logger.info('Progression processor started');
  }

  /**
   * 📋 PROCESS PROGRESSION QUEUE
   */
  async processProgressionQueue() {
    if (this.progressionQueue.size === 0) return;

    const batch = Array.from(this.progressionQueue.values()).slice(0, 20);
    
    for (const progressionData of batch) {
      try {
        await this.updateProgression(progressionData);
        this.progressionQueue.delete(this.getQueueKey(progressionData));
      } catch (error) {
        this.logger.error('Failed to process progression update', error, progressionData);
      }
    }
  }

  /**
   * 📉 START DECAY MONITOR
   */
  startDecayMonitor() {
    // Run decay check daily at 3 AM
    setInterval(async () => {
      try {
        await this.applySkillDecay();
      } catch (error) {
        this.logger.error('Decay monitor failed', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    this.logger.info('Decay monitor started');
  }

  /**
   * 📉 APPLY SKILL DECAY
   */
  async applySkillDecay() {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const inactiveProgressions = await this.prisma.skillProgression.findMany({
      where: {
        lastActivityAt: { lt: twoWeeksAgo },
        progressPercentage: { gt: 0 }
      },
      take: 1000 // Process in batches
    });

    for (const progression of inactiveProgressions) {
      try {
        const decayAmount = progression.progressPercentage * this.progressionConfig.SKILL_DECAY_RATE;
        const newProgress = Math.max(0, progression.progressPercentage - decayAmount);

        await this.prisma.skillProgression.update({
          where: { id: progression.id },
          data: {
            progressPercentage: newProgress,
            currentLevel: this.calculateLevel(newProgress),
            metadata: {
              ...progression.metadata,
              decayApplied: {
                amount: decayAmount,
                previousProgress: progression.progressPercentage,
                appliedAt: new Date()
              }
            }
          }
        });

        this.logger.debug('Skill decay applied', {
          studentId: progression.studentId,
          skillId: progression.skillId,
          previousProgress: progression.progressPercentage,
          newProgress,
          decayAmount
        });

      } catch (error) {
        this.logger.error('Failed to apply skill decay', error, {
          progressionId: progression.id
        });
      }
    }
  }

  /**
   * 🏆 START ACHIEVEMENT PROCESSOR
   */
  startAchievementProcessor() {
    setInterval(async () => {
      try {
        await this.processPendingAchievements();
      } catch (error) {
        this.logger.error('Achievement processor failed', error);
      }
    }, 30000); // Every 30 seconds

    this.logger.info('Achievement processor started');
  }

  /**
   * 🔥 WARM UP PROGRESSION CACHE
   */
  async warmUpProgressionCache() {
    try {
      // Pre-load progression data for active students
      const activeProgressions = await this.prisma.skillProgression.findMany({
        where: {
          lastActivityAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        },
        take: 1000
      });

      for (const progression of activeProgressions) {
        const cacheKey = `progression:${progression.studentId}:${progression.skillId}`;
        await this.redis.setex(cacheKey, 3600, JSON.stringify(progression));
      }

      this.logger.info('Progression cache warmed up successfully');
    } catch (error) {
      this.logger.error('Failed to warm up progression cache', error);
    }
  }

  /**
   * 🛠️ HELPER METHODS
   */

  getQueueKey(progressionData) {
    return `${progressionData.studentId}:${progressionData.skillId}:${progressionData.activityType}`;
  }

  getWeekStartDate() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff));
    return weekStart.toISOString().split('T')[0];
  }

  async getPreviousProgress(studentId, skillId) {
    const activities = await this.prisma.progressionActivity.findMany({
      where: {
        studentId,
        skillId
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    return activities[0]?.metadata || null;
  }

  async updateMilestonesAchieved(studentId, skillId, milestone) {
    await this.prisma.skillProgression.update({
      where: {
        studentId_skillId: { studentId, skillId }
      },
      data: {
        milestonesAchieved: {
          push: milestone
        }
      }
    });
  }

  async processPendingAchievements() {
    // Implementation for processing complex achievements
    // that require cross-referencing multiple data points
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      this.removeAllListeners();
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.logger.info('Progression system resources cleaned up');
    } catch (error) {
      this.logger.error('Error during progression system cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new ProgressionSystem();