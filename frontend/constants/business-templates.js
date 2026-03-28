/**
 * 🎯 MOSA FORGE: Enterprise Business Templates & Configuration
 * 
 * @module BusinessTemplates
 * @description Centralized business logic, templates, and configuration constants
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Revenue distribution templates
 * - Quality guarantee configurations
 * - Payment schedule templates
 * - Expert tier definitions
 * - Course progression templates
 */

// 🏗️ Enterprise Validation
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

/**
 * 🎯 BUSINESS MODEL TEMPLATES
 */
const REVENUE_DISTRIBUTION = Object.freeze({
    BUNDLE_PRICE: 1999,
    MOSA_PLATFORM: 1000,
    EXPERT_EARNINGS: 999,
    
    // 🏗️ Revenue Split Configuration
    SPLIT_TEMPLATE: {
        mosa: {
            amount: 1000,
            percentage: 50.03,
            allocation: {
                platformOperations: 400,
                qualityEnforcement: 300,
                profitGrowth: 300
            }
        },
        expert: {
            amount: 999,
            percentage: 49.97,
            payoutSchedule: [333, 333, 333]
        }
    },

    // 🏗️ Payout Schedule Template
    PAYOUT_SCHEDULE: Object.freeze({
        PHASES: [
            {
                phase: 'COURSE_START',
                amount: 333,
                trigger: 'ENROLLMENT_COMPLETION',
                conditions: ['PAYMENT_VERIFIED', 'EXPERT_ASSIGNED']
            },
            {
                phase: 'MIDPOINT_COMPLETION',
                amount: 333,
                trigger: '75%_PROGRESS',
                conditions: ['THEORY_PHASE_COMPLETE', 'QUALITY_CHECK_PASSED']
            },
            {
                phase: 'CERTIFICATION',
                amount: 333,
                trigger: 'COURSE_COMPLETION',
                conditions: ['FINAL_ASSESSMENT_PASSED', 'YACHI_VERIFICATION_COMPLETE']
            }
        ],
        TIMELINE: {
            upfront: 'Day 1',
            milestone: 'Month 2.5',
            completion: 'Month 4'
        }
    }),

    // 🏗️ Performance Bonus Structure
    PERFORMANCE_BONUSES: Object.freeze({
        MASTER_TIER: {
            threshold: 4.7,
            bonusPercentage: 20,
            additionalAmount: 199.8,
            totalEarnings: 1198.8
        },
        SENIOR_TIER: {
            threshold: 4.3,
            bonusPercentage: 10,
            additionalAmount: 99.9,
            totalEarnings: 1098.9
        },
        STANDARD_TIER: {
            threshold: 4.0,
            bonusPercentage: 0,
            additionalAmount: 0,
            totalEarnings: 999
        },
        PENALTIES: {
            DEVELOPING_TIER: {
                threshold: 3.5,
                penaltyPercentage: 10,
                deduction: 99.9,
                finalEarnings: 899.1
            },
            PROBATION_TIER: {
                threshold: 3.0,
                penaltyPercentage: 20,
                deduction: 199.8,
                finalEarnings: 799.2
            }
        }
    })
});

/**
 * 🎯 QUALITY GUARANTEE TEMPLATES
 */
