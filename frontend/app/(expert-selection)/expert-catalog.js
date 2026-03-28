/**
 * 🎯 MOSA FORGE: Enterprise Expert Catalog Service
 * 
 * @module ExpertCatalog
 * @description Advanced expert discovery, filtering, and matching system
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - AI-powered expert matching
 * - Quality-based ranking algorithm
 * - Real-time availability tracking
 * - Multi-dimensional filtering
 * - Performance-optimized search
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const NodeCache = require('node-cache');

// 🏗️ Enterprise Constants
const EXPERT_TIERS = {
    MASTER: { weight: 1.0, minQuality: 4.7, bonus: 0.2 },
    SENIOR: { weight: 0.8, minQuality: 4.3, bonus: 0.1 },
    STANDARD: { weight: 0.6, minQuality: 4.0, bonus: 0.0 },
    DEVELOPING: { weight: 0.4, minQuality: 3.5, bonus: -0.1 },
    PROBATION: { weight: 0.2, minQuality: 0.0, bonus: -0.2 }
};

const AVAILABILITY_STATUS = {
    AVAILABLE: 'available',
    LIMITED: 'limited',
    FULL: 'full',
    OFFLINE: 'offline'
};

/**
 * 🏗️ Enterprise Expert Catalog Class
 * @class ExpertCatalog
 * @extends EventEmitter
 */
class ExpertCatalog extends EventEmitter {
    constructor(options = {}) {
        super();

        // 🏗️ Enterprise Configuration
        this.config = {
            redis: options.redis || {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD
            },
            prisma: options.prisma || new PrismaClient(),
            cacheTtl: options.cacheTtl || 300, // 5 minutes
            searchLimit: options.searchLimit || 50,
            maxResults: options.maxResults || 100,
            qualityThreshold: options.qualityThreshold || 4.0
        };

        // 🏗️ Service Dependencies
        this.redis = new Redis(this.config.redis);
        this.prisma = this.config.prisma;
        this.cache = new NodeCache({ 
            stdTTL: this.config.cacheTtl,
            checkperiod: 60 
        });

        // 🏗️ Performance Monitoring
        this.metrics = {
            searchesPerformed: 0,
            cacheHits: 0,
            cacheMisses: 0,
            averageResponseTime: 0,
            expertMatches: 0
        };

        this._initializeEventHandlers();
        this._startCacheWarmup();
    }

    /**
     * 🏗️ Initialize Enterprise Event Handlers
     * @private
     */
    _initializeEventHandlers() {
        this.on('expert.search.performed', (data) => {
            this._logEvent('EXPERT_SEARCH_PERFORMED', data);
            this.metrics.searchesPerformed++;
        });

        this.on('expert.viewed', (data) => {
            this._logEvent('EXPERT_VIEWED', data);
        });

        this.on('expert.matched', (data) => {
            this._logEvent('EXPERT_MATCHED', data);
            this.metrics.expertMatches++;
        });

        this.on('cache.hit', (data) => {
            this.metrics.cacheHits++;
        });

        this.on('cache.miss', (data) => {
            this.metrics.cacheMisses++;
        });
    }

    /**
     * 🏗️ Cache Warmup for Performance
     * @private
     */
    _startCacheWarmup() {
        // Warm up cache with top experts periodically
        setInterval(async () => {
            try {
                await this._warmupTopExpertsCache();
            } catch (error) {
                this._logError('CACHE_WARMUP_FAILED', error);
            }
        }, 300000); // Every 5 minutes
    }

