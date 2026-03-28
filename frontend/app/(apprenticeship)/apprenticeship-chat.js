/**
 * 🎯 MOSA FORGE: Enterprise Apprenticeship Chat Service
 * 
 * @module ApprenticeshipChat
 * @description Real-time communication between experts and apprentices with quality monitoring
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time messaging with WebSocket/Socket.IO
 * - Message persistence and delivery guarantees
 * - Quality monitoring and content filtering
 * - File sharing with validation
 * - Progress tracking integration
 * - Expert performance analytics
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const WebSocket = require('ws');
const { performance } = require('perf_hooks');

// 🏗️ Enterprise Constants
const MESSAGE_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  SYSTEM: 'system',
  PROGRESS_UPDATE: 'progress_update',
  QUALITY_ALERT: 'quality_alert',
  EXPERT_TIP: 'expert_tip'
};

const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

const CHAT_ROLES = {
  EXPERT: 'expert',
  APPRENTICE: 'apprentice',
  SYSTEM: 'system',
  QUALITY_BOT: 'quality_bot'
};

const QUALITY_THRESHOLDS = {
  RESPONSE_TIME: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  MIN_MESSAGES_PER_WEEK: 10,
  MAX_MESSAGE_LENGTH: 2000,
  FILE_SIZE_LIMIT: 10 * 1024 * 1024 // 10MB
};

/**
 * 🏗️ Enterprise Apprenticeship Chat Class
 * @class ApprenticeshipChat
 * @extends EventEmitter
 */
