// skills-service/skill-catalog-manager.js

/**
 * 🛠️ ENTERPRISE SKILL CATALOG MANAGEMENT SYSTEM
 * Comprehensive management of 40+ skills with packages, categories, and progression
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../utils/logger');
const { ValidationEngine } = require('../utils/validation-engine');
const { SearchEngine } = require('../utils/search-engine');

class SkillCatalogManager extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('SkillCatalogManager');
    this.validationEngine = new ValidationEngine();
    this.searchEngine = new SearchEngine();

    // Skill categories configuration
    this.categories = {
      ONLINE: {
        name: 'Online Skills',
        description: 'Digital and remote work skills',
        color: '#3B82F6',
        icon: '💻',
        priority: 1
      },
      OFFLINE: {
        name: 'Offline Skills',
        description: 'Physical and hands-on skills',
        color: '#10B981',
        icon: '🏗️',
        priority: 2
      },
      HEALTH_SPORTS: {
        name: 'Health & Sports',
        description: 'Fitness, wellness, and sports skills',
        color: '#EF4444',
        icon: '🏥',
        priority: 3
      },
      BEAUTY_FASHION: {
        name: 'Beauty & Fashion',
        description: 'Beauty, fashion, and personal care skills',
        color: '#8B5CF6',
        icon: '💄',
        priority: 4
      }
    };

    // Package configurations
    this.packageTiers = {
      BASIC: {
        name: 'Basic',
        price: 1499,
        duration: '1 month',
        features: ['Core theory', 'Basic exercises', 'Community access'],
        color: '#6B7280'
      },
      STANDARD: {
        name: 'Standard',
        price: 1999,
        duration: '2 months',
        features: ['Full theory', 'Practical exercises', 'Expert support', 'Certificate'],
        color: '#10B981'
      },
      PREMIUM: {
        name: 'Premium',
        price: 2999,
        duration: '3 months',
        features: ['Advanced theory', 'Real projects', '1-on-1 mentoring', 'Job placement'],
        color: '#F59E0B'
      },
      PROFESSIONAL: {
        name: 'Professional',
        price: 4999,
        duration: '4 months',
        features: ['Master classes', 'Portfolio building', 'Industry certification', 'Guaranteed income'],
        color: '#8B5CF6'
      },
      ELITE: {
        name: 'Elite',
        price: 7999,
        duration: '6 months',
        features: ['Advanced certification', 'Business setup', 'Market access', 'Ongoing support'],
        color: '#EC4899'
      }
    };

    // Skill configuration
    this.skillConfig = {
      MAX_SKILLS_PER_CATEGORY: 10,
      MIN_PACKAGES_PER_SKILL: 3,
      MAX_PACKAGES_PER_SKILL: 5,
      SKILL_APPROVAL_REQUIRED: true,
      DEFAULT_DIFFICULTY: 'BEGINNER',
      SKILL_LIFECYCLE: {
        DRAFT: 'DRAFT',
        UNDER_REVIEW: 'UNDER_REVIEW',
        ACTIVE: 'ACTIVE',
        ARCHIVED: 'ARCHIVED',
        DEPRECATED: 'DEPRECATED'
      }
    };

    this.cache = new Map();
    this.initialize();
  }

  /**
   * 🚀 INITIALIZE SKILL CATALOG MANAGER
   */
  async initialize() {
    try {
      await this.redis.ping();
      
      // Load initial skill catalog
      await this.loadSkillCatalog();
      
      // Start cache warming
      this.startCacheWarming();
      
      // Start skill analytics
      this.startSkillAnalytics();
      
      this.logger.info('Skill catalog manager initialized successfully');
      this.emit('catalogReady');
      
    } catch (error) {
      this.logger.error('Failed to initialize skill catalog manager', error);
      throw error;
    }
  }

  /**
   * 📥 LOAD SKILL CATALOG
   */
  async loadSkillCatalog() {
    try {
      // Check if skills already exist
      const existingSkills = await this.prisma.skill.count();
      
      if (existingSkills === 0) {
        await this.seedInitialSkills();
        this.logger.info('Initial skill catalog seeded');
      } else {
        await this.refreshSkillCache();
        this.logger.info('Skill catalog loaded from database');
      }
      
    } catch (error) {
      this.logger.error('Failed to load skill catalog', error);
      throw error;
    }
  }

  /**
   * 🌱 SEED INITIAL SKILLS
   */
  async seedInitialSkills() {
    const skills = this.getInitialSkillsData();
    
    for (const skillData of skills) {
      try {
        await this.createSkill(skillData);
      } catch (error) {
        this.logger.error(`Failed to create skill: ${skillData.name}`, error);
      }
    }
    
    this.logger.info(`Seeded ${skills.length} initial skills`);
  }

  /**
   * 🎯 GET INITIAL SKILLS DATA
   */
  getInitialSkillsData() {
    return [
      // 💻 Online Skills (10)
      {
        name: 'Forex Trading Mastery',
        description: 'Master currency trading with ICT, SMC, Price Action strategies',
        category: 'ONLINE',
        difficulty: 'ADVANCED',
        duration: '4 months',
        averageIncome: '8,000-15,000 ETB/month',
        requirements: ['Basic math', 'Internet access', 'Discipline'],
        tags: ['trading', 'forex', 'finance', 'investment'],
        icon: '📈',
        color: '#10B981',
        popularity: 95,
        successRate: 78,
        packages: this.generateSkillPackages('Forex Trading Mastery')
      },
      {
        name: 'Professional Graphic Design',
        description: 'Learn logo design, social media graphics, UI/UX, and branding',
        category: 'ONLINE',
        difficulty: 'INTERMEDIATE',
        duration: '3 months',
        averageIncome: '6,000-12,000 ETB/month',
        requirements: ['Creativity', 'Computer literacy'],
        tags: ['design', 'creative', 'branding', 'ui-ux'],
        icon: '🎨',
        color: '#8B5CF6',
        popularity: 88,
        successRate: 82,
        packages: this.generateSkillPackages('Professional Graphic Design')
      },
      {
        name: 'Digital Marketing Pro',
        description: 'Master SEO, social media, email marketing, PPC, and analytics',
        category: 'ONLINE',
        difficulty: 'INTERMEDIATE',
        duration: '3 months',
        averageIncome: '7,000-14,000 ETB/month',
        requirements: ['Communication skills', 'Basic English'],
        tags: ['marketing', 'seo', 'social-media', 'analytics'],
        icon: '📱',
        color: '#3B82F6',
        popularity: 92,
        successRate: 75,
        packages: this.generateSkillPackages('Digital Marketing Pro')
      },
      {
        name: 'Full-Stack Web Development',
        description: 'Learn frontend, backend, e-commerce, WordPress, and mobile development',
        category: 'ONLINE',
        difficulty: 'ADVANCED',
        duration: '6 months',
        averageIncome: '10,000-20,000 ETB/month',
        requirements: ['Logical thinking', 'Problem solving'],
        tags: ['programming', 'web', 'development', 'coding'],
        icon: '💻',
        color: '#F59E0B',
        popularity: 96,
        successRate: 70,
        packages: this.generateSkillPackages('Full-Stack Web Development')
      },
      {
        name: 'Professional Content Writing',
        description: 'Master blog writing, SEO content, copywriting, and technical writing',
        category: 'ONLINE',
        difficulty: 'BEGINNER',
        duration: '2 months',
        averageIncome: '5,000-10,000 ETB/month',
        requirements: ['Good writing skills', 'English proficiency'],
        tags: ['writing', 'content', 'seo', 'copywriting'],
        icon: '✍️',
        color: '#EC4899',
        popularity: 85,
        successRate: 80,
        packages: this.generateSkillPackages('Professional Content Writing')
      },
      {
        name: 'Video Editing Professional',
        description: 'Learn YouTube editing, social media videos, corporate videos, and documentaries',
        category: 'ONLINE',
        difficulty: 'INTERMEDIATE',
        duration: '3 months',
        averageIncome: '6,000-12,000 ETB/month',
        requirements: ['Creativity', 'Computer literacy'],
        tags: ['video', 'editing', 'youtube', 'creative'],
        icon: '🎬',
        color: '#EF4444',
        popularity: 82,
        successRate: 78,
        packages: this.generateSkillPackages('Video Editing Professional')
      },
      {
        name: 'Social Media Management',
        description: 'Master social strategy, content creation, analytics, ads, and community management',
        category: 'ONLINE',
        difficulty: 'BEGINNER',
        duration: '2 months',
        averageIncome: '5,000-9,000 ETB/month',
        requirements: ['Social media familiarity', 'Communication skills'],
        tags: ['social-media', 'management', 'content', 'analytics'],
        icon: '📊',
        color: '#6366F1',
        popularity: 90,
        successRate: 85,
        packages: this.generateSkillPackages('Social Media Management')
      },
      {
        name: 'E-commerce Management',
        description: 'Learn Shopify, Amazon, dropshipping, inventory, and marketing',
        category: 'ONLINE',
        difficulty: 'INTERMEDIATE',
        duration: '3 months',
        averageIncome: '8,000-15,000 ETB/month',
        requirements: ['Business mindset', 'Basic computer skills'],
        tags: ['ecommerce', 'business', 'dropshipping', 'marketing'],
        icon: '🛒',
        color: '#10B981',
        popularity: 87,
        successRate: 72,
        packages: this.generateSkillPackages('E-commerce Management')
      },
      {
        name: 'Data Analysis & Visualization',
        description: 'Master Excel, SQL, data visualization, reporting, and Python',
        category: 'ONLINE',
        difficulty: 'ADVANCED',
        duration: '4 months',
        averageIncome: '9,000-18,000 ETB/month',
        requirements: ['Analytical thinking', 'Math skills'],
        tags: ['data', 'analysis', 'excel', 'sql', 'python'],
        icon: '📊',
        color: '#8B5CF6',
        popularity: 89,
        successRate: 68,
        packages: this.generateSkillPackages('Data Analysis & Visualization')
      },
      {
        name: 'Mobile App Development',
        description: 'Learn React Native, Flutter, iOS, Android, and backend development',
        category: 'ONLINE',
        difficulty: 'ADVANCED',
        duration: '6 months',
        averageIncome: '12,000-25,000 ETB/month',
        requirements: ['Programming basics', 'Logical thinking'],
        tags: ['mobile', 'development', 'react-native', 'flutter'],
        icon: '📱',
        color: '#3B82F6',
        popularity: 91,
        successRate: 65,
        packages: this.generateSkillPackages('Mobile App Development')
      },

      // 🏗️ Offline Skills (10)
      {
        name: 'Professional Woodworking',
        description: 'Master furniture making, kitchen installation, remodeling, and carving',
        category: 'OFFLINE',
        difficulty: 'INTERMEDIATE',
        duration: '4 months',
        averageIncome: '7,000-14,000 ETB/month',
        requirements: ['Physical fitness', 'Attention to detail'],
        tags: ['woodworking', 'furniture', 'carpentry', 'craftsmanship'],
        icon: '🪵',
        color: '#D97706',
        popularity: 75,
        successRate: 85,
        packages: this.generateSkillPackages('Professional Woodworking')
      },
      {
        name: 'Construction & Masonry',
        description: 'Learn masonry, concrete work, framing, finishing, and renovation',
        category: 'OFFLINE',
        difficulty: 'INTERMEDIATE',
        duration: '4 months',
        averageIncome: '8,000-16,000 ETB/month',
        requirements: ['Physical strength', 'Teamwork'],
        tags: ['construction', 'masonry', 'building', 'renovation'],
        icon: '🏗️',
        color: '#78716C',
        popularity: 80,
        successRate: 82,
        packages: this.generateSkillPackages('Construction & Masonry')
      },
      // ... Additional skills would be defined here for all 40 skills
    ];
  }

  /**
   * 📦 GENERATE SKILL PACKAGES
   */
  generateSkillPackages(skillName) {
    return [
      {
        tier: 'BASIC',
        name: `${skillName} Basics`,
        description: `Get started with ${skillName}`,
        price: this.packageTiers.BASIC.price,
        duration: this.packageTiers.BASIC.duration,
        features: this.packageTiers.BASIC.features,
        color: this.packageTiers.BASIC.color,
        isActive: true
      },
      {
        tier: 'STANDARD',
        name: `${skillName} Professional`,
        description: `Become proficient in ${skillName}`,
        price: this.packageTiers.STANDARD.price,
        duration: this.packageTiers.STANDARD.duration,
        features: this.packageTiers.STANDARD.features,
        color: this.packageTiers.STANDARD.color,
        isActive: true
      },
      {
        tier: 'PREMIUM',
        name: `${skillName} Mastery`,
        description: `Master ${skillName} with advanced techniques`,
        price: this.packageTiers.PREMIUM.price,
        duration: this.packageTiers.PREMIUM.duration,
        features: this.packageTiers.PREMIUM.features,
        color: this.packageTiers.PREMIUM.color,
        isActive: true
      }
    ];
  }

  /**
   * 🆕 CREATE NEW SKILL
   */
  async createSkill(skillData) {
    const startTime = performance.now();
    
    try {
      // 🛡️ Validate skill data
      await this.validateSkillData(skillData);

      // 🔍 Check for duplicate skills
      await this.checkDuplicateSkill(skillData.name);

      // 📊 Generate skill metadata
      const skillMetadata = this.generateSkillMetadata(skillData);

      // 💾 Create skill with packages
      const skill = await this.prisma.$transaction(async (tx) => {
        // Create main skill
        const createdSkill = await tx.skill.create({
          data: {
            name: skillData.name,
            description: skillData.description,
            category: skillData.category,
            difficulty: skillData.difficulty || this.skillConfig.DEFAULT_DIFFICULTY,
            duration: skillData.duration,
            averageIncome: skillData.averageIncome,
            requirements: skillData.requirements || [],
            tags: skillData.tags || [],
            icon: skillData.icon,
            color: skillData.color,
            popularity: skillData.popularity || 50,
            successRate: skillData.successRate || 70,
            metadata: skillMetadata,
            status: this.skillConfig.SKILL_APPROVAL_REQUIRED ? 
              this.skillConfig.SKILL_LIFECYCLE.UNDER_REVIEW : 
              this.skillConfig.SKILL_LIFECYCLE.ACTIVE,
            createdBy: skillData.createdBy || 'system',
            version: 1
          }
        });

        // Create packages for the skill
        if (skillData.packages && skillData.packages.length > 0) {
          const packages = skillData.packages.map(pkg => ({
            skillId: createdSkill.id,
            tier: pkg.tier,
            name: pkg.name,
            description: pkg.description,
            price: pkg.price,
            duration: pkg.duration,
            features: pkg.features,
            color: pkg.color,
            isActive: pkg.isActive !== false,
            metadata: {
              createdAt: new Date(),
              version: 1
            }
          }));

          await tx.skillPackage.createMany({
            data: packages
          });
        }

        return createdSkill;
      });

      // 🔄 Update cache and indexes
      await this.updateSkillCache(skill.id);
      await this.updateSearchIndex(skill);

      const processingTime = performance.now() - startTime;

      this.emit('skillCreated', {
        skillId: skill.id,
        skillName: skill.name,
        category: skill.category,
        processingTime
      });

      return {
        success: true,
        skillId: skill.id,
        skillName: skill.name,
        status: skill.status,
        message: 'Skill created successfully and awaiting approval'
      };

    } catch (error) {
      this.logger.error('Skill creation failed', error, { skillName: skillData.name });
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE SKILL DATA
   */
  async validateSkillData(skillData) {
    const requiredFields = ['name', 'description', 'category', 'duration', 'averageIncome'];
    
    for (const field of requiredFields) {
      if (!skillData[field]) {
        throw new Error(`MISSING_REQUIRED_FIELD: ${field}`);
      }
    }

    // Validate category
    if (!Object.keys(this.categories).includes(skillData.category)) {
      throw new Error(`INVALID_CATEGORY: ${skillData.category}`);
    }

    // Validate name length
    if (skillData.name.length < 3 || skillData.name.length > 100) {
      throw new Error('INVALID_SKILL_NAME_LENGTH');
    }

    // Validate description length
    if (skillData.description.length < 10 || skillData.description.length > 500) {
      throw new Error('INVALID_DESCRIPTION_LENGTH');
    }

    // Validate packages
    if (skillData.packages) {
      if (skillData.packages.length < this.skillConfig.MIN_PACKAGES_PER_SKILL) {
        throw new Error('INSUFFICIENT_PACKAGES');
      }

      if (skillData.packages.length > this.skillConfig.MAX_PACKAGES_PER_SKILL) {
        throw new Error('TOO_MANY_PACKAGES');
      }

      for (const pkg of skillData.packages) {
        await this.validatePackageData(pkg);
      }
    }

    // Validate difficulty
    const validDifficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
    if (skillData.difficulty && !validDifficulties.includes(skillData.difficulty)) {
      throw new Error('INVALID_DIFFICULTY_LEVEL');
    }

    this.logger.debug('Skill data validation passed', { skillName: skillData.name });
  }

  /**
   * 📦 VALIDATE PACKAGE DATA
   */
  async validatePackageData(packageData) {
    const requiredFields = ['tier', 'name', 'price', 'duration'];
    
    for (const field of requiredFields) {
      if (!packageData[field]) {
        throw new Error(`MISSING_PACKAGE_FIELD: ${field}`);
      }
    }

    // Validate tier
    if (!Object.keys(this.packageTiers).includes(packageData.tier)) {
      throw new Error(`INVALID_PACKAGE_TIER: ${packageData.tier}`);
    }

    // Validate price
    if (packageData.price < 0 || packageData.price > 50000) {
      throw new Error('INVALID_PACKAGE_PRICE');
    }

    this.logger.debug('Package data validation passed', { packageName: packageData.name });
  }

  /**
   * 🔍 CHECK DUPLICATE SKILL
   */
  async checkDuplicateSkill(skillName) {
    const existingSkill = await this.prisma.skill.findFirst({
      where: {
        name: {
          equals: skillName,
          mode: 'insensitive'
        },
        status: {
          in: [this.skillConfig.SKILL_LIFECYCLE.ACTIVE, this.skillConfig.SKILL_LIFECYCLE.UNDER_REVIEW]
        }
      }
    });

    if (existingSkill) {
      throw new Error('DUPLICATE_SKILL_NAME');
    }
  }

  /**
   * 📊 GENERATE SKILL METADATA
   */
  generateSkillMetadata(skillData) {
    return {
      createdAt: new Date(),
      version: 1,
      marketDemand: this.calculateMarketDemand(skillData),
      learningCurve: this.estimateLearningCurve(skillData),
      equipmentRequirements: skillData.equipmentRequirements || [],
      prerequisites: skillData.prerequisites || [],
      certificationAvailable: skillData.certificationAvailable !== false,
      jobOpportunities: this.generateJobOpportunities(skillData),
      estimatedROI: this.calculateEstimatedROI(skillData)
    };
  }

  /**
   * 📈 CALCULATE MARKET DEMAND
   */
  calculateMarketDemand(skillData) {
    let demand = 50; // Base demand

    // Adjust based on category
    const categoryDemand = {
      'ONLINE': 20,
      'OFFLINE': 10,
      'HEALTH_SPORTS': 15,
      'BEAUTY_FASHION': 5
    };

    demand += categoryDemand[skillData.category] || 0;

    // Adjust based on average income
    const incomeMatch = skillData.averageIncome.match(/(\d+),?(\d+)?-(\d+),?(\d+)?/);
    if (incomeMatch) {
      const minIncome = parseInt(incomeMatch[1] + (incomeMatch[2] || ''));
      if (minIncome > 10000) demand += 20;
      else if (minIncome > 5000) demand += 10;
    }

    return Math.min(100, demand);
  }

  /**
   * 📚 ESTIMATE LEARNING CURVE
   */
  estimateLearningCurve(skillData) {
    const difficultyCurve = {
      'BEGINNER': 30,
      'INTERMEDIATE': 60,
      'ADVANCED': 80,
      'EXPERT': 95
    };

    return difficultyCurve[skillData.difficulty] || 50;
  }

  /**
   * 💼 GENERATE JOB OPPORTUNITIES
   */
  generateJobOpportunities(skillData) {
    const opportunities = [];
    
    if (skillData.category === 'ONLINE') {
      opportunities.push('Freelance Work', 'Remote Jobs', 'Agency Positions');
    } else if (skillData.category === 'OFFLINE') {
      opportunities.push('Local Contracts', 'Construction Projects', 'Maintenance Services');
    } else if (skillData.category === 'HEALTH_SPORTS') {
      opportunities.push('Fitness Centers', 'Personal Training', 'Sports Clubs');
    } else if (skillData.category === 'BEAUTY_FASHION') {
      opportunities.push('Salons', 'Fashion Houses', 'Beauty Centers');
    }

    return opportunities.slice(0, 5);
  }

  /**
   * 💰 CALCULATE ESTIMATED ROI
   */
  calculateEstimatedROI(skillData) {
    const incomeMatch = skillData.averageIncome.match(/(\d+),?(\d+)?-(\d+),?(\d+)?/);
    if (!incomeMatch) return 200; // Default ROI

    const minIncome = parseInt(incomeMatch[1] + (incomeMatch[2] || ''));
    const maxIncome = parseInt(incomeMatch[3] + (incomeMatch[4] || ''));
    const avgIncome = (minIncome + maxIncome) / 2;

    // Assume average package price is 2500 ETB
    const averageCost = 2500;
    const monthlyROI = (avgIncome / averageCost) * 100;

    return Math.min(1000, Math.round(monthlyROI));
  }

  /**
   * 🔄 UPDATE SKILL CACHE
   */
  async updateSkillCache(skillId) {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        packages: {
          where: { isActive: true },
          orderBy: { price: 'asc' }
        }
      }
    });

    if (skill) {
      const cacheKey = `skill:${skillId}`;
      await this.redis.setex(cacheKey, 3600, JSON.stringify(skill)); // Cache for 1 hour

      // Update category cache
      await this.updateCategoryCache(skill.category);
    }
  }

  /**
   * 📁 UPDATE CATEGORY CACHE
   */
  async updateCategoryCache(category) {
    const skills = await this.prisma.skill.findMany({
      where: { 
        category,
        status: this.skillConfig.SKILL_LIFECYCLE.ACTIVE
      },
      include: {
        packages: {
          where: { isActive: true },
          orderBy: { price: 'asc' }
        }
      },
      orderBy: { popularity: 'desc' }
    });

    const cacheKey = `category:${category}:skills`;
    await this.redis.setex(cacheKey, 1800, JSON.stringify(skills)); // Cache for 30 minutes
  }

  /**
   * 🔍 UPDATE SEARCH INDEX
   */
  async updateSearchIndex(skill) {
    const searchDocument = {
      id: skill.id,
      name: skill.name,
      description: skill.description,
      category: skill.category,
      tags: skill.tags,
      difficulty: skill.difficulty,
      popularity: skill.popularity,
      successRate: skill.successRate,
      metadata: skill.metadata
    };

    await this.searchEngine.indexDocument('skills', searchDocument);
  }

  /**
   * 📋 GET SKILL CATALOG
   */
  async getSkillCatalog(options = {}) {
    const {
      category = null,
      difficulty = null,
      page = 1,
      limit = 20,
      sortBy = 'popularity',
      sortOrder = 'desc'
    } = options;

    const cacheKey = this.generateCatalogCacheKey(options);
    
    try {
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const whereClause = this.buildCatalogWhereClause({ category, difficulty });
      
      const [skills, totalCount] = await Promise.all([
        this.prisma.skill.findMany({
          where: whereClause,
          include: {
            packages: {
              where: { isActive: true },
              orderBy: { price: 'asc' }
            }
          },
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { [sortBy]: sortOrder }
        }),
        this.prisma.skill.count({ where: whereClause })
      ]);

      const result = {
        skills,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        },
        filters: {
          category,
          difficulty
        },
        timestamp: new Date()
      };

      // Cache for 15 minutes
      await this.redis.setex(cacheKey, 900, JSON.stringify(result));

      return result;

    } catch (error) {
      this.logger.error('Failed to get skill catalog', error, { options });
      throw error;
    }
  }

  /**
   * 🏗️ BUILD CATALOG WHERE CLAUSE
   */
  buildCatalogWhereClause(filters) {
    const where = {
      status: this.skillConfig.SKILL_LIFECYCLE.ACTIVE
    };

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    return where;
  }

  /**
   * 🔑 GENERATE CATALOG CACHE KEY
   */
  generateCatalogCacheKey(options) {
    const keyParts = [
      'catalog',
      options.category || 'all',
      options.difficulty || 'all',
      options.page || 1,
      options.limit || 20,
      options.sortBy || 'popularity',
      options.sortOrder || 'desc'
    ];

    return keyParts.join(':');
  }

  /**
   * 🔎 SEARCH SKILLS
   */
  async searchSkills(query, options = {}) {
    const startTime = performance.now();
    
    try {
      const searchResults = await this.searchEngine.search('skills', query, {
        fields: ['name', 'description', 'tags'],
        limit: options.limit || 20,
        offset: options.offset || 0,
        filters: this.buildSearchFilters(options)
      });

      // Enhance with database data
      const enhancedResults = await this.enhanceSearchResults(searchResults);

      const searchTime = performance.now() - startTime;

      this.emit('skillSearchPerformed', {
        query,
        resultCount: enhancedResults.length,
        searchTime
      });

      return {
        query,
        results: enhancedResults,
        totalCount: searchResults.totalCount,
        searchTime,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Skill search failed', error, { query });
      throw error;
    }
  }

  /**
   * 🏗️ BUILD SEARCH FILTERS
   */
  buildSearchFilters(options) {
    const filters = {};

    if (options.category) {
      filters.category = options.category;
    }

    if (options.difficulty) {
      filters.difficulty = options.difficulty;
    }

    if (options.minIncome) {
      // This would need custom handling based on income parsing
    }

    return filters;
  }

  /**
   * 💫 ENHANCE SEARCH RESULTS
   */
  async enhanceSearchResults(searchResults) {
    const skillIds = searchResults.documents.map(doc => doc.id);
    
    const skills = await this.prisma.skill.findMany({
      where: {
        id: { in: skillIds },
        status: this.skillConfig.SKILL_LIFECYCLE.ACTIVE
      },
      include: {
        packages: {
          where: { isActive: true },
          orderBy: { price: 'asc' }
        }
      }
    });

    // Merge search relevance with skill data
    return skills.map(skill => {
      const searchDoc = searchResults.documents.find(doc => doc.id === skill.id);
      return {
        ...skill,
        searchScore: searchDoc ? searchDoc.score : 0,
        highlights: searchDoc ? searchDoc.highlights : {}
      };
    }).sort((a, b) => b.searchScore - a.searchScore);
  }

  /**
   * 📊 GET SKILL ANALYTICS
   */
  async getSkillAnalytics(timeframe = '30d') {
    const cacheKey = `analytics:skills:${timeframe}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const startDate = this.calculateStartDate(timeframe);
    
    const [
      categoryDistribution,
      popularityTrends,
      enrollmentStats,
      completionRates,
      incomeAnalysis
    ] = await Promise.all([
      this.getCategoryDistribution(),
      this.getPopularityTrends(startDate),
      this.getEnrollmentStats(startDate),
      this.getCompletionRates(startDate),
      this.getIncomeAnalysis()
    ]);

    const analytics = {
      timeframe,
      startDate,
      endDate: new Date(),
      totalSkills: await this.prisma.skill.count({
        where: { status: this.skillConfig.SKILL_LIFECYCLE.ACTIVE }
      }),
      categoryDistribution,
      popularityTrends,
      enrollmentStats,
      completionRates,
      incomeAnalysis,
      recommendations: this.generateAnalyticsRecommendations({
        categoryDistribution,
        popularityTrends,
        completionRates
      }),
      generatedAt: new Date()
    };

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(analytics));

    return analytics;
  }

  /**
   * 📈 GET CATEGORY DISTRIBUTION
   */
  async getCategoryDistribution() {
    const distribution = await this.prisma.skill.groupBy({
      by: ['category'],
      where: { status: this.skillConfig.SKILL_LIFECYCLE.ACTIVE },
      _count: { id: true },
      _avg: { popularity: true, successRate: true }
    });

    return distribution.map(item => ({
      category: item.category,
      count: item._count.id,
      averagePopularity: item._avg.popularity,
      averageSuccessRate: item._avg.successRate
    }));
  }

  /**
   * 📊 GET POPULARITY TRENDS
   */
  async getPopularityTrends(startDate) {
    // This would typically involve time-series data
    // For now, return current popularity rankings
    const popularSkills = await this.prisma.skill.findMany({
      where: { 
        status: this.skillConfig.SKILL_LIFECYCLE.ACTIVE 
      },
      select: {
        id: true,
        name: true,
        category: true,
        popularity: true,
        successRate: true
      },
      orderBy: { popularity: 'desc' },
      take: 10
    });

    return popularSkills;
  }

  /**
   * 📥 GET ENROLLMENT STATS
   */
  async getEnrollmentStats(startDate) {
    const enrollments = await this.prisma.enrollment.groupBy({
      by: ['skillId'],
      where: {
        createdAt: { gte: startDate },
        status: { in: ['ACTIVE', 'COMPLETED'] }
      },
      _count: { id: true }
    });

    // Enhance with skill information
    const enhancedStats = await Promise.all(
      enrollments.map(async (item) => {
        const skill = await this.prisma.skill.findUnique({
          where: { id: item.skillId },
          select: { name: true, category: true }
        });

        return {
          skillId: item.skillId,
          skillName: skill?.name,
          category: skill?.category,
          enrollmentCount: item._count.id
        };
      })
    );

    return enhancedStats.sort((a, b) => b.enrollmentCount - a.enrollmentCount);
  }

  /**
   * ✅ GET COMPLETION RATES
   */
  async getCompletionRates(startDate) {
    const completionData = await this.prisma.enrollment.groupBy({
      by: ['skillId'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: {
        id: true,
        _all: true
      }
    });

    // Calculate completion rates
    const rates = await Promise.all(
      completionData.map(async (item) => {
        const completed = await this.prisma.enrollment.count({
          where: {
            skillId: item.skillId,
            status: 'COMPLETED',
            createdAt: { gte: startDate }
          }
        });

        const skill = await this.prisma.skill.findUnique({
          where: { id: item.skillId },
          select: { name: true, category: true, difficulty: true }
        });

        return {
          skillId: item.skillId,
          skillName: skill?.name,
          category: skill?.category,
          difficulty: skill?.difficulty,
          totalEnrollments: item._count.id,
          completedEnrollments: completed,
          completionRate: item._count.id > 0 ? (completed / item._count.id) * 100 : 0
        };
      })
    );

    return rates.sort((a, b) => b.completionRate - a.completionRate);
  }

  /**
   * 💰 GET INCOME ANALYSIS
   */
  async getIncomeAnalysis() {
    const skills = await this.prisma.skill.findMany({
      where: { status: this.skillConfig.SKILL_LIFECYCLE.ACTIVE },
      select: {
        id: true,
        name: true,
        category: true,
        averageIncome: true,
        popularity: true
      }
    });

    // Parse income ranges and calculate averages
    const incomeData = skills.map(skill => {
      const incomeMatch = skill.averageIncome.match(/(\d+),?(\d+)?-(\d+),?(\d+)?/);
      let minIncome = 0, maxIncome = 0;

      if (incomeMatch) {
        minIncome = parseInt(incomeMatch[1] + (incomeMatch[2] || ''));
        maxIncome = parseInt(incomeMatch[3] + (incomeMatch[4] || ''));
      }

      return {
        skillId: skill.id,
        skillName: skill.name,
        category: skill.category,
        minIncome,
        maxIncome,
        averageIncome: (minIncome + maxIncome) / 2,
        popularity: skill.popularity
      };
    });

    return incomeData.sort((a, b) => b.averageIncome - a.averageIncome);
  }

  /**
   * 💡 GENERATE ANALYTICS RECOMMENDATIONS
   */
  generateAnalyticsRecommendations(analytics) {
    const recommendations = [];

    // Check for category imbalances
    const categoryCounts = analytics.categoryDistribution.reduce((acc, cat) => {
      acc[cat.category] = cat.count;
      return acc;
    }, {});

    const expectedPerCategory = 10; // We want 10 skills per category
    Object.entries(categoryCounts).forEach(([category, count]) => {
      if (count < expectedPerCategory) {
        recommendations.push({
          type: 'CATEGORY_IMBALANCE',
          priority: 'MEDIUM',
          action: `Add ${expectedPerCategory - count} more skills to ${category} category`,
          description: `${category} category has only ${count} skills, below target of ${expectedPerCategory}`
        });
      }
    });

    // Check for low completion rates
    const lowCompletionSkills = analytics.completionRates.filter(
      skill => skill.completionRate < 60
    );

    if (lowCompletionSkills.length > 0) {
      recommendations.push({
        type: 'LOW_COMPLETION_RATES',
        priority: 'HIGH',
        action: 'Review and improve training materials for low-completion skills',
        description: `${lowCompletionSkills.length} skills have completion rates below 60%`
      });
    }

    return recommendations;
  }

  /**
   * 🔥 START CACHE WARMING
   */
  startCacheWarming() {
    // Warm cache every 30 minutes
    setInterval(async () => {
      try {
        await this.warmUpCache();
      } catch (error) {
        this.logger.error('Cache warming failed', error);
      }
    }, 1800000);

    this.logger.info('Cache warming started');
  }

  /**
   * 🔥 WARM UP CACHE
   */
  async warmUpCache() {
    try {
      const [catalog, categories, popularSkills] = await Promise.all([
        this.getSkillCatalog({ limit: 50 }),
        this.getAllCategories(),
        this.getPopularSkills(10)
      ]);

      // Cache warm data
      await this.redis.setex('cache:warm:catalog', 1800, JSON.stringify(catalog));
      await this.redis.setex('cache:warm:categories', 3600, JSON.stringify(categories));
      await this.redis.setex('cache:warm:popular', 900, JSON.stringify(popularSkills));

      this.logger.debug('Cache warmed up successfully');
    } catch (error) {
      this.logger.error('Failed to warm up cache', error);
    }
  }

  /**
   * 📈 START SKILL ANALYTICS
   */
  startSkillAnalytics() {
    // Run analytics every 6 hours
    setInterval(async () => {
      try {
        await this.updateSkillAnalytics();
      } catch (error) {
        this.logger.error('Skill analytics update failed', error);
      }
    }, 21600000);

    this.logger.info('Skill analytics started');
  }

  /**
   * 📊 UPDATE SKILL ANALYTICS
   */
  async updateSkillAnalytics() {
    const analytics = await this.getSkillAnalytics('7d');
    
    // Store analytics for dashboard
    await this.redis.setex('analytics:skills:current', 21600, JSON.stringify(analytics)); // 6 hours

    this.emit('skillAnalyticsUpdated', analytics);
  }

  /**
   * 📅 CALCULATE START DATE
   */
  calculateStartDate(timeframe) {
    const now = new Date();
    
    switch (timeframe) {
      case '7d':
        return new Date(now.setDate(now.getDate() - 7));
      case '30d':
        return new Date(now.setDate(now.getDate() - 30));
      case '90d':
        return new Date(now.setDate(now.getDate() - 90));
      default:
        return new Date(now.setDate(now.getDate() - 30));
    }
  }

  /**
   * 🆕 UPDATE SKILL
   */
  async updateSkill(skillId, updateData) {
    const startTime = performance.now();
    
    try {
      // 🛡️ Validate update data
      await this.validateSkillUpdateData(updateData);

      // 🔍 Get existing skill
      const existingSkill = await this.prisma.skill.findUnique({
        where: { id: skillId },
        include: { packages: true }
      });

      if (!existingSkill) {
        throw new Error('SKILL_NOT_FOUND');
      }

      // 💾 Update skill
      const updatedSkill = await this.prisma.$transaction(async (tx) => {
        const skill = await tx.skill.update({
          where: { id: skillId },
          data: {
            ...updateData,
            version: existingSkill.version + 1,
            updatedAt: new Date()
          },
          include: {
            packages: {
              where: { isActive: true },
              orderBy: { price: 'asc' }
            }
          }
        });

        return skill;
      });

      // 🔄 Update cache and indexes
      await this.updateSkillCache(skillId);
      await this.updateSearchIndex(updatedSkill);

      const processingTime = performance.now() - startTime;

      this.emit('skillUpdated', {
        skillId,
        skillName: updatedSkill.name,
        processingTime
      });

      return {
        success: true,
        skillId: updatedSkill.id,
        skillName: updatedSkill.name,
        version: updatedSkill.version
      };

    } catch (error) {
      this.logger.error('Skill update failed', error, { skillId });
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE SKILL UPDATE DATA
   */
  async validateSkillUpdateData(updateData) {
    // Validate category if provided
    if (updateData.category && !Object.keys(this.categories).includes(updateData.category)) {
      throw new Error(`INVALID_CATEGORY: ${updateData.category}`);
    }

    // Validate name length if provided
    if (updateData.name && (updateData.name.length < 3 || updateData.name.length > 100)) {
      throw new Error('INVALID_SKILL_NAME_LENGTH');
    }

    // Validate description length if provided
    if (updateData.description && (updateData.description.length < 10 || updateData.description.length > 500)) {
      throw new Error('INVALID_DESCRIPTION_LENGTH');
    }

    this.logger.debug('Skill update data validation passed');
  }

  /**
   * 🗑️ ARCHIVE SKILL
   */
  async archiveSkill(skillId, reason = 'No longer offered') {
    try {
      const skill = await this.prisma.skill.update({
        where: { id: skillId },
        data: {
          status: this.skillConfig.SKILL_LIFECYCLE.ARCHIVED,
          metadata: {
            ...(await this.getSkillMetadata(skillId)),
            archivedAt: new Date(),
            archiveReason: reason
          }
        }
      });

      // 🔄 Update cache and indexes
      await this.removeSkillFromCache(skillId);
      await this.searchEngine.removeDocument('skills', skillId);

      this.emit('skillArchived', {
        skillId,
        skillName: skill.name,
        reason
      });

      return {
        success: true,
        skillId: skill.id,
        skillName: skill.name,
        status: skill.status
      };

    } catch (error) {
      this.logger.error('Skill archiving failed', error, { skillId });
      throw error;
    }
  }

  /**
   * 📁 GET ALL CATEGORIES
   */
  async getAllCategories() {
    const cacheKey = 'categories:all';
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const categories = Object.entries(this.categories).map(([key, config]) => ({
      id: key,
      ...config,
      skillCount: 0 // This would be populated from database count
    }));

    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(categories));

    return categories;
  }

  /**
   * 🏆 GET POPULAR SKILLS
   */
  async getPopularSkills(limit = 10) {
    const cacheKey = `skills:popular:${limit}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const skills = await this.prisma.skill.findMany({
      where: { status: this.skillConfig.SKILL_LIFECYCLE.ACTIVE },
      include: {
        packages: {
          where: { isActive: true },
          orderBy: { price: 'asc' }
        }
      },
      orderBy: { popularity: 'desc' },
      take: limit
    });

    // Cache for 15 minutes
    await this.redis.setex(cacheKey, 900, JSON.stringify(skills));

    return skills;
  }

  /**
   * 🔄 REFRESH SKILL CACHE
   */
  async refreshSkillCache() {
    try {
      const skills = await this.prisma.skill.findMany({
        where: { status: this.skillConfig.SKILL_LIFECYCLE.ACTIVE },
        include: {
          packages: {
            where: { isActive: true },
            orderBy: { price: 'asc' }
          }
        }
      });

      // Cache each skill individually
      for (const skill of skills) {
        await this.updateSkillCache(skill.id);
      }

      this.logger.info(`Refreshed cache for ${skills.length} skills`);
    } catch (error) {
      this.logger.error('Failed to refresh skill cache', error);
    }
  }

  /**
   * 🗑️ REMOVE SKILL FROM CACHE
   */
  async removeSkillFromCache(skillId) {
    const cacheKeys = [
      `skill:${skillId}`,
      `category:${await this.getSkillCategory(skillId)}:skills`
    ];

    for (const key of cacheKeys) {
      await this.redis.del(key);
    }
  }

  /**
   * 🔍 GET SKILL CATEGORY
   */
  async getSkillCategory(skillId) {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
      select: { category: true }
    });

    return skill?.category;
  }

  /**
   * 📊 GET SKILL METADATA
   */
  async getSkillMetadata(skillId) {
    const skill = await this.prisma.skill.findUnique({
      where: { id: skillId },
      select: { metadata: true }
    });

    return skill?.metadata || {};
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      this.removeAllListeners();
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.logger.info('Skill catalog manager resources cleaned up');
    } catch (error) {
      this.logger.error('Error during skill catalog manager cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new SkillCatalogManager();