    /**
     * 🎯 MAIN ENTERPRISE METHOD: Get Expert Catalog
     * @param {Object} filters - Advanced filtering options
     * @returns {Promise<Object>} Paginated expert results
     */
    async getExpertCatalog(filters = {}) {
        const startTime = Date.now();
        const searchId = uuidv4();

        try {
            this.emit('expert.search.performed', { searchId, filters });

            // 🏗️ Validate and normalize filters
            const normalizedFilters = this._normalizeFilters(filters);
            
            // 🏗️ Check cache first
            const cacheKey = this._generateCacheKey('catalog', normalizedFilters);
            const cachedResult = await this._getCachedResult(cacheKey);
            
            if (cachedResult) {
                this.emit('cache.hit', { searchId, cacheKey });
                return this._formatCatalogResponse(cachedResult, searchId, Date.now() - startTime);
            }

            this.emit('cache.miss', { searchId, cacheKey });

            // 🏗️ Build advanced query
            const query = this._buildExpertQuery(normalizedFilters);
            
            // 🏗️ Execute search with performance monitoring
            const experts = await this._executeExpertSearch(query);
            
            // 🏗️ Apply ranking and scoring
            const rankedExperts = await this._rankExperts(experts, normalizedFilters);
            
            // 🏗️ Paginate results
            const paginatedResults = this._paginateResults(rankedExperts, normalizedFilters);
            
            // 🏗️ Cache results
            await this._cacheResult(cacheKey, paginatedResults);

            const response = this._formatCatalogResponse(paginatedResults, searchId, Date.now() - startTime);
            
            this._logSuccess('EXPERT_CATALOG_RETRIEVED', { 
                searchId, 
                resultCount: paginatedResults.experts.length,
                totalCount: paginatedResults.pagination.total 
            });

            return response;

        } catch (error) {
            const processingTime = Date.now() - startTime;
            this._logError('EXPERT_CATALOG_FAILED', error, { searchId, filters, processingTime });
            throw this._formatEnterpriseError(error);
        }
    }

