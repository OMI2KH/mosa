/**
 * 🎯 MOSA FORGE: Enterprise Data Validation Utilities
 * 
 * @module Validators
 * @description Comprehensive data validation suite for enterprise applications
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Schema-based validation with Joi
 * - Custom Ethiopian-specific validators
 * - Payment data validation
 * - Expert quality validation
 * - Student enrollment validation
 * - Real-time data sanitization
 */

const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const { performance } = require('perf_hooks');

// 🏗️ Enterprise Constants
const VALIDATION_PATTERNS = {
  FAYDA_ID: /^[0-9]{10,15}$/,
  ETHIOPIAN_PHONE: /^(?:\+251|0)(9[0-9]{8})$/,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  ETHIOPIAN_NAME: /^[A-Za-z\u1200-\u135A\s]{2,50}$/,
  AMHARIC_TEXT: /^[\u1200-\u135A\s.,!?()-]+$/,
  CURRENCY_ETB: /^\d+(\.\d{1,2})?$/,
  SKILL_ID: /^skill_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
  EXPERT_ID: /^expert_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
  STUDENT_ID: /^student_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
  PAYMENT_ID: /^payment_[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
};

const VALIDATION_ERRORS = {
  INVALID_FAYDA_ID: 'INVALID_FAYDA_ID',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_EMAIL: 'INVALID_EMAIL',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  INVALID_NAME: 'INVALID_NAME',
  INVALID_AMHARIC: 'INVALID_AMHARIC',
  INVALID_CURRENCY: 'INVALID_CURRENCY',
  INVALID_ID_FORMAT: 'INVALID_ID_FORMAT',
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
  DATA_SANITIZATION_FAILED: 'DATA_SANITIZATION_FAILED',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION'
};

/**
 * 🏗️ Enterprise Validation Result Class
 * @class ValidationResult
 */
class ValidationResult {
  constructor() {
    this.isValid = true;
    this.errors = [];
    this.warnings = [];
    this.sanitizedData = null;
    this.metadata = {
      validationId: uuidv4(),
      timestamp: new Date().toISOString(),
      processingTime: 0
    };
  }

  addError(field, code, message, severity = 'ERROR') {
    this.isValid = false;
    this.errors.push({
      field,
      code,
      message,
      severity,
      timestamp: new Date().toISOString()
    });
  }

  addWarning(field, code, message) {
    this.warnings.push({
      field,
      code,
      message,
      timestamp: new Date().toISOString()
    });
  }

  setSanitizedData(data) {
    this.sanitizedData = data;
  }

  setProcessingTime(time) {
    this.metadata.processingTime = time;
  }

  toJSON() {
    return {
      isValid: this.isValid,
      errors: this.errors,
      warnings: this.warnings,
      sanitizedData: this.sanitizedData,
      metadata: this.metadata
    };
  }
}

/**
 * 🏗️ Main Enterprise Validator Class
 * @class EnterpriseValidator
 */
class EnterpriseValidator {
  constructor(options = {}) {
    this.options = {
      strictMode: options.strictMode !== false,
      sanitize: options.sanitize !== false,
      maxValidationTime: options.maxValidationTime || 5000, // 5 seconds
      ...options
    };

    this.metrics = {
      validationsPerformed: 0,
      validationSuccesses: 0,
      validationFailures: 0,
      averageValidationTime: 0
    };

    this._initializeSchemas();
  }

  /**
   * 🏗️ Initialize All Enterprise Schemas
   * @private
   */
  _initializeSchemas() {
    // 🎯 Core User Schemas
    this.schemas = {
      // User Registration Schema
      userRegistration: Joi.object({
        faydaId: Joi.string()
          .pattern(VALIDATION_PATTERNS.FAYDA_ID)
          .required()
          .messages({
            'string.pattern.base': 'Invalid Fayda ID format',
            'any.required': 'Fayda ID is required'
          }),

        phoneNumber: Joi.string()
          .pattern(VALIDATION_PATTERNS.ETHIOPIAN_PHONE)
          .required()
          .messages({
            'string.pattern.base': 'Invalid Ethiopian phone number',
            'any.required': 'Phone number is required'
          }),

        email: Joi.string()
          .pattern(VALIDATION_PATTERNS.EMAIL)
          .optional()
          .messages({
            'string.pattern.base': 'Invalid email format'
          }),

        firstName: Joi.string()
          .pattern(VALIDATION_PATTERNS.ETHIOPIAN_NAME)
          .min(2)
          .max(50)
          .required()
          .messages({
            'string.pattern.base': 'Invalid first name format',
            'any.required': 'First name is required'
          }),

        lastName: Joi.string()
          .pattern(VALIDATION_PATTERNS.ETHIOPIAN_NAME)
          .min(2)
          .max(50)
          .required()
          .messages({
            'string.pattern.base': 'Invalid last name format',
            'any.required': 'Last name is required'
          }),

        password: Joi.string()
          .pattern(VALIDATION_PATTERNS.PASSWORD)
          .min(8)
          .required()
          .messages({
            'string.pattern.base': 'Password must contain uppercase, lowercase, number and special character',
            'any.required': 'Password is required'
          }),

        dateOfBirth: Joi.date()
          .max(new Date(new Date().setFullYear(new Date().getFullYear() - 16)))
          .required()
          .messages({
            'date.max': 'Must be at least 16 years old',
            'any.required': 'Date of birth is required'
          }),

        region: Joi.string()
          .valid(
            'Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 
            'Dire Dawa', 'Gambela', 'Harari', 'Oromia', 
            'Sidama', 'Somali', 'Southern Nations', 'Tigray'
          )
          .required(),

        city: Joi.string().min(2).max(100).required(),
        
        agreedToTerms: Joi.boolean()
          .valid(true)
          .required()
          .messages({
            'any.only': 'Must agree to terms and conditions'
          })
      }),

      // Expert Registration Schema
      expertRegistration: Joi.object({
        userData: Joi.object().required(),
        
        skills: Joi.array()
          .items(Joi.string().pattern(VALIDATION_PATTERNS.SKILL_ID))
          .min(1)
          .max(10)
          .required()
          .messages({
            'array.min': 'At least one skill is required',
            'array.max': 'Maximum 10 skills allowed'
          }),

        certifications: Joi.array()
          .items(Joi.object({
            name: Joi.string().min(2).max(200).required(),
            issuer: Joi.string().min(2).max(200).required(),
            issueDate: Joi.date().max(new Date()).required(),
            certificateId: Joi.string().optional(),
            verificationUrl: Joi.string().uri().optional()
          }))
          .min(1)
          .required(),

        portfolio: Joi.array()
          .items(Joi.object({
            title: Joi.string().min(2).max(200).required(),
            description: Joi.string().max(1000).optional(),
            projectUrl: Joi.string().uri().optional(),
            images: Joi.array().items(Joi.string().uri()).max(10),
            completionDate: Joi.date().max(new Date()).required()
          }))
          .min(3)
          .required()
          .messages({
            'array.min': 'At least 3 portfolio items required'
          }),

        yearsOfExperience: Joi.number()
          .integer()
          .min(1)
          .max(50)
          .required(),

        hourlyRate: Joi.number()
          .min(100)
          .max(5000)
          .optional(),

        availability: Joi.object({
          hoursPerWeek: Joi.number().min(5).max(40).required(),
          preferredDays: Joi.array().items(
            Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
          ).min(1).required(),
          timezone: Joi.string().default('Africa/Addis_Ababa')
        }).required(),

        bio: Joi.string()
          .min(100)
          .max(2000)
          .required()
          .messages({
            'string.min': 'Bio must be at least 100 characters',
            'string.max': 'Bio cannot exceed 2000 characters'
          })
      }),

      // Payment Validation Schema
      paymentData: Joi.object({
        bundleId: Joi.string()
          .pattern(VALIDATION_PATTERNS.SKILL_ID)
          .required(),

        amount: Joi.number()
          .valid(1999)
          .required()
          .messages({
            'any.only': 'Bundle amount must be exactly 1999 ETB'
          }),

        currency: Joi.string()
          .valid('ETB')
          .required(),

        paymentMethod: Joi.string()
          .valid('telebirr', 'cbebirr', 'bank_transfer', 'mobile_banking')
          .required(),

        studentId: Joi.string()
          .pattern(VALIDATION_PATTERNS.STUDENT_ID)
          .required(),

        revenueSplit: Joi.object({
          mosa: Joi.number().valid(1000).required(),
          expert: Joi.number().valid(999).required()
        }).required(),

        payoutSchedule: Joi.array()
          .items(Joi.object({
            phase: Joi.string().valid('START', 'MIDPOINT', 'COMPLETION').required(),
            amount: Joi.number().valid(333).required(),
            paid: Joi.boolean().default(false)
          }))
          .length(3)
          .required()
      }),

      // Course Enrollment Schema
      courseEnrollment: Joi.object({
        studentId: Joi.string()
          .pattern(VALIDATION_PATTERNS.STUDENT_ID)
          .required(),

        skillId: Joi.string()
          .pattern(VALIDATION_PATTERNS.SKILL_ID)
          .required(),

        paymentId: Joi.string()
          .pattern(VALIDATION_PATTERNS.PAYMENT_ID)
          .required(),

        bundleId: Joi.string()
          .pattern(VALIDATION_PATTERNS.SKILL_ID)
          .required(),

        startDate: Joi.date()
          .min(new Date())
          .required(),

        expectedEndDate: Joi.date()
          .min(Joi.ref('startDate'))
          .max(new Date(new Date().setMonth(new Date().getMonth() + 6)))
          .required(),

        learningPreferences: Joi.object({
          pace: Joi.string().valid('slow', 'moderate', 'fast').default('moderate'),
          language: Joi.string().valid('amharic', 'english', 'oromo').default('amharic'),
          notificationFrequency: Joi.string().valid('low', 'medium', 'high').default('medium')
        }).default()
      }),

      // Quality Metrics Schema
      qualityMetrics: Joi.object({
        expertId: Joi.string()
          .pattern(VALIDATION_PATTERNS.EXPERT_ID)
          .required(),

        completionRate: Joi.number()
          .min(0)
          .max(1)
          .required(),

        averageRating: Joi.number()
          .min(1)
          .max(5)
          .required(),

        responseTime: Joi.number()
          .min(0)
          .max(168) // hours in a week
          .required(),

        studentSatisfaction: Joi.number()
          .min(0)
          .max(1)
          .required(),

        weeklyProgress: Joi.number()
          .min(0)
          .max(1)
          .required(),

        overallScore: Joi.number()
          .min(0)
          .max(5)
          .required()
      }),

      // Learning Progress Schema
      learningProgress: Joi.object({
        enrollmentId: Joi.string().required(),
        phase: Joi.string()
          .valid('MINDSET', 'THEORY', 'HANDS_ON', 'CERTIFICATION')
          .required(),
        progress: Joi.number()
          .min(-1)
          .max(100)
          .required(),
        completedExercises: Joi.number()
          .min(0)
          .required(),
        totalExercises: Joi.number()
          .min(1)
          .required(),
        lastActivity: Joi.date()
          .max(new Date())
          .required()
      })
    };
  }

  /**
   * 🎯 MAIN VALIDATION METHOD: Validate Data Against Schema
   * @param {string} schemaName - Name of the schema to validate against
   * @param {Object} data - Data to validate
   * @param {Object} options - Validation options
   * @returns {ValidationResult} Validation result
   */
  async validate(schemaName, data, options = {}) {
    const startTime = performance.now();
    const validationId = uuidv4();
    const result = new ValidationResult();

    try {
      this.metrics.validationsPerformed++;

      // Check if schema exists
      if (!this.schemas[schemaName]) {
        throw new Error(`Schema '${schemaName}' not found`);
      }

      const schema = this.schemas[schemaName];
      const validationOptions = {
        abortEarly: false,
        stripUnknown: this.options.sanitize,
        allowUnknown: options.allowUnknown || false,
        ...options
      };

      // Perform Joi validation
      const { error, value } = schema.validate(data, validationOptions);

      if (error) {
        this._handleJoiErrors(error, result);
        this.metrics.validationFailures++;
      } else {
        result.setSanitizedData(value);
        
        // Apply additional business rule validations
        await this._applyBusinessRules(schemaName, value, result);
        
        if (result.isValid) {
          this.metrics.validationSuccesses++;
        }
      }

      const processingTime = performance.now() - startTime;
      result.setProcessingTime(processingTime);
      this._updateMetrics(processingTime);

      // Log validation result for monitoring
      this._logValidation(schemaName, result, validationId);

      return result;

    } catch (error) {
      const processingTime = performance.now() - startTime;
      result.setProcessingTime(processingTime);
      
      result.addError(
        'system',
        'VALIDATION_SYSTEM_ERROR',
        `Validation system error: ${error.message}`,
        'CRITICAL'
      );

      this.metrics.validationFailures++;
      this._logValidationError(schemaName, error, validationId);

      return result;
    }
  }

  /**
   * 🏗️ Handle Joi Validation Errors
   * @private
   */
  _handleJoiErrors(error, result) {
    error.details.forEach(detail => {
      const field = detail.path.join('.');
      const code = VALIDATION_ERRORS.SCHEMA_VALIDATION_FAILED;
      
      result.addError(field, code, detail.message, 'ERROR');
    });
  }

  /**
   * 🏗️ Apply Additional Business Rules
   * @private
   */
  async _applyBusinessRules(schemaName, data, result) {
    switch (schemaName) {
      case 'userRegistration':
        await this._validateUserBusinessRules(data, result);
        break;
      
      case 'expertRegistration':
        await this._validateExpertBusinessRules(data, result);
        break;
      
      case 'paymentData':
        await this._validatePaymentBusinessRules(data, result);
        break;
      
      case 'courseEnrollment':
        await this._validateEnrollmentBusinessRules(data, result);
        break;
      
      case 'qualityMetrics':
        await this._validateQualityBusinessRules(data, result);
        break;
      
      default:
        // No additional business rules for this schema
        break;
    }
  }

  /**
   * 🏗️ User Registration Business Rules
   * @private
   */
  async _validateUserBusinessRules(data, result) {
    // Validate age is at least 16 years
    const age = this._calculateAge(new Date(data.dateOfBirth));
    if (age < 16) {
      result.addError(
        'dateOfBirth',
        VALIDATION_ERRORS.BUSINESS_RULE_VIOLATION,
        'Must be at least 16 years old to register',
        'ERROR'
      );
    }

    // Validate phone number prefix
    if (data.phoneNumber && !this._isValidEthiopianPhonePrefix(data.phoneNumber)) {
      result.addWarning(
        'phoneNumber',
        'UNUSUAL_PHONE_PREFIX',
        'Phone number has an unusual prefix for Ethiopia'
      );
    }

    // Additional Ethiopian-specific validations can be added here
  }

  /**
   * 🏗️ Expert Registration Business Rules
   * @private
   */
  async _validateExpertBusinessRules(data, result) {
    // Validate minimum experience based on skills
    if (data.skills && data.skills.length > 0) {
      const minExperience = this._getMinimumExperienceForSkills(data.skills);
      if (data.yearsOfExperience < minExperience) {
        result.addError(
          'yearsOfExperience',
          VALIDATION_ERRORS.BUSINESS_RULE_VIOLATION,
          `Minimum ${minExperience} years experience required for selected skills`,
          'ERROR'
        );
      }
    }

    // Validate portfolio quality
    if (data.portfolio && data.portfolio.length < 3) {
      result.addError(
        'portfolio',
        VALIDATION_ERRORS.BUSINESS_RULE_VIOLATION,
        'At least 3 portfolio items required for expert verification',
        'ERROR'
      );
    }
  }

  /**
   * 🏗️ Payment Business Rules
   * @private
   */
  async _validatePaymentBusinessRules(data, result) {
    // Validate payment amount matches bundle
    if (data.amount !== 1999) {
      result.addError(
        'amount',
        VALIDATION_ERRORS.BUSINESS_RULE_VIOLATION,
        'Payment amount must be exactly 1999 ETB for standard bundle',
        'ERROR'
      );
    }

    // Validate revenue split
    if (data.revenueSplit) {
      const { mosa, expert } = data.revenueSplit;
      if (mosa + expert !== 1999) {
        result.addError(
          'revenueSplit',
          VALIDATION_ERRORS.BUSINESS_RULE_VIOLATION,
          'Revenue split must total 1999 ETB',
          'ERROR'
        );
      }
    }

    // Validate payout schedule
    if (data.payoutSchedule) {
      const totalPayout = data.payoutSchedule.reduce((sum, payout) => sum + payout.amount, 0);
      if (totalPayout !== 999) {
        result.addError(
          'payoutSchedule',
          VALIDATION_ERRORS.BUSINESS_RULE_VIOLATION,
          'Total expert payout must be 999 ETB',
          'ERROR'
        );
      }
    }
  }

  /**
   * 🏗️ Enrollment Business Rules
   * @private
   */
  async _validateEnrollmentBusinessRules(data, result) {
    // Validate course duration (4 months maximum)
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.expectedEndDate);
    const durationMonths = (endDate - startDate) / (1000 * 60 * 60 * 24 * 30);
    
    if (durationMonths > 6) {
      result.addError(
        'expectedEndDate',
        VALIDATION_ERRORS.BUSINESS_RULE_VIOLATION,
        'Course duration cannot exceed 6 months',
        'ERROR'
      );
    }

    if (durationMonths < 3) {
      result.addWarning(
        'expectedEndDate',
        'SHORT_COURSE_DURATION',
        'Course duration seems shorter than recommended 4 months'
      );
    }
  }

  /**
   * 🏗️ Quality Metrics Business Rules
   * @private
   */
  async _validateQualityBusinessRules(data, result) {
    // Validate quality thresholds
    if (data.completionRate < 0.7) {
      result.addWarning(
        'completionRate',
        'LOW_COMPLETION_RATE',
        'Completion rate below platform minimum standard'
      );
    }

    if (data.averageRating < 4.0) {
      result.addWarning(
        'averageRating',
        'LOW_RATING',
        'Average rating below quality threshold'
      );
    }

    if (data.responseTime > 24) {
      result.addWarning(
        'responseTime',
        'SLOW_RESPONSE',
        'Response time exceeds 24-hour standard'
      );
    }

    // Validate overall score calculation
    const calculatedScore = this._calculateQualityScore(data);
    if (Math.abs(calculatedScore - data.overallScore) > 0.1) {
      result.addWarning(
        'overallScore',
        'SCORE_CALCULATION_MISMATCH',
        'Overall score may not match calculated metrics'
      );
    }
  }

  /**
   * 🏗️ Utility Methods
   */

  /**
   * Calculate age from birth date
   * @private
   */
  _calculateAge(birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Validate Ethiopian phone prefix
   * @private
   */
  _isValidEthiopianPhonePrefix(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/^\+251/, '0');
    const prefixes = ['91', '92', '93', '94', '95', '96', '97', '98', '99'];
    const prefix = cleanNumber.substring(1, 3);
    return prefixes.includes(prefix);
  }

  /**
   * Get minimum experience for skills
   * @private
   */
  _getMinimumExperienceForSkills(skills) {
    // This would typically query a database or configuration
    // For now, return a baseline minimum
    return skills.length > 3 ? 2 : 1;
  }

  /**
   * Calculate quality score from metrics
   * @private
   */
  _calculateQualityScore(metrics) {
    const weights = {
      completionRate: 0.3,
      averageRating: 0.3,
      responseTime: 0.2,
      studentSatisfaction: 0.1,
      weeklyProgress: 0.1
    };

    const responseTimeScore = Math.max(0, (24 - metrics.responseTime) / 24);
    
    return (
      metrics.completionRate * weights.completionRate +
      (metrics.averageRating / 5) * weights.averageRating +
      responseTimeScore * weights.responseTime +
      metrics.studentSatisfaction * weights.studentSatisfaction +
      metrics.weeklyProgress * weights.weeklyProgress
    ) * 5; // Scale to 5-point system
  }

  /**
   * 🏗️ Update Performance Metrics
   * @private
   */
  _updateMetrics(processingTime) {
    this.metrics.averageValidationTime = 
      (this.metrics.averageValidationTime * (this.metrics.validationsPerformed - 1) + processingTime) / 
      this.metrics.validationsPerformed;
  }

  /**
   * 🏗️ Log Validation Activity
   * @private
   */
  _logValidation(schemaName, result, validationId) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'validators',
      schema: schemaName,
      validationId,
      result: {
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        processingTime: result.metadata.processingTime
      },
      environment: process.env.NODE_ENV || 'development'
    };

    if (process.env.NODE_ENV === 'production') {
      // Send to centralized logging in production
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * 🏗️ Log Validation Error
   * @private
   */
  _logValidationError(schemaName, error, validationId) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'validators',
      schema: schemaName,
      validationId,
      error: {
        message: error.message,
        stack: error.stack
      },
      severity: 'ERROR',
      environment: process.env.NODE_ENV || 'development'
    };

    console.error(JSON.stringify(logEntry));
  }

  /**
   * 🎯 INDIVIDUAL VALIDATION METHODS
   */

  /**
   * Validate Fayda ID
   * @param {string} faydaId - Fayda ID to validate
   * @returns {ValidationResult} Validation result
   */
  validateFaydaId(faydaId) {
    const result = new ValidationResult();
    
    if (!faydaId) {
      result.addError('faydaId', VALIDATION_ERRORS.INVALID_FAYDA_ID, 'Fayda ID is required');
      return result;
    }

    if (!VALIDATION_PATTERNS.FAYDA_ID.test(faydaId)) {
      result.addError('faydaId', VALIDATION_ERRORS.INVALID_FAYDA_ID, 'Invalid Fayda ID format');
      return result;
    }

    // Additional Fayda ID validation logic can be added here
    result.setSanitizedData(faydaId.trim());
    return result;
  }

  /**
   * Validate Ethiopian Phone Number
   * @param {string} phoneNumber - Phone number to validate
   * @returns {ValidationResult} Validation result
   */
  validateEthiopianPhone(phoneNumber) {
    const result = new ValidationResult();
    
    if (!phoneNumber) {
      result.addError('phoneNumber', VALIDATION_ERRORS.INVALID_PHONE, 'Phone number is required');
      return result;
    }

    if (!VALIDATION_PATTERNS.ETHIOPIAN_PHONE.test(phoneNumber)) {
      result.addError('phoneNumber', VALIDATION_ERRORS.INVALID_PHONE, 'Invalid Ethiopian phone number format');
      return result;
    }

    // Normalize phone number format
    const normalizedPhone = phoneNumber.startsWith('+251') 
      ? phoneNumber 
      : phoneNumber.replace(/^0/, '+251');

    result.setSanitizedData(normalizedPhone);
    return result;
  }

  /**
   * Validate Password Strength
   * @param {string} password - Password to validate
   * @returns {ValidationResult} Validation result
   */
  validatePassword(password) {
    const result = new ValidationResult();
    
    if (!password) {
      result.addError('password', VALIDATION_ERRORS.WEAK_PASSWORD, 'Password is required');
      return result;
    }

    if (!VALIDATION_PATTERNS.PASSWORD.test(password)) {
      result.addError(
        'password', 
        VALIDATION_ERRORS.WEAK_PASSWORD, 
        'Password must contain at least 8 characters including uppercase, lowercase, number and special character'
      );
      return result;
    }

    result.setSanitizedData(password);
    return result;
  }

  /**
   * Validate Ethiopian Name
   * @param {string} name - Name to validate
   * @param {string} fieldName - Field name for error reporting
   * @returns {ValidationResult} Validation result
   */
  validateEthiopianName(name, fieldName = 'name') {
    const result = new ValidationResult();
    
    if (!name) {
      result.addError(fieldName, VALIDATION_ERRORS.INVALID_NAME, `${fieldName} is required`);
      return result;
    }

    if (!VALIDATION_PATTERNS.ETHIOPIAN_NAME.test(name)) {
      result.addError(
        fieldName, 
        VALIDATION_ERRORS.INVALID_NAME, 
        'Name can only contain letters and spaces (Amharic and English characters allowed)'
      );
      return result;
    }

    // Capitalize first letter of each word
    const sanitizedName = name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    result.setSanitizedData(sanitizedName);
    return result;
  }

  /**
   * Validate ETB Currency Amount
   * @param {number|string} amount - Amount to validate
   * @param {Object} options - Validation options
   * @returns {ValidationResult} Validation result
   */
  validateCurrency(amount, options = {}) {
    const result = new ValidationResult();
    const { min = 0, max = 1000000, required = true } = options;

    if (!amount && required) {
      result.addError('amount', VALIDATION_ERRORS.INVALID_CURRENCY, 'Amount is required');
      return result;
    }

    const numericAmount = parseFloat(amount);
    
    if (isNaN(numericAmount)) {
      result.addError('amount', VALIDATION_ERRORS.INVALID_CURRENCY, 'Amount must be a valid number');
      return result;
    }

    if (numericAmount < min) {
      result.addError('amount', VALIDATION_ERRORS.INVALID_CURRENCY, `Amount must be at least ${min} ETB`);
      return result;
    }

    if (numericAmount > max) {
      result.addError('amount', VALIDATION_ERRORS.INVALID_CURRENCY, `Amount cannot exceed ${max} ETB`);
      return result;
    }

    // Round to 2 decimal places
    const sanitizedAmount = Math.round(numericAmount * 100) / 100;
    result.setSanitizedData(sanitizedAmount);
    return result;
  }

  /**
   * 🏗️ Get Validator Metrics
   * @returns {Object} Validator performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  /**
   * 🏗️ Create Custom Schema
   * @param {string} schemaName - Name for the custom schema
   * @param {Joi.Schema} schema - Joi schema object
   */
  createCustomSchema(schemaName, schema) {
    if (this.schemas[schemaName]) {
      throw new Error(`Schema '${schemaName}' already exists`);
    }
    
    this.schemas[schemaName] = schema;
  }

  /**
   * 🏗️ Remove Custom Schema
   * @param {string} schemaName - Name of the schema to remove
   */
  removeCustomSchema(schemaName) {
    if (!this.schemas[schemaName]) {
      throw new Error(`Schema '${schemaName}' not found`);
    }
    
    delete this.schemas[schemaName];
  }
}

