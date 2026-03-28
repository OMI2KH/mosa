// api-gateway/rate-limiter.js

/**
 * 🏢 MOSA FORGE - Enterprise Rate Limiter
 * 🚦 Advanced request throttling, quota management, and DDoS protection
 * 🔧 Powered by Chereka | Founded by Oumer Muktar
 * 
 * @module RateLimiter
 * @version Enterprise 1.0
 */

const { EventEmitter } = require('events');
const Redis = require('redis');
const { performance } = require('perf_hooks');
const { Logger } = require('../utils/logger');
const { MetricsCollector } = require('../utils/metrics-collector');

class RateLimiter extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // Redis configuration
      redisUrl: options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      
      // Default rate limiting configuration
      defaultWindowMs: options.defaultWindowMs || 60000, // 1 minute
      defaultMaxRequests: options.defaultMaxRequests || 100,
      
      // Burst protection
      burstProtection: options.burstProtection !== false,
      burstWindowMs: options.burstWindowMs || 1000, // 1 second
      burstMaxRequests: options.burstMaxRequests || 10,
      
      // Global limits
      globalEnabled: options.globalEnabled !== false,
      globalWindowMs: options.globalWindowMs || 60000,
      globalMaxRequests: options.globalMaxRequests || 1000,
      
      // IP-based limits
      ipEnabled: options.ipEnabled !== false,
      ipWindowMs: options.ipWindowMs || 60000,
      ipMaxRequests: options.ipMaxRequests || 50,
      
      // User-based limits
      userEnabled: options.userEnabled !== false,
      userWindowMs: options.userWindowMs || 60000,
      userMaxRequests: options.userMaxRequests || 100,
      
      // API key limits
      apiKeyEnabled: options.apiKeyEnabled !== false,
      apiKeyWindowMs: options.apiKeyWindowMs || 60000,
      apiKeyMaxRequests: options.apiKeyMaxRequests || 1000,
      
      // Service-specific limits
      serviceLimits: options.serviceLimits || {},
      
      // DDoS protection
      ddosProtection: options.ddosProtection !== false,
      ddosThreshold: options.ddosThreshold || 100, // requests per second
      ddosBlockDuration: options.ddosBlockDuration || 300000, // 5 minutes
      
      // Advanced features
      slidingWindow: options.slidingWindow !== false,
      costBasedLimiting: options.costBasedLimiting !== false,
      hierarchicalLimiting: options.hierarchicalLimiting !== false,
      
      // Monitoring and metrics
      enableMetrics: options.enableMetrics !== false,
      enableLogging: options.enableLogging !== false,
      
      // Environment
      environment: process.env.NODE_ENV || 'development',
      
      ...options
    };

    this.redis = Redis.createClient({
      url: this.options.redisUrl,
      socket: {
        tls: this.options.environment === 'production',
        reconnectStrategy: (retries) => Math.min(retries * 100, 5000)
      }
    });

    this.logger = new Logger({
      service: 'rate-limiter',
      level: this.options.environment === 'production' ? 'warn' : 'info'
    });

    this.metrics = new MetricsCollector({
      service: 'rate-limiter',
      rateLimiting: true
    });

    // Rate limit configurations
    this.limiters = new Map();
    this.ddosTracker = new Map();
    this.blockedKeys = new Map();

    // Statistics
    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      rateLimitedRequests: 0,
      ddosBlockedRequests: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    // Cache for frequent keys
    this.localCache = new Map();
    this.cacheTTL = 10000; // 10 seconds

    this.initialized = false;
    this.shuttingDown = false;

    this.initialize();
  }

  /**
   * 🏗️ Initialize rate limiter
   */
  async initialize() {
    try {
      await this.redis.connect();
      await this.initializeDefaultLimiters();
      this.startCleanupTasks();
      this.startMetricsCollection();
      
      this.initialized = true;
      
      this.logger.info('Rate limiter initialized successfully', {
        features: {
          burstProtection: this.options.burstProtection,
          ddosProtection: this.options.ddosProtection,
          slidingWindow: this.options.slidingWindow,
          hierarchicalLimiting: this.options.hierarchicalLimiting
        }
      });

      this.emit('initialized', {
        timestamp: new Date().toISOString(),
        config: this.getConfigSummary()
      });

    } catch (error) {
      this.logger.error('Rate limiter initialization failed', {
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
   * 🚦 Check rate limit for a request
   */
  async checkRateLimit(request, identifier = null) {
    if (!this.initialized) {
      throw new RateLimitError('RATE_LIMITER_NOT_INITIALIZED');
    }

    if (this.shuttingDown) {
      throw new RateLimitError('RATE_LIMITER_SHUTTING_DOWN');
    }

    const startTime = performance.now();
    this.stats.totalRequests++;

    try {
      const context = this.buildRateLimitContext(request, identifier);
      
      // Check DDoS protection first
      if (this.options.ddosProtection) {
        const ddosCheck = await this.checkDDoSProtection(context);
        if (!ddosCheck.allowed) {
          this.stats.ddosBlockedRequests++;
          this.stats.blockedRequests++;
          
          this.logger.warn('Request blocked by DDoS protection', {
            identifier: context.identifier,
            ip: context.ip,
            reason: ddosCheck.reason
          });

          this.emit('requestBlocked', {
            type: 'ddos',
            context,
            reason: ddosCheck.reason,
            timestamp: new Date().toISOString()
          });

          throw new RateLimitError('DDoS_PROTECTION_TRIGGERED', {
            identifier: context.identifier,
            ip: context.ip,
            retryAfter: ddosCheck.retryAfter
          });
        }
      }

      // Check hierarchical rate limits
      const limitResults = await this.checkHierarchicalLimits(context);

      // Find the most restrictive limit
      const mostRestrictive = this.findMostRestrictiveLimit(limitResults);

      if (!mostRestrictive.allowed) {
        this.stats.rateLimitedRequests++;
        this.stats.blockedRequests++;

        this.logger.warn('Request rate limited', {
          identifier: context.identifier,
          ip: context.ip,
          limitType: mostRestrictive.type,
          remaining: mostRestrictive.remaining,
          retryAfter: mostRestrictive.retryAfter
        });

        this.emit('rateLimitExceeded', {
          context,
          limit: mostRestrictive,
          timestamp: new Date().toISOString()
        });

        throw new RateLimitError('RATE_LIMIT_EXCEEDED', {
          identifier: context.identifier,
          ip: context.ip,
          limitType: mostRestrictive.type,
          retryAfter: mostRestrictive.retryAfter,
          limit: mostRestrictive.limit,
          remaining: mostRestrictive.remaining
        });
      }

      // Request allowed
      this.stats.allowedRequests++;

      const responseTime = performance.now() - startTime;

      this.logger.debug('Request allowed', {
        identifier: context.identifier,
        ip: context.ip,
        responseTime: responseTime.toFixed(2),
        limits: limitResults.map(l => ({
          type: l.type,
          remaining: l.remaining,
          resetTime: l.resetTime
        }))
      });

      this.emit('requestAllowed', {
        context,
        limits: limitResults,
        responseTime,
        timestamp: new Date().toISOString()
      });

      return {
        allowed: true,
        limits: limitResults,
        responseTime
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      this.logger.error('Rate limit check failed', {
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
   * 🎯 Create custom rate limiter
   */
  async createLimiter(key, options = {}) {
    const limiterConfig = {
      windowMs: options.windowMs || this.options.defaultWindowMs,
      maxRequests: options.maxRequests || this.options.defaultMaxRequests,
      burstWindowMs: options.burstWindowMs || this.options.burstWindowMs,
      burstMaxRequests: options.burstMaxRequests || this.options.burstMaxRequests,
      costFactor: options.costFactor || 1,
      blockDuration: options.blockDuration || 0,
      ...options
    };

    this.limiters.set(key, limiterConfig);

    this.logger.info('Custom rate limiter created', {
      key,
      config: limiterConfig
    });

    return {
      check: (request, identifier) => this.checkCustomLimiter(key, request, identifier),
      update: (newOptions) => this.updateLimiter(key, newOptions),
      delete: () => this.deleteLimiter(key)
    };
  }

  /**
   * 📊 Get rate limit status
   */
  async getRateLimitStatus(identifier, ip = null) {
    const context = {
      identifier,
      ip: ip || 'unknown',
      userAgent: 'status-check',
      endpoint: 'status'
    };

    const limits = await this.checkHierarchicalLimits(context, true);
    
    return {
      identifier,
      ip,
      timestamp: new Date().toISOString(),
      limits: limits.map(limit => ({
        type: limit.type,
        allowed: limit.allowed,
        remaining: limit.remaining,
        limit: limit.limit,
        resetTime: limit.resetTime,
        retryAfter: limit.retryAfter
      })),
      blocked: this.isBlocked(identifier, ip)
    };
  }

  /**
   * 🔧 Update rate limit configuration
   */
  async updateConfiguration(newConfig) {
    this.options = { ...this.options, ...newConfig };
    
    // Reinitialize limiters with new configuration
    await this.initializeDefaultLimiters();

    this.logger.info('Rate limit configuration updated', {
      newConfig: this.getConfigSummary()
    });

    this.emit('configurationUpdated', {
      timestamp: new Date().toISOString(),
      config: this.getConfigSummary()
    });
  }

  /**
   * 🚫 Block a specific identifier
   */
  async blockIdentifier(identifier, durationMs = 3600000, reason = 'manual') { // 1 hour default
    const blockKey = `block:${identifier}`;
    const blockUntil = Date.now() + durationMs;

    await this.redis.setex(blockKey, Math.ceil(durationMs / 1000), 'blocked');
    this.blockedKeys.set(identifier, { until: blockUntil, reason });

    this.logger.warn('Identifier manually blocked', {
      identifier,
      durationMs,
      reason,
      blockUntil: new Date(blockUntil).toISOString()
    });

    this.emit('identifierBlocked', {
      identifier,
      durationMs,
      reason,
      blockUntil: new Date(blockUntil).toISOString(),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * ✅ Unblock a specific identifier
   */
  async unblockIdentifier(identifier) {
    const blockKey = `block:${identifier}`;
    
    await this.redis.del(blockKey);
    this.blockedKeys.delete(identifier);

    this.logger.info('Identifier unblocked', { identifier });

    this.emit('identifierUnblocked', {
      identifier,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 📈 Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      timestamp: new Date().toISOString(),
      activeLimiters: this.limiters.size,
      blockedIdentifiers: this.blockedKeys.size,
      ddosTracked: this.ddosTracker.size,
      cache: {
        size: this.localCache.size,
        hitRate: this.stats.totalRequests > 0 ? 
          (this.stats.cacheHits / this.stats.totalRequests) * 100 : 0
      }
    };
  }

  // 🔧 PRIVATE METHODS

  /**
   * 🏗️ Initialize default rate limiters
   */
  async initializeDefaultLimiters() {
    // Global limiter
    if (this.options.globalEnabled) {
      await this.createLimiter('global', {
        windowMs: this.options.globalWindowMs,
        maxRequests: this.options.globalMaxRequests,
        type: 'global'
      });
    }

    // IP-based limiter
    if (this.options.ipEnabled) {
      await this.createLimiter('ip', {
        windowMs: this.options.ipWindowMs,
        maxRequests: this.options.ipMaxRequests,
        type: 'ip'
      });
    }

    // User-based limiter
    if (this.options.userEnabled) {
      await this.createLimiter('user', {
        windowMs: this.options.userWindowMs,
        maxRequests: this.options.userMaxRequests,
        type: 'user'
      });
    }

    // API key limiter
    if (this.options.apiKeyEnabled) {
      await this.createLimiter('api_key', {
        windowMs: this.options.apiKeyWindowMs,
        maxRequests: this.options.apiKeyMaxRequests,
        type: 'api_key'
      });
    }

    // Service-specific limiters
    for (const [service, config] of Object.entries(this.options.serviceLimits)) {
      await this.createLimiter(`service:${service}`, {
        ...config,
        type: 'service'
      });
    }

    this.logger.info('Default rate limiters initialized', {
      count: this.limiters.size,
      types: Array.from(this.limiters.keys())
    });
  }

  /**
   * 🎯 Build rate limit context
   */
  buildRateLimitContext(request, identifier) {
    const ip = this.getClientIP(request);
    const userAgent = request.get('User-Agent') || 'unknown';
    const endpoint = request.path || 'unknown';
    const method = request.method || 'GET';
    
    // Generate identifier if not provided
    if (!identifier) {
      identifier = this.generateIdentifier(request);
    }

    return {
      identifier,
      ip,
      userAgent,
      endpoint,
      method,
      timestamp: Date.now()
    };
  }

  /**
   * 🌐 Get client IP address
   */
  getClientIP(request) {
    // Check various headers for client IP
    const headers = [
      'x-forwarded-for',
      'x-real-ip',
      'x-client-ip',
      'cf-connecting-ip', // CloudFlare
      'true-client-ip' // Akamai
    ];

    for (const header of headers) {
      const value = request.get(header);
      if (value) {
        // Handle comma-separated lists (x-forwarded-for)
        const ips = value.split(',').map(ip => ip.trim());
        return ips[0]; // First IP in the chain is the client
      }
    }

    // Fallback to connection remote address
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  /**
   * 🆔 Generate identifier for rate limiting
   */
  generateIdentifier(request) {
    const ip = this.getClientIP(request);
    const userAgent = request.get('User-Agent') || 'unknown';
    
    // Use API key if available
    const apiKey = request.get('x-api-key') || request.query.apiKey;
    if (apiKey) {
      return `api_key:${apiKey}`;
    }

    // Use user ID if available
    const userId = request.user?.id || request.get('x-user-id');
    if (userId) {
      return `user:${userId}`;
    }

    // Fallback to IP-based identifier
    return `ip:${ip}`;
  }

  /**
   * 🛡️ Check DDoS protection
   */
  async checkDDoSProtection(context) {
    const { ip, identifier } = context;
    
    // Check if already blocked
    if (this.isBlocked(identifier, ip)) {
      const blockInfo = this.blockedKeys.get(identifier) || this.blockedKeys.get(ip);
      return {
        allowed: false,
        reason: 'identifier_blocked',
        retryAfter: blockInfo.until - Date.now()
      };
    }

    // Track request for DDoS detection
    const now = Date.now();
    const windowStart = now - 1000; // 1 second window
    
    // Clean old entries
    this.cleanDDoSTracker(windowStart);

    // Add current request
    if (!this.ddosTracker.has(ip)) {
      this.ddosTracker.set(ip, []);
    }
    
    const ipRequests = this.ddosTracker.get(ip);
    ipRequests.push(now);

    // Check DDoS threshold
    if (ipRequests.length >= this.options.ddosThreshold) {
      // Block this IP
      await this.blockIdentifier(ip, this.options.ddosBlockDuration, 'ddos_protection');
      
      return {
        allowed: false,
        reason: 'ddos_detected',
        retryAfter: this.options.ddosBlockDuration
      };
    }

    return { allowed: true };
  }

  /**
   * 🏗️ Check hierarchical rate limits
   */
  async checkHierarchicalLimits(context, statusOnly = false) {
    const results = [];

    // Check different types of limits in hierarchy
    const limitTypes = [
      { type: 'global', key: 'global' },
      { type: 'ip', key: `ip:${context.ip}` },
      { type: 'user', key: context.identifier.startsWith('user:') ? context.identifier : null },
      { type: 'api_key', key: context.identifier.startsWith('api_key:') ? context.identifier : null },
      { type: 'service', key: `service:${context.endpoint.split('/')[1]}` } // First path segment as service
    ];

    for (const { type, key } of limitTypes) {
      if (!key || !this.limiters.has(type)) continue;

      const limiterConfig = this.limiters.get(type);
      const result = await this.checkSingleLimit(key, limiterConfig, context, statusOnly);
      
      if (result) {
        results.push({ type, key, ...result });
      }
    }

    return results;
  }

  /**
   * 📊 Check single rate limit
   */
  async checkSingleLimit(key, config, context, statusOnly = false) {
    const cacheKey = `${key}:${config.windowMs}`;
    
    // Check local cache first
    if (this.localCache.has(cacheKey)) {
      const cached = this.localCache.get(cacheKey);
      if (Date.now() < cached.expires) {
        this.stats.cacheHits++;
        return statusOnly ? cached.data : this.processLimitResult(cached.data, config);
      } else {
        this.localCache.delete(cacheKey);
      }
    }

    this.stats.cacheMisses++;

    const now = Date.now();
    const windowStart = this.options.slidingWindow ? 
      now - config.windowMs : 
      Math.floor(now / config.windowMs) * config.windowMs;

    const redisKey = `rate_limit:${key}:${windowStart}`;

    try {
      // Use Redis for distributed rate limiting
      const [currentCount, ttl] = await this.redis
        .multi()
        .incrby(redisKey, config.costFactor)
        .ttl(redisKey)
        .exec();

      // Set expiration if this is a new key
      if (currentCount === config.costFactor) {
        await this.redis.expire(redisKey, Math.ceil(config.windowMs / 1000));
      }

      const remaining = Math.max(0, config.maxRequests - currentCount);
      const resetTime = windowStart + config.windowMs;
      const retryAfter = resetTime - now;

      const result = {
        current: currentCount,
        remaining,
        limit: config.maxRequests,
        resetTime,
        retryAfter,
        allowed: currentCount <= config.maxRequests
      };

      // Cache result locally
      this.localCache.set(cacheKey, {
        data: result,
        expires: now + this.cacheTTL
      });

      // Check burst protection
      if (this.options.burstProtection && config.burstWindowMs) {
        const burstResult = await this.checkBurstProtection(key, config, context);
        if (!burstResult.allowed) {
          return burstResult;
        }
      }

      return statusOnly ? result : this.processLimitResult(result, config);

    } catch (error) {
      this.logger.error('Redis operation failed for rate limiting', {
        key,
        error: error.message
      });

      // Fallback: allow request if Redis is down
      return {
        current: 0,
        remaining: config.maxRequests,
        limit: config.maxRequests,
        resetTime: now + config.windowMs,
        retryAfter: 0,
        allowed: true,
        fallback: true
      };
    }
  }

  /**
   * 💥 Check burst protection
   */
  async checkBurstProtection(key, config, context) {
    const now = Date.now();
    const burstWindowStart = now - config.burstWindowMs;
    const burstKey = `burst:${key}:${burstWindowStart}`;

    try {
      const burstCount = await this.redis.incr(burstKey);
      
      if (burstCount === 1) {
        await this.redis.expire(burstKey, Math.ceil(config.burstWindowMs / 1000));
      }

      if (burstCount > config.burstMaxRequests) {
        return {
          current: burstCount,
          remaining: 0,
          limit: config.burstMaxRequests,
          resetTime: now + config.burstWindowMs,
          retryAfter: config.burstWindowMs,
          allowed: false,
          burst: true
        };
      }
    } catch (error) {
      // Allow on Redis failure for burst protection
      this.logger.warn('Burst protection check failed', {
        key,
        error: error.message
      });
    }

    return { allowed: true };
  }

  /**
   * 🎯 Process limit result
   */
  processLimitResult(result, config) {
    if (!result.allowed && config.blockDuration > 0) {
      // Auto-block this identifier
      this.blockIdentifier(result.key, config.blockDuration, 'rate_limit_exceeded')
        .catch(error => {
          this.logger.error('Auto-block failed', {
            identifier: result.key,
            error: error.message
          });
        });
    }

    return result;
  }

  /**
   * 🎚️ Find most restrictive limit
   */
  findMostRestrictiveLimit(limitResults) {
    if (limitResults.length === 0) {
      return { allowed: true, remaining: Infinity, retryAfter: 0 };
    }

    // Sort by remaining requests (ascending) and then by retryAfter (descending)
    const sorted = limitResults.sort((a, b) => {
      if (a.allowed !== b.allowed) return a.allowed ? 1 : -1;
      if (a.remaining !== b.remaining) return a.remaining - b.remaining;
      return b.retryAfter - a.retryAfter;
    });

    return sorted[0];
  }

  /**
   * 🚫 Check if identifier is blocked
   */
  isBlocked(identifier, ip) {
    // Check identifier block
    if (this.blockedKeys.has(identifier)) {
      const block = this.blockedKeys.get(identifier);
      if (Date.now() < block.until) {
        return true;
      } else {
        // Clean expired block
        this.blockedKeys.delete(identifier);
      }
    }

    // Check IP block
    if (ip && this.blockedKeys.has(ip)) {
      const block = this.blockedKeys.get(ip);
      if (Date.now() < block.until) {
        return true;
      } else {
        this.blockedKeys.delete(ip);
      }
    }

    return false;
  }

  /**
   * 🧹 Clean DDoS tracker
   */
  cleanDDoSTracker(windowStart) {
    for (const [ip, requests] of this.ddosTracker.entries()) {
      const validRequests = requests.filter(time => time >= windowStart);
      
      if (validRequests.length === 0) {
        this.ddosTracker.delete(ip);
      } else {
        this.ddosTracker.set(ip, validRequests);
      }
    }
  }

  /**
   * 🧹 Start cleanup tasks
   */
  startCleanupTasks() {
    // Clean local cache every minute
    this.cacheCleanupInterval = setInterval(() => {
      this.cleanLocalCache();
    }, 60000);

    // Clean DDoS tracker every 30 seconds
    this.ddosCleanupInterval = setInterval(() => {
      this.cleanDDoSTracker(Date.now() - 5000); // Keep last 5 seconds
    }, 30000);

    // Clean blocked keys every 5 minutes
    this.blockCleanupInterval = setInterval(() => {
      this.cleanBlockedKeys();
    }, 300000);
  }

  /**
   * 🧹 Clean local cache
   */
  cleanLocalCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.localCache.entries()) {
      if (now >= value.expires) {
        this.localCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug('Local cache cleaned', { cleaned });
    }
  }

  /**
   * 🧹 Clean blocked keys
   */
  cleanBlockedKeys() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, block] of this.blockedKeys.entries()) {
      if (now >= block.until) {
        this.blockedKeys.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug('Blocked keys cleaned', { cleaned });
    }
  }

  /**
   * 📈 Start metrics collection
   */
  startMetricsCollection() {
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

      // Record basic metrics
      this.metrics.recordGauge('rate_limiter.requests.total', stats.totalRequests);
      this.metrics.recordGauge('rate_limiter.requests.allowed', stats.allowedRequests);
      this.metrics.recordGauge('rate_limiter.requests.blocked', stats.blockedRequests);
      this.metrics.recordGauge('rate_limiter.requests.rate_limited', stats.rateLimitedRequests);
      this.metrics.recordGauge('rate_limiter.requests.ddos_blocked', stats.ddosBlockedRequests);

      // Record cache metrics
      this.metrics.recordGauge('rate_limiter.cache.size', stats.cache.size);
      this.metrics.recordGauge('rate_limiter.cache.hit_rate', stats.cache.hitRate);

      // Record active trackers
      this.metrics.recordGauge('rate_limiter.active_limiters', stats.activeLimiters);
      this.metrics.recordGauge('rate_limiter.blocked_identifiers', stats.blockedIdentifiers);
      this.metrics.recordGauge('rate_limiter.ddos_tracked', stats.ddosTracked);

      this.emit('metricsCollected', {
        stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Metrics collection failed', { error: error.message });
    }
  }

  /**
   * 🔧 Check custom limiter
   */
  async checkCustomLimiter(key, request, identifier) {
    const context = this.buildRateLimitContext(request, identifier);
    const limiterConfig = this.limiters.get(key);
    
    if (!limiterConfig) {
      throw new RateLimitError('LIMITER_NOT_FOUND', { key });
    }

    const result = await this.checkSingleLimit(key, limiterConfig, context);
    return result;
  }

  /**
   * 🔄 Update limiter configuration
   */
  async updateLimiter(key, newOptions) {
    const existingConfig = this.limiters.get(key);
    
    if (!existingConfig) {
      throw new RateLimitError('LIMITER_NOT_FOUND', { key });
    }

    const updatedConfig = { ...existingConfig, ...newOptions };
    this.limiters.set(key, updatedConfig);

    this.logger.info('Limiter configuration updated', { key, config: updatedConfig });

    this.emit('limiterUpdated', {
      key,
      config: updatedConfig,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 🗑️ Delete limiter
   */
  async deleteLimiter(key) {
    const deleted = this.limiters.delete(key);
    
    if (deleted) {
      this.logger.info('Limiter deleted', { key });
      
      this.emit('limiterDeleted', {
        key,
        timestamp: new Date().toISOString()
      });
    }

    return deleted;
  }

  /**
   * 📋 Get configuration summary
   */
  getConfigSummary() {
    return {
      defaultWindowMs: this.options.defaultWindowMs,
      defaultMaxRequests: this.options.defaultMaxRequests,
      burstProtection: this.options.burstProtection,
      ddosProtection: this.options.ddosProtection,
      slidingWindow: this.options.slidingWindow,
      hierarchicalLimiting: this.options.hierarchicalLimiting,
      limiters: this.limiters.size
    };
  }

  /**
   * 🧹 Graceful shutdown
   */
  async shutdown() {
    this.shuttingDown = true;
    
    try {
      // Clear intervals
      if (this.cacheCleanupInterval) clearInterval(this.cacheCleanupInterval);
      if (this.ddosCleanupInterval) clearInterval(this.ddosCleanupInterval);
      if (this.blockCleanupInterval) clearInterval(this.blockCleanupInterval);
      if (this.metricsInterval) clearInterval(this.metricsInterval);

      // Close Redis connection
      if (this.redis.isOpen) {
        await this.redis.quit();
      }

      this.logger.info('Rate limiter shut down gracefully');

      this.emit('shutdownCompleted', {
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Rate limiter shutdown failed', { error: error.message });
      throw error;
    }
  }
}

// 🏢 Enterprise-grade error handling
class RateLimitError extends Error {
  constructor(code, context = {}) {
    super(code);
    this.name = 'RateLimitError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Set appropriate HTTP status codes
    const statusCodes = {
      'RATE_LIMIT_EXCEEDED': 429,
      'DDoS_PROTECTION_TRIGGERED': 429,
      'IDENTIFIER_BLOCKED': 403,
      'LIMITER_NOT_FOUND': 404,
      'RATE_LIMITER_NOT_INITIALIZED': 503,
      'RATE_LIMITER_SHUTTING_DOWN': 503,
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
  RateLimiter,
  RateLimitError
};