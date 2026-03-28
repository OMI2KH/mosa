// auth-service/duplicate-detector.js

/**
 * 🏢 MOSA FORGE - Enterprise Duplicate Detector
 * 🔍 AI-powered duplicate account detection and prevention
 * 🔧 Powered by Chereka | Founded by Oumer Muktar
 * 
 * @module DuplicateDetector
 * @version Enterprise 1.0
 */

const { EventEmitter } = require('events');
const Redis = require('redis');
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');
const crypto = require('crypto');
const { Logger } = require('../../utils/logger');
const { MetricsCollector } = require('../../utils/metrics-collector');

class DuplicateDetector extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // Redis configuration
      redisUrl: options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      
      // Detection thresholds
      similarityThreshold: options.similarityThreshold || 0.85, // 85% similarity
      confidenceThreshold: options.confidenceThreshold || 0.75, // 75% confidence
      maxAllowedAttempts: options.maxAllowedAttempts || 3,
      
      // Fayda ID validation
      faydaValidationEnabled: options.faydaValidationEnabled !== false,
      faydaApiUrl: options.faydaApiUrl || process.env.FAYDA_API_URL,
      faydaApiKey: options.faydaApiKey || process.env.FAYDA_API_KEY,
      
      // Biometric validation
      biometricEnabled: options.biometricEnabled !== false,
      biometricThreshold: options.biometricThreshold || 0.90,
      
      // Machine Learning models
      mlEnabled: options.mlEnabled !== false,
      mlModelPath: options.mlModelPath || './models/duplicate-detector',
      mlConfidence: options.mlConfidence || 0.80,
      
      // Rate limiting for checks
      checkRateLimit: options.checkRateLimit || 100, // per minute
      blockDuration: options.blockDuration || 3600000, // 1 hour
      
      // Cache configuration
      cacheEnabled: options.cacheEnabled !== false,
      cacheTTL: options.cacheTTL || 300000, // 5 minutes
      
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
      service: 'duplicate-detector',
      level: this.options.environment === 'production' ? 'info' : 'debug'
    });

    this.metrics = new MetricsCollector({
      service: 'duplicate-detector',
      security: true
    });

    // Detection engines
    this.detectionEngines = new Map();
    this.similarityCache = new Map();
    this.blockedIdentifiers = new Map();
    
    // Machine Learning model (placeholder for actual implementation)
    this.mlModel = null;
    
    // Statistics
    this.stats = {
      totalChecks: 0,
      duplicatesDetected: 0,
      falsePositives: 0,
      blocksApplied: 0,
      cacheHits: 0,
      cacheMisses: 0,
      faydaValidations: 0,
      biometricChecks: 0
    };

    this.initialized = false;
    this.shuttingDown = false;

    this.initialize();
  }

  /**
   * 🏗️ Initialize duplicate detector
   */
  async initialize() {
    try {
      await this.redis.connect();
      await this.initializeDetectionEngines();
      await this.loadMLModel();
      this.startCleanupTasks();
      this.startMetricsCollection();
      
      this.initialized = true;
      
      this.logger.info('Duplicate Detector initialized successfully', {
        features: {
          faydaValidation: this.options.faydaValidationEnabled,
          biometricDetection: this.options.biometricEnabled,
          machineLearning: this.options.mlEnabled,
          cacheEnabled: this.options.cacheEnabled
        },
        thresholds: {
          similarity: this.options.similarityThreshold,
          confidence: this.options.confidenceThreshold
        }
      });

      this.emit('initialized', {
        timestamp: new Date().toISOString(),
        engines: Array.from(this.detectionEngines.keys())
      });

    } catch (error) {
      this.logger.error('Duplicate Detector initialization failed', {
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
   * 🔍 Check for duplicate account
   */
  async checkDuplicate(userData, context = {}) {
    if (!this.initialized) {
      throw new DuplicateError('DUPLICATE_DETECTOR_NOT_INITIALIZED');
    }

    const startTime = performance.now();
    this.stats.totalChecks++;

    try {
      // Validate input data
      this.validateUserData(userData);
      
      // Generate unique check ID
      const checkId = this.generateCheckId(userData);
      
      // Check cache first
      if (this.options.cacheEnabled) {
        const cachedResult = await this.getCachedResult(checkId);
        if (cachedResult) {
          this.stats.cacheHits++;
          return cachedResult;
        }
        this.stats.cacheMisses++;
      }

      // Apply rate limiting
      await this.checkRateLimit(userData, context);

      // Run detection engines in parallel
      const detectionResults = await this.runDetectionEngines(userData, context);

      // Analyze results and make decision
      const finalResult = await this.analyzeResults(detectionResults, userData, context);

      // Cache the result
      if (this.options.cacheEnabled) {
        await this.cacheResult(checkId, finalResult);
      }

      // Log audit trail
      if (this.options.enableAuditLog) {
        await this.logAuditTrail(checkId, userData, finalResult, context);
      }

      const responseTime = performance.now() - startTime;

      this.logger.info('Duplicate check completed', {
        checkId,
        isDuplicate: finalResult.isDuplicate,
        confidence: finalResult.confidence,
        responseTime: responseTime.toFixed(2),
        enginesUsed: detectionResults.length
      });

      this.emit('duplicateCheckCompleted', {
        checkId,
        userData: this.sanitizeUserData(userData),
        result: finalResult,
        responseTime,
        timestamp: new Date().toISOString()
      });

      return finalResult;

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      this.logger.error('Duplicate check failed', {
        error: error.message,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('checkFailed', {
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * 🆔 Validate Fayda ID uniqueness
   */
  async validateFaydaId(faydaId, userData = {}) {
    if (!this.options.faydaValidationEnabled) {
      return { isValid: true, reason: 'fayda_validation_disabled' };
    }

    this.stats.faydaValidations++;

    try {
      // Check if Fayda ID is already registered
      const existingUser = await this.prisma.user.findFirst({
        where: {
          faydaId: faydaId,
          status: { in: ['ACTIVE', 'PENDING'] }
        },
        select: {
          id: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true
        }
      });

      if (existingUser) {
        this.logger.warn('Fayda ID already registered', {
          faydaId: this.maskFaydaId(faydaId),
          existingUserId: existingUser.id
        });

        return {
          isValid: false,
          reason: 'fayda_id_already_registered',
          existingUser: {
            id: existingUser.id,
            status: existingUser.status,
            registeredAt: existingUser.createdAt
          }
        };
      }

      // Validate Fayda ID format and checksum
      const formatValidation = this.validateFaydaIdFormat(faydaId);
      if (!formatValidation.isValid) {
        return {
          isValid: false,
          reason: 'invalid_fayda_format',
          details: formatValidation.details
        };
      }

      // Verify with government API if enabled
      if (this.options.faydaApiUrl) {
        const apiValidation = await this.verifyFaydaWithAPI(faydaId, userData);
        if (!apiValidation.isValid) {
          return apiValidation;
        }
      }

      return { isValid: true, reason: 'fayda_id_valid' };

    } catch (error) {
      this.logger.error('Fayda ID validation failed', {
        faydaId: this.maskFaydaId(faydaId),
        error: error.message
      });

      // Allow registration on validation failure (fail-open for availability)
      return {
        isValid: true,
        reason: 'validation_failed_fail_open',
        warning: 'Fayda validation service unavailable'
      };
    }
  }

  /**
   * 📧 Check email similarity across accounts
   */
  async checkEmailSimilarity(email, currentUserId = null) {
    try {
      // Normalize email
      const normalizedEmail = this.normalizeEmail(email);
      
      // Find similar emails in database
      const similarEmails = await this.findSimilarEmails(normalizedEmail, currentUserId);
      
      if (similarEmails.length === 0) {
        return { isSimilar: false, matches: [] };
      }

      // Calculate similarity scores
      const matches = await this.calculateEmailSimilarities(email, similarEmails);
      
      // Filter by threshold
      const significantMatches = matches.filter(match => 
        match.similarityScore >= this.options.similarityThreshold
      );

      return {
        isSimilar: significantMatches.length > 0,
        matches: significantMatches,
        highestSimilarity: significantMatches.length > 0 ? 
          Math.max(...significantMatches.map(m => m.similarityScore)) : 0
      };

    } catch (error) {
      this.logger.error('Email similarity check failed', {
        email: this.maskEmail(email),
        error: error.message
      });

      return { isSimilar: false, matches: [], error: error.message };
    }
  }

  /**
   * 📱 Check phone number similarity
   */
  async checkPhoneSimilarity(phoneNumber, currentUserId = null) {
    try {
      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      // Find similar phone numbers
      const similarPhones = await this.findSimilarPhones(normalizedPhone, currentUserId);
      
      if (similarPhones.length === 0) {
        return { isSimilar: false, matches: [] };
      }

      // Calculate similarity scores
      const matches = await this.calculatePhoneSimilarities(phoneNumber, similarPhones);
      
      // Filter by threshold
      const significantMatches = matches.filter(match => 
        match.similarityScore >= this.options.similarityThreshold
      );

      return {
        isSimilar: significantMatches.length > 0,
        matches: significantMatches,
        highestSimilarity: significantMatches.length > 0 ? 
          Math.max(...significantMatches.map(m => m.similarityScore)) : 0
      };

    } catch (error) {
      this.logger.error('Phone similarity check failed', {
        phone: this.maskPhone(phoneNumber),
        error: error.message
      });

      return { isSimilar: false, matches: [], error: error.message };
    }
  }

  /**
   * 👤 Check biometric similarity
   */
  async checkBiometricSimilarity(biometricData, currentUserId = null) {
    if (!this.options.biometricEnabled) {
      return { isSimilar: false, matches: [], reason: 'biometric_disabled' };
    }

    this.stats.biometricChecks++;

    try {
      // Validate biometric data
      const validation = this.validateBiometricData(biometricData);
      if (!validation.isValid) {
        return {
          isSimilar: false,
          matches: [],
          reason: 'invalid_biometric_data',
          details: validation.details
        };
      }

      // Find similar biometric profiles
      const similarProfiles = await this.findSimilarBiometricProfiles(biometricData, currentUserId);
      
      if (similarProfiles.length === 0) {
        return { isSimilar: false, matches: [] };
      }

      // Calculate biometric similarities
      const matches = await this.calculateBiometricSimilarities(biometricData, similarProfiles);
      
      // Filter by threshold
      const significantMatches = matches.filter(match => 
        match.similarityScore >= this.options.biometricThreshold
      );

      return {
        isSimilar: significantMatches.length > 0,
        matches: significantMatches,
        highestSimilarity: significantMatches.length > 0 ? 
          Math.max(...significantMatches.map(m => m.similarityScore)) : 0
      };

    } catch (error) {
      this.logger.error('Biometric similarity check failed', {
        error: error.message
      });

      return { isSimilar: false, matches: [], error: error.message };
    }
  }

  /**
   * 🤖 AI-powered duplicate detection
   */
  async checkWithAI(userData, context = {}) {
    if (!this.options.mlEnabled || !this.mlModel) {
      return { confidence: 0, reason: 'ai_disabled' };
    }

    try {
      // Prepare features for ML model
      const features = this.prepareFeaturesForML(userData, context);
      
      // Get prediction from ML model
      const prediction = await this.getMLPrediction(features);
      
      return {
        confidence: prediction.confidence,
        isDuplicate: prediction.confidence >= this.options.mlConfidence,
        featuresUsed: features.length,
        modelVersion: prediction.modelVersion,
        reasoning: prediction.reasoning
      };

    } catch (error) {
      this.logger.error('AI duplicate detection failed', {
        error: error.message
      });

      return { confidence: 0, isDuplicate: false, error: error.message };
    }
  }

  /**
   * 🚫 Block suspicious identifier
   */
  async blockIdentifier(identifier, reason, duration = null, metadata = {}) {
    const blockDuration = duration || this.options.blockDuration;
    const blockedUntil = Date.now() + blockDuration;

    const blockInfo = {
      identifier,
      reason,
      blockedUntil,
      blockedAt: new Date().toISOString(),
      metadata
    };

    // Store in Redis for distributed blocking
    const redisKey = `blocked:identifier:${this.hashIdentifier(identifier)}`;
    await this.redis.setex(redisKey, Math.ceil(blockDuration / 1000), JSON.stringify(blockInfo));

    // Store locally
    this.blockedIdentifiers.set(identifier, blockInfo);

    this.stats.blocksApplied++;

    this.logger.warn('Identifier blocked', {
      identifier: this.maskIdentifier(identifier),
      reason,
      blockedUntil: new Date(blockedUntil).toISOString()
    });

    this.emit('identifierBlocked', blockInfo);

    return blockInfo;
  }

  /**
   * ✅ Check if identifier is blocked
   */
  async isIdentifierBlocked(identifier) {
    // Check local cache first
    const localBlock = this.blockedIdentifiers.get(identifier);
    if (localBlock && Date.now() < localBlock.blockedUntil) {
      return localBlock;
    }

    if (localBlock) {
      // Remove expired block
      this.blockedIdentifiers.delete(identifier);
    }

    // Check Redis
    const redisKey = `blocked:identifier:${this.hashIdentifier(identifier)}`;
    const blockedData = await this.redis.get(redisKey);
    
    if (blockedData) {
      const blockInfo = JSON.parse(blockedData);
      
      if (Date.now() < blockInfo.blockedUntil) {
        // Update local cache
        this.blockedIdentifiers.set(identifier, blockInfo);
        return blockInfo;
      } else {
        // Remove expired block
        await this.redis.del(redisKey);
      }
    }

    return null;
  }

  /**
   * 🔓 Unblock identifier
   */
  async unblockIdentifier(identifier) {
    // Remove from Redis
    const redisKey = `blocked:identifier:${this.hashIdentifier(identifier)}`;
    await this.redis.del(redisKey);

    // Remove from local cache
    const wasBlocked = this.blockedIdentifiers.delete(identifier);

    if (wasBlocked) {
      this.logger.info('Identifier unblocked', {
        identifier: this.maskIdentifier(identifier)
      });

      this.emit('identifierUnblocked', {
        identifier,
        timestamp: new Date().toISOString()
      });
    }

    return wasBlocked;
  }

  /**
   * 📊 Get detection statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      timestamp: new Date().toISOString(),
      blockedIdentifiers: this.blockedIdentifiers.size,
      cacheSize: this.similarityCache.size,
      engines: Array.from(this.detectionEngines.keys())
    };
  }

  // 🔧 PRIVATE METHODS

  /**
   * 🏗️ Initialize detection engines
   */
  async initializeDetectionEngines() {
    // Fayda ID validation engine
    this.detectionEngines.set('fayda', {
      name: 'Fayda ID Validator',
      weight: 0.3,
      enabled: this.options.faydaValidationEnabled,
      check: (userData) => this.validateFaydaId(userData.faydaId, userData)
    });

    // Email similarity engine
    this.detectionEngines.set('email', {
      name: 'Email Similarity',
      weight: 0.25,
      enabled: true,
      check: (userData) => this.checkEmailSimilarity(userData.email, userData.userId)
    });

    // Phone similarity engine
    this.detectionEngines.set('phone', {
      name: 'Phone Similarity',
      weight: 0.2,
      enabled: true,
      check: (userData) => this.checkPhoneSimilarity(userData.phone, userData.userId)
    });

    // Biometric engine
    this.detectionEngines.set('biometric', {
      name: 'Biometric Similarity',
      weight: 0.15,
      enabled: this.options.biometricEnabled,
      check: (userData) => this.checkBiometricSimilarity(userData.biometricData, userData.userId)
    });

    // AI/ML engine
    this.detectionEngines.set('ai', {
      name: 'AI Detection',
      weight: 0.1,
      enabled: this.options.mlEnabled,
      check: (userData, context) => this.checkWithAI(userData, context)
    });

    this.logger.info('Detection engines initialized', {
      engines: Array.from(this.detectionEngines.keys())
    });
  }

  /**
   * 🤖 Load ML model
   */
  async loadMLModel() {
    if (!this.options.mlEnabled) return;

    try {
      // This would load an actual ML model in production
      // For now, we'll create a placeholder
      this.mlModel = {
        version: '1.0.0',
        features: ['email_similarity', 'phone_similarity', 'behavior_patterns', 'device_fingerprint'],
        predict: async (features) => {
          // Simulate ML prediction
          const confidence = Math.random() * 0.3; // Low confidence for simulation
          return {
            confidence,
            modelVersion: '1.0.0',
            reasoning: ['behavior_analysis', 'pattern_matching']
          };
        }
      };

      this.logger.info('ML model loaded', {
        version: this.mlModel.version,
        features: this.mlModel.features
      });

    } catch (error) {
      this.logger.error('ML model loading failed', { error: error.message });
      this.mlModel = null;
    }
  }

  /**
   * ✅ Validate user data
   */
  validateUserData(userData) {
    const required = ['faydaId', 'email', 'phone'];
    const missing = required.filter(field => !userData[field]);
    
    if (missing.length > 0) {
      throw new DuplicateError('INVALID_USER_DATA', {
        missingFields: missing,
        provided: Object.keys(userData)
      });
    }

    // Validate email format
    if (!this.isValidEmail(userData.email)) {
      throw new DuplicateError('INVALID_EMAIL_FORMAT', {
        email: this.maskEmail(userData.email)
      });
    }

    // Validate phone format
    if (!this.isValidPhone(userData.phone)) {
      throw new DuplicateError('INVALID_PHONE_FORMAT', {
        phone: this.maskPhone(userData.phone)
      });
    }
  }

  /**
   * 🚦 Check rate limit
   */
  async checkRateLimit(userData, context) {
    const identifier = userData.faydaId || userData.email || userData.phone;
    const rateLimitKey = `rate_limit:duplicate_check:${this.hashIdentifier(identifier)}`;
    
    const current = await this.redis.incr(rateLimitKey);
    
    if (current === 1) {
      await this.redis.expire(rateLimitKey, 60); // 1 minute
    }

    if (current > this.options.checkRateLimit) {
      throw new DuplicateError('RATE_LIMIT_EXCEEDED', {
        identifier: this.maskIdentifier(identifier),
        limit: this.options.checkRateLimit
      });
    }
  }

  /**
   * 🏃‍♂️ Run detection engines
   */
  async runDetectionEngines(userData, context) {
    const enabledEngines = Array.from(this.detectionEngines.values())
      .filter(engine => engine.enabled);

    const enginePromises = enabledEngines.map(async (engine) => {
      try {
        const startTime = performance.now();
        const result = await engine.check(userData, context);
        const responseTime = performance.now() - startTime;

        return {
          engine: engine.name,
          weight: engine.weight,
          result,
          responseTime,
          success: true
        };
      } catch (error) {
        this.logger.error('Detection engine failed', {
          engine: engine.name,
          error: error.message
        });

        return {
          engine: engine.name,
          weight: engine.weight,
          error: error.message,
          success: false
        };
      }
    });

    return await Promise.all(enginePromises);
  }

  /**
   * 📊 Analyze detection results
   */
  async analyzeResults(engineResults, userData, context) {
    const successfulResults = engineResults.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return {
        isDuplicate: false,
        confidence: 0,
        reason: 'all_engines_failed',
        details: { engineResults }
      };
    }

    // Calculate weighted confidence
    let totalWeight = 0;
    let weightedConfidence = 0;
    const details = {};

    for (const result of successfulResults) {
      const engineConfidence = this.extractConfidence(result.result);
      weightedConfidence += engineConfidence * result.weight;
      totalWeight += result.weight;
      
      details[result.engine] = {
        confidence: engineConfidence,
        weight: result.weight,
        details: result.result
      };
    }

    const finalConfidence = totalWeight > 0 ? weightedConfidence / totalWeight : 0;
    const isDuplicate = finalConfidence >= this.options.confidenceThreshold;

    if (isDuplicate) {
      this.stats.duplicatesDetected++;
      
      // Auto-block if confidence is very high
      if (finalConfidence >= 0.9) {
        await this.blockIdentifier(
          userData.faydaId,
          'high_confidence_duplicate',
          this.options.blockDuration * 2, // Longer block
          { confidence: finalConfidence, engines: Object.keys(details) }
        );
      }
    }

    return {
      isDuplicate,
      confidence: finalConfidence,
      reason: isDuplicate ? 'duplicate_detected' : 'no_duplicate',
      details,
      enginesUsed: successfulResults.length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 📈 Extract confidence from engine result
   */
  extractConfidence(result) {
    if (typeof result.confidence === 'number') {
      return result.confidence;
    }

    if (result.isSimilar) {
      return result.highestSimilarity || 0.8;
    }

    if (result.isValid === false) {
      return 0.9;
    }

    return 0;
  }

  /**
   * 🆔 Generate check ID
   */
  generateCheckId(userData) {
    const dataString = `${userData.faydaId}:${userData.email}:${userData.phone}`;
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * 💾 Get cached result
   */
  async getCachedResult(checkId) {
    const cacheKey = `duplicate_check:${checkId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  }

  /**
   * 💾 Cache result
   */
  async cacheResult(checkId, result) {
    const cacheKey = `duplicate_check:${checkId}`;
    await this.redis.setex(
      cacheKey, 
      Math.ceil(this.options.cacheTTL / 1000), 
      JSON.stringify(result)
    );
  }

  /**
   * 📝 Log audit trail
   */
  async logAuditTrail(checkId, userData, result, context) {
    const auditLog = {
      checkId,
      timestamp: new Date().toISOString(),
      userData: this.sanitizeUserData(userData),
      result: {
        isDuplicate: result.isDuplicate,
        confidence: result.confidence,
        reason: result.reason
      },
      context: {
        ip: context.ip,
        userAgent: context.userAgent,
        sessionId: context.sessionId
      },
      enginesUsed: result.enginesUsed
    };

    // Store in database
    await this.prisma.auditLog.create({
      data: {
        type: 'DUPLICATE_CHECK',
        action: 'CHECK_DUPLICATE',
        userId: context.userId || null,
        data: auditLog,
        ipAddress: context.ip,
        userAgent: context.userAgent
      }
    });

    this.logger.info('Audit log recorded', { checkId });
  }

  /**
   * 🎯 Prepare features for ML
   */
  prepareFeaturesForML(userData, context) {
    const features = [];

    // Email features
    if (userData.email) {
      features.push({
        type: 'email',
        value: this.normalizeEmail(userData.email),
        domain: userData.email.split('@')[1],
        length: userData.email.length
      });
    }

    // Phone features
    if (userData.phone) {
      features.push({
        type: 'phone',
        value: this.normalizePhoneNumber(userData.phone),
        countryCode: this.extractCountryCode(userData.phone),
        length: userData.phone.length
      });
    }

    // Behavioral features
    if (context) {
      features.push({
        type: 'behavioral',
        ip: context.ip,
        userAgent: context.userAgent,
        timestamp: context.timestamp
      });
    }

    return features;
  }

  /**
   * 🤖 Get ML prediction
   */
  async getMLPrediction(features) {
    if (!this.mlModel) {
      return { confidence: 0, modelVersion: 'none', reasoning: [] };
    }

    return await this.mlModel.predict(features);
  }

  /**
   * 🔍 Find similar emails
   */
  async findSimilarEmails(normalizedEmail, currentUserId = null) {
    // Get all emails from database (with pagination for performance)
    const emails = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        email: { not: null },
        status: { in: ['ACTIVE', 'PENDING'] }
      },
      select: {
        id: true,
        email: true,
        faydaId: true
      },
      take: 1000 // Limit for performance
    });

    return emails.map(user => ({
      userId: user.id,
      email: user.email,
      faydaId: user.faydaId
    }));
  }

  /**
   * 📱 Find similar phones
   */
  async findSimilarPhones(normalizedPhone, currentUserId = null) {
    const phones = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        phone: { not: null },
        status: { in: ['ACTIVE', 'PENDING'] }
      },
      select: {
        id: true,
        phone: true,
        faydaId: true
      },
      take: 1000
    });

    return phones.map(user => ({
      userId: user.id,
      phone: user.phone,
      faydaId: user.faydaId
    }));
  }

  /**
   * 👤 Find similar biometric profiles
   */
  async findSimilarBiometricProfiles(biometricData, currentUserId = null) {
    // This would query a biometric database in production
    // For now, return empty array
    return [];
  }

  /**
   * 📧 Calculate email similarities
   */
  async calculateEmailSimilarities(email, similarEmails) {
    return similarEmails.map(similar => ({
      userId: similar.userId,
      email: similar.email,
      similarityScore: this.calculateStringSimilarity(email, similar.email),
      faydaId: similar.faydaId
    }));
  }

  /**
   * 📱 Calculate phone similarities
   */
  async calculatePhoneSimilarities(phone, similarPhones) {
    return similarPhones.map(similar => ({
      userId: similar.userId,
      phone: similar.phone,
      similarityScore: this.calculatePhoneSimilarity(phone, similar.phone),
      faydaId: similar.faydaId
    }));
  }

  /**
   * 👤 Calculate biometric similarities
   */
  async calculateBiometricSimilarities(biometricData, similarProfiles) {
    // This would calculate actual biometric similarity scores
    // For now, return placeholder
    return similarProfiles.map(profile => ({
      userId: profile.userId,
      similarityScore: Math.random() * 0.5, // Low similarity for simulation
      faydaId: profile.faydaId
    }));
  }

  /**
   * 📧 Normalize email
   */
  normalizeEmail(email) {
    return email.toLowerCase().trim();
  }

  /**
   * 📱 Normalize phone number
   */
  normalizePhoneNumber(phone) {
    return phone.replace(/\D/g, ''); // Remove non-digit characters
  }

  /**
   * 🔢 Calculate string similarity (Levenshtein distance based)
   */
  calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * 📱 Calculate phone similarity
   */
  calculatePhoneSimilarity(phone1, phone2) {
    const normalized1 = this.normalizePhoneNumber(phone1);
    const normalized2 = this.normalizePhoneNumber(phone2);
    
    // Consider phones similar if they share the same last 7 digits
    const last7_1 = normalized1.slice(-7);
    const last7_2 = normalized2.slice(-7);
    
    return last7_1 === last7_2 ? 0.9 : this.calculateStringSimilarity(normalized1, normalized2);
  }

  /**
   * 🧮 Levenshtein distance calculation
   */
  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * 🆔 Validate Fayda ID format
   */
  validateFaydaIdFormat(faydaId) {
    // Ethiopian Fayda ID format validation
    const faydaRegex = /^\d{10,20}$/; // Basic format check
    
    if (!faydaRegex.test(faydaId)) {
      return {
        isValid: false,
        details: 'Invalid Fayda ID format. Must be 10-20 digits.'
      };
    }

    // Add checksum validation here for real implementation
    const checksumValid = this.validateFaydaChecksum(faydaId);
    
    if (!checksumValid) {
      return {
        isValid: false,
        details: 'Fayda ID checksum validation failed'
      };
    }

    return { isValid: true };
  }

  /**
   * 🔢 Validate Fayda ID checksum
   */
  validateFaydaChecksum(faydaId) {
    // Placeholder for actual checksum validation
    // In production, this would implement the actual Ethiopian government algorithm
    return true;
  }

  /**
   * 🌐 Verify Fayda ID with government API
   */
  async verifyFaydaWithAPI(faydaId, userData) {
    try {
      const response = await fetch(this.options.faydaApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.faydaApiKey}`
        },
        body: JSON.stringify({
          faydaId,
          firstName: userData.firstName,
          lastName: userData.lastName
        })
      });

      if (!response.ok) {
        return {
          isValid: false,
          reason: 'fayda_api_error',
          details: `API returned ${response.status}`
        };
      }

      const result = await response.json();
      return {
        isValid: result.isValid || false,
        reason: result.reason || 'api_validation',
        details: result.details
      };

    } catch (error) {
      this.logger.error('Fayda API verification failed', {
        faydaId: this.maskFaydaId(faydaId),
        error: error.message
      });

      return {
        isValid: false,
        reason: 'api_connection_failed',
        details: error.message
      };
    }
  }

  /**
   * 👤 Validate biometric data
   */
  validateBiometricData(biometricData) {
    // Placeholder for biometric data validation
    return { isValid: true, details: 'biometric_data_valid' };
  }

  /**
   * 🎯 Extract country code from phone
   */
  extractCountryCode(phone) {
    // Simple country code extraction
    if (phone.startsWith('+251')) return '+251'; // Ethiopia
    if (phone.startsWith('251')) return '251'; // Ethiopia without +
    return 'unknown';
  }

  /**
   * 📧 Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 📱 Validate phone format
   */
  isValidPhone(phone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 🔐 Hash identifier for storage
   */
  hashIdentifier(identifier) {
    return crypto.createHash('sha256').update(identifier).digest('hex');
  }

  /**
   * 🎭 Sanitize user data for logging
   */
  sanitizeUserData(userData) {
    return {
      faydaId: this.maskFaydaId(userData.faydaId),
      email: this.maskEmail(userData.email),
      phone: this.maskPhone(userData.phone),
      hasBiometric: !!userData.biometricData
    };
  }

  /**
   * 🎭 Mask Fayda ID for logging
   */
  maskFaydaId(faydaId) {
    if (!faydaId || faydaId.length < 6) return '***';
    return `${faydaId.substring(0, 3)}***${faydaId.substring(faydaId.length - 3)}`;
  }

  /**
   * 🎭 Mask email for logging
   */
  maskEmail(email) {
    if (!email) return '***';
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    
    const maskedLocal = local.length > 2 ? 
      `${local.substring(0, 2)}***` : '***';
    
    return `${maskedLocal}@${domain}`;
  }

  /**
   * 🎭 Mask phone for logging
   */
  maskPhone(phone) {
    if (!phone) return '***';
    if (phone.length < 6) return '***';
    
    return `${phone.substring(0, 3)}***${phone.substring(phone.length - 3)}`;
  }

  /**
   * 🎭 Mask identifier for logging
   */
  maskIdentifier(identifier) {
    if (!identifier) return '***';
    if (identifier.includes('@')) return this.maskEmail(identifier);
    if (/^\d+$/.test(identifier)) return this.maskFaydaId(identifier);
    return `${identifier.substring(0, 3)}***`;
  }

  /**
   * 🧹 Start cleanup tasks
   */
  startCleanupTasks() {
    // Clean expired blocks every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredBlocks();
    }, 3600000);

    // Clean cache every 30 minutes
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanupCache();
    }, 1800000);
  }

  /**
   * 🧹 Cleanup expired blocks
   */
  async cleanupExpiredBlocks() {
    const now = Date.now();
    let cleaned = 0;

    for (const [identifier, blockInfo] of this.blockedIdentifiers.entries()) {
      if (now >= blockInfo.blockedUntil) {
        await this.unblockIdentifier(identifier);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug('Expired blocks cleaned up', { cleaned });
    }
  }

  /**
   * 🧹 Cleanup cache
   */
  cleanupCache() {
    // Local cache cleanup would happen here
    // Redis handles its own TTL
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

      // Record detection metrics
      this.metrics.recordGauge('duplicate_detector.checks.total', stats.totalChecks);
      this.metrics.recordGauge('duplicate_detector.duplicates.detected', stats.duplicatesDetected);
      this.metrics.recordGauge('duplicate_detector.blocks.applied', stats.blocksApplied);
      this.metrics.recordGauge('duplicate_detector.false_positives', stats.falsePositives);

      // Record engine metrics
      this.metrics.recordGauge('duplicate_detector.fayda_validations', stats.faydaValidations);
      this.metrics.recordGauge('duplicate_detector.biometric_checks', stats.biometricChecks);

      // Record cache metrics
      this.metrics.recordGauge('duplicate_detector.cache.hits', stats.cacheHits);
      this.metrics.recordGauge('duplicate_detector.cache.misses', stats.cacheMisses);
      this.metrics.recordGauge('duplicate_detector.cache.hit_rate', 
        stats.totalChecks > 0 ? (stats.cacheHits / stats.totalChecks) * 100 : 0
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
      if (this.cacheCleanupInterval) clearInterval(this.cacheCleanupInterval);
      if (this.metricsInterval) clearInterval(this.metricsInterval);

      // Close Redis connection
      if (this.redis.isOpen) {
        await this.redis.quit();
      }

      // Close database connection
      await this.prisma.$disconnect();

      this.logger.info('Duplicate Detector shut down gracefully');

      this.emit('shutdownCompleted', {
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Duplicate Detector shutdown failed', { error: error.message });
      throw error;
    }
  }
}

// 🏢 Enterprise-grade error handling
class DuplicateError extends Error {
  constructor(code, context = {}) {
    super(code);
    this.name = 'DuplicateError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Set appropriate HTTP status codes
    const statusCodes = {
      'DUPLICATE_DETECTOR_NOT_INITIALIZED': 503,
      'INVALID_USER_DATA': 400,
      'INVALID_EMAIL_FORMAT': 400,
      'INVALID_PHONE_FORMAT': 400,
      'RATE_LIMIT_EXCEEDED': 429,
      'IDENTIFIER_BLOCKED': 403,
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
  DuplicateDetector,
  DuplicateError
};