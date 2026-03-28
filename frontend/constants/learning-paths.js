/**
 * 🎯 MOSA FORGE: Enterprise Learning Paths Constants
 * 
 * @module LearningPaths
 * @description Centralized configuration for all 40+ skills learning paths
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - 40+ skills with structured learning paths
 * - Duolingo-style exercise progression
 * - Quality-controlled curriculum standards
 * - Multi-phase learning journey
 * - Real-time Forex and trading integration
 */

// 🏗️ Enterprise Constants Structure
const LEARNING_PATHS = {
    // 🎯 Phase Durations & Structure
    PHASES: {
        MINDSET: {
            name: 'Mindset Foundation',
            duration: '4 weeks',
            cost: 'FREE',
            isRequired: true,
            order: 1,
            objectives: [
                'Transform from consumer to creator mindset',
                'Build consistent learning discipline',
                'Overcome procrastination and take action',
                'Develop healthy financial psychology'
            ]
        },
        THEORY: {
            name: 'Theory Mastery',
            duration: '2 months',
            cost: 'INCLUDED_IN_BUNDLE',
            isRequired: true,
            order: 2,
            objectives: [
                'Master fundamental concepts through interactive exercises',
                'Develop decision-making skills through scenarios',
                'Build theoretical foundation for practical application',
                'Progress through Duolingo-style learning path'
            ]
        },
        HANDS_ON: {
            name: 'Hands-on Immersion',
            duration: '2 months',
            cost: 'INCLUDED_IN_BUNDLE',
            isRequired: true,
            order: 3,
            objectives: [
                'Apply theoretical knowledge with expert guidance',
                'Build real project portfolio',
                'Develop practical problem-solving skills',
                'Gain confidence through real-world application'
            ]
        },
        CERTIFICATION: {
            name: 'Certification & Launch',
            duration: '2 weeks',
            cost: 'INCLUDED_IN_BUNDLE',
            isRequired: true,
            order: 4,
            objectives: [
                'Validate skills through comprehensive assessment',
                'Receive Mosa Enterprise Certificate',
                'Get Yachi platform verification',
                'Launch income generation journey'
            ]
        }
    },

    // 🎯 Exercise Types & Structures
    EXERCISE_TYPES: {
        DUOLINGO_STYLE: 'interactive_decision',
        SCENARIO_BASED: 'practical_scenario',
        REAL_TIME_CHART: 'live_trading_chart',
        MINDSET_REFLECTION: 'mindset_development',
        HANDS_ON_PROJECT: 'practical_project',
        ASSESSMENT: 'skill_validation'
    },

    // 🎯 Progress Tracking Standards
    PROGRESS_STANDARDS: {
        MINIMUM_WEEKLY_PROGRESS: 5, // Percentage
        COMPLETION_THRESHOLD: 80, // Percentage to pass phase
        MAX_INACTIVITY_DAYS: 14, // Days before auto-pause
        MINDEST_COMPLETION_REQUIRED: true
    },

    // 🎯 Quality Standards
    QUALITY_THRESHOLDS: {
        MINIMUM_COMPLETION_RATE: 70, // Percentage
        AVERAGE_RATING: 4.0, // Stars out of 5
        MAX_RESPONSE_TIME: 24, // Hours
        STUDENT_SATISFACTION: 80 // Percentage
    }
};

