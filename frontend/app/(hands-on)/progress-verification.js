// (hands-on)/progress-verification.js

/**
 * 🎯 ENTERPRISE PROGRESS VERIFICATION SYSTEM
 * Production-ready progress tracking for Mosa Forge Hands-on Training
 * Features: Real-time progress monitoring, milestone validation, quality assurance
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../../utils/logger');
const { QualityCalculator } = require('../../utils/quality-calculations');
const { RateLimiterRedis } = require('rate-limiter-flexible');

class ProgressVerificationSystem extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('ProgressVerification');
    this.qualityCalculator = new QualityCalculator();

    // Progress milestones configuration
    this.milestones = {
      WEEKLY_PROGRESS_THRESHOLD: 5, // Minimum 5% weekly progress
      COMPLETION_THRESHOLD: 70, // 70% completion required
      HANDS_ON_DURATION: 60, // 60 days hands-on phase
      SESSION_ATTENDANCE_REQUIRED: 0.8, // 80% attendance minimum
      PRACTICAL_WORK_COMPLETION: 0.85 // 85% practical work completion
    };

    this.initialize();
  }

  /**
   * Initialize progress verification system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.loadProgressTemplates();
      this.logger.info('Progress verification system initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize progress verification', error);
      throw error;
    }
  }

  /**
   * 🎯 TRACK SESSION PROGRESS - Core progress tracking
   */
  async trackSessionProgress(sessionData) {
    const startTime = performance.now();

    try {
      // 🛡️ VALIDATION PHASE
      await this.validateSessionProgress(sessionData);

      // 📊 PROGRESS CALCULATION
      const progressMetrics = await this.calculateProgressMetrics(sessionData);

      // 💾 PROGRESS RECORDING
      const progressRecord = await this.recordProgressUpdate(sessionData, progressMetrics);

      // 🎯 MILESTONE CHECKING
      const milestoneUpdates = await this.checkMilestoneAchievements(progressRecord);

      // 📈 QUALITY VERIFICATION
      const qualityStatus = await this.verifyProgressQuality(progressRecord);

      // 🔔 REAL-TIME UPDATES
      await this.updateProgressDashboard(progressRecord);

      const processingTime = performance.now() - startTime;
      this.logger.metric('progress_tracking_time', processingTime, {
        studentId: sessionData.studentId,
        sessionId: sessionData.sessionId
      });

      return {
        success: true,
        progressId: progressRecord.id,
        currentProgress: progressMetrics.overallProgress,
        weeklyProgress: progressMetrics.weeklyProgress,
        milestonesAchieved: milestoneUpdates.achieved,
        qualityStatus: qualityStatus.status,
        nextMilestone: milestoneUpdates.nextMilestone,
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Progress tracking failed', error, { sessionData });
      throw error;
    }
  }

  /**
   * 🛡️ COMPREHENSIVE PROGRESS VALIDATION
   */
  async validateSessionProgress(sessionData) {
    const {
      studentId,
      expertId,
      sessionId,
      progressData,
      attendanceStatus,
      practicalWork
    } = sessionData;

    // Required fields validation
    if (!studentId || !expertId || !sessionId || !progressData) {
      throw new Error('MISSING_REQUIRED_PROGRESS_FIELDS');
    }

    // Session existence and authorization check
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        enrollment: {
          include: {
            student: true,
            expert: true
          }
        }
      }
    });

    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }

    if (session.enrollment.studentId !== studentId) {
      throw new Error('UNAUTHORIZED_PROGRESS_TRACKING');
    }

    if (session.enrollment.expertId !== expertId) {
      throw new Error('EXPERT_STUDENT_MISMATCH');
    }

    // Progress data validation
    if (progressData.overallProgress < 0 || progressData.overallProgress > 100) {
      throw new Error('INVALID_PROGRESS_RANGE');
    }

    // Attendance validation
    if (attendanceStatus && !['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(attendanceStatus)) {
      throw new Error('INVALID_ATTENDANCE_STATUS');
    }

    // Practical work completion validation
    if (practicalWork && practicalWork.completionPercentage < 0) {
      throw new Error('INVALID_PRACTICAL_COMPLETION');
    }

    this.logger.debug('Progress validation passed', { studentId, expertId, sessionId });
  }

  /**
   * 📊 CALCULATE COMPREHENSIVE PROGRESS METRICS
   */
  async calculateProgressMetrics(sessionData) {
    const { studentId, enrollmentId, progressData, practicalWork, attendanceStatus } = sessionData;

    // Get historical progress data
    const progressHistory = await this.prisma.progressTracking.findMany({
      where: {
        enrollmentId,
        studentId
      },
      orderBy: { trackedAt: 'desc' },
      take: 10
    });

    // Calculate overall progress
    const overallProgress = this.calculateOverallProgress(progressData, practicalWork);

    // Calculate weekly progress
    const weeklyProgress = this.calculateWeeklyProgress(progressHistory, overallProgress);

    // Calculate attendance rate
    const attendanceRate = await this.calculateAttendanceRate(enrollmentId);

    // Calculate practical work completion
    const practicalCompletion = this.calculatePracticalCompletion(practicalWork);

    // Calculate progress velocity
    const progressVelocity = this.calculateProgressVelocity(progressHistory, overallProgress);

    return {
      overallProgress,
      weeklyProgress,
      attendanceRate,
      practicalCompletion,
      progressVelocity,
      lastUpdated: new Date(),
      metrics: {
        theoryUnderstanding: progressData.theoryScore || 0,
        practicalApplication: practicalWork?.applicationScore || 0,
        problemSolving: progressData.problemSolvingScore || 0,
        skillMastery: progressData.skillMasteryLevel || 0
      }
    };
  }

  /**
   * 🎯 CALCULATE OVERALL PROGRESS
   */
  calculateOverallProgress(progressData, practicalWork) {
    const weights = {
      theory: 0.3,
      practical: 0.4,
      attendance: 0.2,
      assignments: 0.1
    };

    let overallScore = 0;

    // Theory progress (30%)
    if (progressData.theoryScore) {
      overallScore += progressData.theoryScore * weights.theory;
    }

    // Practical work (40%)
    if (practicalWork) {
      const practicalScore = (practicalWork.completionPercentage / 100) * 
                           (practicalWork.qualityScore || 1);
      overallScore += practicalScore * weights.practical;
    }

    // Attendance (20%)
    if (progressData.attendanceScore) {
      overallScore += progressData.attendanceScore * weights.attendance;
    }

    // Assignments (10%)
    if (progressData.assignmentCompletion) {
      overallScore += (progressData.assignmentCompletion / 100) * weights.assignments;
    }

    return Math.min(Math.max(overallScore * 100, 0), 100);
  }

  /**
   * 📈 CALCULATE WEEKLY PROGRESS
   */
  calculateWeeklyProgress(progressHistory, currentProgress) {
    if (progressHistory.length === 0) return currentProgress;

    const lastWeekProgress = progressHistory.find(progress => {
      const daysDiff = (new Date() - new Date(progress.trackedAt)) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });

    if (!lastWeekProgress) return currentProgress;

    return Math.max(0, currentProgress - lastWeekProgress.overallProgress);
  }

  /**
   * 📊 CALCULATE ATTENDANCE RATE
   */
  async calculateAttendanceRate(enrollmentId) {
    const sessions = await this.prisma.trainingSession.findMany({
      where: { enrollmentId },
      select: { attendanceStatus: true }
    });

    if (sessions.length === 0) return 1; // 100% if no sessions

    const presentSessions = sessions.filter(s => 
      s.attendanceStatus === 'PRESENT' || s.attendanceStatus === 'EXCUSED'
    ).length;

    return presentSessions / sessions.length;
  }

  /**
   * 🔧 CALCULATE PRACTICAL COMPLETION
   */
  calculatePracticalCompletion(practicalWork) {
    if (!practicalWork) return 0;

    const baseCompletion = practicalWork.completionPercentage / 100;
    const qualityMultiplier = practicalWork.qualityScore || 1;
    const complexityFactor = practicalWork.complexityLevel || 1;

    return baseCompletion * qualityMultiplier * complexityFactor;
  }

  /**
   * 🚀 CALCULATE PROGRESS VELOCITY
   */
  calculateProgressVelocity(progressHistory, currentProgress) {
    if (progressHistory.length < 2) return 0;

    const recentProgress = progressHistory.slice(0, 2);
    const timeDiff = (new Date(recentProgress[0].trackedAt) - new Date(recentProgress[1].trackedAt)) / (1000 * 60 * 60 * 24);
    
    if (timeDiff === 0) return 0;

    const progressDiff = currentProgress - recentProgress[1].overallProgress;
    return progressDiff / timeDiff; // Progress per day
  }

  /**
   * 💾 RECORD PROGRESS UPDATE
   */
  async recordProgressUpdate(sessionData, progressMetrics) {
    return await this.prisma.$transaction(async (tx) => {
      // Create progress tracking record
      const progressRecord = await tx.progressTracking.create({
        data: {
          studentId: sessionData.studentId,
          expertId: sessionData.expertId,
          enrollmentId: sessionData.enrollmentId,
          sessionId: sessionData.sessionId,
          overallProgress: progressMetrics.overallProgress,
          weeklyProgress: progressMetrics.weeklyProgress,
          attendanceRate: progressMetrics.attendanceRate,
          practicalCompletion: progressMetrics.practicalCompletion,
          progressVelocity: progressMetrics.progressVelocity,
          metrics: progressMetrics.metrics,
          trackedAt: new Date(),
          status: this.determineProgressStatus(progressMetrics),
          metadata: {
            sessionType: sessionData.sessionType,
            practicalWork: sessionData.practicalWork,
            expertFeedback: sessionData.expertFeedback,
            studentSelfAssessment: sessionData.studentSelfAssessment
          }
        },
        include: {
          student: {
            select: { name: true, faydaId: true }
          },
          expert: {
            select: { name: true, currentTier: true }
          },
          enrollment: {
            select: { skill: true, startDate: true, targetEndDate: true }
          }
        }
      });

      // Update enrollment progress
      await tx.enrollment.update({
        where: { id: sessionData.enrollmentId },
        data: {
          currentProgress: progressMetrics.overallProgress,
          lastProgressUpdate: new Date(),
          progressHistory: {
            push: {
              progress: progressMetrics.overallProgress,
              timestamp: new Date(),
              sessionId: sessionData.sessionId
            }
          }
        }
      });

      // Update session with progress data
      await tx.trainingSession.update({
        where: { id: sessionData.sessionId },
        data: {
          progressTracked: true,
          progressTrackingId: progressRecord.id,
          practicalWorkCompleted: sessionData.practicalWork?.completionPercentage || 0
        }
      });

      return progressRecord;
    }, {
      maxWait: 5000,
      timeout: 10000
    });
  }

  /**
   * 🎯 CHECK MILESTONE ACHIEVEMENTS
   */
  async checkMilestoneAchievements(progressRecord) {
    const milestones = this.getProgressMilestones();
    const currentProgress = progressRecord.overallProgress;
    const enrollmentId = progressRecord.enrollmentId;

    // Get previously achieved milestones
    const achievedMilestones = await this.prisma.milestoneAchievement.findMany({
      where: { enrollmentId },
      select: { milestoneKey: true }
    });

    const achievedKeys = new Set(achievedMilestones.map(m => m.milestoneKey));
    const newlyAchieved = [];
    const nextMilestone = this.findNextMilestone(milestones, currentProgress, achievedKeys);

    // Check for new milestone achievements
    for (const milestone of milestones) {
      if (!achievedKeys.has(milestone.key) && currentProgress >= milestone.threshold) {
        newlyAchieved.push(milestone);

        // Record milestone achievement
        await this.prisma.milestoneAchievement.create({
          data: {
            enrollmentId,
            studentId: progressRecord.studentId,
            expertId: progressRecord.expertId,
            milestoneKey: milestone.key,
            milestoneName: milestone.name,
            progressThreshold: milestone.threshold,
            achievedAt: new Date(),
            reward: milestone.reward,
            metadata: {
              currentProgress,
              sessionId: progressRecord.sessionId
            }
          }
        });

        // Emit milestone achievement event
        this.emit('milestoneAchieved', {
          studentId: progressRecord.studentId,
          expertId: progressRecord.expertId,
          milestone: milestone,
          progress: currentProgress,
          achievementDate: new Date()
        });
      }
    }

    return {
      achieved: newlyAchieved,
      nextMilestone,
      totalAchieved: achievedKeys.size + newlyAchieved.length
    };
  }

  /**
   * 📋 GET PROGRESS MILESTONES
   */
  getProgressMilestones() {
    return [
      { key: 'theory_basics', name: 'Theory Basics Mastered', threshold: 10, reward: 'Basic Theory Badge' },
      { key: 'first_project', name: 'First Project Completed', threshold: 25, reward: 'Project Starter Badge' },
      { key: 'skill_competence', name: 'Skill Competence Achieved', threshold: 50, reward: 'Competence Certificate' },
      { key: 'advanced_projects', name: 'Advanced Projects Mastered', threshold: 75, reward: 'Advanced Practitioner' },
      { key: 'hands_on_mastery', name: 'Hands-on Mastery', threshold: 85, reward: 'Hands-on Master Badge' },
      { key: 'certification_ready', name: 'Certification Ready', threshold: 95, reward: 'Certification Eligibility' }
    ];
  }

  /**
   * 🔍 FIND NEXT MILESTONE
   */
  findNextMilestone(milestones, currentProgress, achievedKeys) {
    const upcoming = milestones
      .filter(milestone => !achievedKeys.has(milestone.key) && milestone.threshold > currentProgress)
      .sort((a, b) => a.threshold - b.threshold);

    return upcoming[0] || null;
  }

  /**
   * 🛡️ VERIFY PROGRESS QUALITY
   */
  async verifyProgressQuality(progressRecord) {
    const qualityChecks = {
      weeklyProgress: progressRecord.weeklyProgress >= this.milestones.WEEKLY_PROGRESS_THRESHOLD,
      attendance: progressRecord.attendanceRate >= this.milestones.SESSION_ATTENDANCE_REQUIRED,
      practicalWork: progressRecord.practicalCompletion >= this.milestones.PRACTICAL_WORK_COMPLETION,
      progressConsistency: progressRecord.progressVelocity >= 0 // Positive or zero velocity
    };

    const passedChecks = Object.values(qualityChecks).filter(Boolean).length;
    const totalChecks = Object.values(qualityChecks).length;
    const qualityScore = passedChecks / totalChecks;

    let status = 'EXCELLENT';
    if (qualityScore < 0.5) status = 'AT_RISK';
    else if (qualityScore < 0.75) status = 'NEEDS_IMPROVEMENT';
    else if (qualityScore < 0.9) status = 'GOOD';

    // Update quality status in database
    await this.prisma.progressTracking.update({
      where: { id: progressRecord.id },
      data: { qualityStatus: status, qualityScore }
    });

    // Trigger interventions if quality is at risk
    if (status === 'AT_RISK') {
      await this.triggerQualityIntervention(progressRecord);
    }

    return { status, qualityScore, checks: qualityChecks };
  }

  /**
   * 🚨 TRIGGER QUALITY INTERVENTION
   */
  async triggerQualityIntervention(progressRecord) {
    const intervention = {
      type: 'PROGRESS_AT_RISK',
      studentId: progressRecord.studentId,
      expertId: progressRecord.expertId,
      enrollmentId: progressRecord.enrollmentId,
      triggeredAt: new Date(),
      issues: [],
      recommendedActions: []
    };

    // Analyze specific issues
    if (progressRecord.weeklyProgress < this.milestones.WEEKLY_PROGRESS_THRESHOLD) {
      intervention.issues.push('INSUFFICIENT_WEEKLY_PROGRESS');
      intervention.recommendedActions.push('SCHEDULE_EXTRA_SESSIONS');
    }

    if (progressRecord.attendanceRate < this.milestones.SESSION_ATTENDANCE_REQUIRED) {
      intervention.issues.push('LOW_ATTENDANCE');
      intervention.recommendedActions.push('ATTENDANCE_REVIEW_SESSION');
    }

    if (progressRecord.practicalCompletion < this.milestones.PRACTICAL_WORK_COMPLETION) {
      intervention.issues.push('INCOMPLETE_PRACTICAL_WORK');
      intervention.recommendedActions.push('PRACTICAL_WORK_REVIEW');
    }

    // Create intervention record
    await this.prisma.qualityIntervention.create({
      data: intervention
    });

    // Notify expert and student
    this.emit('qualityInterventionTriggered', intervention);

    this.logger.warn('Quality intervention triggered', intervention);
  }

  /**
   * 📊 UPDATE PROGRESS DASHBOARD
   */
  async updateProgressDashboard(progressRecord) {
    const dashboardKey = `progress:dashboard:${progressRecord.enrollmentId}`;
    const studentKey = `student:progress:${progressRecord.studentId}`;
    const expertKey = `expert:progress:${progressRecord.expertId}`;

    const pipeline = this.redis.pipeline();

    // Update enrollment progress
    pipeline.hset(dashboardKey, {
      currentProgress: progressRecord.overallProgress,
      weeklyProgress: progressRecord.weeklyProgress,
      lastUpdated: Date.now(),
      qualityStatus: progressRecord.qualityStatus
    });

    pipeline.expire(dashboardKey, 86400); // 24 hours

    // Update student progress summary
    pipeline.zadd('student:progress:rankings', progressRecord.overallProgress, progressRecord.studentId);

    // Update expert student progress
    pipeline.hset(expertKey, `enrollment:${progressRecord.enrollmentId}`, JSON.stringify({
      progress: progressRecord.overallProgress,
      student: progressRecord.student.name,
      lastSession: progressRecord.trackedAt
    }));

    await pipeline.exec();

    this.logger.debug('Progress dashboard updated', {
      enrollmentId: progressRecord.enrollmentId,
      progress: progressRecord.overallProgress
    });
  }

  /**
   * 🎯 DETERMINE PROGRESS STATUS
   */
  determineProgressStatus(progressMetrics) {
    if (progressMetrics.overallProgress >= 95) return 'CERTIFICATION_READY';
    if (progressMetrics.overallProgress >= 85) return 'MASTERY_LEVEL';
    if (progressMetrics.overallProgress >= 70) return 'ADVANCED';
    if (progressMetrics.overallProgress >= 50) return 'INTERMEDIATE';
    if (progressMetrics.overallProgress >= 25) return 'BEGINNER';
    return 'STARTING';
  }

  /**
   * 📈 GET PROGRESS ANALYTICS
   */
  async getProgressAnalytics(enrollmentId, period = '30d') {
    const cacheKey = `analytics:progress:${enrollmentId}:${period}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const days = parseInt(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const progressData = await this.prisma.progressTracking.findMany({
      where: {
        enrollmentId,
        trackedAt: { gte: startDate }
      },
      orderBy: { trackedAt: 'asc' },
      select: {
        overallProgress: true,
        weeklyProgress: true,
        attendanceRate: true,
        practicalCompletion: true,
        trackedAt: true,
        qualityStatus: true
      }
    });

    const analytics = {
      progressTrend: this.calculateProgressTrend(progressData),
      averageWeeklyProgress: this.calculateAverageWeeklyProgress(progressData),
      consistencyScore: this.calculateConsistencyScore(progressData),
      completionEstimate: this.estimateCompletionDate(progressData),
      riskFactors: this.identifyRiskFactors(progressData)
    };

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(analytics));

    return analytics;
  }

  /**
   * 📊 CALCULATE PROGRESS TREND
   */
  calculateProgressTrend(progressData) {
    if (progressData.length < 2) return 'INSUFFICIENT_DATA';

    const firstProgress = progressData[0].overallProgress;
    const lastProgress = progressData[progressData.length - 1].overallProgress;
    const progressDiff = lastProgress - firstProgress;

    if (progressDiff > 10) return 'RAPID_GROWTH';
    if (progressDiff > 5) return 'STEADY_GROWTH';
    if (progressDiff > 0) return 'SLOW_GROWTH';
    if (progressDiff === 0) return 'STAGNANT';
    return 'DECLINING';
  }

  /**
   * 📈 CALCULATE AVERAGE WEEKLY PROGRESS
   */
  calculateAverageWeeklyProgress(progressData) {
    const weeklyProgressValues = progressData
      .map(p => p.weeklyProgress)
      .filter(p => p > 0);

    if (weeklyProgressValues.length === 0) return 0;

    const sum = weeklyProgressValues.reduce((acc, curr) => acc + curr, 0);
    return sum / weeklyProgressValues.length;
  }

  /**
   * 🎯 CALCULATE CONSISTENCY SCORE
   */
  calculateConsistencyScore(progressData) {
    if (progressData.length < 2) return 1;

    const progressChanges = [];
    for (let i = 1; i < progressData.length; i++) {
      const change = progressData[i].overallProgress - progressData[i - 1].overallProgress;
      progressChanges.push(change);
    }

    // Calculate coefficient of variation
    const mean = progressChanges.reduce((a, b) => a + b, 0) / progressChanges.length;
    const variance = progressChanges.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / progressChanges.length;
    const stdDev = Math.sqrt(variance);

    const coefficientOfVariation = stdDev / Math.abs(mean);
    return Math.max(0, 1 - coefficientOfVariation);
  }

  /**
   * 📅 ESTIMATE COMPLETION DATE
   */
  estimateCompletionDate(progressData) {
    if (progressData.length < 2) return null;

    const recentProgress = progressData.slice(-5); // Last 5 data points
    const totalProgress = recentProgress.reduce((sum, p) => sum + p.weeklyProgress, 0);
    const averageWeeklyProgress = totalProgress / recentProgress.length;

    if (averageWeeklyProgress <= 0) return null;

    const remainingProgress = 100 - progressData[progressData.length - 1].overallProgress;
    const weeksRemaining = remainingProgress / averageWeeklyProgress;
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + Math.ceil(weeksRemaining * 7));

    return completionDate;
  }

  /**
   * 🚨 IDENTIFY RISK FACTORS
   */
  identifyRiskFactors(progressData) {
    const risks = [];

    if (progressData.length > 0) {
      const current = progressData[progressData.length - 1];

      if (current.weeklyProgress < this.milestones.WEEKLY_PROGRESS_THRESHOLD) {
        risks.push('LOW_WEEKLY_PROGRESS');
      }

      if (current.attendanceRate < this.milestones.SESSION_ATTENDANCE_REQUIRED) {
        risks.push('LOW_ATTENDANCE');
      }

      if (current.practicalCompletion < this.milestones.PRACTICAL_WORK_COMPLETION) {
        risks.push('INCOMPLETE_PRACTICAL_WORK');
      }
    }

    return risks;
  }

  /**
   * 🔄 LOAD PROGRESS TEMPLATES
   */
  async loadProgressTemplates() {
    // Load skill-specific progress templates
    const templates = {
      'forex_trading': {
        milestones: [10, 25, 50, 75, 90, 100],
        practicalWorkWeight: 0.6,
        theoryWeight: 0.4
      },
      'graphic_design': {
        milestones: [15, 30, 55, 80, 95, 100],
        practicalWorkWeight: 0.7,
        theoryWeight: 0.3
      },
      // Add more skill templates...
    };

    await this.redis.set('progress:templates', JSON.stringify(templates));
    this.logger.info('Progress templates loaded successfully');
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Progress verification system resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new ProgressVerificationSystem();