/**
 * 🏢 MOSA FORGE - Enterprise Student Roster Management System
 * 👥 Dynamic Student-Expert Matching & Capacity Management
 * 📊 Real-time Performance Monitoring & Quality Optimization
 * 🔄 Automated Student Distribution & Load Balancing
 * 🚀 Microservice-Ready Enterprise Architecture
 * 
 * @module StudentRosterManager
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
const NotificationService = require('../../services/notification-service');
const CapacityOptimizer = require('../../utils/capacity-optimizer');
const MatchingEngine = require('../../utils/matching-engine');

class StudentRosterManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 🎯 Enterprise Configuration
    this.config = {
      // 👥 Roster Configuration
      roster: {
        maxStudentsPerExpert: {
          standard: 50,
          senior: 100,
          master: null // Unlimited with quality maintenance
        },
        minQualityScore: 4.0,
        autoRebalance: true,
        rebalanceThreshold: 0.8 // 80% capacity
      },

      // 🎯 Matching Configuration
      matching: {
        algorithm: 'quality_weighted',
        factors: {
          expertise_match: 0.35,
          quality_score: 0.25,
          current_load: 0.20,
          student_preference: 0.20
        },
        maxMatchingAttempts: 3,
        fallbackEnabled: true
      },

      // 📊 Performance Configuration
      performance: {
        monitoringInterval: 300000, // 5 minutes
        qualityCheckInterval: 3600000, // 1 hour
        cacheRefreshInterval: 60000, // 1 minute
        realTimeUpdates: true
      },

      // 🔄 Auto-Scaling Configuration
      autoScaling: {
        enabled: true,
        scaleUpThreshold: 0.75, // 75% capacity
        scaleDownThreshold: 0.25, // 25% capacity
        maxScaleUpPercent: 0.2 // 20% increase
      },

      ...config
    };

    // 🏗️ Service State
    this.serviceState = {
      initialized: false,
      healthy: false,
      activeExperts: 0,
      totalStudents: 0,
      averageLoad: 0,
      lastOptimization: null
    };

    this.metrics = {
      studentsAssigned: 0,
      studentsReassigned: 0,
      matchingSuccessRate: 0,
      qualityViolations: 0,
      autoRebalances: 0,
      averageAssignmentTime: 0
    };

    this.initializeEnterpriseServices();
  }

  /**
   * 🏗️ Initialize Enterprise Services
   */
  async initializeEnterpriseServices() {
    try {
      // 📊 Enterprise Logging
      this.logger = new EnterpriseLogger({
        service: 'student-roster-manager',
        module: 'expert-service',
        environment: process.env.NODE_ENV,
        logLevel: process.env.LOG_LEVEL || 'info'
      });

      // ⭐ Quality Metrics
      this.qualityMetrics = new QualityMetrics({
        service: 'student-roster-manager',
        updateInterval: this.config.performance.qualityCheckInterval
      });

      // 📧 Notification Service
      this.notificationService = new NotificationService({
        templates: {
          studentAssigned: 'student_assigned_v1',
          expertAtCapacity: 'expert_at_capacity_v1',
          qualityWarning: 'quality_warning_v1',
          rosterUpdated: 'roster_updated_v1'
        }
      });

      // 📈 Capacity Optimizer
      this.capacityOptimizer = new CapacityOptimizer({
        maxStudentsPerExpert: this.config.roster.maxStudentsPerExpert,
        rebalanceThreshold: this.config.roster.rebalanceThreshold,
        autoScaling: this.config.autoScaling
      });

      // 🤝 Matching Engine
      this.matchingEngine = new MatchingEngine({
        algorithm: this.config.matching.algorithm,
        factors: this.config.matching.factors,
        maxAttempts: this.config.matching.maxMatchingAttempts
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

      this.serviceState.initialized = true;
      this.serviceState.healthy = true;

      this.logger.system('Enterprise Student Roster Manager initialized successfully', {
        service: 'student-roster-manager',
        version: '2.0.0',
        features: {
          autoRebalance: this.config.roster.autoRebalance,
          realTimeUpdates: this.config.performance.realTimeUpdates,
          autoScaling: this.config.autoScaling.enabled
        }
      });

    } catch (error) {
      this.logger.critical('Enterprise Student Roster Manager initialization failed', {
        error: error.message,
        stack: error.stack,
        service: 'student-roster-manager'
      });
      throw error;
    }
  }

  /**
   * 🔄 Initialize Background Jobs
   */
  initializeBackgroundJobs() {
    // 📊 Performance Monitoring
    this.monitoringInterval = setInterval(() => {
      this.monitorPerformance().catch(error => {
        this.logger.error('Performance monitoring failed', { error: error.message });
      });
    }, this.config.performance.monitoringInterval);

    // ⭐ Quality Monitoring
    this.qualityInterval = setInterval(() => {
      this.monitorQuality().catch(error => {
        this.logger.error('Quality monitoring failed', { error: error.message });
      });
    }, this.config.performance.qualityCheckInterval);

    // 💾 Cache Refresh
    this.cacheInterval = setInterval(() => {
      this.refreshCache().catch(error => {
        this.logger.error('Cache refresh failed', { error: error.message });
      });
    }, this.config.performance.cacheRefreshInterval);
  }

  /**
   * 👥 ASSIGN STUDENT TO EXPERT - Enterprise Grade
   */
  async assignStudent(assignmentRequest, context = {}) {
    const startTime = performance.now();
    const assignmentId = this.generateAssignmentId();
    const traceId = context.traceId || assignmentId;

    try {
      // 🛡️ Pre-flight Checks
      await this.performPreFlightChecks();

      // ✅ Validate Assignment Request
      await this.validateAssignmentRequest(assignmentRequest);

      // 🎯 Find Optimal Expert
      const expertAssignment = await this.findOptimalExpert(assignmentRequest, traceId);

      // 💾 Create Assignment Record
      const assignmentRecord = await this.createAssignmentRecord({
        assignmentId,
        assignmentRequest,
        expertAssignment,
        traceId
      });

      // 🔄 Update Expert Roster
      await this.updateExpertRoster(expertAssignment.expertId, assignmentRequest.studentId);

      // 📧 Send Notifications
      await this.sendAssignmentNotifications(assignmentRecord);

      // 📊 Update Metrics
      await this.updateAssignmentMetrics({
        assignmentId,
        expertId: expertAssignment.expertId,
        studentId: assignmentRequest.studentId,
        responseTime: performance.now() - startTime
      });

      this.metrics.studentsAssigned++;
      this.serviceState.totalStudents++;

      this.logger.business('Student assigned to expert successfully', {
        assignmentId,
        traceId,
        studentId: assignmentRequest.studentId,
        expertId: expertAssignment.expertId,
        matchScore: expertAssignment.matchScore,
        currentLoad: expertAssignment.currentLoad
      });

      return {
        success: true,
        assignmentId,
        studentId: assignmentRequest.studentId,
        expertId: expertAssignment.expertId,
        expertName: expertAssignment.expertName,
        matchScore: expertAssignment.matchScore,
        estimatedStartTime: this.calculateEstimatedStartTime(expertAssignment.currentLoad),
        nextSteps: this.generateAssignmentNextSteps()
      };

    } catch (error) {
      await this.handleAssignmentFailure({
        assignmentId,
        assignmentRequest,
        error,
        context,
        responseTime: performance.now() - startTime,
        traceId
      });
      throw error;
    }
  }

  /**
   * ✅ VALIDATE ASSIGNMENT REQUEST
   */
  async validateAssignmentRequest(assignmentRequest) {
    const validationRules = {
      requiredFields: ['studentId', 'skillId', 'courseType', 'preferences'],
      studentRequirements: {
        mustExist: true,
        validStatus: ['active', 'pending_enrollment']
      },
      skillRequirements: {
        mustExist: true,
        mustBeActive: true
      },
      preferenceLimits: {
        maxPreferredExperts: 5,
        maxBlacklistedExperts: 10
      }
    };

    const errors = [];

    // ✅ Check Required Fields
    const missingFields = validationRules.requiredFields.filter(field => !assignmentRequest[field]);
    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // ✅ Validate Student
    if (assignmentRequest.studentId) {
      const studentValidation = await this.validateStudent(assignmentRequest.studentId, validationRules.studentRequirements);
      if (!studentValidation.valid) {
        errors.push(`Student validation failed: ${studentValidation.reason}`);
      }
    }

    // ✅ Validate Skill
    if (assignmentRequest.skillId) {
      const skillValidation = await this.validateSkill(assignmentRequest.skillId, validationRules.skillRequirements);
      if (!skillValidation.valid) {
        errors.push(`Skill validation failed: ${skillValidation.reason}`);
      }
    }

    // ✅ Validate Preferences
    if (assignmentRequest.preferences) {
      const preferenceErrors = this.validatePreferences(assignmentRequest.preferences, validationRules.preferenceLimits);
      errors.push(...preferenceErrors);
    }

    if (errors.length > 0) {
      throw new RosterManagementError('ASSIGNMENT_VALIDATION_FAILED', 'Student assignment validation failed', {
        errors,
        studentId: assignmentRequest.studentId,
        skillId: assignmentRequest.skillId
      });
    }

    this.logger.security('Student assignment validation passed', {
      studentId: assignmentRequest.studentId,
      skillId: assignmentRequest.skillId,
      courseType: assignmentRequest.courseType
    });
  }

  /**
   * 🎯 FIND OPTIMAL EXPERT
   */
  async findOptimalExpert(assignmentRequest, traceId) {
    const matchingStartTime = performance.now();
    let attempts = 0;

    try {
      while (attempts < this.config.matching.maxMatchingAttempts) {
        attempts++;

        // 🔍 Get Available Experts
        const availableExperts = await this.getAvailableExperts(assignmentRequest);

        if (availableExperts.length === 0) {
          if (this.config.matching.fallbackEnabled && attempts === this.config.matching.maxMatchingAttempts) {
            return await this.fallbackToBestAvailable(assignmentRequest);
          }
          continue;
        }

        // 🤝 Calculate Match Scores
        const scoredExperts = await this.calculateExpertScores(availableExperts, assignmentRequest);

        // 🏆 Select Best Match
        const bestMatch = this.selectBestMatch(scoredExperts, assignmentRequest);

        if (bestMatch && bestMatch.matchScore >= 0.6) { // Minimum match threshold
          this.logger.debug('Optimal expert found', {
            traceId,
            attempts,
            expertId: bestMatch.expertId,
            matchScore: bestMatch.matchScore,
            totalExperts: availableExperts.length
          });

          return bestMatch;
        }

        // 🔄 Adjust matching parameters for next attempt
        await this.adjustMatchingParameters(attempts);
      }

      // 🆘 No suitable expert found
      throw new RosterManagementError('NO_SUITABLE_EXPERT_FOUND', 'No suitable expert found after maximum attempts', {
        attempts,
        studentId: assignmentRequest.studentId,
        skillId: assignmentRequest.skillId
      });

    } catch (error) {
      this.logger.error('Expert matching failed', {
        traceId,
        attempts,
        error: error.message,
        processingTime: performance.now() - matchingStartTime
      });
      throw error;
    }
  }

  /**
   * 🔍 GET AVAILABLE EXPERTS
   */
  async getAvailableExperts(assignmentRequest) {
    const cacheKey = `available_experts:${assignmentRequest.skillId}`;
    
    try {
      // 💾 Try cache first
      const cachedExperts = await this.redis.get(cacheKey);
      if (cachedExperts) {
        return JSON.parse(cachedExperts);
      }

      // 🗃️ Query database for available experts
      const availableExperts = await this.prisma.expert.findMany({
        where: {
          status: 'active',
          qualityScore: { gte: this.config.roster.minQualityScore },
          skills: {
            some: {
              skillId: assignmentRequest.skillId,
              verified: true
            }
          },
          currentStudents: { lt: this.getMaxStudentsForTier() } // Dynamic limit based on tier
        },
        include: {
          skills: {
            where: { skillId: assignmentRequest.skillId },
            select: { proficiency: true, verified: true }
          },
          qualityMetrics: {
            orderBy: { calculatedAt: 'desc' },
            take: 1
          },
          roster: {
            select: { studentCount: true, averageRating: true }
          }
        },
        orderBy: { qualityScore: 'desc' }
      });

      // 🛡️ Filter out blacklisted experts
      const filteredExperts = this.filterBlacklistedExperts(availableExperts, assignmentRequest.preferences);

      // 💾 Cache results
      await this.redis.setex(cacheKey, 300, JSON.stringify(filteredExperts)); // 5 minutes cache

      this.logger.debug('Available experts retrieved', {
        skillId: assignmentRequest.skillId,
        totalAvailable: availableExperts.length,
        afterFiltering: filteredExperts.length
      });

      return filteredExperts;

    } catch (error) {
      this.logger.error('Failed to get available experts', {
        skillId: assignmentRequest.skillId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🤝 CALCULATE EXPERT SCORES
   */
  async calculateExpertScores(experts, assignmentRequest) {
    const scoringPromises = experts.map(async (expert) => {
      try {
        const scores = await this.matchingEngine.calculateMatchScore(expert, assignmentRequest);
        
        return {
          expertId: expert.id,
          expertName: `${expert.personalInfo.firstName} ${expert.personalInfo.lastName}`,
          currentLoad: this.calculateCurrentLoad(expert),
          qualityScore: expert.qualityScore,
          matchScore: scores.overall,
          scoreBreakdown: scores.breakdown,
          capacity: this.getExpertCapacity(expert),
          tier: expert.currentTier
        };
      } catch (error) {
        this.logger.warn('Expert scoring failed', {
          expertId: expert.id,
          error: error.message
        });
        return null;
      }
    });

    const scoredExperts = await Promise.all(scoringPromises);
    return scoredExperts.filter(expert => expert !== null);
  }

  /**
   * 🔄 REASSIGN STUDENT - Quality-Driven Reassignment
   */
  async reassignStudent(reassignmentRequest, context = {}) {
    const startTime = performance.now();
    const reassignmentId = this.generateReassignmentId();
    const traceId = context.traceId || reassignmentId;

    try {
      // ✅ Validate Reassignment Request
      await this.validateReassignmentRequest(reassignmentRequest);

      // 🔍 Get Current Assignment
      const currentAssignment = await this.getCurrentAssignment(reassignmentRequest.studentId);

      if (!currentAssignment) {
        throw new RosterManagementError('NO_CURRENT_ASSIGNMENT', 'Student has no current assignment to reassign');
      }

      // 📉 Check Reassignment Reason
      const reassignmentReason = await this.analyzeReassignmentReason(reassignmentRequest, currentAssignment);

      // 🎯 Find New Expert
      const newExpertAssignment = await this.findOptimalExpert({
        studentId: reassignmentRequest.studentId,
        skillId: currentAssignment.skillId,
        courseType: currentAssignment.courseType,
        preferences: {
          ...reassignmentRequest.preferences,
          blacklistedExperts: [currentAssignment.expertId] // Avoid reassigning to same expert
        }
      }, traceId);

      // 💾 Update Assignment Records
      const reassignmentRecord = await this.processReassignment({
        reassignmentId,
        currentAssignment,
        newExpertAssignment,
        reassignmentReason,
        traceId
      });

      // 🔄 Update Rosters
      await this.updateBothRosters(currentAssignment.expertId, newExpertAssignment.expertId, reassignmentRequest.studentId);

      // 📧 Send Reassignment Notifications
      await this.sendReassignmentNotifications(reassignmentRecord);

      // 📊 Update Metrics
      this.metrics.studentsReassigned++;

      this.logger.business('Student reassignment completed', {
        reassignmentId,
        traceId,
        studentId: reassignmentRequest.studentId,
        fromExpert: currentAssignment.expertId,
        toExpert: newExpertAssignment.expertId,
        reason: reassignmentReason.primaryReason,
        qualityImpact: reassignmentReason.qualityImpact
      });

      return {
        success: true,
        reassignmentId,
        studentId: reassignmentRequest.studentId,
        previousExpertId: currentAssignment.expertId,
        newExpertId: newExpertAssignment.expertId,
        reason: reassignmentReason.primaryReason,
        estimatedTransitionTime: this.calculateTransitionTime(currentAssignment, newExpertAssignment)
      };

    } catch (error) {
      await this.handleReassignmentFailure({
        reassignmentId,
        reassignmentRequest,
        error,
        context,
        responseTime: performance.now() - startTime,
        traceId
      });
      throw error;
    }
  }

  /**
   * 📊 MONITOR PERFORMANCE - Background Monitoring
   */
  async monitorPerformance() {
    const monitoringStartTime = performance.now();
    const monitoringId = this.generateMonitoringId();

    try {
      // 📈 Get Current Performance Metrics
      const performanceMetrics = await this.calculatePerformanceMetrics();

      // 🔍 Identify Performance Issues
      const performanceIssues = await this.identifyPerformanceIssues(performanceMetrics);

      // 🔄 Auto-Rebalance if Needed
      if (performanceIssues.needsRebalancing && this.config.roster.autoRebalance) {
        await this.triggerAutoRebalance(performanceIssues);
      }

      // 📊 Update Service State
      this.serviceState.activeExperts = performanceMetrics.activeExperts;
      this.serviceState.totalStudents = performanceMetrics.totalStudents;
      this.serviceState.averageLoad = performanceMetrics.averageLoad;
      this.serviceState.lastOptimization = new Date();

      this.logger.debug('Performance monitoring completed', {
        monitoringId,
        activeExperts: performanceMetrics.activeExperts,
        totalStudents: performanceMetrics.totalStudents,
        averageLoad: performanceMetrics.averageLoad,
        issuesDetected: performanceIssues.issues.length,
        processingTime: performance.now() - monitoringStartTime
      });

    } catch (error) {
      this.logger.error('Performance monitoring failed', {
        monitoringId,
        error: error.message
      });
    }
  }

  /**
   * ⭐ MONITOR QUALITY - Quality-Driven Management
   */
  async monitorQuality() {
    const qualityStartTime = performance.now();
    const qualityCheckId = this.generateQualityCheckId();

    try {
      // 📉 Get Quality Metrics
      const qualityMetrics = await this.qualityMetrics.getExpertQualityMetrics();

      // 🔍 Identify Quality Issues
      const qualityIssues = await this.identifyQualityIssues(qualityMetrics);

      // 🚨 Trigger Quality Actions
      for (const issue of qualityIssues) {
        await this.handleQualityIssue(issue);
      }

      // 📊 Update Quality Metrics
      this.metrics.qualityViolations += qualityIssues.length;

      this.logger.debug('Quality monitoring completed', {
        qualityCheckId,
        expertsMonitored: qualityMetrics.length,
        qualityIssues: qualityIssues.length,
        processingTime: performance.now() - qualityStartTime
      });

    } catch (error) {
      this.logger.error('Quality monitoring failed', {
        qualityCheckId,
        error: error.message
      });
    }
  }

  /**
   * 🔄 AUTO-REBALANCE - Load Balancing
   */
  async triggerAutoRebalance(performanceIssues) {
    const rebalanceStartTime = performance.now();
    const rebalanceId = this.generateRebalanceId();

    try {
      // 🎯 Identify Overloaded Experts
      const overloadedExperts = performanceIssues.overloadedExperts;

      for (const expert of overloadedExperts) {
        // 🔍 Find Students to Reassign
        const studentsToReassign = await this.identifyStudentsForReassignment(expert);

        for (const student of studentsToReassign) {
          try {
            await this.reassignStudent({
              studentId: student.id,
              reason: 'auto_rebalance',
              priority: 'medium'
            });

            this.logger.info('Student auto-reassigned for load balancing', {
              rebalanceId,
              studentId: student.id,
              fromExpert: expert.id,
              reason: 'overload_mitigation'
            });

          } catch (error) {
            this.logger.warn('Auto-reassignment failed for student', {
              rebalanceId,
              studentId: student.id,
              error: error.message
            });
          }
        }
      }

      this.metrics.autoRebalances++;

      this.logger.business('Auto-rebalance completed', {
        rebalanceId,
        overloadedExperts: overloadedExperts.length,
        studentsReassigned: performanceIssues.studentsToReassign,
        processingTime: performance.now() - rebalanceStartTime
      });

    } catch (error) {
      this.logger.error('Auto-rebalance failed', {
        rebalanceId,
        error: error.message
      });
    }
  }

  /**
   * 📊 GET ROSTER ANALYTICS
   */
  async getRosterAnalytics(timeRange = '7d') {
    const analytics = {
      summary: {
        totalExperts: this.serviceState.activeExperts,
        totalStudents: this.serviceState.totalStudents,
        averageLoad: this.serviceState.averageLoad,
        utilizationRate: await this.calculateUtilizationRate()
      },
      performance: {
        assignmentSuccessRate: this.metrics.matchingSuccessRate,
        averageAssignmentTime: this.metrics.averageAssignmentTime,
        reassignmentRate: this.calculateReassignmentRate(),
        qualityCompliance: await this.calculateQualityCompliance()
      },
      distribution: {
        byTier: await this.getDistributionByTier(),
        bySkill: await this.getDistributionBySkill(),
        byLoad: await this.getDistributionByLoad()
      },
      alerts: {
        capacityAlerts: await this.getCapacityAlerts(),
        qualityAlerts: await this.getQualityAlerts(),
        performanceAlerts: await this.getPerformanceAlerts()
      }
    };

    return analytics;
  }

  /**
   * 🔧 UTILITY METHODS
   */

  generateAssignmentId() {
    return `assign_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateReassignmentId() {
    return `reassign_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateMonitoringId() {
    return `monitor_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateQualityCheckId() {
    return `quality_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  generateRebalanceId() {
    return `rebalance_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  }

  calculateCurrentLoad(expert) {
    const maxStudents = this.getMaxStudentsForTier(expert.currentTier);
    return expert.currentStudents / maxStudents;
  }

  getMaxStudentsForTier(tier = 'standard') {
    return this.config.roster.maxStudentsPerExpert[tier] || 50;
  }

  getExpertCapacity(expert) {
    const maxStudents = this.getMaxStudentsForTier(expert.currentTier);
    return {
      current: expert.currentStudents,
      max: maxStudents,
      available: maxStudents - expert.currentStudents,
      utilization: (expert.currentStudents / maxStudents) * 100
    };
  }

  calculateEstimatedStartTime(currentLoad) {
    const baseDays = 1;
    const loadFactor = currentLoad > 0.8 ? 3 : currentLoad > 0.6 ? 2 : 1;
    return new Date(Date.now() + (baseDays * loadFactor * 24 * 60 * 60 * 1000));
  }

  calculateTransitionTime(oldAssignment, newAssignment) {
    const baseHours = 24;
    const complexityFactor = oldAssignment.skillId === newAssignment.skillId ? 1 : 1.5;
    return baseHours * complexityFactor;
  }

  generateAssignmentNextSteps() {
    return [
      'expert_notification',
      'student_onboarding',
      'course_material_setup',
      'initial_session_scheduling'
    ];
  }

  selectBestMatch(scoredExperts, assignmentRequest) {
    return scoredExperts.reduce((best, current) => {
      if (!best || current.matchScore > best.matchScore) {
        return current;
      }
      return best;
    }, null);
  }

  filterBlacklistedExperts(experts, preferences) {
    if (!preferences || !preferences.blacklistedExperts) {
      return experts;
    }

    return experts.filter(expert => 
      !preferences.blacklistedExperts.includes(expert.id)
    );
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
      const backgroundJobsHealthy = this.monitoringInterval && this.qualityInterval && this.cacheInterval;

      this.serviceState.healthy = backgroundJobsHealthy;
      this.serviceState.lastHealthCheck = new Date();

      if (!this.serviceState.healthy) {
        this.logger.warn('Student roster manager health check failed', {
          backgroundJobsHealthy
        });
      }

      return this.serviceState.healthy;

    } catch (error) {
      this.serviceState.healthy = false;
      this.logger.error('Student roster manager health check failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * 🎯 ERROR HANDLING
   */
  async handleAssignmentFailure({ assignmentId, assignmentRequest, error, context, responseTime, traceId }) {
    this.logger.error('Student assignment failed', {
      assignmentId,
      traceId,
      studentId: assignmentRequest.studentId,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2)
    });

    // 🚨 Trigger fallback or escalation
    if (error.code === 'NO_SUITABLE_EXPERT_FOUND') {
      await this.escalateToManualAssignment(assignmentRequest, error);
    }
  }

  async handleReassignmentFailure({ reassignmentId, reassignmentRequest, error, context, responseTime, traceId }) {
    this.logger.error('Student reassignment failed', {
      reassignmentId,
      traceId,
      studentId: reassignmentRequest.studentId,
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
    if (this.qualityInterval) clearInterval(this.qualityInterval);
    if (this.cacheInterval) clearInterval(this.cacheInterval);
    
    await this.prisma.$disconnect();
    await this.redis.quit();
  }
}

/**
 * 🎯 ENTERPRISE ROSTER MANAGEMENT ERROR CLASS
 */
class RosterManagementError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'RosterManagementError';
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

// 🎯 Enterprise Roster Management Error Codes
RosterManagementError.CODES = {
  // 🔐 Validation Errors
  ASSIGNMENT_VALIDATION_FAILED: 'ASSIGNMENT_VALIDATION_FAILED',
  REASSIGNMENT_VALIDATION_FAILED: 'REASSIGNMENT_VALIDATION_FAILED',
  INVALID_STUDENT_STATUS: 'INVALID_STUDENT_STATUS',
  INVALID_SKILL: 'INVALID_SKILL',

  // 👥 Matching Errors
  NO_SUITABLE_EXPERT_FOUND: 'NO_SUITABLE_EXPERT_FOUND',
  MATCHING_ENGINE_FAILED: 'MATCHING_ENGINE_FAILED',
  INSUFFICIENT_EXPERT_CAPACITY: 'INSUFFICIENT_EXPERT_CAPACITY',

  // 📊 Quality Errors
  QUALITY_THRESHOLD_EXCEEDED: 'QUALITY_THRESHOLD_EXCEEDED',
  EXPERT_QUALITY_ISSUE: 'EXPERT_QUALITY_ISSUE',
  STUDENT_SATISFACTION_LOW: 'STUDENT_SATISFACTION_LOW',

  // 🔄 Reassignment Errors
  NO_CURRENT_ASSIGNMENT: 'NO_CURRENT_ASSIGNMENT',
  REASSIGNMENT_NOT_ALLOWED: 'REASSIGNMENT_NOT_ALLOWED',
  TRANSITION_FAILED: 'TRANSITION_FAILED'
};

module.exports = {
  StudentRosterManager,
  RosterManagementError
};