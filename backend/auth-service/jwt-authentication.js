// auth-service/jwt-authentication.js

/**
 * 🏢 MOSA FORGE - Enterprise JWT Authentication Service
 * 🔐 Secure token-based authentication with advanced security features
 * 🔧 Powered by Chereka | Founded by Oumer Muktar
 * 
 * @module JWTAuthentication
 * @version Enterprise 1.0
 */

const { EventEmitter } = require('events');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Redis = require('redis');
const { PrismaClient } = require('@prisma/client');
const { performance } = require('perf_hooks');
const { Logger } = require('../../utils/logger');
const { MetricsCollector } = require('../../utils/metrics-collector');

class JWTAuthentication extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      // JWT Configuration
      secret: options.secret || process.env.JWT_SECRET,
      issuer: options.issuer || process.env.JWT_ISSUER || 'mosa-forge',
      audience: options.audience || process.env.JWT_AUDIENCE || 'mosa-forge-app',
      
      // Token expiration
      accessTokenExpiry: options.accessTokenExpiry || '15m',
      refreshTokenExpiry: options.refreshTokenExpiry || '7d',
      shortLivedTokenExpiry: options.shortLivedTokenExpiry || '5m',
      
      // Redis configuration
      redisUrl: options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      
      // Security features
      enableRefreshTokens: options.enableRefreshTokens !== false,
      enableTokenBlacklisting: options.enableTokenBlacklisting !== false,
      enableTokenRotation: options.enableTokenRotation !== false,
      enableFingerprinting: options.enableFingerprinting !== false,
      enableRateLimiting: options.enableRateLimiting !== false,
      
      // Rate limiting
      rateLimitWindow: options.rateLimitWindow || 900000, // 15 minutes
      rateLimitMax: options.rateLimitMax || 5, // 5 attempts
      
      // Token invalidation
      blacklistCleanupInterval: options.blacklistCleanupInterval || 3600000, // 1 hour
      sessionCleanupInterval: options.sessionCleanupInterval || 86400000, // 24 hours
      
      // Advanced security
      maxActiveSessions: options.maxActiveSessions || 5,
      requireDeviceAuthorization: options.requireDeviceAuthorization !== false,
      enableGeolocation: options.enableGeolocation !== false,
      
      // Monitoring
      enableMetrics: options.enableMetrics !== false,
      enableAuditLog: options.enableAuditLog !== false,
      
      // Environment
      environment: process.env.NODE_ENV || 'development',
      
      ...options
    };

    // Validate required configuration
    if (!this.options.secret) {
      throw new Error('JWT_SECRET is required for authentication service');
    }

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
      service: 'jwt-authentication',
      level: this.options.environment === 'production' ? 'info' : 'debug'
    });

    this.metrics = new MetricsCollector({
      service: 'jwt-authentication',
      security: true
    });

    // Key management
    this.keyVersion = 'v1';
    this.keyRotationInterval = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    // Statistics
    this.stats = {
      tokensGenerated: 0,
      tokensVerified: 0,
      tokensRefreshed: 0,
      tokensRevoked: 0,
      failedVerifications: 0,
      cacheHits: 0,
      cacheMisses: 0,
      securityEvents: 0
    };

    // Active sessions tracking
    this.activeSessions = new Map();
    
    this.initialized = false;
    this.shuttingDown = false;

    this.initialize();
  }

  /**
   * 🏗️ Initialize JWT Authentication Service
   */
  async initialize() {
    try {
      await this.redis.connect();
      await this.initializeKeyRotation();
      this.startCleanupTasks();
      this.startMetricsCollection();
      this.startKeyRotation();
      
      this.initialized = true;
      
      this.logger.info('JWT Authentication Service initialized successfully', {
        features: {
          refreshTokens: this.options.enableRefreshTokens,
          tokenBlacklisting: this.options.enableTokenBlacklisting,
          tokenRotation: this.options.enableTokenRotation,
          deviceFingerprinting: this.options.enableFingerprinting
        },
        tokenExpiry: {
          access: this.options.accessTokenExpiry,
          refresh: this.options.refreshTokenExpiry
        }
      });

      this.emit('initialized', {
        timestamp: new Date().toISOString(),
        keyVersion: this.keyVersion
      });

    } catch (error) {
      this.logger.error('JWT Authentication Service initialization failed', {
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
   * 🔐 Generate Access Token
   */
  async generateAccessToken(user, context = {}) {
    if (!this.initialized) {
      throw new AuthError('AUTH_SERVICE_NOT_INITIALIZED');
    }

    const startTime = performance.now();

    try {
      // Validate user data
      this.validateUserData(user);
      
      // Check session limits
      await this.checkSessionLimits(user.id, context);
      
      // Generate token ID for tracking
      const tokenId = this.generateTokenId();
      
      // Prepare token payload
      const payload = this.buildTokenPayload(user, context);
      
      // Generate device fingerprint
      const deviceFingerprint = this.options.enableFingerprinting ? 
        await this.generateDeviceFingerprint(context) : null;

      // Create token with enhanced security claims
      const token = jwt.sign(payload, this.getSigningKey(), {
        issuer: this.options.issuer,
        audience: this.options.audience,
        expiresIn: this.options.accessTokenExpiry,
        jwtid: tokenId,
        subject: user.id.toString(),
        keyid: this.keyVersion
      });

      // Store token metadata
      await this.storeTokenMetadata(tokenId, user.id, payload, deviceFingerprint, context);
      
      // Track active session
      await this.trackActiveSession(user.id, tokenId, context);

      this.stats.tokensGenerated++;

      const responseTime = performance.now() - startTime;

      this.logger.info('Access token generated', {
        userId: user.id,
        tokenId,
        expiresIn: this.options.accessTokenExpiry,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('tokenGenerated', {
        userId: user.id,
        tokenId,
        type: 'access',
        timestamp: new Date().toISOString(),
        context: this.sanitizeContext(context)
      });

      return {
        accessToken: token,
        tokenId,
        expiresIn: this.parseExpiry(this.options.accessTokenExpiry),
        tokenType: 'Bearer'
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      this.logger.error('Access token generation failed', {
        userId: user.id,
        error: error.message,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('tokenGenerationFailed', {
        userId: user.id,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * 🔄 Generate Refresh Token
   */
  async generateRefreshToken(userId, accessTokenId, context = {}) {
    if (!this.options.enableRefreshTokens) {
      throw new AuthError('REFRESH_TOKENS_DISABLED');
    }

    const startTime = performance.now();

    try {
      const refreshTokenId = this.generateTokenId();
      const refreshToken = crypto.randomBytes(64).toString('hex');
      
      // Hash refresh token for secure storage
      const hashedToken = this.hashToken(refreshToken);
      
      // Store refresh token
      await this.storeRefreshToken(
        refreshTokenId, 
        userId, 
        accessTokenId, 
        hashedToken, 
        context
      );

      this.stats.tokensGenerated++;

      const responseTime = performance.now() - startTime;

      this.logger.info('Refresh token generated', {
        userId,
        refreshTokenId,
        linkedAccessToken: accessTokenId
      });

      this.emit('refreshTokenGenerated', {
        userId,
        refreshTokenId,
        accessTokenId,
        timestamp: new Date().toISOString()
      });

      return {
        refreshToken,
        refreshTokenId,
        expiresIn: this.parseExpiry(this.options.refreshTokenExpiry)
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      this.logger.error('Refresh token generation failed', {
        userId,
        error: error.message,
        responseTime: responseTime.toFixed(2)
      });

      throw error;
    }
  }

  /**
   * 🔍 Verify Access Token
   */
  async verifyAccessToken(token, context = {}) {
    if (!this.initialized) {
      throw new AuthError('AUTH_SERVICE_NOT_INITIALIZED');
    }

    const startTime = performance.now();
    this.stats.tokensVerified++;

    try {
      // Check blacklist first
      if (this.options.enableTokenBlacklisting) {
        const isBlacklisted = await this.isTokenBlacklisted(token);
        if (isBlacklisted) {
          throw new AuthError('TOKEN_BLACKLISTED');
        }
      }

      // Verify token signature and claims
      const decoded = jwt.verify(token, this.getVerificationKey(), {
        issuer: this.options.issuer,
        audience: this.options.audience,
        algorithms: ['HS256']
      });

      // Validate token context
      await this.validateTokenContext(decoded, context);

      // Check if token is expired in our records
      const isValidInStore = await this.validateTokenInStore(decoded.jti, decoded.sub);
      if (!isValidInStore) {
        throw new AuthError('TOKEN_INVALIDATED');
      }

      // Update last used timestamp
      await this.updateTokenUsage(decoded.jti, context);

      const responseTime = performance.now() - startTime;

      this.logger.debug('Access token verified', {
        userId: decoded.sub,
        tokenId: decoded.jti,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('tokenVerified', {
        userId: decoded.sub,
        tokenId: decoded.jti,
        timestamp: new Date().toISOString()
      });

      return {
        valid: true,
        payload: decoded,
        tokenId: decoded.jti,
        userId: decoded.sub
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      this.stats.failedVerifications++;

      this.logger.warn('Access token verification failed', {
        error: error.message,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('tokenVerificationFailed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return {
        valid: false,
        error: error.message,
        code: error instanceof AuthError ? error.code : 'VERIFICATION_FAILED'
      };
    }
  }

  /**
   * 🔄 Refresh Access Token
   */
  async refreshAccessToken(refreshToken, context = {}) {
    if (!this.options.enableRefreshTokens) {
      throw new AuthError('REFRESH_TOKENS_DISABLED');
    }

    const startTime = performance.now();

    try {
      // Validate refresh token
      const refreshTokenInfo = await this.validateRefreshToken(refreshToken, context);
      
      // Get user information
      const user = await this.getUserById(refreshTokenInfo.userId);
      if (!user) {
        throw new AuthError('USER_NOT_FOUND');
      }

      // Revoke old access token
      await this.revokeToken(refreshTokenInfo.accessTokenId, 'token_refresh');

      // Generate new access token
      const newAccessToken = await this.generateAccessToken(user, context);
      
      // Generate new refresh token (if rotation enabled)
      let newRefreshToken;
      if (this.options.enableTokenRotation) {
        await this.revokeRefreshToken(refreshTokenInfo.refreshTokenId, 'token_rotation');
        newRefreshToken = await this.generateRefreshToken(
          user.id, 
          newAccessToken.tokenId, 
          context
        );
      }

      this.stats.tokensRefreshed++;

      const responseTime = performance.now() - startTime;

      this.logger.info('Access token refreshed', {
        userId: user.id,
        oldToken: refreshTokenInfo.accessTokenId,
        newToken: newAccessToken.tokenId,
        responseTime: responseTime.toFixed(2)
      });

      this.emit('tokenRefreshed', {
        userId: user.id,
        oldTokenId: refreshTokenInfo.accessTokenId,
        newTokenId: newAccessToken.tokenId,
        timestamp: new Date().toISOString()
      });

      return {
        accessToken: newAccessToken.accessToken,
        refreshToken: newRefreshToken?.refreshToken,
        tokenId: newAccessToken.tokenId,
        expiresIn: newAccessToken.expiresIn
      };

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      this.logger.error('Token refresh failed', {
        error: error.message,
        responseTime: responseTime.toFixed(2)
      });

      throw error;
    }
  }

  /**
   * 🚫 Revoke Token
   */
  async revokeToken(tokenId, reason = 'user_revoked') {
    if (!this.initialized) {
      throw new AuthError('AUTH_SERVICE_NOT_INITIALIZED');
    }

    try {
      // Add to blacklist
      if (this.options.enableTokenBlacklisting) {
        await this.addToBlacklist(tokenId, reason);
      }

      // Remove from active sessions
      await this.removeActiveSession(tokenId);

      // Update token status in database
      await this.updateTokenStatus(tokenId, 'revoked', reason);

      this.stats.tokensRevoked++;

      this.logger.info('Token revoked', {
        tokenId,
        reason
      });

      this.emit('tokenRevoked', {
        tokenId,
        reason,
        timestamp: new Date().toISOString()
      });

      return { success: true, tokenId, reason };

    } catch (error) {
      this.logger.error('Token revocation failed', {
        tokenId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 🚫 Revoke All User Sessions
   */
  async revokeAllUserSessions(userId, reason = 'user_requested') {
    try {
      const activeSessions = await this.getUserActiveSessions(userId);
      
      const revocationPromises = activeSessions.map(session =>
        this.revokeToken(session.tokenId, reason)
      );

      await Promise.all(revocationPromises);

      this.logger.info('All user sessions revoked', {
        userId,
        sessionsRevoked: activeSessions.length,
        reason
      });

      this.emit('allSessionsRevoked', {
        userId,
        sessionsRevoked: activeSessions.length,
        reason,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        sessionsRevoked: activeSessions.length,
        reason
      };

    } catch (error) {
      this.logger.error('User sessions revocation failed', {
        userId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 📊 Get Token Information
   */
  async getTokenInfo(tokenId) {
    try {
      const tokenInfo = await this.redis.hgetall(`token:${tokenId}`);
      
      if (!tokenInfo || Object.keys(tokenInfo).length === 0) {
        throw new AuthError('TOKEN_NOT_FOUND');
      }

      return {
        tokenId,
        userId: tokenInfo.userId,
        issuedAt: new Date(parseInt(tokenInfo.issuedAt)),
        expiresAt: new Date(parseInt(tokenInfo.expiresAt)),
        lastUsed: tokenInfo.lastUsed ? new Date(parseInt(tokenInfo.lastUsed)) : null,
        deviceInfo: tokenInfo.deviceInfo ? JSON.parse(tokenInfo.deviceInfo) : null,
        status: tokenInfo.status || 'active'
      };

    } catch (error) {
      this.logger.error('Failed to get token info', {
        tokenId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * 👤 Get User Active Sessions
   */
  async getUserActiveSessions(userId) {
    try {
      const sessionKeys = await this.redis.keys(`user_sessions:${userId}:*`);
      
      const sessions = await Promise.all(
        sessionKeys.map(async (key) => {
          const tokenId = key.split(':')[2];
          return await this.getTokenInfo(tokenId);
        })
      );

      return sessions.filter(session => session.status === 'active');

    } catch (error) {
      this.logger.error('Failed to get user sessions', {
        userId,
        error: error.message
      });

      return [];
    }
  }

  // 🔧 PRIVATE METHODS

  /**
   * 🏗️ Initialize Key Rotation
   */
  async initializeKeyRotation() {
    try {
      // Load current key version from Redis
      const currentKey = await this.redis.get('jwt:current_key');
      
      if (currentKey) {
        this.keyVersion = currentKey;
      } else {
        // Generate initial key version
        this.keyVersion = `v1-${Date.now()}`;
        await this.redis.set('jwt:current_key', this.keyVersion);
      }

      // Store current signing key
      await this.storeSigningKey(this.keyVersion, this.options.secret);

      this.logger.info('Key rotation initialized', {
        currentKeyVersion: this.keyVersion
      });

    } catch (error) {
      this.logger.error('Key rotation initialization failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🔑 Get Signing Key
   */
  getSigningKey() {
    return this.options.secret;
  }

  /**
   * 🔑 Get Verification Key
   */
  getVerificationKey() {
    // In production, this would handle multiple key versions
    return this.options.secret;
  }

  /**
   * 💾 Store Signing Key
   */
  async storeSigningKey(version, key) {
    await this.redis.set(`jwt:key:${version}`, key);
  }

  /**
   * ✅ Validate User Data
   */
  validateUserData(user) {
    if (!user || !user.id) {
      throw new AuthError('INVALID_USER_DATA');
    }

    if (!user.role) {
      throw new AuthError('USER_ROLE_REQUIRED');
    }
  }

  /**
   * 🆔 Generate Token ID
   */
  generateTokenId() {
    return `tok_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * 📦 Build Token Payload
   */
  buildTokenPayload(user, context) {
    const now = Math.floor(Date.now() / 1000);
    const expiry = this.parseExpiry(this.options.accessTokenExpiry);

    const payload = {
      // Standard claims
      iss: this.options.issuer,
      aud: this.options.audience,
      sub: user.id.toString(),
      iat: now,
      exp: now + expiry,
      
      // Custom claims
      role: user.role,
      permissions: user.permissions || [],
      faydaId: user.faydaId,
      
      // Security claims
      'mosa:token_type': 'access',
      'mosa:key_version': this.keyVersion
    };

    // Add context information if available
    if (context.ip) {
      payload['mosa:ip'] = context.ip;
    }

    if (this.options.enableFingerprinting && context.userAgent) {
      payload['mosa:user_agent'] = context.userAgent;
    }

    return payload;
  }

  /**
   * 📅 Parse Expiry Time
   */
  parseExpiry(expiry) {
    if (typeof expiry === 'number') return expiry;
    
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    const multipliers = {
      's': 1,
      'm': 60,
      'h': 3600,
      'd': 86400
    };
    
    return value * (multipliers[unit] || 60);
  }

  /**
   * 💾 Store Token Metadata
   */
  async storeTokenMetadata(tokenId, userId, payload, deviceFingerprint, context) {
    const now = Date.now();
    const expiresAt = now + (this.parseExpiry(this.options.accessTokenExpiry) * 1000);

    const tokenData = {
      tokenId,
      userId,
      issuedAt: now.toString(),
      expiresAt: expiresAt.toString(),
      deviceFingerprint: deviceFingerprint ? JSON.stringify(deviceFingerprint) : null,
      ipAddress: context.ip || null,
      userAgent: context.userAgent || null,
      status: 'active'
    };

    // Store in Redis with TTL
    const ttl = Math.ceil((expiresAt - now) / 1000);
    await this.redis.hset(`token:${tokenId}`, tokenData);
    await this.redis.expire(`token:${tokenId}`, ttl);

    // Store in database for audit
    if (this.options.enableAuditLog) {
      await this.storeTokenAudit(tokenId, userId, context);
    }
  }

  /**
   * 💾 Store Token Audit
   */
  async storeTokenAudit(tokenId, userId, context) {
    try {
      await this.prisma.tokenAudit.create({
        data: {
          tokenId,
          userId,
          action: 'GENERATE',
          ipAddress: context.ip,
          userAgent: context.userAgent,
          deviceInfo: context.deviceInfo,
          timestamp: new Date()
        }
      });
    } catch (error) {
      this.logger.error('Failed to store token audit', {
        tokenId,
        error: error.message
      });
    }
  }

  /**
   * 📱 Generate Device Fingerprint
   */
  async generateDeviceFingerprint(context) {
    const fingerprintData = {
      userAgent: context.userAgent,
      acceptHeaders: context.acceptHeaders,
      language: context.language,
      platform: context.platform,
      timezone: context.timezone,
      screenResolution: context.screenResolution,
      plugins: context.plugins
    };

    const fingerprintString = JSON.stringify(fingerprintData);
    return crypto.createHash('sha256').update(fingerprintString).digest('hex');
  }

  /**
   * 👥 Check Session Limits
   */
  async checkSessionLimits(userId, context) {
    if (!this.options.maxActiveSessions) return;

    const activeSessions = await this.getUserActiveSessions(userId);
    
    if (activeSessions.length >= this.options.maxActiveSessions) {
      // Revoke oldest session
      const oldestSession = activeSessions.sort((a, b) => 
        new Date(a.issuedAt) - new Date(b.issuedAt)
      )[0];

      await this.revokeToken(oldestSession.tokenId, 'session_limit_exceeded');

      this.logger.warn('Session limit exceeded, revoked oldest session', {
        userId,
        maxSessions: this.options.maxActiveSessions,
        revokedToken: oldestSession.tokenId
      });
    }
  }

  /**
   * 📍 Track Active Session
   */
  async trackActiveSession(userId, tokenId, context) {
    const sessionKey = `user_sessions:${userId}:${tokenId}`;
    const expiresAt = Date.now() + (this.parseExpiry(this.options.accessTokenExpiry) * 1000);
    
    await this.redis.setex(
      sessionKey, 
      Math.ceil(this.parseExpiry(this.options.accessTokenExpiry)), 
      JSON.stringify({
        tokenId,
        issuedAt: Date.now(),
        context: this.sanitizeContext(context)
      })
    );
  }

  /**
   * 🗑️ Remove Active Session
   */
  async removeActiveSession(tokenId) {
    // This would remove the session from user_sessions tracking
    // Implementation depends on how sessions are stored
  }

  /**
   * 🚫 Add to Blacklist
   */
  async addToBlacklist(tokenId, reason) {
    const expiresAt = Date.now() + (this.parseExpiry(this.options.accessTokenExpiry) * 1000);
    const ttl = Math.ceil((expiresAt - Date.now()) / 1000);

    await this.redis.setex(
      `blacklist:token:${tokenId}`,
      ttl,
      JSON.stringify({
        reason,
        blacklistedAt: Date.now(),
        expiresAt
      })
    );
  }

  /**
   * 🚫 Check Token Blacklist
   */
  async isTokenBlacklisted(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.jti) return false;

      const blacklisted = await this.redis.exists(`blacklist:token:${decoded.jti}`);
      return !!blacklisted;

    } catch (error) {
      return false;
    }
  }

  /**
   * 🔍 Validate Token Context
   */
  async validateTokenContext(decoded, context) {
    // Check IP address if required
    if (this.options.enableGeolocation && decoded['mosa:ip']) {
      if (context.ip && decoded['mosa:ip'] !== context.ip) {
        this.stats.securityEvents++;
        this.logger.warn('Token IP mismatch', {
          tokenId: decoded.jti,
          expectedIp: decoded['mosa:ip'],
          actualIp: context.ip
        });

        // In strict mode, this would invalidate the token
        if (this.options.requireDeviceAuthorization) {
          throw new AuthError('IP_MISMATCH');
        }
      }
    }

    // Check device fingerprint if available
    if (this.options.enableFingerprinting && decoded['mosa:user_agent']) {
      if (context.userAgent && decoded['mosa:user_agent'] !== context.userAgent) {
        this.logger.warn('Token user agent mismatch', {
          tokenId: decoded.jti,
          expectedUA: decoded['mosa:user_agent'],
          actualUA: context.userAgent
        });
      }
    }
  }

  /**
   * ✅ Validate Token in Store
   */
  async validateTokenInStore(tokenId, userId) {
    try {
      const tokenInfo = await this.redis.hgetall(`token:${tokenId}`);
      
      if (!tokenInfo || tokenInfo.status !== 'active') {
        return false;
      }

      if (tokenInfo.userId !== userId) {
        return false;
      }

      return true;

    } catch (error) {
      return false;
    }
  }

  /**
   * 🔄 Update Token Usage
   */
  async updateTokenUsage(tokenId, context) {
    try {
      await this.redis.hset(`token:${tokenId}`, 'lastUsed', Date.now().toString());
      
      // Update audit log
      if (this.options.enableAuditLog) {
        await this.prisma.tokenAudit.create({
          data: {
            tokenId,
            userId: context.userId,
            action: 'VERIFY',
            ipAddress: context.ip,
            userAgent: context.userAgent,
            timestamp: new Date()
          }
        });
      }
    } catch (error) {
      this.logger.error('Failed to update token usage', {
        tokenId,
        error: error.message
      });
    }
  }

  /**
   * 🔐 Hash Token
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * 💾 Store Refresh Token
   */
  async storeRefreshToken(refreshTokenId, userId, accessTokenId, hashedToken, context) {
    const expiresAt = Date.now() + (this.parseExpiry(this.options.refreshTokenExpiry) * 1000);
    const ttl = Math.ceil((expiresAt - Date.now()) / 1000);

    const refreshTokenData = {
      refreshTokenId,
      userId,
      accessTokenId,
      hashedToken,
      issuedAt: Date.now().toString(),
      expiresAt: expiresAt.toString(),
      status: 'active'
    };

    await this.redis.hset(`refresh_token:${refreshTokenId}`, refreshTokenData);
    await this.redis.expire(`refresh_token:${refreshTokenId}`, ttl);
  }

  /**
   * ✅ Validate Refresh Token
   */
  async validateRefreshToken(refreshToken, context) {
    const refreshTokenId = this.generateTokenId(); // This would be extracted from the token
    const hashedToken = this.hashToken(refreshToken);

    const tokenData = await this.redis.hgetall(`refresh_token:${refreshTokenId}`);
    
    if (!tokenData || Object.keys(tokenData).length === 0) {
      throw new AuthError('REFRESH_TOKEN_NOT_FOUND');
    }

    if (tokenData.hashedToken !== hashedToken) {
      throw new AuthError('REFRESH_TOKEN_INVALID');
    }

    if (tokenData.status !== 'active') {
      throw new AuthError('REFRESH_TOKEN_REVOKED');
    }

    if (Date.now() > parseInt(tokenData.expiresAt)) {
      throw new AuthError('REFRESH_TOKEN_EXPIRED');
    }

    // Check rate limiting for refresh attempts
    await this.checkRefreshRateLimit(tokenData.userId, context);

    return {
      refreshTokenId,
      userId: tokenData.userId,
      accessTokenId: tokenData.accessTokenId
    };
  }

  /**
   * 🚦 Check Refresh Rate Limit
   */
  async checkRefreshRateLimit(userId, context) {
    if (!this.options.enableRateLimiting) return;

    const rateLimitKey = `rate_limit:refresh:${userId}`;
    const current = await this.redis.incr(rateLimitKey);
    
    if (current === 1) {
      await this.redis.expire(rateLimitKey, Math.ceil(this.options.rateLimitWindow / 1000));
    }

    if (current > this.options.rateLimitMax) {
      throw new AuthError('REFRESH_RATE_LIMIT_EXCEEDED');
    }
  }

  /**
   * 🚫 Revoke Refresh Token
   */
  async revokeRefreshToken(refreshTokenId, reason) {
    await this.redis.hset(`refresh_token:${refreshTokenId}`, 'status', 'revoked');
    
    this.logger.info('Refresh token revoked', {
      refreshTokenId,
      reason
    });
  }

  /**
   * 👤 Get User by ID
   */
  async getUserById(userId) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          faydaId: true,
          permissions: true,
          status: true
        }
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new AuthError('USER_NOT_FOUND');
      }

      return user;

    } catch (error) {
      this.logger.error('Failed to get user', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 📝 Update Token Status
   */
  async updateTokenStatus(tokenId, status, reason) {
    await this.redis.hset(`token:${tokenId}`, 'status', status);
    
    // Log status change
    this.logger.debug('Token status updated', {
      tokenId,
      status,
      reason
    });
  }

  /**
   * 🎭 Sanitize Context
   */
  sanitizeContext(context) {
    return {
      ip: context.ip ? `${context.ip.split('.')[0]}.***.***.***` : null,
      userAgent: context.userAgent ? context.userAgent.substring(0, 50) + '...' : null,
      deviceId: context.deviceId ? `${context.deviceId.substring(0, 8)}***` : null
    };
  }

  /**
   * 🔑 Start Key Rotation
   */
  startKeyRotation() {
    if (this.keyRotationInterval) {
      this.keyRotationTimer = setInterval(() => {
        this.rotateKeys();
      }, this.keyRotationInterval);
    }
  }

  /**
   * 🔄 Rotate Keys
   */
  async rotateKeys() {
    try {
      const newKeyVersion = `v${Date.now()}`;
      const newSecret = crypto.randomBytes(64).toString('hex');
      
      // Store new key
      await this.storeSigningKey(newKeyVersion, newSecret);
      
      // Update current key version
      await this.redis.set('jwt:current_key', newKeyVersion);
      
      // Keep old keys for verification for a period
      await this.redis.expire(`jwt:key:${this.keyVersion}`, 86400); // 24 hours
      
      this.keyVersion = newKeyVersion;
      this.options.secret = newSecret;

      this.logger.info('JWT keys rotated', {
        newKeyVersion,
        oldKeysExpire: '24h'
      });

      this.emit('keysRotated', {
        newKeyVersion,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Key rotation failed', {
        error: error.message
      });
    }
  }

  /**
   * 🧹 Start Cleanup Tasks
   */
  startCleanupTasks() {
    // Clean expired tokens
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, this.options.blacklistCleanupInterval);

    // Clean old sessions
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, this.options.sessionCleanupInterval);
  }

  /**
   * 🧹 Cleanup Expired Tokens
   */
  async cleanupExpiredTokens() {
    try {
      // Redis automatically expires tokens based on TTL
      // This would clean up any orphaned records in the database
      const result = await this.prisma.tokenAudit.deleteMany({
        where: {
          timestamp: {
            lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
          }
        }
      });

      if (result.count > 0) {
        this.logger.debug('Expired token audits cleaned up', {
          count: result.count
        });
      }

    } catch (error) {
      this.logger.error('Token cleanup failed', { error: error.message });
    }
  }

  /**
   * 🧹 Cleanup Old Sessions
   */
  async cleanupOldSessions() {
    try {
      // Clean up sessions older than 30 days
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      const sessionKeys = await this.redis.keys('user_sessions:*');
      let cleaned = 0;

      for (const key of sessionKeys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.issuedAt < thirtyDaysAgo) {
            await this.redis.del(key);
            cleaned++;
          }
        }
      }

      if (cleaned > 0) {
        this.logger.debug('Old sessions cleaned up', { cleaned });
      }

    } catch (error) {
      this.logger.error('Session cleanup failed', { error: error.message });
    }
  }

  /**
   * 📈 Start Metrics Collection
   */
  startMetricsCollection() {
    if (!this.options.enableMetrics) return;

    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 60000); // Every minute
  }

  /**
   * 📊 Collect Metrics
   */
  async collectMetrics() {
    try {
      const stats = this.getStatistics();

      // Record token metrics
      this.metrics.recordGauge('jwt.tokens.generated', stats.tokensGenerated);
      this.metrics.recordGauge('jwt.tokens.verified', stats.tokensVerified);
      this.metrics.recordGauge('jwt.tokens.refreshed', stats.tokensRefreshed);
      this.metrics.recordGauge('jwt.tokens.revoked', stats.tokensRevoked);
      this.metrics.recordGauge('jwt.tokens.failed_verifications', stats.failedVerifications);

      // Record security metrics
      this.metrics.recordGauge('jwt.security.events', stats.securityEvents);

      // Record cache metrics
      this.metrics.recordGauge('jwt.cache.hits', stats.cacheHits);
      this.metrics.recordGauge('jwt.cache.misses', stats.cacheMisses);
      this.metrics.recordGauge('jwt.cache.hit_rate', 
        (stats.cacheHits + stats.cacheMisses) > 0 ? 
        (stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100 : 0
      );

      // Record active sessions
      const activeSessions = await this.getActiveSessionsCount();
      this.metrics.recordGauge('jwt.sessions.active', activeSessions);

      this.emit('metricsCollected', {
        stats,
        activeSessions,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Metrics collection failed', { error: error.message });
    }
  }

  /**
   * 👥 Get Active Sessions Count
   */
  async getActiveSessionsCount() {
    try {
      const sessionKeys = await this.redis.keys('user_sessions:*');
      return sessionKeys.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 📊 Get Statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      timestamp: new Date().toISOString(),
      keyVersion: this.keyVersion,
      features: {
        refreshTokens: this.options.enableRefreshTokens,
        tokenBlacklisting: this.options.enableTokenBlacklisting,
        tokenRotation: this.options.enableTokenRotation
      }
    };
  }

  /**
   * 🧹 Graceful Shutdown
   */
  async shutdown() {
    this.shuttingDown = true;
    
    try {
      // Clear intervals
      if (this.cleanupInterval) clearInterval(this.cleanupInterval);
      if (this.sessionCleanupInterval) clearInterval(this.sessionCleanupInterval);
      if (this.metricsInterval) clearInterval(this.metricsInterval);
      if (this.keyRotationTimer) clearInterval(this.keyRotationTimer);

      // Close Redis connection
      if (this.redis.isOpen) {
        await this.redis.quit();
      }

      // Close database connection
      await this.prisma.$disconnect();

      this.logger.info('JWT Authentication Service shut down gracefully');

      this.emit('shutdownCompleted', {
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('JWT Authentication Service shutdown failed', { error: error.message });
      throw error;
    }
  }
}

// 🏢 Enterprise-grade error handling
class AuthError extends Error {
  constructor(code, context = {}) {
    super(code);
    this.name = 'AuthError';
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Set appropriate HTTP status codes
    const statusCodes = {
      'AUTH_SERVICE_NOT_INITIALIZED': 503,
      'INVALID_USER_DATA': 400,
      'USER_ROLE_REQUIRED': 400,
      'REFRESH_TOKENS_DISABLED': 403,
      'TOKEN_BLACKLISTED': 401,
      'TOKEN_INVALIDATED': 401,
      'USER_NOT_FOUND': 404,
      'REFRESH_TOKEN_NOT_FOUND': 401,
      'REFRESH_TOKEN_INVALID': 401,
      'REFRESH_TOKEN_REVOKED': 401,
      'REFRESH_TOKEN_EXPIRED': 401,
      'REFRESH_RATE_LIMIT_EXCEEDED': 429,
      'IP_MISMATCH': 401,
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
  JWTAuthentication,
  AuthError
};