const QUALITY_CONFIG = Object.freeze({
    // 🏗️ Quality Thresholds
    THRESHOLDS: {
        MINIMUM_QUALITY_SCORE: 4.0,
        COMPLETION_RATE: 0.7, // 70%
        RESPONSE_TIME_HOURS: 24,
        STUDENT_SATISFACTION: 0.8, // 80%
        WEEKLY_PROGRESS: 0.05 // 5%
    },

    // 🏗️ Expert Tier Definitions
    EXPERT_TIERS: Object.freeze({
        MASTER: {
            name: 'Master Tier',
            qualityScore: { min: 4.7, max: 5.0 },
            completionRate: { min: 0.8, max: 1.0 },
            studentLimit: 'UNLIMITED',
            bonusMultiplier: 1.2,
            requirements: ['80%+ completion rate', '4.7+ average rating', '24h response time']
        },
        SENIOR: {
            name: 'Senior Tier',
            qualityScore: { min: 4.3, max: 4.69 },
            completionRate: { min: 0.75, max: 0.79 },
            studentLimit: 100,
            bonusMultiplier: 1.1,
            requirements: ['75%+ completion rate', '4.3+ average rating', '24h response time']
        },
        STANDARD: {
            name: 'Standard Tier',
            qualityScore: { min: 4.0, max: 4.29 },
            completionRate: { min: 0.7, max: 0.74 },
            studentLimit: 50,
            bonusMultiplier: 1.0,
            requirements: ['70%+ completion rate', '4.0+ average rating', '24h response time']
        },
        DEVELOPING: {
            name: 'Developing Tier',
            qualityScore: { min: 3.5, max: 3.99 },
            completionRate: { min: 0.6, max: 0.69 },
            studentLimit: 25,
            bonusMultiplier: 0.9,
            requirements: ['Improvement plan required', 'Close monitoring']
        },
        PROBATION: {
            name: 'Probation Tier',
            qualityScore: { min: 0.0, max: 3.49 },
            completionRate: { min: 0.0, max: 0.59 },
            studentLimit: 10,
            bonusMultiplier: 0.8,
            requirements: ['Retraining required', 'No new enrollments']
        }
    }),

    // 🏗️ Auto-Enforcement Actions
    ENFORCEMENT_ACTIONS: Object.freeze({
        AUTO_PAUSE: {
            trigger: 'QUALITY_SCORE_BELOW_4.0',
            action: 'PAUSE_NEW_ENROLLMENTS',
            duration: 'UNTIL_IMPROVED',
            conditions: ['3 consecutive quality checks failed']
        },
        TIER_DEMOTION: {
            trigger: 'PERFORMANCE_BELOW_TIER',
            action: 'AUTOMATIC_DEMOTION',
            notification: 'TIER_CHANGE_NOTICE',
            conditions: ['30-day average below threshold']
        },
        STUDENT_REASSIGNMENT: {
            trigger: 'QUALITY_CRITICAL_FAILURE',
            action: 'AUTO_EXPERT_SWITCHING',
            conditions: ['Student request', 'Multiple quality violations']
        },
        FINANCIAL_PENALTIES: {
            trigger: 'SERVICE_LEVEL_AGREEMENT_BREACH',
            action: 'REVENUE_WITHHOLDING',
            conditions: ['Failed completion rate', 'Poor student satisfaction']
        }
    }),

    // 🏗️ Quality Metrics Calculation
    METRICS_WEIGHTS: Object.freeze({
        COMPLETION_RATE: 0.35,
        AVERAGE_RATING: 0.25,
        RESPONSE_TIME: 0.20,
        STUDENT_SATISFACTION: 0.15,
        PROGRESS_RATE: 0.05
    })
});

/**
 * 🎯 COURSE PROGRESSION TEMPLATES
 */
