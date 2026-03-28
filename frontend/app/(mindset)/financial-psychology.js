// (mindset)/financial-psychology.js

/**
 * 🎯 ENTERPRISE FINANCIAL PSYCHOLOGY MODULE
 * Production-ready money psychology training for Mosa Forge
 * Features: Mindset assessment, behavioral economics, progress tracking, gamification
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../../utils/logger');
const { BehaviorAnalyzer } = require('../../utils/behavior-analyzer');
const { GamificationEngine } = require('../../utils/gamification-engine');

class FinancialPsychology extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('FinancialPsychology');
    this.behaviorAnalyzer = new BehaviorAnalyzer();
    this.gamificationEngine = new GamificationEngine();
    
    this.MODULE_CONFIG = {
      totalWeeks: 4,
      sessionsPerWeek: 5,
      masteryThreshold: 80, // 80% minimum score
      completionReward: 500, // Gamification points
      maxAttempts: 3,
      cooldownHours: 24
    };

    this.PSYCHOLOGY_DOMAINS = {
      MINDSET_SHIFT: 'from_scarcity_to_abundance',
      MONEY_SCRIPT: 'identifying_limiting_beliefs',
      FINANCIAL_BEHAVIOR: 'spending_saving_patterns',
      WEALTH_CONSCIOUSNESS: 'creator_vs_consumer',
      ACTION_BIAS: 'overcoming_procrastination'
    };

    this.initialize();
  }

  /**
   * Initialize financial psychology module
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.loadPsychologyExercises();
      this.logger.info('Financial Psychology module initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Financial Psychology module', error);
      throw error;
    }
  }

  /**
   * 🧠 START FINANCIAL PSYCHOLOGY JOURNEY
   */
  async startPsychologyJourney(studentId) {
    const startTime = performance.now();

    try {
      // 🛡️ VALIDATION & PREREQUISITES
      await this.validateStudentEligibility(studentId);

      // 📊 BASELINE ASSESSMENT
      const baselineScore = await this.conductBaselineAssessment(studentId);

      // 🎯 PERSONALIZED LEARNING PATH
      const learningPath = await this.createPersonalizedLearningPath(studentId, baselineScore);

      // 🏆 GAMIFICATION SETUP
      await this.initializeGamificationProfile(studentId);

      // 📈 PROGRESS TRACKING
      await this.initializeProgressTracking(studentId, learningPath);

      const processingTime = performance.now() - startTime;

      this.logger.info('Financial psychology journey started', {
        studentId,
        baselineScore,
        processingTime: `${processingTime.toFixed(2)}ms`
      });

      this.emit('psychologyJourneyStarted', {
        studentId,
        baselineScore,
        learningPath,
        startedAt: new Date()
      });

      return {
        success: true,
        baselineScore,
        learningPath,
        estimatedDuration: '4 weeks',
        totalModules: Object.keys(this.PSYCHOLOGY_DOMAINS).length,
        message: 'Financial psychology journey started successfully'
      };

    } catch (error) {
      this.logger.error('Failed to start financial psychology journey', error, { studentId });
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE STUDENT ELIGIBILITY
   */
  async validateStudentEligibility(studentId) {
    // Check if student exists and is active
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { mindsetPhase: true }
    });

    if (!student) {
      throw new Error('STUDENT_NOT_FOUND');
    }

    if (student.status !== 'ACTIVE') {
      throw new Error('STUDENT_NOT_ACTIVE');
    }

    // Check if already completed
    if (student.mindsetPhase?.financialPsychologyCompleted) {
      throw new Error('PSYCHOLOGY_MODULE_ALREADY_COMPLETED');
    }

    // Check prerequisite: Wealth Consciousness module
    const wealthConsciousness = await this.prisma.mindsetProgress.findFirst({
      where: {
        studentId,
        module: 'WEALTH_CONSCIOUSNESS',
        status: 'COMPLETED'
      }
    });

    if (!wealthConsciousness) {
      throw new Error('PREREQUISITE_MODULE_NOT_COMPLETED');
    }

    return true;
  }

  /**
   * 📊 CONDUCT BASELINE PSYCHOLOGY ASSESSMENT
   */
  async conductBaselineAssessment(studentId) {
    const assessmentKey = `psychology:baseline:${studentId}`;
    
    // Check cache first
    const cached = await this.redis.get(assessmentKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const assessment = {
      domains: {},
      overallScore: 0,
      behavioralPatterns: [],
      recommendedFocus: []
    };

    // Domain 1: Money Mindset Assessment
    const mindsetScore = await this.assessMoneyMindset(studentId);
    assessment.domains.mindset = mindsetScore;

    // Domain 2: Financial Behavior Patterns
    const behaviorScore = await this.assessFinancialBehavior(studentId);
    assessment.domains.behavior = behaviorScore;

    // Domain 3: Wealth Consciousness Level
    const consciousnessScore = await this.assessWealthConsciousness(studentId);
    assessment.domains.consciousness = consciousnessScore;

    // Domain 4: Action Bias Assessment
    const actionScore = await this.assessActionBias(studentId);
    assessment.domains.action = actionScore;

    // Calculate overall score
    assessment.overallScore = this.calculateOverallScore(assessment.domains);

    // Identify behavioral patterns
    assessment.behavioralPatterns = await this.identifyBehavioralPatterns(assessment.domains);

    // Generate personalized recommendations
    assessment.recommendedFocus = this.generateLearningRecommendations(assessment);

    // Store assessment
    await this.prisma.psychologyAssessment.create({
      data: {
        studentId,
        assessmentData: assessment,
        overallScore: assessment.overallScore,
        type: 'BASELINE'
      }
    });

    // Cache for 1 week
    await this.redis.setex(assessmentKey, 604800, JSON.stringify(assessment));

    return assessment;
  }

  /**
   * 🧠 ASSESS MONEY MINDSET
   */
  async assessMoneyMindset(studentId) {
    const questions = [
      {
        id: 'mm_1',
        text: 'I believe there is enough money for everyone to prosper',
        category: 'SCARCITY_ABUNDANCE',
        weight: 0.25
      },
      {
        id: 'mm_2', 
        text: 'I feel confident in my ability to create wealth',
        category: 'SELF_EFFICACY',
        weight: 0.25
      },
      {
        id: 'mm_3',
        text: 'Money comes to me easily and frequently',
        category: 'MONEY_FLOW',
        weight: 0.25
      },
      {
        id: 'mm_4',
        text: 'I deserve to be wealthy and prosperous',
        category: 'SELF_WORTH',
        weight: 0.25
      }
    ];

    const responses = await this.collectStudentResponses(studentId, questions, 'MINDSET_ASSESSMENT');
    return this.calculateDomainScore(responses, questions);
  }

  /**
   * 💰 ASSESS FINANCIAL BEHAVIOR
   */
  async assessFinancialBehavior(studentId) {
    const scenarios = [
      {
        id: 'fb_1',
        scenario: 'You receive an unexpected 1000 ETB. What do you do?',
        options: [
          { text: 'Save it for future opportunities', score: 10, pattern: 'INVESTOR' },
          { text: 'Spend it on immediate needs', score: 5, pattern: 'CONSUMER' },
          { text: 'Pay off existing debts', score: 7, pattern: 'DEBT_MANAGER' },
          { text: 'Invest in learning a new skill', score: 9, pattern: 'SELF_INVESTOR' }
        ],
        category: 'WINDALL_MANAGEMENT',
        weight: 0.2
      },
      {
        id: 'fb_2',
        scenario: 'When facing financial pressure, you tend to:',
        options: [
          { text: 'Create new income streams', score: 10, pattern: 'PROBLEM_SOLVER' },
          { text: 'Cut expenses aggressively', score: 6, pattern: 'BUDGET_CUTTER' },
          { text: 'Worry but take no action', score: 3, pattern: 'AVOIDER' },
          { text: 'Seek advice from successful people', score: 8, pattern: 'LEARNER' }
        ],
        category: 'STRESS_RESPONSE',
        weight: 0.2
      }
      // Additional scenarios would be implemented here
    ];

    const responses = await this.collectScenarioResponses(studentId, scenarios);
    return this.calculateBehavioralScore(responses, scenarios);
  }

  /**
   * 🌟 ASSESS WEALTH CONSCIOUSNESS
   */
  async assessWealthConsciousness(studentId) {
    const consciousnessIndicators = [
      {
        indicator: 'VISION_CLARITY',
        questions: [
          'I have a clear picture of my ideal wealthy life',
          'I regularly visualize my financial goals',
          'I believe my current actions align with future wealth'
        ],
        weight: 0.3
      },
      {
        indicator: 'OPPORTUNITY_RECOGNITION', 
        questions: [
          'I see money-making opportunities everywhere',
          'I convert ideas into income streams regularly',
          'I learn from wealthy people around me'
        ],
        weight: 0.3
      },
      {
        indicator: 'VALUE_CREATION',
        questions: [
          'I focus on creating value for others',
          'I solve problems that people will pay for',
          'I continuously improve my skills'
        ],
        weight: 0.4
      }
    ];

    const consciousnessScore = await this.evaluateConsciousnessLevel(studentId, consciousnessIndicators);
    return consciousnessScore;
  }

  /**
   * 🎯 ASSESS ACTION BIAS
   */
  async assessActionBias(studentId) {
    const actionPatterns = [
      {
        pattern: 'PROCRASTINATION_TENDENCY',
        assessment: await this.measureProcrastination(studentId),
        weight: 0.4
      },
      {
        pattern: 'DECISION_VELOCITY', 
        assessment: await this.measureDecisionSpeed(studentId),
        weight: 0.3
      },
      {
        pattern: 'IMPLEMENTATION_CONSTANCY',
        assessment: await this.measureImplementationRate(studentId),
        weight: 0.3
      }
    ];

    return this.calculateActionScore(actionPatterns);
  }

  /**
   * 🎯 CREATE PERSONALIZED LEARNING PATH
   */
  async createPersonalizedLearningPath(studentId, baselineAssessment) {
    const learningPath = {
      studentId,
      baselineScore: baselineAssessment.overallScore,
      focusAreas: [],
      weeklySchedule: {},
      estimatedCompletion: new Date(Date.now() + (28 * 24 * 60 * 60 * 1000)), // 4 weeks
      adaptiveAdjustments: true
    };

    // Determine focus areas based on assessment
    const weakDomains = this.identifyWeakDomains(baselineAssessment.domains);
    learningPath.focusAreas = weakDomains;

    // Create weekly schedule
    learningPath.weeklySchedule = this.generateWeeklySchedule(weakDomains);

    // Set mastery goals
    learningPath.masteryGoals = this.setMasteryGoals(baselineAssessment);

    // Store learning path
    await this.prisma.learningPath.create({
      data: {
        studentId,
        pathType: 'FINANCIAL_PSYCHOLOGY',
        pathData: learningPath,
        status: 'ACTIVE'
      }
    });

    return learningPath;
  }

  /**
   * 🏆 INITIALIZE GAMIFICATION PROFILE
   */
  async initializeGamificationProfile(studentId) {
    const gamificationProfile = {
      studentId,
      module: 'FINANCIAL_PSYCHOLOGY',
      currentLevel: 1,
      totalPoints: 0,
      badges: [],
      streak: 0,
      dailyGoals: this.generateDailyGoals(),
      rewards: this.initializeRewards()
    };

    await this.redis.setex(
      `gamification:psychology:${studentId}`, 
      604800, // 1 week
      JSON.stringify(gamificationProfile)
    );

    return gamificationProfile;
  }

  /**
   * 📈 INITIALIZE PROGRESS TRACKING
   */
  async initializeProgressTracking(studentId, learningPath) {
    const progress = {
      studentId,
      module: 'FINANCIAL_PSYCHOLOGY',
      startedAt: new Date(),
      currentWeek: 1,
      currentSession: 1,
      completionPercentage: 0,
      domainScores: {},
      lastActivity: new Date(),
      streak: 0
    };

    await this.prisma.mindsetProgress.create({
      data: progress
    });

    // Initialize Redis tracking
    await this.redis.hset(
      `progress:psychology:${studentId}`,
      'currentWeek', 1,
      'currentSession', 1,
      'completion', 0,
      'lastUpdated', Date.now()
    );

    return progress;
  }

  /**
   * 🎯 COMPLETE PSYCHOLOGY SESSION
   */
  async completeSession(studentId, sessionData) {
    try {
      // 🛡️ SESSION VALIDATION
      await this.validateSessionCompletion(studentId, sessionData);

      // 📊 PERFORMANCE ASSESSMENT
      const sessionScore = await this.assessSessionPerformance(sessionData);

      // 🏆 GAMIFICATION REWARDS
      const rewards = await this.awardSessionCompletion(studentId, sessionScore);

      // 📈 PROGRESS UPDATE
      const progressUpdate = await this.updateStudentProgress(studentId, sessionData, sessionScore);

      // 🔄 ADAPTIVE LEARNING ADJUSTMENT
      await this.adjustLearningPath(studentId, sessionScore);

      // 🎉 COMPLETION CHECK
      if (progressUpdate.weekCompleted === this.MODULE_CONFIG.totalWeeks) {
        await this.handleModuleCompletion(studentId);
      }

      this.emit('sessionCompleted', {
        studentId,
        sessionData,
        sessionScore,
        rewards,
        progressUpdate
      });

      return {
        success: true,
        sessionScore,
        rewards,
        progressUpdate,
        nextSession: this.getNextSession(studentId)
      };

    } catch (error) {
      this.logger.error('Session completion failed', error, { studentId, sessionData });
      throw error;
    }
  }

  /**
   * 🧠 CONDUCT PSYCHOLOGY EXERCISE
   */
  async conductPsychologyExercise(studentId, exerciseType, responses) {
    const exercise = await this.getExercise(exerciseType);
    
    if (!exercise) {
      throw new Error('EXERCISE_NOT_FOUND');
    }

    // Validate exercise attempt
    await this.validateExerciseAttempt(studentId, exerciseType);

    // Process responses
    const analysis = await this.analyzeExerciseResponses(exercise, responses);

    // Update behavioral patterns
    await this.updateBehavioralProfile(studentId, analysis);

    // Award points
    const points = this.calculateExercisePoints(analysis.insightScore);

    // Store exercise result
    await this.storeExerciseResult(studentId, exerciseType, responses, analysis, points);

    return {
      analysis,
      points,
      recommendations: analysis.recommendations,
      nextExercise: this.suggestNextExercise(studentId, analysis)
    };
  }

  /**
   * 📊 GET STUDENT PSYCHOLOGY INSIGHTS
   */
  async getStudentInsights(studentId) {
    const cacheKey = `insights:psychology:${studentId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const insights = {
      behavioralPatterns: await this.getBehavioralPatterns(studentId),
      progressMetrics: await this.getProgressMetrics(studentId),
      transformationIndicators: await this.getTransformationIndicators(studentId),
      recommendations: await this.generatePersonalizedRecommendations(studentId),
      comparisonData: await this.getPeerComparison(studentId)
    };

    // Cache for 6 hours
    await this.redis.setex(cacheKey, 21600, JSON.stringify(insights));

    return insights;
  }

  /**
   * 🔄 UPDATE BEHAVIORAL PROFILE
   */
  async updateBehavioralProfile(studentId, analysis) {
    const profileKey = `behavior:profile:${studentId}`;
    
    let profile = await this.redis.get(profileKey);
    profile = profile ? JSON.parse(profile) : { patterns: {}, updates: [] };

    // Update patterns based on new analysis
    Object.entries(analysis.patterns).forEach(([pattern, data]) => {
      if (!profile.patterns[pattern]) {
        profile.patterns[pattern] = { firstObserved: new Date(), strength: 0 };
      }
      profile.patterns[pattern].strength = this.calculatePatternStrength(
        profile.patterns[pattern].strength, 
        data.strength
      );
      profile.patterns[pattern].lastObserved = new Date();
    });

    // Record update
    profile.updates.push({
      timestamp: new Date(),
      analysis: analysis.summary,
      impact: analysis.impactScore
    });

    // Keep only last 50 updates
    if (profile.updates.length > 50) {
      profile.updates = profile.updates.slice(-50);
    }

    await this.redis.setex(profileKey, 2592000, JSON.stringify(profile)); // 30 days

    // Store in database for long-term analysis
    await this.prisma.behavioralProfile.upsert({
      where: { studentId },
      update: { profileData: profile, lastUpdated: new Date() },
      create: { studentId, profileData: profile }
    });
  }

  /**
   * 🎯 HANDLE MODULE COMPLETION
   */
  async handleModuleCompletion(studentId) {
    // Calculate final assessment
    const finalAssessment = await this.conductFinalAssessment(studentId);

    // Award completion badge and points
    await this.awardModuleCompletion(studentId, finalAssessment);

    // Update student record
    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        mindsetPhase: {
          update: {
            financialPsychologyCompleted: true,
            financialPsychologyCompletedAt: new Date(),
            finalPsychologyScore: finalAssessment.overallScore
          }
        }
      }
    });

    // Generate completion certificate
    const certificate = await this.generatePsychologyCertificate(studentId, finalAssessment);

    this.emit('psychologyModuleCompleted', {
      studentId,
      finalAssessment,
      certificate,
      completedAt: new Date()
    });

    return {
      success: true,
      finalAssessment,
      certificate,
      message: 'Financial Psychology module completed successfully!'
    };
  }

  /**
   * 🧪 CONDUCT FINAL ASSESSMENT
   */
  async conductFinalAssessment(studentId) {
    const baseline = await this.getBaselineAssessment(studentId);
    const current = await this.conductBaselineAssessment(studentId); // Re-assess

    const improvement = {
      overall: current.overallScore - baseline.overallScore,
      byDomain: {}
    };

    Object.keys(baseline.domains).forEach(domain => {
      improvement.byDomain[domain] = current.domains[domain] - baseline.domains[domain];
    });

    return {
      baselineScore: baseline.overallScore,
      finalScore: current.overallScore,
      improvement,
      transformationLevel: this.calculateTransformationLevel(improvement.overall),
      behavioralShifts: await this.identifyBehavioralShifts(studentId)
    };
  }

  /**
   * 🏆 AWARD MODULE COMPLETION
   */
  async awardModuleCompletion(studentId, finalAssessment) {
    const points = this.MODULE_CONFIG.completionReward;
    const bonusPoints = Math.floor(finalAssessment.improvement.overall * 10);

    await this.gamificationEngine.awardPoints(
      studentId, 
      'FINANCIAL_PSYCHOLOGY_COMPLETION', 
      points + bonusPoints
    );

    await this.gamificationEngine.awardBadge(
      studentId,
      'WEALTH_MINDED_THINKER',
      {
        finalScore: finalAssessment.finalScore,
        improvement: finalAssessment.improvement.overall,
        completionDate: new Date()
      }
    );
  }

  /**
   * 📜 GENERATE PSYCHOLOGY CERTIFICATE
   */
  async generatePsychologyCertificate(studentId, finalAssessment) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { name: true, faydaId: true }
    });

    const certificate = {
      studentName: student.name,
      faydaId: student.faydaId,
      module: 'Financial Psychology',
      completionDate: new Date(),
      finalScore: finalAssessment.finalScore,
      improvement: finalAssessment.improvement.overall,
      transformationLevel: finalAssessment.transformationLevel,
      certificateId: `MOSA-PSYCH-${Date.now()}-${student.faydaId}`,
      verificationUrl: `${process.env.PLATFORM_URL}/verify/${student.faydaId}`
    };

    await this.prisma.certificate.create({
      data: {
        studentId,
        certificateType: 'FINANCIAL_PSYCHOLOGY',
        certificateData: certificate,
        issuedAt: new Date(),
        expiresAt: null // Never expires
      }
    });

    return certificate;
  }

  /**
   * 🔧 UTILITY METHODS
   */

  async loadPsychologyExercises() {
    // This would load from database or configuration
    this.exercises = {
      MINDSET_SHIFT: require('./exercises/mindset-shift.json'),
      MONEY_SCRIPT: require('./exercises/money-script.json'),
      FINANCIAL_BEHAVIOR: require('./exercises/financial-behavior.json'),
      WEALTH_CONSCIOUSNESS: require('./exercises/wealth-consciousness.json'),
      ACTION_BIAS: require('./exercises/action-bias.json')
    };
  }

  calculateOverallScore(domainScores) {
    const weights = {
      mindset: 0.3,
      behavior: 0.3,
      consciousness: 0.25,
      action: 0.15
    };

    return Object.entries(domainScores).reduce((total, [domain, score]) => {
      return total + (score * weights[domain]);
    }, 0);
  }

  identifyWeakDomains(domainScores) {
    const threshold = 7; // Below 7 needs focus
    return Object.entries(domainScores)
      .filter(([domain, score]) => score < threshold)
      .map(([domain]) => domain);
  }

  calculateTransformationLevel(improvement) {
    if (improvement >= 3) return 'TRANSFORMATIONAL';
    if (improvement >= 2) return 'SIGNIFICANT';
    if (improvement >= 1) return 'MODERATE';
    return 'MINIMAL';
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Financial Psychology module resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new FinancialPsychology();