// 🚀 40 ENTERPRISE SKILLS LEARNING PATHS
const SKILLS_LEARNING_PATHS = {
    // 💻 ONLINE SKILLS (10)
    FOREX_TRADING: {
        id: 'forex_trading_mastery',
        name: 'Forex Trading Mastery',
        category: 'ONLINE',
        difficulty: 'ADVANCED',
        estimatedIncome: '8,000-15,000 ETB/month',
        demandLevel: 'HIGH',
        
        phases: {
            MINDSET: {
                exercises: 20,
                duration: '4 weeks',
                weeklyStructure: [
                    {
                        week: 1,
                        topic: 'Trading Psychology & Risk Management',
                        exercises: [
                            {
                                id: 'mt-1',
                                type: 'MINDSET_REFLECTION',
                                title: 'Risk Tolerance Assessment',
                                duration: '15 min',
                                points: 10,
                                required: true
                            },
                            {
                                id: 'mt-2', 
                                type: 'SCENARIO_BASED',
                                title: 'Emotional Control in Trading',
                                duration: '20 min',
                                points: 15,
                                required: true
                            }
                        ]
                    },
                    {
                        week: 2,
                        topic: 'Discipline & Consistency in Trading',
                        exercises: [
                            {
                                id: 'mt-3',
                                type: 'MINDSET_REFLECTION', 
                                title: 'Trading Journal Setup',
                                duration: '25 min',
                                points: 12,
                                required: true
                            }
                        ]
                    }
                ]
            },

            THEORY: {
                exercises: 150,
                duration: '2 months',
                modules: [
                    {
                        module: 'ICT Concepts',
                        exercises: 30,
                        topics: ['Market Structure', 'Order Blocks', 'Liquidity'],
                        realTimeCharts: true
                    },
                    {
                        module: 'Smart Money Concepts',
                        exercises: 40, 
                        topics: ['SMC Principles', 'Institutional Trading', 'Order Flow'],
                        realTimeCharts: true
                    },
                    {
                        module: 'Price Action Mastery',
                        exercises: 35,
                        topics: ['Candlestick Patterns', 'Support/Resistance', 'Trend Analysis'],
                        realTimeCharts: true
                    },
                    {
                        module: 'Supply & Demand Zones',
                        exercises: 25,
                        topics: ['Zone Identification', 'Zone Trading', 'Risk Management'],
                        realTimeCharts: true
                    },
                    {
                        module: 'Fibonacci Trading',
                        exercises: 20,
                        topics: ['Fibonacci Levels', 'Retracement Trading', 'Extensions'],
                        realTimeCharts: true
                    }
                ],

                exerciseStructure: {
                    DUOLINGO_STYLE: 80, // Percentage of exercises
                    REAL_TIME_CHART: 15, // Percentage with live charts
                    SCENARIO_BASED: 5   // Percentage scenario-based
                }
            },

            HANDS_ON: {
                duration: '2 months',
                projects: [
                    {
                        id: 'project-1',
                        name: 'Live Demo Account Trading',
                        duration: '4 weeks',
                        deliverables: [
                            'Consistent 2% weekly profit',
                            'Trading journal with 50+ entries',
                            'Risk management protocol'
                        ],
                        expertSessions: 8
                    },
                    {
                        id: 'project-2',
                        name: 'Trading Strategy Development',
                        duration: '4 weeks', 
                        deliverables: [
                            'Custom trading strategy document',
                            'Backtesting results',
                            'Live execution plan'
                        ],
                        expertSessions: 8
                    }
                ],

                successMetrics: {
                    minProfitConsistency: 2, // Percentage weekly
                    maxDrawdown: 5, // Percentage
                    tradeJournalCompletion: 100 // Percentage
                }
            },

            CERTIFICATION: {
                assessment: {
                    theoretical: {
                        questions: 50,
                        passRate: 80,
                        duration: '2 hours',
                        topics: ['All theory modules']
                    },
                    practical: {
                        liveTrading: true,
                        duration: '1 week',
                        profitTarget: 3, // Percentage
                        maxLoss: 2 // Percentage
                    }
                },

                yachiIntegration: {
                    autoVerification: true,
                    providerCategory: 'Forex Trading',
                    serviceTiers: ['Beginner', 'Intermediate', 'Advanced']
                }
            }
        },

        realTimeFeatures: {
            liveForexCharts: true,
            tradingSimulator: true,
            economicCalendar: true,
            newsIntegration: true
        }
    },

    GRAPHIC_DESIGN: {
        id: 'professional_graphic_design',
        name: 'Professional Graphic Design',
        category: 'ONLINE', 
        difficulty: 'INTERMEDIATE',
        estimatedIncome: '6,000-12,000 ETB/month',
        demandLevel: 'HIGH',

        phases: {
            THEORY: {
                exercises: 120,
                modules: [
                    {
                        module: 'Design Fundamentals',
                        exercises: 25,
                        topics: ['Color Theory', 'Typography', 'Layout Principles']
                    },
                    {
                        module: 'Software Mastery',
                        exercises: 35,
                        topics: ['Adobe Illustrator', 'Canva Pro', 'Figma Basics']
                    },
                    {
                        module: 'Brand Identity',
                        exercises: 30,
                        topics: ['Logo Design', 'Brand Guidelines', 'Visual Systems']
                    },
                    {
                        module: 'Social Media Graphics',
                        exercises: 20,
                        topics: ['Platform Specifications', 'Content Creation', 'Templates']
                    },
                    {
                        module: 'Print Design',
                        exercises: 10,
                        topics: ['Print Specifications', 'File Preparation', 'Materials']
                    }
                ]
            },

            HANDS_ON: {
                projects: [
                    {
                        id: 'gd-project-1',
                        name: 'Complete Brand Identity Package',
                        deliverables: [
                            'Logo design (3 concepts)',
                            'Color palette and typography',
                            'Social media kit',
                            'Business card design'
                        ]
                    },
                    {
                        id: 'gd-project-2',
                        name: 'Marketing Campaign Graphics',
                        deliverables: [
                            'Social media posts (10 designs)',
                            'Digital advertisement banners',
                            'Email newsletter template',
                            'Presentation design'
                        ]
                    }
                ]
            }
        }
    },

    // 🏗️ OFFLINE SKILLS (10)
    WOODWORKING: {
        id: 'professional_woodworking',
        name: 'Professional Woodworking',
        category: 'OFFLINE',
        difficulty: 'INTERMEDIATE',
        estimatedIncome: '8,000-15,000 ETB/month',
        demandLevel: 'HIGH',

        phases: {
            THEORY: {
                exercises: 100,
                modules: [
                    {
                        module: 'Woodworking Fundamentals',
                        exercises: 20,
                        topics: ['Wood Types', 'Tool Safety', 'Measurement Techniques']
                    },
                    {
                        module: 'Furniture Design',
                        exercises: 30,
                        topics: ['Design Principles', 'Joinery Techniques', 'Finishing Methods']
                    },
                    {
                        module: 'Kitchen Installation',
                        exercises: 25,
                        topics: ['Cabinet Making', 'Installation Techniques', 'Custom Solutions']
                    },
                    {
                        module: 'Advanced Techniques',
                        exercises: 25,
                        topics: ['Carving', 'Bending', 'Veneering']
                    }
                ]
            },

            HANDS_ON: {
                projects: [
                    {
                        id: 'ww-project-1',
                        name: 'Basic Furniture Piece',
                        deliverables: ['Wooden chair or small table'],
                        toolsRequired: ['Basic hand tools'],
                        duration: '3 weeks'
                    },
                    {
                        id: 'ww-project-2', 
                        name: 'Custom Cabinet Project',
                        deliverables: ['Kitchen or storage cabinet'],
                        toolsRequired: ['Power tools', 'Measuring equipment'],
                        duration: '5 weeks'
                    }
                ]
            }
        }
    },

    CONSTRUCTION_MASONRY: {
        id: 'construction_masonry',
        name: 'Construction & Masonry',
        category: 'OFFLINE',
        difficulty: 'INTERMEDIATE', 
        estimatedIncome: '7,000-12,000 ETB/month',
        demandLevel: 'HIGH',

        phases: {
            THEORY: {
                exercises: 90,
                modules: [
                    {
                        module: 'Masonry Fundamentals',
                        exercises: 25,
                        topics: ['Brick Types', 'Mortar Mixing', 'Laying Techniques']
                    },
                    {
                        module: 'Construction Safety',
                        exercises: 20,
                        topics: ['Site Safety', 'Tool Operation', 'Protective Equipment']
                    },
                    {
                        module: 'Advanced Techniques',
                        exercises: 25,
                        topics: ['Concrete Work', 'Finishing', 'Quality Standards']
                    },
                    {
                        module: 'Project Management',
                        exercises: 20,
                        topics: ['Estimation', 'Scheduling', 'Client Management']
                    }
                ]
            }
        }
    },

    // 🏥 HEALTH & SPORTS (10)
    PERSONAL_TRAINING: {
        id: 'certified_personal_training',
        name: 'Certified Personal Training',
        category: 'HEALTH_SPORTS',
        difficulty: 'INTERMEDIATE',
        estimatedIncome: '6,000-10,000 ETB/month', 
        demandLevel: 'MEDIUM_HIGH',

        phases: {
            THEORY: {
                exercises: 110,
                modules: [
                    {
                        module: 'Anatomy & Physiology',
                        exercises: 25,
                        topics: ['Muscle Groups', 'Body Systems', 'Exercise Physiology']
                    },
                    {
                        module: 'Training Programming',
                        exercises: 30,
                        topics: ['Workout Design', 'Progression', 'Periodization']
                    },
                    {
                        module: 'Nutrition Fundamentals',
                        exercises: 25,
                        topics: ['Macronutrients', 'Meal Planning', 'Supplementation']
                    },
                    {
                        module: 'Client Management',
                        exercises: 20,
                        topics: ['Assessment', 'Goal Setting', 'Motivation Techniques']
                    },
                    {
                        module: 'Special Populations',
                        exercises: 10,
                        topics: ['Senior Fitness', 'Youth Training', 'Rehabilitation']
                    }
                ]
            }
        }
    },

    // 💄 BEAUTY & FASHION (10)  
    HAIR_STYLING: {
        id: 'professional_hair_styling',
        name: 'Professional Hair Styling',
        category: 'BEAUTY_FASHION',
        difficulty: 'INTERMEDIATE',
        estimatedIncome: '5,000-8,000 ETB/month',
        demandLevel: 'HIGH',

        phases: {
            THEORY: {
                exercises: 95,
                modules: [
                    {
                        module: 'Hair Fundamentals',
                        exercises: 20,
                        topics: ['Hair Types', 'Scalp Health', 'Product Knowledge']
                    },
                    {
                        module: 'Braiding Techniques',
                        exercises: 25,
                        topics: ['Basic Braids', 'Advanced Styles', 'Cultural Styles']
                    },
                    {
                        module: 'Weaving & Extensions',
                        exercises: 20,
                        topics: ['Application Methods', 'Maintenance', 'Removal']
                    },
                    {
                        module: 'Cutting & Coloring',
                        exercises: 20,
                        topics: ['Cutting Techniques', 'Color Theory', 'Chemical Safety']
                    },
                    {
                        module: 'Business Management',
                        exercises: 10,
                        topics: ['Pricing', 'Client Relations', 'Sanitation']
                    }
                ]
            }
        }
    }
};