const COURSE_TEMPLATES = Object.freeze({
    // 🏗️ 4-Month Journey Structure
    JOURNEY_PHASES: Object.freeze({
        MINDSET: {
            phase: 'MINDSET_FOUNDATION',
            duration: '4_WEEKS',
            cost: 'FREE',
            status: 'MANDATORY',
            objectives: [
                'Transform wealth consciousness',
                'Build discipline and consistency',
                'Overcome procrastination',
                'Develop financial psychology'
            ],
            weeklyStructure: [
                {
                    week: 1,
                    topic: 'Wealth Consciousness',
                    exercises: 5,
                    duration: '7 days',
                    outcomes: ['Consumer to creator mindset shift']
                },
                {
                    week: 2,
                    topic: 'Discipline Building',
                    exercises: 5,
                    duration: '7 days',
                    outcomes: ['Habit formation and consistency']
                },
                {
                    week: 3,
                    topic: 'Action Taking',
                    exercises: 5,
                    duration: '7 days',
                    outcomes: ['Procrastination elimination']
                },
                {
                    week: 4,
                    topic: 'Financial Psychology',
                    exercises: 5,
                    duration: '7 days',
                    outcomes: ['Healthy money mindset']
                }
            ]
        },

        THEORY: {
            phase: 'THEORY_MASTERY',
            duration: '2_MONTHS',
            cost: 'INCLUDED_IN_BUNDLE',
            status: 'MANDATORY',
            methodology: 'DUOLINGO_STYLE_INTERACTIVE',
            features: [
                'No video content - pure decision-making',
                'Real-time scenario exercises',
                'Progress-based advancement',
                'Skill-specific challenges'
            ],
            exerciseTypes: [
                'MULTIPLE_CHOICE_SCENARIOS',
                'DECISION_MAKING_EXERCISES',
                'PROBLEM_SOLVING_TASKS',
                'REAL_WORLD_SIMULATIONS'
            ]
        },

        HANDS_ON: {
            phase: 'HANDS_ON_IMMERSION',
            duration: '2_MONTHS',
            cost: 'INCLUDED_IN_BUNDLE',
            status: 'MANDATORY',
            features: [
                'Guaranteed expert matching',
                'Real project work',
                '5 students per session maximum',
                'Portfolio building assignments'
            ],
            sessionStructure: {
                duration: '2_HOURS_PER_SESSION',
                frequency: '3_SESSIONS_PER_WEEK',
                groupSize: '5_STUDENTS_MAX',
                deliverables: ['Portfolio projects', 'Practical assignments']
            }
        },

        CERTIFICATION: {
            phase: 'CERTIFICATION_LAUNCH',
            duration: '2_WEEKS',
            cost: 'INCLUDED_IN_BUNDLE',
            status: 'MANDATORY',
            deliverables: [
                'Mosa Enterprise Certificate',
                'Yachi automatic verification',
                'Income generation readiness',
                'Lifetime community access'
            ],
            outcomes: {
                immediate: 'Start earning on Yachi platform',
                shortTerm: 'First income within 30 days',
                longTerm: 'Sustainable skill-based business'
            }
        }
    }),

    // 🏗️ Progress Tracking Templates
    PROGRESS_TRACKING: Object.freeze({
        MILESTONES: [
            { percentage: 0, phase: 'ENROLLMENT', action: 'COURSE_START' },
            { percentage: 25, phase: 'MINDSET_COMPLETE', action: 'THEORY_PHASE_START' },
            { percentage: 50, phase: 'THEORY_COMPLETE', action: 'HANDS_ON_PHASE_START' },
            { percentage: 75, phase: 'HANDS_ON_MIDPOINT', action: 'MIDPOINT_PAYOUT' },
            { percentage: 90, phase: 'HANDS_ON_COMPLETE', action: 'FINAL_ASSESSMENT' },
            { percentage: 100, phase: 'CERTIFICATION', action: 'COMPLETION_PAYOUT' }
        ],
        COMPLETION_CRITERIA: {
            MINDSET_PHASE: 'Complete all 20 exercises and assessment',
            THEORY_PHASE: 'Master all interactive exercises with 80%+ score',
            HANDS_ON_PHASE: 'Complete all practical projects and sessions',
            CERTIFICATION: 'Pass final assessment and Yachi verification'
        }
    })
});

/**
 * 🎯 40 ENTERPRISE SKILLS CATALOG
 */
