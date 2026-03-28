// utils/progress-calculator.js

/**
 * 🎯 ENTERPRISE PROGRESS CALCULATOR
 * Production-ready progress tracking system for Mosa Forge
 * Features: Multi-dimensional progress, real-time updates, quality integration
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('./logger');
const { QualityCalculator } = require('./quality-calculations');

class ProgressCalculator extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('ProgressCalculator');
    this.qualityCalculator = new QualityCalculator();

    // Progress weight configurations
    this.progressWeights = {
      MINDSET_PHASE: {
        wealthConsciousness: 0.25,
        disciplineBuilding: 0.25,
        actionTaking: 0.25,
        financialPsychology: 0.25
      },
      THEORY_PHASE: {
        exerciseCompletion: 0.40,
        masteryScore: 0.35,
        timeConsistency: 0.15,
        engagementLevel: 0.10
      },
      HANDS_ON_PHASE: {
        sessionAttendance: 0.30,
        projectCompletion: 0.35,
        skillApplication: 0.25,
        expertFeedback: 0.10
      },
      CERTIFICATION_PHASE: {
        finalAssessment: 0.60,
        portfolioQuality: 0.30,
        yachiReadiness: 0.10
      }
    };

    this.progressThresholds = {
      MINDSET_COMPLETION: 80,
      THEORY_COMPLETION: 85,
      HANDS_ON_COMPLETION: 90,
      CERTIFICATION_READY: 75
    };

    this.initialize();
  }

  /**
   * Initialize progress calculator
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.loadConfiguration();
      this.logger.info('Progress calculator initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize progress calculator', error);
      throw error;
    }
  }

  /**
   * 🎯 CALCULATE COMPREHENSIVE PROGRESS
   */
  async calculateStudentProgress(studentId, enrollmentId, phase = 'CURRENT') {
    const cacheKey = `progress:student:${studentId}:enrollment:${enrollmentId}`;
    
    try {
      // Try cache first for performance
      const cachedProgress = await this.redis.get(cacheKey);
      if (cachedProgress) {
        return JSON.parse(cachedProgress);
      }

      // Calculate fresh progress
      const progress = await this.calculateFreshProgress(studentId, enrollmentId, phase);

      // Cache for 5 minutes
      await this.redis.setex(cacheKey, 300, JSON.stringify(progress));

      // Emit progress update event
      this.emit('progressUpdated', {
        studentId,
        enrollmentId,
        progress: progress.overallPercentage,
        phase: progress.currentPhase
      });

      return progress;

    } catch (error) {
      this.logger.error('Progress calculation failed', error, { studentId, enrollmentId });
      throw error;
    }
  }

  /**
   * 📊 CALCULATE FRESH PROGRESS DATA
   */
  async calculateFreshProgress(studentId, enrollmentId, phase) {
    const [
      enrollment,
      mindsetProgress,
      theoryProgress,
      handsOnProgress,
      certificationProgress,
      multiCourseProgress
    ] = await Promise.all([
      this.getEnrollmentDetails(enrollmentId),
      this.calculateMindsetProgress(studentId, enrollmentId),
      this.calculateTheoryProgress(studentId, enrollmentId),
      this.calculateHandsOnProgress(studentId, enrollmentId),
      this.calculateCertificationProgress(studentId, enrollmentId),
      this.getMultiCourseProgress(studentId)
    ]);

    const phaseProgress = {
      MINDSET: mindsetProgress,
      THEORY: theoryProgress,
      HANDS_ON: handsOnProgress,
      CERTIFICATION: certificationProgress
    };

    const overallProgress = this.calculateOverallProgress(phaseProgress, enrollment.currentPhase);
    const weeklyProgress = await this.calculateWeeklyProgress(studentId, enrollmentId);
    const predictedCompletion = this.predictCompletionDate(overallProgress, weeklyProgress, enrollment.startDate);

    const progressReport = {
      studentId,
      enrollmentId,
      currentPhase: enrollment.currentPhase,
      overallPercentage: overallProgress,
      phaseProgress,
      weeklyProgress,
      predictedCompletion,
      multiCourseProgress,
      streak: await this.calculateLearningStreak(studentId),
      lastActive: await this.getLastActiveTime(studentId),
      qualityMetrics: await this.calculateQualityMetrics(studentId, enrollmentId),
      milestones: await this.getAchievedMilestones(studentId, enrollmentId),
      recommendations: await this.generateProgressRecommendations(phaseProgress, overallProgress)
    };

    // Update database with latest progress
    await this.updateProgressDatabase(studentId, enrollmentId, progressReport);

    return progressReport;
  }

  /**
   * 🧠 MINDSET PHASE PROGRESS CALCULATION
   */
  async calculateMindsetProgress(studentId, enrollmentId) {
    try {
      const [
        assessments,
        activities,
        completionData
      ] = await Promise.all([
        this.prisma.mindsetAssessment.findMany({
          where: { studentId, enrollmentId },
          orderBy: { completedAt: 'desc' },
          take: 10
        }),
        this.prisma.mindsetActivity.findMany({
          where: { studentId, enrollmentId },
          select: { activityType: true, completed: true, score: true }
        }),
        this.prisma.phaseCompletion.findFirst({
          where: { 
            studentId, 
            enrollmentId, 
            phase: 'MINDSET' 
          }
        })
      ]);

      if (completionData?.completed) {
        return {
          percentage: 100,
          completed: true,
          completionDate: completionData.completedAt,
          components: {
            wealthConsciousness: 100,
            disciplineBuilding: 100,
            actionTaking: 100,
            financialPsychology: 100
          }
        };
      }

      // Calculate component progress
      const components = {
        wealthConsciousness: this.calculateComponentProgress(activities, 'WEALTH_CONSCIOUSNESS'),
        disciplineBuilding: this.calculateComponentProgress(activities, 'DISCIPLINE_BUILDING'),
        actionTaking: this.calculateComponentProgress(activities, 'ACTION_TAKING'),
        financialPsychology: this.calculateComponentProgress(activities, 'FINANCIAL_PSYCHOLOGY')
      };

      const weightedProgress = this.calculateWeightedProgress(components, this.progressWeights.MINDSET_PHASE);
      const assessmentBonus = this.calculateAssessmentBonus(assessments);

      return {
        percentage: Math.min(weightedProgress + assessmentBonus, 100),
        completed: weightedProgress >= this.progressThresholds.MINDSET_COMPLETION,
        components,
        lastAssessment: assessments[0]?.completedAt,
        activitiesCompleted: activities.filter(a => a.completed).length,
        totalActivities: activities.length
      };

    } catch (error) {
      this.logger.error('Mindset progress calculation failed', error, { studentId, enrollmentId });
      return { percentage: 0, completed: false, components: {} };
    }
  }

  /**
   * 📚 THEORY PHASE PROGRESS CALCULATION
   */
  async calculateTheoryProgress(studentId, enrollmentId) {
    try {
      const [
        exercises,
        masteryScores,
        engagement,
        completionData
      ] = await Promise.all([
        this.prisma.learningExercise.findMany({
          where: { studentId, enrollmentId },
          select: { 
            exerciseId: true, 
            completed: true, 
            score: true,
            timeSpent: true,
            completedAt: true 
          }
        }),
        this.prisma.masteryScore.findMany({
          where: { studentId, enrollmentId },
          select: { skillId: true, score: true, updatedAt: true }
        }),
        this.prisma.engagementMetric.findMany({
          where: { studentId, enrollmentId },
          orderBy: { date: 'desc' },
          take: 30
        }),
        this.prisma.phaseCompletion.findFirst({
          where: { 
            studentId, 
            enrollmentId, 
            phase: 'THEORY' 
          }
        })
      ]);

      if (completionData?.completed) {
        return {
          percentage: 100,
          completed: true,
          completionDate: completionData.completedAt,
          masteryLevel: 'EXPERT'
        };
      }

      const completedExercises = exercises.filter(e => e.completed);
      const exerciseProgress = (completedExercises.length / Math.max(exercises.length, 1)) * 100;

      const averageMastery = masteryScores.length > 0 
        ? masteryScores.reduce((sum, score) => sum + score.score, 0) / masteryScores.length
        : 0;

      const consistencyScore = this.calculateConsistencyScore(engagement);
      const engagementScore = this.calculateEngagementScore(engagement);

      const components = {
        exerciseCompletion: Math.min(exerciseProgress, 100),
        masteryScore: averageMastery,
        timeConsistency: consistencyScore,
        engagementLevel: engagementScore
      };

      const weightedProgress = this.calculateWeightedProgress(components, this.progressWeights.THEORY_PHASE);

      return {
        percentage: Math.min(weightedProgress, 100),
        completed: weightedProgress >= this.progressThresholds.THEORY_COMPLETION,
        components,
        exercisesCompleted: completedExercises.length,
        totalExercises: exercises.length,
        averageMastery,
        currentStreak: this.calculateCurrentStreak(engagement),
        timeSpent: completedExercises.reduce((sum, ex) => sum + (ex.timeSpent || 0), 0)
      };

    } catch (error) {
      this.logger.error('Theory progress calculation failed', error, { studentId, enrollmentId });
      return { percentage: 0, completed: false, components: {} };
    }
  }

  /**
   * 🛠️ HANDS-ON PHASE PROGRESS CALCULATION
   */
  async calculateHandsOnProgress(studentId, enrollmentId) {
    try {
      const [
        sessions,
        projects,
        expertFeedbacks,
        completionData
      ] = await Promise.all([
        this.prisma.trainingSession.findMany({
          where: { enrollmentId },
          include: { attendance: true }
        }),
        this.prisma.projectSubmission.findMany({
          where: { studentId, enrollmentId },
          select: { 
            projectId: true, 
            status: true, 
            score: true,
            submittedAt: true,
            expertFeedback: true
          }
        }),
        this.prisma.expertFeedback.findMany({
          where: { studentId, enrollmentId },
          orderBy: { createdAt: 'desc' },
          take: 20
        }),
        this.prisma.phaseCompletion.findFirst({
          where: { 
            studentId, 
            enrollmentId, 
            phase: 'HANDS_ON' 
          }
        })
      ]);

      if (completionData?.completed) {
        return {
          percentage: 100,
          completed: true,
          completionDate: completionData.completedAt,
          projectsCompleted: projects.filter(p => p.status === 'APPROVED').length
        };
      }

      const attendanceRate = this.calculateAttendanceRate(sessions, studentId);
      const projectCompletion = this.calculateProjectCompletion(projects);
      const skillApplication = this.calculateSkillApplicationScore(expertFeedbacks);
      const expertFeedbackScore = this.calculateExpertFeedbackScore(expertFeedbacks);

      const components = {
        sessionAttendance: attendanceRate,
        projectCompletion: projectCompletion.percentage,
        skillApplication,
        expertFeedback: expertFeedbackScore
      };

      const weightedProgress = this.calculateWeightedProgress(components, this.progressWeights.HANDS_ON_PHASE);

      return {
        percentage: Math.min(weightedProgress, 100),
        completed: weightedProgress >= this.progressThresholds.HANDS_ON_COMPLETION,
        components,
        sessionsAttended: sessions.filter(s => 
          s.attendance.some(a => a.studentId === studentId && a.attended)
        ).length,
        totalSessions: sessions.length,
        projectsCompleted: projectCompletion.completed,
        totalProjects: projectCompletion.total,
        averageFeedbackScore: expertFeedbackScore
      };

    } catch (error) {
      this.logger.error('Hands-on progress calculation failed', error, { studentId, enrollmentId });
      return { percentage: 0, completed: false, components: {} };
    }
  }

  /**
   * 🏆 CERTIFICATION PHASE PROGRESS CALCULATION
   */
  async calculateCertificationProgress(studentId, enrollmentId) {
    try {
      const [
        finalAssessment,
        portfolioItems,
        yachiReadiness,
        completionData
      ] = await Promise.all([
        this.prisma.finalAssessment.findFirst({
          where: { studentId, enrollmentId }
        }),
        this.prisma.portfolioItem.findMany({
          where: { studentId, enrollmentId },
          select: { qualityScore: true, approved: true }
        }),
        this.prisma.yachiReadiness.findFirst({
          where: { studentId, enrollmentId }
        }),
        this.prisma.phaseCompletion.findFirst({
          where: { 
            studentId, 
            enrollmentId, 
            phase: 'CERTIFICATION' 
          }
        })
      ]);

      if (completionData?.completed) {
        return {
          percentage: 100,
          completed: true,
          completionDate: completionData.completedAt,
          certified: true,
          yachiVerified: true
        };
      }

      const assessmentScore = finalAssessment?.score || 0;
      const portfolioQuality = portfolioItems.length > 0
        ? portfolioItems.reduce((sum, item) => sum + (item.qualityScore || 0), 0) / portfolioItems.length
        : 0;
      
      const portfolioCompletion = (portfolioItems.filter(p => p.approved).length / Math.max(portfolioItems.length, 1)) * 100;
      const yachiScore = yachiReadiness?.readinessScore || 0;

      const components = {
        finalAssessment: assessmentScore,
        portfolioQuality: Math.min(portfolioQuality * 100, 100),
        portfolioCompletion,
        yachiReadiness: yachiScore
      };

      const weightedProgress = this.calculateWeightedProgress(components, this.progressWeights.CERTIFICATION_PHASE);

      return {
        percentage: Math.min(weightedProgress, 100),
        completed: weightedProgress >= this.progressThresholds.CERTIFICATION_READY,
        components,
        finalAssessmentScore: assessmentScore,
        portfolioItems: portfolioItems.length,
        approvedPortfolioItems: portfolioItems.filter(p => p.approved).length,
        yachiReady: yachiScore >= 80,
        readyForCertification: weightedProgress >= 75
      };

    } catch (error) {
      this.logger.error('Certification progress calculation failed', error, { studentId, enrollmentId });
      return { percentage: 0, completed: false, components: {} };
    }
  }

  /**
   * 📈 CALCULATE OVERALL PROGRESS
   */
  calculateOverallProgress(phaseProgress, currentPhase) {
    const phaseWeights = {
      MINDSET: 0.10,
      THEORY: 0.35,
      HANDS_ON: 0.40,
      CERTIFICATION: 0.15
    };

    let totalProgress = 0;
    let accumulatedWeight = 0;

    const phaseOrder = ['MINDSET', 'THEORY', 'HANDS_ON', 'CERTIFICATION'];
    const currentPhaseIndex = phaseOrder.indexOf(currentPhase);

    for (let i = 0; i <= currentPhaseIndex; i++) {
      const phase = phaseOrder[i];
      const weight = phaseWeights[phase];
      
      if (i < currentPhaseIndex) {
        // Previous phases are 100% complete
        totalProgress += weight * 100;
      } else {
        // Current phase uses actual progress
        totalProgress += weight * (phaseProgress[phase]?.percentage || 0);
      }
      
      accumulatedWeight += weight;
    }

    // Normalize by actual accumulated weight
    return Math.round((totalProgress / accumulatedWeight) * 100) / 100;
  }

  /**
   * 📅 CALCULATE WEEKLY PROGRESS TREND
   */
  async calculateWeeklyProgress(studentId, enrollmentId) {
    try {
      const weeklyData = await this.prisma.progressSnapshot.findMany({
        where: { 
          studentId, 
          enrollmentId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        orderBy: { createdAt: 'asc' },
        select: { overallProgress: true, createdAt: true }
      });

      if (weeklyData.length < 2) {
        return { trend: 'stable', weeklyChange: 0, velocity: 0 };
      }

      const recentProgress = weeklyData.slice(-1)[0].overallProgress;
      const previousProgress = weeklyData.slice(-2)[0].overallProgress;
      const weeklyChange = recentProgress - previousProgress;

      // Calculate velocity (average weekly change)
      const changes = [];
      for (let i = 1; i < weeklyData.length; i++) {
        changes.push(weeklyData[i].overallProgress - weeklyData[i-1].overallProgress);
      }
      const velocity = changes.reduce((sum, change) => sum + change, 0) / changes.length;

      let trend = 'stable';
      if (weeklyChange > 5) trend = 'accelerating';
      else if (weeklyChange > 2) trend = 'improving';
      else if (weeklyChange < -2) trend = 'declining';
      else if (weeklyChange < -5) trend = 'stalling';

      return {
        trend,
        weeklyChange: Math.round(weeklyChange * 100) / 100,
        velocity: Math.round(velocity * 100) / 100,
        dataPoints: weeklyData.length
      };

    } catch (error) {
      this.logger.error('Weekly progress calculation failed', error);
      return { trend: 'unknown', weeklyChange: 0, velocity: 0 };
    }
  }

  /**
   * 🔮 PREDICT COMPLETION DATE
   */
  predictCompletionDate(currentProgress, weeklyProgress, startDate) {
    const progressRemaining = 100 - currentProgress;
    
    if (weeklyProgress.velocity <= 0) {
      return null; // Cannot predict if not making progress
    }

    const weeksRemaining = progressRemaining / Math.max(weeklyProgress.velocity, 0.1);
    const predictedDate = new Date(startDate);
    predictedDate.setDate(predictedDate.getDate() + (weeksRemaining * 7));

    return {
      date: predictedDate,
      confidence: this.calculatePredictionConfidence(weeklyProgress),
      weeksRemaining: Math.ceil(weeksRemaining),
      onTrack: weeksRemaining <= 16 // 4 months total
    };
  }

  /**
   * 🎯 CALCULATE PREDICTION CONFIDENCE
   */
  calculatePredictionConfidence(weeklyProgress) {
    let confidence = 0.5; // Base confidence

    // More data points = higher confidence
    if (weeklyProgress.dataPoints >= 20) confidence += 0.3;
    else if (weeklyProgress.dataPoints >= 10) confidence += 0.2;
    else if (weeklyProgress.dataPoints >= 5) confidence += 0.1;

    // Consistent velocity = higher confidence
    if (weeklyProgress.trend === 'stable' || weeklyProgress.trend === 'improving') {
      confidence += 0.2;
    }

    return Math.min(confidence, 0.95);
  }

  /**
   * ⚡ CALCULATE LEARNING STREAK
   */
  async calculateLearningStreak(studentId) {
    try {
      const activities = await this.prisma.learningActivity.findMany({
        where: { 
          studentId,
          createdAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
          }
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      });

      if (activities.length === 0) return 0;

      let streak = 1;
      let currentDate = new Date().toDateString();

      for (let i = 0; i < activities.length; i++) {
        const activityDate = new Date(activities[i].createdAt).toDateString();
        
        if (activityDate === currentDate) {
          continue; // Same day, continue counting
        }

        const dateDiff = (new Date(currentDate) - new Date(activityDate)) / (1000 * 60 * 60 * 24);
        
        if (dateDiff === 1) {
          streak++;
          currentDate = activityDate;
        } else {
          break; // Streak broken
        }
      }

      return streak;

    } catch (error) {
      this.logger.error('Streak calculation failed', error);
      return 0;
    }
  }

  /**
   * 📊 CALCULATE QUALITY METRICS
   */
  async calculateQualityMetrics(studentId, enrollmentId) {
    try {
      const [
        exerciseScores,
        projectScores,
        assessmentScores,
        feedback
      ] = await Promise.all([
        this.prisma.learningExercise.findMany({
          where: { studentId, enrollmentId, completed: true },
          select: { score: true }
        }),
        this.prisma.projectSubmission.findMany({
          where: { studentId, enrollmentId },
          select: { score: true }
        }),
        this.prisma.mindsetAssessment.findMany({
          where: { studentId, enrollmentId },
          select: { score: true }
        }),
        this.prisma.expertFeedback.findMany({
          where: { studentId, enrollmentId },
          select: { rating: true, comments: true }
        })
      ]);

      const metrics = {
        exerciseQuality: exerciseScores.length > 0 
          ? exerciseScores.reduce((sum, ex) => sum + ex.score, 0) / exerciseScores.length 
          : 0,
        projectQuality: projectScores.length > 0
          ? projectScores.reduce((sum, proj) => sum + proj.score, 0) / projectScores.length
          : 0,
        assessmentPerformance: assessmentScores.length > 0
          ? assessmentScores.reduce((sum, ass) => sum + ass.score, 0) / assessmentScores.length
          : 0,
        feedbackScore: feedback.length > 0
          ? feedback.reduce((sum, fb) => sum + fb.rating, 0) / feedback.length
          : 0
      };

      // Overall quality score (weighted average)
      const overallQuality = (
        metrics.exerciseQuality * 0.3 +
        metrics.projectQuality * 0.4 +
        metrics.assessmentPerformance * 0.2 +
        metrics.feedbackScore * 0.1
      );

      return {
        ...metrics,
        overallQuality: Math.round(overallQuality * 100) / 100,
        qualityTier: this.getQualityTier(overallQuality)
      };

    } catch (error) {
      this.logger.error('Quality metrics calculation failed', error);
      return { overallQuality: 0, qualityTier: 'BEGINNER' };
    }
  }

  /**
   * 🎯 GET QUALITY TIER
   */
  getQualityTier(qualityScore) {
    if (qualityScore >= 90) return 'EXPERT';
    if (qualityScore >= 80) return 'ADVANCED';
    if (qualityScore >= 70) return 'INTERMEDIATE';
    if (qualityScore >= 60) return 'DEVELOPING';
    return 'BEGINNER';
  }

  /**
   * 🔧 UTILITY METHODS
   */
  calculateComponentProgress(activities, componentType) {
    const componentActivities = activities.filter(a => a.activityType === componentType);
    if (componentActivities.length === 0) return 0;
    
    const completed = componentActivities.filter(a => a.completed).length;
    return (completed / componentActivities.length) * 100;
  }

  calculateWeightedProgress(components, weights) {
    return Object.keys(weights).reduce((total, key) => {
      return total + (components[key] || 0) * weights[key];
    }, 0);
  }

  calculateAssessmentBonus(assessments) {
    if (assessments.length === 0) return 0;
    const latestScore = assessments[0].score;
    return latestScore >= 80 ? 5 : 0; // Bonus for high assessment scores
  }

  calculateConsistencyScore(engagement) {
    if (engagement.length < 7) return 50; // Default if not enough data
    
    const activeDays = engagement.filter(e => e.minutesActive > 30).length;
    return (activeDays / 7) * 100;
  }

  calculateEngagementScore(engagement) {
    if (engagement.length === 0) return 0;
    
    const totalEngagement = engagement.reduce((sum, e) => sum + e.engagementScore, 0);
    return totalEngagement / engagement.length;
  }

  calculateCurrentStreak(engagement) {
    // Implementation for current consecutive days with activity
    let streak = 0;
    const today = new Date().toDateString();
    
    for (let i = 0; i < engagement.length; i++) {
      const engagementDate = new Date(engagement[i].date).toDateString();
      if (engagementDate === today || streak > 0) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  calculateAttendanceRate(sessions, studentId) {
    if (sessions.length === 0) return 0;
    
    const attended = sessions.filter(session => 
      session.attendance.some(att => att.studentId === studentId && att.attended)
    ).length;
    
    return (attended / sessions.length) * 100;
  }

  calculateProjectCompletion(projects) {
    const completed = projects.filter(p => p.status === 'APPROVED').length;
    return {
      completed,
      total: projects.length,
      percentage: (completed / Math.max(projects.length, 1)) * 100
    };
  }

  calculateSkillApplicationScore(feedbacks) {
    if (feedbacks.length === 0) return 0;
    
    const skillScores = feedbacks.map(fb => 
      fb.categories?.skillApplication || fb.rating || 0
    );
    
    return skillScores.reduce((sum, score) => sum + score, 0) / skillScores.length;
  }

  calculateExpertFeedbackScore(feedbacks) {
    if (feedbacks.length === 0) return 0;
    return feedbacks.reduce((sum, fb) => sum + (fb.rating || 0), 0) / feedbacks.length;
  }

  /**
   * 📝 DATABASE METHODS
   */
  async getEnrollmentDetails(enrollmentId) {
    return await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { currentPhase: true, startDate: true, status: true }
    });
  }

  async getMultiCourseProgress(studentId) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      select: { id: true, skillId: true, currentPhase: true, overallProgress: true }
    });

    return enrollments.map(enrollment => ({
      enrollmentId: enrollment.id,
      skillId: enrollment.skillId,
      currentPhase: enrollment.currentPhase,
      progress: enrollment.overallProgress || 0
    }));
  }

  async getLastActiveTime(studentId) {
    const lastActivity = await this.prisma.learningActivity.findFirst({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });

    return lastActivity?.createdAt || null;
  }

  async getAchievedMilestones(studentId, enrollmentId) {
    const milestones = await this.prisma.milestoneAchievement.findMany({
      where: { studentId, enrollmentId },
      orderBy: { achievedAt: 'desc' },
      take: 10
    });

    return milestones.map(milestone => ({
      milestoneId: milestone.milestoneId,
      name: milestone.name,
      achievedAt: milestone.achievedAt,
      type: milestone.type
    }));
  }

  async generateProgressRecommendations(phaseProgress, overallProgress) {
    const recommendations = [];

    if (overallProgress < 25) {
      recommendations.push({
        type: 'MOTIVATION',
        message: 'Focus on building consistent learning habits',
        priority: 'HIGH',
        action: 'Set daily learning goals'
      });
    }

    // Phase-specific recommendations
    if (phaseProgress.THEORY?.percentage < 70) {
      recommendations.push({
        type: 'THEORY',
        message: 'Spend more time on interactive exercises',
        priority: 'MEDIUM',
        action: 'Complete 3 exercises daily'
      });
    }

    if (phaseProgress.HANDS_ON?.percentage < 60) {
      recommendations.push({
        type: 'PRACTICAL',
        message: 'Increase hands-on session attendance',
        priority: 'HIGH',
        action: 'Schedule regular training sessions'
      });
    }

    return recommendations.slice(0, 3); // Return top 3 recommendations
  }

  async updateProgressDatabase(studentId, enrollmentId, progressReport) {
    try {
      await this.prisma.progressSnapshot.create({
        data: {
          studentId,
          enrollmentId,
          overallProgress: progressReport.overallPercentage,
          phaseProgress: progressReport.phaseProgress,
          weeklyProgress: progressReport.weeklyProgress,
          qualityMetrics: progressReport.qualityMetrics,
          metadata: {
            calculatedAt: new Date().toISOString(),
            version: '2.0'
          }
        }
      });

      // Update enrollment progress
      await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { 
          overallProgress: progressReport.overallPercentage,
          lastProgressUpdate: new Date()
        }
      });

    } catch (error) {
      this.logger.error('Failed to update progress database', error);
    }
  }

  async loadConfiguration() {
    // Load configuration from database or environment
    // This allows dynamic updates to progress calculation rules
    const config = await this.prisma.configuration.findFirst({
      where: { key: 'progress_calculation' }
    });

    if (config) {
      this.progressWeights = { ...this.progressWeights, ...config.value.weights };
      this.progressThresholds = { ...this.progressThresholds, ...config.value.thresholds };
    }
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Progress calculator resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new ProgressCalculator();