// (mindset)/commitment-test.js

/**
 * 🎯 ENTERPRISE COMMITMENT ASSESSMENT SYSTEM
 * Production-ready mindset evaluation for Mosa Forge
 * Features: Psychological profiling, progress prediction, fraud detection, real-time analytics
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../../utils/logger');
const { MLService } = require('../../services/ml-service');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const crypto = require('crypto');

class CommitmentTest extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('CommitmentTest');
    this.mlService = new MLService();
    
    // Rate limiting: max 3 attempts per day per user
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (userId) => `commitment_test:${userId}`,
      points: 3,
      duration: 86400, // 24 hours
    });

    this.testConfig = {
      minScore: 70, // Minimum score to pass
      maxAttempts: 3,
      cooldownHours: 24,
      questionWeights: {
        financial_mindset: 0.25,
        discipline: 0.25,
        action_bias: 0.25,
        resilience: 0.25
      }
    };

    this.initialize();
  }

  /**
   * Initialize commitment test system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.loadQuestions();
      this.logger.info('Commitment test system initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize commitment test system', error);
      throw error;
    }
  }

  /**
   * 🎯 START COMMITMENT TEST - Entry point for mindset assessment
   */
  async startTest(studentId, userContext = {}) {
    const startTime = performance.now();

    try {
      // 🛡️ VALIDATION & FRAUD PREVENTION
      await this.validateTestEligibility(studentId, userContext);

      // 📊 GENERATE PERSONALIZED TEST
      const testSession = await this.createTestSession(studentId, userContext);

      // 🔍 PRE-TEST PSYCHOLOGICAL PROFILING
      const psychologicalProfile = await this.generatePsychologicalProfile(studentId, userContext);

      // 🎯 CALCULATE READINESS SCORE
      const readinessScore = await this.calculatePreTestReadiness(studentId, psychologicalProfile);

      const processingTime = performance.now() - startTime;

      this.logger.metric('test_start_processing_time', processingTime, {
        studentId,
        readinessScore,
        profileType: psychologicalProfile.type
      });

      return {
        success: true,
        testSessionId: testSession.id,
        questions: testSession.questions,
        psychologicalProfile,
        readinessScore,
        estimatedDuration: '15-20 minutes',
        instructions: this.getTestInstructions(),
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Commitment test start failed', error, { studentId });
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE TEST ELIGIBILITY
   */
  async validateTestEligibility(studentId, userContext) {
    // Required field validation
    if (!studentId) {
      throw new Error('STUDENT_ID_REQUIRED');
    }

    // Rate limiting check
    try {
      await this.rateLimiter.consume(studentId);
    } catch (rateLimitError) {
      throw new Error('TEST_ATTEMPTS_EXCEEDED');
    }

    // Student existence validation
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, status: true, faydaId: true }
    });

    if (!student) {
      throw new Error('STUDENT_NOT_FOUND');
    }

    if (student.status !== 'ACTIVE') {
      throw new Error('STUDENT_NOT_ACTIVE');
    }

    // Check for existing passed test
    const existingTest = await this.prisma.commitmentTest.findFirst({
      where: {
        studentId,
        status: 'PASSED'
      }
    });

    if (existingTest) {
      throw new Error('TEST_ALREADY_PASSED');
    }

    // Device fingerprinting for fraud prevention
    const deviceFingerprint = this.generateDeviceFingerprint(userContext);
    const suspiciousActivity = await this.detectSuspiciousActivity(studentId, deviceFingerprint);

    if (suspiciousActivity) {
      throw new Error('SUSPICIOUS_ACTIVITY_DETECTED');
    }

    this.logger.debug('Test eligibility validation passed', { studentId });
  }

  /**
   * 📊 CREATE PERSONALIZED TEST SESSION
   */
  async createTestSession(studentId, userContext) {
    return await this.prisma.$transaction(async (tx) => {
      // Generate personalized questions based on user profile
      const questions = await this.generatePersonalizedQuestions(studentId, userContext);

      const testSession = await tx.commitmentTest.create({
        data: {
          studentId,
          sessionId: crypto.randomUUID(),
          questions,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          metadata: {
            userContext,
            deviceFingerprint: this.generateDeviceFingerprint(userContext),
            ipAddress: userContext.ipAddress,
            userAgent: userContext.userAgent
          }
        }
      });

      // Cache test session for performance
      await this.cacheTestSession(testSession);

      this.logger.info('Test session created', { 
        studentId, 
        sessionId: testSession.sessionId,
        questionCount: questions.length 
      });

      return testSession;
    });
  }

  /**
   * 🧠 GENERATE PSYCHOLOGICAL PROFILE
   */
  async generatePsychologicalProfile(studentId, userContext) {
    const profileData = {
      studentId,
      timestamp: new Date(),
      dimensions: {}
    };

    // Analyze financial mindset patterns
    profileData.dimensions.financial_mindset = await this.analyzeFinancialMindset(userContext);
    
    // Assess discipline and consistency
    profileData.dimensions.discipline = await this.assessDisciplinePatterns(studentId, userContext);
    
    // Evaluate action bias and procrastination
    profileData.dimensions.action_bias = await this.evaluateActionBias(userContext);
    
    // Measure resilience and stress tolerance
    profileData.dimensions.resilience = await this.measureResilience(userContext);

    // Determine profile type
    profileData.type = this.determineProfileType(profileData.dimensions);
    
    // Calculate success probability
    profileData.successProbability = this.calculateSuccessProbability(profileData.dimensions);

    // Store profile for ML training
    await this.storePsychologicalProfile(profileData);

    return profileData;
  }

  /**
   * 💰 ANALYZE FINANCIAL MINDSET
   */
  async analyzeFinancialMindset(userContext) {
    const analysis = {
      score: 0,
      traits: {},
      riskLevel: 'MEDIUM'
    };

    // Analyze spending patterns if available
    if (userContext.financialBehavior) {
      analysis.traits.savings_habit = this.calculateSavingsHabitScore(userContext.financialBehavior);
      analysis.traits.investment_mindset = this.calculateInvestmentMindsetScore(userContext.financialBehavior);
      analysis.traits.risk_tolerance = this.calculateRiskTolerance(userContext.financialBehavior);
    }

    // Analyze financial goals
    if (userContext.financialGoals) {
      analysis.traits.goal_clarity = this.assessGoalClarity(userContext.financialGoals);
      analysis.traits.income_motivation = this.assessIncomeMotivation(userContext.financialGoals);
    }

    analysis.score = this.calculateFinancialMindsetScore(analysis.traits);
    analysis.riskLevel = this.determineFinancialRiskLevel(analysis.score);

    return analysis;
  }

  /**
   * ⏰ ASSESS DISCIPLINE PATTERNS
   */
  async assessDisciplinePatterns(studentId, userContext) {
    const discipline = {
      score: 0,
      patterns: {},
      consistency: 'MEDIUM'
    };

    // Check previous learning patterns if available
    const learningHistory = await this.getLearningHistory(studentId);
    if (learningHistory) {
      discipline.patterns.attendance_consistency = this.calculateAttendanceConsistency(learningHistory);
      discipline.patterns.completion_rate = this.calculateCompletionRate(learningHistory);
      discipline.patterns.time_management = this.assessTimeManagement(learningHistory);
    }

    // Analyze current behavior patterns
    discipline.patterns.current_habits = this.analyzeCurrentHabits(userContext);
    discipline.patterns.commitment_level = this.assessCommitmentLevel(userContext);

    discipline.score = this.calculateDisciplineScore(discipline.patterns);
    discipline.consistency = this.determineConsistencyLevel(discipline.score);

    return discipline;
  }

  /**
   * 🚀 EVALUATE ACTION BIAS
   */
  async evaluateActionBias(userContext) {
    const actionBias = {
      score: 0,
      indicators: {},
      biasType: 'BALANCED'
    };

    // Analyze decision-making patterns
    actionBias.indicators.decision_speed = this.assessDecisionSpeed(userContext);
    actionBias.indicators.procrastination_tendency = this.assessProcrastinationTendency(userContext);
    actionBias.indicators.initiative_level = this.assessInitiativeLevel(userContext);

    // Analyze past action patterns
    if (userContext.behavioralHistory) {
      actionBias.indicators.follow_through = this.assessFollowThrough(userContext.behavioralHistory);
      actionBias.indicators.adaptability = this.assessAdaptability(userContext.behavioralHistory);
    }

    actionBias.score = this.calculateActionBiasScore(actionBias.indicators);
    actionBias.biasType = this.determineActionBiasType(actionBias.score);

    return actionBias;
  }

  /**
   * 🛡️ MEASURE RESILIENCE
   */
  async measureResilience(userContext) {
    const resilience = {
      score: 0,
      factors: {},
      capacity: 'MEDIUM'
    };

    // Analyze stress response patterns
    resilience.factors.stress_tolerance = this.assessStressTolerance(userContext);
    resilience.factors.failure_response = this.assessFailureResponse(userContext);
    resilience.factors.adaptability = this.assessAdaptabilityCapacity(userContext);

    // Analyze support systems
    resilience.factors.support_network = this.assessSupportNetwork(userContext);
    resilience.factors.learning_orientation = this.assessLearningOrientation(userContext);

    resilience.score = this.calculateResilienceScore(resilience.factors);
    resilience.capacity = this.determineResilienceCapacity(resilience.score);

    return resilience;
  }

  /**
   * 🎯 SUBMIT TEST ANSWERS - Core assessment processing
   */
  async submitTestAnswers(testSessionId, answers, userContext = {}) {
    const startTime = performance.now();

    try {
      // 🛡️ VALIDATE SUBMISSION
      await this.validateAnswerSubmission(testSessionId, answers, userContext);

      // 📊 CALCULATE COMPREHENSIVE SCORES
      const assessmentResults = await this.calculateAssessmentScores(testSessionId, answers);

      // 🧠 PSYCHOLOGICAL ANALYSIS
      const psychologicalInsights = await this.analyzePsychologicalPatterns(answers);

      // 🎯 DETERMINE TEST OUTCOME
      const testOutcome = await this.determineTestOutcome(assessmentResults, psychologicalInsights);

      // 💾 STORE RESULTS & UPDATE STUDENT
      const finalResults = await this.storeTestResults(
        testSessionId, 
        assessmentResults, 
        psychologicalInsights, 
        testOutcome
      );

      // 📈 EMIT ANALYTICS EVENTS
      this.emit('commitmentTestCompleted', finalResults);

      const processingTime = performance.now() - startTime;

      this.logger.metric('test_submission_processing_time', processingTime, {
        testSessionId,
        overallScore: assessmentResults.overallScore,
        outcome: testOutcome.passed ? 'PASSED' : 'FAILED'
      });

      return {
        success: true,
        testOutcome: testOutcome.passed ? 'PASSED' : 'FAILED',
        overallScore: assessmentResults.overallScore,
        dimensionScores: assessmentResults.dimensionScores,
        psychologicalInsights,
        improvementRecommendations: testOutcome.recommendations,
        nextSteps: testOutcome.nextSteps,
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Test submission failed', error, { testSessionId });
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE ANSWER SUBMISSION
   */
  async validateAnswerSubmission(testSessionId, answers, userContext) {
    if (!testSessionId || !answers || !Array.isArray(answers)) {
      throw new Error('INVALID_SUBMISSION_DATA');
    }

    // Retrieve test session
    const testSession = await this.getTestSession(testSessionId);
    if (!testSession) {
      throw new Error('TEST_SESSION_NOT_FOUND');
    }

    if (testSession.status !== 'IN_PROGRESS') {
      throw new Error('TEST_SESSION_NOT_ACTIVE');
    }

    // Check session expiration (2 hours)
    const sessionAge = Date.now() - new Date(testSession.startedAt).getTime();
    if (sessionAge > 2 * 60 * 60 * 1000) {
      throw new Error('TEST_SESSION_EXPIRED');
    }

    // Validate answer structure
    const validationErrors = this.validateAnswerStructure(answers, testSession.questions);
    if (validationErrors.length > 0) {
      throw new Error(`ANSWER_VALIDATION_FAILED: ${validationErrors.join(', ')}`);
    }

    // Fraud detection - answer pattern analysis
    const fraudScore = await this.analyzeAnswerPatterns(answers, testSession, userContext);
    if (fraudScore > 0.7) {
      throw new Error('SUSPICIOUS_ANSWER_PATTERNS');
    }

    this.logger.debug('Answer submission validation passed', { testSessionId });
  }

  /**
   * 📊 CALCULATE ASSESSMENT SCORES
   */
  async calculateAssessmentScores(testSessionId, answers) {
    const testSession = await this.getTestSession(testSessionId);
    const questions = testSession.questions;

    const dimensionScores = {
      financial_mindset: { raw: 0, weighted: 0, count: 0 },
      discipline: { raw: 0, weighted: 0, count: 0 },
      action_bias: { raw: 0, weighted: 0, count: 0 },
      resilience: { raw: 0, weighted: 0, count: 0 }
    };

    // Calculate scores for each dimension
    answers.forEach(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) return;

      const dimension = question.dimension;
      const weight = question.weight || 1;
      const score = this.calculateQuestionScore(answer, question);

      dimensionScores[dimension].raw += score;
      dimensionScores[dimension].weighted += score * weight;
      dimensionScores[dimension].count++;
    });

    // Normalize scores
    Object.keys(dimensionScores).forEach(dimension => {
      if (dimensionScores[dimension].count > 0) {
        dimensionScores[dimension].normalized = 
          dimensionScores[dimension].weighted / dimensionScores[dimension].count;
      } else {
        dimensionScores[dimension].normalized = 0;
      }
    });

    // Calculate overall score
    const overallScore = this.calculateOverallScore(dimensionScores);

    return {
      overallScore,
      dimensionScores,
      rawScores: dimensionScores
    };
  }

  /**
   * 🧠 ANALYZE PSYCHOLOGICAL PATTERNS
   */
  async analyzePsychologicalPatterns(answers) {
    const insights = {
      dominantTraits: [],
      potentialChallenges: [],
      growthOpportunities: [],
      riskFactors: []
    };

    // Analyze answer patterns for psychological insights
    const responsePatterns = this.extractResponsePatterns(answers);
    
    // Identify dominant psychological traits
    insights.dominantTraits = this.identifyDominantTraits(responsePatterns);
    
    // Detect potential challenges
    insights.potentialChallenges = this.detectPotentialChallenges(responsePatterns);
    
    // Identify growth opportunities
    insights.growthOpportunities = this.identifyGrowthOpportunities(responsePatterns);
    
    // Assess risk factors for dropout
    insights.riskFactors = this.assessDropoutRisks(responsePatterns);

    // Calculate engagement probability
    insights.engagementProbability = this.calculateEngagementProbability(responsePatterns);

    return insights;
  }

  /**
   * 🎯 DETERMINE TEST OUTCOME
   */
  async determineTestOutcome(assessmentResults, psychologicalInsights) {
    const { overallScore, dimensionScores } = assessmentResults;
    const { engagementProbability, riskFactors } = psychologicalInsights;

    const passed = overallScore >= this.testConfig.minScore;
    const confidenceLevel = this.calculateConfidenceLevel(assessmentResults, psychologicalInsights);

    const recommendations = this.generateImprovementRecommendations(
      dimensionScores, 
      psychologicalInsights
    );

    const nextSteps = this.determineNextSteps(passed, confidenceLevel, recommendations);

    return {
      passed,
      overallScore,
      confidenceLevel,
      recommendations,
      nextSteps,
      retestEligible: !passed,
      retestAfter: !passed ? this.calculateRetestWaitPeriod(overallScore) : null
    };
  }

  /**
   * 💾 STORE TEST RESULTS
   */
  async storeTestResults(testSessionId, assessmentResults, psychologicalInsights, testOutcome) {
    return await this.prisma.$transaction(async (tx) => {
      // Update test session
      const updatedTest = await tx.commitmentTest.update({
        where: { id: testSessionId },
        data: {
          status: testOutcome.passed ? 'PASSED' : 'FAILED',
          completedAt: new Date(),
          overallScore: assessmentResults.overallScore,
          dimensionScores: assessmentResults.dimensionScores,
          psychologicalInsights,
          testOutcome,
          metadata: {
            ...updatedTest.metadata,
            processingTime: performance.now(),
            confidenceLevel: testOutcome.confidenceLevel
          }
        }
      });

      // Update student profile with test results
      await tx.student.update({
        where: { id: updatedTest.studentId },
        data: {
          commitmentTestScore: assessmentResults.overallScore,
          psychologicalProfile: psychologicalInsights,
          testStatus: testOutcome.passed ? 'PASSED' : 'FAILED',
          lastTestAttempt: new Date(),
          readinessLevel: this.calculateReadinessLevel(assessmentResults, psychologicalInsights)
        }
      });

      // Store analytics for ML improvement
      await this.storeTestAnalytics(updatedTest, assessmentResults, psychologicalInsights);

      // Clear cached session
      await this.clearCachedSession(testSessionId);

      this.logger.info('Test results stored', {
        studentId: updatedTest.studentId,
        testSessionId,
        overallScore: assessmentResults.overallScore,
        outcome: testOutcome.passed ? 'PASSED' : 'FAILED'
      });

      return {
        testSession: updatedTest,
        assessmentResults,
        psychologicalInsights,
        testOutcome
      };
    });
  }

  /**
   * 🔧 UTILITY METHODS
   */

  /**
   * Generate device fingerprint for fraud prevention
   */
  generateDeviceFingerprint(userContext) {
    const components = [
      userContext.userAgent,
      userContext.ipAddress,
      userContext.screenResolution,
      userContext.timezone,
      userContext.language
    ].filter(Boolean).join('|');

    return crypto.createHash('sha256').update(components).digest('hex');
  }

  /**
   * Load and cache test questions
   */
  async loadQuestions() {
    const cacheKey = 'commitment_test:questions';
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const questions = await this.prisma.commitmentQuestion.findMany({
      where: { status: 'ACTIVE' },
      include: { dimensions: true }
    });

    await this.redis.setex(cacheKey, 3600, JSON.stringify(questions));
    return questions;
  }

  /**
   * Generate personalized questions based on user profile
   */
  async generatePersonalizedQuestions(studentId, userContext) {
    const allQuestions = await this.loadQuestions();
    const profile = await this.generatePsychologicalProfile(studentId, userContext);

    // Weight questions based on psychological profile
    const weightedQuestions = allQuestions.map(question => {
      const dimensionWeight = this.testConfig.questionWeights[question.dimension] || 0.25;
      const profileRelevance = this.calculateQuestionRelevance(question, profile);
      
      return {
        ...question,
        weight: dimensionWeight * profileRelevance,
        relevanceScore: profileRelevance
      };
    });

    // Select top questions for each dimension
    const selectedQuestions = this.selectOptimalQuestionSet(weightedQuestions);

    return selectedQuestions.slice(0, 25); // Limit to 25 questions
  }

  /**
   * Cache test session for performance
   */
  async cacheTestSession(testSession) {
    const cacheKey = `test_session:${testSession.sessionId}`;
    await this.redis.setex(cacheKey, 7200, JSON.stringify(testSession)); // 2 hours
  }

  /**
   * Retrieve test session from cache or database
   */
  async getTestSession(testSessionId) {
    const cacheKey = `test_session:${testSessionId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const session = await this.prisma.commitmentTest.findUnique({
      where: { sessionId: testSessionId }
    });

    if (session) {
      await this.cacheTestSession(session);
    }

    return session;
  }

  /**
   * Clear cached session after completion
   */
  async clearCachedSession(testSessionId) {
    await this.redis.del(`test_session:${testSessionId}`);
  }

  /**
   * Get test instructions
   */
  getTestInstructions() {
    return {
      duration: '15-20 minutes',
      questionCount: 25,
      requiredScore: '70% or higher',
      retakePolicy: '3 attempts maximum with 24-hour cooldown',
      importance: 'Required for course enrollment',
      tips: [
        'Answer honestly - there are no right or wrong answers',
        'Consider your typical behavior and mindset',
        'Don\'t overthink - go with your first instinct',
        'This assessment helps us personalize your learning journey'
      ]
    };
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Commitment test system resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }

  // Additional helper methods would be implemented here...
  // calculateQuestionScore, validateAnswerStructure, analyzeAnswerPatterns, etc.
}

// Export singleton instance
module.exports = new CommitmentTest();