/**
 * 🎯 MOSA FORGE: Enterprise Payment Model
 * 
 * @module PaymentModel
 * @description Enterprise-grade payment transaction management with revenue distribution
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - 1,999 ETB bundle payment processing
 * - 1000/999 revenue split automation
 * - 333/333/333 expert payout scheduling
 * - Multi-gateway integration (Telebirr, CBE Birr)
 * - Quality bonus calculations
 * - Refund and dispute management
 */

const { DataTypes, Model, Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// 🏗️ Enterprise Payment Constants
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
  CANCELLED: 'cancelled'
};

const PAYMENT_GATEWAYS = {
  TELEBIRR: 'telebirr',
  CBE_BIRR: 'cbe_birr',
  BANK_TRANSFER: 'bank_transfer',
  CASH: 'cash'
};

const REVENUE_SPLIT = {
  MOSA_PLATFORM: 1000,
  EXPERT_EARNINGS: 999,
  TOTAL_BUNDLE: 1999
};

const PAYOUT_SCHEDULE = {
  UPFRONT: 333,
  MIDPOINT: 333,
  COMPLETION: 333
};

/**
 * 🏗️ Enterprise Payment Model Class
 * @class Payment
 * @extends Model
 */
class Payment extends Model {
  /**
   * 🏗️ Initialize Payment Model with Enterprise Features
   * @param {Object} sequelize - Sequelize instance
   */
  static init(sequelize) {
    return super.init(
      {
        // 🆔 Primary Identification
        id: {
          type: DataTypes.UUID,
          defaultValue: () => uuidv4(),
          primaryKey: true,
          allowNull: false,
          validate: {
            isUUID: 4
          }
        },

        // 💰 Payment Amount & Currency
        amount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            isDecimal: true,
            min: {
              args: [0],
              msg: 'Amount cannot be negative'
            },
            isValidBundleAmount(value) {
              if (value !== REVENUE_SPLIT.TOTAL_BUNDLE) {
                throw new Error(`Invalid bundle amount. Must be ${REVENUE_SPLIT.TOTAL_BUNDLE} ETB`);
              }
            }
          }
        },

        currency: {
          type: DataTypes.STRING(3),
          defaultValue: 'ETB',
          allowNull: false,
          validate: {
            isIn: [['ETB']] // Currently only Ethiopian Birr
          }
        },

        // 🏦 Payment Gateway Information
        gateway: {
          type: DataTypes.ENUM(...Object.values(PAYMENT_GATEWAYS)),
          allowNull: false,
          validate: {
            isIn: [Object.values(PAYMENT_GATEWAYS)]
          }
        },

        gatewayTransactionId: {
          type: DataTypes.STRING(255),
          allowNull: true,
          comment: 'External gateway transaction reference'
        },

        gatewayResponse: {
          type: DataTypes.JSONB,
          allowNull: true,
          comment: 'Raw response from payment gateway'
        },

        // 💸 Revenue Distribution
        mosaRevenue: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: REVENUE_SPLIT.MOSA_PLATFORM,
          validate: {
            isDecimal: true,
            min: 0
          }
        },

