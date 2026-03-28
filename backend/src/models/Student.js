/**
 * 🎯 MOSA FORGE: Enterprise Student Model
 * 
 * @module Student
 * @description Enterprise-grade Student profile management with Fayda ID integration
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Fayda ID government verification
 * - AI-powered duplicate detection
 * - Multi-course enrollment tracking
 * - Quality guarantee protection
 * - Progress analytics and monitoring
 */

const { DataTypes, Model, Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const Redis = require('ioredis');

// 🏗️ Enterprise Constants
const STUDENT_STATUS = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  GRADUATED: 'GRADUATED',
  INACTIVE: 'INACTIVE'
};

const VERIFICATION_LEVEL = {
  UNVERIFIED: 'UNVERIFIED',
  FAYDA_VERIFIED: 'FAYDA_VERIFIED',
  FULLY_VERIFIED: 'FULLY_VERIFIED'
};

const ENROLLMENT_LIMITS = {
  MAX_ACTIVE_COURSES: 3,
  MAX_MONTHLY_ENROLLMENTS: 2,
  MIN_COMPLETION_RATE: 0.7
};

/**
 * 🏗️ Enterprise Student Class
 * @class Student
 * @extends Model
 */
class Student extends Model {
  /**
   * 🏗️ Initialize Student Model with Enterprise Configuration
   * @param {Object} sequelize - Sequelize instance
   */
  static init(sequelize) {
    return super.init(
      {
        // 🆔 Primary Identifier
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
          validate: {
            isUUID: 4
          }
        },

        // 🏛️ Government ID (Fayda ID)
        faydaId: {
          type: DataTypes.STRING(64),
          allowNull: false,
          unique: true,
          validate: {
            notEmpty: true,
            len: [10, 64],
            isFaydaIdFormat(value) {
              if (!/^[A-Z0-9]{10,64}$/i.test(value)) {
                throw new Error('Invalid Fayda ID format');
              }
            }
          }
        },

        // 🔐 Authentication
        phoneNumber: {
          type: DataTypes.STRING(15),
          allowNull: false,
          unique: true,
          validate: {
            is: /^\+251[0-9]{9}$/,
            notEmpty: true
          }
        },

        email: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            isEmail: true
          }
        },

