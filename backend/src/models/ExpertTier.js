/**
 * 🎯 MOSA FORGE: Enterprise Expert Tier Management Model
 * 
 * @module ExpertTier
 * @description Manages expert tier system with dynamic quality-based progression
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Dynamic tier calculation based on quality metrics
 * - Performance-based capacity limits
 * - Automatic tier promotion/demotion
 * - Quality bonus calculations
 * - Real-time tier monitoring
 */

const { DataTypes, Model, Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');

// 🏗️ Enterprise Tier Configuration
const TIER_CONFIG = {
  MASTER: {
    level: 5,
    minQualityScore: 4.7,
    minCompletionRate: 0.8,
    maxResponseTime: 12, // hours
    studentCapacity: null, // Unlimited
    baseBonus: 0.2, // 20%
    color: '#FFD700',
    badge: '🏆',
    requirements: {
      minStudents: 50,
      minMonthsActive: 6,
      minCertifications: 10
    }
  },
  SENIOR: {
    level: 4,
    minQualityScore: 4.3,
    minCompletionRate: 0.75,
    maxResponseTime: 18, // hours
    studentCapacity: 100,
    baseBonus: 0.1, // 10%
    color: '#C0C0C0',
    badge: '⭐',
    requirements: {
      minStudents: 25,
      minMonthsActive: 3,
      minCertifications: 5
    }
  },
  STANDARD: {
    level: 3,
    minQualityScore: 4.0,
    minCompletionRate: 0.7,
    maxResponseTime: 24, // hours
    studentCapacity: 50,
    baseBonus: 0.0, // 0%
    color: '#CD7F32',
    badge: '✅',
    requirements: {
      minStudents: 10,
      minMonthsActive: 1,
      minCertifications: 1
    }
  },
  DEVELOPING: {
    level: 2,
    minQualityScore: 3.5,
    minCompletionRate: 0.6,
    maxResponseTime: 36, // hours
    studentCapacity: 25,
    baseBonus: -0.1, // -10% penalty
    color: '#808080',
    badge: '🌱',
    requirements: {
      minStudents: 5,
      minMonthsActive: 0,
      minCertifications: 0
    }
  },
  PROBATION: {
    level: 1,
    minQualityScore: 0,
    minCompletionRate: 0,
    maxResponseTime: 48, // hours
    studentCapacity: 10,
    baseBonus: -0.2, // -20% penalty
    color: '#FF0000',
    badge: '⚠️',
    requirements: {
      minStudents: 0,
      minMonthsActive: 0,
      minCertifications: 0
    }
  }
};

// 🏗️ Tier Calculation Weights
const TIER_CALCULATION_WEIGHTS = {
  QUALITY_SCORE: 0.35,
  COMPLETION_RATE: 0.25,
  RESPONSE_TIME: 0.15,
  STUDENT_FEEDBACK: 0.15,
  CERTIFICATION_RATE: 0.10
};

/**
 * 🏗️ Enterprise ExpertTier Model Class
 * @class ExpertTier
 * @extends Model
 */
class ExpertTier extends Model {
  /**
   * 🏗️ Initialize Model with Sequelize
   * @param {Sequelize} sequelize - Sequelize instance
   * @returns {ExpertTier} Initialized model
   */
  static initialize(sequelize) {
    ExpertTier.init(
      {
        // 🆔 Primary Key
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },

        // 🔗 Relationships
        expertId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'experts',
            key: 'id'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
        },

        // 🎯 Tier Information
        currentTier: {
          type: DataTypes.ENUM(
            'MASTER',
            'SENIOR', 
            'STANDARD',
            'DEVELOPING',
            'PROBATION'
          ),
          defaultValue: 'DEVELOPING',
          allowNull: false,
          validate: {
            isIn: [['MASTER', 'SENIOR', 'STANDARD', 'DEVELOPING', 'PROBATION']]
          }
        },

        previousTier: {
          type: DataTypes.ENUM(
            'MASTER',
            'SENIOR',
            'STANDARD', 
            'DEVELOPING',
            'PROBATION'
          ),
          allowNull: true
        },

        tierScore: {
          type: DataTypes.DECIMAL(5, 4),
          defaultValue: 0.0,
          validate: {
            min: 0,
            max: 1
          }
        },

        // 📊 Quality Metrics (Rolling 30-day average)
        qualityScore: {
          type: DataTypes.DECIMAL(3, 2),
          defaultValue: 0.0,
          validate: {
            min: 0,
            max: 5
          }
        },

        completionRate: {
          type: DataTypes.DECIMAL(5, 4),
          defaultValue: 0.0,
          validate: {
            min: 0,
            max: 1
          }
        },

        averageResponseTime: {
          type: DataTypes.DECIMAL(5, 2), // hours
          defaultValue: 48.0,
          validate: {
            min: 0
          }
        },

        studentSatisfaction: {
          type: DataTypes.DECIMAL(3, 2),
          defaultValue: 0.0,
          validate: {
            min: 0,
            max: 5
          }
        },

        certificationRate: {
          type: DataTypes.DECIMAL(5, 4),
          defaultValue: 0.0,
          validate: {
            min: 0,
            max: 1
          }
        },

        // 📈 Performance Metrics
        totalStudents: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          validate: {
            min: 0
          }
        },

        activeStudents: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          validate: {
            min: 0
          }
        },

        completedCertifications: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          validate: {
            min: 0
          }
        },

        monthsActive: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          validate: {
            min: 0
          }
        },

        // 💰 Financial Metrics
        totalEarnings: {
          type: DataTypes.DECIMAL(10, 2),
          defaultValue: 0.0,
          validate: {
            min: 0
          }
        },

        qualityBonuses: {
          type: DataTypes.DECIMAL(10, 2),
          defaultValue: 0.0,
          validate: {
            min: 0
          }
        },

        currentBonusRate: {
          type: DataTypes.DECIMAL(4, 3),
          defaultValue: 0.0,
          validate: {
            min: -0.2,
            max: 0.2
          }
        },

        // ⚙️ Capacity Management
        maxCapacity: {
          type: DataTypes.INTEGER,
          defaultValue: 10,
          validate: {
            min: 1
          }
        },

        capacityUtilization: {
          type: DataTypes.DECIMAL(5, 4),
          defaultValue: 0.0,
          validate: {
            min: 0,
            max: 1
          }
        },

        // 📅 Tier History & Monitoring
        lastTierChange: {
          type: DataTypes.DATE,
          allowNull: true
        },

        daysInCurrentTier: {
          type: DataTypes.INTEGER,
          defaultValue: 0,
          validate: {
            min: 0
          }
        },

        tierChangeReason: {
          type: DataTypes.TEXT,
          allowNull: true
        },

        nextEvaluationDate: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },

        // 🏷️ Metadata
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true
        },

        metadata: {
          type: DataTypes.JSONB,
          defaultValue: {}
        }
      },
      {
        sequelize,
        modelName: 'ExpertTier',
        tableName: 'expert_tiers',
        underscored: true,
        timestamps: true,
        paranoid: true,
        indexes: [
          {
            name: 'idx_expert_tier_current',
            fields: ['current_tier', 'tier_score']
          },
          {
            name: 'idx_expert_tier_quality',
            fields: ['quality_score', 'completion_rate']
          },
          {
            name: 'idx_expert_tier_capacity',
            fields: ['active_students', 'max_capacity']
          },
          {
            name: 'idx_expert_tier_evaluation',
            fields: ['next_evaluation_date', 'is_active']
          }
        ]
      }
    );

    return ExpertTier;
  }

  /**
   * 🏗️ Define Model Associations
   * @param {Object} models - Sequelize models
   */
  static associate(models) {
    ExpertTier.belongsTo(models.Expert, {
      foreignKey: 'expertId',
      as: 'expert',
      onDelete: 'CASCADE'
    });

    ExpertTier.hasMany(models.TierHistory, {
      foreignKey: 'expertTierId',
      as: 'tierHistory',
      onDelete: 'CASCADE'
    });

    ExpertTier.hasMany(models.QualityMetric, {
      foreignKey: 'expertTierId',
      as: 'qualityMetrics',
      onDelete: 'CASCADE'
    });
  }

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Calculate Expert Tier
   * @param {Object} metrics - Current expert metrics
   * @returns {Promise<Object>} Tier calculation result
   */
  async calculateTier(metrics = {}) {
    const startTime = Date.now();
    
    try {
      // 🏗️ Validate input metrics
      const validatedMetrics = this._validateMetrics(metrics);
      
      // 🏗️ Calculate individual component scores
      const componentScores = this._calculateComponentScores(validatedMetrics);
      
      // 🏗️ Calculate overall tier score
      const tierScore = this._calculateOverallScore(componentScores);
      
      // 🏗️ Determine target tier based on score and requirements
      const targetTier = await this._determineTargetTier(tierScore, validatedMetrics);
      
      // 🏗️ Check if tier change is needed
      const tierChange = await this._evaluateTierChange(targetTier);
      
      // 🏗️ Calculate bonus rate
      const bonusRate = this._calculateBonusRate(targetTier, componentScores);
      
      // 🏗️ Update capacity limits
      const capacityData = await this._calculateCapacity(targetTier, validatedMetrics);

      const result = {
        currentTier: this.currentTier,
        targetTier: targetTier.tier,
        tierScore,
        componentScores,
        shouldChange: tierChange.shouldChange,
        changeReason: tierChange.reason,
        bonusRate,
        maxCapacity: capacityData.maxCapacity,
        capacityUtilization: capacityData.utilization,
        processingTime: Date.now() - startTime,
        evaluatedAt: new Date()
      };

      // 🏗️ Emit tier evaluation event
      this.constructor.emit('tier.evaluated', {
        expertId: this.expertId,
        ...result
      });

      return result;

    } catch (error) {
      this.constructor.emit('tier.evaluation.failed', {
        expertId: this.expertId,
        error: error.message,
        processingTime: Date.now() - startTime
      });
      
      throw new Error(`Tier calculation failed: ${error.message}`);
    }
  }

  /**
   * 🏗️ Validate Input Metrics
   * @private
   */
  _validateMetrics(metrics) {
    const requiredMetrics = [
      'qualityScore',
      'completionRate', 
      'responseTime',
      'studentSatisfaction',
      'certificationRate',
      'totalStudents',
      'activeStudents',
      'completedCertifications',
      'monthsActive'
    ];

    const missingMetrics = requiredMetrics.filter(metric => 
      metrics[metric] === undefined || metrics[metric] === null
    );

    if (missingMetrics.length > 0) {
      throw new Error(`Missing required metrics: ${missingMetrics.join(', ')}`);
    }

    // Validate metric ranges
    const validations = {
      qualityScore: { min: 0, max: 5 },
      completionRate: { min: 0, max: 1 },
      responseTime: { min: 0 },
      studentSatisfaction: { min: 0, max: 5 },
      certificationRate: { min: 0, max: 1 },
      totalStudents: { min: 0 },
      activeStudents: { min: 0 },
      completedCertifications: { min: 0 },
      monthsActive: { min: 0 }
    };

    for (const [metric, range] of Object.entries(validations)) {
      if (metrics[metric] < range.min || (range.max && metrics[metric] > range.max)) {
        throw new Error(`Metric ${metric} out of range: ${metrics[metric]}`);
      }
    }

    return metrics;
  }

  /**
   * 🏗️ Calculate Component Scores
   * @private
   */
  _calculateComponentScores(metrics) {
    const scores = {};

    // 🎯 Quality Score Component (0-1)
    scores.qualityScore = Math.min(metrics.qualityScore / 5, 1);

    // 🎯 Completion Rate Component (0-1)
    scores.completionRate = metrics.completionRate;

    // 🎯 Response Time Component (0-1) - faster is better
    scores.responseTime = Math.max(0, 1 - (metrics.responseTime / 48));

    // 🎯 Student Satisfaction Component (0-1)
    scores.studentSatisfaction = metrics.studentSatisfaction / 5;

    // 🎯 Certification Rate Component (0-1)
    scores.certificationRate = metrics.certificationRate;

    // 🎯 Apply weights to get weighted scores
    const weightedScores = {};
    for (const [component, weight] of Object.entries(TIER_CALCULATION_WEIGHTS)) {
      const componentKey = component.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      weightedScores[component] = scores[componentKey] * weight;
    }

    return {
      raw: scores,
      weighted: weightedScores
    };
  }

  /**
   * 🏗️ Calculate Overall Tier Score
   * @private
   */
  _calculateOverallScore(componentScores) {
    const totalWeightedScore = Object.values(componentScores.weighted).reduce(
      (sum, score) => sum + score, 0
    );

    // 🎯 Apply experience modifier based on months active
    const experienceModifier = Math.min(this.monthsActive / 12, 1) * 0.1;
    
    return Math.min(totalWeightedScore + experienceModifier, 1);
  }

  /**
   * 🏗️ Determine Target Tier
   * @private
   */
  async _determineTargetTier(tierScore, metrics) {
    const potentialTiers = Object.entries(TIER_CONFIG)
      .filter(([tier, config]) => {
        // Check minimum requirements
        return metrics.qualityScore >= config.minQualityScore &&
               metrics.completionRate >= config.minCompletionRate &&
               metrics.responseTime <= config.maxResponseTime &&
               this._checkTierRequirements(tier, metrics);
      })
      .sort(([, configA], [, configB]) => configB.level - configA.level);

    if (potentialTiers.length === 0) {
      return {
        tier: 'PROBATION',
        level: 1,
        meetsRequirements: false,
        missingRequirements: this._getMissingRequirements('PROBATION', metrics)
      };
    }

    // Find the highest tier that meets requirements and has good score
    const bestTier = potentialTiers[0];
    const tierName = bestTier[0];
    const tierConfig = bestTier[1];

    return {
      tier: tierName,
      level: tierConfig.level,
      meetsRequirements: true,
      score: tierScore,
      config: tierConfig
    };
  }

  /**
   * 🏗️ Check Tier Requirements
   * @private
   */
  _checkTierRequirements(tier, metrics) {
    const requirements = TIER_CONFIG[tier].requirements;
    
    return metrics.totalStudents >= requirements.minStudents &&
           metrics.monthsActive >= requirements.minMonthsActive &&
           metrics.completedCertifications >= requirements.minCertifications;
  }

  /**
   * 🏗️ Get Missing Requirements
   * @private
   */
  _getMissingRequirements(tier, metrics) {
    const requirements = TIER_CONFIG[tier].requirements;
    const missing = [];

    if (metrics.totalStudents < requirements.minStudents) {
      missing.push(`Need ${requirements.minStudents - metrics.totalStudents} more students`);
    }

    if (metrics.monthsActive < requirements.minMonthsActive) {
      missing.push(`Need ${requirements.minMonthsActive - metrics.monthsActive} more months active`);
    }

    if (metrics.completedCertifications < requirements.minCertifications) {
      missing.push(`Need ${requirements.minCertifications - metrics.completedCertifications} more certifications`);
    }

    return missing;
  }

  /**
   * 🏗️ Evaluate Tier Change
   * @private
   */
  async _evaluateTierChange(targetTier) {
    const currentTierLevel = TIER_CONFIG[this.currentTier].level;
    const targetTierLevel = targetTier.level;

    // 🎯 No change needed
    if (currentTierLevel === targetTierLevel) {
      return {
        shouldChange: false,
        reason: 'Already at appropriate tier level'
      };
    }

    // 🎯 Promotion (more than one level requires exceptional performance)
    if (targetTierLevel > currentTierLevel) {
      const levelDifference = targetTierLevel - currentTierLevel;
      
      if (levelDifference > 1 && !this._hasExceptionalPerformance()) {
        return {
          shouldChange: false,
          reason: 'Multi-level promotion requires exceptional performance'
        };
      }

      return {
        shouldChange: true,
        reason: `Promotion to ${targetTier.tier} based on performance metrics`,
        type: 'PROMOTION',
        levels: levelDifference
      };
    }

    // 🎯 Demotion (immediate for quality issues)
    if (targetTierLevel < currentTierLevel) {
      return {
        shouldChange: true,
        reason: `Demotion to ${targetTier.tier} due to performance metrics`,
        type: 'DEMOTION',
        levels: currentTierLevel - targetTierLevel
      };
    }

    return {
      shouldChange: false,
      reason: 'No tier change required'
    };
  }

  /**
   * 🏗️ Check for Exceptional Performance
   * @private
   */
  _hasExceptionalPerformance() {
    return this.qualityScore >= 4.8 && 
           this.completionRate >= 0.85 && 
           this.studentSatisfaction >= 4.7;
  }

  /**
   * 🏗️ Calculate Bonus Rate
   * @private
   */
  _calculateBonusRate(targetTier, componentScores) {
    const baseBonus = TIER_CONFIG[targetTier.tier].baseBonus;
    
    // 🎯 Performance-based bonus adjustments
    let performanceBonus = 0;

    // Quality excellence bonus
    if (componentScores.raw.qualityScore >= 0.95) {
      performanceBonus += 0.05;
    }

    // Completion excellence bonus
    if (componentScores.raw.completionRate >= 0.9) {
      performanceBonus += 0.03;
    }

    // Response time excellence bonus
    if (componentScores.raw.responseTime >= 0.9) {
      performanceBonus += 0.02;
    }

    return Math.min(baseBonus + performanceBonus, 0.2); // Cap at 20%
  }

  /**
   * 🏗️ Calculate Capacity
   * @private
   */
  async _calculateCapacity(targetTier, metrics) {
    const baseCapacity = TIER_CONFIG[targetTier.tier].studentCapacity;
    
    if (baseCapacity === null) {
      // 🎯 Master tier - dynamic capacity based on performance
      const performanceMultiplier = Math.min(
        (this.qualityScore / 5) * (this.completionRate / 0.8) * 2,
        3 // Maximum 3x base capacity
      );
      
      const dynamicCapacity = Math.floor(50 * performanceMultiplier); // Start with 50 as base
      
      return {
        maxCapacity: dynamicCapacity,
        utilization: metrics.activeStudents / dynamicCapacity
      };
    }

    return {
      maxCapacity: baseCapacity,
      utilization: metrics.activeStudents / baseCapacity
    };
  }

  /**
   * 🎯 Apply Tier Changes
   * @param {Object} calculationResult - Result from calculateTier
   * @returns {Promise<ExpertTier>} Updated instance
   */
  async applyTierChanges(calculationResult) {
    const transaction = await this.constructor.sequelize.transaction();
    
    try {
      // 🏗️ Save previous state
      this.previousTier = this.currentTier;
      this.currentTier = calculationResult.targetTier;
      this.tierScore = calculationResult.tierScore;
      this.currentBonusRate = calculationResult.bonusRate;
      this.maxCapacity = calculationResult.maxCapacity;
      this.capacityUtilization = calculationResult.utilization;
      this.lastTierChange = new Date();
      this.tierChangeReason = calculationResult.changeReason;
      this.nextEvaluationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // 🏗️ Update quality metrics from calculation
      if (calculationResult.metrics) {
        this.qualityScore = calculationResult.metrics.qualityScore;
        this.completionRate = calculationResult.metrics.completionRate;
        this.averageResponseTime = calculationResult.metrics.responseTime;
        this.studentSatisfaction = calculationResult.metrics.studentSatisfaction;
        this.certificationRate = calculationResult.metrics.certificationRate;
      }

      await this.save({ transaction });

      // 🏗️ Create tier history record
      await this.constructor.sequelize.models.TierHistory.create({
        expertTierId: this.id,
        fromTier: this.previousTier,
        toTier: this.currentTier,
        changeType: calculationResult.shouldChange ? calculationResult.tierChange?.type : 'MAINTENANCE',
        reason: calculationResult.changeReason,
        tierScore: this.tierScore,
        bonusRate: this.currentBonusRate,
        metadata: {
          calculationResult,
          automated: true
        }
      }, { transaction });

      await transaction.commit();

      // 🏗️ Emit tier change event
      this.constructor.emit('tier.changed', {
        expertId: this.expertId,
        fromTier: this.previousTier,
        toTier: this.currentTier,
        changeType: calculationResult.shouldChange ? calculationResult.tierChange?.type : 'MAINTENANCE',
        bonusRate: this.currentBonusRate,
        maxCapacity: this.maxCapacity
      });

      return this;

    } catch (error) {
      await transaction.rollback();
      throw new Error(`Failed to apply tier changes: ${error.message}`);
    }
  }

  /**
   * 🎯 Get Tier Benefits Summary
   * @returns {Object} Tier benefits information
   */
  getTierBenefits() {
    const config = TIER_CONFIG[this.currentTier];
    
    return {
      tier: this.currentTier,
      badge: config.badge,
      color: config.color,
      studentCapacity: this.maxCapacity,
      baseEarningRate: 999, // Base 999 ETB per student
      bonusRate: this.currentBonusRate,
      totalEarningRate: 999 * (1 + this.currentBonusRate),
      benefits: [
        `Up to ${this.maxCapacity === null ? 'unlimited' : this.maxCapacity} students`,
        `${(this.currentBonusRate * 100).toFixed(1)}% quality bonus`,
        `${config.badge} ${this.currentTier} tier badge`,
        'Priority student matching',
        'Advanced training tools'
      ],
      requirements: this._getNextTierRequirements()
    };
  }

  /**
   * 🏗️ Get Next Tier Requirements
   * @private
   */
  _getNextTierRequirements() {
    const currentLevel = TIER_CONFIG[this.currentTier].level;
    const nextTier = Object.entries(TIER_CONFIG).find(
      ([, config]) => config.level === currentLevel + 1
    );

    if (!nextTier) {
      return { isMaxTier: true };
    }

    const [nextTierName, nextConfig] = nextTier;
    
    return {
      nextTier: nextTierName,
      requirements: nextConfig.requirements,
      qualityScore: nextConfig.minQualityScore,
      completionRate: nextConfig.minCompletionRate,
      responseTime: nextConfig.maxResponseTime,
      currentGap: this._calculateTierGap(nextConfig)
    };
  }

  /**
   * 🏗️ Calculate Tier Gap
   * @private
   */
  _calculateTierGap(nextConfig) {
    const gap = {};

    if (this.qualityScore < nextConfig.minQualityScore) {
      gap.qualityScore = nextConfig.minQualityScore - this.qualityScore;
    }

    if (this.completionRate < nextConfig.minCompletionRate) {
      gap.completionRate = nextConfig.minCompletionRate - this.completionRate;
    }

    if (this.averageResponseTime > nextConfig.maxResponseTime) {
      gap.responseTime = this.averageResponseTime - nextConfig.maxResponseTime;
    }

    if (this.totalStudents < nextConfig.requirements.minStudents) {
      gap.students = nextConfig.requirements.minStudents - this.totalStudents;
    }

    if (this.monthsActive < nextConfig.requirements.minMonthsActive) {
      gap.months = nextConfig.requirements.minMonthsActive - this.monthsActive;
    }

    if (this.completedCertifications < nextConfig.requirements.minCertifications) {
      gap.certifications = nextConfig.requirements.minCertifications - this.completedCertifications;
    }

    return gap;
  }

  /**
   * 🎯 Check Capacity Availability
   * @returns {boolean} Whether expert can accept more students
   */
  canAcceptStudents() {
    if (this.maxCapacity === null) {
      return true; // Master tier - unlimited capacity
    }

    return this.activeStudents < this.maxCapacity;
  }

  /**
   * 🎯 Get Available Capacity
   * @returns {number} Number of available student slots
   */
  getAvailableCapacity() {
    if (this.maxCapacity === null) {
      return Infinity; // Master tier - unlimited
    }

    return Math.max(0, this.maxCapacity - this.activeStudents);
  }

  /**
   * 🎯 Update Active Student Count
   * @param {number} change - Change in active students
   * @returns {Promise<ExpertTier>} Updated instance
   */
  async updateActiveStudents(change) {
    const newCount = this.activeStudents + change;
    
    if (newCount < 0) {
      throw new Error('Active students cannot be negative');
    }

    if (this.maxCapacity !== null && newCount > this.maxCapacity) {
      throw new Error('Cannot exceed maximum capacity');
    }

    this.activeStudents = newCount;
    this.capacityUtilization = this.maxCapacity === null ? 0 : newCount / this.maxCapacity;
    
    return await this.save();
  }

  /**
   * 🎯 Static Method: Bulk Tier Evaluation
   * @param {Array} expertIds - Array of expert IDs to evaluate
   * @returns {Promise<Object>} Bulk evaluation results
   */
  static async bulkEvaluateTiers(expertIds) {
    const results = {
      total: expertIds.length,
      processed: 0,
      promotions: 0,
      demotions: 0,
      unchanged: 0,
      errors: 0,
      details: []
    };

    for (const expertId of expertIds) {
      try {
        const expertTier = await ExpertTier.findOne({
          where: { expertId, isActive: true },
          include: ['expert']
        });

        if (!expertTier) {
          results.errors++;
          results.details.push({
            expertId,
            status: 'ERROR',
            error: 'Expert tier record not found'
          });
          continue;
        }

        // 🏗️ Get current metrics (in production, this would come from metrics service)
        const metrics = await expertTier._getCurrentMetrics();
        
        const calculation = await expertTier.calculateTier(metrics);
        
        if (calculation.shouldChange) {
          await expertTier.applyTierChanges(calculation);
          
          if (calculation.tierChange?.type === 'PROMOTION') {
            results.promotions++;
          } else {
            results.demotions++;
          }
        } else {
          results.unchanged++;
        }

        results.processed++;
        results.details.push({
          expertId,
          status: 'SUCCESS',
          fromTier: expertTier.previousTier,
          toTier: expertTier.currentTier,
          changeType: calculation.tierChange?.type
        });

      } catch (error) {
        results.errors++;
        results.details.push({
          expertId,
          status: 'ERROR',
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 🏗️ Get Current Metrics (Mock - would integrate with metrics service)
   * @private
   */
  async _getCurrentMetrics() {
    // In production, this would query the metrics service
    // For now, return current values with some variation
    return {
      qualityScore: this.qualityScore,
      completionRate: this.completionRate,
      responseTime: this.averageResponseTime,
      studentSatisfaction: this.studentSatisfaction,
      certificationRate: this.certificationRate,
      totalStudents: this.totalStudents,
      activeStudents: this.activeStudents,
      completedCertifications: this.completedCertifications,
      monthsActive: this.monthsActive
    };
  }

  /**
   * 🎯 Static Method: Find Experts by Tier with Capacity
   * @param {string} tier - Tier to search for
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Available experts
   */
  static async findAvailableByTier(tier, limit = 10) {
    return await ExpertTier.findAll({
      where: {
        currentTier: tier,
        isActive: true,
        [Op.or]: [
          { maxCapacity: null }, // Master tier
          { activeStudents: { [Op.lt]: this.sequelize.col('maxCapacity') } }
        ]
      },
      include: [{
        association: 'expert',
        where: { status: 'ACTIVE' },
        attributes: ['id', 'name', 'skills', 'profilePicture']
      }],
      order: [
        ['tierScore', 'DESC'],
        ['qualityScore', 'DESC']
      ],
      limit
    });
  }
}

// 🏗️ Enterprise Event Emitter
const EventEmitter = require('events');
ExpertTier.events = new EventEmitter();

// 🏗️ Static event aliases
ExpertTier.emit = (event, data) => ExpertTier.events.emit(event, data);
ExpertTier.on = (event, handler) => ExpertTier.events.on(event, handler);

module.exports = {
  ExpertTier,
  TIER_CONFIG,
  TIER_CALCULATION_WEIGHTS
};