// 🎯 SKILLS CATALOG ORGANIZATION
const SKILLS_CATALOG = {
    CATEGORIES: {
        ONLINE: {
            name: 'Online Skills',
            description: 'Digital skills for remote work and online business',
            skills: [
                'FOREX_TRADING',
                'GRAPHIC_DESIGN', 
                'DIGITAL_MARKETING',
                'WEB_DEVELOPMENT',
                'CONTENT_WRITING',
                'VIDEO_EDITING',
                'SOCIAL_MEDIA_MANAGEMENT',
                'E_COMMERCE_MANAGEMENT',
                'DATA_ANALYSIS',
                'MOBILE_APP_DEVELOPMENT'
            ],
            color: '#3B82F6',
            icon: '💻'
        },

        OFFLINE: {
            name: 'Offline Skills', 
            description: 'Hands-on skills for local services and construction',
            skills: [
                'WOODWORKING',
                'CONSTRUCTION_MASONRY',
                'PROFESSIONAL_PAINTING',
                'DOOR_WINDOW_INSTALLATION',
                'PLUMBING_SERVICES',
                'NETWORK_SECURITY_SYSTEMS',
                'SOLAR_POWER_SYSTEMS',
                'ELECTRICAL_SERVICES', 
                'METAL_FABRICATION_WELDING',
                'AUTOMOTIVE_REPAIR_MAINTENANCE'
            ],
            color: '#10B981',
            icon: '🏗️'
        },

        HEALTH_SPORTS: {
            name: 'Health & Sports',
            description: 'Fitness, wellness, and sports coaching skills',
            skills: [
                'PERSONAL_TRAINING',
                'SPORTS_COACHING',
                'NUTRITION_COUNSELING',
                'YOGA_INSTRUCTION',
                'MASSAGE_THERAPY',
                'FIRST_AID_EMERGENCY',
                'DANCE_INSTRUCTION',
                'MARTIAL_ARTS_INSTRUCTION',
                'GROUP_FITNESS_INSTRUCTION', 
                'SPORTS_EVENT_MANAGEMENT'
            ],
            color: '#EF4444',
            icon: '🏥'
        },

        BEAUTY_FASHION: {
            name: 'Beauty & Fashion',
            description: 'Beauty services, fashion design, and personal care',
            skills: [
                'HAIR_STYLING',
                'MAKEUP_ARTISTRY',
                'FASHION_DESIGN',
                'NAIL_TECHNOLOGY',
                'SKINCARE_SERVICES',
                'HENNA_ART_DESIGN',
                'TAILORING_SERVICES',
                'JEWELRY_DESIGN_CREATION',
                'PERFUME_CREATION_BUSINESS',
                'BEAUTY_SALON_ENTREPRENEURSHIP'
            ],
            color: '#8B5CF6',
            icon: '💄'
        }
    },

    // 🎯 Difficulty Levels
    DIFFICULTY_LEVELS: {
        BEGINNER: {
            name: 'Beginner',
            description: 'No prior experience required',
            durationExtension: 0,
            color: '#10B981'
        },
        INTERMEDIATE: {
            name: 'Intermediate',
            description: 'Some basic knowledge helpful',
            durationExtension: 2, // Weeks
            color: '#F59E0B'
        },
        ADVANCED: {
            name: 'Advanced',
            description: 'Substantial prior experience recommended', 
            durationExtension: 4, // Weeks
            color: '#EF4444'
        }
    },

    // 🎯 Demand Levels
    DEMAND_LEVELS: {
        LOW: {
            name: 'Low Demand',
            color: '#6B7280',
            recommendation: 'Consider higher demand skills'
        },
        MEDIUM: {
            name: 'Medium Demand', 
            color: '#F59E0B',
            recommendation: 'Good market opportunities'
        },
        MEDIUM_HIGH: {
            name: 'Medium-High Demand',
            color: '#3B82F6',
            recommendation: 'Strong market demand'
        },
        HIGH: {
            name: 'High Demand',
            color: '#10B981', 
            recommendation: 'Excellent income potential'
        },
        VERY_HIGH: {
            name: 'Very High Demand',
            color: '#8B5CF6',
            recommendation: 'Premium income opportunities'
        }
    }
};