        passwordHash: {
          type: DataTypes.STRING(255),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [60, 60] // bcrypt hash length
          }
        },

        // 👤 Personal Information
        firstName: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [2, 100]
          }
        },

        lastName: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true,
            len: [2, 100]
          }
        },

        dateOfBirth: {
          type: DataTypes.DATEONLY,
          allowNull: false,
          validate: {
            isDate: true,
            isOver18(value) {
              const birthDate = new Date(value);
              const age = new Date().getFullYear() - birthDate.getFullYear();
              if (age < 18) {
                throw new Error('Student must be at least 18 years old');
              }
            }
          }
        },

        gender: {
          type: DataTypes.ENUM('MALE', 'FEMALE', 'OTHER'),
          allowNull: false,
          validate: {
            notEmpty: true
          }
        },

        // 📍 Location Information
        region: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true
          }
        },

        zone: {
          type: DataTypes.STRING(100),
          allowNull: true
        },

        city: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: true
          }
        },

        woreda: {
          type: DataTypes.STRING(100),
          allowNull: true
        },

        kebele: {
          type: DataTypes.STRING(100),
          allowNull: true
        },

        // 🎯 Educational & Career Information
        educationLevel: {
          type: DataTypes.ENUM(
            'NONE',
            'PRIMARY_SCHOOL',
            'HIGH_SCHOOL',
            'VOCATIONAL_TRAINING',
            'DIPLOMA',
            'BACHELORS',
            'MASTERS',
            'PHD'
          ),
          allowNull: false
        },

        currentOccupation: {
          type: DataTypes.STRING(100),
          allowNull: true
        },

        employmentStatus: {
          type: DataTypes.ENUM(
            'STUDENT',
            'UNEMPLOYED',
            'EMPLOYED_FULL_TIME',
            'EMPLOYED_PART_TIME',
            'SELF_EMPLOYED',
            'FREELANCER'
          ),
          allowNull: false
        },

        monthlyIncome: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: true,
          validate: {
            min: 0
          }
        },

        // 🛡️ Verification & Security
        verificationLevel: {
          type: DataTypes.ENUM(
            'UNVERIFIED',
            'FAYDA_VERIFIED',
            'FULLY_VERIFIED'
          ),
          defaultValue: 'UNVERIFIED',
          allowNull: false
        },

        faydaVerifiedAt: {
          type: DataTypes.DATE,
          allowNull: true
        },

        isDuplicate: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false
        },

        duplicateOf: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'Students',
            key: 'id'
          }
        },

        // 📊 Analytics & Metrics
        totalEnrollments: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          validate: {
            min: 0
          }
        },

        completedCourses: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          validate: {
            min: 0
          }
        },

        completionRate: {
          type: DataTypes.DECIMAL(5, 4),
          defaultValue: 0,
          validate: {
            min: 0,
            max: 1
          }
        },

        averageRating: {
          type: DataTypes.DECIMAL(3, 2),
          defaultValue: 0,
          validate: {
            min: 0,
            max: 5
          }
        },

        totalLearningHours: {
          type: DataTypes.DECIMAL(8, 2),
          defaultValue: 0,
          validate: {
            min: 0
          }
        },

        // 💰 Financial Metrics
        totalInvestment: {
          type: DataTypes.DECIMAL(12, 2),
          defaultValue: 0,
          validate: {
            min: 0
          }
        },

        estimatedROI: {
          type: DataTypes.DECIMAL(8, 2),
          defaultValue: 0,
          validate: {
            min: 0
          }
        },

        // 🎯 Mindset Assessment
        mindsetScore: {
          type: DataTypes.DECIMAL(5, 2),
          defaultValue: 0,
          validate: {
            min: 0,
            max: 100
          }
        },

        readinessLevel: {
          type: DataTypes.ENUM(
            'BEGINNER',
            'INTERMEDIATE',
            'ADVANCED',
            'EXPERT_READY'
          ),
          defaultValue: 'BEGINNER'
        },

        // 🔧 System Fields
        status: {
          type: DataTypes.ENUM(
            'PENDING_VERIFICATION',
            'ACTIVE',
            'SUSPENDED',
            'GRADUATED',
            'INACTIVE'
          ),
          defaultValue: 'PENDING_VERIFICATION',
          allowNull: false
        },

        lastLoginAt: {
          type: DataTypes.DATE,
          allowNull: true
        },

        loginCount: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          validate: {
            min: 0
          }
        },

        metadata: {
          type: DataTypes.JSONB,
          defaultValue: {},
          allowNull: false
        },

        // 🕒 Audit Fields
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },

        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },

        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true
        }
      },
      {
        sequelize,
        modelName: 'Student',
        tableName: 'students',
        paranoid: true, // Soft deletes
        indexes: [
          {
            unique: true,
            fields: ['faydaId']
          },
          {
            unique: true,
            fields: ['phoneNumber']
          },
          {
            fields: ['email']
          },
          {
            fields: ['status']
          },
          {
            fields: ['verificationLevel']
          },
          {
            fields: ['region', 'city']
          },
          {
            fields: ['createdAt']
          }
        ],
        hooks: {
          beforeCreate: Student.beforeCreateHook,
          beforeUpdate: Student.beforeUpdateHook,
          afterCreate: Student.afterCreateHook,
          afterUpdate: Student.afterUpdateHook
        },
        scopes: {
          active: {
            where: {
              status: 'ACTIVE',
              verificationLevel: {
                [Op.in]: ['FAYDA_VERIFIED', 'FULLY_VERIFIED']
              },
              isDuplicate: false
            }
          },
          verified: {
            where: {
              verificationLevel: {
                [Op.in]: ['FAYDA_VERIFIED', 'FULLY_VERIFIED']
              }
            }
          },
          withEnrollments: {
            include: ['enrollments']
          },
          highPerformers: {
            where: {
              completionRate: {
                [Op.gte]: 0.8
              },
              averageRating: {
                [Op.gte]: 4.0
              }
            }
          }
        }
      }
    );
  }

  /**
   * 🏗️ Model Associations
   */
  static associate(models) {
    // Enrollment relationships
    this.hasMany(models.Enrollment, {
      foreignKey: 'studentId',
      as: 'enrollments'
    });

    this.hasMany(models.LearningProgress, {
      foreignKey: 'studentId',
      as: 'learningProgress'
    });

    this.hasMany(models.MindsetAssessment, {
      foreignKey: 'studentId',
      as: 'mindsetAssessments'
    });

    this.hasMany(models.Payment, {
      foreignKey: 'studentId',
      as: 'payments'
    });

    this.hasMany(models.StudentRating, {
      foreignKey: 'studentId',
      as: 'ratings'
    });

    // Expert relationships (for future mentoring)
    this.belongsToMany(models.Expert, {
      through: 'StudentExpertMentorship',
      foreignKey: 'studentId',
      otherKey: 'expertId',
      as: 'mentors'
    });

    // Self-referencing for duplicate management
    this.belongsTo(this, {
      foreignKey: 'duplicateOf',
      as: 'originalStudent'
    });

    this.hasMany(this, {
      foreignKey: 'duplicateOf',
      as: 'duplicateStudents'
    });
  }

  /**
   * 🏗️ Before Create Hook
   */
  static async beforeCreateHook(student, options) {
    // Generate UUID if not provided
    if (!student.id) {
      student.id = uuidv4();
    }

    // Hash password if provided
    if (student.passwordHash && student.passwordHash.length !== 60) {
      student.passwordHash = await bcrypt.hash(student.passwordHash, 12);
    }

    // Validate Fayda ID uniqueness (additional check)
    await Student.validateFaydaIdUniqueness(student.faydaId, student.id);

    // Set initial metadata
    student.metadata = {
      ...student.metadata,
      accountCreated: new Date().toISOString(),
      initialStatus: student.status,
      version: '1.0.0'
    };
  }

  /**
   * 🏗️ Before Update Hook
   */
  static async beforeUpdateHook(student, options) {
    // Update timestamp
    student.updatedAt = new Date();

    // Handle password updates
    if (student.changed('passwordHash') && student.passwordHash.length !== 60) {
      student.passwordHash = await bcrypt.hash(student.passwordHash, 12);
    }

    // Update completion rate when enrollments change
    if (student.changed('totalEnrollments') || student.changed('completedCourses')) {
      student.completionRate = student.totalEnrollments > 0 
        ? student.completedCourses / student.totalEnrollments 
        : 0;
    }

    // Update metadata with change history
    if (Object.keys(student._changed).length > 0) {
      const changes = student._changed.reduce((acc, field) => {
        acc[field] = {
          from: student._previousDataValues[field],
          to: student[field],
          timestamp: new Date().toISOString()
        };
        return acc;
      }, {});

      student.metadata = {
        ...student.metadata,
        changeHistory: [
          ...(student.metadata.changeHistory || []),
          changes
        ]
      };
    }
  }

  /**
   * 🏗️ After Create Hook
   */
  static async afterCreateHook(student, options) {
    // Cache student data for performance
    await Student.cacheStudentData(student);

    // Emit student created event
    if (options && options.transaction) {
      options.transaction.afterCommit(() => {
        student.emit('student.created', student.toJSON());
      });
    }
  }

  /**
   * 🏗️ After Update Hook
   */
  static async afterUpdateHook(student, options) {
    // Update cache
    await Student.cacheStudentData(student);

    // Emit update events based on changes
    if (student.changed('status')) {
      student.emit('student.status.changed', {
        studentId: student.id,
        from: student.previous('status'),
        to: student.status,
        timestamp: new Date().toISOString()
      });
    }

    if (student.changed('verificationLevel')) {
      student.emit('student.verification.changed', {
        studentId: student.id,
        from: student.previous('verificationLevel'),
        to: student.verificationLevel,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🏗️ Validate Fayda ID Uniqueness
   */
  static async validateFaydaIdUniqueness(faydaId, excludeId = null) {
    const whereClause = {
      faydaId,
      isDuplicate: false
    };

    if (excludeId) {
      whereClause.id = { [Op.ne]: excludeId };
    }

    const existingStudent = await Student.findOne({ where: whereClause });

    if (existingStudent) {
      throw new Error('Fayda ID already exists in system');
    }

    return true;
  }

  /**
   * 🏗️ Cache Student Data for Performance
   */
  static async cacheStudentData(student) {
    const redis = new Redis(process.env.REDIS_URL);
    
    try {
      const cacheKey = `student:${student.id}`;
      const cacheData = {
        id: student.id,
        faydaId: student.faydaId,
        phoneNumber: student.phoneNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        status: student.status,
        verificationLevel: student.verificationLevel,
        completionRate: student.completionRate,
        averageRating: student.averageRating
      };

      await redis.setex(cacheKey, 3600, JSON.stringify(cacheData)); // Cache for 1 hour
    } finally {
      await redis.quit();
    }
  }

  /**
   * 🎯 INSTANCE METHODS
   */

  /**
   * Verify Password
   */
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.passwordHash);
  }

  /**
   * Update Login Statistics
   */
  async recordLogin() {
    this.lastLoginAt = new Date();
    this.loginCount += 1;
    return await this.save();
  }

  /**
   * Check if Student Can Enroll in New Course
   */
  async canEnrollInCourse() {
    if (this.status !== 'ACTIVE') {
      return { canEnroll: false, reason: 'Student account is not active' };
    }

    if (this.verificationLevel === 'UNVERIFIED') {
      return { canEnroll: false, reason: 'Student verification required' };
    }

    // Check active enrollments limit
    const activeEnrollments = await this.countEnrollments({
      where: { status: 'ACTIVE' }
    });

    if (activeEnrollments >= ENROLLMENT_LIMITS.MAX_ACTIVE_COURSES) {
      return { 
        canEnroll: false, 
        reason: `Maximum ${ENROLLMENT_LIMITS.MAX_ACTIVE_COURSES} active courses allowed` 
      };
    }

    // Check monthly enrollment limit
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    const monthlyEnrollments = await this.countEnrollments({
      where: {
        createdAt: {
          [Op.gte]: firstDayOfMonth
        }
      }
    });

    if (monthlyEnrollments >= ENROLLMENT_LIMITS.MAX_MONTHLY_ENROLLMENTS) {
      return { 
        canEnroll: false, 
        reason: `Maximum ${ENROLLMENT_LIMITS.MAX_MONTHLY_ENROLLMENTS} monthly enrollments exceeded` 
      };
    }

    // Check completion rate for existing courses
    if (this.totalEnrollments > 0 && this.completionRate < ENROLLMENT_LIMITS.MIN_COMPLETION_RATE) {
      return { 
        canEnroll: false, 
        reason: 'Low completion rate on previous courses' 
      };
    }

    return { canEnroll: true };
  }

  /**
   * Calculate Student Progress Metrics
   */
  async calculateProgressMetrics() {
    const enrollments = await this.getEnrollments({
      include: ['learningProgress']
    });

    const metrics = {
      totalCourses: enrollments.length,
      completedCourses: enrollments.filter(e => e.status === 'COMPLETED').length,
      inProgressCourses: enrollments.filter(e => e.status === 'ACTIVE').length,
      averageProgress: 0,
      totalLearningHours: 0,
      skillDistribution: {}
    };

    let totalProgress = 0;
    let courseCount = 0;

    for (const enrollment of enrollments) {
      if (enrollment.learningProgress && enrollment.learningProgress.length > 0) {
        const progress = enrollment.learningProgress[0];
        totalProgress += progress.overallProgress || 0;
        metrics.totalLearningHours += progress.totalLearningHours || 0;
        courseCount++;

        // Track skill distribution
        const skillName = enrollment.skill?.name || 'Unknown';
        metrics.skillDistribution[skillName] = (metrics.skillDistribution[skillName] || 0) + 1;
      }
    }

    metrics.averageProgress = courseCount > 0 ? totalProgress / courseCount : 0;
    metrics.completionRate = metrics.totalCourses > 0 ? metrics.completedCourses / metrics.totalCourses : 0;

    return metrics;
  }

  /**
   * Mark as Duplicate
   */
  async markAsDuplicate(originalStudentId, reason = 'AI_DUPLICATE_DETECTION') {
    this.isDuplicate = true;
    this.duplicateOf = originalStudentId;
    this.status = 'SUSPENDED';

    this.metadata = {
      ...this.metadata,
      duplicateMarked: {
        at: new Date().toISOString(),
        reason,
        originalStudentId,
        markedBy: 'SYSTEM'
      }
    };

    return await this.save();
  }

  /**
   * Verify Fayda ID
   */
  async verifyFaydaId(verificationData) {
    this.verificationLevel = 'FAYDA_VERIFIED';
    this.faydaVerifiedAt = new Date();
    
    this.metadata = {
      ...this.metadata,
      faydaVerification: {
        verifiedAt: new Date().toISOString(),
        ...verificationData
      }
    };

    // Activate student if pending verification
    if (this.status === 'PENDING_VERIFICATION') {
      this.status = 'ACTIVE';
    }

    return await this.save();
  }

  /**
   * Update Mindset Assessment
   */
  async updateMindsetAssessment(assessmentData) {
    const { score, level, strengths, areasForImprovement } = assessmentData;
    
    this.mindsetScore = score;
    this.readinessLevel = level;

    this.metadata = {
      ...this.metadata,
      mindsetAssessment: {
        lastAssessed: new Date().toISOString(),
        score,
        level,
        strengths,
        areasForImprovement,
        history: [
          ...(this.metadata.mindsetAssessment?.history || []),
          { score, level, timestamp: new Date().toISOString() }
        ]
      }
    };

    return await this.save();
  }

  /**
   * 🎯 CLASS METHODS
   */

  /**
   * Find Student by Fayda ID with Caching
   */
  static async findByFaydaId(faydaId, options = {}) {
    const redis = new Redis(process.env.REDIS_URL);
    const cacheKey = `student:fayda:${faydaId}`;

    try {
      // Try cache first
      if (!options.forceDatabase) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      // Database lookup
      const student = await Student.findOne({
        where: { faydaId, isDuplicate: false },
        ...options
      });

      // Cache result
      if (student) {
        await redis.setex(cacheKey, 1800, JSON.stringify(student.toJSON())); // 30 minutes
      }

      return student;
    } finally {
      await redis.quit();
    }
  }

  /**
   * Bulk Student Creation with Duplicate Detection
   */
  static async bulkCreateWithValidation(studentsData, options = {}) {
    const validatedStudents = [];
    const errors = [];

    for (const studentData of studentsData) {
      try {
        // Validate Fayda ID uniqueness
        await Student.validateFaydaIdUniqueness(studentData.faydaId);

        // Additional validation
        if (!studentData.phoneNumber || !studentData.faydaId) {
          throw new Error('Missing required fields');
        }

        validatedStudents.push(studentData);
      } catch (error) {
        errors.push({
          studentData,
          error: error.message
        });
      }
    }

    if (validatedStudents.length === 0) {
      throw new Error('No valid students to create');
    }

    const createdStudents = await Student.bulkCreate(validatedStudents, {
      ...options,
      validate: true,
      individualHooks: true
    });

    return {
      created: createdStudents,
      errors,
      totalProcessed: studentsData.length,
      successful: createdStudents.length,
      failed: errors.length
    };
  }

  /**
   * Analytics: Student Performance Report
   */
  static async generatePerformanceReport(timeframe = 'MONTHLY') {
    const timeRanges = {
      DAILY: 1,
      WEEKLY: 7,
      MONTHLY: 30,
      QUARTERLY: 90,
      YEARLY: 365
    };

    const days = timeRanges[timeframe] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const report = await Student.findAll({
      attributes: [
        'id',
        'firstName',
        'lastName',
        'faydaId',
        'completionRate',
        'averageRating',
        'totalLearningHours',
        'totalEnrollments',
        'completedCourses',
        'mindsetScore'
      ],
      where: {
        status: 'ACTIVE',
        updatedAt: {
          [Op.gte]: startDate
        }
      },
      include: [
        {
          association: 'enrollments',
          attributes: ['id', 'skillId', 'status', 'startDate', 'completionDate'],
          required: false
        }
      ],
      order: [['completionRate', 'DESC']]
    });

    const analytics = {
      timeframe,
      totalStudents: report.length,
      averageCompletionRate: 0,
      averageRating: 0,
      totalLearningHours: 0,
      topPerformers: [],
      needsImprovement: []
    };

    let totalCompletion = 0;
    let totalRating = 0;

    report.forEach(student => {
      totalCompletion += student.completionRate;
      totalRating += student.averageRating;
      analytics.totalLearningHours += student.totalLearningHours;

      if (student.completionRate >= 0.8) {
        analytics.topPerformers.push(student);
      } else if (student.completionRate < 0.5) {
        analytics.needsImprovement.push(student);
      }
    });

    analytics.averageCompletionRate = report.length > 0 ? totalCompletion / report.length : 0;
    analytics.averageRating = report.length > 0 ? totalRating / report.length : 0;

    return analytics;
  }

  /**
   * Duplicate Detection Algorithm
   */
  static async findPotentialDuplicates(studentData, threshold = 0.8) {
    const potentialDuplicates = await Student.findAll({
      where: {
        [Op.or]: [
          { faydaId: studentData.faydaId },
          { phoneNumber: studentData.phoneNumber },
          {
            firstName: studentData.firstName,
            lastName: studentData.lastName,
            dateOfBirth: studentData.dateOfBirth
          }
        ],
        isDuplicate: false
      }
    });

    const duplicatesWithScores = potentialDuplicates.map(duplicate => {
      let score = 0;
      let matchedFields = [];

      if (duplicate.faydaId === studentData.faydaId) {
        score += 0.4;
        matchedFields.push('faydaId');
      }

      if (duplicate.phoneNumber === studentData.phoneNumber) {
        score += 0.3;
        matchedFields.push('phoneNumber');
      }

      if (duplicate.firstName === studentData.firstName && 
          duplicate.lastName === studentData.lastName) {
        score += 0.2;
        matchedFields.push('fullName');
      }

      if (duplicate.dateOfBirth === studentData.dateOfBirth) {
        score += 0.1;
        matchedFields.push('dateOfBirth');
      }

      return {
        student: duplicate,
        matchScore: score,
        matchedFields,
        isDuplicate: score >= threshold
      };
    });

    return duplicatesWithScores.filter(dup => dup.isDuplicate);
  }
}

// 🏗️ Export Enterprise Model
module.exports = {
  Student,
  STUDENT_STATUS,
  VERIFICATION_LEVEL,
  ENROLLMENT_LIMITS
};

// 🏗️ Event Emitter for Student Lifecycle Events
const EventEmitter = require('events');
class StudentEventEmitter extends EventEmitter {}
const studentEvents = new StudentEventEmitter();

// Export event emitter for cross-service communication
module.exports.events = studentEvents;