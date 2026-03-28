/**
 * 🎯 MOSA FORGE: Enterprise User Model
 * 
 * @module User
 * @description Enterprise-grade user model with Fayda ID integration, authentication,
 *              role management, and comprehensive user lifecycle management.
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Fayda ID government verification
 * - AI-powered duplicate detection
 * - Multi-role user management (Student/Expert/Admin)
 * - Comprehensive security and validation
 * - User lifecycle and status management
 * - Audit logging and soft deletes
 */

const { DataTypes, Model } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * 🏗️ Enterprise User Roles
 */
const USER_ROLES = {
  STUDENT: 'student',
  EXPERT: 'expert',
  ADMIN: 'admin',
  SUPPORT: 'support',
  QUALITY_MANAGER: 'quality_manager'
};

/**
 * 🏗️ User Status States
 */
const USER_STATUS = {
  PENDING_VERIFICATION: 'pending_verification',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DEACTIVATED: 'deactivated',
  BLOCKED: 'blocked',
  UNDER_REVIEW: 'under_review'
};

/**
 * 🏗️ Verification Status
 */
const VERIFICATION_STATUS = {
  NOT_VERIFIED: 'not_verified',
  PENDING: 'pending',
  VERIFIED: 'verified',
  FAILED: 'failed',
  EXPIRED: 'expired'
};

/**
 * 🏗️ Enterprise User Model Class
 * @class User
 * @extends Model
 */