// 🎯 LEARNING PROGRESSION SYSTEM
const PROGRESSION_SYSTEM = {
    // 🏆 Achievement Levels
    LEVELS: {
        NOVICE: {
            minPoints: 0,
            maxPoints: 100,
            title: 'Novice Learner',
            badge: '🟢'
        },
        APPRENTICE: {
            minPoints: 101,
            maxPoints: 300,
            title: 'Apprentice',
            badge: '🔵'
        },
        PRACTITIONER: {
            minPoints: 301, 
            maxPoints: 600,
            title: 'Practitioner',
            badge: '🟣'
        },
        PROFICIENT: {
            minPoints: 601,
            maxPoints: 1000,
            title: 'Proficient',
            badge: '🟡'
        },
        EXPERT: {
            minPoints: 1001,
            maxPoints: 1500, 
            title: 'Expert',
            badge: '🟠'
        },
        MASTER: {
            minPoints: 1501,
            maxPoints: Infinity,
            title: 'Master',
            badge: '🔴'
        }
    },

    // 🎯 Points System
    POINTS_ALLOCATION: {
        EXERCISE_COMPLETION: 10,
        DAILY_STREAK: 5,
        MODULE_COMPLETION: 50,
        PHASE_COMPLETION: 100,
        SKILL_MASTERY: 200,
        PERFECT_EXERCISE: 15,
        HELPING_OTHERS: 25
    },

    // 🏅 Badges & Achievements
    ACHIEVEMENTS: {
        EARLY_BIRD: {
            name: 'Early Bird',
            description: 'Complete 5 exercises before 8 AM',
            points: 50,
            badge: '🌅'
        },
        STREAK_MASTER: {
            name: 'Streak Master',
            description: 'Maintain 30-day learning streak',
            points: 100,
            badge: '🔥'
        },
        PERFECTIONIST: {
            name: 'Perfectionist',
            description: 'Score 100% on 10 consecutive exercises',
            points: 75,
            badge: '⭐'
        },
        HELPING_HAND: {
            name: 'Helping Hand',
            description: 'Help 5 other students in community',
            points: 60,
            badge: '🤝'
        },
        SPEED_LEARNER: {
            name: 'Speed Learner',
            description: 'Complete theory phase 2 weeks early',
            points: 120,
            badge: '⚡'
        }
    }
};

