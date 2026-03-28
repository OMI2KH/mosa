/**
 * 🎯 MOSA FORGE: Enterprise Payment Utilities
 * 
 * @module PaymentUtils
 * @description Enterprise-grade payment calculation, validation, and distribution utilities
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - 1,999 ETB bundle revenue distribution
 * - 1000/999 Mosa/Expert revenue split
 * - 333/333/333 payout scheduling
 * - Quality-based bonus calculations
 * - Telebirr & CBE Birr integration helpers
 * - Tax and compliance calculations
 */

const { createHash, randomBytes } = require('crypto');
const Big = require('big.js'); // Precision math for financial calculations

// 🏗️ Enterprise Constants
const PAYMENT_CONFIG = {
  BUNDLE_PRICE: new Big(1999),
  MOSA_REVENUE: new Big(1000),
  EXPERT_REVENUE: new Big(999),
  PAYOUT_SCHEDULE: [333, 333, 333],
  QUALITY_BONUS_RATES: {
    MASTER: 0.20, // +20%
    SENIOR: 0.10, // +10%
    STANDARD: 0.00, // Base
    DEVELOPING: -0.10, // -10%
    PROBATION: -0.20 // -20%
  },
  TAX_RATES: {
    VAT: new Big(0.15), // 15% VAT
    INCOME_TAX: new Big(0.0), // 0% for education (subject to verification)
    PLATFORM_FEE: new Big(0.0) // Included in revenue split
  },
  PAYMENT_GATEWAYS: {
    TELEBIRR: 'telebirr',
    CBE_BIRR: 'cbe_birr',
    BANK_TRANSFER: 'bank_transfer'
  }
};

const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
};

const PAYMENT_ERRORS = {
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  REVENUE_SPLIT_MISMATCH: 'REVENUE_SPLIT_MISMATCH',
  PAYOUT_SCHEDULE_INVALID: 'PAYOUT_SCHEDULE_INVALID',
  QUALITY_TIER_INVALID: 'QUALITY_TIER_INVALID',
  GATEWAY_UNAVAILABLE: 'GATEWAY_UNAVAILABLE',
  TAX_CALCULATION_ERROR: 'TAX_CALCULATION_ERROR'
};

/**
 * 🏗️ Enterprise Payment Utilities Class
 * @class PaymentUtils
 */
class PaymentUtils {
  constructor(options = {}) {
    this.config = {
      ...PAYMENT_CONFIG,
      ...options
    };

    // 🏗️ Initialize precision math
    Big.DP = 2; // 2 decimal places for currency
    Big.RM = Big.roundHalfUp; // Banker's rounding

    // 🏗️ Cache for frequent calculations
    this.cache = new Map();
    this._initializeCache();
  }

  /**
   * 🏗️ Initialize Calculation Cache
   * @private
   */
  _initializeCache() {
    // Pre-calculate common revenue splits
    this.cache.set('bundle_price', this.config.BUNDLE_PRICE);
    this.cache.set('mosa_revenue', this.config.MOSA_REVENUE);
    this.cache.set('expert_revenue', this.config.EXPERT_REVENUE);
  }