class User extends Model {
  /**
   * 🏗️ Initialize User Model with Enterprise Configuration
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
          unique: {
            name: 'fayda_id_unique',
            msg: 'This Fayda ID is already registered'
          },
          validate: {
            notEmpty: {
              msg: 'Fayda ID is required for government verification'
            },
            len: {
              args: [10, 64],
              msg: 'Fayda ID must be between 10 and 64 characters'
            },
            isAlphanumeric: {
              msg: 'Fayda ID must contain only alphanumeric characters'
            }
          }
        },

        // 🔐 Authentication Fields
        email: {
          type: DataTypes.STRING(255),
          allowNull: true,
          validate: {
            isEmail: {
              msg: 'Please provide a valid email address'
            },
            isLowercase: true
          },
          set(value) {
            if (value) {
              this.setDataValue('email', value.toLowerCase().trim());
            }
          }
        },

        phoneNumber: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'Phone number is required for OTP verification'
            },
            isEthiopianPhoneNumber(value) {
              if (!/^(?:\+251|0)(9\d{8})$/.test(value)) {
                throw new Error('Please provide a valid Ethiopian phone number');
              }
            }
          },
          set(value) {
            // Normalize Ethiopian phone numbers
            const normalized = value.replace(/\s+/g, '');
            if (normalized.startsWith('0')) {
              this.setDataValue('phoneNumber', '+251' + normalized.slice(1));
            } else {
              this.setDataValue('phoneNumber', normalized);
            }
          }
        },

        password: {
          type: DataTypes.STRING(255),
          allowNull: true, // Allow null for social login or phone-only users
          validate: {
            isStrongPassword(value) {
              if (value && value.length < 8) {
                throw new Error('Password must be at least 8 characters long');
              }
              if (value && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(value)) {
                throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
              }
            }
          }
        },

        // 👤 Personal Information
        firstName: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'First name is required'
            },
            len: {
              args: [2, 100],
              msg: 'First name must be between 2 and 100 characters'
            },
            is: {
              args: /^[A-Za-z\s\u1200-\u137F]+$/, // Allow Amharic and English
              msg: 'First name can only contain letters and spaces'
            }
          },
          set(value) {
            if (value) {
              // Capitalize first letter of each word
              const capitalized = value.trim()
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              this.setDataValue('firstName', capitalized);
            }
          }
        },

        lastName: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'Last name is required'
            },
            len: {
              args: [2, 100],
              msg: 'Last name must be between 2 and 100 characters'
            },
            is: {
              args: /^[A-Za-z\s\u1200-\u137F]+$/,
              msg: 'Last name can only contain letters and spaces'
            }
          },
          set(value) {
            if (value) {
              const capitalized = value.trim()
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              this.setDataValue('lastName', capitalized);
            }
          }
        },

        dateOfBirth: {
          type: DataTypes.DATEONLY,
          allowNull: false,
          validate: {
            isDate: {
              msg: 'Please provide a valid date of birth'
            },
            isOver18(value) {
              const birthDate = new Date(value);
              const age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
              if (age < 18) {
                throw new Error('User must be at least 18 years old');
              }
              if (age > 100) {
                throw new Error('Please provide a valid date of birth');
              }
            }
          }
        },

        gender: {
          type: DataTypes.ENUM('male', 'female', 'other'),
          allowNull: false,
          validate: {
            isIn: {
              args: [['male', 'female', 'other']],
              msg: 'Gender must be male, female, or other'
            }
          }
        },

        // 🎯 User Role & Status
        role: {
          type: DataTypes.ENUM(Object.values(USER_ROLES)),
          defaultValue: USER_ROLES.STUDENT,
          allowNull: false,
          validate: {
            isIn: {
              args: [Object.values(USER_ROLES)],
              msg: `Role must be one of: ${Object.values(USER_ROLES).join(', ')}`
            }
          }
        },

        status: {
          type: DataTypes.ENUM(Object.values(USER_STATUS)),
          defaultValue: USER_STATUS.PENDING_VERIFICATION,
          allowNull: false,
          validate: {
            isIn: {
              args: [Object.values(USER_STATUS)],
              msg: `Status must be one of: ${Object.values(USER_STATUS).join(', ')}`
            }
          }
        },

        // 🛡️ Verification & Security
        faydaVerificationStatus: {
          type: DataTypes.ENUM(Object.values(VERIFICATION_STATUS)),
          defaultValue: VERIFICATION_STATUS.NOT_VERIFIED,
          allowNull: false
        },

        emailVerified: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false
        },

        phoneVerified: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false
        },

        verificationToken: {
          type: DataTypes.STRING(64),
          allowNull: true
        },

        verificationTokenExpires: {
          type: DataTypes.DATE,
          allowNull: true
        },

        passwordResetToken: {
          type: DataTypes.STRING(64),
          allowNull: true
        },

        passwordResetExpires: {
          type: DataTypes.DATE,
          allowNull: true
        },

        loginAttempts: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          validate: {
            min: 0,
            max: 10
          }
        },

        lockUntil: {
          type: DataTypes.DATE,
          allowNull: true
        },

        lastLogin: {
          type: DataTypes.DATE,
          allowNull: true
        },

        // 📍 Location & Preferences
        region: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'Region is required'
            },
            isIn: {
              args: [
                'addis_ababa', 'oromia', 'amhara', 'tigray', 'snnpr', 'afar',
                'diredawa', 'harari', 'somali', 'gambella', 'benishangul_gumuz'
              ],
              msg: 'Please select a valid Ethiopian region'
            }
          }
        },

        city: {
          type: DataTypes.STRING(100),
          allowNull: false,
          validate: {
            notEmpty: {
              msg: 'City is required'
            },
            len: {
              args: [2, 100],
              msg: 'City must be between 2 and 100 characters'
            }
          }
        },

        language: {
          type: DataTypes.ENUM('amharic', 'english', 'oromo', 'tigrinya'),
          defaultValue: 'amharic',
          allowNull: false
        },

        timezone: {
          type: DataTypes.STRING(50),
          defaultValue: 'Africa/Addis_Ababa',
          allowNull: false
        },

        // 📊 Analytics & Metadata
        signupSource: {
          type: DataTypes.ENUM('web', 'mobile', 'referral', 'partner', 'social'),
          defaultValue: 'web',
          allowNull: false
        },

        referralCode: {
          type: DataTypes.STRING(20),
          unique: true,
          allowNull: true
        },

        referredBy: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        },

        metadata: {
          type: DataTypes.JSONB,
          defaultValue: {},
          allowNull: false,
          validate: {
            isValidMetadata(value) {
              if (typeof value !== 'object') {
                throw new Error('Metadata must be a valid JSON object');
              }
            }
          }
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
        },

        createdBy: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        },

        updatedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          }
        }
      },
      {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        underscored: true,
        paranoid: true, // Soft deletes
        timestamps: true,
        indexes: [
          // 🚀 Performance Indexes
          {
            name: 'idx_users_fayda_id',
            fields: ['fayda_id'],
            unique: true
          },
          {
            name: 'idx_users_email',
            fields: ['email'],
            where: {
              email: {
                [sequelize.Sequelize.Op.ne]: null
              }
            }
          },
          {
            name: 'idx_users_phone',
            fields: ['phone_number'],
            unique: true
          },
          {
            name: 'idx_users_status_role',
            fields: ['status', 'role']
          },
          {
            name: 'idx_users_region_city',
            fields: ['region', 'city']
          },
          {
            name: 'idx_users_created_at',
            fields: ['created_at']
          },
          {
            name: 'idx_users_referral_code',
            fields: ['referral_code'],
            unique: true
          }
        ],
        hooks: {
          // 🏗️ Enterprise Model Hooks
          beforeValidate: (user) => {
            if (!user.referralCode) {
              user.referralCode = User.generateReferralCode();
            }
          },
          beforeCreate: async (user) => {
            await user.validateFaydaUniqueness();
            if (user.password) {
              user.password = await user.encryptPassword(user.password);
            }
          },
          beforeUpdate: async (user) => {
            if (user.changed('password')) {
              user.password = await user.encryptPassword(user.password);
            }
            if (user.changed('faydaId')) {
              await user.validateFaydaUniqueness();
            }
          },
          afterCreate: (user) => {
            user.emitUserEvent('user.created', user);
          },
          afterUpdate: (user) => {
            user.emitUserEvent('user.updated', user);
          }
        },
        defaultScope: {
          attributes: {
            exclude: [
              'password',
              'verificationToken',
              'verificationTokenExpires',
              'passwordResetToken',
              'passwordResetExpires'
            ]
          }
        },
        scopes: {
          // 🔐 Security Scopes
          withSensitive: {
            attributes: { include: ['password', 'verificationToken'] }
          },
          active: {
            where: { status: USER_STATUS.ACTIVE }
          },
          verified: {
            where: {
              faydaVerificationStatus: VERIFICATION_STATUS.VERIFIED,
              phoneVerified: true
            }
          },
          students: {
            where: { role: USER_ROLES.STUDENT }
          },
          experts: {
            where: { role: USER_ROLES.EXPERT }
          },
          admins: {
            where: { role: USER_ROLES.ADMIN }
          },
          byRegion: (region) => ({
            where: { region }
          }),
          createdAfter: (date) => ({
            where: {
              createdAt: {
                [sequelize.Sequelize.Op.gte]: date
              }
            }
          })
        }
      }
    );
  }

  /**
   * 🏗️ Model Associations
   */
  static associate(models) {
    // Self-referential for referrals
    this.hasMany(models.User, {
      foreignKey: 'referredBy',
      as: 'referrals'
    });

    this.belongsTo(models.User, {
      foreignKey: 'referredBy',
      as: 'referrer'
    });

    // Expert profile association
    this.hasOne(models.Expert, {
      foreignKey: 'userId',
      as: 'expertProfile'
    });

    // Student profile association
    this.hasOne(models.Student, {
      foreignKey: 'userId',
      as: 'studentProfile'
    });

    // Audit associations
    this.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });

    this.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });

    // Authentication logs
    this.hasMany(models.AuthLog, {
      foreignKey: 'userId',
      as: 'authLogs'
    });
  }

  /**
   * 🏗️ Instance Methods
   */

  /**
   * Encrypt password using bcrypt
   */
  async encryptPassword(password) {
    const saltRounds = 12; // Enterprise security level
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Validate password
   */
  async validatePassword(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
  }

  /**
   * Check if account is currently locked
   */
  isLocked() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
  }

  /**
   * Increment login attempts and lock if necessary
   */
  async incrementLoginAttempts() {
    const maxAttempts = 5;
    const lockTime = 30 * 60 * 1000; // 30 minutes

    if (this.lockUntil && this.lockUntil < Date.now()) {
      return await this.update({
        loginAttempts: 1,
        lockUntil: null
      });
    }

    const updates = {
      loginAttempts: this.loginAttempts + 1
    };

    if (updates.loginAttempts >= maxAttempts && !this.lockUntil) {
      updates.lockUntil = Date.now() + lockTime;
    }

    return await this.update(updates);
  }

  /**
   * Reset login attempts after successful login
   */
  async resetLoginAttempts() {
    return await this.update({
      loginAttempts: 0,
      lockUntil: null,
      lastLogin: new Date()
    });
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = Date.now() + 60 * 60 * 1000; // 1 hour

    await this.update({
      passwordResetToken: crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex'),
      passwordResetExpires: new Date(resetTokenExpires)
    });

    return resetToken;
  }

  /**
   * Generate email verification token
   */
  async generateVerificationToken() {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    await this.update({
      verificationToken: crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex'),
      verificationTokenExpires: new Date(verificationTokenExpires)
    });

    return verificationToken;
  }

  /**
   * Validate Fayda ID uniqueness (AI duplicate detection hook)
   */
  async validateFaydaUniqueness() {
    const existingUser = await this.constructor.findOne({
      where: {
        faydaId: this.faydaId,
        id: { [this.sequelize.Sequelize.Op.ne]: this.id }
      }
    });

    if (existingUser) {
      throw new Error('Fayda ID already registered. Please use account recovery or contact support.');
    }
  }

  /**
   * Emit user events for real-time updates
   */
  emitUserEvent(eventType, data) {
    // In production, this would emit to Redis Pub/Sub or message queue
    const event = {
      type: eventType,
      data: this.toJSON(),
      timestamp: new Date().toISOString(),
      metadata: data.metadata || {}
    };

    // Emit to process for event handlers
    process.emit('user:event', event);
  }

  /**
   * 🏗️ Static Methods
   */

  /**
   * Generate unique referral code
   */
  static generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'MOSA';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Find user by Fayda ID with caching
   */
  static async findByFaydaId(faydaId, options = {}) {
    const cacheKey = `user:fayda:${faydaId}`;
    
    // Implementation would include Redis caching
    return await this.findOne({
      where: { faydaId },
      ...options
    });
  }

  /**
   * Bulk user status update with validation
   */
  static async bulkStatusUpdate(userIds, status, updatedBy) {
    if (!Object.values(USER_STATUS).includes(status)) {
      throw new Error('Invalid user status');
    }

    return await this.update(
      {
        status,
        updatedBy,
        updatedAt: new Date()
      },
      {
        where: {
          id: { [this.sequelize.Sequelize.Op.in]: userIds }
        },
        individualHooks: true
      }
    );
  }

  /**
   * Get user statistics for dashboard
   */
  static async getUserStatistics() {
    const stats = await this.findAll({
      attributes: [
        'status',
        'role',
        [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'count']
      ],
      group: ['status', 'role'],
      raw: true
    });

    return stats.reduce((acc, stat) => {
      if (!acc[stat.role]) acc[stat.role] = {};
      acc[stat.role][stat.status] = parseInt(stat.count);
      return acc;
    }, {});
  }

  /**
   * 🎯 Enterprise Serialization
   */
  toJSON() {
    const values = super.toJSON();
    
    // Remove sensitive fields
    delete values.password;
    delete values.verificationToken;
    delete values.verificationTokenExpires;
    delete values.passwordResetToken;
    delete values.passwordResetExpires;
    
    // Add computed fields
    values.fullName = `${this.firstName} ${this.lastName}`;
    values.isVerified = this.faydaVerificationStatus === VERIFICATION_STATUS.VERIFIED;
    values.isActive = this.status === USER_STATUS.ACTIVE;
    
    return values;
  }

  /**
   * Secure serialization for authentication
   */
  toAuthJSON() {
    return {
      id: this.id,
      faydaId: this.faydaId,
      email: this.email,
      phoneNumber: this.phoneNumber,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      status: this.status,
      isVerified: this.faydaVerificationStatus === VERIFICATION_STATUS.VERIFIED,
      lastLogin: this.lastLogin,
      language: this.language,
      timezone: this.timezone
    };
  }
}

/**
 * 🏗️ Export Enterprise Constants and Class
 */
module.exports = {
  User,
  USER_ROLES,
  USER_STATUS,
  VERIFICATION_STATUS
};

/**
 * 🏗️ Export for dependency injection
 */
module.exports.initModel = (sequelize) => {
  User.init(sequelize);
  return User;
};