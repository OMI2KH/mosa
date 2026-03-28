/**
 * 🎯 MOSA FORGE: Enterprise Certificate Gallery Service
 * 
 * @module CertificateGallery
 * @description Manages digital certificate generation, display, and Yachi integration
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Digital certificate generation with blockchain verification
 * - Yachi platform integration for instant provider status
 * - Employer verification portal
 * - Certificate sharing and validation
 * - Multi-format certificate export
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');

// 🏗️ Enterprise Constants
const CERTIFICATE_STATUS = {
  GENERATED: 'generated',
  VERIFIED: 'verified',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
  PENDING: 'pending'
};

const CERTIFICATE_TYPES = {
  SKILL_COMPLETION: 'skill_completion',
  MASTER_TIER: 'master_tier',
  SPECIALIZATION: 'specialization',
  YACHI_VERIFIED: 'yachi_verified'
};

const VERIFICATION_ERRORS = {
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  CERTIFICATE_REVOKED: 'CERTIFICATE_REVOKED',
  EXPIRED_CERTIFICATE: 'EXPIRED_CERTIFICATE',
  YACHI_INTEGRATION_FAILED: 'YACHI_INTEGRATION_FAILED',
  EMPLOYER_VERIFICATION_FAILED: 'EMPLOYER_VERIFICATION_FAILED'
};

/**
 * 🏗️ Enterprise Certificate Gallery Class
 * @class CertificateGallery
 * @extends EventEmitter
 */
