/**
 * 🎯 MOSA FORGE: Enterprise Discipline Building System
 * 
 * @module DisciplineBuilding
 * @description Mindset Phase 2 - Habit Formation & Consistency Building
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Neuroscience-backed habit formation
 * - Personalized discipline assessment
 * - Real-time progress tracking
 * - Adaptive difficulty scaling
 * - Social accountability integration
 * - Gamified consistency rewards
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');

// 🧠 Neuroscience Constants
const HABIT_FORMATION_PHASES = {
  AWARENESS: 'awareness',
  COMMITMENT: 'commitment',
  PRACTICE: 'practice',
  MAINTENANCE: 'maintenance',
  MASTERY: 'mastery'
};

const DISCIPLINE_LEVELS = {
  NOVICE: { threshold: 0, label: 'Getting Started' },
  APPRENTICE: { threshold: 25, label: 'Building Consistency' },
  PRACTITIONER: { threshold: 50, label: 'Developing Routine' },
  PROFICIENT: { threshold: 75, label: 'Established Habits' },
  MASTER: { threshold: 90, label: 'Discipline Master' }
};

const HABIT_DIFFICULTY = {
  FOUNDATIONAL: {
    duration: 7,
    exercises: 3,
    frequency: 'DAILY',
    intensity: 'LOW'
  },
  INTERMEDIATE: {
    duration: 14,
    exercises: 5,
    frequency: 'DAILY',
    intensity: 'MEDIUM'
  },
  ADVANCED: {
    duration: 21,
    exercises: 7,
    frequency: 'DAILY',
    intensity: 'HIGH'
  }
};

/**
 * 🏗️ Enterprise Discipline Building Class
 * @class DisciplineBuilding
 * @extends EventEmitter
 */