const SKILLS_CATALOG = Object.freeze({
    CATEGORIES: {
        ONLINE_SKILLS: {
            name: 'Online Skills',
            count: 10,
            skills: [
                {
                    id: 'forex-trading-mastery',
                    name: 'Forex Trading Mastery',
                    packages: 5,
                    incomeRange: '8,000-25,000 ETB/month',
                    technologies: ['ICT', 'SMC', 'Price Action', 'Supply/Demand', 'Fibonacci'],
                    duration: '4 months',
                    demand: 'HIGH'
                },
                {
                    id: 'professional-graphic-design',
                    name: 'Professional Graphic Design',
                    packages: 5,
                    incomeRange: '6,000-15,000 ETB/month',
                    technologies: ['Adobe Suite', 'Figma', 'Canva', 'UI/UX', 'Branding'],
                    duration: '4 months',
                    demand: 'HIGH'
                },
                {
                    id: 'digital-marketing-pro',
                    name: 'Digital Marketing Pro',
                    packages: 5,
                    incomeRange: '7,000-18,000 ETB/month',
                    technologies: ['SEO', 'Social Media', 'Email Marketing', 'PPC', 'Analytics'],
                    duration: '4 months',
                    demand: 'HIGH'
                }
                // ... Additional 7 online skills
            ]
        },

        OFFLINE_SKILLS: {
            name: 'Offline Skills',
            count: 10,
            skills: [
                {
                    id: 'professional-woodworking',
                    name: 'Professional Woodworking',
                    packages: 5,
                    incomeRange: '8,000-20,000 ETB/month',
                    specialties: ['Furniture', 'Kitchen Installation', 'Remodeling', 'Cabinet', 'Carving'],
                    duration: '4 months',
                    demand: 'HIGH'
                },
                {
                    id: 'construction-masonry',
                    name: 'Construction & Masonry',
                    packages: 5,
                    incomeRange: '7,000-18,000 ETB/month',
                    specialties: ['Masonry', 'Concrete', 'Framing', 'Finishing', 'Renovation'],
                    duration: '4 months',
                    demand: 'HIGH'
                }
                // ... Additional 8 offline skills
            ]
        },

        HEALTH_SPORTS: {
            name: 'Health & Sports',
            count: 10,
            skills: [
                {
                    id: 'certified-personal-training',
                    name: 'Certified Personal Training',
                    packages: 5,
                    incomeRange: '6,000-15,000 ETB/month',
                    specialties: ['Weight Loss', 'Muscle Building', 'Senior', 'Youth', 'Rehabilitation'],
                    duration: '4 months',
                    demand: 'MEDIUM_HIGH'
                }
                // ... Additional 9 health/sports skills
            ]
        },

        BEAUTY_FASHION: {
            name: 'Beauty & Fashion',
            count: 10,
            skills: [
                {
                    id: 'professional-hair-styling',
                    name: 'Professional Hair Styling',
                    packages: 5,
                    incomeRange: '5,000-12,000 ETB/month',
                    specialties: ['Braiding', 'Weaving', 'Cutting', 'Coloring', 'Styling'],
                    duration: '4 months',
                    demand: 'HIGH'
                }
                // ... Additional 9 beauty/fashion skills
            ]
        }
    },

    // 🏗️ Skill Package Templates
    PACKAGE_TEMPLATES: Object.freeze({
        BASIC: {
            name: 'Basic Package',
            price: 1999,
            features: [
                'Full 4-month training',
                'Expert matching',
                'Mosa certification',
                'Yachi verification'
            ],
            duration: '4 months',
            support: 'Standard'
        },
        STANDARD: {
            name: 'Standard Package',
            price: 2999,
            features: [
                'All Basic features',
                'Extended mentorship',
                'Portfolio review',
                'Job placement assistance'
            ],
            duration: '4 months',
            support: 'Enhanced'
        },
        PREMIUM: {
            name: 'Premium Package',
            price: 3999,
            features: [
                'All Standard features',
                '1-on-1 coaching',
                'Business setup support',
                'Premium certification'
            ],
            duration: '4 months',
            support: 'Premium'
        }
    })
});

/**
 * 🎯 PAYMENT & FINANCIAL TEMPLATES
 */
