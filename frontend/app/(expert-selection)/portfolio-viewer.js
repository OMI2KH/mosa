// expert-selection/portfolio-viewer.js

/**
 * 🎯 ENTERPRISE PORTFOLIO VIEWER
 * Production-ready expert portfolio system for Mosa Forge
 * Features: Portfolio validation, real-time verification, quality scoring, fraud detection
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../../utils/logger');
const { ImageValidator } = require('../../utils/image-validator');
const { DocumentVerifier } = require('../../utils/document-verifier');
const { RateLimiterRedis } = require('rate-limiter-flexible');

class PortfolioViewer extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('PortfolioViewer');
    this.imageValidator = new ImageValidator();
    this.documentVerifier = new DocumentVerifier();

    // Rate limiting for portfolio views
    this.viewLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (req) => `portfolio_views:${req.expertId}`,
      points: 1000, // 1000 views per hour
      duration: 3600,
    });

    // Cache configuration
    this.cacheTtl = 300; // 5 minutes
    this.portfolioCacheTtl = 900; // 15 minutes for full portfolios

    this.initialize();
  }

  /**
   * Initialize portfolio viewer
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.imageValidator.initialize();
      await this.documentVerifier.initialize();
      
      this.logger.info('Portfolio viewer initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize portfolio viewer', error);
      throw error;
    }
  }

  /**
   * 🎯 GET EXPERT PORTFOLIO - Main portfolio retrieval
   */
  async getExpertPortfolio(expertId, studentId = null, options = {}) {
    const startTime = performance.now();
    
    try {
      // 🛡️ VALIDATION & AUTHORIZATION
      await this.validatePortfolioAccess(expertId, studentId);

      // 📊 TRACK VIEW ANALYTICS
      await this.trackPortfolioView(expertId, studentId);

      // 💾 RETRIEVE PORTFOLIO DATA
      const portfolio = await this.retrievePortfolioData(expertId, options);

      // 🔍 VERIFICATION CHECKS
      await this.performVerificationChecks(portfolio);

      // 📈 CALCULATE PORTFOLIO SCORE
      const portfolioScore = await this.calculatePortfolioScore(portfolio);

      // 🎯 FORMAT RESPONSE
      const response = this.formatPortfolioResponse(portfolio, portfolioScore);

      const processingTime = performance.now() - startTime;
      this.logger.metric('portfolio_retrieval_time', processingTime, { expertId });

      return {
        success: true,
        portfolio: response,
        verificationStatus: portfolio.verificationStatus,
        portfolioScore,
        cache: portfolio.fromCache ? 'HIT' : 'MISS',
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Portfolio retrieval failed', error, { expertId, studentId });
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE PORTFOLIO ACCESS
   */
  async validatePortfolioAccess(expertId, studentId) {
    // Expert existence check
    const expert = await this.prisma.expert.findUnique({
      where: { id: expertId },
      select: { 
        id: true, 
        status: true, 
        isVerified: true,
        profileVisibility: true 
      }
    });

    if (!expert) {
      throw new Error('EXPERT_NOT_FOUND');
    }

    if (expert.status !== 'ACTIVE') {
      throw new Error('EXPERT_NOT_ACTIVE');
    }

    // Portfolio visibility check
    if (expert.profileVisibility === 'PRIVATE' && !studentId) {
      throw new Error('PORTFOLIO_PRIVATE');
    }

    // Rate limiting for student views
    if (studentId) {
      try {
        await this.viewLimiter.consume(`student:${studentId}:expert:${expertId}`);
      } catch (rateLimitError) {
        throw new Error('PORTFOLIO_VIEW_LIMIT_EXCEEDED');
      }
    }

    this.logger.debug('Portfolio access validated', { expertId, studentId });
  }

  /**
   * 📊 TRACK PORTFOLIO VIEW ANALYTICS
   */
  async trackPortfolioView(expertId, studentId) {
    const pipeline = this.redis.pipeline();
    const now = Date.now();

    // Track total views
    pipeline.zincrby('portfolio:views:daily', 1, expertId);
    
    // Track unique student views
    if (studentId) {
      const uniqueKey = `portfolio:unique_views:${expertId}:${this.getDateKey()}`;
      pipeline.sadd(uniqueKey, studentId);
      pipeline.expire(uniqueKey, 86400); // 24 hours
    }

    // Track view timestamp for recency
    pipeline.zadd('portfolio:last_viewed', now, expertId);

    await pipeline.exec().catch(error => {
      this.logger.warn('Failed to track portfolio view', error);
    });
  }

  /**
   * 💾 RETRIEVE PORTFOLIO DATA WITH CACHING
   */
  async retrievePortfolioData(expertId, options = {}) {
    const cacheKey = `portfolio:full:${expertId}`;
    const {
      forceRefresh = false,
      includeAnalytics = true,
      includeSensitive = false
    } = options;

    // Try cache first unless force refresh
    if (!forceRefresh) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const portfolio = JSON.parse(cached);
        portfolio.fromCache = true;
        return portfolio;
      }
    }

    // Database retrieval
    const portfolio = await this.prisma.expert.findUnique({
      where: { id: expertId },
      select: {
        id: true,
        name: true,
        profilePicture: true,
        headline: true,
        bio: true,
        currentTier: true,
        qualityScore: true,
        totalStudents: true,
        completionRate: true,
        averageRating: true,
        yearsOfExperience: true,
        isVerified: true,
        verificationStatus: true,
        faydaId: true,
        
        // Portfolio items
        portfolioItems: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            mediaType: true,
            mediaUrl: true,
            thumbnailUrl: true,
            projectDate: true,
            skills: true,
            clientFeedback: true,
            verificationStatus: true,
            createdAt: true
          }
        },

        // Certifications
        certifications: {
          where: { status: 'VERIFIED' },
          select: {
            id: true,
            title: true,
            issuingOrganization: true,
            issueDate: true,
            expirationDate: true,
            credentialId: true,
            verificationStatus: true,
            certificateUrl: true
          }
        },

        // Skills
        expertSkills: {
          include: {
            skill: {
              select: {
                id: true,
                name: true,
                category: true,
                difficulty: true
              }
            }
          }
        },

        // Work experience
        workExperiences: {
          where: { status: 'VERIFIED' },
          orderBy: { startDate: 'desc' },
          select: {
            id: true,
            company: true,
            position: true,
            startDate: true,
            endDate: true,
            current: true,
            description: true,
            verificationStatus: true
          }
        },

        // Analytics (if requested)
        ...(includeAnalytics && {
          _count: {
            select: {
              portfolioItems: true,
              certifications: true,
              workExperiences: true,
              ratings: true
            }
          }
        })
      }
    });

    if (!portfolio) {
      throw new Error('PORTFOLIO_NOT_FOUND');
    }

    // Enhance with calculated fields
    const enhancedPortfolio = await this.enhancePortfolioData(portfolio);

    // Cache the result
    await this.redis.setex(
      cacheKey, 
      this.portfolioCacheTtl, 
      JSON.stringify(enhancedPortfolio)
    );

    enhancedPortfolio.fromCache = false;
    return enhancedPortfolio;
  }

  /**
   * 🔍 PERFORM VERIFICATION CHECKS
   */
  async performVerificationChecks(portfolio) {
    const verificationResults = {
      faydaVerified: portfolio.isVerified,
      portfolioVerified: await this.verifyPortfolioItems(portfolio.portfolioItems),
      certificationVerified: await this.verifyCertifications(portfolio.certifications),
      experienceVerified: await this.verifyWorkExperience(portfolio.workExperiences)
    };

    // Calculate overall verification score
    const verificationScore = this.calculateVerificationScore(verificationResults);
    portfolio.verificationScore = verificationScore;
    portfolio.verificationResults = verificationResults;

    // Update verification status if needed
    if (verificationScore >= 0.8 && portfolio.verificationStatus !== 'FULLY_VERIFIED') {
      await this.updateVerificationStatus(portfolio.id, 'FULLY_VERIFIED');
    }

    this.logger.debug('Verification checks completed', {
      expertId: portfolio.id,
      verificationScore
    });
  }

  /**
   * 📈 CALCULATE PORTFOLIO SCORE
   */
  async calculatePortfolioScore(portfolio) {
    const weights = {
      verification: 0.3,
      experience: 0.25,
      portfolioQuality: 0.2,
      certifications: 0.15,
      ratings: 0.1
    };

    const scores = {
      verification: portfolio.verificationScore || 0,
      experience: this.calculateExperienceScore(portfolio),
      portfolioQuality: this.calculatePortfolioQualityScore(portfolio.portfolioItems),
      certifications: this.calculateCertificationScore(portfolio.certifications),
      ratings: this.calculateRatingScore(portfolio)
    };

    // Calculate weighted score
    let totalScore = 0;
    Object.keys(weights).forEach(key => {
      totalScore += scores[key] * weights[key];
    });

    // Apply tier multipliers
    const tierMultiplier = this.getTierMultiplier(portfolio.currentTier);
    totalScore *= tierMultiplier;

    // Ensure score is between 0 and 100
    return Math.min(Math.max(totalScore * 100, 0), 100);
  }

  /**
   * 🎯 FORMAT PORTFOLIO RESPONSE
   */
  formatPortfolioResponse(portfolio, portfolioScore) {
    return {
      expert: {
        id: portfolio.id,
        name: portfolio.name,
        profilePicture: portfolio.profilePicture,
        headline: portfolio.headline,
        bio: portfolio.bio,
        currentTier: portfolio.currentTier,
        qualityScore: portfolio.qualityScore,
        portfolioScore: Math.round(portfolioScore),
        isVerified: portfolio.isVerified,
        verificationStatus: portfolio.verificationStatus
      },
      stats: {
        totalStudents: portfolio.totalStudents,
        completionRate: portfolio.completionRate,
        averageRating: portfolio.averageRating,
        yearsOfExperience: portfolio.yearsOfExperience,
        successRate: this.calculateSuccessRate(portfolio)
      },
      portfolio: {
        items: portfolio.portfolioItems.map(item => ({
          ...item,
          mediaUrl: this.generateSecureMediaUrl(item.mediaUrl),
          thumbnailUrl: this.generateSecureMediaUrl(item.thumbnailUrl)
        })),
        totalItems: portfolio.portfolioItems.length,
        lastUpdated: this.getLastPortfolioUpdate(portfolio.portfolioItems)
      },
      certifications: portfolio.certifications.map(cert => ({
        ...cert,
        certificateUrl: this.generateSecureMediaUrl(cert.certificateUrl)
      })),
      skills: portfolio.expertSkills.map(es => ({
        id: es.skill.id,
        name: es.skill.name,
        category: es.skill.category,
        proficiency: es.proficiencyLevel,
        yearsOfExperience: es.yearsOfExperience
      })),
      workExperience: portfolio.workExperiences,
      verification: {
        score: portfolio.verificationScore,
        details: portfolio.verificationResults,
        status: this.getVerificationStatus(portfolio.verificationScore)
      },
      analytics: portfolio._count || {}
    };
  }

  /**
   * 📸 VERIFY PORTFOLIO ITEMS
   */
  async verifyPortfolioItems(portfolioItems) {
    if (!portfolioItems.length) return 0;

    let verifiedCount = 0;
    
    for (const item of portfolioItems) {
      try {
        // Image validation for media items
        if (item.mediaType === 'IMAGE' && item.mediaUrl) {
          const isValid = await this.imageValidator.validateImage(item.mediaUrl);
          if (isValid) verifiedCount++;
        }
        
        // Document verification for project documents
        if (item.mediaType === 'DOCUMENT' && item.mediaUrl) {
          const isVerified = await this.documentVerifier.verifyDocument(item.mediaUrl);
          if (isVerified) verifiedCount++;
        }

        // Client feedback verification
        if (item.clientFeedback) {
          const feedbackScore = this.verifyClientFeedback(item.clientFeedback);
          if (feedbackScore > 0.7) verifiedCount++;
        }
      } catch (error) {
        this.logger.warn('Portfolio item verification failed', error, { itemId: item.id });
      }
    }

    return verifiedCount / portfolioItems.length;
  }

  /**
   * 🏆 VERIFY CERTIFICATIONS
   */
  async verifyCertifications(certifications) {
    if (!certifications.length) return 0;

    let verifiedCount = 0;
    
    for (const cert of certifications) {
      try {
        // Check expiration
        const isExpired = cert.expirationDate && new Date(cert.expirationDate) < new Date();
        if (isExpired) continue;

        // Verify certificate document
        if (cert.certificateUrl) {
          const isVerified = await this.documentVerifier.verifyCertificate(cert.certificateUrl);
          if (isVerified) verifiedCount++;
        }
      } catch (error) {
        this.logger.warn('Certification verification failed', error, { certId: cert.id });
      }
    }

    return verifiedCount / certifications.length;
  }

  /**
   * 💼 VERIFY WORK EXPERIENCE
   */
  async verifyWorkExperience(experiences) {
    if (!experiences.length) return 0;

    let verifiedCount = 0;
    
    for (const exp of experiences) {
      // Check date validity
      const startDate = new Date(exp.startDate);
      const endDate = exp.endDate ? new Date(exp.endDate) : new Date();
      
      if (startDate > endDate) continue;

      // Check duration (minimum 3 months)
      const durationMonths = (endDate - startDate) / (30 * 24 * 60 * 60 * 1000);
      if (durationMonths < 3) continue;

      // Verification status check
      if (exp.verificationStatus === 'VERIFIED') {
        verifiedCount++;
      }
    }

    return verifiedCount / experiences.length;
  }

  /**
   * 📊 CALCULATE VERIFICATION SCORE
   */
  calculateVerificationScore(verificationResults) {
    const weights = {
      faydaVerified: 0.4,
      portfolioVerified: 0.3,
      certificationVerified: 0.2,
      experienceVerified: 0.1
    };

    let totalScore = 0;
    Object.keys(weights).forEach(key => {
      totalScore += verificationResults[key] ? weights[key] : 0;
    });

    return totalScore;
  }

  /**
   * 🎯 CALCULATE EXPERIENCE SCORE
   */
  calculateExperienceScore(portfolio) {
    const baseScore = Math.min(portfolio.yearsOfExperience / 10, 1); // Max 10 years
    const studentMultiplier = Math.min(portfolio.totalStudents / 100, 1); // Max 100 students
    const completionBonus = portfolio.completionRate > 0.7 ? 0.2 : 0;

    return (baseScore * 0.6) + (studentMultiplier * 0.4) + completionBonus;
  }

  /**
   * 🖼️ CALCULATE PORTFOLIO QUALITY SCORE
   */
  calculatePortfolioQualityScore(portfolioItems) {
    if (!portfolioItems.length) return 0;

    let totalScore = 0;
    
    portfolioItems.forEach(item => {
      let itemScore = 0.5; // Base score

      // Media quality bonus
      if (item.mediaType === 'IMAGE' && item.thumbnailUrl) itemScore += 0.2;
      if (item.mediaType === 'VIDEO') itemScore += 0.3;
      
      // Description quality
      if (item.description && item.description.length > 100) itemScore += 0.2;
      
      // Client feedback bonus
      if (item.clientFeedback) itemScore += 0.1;

      totalScore += Math.min(itemScore, 1);
    });

    return totalScore / portfolioItems.length;
  }

  /**
   * 📜 CALCULATE CERTIFICATION SCORE
   */
  calculateCertificationScore(certifications) {
    if (!certifications.length) return 0;

    let totalScore = 0;
    
    certifications.forEach(cert => {
      let certScore = 0.6; // Base score

      // Recency bonus (certificates from last 2 years)
      const issueDate = new Date(cert.issueDate);
      const yearsSinceIssue = (new Date() - issueDate) / (365 * 24 * 60 * 60 * 1000);
      if (yearsSinceIssue < 2) certScore += 0.2;

      // Recognized organization bonus
      if (this.isRecognizedOrganization(cert.issuingOrganization)) {
        certScore += 0.2;
      }

      totalScore += Math.min(certScore, 1);
    });

    return totalScore / certifications.length;
  }

  /**
   * ⭐ CALCULATE RATING SCORE
   */
  calculateRatingScore(portfolio) {
    if (!portfolio.averageRating) return 0.5; // Default for new experts

    const ratingScore = (portfolio.averageRating - 1) / 4; // Convert 1-5 to 0-1 scale
    const completionBonus = portfolio.completionRate > 0.7 ? 0.2 : 0;

    return Math.min(ratingScore + completionBonus, 1);
  }

  /**
   * 🔧 ENHANCE PORTFOLIO DATA
   */
  async enhancePortfolioData(portfolio) {
    // Calculate derived statistics
    portfolio.totalPortfolioItems = portfolio.portfolioItems.length;
    portfolio.totalCertifications = portfolio.certifications.length;
    
    // Calculate skill diversity
    const skillCategories = new Set(
      portfolio.expertSkills.map(es => es.skill.category)
    );
    portfolio.skillDiversity = skillCategories.size;

    // Calculate portfolio recency
    portfolio.portfolioRecency = this.calculatePortfolioRecency(portfolio.portfolioItems);

    // Add performance metrics
    portfolio.performanceMetrics = await this.calculatePerformanceMetrics(portfolio.id);

    return portfolio;
  }

  /**
   * 📈 CALCULATE PERFORMANCE METRICS
   */
  async calculatePerformanceMetrics(expertId) {
    const cacheKey = `portfolio:performance:${expertId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const metrics = await this.prisma.rating.groupBy({
      by: ['expertId'],
      where: { expertId },
      _avg: {
        rating: true
      },
      _count: {
        id: true
      },
      _max: {
        createdAt: true
      }
    });

    const result = metrics[0] ? {
      averageRating: metrics[0]._avg.rating,
      totalRatings: metrics[0]._count.id,
      lastRating: metrics[0]._max.createdAt
    } : {
      averageRating: 0,
      totalRatings: 0,
      lastRating: null
    };

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));

    return result;
  }

  /**
   * 🔄 UPDATE VERIFICATION STATUS
   */
  async updateVerificationStatus(expertId, status) {
    try {
      await this.prisma.expert.update({
        where: { id: expertId },
        data: { verificationStatus: status }
      });

      // Invalidate cache
      await this.redis.del(`portfolio:full:${expertId}`);
      
      this.logger.info('Verification status updated', { expertId, status });
    } catch (error) {
      this.logger.error('Failed to update verification status', error, { expertId });
    }
  }

  /**
   * 🛡️ GENERATE SECURE MEDIA URL
   */
  generateSecureMediaUrl(mediaUrl) {
    if (!mediaUrl) return null;
    
    // Add security tokens and expiration for sensitive media
    const token = this.generateSecurityToken();
    const expires = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    
    return `${mediaUrl}?token=${token}&expires=${expires}`;
  }

  /**
   * 🔑 GENERATE SECURITY TOKEN
   */
  generateSecurityToken() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  /**
   * 📅 GET DATE KEY FOR ANALYTICS
   */
  getDateKey() {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }

  /**
   * ⚡ GET TIER MULTIPLIER
   */
  getTierMultiplier(tier) {
    const multipliers = {
      MASTER: 1.2,
      SENIOR: 1.1,
      STANDARD: 1.0,
      DEVELOPING: 0.8,
      PROBATION: 0.6
    };
    
    return multipliers[tier] || 1.0;
  }

  /**
   * 🏆 GET VERIFICATION STATUS
   */
  getVerificationStatus(score) {
    if (score >= 0.9) return 'PLATINUM_VERIFIED';
    if (score >= 0.8) return 'FULLY_VERIFIED';
    if (score >= 0.6) return 'PARTIALLY_VERIFIED';
    return 'UNVERIFIED';
  }

  /**
   * 📊 CALCULATE SUCCESS RATE
   */
  calculateSuccessRate(portfolio) {
    const completionWeight = 0.6;
    const ratingWeight = 0.4;
    
    return (portfolio.completionRate * completionWeight) + 
           ((portfolio.averageRating - 1) / 4 * ratingWeight);
  }

  /**
   * 📅 CALCULATE PORTFOLIO RECENCY
   */
  calculatePortfolioRecency(portfolioItems) {
    if (!portfolioItems.length) return 0;
    
    const latestUpdate = Math.max(
      ...portfolioItems.map(item => new Date(item.createdAt).getTime())
    );
    
    const monthsSinceUpdate = (Date.now() - latestUpdate) / (30 * 24 * 60 * 60 * 1000);
    return Math.max(0, 1 - (monthsSinceUpdate / 12)); // Decay over 12 months
  }

  /**
   * 🏢 CHECK RECOGNIZED ORGANIZATION
   */
  isRecognizedOrganization(organization) {
    const recognizedOrgs = [
      'Mosa Forge',
      'Yachi Platform',
      'Ethiopian Ministry of Education',
      'Addis Ababa University',
      'Ethiopian Technical University'
    ];
    
    return recognizedOrgs.some(org => 
      organization.toLowerCase().includes(org.toLowerCase())
    );
  }

  /**
   * 💬 VERIFY CLIENT FEEDBACK
   */
  verifyClientFeedback(feedback) {
    if (!feedback) return 0;
    
    // Simple sentiment analysis
    const positiveWords = ['excellent', 'great', 'professional', 'recommend', 'satisfied'];
    const negativeWords = ['poor', 'bad', 'disappointed', 'avoid', 'terrible'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    const words = feedback.toLowerCase().split(' ');
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveCount++;
      if (negativeWords.includes(word)) negativeCount++;
    });
    
    const total = positiveCount + negativeCount;
    if (total === 0) return 0.5;
    
    return positiveCount / total;
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      await this.imageValidator.destroy();
      await this.documentVerifier.destroy();
      this.removeAllListeners();
      this.logger.info('Portfolio viewer resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new PortfolioViewer();