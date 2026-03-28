/**
 * 🎯 MOSA FORGE: Enterprise Practical Workspace Service
 * 
 * @module PracticalWorkspace
 * @description Manages hands-on training sessions, real project work, and practical skill application
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time collaborative workspace
 * - Project-based learning management
 * - Expert-student interaction tracking
 * - Quality assurance during hands-on phase
 * - Portfolio building and verification
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const WebSocket = require('ws');

// 🏗️ Enterprise Constants
const WORKSPACE_STATES = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    PAUSED: 'paused',
    REVIEW: 'under_review',
    CANCELLED: 'cancelled'
};

const SESSION_TYPES = {
    ONE_ON_ONE: 'one_on_one',
    GROUP: 'group',
    PROJECT: 'project_review',
    ASSESSMENT: 'skill_assessment'
};

const PROJECT_COMPLEXITY = {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced',
    REAL_WORLD: 'real_world'
};

/**
 * 🏗️ Enterprise Practical Workspace Class
 * @class PracticalWorkspace
 * @extends EventEmitter
 */
class PracticalWorkspace extends EventEmitter {
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
            maxSessionDuration: options.maxSessionDuration || 7200, // 2 hours in seconds
            maxStudentsPerSession: options.maxStudentsPerSession || 5,
            minSessionRating: options.minSessionRating || 4.0,
            wsPort: options.wsPort || 8080
        };

        // 🏗️ Service Dependencies
        this.redis = new Redis(this.config.redis);
        this.prisma = this.config.prisma;
        this.activeSessions = new Map();
        this.websocketServer = null;

        // 🏗️ Performance Monitoring
        this.metrics = {
            sessionsStarted: 0,
            sessionsCompleted: 0,
            projectsCompleted: 0,
            averageSessionRating: 0,
            realTimeConnections: 0
        };

        this._initializeWebSocketServer();
        this._initializeEventHandlers();
        this._startSessionCleanup();
    }

    /**
     * 🏗️ Initialize WebSocket Server for Real-time Collaboration
     * @private
     */
    _initializeWebSocketServer() {
        this.websocketServer = new WebSocket.Server({ 
            port: this.config.wsPort,
            clientTracking: true
        });

        this.websocketServer.on('connection', (ws, request) => {
            this._handleWebSocketConnection(ws, request);
        });

        this.websocketServer.on('error', (error) => {
            this._logError('WEBSOCKET_SERVER_ERROR', error);
        });
    }

    /**
     * 🏗️ Handle WebSocket Connections
     * @private
     */
    _handleWebSocketConnection(ws, request) {
        const sessionId = this._extractSessionIdFromRequest(request);
        const connectionId = uuidv4();

        ws.connectionId = connectionId;
        ws.sessionId = sessionId;

        // Add to active connections
        if (!this.activeSessions.has(sessionId)) {
            this.activeSessions.set(sessionId, new Map());
        }
        this.activeSessions.get(sessionId).set(connectionId, ws);
        this.metrics.realTimeConnections++;

        ws.on('message', (data) => {
            this._handleWebSocketMessage(ws, data);
        });

        ws.on('close', () => {
            this._handleWebSocketClose(ws);
        });

        ws.on('error', (error) => {
            this._handleWebSocketError(ws, error);
        });

        this.emit('websocket.connected', { connectionId, sessionId });
    }

    /**
     * 🏗️ Handle WebSocket Messages
     * @private
     */
    async _handleWebSocketMessage(ws, data) {
        try {
            const message = JSON.parse(data);
            const { type, payload, sessionId } = message;

            switch (type) {
                case 'JOIN_SESSION':
                    await this._handleJoinSession(ws, payload);
                    break;
                case 'CODE_UPDATE':
                    await this._handleCodeUpdate(ws, payload);
                    break;
                case 'PROJECT_SUBMISSION':
                    await this._handleProjectSubmission(ws, payload);
                    break;
                case 'EXPERT_FEEDBACK':
                    await this._handleExpertFeedback(ws, payload);
                    break;
                case 'SCREEN_SHARE':
                    await this._handleScreenShare(ws, payload);
                    break;
                case 'LIVE_CHAT':
                    await this._handleLiveChat(ws, payload);
                    break;
                default:
                    this._sendError(ws, 'UNKNOWN_MESSAGE_TYPE', 'Unknown message type');
            }
        } catch (error) {
            this._logError('WEBSOCKET_MESSAGE_ERROR', error, { connectionId: ws.connectionId });
            this._sendError(ws, 'MESSAGE_PROCESSING_ERROR', error.message);
        }
    }

    /**
     * 🎯 MAIN ENTERPRISE METHOD: Start Practical Session
     * @param {Object} sessionData - Session configuration
     * @returns {Promise<Object>} Session start result
     */
    async startPracticalSession(sessionData) {
        const startTime = performance.now();
        const sessionId = uuidv4();
        const traceId = sessionData.traceId || uuidv4();

        try {
            this.emit('session.starting', { sessionId, traceId, sessionData });

            // 🏗️ Enterprise Validation
            await this._validateSessionData(sessionData);
            await this._checkExpertAvailability(sessionData.expertId);
            await this._validateStudentEnrollment(sessionData.enrollmentId);
            
            // 🏗️ Create Session Record
            const session = await this._createSessionRecord({
                ...sessionData,
                sessionId,
                traceId
            });

            // 🏗️ Initialize Workspace Environment
            const workspace = await this._initializeWorkspace(session.id, sessionData.skillId);
            
            // 🏗️ Load Project Template
            const project = await this._loadProjectTemplate(sessionData.skillId, sessionData.complexity);
            
            // 🏗️ Start Real-time Session
            await this._startRealTimeSession(session.id);

            const processingTime = performance.now() - startTime;

            const result = {
                success: true,
                sessionId: session.id,
                workspaceId: workspace.id,
                project: project,
                joinUrl: this._generateJoinUrl(session.id),
                sessionCode: this._generateSessionCode(session.id),
                startTime: session.startTime,
                expectedDuration: session.expectedDuration,
                traceId
            };

            this.emit('session.started', result);
            this._logSuccess('PRACTICAL_SESSION_STARTED', { 
                sessionId: session.id, 
                processingTime,
                expertId: sessionData.expertId,
                studentCount: sessionData.studentIds?.length || 1
            });

            return result;

        } catch (error) {
            const processingTime = performance.now() - startTime;
            
            const errorResult = {
                success: false,
                error: error.message,
                errorCode: error.code || 'SESSION_START_FAILED',
                sessionId,
                traceId,
                timestamp: new Date().toISOString()
            };

            this.emit('session.failed', errorResult);
            this._logError('SESSION_START_FAILED', error, { sessionId, traceId });

            throw this._formatEnterpriseError(error);
        }
    }

    /**
     * 🏗️ Validate Session Data
     * @private
     */
    async _validateSessionData(sessionData) {
        const requiredFields = ['expertId', 'enrollmentId', 'skillId', 'sessionType'];
        const missingFields = requiredFields.filter(field => !sessionData[field]);

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Validate session type
        if (!Object.values(SESSION_TYPES).includes(sessionData.sessionType)) {
            throw new Error('Invalid session type');
        }

        // Validate complexity level
        if (sessionData.complexity && !Object.values(PROJECT_COMPLEXITY).includes(sessionData.complexity)) {
            throw new Error('Invalid project complexity');
        }

        return true;
    }

    /**
     * 🏗️ Check Expert Availability
     * @private
     */
    async _checkExpertAvailability(expertId) {
        const expert = await this.prisma.expert.findUnique({
            where: { id: expertId },
            include: {
                qualityMetrics: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                _count: {
                    select: {
                        activeSessions: {
                            where: {
                                status: 'ACTIVE'
                            }
                        }
                    }
                }
            }
        });

        if (!expert) {
            throw new Error('Expert not found');
        }

        if (expert.status !== 'ACTIVE') {
            throw new Error('Expert is not active');
        }

        if (expert._count.activeSessions >= expert.maxConcurrentSessions) {
            throw new Error('Expert has reached maximum concurrent sessions');
        }

        if (expert.qualityMetrics[0]?.overallScore < this.config.minSessionRating) {
            throw new Error('Expert quality rating below minimum threshold');
        }

        return true;
    }

    /**
     * 🏗️ Validate Student Enrollment
     * @private
     */
    async _validateStudentEnrollment(enrollmentId) {
        const enrollment = await this.prisma.enrollment.findUnique({
            where: { id: enrollmentId },
            include: {
                student: true,
                skill: true,
                progress: {
                    where: { phase: 'THEORY' },
                    orderBy: { updatedAt: 'desc' },
                    take: 1
                }
            }
        });

        if (!enrollment) {
            throw new Error('Enrollment not found');
        }

        if (enrollment.status !== 'ACTIVE') {
            throw new Error('Enrollment is not active');
        }

        // Check if theory phase is completed
        const theoryProgress = enrollment.progress[0];
        if (!theoryProgress || theoryProgress.progress < 100) {
            throw new Error('Theory phase must be completed before hands-on training');
        }

        return true;
    }

    /**
     * 🏗️ Create Session Record
     * @private
     */
    async _createSessionRecord(sessionData) {
        return await this.prisma.practicalSession.create({
            data: {
                id: sessionData.sessionId,
                expertId: sessionData.expertId,
                enrollmentId: sessionData.enrollmentId,
                skillId: sessionData.skillId,
                sessionType: sessionData.sessionType,
                complexity: sessionData.complexity || PROJECT_COMPLEXITY.INTERMEDIATE,
                status: WORKSPACE_STATES.ACTIVE,
                startTime: new Date(),
                expectedDuration: sessionData.duration || 3600, // 1 hour in seconds
                maxParticipants: sessionData.maxParticipants || this.config.maxStudentsPerSession,
                traceId: sessionData.traceId,
                metadata: {
                    tools: this._getSkillTools(sessionData.skillId),
                    environment: this._getWorkspaceEnvironment(sessionData.skillId),
                    requirements: this._getSessionRequirements(sessionData.complexity),
                    qualityMetrics: {
                        expertResponseTime: null,
                        studentEngagement: null,
                        projectCompletion: null
                    }
                }
            }
        });
    }

    /**
     * 🏗️ Initialize Workspace Environment
     * @private
     */
    async _initializeWorkspace(sessionId, skillId) {
        const workspace = await this.prisma.workspace.create({
            data: {
                sessionId: sessionId,
                environment: this._getWorkspaceEnvironment(skillId),
                tools: this._getSkillTools(skillId),
                status: 'ACTIVE',
                code: this._generateInitialCode(skillId),
                assets: this._getSkillAssets(skillId),
                collaboration: {
                    activeUsers: [],
                    chatHistory: [],
                    codeChanges: []
                }
            }
        });

        // Initialize real-time collaboration
        await this.redis.hset(
            `workspace:${sessionId}`,
            'environment', workspace.environment,
            'code', workspace.code,
            'status', 'active'
        );

        return workspace;
    }

    /**
     * 🏗️ Load Project Template
     * @private
     */
    async _loadProjectTemplate(skillId, complexity) {
        const project = await this.prisma.projectTemplate.findFirst({
            where: {
                skillId: skillId,
                complexity: complexity || PROJECT_COMPLEXITY.INTERMEDIATE,
                isActive: true
            },
            include: {
                requirements: true,
                deliverables: true,
                assessment: true
            }
        });

        if (!project) {
            throw new Error('No project template found for this skill and complexity');
        }

        return {
            id: project.id,
            title: project.title,
            description: project.description,
            complexity: project.complexity,
            estimatedHours: project.estimatedHours,
            requirements: project.requirements,
            deliverables: project.deliverables,
            assessment: project.assessment,
            successCriteria: project.successCriteria
        };
    }

    /**
     * 🏗️ Start Real-time Session
     * @private
     */
    async _startRealTimeSession(sessionId) {
        // Initialize session in Redis for real-time features
        await this.redis.hset(`session:${sessionId}`, {
            status: 'active',
            startTime: Date.now(),
            participants: JSON.stringify([]),
            activities: JSON.stringify([])
        });

        // Set session expiry
        await this.redis.expire(`session:${sessionId}`, this.config.maxSessionDuration);
    }

    /**
     * 🎯 SUBMIT PROJECT WORK
     * @param {Object} submissionData - Project submission data
     * @returns {Promise<Object>} Submission result
     */
    async submitProjectWork(submissionData) {
        const startTime = performance.now();
        const submissionId = uuidv4();

        try {
            this.emit('project.submission.started', { submissionId, ...submissionData });

            // 🏗️ Validate submission
            await this._validateProjectSubmission(submissionData);
            
            // 🏗️ Create submission record
            const submission = await this._createSubmissionRecord({
                ...submissionData,
                submissionId
            });

            // 🏗️ Assess project quality
            const assessment = await this._assessProjectQuality(submission);
            
            // 🏗️ Update progress
            await this._updateStudentProgress(submissionData.enrollmentId, assessment);

            const processingTime = performance.now() - startTime;

            const result = {
                success: true,
                submissionId: submission.id,
                assessment: assessment,
                nextSteps: this._getNextSteps(assessment.grade),
                traceId: submissionData.traceId
            };

            this.emit('project.submission.completed', result);
            this.metrics.projectsCompleted++;

            return result;

        } catch (error) {
            const processingTime = performance.now() - startTime;
            this._logError('PROJECT_SUBMISSION_FAILED', error, { submissionId });
            throw this._formatEnterpriseError(error);
        }
    }

    /**
     * 🏗️ Validate Project Submission
     * @private
     */
    async _validateProjectSubmission(submissionData) {
        const requiredFields = ['sessionId', 'enrollmentId', 'projectId', 'work'];
        const missingFields = requiredFields.filter(field => !submissionData[field]);

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Check if session is active
        const session = await this.prisma.practicalSession.findUnique({
            where: { id: submissionData.sessionId }
        });

        if (!session || session.status !== WORKSPACE_STATES.ACTIVE) {
            throw new Error('Session is not active');
        }

        // Validate file sizes and types
        if (submissionData.files) {
            for (const file of submissionData.files) {
                if (file.size > 10 * 1024 * 1024) { // 10MB limit
                    throw new Error(`File ${file.name} exceeds size limit`);
                }
            }
        }

        return true;
    }

    /**
     * 🏗️ Assess Project Quality
     * @private
     */
    async _assessProjectQuality(submission) {
        const assessmentCriteria = await this.prisma.assessmentCriteria.findMany({
            where: { projectId: submission.projectId }
        });

        let totalScore = 0;
        const criteriaResults = [];

        for (const criterion of assessmentCriteria) {
            const score = await this._evaluateCriterion(submission, criterion);
            totalScore += score;
            criteriaResults.push({
                criterion: criterion.name,
                score: score,
                maxScore: criterion.maxScore,
                feedback: this._generateCriterionFeedback(criterion, score)
            });
        }

        const finalScore = totalScore / assessmentCriteria.length;
        const grade = this._calculateGrade(finalScore);

        return {
            finalScore: Math.round(finalScore * 100) / 100,
            grade: grade,
            criteria: criteriaResults,
            expertFeedback: null, // To be filled by expert
            requiresExpertReview: finalScore < 70 // Below 70% requires expert review
        };
    }

    /**
     * 🎯 PROVIDE EXPERT FEEDBACK
     * @param {Object} feedbackData - Expert feedback data
     * @returns {Promise<Object>} Feedback result
     */
    async provideExpertFeedback(feedbackData) {
        const startTime = performance.now();

        try {
            this.emit('expert.feedback.provided', feedbackData);

            // 🏗️ Validate expert authority
            await this._validateExpertAuthority(feedbackData.expertId, feedbackData.sessionId);
            
            // 🏗️ Record feedback
            const feedback = await this._recordExpertFeedback(feedbackData);
            
            // 🏗️ Update project assessment
            await this._updateProjectAssessment(feedbackData.submissionId, feedback);
            
            // 🏗️ Notify student
            await this._notifyStudentOfFeedback(feedbackData);

            const processingTime = performance.now() - startTime;

            const result = {
                success: true,
                feedbackId: feedback.id,
                studentNotified: true,
                traceId: feedbackData.traceId
            };

            this.emit('feedback.recorded', result);
            return result;

        } catch (error) {
            const processingTime = performance.now() - startTime;
            this._logError('EXPERT_FEEDBACK_FAILED', error, feedbackData);
            throw this._formatEnterpriseError(error);
        }
    }

    /**
     * 🎯 COMPLETE PRACTICAL SESSION
     * @param {Object} completionData - Session completion data
     * @returns {Promise<Object>} Completion result
     */
    async completePracticalSession(completionData) {
        const startTime = performance.now();

        try {
            this.emit('session.completing', completionData);

            // 🏗️ Validate completion data
            await this._validateCompletionData(completionData);
            
            // 🏗️ Record session results
            const results = await this._recordSessionResults(completionData);
            
            // 🏗️ Update expert metrics
            await this._updateExpertMetrics(completionData.expertId, results);
            
            // 🏗️ Update student progress
            await this._updateHandsOnProgress(completionData.enrollmentId);
            
            // 🏗️ Cleanup resources
            await this._cleanupSessionResources(completionData.sessionId);

            const processingTime = performance.now() - startTime;

            const result = {
                success: true,
                sessionId: completionData.sessionId,
                results: results,
                progressUpdated: true,
                certificationEligible: this._checkCertificationEligibility(completionData.enrollmentId),
                traceId: completionData.traceId
            };

            this.emit('session.completed', result);
            this.metrics.sessionsCompleted++;

            return result;

        } catch (error) {
            const processingTime = performance.now() - startTime;
            this._logError('SESSION_COMPLETION_FAILED', error, completionData);
            throw this._formatEnterpriseError(error);
        }
    }

    /**
     * 🏗️ Get Workspace Environment by Skill
     * @private
     */
    _getWorkspaceEnvironment(skillId) {
        const environments = {
            'web-development': {
                type: 'code',
                runtime: 'nodejs',
                packages: ['express', 'react', 'mongodb'],
                ide: 'vscode'
            },
            'graphic-design': {
                type: 'design',
                tools: ['figma', 'photoshop', 'illustrator'],
                templates: ['brand-kit', 'social-media']
            },
            'forex-trading': {
                type: 'trading',
                platforms: ['metatrader', 'tradingview'],
                data: ['real-time-charts', 'economic-calendar']
            }
            // Add more skill environments
        };

        return environments[skillId] || {
            type: 'general',
            tools: ['text-editor', 'file-manager'],
            collaboration: true
        };
    }

    /**
     * 🏗️ Get Skill Tools
     * @private
     */
    _getSkillTools(skillId) {
        const toolsBySkill = {
            'web-development': ['VS Code', 'Git', 'Chrome DevTools', 'Postman'],
            'graphic-design': ['Figma', 'Adobe Creative Suite', 'Canva'],
            'forex-trading': ['MetaTrader', 'TradingView', 'Economic Calendar'],
            'digital-marketing': ['Google Analytics', 'SEMrush', 'Mailchimp']
            // Add more skills
        };

        return toolsBySkill[skillId] || ['Basic Text Editor', 'File Manager'];
    }

    /**
     * 🏗️ Get Skill Assets
     * @private
     */
    _getSkillAssets(skillId) {
        const assetsBySkill = {
            'web-development': {
                templates: ['html-boilerplate', 'react-starter', 'express-server'],
                resources: ['documentation', 'code-snippets', 'best-practices']
            },
            'graphic-design': {
                templates: ['logo-templates', 'social-media-kit', 'brand-guidelines'],
                resources: ['color-palettes', 'font-pairings', 'design-principles']
            }
            // Add more skills
        };

        return assetsBySkill[skillId] || { templates: [], resources: [] };
    }

    /**
     * 🏗️ Generate Initial Code
     * @private
     */
    _generateInitialCode(skillId) {
        const codeTemplates = {
            'web-development': `// Welcome to Mosa Forge Practical Workspace
// This is your starting code for web development

function welcome() {
    console.log("🚀 Building your future with Mosa Forge!");
    return "Start coding your project below...";
}

welcome();`,
            'forex-trading': `# Mosa Forge Trading Analysis
# Practical workspace for Forex trading strategies

def analyze_market():
    print("📈 Analyzing market conditions...")
    # Add your trading analysis code here
    return "Market analysis in progress"

analyze_market()`
        };

        return codeTemplates[skillId] || `// Mosa Forge Practical Workspace\n// Start your project here...`;
    }

    /**
     * 🏗️ Generate Join URL
     * @private
     */
    _generateJoinUrl(sessionId) {
        return `${process.env.APP_URL}/workspace/${sessionId}`;
    }

    /**
     * 🏗️ Generate Session Code
     * @private
     */
    _generateSessionCode(sessionId) {
        return sessionId.substring(0, 8).toUpperCase();
    }

    /**
     * 🏗️ Handle Session Cleanup
     * @private
     */
    _startSessionCleanup() {
        setInterval(async () => {
            await this._cleanupExpiredSessions();
        }, 60000); // Run every minute
    }

    /**
     * 🏗️ Cleanup Expired Sessions
     * @private
     */
    async _cleanupExpiredSessions() {
        try {
            const expiredSessions = await this.prisma.practicalSession.findMany({
                where: {
                    status: WORKSPACE_STATES.ACTIVE,
                    startTime: {
                        lt: new Date(Date.now() - (this.config.maxSessionDuration * 1000))
                    }
                }
            });

            for (const session of expiredSessions) {
                await this.completePracticalSession({
                    sessionId: session.id,
                    expertId: session.expertId,
                    enrollmentId: session.enrollmentId,
                    reason: 'auto_timeout',
                    traceId: `cleanup-${Date.now()}`
                });
            }
        } catch (error) {
            this._logError('SESSION_CLEANUP_ERROR', error);
        }
    }

    /**
     * 🏗️ Enterprise Logging
     * @private
     */
    _logEvent(eventType, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            service: 'practical-workspace',
            event: eventType,
            data,
            environment: process.env.NODE_ENV || 'development'
        };

        console.log(JSON.stringify(logEntry));

        // Send to centralized logging in production
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
     * 🏗️ Format Enterprise Error
     * @private
     */
    _formatEnterpriseError(error) {
        const enterpriseError = new Error(error.message);
        enterpriseError.code = error.code || 'INTERNAL_ERROR';
        enterpriseError.timestamp = new Date().toISOString();
        enterpriseError.severity = 'HIGH';
        
        return enterpriseError;
    }

    /**
     * 🏗️ Get Service Metrics
     * @returns {Object} Service performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            activeSessions: this.activeSessions.size,
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
    }

    /**
     * 🏗️ Graceful Shutdown
     */
    async shutdown() {
        try {
            this.emit('service.shutdown.started');
            
            // Close all active sessions
            for (const [sessionId, connections] of this.activeSessions) {
                for (const [connectionId, ws] of connections) {
                    ws.close();
                }
            }

            // Close WebSocket server
            if (this.websocketServer) {
                this.websocketServer.close();
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
    PracticalWorkspace,
    WORKSPACE_STATES,
    SESSION_TYPES,
    PROJECT_COMPLEXITY
};

// 🏗️ Singleton Instance for Microservice Architecture
let practicalWorkspaceInstance = null;

module.exports.getInstance = (options = {}) => {
    if (!practicalWorkspaceInstance) {
        practicalWorkspaceInstance = new PracticalWorkspace(options);
    }
    return practicalWorkspaceInstance;
};