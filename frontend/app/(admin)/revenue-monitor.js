// (admin)/revenue-monitor.js

/**
 * 🎯 ENTERPRISE REVENUE MONITORING SYSTEM
 * Production-ready financial monitoring for Mosa Forge
 * Features: Real-time revenue tracking, payment analytics, expert payout monitoring
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../../utils/logger');
const { RiskDetector } = require('../../utils/risk-detector');

class RevenueMonitor extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('RevenueMonitor');
    this.riskDetector = new RiskDetector();
    
    this.metrics = {
      totalRevenue: 0,
      expertPayouts: 0,
      platformRevenue: 0,
      pendingPayouts: 0,
      refundAmount: 0,
      activeEnrollments: 0
    };

    this.initialize();
  }

  /**
   * Initialize revenue monitoring system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.loadInitialMetrics();
      this.startRealTimeUpdates();
      this.logger.info('Revenue monitoring system initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize revenue monitor', error);
      throw error;
    }
  }

  /**
   * 📊 LOAD INITIAL METRICS
   */
  async loadInitialMetrics() {
    try {
      const [
        revenueData,
        payoutData,
        enrollmentData,
        refundData
      ] = await Promise.all([
        this.calculateTotalRevenue(),
        this.calculateExpertPayouts(),
        this.getActiveEnrollments(),
        this.calculateRefundAmounts()
      ]);

      this.metrics = {
        ...this.metrics,
        ...revenueData,
        ...payoutData,
        activeEnrollments: enrollmentData.count,
        refundAmount: refundData.total
      };

      await this.cacheMetrics();
      this.logger.info('Initial revenue metrics loaded', this.metrics);
    } catch (error) {
      this.logger.error('Failed to load initial metrics', error);
    }
  }

  /**
   * 💰 CALCULATE TOTAL REVENUE
   */
  async calculateTotalRevenue(timeRange = 'all') {
    const whereClause = this.getTimeRangeWhereClause(timeRange);
    
    const revenueData = await this.prisma.payment.aggregate({
      where: {
        ...whereClause,
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    const platformRevenue = await this.prisma.platformRevenue.aggregate({
      where: whereClause,
      _sum: {
        amount: true,
        serviceFee: true,
        processingFee: true
      }
    });

    return {
      totalRevenue: revenueData._sum.amount || 0,
      totalTransactions: revenueData._count.id || 0,
      platformRevenue: platformRevenue._sum.amount || 0,
      totalFees: (platformRevenue._sum.serviceFee || 0) + (platformRevenue._sum.processingFee || 0)
    };
  }

  /**
   * 💸 CALCULATE EXPERT PAYOUTS
   */
  async calculateExpertPayouts(timeRange = 'all') {
    const whereClause = this.getTimeRangeWhereClause(timeRange);

    const payoutData = await this.prisma.expertPayout.aggregate({
      where: {
        ...whereClause,
        status: { in: ['COMPLETED', 'PENDING'] }
      },
      _sum: {
        amount: true,
        bonusAmount: true
      },
      _count: {
        id: true
      }
    });

    const pendingPayouts = await this.prisma.expertPayout.aggregate({
      where: {
        ...whereClause,
        status: 'PENDING'
      },
      _sum: {
        amount: true
      }
    });

    return {
      expertPayouts: payoutData._sum.amount || 0,
      totalBonuses: payoutData._sum.bonusAmount || 0,
      totalPayouts: payoutData._count.id || 0,
      pendingPayouts: pendingPayouts._sum.amount || 0
    };
  }

  /**
   * 📈 GET ACTIVE ENROLLMENTS
   */
  async getActiveEnrollments() {
    const activeEnrollments = await this.prisma.enrollment.count({
      where: {
        status: { in: ['ACTIVE', 'IN_PROGRESS'] }
      }
    });

    const completedEnrollments = await this.prisma.enrollment.count({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    return {
      count: activeEnrollments,
      completed: completedEnrollments
    };
  }

  /**
   * 💳 CALCULATE REFUND AMOUNTS
   */
  async calculateRefundAmounts(timeRange = 'all') {
    const whereClause = this.getTimeRangeWhereClause(timeRange);

    const refundData = await this.prisma.refund.aggregate({
      where: {
        ...whereClause,
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    return {
      total: refundData._sum.amount || 0,
      count: refundData._count.id || 0
    };
  }

  /**
   * 🎯 GET REVENUE DASHBOARD DATA
   */
  async getRevenueDashboard(options = {}) {
    const {
      timeRange = '30d',
      includeTrends = true,
      includeBreakdown = true,
      realTime = true
    } = options;

    const cacheKey = `revenue_dashboard:${timeRange}:${JSON.stringify(options)}`;
    
    if (realTime) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const [
      revenueMetrics,
      payoutMetrics,
      enrollmentMetrics,
      refundMetrics,
      paymentMethods,
      expertEarnings,
      riskAlerts,
      trends
    ] = await Promise.all([
      this.calculateTotalRevenue(timeRange),
      this.calculateExpertPayouts(timeRange),
      this.getActiveEnrollments(),
      this.calculateRefundAmounts(timeRange),
      this.getPaymentMethodBreakdown(timeRange),
      this.getTopExpertEarnings(timeRange),
      includeBreakdown ? this.getRiskAlerts() : Promise.resolve([]),
      includeTrends ? this.getRevenueTrends() : Promise.resolve({})
    ]);

    const dashboardData = {
      timestamp: new Date().toISOString(),
      timeRange,
      summary: {
        totalRevenue: revenueMetrics.totalRevenue,
        platformRevenue: revenueMetrics.platformRevenue,
        expertPayouts: payoutMetrics.expertPayouts,
        netRevenue: revenueMetrics.platformRevenue - payoutMetrics.expertPayouts,
        activeEnrollments: enrollmentMetrics.count,
        completionRate: enrollmentMetrics.count > 0 ? 
          (enrollmentMetrics.completed / enrollmentMetrics.count) * 100 : 0,
        refundRate: revenueMetrics.totalRevenue > 0 ? 
          (refundMetrics.total / revenueMetrics.totalRevenue) * 100 : 0
      },
      breakdown: {
        paymentMethods,
        expertEarnings: expertEarnings.slice(0, 10),
        revenueSplit: this.calculateRevenueSplit(revenueMetrics, payoutMetrics),
        timeDistribution: await this.getTimeDistribution(timeRange)
      },
      alerts: riskAlerts,
      trends,
      metadata: {
        generatedAt: new Date(),
        dataFreshness: 'real-time',
        transactionCount: revenueMetrics.totalTransactions
      }
    };

    if (realTime) {
      await this.redis.setex(cacheKey, 300, JSON.stringify(dashboardData)); // 5 min cache
    }

    return dashboardData;
  }

  /**
   * 💳 PAYMENT METHOD BREAKDOWN
   */
  async getPaymentMethodBreakdown(timeRange) {
    const whereClause = this.getTimeRangeWhereClause(timeRange);

    const paymentMethods = await this.prisma.payment.groupBy({
      by: ['paymentMethod'],
      where: {
        ...whereClause,
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    return paymentMethods.map(method => ({
      method: method.paymentMethod,
      amount: method._sum.amount,
      transactionCount: method._count.id,
      percentage: 0 // Calculated client-side based on total
    }));
  }

  /**
   * 👨‍🏫 TOP EXPERT EARNINGS
   */
  async getTopExpertEarnings(timeRange, limit = 20) {
    const whereClause = this.getTimeRangeWhereClause(timeRange);

    const expertEarnings = await this.prisma.expertPayout.groupBy({
      by: ['expertId'],
      where: {
        ...whereClause,
        status: 'COMPLETED'
      },
      _sum: {
        amount: true,
        bonusAmount: true
      },
      _count: {
        id: true
      },
      orderBy: {
        _sum: {
          amount: 'desc'
        }
      },
      take: limit
    });

    // Enrich with expert details
    const enrichedEarnings = await Promise.all(
      expertEarnings.map(async earning => {
        const expert = await this.prisma.expert.findUnique({
          where: { id: earning.expertId },
          select: {
            name: true,
            currentTier: true,
            qualityScore: true
          }
        });

        return {
          expertId: earning.expertId,
          expertName: expert?.name || 'Unknown',
          tier: expert?.currentTier || 'STANDARD',
          qualityScore: expert?.qualityScore || 0,
          totalEarnings: earning._sum.amount,
          bonusEarnings: earning._sum.bonusAmount,
          payoutCount: earning._count.id,
          averagePayout: earning._sum.amount / earning._count.id
        };
      })
    );

    return enrichedEarnings;
  }

  /**
   * 🚨 RISK ALERTS
   */
  async getRiskAlerts() {
    const alerts = [];

    // Check for abnormal refund rates
    const recentRefunds = await this.calculateRefundAmounts('7d');
    const recentRevenue = await this.calculateTotalRevenue('7d');
    
    const refundRate = recentRevenue.totalRevenue > 0 ? 
      (recentRefunds.total / recentRevenue.totalRevenue) * 100 : 0;
    
    if (refundRate > 10) { // More than 10% refund rate
      alerts.push({
        type: 'HIGH_REFUND_RATE',
        severity: 'HIGH',
        message: `Refund rate is ${refundRate.toFixed(2)}% in the last 7 days`,
        data: { refundRate, period: '7d' },
        timestamp: new Date()
      });
    }

    // Check for payment failures
    const failedPayments = await this.prisma.payment.count({
      where: {
        status: 'FAILED',
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    if (failedPayments > 50) {
      alerts.push({
        type: 'HIGH_PAYMENT_FAILURE',
        severity: 'MEDIUM',
        message: `${failedPayments} failed payments in the last 24 hours`,
        data: { failedPayments, period: '24h' },
        timestamp: new Date()
      });
    }

    // Check for payout anomalies
    const pendingPayouts = await this.prisma.expertPayout.aggregate({
      where: {
        status: 'PENDING',
        scheduledAt: {
          lt: new Date() // Overdue payouts
        }
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    if (pendingPayouts._count.id > 0) {
      alerts.push({
        type: 'OVERDUE_PAYOUTS',
        severity: 'MEDIUM',
        message: `${pendingPayouts._count.id} overdue payouts totaling ${pendingPayouts._sum.amount} ETB`,
        data: pendingPayouts,
        timestamp: new Date()
      });
    }

    return alerts;
  }

  /**
   * 📈 REVENUE TRENDS
   */
  async getRevenueTrends() {
    const trends = {
      daily: await this.getDailyTrends(30),
      weekly: await this.getWeeklyTrends(12),
      monthly: await this.getMonthlyTrends(6)
    };

    return trends;
  }

  /**
   * 📅 DAILY TRENDS
   */
  async getDailyTrends(days = 30) {
    const dailyData = await this.prisma.$queryRaw`
      SELECT 
        DATE("createdAt") as date,
        SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END) as revenue,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as transactions,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failures
      FROM "Payment"
      WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
      LIMIT ${days}
    `;

    return dailyData;
  }

  /**
   * 📅 WEEKLY TRENDS
   */
  async getWeeklyTrends(weeks = 12) {
    const weeklyData = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('week', "createdAt") as week,
        SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END) as revenue,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as transactions,
        AVG(CASE WHEN status = 'COMPLETED' THEN amount ELSE NULL END) as average_ticket
      FROM "Payment"
      WHERE "createdAt" >= NOW() - INTERVAL '${weeks} weeks'
      GROUP BY DATE_TRUNC('week', "createdAt")
      ORDER BY week DESC
      LIMIT ${weeks}
    `;

    return weeklyData;
  }

  /**
   * 📅 MONTHLY TRENDS
   */
  async getMonthlyTrends(months = 6) {
    const monthlyData = await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', "createdAt") as month,
        SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END) as revenue,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as transactions,
        SUM(CASE WHEN status = 'REFUNDED' THEN amount ELSE 0 END) as refunds
      FROM "Payment"
      WHERE "createdAt" >= NOW() - INTERVAL '${months} months'
      GROUP BY DATE_TRUNC('month', "createdAt")
      ORDER BY month DESC
      LIMIT ${months}
    `;

    return monthlyData;
  }

  /**
   * ⏰ TIME DISTRIBUTION
   */
  async getTimeDistribution(timeRange) {
    const whereClause = this.getTimeRangeWhereClause(timeRange);

    const hourlyDistribution = await this.prisma.$queryRaw`
      SELECT 
        EXTRACT(HOUR FROM "createdAt") as hour,
        COUNT(*) as transactions,
        SUM(amount) as revenue
      FROM "Payment"
      WHERE ${whereClause} AND status = 'COMPLETED'
      GROUP BY EXTRACT(HOUR FROM "createdAt")
      ORDER BY hour
    `;

    const dailyDistribution = await this.prisma.$queryRaw`
      SELECT 
        EXTRACT(DOW FROM "createdAt") as day_of_week,
        COUNT(*) as transactions,
        SUM(amount) as revenue
      FROM "Payment"
      WHERE ${whereClause} AND status = 'COMPLETED'
      GROUP BY EXTRACT(DOW FROM "createdAt")
      ORDER BY day_of_week
    `;

    return {
      hourly: hourlyDistribution,
      daily: dailyDistribution
    };
  }

  /**
   * 💰 CALCULATE REVENUE SPLIT
   */
  calculateRevenueSplit(revenueMetrics, payoutMetrics) {
    const total = revenueMetrics.totalRevenue;
    if (total === 0) return { platform: 0, experts: 0, fees: 0 };

    return {
      platform: ((revenueMetrics.platformRevenue - payoutMetrics.expertPayouts) / total) * 100,
      experts: (payoutMetrics.expertPayouts / total) * 100,
      fees: (revenueMetrics.totalFees / total) * 100
    };
  }

  /**
   * 🕒 TIME RANGE WHERE CLAUSE
   */
  getTimeRangeWhereClause(timeRange) {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        return {}; // All time
    }

    return {
      createdAt: {
        gte: startDate
      }
    };
  }

  /**
   * 💾 CACHE METRICS
   */
  async cacheMetrics() {
    const cacheKey = 'revenue:current_metrics';
    await this.redis.setex(cacheKey, 60, JSON.stringify(this.metrics)); // 1 min cache
  }

  /**
   * 🔄 START REAL-TIME UPDATES
   */
  startRealTimeUpdates() {
    // Update metrics every minute
    this.metricsInterval = setInterval(async () => {
      try {
        await this.loadInitialMetrics();
        this.emit('metricsUpdated', this.metrics);
      } catch (error) {
        this.logger.error('Failed to update metrics', error);
      }
    }, 60000); // 1 minute

    // Listen for payment events
    this.on('paymentCompleted', async (payment) => {
      await this.handlePaymentUpdate(payment);
    });

    this.on('payoutProcessed', async (payout) => {
      await this.handlePayoutUpdate(payout);
    });
  }

  /**
   * 💳 HANDLE PAYMENT UPDATE
   */
  async handlePaymentUpdate(payment) {
    this.metrics.totalRevenue += payment.amount;
    this.metrics.platformRevenue += payment.amount * 0.5003; // 50.03% platform share
    
    await this.cacheMetrics();
    this.emit('revenueUpdated', this.metrics);
  }

  /**
   * 💸 HANDLE PAYOUT UPDATE
   */
  async handlePayoutUpdate(payout) {
    if (payout.status === 'COMPLETED') {
      this.metrics.expertPayouts += payout.amount;
    } else if (payout.status === 'PENDING') {
      this.metrics.pendingPayouts += payout.amount;
    }
    
    await this.cacheMetrics();
    this.emit('payoutsUpdated', this.metrics);
  }

  /**
   * 📤 EXPORT FINANCIAL REPORT
   */
  async exportFinancialReport(options = {}) {
    const {
      format = 'json',
      timeRange = '30d',
      includeDetails = true
    } = options;

    const dashboardData = await this.getRevenueDashboard({
      timeRange,
      includeTrends: true,
      includeBreakdown: true,
      realTime: false
    });

    if (format === 'csv') {
      return this.generateCSVReport(dashboardData);
    } else if (format === 'pdf') {
      return this.generatePDFReport(dashboardData);
    }

    return {
      report: dashboardData,
      generatedAt: new Date().toISOString(),
      reportId: `fin_report_${Date.now()}`,
      format: 'json'
    };
  }

  /**
   * 📄 GENERATE CSV REPORT
   */
  generateCSVReport(data) {
    // Simplified CSV generation - in production, use a proper CSV library
    const csvLines = [];
    
    // Summary section
    csvLines.push('Section,Metric,Value');
    csvLines.push('Summary,Total Revenue,' + data.summary.totalRevenue);
    csvLines.push('Summary,Platform Revenue,' + data.summary.platformRevenue);
    csvLines.push('Summary,Expert Payouts,' + data.summary.expertPayouts);
    csvLines.push('Summary,Net Revenue,' + data.summary.netRevenue);
    csvLines.push('Summary,Active Enrollments,' + data.summary.activeEnrollments);
    csvLines.push('Summary,Completion Rate,' + data.summary.completionRate.toFixed(2));
    csvLines.push('Summary,Refund Rate,' + data.summary.refundRate.toFixed(2));

    return csvLines.join('\n');
  }

  /**
   * 📄 GENERATE PDF REPORT
   */
  generatePDFReport(data) {
    // In production, integrate with a PDF generation service
    return {
      message: 'PDF report generation would be implemented with a PDF library',
      data: data,
      format: 'pdf'
    };
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
      }
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Revenue monitor resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new RevenueMonitor();