const PAYMENT_TEMPLATES = Object.freeze({
    // 🏗️ Payment Gateway Configuration
    GATEWAYS: Object.freeze({
        TELEBIRR: {
            name: 'Telebirr',
            supportedMethods: ['USSD', 'Mobile App', 'Web'],
            transactionLimits: {
                min: 1,
                max: 50000,
                currency: 'ETB'
            },
            fees: {
                percentage: 0.015, // 1.5%
                fixed: 2
            },
            settlement: 'INSTANT'
        },
        CBE_BIRR: {
            name: 'CBE Birr',
            supportedMethods: ['USSD', 'Mobile App', 'Bank Transfer'],
            transactionLimits: {
                min: 1,
                max: 100000,
                currency: 'ETB'
            },
            fees: {
                percentage: 0.02, // 2%
                fixed: 3
            },
            settlement: '24_HOURS'
        }
    }),

    // 🏗️ Installment Plans
    INSTALLMENT_PLANS: Object.freeze({
        FULL_UPFRONT: {
            name: 'Full Payment',
            total: 1999,
            installments: 1,
            discount: 0,
            schedule: [{ due: 'ENROLLMENT', amount: 1999 }]
        },
        TWO_PAYMENTS: {
            name: 'Two Installments',
            total: 1999,
            installments: 2,
            discount: 0,
            schedule: [
                { due: 'ENROLLMENT', amount: 1000 },
                { due: 'MONTH_2', amount: 999 }
            ]
        },
        THREE_PAYMENTS: {
            name: 'Three Installments',
            total: 1999,
            installments: 3,
            discount: 0,
            schedule: [
                { due: 'ENROLLMENT', amount: 666 },
                { due: 'MONTH_2', amount: 666 },
                { due: 'MONTH_3', amount: 667 }
            ]
        }
    }),

    // 🏗️ Refund Policy Templates
    REFUND_POLICIES: Object.freeze({
        COOLING_PERIOD: {
            duration: '7_DAYS',
            refundPercentage: 100,
            conditions: ['No course progress', 'Written request']
        },
        PRORATED_REFUND: {
            trigger: 'EXPERT_QUALITY_ISSUE',
            refundPercentage: 'PRO_RATA',
            conditions: ['Quality guarantee invoked', 'Expert switching']
        },
        NO_REFUND: {
            conditions: [
                'Course completion > 50%',
                'Violation of terms',
                'Fraudulent activity'
            ]
        }
    })
});

/**
 * 🎯 SECURITY & COMPLIANCE TEMPLATES
 */
const SECURITY_TEMPLATES = Object.freeze({
    // 🏗️ Fayda ID Verification
    FAYDA_VERIFICATION: Object.freeze({
        REQUIRED_FIELDS: [
            'faydaId',
            'fullName',
            'dateOfBirth',
            'gender',
            'photo',
            'fingerprints'
        ],
        VALIDATION_RULES: {
            faydaId: {
                pattern: /^\d{10,15}$/,
                checksum: 'VERIFIED'
            },
            ageRequirement: {
                min: 18,
                max: 65
            },
            nationality: 'ETHIOPIAN'
        },
        API_ENDPOINTS: {
            verification: 'https://api.fayda.gov.et/verify',
            validation: 'https://api.fayda.gov.et/validate',
            biometric: 'https://api.fayda.gov.et/biometric'
        }
    }),

    // 🏗️ Data Protection Compliance
    DATA_PROTECTION: Object.freeze({
        RETENTION_PERIODS: {
            userData: '7_YEARS',
            paymentRecords: '10_YEARS',
            learningProgress: 'PERMANENT',
            communication: '2_YEARS'
        },
        ENCRYPTION_STANDARDS: {
            algorithm: 'AES-256-GCM',
            keyManagement: 'AWS_KMS',
            dataInTransit: 'TLS_1.3'
        },
        ACCESS_CONTROLS: {
            roles: ['STUDENT', 'EXPERT', 'ADMIN', 'SUPPORT'],
            permissions: 'ROLE_BASED',
            authentication: 'MULTI_FACTOR'
        }
    })
});

/**
 * 🎯 NOTIFICATION & COMMUNICATION TEMPLATES
 */
