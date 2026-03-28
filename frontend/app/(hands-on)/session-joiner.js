// (hands-on)/session-joiner.js

/**
 * 🎯 ENTERPRISE SESSION JOINER
 * Production-ready session participation system for Mosa Forge
 * Features: Real-time joining, attendance verification, quality monitoring, expert matching
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../../utils/logger');
const { WebSocketServer } = require('ws');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const geoip = require('geoip-lite');

class SessionJoiner extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('SessionJoiner');
    this.activeSessions = new Map();
    this.connectionPool = new Map();

    // Rate limiting: max 5 join attempts per minute per student
    this.joinRateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (key) => `join_limit:${key}`,
      points: 5,
      duration: 60, // 1 minute
    });

    // WebSocket server for real-time communication
    this.wss = new WebSocketServer({ 
      port: process.env.WS_PORT || 8080,
      clientTracking: true
    });

    this.initializeWebSocket();
    this.initialize();
  }

  /**
   * Initialize session joiner system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.loadActiveSessions();
      this.startHealthChecks();
      this.logger.info('Session joiner initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize session joiner', error);
      throw error;
    }
  }

  /**
   * 🎯 JOIN SESSION - Core session joining with validation
   */
  async joinSession(joinData) {
    const startTime = performance.now();
    const sessionId = `join:${joinData.studentId}:${Date.now()}`;

    try {
      // 🛡️ PRE-JOIN VALIDATION
      await this.validateJoinAttempt(joinData);

      // 🔍 FRAUD & QUALITY CHECKS
      const riskAssessment = await this.assessJoinRisk(joinData);

      // 📊 SESSION CAPACITY CHECK
      await this.checkSessionCapacity(joinData.sessionId);

      // 🔐 ATTENDANCE VERIFICATION
      const verification = await this.verifyAttendance(joinData);

      // 💾 SESSION JOIN TRANSACTION
      const joinResult = await this.processSessionJoin(joinData, verification, riskAssessment);

      // 🔔 REAL-TIME NOTIFICATIONS
      await this.notifySessionParticipants(joinData.sessionId, joinData.studentId, 'joined');

      // 📈 METRICS & ANALYTICS
      await this.recordJoinMetrics(joinResult, startTime);

      this.logger.info('Student successfully joined session', {
        studentId: joinData.studentId,
        sessionId: joinData.sessionId,
        expertId: joinResult.expertId,
        processingTime: performance.now() - startTime
      });

      return {
        success: true,
        session: joinResult.session,
        student: joinResult.student,
        expert: joinResult.expert,
        joinToken: joinResult.joinToken,
        websocketUrl: this.getWebSocketUrl(joinData.sessionId),
        qualityMetrics: joinResult.qualityMetrics
      };

    } catch (error) {
      this.logger.error('Session join failed', error, { joinData, sessionId });
      
      // Emit failure event for monitoring
      this.emit('joinFailed', {
        joinData,
        error: error.message,
        sessionId,
        timestamp: new Date()
      });

      throw error;
    }
  }

  /**
   * 🛡️ COMPREHENSIVE JOIN VALIDATION
   */
  async validateJoinAttempt(joinData) {
    const {
      studentId,
      sessionId,
      enrollmentId,
      deviceInfo,
      locationData
    } = joinData;

    // Required fields validation
    if (!studentId || !sessionId || !enrollmentId) {
      throw new Error('MISSING_REQUIRED_FIELDS');
    }

    // Rate limiting check
    try {
      await this.joinRateLimiter.consume(`student:${studentId}`);
    } catch (rateLimitError) {
      throw new Error('JOIN_RATE_LIMIT_EXCEEDED');
    }

    // Session existence and status validation
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: {
        expert: true,
        enrollment: true
      }
    });

    if (!session) {
      throw new Error('SESSION_NOT_FOUND');
    }

    if (session.status !== 'SCHEDULED' && session.status !== 'ACTIVE') {
      throw new Error('SESSION_NOT_AVAILABLE');
    }

    // Enrollment validation
    if (session.enrollment.id !== enrollmentId) {
      throw new Error('ENROLLMENT_MISMATCH');
    }

    if (session.enrollment.studentId !== studentId) {
      throw new Error('STUDENT_NOT_ENROLLED');
    }

    // Session timing validation
    const now = new Date();
    const sessionStart = new Date(session.scheduledStart);
    const sessionEnd = new Date(session.scheduledEnd);

    // Allow joining 15 minutes before start and up to 30 minutes after start
    const joinWindowStart = new Date(sessionStart.getTime() - 15 * 60 * 1000);
    const joinWindowEnd = new Date(sessionStart.getTime() + 30 * 60 * 1000);

    if (now < joinWindowStart) {
      throw new Error('SESSION_JOIN_TOO_EARLY');
    }

    if (now > joinWindowEnd) {
      throw new Error('SESSION_JOIN_TOO_LATE');
    }

    // Device validation
    if (!deviceInfo || !deviceInfo.type) {
      throw new Error('DEVICE_INFO_REQUIRED');
    }

    this.logger.debug('Join validation passed', { studentId, sessionId });
  }

  /**
   * 🔍 RISK ASSESSMENT FOR SESSION JOIN
   */
  async assessJoinRisk(joinData) {
    const { studentId, sessionId, deviceInfo, locationData } = joinData;
    let riskScore = 0;
    const riskFactors = [];

    // Check for multiple device joins
    const deviceJoins = await this.redis.get(`student_devices:${studentId}`);
    if (deviceJoins) {
      const devices = JSON.parse(deviceJoins);
      if (!devices.includes(deviceInfo.fingerprint)) {
        riskScore += 0.2;
        riskFactors.push('NEW_DEVICE_DETECTED');
      }
    }

    // Geographic anomaly detection
    if (locationData && locationData.ip) {
      const geo = geoip.lookup(locationData.ip);
      const previousLocation = await this.redis.get(`student_location:${studentId}`);
      
      if (previousLocation && geo) {
        const prevGeo = JSON.parse(previousLocation);
        if (prevGeo.country !== geo.country) {
          riskScore += 0.3;
          riskFactors.push('GEOGRAPHIC_ANOMALY');
        }
      }
    }

    // Session hopping detection
    const recentJoins = await this.redis.lrange(`student_joins:${studentId}`, 0, 4);
    if (recentJoins.length >= 3) {
      const timeDiff = Date.now() - parseInt(recentJoins[0]);
      if (timeDiff < 300000) { // 5 minutes
        riskScore += 0.2;
        riskFactors.push('RAPID_SESSION_HOPPING');
      }
    }

    // Expert-student relationship check
    const expertComplaints = await this.prisma.qualityIncident.count({
      where: {
        studentId,
        expertId: joinData.expertId,
        status: 'RESOLVED'
      }
    });

    if (expertComplaints > 0) {
      riskScore += 0.3;
      riskFactors.push('PRIOR_COMPLAINTS');
    }

    return {
      riskScore: Math.min(riskScore, 1.0),
      riskFactors,
      allowed: riskScore < 0.7
    };
  }

  /**
   * 📊 SESSION CAPACITY MANAGEMENT
   */
  async checkSessionCapacity(sessionId) {
    const capacityKey = `session_capacity:${sessionId}`;
    
    // Get current session participants
    const currentParticipants = await this.redis.scard(capacityKey);
    
    // Get session capacity from database
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      select: { maxParticipants: true }
    });

    const maxParticipants = session.maxParticipants || 5; // Default to 5 students per session

    if (currentParticipants >= maxParticipants) {
      throw new Error('SESSION_FULL');
    }

    // Check expert capacity
    const expertCapacity = await this.checkExpertCapacity(sessionId);
    if (!expertCapacity.available) {
      throw new Error('EXPERT_AT_CAPACITY');
    }

    return {
      currentParticipants,
      maxParticipants,
      availableSpots: maxParticipants - currentParticipants
    };
  }

  /**
   * 👨‍🏫 EXPERT CAPACITY CHECK
   */
  async checkExpertCapacity(sessionId) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: { expert: true }
    });

    const expertActiveSessions = await this.prisma.trainingSession.count({
      where: {
        expertId: session.expertId,
        status: 'ACTIVE',
        scheduledStart: {
          lte: new Date()
        },
        scheduledEnd: {
          gte: new Date()
        }
      }
    });

    const maxConcurrentSessions = this.getExpertSessionCapacity(session.expert.currentTier);

    return {
      expertId: session.expertId,
      currentSessions: expertActiveSessions,
      maxSessions: maxConcurrentSessions,
      available: expertActiveSessions < maxConcurrentSessions
    };
  }

  /**
   * 🎯 EXPERT SESSION CAPACITY BY TIER
   */
  getExpertSessionCapacity(tier) {
    const capacityMap = {
      'MASTER': 3,    // Master experts can handle 3 concurrent sessions
      'SENIOR': 2,    // Senior experts can handle 2 concurrent sessions
      'STANDARD': 1,  // Standard experts handle 1 session at a time
      'DEVELOPING': 1,
      'PROBATION': 1
    };

    return capacityMap[tier] || 1;
  }

  /**
   * 🔐 ADVANCED ATTENDANCE VERIFICATION
   */
  async verifyAttendance(joinData) {
    const { studentId, sessionId, deviceInfo, biometricData } = joinData;

    const verificationMethods = [];
    let verificationScore = 0;

    // Method 1: Device fingerprinting
    if (deviceInfo.fingerprint) {
      verificationScore += 0.3;
      verificationMethods.push('DEVICE_FINGERPRINT');
    }

    // Method 2: IP Address validation
    if (joinData.locationData && joinData.locationData.ip) {
      verificationScore += 0.2;
      verificationMethods.push('IP_VALIDATION');
    }

    // Method 3: Biometric verification (if available)
    if (biometricData && biometricData.verified) {
      verificationScore += 0.5;
      verificationMethods.push('BIOMETRIC_VERIFICATION');
    }

    // Method 4: Previous session pattern
    const patternMatch = await this.verifyBehavioralPattern(studentId, joinData);
    if (patternMatch) {
      verificationScore += 0.2;
      verificationMethods.push('BEHAVIORAL_PATTERN');
    }

    return {
      verified: verificationScore >= 0.7,
      verificationScore,
      methods: verificationMethods,
      timestamp: new Date()
    };
  }

  /**
   * 🧠 BEHAVIORAL PATTERN VERIFICATION
   */
  async verifyBehavioralPattern(studentId, joinData) {
    const previousSessions = await this.prisma.trainingSession.findMany({
      where: {
        enrollment: { studentId },
        status: 'COMPLETED'
      },
      orderBy: { scheduledStart: 'desc' },
      take: 5,
      select: {
        deviceInfo: true,
        joinLocation: true
      }
    });

    if (previousSessions.length === 0) return true; // No previous data

    const currentDevice = joinData.deviceInfo.fingerprint;
    const currentLocation = joinData.locationData;

    let matches = 0;
    previousSessions.forEach(session => {
      if (session.deviceInfo?.fingerprint === currentDevice) matches++;
      if (session.joinLocation?.country === currentLocation?.country) matches++;
    });

    return matches >= previousSessions.length * 0.6; // 60% match threshold
  }

  /**
   * 💾 SESSION JOIN TRANSACTION PROCESSING
   */
  async processSessionJoin(joinData, verification, riskAssessment) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Update session participant count
      const updatedSession = await tx.trainingSession.update({
        where: { id: joinData.sessionId },
        data: {
          currentParticipants: { increment: 1 },
          status: 'ACTIVE', // Activate session if first participant
          participants: {
            push: {
              studentId: joinData.studentId,
              joinedAt: new Date(),
              verification: verification,
              riskAssessment: riskAssessment
            }
          }
        },
        include: {
          expert: {
            select: {
              id: true,
              name: true,
              currentTier: true,
              qualityScore: true
            }
          },
          enrollment: {
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  faydaId: true
                }
              }
            }
          }
        }
      });

      // 2. Create attendance record
      const attendance = await tx.attendance.create({
        data: {
          sessionId: joinData.sessionId,
          studentId: joinData.studentId,
          joinedAt: new Date(),
          verificationData: {
            methods: verification.methods,
            score: verification.verificationScore,
            deviceInfo: joinData.deviceInfo,
            locationData: joinData.locationData
          },
          riskData: riskAssessment,
          status: 'PRESENT'
        }
      });

      // 3. Generate join token for real-time communication
      const joinToken = this.generateJoinToken(joinData.sessionId, joinData.studentId);

      // 4. Update Redis for real-time tracking
      await this.updateSessionTracking(joinData.sessionId, joinData.studentId, joinToken);

      // 5. Calculate quality metrics
      const qualityMetrics = await this.calculateSessionQuality(updatedSession);

      return {
        session: updatedSession,
        student: updatedSession.enrollment.student,
        expert: updatedSession.expert,
        attendance,
        joinToken,
        qualityMetrics
      };
    }, {
      maxWait: 5000,
      timeout: 10000,
      isolationLevel: 'ReadCommitted'
    });
  }

  /**
   * 🔑 GENERATE SECURE JOIN TOKEN
   */
  generateJoinToken(sessionId, studentId) {
    const tokenData = {
      sessionId,
      studentId,
      issuedAt: Date.now(),
      expiresAt: Date.now() + (4 * 60 * 60 * 1000), // 4 hours
      tokenId: require('crypto').randomBytes(16).toString('hex')
    };

    const token = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    
    // Store token in Redis for validation
    this.redis.setex(`join_token:${token}`, 4 * 60 * 60, JSON.stringify(tokenData));

    return token;
  }

  /**
   * 📍 UPDATE REAL-TIME SESSION TRACKING
   */
  async updateSessionTracking(sessionId, studentId, joinToken) {
    const pipeline = this.redis.pipeline();

    // Add student to session participants set
    pipeline.sadd(`session_participants:${sessionId}`, studentId);

    // Store student session mapping
    pipeline.setex(`student_session:${studentId}`, 4 * 60 * 60, sessionId);

    // Update session activity timestamp
    pipeline.zadd('active_sessions', Date.now(), sessionId);

    // Record join for analytics
    pipeline.lpush(`student_joins:${studentId}`, Date.now());
    pipeline.ltrim(`student_joins:${studentId}`, 0, 9); // Keep last 10 joins

    await pipeline.exec();

    // Update in-memory tracking
    if (!this.activeSessions.has(sessionId)) {
      this.activeSessions.set(sessionId, new Set());
    }
    this.activeSessions.get(sessionId).add(studentId);
  }

  /**
   * 🔔 NOTIFY SESSION PARTICIPANTS
   */
  async notifySessionParticipants(sessionId, studentId, action) {
    const notification = {
      type: 'PARTICIPANT_JOINED',
      sessionId,
      studentId,
      action,
      timestamp: new Date().toISOString(),
      participantCount: await this.redis.scard(`session_participants:${sessionId}`)
    };

    // Notify expert
    this.emit('expertNotification', {
      expertId: await this.getSessionExpert(sessionId),
      notification
    });

    // Notify other participants via WebSocket
    this.broadcastToSession(sessionId, notification);

    this.logger.debug('Session participants notified', notification);
  }

  /**
   * 📈 RECORD JOIN METRICS FOR ANALYTICS
   */
  async recordJoinMetrics(joinResult, startTime) {
    const processingTime = performance.now() - startTime;

    const metrics = {
      sessionId: joinResult.session.id,
      studentId: joinResult.student.id,
      expertId: joinResult.expert.id,
      joinTime: new Date(),
      processingTime,
      verificationScore: joinResult.attendance.verificationData.score,
      riskScore: joinResult.attendance.riskData.riskScore,
      deviceType: joinResult.attendance.verificationData.deviceInfo.type
    };

    // Store in Redis for real-time analytics
    await this.redis.lpush('join_metrics', JSON.stringify(metrics));
    await this.redis.ltrim('join_metrics', 0, 999); // Keep last 1000 metrics

    // Emit metrics event
    this.emit('joinMetrics', metrics);

    this.logger.metric('session_join_processing_time', processingTime, {
      sessionId: joinResult.session.id,
      expertTier: joinResult.expert.currentTier
    });
  }

  /**
   * 🌐 WEB SOCKET INITIALIZATION
   */
  initializeWebSocket() {
    this.wss.on('connection', (ws, request) => {
      const token = new URL(request.url, `http://${request.headers.host}`).searchParams.get('token');
      
      try {
        const tokenData = this.validateJoinToken(token);
        if (!tokenData) {
          ws.close(1008, 'Invalid token');
          return;
        }

        // Store connection
        const connectionId = `${tokenData.sessionId}:${tokenData.studentId}`;
        this.connectionPool.set(connectionId, ws);

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'CONNECTED',
          sessionId: tokenData.sessionId,
          studentId: tokenData.studentId,
          timestamp: new Date().toISOString()
        }));

        ws.on('message', (data) => this.handleWebSocketMessage(ws, tokenData, data));
        ws.on('close', () => this.handleWebSocketClose(connectionId));
        ws.on('error', (error) => this.handleWebSocketError(connectionId, error));

      } catch (error) {
        this.logger.error('WebSocket connection failed', error);
        ws.close(1011, 'Internal error');
      }
    });
  }

  /**
   * 🔑 VALIDATE JOIN TOKEN
   */
  validateJoinToken(token) {
    try {
      const tokenKey = `join_token:${token}`;
      const tokenData = this.redis.get(tokenKey);
      
      if (!tokenData) return null;

      const parsed = JSON.parse(tokenData);
      if (parsed.expiresAt < Date.now()) {
        this.redis.del(tokenKey);
        return null;
      }

      return parsed;
    } catch (error) {
      this.logger.error('Token validation failed', error);
      return null;
    }
  }

  /**
   * 💬 HANDLE WEB SOCKET MESSAGES
   */
  async handleWebSocketMessage(ws, tokenData, data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'HEARTBEAT':
          ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK', timestamp: Date.now() }));
          break;
        
        case 'SESSION_ACTION':
          await this.handleSessionAction(tokenData, message);
          break;
        
        case 'QUALITY_FEEDBACK':
          await this.handleQualityFeedback(tokenData, message);
          break;
        
        default:
          this.logger.warn('Unknown WebSocket message type', { type: message.type });
      }
    } catch (error) {
      this.logger.error('WebSocket message handling failed', error);
    }
  }

  /**
   * 🎯 HANDLE SESSION ACTIONS
   */
  async handleSessionAction(tokenData, message) {
    const { sessionId, studentId } = tokenData;
    
    // Broadcast action to other participants
    this.broadcastToSession(sessionId, {
      type: 'SESSION_ACTION',
      studentId,
      action: message.action,
      data: message.data,
      timestamp: new Date().toISOString()
    });

    // Record action for quality metrics
    await this.recordSessionAction(sessionId, studentId, message.action);
  }

  /**
   * 📊 HANDLE QUALITY FEEDBACK
   */
  async handleQualityFeedback(tokenData, message) {
    const { sessionId, studentId } = tokenData;
    
    // Store quality feedback
    await this.redis.lpush(`quality_feedback:${sessionId}`, JSON.stringify({
      studentId,
      feedback: message.feedback,
      rating: message.rating,
      timestamp: new Date()
    }));

    // Notify expert in real-time
    this.emit('qualityFeedback', {
      sessionId,
      studentId,
      feedback: message.feedback,
      rating: message.rating
    });
  }

  /**
   * 📡 BROADCAST TO SESSION PARTICIPANTS
   */
  broadcastToSession(sessionId, message) {
    const participants = this.activeSessions.get(sessionId);
    if (!participants) return;

    participants.forEach(studentId => {
      const connectionId = `${sessionId}:${studentId}`;
      const ws = this.connectionPool.get(connectionId);
      if (ws && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  /**
   * 🏥 HEALTH CHECKS FOR ACTIVE SESSIONS
   */
  startHealthChecks() {
    setInterval(() => {
      this.checkActiveSessionsHealth();
    }, 30000); // Every 30 seconds
  }

  /**
   * ❤️ ACTIVE SESSIONS HEALTH CHECK
   */
  async checkActiveSessionsHealth() {
    const now = Date.now();
    const activeSessionIds = await this.redis.zrangebyscore('active_sessions', now - 300000, now);

    for (const sessionId of activeSessionIds) {
      const participantCount = await this.redis.scard(`session_participants:${sessionId}`);
      const lastActivity = await this.redis.zscore('active_sessions', sessionId);

      if (now - lastActivity > 600000) { // 10 minutes no activity
        await this.handleInactiveSession(sessionId);
      }

      // Update session metrics
      this.emit('sessionHealth', {
        sessionId,
        participantCount,
        lastActivity: new Date(parseInt(lastActivity)),
        health: 'HEALTHY'
      });
    }
  }

  /**
   * 🚨 HANDLE INACTIVE SESSION
   */
  async handleInactiveSession(sessionId) {
    this.logger.warn('Session inactive for too long', { sessionId });
    
    // Notify expert and participants
    this.broadcastToSession(sessionId, {
      type: 'SESSION_INACTIVE_WARNING',
      sessionId,
      timestamp: new Date().toISOString()
    });

    // Update session status
    await this.prisma.trainingSession.update({
      where: { id: sessionId },
      data: { status: 'INACTIVE' }
    });
  }

  /**
   * 📥 LOAD ACTIVE SESSIONS ON STARTUP
   */
  async loadActiveSessions() {
    const activeSessions = await this.prisma.trainingSession.findMany({
      where: {
        status: 'ACTIVE',
        scheduledEnd: {
          gt: new Date()
        }
      },
      select: {
        id: true,
        participants: true
      }
    });

    for (const session of activeSessions) {
      const participantSet = new Set();
      session.participants.forEach(p => participantSet.add(p.studentId));
      this.activeSessions.set(session.id, participantSet);
    }

    this.logger.info(`Loaded ${activeSessions.length} active sessions`);
  }

  /**
   * 🧮 CALCULATE SESSION QUALITY METRICS
   */
  async calculateSessionQuality(session) {
    const expert = await this.prisma.expert.findUnique({
      where: { id: session.expertId },
      select: {
        qualityScore: true,
        currentTier: true,
        completionRate: true
      }
    });

    const participantCount = session.currentParticipants;
    const idealParticipantCount = 5; // Mosa Forge standard

    const qualityScore = Math.min(
      expert.qualityScore * 
      (participantCount / idealParticipantCount) * 
      (expert.completionRate / 100),
      5.0
    );

    return {
      qualityScore: parseFloat(qualityScore.toFixed(2)),
      participantEfficiency: participantCount / idealParticipantCount,
      expertContribution: expert.qualityScore,
      timestamp: new Date()
    };
  }

  /**
   * 🔄 GET SESSION EXPERT
   */
  async getSessionExpert(sessionId) {
    const session = await this.prisma.trainingSession.findUnique({
      where: { id: sessionId },
      select: { expertId: true }
    });

    return session?.expertId;
  }

  /**
   * 🌐 GET WEB SOCKET URL
   */
  getWebSocketUrl(sessionId) {
    return `wss://${process.env.WS_HOST || 'localhost'}:${process.env.WS_PORT || 8080}/session?token=`;
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      this.wss.close();
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.activeSessions.clear();
      this.connectionPool.clear();
      this.removeAllListeners();
      this.logger.info('Session joiner resources cleaned up');
    } catch (error) {
      this.logger.error('Error during cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new SessionJoiner();