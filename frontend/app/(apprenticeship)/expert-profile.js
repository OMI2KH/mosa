// (apprenticeship)/expert-profile.js

/**
 * 🎯 ENTERPRISE EXPERT PROFILE MANAGEMENT
 * Production-ready expert profile system for Mosa Forge
 * Features: Portfolio verification, tier management, quality metrics, capacity tracking
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../../utils/logger');
const { DocumentVerifier } = require('../../utils/document-verifier');
const { QualityMetricsCalculator } = require('../../utils/quality-metrics-calculator');
const { CapacityOptimizer } = require('../../utils/capacity-optimizer');

class ExpertProfileSystem extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('ExpertProfileSystem');
    this.documentVerifier = new DocumentVerifier();
    this.qualityCalculator = new QualityMetricsCalculator();
    this.capacityOptimizer = new CapacityOptimizer();

    this.initialize();
  }

  /**
   * Initialize expert profile system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.warmUpExpertCache();
      this.logger.info('Expert profile system initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize expert profile system', error);
      throw error;
    }
  }

  /**
   * 🎯 CREATE EXPERT PROFILE - Complete expert onboarding
   */
  async createExpertProfile(profileData) {
    const startTime = performance.now();

    try {
      // 🛡️ VALIDATION PHASE
      await this.validateExpertProfileData(profileData);

      // 🔍 FAYDA ID VERIFICATION
      const faydaVerification = await this.verifyFaydaIdentity(profileData.faydaId, profileData.userId);

      // 📄 DOCUMENT VERIFICATION
      const documentVerification = await this.verifyExpertDocuments(profileData.documents);

      // 💼 SKILL VALIDATION
      const skillValidation = await this.validateExpertSkills(profileData.skills, profileData.certifications);

      // 💾 PROFILE CREATION TRANSACTION
      const expertProfile = await this.createExpertTransaction(
        profileData,
        faydaVerification,
        documentVerification,
        skillValidation
      );

      // 📊 INITIAL QUALITY METRICS
      await this.initializeQualityMetrics(expertProfile.id);

      // 🔔 ONBOARDING COMPLETION
      this.emit('expertOnboarded', expertProfile);

      const processingTime = performance.now() - startTime;
      this.logger.metric('expert_profile_creation_time', processingTime, {
        expertId: expertProfile.id,
        userId: profileData.userId
      });

      return {
        success: true,
        expertId: expertProfile.id,
        status: expertProfile.status,
        tier: expertProfile.currentTier,
        qualityScore: expertProfile.qualityScore,
        nextSteps: this.getOnboardingNextSteps(expertProfile.status),
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Expert profile creation failed', error, { userId: profileData.userId });
      throw error;
    }
  }

  /**
   * 🛡️ COMPREHENSIVE PROFILE VALIDATION
   */
  async validateExpertProfileData(profileData) {
    const {
      userId,
      faydaId,
      skills,
      experience,
      documents,
      certifications,
      portfolio
    } = profileData;

    // Required fields validation
    if (!userId || !faydaId || !skills || !documents) {
      throw new Error('MISSING_REQUIRED_PROFILE_FIELDS');
    }

    // Fayda ID format validation
    if (!this.validateFaydaIdFormat(faydaId)) {
      throw new Error('INVALID_FAYDA_ID_FORMAT');
    }

    // Skills validation
    if (!Array.isArray(skills) || skills.length === 0) {
      throw new Error('MINIMUM_ONE_SKILL_REQUIRED');
    }

    if (skills.length > 5) {
      throw new Error('MAXIMUM_FIVE_SKILLS_ALLOWED');
    }

    // Experience validation
    if (experience && experience < 0) {
      throw new Error('INVALID_EXPERIENCE_VALUE');
    }

    // Documents validation
    if (!Array.isArray(documents) || documents.length < 2) {
      throw new Error('MINIMUM_TWO_DOCUMENTS_REQUIRED');
    }

    // Portfolio validation
    if (portfolio && (!Array.isArray(portfolio.items) || portfolio.items.length === 0)) {
      throw new Error('INVALID_PORTFOLIO_DATA');
    }

    // Check for duplicate expert profile
    const existingProfile = await this.prisma.expert.findFirst({
      where: {
        OR: [
          { userId },
          { faydaId }
        ]
      }
    });

    if (existingProfile) {
      throw new Error('DUPLICATE_EXPERT_PROFILE');
    }

    this.logger.debug('Expert profile validation passed', { userId, faydaId });
  }

  /**
   * 🔍 FAYDA ID VERIFICATION
   */
  async verifyFaydaIdentity(faydaId, userId) {
    try {
      // Government API integration for Fayda ID verification
      const verificationResult = await this.documentVerifier.verifyFaydaId(faydaId);

      if (!verificationResult.valid) {
        throw new Error('FAYDA_ID_VERIFICATION_FAILED');
      }

      // Check for duplicate Fayda ID across platform
      const duplicateCheck = await this.prisma.user.findFirst({
        where: {
          faydaId,
          id: { not: userId }
        }
      });

      if (duplicateCheck) {
        throw new Error('FAYDA_ID_ALREADY_REGISTERED');
      }

      return {
        verified: true,
        verificationId: verificationResult.verificationId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Fayda ID verification failed', error, { faydaId, userId });
      throw error;
    }
  }

  /**
   * 📄 EXPERT DOCUMENT VERIFICATION
   */
  async verifyExpertDocuments(documents) {
    const verificationResults = [];
    const requiredDocuments = ['identification', 'certification'];

    try {
      for (const doc of documents) {
        const verification = await this.documentVerifier.verifyDocument(doc);
        
        verificationResults.push({
          type: doc.type,
          status: verification.status,
          verifiedAt: new Date().toISOString(),
          metadata: verification.metadata
        });

        // If any required document fails, throw error
        if (requiredDocuments.includes(doc.type) && verification.status !== 'VERIFIED') {
          throw new Error(`DOCUMENT_VERIFICATION_FAILED_${doc.type.toUpperCase()}`);
        }
      }

      return {
        overallStatus: verificationResults.every(r => r.status === 'VERIFIED') ? 'VERIFIED' : 'PENDING',
        documents: verificationResults
      };

    } catch (error) {
      this.logger.error('Document verification failed', error, { documents });
      throw error;
    }
  }

  /**
   * 💼 EXPERT SKILLS VALIDATION
   */
  async validateExpertSkills(skills, certifications) {
    const validatedSkills = [];

    try {
      for (const skill of skills) {
        // Validate skill exists in catalog
        const skillConfig = await this.prisma.skill.findUnique({
          where: { id: skill.skillId }
        });

        if (!skillConfig) {
          throw new Error(`INVALID_SKILL_ID: ${skill.skillId}`);
        }

        // Validate skill level
        if (!this.isValidSkillLevel(skill.level)) {
          throw new Error(`INVALID_SKILL_LEVEL: ${skill.level}`);
        }

        // Validate certifications for skill if provided
        if (certifications) {
          const skillCerts = certifications.filter(cert => cert.skillId === skill.skillId);
          await this.validateSkillCertifications(skill.skillId, skillCerts);
        }

        validatedSkills.push({
          skillId: skill.skillId,
          name: skillConfig.name,
          level: skill.level,
          experienceYears: skill.experienceYears || 0,
          hourlyRate: skill.hourlyRate || skillConfig.defaultRate
        });
      }

      return validatedSkills;

    } catch (error) {
      this.logger.error('Skill validation failed', error, { skills });
      throw error;
    }
  }

  /**
   * 💾 EXPERT PROFILE CREATION TRANSACTION
   */
  async createExpertTransaction(profileData, faydaVerification, documentVerification, skillValidation) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create expert profile
      const expertProfile = await tx.expert.create({
        data: {
          userId: profileData.userId,
          faydaId: profileData.faydaId,
          status: documentVerification.overallStatus === 'VERIFIED' ? 'ACTIVE' : 'PENDING_VERIFICATION',
          currentTier: 'STANDARD',
          qualityScore: 4.0, // Initial quality score
          experienceYears: profileData.experience || 0,
          bio: profileData.bio,
          specialization: profileData.specialization,
          
          // Verification data
          verification: {
            fayda: faydaVerification,
            documents: documentVerification,
            verifiedAt: documentVerification.overallStatus === 'VERIFIED' ? new Date() : null
          },

          // Skills data
          skills: skillValidation,

          // Portfolio data
          portfolio: profileData.portfolio || {
            items: [],
            totalProjects: 0,
            showcaseProjects: []
          },

          // Capacity settings
          capacity: {
            maxStudents: 25, // Initial capacity for STANDARD tier
            currentStudents: 0,
            availableSlots: 25
          },

          // Financial settings
          earnings: {
            baseRate: 999,
            totalEarned: 0,
            pendingPayouts: 0,
            nextPayoutDate: null
          },

          // Metadata
          metadata: {
            onboardingCompleted: false,
            trainingCompleted: false,
            profileCompleteness: this.calculateProfileCompleteness(profileData),
            lastActive: new Date().toISOString()
          }
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          }
        }
      });

      // 2. Create initial quality metrics
      await tx.qualityMetrics.create({
        data: {
          expertId: expertProfile.id,
          overallScore: 4.0,
          completionRate: 0,
          studentSatisfaction: 0,
          responseTime: 0,
          sessionQuality: 0,
          metricsBreakdown: {
            technicalSkills: 4.0,
            communication: 4.0,
            professionalism: 4.0,
            punctuality: 4.0
          },
          historicalData: []
        }
      });

      // 3. Update user role to expert
      await tx.user.update({
        where: { id: profileData.userId },
        data: { 
          role: 'EXPERT',
          expertId: expertProfile.id
        }
      });

      // 4. Cache expert profile
      await this.cacheExpertProfile(expertProfile);

      return expertProfile;
    }, {
      maxWait: 10000,
      timeout: 30000
    });
  }

  /**
   * 📊 INITIALIZE QUALITY METRICS
   */
  async initializeQualityMetrics(expertId) {
    try {
      const initialMetrics = {
        expertId,
        overallScore: 4.0,
        ratingCount: 0,
        completionRate: 0,
        averageRating: 0,
        responseTime: 0,
        studentSatisfaction: 0,
        sessionQuality: 0,
        tier: 'STANDARD',
        lastCalculated: new Date()
      };

      await this.redis.hset(
        `expert:quality:${expertId}`,
        initialMetrics
      );

      await this.redis.expire(`expert:quality:${expertId}`, 86400); // 24 hours

      this.logger.debug('Quality metrics initialized', { expertId });
    } catch (error) {
      this.logger.error('Failed to initialize quality metrics', error, { expertId });
    }
  }

  /**
   * 🎯 GET EXPERT PROFILE - Comprehensive profile retrieval
   */
  async getExpertProfile(expertId, options = {}) {
    const {
      includeMetrics = true,
      includePortfolio = true,
      includeReviews = false,
      includeCapacity = true
    } = options;

    try {
      // Try cache first
      const cachedProfile = await this.getCachedExpertProfile(expertId);
      if (cachedProfile && !options.forceRefresh) {
        return cachedProfile;
      }

      // Database retrieval
      const expertProfile = await this.prisma.expert.findUnique({
        where: { id: expertId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
              phone: true,
              profilePicture: true,
              joinedAt: true
            }
          },
          qualityMetrics: includeMetrics,
          portfolio: includePortfolio,
          reviews: includeReviews ? {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              student: {
                select: { name: true, profilePicture: true }
              }
            }
          } : false
        }
      });

      if (!expertProfile) {
        throw new Error('EXPERT_PROFILE_NOT_FOUND');
      }

      // Enhance with real-time data
      const enhancedProfile = await this.enhanceExpertProfile(expertProfile, options);

      // Cache the enhanced profile
      await this.cacheExpertProfile(enhancedProfile);

      return enhancedProfile;

    } catch (error) {
      this.logger.error('Failed to get expert profile', error, { expertId });
      throw error;
    }
  }

  /**
   * 📈 ENHANCE EXPERT PROFILE WITH REAL-TIME DATA
   */
  async enhanceExpertProfile(profile, options) {
    const enhancements = {};

    // Real-time quality metrics
    if (options.includeMetrics) {
      enhancements.realTimeMetrics = await this.getRealTimeQualityMetrics(profile.id);
    }

    // Capacity information
    if (options.includeCapacity) {
      enhancements.capacity = await this.calculateCurrentCapacity(profile.id);
    }

    // Performance statistics
    enhancements.performanceStats = await this.calculatePerformanceStats(profile.id);

    // Tier progression
    enhancements.tierProgression = await this.calculateTierProgression(profile.id);

    return {
      ...profile,
      ...enhancements
    };
  }

  /**
   * 🔄 UPDATE EXPERT PROFILE
   */
  async updateExpertProfile(expertId, updateData) {
    const startTime = performance.now();

    try {
      // Validate update data
      await this.validateProfileUpdate(expertId, updateData);

      // Process update transaction
      const updatedProfile = await this.prisma.$transaction(async (tx) => {
        const updatePayload = this.buildUpdatePayload(updateData);

        const updatedExpert = await tx.expert.update({
          where: { id: expertId },
          data: updatePayload,
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true
              }
            }
          }
        });

        // Update cache
        await this.cacheExpertProfile(updatedExpert);

        // Recalculate profile completeness
        await this.updateProfileCompleteness(expertId);

        return updatedExpert;
      });

      // Emit profile updated event
      this.emit('expertProfileUpdated', {
        expertId,
        updatedFields: Object.keys(updateData),
        timestamp: new Date().toISOString()
      });

      const processingTime = performance.now() - startTime;
      this.logger.metric('expert_profile_update_time', processingTime, { expertId });

      return {
        success: true,
        expertId: updatedProfile.id,
        updatedFields: Object.keys(updateData),
        profileCompleteness: updatedProfile.metadata.profileCompleteness,
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Expert profile update failed', error, { expertId });
      throw error;
    }
  }

  /**
   * 📊 GET EXPERT DASHBOARD DATA
   */
  async getExpertDashboard(expertId) {
    try {
      const [
        profile,
        realTimeMetrics,
        financialData,
        upcomingSessions,
        studentRoster,
        qualityTrends
      ] = await Promise.all([
        this.getExpertProfile(expertId, { includeMetrics: true, includeCapacity: true }),
        this.getRealTimeQualityMetrics(expertId),
        this.getFinancialData(expertId),
        this.getUpcomingSessions(expertId),
        this.getStudentRoster(expertId),
        this.getQualityTrends(expertId)
      ]);

      return {
        profileOverview: {
          name: profile.user.name,
          tier: profile.currentTier,
          qualityScore: profile.qualityScore,
          status: profile.status,
          joinedDate: profile.user.joinedAt
        },
        performance: {
          metrics: realTimeMetrics,
          trends: qualityTrends,
          tierProgression: profile.tierProgression
        },
        financial: financialData,
        operations: {
          capacity: profile.capacity,
          upcomingSessions,
          studentRoster: studentRoster.slice(0, 5), // Recent 5 students
          pendingTasks: await this.getPendingTasks(expertId)
        },
        quickActions: this.getDashboardQuickActions(profile)
      };

    } catch (error) {
      this.logger.error('Failed to get expert dashboard', error, { expertId });
      throw error;
    }
  }

  /**
   * 💰 GET FINANCIAL DATA
   */
  async getFinancialData(expertId) {
    try {
      const earnings = await this.prisma.payment.aggregate({
        where: {
          expertId,
          status: 'COMPLETED'
        },
        _sum: {
          amount: true
        },
        _count: {
          id: true
        }
      });

      const pendingPayouts = await this.prisma.payment.aggregate({
        where: {
          expertId,
          status: 'PENDING'
        },
        _sum: {
          amount: true
        }
      });

      const upcomingPayouts = await this.prisma.payment.aggregate({
        where: {
          expertId,
          status: 'SCHEDULED',
          scheduledAt: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
          }
        },
        _sum: {
          amount: true
        }
      });

      return {
        totalEarned: earnings._sum.amount || 0,
        totalTransactions: earnings._count.id || 0,
        pendingPayouts: pendingPayouts._sum.amount || 0,
        upcomingPayouts: upcomingPayouts._sum.amount || 0,
        nextPayoutDate: await this.getNextPayoutDate(expertId)
      };

    } catch (error) {
      this.logger.error('Failed to get financial data', error, { expertId });
      return {
        totalEarned: 0,
        totalTransactions: 0,
        pendingPayouts: 0,
        upcomingPayouts: 0,
        nextPayoutDate: null
      };
    }
  }

  /**
   * 🎯 CALCULATE TIER PROGRESSION
   */
  async calculateTierProgression(expertId) {
    try {
      const currentTier = await this.prisma.expert.findUnique({
        where: { id: expertId },
        select: { currentTier: true, qualityScore: true }
      });

      const tierRequirements = {
        MASTER: { minScore: 4.7, minRatings: 50, completionRate: 0.8 },
        SENIOR: { minScore: 4.3, minRatings: 25, completionRate: 0.75 },
        STANDARD: { minScore: 4.0, minRatings: 10, completionRate: 0.7 }
      };

      const currentMetrics = await this.getRealTimeQualityMetrics(expertId);

      const progression = {};
      for (const [tier, requirements] of Object.entries(tierRequirements)) {
        progression[tier] = {
          met: currentMetrics.overallScore >= requirements.minScore &&
               currentMetrics.ratingCount >= requirements.minRatings &&
               currentMetrics.completionRate >= requirements.completionRate,
          requirements,
          current: currentMetrics
        };
      }

      return progression;

    } catch (error) {
      this.logger.error('Failed to calculate tier progression', error, { expertId });
      return {};
    }
  }

  /**
   * 🔧 UTILITY METHODS
   */

  validateFaydaIdFormat(faydaId) {
    // Ethiopian Fayda ID validation logic
    const faydaRegex = /^[A-Z0-9]{10,15}$/;
    return faydaRegex.test(faydaId);
  }

  isValidSkillLevel(level) {
    const validLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
    return validLevels.includes(level);
  }

  calculateProfileCompleteness(profileData) {
    let completeness = 0;
    const fields = [
      'bio', 'skills', 'documents', 'portfolio', 'experience', 'specialization'
    ];

    fields.forEach(field => {
      if (profileData[field] && (
        Array.isArray(profileData[field]) ? profileData[field].length > 0 : 
        typeof profileData[field] === 'object' ? Object.keys(profileData[field]).length > 0 :
        Boolean(profileData[field])
      )) {
        completeness += 100 / fields.length;
      }
    });

    return Math.round(completeness);
  }

  async getCachedExpertProfile(expertId) {
    try {
      const cached = await this.redis.get(`expert:profile:${expertId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  async cacheExpertProfile(profile) {
    try {
      await this.redis.setex(
        `expert:profile:${profile.id}`,
        3600, // 1 hour cache
        JSON.stringify(profile)
      );
    } catch (error) {
      this.logger.warn('Failed to cache expert profile', error, { expertId: profile.id });
    }
  }

  async warmUpExpertCache() {
    try {
      const activeExperts = await this.prisma.expert.findMany({
        where: { status: 'ACTIVE' },
        take: 100, // Cache top 100 active experts
        include: {
          user: {
            select: {
              name: true,
              profilePicture: true
            }
          }
        }
      });

      const pipeline = this.redis.pipeline();
      activeExperts.forEach(expert => {
        pipeline.setex(
          `expert:profile:${expert.id}`,
          3600,
          JSON.stringify(expert)
        );
      });

      await pipeline.exec();
      this.logger.info(`Expert cache warmed up with ${activeExperts.length} profiles`);
    } catch (error) {
      this.logger.error('Failed to warm up expert cache', error);
    }
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Expert profile system resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new ExpertProfileSystem();