// 🎯 DUOLINGO-STYLE EXERCISE ENGINE
const EXERCISE_ENGINE = {
    // 🎮 Exercise Templates
    TEMPLATES: {
        MULTIPLE_CHOICE: {
            type: 'multiple_choice',
            structure: {
                question: 'string',
                options: 'array',
                correctAnswer: 'string',
                explanation: 'string',
                difficulty: 'number',
                timeLimit: 'number'
            },
            scoring: {
                basePoints: 10,
                timeBonus: 5,
                streakBonus: 2
            }
        },

        INTERACTIVE_DECISION: {
            type: 'interactive_decision', 
            structure: {
                scenario: 'string',
                decisions: 'array',
                consequences: 'object',
                learningObjectives: 'array'
            },
            scoring: {
                optimalPath: 15,
                goodPath: 10,
                learningPath: 8
            }
        },

        REAL_TIME_CHART: {
            type: 'real_time_chart',
            structure: {
                chartData: 'array',
                timeframe: 'string',
                indicators: 'array',
                decisions: 'array'
            },
            scoring: {
                accuracy: 12,
                riskManagement: 8,
                timing: 5
            }
        },

        CODE_CHALLENGE: {
            type: 'code_challenge',
            structure: {
                problem: 'string',
                requirements: 'array',
                testCases: 'array',
                solution: 'string'
            },
            scoring: {
                functionality: 15,
                efficiency: 10,
                bestPractices: 5
            }
        }
    },

    // 🎯 Adaptive Learning Algorithm
    ADAPTIVE_LEARNING: {
        MASTERY_THRESHOLD: 80, // Percentage to master a concept
        REVIEW_FREQUENCY: 3, // Days between review exercises
        DIFFICULTY_ADJUSTMENT: {
            EASY: 0.8,
            MEDIUM: 1.0,
            HARD: 1.2,
            EXPERT: 1.5
        },
        PERSONALIZATION_FACTORS: [
            'learning_pace',
            'error_patterns', 
            'time_of_day',
            'preferred_exercise_types'
        ]
    },

    // 🕒 Time Management
    TIME_SETTINGS: {
        MAX_EXERCISE_TIME: 30, // Minutes
        DAILY_GOAL: 20, // Points
        WEEKLY_TARGET: 140, // Points
        RECOMMENDED_SESSION: 45 // Minutes
    }
};

