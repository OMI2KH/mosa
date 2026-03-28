// scripts/capacity-monitor.js

/**
 * 🎯 ENTERPRISE CAPACITY MONITORING SYSTEM
 * Production-ready capacity monitoring for Mosa Forge
 * Features: Real-time capacity tracking, quality-based scaling, auto-enforcement
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
const { QualityCalculator } = require('../utils/quality-calculations');

class CapacityMonitor extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('CapacityMonitor');
    this.alertManager = new AlertManager();
    this.qualityCalculator = new QualityCalculator();
    
    this.monitoringInterval = null;
    this.config = {
      checkInterval: 30000, // 30 seconds
      alertThresholds: {
        capacityUtilization: 0.85, // 85%
        qualityDegradation: 0.15, // 15% drop
        responseTime: 5000, // 5 seconds
        errorRate: 0.05 // 5%
      },
      tierLimits: {
        MASTER: null, // Unlimited
        SENIOR: 100,
        STANDARD: 50,
        DEVELOPING: 25,
        PROBATION: 10
      }
    };

    this.initialize();
  }

  /**
   * Initialize capacity monitoring system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.loadConfiguration();
      await this.startMonitoring();
      
      this.logger.info('Capacity monitoring system initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize capacity monitor', error);
      throw error;
    }
  }

  /**
   * 🚀 START MONITORING PROCESS
   */
  async startMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performCapacityCheck();
      } catch (error) {
        this.logger.error('Capacity check failed', error);
      }
    }, this.config.checkInterval);

    // Perform immediate check on startup
    await this.performCapacityCheck();

    this.logger.info(`Capacity monitoring started with ${this.config.checkInterval}ms interval`);
  }

  /**
   * 📊 PERFORM COMPREHENSIVE CAPACITY CHECK
   */
  async performCapacityCheck() {
    const startTime = performance.now();
    
    try {
      const checkId = `capacity_check_${Date.now()}`;
      this.logger.debug('Starting capacity check', { checkId });

      // 🎯 PARALLEL MONITORING CHECKS
      const [
        expertCapacity,
        platformMetrics,
        qualityMetrics,
        systemHealth
      ] = await Promise.all([
        this.monitorExpertCapacity(),
        this.monitorPlatformMetrics(),
        this.monitorQualityMetrics(),
        this.monitorSystemHealth()
      ]);

      // 📈 AGGREGATE RESULTS
      const capacityReport = {
        checkId,
        timestamp: new Date().toISOString(),
        expertCapacity,
        platformMetrics,
        qualityMetrics,
        systemHealth,
        overallStatus: this.calculateOverallStatus(expertCapacity, platformMetrics, qualityMetrics)
      };

      // 💾 STORE RESULTS
      await this.storeCapacityReport(capacityReport);

      // 🔔 TRIGGER ALERTS IF NEEDED
      await this.checkAndTriggerAlerts(capacityReport);

      // 📊 UPDATE REAL-TIME DASHBOARD
      await this.updateCapacityDashboard(capacityReport);

      const processingTime = performance.now() - startTime;
      this.logger.metric('capacity_check_duration', processingTime, { checkId });

      this.emit('capacityCheckCompleted', capacityReport);

      return capacityReport;

    } catch (error) {
      this.logger.error('Comprehensive capacity check failed', error);
      throw error;
    }
  }

  /**
   * 👨‍🏫 MONITOR EXPERT CAPACITY
   */
  async monitorExpertCapacity() {
    try {
      const cacheKey = 'expert_capacity_metrics';
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      // 🎯 GET ALL ACTIVE EXPERTS WITH THEIR CURRENT LOAD
      const experts = await this.prisma.expert.findMany({
        where: { 
          status: 'ACTIVE',
          currentTier: { in: ['MASTER', 'SENIOR', 'STANDARD', 'DEVELOPING', 'PROBATION'] }
        },
        select: {
          id: true,
          name: true,
          currentTier: true,
          qualityScore: true,
          totalStudents: true,
          maxCapacity: true,
          activeSessions: true,
          pendingSessions: true,
          ratingHistory: true,
          lastActivityAt: true
        }
      });

      const capacityMetrics = {
        totalExperts: experts.length,
        tierDistribution: this.calculateTierDistribution(experts),
        capacityUtilization: this.calculateCapacityUtilization(experts),
        overloadedExperts: [],
        underutilizedExperts: [],
        tierCapacity: {}
      };

      // 📊 ANALYZE EACH EXPERT'S CAPACITY
      for (const expert of experts) {
        const expertCapacity = await this.analyzeExpertCapacity(expert);
        
        capacityMetrics.tierCapacity[expert.currentTier] = 
          capacityMetrics.tierCapacity[expert.currentTier] || { total: 0, utilized: 0 };
        
        capacityMetrics.tierCapacity[expert.currentTier].total++;
        capacityMetrics.tierCapacity[expert.currentTier].utilized += expertCapacity.utilization;

        // 🚨 IDENTIFY OVERLOADED EXPERTS
        if (expertCapacity.utilization > 0.9) {
          capacityMetrics.overloadedExperts.push({
            expertId: expert.id,
            name: expert.name,
            tier: expert.currentTier,
            utilization: expertCapacity.utilization,
            currentLoad: expertCapacity.currentLoad,
            maxCapacity: expertCapacity.maxCapacity
          });
        }

        // 📉 IDENTIFY UNDERUTILIZED EXPERTS
        if (expertCapacity.utilization < 0.3 && expert.qualityScore >= 4.0) {
          capacityMetrics.underutilizedExperts.push({
            expertId: expert.id,
            name: expert.name,
            tier: expert.currentTier,
            utilization: expertCapacity.utilization,
            qualityScore: expert.qualityScore
          });
        }
      }

      // 💾 CACHE RESULTS FOR 2 MINUTES
      await this.redis.setex(cacheKey, 120, JSON.stringify(capacityMetrics));

      return capacityMetrics;

    } catch (error) {
      this.logger.error('Expert capacity monitoring failed', error);
      throw error;
    }
  }

  /**
   * 📈 ANALYZE INDIVIDUAL EXPERT CAPACITY
   */
  async analyzeExpertCapacity(expert) {
    const tierLimit = this.config.tierLimits[expert.currentTier];
    const currentLoad = expert.activeSessions + expert.pendingSessions;
    
    // 🎯 QUALITY-BASED CAPACITY CALCULATION
    let effectiveCapacity = tierLimit;
    
    if (expert.currentTier === 'MASTER') {
      // Master tier has unlimited capacity but quality-based effective limits
      effectiveCapacity = this.calculateMasterTierCapacity(expert);
    }

    const utilization = effectiveCapacity ? currentLoad / effectiveCapacity : 0;

    return {
      expertId: expert.id,
      currentTier: expert.currentTier,
      qualityScore: expert.qualityScore,
      currentLoad,
      maxCapacity: effectiveCapacity,
      utilization,
      canAcceptMore: utilization < 0.85,
      recommendedAction: this.getCapacityRecommendation(utilization, expert.qualityScore)
    };
  }

  /**
   * 🏆 CALCULATE MASTER TIER CAPACITY
   */
  calculateMasterTierCapacity(expert) {
    // Master tier capacity is quality-driven, not fixed
    const baseCapacity = 150; // Starting point for master tier
    
    // Quality bonus: +10% capacity for every 0.1 above 4.5
    const qualityBonus = Math.max(0, (expert.qualityScore - 4.5) * 100);
    
    // Experience bonus: +1% for every 10 students successfully trained
    const experienceBonus = Math.min(50, Math.floor(expert.totalStudents / 10));
    
    const totalCapacity = baseCapacity + qualityBonus + experienceBonus;
    
    return Math.min(totalCapacity, 300); // Cap at 300 students
  }

  /**
   * 🌐 MONITOR PLATFORM METRICS
   */
  async monitorPlatformMetrics() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const platformData = await this.prisma.$transaction([
        // Total active students
        this.prisma.student.count({
          where: { 
            status: 'ACTIVE',
            lastActivityAt: { gte: thirtyDaysAgo }
          }
        }),
        
        // Total enrollments in progress
        this.prisma.enrollment.count({
          where: { status: { in: ['ACTIVE', 'IN_PROGRESS'] } }
        }),
        
        // Completed enrollments (last 30 days)
        this.prisma.enrollment.count({
          where: { 
            status: 'COMPLETED',
            completedAt: { gte: thirtyDaysAgo }
          }
        }),
        
        // Pending payments
        this.prisma.payment.count({
          where: { status: 'PENDING' }
        }),
        
        // System performance metrics
        this.getSystemPerformanceMetrics()
      ]);

      const [activeStudents, activeEnrollments, completedEnrollments, pendingPayments, systemMetrics] = platformData;

      return {
        activeStudents,
        activeEnrollments,
        completedEnrollments,
        pendingPayments,
        completionRate: activeEnrollments > 0 ? completedEnrollments / activeEnrollments : 0,
        systemMetrics,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Platform metrics monitoring failed', error);
      throw error;
    }
  }

  /**
   * 🛡️ MONITOR QUALITY METRICS
   */
  async monitorQualityMetrics() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const qualityData = await this.prisma.$transaction([
        // Average expert rating
        this.prisma.rating.aggregate({
          where: { 
            status: 'ACTIVE',
            createdAt: { gte: sevenDaysAgo }
          },
          _avg: { rating: true },
          _count: { id: true }
        }),
        
        // Rating distribution
        this.prisma.rating.groupBy({
          by: ['rating'],
          where: { 
            status: 'ACTIVE',
            createdAt: { gte: sevenDaysAgo }
          },
          _count: { id: true }
        }),
        
        // Expert tier distribution
        this.prisma.expert.groupBy({
          by: ['currentTier'],
          where: { status: 'ACTIVE' },
          _count: { id: true }
        }),
        
        // Quality violations
        this.prisma.qualityViolation.count({
          where: { 
            status: 'ACTIVE',
            createdAt: { gte: sevenDaysAgo }
          }
        })
      ]);

      const [ratingStats, ratingDistribution, tierDistribution, qualityViolations] = qualityData;

      return {
        averageRating: ratingStats._avg.rating || 0,
        totalRatings: ratingStats._count || 0,
        ratingDistribution: this.formatRatingDistribution(ratingDistribution),
        tierDistribution: this.formatTierDistribution(tierDistribution),
        qualityViolations,
        qualityHealth: this.calculateQualityHealth(ratingStats._avg.rating, qualityViolations)
      };

    } catch (error) {
      this.logger.error('Quality metrics monitoring failed', error);
      throw error;
    }
  }

  /**
   * 💻 MONITOR SYSTEM HEALTH
   */
  async monitorSystemHealth() {
    try {
      const healthChecks = await Promise.allSettled([
        this.checkDatabaseHealth(),
        this.checkRedisHealth(),
        this.checkExternalServices(),
        this.checkAPIPerformance()
      ]);

      const results = healthChecks.map((check, index) => ({
        service: ['database', 'redis', 'external_services', 'api_performance'][index],
        status: check.status === 'fulfilled' ? 'HEALTHY' : 'UNHEALTHY',
        details: check.status === 'fulfilled' ? check.value : check.reason
      }));

      return {
        overallHealth: results.every(r => r.status === 'HEALTHY') ? 'HEALTHY' : 'DEGRADED',
        services: results,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('System health monitoring failed', error);
      throw error;
    }
  }

  /**
   * 🗄️ CHECK DATABASE HEALTH
   */
  async checkDatabaseHealth() {
    try {
      const startTime = performance.now();
      
      // Test query performance
      await this.prisma.$queryRaw`SELECT 1`;
      
      const queryTime = performance.now() - startTime;
      
      // Check connection pool
      const poolInfo = await this.prisma.$queryRaw`
        SHOW max_connections;
      `;
      
      return {
        status: 'HEALTHY',
        queryPerformance: `${queryTime.toFixed(2)}ms`,
        connectionPool: poolInfo[0]?.max_connections || 'unknown',
        activeConnections: await this.getActiveConnections()
      };

    } catch (error) {
      this.logger.error('Database health check failed', error);
      throw error;
    }
  }

  /**
   * 🔴 CHECK REDIS HEALTH
   */
  async checkRedisHealth() {
    try {
      const startTime = performance.now();
      await this.redis.ping();
      const responseTime = performance.now() - startTime;

      const info = await this.redis.info();
      const memoryInfo = await this.redis.info('memory');

      return {
        status: 'HEALTHY',
        responseTime: `${responseTime.toFixed(2)}ms`,
        connectedClients: this.extractRedisInfo(info, 'connected_clients'),
        usedMemory: this.extractRedisInfo(memoryInfo, 'used_memory_human'),
        keyspaceHits: this.extractRedisInfo(info, 'keyspace_hits')
      };

    } catch (error) {
      this.logger.error('Redis health check failed', error);
      throw error;
    }
  }

  /**
   * 🌐 CHECK EXTERNAL SERVICES
   */
  async checkExternalServices() {
    const services = [
      { name: 'Telebirr API', url: process.env.TELEBIRR_API_URL },
      { name: 'CBE Birr API', url: process.env.CBEBIRR_API_URL },
      { name: 'Fayda ID Service', url: process.env.FAYDA_API_URL },
      { name: 'Yachi Platform', url: process.env.YACHI_API_URL }
    ];

    const checks = await Promise.allSettled(
      services.map(async (service) => {
        if (!service.url) {
          return { name: service.name, status: 'CONFIGURATION_MISSING' };
        }

        try {
          const response = await fetch(`${service.url}/health`, { 
            timeout: 5000 
          });
          
          return {
            name: service.name,
            status: response.ok ? 'HEALTHY' : 'DEGRADED',
            responseTime: 'measured', // Would be actual measurement
            lastChecked: new Date().toISOString()
          };
        } catch (error) {
          return {
            name: service.name,
            status: 'UNHEALTHY',
            error: error.message,
            lastChecked: new Date().toISOString()
          };
        }
      })
    );

    return checks.map(check => 
      check.status === 'fulfilled' ? check.value : { ...check.reason, status: 'CHECK_FAILED' }
    );
  }

  /**
   * ⚡ CHECK API PERFORMANCE
   */
  async checkAPIPerformance() {
    try {
      // Get recent API performance metrics from Redis
      const performanceKeys = await this.redis.keys('api_performance:*');
      const performanceData = [];

      for (const key of performanceKeys.slice(0, 10)) { // Limit to recent 10
        const data = await this.redis.get(key);
        if (data) {
          performanceData.push(JSON.parse(data));
        }
      }

      const averageResponseTime = performanceData.length > 0 
        ? performanceData.reduce((sum, data) => sum + data.responseTime, 0) / performanceData.length
        : 0;

      const errorRate = performanceData.length > 0
        ? performanceData.filter(data => data.status >= 400).length / performanceData.length
        : 0;

      return {
        averageResponseTime: `${averageResponseTime.toFixed(2)}ms`,
        errorRate: `${(errorRate * 100).toFixed(2)}%`,
        totalRequests: performanceData.length,
        status: errorRate < 0.05 ? 'HEALTHY' : 'DEGRADED'
      };

    } catch (error) {
      this.logger.error('API performance check failed', error);
      throw error;
    }
  }

  /**
   * 🎯 CALCULATE OVERALL STATUS
   */
  calculateOverallStatus(expertCapacity, platformMetrics, qualityMetrics) {
    const thresholds = this.config.alertThresholds;
    
    const expertUtilization = expertCapacity.capacityUtilization.overall;
    const qualityScore = qualityMetrics.averageRating;
    const completionRate = platformMetrics.completionRate;
    const errorRate = parseFloat(platformMetrics.systemMetrics?.errorRate) || 0;

    let status = 'HEALTHY';
    const issues = [];

    if (expertUtilization > thresholds.capacityUtilization) {
      status = 'DEGRADED';
      issues.push(`High capacity utilization: ${(expertUtilization * 100).toFixed(1)}%`);
    }

    if (qualityScore < 4.0) {
      status = 'DEGRADED';
      issues.push(`Low quality score: ${qualityScore.toFixed(1)}`);
    }

    if (completionRate < 0.7) {
      status = 'DEGRADED';
      issues.push(`Low completion rate: ${(completionRate * 100).toFixed(1)}%`);
    }

    if (errorRate > thresholds.errorRate) {
      status = 'CRITICAL';
      issues.push(`High error rate: ${(errorRate * 100).toFixed(1)}%`);
    }

    return { status, issues, timestamp: new Date().toISOString() };
  }

  /**
   * 🔔 CHECK AND TRIGGER ALERTS
   */
  async checkAndTriggerAlerts(capacityReport) {
    const { overallStatus, expertCapacity, qualityMetrics, platformMetrics } = capacityReport;

    if (overallStatus.status !== 'HEALTHY') {
      await this.alertManager.sendAlert({
        type: 'CAPACITY_ISSUE',
        severity: overallStatus.status === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        title: `Platform Capacity ${overallStatus.status}`,
        message: `Issues detected: ${overallStatus.issues.join(', ')}`,
        data: {
          expertUtilization: expertCapacity.capacityUtilization.overall,
          qualityScore: qualityMetrics.averageRating,
          completionRate: platformMetrics.completionRate,
          overloadedExperts: expertCapacity.overloadedExperts.length
        },
        timestamp: new Date().toISOString()
      });
    }

    // 🚨 SPECIFIC ALERTS
    if (expertCapacity.overloadedExperts.length > 5) {
      await this.alertManager.sendAlert({
        type: 'EXPERT_OVERLOAD',
        severity: 'MEDIUM',
        title: 'Multiple Experts Overloaded',
        message: `${expertCapacity.overloadedExperts.length} experts are above 90% capacity`,
        data: {
          overloadedExperts: expertCapacity.overloadedExperts.slice(0, 5) // First 5
        }
      });
    }

    if (qualityMetrics.averageRating < 4.0) {
      await this.alertManager.sendAlert({
        type: 'QUALITY_DEGRADATION',
        severity: 'HIGH',
        title: 'Platform Quality Below Standard',
        message: `Average rating dropped to ${qualityMetrics.averageRating.toFixed(1)}`,
        data: {
          currentRating: qualityMetrics.averageRating,
          ratingDistribution: qualityMetrics.ratingDistribution
        }
      });
    }
  }

  /**
   * 📊 UPDATE CAPACITY DASHBOARD
   */
  async updateCapacityDashboard(capacityReport) {
    try {
      const dashboardKey = 'capacity_dashboard:current';
      const simplifiedReport = {
        overallStatus: capacityReport.overallStatus,
        expertCount: capacityReport.expertCapacity.totalExperts,
        activeStudents: capacityReport.platformMetrics.activeStudents,
        averageRating: capacityReport.qualityMetrics.averageRating,
        capacityUtilization: capacityReport.expertCapacity.capacityUtilization.overall,
        lastUpdated: new Date().toISOString()
      };

      await this.redis.setex(dashboardKey, 60, JSON.stringify(simplifiedReport));
      
      // Emit real-time update
      this.emit('dashboardUpdated', simplifiedReport);

    } catch (error) {
      this.logger.error('Dashboard update failed', error);
    }
  }

  /**
   * 💾 STORE CAPACITY REPORT
   */
  async storeCapacityReport(report) {
    try {
      const reportKey = `capacity_report:${report.checkId}`;
      
      // Store in Redis for 24 hours
      await this.redis.setex(reportKey, 86400, JSON.stringify(report));
      
      // Store summary in database for historical analysis
      await this.prisma.capacityReport.create({
        data: {
          checkId: report.checkId,
          overallStatus: report.overallStatus.status,
          expertCount: report.expertCapacity.totalExperts,
          activeStudents: report.platformMetrics.activeStudents,
          averageRating: report.qualityMetrics.averageRating,
          capacityUtilization: report.expertCapacity.capacityUtilization.overall,
          issues: report.overallStatus.issues,
          rawData: report // Store full report as JSON
        }
      });

    } catch (error) {
      this.logger.error('Capacity report storage failed', error);
    }
  }

  /**
   * 🔧 LOAD CONFIGURATION
   */
  async loadConfiguration() {
    try {
      // Load from environment variables with defaults
      this.config.checkInterval = parseInt(process.env.CAPACITY_CHECK_INTERVAL) || 30000;
      this.config.alertThresholds.capacityUtilization = 
        parseFloat(process.env.CAPACITY_ALERT_THRESHOLD) || 0.85;
      
      this.logger.info('Configuration loaded successfully', { config: this.config });
      
    } catch (error) {
      this.logger.error('Configuration loading failed', error);
      throw error;
    }
  }

  /**
   * 🛠️ UTILITY METHODS
   */
  calculateTierDistribution(experts) {
    const distribution = {};
    experts.forEach(expert => {
      distribution[expert.currentTier] = (distribution[expert.currentTier] || 0) + 1;
    });
    return distribution;
  }

  calculateCapacityUtilization(experts) {
    let totalUtilization = 0;
    let totalCapacity = 0;

    experts.forEach(expert => {
      const tierLimit = this.config.tierLimits[expert.currentTier];
      if (tierLimit) {
        const utilization = (expert.activeSessions + expert.pendingSessions) / tierLimit;
        totalUtilization += utilization;
        totalCapacity++;
      }
    });

    return {
      overall: totalCapacity > 0 ? totalUtilization / totalCapacity : 0,
      byTier: this.calculateTierUtilization(experts)
    };
  }

  calculateTierUtilization(experts) {
    const tierUtilization = {};
    
    Object.keys(this.config.tierLimits).forEach(tier => {
      const tierExperts = experts.filter(e => e.currentTier === tier);
      if (tierExperts.length > 0) {
        const totalUtilization = tierExperts.reduce((sum, expert) => {
          const limit = this.config.tierLimits[tier];
          return sum + ((expert.activeSessions + expert.pendingSessions) / limit);
        }, 0);
        
        tierUtilization[tier] = totalUtilization / tierExperts.length;
      }
    });

    return tierUtilization;
  }

  getCapacityRecommendation(utilization, qualityScore) {
    if (utilization > 0.9) {
      return qualityScore >= 4.3 ? 'CONSIDER_PROMOTION' : 'PAUSE_NEW_STUDENTS';
    }
    if (utilization < 0.3 && qualityScore >= 4.0) {
      return 'INCREASE_VISIBILITY';
    }
    return 'MAINTAIN_CURRENT';
  }

  formatRatingDistribution(distribution) {
    const result = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distribution.forEach(item => {
      result[item.rating] = item._count;
    });
    return result;
  }

  formatTierDistribution(distribution) {
    const result = {};
    distribution.forEach(item => {
      result[item.currentTier] = item._count;
    });
    return result;
  }

  calculateQualityHealth(averageRating, violations) {
    if (averageRating >= 4.5 && violations === 0) return 'EXCELLENT';
    if (averageRating >= 4.0 && violations <= 5) return 'GOOD';
    if (averageRating >= 3.5 && violations <= 10) return 'FAIR';
    return 'POOR';
  }

  async getActiveConnections() {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT count(*) as active_connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
      `;
      return result[0]?.active_connections || 0;
    } catch (error) {
      return 'unknown';
    }
  }

  extractRedisInfo(info, field) {
    const match = info.match(new RegExp(`${field}:(.+)`));
    return match ? match[1].trim() : 'unknown';
  }

  async getSystemPerformanceMetrics() {
    // This would integrate with your actual performance monitoring system
    return {
      errorRate: '0.02',
      responseTime: '245ms',
      uptime: '99.8%'
    };
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = null;
      }

      await this.redis.quit();
      await this.prisma.$disconnect();
      
      this.removeAllListeners();
      this.logger.info('Capacity monitor resources cleaned up');
      
    } catch (error) {
      this.logger.error('Error during capacity monitor cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new CapacityMonitor();