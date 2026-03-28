// auth/skill-preferences.js

/**
 * 🎯 ENTERPRISE SKILL PREFERENCES SYSTEM
 * Unified skill selection for both Experts and Students
 * User-friendly interface with intelligent recommendations
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const { Logger } = require('../utils/logger');
const { RecommendationEngine } = require('../utils/recommendation-engine');

class SkillPreferences {
  constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('SkillPreferences');
    this.recommendationEngine = new RecommendationEngine();
    
    // Skill categories configuration
    this.categories = {
      ONLINE: {
        name: '💻 Online Skills',
        description: 'Digital skills you can learn and work from anywhere',
        color: '#3B82F6',
        icon: '💻'
      },
      OFFLINE: {
        name: '🏗️ Offline Skills',
        description: 'Hands-on skills for physical services and trades',
        color: '#10B981',
        icon: '🏗️'
      },
      HEALTH_SPORTS: {
        name: '🏥 Health & Sports',
        description: 'Fitness, wellness, and sports coaching skills',
        color: '#EF4444',
        icon: '🏥'
      },
      BEAUTY_FASHION: {
        name: '💄 Beauty & Fashion',
        description: 'Creative skills in beauty, fashion, and personal care',
        color: '#8B5CF6',
        icon: '💄'
      }
    };

    // Skill packages configuration
    this.packageTypes = {
      BASIC: {
        name: 'Starter Package',
        duration: '1 month',
        price: 499,
        features: ['Core fundamentals', 'Basic exercises', 'Community access']
      },
      STANDARD: {
        name: 'Standard Package',
        duration: '2 months',
        price: 999,
        features: ['Full curriculum', 'Practical projects', 'Expert support']
      },
      PROFESSIONAL: {
        name: 'Professional Package',
        duration: '3 months',
        price: 1499,
        features: ['Advanced techniques', 'Portfolio building', 'Career guidance']
      },
      MASTERY: {
        name: 'Mastery Package',
        duration: '4 months',
        price: 1999,
        features: ['Complete mastery', 'Certification', 'Income launchpad']
      },
      ELITE: {
        name: 'Elite Package',
        duration: '6 months',
        price: 2999,
        features: ['Elite training', 'Business setup', 'Market access']
      }
    };

    this.initialize();
  }

  /**
   * 🚀 INITIALIZE SKILL PREFERENCES SYSTEM
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.warmUpSkillCache();
      this.logger.info('Skill preferences system initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize skill preferences system', error);
      throw error;
    }
  }

  /**
   * 🎯 GET SKILLS CATALOG WITH PREFERENCES
   */
  async getSkillsCatalog(userId, userType) {
    const cacheKey = `skills:catalog:${userType}`;
    
    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const catalog = JSON.parse(cached);
        return await this.enrichCatalogWithUserData(catalog, userId, userType);
      }

      // Build comprehensive catalog
      const catalog = await this.buildSkillsCatalog();
      
      // Cache for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(catalog));
      
      return await this.enrichCatalogWithUserData(catalog, userId, userType);
      
    } catch (error) {
      this.logger.error('Failed to get skills catalog', error);
      throw error;
    }
  }

  /**
   * 🏗️ BUILD COMPREHENSIVE SKILLS CATALOG
   */
  async buildSkillsCatalog() {
    const skills = await this.prisma.skill.findMany({
      where: { status: 'ACTIVE' },
      include: {
        packages: {
          where: { status: 'ACTIVE' },
          orderBy: { price: 'asc' }
        },
        experts: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            qualityScore: true,
            currentTier: true
          }
        },
        _count: {
          select: {
            enrollments: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    });

    return skills.map(skill => this.formatSkillForCatalog(skill));
  }

  /**
   * 📝 FORMAT SKILL FOR CATALOG DISPLAY
   */
  formatSkillForCatalog(skill) {
    const category = this.categories[skill.category] || this.categories.ONLINE;
    
    return {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      category: category.name,
      categoryKey: skill.category,
      categoryColor: category.color,
      categoryIcon: category.icon,
      icon: skill.icon,
      difficulty: skill.difficulty,
      estimatedEarning: skill.estimatedEarning,
      demandLevel: skill.demandLevel,
      popularity: skill._count.enrollments,
      averageCompletionTime: skill.averageCompletionTime,
      prerequisites: skill.prerequisites || [],
      
      // Expert availability metrics
      expertMetrics: {
        totalExperts: skill.experts.length,
        availableExperts: skill.experts.filter(e => e.qualityScore >= 4.0).length,
        masterExperts: skill.experts.filter(e => e.currentTier === 'MASTER').length,
        averageQuality: skill.experts.length > 0 ? 
          skill.experts.reduce((sum, e) => sum + e.qualityScore, 0) / skill.experts.length : 0
      },

      // Package options
      packages: skill.packages.map(pkg => ({
        id: pkg.id,
        type: pkg.type,
        name: this.packageTypes[pkg.type]?.name || pkg.type,
        description: pkg.description,
        duration: pkg.duration,
        price: pkg.price,
        originalPrice: pkg.originalPrice,
        features: pkg.features || [],
        isPopular: pkg.isPopular,
        isRecommended: pkg.isRecommended
      })),

      // Learning path information
      learningPath: {
        totalPhases: 4,
        phase1: { name: 'Mindset Foundation', duration: '1 month', isFree: true },
        phase2: { name: 'Theory Mastery', duration: '2 months', description: 'Duolingo-style interactive learning' },
        phase3: { name: 'Hands-on Training', duration: '2 months', description: 'Expert-led practical sessions' },
        phase4: { name: 'Certification & Launch', duration: '1 month', description: 'Yachi verification and income start' }
      },

      // Success metrics
      successMetrics: {
        completionRate: skill.completionRate || 0.75,
        averageIncome: skill.averageIncome || 8000,
        employmentRate: skill.employmentRate || 0.85,
        studentSatisfaction: skill.studentSatisfaction || 4.5
      },

      metadata: {
        lastUpdated: skill.updatedAt,
        isFeatured: skill.isFeatured,
        isNew: skill.isNew,
        tags: skill.tags || []
      }
    };
  }

  /**
   * 💫 ENRICH CATALOG WITH USER-SPECIFIC DATA
   */
  async enrichCatalogWithUserData(catalog, userId, userType) {
    const userPreferences = await this.getUserPreferences(userId, userType);
    const recommendations = await this.getPersonalizedRecommendations(userId, userType, catalog);

    return {
      categories: this.categories,
      skills: catalog.map(skill => ({
        ...skill,
        // User-specific data
        userData: {
          isSelected: userPreferences.selectedSkills.includes(skill.id),
          isRecommended: recommendations.includes(skill.id),
          compatibilityScore: this.calculateSkillCompatibility(skill, userPreferences),
          progress: userPreferences.skillProgress[skill.id] || 0,
          lastAccessed: userPreferences.lastAccessed[skill.id]
        }
      })),
      userPreferences: {
        selectedSkills: userPreferences.selectedSkills,
        preferredCategories: userPreferences.preferredCategories,
        skillLevel: userPreferences.skillLevel,
        learningGoals: userPreferences.learningGoals
      },
      recommendations: {
        basedOnProfile: recommendations.slice(0, 5),
        trending: await this.getTrendingSkills(),
        featured: catalog.filter(skill => skill.metadata.isFeatured).slice(0, 3)
      },
      metadata: {
        totalSkills: catalog.length,
        lastUpdated: new Date(),
        userType,
        hasPreferences: userPreferences.selectedSkills.length > 0
      }
    };
  }

  /**
   * 📊 GET USER PREFERENCES
   */
  async getUserPreferences(userId, userType) {
    const cacheKey = `user:preferences:${userId}`;
    
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      let preferences;
      
      if (userType === 'EXPERT') {
        preferences = await this.prisma.expert.findUnique({
          where: { userId },
          select: {
            skills: true,
            preferredCategories: true,
            skillLevel: true,
            teachingGoals: true,
            availability: true
          }
        });
      } else {
        preferences = await this.prisma.student.findUnique({
          where: { userId },
          select: {
            skillPreferences: true,
            learningGoals: true,
            preferredSchedule: true,
            budgetRange: true
          }
        });
      }

      const defaultPreferences = {
        selectedSkills: [],
        preferredCategories: [],
        skillLevel: 'BEGINNER',
        learningGoals: [],
        skillProgress: {},
        lastAccessed: {}
      };

      const userPreferences = preferences ? this.normalizeUserPreferences(preferences, userType) : defaultPreferences;

      // Cache for 15 minutes
      await this.redis.setex(cacheKey, 900, JSON.stringify(userPreferences));

      return userPreferences;

    } catch (error) {
      this.logger.error('Failed to get user preferences', error);
      return {
        selectedSkills: [],
        preferredCategories: [],
        skillLevel: 'BEGINNER',
        learningGoals: [],
        skillProgress: {},
        lastAccessed: {}
      };
    }
  }

  /**
   * 🔄 NORMALIZE USER PREFERENCES
   */
  normalizeUserPreferences(preferences, userType) {
    if (userType === 'EXPERT') {
      return {
        selectedSkills: preferences.skills || [],
        preferredCategories: preferences.preferredCategories || [],
        skillLevel: preferences.skillLevel || 'EXPERT',
        learningGoals: preferences.teachingGoals || [],
        skillProgress: {},
        lastAccessed: {}
      };
    } else {
      return {
        selectedSkills: preferences.skillPreferences?.selectedSkills || [],
        preferredCategories: preferences.skillPreferences?.preferredCategories || [],
        skillLevel: preferences.skillPreferences?.skillLevel || 'BEGINNER',
        learningGoals: preferences.learningGoals || [],
        skillProgress: preferences.skillPreferences?.progress || {},
        lastAccessed: preferences.skillPreferences?.lastAccessed || {}
      };
    }
  }

  /**
   * 🎯 UPDATE USER SKILL PREFERENCES
   */
  async updateSkillPreferences(userId, userType, preferences) {
    const startTime = Date.now();
    
    try {
      // Validate preferences
      await this.validatePreferences(preferences, userType);

      // Update in database
      const result = await this.savePreferencesToDatabase(userId, userType, preferences);

      // Clear cache
      await this.redis.del(`user:preferences:${userId}`);
      await this.redis.del(`user:recommendations:${userId}`);

      // Generate recommendations based on new preferences
      await this.generateAndStoreRecommendations(userId, userType, preferences);

      // Emit event for analytics
      this.emit('preferencesUpdated', {
        userId,
        userType,
        preferences,
        timestamp: new Date()
      });

      this.logger.info('Skill preferences updated successfully', {
        userId,
        userType,
        selectedSkills: preferences.selectedSkills.length,
        processingTime: Date.now() - startTime
      });

      return {
        success: true,
        preferences: result,
        recommendations: await this.getPersonalizedRecommendations(userId, userType)
      };

    } catch (error) {
      this.logger.error('Failed to update skill preferences', error);
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE PREFERENCES
   */
  async validatePreferences(preferences, userType) {
    const errors = [];

    // Validate selected skills
    if (preferences.selectedSkills && Array.isArray(preferences.selectedSkills)) {
      if (preferences.selectedSkills.length > 10) {
        errors.push('Cannot select more than 10 skills');
      }

      // Verify skills exist and are active
      const validSkills = await this.prisma.skill.findMany({
        where: {
          id: { in: preferences.selectedSkills },
          status: 'ACTIVE'
        },
        select: { id: true }
      });

      const validSkillIds = validSkills.map(s => s.id);
      const invalidSkills = preferences.selectedSkills.filter(id => !validSkillIds.includes(id));

      if (invalidSkills.length > 0) {
        errors.push(`Invalid skills selected: ${invalidSkills.join(', ')}`);
      }
    }

    // Validate skill level
    const validLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
    if (preferences.skillLevel && !validLevels.includes(preferences.skillLevel)) {
      errors.push('Invalid skill level');
    }

    // Validate categories
    if (preferences.preferredCategories && Array.isArray(preferences.preferredCategories)) {
      const validCategories = Object.keys(this.categories);
      const invalidCategories = preferences.preferredCategories.filter(cat => !validCategories.includes(cat));
      
      if (invalidCategories.length > 0) {
        errors.push(`Invalid categories: ${invalidCategories.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join('; ')}`);
    }
  }

  /**
   * 💾 SAVE PREFERENCES TO DATABASE
   */
  async savePreferencesToDatabase(userId, userType, preferences) {
    if (userType === 'EXPERT') {
      return await this.prisma.expert.update({
        where: { userId },
        data: {
          skills: preferences.selectedSkills || [],
          preferredCategories: preferences.preferredCategories || [],
          skillLevel: preferences.skillLevel,
          teachingGoals: preferences.learningGoals || [],
          updatedAt: new Date()
        }
      });
    } else {
      // For students, store in skillPreferences JSON field
      return await this.prisma.student.update({
        where: { userId },
        data: {
          skillPreferences: {
            selectedSkills: preferences.selectedSkills || [],
            preferredCategories: preferences.preferredCategories || [],
            skillLevel: preferences.skillLevel,
            learningGoals: preferences.learningGoals || [],
            updatedAt: new Date()
          },
          updatedAt: new Date()
        }
      });
    }
  }

  /**
   * 🧠 GET PERSONALIZED RECOMMENDATIONS
   */
  async getPersonalizedRecommendations(userId, userType, catalog = null) {
    const cacheKey = `user:recommendations:${userId}`;
    
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      if (!catalog) {
        catalog = await this.buildSkillsCatalog();
      }

      const userPreferences = await this.getUserPreferences(userId, userType);
      const recommendations = await this.recommendationEngine.generateRecommendations(
        userPreferences,
        catalog,
        userType
      );

      // Cache for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(recommendations));

      return recommendations;

    } catch (error) {
      this.logger.error('Failed to get recommendations', error);
      return await this.getFallbackRecommendations(catalog);
    }
  }

  /**
   * 🔄 GENERATE AND STORE RECOMMENDATIONS
   */
  async generateAndStoreRecommendations(userId, userType, preferences) {
    const catalog = await this.buildSkillsCatalog();
    const recommendations = await this.recommendationEngine.generateRecommendations(
      preferences,
      catalog,
      userType
    );

    await this.redis.setex(`user:recommendations:${userId}`, 3600, JSON.stringify(recommendations));
    return recommendations;
  }

  /**
   * 📈 GET TRENDING SKILLS
   */
  async getTrendingSkills() {
    const cacheKey = 'skills:trending';
    
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const trending = await this.prisma.skill.findMany({
        where: { status: 'ACTIVE' },
        include: {
          _count: {
            select: {
              enrollments: {
                where: {
                  createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                  }
                }
              }
            }
          }
        },
        orderBy: {
          enrollments: {
            _count: 'desc'
          }
        },
        take: 10
      });

      const trendingSkills = trending.map(skill => skill.id);

      // Cache for 6 hours
      await this.redis.setex(cacheKey, 21600, JSON.stringify(trendingSkills));

      return trendingSkills;

    } catch (error) {
      this.logger.error('Failed to get trending skills', error);
      return [];
    }
  }

  /**
   * 🎯 CALCULATE SKILL COMPATIBILITY
   */
  calculateSkillCompatibility(skill, userPreferences) {
    let score = 0;
    const maxScore = 100;

    // Category preference match (30 points)
    if (userPreferences.preferredCategories.includes(skill.categoryKey)) {
      score += 30;
    }

    // Skill level match (25 points)
    const levelWeights = {
      BEGINNER: { BEGINNER: 25, INTERMEDIATE: 15, ADVANCED: 5, EXPERT: 0 },
      INTERMEDIATE: { BEGINNER: 15, INTERMEDIATE: 25, ADVANCED: 15, EXPERT: 5 },
      ADVANCED: { BEGINNER: 5, INTERMEDIATE: 15, ADVANCED: 25, EXPERT: 15 },
      EXPERT: { BEGINNER: 0, INTERMEDIATE: 5, ADVANCED: 15, EXPERT: 25 }
    };

    const userLevel = userPreferences.skillLevel || 'BEGINNER';
    const skillLevel = skill.difficulty || 'BEGINNER';
    score += levelWeights[userLevel][skillLevel] || 0;

    // Demand and earning potential (20 points)
    if (skill.demandLevel === 'HIGH') score += 10;
    if (skill.estimatedEarning > 10000) score += 10;

    // Expert availability (15 points)
    if (skill.expertMetrics.availableExperts > 5) score += 15;
    else if (skill.expertMetrics.availableExperts > 2) score += 10;
    else if (skill.expertMetrics.availableExperts > 0) score += 5;

    // Success metrics (10 points)
    if (skill.successMetrics.completionRate > 0.8) score += 5;
    if (skill.successMetrics.studentSatisfaction > 4.5) score += 5;

    return Math.min(score, maxScore);
  }

  /**
   * 🔥 GET FALLBACK RECOMMENDATIONS
   */
  async getFallbackRecommendations(catalog = null) {
    if (!catalog) {
      catalog = await this.buildSkillsCatalog();
    }

    // Return most popular skills as fallback
    return catalog
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 5)
      .map(skill => skill.id);
  }

  /**
   * 🔥 WARM UP SKILL CACHE
   */
  async warmUpSkillCache() {
    try {
      const [catalog, trending] = await Promise.all([
        this.buildSkillsCatalog(),
        this.getTrendingSkills()
      ]);

      await this.redis.setex('skills:catalog:STUDENT', 3600, JSON.stringify(catalog));
      await this.redis.setex('skills:catalog:EXPERT', 3600, JSON.stringify(catalog));
      await this.redis.setex('skills:trending', 21600, JSON.stringify(trending));

      this.logger.info('Skill cache warmed up successfully', {
        skillsCount: catalog.length,
        trendingCount: trending.length
      });

    } catch (error) {
      this.logger.error('Failed to warm up skill cache', error);
    }
  }

  /**
   * 📊 GET SKILL SELECTION ANALYTICS
   */
  async getSkillSelectionAnalytics() {
    const cacheKey = 'analytics:skill-selections';
    
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const analytics = {
        totalSelections: await this.getTotalSkillSelections(),
        categoryDistribution: await this.getCategoryDistribution(),
        popularSkills: await this.getMostPopularSkills(),
        userPreferences: await this.getUserPreferencePatterns(),
        timestamp: new Date()
      };

      // Cache for 1 hour
      await this.redis.setex(cacheKey, 3600, JSON.stringify(analytics));

      return analytics;

    } catch (error) {
      this.logger.error('Failed to get skill selection analytics', error);
      return {};
    }
  }

  /**
   * 📈 GET TOTAL SKILL SELECTIONS
   */
  async getTotalSkillSelections() {
    const [students, experts] = await Promise.all([
      this.prisma.student.count({
        where: {
          skillPreferences: {
            path: ['selectedSkills'],
            array_contains: { $size: { $gt: 0 } }
          }
        }
      }),
      this.prisma.expert.count({
        where: {
          skills: { isEmpty: false }
        }
      })
    ]);

    return { students, experts, total: students + experts };
  }

  /**
   * 🎯 GET CATEGORY DISTRIBUTION
   */
  async getCategoryDistribution() {
    const distribution = {};

    for (const category of Object.keys(this.categories)) {
      const [studentCount, expertCount] = await Promise.all([
        this.prisma.student.count({
          where: {
            skillPreferences: {
              path: ['preferredCategories'],
              array_contains: category
            }
          }
        }),
        this.prisma.expert.count({
          where: {
            preferredCategories: { has: category }
          }
        })
      ]);

      distribution[category] = {
        students: studentCount,
        experts: expertCount,
        total: studentCount + expertCount
      };
    }

    return distribution;
  }

  /**
   * 📊 GET MOST POPULAR SKILLS
   */
  async getMostPopularSkills() {
    const skills = await this.prisma.skill.findMany({
      where: { status: 'ACTIVE' },
      include: {
        _count: {
          select: {
            studentPreferences: {
              where: {
                skillPreferences: {
                  path: ['selectedSkills'],
                  array_contains: { $exists: true }
                }
              }
            },
            experts: true
          }
        }
      },
      orderBy: {
        studentPreferences: {
          _count: 'desc'
        }
      },
      take: 10
    });

    return skills.map(skill => ({
      id: skill.id,
      name: skill.name,
      studentSelections: skill._count.studentPreferences,
      expertSelections: skill._count.experts,
      totalSelections: skill._count.studentPreferences + skill._count.experts
    }));
  }

  /**
   * 🔍 GET USER PREFERENCE PATTERNS
   */
  async getUserPreferencePatterns() {
    const patterns = {
      averageSkillsPerUser: 0,
      mostCommonSkillLevel: 'BEGINNER',
      popularLearningGoals: [],
      commonCategoryCombinations: []
    };

    // This would typically involve more complex analytics
    // For now, return basic patterns
    return patterns;
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.logger.info('Skill preferences system resources cleaned up');
    } catch (error) {
      this.logger.error('Error during skill preferences cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new SkillPreferences();