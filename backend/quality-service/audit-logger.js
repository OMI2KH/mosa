// quality-service/audit-logger.js

/**
 * 🛡️ ENTERPRISE AUDIT LOGGING SYSTEM
 * Comprehensive audit trails, security logging, and compliance tracking
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../utils/logger');
const { SecurityEngine } = require('../utils/security-engine');
const { CompressionEngine } = require('../utils/compression-engine');

class AuditLogger extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('AuditLogger');
    this.securityEngine = new SecurityEngine();
    this.compressionEngine = new CompressionEngine();
    
    // Audit configuration
    this.config = {
      retentionPeriod: 90, // days
      batchSize: 100,
      flushInterval: 30000, // 30 seconds
      maxLogSize: 10 * 1024 * 1024, // 10MB
      compressionThreshold: 1000, // records
      securityLevels: {
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3,
        CRITICAL: 4
      }
    };

    // Audit categories
    this.categories = {
      QUALITY: 'QUALITY',
      SECURITY: 'SECURITY',
      PAYMENT: 'PAYMENT',
      USER: 'USER',
      SYSTEM: 'SYSTEM',
      COMPLIANCE: 'COMPLIANCE'
    };

    // Event types
    this.eventTypes = {
      // Quality events
      QUALITY_SCORE_UPDATE: 'QUALITY_SCORE_UPDATE',
      TIER_CHANGE: 'TIER_CHANGE',
      ENFORCEMENT_ACTION: 'ENFORCEMENT_ACTION',
      IMPROVEMENT_PLAN: 'IMPROVEMENT_PLAN',
      
      // Security events
      USER_LOGIN: 'USER_LOGIN',
      PERMISSION_CHANGE: 'PERMISSION_CHANGE',
      DATA_ACCESS: 'DATA_ACCESS',
      SECURITY_BREACH: 'SECURITY_BREACH',
      
      // Payment events
      PAYMENT_PROCESSED: 'PAYMENT_PROCESSED',
      REVENUE_DISTRIBUTION: 'REVENUE_DISTRIBUTION',
      REFUND_ISSUED: 'REFUND_ISSUED',
      
      // System events
      SYSTEM_UPDATE: 'SYSTEM_UPDATE',
      CONFIG_CHANGE: 'CONFIG_CHANGE',
      MAINTENANCE: 'MAINTENANCE'
    };

    this.batchQueue = [];
    this.isFlushing = false;
    this.initialize();
  }

  /**
   * 🚀 INITIALIZE AUDIT LOGGER
   */
  async initialize() {
    try {
      await this.redis.ping();
      
      // Start batch processing
      this.startBatchProcessor();
      
      // Start retention management
      this.startRetentionManager();
      
      // Initialize audit indexes
      await this.initializeAuditIndexes();
      
      this.logger.info('Audit logger initialized successfully');
      this.emit('auditLoggerReady');
      
    } catch (error) {
      this.logger.error('Failed to initialize audit logger', error);
      throw error;
    }
  }

  /**
   * 📝 LOG AUDIT EVENT - Core logging method
   */
  async logEvent(auditData) {
    const startTime = performance.now();
    
    try {
      // 🛡️ Validate audit data
      this.validateAuditData(auditData);

      // 🔒 Enhance with security context
      const enhancedData = await this.enhanceWithSecurityContext(auditData);

      // 🎯 Determine security level
      const securityLevel = this.determineSecurityLevel(enhancedData);

      // 📊 Add performance metrics
      const auditEvent = {
        ...enhancedData,
        securityLevel,
        timestamp: new Date(),
        logId: this.generateLogId(),
        sessionId: await this.getCurrentSessionId(),
        checksum: this.generateChecksum(enhancedData)
      };

      // 🚀 Add to batch queue for processing
      await this.addToBatchQueue(auditEvent);

      const processingTime = performance.now() - startTime;
      this.emit('auditEventLogged', {
        eventType: auditData.eventType,
        logId: auditEvent.logId,
        processingTime
      });

      return {
        success: true,
        logId: auditEvent.logId,
        timestamp: auditEvent.timestamp,
        securityLevel
      };

    } catch (error) {
      this.logger.error('Audit event logging failed', error, { 
        eventType: auditData.eventType,
        userId: auditData.userId 
      });
      
      // Even if logging fails, emit emergency event
      this.emit('auditLoggingFailed', {
        error: error.message,
        auditData,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE AUDIT DATA
   */
  validateAuditData(auditData) {
    const requiredFields = ['eventType', 'userId', 'action'];
    
    for (const field of requiredFields) {
      if (!auditData[field]) {
        throw new Error(`MISSING_REQUIRED_FIELD: ${field}`);
      }
    }

    // Validate event type
    if (!Object.values(this.eventTypes).includes(auditData.eventType)) {
      throw new Error(`INVALID_EVENT_TYPE: ${auditData.eventType}`);
    }

    // Validate category
    if (auditData.category && !Object.values(this.categories).includes(auditData.category)) {
      throw new Error(`INVALID_CATEGORY: ${auditData.category}`);
    }

    // Validate metadata size
    if (auditData.metadata && JSON.stringify(auditData.metadata).length > 10000) {
      throw new Error('METADATA_SIZE_EXCEEDED');
    }

    // Validate IP address format if provided
    if (auditData.ipAddress && !this.isValidIPAddress(auditData.ipAddress)) {
      throw new Error('INVALID_IP_ADDRESS');
    }
  }

  /**
   * 🔒 ENHANCE WITH SECURITY CONTEXT
   */
  async enhanceWithSecurityContext(auditData) {
    const securityContext = await this.securityEngine.getSecurityContext();
    
    return {
      ...auditData,
      securityContext: {
        userAgent: auditData.userAgent || 'Unknown',
        ipAddress: auditData.ipAddress || await this.getClientIP(),
        location: await this.getGeolocation(auditData.ipAddress),
        sessionHash: securityContext.sessionHash,
        riskScore: await this.calculateRiskScore(auditData),
        authenticationMethod: securityContext.authMethod
      },
      systemContext: {
        version: process.env.APP_VERSION,
        environment: process.env.NODE_ENV,
        timestamp: new Date(),
        traceId: this.generateTraceId()
      }
    };
  }

  /**
   * 🎯 DETERMINE SECURITY LEVEL
   */
  determineSecurityLevel(auditData) {
    const { eventType, securityContext, metadata } = auditData;

    // Critical events
    if ([
      this.eventTypes.SECURITY_BREACH,
      this.eventTypes.PERMISSION_CHANGE,
      this.eventTypes.REFUND_ISSUED
    ].includes(eventType)) {
      return this.config.securityLevels.CRITICAL;
    }

    // High security events
    if ([
      this.eventTypes.USER_LOGIN,
      this.eventTypes.DATA_ACCESS,
      this.eventTypes.REVENUE_DISTRIBUTION
    ].includes(eventType)) {
      return this.config.securityLevels.HIGH;
    }

    // Medium security events
    if ([
      this.eventTypes.QUALITY_SCORE_UPDATE,
      this.eventTypes.TIER_CHANGE,
      this.eventTypes.ENFORCEMENT_ACTION
    ].includes(eventType)) {
      return this.config.securityLevels.MEDIUM;
    }

    // Check for sensitive data in metadata
    if (metadata && this.containsSensitiveData(metadata)) {
      return this.config.securityLevels.HIGH;
    }

    // Check risk score
    if (securityContext.riskScore > 0.7) {
      return this.config.securityLevels.HIGH;
    }

    return this.config.securityLevels.LOW;
  }

  /**
   * 📊 CALCULATE RISK SCORE
   */
  async calculateRiskScore(auditData) {
    let riskScore = 0;

    // High risk for admin actions
    if (await this.isAdminUser(auditData.userId)) {
      riskScore += 0.3;
    }

    // High risk for payment-related events
    if (auditData.category === this.categories.PAYMENT) {
      riskScore += 0.3;
    }

    // Risk based on time (unusual hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskScore += 0.2;
    }

    // Risk based on location anomalies
    if (await this.isLocationAnomaly(auditData.ipAddress)) {
      riskScore += 0.2;
    }

    return Math.min(1, riskScore);
  }

  /**
   * 🚀 BATCH PROCESSING SYSTEM
   */
  startBatchProcessor() {
    setInterval(async () => {
      if (!this.isFlushing && this.batchQueue.length > 0) {
        await this.processBatch();
      }
    }, this.config.flushInterval);

    this.logger.info('Batch processor started');
  }

  /**
   * 📦 PROCESS BATCH OF AUDIT EVENTS
   */
  async processBatch() {
    if (this.isFlushing || this.batchQueue.length === 0) {
      return;
    }

    this.isFlushing = true;
    const batchStartTime = performance.now();

    try {
      // Take batch from queue
      const batch = this.batchQueue.splice(0, this.config.batchSize);
      
      // Store in database
      await this.storeBatchInDatabase(batch);
      
      // Update real-time index
      await this.updateRealTimeIndex(batch);
      
      // Compress if necessary
      if (batch.length >= this.config.compressionThreshold) {
        await this.compressAuditData(batch);
      }

      const processingTime = performance.now() - batchStartTime;
      
      this.emit('batchProcessed', {
        batchSize: batch.length,
        processingTime,
        timestamp: new Date()
      });

      this.logger.debug('Audit batch processed', {
        batchSize: batch.length,
        processingTime: `${processingTime.toFixed(2)}ms`
      });

    } catch (error) {
      this.logger.error('Batch processing failed', error);
      
      // Requeue failed batch
      this.batchQueue.unshift(...this.getCurrentBatch());
      
      this.emit('batchProcessingFailed', {
        error: error.message,
        batchSize: this.batchQueue.length,
        timestamp: new Date()
      });
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * 💾 STORE BATCH IN DATABASE
   */
  async storeBatchInDatabase(batch) {
    return await this.prisma.$transaction(async (tx) => {
      const createdLogs = [];

      for (const auditEvent of batch) {
        try {
          const logEntry = await tx.auditLog.create({
            data: {
              logId: auditEvent.logId,
              eventType: auditEvent.eventType,
              category: auditEvent.category,
              userId: auditEvent.userId,
              expertId: auditEvent.expertId,
              studentId: auditEvent.studentId,
              action: auditEvent.action,
              description: auditEvent.description,
              securityLevel: auditEvent.securityLevel,
              metadata: auditEvent.metadata || {},
              securityContext: auditEvent.securityContext,
              systemContext: auditEvent.systemContext,
              checksum: auditEvent.checksum,
              ipAddress: auditEvent.securityContext.ipAddress,
              userAgent: auditEvent.securityContext.userAgent,
              timestamp: auditEvent.timestamp
            }
          });

          createdLogs.push(logEntry);

        } catch (error) {
          this.logger.error('Failed to create audit log entry', error, { logId: auditEvent.logId });
          throw error;
        }
      }

      // Update audit statistics
      await this.updateAuditStatistics(createdLogs, tx);

      return createdLogs;
    }, {
      maxWait: 10000,
      timeout: 30000
    });
  }

  /**
   * 📊 UPDATE AUDIT STATISTICS
   */
  async updateAuditStatistics(logs, transaction) {
    const stats = this.calculateBatchStatistics(logs);
    
    await transaction.auditStatistics.upsert({
      where: { date: new Date().toISOString().split('T')[0] },
      update: {
        totalEvents: { increment: stats.totalEvents },
        criticalEvents: { increment: stats.criticalEvents },
        highSecurityEvents: { increment: stats.highSecurityEvents },
        uniqueUsers: { increment: stats.uniqueUsers },
        lastUpdated: new Date()
      },
      create: {
        date: new Date().toISOString().split('T')[0],
        totalEvents: stats.totalEvents,
        criticalEvents: stats.criticalEvents,
        highSecurityEvents: stats.highSecurityEvents,
        uniqueUsers: stats.uniqueUsers
      }
    });
  }

  /**
   * 📈 CALCULATE BATCH STATISTICS
   */
  calculateBatchStatistics(logs) {
    const uniqueUsers = new Set(logs.map(log => log.userId)).size;
    const criticalEvents = logs.filter(log => 
      log.securityLevel === this.config.securityLevels.CRITICAL
    ).length;
    const highSecurityEvents = logs.filter(log => 
      log.securityLevel >= this.config.securityLevels.HIGH
    ).length;

    return {
      totalEvents: logs.length,
      criticalEvents,
      highSecurityEvents,
      uniqueUsers
    };
  }

  /**
   * 🔍 UPDATE REAL-TIME INDEX
   */
  async updateRealTimeIndex(batch) {
    const pipeline = this.redis.pipeline();

    batch.forEach(auditEvent => {
      const key = `audit:realtime:${auditEvent.eventType}`;
      
      // Add to sorted set by timestamp
      pipeline.zadd(key, auditEvent.timestamp.getTime(), auditEvent.logId);
      
      // Set expiration for real-time data (24 hours)
      pipeline.expire(key, 86400);
      
      // Update user activity index
      if (auditEvent.userId) {
        const userKey = `audit:user:${auditEvent.userId}:activity`;
        pipeline.zadd(userKey, auditEvent.timestamp.getTime(), auditEvent.logId);
        pipeline.expire(userKey, 86400);
      }
    });

    await pipeline.exec();
  }

  /**
   * 🗜️ COMPRESS AUDIT DATA
   */
  async compressAuditData(batch) {
    try {
      const compressedData = await this.compressionEngine.compress(
        JSON.stringify(batch)
      );

      const compressionKey = `audit:compressed:${Date.now()}`;
      await this.redis.setex(compressionKey, 604800, compressedData); // 7 days

      this.emit('auditDataCompressed', {
        originalSize: JSON.stringify(batch).length,
        compressedSize: compressedData.length,
        compressionRatio: (JSON.stringify(batch).length / compressedData.length).toFixed(2),
        batchSize: batch.length
      });

    } catch (error) {
      this.logger.error('Audit data compression failed', error);
    }
  }

  /**
   * 📤 ADD TO BATCH QUEUE
   */
  async addToBatchQueue(auditEvent) {
    this.batchQueue.push(auditEvent);

    // Immediate processing if queue reaches batch size
    if (this.batchQueue.length >= this.config.batchSize && !this.isFlushing) {
      await this.processBatch();
    }

    // Emergency flush if queue grows too large
    if (this.batchQueue.length > this.config.batchSize * 5) {
      this.logger.warn('Audit queue growing large, forcing flush', {
        queueSize: this.batchQueue.length
      });
      await this.processBatch();
    }
  }

  /**
   * 🔎 QUERY AUDIT LOGS
   */
  async queryAuditLogs(query = {}, options = {}) {
    const startTime = performance.now();
    
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = options;

      const cacheKey = this.generateQueryCacheKey(query, options);
      
      // Try cache first for frequent queries
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const whereClause = this.buildWhereClause(query);
      
      const [logs, totalCount] = await Promise.all([
        this.prisma.auditLog.findMany({
          where: whereClause,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          select: this.getAuditLogSelectFields()
        }),
        this.prisma.auditLog.count({ where: whereClause })
      ]);

      const result = {
        logs,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        },
        query,
        timestamp: new Date()
      };

      // Cache frequent queries for 5 minutes
      if (this.isFrequentQuery(query)) {
        await this.redis.setex(cacheKey, 300, JSON.stringify(result));
      }

      const queryTime = performance.now() - startTime;
      this.emit('auditQueryExecuted', {
        query,
        resultCount: logs.length,
        queryTime
      });

      return result;

    } catch (error) {
      this.logger.error('Audit query failed', error, { query });
      throw error;
    }
  }

  /**
   * 🏗️ BUILD WHERE CLAUSE FOR QUERIES
   */
  buildWhereClause(query) {
    const where = {};

    if (query.eventType) {
      where.eventType = query.eventType;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    if (query.expertId) {
      where.expertId = query.expertId;
    }

    if (query.studentId) {
      where.studentId = query.studentId;
    }

    if (query.securityLevel) {
      where.securityLevel = query.securityLevel;
    }

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      
      if (query.startDate) {
        where.timestamp.gte = new Date(query.startDate);
      }
      
      if (query.endDate) {
        where.timestamp.lte = new Date(query.endDate);
      }
    }

    if (query.ipAddress) {
      where.ipAddress = query.ipAddress;
    }

    // Text search in description
    if (query.search) {
      where.description = {
        contains: query.search,
        mode: 'insensitive'
      };
    }

    return where;
  }

  /**
   * 📊 GET AUDIT STATISTICS
   */
  async getAuditStatistics(timeframe = '30d') {
    const cacheKey = `audit:stats:${timeframe}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const startDate = this.calculateStartDate(timeframe);
    
    const [
      totalEvents,
      eventsByType,
      eventsByCategory,
      securityLevelDistribution,
      topUsers,
      hourlyDistribution
    ] = await Promise.all([
      this.getTotalEvents(startDate),
      this.getEventsByType(startDate),
      this.getEventsByCategory(startDate),
      this.getSecurityLevelDistribution(startDate),
      this.getTopUsers(startDate),
      this.getHourlyDistribution(startDate)
    ]);

    const statistics = {
      timeframe,
      startDate,
      endDate: new Date(),
      totalEvents,
      eventsByType,
      eventsByCategory,
      securityLevelDistribution,
      topUsers,
      hourlyDistribution,
      generatedAt: new Date()
    };

    // Cache for 15 minutes
    await this.redis.setex(cacheKey, 900, JSON.stringify(statistics));

    return statistics;
  }

  /**
   * 📈 GET TOTAL EVENTS
   */
  async getTotalEvents(startDate) {
    return await this.prisma.auditLog.count({
      where: { timestamp: { gte: startDate } }
    });
  }

  /**
   * 📊 GET EVENTS BY TYPE
   */
  async getEventsByType(startDate) {
    const results = await this.prisma.auditLog.groupBy({
      by: ['eventType'],
      where: { timestamp: { gte: startDate } },
      _count: { id: true }
    });

    return results.reduce((acc, item) => {
      acc[item.eventType] = item._count.id;
      return acc;
    }, {});
  }

  /**
   * 🗂️ GET EVENTS BY CATEGORY
   */
  async getEventsByCategory(startDate) {
    const results = await this.prisma.auditLog.groupBy({
      by: ['category'],
      where: { timestamp: { gte: startDate } },
      _count: { id: true }
    });

    return results.reduce((acc, item) => {
      acc[item.category] = item._count.id;
      return acc;
    }, {});
  }

  /**
   * 🛡️ GET SECURITY LEVEL DISTRIBUTION
   */
  async getSecurityLevelDistribution(startDate) {
    const results = await this.prisma.auditLog.groupBy({
      by: ['securityLevel'],
      where: { timestamp: { gte: startDate } },
      _count: { id: true }
    });

    return results.reduce((acc, item) => {
      acc[item.securityLevel] = item._count.id;
      return acc;
    }, {});
  }

  /**
   * 👥 GET TOP USERS
   */
  async getTopUsers(startDate, limit = 10) {
    const results = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      where: { timestamp: { gte: startDate } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit
    });

    return results.map(item => ({
      userId: item.userId,
      eventCount: item._count.id
    }));
  }

  /**
   * 🕒 GET HOURLY DISTRIBUTION
   */
  async getHourlyDistribution(startDate) {
    // This would typically use database-specific date functions
    // For simplicity, we'll use a basic approach
    const results = await this.prisma.auditLog.findMany({
      where: { timestamp: { gte: startDate } },
      select: { timestamp: true }
    });

    const distribution = Array(24).fill(0);
    
    results.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      distribution[hour]++;
    });

    return distribution;
  }

  /**
   * 🔐 SECURITY AND COMPLIANCE METHODS
   */

  /**
   * 🕵️ DETECT SUSPICIOUS ACTIVITY
   */
  async detectSuspiciousActivity() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const suspiciousPatterns = await Promise.all([
      this.detectRapidSuccessionEvents(twentyFourHoursAgo),
      this.detectUnusualHoursActivity(twentyFourHoursAgo),
      this.detectMultipleFailedLogins(twentyFourHoursAgo),
      this.detectDataAccessPatterns(twentyFourHoursAgo)
    ]);

    const alerts = suspiciousPatterns.flat().filter(alert => alert !== null);

    if (alerts.length > 0) {
      this.emit('suspiciousActivityDetected', {
        alerts,
        timestamp: new Date()
      });
    }

    return alerts;
  }

  /**
   * ⚡ DETECT RAPID SUCCESSION EVENTS
   */
  async detectRapidSuccessionEvents(since) {
    const events = await this.prisma.auditLog.findMany({
      where: { 
        timestamp: { gte: since },
        eventType: { in: [this.eventTypes.USER_LOGIN, this.eventTypes.DATA_ACCESS] }
      },
      orderBy: { timestamp: 'asc' },
      select: { userId: true, timestamp: true, eventType: true }
    });

    const rapidEvents = [];
    const userEvents = {};

    events.forEach(event => {
      if (!userEvents[event.userId]) {
        userEvents[event.userId] = [];
      }
      userEvents[event.userId].push(event);
    });

    Object.entries(userEvents).forEach(([userId, events]) => {
      for (let i = 1; i < events.length; i++) {
        const timeDiff = events[i].timestamp - events[i-1].timestamp;
        if (timeDiff < 5000) { // 5 seconds
          rapidEvents.push({
            userId,
            eventType: events[i].eventType,
            timeDiff,
            severity: 'HIGH',
            description: 'Rapid succession of events detected'
          });
        }
      }
    });

    return rapidEvents;
  }

  /**
   * 🌙 DETECT UNUSUAL HOURS ACTIVITY
   */
  async detectUnusualHoursActivity(since) {
    const events = await this.prisma.auditLog.findMany({
      where: { 
        timestamp: { gte: since },
        securityLevel: { gte: this.config.securityLevels.HIGH }
      },
      select: { userId: true, timestamp: true, eventType: true }
    });

    const unusualActivity = [];

    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      if (hour < 6 || hour > 22) { // Activity between 10 PM and 6 AM
        unusualActivity.push({
          userId: event.userId,
          eventType: event.eventType,
          hour,
          severity: 'MEDIUM',
          description: 'Activity during unusual hours'
        });
      }
    });

    return unusualActivity;
  }

  /**
   * 🗑️ RETENTION MANAGEMENT
   */
  startRetentionManager() {
    // Run retention cleanup daily at 2 AM
    setInterval(async () => {
      try {
        await this.cleanupOldAuditLogs();
      } catch (error) {
        this.logger.error('Retention cleanup failed', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    this.logger.info('Retention manager started');
  }

  /**
   * 🧹 CLEANUP OLD AUDIT LOGS
   */
  async cleanupOldAuditLogs() {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.config.retentionPeriod);

    const startTime = performance.now();

    try {
      // Archive logs before deleting
      await this.archiveOldLogs(retentionDate);

      // Delete old logs
      const deleteResult = await this.prisma.auditLog.deleteMany({
        where: { timestamp: { lt: retentionDate } }
      });

      const processingTime = performance.now() - startTime;

      this.emit('auditLogsCleanedUp', {
        deletedCount: deleteResult.count,
        retentionDate,
        processingTime
      });

      this.logger.info('Old audit logs cleaned up', {
        deletedCount: deleteResult.count,
        retentionDate: retentionDate.toISOString(),
        processingTime: `${processingTime.toFixed(2)}ms`
      });

      return deleteResult;

    } catch (error) {
      this.logger.error('Failed to cleanup old audit logs', error);
      throw error;
    }
  }

  /**
   * 📚 ARCHIVE OLD LOGS
   */
  async archiveOldLogs(retentionDate) {
    // Implementation for archiving logs to cold storage
    // This could be AWS S3, Google Cloud Storage, etc.
    this.logger.info('Archiving old audit logs', { retentionDate: retentionDate.toISOString() });
    
    // Placeholder for archive implementation
    return true;
  }

  /**
   * 🔧 UTILITY METHODS
   */

  /**
   * 🆔 GENERATE LOG ID
   */
  generateLogId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `AUDIT_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * 🎯 GENERATE TRACE ID
   */
  generateTraceId() {
    return `TRACE_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`.toUpperCase();
  }

  /**
   * 🔏 GENERATE CHECKSUM
   */
  generateChecksum(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(16);
  }

  /**
   * 🌍 GET GEOLOCATION
   */
  async getGeolocation(ipAddress) {
    if (!ipAddress || ipAddress === '127.0.0.1') {
      return 'Local';
    }

    // Placeholder for geolocation service integration
    // In production, integrate with services like MaxMind, IP2Location, etc.
    try {
      // Mock implementation
      return 'Addis Ababa, Ethiopia';
    } catch (error) {
      this.logger.warn('Geolocation lookup failed', { ipAddress });
      return 'Unknown';
    }
  }

  /**
   * 🔒 GET CLIENT IP
   */
  async getClientIP() {
    // This would typically come from request context
    // For now, return a placeholder
    return '127.0.0.1';
  }

  /**
   * 🔑 GET CURRENT SESSION ID
   */
  async getCurrentSessionId() {
    // This would typically come from session context
    // For now, generate a mock session ID
    return `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  /**
   * 👮 CHECK IF ADMIN USER
   */
  async isAdminUser(userId) {
    // Placeholder for admin check
    // In production, integrate with your user management system
    return userId.startsWith('ADMIN_');
  }

  /**
   * 🗺️ CHECK LOCATION ANOMALY
   */
  async isLocationAnomaly(ipAddress) {
    // Placeholder for location anomaly detection
    // In production, implement based on user's usual locations
    return false;
  }

  /**
   * 📧 CHECK IF FREQUENT QUERY
   */
  isFrequentQuery(query) {
    const frequentPatterns = [
      { eventType: this.eventTypes.USER_LOGIN },
      { category: this.categories.SECURITY },
      { securityLevel: this.config.securityLevels.CRITICAL }
    ];

    return frequentPatterns.some(pattern => 
      Object.keys(pattern).every(key => query[key] === pattern[key])
    );
  }

  /**
   * 🔍 CHECK FOR SENSITIVE DATA
   */
  containsSensitiveData(metadata) {
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'];
    const metadataStr = JSON.stringify(metadata).toLowerCase();
    
    return sensitiveFields.some(field => metadataStr.includes(field));
  }

  /**
   * 🌐 VALIDATE IP ADDRESS
   */
  isValidIPAddress(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * 📅 CALCULATE START DATE
   */
  calculateStartDate(timeframe) {
    const now = new Date();
    
    switch (timeframe) {
      case '1d':
        return new Date(now.setDate(now.getDate() - 1));
      case '7d':
        return new Date(now.setDate(now.getDate() - 7));
      case '30d':
        return new Date(now.setDate(now.getDate() - 30));
      case '90d':
        return new Date(now.setDate(now.getDate() - 90));
      default:
        return new Date(now.setDate(now.getDate() - 30));
    }
  }

  /**
   * 🗂️ INITIALIZE AUDIT INDEXES
   */
  async initializeAuditIndexes() {
    try {
      // Create database indexes if they don't exist
      // This would typically be done via database migrations
      this.logger.info('Audit indexes initialized');
    } catch (error) {
      this.logger.error('Failed to initialize audit indexes', error);
    }
  }

  /**
   * 🎯 GET AUDIT LOG SELECT FIELDS
   */
  getAuditLogSelectFields() {
    return {
      id: true,
      logId: true,
      eventType: true,
      category: true,
      userId: true,
      expertId: true,
      studentId: true,
      action: true,
      description: true,
      securityLevel: true,
      timestamp: true,
      ipAddress: true,
      userAgent: true,
      metadata: true
    };
  }

  /**
   * 🔑 GENERATE QUERY CACHE KEY
   */
  generateQueryCacheKey(query, options) {
    const queryStr = JSON.stringify({ query, options });
    const hash = this.generateChecksum(queryStr);
    return `audit:query:${hash}`;
  }

  /**
   * 📦 GET CURRENT BATCH
   */
  getCurrentBatch() {
    return this.batchQueue.slice(0, this.config.batchSize);
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      // Process any remaining batch items
      if (this.batchQueue.length > 0) {
        await this.processBatch();
      }

      this.removeAllListeners();
      await this.redis.quit();
      await this.prisma.$disconnect();
      
      this.logger.info('Audit logger resources cleaned up');
    } catch (error) {
      this.logger.error('Error during audit logger cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new AuditLogger();