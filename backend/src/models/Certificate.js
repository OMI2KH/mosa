// models/Certificate.js

/**
 * 🎯 ENTERPRISE CERTIFICATE MODEL
 * Production-ready certificate management for Mosa Forge
 * Features: Digital certificates, Yachi integration, verification, employer portal
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { Logger } = require('../utils/logger');

class Certificate extends Model {
  /**
   * 🎯 INITIALIZE CERTIFICATE MODEL
   */
  static init(sequelize) {
    return super.init({
      // 🆔 PRIMARY IDENTIFIERS
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      certificateNumber: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },

      // 👨‍🎓 STUDENT INFORMATION
      studentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id'
        }
      },
      studentFaydaId: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          is: /^[0-9]{10,20}$/ // Fayda ID format validation
        }
      },
      studentFullName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 255]
        }
      },
      studentEmail: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          isEmail: true
        }
      },
      studentPhone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          is: /^\+251[0-9]{9}$/ // Ethiopian phone format
        }
      },

      // 👨‍🏫 EXPERT & COURSE INFORMATION
      expertId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'experts',
          key: 'id'
        }
      },
      expertName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      skillId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'skills',
          key: 'id'
        }
      },
      skillName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      skillCategory: {
        type: DataTypes.ENUM(
          'ONLINE_SKILLS',
          'OFFLINE_SKILLS', 
          'HEALTH_SPORTS',
          'BEAUTY_FASHION'
        ),
        allowNull: false
      },

      // 📊 PERFORMANCE METRICS
      finalGrade: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        validate: {
          min: 0,
          max: 100
        }
      },
      performanceLevel: {
        type: DataTypes.ENUM(
          'DISTINCTION',
          'EXCELLENT',
          'COMPETENT',
          'SATISFACTORY'
        ),
        allowNull: false
      },
      completionDate: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isDate: true
        }
      },
      courseDuration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1 // Minimum 1 month
        }
      },

      // 🔐 SECURITY & VERIFICATION
      verificationHash: {
        type: DataTypes.STRING(64),
        unique: true,
        allowNull: false
      },
      qrCodeData: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      digitalSignature: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      publicKey: {
        type: DataTypes.TEXT,
        allowNull: false
      },

      // 🌐 YACHI INTEGRATION
      yachiProviderId: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: true
      },
      yachiVerificationStatus: {
        type: DataTypes.ENUM(
          'PENDING',
          'VERIFIED',
          'REJECTED',
          'SUSPENDED'
        ),
        defaultValue: 'PENDING'
      },
      yachiVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      yachiProviderUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
          isUrl: true
        }
      },

      // 📄 CERTIFICATE METADATA
      certificateTemplate: {
        type: DataTypes.ENUM(
          'STANDARD',
          'DISTINCTION',
          'ENTERPRISE',
          'YACHI_VERIFIED'
        ),
        defaultValue: 'STANDARD'
      },
      certificateLanguage: {
        type: DataTypes.ENUM(
          'ENGLISH',
          'AMHARIC',
          'OROMIFFA',
          'TIGRIGNA'
        ),
        defaultValue: 'ENGLISH'
      },
      issueDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
        validate: {
          isDate: true
        }
      },
      isLifetime: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },

      // 🔍 EMPLOYER PORTAL DATA
      employerAccessCode: {
        type: DataTypes.STRING(12),
        unique: true,
        allowNull: true
      },
      verificationCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0
        }
      },
      lastVerifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },

      // 📊 STATUS & TRACKING
      status: {
        type: DataTypes.ENUM(
          'DRAFT',
          'ISSUED',
          'ACTIVE',
          'SUSPENDED',
          'REVOKED',
          'EXPIRED'
        ),
        defaultValue: 'DRAFT'
      },
      revocationReason: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      revokedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },

      // 💾 TECHNICAL METADATA
      metadata: {
        type: DataTypes.JSONB,
        defaultValue: {}
      },
      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        validate: {
          min: 1
        }
      }

    }, {
      sequelize,
      modelName: 'Certificate',
      tableName: 'certificates',
      timestamps: true,
      paranoid: true, // Soft deletes
      indexes: [
        // Performance indexes
        {
          unique: true,
          fields: ['certificateNumber']
        },
        {
          unique: true,
          fields: ['verificationHash']
        },
        {
          unique: true,
          fields: ['yachiProviderId']
        },
        {
          fields: ['studentId']
        },
        {
          fields: ['expertId']
        },
        {
          fields: ['skillId']
        },
        {
          fields: ['status']
        },
        {
          fields: ['completionDate']
        },
        // Composite indexes for common queries
        {
          fields: ['studentFaydaId', 'status']
        },
        {
          fields: ['yachiVerificationStatus', 'status']
        },
        {
          fields: ['issueDate', 'skillCategory']
        }
      ],
      hooks: {
        beforeCreate: async (certificate) => {
          await certificate.generateCertificateNumber();
          await certificate.generateSecurityFeatures();
          await certificate.calculatePerformanceLevel();
        },
        beforeUpdate: async (certificate) => {
          if (certificate.changed('finalGrade')) {
            await certificate.calculatePerformanceLevel();
          }
        }
      }
    });
  }

  /**
   * 🔗 MODEL ASSOCIATIONS
   */
  static associate(models) {
    // Student relationship
    this.belongsTo(models.Student, {
      foreignKey: 'studentId',
      as: 'student',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    // Expert relationship
    this.belongsTo(models.Expert, {
      foreignKey: 'expertId',
      as: 'expert',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    // Skill relationship
    this.belongsTo(models.Skill, {
      foreignKey: 'skillId',
      as: 'skill',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    // Verification logs
    this.hasMany(models.CertificateVerification, {
      foreignKey: 'certificateId',
      as: 'verificationLogs',
      onDelete: 'CASCADE'
    });

    // Employer access
    this.hasMany(models.EmployerAccess, {
      foreignKey: 'certificateId',
      as: 'employerAccesses',
      onDelete: 'CASCADE'
    });
  }

  /**
   * 🔢 GENERATE CERTIFICATE NUMBER
   */
  async generateCertificateNumber() {
    if (this.certificateNumber) return;

    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const skillCode = this.skillName.substring(0, 3).toUpperCase();
    
    this.certificateNumber = `MOSA-${skillCode}-${timestamp}-${random}`;
  }

  /**
   * 🔐 GENERATE SECURITY FEATURES
   */
  async generateSecurityFeatures() {
    // Generate verification hash
    const rawData = `${this.studentFaydaId}-${this.certificateNumber}-${Date.now()}`;
    this.verificationHash = crypto
      .createHash('sha256')
      .update(rawData)
      .digest('hex');

    // Generate QR Code data
    const verificationUrl = `${process.env.CERTIFICATE_VERIFICATION_URL}/${this.verificationHash}`;
    this.qrCodeData = await QRCode.toDataURL(verificationUrl);

    // Generate digital signature
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    
    const sign = crypto.createSign('SHA256');
    sign.update(this.verificationHash);
    sign.end();
    
    this.digitalSignature = sign.sign(privateKey, 'base64');
    this.publicKey = publicKey.export({ type: 'pkcs1', format: 'pem' });
  }

  /**
   * 📊 CALCULATE PERFORMANCE LEVEL
   */
  async calculatePerformanceLevel() {
    if (this.finalGrade >= 90) {
      this.performanceLevel = 'DISTINCTION';
      this.certificateTemplate = 'DISTINCTION';
    } else if (this.finalGrade >= 80) {
      this.performanceLevel = 'EXCELLENT';
    } else if (this.finalGrade >= 70) {
      this.performanceLevel = 'COMPETENT';
    } else {
      this.performanceLevel = 'SATISFACTORY';
    }
  }

  /**
   * 🎯 ISSUE CERTIFICATE
   */
  async issueCertificate() {
    if (this.status !== 'DRAFT') {
      throw new Error('CERTIFICATE_ALREADY_ISSUED');
    }

    this.status = 'ISSUED';
    this.issueDate = new Date();

    // Set expiry date if not lifetime
    if (!this.isLifetime) {
      const expiry = new Date(this.issueDate);
      expiry.setFullYear(expiry.getFullYear() + 2); // 2-year validity
      this.expiryDate = expiry;
    }

    // Generate employer access code
    this.employerAccessCode = crypto
      .randomBytes(6)
      .toString('hex')
      .toUpperCase();

    await this.save();

    // Emit certificate issued event
    this.emit('certificateIssued', this);
  }

  /**
   * 🌐 REGISTER WITH YACHI
   */
  async registerWithYachi() {
    if (this.status !== 'ISSUED') {
      throw new Error('CERTIFICATE_NOT_ISSUED');
    }

    try {
      // Yachi API integration
      const yachiResponse = await this.integrateWithYachi();

      this.yachiProviderId = yachiResponse.providerId;
      this.yachiVerificationStatus = 'VERIFIED';
      this.yachiVerifiedAt = new Date();
      this.yachiProviderUrl = yachiResponse.providerUrl;
      this.certificateTemplate = 'YACHI_VERIFIED';

      await this.save();

      this.emit('yachiRegistered', this);

      return yachiResponse;
    } catch (error) {
      this.yachiVerificationStatus = 'REJECTED';
      await this.save();
      throw error;
    }
  }

  /**
   * 🔗 INTEGRATE WITH YACHI PLATFORM
   */
  async integrateWithYachi() {
    // Mock Yachi API integration - replace with actual API calls
    const yachiPayload = {
      providerName: this.studentFullName,
      providerId: this.studentFaydaId,
      skill: this.skillName,
      certification: this.certificateNumber,
      verificationHash: this.verificationHash,
      issueDate: this.issueDate,
      grade: this.finalGrade,
      performanceLevel: this.performanceLevel
    };

    // In production, this would be actual API call
    // const response = await fetch(`${process.env.YACHI_API_URL}/providers/register`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(yachiPayload)
    // });

    // Simulate API response
    return {
      providerId: `YACHI-${this.studentFaydaId}-${Date.now()}`,
      providerUrl: `https://yachi.et/providers/${this.studentFaydaId}`,
      status: 'ACTIVE',
      registeredAt: new Date().toISOString()
    };
  }

  /**
   * 🔍 VERIFY CERTIFICATE
   */
  async verifyCertificate(verifierInfo = {}) {
    // Check if certificate is valid
    if (this.status !== 'ISSUED' && this.status !== 'ACTIVE') {
      throw new Error('CERTIFICATE_INVALID');
    }

    // Check expiry if not lifetime
    if (!this.isLifetime && this.expiryDate && new Date() > this.expiryDate) {
      throw new Error('CERTIFICATE_EXPIRED');
    }

    // Verify digital signature
    const verify = crypto.createVerify('SHA256');
    verify.update(this.verificationHash);
    verify.end();

    const isValidSignature = verify.verify(
      this.publicKey,
      this.digitalSignature,
      'base64'
    );

    if (!isValidSignature) {
      throw new Error('CERTIFICATE_TAMPERED');
    }

    // Update verification metrics
    this.verificationCount += 1;
    this.lastVerifiedAt = new Date();
    await this.save();

    // Log verification
    await this.logVerification(verifierInfo);

    return {
      isValid: true,
      certificate: this.toVerificationResponse(),
      verifiedAt: new Date()
    };
  }

  /**
   * 📝 LOG VERIFICATION ATTEMPT
   */
  async logVerification(verifierInfo) {
    const { CertificateVerification } = require('./CertificateVerification');
    
    await CertificateVerification.create({
      certificateId: this.id,
      verifierType: verifierInfo.type || 'UNKNOWN',
      verifierId: verifierInfo.id || null,
      verifierIp: verifierInfo.ipAddress || null,
      userAgent: verifierInfo.userAgent || null,
      verificationResult: 'SUCCESS',
      metadata: verifierInfo
    });
  }

  /**
   * 🎫 GENERATE VERIFICATION RESPONSE
   */
  toVerificationResponse() {
    return {
      certificateNumber: this.certificateNumber,
      studentName: this.studentFullName,
      studentFaydaId: this.studentFaydaId,
      skillName: this.skillName,
      skillCategory: this.skillCategory,
      expertName: this.expertName,
      finalGrade: this.finalGrade,
      performanceLevel: this.performanceLevel,
      completionDate: this.completionDate,
      issueDate: this.issueDate,
      expiryDate: this.expiryDate,
      yachiVerified: this.yachiVerificationStatus === 'VERIFIED',
      yachiProviderId: this.yachiProviderId,
      status: this.status,
      verificationHash: this.verificationHash
    };
  }

  /**
   * 📄 GENERATE PDF CERTIFICATE
   */
  async generatePdfCertificate() {
    // This would integrate with a PDF generation service
    const certificateData = {
      certificateNumber: this.certificateNumber,
      studentName: this.studentFullName,
      studentFaydaId: this.studentFaydaId,
      skillName: this.skillName,
      expertName: this.expertName,
      finalGrade: this.finalGrade,
      performanceLevel: this.performanceLevel,
      completionDate: this.completionDate.toLocaleDateString('en-US'),
      issueDate: this.issueDate.toLocaleDateString('en-US'),
      qrCode: this.qrCodeData,
      verificationUrl: `${process.env.CERTIFICATE_VERIFICATION_URL}/${this.verificationHash}`,
      yachiBadge: this.yachiVerificationStatus === 'VERIFIED'
    };

    // In production, this would call a PDF generation service
    // const pdfBuffer = await PDFService.generateCertificate(certificateData);
    
    // Mock PDF generation
    const mockPdfBuffer = Buffer.from(`Certificate PDF for ${this.certificateNumber}`);
    
    return {
      pdfBuffer: mockPdfBuffer,
      fileName: `MOSA_Certificate_${this.certificateNumber}.pdf`,
      mimeType: 'application/pdf'
    };
  }

  /**
   * 🔧 REVOKE CERTIFICATE
   */
  async revokeCertificate(reason, revokedBy) {
    if (this.status === 'REVOKED') {
      throw new Error('CERTIFICATE_ALREADY_REVOKED');
    }

    this.status = 'REVOKED';
    this.revocationReason = reason;
    this.revokedAt = new Date();

    // Update Yachi status if applicable
    if (this.yachiVerificationStatus === 'VERIFIED') {
      this.yachiVerificationStatus = 'SUSPENDED';
    }

    await this.save();

    // Log revocation
    this.emit('certificateRevoked', {
      certificate: this,
      reason,
      revokedBy,
      revokedAt: this.revokedAt
    });
  }

  /**
   * 📊 GET CERTIFICATE STATISTICS
   */
  static async getStatistics(timeframe = '30d') {
    const { Op } = require('sequelize');
    
    const startDate = new Date();
    switch (timeframe) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const stats = await this.findAll({
      where: {
        issueDate: {
          [Op.gte]: startDate
        }
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalIssued'],
        [sequelize.fn('AVG', sequelize.col('finalGrade')), 'averageGrade'],
        [sequelize.fn('COUNT', sequelize.literal('DISTINCT "skillId"')), 'uniqueSkills'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN "yachiVerificationStatus" = \'VERIFIED\' THEN 1 ELSE 0 END')), 'yachiVerifiedCount']
      ],
      raw: true
    });

    return stats[0] || {
      totalIssued: 0,
      averageGrade: 0,
      uniqueSkills: 0,
      yachiVerifiedCount: 0
    };
  }

  /**
   * 🔍 FIND BY VERIFICATION HASH
   */
  static async findByVerificationHash(hash) {
    return await this.findOne({
      where: { verificationHash: hash },
      include: [
        { association: 'student', attributes: ['id', 'name', 'email'] },
        { association: 'expert', attributes: ['id', 'name', 'currentTier'] },
        { association: 'skill', attributes: ['id', 'name', 'category'] }
      ]
    });
  }

  /**
   * 🎯 BULK ISSUE CERTIFICATES
   */
  static async bulkIssueCertificates(certificateDataArray) {
    const results = {
      successful: [],
      failed: []
    };

    for (const certData of certificateDataArray) {
      try {
        const certificate = await this.create(certData);
        await certificate.issueCertificate();
        results.successful.push(certificate);
      } catch (error) {
        results.failed.push({
          data: certData,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 🧹 CLEANUP EXPIRED CERTIFICATES
   */
  static async cleanupExpiredCertificates() {
    const { Op } = require('sequelize');
    
    const expiredCertificates = await this.findAll({
      where: {
        isLifetime: false,
        expiryDate: {
          [Op.lt]: new Date()
        },
        status: {
          [Op.in]: ['ISSUED', 'ACTIVE']
        }
      }
    });

    for (const certificate of expiredCertificates) {
      certificate.status = 'EXPIRED';
      await certificate.save();
    }

    return {
      expiredCount: expiredCertificates.length,
      processedAt: new Date()
    };
  }
}

// Export the model
module.exports = Certificate;