class DisciplineBuilding extends EventEmitter {
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
      habitFormationDays: options.habitFormationDays || 21,
      maxRetries: options.maxRetries || 3,
      assessmentInterval: options.assessmentInterval || 24 * 60 * 60 * 1000 // 24 hours
    };

    // 🏗️ Service Dependencies
    this.redis = new Redis(this.config.redis);
    this.prisma = this.config.prisma;
    
    // 🧠 Neuroscience-Based Algorithms
    this.habitAlgorithms = this._initializeHabitAlgorithms();
    this.motivationEngine = this._initializeMotivationEngine();
    
    // 🏗️ Performance Monitoring
    this.metrics = {
      assessmentsCompleted: 0,
      habitsFormed: 0,
      consistencyRate: 0,
      averageProgress: 0
    };

    this._initializeEventHandlers();
    this._startProgressMonitoring();
  }

  /**
   * 🧠 Initialize Habit Formation Algorithms
   * @private
   */
  _initializeHabitAlgorithms() {
    return {
      // 🎯 Streak-based motivation algorithm
      calculateStreakMotivation: (currentStreak, maxStreak) => {
        const baseMotivation = 50;
        const streakBonus = (currentStreak / maxStreak) * 50;
        return Math.min(100, baseMotivation + streakBonus);
      },

      // 🎯 Difficulty progression algorithm
      calculateNextDifficulty: (successRate, currentDifficulty) => {
        if (successRate >= 0.9) return this._increaseDifficulty(currentDifficulty);
        if (successRate >= 0.7) return currentDifficulty;
        return this._decreaseDifficulty(currentDifficulty);
      },

      // 🎯 Consistency scoring algorithm
      calculateConsistencyScore: (completionHistory) => {
        const recentCompletions = completionHistory.slice(-7); // Last 7 days
        const completionRate = recentCompletions.filter(Boolean).length / 7;
        
        const streak = this._calculateCurrentStreak(completionHistory);
        const streakBonus = Math.min(streak * 5, 30); // Max 30% bonus
        
        return Math.min(100, (completionRate * 70) + streakBonus);
      },

      // 🎯 Personalized habit recommendation
      recommendHabitSchedule: (userProfile, pastPerformance) => {
        const baseSchedule = {
          morning: ['meditation', 'planning'],
          afternoon: ['learning_session', 'practice'],
          evening: ['reflection', 'preparation']
        };

        // Adjust based on user chronotype
        if (userProfile.chronotype === 'NIGHT_OWL') {
          baseSchedule.morning = ['gentle_wakeup', 'planning'];
          baseSchedule.evening = ['deep_work', 'reflection'];
        }

        return baseSchedule;
      }
    };
  }

  /**
   * 🧠 Initialize Motivation Engine
   * @private
   */
  _initializeMotivationEngine() {
    return {
      // 🎯 Progress-based motivation
      getProgressMotivation: (progress, level) => {
        const motivations = {
          NOVICE: [
            "Every master was once a beginner. You're building the foundation!",
            "Day by day, what seems difficult becomes routine.",
            "The first step is always the hardest. You've taken it!"
          ],
          APPRENTICE: [
            "Consistency beats intensity. You're building momentum!",
            "Your daily efforts are compounding into real change.",
            "You're developing the habits that will carry you to success."
          ],
          PRACTITIONER: [
            "Discipline is choosing between what you want now and what you want most.",
            "You're building the identity of someone who follows through.",
            "Your consistency is becoming your superpower."
          ]
        };

        const levelMotivations = motivations[level] || motivations.NOVICE;
        const index = Math.floor((progress / 100) * levelMotivations.length);
        return levelMotivations[Math.min(index, levelMotivations.length - 1)];
      },

      // 🎯 Milestone celebrations
      getMilestoneCelebration: (milestone) => {
        const celebrations = {
          7: "🎉 First Week Complete! You've built a solid foundation.",
          14: "🔥 Two Weeks Strong! Your habits are taking root.",
          21: "🚀 21 Days! You've formed lasting neural pathways.",
          30: "🏆 One Month of Discipline! You're a different person now."
        };

        return celebrations[milestone] || "Keep going! Every day counts.";
      }
    };
  }

  /**
   * 🏗️ Initialize Event Handlers
   * @private
   */
  _initializeEventHandlers() {
    this.on('discipline.assessment.started', (data) => {
      this._logEvent('DISCIPLINE_ASSESSMENT_STARTED', data);
    });

    this.on('discipline.assessment.completed', (data) => {
      this._logEvent('DISCIPLINE_ASSESSMENT_COMPLETED', data);
      this.metrics.assessmentsCompleted++;
    });

    this.on('habit.formed', (data) => {
      this._logEvent('HABIT_FORMED', data);
      this.metrics.habitsFormed++;
    });

    this.on('consistency.milestone', (data) => {
      this._logEvent('CONSISTENCY_MILESTONE', data);
    });

    this.on('difficulty.increased', (data) => {
      this._logEvent('DIFFICULTY_INCREASED', data);
    });
  }

  /**
   * 🏗️ Start Progress Monitoring
   * @private
   */
  _startProgressMonitoring() {
    setInterval(async () => {
      await this._checkStalledProgress();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Start Discipline Building Phase
   * @param {string} enrollmentId - Student enrollment ID
   * @param {Object} studentProfile - Student profile and preferences
   * @returns {Promise<Object>} Discipline building plan
   */
  async startDisciplineBuilding(enrollmentId, studentProfile) {
    const startTime = performance.now();
    const sessionId = uuidv4();

    try {
      this.emit('discipline.assessment.started', { enrollmentId, sessionId });

      // 🧠 Phase 1: Comprehensive Discipline Assessment
      const assessment = await this._conductDisciplineAssessment(enrollmentId, studentProfile);
      
      // 🧠 Phase 2: Personalized Habit Plan Creation
      const habitPlan = await this._createPersonalizedHabitPlan(assessment);
      
      // 🧠 Phase 3: Initial Habit Environment Setup
      const environment = await this._setupHabitEnvironment(enrollmentId, habitPlan);
      
      // 🧠 Phase 4: Accountability System Activation
      const accountability = await this._activateAccountabilitySystem(enrollmentId, habitPlan);

      const processingTime = performance.now() - startTime;

      const result = {
        success: true,
        sessionId,
        enrollmentId,
        disciplineLevel: assessment.disciplineLevel,
        habitPlan: {
          ...habitPlan,
          environment,
          accountability
        },
        motivation: this.motivationEngine.getProgressMotivation(0, assessment.disciplineLevel),
        nextAssessment: new Date(Date.now() + this.config.assessmentInterval),
        processingTime
      };

      this.emit('discipline.assessment.completed', result);
      return result;

    } catch (error) {
      const processingTime = performance.now() - startTime;
      this._logError('DISCIPLINE_BUILDING_FAILED', error, { enrollmentId, sessionId });
      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🧠 Comprehensive Discipline Assessment
   * @private
   */
  async _conductDisciplineAssessment(enrollmentId, studentProfile) {
    const assessmentId = uuidv4();

    // 🎯 Multi-dimensional assessment
    const assessmentSections = [
      this._assessCurrentHabits(enrollmentId),
      this._assessMotivationLevel(studentProfile),
      this._assessEnvironmentFactors(studentProfile),
      this._assessPastConsistency(enrollmentId)
    ];

    const results = await Promise.all(assessmentSections);

    const compositeScore = results.reduce((total, section) => total + section.score, 0) / results.length;
    
    const disciplineLevel = this._determineDisciplineLevel(compositeScore);
    const weaknesses = this._identifyDisciplineWeaknesses(results);

    // Store assessment results
    await this.prisma.disciplineAssessment.create({
      data: {
        id: assessmentId,
        enrollmentId,
        compositeScore,
        disciplineLevel,
        sectionScores: results.reduce((acc, section, index) => ({
          ...acc,
          [section.name]: section.score
        }), {}),
        weaknesses,
        recommendations: this._generateInitialRecommendations(weaknesses),
        assessedAt: new Date()
      }
    });

    return {
      assessmentId,
      compositeScore,
      disciplineLevel,
      weaknesses,
      strengths: this._identifyDisciplineStrengths(results)
    };
  }

  /**
   * 🧠 Assess Current Habits
   * @private
   */
  async _assessCurrentHabits(enrollmentId) {
    // Analyze existing habit patterns
    const habitHistory = await this.prisma.habitHistory.findMany({
      where: { enrollmentId },
      orderBy: { recordedAt: 'desc' },
      take: 30 // Last 30 days
    });

    const consistencyScore = this.habitAlgorithms.calculateConsistencyScore(
      habitHistory.map(h => h.completed)
    );

    const currentStreak = this._calculateCurrentStreak(
      habitHistory.map(h => h.completed)
    );

    return {
      name: 'current_habits',
      score: consistencyScore,
      streak: currentStreak,
      totalHabits: habitHistory.length,
      insights: this._analyzeHabitPatterns(habitHistory)
    };
  }

  /**
   * 🧠 Assess Motivation Level
   * @private
   */
  async _assessMotivationLevel(studentProfile) {
    const motivationFactors = {
      intrinsic: studentProfile.intrinsicMotivation || 50,
      extrinsic: studentProfile.extrinsicMotivation || 50,
      resilience: studentProfile.resilienceScore || 50
    };

    const motivationScore = (
      motivationFactors.intrinsic * 0.5 +
      motivationFactors.extrinsic * 0.3 +
      motivationFactors.resilience * 0.2
    );

    return {
      name: 'motivation',
      score: motivationScore,
      factors: motivationFactors,
      recommendations: this._generateMotivationRecommendations(motivationFactors)
    };
  }

  /**
   * 🧠 Assess Environment Factors
   * @private
   */
  async _assessEnvironmentFactors(studentProfile) {
    const environmentScore = (
      (studentProfile.supportSystem ? 80 : 30) * 0.4 +
      (studentProfile.dedicatedSpace ? 70 : 40) * 0.3 +
      (studentProfile.minimalDistractions ? 75 : 45) * 0.3
    );

    return {
      name: 'environment',
      score: environmentScore,
      factors: {
        supportSystem: studentProfile.supportSystem,
        dedicatedSpace: studentProfile.dedicatedSpace,
        minimalDistractions: studentProfile.minimalDistractions
      },
      improvements: this._suggestEnvironmentImprovements(studentProfile)
    };
  }

  /**
   * 🧠 Create Personalized Habit Plan
   * @private
   */
  async _createPersonalizedHabitPlan(assessment) {
    const planId = uuidv4();
    const difficulty = this._determineStartingDifficulty(assessment.compositeScore);

    const coreHabits = this._selectCoreHabits(assessment.weaknesses, difficulty);
    const schedule = this.habitAlgorithms.recommendHabitSchedule(
      assessment.strengths,
      assessment.weaknesses
    );

    const habitPlan = {
      id: planId,
      difficulty,
      duration: HABIT_DIFFICULTY[difficulty].duration,
      coreHabits,
      schedule,
      milestones: this._defineProgressMilestones(difficulty),
      adaptationRules: this._createAdaptationRules(assessment)
    };

    // Store habit plan
    await this.prisma.habitPlan.create({
      data: {
        id: planId,
        assessmentId: assessment.assessmentId,
        ...habitPlan,
        createdAt: new Date()
      }
    });

    return habitPlan;
  }

  /**
   * 🧠 Setup Habit Environment
   * @private
   */
  async _setupHabitEnvironment(enrollmentId, habitPlan) {
    const environmentId = uuidv4();

    const environmentSetup = {
      triggers: this._designHabitTriggers(habitPlan.schedule),
      rewards: this._designHabitRewards(habitPlan.coreHabits),
      tracking: this._setupProgressTracking(enrollmentId),
      reminders: this._scheduleSmartReminders(habitPlan)
    };

    await this.prisma.habitEnvironment.create({
      data: {
        id: environmentId,
        enrollmentId,
        ...environmentSetup,
        setupAt: new Date()
      }
    });

    return environmentSetup;
  }

  /**
   * 🧠 Activate Accountability System
   * @private
   */
  async _activateAccountabilitySystem(enrollmentId, habitPlan) {
    const accountabilityId = uuidv4();

    const accountabilitySystem = {
      dailyCheckins: this._setupDailyCheckins(enrollmentId),
      progressSharing: this._setupProgressSharing(enrollmentId),
      mentorNotifications: this._setupMentorNotifications(enrollmentId),
      communityChallenges: this._setupCommunityChallenges(enrollmentId)
    };

    await this.prisma.accountabilitySystem.create({
      data: {
        id: accountabilityId,
        enrollmentId,
        ...accountabilitySystem,
        activatedAt: new Date()
      }
    });

    return accountabilitySystem;
  }

  /**
   * 🎯 Record Daily Habit Completion
   * @param {string} enrollmentId - Student enrollment ID
   * @param {string} habitId - Specific habit ID
   * @param {Object} completionData - Completion details
   * @returns {Promise<Object>} Updated progress
   */
  async recordHabitCompletion(enrollmentId, habitId, completionData) {
    const completionId = uuidv4();
    const timestamp = new Date();

    try {
      // Record completion
      const completion = await this.prisma.habitCompletion.create({
        data: {
          id: completionId,
          enrollmentId,
          habitId,
          completedAt: timestamp,
          difficulty: completionData.difficulty,
          notes: completionData.notes,
          mood: completionData.mood,
          obstacles: completionData.obstacles,
          metadata: {
            location: completionData.location,
            timeOfDay: completionData.timeOfDay,
            duration: completionData.duration
          }
        }
      });

      // Update streaks and progress
      const progressUpdate = await this._updateProgressMetrics(enrollmentId, habitId);
      
      // Check for milestones
      const milestones = await this._checkMilestones(enrollmentId, habitId);

      // Adjust difficulty if needed
      const difficultyUpdate = await this._adjustDifficulty(enrollmentId, habitId);

      const result = {
        success: true,
        completionId,
        progress: progressUpdate,
        milestones,
        difficultyUpdate,
        motivation: this.motivationEngine.getProgressMotivation(
          progressUpdate.overallProgress,
          progressUpdate.disciplineLevel
        )
      };

      this.emit('habit.completed', {
        enrollmentId,
        habitId,
        streak: progressUpdate.currentStreak,
        overallProgress: progressUpdate.overallProgress
      });

      return result;

    } catch (error) {
      this._logError('HABIT_COMPLETION_FAILED', error, { enrollmentId, habitId });
      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🎯 Get Discipline Progress Dashboard
   * @param {string} enrollmentId - Student enrollment ID
   * @returns {Promise<Object>} Comprehensive progress data
   */
  async getDisciplineDashboard(enrollmentId) {
    try {
      const [
        currentProgress,
        habitCompletions,
        streaks,
        milestones,
        recommendations
      ] = await Promise.all([
        this._getCurrentProgress(enrollmentId),
        this._getRecentCompletions(enrollmentId),
        this._getStreakData(enrollmentId),
        this._getAchievedMilestones(enrollmentId),
        this._getPersonalizedRecommendations(enrollmentId)
      ]);

      return {
        success: true,
        enrollmentId,
        dashboard: {
          overview: {
            disciplineLevel: currentProgress.disciplineLevel,
            overallProgress: currentProgress.overallProgress,
            currentStreak: streaks.currentStreak,
            longestStreak: streaks.longestStreak,
            consistencyRate: currentProgress.consistencyRate
          },
          habits: {
            active: currentProgress.activeHabits,
            completedToday: habitCompletions.today,
            weeklyCompletion: habitCompletions.weekly
          },
          achievements: {
            milestones: milestones.recent,
            levelUps: milestones.levelUps,
            badges: milestones.badges
          },
          insights: {
            bestTime: this._analyzeOptimalTimes(habitCompletions.all),
            challengingHabits: this._identifyChallengingHabits(habitCompletions.all),
            motivationTrend: this._analyzeMotivationTrend(habitCompletions.all)
          },
          recommendations,
          nextSteps: this._getNextSteps(currentProgress)
        }
      };

    } catch (error) {
      this._logError('DASHBOARD_FETCH_FAILED', error, { enrollmentId });
      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🧠 Neuroscience-Based Helper Methods
   */

  /**
   * Calculate Current Streak
   * @private
   */
  _calculateCurrentStreak(completionHistory) {
    let streak = 0;
    const today = new Date().toDateString();
    
    for (let i = completionHistory.length - 1; i >= 0; i--) {
      if (completionHistory[i]) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  /**
   * Increase Difficulty Level
   * @private
   */
  _increaseDifficulty(currentDifficulty) {
    const difficulties = ['FOUNDATIONAL', 'INTERMEDIATE', 'ADVANCED'];
    const currentIndex = difficulties.indexOf(currentDifficulty);
    return difficulties[Math.min(currentIndex + 1, difficulties.length - 1)];
  }

  /**
   * Decrease Difficulty Level
   * @private
   */
  _decreaseDifficulty(currentDifficulty) {
    const difficulties = ['FOUNDATIONAL', 'INTERMEDIATE', 'ADVANCED'];
    const currentIndex = difficulties.indexOf(currentDifficulty);
    return difficulties[Math.max(currentIndex - 1, 0)];
  }

  /**
   * Determine Discipline Level
   * @private
   */
  _determineDisciplineLevel(score) {
    if (score >= 90) return 'MASTER';
    if (score >= 75) return 'PROFICIENT';
    if (score >= 50) return 'PRACTITIONER';
    if (score >= 25) return 'APPRENTICE';
    return 'NOVICE';
  }

  /**
   * Identify Discipline Weaknesses
   * @private
   */
  _identifyDisciplineWeaknesses(assessmentResults) {
    return assessmentResults
      .filter(section => section.score < 60)
      .map(section => ({
        area: section.name,
        score: section.score,
        improvementSuggestions: section.recommendations || []
      }));
  }

  /**
   * 🏗️ Enterprise Logging System
   * @private
   */
  _logEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'discipline-building',
      event: eventType,
      data,
      environment: process.env.NODE_ENV || 'development'
    };

    console.log(JSON.stringify(logEntry));

    if (process.env.NODE_ENV === 'production') {
      this.redis.publish('mindset-logs', JSON.stringify(logEntry));
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
    enterpriseError.code = error.code || 'DISCIPLINE_SYSTEM_ERROR';
    enterpriseError.timestamp = new Date().toISOString();
    enterpriseError.severity = 'HIGH';
    
    return enterpriseError;
  }

  /**
   * 🎯 Additional placeholder methods for complete implementation
   * These would be fully implemented in production
   */
  _assessPastConsistency() { return { name: 'past_consistency', score: 65 }; }
  _identifyDisciplineStrengths() { return ['motivation', 'environment']; }
  _generateInitialRecommendations() { return ['Start with foundational habits', 'Establish morning routine']; }
  _analyzeHabitPatterns() { return { bestTime: 'morning', consistentDays: ['Mon', 'Wed', 'Fri'] }; }
  _generateMotivationRecommendations() { return ['Set clear goals', 'Track progress visually']; }
  _suggestEnvironmentImprovements() { return ['Create dedicated study space', 'Minimize phone distractions']; }
  _determineStartingDifficulty() { return 'FOUNDATIONAL'; }
  _selectCoreHabits() { return ['morning_routine', 'learning_session', 'evening_reflection']; }
  _defineProgressMilestones() { return [7, 14, 21, 30]; }
  _createAdaptationRules() { return { successThreshold: 0.8, failureThreshold: 0.6 }; }
  _designHabitTriggers() { return ['morning_alarm', 'lunch_break', 'evening_routine']; }
  _designHabitRewards() { return ['progress_celebration', 'streak_milestone', 'level_up']; }
  _setupProgressTracking() { return { method: 'daily_checkins', frequency: 'DAILY' }; }
  _scheduleSmartReminders() { return { morning: '8:00', afternoon: '14:00', evening: '20:00' }; }
  _setupDailyCheckins() { return { enabled: true, time: '20:00' }; }
  _setupProgressSharing() { return { community: true, mentor: true }; }
  _setupMentorNotifications() { return { streak_broken: true, milestone_achieved: true }; }
  _setupCommunityChallenges() { return { weekly: true, monthly: true }; }
  _updateProgressMetrics() { return { overallProgress: 25, currentStreak: 3, disciplineLevel: 'APPRENTICE' }; }
  _checkMilestones() { return { achieved: [], upcoming: [7] }; }
  _adjustDifficulty() { return { current: 'FOUNDATIONAL', recommended: 'FOUNDATIONAL' }; }
  _getCurrentProgress() { return { disciplineLevel: 'APPRENTICE', overallProgress: 25, consistencyRate: 0.75, activeHabits: 3 }; }
  _getRecentCompletions() { return { today: 2, weekly: 12, all: [] }; }
  _getStreakData() { return { currentStreak: 3, longestStreak: 5 }; }
  _getAchievedMilestones() { return { recent: [], levelUps: [], badges: [] }; }
  _getPersonalizedRecommendations() { return ['Increase morning routine consistency', 'Add evening planning session']; }
  _analyzeOptimalTimes() { return 'morning'; }
  _identifyChallengingHabits() { return ['evening_reflection']; }
  _analyzeMotivationTrend() { return 'increasing'; }
  _getNextSteps() { return ['Complete daily check-in', 'Review weekly progress']; }
  _checkStalledProgress() { /* Implementation for monitoring stalled users */ }

  /**
   * 🏗️ Get Service Metrics
   * @returns {Object} Service performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
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
  DisciplineBuilding,
  HABIT_FORMATION_PHASES,
  DISCIPLINE_LEVELS,
  HABIT_DIFFICULTY
};

// 🏗️ Singleton Instance for Microservice Architecture
let disciplineBuildingInstance = null;

module.exports.getInstance = (options = {}) => {
  if (!disciplineBuildingInstance) {
    disciplineBuildingInstance = new DisciplineBuilding(options);
  }
  return disciplineBuildingInstance;
};