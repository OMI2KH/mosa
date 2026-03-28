// constants/payment.js

/**
 * 🎯 ENTERPRISE PAYMENT CONSTANTS & CONFIGURATION
 * Production-ready payment configuration for Mosa Forge
 * Features: Revenue splits, payout schedules, payment gateways, financial compliance
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const PAYMENT_CONFIG = {
  // 🎯 BUNDLE PRICING & REVENUE DISTRIBUTION
  BUNDLE: {
    BASE_PRICE: 1999, // ETB
    CURRENCY: 'ETB',
    
    // 💰 REVENUE SPLIT CONFIGURATION (1000/999)
    REVENUE_SPLIT: {
      MOSA_PLATFORM: {
        AMOUNT: 1000,
        PERCENTAGE: 50.03,
        ALLOCATION: {
          PLATFORM_OPERATIONS: 400,   // 40% of platform share
          QUALITY_ENFORCEMENT: 300,   // 30% of platform share  
          PROFIT_GROWTH: 300          // 30% of platform share
        }
      },
      EXPERT_EARNINGS: {
        BASE_AMOUNT: 999,
        PERCENTAGE: 49.97,
        
        // 🗓️ PAYOUT SCHEDULE (333/333/333)
        PAYOUT_SCHEDULE: {
          UPFRONT: {
            AMOUNT: 333,
            TRIGGER: 'COURSE_START',
            DESCRIPTION: 'Initial payment upon course commencement',
            CONDITIONS: ['ENROLLMENT_CONFIRMED', 'STUDENT_ACTIVE']
          },
          MILESTONE: {
            AMOUNT: 333,
            TRIGGER: '75_PERCENT_COMPLETION',
            DESCRIPTION: 'Mid-course milestone achievement',
            CONDITIONS: ['PROGRESS_75_PERCENT', 'QUALITY_SCORE_MAINTAINED']
          },
          COMPLETION: {
            AMOUNT: 333,
            TRIGGER: 'CERTIFICATION_APPROVED',
            DESCRIPTION: 'Final payment upon certification',
            CONDITIONS: ['CERTIFICATION_APPROVED', 'YACHI_VERIFICATION_COMPLETE']
          }
        }
      }
    }
  },

  // 🏆 EXPERT PERFORMANCE BONUSES (Up to 20%)
  PERFORMANCE_BONUSES: {
    MASTER_TIER: {
      MIN_RATING: 4.7,
      MIN_COMPLETION_RATE: 0.8, // 80%
      BONUS_PERCENTAGE: 0.20,   // 20%
      BONUS_AMOUNT: 199.8,      // 999 * 0.20
      TOTAL_EARNINGS: 1198.8    // 999 + 199.8
    },
    SENIOR_TIER: {
      MIN_RATING: 4.3,
      MIN_COMPLETION_RATE: 0.75, // 75%
      BONUS_PERCENTAGE: 0.10,    // 10%
      BONUS_AMOUNT: 99.9,        // 999 * 0.10
      TOTAL_EARNINGS: 1098.9     // 999 + 99.9
    },
    STANDARD_TIER: {
      MIN_RATING: 4.0,
      MIN_COMPLETION_RATE: 0.70, // 70%
      BONUS_PERCENTAGE: 0.0,     // 0%
      BONUS_AMOUNT: 0,
      TOTAL_EARNINGS: 999
    },
    PENALTIES: {
      DEVELOPING_TIER: {
        MAX_RATING: 3.9,
        PENALTY_PERCENTAGE: 0.10, // -10%
        PENALTY_AMOUNT: 99.9,
        TOTAL_EARNINGS: 899.1     // 999 - 99.9
      },
      PROBATION_TIER: {
        MAX_RATING: 3.4,
        PENALTY_PERCENTAGE: 0.20, // -20%
        PENALTY_AMOUNT: 199.8,
        TOTAL_EARNINGS: 799.2     // 999 - 199.8
      }
    }
  },

  // 🌐 PAYMENT GATEWAY CONFIGURATION
  PAYMENT_GATEWAYS: {
    TELEBIRR: {
      NAME: 'Telebirr',
      PROVIDER: 'ETHIO_TELECOM',
      SUPPORTED_CURRENCIES: ['ETB'],
      TRANSACTION_LIMITS: {
        MIN: 1,
        MAX: 50000,
        DAILY_LIMIT: 100000
      },
      FEES: {
        PERCENTAGE: 0.015, // 1.5%
        FIXED: 2,          // 2 ETB
        CALCULATION: (amount) => Math.max(amount * 0.015, 2)
      },
      WEBHOOK_ENDPOINTS: {
        SUCCESS: '/api/webhooks/telebirr/success',
        FAILURE: '/api/webhooks/telebirr/failure',
        NOTIFICATION: '/api/webhooks/telebirr/notification'
      },
      CONFIG: {
        API_BASE_URL: process.env.TELEBIRR_API_URL || 'https://api.telebirr.et',
        MERCHANT_CODE: process.env.TELEBIRR_MERCHANT_CODE,
        PUBLIC_KEY: process.env.TELEBIRR_PUBLIC_KEY,
        PRIVATE_KEY: process.env.TELEBIRR_PRIVATE_KEY
      }
    },

    CBE_BIRR: {
      NAME: 'CBE Birr',
      PROVIDER: 'COMMERCIAL_BANK_OF_ETHIOPIA',
      SUPPORTED_CURRENCIES: ['ETB', 'USD'],
      TRANSACTION_LIMITS: {
        MIN: 1,
        MAX: 100000,
        DAILY_LIMIT: 500000
      },
      FEES: {
        PERCENTAGE: 0.02,  // 2%
        FIXED: 5,          // 5 ETB
        CALCULATION: (amount) => Math.max(amount * 0.02, 5)
      },
      WEBHOOK_ENDPOINTS: {
        SUCCESS: '/api/webhooks/cbe-birr/success',
        FAILURE: '/api/webhooks/cbe-birr/failure',
        NOTIFICATION: '/api/webhooks/cbe-birr/notification'
      },
      CONFIG: {
        API_BASE_URL: process.env.CBE_BIRR_API_URL || 'https://api.cbe-birr.et',
        MERCHANT_ID: process.env.CBE_BIRR_MERCHANT_ID,
        API_KEY: process.env.CBE_BIRR_API_KEY,
        SECRET_KEY: process.env.CBE_BIRR_SECRET_KEY
      }
    },

    HELLO_CASH: {
      NAME: 'HelloCash',
      PROVIDER: 'BANK_OF_ABYSSINIA',
      SUPPORTED_CURRENCIES: ['ETB'],
      TRANSACTION_LIMITS: {
        MIN: 1,
        MAX: 25000,
        DAILY_LIMIT: 50000
      },
      FEES: {
        PERCENTAGE: 0.01,  // 1%
        FIXED: 1,          // 1 ETB
        CALCULATION: (amount) => Math.max(amount * 0.01, 1)
      },
      CONFIG: {
        API_BASE_URL: process.env.HELLO_CASH_API_URL || 'https://api.hellocash.et',
        CLIENT_ID: process.env.HELLO_CASH_CLIENT_ID,
        CLIENT_SECRET: process.env.HELLO_CASH_CLIENT_SECRET
      }
    }
  },

  // 🗓️ PAYMENT SCHEDULING & TIMELINES
  SCHEDULING: {
    PAYOUT_WINDOWS: {
      EXPERT_PAYOUTS: {
        FREQUENCY: 'WEEKLY',
        PROCESSING_DAY: 'FRIDAY',
        CUTOFF_TIME: '23:59 EAT', // East Africa Time
        SETTLEMENT_DAYS: 3
      },
      PLATFORM_REVENUE: {
        FREQUENCY: 'MONTHLY',
        PROCESSING_DAY: 'LAST_BUSINESS_DAY',
        SETTLEMENT_DAYS: 5
      }
    },

    REFUND_TIMELINES: {
      COOLING_PERIOD: {
        DURATION_DAYS: 7,
        REFUND_PERCENTAGE: 1.0, // 100% refund
        CONDITIONS: ['NO_SESSIONS_ATTENDED', 'WITHIN_7_DAYS']
      },
      PRORATED_REFUNDS: {
        CALCULATION_BASIS: 'SESSIONS_COMPLETED',
        MINIMUM_REFUND: 500, // ETB
        ADMIN_APPROVAL_REQUIRED: true
      }
    },

    PAYMENT_EXPIRY: {
      BUNDLE_VALIDITY: {
        DURATION_MONTHS: 5,
        AUTO_CANCEL: true,
        GRACE_PERIOD_DAYS: 15
      }
    }
  },

  // 💳 INSTALLMENT PLANS CONFIGURATION
  INSTALLMENT_PLANS: {
    ENABLED: true,
    PLANS: {
      TWO_MONTH: {
        NAME: '2-Month Installment',
        INSTALLMENTS: 2,
        DOWN_PAYMENT: 1000, // ETB
        MONTHLY_PAYMENT: 999, // ETB
        TOTAL_AMOUNT: 1999,
        INTEREST_RATE: 0.0,
        PROCESSING_FEE: 50 // ETB
      },
      THREE_MONTH: {
        NAME: '3-Month Installment',
        INSTALLMENTS: 3,
        DOWN_PAYMENT: 700, // ETB
        MONTHLY_PAYMENT: 666, // ETB
        TOTAL_AMOUNT: 1999,
        INTEREST_RATE: 0.0,
        PROCESSING_FEE: 75 // ETB
      },
      FOUR_MONTH: {
        NAME: '4-Month Installment',
        INSTALLMENTS: 4,
        DOWN_PAYMENT: 500, // ETB
        MONTHLY_PAYMENT: 500, // ETB
        TOTAL_AMOUNT: 2000, // Rounded
        INTEREST_RATE: 0.0,
        PROCESSING_FEE: 100 // ETB
      }
    },
    ELIGIBILITY: {
      MIN_FAYDA_AGE: 18,
      CREDIT_CHECK_REQUIRED: false,
      MAX_ACTIVE_INSTALLMENTS: 2
    }
  },

  // 🏦 FINANCIAL COMPLIANCE & REGULATIONS
  COMPLIANCE: {
    ETHIOPIA: {
      TAX: {
        VAT_RATE: 0.15, // 15%
        WITHHOLDING_TAX: 0.02, // 2%
        TIN_REQUIRED: true
      },
      FINANCIAL_REGULATIONS: {
        MAX_TRANSACTION_LIMIT: 50000, // ETB
        DAILY_TRANSACTION_LIMIT: 100000, // ETB
        REPORTING_THRESHOLD: 10000 // ETB
      },
      DATA_PROTECTION: {
        PCI_DSS_COMPLIANT: true,
        LOCAL_DATA_STORAGE: true,
        ENCRYPTION_REQUIRED: true
      }
    }
  },

  // 📊 FINANCIAL REPORTING & ANALYTICS
  REPORTING: {
    REVENUE_CATEGORIES: {
      BUNDLE_SALES: 'BUNDLE_SALES',
      INSTALLMENT_FEES: 'INSTALLMENT_FEES',
      LATE_FEES: 'LATE_FEES',
      REFUNDS: 'REFUNDS',
      CHARGEBACKS: 'CHARGEBACKS'
    },

    EXPENSE_CATEGORIES: {
      PAYMENT_GATEWAY_FEES: 'PAYMENT_GATEWAY_FEES',
      EXPERT_PAYOUTS: 'EXPERT_PAYOUTS',
      PLATFORM_OPERATIONS: 'PLATFORM_OPERATIONS',
      QUALITY_ENFORCEMENT: 'QUALITY_ENFORCEMENT',
      TAXES: 'TAXES'
    },

    DASHBOARD_METRICS: {
      DAILY_REVENUE: 'DAILY_REVENUE',
      MONTHLY_RECURRING_REVENUE: 'MRR',
      EXPERT_EARNINGS: 'EXPERT_EARNINGS',
      REFUND_RATE: 'REFUND_RATE',
      PAYMENT_SUCCESS_RATE: 'PAYMENT_SUCCESS_RATE'
    }
  },

  // 🔐 SECURITY & FRAUD PREVENTION
  SECURITY: {
    FRAUD_DETECTION: {
      MAX_ATTEMPTS_PER_HOUR: 5,
      SUSPICIOUS_AMOUNT_THRESHOLD: 10000, // ETB
      GEO_LOCATION_CHECK: true,
      DEVICE_FINGERPRINTING: true
    },

    ENCRYPTION: {
      ALGORITHM: 'aes-256-gcm',
      KEY_ROTATION_DAYS: 90,
      SALT_ROUNDS: 12
    },

    AUDIT: {
      LOG_ALL_TRANSACTIONS: true,
      RETENTION_PERIOD_DAYS: 1825, // 5 years
      REAL_TIME_ALERTS: true
    }
  },

  // 🎯 BUSINESS RULES & VALIDATION
  BUSINESS_RULES: {
    MINIMUM_PAYOUT_AMOUNT: 100, // ETB
    MAX_CONCURRENT_ENROLLMENTS: 3,
    PAYMENT_RETRY_ATTEMPTS: 3,
    AUTO_CANCEL_DAYS: 30,

    QUALITY_THRESHOLDS: {
      MIN_EXPERT_RATING: 3.5,
      MIN_COMPLETION_RATE: 0.6, // 60%
      MAX_RESPONSE_TIME_HOURS: 48
    }
  },

  // 🔄 WEBHOOK & NOTIFICATION CONFIG
  WEBHOOKS: {
    EVENTS: {
      PAYMENT_SUCCESS: 'payment.success',
      PAYMENT_FAILED: 'payment.failed',
      PAYMENT_REFUNDED: 'payment.refunded',
      EXPERT_PAYOUT_PROCESSED: 'expert.payout_processed',
      INSTALLMENT_DUE: 'installment.due'
    },

    RETRY_CONFIG: {
      MAX_RETRIES: 3,
      RETRY_DELAY_MS: 5000,
      TIMEOUT_MS: 10000
    }
  },

  // 🎨 FRONTEND CONFIGURATION
  UI: {
    CURRENCY_DISPLAY: {
      SYMBOL: 'ETB',
      LOCALE: 'am-ET',
      FORMAT: '{{amount}} ETB',
      DECIMALS: 0
    },

    PAYMENT_METHODS: {
      ORDER: ['TELEBIRR', 'CBE_BIRR', 'HELLO_CASH', 'INSTALLMENT'],
      DEFAULT: 'TELEBIRR'
    },

    INSTALLMENT_DISPLAY: {
      SHOW_MONTHLY_PAYMENT: true,
      HIGHLIGHT_SAVINGS: false,
      SHOW_PROCESSING_FEE: true
    }
  }
};

// 🎯 UTILITY FUNCTIONS
class PaymentCalculator {
  /**
   * Calculate platform revenue after gateway fees
   */
  static calculateNetRevenue(grossAmount, paymentMethod) {
    const gateway = PAYMENT_CONFIG.PAYMENT_GATEWAYS[paymentMethod];
    if (!gateway) {
      throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }

    const fee = gateway.FEES.CALCULATION(grossAmount);
    return grossAmount - fee;
  }

  /**
   * Calculate expert payout with performance bonus
   */
  static calculateExpertPayout(baseAmount, expertTier, completionRate) {
    const bonusConfig = PAYMENT_CONFIG.PERFORMANCE_BONUSES[expertTier];
    
    if (!bonusConfig) {
      throw new Error(`Invalid expert tier: ${expertTier}`);
    }

    // Check if expert qualifies for bonus
    const qualifiesForBonus = completionRate >= bonusConfig.MIN_COMPLETION_RATE;
    const bonusAmount = qualifiesForBonus ? baseAmount * bonusConfig.BONUS_PERCENTAGE : 0;

    return {
      baseAmount,
      bonusAmount,
      totalAmount: baseAmount + bonusAmount,
      qualifiesForBonus,
      bonusPercentage: bonusConfig.BONUS_PERCENTAGE
    };
  }

  /**
   * Calculate installment plan breakdown
   */
  static calculateInstallmentPlan(planName, bundlePrice = 1999) {
    const plan = PAYMENT_CONFIG.INSTALLMENT_PLANS.PLANS[planName];
    if (!plan) {
      throw new Error(`Invalid installment plan: ${planName}`);
    }

    const totalWithFees = plan.TOTAL_AMOUNT + plan.PROCESSING_FEE;
    const remainingAmount = totalWithFees - plan.DOWN_PAYMENT;
    const monthlyPayment = remainingAmount / (plan.INSTALLMENTS - 1);

    return {
      planName: plan.NAME,
      downPayment: plan.DOWN_PAYMENT,
      monthlyPayment: Math.ceil(monthlyPayment),
      totalAmount: totalWithFees,
      processingFee: plan.PROCESSING_FEE,
      installments: plan.INSTALLMENTS,
      schedule: this.generatePaymentSchedule(plan.DOWN_PAYMENT, monthlyPayment, plan.INSTALLMENTS)
    };
  }

  /**
   * Generate payment schedule for installments
   */
  static generatePaymentSchedule(downPayment, monthlyPayment, installments) {
    const schedule = [];
    const today = new Date();

    // Down payment
    schedule.push({
      installment: 1,
      amount: downPayment,
      dueDate: today,
      type: 'DOWN_PAYMENT'
    });

    // Monthly payments
    for (let i = 2; i <= installments; i++) {
      const dueDate = new Date(today);
      dueDate.setMonth(dueDate.getMonth() + (i - 1));

      schedule.push({
        installment: i,
        amount: monthlyPayment,
        dueDate,
        type: 'MONTHLY_PAYMENT'
      });
    }

    return schedule;
  }

  /**
   * Calculate refund amount based on progress
   */
  static calculateRefundAmount(originalAmount, sessionsCompleted, totalSessions, coolingPeriod = false) {
    if (coolingPeriod) {
      return originalAmount; // 100% refund during cooling period
    }

    const completionRatio = sessionsCompleted / totalSessions;
    const refundPercentage = 1 - completionRatio;
    const calculatedRefund = originalAmount * refundPercentage;

    // Ensure minimum refund amount
    return Math.max(calculatedRefund, PAYMENT_CONFIG.SCHEDULING.REFUND_TIMELINES.PRORATED_REFUNDS.MINIMUM_REFUND);
  }
}

