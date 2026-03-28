/**
 * 🎯 MOSA FORGE: Enterprise Capacity Utilization Analytics Service
 * 
 * @module CapacityUtilization
 * @description Real-time platform capacity monitoring and optimization analytics
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time expert capacity monitoring across 40+ skills
 * - Quality-based capacity optimization algorithms
 * - Predictive scaling recommendations
 * - Platform utilization analytics and reporting
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');

// 🏗️ Enterprise Constants
const CAPACITY_THRESHOLDS = {
  CRITICAL: 0.9,    // 90%+ utilization - Immediate action required
  HIGH: 0.75,       // 75%+ utilization - Monitor closely
  OPTIMAL: 0.6,     // 60% utilization - Healthy range
  LOW: 0.3,         // 30% utilization - Underutilized
  CRITICAL_LOW: 0.1 // 10% utilization - Serious underutilization
};

const EXPERT_TIERS = {
  MASTER: { maxStudents: null, weight: 1.2 },    // Unlimited with quality
  SENIOR: { maxStudents: 100, weight: 1.1 },     // 100 students max
  STANDARD: { maxStudents: 50, weight: 1.0 },    // 50 students max
  DEVELOPING: { maxStudents: 25, weight: 0.8 },  // 25 students max
  PROBATION: { maxStudents: 10, weight: 0.5 }    // 10 students max
};

const SKILL_CATEGORIES = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  HEALTH_SPORTS: 'HEALTH_SPORTS',
  BEAUTY_FASHION: 'BEAUTY_FASHION'
};

/**
 * 🏗️ Enterprise Capacity Utilization Class
 * @class CapacityUtilization
 * @extends EventEmitter
 */
