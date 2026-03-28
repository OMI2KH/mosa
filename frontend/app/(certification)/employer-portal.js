// certification-service/employer-portal.js

/**
 * 🎯 ENTERPRISE EMPLOYER PORTAL
 * Production-ready employer verification and talent acquisition system
 * Features: Certificate validation, talent matching, bulk verification, analytics
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../utils/logger');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const { createHmac } = require('crypto');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');

class EmployerPortal extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('EmployerPortal');
    
    // Rate limiting for employer API calls
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (req) => `employer_limit:${req.employerId}`,
      points: 100, // 100 requests
      duration: 3600, // per hour
    });

    this.verificationCacheTTL = 3600; // 1 hour
    this.talentPoolCacheTTL = 1800; // 30 minutes
    
    this.initialize();
  }

  /**
   * Initialize employer portal
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.warmUpEmployerCache();
      this.logger.info('Employer portal initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize employer portal', error);
      throw error;
    }
  }

  /**
   * 🎯 VERIFY CERTIFICATE - Core verification system
   */
  async verifyCertificate(verificationData) {
    const startTime = performance.now();
    
    try {
      const { 
        certificateId, 
        employerId, 
        verificationCode, 
        employerSecret 
      } = verificationData;

      // 🛡️ VALIDATION PHASE
      await this.validateVerificationRequest(verificationData);

      // 🔐 EMPLOYER AUTHENTICATION
      await this.authenticateEmployer(employerId, employerSecret);

      // 💾 CERTIFICATE VERIFICATION
      const verificationResult = await this.processCertificateVerification(
        certificateId, 
        verificationCode, 
        employerId
      );

      // 📊 USAGE ANALYTICS
      await this.trackVerificationUsage(employerId, verificationResult);

      const processingTime = performance.now() - startTime;
      
      this.logger.metric('certificate_verification_time', processingTime, {
        employerId,
        certificateId,
        isValid: verificationResult.isValid
      });

      return {
        success: true,
        ...verificationResult,
        verificationTimestamp: new Date().toISOString(),
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Certificate verification failed', error, { verificationData });
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE VERIFICATION REQUEST
   */
  async validateVerificationRequest(verificationData) {
    const { certificateId, employerId, verificationCode, employerSecret } = verificationData;

    if (!certificateId || !employerId || !verificationCode || !employerSecret) {
      throw new Error('MISSING_REQUIRED_FIELDS');
    }

    // Certificate ID format validation (Mosa-CERT-XXXXX-XXXXX)
    const certificateRegex = /^MOSA-CERT-[A-Z0-9]{5}-[A-Z0-9]{5}$/;
    if (!certificateRegex.test(certificateId)) {
      throw new Error('INVALID_CERTIFICATE_FORMAT');
    }

    // Verification code format (6-digit alphanumeric)
    const codeRegex = /^[A-Z0-9]{6}$/;
    if (!codeRegex.test(verificationCode)) {
      throw new Error('INVALID_VERIFICATION_CODE_FORMAT');
    }

    // Rate limiting check
    try {
      await this.rateLimiter.conserve(`employer:${employerId}`);
    } catch (rateLimitError) {
      throw new Error('RATE_LIMIT_EXCEEDED');
    }

    this.logger.debug('Verification request validation passed', { employerId, certificateId });
  }

  /**
   * 🔐 EMPLOYER AUTHENTICATION
   */
  async authenticateEmployer(employerId, employerSecret) {
    const cacheKey = `employer:auth:${employerId}`;
    
    // Try cache first
    const cachedAuth = await this.redis.get(cacheKey);
    if (cachedAuth) {
      const authData = JSON.parse(cachedAuth);
      if (authData.status === 'ACTIVE' && this.verifyEmployerSecret(employerSecret, authData.hash)) {
        return authData;
      }
    }

    // Database authentication
    const employer = await this.prisma.employer.findUnique({
      where: { 
        id: employerId,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        secretHash: true,
        verificationTier: true,
        monthlyQuota: true,
        usedQuota: true,
        permissions: true
      }
    });

    if (!employer) {
      throw new Error('EMPLOYER_NOT_FOUND_OR_INACTIVE');
    }

    if (!this.verifyEmployerSecret(employerSecret, employer.secretHash)) {
      throw new Error('INVALID_EMPLOYER_SECRET');
    }

    // Check quota
    if (employer.usedQuota >= employer.monthlyQuota) {
      throw new Error('MONTHLY_VERIFICATION_QUOTA_EXCEEDED');
    }

    const authData = {
      id: employer.id,
      name: employer.name,
      tier: employer.verificationTier,
      permissions: employer.permissions,
      status: 'ACTIVE'
    };

    // Cache authentication for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(authData));

    return authData;
  }

  /**
   * 🔑 VERIFY EMPLOYER SECRET
   */
  verifyEmployerSecret(secret, hash) {
    const computedHash = createHmac('sha256', process.env.EMPLOYER_SECRET_KEY)
      .update(secret)
      .digest('hex');
    return computedHash === hash;
  }

  /**
   * 💾 PROCESS CERTIFICATE VERIFICATION
   */
  async processCertificateVerification(certificateId, verificationCode, employerId) {
    const cacheKey = `certificate:verification:${certificateId}`;
    
    // Try cache first
    const cachedVerification = await this.redis.get(cacheKey);
    if (cachedVerification) {
      return JSON.parse(cachedVerification);
    }

    // Database verification
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            faydaId: true,
            phone: true,
            email: true
          }
        },
        skill: {
          select: {
            id: true,
            name: true,
            category: true,
            difficulty: true
          }
        },
        expert: {
          select: {
            id: true,
            name: true,
            currentTier: true,
            qualityScore: true
          }
        }
      }
    });

    if (!certificate) {
      return {
        isValid: false,
        status: 'NOT_FOUND',
        message: 'Certificate not found in system'
      };
    }

    // Verify certificate status
    if (certificate.status !== 'ACTIVE') {
      return {
        isValid: false,
        status: certificate.status,
        message: `Certificate is ${certificate.status.toLowerCase()}`
      };
    }

    // Verify code match
    if (certificate.verificationCode !== verificationCode) {
      await this.trackFailedVerification(certificateId, employerId);
      return {
        isValid: false,
        status: 'INVALID_CODE',
        message: 'Verification code does not match'
      };
    }

    // Check expiration
    if (new Date() > certificate.expiresAt) {
      return {
        isValid: false,
        status: 'EXPIRED',
        message: 'Certificate has expired'
      };
    }

    // Build verification result
    const verificationResult = {
      isValid: true,
      status: 'VERIFIED',
      certificate: {
        id: certificate.id,
        issueDate: certificate.issuedAt,
        expirationDate: certificate.expiresAt,
        skill: certificate.skill.name,
        category: certificate.skill.category,
        level: certificate.level,
        yachiVerified: certificate.yachiVerified
      },
      student: {
        id: certificate.student.id,
        name: certificate.student.name,
        faydaId: certificate.student.faydaId,
        contact: {
          phone: this.maskContactInfo(certificate.student.phone),
          email: this.maskContactInfo(certificate.student.email)
        }
      },
      expert: {
        id: certificate.expert.id,
        name: certificate.expert.name,
        tier: certificate.expert.currentTier,
        qualityScore: certificate.expert.qualityScore
      },
      verification: {
        verifiedAt: new Date().toISOString(),
        verifiedBy: employerId,
        verificationId: this.generateVerificationId()
      }
    };

    // Cache successful verification for 1 hour
    await this.redis.setex(cacheKey, this.verificationCacheTTL, JSON.stringify(verificationResult));

    // Update employer quota
    await this.updateEmployerQuota(employerId);

    // Log successful verification
    await this.logVerificationEvent(certificateId, employerId, 'SUCCESS');

    return verificationResult;
  }

  /**
   * 🔍 BULK CERTIFICATE VERIFICATION
   */
  async bulkVerifyCertificates(bulkVerificationData) {
    const { employerId, employerSecret, certificates } = bulkVerificationData;

    if (!Array.isArray(certificates) || certificates.length > 50) {
      throw new Error('INVALID_BULK_REQUEST_MAX_50_CERTIFICATES');
    }

    // Authenticate employer
    await this.authenticateEmployer(employerId, employerSecret);

    const results = [];
    const startTime = performance.now();

    // Process certificates in parallel with concurrency control
    const concurrencyLimit = 5;
    const batches = [];
    
    for (let i = 0; i < certificates.length; i += concurrencyLimit) {
      batches.push(certificates.slice(i, i + concurrencyLimit));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(cert => 
        this.verifyCertificate({
          certificateId: cert.certificateId,
          verificationCode: cert.verificationCode,
          employerId,
          employerSecret
        }).catch(error => ({
          success: false,
          certificateId: cert.certificateId,
          error: error.message
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const processingTime = performance.now() - startTime;

    this.logger.metric('bulk_verification_processed', {
      total: certificates.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      processingTime
    }, { employerId });

    return {
      success: true,
      totalProcessed: certificates.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      processingTime: `${processingTime.toFixed(2)}ms`
    };
  }

  /**
   * 🎯 TALENT SEARCH & MATCHING
   */
  async searchTalent(searchCriteria) {
    const {
      employerId,
      employerSecret,
      skills = [],
      categories = [],
      minQualityScore = 4.0,
      location,
      availability,
      experienceLevel,
      page = 1,
      limit = 20
    } = searchCriteria;

    const startTime = performance.now();

    // Authenticate employer
    await this.authenticateEmployer(employerId, employerSecret);

    // Build cache key for search results
    const searchHash = createHmac('sha256', 'search')
      .update(JSON.stringify(searchCriteria))
      .digest('hex');
    const cacheKey = `talent:search:${employerId}:${searchHash}`;

    // Try cache first
    const cachedResults = await this.redis.get(cacheKey);
    if (cachedResults) {
      return JSON.parse(cachedResults);
    }

    // Build search query
    const whereClause = this.buildTalentSearchWhereClause(searchCriteria);

    // Execute search
    const [certificates, totalCount] = await Promise.all([
      this.prisma.certificate.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              location: true,
              availability: true,
              yachiProfile: true
            }
          },
          skill: {
            select: {
              name: true,
              category: true,
              tags: true
            }
          },
          expert: {
            select: {
              name: true,
              currentTier: true,
              qualityScore: true
            }
          }
        },
        orderBy: { issuedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.certificate.count({ where: whereClause })
    ]);

    // Format results
    const talentResults = certificates.map(cert => ({
      certificateId: cert.id,
      student: {
        id: cert.student.id,
        name: cert.student.name,
        location: cert.student.location,
        availability: cert.student.availability,
        yachiProfile: cert.student.yachiProfile
      },
      skill: {
        name: cert.skill.name,
        category: cert.skill.category,
        tags: cert.skill.tags
      },
      certification: {
        level: cert.level,
        issuedAt: cert.issuedAt,
        expiresAt: cert.expiresAt,
        yachiVerified: cert.yachiVerified
      },
      expert: {
        name: cert.expert.name,
        tier: cert.expert.currentTier,
        qualityScore: cert.expert.qualityScore
      },
      verificationCode: cert.verificationCode
    }));

    const result = {
      success: true,
      data: talentResults,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      },
      searchCriteria
    };

    // Cache search results for 30 minutes
    await this.redis.setex(cacheKey, this.talentPoolCacheTTL, JSON.stringify(result));

    const processingTime = performance.now() - startTime;
    this.logger.metric('talent_search_executed', processingTime, {
      employerId,
      resultsCount: talentResults.length,
      totalCount
    });

    return result;
  }

  /**
   * 🏗️ BUILD TALENT SEARCH WHERE CLAUSE
   */
  buildTalentSearchWhereClause(criteria) {
    const where = {
      status: 'ACTIVE',
      expiresAt: { gt: new Date() }
    };

    if (criteria.skills && criteria.skills.length > 0) {
      where.skill = {
        name: { in: criteria.skills }
      };
    }

    if (criteria.categories && criteria.categories.length > 0) {
      where.skill = {
        ...where.skill,
        category: { in: criteria.categories }
      };
    }

    if (criteria.minQualityScore) {
      where.expert = {
        qualityScore: { gte: criteria.minQualityScore }
      };
    }

    if (criteria.experienceLevel) {
      where.level = criteria.experienceLevel;
    }

    if (criteria.yachiVerified) {
      where.yachiVerified = true;
    }

    return where;
  }

  /**
   * 📊 GENERATE VERIFICATION REPORT
   */
  async generateVerificationReport(employerId, employerSecret, reportCriteria) {
    const { startDate, endDate, format = 'json' } = reportCriteria;

    // Authenticate employer
    await this.authenticateEmployer(employerId, employerSecret);

    const verifications = await this.prisma.verificationLog.findMany({
      where: {
        employerId,
        timestamp: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        certificate: {
          include: {
            skill: { select: { name: true, category: true } },
            student: { select: { name: true } }
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    const report = {
      employerId,
      period: { startDate, endDate },
      summary: {
        totalVerifications: verifications.length,
        successful: verifications.filter(v => v.status === 'SUCCESS').length,
        failed: verifications.filter(v => v.status === 'FAILED').length,
        uniqueCertificates: new Set(verifications.map(v => v.certificateId)).size,
        uniqueSkills: new Set(verifications.map(v => v.certificate.skill.name)).size
      },
      dailyBreakdown: this.calculateDailyBreakdown(verifications),
      skillBreakdown: this.calculateSkillBreakdown(verifications),
      verifications: verifications.map(v => ({
        certificateId: v.certificateId,
        studentName: v.certificate.student.name,
        skill: v.certificate.skill.name,
        category: v.certificate.skill.category,
        status: v.status,
        timestamp: v.timestamp,
        verificationId: v.verificationId
      }))
    };

    if (format === 'pdf') {
      return await this.generatePDFReport(report);
    }

    return report;
  }

  /**
   * 📈 CALCULATE DAILY BREAKDOWN
   */
  calculateDailyBreakdown(verifications) {
    const dailyMap = new Map();
    
    verifications.forEach(v => {
      const date = v.timestamp.toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { success: 0, failed: 0, total: 0 });
      }
      const dayData = dailyMap.get(date);
      dayData.total++;
      if (v.status === 'SUCCESS') dayData.success++;
      else dayData.failed++;
    });

    return Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data
    }));
  }

  /**
   * 🏷️ CALCULATE SKILL BREAKDOWN
   */
  calculateSkillBreakdown(verifications) {
    const skillMap = new Map();
    
    verifications.forEach(v => {
      const skillName = v.certificate.skill.name;
      if (!skillMap.has(skillName)) {
        skillMap.set(skillName, { success: 0, failed: 0, total: 0 });
      }
      const skillData = skillMap.get(skillName);
      skillData.total++;
      if (v.status === 'SUCCESS') skillData.success++;
      else skillData.failed++;
    });

    return Array.from(skillMap.entries()).map(([skill, data]) => ({
      skill,
      ...data,
      successRate: (data.success / data.total) * 100
    }));
  }

  /**
   * 📄 GENERATE PDF REPORT
   */
  async generatePDFReport(report) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument();
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // PDF content generation
      doc.fontSize(20).text('Mosa Forge Verification Report', 100, 100);
      doc.fontSize(12).text(`Employer: ${report.employerId}`, 100, 130);
      doc.text(`Period: ${report.period.startDate} to ${report.period.endDate}`, 100, 150);
      
      // Summary section
      doc.fontSize(16).text('Summary', 100, 180);
      doc.fontSize(12).text(`Total Verifications: ${report.summary.totalVerifications}`, 100, 200);
      doc.text(`Successful: ${report.summary.successful}`, 100, 215);
      doc.text(`Failed: ${report.summary.failed}`, 100, 230);
      
      resolve(doc);
    });
  }

  /**
   * 🔔 TRACK VERIFICATION USAGE
   */
  async trackVerificationUsage(employerId, verificationResult) {
    const usageKey = `employer:usage:${employerId}:${new Date().toISOString().split('T')[0]}`;
    await this.redis.hincrby(usageKey, 'verifications', 1);
    
    if (verificationResult.isValid) {
      await this.redis.hincrby(usageKey, 'successful', 1);
    } else {
      await this.redis.hincrby(usageKey, 'failed', 1);
    }
    
    await this.redis.expire(usageKey, 86400); // 24 hours
  }

  /**
   * 📝 LOG VERIFICATION EVENT
   */
  async logVerificationEvent(certificateId, employerId, status, errorMessage = null) {
    await this.prisma.verificationLog.create({
      data: {
        certificateId,
        employerId,
        status,
        errorMessage,
        verificationId: this.generateVerificationId(),
        timestamp: new Date()
      }
    });
  }

  /**
   * 🗃️ UPDATE EMPLOYER QUOTA
   */
  async updateEmployerQuota(employerId) {
    await this.prisma.employer.update({
      where: { id: employerId },
      data: {
        usedQuota: { increment: 1 },
        lastVerificationAt: new Date()
      }
    });

    // Invalidate cache
    await this.redis.del(`employer:auth:${employerId}`);
  }

  /**
   * 🚨 TRACK FAILED VERIFICATION
   */
  async trackFailedVerification(certificateId, employerId) {
    const failKey = `certificate:failed:${certificateId}`;
    const failCount = await this.redis.incr(failKey);
    await this.redis.expire(failKey, 3600); // 1 hour TTL

    if (failCount > 5) {
      // Flag certificate for review after multiple failed attempts
      await this.prisma.certificate.update({
        where: { id: certificateId },
        data: { status: 'UNDER_REVIEW' }
      });
      
      this.emit('certificateFlagged', { certificateId, failCount });
    }

    await this.logVerificationEvent(certificateId, employerId, 'FAILED', 'Invalid verification code');
  }

  /**
   * 🔥 WARM UP EMPLOYER CACHE
   */
  async warmUpEmployerCache() {
    try {
      const activeEmployers = await this.prisma.employer.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, verificationTier: true, permissions: true }
      });

      const pipeline = this.redis.pipeline();
      activeEmployers.forEach(employer => {
        const key = `employer:auth:${employer.id}`;
        pipeline.setex(key, 3600, JSON.stringify({
          id: employer.id,
          name: employer.name,
          tier: employer.verificationTier,
          permissions: employer.permissions,
          status: 'ACTIVE'
        }));
      });

      await pipeline.exec();
      this.logger.info(`Employer cache warmed up with ${activeEmployers.length} employers`);
    } catch (error) {
      this.logger.error('Failed to warm up employer cache', error);
    }
  }

  /**
   * 🎫 GENERATE VERIFICATION ID
   */
  generateVerificationId() {
    return `VER-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  /**
   * 🎭 MASK CONTACT INFORMATION
   */
  maskContactInfo(contact) {
    if (!contact) return null;
    return contact.replace(/(?<=.{3}).(?=.*@)/g, '*');
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Employer portal resources cleaned up');
    } catch (error) {
      this.logger.error('Error during employer portal cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new EmployerPortal();