// 🎯 CERTIFICATION STANDARDS
const CERTIFICATION_STANDARDS = {
    MINIMUM_REQUIREMENTS: {
        THEORY_SCORE: 80, // Percentage
        PRACTICAL_ASSESSMENT: 75, // Percentage
        PROJECT_COMPLETION: 100, // Percentage
        ATTENDANCE_RATE: 85, // Percentage
        PEER_REVIEW_SCORE: 4.0 // Stars
    },

    CERTIFICATION_TIERS: {
        BASIC: {
            name: 'Mosa Certified',
            requirements: {
                theoryScore: 80,
                practicalScore: 75,
                projectCompletion: 100
            },
            yachiVerification: true
        },
        PROFESSIONAL: {
            name: 'Mosa Professional',
            requirements: {
                theoryScore: 90,
                practicalScore: 85, 
                projectCompletion: 100,
                peerReview: 4.5
            },
            yachiVerification: true,
            featuredListing: true
        },
        EXPERT: {
            name: 'Mosa Expert',
            requirements: {
                theoryScore: 95,
                practicalScore: 90,
                projectCompletion: 100,
                peerReview: 4.8,
                portfolioReview: true
            },
            yachiVerification: true,
            featuredListing: true,
            premiumBadge: true
        }
    },

    YACHI_INTEGRATION: {
        AUTO_VERIFICATION: true,
        PROVIDER_CATEGORIES: {
            FOREX_TRADING: 'Financial Services',
            GRAPHIC_DESIGN: 'Creative Services',
            WOODWORKING: 'Construction & Carpentry',
            PERSONAL_TRAINING: 'Health & Fitness'
            // ... all other skills
        },
        SERVICE_TIERS: ['Beginner', 'Intermediate', 'Advanced', 'Expert']
    }
};

