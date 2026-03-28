// constants/quality-config.js

/**
 * 🎯 ENTERPRISE QUALITY CONFIGURATION
 * Production-ready quality thresholds and configurations for Mosa Forge
 * Centralized quality management for expert performance, student protection, and platform standards
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const QualityConfig = {
  // 🎯 EXPERT TIER CONFIGURATION
  EXPERT_TIERS: {
    MASTER: {
      MIN_SCORE: 4.7,
      MAX_STUDENTS: null, // Unlimited with quality maintenance
      BONUS_PERCENTAGE: 20,
      REQUIREMENTS: {
        MIN_RATINGS: 10,
        COMPLETION_RATE: 0.85, // 85%+
        RESPONSE_TIME: 4, // hours
        STUDENT_RETENTION: 0.90 // 90%+
      },
      COLOR: '#10B981', // Emerald
      BADGE: '🏆 Master',
      PRIORITY: 1
    },
    SENIOR: {
      MIN_SCORE: 4.3,
      MAX_STUDENTS: 100,
      BONUS_PERCENTAGE: 10,
      REQUIREMENTS: {
        MIN_RATINGS: 5,
        COMPLETION_RATE: 0.80, // 80%+
        RESPONSE_TIME: 8, // hours
        STUDENT_RETENTION: 0.85 // 85%+
      },
      COLOR: '#3B82F6', // Blue
      BADGE: '⭐ Senior',
      PRIORITY: 2
    },
    STANDARD: {
      MIN_SCORE: 4.0,
      MAX_STUDENTS: 50,
      BONUS_PERCENTAGE: 0,
      REQUIREMENTS: {
        MIN_RATINGS: 3,
        COMPLETION_RATE: 0.75, // 75%+
        RESPONSE_TIME: 12, // hours
        STUDENT_RETENTION: 0.80 // 80%+
      },
      COLOR: '#6B7280', // Gray
      BADGE: '✅ Standard',
      PRIORITY: 3
    },
    DEVELOPING: {
      MIN_SCORE: 3.5,
      MAX_STUDENTS: 25,
      BONUS_PERCENTAGE: -10,
      REQUIREMENTS: {
        MIN_RATINGS: 1,
        COMPLETION_RATE: 0.65, // 65%+
        RESPONSE_TIME: 24, // hours
        STUDENT_RETENTION: 0.70 // 70%+
      },
      COLOR: '#F59E0B', // Amber
      BADGE: '🌱 Developing',
      PRIORITY: 4
    },
    PROBATION: {
      MIN_SCORE: 0,
      MAX_STUDENTS: 10,
      BONUS_PERCENTAGE: -20,
      REQUIREMENTS: {
        MIN_RATINGS: 0,
        COMPLETION_RATE: 0.50, // 50%+
        RESPONSE_TIME: 48, // hours
        STUDENT_RETENTION: 0.60 // 60%+
      },
      COLOR: '#EF4444', // Red
      BADGE: '⚠️ Probation',
      PRIORITY: 5
    }
  },

  // 📊 QUALITY SCORE CALCULATION WEIGHTS
  SCORE_WEIGHTS: {
    RATING_AVERAGE: 0.35,        // Average star rating
    COMPLETION_RATE: 0.25,       // % of students completing training
    RESPONSE_TIME: 0.15,         // Average response time to students
    STUDENT_RETENTION: 0.10,     // % of students continuing to next phase
    PROGRESS_VELOCITY: 0.10,     // Speed of student progress
    FEEDBACK_QUALITY: 0.05       // Quality of expert feedback
  },

  // 🚨 AUTO-ENFORCEMENT THRESHOLDS
  ENFORCEMENT_THRESHOLDS: {
    // Immediate auto-pause triggers
    CRITICAL: {
      COMPLETION_RATE: 0.50,     // Below 50% completion
      AVERAGE_RATING: 2.0,       // Below 2.0 stars
      RESPONSE_TIME: 72,         // Over 72 hours response
      STUDENT_COMPLAINTS: 5,     // 5+ complaints in 30 days
      FRAUD_DETECTED: true       // Any fraud detection
    },
    
    // Warning triggers (7-day improvement period)
    WARNING: {
      COMPLETION_RATE: 0.65,     // Below 65% completion
      AVERAGE_RATING: 3.0,       // Below 3.0 stars
      RESPONSE_TIME: 48,         // Over 48 hours response
      STUDENT_COMPLAINTS: 3,     // 3+ complaints in 30 days
      QUALITY_DECLINE: 0.5       // 0.5 point drop in 30 days
    },
    
    // Monitoring triggers (notification only)
    MONITORING: {
      COMPLETION_RATE: 0.75,     // Below 75% completion
      AVERAGE_RATING: 4.0,       // Below 4.0 stars
      RESPONSE_TIME: 24,         // Over 24 hours response
      QUALITY_DECLINE: 0.2       // 0.2 point drop in 30 days
    }
  },

  // ⚡ REAL-TIME MONITORING CONFIG
  MONITORING: {
    CHECK_INTERVAL: 300000,      // 5 minutes in milliseconds
    DATA_RETENTION: 90,          // Days to keep detailed metrics
    SAMPLE_RATE: 0.1,            // 10% of ratings for deep analysis
    ALERT_COOLDOWN: 3600000,     // 1 hour between duplicate alerts
    
    // Performance buckets for analytics
    PERFORMANCE_BUCKETS: {
      EXCELLENT: 4.5,
      GOOD: 4.0,
      AVERAGE: 3.5,
      POOR: 3.0,
      CRITICAL: 2.0
    }
  },

  // 🛡️ STUDENT PROTECTION CONFIG
  STUDENT_PROTECTION: {
    AUTO_EXPERT_SWITCH: {
      TRIGGERS: {
        RESPONSE_TIME_EXCEEDED: 48,      // 48+ hours no response
        QUALITY_DROP_BELOW: 3.0,         // Expert below 3.0 rating
        PROGRESS_STALLED: 14,            // 14+ days no progress
        STUDENT_REQUEST: true            // Student requests switch
      },
      COOLDOWN_PERIOD: 7,                // Days between auto-switches
      MAX_SWITCHES: 2,                   // Max auto-switches per course
      PRESERVE_PROGRESS: true            // Maintain student progress
    },

    REFUND_POLICY: {
      FULL_REFUND_DAYS: 7,               // 7-day cooling period
      PRORATED_REFUND: true,             // Prorated refunds after 7 days
      MIN_COMPLETION_REFUND: 0.25,       // 25% completion for partial refund
      QUALITY_REFUND_THRESHOLD: 2.5      // Auto-refund if quality below 2.5
    }
  },

  // 📈 PROGRESS MONITORING THRESHOLDS
  PROGRESS_MONITORING: {
    THEORY_PHASE: {
      DURATION_DAYS: 60,                 // 2-month theory phase
      WEEKLY_PROGRESS_TARGET: 0.125,     // 12.5% weekly (100% in 8 weeks)
      MIN_WEEKLY_PROGRESS: 0.05,         // 5% minimum weekly progress
      STALL_THRESHOLD_DAYS: 14           // 2 weeks no progress = stalled
    },

    HANDS_ON_PHASE: {
      DURATION_DAYS: 60,                 // 2-month hands-on phase
      WEEKLY_SESSIONS_TARGET: 2,         // 2 sessions per week
      MIN_WEEKLY_SESSIONS: 1,            // 1 session minimum per week
      COMPLETION_MILESTONES: [0.25, 0.50, 0.75, 1.0] // Progress checkpoints
    },

    COMPLETION_REQUIREMENTS: {
      MIN_THEORY_PROGRESS: 0.85,         // 85% theory completion
      MIN_HANDS_ON_SESSIONS: 8,          // 8+ hands-on sessions
      FINAL_ASSESSMENT_SCORE: 0.70,      // 70%+ final assessment
      ATTENDANCE_RATE: 0.80              // 80%+ session attendance
    }
  },

  // 🔍 FRAUD DETECTION CONFIG
  FRAUD_DETECTION: {
    RATING_PATTERNS: {
      ALL_FIVE_STARS_THRESHOLD: 0.95,    // 95%+ ratings are 5 stars
      RAPID_RATING_INTERVAL: 300000,     // 5 minutes between ratings
      SAME_EXPERTS_LIMIT: 3,             // Max ratings for same expert
      RATING_VELOCITY_CHANGE: 2.0        // 2+ point sudden change
    },

    ENROLLMENT_PATTERNS: {
      MULTIPLE_ENROLLMENTS: 3,           // Max simultaneous enrollments
      RAPID_CANCELLATIONS: 5,            // 5+ cancellations in 30 days
      PAYMENT_RETRY_LIMIT: 3,            // Max payment retries
      GEO_LOCATION_MISMATCH: true        // Flag location inconsistencies
    },

    FRAUD_SCORE_WEIGHTS: {
      RATING_ANOMALIES: 0.30,
      ENROLLMENT_PATTERNS: 0.25,
      PAYMENT_BEHAVIOR: 0.20,
      GEOGRAPHIC_DATA: 0.15,
      TEMPORAL_PATTERNS: 0.10
    }
  },

  // 💰 PERFORMANCE BONUS CALCULATION
  BONUS_CALCULATIONS: {
    BASE_RATES: {
      MASTER: 1.20,      // 20% bonus
      SENIOR: 1.10,      // 10% bonus
      STANDARD: 1.00,    // Base rate
      DEVELOPING: 0.90,  // 10% penalty
      PROBATION: 0.80    // 20% penalty
    },

    ADDITIONAL_BONUSES: {
      HIGH_COMPLETION: {
        THRESHOLD: 0.90, // 90%+ completion
        BONUS: 0.05      // 5% additional
      },
      EXCELLENT_FEEDBACK: {
        THRESHOLD: 4.8,  // 4.8+ average rating
        BONUS: 0.03      // 3% additional
      },
      FAST_RESPONSE: {
        THRESHOLD: 2,    // 2-hour average response
        BONUS: 0.02      // 2% additional
      },
      STUDENT_RETENTION: {
        THRESHOLD: 0.95, // 95%+ retention
        BONUS: 0.04      // 4% additional
      }
    },

    MAX_TOTAL_BONUS: 0.25, // 25% maximum total bonus
    BONUS_EVALUATION_INTERVAL: 30 // Days between bonus calculations
  },

  // 📊 ANALYTICS AND REPORTING
  ANALYTICS: {
    QUALITY_TRENDS: {
      EVALUATION_WINDOW: 30,     // Days for trend analysis
      MIN_DATA_POINTS: 5,        // Minimum ratings for trend
      SIGNIFICANT_CHANGE: 0.1    // 10% change is significant
    },

    PLATFORM_BENCHMARKS: {
      OVERALL_COMPLETION_RATE: 0.70,
      AVERAGE_EXPERT_RATING: 4.2,
      STUDENT_SATISFACTION: 0.85,
      EXPERT_RETENTION: 0.80,
      REVENUE_PER_STUDENT: 1999
    },

    REPORTING_INTERVALS: {
      REAL_TIME: 5,              // Minutes
      HOURLY: 60,                // Minutes
      DAILY: 1440,               // Minutes
      WEEKLY: 10080,             // Minutes
      MONTHLY: 43200             // Minutes
    }
  },

  // 🔧 SYSTEM OPERATIONAL CONFIG
  OPERATIONAL: {
    AUTO_ENFORCEMENT: {
      ENABLED: true,
      BATCH_SIZE: 100,           // Experts per batch
      PROCESSING_DELAY: 300000,  // 5 minute delay
      RETRY_ATTEMPTS: 3,
      RETRY_DELAY: 60000         // 1 minute between retries
    },

    NOTIFICATION_SETTINGS: {
      QUALITY_ALERTS: true,
      TIER_CHANGES: true,
      ENFORCEMENT_ACTIONS: true,
      PERFORMANCE_MILESTONES: true,
      SYSTEM_HEALTH: true
    },

    DATA_CLEANUP: {
      TEMP_DATA_RETENTION: 7,    // Days
      LOG_RETENTION: 30,         // Days
      BACKUP_RETENTION: 90,      // Days
      ARCHIVE_ENABLED: true
    }
  },

  // 🌍 REGION-SPECIFIC CONFIGURATIONS
  REGIONAL_CONFIG: {
    ETHIOPIA: {
      CURRENCY: 'ETB',
      TIMEZONE: 'Africa/Addis_Ababa',
      WORKING_HOURS: {
        START: 8,    // 8 AM
        END: 18,     // 6 PM
        DAYS: [1, 2, 3, 4, 5, 6] // Mon-Sat
      },
      HOLIDAYS: [
        '01-07', // Ethiopian Christmas
        '01-19', // Timket
        '03-02', // Adwa Victory Day
        '04-06', // Ethiopian Good Friday
        '04-08', // Ethiopian Easter
        '05-01', // International Workers' Day
        '05-28', // Downfall of Derg
        '09-11', // Ethiopian New Year
        '09-27'  // Finding of True Cross
      ]
    }
  },

  // 🚀 PERFORMANCE OPTIMIZATION
  PERFORMANCE: {
    CACHE_TTL: {
      EXPERT_METRICS: 3600,      // 1 hour
      QUALITY_SCORES: 1800,      // 30 minutes
      TIER_CALCULATIONS: 900,    // 15 minutes
      ANALYTICS_DATA: 300        // 5 minutes
    },

    BATCH_PROCESSING: {
      MAX_BATCH_SIZE: 1000,
      PROCESSING_INTERVAL: 300000, // 5 minutes
      CONCURRENT_WORKERS: 3
    },

    DATABASE: {
      MAX_CONNECTIONS: 20,
      QUERY_TIMEOUT: 30000,      // 30 seconds
      CONNECTION_TIMEOUT: 10000  // 10 seconds
    }
  }
};

// 🛡️ VALIDATION FUNCTIONS
class QualityConfigValidator {
  static validateExpertTier(tier) {
    const validTiers = Object.keys(QualityConfig.EXPERT_TIERS);
    if (!validTiers.includes(tier)) {
      throw new Error(`Invalid expert tier: ${tier}. Must be one of: ${validTiers.join(', ')}`);
    }
    return true;
  }

  static validateQualityScore(score) {
    if (score < 0 || score > 5) {
      throw new Error(`Quality score must be between 0 and 5, got: ${score}`);
    }
    return true;
  }

  static validateCompletionRate(rate) {
    if (rate < 0 || rate > 1) {
      throw new Error(`Completion rate must be between 0 and 1, got: ${rate}`);
    }
    return true;
  }
}

// 🔧 HELPER FUNCTIONS
class QualityConfigHelpers {
  static getTierForScore(qualityScore, ratingCount = 0) {
    const tiers = QualityConfig.EXPERT_TIERS;
    
    if (ratingCount < 3) return 'STANDARD';
    if (qualityScore >= tiers.MASTER.MIN_SCORE) return 'MASTER';
    if (qualityScore >= tiers.SENIOR.MIN_SCORE) return 'SENIOR';
    if (qualityScore >= tiers.STANDARD.MIN_SCORE) return 'STANDARD';
    if (qualityScore >= tiers.DEVELOPING.MIN_SCORE) return 'DEVELOPING';
    return 'PROBATION';
  }

  static calculateBonusMultiplier(tier, performanceMetrics = {}) {
    const baseRate = QualityConfig.BONUS_CALCULATIONS.BASE_RATES[tier] || 1.0;
    let additionalBonus = 0;

    // Calculate additional performance bonuses
    if (performanceMetrics.completionRate >= QualityConfig.BONUS_CALCULATIONS.ADDITIONAL_BONUSES.HIGH_COMPLETION.THRESHOLD) {
      additionalBonus += QualityConfig.BONUS_CALCULATIONS.ADDITIONAL_BONUSES.HIGH_COMPLETION.BONUS;
    }

    if (performanceMetrics.averageRating >= QualityConfig.BONUS_CALCULATIONS.ADDITIONAL_BONUSES.EXCELLENT_FEEDBACK.THRESHOLD) {
      additionalBonus += QualityConfig.BONUS_CALCULATIONS.ADDITIONAL_BONUSES.EXCELLENT_FEEDBACK.BONUS;
    }

    if (performanceMetrics.averageResponseTime <= QualityConfig.BONUS_CALCULATIONS.ADDITIONAL_BONUSES.FAST_RESPONSE.THRESHOLD) {
      additionalBonus += QualityConfig.BONUS_CALCULATIONS.ADDITIONAL_BONUSES.FAST_RESPONSE.BONUS;
    }

    if (performanceMetrics.studentRetention >= QualityConfig.BONUS_CALCULATIONS.ADDITIONAL_BONUSES.STUDENT_RETENTION.THRESHOLD) {
      additionalBonus += QualityConfig.BONUS_CALCULATIONS.ADDITIONAL_BONUSES.STUDENT_RETENTION.BONUS;
    }

    const totalMultiplier = baseRate + Math.min(additionalBonus, QualityConfig.BONUS_CALCULATIONS.MAX_TOTAL_BONUS);
    return parseFloat(totalMultiplier.toFixed(3));
  }

  static shouldTriggerEnforcement(expertMetrics) {
    const thresholds = QualityConfig.ENFORCEMENT_THRESHOLDS.CRITICAL;

    return (
      expertMetrics.completionRate < thresholds.COMPLETION_RATE ||
      expertMetrics.averageRating < thresholds.AVERAGE_RATING ||
      expertMetrics.averageResponseTime > thresholds.RESPONSE_TIME ||
      expertMetrics.studentComplaints >= thresholds.STUDENT_COMPLAINTS ||
      expertMetrics.fraudDetected === true
    );
  }

  static getPerformanceBucket(score) {
    const buckets = QualityConfig.MONITORING.PERFORMANCE_BUCKETS;
    
    if (score >= buckets.EXCELLENT) return 'EXCELLENT';
    if (score >= buckets.GOOD) return 'GOOD';
    if (score >= buckets.AVERAGE) return 'AVERAGE';
    if (score >= buckets.POOR) return 'POOR';
    return 'CRITICAL';
  }
}

// Export configuration and utilities
module.exports = {
  QualityConfig,
  QualityConfigValidator,
  QualityConfigHelpers
};