        expertRevenue: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: REVENUE_SPLIT.EXPERT_EARNINGS,
          validate: {
            isDecimal: true,
            min: 0
          }
        },

        qualityBonus: {
          type: DataTypes.DECIMAL(10, 2),
          defaultValue: 0,
          validate: {
            isDecimal: true,
            min: 0,
            max: 199.80 // 20% of 999 ETB
          }
        },

        // 🗓️ Payout Scheduling
        payoutSchedule: {
          type: DataTypes.JSONB,
          defaultValue: () => ([
            {
              phase: 'upfront',
              amount: PAYOUT_SCHEDULE.UPFRONT,
              dueDate: null,
              paid: false,
              paidAt: null,
              transactionId: null
            },
            {
              phase: 'midpoint',
              amount: PAYOUT_SCHEDULE.MIDPOINT,
              dueDate: null,
              paid: false,
              paidAt: null,
              transactionId: null
            },
            {
              phase: 'completion',
              amount: PAYOUT_SCHEDULE.COMPLETION,
              dueDate: null,
              paid: false,
              paidAt: null,
              transactionId: null
            }
          ]),
          validate: {
            isValidPayoutSchedule(value) {
              if (!Array.isArray(value)) {
                throw new Error('Payout schedule must be an array');
              }
              
              const total = value.reduce((sum, payout) => sum + parseFloat(payout.amount), 0);
              if (total !== REVENUE_SPLIT.EXPERT_EARNINGS) {
                throw new Error(`Payout schedule total must equal ${REVENUE_SPLIT.EXPERT_EARNINGS}`);
              }
            }
          }
        },

        // 📊 Payment Status & Lifecycle
        status: {
          type: DataTypes.ENUM(...Object.values(PAYMENT_STATUS)),
          defaultValue: PAYMENT_STATUS.PENDING,
          allowNull: false,
          validate: {
            isIn: [Object.values(PAYMENT_STATUS)]
          }
        },

        statusHistory: {
          type: DataTypes.JSONB,
          defaultValue: [],
          validate: {
            isArray: true
          }
        },

        // 🔐 Security & Verification
        securityHash: {
          type: DataTypes.STRING(64),
          allowNull: true,
          comment: 'SHA-256 hash for transaction integrity'
        },

        ipAddress: {
          type: DataTypes.INET,
          allowNull: true,
          validate: {
            isIP: true
          }
        },

        userAgent: {
          type: DataTypes.TEXT,
          allowNull: true
        },

        // ⏰ Timestamps & Expiry
        expiresAt: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: true
          }
        },

        completedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: true
          }
        },

        refundedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          validate: {
            isDate: true
          }
        },

        // 🏷️ Metadata & Tracking
        metadata: {
          type: DataTypes.JSONB,
          defaultValue: {},
          comment: 'Additional payment context and metadata'
        },

        traceId: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: 4
          }
        },

        // 🔄 Audit Fields
        createdBy: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            isUUID: 4
          }
        },

        updatedBy: {
          type: DataTypes.UUID,
          allowNull: true,
          validate: {
            isUUID: 4
          }
        }
      },
      {
        sequelize,
        modelName: 'Payment',
        tableName: 'payments',
        underscored: true,
        paranoid: true, // Soft deletes
        indexes: [
          // 🚀 Performance Indexes
          {
            name: 'idx_payments_status',
            fields: ['status']
          },
          {
            name: 'idx_payments_gateway',
            fields: ['gateway']
          },
          {
            name: 'idx_payments_created_at',
            fields: ['created_at']
          },
          {
            name: 'idx_payments_student_expert',
            fields: ['student_id', 'expert_id']
          },
          {
            name: 'idx_payments_gateway_transaction',
            fields: ['gateway_transaction_id'],
            unique: true
          },
          // 🔍 Composite Indexes for Common Queries
          {
            name: 'idx_payments_status_created',
            fields: ['status', 'created_at']
          }
        ],
        hooks: {
          // 🏗️ Enterprise Lifecycle Hooks
          beforeCreate: (payment, options) => {
            payment._generateSecurityHash();
            payment._setDefaultExpiry();
            payment._initializeStatusHistory();
          },
          
          beforeUpdate: (payment, options) => {
            if (payment.changed('status')) {
              payment._updateStatusHistory();
            }
            
            if (payment.changed('amount') && !payment.isNewRecord) {
              throw new Error('Payment amount cannot be modified after creation');
            }
          },
          
          afterUpdate: (payment, options) => {
            if (payment.changed('status') && payment.status === PAYMENT_STATUS.COMPLETED) {
              payment._triggerRevenueDistribution();
            }
          }
        }
      }
    );
  }

  /**
   * 🏗️ Define Enterprise Associations
   * @param {Object} models - Sequelize models
   */
  static associate(models) {
    // 🔗 Core Business Relationships
    this.belongsTo(models.Student, {
      foreignKey: 'student_id',
      as: 'student',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    this.belongsTo(models.Expert, {
      foreignKey: 'expert_id',
      as: 'expert',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    this.belongsTo(models.Enrollment, {
      foreignKey: 'enrollment_id',
      as: 'enrollment',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    this.belongsTo(models.Bundle, {
      foreignKey: 'bundle_id',
      as: 'bundle',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    // 🔄 Transaction Relationships
    this.hasMany(models.Payout, {
      foreignKey: 'payment_id',
      as: 'payouts',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    this.hasMany(models.Refund, {
      foreignKey: 'payment_id',
      as: 'refunds',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });

    this.hasMany(models.PaymentWebhook, {
      foreignKey: 'payment_id',
      as: 'webhooks',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  }

  /**
   * 🏗️ Generate Security Hash for Transaction Integrity
   * @private
   */
  _generateSecurityHash() {
    const hashData = {
      id: this.id,
      amount: this.amount,
      studentId: this.student_id,
      expertId: this.expert_id,
      gateway: this.gateway,
      timestamp: new Date().toISOString()
    };

    const hashString = JSON.stringify(hashData);
    this.securityHash = crypto
      .createHash('sha256')
      .update(hashString + process.env.PAYMENT_HASH_SECRET)
      .digest('hex');
  }

  /**
   * 🏗️ Set Default Payment Expiry (24 hours)
   * @private
   */
  _setDefaultExpiry() {
    if (!this.expiresAt) {
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24); // 24-hour expiry
      this.expiresAt = expiryDate;
    }
  }

  /**
   * 🏗️ Initialize Status History
   * @private
   */
  _initializeStatusHistory() {
    this.statusHistory = [{
      status: this.status,
      timestamp: new Date(),
      reason: 'Payment initialized',
      actor: this.createdBy
    }];
  }

  /**
   * 🏗️ Update Status History
   * @private
   */
  _updateStatusHistory() {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      reason: 'Status updated',
      actor: this.updatedBy || this.createdBy
    });
  }

  /**
   * 🏗️ Trigger Revenue Distribution Process
   * @private
   */
  async _triggerRevenueDistribution() {
    try {
      // This would integrate with the payment service for actual distribution
      console.log(`Revenue distribution triggered for payment ${this.id}`);
      
      // Update completed timestamp
      this.completedAt = new Date();
      
      // In production, this would emit an event or call a service
      await this.emit('payment.completed', {
        paymentId: this.id,
        amount: this.amount,
        mosaRevenue: this.mosaRevenue,
        expertRevenue: this.expertRevenue,
        studentId: this.student_id,
        expertId: this.expert_id
      });
      
    } catch (error) {
      console.error('Revenue distribution failed:', error);
      throw new Error('Failed to trigger revenue distribution');
    }
  }

  /**
   * 🎯 ENTERPRISE METHODS
   */

  /**
   * 🏗️ Process Payment Completion
   * @param {Object} gatewayResponse - Response from payment gateway
   * @returns {Promise<Payment>} Updated payment instance
   */
  async processCompletion(gatewayResponse) {
    const transaction = await this.sequelize.transaction();
    
    try {
      // Validate gateway response
      this._validateGatewayResponse(gatewayResponse);
      
      // Update payment status
      this.status = PAYMENT_STATUS.COMPLETED;
      this.gatewayResponse = gatewayResponse;
      this.gatewayTransactionId = gatewayResponse.transactionId;
      this.completedAt = new Date();
      
      // Calculate quality bonus if applicable
      await this._calculateQualityBonus();
      
      // Save with transaction
      await this.save({ transaction });
      
      // Trigger post-completion actions
      await this._triggerPostCompletionActions(transaction);
      
      await transaction.commit();
      return this;
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 🏗️ Validate Gateway Response
   * @private
   */
  _validateGatewayResponse(gatewayResponse) {
    if (!gatewayResponse || typeof gatewayResponse !== 'object') {
      throw new Error('Invalid gateway response');
    }
    
    if (!gatewayResponse.transactionId) {
      throw new Error('Gateway response missing transaction ID');
    }
    
    if (gatewayResponse.amount !== this.amount) {
      throw new Error('Gateway amount does not match payment amount');
    }
    
    if (gatewayResponse.currency !== this.currency) {
      throw new Error('Gateway currency does not match payment currency');
    }
  }

  /**
   * 🏗️ Calculate Quality Bonus Based on Expert Performance
   * @private
   */
  async _calculateQualityBonus() {
    try {
      const expert = await this.sequelize.models.Expert.findByPk(this.expert_id, {
        include: ['qualityMetrics']
      });
      
      if (!expert || !expert.qualityMetrics) {
        return; // No bonus calculation possible
      }
      
      const { qualityMetrics } = expert;
      let bonusPercentage = 0;
      
      // Master Tier: 4.7+ rating, 80%+ completion rate
      if (qualityMetrics.overallScore >= 4.7 && qualityMetrics.completionRate >= 0.8) {
        bonusPercentage = 0.20; // 20% bonus
      }
      // Senior Tier: 4.3+ rating, 75%+ completion rate
      else if (qualityMetrics.overallScore >= 4.3 && qualityMetrics.completionRate >= 0.75) {
        bonusPercentage = 0.10; // 10% bonus
      }
      
      this.qualityBonus = Math.round(this.expertRevenue * bonusPercentage * 100) / 100;
      
    } catch (error) {
      console.error('Quality bonus calculation failed:', error);
      // Don't fail the payment if bonus calculation fails
    }
  }

  /**
   * 🏗️ Trigger Post-Completion Actions
   * @private
   */
  async _triggerPostCompletionActions(transaction) {
    // Update enrollment status
    if (this.enrollment_id) {
      await this.sequelize.models.Enrollment.update(
        { status: 'active' },
        { 
          where: { id: this.enrollment_id },
          transaction 
        }
      );
    }
    
    // Record platform revenue
    await this.sequelize.models.PlatformRevenue.create({
      payment_id: this.id,
      amount: this.mosaRevenue,
      revenue_type: 'bundle_sale',
      period: new Date().toISOString().slice(0, 7), // YYYY-MM
      metadata: {
        student_id: this.student_id,
        expert_id: this.expert_id,
        bundle_type: 'standard_1999'
      }
    }, { transaction });
  }

  /**
   * 🏗️ Process Refund with Prorated Calculations
   * @param {number} refundAmount - Amount to refund
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>} Refund result
   */
  async processRefund(refundAmount, reason = 'Student request') {
    if (this.status !== PAYMENT_STATUS.COMPLETED) {
      throw new Error('Only completed payments can be refunded');
    }
    
    if (refundAmount > this.amount) {
      throw new Error('Refund amount cannot exceed payment amount');
    }
    
    const transaction = await this.sequelize.transaction();
    
    try {
      // Calculate prorated refunds based on course progress
      const proratedRefunds = await this._calculateProratedRefund(refundAmount);
      
      // Create refund record
      const refund = await this.sequelize.models.Refund.create({
        payment_id: this.id,
        amount: refundAmount,
        reason,
        prorated_breakdown: proratedRefunds,
        status: 'processed',
        processed_by: this.updatedBy || this.createdBy
      }, { transaction });
      
      // Update payment status
      this.status = PAYMENT_STATUS.REFUNDED;
      this.refundedAt = new Date();
      await this.save({ transaction });
      
      // Trigger refund webhooks and notifications
      await this._triggerRefundNotifications(refund, transaction);
      
      await transaction.commit();
      
      return {
        success: true,
        refundId: refund.id,
        amount: refundAmount,
        proratedBreakdown: proratedRefunds
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 🏗️ Calculate Prorated Refund Amounts
   * @private
   */
  async _calculateProratedRefund(refundAmount) {
    const enrollment = await this.sequelize.models.Enrollment.findByPk(
      this.enrollment_id,
      { include: ['learningProgress'] }
    );
    
    if (!enrollment) {
      return {
        mosa_platform: refundAmount * 0.5,
        expert_earnings: refundAmount * 0.5
      };
    }
    
    const progress = enrollment.learningProgress?.[0]?.progress || 0;
    
    // More progress = less refund for expert
    const expertRefundRatio = Math.max(0, 1 - progress);
    const mosaRefundRatio = 1; // Platform refunds full share regardless of progress
    
    const totalRatio = expertRefundRatio + mosaRefundRatio;
    
    return {
      mosa_platform: (refundAmount * mosaRefundRatio) / totalRatio,
      expert_earnings: (refundAmount * expertRefundRatio) / totalRatio,
      progress_considered: progress
    };
  }

  /**
   * 🏗️ Trigger Refund Notifications
   * @private
   */
  async _triggerRefundNotifications(refund, transaction) {
    // Notify student
    await this.sequelize.models.Notification.create({
      user_id: this.student_id,
      type: 'refund_processed',
      title: 'Refund Processed',
      message: `Your refund of ${refund.amount} ETB has been processed.`,
      metadata: {
        refund_id: refund.id,
        payment_id: this.id,
        amount: refund.amount
      }
    }, { transaction });
    
    // Notify expert if they are affected
    const proratedBreakdown = refund.prorated_breakdown;
    if (proratedBreakdown.expert_earnings > 0) {
      await this.sequelize.models.Notification.create({
        user_id: this.expert_id,
        type: 'revenue_adjustment',
        title: 'Revenue Adjustment - Refund',
        message: `A refund has been processed affecting your earnings.`,
        metadata: {
          refund_id: refund.id,
          adjustment_amount: -proratedBreakdown.expert_earnings,
          payment_id: this.id
        }
      }, { transaction });
    }
  }

  /**
   * 🏗️ Process Payout for Expert
   * @param {string} phase - Payout phase (upfront, midpoint, completion)
   * @returns {Promise<Object>} Payout result
   */
  async processPayout(phase) {
    const payoutEntry = this.payoutSchedule.find(p => p.phase === phase);
    
    if (!payoutEntry) {
      throw new Error(`Invalid payout phase: ${phase}`);
    }
    
    if (payoutEntry.paid) {
      throw new Error(`Payout for ${phase} already processed`);
    }
    
    const transaction = await this.sequelize.transaction();
    
    try {
      // Calculate total amount with quality bonus
      const baseAmount = payoutEntry.amount;
      const bonusAmount = phase === 'completion' ? this.qualityBonus : 0;
      const totalAmount = baseAmount + bonusAmount;
      
      // Create payout record
      const payout = await this.sequelize.models.Payout.create({
        payment_id: this.id,
        expert_id: this.expert_id,
        phase,
        amount: totalAmount,
        base_amount: baseAmount,
        bonus_amount: bonusAmount,
        status: 'processing',
        payout_method: this.expert.payout_method || 'telebirr',
        metadata: {
          quality_bonus_applied: bonusAmount > 0,
          expert_tier: this.expert.tier
        }
      }, { transaction });
      
      // Update payout schedule
      payoutEntry.paid = true;
      payoutEntry.paidAt = new Date();
      payoutEntry.transactionId = payout.id;
      await this.save({ transaction });
      
      // Integrate with actual payout gateway (Telebirr, CBE Birr, etc.)
      await this._processGatewayPayout(payout, transaction);
      
      await transaction.commit();
      
      return {
        success: true,
        payoutId: payout.id,
        amount: totalAmount,
        phase,
        includesBonus: bonusAmount > 0
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 🏗️ Process Gateway Payout Integration
   * @private
   */
  async _processGatewayPayout(payout, transaction) {
    // This would integrate with Telebirr, CBE Birr, or bank APIs
    // For now, we'll simulate successful processing
    
    payout.status = 'completed';
    payout.processed_at = new Date();
    await payout.save({ transaction });
    
    // Record expert earnings
    await this.sequelize.models.ExpertEarning.create({
      expert_id: this.expert_id,
      payout_id: payout.id,
      amount: payout.amount,
      type: 'training_payout',
      period: new Date().toISOString().slice(0, 7),
      metadata: {
        payment_id: this.id,
        phase: payout.phase,
        quality_bonus: payout.bonus_amount
      }
    }, { transaction });
  }

  /**
   * 🏗️ Check Payment Expiry
   * @returns {boolean} True if payment is expired
   */
  isExpired() {
    return this.expiresAt && new Date() > this.expiresAt;
  }

  /**
   * 🏗️ Get Payment Summary for Reporting
   * @returns {Object} Payment summary
   */
  getSummary() {
    return {
      id: this.id,
      amount: this.amount,
      currency: this.currency,
      status: this.status,
      gateway: this.gateway,
      mosaRevenue: this.mosaRevenue,
      expertRevenue: this.expertRevenue,
      qualityBonus: this.qualityBonus,
      totalExpertEarnings: this.expertRevenue + this.qualityBonus,
      createdAt: this.createdAt,
      completedAt: this.completedAt,
      isExpired: this.isExpired(),
      payoutProgress: this._getPayoutProgress()
    };
  }

  /**
   * 🏗️ Get Payout Progress
   * @private
   */
  _getPayoutProgress() {
    const paidPayouts = this.payoutSchedule.filter(p => p.paid);
    const totalPayouts = this.payoutSchedule.length;
    
    return {
      completed: paidPayouts.length,
      total: totalPayouts,
      percentage: (paidPayouts.length / totalPayouts) * 100,
      nextPayout: this.payoutSchedule.find(p => !p.paid)?.phase
    };
  }

  /**
   * 🏗️ STATIC ENTERPRISE METHODS
   */

  /**
   * 🏗️ Get Revenue Analytics
   * @param {Date} startDate - Start date for analytics
   * @param {Date} endDate - End date for analytics
   * @returns {Promise<Object>} Revenue analytics
   */
  static async getRevenueAnalytics(startDate, endDate) {
    const payments = await this.findAll({
      where: {
        status: PAYMENT_STATUS.COMPLETED,
        created_at: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'total_payments'],
        [this.sequelize.fn('SUM', this.sequelize.col('amount')), 'total_revenue'],
        [this.sequelize.fn('SUM', this.sequelize.col('mosa_revenue')), 'platform_revenue'],
        [this.sequelize.fn('SUM', this.sequelize.col('expert_revenue')), 'expert_revenue'],
        [this.sequelize.fn('SUM', this.sequelize.col('quality_bonus')), 'total_bonuses']
      ],
      raw: true
    });

    return payments[0] || {};
  }

  /**
   * 🏗️ Find Payments Requiring Payout
   * @param {string} phase - Payout phase to find
   * @returns {Promise<Array>} Payments requiring payout
   */
  static async findPaymentsRequiringPayout(phase) {
    return await this.findAll({
      where: {
        status: PAYMENT_STATUS.COMPLETED,
        payout_schedule: {
          [Op.contains]: [
            {
              phase,
              paid: false
            }
          ]
        }
      },
      include: [
        {
          model: this.sequelize.models.Expert,
          as: 'expert',
          attributes: ['id', 'name', 'payout_method', 'telebirr_number']
        },
        {
          model: this.sequelize.models.Enrollment,
          as: 'enrollment',
          attributes: ['id', 'progress']
        }
      ]
    });
  }
}

// 🏗️ Enterprise Exports
module.exports = {
  Payment,
  PAYMENT_STATUS,
  PAYMENT_GATEWAYS,
  REVENUE_SPLIT,
  PAYOUT_SCHEDULE
};