    /**
     * 🎯 ENTERPRISE METHOD: Get Expert Profile
     * @param {string} expertId - Expert identifier
     * @param {string} studentId - Optional student ID for personalized matching
     * @returns {Promise<Object>} Complete expert profile
     */
    async getExpertProfile(expertId, studentId = null) {
        const startTime = Date.now();
        const traceId = uuidv4();

        try {
            // 🏗️ Check cache for expert profile
            const cacheKey = `expert:profile:${expertId}`;
            const cachedProfile = await this._getCachedResult(cacheKey);
            
            if (cachedProfile) {
                this.emit('cache.hit', { traceId, cacheKey });
                return cachedProfile;
            }

            // 🏗️ Fetch complete expert profile
            const expert = await this.prisma.expert.findUnique({
                where: { id: expertId, status: 'ACTIVE' },
                include: {
                    user: {
                        select: {
                            name: true,
                            photo: true,
                            faydaId: true,
                            verified: true
                        }
                    },
                    skills: {
                        include: {
                            skill: {
                                select: {
                                    id: true,
                                    name: true,
                                    category: true,
                                    description: true
                                }
                            }
                        }
                    },
                    portfolio: {
                        where: { verified: true },
                        select: {
                            id: true,
                            type: true,
                            title: true,
                            description: true,
                            imageUrl: true,
                            verified: true,
                            createdAt: true
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    },
                    certificates: {
                        where: { verified: true },
                        select: {
                            id: true,
                            title: true,
                            issuer: true,
                            issueDate: true,
                            expiryDate: true,
                            verified: true
                        }
                    },
                    qualityMetrics: {
                        select: {
                            overallScore: true,
                            completionRate: true,
                            averageRating: true,
                            responseTime: true,
                            studentSatisfaction: true,
                            lastUpdated: true
                        },
                        orderBy: { lastUpdated: 'desc' },
                        take: 1
                    },
                    reviews: {
                        where: { status: 'APPROVED' },
                        select: {
                            id: true,
                            rating: true,
                            comment: true,
                            student: {
                                select: {
                                    user: {
                                        select: {
                                            name: true,
                                            photo: true
                                        }
                                    }
                                }
                            },
                            createdAt: true,
                            response: true
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 20
                    },
                    _count: {
                        select: {
                            enrollments: {
                                where: {
                                    status: { in: ['ACTIVE', 'COMPLETED'] }
                                }
                            },
                            reviews: {
                                where: { status: 'APPROVED' }
                            }
                        }
                    }
                }
            });

            if (!expert) {
                throw new Error('Expert not found or inactive');
            }

            // 🏗️ Calculate real-time availability
            const availability = await this._calculateExpertAvailability(expertId);
            
            // 🏗️ Calculate match score if student provided
            let matchScore = null;
            if (studentId) {
                matchScore = await this._calculateStudentMatchScore(expertId, studentId);
            }

            // 🏗️ Format comprehensive profile
            const profile = this._formatExpertProfile(expert, availability, matchScore);
            
            // 🏗️ Cache profile
            await this._cacheResult(cacheKey, profile);

            this.emit('expert.viewed', { 
                expertId, 
                studentId, 
                traceId, 
                processingTime: Date.now() - startTime 
            });

            return profile;

        } catch (error) {
            this._logError('EXPERT_PROFILE_FAILED', error, { expertId, studentId, traceId });
            throw this._formatEnterpriseError(error);
        }
    }

    /**
     * 🎯 ENTERPRISE METHOD: Find Matching Experts
     * @param {string} skillId - Required skill ID
     * @param {Object} preferences - Student preferences and requirements
     * @returns {Promise<Object>} Ranked expert matches
     */
    async findMatchingExperts(skillId, preferences = {}) {
        const startTime = Date.now();
        const matchId = uuidv4();

        try {
            this.emit('expert.matching.started', { matchId, skillId, preferences });

            // 🏗️ Validate skill exists
            const skill = await this.prisma.skill.findUnique({
                where: { id: skillId, isActive: true }
            });

            if (!skill) {
                throw new Error('Skill not found or inactive');
            }

            // 🏗️ Build matching query
            const baseFilters = {
                skillId,
                minQuality: preferences.minQuality || this.config.qualityThreshold,
                availability: preferences.availability || 'available',
                tier: preferences.tier,
                maxPrice: preferences.maxPrice,
                location: preferences.location
            };

            // 🏗️ Get qualified experts
            const experts = await this.prisma.expert.findMany({
                where: this._buildMatchingWhereClause(baseFilters),
                include: this._getExpertIncludeFields(),
                take: this.config.searchLimit
            });

            if (experts.length === 0) {
                return this._formatMatchingResponse([], matchId, 0);
            }

            // 🏗️ Advanced matching algorithm
            const matchedExperts = await Promise.all(
                experts.map(async (expert) => {
                    const matchScore = await this._calculateAdvancedMatchScore(expert, preferences);
                    return { ...expert, matchScore };
                })
            );

            // 🏗️ Sort by match score
            const rankedExperts = matchedExperts
                .filter(expert => expert.matchScore >= (preferences.minMatchScore || 0.6))
                .sort((a, b) => b.matchScore - a.matchScore);

            const response = this._formatMatchingResponse(rankedExperts, matchId, Date.now() - startTime);
            
            this.emit('expert.matched', {
                matchId,
                skillId,
                matchCount: rankedExperts.length,
                topMatchScore: rankedExperts[0]?.matchScore || 0
            });

            return response;

        } catch (error) {
            this._logError('EXPERT_MATCHING_FAILED', error, { matchId, skillId, preferences });
            throw this._formatEnterpriseError(error);
        }
    }

    /**
     * 🏗️ Normalize and Validate Filters
     * @private
     */
    _normalizeFilters(filters) {
        const normalized = {
            page: Math.max(1, parseInt(filters.page) || 1),
            limit: Math.min(this.config.maxResults, Math.max(1, parseInt(filters.limit) || 20)),
            skillId: filters.skillId,
            category: filters.category,
            tier: this._validateTier(filters.tier),
            minRating: Math.max(0, Math.min(5, parseFloat(filters.minRating) || 4.0)),
            maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : null,
            location: filters.location,
            availability: filters.availability || 'available',
            sortBy: filters.sortBy || 'rating',
            sortOrder: filters.sortOrder === 'asc' ? 'asc' : 'desc'
        };

        // 🏗️ Validate skill ID format
        if (normalized.skillId && !this._isValidId(normalized.skillId)) {
            throw new Error('Invalid skill ID format');
        }

        return normalized;
    }

    /**
     * 🏗️ Build Advanced Expert Query
     * @private
     */
    _buildExpertQuery(filters) {
        const where = {
            status: 'ACTIVE',
            ...(filters.skillId && {
                skills: {
                    some: {
                        skillId: filters.skillId,
                        isVerified: true
                    }
                }
            }),
            ...(filters.category && {
                skills: {
                    some: {
                        skill: {
                            category: filters.category
                        }
                    }
                }
            }),
            ...(filters.tier && { tier: filters.tier }),
            ...(filters.minRating && {
                qualityMetrics: {
                    some: {
                        overallScore: { gte: filters.minRating },
                        isValid: true
                    }
                }
            }),
            ...(filters.location && {
                user: {
                    location: {
                        contains: filters.location,
                        mode: 'insensitive'
                    }
                }
            })
        };

        return {
            where,
            include: this._getExpertIncludeFields(),
            take: filters.limit,
            skip: (filters.page - 1) * filters.limit,
            orderBy: this._getSortOrder(filters.sortBy, filters.sortOrder)
        };
    }

    /**
     * 🏗️ Get Expert Include Fields for Query
     * @private
     */
    _getExpertIncludeFields() {
        return {
            user: {
                select: {
                    name: true,
                    photo: true,
                    location: true,
                    verified: true
                }
            },
            skills: {
                include: {
                    skill: {
                        select: {
                            id: true,
                            name: true,
                            category: true
                        }
                    }
                }
            },
            qualityMetrics: {
                select: {
                    overallScore: true,
                    completionRate: true,
                    averageRating: true,
                    responseTime: true
                },
                orderBy: { lastUpdated: 'desc' },
                take: 1
            },
            _count: {
                select: {
                    enrollments: {
                        where: {
                            status: { in: ['COMPLETED', 'ACTIVE'] }
                        }
                    },
                    reviews: {
                        where: { status: 'APPROVED' }
                    }
                }
            }
        };
    }

    /**
     * 🏗️ Execute Expert Search with Performance Monitoring
     * @private
     */
    async _executeExpertSearch(query) {
        return await this.prisma.expert.findMany(query);
    }

    /**
     * 🏗️ Rank Experts with Advanced Algorithm
     * @private
     */
    async _rankExperts(experts, filters) {
        return await Promise.all(
            experts.map(async (expert) => {
                const baseScore = this._calculateBaseScore(expert);
                const availabilityScore = await this._calculateAvailabilityScore(expert.id);
                const demandScore = await this._calculateDemandScore(expert.id);
                
                const finalScore = (
                    baseScore * 0.6 +
                    availabilityScore * 0.3 +
                    demandScore * 0.1
                );

                return {
                    ...expert,
                    rankingScore: finalScore,
                    availability: this._getAvailabilityStatus(availabilityScore)
                };
            })
        );
    }

    /**
     * 🏗️ Calculate Base Expert Score
     * @private
     */
    _calculateBaseScore(expert) {
        let score = 0;

        // Tier weighting
        const tierWeight = EXPERT_TIERS[expert.tier]?.weight || 0.6;
        score += tierWeight * 30;

        // Quality metrics
        if (expert.qualityMetrics && expert.qualityMetrics.length > 0) {
            const metrics = expert.qualityMetrics[0];
            score += (metrics.overallScore / 5) * 40;
            score += (metrics.completionRate || 0) * 20;
            
            // Response time bonus (faster = better)
            if (metrics.responseTime) {
                const responseBonus = Math.max(0, (24 - metrics.responseTime) / 24 * 10);
                score += responseBonus;
            }
        }

        // Experience bonus
        const studentCount = expert._count?.enrollments || 0;
        const experienceBonus = Math.min(10, Math.log(studentCount + 1) * 2);
        score += experienceBonus;

        return Math.min(100, score);
    }

    /**
     * 🏗️ Calculate Availability Score
     * @private
     */
    async _calculateAvailabilityScore(expertId) {
        const currentStudents = await this.prisma.enrollment.count({
            where: {
                expertId,
                status: 'ACTIVE'
            }
        });

        const expert = await this.prisma.expert.findUnique({
            where: { id: expertId },
            select: { maxStudents: true }
        });

        const capacityRatio = 1 - (currentStudents / (expert?.maxStudents || 25));
        return Math.max(0, Math.min(1, capacityRatio));
    }

    /**
     * 🏗️ Calculate Demand Score
     * @private
     */
    async _calculateDemandScore(expertId) {
        const recentEnrollments = await this.prisma.enrollment.count({
            where: {
                expertId,
                createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
            }
        });

        // Normalize demand score (0-1)
        return Math.min(1, recentEnrollments / 20);
    }

    /**
     * 🏗️ Calculate Advanced Match Score
     * @private
     */
    async _calculateAdvancedMatchScore(expert, preferences) {
        let matchScore = 0;

        // Quality match (40%)
        const qualityMetrics = expert.qualityMetrics?.[0];
        if (qualityMetrics) {
            const qualityMatch = (
                (qualityMetrics.overallScore / 5) * 0.3 +
                (qualityMetrics.completionRate || 0) * 0.1
            );
            matchScore += qualityMatch * 0.4;
        }

        // Tier preference (20%)
        if (preferences.preferredTier) {
            const tierMatch = expert.tier === preferences.preferredTier ? 1 : 0.5;
            matchScore += tierMatch * 0.2;
        }

        // Location match (15%)
        if (preferences.location && expert.user.location) {
            const locationMatch = this._calculateLocationMatch(expert.user.location, preferences.location);
            matchScore += locationMatch * 0.15;
        }

        // Availability match (15%)
        const availabilityScore = await this._calculateAvailabilityScore(expert.id);
        matchScore += availabilityScore * 0.15;

        // Price match (10%)
        if (preferences.maxPrice) {
            const priceMatch = this._calculatePriceMatch(expert, preferences.maxPrice);
            matchScore += priceMatch * 0.1;
        }

        return Math.min(1, matchScore);
    }

    /**
     * 🏗️ Calculate Location Match
     * @private
     */
    _calculateLocationMatch(expertLocation, preferredLocation) {
        // Simple location matching - in production, use geolocation services
        if (expertLocation.toLowerCase().includes(preferredLocation.toLowerCase())) {
            return 1;
        }
        return 0.3; // Partial match for different locations
    }

    /**
     * 🏗️ Calculate Price Match
     * @private
     */
    _calculatePriceMatch(expert, maxPrice) {
        // Base price is 999 ETB with tier bonuses
        const basePrice = 999;
        const tierBonus = EXPERT_TIERS[expert.tier]?.bonus || 0;
        const actualPrice = basePrice * (1 + tierBonus);

        if (actualPrice <= maxPrice) {
            return 1;
        } else if (actualPrice <= maxPrice * 1.2) {
            return 0.5;
        }
        return 0;
    }

    /**
     * 🏗️ Calculate Expert Availability
     * @private
     */
    async _calculateExpertAvailability(expertId) {
        const expert = await this.prisma.expert.findUnique({
            where: { id: expertId },
            select: { maxStudents: true, currentStudents: true }
        });

        if (!expert) return AVAILABILITY_STATUS.OFFLINE;

        const capacityRatio = expert.currentStudents / expert.maxStudents;

        if (capacityRatio < 0.7) return AVAILABILITY_STATUS.AVAILABLE;
        if (capacityRatio < 0.9) return AVAILABILITY_STATUS.LIMITED;
        return AVAILABILITY_STATUS.FULL;
    }

    /**
     * 🏗️ Calculate Student Match Score
     * @private
     */
    async _calculateStudentMatchScore(expertId, studentId) {
        // 🎯 Advanced matching algorithm considering:
        // - Student learning style
        // - Previous success patterns
        // - Schedule compatibility
        // - Communication preferences
        
        // Placeholder implementation - expand based on student data
        const baseScore = Math.random() * 0.3 + 0.5; // 0.5-0.8 base
        return Math.min(1, baseScore);
    }

    /**
     * 🏗️ Format Expert Profile
     * @private
     */
    _formatExpertProfile(expert, availability, matchScore = null) {
        const qualityMetrics = expert.qualityMetrics?.[0];
        const stats = expert._count;

        return {
            id: expert.id,
            user: expert.user,
            tier: expert.tier,
            skills: expert.skills.map(skill => skill.skill),
            portfolio: expert.portfolio,
            certificates: expert.certificates,
            quality: {
                overallScore: qualityMetrics?.overallScore || 0,
                completionRate: qualityMetrics?.completionRate || 0,
                averageRating: qualityMetrics?.averageRating || 0,
                responseTime: qualityMetrics?.responseTime || null,
                studentSatisfaction: qualityMetrics?.studentSatisfaction || 0
            },
            statistics: {
                totalStudents: stats.enrollments || 0,
                totalReviews: stats.reviews || 0,
                successRate: qualityMetrics?.completionRate || 0
            },
            reviews: expert.reviews,
            availability,
            matchScore,
            pricing: {
                basePrice: 999,
                actualPrice: 999 * (1 + (EXPERT_TIERS[expert.tier]?.bonus || 0)),
                currency: 'ETB',
                payoutSchedule: ['333', '333', '333']
            },
            metadata: {
                joinedDate: expert.createdAt,
                lastActive: expert.updatedAt,
                verified: expert.user.verified
            }
        };
    }

    /**
     * 🏗️ Paginate Results
     * @private
     */
    _paginateResults(experts, filters) {
        const startIndex = (filters.page - 1) * filters.limit;
        const endIndex = startIndex + filters.limit;
        const paginatedExperts = experts.slice(startIndex, endIndex);

        return {
            experts: paginatedExperts,
            pagination: {
                page: filters.page,
                limit: filters.limit,
                total: experts.length,
                totalPages: Math.ceil(experts.length / filters.limit),
                hasNext: endIndex < experts.length,
                hasPrev: filters.page > 1
            }
        };
    }

    /**
     * 🏗️ Format Catalog Response
     * @private
     */
    _formatCatalogResponse(data, searchId, processingTime) {
        return {
            success: true,
            data: data.experts,
            pagination: data.pagination,
            metadata: {
                searchId,
                processingTime: `${processingTime}ms`,
                timestamp: new Date().toISOString(),
                resultCount: data.experts.length,
                totalCount: data.pagination.total
            }
        };
    }

    /**
     * 🏗️ Format Matching Response
     * @private
     */
    _formatMatchingResponse(experts, matchId, processingTime) {
        return {
            success: true,
            data: experts,
            metadata: {
                matchId,
                processingTime: `${processingTime}ms`,
                timestamp: new Date().toISOString(),
                matchCount: experts.length,
                topMatchScore: experts[0]?.matchScore || 0
            }
        };
    }

    /**
     * 🏗️ Cache Management Methods
     * @private
     */
    async _getCachedResult(key) {
        try {
            const cached = await this.redis.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            this._logError('CACHE_GET_FAILED', error, { key });
            return null;
        }
    }

    async _cacheResult(key, data, ttl = this.config.cacheTtl) {
        try {
            await this.redis.setex(key, ttl, JSON.stringify(data));
        } catch (error) {
            this._logError('CACHE_SET_FAILED', error, { key });
        }
    }

    async _warmupTopExpertsCache() {
        try {
            const topExperts = await this.prisma.expert.findMany({
                where: { 
                    status: 'ACTIVE',
                    tier: { in: ['MASTER', 'SENIOR'] },
                    qualityMetrics: {
                        some: {
                            overallScore: { gte: 4.5 },
                            isValid: true
                        }
                    }
                },
                include: this._getExpertIncludeFields(),
                take: 20,
                orderBy: { qualityScore: 'desc' }
            });

            const cacheKey = 'top_experts:warm';
            await this._cacheResult(cacheKey, topExperts, 600); // 10 minutes

            this._logSuccess('CACHE_WARMUP_COMPLETED', { expertCount: topExperts.length });
        } catch (error) {
            this._logError('CACHE_WARMUP_FAILED', error);
        }
    }

    /**
     * 🏗️ Utility Methods
     * @private
     */
    _generateCacheKey(prefix, filters) {
        const filterString = JSON.stringify(filters);
        return `${prefix}:${Buffer.from(filterString).toString('base64')}`;
    }

    _validateTier(tier) {
        return EXPERT_TIERS[tier] ? tier : undefined;
    }

    _isValidId(id) {
        return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    }

    _getSortOrder(sortBy, sortOrder) {
        const sortMap = {
            rating: { qualityMetrics: { overallScore: sortOrder } },
            experience: { _count: { enrollments: sortOrder } },
            tier: { tier: sortOrder },
            response: { qualityMetrics: { responseTime: sortOrder === 'asc' ? 'asc' : 'desc' } },
            date: { createdAt: sortOrder }
        };

        return sortMap[sortBy] || sortMap.rating;
    }

    _getAvailabilityStatus(availabilityScore) {
        if (availabilityScore >= 0.7) return AVAILABILITY_STATUS.AVAILABLE;
        if (availabilityScore >= 0.3) return AVAILABILITY_STATUS.LIMITED;
        return AVAILABILITY_STATUS.FULL;
    }

    _buildMatchingWhereClause(filters) {
        return {
            status: 'ACTIVE',
            skills: {
                some: {
                    skillId: filters.skillId,
                    isVerified: true
                }
            },
            ...(filters.minQuality && {
                qualityMetrics: {
                    some: {
                        overallScore: { gte: filters.minQuality },
                        isValid: true
                    }
                }
            }),
            ...(filters.tier && { tier: filters.tier }),
            ...(filters.availability === 'available' && {
                currentStudents: { lt: this.prisma.expert.fields.maxStudents }
            })
        };
    }

    /**
     * 🏗️ Enterprise Logging
     * @private
     */
    _logEvent(eventType, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            service: 'expert-catalog',
            event: eventType,
            data,
            environment: process.env.NODE_ENV || 'development'
        };

        console.log(JSON.stringify(logEntry));

        if (process.env.NODE_ENV === 'production') {
            this.redis.publish('service-logs', JSON.stringify(logEntry));
        }
    }

    _logSuccess(operation, data) {
        this._logEvent('SUCCESS', {
            operation,
            ...data,
            severity: 'INFO'
        });
    }

    _logError(operation, error, context = {}) {
        this._logEvent('ERROR', {
            operation,
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            context,
            severity: 'ERROR'
        });
    }

    _formatEnterpriseError(error) {
        const enterpriseError = new Error(error.message);
        enterpriseError.code = error.code || 'INTERNAL_ERROR';
        enterpriseError.timestamp = new Date().toISOString();
        enterpriseError.severity = 'ERROR';
        return enterpriseError;
    }

    /**
     * 🏗️ Get Service Metrics
     * @returns {Object} Service performance metrics
     */
    getMetrics() {
        const cacheHitRate = this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0;
        
        return {
            ...this.metrics,
            cacheHitRate: Math.round(cacheHitRate * 100),
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
    }

    /**
     * 🏗️ Clear Cache (Admin Function)
     * @param {string} pattern - Redis key pattern
     */
    async clearCache(pattern = '*') {
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(keys);
            }
            return { cleared: keys.length };
        } catch (error) {
            this._logError('CACHE_CLEAR_FAILED', error, { pattern });
            throw error;
        }
    }

    /**
     * 🏗️ Graceful Shutdown
     */
    async shutdown() {
        try {
            this.emit('service.shutdown.started');
            await this.redis.quit();
            await this.prisma.$disconnect();
            this.cache.close();
            this.emit('service.shutdown.completed');
        } catch (error) {
            this.emit('service.shutdown.failed', { error: error.message });
            throw error;
        }
    }
}

// 🏗️ Enterprise Export Pattern
module.exports = {
    ExpertCatalog,
    EXPERT_TIERS,
    AVAILABILITY_STATUS
};

// 🏗️ Singleton Instance for Microservice Architecture
let expertCatalogInstance = null;

module.exports.getInstance = (options = {}) => {
    if (!expertCatalogInstance) {
        expertCatalogInstance = new ExpertCatalog(options);
    }
    return expertCatalogInstance;
};