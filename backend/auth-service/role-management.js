// auth-service/role-management.js

/**
 * 🏢 MOSA FORGE - Enterprise Role-Based Access Control (RBAC)
 * 🛡️ Advanced role management with dynamic permissions & quality enforcement
 * 💰 Revenue-protected access control for 1,999 ETB bundle platform
 * 🎯 Quality-guaranteed permission system with auto-enforcement
 * 
 * @module RoleManagementService
 * @version Enterprise 1.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const Redis = require('@redis/client');
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');

// Enterprise Dependencies
const EnterpriseLogger = require('./utils/enterprise-logger');
const SecurityMetrics = require('./utils/security-metrics');
const QualityEnforcer = require('./utils/quality-enforcer');
const AuditLogger = require('./utils/audit-logger');
const CacheManager = require('./utils/cache-manager');

class RoleManagementService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 🏗️ ENTERPRISE CONFIGURATION
    this.config = {
      // 🎯 MOSA FORGE Business Roles
      roles: {
        STUDENT: 'student',
        EXPERT: 'expert',
        QUALITY_MANAGER: 'quality_manager',
        PAYMENT_ADMIN: 'payment_admin',
        PLATFORM_ADMIN: 'platform_admin',
        SUPER_ADMIN: 'super_admin'
      },
      
      // 💰 Revenue Protection Levels
      revenueTiers: {
        STANDARD: 'standard',      // 999 ETB earners
        SENIOR: 'senior',          // 1,099 ETB earners  
        MASTER: 'master',          // 1,199 ETB earners
        ENTERPRISE: 'enterprise'   // Platform administrators
      },
      
      // 🛡️ Security Configuration
      sessionTimeout: 3600, // 1 hour
      maxConcurrentSessions: 5,
      enableGeolocation: true,
      requireDeviceFingerprint: true,
      
      // 📊 Quality Enforcement
      qualityThresholds: {
        EXPERT: 4.0,
        QUALITY_MANAGER: 4.5,
        PAYMENT_ADMIN: 4.7
      },
      
      // 🔄 Cache Configuration
      cacheTTL: 300, // 5 minutes
      cacheSize: 10000,
      
      // 📈 Monitoring
      enableRealTimeMetrics: true,
      enableQualityTracking: true,
      enableRevenueImpact: true,
      
      ...options
    };

    // 🏗️ ENTERPRISE SERVICE INITIALIZATION
    this.initializeEnterpriseServices();
    this.initializeRoleHierarchy();
    this.initializePermissionMatrix();
    this.initializeRevenueProtection();
    
    this.stats = {
      roleAssignments: 0,
      permissionChecks: 0,
      accessGrants: 0,
      accessDenials: 0,
      qualityEnforcements: 0,
      revenueProtections: 0
    };

    this.initialized = false;
  }

  /**
   * 🏗️ Initialize Enterprise Services
   */
  initializeEnterpriseServices() {
    try {
      // 📊 Enterprise Logger
      this.logger = new EnterpriseLogger({
        service: 'role-management',
        module: 'authorization',
        environment: process.env.NODE_ENV
      });

      // 🛡️ Security Metrics
      this.metrics = new SecurityMetrics({
        service: 'role-management',
        businessUnit: 'auth-service'
      });

      // 🎯 Quality Enforcer
      this.qualityEnforcer = new QualityEnforcer({
        service: 'role-management',
        autoEnforcement: true,
        qualityThreshold: 4.0
      });

      // 📝 Audit Logger
      this.auditLogger = new AuditLogger({
        service: 'role-management',
        retentionDays: 365
      });

      // 💾 Cache Manager
      this.cacheManager = new CacheManager({
        prefix: 'role_mgmt',
        ttl: this.config.cacheTTL,
        maxSize: this.config.cacheSize
      });

      // 💾 Database Client
      this.prisma = new PrismaClient({
        log: ['warn', 'error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });

      // 🔄 Redis Cluster
      this.redis = Redis.createCluster({
        rootNodes: [
          { url: process.env.REDIS_URL_1 },
          { url: process.env.REDIS_URL_2 },
          { url: process.env.REDIS_URL_3 }
        ],
        defaults: {
          socket: {
            tls: true,
            connectTimeout: 10000,
            lazyConnect: false
          }
        }
      });

      this.logger.system('Enterprise role management services initialized', {
        service: 'role-management',
        roles: Object.values(this.config.roles),
        features: Object.keys(this.config).filter(k => this.config[k] === true)
      });

    } catch (error) {
      this.logger.critical('Enterprise role management initialization failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * 🏗️ Initialize Role Hierarchy
   */
  initializeRoleHierarchy() {
    this.roleHierarchy = {
      [this.config.roles.SUPER_ADMIN]: [
        this.config.roles.PLATFORM_ADMIN,
        this.config.roles.PAYMENT_ADMIN,
        this.config.roles.QUALITY_MANAGER,
        this.config.roles.EXPERT,
        this.config.roles.STUDENT
      ],
      [this.config.roles.PLATFORM_ADMIN]: [
        this.config.roles.PAYMENT_ADMIN,
        this.config.roles.QUALITY_MANAGER,
        this.config.roles.EXPERT,
        this.config.roles.STUDENT
      ],
      [this.config.roles.PAYMENT_ADMIN]: [
        this.config.roles.EXPERT,
        this.config.roles.STUDENT
      ],
      [this.config.roles.QUALITY_MANAGER]: [
        this.config.roles.EXPERT,
        this.config.roles.STUDENT
      ],
      [this.config.roles.EXPERT]: [
        this.config.roles.STUDENT
      ],
      [this.config.roles.STUDENT]: []
    };
  }

  /**
   * 🏗️ Initialize Permission Matrix
   */
  initializePermissionMatrix() {
    this.permissionMatrix = {
      // 💰 Payment-Related Permissions
      PAYMENT: {
        [this.config.roles.STUDENT]: ['bundle.purchase', 'payment.view', 'receipt.download'],
        [this.config.roles.EXPERT]: ['revenue.view', 'payout.track', 'bonus.view'],
        [this.config.roles.PAYMENT_ADMIN]: [
          'revenue.manage', 'payout.process', 'refund.process',
          'payment.analytics', 'revenue.distribute'
        ],
        [this.config.roles.SUPER_ADMIN]: ['payment.*']
      },

      // 🎯 Quality-Related Permissions
      QUALITY: {
        [this.config.roles.STUDENT]: ['expert.rate', 'quality.feedback', 'complaint.submit'],
        [this.config.roles.EXPERT]: ['quality.metrics.view', 'improvement.plan.view'],
        [this.config.roles.QUALITY_MANAGER]: [
          'quality.monitor', 'expert.tier.manage', 'enforcement.execute',
          'metrics.analyze', 'improvement.enforce'
        ],
        [this.config.roles.SUPER_ADMIN]: ['quality.*']
      },

      // 👨‍🏫 Expert-Related Permissions
      EXPERT: {
        [this.config.roles.EXPERT]: [
          'profile.manage', 'portfolio.update', 'student.manage',
          'session.schedule', 'earning.view'
        ],
        [this.config.roles.QUALITY_MANAGER]: [
          'expert.verify', 'expert.suspend', 'capacity.manage',
          'tier.adjust', 'performance.review'
        ],
        [this.config.roles.SUPER_ADMIN]: ['expert.*']
      },

      // 🎓 Student-Related Permissions
      STUDENT: {
        [this.config.roles.STUDENT]: [
          'enrollment.manage', 'progress.track', 'course.access',
          'certificate.view', 'expert.select'
        ],
        [this.config.roles.EXPERT]: ['student.progress.view', 'session.conduct'],
        [this.config.roles.QUALITY_MANAGER]: ['student.migrate', 'enrollment.override'],
        [this.config.roles.SUPER_ADMIN]: ['student.*']
      },

      // 📊 Analytics Permissions
      ANALYTICS: {
        [this.config.roles.EXPERT]: ['performance.analytics'],
        [this.config.roles.QUALITY_MANAGER]: ['platform.analytics', 'quality.metrics'],
        [this.config.roles.PAYMENT_ADMIN]: ['revenue.analytics', 'payout.analytics'],
        [this.config.roles.PLATFORM_ADMIN]: ['business.analytics', 'growth.metrics'],
        [this.config.roles.SUPER_ADMIN]: ['analytics.*']
      },

      // ⚙️ System Permissions
      SYSTEM: {
        [this.config.roles.PLATFORM_ADMIN]: [
          'system.config', 'user.manage', 'role.assign',
          'feature.toggle', 'maintenance.mode'
        ],
        [this.config.roles.SUPER_ADMIN]: ['system.*', '*']
      }
    };
  }

  /**
   * 🏗️ Initialize Revenue Protection
   */
  initializeRevenueProtection() {
    this.revenueProtection = {
      // 💰 Revenue-Based Access Rules
      minimumEarnings: {
        [this.config.roles.EXPERT]: 0,        // Starting experts
        [this.config.roles.QUALITY_MANAGER]: 50000, // 50,000 ETB lifetime
        [this.config.roles.PAYMENT_ADMIN]: 100000   // 100,000 ETB lifetime
      },

      // 🎯 Quality-Based Access Rules
      minimumQuality: {
        [this.config.roles.EXPERT]: 4.0,
        [this.config.roles.QUALITY_MANAGER]: 4.5,
        [this.config.roles.PAYMENT_ADMIN]: 4.7
      },

      // 📈 Performance Requirements
      performanceMetrics: {
        [this.config.roles.EXPERT]: {
          completionRate: 0.7,
          studentSatisfaction: 4.0,
          responseTime: 24 // hours
        },
        [this.config.roles.QUALITY_MANAGER]: {
          completionRate: 0.8,
          studentSatisfaction: 4.5,
          responseTime: 12 // hours
        }
      }
    };
  }

  /**
   * 🎯 ASSIGN ROLE TO USER - Enterprise Grade
   */
  async assignRole(userId, role, context = {}) {
    const startTime = performance.now();
    const assignmentId = this.generateAssignmentId();

    try {
      // 🛡️ PRE-ASSIGNMENT VALIDATION
      await this.validateRoleAssignment(userId, role, context);

      // 💰 REVENUE PROTECTION CHECK
      await this.validateRevenueRequirements(userId, role);

      // 🎯 QUALITY GUARANTEE VALIDATION
      await this.validateQualityRequirements(userId, role);

      // 🔐 SECURITY VALIDATION
      await this.validateSecurityContext(userId, role, context);

      // 📝 EXECUTE ROLE ASSIGNMENT
      const assignment = await this.executeRoleAssignment(userId, role, context);

      // 🔄 UPDATE CACHE
      await this.updateUserRoleCache(userId, assignment);

      // 📊 RECORD METRICS
      await this.recordRoleAssignmentMetrics(userId, role, assignment, context);

      const responseTime = performance.now() - startTime;

      this.logger.security('Role assigned successfully', {
        assignmentId,
        userId,
        role,
        assignedBy: context.assignedBy,
        responseTime: responseTime.toFixed(2)
      });

      return {
        success: true,
        assignmentId,
        userId,
        role,
        effectiveFrom: assignment.effectiveFrom,
        expiresAt: assignment.expiresAt,
        permissions: assignment.permissions
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      await this.handleAssignmentFailure(assignmentId, userId, role, error, context, responseTime);
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE ROLE ASSIGNMENT
   */
  async validateRoleAssignment(userId, role, context) {
    // ✅ VALIDATE ROLE EXISTS
    if (!Object.values(this.config.roles).includes(role)) {
      throw new RoleManagementError(
        'INVALID_ROLE',
        `Role '${role}' does not exist in the system`,
        { validRoles: Object.values(this.config.roles) }
      );
    }

    // ✅ VALIDATE USER EXISTS
    const user = await this.findUserById(userId);
    if (!user) {
      throw new RoleManagementError('USER_NOT_FOUND', `User ${userId} not found`);
    }

    // ✅ VALIDATE ASSIGNER PERMISSIONS
    if (context.assignedBy) {
      const canAssign = await this.canAssignRole(context.assignedBy, role);
      if (!canAssign) {
        throw new RoleManagementError(
          'INSUFFICIENT_PERMISSIONS',
          'User does not have permission to assign this role',
          { assigner: context.assignedBy, targetRole: role }
        );
      }
    }

    // ✅ CHECK EXISTING ROLE CONFLICTS
    await this.checkRoleConflicts(userId, role);

    this.logger.security('Role assignment validation passed', {
      userId,
      role,
      validations: ['role_exists', 'user_exists', 'permissions', 'conflicts']
    });
  }

  /**
   * 💰 VALIDATE REVENUE REQUIREMENTS
   */
  async validateRevenueRequirements(userId, role) {
    const revenueRules = this.revenueProtection.minimumEarnings[role];
    if (!revenueRules) return; // No revenue requirements for this role

    const userRevenue = await this.calculateUserLifetimeRevenue(userId);
    
    if (userRevenue < revenueRules) {
      throw new RoleManagementError(
        'REVENUE_REQUIREMENT_NOT_MET',
        `Role requires minimum lifetime revenue of ${revenueRules} ETB`,
        { 
          currentRevenue: userRevenue, 
          requiredRevenue: revenueRules,
          shortfall: revenueRules - userRevenue
        }
      );
    }

    this.logger.business('Revenue requirements validated', {
      userId,
      role,
      currentRevenue: userRevenue,
      requiredRevenue: revenueRules
    });
  }

  /**
   * 🎯 VALIDATE QUALITY REQUIREMENTS
   */
  async validateQualityRequirements(userId, role) {
    const qualityRules = this.revenueProtection.minimumQuality[role];
    if (!qualityRules) return;

    const qualityMetrics = await this.qualityEnforcer.getUserQualityMetrics(userId);
    
    if (qualityMetrics.overallScore < qualityRules) {
      throw new RoleManagementError(
        'QUALITY_REQUIREMENT_NOT_MET',
        `Role requires minimum quality score of ${qualityRules}`,
        {
          currentScore: qualityMetrics.overallScore,
          requiredScore: qualityRules,
          metrics: qualityMetrics
        }
      );
    }

    // 🎯 VALIDATE PERFORMANCE METRICS
    const performanceRules = this.revenueProtection.performanceMetrics[role];
    if (performanceRules) {
      await this.validatePerformanceMetrics(userId, performanceRules, role);
    }

    this.logger.quality('Quality requirements validated', {
      userId,
      role,
      qualityScore: qualityMetrics.overallScore,
      requiredScore: qualityRules
    });
  }

  /**
   * 🛡️ VALIDATE SECURITY CONTEXT
   */
  async validateSecurityContext(userId, role, context) {
    // 🌍 GEOGRAPHIC VALIDATION
    if (this.config.enableGeolocation) {
      await this.validateGeographicAccess(context);
    }

    // 📱 DEVICE VALIDATION
    if (this.config.requireDeviceFingerprint) {
      await this.validateDeviceFingerprint(context);
    }

    // ⏰ SESSION VALIDATION
    await this.validateSessionSecurity(context);

    this.logger.security('Security context validation passed', {
      userId,
      role,
      validations: ['geographic', 'device', 'session']
    });
  }

  /**
   * 📝 EXECUTE ROLE ASSIGNMENT
   */
  async executeRoleAssignment(userId, role, context) {
    const transaction = await this.prisma.$transaction(async (prisma) => {
      // 📋 CREATE ROLE ASSIGNMENT
      const assignment = await prisma.roleAssignment.create({
        data: {
          userId,
          role,
          assignedBy: context.assignedBy || 'system',
          effectiveFrom: new Date(),
          expiresAt: this.calculateRoleExpiry(role),
          status: 'ACTIVE',
          context: this.sanitizeContext(context)
        }
      });

      // 🔄 UPDATE USER ROLE
      await prisma.user.update({
        where: { id: userId },
        data: { 
          currentRole: role,
          roleUpdatedAt: new Date()
        }
      });

      // 📝 AUDIT LOG
      await this.auditLogger.logRoleAction({
        action: 'ROLE_ASSIGNED',
        userId,
        role,
        assignedBy: context.assignedBy,
        ipAddress: context.ip,
        userAgent: context.userAgent,
        metadata: {
          assignmentId: assignment.id,
          effectiveFrom: assignment.effectiveFrom,
          expiresAt: assignment.expiresAt
        }
      });

      return assignment;
    });

    this.stats.roleAssignments++;

    return transaction;
  }

  /**
   * 🔄 UPDATE USER ROLE CACHE
   */
  async updateUserRoleCache(userId, assignment) {
    const cacheKey = `user_roles:${userId}`;
    const cacheData = {
      role: assignment.role,
      permissions: await this.calculateUserPermissions(userId, assignment.role),
      effectiveFrom: assignment.effectiveFrom,
      expiresAt: assignment.expiresAt,
      lastUpdated: Date.now()
    };

    await this.cacheManager.set(cacheKey, cacheData, this.config.cacheTTL);
  }

  /**
   * ✅ CHECK PERMISSION - Enterprise Grade
   */
  async checkPermission(userId, permission, resource = null, context = {}) {
    const startTime = performance.now();
    const checkId = this.generatePermissionCheckId();

    try {
      this.stats.permissionChecks++;

      // 🔍 GET USER ROLE AND PERMISSIONS
      const userAuth = await this.getUserAuthorization(userId);
      
      if (!userAuth) {
        throw new RoleManagementError('USER_NOT_AUTHORIZED', 'User authorization data not found');
      }

      // 🎯 CHECK PERMISSION
      const hasPermission = await this.evaluatePermission(
        userAuth.role, 
        permission, 
        resource, 
        context
      );

      // 💰 REVENUE-BASED PERMISSION ENFORCEMENT
      if (hasPermission) {
        await this.enforceRevenueBasedPermissions(userId, permission, userAuth.role);
      }

      // 🎯 QUALITY-BASED PERMISSION ENFORCEMENT
      if (hasPermission) {
        await this.enforceQualityBasedPermissions(userId, permission, userAuth.role);
      }

      const responseTime = performance.now() - startTime;

      // 📊 RECORD METRICS
      if (hasPermission) {
        this.stats.accessGrants++;
        this.metrics.recordPermissionGrant({
          userId,
          permission,
          role: userAuth.role,
          responseTime
        });
      } else {
        this.stats.accessDenials++;
        this.metrics.recordPermissionDenial({
          userId,
          permission,
          role: userAuth.role,
          responseTime,
          reason: 'permission_not_granted'
        });
      }

      this.logger.security('Permission check completed', {
        checkId,
        userId,
        permission,
        granted: hasPermission,
        role: userAuth.role,
        responseTime: responseTime.toFixed(2)
      });

      return {
        granted: hasPermission,
        checkId,
        userId,
        permission,
        role: userAuth.role,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      await this.handlePermissionCheckFailure(checkId, userId, permission, error, context, responseTime);
      throw error;
    }
  }

  /**
   * 🔍 GET USER AUTHORIZATION
   */
  async getUserAuthorization(userId) {
    // 💾 CHECK CACHE FIRST
    const cacheKey = `user_roles:${userId}`;
    const cached = await this.cacheManager.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    // 🗄️ FETCH FROM DATABASE
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        currentRole: true,
        roleUpdatedAt: true,
        status: true
      }
    });

    if (!user || !user.currentRole) {
      return null;
    }

    const authorization = {
      role: user.currentRole,
      permissions: await this.calculateUserPermissions(userId, user.currentRole),
      lastUpdated: user.roleUpdatedAt
    };

    // 💾 UPDATE CACHE
    await this.cacheManager.set(cacheKey, authorization, this.config.cacheTTL);

    return authorization;
  }

  /**
   * 🧮 CALCULATE USER PERMISSIONS
   */
  async calculateUserPermissions(userId, role) {
    const permissions = new Set();

    // 🎯 ADD ROLE-BASED PERMISSIONS
    Object.values(this.permissionMatrix).forEach(domain => {
      const rolePermissions = domain[role] || [];
      rolePermissions.forEach(permission => permissions.add(permission));
    });

    // 🏗️ ADD HIERARCHICAL PERMISSIONS
    const hierarchicalRoles = this.roleHierarchy[role] || [];
    for (const lowerRole of hierarchicalRoles) {
      Object.values(this.permissionMatrix).forEach(domain => {
        const lowerRolePermissions = domain[lowerRole] || [];
        lowerRolePermissions.forEach(permission => permissions.add(permission));
      });
    }

    // 💰 ADD REVENUE-BASED PERMISSIONS
    const revenuePermissions = await this.calculateRevenueBasedPermissions(userId);
    revenuePermissions.forEach(permission => permissions.add(permission));

    // 🎯 ADD QUALITY-BASED PERMISSIONS
    const qualityPermissions = await this.calculateQualityBasedPermissions(userId, role);
    qualityPermissions.forEach(permission => permissions.add(permission));

    return Array.from(permissions);
  }

  /**
   * 💰 CALCULATE REVENUE-BASED PERMISSIONS
   */
  async calculateRevenueBasedPermissions(userId) {
    const permissions = [];
    const userRevenue = await this.calculateUserLifetimeRevenue(userId);

    // 💵 REVENUE TIER PERMISSIONS
    if (userRevenue >= 100000) {
      permissions.push('analytics.advanced', 'reports.export');
    }
    if (userRevenue >= 50000) {
      permissions.push('performance.detailed', 'metrics.comparative');
    }
    if (userRevenue >= 10000) {
      permissions.push('revenue.insights', 'growth.metrics');
    }

    return permissions;
  }

  /**
   * 🎯 CALCULATE QUALITY-BASED PERMISSIONS
   */
  async calculateQualityBasedPermissions(userId, role) {
    const permissions = [];
    const qualityMetrics = await this.qualityEnforcer.getUserQualityMetrics(userId);

    // ⭐ QUALITY TIER PERMISSIONS
    if (qualityMetrics.overallScore >= 4.7) {
      permissions.push('premium.features', 'early.access', 'beta.programs');
    }
    if (qualityMetrics.overallScore >= 4.5) {
      permissions.push('advanced.analytics', 'priority.support');
    }
    if (qualityMetrics.overallScore >= 4.3) {
      permissions.push('enhanced.reports', 'performance.insights');
    }

    return permissions;
  }

  /**
   * 🎯 EVALUATE PERMISSION
   */
  async evaluatePermission(role, permission, resource, context) {
    // 🎯 CHECK DIRECT PERMISSION
    const hasDirectPermission = this.checkDirectPermission(role, permission);
    if (hasDirectPermission) return true;

    // 🏗️ CHECK HIERARCHICAL PERMISSION
    const hasHierarchicalPermission = await this.checkHierarchicalPermission(role, permission);
    if (hasHierarchicalPermission) return true;

    // 💼 CHECK RESOURCE-BASED PERMISSION
    if (resource) {
      const hasResourcePermission = await this.checkResourceBasedPermission(role, permission, resource, context);
      if (hasResourcePermission) return true;
    }

    return false;
  }

  /**
   * 🎯 CHECK DIRECT PERMISSION
   */
  checkDirectPermission(role, permission) {
    for (const domain of Object.values(this.permissionMatrix)) {
      const rolePermissions = domain[role] || [];
      if (rolePermissions.includes(permission) || rolePermissions.includes('*')) {
        return true;
      }
    }
    return false;
  }

  /**
   * 🔄 REVOKE ROLE - Enterprise Grade
   */
  async revokeRole(userId, role, context = {}) {
    const startTime = performance.now();
    const revocationId = this.generateRevocationId();

    try {
      // 🛡️ VALIDATE REVOCATION
      await this.validateRoleRevocation(userId, role, context);

      // 📝 EXECUTE ROLE REVOCATION
      const revocation = await this.executeRoleRevocation(userId, role, context);

      // 🔄 UPDATE CACHE
      await this.invalidateUserRoleCache(userId);

      // 📊 RECORD METRICS
      await this.recordRoleRevocationMetrics(userId, role, revocation, context);

      const responseTime = performance.now() - startTime;

      this.logger.security('Role revoked successfully', {
        revocationId,
        userId,
        role,
        revokedBy: context.revokedBy,
        responseTime: responseTime.toFixed(2)
      });

      return {
        success: true,
        revocationId,
        userId,
        role,
        revokedAt: revocation.revokedAt,
        reason: revocation.reason
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      await this.handleRevocationFailure(revocationId, userId, role, error, context, responseTime);
      throw error;
    }
  }

  /**
   * 📊 GET ROLE ANALYTICS
   */
  async getRoleAnalytics(timeframe = '30d') {
    const analytics = {
      roleDistribution: await this.getRoleDistribution(),
      permissionUsage: await this.getPermissionUsage(timeframe),
      qualityMetrics: await this.getRoleQualityMetrics(timeframe),
      revenueImpact: await this.getRoleRevenueImpact(timeframe),
      securityEvents: await this.getRoleSecurityEvents(timeframe)
    };

    return analytics;
  }

  /**
   * 🔧 UTILITY METHODS
   */

  generateAssignmentId() {
    return `role_assign_${crypto.randomBytes(16).toString('hex')}`;
  }

  generatePermissionCheckId() {
    return `perm_check_${crypto.randomBytes(16).toString('hex')}`;
  }

  generateRevocationId() {
    return `role_revoke_${crypto.randomBytes(16).toString('hex')}`;
  }

  calculateRoleExpiry(role) {
    const expiryRules = {
      [this.config.roles.EXPERT]: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      [this.config.roles.QUALITY_MANAGER]: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
      [this.config.roles.PAYMENT_ADMIN]: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
      [this.config.roles.PLATFORM_ADMIN]: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 1 month
    };

    return expiryRules[role] || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  }

  sanitizeContext(context) {
    const sanitized = { ...context };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    return sanitized;
  }

  /**
   * 🎯 ENTERPRISE ERROR HANDLING
   */
  async handleAssignmentFailure(assignmentId, userId, role, error, context, responseTime) {
    this.logger.error('Role assignment failed', {
      assignmentId,
      userId,
      role,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2),
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logRoleAction({
      action: 'ROLE_ASSIGNMENT_FAILED',
      userId,
      role,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ip,
      userAgent: context.userAgent
    });
  }

  async handlePermissionCheckFailure(checkId, userId, permission, error, context, responseTime) {
    this.logger.error('Permission check failed', {
      checkId,
      userId,
      permission,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2),
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logRoleAction({
      action: 'PERMISSION_CHECK_FAILED',
      userId,
      permission,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ip
    });
  }

  async handleRevocationFailure(revocationId, userId, role, error, context, responseTime) {
    this.logger.error('Role revocation failed', {
      revocationId,
      userId,
      role,
      error: error.message,
      errorCode: error.code,
      responseTime: responseTime.toFixed(2),
      context: this.sanitizeContext(context)
    });

    await this.auditLogger.logRoleAction({
      action: 'ROLE_REVOCATION_FAILED',
      userId,
      role,
      error: error.message,
      errorCode: error.code,
      ipAddress: context.ip
    });
  }
}

/**
 * 🎯 ENTERPRISE ERROR CLASS
 */
class RoleManagementError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'RoleManagementError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;
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

// 🎯 ENTERPRISE ERROR CODES
RoleManagementError.CODES = {
  // 🔐 Security Errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  SESSION_INVALID: 'SESSION_INVALID',
  
  // 👤 User Errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_NOT_AUTHORIZED: 'USER_NOT_AUTHORIZED',
  
  // 🎯 Role Errors
  INVALID_ROLE: 'INVALID_ROLE',
  ROLE_CONFLICT: 'ROLE_CONFLICT',
  ROLE_NOT_ASSIGNABLE: 'ROLE_NOT_ASSIGNABLE',
  
  // 💰 Business Errors
  REVENUE_REQUIREMENT_NOT_MET: 'REVENUE_REQUIREMENT_NOT_MET',
  QUALITY_REQUIREMENT_NOT_MET: 'QUALITY_REQUIREMENT_NOT_MET',
  PERFORMANCE_REQUIREMENT_NOT_MET: 'PERFORMANCE_REQUIREMENT_NOT_MET',
  
  // 🔐 Permission Errors
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED'
};

module.exports = {
  RoleManagementService,
  RoleManagementError
};