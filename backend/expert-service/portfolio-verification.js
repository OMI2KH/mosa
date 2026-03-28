/**
 * 🏢 MOSA FORGE - Enterprise Portfolio Verification Service
 * 📁 AI-Powered Document & Portfolio Validation
 * 🛡️ Multi-Layer Fraud Detection & Authenticity Verification
 * 📊 Quality Scoring & Competency Assessment
 * 🚀 Microservice-Ready Enterprise Architecture
 * 
 * @module PortfolioVerification
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
const { createHash } = require('crypto');

// 🏗️ Enterprise Dependencies
const EnterpriseLogger = require('../../utils/enterprise-logger');
const SecurityMetrics = require('../../utils/security-metrics');
const AuditLogger = require('../../utils/audit-logger');
const AIDocumentAnalyzer = require('../../utils/ai-document-analyzer');
const ImageProcessing = require('../../utils/image-processing');
const FraudDetection = require('../../utils/fraud-detection');

class PortfolioVerification extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 🎯 Enterprise Configuration
    this.config = {
      // 📁 Document Type Configuration
      documentTypes: {
        portfolio: {
          allowedFormats: ['pdf', 'jpg', 'png', 'jpeg', 'doc', 'docx'],
          maxSize: 20 * 1024 * 1024, // 20MB
          minPages: 3,
          maxPages: 50
        },
        certificates: {
          allowedFormats: ['pdf', 'jpg', 'png', 'jpeg'],
          maxSize: 10 * 1024 * 1024, // 10MB
          verificationRequired: true
        },
        fayda_id: {
          allowedFormats: ['jpg', 'png', 'jpeg'],
          maxSize: 5 * 1024 * 1024, // 5MB
          strictValidation: true
        }
      },

      // 🤖 AI Analysis Configuration
      aiAnalysis: {
        enabled: true,
        confidenceThreshold: 0.85,
        features: {
          textExtraction: true,
          imageAnalysis: true,
          authenticityCheck: true,
          qualityScoring: true,
          fraudDetection: true
        }
      },

      // 🛡️ Security Configuration
      security: {
        checksumValidation: true,
        duplicateDetection: true,
        metadataAnalysis: true,
        watermarkDetection: true,
        deepfakeDetection: true
      },

      // 📊 Scoring Configuration
      scoring: {
        portfolio: {
          completeness: 0.25,
          quality: 0.35,
          relevance: 0.20,
          authenticity: 0.20
        },
        certificates: {
          authenticity: 0.40,
          relevance: 0.30,
          recency: 0.30
        }
      },

      // ⚡ Performance Configuration
      performance: {
        batchProcessing: true,
        concurrentAnalyses: 5,
        cacheDuration: 3600, // 1 hour
        timeout: 30000
      },

      ...config
    };

    // 🏗️ Service State
    this.serviceState = {
      initialized: false,
      healthy: false,
      activeVerifications: 0,
      aiServiceAvailable: true,
      lastHealthCheck: null
    };

    this.metrics = {
      verificationsInitiated: 0,
      verificationsCompleted: 0,
      verificationsFailed: 0,
      documentsProcessed: 0,
      fraudAttemptsDetected: 0,
      averageProcessingTime: 0,
      aiConfidenceScores: []
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
        service: 'portfolio-verification',
        module: 'expert-service',
        environment: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL || 'info'
      });

      // 🛡️ Security Metrics
      this.securityMetrics = new SecurityMetrics({
        service: 'portfolio-verification',
        businessUnit: 'fraud-prevention'
      });

      // 📝 Audit Logger
      this.auditLogger = new AuditLogger({
        service: 'portfolio-verification',
        retentionPeriod: '730d',
        encryption: true
      });

      // 🤖 AI Document Analyzer
      this.aiAnalyzer = new AIDocumentAnalyzer({
        apiKey: process.env.AI_ANALYSIS_API_KEY,
        baseURL: process.env.AI_SERVICE_URL,
        confidenceThreshold: this.config.aiAnalysis.confidenceThreshold,
        features: this.config.aiAnalysis.features
      });

      // 🖼️ Image Processing
      this.imageProcessor = new ImageProcessing({
        maxResolution: 4096,
        qualityThreshold: 0.8,
        ocrEnabled: true
      });

      // 🕵️ Fraud Detection
      this.fraudDetector = new FraudDetection({
        similarityThreshold: 0.95,
        patternDetection: true,
        metadataAnalysis: true
      });

      // 💾 Database Client
      this.prisma = new PrismaClient({
        log: ['error', 'warn'],
        datasourceUrl: process.env.DATABASE_URL,
        transactionTimeout: 45000
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

      // 🏥 Health Check
      await this.performHealthCheck();

      this.serviceState.initialized = true;
      this.serviceState.healthy = true;

      this.logger.system('Enterprise Portfolio Verification initialized successfully', {
        service: 'portfolio-verification',
        version: '2.0.0',
        aiEnabled: this.config.aiAnalysis.enabled,
        features: Object.keys(this.config.aiAnalysis.features).filter(k => this.config.aiAnalysis.features[k])
      });

    } catch (error) {
      this.logger.critical('Enterprise Portfolio Verification initialization failed', {
        error: error.message,
        stack: error.stack,
        service: 'portfolio-verification'
      });
      throw error;
    }
  }

  /**
   * 🔗 Initialize External Service Clients
   */
  initializeServiceClients() {
    this.serviceClients = {
      // 🏦 Bank Verification
      bankVerification: axios.create({
        baseURL: process.env.BANK_VERIFICATION_URL,
        timeout: 25000,
        headers: {
          'X-API-Key': process.env.BANK_VERIFICATION_API_KEY,
          'Content-Type': 'application/json'
        }
      }),

      // 🎓 Certificate Verification
      certificateVerification: axios.create({
        baseURL: process.env.CERTIFICATE_VERIFICATION_URL,
        timeout: 30000,
        headers: {
          'Authorization': `Bearer ${process.env.CERTIFICATE_VERIFICATION_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }),

      // 🌐 External Document Validation
      documentValidation: axios.create({
        baseURL: process.env.DOCUMENT_VALIDATION_URL,
        timeout: 35000,
        headers: {
          'X-API-Key': process.env.DOCUMENT_VALIDATION_API_KEY
        }
      })
    };
  }

  /**
   * 📁 VERIFY PORTFOLIO - Enterprise Grade
   */
  async verifyPortfolio(verificationRequest, context = {}) {
    const startTime = performance.now();
    const verificationId = this.generateVerificationId();
    const traceId = context.traceId || verificationId;

    try {
      // 🛡️ Pre-flight Checks
      await this.performPreFlightChecks();

      // ✅ Validate Verification Request
      await this.validateVerificationRequest(verificationRequest);

      // 🔍 Check for Duplicate Submissions
      await this.checkDuplicateSubmission(verificationRequest);

      // 📄 Process Documents
      const documentResults = await this.processDocuments(verificationRequest.documents, traceId);

      // 🤖 AI-Powered Analysis
      const aiAnalysis = await this.performAIAnalysis(verificationRequest.documents, documentResults, traceId);

      // 🕵️ Fraud Detection
      const fraudAnalysis = await this.performFraudAnalysis(documentResults, aiAnalysis, verificationRequest);

      // 📊 Calculate Overall Score
      const verificationScore = await this.calculateVerificationScore(documentResults, aiAnalysis, fraudAnalysis);

      // 💾 Store Verification Results
      const verificationRecord = await this.storeVerificationResults({
        verificationId,
        verificationRequest,
        documentResults,
        aiAnalysis,
        fraudAnalysis,
        verificationScore,
        traceId
      });

      // 📊 Record Metrics
      await this.recordVerificationMetrics({
        verificationId,
        score: verificationScore.overall,
        responseTime: performance.now() - startTime,
        documentsCount: verificationRequest.documents.length,
        fraudDetected: fraudAnalysis.riskLevel === 'HIGH'
      });

      this.metrics.verificationsCompleted++;
      this.metrics.documentsProcessed += verificationRequest.documents.length;

      this.logger.business('Portfolio verification completed successfully', {
        verificationId,
        traceId,
        expertId: verificationRequest.expertId,
        overallScore: verificationScore.overall,
        riskLevel: fraudAnalysis.riskLevel,
        aiConfidence: aiAnalysis.overallConfidence
      });

      return {
        success: true,
        verificationId,
        expertId: verificationRequest.expertId,
        overallScore: verificationScore.overall,
        riskLevel: fraudAnalysis.riskLevel,
        documentResults: this.sanitizeDocumentResults(documentResults),
        aiAnalysis: this.sanitizeAIAnalysis(aiAnalysis),
        nextSteps: this.generateVerificationNextSteps(verificationScore.overall, fraudAnalysis.riskLevel),
        requiresManualReview: this.requiresManualReview(verificationScore.overall, fraudAnalysis.riskLevel)
      };

    } catch (error) {
      await this.handleVerificationFailure({
        verificationId,
        verificationRequest,
        error,
        context,
        responseTime: performance.now() - startTime,
        traceId
      });
      throw error;
    }
  }

  /**
   * ✅ VALIDATE VERIFICATION REQUEST
   */
  async validateVerificationRequest(verificationRequest) {
    const validationRules = {
      requiredFields: ['expertId', 'documents', 'documentType'],
      documentLimits: {
        maxTotalSize: 100 * 1024 * 1024, // 100MB
        maxDocuments: 20,
        minDocuments: 1
      },
      expertRequirements: {
        mustExist: true,
        validStatus: ['pending_verification', 'active']
      }
    };

    const errors = [];

    // ✅ Check Required Fields
    const missingFields = validationRules.requiredFields.filter(field => !verificationRequest[field]);
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // ✅ Validate Documents Array
    if (verificationRequest.documents) {
      const documentErrors = this.validateDocuments(verificationRequest.documents, validationRules.documentLimits);
      errors.push(...documentErrors);
    }

    // ✅ Verify Expert Exists
    if (verificationRequest.expertId) {
      const expertValidation = await this.validateExpert(verificationRequest.expertId, validationRules.expertRequirements);
      if (!expertValidation.valid) {
        errors.push(`Expert validation failed: ${expertValidation.reason}`);
      }
    }

    if (errors.length > 0) {
      throw new PortfolioVerificationError('VERIFICATION_VALIDATION_FAILED', 'Portfolio verification validation failed', {
        errors,
        expertId: verificationRequest.expertId,
        documentCount: verificationRequest.documents?.length || 0
      });
    }

    this.logger.security('Portfolio verification validation passed', {
      expertId: verificationRequest.expertId,
      documentCount: verificationRequest.documents.length,
      documentType: verificationRequest.documentType
    });
  }

  /**
   * 📄 PROCESS DOCUMENTS
   */
  async processDocuments(documents, traceId) {
    const processingResults = {};
    const processingPromises = [];

    for (const [index, document] of documents.entries()) {
      processingPromises.push(
        this.processSingleDocument(document, index, traceId)
          .then(result => { processingResults[document.documentId] = result; })
          .catch(error => {
            processingResults[document.documentId] = {
              processed: false,
              error: error.message,
              documentId: document.documentId
            };
          })
      );
    }

    // ⚡ Process documents concurrently with limits
    await this.processWithConcurrency(processingPromises, this.config.performance.concurrentAnalyses);

    // 🔍 Analyze overall document set
    const overallAnalysis = await this.analyzeDocumentSet(processingResults);

    return {
      individualResults: processingResults,
      overallAnalysis,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * 📄 PROCESS SINGLE DOCUMENT
   */
  async processSingleDocument(document, index, traceId) {
    const documentStartTime = performance.now();
    const documentProcessingId = this.generateDocumentProcessingId();

    try {
      // 🎯 Basic Document Validation
      const basicValidation = await this.validateBasicDocumentProperties(document);
      if (!basicValidation.valid) {
        throw new PortfolioVerificationError('DOCUMENT_VALIDATION_FAILED', 'Document basic validation failed', {
          documentId: document.documentId,
          errors: basicValidation.errors
        });
      }

      // 🔐 Calculate Document Hash
      const documentHash = await this.calculateDocumentHash(document);

      // 💾 Check Document Cache
      const cachedResult = await this.checkDocumentCache(documentHash);
      if (cachedResult) {
        this.logger.debug('Document processed from cache', {
          documentProcessingId,
          documentId: document.documentId,
          cacheHit: true
        });
        return { ...cachedResult, fromCache: true };
      }

      // 📊 Extract Document Metadata
      const metadata = await this.extractDocumentMetadata(document);

      // 🖼️ Process Based on Document Type
      let contentAnalysis;
      if (this.isImageDocument(document)) {
        contentAnalysis = await this.processImageDocument(document, metadata);
      } else if (this.isPDFDocument(document)) {
        contentAnalysis = await this.processPDFDocument(document, metadata);
      } else {
        contentAnalysis = await this.processOtherDocument(document, metadata);
      }

      // 🛡️ Security Checks
      const securityCheck = await this.performSecurityChecks(document, contentAnalysis);

      const processingResult = {
        documentId: document.documentId,
        documentType: document.documentType,
        processed: true,
        basicValidation,
        documentHash,
        metadata,
        contentAnalysis,
        securityCheck,
        processingTime: performance.now() - documentStartTime,
        processedAt: new Date().toISOString()
      };

      // 💾 Cache Successful Processing
      await this.cacheDocumentResult(documentHash, processingResult);

      this.logger.debug('Document processed successfully', {
        documentProcessingId,
        documentId: document.documentId,
        documentType: document.documentType,
        processingTime: processingResult.processingTime
      });

      return processingResult;

    } catch (error) {
      this.logger.error('Document processing failed', {
        documentProcessingId,
        documentId: document.documentId,
        error: error.message,
        processingTime: performance.now() - documentStartTime
      });

      throw error;
    }
  }

  /**
   * 🤖 PERFORM AI ANALYSIS
   */
  async performAIAnalysis(documents, documentResults, traceId) {
    if (!this.config.aiAnalysis.enabled) {
      this.logger.debug('AI analysis disabled, skipping');
      return { enabled: false, skipped: true };
    }

    if (!this.serviceState.aiServiceAvailable) {
      this.logger.warn('AI service unavailable, skipping analysis');
      return { enabled: false, serviceUnavailable: true };
    }

    const aiStartTime = performance.now();
    const aiAnalysisId = this.generateAIAnalysisId();

    try {
      const analysisPromises = documents.map(document => 
        this.analyzeSingleDocumentWithAI(document, documentResults.individualResults[document.documentId])
      );

      const aiResults = await Promise.allSettled(analysisPromises);

      const successfulAnalyses = aiResults
        .filter(result => result.status === 'fulfilled')
        .map(result => result.value);

      const failedAnalyses = aiResults
        .filter(result => result.status === 'rejected')
        .map(result => result.reason);

      // 📊 Aggregate AI Results
      const aggregatedAnalysis = this.aggregateAIAnalysis(successfulAnalyses);

      const aiAnalysis = {
        analysisId: aiAnalysisId,
        enabled: true,
        successfulAnalyses: successfulAnalyses.length,
        failedAnalyses: failedAnalyses.length,
        overallConfidence: aggregatedAnalysis.overallConfidence,
        documentAnalyses: aggregatedAnalysis.documentAnalyses,
        riskIndicators: aggregatedAnalysis.riskIndicators,
        qualityIndicators: aggregatedAnalysis.qualityIndicators,
        processingTime: performance.now() - aiStartTime,
        analyzedAt: new Date().toISOString()
      };

      // 📈 Record AI Confidence Metrics
      this.metrics.aiConfidenceScores.push(aggregatedAnalysis.overallConfidence);
      if (this.metrics.aiConfidenceScores.length > 1000) {
        this.metrics.aiConfidenceScores = this.metrics.aiConfidenceScores.slice(-1000);
      }

      this.logger.business('AI analysis completed', {
        aiAnalysisId,
        traceId,
        successful: successfulAnalyses.length,
        failed: failedAnalyses.length,
        overallConfidence: aggregatedAnalysis.overallConfidence,
        processingTime: aiAnalysis.processingTime
      });

      return aiAnalysis;

    } catch (error) {
      this.logger.error('AI analysis failed', {
        aiAnalysisId,
        traceId,
        error: error.message,
        processingTime: performance.now() - aiStartTime
      });

      // 🚨 Mark AI service as potentially unavailable
      if (error.code === 'AI_SERVICE_UNAVAILABLE') {
        this.serviceState.aiServiceAvailable = false;
        setTimeout(() => {
          this.serviceState.aiServiceAvailable = true;
        }, 300000); // Retry after 5 minutes
      }

      return {
        enabled: true,
        failed: true,
        error: error.message,
        analyzedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 🕵️ PERFORM FRAUD ANALYSIS
   */
  async performFraudAnalysis(documentResults, aiAnalysis, verificationRequest) {
    const fraudStartTime = performance.now();
    const fraudAnalysisId = this.generateFraudAnalysisId();

    try {
      const fraudChecks = [];

      // 🔍 Duplicate Document Detection
      if (this.config.security.duplicateDetection) {
        const duplicateCheck = await this.checkDuplicateDocuments(documentResults);
        fraudChecks.push(duplicateCheck);
      }

      // 📝 Metadata Analysis
      if (this.config.security.metadataAnalysis) {
        const metadataAnalysis = await this.analyzeDocumentMetadata(documentResults);
        fraudChecks.push(metadataAnalysis);
      }

      // 🎭 Deepfake Detection (for images)
      if (this.config.security.deepfakeDetection) {
        const deepfakeAnalysis = await this.detectDeepfakes(documentResults);
        fraudChecks.push(deepfakeAnalysis);
      }

      // 💧 Watermark Detection
      if (this.config.security.watermarkDetection) {
        const watermarkAnalysis = await this.detectWatermarks(documentResults);
        fraudChecks.push(watermarkAnalysis);
      }

      // 🤖 AI-Based Fraud Detection
      if (aiAnalysis.enabled && !aiAnalysis.failed) {
        const aiFraudDetection = await this.aiFraudDetection(aiAnalysis, documentResults);
        fraudChecks.push(aiFraudDetection);
      }

      // 📊 Aggregate Fraud Results
      const fraudResult = this.aggregateFraudResults(fraudChecks);

      if (fraudResult.riskLevel === 'HIGH') {
        this.metrics.fraudAttemptsDetected++;
        
        await this.auditLogger.logSecurityEvent({
          event: 'FRAUD_ATTEMPT_DETECTED',
          fraudAnalysisId,
          expertId: verificationRequest.expertId,
          riskLevel: fraudResult.riskLevel,
          triggers: fraudResult.riskIndicators,
          documentCount: verificationRequest.documents.length
        });
      }

      this.logger.security('Fraud analysis completed', {
        fraudAnalysisId,
        expertId: verificationRequest.expertId,
        riskLevel: fraudResult.riskLevel,
        riskIndicators: fraudResult.riskIndicators.length,
        processingTime: performance.now() - fraudStartTime
      });

      return {
        analysisId: fraudAnalysisId,
        riskLevel: fraudResult.riskLevel,
        riskIndicators: fraudResult.riskIndicators,
        confidence: fraudResult.confidence,
        requiresManualReview: fraudResult.requiresManualReview,
        processedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Fraud analysis failed', {
        fraudAnalysisId,
        expertId: verificationRequest.expertId,
        error: error.message
      });

      return {
        analysisId: fraudAnalysisId,
        riskLevel: 'UNKNOWN',
        riskIndicators: ['ANALYSIS_FAILED'],
        confidence: 0,
        requiresManualReview: true,
        error: error.message,
        processedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 📊 CALCULATE VERIFICATION SCORE
   */
  async calculateVerificationScore(documentResults, aiAnalysis, fraudAnalysis) {
    const scoringStartTime = performance.now();

    try {
      const scoreComponents = {};

      // 📁 Document Completeness Score
      scoreComponents.completeness = this.calculateCompletenessScore(documentResults);

      // 🎯 Document Quality Score
      scoreComponents.quality = this.calculateQualityScore(documentResults);

      // 🔗 Relevance Score
      scoreComponents.relevance = this.calculateRelevanceScore(documentResults);

      // 🛡️ Authenticity Score
      scoreComponents.authenticity = this.calculateAuthenticityScore(documentResults, fraudAnalysis);

      // 🤖 AI Confidence Score
      if (aiAnalysis.enabled && !aiAnalysis.failed) {
        scoreComponents.aiConfidence = aiAnalysis.overallConfidence;
      } else {
        scoreComponents.aiConfidence = 0.5; // Neutral score when AI fails
      }

      // 📈 Calculate Weighted Overall Score
      const weights = this.config.scoring.portfolio;
      const overallScore = (
        scoreComponents.completeness * weights.completeness +
        scoreComponents.quality * weights.quality +
        scoreComponents.relevance * weights.relevance +
        scoreComponents.authenticity * weights.authenticity
      );

      // 📉 Apply Fraud Penalty
      const finalScore = this.applyFraudPenalty(overallScore, fraudAnalysis);

      const verificationScore = {
        overall: finalScore,
        components: scoreComponents,
        weights: weights,
        fraudAdjusted: finalScore !== overallScore,
        calculatedAt: new Date().toISOString(),
        processingTime: performance.now() - scoringStartTime
      };

      this.logger.debug('Verification score calculated', {
        overallScore: verificationScore.overall,
        components: Object.keys(scoreComponents),
        fraudAdjusted: verificationScore.fraudAdjusted
      });

      return verificationScore;

    } catch (error) {
      this.logger.error('Verification score calculation failed', {
        error: error.message
      });

      // 🎯 Return minimum score on failure
      return {
        overall: 0.1,
        components: {},
        error: error.message,
        calculatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 🔧 UTILITY METHODS
   */

  generateVerificationId() {
    return `verify_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  generateDocumentProcessingId() {
    return `doc_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateAIAnalysisId() {
    return `ai_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateFraudAnalysisId() {
    return `fraud_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  async processWithConcurrency(promises, concurrency) {
    const results = [];
    for (let i = 0; i < promises.length; i += concurrency) {
      const batch = promises.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(batch);
      results.push(...batchResults);
    }
    return results;
  }

  calculateDocumentHash(document) {
    const hash = createHash('sha256');
    hash.update(document.content);
    hash.update(document.documentId);
    hash.update(document.documentType);
    return hash.digest('hex');
  }

  async checkDocumentCache(documentHash) {
    if (!this.config.performance.cacheDuration) return null;
    
    const cached = await this.redis.get(`doc_cache:${documentHash}`);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheDocumentResult(documentHash, result) {
    if (!this.config.performance.cacheDuration) return;
    
    await this.redis.setex(
      `doc_cache:${documentHash}`,
      this.config.performance.cacheDuration,
      JSON.stringify(result)
    );
  }

  isImageDocument(document) {
    const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    return imageFormats.includes(document.fileFormat?.toLowerCase());
  }

  isPDFDocument(document) {
    return document.fileFormat?.toLowerCase() === 'pdf';
  }

  requiresManualReview(score, riskLevel) {
    return score < 0.6 || riskLevel === 'HIGH' || riskLevel === 'MEDIUM';
  }

  generateVerificationNextSteps(score, riskLevel) {
    if (riskLevel === 'HIGH') {
      return ['manual_review', 'fraud_investigation', 'expert_interview'];
    } else if (score < 0.6) {
      return ['manual_review', 'additional_documents', 'quality_improvement'];
    } else if (score < 0.8) {
      return ['quality_review', 'skill_verification', 'supplementary_materials'];
    } else {
      return ['auto_approval', 'tier_assignment', 'profile_activation'];
    }
  }

  sanitizeDocumentResults(documentResults) {
    const sanitized = { ...documentResults };
    delete sanitized.individualResults; // Remove detailed individual results
    return {
      overallAnalysis: sanitized.overallAnalysis,
      documentsProcessed: Object.keys(documentResults.individualResults).length,
      processedAt: sanitized.processedAt
    };
  }

  sanitizeAIAnalysis(aiAnalysis) {
    const sanitized = { ...aiAnalysis };
    delete sanitized.documentAnalyses; // Remove detailed AI analysis
    return {
      enabled: sanitized.enabled,
      overallConfidence: sanitized.overallConfidence,
      riskIndicators: sanitized.riskIndicators,
      qualityIndicators: sanitized.qualityIndicators
    };
  }

  /**
   * 🏥 HEALTH CHECK
   */
  async performHealthCheck() {
    try {
      // 🤖 Check AI Service
      const aiHealth = await this.aiAnalyzer.healthCheck();
      
      // 💾 Check Database
      await this.prisma.$queryRaw`SELECT 1`;
      
      // 🔄 Check Redis
      await this.redis.ping();

      this.serviceState.healthy = aiHealth.healthy;
      this.serviceState.aiServiceAvailable = aiHealth.available;
      this.serviceState.lastHealthCheck = new Date();

      if (!this.serviceState.healthy) {
        this.logger.warn('Portfolio verification health check failed', {
          aiHealth: aiHealth.healthy,
          aiAvailable: aiHealth.available
        });
      }

      return this.serviceState.healthy;

    } catch (error) {
      this.serviceState.healthy = false;
      this.logger.error('Portfolio verification health check failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * 📊 GET VERIFICATION ANALYTICS
   */
  async getVerificationAnalytics(timeRange = '30d') {
    const analytics = {
      summary: {
        totalVerifications: this.metrics.verificationsInitiated,
        successRate: this.metrics.verificationsInitiated > 0 ? 
          (this.metrics.verificationsCompleted / this.metrics.verificationsInitiated) * 100 : 0,
        averageProcessingTime: this.metrics.averageProcessingTime,
        fraudDetectionRate: this.metrics.fraudAttemptsDetected
      },
      scoreDistribution: await this.getScoreDistribution(timeRange),
      fraudAnalysis: await this.getFraudAnalysis(timeRange),
      performance: await this.getPerformanceMetrics(timeRange),
      systemHealth: {
        healthy: this.serviceState.healthy,
        aiServiceAvailable: this.serviceState.aiServiceAvailable,
        activeVerifications: this.serviceState.activeVerifications
      }
    };

    return analytics;
  }

  /**
   * 🎯 ERROR HANDLING
   */
  async handleVerificationFailure({ verificationId, verificationRequest, error, context, responseTime, traceId }) {
    this.metrics.verificationsFailed++;

    this.logger.error('Portfolio verification failed', {
      verificationId,
      traceId,
      expertId: verificationRequest.expertId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2)
    });

    await this.auditLogger.logSecurityEvent({
      event: 'PORTFOLIO_VERIFICATION_FAILED',
      verificationId,
      expertId: verificationRequest.expertId,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ipAddress
    });
  }
}

/**
 * 🎯 ENTERPRISE PORTFOLIO VERIFICATION ERROR CLASS
 */
class PortfolioVerificationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'PortfolioVerificationError';
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

// 🎯 Enterprise Portfolio Verification Error Codes
PortfolioVerificationError.CODES = {
  // 🔐 Validation Errors
  VERIFICATION_VALIDATION_FAILED: 'VERIFICATION_VALIDATION_FAILED',
  DOCUMENT_VALIDATION_FAILED: 'DOCUMENT_VALIDATION_FAILED',
  INVALID_DOCUMENT_TYPE: 'INVALID_DOCUMENT_TYPE',
  DOCUMENT_SIZE_EXCEEDED: 'DOCUMENT_SIZE_EXCEEDED',

  // 🛡️ Security Errors
  DUPLICATE_DOCUMENT: 'DUPLICATE_DOCUMENT',
  FRAUD_DETECTED: 'FRAUD_DETECTED',
  DOCUMENT_TAMPERING: 'DOCUMENT_TAMPERING',

  // 🤖 AI Analysis Errors
  AI_ANALYSIS_FAILED: 'AI_ANALYSIS_FAILED',
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  LOW_AI_CONFIDENCE: 'LOW_AI_CONFIDENCE',

  // 📊 Processing Errors
  DOCUMENT_PROCESSING_FAILED: 'DOCUMENT_PROCESSING_FAILED',
  IMAGE_PROCESSING_FAILED: 'IMAGE_PROCESSING_FAILED',
  PDF_PROCESSING_FAILED: 'PDF_PROCESSING_FAILED',

  // 💾 Storage Errors
  CACHE_STORAGE_FAILED: 'CACHE_STORAGE_FAILED',
  RESULT_STORAGE_FAILED: 'RESULT_STORAGE_FAILED'
};

module.exports = {
  PortfolioVerification,
  PortfolioVerificationError
};