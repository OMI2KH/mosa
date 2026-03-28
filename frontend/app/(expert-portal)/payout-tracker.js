// (expert-portal)/payout-tracker.js

/**
 * 🎯 ENTERPRISE PAYOUT TRACKER
 * Production-ready earnings tracking system for Mosa Forge Experts
 * Features: Real-time earnings, 333/333/333 payout schedule, quality bonuses, tax calculations
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../../utils/logger');
const { DateTime } = require('luxon');
const { RateLimiterRedis } = require('rate-limiter-flexible');

class PayoutTracker extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('PayoutTracker');
    
    // Configuration
    this.payoutSchedule = {
      upfront: 333,      // Course start
      milestone: 333,    // 75% completion
      completion: 333    // Certification
    };
    
    this.tierBonuses = {
      MASTER: 0.20,      // 20% bonus
      SENIOR: 0.10,      // 10% bonus
      STANDARD: 0.00,    // Base rate
      DEVELOPING: -0.10, // 10% penalty
      PROBATION: -0.20   // 20% penalty
    };

    // Rate limiting for payout calculations
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (key) => `payout_calc:${key}`,
      points: 100, // 100 calculations per minute
      duration: 60,
    });

    this.initialize();
  }

  /**
   * Initialize payout tracker
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.warmUpPayoutCache();
      this.logger.info('Payout tracker initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize payout tracker', error);
      throw error;
    }
  }

  /**
   * 🎯 GET EXPERT EARNINGS OVERVIEW
   */
  async getExpertEarnings(expertId, timeframe = 'current_month') {
    const cacheKey = `earnings:${expertId}:${timeframe}`;
    const startTime = performance.now();

    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Calculate earnings
      const earnings = await this.calculateExpertEarnings(expertId, timeframe);

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(earnings));

      const processingTime = performance.now() - startTime;
      this.logger.metric('earnings_calculation_time', processingTime, { expertId, timeframe });

      return earnings;

    } catch (error) {
      this.logger.error('Failed to get expert earnings', error, { expertId, timeframe });
      throw error;
    }
  }

  /**
   * 💰 CALCULATE EXPERT EARNINGS
   */
  async calculateExpertEarnings(expertId, timeframe) {
    const { startDate, endDate } = this.getTimeframeDates(timeframe);
    
    const [
      enrollments,
      payouts,
      expert,
      qualityMetrics
    ] = await Promise.all([
      this.getEnrollmentsInPeriod(expertId, startDate, endDate),
      this.getPayoutsInPeriod(expertId, startDate, endDate),
      this.getExpertDetails(expertId),
      this.getQualityMetrics(expertId)
    ]);

    // Calculate projected earnings
    const projectedEarnings = await this.calculateProjectedEarnings(expertId, enrollments);

    // Calculate real-time metrics
    const realTimeMetrics = this.calculateRealTimeMetrics(enrollments, payouts, expert);

    const result = {
      summary: {
        totalEarned: realTimeMetrics.totalEarned,
        totalPending: realTimeMetrics.totalPending,
        totalProjected: projectedEarnings.total,
        nextPayoutDate: this.calculateNextPayoutDate(),
        currency: 'ETB'
      },
      breakdown: {
        byPayoutType: this.breakdownByPayoutType(payouts),
        byStudent: await this.breakdownByStudent(enrollments),
        byTimePeriod: this.breakdownByTimePeriod(payouts, timeframe)
      },
      performance: {
        currentTier: expert.currentTier,
        qualityScore: expert.qualityScore,
        bonusRate: this.tierBonuses[expert.currentTier] || 0,
        completionRate: qualityMetrics.completionRate,
        studentSatisfaction: qualityMetrics.averageRating
      },
      projections: {
        monthlyProjection: projectedEarnings.monthly,
        quarterlyProjection: projectedEarnings.quarterly,
        yearlyProjection: projectedEarnings.yearly,
        growthRate: this.calculateGrowthRate(expertId)
      },
      payoutSchedule: await this.getUpcomingPayouts(expertId)
    };

    return result;
  }

  /**
   * 📅 GET TIMEFRAME DATES
   */
  getTimeframeDates(timeframe) {
    const now = DateTime.now().setZone('Africa/Addis_Ababa');
    
    switch (timeframe) {
      case 'today':
        return {
          startDate: now.startOf('day').toJSDate(),
          endDate: now.endOf('day').toJSDate()
        };
      
      case 'this_week':
        return {
          startDate: now.startOf('week').toJSDate(),
          endDate: now.endOf('week').toJSDate()
        };
      
      case 'current_month':
        return {
          startDate: now.startOf('month').toJSDate(),
          endDate: now.endOf('month').toJSDate()
        };
      
      case 'last_30_days':
        return {
          startDate: now.minus({ days: 30 }).startOf('day').toJSDate(),
          endDate: now.endOf('day').toJSDate()
        };
      
      case 'last_90_days':
        return {
          startDate: now.minus({ days: 90 }).startOf('day').toJSDate(),
          endDate: now.endOf('day').toJSDate()
        };
      
      default:
        return {
          startDate: now.startOf('month').toJSDate(),
          endDate: now.endOf('month').toJSDate()
        };
    }
  }

  /**
   * 🎓 GET ENROLLMENTS IN PERIOD
   */
  async getEnrollmentsInPeriod(expertId, startDate, endDate) {
    return await this.prisma.enrollment.findMany({
      where: {
        expertId,
        OR: [
          {
            createdAt: { gte: startDate, lte: endDate }
          },
          {
            sessions: {
              some: {
                scheduledAt: { gte: startDate, lte: endDate }
              }
            }
          }
        ]
      },
      include: {
        student: {
          select: { name: true, faydaId: true }
        },
        sessions: {
          where: {
            scheduledAt: { gte: startDate, lte: endDate }
          },
          select: {
            id: true,
            status: true,
            scheduledAt: true,
            completedAt: true
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            type: true,
            status: true,
            scheduledAt: true,
            paidAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * 💸 GET PAYOUTS IN PERIOD
   */
  async getPayoutsInPeriod(expertId, startDate, endDate) {
    return await this.prisma.payout.findMany({
      where: {
        expertId,
        scheduledAt: { gte: startDate, lte: endDate },
        status: { in: ['PAID', 'PENDING', 'PROCESSING'] }
      },
      include: {
        enrollment: {
          select: {
            student: { select: { name: true } },
            skill: { select: { name: true } }
          }
        }
      },
      orderBy: { scheduledAt: 'desc' }
    });
  }

  /**
   * 👨‍🏫 GET EXPERT DETAILS
   */
  async getExpertDetails(expertId) {
    const cacheKey = `expert:${expertId}:details`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const expert = await this.prisma.expert.findUnique({
      where: { id: expertId },
      select: {
        id: true,
        name: true,
        currentTier: true,
        qualityScore: true,
        totalStudents: true,
        completedStudents: true,
        joinedAt: true,
        ratingHistory: true
      }
    });

    if (!expert) {
      throw new Error('EXPERT_NOT_FOUND');
    }

    // Cache for 15 minutes
    await this.redis.setex(cacheKey, 900, JSON.stringify(expert));

    return expert;
  }

  /**
   * 📊 GET QUALITY METRICS
   */
  async getQualityMetrics(expertId) {
    const cacheKey = `expert:${expertId}:quality_metrics`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const metrics = await this.prisma.qualityMetrics.findFirst({
      where: { expertId },
      select: {
        completionRate: true,
        averageRating: true,
        responseTime: true,
        studentSatisfaction: true,
        lastCalculatedAt: true
      }
    });

    const defaultMetrics = {
      completionRate: 0.70, // 70% minimum
      averageRating: 4.0,
      responseTime: 24,
      studentSatisfaction: 0.80,
      lastCalculatedAt: new Date()
    };

    const result = { ...defaultMetrics, ...metrics };

    // Cache for 10 minutes
    await this.redis.setex(cacheKey, 600, JSON.stringify(result));

    return result;
  }

  /**
   * 🔮 CALCULATE PROJECTED EARNINGS
   */
  async calculateProjectedEarnings(expertId, currentEnrollments) {
    const expert = await this.getExpertDetails(expertId);
    const activeStudents = currentEnrollments.filter(e => 
      ['ACTIVE', 'IN_PROGRESS'].includes(e.status)
    ).length;

    const baseEarningPerStudent = 999; // 999 ETB base
    const bonusRate = this.tierBonuses[expert.currentTier] || 0;
    const earningPerStudent = baseEarningPerStudent * (1 + bonusRate);

    // Calculate projections based on current performance
    const monthlyCompletionRate = await this.getMonthlyCompletionRate(expertId);
    const projectedMonthlyStudents = Math.floor(activeStudents * monthlyCompletionRate);

    return {
      total: projectedMonthlyStudents * earningPerStudent,
      monthly: projectedMonthlyStudents * earningPerStudent,
      quarterly: projectedMonthlyStudents * earningPerStudent * 3,
      yearly: projectedMonthlyStudents * earningPerStudent * 12,
      perStudent: earningPerStudent,
      projectedStudents: projectedMonthlyStudents,
      bonusRate: bonusRate
    };
  }

  /**
   * 📈 CALCULATE REAL-TIME METRICS
   */
  calculateRealTimeMetrics(enrollments, payouts, expert) {
    const totalEarned = payouts
      .filter(p => p.status === 'PAID')
      .reduce((sum, payout) => sum + payout.amount, 0);

    const totalPending = payouts
      .filter(p => p.status === 'PENDING')
      .reduce((sum, payout) => sum + payout.amount, 0);

    const activeEnrollments = enrollments.filter(e => 
      ['ACTIVE', 'IN_PROGRESS'].includes(e.status)
    ).length;

    const completionRate = expert.completedStudents / expert.totalStudents;

    return {
      totalEarned,
      totalPending,
      activeEnrollments,
      completionRate: isNaN(completionRate) ? 0 : completionRate,
      averageEarningPerStudent: expert.totalStudents > 0 ? 
        totalEarned / expert.totalStudents : 0
    };
  }

  /**
   * 🏷️ BREAKDOWN BY PAYOUT TYPE
   */
  breakdownByPayoutType(payouts) {
    const breakdown = {
      upfront: { amount: 0, count: 0 },
      milestone: { amount: 0, count: 0 },
      completion: { amount: 0, count: 0 },
      bonus: { amount: 0, count: 0 }
    };

    payouts.forEach(payout => {
      if (breakdown[payout.type]) {
        breakdown[payout.type].amount += payout.amount;
        breakdown[payout.type].count += 1;
      }
    });

    return breakdown;
  }

  /**
   * 👥 BREAKDOWN BY STUDENT
   */
  async breakdownByStudent(enrollments) {
    const studentBreakdown = {};

    for (const enrollment of enrollments) {
      const studentId = enrollment.studentId;
      
      if (!studentBreakdown[studentId]) {
        studentBreakdown[studentId] = {
          studentName: enrollment.student.name,
          totalEarned: 0,
          totalPending: 0,
          payments: [],
          completionStatus: enrollment.status
        };
      }

      const earnedFromStudent = enrollment.payments
        .filter(p => p.status === 'PAID')
        .reduce((sum, payment) => sum + payment.amount, 0);

      const pendingFromStudent = enrollment.payments
        .filter(p => p.status === 'PENDING')
        .reduce((sum, payment) => sum + payment.amount, 0);

      studentBreakdown[studentId].totalEarned += earnedFromStudent;
      studentBreakdown[studentId].totalPending += pendingFromStudent;
      studentBreakdown[studentId].payments.push(...enrollment.payments);
    }

    return Object.values(studentBreakdown);
  }

  /**
   * 📅 BREAKDOWN BY TIME PERIOD
   */
  breakdownByTimePeriod(payouts, timeframe) {
    const periods = {};
    const now = DateTime.now().setZone('Africa/Addis_Ababa');

    payouts.forEach(payout => {
      const payoutDate = DateTime.fromJSDate(payout.scheduledAt).setZone('Africa/Addis_Ababa');
      let periodKey;

      switch (timeframe) {
        case 'today':
          periodKey = payoutDate.toFormat('HH:00');
          break;
        case 'this_week':
          periodKey = payoutDate.toFormat('EEE');
          break;
        default:
          periodKey = payoutDate.toFormat('dd/MM');
      }

      if (!periods[periodKey]) {
        periods[periodKey] = { amount: 0, count: 0 };
      }

      periods[periodKey].amount += payout.amount;
      periods[periodKey].count += 1;
    });

    return periods;
  }

  /**
   * 📅 CALCULATE NEXT PAYOUT DATE
   */
  calculateNextPayoutDate() {
    const now = DateTime.now().setZone('Africa/Addis_Ababa');
    
    // Payouts happen on 1st, 10th, 20th of each month
    const payoutDays = [1, 10, 20];
    
    for (const day of payoutDays) {
      const payoutDate = now.set({ day });
      if (payoutDate > now) {
        return payoutDate.toJSDate();
      }
    }

    // If all payout days passed this month, use 1st of next month
    return now.plus({ months: 1 }).set({ day: 1 }).toJSDate();
  }

  /**
   * 📈 CALCULATE GROWTH RATE
   */
  async calculateGrowthRate(expertId) {
    const now = DateTime.now().setZone('Africa/Addis_Ababa');
    const currentMonth = now.startOf('month');
    const lastMonth = now.minus({ months: 1 }).startOf('month');

    const [currentEarnings, previousEarnings] = await Promise.all([
      this.getPayoutsInPeriod(expertId, currentMonth.toJSDate(), now.toJSDate()),
      this.getPayoutsInPeriod(expertId, lastMonth.toJSDate(), lastMonth.endOf('month').toJSDate())
    ]);

    const currentTotal = currentEarnings
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);

    const previousTotal = previousEarnings
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);

    if (previousTotal === 0) return currentTotal > 0 ? 100 : 0;

    return ((currentTotal - previousTotal) / previousTotal) * 100;
  }

  /**
   * 🗓️ GET UPCOMING PAYOUTS
   */
  async getUpcomingPayouts(expertId, limit = 10) {
    const now = new Date();
    
    return await this.prisma.payout.findMany({
      where: {
        expertId,
        scheduledAt: { gte: now },
        status: 'PENDING'
      },
      include: {
        enrollment: {
          select: {
            student: { select: { name: true } },
            skill: { select: { name: true } }
          }
        }
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit
    });
  }

  /**
   * 💰 CALCULATE INDIVIDUAL PAYOUT
   */
  async calculateStudentPayout(expertId, enrollmentId) {
    const cacheKey = `payout:calc:${expertId}:${enrollmentId}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [enrollment, expert, sessions] = await Promise.all([
      this.prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          student: { select: { name: true } },
          payments: true
        }
      }),
      this.getExpertDetails(expertId),
      this.prisma.trainingSession.findMany({
        where: { enrollmentId },
        orderBy: { scheduledAt: 'asc' }
      })
    ]);

    if (!enrollment || enrollment.expertId !== expertId) {
      throw new Error('ENROLLMENT_NOT_FOUND_OR_UNAUTHORIZED');
    }

    const baseAmount = 999; // 999 ETB base
    const bonusRate = this.tierBonuses[expert.currentTier] || 0;
    const totalAmount = baseAmount * (1 + bonusRate);

    const completionPercentage = this.calculateCompletionPercentage(sessions, enrollment);
    const payoutSchedule = this.calculatePayoutSchedule(totalAmount, completionPercentage, sessions);

    const result = {
      studentName: enrollment.student.name,
      baseAmount,
      bonusRate,
      totalAmount,
      completionPercentage,
      payoutSchedule,
      alreadyPaid: enrollment.payments.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: payoutSchedule.reduce((sum, payout) => sum + payout.amount, 0)
    };

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(result));

    return result;
  }

  /**
   * 📊 CALCULATE COMPLETION PERCENTAGE
   */
  calculateCompletionPercentage(sessions, enrollment) {
    if (sessions.length === 0) return 0;

    const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
    const totalSessions = sessions.length;

    return (completedSessions / totalSessions) * 100;
  }

  /**
   * 🗓️ CALCULATE PAYOUT SCHEDULE
   */
  calculatePayoutSchedule(totalAmount, completionPercentage, sessions) {
    const basePayout = totalAmount / 3; // 333/333/333 structure
    const schedule = [];

    // Upfront payout (course start)
    if (completionPercentage >= 0) {
      schedule.push({
        type: 'upfront',
        amount: basePayout,
        status: completionPercentage > 0 ? 'PAID' : 'PENDING',
        trigger: 'COURSE_START',
        scheduledAt: sessions[0]?.scheduledAt || new Date()
      });
    }

    // Milestone payout (75% completion)
    if (completionPercentage >= 75) {
      schedule.push({
        type: 'milestone',
        amount: basePayout,
        status: 'PAID',
        trigger: 'MILESTONE_75_PERCENT',
        scheduledAt: this.findMilestoneDate(sessions, 0.75)
      });
    } else if (completionPercentage > 0) {
      schedule.push({
        type: 'milestone',
        amount: basePayout,
        status: 'PENDING',
        trigger: 'MILESTONE_75_PERCENT',
        scheduledAt: this.projectMilestoneDate(sessions, 0.75)
      });
    }

    // Completion payout (100% + certification)
    if (completionPercentage >= 100) {
      schedule.push({
        type: 'completion',
        amount: basePayout,
        status: 'PENDING', // Requires manual verification
        trigger: 'CERTIFICATION',
        scheduledAt: sessions[sessions.length - 1]?.completedAt || new Date()
      });
    } else if (completionPercentage > 75) {
      schedule.push({
        type: 'completion',
        amount: basePayout,
        status: 'PENDING',
        trigger: 'CERTIFICATION',
        scheduledAt: this.projectCompletionDate(sessions)
      });
    }

    return schedule;
  }

  /**
   * 📅 FIND MILESTONE DATE
   */
  findMilestoneDate(sessions, milestonePercentage) {
    const milestoneSessionIndex = Math.floor(sessions.length * milestonePercentage) - 1;
    return sessions[Math.max(0, milestoneSessionIndex)]?.scheduledAt || new Date();
  }

  /**
   * 🔮 PROJECT MILESTONE DATE
   */
  projectMilestoneDate(sessions, milestonePercentage) {
    if (sessions.length === 0) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week default
    
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
    const sessionsNeeded = Math.ceil(sessions.length * milestonePercentage) - completedSessions;
    const averageSessionInterval = this.calculateAverageSessionInterval(sessions);
    
    return new Date(Date.now() + sessionsNeeded * averageSessionInterval);
  }

  /**
   * 📅 PROJECT COMPLETION DATE
   */
  projectCompletionDate(sessions) {
    if (sessions.length === 0) return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks default
    
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
    const sessionsRemaining = sessions.length - completedSessions;
    const averageSessionInterval = this.calculateAverageSessionInterval(sessions);
    
    return new Date(Date.now() + sessionsRemaining * averageSessionInterval);
  }

  /**
   * ⏱️ CALCULATE AVERAGE SESSION INTERVAL
   */
  calculateAverageSessionInterval(sessions) {
    if (sessions.length < 2) return 2 * 24 * 60 * 60 * 1000; // 2 days default

    const completedSessions = sessions
      .filter(s => s.status === 'COMPLETED')
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    if (completedSessions.length < 2) return 2 * 24 * 60 * 60 * 1000;

    let totalInterval = 0;
    for (let i = 1; i < completedSessions.length; i++) {
      const interval = new Date(completedSessions[i].scheduledAt) - new Date(completedSessions[i - 1].scheduledAt);
      totalInterval += interval;
    }

    return totalInterval / (completedSessions.length - 1);
  }

  /**
   * 📈 GET MONTHLY COMPLETION RATE
   */
  async getMonthlyCompletionRate(expertId) {
    const cacheKey = `expert:${expertId}:completion_rate`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return parseFloat(cached);
    }

    const threeMonthsAgo = DateTime.now().minus({ months: 3 }).toJSDate();
    
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        expertId,
        createdAt: { gte: threeMonthsAgo },
        status: { in: ['COMPLETED', 'CANCELLED', 'ACTIVE'] }
      },
      select: {
        status: true,
        createdAt: true,
        completedAt: true
      }
    });

    const completed = enrollments.filter(e => e.status === 'COMPLETED').length;
    const totalTracked = enrollments.filter(e => 
      ['COMPLETED', 'CANCELLED'].includes(e.status)
    ).length;

    const completionRate = totalTracked > 0 ? completed / totalTracked : 0.70; // Default 70%

    // Cache for 1 day
    await this.redis.setex(cacheKey, 86400, completionRate.toString());

    return completionRate;
  }

  /**
   * 🔥 WARM UP PAYOUT CACHE
   */
  async warmUpPayoutCache() {
    try {
      const activeExperts = await this.prisma.expert.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true }
      });

      const pipeline = this.redis.pipeline();
      
      for (const expert of activeExperts) {
        const cacheKey = `earnings:${expert.id}:current_month`;
        pipeline.get(cacheKey); // Just trigger cache population on next access
      }

      await pipeline.exec();
      this.logger.info(`Payout cache warmup initiated for ${activeExperts.length} experts`);
    } catch (error) {
      this.logger.error('Failed to warm up payout cache', error);
    }
  }

  /**
   * 📊 GENERATE EARNINGS REPORT
   */
  async generateEarningsReport(expertId, startDate, endDate, format = 'json') {
    const cacheKey = `earnings:report:${expertId}:${startDate.getTime()}:${endDate.getTime()}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached && format === 'json') {
      return JSON.parse(cached);
    }

    const [payouts, enrollments, expert] = await Promise.all([
      this.getPayoutsInPeriod(expertId, startDate, endDate),
      this.getEnrollmentsInPeriod(expertId, startDate, endDate),
      this.getExpertDetails(expertId)
    ]);

    const report = {
      metadata: {
        expertId,
        expertName: expert.name,
        reportPeriod: { startDate, endDate },
        generatedAt: new Date(),
        currency: 'ETB'
      },
      financialSummary: {
        totalEarnings: payouts.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0),
        pendingPayouts: payouts.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0),
        averagePerStudent: expert.totalStudents > 0 ? 
          (payouts.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.amount, 0) / expert.totalStudents) : 0,
        tierBonusEarnings: this.calculateTierBonusEarnings(payouts, expert)
      },
      detailedBreakdown: {
        byPayoutType: this.breakdownByPayoutType(payouts),
        byStudent: await this.breakdownByStudent(enrollments),
        byWeek: this.breakdownByWeek(payouts)
      },
      performanceMetrics: {
        completionRate: expert.completedStudents / expert.totalStudents,
        studentSatisfaction: await this.getQualityMetrics(expertId).then(m => m.averageRating),
        tier: expert.currentTier,
        bonusRate: this.tierBonuses[expert.currentTier] || 0
      }
    };

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(report));

    return format === 'csv' ? this.convertToCSV(report) : report;
  }

  /**
   * 💵 CALCULATE TIER BONUS EARNINGS
   */
  calculateTierBonusEarnings(payouts, expert) {
    const baseEarnings = payouts
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + (p.amount / (1 + (this.tierBonuses[expert.currentTier] || 0))), 0);

    const actualEarnings = payouts
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);

    return actualEarnings - baseEarnings;
  }

  /**
   * 📅 BREAKDOWN BY WEEK
   */
  breakdownByWeek(payouts) {
    const weeklyBreakdown = {};

    payouts.forEach(payout => {
      const weekStart = DateTime.fromJSDate(payout.scheduledAt)
        .startOf('week')
        .toFormat('yyyy-MM-dd');

      if (!weeklyBreakdown[weekStart]) {
        weeklyBreakdown[weekStart] = { amount: 0, count: 0 };
      }

      weeklyBreakdown[weekStart].amount += payout.amount;
      weeklyBreakdown[weekStart].count += 1;
    });

    return weeklyBreakdown;
  }

  /**
   * 📄 CONVERT TO CSV
   */
  convertToCSV(report) {
    const headers = ['Date', 'Student', 'Type', 'Amount', 'Status'];
    const rows = [];

    // Flatten payout data
    report.detailedBreakdown.byStudent.forEach(student => {
      student.payments.forEach(payment => {
        rows.push([
          payment.scheduledAt.toISOString().split('T')[0],
          student.studentName,
          payment.type,
          payment.amount,
          payment.status
        ]);
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Payout tracker resources cleaned up');
    } catch (error) {
      this.logger.error('Error during payout tracker cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new PayoutTracker();