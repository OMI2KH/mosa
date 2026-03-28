/**
 * 🎯 MOSA FORGE: Enterprise Data Formatters
 * 
 * @module Formatters
 * @description Enterprise-grade data formatting utilities for consistent data presentation
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Currency formatting for Ethiopian Birr
 * - Date/time localization for Ethiopia
 * - Phone number formatting
 * - Quality score presentation
 * - Progress percentage calculation
 * - Data validation and sanitization
 */

const { performance } = require('perf_hooks');

// 🏗️ Enterprise Constants
const FORMATTING_CONFIG = {
  CURRENCY: {
    ETB: {
      symbol: 'ETB',
      locale: 'et-ET',
      decimalPlaces: 2,
      thousandSeparator: ',',
      decimalSeparator: '.'
    },
    USD: {
      symbol: '$',
      locale: 'en-US',
      decimalPlaces: 2
    }
  },
  
  DATE: {
    locale: 'en-ET',
    timeZone: 'Africa/Addis_Ababa',
    formats: {
      SHORT: 'dd/MM/yyyy',
      MEDIUM: 'dd MMM yyyy',
      LONG: 'dd MMMM yyyy',
      FULL: 'EEEE, dd MMMM yyyy',
      DATETIME: 'dd/MM/yyyy HH:mm',
      DATETIME_FULL: 'EEEE, dd MMMM yyyy HH:mm'
    }
  },
  
  PHONE: {
    ETHIOPIA: {
      countryCode: '+251',
      format: '+251 ## ### ####',
      localFormat: '0## ### ####'
    }
  },
  
  QUALITY: {
    DECIMAL_PLACES: 1,
    MAX_SCORE: 5.0,
    MIN_SCORE: 1.0,
    THRESHOLDS: {
      MASTER: 4.7,
      SENIOR: 4.3,
      STANDARD: 4.0,
      DEVELOPING: 3.5
    }
  }
};

/**
 * 🏗️ Enterprise Currency Formatter Class
 * @class CurrencyFormatter
 */
class CurrencyFormatter {
  constructor(config = FORMATTING_CONFIG.CURRENCY.ETB) {
    this.config = config;
    this.cache = new Map();
    this.metrics = {
      formatCalls: 0,
      cacheHits: 0,
      averageFormatTime: 0
    };
  }

  /**
   * 🏗️ Format Ethiopian Birr with Enterprise Features
   * @param {number} amount - Amount in ETB
   * @param {Object} options - Formatting options
   * @returns {string} Formatted currency string
   */
  formatETB(amount, options = {}) {
    const startTime = performance.now();
    const cacheKey = `etb_${amount}_${JSON.stringify(options)}`;

    // Check cache for performance
    if (this.cache.has(cacheKey)) {
      this.metrics.cacheHits++;
      this.metrics.formatCalls++;
      return this.cache.get(cacheKey);
    }

    try {
      this._validateAmount(amount);

      const {
        showSymbol = true,
        decimalPlaces = this.config.decimalPlaces,
        compact = false
      } = options;

      let formattedAmount;

      if (compact && amount >= 1000000) {
        formattedAmount = this._formatCompact(amount, decimalPlaces);
      } else {
        formattedAmount = this._formatStandard(amount, decimalPlaces);
      }

      const result = showSymbol ? `${this.config.symbol} ${formattedAmount}` : formattedAmount;

      // Cache result for performance
      this.cache.set(cacheKey, result);
      if (this.cache.size > 1000) {
        this._cleanCache();
      }

      const processingTime = performance.now() - startTime;
      this._updateMetrics(processingTime);

      return result;

    } catch (error) {
      this._logError('CURRENCY_FORMAT_ERROR', error, { amount, options });
      return this.config.symbol + ' 0.00';
    }
  }

  /**
   * 🏗️ Format Revenue Split Display (1000/999)
   * @param {Object} revenue - Revenue split object
   * @returns {Object} Formatted revenue display
   */
  formatRevenueSplit(revenue) {
    const { mosa = 1000, expert = 999, bundle = 1999 } = revenue;

    return {
      bundle: this.formatETB(bundle),
      mosa: {
        amount: this.formatETB(mosa),
        percentage: this.formatPercentage((mosa / bundle) * 100, 2)
      },
      expert: {
        amount: this.formatETB(expert),
        percentage: this.formatPercentage((expert / bundle) * 100, 2)
      },
      split: `${this.formatETB(mosa, { showSymbol: false })} / ${this.formatETB(expert, { showSymbol: false })}`
    };
  }

