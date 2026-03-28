// (admin-revenue)/platform-profitability.js

/**
 * 🎯 ENTERPRISE PLATFORM PROFITABILITY SYSTEM
 * Real-time revenue tracking, profit analysis, and financial forecasting
 * Powered by Mosa Forge Revenue Model: 1000/999 Split with 333/333/333 Payouts
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../../utils/logger');
const { FinancialCalculator } = require('../../utils/financial-calculations');
const { RateLimiterRedis } = require('rate-limiter-flexible');

class PlatformProfitability extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('PlatformProfitability');
    this.financialCalculator = new FinancialCalculator();
    
    // Revenue configuration - Mosa Forge Business Model
    this.revenueConfig = {
      bundlePrice: 1999,
      mosaRevenue: 1000,      // Platform share
      expertRevenue: 999,     // Expert share
      payoutSchedule: [333, 333, 333], // 333/333/333 payout structure
      qualityBonuses: {
        master: 0.20,  // +20% for Master tier
        senior: 0.10,  // +10% for Senior tier
        standard: 0.00 // Base for Standard tier
      }
    };

    // Rate limiting for admin operations
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (req) => `profitability_limit:${req.adminId}`,
      points: 100, // 100 requests per minute
      duration: 60,
    });

    this.initialize();
  }

  /**
   * Initialize profitability system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.initializeRevenueCache();
      this.logger.info('Platform profitability system initialized successfully');
      
      // Start background jobs
      this.startBackgroundJobs();
      
    } catch (error) {
      this.logger.error('Failed to initialize profitability system', error);
      throw error;
    }
  }

  /**
   * 📊 GET REAL-TIME PROFITABILITY DASHBOARD
   */
  async getProfitabilityDashboard(adminId, timeframe = '30d') {
    const startTime = performance.now();
    
    try {
      // 🛡️ Admin authorization
      await this.validateAdminAccess(adminId);

      // 🔍 Rate limiting
      await this.rateLimiter.consume(`admin:${adminId}`);

      const cacheKey = `profitability:dashboard:${timeframe}:${this.getTimeWindow()}`;
      
      // Try cache first for performance
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // 📈 Parallel data fetching for optimal performance
      const [
        revenueMetrics,
        expenseMetrics,
        studentMetrics,
        expertMetrics,
        forecastData
      ] = await Promise.all([
        this.getRevenueMetrics(timeframe),
        this.getExpenseMetrics(timeframe),
        this.getStudentGrowthMetrics(timeframe),
        this.getExpertPerformanceMetrics(timeframe),
        this.getFinancialForecast(timeframe)
      ]);

      // 💰 Profitability calculations
      const profitability = this.calculateProfitability(revenueMetrics, expenseMetrics);
      const roi = this.calculatePlatformROI(revenueMetrics, expenseMetrics);
      const cashFlow = await this.getCashFlowAnalysis(timeframe);

      const dashboard = {
        timestamp: new Date().toISOString(),
        timeframe,
        revenue: revenueMetrics,
        expenses: expenseMetrics,
        profitability,
        roi,
        cashFlow,
        studentGrowth: studentMetrics,
        expertPerformance: expertMetrics,
        forecasts: forecastData,
        kpis: this.calculateKPIs(revenueMetrics, expenseMetrics, studentMetrics),
        alerts: await this.getFinancialAlerts(profitability, revenueMetrics)
      };

      // Cache for 5 minutes for real-time dashboard performance
      await this.redis.setex(cacheKey, 300, JSON.stringify(dashboard));

      const processingTime = performance.now() - startTime;
      this.logger.metric('dashboard_processing_time', processingTime, { adminId, timeframe });

      return dashboard;

    } catch (error) {
      this.logger.error('Profitability dashboard failed', error, { adminId, timeframe });
      throw error;
    }
  }

  /**
   * 💰 GET REVENUE METRICS - Mosa Forge 1000/999 Model
   */
  async getRevenueMetrics(timeframe) {
    const dateRange = this.getDateRange(timeframe);
    
    const revenueData = await this.prisma.$transaction([
      // Total revenue from bundle sales
      this.prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: dateRange.start, lte: dateRange.end }
        },
        _sum: { amount: true },
        _count: { id: true }
      }),

      // Platform revenue (1000 ETB per bundle)
      this.prisma.platformRevenue.aggregate({
        where: {
          createdAt: { gte: dateRange.start, lte: dateRange.end }
        },
        _sum: { 
          amount: true,
          expertPayouts: true,
          qualityBonuses: true,
          operationalCosts: true
        }
      }),

      // Revenue by payment method
      this.prisma.payment.groupBy({
        by: ['paymentMethod'],
        where: {
          status: 'COMPLETED',
          createdAt: { gte: dateRange.start, lte: dateRange.end }
        },
        _sum: { amount: true },
        _count: { id: true }
      }),

      // Revenue by skill category
      this.prisma.enrollment.groupBy({
        by: ['skillCategory'],
        where: {
          paymentStatus: 'COMPLETED',
          createdAt: { gte: dateRange.start, lte: dateRange.end }
        },
        _sum: { bundlePrice: true },
        _count: { id: true }
      })
    ]);

    const [totalRevenue, platformRevenue, paymentMethods, skillCategories] = revenueData;

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      totalBundles: totalRevenue._count.id || 0,
      platformRevenue: platformRevenue._sum.amount || 0,
      expertPayouts: platformRevenue._sum.expertPayouts || 0,
      qualityBonuses: platformRevenue._sum.qualityBonuses || 0,
      operationalCosts: platformRevenue._sum.operationalCosts || 0,
      paymentMethodBreakdown: this.formatPaymentMethodBreakdown(paymentMethods),
      skillCategoryBreakdown: this.formatSkillCategoryBreakdown(skillCategories),
      averageRevenuePerBundle: this.calculateARPB(totalRevenue),
      revenueTrend: await this.getRevenueTrend(timeframe)
    };
  }

  /**
   * 🏢 GET EXPENSE METRICS
   */
  async getExpenseMetrics(timeframe) {
    const dateRange = this.getDateRange(timeframe);

    const expenseData = await this.prisma.$transaction([
      // Expert payouts (999 ETB per bundle + bonuses)
      this.prisma.expertPayout.aggregate({
        where: {
          status: 'COMPLETED',
          paidAt: { gte: dateRange.start, lte: dateRange.end }
        },
        _sum: { 
          amount: true,
          bonusAmount: true
        },
        _count: { id: true }
      }),

      // Operational costs
      this.prisma.operationalCost.aggregate({
        where: {
          date: { gte: dateRange.start, lte: dateRange.end }
        },
        _sum: { 
          infrastructure: true,
          marketing: true,
          personnel: true,
          technology: true,
          miscellaneous: true
        }
      }),

      // Cost by category
      this.prisma.operationalCost.groupBy({
        by: ['category'],
        where: {
          date: { gte: dateRange.start, lte: dateRange.end }
        },
        _sum: { amount: true }
      })
    ]);

    const [expertPayouts, operationalCosts, costCategories] = expenseData;

    const totalExpertPayouts = (expertPayouts._sum.amount || 0) + (expertPayouts._sum.bonusAmount || 0);
    const totalOperationalCosts = Object.values(operationalCosts._sum || {}).reduce((a, b) => a + (b || 0), 0);

    return {
      totalExpenses: totalExpertPayouts + totalOperationalCosts,
      expertPayouts: {
        basePayouts: expertPayouts._sum.amount || 0,
        qualityBonuses: expertPayouts._sum.bonusAmount || 0,
        total: totalExpertPayouts,
        payoutCount: expertPayouts._count.id || 0
      },
      operationalCosts: {
        ...operationalCosts._sum,
        total: totalOperationalCosts
      },
      costBreakdown: this.formatCostBreakdown(costCategories),
      costPerBundle: this.calculateCPB(totalExpertPayouts + totalOperationalCosts, expertPayouts._count.id || 1)
    };
  }

  /**
   * 📈 GET STUDENT GROWTH METRICS
   */
  async getStudentGrowthMetrics(timeframe) {
    const dateRange = this.getDateRange(timeframe);

    const growthData = await this.prisma.$transaction([
      // Student enrollment metrics
      this.prisma.student.aggregate({
        where: {
          createdAt: { gte: dateRange.start, lte: dateRange.end }
        },
        _count: { id: true }
      }),

      // Enrollment completion rates
      this.prisma.enrollment.aggregate({
        where: {
          createdAt: { gte: dateRange.start, lte: dateRange.end }
        },
        _count: {
          _all: true,
          id: true
        }
      }),

      this.prisma.enrollment.count({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: dateRange.start, lte: dateRange.end }
        }
      }),

      // Student retention
      this.prisma.student.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: dateRange.start, lte: dateRange.end }
        },
        _count: { id: true }
      })
    ]);

    const [totalStudents, totalEnrollments, completedEnrollments, dailySignups] = growthData;

    const completionRate = totalEnrollments._count.id > 0 
      ? (completedEnrollments / totalEnrollments._count.id) * 100 
      : 0;

    return {
      totalStudents: totalStudents._count.id,
      totalEnrollments: totalEnrollments._count.id,
      completedEnrollments,
      completionRate: Math.round(completionRate * 100) / 100,
      dailySignups: this.formatDailySignups(dailySignups),
      growthRate: await this.calculateGrowthRate(timeframe),
      studentLifetimeValue: await this.calculateLTV()
    };
  }

  /**
   * 👨‍🏫 GET EXPERT PERFORMANCE METRICS
   */
  async getExpertPerformanceMetrics(timeframe) {
    const dateRange = this.getDateRange(timeframe);

    const expertData = await this.prisma.$transaction([
      // Expert tier distribution
      this.prisma.expert.groupBy({
        by: ['currentTier'],
        where: {
          status: 'ACTIVE',
          createdAt: { gte: dateRange.start, lte: dateRange.end }
        },
        _count: { id: true },
        _avg: { qualityScore: true }
      }),

      // Expert earnings
      this.prisma.expertPayout.aggregate({
        where: {
          status: 'COMPLETED',
          paidAt: { gte: dateRange.start, lte: dateRange.end }
        },
        _sum: { 
          amount: true,
          bonusAmount: true
        },
        _avg: {
          amount: true
        }
      }),

      // Expert performance by tier
      this.prisma.expert.findMany({
        where: {
          status: 'ACTIVE',
          createdAt: { gte: dateRange.start, lte: dateRange.end }
        },
        select: {
          currentTier: true,
          qualityScore: true,
          totalStudents: true,
          totalEarnings: true
        }
      })
    ]);

    const [tierDistribution, earnings, expertPerformance] = expertData;

    return {
      tierDistribution: this.formatTierDistribution(tierDistribution),
      totalEarnings: {
        base: earnings._sum.amount || 0,
        bonuses: earnings._sum.bonusAmount || 0,
        total: (earnings._sum.amount || 0) + (earnings._sum.bonusAmount || 0),
        averagePerExpert: earnings._avg.amount || 0
      },
      performanceByTier: this.calculateTierPerformance(expertPerformance),
      qualityMetrics: await this.getExpertQualityMetrics(timeframe)
    };
  }

  /**
   * 🔮 GET FINANCIAL FORECAST
   */
  async getFinancialForecast(timeframe) {
    const historicalData = await this.getHistoricalRevenueData(timeframe);
    const growthTrends = await this.analyzeGrowthTrends();
    const marketFactors = await this.getMarketFactors();

    return {
      revenueForecast: this.financialCalculator.forecastRevenue(historicalData, growthTrends),
      expenseForecast: this.financialCalculator.forecastExpenses(historicalData, growthTrends),
      studentGrowthForecast: this.financialCalculator.forecastStudentGrowth(historicalData, marketFactors),
      breakEvenAnalysis: this.calculateBreakEvenPoint(historicalData),
      riskAssessment: this.assessFinancialRisks(historicalData, marketFactors)
    };
  }

  /**
   * 💸 GET CASH FLOW ANALYSIS
   */
  async getCashFlowAnalysis(timeframe) {
    const dateRange = this.getDateRange(timeframe);

    const cashFlowData = await this.prisma.$transaction([
      // Cash inflows
      this.prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: dateRange.start, lte: dateRange.end }
        },
        _sum: { amount: true }
      }),

      // Cash outflows
      this.prisma.expertPayout.aggregate({
        where: {
          status: 'COMPLETED',
          paidAt: { gte: dateRange.start, lte: dateRange.end }
        },
        _sum: { 
          amount: true,
          bonusAmount: true
        }
      }),

      this.prisma.operationalCost.aggregate({
        where: {
          date: { gte: dateRange.start, lte: dateRange.end }
        },
        _sum: { amount: true }
      })
    ]);

    const [inflows, expertOutflows, operationalOutflows] = cashFlowData;

    const totalInflows = inflows._sum.amount || 0;
    const totalOutflows = (expertOutflows._sum.amount || 0) + 
                         (expertOutflows._sum.bonusAmount || 0) + 
                         (operationalOutflows._sum.amount || 0);

    return {
      inflows: totalInflows,
      outflows: totalOutflows,
      netCashFlow: totalInflows - totalOutflows,
      cashFlowTrend: await this.getCashFlowTrend(timeframe),
      workingCapital: await this.calculateWorkingCapital(),
      cashBurnRate: this.calculateBurnRate(totalInflows, totalOutflows)
    };
  }

  /**
   * 🎯 CALCULATE PROFITABILITY METRICS
   */
  calculateProfitability(revenueMetrics, expenseMetrics) {
    const grossProfit = revenueMetrics.platformRevenue - expenseMetrics.expertPayouts.total;
    const netProfit = grossProfit - expenseMetrics.operationalCosts.total;
    const operatingMargin = revenueMetrics.platformRevenue > 0 
      ? (netProfit / revenueMetrics.platformRevenue) * 100 
      : 0;

    return {
      grossProfit,
      netProfit,
      operatingMargin: Math.round(operatingMargin * 100) / 100,
      contributionMargin: this.calculateContributionMargin(revenueMetrics, expenseMetrics),
      breakEvenPoint: this.calculateBreakEvenPoint(revenueMetrics, expenseMetrics),
      profitPerBundle: revenueMetrics.totalBundles > 0 
        ? netProfit / revenueMetrics.totalBundles 
        : 0
    };
  }

  /**
   * 📊 CALCULATE PLATFORM ROI
   */
  calculatePlatformROI(revenueMetrics, expenseMetrics) {
    const totalInvestment = expenseMetrics.operationalCosts.total;
    const netProfit = revenueMetrics.platformRevenue - expenseMetrics.totalExpenses;

    if (totalInvestment === 0) return 0;

    const roi = (netProfit / totalInvestment) * 100;
    return Math.round(roi * 100) / 100;
  }

  /**
   * 🚨 GET FINANCIAL ALERTS
   */
  async getFinancialAlerts(profitability, revenueMetrics) {
    const alerts = [];

    // Negative profitability alert
    if (profitability.netProfit < 0) {
      alerts.push({
        level: 'CRITICAL',
        type: 'NEGATIVE_PROFITABILITY',
        message: 'Platform is operating at a loss',
        details: `Net profit: ${profitability.netProfit} ETB`,
        suggestedAction: 'Review operational costs and revenue streams'
      });
    }

    // Low operating margin alert
    if (profitability.operatingMargin < 10) {
      alerts.push({
        level: 'WARNING',
        type: 'LOW_MARGIN',
        message: 'Operating margin below target',
        details: `Current margin: ${profitability.operatingMargin}%`,
        suggestedAction: 'Optimize costs and increase premium services'
      });
    }

    // Revenue decline alert
    const revenueTrend = await this.getRevenueTrend('30d');
    if (revenueTrend < -10) {
      alerts.push({
        level: 'WARNING',
        type: 'REVENUE_DECLINE',
        message: 'Significant revenue decline detected',
        details: `Revenue trend: ${revenueTrend}%`,
        suggestedAction: 'Analyze enrollment patterns and marketing effectiveness'
      });
    }

    // High operational costs alert
    const costRatio = revenueMetrics.platformRevenue > 0 
      ? (profitability.operatingMargin / revenueMetrics.platformRevenue) * 100 
      : 0;
    
    if (costRatio > 60) {
      alerts.push({
        level: 'WARNING',
        type: 'HIGH_OPERATIONAL_COSTS',
        message: 'Operational costs are high relative to revenue',
        details: `Cost to revenue ratio: ${costRatio}%`,
        suggestedAction: 'Review and optimize operational expenses'
      });
    }

    return alerts;
  }

  /**
   * 📈 CALCULATE KEY PERFORMANCE INDICATORS
   */
  calculateKPIs(revenueMetrics, expenseMetrics, studentMetrics) {
    return {
      // Revenue KPIs
      arpu: this.calculateARPU(revenueMetrics, studentMetrics),
      ltv: studentMetrics.studentLifetimeValue,
      cac: this.calculateCAC(expenseMetrics, studentMetrics),
      
      // Efficiency KPIs
      enrollmentToCompletion: studentMetrics.completionRate,
      expertUtilization: await this.calculateExpertUtilization(),
      platformUptime: await this.getPlatformUptime(),
      
      // Financial KPIs
      grossMargin: revenueMetrics.platformRevenue > 0 
        ? ((revenueMetrics.platformRevenue - expenseMetrics.expertPayouts.total) / revenueMetrics.platformRevenue) * 100 
        : 0,
      netMargin: revenueMetrics.platformRevenue > 0 
        ? ((revenueMetrics.platformRevenue - expenseMetrics.totalExpenses) / revenueMetrics.platformRevenue) * 100 
        : 0,
      revenueGrowth: revenueMetrics.revenueTrend
    };
  }

  /**
   * 🔧 UTILITY METHODS
   */

  async validateAdminAccess(adminId) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
      select: { role: true, permissions: true }
    });

    if (!admin || !admin.permissions.includes('REVENUE_ACCESS')) {
      throw new Error('UNAUTHORIZED_ACCESS');
    }
  }

  getDateRange(timeframe) {
    const now = new Date();
    let startDate = new Date();

    switch (timeframe) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    return { start: startDate, end: now };
  }

  getTimeWindow() {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${Math.floor(now.getHours() / 6)}`;
  }

  formatPaymentMethodBreakdown(methods) {
    return methods.reduce((acc, method) => {
      acc[method.paymentMethod] = {
        amount: method._sum.amount,
        count: method._count.id,
        percentage: 0 // Will be calculated based on total
      };
      return acc;
    }, {});
  }

  formatSkillCategoryBreakdown(categories) {
    return categories.reduce((acc, category) => {
      acc[category.skillCategory] = {
        revenue: category._sum.bundlePrice,
        enrollments: category._count.id
      };
      return acc;
    }, {});
  }

  calculateARPB(totalRevenue) {
    return totalRevenue._count.id > 0 
      ? (totalRevenue._sum.amount || 0) / totalRevenue._count.id 
      : 0;
  }

  calculateCPB(totalCosts, bundleCount) {
    return bundleCount > 0 ? totalCosts / bundleCount : 0;
  }

  calculateARPU(revenueMetrics, studentMetrics) {
    return studentMetrics.totalStudents > 0 
      ? revenueMetrics.totalRevenue / studentMetrics.totalStudents 
      : 0;
  }

  calculateCAC(expenseMetrics, studentMetrics) {
    return studentMetrics.totalStudents > 0 
      ? expenseMetrics.operationalCosts.marketing / studentMetrics.totalStudents 
      : 0;
  }

  /**
   * 🎯 BACKGROUND JOBS FOR REAL-TIME DATA
   */
  startBackgroundJobs() {
    // Update revenue cache every 5 minutes
    setInterval(() => {
      this.initializeRevenueCache().catch(error => {
        this.logger.error('Background cache update failed', error);
      });
    }, 5 * 60 * 1000);

    // Financial health check every hour
    setInterval(() => {
      this.performFinancialHealthCheck().catch(error => {
        this.logger.error('Financial health check failed', error);
      });
    }, 60 * 60 * 1000);
  }

  async initializeRevenueCache() {
    const cacheKeys = [
      'revenue:metrics:current',
      'profitability:alerts:current',
      'financial:forecast:current'
    ];

    const pipeline = this.redis.pipeline();
    cacheKeys.forEach(key => pipeline.del(key));
    await pipeline.exec();

    this.logger.info('Revenue cache initialized');
  }

  async performFinancialHealthCheck() {
    const dashboard = await this.getProfitabilityDashboard('system', '30d');
    
    if (dashboard.alerts.length > 0) {
      this.emit('financialAlert', {
        timestamp: new Date(),
        alerts: dashboard.alerts,
        profitability: dashboard.profitability
      });
    }

    this.logger.info('Financial health check completed', {
      netProfit: dashboard.profitability.netProfit,
      alertsCount: dashboard.alerts.length
    });
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Platform profitability system resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new PlatformProfitability();