/**
 * 🎯 MOSA FORGE: Enterprise Multi-Course Manager
 * 
 * @module CourseManager
 * @description Manages multiple course enrollments, payments, and progress tracking
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Multi-course enrollment with payment verification
 * - Mindset phase skipping for returning students
 * - Cross-course progress tracking
 * - Payment validation and revenue distribution
 * - Expert matching optimization
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');

// 🏗️ Enterprise Constants
const COURSE_MANAGEMENT_STATES = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    PAUSED: 'paused',
    CANCELLED: 'cancelled',
    UPGRADED: 'upgraded'
};

const MINDSTREAM_OPTIONS = {
    REQUIRED: 'required',
    OPTIONAL: 'optional',
    SKIPPED: 'skipped',
    COMPLETED: 'completed'
};

const PAYMENT_REQUIREMENTS = {
    NEW_COURSE: 1999,
    MINDSTREAM_SKIP: 0,
    BUNDLE_DISCOUNT: 1799 // 10% discount for bundle purchases
};

/**
 * 🏗️ Enterprise Course Manager Class
 * @class CourseManager
 * @extends EventEmitter
 */
class CourseManager extends EventEmitter {
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
            maxConcurrentCourses: options.maxConcurrentCourses || 3,
            mindsetSkipEligibility: options.mindsetSkipEligibility || 0.8, // 80% completion
            paymentGateway: options.paymentGateway || 'telebirr'
        };

        // 🏗️ Service Dependencies
        this.redis = new Redis(this.config.redis);
        this.prisma = this.config.prisma;
        this.circuitBreaker = this._initializeCircuitBreaker();

        // 🏗️ Performance Monitoring
        this.metrics = {
            multiEnrollments: 0,
            mindsetSkips: 0,
            bundlePurchases: 0,
            crossCourseProgress: 0,
            averageProcessingTime: 0
        };

        this._initializeEventHandlers();
        this._startHealthChecks();
    }

    /**
     * 🏗️ Initialize Circuit Breaker for Fault Tolerance
     * @private
     */
    _initializeCircuitBreaker() {
        let state = 'CLOSED';
        let failureCount = 0;
        const failureThreshold = 5;
        const resetTimeout = 60000;
        let lastFailureTime = null;

        return {
            execute: async (operation) => {
                if (state === 'OPEN') {
                    if (Date.now() - lastFailureTime > resetTimeout) {
                        state = 'HALF_OPEN';
                    } else {
                        throw new Error('Circuit breaker is OPEN');
                    }
                }

                try {
                    const result = await operation();
                    if (state === 'HALF_OPEN') {
                        failureCount = 0;
                        state = 'CLOSED';
                    }
                    return result;
                } catch (error) {
                    failureCount++;
                    lastFailureTime = Date.now();

                    if (failureCount >= failureThreshold) {
                        state = 'OPEN';
                    }
                    throw error;
                }
            },
            getState: () => state
        };
    }

    /**
     * 🏗️ Initialize Enterprise Event Handlers
     * @private
     */
    _initializeEventHandlers() {
        this.on('multi_course.enrollment_started', (data) => {
            this._logEvent('MULTI_COURSE_ENROLLMENT_STARTED', data);
            this.metrics.multiEnrollments++;
        });

        this.on('mindset.skipped', (data) => {
            this._logEvent('MINDSET_SKIPPED', data);
            this.metrics.mindsetSkips++;
        });

        this.on('bundle.purchased', (data) => {
            this._logEvent('BUNDLE_PURCHASED', data);
            this.metrics.bundlePurchases++;
        });

        this.on('cross_course.progress_updated', (data) => {
            this._logEvent('CROSS_COURSE_PROGRESS_UPDATED', data);
            this.metrics.crossCourseProgress++;
        });

        this.on('payment.verified', (data) => {
            this._logEvent('PAYMENT_VERIFIED', data);
        });
    }

    /**
     * 🎯 MAIN ENTERPRISE METHOD: Enroll in Additional Course
     * @param {Object} enrollmentData - Additional course enrollment data
     * @returns {Promise<Object>} Multi-course enrollment result
     */
    async enrollInAdditionalCourse(enrollmentData) {
        const startTime = performance.now();
        const enrollmentId = uuidv4();
        const traceId = enrollmentData.traceId || uuidv4();

        try {
            this.emit('multi_course.enrollment_started', { enrollmentId, traceId, enrollmentData });

            // 🏗️ Enterprise Validation Chain
            await this._validateMultiCourseEligibility(enrollmentData.studentId);
            await this._validateNewCourseData(enrollmentData);
            await this._checkExistingCourseConflict(enrollmentData.studentId, enrollmentData.skillId);

            // 🏗️ Payment Processing for New Course
            const paymentResult = await this._processAdditionalCoursePayment(enrollmentData);
            
            // 🏗️ Mindset Phase Decision Logic
            const mindsetDecision = await this._determineMindsetRequirement(enrollmentData.studentId, enrollmentData);
            
            // 🏗️ Expert Matching for New Course
            const expert = await this._findQualifiedExpertForAdditionalCourse(
                enrollmentData.skillId, 
                enrollmentData.studentId
            );

            // 🏗️ Create Additional Enrollment Record
            const enrollment = await this._createAdditionalEnrollmentRecord({
                ...enrollmentData,
                enrollmentId,
                expertId: expert.id,
                traceId,
                mindsetOption: mindsetDecision.option,
                paymentId: paymentResult.paymentId
            });

            // 🏗️ Initialize Learning Progress with Mindset Decision
            await this._initializeAdditionalCourseProgress(
                enrollment.id, 
                enrollmentData.skillId, 
                mindsetDecision
            );

            const processingTime = performance.now() - startTime;
            this._updateMetrics(processingTime);

            const result = {
                success: true,
                enrollmentId: enrollment.id,
                expertId: expert.id,
                expertName: expert.name,
                courseType: 'ADDITIONAL',
                mindsetStatus: mindsetDecision,
                payment: {
                    amount: paymentResult.amount,
                    mindsetSaving: mindsetDecision.option === MINDSTREAM_OPTIONS.SKIPPED ? 0 : 0,
                    revenueSplit: paymentResult.revenueSplit
                },
                courseTimeline: this._getAdditionalCourseTimeline(mindsetDecision),
                multiCourseSummary: await this._getStudentCourseSummary(enrollmentData.studentId),
                traceId
            };

            this.emit('multi_course.enrollment_completed', result);
            this._logSuccess('ADDITIONAL_COURSE_ENROLLED', { enrollmentId, processingTime });

            return result;

        } catch (error) {
            const processingTime = performance.now() - startTime;
            this._updateMetrics(processingTime);

            const errorResult = {
                success: false,
                error: error.message,
                errorCode: error.code || 'MULTI_COURSE_ENROLLMENT_FAILED',
                enrollmentId,
                traceId,
                timestamp: new Date().toISOString()
            };

            this.emit('multi_course.enrollment_failed', errorResult);
            this._logError('ADDITIONAL_COURSE_ENROLLMENT_FAILED', error, { enrollmentId, traceId });

            throw this._formatEnterpriseError(error);
        }
    }

    /**
     * 🏗️ Validate Multi-Course Eligibility
     * @private
     */
    async _validateMultiCourseEligibility(studentId) {
        // Check student exists and is active
        const student = await this.prisma.student.findUnique({
            where: { id: studentId },
            include: {
                enrollments: {
                    where: {
                        status: {
                            in: [COURSE_MANAGEMENT_STATES.ACTIVE, COURSE_MANAGEMENT_STATES.PAUSED]
                        }
                    }
                }
            }
        });

        if (!student) {
            throw new Error('Student not found');
        }

        if (student.status !== 'ACTIVE') {
            throw new Error('Student account is not active');
        }

        // Check concurrent course limit
        const activeEnrollments = student.enrollments.filter(e => 
            e.status === COURSE_MANAGEMENT_STATES.ACTIVE
        );

        if (activeEnrollments.length >= this.config.maxConcurrentCourses) {
            throw new Error(`Maximum concurrent courses (${this.config.maxConcurrentCourses}) reached`);
        }

        return true;
    }

    /**
     * 🏗️ Validate New Course Data
     * @private
     */
    async _validateNewCourseData(enrollmentData) {
        const requiredFields = ['studentId', 'skillId', 'paymentMethod'];
        const missingFields = requiredFields.filter(field => !enrollmentData[field]);

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Validate skill exists and is available
        const skill = await this.prisma.skill.findUnique({
            where: { id: enrollmentData.skillId },
            select: { id: true, name: true, isActive: true, category: true }
        });

        if (!skill || !skill.isActive) {
            throw new Error('Skill is not available for enrollment');
        }

        // Validate payment method
        const validPaymentMethods = ['telebirr', 'cbebirr', 'bank_transfer'];
        if (!validPaymentMethods.includes(enrollmentData.paymentMethod)) {
            throw new Error('Invalid payment method');
        }

        return true;
    }

    /**
     * 🏗️ Check Existing Course Conflict
     * @private
     */
    async _checkExistingCourseConflict(studentId, skillId) {
        const existingEnrollment = await this.prisma.enrollment.findFirst({
            where: {
                studentId,
                skillId,
                status: {
                    in: [COURSE_MANAGEMENT_STATES.ACTIVE, COURSE_MANAGEMENT_STATES.PAUSED]
                }
            }
        });

        if (existingEnrollment) {
            throw new Error('Student already has an active or paused enrollment for this skill');
        }

        return true;
    }

    /**
     * 🏗️ Process Additional Course Payment
     * @private
     */
    async _processAdditionalCoursePayment(enrollmentData) {
        return await this.circuitBreaker.execute(async () => {
            const amount = PAYMENT_REQUIREMENTS.NEW_COURSE;
            
            // Check for bundle discount eligibility
            const bundleEligible = await this._checkBundleEligibility(enrollmentData.studentId);
            const finalAmount = bundleEligible ? PAYMENT_REQUIREMENTS.BUNDLE_DISCOUNT : amount;

            // Create payment record
            const payment = await this.prisma.payment.create({
                data: {
                    studentId: enrollmentData.studentId,
                    amount: finalAmount,
                    currency: 'ETB',
                    paymentMethod: enrollmentData.paymentMethod,
                    status: 'PENDING',
                    type: 'ADDITIONAL_COURSE',
                    metadata: {
                        bundleEligible,
                        originalAmount: amount,
                        discount: bundleEligible ? amount - finalAmount : 0,
                        revenueSplit: {
                            mosa: Math.floor(finalAmount * 0.5003), // 50.03%
                            expert: Math.floor(finalAmount * 0.4997) // 49.97%
                        }
                    }
                }
            });

            // In production, this would integrate with payment gateway
            const paymentResult = await this._executePaymentGatewayTransaction({
                paymentId: payment.id,
                amount: finalAmount,
                method: enrollmentData.paymentMethod,
                studentId: enrollmentData.studentId
            });

            if (paymentResult.success) {
                await this.prisma.payment.update({
                    where: { id: payment.id },
                    data: { 
                        status: 'COMPLETED',
                        transactionId: paymentResult.transactionId,
                        completedAt: new Date()
                    }
                });

                this.emit('payment.verified', {
                    paymentId: payment.id,
                    amount: finalAmount,
                    studentId: enrollmentData.studentId,
                    bundleDiscount: bundleEligible
                });

                return {
                    paymentId: payment.id,
                    amount: finalAmount,
                    revenueSplit: payment.metadata.revenueSplit,
                    bundleDiscount: bundleEligible
                };
            } else {
                throw new Error(`Payment failed: ${paymentResult.error}`);
            }
        });
    }

    /**
     * 🏗️ Check Bundle Purchase Eligibility
     * @private
     */
    async _checkBundleEligibility(studentId) {
        // Students with completed courses are eligible for bundle discounts
        const completedCourses = await this.prisma.enrollment.count({
            where: {
                studentId,
                status: COURSE_MANAGEMENT_STATES.COMPLETED
            }
        });

        return completedCourses >= 1; // Eligible after first completed course
    }

    /**
     * 🏗️ Determine Mindset Requirement for Additional Course
     * @private
     */
    async _determineMindsetRequirement(studentId, enrollmentData) {
        // Check if student wants to skip mindset
        const skipMindset = enrollmentData.skipMindset === true;

        if (!skipMindset) {
            return {
                option: MINDSTREAM_OPTIONS.REQUIRED,
                reason: 'Student opted for mindset phase',
                cost: 0 // Mindset is always free
            };
        }

        // Check mindset completion eligibility
        const mindsetEligibility = await this._checkMindsetSkipEligibility(studentId);

        if (mindsetEligibility.eligible) {
            this.emit('mindset.skipped', {
                studentId,
                skillId: enrollmentData.skillId,
                reason: mindsetEligibility.reason
            });

            return {
                option: MINDSTREAM_OPTIONS.SKIPPED,
                reason: mindsetEligibility.reason,
                cost: 0,
                timeSaved: '4 weeks'
            };
        } else {
            return {
                option: MINDSTREAM_OPTIONS.REQUIRED,
                reason: mindsetEligibility.reason,
                cost: 0
            };
        }
    }

    /**
     * 🏗️ Check Mindset Skip Eligibility
     * @private
     */
    async _checkMindsetSkipEligibility(studentId) {
        // Check if student has completed mindset in previous course
        const previousMindsetCompletion = await this.prisma.learningProgress.findFirst({
            where: {
                enrollment: {
                    studentId,
                    status: COURSE_MANAGEMENT_STATES.COMPLETED
                },
                phase: 'MINDSET',
                progress: {
                    gte: this.config.mindsetSkipEligibility * 100 // 80% completion
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        if (previousMindsetCompletion) {
            return {
                eligible: true,
                reason: 'Previously completed mindset phase with excellent progress',
                previousCompletionRate: previousMindsetCompletion.progress
            };
        }

        // Check if student has active mindset in another course
        const activeMindset = await this.prisma.learningProgress.findFirst({
            where: {
                enrollment: {
                    studentId,
                    status: COURSE_MANAGEMENT_STATES.ACTIVE
                },
                phase: 'MINDSET',
                progress: {
                    gte: 50 // At least 50% completed in current mindset
                }
            }
        });

        if (activeMindset) {
            return {
                eligible: true,
                reason: 'Currently active mindset phase with good progress',
                currentProgress: activeMindset.progress
            };
        }

        return {
            eligible: false,
            reason: 'No eligible mindset completion found'
        };
    }

    /**
     * 🏗️ Find Qualified Expert for Additional Course
     * @private
     */
    async _findQualifiedExpertForAdditionalCourse(skillId, studentId) {
        // Get student's previous experts for preference matching
        const previousEnrollments = await this.prisma.enrollment.findMany({
            where: {
                studentId,
                status: {
                    in: [COURSE_MANAGEMENT_STATES.COMPLETED, COURSE_MANAGEMENT_STATES.ACTIVE]
                }
            },
            include: {
                expert: true
            }
        });

        const preferredExperts = previousEnrollments
            .filter(e => e.expert.qualityScore >= 4.0)
            .map(e => e.expertId);

        const experts = await this.prisma.expert.findMany({
            where: {
                skills: {
                    some: {
                        skillId,
                        isVerified: true
                    }
                },
                status: 'ACTIVE',
                tier: {
                    in: ['MASTER', 'SENIOR', 'STANDARD']
                },
                currentStudents: {
                    lt: this.prisma.expert.fields.maxStudents
                },
                qualityScore: {
                    gte: 4.0
                }
            },
            include: {
                _count: {
                    select: {
                        enrollments: {
                            where: {
                                status: 'ACTIVE'
                            }
                        }
                    }
                },
                qualityMetrics: {
                    select: {
                        completionRate: true,
                        averageRating: true,
                        responseTime: true
                    }
                }
            }
        });

        if (experts.length === 0) {
            throw new Error('No qualified experts available for this skill');
        }

        // 🎯 Enhanced Matching Algorithm with Student Preference
        const rankedExperts = experts.map(expert => ({
            ...expert,
            matchScore: this._calculateExpertMatchScore(expert, preferredExperts)
        })).sort((a, b) => b.matchScore - a.matchScore);

        const selectedExpert = rankedExperts[0];

        this.emit('expert.matched', {
            expertId: selectedExpert.id,
            skillId,
            studentId,
            matchScore: selectedExpert.matchScore,
            preferredExpert: preferredExperts.includes(selectedExpert.id)
        });

        return selectedExpert;
    }

    /**
     * 🏗️ Enhanced Expert Match Scoring Algorithm
     * @private
     */
    _calculateExpertMatchScore(expert, preferredExperts) {
        let score = 0;

        // Tier-based scoring
        const tierWeights = {
            MASTER: 1.0,
            SENIOR: 0.8,
            STANDARD: 0.6
        };

        score += tierWeights[expert.tier] * 30;

        // Quality score weighting
        score += expert.qualityScore * 20;

        // Student preference bonus
        if (preferredExperts.includes(expert.id)) {
            score += 15; // Bonus for previous successful experts
        }

        // Completion rate weighting
        if (expert.qualityMetrics?.completionRate) {
            score += expert.qualityMetrics.completionRate * 25;
        }

        // Response time weighting
        if (expert.qualityMetrics?.responseTime) {
            const responseScore = Math.max(0, 24 - expert.qualityMetrics.responseTime) / 24 * 10;
            score += responseScore;
        }

        // Load balancing
        const loadFactor = 1 - (expert.currentStudents / expert.maxStudents);
        score += loadFactor * 10;

        return Math.min(100, score);
    }

    /**
     * 🏗️ Create Additional Enrollment Record
     * @private
     */
    async _createAdditionalEnrollmentRecord(enrollmentData) {
        return await this.prisma.$transaction(async (tx) => {
            // Create enrollment
            const enrollment = await tx.enrollment.create({
                data: {
                    id: enrollmentData.enrollmentId,
                    studentId: enrollmentData.studentId,
                    expertId: enrollmentData.expertId,
                    skillId: enrollmentData.skillId,
                    paymentId: enrollmentData.paymentId,
                    status: COURSE_MANAGEMENT_STATES.ACTIVE,
                    startDate: new Date(),
                    expectedEndDate: new Date(Date.now() + (120 * 24 * 60 * 60 * 1000)), // 4 months
                    currentPhase: enrollmentData.mindsetOption === MINDSTREAM_OPTIONS.SKIPPED ? 'THEORY' : 'MINDSET',
                    isAdditionalCourse: true,
                    traceId: enrollmentData.traceId,
                    metadata: {
                        bundleType: 'ADDITIONAL_1999',
                        mindsetOption: enrollmentData.mindsetOption,
                        revenueSplit: {
                            mosa: Math.floor(enrollmentData.paymentAmount * 0.5003),
                            expert: Math.floor(enrollmentData.paymentAmount * 0.4997)
                        },
                        payoutSchedule: [
                            { phase: 'START', amount: 333, paid: false },
                            { phase: 'MIDPOINT', amount: 333, paid: false },
                            { phase: 'COMPLETION', amount: 333, paid: false }
                        ]
                    }
                }
            });

            // Update expert student count
            await tx.expert.update({
                where: { id: enrollmentData.expertId },
                data: {
                    currentStudents: {
                        increment: 1
                    }
                }
            });

            // Update student multi-course status
            await tx.student.update({
                where: { id: enrollmentData.studentId },
                data: {
                    totalCourses: {
                        increment: 1
                    },
                    lastCourseEnrollment: new Date()
                }
            });

            return enrollment;
        });
    }

    /**
     * 🏗️ Initialize Additional Course Progress
     * @private
     */
    async _initializeAdditionalCourseProgress(enrollmentId, skillId, mindsetDecision) {
        const skillConfig = await this.prisma.skillConfig.findUnique({
            where: { skillId }
        });

        if (!skillConfig) {
            throw new Error('Skill configuration not found');
        }

        // Initialize learning phases based on mindset decision
        const phases = mindsetDecision.option === MINDSTREAM_OPTIONS.SKIPPED 
            ? ['THEORY', 'HANDS_ON', 'CERTIFICATION']
            : ['MINDSET', 'THEORY', 'HANDS_ON', 'CERTIFICATION'];

        for (const phase of phases) {
            const progress = phase === 'MINDSET' ? 0 : 
                           phase === 'THEORY' && mindsetDecision.option === MINDSTREAM_OPTIONS.SKIPPED ? 0 : -1;

            await this.prisma.learningProgress.create({
                data: {
                    enrollmentId,
                    phase,
                    progress,
                    completedExercises: 0,
                    totalExercises: this._getPhaseExerciseCount(phase, skillConfig),
                    lastActivity: phase === 'MINDSET' || 
                                (phase === 'THEORY' && mindsetDecision.option === MINDSTREAM_OPTIONS.SKIPPED) 
                                ? new Date() : null,
                    metadata: {
                        mindsetSkipped: mindsetDecision.option === MINDSTREAM_OPTIONS.SKIPPED,
                        skipReason: mindsetDecision.reason
                    }
                }
            });
        }

        // If mindset skipped, create a skipped record for tracking
        if (mindsetDecision.option === MINDSTREAM_OPTIONS.SKIPPED) {
            await this.prisma.mindsetSkipRecord.create({
                data: {
                    enrollmentId,
                    reason: mindsetDecision.reason,
                    previousCompletion: mindsetDecision.previousCompletionRate,
                    timeSaved: '4 weeks',
                    approvedAt: new Date()
                }
            });
        }
    }

    /**
     * 🏗️ Get Additional Course Timeline
     * @private
     */
    _getAdditionalCourseTimeline(mindsetDecision) {
        const baseTimeline = {
            phase1: {
                name: 'Mindset Foundation',
                duration: '4 weeks',
                status: mindsetDecision.option === MINDSTREAM_OPTIONS.SKIPPED ? 'SKIPPED' : 'ACTIVE',
                startDate: new Date(),
                endDate: new Date(Date.now() + (28 * 24 * 60 * 60 * 1000)),
                note: mindsetDecision.reason
            },
            phase2: {
                name: 'Theory Mastery',
                duration: '2 months',
                status: mindsetDecision.option === MINDSTREAM_OPTIONS.SKIPPED ? 'ACTIVE' : 'UPCOMING',
                startDate: mindsetDecision.option === MINDSTREAM_OPTIONS.SKIPPED ? 
                    new Date() : new Date(Date.now() + (28 * 24 * 60 * 60 * 1000))
            },
            phase3: {
                name: 'Hands-on Immersion',
                duration: '2 months',
                status: 'UPCOMING',
                startDate: mindsetDecision.option === MINDSTREAM_OPTIONS.SKIPPED ?
                    new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)) :
                    new Date(Date.now() + (28 * 24 * 60 * 60 * 1000) + (60 * 24 * 60 * 60 * 1000))
            },
            phase4: {
                name: 'Certification & Launch',
                duration: '2 weeks',
                status: 'UPCOMING',
                startDate: mindsetDecision.option === MINDSTREAM_OPTIONS.SKIPPED ?
                    new Date(Date.now() + (120 * 24 * 60 * 60 * 1000)) :
                    new Date(Date.now() + (28 * 24 * 60 * 60 * 1000) + (120 * 24 * 60 * 60 * 1000))
            }
        };

        return baseTimeline;
    }

    /**
     * 🏗️ Get Student Course Summary
     * @private
     */
    async _getStudentCourseSummary(studentId) {
        const enrollments = await this.prisma.enrollment.findMany({
            where: { studentId },
            include: {
                skill: {
                    select: { name: true, category: true }
                },
                expert: {
                    select: { name: true, tier: true }
                },
                learningProgress: {
                    select: { phase: true, progress: true }
                }
            },
            orderBy: { startDate: 'desc' }
        });

        return {
            totalCourses: enrollments.length,
            activeCourses: enrollments.filter(e => e.status === COURSE_MANAGEMENT_STATES.ACTIVE).length,
            completedCourses: enrollments.filter(e => e.status === COURSE_MANAGEMENT_STATES.COMPLETED).length,
            courses: enrollments.map(e => ({
                skill: e.skill.name,
                category: e.skill.category,
                status: e.status,
                startDate: e.startDate,
                expert: e.expert.name,
                tier: e.expert.tier,
                progress: e.learningProgress.reduce((acc, lp) => {
                    acc[lp.phase] = lp.progress;
                    return acc;
                }, {})
            }))
        };
    }

    /**
     * 🎯 Get Student Multi-Course Dashboard
     * @param {string} studentId - Student ID
     * @returns {Promise<Object>} Multi-course dashboard
     */
    async getStudentMultiCourseDashboard(studentId) {
        try {
            const courseSummary = await this._getStudentCourseSummary(studentId);
            const activeEnrollments = courseSummary.courses.filter(c => c.status === 'active');

            const dashboard = {
                studentId,
                summary: courseSummary,
                activeCourses: activeEnrollments.map(course => ({
                    skill: course.skill,
                    progress: course.progress,
                    currentPhase: Object.keys(course.progress).find(phase => 
                        course.progress[phase] >= 0 && course.progress[phase] < 100
                    ) || 'COMPLETED',
                    nextMilestone: this._getNextMilestone(course.progress),
                    timeRemaining: this._calculateTimeRemaining(course.startDate)
                })),
                recommendations: await this._getCourseRecommendations(studentId),
                bundleEligibility: await this._checkBundleEligibility(studentId),
                mindsetEligibility: await this._checkMindsetSkipEligibility(studentId)
            };

            this.emit('dashboard.generated', { studentId, dashboard });
            return dashboard;

        } catch (error) {
            this._logError('DASHBOARD_GENERATION_FAILED', error, { studentId });
            throw this._formatEnterpriseError(error);
        }
    }

    /**
     * 🏗️ Get Next Milestone for Course
     * @private
     */
    _getNextMilestone(progress) {
        const phases = ['MINDSET', 'THEORY', 'HANDS_ON', 'CERTIFICATION'];
        for (const phase of phases) {
            if (progress[phase] < 100 && progress[phase] >= 0) {
                return {
                    phase,
                    currentProgress: progress[phase],
                    target: 100,
                    exercisesRemaining: Math.ceil((100 - progress[phase]) / 100 * 20) // Estimated
                };
            }
        }
        return { phase: 'COMPLETED', currentProgress: 100, target: 100 };
    }

    /**
     * 🏗️ Calculate Time Remaining
     * @private
     */
    _calculateTimeRemaining(startDate) {
        const elapsed = Date.now() - new Date(startDate).getTime();
        const totalDuration = 120 * 24 * 60 * 60 * 1000; // 120 days
        const remaining = totalDuration - elapsed;
        
        return {
            days: Math.ceil(remaining / (24 * 60 * 60 * 1000)),
            percentage: Math.min(100, (elapsed / totalDuration) * 100)
        };
    }

    /**
     * 🏗️ Get Course Recommendations
     * @private
     */
    async _getCourseRecommendations(studentId) {
        const studentEnrollments = await this.prisma.enrollment.findMany({
            where: { studentId },
            include: {
                skill: {
                    select: { category: true }
                }
            }
        });

        const enrolledCategories = [...new Set(studentEnrollments.map(e => e.skill.category))];
        
        // Recommend skills from different categories for diversity
        const recommendedSkills = await this.prisma.skill.findMany({
            where: {
                isActive: true,
                category: {
                    notIn: enrolledCategories
                }
            },
            take: 5,
            select: {
                id: true,
                name: true,
                category: true,
                description: true,
                averageCompletionTime: true
            }
        });

        return {
        basedOn: 'category_diversity',
        skills: recommendedSkills,
        note: 'Explore new skill categories to expand your expertise'
        };
    }

    /**
     * 🏗️ Execute Payment Gateway Transaction
     * @private
     */
    async _executePaymentGatewayTransaction(paymentData) {
        // This would integrate with Telebirr, CBE Birr, or other payment gateways
        // For now, simulating successful payment
        return {
            success: true,
            transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            gateway: this.config.paymentGateway,
            amount: paymentData.amount,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 🏗️ Get Phase Exercise Count
     * @private
     */
    _getPhaseExerciseCount(phase, skillConfig) {
        const exerciseCounts = {
            MINDSET: 20,
            THEORY: skillConfig.theoryExercises || 100,
            HANDS_ON: skillConfig.practicalExercises || 50,
            CERTIFICATION: skillConfig.assessmentExercises || 10
        };

        return exerciseCounts[phase] || 0;
    }

    /**
     * 🏗️ Update Performance Metrics
     * @private
     */
    _updateMetrics(processingTime) {
        const totalOperations = this.metrics.multiEnrollments + this.metrics.mindsetSkips;
        if (totalOperations > 0) {
            this.metrics.averageProcessingTime = 
                (this.metrics.averageProcessingTime * (totalOperations - 1) + processingTime) / totalOperations;
        }
    }

    /**
     * 🏗️ Format Enterprise Error
     * @private
     */
    _formatEnterpriseError(error) {
        const enterpriseError = new Error(error.message);
        enterpriseError.code = error.code || 'INTERNAL_ERROR';
        enterpriseError.timestamp = new Date().toISOString();
        enterpriseError.severity = this._getErrorSeverity(error.code);
        
        return enterpriseError;
    }

    /**
     * 🏗️ Get Error Severity
     * @private
     */
    _getErrorSeverity(errorCode) {
        const severityMap = {
            'PAYMENT_FAILED': 'HIGH',
            'EXPERT_UNAVAILABLE': 'MEDIUM',
            'MINDSTREAM_INELIGIBLE': 'LOW',
            'COURSE_CONFLICT': 'MEDIUM',
            'CAPACITY_EXCEEDED': 'MEDIUM',
            'INTERNAL_ERROR': 'CRITICAL'
        };

        return severityMap[errorCode] || 'MEDIUM';
    }

    /**
     * 🏗️ Enterprise Logging
     * @private
     */
    _logEvent(eventType, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            service: 'multi-course-manager',
            event: eventType,
            data,
            environment: process.env.NODE_ENV || 'development'
        };

        console.log(JSON.stringify(logEntry));

        // In production, this would send to centralized logging
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
     * 🏗️ Start Health Checks
     * @private
     */
    _startHealthChecks() {
        setInterval(() => {
            this._checkHealth();
        }, 30000);
    }

    /**
     * 🏗️ Health Check Implementation
     * @private
     */
    async _checkHealth() {
        const health = {
            service: 'multi-course-manager',
            timestamp: new Date().toISOString(),
            status: 'healthy',
            metrics: this.metrics,
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

        await this.redis.set(
            `health:multi-course-manager:${Date.now()}`,
            JSON.stringify(health),
            'EX',
            60
        );

        this.emit('health.check', health);
    }

    /**
     * 🏗️ Get Service Metrics
     * @returns {Object} Service performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            circuitBreakerState: this.circuitBreaker.getState(),
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
    CourseManager,
    COURSE_MANAGEMENT_STATES,
    MINDSTREAM_OPTIONS,
    PAYMENT_REQUIREMENTS
};

// 🏗️ Singleton Instance for Microservice Architecture
let courseManagerInstance = null;

module.exports.getInstance = (options = {}) => {
    if (!courseManagerInstance) {
        courseManagerInstance = new CourseManager(options);
    }
    return courseManagerInstance;
};