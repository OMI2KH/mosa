// config/payment-config.js

/**
 * 💰 ENTERPRISE PAYMENT CONFIGURATION
 * Production-ready payment configuration for Mosa Forge
 * Features: 1000/999 revenue split, payout scheduling, quality bonuses
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const Redis = require('ioredis');
const { Logger } = require('../utils/logger');
const { PrismaClient } = require('@prisma/client');

class PaymentConfig extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('PaymentConfig');
    
    // Initialize configuration
    this.config = this.loadDefaultConfig();
    this.initialize();
  }

  /**
   * 🎯 LOAD DEFAULT PAYMENT CONFIGURATION
   */
  loadDefaultConfig() {
    return {
      // 💵 BUNDLE PRICING CONFIGURATION
      bundle: {
        price: 1999, // 1,999 ETB
        currency: 'ETB',
        description: 'Mosa Forge All-Inclusive Training Bundle',
        includes: [
          'Mindset Foundation (FREE)',
          'Theory Mastery (2 Months)',
          'Hands-on Training (2 Months)',
          'Mosa Enterprise Certificate',
          'Yachi Platform Verification',
          'Lifetime Community Access'
        ]
      },

      // 💰 REVENUE DISTRIBUTION - 1000/999 Split
      revenueSplit: {
        mosaPlatform: {
          amount: 1000, // 1,000 ETB
          percentage: 50.03,
          allocation: {
            platformOperations: 400,   // 40%
            qualityEnforcement: 300,    // 30%
            profitGrowth: 300           // 30%
          }
        },
        expertEarnings: {
          baseAmount: 999,  // 999 ETB
          percentage: 49.97,
          payoutSchedule: {
            upfront: {
              amount: 333,  // 33.3%
              trigger: 'COURSE_START',
              description: 'Course commencement payment'
            },
            milestone: {
              amount: 333,  // 33.3%
              trigger: '75_PERCENT_COMPLETION',
              description: '75% training completion milestone'
            },
            completion: {
              amount: 333,  // 33.3%
              trigger: 'CERTIFICATION_APPROVED',
              description: 'Final certification payment'
            }
          }
        }
      },

      // 🏆 QUALITY BONUS SYSTEM
      qualityBonuses: {
        enabled: true,
        calculationMethod: 'TIER_BASED',
        tiers: {
          master: {
            minRating: 4.7,
            minCompletionRate: 0.8,
            bonusPercentage: 0.20,  // 20%
            bonusAmount: 199.8,     // 999 * 0.20
            totalEarnings: 1198.8   // 999 + 199.8
          },
          senior: {
            minRating: 4.3,
            minCompletionRate: 0.75,
            bonusPercentage: 0.10,  // 10%
            bonusAmount: 99.9,      // 999 * 0.10
            totalEarnings: 1098.9   // 999 + 99.9
          },
          standard: {
            minRating: 4.0,
            minCompletionRate: 0.70,
            bonusPercentage: 0.00,  // 0%
            bonusAmount: 0,
            totalEarnings: 999
          },
          developing: {
            minRating: 3.5,
            minCompletionRate: 0.65,
            bonusPercentage: -0.10, // -10% penalty
            penaltyAmount: 99.9,
            totalEarnings: 899.1    // 999 - 99.9
          },
          probation: {
            minRating: 3.0,
            minCompletionRate: 0.60,
            bonusPercentage: -0.20, // -20% penalty
            penaltyAmount: 199.8,
            totalEarnings: 799.2    // 999 - 199.8
          }
        }
      },

      // 💳 PAYMENT GATEWAY CONFIGURATION
      paymentGateways: {
        telebirr: {
          enabled: true,
          name: 'Telebirr',
          apiKey: process.env.TELEBIRR_API_KEY,
          secretKey: process.env.TELEBIRR_SECRET_KEY,
          baseUrl: process.env.TELEBIRR_BASE_URL,
          timeout: 30000,
          retryAttempts: 3
        },
        cbebirr: {
          enabled: true,
          name: 'CBE Birr',
          apiKey: process.env.CBEBIRR_API_KEY,
          secretKey: process.env.CBEBIRR_SECRET_KEY,
          baseUrl: process.env.CBEBIRR_BASE_URL,
          timeout: 30000,
          retryAttempts: 3
        }
      },

      // ⏰ PAYOUT SCHEDULING CONFIGURATION
      payoutSchedule: {
        processing: {
          frequency: 'DAILY', // DAILY, WEEKLY, MONTHLY
          time: '02:00', // 2:00 AM local time
          timezone: 'Africa/Addis_Ababa'
        },
        thresholds: {
          minimumPayout: 100, // 100 ETB minimum
          maximumPayout: 50000, // 50,000 ETB maximum per transaction
          autoProcess: true
        },
        methods: {
          bankTransfer: {
            enabled: true,
            processingDays: 1,
            fees: 0 // Currently no fees for bank transfers
          },
          mobileMoney: {
            enabled: true,
            processingDays: 0, // Instant
            fees: 0
          }
        }
      },

      // 🔄 REFUND POLICY CONFIGURATION
      refundPolicy: {
        coolingPeriod: {
          enabled: true,
          durationDays: 7,
          fullRefund: true
        },
        proratedRefunds: {
          enabled: true,
          calculation: 'TIME_BASED',
          minimumRetention: 500 // Minimum 500 ETB retained by platform
        },
        expertCompensation: {
          completedSessions: 'FULL_PAYMENT',
          partialSessions: 'PRORATED_PAYMENT',
          noSessions: 'NO_PAYMENT'
        }
      },

      // 📊 TAX CONFIGURATION
      taxConfiguration: {
        vat: {
          enabled: true,
          rate: 0.15, // 15% VAT
          includedInPrice: true
        },
        withholdingTax: {
          enabled: true,
          rate: 0.02, // 2% withholding tax for experts
          threshold: 1000 // Monthly threshold
        }
      },

      // 🚀 SCALING CONFIGURATION
      scaling: {
        bulkProcessing: {
          batchSize: 100,
          concurrency: 5,
          timeout: 300000 // 5 minutes
        },
        rateLimiting: {
          requestsPerMinute: 100,
          burstCapacity: 50
        }
      }
    };
  }

  /**
   * 🚀 INITIALIZE PAYMENT CONFIGURATION
   */
  async initialize() {
    try {
      await this.redis.ping();
      
      // Load environment-specific overrides
      await this.loadEnvironmentConfig();
      
      // Warm up configuration cache
      await this.warmUpCache();
      
      this.logger.info('Payment configuration initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize payment configuration', error);
      throw error;
    }
  }

  /**
   * 🔧 LOAD ENVIRONMENT-SPECIFIC CONFIGURATION
   */
  async loadEnvironmentConfig() {
    const env = process.env.NODE_ENV || 'development';
    
    try {
      const envConfig = await this.redis.get(`payment:config:${env}`);
      if (envConfig) {
        const parsedConfig = JSON.parse(envConfig);
        this.config = { ...this.config, ...parsedConfig };
        this.logger.debug(`Loaded ${env} environment configuration`);
      }
    } catch (error) {
      this.logger.warn(`No environment-specific configuration found for ${env}`);
    }
  }

  /**
   * 💰 CALCULATE REVENUE DISTRIBUTION
   */
  calculateRevenueDistribution(bundlePrice = 1999) {
    const distribution = {
      bundlePrice,
      mosaPlatform: {
        amount: Math.floor(bundlePrice * 0.5003), // 50.03%
        percentage: 50.03,
        allocation: {
          platformOperations: Math.floor(bundlePrice * 0.5003 * 0.4), // 40% of Mosa share
          qualityEnforcement: Math.floor(bundlePrice * 0.5003 * 0.3), // 30% of Mosa share
          profitGrowth: Math.floor(bundlePrice * 0.5003 * 0.3) // 30% of Mosa share
        }
      },
      expertEarnings: {
        baseAmount: Math.floor(bundlePrice * 0.4997), // 49.97%
        percentage: 49.97,
        payoutSchedule: {
          upfront: Math.floor(bundlePrice * 0.4997 / 3),
          milestone: Math.floor(bundlePrice * 0.4997 / 3),
          completion: Math.floor(bundlePrice * 0.4997 / 3)
        }
      }
    };

    // Validate total equals bundle price
    const total = distribution.mosaPlatform.amount + distribution.expertEarnings.baseAmount;
    if (total !== bundlePrice) {
      this.logger.warn(`Revenue distribution total (${total}) doesn't match bundle price (${bundlePrice})`);
    }

    return distribution;
  }

  /**
   * 🏆 CALCULATE QUALITY BONUS
   */
  calculateQualityBonus(expertTier, baseEarnings = 999) {
    const tierConfig = this.config.qualityBonuses.tiers[expertTier];
    
    if (!tierConfig) {
      this.logger.warn(`Invalid expert tier: ${expertTier}`);
      return {
        bonusAmount: 0,
        penaltyAmount: 0,
        totalEarnings: baseEarnings,
        tier: 'standard'
      };
    }

    const bonusAmount = tierConfig.bonusPercentage > 0 ? 
      Math.floor(baseEarnings * tierConfig.bonusPercentage) : 0;
    
    const penaltyAmount = tierConfig.bonusPercentage < 0 ? 
      Math.floor(baseEarnings * Math.abs(tierConfig.bonusPercentage)) : 0;

    const totalEarnings = tierConfig.bonusPercentage >= 0 ?
      baseEarnings + bonusAmount :
      baseEarnings - penaltyAmount;

    return {
      bonusAmount,
      penaltyAmount,
      totalEarnings,
      tier: expertTier,
      bonusPercentage: tierConfig.bonusPercentage
    };
  }

  /**
   * ⏰ GET PAYOUT SCHEDULE
   */
  getPayoutSchedule(enrollmentDate, expertTier = 'standard') {
    const enrollment = new Date(enrollmentDate);
    
    const schedule = {
      upfront: {
        amount: this.config.revenueSplit.expertEarnings.payoutSchedule.upfront.amount,
        dueDate: new Date(enrollment),
        status: 'PENDING',
        trigger: 'COURSE_START',
        description: 'Course commencement payment'
      },
      milestone: {
        amount: this.config.revenueSplit.expertEarnings.payoutSchedule.milestone.amount,
        dueDate: new Date(enrollment.getTime() + 60 * 24 * 60 * 60 * 1000), // +60 days
        status: 'PENDING',
        trigger: '75_PERCENT_COMPLETION',
        description: '75% training completion milestone'
      },
      completion: {
        amount: this.config.revenueSplit.expertEarnings.payoutSchedule.completion.amount,
        dueDate: new Date(enrollment.getTime() + 120 * 24 * 60 * 60 * 1000), // +120 days
        status: 'PENDING',
        trigger: 'CERTIFICATION_APPROVED',
        description: 'Final certification payment'
      }
    };

    // Apply quality bonus to completion payment
    const bonus = this.calculateQualityBonus(expertTier);
    if (bonus.bonusAmount > 0) {
      schedule.completion.bonusAmount = bonus.bonusAmount;
      schedule.completion.totalAmount = schedule.completion.amount + bonus.bonusAmount;
    }

    return schedule;
  }

  /**
   * 💳 GET PAYMENT GATEWAY CONFIG
   */
  getPaymentGatewayConfig(gatewayName) {
    const gateway = this.config.paymentGateways[gatewayName.toLowerCase()];
    
    if (!gateway) {
      throw new Error(`Payment gateway not found: ${gatewayName}`);
    }

    if (!gateway.enabled) {
      throw new Error(`Payment gateway disabled: ${gatewayName}`);
    }

    return {
      ...gateway,
      // Add sensitive data from environment variables
      apiKey: process.env[`${gatewayName.toUpperCase()}_API_KEY`],
      secretKey: process.env[`${gatewayName.toUpperCase()}_SECRET_KEY`]
    };
  }

  /**
   * 🔄 CALCULATE REFUND AMOUNT
   */
  calculateRefundAmount(paymentAmount, daysSincePurchase, sessionsCompleted) {
    const coolingPeriod = this.config.refundPolicy.coolingPeriod;
    
    // Full refund during cooling period
    if (coolingPeriod.enabled && daysSincePurchase <= coolingPeriod.durationDays) {
      return {
        refundAmount: paymentAmount,
        platformRetention: 0,
        expertCompensation: 0,
        reason: 'COOLING_PERIOD_REFUND'
      };
    }

    // Prorated refund calculation
    const totalSessions = 48; // Assuming 48 sessions in 4 months
    const sessionsRatio = sessionsCompleted / totalSessions;
    
    const platformRetention = Math.max(
      this.config.refundPolicy.proratedRefunds.minimumRetention,
      Math.floor(paymentAmount * sessionsRatio * 0.5) // 50% of used value
    );

    const expertCompensation = Math.floor(
      paymentAmount * sessionsRatio * 0.5 // 50% of used value for expert
    );

    const refundAmount = paymentAmount - platformRetention - expertCompensation;

    return {
      refundAmount: Math.max(0, refundAmount),
      platformRetention,
      expertCompensation,
      sessionsCompleted,
      totalSessions,
      reason: 'PRORATED_REFUND'
    };
  }

  /**
   * 📊 CALCULATE TAX COMPONENTS
   */
  calculateTaxComponents(amount, isExpertPayout = false) {
    const taxConfig = this.config.taxConfiguration;
    const components = {
      subtotal: amount,
      vat: 0,
      withholdingTax: 0,
      total: amount
    };

    // Calculate VAT (if applicable and included in price)
    if (taxConfig.vat.enabled && !isExpertPayout) {
      if (taxConfig.vat.includedInPrice) {
        // VAT is already included, calculate the net amount
        components.subtotal = Math.floor(amount / (1 + taxConfig.vat.rate));
        components.vat = amount - components.subtotal;
      } else {
        components.vat = Math.floor(amount * taxConfig.vat.rate);
        components.total = amount + components.vat;
      }
    }

    // Calculate withholding tax for expert payouts
    if (isExpertPayout && taxConfig.withholdingTax.enabled) {
      if (amount >= taxConfig.withholdingTax.threshold) {
        components.withholdingTax = Math.floor(amount * taxConfig.withholdingTax.rate);
        components.total = amount - components.withholdingTax;
      }
    }

    return components;
  }

  /**
   * 🔥 WARM UP CONFIGURATION CACHE
   */
  async warmUpCache() {
    try {
      const cacheKey = 'payment:config:current';
      await this.redis.setex(
        cacheKey, 
        3600, // 1 hour TTL
        JSON.stringify(this.config)
      );
      
      this.logger.debug('Payment configuration cached successfully');
    } catch (error) {
      this.logger.error('Failed to cache payment configuration', error);
    }
  }

  /**
   * ⚙️ UPDATE CONFIGURATION DYNAMICALLY
   */
  async updateConfiguration(newConfig, adminId) {
    try {
      // Validate new configuration
      await this.validateConfiguration(newConfig);

      // Merge with existing configuration
      this.config = { ...this.config, ...newConfig };

      // Update cache
      await this.warmUpCache();

      // Log configuration change
      await this.logConfigurationChange(adminId, newConfig);

      // Emit configuration updated event
      this.emit('configurationUpdated', { adminId, newConfig });

      this.logger.info('Payment configuration updated successfully', { adminId });

      return { success: true, message: 'Configuration updated successfully' };

    } catch (error) {
      this.logger.error('Failed to update payment configuration', error, { adminId });
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE CONFIGURATION
   */
  async validateConfiguration(config) {
    const errors = [];

    // Validate revenue split totals 100%
    if (config.revenueSplit) {
      const totalPercentage = 
        config.revenueSplit.mosaPlatform.percentage + 
        config.revenueSplit.expertEarnings.percentage;
      
      if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.push('Revenue split percentages must total 100%');
      }
    }

    // Validate bundle price is positive
    if (config.bundle && config.bundle.price <= 0) {
      errors.push('Bundle price must be positive');
    }

    // Validate quality bonus tiers
    if (config.qualityBonuses && config.qualityBonuses.tiers) {
      Object.entries(config.qualityBonuses.tiers).forEach(([tier, config]) => {
        if (config.minRating < 1 || config.minRating > 5) {
          errors.push(`Tier ${tier}: minRating must be between 1 and 5`);
        }
        if (config.minCompletionRate < 0 || config.minCompletionRate > 1) {
          errors.push(`Tier ${tier}: minCompletionRate must be between 0 and 1`);
        }
      });
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * 📝 LOG CONFIGURATION CHANGE
   */
  async logConfigurationChange(adminId, changes) {
    try {
      await this.prisma.configurationAudit.create({
        data: {
          adminId,
          module: 'PAYMENT_CONFIG',
          changes: JSON.stringify(changes),
          ipAddress: 'SYSTEM', // Would come from request in real scenario
          userAgent: 'PAYMENT_CONFIG_SERVICE'
        }
      });
    } catch (error) {
      this.logger.error('Failed to log configuration change', error);
    }
  }

  /**
   * 📈 GET CONFIGURATION ANALYTICS
   */
  async getConfigurationAnalytics() {
    const cacheKey = 'payment:config:analytics';
    
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const analytics = {
        revenueDistribution: this.calculateRevenueDistribution(),
        qualityTierDistribution: await this.getTierDistribution(),
        paymentGatewayPerformance: await this.getGatewayPerformance(),
        refundStatistics: await this.getRefundStatistics(),
        lastUpdated: new Date().toISOString()
      };

      // Cache for 15 minutes
      await this.redis.setex(cacheKey, 900, JSON.stringify(analytics));

      return analytics;

    } catch (error) {
      this.logger.error('Failed to get configuration analytics', error);
      throw error;
    }
  }

  /**
   * 📊 GET TIER DISTRIBUTION
   */
  async getTierDistribution() {
    try {
      const distribution = await this.prisma.expert.groupBy({
        by: ['currentTier'],
        _count: {
          id: true
        },
        where: {
          status: 'ACTIVE'
        }
      });

      return distribution.reduce((acc, item) => {
        acc[item.currentTier] = item._count.id;
        return acc;
      }, {});
    } catch (error) {
      this.logger.error('Failed to get tier distribution', error);
      return {};
    }
  }

  /**
   * 💳 GET GATEWAY PERFORMANCE
   */
  async getGatewayPerformance() {
    try {
      const performance = await this.prisma.payment.groupBy({
        by: ['gateway'],
        _count: {
          id: true
        },
        _avg: {
          processingTime: true
        },
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      });

      return performance;
    } catch (error) {
      this.logger.error('Failed to get gateway performance', error);
      return [];
    }
  }

  /**
   * 🔄 GET REFUND STATISTICS
   */
  async getRefundStatistics() {
    try {
      const statistics = await this.prisma.refund.aggregate({
        _count: { id: true },
        _sum: { amount: true },
        _avg: { amount: true },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      });

      return {
        totalRefunds: statistics._count.id,
        totalAmount: statistics._sum.amount || 0,
        averageAmount: statistics._avg.amount || 0
      };
    } catch (error) {
      this.logger.error('Failed to get refund statistics', error);
      return { totalRefunds: 0, totalAmount: 0, averageAmount: 0 };
    }
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Payment configuration resources cleaned up');
    } catch (error) {
      this.logger.error('Error during payment config cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new PaymentConfig();