const NOTIFICATION_TEMPLATES = Object.freeze({
    // 🏗️ SMS Templates
    SMS_TEMPLATES: Object.freeze({
        OTP_VERIFICATION: {
            template: 'Your Mosa Forge verification code is: {code}. Valid for 10 minutes.',
            variables: ['code'],
            type: 'AUTHENTICATION'
        },
        PAYMENT_CONFIRMATION: {
            template: 'Payment of {amount} ETB confirmed. Your {skill} course starts now!',
            variables: ['amount', 'skill'],
            type: 'PAYMENT'
        },
        EXPERT_ASSIGNMENT: {
            template: 'Expert {expertName} assigned to your {skill} course. Start learning!',
            variables: ['expertName', 'skill'],
            type: 'ENROLLMENT'
        }
    }),

    // 🏗️ Email Templates
    EMAIL_TEMPLATES: Object.freeze({
        WELCOME_STUDENT: {
            subject: 'Welcome to Mosa Forge - Your Skills Journey Begins!',
            template: 'welcome-student.html',
            variables: ['studentName', 'skillName', 'expertName', 'startDate']
        },
        PAYMENT_RECEIPT: {
            subject: 'Payment Confirmation - Mosa Forge',
            template: 'payment-receipt.html',
            variables: ['amount', 'transactionId', 'date', 'bundleDetails']
        },
        COURSE_COMPLETION: {
            subject: 'Congratulations! Course Completed - Mosa Forge',
            template: 'course-completion.html',
            variables: ['studentName', 'skillName', 'certificateUrl', 'yachiVerification']
        }
    }),

    // 🏗️ Push Notification Templates
    PUSH_TEMPLATES: Object.freeze({
        PROGRESS_REMINDER: {
            title: 'Keep Going!',
            body: 'You are {progress}% complete with your {skill} course.',
            variables: ['progress', 'skill'],
            type: 'PROGRESS'
        },
        SESSION_REMINDER: {
            title: 'Training Session Starting Soon',
            body: 'Your {skill} session with {expert} starts in 30 minutes.',
            variables: ['skill', 'expert'],
            type: 'REMINDER'
        }
    })
});

/**
 * 🎯 ENTERPRISE VALIDATION SCHEMAS
 */
const VALIDATION_SCHEMAS = {
    // 🏗️ Enrollment Validation
    ENROLLMENT: Joi.object({
        studentId: Joi.string().uuid().required(),
        skillId: Joi.string().pattern(/^[a-z-]+$/).required(),
        paymentId: Joi.string().uuid().required(),
        bundleId: Joi.string().uuid().required(),
        traceId: Joi.string().uuid().optional()
    }),

    // 🏗️ Payment Validation
    PAYMENT: Joi.object({
        amount: Joi.number().min(1999).max(1999).required(),
        currency: Joi.string().valid('ETB').required(),
        gateway: Joi.string().valid('TELEBIRR', 'CBE_BIRR').required(),
        method: Joi.string().required(),
        studentId: Joi.string().uuid().required()
    }),

    // 🏗️ Expert Validation
    EXPERT: Joi.object({
        faydaId: Joi.string().pattern(/^\d{10,15}$/).required(),
        portfolio: Joi.array().items(Joi.object({
            type: Joi.string().valid('CERTIFICATE', 'PROJECT', 'REFERENCE').required(),
            url: Joi.string().uri().required(),
            verified: Joi.boolean().default(false)
        })).min(1).required(),
        skills: Joi.array().items(Joi.string()).min(1).required(),
        tier: Joi.string().valid('MASTER', 'SENIOR', 'STANDARD', 'DEVELOPING', 'PROBATION').default('STANDARD')
    })
};

/**
 * 🎯 ERROR CODE TEMPLATES
 */
const ERROR_CODES = Object.freeze({
    // 🏗️ Business Logic Errors
    BUSINESS: {
        DUPLICATE_ENROLLMENT: 'BUS_001',
        PAYMENT_PENDING: 'BUS_002',
        EXPERT_UNAVAILABLE: 'BUS_003',
        QUALITY_THRESHOLD: 'BUS_004',
        CAPACITY_EXCEEDED: 'BUS_005'
    },

    // 🏗️ Validation Errors
    VALIDATION: {
        INVALID_FAYDA_ID: 'VAL_001',
        INSUFFICIENT_PORTFOLIO: 'VAL_002',
        SKILL_NOT_AVAILABLE: 'VAL_003',
        PAYMENT_AMOUNT_MISMATCH: 'VAL_004'
    },

    // 🏗️ System Errors
    SYSTEM: {
        DATABASE_UNAVAILABLE: 'SYS_001',
        PAYMENT_GATEWAY_DOWN: 'SYS_002',
        EXTERNAL_API_FAILURE: 'SYS_003',
        CACHE_UNAVAILABLE: 'SYS_004'
    }
});

/**
 * 🎯 ENTERPRISE CONFIGURATION EXPORT
 */
