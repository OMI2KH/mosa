// (admin)/expert-approvals.js

/**
 * 🎯 ENTERPRISE EXPERT APPROVAL SYSTEM
 * Advanced expert verification and approval workflow
 * Features: Multi-stage validation, AI-powered verification, quality gates
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../../utils/logger');
const { AIVerificationEngine } = require('../../utils/ai-verification');
const { DocumentValidator } = require('../../utils/document-validator');
const { QualityGate } = require('../../utils/quality-gate');
const { RateLimiterRedis } = require('rate-limiter-flexible');

class ExpertApprovalSystem extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('ExpertApprovalSystem');
    this.aiVerifier = new AIVerificationEngine();
    this.documentValidator = new DocumentValidator();
    this.qualityGate = new QualityGate();

    // Approval rate limiting
    this.approvalLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (adminId) => `approval_limit:${adminId}`,
      points: 50, // 50 approvals per hour per admin
      duration: 3600,
    });

    this.initialize();
  }

  /**
   * Initialize approval system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.aiVerifier.initialize();
      await this.documentValidator.initialize();
      
      this.logger.info('Expert approval system initialized successfully');
      
      // Load approval workflows
      await this.loadApprovalWorkflows();
      
    } catch (error) {
      this.logger.error('Failed to initialize expert approval system', error);
      throw error;
    }
  }

  /**
   * 🎯 SUBMIT EXPERT FOR APPROVAL
   */
  async submitExpertForApproval(expertData, adminId) {
    const startTime = performance.now();
    const approvalId = `appr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // 🛡️ ADMIN AUTHORIZATION VALIDATION
      await this.validateAdminAuthorization(adminId);

      // 📋 COMPREHENSIVE DATA VALIDATION
      await this.validateExpertSubmissionData(expertData);

      // 🔍 MULTI-STAGE VERIFICATION PROCESS
      const verificationResults = await this.executeMultiStageVerification(expertData);

      // ⚖️ QUALITY GATE ASSESSMENT
      const qualityAssessment = await this.assessQualityGates(verificationResults);

      // 💾 APPROVAL WORKFLOW EXECUTION
      const approvalResult = await this.executeApprovalWorkflow(
        expertData, 
        verificationResults, 
        qualityAssessment, 
        adminId,
        approvalId
      );

      // 📊 REAL-TIME METRICS UPDATE
      await this.updateApprovalMetrics(approvalResult);

      // 🔔 NOTIFICATION SYSTEM
      await this.sendApprovalNotifications(approvalResult);

      const processingTime = performance.now() - startTime;
      
      this.logger.metric('expert_approval_processing_time', processingTime, {
        expertId: expertData.id,
        approvalId,
        status: approvalResult.status
      });

      return {
        success: true,
        approvalId,
        expertId: approvalResult.expertId,
        status: approvalResult.status,
        nextSteps: approvalResult.nextSteps,
        qualityScore: qualityAssessment.overallScore,
        processingTime: `${processingTime.toFixed(2)}ms`,
        verificationSummary: this.generateVerificationSummary(verificationResults)
      };

    } catch (error) {
      this.logger.error('Expert approval submission failed', error, { 
        expertId: expertData.id, 
        adminId,
        approvalId 
      });

      await this.recordApprovalFailure(approvalId, expertData.id, adminId, error);
      throw error;
    }
  }

  /**
   * 🛡️ ADMIN AUTHORIZATION VALIDATION
   */
  async validateAdminAuthorization(adminId) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        role: true,
        permissions: true,
        isActive: true,
        approvalLimit: true
      }
    });

    if (!admin) {
      throw new Error('ADMIN_NOT_FOUND');
    }

    if (!admin.isActive) {
      throw new Error('ADMIN_ACCOUNT_INACTIVE');
    }

    if (!admin.permissions.includes('EXPERT_APPROVAL')) {
      throw new Error('INSUFFICIENT_PERMISSIONS');
    }

    // Rate limiting check
    try {
      await this.approvalLimiter.consume(adminId);
    } catch (rateLimitError) {
      throw new Error('APPROVAL_RATE_LIMIT_EXCEEDED');
    }

    this.logger.debug('Admin authorization validated', { adminId, role: admin.role });
  }

  /**
   * 📋 COMPREHENSIVE EXPERT DATA VALIDATION
   */
  async validateExpertSubmissionData(expertData) {
    const requiredFields = [
      'faydaId', 'fullName', 'email', 'phone', 
      'skillCategory', 'skillSpecialization', 'experienceYears',
      'portfolioDocuments', 'certificationDocuments'
    ];

    const missingFields = requiredFields.filter(field => !expertData[field]);
    if (missingFields.length > 0) {
      throw new Error(`MISSING_REQUIRED_FIELDS: ${missingFields.join(', ')}`);
    }

    // Fayda ID format validation
    if (!this.validateFaydaIdFormat(expertData.faydaId)) {
      throw new Error('INVALID_FAYDA_ID_FORMAT');
    }

    // Email validation
    if (!this.validateEmailFormat(expertData.email)) {
      throw new Error('INVALID_EMAIL_FORMAT');
    }

    // Phone validation
    if (!this.validatePhoneFormat(expertData.phone)) {
      throw new Error('INVALID_PHONE_FORMAT');
    }

    // Experience validation
    if (expertData.experienceYears < 1) {
      throw new Error('INSUFFICIENT_EXPERIENCE');
    }

    // Document validation
    await this.validateExpertDocuments(expertData);

    // Duplicate expert check
    await this.checkDuplicateExpert(expertData);

    this.logger.debug('Expert data validation passed', { expertId: expertData.id });
  }

  /**
   * 🔍 MULTI-STAGE VERIFICATION PROCESS
   */
  async executeMultiStageVerification(expertData) {
    const verificationResults = {
      stages: {},
      overallScore: 0,
      status: 'IN_PROGRESS',
      riskLevel: 'LOW'
    };

    try {
      // Stage 1: Document Verification
      verificationResults.stages.documentVerification = await this.executeDocumentVerification(expertData);

      // Stage 2: AI-Powered Portfolio Analysis
      verificationResults.stages.portfolioAnalysis = await this.executePortfolioAnalysis(expertData);

      // Stage 3: Skill Competency Assessment
      verificationResults.stages.skillAssessment = await this.executeSkillAssessment(expertData);

      // Stage 4: Background Check
      verificationResults.stages.backgroundCheck = await this.executeBackgroundCheck(expertData);

      // Stage 5: Financial Integrity Check
      verificationResults.stages.financialCheck = await this.executeFinancialCheck(expertData);

      // Calculate overall verification score
      verificationResults.overallScore = this.calculateVerificationScore(verificationResults.stages);
      verificationResults.status = 'COMPLETED';
      verificationResults.riskLevel = this.determineRiskLevel(verificationResults.overallScore);

      this.logger.info('Multi-stage verification completed', {
        expertId: expertData.id,
        overallScore: verificationResults.overallScore,
        riskLevel: verificationResults.riskLevel
      });

      return verificationResults;

    } catch (error) {
      verificationResults.status = 'FAILED';
      verificationResults.error = error.message;
      
      this.logger.error('Multi-stage verification failed', error, { expertId: expertData.id });
      throw error;
    }
  }

  /**
   * 📄 STAGE 1: DOCUMENT VERIFICATION
   */
  async executeDocumentVerification(expertData) {
    const stageStart = performance.now();
    
    try {
      const documentResults = {
        faydaId: await this.documentValidator.validateFaydaId(expertData.faydaId),
        certificates: await this.documentValidator.validateCertificates(expertData.certificationDocuments),
        portfolio: await this.documentValidator.validatePortfolio(expertData.portfolioDocuments),
        identity: await this.documentValidator.validateIdentityDocuments(expertData.identityDocuments)
      };

      const stageScore = this.calculateDocumentVerificationScore(documentResults);
      const processingTime = performance.now() - stageStart;

      this.logger.debug('Document verification completed', {
        expertId: expertData.id,
        score: stageScore,
        processingTime: `${processingTime.toFixed(2)}ms`
      });

      return {
        ...documentResults,
        score: stageScore,
        status: stageScore >= 0.8 ? 'PASSED' : 'FAILED',
        processingTime
      };

    } catch (error) {
      this.logger.error('Document verification failed', error, { expertId: expertData.id });
      throw new Error(`DOCUMENT_VERIFICATION_FAILED: ${error.message}`);
    }
  }

  /**
   * 🤖 STAGE 2: AI-POWERED PORTFOLIO ANALYSIS
   */
  async executePortfolioAnalysis(expertData) {
    const stageStart = performance.now();

    try {
      const analysisResults = await this.aiVerifier.analyzePortfolio({
        portfolioDocuments: expertData.portfolioDocuments,
        skillCategory: expertData.skillCategory,
        experienceYears: expertData.experienceYears,
        claimedExpertise: expertData.claimedExpertise
      });

      const processingTime = performance.now() - stageStart;

      this.logger.debug('Portfolio analysis completed', {
        expertId: expertData.id,
        score: analysisResults.authenticityScore,
        processingTime: `${processingTime.toFixed(2)}ms`
      });

      return {
        ...analysisResults,
        status: analysisResults.authenticityScore >= 0.7 ? 'PASSED' : 'REVIEW_NEEDED',
        processingTime
      };

    } catch (error) {
      this.logger.error('Portfolio analysis failed', error, { expertId: expertData.id });
      return {
        authenticityScore: 0,
        qualityScore: 0,
        consistencyScore: 0,
        status: 'FAILED',
        error: error.message,
        processingTime: performance.now() - stageStart
      };
    }
  }

  /**
   * 🎯 STAGE 3: SKILL COMPETENCY ASSESSMENT
   */
  async executeSkillAssessment(expertData) {
    const stageStart = performance.now();

    try {
      const skillAssessment = await this.aiVerifier.assessSkillCompetency({
        skillCategory: expertData.skillCategory,
        specialization: expertData.skillSpecialization,
        experienceYears: expertData.experienceYears,
        portfolioWork: expertData.portfolioDocuments,
        selfRating: expertData.skillSelfRating
      });

      const processingTime = performance.now() - stageStart;

      this.logger.debug('Skill assessment completed', {
        expertId: expertData.id,
        score: skillAssessment.competencyScore,
        processingTime: `${processingTime.toFixed(2)}ms`
      });

      return {
        ...skillAssessment,
        status: skillAssessment.competencyScore >= 0.75 ? 'PASSED' : 'REVIEW_NEEDED',
        processingTime
      };

    } catch (error) {
      this.logger.error('Skill assessment failed', error, { expertId: expertData.id });
      throw new Error(`SKILL_ASSESSMENT_FAILED: ${error.message}`);
    }
  }

  /**
   * 🔎 STAGE 4: BACKGROUND CHECK
   */
  async executeBackgroundCheck(expertData) {
    const stageStart = performance.now();

    try {
      const backgroundResults = await this.aiVerifier.performBackgroundCheck({
        faydaId: expertData.faydaId,
        fullName: expertData.fullName,
        phone: expertData.phone,
        email: expertData.email
      });

      const processingTime = performance.now() - stageStart;

      this.logger.debug('Background check completed', {
        expertId: expertData.id,
        riskScore: backgroundResults.riskScore,
        processingTime: `${processingTime.toFixed(2)}ms`
      });

      return {
        ...backgroundResults,
        status: backgroundResults.riskScore <= 0.3 ? 'PASSED' : 'REVIEW_NEEDED',
        processingTime
      };

    } catch (error) {
      this.logger.error('Background check failed', error, { expertId: expertData.id });
      throw new Error(`BACKGROUND_CHECK_FAILED: ${error.message}`);
    }
  }

  /**
   * 💰 STAGE 5: FINANCIAL INTEGRITY CHECK
   */
  async executeFinancialCheck(expertData) {
    const stageStart = performance.now();

    try {
      const financialResults = await this.aiVerifier.checkFinancialIntegrity({
        faydaId: expertData.faydaId,
        bankAccounts: expertData.bankAccounts,
        taxRecords: expertData.taxRecords,
        paymentHistory: expertData.paymentHistory
      });

      const processingTime = performance.now() - stageStart;

      this.logger.debug('Financial check completed', {
        expertId: expertData.id,
        integrityScore: financialResults.integrityScore,
        processingTime: `${processingTime.toFixed(2)}ms`
      });

      return {
        ...financialResults,
        status: financialResults.integrityScore >= 0.8 ? 'PASSED' : 'REVIEW_NEEDED',
        processingTime
      };

    } catch (error) {
      this.logger.error('Financial check failed', error, { expertId: expertData.id });
      throw new Error(`FINANCIAL_CHECK_FAILED: ${error.message}`);
    }
  }

  /**
   * ⚖️ QUALITY GATE ASSESSMENT
   */
  async assessQualityGates(verificationResults) {
    const qualityAssessment = {
      gates: {},
      overallScore: 0,
      status: 'PENDING',
      recommendations: []
    };

    // Gate 1: Document Authenticity
    qualityAssessment.gates.documentAuthenticity = this.qualityGate.assessDocumentAuthenticity(
      verificationResults.stages.documentVerification
    );

    // Gate 2: Skill Proficiency
    qualityAssessment.gates.skillProficiency = this.qualityGate.assessSkillProficiency(
      verificationResults.stages.skillAssessment
    );

    // Gate 3: Portfolio Quality
    qualityAssessment.gates.portfolioQuality = this.qualityGate.assessPortfolioQuality(
      verificationResults.stages.portfolioAnalysis
    );

    // Gate 4: Risk Assessment
    qualityAssessment.gates.riskAssessment = this.qualityGate.assessRisk(
      verificationResults.stages.backgroundCheck,
      verificationResults.stages.financialCheck
    );

    // Calculate overall quality score
    qualityAssessment.overallScore = this.calculateQualityScore(qualityAssessment.gates);
    qualityAssessment.status = this.determineQualityStatus(qualityAssessment);

    // Generate recommendations
    qualityAssessment.recommendations = this.generateQualityRecommendations(qualityAssessment);

    this.logger.debug('Quality gate assessment completed', {
      overallScore: qualityAssessment.overallScore,
      status: qualityAssessment.status
    });

    return qualityAssessment;
  }

  /**
   * 💾 APPROVAL WORKFLOW EXECUTION
   */
  async executeApprovalWorkflow(expertData, verificationResults, qualityAssessment, adminId, approvalId) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create approval record
      const approvalRecord = await tx.expertApproval.create({
        data: {
          id: approvalId,
          expertData: expertData,
          verificationResults: verificationResults,
          qualityAssessment: qualityAssessment,
          adminId: adminId,
          status: 'UNDER_REVIEW',
          currentStage: 'FINAL_REVIEW',
          metadata: {
            submittedAt: new Date().toISOString(),
            workflowVersion: '2.0',
            riskLevel: verificationResults.riskLevel
          }
        }
      });

      // 2. Determine approval decision
      const approvalDecision = this.makeApprovalDecision(verificationResults, qualityAssessment);

      // 3. Update approval record with decision
      const updatedApproval = await tx.expertApproval.update({
        where: { id: approvalId },
        data: {
          status: approvalDecision.status,
          decision: approvalDecision.decision,
          decisionReason: approvalDecision.reason,
          decisionAt: new Date(),
          qualityScore: qualityAssessment.overallScore,
          riskLevel: verificationResults.riskLevel,
          nextReviewDate: approvalDecision.nextReviewDate,
          conditions: approvalDecision.conditions
        }
      });

      // 4. If approved, create expert record
      let expertRecord = null;
      if (approvalDecision.status === 'APPROVED') {
        expertRecord = await this.createExpertRecord(expertData, verificationResults, qualityAssessment, tx);
        
        // Update approval with expert ID
        await tx.expertApproval.update({
          where: { id: approvalId },
          data: { expertId: expertRecord.id }
        });
      }

      // 5. Create audit trail
      await this.createApprovalAuditTrail(approvalRecord, adminId, approvalDecision, tx);

      return {
        approvalId,
        expertId: expertRecord?.id,
        status: approvalDecision.status,
        decision: approvalDecision.decision,
        qualityScore: qualityAssessment.overallScore,
        expertRecord,
        nextSteps: approvalDecision.nextSteps
      };

    }, {
      maxWait: 10000,
      timeout: 30000
    });
  }

  /**
   * 🎯 MAKE APPROVAL DECISION
   */
  makeApprovalDecision(verificationResults, qualityAssessment) {
    const { overallScore: verificationScore, riskLevel } = verificationResults;
    const { overallScore: qualityScore, status: qualityStatus } = qualityAssessment;

    // Auto-approval conditions
    if (verificationScore >= 0.9 && qualityScore >= 0.9 && riskLevel === 'LOW') {
      return {
        status: 'APPROVED',
        decision: 'AUTO_APPROVED',
        reason: 'High verification and quality scores with low risk',
        nextSteps: ['ONBOARDING', 'TRAINING_ACCESS'],
        conditions: []
      };
    }

    // Auto-rejection conditions
    if (verificationScore < 0.5 || qualityScore < 0.5 || riskLevel === 'HIGH') {
      return {
        status: 'REJECTED',
        decision: 'AUTO_REJECTED',
        reason: 'Low verification/quality scores or high risk detected',
        nextSteps: ['APPEAL_PROCESS'],
        conditions: []
      };
    }

    // Manual review required
    return {
      status: 'PENDING_MANUAL_REVIEW',
      decision: 'REVIEW_REQUIRED',
      reason: 'Requires senior admin review',
      nextSteps: ['SENIOR_REVIEW', 'ADDITIONAL_VERIFICATION'],
      conditions: this.generateReviewConditions(verificationResults, qualityAssessment),
      nextReviewDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  /**
   * 👨‍💼 CREATE EXPERT RECORD
   */
  async createExpertRecord(expertData, verificationResults, qualityAssessment, transaction) {
    const initialTier = this.determineInitialTier(qualityAssessment.overallScore);
    
    const expertRecord = await transaction.expert.create({
      data: {
        faydaId: expertData.faydaId,
        fullName: expertData.fullName,
        email: expertData.email,
        phone: expertData.phone,
        skillCategory: expertData.skillCategory,
        skillSpecialization: expertData.skillSpecialization,
        experienceYears: expertData.experienceYears,
        currentTier: initialTier,
        qualityScore: qualityAssessment.overallScore,
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        portfolioDocuments: expertData.portfolioDocuments,
        certificationDocuments: expertData.certificationDocuments,
        metadata: {
          approvalId: verificationResults.approvalId,
          initialQualityScore: qualityAssessment.overallScore,
          verificationScores: verificationResults.stages,
          onboardedAt: new Date().toISOString()
        },
        capacity: this.calculateInitialCapacity(initialTier, expertData.experienceYears)
      }
    });

    this.logger.info('Expert record created', {
      expertId: expertRecord.id,
      tier: initialTier,
      qualityScore: qualityAssessment.overallScore
    });

    return expertRecord;
  }

  /**
   * 📊 UPDATE APPROVAL METRICS
   */
  async updateApprovalMetrics(approvalResult) {
    const metricsKey = 'approval_metrics:daily';
    const today = new Date().toISOString().split('T')[0];

    const pipeline = this.redis.pipeline();

    // Update daily counters
    pipeline.hincrby(metricsKey, `total_${today}`, 1);
    pipeline.hincrby(metricsKey, `${approvalResult.status.toLowerCase()}_${today}`, 1);
    
    // Update skill category metrics
    if (approvalResult.expertRecord) {
      pipeline.hincrby(
        'approval_metrics:by_skill', 
        approvalResult.expertRecord.skillCategory, 
        1
      );
    }

    // Update quality score distribution
    const qualityBucket = Math.floor(approvalResult.qualityScore * 10) / 10;
    pipeline.zincrby('approval_quality_distribution', 1, qualityBucket.toString());

    await pipeline.exec();

    this.logger.debug('Approval metrics updated', {
      status: approvalResult.status,
      qualityScore: approvalResult.qualityScore
    });
  }

  /**
   * 🔔 SEND APPROVAL NOTIFICATIONS
   */
  async sendApprovalNotifications(approvalResult) {
    const notifications = [];

    // Notify expert
    if (approvalResult.expertRecord) {
      notifications.push(this.sendExpertNotification(approvalResult));
    }

    // Notify quality team for manual reviews
    if (approvalResult.status === 'PENDING_MANUAL_REVIEW') {
      notifications.push(this.sendQualityTeamNotification(approvalResult));
    }

    // Notify admin team for statistics
    notifications.push(this.sendAdminTeamNotification(approvalResult));

    // Execute all notifications in parallel
    await Promise.allSettled(notifications);

    this.logger.debug('Approval notifications sent', {
      expertId: approvalResult.expertId,
      notificationCount: notifications.length
    });
  }

  /**
   * 🗄️ LOAD APPROVAL WORKFLOWS
   */
  async loadApprovalWorkflows() {
    try {
      const workflows = await this.prisma.approvalWorkflow.findMany({
        where: { isActive: true },
        include: { stages: true }
      });

      this.workflows = new Map();
      workflows.forEach(workflow => {
        this.workflows.set(workflow.skillCategory, workflow);
      });

      this.logger.info(`Loaded ${workflows.length} approval workflows`);
    } catch (error) {
      this.logger.error('Failed to load approval workflows', error);
    }
  }

  /**
   * 📈 GET APPROVAL ANALYTICS
   */
  async getApprovalAnalytics(timeframe = '30d') {
    const cacheKey = `approval_analytics:${timeframe}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const days = parseInt(timeframe);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const analytics = await this.prisma.expertApproval.groupBy({
      by: ['status', 'decision'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: { id: true },
      _avg: { qualityScore: true },
      _max: { createdAt: true }
    });

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(analytics));

    return analytics;
  }

  /**
   * 🔄 BATCH APPROVAL PROCESSING
   */
  async processBatchApprovals(approvalBatch, adminId) {
    const batchId = `batch_${Date.now()}`;
    const results = {
      batchId,
      total: approvalBatch.length,
      processed: 0,
      successful: 0,
      failed: 0,
      details: []
    };

    this.logger.info('Starting batch approval processing', { batchId, total: approvalBatch.length });

    // Process approvals in batches of 5 for performance
    const batchSize = 5;
    for (let i = 0; i < approvalBatch.length; i += batchSize) {
      const batch = approvalBatch.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(approval => this.submitExpertForApproval(approval, adminId))
      );

      batchResults.forEach((result, index) => {
        const originalIndex = i + index;
        if (result.status === 'fulfilled') {
          results.successful++;
          results.details[originalIndex] = { status: 'SUCCESS', data: result.value };
        } else {
          results.failed++;
          results.details[originalIndex] = { status: 'FAILED', error: result.reason.message };
        }
        results.processed++;
      });

      // Small delay between batches to prevent overload
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.logger.info('Batch approval processing completed', results);
    return results;
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      await this.aiVerifier.destroy();
      await this.documentValidator.destroy();
      this.removeAllListeners();
      this.logger.info('Expert approval system resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }

  // Utility methods for validation and calculations
  validateFaydaIdFormat(faydaId) {
    const faydaRegex = /^[A-Z0-9]{10,15}$/;
    return faydaRegex.test(faydaId);
  }

  validateEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePhoneFormat(phone) {
    const ethiopianPhoneRegex = /^(\+251|0)[1-9][0-9]{8}$/;
    return ethiopianPhoneRegex.test(phone);
  }

  calculateVerificationScore(stages) {
    const weights = {
      documentVerification: 0.3,
      portfolioAnalysis: 0.25,
      skillAssessment: 0.25,
      backgroundCheck: 0.1,
      financialCheck: 0.1
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([stage, weight]) => {
      if (stages[stage] && stages[stage].score !== undefined) {
        totalScore += stages[stage].score * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  determineRiskLevel(score) {
    if (score >= 0.9) return 'LOW';
    if (score >= 0.7) return 'MEDIUM';
    if (score >= 0.5) return 'HIGH';
    return 'VERY_HIGH';
  }

  determineInitialTier(qualityScore) {
    if (qualityScore >= 0.9) return 'MASTER';
    if (qualityScore >= 0.8) return 'SENIOR';
    if (qualityScore >= 0.7) return 'STANDARD';
    return 'DEVELOPING';
  }

  calculateInitialCapacity(tier, experienceYears) {
    const baseCapacity = {
      'MASTER': 100,
      'SENIOR': 50,
      'STANDARD': 25,
      'DEVELOPING': 10
    }[tier] || 25;

    return Math.min(baseCapacity + Math.floor(experienceYears / 2), 150);
  }
}

// Export singleton instance
module.exports = new ExpertApprovalSystem();