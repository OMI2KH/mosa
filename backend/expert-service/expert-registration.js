/**
 * 🏢 MOSA FORGE - Enterprise Expert Registration Service
 * 👨‍🏫 Verified Expert Onboarding & Quality Management
 * 🛡️ Multi-Layer Verification & Portfolio Validation
 * 📊 Dynamic Tier System & Capacity Management
 * 🚀 Microservice-Ready Enterprise Architecture
 * 
 * @module ExpertRegistration
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const axios = require('axios');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

// 🏗️ Enterprise Dependencies
const EnterpriseLogger = require('../../utils/enterprise-logger');
const SecurityMetrics = require('../../utils/security-metrics');
const AuditLogger = require('../../utils/audit-logger');
const DocumentValidator = require('../../utils/document-validator');
const QualityScorer = require('../../utils/quality-scorer');
const NotificationService = require('../../services/notification-service');

class ExpertRegistration extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 🎯 Enterprise Configuration
    this.config = {
      // 👨‍🏫 Expert Requirements
      requirements: {
        minimumAge: 18,
        verifiedDocuments: ['fayda_id', 'portfolio', 'certificates', 'bank_account'],
        minimumExperience: 6, // months
        skillCertification: true,
        backgroundCheck: true
      },

      // 🛡️ Verification Configuration
      verification: {
        faydaValidation: true,
        documentAI: true,
        manualReview: true,
        maxVerificationDays: 3
      },

      // 📊 Tier System Configuration
      tiers: {
        standard: {
          minQualityScore: 4.0,
          maxStudents: 50,
          baseEarning: 999,
          requirements: ['verified_documents', 'basic_portfolio']
        },
        senior: {
          minQualityScore: 4.3,
          maxStudents: 100,
          baseEarning: 1099,
          requirements: ['advanced_portfolio', 'client_references', 'specialized_certification']
        },
        master: {
          minQualityScore: 4.7,
          maxStudents: null, // Unlimited
          baseEarning: 1199,
          requirements: ['exceptional_portfolio', 'industry_recognition', 'mentorship_experience']
        }
      },

      // 🔄 Capacity Management
      capacity: {
        autoScaling: true,
        qualityBasedLimits: true,
        performanceMonitoring: true
      },

      // 📧 Notification Configuration
      notifications: {
        verificationPending: true,
        approvalNotification: true,
        tierPromotion: true,
        qualityAlerts: true
      },

      ...config
    };

    // 🏗️ Service State
    this.serviceState = {
      initialized: false,
      healthy: false,
      activeRegistrations: 0,
      verificationQueueSize: 0,
      lastQualityScan: null
    };

    this.metrics = {
      registrationsInitiated: 0,
      registrationsCompleted: 0,
      registrationsRejected: 0,
      averageVerificationTime: 0,
      qualityScoreDistribution: {},
      tierDistribution: {}
    };

    this.initializeEnterpriseServices();
  }

  /**
   * 🏗️ Initialize Enterprise Services
   */
  async initializeEnterpriseServices() {
    try {
      // 📊 Enterprise Logging
      this.logger = new EnterpriseLogger({
        service: 'expert-registration',
        module: 'expert-service',
        environment: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL || 'info'
      });

      // 🛡️ Security Metrics
      this.securityMetrics = new SecurityMetrics({
        service: 'expert-registration',
        businessUnit: 'quality-assurance'
      });

      // 📝 Audit Logger
      this.auditLogger = new AuditLogger({
        service: 'expert-registration',
        retentionPeriod: '730d',
        encryption: true
      });

      // 📄 Document Validator
      this.documentValidator = new DocumentValidator({
        supportedFormats: ['pdf', 'jpg', 'png', 'jpeg'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        aiValidation: true
      });

      // ⭐ Quality Scorer
      this.qualityScorer = new QualityScorer({
        metrics: ['experience', 'certifications', 'portfolio_quality', 'client_feedback'],
        weights: {
          experience: 0.3,
          certifications: 0.25,
          portfolio_quality: 0.35,
          client_feedback: 0.1
        }
      });

      // 📧 Notification Service
      this.notificationService = new NotificationService({
        templates: {
          verificationPending: 'expert_verification_pending_v1',
          approvalSuccess: 'expert_approval_success_v1',
          tierPromotion: 'expert_tier_promotion_v1',
          applicationRejected: 'expert_application_rejected_v1'
        }
      });

      // 💾 Database Client
      this.prisma = new PrismaClient({
        log: ['error', 'warn'],
        datasourceUrl: process.env.DATABASE_URL,
        transactionTimeout: 30000
      });

      // 🔄 Redis Cluster
      this.redis = new Redis.Cluster([
        { host: process.env.REDIS_HOST_1, port: process.env.REDIS_PORT_1 },
        { host: process.env.REDIS_HOST_2, port: process.env.REDIS_PORT_2 },
        { host: process.env.REDIS_HOST_3, port: process.env.REDIS_PORT_3 }
      ], {
        scaleReads: 'slave',
        redisOptions: {
          password: process.env.REDIS_PASSWORD,
          tls: process.env.NODE_ENV === 'production' ? {} : undefined
        }
      });

      // 🔗 External Service Clients
      this.initializeServiceClients();

      this.serviceState.initialized = true;
      this.serviceState.healthy = true;

      this.logger.system('Enterprise Expert Registration initialized successfully', {
        service: 'expert-registration',
        version: '2.0.0',
        features: Object.keys(this.config).filter(k => this.config[k] === true)
      });

    } catch (error) {
      this.logger.critical('Enterprise Expert Registration initialization failed', {
        error: error.message,
        stack: error.stack,
        service: 'expert-registration'
      });
      throw error;
    }
  }

  /**
   * 🔗 Initialize External Service Clients
   */
  initializeServiceClients() {
    this.serviceClients = {
      // 🆔 Fayda ID Verification
      fayda: axios.create({
        baseURL: process.env.FAYDA_API_URL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FAYDA_API_KEY}`
        }
      }),

      // 🏦 Bank Account Verification
      bankVerification: axios.create({
        baseURL: process.env.BANK_VERIFICATION_URL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.BANK_VERIFICATION_API_KEY
        }
      }),

      // 📧 Email Service
      email: axios.create({
        baseURL: process.env.EMAIL_SERVICE_URL,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Key': process.env.EMAIL_SERVICE_KEY
        }
      })
    };
  }

  /**
   * 👨‍🏫 REGISTER EXPERT - Enterprise Grade
   */
  async registerExpert(registrationData, context = {}) {
    const startTime = performance.now();
    const registrationId = this.generateRegistrationId();
    const traceId = context.traceId || registrationId;

    try {
      // 🛡️ Pre-flight Checks
      await this.performPreFlightChecks();

      // ✅ Validate Registration Data
      await this.validateRegistrationData(registrationData);

      // 🔍 Check Duplicate Expert
      await this.checkDuplicateExpert(registrationData);

      // 🆔 Verify Fayda ID
      const faydaVerification = await this.verifyFaydaID(registrationData.faydaId, registrationData.personalInfo);

      // 📄 Validate Documents
      const documentValidation = await this.validateExpertDocuments(registrationData.documents);

      // ⭐ Calculate Initial Quality Score
      const qualityAssessment = await this.assessExpertQuality(registrationData);

      // 💾 Create Expert Profile
      const expertProfile = await this.createExpertProfile({
        registrationData,
        faydaVerification,
        documentValidation,
        qualityAssessment,
        registrationId,
        traceId
      });

      // 🔄 Queue for Manual Review (if required)
      if (this.requiresManualReview(qualityAssessment, documentValidation)) {
        await this.queueForManualReview(expertProfile);
      }

      // 📧 Send Verification Notification
      await this.sendVerificationNotification(expertProfile);

      // 📊 Record Metrics
      await this.recordRegistrationMetrics({
        registrationId,
        qualityScore: qualityAssessment.overallScore,
        responseTime: performance.now() - startTime,
        status: 'pending_verification'
      });

      this.metrics.registrationsInitiated++;
      this.serviceState.activeRegistrations++;

      this.logger.business('Expert registration initiated successfully', {
        registrationId,
        traceId,
        expertId: expertProfile.id,
        qualityScore: qualityAssessment.overallScore,
        estimatedTier: qualityAssessment.estimatedTier
      });

      return {
        success: true,
        registrationId,
        expertId: expertProfile.id,
        status: 'pending_verification',
        estimatedTier: qualityAssessment.estimatedTier,
        nextSteps: this.generateRegistrationNextSteps('pending_verification'),
        estimatedVerificationTime: '1-3 business days'
      };

    } catch (error) {
      await this.handleRegistrationFailure({
        registrationId,
        registrationData,
        error,
        context,
        responseTime: performance.now() - startTime,
        traceId
      });
      throw error;
    }
  }

  /**
   * ✅ VALIDATE REGISTRATION DATA
   */
  async validateRegistrationData(registrationData) {
    const validationRules = {
      // 🔍 Required Fields
      requiredFields: [
        'faydaId', 'personalInfo', 'skills', 'experience', 
        'documents', 'bankAccount', 'contactInfo'
      ],

      // 🎯 Personal Info Validation
      personalInfo: {
        required: ['firstName', 'lastName', 'dateOfBirth', 'phoneNumber', 'email'],
        ageLimit: this.config.requirements.minimumAge
      },

      // 💼 Skills Validation
      skills: {
        minSkills: 1,
        maxSkills: 5,
        allowedCategories: this.getAllowedSkillCategories()
      },

      // 📊 Experience Validation
      experience: {
        minMonths: this.config.requirements.minimumExperience,
        maxMonths: 600 // 50 years
      },

      // 📄 Documents Validation
      documents: {
        required: this.config.requirements.verifiedDocuments,
        maxTotalSize: 50 * 1024 * 1024 // 50MB
      }
    };

    const errors = [];

    // ✅ Check Required Fields
    const missingFields = validationRules.requiredFields.filter(field => !registrationData[field]);
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // ✅ Validate Personal Info
    if (registrationData.personalInfo) {
      const personalInfoErrors = this.validatePersonalInfo(registrationData.personalInfo, validationRules.personalInfo);
      errors.push(...personalInfoErrors);
    }

    // ✅ Validate Skills
    if (registrationData.skills) {
      const skillsErrors = this.validateSkills(registrationData.skills, validationRules.skills);
      errors.push(...skillsErrors);
    }

    // ✅ Validate Experience
    if (registrationData.experience) {
      const experienceErrors = this.validateExperience(registrationData.experience, validationRules.experience);
      errors.push(...experienceErrors);
    }

    // ✅ Validate Documents
    if (registrationData.documents) {
      const documentErrors = await this.validateDocumentRequirements(registrationData.documents, validationRules.documents);
      errors.push(...documentErrors);
    }

    if (errors.length > 0) {
      throw new ExpertRegistrationError('REGISTRATION_VALIDATION_FAILED', 'Expert registration validation failed', {
        errors,
        faydaId: registrationData.faydaId
      });
    }

    this.logger.security('Expert registration validation passed', {
      faydaId: registrationData.faydaId,
      skillsCount: registrationData.skills?.length || 0,
      validations: Object.keys(validationRules)
    });
  }

  /**
   * 🆔 VERIFY FAYDA ID
   */
  async verifyFaydaID(faydaId, personalInfo) {
    try {
      const cacheKey = `fayda_verification:${faydaId}`;
      const cachedVerification = await this.redis.get(cacheKey);

      if (cachedVerification) {
        return JSON.parse(cachedVerification);
      }

      const verificationRequest = {
        faydaId,
        personalInfo: {
          firstName: personalInfo.firstName,
          lastName: personalInfo.lastName,
          dateOfBirth: personalInfo.dateOfBirth
        },
        requestId: this.generateRequestId()
      };

      const response = await this.serviceClients.fayda.post('/verify', verificationRequest, {
        headers: {
          'X-Request-ID': verificationRequest.requestId,
          'X-Platform': 'MOSA-FORGE'
        }
      });

      if (!response.data.verified) {
        throw new ExpertRegistrationError('FAYDA_VERIFICATION_FAILED', 'Fayda ID verification failed', {
          faydaId,
          reason: response.data.reason
        });
      }

      const verificationResult = {
        verified: true,
        faydaId: response.data.faydaId,
        verifiedAt: new Date().toISOString(),
        details: response.data.details
      };

      // 💾 Cache successful verification
      await this.redis.setex(cacheKey, 86400, JSON.stringify(verificationResult)); // 24 hours

      this.logger.security('Fayda ID verification successful', {
        faydaId,
        requestId: verificationRequest.requestId
      });

      return verificationResult;

    } catch (error) {
      this.logger.error('Fayda ID verification failed', {
        faydaId,
        error: error.message
      });

      if (error.code === 'FAYDA_VERIFICATION_FAILED') {
        throw error;
      }

      throw new ExpertRegistrationError('FAYDA_SERVICE_UNAVAILABLE', 'Fayda verification service temporarily unavailable', {
        faydaId,
        originalError: error.message
      });
    }
  }

  /**
   * 📄 VALIDATE EXPERT DOCUMENTS
   */
  async validateExpertDocuments(documents) {
    const validationResults = {};
    const errors = [];

    for (const [docType, document] of Object.entries(documents)) {
      try {
        const validation = await this.documentValidator.validateDocument(document, docType);
        validationResults[docType] = validation;

        if (!validation.isValid) {
          errors.push(`Invalid ${docType}: ${validation.errors.join(', ')}`);
        }

      } catch (error) {
        errors.push(`Document validation failed for ${docType}: ${error.message}`);
        validationResults[docType] = {
          isValid: false,
          errors: [error.message]
        };
      }
    }

    // ✅ Check Required Documents
    const missingDocuments = this.config.requirements.verifiedDocuments.filter(
      docType => !documents[docType] || !validationResults[docType]?.isValid
    );

    if (missingDocuments.length > 0) {
      errors.push(`Missing or invalid required documents: ${missingDocuments.join(', ')}`);
    }

    if (errors.length > 0) {
      throw new ExpertRegistrationError('DOCUMENT_VALIDATION_FAILED', 'Expert document validation failed', {
        errors,
        validationResults
      });
    }

    this.logger.security('Expert document validation passed', {
      validatedDocuments: Object.keys(validationResults),
      aiValidation: this.config.verification.documentAI
    });

    return {
      isValid: true,
      validationResults,
      validatedAt: new Date().toISOString()
    };
  }

  /**
   * ⭐ ASSESS EXPERT QUALITY
   */
  async assessExpertQuality(registrationData) {
    try {
      const qualityMetrics = await this.calculateQualityMetrics(registrationData);
      const overallScore = this.qualityScorer.calculateOverallScore(qualityMetrics);
      const estimatedTier = this.determineInitialTier(overallScore, qualityMetrics);

      const qualityAssessment = {
        overallScore,
        estimatedTier,
        metrics: qualityMetrics,
        strengths: this.identifyStrengths(qualityMetrics),
        improvementAreas: this.identifyImprovementAreas(qualityMetrics),
        assessedAt: new Date().toISOString()
      };

      this.logger.business('Expert quality assessment completed', {
        faydaId: registrationData.faydaId,
        overallScore,
        estimatedTier,
        strengths: qualityAssessment.strengths
      });

      return qualityAssessment;

    } catch (error) {
      this.logger.error('Expert quality assessment failed', {
        faydaId: registrationData.faydaId,
        error: error.message
      });

      throw new ExpertRegistrationError('QUALITY_ASSESSMENT_FAILED', 'Failed to assess expert quality', {
        originalError: error.message
      });
    }
  }

  /**
   * 📊 CALCULATE QUALITY METRICS
   */
  async calculateQualityMetrics(registrationData) {
    const metrics = {};

    // 💼 Experience Metric
    metrics.experience = this.calculateExperienceScore(registrationData.experience);

    // 🎓 Certification Metric
    metrics.certifications = this.calculateCertificationScore(registrationData.documents?.certificates);

    // 📁 Portfolio Quality Metric
    metrics.portfolio_quality = await this.calculatePortfolioScore(registrationData.documents?.portfolio);

    // 💬 Client Feedback Metric (from references if available)
    metrics.client_feedback = this.calculateClientFeedbackScore(registrationData.references);

    return metrics;
  }

  /**
   * 💾 CREATE EXPERT PROFILE
   */
  async createExpertProfile(profileData) {
    const transaction = await this.prisma.$transaction(async (prisma) => {
      try {
        // 👨‍🏫 Create Expert Record
        const expert = await prisma.expert.create({
          data: {
            faydaId: profileData.registrationData.faydaId,
            personalInfo: profileData.registrationData.personalInfo,
            contactInfo: profileData.registrationData.contactInfo,
            bankAccount: profileData.registrationData.bankAccount,
            qualityScore: profileData.qualityAssessment.overallScore,
            currentTier: profileData.qualityAssessment.estimatedTier,
            status: 'pending_verification',
            verificationData: {
              faydaVerification: profileData.faydaVerification,
              documentValidation: profileData.documentValidation,
              qualityAssessment: profileData.qualityAssessment
            },
            metadata: {
              registrationId: profileData.registrationId,
              traceId: profileData.traceId,
              registeredAt: new Date().toISOString()
            }
          }
        });

        // 💼 Create Skill Associations
        if (profileData.registrationData.skills && profileData.registrationData.skills.length > 0) {
          await prisma.expertSkill.createMany({
            data: profileData.registrationData.skills.map(skillId => ({
              expertId: expert.id,
              skillId: skillId,
              verified: false, // Will be verified during manual review
              addedAt: new Date()
            }))
          });
        }

        // 📄 Create Document Records
        const documentRecords = [];
        for (const [docType, document] of Object.entries(profileData.registrationData.documents)) {
          documentRecords.push({
            expertId: expert.id,
            documentType: docType,
            documentUrl: document.url,
            fileName: document.fileName,
            fileSize: document.fileSize,
            verified: profileData.documentValidation.validationResults[docType]?.isValid || false,
            metadata: {
              validationResult: profileData.documentValidation.validationResults[docType],
              uploadedAt: new Date().toISOString()
            }
          });
        }

        await prisma.expertDocument.createMany({
          data: documentRecords
        });

        // 📊 Create Initial Quality Metrics
        await prisma.qualityMetrics.create({
          data: {
            expertId: expert.id,
            overallScore: profileData.qualityAssessment.overallScore,
            metricDetails: profileData.qualityAssessment.metrics,
            tier: profileData.qualityAssessment.estimatedTier,
            calculatedAt: new Date()
          }
        });

        this.logger.business('Expert profile created successfully', {
          expertId: expert.id,
          faydaId: expert.faydaId,
          tier: expert.currentTier,
          skillsCount: profileData.registrationData.skills?.length || 0
        });

        return expert;

      } catch (error) {
        this.logger.error('Expert profile creation failed', {
          registrationId: profileData.registrationId,
          error: error.message
        });
        throw error;
      }
    });

    return transaction;
  }

  /**
   * ✅ APPROVE EXPERT - Enterprise Grade
   */
  async approveExpert(approvalData, context = {}) {
    const startTime = performance.now();
    const approvalId = this.generateApprovalId();
    const traceId = context.traceId || approvalId;

    try {
      const { expertId, approvedBy, notes, tierAssignment } = approvalData;

      // 🔍 Verify Expert Exists and is Pending
      const expert = await this.prisma.expert.findUnique({
        where: { id: expertId },
        include: {
          skills: true,
          documents: true
        }
      });

      if (!expert) {
        throw new ExpertRegistrationError('EXPERT_NOT_FOUND', 'Expert not found for approval');
      }

      if (expert.status !== 'pending_verification') {
        throw new ExpertRegistrationError('INVALID_EXPERT_STATUS', 'Expert is not in pending verification status');
      }

      // 🎯 Determine Final Tier
      const finalTier = tierAssignment || expert.currentTier;
      const tierConfig = this.config.tiers[finalTier];

      if (!tierConfig) {
        throw new ExpertRegistrationError('INVALID_TIER_ASSIGNMENT', `Invalid tier assignment: ${finalTier}`);
      }

      // ✅ Verify Tier Requirements Met
      await this.verifyTierRequirements(expert, finalTier);

      // 💾 Update Expert Status
      const updatedExpert = await this.prisma.expert.update({
        where: { id: expertId },
        data: {
          status: 'active',
          currentTier: finalTier,
          approvedAt: new Date(),
          approvedBy: approvedBy,
          maxStudents: tierConfig.maxStudents,
          metadata: {
            ...expert.metadata,
            approvalId,
            approvedBy,
            approvalNotes: notes,
            approvalDate: new Date().toISOString()
          }
        },
        include: {
          skills: {
            include: {
              skill: true
            }
          }
        }
      });

      // ✅ Verify Skills
      await this.verifyExpertSkills(expertId);

      // 📧 Send Approval Notification
      await this.sendApprovalNotification(updatedExpert);

      // 📊 Record Metrics
      await this.recordApprovalMetrics({
        approvalId,
        expertId,
        tier: finalTier,
        responseTime: performance.now() - startTime
      });

      this.metrics.registrationsCompleted++;
      this.serviceState.activeRegistrations--;

      this.logger.business('Expert approval completed successfully', {
        approvalId,
        traceId,
        expertId,
        tier: finalTier,
        approvedBy,
        skillsCount: updatedExpert.skills.length
      });

      return {
        success: true,
        approvalId,
        expertId,
        tier: finalTier,
        maxStudents: tierConfig.maxStudents,
        baseEarning: tierConfig.baseEarning,
        nextSteps: this.generateApprovalNextSteps(finalTier)
      };

    } catch (error) {
      await this.handleApprovalFailure({
        approvalId,
        approvalData,
        error,
        context,
        responseTime: performance.now() - startTime,
        traceId
      });
      throw error;
    }
  }

  /**
   * ❌ REJECT EXPERT APPLICATION
   */
  async rejectExpert(rejectionData, context = {}) {
    const rejectionId = this.generateRejectionId();
    const traceId = context.traceId || rejectionId;

    try {
      const { expertId, rejectedBy, reason, feedback } = rejectionData;

      const expert = await this.prisma.expert.findUnique({
        where: { id: expertId }
      });

      if (!expert) {
        throw new ExpertRegistrationError('EXPERT_NOT_FOUND', 'Expert not found for rejection');
      }

      // 💾 Update Expert Status
      await this.prisma.expert.update({
        where: { id: expertId },
        data: {
          status: 'rejected',
          rejectedAt: new Date(),
          rejectedBy: rejectedBy,
          metadata: {
            ...expert.metadata,
            rejectionId,
            rejectionReason: reason,
            rejectionFeedback: feedback,
            rejectedBy,
            rejectionDate: new Date().toISOString()
          }
        }
      });

      // 📧 Send Rejection Notification
      await this.sendRejectionNotification(expert, reason, feedback);

      this.metrics.registrationsRejected++;
      this.serviceState.activeRegistrations--;

      this.logger.business('Expert application rejected', {
        rejectionId,
        traceId,
        expertId,
        reason,
        rejectedBy
      });

      return {
        success: true,
        rejectionId,
        expertId,
        reason,
        feedbackProvided: !!feedback
      };

    } catch (error) {
      this.logger.error('Expert rejection failed', {
        rejectionId,
        expertId: rejectionData.expertId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🔄 QUEUE FOR MANUAL REVIEW
   */
  async queueForManualReview(expertProfile) {
    const reviewItem = {
      expertId: expertProfile.id,
      faydaId: expertProfile.faydaId,
      qualityScore: expertProfile.qualityScore,
      estimatedTier: expertProfile.currentTier,
      reviewPriority: this.calculateReviewPriority(expertProfile),
      queuedAt: new Date(),
      metadata: expertProfile.metadata
    };

    await this.redis.lpush('expert_review_queue', JSON.stringify(reviewItem));
    await this.redis.hset('expert_review_data', expertProfile.id, JSON.stringify(expertProfile));

    this.serviceState.verificationQueueSize = await this.redis.llen('expert_review_queue');

    this.logger.system('Expert queued for manual review', {
      expertId: expertProfile.id,
      queuePosition: this.serviceState.verificationQueueSize,
      reviewPriority: reviewItem.reviewPriority
    });
  }

  /**
   * 📊 GET REGISTRATION ANALYTICS
   */
  async getRegistrationAnalytics(timeRange = '30d') {
    const analytics = {
      summary: {
        totalRegistrations: this.metrics.registrationsInitiated,
        approvalRate: this.metrics.registrationsInitiated > 0 ? 
          (this.metrics.registrationsCompleted / this.metrics.registrationsInitiated) * 100 : 0,
        rejectionRate: this.metrics.registrationsInitiated > 0 ? 
          (this.metrics.registrationsRejected / this.metrics.registrationsInitiated) * 100 : 0,
        averageVerificationTime: this.metrics.averageVerificationTime
      },
      byTier: await this.getRegistrationsByTier(timeRange),
      bySkill: await this.getRegistrationsBySkill(timeRange),
      byTime: await this.getRegistrationsByTimePeriod(timeRange),
      queueMetrics: {
        activeRegistrations: this.serviceState.activeRegistrations,
        verificationQueueSize: this.serviceState.verificationQueueSize,
        lastQualityScan: this.serviceState.lastQualityScan
      }
    };

    return analytics;
  }

  /**
   * 🔧 UTILITY METHODS
   */

  generateRegistrationId() {
    return `reg_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateApprovalId() {
    return `app_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateRejectionId() {
    return `rej_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateRequestId() {
    return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  calculateReviewPriority(expertProfile) {
    const score = expertProfile.qualityScore;
    if (score >= 4.5) return 'HIGH';
    if (score >= 4.0) return 'MEDIUM';
    return 'LOW';
  }

  determineInitialTier(qualityScore, qualityMetrics) {
    if (qualityScore >= this.config.tiers.master.minQualityScore) return 'master';
    if (qualityScore >= this.config.tiers.senior.minQualityScore) return 'senior';
    return 'standard';
  }

  requiresManualReview(qualityAssessment, documentValidation) {
    // Require manual review for borderline cases or document issues
    if (qualityAssessment.overallScore < 4.0) return true;
    if (documentValidation.validationResults.portfolio?.needsManualReview) return true;
    return false;
  }

  getAllowedSkillCategories() {
    return [
      'online_skills', 'offline_skills', 'health_sports', 'beauty_fashion'
    ];
  }

  generateRegistrationNextSteps(status) {
    const nextSteps = {
      pending_verification: ['document_verification', 'quality_assessment', 'manual_review'],
      approved: ['profile_activation', 'training_access', 'student_matching'],
      rejected: ['feedback_review', 'reapplication_guidance', 'support_contact']
    };

    return nextSteps[status] || [];
  }

  generateApprovalNextSteps(tier) {
    const nextSteps = {
      master: ['advanced_training', 'mentor_program', 'premium_student_matching'],
      senior: ['skill_enhancement', 'quality_standards', 'student_management'],
      standard: ['basic_training', 'platform_orientation', 'first_student_matching']
    };

    return nextSteps[tier] || nextSteps.standard;
  }

  /**
   * 🎯 ERROR HANDLING
   */
  async handleRegistrationFailure({ registrationId, registrationData, error, context, responseTime, traceId }) {
    this.metrics.registrationsFailed++;

    this.logger.error('Expert registration failed', {
      registrationId,
      traceId,
      faydaId: registrationData.faydaId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2)
    });

    await this.auditLogger.logSecurityEvent({
      event: 'EXPERT_REGISTRATION_FAILED',
      registrationId,
      faydaId: registrationData.faydaId,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ipAddress
    });
  }

  async handleApprovalFailure({ approvalId, approvalData, error, context, responseTime, traceId }) {
    this.logger.error('Expert approval failed', {
      approvalId,
      traceId,
      expertId: approvalData.expertId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2)
    });

    await this.auditLogger.logSecurityEvent({
      event: 'EXPERT_APPROVAL_FAILED',
      approvalId,
      expertId: approvalData.expertId,
      error: error.message,
      errorCode: error.code
    });
  }
}

/**
 * 🎯 ENTERPRISE EXPERT REGISTRATION ERROR CLASS
 */
class ExpertRegistrationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ExpertRegistrationError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }
}

// 🎯 Enterprise Expert Registration Error Codes
ExpertRegistrationError.CODES = {
  // 🔐 Validation Errors
  REGISTRATION_VALIDATION_FAILED: 'REGISTRATION_VALIDATION_FAILED',
  INVALID_PERSONAL_INFO: 'INVALID_PERSONAL_INFO',
  INVALID_SKILLS: 'INVALID_SKILLS',
  INSUFFICIENT_EXPERIENCE: 'INSUFFICIENT_EXPERIENCE',

  // 🛡️ Verification Errors
  FAYDA_VERIFICATION_FAILED: 'FAYDA_VERIFICATION_FAILED',
  FAYDA_SERVICE_UNAVAILABLE: 'FAYDA_SERVICE_UNAVAILABLE',
  DOCUMENT_VALIDATION_FAILED: 'DOCUMENT_VALIDATION_FAILED',

  // 📊 Quality Assessment Errors
  QUALITY_ASSESSMENT_FAILED: 'QUALITY_ASSESSMENT_FAILED',
  INSUFFICIENT_QUALITY_SCORE: 'INSUFFICIENT_QUALITY_SCORE',

  // 💾 Data Management Errors
  DUPLICATE_EXPERT: 'DUPLICATE_EXPERT',
  EXPERT_NOT_FOUND: 'EXPERT_NOT_FOUND',
  INVALID_EXPERT_STATUS: 'INVALID_EXPERT_STATUS',

  // 🎯 Tier & Approval Errors
  INVALID_TIER_ASSIGNMENT: 'INVALID_TIER_ASSIGNMENT',
  TIER_REQUIREMENTS_NOT_MET: 'TIER_REQUIREMENTS_NOT_MET'
};

module.exports = {
  ExpertRegistration,
  ExpertRegistrationError
};