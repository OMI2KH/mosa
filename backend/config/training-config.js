// config/training-config.js

/**
 * 🎯 ENTERPRISE TRAINING CONFIGURATION
 * Production-ready training parameters for Mosa Forge
 * Centralized configuration for all training-related settings
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { Logger } = require('../utils/logger');

class TrainingConfig {
  constructor() {
    this.logger = new Logger('TrainingConfig');
    this._config = this.loadDefaultConfig();
    this._validators = this.setupValidators();
    this.initialize();
  }

  /**
   * Initialize configuration with environment overrides
   */
  initialize() {
    try {
      this.applyEnvironmentOverrides();
      this.validateConfiguration();
      this.logger.info('Training configuration initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize training configuration', error);
      throw error;
    }
  }

  /**
   * 🏗️ LOAD DEFAULT ENTERPRISE CONFIGURATION
   */
  loadDefaultConfig() {
    return {
      // 🎯 PHASE DURATIONS & TIMELINES
      phases: {
        mindset: {
          durationDays: 30,
          isFree: true,
          maxExtensionDays: 7,
          weeklyProgressTarget: 25, // percentage
          completionThreshold: 80, // percentage
          modules: [
            'wealth_consciousness',
            'discipline_building', 
            'action_taking',
            'financial_psychology'
          ]
        },
        theory: {
          durationDays: 60,
          weeklyProgressTarget: 12.5, // percentage
          completionThreshold: 85, // percentage
          dailyExerciseTarget: 5,
          maxExercisesPerDay: 20,
          masteryThreshold: 90, // percentage for progression
          retryLimit: 3
        },
        handsOn: {
          durationDays: 60,
          sessionsPerWeek: {
            minimum: 2,
            recommended: 3,
            maximum: 5
          },
          sessionDurationMinutes: {
            standard: 120,
            intensive: 180,
            maximum: 240
          },
          studentsPerSession: {
            minimum: 1,
            optimal: 5,
            maximum: 8
          },
          completionThreshold: 90, // percentage
          projectCompletionRequired: 3
        },
        certification: {
          durationDays: 14,
          assessmentPassingScore: 80, // percentage
          maxRetryAttempts: 2,
          retryCooloffDays: 7
        }
      },

      // 👨‍🏫 EXPERT CAPACITY & QUALITY PARAMETERS
      expert: {
        capacity: {
          standard: {
            maxStudents: 50,
            maxSessionsPerWeek: 15,
            studentToSessionRatio: 3.3
          },
          senior: {
            maxStudents: 100,
            maxSessionsPerWeek: 25,
            studentToSessionRatio: 4.0
          },
          master: {
            maxStudents: null, // Unlimited with quality maintenance
            maxSessionsPerWeek: 40,
            studentToSessionRatio: 5.0
          },
          developing: {
            maxStudents: 25,
            maxSessionsPerWeek: 10,
            studentToSessionRatio: 2.5
          },
          probation: {
            maxStudents: 10,
            maxSessionsPerWeek: 5,
            studentToSessionRatio: 2.0
          }
        },
        performance: {
          minimumRating: 4.0,
          responseTimeThreshold: 24, // hours
          sessionCompletionRate: 70, // percentage
          studentSatisfaction: 80, // percentage
          qualityScoreWeights: {
            rating: 0.4,
            completionRate: 0.3,
            responseTime: 0.2,
            studentFeedback: 0.1
          }
        },
        matching: {
          skillRelevanceWeight: 0.4,
          availabilityMatchWeight: 0.3,
          studentPreferenceWeight: 0.2,
          qualityScoreWeight: 0.1,
          maxDistanceKm: 50, // For offline skills
          timezoneBufferHours: 2
        }
      },

      // 🎓 STUDENT PROGRESS & ENGAGEMENT
      student: {
        progress: {
          weeklyEngagementTarget: 5, // hours
          minimumWeeklyProgress: 5, // percentage
          inactivityThresholdDays: 7,
          maxInactivityExtensions: 2,
          autoPauseAfterDays: 21
        },
        assessment: {
          passingScore: 70, // percentage
          masteryScore: 85, // percentage
          maxAttemptsPerExercise: 3,
          cooloffPeriodMinutes: 30
        },
        support: {
          maxSupportTicketsPerWeek: 3,
          responseTimeSla: 24, // hours
          emergencyResponseTime: 4 // hours
        }
      },

      // 🏋️ TRAINING SESSION PARAMETERS
      sessions: {
        scheduling: {
          advanceBookingDays: 14,
          cancellationNoticeHours: 24,
          rescheduleLimit: 2,
          noShowPenaltyHours: 48,
          bufferBetweenSessions: 30 // minutes
        },
        attendance: {
          minimumAttendance: 80, // percentage
          lateJoinThreshold: 15, // minutes
          earlyLeavePenalty: 10, // percentage of session value
          verification: {
            photoRequired: true,
            locationVerification: true,
            participationTracking: true
          }
        },
        quality: {
          minimumDuration: 45, // minutes for valid session
          participantFeedbackRequired: true,
          expertDebriefRequired: true,
          recordingRetentionDays: 90
        }
      },

      // 📚 LEARNING ENGINE PARAMETERS
      learning: {
        duolingo: {
          exerciseTypes: [
            'multiple_choice',
            'scenario_based',
            'interactive_simulation',
            'decision_making',
            'progressive_challenge'
          ],
          adaptive: {
            difficultyAdjustment: true,
            personalizedProgression: true,
            masteryBasedAdvancement: true
          },
          scoring: {
            correctAnswer: 10,
            partialCredit: 5,
            timeBonus: 2,
            streakMultiplier: 1.5
          }
        },
        mindset: {
          assessmentFrequency: 7, // days
          improvementThreshold: 15, // percentage
          reinforcementExercises: 3 // per week
        },
        realtime: {
          chartUpdateFrequency: 5, // seconds
          liveDataFeeds: true,
          simulationMode: true
        }
      },

      // 💰 PAYMENT & REVENUE PARAMETERS
      payment: {
        bundlePrice: 1999, // ETB
        revenueSplit: {
          mosa: 1000,
          expert: 999
        },
        payoutSchedule: {
          upfront: 333, // Course start
          milestone: 333, // 75% completion
          completion: 333 // Certification
        },
        bonuses: {
          master: 0.2, // 20%
          senior: 0.1, // 10%
          standard: 0.0, // 0%
          developing: -0.1, // -10% penalty
          probation: -0.2 // -20% penalty
        },
        refund: {
          coolingPeriodDays: 7,
          proratedRefund: true,
          processingFee: 100, // ETB
          maxRefundPercentage: 80
        }
      },

      // 🛡️ QUALITY GUARANTEE PARAMETERS
      quality: {
        enforcement: {
          autoPauseThreshold: 3.5, // rating
          tierDemotionThreshold: 3.8, // rating
          studentProtectionTrigger: 3.0, // rating
          expertSwitchingThreshold: 2.5, // rating
          monitoringFrequency: 24 // hours
        },
        metrics: {
          ratingWeight: 0.25,
          completionRateWeight: 0.25,
          responseTimeWeight: 0.20,
          studentSatisfactionWeight: 0.15,
          sessionQualityWeight: 0.15
        },
        improvement: {
          actionPlanDays: 14,
          retrainingRequired: true,
          monitoringPeriod: 30, // days
          successThreshold: 4.0 // rating
        }
      },

      // 🔐 SECURITY & COMPLIANCE
      security: {
        fayda: {
          verificationRequired: true,
          duplicateCheck: true,
          biometricSupport: true
        },
        session: {
          recordingEncryption: true,
          dataRetentionDays: 365,
          accessLogging: true
        },
        payment: {
          pciCompliance: true,
          encryptionRequired: true,
          auditTrail: true
        }
      },

      // 📊 ANALYTICS & REPORTING
      analytics: {
        collection: {
          progressTracking: true,
          engagementMetrics: true,
          qualityScores: true,
          revenueAnalytics: true
        },
        retention: {
          rawDataDays: 90,
          aggregatedDataMonths: 24,
          anonymizedDataYears: 7
        },
        realtime: {
          dashboardUpdate: 5, // minutes
          alertThresholds: true,
          predictiveAnalytics: true
        }
      },

      // 🚀 SCALING & PERFORMANCE
      scaling: {
        microservices: {
          sessionService: {
            maxConcurrentSessions: 1000,
            horizontalScaling: true,
            loadBalancing: true
          },
          learningService: {
            maxConcurrentUsers: 5000,
            exerciseCache: true,
            cdnEnabled: true
          }
        },
        database: {
          connectionPool: 20,
          readReplicas: 3,
          queryTimeout: 30000 // milliseconds
        },
        cache: {
          redis: {
            sessionTtl: 3600, // seconds
            progressTtl: 1800,
            leaderboardTtl: 900
          }
        }
      },

      // 🌍 REGIONAL & LOCALIZATION
      regional: {
        ethiopia: {
          timezone: 'Africa/Addis_Ababa',
          currency: 'ETB',
          language: 'am',
          supportHours: {
            start: 8, // 8 AM
            end: 18, // 6 PM
            timezone: 'Africa/Addis_Ababa'
          }
        },
        payment: {
          gateways: ['telebirr', 'cbebirr'],
          localCurrency: true,
          taxInclusive: true
        },
        compliance: {
          dataSovereignty: true,
          localHosting: true,
          governmentReporting: true
        }
      }
    };
  }

  /**
   * 🔧 APPLY ENVIRONMENT OVERRIDES
   */
  applyEnvironmentOverrides() {
    // Phase durations
    if (process.env.MINDSET_DURATION_DAYS) {
      this._config.phases.mindset.durationDays = parseInt(process.env.MINDSET_DURATION_DAYS);
    }

    if (process.env.THEORY_DURATION_DAYS) {
      this._config.phases.theory.durationDays = parseInt(process.env.THEORY_DURATION_DAYS);
    }

    if (process.env.HANDS_ON_DURATION_DAYS) {
      this._config.phases.handsOn.durationDays = parseInt(process.env.HANDS_ON_DURATION_DAYS);
    }

    // Expert capacity
    if (process.env.EXPERT_STANDARD_CAPACITY) {
      this._config.expert.capacity.standard.maxStudents = parseInt(process.env.EXPERT_STANDARD_CAPACITY);
    }

    if (process.env.EXPERT_SENIOR_CAPACITY) {
      this._config.expert.capacity.senior.maxStudents = parseInt(process.env.EXPERT_SENIOR_CAPACITY);
    }

    // Payment configuration
    if (process.env.BUNDLE_PRICE_ETB) {
      this._config.payment.bundlePrice = parseInt(process.env.BUNDLE_PRICE_ETB);
    }

    if (process.env.MOSA_REVENUE_SHARE) {
      this._config.payment.revenueSplit.mosa = parseInt(process.env.MOSA_REVENUE_SHARE);
      this._config.payment.revenueSplit.expert = this._config.payment.bundlePrice - this._config.payment.revenueSplit.mosa;
    }

    // Quality thresholds
    if (process.env.MINIMUM_RATING_THRESHOLD) {
      this._config.quality.enforcement.autoPauseThreshold = parseFloat(process.env.MINIMUM_RATING_THRESHOLD);
    }

    // Performance settings
    if (process.env.MAX_CONCURRENT_SESSIONS) {
      this._config.scaling.microservices.sessionService.maxConcurrentSessions = parseInt(process.env.MAX_CONCURRENT_SESSIONS);
    }

    this.logger.debug('Environment overrides applied to training configuration');
  }

  /**
   * 🛡️ VALIDATE CONFIGURATION INTEGRITY
   */
  validateConfiguration() {
    const errors = [];

    // Validate phase durations
    if (this._config.phases.mindset.durationDays <= 0) {
      errors.push('Mindset phase duration must be positive');
    }

    if (this._config.phases.theory.durationDays <= 0) {
      errors.push('Theory phase duration must be positive');
    }

    if (this._config.phases.handsOn.durationDays <= 0) {
      errors.push('Hands-on phase duration must be positive');
    }

    // Validate revenue split
    const totalRevenue = this._config.payment.revenueSplit.mosa + this._config.payment.revenueSplit.expert;
    if (totalRevenue !== this._config.payment.bundlePrice) {
      errors.push(`Revenue split (${totalRevenue}) must equal bundle price (${this._config.payment.bundlePrice})`);
    }

    // Validate payout schedule
    const totalPayout = this._config.payment.payoutSchedule.upfront + 
                       this._config.payment.payoutSchedule.milestone + 
                       this._config.payment.payoutSchedule.completion;
    
    if (totalPayout !== this._config.payment.revenueSplit.expert) {
      errors.push(`Payout schedule (${totalPayout}) must equal expert revenue (${this._config.payment.revenueSplit.expert})`);
    }

    // Validate quality weights sum to 1
    const qualityWeights = Object.values(this._config.quality.metrics);
    const weightSum = qualityWeights.reduce((sum, weight) => sum + weight, 0);
    
    if (Math.abs(weightSum - 1.0) > 0.001) {
      errors.push(`Quality metric weights must sum to 1.0 (current: ${weightSum})`);
    }

    // Validate expert capacity hierarchy
    const tiers = ['probation', 'developing', 'standard', 'senior', 'master'];
    for (let i = 1; i < tiers.length; i++) {
      const current = this._config.expert.capacity[tiers[i]];
      const previous = this._config.expert.capacity[tiers[i-1]];
      
      if (current.maxStudents !== null && previous.maxStudents !== null) {
        if (current.maxStudents <= previous.maxStudents) {
          errors.push(`Expert capacity for ${tiers[i]} must be greater than ${tiers[i-1]}`);
        }
      }
    }

    if (errors.length > 0) {
      const errorMessage = `Configuration validation failed:\n${errors.join('\n')}`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    this.logger.debug('Training configuration validation passed');
  }

  /**
   * 🔧 SETUP CONFIGURATION VALIDATORS
   */
  setupValidators() {
    return {
      phaseDuration: (value) => value > 0 && value <= 365,
      percentage: (value) => value >= 0 && value <= 100,
      rating: (value) => value >= 1 && value <= 5,
      positiveInteger: (value) => Number.isInteger(value) && value > 0,
      positiveFloat: (value) => typeof value === 'number' && value > 0,
      currency: (value) => Number.isInteger(value) && value > 0
    };
  }

  /**
   * 🎯 GET CONFIGURATION BY PATH
   */
  get(path, defaultValue = null) {
    try {
      const keys = path.split('.');
      let value = this._config;

      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return defaultValue;
        }
      }

      return value;
    } catch (error) {
      this.logger.warn(`Failed to get configuration for path: ${path}`, error);
      return defaultValue;
    }
  }

  /**
   * 🔧 SET CONFIGURATION VALUE (Runtime updates)
   */
  set(path, value) {
    try {
      const keys = path.split('.');
      let config = this._config;

      // Navigate to the parent object
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!(key in config)) {
          config[key] = {};
        }
        config = config[key];
      }

      // Set the value
      const finalKey = keys[keys.length - 1];
      
      // Validate the value if validator exists
      const validator = this.getValidator(finalKey, value);
      if (validator && !validator(value)) {
        throw new Error(`Invalid value for ${path}: ${value}`);
      }

      config[finalKey] = value;
      this.logger.info(`Configuration updated: ${path} = ${value}`);

      // Emit change event for real-time updates
      this.emit('configUpdated', { path, value });

      return true;
    } catch (error) {
      this.logger.error(`Failed to set configuration for path: ${path}`, error);
      return false;
    }
  }

  /**
   * 🛡️ GET VALIDATOR FOR CONFIGURATION KEY
   */
  getValidator(key, value) {
    if (typeof value === 'number') {
      if (key.includes('Percentage') || key.includes('Rate') || key.includes('Threshold')) {
        return this._validators.percentage;
      }
      if (key.includes('Rating') || key.includes('Score')) {
        return this._validators.rating;
      }
      if (key.includes('Price') || key.includes('Revenue') || key.includes('Fee')) {
        return this._validators.currency;
      }
      if (Number.isInteger(value)) {
        return this._validators.positiveInteger;
      }
      return this._validators.positiveFloat;
    }
    return null;
  }

  /**
   * 📊 GET ALL CONFIGURATION (For admin dashboard)
   */
  getAll() {
    return JSON.parse(JSON.stringify(this._config)); // Deep clone
  }

  /**
   * 🔄 RESET TO DEFAULTS
   */
  reset() {
    this._config = this.loadDefaultConfig();
    this.applyEnvironmentOverrides();
    this.validateConfiguration();
    this.logger.info('Training configuration reset to defaults');
  }

  /**
   * 📈 GET PERFORMANCE-OPTIMIZED CONFIG
   */
  getPerformanceConfig() {
    return {
      sessions: this._config.sessions,
      scaling: this._config.scaling,
      learning: this._config.learning.duolingo,
      cache: this._config.scaling.cache
    };
  }

  /**
   * 💰 GET PAYMENT CONFIGURATION
   */
  getPaymentConfig() {
    return {
      ...this._config.payment,
      calculated: {
        totalDuration: this._config.phases.mindset.durationDays + 
                      this._config.phases.theory.durationDays + 
                      this._config.phases.handsOn.durationDays,
        dailyCost: this._config.payment.bundlePrice / (
          this._config.phases.mindset.durationDays + 
          this._config.phases.theory.durationDays + 
          this._config.phases.handsOn.durationDays
        )
      }
    };
  }

  /**
   * 🎯 GET QUALITY CONFIGURATION
   */
  getQualityConfig() {
    return {
      ...this._config.quality,
      expert: this._config.expert.performance,
      tiers: this._config.expert.capacity
    };
  }

  /**
   * 📝 EXPORT CONFIGURATION FOR DEPLOYMENT
   */
  exportForDeployment(environment = 'production') {
    const config = this.getAll();
    
    // Remove sensitive data for export
    delete config.security?.payment?.encryptionKey;
    delete config.security?.session?.recordingKey;
    
    // Environment-specific adjustments
    if (environment === 'development') {
      config.phases.mindset.durationDays = 7; // Shorter for testing
      config.phases.theory.durationDays = 14;
      config.phases.handsOn.durationDays = 14;
      config.scaling.microservices.sessionService.maxConcurrentSessions = 100;
    }

    return config;
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  destroy() {
    this.removeAllListeners?.();
    this.logger.info('Training configuration destroyed');
  }
}

// Export singleton instance
module.exports = new TrainingConfig();