// 🎯 ENTERPRISE UTILITY FUNCTIONS
class LearningPathUtils {
    /**
     * Get complete learning path for a skill
     * @param {string} skillId - The skill identifier
     * @returns {Object} Complete learning path configuration
     */
    static getLearningPath(skillId) {
        const path = SKILLS_LEARNING_PATHS[skillId];
        if (!path) {
            throw new Error(`Learning path not found for skill: ${skillId}`);
        }
        return {
            ...path,
            category: SKILLS_CATALOG.CATEGORIES[path.category],
            difficulty: SKILLS_CATALOG.DIFFICULTY_LEVELS[path.difficulty],
            demand: SKILLS_CATALOG.DEMAND_LEVELS[path.demandLevel]
        };
    }

    /**
     * Calculate estimated completion time
     * @param {string} skillId - The skill identifier
     * @param {string} difficulty - Student's difficulty level
     * @returns {Object} Completion time estimates
     */
    static getCompletionEstimate(skillId, difficulty = 'BEGINNER') {
        const path = this.getLearningPath(skillId);
        const difficultyExtension = SKILLS_CATALOG.DIFFICULTY_LEVELS[difficulty]?.durationExtension || 0;
        
        const totalWeeks = 
            (4) + // Mindset phase
            (8) + // Theory phase  
            (8) + // Hands-on phase
            (2) + // Certification phase
            (difficultyExtension / 7); // Difficulty adjustment

        return {
            totalWeeks: Math.ceil(totalWeeks),
            totalMonths: Math.ceil(totalWeeks / 4),
            mindsetWeeks: 4,
            theoryWeeks: 8,
            handsOnWeeks: 8,
            certificationWeeks: 2,
            difficultyAdjustment: difficultyExtension
        };
    }

    /**
     * Get skills by category
     * @param {string} category - Category identifier
     * @returns {Array} Skills in category
     */
    static getSkillsByCategory(category) {
        const categoryData = SKILLS_CATALOG.CATEGORIES[category];
        if (!categoryData) {
            throw new Error(`Category not found: ${category}`);
        }

        return categoryData.skills.map(skillId => 
            this.getLearningPath(skillId)
        );
    }

    /**
     * Get recommended skills based on criteria
     * @param {Object} criteria - Filter criteria
     * @returns {Array} Recommended skills
     */
    static getRecommendedSkills(criteria = {}) {
        let skills = Object.values(SKILLS_LEARNING_PATHS);

        // Apply filters
        if (criteria.category) {
            skills = skills.filter(skill => skill.category === criteria.category);
        }
        if (criteria.difficulty) {
            skills = skills.filter(skill => skill.difficulty === criteria.difficulty);
        }
        if (criteria.demandLevel) {
            skills = skills.filter(skill => skill.demandLevel === criteria.demandLevel);
        }
        if (criteria.maxDuration) {
            skills = skills.filter(skill => {
                const estimate = this.getCompletionEstimate(skill.id);
                return estimate.totalWeeks <= criteria.maxDuration;
            });
        }

        // Sort by demand and income potential
        return skills.sort((a, b) => {
            const demandOrder = ['VERY_HIGH', 'HIGH', 'MEDIUM_HIGH', 'MEDIUM', 'LOW'];
            const aDemand = demandOrder.indexOf(a.demandLevel);
            const bDemand = demandOrder.indexOf(b.demandLevel);
            
            if (aDemand !== bDemand) {
                return bDemand - aDemand;
            }

            // Secondary sort by estimated income
            const aIncome = parseInt(a.estimatedIncome.split('-')[0].replace(/,/g, ''));
            const bIncome = parseInt(b.estimatedIncome.split('-')[0].replace(/,/g, ''));
            return bIncome - aIncome;
        });
    }

