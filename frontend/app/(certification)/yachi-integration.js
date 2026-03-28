// certification-service/yachi-integration.js

/**
 * 🎯 ENTERPRISE YACHI INTEGRATION SERVICE
 * Production-ready Yachi verification and certificate management
 * Features: Automatic verification, digital certificates, employer portal, fraud prevention
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const axios = require('axios');
const { Logger } = require('../utils/logger');
const { CertificateGenerator } = require('./certificate-generator');
const { RateLimiterRedis } = require('rate-limiter-flexible');

class YachiIntegration extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('YachiIntegration');
    this.certificateGenerator = new CertificateGenerator();
    
    // Yachi API Configuration
    this.yachiConfig = {
      baseURL: process.env.YACHI_API_BASE_URL || 'https://api.yachi.et/v1',
      apiKey: process.env.YACHI_API_KEY,
      timeout: 30000,
      retryAttempts: 3
    };

    // Initialize Yachi API client
    this.yachiClient = axios.create({
      baseURL: this.yachiConfig.baseURL,
      timeout: this.yachiConfig.timeout,
      headers: {
        'Authorization': `Bearer ${this.yachiConfig.apiKey}`,
        'Content-Type': 'application/json',
        'X-Platform': 'MosaForge'
      }
    });

    // Rate limiting for Yachi API calls
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: () => 'yachi_api_global',
      points: 100, // 100 requests
      duration: 60 // per minute
    });

    this.initialize();
  }

  /**
   * Initialize Yachi integration service
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.healthCheck();
      
      // Warm up certificate templates cache
      await this.warmUpCertificateCache();
      
      this.logger.info('Yachi integration service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Yachi integration', error);
      throw error;
    }
  }

  /**
   * 🎯 AUTOMATIC YACHI VERIFICATION - Core verification flow
   */
  async initiateYachiVerification(verificationData) {
    const startTime = performance.now();
    
    try {
      // 🛡️ VALIDATION PHASE
      await this.validateVerificationData(verificationData);

      // 🔍 FRAUD PREVENTION
      const fraudCheck = await this.performFraudChecks(verificationData);
      if (fraudCheck.riskLevel === 'HIGH') {
        throw new Error('VERIFICATION_REJECTED_FRAUD_DETECTED');
      }

      // 💾 TRANSACTION PROCESSING
      const verificationResult = await this.processVerificationTransaction(verificationData, fraudCheck);

      // 📧 NOTIFICATION & UPDATES
      await this.sendVerificationNotifications(verificationResult);

      // 🔔 EMIT EVENTS
      this.emit('yachiVerificationCompleted', verificationResult);

      const processingTime = performance.now() - startTime;
      this.logger.metric('yachi_verification_time', processingTime, {
        studentId: verificationData.studentId,
        certificateId: verificationResult.certificateId
      });

      return {
        success: true,
        verificationId: verificationResult.verificationId,
        certificateId: verificationResult.certificateId,
        yachiProviderId: verificationResult.yachiProviderId,
        qrCodeUrl: verificationResult.qrCodeUrl,
        verificationUrl: verificationResult.verificationUrl,
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Yachi verification failed', error, { verificationData });
      throw error;
    }
  }

  /**
   * 🛡️ COMPREHENSIVE VERIFICATION VALIDATION
   */
  async validateVerificationData(verificationData) {
    const {
      studentId,
      certificateId,
      skillId,
      completionDate,
      finalScore
    } = verificationData;

    // Required fields validation
    if (!studentId || !certificateId || !skillId || !completionDate || !finalScore) {
      throw new Error('MISSING_REQUIRED_VERIFICATION_FIELDS');
    }

    // Student existence and completion validation
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          where: {
            status: 'COMPLETED',
            skillId: skillId
          }
        }
      }
    });

    if (!student) {
      throw new Error('STUDENT_NOT_FOUND');
    }

    if (student.enrollments.length === 0) {
      throw new Error('NO_COMPLETED_ENROLLMENT_FOUND');
    }

    // Certificate validation
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId }
    });

    if (!certificate) {
      throw new Error('CERTIFICATE_NOT_FOUND');
    }

    if (certificate.studentId !== studentId) {
      throw new Error('CERTIFICATE_STUDENT_MISMATCH');
    }

    if (certificate.status !== 'ISSUED') {
      throw new Error('CERTIFICATE_NOT_ISSUED');
    }

    // Final score validation
    if (finalScore < 70) { // Minimum passing score
      throw new Error('INSUFFICIENT_FINAL_SCORE');
    }

    // Duplicate verification prevention
    const existingVerification = await this.prisma.yachiVerification.findFirst({
      where: {
        certificateId,
        status: { in: ['PENDING', 'APPROVED'] }
      }
    });

    if (existingVerification) {
      throw new Error('DUPLICATE_VERIFICATION_ATTEMPT');
    }

    this.logger.debug('Verification validation passed', { studentId, certificateId });
  }

  /**
   * 🔍 ADVANCED FRAUD DETECTION
   */
  async performFraudChecks(verificationData) {
    const { studentId, certificateId, finalScore } = verificationData;
    let riskScore = 0;
    const riskFactors = [];

    // Check certificate authenticity
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: { student: true }
    });

    // Factor 1: Certificate manipulation detection
    const expectedHash = this.generateCertificateHash(certificate);
    if (certificate.securityHash !== expectedHash) {
      riskScore += 0.4;
      riskFactors.push('CERTIFICATE_TAMPERING_DETECTED');
    }

    // Factor 2: Score consistency check
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        skillId: verificationData.skillId,
        status: 'COMPLETED'
      },
      include: { sessions: true }
    });

    const sessionScores = enrollment.sessions.map(s => s.finalScore).filter(Boolean);
    const averageSessionScore = sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length;

    if (Math.abs(finalScore - averageSessionScore) > 20) {
      riskScore += 0.3;
      riskFactors.push('SCORE_INCONSISTENCY_DETECTED');
    }

    // Factor 3: Rapid completion detection
    const completionTime = new Date(verificationData.completionDate) - new Date(enrollment.createdAt);
    const expectedDuration = 120 * 24 * 60 * 60 * 1000; // 120 days in milliseconds

    if (completionTime < (expectedDuration * 0.5)) { // Less than 50% of expected time
      riskScore += 0.3;
      riskFactors.push('RAPID_COMPLETION_DETECTED');
    }

    // Determine risk level
    let riskLevel = 'LOW';
    if (riskScore >= 0.7) riskLevel = 'HIGH';
    else if (riskScore >= 0.4) riskLevel = 'MEDIUM';

    this.logger.debug('Fraud check completed', { studentId, riskScore, riskLevel, riskFactors });

    return {
      riskScore,
      riskLevel,
      riskFactors,
      requiresManualReview: riskLevel !== 'LOW'
    };
  }

  /**
   * 💾 TRANSACTIONAL VERIFICATION PROCESSING
   */
  async processVerificationTransaction(verificationData, fraudCheck) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create Yachi verification record
      const verificationRecord = await tx.yachiVerification.create({
        data: {
          studentId: verificationData.studentId,
          certificateId: verificationData.certificateId,
          skillId: verificationData.skillId,
          finalScore: verificationData.finalScore,
          completionDate: new Date(verificationData.completionDate),
          riskScore: fraudCheck.riskScore,
          riskFactors: fraudCheck.riskFactors,
          status: fraudCheck.requiresManualReview ? 'UNDER_REVIEW' : 'PENDING',
          metadata: {
            fraudCheck: fraudCheck,
            submissionTime: new Date().toISOString(),
            autoApproved: !fraudCheck.requiresManualReview
          }
        }
      });

      // 2. Call Yachi API for provider registration
      let yachiResponse;
      if (!fraudCheck.requiresManualReview) {
        yachiResponse = await this.registerYachiProvider(verificationRecord, verificationData);
        
        // 3. Update verification with Yachi response
        await tx.yachiVerification.update({
          where: { id: verificationRecord.id },
          data: {
            yachiProviderId: yachiResponse.providerId,
            status: 'APPROVED',
            approvedAt: new Date(),
            yachiMetadata: yachiResponse
          }
        });

        // 4. Generate digital certificate with Yachi verification
        const certificateUpdate = await this.updateCertificateWithYachiVerification(
          verificationData.certificateId, 
          yachiResponse, 
          tx
        );

        // 5. Create employer portal access
        await this.createEmployerPortalAccess(verificationRecord, yachiResponse, tx);

        return {
          ...verificationRecord,
          yachiProviderId: yachiResponse.providerId,
          certificateId: verificationData.certificateId,
          qrCodeUrl: yachiResponse.qrCodeUrl,
          verificationUrl: yachiResponse.verificationUrl
        };
      }

      return verificationRecord;
    }, {
      maxWait: 10000,
      timeout: 30000
    });
  }

  /**
   * 🌐 REGISTER YACHI PROVIDER
   */
  async registerYachiProvider(verificationRecord, verificationData) {
    try {
      await this.rateLimiter.consume('yachi_api_global');

      const providerData = await this.prepareYachiProviderData(verificationRecord, verificationData);

      const response = await this.yachiClient.post('/providers/register', providerData, {
        timeout: 15000
      });

      if (response.data.success) {
        this.logger.info('Yachi provider registration successful', {
          verificationId: verificationRecord.id,
          providerId: response.data.data.providerId
        });

        return {
          providerId: response.data.data.providerId,
          qrCodeUrl: response.data.data.qrCodeUrl,
          verificationUrl: response.data.data.verificationUrl,
          profileUrl: response.data.data.profileUrl,
          registeredAt: new Date().toISOString()
        };
      } else {
        throw new Error(`Yachi API Error: ${response.data.message}`);
      }
    } catch (error) {
      this.logger.error('Yachi provider registration failed', error, {
        verificationId: verificationRecord.id
      });

      // Retry logic
      if (error.response?.status >= 500) {
        return await this.retryYachiRegistration(verificationRecord, verificationData);
      }

      throw new Error(`YACHI_REGISTRATION_FAILED: ${error.message}`);
    }
  }

  /**
   * 🔄 RETRY YACHI REGISTRATION
   */
  async retryYachiRegistration(verificationRecord, verificationData, attempt = 1) {
    if (attempt > this.yachiConfig.retryAttempts) {
      throw new Error('YACHI_REGISTRATION_MAX_RETRIES_EXCEEDED');
    }

    this.logger.warn(`Retrying Yachi registration attempt ${attempt}`, {
      verificationId: verificationRecord.id
    });

    // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));

    try {
      return await this.registerYachiProvider(verificationRecord, verificationData);
    } catch (error) {
      return await this.retryYachiRegistration(verificationRecord, verificationData, attempt + 1);
    }
  }

  /**
   * 📋 PREPARE YACHI PROVIDER DATA
   */
  async prepareYachiProviderData(verificationRecord, verificationData) {
    const student = await this.prisma.student.findUnique({
      where: { id: verificationRecord.studentId },
      include: { user: true }
    });

    const skill = await this.prisma.skill.findUnique({
      where: { id: verificationRecord.skillId }
    });

    const certificate = await this.prisma.certificate.findUnique({
      where: { id: verificationRecord.certificateId }
    });

    return {
      personalInfo: {
        fullName: student.user.fullName,
        faydaId: student.user.faydaId,
        phone: student.user.phone,
        email: student.user.email,
        dateOfBirth: student.user.dateOfBirth
      },
      certificationInfo: {
        certificateId: certificate.certificateNumber,
        skillName: skill.name,
        skillCategory: skill.category,
        issueDate: certificate.issuedAt.toISOString(),
        expirationDate: certificate.expiresAt ? certificate.expiresAt.toISOString() : null,
        finalScore: verificationRecord.finalScore,
        verificationLevel: 'MOSA_FORGE_ENTERPRISE'
      },
      serviceDetails: {
        serviceCategory: skill.category,
        serviceDescription: `Certified ${skill.name} professional from Mosa Forge`,
        hourlyRate: this.calculateRecommendedRate(skill.category, verificationRecord.finalScore),
        availability: 'FULL_TIME',
        serviceAreas: ['Ethiopia'],
        tags: [skill.name, 'MosaForge Certified', 'Yachi Verified']
      },
      platformIntegration: {
        source: 'MOSA_FORGE',
        verificationId: verificationRecord.id,
        certificateHash: certificate.securityHash,
        metadata: {
          trainingDuration: '4_MONTHS',
          handsOnTraining: 'COMPLETED',
          qualityGuarantee: 'ENABLED'
        }
      }
    };
  }

  /**
   * 💰 CALCULATE RECOMMENDED RATE
   */
  calculateRecommendedRate(category, finalScore) {
    const baseRates = {
      'online': 250,
      'offline': 200,
      'health-sports': 180,
      'beauty-fashion': 150
    };

    const baseRate = baseRates[category] || 200;
    const scoreMultiplier = finalScore >= 90 ? 1.5 : finalScore >= 80 ? 1.2 : 1.0;

    return Math.round(baseRate * scoreMultiplier);
  }

  /**
   * 📄 UPDATE CERTIFICATE WITH YACHI VERIFICATION
   */
  async updateCertificateWithYachiVerification(certificateId, yachiResponse, transaction) {
    const certificate = await transaction.certificate.update({
      where: { id: certificateId },
      data: {
        yachiVerified: true,
        yachiProviderId: yachiResponse.providerId,
        yachiVerificationUrl: yachiResponse.verificationUrl,
        qrCodeUrl: yachiResponse.qrCodeUrl,
        verificationMetadata: {
          yachiRegistration: yachiResponse.registeredAt,
          providerId: yachiResponse.providerId,
          lastVerified: new Date().toISOString()
        },
        status: 'YACHI_VERIFIED'
      }
    });

    // Generate updated digital certificate
    const updatedCertificate = await this.certificateGenerator.generateDigitalCertificate(certificate);

    this.logger.debug('Certificate updated with Yachi verification', { certificateId });

    return updatedCertificate;
  }

  /**
   * 🏢 CREATE EMPLOYER PORTAL ACCESS
   */
  async createEmployerPortalAccess(verificationRecord, yachiResponse, transaction) {
    const portalAccess = await transaction.employerPortalAccess.create({
      data: {
        studentId: verificationRecord.studentId,
        certificateId: verificationRecord.certificateId,
        yachiProviderId: yachiResponse.providerId,
        accessLevel: 'BASIC',
        verificationUrl: yachiResponse.verificationUrl,
        qrCodeUrl: yachiResponse.qrCodeUrl,
        isActive: true,
        metadata: {
          createdVia: 'AUTOMATIC_YACHI_VERIFICATION',
          verificationId: verificationRecord.id
        }
      }
    });

    // Cache employer portal data for fast access
    await this.cacheEmployerPortalData(portalAccess);

    return portalAccess;
  }

  /**
   * 📧 SEND VERIFICATION NOTIFICATIONS
   */
  async sendVerificationNotifications(verificationResult) {
    const notifications = [];

    // Student notification
    notifications.push(this.sendStudentNotification(verificationResult));

    // Admin notification for manual review cases
    if (verificationResult.status === 'UNDER_REVIEW') {
      notifications.push(this.sendAdminReviewNotification(verificationResult));
    }

    // Yachi success notification
    if (verificationResult.yachiProviderId) {
      notifications.push(this.sendYachiSuccessNotification(verificationResult));
    }

    await Promise.allSettled(notifications);
  }

  /**
   * 👨‍🎓 SEND STUDENT NOTIFICATION
   */
  async sendStudentNotification(verificationResult) {
    try {
      const student = await this.prisma.student.findUnique({
        where: { id: verificationResult.studentId },
        include: { user: true }
      });

      const message = verificationResult.status === 'APPROVED' 
        ? `🎉 Congratulations! You are now a verified Yachi provider. Your provider ID: ${verificationResult.yachiProviderId}`
        : `🔍 Your Yachi verification is under review. We'll notify you once approved.`;

      // Implement actual notification service call here
      this.logger.info('Student notification prepared', {
        studentId: verificationResult.studentId,
        message
      });

    } catch (error) {
      this.logger.error('Failed to send student notification', error);
    }
  }

  /**
   * 🔍 GENERATE CERTIFICATE SECURITY HASH
   */
  generateCertificateHash(certificate) {
    const hashData = {
      certificateNumber: certificate.certificateNumber,
      studentId: certificate.studentId,
      skillId: certificate.skillId,
      issuedAt: certificate.issuedAt.toISOString(),
      secret: process.env.CERTIFICATE_SECRET
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * 🔧 HEALTH CHECK
   */
  async healthCheck() {
    try {
      // Check database connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Check Redis connection
      await this.redis.ping();
      
      // Check Yachi API availability
      const response = await this.yachiClient.get('/health', { timeout: 5000 });
      
      return {
        status: 'HEALTHY',
        database: 'CONNECTED',
        redis: 'CONNECTED',
        yachiApi: response.status === 200 ? 'AVAILABLE' : 'DEGRADED',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        status: 'UNHEALTHY',
        database: error.message.includes('prisma') ? 'DISCONNECTED' : 'UNKNOWN',
        redis: error.message.includes('Redis') ? 'DISCONNECTED' : 'UNKNOWN',
        yachiApi: 'UNAVAILABLE',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 🔥 WARM UP CERTIFICATE CACHE
   */
  async warmUpCertificateCache() {
    try {
      const recentCertificates = await this.prisma.certificate.findMany({
        where: {
          issuedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        select: {
          id: true,
          certificateNumber: true,
          securityHash: true,
          yachiVerified: true
        }
      });

      const pipeline = this.redis.pipeline();
      recentCertificates.forEach(cert => {
        const key = `certificate:${cert.id}:verification`;
        pipeline.hset(key, {
          number: cert.certificateNumber,
          hash: cert.securityHash,
          yachiVerified: cert.yachiVerified,
          lastChecked: Date.now()
        });
        pipeline.expire(key, 86400); // 24 hours
      });

      await pipeline.exec();
      this.logger.info(`Certificate cache warmed up with ${recentCertificates.length} certificates`);
    } catch (error) {
      this.logger.error('Failed to warm up certificate cache', error);
    }
  }

  /**
   * 🗄️ CACHE EMPLOYER PORTAL DATA
   */
  async cacheEmployerPortalData(portalAccess) {
    const key = `employer:portal:${portalAccess.id}`;
    await this.redis.hset(key, {
      studentId: portalAccess.studentId,
      providerId: portalAccess.yachiProviderId,
      accessLevel: portalAccess.accessLevel,
      isActive: portalAccess.isActive,
      cachedAt: Date.now()
    });
    await this.redis.expire(key, 3600); // 1 hour
  }

  /**
   * 📊 GET VERIFICATION ANALYTICS
   */
  async getVerificationAnalytics(period = '30d') {
    const cacheKey = `analytics:yachi:verification:${period}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const analytics = await this.prisma.yachiVerification.aggregate({
      where: {
        createdAt: { gte: startDate }
      },
      _count: {
        _all: true
      },
      _avg: {
        finalScore: true,
        riskScore: true
      },
      _groupBy: {
        status: true
      }
    });

    const result = {
      totalVerifications: analytics._count._all,
      averageScore: analytics._avg.finalScore,
      averageRiskScore: analytics._avg.riskScore,
      statusBreakdown: analytics._groupBy,
      period: period,
      generatedAt: new Date().toISOString()
    };

    // Cache for 10 minutes
    await this.redis.setex(cacheKey, 600, JSON.stringify(result));

    return result;
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Yachi integration resources cleaned up');
    } catch (error) {
      this.logger.error('Error during Yachi integration cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new YachiIntegration();