// 🏗️ Singleton Instance for Enterprise Use
let validatorInstance = null;

/**
 * Get Enterprise Validator Instance
 * @param {Object} options - Validator options
 * @returns {EnterpriseValidator} Validator instance
 */
const getValidator = (options = {}) => {
  if (!validatorInstance) {
    validatorInstance = new EnterpriseValidator(options);
  }
  return validatorInstance;
};

// 🏗️ Export Enterprise Validator and Utilities
module.exports = {
  EnterpriseValidator,
  ValidationResult,
  VALIDATION_PATTERNS,
  VALIDATION_ERRORS,
  getValidator
};

// 🏗️ Export individual validation functions for convenience
module.exports.validateFaydaId = (faydaId) => 
  getValidator().validateFaydaId(faydaId);

module.exports.validateEthiopianPhone = (phoneNumber) => 
  getValidator().validateEthiopianPhone(phoneNumber);

module.exports.validatePassword = (password) => 
  getValidator().validatePassword(password);

module.exports.validateEthiopianName = (name, fieldName) => 
  getValidator().validateEthiopianName(name, fieldName);

module.exports.validateCurrency = (amount, options) => 
  getValidator().validateCurrency(amount, options);

module.exports.validateSchema = (schemaName, data, options) => 
  getValidator().validate(schemaName, data, options);