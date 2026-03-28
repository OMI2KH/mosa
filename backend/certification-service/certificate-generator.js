// certification-service/certificate-generator.js

/**
 * 🏢 MOSA FORGE - Enterprise Certificate Generator
 * 🎓 Digital certificate creation with Yachi integration & blockchain verification
 * 💰 Revenue-protected certification for 1,999 ETB bundle completion
 * 🛡️ Quality-guaranteed certificates with auto-enforcement
 * 🌐 Multi-format digital credentials with employer verification
 * 
 * @module CertificateGenerator
 * @version Enterprise 1.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, rgb, degrees } = require('pdf-lib');
const QRCode = require('qrcode');
const { createCanvas, loadImage } = require('canvas');
const Redis = require('@redis/client');
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

// Enterprise Dependencies
const EnterpriseLogger = require('../utils/enterprise-logger');
const SecurityMetrics = require('../utils/security-metrics');
const QualityEnforcer = require('../utils/quality-enforcer');
const YachiIntegration = require('./yachi-integration');
const BlockchainVerification = require('./blockchain-verification');
const AuditLogger = require('../utils/audit-logger');

class CertificateGenerator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 🏗️ ENTERPRISE CONFIGURATION
    this.config = {
      // 💰 Revenue & Business Configuration
      bundlePrice: 1999, // 1,999 ETB bundle
      certificateValue: 500, // Estimated certificate value
      
      // 🎓 Certificate Types
      certificateTypes: {
        SKILL_MASTERY: 'skill_mastery',
        EXPERT_VERIFICATION: 'expert_verification',
        QUALITY_CERTIFICATION: 'quality_certification',
        YACHI_PROVIDER: 'yachi_provider'
      },
      
      // 🛡️ Security Configuration
      encryptionLevel: 'aes-256-gcm',
      digitalSignature: true,
      blockchainVerification: true,
      qrCodeEncryption: true,
      
      // 📊 Quality Standards
      minimumQualityScore: 4.0,
      completionRequirement: 0.7, // 70% completion rate
      practicalAssessment: true,
      
      // 🎨 Design Configuration
      templates: {
        ENTERPRISE: 'enterprise',
        PROFESSIONAL: 'professional',
        YACHI_VERIFIED: 'yachi_verified'
      },
      formats: ['PDF', 'PNG', 'JSON_LD', 'BLOCKCHAIN'],
      
      // 🔗 Integration Configuration
      yachiAutoVerification: true,
      employerPortalAccess: true,
      apiVerification: true,
      
      // 💾 Storage Configuration
      cloudStorage: true,
      ipfsBackup: false, // Future enhancement
      localCache: true,
      
      // 📈 Monitoring
      enableRealTimeMetrics: true,
      enableQualityTracking: true,
      enableRevenueImpact: true,
      
      ...options
    };

    // 🏗️ ENTERPRISE SERVICE INITIALIZATION
    this.initializeEnterpriseServices();
    this.initializeCertificateTemplates();
    this.initializeSecuritySystems();
    this.initializeRevenueProtection();
    
    this.stats = {
      certificatesGenerated: 0,
      yachiVerifications: 0,
      blockchainRegistrations: 0,
      employerVerifications: 0,
      qualityRejections: 0,
      revenueValidations: 0
    };

    this.initialized = false;
  }

  /**
   * 🏗️ Initialize Enterprise Services
   */
  async initializeEnterpriseServices() {
    try {
      // 📊 Enterprise Logger
      this.logger = new EnterpriseLogger({
        service: 'certificate-generator',
        module: 'certification',
        environment: process.env.NODE_ENV
      });

      // 🛡️ Security Metrics
      this.metrics = new SecurityMetrics({
        service: 'certificate-generator',
        businessUnit: 'certification-service'
      });

      // 🎯 Quality Enforcer
      this.qualityEnforcer = new QualityEnforcer({
        service: 'certificate-generator',
        autoEnforcement: true,
        qualityThreshold: this.config.minimumQualityScore
      });

      // 🔗 Yachi Integration
      this.yachi = new YachiIntegration({
        autoVerification: this.config.yachiAutoVerification,
        apiKey: process.env.YACHI_API_KEY,
        baseUrl: process.env.YACHI_BASE_URL
      });

      // ⛓️ Blockchain Verification
      this.blockchain = new BlockchainVerification({
        enabled: this.config.blockchainVerification,
        network: process.env.BLOCKCHAIN_NETWORK,
        contractAddress: process.env.CERTIFICATE_CONTRACT_ADDRESS
      });

      // 📝 Audit Logger
      this.auditLogger = new AuditLogger({
        service: 'certificate-generator',
        retentionDays: 365
      });

      // 💾 Database Client
      this.prisma = new PrismaClient({
        log: ['warn', 'error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });

      // 🔄 Redis Cluster
      this.redis = Redis.createCluster({
        rootNodes: [
          { url: process.env.REDIS_URL_1 },
          { url: process.env.REDIS_URL_2 },
          { url: process.env.REDIS_URL_3 }
        ],
        defaults: {
          socket: {
            tls: true,
            connectTimeout: 10000,
            lazyConnect: false
          }
        }
      });

      // 📁 Template Directory Setup
      await this.initializeTemplateDirectory();

      this.logger.system('Enterprise certificate generator initialized', {
        service: 'certificate-generator',
        certificateTypes: Object.values(this.config.certificateTypes),
        features: Object.keys(this.config).filter(k => this.config[k] === true)
      });

      this.initialized = true;

    } catch (error) {
      this.logger.critical('Enterprise certificate generator initialization failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 🎨 Initialize Certificate Templates
   */
  async initializeCertificateTemplates() {
    this.templates = {
      [this.config.templates.ENTERPRISE]: {
        layout: 'enterprise',
        colors: {
          primary: '#2c5aa0', // MOSA FORGE blue
          secondary: '#f8f9fa',
          accent: '#28a745',
          text: '#333333'
        },
        fonts: {
          title: 'Helvetica-Bold',
          subtitle: 'Helvetica-Bold',
          body: 'Helvetica',
          signature: 'Helvetica-Oblique'
        },
        securityFeatures: ['watermark', 'qr_code', 'digital_signature', 'hologram_effect']
      },
      [this.config.templates.PROFESSIONAL]: {
        layout: 'professional',
        colors: {
          primary: '#333333',
          secondary: '#ffffff',
          accent: '#007bff',
          text: '#212529'
        },
        fonts: {
          title: 'Times-Bold',
          subtitle: 'Times-Roman',
          body: 'Helvetica',
          signature: 'Times-Italic'
        },
        securityFeatures: ['qr_code', 'digital_signature']
      },
      [this.config.templates.YACHI_VERIFIED]: {
        layout: 'yachi_verified',
        colors: {
          primary: '#28a745',
          secondary: '#f8f9fa',
          accent: '#2c5aa0',
          text: '#333333'
        },
        fonts: {
          title: 'Helvetica-Bold',
          subtitle: 'Helvetica',
          body: 'Helvetica',
          signature: 'Helvetica-Oblique'
        },
        securityFeatures: ['yachi_logo', 'qr_code', 'digital_signature', 'verification_badge']
      }
    };
  }

  /**
   * 🛡️ Initialize Security Systems
   */
  initializeSecuritySystems() {
    this.security = {
      // 🔑 Cryptographic Systems
      encryption: {
        algorithm: this.config.encryptionLevel,
        key: process.env.CERTIFICATE_ENCRYPTION_KEY,
        ivLength: 16
      },
      
      // 📝 Digital Signatures
      signatures: {
        privateKey: process.env.CERTIFICATE_SIGNATURE_PRIVATE_KEY,
        publicKey: process.env.CERTIFICATE_SIGNATURE_PUBLIC_KEY,
        algorithm: 'RSA-SHA256'
      },
      
      // 🔗 Verification Systems
      verification: {
        qrCodeEncryption: this.config.qrCodeEncryption,
        blockchainEnabled: this.config.blockchainVerification,
        apiVerification: this.config.apiVerification
      }
    };
  }

  /**
   * 💰 Initialize Revenue Protection
   */
  initializeRevenueProtection() {
    this.revenueProtection = {
      // 💵 Bundle Completion Requirements
      bundleRequirements: {
        fullPayment: true,
        completionRate: 0.7, // 70% minimum
        qualityScore: 4.0, // Minimum quality
        practicalAssessment: true
      },
      
      // 🎯 Certificate Value Protection
      valueProtection: {
        baseValue: 500, // ETB
        qualityMultiplier: 1.2, // 20% bonus for high quality
        expertTierBonus: 1.1, // 10% bonus for expert tier
        yachiVerification: 1.15 // 15% bonus for Yachi
      },
      
      // 🔐 Anti-Fraud Measures
      antiFraud: {
        duplicatePrevention: true,
        expirationManagement: true,
        revocationCapability: true,
        usageTracking: true
      }
    };
  }

  /**
   * 📁 Initialize Template Directory
   */
  async initializeTemplateDirectory() {
    try {
      const templateDir = path.join(__dirname, 'templates');
      await fs.mkdir(templateDir, { recursive: true });
      
      // Create default templates if they don't exist
      await this.createDefaultTemplates(templateDir);
      
      this.logger.system('Certificate template directory initialized', {
        directory: templateDir,
        templates: Object.keys(this.templates)
      });
    } catch (error) {
      this.logger.error('Template directory initialization failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🎓 GENERATE CERTIFICATE - Enterprise Grade
   */
  async generateCertificate(userId, skillId, context = {}) {
    const startTime = performance.now();
    const certificateId = this.generateCertificateId();

    try {
      // 🛡️ PRE-GENERATION VALIDATION
      await this.validateCertificateEligibility(userId, skillId, context);

      // 💰 REVENUE PROTECTION CHECK
      await this.validateRevenueRequirements(userId, skillId);

      // 🎯 QUALITY GUARANTEE VALIDATION
      await this.validateQualityRequirements(userId, skillId);

      // 📝 CERTIFICATE DATA PREPARATION
      const certificateData = await this.prepareCertificateData(userId, skillId, context);

      // 🎨 MULTI-FORMAT CERTIFICATE GENERATION
      const certificateAssets = await this.generateCertificateAssets(certificateData);

      // 🔗 YACHI INTEGRATION & VERIFICATION
      const yachiVerification = await this.integrateWithYachi(certificateData, certificateAssets);

      // ⛓️ BLOCKCHAIN REGISTRATION
      const blockchainRegistration = await this.registerOnBlockchain(certificateData, certificateAssets);

      // 💾 CERTIFICATE STORAGE & MANAGEMENT
      const storedCertificate = await this.storeCertificate(
        certificateData, 
        certificateAssets, 
        yachiVerification, 
        blockchainRegistration
      );

      // 📊 SUCCESS METRICS & AUDITING
      await this.recordCertificateGeneration(
        userId, 
        skillId, 
        storedCertificate, 
        context
      );

      const responseTime = performance.now() - startTime;

      this.logger.security('Certificate generated successfully', {
        certificateId: storedCertificate.id,
        userId,
        skillId,
        yachiVerified: yachiVerification.success,
        blockchainRegistered: blockchainRegistration.success,
        responseTime: responseTime.toFixed(2)
      });

      return {
        success: true,
        certificateId: storedCertificate.id,
        certificateNumber: storedCertificate.certificateNumber,
        downloadUrl: storedCertificate.downloadUrl,
        verificationUrl: storedCertificate.verificationUrl,
        yachiProviderId: yachiVerification.providerId,
        blockchainTxHash: blockchainRegistration.transactionHash,
        issuedAt: storedCertificate.issuedAt,
        expiresAt: storedCertificate.expiresAt
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      await this.handleCertificateGenerationFailure(certificateId, userId, skillId, error, context, responseTime);
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE CERTIFICATE ELIGIBILITY
   */
  async validateCertificateEligibility(userId, skillId, context) {
    // ✅ VALIDATE USER EXISTS AND ACTIVE
    const user = await this.findUserById(userId);
    if (!user) {
      throw new CertificateError('USER_NOT_FOUND', `User ${userId} not found`);
    }

    if (user.status !== 'ACTIVE') {
      throw new CertificateError('USER_INACTIVE', 'User account is not active');
    }

    // ✅ VALIDATE SKILL EXISTS
    const skill = await this.findSkillById(skillId);
    if (!skill) {
      throw new CertificateError('SKILL_NOT_FOUND', `Skill ${skillId} not found`);
    }

    // ✅ VALIDATE ENROLLMENT COMPLETION
    const enrollment = await this.findUserEnrollment(userId, skillId);
    if (!enrollment) {
      throw new CertificateError('ENROLLMENT_NOT_FOUND', 'User is not enrolled in this skill');
    }

    if (enrollment.status !== 'COMPLETED') {
      throw new CertificateError('ENROLLMENT_NOT_COMPLETED', 'Skill enrollment not completed');
    }

    // ✅ VALIDATE COMPLETION REQUIREMENTS
    await this.validateCompletionRequirements(userId, skillId, enrollment);

    this.logger.security('Certificate eligibility validation passed', {
      userId,
      skillId,
      validations: ['user_active', 'skill_exists', 'enrollment_completed', 'requirements_met']
    });
  }

  /**
   * 💰 VALIDATE REVENUE REQUIREMENTS
   */
  async validateRevenueRequirements(userId, skillId) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        skillId,
        status: 'COMPLETED'
      },
      include: {
        payments: {
          where: {
            status: 'COMPLETED',
            amount: this.config.bundlePrice
          }
        }
      }
    });

    if (!enrollment || enrollment.payments.length === 0) {
      throw new CertificateError(
        'REVENUE_REQUIREMENT_NOT_MET',
        'Full bundle payment not completed',
        { bundlePrice: this.config.bundlePrice }
      );
    }

    this.stats.revenueValidations++;

    this.logger.business('Revenue requirements validated', {
      userId,
      skillId,
      bundlePrice: this.config.bundlePrice,
      paymentStatus: 'verified'
    });
  }

  /**
   * 🎯 VALIDATE QUALITY REQUIREMENTS
   */
  async validateQualityRequirements(userId, skillId) {
    const qualityMetrics = await this.qualityEnforcer.getUserQualityMetrics(userId);
    
    if (qualityMetrics.overallScore < this.config.minimumQualityScore) {
      throw new CertificateError(
        'QUALITY_REQUIREMENT_NOT_MET',
        `Minimum quality score of ${this.config.minimumQualityScore} required`,
        {
          currentScore: qualityMetrics.overallScore,
          requiredScore: this.config.minimumQualityScore,
          metrics: qualityMetrics
        }
      );
    }

    // 🎯 VALIDATE PRACTICAL ASSESSMENT
    if (this.config.practicalAssessment) {
      const practicalResult = await this.validatePracticalAssessment(userId, skillId);
      if (!practicalResult.passed) {
        throw new CertificateError(
          'PRACTICAL_ASSESSMENT_FAILED',
          'Practical assessment not completed successfully',
          { details: practicalResult.details }
        );
      }
    }

    this.logger.quality('Quality requirements validated', {
      userId,
      skillId,
      qualityScore: qualityMetrics.overallScore,
      requiredScore: this.config.minimumQualityScore
    });
  }

  /**
   * 📝 PREPARE CERTIFICATE DATA
   */
  async prepareCertificateData(userId, skillId, context) {
    const user = await this.findUserById(userId);
    const skill = await this.findSkillById(skillId);
    const enrollment = await this.findUserEnrollment(userId, skillId);
    const expert = await this.findTrainingExpert(userId, skillId);

    const certificateNumber = this.generateCertificateNumber();
    const issuedAt = new Date();
    const expiresAt = this.calculateExpiryDate(issuedAt);

    return {
      certificateId: this.generateCertificateId(),
      certificateNumber,
      userId: user.id,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        faydaId: user.faydaId,
        email: user.email
      },
      skill: {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        level: skill.level
      },
      enrollment: {
        id: enrollment.id,
        startDate: enrollment.startDate,
        completionDate: enrollment.completionDate,
        finalScore: enrollment.finalScore
      },
      expert: expert ? {
        id: expert.id,
        name: expert.name,
        tier: expert.tier,
        qualityScore: expert.qualityScore
      } : null,
      dates: {
        issuedAt,
        expiresAt
      },
      verification: {
        qrCodeData: this.generateQRCodeData(certificateNumber, userId),
        digitalSignature: await this.generateDigitalSignature(certificateNumber, userId),
        verificationUrl: this.generateVerificationUrl(certificateNumber)
      },
      metadata: {
        template: this.determineCertificateTemplate(user, skill, expert),
        format: this.config.formats,
        context: this.sanitizeContext(context)
      }
    };
  }

  /**
   * 🎨 GENERATE CERTIFICATE ASSETS
   */
  async generateCertificateAssets(certificateData) {
    const assets = {};

    try {
      // 📄 GENERATE PDF CERTIFICATE
      if (this.config.formats.includes('PDF')) {
        assets.pdf = await this.generatePDFCertificate(certificateData);
      }

      // 🖼️ GENERATE PNG CERTIFICATE
      if (this.config.formats.includes('PNG')) {
        assets.png = await this.generatePNGCertificate(certificateData);
      }

      // 🔗 GENERATE JSON-LD CREDENTIAL
      if (this.config.formats.includes('JSON_LD')) {
        assets.jsonld = await this.generateJSONLDCredential(certificateData);
      }

      // ⛓️ GENERATE BLOCKCHAIN DATA
      if (this.config.formats.includes('BLOCKCHAIN')) {
        assets.blockchain = await this.generateBlockchainData(certificateData);
      }

      // 🔐 GENERATE QR CODE
      assets.qrCode = await this.generateQRCode(certificateData.verification.qrCodeData);

      this.logger.system('Certificate assets generated successfully', {
        certificateId: certificateData.certificateId,
        formats: Object.keys(assets)
      });

      return assets;

    } catch (error) {
      this.logger.error('Certificate asset generation failed', {
        certificateId: certificateData.certificateId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 📄 GENERATE PDF CERTIFICATE
   */
  async generatePDFCertificate(certificateData) {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size

      const { width, height } = page.getSize();
      const template = this.templates[certificateData.metadata.template];

      // 🎨 DRAW BACKGROUND
      await this.drawPDFBackground(page, template, width, height);

      // 🏢 DRAW HEADER (MOSA FORGE Branding)
      await this.drawPDFHeader(page, template, width, height);

      // 🎓 DRAW CERTIFICATE CONTENT
      await this.drawPDFContent(page, certificateData, template, width, height);

      // 🔐 DRAW SECURITY FEATURES
      await this.drawPDFSecurityFeatures(page, certificateData, template, width, height);

      // ✍️ DRAW SIGNATURES
      await this.drawPDFSignatures(page, certificateData, template, width, height);

      // 📝 ADD METADATA
      pdfDoc.setTitle(`MOSA FORGE Certificate - ${certificateData.skill.name}`);
      pdfDoc.setSubject(`Skill Certification for ${certificateData.user.firstName} ${certificateData.user.lastName}`);
      pdfDoc.setKeywords(['MOSA FORGE', 'Certificate', 'Skill', 'Certification', 'Yachi']);
      pdfDoc.setProducer('MOSA FORGE Enterprise Certificate Generator');
      pdfDoc.setCreator('Powered by Chereka');

      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      return {
        buffer: pdfBuffer,
        size: pdfBuffer.length,
        mimeType: 'application/pdf'
      };

    } catch (error) {
      this.logger.error('PDF certificate generation failed', {
        certificateId: certificateData.certificateId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🖼️ GENERATE PNG CERTIFICATE
   */
  async generatePNGCertificate(certificateData) {
    try {
      const canvas = createCanvas(1200, 848); // 4:3 ratio for digital display
      const ctx = canvas.getContext('2d');
      const template = this.templates[certificateData.metadata.template];

      // 🎨 DRAW BACKGROUND
      this.drawPNGBackground(ctx, template, canvas.width, canvas.height);

      // 🏢 DRAW HEADER
      this.drawPNGHeader(ctx, template, canvas.width, canvas.height);

      // 🎓 DRAW CONTENT
      this.drawPNGContent(ctx, certificateData, template, canvas.width, canvas.height);

      // 🔐 DRAW SECURITY FEATURES
      this.drawPNGSecurityFeatures(ctx, certificateData, template, canvas.width, canvas.height);

      const pngBuffer = canvas.toBuffer('image/png', { compressionLevel: 9 });

      return {
        buffer: pngBuffer,
        size: pngBuffer.length,
        mimeType: 'image/png'
      };

    } catch (error) {
      this.logger.error('PNG certificate generation failed', {
        certificateId: certificateData.certificateId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🔗 GENERATE JSON-LD CREDENTIAL
   */
  async generateJSONLDCredential(certificateData) {
    const credential = {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://mosaforge.com/credentials/v1"
      ],
      "id": `urn:uuid:${certificateData.certificateId}`,
      "type": ["VerifiableCredential", "MOSAForgeSkillCredential"],
      "issuer": {
        "id": "https://mosaforge.com",
        "name": "MOSA FORGE Enterprise",
        "type": "Organization"
      },
      "issuanceDate": certificateData.dates.issuedAt.toISOString(),
      "expirationDate": certificateData.dates.expiresAt.toISOString(),
      "credentialSubject": {
        "id": `did:mosaforge:user:${certificateData.userId}`,
        "name": `${certificateData.user.firstName} ${certificateData.user.lastName}`,
        "faydaId": certificateData.user.faydaId,
        "achievement": {
          "id": certificateData.skill.id,
          "type": "SkillMastery",
          "name": certificateData.skill.name,
          "description": `Mastery of ${certificateData.skill.name} demonstrated through comprehensive training and assessment`,
          "criteria": {
            "narrative": "Completed MOSA FORGE 4-month training program with practical assessment"
          }
        }
      },
      "proof": {
        "type": "RsaSignature2018",
        "created": new Date().toISOString(),
        "proofPurpose": "assertionMethod",
        "verificationMethod": "https://mosaforge.com/keys/1",
        "jws": await this.generateJWSSignature(certificateData)
      }
    };

    return {
      data: credential,
      size: JSON.stringify(credential).length,
      mimeType: 'application/ld+json'
    };
  }

  /**
   * 🔗 INTEGRATE WITH YACHI
   */
  async integrateWithYachi(certificateData, certificateAssets) {
    try {
      const yachiData = {
        provider: {
          userId: certificateData.userId,
          name: `${certificateData.user.firstName} ${certificateData.user.lastName}`,
          faydaId: certificateData.user.faydaId,
          email: certificateData.user.email,
          phone: certificateData.user.phone
        },
        skill: {
          id: certificateData.skill.id,
          name: certificateData.skill.name,
          category: certificateData.skill.category
        },
        certification: {
          certificateId: certificateData.certificateId,
          certificateNumber: certificateData.certificateNumber,
          issuedAt: certificateData.dates.issuedAt,
          expiresAt: certificateData.dates.expiresAt,
          verificationUrl: certificateData.verification.verificationUrl
        },
        assets: {
          pdf: certificateAssets.pdf ? true : false,
          png: certificateAssets.png ? true : false
        }
      };

      const yachiResult = await this.yachi.registerProvider(yachiData);

      if (yachiResult.success) {
        this.stats.yachiVerifications++;
        
        this.logger.business('Yachi integration completed successfully', {
          certificateId: certificateData.certificateId,
          yachiProviderId: yachiResult.providerId,
          status: yachiResult.status
        });
      }

      return yachiResult;

    } catch (error) {
      this.logger.error('Yachi integration failed', {
        certificateId: certificateData.certificateId,
        error: error.message
      });
      
      // Don't fail certificate generation if Yachi integration fails
      return {
        success: false,
        error: error.message,
        providerId: null,
        status: 'FAILED'
      };
    }
  }

  /**
   * ⛓️ REGISTER ON BLOCKCHAIN
   */
  async registerOnBlockchain(certificateData, certificateAssets) {
    try {
      if (!this.config.blockchainVerification) {
        return { success: true, transactionHash: null, skipped: true };
      }

      const blockchainData = {
        certificateId: certificateData.certificateId,
        certificateNumber: certificateData.certificateNumber,
        userId: certificateData.userId,
        skillId: certificateData.skill.id,
        issuedAt: Math.floor(certificateData.dates.issuedAt.getTime() / 1000),
        expiresAt: Math.floor(certificateData.dates.expiresAt.getTime() / 1000),
        metadataHash: this.calculateMetadataHash(certificateData)
      };

      const blockchainResult = await this.blockchain.registerCertificate(blockchainData);

      if (blockchainResult.success) {
        this.stats.blockchainRegistrations++;
        
        this.logger.security('Blockchain registration completed', {
          certificateId: certificateData.certificateId,
          transactionHash: blockchainResult.transactionHash,
          blockNumber: blockchainResult.blockNumber
        });
      }

      return blockchainResult;

    } catch (error) {
      this.logger.error('Blockchain registration failed', {
        certificateId: certificateData.certificateId,
        error: error.message
      });
      
      // Don't fail certificate generation if blockchain registration fails
      return {
        success: false,
        error: error.message,
        transactionHash: null,
        status: 'FAILED'
      };
    }
  }

  /**
   * 💾 STORE CERTIFICATE
   */
  async storeCertificate(certificateData, certificateAssets, yachiVerification, blockchainRegistration) {
    const transaction = await this.prisma.$transaction(async (prisma) => {
      // 💾 CREATE CERTIFICATE RECORD
      const certificate = await prisma.certificate.create({
        data: {
          id: certificateData.certificateId,
          certificateNumber: certificateData.certificateNumber,
          userId: certificateData.userId,
          skillId: certificateData.skill.id,
          enrollmentId: certificateData.enrollment.id,
          expertId: certificateData.expert?.id,
          issuedAt: certificateData.dates.issuedAt,
          expiresAt: certificateData.dates.expiresAt,
          status: 'ACTIVE',
          template: certificateData.metadata.template,
          yachiProviderId: yachiVerification.providerId,
          blockchainTxHash: blockchainRegistration.transactionHash,
          metadata: {
            user: certificateData.user,
            skill: certificateData.skill,
            enrollment: certificateData.enrollment,
            expert: certificateData.expert,
            verification: certificateData.verification
          }
        }
      });

      // 💾 STORE CERTIFICATE ASSETS
      for (const [format, asset] of Object.entries(certificateAssets)) {
        if (asset.buffer) {
          await prisma.certificateAsset.create({
            data: {
              certificateId: certificate.id,
              format: format.toUpperCase(),
              mimeType: asset.mimeType,
              size: asset.size,
              storagePath: await this.storeAssetInCloud(asset, format, certificate.certificateNumber),
              checksum: this.calculateChecksum(asset.buffer),
              metadata: {
                generatedAt: new Date(),
                template: certificateData.metadata.template
              }
            }
          });
        }
      }

      // 📝 AUDIT LOG
      await this.auditLogger.logCertificateAction({
        action: 'CERTIFICATE_GENERATED',
        certificateId: certificate.id,
        userId: certificateData.userId,
        skillId: certificateData.skill.id,
        yachiProviderId: yachiVerification.providerId,
        blockchainTxHash: blockchainRegistration.transactionHash,
        metadata: {
          formats: Object.keys(certificateAssets),
          template: certificateData.metadata.template
        }
      });

      return certificate;
    });

    this.stats.certificatesGenerated++;

    return {
      ...transaction,
      downloadUrl: this.generateDownloadUrl(transaction.id),
      verificationUrl: certificateData.verification.verificationUrl
    };
  }

  /**
   * 🔍 VERIFY CERTIFICATE - Enterprise Grade
   */
  async verifyCertificate(certificateNumber, context = {}) {
    const startTime = performance.now();
    const verificationId = this.generateVerificationId();

    try {
      // 🔍 FIND CERTIFICATE
      const certificate = await this.findCertificateByNumber(certificateNumber);
      if (!certificate) {
        throw new CertificateError('CERTIFICATE_NOT_FOUND', 'Certificate not found');
      }

      // ✅ VALIDATE CERTIFICATE STATUS
      await this.validateCertificateStatus(certificate);

      // 🔗 YACHI VERIFICATION
      const yachiStatus = await this.verifyYachiStatus(certificate);

      // ⛓️ BLOCKCHAIN VERIFICATION
      const blockchainStatus = await this.verifyBlockchainStatus(certificate);

      // 📊 EMPLOYER VERIFICATION TRACKING
      if (context.employerId) {
        await this.trackEmployerVerification(certificate, context);
      }

      const responseTime = performance.now() - startTime;

      this.logger.security('Certificate verification completed', {
        verificationId,
        certificateId: certificate.id,
        certificateNumber,
        yachiVerified: yachiStatus.verified,
        blockchainVerified: blockchainStatus.verified,
        responseTime: responseTime.toFixed(2)
      });

      return {
        verified: true,
        verificationId,
        certificate: {
          id: certificate.id,
          certificateNumber: certificate.certificateNumber,
          userId: certificate.userId,
          userName: `${certificate.metadata.user.firstName} ${certificate.metadata.user.lastName}`,
          skillName: certificate.metadata.skill.name,
          issuedAt: certificate.issuedAt,
          expiresAt: certificate.expiresAt,
          status: certificate.status
        },
        verifications: {
          yachi: yachiStatus,
          blockchain: blockchainStatus,
          platform: { verified: true, timestamp: new Date() }
        },
        employerAccess: context.employerId ? true : false
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      await this.handleVerificationFailure(verificationId, certificateNumber, error, context, responseTime);
      throw error;
    }
  }

  /**
   * 🔧 UTILITY METHODS
   */

  generateCertificateId() {
    return `cert_${crypto.randomBytes(16).toString('hex')}`;
  }

  generateCertificateNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `MF${timestamp}${random}`;
  }

  generateVerificationId() {
    return `verify_${crypto.randomBytes(16).toString('hex')}`;
  }

  calculateExpiryDate(issuedAt) {
    return new Date(issuedAt.getTime() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 years
  }

  generateQRCodeData(certificateNumber, userId) {
    const data = {
      v: 1,
      id: certificateNumber,
      u: userId,
      t: Date.now(),
      s: this.generateSignature(certificateNumber, userId)
    };
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  generateVerificationUrl(certificateNumber) {
    return `${process.env.PLATFORM_URL}/verify/${certificateNumber}`;
  }

  generateDownloadUrl(certificateId) {
    return `${process.env.CDN_URL}/certificates/${certificateId}/download`;
  }

  generateSignature(data, key) {
    return crypto.createHmac('sha256', key).update(data).digest('hex');
  }

  sanitizeContext(context) {
    const sanitized = { ...context };
    delete sanitized.apiKey;
    delete sanitized.secret;
    delete sanitized.token;
    return sanitized;
  }

  /**
   * 🎯 ENTERPRISE ERROR HANDLING
   */
  async handleCertificateGenerationFailure(certificateId, userId, skillId, error, context, responseTime) {
    this.logger.error('Certificate generation failed', {
      certificateId,
      userId,
      skillId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2),
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logCertificateAction({
      action: 'CERTIFICATE_GENERATION_FAILED',
      userId,
      skillId,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ip,
      userAgent: context.userAgent
    });
  }

  async handleVerificationFailure(verificationId, certificateNumber, error, context, responseTime) {
    this.logger.error('Certificate verification failed', {
      verificationId,
      certificateNumber,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2),
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logCertificateAction({
      action: 'CERTIFICATE_VERIFICATION_FAILED',
      certificateNumber,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ip
    });
  }
}

/**
 * 🎯 ENTERPRISE ERROR CLASS
 */
class CertificateError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'CertificateError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;
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

// 🎯 ENTERPRISE ERROR CODES
CertificateError.CODES = {
  // 🔐 Validation Errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_INACTIVE: 'USER_INACTIVE',
  SKILL_NOT_FOUND: 'SKILL_NOT_FOUND',
  ENROLLMENT_NOT_FOUND: 'ENROLLMENT_NOT_FOUND',
  ENROLLMENT_NOT_COMPLETED: 'ENROLLMENT_NOT_COMPLETED',
  
  // 💰 Business Errors
  REVENUE_REQUIREMENT_NOT_MET: 'REVENUE_REQUIREMENT_NOT_MET',
  BUNDLE_PAYMENT_INCOMPLETE: 'BUNDLE_PAYMENT_INCOMPLETE',
  
  // 🎯 Quality Errors
  QUALITY_REQUIREMENT_NOT_MET: 'QUALITY_REQUIREMENT_NOT_MET',
  PRACTICAL_ASSESSMENT_FAILED: 'PRACTICAL_ASSESSMENT_FAILED',
  COMPLETION_REQUIREMENT_NOT_MET: 'COMPLETION_REQUIREMENT_NOT_MET',
  
  // 📝 Certificate Errors
  CERTIFICATE_NOT_FOUND: 'CERTIFICATE_NOT_FOUND',
  CERTIFICATE_EXPIRED: 'CERTIFICATE_EXPIRED',
  CERTIFICATE_REVOKED: 'CERTIFICATE_REVOKED',
  
  // 🔗 Integration Errors
  YACHI_INTEGRATION_FAILED: 'YACHI_INTEGRATION_FAILED',
  BLOCKCHAIN_REGISTRATION_FAILED: 'BLOCKCHAIN_REGISTRATION_FAILED',
  
  // 🎨 Generation Errors
  TEMPLATE_GENERATION_FAILED: 'TEMPLATE_GENERATION_FAILED',
  ASSET_GENERATION_FAILED: 'ASSET_GENERATION_FAILED',
  STORAGE_FAILED: 'STORAGE_FAILED'
};

module.exports = {
  CertificateGenerator,
  CertificateError
};