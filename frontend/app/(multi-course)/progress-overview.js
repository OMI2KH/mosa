// multi-course/progress-overview.js

/**
 * 🎯 ENTERPRISE CROSS-COURSE PROGRESS OVERVIEW
 * Production-ready progress tracking across multiple skills
 * Features: Real-time progress aggregation, skill switching, completion forecasting
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../../utils/logger');
const { ProgressCalculator } = require('../../utils/progress-calculator');
const { RateLimiterRedis } = require('rate-limiter-flexible');

class CrossCourseProgress extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('CrossCourseProgress');
    this.progressCalculator = new ProgressCalculator();
    
    // Rate limiting for progress queries
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (req) => `progress_query:${req.studentId}`,
      points: 60, // 60 requests
      duration: 60, // per minute
    });

    this.initialize();
  }

  /**
   * Initialize progress tracking system
   */
  async initialize() {
    try {
      await this.redis.ping();
      this.logger.info('Cross-course progress system initialized');
      
      // Warm up cache with active student progress
      await this.warmUpProgressCache();
      
    } catch (error) {
      this.logger.error('Failed to initialize progress system', error);
      throw error;
    }
  }

  /**
   * 🎯 GET COMPREHENSIVE PROGRESS OVERVIEW
   */
  async getProgressOverview(studentId, options = {}) {
    const startTime = performance.now();
    
    try {
      // 🛡️ VALIDATION
      await this.validateStudentAccess(studentId);

      // 📊 PROGRESS AGGREGATION
      const progressData = await this.aggregateCrossCourseProgress(studentId, options);

      // 🎯 SKILL SWITCHING RECOMMENDATIONS
      const recommendations = await this.generateSkillRecommendations(studentId, progressData);

      // 📈 COMPLETION FORECASTING
      const forecasts = await this.calculateCompletionForecasts(studentId, progressData);

      // 💾 CACHE RESULTS
      await this.cacheProgressOverview(studentId, progressData, recommendations, forecasts);

      const processingTime = performance.now() - startTime;
      this.logger.metric('progress_overview_processing_time', processingTime, { studentId });

      return {
        success: true,
        studentId,
        timestamp: new Date().toISOString(),
        overview: progressData,
        recommendations,
        forecasts,
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Progress overview failed', error, { studentId });
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE STUDENT ACCESS
   */
  async validateStudentAccess(studentId) {
    if (!studentId) {
      throw new Error('STUDENT_ID_REQUIRED');
    }

    // Rate limiting
    try {
      await this.rateLimiter.consume(`student:${studentId}`);
    } catch (rateLimitError) {
      throw new Error('PROGRESS_QUERY_LIMIT_EXCEEDED');
    }

    // Verify student exists and is active
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, status: true, faydaId: true }
    });

    if (!student) {
      throw new Error('STUDENT_NOT_FOUND');
    }

    if (student.status !== 'ACTIVE') {
      throw new Error('STUDENT_NOT_ACTIVE');
    }

    this.logger.debug('Student access validated', { studentId });
  }

  /**
   * 📊 AGGREGATE CROSS-COURSE PROGRESS
   */
  async aggregateCrossCourseProgress(studentId, options) {
    const cacheKey = `progress:overview:${studentId}:${JSON.stringify(options)}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached && !options.forceRefresh) {
      return JSON.parse(cached);
    }

    // Get all enrollments for student
    const enrollments = await this.prisma.enrollment.findMany({
      where: { 
        studentId,
        status: { in: ['ACTIVE', 'COMPLETED', 'PAUSED'] }
      },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            category: true,
            difficulty: true,
            estimatedDuration: true
          }
        },
        trainingSessions: {
          where: { status: { in: ['COMPLETED', 'IN_PROGRESS'] } },
          select: {
            id: true,
            status: true,
            startTime: true,
            endTime: true,
            duration: true,
            expert: {
              select: { name: true, currentTier: true }
            }
          }
        },
        mindsetProgress: {
          select: {
            phase: true,
            completionPercentage: true,
            lastActivity: true,
            assessmentScore: true
          }
        },
        theoryProgress: {
          select: {
            completedExercises: true,
            totalExercises: true,
            currentLevel: true,
            streak: true,
            lastActivity: true
          }
        },
        handsOnProgress: {
          select: {
            completedSessions: true,
            totalSessions: true,
            projectCompletion: true,
            skillAssessment: true
          }
        },
        payments: {
          where: { status: 'COMPLETED' },
          select: { amount: true, createdAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (enrollments.length === 0) {
      return this.getEmptyProgressOverview(studentId);
    }

    // Calculate comprehensive progress metrics
    const progressData = await this.calculateProgressMetrics(enrollments, studentId);

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(progressData));

    return progressData;
  }

  /**
   * 📈 CALCULATE COMPREHENSIVE PROGRESS METRICS
   */
  async calculateProgressMetrics(enrollments, studentId) {
    const now = new Date();
    const totalEnrollments = enrollments.length;
    
    // Phase completion tracking
    const phaseProgress = {
      mindset: { completed: 0, inProgress: 0, notStarted: 0 },
      theory: { completed: 0, inProgress: 0, notStarted: 0 },
      handsOn: { completed: 0, inProgress: 0, notStarted: 0 },
      certification: { completed: 0, inProgress: 0, notStarted: 0 }
    };

    // Skill category progress
    const categoryProgress = {
      online: { count: 0, completed: 0, averageProgress: 0 },
      offline: { count: 0, completed: 0, averageProgress: 0 },
      health: { count: 0, completed: 0, averageProgress: 0 },
      beauty: { count: 0, completed: 0, averageProgress: 0 }
    };

    // Time and engagement metrics
    const timeMetrics = {
      totalLearningHours: 0,
      averageDailyHours: 0,
      currentStreak: 0,
      longestStreak: 0
    };

    const courseProgress = enrollments.map(enrollment => {
      const progress = this.calculateIndividualCourseProgress(enrollment);
      
      // Update phase progress
      this.updatePhaseProgress(phaseProgress, progress);
      
      // Update category progress
      this.updateCategoryProgress(categoryProgress, enrollment.skill.category, progress);
      
      // Update time metrics
      this.updateTimeMetrics(timeMetrics, enrollment, progress);

      return {
        enrollmentId: enrollment.id,
        skill: enrollment.skill,
        status: enrollment.status,
        progress: progress.overallPercentage,
        phaseBreakdown: progress.phaseBreakdown,
        startedAt: enrollment.createdAt,
        estimatedCompletion: progress.estimatedCompletion,
        expert: progress.currentExpert,
        lastActivity: progress.lastActivity,
        paymentStatus: enrollment.payments.length > 0 ? 'PAID' : 'PENDING'
      };
    });

    // Calculate overall metrics
    const overallProgress = this.calculateOverallProgress(courseProgress);
    const learningVelocity = await this.calculateLearningVelocity(studentId);
    const skillDiversity = this.calculateSkillDiversity(enrollments);

    return {
      studentId,
      summary: {
        totalEnrollments,
        activeEnrollments: enrollments.filter(e => e.status === 'ACTIVE').length,
        completedEnrollments: enrollments.filter(e => e.status === 'COMPLETED').length,
        overallCompletion: overallProgress,
        averageProgress: courseProgress.reduce((sum, course) => sum + course.progress, 0) / totalEnrollments,
        totalInvestment: enrollments.reduce((sum, enrollment) => 
          sum + enrollment.payments.reduce((paymentSum, payment) => paymentSum + payment.amount, 0), 0
        )
      },
      phaseProgress,
      categoryProgress,
      timeMetrics,
      courseProgress,
      learningVelocity,
      skillDiversity,
      lastUpdated: now.toISOString()
    };
  }

  /**
   * 🎯 CALCULATE INDIVIDUAL COURSE PROGRESS
   */
  calculateIndividualCourseProgress(enrollment) {
    const mindsetProgress = enrollment.mindsetProgress?.[0];
    const theoryProgress = enrollment.theoryProgress?.[0];
    const handsOnProgress = enrollment.handsOnProgress?.[0];
    
    const phaseBreakdown = {
      mindset: this.calculateMindsetProgress(mindsetProgress),
      theory: this.calculateTheoryProgress(theoryProgress),
      handsOn: this.calculateHandsOnProgress(handsOnProgress, enrollment.trainingSessions),
      certification: this.calculateCertificationProgress(enrollment)
    };

    const overallPercentage = this.calculateOverallPercentage(phaseBreakdown);
    const estimatedCompletion = this.estimateCompletionDate(enrollment, phaseBreakdown, overallPercentage);
    const currentExpert = this.getCurrentExpert(enrollment.trainingSessions);

    return {
      overallPercentage,
      phaseBreakdown,
      estimatedCompletion,
      currentExpert,
      lastActivity: this.getLastActivity(mindsetProgress, theoryProgress, handsOnProgress),
      streak: theoryProgress?.streak || 0
    };
  }

  /**
   * 🧠 CALCULATE MINDSET PROGRESS
   */
  calculateMindsetProgress(mindsetProgress) {
    if (!mindsetProgress) {
      return { percentage: 0, status: 'NOT_STARTED', phase: null };
    }

    const percentage = mindsetProgress.completionPercentage || 0;
    let status = 'IN_PROGRESS';
    
    if (percentage >= 100) status = 'COMPLETED';
    else if (percentage === 0) status = 'NOT_STARTED';

    return {
      percentage,
      status,
      phase: mindsetProgress.phase,
      assessmentScore: mindsetProgress.assessmentScore,
      lastActivity: mindsetProgress.lastActivity
    };
  }

  /**
   * 📚 CALCULATE THEORY PROGRESS
   */
  calculateTheoryProgress(theoryProgress) {
    if (!theoryProgress) {
      return { percentage: 0, status: 'NOT_STARTED', level: 1, exercises: { completed: 0, total: 0 } };
    }

    const completed = theoryProgress.completedExercises || 0;
    const total = theoryProgress.totalExercises || 1; // Avoid division by zero
    const percentage = Math.min((completed / total) * 100, 100);

    let status = 'IN_PROGRESS';
    if (percentage >= 100) status = 'COMPLETED';
    else if (percentage === 0) status = 'NOT_STARTED';

    return {
      percentage,
      status,
      level: theoryProgress.currentLevel || 1,
      exercises: { completed, total },
      streak: theoryProgress.streak || 0,
      lastActivity: theoryProgress.lastActivity
    };
  }

  /**
   * 🏋️ CALCULATE HANDS-ON PROGRESS
   */
  calculateHandsOnProgress(handsOnProgress, trainingSessions) {
    if (!handsOnProgress) {
      return { percentage: 0, status: 'NOT_STARTED', sessions: { completed: 0, total: 0 } };
    }

    const completedSessions = handsOnProgress.completedSessions || 0;
    const totalSessions = handsOnProgress.totalSessions || 8; // Default 8 sessions
    const percentage = Math.min((completedSessions / totalSessions) * 100, 100);

    let status = 'IN_PROGRESS';
    if (percentage >= 100) status = 'COMPLETED';
    else if (percentage === 0) status = 'NOT_STARTED';

    const recentSessions = trainingSessions
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
      .slice(0, 3);

    return {
      percentage,
      status,
      sessions: { completed: completedSessions, total: totalSessions },
      projectCompletion: handsOnProgress.projectCompletion || 0,
      skillAssessment: handsOnProgress.skillAssessment || 0,
      recentSessions: recentSessions.map(session => ({
        id: session.id,
        status: session.status,
        date: session.startTime,
        expert: session.expert?.name,
        duration: session.duration
      }))
    };
  }

  /**
   * 🏆 CALCULATE CERTIFICATION PROGRESS
   */
  calculateCertificationProgress(enrollment) {
    if (enrollment.status !== 'COMPLETED') {
      return { percentage: 0, status: 'NOT_STARTED', certified: false };
    }

    // Check if certificate exists
    const hasCertificate = enrollment.certificateId !== null;
    
    return {
      percentage: hasCertificate ? 100 : 0,
      status: hasCertificate ? 'COMPLETED' : 'PENDING',
      certified: hasCertificate,
      certificateId: enrollment.certificateId,
      yachiVerified: enrollment.yachiVerified || false
    };
  }

  /**
   * 📊 CALCULATE OVERALL PERCENTAGE
   */
  calculateOverallPercentage(phaseBreakdown) {
    const weights = {
      mindset: 0.15,    // 15% of total progress
      theory: 0.35,     // 35% of total progress  
      handsOn: 0.45,    // 45% of total progress
      certification: 0.05 // 5% of total progress
    };

    return Object.entries(weights).reduce((total, [phase, weight]) => {
      return total + (phaseBreakdown[phase].percentage * weight);
    }, 0);
  }

  /**
   * 🎯 GENERATE SKILL RECOMMENDATIONS
   */
  async generateSkillRecommendations(studentId, progressData) {
    const recommendations = {
      switchRecommendations: [],
      completionPriority: [],
      skillCombinations: [],
      warnings: []
    };

    // Analyze current progress patterns
    const activeCourses = progressData.courseProgress.filter(course => 
      course.progress < 100 && course.status === 'ACTIVE'
    );

    // Recommendation 1: Courses nearing completion
    const nearingCompletion = activeCourses
      .filter(course => course.progress >= 70)
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 3);

    recommendations.completionPriority = nearingCompletion.map(course => ({
      skillId: course.skill.id,
      skillName: course.skill.name,
      currentProgress: course.progress,
      estimatedDays: this.estimateDaysToCompletion(course),
      priority: 'HIGH'
    }));

    // Recommendation 2: Skill switching based on progress stagnation
    const stagnantCourses = activeCourses.filter(course => {
      const daysSinceProgress = this.getDaysSinceLastActivity(course.lastActivity);
      return daysSinceProgress > 14 && course.progress < 30; // Stagnant for 2 weeks
    });

    recommendations.switchRecommendations = stagnantCourses.map(async course => ({
      skillId: course.skill.id,
      skillName: course.skill.name,
      reason: 'LOW_ENGAGEMENT',
      daysInactive: this.getDaysSinceLastActivity(course.lastActivity),
      suggestedAlternatives: await this.findAlternativeSkills(course.skill.category, studentId)
    }));

    // Recommendation 3: Complementary skill combinations
    recommendations.skillCombinations = await this.findComplementarySkills(progressData, studentId);

    // Warnings for at-risk courses
    const atRiskCourses = activeCourses.filter(course => {
      const daysSinceStart = this.getDaysSince(new Date(course.startedAt));
      const expectedProgress = (daysSinceStart / 120) * 100; // 4-month expected duration
      return course.progress < expectedProgress * 0.5; // 50% behind expected
    });

    recommendations.warnings = atRiskCourses.map(course => ({
      skillId: course.skill.id,
      skillName: course.skill.name,
      issue: 'PROGRESS_BEHIND_SCHEDULE',
      currentProgress: course.progress,
      expectedProgress: Math.min((this.getDaysSince(new Date(course.startedAt)) / 120) * 100, 100),
      suggestedAction: 'INCREASE_FREQUENCY'
    }));

    return recommendations;
  }

  /**
   * 📈 CALCULATE COMPLETION FORECASTS
   */
  async calculateCompletionForecasts(studentId, progressData) {
    const activeCourses = progressData.courseProgress.filter(course => 
      course.progress < 100 && course.status === 'ACTIVE'
    );

    const forecasts = await Promise.all(
      activeCourses.map(async course => {
        const velocity = await this.calculateCourseVelocity(course.enrollmentId);
        const daysToComplete = this.forecastDaysToCompletion(course.progress, velocity);
        
        return {
          skillId: course.skill.id,
          skillName: course.skill.name,
          currentProgress: course.progress,
          dailyVelocity: velocity,
          estimatedDaysToComplete: daysToComplete,
          estimatedCompletionDate: this.addDays(new Date(), daysToComplete),
          confidence: this.calculateForecastConfidence(velocity, course.progress)
        };
      })
    );

    // Overall completion forecast
    const overallForecast = {
      estimatedTotalCompletion: this.calculateOverallCompletionDate(forecasts),
      skillsToComplete: forecasts.length,
      averageDailyProgress: forecasts.reduce((sum, f) => sum + f.dailyVelocity, 0) / forecasts.length,
      riskAssessment: this.assessCompletionRisk(forecasts)
    };

    return {
      courseForecasts: forecasts.sort((a, b) => a.estimatedDaysToComplete - b.estimatedDaysToComplete),
      overallForecast
    };
  }

  /**
   * 🔄 UPDATE PHASE PROGRESS
   */
  updatePhaseProgress(phaseProgress, progress) {
    Object.entries(progress.phaseBreakdown).forEach(([phase, data]) => {
      if (data.status === 'COMPLETED') phaseProgress[phase].completed++;
      else if (data.status === 'IN_PROGRESS') phaseProgress[phase].inProgress++;
      else phaseProgress[phase].notStarted++;
    });
  }

  /**
   * 📂 UPDATE CATEGORY PROGRESS
   */
  updateCategoryProgress(categoryProgress, category, progress) {
    const categoryKey = category.toLowerCase();
    if (categoryProgress[categoryKey]) {
      categoryProgress[categoryKey].count++;
      categoryProgress[categoryKey].averageProgress = 
        (categoryProgress[categoryKey].averageProgress * (categoryProgress[categoryKey].count - 1) + progress.overallPercentage) / 
        categoryProgress[categoryKey].count;
      
      if (progress.overallPercentage >= 100) {
        categoryProgress[categoryKey].completed++;
      }
    }
  }

  /**
   * ⏰ UPDATE TIME METRICS
   */
  updateTimeMetrics(timeMetrics, enrollment, progress) {
    // Calculate learning hours from sessions
    const sessionHours = enrollment.trainingSessions.reduce((total, session) => {
      return total + (session.duration || 0);
    }, 0) / 60; // Convert minutes to hours

    timeMetrics.totalLearningHours += sessionHours;
    
    // Update streak (simplified - would need actual streak tracking)
    if (progress.streak > timeMetrics.currentStreak) {
      timeMetrics.currentStreak = progress.streak;
    }
  }

  /**
   * 📊 CALCULATE OVERALL PROGRESS
   */
  calculateOverallProgress(courseProgress) {
    if (courseProgress.length === 0) return 0;
    
    const totalProgress = courseProgress.reduce((sum, course) => sum + course.progress, 0);
    return totalProgress / courseProgress.length;
  }

  /**
   * 🚀 CALCULATE LEARNING VELOCITY
   */
  async calculateLearningVelocity(studentId) {
    // Get recent activity to calculate daily progress rate
    const recentEnrollments = await this.prisma.enrollment.findMany({
      where: { 
        studentId,
        status: 'ACTIVE',
        updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      },
      select: {
        theoryProgress: {
          select: { completedExercises: true, lastActivity: true }
        },
        handsOnProgress: {
          select: { completedSessions: true, lastActivity: true }
        }
      }
    });

    // Simplified velocity calculation
    const totalActivities = recentEnrollments.reduce((count, enrollment) => {
      return count + 
        (enrollment.theoryProgress?.[0]?.completedExercises || 0) +
        (enrollment.handsOnProgress?.[0]?.completedSessions || 0);
    }, 0);

    return totalActivities / 30; // Average daily activities
  }

  /**
   * 🎯 CALCULATE SKILL DIVERSITY
   */
  calculateSkillDiversity(enrollments) {
    const categories = enrollments.reduce((acc, enrollment) => {
      const category = enrollment.skill.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const total = enrollments.length;
    const diversityScore = Object.keys(categories).length / 4; // 4 main categories

    return {
      categories,
      diversityScore: Math.min(diversityScore, 1),
      recommendation: diversityScore < 0.5 ? 'EXPLORE_MORE_CATEGORIES' : 'GOOD_DIVERSITY'
    };
  }

  /**
   * 💾 CACHE PROGRESS OVERVIEW
   */
  async cacheProgressOverview(studentId, progressData, recommendations, forecasts) {
    const cacheKey = `progress:complete:${studentId}`;
    const data = {
      progressData,
      recommendations,
      forecasts,
      cachedAt: new Date().toISOString()
    };

    await this.redis.setex(cacheKey, 600, JSON.stringify(data)); // 10 minutes
  }

  /**
   * 🔥 WARM UP PROGRESS CACHE
   */
  async warmUpProgressCache() {
    try {
      const activeStudents = await this.prisma.student.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
        take: 1000 // Limit to first 1000 active students
      });

      this.logger.info(`Warming up progress cache for ${activeStudents.length} students`);
      
      // Warm up in background
      activeStudents.forEach(async (student) => {
        try {
          await this.getProgressOverview(student.id, { forceRefresh: false });
        } catch (error) {
          // Silent fail for cache warming
        }
      });

    } catch (error) {
      this.logger.error('Failed to warm up progress cache', error);
    }
  }

  /**
   * 🧹 UTILITY FUNCTIONS
   */
  estimateDaysToCompletion(course) {
    const remaining = 100 - course.progress;
    const estimatedDailyProgress = 1.5; // Default daily progress %
    return Math.ceil(remaining / estimatedDailyProgress);
  }

  getDaysSinceLastActivity(lastActivity) {
    if (!lastActivity) return 999;
    return Math.floor((new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24));
  }

  getDaysSince(date) {
    return Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
  }

  async findAlternativeSkills(category, studentId) {
    // Find skills in same category that student hasn't enrolled in
    const existingEnrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      select: { skillId: true }
    });

    const existingSkillIds = existingEnrollments.map(e => e.skillId);

    const alternatives = await this.prisma.skill.findMany({
      where: {
        category: category.toUpperCase(),
        id: { notIn: existingSkillIds },
        status: 'ACTIVE'
      },
      select: { id: true, name: true, difficulty: true },
      take: 3
    });

    return alternatives;
  }

  async findComplementarySkills(progressData, studentId) {
    // Find skills that complement current enrollments
    const currentCategories = Object.keys(progressData.categoryProgress)
      .filter(cat => progressData.categoryProgress[cat].count > 0);

    // Recommend skills from underrepresented categories
    const underrepresented = Object.entries(progressData.categoryProgress)
      .filter(([cat, data]) => data.count === 0)
      .map(([cat]) => cat);

    const recommendations = [];

    for (const category of underrepresented.slice(0, 2)) {
      const skills = await this.prisma.skill.findMany({
        where: {
          category: category.toUpperCase(),
          status: 'ACTIVE',
          difficulty: 'BEGINNER'
        },
        select: { id: true, name: true, category: true },
        take: 2
      });

      recommendations.push({
        category,
        reason: 'DIVERSIFY_SKILLSET',
        skills
      });
    }

    return recommendations;
  }

  calculateCourseVelocity(enrollmentId) {
    // Simplified velocity calculation
    return 1.2; // Default daily progress %
  }

  forecastDaysToCompletion(currentProgress, velocity) {
    const remaining = 100 - currentProgress;
    return Math.ceil(remaining / velocity);
  }

  calculateForecastConfidence(velocity, progress) {
    // Higher confidence for consistent progress and higher completion
    if (progress > 80) return 'HIGH';
    if (progress > 50 && velocity > 1) return 'MEDIUM';
    return 'LOW';
  }

  calculateOverallCompletionDate(forecasts) {
    if (forecasts.length === 0) return null;
    
    const maxDays = Math.max(...forecasts.map(f => f.estimatedDaysToComplete));
    return this.addDays(new Date(), maxDays);
  }

  assessCompletionRisk(forecasts) {
    const atRisk = forecasts.filter(f => f.confidence === 'LOW').length;
    const total = forecasts.length;

    if (atRisk === 0) return 'LOW';
    if (atRisk / total > 0.5) return 'HIGH';
    return 'MEDIUM';
  }

  estimateCompletionDate(enrollment, phaseBreakdown, overallPercentage) {
    if (overallPercentage >= 100) return enrollment.updatedAt;

    const daysSinceStart = this.getDaysSince(enrollment.createdAt);
    const estimatedTotalDays = (daysSinceStart / overallPercentage) * 100;
    const remainingDays = estimatedTotalDays - daysSinceStart;

    return this.addDays(new Date(), Math.ceil(remainingDays));
  }

  getCurrentExpert(trainingSessions) {
    const recentSession = trainingSessions
      .filter(s => s.status === 'IN_PROGRESS' || s.status === 'COMPLETED')
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];

    return recentSession?.expert || null;
  }

  getLastActivity(mindsetProgress, theoryProgress, handsOnProgress) {
    const activities = [
      mindsetProgress?.lastActivity,
      theoryProgress?.lastActivity,
      handsOnProgress?.lastActivity
    ].filter(Boolean);

    if (activities.length === 0) return null;
    
    return new Date(Math.max(...activities.map(a => new Date(a))));
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  getEmptyProgressOverview(studentId) {
    return {
      studentId,
      summary: {
        totalEnrollments: 0,
        activeEnrollments: 0,
        completedEnrollments: 0,
        overallCompletion: 0,
        averageProgress: 0,
        totalInvestment: 0
      },
      phaseProgress: {
        mindset: { completed: 0, inProgress: 0, notStarted: 0 },
        theory: { completed: 0, inProgress: 0, notStarted: 0 },
        handsOn: { completed: 0, inProgress: 0, notStarted: 0 },
        certification: { completed: 0, inProgress: 0, notStarted: 0 }
      },
      categoryProgress: {
        online: { count: 0, completed: 0, averageProgress: 0 },
        offline: { count: 0, completed: 0, averageProgress: 0 },
        health: { count: 0, completed: 0, averageProgress: 0 },
        beauty: { count: 0, completed: 0, averageProgress: 0 }
      },
      timeMetrics: {
        totalLearningHours: 0,
        averageDailyHours: 0,
        currentStreak: 0,
        longestStreak: 0
      },
      courseProgress: [],
      learningVelocity: 0,
      skillDiversity: {
        categories: {},
        diversityScore: 0,
        recommendation: 'START_FIRST_COURSE'
      },
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Cross-course progress system resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new CrossCourseProgress();