/**
 * 🎯 MOSA FORGE: Enterprise Category Organizer Service
 * 
 * @module CategoryOrganizer
 * @description Manages 4-category organization system for 40+ enterprise skills
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - 4 main categories: Online, Offline, Health & Sports, Beauty & Fashion
 * - Dynamic category assignment and optimization
 * - Cross-category analytics and insights
 * - Real-time category performance monitoring
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');

// 🏗️ Enterprise Constants
const CATEGORIES = {
  ONLINE: {
    id: 'ONLINE',
    name: 'Online Skills',
    description: 'Digital and remote work skills for the modern economy',
    color: '#3B82F6',
    icon: '💻',
    metadata: {
      targetAudience: 'Digital natives, remote workers, tech enthusiasts',
      incomePotential: 'High scalability, global market access',
      growthRate: 'Rapid',
      demandTrend: 'Increasing'
    }
  },
  OFFLINE: {
    id: 'OFFLINE',
    name: 'Offline Skills',
    description: 'Hands-on trade and practical skills for local economy',
    color: '#10B981',
    icon: '🏗️',
    metadata: {
      targetAudience: 'Practical learners, tradespeople, local entrepreneurs',
      incomePotential: 'Steady local demand, essential services',
      growthRate: 'Stable',
      demandTrend: 'Consistent'
    }
  },
  HEALTH_SPORTS: {
    id: 'HEALTH_SPORTS',
    name: 'Health & Sports',
    description: 'Wellness, fitness, and sports training skills',
    color: '#EF4444',
    icon: '🏥',
    metadata: {
      targetAudience: 'Fitness enthusiasts, health professionals, sports coaches',
      incomePotential: 'Recurring clients, premium services',
      growthRate: 'Growing',
      demandTrend: 'Health-conscious rise'
    }
  },
  BEAUTY_FASHION: {
    id: 'BEAUTY_FASHION',
    name: 'Beauty & Fashion',
    description: 'Creative and personal care skills for beauty industry',
    color: '#8B5CF6',
    icon: '💄',
    metadata: {
      targetAudience: 'Creative individuals, fashion enthusiasts, beauty professionals',
      incomePotential: 'Premium services, brand building',
      growthRate: 'Rapid',
      demandTrend: 'Social media driven'
    }
  }
};

const CATEGORY_ERRORS = {
  INVALID_CATEGORY: 'INVALID_CATEGORY',
  SKILL_NOT_FOUND: 'SKILL_NOT_FOUND',
  CATEGORY_FULL: 'CATEGORY_FULL',
  OPTIMIZATION_FAILED: 'OPTIMIZATION_FAILED',
  ANALYTICS_UNAVAILABLE: 'ANALYTICS_UNAVAILABLE'
};

/**
 * 🏗️ Enterprise Category Organizer Class
 * @class CategoryOrganizer
 * @extends EventEmitter
 */
