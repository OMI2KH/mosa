/**
 * 🏢 MOSA FORGE - Enterprise Capacity Tracking System
 * 📈 Real-time Expert Capacity Monitoring & Optimization
 * 🎯 Quality-Driven Load Balancing & Performance Management
 * 🔄 Dynamic Scaling & Resource Allocation
 * 🚀 Microservice-Ready Enterprise Architecture
 * 
 * @module CapacityTracker
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
const PerformanceAnalyzer = require('../../utils/performance-analyzer');
const AlertManager = require('../../utils/alert-manager');
const PredictiveScaling = require('../../utils/predictive-scaling');

class CapacityTracker extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 🎯 Enterprise Configuration
    this.config = {
      // 📊 Capacity Configuration
      capacity: {
        tierLimits: {
          standard: { maxStudents: 50, optimal: 35, warning: 45 },
          senior: { maxStudents: 100, optimal: 70, warning: 85 },
          master: { maxStudents: null, optimal: 50, warning: 80 } // Dynamic limits
        },
        qualityThresholds: {
          minQualityScore: 4.0,
          maxResponseTime: 48, // hours
          minCompletionRate: 0.7,
          maxConcurrentSessions: 5
        },
        scaling: {
          autoScale: true,
          scaleUpThreshold: 0.8,
          scaleDownThreshold: 0.3,
          maxScaleUpPercent: 0.25
        }
      },

      // 📈 Monitoring Configuration
      monitoring: {
        interval: 300000, // 5 minutes
        realTimeUpdates: true,
        cacheDuration: 180, // 3 minutes
        batchSize: 100
      },

      // 🚨 Alert Configuration
      alerts: {
        capacityWarning: 0.85, // 85% capacity
        qualityDegradation: 0.15, // 15% drop
        performanceDrop: 0.2, // 20% performance drop
        autoEscalation: true
      },

      // 🔄 Optimization Configuration
      optimization: {
        rebalanceEnabled: true,
        loadBalancing: true,
        predictiveAllocation: true,
        qualityPreservation: true
      },

      ...config
    };

    // 🏗️ Service State
    this.serviceState = {
      initialized: false,
      healthy: false,
      activeMonitoring: 0,
      totalExperts: 0,
      systemCapacity: 0,
      utilizationRate: 0,
      lastOptimization: null
    };

    this.metrics = {
      capacityChecks: 0,
      scalingEvents: 0,
      rebalanceOperations: 0,
      qualityViolations: 0,
      averageResponseTime: 0,
      systemUtilization: 0
    };

    this.capacityCache = new Map();
    this.initializeEnterpriseServices();
  }

  /**
   * 🏗️ Initialize Enterprise Services
   */
  async initializeEnterpriseServices() {
    try {
      // 📊 Enterprise Logging
      this.logger = new EnterpriseLogger({
        service: 'capacity-tracker',
        module: 'expert-service',
        environment: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL || 'info'
      });

      // ⭐ Quality Metrics
      this.qualityMetrics = new QualityMetrics({
        service: 'capacity-tracker',
        updateInterval: this.config.monitoring.interval
      });

      // 📈 Performance Analyzer
      this.performanceAnalyzer = new PerformanceAnalyzer({
        metrics: ['capacity_utilization', 'response_time', 'completion_rate', 'student_satisfaction'],
        weights: [0.3, 0.25, 0.25, 0.2]
      });

      // 🚨 Alert Manager
      this.alertManager = new AlertManager({
        service: 'capacity-tracker',
        escalationEnabled: this.config.alerts.autoEscalation,
        thresholds: this.config.alerts
      });

      // 🔮 Predictive Scaling
      this.predictiveScaling = new PredictiveScaling({
        historyDays: 30,
        confidenceThreshold: 0.8,
        scalingFactors: this.config.capacity.scaling
      });

      // 💾 Database Client
      this.prisma = new PrismaClient({
        log: ['error', 'warn'],
        datasourceUrl: process.env.DATABASE_URL,
        transactionTimeout: 30000
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

      // 📊 Load Initial Capacity Data
      await this.loadInitialCapacity();

      this.serviceState.initialized = true;
      this.serviceState.healthy = true;

      this.logger.system('Enterprise Capacity Tracker initialized successfully', {
        service: 'capacity-tracker',
        version: '2.0.0',
        features: {
          realTimeMonitoring: this.config.monitoring.realTimeUpdates,
          autoScaling: this.config.capacity.scaling.autoScale,
          predictiveAllocation: this.config.optimization.predictiveAllocation
        }
      });

    } catch (error) {
      this.logger.critical('Enterprise Capacity Tracker initialization failed', {
        error: error.message,
        stack: error.stack,
        service: 'capacity-tracker'
      });
      throw error;
    }
  }

  /**
   * 🔄 Initialize Background Jobs
   */
  initializeBackgroundJobs() {
    // 📊 Capacity Monitoring
    this.monitoringInterval = setInterval(() => {
      this.monitorSystemCapacity().catch(error => {
        this.logger.error('System capacity monitoring failed', { error: error.message });
      });
    }, this.config.monitoring.interval);

    // ⚡ Real-time Updates
    this.realTimeInterval = setInterval(() => {
      this.updateRealTimeMetrics().catch(error => {
        this.logger.error('Real-time metrics update failed', { error: error.message });
      });
    }, 60000); // 1 minute

    // 🔄 Optimization Engine
    this.optimizationInterval = setInterval(() => {
      this.runOptimizationCycle().catch(error => {
        this.logger.error('Optimization cycle failed', { error: error.message });
      });
    }, 900000); // 15 minutes
  }

  /**
   * 📊 TRACK EXPERT CAPACITY - Enterprise Grade
   */
  async trackExpertCapacity(trackingRequest, context = {}) {
    const startTime = performance.now();
    const trackingId = this.generateTrackingId();
    const traceId = context.traceId || trackingId;

    try {
      // 🛡️ Pre-flight Checks
      await this.performPreFlightChecks();

      // ✅ Validate Tracking Request
      await this.validateTrackingRequest(trackingRequest);

      // 🔍 Get Expert Capacity Data
      const capacityData = await this.getExpertCapacityData(trackingRequest.expertId);

      // 📈 Calculate Current Utilization
      const utilizationMetrics = await this.calculateUtilizationMetrics(capacityData);

      // 🎯 Assess Capacity Health
      const capacityHealth = await this.assessCapacityHealth(capacityData, utilizationMetrics);

      // 🔮 Predict Future Capacity
      const capacityPrediction = await this.predictFutureCapacity(capacityData, utilizationMetrics);

      // 🚨 Generate Alerts & Recommendations
      const alertsAndRecommendations = await this.generateCapacityAlerts(
        capacityHealth, 
        utilizationMetrics, 
        capacityPrediction
      );

      // 💾 Update Capacity Records
      const trackingRecord = await this.updateCapacityRecords({
        trackingId,
        trackingRequest,
        capacityData,
        utilizationMetrics,
        capacityHealth,
        capacityPrediction,
        alertsAndRecommendations,
        traceId
      });

      // 📊 Update Metrics
      await this.updateTrackingMetrics({
        trackingId,
        expertId: trackingRequest.expertId,
        responseTime: performance.now() - startTime,
        utilization: utilizationMetrics.overallUtilization
      });

      this.metrics.capacityChecks++;

      this.logger.business('Expert capacity tracking completed', {
        trackingId,
        traceId,
        expertId: trackingRequest.expertId,
        currentUtilization: utilizationMetrics.overallUtilization,
        capacityHealth: capacityHealth.status,
        alerts: alertsAndRecommendations.alerts.length
      });

      return {
        success: true,
        trackingId,
        expertId: trackingRequest.expertId,
        currentUtilization: utilizationMetrics.overallUtilization,
        capacityHealth: capacityHealth.status,
        availableCapacity: utilizationMetrics.availableCapacity,
        predictions: capacityPrediction.shortTerm,
        alerts: alertsAndRecommendations.alerts,
        recommendations: alertsAndRecommendations.recommendations,
        nextSteps: this.generateTrackingNextSteps(capacityHealth.status)
      };

    } catch (error) {
      await this.handleTrackingFailure({
        trackingId,
        trackingRequest,
        error,
        context,
        responseTime: performance.now() - startTime,
        traceId
      });
      throw error;
    }
  }

  /**
   * ✅ VALIDATE TRACKING REQUEST
   */
  async validateTrackingRequest(trackingRequest) {
    const validationRules = {
      requiredFields: ['expertId', 'trackingType'],
      trackingTypes: ['scheduled', 'on_demand', 'quality_triggered', 'capacity_change'],
      expertRequirements: {
        mustExist: true,
        validStatus: ['active', 'probation']
      }
    };

    const errors = [];

    // ✅ Check Required Fields
    const missingFields = validationRules.requiredFields.filter(field => !trackingRequest[field]);
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // ✅ Validate Tracking Type
    if (!validationRules.trackingTypes.includes(trackingRequest.trackingType)) {
      errors.push(`Invalid tracking type: ${trackingRequest.trackingType}`);
    }

    // ✅ Verify Expert Exists
    if (trackingRequest.expertId) {
      const expertValidation = await this.validateExpert(trackingRequest.expertId, validationRules.expertRequirements);
      if (!expertValidation.valid) {
        errors.push(`Expert validation failed: ${expertValidation.reason}`);
      }
    }

    if (errors.length > 0) {
      throw new CapacityTrackingError('TRACKING_VALIDATION_FAILED', 'Capacity tracking validation failed', {
        errors,
        expertId: trackingRequest.expertId,
        trackingType: trackingRequest.trackingType
      });
    }

    this.logger.security('Capacity tracking validation passed', {
      expertId: trackingRequest.expertId,
      trackingType: trackingRequest.trackingType
    });
  }

  /**
   * 🔍 GET EXPERT CAPACITY DATA
   */
  async getExpertCapacityData(expertId) {
    const cacheKey = `expert_capacity:${expertId}`;
    
    try {
      // 💾 Try cache first
      const cachedData = await this.redis.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData);
      }

      // 🗃️ Query comprehensive capacity data
      const capacityData = await this.prisma.expert.findUnique({
        where: { id: expertId },
        include: {
          skills: {
            include: {
              skill: true
            }
          },
          qualityMetrics: {
            orderBy: { calculatedAt: 'desc' },
            take: 5
          },
          enrollments: {
            where: {
              status: { in: ['active', 'completed'] }
            },
            include: {
              sessions: {
                where: {
                  status: { in: ['scheduled', 'in_progress'] }
                },
                select: {
                  id: true,
                  scheduledAt: true,
                  duration: true,
                  status: true
                }
              },
              student: {
                select: {
                  personalInfo: true,
                  learningStyle: true
                }
              }
            }
          },
          capacityHistory: {
            orderBy: { recordedAt: 'desc' },
            take: 30
          },
          tierHistory: {
            orderBy: { effectiveFrom: 'desc' },
            take: 1
          }
        }
      });

      if (!capacityData) {
        throw new CapacityTrackingError('EXPERT_NOT_FOUND', 'Expert not found for capacity tracking');
      }

      // 🎯 Enhance with real-time metrics
      const enhancedData = await this.enhanceWithRealTimeMetrics(capacityData);

      // 💾 Cache enhanced data
      await this.redis.setex(cacheKey, this.config.monitoring.cacheDuration, JSON.stringify(enhancedData));

      return enhancedData;

    } catch (error) {
      this.logger.error('Failed to get expert capacity data', {
        expertId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 📈 CALCULATE UTILIZATION METRICS
   */
  async calculateUtilizationMetrics(capacityData) {
    const metricsStartTime = performance.now();

    try {
      const currentTier = capacityData.currentTier;
      const tierConfig = this.config.capacity.tierLimits[currentTier];

      // 🎯 Current Student Count
      const activeStudents = capacityData.enrollments.filter(e => e.status === 'active').length;

      // ⏱️ Session Load
      const sessionLoad = this.calculateSessionLoad(capacityData.enrollments);

      // 📊 Time Utilization
      const timeUtilization = await this.calculateTimeUtilization(capacityData.id);

      // 💼 Skill Specialization Load
      const skillLoad = this.calculateSkillLoad(capacityData.skills, capacityData.enrollments);

      // 🧠 Cognitive Load Estimation
      const cognitiveLoad = this.estimateCognitiveLoad(capacityData);

      const utilizationMetrics = {
        activeStudents,
        maxCapacity: tierConfig.maxStudents,
        sessionLoad,
        timeUtilization,
        skillLoad,
        cognitiveLoad,
        overallUtilization: this.calculateOverallUtilization({
          activeStudents,
          maxCapacity: tierConfig.maxStudents,
          sessionLoad,
          timeUtilization,
          skillLoad,
          cognitiveLoad
        }),
        availableCapacity: this.calculateAvailableCapacity(activeStudents, tierConfig),
        tier: currentTier,
        calculatedAt: new Date().toISOString(),
        processingTime: performance.now() - metricsStartTime
      };

      this.logger.debug('Utilization metrics calculated', {
        expertId: capacityData.id,
        overallUtilization: utilizationMetrics.overallUtilization,
        availableCapacity: utilizationMetrics.availableCapacity,
        tier: currentTier
      });

      return utilizationMetrics;

    } catch (error) {
      this.logger.error('Utilization metrics calculation failed', {
        expertId: capacityData.id,
        error: error.message
      });

      throw new CapacityTrackingError('METRICS_CALCULATION_FAILED', 'Failed to calculate utilization metrics', {
        originalError: error.message
      });
    }
  }

  /**
   * 🎯 ASSESS CAPACITY HEALTH
   */
  async assessCapacityHealth(capacityData, utilizationMetrics) {
    const assessmentStartTime = performance.now();

    try {
      const qualityMetrics = await this.qualityMetrics.getCurrentMetrics(capacityData.id);
      const performanceMetrics = await this.performanceAnalyzer.analyzePerformance(capacityData);

      // 📊 Capacity Status
      const capacityStatus = this.determineCapacityStatus(utilizationMetrics);

      // ⭐ Quality Impact
      const qualityImpact = this.assessQualityImpact(utilizationMetrics, qualityMetrics);

      // 🚨 Risk Assessment
      const riskAssessment = this.assessCapacityRisks(utilizationMetrics, qualityMetrics, performanceMetrics);

      // 💡 Optimization Opportunities
      const optimizationOpportunities = this.identifyOptimizationOpportunities(
        utilizationMetrics, 
        qualityMetrics, 
        performanceMetrics
      );

      const capacityHealth = {
        status: capacityStatus,
        qualityImpact,
        riskAssessment,
        optimizationOpportunities,
        recommendedActions: this.generateRecommendedActions(capacityStatus, qualityImpact, riskAssessment),
        assessmentTime: performance.now() - assessmentStartTime,
        assessedAt: new Date().toISOString()
      };

      this.logger.debug('Capacity health assessment completed', {
        expertId: capacityData.id,
        status: capacityStatus,
        qualityImpact: qualityImpact.level,
        risks: riskAssessment.risks.length
      });

      return capacityHealth;

    } catch (error) {
      this.logger.error('Capacity health assessment failed', {
        expertId: capacityData.id,
        error: error.message
      });

      return {
        status: 'unknown',
        qualityImpact: { level: 'unknown', factors: [] },
        riskAssessment: { level: 'unknown', risks: [] },
        optimizationOpportunities: [],
        recommendedActions: ['further_analysis'],
        error: error.message
      };
    }
  }

  /**
   * 🔮 PREDICT FUTURE CAPACITY
   */
  async predictFutureCapacity(capacityData, utilizationMetrics) {
    const predictionStartTime = performance.now();

    try {
      // 📈 Historical Trends
      const historicalTrends = await this.analyzeHistoricalTrends(capacityData);

      // 🎯 Seasonal Patterns
      const seasonalPatterns = await this.identifySeasonalPatterns(capacityData);

      // 🔮 Predictive Modeling
      const predictiveModel = await this.predictiveScaling.generatePredictions({
        currentUtilization: utilizationMetrics.overallUtilization,
        historicalTrends,
        seasonalPatterns,
        expertTier: capacityData.currentTier
      });

      const capacityPrediction = {
        shortTerm: predictiveModel.shortTerm,
        mediumTerm: predictiveModel.mediumTerm,
        longTerm: predictiveModel.longTerm,
        confidence: predictiveModel.confidence,
        factors: predictiveModel.factors,
        predictionTime: performance.now() - predictionStartTime,
        predictedAt: new Date().toISOString()
      };

      this.logger.debug('Future capacity prediction completed', {
        expertId: capacityData.id,
        shortTerm: predictiveModel.shortTerm.utilization,
        confidence: predictiveModel.confidence
      });

      return capacityPrediction;

    } catch (error) {
      this.logger.error('Future capacity prediction failed', {
        expertId: capacityData.id,
        error: error.message
      });

      return {
        shortTerm: { utilization: utilizationMetrics.overallUtilization, trend: 'stable' },
        mediumTerm: { utilization: utilizationMetrics.overallUtilization, trend: 'unknown' },
        longTerm: { utilization: utilizationMetrics.overallUtilization, trend: 'unknown' },
        confidence: 0,
        factors: [],
        error: error.message
      };
    }
  }

  /**
   * 🚨 GENERATE CAPACITY ALERTS
   */
  async generateCapacityAlerts(capacityHealth, utilizationMetrics, capacityPrediction) {
    const alerts = [];
    const recommendations = [];

    try {
      // 🚨 Capacity Alerts
      if (utilizationMetrics.overallUtilization >= this.config.alerts.capacityWarning) {
        alerts.push({
          type: 'CAPACITY_WARNING',
          severity: 'high',
          message: `Expert at ${(utilizationMetrics.overallUtilization * 100).toFixed(1)}% capacity`,
          details: {
            currentUtilization: utilizationMetrics.overallUtilization,
            availableCapacity: utilizationMetrics.availableCapacity
          }
        });

        recommendations.push('CONSIDER_LOAD_REDISTRIBUTION');
      }

      // ⭐ Quality Alerts
      if (capacityHealth.qualityImpact.level === 'high') {
        alerts.push({
          type: 'QUALITY_DEGRADATION',
          severity: 'critical',
          message: 'Quality degradation detected due to high capacity',
          details: capacityHealth.qualityImpact.factors
        });

        recommendations.push('IMMEDIATE_CAPACITY_REDUCTION');
      }

      // 🔮 Predictive Alerts
      if (capacityPrediction.confidence > 0.7 && capacityPrediction.shortTerm.utilization > 0.9) {
        alerts.push({
          type: 'PREDICTIVE_CAPACITY_CRITICAL',
          severity: 'medium',
          message: 'Critical capacity predicted in short term',
          details: {
            predictedUtilization: capacityPrediction.shortTerm.utilization,
            confidence: capacityPrediction.confidence
          }
        });

        recommendations.push('PROACTIVE_CAPACITY_MANAGEMENT');
      }

      // 💡 Optimization Recommendations
      if (capacityHealth.optimizationOpportunities.length > 0) {
        recommendations.push(...capacityHealth.optimizationOpportunities);
      }

      return {
        alerts,
        recommendations: [...new Set(recommendations)], // Remove duplicates
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Capacity alerts generation failed', {
        error: error.message
      });

      return {
        alerts: [],
        recommendations: ['SYSTEM_MAINTENANCE_REQUIRED'],
        error: error.message
      };
    }
  }

  /**
   * 📊 MONITOR SYSTEM CAPACITY - Background Monitoring
   */
  async monitorSystemCapacity() {
    const monitoringStartTime = performance.now();
    const monitoringId = this.generateMonitoringId();

    try {
      this.logger.info('Starting system capacity monitoring', { monitoringId });

      // 🔍 Get All Active Experts
      const activeExperts = await this.getActiveExperts();

      this.serviceState.activeMonitoring = activeExperts.length;
      this.serviceState.totalExperts = activeExperts.length;

      // ⚡ Process in Batches
      const batchSize = this.config.monitoring.batchSize;
      let processed = 0;
      let alertsGenerated = 0;

      for (let i = 0; i < activeExperts.length; i += batchSize) {
        const batch = activeExperts.slice(i, i + batchSize);
        
        const batchPromises = batch.map(expert => 
          this.trackExpertCapacity({
            expertId: expert.id,
            trackingType: 'scheduled'
          }).catch(error => ({
            expertId: expert.id,
            error: error.message
          }))
        );

        const batchResults = await Promise.allSettled(batchPromises);

        for (const result of batchResults) {
          if (result.status === 'fulfilled' && result.value.success) {
            processed++;
            if (result.value.alerts && result.value.alerts.length > 0) {
              alertsGenerated += result.value.alerts.length;
              
              // 🚨 Process alerts
              for (const alert of result.value.alerts) {
                await this.alertManager.processAlert({
                  ...alert,
                  expertId: result.value.expertId
                });
              }
            }
          }
        }

        // 🕐 Brief pause between batches
        await this.delay(500);
      }

      // 📊 Update System Metrics
      await this.updateSystemMetrics();

      this.logger.business('System capacity monitoring completed', {
        monitoringId,
        totalExperts: activeExperts.length,
        processed,
        alertsGenerated,
        processingTime: performance.now() - monitoringStartTime
      });

    } catch (error) {
      this.logger.error('System capacity monitoring failed', {
        monitoringId,
        error: error.message
      });
    }
  }

  /**
   * ⚡ UPDATE REAL-TIME METRICS
   */
  async updateRealTimeMetrics() {
    try {
      // 📊 Current System Utilization
      const systemUtilization = await this.calculateSystemUtilization();

      // 🎯 Capacity Distribution
      const capacityDistribution = await this.getCapacityDistribution();

      // 🔄 Update Service State
      this.serviceState.systemCapacity = systemUtilization.totalCapacity;
      this.serviceState.utilizationRate = systemUtilization.overallUtilization;

      // 💾 Update Redis Cache
      await this.redis.setex(
        'system_capacity_metrics',
        300, // 5 minutes
        JSON.stringify({
          systemUtilization,
          capacityDistribution,
          updatedAt: new Date().toISOString()
        })
      );

      this.metrics.systemUtilization = systemUtilization.overallUtilization;

    } catch (error) {
      this.logger.error('Real-time metrics update failed', {
        error: error.message
      });
    }
  }

  /**
   * 🔄 RUN OPTIMIZATION CYCLE
   */
  async runOptimizationCycle() {
    const optimizationStartTime = performance.now();
    const optimizationId = this.generateOptimizationId();

    try {
      this.logger.info('Starting optimization cycle', { optimizationId });

      // 🔍 Identify Optimization Candidates
      const optimizationCandidates = await this.identifyOptimizationCandidates();

      // 🎯 Execute Optimizations
      let optimizationsApplied = 0;

      for (const candidate of optimizationCandidates) {
        try {
          const optimizationResult = await this.executeOptimization(candidate);
          
          if (optimizationResult.success) {
            optimizationsApplied++;
            this.metrics.rebalanceOperations++;
          }

          this.logger.debug('Optimization executed', {
            optimizationId,
            expertId: candidate.expertId,
            type: candidate.optimizationType,
            success: optimizationResult.success
          });

        } catch (error) {
          this.logger.warn('Optimization execution failed', {
            optimizationId,
            expertId: candidate.expertId,
            error: error.message
          });
        }
      }

      this.serviceState.lastOptimization = new Date();

      this.logger.business('Optimization cycle completed', {
        optimizationId,
        candidates: optimizationCandidates.length,
        optimizationsApplied,
        processingTime: performance.now() - optimizationStartTime
      });

    } catch (error) {
      this.logger.error('Optimization cycle failed', {
        optimizationId,
        error: error.message
      });
    }
  }

  /**
   * 📈 GET CAPACITY ANALYTICS
   */
  async getCapacityAnalytics(timeRange = '7d') {
    const analytics = {
      summary: {
        totalExperts: this.serviceState.totalExperts,
        systemCapacity: this.serviceState.systemCapacity,
        utilizationRate: this.serviceState.utilizationRate,
        activeMonitoring: this.serviceState.activeMonitoring
      },
      performance: {
        capacityChecks: this.metrics.capacityChecks,
        scalingEvents: this.metrics.scalingEvents,
        rebalanceOperations: this.metrics.rebalanceOperations,
        qualityViolations: this.metrics.qualityViolations
      },
      distribution: {
        byTier: await this.getCapacityByTier(),
        byUtilization: await this.getUtilizationDistribution(),
        byQuality: await this.getQualityDistribution()
      },
      trends: {
        utilizationTrend: await this.getUtilizationTrend(timeRange),
        capacityTrend: await this.getCapacityTrend(timeRange),
        qualityTrend: await this.getQualityTrend(timeRange)
      },
      alerts: {
        activeAlerts: await this.alertManager.getActiveAlerts(),
        alertTrend: await this.getAlertTrend(timeRange)
      }
    };

    return analytics;
  }

  /**
   * 🔧 UTILITY METHODS
   */

  generateTrackingId() {
    return `capacity_track_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateMonitoringId() {
    return `capacity_monitor_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateOptimizationId() {
    return `capacity_optimize_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  calculateSessionLoad(enrollments) {
    const activeSessions = enrollments.flatMap(e => 
      e.sessions.filter(s => ['scheduled', 'in_progress'].includes(s.status))
    ).length;

    const maxConcurrent = this.config.capacity.qualityThresholds.maxConcurrentSessions;
    return maxConcurrent > 0 ? activeSessions / maxConcurrent : 0;
  }

  calculateOverallUtilization(metrics) {
    const weights = {
      studentCount: 0.4,
      sessionLoad: 0.3,
      timeUtilization: 0.2,
      cognitiveLoad: 0.1
    };

    return (
      (metrics.activeStudents / metrics.maxCapacity) * weights.studentCount +
      metrics.sessionLoad * weights.sessionLoad +
      metrics.timeUtilization * weights.timeUtilization +
      metrics.cognitiveLoad * weights.cognitiveLoad
    );
  }

  calculateAvailableCapacity(activeStudents, tierConfig) {
    if (!tierConfig.maxStudents) return Infinity; // Master tier
    return Math.max(0, tierConfig.maxStudents - activeStudents);
  }

  determineCapacityStatus(utilizationMetrics) {
    const utilization = utilizationMetrics.overallUtilization;
    
    if (utilization >= 0.9) return 'critical';
    if (utilization >= 0.8) return 'high';
    if (utilization >= 0.6) return 'moderate';
    if (utilization >= 0.3) return 'optimal';
    return 'underutilized';
  }

  generateTrackingNextSteps(status) {
    const nextSteps = {
      critical: ['immediate_action', 'load_redistribution', 'quality_review'],
      high: ['monitor_closely', 'consider_redistribution', 'quality_check'],
      moderate: ['continue_monitoring', 'periodic_review'],
      optimal: ['maintain_current', 'growth_planning'],
      underutilized: ['growth_opportunities', 'skill_development']
    };

    return nextSteps[status] || ['continue_monitoring'];
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
      const backgroundJobsHealthy = this.monitoringInterval && this.realTimeInterval && this.optimizationInterval;

      this.serviceState.healthy = backgroundJobsHealthy;
      this.serviceState.lastHealthCheck = new Date();

      if (!this.serviceState.healthy) {
        this.logger.warn('Capacity tracker health check failed', {
          backgroundJobsHealthy
        });
      }

      return this.serviceState.healthy;

    } catch (error) {
      this.serviceState.healthy = false;
      this.logger.error('Capacity tracker health check failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * 📊 LOAD INITIAL CAPACITY
   */
  async loadInitialCapacity() {
    try {
      const systemCapacity = await this.calculateSystemCapacity();
      
      this.serviceState.systemCapacity = systemCapacity.total;
      this.serviceState.totalExperts = systemCapacity.expertCount;
      this.serviceState.utilizationRate = systemCapacity.utilization;

      this.logger.debug('Initial capacity data loaded', {
        totalExperts: systemCapacity.expertCount,
        systemCapacity: systemCapacity.total,
        utilizationRate: systemCapacity.utilization
      });

    } catch (error) {
      this.logger.error('Failed to load initial capacity data', {
        error: error.message
      });
    }
  }

  /**
   * 🎯 ERROR HANDLING
   */
  async handleTrackingFailure({ trackingId, trackingRequest, error, context, responseTime, traceId }) {
    this.logger.error('Capacity tracking failed', {
      trackingId,
      traceId,
      expertId: trackingRequest.expertId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2)
    });
  }

  /**
   * 🧹 CLEANUP
   */
  async destroy() {
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);
    if (this.realTimeInterval) clearInterval(this.realTimeInterval);
    if (this.optimizationInterval) clearInterval(this.optimizationInterval);
    
    await this.prisma.$disconnect();
    await this.redis.quit();
  }
}

/**
 * 🎯 ENTERPRISE CAPACITY TRACKING ERROR CLASS
 */
class CapacityTrackingError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'CapacityTrackingError';
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

// 🎯 Enterprise Capacity Tracking Error Codes
CapacityTrackingError.CODES = {
  // 🔐 Validation Errors
  TRACKING_VALIDATION_FAILED: 'TRACKING_VALIDATION_FAILED',
  EXPERT_NOT_FOUND: 'EXPERT_NOT_FOUND',
  INVALID_TRACKING_TYPE: 'INVALID_TRACKING_TYPE',

  // 📊 Metrics Errors
  METRICS_CALCULATION_FAILED: 'METRICS_CALCULATION_FAILED',
  DATA_EXTRACTION_FAILED: 'DATA_EXTRACTION_FAILED',
  REAL_TIME_METRICS_UNAVAILABLE: 'REAL_TIME_METRICS_UNAVAILABLE',

  // 🎯 Analysis Errors
  CAPACITY_ASSESSMENT_FAILED: 'CAPACITY_ASSESSMENT_FAILED',
  QUALITY_IMPACT_ANALYSIS_FAILED: 'QUALITY_IMPACT_ANALYSIS_FAILED',
  RISK_ASSESSMENT_FAILED: 'RISK_ASSESSMENT_FAILED',

  // 🔮 Prediction Errors
  PREDICTION_MODEL_FAILED: 'PREDICTION_MODEL_FAILED',
  HISTORICAL_DATA_INSUFFICIENT: 'HISTORICAL_DATA_INSUFFICIENT',
  SEASONAL_PATTERN_ANALYSIS_FAILED: 'SEASONAL_PATTERN_ANALYSIS_FAILED',

  // 🚨 Alert Errors
  ALERT_GENERATION_FAILED: 'ALERT_GENERATION_FAILED',
  ALERT_ESCALATION_FAILED: 'ALERT_ESCALATION_FAILED'
};

module.exports = {
  CapacityTracker,
  CapacityTrackingError
};