// 🎯 EXPORT CONFIGURATION
module.exports = {
  PAYMENT_CONFIG,
  PaymentCalculator,
  
  // Common constants for easy access
  BUNDLE_PRICE: PAYMENT_CONFIG.BUNDLE.BASE_PRICE,
  MOSA_SHARE: PAYMENT_CONFIG.BUNDLE.REVENUE_SPLIT.MOSA_PLATFORM.AMOUNT,
  EXPERT_BASE_EARNINGS: PAYMENT_CONFIG.BUNDLE.REVENUE_SPLIT.EXPERT_EARNINGS.BASE_AMOUNT,
  PAYOUT_TRIGGERS: PAYMENT_CONFIG.BUNDLE.REVENUE_SPLIT.EXPERT_EARNINGS.PAYOUT_SCHEDULE,
  
  // Payment gateway constants
  GATEWAYS: Object.keys(PAYMENT_CONFIG.PAYMENT_GATEWAYS),
  DEFAULT_GATEWAY: 'TELEBIRR',
  
  // Tier constants
  EXPERT_TIERS: {
    MASTER: 'MASTER_TIER',
    SENIOR: 'SENIOR_TIER', 
    STANDARD: 'STANDARD_TIER',
    DEVELOPING: 'DEVELOPING_TIER',
    PROBATION: 'PROBATION_TIER'
  }
};