class CategoryOrganizer extends EventEmitter {
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
      maxSkillsPerCategory: options.maxSkillsPerCategory || 15,
      cacheTTL: options.cacheTTL || 300, // 5 minutes
      rebalanceThreshold: options.rebalanceThreshold || 0.8 // 80% capacity
    };

    // 🏗️ Service Dependencies
    this.redis = new Redis(this.config.redis);
    this.prisma = this.config.prisma;
    
    // 🏗️ Category Configuration
    this.categoryConfig = this._initializeCategoryConfig();
    
    // 🏗️ Performance Monitoring
    this.metrics = {
      categoriesOrganized: 0,
      skillsCategorized: 0,
      optimizationsPerformed: 0,
      analyticsGenerated: 0,
      averageOrganizationTime: 0
    };

    this._initializeEventHandlers();
    this._startCategoryHealthChecks();
  }

  /**
   * 🏗️ Initialize Category Configuration
   * @private
   */
  _initializeCategoryConfig() {
    return {
      [CATEGORIES.ONLINE.id]: {
        ...CATEGORIES.ONLINE,
        skillCriteria: {
          requiredTags: ['digital', 'remote', 'online'],
          preferredAttributes: ['scalable', 'global_reach', 'tech_enabled'],
          maxComplexity: 8,
          minMarketDemand: 7
        },
        capacity: this.config.maxSkillsPerCategory,
        currentCount: 0,
        performance: {
          completionRate: 0,
          satisfactionScore: 0,
          revenuePerSkill: 0
        }
      },
      [CATEGORIES.OFFLINE.id]: {
        ...CATEGORIES.OFFLINE,
        skillCriteria: {
          requiredTags: ['hands_on', 'practical', 'local'],
          preferredAttributes: ['essential_service', 'high_local_demand', 'tangible'],
          maxComplexity: 9,
          minMarketDemand: 6
        },
        capacity: this.config.maxSkillsPerCategory,
        currentCount: 0,
        performance: {
          completionRate: 0,
          satisfactionScore: 0,
          revenuePerSkill: 0
        }
      },
      [CATEGORIES.HEALTH_SPORTS.id]: {
        ...CATEGORIES.HEALTH_SPORTS,
        skillCriteria: {
          requiredTags: ['health', 'fitness', 'wellness'],
          preferredAttributes: ['certification_required', 'recurring_revenue', 'premium_service'],
          maxComplexity: 7,
          minMarketDemand: 8
        },
        capacity: this.config.maxSkillsPerCategory,
        currentCount: 0,
        performance: {
          completionRate: 0,
          satisfactionScore: 0,
          revenuePerSkill: 0
        }
      },
      [CATEGORIES.BEAUTY_FASHION.id]: {
        ...CATEGORIES.BEAUTY_FASHION,
        skillCriteria: {
          requiredTags: ['creative', 'beauty', 'fashion'],
          preferredAttributes: ['visual_appeal', 'social_media_friendly', 'premium_pricing'],
          maxComplexity: 6,
          minMarketDemand: 9
        },
        capacity: this.config.maxSkillsPerCategory,
        currentCount: 0,
        performance: {
          completionRate: 0,
          satisfactionScore: 0,
          revenuePerSkill: 0
        }
      }
    };
  }

  /**
   * 🏗️ Initialize Enterprise Event Handlers
   * @private
   */
  _initializeEventHandlers() {
    this.on('skill.categorized', (data) => {
      this._logEvent('SKILL_CATEGORIZED', data);
      this.metrics.skillsCategorized++;
    });

    this.on('category.optimized', (data) => {
      this._logEvent('CATEGORY_OPTIMIZED', data);
      this.metrics.optimizationsPerformed++;
    });

    this.on('analytics.generated', (data) => {
      this._logEvent('ANALYTICS_GENERATED', data);
      this.metrics.analyticsGenerated++;
    });

    this.on('category.rebalanced', (data) => {
      this._logEvent('CATEGORY_REBALANCED', data);
    });
  }

  /**
   * 🏗️ Start Category Health Checks
   * @private
   */
  _startCategoryHealthChecks() {
    setInterval(() => {
      this._checkCategoryHealth();
    }, 60000); // Every minute

    // Weekly optimization
    setInterval(() => {
      this._performWeeklyOptimization();
    }, 7 * 24 * 60 * 60 * 1000); // Weekly
  }

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Organize Skill into Category
   * @param {string} skillId - Skill identifier
   * @param {Object} categorizationData - Skill categorization data
   * @returns {Promise<Object>} Categorization result
   */
  async organizeSkill(skillId, categorizationData = {}) {
    const startTime = performance.now();
    const traceId = categorizationData.traceId || uuidv4();

    try {
      this.emit('categorization.started', { skillId, traceId, categorizationData });

      // 🏗️ Validate Skill
      const skill = await this._validateSkill(skillId);
      
      // 🏗️ Auto-Detect Best Category
      const bestCategory = await this._determineBestCategory(skill, categorizationData);
      
      // 🏗️ Check Category Capacity
      await this._checkCategoryCapacity(bestCategory.id);
      
      // 🏗️ Assign Skill to Category
      const assignment = await this._assignSkillToCategory(skillId, bestCategory.id, categorizationData);
      
      // 🏗️ Update Category Metrics
      await this._updateCategoryMetrics(bestCategory.id);
      
      // 🏗️ Cache Organization
      await this._cacheCategoryAssignment(skillId, bestCategory.id);

      const processingTime = performance.now() - startTime;
      this._updateMetrics(processingTime);

      const result = {
        success: true,
        skillId,
        skillName: skill.name,
        category: bestCategory,
        assignment,
        confidence: this._calculateConfidenceScore(skill, bestCategory),
        traceId,
        processingTime: `${processingTime.toFixed(2)}ms`
      };

      this.emit('skill.categorized', result);
      this._logSuccess('SKILL_CATEGORIZED', { skillId, category: bestCategory.id });

      return result;

    } catch (error) {
      const processingTime = performance.now() - startTime;
      this._updateMetrics(processingTime);
      
      const errorResult = {
        success: false,
        error: error.message,
        errorCode: error.code || 'CATEGORIZATION_FAILED',
        skillId,
        traceId,
        timestamp: new Date().toISOString()
      };

      this.emit('categorization.failed', errorResult);
      this._logError('CATEGORIZATION_FAILED', error, { skillId, traceId });

      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🏗️ Validate Skill Existence and Data
   * @private
   */
  async _validateSkill(skillId) {
    const cacheKey = `skill:${skillId}:full`;
    
    // Check cache first
    const cachedSkill = await this.redis.get(cacheKey);
    if (cachedSkill) {
      return JSON.parse(cachedSkill);
    }

    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        tags: true,
        metadata: true,
        packages: {
          where: { isActive: true },
          select: { price: true, tier: true }
        },
        enrollments: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        }
      }
    });

    if (!skill) {
      throw new Error('Skill not found');
    }

    if (!skill.isActive) {
      throw new Error('Skill is not active for categorization');
    }

    // Cache skill data
    await this.redis.set(cacheKey, JSON.stringify(skill), 'EX', 1800); // 30 minutes

    return skill;
  }

  /**
   * 🏗️ Determine Best Category for Skill
   * @private
   */
  async _determineBestCategory(skill, categorizationData) {
    const categoryScores = {};

    // 🎯 Score each category based on skill attributes
    for (const [categoryId, categoryConfig] of Object.entries(this.categoryConfig)) {
      const score = await this._calculateCategoryScore(skill, categoryConfig, categorizationData);
      categoryScores[categoryId] = {
        category: categoryConfig,
        score,
        reasons: this._getScoreReasons(skill, categoryConfig, score)
      };
    }

    // 🎯 Find best matching category
    const bestCategoryId = Object.keys(categoryScores).reduce((best, current) => 
      categoryScores[current].score > categoryScores[best].score ? current : best
    );

    const bestMatch = categoryScores[bestCategoryId];

    // 🎯 Validate minimum confidence threshold
    if (bestMatch.score < 0.6) {
      throw new Error('No suitable category found for skill (confidence too low)');
    }

    this.emit('category.matched', {
      skillId: skill.id,
      skillName: skill.name,
      bestCategory: bestMatch.category,
      score: bestMatch.score,
      allScores: categoryScores
    });

    return bestMatch.category;
  }

  /**
   * 🏗️ Calculate Category Matching Score
   * @private
   */
  async _calculateCategoryScore(skill, categoryConfig, categorizationData) {
    let score = 0;
    const maxScore = 100;
    let currentScore = 0;

    // 🎯 Tag Matching (30 points)
    const tagScore = this._calculateTagScore(skill.tags, categoryConfig.skillCriteria.requiredTags);
    currentScore += tagScore * 0.3;

    // 🎯 Attribute Matching (25 points)
    const attributeScore = this._calculateAttributeScore(skill.metadata, categoryConfig.skillCriteria.preferredAttributes);
    currentScore += attributeScore * 0.25;

    // 🎯 Complexity Matching (15 points)
    const complexityScore = this._calculateComplexityScore(skill.complexity, categoryConfig.skillCriteria.maxComplexity);
    currentScore += complexityScore * 0.15;

    // 🎯 Market Demand Matching (15 points)
    const demandScore = this._calculateDemandScore(skill.marketDemand, categoryConfig.skillCriteria.minMarketDemand);
    currentScore += demandScore * 0.15;

    // 🎯 Performance History (15 points)
    const performanceScore = await this._calculatePerformanceScore(skill.id, categoryConfig.id);
    currentScore += performanceScore * 0.15;

    // 🎯 Manual Override (if provided)
    if (categorizationData.preferredCategory === categoryConfig.id) {
      currentScore += 0.1; // 10% bonus for manual preference
    }

    return Math.min(1, currentScore);
  }

  /**
   * 🏗️ Calculate Tag Matching Score
   * @private
   */
  _calculateTagScore(skillTags, requiredTags) {
    if (!skillTags || skillTags.length === 0) return 0;

    const tagNames = skillTags.map(tag => tag.name.toLowerCase());
    const requiredTagNames = requiredTags.map(tag => tag.toLowerCase());

    const matchingTags = requiredTagNames.filter(tag => 
      tagNames.some(skillTag => skillTag.includes(tag) || tag.includes(skillTag))
    );

    return matchingTags.length / requiredTagNames.length;
  }

  /**
   * 🏗️ Calculate Attribute Matching Score
   * @private
   */
  _calculateAttributeScore(metadata, preferredAttributes) {
    if (!metadata) return 0;

    let matchCount = 0;
    for (const attribute of preferredAttributes) {
      if (metadata[attribute] === true) {
        matchCount++;
      }
    }

    return matchCount / preferredAttributes.length;
  }

  /**
   * 🏗️ Calculate Complexity Matching Score
   * @private
   */
  _calculateComplexityScore(skillComplexity, maxComplexity) {
    if (!skillComplexity) return 0.5; // Default medium score

    // Normalize complexity to 0-1 range
    const normalizedComplexity = skillComplexity / 10;
    const targetComplexity = maxComplexity / 10;

    // Score higher when complexity matches category expectations
    return 1 - Math.abs(normalizedComplexity - targetComplexity);
  }

  /**
   * 🏗️ Calculate Demand Matching Score
   * @private
   */
  _calculateDemandScore(skillDemand, minDemand) {
    if (!skillDemand) return 0.5; // Default medium score

    // Normalize demand to 0-1 range
    const normalizedDemand = skillDemand / 10;
    const targetDemand = minDemand / 10;

    // Score higher when demand meets or exceeds category minimum
    return Math.min(1, normalizedDemand / targetDemand);
  }

  /**
   * 🏗️ Calculate Performance History Score
   * @private
   */
  async _calculatePerformanceScore(skillId, categoryId) {
    try {
      const performanceData = await this.prisma.skillPerformance.findFirst({
        where: { skillId },
        orderBy: { calculatedAt: 'desc' }
      });

      if (!performanceData) return 0.7; // Default good score

      // Consider completion rate and satisfaction
      const completionRate = performanceData.completionRate || 0;
      const satisfactionScore = performanceData.satisfactionScore || 0;

      return (completionRate + satisfactionScore) / 2;
    } catch (error) {
      return 0.5; // Default medium score if error
    }
  }

  /**
   * 🏗️ Get Score Reasons for Transparency
   * @private
   */
  _getScoreReasons(skill, categoryConfig, score) {
    const reasons = [];

    if (score >= 0.8) {
      reasons.push('Excellent match with category criteria');
    } else if (score >= 0.6) {
      reasons.push('Good match with minor adjustments needed');
    } else {
      reasons.push('Poor match - consider different category');
    }

    // Add specific reasons based on scoring components
    if (skill.tags && skill.tags.length > 0) {
      reasons.push(`Matched ${skill.tags.length} required tags`);
    }

    if (skill.marketDemand >= categoryConfig.skillCriteria.minMarketDemand) {
      reasons.push('Meets minimum market demand threshold');
    }

    return reasons;
  }

  /**
   * 🏗️ Check Category Capacity
   * @private
   */
  async _checkCategoryCapacity(categoryId) {
    const currentCount = await this.prisma.skill.count({
      where: {
        category: categoryId,
        isActive: true
      }
    });

    this.categoryConfig[categoryId].currentCount = currentCount;

    if (currentCount >= this.categoryConfig[categoryId].capacity) {
      throw new Error(`Category ${categoryId} has reached maximum capacity`);
    }

    // Check rebalance threshold
    const capacityRatio = currentCount / this.categoryConfig[categoryId].capacity;
    if (capacityRatio >= this.config.rebalanceThreshold) {
      this.emit('category.nearing.capacity', {
        categoryId,
        currentCount,
        capacity: this.categoryConfig[categoryId].capacity,
        ratio: capacityRatio
      });
    }

    return true;
  }

  /**
   * 🏗️ Assign Skill to Category
   * @private
   */
  async _assignSkillToCategory(skillId, categoryId, categorizationData) {
    return await this.prisma.$transaction(async (tx) => {
      // Update skill category
      const updatedSkill = await tx.skill.update({
        where: { id: skillId },
        data: {
          category: categoryId,
          categorizedAt: new Date(),
          categorizationData: {
            automated: !categorizationData.manualOverride,
            confidence: this._calculateConfidenceScore(
              await this._validateSkill(skillId),
              this.categoryConfig[categoryId]
            ),
            traceId: categorizationData.traceId,
            categorizedBy: categorizationData.userId || 'system'
          }
        },
        include: {
          tags: true,
          metadata: true
        }
      });

      // Log categorization event
      await tx.categorizationLog.create({
        data: {
          id: uuidv4(),
          skillId,
          categoryId,
          action: 'ASSIGN',
          details: {
            categorizationData,
            previousCategory: updatedSkill.category,
            confidence: updatedSkill.categorizationData.confidence
          },
          performedBy: categorizationData.userId || 'system',
          traceId: categorizationData.traceId
        }
      });

      // Update category count
      this.categoryConfig[categoryId].currentCount++;

      return {
        skillId: updatedSkill.id,
        categoryId,
        previousCategory: updatedSkill.category,
        confidence: updatedSkill.categorizationData.confidence,
        timestamp: new Date().toISOString()
      };
    });
  }

  /**
   * 🏗️ Calculate Confidence Score
   * @private
   */
  _calculateConfidenceScore(skill, category) {
    // Base confidence on how well skill matches category criteria
    let confidence = 0;

    // Tag matching contributes 40%
    const tagScore = this._calculateTagScore(skill.tags, category.skillCriteria.requiredTags);
    confidence += tagScore * 0.4;

    // Attribute matching contributes 30%
    const attributeScore = this._calculateAttributeScore(skill.metadata, category.skillCriteria.preferredAttributes);
    confidence += attributeScore * 0.3;

    // Performance history contributes 30%
    confidence += (this._calculatePerformanceScore(skill.id, category.id) * 0.3);

    return Math.min(1, confidence);
  }

  /**
   * 🏗️ Update Category Metrics
   * @private
   */
  async _updateCategoryMetrics(categoryId) {
    const metrics = await this.prisma.skillPerformance.aggregate({
      where: {
        skill: {
          category: categoryId,
          isActive: true
        }
      },
      _avg: {
        completionRate: true,
        satisfactionScore: true,
        revenuePerStudent: true
      },
      _count: {
        skillId: true
      }
    });

    this.categoryConfig[categoryId].performance = {
      completionRate: metrics._avg.completionRate || 0,
      satisfactionScore: metrics._avg.satisfactionScore || 0,
      revenuePerSkill: metrics._avg.revenuePerStudent || 0,
      totalSkills: metrics._count.skillId
    };

    // Cache updated metrics
    await this.redis.set(
      `category:${categoryId}:metrics`,
      JSON.stringify(this.categoryConfig[categoryId].performance),
      'EX',
      3600 // 1 hour
    );
  }

  /**
   * 🏗️ Cache Category Assignment
   * @private
   */
  async _cacheCategoryAssignment(skillId, categoryId) {
    const cacheKey = `skill:${skillId}:category`;
    await this.redis.set(cacheKey, categoryId, 'EX', this.config.cacheTTL);
    
    // Also update category skills list
    const categorySkillsKey = `category:${categoryId}:skills`;
    await this.redis.sadd(categorySkillsKey, skillId);
    await this.redis.expire(categorySkillsKey, this.config.cacheTTL);
  }

  /**
   * 🎯 ENTERPRISE METHOD: Get Category Overview
   * @param {string} categoryId - Category identifier
   * @returns {Promise<Object>} Category details with skills and analytics
   */
  async getCategoryOverview(categoryId) {
    const cacheKey = `category:${categoryId}:overview`;
    
    try {
      // Check cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const categoryConfig = this.categoryConfig[categoryId];
      if (!categoryConfig) {
        throw new Error('Invalid category');
      }

      // Get skills in category
      const skills = await this.prisma.skill.findMany({
        where: {
          category: categoryId,
          isActive: true
        },
        include: {
          tags: true,
          packages: {
            where: { isActive: true },
            select: { id: true, tier: true, price: true }
          },
          _count: {
            select: {
              enrollments: {
                where: { status: 'ACTIVE' }
              }
            }
          }
        },
        orderBy: {
          marketDemand: 'desc'
        }
      });

      // Get category analytics
      const analytics = await this._getCategoryAnalytics(categoryId);

      const overview = {
        category: categoryConfig,
        skills: {
          total: skills.length,
          list: skills,
          capacity: {
            current: skills.length,
            max: categoryConfig.capacity,
            percentage: (skills.length / categoryConfig.capacity) * 100
          }
        },
        performance: categoryConfig.performance,
        analytics,
        recommendations: await this._generateCategoryRecommendations(categoryId, skills)
      };

      // Cache overview
      await this.redis.set(cacheKey, JSON.stringify(overview), 'EX', 1800); // 30 minutes

      this.emit('analytics.generated', { categoryId, type: 'OVERVIEW' });

      return overview;

    } catch (error) {
      this._logError('GET_CATEGORY_OVERVIEW_FAILED', error, { categoryId });
      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🎯 ENTERPRISE METHOD: Optimize Category Organization
   * @param {Object} optimizationCriteria - Optimization parameters
   * @returns {Promise<Object>} Optimization results
   */
  async optimizeCategories(optimizationCriteria = {}) {
    const traceId = uuidv4();
    const startTime = performance.now();

    try {
      this.emit('optimization.started', { traceId, optimizationCriteria });

      const optimizationResults = {
        traceId,
        timestamp: new Date().toISOString(),
        categoriesOptimized: 0,
        skillsReorganized: 0,
        improvements: [],
        metrics: {}
      };

      // 🎯 Balance category sizes
      if (optimizationCriteria.balanceSizes) {
        const balanceResult = await this._balanceCategorySizes();
        optimizationResults.balanceResult = balanceResult;
        optimizationResults.categoriesOptimized += balanceResult.categoriesOptimized;
        optimizationResults.skillsReorganized += balanceResult.skillsReorganized;
      }

      // 🎯 Optimize based on performance
      if (optimizationCriteria.optimizePerformance) {
        const performanceResult = await this._optimizeCategoryPerformance();
        optimizationResults.performanceResult = performanceResult;
        optimizationResults.categoriesOptimized += performanceResult.categoriesOptimized;
        optimizationResults.skillsReorganized += performanceResult.skillsReorganized;
      }

      // 🎯 Update all category metrics
      for (const categoryId of Object.keys(this.categoryConfig)) {
        await this._updateCategoryMetrics(categoryId);
      }

      const processingTime = performance.now() - startTime;
      optimizationResults.processingTime = `${processingTime.toFixed(2)}ms`;
      optimizationResults.metrics = this.metrics;

      this.emit('category.optimized', optimizationResults);
      this._logSuccess('CATEGORIES_OPTIMIZED', optimizationResults);

      return optimizationResults;

    } catch (error) {
      this._logError('CATEGORY_OPTIMIZATION_FAILED', error, { traceId });
      throw this._formatEnterpriseError(error);
    }
  }

  /**
   * 🏗️ Balance Category Sizes
   * @private
   */
  async _balanceCategorySizes() {
    const result = {
      categoriesOptimized: 0,
      skillsReorganized: 0,
      moves: []
    };

    // Get current category counts
    const categoryCounts = {};
    for (const categoryId of Object.keys(this.categoryConfig)) {
      const count = await this.prisma.skill.count({
        where: { category: categoryId, isActive: true }
      });
      categoryCounts[categoryId] = count;
      this.categoryConfig[categoryId].currentCount = count;
    }

    // Calculate average and identify imbalances
    const totalSkills = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
    const averageSkills = totalSkills / Object.keys(categoryCounts).length;
    const threshold = averageSkills * 0.2; // 20% threshold

    // Identify categories needing rebalancing
    const overloadedCategories = Object.entries(categoryCounts)
      .filter(([_, count]) => count > averageSkills + threshold)
      .sort((a, b) => b[1] - a[1]);

    const underloadedCategories = Object.entries(categoryCounts)
      .filter(([_, count]) => count < averageSkills - threshold)
      .sort((a, b) => a[1] - b[1]);

    // Rebalance skills
    for (const [overloadedId, overloadedCount] of overloadedCategories) {
      for (const [underloadedId, underloadedCount] of underloadedCategories) {
        const skillsToMove = await this._findSkillsToMove(overloadedId, underloadedId);
        
        for (const skill of skillsToMove) {
          await this._moveSkillToCategory(skill.id, underloadedId);
          result.skillsReorganized++;
          result.moves.push({
            skillId: skill.id,
            fromCategory: overloadedId,
            toCategory: underloadedId,
            reason: 'BALANCE_REBALANCING'
          });
        }

        if (result.skillsReorganized >= 10) break; // Limit moves per optimization
      }
    }

    result.categoriesOptimized = overloadedCategories.length + underloadedCategories.length;
    return result;
  }

  /**
   * 🏗️ Find Skills to Move Between Categories
   * @private
   */
  async _findSkillsToMove(sourceCategoryId, targetCategoryId) {
    const skills = await this.prisma.skill.findMany({
      where: {
        category: sourceCategoryId,
        isActive: true
      },
      include: {
        tags: true,
        metadata: true
      }
    });

    const movableSkills = [];

    for (const skill of skills) {
      const targetScore = await this._calculateCategoryScore(skill, this.categoryConfig[targetCategoryId], {});
      const currentScore = await this._calculateCategoryScore(skill, this.categoryConfig[sourceCategoryId], {});

      // Move if target category is better match
      if (targetScore > currentScore + 0.1) { // 10% improvement threshold
        movableSkills.push(skill);
      }

      if (movableSkills.length >= 5) break; // Limit to 5 skills per move
    }

    return movableSkills;
  }

  /**
   * 🏗️ Move Skill to Different Category
   * @private
   */
  async _moveSkillToCategory(skillId, newCategoryId) {
    return await this.prisma.$transaction(async (tx) => {
      const skill = await tx.skill.findUnique({ where: { id: skillId } });
      
      const updatedSkill = await tx.skill.update({
        where: { id: skillId },
        data: {
          category: newCategoryId,
          categorizedAt: new Date(),
          categorizationData: {
            ...skill.categorizationData,
            previousCategories: [
              ...(skill.categorizationData?.previousCategories || []),
              {
                category: skill.category,
                movedAt: new Date().toISOString(),
                reason: 'OPTIMIZATION_REBALANCING'
              }
            ]
          }
        }
      });

      // Log the move
      await tx.categorizationLog.create({
        data: {
          id: uuidv4(),
          skillId,
          categoryId: newCategoryId,
          action: 'MOVE',
          details: {
            previousCategory: skill.category,
            reason: 'OPTIMIZATION_REBALANCING',
            automated: true
          },
          performedBy: 'system',
          traceId: uuidv4()
        }
      });

      // Update category counts
      this.categoryConfig[skill.category].currentCount--;
      this.categoryConfig[newCategoryId].currentCount++;

      return updatedSkill;
    });
  }

  /**
   * 🏗️ Optimize Category Performance
   * @private
   */
  async _optimizeCategoryPerformance() {
    const result = {
      categoriesOptimized: 0,
      skillsReorganized: 0,
      moves: []
    };

    // Get low-performing skills in each category
    for (const categoryId of Object.keys(this.categoryConfig)) {
      const lowPerformingSkills = await this.prisma.skill.findMany({
        where: {
          category: categoryId,
          isActive: true,
          performance: {
            completionRate: { lt: 0.6 }, // Below 60% completion
            satisfactionScore: { lt: 3.5 } // Below 3.5 stars
          }
        },
        include: {
          tags: true,
          metadata: true
        },
        take: 10
      });

      for (const skill of lowPerformingSkills) {
        // Find better category match
        const bestCategory = await this._determineBestCategory(skill, {});
        if (bestCategory.id !== categoryId) {
          await this._moveSkillToCategory(skill.id, bestCategory.id);
          result.skillsReorganized++;
          result.moves.push({
            skillId: skill.id,
            fromCategory: categoryId,
            toCategory: bestCategory.id,
            reason: 'PERFORMANCE_OPTIMIZATION'
          });
        }
      }

      if (lowPerformingSkills.length > 0) {
        result.categoriesOptimized++;
      }
    }

    return result;
  }

  /**
   * 🏗️ Get Category Analytics
   * @private
   */
  async _getCategoryAnalytics(categoryId) {
    const analytics = await this.prisma.skillPerformance.aggregate({
      where: {
        skill: {
          category: categoryId,
          isActive: true
        }
      },
      _avg: {
        completionRate: true,
        satisfactionScore: true,
        revenuePerStudent: true,
        studentRetention: true
      },
      _sum: {
        totalEnrollments: true,
        totalRevenue: true
      },
      _count: {
        skillId: true
      }
    });

    const trend = await this._getCategoryTrend(categoryId);

    return {
      performance: {
        averageCompletionRate: analytics._avg.completionRate || 0,
        averageSatisfaction: analytics._avg.satisfactionScore || 0,
        averageRevenuePerStudent: analytics._avg.revenuePerStudent || 0,
        studentRetention: analytics._avg.studentRetention || 0
      },
      business: {
        totalEnrollments: analytics._sum.totalEnrollments || 0,
        totalRevenue: analytics._sum.totalRevenue || 0,
        totalSkills: analytics._count.skillId || 0
      },
      trends: trend,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * 🏗️ Get Category Trend Data
   * @private
   */
  async _getCategoryTrend(categoryId) {
    // Get last 30 days performance trend
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendData = await this.prisma.skillPerformance.findMany({
      where: {
        skill: {
          category: categoryId
        },
        calculatedAt: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: {
        calculatedAt: 'asc'
      },
      take: 30
    });

    return {
      period: '30 days',
      dataPoints: trendData.length,
      trend: this._calculateTrendDirection(trendData)
    };
  }

  /**
   * 🏗️ Calculate Trend Direction
   * @private
   */
  _calculateTrendDirection(trendData) {
    if (trendData.length < 2) return 'STABLE';

    const first = trendData[0];
    const last = trendData[trendData.length - 1];

    const completionChange = last.completionRate - first.completionRate;
    const satisfactionChange = last.satisfactionScore - first.satisfactionScore;

    if (completionChange > 0.05 && satisfactionChange > 0.5) return 'IMPROVING';
    if (completionChange < -0.05 && satisfactionChange < -0.5) return 'DECLINING';
    return 'STABLE';
  }

  /**
   * 🏗️ Generate Category Recommendations
   * @private
   */
  async _generateCategoryRecommendations(categoryId, skills) {
    const recommendations = [];

    // Capacity recommendations
    const capacityRatio = skills.length / this.categoryConfig[categoryId].capacity;
    if (capacityRatio >= 0.9) {
      recommendations.push({
        type: 'CAPACITY',
        priority: 'HIGH',
        message: 'Category nearing maximum capacity',
        action: 'Consider creating sub-categories or expanding capacity'
      });
    }

    // Performance recommendations
    const avgCompletion = this.categoryConfig[categoryId].performance.completionRate;
    if (avgCompletion < 0.7) {
      recommendations.push({
        type: 'PERFORMANCE',
        priority: 'MEDIUM',
        message: 'Below target completion rate',
        action: 'Review skill difficulty and expert matching'
      });
    }

    // Diversity recommendations
    const skillTypes = new Set(skills.map(skill => skill.tags?.[0]?.name));
    if (skillTypes.size < 3) {
      recommendations.push({
        type: 'DIVERSITY',
        priority: 'LOW',
        message: 'Low skill diversity in category',
        action: 'Consider adding complementary skills'
      });
    }

    return recommendations;
  }

  /**
   * 🏗️ Category Health Check
   * @private
   */
  async _checkCategoryHealth() {
    const health = {
      service: 'category-organizer',
      timestamp: new Date().toISOString(),
      status: 'healthy',
      metrics: this.metrics,
      categories: {}
    };

    try {
      for (const [categoryId, config] of Object.entries(this.categoryConfig)) {
        const currentCount = await this.prisma.skill.count({
          where: { category: categoryId, isActive: true }
        });

        config.currentCount = currentCount;

        health.categories[categoryId] = {
          currentCount,
          capacity: config.capacity,
          utilization: (currentCount / config.capacity) * 100,
          performance: config.performance
        };

        // Check for health issues
        if (currentCount >= config.capacity) {
          health.status = 'degraded';
          health.issues = health.issues || [];
          health.issues.push(`Category ${categoryId} at full capacity`);
        }

        if (config.performance.completionRate < 0.6) {
          health.status = 'degraded';
          health.issues = health.issues || [];
          health.issues.push(`Category ${categoryId} has low completion rate`);
        }
      }

    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    await this.redis.set(
      `health:category-organizer:${Date.now()}`,
      JSON.stringify(health),
      'EX',
      120
    );

    this.emit('health.check', health);
  }

  /**
   * 🏗️ Perform Weekly Optimization
   * @private
   */
  async _performWeeklyOptimization() {
    try {
      this.emit('weekly.optimization.started');

      const result = await this.optimizeCategories({
        balanceSizes: true,
        optimizePerformance: true
      });

      this.emit('weekly.optimization.completed', result);
      this._logSuccess('WEEKLY_OPTIMIZATION_COMPLETED', result);

    } catch (error) {
      this._logError('WEEKLY_OPTIMIZATION_FAILED', error);
    }
  }

  /**
   * 🏗️ Update Performance Metrics
   * @private
   */
  _updateMetrics(processingTime) {
    this.metrics.averageOrganizationTime = 
      (this.metrics.averageOrganizationTime * this.metrics.skillsCategorized + processingTime) / 
      (this.metrics.skillsCategorized + 1);
  }

  /**
   * 🏗️ Format Enterprise Error
   * @private
   */
  _formatEnterpriseError(error) {
    const enterpriseError = new Error(error.message);
    enterpriseError.code = error.code || 'INTERNAL_ERROR';
    enterpriseError.timestamp = new Date().toISOString();
    enterpriseError.severity = this._getErrorSeverity(error.code);
    
    return enterpriseError;
  }

  /**
   * 🏗️ Get Error Severity
   * @private
   */
  _getErrorSeverity(errorCode) {
    const severityMap = {
      'INVALID_CATEGORY': 'MEDIUM',
      'SKILL_NOT_FOUND': 'LOW',
      'CATEGORY_FULL': 'HIGH',
      'OPTIMIZATION_FAILED': 'MEDIUM',
      'ANALYTICS_UNAVAILABLE': 'LOW'
    };

    return severityMap[errorCode] || 'MEDIUM';
  }

  /**
   * 🏗️ Enterprise Logging
   * @private
   */
  _logEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'category-organizer',
      event: eventType,
      data,
      environment: process.env.NODE_ENV || 'development'
    };

    console.log(JSON.stringify(logEntry));

    if (process.env.NODE_ENV === 'production') {
      this.redis.publish('service-logs', JSON.stringify(logEntry));
    }
  }

  /**
   * 🏗️ Success Logging
   * @private
   */
  _logSuccess(operation, data) {
    this._logEvent('SUCCESS', {
      operation,
      ...data,
      severity: 'INFO'
    });
  }

  /**
   * 🏗️ Error Logging
   * @private
   */
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

  /**
   * 🏗️ Get Service Metrics
   * @returns {Object} Service performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      categoryStats: Object.entries(this.categoryConfig).reduce((stats, [id, config]) => {
        stats[id] = {
          currentCount: config.currentCount,
          capacity: config.capacity,
          utilization: (config.currentCount / config.capacity) * 100
        };
        return stats;
      }, {})
    };
  }

  /**
   * 🏗️ Graceful Shutdown
   */
  async shutdown() {
    try {
      this.emit('service.shutdown.started');
      
      await this.redis.quit();
      await this.prisma.$disconnect();
      
      this.emit('service.shutdown.completed');
    } catch (error) {
      this.emit('service.shutdown.failed', { error: error.message });
      throw error;
    }
  }
}

// 🏗️ Enterprise Export Pattern
module.exports = {
  CategoryOrganizer,
  CATEGORIES,
  CATEGORY_ERRORS
};

// 🏗️ Singleton Instance for Microservice Architecture
let categoryOrganizerInstance = null;

module.exports.getInstance = (options = {}) => {
  if (!categoryOrganizerInstance) {
    categoryOrganizerInstance = new CategoryOrganizer(options);
  }
  return categoryOrganizerInstance;
};