  /**
   * 🏗️ Format Expert Payout Schedule (333/333/333)
   * @param {Array} payouts - Payout schedule array
   * @returns {Array} Formatted payout schedule
   */
  formatPayoutSchedule(payouts = [333, 333, 333]) {
    return payouts.map((payout, index) => ({
      phase: this._getPayoutPhase(index),
      amount: this.formatETB(payout),
      rawAmount: payout,
      status: 'PENDING',
      dueDate: this._calculatePayoutDate(index)
    }));
  }

  /**
   * 🏗️ Format Quality Bonus Calculation
   * @param {number} baseAmount - Base amount (999 ETB)
   * @param {number} qualityScore - Expert quality score
   * @returns {Object} Bonus calculation result
   */
  formatQualityBonus(baseAmount, qualityScore) {
    const tier = this._getQualityTier(qualityScore);
    const bonusPercentage = this._getBonusPercentage(tier);
    const bonusAmount = baseAmount * (bonusPercentage / 100);
    const totalAmount = baseAmount + bonusAmount;

    return {
      baseAmount: this.formatETB(baseAmount),
      qualityScore: this.formatQualityScore(qualityScore),
      tier,
      bonusPercentage: this.formatPercentage(bonusPercentage),
      bonusAmount: this.formatETB(bonusAmount),
      totalAmount: this.formatETB(totalAmount),
      raw: {
        baseAmount,
        bonusPercentage,
        bonusAmount,
        totalAmount
      }
    };
  }

  /**
   * 🏗️ Private: Standard Currency Formatting
   * @private
   */
  _formatStandard(amount, decimalPlaces) {
    const fixedAmount = Number(amount).toFixed(decimalPlaces);
    const parts = fixedAmount.split('.');
    
    let integerPart = parts[0];
    const decimalPart = parts[1] || '00';

    // Add thousand separators
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, this.config.thousandSeparator);

    return decimalPart === '00' ? integerPart : `${integerPart}${this.config.decimalSeparator}${decimalPart}`;
  }

  /**
   * 🏗️ Private: Compact Formatting for Large Amounts
   * @private
   */
  _formatCompact(amount, decimalPlaces) {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(decimalPlaces)}B`;
    } else if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(decimalPlaces)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(decimalPlaces)}K`;
    }
    return this._formatStandard(amount, decimalPlaces);
  }

  /**
   * 🏗️ Private: Amount Validation
   * @private
   */
  _validateAmount(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('Invalid amount: must be a valid number');
    }

    if (amount < 0) {
      throw new Error('Invalid amount: cannot be negative');
    }

    if (amount > Number.MAX_SAFE_INTEGER) {
      throw new Error('Amount exceeds safe integer limit');
    }
  }

  /**
   * 🏗️ Private: Cache Management
   * @private
   */
  _cleanCache() {
    // Remove oldest 100 entries
    const keys = Array.from(this.cache.keys()).slice(0, 100);
    keys.forEach(key => this.cache.delete(key));
  }

  /**
   * 🏗️ Private: Payout Phase Mapping
   * @private
   */
  _getPayoutPhase(index) {
    const phases = ['START', 'MIDPOINT', 'COMPLETION'];
    return phases[index] || `PHASE_${index + 1}`;
  }

  /**
   * 🏗️ Private: Payout Date Calculation
   * @private
   */
  _calculatePayoutDate(phaseIndex) {
    const baseDate = new Date();
    const monthsToAdd = phaseIndex * 1.33; // Approximately 1.33 months per phase
    baseDate.setMonth(baseDate.getMonth() + Math.ceil(monthsToAdd));
    return baseDate.toISOString();
  }

  /**
   * 🏗️ Private: Quality Tier Determination
   * @private
   */
  _getQualityTier(qualityScore) {
    const { THRESHOLDS } = FORMATTING_CONFIG.QUALITY;
    
    if (qualityScore >= THRESHOLDS.MASTER) return 'MASTER';
    if (qualityScore >= THRESHOLDS.SENIOR) return 'SENIOR';
    if (qualityScore >= THRESHOLDS.STANDARD) return 'STANDARD';
    if (qualityScore >= THRESHOLDS.DEVELOPING) return 'DEVELOPING';
    return 'PROBATION';
  }

  /**
   * 🏗️ Private: Bonus Percentage Calculation
   * @private
   */
  _getBonusPercentage(tier) {
    const bonusMap = {
      MASTER: 20,
      SENIOR: 10,
      STANDARD: 0,
      DEVELOPING: -10,
      PROBATION: -20
    };
    
    return bonusMap[tier] || 0;
  }

  /**
   * 🏗️ Update Performance Metrics
   * @private
   */
  _updateMetrics(processingTime) {
    this.metrics.formatCalls++;
    this.metrics.averageFormatTime = 
      (this.metrics.averageFormatTime * (this.metrics.formatCalls - 1) + processingTime) / 
      this.metrics.formatCalls;
  }

  /**
   * 🏗️ Get Formatter Metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      cacheHitRate: this.metrics.formatCalls > 0 ? 
        (this.metrics.cacheHits / this.metrics.formatCalls) * 100 : 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🏗️ Clear Cache
   */
  clearCache() {
    this.cache.clear();
    this.metrics.cacheHits = 0;
  }
}

