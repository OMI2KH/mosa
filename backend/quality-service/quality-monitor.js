// quality-service/quality-monitor.js

/**
 * 🛡️ ENTERPRISE QUALITY MONITORING SYSTEM
 * Real-time quality tracking, auto-enforcement, and performance management
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../utils/logger');
const { AlertManager } = require('../utils/alert-manager');
const { MetricsCollector } = require('../utils/metrics-collector');

class QualityMonitor extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('QualityMonitor');
    this.alertManager = new AlertManager();
    this.metrics = new MetricsCollector();
    
    // Quality thresholds configuration
    this.thresholds = {
      MASTER: { minScore: 4.7, completionRate: 0.8, responseTime: 4 },
      SENIOR: { minScore: 4.3, completionRate: 0.75, responseTime: 8 },
      STANDARD: { minScore: 4.0, completionRate: 0.7, responseTime: 12 },
      DEVELOPING: { minScore: 3.5, completionRate: 0.6, responseTime: 24 },
      PROBATION: { minScore: 0, completionRate: 0.5, responseTime: 48 }
    };

    // Monitoring intervals
    this.intervals = {
      REAL_TIME: 5000, // 5 seconds
      DAILY_CHECK: 3600000, // 1 hour
      WEEKLY_AUDIT: 604800000 // 1 week
    };

    this.monitoringJobs = new Map();
    this.initialize();
  }

  /**
   * 🚀 INITIALIZE QUALITY MONITORING SYSTEM
   */
  async initialize() {
    try {
      await this.redis.ping();
      
      // Start monitoring jobs
      this.startRealTimeMonitoring();
      this.startDailyQualityChecks();
      this.startWeeklyAudits();
      
      // Warm up quality cache
      await this.warmUpQualityCache();
      
      this.logger.info('Quality monitoring system initialized successfully');
      this.emit('systemReady');
      
    } catch (error) {
      this.logger.error('Failed to initialize quality monitoring system', error);
      throw error;
    }
  }

  /**
   * 📊 REAL-TIME QUALITY MONITORING
   */
  startRealTimeMonitoring() {
    const job = setInterval(async () => {
      try {
        await this.performRealTimeQualityScan();
      } catch (error) {
        this.logger.error('Real-time monitoring error', error);
      }
    }, this.intervals.REAL_TIME);

    this.monitoringJobs.set('realTime', job);
    this.logger.info('Real-time quality monitoring started');
  }

  /**
   * 🔍 PERFORM REAL-TIME QUALITY SCAN
   */
  async performRealTimeQualityScan() {
    const startTime = performance.now();
    
    try {
      // Get experts needing immediate attention
      const criticalExperts = await this.getExpertsWithCriticalIssues();
      
      for (const expert of criticalExperts) {
        await this.handleCriticalExpert(expert);
      }

      // Update real-time quality metrics
      await this.updateRealTimeMetrics();

      // Check for quality threshold breaches
      await this.checkThresholdBreaches();

      const processingTime = performance.now() - startTime;
      this.metrics.record('realtime_scan_duration', processingTime);

    } catch (error) {
      this.logger.error('Real-time quality scan failed', error);
      this.emit('monitoringError', error);
    }
  }

  /**
   * 🚨 GET EXPERTS WITH CRITICAL ISSUES
   */
  async getExpertsWithCriticalIssues() {
    const cacheKey = 'quality:critical_experts';
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const criticalExperts = await this.prisma.expert.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { qualityScore: { lt: 3.0 } },
          { completionRate: { lt: 0.5 } },
          { responseTime: { gt: 48 } },
          { studentComplaints: { gt: 3 } }
        ]
      },
      include: {
        ratings: {
          where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        trainingSessions: {
          where: { 
            status: 'COMPLETED',
            completedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          },
          take: 20
        }
      }
    });

    // Cache for 2 minutes
    await this.redis.setex(cacheKey, 120, JSON.stringify(criticalExperts));

    return criticalExperts;
  }

  /**
   * ⚡ HANDLE CRITICAL EXPERT SITUATIONS
   */
  async handleCriticalExpert(expert) {
    const expertKey = `quality:expert:${expert.id}:status`;
    const currentStatus = await this.redis.get(expertKey);

    if (currentStatus === 'HANDLED') return;

    const issues = this.identifyExpertIssues(expert);
    
    if (issues.length > 0) {
      await this.executeAutoEnforcement(expert, issues);
      await this.redis.setex(expertKey, 3600, 'HANDLED'); // Prevent duplicate handling for 1 hour
      
      this.emit('expertQualityAlert', {
        expertId: expert.id,
        expertName: expert.name,
        issues,
        qualityScore: expert.qualityScore,
        timestamp: new Date()
      });
    }
  }

  /**
   * 🔎 IDENTIFY EXPERT QUALITY ISSUES
   */
  identifyExpertIssues(expert) {
    const issues = [];
    const threshold = this.thresholds[expert.currentTier] || this.thresholds.STANDARD;

    if (expert.qualityScore < threshold.minScore) {
      issues.push({
        type: 'LOW_QUALITY_SCORE',
        current: expert.qualityScore,
        required: threshold.minScore,
        severity: 'HIGH'
      });
    }

    if (expert.completionRate < threshold.completionRate) {
      issues.push({
        type: 'LOW_COMPLETION_RATE',
        current: expert.completionRate,
        required: threshold.completionRate,
        severity: 'HIGH'
      });
    }

    if (expert.responseTime > threshold.responseTime) {
      issues.push({
        type: 'SLOW_RESPONSE_TIME',
        current: expert.responseTime,
        required: threshold.responseTime,
        severity: 'MEDIUM'
      });
    }

    if (expert.studentComplaints > 2) {
      issues.push({
        type: 'HIGH_COMPLAINT_RATE',
        current: expert.studentComplaints,
        allowed: 2,
        severity: 'CRITICAL'
      });
    }

    // Check rating trends
    const trend = this.calculateRatingTrend(expert.ratings);
    if (trend === 'declining') {
      issues.push({
        type: 'DECLINING_PERFORMANCE',
        trend: 'declining',
        severity: 'MEDIUM'
      });
    }

    return issues;
  }

  /**
   * ⚖️ EXECUTE AUTO-ENFORCEMENT ACTIONS
   */
  async executeAutoEnforcement(expert, issues) {
    const actions = [];
    const criticalIssues = issues.filter(issue => issue.severity === 'CRITICAL');
    const highIssues = issues.filter(issue => issue.severity === 'HIGH');

    // 🚨 CRITICAL ACTIONS
    if (criticalIssues.length > 0) {
      actions.push(await this.suspendNewEnrollments(expert.id));
      actions.push(await this.notifyAdminTeam(expert, 'CRITICAL_QUALITY_ISSUE'));
      actions.push(await this.triggerImmediateReview(expert.id));
    }

    // ⚠️ HIGH SEVERITY ACTIONS
    if (highIssues.length > 0) {
      actions.push(await this.demoteExpertTier(expert.id));
      actions.push(await this.createImprovementPlan(expert.id, issues));
      actions.push(await this.notifyExpert(expert.id, 'QUALITY_IMPROVEMENT_REQUIRED'));
    }

    // 📋 MEDIUM SEVERITY ACTIONS
    const mediumIssues = issues.filter(issue => issue.severity === 'MEDIUM');
    if (mediumIssues.length > 0) {
      actions.push(await this.sendQualityWarning(expert.id, issues));
      actions.push(await this.scheduleQualityTraining(expert.id));
    }

    // Log all enforcement actions
    await this.logEnforcementActions(expert.id, actions, issues);

    this.emit('autoEnforcementExecuted', {
      expertId: expert.id,
      actions: actions.map(a => a.type),
      issues: issues.map(i => i.type),
      timestamp: new Date()
    });

    return actions;
  }

  /**
   * ⏸️ SUSPEND NEW ENROLLMENTS
   */
  async suspendNewEnrollments(expertId) {
    await this.prisma.expert.update({
      where: { id: expertId },
      data: { 
        status: 'RESTRICTED',
        restrictionReason: 'QUALITY_ISSUES',
        restrictedAt: new Date()
      }
    });

    // Update cache
    await this.redis.setex(`expert:${expertId}:status`, 3600, 'RESTRICTED');

    return { type: 'ENROLLMENT_SUSPENSION', expertId, timestamp: new Date() };
  }

  /**
   * 📉 DEMOTE EXPERT TIER
   */
  async demoteExpertTier(expertId) {
    const expert = await this.prisma.expert.findUnique({
      where: { id: expertId },
      select: { currentTier: true, qualityScore: true }
    });

    const tiers = ['MASTER', 'SENIOR', 'STANDARD', 'DEVELOPING', 'PROBATION'];
    const currentIndex = tiers.indexOf(expert.currentTier);
    const newTier = currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : 'PROBATION';

    await this.prisma.expert.update({
      where: { id: expertId },
      data: { 
        currentTier: newTier,
        tierDemotedAt: new Date(),
        previousTier: expert.currentTier
      }
    });

    // Update payout rate based on new tier
    await this.updatePayoutRate(expertId, newTier);

    return { 
      type: 'TIER_DEMOTION', 
      expertId, 
      from: expert.currentTier, 
      to: newTier,
      timestamp: new Date() 
    };
  }

  /**
   * 📈 PROMOTE EXPERT TIER
   */
  async promoteExpertTier(expertId) {
    const expert = await this.prisma.expert.findUnique({
      where: { id: expertId },
      include: {
        ratings: {
          where: { 
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        trainingSessions: {
          where: { 
            status: 'COMPLETED',
            completedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        }
      }
    });

    const tiers = ['MASTER', 'SENIOR', 'STANDARD', 'DEVELOPING', 'PROBATION'];
    const currentIndex = tiers.indexOf(expert.currentTier);
    
    if (currentIndex === 0) return null; // Already at highest tier

    const targetTier = tiers[currentIndex - 1];
    const targetThreshold = this.thresholds[targetTier];

    // Check if expert qualifies for promotion
    const qualifies = 
      expert.qualityScore >= targetThreshold.minScore &&
      expert.completionRate >= targetThreshold.completionRate &&
      expert.responseTime <= targetThreshold.responseTime &&
      expert.ratings.length >= 10 && // Minimum ratings for promotion
      expert.trainingSessions.length >= 5; // Minimum sessions

    if (qualifies) {
      await this.prisma.expert.update({
        where: { id: expertId },
        data: { 
          currentTier: targetTier,
          tierPromotedAt: new Date(),
          previousTier: expert.currentTier
        }
      });

      // Update payout rate based on new tier
      await this.updatePayoutRate(expertId, targetTier);

      this.emit('expertPromoted', {
        expertId,
        from: expert.currentTier,
        to: targetTier,
        qualityScore: expert.qualityScore,
        timestamp: new Date()
      });

      return { 
        type: 'TIER_PROMOTION', 
        expertId, 
        from: expert.currentTier, 
        to: targetTier,
        timestamp: new Date() 
      };
    }

    return null;
  }

  /**
   * 💰 UPDATE PAYOUT RATE BASED ON TIER
   */
  async updatePayoutRate(expertId, tier) {
    const bonusRates = {
      MASTER: 0.2,    // +20% bonus
      SENIOR: 0.1,    // +10% bonus
      STANDARD: 0,    // Base rate
      DEVELOPING: -0.1, // -10% penalty
      PROBATION: -0.2  // -20% penalty
    };

    const bonusRate = bonusRates[tier] || 0;
    
    await this.prisma.expert.update({
      where: { id: expertId },
      data: { bonusRate }
    });

    await this.redis.hset(`expert:payout:${expertId}`, 'bonusRate', bonusRate);
  }

  /**
   * 📝 CREATE IMPROVEMENT PLAN
   */
  async createImprovementPlan(expertId, issues) {
    const plan = {
      expertId,
      issues: issues.map(issue => ({
        type: issue.type,
        currentValue: issue.current,
        targetValue: issue.required || issue.allowed,
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 2 weeks
      })),
      createdAt: new Date(),
      status: 'ACTIVE'
    };

    await this.prisma.improvementPlan.create({
      data: plan
    });

    // Schedule follow-up check
    await this.scheduleImprovementCheck(expertId, plan.issues[0].deadline);

    return { type: 'IMPROVEMENT_PLAN_CREATED', expertId, planId: plan.id };
  }

  /**
   * ⏰ SCHEDULE IMPROVEMENT CHECK
   */
  async scheduleImprovementCheck(expertId, deadline) {
    const delay = deadline.getTime() - Date.now();
    
    setTimeout(async () => {
      await this.checkImprovementProgress(expertId);
    }, delay);
  }

  /**
   * 📊 CHECK IMPROVEMENT PROGRESS
   */
  async checkImprovementProgress(expertId) {
    const expert = await this.prisma.expert.findUnique({
      where: { id: expertId },
      include: {
        improvementPlans: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        ratings: {
          where: { createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } }
        }
      }
    });

    if (!expert.improvementPlans.length) return;

    const currentPlan = expert.improvementPlans[0];
    const issuesResolved = this.evaluateImprovementProgress(expert, currentPlan);

    if (issuesResolved) {
      await this.prisma.improvementPlan.update({
        where: { id: currentPlan.id },
        data: { status: 'COMPLETED', completedAt: new Date() }
      });

      this.emit('improvementPlanCompleted', { expertId, planId: currentPlan.id });
    } else {
      // Extend plan or take stricter actions
      await this.handleFailedImprovement(expertId, currentPlan);
    }
  }

  /**
   * 📈 EVALUATE IMPROVEMENT PROGRESS
   */
  evaluateImprovementProgress(expert, plan) {
    let resolvedIssues = 0;

    plan.issues.forEach(issue => {
      const currentValue = this.getCurrentMetricValue(expert, issue.type);
      const targetValue = issue.targetValue;

      if (this.isMetricImproved(currentValue, targetValue, issue.type)) {
        resolvedIssues++;
      }
    });

    return resolvedIssues >= plan.issues.length * 0.8; // 80% of issues resolved
  }

  /**
   * 📋 GET CURRENT METRIC VALUE
   */
  getCurrentMetricValue(expert, issueType) {
    switch (issueType) {
      case 'LOW_QUALITY_SCORE':
        return expert.qualityScore;
      case 'LOW_COMPLETION_RATE':
        return expert.completionRate;
      case 'SLOW_RESPONSE_TIME':
        return expert.responseTime;
      case 'HIGH_COMPLAINT_RATE':
        return expert.studentComplaints;
      default:
        return null;
    }
  }

  /**
   * 📊 CHECK METRIC IMPROVEMENT
   */
  isMetricImproved(currentValue, targetValue, issueType) {
    switch (issueType) {
      case 'LOW_QUALITY_SCORE':
      case 'LOW_COMPLETION_RATE':
        return currentValue >= targetValue;
      case 'SLOW_RESPONSE_TIME':
      case 'HIGH_COMPLAINT_RATE':
        return currentValue <= targetValue;
      default:
        return false;
    }
  }

  /**
   * 🚨 HANDLE FAILED IMPROVEMENT
   */
  async handleFailedImprovement(expertId, plan) {
    // Extend the improvement plan
    const newDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week extension
    
    await this.prisma.improvementPlan.update({
      where: { id: plan.id },
      data: {
        issues: plan.issues.map(issue => ({
          ...issue,
          deadline: newDeadline
        })),
        extensions: (plan.extensions || 0) + 1
      }
    });

    // Notify admin for manual intervention
    await this.notifyAdminTeam(expertId, 'IMPROVEMENT_PLAN_FAILED');

    this.emit('improvementPlanExtended', { expertId, planId: plan.id, newDeadline });
  }

  /**
   * 📊 DAILY QUALITY CHECKS
   */
  startDailyQualityChecks() {
    const job = setInterval(async () => {
      try {
        await this.performDailyQualityAudit();
      } catch (error) {
        this.logger.error('Daily quality check error', error);
      }
    }, this.intervals.DAILY_CHECK);

    this.monitoringJobs.set('dailyCheck', job);
    this.logger.info('Daily quality checks started');
  }

  /**
   * 🔍 PERFORM DAILY QUALITY AUDIT
   */
  async performDailyQualityAudit() {
    const startTime = performance.now();

    try {
      // 1. Update all expert quality scores
      await this.updateAllExpertQualityScores();

      // 2. Check for tier promotions
      await this.processTierPromotions();

      // 3. Generate daily quality report
      await this.generateDailyQualityReport();

      // 4. Clean up old data
      await this.cleanupOldQualityData();

      const processingTime = performance.now() - startTime;
      this.metrics.record('daily_audit_duration', processingTime);

      this.logger.info('Daily quality audit completed', { processingTime: `${processingTime.toFixed(2)}ms` });

    } catch (error) {
      this.logger.error('Daily quality audit failed', error);
    }
  }

  /**
   * 📈 UPDATE ALL EXPERT QUALITY SCORES
   */
  async updateAllExpertQualityScores() {
    const experts = await this.prisma.expert.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true }
    });

    let updatedCount = 0;

    for (const expert of experts) {
      try {
        const newScore = await this.calculateCurrentQualityScore(expert.id);
        
        await this.prisma.expert.update({
          where: { id: expert.id },
          data: { 
            qualityScore: newScore,
            lastQualityUpdate: new Date()
          }
        });

        // Update cache
        await this.redis.hset(`expert:metrics:${expert.id}`, 'qualityScore', newScore);

        updatedCount++;

      } catch (error) {
        this.logger.error(`Failed to update quality score for expert ${expert.id}`, error);
      }
    }

    this.logger.info('Expert quality scores updated', { updatedCount, total: experts.length });
  }

  /**
   * 🎯 CALCULATE CURRENT QUALITY SCORE
   */
  async calculateCurrentQualityScore(expertId) {
    const [ratings, sessions, complaints] = await Promise.all([
      this.prisma.rating.findMany({
        where: {
          expertId,
          status: 'ACTIVE',
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        },
        select: { rating: true, categories: true }
      }),
      this.prisma.trainingSession.findMany({
        where: {
          expertId,
          status: { in: ['COMPLETED', 'CANCELLED'] },
          scheduledAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        },
        select: { status: true, completedAt: true, scheduledAt: true }
      }),
      this.prisma.complaint.findMany({
        where: {
          expertId,
          status: 'OPEN',
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        },
        select: { severity: true }
      })
    ]);

    // Calculate weighted quality score
    const ratingScore = this.calculateWeightedRatingScore(ratings);
    const completionScore = this.calculateCompletionScore(sessions);
    const complaintPenalty = this.calculateComplaintPenalty(complaints);

    const finalScore = Math.max(1, ratingScore * completionScore - complaintPenalty);
    return Math.min(5, finalScore); // Cap at 5
  }

  /**
   * ⚖️ CALCULATE WEIGHTED RATING SCORE
   */
  calculateWeightedRatingScore(ratings) {
    if (ratings.length === 0) return 4.0; // Default score

    const recentRatings = ratings.filter(r => 
      r.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const weights = recentRatings.length > 0 ? 0.7 : 0.3; // Prefer recent ratings

    const allTimeAvg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    const recentAvg = recentRatings.length > 0 ? 
      recentRatings.reduce((sum, r) => sum + r.rating, 0) / recentRatings.length : allTimeAvg;

    return (allTimeAvg * (1 - weights)) + (recentAvg * weights);
  }

  /**
   * ✅ CALCULATE COMPLETION SCORE
   */
  calculateCompletionScore(sessions) {
    if (sessions.length === 0) return 1.0;

    const completed = sessions.filter(s => s.status === 'COMPLETED').length;
    const completionRate = completed / sessions.length;

    // Convert completion rate to score multiplier (0.7-1.3 range)
    return 0.7 + (completionRate * 0.6);
  }

  /**
   * 🚫 CALCULATE COMPLAINT PENALTY
   */
  calculateComplaintPenalty(complaints) {
    const criticalComplaints = complaints.filter(c => c.severity === 'CRITICAL').length;
    const majorComplaints = complaints.filter(c => c.severity === 'HIGH').length;
    const minorComplaints = complaints.filter(c => c.severity === 'MEDIUM').length;

    return (criticalComplaints * 0.5) + (majorComplaints * 0.3) + (minorComplaints * 0.1);
  }

  /**
   * 📈 PROCESS TIER PROMOTIONS
   */
  async processTierPromotions() {
    const eligibleExperts = await this.prisma.expert.findMany({
      where: {
        status: 'ACTIVE',
        currentTier: { in: ['SENIOR', 'STANDARD', 'DEVELOPING', 'PROBATION'] }
      },
      select: { id: true }
    });

    let promotedCount = 0;

    for (const expert of eligibleExperts) {
      const promotion = await this.promoteExpertTier(expert.id);
      if (promotion) {
        promotedCount++;
      }
    }

    this.logger.info('Tier promotions processed', { promotedCount, total: eligibleExperts.length });
  }

  /**
   * 📊 GENERATE DAILY QUALITY REPORT
   */
  async generateDailyQualityReport() {
    const report = {
      timestamp: new Date(),
      summary: {
        totalExperts: await this.prisma.expert.count({ where: { status: 'ACTIVE' } }),
        averageQualityScore: await this.getAverageQualityScore(),
        tierDistribution: await this.getTierDistribution(),
        criticalIssues: await this.getCriticalIssuesCount()
      },
      alerts: await this.getDailyAlerts(),
      recommendations: await this.generateQualityRecommendations()
    };

    // Store report
    await this.prisma.qualityReport.create({
      data: report
    });

    // Cache for dashboard
    await this.redis.setex('quality:daily_report', 86400, JSON.stringify(report));

    this.emit('dailyReportGenerated', report);
    return report;
  }

  /**
   * 🧹 CLEANUP OLD QUALITY DATA
   */
  async cleanupOldQualityData() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    await this.prisma.qualityReport.deleteMany({
      where: { timestamp: { lt: ninetyDaysAgo } }
    });

    await this.prisma.improvementPlan.deleteMany({
      where: { 
        status: 'COMPLETED',
        completedAt: { lt: ninetyDaysAgo }
      }
    });

    this.logger.info('Old quality data cleaned up');
  }

  /**
   * 📈 UPDATE REAL-TIME METRICS
   */
  async updateRealTimeMetrics() {
    const metrics = {
      activeExperts: await this.prisma.expert.count({ where: { status: 'ACTIVE' } }),
      averageQuality: await this.getAverageQualityScore(),
      criticalAlerts: await this.getCriticalIssuesCount(),
      systemHealth: await this.calculateSystemHealth()
    };

    await this.redis.hset('quality:realtime_metrics', metrics);
    await this.redis.expire('quality:realtime_metrics', 300); // 5 minutes TTL

    this.metrics.record('realtime_metrics_updated', Date.now());
  }

  /**
   * 🏥 CALCULATE SYSTEM HEALTH
   */
  async calculateSystemHealth() {
    const totalExperts = await this.prisma.expert.count({ where: { status: 'ACTIVE' } });
    const problematicExperts = await this.prisma.expert.count({
      where: {
        status: 'ACTIVE',
        OR: [
          { qualityScore: { lt: 3.0 } },
          { completionRate: { lt: 0.5 } }
        ]
      }
    });

    const healthScore = 100 - (problematicExperts / totalExperts * 100);
    return Math.max(0, healthScore);
  }

  /**
   * 🔥 WARM UP QUALITY CACHE
   */
  async warmUpQualityCache() {
    try {
      const [metrics, distribution, recentAlerts] = await Promise.all([
        this.getAverageQualityScore(),
        this.getTierDistribution(),
        this.getRecentAlerts(10)
      ]);

      const warmupData = {
        metrics,
        distribution,
        recentAlerts,
        lastUpdated: new Date()
      };

      await this.redis.setex('quality:cache_warmup', 1800, JSON.stringify(warmupData));
      this.logger.info('Quality cache warmed up successfully');

    } catch (error) {
      this.logger.error('Failed to warm up quality cache', error);
    }
  }

  /**
   * 📊 GET AVERAGE QUALITY SCORE
   */
  async getAverageQualityScore() {
    const result = await this.prisma.expert.aggregate({
      where: { status: 'ACTIVE' },
      _avg: { qualityScore: true }
    });

    return result._avg.qualityScore || 4.0;
  }

  /**
   * 🎯 GET TIER DISTRIBUTION
   */
  async getTierDistribution() {
    const distribution = await this.prisma.expert.groupBy({
      by: ['currentTier'],
      where: { status: 'ACTIVE' },
      _count: { id: true }
    });

    return distribution.reduce((acc, curr) => {
      acc[curr.currentTier] = curr._count.id;
      return acc;
    }, {});
  }

  /**
   * 🚨 GET CRITICAL ISSUES COUNT
   */
  async getCriticalIssuesCount() {
    return await this.prisma.expert.count({
      where: {
        status: 'ACTIVE',
        qualityScore: { lt: 3.0 }
      }
    });
  }

  /**
   * 📋 GET DAILY ALERTS
   */
  async getDailyAlerts() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return await this.prisma.qualityAlert.findMany({
      where: {
        createdAt: { gte: twentyFourHoursAgo },
        severity: { in: ['HIGH', 'CRITICAL'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  /**
   * 💡 GENERATE QUALITY RECOMMENDATIONS
   */
  async generateQualityRecommendations() {
    const recommendations = [];

    // Check for system-wide issues
    const avgQuality = await this.getAverageQualityScore();
    if (avgQuality < 4.0) {
      recommendations.push({
        type: 'SYSTEM_WIDE_QUALITY_ISSUE',
        description: `Average quality score (${avgQuality}) below target (4.0)`,
        action: 'Review quality standards and provide additional training'
      });
    }

    // Check tier distribution
    const distribution = await this.getTierDistribution();
    const probationCount = distribution.PROBATION || 0;
    if (probationCount > 10) {
      recommendations.push({
        type: 'HIGH_PROBATION_RATE',
        description: `${probationCount} experts in probation tier`,
        action: 'Implement targeted improvement programs'
      });
    }

    return recommendations;
  }

  /**
   * 📝 LOG ENFORCEMENT ACTIONS
   */
  async logEnforcementActions(expertId, actions, issues) {
    await this.prisma.enforcementLog.create({
      data: {
        expertId,
        actions: actions.map(a => a.type),
        issues: issues.map(i => i.type),
        metadata: {
          actions,
          issues,
          automated: true
        },
        createdAt: new Date()
      }
    });
  }

  /**
   * 🔔 NOTIFY ADMIN TEAM
   */
  async notifyAdminTeam(expert, reason) {
    // Implementation for admin notification
    this.alertManager.sendAdminAlert({
      type: 'QUALITY_ISSUE',
      expertId: expert.id,
      expertName: expert.name,
      reason,
      severity: 'HIGH',
      timestamp: new Date()
    });
  }

  /**
   * 📧 NOTIFY EXPERT
   */
  async notifyExpert(expertId, messageType) {
    // Implementation for expert notification
    this.alertManager.sendExpertNotification(expertId, messageType);
  }

  /**
   * 🎯 CALCULATE RATING TREND
   */
  calculateRatingTrend(ratings) {
    if (ratings.length < 5) return 'stable';

    const recent = ratings.slice(0, Math.floor(ratings.length / 2));
    const older = ratings.slice(Math.floor(ratings.length / 2));

    const recentAvg = recent.reduce((sum, r) => sum + r.rating, 0) / recent.length;
    const olderAvg = older.reduce((sum, r) => sum + r.rating, 0) / older.length;

    if (recentAvg > olderAvg + 0.2) return 'improving';
    if (recentAvg < olderAvg - 0.2) return 'declining';
    return 'stable';
  }

  /**
   * 🛑 STOP MONITORING
   */
  async stopMonitoring() {
    this.monitoringJobs.forEach((job, name) => {
      clearInterval(job);
      this.logger.info(`Stopped monitoring job: ${name}`);
    });

    this.monitoringJobs.clear();
    await this.redis.quit();
    await this.prisma.$disconnect();

    this.logger.info('Quality monitoring system stopped');
  }
}

// Export singleton instance
module.exports = new QualityMonitor();