/**
 * 🎯 MOSA FORGE: Enterprise Training Session Model
 * 
 * @module TrainingSession
 * @description Data model for managing hands-on training sessions between experts and students
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Session lifecycle management
 * - Attendance verification system
 * - Quality metrics tracking
 * - Progress validation
 * - Multi-session coordination
 */

const { DataTypes, Model, Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');
const QualityMetrics = require('./QualityMetrics');
const Enrollment = require('./Enrollment');

/**
 * 🏗️ Training Session Status Constants
 */
const SESSION_STATUS = {
    SCHEDULED: 'scheduled',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    NO_SHOW: 'no_show',
    RESCHEDULED: 'rescheduled'
};

const SESSION_TYPES = {
    PRACTICAL: 'practical',
    THEORY_REVIEW: 'theory_review',
    PROJECT_WORK: 'project_work',
    ASSESSMENT: 'assessment',
    ONE_ON_ONE: 'one_on_one',
    GROUP: 'group'
};

const ATTENDANCE_STATUS = {
    PRESENT: 'present',
    ABSENT: 'absent',
    LATE: 'late',
    EXCUSED: 'excused'
};

/**
 * 🏗️ Enterprise Training Session Model
 * @class TrainingSession
 * @extends Model
 */
class TrainingSession extends Model {
    /**
     * 🏗️ Initialize the model with enterprise features
     */
    static init(sequelize) {
        return super.init({
            // 🆔 Primary Identification
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false
            },

            // 🔗 Relationship References
            enrollmentId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'enrollments',
                    key: 'id'
                },
                validate: {
                    notNull: { msg: 'Enrollment ID is required' },
                    notEmpty: { msg: 'Enrollment ID cannot be empty' }
                }
            },

            expertId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'experts',
                    key: 'id'
                },
                validate: {
                    notNull: { msg: 'Expert ID is required' },
                    notEmpty: { msg: 'Expert ID cannot be empty' }
                }
            },

            studentId: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: 'students',
                    key: 'id'
                },
                validate: {
                    notNull: { msg: 'Student ID is required' },
                    notEmpty: { msg: 'Student ID cannot be empty' }
                }
            },

            // 🎯 Session Core Information
            sessionNumber: {
                type: DataTypes.INTEGER,
                allowNull: false,
                validate: {
                    min: { args: [1], msg: 'Session number must be at least 1' },
                    max: { args: [50], msg: 'Session number cannot exceed 50' }
                }
            },

            title: {
                type: DataTypes.STRING(200),
                allowNull: false,
                validate: {
                    notNull: { msg: 'Session title is required' },
                    notEmpty: { msg: 'Session title cannot be empty' },
                    len: {
                        args: [5, 200],
                        msg: 'Session title must be between 5 and 200 characters'
                    }
                }
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 1000],
                        msg: 'Description cannot exceed 1000 characters'
                    }
                }
            },

            sessionType: {
                type: DataTypes.ENUM(...Object.values(SESSION_TYPES)),
                allowNull: false,
                defaultValue: SESSION_TYPES.PRACTICAL,
                validate: {
                    isIn: {
                        args: [Object.values(SESSION_TYPES)],
                        msg: 'Invalid session type'
                    }
                }
            },

            // 🕒 Session Timing & Duration
            scheduledStart: {
                type: DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: { msg: 'Scheduled start must be a valid date' },
                    isFuture: {
                        args: true,
                        msg: 'Scheduled start must be in the future'
                    }
                }
            },

            scheduledEnd: {
                type: DataTypes.DATE,
                allowNull: false,
                validate: {
                    isDate: { msg: 'Scheduled end must be a valid date' },
                    isAfterStart(value) {
                        if (value <= this.scheduledStart) {
                            throw new Error('Scheduled end must be after scheduled start');
                        }
                    }
                }
            },

            actualStart: {
                type: DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: { msg: 'Actual start must be a valid date' }
                }
            },

            actualEnd: {
                type: DataTypes.DATE,
                allowNull: true,
                validate: {
                    isDate: { msg: 'Actual end must be a valid date' },
                    isAfterActualStart(value) {
                        if (value && this.actualStart && value <= this.actualStart) {
                            throw new Error('Actual end must be after actual start');
                        }
                    }
                }
            },

            durationMinutes: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 120, // 2 hours default
                validate: {
                    min: { args: [30], msg: 'Session must be at least 30 minutes' },
                    max: { args: [240], msg: 'Session cannot exceed 4 hours' }
                }
            },

            // 📊 Attendance & Participation
            attendanceStatus: {
                type: DataTypes.ENUM(...Object.values(ATTENDANCE_STATUS)),
                allowNull: true,
                validate: {
                    isIn: {
                        args: [Object.values(ATTENDANCE_STATUS)],
                        msg: 'Invalid attendance status'
                    }
                }
            },

            studentJoinedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },

            expertJoinedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },

            joinDelayMinutes: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 0
            },

            // 🎯 Session Content & Progress
            learningObjectives: {
                type: DataTypes.JSON,
                allowNull: false,
                defaultValue: [],
                validate: {
                    isArrayOfStrings(value) {
                        if (!Array.isArray(value)) {
                            throw new Error('Learning objectives must be an array');
                        }
                        if (value.length === 0) {
                            throw new Error('At least one learning objective is required');
                        }
                        value.forEach(obj => {
                            if (typeof obj !== 'string' || obj.trim().length === 0) {
                                throw new Error('Learning objectives must be non-empty strings');
                            }
                        });
                    }
                }
            },

            completedObjectives: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: []
            },

            materialsUsed: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: []
            },

            sessionNotes: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 2000],
                        msg: 'Session notes cannot exceed 2000 characters'
                    }
                }
            },

            studentFeedback: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 1000],
                        msg: 'Student feedback cannot exceed 1000 characters'
                    }
                }
            },

            // ⭐ Quality & Rating Metrics
            studentRating: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: { args: [1], msg: 'Rating must be at least 1' },
                    max: { args: [5], msg: 'Rating cannot exceed 5' }
                }
            },

            studentFeedbackComments: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 500],
                        msg: 'Feedback comments cannot exceed 500 characters'
                    }
                }
            },

            expertSelfRating: {
                type: DataTypes.INTEGER,
                allowNull: true,
                validate: {
                    min: { args: [1], msg: 'Self-rating must be at least 1' },
                    max: { args: [5], msg: 'Self-rating cannot exceed 5' }
                }
            },

            qualityScore: {
                type: DataTypes.DECIMAL(3, 2),
                allowNull: true,
                validate: {
                    min: { args: [0], msg: 'Quality score cannot be negative' },
                    max: { args: [5], msg: 'Quality score cannot exceed 5' }
                }
            },

            // 🏗️ Session Status & Workflow
            status: {
                type: DataTypes.ENUM(...Object.values(SESSION_STATUS)),
                allowNull: false,
                defaultValue: SESSION_STATUS.SCHEDULED,
                validate: {
                    isIn: {
                        args: [Object.values(SESSION_STATUS)],
                        msg: 'Invalid session status'
                    }
                }
            },

            cancellationReason: {
                type: DataTypes.TEXT,
                allowNull: true,
                validate: {
                    len: {
                        args: [0, 500],
                        msg: 'Cancellation reason cannot exceed 500 characters'
                    }
                }
            },

            rescheduledFromId: {
                type: DataTypes.UUID,
                allowNull: true,
                references: {
                    model: 'training_sessions',
                    key: 'id'
                }
            },

            // 📍 Session Location & Medium
            locationType: {
                type: DataTypes.ENUM(['virtual', 'physical', 'hybrid']),
                allowNull: false,
                defaultValue: 'virtual'
            },

            meetingUrl: {
                type: DataTypes.STRING(500),
                allowNull: true,
                validate: {
                    isUrl: { msg: 'Meeting URL must be a valid URL' }
                }
            },

            physicalAddress: {
                type: DataTypes.JSON,
                allowNull: true
            },

            // 🔐 Security & Verification
            attendanceVerified: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },

            verificationMethod: {
                type: DataTypes.ENUM(['auto', 'manual', 'biometric', 'code']),
                allowNull: true
            },

            verificationCode: {
                type: DataTypes.STRING(6),
                allowNull: true
            },

            // 🎯 Progress Tracking
            progressPercentage: {
                type: DataTypes.DECIMAL(5, 2),
                allowNull: true,
                defaultValue: 0,
                validate: {
                    min: { args: [0], msg: 'Progress cannot be negative' },
                    max: { args: [100], msg: 'Progress cannot exceed 100%' }
                }
            },

            skillsPracticed: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: []
            },

            competenciesDemonstrated: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: []
            },

            // 📊 Analytics & Metadata
            metadata: {
                type: DataTypes.JSON,
                allowNull: true,
                defaultValue: {}
            },

            traceId: {
                type: DataTypes.UUID,
                allowNull: true
            }

        }, {
            sequelize,
            modelName: 'TrainingSession',
            tableName: 'training_sessions',
            timestamps: true,
            paranoid: true, // Soft deletes
            indexes: [
                // 🚀 Performance Indexes
                {
                    fields: ['enrollmentId', 'sessionNumber']
                },
                {
                    fields: ['expertId', 'scheduledStart']
                },
                {
                    fields: ['studentId', 'status']
                },
                {
                    fields: ['scheduledStart', 'status']
                },
                {
                    fields: ['attendanceVerified']
                },
                // 🔍 Composite indexes for common queries
                {
                    fields: ['expertId', 'status', 'scheduledStart']
                },
                {
                    fields: ['studentId', 'status', 'scheduledStart']
                }
            ],
            hooks: {
                // 🏗️ Enterprise Hooks for Business Logic
                beforeValidate: (session) => {
                    if (session.scheduledStart && session.scheduledEnd) {
                        const duration = Math.round(
                            (new Date(session.scheduledEnd) - new Date(session.scheduledStart)) / (1000 * 60)
                        );
                        session.durationMinutes = duration;
                    }

                    // Auto-generate verification code for new sessions
                    if (!session.id && !session.verificationCode && session.status === SESSION_STATUS.SCHEDULED) {
                        session.verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                    }
                },

                beforeUpdate: (session) => {
                    // Calculate join delay if both joined times are available
                    if (session.expertJoinedAt && session.studentJoinedAt && session.scheduledStart) {
                        const scheduledStart = new Date(session.scheduledStart);
                        const firstJoin = new Date(
                            session.expertJoinedAt < session.studentJoinedAt ? 
                            session.expertJoinedAt : session.studentJoinedAt
                        );
                        session.joinDelayMinutes = Math.round(
                            (firstJoin - scheduledStart) / (1000 * 60)
                        );
                    }

                    // Auto-calculate quality score
                    if (session.studentRating || session.expertSelfRating) {
                        session.qualityScore = session._calculateQualityScore();
                    }
                },

                afterUpdate: async (session) => {
                    // Update enrollment progress when session is completed
                    if (session.status === SESSION_STATUS.COMPLETED && session.changed('status')) {
                        await session._updateEnrollmentProgress();
                    }

                    // Update expert quality metrics
                    if (session.qualityScore && session.changed('qualityScore')) {
                        await session._updateExpertQualityMetrics();
                    }
                }
            }
        });
    }

    /**
     * 🏗️ Calculate Quality Score
     * @private
     */
    _calculateQualityScore() {
        let score = 0;
        let factors = 0;

        if (this.studentRating) {
            score += this.studentRating;
            factors++;
        }

        if (this.expertSelfRating) {
            score += this.expertSelfRating * 0.8; // Expert self-rating weighted lower
            factors += 0.8;
        }

        // Attendance and punctuality factors
        if (this.attendanceStatus === ATTENDANCE_STATUS.PRESENT) {
            score += 0.5;
            factors += 0.1;
        }

        if (this.joinDelayMinutes <= 5) { // On time or minimal delay
            score += 0.5;
            factors += 0.1;
        }

        return factors > 0 ? parseFloat((score / factors).toFixed(2)) : null;
    }

    /**
     * 🏗️ Update Enrollment Progress
     * @private
     */
    async _updateEnrollmentProgress() {
        try {
            const enrollment = await Enrollment.findByPk(this.enrollmentId);
            if (enrollment) {
                // Calculate overall progress based on completed sessions
                const totalSessions = await TrainingSession.count({
                    where: { enrollmentId: this.enrollmentId }
                });

                const completedSessions = await TrainingSession.count({
                    where: { 
                        enrollmentId: this.enrollmentId,
                        status: SESSION_STATUS.COMPLETED
                    }
                });

                const newProgress = totalSessions > 0 ? 
                    Math.round((completedSessions / totalSessions) * 100) : 0;

                await enrollment.update({ 
                    handsOnProgress: newProgress,
                    lastSessionDate: new Date()
                });
            }
        } catch (error) {
            console.error('Error updating enrollment progress:', error);
            // Don't throw error to prevent session update failure
        }
    }

    /**
     * 🏗️ Update Expert Quality Metrics
     * @private
     */
    async _updateExpertQualityMetrics() {
        try {
            const QualityMetrics = require('./QualityMetrics');
            await QualityMetrics.updateExpertSessionMetrics(this.expertId);
        } catch (error) {
            console.error('Error updating expert quality metrics:', error);
            // Don't throw error to prevent session update failure
        }
    }

    /**
     * 🏗️ Model Associations
     */
    static associate(models) {
        this.belongsTo(models.Enrollment, {
            foreignKey: 'enrollmentId',
            as: 'enrollment'
        });

        this.belongsTo(models.Expert, {
            foreignKey: 'expertId',
            as: 'expert'
        });

        this.belongsTo(models.Student, {
            foreignKey: 'studentId',
            as: 'student'
        });

        this.hasOne(models.TrainingSession, {
            foreignKey: 'rescheduledFromId',
            as: 'originalSession'
        });

        this.hasMany(models.SessionMaterial, {
            foreignKey: 'sessionId',
            as: 'materials'
        });

        this.hasMany(models.SessionRecording, {
            foreignKey: 'sessionId',
            as: 'recordings'
        });
    }

    /**
     * 🎯 INSTANCE METHODS
     */

    /**
     * 🏗️ Start Training Session
     * @returns {Promise<TrainingSession>}
     */
    async startSession() {
        if (this.status !== SESSION_STATUS.SCHEDULED) {
            throw new Error(`Cannot start session with status: ${this.status}`);
        }

        const now = new Date();
        return await this.update({
            status: SESSION_STATUS.IN_PROGRESS,
            actualStart: now,
            expertJoinedAt: now
        });
    }

    /**
     * 🏗️ Student Joins Session
     * @returns {Promise<TrainingSession>}
     */
    async studentJoin() {
        if (this.status !== SESSION_STATUS.IN_PROGRESS && this.status !== SESSION_STATUS.SCHEDULED) {
            throw new Error(`Cannot join session with status: ${this.status}`);
        }

        const updates = { studentJoinedAt: new Date() };
        
        if (this.status === SESSION_STATUS.SCHEDULED) {
            updates.status = SESSION_STATUS.IN_PROGRESS;
            updates.actualStart = new Date();
        }

        return await this.update(updates);
    }

    /**
     * 🏗️ Complete Training Session
     * @param {Object} completionData - Session completion data
     * @returns {Promise<TrainingSession>}
     */
    async completeSession(completionData = {}) {
        if (this.status !== SESSION_STATUS.IN_PROGRESS) {
            throw new Error(`Cannot complete session with status: ${this.status}`);
        }

        const now = new Date();
        const updates = {
            status: SESSION_STATUS.COMPLETED,
            actualEnd: now,
            attendanceStatus: ATTENDANCE_STATUS.PRESENT,
            attendanceVerified: true,
            ...completionData
        };

        // Calculate actual duration
        if (this.actualStart) {
            const actualDuration = Math.round((now - new Date(this.actualStart)) / (1000 * 60));
            updates.durationMinutes = actualDuration;
        }

        // Calculate progress percentage based on completed objectives
        if (completionData.completedObjectives) {
            const totalObjectives = this.learningObjectives.length;
            const completedCount = completionData.completedObjectives.length;
            updates.progressPercentage = totalObjectives > 0 ? 
                parseFloat(((completedCount / totalObjectives) * 100).toFixed(2)) : 100;
        } else {
            updates.progressPercentage = 100; // Assume full completion if no specific data
        }

        return await this.update(updates);
    }

    /**
     * 🏗️ Cancel Training Session
     * @param {string} reason - Cancellation reason
     * @param {string} cancelledBy - Who cancelled the session
     * @returns {Promise<TrainingSession>}
     */
    async cancelSession(reason, cancelledBy) {
        const allowedStatuses = [SESSION_STATUS.SCHEDULED, SESSION_STATUS.IN_PROGRESS];
        
        if (!allowedStatuses.includes(this.status)) {
            throw new Error(`Cannot cancel session with status: ${this.status}`);
        }

        return await this.update({
            status: SESSION_STATUS.CANCELLED,
            cancellationReason: reason,
            metadata: {
                ...this.metadata,
                cancelledBy,
                cancelledAt: new Date().toISOString()
            }
        });
    }

    /**
     * 🏗️ Reschedule Training Session
     * @param {Date} newStart - New start time
     * @param {Date} newEnd - New end time
     * @returns {Promise<TrainingSession>}
     */
    async rescheduleSession(newStart, newEnd) {
        if (this.status !== SESSION_STATUS.SCHEDULED) {
            throw new Error('Can only reschedule scheduled sessions');
        }

        if (newStart <= new Date()) {
            throw new Error('New session time must be in the future');
        }

        if (newEnd <= newStart) {
            throw new Error('Session end must be after start');
        }

        // Create a new session as rescheduled version
        const RescheduledSession = this.constructor;
        const newSession = await RescheduledSession.create({
            ...this.toJSON(),
            id: undefined, // Let DB generate new ID
            scheduledStart: newStart,
            scheduledEnd: newEnd,
            status: SESSION_STATUS.SCHEDULED,
            rescheduledFromId: this.id,
            verificationCode: Math.random().toString(36).substring(2, 8).toUpperCase()
        });

        // Mark current session as rescheduled
        await this.update({
            status: SESSION_STATUS.RESCHEDULED,
            metadata: {
                ...this.metadata,
                rescheduledTo: newSession.id,
                rescheduledAt: new Date().toISOString()
            }
        });

        return newSession;
    }

    /**
     * 🏗️ Verify Attendance
     * @param {string} method - Verification method
     * @returns {Promise<TrainingSession>}
     */
    async verifyAttendance(method = 'manual') {
        if (this.status !== SESSION_STATUS.COMPLETED) {
            throw new Error('Can only verify attendance for completed sessions');
        }

        return await this.update({
            attendanceVerified: true,
            verificationMethod: method,
            attendanceStatus: ATTENDANCE_STATUS.PRESENT
        });
    }

    /**
     * 🏗️ Add Student Rating
     * @param {number} rating - Rating from 1-5
     * @param {string} comments - Optional feedback comments
     * @returns {Promise<TrainingSession>}
     */
    async addStudentRating(rating, comments = '') {
        if (this.status !== SESSION_STATUS.COMPLETED) {
            throw new Error('Can only rate completed sessions');
        }

        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }

        return await this.update({
            studentRating: rating,
            studentFeedbackComments: comments,
            qualityScore: this._calculateQualityScore() // Recalculate with new rating
        });
    }

    /**
     * 🎯 CLASS METHODS
     */

    /**
     * 🏗️ Find Upcoming Sessions for User
     * @param {string} userId - Student or Expert ID
     * @param {string} userType - 'student' or 'expert'
     * @param {Object} options - Query options
     * @returns {Promise<Array<TrainingSession>>}
     */
    static async findUpcomingSessions(userId, userType, options = {}) {
        const whereClause = {
            status: SESSION_STATUS.SCHEDULED,
            scheduledStart: {
                [Op.gte]: new Date()
            }
        };

        if (userType === 'student') {
            whereClause.studentId = userId;
        } else if (userType === 'expert') {
            whereClause.expertId = userId;
        } else {
            throw new Error('Invalid user type. Must be "student" or "expert"');
        }

        return await this.findAll({
            where: whereClause,
            order: [['scheduledStart', 'ASC']],
            limit: options.limit || 10,
            include: options.include || []
        });
    }

    /**
     * 🏗️ Find Sessions Requiring Attention
     * @param {string} expertId - Expert ID
     * @returns {Promise<Object>}
     */
    static async findSessionsRequiringAttention(expertId) {
        const now = new Date();
        const fifteenMinutesAgo = new Date(now.getTime() - (15 * 60 * 1000));

        const pendingSessions = await this.findAll({
            where: {
                expertId,
                status: SESSION_STATUS.SCHEDULED,
                scheduledStart: {
                    [Op.lte]: now // Sessions that should have started
                }
            }
        });

        const inProgressWithoutStudent = await this.findAll({
            where: {
                expertId,
                status: SESSION_STATUS.IN_PROGRESS,
                studentJoinedAt: null,
                actualStart: {
                    [Op.lte]: fifteenMinutesAgo // Started but student hasn't joined
                }
            }
        });

        return {
            pending: pendingSessions,
            waitingForStudent: inProgressWithoutStudent
        };
    }

    /**
     * 🏗️ Calculate Expert Session Statistics
     * @param {string} expertId - Expert ID
     * @param {Date} startDate - Start date for period
     * @param {Date} endDate - End date for period
     * @returns {Promise<Object>}
     */
    static async calculateExpertStatistics(expertId, startDate, endDate) {
        const sessions = await this.findAll({
            where: {
                expertId,
                scheduledStart: {
                    [Op.between]: [startDate, endDate]
                }
            }
        });

        const totalSessions = sessions.length;
        const completedSessions = sessions.filter(s => s.status === SESSION_STATUS.COMPLETED).length;
        const cancelledSessions = sessions.filter(s => s.status === SESSION_STATUS.CANCELLED).length;
        const averageRating = sessions.reduce((sum, session) => 
            sum + (session.studentRating || 0), 0) / completedSessions || 0;

        const attendanceRate = completedSessions > 0 ? 
            (sessions.filter(s => s.attendanceStatus === ATTENDANCE_STATUS.PRESENT).length / completedSessions) * 100 : 0;

        const averageDelay = sessions.reduce((sum, session) => 
            sum + (session.joinDelayMinutes || 0), 0) / completedSessions || 0;

        return {
            totalSessions,
            completedSessions,
            cancelledSessions,
            completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
            averageRating: parseFloat(averageRating.toFixed(2)),
            attendanceRate: parseFloat(attendanceRate.toFixed(2)),
            averageDelay: parseFloat(averageDelay.toFixed(2))
        };
    }

    /**
     * 🏗️ Bulk Create Session Schedule
     * @param {string} enrollmentId - Enrollment ID
     * @param {Array} sessionTemplates - Array of session templates
     * @returns {Promise<Array<TrainingSession>>}
     */
    static async bulkCreateSessions(enrollmentId, sessionTemplates) {
        const enrollment = await Enrollment.findByPk(enrollmentId, {
            include: ['expert', 'student']
        });

        if (!enrollment) {
            throw new Error('Enrollment not found');
        }

        const sessions = sessionTemplates.map((template, index) => ({
            enrollmentId,
            expertId: enrollment.expertId,
            studentId: enrollment.studentId,
            sessionNumber: index + 1,
            title: template.title,
            description: template.description,
            sessionType: template.sessionType || SESSION_TYPES.PRACTICAL,
            scheduledStart: template.scheduledStart,
            scheduledEnd: template.scheduledEnd,
            learningObjectives: template.learningObjectives || [],
            locationType: template.locationType || 'virtual',
            meetingUrl: template.meetingUrl,
            metadata: {
                ...template.metadata,
                createdBy: 'system',
                batchCreated: true
            }
        }));

        return await this.bulkCreate(sessions, {
            validate: true,
            returning: true
        });
    }
}

// 🏗️ Export Constants and Model
module.exports = {
    TrainingSession,
    SESSION_STATUS,
    SESSION_TYPES,
    ATTENDANCE_STATUS
};