/**
 * 🏗️ Enterprise Date Formatter Class
 * @class DateFormatter
 */
class DateFormatter {
  constructor(timeZone = FORMATTING_CONFIG.DATE.timeZone) {
    this.timeZone = timeZone;
    this.cache = new Map();
  }

  /**
   * 🏗️ Format Date for Ethiopian Context
   * @param {Date|string} date - Date to format
   * @param {string} format - Format type (SHORT, MEDIUM, LONG, FULL, DATETIME)
   * @returns {string} Formatted date string
   */
  formatDate(date, format = 'MEDIUM') {
    const cacheKey = `date_${date}_${format}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const dateObj = this._parseDate(date);
      const formatConfig = FORMATTING_CONFIG.DATE.formats[format] || format;
      
      const result = this._applyFormat(dateObj, formatConfig);
      
      this.cache.set(cacheKey, result);
      return result;

    } catch (error) {
      this._logError('DATE_FORMAT_ERROR', error, { date, format });
      return 'Invalid Date';
    }
  }

  /**
   * 🏗️ Format Date with Ethiopian Calendar Support
   * @param {Date} date - Date to format
   * @param {Object} options - Formatting options
   * @returns {string} Formatted date with Ethiopian calendar
   */
  formatEthiopianDate(date, options = {}) {
    try {
      const gregorianDate = this._parseDate(date);
      const ethiopianDate = this._toEthiopianDate(gregorianDate);
      
      const {
        includeGregorian = false,
        format = 'MEDIUM'
      } = options;

      let result = this._formatEthiopian(ethiopianDate, format);
      
      if (includeGregorian) {
        const gregorianStr = this.formatDate(gregorianDate, format);
        result += ` (${gregorianStr})`;
      }

      return result;

    } catch (error) {
      this._logError('ETHIOPIAN_DATE_ERROR', error, { date, options });
      return this.formatDate(date, options.format);
    }
  }

  /**
   * 🏗️ Format Date Relative to Now
   * @param {Date|string} date - Date to format
   * @returns {string} Relative time string
   */
  formatRelativeTime(date) {
    const now = new Date();
    const targetDate = this._parseDate(date);
    const diffMs = now - targetDate;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return this.formatDate(targetDate, 'SHORT');
    }
  }

  /**
   * 🏗️ Format Course Duration
   * @param {number} months - Duration in months
   * @returns {string} Formatted duration
   */
  formatCourseDuration(months) {
    if (months >= 12) {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      
      if (remainingMonths === 0) {
        return `${years} year${years !== 1 ? 's' : ''}`;
      } else {
        return `${years} year${years !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
      }
    } else {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
  }

  /**
   * 🏗️ Private: Date Parsing with Validation
   * @private
   */
  _parseDate(date) {
    if (date instanceof Date) {
      return date;
    }
    
    if (typeof date === 'string' || typeof date === 'number') {
      const parsed = new Date(date);
      if (isNaN(parsed.getTime())) {
        throw new Error('Invalid date string');
      }
      return parsed;
    }
    
    throw new Error('Invalid date format');
  }