class CapacityUtilization extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 🏗️ Enterprise Configuration
    this.config = {
      redis: options.redis || {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      },
      prisma: options.prisma || new PrismaClient(),
      analysisInterval: options.analysisInterval || 300000, // 5 minutes
      cacheTTL: options.cacheTTL || 600, // 10 minutes
      maxRetries: options.maxRetries || 3,
      qualityWeight: options.qualityWeight || 0.6,
      capacityWeight: options.capacityWeight || 0.4
    };

    // 🏗️ Service Dependencies
    this.redis = new Redis(this.config.redis);
    this.prisma = this.config.prisma;
    
    // 🏗️ Analytics State
    this.analyticsState = {
      lastAnalysis: null,
      currentUtilization: {},
      historicalData: [],
      alerts: [],
      recommendations: []
    };

    // 🏗️ Performance Monitoring
    this.metrics = {
      analysesPerformed: 0,
      capacityAlerts: 0,
      optimizationsRecommended: 0,
      averageAnalysisTime: 0,
      predictionsGenerated: 0
    };

    this._initializeEventHandlers();
    this._startRealTimeMonitoring();
    this._initializeHistoricalAnalysis();
  }

  /**
   * 🏗️ Initialize Enterprise Event Handlers
   * @private
   */
  _initializeEventHandlers() {
    this.on('capacity.analysis.completed', (data) => {
      this._logEvent('CAPACITY_ANALYSIS_COMPLETED', data);
      this.metrics.analysesPerformed++;
    });

    this.on('capacity.alert.triggered', (data) => {
      this._logEvent('CAPACITY_ALERT_TRIGGERED', data);
      this.metrics.capacityAlerts++;
    });

    this.on('optimization.recommended', (data) => {
      this._logEvent('OPTIMIZATION_RECOMMENDED', data);
      this.metrics.optimizationsRecommended++;
    });

    this.on('prediction.generated', (data) => {
      this._logEvent('PREDICTION_GENERATED', data);
      this.metrics.predictionsGenerated++;
    });

    this.on('expert.capacity.updated', (data) => {
      this._logEvent('EXPERT_CAPACITY_UPDATED', data);
    });
  }

  /**
   * 🏗️ Start Real-time Capacity Monitoring
   * @private
   */
  _startRealTimeMonitoring() {
    // Initial analysis
    this._performCapacityAnalysis();

    // Periodic analysis
    setInterval(() => {
      this._performCapacityAnalysis();
    }, this.config.analysisInterval);

    // Real-time updates via Redis pub/sub
    this.redis.subscribe('expert-updates', 'enrollment-updates', (err) => {
      if (err) {
        this._logError('REDIS_SUBSCRIBE_FAILED', err);
      }
    });

    this.redis.on('message', (channel, message) => {
      this._handleRealTimeUpdate(channel, JSON.parse(message));
    });
  }

  /**
   * 🏗️ Initialize Historical Data Analysis
   * @private
   */
  async _initializeHistoricalAnalysis() {
    try {
      // Load last 30 days of historical data
      const historicalData = await this.redis.get('capacity:historical:30days');
      if (historicalData) {
        this.analyticsState.historicalData = JSON.parse(historicalData);
      } else {
        await this._generateInitialHistoricalData();
      }
    } catch (error) {
      this._logError('HISTORICAL_DATA_INIT_FAILED', error);
    }
  }

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Get Platform Capacity Overview
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Comprehensive capacity analysis
   */
  async getPlatformCapacityOverview(options = {}) {
    const startTime = performance.now();
    const analysisId = uuidv4();
    const traceId = options.traceId || uuidv4();

    try {
      this.emit('capacity.analysis.started', { analysisId, traceId, options });

      // 🏗️ Multi-dimensional Capacity Analysis
      const analyses = await Promise.all([
        this._analyzeExpertCapacity(),
        this._analyzeSkillCapacity(),
        this._analyzeRegionalCapacity(),
        this._analyzeTierCapacity(),
        this._analyzeQualityImpact()
      ]);

      const [expertAnalysis, skillAnalysis, regionalAnalysis, tierAnalysis, qualityAnalysis] = analyses;

      // 🏗️ Generate Comprehensive Overview
      const overview = {
        analysisId,
        timestamp: new Date().toISOString(),
        summary: this._generateSummary(expertAnalysis, skillAnalysis),
        expertCapacity: expertAnalysis,
        skillCapacity: skillAnalysis,
        regionalCapacity: regionalAnalysis,
        tierCapacity: tierAnalysis,
        qualityImpact: qualityAnalysis,
        alerts: this._generateCapacityAlerts(expertAnalysis, skillAnalysis),
        recommendations: await this._generateOptimizationRecommendations(analyses),
        predictions: await this._generateCapacityPredictions(analyses),
        metadata: {
          totalExperts: expertAnalysis.totalExperts,
          totalStudents: expertAnalysis.totalActiveStudents,
          platformUtilization: expertAnalysis.platformUtilization,
          analysisDuration: performance.now() - startTime
        }
      };

      // 🏗️ Cache Results
      await this._cacheAnalysisResults(analysisId, overview);

      // 🏗️ Update Analytics State
      this.analyticsState.lastAnalysis = overview;
      this.analyticsState.currentUtilization = overview.summary;

      const processingTime = performance.now() - startTime;
      this._updateMetrics(processingTime);

      this.emit('capacity.analysis.completed', {
        analysisId,
        platformUtilization: overview.metadata.platformUtilization,
        processingTime
      });

      return overview;

    } catch (error) {
      const processingTime = performance.now() - startTime;
      this._updateMetrics(processingTime);
      
      this._logError('CAPACITY_ANALYSIS_FAILED', error, { analysisId, traceId });
      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🏗️ Analyze Expert Capacity Across Platform
   * @private
   */
  async _analyzeExpertCapacity() {
    const experts = await this.prisma.expert.findMany({
      where: { status: 'ACTIVE' },
      include: {
        _count: {
          select: {
            enrollments: {
              where: {
                status: { in: ['ACTIVE', 'PENDING'] }
              }
            }
          }
        },
        qualityMetrics: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        skills: {
          include: {
            skill: true
          }
        }
      }
    });

    let totalCapacity = 0;
    let totalUtilized = 0;
    let tierBreakdown = {};
    let qualityImpact = 0;

    for (const expert of experts) {
      const tierConfig = EXPERT_TIERS[expert.tier] || EXPERT_TIERS.STANDARD;
      const maxStudents = tierConfig.maxStudents || this._calculateDynamicMaxStudents(expert);
      const currentStudents = expert._count.enrollments;
      
      totalCapacity += maxStudents;
      totalUtilized += currentStudents;

      // Tier breakdown
      if (!tierBreakdown[expert.tier]) {
        tierBreakdown[expert.tier] = { capacity: 0, utilized: 0, experts: 0 };
      }
      tierBreakdown[expert.tier].capacity += maxStudents;
      tierBreakdown[expert.tier].utilized += currentStudents;
      tierBreakdown[expert.tier].experts++;

      // Quality impact calculation
      if (expert.qualityMetrics?.[0]) {
        const qualityScore = expert.qualityMetrics[0].overallScore;
        const qualityMultiplier = this._calculateQualityMultiplier(qualityScore);
        qualityImpact += (currentStudents / maxStudents) * qualityMultiplier;
      }
    }

    const platformUtilization = totalCapacity > 0 ? totalUtilized / totalCapacity : 0;
    const weightedUtilization = this._calculateWeightedUtilization(platformUtilization, qualityImpact / experts.length);

    return {
      totalExperts: experts.length,
      totalCapacity,
      totalUtilized,
      totalActiveStudents: totalUtilized,
      platformUtilization: weightedUtilization,
      tierBreakdown,
      expertDistribution: this._calculateExpertDistribution(experts),
      qualityImpact: qualityImpact / experts.length,
      averageStudentsPerExpert: experts.length > 0 ? totalUtilized / experts.length : 0
    };
  }

  /**
   * 🏗️ Calculate Dynamic Max Students Based on Quality
   * @private
   */
  _calculateDynamicMaxStudents(expert) {
    const baseCapacity = 50; // Standard base capacity
    
    if (!expert.qualityMetrics?.[0]) {
      return baseCapacity;
    }

    const qualityScore = expert.qualityMetrics[0].overallScore;
    const completionRate = expert.qualityMetrics[0].completionRate || 0.7;
    const averageRating = expert.qualityMetrics[0].averageRating || 4.0;

    // 🎯 Quality-based capacity calculation
    let capacityMultiplier = 1.0;

    // Quality score impact (40% weight)
    capacityMultiplier *= (qualityScore / 5.0) * 0.4;

    // Completion rate impact (30% weight)
    capacityMultiplier *= (completionRate / 1.0) * 0.3;

    // Rating impact (30% weight)
    capacityMultiplier *= (averageRating / 5.0) * 0.3;

    // Tier multiplier
    const tierConfig = EXPERT_TIERS[expert.tier] || EXPERT_TIERS.STANDARD;
    capacityMultiplier *= tierConfig.weight;

    return Math.max(5, Math.min(200, Math.round(baseCapacity * capacityMultiplier)));
  }

  /**
   * 🏗️ Calculate Quality Multiplier
   * @private
   */
  _calculateQualityMultiplier(qualityScore) {
    if (qualityScore >= 4.5) return 1.3;   // Master quality
    if (qualityScore >= 4.0) return 1.1;   // Excellent quality
    if (qualityScore >= 3.5) return 1.0;   // Good quality
    if (qualityScore >= 3.0) return 0.8;   // Average quality
    return 0.5; // Below average quality
  }

  /**
   * 🏗️ Calculate Weighted Utilization
   * @private
   */
  _calculateWeightedUtilization(utilization, qualityImpact) {
    return (utilization * this.config.capacityWeight) + (qualityImpact * this.config.qualityWeight);
  }

  /**
   * 🏗️ Calculate Expert Distribution
   * @private
   */
  _calculateExpertDistribution(experts) {
    const distribution = {
      byTier: {},
      bySkillCategory: {},
      byRegion: {},
      byQualityBand: {
        excellent: 0, // 4.5+
        good: 0,      // 4.0-4.49
        average: 0,   // 3.5-3.99
        belowAverage: 0 // <3.5
      }
    };

    for (const expert of experts) {
      // Tier distribution
      distribution.byTier[expert.tier] = (distribution.byTier[expert.tier] || 0) + 1;

      // Skill category distribution
      for (const skill of expert.skills) {
        const category = skill.skill.category;
        distribution.bySkillCategory[category] = (distribution.bySkillCategory[category] || 0) + 1;
      }

      // Region distribution
      distribution.byRegion[expert.region] = (distribution.byRegion[expert.region] || 0) + 1;

      // Quality band distribution
      const qualityScore = expert.qualityMetrics?.[0]?.overallScore || 0;
      if (qualityScore >= 4.5) distribution.byQualityBand.excellent++;
      else if (qualityScore >= 4.0) distribution.byQualityBand.good++;
      else if (qualityScore >= 3.5) distribution.byQualityBand.average++;
      else distribution.byQualityBand.belowAverage++;
    }

    return distribution;
  }

  /**
   * 🏗️ Analyze Skill Capacity
   * @private
   */
  async _analyzeSkillCapacity() {
    const skills = await this.prisma.skill.findMany({
      where: { isActive: true },
      include: {
        experts: {
          where: { expert: { status: 'ACTIVE' } },
          include: {
            expert: {
              include: {
                _count: {
                  select: {
                    enrollments: {
                      where: { status: { in: ['ACTIVE', 'PENDING'] } }
                    }
                  }
                },
                qualityMetrics: {
                  orderBy: { createdAt: 'desc' },
                  take: 1
                }
              }
            }
          }
        },
        _count: {
          select: {
            enrollments: {
              where: { status: { in: ['ACTIVE', 'PENDING'] } }
            }
          }
        }
      }
    });

    const skillAnalysis = {
      totalSkills: skills.length,
      skills: [],
      categoryBreakdown: {},
      highDemandSkills: [],
      underutilizedSkills: [],
      criticalSkills: []
    };

    for (const skill of skills) {
      const skillCapacity = this._calculateSkillCapacity(skill.experts);
      const currentStudents = skill._count.enrollments;
      const utilization = skillCapacity.totalCapacity > 0 ? currentStudents / skillCapacity.totalCapacity : 0;

      const skillData = {
        id: skill.id,
        name: skill.name,
        category: skill.category,
        experts: skill.experts.length,
        totalCapacity: skillCapacity.totalCapacity,
        utilizedCapacity: currentStudents,
        utilizationRate: utilization,
        qualityWeightedCapacity: skillCapacity.qualityWeightedCapacity,
        status: this._getSkillCapacityStatus(utilization),
        demandLevel: skill.marketDemand || 'MEDIUM'
      };

      skillAnalysis.skills.push(skillData);

      // Update category breakdown
      if (!skillAnalysis.categoryBreakdown[skill.category]) {
        skillAnalysis.categoryBreakdown[skill.category] = {
          skills: 0,
          experts: 0,
          capacity: 0,
          utilized: 0
        };
      }
      skillAnalysis.categoryBreakdown[skill.category].skills++;
      skillAnalysis.categoryBreakdown[skill.category].experts += skill.experts.length;
      skillAnalysis.categoryBreakdown[skill.category].capacity += skillCapacity.totalCapacity;
      skillAnalysis.categoryBreakdown[skill.category].utilized += currentStudents;

      // Identify high demand and underutilized skills
      if (utilization >= CAPACITY_THRESHOLDS.HIGH && skillData.demandLevel === 'HIGH') {
        skillAnalysis.highDemandSkills.push(skillData);
      }

      if (utilization <= CAPACITY_THRESHOLDS.LOW) {
        skillAnalysis.underutilizedSkills.push(skillData);
      }

      if (utilization >= CAPACITY_THRESHOLDS.CRITICAL) {
        skillAnalysis.criticalSkills.push(skillData);
      }
    }

    // Calculate category utilization rates
    for (const category in skillAnalysis.categoryBreakdown) {
      const cat = skillAnalysis.categoryBreakdown[category];
      cat.utilizationRate = cat.capacity > 0 ? cat.utilized / cat.capacity : 0;
    }

    return skillAnalysis;
  }

  /**
   * 🏗️ Calculate Skill Capacity
   * @private
   */
  _calculateSkillCapacity(experts) {
    let totalCapacity = 0;
    let qualityWeightedCapacity = 0;

    for (const expertSkill of experts) {
      const expert = expertSkill.expert;
      const tierConfig = EXPERT_TIERS[expert.tier] || EXPERT_TIERS.STANDARD;
      const maxStudents = tierConfig.maxStudents || this._calculateDynamicMaxStudents(expert);
      
      totalCapacity += maxStudents;

      // Quality-weighted capacity
      const qualityScore = expert.qualityMetrics?.[0]?.overallScore || 3.5;
      const qualityMultiplier = this._calculateQualityMultiplier(qualityScore);
      qualityWeightedCapacity += maxStudents * qualityMultiplier;
    }

    return {
      totalCapacity,
      qualityWeightedCapacity,
      averageQuality: qualityWeightedCapacity / totalCapacity || 0
    };
  }

  /**
   * 🏗️ Get Skill Capacity Status
   * @private
   */
  _getSkillCapacityStatus(utilization) {
    if (utilization >= CAPACITY_THRESHOLDS.CRITICAL) return 'CRITICAL';
    if (utilization >= CAPACITY_THRESHOLDS.HIGH) return 'HIGH';
    if (utilization >= CAPACITY_THRESHOLDS.OPTIMAL) return 'OPTIMAL';
    if (utilization >= CAPACITY_THRESHOLDS.LOW) return 'LOW';
    return 'CRITICAL_LOW';
  }

  /**
   * 🏗️ Analyze Regional Capacity
   * @private
   */
  async _analyzeRegionalCapacity() {
    const regions = await this.prisma.expert.groupBy({
      by: ['region'],
      where: { status: 'ACTIVE' },
      _count: { id: true },
      _sum: { currentStudents: true }
    });

    const regionalAnalysis = {
      totalRegions: regions.length,
      regions: [],
      coverageGaps: [],
      highDemandRegions: []
    };

    for (const region of regions) {
      const regionData = {
        name: region.region,
        expertCount: region._count.id,
        studentCount: region._sum.currentStudents || 0,
        averageUtilization: region._count.id > 0 ? (region._sum.currentStudents || 0) / (region._count.id * 50) : 0, // Assuming 50 students per expert average
        status: this._getRegionalStatus(region._count.id, region._sum.currentStudents || 0)
      };

      regionalAnalysis.regions.push(regionData);

      if (regionData.status === 'UNDERSTAFFED') {
        regionalAnalysis.coverageGaps.push(regionData);
      }

      if (regionData.averageUtilization >= CAPACITY_THRESHOLDS.HIGH) {
        regionalAnalysis.highDemandRegions.push(regionData);
      }
    }

    return regionalAnalysis;
  }

  /**
   * 🏗️ Get Regional Status
   * @private
   */
  _getRegionalStatus(expertCount, studentCount) {
    const studentsPerExpert = expertCount > 0 ? studentCount / expertCount : 0;
    
    if (expertCount === 0) return 'NO_COVERAGE';
    if (studentsPerExpert > 45) return 'OVERUTILIZED';
    if (studentsPerExpert > 30) return 'OPTIMAL';
    if (studentsPerExpert > 15) return 'UNDERUTILIZED';
    if (expertCount < 5) return 'UNDERSTAFFED';
    return 'LOW_DEMAND';
  }

  /**
   * 🏗️ Analyze Tier Capacity
   * @private
   */
  async _analyzeTierCapacity() {
    const tiers = await this.prisma.expert.groupBy({
      by: ['tier'],
      where: { status: 'ACTIVE' },
      _count: { id: true },
      _sum: { currentStudents: true }
    });

    const tierAnalysis = {
      tiers: {},
      optimalTierMix: this._calculateOptimalTierMix(),
      currentTierMix: {},
      recommendations: []
    };

    let totalExperts = 0;
    let totalStudents = 0;

    for (const tier of tiers) {
      tierAnalysis.tiers[tier.tier] = {
        expertCount: tier._count.id,
        studentCount: tier._sum.currentStudents || 0,
        utilization: tier._count.id > 0 ? (tier._sum.currentStudents || 0) / (tier._count.id * (EXPERT_TIERS[tier.tier]?.maxStudents || 50)) : 0,
        averageQuality: await this._getTierAverageQuality(tier.tier)
      };

      totalExperts += tier._count.id;
      totalStudents += tier._sum.currentStudents || 0;
    }

    // Calculate current tier mix
    for (const tier in tierAnalysis.tiers) {
      tierAnalysis.currentTierMix[tier] = {
        percentage: (tierAnalysis.tiers[tier].expertCount / totalExperts) * 100,
        targetPercentage: tierAnalysis.optimalTierMix[tier] || 0
      };

      // Generate tier-specific recommendations
      const recommendation = this._generateTierRecommendation(tier, tierAnalysis.tiers[tier], tierAnalysis.currentTierMix[tier]);
      if (recommendation) {
        tierAnalysis.recommendations.push(recommendation);
      }
    }

    return tierAnalysis;
  }

  /**
   * 🏗️ Calculate Optimal Tier Mix
   * @private
   */
  _calculateOptimalTierMix() {
    return {
      MASTER: 10,   // 10% Master tier
      SENIOR: 25,   // 25% Senior tier
      STANDARD: 50, // 50% Standard tier
      DEVELOPING: 10, // 10% Developing tier
      PROBATION: 5   // 5% Probation tier
    };
  }

  /**
   * 🏗️ Get Tier Average Quality
   * @private
   */
  async _getTierAverageQuality(tier) {
    const qualityMetrics = await this.prisma.qualityMetrics.findMany({
      where: {
        expert: {
          tier: tier,
          status: 'ACTIVE'
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    if (qualityMetrics.length === 0) return 4.0;

    const averageQuality = qualityMetrics.reduce((sum, metric) => sum + metric.overallScore, 0) / qualityMetrics.length;
    return averageQuality;
  }

  /**
   * 🏗️ Generate Tier Recommendation
   * @private
   */
  _generateTierRecommendation(tier, tierData, tierMix) {
    const deviation = tierMix.percentage - tierMix.targetPercentage;
    
    if (Math.abs(deviation) > 5) { // More than 5% deviation from target
      return {
        tier: tier,
        type: deviation > 0 ? 'OVER_REPRESENTED' : 'UNDER_REPRESENTED',
        currentPercentage: tierMix.percentage,
        targetPercentage: tierMix.targetPercentage,
        deviation: Math.abs(deviation),
        action: deviation > 0 ? 'Focus on quality improvement' : 'Accelerate expert advancement'
      };
    }

    return null;
  }

  /**
   * 🏗️ Analyze Quality Impact on Capacity
   * @private
   */
  async _analyzeQualityImpact() {
    const qualityMetrics = await this.prisma.qualityMetrics.findMany({
      where: {
        expert: { status: 'ACTIVE' }
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['expertId']
    });

    let totalQualityScore = 0;
    let completionRateSum = 0;
    let responseTimeSum = 0;
    const qualityBands = { excellent: 0, good: 0, average: 0, belowAverage: 0 };

    for (const metric of qualityMetrics) {
      totalQualityScore += metric.overallScore;
      completionRateSum += metric.completionRate || 0.7;
      responseTimeSum += metric.responseTime || 24;

      if (metric.overallScore >= 4.5) qualityBands.excellent++;
      else if (metric.overallScore >= 4.0) qualityBands.good++;
      else if (metric.overallScore >= 3.5) qualityBands.average++;
      else qualityBands.belowAverage++;
    }

    const averageQuality = qualityMetrics.length > 0 ? totalQualityScore / qualityMetrics.length : 4.0;
    const averageCompletionRate = qualityMetrics.length > 0 ? completionRateSum / qualityMetrics.length : 0.7;
    const averageResponseTime = qualityMetrics.length > 0 ? responseTimeSum / qualityMetrics.length : 24;

    return {
      averageQuality,
      averageCompletionRate,
      averageResponseTime,
      qualityBands,
      qualityImpactScore: this._calculateQualityImpactScore(averageQuality, averageCompletionRate, averageResponseTime),
      capacityLossDueToQuality: this._calculateCapacityLoss(qualityBands)
    };
  }

  /**
   * 🏗️ Calculate Quality Impact Score
   * @private
   */
  _calculateQualityImpactScore(quality, completionRate, responseTime) {
    const qualityScore = (quality / 5.0) * 0.4;
    const completionScore = completionRate * 0.4;
    const responseScore = Math.max(0, (24 - responseTime) / 24) * 0.2;
    
    return (qualityScore + completionScore + responseScore) * 100;
  }

  /**
   * 🏗️ Calculate Capacity Loss Due to Quality
   * @private
   */
  _calculateCapacityLoss(qualityBands) {
    const totalExperts = qualityBands.excellent + qualityBands.good + qualityBands.average + qualityBands.belowAverage;
    if (totalExperts === 0) return 0;

    // Capacity multipliers for each quality band
    const multipliers = {
      excellent: 1.0,
      good: 0.9,
      average: 0.7,
      belowAverage: 0.5
    };

    const weightedCapacity = (
      qualityBands.excellent * multipliers.excellent +
      qualityBands.good * multipliers.good +
      qualityBands.average * multipliers.average +
      qualityBands.belowAverage * multipliers.belowAverage
    );

    const maxPotentialCapacity = totalExperts; // If all were excellent
    const capacityLoss = ((maxPotentialCapacity - weightedCapacity) / maxPotentialCapacity) * 100;

    return capacityLoss;
  }

  /**
   * 🏗️ Generate Summary
   * @private
   */
  _generateSummary(expertAnalysis, skillAnalysis) {
    const platformStatus = this._getPlatformStatus(expertAnalysis.platformUtilization);
    
    return {
      platformUtilization: expertAnalysis.platformUtilization,
      platformStatus,
      totalExperts: expertAnalysis.totalExperts,
      totalActiveStudents: expertAnalysis.totalActiveStudents,
      averageUtilization: expertAnalysis.platformUtilization,
      qualityAdjustedCapacity: expertAnalysis.platformUtilization * (1 - (expertAnalysis.qualityImpact / 100)),
      skillCoverage: `${skillAnalysis.skills.length} of 40+ skills`,
      criticalAreas: skillAnalysis.criticalSkills.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🏗️ Get Platform Status
   * @private
   */
  _getPlatformStatus(utilization) {
    if (utilization >= CAPACITY_THRESHOLDS.CRITICAL) return 'CRITICAL';
    if (utilization >= CAPACITY_THRESHOLDS.HIGH) return 'HIGH_DEMAND';
    if (utilization >= CAPACITY_THRESHOLDS.OPTIMAL) return 'OPTIMAL';
    if (utilization >= CAPACITY_THRESHOLDS.LOW) return 'UNDERUTILIZED';
    return 'CRITICAL_UNDERUTILIZATION';
  }

  /**
   * 🏗️ Generate Capacity Alerts
   * @private
   */
  _generateCapacityAlerts(expertAnalysis, skillAnalysis) {
    const alerts = [];

    // Platform-level alerts
    if (expertAnalysis.platformUtilization >= CAPACITY_THRESHOLDS.CRITICAL) {
      alerts.push({
        level: 'CRITICAL',
        type: 'PLATFORM_CAPACITY',
        message: 'Platform capacity at critical levels. Immediate expert onboarding required.',
        utilization: expertAnalysis.platformUtilization,
        threshold: CAPACITY_THRESHOLDS.CRITICAL
      });
    }

    // Skill-level alerts
    for (const skill of skillAnalysis.criticalSkills) {
      alerts.push({
        level: 'HIGH',
        type: 'SKILL_CAPACITY',
        message: `Critical capacity for ${skill.name}. Utilization at ${(skill.utilizationRate * 100).toFixed(1)}%`,
        skillId: skill.id,
        skillName: skill.name,
        utilization: skill.utilizationRate
      });
    }

    // Tier-level alerts
    for (const tier in expertAnalysis.tierBreakdown) {
      const tierData = expertAnalysis.tierBreakdown[tier];
      const utilization = tierData.capacity > 0 ? tierData.utilized / tierData.capacity : 0;
      
      if (utilization >= CAPACITY_THRESHOLDS.HIGH) {
        alerts.push({
          level: 'MEDIUM',
          type: 'TIER_CAPACITY',
          message: `High utilization for ${tier} tier experts`,
          tier: tier,
          utilization: utilization
        });
      }
    }

    this.analyticsState.alerts = alerts;
    return alerts;
  }

  /**
   * 🏗️ Generate Optimization Recommendations
   * @private
   */
  async _generateOptimizationRecommendations(analyses) {
    const recommendations = [];
    const [expertAnalysis, skillAnalysis, regionalAnalysis, tierAnalysis, qualityAnalysis] = analyses;

    // Expert onboarding recommendations
    if (expertAnalysis.platformUtilization >= CAPACITY_THRESHOLDS.HIGH) {
      const requiredExperts = this._calculateRequiredExperts(expertAnalysis);
      recommendations.push({
        type: 'EXPERT_ONBOARDING',
        priority: 'HIGH',
        description: `Onboard ${requiredExperts} new experts to meet current demand`,
        impact: 'HIGH',
        estimatedEffect: `Reduce utilization from ${(expertAnalysis.platformUtilization * 100).toFixed(1)}% to target levels`,
        skillsFocus: skillAnalysis.highDemandSkills.map(s => s.name).slice(0, 5)
      });
    }

    // Quality improvement recommendations
    if (qualityAnalysis.capacityLossDueToQuality > 10) {
      recommendations.push({
        type: 'QUALITY_IMPROVEMENT',
        priority: 'MEDIUM',
        description: 'Implement quality improvement programs for underperforming experts',
        impact: 'MEDIUM',
        estimatedEffect: `Recover ${qualityAnalysis.capacityLossDueToQuality.toFixed(1)}% capacity through quality gains`,
        focusAreas: ['Below average quality experts', 'Low completion rates']
      });
    }

    // Regional optimization recommendations
    for (const region of regionalAnalysis.coverageGaps) {
      recommendations.push({
        type: 'REGIONAL_EXPANSION',
        priority: 'MEDIUM',
        description: `Expand expert network in ${region.name} region`,
        impact: 'MEDIUM',
        estimatedEffect: `Improve regional coverage and reduce student wait times`,
        targetExperts: 10
      });
    }

    // Tier mix optimization
    for (const rec of tierAnalysis.recommendations) {
      recommendations.push({
        type: 'TIER_OPTIMIZATION',
        priority: 'LOW',
        description: `Adjust ${rec.tier} tier representation`,
        impact: 'LOW',
        estimatedEffect: `Move from ${rec.currentPercentage.toFixed(1)}% to ${rec.targetPercentage}% target`,
        action: rec.action
      });
    }

    this.analyticsState.recommendations = recommendations;
    return recommendations;
  }

  /**
   * 🏗️ Calculate Required Experts
   * @private
   */
  _calculateRequiredExperts(expertAnalysis) {
    const targetUtilization = CAPACITY_THRESHOLDS.OPTIMAL;
    const currentUtilization = expertAnalysis.platformUtilization;
    const currentExperts = expertAnalysis.totalExperts;
    
    if (currentUtilization <= targetUtilization) return 0;

    const requiredCapacity = expertAnalysis.totalUtilized / targetUtilization;
    const currentCapacity = expertAnalysis.totalCapacity;
    const capacityPerExpert = currentCapacity / currentExperts;
    
    return Math.ceil((requiredCapacity - currentCapacity) / capacityPerExpert);
  }

  /**
   * 🏗️ Generate Capacity Predictions
   * @private
   */
  async _generateCapacityPredictions(analyses) {
    const historicalData = await this._getHistoricalData();
    const [expertAnalysis] = analyses;

    const predictions = {
      next7Days: this._predictNext7Days(expertAnalysis, historicalData),
      next30Days: this._predictNext30Days(expertAnalysis, historicalData),
      seasonalTrends: await this._analyzeSeasonalTrends(),
      growthProjections: this._calculateGrowthProjections(expertAnalysis)
    };

    this.emit('prediction.generated', predictions);
    return predictions;
  }

  /**
   * 🏗️ Predict Next 7 Days
   * @private
   */
  _predictNext7Days(currentAnalysis, historicalData) {
    // Simplified prediction algorithm
    const growthRate = this._calculateGrowthRate(historicalData);
    const currentStudents = currentAnalysis.totalActiveStudents;
    
    return {
      expectedStudents: Math.round(currentStudents * (1 + growthRate)),
      expectedUtilization: Math.min(1, currentAnalysis.platformUtilization * (1 + growthRate)),
      confidence: 0.85,
      factors: ['Current growth rate', 'Historical patterns', 'Market trends']
    };
  }

  /**
   * 🏗️ Calculate Growth Rate
   * @private
   */
  _calculateGrowthRate(historicalData) {
    if (historicalData.length < 2) return 0.02; // Default 2% daily growth

    const recentData = historicalData.slice(-7);
    let totalGrowth = 0;

    for (let i = 1; i < recentData.length; i++) {
      const growth = (recentData[i].students - recentData[i-1].students) / recentData[i-1].students;
      totalGrowth += growth;
    }

    return totalGrowth / (recentData.length - 1);
  }

  /**
   * 🎯 ENTERPRISE METHOD: Perform Capacity Analysis
   * @private
   */
  async _performCapacityAnalysis() {
    try {
      const overview = await this.getPlatformCapacityOverview();
      
      // Store in historical data
      this.analyticsState.historicalData.push({
        timestamp: new Date().toISOString(),
        students: overview.metadata.totalStudents,
        experts: overview.metadata.totalExperts,
        utilization: overview.metadata.platformUtilization,
        alerts: overview.alerts.length
      });

      // Keep only last 30 days
      if (this.analyticsState.historicalData.length > 30) {
        this.analyticsState.historicalData = this.analyticsState.historicalData.slice(-30);
      }

      // Cache historical data
      await this.redis.set(
        'capacity:historical:30days',
        JSON.stringify(this.analyticsState.historicalData),
        'EX',
        86400 // 24 hours
      );

    } catch (error) {
      this._logError('PERIODIC_ANALYSIS_FAILED', error);
    }
  }

  /**
   * 🏗️ Handle Real-time Updates
   * @private
   */
  async _handleRealTimeUpdate(channel, message) {
    try {
      switch (channel) {
        case 'expert-updates':
          await this._handleExpertUpdate(message);
          break;
        case 'enrollment-updates':
          await this._handleEnrollmentUpdate(message);
          break;
      }

      // Trigger immediate analysis for critical updates
      if (message.priority === 'HIGH') {
        setTimeout(() => this._performCapacityAnalysis(), 5000);
      }
    } catch (error) {
      this._logError('REAL_TIME_UPDATE_FAILED', error, { channel, message });
    }
  }

  /**
   * 🏗️ Handle Expert Updates
   * @private
   */
  async _handleExpertUpdate(update) {
    this.emit('expert.capacity.updated', update);
    
    // Clear relevant caches
    await this.redis.del('capacity:expert:analysis');
    await this.redis.del('capacity:skill:analysis');
  }

  /**
   * 🏗️ Handle Enrollment Updates
   * @private
   */
  async _handleEnrollmentUpdate(update) {
    // Update real-time counters
    const cacheKey = `capacity:realtime:${update.skillId}`;
    const current = await this.redis.get(cacheKey);
    const data = current ? JSON.parse(current) : { enrollments: 0, completions: 0 };

    if (update.type === 'ENROLLMENT') data.enrollments++;
    if (update.type === 'COMPLETION') data.completions++;

    await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 3600);
  }

  /**
   * 🏗️ Cache Analysis Results
   * @private
   */
  async _cacheAnalysisResults(analysisId, overview) {
    const cacheKey = `capacity:analysis:${analysisId}`;
    await this.redis.set(cacheKey, JSON.stringify(overview), 'EX', this.config.cacheTTL);
    
    // Also cache summary for quick access
    await this.redis.set('capacity:current:summary', JSON.stringify(overview.summary), 'EX', 300);
  }

  /**
   * 🏗️ Get Historical Data
   * @private
   */
  async _getHistoricalData() {
    return this.analyticsState.historicalData;
  }

  /**
   * 🏗️ Generate Initial Historical Data
   * @private
   */
  async _generateInitialHistoricalData() {
    // Generate synthetic data for initial setup
    const baseStudents = 1000;
    const baseExperts = 50;
    
    for (let i = 30; i > 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      this.analyticsState.historicalData.push({
        timestamp: date.toISOString(),
        students: baseStudents + (i * 10),
        experts: baseExperts + Math.floor(i / 3),
        utilization: 0.4 + (i * 0.01),
        alerts: Math.floor(Math.random() * 5)
      });
    }
  }

  /**
   * 🏗️ Update Performance Metrics
   * @private
   */
  _updateMetrics(processingTime) {
    this.metrics.averageAnalysisTime = 
      (this.metrics.averageAnalysisTime * this.metrics.analysesPerformed + processingTime) / 
      (this.metrics.analysesPerformed + 1);
  }

  /**
   * 🏗️ Format Enterprise Error
   * @private
   */
  _formatEnterpriseError(error) {
    const enterpriseError = new Error(error.message);
    enterpriseError.code = error.code || 'INTERNAL_ERROR';
    enterpriseError.timestamp = new Date().toISOString();
    enterpriseError.severity = 'HIGH'; // Capacity issues are always high severity
    
    return enterpriseError;
  }

  /**
   * 🏗️ Enterprise Logging
   * @private
   */
  _logEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'capacity-utilization',
      event: eventType,
      data,
      environment: process.env.NODE_ENV || 'development'
    };

    console.log(JSON.stringify(logEntry));

    if (process.env.NODE_ENV === 'production') {
      this.redis.publish('analytics-logs', JSON.stringify(logEntry));
    }
  }

  /**
   * 🏗️ Error Logging
   * @private
   */
  _logError(operation, error, context = {}) {
    this._logEvent('ERROR', {
      operation,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context,
      severity: 'ERROR'
    });
  }

  /**
   * 🎯 ENTERPRISE METHOD: Get Real-time Capacity Dashboard
   * @returns {Promise<Object>} Real-time dashboard data
   */
  async getRealtimeDashboard() {
    const cacheKey = 'capacity:dashboard:realtime';
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const dashboard = {
      timestamp: new Date().toISOString(),
      summary: this.analyticsState.currentUtilization,
      alerts: this.analyticsState.alerts.slice(0, 10),
      recommendations: this.analyticsState.recommendations.slice(0, 5),
      metrics: this.metrics,
      health: await this._getSystemHealth()
    };

    // Cache for 1 minute for real-time dashboard
    await this.redis.set(cacheKey, JSON.stringify(dashboard), 'EX', 60);

    return dashboard;
  }

  /**
   * 🏗️ Get System Health
   * @private
   */
  async _getSystemHealth() {
    return {
      status: 'HEALTHY',
      lastAnalysis: this.analyticsState.lastAnalysis?.timestamp,
      dataFreshness: Date.now() - new Date(this.analyticsState.lastAnalysis?.timestamp || 0).getTime(),
      alertCount: this.analyticsState.alerts.length,
      recommendationCount: this.analyticsState.recommendations.length
    };
  }

  /**
   * 🏗️ Get Service Metrics
   * @returns {Object} Service performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      historicalDataPoints: this.analyticsState.historicalData.length,
      currentAlerts: this.analyticsState.alerts.length
    };
  }

  /**
   * 🏗️ Graceful Shutdown
   */
  async shutdown() {
    try {
      this.emit('service.shutdown.started');
      
      await this.redis.quit();
      await this.prisma.$disconnect();
      
      this.emit('service.shutdown.completed');
    } catch (error) {
      this.emit('service.shutdown.failed', { error: error.message });
      throw error;
    }
  }

  // Placeholder methods for prediction algorithms
  _predictNext30Days(currentAnalysis, historicalData) {
    return {
      expectedStudents: Math.round(currentAnalysis.totalActiveStudents * 1.15),
      expectedUtilization: Math.min(1, currentAnalysis.platformUtilization * 1.1),
      confidence: 0.75,
      factors: ['Historical growth', 'Market expansion', 'Seasonal trends']
    };
  }

  async _analyzeSeasonalTrends() {
    return {
      currentSeason: 'Q4',
      seasonalImpact: 1.1,
      trend: 'INCREASING',
      factors: ['Holiday season', 'New year planning']
    };
  }

  _calculateGrowthProjections(expertAnalysis) {
    return {
      nextMonth: {
        students: Math.round(expertAnalysis.totalActiveStudents * 1.1),
        experts: Math.round(expertAnalysis.totalExperts * 1.05),
        utilization: Math.min(1, expertAnalysis.platformUtilization * 1.05)
      },
      nextQuarter: {
        students: Math.round(expertAnalysis.totalActiveStudents * 1.3),
        experts: Math.round(expertAnalysis.totalExperts * 1.15),
        utilization: Math.min(1, expertAnalysis.platformUtilization * 1.1)
      }
    };
  }
}

// 🏗️ Enterprise Export Pattern
module.exports = {
  CapacityUtilization,
  CAPACITY_THRESHOLDS,
  EXPERT_TIERS
};

// 🏗️ Singleton Instance for Microservice Architecture
let capacityUtilizationInstance = null;

module.exports.getInstance = (options = {}) => {
  if (!capacityUtilizationInstance) {
    capacityUtilizationInstance = new CapacityUtilization(options);
  }
  return capacityUtilizationInstance;
};