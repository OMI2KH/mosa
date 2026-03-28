// certification-service/final-assessment.js

/**
 * 🎯 ENTERPRISE FINAL ASSESSMENT SYSTEM
 * Production-ready final evaluation for Mosa Forge certification
 * Features: AI-powered evaluation, Yachi integration, quality assurance
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
const axios = require('axios');

class FinalAssessmentSystem extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('FinalAssessment');
    this.qualityCalculator = new QualityCalculator();
    
    // Yachi API configuration
    this.yachiApi = axios.create({
      baseURL: process.env.YACHI_API_BASE_URL,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${process.env.YACHI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Rate limiting: max 3 assessment attempts per student
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (req) => `assessment_limit:${req.studentId}`,
      points: 3,
      duration: 86400, // 24 hours
    });

    this.assessmentCriteria = {
      MINIMUM_SCORE: 80, // 80% required to pass
      MAX_ATTEMPTS: 3,
      TIME_LIMIT: 7200, // 2 hours in seconds
      COMPREHENSIVE_SECTIONS: ['theory', 'practical', 'decision_making', 'portfolio']
    };

    this.initialize();
  }

  /**
   * Initialize assessment system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.prisma.$connect();
      
      // Warm up assessment templates cache
      await this.warmUpAssessmentTemplates();
      
      this.logger.info('Final assessment system initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize assessment system', error);
      throw error;
    }
  }

  /**
   * 🎯 INITIATE FINAL ASSESSMENT
   */
  async initiateAssessment(assessmentData) {
    const startTime = performance.now();
    
    try {
      // 🛡️ VALIDATION PHASE
      await this.validateAssessmentInitiation(assessmentData);

      const { studentId, skillId, enrollmentId } = assessmentData;

      // 📋 CREATE ASSESSMENT SESSION
      const assessmentSession = await this.createAssessmentSession({
        studentId,
        skillId,
        enrollmentId
      });

      // 🎯 GENERATE ASSESSMENT CONTENT
      const assessmentContent = await this.generateAssessmentContent(skillId, studentId);

      // 💾 STORE ASSESSMENT DATA
      await this.storeAssessmentData(assessmentSession.id, assessmentContent);

      // 🔔 NOTIFY STUDENT
      await this.notifyStudentAssessmentReady(studentId, assessmentSession.id);

      const processingTime = performance.now() - startTime;
      
      this.logger.metric('assessment_initiation_time', processingTime, {
        studentId,
        skillId,
        assessmentId: assessmentSession.id
      });

      return {
        success: true,
        assessmentId: assessmentSession.id,
        accessToken: assessmentSession.accessToken,
        timeLimit: this.assessmentCriteria.TIME_LIMIT,
        sections: assessmentContent.sections,
        instructions: assessmentContent.instructions,
        expiresAt: assessmentSession.expiresAt
      };

    } catch (error) {
      this.logger.error('Assessment initiation failed', error, { assessmentData });
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE ASSESSMENT INITIATION
   */
  async validateAssessmentInitiation(assessmentData) {
    const { studentId, skillId, enrollmentId } = assessmentData;

    // Required fields validation
    if (!studentId || !skillId || !enrollmentId) {
      throw new Error('MISSING_REQUIRED_FIELDS');
    }

    // Enrollment validation
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        skill: true,
        trainingSessions: {
          where: { status: 'COMPLETED' }
        }
      }
    });

    if (!enrollment) {
      throw new Error('ENROLLMENT_NOT_FOUND');
    }

    if (enrollment.studentId !== studentId) {
      throw new Error('UNAUTHORIZED_ASSESSMENT_ACCESS');
    }

    if (enrollment.status !== 'TRAINING_COMPLETED') {
      throw new Error('TRAINING_NOT_COMPLETED');
    }

    // Check minimum completed sessions
    const minSessionsRequired = 8; // 2 months, 1 session per week
    if (enrollment.trainingSessions.length < minSessionsRequired) {
      throw new Error('INSUFFICIENT_TRAINING_SESSIONS');
    }

    // Rate limiting check
    try {
      await this.rateLimiter.consume(`student:${studentId}`);
    } catch (rateLimitError) {
      throw new Error('ASSESSMENT_ATTEMPTS_EXCEEDED');
    }

    // Check for existing active assessment
    const existingAssessment = await this.prisma.assessment.findFirst({
      where: {
        enrollmentId,
        status: { in: ['IN_PROGRESS', 'PENDING_REVIEW'] }
      }
    });

    if (existingAssessment) {
      throw new Error('ACTIVE_ASSESSMENT_EXISTS');
    }

    this.logger.debug('Assessment validation passed', { studentId, skillId, enrollmentId });
  }

  /**
   * 📋 CREATE ASSESSMENT SESSION
   */
  async createAssessmentSession(assessmentData) {
    const { studentId, skillId, enrollmentId } = assessmentData;

    const accessToken = this.generateAccessToken();
    const expiresAt = new Date(Date.now() + (this.assessmentCriteria.TIME_LIMIT * 1000));

    return await this.prisma.assessment.create({
      data: {
        studentId,
        skillId,
        enrollmentId,
        accessToken,
        status: 'IN_PROGRESS',
        attempts: 1,
        timeLimit: this.assessmentCriteria.TIME_LIMIT,
        expiresAt,
        startedAt: new Date(),
        metadata: {
          ipAddress: assessmentData.ipAddress,
          userAgent: assessmentData.userAgent,
          initiationTime: new Date().toISOString()
        }
      }
    });
  }

  /**
   * 🎯 GENERATE ASSESSMENT CONTENT
   */
  async generateAssessmentContent(skillId, studentId) {
    const cacheKey = `assessment:template:${skillId}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Generate personalized assessment
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
      include: { assessmentTemplates: true }
    });

    if (!skill) {
      throw new Error('SKILL_NOT_FOUND');
    }

    const studentProgress = await this.getStudentProgress(studentId, skillId);
    const assessmentContent = await this.buildPersonalizedAssessment(skill, studentProgress);

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(assessmentContent));

    return assessmentContent;
  }

  /**
   * 🎯 BUILD PERSONALIZED ASSESSMENT
   */
  async buildPersonalizedAssessment(skill, studentProgress) {
    const sections = [];

    // 1. THEORY SECTION (30%)
    sections.push({
      type: 'theory',
      weight: 30,
      questions: await this.generateTheoryQuestions(skill, studentProgress),
      timeLimit: 1800 // 30 minutes
    });

    // 2. PRACTICAL SECTION (40%)
    sections.push({
      type: 'practical',
      weight: 40,
      scenarios: await this.generatePracticalScenarios(skill, studentProgress),
      timeLimit: 2700 // 45 minutes
    });

    // 3. DECISION MAKING SECTION (20%)
    sections.push({
      type: 'decision_making',
      weight: 20,
      cases: await this.generateDecisionCases(skill),
      timeLimit: 900 // 15 minutes
    });

    // 4. PORTFOLIO REVIEW SECTION (10%)
    sections.push({
      type: 'portfolio',
      weight: 10,
      requirements: await this.generatePortfolioRequirements(skill),
      timeLimit: 900 // 15 minutes
    });

    return {
      sections,
      instructions: this.generateAssessmentInstructions(skill),
      totalPoints: 100,
      passingScore: this.assessmentCriteria.MINIMUM_SCORE,
      skillLevel: this.determineSkillLevel(studentProgress)
    };
  }

  /**
   * 📝 GENERATE THEORY QUESTIONS
   */
  async generateTheoryQuestions(skill, studentProgress) {
    const template = await this.prisma.assessmentTemplate.findFirst({
      where: {
        skillId: skill.id,
        type: 'THEORY'
      }
    });

    if (!template) {
      throw new Error('ASSESSMENT_TEMPLATE_NOT_FOUND');
    }

    // AI-powered question generation based on student progress
    const weakAreas = studentProgress.weakAreas || [];
    const strongAreas = studentProgress.strongAreas || [];

    return {
      multipleChoice: this.generateMCQuestions(template, weakAreas, 15),
      trueFalse: this.generateTFQuestions(template, 5),
      shortAnswer: this.generateSAQuestions(template, strongAreas, 3)
    };
  }

  /**
   * 🛠️ GENERATE PRACTICAL SCENARIOS
   */
  async generatePracticalScenarios(skill, studentProgress) {
    const template = await this.prisma.assessmentTemplate.findFirst({
      where: {
        skillId: skill.id,
        type: 'PRACTICAL'
      }
    });

    if (!template) {
      throw new Error('PRACTICAL_TEMPLATE_NOT_FOUND');
    }

    // Real-world scenarios based on skill type
    const scenarios = [];
    
    switch (skill.category) {
      case 'ONLINE_SKILLS':
        scenarios.push(...this.generateOnlineSkillScenarios(skill, studentProgress));
        break;
      case 'OFFLINE_SKILLS':
        scenarios.push(...this.generateOfflineSkillScenarios(skill, studentProgress));
        break;
      case 'HEALTH_SPORTS':
        scenarios.push(...this.generateHealthSkillScenarios(skill, studentProgress));
        break;
      case 'BEAUTY_FASHION':
        scenarios.push(...this.generateBeautySkillScenarios(skill, studentProgress));
        break;
    }

    return scenarios;
  }

  /**
   * 💡 GENERATE DECISION CASES
   */
  async generateDecisionCases(skill) {
    // Real-time decision making scenarios
    return [
      {
        scenario: "Client requests modification beyond initial scope",
        decisions: [
          "Accept without additional charge",
          "Quote additional fees",
          "Decline the request",
          "Negotiate compromise"
        ],
        evaluationCriteria: ["profitability", "client_relations", "professionalism"]
      },
      {
        scenario: "Technical issue prevents delivery deadline",
        decisions: [
          "Deliver incomplete work",
          "Request extension",
          "Work overtime to complete",
          "Subcontract portion of work"
        ],
        evaluationCriteria: ["integrity", "problem_solving", "time_management"]
      }
    ];
  }

  /**
   * 📊 SUBMIT ASSESSMENT ANSWERS
   */
  async submitAssessmentAnswers(submissionData) {
    const startTime = performance.now();
    
    try {
      // 🛡️ VALIDATE SUBMISSION
      await this.validateAssessmentSubmission(submissionData);

      const { assessmentId, answers, studentId, accessToken } = submissionData;

      // 🔍 VERIFY ASSESSMENT ACCESS
      const assessment = await this.verifyAssessmentAccess(assessmentId, studentId, accessToken);

      // 📝 EVALUATE ANSWERS
      const evaluationResult = await this.evaluateAnswers(assessment, answers);

      // 🎯 DETERMINE PASS/FAIL
      const finalResult = await this.determineFinalResult(assessment, evaluationResult);

      // 💾 STORE RESULTS
      const completedAssessment = await this.storeAssessmentResults(assessment.id, evaluationResult, finalResult);

      // 🔔 EMIT EVENTS
      this.emit('assessmentCompleted', {
        assessmentId: assessment.id,
        studentId,
        result: finalResult,
        score: evaluationResult.totalScore
      });

      // 🏆 HANDLE PASSING RESULTS
      if (finalResult.passed) {
        await this.handlePassingAssessment(assessment, finalResult);
      }

      const processingTime = performance.now() - startTime;
      this.logger.metric('assessment_evaluation_time', processingTime, {
        assessmentId,
        studentId,
        totalScore: evaluationResult.totalScore
      });

      return {
        success: true,
        passed: finalResult.passed,
        totalScore: evaluationResult.totalScore,
        sectionScores: evaluationResult.sectionScores,
        certificateReady: finalResult.passed,
        nextSteps: this.generateNextSteps(finalResult.passed, assessment.skillId)
      };

    } catch (error) {
      this.logger.error('Assessment submission failed', error, { submissionData });
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE ASSESSMENT SUBMISSION
   */
  async validateAssessmentSubmission(submissionData) {
    const { assessmentId, answers, studentId, accessToken } = submissionData;

    if (!assessmentId || !answers || !studentId || !accessToken) {
      throw new Error('MISSING_SUBMISSION_DATA');
    }

    // Check if assessment exists and is accessible
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId }
    });

    if (!assessment) {
      throw new Error('ASSESSMENT_NOT_FOUND');
    }

    if (assessment.studentId !== studentId) {
      throw new Error('UNAUTHORIZED_SUBMISSION');
    }

    if (assessment.accessToken !== accessToken) {
      throw new Error('INVALID_ACCESS_TOKEN');
    }

    if (assessment.status !== 'IN_PROGRESS') {
      throw new Error('ASSESSMENT_NOT_ACTIVE');
    }

    if (assessment.expiresAt < new Date()) {
      throw new Error('ASSESSMENT_EXPIRED');
    }

    // Validate answer structure
    if (!this.validateAnswerStructure(answers)) {
      throw new Error('INVALID_ANSWER_STRUCTURE');
    }
  }

  /**
   * 📝 EVALUATE ANSWERS
   */
  async evaluateAnswers(assessment, answers) {
    const evaluationStart = performance.now();

    // Evaluate each section
    const sectionScores = {};
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const [sectionName, sectionAnswers] of Object.entries(answers)) {
      const sectionEvaluation = await this.evaluateSection(sectionName, sectionAnswers, assessment.skillId);
      sectionScores[sectionName] = sectionEvaluation;

      totalWeightedScore += sectionEvaluation.score * sectionEvaluation.weight;
      totalWeight += sectionEvaluation.weight;
    }

    const totalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    const evaluationTime = performance.now() - evaluationStart;
    this.logger.metric('section_evaluation_time', evaluationTime, {
      assessmentId: assessment.id,
      totalScore
    });

    return {
      totalScore: Math.round(totalScore * 100) / 100, // Round to 2 decimal places
      sectionScores,
      evaluatedAt: new Date(),
      evaluationTime: `${evaluationTime.toFixed(2)}ms`
    };
  }

  /**
   * 🎯 EVALUATE SECTION
   */
  async evaluateSection(sectionName, answers, skillId) {
    const sectionConfig = this.getSectionConfig(sectionName);
    
    switch (sectionName) {
      case 'theory':
        return await this.evaluateTheorySection(answers, skillId, sectionConfig);
      case 'practical':
        return await this.evaluatePracticalSection(answers, skillId, sectionConfig);
      case 'decision_making':
        return await this.evaluateDecisionSection(answers, skillId, sectionConfig);
      case 'portfolio':
        return await this.evaluatePortfolioSection(answers, skillId, sectionConfig);
      default:
        throw new Error(`UNKNOWN_SECTION: ${sectionName}`);
    }
  }

  /**
   * 📚 EVALUATE THEORY SECTION
   */
  async evaluateTheorySection(answers, skillId, config) {
    const { multipleChoice = [], trueFalse = [], shortAnswer = [] } = answers;
    
    let correctMC = 0;
    let correctTF = 0;
    let shortAnswerScore = 0;

    // Evaluate multiple choice
    for (const answer of multipleChoice) {
      const isCorrect = await this.validateMCAnswer(answer.questionId, answer.selectedOption, skillId);
      if (isCorrect) correctMC++;
    }

    // Evaluate true/false
    for (const answer of trueFalse) {
      const isCorrect = await this.validateTFAnswer(answer.questionId, answer.answer, skillId);
      if (isCorrect) correctTF++;
    }

    // Evaluate short answers (AI-powered)
    for (const answer of shortAnswer) {
      const score = await this.evaluateShortAnswer(answer.questionId, answer.answer, skillId);
      shortAnswerScore += score;
    }

    const mcScore = multipleChoice.length > 0 ? (correctMC / multipleChoice.length) * 100 : 0;
    const tfScore = trueFalse.length > 0 ? (correctTF / trueFalse.length) * 100 : 0;
    const saScore = shortAnswer.length > 0 ? (shortAnswerScore / shortAnswer.length) : 0;

    const totalScore = (mcScore * 0.5) + (tfScore * 0.2) + (saScore * 0.3);

    return {
      score: Math.round(totalScore * 100) / 100,
      weight: config.weight,
      breakdown: {
        multipleChoice: { score: mcScore, total: multipleChoice.length, correct: correctMC },
        trueFalse: { score: tfScore, total: trueFalse.length, correct: correctTF },
        shortAnswer: { score: saScore, total: shortAnswer.length, average: shortAnswerScore }
      }
    };
  }

  /**
   * 🛠️ EVALUATE PRACTICAL SECTION
   */
  async evaluatePracticalSection(answers, skillId, config) {
    let totalScore = 0;
    const scenarioEvaluations = [];

    for (const scenarioAnswer of answers.scenarios || []) {
      const evaluation = await this.evaluatePracticalScenario(scenarioAnswer, skillId);
      scenarioEvaluations.push(evaluation);
      totalScore += evaluation.score;
    }

    const averageScore = scenarioEvaluations.length > 0 ? totalScore / scenarioEvaluations.length : 0;

    return {
      score: Math.round(averageScore * 100) / 100,
      weight: config.weight,
      scenarioCount: scenarioEvaluations.length,
      scenarioEvaluations
    };
  }

  /**
   * 🎯 DETERMINE FINAL RESULT
   */
  async determineFinalResult(assessment, evaluationResult) {
    const passed = evaluationResult.totalScore >= this.assessmentCriteria.MINIMUM_SCORE;
    
    // Additional criteria for passing
    const sectionFailures = Object.values(evaluationResult.sectionScores)
      .filter(section => section.score < 60).length;

    const criticalSectionFailed = evaluationResult.sectionScores.practical?.score < 70;

    const finalPassed = passed && sectionFailures === 0 && !criticalSectionFailed;

    return {
      passed: finalPassed,
      totalScore: evaluationResult.totalScore,
      metMinimumScore: passed,
      noSectionFailures: sectionFailures === 0,
      passedCriticalSection: !criticalSectionFailed,
      certificateEligible: finalPassed,
      retryAvailable: assessment.attempts < this.assessmentCriteria.MAX_ATTEMPTS
    };
  }

  /**
   * 💾 STORE ASSESSMENT RESULTS
   */
  async storeAssessmentResults(assessmentId, evaluationResult, finalResult) {
    return await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: finalResult.passed ? 'PASSED' : 'FAILED',
        score: evaluationResult.totalScore,
        completedAt: new Date(),
        results: {
          sectionScores: evaluationResult.sectionScores,
          finalResult: finalResult,
          evaluationTime: evaluationResult.evaluationTime
        },
        metadata: {
          ...evaluationResult,
          storedAt: new Date().toISOString()
        }
      },
      include: {
        student: true,
        skill: true,
        enrollment: true
      }
    });
  }

  /**
   * 🏆 HANDLE PASSING ASSESSMENT
   */
  async handlePassingAssessment(assessment, finalResult) {
    // 1. Update enrollment status
    await this.prisma.enrollment.update({
      where: { id: assessment.enrollmentId },
      data: {
        status: 'ASSESSMENT_PASSED',
        completedAt: new Date()
      }
    });

    // 2. Generate certificate
    const certificate = await this.generateCertificate(assessment);

    // 3. Integrate with Yachi
    await this.integrateWithYachi(assessment, certificate);

    // 4. Notify student and expert
    await this.notifyStakeholders(assessment, certificate);

    this.logger.info('Assessment passed successfully', {
      assessmentId: assessment.id,
      studentId: assessment.studentId,
      score: finalResult.totalScore
    });
  }

  /**
   * 🏅 GENERATE CERTIFICATE
   */
  async generateCertificate(assessment) {
    const certificateData = {
      studentName: assessment.student.name,
      skillName: assessment.skill.name,
      assessmentScore: assessment.score,
      issueDate: new Date(),
      certificateId: `MOSA-${assessment.id}-${Date.now()}`,
      verificationUrl: `${process.env.PLATFORM_URL}/verify/${assessment.id}`,
      yachiIntegration: true
    };

    // Store certificate in database
    const certificate = await this.prisma.certificate.create({
      data: {
        studentId: assessment.studentId,
        assessmentId: assessment.id,
        skillId: assessment.skillId,
        certificateId: certificateData.certificateId,
        issueDate: certificateData.issueDate,
        expiryDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 year
        metadata: certificateData,
        status: 'ACTIVE'
      }
    });

    // Cache certificate for quick verification
    await this.redis.setex(
      `certificate:${certificateData.certificateId}`, 
      86400, // 24 hours
      JSON.stringify(certificateData)
    );

    return certificate;
  }

  /**
   * 🔗 INTEGRATE WITH YACHI
   */
  async integrateWithYachi(assessment, certificate) {
    try {
      const yachiPayload = {
        providerId: assessment.student.faydaId,
        providerName: assessment.student.name,
        skill: assessment.skill.name,
        certification: {
          issuer: "Mosa Forge",
          certificateId: certificate.certificateId,
          issueDate: certificate.issueDate,
          verificationUrl: certificate.metadata.verificationUrl
        },
        metadata: {
          assessmentScore: assessment.score,
          skillCategory: assessment.skill.category,
          trainingCompleted: true
        }
      };

      const response = await this.yachiApi.post('/providers/verify', yachiPayload);

      if (response.data.success) {
        await this.prisma.certificate.update({
          where: { id: certificate.id },
          data: {
            yachiVerified: true,
            yachiProviderId: response.data.providerId,
            metadata: {
              ...certificate.metadata,
              yachiIntegration: {
                verified: true,
                providerId: response.data.providerId,
                verifiedAt: new Date().toISOString()
              }
            }
          }
        });

        this.logger.info('Yachi integration successful', {
          certificateId: certificate.certificateId,
          yachiProviderId: response.data.providerId
        });
      }
    } catch (error) {
      this.logger.error('Yachi integration failed', error, {
        assessmentId: assessment.id,
        certificateId: certificate.certificateId
      });
      // Don't throw error - certificate is still valid without Yachi
    }
  }

  /**
   * 🔔 NOTIFY STAKEHOLDERS
   */
  async notifyStakeholders(assessment, certificate) {
    // Notify student
    this.emit('studentCertified', {
      studentId: assessment.studentId,
      certificateId: certificate.certificateId,
      skillName: assessment.skill.name,
      yachiVerified: certificate.yachiVerified
    });

    // Notify expert
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: assessment.enrollmentId },
      include: { expert: true }
    });

    if (enrollment.expert) {
      this.emit('studentCertifiedExpert', {
        expertId: enrollment.expert.id,
        studentId: assessment.studentId,
        skillName: assessment.skill.name,
        assessmentScore: assessment.score
      });
    }

    // Platform analytics
    this.emit('certificationAnalytics', {
      skillId: assessment.skillId,
      assessmentScore: assessment.score,
      certificationDate: new Date(),
      yachiIntegrated: certificate.yachiVerified
    });
  }

  /**
   * 🔧 UTILITY METHODS
   */
  generateAccessToken() {
    return `mosa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validateAnswerStructure(answers) {
    const requiredSections = this.assessmentCriteria.COMPREHENSIVE_SECTIONS;
    return requiredSections.every(section => answers.hasOwnProperty(section));
  }

  getSectionConfig(sectionName) {
    const sections = {
      theory: { weight: 30, timeLimit: 1800 },
      practical: { weight: 40, timeLimit: 2700 },
      decision_making: { weight: 20, timeLimit: 900 },
      portfolio: { weight: 10, timeLimit: 900 }
    };
    return sections[sectionName] || { weight: 0, timeLimit: 0 };
  }

  async warmUpAssessmentTemplates() {
    try {
      const templates = await this.prisma.assessmentTemplate.findMany({
        include: { skill: true }
      });

      const pipeline = this.redis.pipeline();
      templates.forEach(template => {
        const key = `assessment:template:${template.skillId}:${template.type}`;
        pipeline.setex(key, 3600, JSON.stringify(template));
      });

      await pipeline.exec();
      this.logger.info(`Assessment templates cache warmed up with ${templates.length} templates`);
    } catch (error) {
      this.logger.error('Failed to warm up assessment templates', error);
    }
  }

  generateNextSteps(passed, skillId) {
    if (passed) {
      return [
        "Certificate generated and available for download",
        "Yachi provider profile activated",
        "Income generation tools unlocked",
        "Access to Mosa Forge alumni network"
      ];
    } else {
      return [
        "Review assessment feedback",
        "Schedule retake assessment",
        "Consult with expert for improvement areas",
        "Practice weak areas in learning platform"
      ];
    }
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Final assessment system resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new FinalAssessmentSystem();