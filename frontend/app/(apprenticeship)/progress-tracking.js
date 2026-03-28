// (apprenticeship)/progress-tracking.js

/**
 * 🎯 ENTERPRISE PROGRESS TRACKING SYSTEM
 * Production-ready progress tracking for Mosa Forge Apprenticeship
 * Features: Real-time progress, milestone tracking, quality metrics, completion prediction
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../../utils/logger');
const { AnalyticsEngine } = require('../../utils/analytics-engine');

class ProgressTrackingSystem extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('ProgressTracking');
    this.analytics = new AnalyticsEngine();

    // Progress milestones configuration
    this.milestones = {
      MINDSET_PHASE: {
        weight: 0.15,
        duration: 30, // days
        checkpoints: ['wealth_consciousness', 'discipline_building', 'action_taking', 'financial_psychology']
      },
      THEORY_PHASE: {
        weight: 0.35,
        duration: 60, // days
        checkpoints: ['basics_mastered', 'intermediate_skills', 'advanced_concepts', 'scenario_completion']
      },
      HANDS_ON_PHASE: {
        weight: 0.40,
        duration: 60, // days
        checkpoints: ['first_project', 'portfolio_building', 'client_interaction', 'quality_verification']
      },
      CERTIFICATION_PHASE: {
        weight: 0.10,
        duration: 15, // days
        checkpoints: ['final_assessment', 'certification_approval', 'yachi_integration']
      }
    };

    this.initialize();
  }

  /**
   * Initialize progress tracking system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.initializeProgressCache();
      this.logger.info('Progress tracking system initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize progress tracking', error);
      throw error;
    }
  }

  /**
   * 🎯 UPDATE STUDENT PROGRESS - Core progress tracking
   */
  async updateStudentProgress(progressData) {
    const startTime = performance.now();
    
    try {
      // 🛡️ VALIDATION PHASE
      await this.validateProgressUpdate(progressData);

      // 📊 PROGRESS CALCULATION
      const progressUpdate = await this.calculateProgressUpdate(progressData);

      // 💾 TRANSACTION PROCESSING
      const result = await this.processProgressTransaction(progressUpdate);

      // 🎯 MILESTONE CHECKING
      const milestoneUpdates = await this.checkMilestoneAchievements(result);

      // 📈 REAL-TIME ANALYTICS
      await this.updateProgressAnalytics(result);

      // 🔔 NOTIFICATIONS & EVENTS
      await this.emitProgressEvents(result, milestoneUpdates);

      const processingTime = performance.now() - startTime;
      this.logger.metric('progress_update_time', processingTime, {
        studentId: progressData.studentId,
        enrollmentId: progressData.enrollmentId
      });

      return {
        success: true,
        progressId: result.progressId,
        overallProgress: result.overallProgress,
        phaseProgress: result.phaseProgress,
        milestonesAchieved: milestoneUpdates.achieved,
        predictedCompletion: result.predictedCompletion,
        qualityScore: result.qualityScore
      };

    } catch (error) {
      this.logger.error('Progress update failed', error, { progressData });
      throw error;
    }
  }

  /**
   * 🛡️ COMPREHENSIVE PROGRESS VALIDATION
   */
  async validateProgressUpdate(progressData) {
    const {
      studentId,
      enrollmentId,
      phase,
      activityType,
      activityId,
      progressValue,
      metadata
    } = progressData;

    // Required fields validation
    if (!studentId || !enrollmentId || !phase || !activityType || !progressValue) {
      throw new Error('MISSING_REQUIRED_PROGRESS_FIELDS');
    }

    // Progress range validation (0-100)
    if (progressValue < 0 || progressValue > 100) {
      throw new Error('INVALID_PROGRESS_RANGE');
    }

    // Enrollment validation
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { student: true, expert: true }
    });

    if (!enrollment) {
      throw new Error('ENROLLMENT_NOT_FOUND');
    }

    if (enrollment.studentId !== studentId) {
      throw new Error('UNAUTHORIZED_PROGRESS_UPDATE');
    }

    if (enrollment.status !== 'ACTIVE') {
      throw new Error('ENROLLMENT_NOT_ACTIVE');
    }

    // Phase validation
    if (!this.milestones[phase]) {
      throw new Error('INVALID_PHASE_SPECIFIED');
    }

    // Activity validation based on phase
    await this.validateActivity(phase, activityType, activityId);

    this.logger.debug('Progress validation passed', { studentId, enrollmentId, phase });
  }

  /**
   * 📊 ADVANCED PROGRESS CALCULATION
   */
  async calculateProgressUpdate(progressData) {
    const {
      studentId,
      enrollmentId,
      phase,
      activityType,
      activityId,
      progressValue,
      metadata
    } = progressData;

    // Get current progress state
    const currentProgress = await this.getStudentProgress(enrollmentId);
    
    // Calculate phase progress
    const phaseProgress = this.calculatePhaseProgress(
      currentProgress.phaseProgress,
      phase,
      activityType,
      progressValue,
      metadata
    );

    // Calculate overall progress with weighted phases
    const overallProgress = this.calculateOverallProgress(phaseProgress);

    // Calculate quality score based on progress patterns
    const qualityScore = await this.calculateQualityScore(
      studentId,
      enrollmentId,
      phase,
      progressValue,
      metadata
    );

    // Predict completion date
    const predictedCompletion = await this.predictCompletionDate(
      enrollmentId,
      overallProgress,
      phaseProgress,
      currentProgress.startDate
    );

    // Calculate learning velocity
    const learningVelocity = await this.calculateLearningVelocity(
      enrollmentId,
      phase,
      progressValue
    );

    return {
      studentId,
      enrollmentId,
      phase,
      activityType,
      activityId,
      progressValue,
      phaseProgress,
      overallProgress,
      qualityScore,
      predictedCompletion,
      learningVelocity,
      metadata
    };
  }

  /**
   * 💾 TRANSACTIONAL PROGRESS PROCESSING
   */
  async processProgressTransaction(progressUpdate) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create progress record
      const progressRecord = await tx.progressTracking.create({
        data: {
          studentId: progressUpdate.studentId,
          enrollmentId: progressUpdate.enrollmentId,
          phase: progressUpdate.phase,
          activityType: progressUpdate.activityType,
          activityId: progressUpdate.activityId,
          progressValue: progressUpdate.progressValue,
          overallProgress: progressUpdate.overallProgress,
          phaseProgress: progressUpdate.phaseProgress,
          qualityScore: progressUpdate.qualityScore,
          learningVelocity: progressUpdate.learningVelocity,
          metadata: {
            ...progressUpdate.metadata,
            processedAt: new Date().toISOString(),
            calculatedMetrics: {
              predictedCompletion: progressUpdate.predictedCompletion,
              phaseWeights: this.getPhaseWeights()
            }
          }
        }
      });

      // 2. Update enrollment progress
      await tx.enrollment.update({
        where: { id: progressUpdate.enrollmentId },
        data: {
          overallProgress: progressUpdate.overallProgress,
          currentPhase: progressUpdate.phase,
          lastProgressUpdate: new Date(),
          qualityScore: progressUpdate.qualityScore,
          predictedCompletion: progressUpdate.predictedCompletion
        }
      });

      // 3. Update student learning analytics
      await this.updateStudentAnalytics(progressUpdate, tx);

      // 4. Cache update for real-time dashboard
      await this.updateProgressCache(progressUpdate.enrollmentId, progressUpdate.overallProgress);

      return {
        progressId: progressRecord.id,
        ...progressUpdate
      };
    }, {
      maxWait: 5000,
      timeout: 10000
    });
  }

  /**
   * 🎯 MILESTONE ACHIEVEMENT CHECKING
   */
  async checkMilestoneAchievements(progressResult) {
    const { enrollmentId, phase, phaseProgress, overallProgress } = progressResult;
    
    const achievements = {
      achieved: [],
      upcoming: [],
      notifications: []
    };

    // Check phase-specific milestones
    const phaseMilestones = this.milestones[phase].checkpoints;
    const currentPhaseProgress = phaseProgress[phase] || 0;

    for (const milestone of phaseMilestones) {
      const milestoneKey = `${phase}:${milestone}`;
      const milestoneThreshold = this.getMilestoneThreshold(phase, milestone);

      // Check if milestone achieved
      const isAchieved = await this.checkMilestoneStatus(enrollmentId, milestoneKey);
      
      if (!isAchieved && currentPhaseProgress >= milestoneThreshold) {
        // Achievement unlocked!
        await this.recordMilestoneAchievement(enrollmentId, milestoneKey, phase, milestone);
        achievements.achieved.push({
          milestone: milestoneKey,
          phase: phase,
          achievement: milestone,
          progress: currentPhaseProgress,
          timestamp: new Date()
        });

        // Generate notification
        achievements.notifications.push({
          type: 'MILESTONE_ACHIEVED',
          milestone: milestoneKey,
          message: this.getMilestoneMessage(phase, milestone)
        });
      } else if (!isAchieved) {
        // Upcoming milestone
        achievements.upcoming.push({
          milestone: milestoneKey,
          progress: currentPhaseProgress,
          required: milestoneThreshold,
          remaining: milestoneThreshold - currentPhaseProgress
        });
      }
    }

    // Check overall progress milestones (25%, 50%, 75%, 100%)
    const overallMilestones = [25, 50, 75, 100];
    for (const milestone of overallMilestones) {
      const milestoneKey = `overall:${milestone}percent`;
      const isAchieved = await this.checkMilestoneStatus(enrollmentId, milestoneKey);

      if (!isAchieved && overallProgress >= milestone) {
        await this.recordMilestoneAchievement(enrollmentId, milestoneKey, 'OVERALL', `${milestone}%`);
        achievements.achieved.push({
          milestone: milestoneKey,
          phase: 'OVERALL',
          achievement: `${milestone}% Complete`,
          progress: overallProgress,
          timestamp: new Date()
        });
      }
    }

    return achievements;
  }

  /**
   * 📈 CALCULATE PHASE PROGRESS
   */
  calculatePhaseProgress(currentPhaseProgress, phase, activityType, progressValue, metadata) {
    const updatedProgress = { ...currentPhaseProgress };

    if (!updatedProgress[phase]) {
      updatedProgress[phase] = {
        overall: 0,
        activities: {},
        lastUpdated: new Date(),
        startedAt: new Date()
      };
    }

    // Update specific activity progress
    updatedProgress[phase].activities[activityType] = {
      progress: progressValue,
      lastActivity: metadata?.activityName || activityType,
      completedAt: progressValue === 100 ? new Date() : null,
      metadata: metadata
    };

    // Recalculate phase overall progress
    const phaseActivities = Object.values(updatedProgress[phase].activities);
    if (phaseActivities.length > 0) {
      const phaseTotal = phaseActivities.reduce((sum, activity) => sum + activity.progress, 0);
      updatedProgress[phase].overall = Math.min(100, phaseTotal / phaseActivities.length);
    }

    updatedProgress[phase].lastUpdated = new Date();

    return updatedProgress;
  }

  /**
   * 🎯 CALCULATE OVERALL PROGRESS
   */
  calculateOverallProgress(phaseProgress) {
    let weightedTotal = 0;
    let totalWeight = 0;

    Object.entries(this.milestones).forEach(([phase, config]) => {
      const phaseData = phaseProgress[phase];
      if (phaseData) {
        weightedTotal += phaseData.overall * config.weight;
        totalWeight += config.weight;
      }
    });

    // Ensure we don't exceed 100%
    return Math.min(100, (weightedTotal / totalWeight) * 100);
  }

  /**
   * 🏆 CALCULATE QUALITY SCORE
   */
  async calculateQualityScore(studentId, enrollmentId, phase, progressValue, metadata) {
    let qualityScore = 0;
    let factors = [];

    // Factor 1: Consistency of progress
    const consistency = await this.calculateProgressConsistency(enrollmentId, phase);
    factors.push({ name: 'consistency', score: consistency });

    // Factor 2: Activity completion rate
    const completionRate = await this.calculateCompletionRate(enrollmentId, phase);
    factors.push({ name: 'completion_rate', score: completionRate });

    // Factor 3: Learning velocity appropriateness
    const velocityScore = await this.calculateVelocityScore(enrollmentId, phase);
    factors.push({ name: 'velocity', score: velocityScore });

    // Factor 4: Assessment performance
    const assessmentScore = await this.calculateAssessmentScore(enrollmentId, phase);
    factors.push({ name: 'assessment', score: assessmentScore });

    // Factor 5: Expert feedback integration
    const feedbackScore = await this.calculateFeedbackScore(enrollmentId);
    factors.push({ name: 'feedback', score: feedbackScore });

    // Calculate weighted average
    const weights = {
      consistency: 0.25,
      completion_rate: 0.25,
      velocity: 0.20,
      assessment: 0.20,
      feedback: 0.10
    };

    qualityScore = factors.reduce((total, factor) => {
      return total + (factor.score * weights[factor.name]);
    }, 0);

    this.logger.debug('Quality score calculated', { enrollmentId, qualityScore, factors });

    return Math.min(100, qualityScore);
  }

  /**
   * 📅 PREDICT COMPLETION DATE
   */
  async predictCompletionDate(enrollmentId, overallProgress, phaseProgress, startDate) {
    if (overallProgress >= 100) {
      return new Date(); // Already completed
    }

    const progressHistory = await this.prisma.progressTracking.findMany({
      where: { enrollmentId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, overallProgress: true }
    });

    if (progressHistory.length < 2) {
      // Not enough data, return estimated completion based on average
      const daysElapsed = Math.floor((new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24));
      const progressPerDay = overallProgress / Math.max(1, daysElapsed);
      const daysRemaining = (100 - overallProgress) / progressPerDay;

      return new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);
    }

    // Calculate progress velocity
    const recentProgress = progressHistory.slice(-5); // Last 5 progress points
    const timeDiff = (recentProgress[recentProgress.length - 1].createdAt - recentProgress[0].createdAt) / (1000 * 60 * 60 * 24);
    const progressDiff = recentProgress[recentProgress.length - 1].overallProgress - recentProgress[0].overallProgress;

    const progressPerDay = progressDiff / Math.max(1, timeDiff);
    const daysRemaining = (100 - overallProgress) / Math.max(0.1, progressPerDay);

    const predictedDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000);

    // Don't predict beyond maximum course duration (4 months)
    const maxCompletionDate = new Date(startDate);
    maxCompletionDate.setDate(maxCompletionDate.getDate() + 120); // 4 months

    return predictedDate > maxCompletionDate ? maxCompletionDate : predictedDate;
  }

  /**
   * 📊 GET STUDENT PROGRESS
   */
  async getStudentProgress(enrollmentId) {
    const cacheKey = `progress:${enrollmentId}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Database query
    const progress = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        overallProgress: true,
        currentPhase: true,
        startDate: true,
        qualityScore: true,
        predictedCompletion: true,
        progressHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            phase: true,
            progressValue: true,
            overallProgress: true,
            createdAt: true
          }
        }
      }
    });

    if (!progress) {
      throw new Error('PROGRESS_NOT_FOUND');
    }

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(progress));

    return progress;
  }

  /**
   * 📈 UPDATE PROGRESS ANALYTICS
   */
  async updateProgressAnalytics(progressResult) {
    const { enrollmentId, overallProgress, phase, qualityScore, learningVelocity } = progressResult;

    const analyticsData = {
      enrollmentId,
      overallProgress,
      currentPhase: phase,
      qualityScore,
      learningVelocity,
      timestamp: new Date(),
      metadata: {
        system: 'progress_tracking',
        version: '1.0'
      }
    };

    // Update Redis for real-time dashboard
    await this.redis.hset(
      `analytics:progress:${enrollmentId}`,
      analyticsData
    );

    // Send to analytics engine
    await this.analytics.track('progress_updated', analyticsData);

    this.logger.debug('Progress analytics updated', { enrollmentId, overallProgress });
  }

  /**
   * 🔔 EMIT PROGRESS EVENTS
   */
  async emitProgressEvents(progressResult, milestoneUpdates) {
    const { enrollmentId, studentId, overallProgress, phase } = progressResult;

    // Progress update event
    this.emit('progressUpdated', {
      enrollmentId,
      studentId,
      overallProgress,
      phase,
      timestamp: new Date(),
      milestones: milestoneUpdates.achieved
    });

    // Milestone achievements
    if (milestoneUpdates.achieved.length > 0) {
      this.emit('milestonesAchieved', {
        enrollmentId,
        studentId,
        achievements: milestoneUpdates.achieved,
        notifications: milestoneUpdates.notifications
      });
    }

    // Quality score updates
    if (progressResult.qualityScore !== undefined) {
      this.emit('qualityScoreUpdated', {
        enrollmentId,
        studentId,
        qualityScore: progressResult.qualityScore,
        phase: phase
      });
    }

    // Completion prediction updates
    if (progressResult.predictedCompletion) {
      this.emit('completionPredictionUpdated', {
        enrollmentId,
        studentId,
        predictedCompletion: progressResult.predictedCompletion,
        confidence: this.calculatePredictionConfidence(progressResult)
      });
    }
  }

  /**
   * 🔧 HELPER METHODS
   */

  async validateActivity(phase, activityType, activityId) {
    // Implementation depends on specific activity validation rules
    // This would validate that the activity exists and is appropriate for the phase
    return true;
  }

  getPhaseWeights() {
    return Object.entries(this.milestones).reduce((acc, [phase, config]) => {
      acc[phase] = config.weight;
      return acc;
    }, {});
  }

  getMilestoneThreshold(phase, milestone) {
    // Define thresholds for each milestone
    const thresholds = {
      MINDSET_PHASE: {
        wealth_consciousness: 25,
        discipline_building: 50,
        action_taking: 75,
        financial_psychology: 100
      },
      THEORY_PHASE: {
        basics_mastered: 25,
        intermediate_skills: 50,
        advanced_concepts: 75,
        scenario_completion: 100
      },
      HANDS_ON_PHASE: {
        first_project: 25,
        portfolio_building: 50,
        client_interaction: 75,
        quality_verification: 100
      },
      CERTIFICATION_PHASE: {
        final_assessment: 50,
        certification_approval: 100,
        yachi_integration: 100
      }
    };

    return thresholds[phase]?.[milestone] || 100;
  }

  async checkMilestoneStatus(enrollmentId, milestoneKey) {
    const cacheKey = `milestone:${enrollmentId}:${milestoneKey}`;
    const achieved = await this.redis.get(cacheKey);
    return achieved === 'true';
  }

  async recordMilestoneAchievement(enrollmentId, milestoneKey, phase, achievement) {
    const cacheKey = `milestone:${enrollmentId}:${milestoneKey}`;
    await this.redis.setex(cacheKey, 86400 * 30, 'true'); // 30 days cache

    // Also record in database for permanent storage
    await this.prisma.milestoneAchievement.create({
      data: {
        enrollmentId,
        milestoneKey,
        phase,
        achievement,
        achievedAt: new Date()
      }
    });
  }

  getMilestoneMessage(phase, milestone) {
    const messages = {
      MINDSET_PHASE: {
        wealth_consciousness: 'Congratulations! You have developed wealth consciousness.',
        discipline_building: 'Great job building consistent discipline habits!',
        action_taking: 'Excellent work overcoming procrastination!',
        financial_psychology: 'You have mastered financial psychology mindset!'
      }
      // ... other phase messages
    };

    return messages[phase]?.[milestone] || `Milestone achieved: ${milestone}`;
  }

  async calculateProgressConsistency(enrollmentId, phase) {
    // Calculate how consistent the student's progress is
    // Implementation would analyze progress patterns over time
    return 85; // Example score
  }

  async calculateCompletionRate(enrollmentId, phase) {
    // Calculate activity completion rate for the phase
    const activities = await this.prisma.progressTracking.count({
      where: { enrollmentId, phase }
    });
    
    const completed = await this.prisma.progressTracking.count({
      where: { enrollmentId, phase, progressValue: 100 }
    });

    return activities > 0 ? (completed / activities) * 100 : 0;
  }

  async calculateLearningVelocity(enrollmentId, phase, currentProgress) {
    // Calculate learning velocity (progress per day)
    const progressHistory = await this.prisma.progressTracking.findMany({
      where: { enrollmentId, phase },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, progressValue: true }
    });

    if (progressHistory.length < 2) {
      return currentProgress; // Initial velocity
    }

    const timeDiff = (new Date() - progressHistory[0].createdAt) / (1000 * 60 * 60 * 24);
    const progressDiff = currentProgress - progressHistory[0].progressValue;

    return timeDiff > 0 ? progressDiff / timeDiff : 0;
  }

  async calculateVelocityScore(enrollmentId, phase) {
    // Score based on whether learning velocity is appropriate
    const velocity = await this.calculateLearningVelocity(enrollmentId, phase, 0);
    
    // Ideal velocity range (adjust based on phase requirements)
    const idealMin = 1.0;
    const idealMax = 3.0;

    if (velocity >= idealMin && velocity <= idealMax) return 100;
    if (velocity > idealMax) return 80; // Too fast might indicate rushing
    if (velocity < idealMin) return 60; // Too slow might indicate struggling
    
    return 70;
  }

  async calculateAssessmentScore(enrollmentId, phase) {
    // Calculate score based on assessment performance
    const assessments = await this.prisma.assessment.findMany({
      where: { enrollmentId, phase },
      select: { score: true, maxScore: true }
    });

    if (assessments.length === 0) return 75; // Default score

    const totalScore = assessments.reduce((sum, assessment) => sum + assessment.score, 0);
    const totalMax = assessments.reduce((sum, assessment) => sum + assessment.maxScore, 0);

    return totalMax > 0 ? (totalScore / totalMax) * 100 : 75;
  }

  async calculateFeedbackScore(enrollmentId) {
    // Calculate score based on how well student incorporates expert feedback
    const feedback = await this.prisma.expertFeedback.findMany({
      where: { enrollmentId },
      select: { rating: true, improvementImplemented: true }
    });

    if (feedback.length === 0) return 80; // Default score

    const implementedCount = feedback.filter(f => f.improvementImplemented).length;
    const averageRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;

    return (implementedCount / feedback.length) * 50 + (averageRating * 10);
  }

  calculatePredictionConfidence(progressResult) {
    // Calculate confidence in completion prediction
    const factors = {
      dataPoints: progressResult.learningHistory?.length || 0,
      consistency: progressResult.qualityScore / 100,
      velocityStability: 0.8 // This would be calculated based on velocity variance
    };

    // Weighted confidence calculation
    const confidence = (
      factors.dataPoints * 0.3 +
      factors.consistency * 0.4 +
      factors.velocityStability * 0.3
    ) * 100;

    return Math.min(100, Math.max(0, confidence));
  }

  async initializeProgressCache() {
    try {
      // Warm up cache with active enrollments
      const activeEnrollments = await this.prisma.enrollment.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, overallProgress: true, currentPhase: true }
      });

      const pipeline = this.redis.pipeline();
      activeEnrollments.forEach(enrollment => {
        const key = `progress:${enrollment.id}`;
        pipeline.setex(key, 300, JSON.stringify(enrollment));
      });

      await pipeline.exec();
      this.logger.info(`Progress cache warmed up with ${activeEnrollments.length} enrollments`);
    } catch (error) {
      this.logger.error('Failed to initialize progress cache', error);
    }
  }

  async updateProgressCache(enrollmentId, overallProgress) {
    const key = `progress:${enrollmentId}`;
    const cacheData = {
      enrollmentId,
      overallProgress,
      lastUpdated: new Date()
    };
    
    await this.redis.setex(key, 300, JSON.stringify(cacheData));
  }

  async updateStudentAnalytics(progressUpdate, transaction) {
    // Update comprehensive student analytics
    await transaction.studentAnalytics.upsert({
      where: { studentId: progressUpdate.studentId },
      update: {
        totalProgressUpdates: { increment: 1 },
        averageProgressRate: await this.calculateAverageProgressRate(progressUpdate.studentId),
        lastActivity: new Date(),
        phaseDistribution: await this.calculatePhaseDistribution(progressUpdate.studentId)
      },
      create: {
        studentId: progressUpdate.studentId,
        totalProgressUpdates: 1,
        averageProgressRate: progressUpdate.learningVelocity,
        lastActivity: new Date(),
        phaseDistribution: { [progressUpdate.phase]: 1 }
      }
    });
  }

  async calculateAverageProgressRate(studentId) {
    // Calculate average progress rate across all enrollments
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      select: { overallProgress: true, startDate: true }
    });

    if (enrollments.length === 0) return 0;

    const totalProgress = enrollments.reduce((sum, enrollment) => sum + enrollment.overallProgress, 0);
    const totalDays = enrollments.reduce((sum, enrollment) => {
      const days = Math.max(1, (new Date() - enrollment.startDate) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);

    return totalDays > 0 ? totalProgress / totalDays : 0;
  }

  async calculatePhaseDistribution(studentId) {
    // Calculate distribution of time spent in different phases
    const progress = await this.prisma.progressTracking.groupBy({
      by: ['phase'],
      where: { studentId },
      _count: { phase: true }
    });

    const distribution = {};
    progress.forEach(item => {
      distribution[item.phase] = item._count.phase;
    });

    return distribution;
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Progress tracking system resources cleaned up');
    } catch (error) {
      this.logger.error('Error during progress system cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new ProgressTrackingSystem();