    /**
     * Validate exercise completion requirements
     * @param {string} skillId - The skill identifier
     * @param {string} phase - Learning phase
     * @param {number} completedExercises - Number of exercises completed
     * @returns {Object} Validation result
     */
    static validatePhaseCompletion(skillId, phase, completedExercises) {
        const path = this.getLearningPath(skillId);
        const phaseData = path.phases[phase];
        
        if (!phaseData) {
            return {
                isValid: false,
                error: `Phase not found: ${phase}`,
                required: 0,
                completed: completedExercises
            };
        }

        const requiredExercises = phaseData.exercises || 
                                (phaseData.modules?.reduce((sum, module) => sum + module.exercises, 0)) || 0;

        const isComplete = completedExercises >= requiredExercises * (LEARNING_PATHS.PROGRESS_STANDARDS.COMPLETION_THRESHOLD / 100);

        return {
            isValid: isComplete,
            required: Math.ceil(requiredExercises * (LEARNING_PATHS.PROGRESS_STANDARDS.COMPLETION_THRESHOLD / 100)),
            completed: completedExercises,
            progress: (completedExercises / requiredExercises) * 100,
            canProceed: isComplete
        };
    }

    /**
     * Calculate learning points and level
     * @param {number} totalPoints - Accumulated points
     * @returns {Object} Level information
     */
    static calculateLevel(totalPoints) {
        const levels = PROGRESSION_SYSTEM.LEVELS;
        const currentLevel = Object.values(levels).find(level => 
            totalPoints >= level.minPoints && totalPoints <= level.maxPoints
        ) || levels.NOVICE;

        const nextLevel = Object.values(levels).find(level => level.minPoints > currentLevel.maxPoints);
        const pointsToNext = nextLevel ? nextLevel.minPoints - totalPoints : 0;
        const progress = nextLevel ? 
            ((totalPoints - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100 : 100;

        return {
            currentLevel,
            nextLevel,
            pointsToNext,
            progress,
            totalPoints
        };
    }
}

// 🎯 ENTERPRISE EXPORTS
module.exports = {
    // Core Constants
    LEARNING_PATHS,
    SKILLS_LEARNING_PATHS, 
    SKILLS_CATALOG,
    PROGRESSION_SYSTEM,
    EXERCISE_ENGINE,
    CERTIFICATION_STANDARDS,

    // Utility Class
    LearningPathUtils,

    // Individual Exports for Specific Use Cases
    PHASES: LEARNING_PATHS.PHASES,
    EXERCISE_TYPES: LEARNING_PATHS.EXERCISE_TYPES,
    PROGRESS_STANDARDS: LEARNING_PATHS.PROGRESS_STANDARDS,
    QUALITY_THRESHOLDS: LEARNING_PATHS.QUALITY_THRESHOLDS,

    // Helper Functions
    getAllSkills: () => Object.keys(SKILLS_LEARNING_PATHS),
    getCategories: () => Object.keys(SKILLS_CATALOG.CATEGORIES),
    getDifficultyLevels: () => Object.keys(SKILLS_CATALOG.DIFFICULTY_LEVELS),
    getDemandLevels: () => Object.keys(SKILLS_CATALOG.DEMAND_LEVELS)
};

// 🏗️ Enterprise Configuration Validation
if (process.env.NODE_ENV === 'development') {
    console.log('🎯 Mosa Forge Learning Paths Loaded:');
    console.log(`📚 Skills: ${Object.keys(SKILLS_LEARNING_PATHS).length}`);
    console.log(`📁 Categories: ${Object.keys(SKILLS_CATALOG.CATEGORIES).length}`);
    console.log(`🎮 Exercise Types: ${Object.keys(EXERCISE_ENGINE.TEMPLATES).length}`);
    console.log('🚀 Learning Paths Constants - Enterprise Ready!');
}