class ApprenticeshipChat extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 🏗️ Enterprise Configuration
    this.config = {
      redis: options.redis || {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      },
      prisma: options.prisma || new PrismaClient(),
      websocket: options.websocket || {
        port: process.env.WS_PORT || 8080,
        path: '/apprenticeship-chat'
      },
      maxConnections: options.maxConnections || 10000,
      messageRetention: options.messageRetention || 90, // days
      qualityCheckInterval: options.qualityCheckInterval || 300000 // 5 minutes
    };

    // 🏗️ Service Dependencies
    this.redis = new Redis(this.config.redis);
    this.prisma = this.config.prisma;
    this.clients = new Map(); // Active WebSocket connections
    this.rooms = new Map(); // Chat rooms by apprenticeshipId
    
    // 🏗️ Performance Monitoring
    this.metrics = {
      activeConnections: 0,
      messagesSent: 0,
      messagesDelivered: 0,
      messagesFailed: 0,
      averageResponseTime: 0,
      qualityAlerts: 0
    };

    // 🏗️ Quality Monitoring
    this.qualityMonitor = {
      expertResponseTimes: new Map(),
      messageQualityScores: new Map(),
      activityLevels: new Map()
    };

    this._initializeWebSocketServer();
    this._initializeEventHandlers();
    this._startQualityMonitoring();
    this._startHealthChecks();
  }

  /**
   * 🏗️ Initialize WebSocket Server
   * @private
   */
  _initializeWebSocketServer() {
    this.wss = new WebSocket.Server({
      port: this.config.websocket.port,
      path: this.config.websocket.path
    });

    this.wss.on('connection', (ws, request) => {
      this._handleConnection(ws, request);
    });

    this.wss.on('error', (error) => {
      this._logError('WEBSOCKET_SERVER_ERROR', error);
    });

    this._logSuccess('WEBSOCKET_SERVER_STARTED', {
      port: this.config.websocket.port,
      path: this.config.websocket.path
    });
  }

  /**
   * 🏗️ Handle New WebSocket Connection
   * @private
   */
  async _handleConnection(ws, request) {
    const connectionId = uuidv4();
    const startTime = performance.now();

    try {
      // 🏗️ Authentication and Authorization
      const authToken = request.headers['authorization']?.replace('Bearer ', '');
      if (!authToken) {
        throw new Error('Authentication token required');
      }

      const user = await this._authenticateUser(authToken);
      if (!user) {
        throw new Error('Invalid authentication token');
      }

      // 🏗️ Validate Apprenticeship Access
      const apprenticeshipId = request.headers['x-apprenticeship-id'];
      if (!apprenticeshipId) {
        throw new Error('Apprenticeship ID required');
      }

      const hasAccess = await this._validateApprenticeshipAccess(user.id, apprenticeshipId, user.role);
      if (!hasAccess) {
        throw new Error('Access denied to apprenticeship');
      }

      // 🏗️ Store Connection
      const connection = {
        id: connectionId,
        ws,
        user: {
          id: user.id,
          role: user.role,
          name: user.name
        },
        apprenticeshipId,
        connectedAt: new Date(),
        lastActivity: new Date()
      };

      this.clients.set(connectionId, connection);
      this._joinRoom(connectionId, apprenticeshipId);

      this.metrics.activeConnections = this.clients.size;

      // 🏗️ Send Connection Success
      this._sendToConnection(connectionId, {
        type: 'connection_established',
        connectionId,
        user: connection.user,
        timestamp: new Date().toISOString()
      });

      // 🏗️ Send Recent Messages
      await this._sendRecentMessages(connectionId, apprenticeshipId);

      const connectionTime = performance.now() - startTime;
      this._logSuccess('CLIENT_CONNECTED', {
        connectionId,
        userId: user.id,
        userRole: user.role,
        apprenticeshipId,
        connectionTime
      });

      // 🏗️ Setup Message Handlers
      ws.on('message', (data) => this._handleMessage(connectionId, data));
      ws.on('close', () => this._handleDisconnection(connectionId));
      ws.on('error', (error) => this._handleConnectionError(connectionId, error));

      this.emit('client.connected', connection);

    } catch (error) {
      this._handleConnectionError(connectionId, error);
      ws.close(1008, error.message); // Policy Violation
    }
  }

  /**
   * 🏗️ Authenticate User
   * @private
   */
  async _authenticateUser(token) {
    // In production, this would verify JWT token
    try {
      // Mock authentication - replace with actual JWT verification
      const user = await this.prisma.user.findFirst({
        where: {
          authTokens: {
            some: {
              token: token,
              expiresAt: { gt: new Date() }
            }
          }
        },
        select: {
          id: true,
          role: true,
          name: true,
          email: true
        }
      });

      return user;
    } catch (error) {
      this._logError('AUTHENTICATION_FAILED', error);
      return null;
    }
  }

  /**
   * 🏗️ Validate Apprenticeship Access
   * @private
   */
  async _validateApprenticeshipAccess(userId, apprenticeshipId, role) {
    try {
      const apprenticeship = await this.prisma.apprenticeship.findUnique({
        where: { id: apprenticeshipId },
        include: {
          expert: true,
          student: true
        }
      });

      if (!apprenticeship) {
        return false;
      }

      // Check if user is either expert or student in this apprenticeship
      if (role === CHAT_ROLES.EXPERT && apprenticeship.expertId === userId) {
        return true;
      }

      if (role === CHAT_ROLES.APPRENTICE && apprenticeship.studentId === userId) {
        return true;
      }

      // System and quality bot roles have access to all chats
      if (role === CHAT_ROLES.SYSTEM || role === CHAT_ROLES.QUALITY_BOT) {
        return true;
      }

      return false;
    } catch (error) {
      this._logError('ACCESS_VALIDATION_FAILED', error);
      return false;
    }
  }

  /**
   * 🏗️ Join Chat Room
   * @private
   */
  _joinRoom(connectionId, apprenticeshipId) {
    if (!this.rooms.has(apprenticeshipId)) {
      this.rooms.set(apprenticeshipId, new Set());
    }
    
    this.rooms.get(apprenticeshipId).add(connectionId);
    
    this._logSuccess('CLIENT_JOINED_ROOM', {
      connectionId,
      apprenticeshipId,
      roomSize: this.rooms.get(apprenticeshipId).size
    });
  }

  /**
   * 🏗️ Handle Incoming Messages
   * @private
   */
  async _handleMessage(connectionId, rawData) {
    const startTime = performance.now();
    
    try {
      const message = JSON.parse(rawData);
      const connection = this.clients.get(connectionId);

      if (!connection) {
        throw new Error('Connection not found');
      }

      // 🏗️ Update Last Activity
      connection.lastActivity = new Date();

      // 🏗️ Validate Message Structure
      this._validateMessageStructure(message);

      // 🏗️ Check Message Rate Limiting
      await this._checkRateLimit(connectionId, connection.user.id);

      // 🏗️ Process Based on Message Type
      switch (message.type) {
        case MESSAGE_TYPES.TEXT:
          await this._handleTextMessage(connection, message);
          break;
        
        case MESSAGE_TYPES.FILE:
          await this._handleFileMessage(connection, message);
          break;
        
        case MESSAGE_TYPES.PROGRESS_UPDATE:
          await this._handleProgressUpdate(connection, message);
          break;
        
        default:
          throw new Error(`Unsupported message type: ${message.type}`);
      }

      const processingTime = performance.now() - startTime;
      this.metrics.messagesSent++;

      this._logSuccess('MESSAGE_PROCESSED', {
        connectionId,
        messageId: message.id,
        type: message.type,
        processingTime
      });

    } catch (error) {
      this._handleMessageError(connectionId, error, rawData);
    }
  }

  /**
   * 🏗️ Handle Text Messages
   * @private
   */
  async _handleTextMessage(connection, message) {
    // 🏗️ Content Quality Check
    const qualityScore = await this._checkMessageQuality(message.content, connection.user.role);
    
    if (qualityScore < 0.5) {
      await this._handleLowQualityMessage(connection, message, qualityScore);
      return;
    }

    // 🏗️ Create Message Record
    const messageRecord = await this.prisma.chatMessage.create({
      data: {
        id: message.id || uuidv4(),
        apprenticeshipId: connection.apprenticeshipId,
        senderId: connection.user.id,
        senderRole: connection.user.role,
        type: MESSAGE_TYPES.TEXT,
        content: message.content,
        qualityScore,
        metadata: {
          timestamp: message.timestamp,
          replyTo: message.replyTo,
          mentions: message.mentions
        },
        status: MESSAGE_STATUS.SENT
      }
    });

    // 🏗️ Update Expert Response Time
    if (connection.user.role === CHAT_ROLES.EXPERT) {
      await this._updateExpertResponseTime(connection.apprenticeshipId, connection.user.id);
    }

    // 🏗️ Broadcast to Room
    await this._broadcastToRoom(connection.apprenticeshipId, {
      type: 'message',
      data: {
        ...messageRecord,
        sender: {
          id: connection.user.id,
          name: connection.user.name,
          role: connection.user.role
        }
      }
    });

    // 🏗️ Update Metrics
    this.metrics.messagesDelivered++;

    this.emit('message.sent', {
      messageId: messageRecord.id,
      apprenticeshipId: connection.apprenticeshipId,
      senderId: connection.user.id,
      senderRole: connection.user.role,
      qualityScore
    });
  }

  /**
   * 🏗️ Handle File Messages
   * @private
   */
  async _handleFileMessage(connection, message) {
    // 🏗️ Validate File
    await this._validateFileMessage(message);

    // 🏗️ Store File Metadata
    const fileRecord = await this.prisma.chatFile.create({
      data: {
        id: uuidv4(),
        apprenticeshipId: connection.apprenticeshipId,
        uploaderId: connection.user.id,
        uploaderRole: connection.user.role,
        filename: message.filename,
        fileType: message.fileType,
        fileSize: message.fileSize,
        storagePath: message.storagePath,
        mimeType: message.mimeType,
        metadata: {
          originalName: message.originalName,
          description: message.description
        }
      }
    });

    // 🏗️ Create Message Record
    const messageRecord = await this.prisma.chatMessage.create({
      data: {
        id: message.id || uuidv4(),
        apprenticeshipId: connection.apprenticeshipId,
        senderId: connection.user.id,
        senderRole: connection.user.role,
        type: MESSAGE_TYPES.FILE,
        content: JSON.stringify({
          fileId: fileRecord.id,
          filename: fileRecord.filename,
          description: message.description
        }),
        metadata: {
          fileRecord: fileRecord.id,
          timestamp: message.timestamp
        },
        status: MESSAGE_STATUS.SENT
      }
    });

    // 🏗️ Broadcast to Room
    await this._broadcastToRoom(connection.apprenticeshipId, {
      type: 'file_message',
      data: {
        ...messageRecord,
        file: fileRecord,
        sender: {
          id: connection.user.id,
          name: connection.user.name,
          role: connection.user.role
        }
      }
    });

    this.emit('file.uploaded', {
      fileId: fileRecord.id,
      messageId: messageRecord.id,
      apprenticeshipId: connection.apprenticeshipId,
      uploaderId: connection.user.id
    });
  }

  /**
   * 🏗️ Handle Progress Updates
   * @private
   */
  async _handleProgressUpdate(connection, message) {
    // 🏗️ Only experts can send progress updates
    if (connection.user.role !== CHAT_ROLES.EXPERT) {
      throw new Error('Only experts can send progress updates');
    }

    // 🏗️ Validate Progress Data
    await this._validateProgressData(message.progressData);

    // 🏗️ Update Progress in Database
    const progressUpdate = await this.prisma.progressUpdate.create({
      data: {
        id: uuidv4(),
        apprenticeshipId: connection.apprenticeshipId,
        expertId: connection.user.id,
        progressData: message.progressData,
        week: message.week,
        phase: message.phase,
        metrics: message.metrics
      }
    });

    // 🏗️ Create System Message
    const systemMessage = await this.prisma.chatMessage.create({
      data: {
        id: uuidv4(),
        apprenticeshipId: connection.apprenticeshipId,
        senderId: connection.user.id,
        senderRole: CHAT_ROLES.SYSTEM,
        type: MESSAGE_TYPES.PROGRESS_UPDATE,
        content: `Progress updated for week ${message.week}, phase: ${message.phase}`,
        metadata: {
          progressUpdateId: progressUpdate.id,
          progressData: message.progressData
        },
        status: MESSAGE_STATUS.SENT
      }
    });

    // 🏗️ Broadcast Progress Update
    await this._broadcastToRoom(connection.apprenticeshipId, {
      type: 'progress_update',
      data: {
        progressUpdate,
        systemMessage,
        expert: {
          id: connection.user.id,
          name: connection.user.name
        }
      }
    });

    this.emit('progress.updated', {
      progressUpdateId: progressUpdate.id,
      apprenticeshipId: connection.apprenticeshipId,
      expertId: connection.user.id,
      week: message.week,
      phase: message.phase
    });
  }

  /**
   * 🏗️ Check Message Quality
   * @private
   */
  async _checkMessageQuality(content, senderRole) {
    let qualityScore = 1.0;

    // 🏗️ Length Check
    if (content.length > QUALITY_THRESHOLDS.MAX_MESSAGE_LENGTH) {
      qualityScore -= 0.2;
    }

    // 🏗️ Profanity Filter (Basic implementation)
    const profanityWords = ['badword1', 'badword2']; // Expand this list
    const hasProfanity = profanityWords.some(word => 
      content.toLowerCase().includes(word)
    );
    
    if (hasProfanity) {
      qualityScore -= 0.5;
    }

    // 🏗️ Spam Detection
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters
      /[A-Z]{10,}/, // ALL CAPS
      /http[s]?:\/\/[^\s]+/g // URLs (might be legitimate in some contexts)
    ];

    const spamScore = spamPatterns.reduce((score, pattern) => {
      return score + (pattern.test(content) ? 0.2 : 0);
    }, 0);

    qualityScore -= spamScore;

    // 🏗️ Expert-specific quality checks
    if (senderRole === CHAT_ROLES.EXPERT) {
      // Check for helpfulness indicators
      const helpfulIndicators = [
        'how to', 'you should', 'try this', 'good job', 'well done'
      ];
      
      const helpfulScore = helpfulIndicators.reduce((score, indicator) => {
        return score + (content.toLowerCase().includes(indicator) ? 0.1 : 0);
      }, 0);

      qualityScore += Math.min(helpfulScore, 0.3);
    }

    return Math.max(0, Math.min(1, qualityScore));
  }

  /**
   * 🏗️ Handle Low Quality Messages
   * @private
   */
  async _handleLowQualityMessage(connection, message, qualityScore) {
    // 🏗️ Create Quality Alert
    const alertMessage = await this.prisma.chatMessage.create({
      data: {
        id: uuidv4(),
        apprenticeshipId: connection.apprenticeshipId,
        senderId: 'system', // System-generated
        senderRole: CHAT_ROLES.QUALITY_BOT,
        type: MESSAGE_TYPES.QUALITY_ALERT,
        content: 'Your message was flagged for quality review. Please ensure professional communication.',
        metadata: {
          originalMessageId: message.id,
          qualityScore,
          reason: 'Low quality content detected'
        },
        status: MESSAGE_STATUS.SENT
      }
    });

    // 🏗️ Notify Expert (if apprentice sent low quality message)
    if (connection.user.role === CHAT_ROLES.APPRENTICE) {
      await this._notifyExpertOfQualityIssue(connection.apprenticeshipId, message, qualityScore);
    }

    // 🏗️ Broadcast Alert
    await this._broadcastToRoom(connection.apprenticeshipId, {
      type: 'quality_alert',
      data: alertMessage
    });

    this.metrics.qualityAlerts++;

    this.emit('quality.alert', {
      apprenticeshipId: connection.apprenticeshipId,
      userId: connection.user.id,
      userRole: connection.user.role,
      qualityScore,
      messageId: message.id
    });
  }

  /**
   * 🏗️ Update Expert Response Time
   * @private
   */
  async _updateExpertResponseTime(apprenticeshipId, expertId) {
    const lastApprenticeMessage = await this.prisma.chatMessage.findFirst({
      where: {
        apprenticeshipId,
        senderRole: CHAT_ROLES.APPRENTICE
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (lastApprenticeMessage) {
      const responseTime = Date.now() - new Date(lastApprenticeMessage.createdAt).getTime();
      
      // Store response time for quality metrics
      await this.redis.hset(
        `expert:${expertId}:response_times`,
        apprenticeshipId,
        responseTime
      );

      // Update average response time metric
      this.metrics.averageResponseTime = 
        (this.metrics.averageResponseTime * this.metrics.messagesDelivered + responseTime) / 
        (this.metrics.messagesDelivered + 1);
    }
  }

  /**
   * 🏗️ Broadcast to Room
   * @private
   */
  async _broadcastToRoom(apprenticeshipId, message) {
    const room = this.rooms.get(apprenticeshipId);
    
    if (!room) {
      return;
    }

    const broadcastPromises = [];
    
    for (const connectionId of room) {
      broadcastPromises.push(
        this._sendToConnection(connectionId, message)
      );
    }

    await Promise.allSettled(broadcastPromises);
  }

  /**
   * 🏗️ Send to Specific Connection
   * @private
   */
  async _sendToConnection(connectionId, message) {
    try {
      const connection = this.clients.get(connectionId);
      
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
        return true;
      }
      
      return false;
    } catch (error) {
      this._logError('SEND_MESSAGE_FAILED', error, { connectionId });
      return false;
    }
  }

  /**
   * 🏗️ Send Recent Messages to New Connection
   * @private
   */
  async _sendRecentMessages(connectionId, apprenticeshipId) {
    try {
      const recentMessages = await this.prisma.chatMessage.findMany({
        where: {
          apprenticeshipId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: 100 // Last 100 messages
      });

      await this._sendToConnection(connectionId, {
        type: 'recent_messages',
        data: recentMessages
      });

    } catch (error) {
      this._logError('SEND_RECENT_MESSAGES_FAILED', error, { connectionId, apprenticeshipId });
    }
  }

  /**
   * 🏗️ Handle Disconnection
   * @private
   */
  async _handleDisconnection(connectionId) {
    const connection = this.clients.get(connectionId);
    
    if (connection) {
      // Remove from room
      const room = this.rooms.get(connection.apprenticeshipId);
      if (room) {
        room.delete(connectionId);
        if (room.size === 0) {
          this.rooms.delete(connection.apprenticeshipId);
        }
      }

      // Remove from clients
      this.clients.delete(connectionId);
      this.metrics.activeConnections = this.clients.size;

      this._logSuccess('CLIENT_DISCONNECTED', {
        connectionId,
        userId: connection.user.id,
        userRole: connection.user.role,
        apprenticeshipId: connection.apprenticeshipId,
        duration: Date.now() - connection.connectedAt
      });

      this.emit('client.disconnected', connection);
    }
  }

  /**
   * 🏗️ Handle Connection Errors
   * @private
   */
  _handleConnectionError(connectionId, error) {
    this._logError('CONNECTION_ERROR', error, { connectionId });
    this._handleDisconnection(connectionId);
  }

  /**
   * 🏗️ Handle Message Errors
   * @private
   */
  _handleMessageError(connectionId, error, rawData) {
    this.metrics.messagesFailed++;
    
    this._logError('MESSAGE_PROCESSING_ERROR', error, {
      connectionId,
      rawData: rawData?.toString().substring(0, 200) // Log first 200 chars
    });

    // Send error back to client
    this._sendToConnection(connectionId, {
      type: 'error',
      error: {
        message: error.message,
        code: 'MESSAGE_PROCESSING_FAILED'
      }
    });
  }

  /**
   * 🏗️ Validate Message Structure
   * @private
   */
  _validateMessageStructure(message) {
    if (!message.type) {
      throw new Error('Message type is required');
    }

    if (!message.content && message.type === MESSAGE_TYPES.TEXT) {
      throw new Error('Message content is required for text messages');
    }

    if (message.content && typeof message.content !== 'string') {
      throw new Error('Message content must be a string');
    }

    if (message.content && message.content.length > QUALITY_THRESHOLDS.MAX_MESSAGE_LENGTH) {
      throw new Error(`Message too long. Maximum length is ${QUALITY_THRESHOLDS.MAX_MESSAGE_LENGTH} characters`);
    }
  }

  /**
   * 🏗️ Validate File Message
   * @private
   */
  async _validateFileMessage(message) {
    if (!message.filename) {
      throw new Error('Filename is required for file messages');
    }

    if (!message.fileSize) {
      throw new Error('File size is required');
    }

    if (message.fileSize > QUALITY_THRESHOLDS.FILE_SIZE_LIMIT) {
      throw new Error(`File size exceeds limit of ${QUALITY_THRESHOLDS.FILE_SIZE_LIMIT} bytes`);
    }

    if (!message.storagePath) {
      throw new Error('Storage path is required');
    }

    // Check if file type is allowed
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
    if (message.mimeType && !allowedTypes.includes(message.mimeType)) {
      throw new Error('File type not allowed');
    }
  }

  /**
   * 🏗️ Validate Progress Data
   * @private
   */
  async _validateProgressData(progressData) {
    if (!progressData || typeof progressData !== 'object') {
      throw new Error('Progress data must be an object');
    }

    if (progressData.percentage !== undefined) {
      if (typeof progressData.percentage !== 'number' || 
          progressData.percentage < 0 || 
          progressData.percentage > 100) {
        throw new Error('Progress percentage must be between 0 and 100');
      }
    }

    // Add more validation as needed for specific progress metrics
  }

  /**
   * 🏗️ Check Rate Limit
   * @private
   */
  async _checkRateLimit(connectionId, userId) {
    const key = `rate_limit:${userId}`;
    const now = Date.now();
    const windowSize = 60000; // 1 minute
    const maxMessages = 60; // 60 messages per minute

    const current = await this.redis.get(key);
    
    if (current && parseInt(current) >= maxMessages) {
      throw new Error('Rate limit exceeded. Please wait before sending more messages.');
    }

    await this.redis.multi()
      .incr(key)
      .pexpire(key, windowSize)
      .exec();
  }

  /**
   * 🏗️ Notify Expert of Quality Issue
   * @private
   */
  async _notifyExpertOfQualityIssue(apprenticeshipId, message, qualityScore) {
    try {
      const apprenticeship = await this.prisma.apprenticeship.findUnique({
        where: { id: apprenticeshipId },
        include: { expert: true }
      });

      if (apprenticeship && apprenticeship.expertId) {
        await this._sendToUser(apprenticeship.expertId, {
          type: 'apprentice_quality_alert',
          data: {
            apprenticeshipId,
            messagePreview: message.content.substring(0, 100),
            qualityScore,
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      this._logError('EXPERT_NOTIFICATION_FAILED', error, { apprenticeshipId });
    }
  }

  /**
   * 🏗️ Send Message to Specific User
   * @private
   */
  async _sendToUser(userId, message) {
    // Find all connections for this user
    for (const [connectionId, connection] of this.clients) {
      if (connection.user.id === userId) {
        await this._sendToConnection(connectionId, message);
      }
    }
  }

  /**
   * 🏗️ Start Quality Monitoring
   * @private
   */
  _startQualityMonitoring() {
    setInterval(() => {
      this._performQualityChecks();
    }, this.config.qualityCheckInterval);
  }

  /**
   * 🏗️ Perform Quality Checks
   * @private
   */
  async _performQualityChecks() {
    try {
      // Check for experts with slow response times
      const slowExperts = await this._findSlowRespondingExperts();
      
      for (const expert of slowExperts) {
        await this._handleSlowResponse(expert);
      }

      // Check for inactive apprenticeships
      const inactiveChats = await this._findInactiveApprenticeships();
      
      for (const chat of inactiveChats) {
        await this._handleInactiveChat(chat);
      }

      this._logSuccess('QUALITY_CHECKS_COMPLETED', {
        slowExpertsCount: slowExperts.length,
        inactiveChatsCount: inactiveChats.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this._logError('QUALITY_CHECKS_FAILED', error);
    }
  }

  /**
   * 🏗️ Find Slow Responding Experts
   * @private
   */
  async _findSlowRespondingExperts() {
    // Implementation to find experts with response times > threshold
    // This would query the database for experts with poor response metrics
    return []; // Placeholder
  }

  /**
   * 🏗️ Handle Slow Response
   * @private
   */
  async _handleSlowResponse(expert) {
    // Send notification to expert
    await this._sendToUser(expert.id, {
      type: 'response_time_alert',
      data: {
        message: 'Your average response time is below expected standards.',
        averageResponseTime: expert.averageResponseTime,
        expectedResponseTime: QUALITY_THRESHOLDS.RESPONSE_TIME
      }
    });

    this.emit('expert.slow_response', expert);
  }

  /**
   * 🏗️ Find Inactive Apprenticeships
   * @private
   */
  async _findInactiveApprenticeships() {
    // Find apprenticeships with no recent messages
    const inactiveThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const inactiveApprenticeships = await this.prisma.apprenticeship.findMany({
      where: {
        chatMessages: {
          none: {
            createdAt: {
              gte: inactiveThreshold
            }
          }
        },
        status: 'ACTIVE'
      },
      include: {
        expert: true,
        student: true
      }
    });

    return inactiveApprenticeships;
  }

  /**
   * 🏗️ Handle Inactive Chat
   * @private
   */
  async _handleInactiveChat(apprenticeship) {
    // Send reminder to both expert and apprentice
    const reminderMessage = {
      type: 'inactivity_reminder',
      data: {
        message: 'Your apprenticeship chat has been inactive. Please check in with your expert/apprentice.',
        lastActivity: apprenticeship.updatedAt,
        daysInactive: Math.floor((Date.now() - apprenticeship.updatedAt) / (24 * 60 * 60 * 1000))
      }
    };

    await this._sendToUser(apprenticeship.expertId, reminderMessage);
    await this._sendToUser(apprenticeship.studentId, reminderMessage);

    this.emit('chat.inactive', apprenticeship);
  }

  /**
   * 🏗️ Start Health Checks
   * @private
   */
  _startHealthChecks() {
    setInterval(() => {
      this._checkHealth();
    }, 30000); // Every 30 seconds
  }

  /**
   * 🏗️ Health Check Implementation
   * @private
   */
  async _checkHealth() {
    const health = {
      service: 'apprenticeship-chat',
      timestamp: new Date().toISOString(),
      status: 'healthy',
      metrics: this.getMetrics(),
      dependencies: {}
    };

    try {
      await this.redis.ping();
      health.dependencies.redis = 'healthy';
    } catch (error) {
      health.dependencies.redis = 'unhealthy';
      health.status = 'degraded';
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      health.dependencies.database = 'healthy';
    } catch (error) {
      health.dependencies.database = 'unhealthy';
      health.status = 'degraded';
    }

    // WebSocket server health
    health.dependencies.websocket = this.wss ? 'healthy' : 'unhealthy';
    
    if (!this.wss) {
      health.status = 'degraded';
    }

    await this.redis.set(
      `health:apprenticeship-chat:${Date.now()}`,
      JSON.stringify(health),
      'EX',
      60
    );

    this.emit('health.check', health);
  }

  /**
   * 🏗️ Initialize Event Handlers
   * @private
   */
  _initializeEventHandlers() {
    this.on('client.connected', (data) => {
      this._logEvent('CLIENT_CONNECTED', data);
    });

    this.on('client.disconnected', (data) => {
      this._logEvent('CLIENT_DISCONNECTED', data);
    });

    this.on('message.sent', (data) => {
      this._logEvent('MESSAGE_SENT', data);
    });

    this.on('quality.alert', (data) => {
      this._logEvent('QUALITY_ALERT', data);
    });

    this.on('health.check', (data) => {
      this._logEvent('HEALTH_CHECK', data);
    });
  }

  /**
   * 🏗️ Enterprise Logging
   * @private
   */
  _logEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'apprenticeship-chat',
      event: eventType,
      data,
      environment: process.env.NODE_ENV || 'development'
    };

    console.log(JSON.stringify(logEntry));

    if (process.env.NODE_ENV === 'production') {
      this.redis.publish('service-logs', JSON.stringify(logEntry));
    }
  }

  /**
   * 🏗️ Success Logging
   * @private
   */
  _logSuccess(operation, data) {
    this._logEvent('SUCCESS', {
      operation,
      ...data,
      severity: 'INFO'
    });
  }

  /**
   * 🏗️ Error Logging
   * @private
   */
  _logError(operation, error, context = {}) {
    this._logEvent('ERROR', {
      operation,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context,
      severity: 'ERROR'
    });
  }

  /**
   * 🏗️ Get Service Metrics
   * @returns {Object} Service performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      totalRooms: this.rooms.size,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  /**
   * 🏗️ Get Room Statistics
   * @param {string} apprenticeshipId - The apprenticeship ID
   * @returns {Object} Room statistics
   */
  getRoomStats(apprenticeshipId) {
    const room = this.rooms.get(apprenticeshipId);
    
    if (!room) {
      return null;
    }

    const connections = Array.from(room).map(connectionId => 
      this.clients.get(connectionId)
    );

    return {
      apprenticeshipId,
      activeConnections: connections.length,
      connections: connections.map(conn => ({
        userId: conn.user.id,
        userRole: conn.user.role,
        connectedAt: conn.connectedAt,
        lastActivity: conn.lastActivity
      })),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🏗️ Send System Message
   * @param {string} apprenticeshipId - The apprenticeship ID
   * @param {string} content - Message content
   * @param {Object} metadata - Additional metadata
   */
  async sendSystemMessage(apprenticeshipId, content, metadata = {}) {
    try {
      const systemMessage = await this.prisma.chatMessage.create({
        data: {
          id: uuidv4(),
          apprenticeshipId,
          senderId: 'system',
          senderRole: CHAT_ROLES.SYSTEM,
          type: MESSAGE_TYPES.SYSTEM,
          content,
          metadata,
          status: MESSAGE_STATUS.SENT
        }
      });

      await this._broadcastToRoom(apprenticeshipId, {
        type: 'system_message',
        data: systemMessage
      });

      return systemMessage;
    } catch (error) {
      this._logError('SEND_SYSTEM_MESSAGE_FAILED', error, { apprenticeshipId });
      throw error;
    }
  }

  /**
   * 🏗️ Graceful Shutdown
   */
  async shutdown() {
    try {
      this.emit('service.shutdown.started');

      // Notify all connected clients
      const shutdownMessage = {
        type: 'system_shutdown',
        data: {
          message: 'Service is shutting down for maintenance',
          timestamp: new Date().toISOString()
        }
      };

      for (const [connectionId, connection] of this.clients) {
        await this._sendToConnection(connectionId, shutdownMessage);
        connection.ws.close(1001, 'Service shutdown');
      }

      // Close WebSocket server
      if (this.wss) {
        this.wss.close();
      }

      // Close Redis connection
      await this.redis.quit();

      // Close Database connection
      await this.prisma.$disconnect();

      this.emit('service.shutdown.completed');
    } catch (error) {
      this.emit('service.shutdown.failed', { error: error.message });
      throw error;
    }
  }
}

// 🏗️ Enterprise Export Pattern
module.exports = {
  ApprenticeshipChat,
  MESSAGE_TYPES,
  MESSAGE_STATUS,
  CHAT_ROLES,
  QUALITY_THRESHOLDS
};

// 🏗️ Singleton Instance for Microservice Architecture
let apprenticeshipChatInstance = null;

module.exports.getInstance = (options = {}) => {
  if (!apprenticeshipChatInstance) {
    apprenticeshipChatInstance = new ApprenticeshipChat(options);
  }
  return apprenticeshipChatInstance;
};