/**
 * 🏢 MOSA FORGE - Enterprise Certificate Validation Service
 * 🎓 Multi-Source Certificate Authentication & Verification
 * 🛡️ Advanced Fraud Detection & Authenticity Verification
 * 📊 Competency Mapping & Skill Validation
 * 🌐 International Certificate Recognition
 * 🚀 Microservice-Ready Enterprise Architecture
 * 
 * @module CertificateValidator
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
const OCRService = require('../../utils/ocr-service');
const BlockchainVerification = require('../../utils/blockchain-verification');

class CertificateValidator extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 🎯 Enterprise Configuration
    this.config = {
      // 🎓 Certificate Type Configuration
      certificateTypes: {
        academic: {
          verificationRequired: true,
          sources: ['university', 'college', 'vocational'],
          expirationCheck: false,
          competencyMapping: true
        },
        professional: {
          verificationRequired: true,
          sources: ['industry', 'association', 'government'],
          expirationCheck: true,
          competencyMapping: true
        },
        international: {
          verificationRequired: true,
          sources: ['foreign_university', 'global_association'],
          expirationCheck: true,
          competencyMapping: true
        },
        mosa_certified: {
          verificationRequired: false, // Internal certificates
          sources: ['mosa_forge'],
          expirationCheck: false,
          competencyMapping: true
        }
      },

      // 🤖 AI Analysis Configuration
      aiAnalysis: {
        enabled: true,
        features: {
          textExtraction: true,
          sealDetection: true,
          signatureVerification: true,
          templateMatching: true,
          qualityAssessment: true
        },
        confidenceThreshold: 0.85
      },

      // 🛡️ Security Configuration
      security: {
        blockchainVerification: true,
        checksumValidation: true,
        duplicateDetection: true,
        revocationCheck: true,
        deepfakeDetection: true
      },

      // 🌐 External Verification Sources
      verificationSources: {
        ethiopian_universities: {
          enabled: true,
          baseURL: process.env.ETHIOPIAN_UNIVERSITIES_API,
          priority: 'high'
        },
        international_verification: {
          enabled: true,
          baseURL: process.env.INTERNATIONAL_VERIFICATION_API,
          priority: 'medium'
        },
        professional_associations: {
          enabled: true,
          baseURL: process.env.PROFESSIONAL_ASSOCIATIONS_API,
          priority: 'high'
        },
        government_entities: {
          enabled: true,
          baseURL: process.env.GOVERNMENT_ENTITIES_API,
          priority: 'high'
        }
      },

      // 📊 Scoring Configuration
      scoring: {
        authenticity: 0.35,
        relevance: 0.25,
        recency: 0.20,
        source_credibility: 0.20
      },

      // ⚡ Performance Configuration
      performance: {
        cacheDuration: 86400, // 24 hours
        concurrentVerifications: 3,
        timeout: 45000,
        retryAttempts: 2
      },

      ...config
    };

    // 🏗️ Service State
    this.serviceState = {
      initialized: false,
      healthy: false,
      activeValidations: 0,
      externalServices: {},
      lastHealthCheck: null
    };

    this.metrics = {
      validationsInitiated: 0,
      validationsCompleted: 0,
      validationsFailed: 0,
      certificatesProcessed: 0,
      fraudAttemptsDetected: 0,
      externalVerifications: 0,
      averageProcessingTime: 0
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
        service: 'certificate-validator',
        module: 'expert-service',
        environment: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL || 'info'
      });

      // 🛡️ Security Metrics
      this.securityMetrics = new SecurityMetrics({
        service: 'certificate-validator',
        businessUnit: 'credential-verification'
      });

      // 📝 Audit Logger
      this.auditLogger = new AuditLogger({
        service: 'certificate-validator',
        retentionPeriod: '730d',
        encryption: true
      });

      // 🤖 AI Document Analyzer
      this.aiAnalyzer = new AIDocumentAnalyzer({
        apiKey: process.env.AI_CERTIFICATE_API_KEY,
        baseURL: process.env.AI_CERTIFICATE_SERVICE_URL,
        features: this.config.aiAnalysis.features,
        confidenceThreshold: this.config.aiAnalysis.confidenceThreshold
      });

      // 🔤 OCR Service
      this.ocrService = new OCRService({
        languages: ['en', 'am'],
        advancedFeatures: true,
        confidenceThreshold: 0.9
      });

      // ⛓️ Blockchain Verification
      this.blockchainVerifier = new BlockchainVerification({
        network: process.env.BLOCKCHAIN_NETWORK,
        contractAddress: process.env.CERTIFICATE_CONTRACT_ADDRESS,
        enabled: this.config.security.blockchainVerification
      });

      // 💾 Database Client
      this.prisma = new PrismaClient({
        log: ['error', 'warn'],
        datasourceUrl: process.env.DATABASE_URL,
        transactionTimeout: 60000
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
      this.initializeVerificationClients();

      // 🏥 Health Check
      await this.performHealthCheck();

      this.serviceState.initialized = true;
      this.serviceState.healthy = true;

      this.logger.system('Enterprise Certificate Validator initialized successfully', {
        service: 'certificate-validator',
        version: '2.0.0',
        aiEnabled: this.config.aiAnalysis.enabled,
        blockchainEnabled: this.config.security.blockchainVerification,
        verificationSources: Object.keys(this.config.verificationSources).filter(k => this.config.verificationSources[k].enabled)
      });

    } catch (error) {
      this.logger.critical('Enterprise Certificate Validator initialization failed', {
        error: error.message,
        stack: error.stack,
        service: 'certificate-validator'
      });
      throw error;
    }
  }

  /**
   * 🔗 Initialize Verification Service Clients
   */
  initializeVerificationClients() {
    this.verificationClients = {};

    // 🌐 Ethiopian Universities Verification
    if (this.config.verificationSources.ethiopian_universities.enabled) {
      this.verificationClients.ethiopian_universities = axios.create({
        baseURL: this.config.verificationSources.ethiopian_universities.baseURL,
        timeout: this.config.performance.timeout,
        headers: {
          'Authorization': `Bearer ${process.env.UNIVERSITY_VERIFICATION_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
    }

    // 🌍 International Verification
    if (this.config.verificationSources.international_verification.enabled) {
      this.verificationClients.international_verification = axios.create({
        baseURL: this.config.verificationSources.international_verification.baseURL,
        timeout: this.config.performance.timeout,
        headers: {
          'X-API-Key': process.env.INTERNATIONAL_VERIFICATION_API_KEY,
          'Content-Type': 'application/json'
        }
      });
    }

    // 💼 Professional Associations
    if (this.config.verificationSources.professional_associations.enabled) {
      this.verificationClients.professional_associations = axios.create({
        baseURL: this.config.verificationSources.professional_associations.baseURL,
        timeout: this.config.performance.timeout,
        headers: {
          'X-API-Key': process.env.PROFESSIONAL_ASSOCIATIONS_API_KEY,
          'Content-Type': 'application/json'
        }
      });
    }

    // 🏛️ Government Entities
    if (this.config.verificationSources.government_entities.enabled) {
      this.verificationClients.government_entities = axios.create({
        baseURL: this.config.verificationSources.government_entities.baseURL,
        timeout: this.config.performance.timeout,
        headers: {
          'Authorization': `Bearer ${process.env.GOVERNMENT_VERIFICATION_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
    }
  }

  /**
   * 🎓 VALIDATE CERTIFICATE - Enterprise Grade
   */
  async validateCertificate(validationRequest, context = {}) {
    const startTime = performance.now();
    const validationId = this.generateValidationId();
    const traceId = context.traceId || validationId;

    try {
      // 🛡️ Pre-flight Checks
      await this.performPreFlightChecks();

      // ✅ Validate Certificate Request
      await this.validateCertificateRequest(validationRequest);

      // 🔍 Check Certificate Cache
      const cachedValidation = await this.checkCertificateCache(validationRequest.certificate);
      if (cachedValidation) {
        this.logger.debug('Certificate validation served from cache', {
          validationId,
          certificateId: validationRequest.certificate.certificateId,
          cacheHit: true
        });
        return cachedValidation;
      }

      // 📄 Extract Certificate Data
      const extractedData = await this.extractCertificateData(validationRequest.certificate);

      // 🤖 AI-Powered Analysis
      const aiAnalysis = await this.performAIAnalysis(validationRequest.certificate, extractedData);

      // 🛡️ Fraud Detection
      const fraudAnalysis = await this.performFraudDetection(validationRequest.certificate, extractedData, aiAnalysis);

      // 🌐 External Verification
      const externalVerification = await this.performExternalVerification(extractedData, validationRequest.certificateType);

      // ⛓️ Blockchain Verification
      const blockchainVerification = await this.performBlockchainVerification(validationRequest.certificate, extractedData);

      // 📊 Calculate Validation Score
      const validationScore = await this.calculateValidationScore({
        extractedData,
        aiAnalysis,
        fraudAnalysis,
        externalVerification,
        blockchainVerification
      });

      // 🎯 Competency Mapping
      const competencyMapping = await this.mapCertificateToCompetencies(extractedData, validationRequest.skillId);

      // 💾 Store Validation Results
      const validationRecord = await this.storeValidationResults({
        validationId,
        validationRequest,
        extractedData,
        aiAnalysis,
        fraudAnalysis,
        externalVerification,
        blockchainVerification,
        validationScore,
        competencyMapping,
        traceId
      });

      // 💾 Cache Validation Results
      await this.cacheValidationResults(validationRequest.certificate, validationRecord);

      // 📊 Record Metrics
      await this.recordValidationMetrics({
        validationId,
        score: validationScore.overall,
        responseTime: performance.now() - startTime,
        certificateType: validationRequest.certificateType,
        externalVerifications: externalVerification.attempted
      });

      this.metrics.validationsCompleted++;
      this.metrics.certificatesProcessed++;
      this.metrics.externalVerifications += externalVerification.attempted;

      this.logger.business('Certificate validation completed successfully', {
        validationId,
        traceId,
        expertId: validationRequest.expertId,
        certificateId: validationRequest.certificate.certificateId,
        overallScore: validationScore.overall,
        authenticity: validationScore.components.authenticity,
        externalVerified: externalVerification.verified
      });

      return {
        success: true,
        validationId,
        expertId: validationRequest.expertId,
        certificateId: validationRequest.certificate.certificateId,
        overallScore: validationScore.overall,
        authenticity: validationScore.components.authenticity,
        verified: validationScore.overall >= 0.7,
        competencyMapping,
        requiresManualReview: this.requiresManualReview(validationScore.overall, fraudAnalysis.riskLevel),
        nextSteps: this.generateValidationNextSteps(validationScore.overall, fraudAnalysis.riskLevel),
        details: this.sanitizeValidationDetails({
          extractedData,
          aiAnalysis,
          fraudAnalysis,
          externalVerification,
          blockchainVerification
        })
      };

    } catch (error) {
      await this.handleValidationFailure({
        validationId,
        validationRequest,
        error,
        context,
        responseTime: performance.now() - startTime,
        traceId
      });
      throw error;
    }
  }

  /**
   * ✅ VALIDATE CERTIFICATE REQUEST
   */
  async validateCertificateRequest(validationRequest) {
    const validationRules = {
      requiredFields: ['expertId', 'certificate', 'certificateType', 'skillId'],
      certificate: {
        requiredFields: ['content', 'fileName', 'fileFormat', 'fileSize'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
        supportedTypes: Object.keys(this.config.certificateTypes)
      },
      expertRequirements: {
        mustExist: true,
        validStatus: ['pending_verification', 'active']
      }
    };

    const errors = [];

    // ✅ Check Required Fields
    const missingFields = validationRules.requiredFields.filter(field => !validationRequest[field]);
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // ✅ Validate Certificate Object
    if (validationRequest.certificate) {
      const certificateErrors = this.validateCertificateObject(validationRequest.certificate, validationRules.certificate);
      errors.push(...certificateErrors);
    }

    // ✅ Validate Certificate Type
    if (!validationRules.certificate.supportedTypes.includes(validationRequest.certificateType)) {
      errors.push(`Unsupported certificate type: ${validationRequest.certificateType}`);
    }

    // ✅ Verify Expert Exists
    if (validationRequest.expertId) {
      const expertValidation = await this.validateExpert(validationRequest.expertId, validationRules.expertRequirements);
      if (!expertValidation.valid) {
        errors.push(`Expert validation failed: ${expertValidation.reason}`);
      }
    }

    if (errors.length > 0) {
      throw new CertificateValidationError('VALIDATION_REQUEST_FAILED', 'Certificate validation request failed', {
        errors,
        expertId: validationRequest.expertId,
        certificateType: validationRequest.certificateType
      });
    }

    this.logger.security('Certificate validation request passed', {
      expertId: validationRequest.expertId,
      certificateType: validationRequest.certificateType,
      fileFormat: validationRequest.certificate.fileFormat
    });
  }

  /**
   * 📄 EXTRACT CERTIFICATE DATA
   */
  async extractCertificateData(certificate) {
    const extractionStartTime = performance.now();
    const extractionId = this.generateExtractionId();

    try {
      // 🔤 Perform OCR Extraction
      const ocrResult = await this.ocrService.extractText(certificate.content, {
        languages: ['en', 'am'],
        advancedFeatures: true
      });

      // 🎯 Parse Certificate Structure
      const parsedData = await this.parseCertificateStructure(ocrResult.text, certificate.fileFormat);

      // 📅 Extract Dates
      const dateInformation = await this.extractDateInformation(parsedData, ocrResult);

      // 🏫 Extract Issuing Authority
      const issuingAuthority = await this.extractIssuingAuthority(parsedData, ocrResult);

      // 📜 Extract Credential Information
      const credentialInfo = await this.extractCredentialInformation(parsedData, ocrResult);

      const extractedData = {
        extractionId,
        rawText: ocrResult.text,
        parsedData,
        dateInformation,
        issuingAuthority,
        credentialInfo,
        confidence: ocrResult.confidence,
        extractionTime: performance.now() - extractionStartTime,
        extractedAt: new Date().toISOString()
      };

      this.logger.debug('Certificate data extraction completed', {
        extractionId,
        issuingAuthority: issuingAuthority.name,
        credential: credentialInfo.credentialName,
        confidence: ocrResult.confidence
      });

      return extractedData;

    } catch (error) {
      this.logger.error('Certificate data extraction failed', {
        extractionId,
        error: error.message,
        processingTime: performance.now() - extractionStartTime
      });

      throw new CertificateValidationError('DATA_EXTRACTION_FAILED', 'Failed to extract certificate data', {
        originalError: error.message
      });
    }
  }

  /**
   * 🤖 PERFORM AI ANALYSIS
   */
  async performAIAnalysis(certificate, extractedData) {
    if (!this.config.aiAnalysis.enabled) {
      return { enabled: false, skipped: true };
    }

    const aiStartTime = performance.now();
    const aiAnalysisId = this.generateAIAnalysisId();

    try {
      const analysisPromises = [
        this.aiAnalyzer.analyzeAuthenticity(certificate.content, extractedData),
        this.aiAnalyzer.detectSealsSignatures(certificate.content),
        this.aiAnalyzer.verifyTemplate(certificate.content, extractedData.issuingAuthority),
        this.aiAnalyzer.assessQuality(certificate.content)
      ];

      const [authenticity, seals, template, quality] = await Promise.allSettled(analysisPromises);

      const aiAnalysis = {
        analysisId: aiAnalysisId,
        enabled: true,
        authenticity: authenticity.status === 'fulfilled' ? authenticity.value : null,
        sealDetection: seals.status === 'fulfilled' ? seals.value : null,
        templateVerification: template.status === 'fulfilled' ? template.value : null,
        qualityAssessment: quality.status === 'fulfilled' ? quality.value : null,
        overallConfidence: this.calculateAIConfidence([authenticity, seals, template, quality]),
        processingTime: performance.now() - aiStartTime,
        analyzedAt: new Date().toISOString()
      };

      this.logger.debug('AI analysis completed', {
        aiAnalysisId,
        overallConfidence: aiAnalysis.overallConfidence,
        processingTime: aiAnalysis.processingTime
      });

      return aiAnalysis;

    } catch (error) {
      this.logger.error('AI analysis failed', {
        aiAnalysisId,
        error: error.message
      });

      return {
        enabled: true,
        failed: true,
        error: error.message,
        analyzedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 🛡️ PERFORM FRAUD DETECTION
   */
  async performFraudDetection(certificate, extractedData, aiAnalysis) {
    const fraudStartTime = performance.now();
    const fraudAnalysisId = this.generateFraudAnalysisId();

    try {
      const fraudChecks = [];

      // 🔍 Duplicate Certificate Detection
      const duplicateCheck = await this.checkDuplicateCertificate(certificate, extractedData);
      fraudChecks.push(duplicateCheck);

      // 📝 Metadata Analysis
      const metadataAnalysis = await this.analyzeCertificateMetadata(certificate);
      fraudChecks.push(metadataAnalysis);

      // 🎭 Consistency Check
      const consistencyCheck = await this.checkConsistency(extractedData, aiAnalysis);
      fraudChecks.push(consistencyCheck);

      // 💧 Watermark & Security Feature Check
      const securityFeatures = await this.checkSecurityFeatures(certificate, aiAnalysis);
      fraudChecks.push(securityFeatures);

      // 📊 Aggregate Fraud Results
      const fraudResult = this.aggregateFraudResults(fraudChecks);

      if (fraudResult.riskLevel === 'HIGH') {
        this.metrics.fraudAttemptsDetected++;

        await this.auditLogger.logSecurityEvent({
          event: 'CERTIFICATE_FRAUD_DETECTED',
          fraudAnalysisId,
          certificateId: certificate.certificateId,
          riskLevel: fraudResult.riskLevel,
          triggers: fraudResult.riskIndicators
        });
      }

      this.logger.security('Fraud analysis completed', {
        fraudAnalysisId,
        riskLevel: fraudResult.riskLevel,
        riskIndicators: fraudResult.riskIndicators.length,
        processingTime: performance.now() - fraudStartTime
      });

      return {
        analysisId: fraudAnalysisId,
        riskLevel: fraudResult.riskLevel,
        riskIndicators: fraudResult.riskIndicators,
        confidence: fraudResult.confidence,
        requiresInvestigation: fraudResult.riskLevel === 'HIGH',
        processedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Fraud analysis failed', {
        fraudAnalysisId,
        error: error.message
      });

      return {
        analysisId: fraudAnalysisId,
        riskLevel: 'UNKNOWN',
        riskIndicators: ['ANALYSIS_FAILED'],
        confidence: 0,
        requiresInvestigation: true,
        error: error.message
      };
    }
  }

  /**
   * 🌐 PERFORM EXTERNAL VERIFICATION
   */
  async performExternalVerification(extractedData, certificateType) {
    const verificationStartTime = performance.now();
    const verificationId = this.generateVerificationId();

    try {
      const verificationPromises = [];
      let attempted = 0;
      let verified = false;

      // 🎯 Determine Verification Sources Based on Certificate Type
      const verificationSources = this.determineVerificationSources(extractedData.issuingAuthority, certificateType);

      for (const source of verificationSources) {
        if (this.verificationClients[source]) {
          attempted++;
          verificationPromises.push(
            this.verifyWithExternalSource(source, extractedData)
              .then(result => {
                if (result.verified) verified = true;
                return result;
              })
              .catch(error => ({
                source,
                verified: false,
                error: error.message
              }))
          );
        }
      }

      const results = await Promise.allSettled(verificationPromises);
      const successfulVerifications = results.filter(r => r.status === 'fulfilled' && r.value.verified).length;

      const externalVerification = {
        verificationId,
        attempted,
        verified,
        successfulVerifications,
        sources: verificationSources,
        results: results.map(r => r.status === 'fulfilled' ? r.value : r.reason),
        processingTime: performance.now() - verificationStartTime,
        verifiedAt: new Date().toISOString()
      };

      this.logger.debug('External verification completed', {
        verificationId,
        attempted,
        verified,
        successfulVerifications,
        processingTime: externalVerification.processingTime
      });

      return externalVerification;

    } catch (error) {
      this.logger.error('External verification failed', {
        verificationId,
        error: error.message
      });

      return {
        verificationId,
        attempted: 0,
        verified: false,
        error: error.message,
        verifiedAt: new Date().toISOString()
      };
    }
  }

  /**
   * ⛓️ PERFORM BLOCKCHAIN VERIFICATION
   */
  async performBlockchainVerification(certificate, extractedData) {
    if (!this.config.security.blockchainVerification) {
      return { enabled: false, skipped: true };
    }

    const blockchainStartTime = performance.now();
    const blockchainId = this.generateBlockchainId();

    try {
      // 🔐 Calculate Certificate Hash
      const certificateHash = this.calculateCertificateHash(certificate);

      // ⛓️ Check Blockchain Record
      const blockchainRecord = await this.blockchainVerifier.verifyCertificate(certificateHash, extractedData);

      const blockchainVerification = {
        blockchainId,
        enabled: true,
        verified: blockchainRecord.verified,
        transactionHash: blockchainRecord.transactionHash,
        blockNumber: blockchainRecord.blockNumber,
        timestamp: blockchainRecord.timestamp,
        certificateHash,
        processingTime: performance.now() - blockchainStartTime,
        verifiedAt: new Date().toISOString()
      };

      this.logger.debug('Blockchain verification completed', {
        blockchainId,
        verified: blockchainRecord.verified,
        transactionHash: blockchainRecord.transactionHash,
        processingTime: blockchainVerification.processingTime
      });

      return blockchainVerification;

    } catch (error) {
      this.logger.error('Blockchain verification failed', {
        blockchainId,
        error: error.message
      });

      return {
        blockchainId,
        enabled: true,
        verified: false,
        error: error.message,
        verifiedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 📊 CALCULATE VALIDATION SCORE
   */
  async calculateValidationScore(validationData) {
    const scoringStartTime = performance.now();

    try {
      const scoreComponents = {};

      // 🛡️ Authenticity Score
      scoreComponents.authenticity = this.calculateAuthenticityScore(
        validationData.aiAnalysis,
        validationData.fraudAnalysis,
        validationData.blockchainVerification
      );

      // 🔗 Relevance Score
      scoreComponents.relevance = this.calculateRelevanceScore(
        validationData.extractedData,
        validationData.competencyMapping
      );

      // 📅 Recency Score
      scoreComponents.recency = this.calculateRecencyScore(validationData.extractedData.dateInformation);

      // 🌐 Source Credibility Score
      scoreComponents.source_credibility = this.calculateSourceCredibilityScore(
        validationData.extractedData.issuingAuthority,
        validationData.externalVerification
      );

      // 📈 Calculate Weighted Overall Score
      const weights = this.config.scoring;
      const overallScore = (
        scoreComponents.authenticity * weights.authenticity +
        scoreComponents.relevance * weights.relevance +
        scoreComponents.recency * weights.recency +
        scoreComponents.source_credibility * weights.source_credibility
      );

      const validationScore = {
        overall: overallScore,
        components: scoreComponents,
        weights: weights,
        calculatedAt: new Date().toISOString(),
        processingTime: performance.now() - scoringStartTime
      };

      this.logger.debug('Validation score calculated', {
        overallScore: validationScore.overall,
        components: scoreComponents
      });

      return validationScore;

    } catch (error) {
      this.logger.error('Validation score calculation failed', {
        error: error.message
      });

      return {
        overall: 0.1,
        components: {},
        error: error.message,
        calculatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 🎯 MAP CERTIFICATE TO COMPETENCIES
   */
  async mapCertificateToCompetencies(extractedData, skillId) {
    try {
      const competencyMapping = {
        skillId,
        credentialName: extractedData.credentialInfo.credentialName,
        level: this.determineSkillLevel(extractedData.credentialInfo),
        competencies: await this.extractCompetencies(extractedData),
        relevanceScore: this.calculateRelevanceToSkill(extractedData, skillId),
        mappedAt: new Date().toISOString()
      };

      return competencyMapping;

    } catch (error) {
      this.logger.error('Competency mapping failed', {
        error: error.message
      });

      return {
        skillId,
        error: error.message,
        mappedAt: new Date().toISOString()
      };
    }
  }

  /**
   * 🔧 UTILITY METHODS
   */

  generateValidationId() {
    return `cert_validate_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  generateExtractionId() {
    return `cert_extract_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateAIAnalysisId() {
    return `cert_ai_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateFraudAnalysisId() {
    return `cert_fraud_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateVerificationId() {
    return `cert_verify_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateBlockchainId() {
    return `cert_chain_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  calculateCertificateHash(certificate) {
    const hash = createHash('sha256');
    hash.update(certificate.content);
    hash.update(certificate.fileName);
    return hash.digest('hex');
  }

  async checkCertificateCache(certificate) {
    const certificateHash = this.calculateCertificateHash(certificate);
    const cached = await this.redis.get(`cert_cache:${certificateHash}`);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheValidationResults(certificate, validationRecord) {
    const certificateHash = this.calculateCertificateHash(certificate);
    await this.redis.setex(
      `cert_cache:${certificateHash}`,
      this.config.performance.cacheDuration,
      JSON.stringify(validationRecord)
    );
  }

  determineVerificationSources(issuingAuthority, certificateType) {
    const sources = [];
    
    // 🎯 Ethiopian Institutions
    if (issuingAuthority.country === 'Ethiopia' || issuingAuthority.country === 'ET') {
      if (issuingAuthority.type === 'university') {
        sources.push('ethiopian_universities');
      }
      sources.push('government_entities');
    }
    
    // 🌍 International Institutions
    if (issuingAuthority.country !== 'Ethiopia') {
      sources.push('international_verification');
    }
    
    // 💼 Professional Certifications
    if (certificateType === 'professional') {
      sources.push('professional_associations');
    }

    return sources.filter(source => this.verificationClients[source]);
  }

  requiresManualReview(score, riskLevel) {
    return score < 0.6 || riskLevel === 'HIGH' || score >= 0.9; // Manual review for very high scores too
  }

  generateValidationNextSteps(score, riskLevel) {
    if (riskLevel === 'HIGH') {
      return ['manual_investigation', 'expert_interview', 'additional_verification'];
    } else if (score < 0.6) {
      return ['manual_review', 'additional_documents', 'source_verification'];
    } else if (score < 0.8) {
      return ['quality_review', 'competency_assessment', 'supplementary_evidence'];
    } else {
      return ['auto_approval', 'skill_mapping', 'profile_update'];
    }
  }

  sanitizeValidationDetails(details) {
    const sanitized = { ...details };
    // Remove sensitive or overly detailed information
    delete sanitized.extractedData?.rawText;
    delete sanitized.aiAnalysis?.detailedAnalysis;
    return sanitized;
  }

  /**
   * 🏥 HEALTH CHECK
   */
  async performHealthCheck() {
    try {
      // 🤖 Check AI Service
      const aiHealth = await this.aiAnalyzer.healthCheck();
      
      // 🔤 Check OCR Service
      const ocrHealth = await this.ocrService.healthCheck();
      
      // ⛓️ Check Blockchain Service
      const blockchainHealth = await this.blockchainVerifier.healthCheck();
      
      // 💾 Check Database
      await this.prisma.$queryRaw`SELECT 1`;
      
      // 🔄 Check Redis
      await this.redis.ping();

      // 🌐 Check External Services
      const externalHealth = await this.checkExternalServicesHealth();

      this.serviceState.healthy = aiHealth.healthy && ocrHealth.healthy && blockchainHealth.healthy;
      this.serviceState.externalServices = externalHealth;
      this.serviceState.lastHealthCheck = new Date();

      if (!this.serviceState.healthy) {
        this.logger.warn('Certificate validator health check failed', {
          aiHealth: aiHealth.healthy,
          ocrHealth: ocrHealth.healthy,
          blockchainHealth: blockchainHealth.healthy,
          externalServices: externalHealth
        });
      }

      return this.serviceState.healthy;

    } catch (error) {
      this.serviceState.healthy = false;
      this.logger.error('Certificate validator health check failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * 📊 GET VALIDATION ANALYTICS
   */
  async getValidationAnalytics(timeRange = '30d') {
    const analytics = {
      summary: {
        totalValidations: this.metrics.validationsInitiated,
        successRate: this.metrics.validationsInitiated > 0 ? 
          (this.metrics.validationsCompleted / this.metrics.validationsInitiated) * 100 : 0,
        averageProcessingTime: this.metrics.averageProcessingTime,
        fraudDetectionRate: this.metrics.fraudAttemptsDetected
      },
      byCertificateType: await this.getValidationsByType(timeRange),
      byIssuingAuthority: await this.getValidationsByAuthority(timeRange),
      performance: await this.getPerformanceMetrics(timeRange),
      systemHealth: {
        healthy: this.serviceState.healthy,
        externalServices: this.serviceState.externalServices,
        activeValidations: this.serviceState.activeValidations
      }
    };

    return analytics;
  }

  /**
   * 🎯 ERROR HANDLING
   */
  async handleValidationFailure({ validationId, validationRequest, error, context, responseTime, traceId }) {
    this.metrics.validationsFailed++;

    this.logger.error('Certificate validation failed', {
      validationId,
      traceId,
      expertId: validationRequest.expertId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2)
    });

    await this.auditLogger.logSecurityEvent({
      event: 'CERTIFICATE_VALIDATION_FAILED',
      validationId,
      expertId: validationRequest.expertId,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ipAddress
    });
  }
}

/**
 * 🎯 ENTERPRISE CERTIFICATE VALIDATION ERROR CLASS
 */
class CertificateValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'CertificateValidationError';
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

// 🎯 Enterprise Certificate Validation Error Codes
CertificateValidationError.CODES = {
  // 🔐 Validation Errors
  VALIDATION_REQUEST_FAILED: 'VALIDATION_REQUEST_FAILED',
  INVALID_CERTIFICATE_TYPE: 'INVALID_CERTIFICATE_TYPE',
  UNSUPPORTED_CERTIFICATE_FORMAT: 'UNSUPPORTED_CERTIFICATE_FORMAT',

  // 📊 Data Processing Errors
  DATA_EXTRACTION_FAILED: 'DATA_EXTRACTION_FAILED',
  OCR_PROCESSING_FAILED: 'OCR_PROCESSING_FAILED',
  DATA_PARSING_FAILED: 'DATA_PARSING_FAILED',

  // 🤖 AI Analysis Errors
  AI_ANALYSIS_FAILED: 'AI_ANALYSIS_FAILED',
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',

  // 🛡️ Security Errors
  FRAUD_DETECTED: 'FRAUD_DETECTED',
  DUPLICATE_CERTIFICATE: 'DUPLICATE_CERTIFICATE',
  CERTIFICATE_TAMPERING: 'CERTIFICATE_TAMPERING',

  // 🌐 External Verification Errors
  EXTERNAL_VERIFICATION_FAILED: 'EXTERNAL_VERIFICATION_FAILED',
  VERIFICATION_SOURCE_UNAVAILABLE: 'VERIFICATION_SOURCE_UNAVAILABLE',

  // ⛓️ Blockchain Errors
  BLOCKCHAIN_VERIFICATION_FAILED: 'BLOCKCHAIN_VERIFICATION_FAILED',
  BLOCKCHAIN_SERVICE_UNAVAILABLE: 'BLOCKCHAIN_SERVICE_UNAVAILABLE'
};

module.exports = {
  CertificateValidator,
  CertificateValidationError
};