// certification-service/skill-assessment.js

/**
 * 🎯 ENTERPRISE SKILL ASSESSMENT SYSTEM
 * Production-ready assessment engine for Mosa Forge certification
 * Features: Adaptive testing, fraud prevention, real-time evaluation, Yachi integration
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../utils/logger');
const { AdaptiveEngine } = require('../engines/adaptive-engine');
const { ProctoringService } = require('../services/proctoring-service');
const { YachiIntegration } = require('../integrations/yachi-integration');

class SkillAssessment extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('SkillAssessment');
    this.adaptiveEngine = new AdaptiveEngine();
    this.proctoringService = new ProctoringService();
    this.yachiIntegration = new YachiIntegration();

    // Assessment configurations
    this.ASSESSMENT_TYPES = {
      THEORY: 'theory',
      PRACTICAL: 'practical',
      FINAL: 'final'
    };

    this.PASSING_THRESHOLDS = {
      THEORY: 75, // 75% minimum for theory
      PRACTICAL: 80, // 80% minimum for practical
      FINAL: 85 // 85% minimum for final certification
    };

    this.MAX_ATTEMPTS = {
      THEORY: 3,
      PRACTICAL: 2,
      FINAL: 1
    };

    this.initialize();
  }

  /**
   * Initialize assessment system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.adaptiveEngine.initialize();
      await this.loadAssessmentTemplates();
      
      this.logger.info('Skill assessment system initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize assessment system', error);
      throw error;
    }
  }

  /**
   * 🎯 START ASSESSMENT - Initialize assessment session
   */
  async startAssessment(assessmentData) {
    const startTime = performance.now();

    try {
      // 🛡️ VALIDATION PHASE
      await this.validateAssessmentStart(assessmentData);

      const { studentId, skillId, assessmentType, enrollmentId } = assessmentData;

      // 🔍 CHECK ELIGIBILITY
      const eligibility = await this.checkAssessmentEligibility(
        studentId,
        skillId,
        assessmentType,
        enrollmentId
      );

      if (!eligibility.isEligible) {
        throw new Error(`ASSESSMENT_NOT_ELIGIBLE: ${eligibility.reason}`);
      }

      // 🎯 GENERATE ASSESSMENT
      const assessment = await this.generateAdaptiveAssessment(
        studentId,
        skillId,
        assessmentType,
        eligibility.attemptNumber
      );

      // 🔐 INITIALIZE PROCCTORING
      const proctoringSession = await this.proctoringService.initializeSession({
        studentId,
        assessmentId: assessment.id,
        assessmentType,
        skillId
      });

      // 💾 CREATE ASSESSMENT SESSION
      const assessmentSession = await this.createAssessmentSession({
        studentId,
        skillId,
        assessmentType,
        assessmentId: assessment.id,
        proctoringSessionId: proctoringSession.id,
        questions: assessment.questions,
        timeLimit: assessment.timeLimit,
        attemptNumber: eligibility.attemptNumber
      });

      const processingTime = performance.now() - startTime;
      this.logger.metric('assessment_start_time', processingTime, {
        studentId,
        skillId,
        assessmentType
      });

      return {
        success: true,
        sessionId: assessmentSession.id,
        assessment: {
          id: assessment.id,
          questions: assessment.questions,
          timeLimit: assessment.timeLimit,
          totalQuestions: assessment.questions.length,
          instructions: assessment.instructions
        },
        proctoring: {
          sessionId: proctoringSession.id,
          requirements: proctoringSession.requirements
        },
        metadata: {
          attemptNumber: eligibility.attemptNumber,
          passingThreshold: this.PASSING_THRESHOLDS[assessmentType.toUpperCase()],
          remainingAttempts: this.MAX_ATTEMPTS[assessmentType.toUpperCase()] - eligibility.attemptNumber
        }
      };

    } catch (error) {
      this.logger.error('Assessment start failed', error, { assessmentData });
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE ASSESSMENT START
   */
  async validateAssessmentStart(assessmentData) {
    const { studentId, skillId, assessmentType, enrollmentId } = assessmentData;

    // Required fields validation
    if (!studentId || !skillId || !assessmentType || !enrollmentId) {
      throw new Error('MISSING_REQUIRED_FIELDS');
    }

    // Assessment type validation
    if (!Object.values(this.ASSESSMENT_TYPES).includes(assessmentType)) {
      throw new Error('INVALID_ASSESSMENT_TYPE');
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

    // Enrollment validation
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { skill: true }
    });

    if (!enrollment) {
      throw new Error('ENROLLMENT_NOT_FOUND');
    }

    if (enrollment.studentId !== studentId) {
      throw new Error('UNAUTHORIZED_ASSESSMENT_ACCESS');
    }

    if (enrollment.skillId !== skillId) {
      throw new Error('SKILL_ENROLLMENT_MISMATCH');
    }

    this.logger.debug('Assessment validation passed', { studentId, skillId, assessmentType });
  }

  /**
   * 🔍 CHECK ASSESSMENT ELIGIBILITY
   */
  async checkAssessmentEligibility(studentId, skillId, assessmentType, enrollmentId) {
    const cacheKey = `eligibility:${studentId}:${skillId}:${assessmentType}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Check previous attempts
    const previousAttempts = await this.prisma.assessmentAttempt.findMany({
      where: {
        studentId,
        skillId,
        assessmentType,
        enrollmentId
      },
      orderBy: { createdAt: 'desc' },
      select: { score: true, status: true, createdAt: true }
    });

    const attemptNumber = previousAttempts.length + 1;
    const maxAttempts = this.MAX_ATTEMPTS[assessmentType.toUpperCase()];

    // Check attempt limit
    if (attemptNumber > maxAttempts) {
      const result = {
        isEligible: false,
        reason: 'MAX_ATTEMPTS_EXCEEDED',
        attemptNumber,
        maxAttempts
      };
      await this.redis.setex(cacheKey, 300, JSON.stringify(result));
      return result;
    }

    // Check if previous attempt was successful
    const previousSuccess = previousAttempts.find(attempt => 
      attempt.status === 'PASSED'
    );

    if (previousSuccess) {
      const result = {
        isEligible: false,
        reason: 'ALREADY_PASSED',
        attemptNumber,
        previousScore: previousSuccess.score
      };
      await this.redis.setex(cacheKey, 300, JSON.stringify(result));
      return result;
    }

    // Check cooldown period for failed attempts
    if (previousAttempts.length > 0) {
      const lastAttempt = previousAttempts[0];
      const cooldownHours = this.getCooldownPeriod(assessmentType, attemptNumber);
      const timeSinceLastAttempt = Date.now() - new Date(lastAttempt.createdAt).getTime();
      const cooldownMs = cooldownHours * 60 * 60 * 1000;

      if (timeSinceLastAttempt < cooldownMs && lastAttempt.status === 'FAILED') {
        const result = {
          isEligible: false,
          reason: 'COOLDOWN_ACTIVE',
          attemptNumber,
          cooldownRemaining: cooldownMs - timeSinceLastAttempt
        };
        await this.redis.setex(cacheKey, 300, JSON.stringify(result));
        return result;
      }
    }

    // Check prerequisite assessments
    const prerequisitesMet = await this.checkPrerequisites(
      studentId,
      skillId,
      assessmentType,
      enrollmentId
    );

    if (!prerequisitesMet.isMet) {
      const result = {
        isEligible: false,
        reason: 'PREREQUISITES_NOT_MET',
        attemptNumber,
        missingPrerequisites: prerequisitesMet.missing
      };
      await this.redis.setex(cacheKey, 300, JSON.stringify(result));
      return result;
    }

    const result = {
      isEligible: true,
      attemptNumber,
      maxAttempts,
      previousAttempts: previousAttempts.length
    };

    await this.redis.setex(cacheKey, 300, JSON.stringify(result));
    return result;
  }

  /**
   * 🎯 GENERATE ADAPTIVE ASSESSMENT
   */
  async generateAdaptiveAssessment(studentId, skillId, assessmentType, attemptNumber) {
    const cacheKey = `assessment:template:${skillId}:${assessmentType}:v2`;
    
    // Try cached template first
    let template = await this.redis.get(cacheKey);
    if (template) {
      template = JSON.parse(template);
    } else {
      // Generate new template from database
      template = await this.generateAssessmentTemplate(skillId, assessmentType);
      await this.redis.setex(cacheKey, 3600, JSON.stringify(template)); // Cache for 1 hour
    }

    // Get student performance data for adaptation
    const studentPerformance = await this.getStudentPerformanceData(
      studentId,
      skillId,
      assessmentType
    );

    // Use adaptive engine to customize assessment
    const adaptiveAssessment = await this.adaptiveEngine.generateAssessment({
      template,
      studentPerformance,
      assessmentType,
      attemptNumber,
      skillId
    });

    // Shuffle questions and options to prevent cheating
    const shuffledQuestions = this.shuffleAssessment(adaptiveAssessment.questions);

    return {
      id: this.generateAssessmentId(),
      questions: shuffledQuestions,
      timeLimit: adaptiveAssessment.timeLimit,
      instructions: adaptiveAssessment.instructions,
      metadata: {
        skillId,
        assessmentType,
        difficulty: adaptiveAssessment.difficulty,
        studentLevel: studentPerformance.level
      }
    };
  }

  /**
   * 📝 SUBMIT ASSESSMENT ANSWERS
   */
  async submitAssessmentAnswers(submissionData) {
    const startTime = performance.now();

    try {
      const { sessionId, answers, studentId, metadata } = submissionData;

      // 🛡️ VALIDATE SUBMISSION
      await this.validateSubmission(sessionId, studentId, answers);

      // 🔍 PROCCTORING VALIDATION
      const proctoringResult = await this.proctoringService.validateSubmission(sessionId);

      // 📊 EVALUATE ANSWERS
      const evaluation = await this.evaluateAnswers(sessionId, answers);

      // 💾 RECORD ATTEMPT
      const attemptResult = await this.recordAssessmentAttempt({
        sessionId,
        studentId,
        answers,
        evaluation,
        proctoringResult,
        metadata
      });

      // 🎯 CERTIFICATION CHECK
      if (evaluation.passed && attemptResult.assessmentType === 'FINAL') {
        await this.processCertification(attemptResult);
      }

      const processingTime = performance.now() - startTime;
      this.logger.metric('assessment_evaluation_time', processingTime, {
        sessionId,
        studentId,
        assessmentType: attemptResult.assessmentType
      });

      return {
        success: true,
        attemptId: attemptResult.id,
        score: evaluation.score,
        passed: evaluation.passed,
        breakdown: evaluation.breakdown,
        proctoring: proctoringResult,
        certification: attemptResult.certificationStatus,
        feedback: evaluation.feedback,
        nextSteps: this.getNextSteps(attemptResult.assessmentType, evaluation.passed)
      };

    } catch (error) {
      this.logger.error('Assessment submission failed', error, { submissionData });
      throw error;
    }
  }

  /**
   * 📊 EVALUATE ANSWERS WITH ADVANCED SCORING
   */
  async evaluateAnswers(sessionId, answers) {
    const session = await this.prisma.assessmentSession.findUnique({
      where: { id: sessionId },
      include: { assessment: true }
    });

    if (!session) {
      throw new Error('ASSESSMENT_SESSION_NOT_FOUND');
    }

    const questions = session.questions;
    let totalScore = 0;
    let maxPossibleScore = 0;
    const breakdown = [];
    const feedback = [];

    // Evaluate each answer
    for (const [questionId, studentAnswer] of Object.entries(answers)) {
      const question = questions.find(q => q.id === questionId);
      if (!question) continue;

      maxPossibleScore += question.points || 1;

      const evaluation = this.evaluateSingleAnswer(question, studentAnswer);
      totalScore += evaluation.score;

      breakdown.push({
        questionId,
        questionType: question.type,
        studentAnswer,
        correctAnswer: question.correctAnswer,
        score: evaluation.score,
        maxScore: question.points || 1,
        explanation: evaluation.explanation
      });

      if (!evaluation.correct) {
        feedback.push({
          questionId,
          skill: question.skillTag,
          suggestion: evaluation.improvement,
          resources: question.learningResources
        });
      }
    }

    const finalScore = (totalScore / maxPossibleScore) * 100;
    const passingThreshold = this.PASSING_THRESHOLDS[session.assessmentType.toUpperCase()];
    const passed = finalScore >= passingThreshold;

    return {
      score: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
      passed,
      totalScore,
      maxPossibleScore,
      breakdown,
      feedback,
      performance: this.calculatePerformanceLevel(finalScore)
    };
  }

  /**
   * 🎯 EVALUATE SINGLE ANSWER WITH MULTIPLE QUESTION TYPES
   */
  evaluateSingleAnswer(question, studentAnswer) {
    switch (question.type) {
      case 'multiple_choice':
        return this.evaluateMultipleChoice(question, studentAnswer);
      
      case 'true_false':
        return this.evaluateTrueFalse(question, studentAnswer);
      
      case 'fill_blank':
        return this.evaluateFillBlank(question, studentAnswer);
      
      case 'matching':
        return this.evaluateMatching(question, studentAnswer);
      
      case 'scenario_based':
        return this.evaluateScenarioBased(question, studentAnswer);
      
      case 'practical_task':
        return this.evaluatePracticalTask(question, studentAnswer);
      
      default:
        return { score: 0, correct: false, explanation: 'Unknown question type' };
    }
  }

  /**
   * 🔍 EVALUATE MULTIPLE CHOICE
   */
  evaluateMultipleChoice(question, studentAnswer) {
    const isCorrect = studentAnswer === question.correctAnswer;
    const score = isCorrect ? (question.points || 1) : 0;

    return {
      score,
      correct: isCorrect,
      explanation: isCorrect 
        ? 'Correct answer selected'
        : `Incorrect. The right answer is: ${question.correctAnswer}`,
      improvement: question.explanation || 'Review the fundamental concepts'
    };
  }

  /**
   * 🎯 EVALUATE SCENARIO-BASED QUESTIONS
   */
  evaluateScenarioBased(question, studentAnswer) {
    // Advanced evaluation for scenario-based questions
    const keywords = question.evaluationKeywords || [];
    const studentAnswerLower = studentAnswer.toLowerCase();
    
    let score = 0;
    let matchedKeywords = 0;

    keywords.forEach(keyword => {
      if (studentAnswerLower.includes(keyword.toLowerCase())) {
        matchedKeywords++;
      }
    });

    const keywordRatio = matchedKeywords / keywords.length;
    score = Math.min(keywordRatio * (question.points || 5), question.points || 5);

    return {
      score,
      correct: score >= (question.points || 5) * 0.7, // 70% threshold
      explanation: `Matched ${matchedKeywords} of ${keywords.length} key concepts`,
      improvement: 'Focus on practical application and real-world scenarios'
    };
  }

  /**
   * 💾 RECORD ASSESSMENT ATTEMPT
   */
  async recordAssessmentAttempt(attemptData) {
    return await this.prisma.$transaction(async (tx) => {
      const {
        sessionId,
        studentId,
        answers,
        evaluation,
        proctoringResult,
        metadata
      } = attemptData;

      // Get session details
      const session = await tx.assessmentSession.findUnique({
        where: { id: sessionId },
        include: { enrollment: true }
      });

      // Create assessment attempt
      const attempt = await tx.assessmentAttempt.create({
        data: {
          studentId,
          skillId: session.skillId,
          enrollmentId: session.enrollmentId,
          assessmentType: session.assessmentType,
          score: evaluation.score,
          totalQuestions: evaluation.breakdown.length,
          correctAnswers: evaluation.breakdown.filter(q => q.score > 0).length,
          answers,
          evaluation: {
            breakdown: evaluation.breakdown,
            feedback: evaluation.feedback,
            performance: evaluation.performance
          },
          proctoring: proctoringResult,
          metadata,
          status: evaluation.passed ? 'PASSED' : 'FAILED',
          timeSpent: metadata.timeSpent,
          submittedAt: new Date()
        }
      });

      // Update session status
      await tx.assessmentSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          attemptId: attempt.id
        }
      });

      // Update enrollment progress
      await this.updateEnrollmentProgress(session.enrollmentId, session.assessmentType, evaluation.passed, tx);

      // Emit event for real-time updates
      this.emit('assessmentCompleted', {
        attemptId: attempt.id,
        studentId,
        skillId: session.skillId,
        assessmentType: session.assessmentType,
        score: evaluation.score,
        passed: evaluation.passed,
        proctoringFlags: proctoringResult.flags
      });

      return {
        ...attempt,
        certificationStatus: evaluation.passed && session.assessmentType === 'FINAL' ? 'ELIGIBLE' : 'PENDING'
      };
    });
  }

  /**
   * 🏆 PROCESS CERTIFICATION
   */
  async processCertification(attemptResult) {
    try {
      const { studentId, skillId, enrollmentId, score } = attemptResult;

      // Generate digital certificate
      const certificate = await this.generateCertificate({
        studentId,
        skillId,
        enrollmentId,
        assessmentScore: score,
        issuedAt: new Date()
      });

      // Integrate with Yachi platform
      const yachiVerification = await this.yachiIntegration.verifyProvider({
        studentId,
        skillId,
        certificateId: certificate.id,
        assessmentScore: score
      });

      // Update student status to certified
      await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'CERTIFIED',
          certifiedAt: new Date(),
          certificateId: certificate.id,
          yachiProviderId: yachiVerification.providerId
        }
      });

      // Emit certification event
      this.emit('studentCertified', {
        studentId,
        skillId,
        certificateId: certificate.id,
        yachiProviderId: yachiVerification.providerId,
        issuedAt: new Date()
      });

      this.logger.info('Student certified successfully', {
        studentId,
        skillId,
        certificateId: certificate.id
      });

    } catch (error) {
      this.logger.error('Certification processing failed', error, { attemptResult });
      throw error;
    }
  }

  /**
   * 📜 GENERATE DIGITAL CERTIFICATE
   */
  async generateCertificate(certificateData) {
    const { studentId, skillId, enrollmentId, assessmentScore } = certificateData;

    const certificateId = this.generateCertificateId();
    
    const certificate = await this.prisma.certificate.create({
      data: {
        id: certificateId,
        studentId,
        skillId,
        enrollmentId,
        assessmentScore,
        issuedAt: new Date(),
        expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000), // 2 years
        verificationUrl: `${process.env.CERTIFICATE_VERIFICATION_URL}/${certificateId}`,
        metadata: {
          issuedBy: 'Mosa Forge Enterprise',
          qualityScore: assessmentScore >= 90 ? 'EXCELLENT' : assessmentScore >= 85 ? 'GOOD' : 'STANDARD',
          yachiIntegrated: true
        }
      }
    });

    // Generate PDF certificate
    await this.generateCertificatePDF(certificate);

    return certificate;
  }

  /**
   * 🔧 UTILITY METHODS
   */

  // Shuffle assessment questions and options
  shuffleAssessment(questions) {
    return questions.map(question => {
      if (question.options && Array.isArray(question.options)) {
        const shuffledOptions = this.shuffleArray([...question.options]);
        return {
          ...question,
          options: shuffledOptions,
          originalOrder: question.options // Keep for evaluation
        };
      }
      return question;
    }).sort(() => Math.random() - 0.5);
  }

  // Fisher-Yates shuffle algorithm
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Generate unique assessment ID
  generateAssessmentId() {
    return `ASS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate unique certificate ID
  generateCertificateId() {
    return `CERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get cooldown period based on assessment type and attempt
  getCooldownPeriod(assessmentType, attemptNumber) {
    const cooldownMap = {
      THEORY: [24, 48, 72], // 1, 2, 3 days
      PRACTICAL: [48, 96], // 2, 4 days
      FINAL: [168] // 7 days
    };

    const periods = cooldownMap[assessmentType.toUpperCase()] || [24];
    return periods[Math.min(attemptNumber - 1, periods.length - 1)];
  }

  // Calculate performance level
  calculatePerformanceLevel(score) {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 80) return 'GOOD';
    if (score >= 70) return 'SATISFACTORY';
    return 'NEEDS_IMPROVEMENT';
  }

  // Get next steps after assessment
  getNextSteps(assessmentType, passed) {
    const steps = {
      THEORY: passed ? 'Proceed to practical training' : 'Review theory concepts and retry',
      PRACTICAL: passed ? 'Prepare for final certification' : 'Practice hands-on skills and retry',
      FINAL: passed ? 'Start earning on Yachi platform' : 'Complete remedial training and retry'
    };

    return steps[assessmentType.toUpperCase()] || 'Continue learning journey';
  }

  /**
   * 📈 ANALYTICS AND REPORTING
   */
  async getAssessmentAnalytics(skillId, period = '30d') {
    const cacheKey = `analytics:assessment:${skillId}:${period}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const analytics = await this.prisma.assessmentAttempt.groupBy({
      by: ['assessmentType', 'status'],
      where: {
        skillId,
        submittedAt: { gte: startDate }
      },
      _count: { id: true },
      _avg: { score: true }
    });

    const result = {
      totalAttempts: analytics.reduce((sum, item) => sum + item._count.id, 0),
      passRate: this.calculatePassRate(analytics),
      averageScores: this.calculateAverageScores(analytics),
      typeBreakdown: this.calculateTypeBreakdown(analytics),
      trend: await this.calculateTrend(skillId, days)
    };

    await this.redis.setex(cacheKey, 900, JSON.stringify(result)); // Cache 15 minutes
    return result;
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      await this.adaptiveEngine.destroy();
      await this.proctoringService.destroy();
      this.removeAllListeners();
      this.logger.info('Skill assessment system resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new SkillAssessment();