  /**
   * 🏗️ Private: Apply Date Format
   * @private
   */
  _applyFormat(date, format) {
    const options = {
      timeZone: this.timeZone
    };

    switch (format) {
      case 'SHORT':
        return date.toLocaleDateString('en-ET', { 
          ...options,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

      case 'MEDIUM':
        return date.toLocaleDateString('en-ET', {
          ...options,
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });

      case 'LONG':
        return date.toLocaleDateString('en-ET', {
          ...options,
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });

      case 'FULL':
        return date.toLocaleDateString('en-ET', {
          ...options,
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });

      case 'DATETIME':
        return date.toLocaleString('en-ET', {
          ...options,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

      default:
        // Custom format string
        return this._formatCustom(date, format);
    }
  }

  /**
   * 🏗️ Private: Custom Date Formatting
   * @private
   */
  _formatCustom(date, format) {
    const replacements = {
      'yyyy': date.getFullYear(),
      'MM': String(date.getMonth() + 1).padStart(2, '0'),
      'dd': String(date.getDate()).padStart(2, '0'),
      'HH': String(date.getHours()).padStart(2, '0'),
      'mm': String(date.getMinutes()).padStart(2, '0'),
      'ss': String(date.getSeconds()).padStart(2, '0')
    };

    return format.replace(/yyyy|MM|dd|HH|mm|ss/g, match => replacements[match]);
  }

  /**
   * 🏗️ Private: Convert to Ethiopian Date
   * @private
   */
  _toEthiopianDate(gregorianDate) {
    // Ethiopian calendar conversion logic
    // This is a simplified version - in production, use a proper library
    const year = gregorianDate.getFullYear() - 8;
    const month = gregorianDate.getMonth() + 1;
    const day = gregorianDate.getDate();
    
    return { year, month, day };
  }

  /**
   * 🏗️ Private: Format Ethiopian Date
   * @private
   */
  _formatEthiopian(ethiopianDate, format) {
    const { year, month, day } = ethiopianDate;
    const monthNames = [
      'Meskerem', 'Tikimit', 'Hidar', 'Tahesas', 'Tir', 'Yekatit',
      'Megabit', 'Miazia', 'Genbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
    ];

    if (format === 'SHORT') {
      return `${day}/${month}/${year}`;
    } else if (format === 'MEDIUM') {
      return `${day} ${monthNames[month - 1]} ${year}`;
    } else {
      return `${day} ${monthNames[month - 1]} ${year}`;
    }
  }
}

/**
 * 🏗️ Enterprise Phone Formatter Class
 * @class PhoneFormatter
 */
class PhoneFormatter {
  constructor(countryConfig = FORMATTING_CONFIG.PHONE.ETHIOPIA) {
    this.countryConfig = countryConfig;
  }

  /**
   * 🏗️ Format Ethiopian Phone Number
   * @param {string} phoneNumber - Raw phone number
   * @param {Object} options - Formatting options
   * @returns {string} Formatted phone number
   */
  formatPhone(phoneNumber, options = {}) {
    try {
      const cleaned = this._cleanPhoneNumber(phoneNumber);
      const validated = this._validateEthiopianNumber(cleaned);

      const {
        format = 'international',
        includeCountryCode = true
      } = options;

      if (format === 'international' || includeCountryCode) {
        return this._formatInternational(validated);
      } else {
        return this._formatLocal(validated);
      }

    } catch (error) {
      this._logError('PHONE_FORMAT_ERROR', error, { phoneNumber, options });
      return phoneNumber; // Return original if formatting fails
    }
  }

  /**
   * 🏗️ Validate and Format Multiple Phone Numbers
   * @param {Array} phoneNumbers - Array of phone numbers
   * @returns {Array} Formatted and validated numbers
   */
  formatPhoneList(phoneNumbers) {
    return phoneNumbers.map(phone => {
      try {
        const formatted = this.formatPhone(phone);
        return {
          original: phone,
          formatted,
          valid: true
        };
      } catch (error) {
        return {
          original: phone,
          formatted: phone,
          valid: false,
          error: error.message
        };
      }
    });
  }

  /**
   * 🏗️ Private: Clean Phone Number
   * @private
   */
  _cleanPhoneNumber(phoneNumber) {
    if (typeof phoneNumber !== 'string') {
      throw new Error('Phone number must be a string');
    }

    // Remove all non-digit characters except +
    return phoneNumber.replace(/[^\d+]/g, '');
  }

  /**
   * 🏗️ Private: Validate Ethiopian Number
   * @private
   */
  _validateEthiopianNumber(phoneNumber) {
    // Ethiopian phone number patterns
    const patterns = [
      /^\+251[1-9]\d{8}$/, // International format
      /^0[1-9]\d{8}$/,     // Local format
      /^251[1-9]\d{8}$/    // Without +
    ];

    const isValid = patterns.some(pattern => pattern.test(phoneNumber));
    
    if (!isValid) {
      throw new Error('Invalid Ethiopian phone number format');
    }

    return phoneNumber;
  }

  /**
   * 🏗️ Private: Format International Number
   * @private
   */
  _formatInternational(phoneNumber) {
    // Ensure +251 prefix
    let number = phoneNumber;
    
    if (number.startsWith('0')) {
      number = '+251' + number.substring(1);
    } else if (number.startsWith('251')) {
      number = '+' + number;
    }

    // Format: +251 XX XXX XXXX
    const match = number.match(/^(\+251)(\d{2})(\d{3})(\d{4})$/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
    }

    return number;
  }

  /**
   * 🏗️ Private: Format Local Number
   * @private
   */
  _formatLocal(phoneNumber) {
    // Convert to local format if needed
    let number = phoneNumber;
    
    if (number.startsWith('+251')) {
      number = '0' + number.substring(4);
    } else if (number.startsWith('251')) {
      number = '0' + number.substring(3);
    }

    // Format: 0XX XXX XXXX
    const match = number.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]}`;
    }

    return number;
  }
}

/**
 * 🏗️ Enterprise Quality Score Formatter
 * @class QualityFormatter
 */
class QualityFormatter {
  constructor(config = FORMATTING_CONFIG.QUALITY) {
    this.config = config;
  }

  /**
   * 🏗️ Format Quality Score with Tier
   * @param {number} score - Quality score (1.0-5.0)
   * @returns {Object} Formatted quality information
   */
  formatQualityScore(score) {
    try {
      this._validateQualityScore(score);

      const roundedScore = this._roundScore(score);
      const tier = this._getQualityTier(roundedScore);
      const color = this._getQualityColor(roundedScore);
      const label = this._getQualityLabel(roundedScore);

      return {
        score: roundedScore,
        display: `${roundedScore}/5.0`,
        tier,
        color,
        label,
        isPassing: roundedScore >= this.config.THRESHOLDS.STANDARD,
        isMaster: roundedScore >= this.config.THRESHOLDS.MASTER
      };

    } catch (error) {
      this._logError('QUALITY_FORMAT_ERROR', error, { score });
      return {
        score: 0,
        display: 'N/A',
        tier: 'UNKNOWN',
        color: '#6B7280',
        label: 'Not Rated',
        isPassing: false,
        isMaster: false
      };
    }
  }

  /**
   * 🏗️ Format Progress Percentage
   * @param {number} completed - Completed items
   * @param {number} total - Total items
   * @param {Object} options - Formatting options
   * @returns {Object} Formatted progress information
   */
  formatProgress(completed, total, options = {}) {
    try {
      this._validateProgress(completed, total);

      const {
        decimalPlaces = 0,
        showFraction = false,
        showBar = false
      } = options;

      const percentage = total > 0 ? (completed / total) * 100 : 0;
      const formattedPercentage = this.formatPercentage(percentage, decimalPlaces);

      const result = {
        completed,
        total,
        percentage: formattedPercentage,
        rawPercentage: percentage,
        isComplete: percentage >= 100,
        isStarted: completed > 0
      };

      if (showFraction) {
        result.fraction = `${completed}/${total}`;
      }

      if (showBar) {
        result.bar = this._generateProgressBar(percentage);
      }

      return result;

    } catch (error) {
      this._logError('PROGRESS_FORMAT_ERROR', error, { completed, total, options });
      return {
        completed: 0,
        total: 0,
        percentage: '0%',
        rawPercentage: 0,
        isComplete: false,
        isStarted: false
      };
    }
  }

  /**
   * 🏗️ Format Percentage
   * @param {number} value - Percentage value
   * @param {number} decimalPlaces - Decimal places
   * @returns {string} Formatted percentage
   */
  formatPercentage(value, decimalPlaces = 0) {
    try {
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error('Invalid percentage value');
      }

      const clampedValue = Math.max(0, Math.min(100, value));
      const formatted = clampedValue.toFixed(decimalPlaces);
      
      return `${formatted}%`;

    } catch (error) {
      this._logError('PERCENTAGE_FORMAT_ERROR', error, { value, decimalPlaces });
      return '0%';
    }
  }

  /**
   * 🏗️ Private: Validate Quality Score
   * @private
   */
  _validateQualityScore(score) {
    if (typeof score !== 'number' || isNaN(score)) {
      throw new Error('Quality score must be a valid number');
    }

    if (score < this.config.MIN_SCORE || score > this.config.MAX_SCORE) {
      throw new Error(`Quality score must be between ${this.config.MIN_SCORE} and ${this.config.MAX_SCORE}`);
    }
  }

  /**
   * 🏗️ Private: Validate Progress Values
   * @private
   */
  _validateProgress(completed, total) {
    if (typeof completed !== 'number' || typeof total !== 'number' || 
        isNaN(completed) || isNaN(total)) {
      throw new Error('Progress values must be valid numbers');
    }

    if (completed < 0 || total < 0) {
      throw new Error('Progress values cannot be negative');
    }

    if (completed > total) {
      throw new Error('Completed cannot exceed total');
    }
  }

  /**
   * 🏗️ Private: Round Quality Score
   * @private
   */
  _roundScore(score) {
    const factor = Math.pow(10, this.config.DECIMAL_PLACES);
    return Math.round(score * factor) / factor;
  }

  /**
   * 🏗️ Private: Get Quality Tier
   * @private
   */
  _getQualityTier(score) {
    const { THRESHOLDS } = this.config;
    
    if (score >= THRESHOLDS.MASTER) return 'MASTER';
    if (score >= THRESHOLDS.SENIOR) return 'SENIOR';
    if (score >= THRESHOLDS.STANDARD) return 'STANDARD';
    if (score >= THRESHOLDS.DEVELOPING) return 'DEVELOPING';
    return 'PROBATION';
  }

  /**
   * 🏗️ Private: Get Quality Color
   * @private
   */
  _getQualityColor(score) {
    const { THRESHOLDS } = this.config;
    
    if (score >= THRESHOLDS.MASTER) return '#10B981'; // Green
    if (score >= THRESHOLDS.SENIOR) return '#059669'; // Emerald
    if (score >= THRESHOLDS.STANDARD) return '#D97706'; // Amber
    if (score >= THRESHOLDS.DEVELOPING) return '#DC2626'; // Red
    return '#6B7280'; // Gray
  }

  /**
   * 🏗️ Private: Get Quality Label
   * @private
   */
  _getQualityLabel(score) {
    const { THRESHOLDS } = this.config;
    
    if (score >= THRESHOLDS.MASTER) return 'Master';
    if (score >= THRESHOLDS.SENIOR) return 'Senior';
    if (score >= THRESHOLDS.STANDARD) return 'Standard';
    if (score >= THRESHOLDS.DEVELOPING) return 'Developing';
    return 'Needs Improvement';
  }

  /**
   * 🏗️ Private: Generate Progress Bar
   * @private
   */
  _generateProgressBar(percentage) {
    const width = 20;
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}

/**
 * 🏗️ Enterprise Logging Utility
 * @private
 */
function _logError(operation, error, context = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service: 'formatters',
    operation,
    error: {
      message: error.message,
      stack: error.stack
    },
    context,
    severity: 'ERROR'
  };

  console.error(JSON.stringify(logEntry));

  // In production, send to centralized logging
  if (process.env.NODE_ENV === 'production') {
    // Integration with logging service would go here
  }
}

// 🏗️ Enterprise Export Pattern
module.exports = {
  CurrencyFormatter,
  DateFormatter,
  PhoneFormatter,
  QualityFormatter,
  FORMATTING_CONFIG
};

// 🏗️ Singleton Instances for Microservice Architecture
let currencyFormatterInstance = null;
let dateFormatterInstance = null;
let phoneFormatterInstance = null;
let qualityFormatterInstance = null;

module.exports.getCurrencyFormatter = (config) => {
  if (!currencyFormatterInstance) {
    currencyFormatterInstance = new CurrencyFormatter(config);
  }
  return currencyFormatterInstance;
};

module.exports.getDateFormatter = (timeZone) => {
  if (!dateFormatterInstance) {
    dateFormatterInstance = new DateFormatter(timeZone);
  }
  return dateFormatterInstance;
};

module.exports.getPhoneFormatter = (config) => {
  if (!phoneFormatterInstance) {
    phoneFormatterInstance = new PhoneFormatter(config);
  }
  return phoneFormatterInstance;
};

module.exports.getQualityFormatter = (config) => {
  if (!qualityFormatterInstance) {
    qualityFormatterInstance = new QualityFormatter(config);
  }
  return qualityFormatterInstance;
};