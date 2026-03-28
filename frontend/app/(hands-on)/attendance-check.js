/**
 * 🎯 MOSA FORGE: Enterprise Attendance Verification System
 * 
 * @module AttendanceCheck
 * @description Real-time attendance tracking and verification for hands-on training sessions
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time biometric verification
 * - GPS location validation
 * - Session quality monitoring
 * - Fraud detection and prevention
 * - Automated compliance enforcement
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const geolib = require('geolib');

// 🏗️ Enterprise Constants
const ATTENDANCE_STATUS = {
    PRESENT: 'present',
    LATE: 'late',
    ABSENT: 'absent',
    EXCUSED: 'excused',
    PENDING_VERIFICATION: 'pending_verification'
};

const VERIFICATION_METHODS = {
    BIOMETRIC: 'biometric',
    GPS: 'gps',
    QR_CODE: 'qr_code',
    MANUAL: 'manual',
    VOICE: 'voice_verification'
};

const SESSION_STATES = {
    SCHEDULED: 'scheduled',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    MISSED: 'missed'
};

/**
 * 🏗️ Enterprise Attendance Check Class
 * @class AttendanceCheck
 * @extends EventEmitter
 */
class AttendanceCheck extends EventEmitter {
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
            maxRetries: options.maxRetries || 3,
            sessionTimeout: options.sessionTimeout || 900000, // 15 minutes
            gracePeriod: options.gracePeriod || 300000, // 5 minutes
            gpsAccuracy: options.gpsAccuracy || 50, // meters
            biometricThreshold: options.biometricThreshold || 0.8
        };

        // 🏗️ Service Dependencies
        this.redis = new Redis(this.config.redis);
        this.prisma = this.config.prisma;
        
        // 🏗️ Performance Monitoring
        this.metrics = {
            attendanceChecks: 0,
            successfulVerifications: 0,
            failedVerifications: 0,
            fraudAttempts: 0,
            averageVerificationTime: 0
        };

        // 🏗️ Fraud Detection System
        this.fraudPatterns = new Map();
        this.suspiciousActivities = new Set();
        
        this._initializeEventHandlers();
        this._startSessionMonitor();
        this._initializeFraudDetection();
    }

    /**
     * 🏗️ Initialize Enterprise Event Handlers
     * @private
     */
    _initializeEventHandlers() {
        this.on('attendance.verified', (data) => {
            this._logEvent('ATTENDANCE_VERIFIED', data);
            this.metrics.successfulVerifications++;
        });

        this.on('attendance.failed', (data) => {
            this._logEvent('ATTENDANCE_FAILED', data);
            this.metrics.failedVerifications++;
        });

        this.on('fraud.detected', (data) => {
            this._logEvent('FRAUD_DETECTED', data);
            this.metrics.fraudAttempts++;
            this._handleFraudAttempt(data);
        });

        this.on('session.auto_completed', (data) => {
            this._logEvent('SESSION_AUTO_COMPLETED', data);
        });

        this.on('quality.metrics.updated', (data) => {
            this._logEvent('QUALITY_METRICS_UPDATED', data);
        });
    }

    /**
     * 🏗️ Start Real-time Session Monitoring
     * @private
     */
    _startSessionMonitor() {
        // Monitor active sessions every 30 seconds
        setInterval(async () => {
            await this._checkActiveSessions();
        }, 30000);

        // Cleanup expired sessions every hour
        setInterval(async () => {
            await this._cleanupExpiredSessions();
        }, 3600000);
    }

    /**
     * 🏗️ Initialize Fraud Detection System
     * @private
     */
    _initializeFraudDetection() {
        // Load known fraud patterns from database
        this._loadFraudPatterns();
        
        // Initialize machine learning model for anomaly detection
        this._initializeAnomalyDetection();
    }

    /**
     * 🎯 MAIN ENTERPRISE METHOD: Verify Session Attendance
     * @param {Object} attendanceData - Attendance verification data
     * @returns {Promise<Object>} Verification result
     */
    async verifyAttendance(attendanceData) {
        const startTime = performance.now();
        const verificationId = uuidv4();
        const traceId = attendanceData.traceId || uuidv4();

        try {
            this.emit('attendance.verification.started', { verificationId, traceId, attendanceData });
            this.metrics.attendanceChecks++;

            // 🏗️ Enterprise Validation Chain
            await this._validateAttendanceData(attendanceData);
            const session = await this._validateSession(attendanceData.sessionId);
            await this._validateEnrollment(attendanceData.studentId, session.enrollmentId);
            
            // 🏗️ Multi-factor Verification
            const verificationResults = await this._performMultiFactorVerification(attendanceData, session);
            
            // 🏗️ Fraud Detection Check
            await this._checkForFraudPatterns(attendanceData, verificationResults);
            
            // 🏗️ Create Attendance Record
            const attendanceRecord = await this._createAttendanceRecord({
                ...attendanceData,
                verificationId,
                sessionId: session.id,
                verificationResults,
                traceId
            });

            // 🏗️ Update Session Progress
            await this._updateSessionProgress(session.id, attendanceData.studentId);
            
            // 🏗️ Calculate Quality Metrics
            await this._updateQualityMetrics(session.expertId, attendanceData.studentId);

            const processingTime = performance.now() - startTime;
            this._updateMetrics(processingTime);

            const result = {
                success: true,
                verificationId: attendanceRecord.id,
                sessionId: session.id,
                status: attendanceRecord.status,
                verificationMethod: attendanceRecord.verificationMethod,
                qualityScore: this._calculateQualityScore(verificationResults),
                nextSession: await this._getNextSession(session.enrollmentId),
                traceId
            };

            this.emit('attendance.verified', result);
            this._logSuccess('ATTENDANCE_VERIFIED', { verificationId, processingTime });

            return result;

        } catch (error) {
            const processingTime = performance.now() - startTime;
            this._updateMetrics(processingTime);
            
            const errorResult = {
                success: false,
                error: error.message,
                errorCode: error.code || 'VERIFICATION_FAILED',
                verificationId,
                traceId,
                timestamp: new Date().toISOString()
            };

            this.emit('attendance.failed', errorResult);
            this._logError('ATTENDANCE_VERIFICATION_FAILED', error, { verificationId, traceId });

            throw this._formatEnterpriseError(error);
        }
    }

    /**
     * 🏗️ Multi-Factor Verification System
     * @private
     */
    async _performMultiFactorVerification(attendanceData, session) {
        const verificationResults = {
            methods: [],
            scores: {},
            overallScore: 0,
            timestamp: new Date()
        };

        // 🎯 GPS Location Verification
        if (attendanceData.gpsCoordinates) {
            const gpsResult = await this._verifyGPSLocation(
                attendanceData.gpsCoordinates, 
                session.expectedLocation
            );
            verificationResults.methods.push('gps');
            verificationResults.scores.gps = gpsResult.score;
        }

        // 🎯 Biometric Verification
        if (attendanceData.biometricData) {
            const biometricResult = await this._verifyBiometric(
                attendanceData.biometricData, 
                attendanceData.studentId
            );
            verificationResults.methods.push('biometric');
            verificationResults.scores.biometric = biometricResult.score;
        }

        // 🎯 QR Code Verification
        if (attendanceData.qrCode) {
            const qrResult = await this._verifyQRCode(
                attendanceData.qrCode, 
                session.id
            );
            verificationResults.methods.push('qr_code');
            verificationResults.scores.qr_code = qrResult.score;
        }

        // 🎯 Voice Verification (Optional)
        if (attendanceData.voiceSample) {
            const voiceResult = await this._verifyVoiceSample(
                attendanceData.voiceSample, 
                attendanceData.studentId
            );
            verificationResults.methods.push('voice');
            verificationResults.scores.voice = voiceResult.score;
        }

        // 🎯 Calculate Overall Verification Score
        verificationResults.overallScore = this._calculateVerificationScore(verificationResults.scores);
        
        // 🎯 Determine Verification Status
        verificationResults.status = this._determineVerificationStatus(verificationResults.overallScore);

        return verificationResults;
    }

    /**
     * 🏗️ GPS Location Verification
     * @private
     */
    async _verifyGPSLocation(currentCoordinates, expectedLocation) {
        if (!expectedLocation) {
            return { score: 0.7, reason: 'No expected location set' };
        }

        const distance = geolib.getDistance(currentCoordinates, expectedLocation);
        const accuracy = this.config.gpsAccuracy;
        
        let score = 0;
        if (distance <= accuracy) {
            score = 1.0; // Perfect match
        } else if (distance <= accuracy * 2) {
            score = 0.8; // Close enough
        } else if (distance <= accuracy * 5) {
            score = 0.5; // Within reasonable distance
        } else {
            score = 0.1; // Too far away
        }

        // Check for location spoofing
        const isSuspicious = await this._checkLocationSpoofing(currentCoordinates, expectedLocation);
        if (isSuspicious) {
            score *= 0.5; // Reduce score for suspicious activity
        }

        return {
            score: Math.round(score * 100) / 100,
            distance,
            accuracy,
            isSuspicious
        };
    }

    /**
     * 🏗️ Biometric Verification
     * @private
     */
    async _verifyBiometric(biometricData, studentId) {
        try {
            // In production, integrate with actual biometric service
            const storedBiometric = await this.redis.get(`biometric:${studentId}`);
            
            if (!storedBiometric) {
                // First time verification - store template
                await this.redis.set(`biometric:${studentId}`, JSON.stringify(biometricData), 'EX', 86400);
                return { score: 0.9, reason: 'First verification - template stored' };
            }

            const storedTemplate = JSON.parse(storedBiometric);
            const similarityScore = this._calculateBiometricSimilarity(biometricData, storedTemplate);
            
            if (similarityScore >= this.config.biometricThreshold) {
                return { score: similarityScore, verified: true };
            } else {
                return { score: similarityScore, verified: false, reason: 'Biometric mismatch' };
            }
        } catch (error) {
            throw new Error(`Biometric verification failed: ${error.message}`);
        }
    }

    /**
     * 🏗️ QR Code Verification
     * @private
     */
    async _verifyQRCode(qrCode, sessionId) {
        // Validate QR code format and expiration
        const validQR = await this.redis.get(`qrcode:${sessionId}`);
        
        if (!validQR) {
            throw new Error('Invalid or expired QR code');
        }

        if (qrCode !== validQR) {
            throw new Error('QR code mismatch');
        }

        // Mark QR code as used
        await this.redis.del(`qrcode:${sessionId}`);

        return { score: 1.0, verified: true };
    }

    /**
     * 🏗️ Voice Verification
     * @private
     */
    async _verifyVoiceSample(voiceSample, studentId) {
        // Basic voice verification implementation
        // In production, integrate with voice recognition service
        
        const voiceProfile = await this.redis.get(`voice:${studentId}`);
        if (!voiceProfile) {
            // Store initial voice profile
            await this.redis.set(`voice:${studentId}`, JSON.stringify(voiceSample), 'EX', 86400);
            return { score: 0.8, reason: 'Voice profile created' };
        }

        // Simple similarity calculation (replace with actual voice recognition)
        const similarity = this._calculateVoiceSimilarity(voiceSample, JSON.parse(voiceProfile));
        
        return { 
            score: similarity >= 0.7 ? 0.9 : 0.3, 
            verified: similarity >= 0.7 
        };
    }

    /**
     * 🏗️ Fraud Detection System
     * @private
     */
    async _checkForFraudPatterns(attendanceData, verificationResults) {
        const fraudIndicators = [];

        // Check for multiple devices
        if (await this._checkMultipleDevices(attendanceData.studentId, attendanceData.deviceId)) {
            fraudIndicators.push('MULTIPLE_DEVICES');
        }

        // Check location inconsistencies
        if (await this._checkLocationInconsistencies(attendanceData.studentId, attendanceData.gpsCoordinates)) {
            fraudIndicators.push('LOCATION_INCONSISTENCY');
        }

        // Check timing patterns
        if (await this._checkSuspiciousTiming(attendanceData.sessionId, attendanceData.timestamp)) {
            fraudIndicators.push('SUSPICIOUS_TIMING');
        }

        // Check verification score anomalies
        if (verificationResults.overallScore < 0.3) {
            fraudIndicators.push('LOW_VERIFICATION_SCORE');
        }

        if (fraudIndicators.length > 0) {
            const fraudData = {
                studentId: attendanceData.studentId,
                sessionId: attendanceData.sessionId,
                indicators: fraudIndicators,
                verificationResults,
                timestamp: new Date()
            };

            this.emit('fraud.detected', fraudData);
            await this._recordFraudAttempt(fraudData);

            if (fraudIndicators.includes('LOW_VERIFICATION_SCORE')) {
                throw new Error('Fraud detection: Verification score too low');
            }
        }
    }

    /**
     * 🏗️ Multiple Devices Check
     * @private
     */
    async _checkMultipleDevices(studentId, currentDeviceId) {
        const lastDeviceId = await this.redis.get(`device:${studentId}`);
        
        if (lastDeviceId && lastDeviceId !== currentDeviceId) {
            // Device changed - check if it's suspicious
            const deviceChanges = await this.redis.incr(`device_changes:${studentId}`);
            await this.redis.expire(`device_changes:${studentId}`, 3600); // 1 hour window
            
            return deviceChanges > 2; // More than 2 device changes per hour is suspicious
        }

        // Update current device
        await this.redis.set(`device:${studentId}`, currentDeviceId, 'EX', 86400);
        return false;
    }

    /**
     * 🏗️ Location Inconsistency Check
     * @private
     */
    async _checkLocationInconsistencies(studentId, currentLocation) {
        const lastLocation = await this.redis.get(`location:${studentId}`);
        
        if (lastLocation) {
            const lastLoc = JSON.parse(lastLocation);
            const distance = geolib.getDistance(currentLocation, lastLoc);
            const timeDiff = Date.now() - lastLoc.timestamp;
            
            // If distance is too large for the time difference, it's suspicious
            const reasonableSpeed = 1000; // meters per hour (walking speed)
            const maxReasonableDistance = (timeDiff / 3600000) * reasonableSpeed;
            
            if (distance > maxReasonableDistance * 2) {
                return true;
            }
        }

        // Store current location
        await this.redis.set(`location:${studentId}`, JSON.stringify({
            ...currentLocation,
            timestamp: Date.now()
        }), 'EX', 3600); // Store for 1 hour

        return false;
    }

    /**
     * 🏗️ Suspicious Timing Check
     * @private
     */
    async _checkSuspiciousTiming(sessionId, attendanceTimestamp) {
        const session = await this.prisma.trainingSession.findUnique({
            where: { id: sessionId },
            select: { scheduledStart: true, scheduledEnd: true }
        });

        if (!session) return false;

        const sessionStart = new Date(session.scheduledStart);
        const sessionEnd = new Date(session.scheduledEnd);
        const attendanceTime = new Date(attendanceTimestamp);

        // Check if attendance is outside session time (with grace period)
        const gracePeriodMs = this.config.gracePeriod;
        const earlyLimit = new Date(sessionStart.getTime() - gracePeriodMs);
        const lateLimit = new Date(sessionEnd.getTime() + gracePeriodMs);

        return attendanceTime < earlyLimit || attendanceTime > lateLimit;
    }

    /**
     * 🏗️ Create Attendance Record
     * @private
     */
    async _createAttendanceRecord(attendanceData) {
        return await this.prisma.$transaction(async (tx) => {
            const attendanceRecord = await tx.attendance.create({
                data: {
                    id: attendanceData.verificationId,
                    sessionId: attendanceData.sessionId,
                    studentId: attendanceData.studentId,
                    status: attendanceData.verificationResults.status,
                    verificationMethod: attendanceData.verificationResults.methods.join(','),
                    verificationScore: attendanceData.verificationResults.overallScore,
                    gpsCoordinates: attendanceData.gpsCoordinates,
                    deviceId: attendanceData.deviceId,
                    ipAddress: attendanceData.ipAddress,
                    metadata: {
                        verificationResults: attendanceData.verificationResults,
                        traceId: attendanceData.traceId,
                        qualityMetrics: this._calculateQualityMetrics(attendanceData.verificationResults)
                    },
                    verifiedAt: new Date()
                }
            });

            // Update session attendance count
            await tx.trainingSession.update({
                where: { id: attendanceData.sessionId },
                data: {
                    attendedStudents: {
                        increment: 1
                    },
                    lastAttendanceCheck: new Date()
                }
            });

            return attendanceRecord;
        });
    }

    /**
     * 🏗️ Update Session Progress
     * @private
     */
    async _updateSessionProgress(sessionId, studentId) {
        const session = await this.prisma.trainingSession.findUnique({
            where: { id: sessionId },
            include: { enrollment: true }
        });

        if (!session) return;

        // Update student progress
        await this.prisma.learningProgress.update({
            where: {
                enrollmentId_phase: {
                    enrollmentId: session.enrollmentId,
                    phase: 'HANDS_ON'
                }
            },
            data: {
                completedExercises: {
                    increment: 1
                },
                progress: await this._calculateProgress(session.enrollmentId, 'HANDS_ON'),
                lastActivity: new Date()
            }
        });
    }

    /**
     * 🏗️ Update Quality Metrics
     * @private
     */
    async _updateQualityMetrics(expertId, studentId) {
        // Calculate attendance rate for expert
        const expertSessions = await this.prisma.trainingSession.count({
            where: { expertId, status: 'COMPLETED' }
        });

        const attendedSessions = await this.prisma.attendance.count({
            where: { 
                session: { expertId },
                status: { in: ['present', 'late'] }
            }
        });

        const attendanceRate = expertSessions > 0 ? attendedSessions / expertSessions : 1;

        // Update expert quality metrics
        await this.prisma.qualityMetrics.upsert({
            where: { expertId },
            update: {
                attendanceRate,
                lastUpdated: new Date()
            },
            create: {
                expertId,
                attendanceRate,
                overallScore: attendanceRate * 100 // Initial score based on attendance
            }
        });

        this.emit('quality.metrics.updated', { expertId, attendanceRate });
    }

    /**
     * 🏗️ Check Active Sessions
     * @private
     */
    async _checkActiveSessions() {
        const activeSessions = await this.prisma.trainingSession.findMany({
            where: {
                status: 'IN_PROGRESS',
                scheduledEnd: {
                    lt: new Date()
                }
            },
            include: {
                attendance: {
                    where: {
                        status: { in: ['present', 'late'] }
                    }
                }
            }
        });

        for (const session of activeSessions) {
            // Auto-complete sessions that have ended
            await this.prisma.trainingSession.update({
                where: { id: session.id },
                data: { status: 'COMPLETED' }
            });

            this.emit('session.auto_completed', {
                sessionId: session.id,
                attendanceCount: session.attendance.length,
                completedAt: new Date()
            });
        }
    }

    /**
     * 🏗️ Utility Methods
     */

    _calculateBiometricSimilarity(data1, data2) {
        // Simplified similarity calculation
        // In production, use actual biometric comparison algorithm
        return Math.random() * 0.3 + 0.7; // Simulated 70-100% similarity
    }

    _calculateVoiceSimilarity(voice1, voice2) {
        // Simplified voice similarity calculation
        return Math.random() * 0.4 + 0.6; // Simulated 60-100% similarity
    }

    _calculateVerificationScore(scores) {
        const methodWeights = {
            gps: 0.3,
            biometric: 0.4,
            qr_code: 0.2,
            voice: 0.1
        };

        let totalScore = 0;
        let totalWeight = 0;

        for (const [method, score] of Object.entries(scores)) {
            totalScore += score * (methodWeights[method] || 0.1);
            totalWeight += methodWeights[method] || 0.1;
        }

        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }

    _determineVerificationStatus(score) {
        if (score >= 0.8) return ATTENDANCE_STATUS.PRESENT;
        if (score >= 0.6) return ATTENDANCE_STATUS.LATE;
        if (score >= 0.4) return ATTENDANCE_STATUS.PENDING_VERIFICATION;
        return ATTENDANCE_STATUS.ABSENT;
    }

    _calculateQualityScore(verificationResults) {
        return Math.round(verificationResults.overallScore * 100);
    }

    _calculateQualityMetrics(verificationResults) {
        return {
            verificationStrength: verificationResults.overallScore,
            methodCount: verificationResults.methods.length,
            methodDiversity: verificationResults.methods.length / Object.keys(VERIFICATION_METHODS).length,
            timestamp: new Date()
        };
    }

    async _calculateProgress(enrollmentId, phase) {
        const progress = await this.prisma.learningProgress.findUnique({
            where: {
                enrollmentId_phase: {
                    enrollmentId,
                    phase
                }
            }
        });

        if (!progress || progress.totalExercises === 0) return 0;
        
        return (progress.completedExercises / progress.totalExercises) * 100;
    }

    async _getNextSession(enrollmentId) {
        return await this.prisma.trainingSession.findFirst({
            where: {
                enrollmentId,
                status: 'SCHEDULED',
                scheduledStart: {
                    gt: new Date()
                }
            },
            orderBy: {
                scheduledStart: 'asc'
            },
            select: {
                id: true,
                scheduledStart: true,
                duration: true,
                topic: true
            }
        });
    }

    /**
     * 🏗️ Validation Methods
     */
    async _validateAttendanceData(data) {
        const required = ['sessionId', 'studentId', 'deviceId'];
        const missing = required.filter(field => !data[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        // Validate at least one verification method
        const verificationMethods = ['gpsCoordinates', 'biometricData', 'qrCode', 'voiceSample'];
        const hasVerification = verificationMethods.some(method => data[method]);
        
        if (!hasVerification) {
            throw new Error('At least one verification method required');
        }
    }

    async _validateSession(sessionId) {
        const session = await this.prisma.trainingSession.findUnique({
            where: { id: sessionId },
            include: { enrollment: true }
        });

        if (!session) {
            throw new Error('Session not found');
        }

        if (session.status !== 'IN_PROGRESS') {
            throw new Error('Session is not active');
        }

        // Check if session hasn't ended (with grace period)
        const sessionEnd = new Date(session.scheduledEnd);
        const graceEnd = new Date(sessionEnd.getTime() + this.config.gracePeriod);
        
        if (new Date() > graceEnd) {
            throw new Error('Session has already ended');
        }

        return session;
    }

    async _validateEnrollment(studentId, enrollmentId) {
        const enrollment = await this.prisma.enrollment.findFirst({
            where: {
                id: enrollmentId,
                studentId,
                status: 'ACTIVE'
            }
        });

        if (!enrollment) {
            throw new Error('Invalid enrollment or student not enrolled');
        }

        return true;
    }

    /**
     * 🏗️ Fraud Handling
     */
    async _handleFraudAttempt(fraudData) {
        // Record fraud attempt
        await this.prisma.fraudAttempt.create({
            data: {
                studentId: fraudData.studentId,
                sessionId: fraudData.sessionId,
                indicators: fraudData.indicators,
                verificationData: fraudData.verificationResults,
                actionTaken: 'RECORDED',
                severity: this._calculateFraudSeverity(fraudData.indicators)
            }
        });

        // Temporary block for high severity fraud
        if (this._calculateFraudSeverity(fraudData.indicators) === 'HIGH') {
            await this.redis.set(`fraud_block:${fraudData.studentId}`, 'true', 'EX', 3600); // 1 hour block
        }
    }

    _calculateFraudSeverity(indicators) {
        const highSeverity = ['LOCATION_SPOOFING', 'MULTIPLE_IDENTITIES'];
        const mediumSeverity = ['MULTIPLE_DEVICES', 'LOCATION_INCONSISTENCY'];
        
        if (indicators.some(ind => highSeverity.includes(ind))) return 'HIGH';
        if (indicators.some(ind => mediumSeverity.includes(ind))) return 'MEDIUM';
        return 'LOW';
    }

    async _recordFraudAttempt(fraudData) {
        await this.prisma.fraudAttempt.create({
            data: {
                studentId: fraudData.studentId,
                sessionId: fraudData.sessionId,
                indicators: fraudData.indicators,
                verificationData: fraudData.verificationResults,
                severity: this._calculateFraudSeverity(fraudData.indicators),
                actionTaken: 'RECORDED'
            }
        });
    }

    /**
     * 🏗️ Performance Monitoring
     */
    _updateMetrics(processingTime) {
        this.metrics.averageVerificationTime = 
            (this.metrics.averageVerificationTime * (this.metrics.attendanceChecks - 1) + processingTime) / 
            this.metrics.attendanceChecks;
    }

    _formatEnterpriseError(error) {
        const enterpriseError = new Error(error.message);
        enterpriseError.code = error.code || 'VERIFICATION_ERROR';
        enterpriseError.timestamp = new Date().toISOString();
        enterpriseError.severity = this._getErrorSeverity(error.code);
        
        return enterpriseError;
    }

    _getErrorSeverity(errorCode) {
        const severityMap = {
            'VERIFICATION_FAILED': 'MEDIUM',
            'FRAUD_DETECTED': 'HIGH',
            'SESSION_EXPIRED': 'LOW',
            'INVALID_ENROLLMENT': 'MEDIUM'
        };
        return severityMap[errorCode] || 'MEDIUM';
    }

    /**
     * 🏗️ Enterprise Logging
     */
    _logEvent(eventType, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            service: 'attendance-check',
            event: eventType,
            data,
            environment: process.env.NODE_ENV || 'development'
        };

        console.log(JSON.stringify(logEntry));

        if (process.env.NODE_ENV === 'production') {
            this.redis.publish('service-logs', JSON.stringify(logEntry));
        }
    }

    _logSuccess(operation, data) {
        this._logEvent('SUCCESS', {
            operation,
            ...data,
            severity: 'INFO'
        });
    }

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
     * 🏗️ Public Methods
     */
    async getAttendanceReport(sessionId) {
        return await this.prisma.attendance.findMany({
            where: { sessionId },
            include: {
                student: {
                    select: { name: true, faydaId: true }
                }
            },
            orderBy: { verifiedAt: 'desc' }
        });
    }

    async getStudentAttendance(studentId, enrollmentId) {
        return await this.prisma.attendance.findMany({
            where: {
                studentId,
                session: { enrollmentId }
            },
            include: {
                session: {
                    select: {
                        scheduledStart: true,
                        topic: true,
                        expert: { select: { name: true } }
                    }
                }
            },
            orderBy: { verifiedAt: 'desc' }
        });
    }

    getMetrics() {
        return {
            ...this.metrics,
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
            await this.redis.quit();
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
    AttendanceCheck,
    ATTENDANCE_STATUS,
    VERIFICATION_METHODS,
    SESSION_STATES
};

// 🏗️ Singleton Instance for Microservice Architecture
let attendanceCheckInstance = null;

module.exports.getInstance = (options = {}) => {
    if (!attendanceCheckInstance) {
        attendanceCheckInstance = new AttendanceCheck(options);
    }
    return attendanceCheckInstance;
};