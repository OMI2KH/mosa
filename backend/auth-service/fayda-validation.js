// auth-service/fayda-validation.js

/**
 * 🏢 MOSA FORGE - Enterprise Fayda ID Validation Service
 * 🇪🇹 Ethiopian National ID verification and validation
 * 🔧 Powered by Chereka | Founded by Oumer Muktar
 * 
 * @module FaydaValidation
 * @version Enterprise 1.0
 */

const { EventEmitter } = require('events');
const Redis = require('redis');
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');
const crypto = require('crypto');
const axios = require('axios');
const { Logger } = require('../../utils/logger');
const { MetricsCollector } = require('../../utils/metrics-collector');

class FaydaValidation extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // Redis configuration
      redisUrl: options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      
      // Fayda API configuration
      apiBaseUrl: options.apiBaseUrl || process.env.FAYDA_API_URL || 'https://api.fayda.gov.et',
      apiKey: options.apiKey || process.env.FAYDA_API_KEY,
      apiSecret: options.apiSecret || process.env.FAYDA_API_SECRET,
      apiTimeout: options.apiTimeout || 30000,
      
      // Validation configuration
      enableChecksum: options.enableChecksum !== false,
      enableFormatValidation: options.enableFormatValidation !== false,
      enableGovernmentAPI: options.enableGovernmentAPI !== false,
      enableBiometricVerification: options.enableBiometricVerification !== false,
      
      // Cache configuration
      cacheEnabled: options.cacheEnabled !== false,
      cacheTTL: options.cacheTTL || 3600000, // 1 hour
      negativeCacheTTL: options.negativeCacheTTL || 1800000, // 30 minutes
      
      // Rate limiting
      rateLimitEnabled: options.rateLimitEnabled !== false,
      rateLimitWindow: options.rateLimitWindow || 60000, // 1 minute
      rateLimitMax: options.rateLimitMax || 100, // 100 requests per minute
      
      // Retry configuration
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      
      // Security
      encryptionEnabled: options.encryptionEnabled !== false,
      encryptionKey: options.encryptionKey || process.env.FAYDA_ENCRYPTION_KEY,
      
      // Monitoring
      enableMetrics: options.enableMetrics !== false,
      enableAuditLog: options.enableAuditLog !== false,
      
      // Environment
      environment: process.env.NODE_ENV || 'development',
      
      ...options
    };

    this.prisma = new PrismaClient({
      log: this.options.environment === 'production' ? ['error'] : ['query', 'error', 'warn']
    });

    this.redis = Redis.createClient({
      url: this.options.redisUrl,
      socket: {
        tls: this.options.environment === 'production',
        reconnectStrategy: (retries) => Math.min(retries * 100, 5000)
      }
    });

    this.logger = new Logger({
      service: 'fayda-validation',
      level: this.options.environment === 'production' ? 'info' : 'debug'
    });

    this.metrics = new MetricsCollector({
      service: 'fayda-validation',
      security: true
    });

    // HTTP client for API calls
    this.httpClient = axios.create({
      baseURL: this.options.apiBaseUrl,
      timeout: this.options.apiTimeout,
      headers: {
        'User-Agent': 'Mosa-Forge-Fayda-Validator/1.0',
        'Content-Type': 'application/json'
      }
    });

    // Add authentication interceptor
    this.httpClient.interceptors.request.use(
      (config) => this.authenticateRequest(config)
    );

    // Statistics
    this.stats = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      checksumValidations: 0,
      biometricVerifications: 0
    };

    // Validation rules for Ethiopian Fayda ID
    this.validationRules = {
      length: 10, // Standard Fayda ID length
      regex: /^\d{10}$/,
      checksumAlgorithm: 'ethiopian',
      regions: this.getEthiopianRegions(),
      blacklistedNumbers: this.getBlacklistedNumbers()
    };

    this.initialized = false;
    this.shuttingDown = false;

    this.initialize();
  }

  /**
   * 🏗️ Initialize Fayda validation service
   */
  async initialize() {
    try {
      await this.redis.connect();
      await this.loadBlacklist();
      this.startCleanupTasks();
      this.startMetricsCollection();
      
      this.initialized = true;
      
      this.logger.info('Fayda Validation Service initialized successfully', {
        features: {
          checksumValidation: this.options.enableChecksum,
          governmentAPI: this.options.enableGovernmentAPI,
          biometricVerification: this.options.enableBiometricVerification,
          caching: this.options.cacheEnabled
        },
        apiConfigured: !!this.options.apiKey
      });

      this.emit('initialized', {
        timestamp: new Date().toISOString(),
        features: Object.keys(this.validationRules)
      });

    } catch (error) {
      this.logger.error('Fayda Validation Service initialization failed', {
        error: error.message,
        stack: error.stack
      });

      this.emit('initializationFailed', {
        timestamp: new Date().toISOString(),
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 🔍 Validate Fayda ID
   */
  async validateFaydaId(faydaId, userInfo = {}, context = {}) {
    if (!this.initialized) {
      throw new FaydaError('VALIDATION_SERVICE_NOT_INITIALIZED');
    }

    const startTime = performance.now();
    this.stats.totalValidations++;

    try {
      // Validate input
      this.validateInput(faydaId, userInfo);

      // Generate validation ID
      const validationId = this.generateValidationId(faydaId, userInfo);
      
      // Check cache first
      if (this.options.cacheEnabled) {
        const cachedResult = await this.getCachedValidation(validationId);
        if (cachedResult) {
          this.stats.cacheHits++;
          return cachedResult;
        }
        this.stats.cacheMisses++;
      }

      // Apply rate limiting
      await this.checkRateLimit(faydaId, context);

      // Run validation steps
      const validationResults = await this.runValidationSteps(faydaId, userInfo, context);

      // Compile final result
      const finalResult = this.compileValidationResult(validationResults, faydaId, userInfo);

      // Cache the result
      if (this.options.cacheEnabled) {
        await this.cacheValidationResult(validationId, finalResult);
      }

      // Log audit trail
      if (this.options.enableAuditLog) {
        await this.logValidationAudit(validationId, faydaId, userInfo, finalResult, context);
      }

      // Update statistics
      if (finalResult.isValid) {
        this.stats.successfulValidations++;
      } else {
        this.stats.failedValidations++;
      }

      const responseTime = performance.now() - startTime;

      this.logger.info('Fayda ID validation completed', {
        validationId,
        faydaId: this.maskFaydaId(faydaId),
        isValid: finalResult.isValid,
        responseTime: responseTime.toFixed(2),
        steps: validationResults.length
      });

      this.emit('validationCompleted', {
        validationId,
        faydaId: this.maskFaydaId(faydaId),
        result: finalResult,
        responseTime,
        timestamp: new Date().toISOString()
      });

      return finalResult;

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      this.logger.error('Fayda ID validation failed', {
        faydaId: this.maskFaydaId(faydaId),
        error: error.message,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('validationFailed', {
        faydaId: this.maskFaydaId(faydaId),
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * 🔢 Verify Fayda ID checksum
   */
  async verifyChecksum(faydaId) {
    if (!this.options.enableChecksum) {
      return { isValid: true, reason: 'checksum_validation_disabled' };
    }

    this.stats.checksumValidations++;

    try {
      const checksumResult = this.calculateEthiopianChecksum(faydaId);
      
      if (!checksumResult.isValid) {
        this.logger.warn('Fayda ID checksum validation failed', {
          faydaId: this.maskFaydaId(faydaId),
          details: checksumResult.details
        });
      }

      return checksumResult;

    } catch (error) {
      this.logger.error('Checksum verification failed', {
        faydaId: this.maskFaydaId(faydaId),
        error: error.message
      });

      return {
        isValid: false,
        reason: 'checksum_calculation_error',
        details: error.message
      };
    }
  }

  /**
   * 🌐 Verify with Government API
   */
  async verifyWithGovernmentAPI(faydaId, userInfo = {}) {
    if (!this.options.enableGovernmentAPI || !this.options.apiKey) {
      return { isValid: true, reason: 'government_api_disabled' };
    }

    this.stats.apiCalls++;

    try {
      const requestData = this.prepareAPIRequest(faydaId, userInfo);
      
      const response = await this.makeAPICallWithRetry('/v1/verify', requestData);
      
      return this.processAPIResponse(response, faydaId);

    } catch (error) {
      this.logger.error('Government API verification failed', {
        faydaId: this.maskFaydaId(faydaId),
        error: error.message
      });

      return {
        isValid: false,
        reason: 'government_api_error',
        details: error.message,
        fallback: true
      };
    }
  }

  /**
   * 👤 Verify biometric data
   */
  async verifyBiometric(faydaId, biometricData, userInfo = {}) {
    if (!this.options.enableBiometricVerification) {
      return { isValid: true, reason: 'biometric_verification_disabled' };
    }

    this.stats.biometricVerifications++;

    try {
      // Validate biometric data format
      const validation = this.validateBiometricData(biometricData);
      if (!validation.isValid) {
        return {
          isValid: false,
          reason: 'invalid_biometric_data',
          details: validation.details
        };
      }

      // Prepare biometric verification request
      const requestData = {
        faydaId,
        biometricData: this.encryptBiometricData(biometricData),
        userInfo: this.sanitizeUserInfo(userInfo)
      };

      // Call biometric verification API
      const response = await this.makeAPICallWithRetry('/v1/biometric/verify', requestData);
      
      return this.processBiometricResponse(response, faydaId);

    } catch (error) {
      this.logger.error('Biometric verification failed', {
        faydaId: this.maskFaydaId(faydaId),
        error: error.message
      });

      return {
        isValid: false,
        reason: 'biometric_verification_error',
        details: error.message,
        fallback: true
      };
    }
  }

  /**
   * 📊 Get validation statistics
   */
  async getValidationStats(faydaId = null) {
    const baseStats = this.getStatistics();
    
    if (faydaId) {
      const validationHistory = await this.getValidationHistory(faydaId);
      return {
        ...baseStats,
        faydaId: this.maskFaydaId(faydaId),
        validationHistory
      };
    }

    return baseStats;
  }

  /**
   * 📝 Get validation history
   */
  async getValidationHistory(faydaId) {
    try {
      const history = await this.prisma.faydaValidation.findMany({
        where: {
          faydaId: this.hashFaydaId(faydaId)
        },
        orderBy: {
          validatedAt: 'desc'
        },
        take: 10
      });

      return history.map(record => ({
        id: record.id,
        isValid: record.isValid,
        reason: record.reason,
        validatedAt: record.validatedAt,
        method: record.validationMethod
      }));

    } catch (error) {
      this.logger.error('Failed to fetch validation history', {
        faydaId: this.maskFaydaId(faydaId),
        error: error.message
      });

      return [];
    }
  }

  /**
   * 🚫 Check if Fayda ID is blacklisted
   */
  async isBlacklisted(faydaId) {
    try {
      const blacklistKey = `blacklist:fayda:${this.hashFaydaId(faydaId)}`;
      const isBlacklisted = await this.redis.exists(blacklistKey);
      
      if (isBlacklisted) {
        const blacklistInfo = await this.redis.get(blacklistKey);
        return {
          isBlacklisted: true,
          reason: blacklistInfo ? JSON.parse(blacklistInfo).reason : 'unknown',
          listedAt: blacklistInfo ? JSON.parse(blacklistInfo).listedAt : null
        };
      }

      return { isBlacklisted: false };

    } catch (error) {
      this.logger.error('Blacklist check failed', {
        faydaId: this.maskFaydaId(faydaId),
        error: error.message
      });

      return { isBlacklisted: false, error: error.message };
    }
  }

  /**
   * 🎯 Extract demographic information
   */
  extractDemographicInfo(faydaId) {
    try {
      // Ethiopian Fayda ID structure analysis
      // Format: RRSSSSSSSC (R=Region, S=Serial, C=Checksum)
      
      const regionCode = parseInt(faydaId.substring(0, 2));
      const serialNumber = parseInt(faydaId.substring(2, 9));
      const checksum = parseInt(faydaId.substring(9, 10));

      const region = this.getRegionInfo(regionCode);
      const gender = this.extractGender(serialNumber);
      const birthDate = this.estimateBirthDate(serialNumber);

      return {
        region,
        gender,
        birthDate,
        serialNumber,
        checksum,
        regionCode
      };

    } catch (error) {
      this.logger.error('Demographic extraction failed', {
        faydaId: this.maskFaydaId(faydaId),
        error: error.message
      });

      return {
        error: 'demographic_extraction_failed',
        details: error.message
      };
    }
  }

  // 🔧 PRIVATE METHODS

  /**
   * 🏗️ Load blacklist into Redis
   */
  async loadBlacklist() {
    try {
      // Load from database
      const blacklisted = await this.prisma.faydaBlacklist.findMany({
        where: { isActive: true }
      });

      for (const item of blacklisted) {
        const key = `blacklist:fayda:${this.hashFaydaId(item.faydaId)}`;
        const value = {
          reason: item.reason,
          listedAt: item.listedAt.toISOString(),
          listedBy: item.listedBy
        };

        await this.redis.set(key, JSON.stringify(value));
      }

      this.logger.info('Blacklist loaded into Redis', { count: blacklisted.length });

    } catch (error) {
      this.logger.error('Failed to load blacklist', { error: error.message });
    }
  }

  /**
   * ✅ Validate input parameters
   */
  validateInput(faydaId, userInfo) {
    if (!faydaId || typeof faydaId !== 'string') {
      throw new FaydaError('INVALID_FAYDA_ID', {
        provided: faydaId,
        type: typeof faydaId
      });
    }

    // Basic format validation
    if (!this.validationRules.regex.test(faydaId)) {
      throw new FaydaError('INVALID_FAYDA_FORMAT', {
        faydaId: this.maskFaydaId(faydaId),
        expectedFormat: '10 digits',
        actualLength: faydaId.length
      });
    }

    // Check against blacklisted numbers
    if (this.validationRules.blacklistedNumbers.includes(faydaId)) {
      throw new FaydaError('FAYDA_ID_BLACKLISTED', {
        faydaId: this.maskFaydaId(faydaId)
      });
    }
  }

  /**
   * 🆔 Generate validation ID
   */
  generateValidationId(faydaId, userInfo) {
    const dataString = `${faydaId}:${userInfo.firstName || ''}:${userInfo.lastName || ''}`;
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * 🚦 Check rate limit
   */
  async checkRateLimit(faydaId, context) {
    if (!this.options.rateLimitEnabled) return;

    const identifier = context.ip || faydaId;
    const rateLimitKey = `rate_limit:fayda:${this.hashFaydaId(identifier)}`;
    
    const current = await this.redis.incr(rateLimitKey);
    
    if (current === 1) {
      await this.redis.expire(rateLimitKey, Math.ceil(this.options.rateLimitWindow / 1000));
    }

    if (current > this.options.rateLimitMax) {
      throw new FaydaError('RATE_LIMIT_EXCEEDED', {
        identifier: this.maskFaydaId(identifier),
        limit: this.options.rateLimitMax,
        window: this.options.rateLimitWindow
      });
    }
  }

  /**
   * 🏃‍♂️ Run validation steps
   */
  async runValidationSteps(faydaId, userInfo, context) {
    const steps = [];

    // Step 1: Basic format validation
    steps.push({
      step: 'format_validation',
      result: await this.validateFormat(faydaId)
    });

    // Step 2: Checksum validation
    if (this.options.enableChecksum) {
      steps.push({
        step: 'checksum_validation',
        result: await this.verifyChecksum(faydaId)
      });
    }

    // Step 3: Blacklist check
    steps.push({
      step: 'blacklist_check',
      result: await this.isBlacklisted(faydaId)
    });

    // Step 4: Government API verification
    if (this.options.enableGovernmentAPI) {
      steps.push({
        step: 'government_api_verification',
        result: await this.verifyWithGovernmentAPI(faydaId, userInfo)
      });
    }

    // Step 5: Biometric verification (if provided)
    if (this.options.enableBiometricVerification && userInfo.biometricData) {
      steps.push({
        step: 'biometric_verification',
        result: await this.verifyBiometric(faydaId, userInfo.biometricData, userInfo)
      });
    }

    return steps;
  }

  /**
   * 📊 Compile validation result
   */
  compileValidationResults(validationSteps, faydaId, userInfo) {
    const failedSteps = validationSteps.filter(step => !step.result.isValid);
    const hasCriticalFailures = failedSteps.some(step => 
      !step.result.fallback && ['format_validation', 'checksum_validation', 'blacklist_check'].includes(step.step)
    );

    const isValid = failedSteps.length === 0 || 
      (failedSteps.length > 0 && failedSteps.every(step => step.result.fallback));

    const reasons = failedSteps.map(step => ({
      step: step.step,
      reason: step.result.reason,
      details: step.result.details
    }));

    const demographicInfo = this.extractDemographicInfo(faydaId);

    return {
      isValid,
      faydaId: this.maskFaydaId(faydaId),
      validationId: this.generateValidationId(faydaId, userInfo),
      timestamp: new Date().toISOString(),
      reasons: isValid ? [] : reasons,
      demographicInfo,
      confidence: this.calculateConfidence(validationSteps),
      steps: validationSteps.map(step => ({
        step: step.step,
        isValid: step.result.isValid,
        reason: step.result.reason
      }))
    };
  }

  /**
   * 📈 Calculate validation confidence
   */
  calculateConfidence(validationSteps) {
    const weights = {
      format_validation: 0.2,
      checksum_validation: 0.3,
      blacklist_check: 0.2,
      government_api_verification: 0.2,
      biometric_verification: 0.1
    };

    let totalWeight = 0;
    let confidence = 0;

    for (const step of validationSteps) {
      const weight = weights[step.step] || 0.1;
      totalWeight += weight;
      
      if (step.result.isValid) {
        confidence += weight;
      } else if (step.result.fallback) {
        confidence += weight * 0.5; // Partial credit for fallback
      }
    }

    return totalWeight > 0 ? confidence / totalWeight : 0;
  }

  /**
   * 💾 Get cached validation result
   */
  async getCachedValidation(validationId) {
    const cacheKey = `validation:${validationId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  }

  /**
   * 💾 Cache validation result
   */
  async cacheValidationResult(validationId, result) {
    const cacheKey = `validation:${validationId}`;
    const ttl = result.isValid ? 
      Math.ceil(this.options.cacheTTL / 1000) : 
      Math.ceil(this.options.negativeCacheTTL / 1000);

    await this.redis.setex(cacheKey, ttl, JSON.stringify(result));
  }

  /**
   * 📝 Log validation audit
   */
  async logValidationAudit(validationId, faydaId, userInfo, result, context) {
    const auditLog = {
      validationId,
      timestamp: new Date().toISOString(),
      faydaId: this.hashFaydaId(faydaId),
      userInfo: this.sanitizeUserInfo(userInfo),
      result: {
        isValid: result.isValid,
        confidence: result.confidence,
        reasons: result.reasons
      },
      context: {
        ip: context.ip,
        userAgent: context.userAgent,
        deviceId: context.deviceId
      }
    };

    // Store in database
    try {
      await this.prisma.faydaValidation.create({
        data: {
          validationId,
          faydaId: this.hashFaydaId(faydaId),
          isValid: result.isValid,
          confidence: result.confidence,
          reason: result.reasons.length > 0 ? result.reasons[0].reason : 'success',
          validationMethod: result.steps.map(s => s.step).join(','),
          userInfo: this.encryptUserInfo(userInfo),
          context: this.sanitizeContext(context),
          validatedAt: new Date()
        }
      });

      this.logger.debug('Validation audit logged', { validationId });

    } catch (error) {
      this.logger.error('Failed to log validation audit', {
        validationId,
        error: error.message
      });
    }
  }

  /**
   * 🔐 Authenticate API request
   */
  authenticateRequest(config) {
    if (!this.options.apiKey || !this.options.apiSecret) {
      return config;
    }

    const timestamp = Date.now().toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const signature = this.generateSignature(config, timestamp, nonce);

    config.headers['X-API-Key'] = this.options.apiKey;
    config.headers['X-Timestamp'] = timestamp;
    config.headers['X-Nonce'] = nonce;
    config.headers['X-Signature'] = signature;

    return config;
  }

  /**
   * 🔏 Generate API signature
   */
  generateSignature(config, timestamp, nonce) {
    const data = {
      method: config.method?.toUpperCase(),
      path: config.url,
      timestamp,
      nonce,
      body: config.data ? JSON.stringify(config.data) : ''
    };

    const signatureString = Object.values(data).join('|');
    return crypto
      .createHmac('sha256', this.options.apiSecret)
      .update(signatureString)
      .digest('hex');
  }

  /**
   * 🔢 Calculate Ethiopian checksum
   */
  calculateEthiopianChecksum(faydaId) {
    // Ethiopian Fayda ID uses Luhn-like algorithm with modifications
    const digits = faydaId.split('').map(Number);
    const checkDigit = digits.pop(); // Last digit is checksum
    
    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }

    const calculatedCheckDigit = (10 - (sum % 10)) % 10;
    const isValid = calculatedCheckDigit === checkDigit;

    return {
      isValid,
      providedChecksum: checkDigit,
      calculatedChecksum: calculatedCheckDigit,
      details: isValid ? 'Checksum valid' : 'Checksum mismatch'
    };
  }

  /**
   * 🌐 Make API call with retry
   */
  async makeAPICallWithRetry(endpoint, data, retries = this.options.maxRetries) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.httpClient.post(endpoint, data);
        return response.data;

      } catch (error) {
        if (attempt === retries) {
          throw error;
        }

        // Exponential backoff
        const delay = this.options.retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);

        this.logger.warn(`API call attempt ${attempt} failed, retrying...`, {
          endpoint,
          attempt,
          delay,
          error: error.message
        });
      }
    }
  }

  /**
   * ⏸️ Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 📨 Prepare API request
   */
  prepareAPIRequest(faydaId, userInfo) {
    return {
      faydaId,
      personalInfo: {
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        dateOfBirth: userInfo.dateOfBirth
      },
      requestId: this.generateValidationId(faydaId, userInfo),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 📥 Process API response
   */
  processAPIResponse(response, faydaId) {
    if (response.status === 'VALID') {
      return {
        isValid: true,
        reason: 'government_api_valid',
        details: response.details,
        apiData: this.sanitizeAPIResponse(response)
      };
    } else if (response.status === 'INVALID') {
      return {
        isValid: false,
        reason: 'government_api_invalid',
        details: response.reason,
        apiData: this.sanitizeAPIResponse(response)
      };
    } else {
      return {
        isValid: false,
        reason: 'government_api_error',
        details: 'Unexpected API response',
        fallback: true
      };
    }
  }

  /**
   * 👤 Process biometric response
   */
  processBiometricResponse(response, faydaId) {
    if (response.matchScore >= 0.8) { // 80% match threshold
      return {
        isValid: true,
        reason: 'biometric_match',
        matchScore: response.matchScore,
        details: 'Biometric data matches government records'
      };
    } else {
      return {
        isValid: false,
        reason: 'biometric_mismatch',
        matchScore: response.matchScore,
        details: 'Biometric data does not match government records'
      };
    }
  }

  /**
   * ✅ Validate format
   */
  async validateFormat(faydaId) {
    const isValid = this.validationRules.regex.test(faydaId);
    
    return {
      isValid,
      reason: isValid ? 'format_valid' : 'format_invalid',
      details: isValid ? 
        'Fayda ID format is correct' : 
        'Fayda ID must be exactly 10 digits'
    };
  }

  /**
   * 👤 Validate biometric data
   */
  validateBiometricData(biometricData) {
    // Basic biometric data validation
    const requiredFields = ['type', 'data', 'format'];
    const missingFields = requiredFields.filter(field => !biometricData[field]);
    
    if (missingFields.length > 0) {
      return {
        isValid: false,
        details: `Missing required biometric fields: ${missingFields.join(', ')}`
      };
    }

    // Validate biometric data format
    if (!['fingerprint', 'face', 'iris'].includes(biometricData.type)) {
      return {
        isValid: false,
        details: `Unsupported biometric type: ${biometricData.type}`
      };
    }

    return { isValid: true, details: 'Biometric data format is valid' };
  }

  /**
   * 🔐 Encrypt biometric data
   */
  encryptBiometricData(biometricData) {
    if (!this.options.encryptionEnabled) {
      return biometricData;
    }

    const cipher = crypto.createCipher('aes-256-gcm', this.options.encryptionKey);
    let encrypted = cipher.update(JSON.stringify(biometricData), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted: true,
      data: encrypted,
      authTag: cipher.getAuthTag().toString('hex'),
      algorithm: 'aes-256-gcm'
    };
  }

  /**
   * 🗺️ Get Ethiopian regions
   */
  getEthiopianRegions() {
    return {
      '01': { name: 'Tigray', code: 'TG' },
      '02': { name: 'Afar', code: 'AF' },
      '03': { name: 'Amhara', code: 'AM' },
      '04': { name: 'Oromia', code: 'OR' },
      '05': { name: 'Somali', code: 'SO' },
      '06': { name: 'Benishangul-Gumuz', code: 'BG' },
      '07': { name: 'SNNPR', code: 'SN' },
      '08': { name: 'Gambela', code: 'GA' },
      '09': { name: 'Harari', code: 'HA' },
      '10': { name: 'Addis Ababa', code: 'AA' },
      '11': { name: 'Dire Dawa', code: 'DD' }
    };
  }

  /**
   * 🚫 Get blacklisted numbers
   */
  getBlacklistedNumbers() {
    // These are test numbers or known invalid numbers
    return [
      '0000000000',
      '1111111111',
      '1234567890',
      '9999999999'
    ];
  }

  /**
   * 🗺️ Get region info
   */
  getRegionInfo(regionCode) {
    const code = regionCode.toString().padStart(2, '0');
    return this.validationRules.regions[code] || { name: 'Unknown', code: 'UN' };
  }

  /**
   * 👫 Extract gender from serial number
   */
  extractGender(serialNumber) {
    // Ethiopian ID gender encoding (example logic)
    return serialNumber % 2 === 0 ? 'Female' : 'Male';
  }

  /**
   * 📅 Estimate birth date
   */
  estimateBirthDate(serialNumber) {
    // This is a simplified estimation
    // In production, this would use actual Ethiopian calendar conversion
    const baseYear = 1990; // Ethiopian calendar base
    const age = (serialNumber % 60) + 18; // Estimate age between 18-77
    const birthYear = new Date().getFullYear() - age;
    
    return {
      estimated: true,
      year: birthYear,
      age: age
    };
  }

  /**
   * 🔐 Hash Fayda ID for storage
   */
  hashFaydaId(faydaId) {
    return crypto.createHash('sha256').update(faydaId).digest('hex');
  }

  /**
   * 🎭 Mask Fayda ID for logging
   */
  maskFaydaId(faydaId) {
    if (!faydaId || faydaId.length < 6) return '***';
    return `${faydaId.substring(0, 3)}***${faydaId.substring(faydaId.length - 3)}`;
  }

  /**
   * 🎭 Sanitize user info
   */
  sanitizeUserInfo(userInfo) {
    return {
      firstName: userInfo.firstName ? `${userInfo.firstName.charAt(0)}***` : undefined,
      lastName: userInfo.lastName ? `${userInfo.lastName.charAt(0)}***` : undefined,
      hasBiometric: !!userInfo.biometricData,
      dateOfBirth: userInfo.dateOfBirth ? '***' : undefined
    };
  }

  /**
   * 🎭 Sanitize context
   */
  sanitizeContext(context) {
    return {
      ip: context.ip ? `${context.ip.split('.')[0]}.***.***.***` : undefined,
      userAgent: context.userAgent ? context.userAgent.substring(0, 50) + '...' : undefined,
      deviceId: context.deviceId ? `${context.deviceId.substring(0, 8)}***` : undefined
    };
  }

  /**
   * 🎭 Sanitize API response
   */
  sanitizeAPIResponse(response) {
    const sanitized = { ...response };
    
    // Remove sensitive personal information
    delete sanitized.personalInfo;
    delete sanitized.biometricData;
    delete sanitized.familyInfo;
    
    return sanitized;
  }

  /**
   * 🔐 Encrypt user info
   */
  encryptUserInfo(userInfo) {
    if (!this.options.encryptionEnabled) {
      return userInfo;
    }

    const cipher = crypto.createCipher('aes-256-gcm', this.options.encryptionKey);
    let encrypted = cipher.update(JSON.stringify(userInfo), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encrypted: true,
      data: encrypted,
      authTag: cipher.getAuthTag().toString('hex')
    };
  }

  /**
   * 📊 Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      timestamp: new Date().toISOString(),
      cacheEnabled: this.options.cacheEnabled,
      apiConfigured: !!this.options.apiKey
    };
  }

  /**
   * 🧹 Start cleanup tasks
   */
  startCleanupTasks() {
    // Clean old audit logs daily
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldAuditLogs();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  /**
   * 🧹 Cleanup old audit logs
   */
  async cleanupOldAuditLogs() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.faydaValidation.deleteMany({
        where: {
          validatedAt: {
            lt: thirtyDaysAgo
          }
        }
      });

      this.logger.info('Old audit logs cleaned up', { deleted: result.count });

    } catch (error) {
      this.logger.error('Failed to cleanup old audit logs', { error: error.message });
    }
  }

  /**
   * 📈 Start metrics collection
   */
  startMetricsCollection() {
    if (!this.options.enableMetrics) return;

    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute
  }

  /**
   * 📊 Collect metrics
   */
  async collectMetrics() {
    try {
      const stats = this.getStatistics();

      // Record validation metrics
      this.metrics.recordGauge('fayda_validation.total', stats.totalValidations);
      this.metrics.recordGauge('fayda_validation.successful', stats.successfulValidations);
      this.metrics.recordGauge('fayda_validation.failed', stats.failedValidations);
      this.metrics.recordGauge('fayda_validation.success_rate', 
        stats.totalValidations > 0 ? (stats.successfulValidations / stats.totalValidations) * 100 : 0
      );

      // Record engine metrics
      this.metrics.recordGauge('fayda_validation.checksum_validations', stats.checksumValidations);
      this.metrics.recordGauge('fayda_validation.api_calls', stats.apiCalls);
      this.metrics.recordGauge('fayda_validation.biometric_verifications', stats.biometricVerifications);

      // Record cache metrics
      this.metrics.recordGauge('fayda_validation.cache.hits', stats.cacheHits);
      this.metrics.recordGauge('fayda_validation.cache.misses', stats.cacheMisses);
      this.metrics.recordGauge('fayda_validation.cache.hit_rate', 
        (stats.cacheHits + stats.cacheMisses) > 0 ? 
        (stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100 : 0
      );

      this.emit('metricsCollected', {
        stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Metrics collection failed', { error: error.message });
    }
  }

  /**
   * 🧹 Graceful shutdown
   */
  async shutdown() {
    this.shuttingDown = true;
    
    try {
      // Clear intervals
      if (this.cleanupInterval) clearInterval(this.cleanupInterval);
      if (this.metricsInterval) clearInterval(this.metricsInterval);

      // Close Redis connection
      if (this.redis.isOpen) {
        await this.redis.quit();
      }

      // Close database connection
      await this.prisma.$disconnect();

      this.logger.info('Fayda Validation Service shut down gracefully');

      this.emit('shutdownCompleted', {
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Fayda Validation Service shutdown failed', { error: error.message });
      throw error;
    }
  }
}

// 🏢 Enterprise-grade error handling
class FaydaError extends Error {
  constructor(code, context = {}) {
    super(code);
    this.name = 'FaydaError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Set appropriate HTTP status codes
    const statusCodes = {
      'VALIDATION_SERVICE_NOT_INITIALIZED': 503,
      'INVALID_FAYDA_ID': 400,
      'INVALID_FAYDA_FORMAT': 400,
      'FAYDA_ID_BLACKLISTED': 403,
      'RATE_LIMIT_EXCEEDED': 429,
      'GOVERNMENT_API_ERROR': 502,
      'DEFAULT': 500
    };
    
    this.statusCode = statusCodes[code] || statusCodes.DEFAULT;
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp
    };
  }
}

module.exports = {
  FaydaValidation,
  FaydaError
};