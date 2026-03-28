// models/Enrollment.js

/**
 * 🎯 ENTERPRISE ENROLLMENT MODEL
 * Production-ready enrollment management for Mosa Forge
 * Features: Multi-course tracking, progress management, quality enforcement
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { DataTypes, Model, Op } = require('sequelize');
const sequelize = require('../config/database');
const Logger = require('../utils/logger');
const { EnrollmentStatus, CoursePhase, PaymentStatus } = require('../constants/enrollment');

class Enrollment extends Model {
  /**
   * 🎯 INITIALIZE ENROLLMENT MODEL
   */
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique enrollment identifier'
      },

      // 🔗 RELATIONSHIP FIELDS
      studentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id'
        },
        comment: 'Reference to student'
      },

      expertId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'experts',
          key: 'id'
        },
        comment: 'Assigned expert for hands-on training'
      },

      skillId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'skills',
          key: 'id'
        },
        comment: 'Selected skill from 40+ catalog'
      },

      packageId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'packages',
          key: 'id'
        },
        comment: 'Selected package (5 packages per skill)'
      },

      // 💰 PAYMENT FIELDS
      bundlePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1999.00,
        validate: {
          min: 0
        },
        comment: '1999 ETB bundle price'
      },

      paymentStatus: {
        type: DataTypes.ENUM,
        values: Object.values(PaymentStatus),
        defaultValue: PaymentStatus.PENDING,
        comment: 'Payment processing status'
      },

      revenueSplit: {
        type: DataTypes.JSON,
        defaultValue: {
          mosaPlatform: 1000,
          expertEarnings: 999,
          payoutSchedule: [333, 333, 333]
        },
        comment: '1000/999 revenue split with 333/333/333 payout'
      },

      // 📊 PROGRESS TRACKING
      currentPhase: {
        type: DataTypes.ENUM,
        values: Object.values(CoursePhase),
        defaultValue: CoursePhase.MINDSET,
        comment: 'Current learning phase'
      },

      phaseProgress: {
        type: DataTypes.JSON,
        defaultValue: {
          [CoursePhase.MINDSET]: 0,
          [CoursePhase.THEORY]: 0,
          [CoursePhase.HANDS_ON]: 0,
          [CoursePhase.CERTIFICATION]: 0
        },
        comment: 'Progress percentage for each phase'
      },

      overallProgress: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
        validate: {
          min: 0,
          max: 100
        },
        comment: 'Overall course completion percentage'
      },

      // 🛡️ QUALITY & STATUS FIELDS
      status: {
        type: DataTypes.ENUM,
        values: Object.values(EnrollmentStatus),
        defaultValue: EnrollmentStatus.ACTIVE,
        comment: 'Enrollment lifecycle status'
      },

      qualityScore: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 5.00,
        validate: {
          min: 1,
          max: 5
        },
        comment: 'Current quality rating (1-5 stars)'
      },

      completionRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0.00,
        validate: {
          min: 0,
          max: 100
        },
        comment: 'Weekly completion rate percentage'
      },

      // ⏰ TIMELINE FIELDS
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Enrollment start date'
      },

      expectedEndDate: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: '4-month expected completion date'
      },

      actualEndDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Actual completion date'
      },

      lastProgressUpdate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last progress update timestamp'
      },

      // 🔄 AUTO-ENFORCEMENT FIELDS
      expertSwitches: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: 'Number of expert switches due to quality'
      },

      lastExpertSwitchAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last expert switch timestamp'
      },

      qualityWarnings: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0
        },
        comment: 'Number of quality warnings issued'
      },

      // 📝 METADATA FIELDS
      metadata: {
        type: DataTypes.JSON,
        defaultValue: {
          mindsetAssessment: {},
          skillPreferences: {},
          learningStyle: {},
          commitmentLevel: null,
          cancellationReason: null,
          refundAmount: null,
          coolingPeriodUsed: false
        },
        comment: 'Additional enrollment metadata'
      },

      // 🏷️ SYSTEM FIELDS
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Soft delete flag'
      },

      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: 'Optimistic locking version'
      }

    }, {
      sequelize,
      modelName: 'Enrollment',
      tableName: 'enrollments',
      indexes: [
        // 🔍 PERFORMANCE INDEXES
        {
          name: 'idx_enrollment_student_status',
          fields: ['studentId', 'status']
        },
        {
          name: 'idx_enrollment_expert_phase',
          fields: ['expertId', 'currentPhase']
        },
        {
          name: 'idx_enrollment_progress_dates',
          fields: ['overallProgress', 'lastProgressUpdate']
        },
        {
          name: 'idx_enrollment_quality_metrics',
          fields: ['qualityScore', 'completionRate']
        },
        {
          name: 'idx_enrollment_payment_status',
          fields: ['paymentStatus', 'startDate']
        }
      ],
      hooks: {
        beforeCreate: (enrollment) => {
          enrollment.calculateExpectedEndDate();
          enrollment.validateStudentCapacity();
        },
        beforeUpdate: (enrollment) => {
          enrollment.trackProgressChanges();
          enrollment.enforceQualityStandards();
        }
      }
    });
  }

  /**
   * 🔗 MODEL ASSOCIATIONS
   */
  static associate(models) {
    // Student relationship
    this.belongsTo(models.Student, {
      foreignKey: 'studentId',
      as: 'student',
      onDelete: 'CASCADE'
    });

    // Expert relationship
    this.belongsTo(models.Expert, {
      foreignKey: 'expertId',
      as: 'expert',
      onDelete: 'SET NULL'
    });

    // Skill relationship
    this.belongsTo(models.Skill, {
      foreignKey: 'skillId',
      as: 'skill',
      onDelete: 'RESTRICT'
    });

    // Package relationship
    this.belongsTo(models.Package, {
      foreignKey: 'packageId',
      as: 'package',
      onDelete: 'RESTRICT'
    });

    // Training sessions
    this.hasMany(models.TrainingSession, {
      foreignKey: 'enrollmentId',
      as: 'trainingSessions',
      onDelete: 'CASCADE'
    });

    // Progress records
    this.hasMany(models.ProgressRecord, {
      foreignKey: 'enrollmentId',
      as: 'progressRecords',
      onDelete: 'CASCADE'
    });

    // Ratings
    this.hasMany(models.Rating, {
      foreignKey: 'enrollmentId',
      as: 'ratings',
      onDelete: 'CASCADE'
    });

    // Payments
    this.hasMany(models.Payment, {
      foreignKey: 'enrollmentId',
      as: 'payments',
      onDelete: 'CASCADE'
    });
  }

  /**
   * 🎯 CALCULATE EXPECTED END DATE (4 months from start)
   */
  calculateExpectedEndDate() {
    if (this.startDate && !this.expectedEndDate) {
      const endDate = new Date(this.startDate);
      endDate.setMonth(endDate.getMonth() + 4);
      this.expectedEndDate = endDate;
    }
  }

  /**
   * 🛡️ VALIDATE STUDENT CAPACITY
   */
  async validateStudentCapacity() {
    const logger = new Logger('EnrollmentValidation');
    
    try {
      const activeEnrollments = await this.constructor.count({
        where: {
          studentId: this.studentId,
          status: {
            [Op.in]: [EnrollmentStatus.ACTIVE, EnrollmentStatus.IN_PROGRESS]
          }
        }
      });

      // Maximum 3 active enrollments per student
      if (activeEnrollments >= 3) {
        throw new Error('STUDENT_CAPACITY_EXCEEDED');
      }

      logger.debug('Student capacity validated', { studentId: this.studentId, activeEnrollments });
    } catch (error) {
      logger.error('Student capacity validation failed', error);
      throw error;
    }
  }

  /**
   * 📊 TRACK PROGRESS CHANGES
   */
  trackProgressChanges() {
    if (this.changed('overallProgress') || this.changed('currentPhase')) {
      this.lastProgressUpdate = new Date();
      
      // Emit progress update event
      this.emit('progressUpdated', {
        enrollmentId: this.id,
        studentId: this.studentId,
        progress: this.overallProgress,
        phase: this.currentPhase,
        timestamp: new Date()
      });
    }
  }

  /**
   * 🛡️ ENFORCE QUALITY STANDARDS
   */
  async enforceQualityStandards() {
    if (this.changed('qualityScore') && this.qualityScore < 3.0) {
      await this.handleLowQualityScore();
    }

    if (this.changed('completionRate') && this.completionRate < 50) {
      await this.handleLowCompletionRate();
    }
  }

  /**
   * 🔄 HANDLE LOW QUALITY SCORE
   */
  async handleLowQualityScore() {
    const logger = new Logger('QualityEnforcement');
    
    try {
      this.qualityWarnings += 1;

      // Auto-expert switching for critical quality issues
      if (this.qualityScore < 2.5 && this.expertId) {
        await this.initiateExpertSwitch('QUALITY_ISSUE');
      }

      // Notify quality service
      this.emit('qualityWarning', {
        enrollmentId: this.id,
        expertId: this.expertId,
        qualityScore: this.qualityScore,
        warningCount: this.qualityWarnings,
        timestamp: new Date()
      });

      logger.warn('Quality warning issued', {
        enrollmentId: this.id,
        qualityScore: this.qualityScore,
        warningCount: this.qualityWarnings
      });
    } catch (error) {
      logger.error('Quality enforcement failed', error);
    }
  }

  /**
   * 📉 HANDLE LOW COMPLETION RATE
   */
  async handleLowCompletionRate() {
    const logger = new Logger('CompletionEnforcement');
    
    try {
      // Trigger intervention for low completion
      this.emit('completionWarning', {
        enrollmentId: this.id,
        studentId: this.studentId,
        completionRate: this.completionRate,
        phase: this.currentPhase,
        timestamp: new Date()
      });

      logger.warn('Completion rate warning', {
        enrollmentId: this.id,
        completionRate: this.completionRate
      });
    } catch (error) {
      logger.error('Completion enforcement failed', error);
    }
  }

  /**
   * 🔄 INITIATE EXPERT SWITCH
   */
  async initiateExpertSwitch(reason) {
    const logger = new Logger('ExpertSwitch');
    
    try {
      const previousExpertId = this.expertId;
      
      // Find replacement expert with same skill
      const replacementExpert = await this.findReplacementExpert();
      
      if (replacementExpert) {
        this.expertId = replacementExpert.id;
        this.expertSwitches += 1;
        this.lastExpertSwitchAt = new Date();

        // Emit expert switch event
        this.emit('expertSwitched', {
          enrollmentId: this.id,
          studentId: this.studentId,
          previousExpertId,
          newExpertId: replacementExpert.id,
          reason,
          timestamp: new Date()
        });

        logger.info('Expert switch completed', {
          enrollmentId: this.id,
          previousExpertId,
          newExpertId: replacementExpert.id,
          reason
        });
      } else {
        logger.warn('No replacement expert found', { enrollmentId: this.id, skillId: this.skillId });
      }
    } catch (error) {
      logger.error('Expert switch failed', error);
      throw error;
    }
  }

  /**
   * 🔍 FIND REPLACEMENT EXPERT
   */
  async findReplacementExpert() {
    const { Expert } = require('./index');
    
    return await Expert.findOne({
      where: {
        skillId: this.skillId,
        status: 'ACTIVE',
        currentTier: {
          [Op.in]: ['MASTER', 'SENIOR']
        },
        qualityScore: {
          [Op.gte]: 4.5
        },
        id: {
          [Op.ne]: this.expertId
        }
      },
      order: [
        ['qualityScore', 'DESC'],
        ['currentTier', 'DESC']
      ]
    });
  }

  /**
   * 📈 UPDATE PROGRESS
   */
  async updateProgress(phase, progressPercentage, metrics = {}) {
    const logger = new Logger('ProgressUpdate');
    
    try {
      // Validate progress percentage
      if (progressPercentage < 0 || progressPercentage > 100) {
        throw new Error('INVALID_PROGRESS_PERCENTAGE');
      }

      // Update phase progress
      const phaseProgress = { ...this.phaseProgress };
      phaseProgress[phase] = progressPercentage;
      this.phaseProgress = phaseProgress;

      // Calculate overall progress (weighted average)
      this.overallProgress = this.calculateOverallProgress();

      // Update current phase if progress is 100%
      if (progressPercentage === 100) {
        await this.advanceToNextPhase(phase);
      }

      // Update completion rate
      await this.updateCompletionRate(metrics);

      // Save changes
      await this.save();

      logger.info('Progress updated successfully', {
        enrollmentId: this.id,
        phase,
        progressPercentage,
        overallProgress: this.overallProgress
      });

      return this;
    } catch (error) {
      logger.error('Progress update failed', error);
      throw error;
    }
  }

  /**
   * 🎯 CALCULATE OVERALL PROGRESS
   */
  calculateOverallProgress() {
    const phases = Object.values(CoursePhase);
    const weights = {
      [CoursePhase.MINDSET]: 0.1,    // 10%
      [CoursePhase.THEORY]: 0.4,     // 40%
      [CoursePhase.HANDS_ON]: 0.4,   // 40%
      [CoursePhase.CERTIFICATION]: 0.1 // 10%
    };

    const weightedSum = phases.reduce((sum, phase) => {
      return sum + (this.phaseProgress[phase] * weights[phase]);
    }, 0);

    return Math.min(100, weightedSum);
  }

  /**
   * 🚀 ADVANCE TO NEXT PHASE
   */
  async advanceToNextPhase(currentPhase) {
    const phases = Object.values(CoursePhase);
    const currentIndex = phases.indexOf(currentPhase);
    
    if (currentIndex < phases.length - 1) {
      this.currentPhase = phases[currentIndex + 1];
      
      // Emit phase advancement event
      this.emit('phaseAdvanced', {
        enrollmentId: this.id,
        studentId: this.studentId,
        fromPhase: currentPhase,
        toPhase: this.currentPhase,
        timestamp: new Date()
      });
    } else if (currentPhase === CoursePhase.CERTIFICATION) {
      // Course completion
      await this.completeEnrollment();
    }
  }

  /**
   * 🏆 COMPLETE ENROLLMENT
   */
  async completeEnrollment() {
    const logger = new Logger('EnrollmentCompletion');
    
    try {
      this.status = EnrollmentStatus.COMPLETED;
      this.actualEndDate = new Date();
      this.overallProgress = 100;

      // Trigger certification process
      this.emit('enrollmentCompleted', {
        enrollmentId: this.id,
        studentId: this.studentId,
        expertId: this.expertId,
        skillId: this.skillId,
        completionDate: this.actualEndDate
      });

      // Process final expert payout
      await this.processFinalPayout();

      logger.info('Enrollment completed successfully', {
        enrollmentId: this.id,
        studentId: this.studentId,
        duration: this.calculateDuration()
      });
    } catch (error) {
      logger.error('Enrollment completion failed', error);
      throw error;
    }
  }

  /**
   * 📅 UPDATE COMPLETION RATE
   */
  async updateCompletionRate(metrics = {}) {
    const { completedExercises = 0, totalExercises = 0, weeklyActivity = 0 } = metrics;
    
    if (totalExercises > 0) {
      this.completionRate = (completedExercises / totalExercises) * 100;
    } else {
      // Fallback calculation based on activity
      this.completionRate = Math.min(100, weeklyActivity * 10);
    }
  }

  /**
   * 💰 PROCESS FINAL PAYOUT
   */
  async processFinalPayout() {
    const { Payment } = require('./index');
    
    try {
      // Create final payout record (333 ETB)
      await Payment.create({
        enrollmentId: this.id,
        expertId: this.expertId,
        amount: 333.00,
        type: 'COMPLETION_PAYOUT',
        status: 'PENDING',
        metadata: {
          phase: 'completion',
          qualityScore: this.qualityScore,
          completionBonus: this.calculateCompletionBonus()
        }
      });

      this.emit('finalPayoutScheduled', {
        enrollmentId: this.id,
        expertId: this.expertId,
        amount: 333.00,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Final payout processing failed', error);
    }
  }

  /**
   * 💸 CALCULATE COMPLETION BONUS
   */
  calculateCompletionBonus() {
    if (this.qualityScore >= 4.7) return 199.80; // 20% bonus
    if (this.qualityScore >= 4.3) return 99.90;  // 10% bonus
    return 0;
  }

  /**
   * ⏱️ CALCULATE DURATION
   */
  calculateDuration() {
    const endDate = this.actualEndDate || new Date();
    const durationMs = endDate - this.startDate;
    return Math.ceil(durationMs / (1000 * 60 * 60 * 24)); // Days
  }

  /**
   * 📊 GET ENROLLMENT ANALYTICS
   */
  getAnalytics() {
    return {
      enrollmentId: this.id,
      studentId: this.studentId,
      skillId: this.skillId,
      currentPhase: this.currentPhase,
      overallProgress: this.overallProgress,
      qualityScore: this.qualityScore,
      completionRate: this.completionRate,
      duration: this.calculateDuration(),
      expertSwitches: this.expertSwitches,
      qualityWarnings: this.qualityWarnings,
      isOnTrack: this.isOnTrack(),
      estimatedCompletion: this.getEstimatedCompletion()
    };
  }

  /**
   * 🎯 CHECK IF ENROLLMENT IS ON TRACK
   */
  isOnTrack() {
    const expectedDuration = 120; // 4 months in days
    const actualDuration = this.calculateDuration();
    const progressPerDay = this.overallProgress / actualDuration;
    
    return progressPerDay >= (100 / expectedDuration);
  }

  /**
   * 📅 GET ESTIMATED COMPLETION DATE
   */
  getEstimatedCompletion() {
    if (this.overallProgress === 100) return this.actualEndDate;
    
    const progressPerDay = this.overallProgress / this.calculateDuration();
    const daysRemaining = (100 - this.overallProgress) / progressPerDay;
    
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + daysRemaining);
    
    return completionDate;
  }

  /**
   * 🔄 CANCEL ENROLLMENT
   */
  async cancelEnrollment(reason, refundAmount = 0) {
    const logger = new Logger('EnrollmentCancellation');
    
    try {
      this.status = EnrollmentStatus.CANCELLED;
      this.metadata.cancellationReason = reason;
      this.metadata.refundAmount = refundAmount;

      await this.save();

      // Emit cancellation event
      this.emit('enrollmentCancelled', {
        enrollmentId: this.id,
        studentId: this.studentId,
        reason,
        refundAmount,
        timestamp: new Date()
      });

      logger.info('Enrollment cancelled', {
        enrollmentId: this.id,
        reason,
        refundAmount
      });

      return this;
    } catch (error) {
      logger.error('Enrollment cancellation failed', error);
      throw error;
    }
  }

  /**
   * 🆕 ACTIVATE ENROLLMENT
   */
  async activateEnrollment() {
    const logger = new Logger('EnrollmentActivation');
    
    try {
      if (this.status === EnrollmentStatus.PENDING && this.paymentStatus === PaymentStatus.COMPLETED) {
        this.status = EnrollmentStatus.ACTIVE;
        this.startDate = new Date();
        await this.save();

        logger.info('Enrollment activated', { enrollmentId: this.id });
      }
    } catch (error) {
      logger.error('Enrollment activation failed', error);
      throw error;
    }
  }
}

module.exports = Enrollment;