  /**
   * 🎯 VALIDATE BUNDLE PAYMENT
   * @param {Object} paymentData - Payment information
   * @returns {Object} Validation result
   */
  validateBundlePayment(paymentData) {
    const validationId = this._generateValidationId(paymentData);
    
    try {
      // 🏗️ Comprehensive payment validation
      const validations = [
        this._validatePaymentAmount(paymentData.amount),
        this._validateRevenueSplit(paymentData.revenueSplit),
        this._validatePayoutSchedule(paymentData.payoutSchedule),
        this._validatePaymentGateway(paymentData.gateway),
        this._validateTaxCompliance(paymentData)
      ];

      const results = validations.map(validation => {
        try {
          return { valid: true, result: validation };
        } catch (error) {
          return { valid: false, error: error.message };
        }
      });

      const invalidResults = results.filter(result => !result.valid);
      
      if (invalidResults.length > 0) {
        throw new Error(`Payment validation failed: ${invalidResults.map(r => r.error).join(', ')}`);
      }

      return {
        valid: true,
        validationId,
        timestamp: new Date().toISOString(),
        details: {
          amount: paymentData.amount.toString(),
          revenueSplit: this._formatRevenueSplit(paymentData.revenueSplit),
          payoutSchedule: this._formatPayoutSchedule(paymentData.payoutSchedule),
          gateway: paymentData.gateway
        }
      };

    } catch (error) {
      return {
        valid: false,
        validationId,
        error: error.message,
        errorCode: this._getPaymentErrorCode(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 🎯 CALCULATE REVENUE DISTRIBUTION
   * @param {Object} params - Calculation parameters
   * @returns {Object} Revenue distribution breakdown
   */
  calculateRevenueDistribution(params) {
    const calculationId = this._generateCalculationId(params);
    
    try {
      const {
        bundlePrice = this.config.BUNDLE_PRICE,
        expertTier = 'STANDARD',
        studentCount = 1,
        includeTax = true
      } = params;

      // 🏗️ Validate input parameters
      this._validateCalculationParams({ bundlePrice, expertTier, studentCount });

      // 🏗️ Base revenue calculation
      const totalRevenue = new Big(bundlePrice).times(studentCount);
      const mosaBaseRevenue = this.config.MOSA_REVENUE.times(studentCount);
      const expertBaseRevenue = this.config.EXPERT_REVENUE.times(studentCount);

      // 🏗️ Quality bonus calculation
      const bonusRate = this.config.QUALITY_BONUS_RATES[expertTier];
      if (bonusRate === undefined) {
        throw new Error(`Invalid expert tier: ${expertTier}`);
      }

      const bonusAmount = expertBaseRevenue.times(bonusRate);
      const expertTotalRevenue = expertBaseRevenue.plus(bonusAmount);

      // 🏗️ Tax calculations
      let taxBreakdown = {};
      if (includeTax) {
        taxBreakdown = this._calculateTaxBreakdown({
          totalRevenue,
          mosaRevenue: mosaBaseRevenue,
          expertRevenue: expertTotalRevenue
        });
      }

      // 🏗️ Payout schedule
      const payoutSchedule = this._calculatePayoutSchedule(expertTotalRevenue, studentCount);

      // 🏗️ Comprehensive breakdown
      const distribution = {
        calculationId,
        timestamp: new Date().toISOString(),
        summary: {
          totalRevenue: totalRevenue.toNumber(),
          mosaRevenue: mosaBaseRevenue.toNumber(),
          expertRevenue: expertTotalRevenue.toNumber(),
          qualityBonus: bonusAmount.toNumber(),
          bonusRate: bonusRate * 100,
          studentCount
        },
        detailedBreakdown: {
          perStudent: {
            bundlePrice: bundlePrice.toNumber(),
            mosaShare: this.config.MOSA_REVENUE.toNumber(),
            expertBaseShare: this.config.EXPERT_REVENUE.toNumber(),
            expertBonus: bonusAmount.div(studentCount).toNumber(),
            expertTotal: expertTotalRevenue.div(studentCount).toNumber()
          },
          payoutSchedule: this._formatPayoutSchedule(payoutSchedule),
          qualityTier: expertTier
        },
        taxBreakdown,
        validation: this._validateRevenueTotals({
          totalRevenue,
          mosaRevenue: mosaBaseRevenue,
          expertRevenue: expertTotalRevenue,
          taxBreakdown
        })
      };

      // 🏗️ Cache successful calculation
      this.cache.set(calculationId, distribution);

      return distribution;

    } catch (error) {
      throw this._createPaymentError(
        error.message,
        PAYMENT_ERRORS.REVENUE_SPLIT_MISMATCH,
        { calculationId, params }
      );
    }
  }

  /**
   * 🎯 CALCULATE PAYOUT SCHEDULE
   * @param {Big} totalRevenue - Total expert revenue
   * @param {Number} studentCount - Number of students
   * @returns {Array} Payout schedule with dates
   */
  _calculatePayoutSchedule(totalRevenue, studentCount) {
    const basePayout = totalRevenue.div(3); // 333/333/333 split
    
    return [
      {
        phase: 'COURSE_START',
        amount: basePayout.toNumber(),
        dueDate: this._calculateDueDate(0), // Immediate
        status: 'PENDING',
        description: 'Initial enrollment payout'
      },
      {
        phase: 'MIDPOINT_COMPLETION',
        amount: basePayout.toNumber(),
        dueDate: this._calculateDueDate(60), // 2 months
        status: 'PENDING',
        description: '75% course completion payout'
      },
      {
        phase: 'FINAL_CERTIFICATION',
        amount: basePayout.toNumber(),
        dueDate: this._calculateDueDate(120), // 4 months
        status: 'PENDING',
        description: 'Course completion and certification payout'
      }
    ];
  }

  /**
   * 🎯 CALCULATE QUALITY BONUS
   * @param {Object} expertMetrics - Expert performance metrics
   * @returns {Object} Bonus calculation result
   */
  calculateQualityBonus(expertMetrics) {
    const {
      completionRate,
      averageRating,
      responseTime,
      studentSatisfaction,
      tier
    } = expertMetrics;

    try {
      // 🏗️ Validate metrics
      this._validateExpertMetrics(expertMetrics);

      // 🏗️ Base bonus from tier
      const baseBonusRate = this.config.QUALITY_BONUS_RATES[tier] || 0;

      // 🏗️ Performance multipliers
      const completionMultiplier = this._calculateCompletionMultiplier(completionRate);
      const ratingMultiplier = this._calculateRatingMultiplier(averageRating);
      const responseMultiplier = this._calculateResponseMultiplier(responseTime);
      const satisfactionMultiplier = this._calculateSatisfactionMultiplier(studentSatisfaction);

      // 🏗️ Total bonus calculation
      const totalMultiplier = completionMultiplier * ratingMultiplier * responseMultiplier * satisfactionMultiplier;
      const effectiveBonusRate = baseBonusRate * totalMultiplier;

      // 🏗️ Cap bonus at 25% maximum
      const cappedBonusRate = Math.min(effectiveBonusRate, 0.25);

      return {
        tier,
        baseBonusRate: baseBonusRate * 100,
        effectiveBonusRate: cappedBonusRate * 100,
        multipliers: {
          completion: completionMultiplier,
          rating: ratingMultiplier,
          response: responseMultiplier,
          satisfaction: satisfactionMultiplier,
          total: totalMultiplier
        },
        qualifiesForBonus: cappedBonusRate > 0,
        maxPossibleBonus: 25, // Maximum 25% bonus
        calculationDate: new Date().toISOString()
      };

    } catch (error) {
      throw this._createPaymentError(
        `Quality bonus calculation failed: ${error.message}`,
        PAYMENT_ERRORS.QUALITY_TIER_INVALID,
        { expertMetrics }
      );
    }
  }

  /**
   * 🎯 GENERATE PAYMENT REFERENCE
   * @param {Object} paymentInfo - Payment information
   * @returns {Object} Payment reference data
   */
  generatePaymentReference(paymentInfo) {
    const {
      studentId,
      skillId,
      expertId,
      gateway = this.config.PAYMENT_GATEWAYS.TELEBIRR
    } = paymentInfo;

    const timestamp = Date.now();
    const randomComponent = randomBytes(4).toString('hex');
    
    // 🏗️ Generate unique payment reference
    const baseReference = `MOSA-${studentId.slice(-6)}-${skillId.slice(-4)}-${expertId.slice(-4)}`;
    const hashInput = `${baseReference}-${timestamp}-${randomComponent}`;
    const hash = createHash('sha256').update(hashInput).digest('hex').slice(0, 16);
    
    const paymentReference = `${baseReference}-${hash.toUpperCase()}`;

    return {
      paymentReference,
      gateway,
      timestamp: new Date(timestamp).toISOString(),
      metadata: {
        studentId,
        skillId,
        expertId,
        hash: hash.slice(0, 8),
        checksum: this._generateChecksum(paymentReference)
      },
      urls: this._generateGatewayUrls(paymentReference, gateway)
    };
  }

  /**
   * 🎯 PROCESS REFUND CALCULATION
   * @param {Object} refundParams - Refund calculation parameters
   * @returns {Object} Refund breakdown
   */
  calculateRefund(refundParams) {
    const {
      enrollmentId,
      originalPayment,
      daysSinceEnrollment,
      completionPercentage,
      reason,
      expertFault = false
    } = refundParams;

    try {
      // 🏗️ Validate refund parameters
      this._validateRefundParams(refundParams);

      // 🏗️ Refund eligibility check
      const eligibility = this._checkRefundEligibility({
        daysSinceEnrollment,
        completionPercentage,
        reason,
        expertFault
      });

      if (!eligibility.eligible) {
        return {
          eligible: false,
          reason: eligibility.reason,
          enrollmentId,
          calculationDate: new Date().toISOString()
        };
      }

      // 🏗️ Refund amount calculation
      const refundAmount = this._calculateRefundAmount({
        originalAmount: new Big(originalPayment.amount),
        daysSinceEnrollment,
        completionPercentage,
        expertFault
      });

      // 🏗️ Refund distribution
      const distribution = this._calculateRefundDistribution({
        refundAmount,
        originalRevenue: originalPayment.revenueSplit,
        expertFault
      });

      return {
        eligible: true,
        enrollmentId,
        refundAmount: refundAmount.toNumber(),
        distribution,
        processingFee: this._calculateRefundProcessingFee(refundAmount),
        netRefund: refundAmount.minus(this._calculateRefundProcessingFee(refundAmount)).toNumber(),
        timeline: this._getRefundTimeline(),
        conditions: this._getRefundConditions(),
        calculationDate: new Date().toISOString()
      };

    } catch (error) {
      throw this._createPaymentError(
        `Refund calculation failed: ${error.message}`,
        'REFUND_CALCULATION_ERROR',
        { enrollmentId, refundParams }
      );
    }
  }

  /**
   * 🎯 VALIDATE PAYMENT GATEWAY RESPONSE
   * @param {Object} gatewayResponse - Payment gateway response
   * @param {String} gateway - Gateway identifier
   * @returns {Object} Validation result
   */
  validateGatewayResponse(gatewayResponse, gateway) {
    const validation = {
      valid: false,
      gateway,
      timestamp: new Date().toISOString(),
      checks: {}
    };

    try {
      // 🏗️ Gateway-specific validation
      switch (gateway) {
        case this.config.PAYMENT_GATEWAYS.TELEBIRR:
          validation.checks = this._validateTelebirrResponse(gatewayResponse);
          break;
        case this.config.PAYMENT_GATEWAYS.CBE_BIRR:
          validation.checks = this._validateCbeBirrResponse(gatewayResponse);
          break;
        default:
          throw new Error(`Unsupported gateway: ${gateway}`);
      }

      // 🏗️ Common validation checks
      validation.checks.amountMatch = this._validateAmountMatch(gatewayResponse);
      validation.checks.referenceValid = this._validatePaymentReference(gatewayResponse);
      validation.checks.timestampValid = this._validatePaymentTimestamp(gatewayResponse);
      validation.checks.signatureValid = this._validateGatewaySignature(gatewayResponse, gateway);

      // 🏗️ Determine overall validity
      validation.valid = Object.values(validation.checks).every(check => check.valid);
      
      if (!validation.valid) {
        validation.errors = Object.entries(validation.checks)
          .filter(([_, check]) => !check.valid)
          .map(([checkName, check]) => `${checkName}: ${check.error}`);
      }

      return validation;

    } catch (error) {
      return {
        valid: false,
        gateway,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // 🏗️ PRIVATE VALIDATION METHODS

  /**
   * Validate payment amount
   * @private
   */
  _validatePaymentAmount(amount) {
    const expectedAmount = this.config.BUNDLE_PRICE;
    const actualAmount = new Big(amount);

    if (!actualAmount.eq(expectedAmount)) {
      throw new Error(`Invalid amount: expected ${expectedAmount}, got ${actualAmount}`);
    }

    return { valid: true, amount: actualAmount.toString() };
  }

  /**
   * Validate revenue split
   * @private
   */
  _validateRevenueSplit(revenueSplit) {
    if (!revenueSplit) {
      throw new Error('Revenue split configuration required');
    }

    const total = new Big(revenueSplit.mosa || 0).plus(new Big(revenueSplit.expert || 0));
    const expectedTotal = this.config.BUNDLE_PRICE;

    if (!total.eq(expectedTotal)) {
      throw new Error(`Revenue split total ${total} does not match bundle price ${expectedTotal}`);
    }

    return { valid: true, split: revenueSplit };
  }

  /**
   * Validate payout schedule
   * @private
   */
  _validatePayoutSchedule(payoutSchedule) {
    if (!payoutSchedule || !Array.isArray(payoutSchedule)) {
      throw new Error('Payout schedule must be an array');
    }

    const totalPayout = payoutSchedule.reduce((sum, payout) => {
      return sum.plus(new Big(payout.amount || 0));
    }, new Big(0));

    if (!totalPayout.eq(this.config.EXPERT_REVENUE)) {
      throw new Error(`Payout schedule total ${totalPayout} does not match expert revenue ${this.config.EXPERT_REVENUE}`);
    }

    return { valid: true, schedule: payoutSchedule };
  }

  /**
   * Validate payment gateway
   * @private
   */
  _validatePaymentGateway(gateway) {
    const validGateways = Object.values(this.config.PAYMENT_GATEWAYS);
    
    if (!validGateways.includes(gateway)) {
      throw new Error(`Invalid payment gateway: ${gateway}. Must be one of: ${validGateways.join(', ')}`);
    }

    return { valid: true, gateway };
  }

  /**
   * Validate tax compliance
   * @private
   */
  _validateTaxCompliance(paymentData) {
    // 🏗️ Ethiopian tax compliance validation
    const complianceChecks = {
      vatApplicable: paymentData.amount >= 1000, // VAT threshold
      taxIdentification: !!paymentData.taxId,
      educationalService: paymentData.serviceType === 'education'
    };

    const nonCompliant = Object.entries(complianceChecks)
      .filter(([_, compliant]) => !compliant)
      .map(([check, _]) => check);

    if (nonCompliant.length > 0) {
      throw new Error(`Tax compliance issues: ${nonCompliant.join(', ')}`);
    }

    return { valid: true, compliance: complianceChecks };
  }

  // 🏗️ PRIVATE CALCULATION METHODS

  /**
   * Calculate tax breakdown
   * @private
   */
  _calculateTaxBreakdown(revenues) {
    const { totalRevenue, mosaRevenue, expertRevenue } = revenues;

    const vatAmount = totalRevenue.times(this.config.TAX_RATES.VAT);
    const netRevenue = totalRevenue.minus(vatAmount);

    return {
      vat: {
        rate: this.config.TAX_RATES.VAT.times(100).toNumber(),
        amount: vatAmount.toNumber()
      },
      incomeTax: {
        rate: this.config.TAX_RATES.INCOME_TAX.times(100).toNumber(),
        amount: new Big(0).toNumber() // 0% for educational services
      },
      netRevenue: netRevenue.toNumber(),
      breakdown: {
        mosaNet: mosaRevenue.toNumber(),
        expertNet: expertRevenue.toNumber()
      }
    };
  }

  /**
   * Calculate completion multiplier
   * @private
   */
  _calculateCompletionMultiplier(completionRate) {
    if (completionRate >= 0.9) return 1.2;
    if (completionRate >= 0.8) return 1.1;
    if (completionRate >= 0.7) return 1.0;
    if (completionRate >= 0.6) return 0.8;
    return 0.5;
  }

  /**
   * Calculate rating multiplier
   * @private
   */
  _calculateRatingMultiplier(averageRating) {
    if (averageRating >= 4.7) return 1.2;
    if (averageRating >= 4.3) return 1.1;
    if (averageRating >= 4.0) return 1.0;
    if (averageRating >= 3.5) return 0.8;
    return 0.5;
  }

  /**
   * Calculate response multiplier
   * @private
   */
  _calculateResponseMultiplier(responseTime) {
    if (responseTime <= 12) return 1.2; // 12 hours or less
    if (responseTime <= 24) return 1.1; // 24 hours or less
    if (responseTime <= 48) return 1.0; // 48 hours or less
    if (responseTime <= 72) return 0.8; // 72 hours or less
    return 0.5; // More than 72 hours
  }

  /**
   * Calculate satisfaction multiplier
   * @private
   */
  _calculateSatisfactionMultiplier(satisfactionRate) {
    if (satisfactionRate >= 0.9) return 1.2;
    if (satisfactionRate >= 0.8) return 1.1;
    if (satisfactionRate >= 0.7) return 1.0;
    if (satisfactionRate >= 0.6) return 0.8;
    return 0.5;
  }

  // 🏗️ PRIVATE UTILITY METHODS

  /**
   * Generate validation ID
   * @private
   */
  _generateValidationId(paymentData) {
    const input = JSON.stringify(paymentData) + Date.now();
    return createHash('md5').update(input).digest('hex').slice(0, 12);
  }

  /**
   * Generate calculation ID
   * @private
   */
  _generateCalculationId(params) {
    const input = JSON.stringify(params) + Date.now();
    return `calc_${createHash('md5').update(input).digest('hex').slice(0, 8)}`;
  }

  /**
   * Generate checksum
   * @private
   */
  _generateChecksum(reference) {
    return createHash('sha1').update(reference).digest('hex').slice(0, 8);
  }

  /**
   * Calculate due date
   * @private
   */
  _calculateDueDate(daysFromNow) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysFromNow);
    return dueDate.toISOString().split('T')[0];
  }

  /**
   * Format revenue split
   * @private
   */
  _formatRevenueSplit(split) {
    return {
      mosa: {
        amount: split.mosa,
        percentage: new Big(split.mosa).div(this.config.BUNDLE_PRICE).times(100).toNumber()
      },
      expert: {
        amount: split.expert,
        percentage: new Big(split.expert).div(this.config.BUNDLE_PRICE).times(100).toNumber()
      }
    };
  }

  /**
   * Format payout schedule
   * @private
   */
  _formatPayoutSchedule(schedule) {
    return schedule.map(payout => ({
      ...payout,
      amount: new Big(payout.amount).toNumber(),
      percentage: new Big(payout.amount).div(this.config.EXPERT_REVENUE).times(100).toNumber()
    }));
  }

  /**
   * Create payment error
   * @private
   */
  _createPaymentError(message, code, context = {}) {
    const error = new Error(message);
    error.code = code;
    error.context = context;
    error.timestamp = new Date().toISOString();
    return error;
  }

  /**
   * Get payment error code
   * @private
   */
  _getPaymentErrorCode(error) {
    const codeMap = {
      'Invalid amount': PAYMENT_ERRORS.INVALID_AMOUNT,
      'Revenue split': PAYMENT_ERRORS.REVENUE_SPLIT_MISMATCH,
      'Payout schedule': PAYMENT_ERRORS.PAYOUT_SCHEDULE_INVALID,
      'Invalid expert tier': PAYMENT_ERRORS.QUALITY_TIER_INVALID,
      'Unsupported gateway': PAYMENT_ERRORS.GATEWAY_UNAVAILABLE,
      'Tax compliance': PAYMENT_ERRORS.TAX_CALCULATION_ERROR
    };

    for (const [key, code] of Object.entries(codeMap)) {
      if (error.message.includes(key)) {
        return code;
      }
    }

    return 'UNKNOWN_ERROR';
  }

  // 🏗️ Gateway-specific validation methods (stubs for implementation)
  _validateTelebirrResponse(response) {
    // Implementation for Telebirr response validation
    return {
      transactionId: { valid: !!response.transactionId, error: 'Missing transaction ID' },
      status: { valid: response.status === 'success', error: 'Transaction failed' },
      amount: { valid: !!response.amount, error: 'Missing amount' }
    };
  }

  _validateCbeBirrResponse(response) {
    // Implementation for CBE Birr response validation
    return {
      transactionId: { valid: !!response.transactionId, error: 'Missing transaction ID' },
      status: { valid: response.status === 'completed', error: 'Transaction failed' },
      amount: { valid: !!response.amount, error: 'Missing amount' }
    };
  }

  _validateAmountMatch(gatewayResponse) {
    return { valid: true, error: null }; // Implementation needed
  }

  _validatePaymentReference(gatewayResponse) {
    return { valid: true, error: null }; // Implementation needed
  }

  _validatePaymentTimestamp(gatewayResponse) {
    return { valid: true, error: null }; // Implementation needed
  }

  _validateGatewaySignature(gatewayResponse, gateway) {
    return { valid: true, error: null }; // Implementation needed
  }

  _generateGatewayUrls(paymentReference, gateway) {
    // Implementation for gateway URL generation
    return {
      paymentUrl: `https://api.mosaforge.com/payment/${gateway}/${paymentReference}`,
      callbackUrl: `https://api.mosaforge.com/payment/${gateway}/callback`,
      statusUrl: `https://api.mosaforge.com/payment/${gateway}/status/${paymentReference}`
    };
  }

  // 🏗️ Additional private methods for refund calculations
  _validateCalculationParams(params) {
    if (params.bundlePrice.lt(0)) {
      throw new Error('Bundle price cannot be negative');
    }
    if (params.studentCount < 1) {
      throw new Error('Student count must be at least 1');
    }
  }

  _validateExpertMetrics(metrics) {
    const { completionRate, averageRating, responseTime, studentSatisfaction, tier } = metrics;
    
    if (completionRate < 0 || completionRate > 1) {
      throw new Error('Completion rate must be between 0 and 1');
    }
    if (averageRating < 1 || averageRating > 5) {
      throw new Error('Average rating must be between 1 and 5');
    }
    if (responseTime < 0) {
      throw new Error('Response time cannot be negative');
    }
    if (studentSatisfaction < 0 || studentSatisfaction > 1) {
      throw new Error('Student satisfaction must be between 0 and 1');
    }
    if (!Object.keys(this.config.QUALITY_BONUS_RATES).includes(tier)) {
      throw new Error('Invalid expert tier');
    }
  }

  _validateRefundParams(params) {
    const { daysSinceEnrollment, completionPercentage } = params;
    
    if (daysSinceEnrollment < 0) {
      throw new Error('Days since enrollment cannot be negative');
    }
    if (completionPercentage < 0 || completionPercentage > 100) {
      throw new Error('Completion percentage must be between 0 and 100');
    }
  }

  _checkRefundEligibility(params) {
    const { daysSinceEnrollment, completionPercentage, reason, expertFault } = params;
    
    // 7-day cooling period
    if (daysSinceEnrollment <= 7) {
      return { eligible: true, reason: 'Within cooling period' };
    }
    
    // Expert fault - always eligible
    if (expertFault) {
      return { eligible: true, reason: 'Expert fault' };
    }
    
    // Low completion - partial refund
    if (completionPercentage < 25) {
      return { eligible: true, reason: 'Low completion percentage' };
    }
    
    return { eligible: false, reason: 'Outside refund eligibility period' };
  }

  _calculateRefundAmount(params) {
    const { originalAmount, daysSinceEnrollment, completionPercentage, expertFault } = params;
    
    if (expertFault) {
      return originalAmount; // Full refund for expert fault
    }
    
    if (daysSinceEnrollment <= 7) {
      return originalAmount; // Full refund within cooling period
    }
    
    // Progressive refund scaling
    let refundRate = 1.0;
    
    if (daysSinceEnrollment <= 30) {
      refundRate = 0.7; // 70% refund in first month
    } else if (daysSinceEnrollment <= 60) {
      refundRate = 0.5; // 50% refund in second month
    } else if (daysSinceEnrollment <= 90) {
      refundRate = 0.3; // 30% refund in third month
    } else {
      refundRate = 0.1; // 10% refund after third month
    }
    
    // Adjust for completion percentage
    const completionAdjustment = 1 - (completionPercentage / 100);
    refundRate *= completionAdjustment;
    
    return originalAmount.times(refundRate);
  }

  _calculateRefundDistribution(params) {
    const { refundAmount, originalRevenue, expertFault } = params;
    
    if (expertFault) {
      // Expert bears the cost for their fault
      return {
        studentRefund: refundAmount.toNumber(),
        expertDeduction: refundAmount.toNumber(),
        mosaImpact: 0
      };
    }
    
    // Normal refund distribution
    const refundPercentage = refundAmount.div(originalRevenue.total);
    
    return {
      studentRefund: refundAmount.toNumber(),
      expertDeduction: originalRevenue.expert.times(refundPercentage).toNumber(),
      mosaImpact: originalRevenue.mosa.times(refundPercentage).toNumber(),
      refundPercentage: refundPercentage.times(100).toNumber()
    };
  }

  _calculateRefundProcessingFee(refundAmount) {
    // 2% processing fee or 50 ETB minimum
    const percentageFee = refundAmount.times(0.02);
    const minimumFee = new Big(50);
    
    return percentageFee.gt(minimumFee) ? percentageFee : minimumFee;
  }

  _getRefundTimeline() {
    return {
      initiation: 'Immediate upon request',
      processing: '3-5 business days',
      disbursement: '7-10 business days',
      notification: 'Email and in-app notification'
    };
  }

  _getRefundConditions() {
    return {
      coolingPeriod: '7 days full refund',
      partialRefund: 'Based on completion percentage',
      expertFault: 'Full refund regardless of timeline',
      processingFee: '2% or 50 ETB minimum',
      paymentMethod: 'Refund to original payment method'
    };
  }

  _validateRevenueTotals(revenues) {
    const { totalRevenue, mosaRevenue, expertRevenue, taxBreakdown } = revenues;
    
    const calculatedTotal = mosaRevenue.plus(expertRevenue);
    const difference = totalRevenue.minus(calculatedTotal).abs();
    
    return {
      valid: difference.lt(1), // Allow 1 ETB difference for rounding
      difference: difference.toNumber(),
      calculatedTotal: calculatedTotal.toNumber(),
      expectedTotal: totalRevenue.toNumber(),
      taxIncluded: taxBreakdown.vat.amount > 0
    };
  }

  /**
   * 🏗️ Get utility configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return {
      ...this.config,
      cacheSize: this.cache.size,
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * 🏗️ Clear calculation cache
   */
  clearCache() {
    this.cache.clear();
    this._initializeCache();
  }

  /**
   * 🏗️ Get cache statistics
   * @returns {Object} Cache usage statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      hits: 0, // Would implement hit tracking in production
      misses: 0,
      hitRate: 0
    };
  }
}

// 🏗️ Enterprise Export Pattern
module.exports = {
  PaymentUtils,
  PAYMENT_CONFIG,
  PAYMENT_STATUS,
  PAYMENT_ERRORS
};

// 🏗️ Singleton Instance for Microservice Architecture
let paymentUtilsInstance = null;

module.exports.getInstance = (options = {}) => {
  if (!paymentUtilsInstance) {
    paymentUtilsInstance = new PaymentUtils(options);
  }
  return paymentUtilsInstance;
};

// 🏗️ Utility functions for direct use
module.exports.formatCurrency = (amount) => {
  return new Big(amount).toFixed(2);
};

module.exports.calculatePercentage = (part, total) => {
  return new Big(part).div(total).times(100).toNumber();
};

module.exports.validateEthiopianCurrency = (amount) => {
  const bigAmount = new Big(amount);
  return bigAmount.gte(0) && bigAmount.lte(1000000); // 0 to 1,000,000 ETB
};