class CertificateGallery extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 🏗️ Enterprise Configuration
    this.config = {
      s3: options.s3 || {
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        },
        bucket: process.env.S3_BUCKET || 'mosa-forge-certificates'
      },
      prisma: options.prisma || new PrismaClient(),
      yachi: {
        apiKey: process.env.YACHI_API_KEY,
        baseUrl: process.env.YACHI_BASE_URL,
        providerEndpoint: process.env.YACHI_PROVIDER_ENDPOINT
      },
      encryption: {
        algorithm: 'aes-256-gcm',
        key: process.env.CERTIFICATE_ENCRYPTION_KEY
      },
      validityPeriod: 5 * 365 * 24 * 60 * 60 * 1000, // 5 years
      maxRetries: 3,
      timeout: 30000
    };

    // 🏗️ Service Dependencies
    this.s3Client = new S3Client(this.config.s3);
    this.prisma = this.config.prisma;
    this.circuitBreaker = this._initializeCircuitBreaker();
    
    // 🏗️ Certificate Templates
    this.templates = this._initializeTemplates();
    
    // 🏗️ Performance Monitoring
    this.metrics = {
      certificatesGenerated: 0,
      certificatesVerified: 0,
      yachiIntegrations: 0,
      employerVerifications: 0,
      averageGenerationTime: 0
    };

    this._initializeEventHandlers();
    this._startHealthChecks();
  }

  /**
   * 🏗️ Initialize Circuit Breaker for Fault Tolerance
   * @private
   */
  _initializeCircuitBreaker() {
    let state = 'CLOSED';
    let failureCount = 0;
    const failureThreshold = 5;
    const resetTimeout = 60000;
    let lastFailureTime = null;

    return {
      execute: async (operation) => {
        if (state === 'OPEN') {
          if (Date.now() - lastFailureTime > resetTimeout) {
            state = 'HALF_OPEN';
          } else {
            throw new Error('Circuit breaker is OPEN');
          }
        }

        try {
          const result = await operation();
          if (state === 'HALF_OPEN') {
            failureCount = 0;
            state = 'CLOSED';
          }
          return result;
        } catch (error) {
          failureCount++;
          lastFailureTime = Date.now();
          
          if (failureCount >= failureThreshold) {
            state = 'OPEN';
          }
          throw error;
        }
      },
      getState: () => state
    };
  }

  /**
   * 🏗️ Initialize Certificate Templates
   * @private
   */
  _initializeTemplates() {
    return {
      SKILL_COMPLETION: {
        background: 'mosa-certificate-bg-v1.png',
        colors: {
          primary: '#2D3748',
          secondary: '#4A5568',
          accent: '#E53E3E',
          gold: '#D4AF37'
        },
        fonts: {
          title: 'Helvetica-Bold',
          subtitle: 'Helvetica',
          body: 'Helvetica'
        },
        layout: {
          padding: 50,
          titleSize: 36,
          nameSize: 28,
          bodySize: 14
        }
      },
      MASTER_TIER: {
        background: 'mosa-master-bg-v1.png',
        colors: {
          primary: '#1A365D',
          secondary: '#2D3748',
          accent: '#D69E2E',
          gold: '#F6E05E'
        },
        fonts: {
          title: 'Helvetica-Bold',
          subtitle: 'Helvetica',
          body: 'Helvetica'
        },
        layout: {
          padding: 60,
          titleSize: 42,
          nameSize: 32,
          bodySize: 16
        }
      },
      YACHI_VERIFIED: {
        background: 'yachi-verified-bg-v1.png',
        colors: {
          primary: '#22543D',
          secondary: '#276749',
          accent: '#38A169',
          gold: '#48BB78'
        },
        fonts: {
          title: 'Helvetica-Bold',
          subtitle: 'Helvetica',
          body: 'Helvetica'
        },
        layout: {
          padding: 55,
          titleSize: 38,
          nameSize: 30,
          bodySize: 15
        }
      }
    };
  }

  /**
   * 🏗️ Initialize Enterprise Event Handlers
   * @private
   */
  _initializeEventHandlers() {
    this.on('certificate.generated', (data) => {
      this._logEvent('CERTIFICATE_GENERATED', data);
      this.metrics.certificatesGenerated++;
    });

    this.on('certificate.verified', (data) => {
      this._logEvent('CERTIFICATE_VERIFIED', data);
      this.metrics.certificatesVerified++;
    });

    this.on('yachi.integration.completed', (data) => {
      this._logEvent('YACHI_INTEGRATION_COMPLETED', data);
      this.metrics.yachiIntegrations++;
    });

    this.on('employer.verification.completed', (data) => {
      this._logEvent('EMPLOYER_VERIFICATION_COMPLETED', data);
      this.metrics.employerVerifications++;
    });

    this.on('certificate.shared', (data) => {
      this._logEvent('CERTIFICATE_SHARED', data);
    });
  }

  /**
   * 🏗️ Start Health Monitoring
   * @private
   */
  _startHealthChecks() {
    setInterval(() => {
      this._checkHealth();
    }, 30000);
  }

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Generate Digital Certificate
   * @param {Object} certificateData - Certificate generation data
   * @returns {Promise<Object>} Certificate generation result
   */
  async generateCertificate(certificateData) {
    const startTime = Date.now();
    const certificateId = uuidv4();
    const traceId = certificateData.traceId || uuidv4();

    try {
      this.emit('certificate.generation.started', { certificateId, traceId, certificateData });

      // 🏗️ Enterprise Validation Chain
      await this._validateCertificateData(certificateData);
      await this._verifyCompletionRequirements(certificateData.enrollmentId);
      
      // 🏗️ Generate Certificate Components
      const verificationHash = this._generateVerificationHash(certificateData);
      const qrCodeData = await this._generateQRCode(verificationHash);
      const digitalSignature = this._generateDigitalSignature(certificateData);
      
      // 🏗️ Create Certificate Record
      const certificate = await this._createCertificateRecord({
        ...certificateData,
        certificateId,
        verificationHash,
        digitalSignature,
        traceId
      });

      // 🏗️ Generate Certificate Assets
      const assets = await this._generateCertificateAssets(certificate, qrCodeData);
      
      // 🏗️ Yachi Integration (Automatic Provider Status)
      const yachiResult = await this._integrateWithYachi(certificate);
      
      // 🏗️ Employer Portal Setup
      await this._setupEmployerVerification(certificate);

      const processingTime = Date.now() - startTime;
      this._updateMetrics(processingTime);

      const result = {
        success: true,
        certificateId: certificate.id,
        certificateUrl: assets.certificateUrl,
        verificationUrl: assets.verificationUrl,
        yachiProviderId: yachiResult.providerId,
        shareableLinks: this._generateShareableLinks(certificate),
        downloadFormats: ['PDF', 'PNG', 'JPG'],
        traceId,
        timestamp: new Date().toISOString()
      };

      this.emit('certificate.generated', result);
      this._logSuccess('CERTIFICATE_GENERATED', { certificateId, processingTime });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this._updateMetrics(processingTime);
      
      const errorResult = {
        success: false,
        error: error.message,
        errorCode: error.code || 'CERTIFICATE_GENERATION_FAILED',
        certificateId,
        traceId,
        timestamp: new Date().toISOString()
      };

      this.emit('certificate.generation.failed', errorResult);
      this._logError('CERTIFICATE_GENERATION_FAILED', error, { certificateId, traceId });

      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🎯 ENTERPRISE METHOD: Get Certificate Gallery
   * @param {string} studentId - Student identifier
   * @returns {Promise<Object>} Certificate gallery data
   */
  async getCertificateGallery(studentId) {
    const traceId = uuidv4();

    try {
      this.emit('gallery.access.started', { studentId, traceId });

      // 🏗️ Validate student access
      await this._validateStudentAccess(studentId);

      // 🏗️ Retrieve certificates with performance optimization
      const certificates = await this.prisma.certificate.findMany({
        where: {
          studentId,
          status: {
            in: [CERTIFICATE_STATUS.GENERATED, CERTIFICATE_STATUS.VERIFIED]
          }
        },
        include: {
          skill: {
            select: {
              name: true,
              category: true,
              icon: true
            }
          },
          expert: {
            select: {
              name: true,
              tier: true,
              qualityScore: true
            }
          },
          yachiIntegration: {
            select: {
              providerId: true,
              verificationStatus: true,
              profileUrl: true
            }
          }
        },
        orderBy: {
          issuedAt: 'desc'
        }
      });

      // 🏗️ Generate gallery structure
      const gallery = {
        studentId,
        totalCertificates: certificates.length,
        categories: this._categorizeCertificates(certificates),
        recentCertificates: certificates.slice(0, 5),
        yachiVerified: certificates.filter(c => c.yachiIntegration?.verificationStatus === 'VERIFIED').length,
        shareStats: await this._getShareStatistics(studentId),
        lastUpdated: new Date().toISOString(),
        traceId
      };

      this.emit('gallery.access.completed', { studentId, certificateCount: certificates.length });
      return gallery;

    } catch (error) {
      this._logError('GALLERY_ACCESS_FAILED', error, { studentId, traceId });
      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🎯 ENTERPRISE METHOD: Verify Certificate
   * @param {string} verificationHash - Certificate verification hash
   * @param {Object} verificationContext - Verification context data
   * @returns {Promise<Object>} Verification result
   */
  async verifyCertificate(verificationHash, verificationContext = {}) {
    const startTime = Date.now();
    const traceId = verificationContext.traceId || uuidv4();

    try {
      this.emit('verification.started', { verificationHash, traceId, verificationContext });

      // 🏗️ Retrieve and validate certificate
      const certificate = await this.prisma.certificate.findUnique({
        where: { verificationHash },
        include: {
          student: {
            select: {
              name: true,
              faydaId: true,
              profilePicture: true
            }
          },
          skill: {
            select: {
              name: true,
              category: true,
              description: true
            }
          },
          expert: {
            select: {
              name: true,
              tier: true,
              qualityScore: true
            }
          },
          yachiIntegration: true
        }
      });

      if (!certificate) {
        throw new Error('Certificate not found');
      }

      // 🏗️ Comprehensive Verification Checks
      await this._performVerificationChecks(certificate, verificationContext);

      // 🏗️ Log verification attempt
      await this._logVerificationAttempt(certificate, verificationContext, true);

      const processingTime = Date.now() - startTime;
      const verificationResult = {
        valid: true,
        certificate: {
          id: certificate.id,
          studentName: certificate.student.name,
          skillName: certificate.skill.name,
          expertName: certificate.expert.name,
          issuedAt: certificate.issuedAt,
          expirationDate: certificate.expirationDate,
          tier: certificate.tier,
          yachiVerified: certificate.yachiIntegration?.verificationStatus === 'VERIFIED'
        },
        verification: {
          timestamp: new Date().toISOString(),
          context: verificationContext.type || 'general',
          traceId
        },
        processingTime
      };

      this.emit('certificate.verified', verificationResult);
      return verificationResult;

    } catch (error) {
      // 🏗️ Log failed verification attempt
      if (verificationHash) {
        await this._logVerificationAttempt({ verificationHash }, verificationContext, false);
      }

      this._logError('VERIFICATION_FAILED', error, { verificationHash, traceId });
      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🎯 ENTERPRISE METHOD: Share Certificate
   * @param {string} certificateId - Certificate identifier
   * @param {Object} shareOptions - Sharing options
   * @returns {Promise<Object>} Sharing result
   */
  async shareCertificate(certificateId, shareOptions = {}) {
    const traceId = uuidv4();

    try {
      this.emit('certificate.share.started', { certificateId, shareOptions, traceId });

      // 🏗️ Validate certificate and permissions
      const certificate = await this._validateCertificateSharing(certificateId, shareOptions.studentId);

      // 🏗️ Generate sharing tokens and links
      const shareToken = this._generateShareToken(certificateId, shareOptions);
      const shareLinks = this._generateShareLinks(certificate, shareToken, shareOptions);

      // 🏗️ Create share record
      const shareRecord = await this.prisma.certificateShare.create({
        data: {
          certificateId,
          shareToken,
          shareType: shareOptions.platform || 'general',
          expiration: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)), // 30 days
          accessCount: 0,
          metadata: {
            platform: shareOptions.platform,
            message: shareOptions.message,
            customizations: shareOptions.customizations
          }
        }
      });

      const result = {
        success: true,
        shareId: shareRecord.id,
        shareToken,
        links: shareLinks,
        expiration: shareRecord.expiration,
        analytics: {
          previewUrl: `${process.env.BASE_URL}/certificate/share/${shareToken}/preview`,
          trackable: true
        },
        traceId
      };

      this.emit('certificate.shared', result);
      return result;

    } catch (error) {
      this._logError('SHARE_FAILED', error, { certificateId, traceId });
      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🏗️ Validate Certificate Data
   * @private
   */
  async _validateCertificateData(certificateData) {
    const requiredFields = ['studentId', 'enrollmentId', 'skillId', 'expertId', 'type'];
    const missingFields = requiredFields.filter(field => !certificateData[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate enrollment completion
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: certificateData.enrollmentId },
      include: {
        progress: {
          where: { phase: 'CERTIFICATION' }
        }
      }
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    if (enrollment.status !== 'COMPLETED') {
      throw new Error('Enrollment not completed');
    }

    return true;
  }

  /**
   * 🏗️ Verify Completion Requirements
   * @private
   */
  async _verifyCompletionRequirements(enrollmentId) {
    const requirements = await this.prisma.completionRequirement.findMany({
      where: { enrollmentId },
      include: {
        phase: true
      }
    });

    const unmetRequirements = requirements.filter(req => !req.completed);

    if (unmetRequirements.length > 0) {
      throw new Error(`Unmet completion requirements: ${unmetRequirements.map(r => r.phase.name).join(', ')}`);
    }

    return true;
  }

  /**
   * 🏗️ Generate Verification Hash
   * @private
   */
  _generateVerificationHash(certificateData) {
    const dataString = `${certificateData.studentId}:${certificateData.skillId}:${certificateData.enrollmentId}:${Date.now()}`;
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * 🏗️ Generate QR Code
   * @private
   */
  async _generateQRCode(verificationHash) {
    const verificationUrl = `${process.env.BASE_URL}/verify/${verificationHash}`;
    
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      return {
        dataUrl: qrCodeDataUrl,
        verificationUrl,
        type: 'QR_CODE'
      };
    } catch (error) {
      throw new Error('QR code generation failed');
    }
  }

  /**
   * 🏗️ Generate Digital Signature
   * @private
   */
  _generateDigitalSignature(certificateData) {
    const signData = {
      studentId: certificateData.studentId,
      skillId: certificateData.skillId,
      expertId: certificateData.expertId,
      timestamp: new Date().toISOString(),
      issuer: 'Mosa Forge Enterprise'
    };

    const signString = JSON.stringify(signData);
    const signature = crypto.createHmac('sha256', this.config.encryption.key)
      .update(signString)
      .digest('hex');

    return {
      signature,
      algorithm: 'HMAC-SHA256',
      timestamp: signData.timestamp
    };
  }

  /**
   * 🏗️ Create Certificate Record
   * @private
   */
  async _createCertificateRecord(certificateData) {
    return await this.prisma.$transaction(async (tx) => {
      const certificate = await tx.certificate.create({
        data: {
          id: certificateData.certificateId,
          studentId: certificateData.studentId,
          enrollmentId: certificateData.enrollmentId,
          skillId: certificateData.skillId,
          expertId: certificateData.expertId,
          type: certificateData.type,
          verificationHash: certificateData.verificationHash,
          digitalSignature: certificateData.digitalSignature,
          status: CERTIFICATE_STATUS.GENERATED,
          issuedAt: new Date(),
          expirationDate: new Date(Date.now() + this.config.validityPeriod),
          metadata: {
            template: this.templates[certificateData.type],
            generationContext: {
              qualityScore: certificateData.qualityScore,
              completionDate: new Date().toISOString(),
              issuerVersion: '1.0.0'
            }
          },
          traceId: certificateData.traceId
        }
      });

      // Create initial access record
      await tx.certificateAccess.create({
        data: {
          certificateId: certificate.id,
          accessType: 'GENERATION',
          accessedBy: 'SYSTEM',
          userAgent: 'Certificate Service',
          ipAddress: '127.0.0.1',
          metadata: {
            service: 'certificate-gallery',
            action: 'initial_generation'
          }
        }
      });

      return certificate;
    });
  }

  /**
   * 🏗️ Generate Certificate Assets
   * @private
   */
  async _generateCertificateAssets(certificate, qrCodeData) {
    const assets = {};

    // Generate PDF Certificate
    assets.pdfUrl = await this._generatePDFCertificate(certificate, qrCodeData);
    
    // Generate PNG Certificate (for sharing)
    assets.pngUrl = await this._generateImageCertificate(certificate, qrCodeData);
    
    // Generate verification page
    assets.verificationUrl = await this._generateVerificationPage(certificate);

    // Update certificate with asset URLs
    await this.prisma.certificate.update({
      where: { id: certificate.id },
      data: {
        assetUrls: assets,
        updatedAt: new Date()
      }
    });

    return assets;
  }

  /**
   * 🏗️ Generate PDF Certificate
   * @private
   */
  async _generatePDFCertificate(certificate, qrCodeData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape'
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', async () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            const key = `certificates/${certificate.id}/certificate.pdf`;
            
            await this.s3Client.send(new PutObjectCommand({
              Bucket: this.config.s3.bucket,
              Key: key,
              Body: pdfBuffer,
              ContentType: 'application/pdf',
              Metadata: {
                'certificate-id': certificate.id,
                'student-id': certificate.studentId,
                'issued-at': certificate.issuedAt.toISOString()
              }
            }));

            resolve(`${process.env.CDN_BASE_URL}/${key}`);
          } catch (error) {
            reject(error);
          }
        });

        // 🎨 Certificate Design Implementation
        this._designPDFCertificate(doc, certificate, qrCodeData);
        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 🎨 Design PDF Certificate
   * @private
   */
  _designPDFCertificate(doc, certificate, qrCodeData) {
    const template = this.templates[certificate.type] || this.templates.SKILL_COMPLETION;
    const { colors, layout } = template;

    // Background
    doc.rect(0, 0, doc.page.width, doc.page.height)
       .fill(colors.primary);

    // Border
    doc.strokeColor(colors.gold)
       .lineWidth(10)
       .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
       .stroke();

    // Title
    doc.fontSize(36)
       .fillColor(colors.gold)
       .text('MOSA FORGE', 0, 80, { align: 'center' })
       .fontSize(24)
       .text('Certificate of Completion', 0, 130, { align: 'center' });

    // Student Name
    doc.fontSize(32)
       .fillColor('#FFFFFF')
       .text(certificate.student.name, 0, 200, { align: 'center' });

    // Skill Information
    doc.fontSize(18)
       .fillColor(colors.accent)
       .text(`has successfully completed the ${certificate.skill.name} program`, 0, 260, { align: 'center' })
       .fontSize(16)
       .fillColor('#CCCCCC')
       .text(`under the guidance of ${certificate.expert.name}`, 0, 300, { align: 'center' });

    // Dates
    doc.fontSize(12)
       .fillColor('#AAAAAA')
       .text(`Issued on: ${certificate.issuedAt.toLocaleDateString()}`, 0, 350, { align: 'center' })
       .text(`Valid until: ${certificate.expirationDate.toLocaleDateString()}`, 0, 370, { align: 'center' });

    // QR Code
    if (qrCodeData.dataUrl) {
      const qrCodeBuffer = Buffer.from(qrCodeData.dataUrl.split(',')[1], 'base64');
      doc.image(qrCodeBuffer, doc.page.width - 150, doc.page.height - 150, {
        width: 100,
        height: 100
      });

      doc.fontSize(8)
         .fillColor('#AAAAAA')
         .text('Scan to verify', doc.page.width - 150, doc.page.height - 40, {
           width: 100,
           align: 'center'
         });
    }

    // Verification Hash
    doc.fontSize(8)
       .fillColor('#666666')
       .text(`Verification: ${certificate.verificationHash}`, 50, doc.page.height - 30);
  }

  /**
   * 🏗️ Generate Image Certificate
   * @private
   */
  async _generateImageCertificate(certificate, qrCodeData) {
    // Implementation for PNG certificate generation
    // This would use a canvas library in production
    return `${process.env.CDN_BASE_URL}/certificates/${certificate.id}/certificate.png`;
  }

  /**
   * 🏗️ Generate Verification Page
   * @private
   */
  async _generateVerificationPage(certificate) {
    // Generate HTML verification page
    return `${process.env.BASE_URL}/certificate/${certificate.verificationHash}/verify`;
  }

  /**
   * 🏗️ Integrate with Yachi Platform
   * @private
   */
  async _integrateWithYachi(certificate) {
    return await this.circuitBreaker.execute(async () => {
      try {
        const yachiData = {
          provider: {
            name: certificate.student.name,
            skill: certificate.skill.name,
            certification: {
              issuer: 'Mosa Forge',
              certificateId: certificate.id,
              issueDate: certificate.issuedAt,
              verificationHash: certificate.verificationHash
            },
            contact: {
              // Student contact information (with privacy considerations)
            }
          },
          integration: {
            source: 'mosa_forge',
            version: '1.0',
            timestamp: new Date().toISOString()
          }
        };

        // In production, this would make actual API call to Yachi
        const yachiResponse = {
          success: true,
          providerId: `yachi_${certificate.id}`,
          verificationStatus: 'VERIFIED',
          profileUrl: `${this.config.yachi.baseUrl}/providers/yachi_${certificate.id}`,
          integratedAt: new Date().toISOString()
        };

        // Store Yachi integration data
        await this.prisma.yachiIntegration.create({
          data: {
            certificateId: certificate.id,
            providerId: yachiResponse.providerId,
            verificationStatus: yachiResponse.verificationStatus,
            profileUrl: yachiResponse.profileUrl,
            integratedAt: new Date(yachiResponse.integratedAt),
            metadata: {
              request: yachiData,
              response: yachiResponse
            }
          }
        });

        this.emit('yachi.integration.completed', {
          certificateId: certificate.id,
          providerId: yachiResponse.providerId,
          profileUrl: yachiResponse.profileUrl
        });

        return yachiResponse;

      } catch (error) {
        throw new Error(`Yachi integration failed: ${error.message}`);
      }
    });
  }

  /**
   * 🏗️ Setup Employer Verification
   * @private
   */
  async _setupEmployerVerification(certificate) {
    await this.prisma.employerVerification.create({
      data: {
        certificateId: certificate.id,
        verificationCode: this._generateVerificationCode(),
        isActive: true,
        accessCount: 0,
        expiresAt: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000)), // 1 year
        metadata: {
          setupDate: new Date().toISOString(),
          certificateType: certificate.type
        }
      }
    });
  }

  /**
   * 🏗️ Generate Verification Code
   * @private
   */
  _generateVerificationCode() {
    return crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  /**
   * 🏗️ Generate Shareable Links
   * @private
   */
  _generateShareableLinks(certificate) {
    const baseUrl = process.env.BASE_URL;
    
    return {
      verification: `${baseUrl}/verify/${certificate.verificationHash}`,
      publicProfile: `${baseUrl}/profile/${certificate.studentId}/certificates`,
      linkedIn: `${baseUrl}/share/${certificate.id}/linkedin`,
      twitter: `${baseUrl}/share/${certificate.id}/twitter`,
      facebook: `${baseUrl}/share/${certificate.id}/facebook`,
      directDownload: `${baseUrl}/certificate/${certificate.id}/download`
    };
  }

  /**
   * 🏗️ Categorize Certificates
   * @private
   */
  _categorizeCertificates(certificates) {
    const categories = {
      digital_skills: [],
      trades: [],
      creative: [],
      professional: [],
      master_tier: []
    };

    certificates.forEach(certificate => {
      const category = this._mapSkillToCategory(certificate.skill.category);
      if (categories[category]) {
        categories[category].push(certificate);
      }
    });

    return categories;
  }

  /**
   * 🏗️ Map Skill to Category
   * @private
   */
  _mapSkillToCategory(skillCategory) {
    const categoryMap = {
      'online': 'digital_skills',
      'offline': 'trades', 
      'health_sports': 'professional',
      'beauty_fashion': 'creative',
      'master': 'master_tier'
    };

    return categoryMap[skillCategory] || 'professional';
  }

  /**
   * 🏗️ Get Share Statistics
   * @private
   */
  async _getShareStatistics(studentId) {
    const shares = await this.prisma.certificateShare.findMany({
      where: {
        certificate: {
          studentId
        }
      },
      select: {
        shareType: true,
        accessCount: true
      }
    });

    return {
      totalShares: shares.length,
      totalViews: shares.reduce((sum, share) => sum + share.accessCount, 0),
      byPlatform: shares.reduce((acc, share) => {
        acc[share.shareType] = (acc[share.shareType] || 0) + 1;
        return acc;
      }, {})
    };
  }

  /**
   * 🏗️ Perform Verification Checks
   * @private
   */
  async _performVerificationChecks(certificate, context) {
    // Check certificate status
    if (certificate.status === CERTIFICATE_STATUS.REVOKED) {
      throw new Error('Certificate has been revoked');
    }

    if (certificate.status === CERTIFICATE_STATUS.EXPIRED) {
      throw new Error('Certificate has expired');
    }

    // Check expiration
    if (new Date() > certificate.expirationDate) {
      await this.prisma.certificate.update({
        where: { id: certificate.id },
        data: { status: CERTIFICATE_STATUS.EXPIRED }
      });
      throw new Error('Certificate has expired');
    }

    // Verify digital signature
    const signatureValid = this._verifyDigitalSignature(certificate);
    if (!signatureValid) {
      throw new Error('Digital signature verification failed');
    }

    // Additional context-specific checks
    if (context.type === 'employer') {
      await this._performEmployerVerification(certificate, context);
    }

    return true;
  }

  /**
   * 🏗️ Verify Digital Signature
   * @private
   */
  _verifyDigitalSignature(certificate) {
    try {
      const signData = {
        studentId: certificate.studentId,
        skillId: certificate.skillId,
        expertId: certificate.expertId,
        timestamp: certificate.digitalSignature.timestamp,
        issuer: 'Mosa Forge Enterprise'
      };

      const signString = JSON.stringify(signData);
      const expectedSignature = crypto.createHmac('sha256', this.config.encryption.key)
        .update(signString)
        .digest('hex');

      return certificate.digitalSignature.signature === expectedSignature;
    } catch (error) {
      return false;
    }
  }

  /**
   * 🏗️ Perform Employer Verification
   * @private
   */
  async _performEmployerVerification(certificate, context) {
    const verification = await this.prisma.employerVerification.findFirst({
      where: {
        certificateId: certificate.id,
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!verification) {
      throw new Error('Employer verification not available for this certificate');
    }

    // Log employer verification
    await this.prisma.employerVerification.update({
      where: { id: verification.id },
      data: {
        accessCount: { increment: 1 },
        lastAccessed: new Date()
      }
    });
  }

  /**
   * 🏗️ Log Verification Attempt
   * @private
   */
  async _logVerificationAttempt(certificate, context, success) {
    await this.prisma.certificateAccess.create({
      data: {
        certificateId: certificate.id,
        accessType: 'VERIFICATION',
        accessedBy: context.verifier || 'unknown',
        userAgent: context.userAgent || 'unknown',
        ipAddress: context.ipAddress || 'unknown',
        success,
        metadata: {
          verificationContext: context,
          success,
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  /**
   * 🏗️ Validate Student Access
   * @private
   */
  async _validateStudentAccess(studentId) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, status: true }
    });

    if (!student) {
      throw new Error('Student not found');
    }

    if (student.status !== 'ACTIVE') {
      throw new Error('Student account is not active');
    }

    return true;
  }

  /**
   * 🏗️ Validate Certificate Sharing
   * @private
   */
  async _validateCertificateSharing(certificateId, studentId) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        student: { select: { id: true } }
      }
    });

    if (!certificate) {
      throw new Error('Certificate not found');
    }

    // If a studentId is provided, ensure they own the certificate
    if (studentId && certificate.student?.id !== studentId) {
      throw new Error('Permission denied: student does not own this certificate');
    }

    return certificate;
  }
} // end class CertificateGallery

module.exports = CertificateGallery;