module.exports = {
    // 🏗️ Core Business Templates
    REVENUE_DISTRIBUTION,
    QUALITY_CONFIG,
    COURSE_TEMPLATES,
    SKILLS_CATALOG,
    
    // 🏗️ Financial Templates
    PAYMENT_TEMPLATES,
    
    // 🏗️ Security & Compliance
    SECURITY_TEMPLATES,
    
    // 🏗️ Communication Templates
    NOTIFICATION_TEMPLATES,
    
    // 🏗️ Validation & Error Handling
    VALIDATION_SCHEMAS,
    ERROR_CODES,

    // 🏗️ Utility Methods
    UTILS: {
        /**
         * 🏗️ Calculate Expert Earnings with Bonuses
         * @param {number} baseEarnings - Base earnings (999 ETB)
         * @param {string} tier - Expert tier
         * @param {number} qualityScore - Current quality score
         * @returns {Object} Calculated earnings with breakdown
         */
        calculateExpertEarnings: (baseEarnings, tier, qualityScore) => {
            const tierConfig = QUALITY_CONFIG.EXPERT_TIERS[tier];
            if (!tierConfig) {
                throw new Error(`Invalid expert tier: ${tier}`);
            }

            const bonusMultiplier = tierConfig.bonusMultiplier;
            const totalEarnings = baseEarnings * bonusMultiplier;
            const bonusAmount = totalEarnings - baseEarnings;

            return {
                baseEarnings,
                tier,
                qualityScore,
                bonusMultiplier,
                bonusAmount: Math.round(bonusAmount * 100) / 100,
                totalEarnings: Math.round(totalEarnings * 100) / 100,
                currency: 'ETB'
            };
        },

        /**
         * 🏗️ Validate Course Progression
         * @param {string} currentPhase - Current course phase
         * @param {number} progress - Progress percentage
         * @returns {boolean} Whether progression is valid
         */
        validateProgression: (currentPhase, progress) => {
            const phaseProgressLimits = {
                MINDSET: { min: 0, max: 25 },
                THEORY: { min: 25, max: 50 },
                HANDS_ON: { min: 50, max: 90 },
                CERTIFICATION: { min: 90, max: 100 }
            };

            const limits = phaseProgressLimits[currentPhase];
            if (!limits) {
                throw new Error(`Invalid course phase: ${currentPhase}`);
            }

            return progress >= limits.min && progress <= limits.max;
        },

        /**
         * 🏗️ Generate Revenue Split Breakdown
         * @param {number} bundlePrice - Bundle price (1999 ETB)
         * @returns {Object} Detailed revenue split
         */
        generateRevenueSplit: (bundlePrice = 1999) => {
            const mosaAmount = Math.floor(bundlePrice * 0.5003);
            const expertAmount = bundlePrice - mosaAmount;

            return {
                bundlePrice,
                mosa: {
                    amount: mosaAmount,
                    percentage: (mosaAmount / bundlePrice * 100).toFixed(2),
                    allocation: {
                        platformOperations: Math.floor(mosaAmount * 0.4),
                        qualityEnforcement: Math.floor(mosaAmount * 0.3),
                        profitGrowth: mosaAmount - Math.floor(mosaAmount * 0.4) - Math.floor(mosaAmount * 0.3)
                    }
                },
                expert: {
                    amount: expertAmount,
                    percentage: (expertAmount / bundlePrice * 100).toFixed(2),
                    payoutSchedule: [
                        Math.floor(expertAmount / 3),
                        Math.floor(expertAmount / 3),
                        expertAmount - (Math.floor(expertAmount / 3) * 2)
                    ]
                }
            };
        },

        /**
         * 🏗️ Get Skill Category by ID
         * @param {string} skillId - Skill identifier
         * @returns {string} Category name
         */
        getSkillCategory: (skillId) => {
            for (const [category, data] of Object.entries(SKILLS_CATALOG.CATEGORIES)) {
                const skill = data.skills.find(s => s.id === skillId);
                if (skill) {
                    return category;
                }
            }
            return 'UNCATEGORIZED';
        }
    },

    // 🏗️ Version Information
    VERSION: {
        major: 1,
        minor: 0,
        patch: 0,
        timestamp: new Date().toISOString(),
        compatibility: 'MOSA_FORGE_ENTERPRISE_v1'
    }
};

// 🏗️ Freeze all exports for immutability
Object.freeze(module.exports);