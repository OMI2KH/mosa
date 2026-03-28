/**
 * 🏢 MOSA FORGE - Enterprise Tier Management System
 * ⭐ Dynamic Expert Tiering & Performance Optimization
 * 📊 Real-time Quality Monitoring & Tier Advancement
 * 💰 Revenue Optimization & Bonus Calculation
 * 🚀 Microservice-Ready Enterprise Architecture
 * 
 * @module TierManager
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

// 🏗️ Enterprise Dependencies
const EnterpriseLogger = require('../../utils/enterprise-logger');
const QualityMetrics = require('../../utils/quality-metrics');
const RevenueCalculator = require('../../utils/revenue-calculator');
const NotificationService = require('../../services/notification-service');
const PerformanceAnalyzer = require('../../utils/performance-analyzer');

class TierManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 🎯 Enterprise Configuration
    this.config = {
      // ⭐ Tier Configuration
      tiers: {
        standard: {
          minQualityScore: 4.0,
          maxStudents: 50,
          baseEarning: 999,
          bonusPercentage: 0,
          requirements: {
            minCompletions: 10,
            minAverageRating: 4.0,
            maxResponseTime: 48, // hours
            minRetentionRate: 0.7
          }
        },
        senior: {
          minQualityScore: 4.3,
          maxStudents: 100,
          baseEarning: 1099,
          bonusPercentage: 10,
          requirements: {
            minCompletions: 25,
            minAverageRating: 4.3,
            maxResponseTime: 24, // hours
            minRetentionRate: 0.75,
            specializations: 1
          }
        },
        master: {
          minQualityScore: 4.7,
          maxStudents: null, // Unlimited with quality maintenance
          baseEarning: 1199,
          bonusPercentage: 20,
          requirements: {
            minCompletions: 50,
            minAverageRating: 4.7,
            maxResponseTime: 12, // hours
            minRetentionRate: 0.8,
            specializations: 2,
            mentorship: true
          }
        }
      },

      // 📊 Performance Configuration
      performance: {
        evaluationInterval: 3600000, // 1 hour
        realTimeUpdates: true,
        cacheDuration: 300, // 5 minutes
        batchProcessing: true
      },

      // 🔄 Promotion/Demotion Configuration
      transitions: {
        autoPromotion: true,
        qualityDemotion: true,
        probationPeriod: 30, // days
        minTimeInTier: 14, // days
        reviewRequired: ['master'] // Manual review for master tier
      },

      // 💰 Revenue Configuration
      revenue: {
        bundlePrice: 1999,
        platformShare: 1000,
        expertBase: 999,
        bonusTiers: {
          standard: 0,
          senior: 100,
          master: 200
        }
      },

      ...config
    };

    // 🏗️ Service State
    this.serviceState = {
      initialized: false,
      healthy: false,
      activeEvaluations: 0,
      lastEvaluation: null,
      tierDistribution: {},
      promotionQueue: []
    };

    this.metrics = {
      tierEvaluations: 0,
      promotions: 0,
      demotions: 0,
      qualityViolations: 0,
      revenueImpact: 0,
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
        service: 'tier-manager',
        module: 'expert-service',
        environment: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL || 'info'
      });

      // ⭐ Quality Metrics
      this.qualityMetrics = new QualityMetrics({
        service: 'tier-manager',
        updateInterval: this.config.performance.evaluationInterval
      });

      // 💰 Revenue Calculator
      this.revenueCalculator = new RevenueCalculator({
        bundlePrice: this.config.revenue.bundlePrice,
        platformShare: this.config.revenue.platformShare,
        expertBase: this.config.revenue.expertBase,
        bonusTiers: this.config.revenue.bonusTiers
      });

      // 📧 Notification Service
      this.notificationService = new NotificationService({
        templates: {
          tierPromotion: 'tier_promotion_v1',
          tierDemotion: 'tier_demotion_v1',
          qualityWarning: 'quality_warning_v1',
          bonusEligibility: 'bonus_eligibility_v1'
        }
      });

      // 📈 Performance Analyzer
      this.performanceAnalyzer = new PerformanceAnalyzer({
        metrics: ['completion_rate', 'student_satisfaction', 'response_time', 'retention_rate'],
        weights: [0.3, 0.25, 0.2, 0.25]
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

      // 🔄 Initialize Background Jobs
      this.initializeBackgroundJobs();

      // 🏥 Health Check
      await this.performHealthCheck();

      // 📊 Load Initial Tier Distribution
      await this.loadTierDistribution();

      this.serviceState.initialized = true;
      this.serviceState.healthy = true;

      this.logger.system('Enterprise Tier Manager initialized successfully', {
        service: 'tier-manager',
        version: '2.0.0',
        features: {
          autoPromotion: this.config.transitions.autoPromotion,
          realTimeUpdates: this.config.performance.realTimeUpdates,
          batchProcessing: this.config.performance.batchProcessing
        }
      });

    } catch (error) {
      this.logger.critical('Enterprise Tier Manager initialization failed', {
        error: error.message,
        stack: error.stack,
        service: 'tier-manager'
      });
      throw error;
    }
  }

  /**
   * 🔄 Initialize Background Jobs
   */
  initializeBackgroundJobs() {
    // 📊 Tier Evaluation Job
    this.evaluationInterval = setInterval(() => {
      this.evaluateAllExperts().catch(error => {
        this.logger.error('Batch tier evaluation failed', { error: error.message });
      });
    }, this.config.performance.evaluationInterval);

    // 📈 Performance Monitoring
    this.monitoringInterval = setInterval(() => {
      this.monitorTierPerformance().catch(error => {
        this.logger.error('Tier performance monitoring failed', { error: error.message });
      });
    }, 300000); // 5 minutes

    // 💰 Revenue Impact Analysis
    this.revenueInterval = setInterval(() => {
      this.analyzeRevenueImpact().catch(error => {
        this.logger.error('Revenue impact analysis failed', { error: error.message });
      });
    }, 86400000); // 24 hours
  }

  /**
   * ⭐ EVALUATE EXPERT FOR TIER - Enterprise Grade
   */
  async evaluateExpert(evaluationRequest, context = {}) {
    const startTime = performance.now();
    const evaluationId = this.generateEvaluationId();
    const traceId = context.traceId || evaluationId;

    try {
      // 🛡️ Pre-flight Checks
      await this.performPreFlightChecks();

      // ✅ Validate Evaluation Request
      await this.validateEvaluationRequest(evaluationRequest);

      // 🔍 Get Expert Data
      const expertData = await this.getExpertComprehensiveData(evaluationRequest.expertId);

      // 📊 Calculate Performance Metrics
      const performanceMetrics = await this.calculatePerformanceMetrics(expertData);

      // 🎯 Check Tier Eligibility
      const tierAnalysis = await this.analyzeTierEligibility(expertData, performanceMetrics);

      // 💰 Calculate Revenue Impact
      const revenueImpact = await this.calculateRevenueImpact(tierAnalysis, expertData);

      // 🔄 Process Tier Transition
      const transitionResult = await this.processTierTransition({
        evaluationId,
        expertData,
        performanceMetrics,
        tierAnalysis,
        revenueImpact,
        traceId
      });

      // 📊 Update Metrics
      await this.updateEvaluationMetrics({
        evaluationId,
        expertId: evaluationRequest.expertId,
        responseTime: performance.now() - startTime,
        transition: transitionResult.transitionType
      });

      this.metrics.tierEvaluations++;

      this.logger.business('Expert tier evaluation completed', {
        evaluationId,
        traceId,
        expertId: evaluationRequest.expertId,
        currentTier: expertData.currentTier,
        recommendedTier: tierAnalysis.recommendedTier,
        transition: transitionResult.transitionType,
        revenueImpact: revenueImpact.monthlyImpact
      });

      return {
        success: true,
        evaluationId,
        expertId: evaluationRequest.expertId,
        currentTier: expertData.currentTier,
        recommendedTier: tierAnalysis.recommendedTier,
        transition: transitionResult.transitionType,
        performanceScore: performanceMetrics.overallScore,
        revenueImpact: revenueImpact.monthlyImpact,
        nextSteps: this.generateEvaluationNextSteps(transitionResult.transitionType)
      };

    } catch (error) {
      await this.handleEvaluationFailure({
        evaluationId,
        evaluationRequest,
        error,
        context,
        responseTime: performance.now() - startTime,
        traceId
      });
      throw error;
    }
  }

  /**
   * ✅ VALIDATE EVALUATION REQUEST
   */
  async validateEvaluationRequest(evaluationRequest) {
    const validationRules = {
      requiredFields: ['expertId', 'evaluationType'],
      evaluationTypes: ['scheduled', 'on_demand', 'quality_triggered'],
      expertRequirements: {
        mustExist: true,
        validStatus: ['active', 'probation']
      }
    };

    const errors = [];

    // ✅ Check Required Fields
    const missingFields = validationRules.requiredFields.filter(field => !evaluationRequest[field]);
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // ✅ Validate Evaluation Type
    if (!validationRules.evaluationTypes.includes(evaluationRequest.evaluationType)) {
      errors.push(`Invalid evaluation type: ${evaluationRequest.evaluationType}`);
    }

    // ✅ Verify Expert Exists
    if (evaluationRequest.expertId) {
      const expertValidation = await this.validateExpert(evaluationRequest.expertId, validationRules.expertRequirements);
      if (!expertValidation.valid) {
        errors.push(`Expert validation failed: ${expertValidation.reason}`);
      }
    }

    if (errors.length > 0) {
      throw new TierManagementError('EVALUATION_VALIDATION_FAILED', 'Tier evaluation validation failed', {
        errors,
        expertId: evaluationRequest.expertId,
        evaluationType: evaluationRequest.evaluationType
      });
    }

    this.logger.security('Tier evaluation validation passed', {
      expertId: evaluationRequest.expertId,
      evaluationType: evaluationRequest.evaluationType
    });
  }

  /**
   * 🔍 GET EXPERT COMPREHENSIVE DATA
   */
  async getExpertComprehensiveData(expertId) {
    const cacheKey = `expert_data:${expertId}`;
    
    try {
      // 💾 Try cache first
      const cachedData = await this.redis.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // 🗃️ Query comprehensive expert data
      const expertData = await this.prisma.expert.findUnique({
        where: { id: expertId },
        include: {
          skills: {
            include: {
              skill: true
            }
          },
          qualityMetrics: {
            orderBy: { calculatedAt: 'desc' },
            take: 10
          },
          enrollments: {
            where: {
              status: { in: ['completed', 'active'] }
            },
            include: {
              sessions: {
                select: {
                  status: true,
                  studentRating: true,
                  completedAt: true
                }
              },
              student: {
                select: {
                  personalInfo: true
                }
              }
            }
          },
          payments: {
            where: {
              status: 'completed'
            },
            select: {
              amount: true,
              createdAt: true,
              type: true
            }
          },
          tierHistory: {
            orderBy: { effectiveFrom: 'desc' },
            take: 5
          }
        }
      });

      if (!expertData) {
        throw new TierManagementError('EXPERT_NOT_FOUND', 'Expert not found for tier evaluation');
      }

      // 💾 Cache expert data
      await this.redis.setex(cacheKey, this.config.performance.cacheDuration, JSON.stringify(expertData));

      return expertData;

    } catch (error) {
      this.logger.error('Failed to get expert comprehensive data', {
        expertId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 📊 CALCULATE PERFORMANCE METRICS
   */
  async calculatePerformanceMetrics(expertData) {
    const metricsStartTime = performance.now();

    try {
      // 🎯 Completion Rate
      const completionRate = this.calculateCompletionRate(expertData.enrollments);

      // ⭐ Student Satisfaction
      const studentSatisfaction = this.calculateStudentSatisfaction(expertData.enrollments);

      // ⏱️ Response Time
      const responseTime = await this.calculateAverageResponseTime(expertData.id);

      // 📈 Retention Rate
      const retentionRate = this.calculateRetentionRate(expertData.enrollments);

      // 💼 Specialization Count
      const specializationCount = this.calculateSpecializationCount(expertData.skills);

      // 🎓 Mentorship Activity
      const mentorshipActivity = await this.calculateMentorshipActivity(expertData.id);

      const performanceMetrics = {
        completionRate,
        studentSatisfaction,
        responseTime,
        retentionRate,
        specializationCount,
        mentorshipActivity,
        overallScore: this.performanceAnalyzer.calculateOverallScore({
          completionRate,
          studentSatisfaction,
          responseTime,
          retentionRate
        }),
        calculatedAt: new Date().toISOString(),
        processingTime: performance.now() - metricsStartTime
      };

      this.logger.debug('Performance metrics calculated', {
        expertId: expertData.id,
        overallScore: performanceMetrics.overallScore,
        components: {
          completionRate,
          studentSatisfaction,
          responseTime,
          retentionRate
        }
      });

      return performanceMetrics;

    } catch (error) {
      this.logger.error('Performance metrics calculation failed', {
        expertId: expertData.id,
        error: error.message
      });

      throw new TierManagementError('METRICS_CALCULATION_FAILED', 'Failed to calculate performance metrics', {
        originalError: error.message
      });
    }
  }

  /**
   * 🎯 ANALYZE TIER ELIGIBILITY
   */
  async analyzeTierEligibility(expertData, performanceMetrics) {
    const analysisStartTime = performance.now();

    try {
      const currentTier = expertData.currentTier;
      const eligibleTiers = [];
      const requirementChecks = {};

      // 🔍 Check Eligibility for Each Tier
      for (const [tierName, tierConfig] of Object.entries(this.config.tiers)) {
        const requirements = tierConfig.requirements;
        const checks = {};

        // ✅ Quality Score Check
        checks.qualityScore = expertData.qualityScore >= tierConfig.minQualityScore;

        // ✅ Completion Count Check
        checks.completions = this.getCompletedEnrollments(expertData.enrollments) >= requirements.minCompletions;

        // ✅ Rating Check
        checks.rating = performanceMetrics.studentSatisfaction >= requirements.minAverageRating;

        // ✅ Response Time Check
        checks.responseTime = performanceMetrics.responseTime <= requirements.maxResponseTime;

        // ✅ Retention Rate Check
        checks.retention = performanceMetrics.retentionRate >= requirements.minRetentionRate;

        // ✅ Specialization Check
        checks.specializations = performanceMetrics.specializationCount >= (requirements.specializations || 0);

        // ✅ Mentorship Check (for master tier)
        if (requirements.mentorship) {
          checks.mentorship = performanceMetrics.mentorshipActivity >= 0.8; // 80% mentorship activity
        }

        // ✅ Time in Current Tier Check
        if (tierName !== currentTier) {
          checks.timeInTier = this.hasMinimumTimeInTier(expertData, currentTier);
        }

        const allRequirementsMet = Object.values(checks).every(check => check === true);
        
        if (allRequirementsMet) {
          eligibleTiers.push(tierName);
        }

        requirementChecks[tierName] = {
          eligible: allRequirementsMet,
          checks
        };
      }

      // 🏆 Determine Recommended Tier
      const recommendedTier = this.determineRecommendedTier(eligibleTiers, currentTier, performanceMetrics.overallScore);

      const tierAnalysis = {
        currentTier,
        eligibleTiers,
        recommendedTier,
        requirementChecks,
        promotionEligible: this.isPromotionEligible(currentTier, recommendedTier),
        demotionRisk: this.calculateDemotionRisk(currentTier, performanceMetrics),
        analysisTime: performance.now() - analysisStartTime,
        analyzedAt: new Date().toISOString()
      };

      this.logger.debug('Tier eligibility analysis completed', {
        expertId: expertData.id,
        currentTier,
        recommendedTier,
        eligibleTiers,
        promotionEligible: tierAnalysis.promotionEligible
      });

      return tierAnalysis;

    } catch (error) {
      this.logger.error('Tier eligibility analysis failed', {
        expertId: expertData.id,
        error: error.message
      });

      throw new TierManagementError('ELIGIBILITY_ANALYSIS_FAILED', 'Failed to analyze tier eligibility', {
        originalError: error.message
      });
    }
  }

  /**
   * 💰 CALCULATE REVENUE IMPACT
   */
  async calculateRevenueImpact(tierAnalysis, expertData) {
    try {
      const currentEarnings = this.calculateCurrentEarnings(expertData);
      const projectedEarnings = this.calculateProjectedEarnings(tierAnalysis.recommendedTier, expertData);

      const revenueImpact = {
        currentTier: expertData.currentTier,
        recommendedTier: tierAnalysis.recommendedTier,
        currentMonthlyEarnings: currentEarnings.monthly,
        projectedMonthlyEarnings: projectedEarnings.monthly,
        monthlyImpact: projectedEarnings.monthly - currentEarnings.monthly,
        annualImpact: (projectedEarnings.monthly - currentEarnings.monthly) * 12,
        bonusImpact: projectedEarnings.bonus - currentEarnings.bonus,
        calculatedAt: new Date().toISOString()
      };

      return revenueImpact;

    } catch (error) {
      this.logger.error('Revenue impact calculation failed', {
        expertId: expertData.id,
        error: error.message
      });

      return {
        currentMonthlyEarnings: 0,
        projectedMonthlyEarnings: 0,
        monthlyImpact: 0,
        annualImpact: 0,
        bonusImpact: 0,
        error: error.message
      };
    }
  }

  /**
   * 🔄 PROCESS TIER TRANSITION
   */
  async processTierTransition(transitionData) {
    const { evaluationId, expertData, tierAnalysis, revenueImpact, traceId } = transitionData;

    try {
      // 🔍 Check if Transition is Needed
      if (tierAnalysis.recommendedTier === expertData.currentTier) {
        return {
          transitionType: 'none',
          message: 'Expert already at recommended tier'
        };
      }

      // ⏰ Check Minimum Time in Tier
      if (!this.hasMinimumTimeInTier(expertData, expertData.currentTier)) {
        return {
          transitionType: 'delayed',
          message: 'Minimum time in tier not met',
          nextEligibleDate: this.calculateNextEligibleDate(expertData)
        };
      }

      // 🛡️ Check for Manual Review Requirement
      if (this.requiresManualReview(tierAnalysis.recommendedTier)) {
        await this.queueForManualReview(transitionData);
        return {
          transitionType: 'pending_review',
          message: 'Transition requires manual review'
        };
      }

      // 💾 Execute Tier Transition
      const transitionResult = await this.executeTierTransition(transitionData);

      // 📧 Send Notification
      await this.sendTierTransitionNotification(transitionResult);

      // 📊 Update Metrics
      if (transitionResult.transitionType === 'promotion') {
        this.metrics.promotions++;
      } else if (transitionResult.transitionType === 'demotion') {
        this.metrics.demotions++;
      }

      this.logger.business('Tier transition processed', {
        evaluationId,
        traceId,
        expertId: expertData.id,
        fromTier: expertData.currentTier,
        toTier: tierAnalysis.recommendedTier,
        transitionType: transitionResult.transitionType,
        revenueImpact: revenueImpact.monthlyImpact
      });

      return transitionResult;

    } catch (error) {
      this.logger.error('Tier transition processing failed', {
        evaluationId,
        expertId: expertData.id,
        error: error.message
      });

      throw new TierManagementError('TRANSITION_PROCESSING_FAILED', 'Failed to process tier transition', {
        originalError: error.message
      });
    }
  }

  /**
   * 📊 EVALUATE ALL EXPERTS - Batch Processing
   */
  async evaluateAllExperts() {
    const batchStartTime = performance.now();
    const batchId = this.generateBatchId();

    try {
      this.logger.info('Starting batch tier evaluation', { batchId });

      // 🔍 Get Experts Due for Evaluation
      const expertsToEvaluate = await this.getExpertsDueForEvaluation();

      this.serviceState.activeEvaluations = expertsToEvaluate.length;

      // ⚡ Process in Batches
      const batchSize = 50;
      let processed = 0;
      let promotions = 0;
      let demotions = 0;

      for (let i = 0; i < expertsToEvaluate.length; i += batchSize) {
        const batch = expertsToEvaluate.slice(i, i + batchSize);
        
        const batchPromises = batch.map(expert => 
          this.evaluateExpert({
            expertId: expert.id,
            evaluationType: 'scheduled'
          }).catch(error => ({
            expertId: expert.id,
            error: error.message
          }))
        );

        const batchResults = await Promise.allSettled(batchPromises);

        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value.success) {
            processed++;
            if (result.value.transition === 'promotion') promotions++;
            if (result.value.transition === 'demotion') demotions++;
          }
        }

        // 🕐 Brief pause between batches
        await this.delay(1000);
      }

      this.serviceState.lastEvaluation = new Date();
      this.serviceState.activeEvaluations = 0;

      this.logger.business('Batch tier evaluation completed', {
        batchId,
        totalExperts: expertsToEvaluate.length,
        processed,
        promotions,
        demotions,
        processingTime: performance.now() - batchStartTime
      });

      // 📊 Update Tier Distribution
      await this.loadTierDistribution();

    } catch (error) {
      this.logger.error('Batch tier evaluation failed', {
        batchId,
        error: error.message
      });
    }
  }

  /**
   * 📈 MONITOR TIER PERFORMANCE
   */
  async monitorTierPerformance() {
    const monitoringStartTime = performance.now();
    const monitoringId = this.generateMonitoringId();

    try {
      // 📊 Get Tier Performance Metrics
      const tierPerformance = await this.calculateTierPerformanceMetrics();

      // 🔍 Identify Performance Issues
      const performanceIssues = await this.identifyTierPerformanceIssues(tierPerformance);

      // 🚨 Trigger Alerts and Actions
      for (const issue of performanceIssues) {
        await this.handleTierPerformanceIssue(issue);
      }

      // 📈 Update Service State
      this.serviceState.tierDistribution = tierPerformance.distribution;

      this.logger.debug('Tier performance monitoring completed', {
        monitoringId,
        tiersMonitored: Object.keys(tierPerformance.metrics).length,
        issuesDetected: performanceIssues.length,
        processingTime: performance.now() - monitoringStartTime
      });

    } catch (error) {
      this.logger.error('Tier performance monitoring failed', {
        monitoringId,
        error: error.message
      });
    }
  }

  /**
   * 💰 ANALYZE REVENUE IMPACT
   */
  async analyzeRevenueImpact() {
    const analysisStartTime = performance.now();
    const analysisId = this.generateAnalysisId();

    try {
      // 📊 Calculate Current Revenue Distribution
      const currentRevenue = await this.calculateCurrentRevenueDistribution();

      // 📈 Project Future Revenue
      const projectedRevenue = await this.projectFutureRevenue();

      // 💰 Calculate Impact
      const revenueImpact = {
        currentMonthlyRevenue: currentRevenue.total,
        projectedMonthlyRevenue: projectedRevenue.total,
        monthlyImpact: projectedRevenue.total - currentRevenue.total,
        tierBreakdown: this.calculateTierRevenueBreakdown(currentRevenue, projectedRevenue),
        analyzedAt: new Date().toISOString()
      };

      this.metrics.revenueImpact = revenueImpact.monthlyImpact;

      this.logger.business('Revenue impact analysis completed', {
        analysisId,
        currentRevenue: currentRevenue.total,
        projectedRevenue: projectedRevenue.total,
        monthlyImpact: revenueImpact.monthlyImpact,
        processingTime: performance.now() - analysisStartTime
      });

      return revenueImpact;

    } catch (error) {
      this.logger.error('Revenue impact analysis failed', {
        analysisId,
        error: error.message
      });

      return {
        currentMonthlyRevenue: 0,
        projectedMonthlyRevenue: 0,
        monthlyImpact: 0,
        error: error.message
      };
    }
  }

  /**
   * 📊 GET TIER ANALYTICS
   */
  async getTierAnalytics(timeRange = '30d') {
    const analytics = {
      summary: {
        totalExperts: await this.getTotalExperts(),
        tierDistribution: this.serviceState.tierDistribution,
        averageQualityScore: await this.getAverageQualityScore(),
        totalRevenueImpact: this.metrics.revenueImpact
      },
      performance: {
        evaluationStats: {
          totalEvaluations: this.metrics.tierEvaluations,
          promotions: this.metrics.promotions,
          demotions: this.metrics.demotions,
          successRate: this.calculateEvaluationSuccessRate()
        },
        averageProcessingTime: this.metrics.averageProcessingTime
      },
      transitions: {
        promotionRate: await this.calculatePromotionRate(timeRange),
        demotionRate: await this.calculateDemotionRate(timeRange),
        averageTimeInTier: await this.calculateAverageTimeInTier()
      },
      revenue: {
        currentDistribution: await this.getRevenueDistribution(),
        projectedImpact: this.metrics.revenueImpact,
        bonusPayouts: await this.getBonusPayouts(timeRange)
      }
    };

    return analytics;
  }

  /**
   * 🔧 UTILITY METHODS
   */

  generateEvaluationId() {
    return `tier_eval_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateBatchId() {
    return `tier_batch_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateMonitoringId() {
    return `tier_monitor_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateAnalysisId() {
    return `tier_analysis_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  calculateCompletionRate(enrollments) {
    const completed = enrollments.filter(e => e.status === 'completed').length;
    const total = enrollments.filter(e => ['completed', 'active'].includes(e.status)).length;
    return total > 0 ? completed / total : 0;
  }

  calculateStudentSatisfaction(enrollments) {
    const ratings = enrollments.flatMap(e => 
      e.sessions.map(s => s.studentRating).filter(r => r !== null)
    );
    return ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  }

  calculateRetentionRate(enrollments) {
    const completed = enrollments.filter(e => e.status === 'completed').length;
    const started = enrollments.filter(e => e.status !== 'pending').length;
    return started > 0 ? completed / started : 0;
  }

  calculateSpecializationCount(skills) {
    return skills.filter(s => s.verified && s.proficiency >= 4).length;
  }

  determineRecommendedTier(eligibleTiers, currentTier, overallScore) {
    if (eligibleTiers.length === 0) return currentTier;
    
    // 🏆 Prefer highest eligible tier
    const tierOrder = ['master', 'senior', 'standard'];
    const highestEligible = eligibleTiers.sort((a, b) => 
      tierOrder.indexOf(a) - tierOrder.indexOf(b)
    )[0];

    return highestEligible;
  }

  isPromotionEligible(currentTier, recommendedTier) {
    const tierOrder = ['standard', 'senior', 'master'];
    return tierOrder.indexOf(recommendedTier) > tierOrder.indexOf(currentTier);
  }

  hasMinimumTimeInTier(expertData, tier) {
    const tierHistory = expertData.tierHistory.find(th => th.tier === tier);
    if (!tierHistory) return true; // No history, assume minimum time met
    
    const timeInTier = Date.now() - new Date(tierHistory.effectiveFrom).getTime();
    const minTime = this.config.transitions.minTimeInTier * 24 * 60 * 60 * 1000;
    
    return timeInTier >= minTime;
  }

  requiresManualReview(tier) {
    return this.config.transitions.reviewRequired.includes(tier);
  }

  generateEvaluationNextSteps(transitionType) {
    const nextSteps = {
      promotion: ['update_profile', 'bonus_calculation', 'capacity_increase', 'notification'],
      demotion: ['quality_review', 'improvement_plan', 'capacity_adjustment', 'notification'],
      none: ['continue_monitoring', 'periodic_review'],
      pending_review: ['manager_review', 'decision_pending']
    };

    return nextSteps[transitionType] || ['continue_monitoring'];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🏥 HEALTH CHECK
   */
  async performHealthCheck() {
    try {
      // 💾 Check Database
      await this.prisma.$queryRaw`SELECT 1`;
      
      // 🔄 Check Redis
      await this.redis.ping();

      // 📊 Check Background Jobs
      const backgroundJobsHealthy = this.evaluationInterval && this.monitoringInterval && this.revenueInterval;

      this.serviceState.healthy = backgroundJobsHealthy;
      this.serviceState.lastHealthCheck = new Date();

      if (!this.serviceState.healthy) {
        this.logger.warn('Tier manager health check failed', {
          backgroundJobsHealthy
        });
      }

      return this.serviceState.healthy;

    } catch (error) {
      this.serviceState.healthy = false;
      this.logger.error('Tier manager health check failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * 📊 LOAD TIER DISTRIBUTION
   */
  async loadTierDistribution() {
    try {
      const distribution = await this.prisma.expert.groupBy({
        by: ['currentTier'],
        where: { status: 'active' },
        _count: { id: true }
      });

      this.serviceState.tierDistribution = distribution.reduce((acc, item) => {
        acc[item.currentTier] = item._count.id;
        return acc;
      }, {});

    } catch (error) {
      this.logger.error('Failed to load tier distribution', {
        error: error.message
      });
    }
  }

  /**
   * 🎯 ERROR HANDLING
   */
  async handleEvaluationFailure({ evaluationId, evaluationRequest, error, context, responseTime, traceId }) {
    this.logger.error('Tier evaluation failed', {
      evaluationId,
      traceId,
      expertId: evaluationRequest.expertId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2)
    });
  }

  /**
   * 🧹 CLEANUP
   */
  async destroy() {
    if (this.evaluationInterval) clearInterval(this.evaluationInterval);
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);
    if (this.revenueInterval) clearInterval(this.revenueInterval);
    
    await this.prisma.$disconnect();
    await this.redis.quit();
  }
}

/**
 * 🎯 ENTERPRISE TIER MANAGEMENT ERROR CLASS
 */
class TierManagementError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'TierManagementError';
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

// 🎯 Enterprise Tier Management Error Codes
TierManagementError.CODES = {
  // 🔐 Validation Errors
  EVALUATION_VALIDATION_FAILED: 'EVALUATION_VALIDATION_FAILED',
  EXPERT_NOT_FOUND: 'EXPERT_NOT_FOUND',
  INVALID_EVALUATION_TYPE: 'INVALID_EVALUATION_TYPE',

  // 📊 Metrics Errors
  METRICS_CALCULATION_FAILED: 'METRICS_CALCULATION_FAILED',
  DATA_EXTRACTION_FAILED: 'DATA_EXTRACTION_FAILED',
  PERFORMANCE_DATA_INCOMPLETE: 'PERFORMANCE_DATA_INCOMPLETE',

  // 🎯 Analysis Errors
  ELIGIBILITY_ANALYSIS_FAILED: 'ELIGIBILITY_ANALYSIS_FAILED',
  TIER_REQUIREMENTS_NOT_MET: 'TIER_REQUIREMENTS_NOT_MET',
  INSUFFICIENT_PERFORMANCE_DATA: 'INSUFFICIENT_PERFORMANCE_DATA',

  // 🔄 Transition Errors
  TRANSITION_PROCESSING_FAILED: 'TRANSITION_PROCESSING_FAILED',
  MANUAL_REVIEW_REQUIRED: 'MANUAL_REVIEW_REQUIRED',
  MINIMUM_TIME_NOT_MET: 'MINIMUM_TIME_NOT_MET',

  // 💰 Revenue Errors
  REVENUE_CALCULATION_FAILED: 'REVENUE_CALCULATION_FAILED',
  BONUS_CALCULATION_FAILED: 'BONUS_CALCULATION_FAILED'
};

module.exports = {
  TierManager,
  TierManagementError
};