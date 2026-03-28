/**
 * 🎯 MOSA FORGE: Enterprise Test Configuration & Setup
 * 
 * @module TestSetup
 * @description Enterprise-grade test configuration, utilities, and global setup
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE TESTING FEATURES:
 * - Multi-environment test configuration
 * - Database isolation & transaction management
 * - Mock service orchestration
 * - Performance & load testing setup
 * - Quality metrics validation
 * - Security & compliance testing
 */

const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');
const { EventEmitter } = require('events');

// 🏗️ Enterprise Test Constants
const TEST_ENVIRONMENTS = {
  UNIT: 'unit',
  INTEGRATION: 'integration',
  E2E: 'e2e',
  LOAD: 'load',
  SECURITY: 'security'
};

const TEST_TIMEOUTS = {
  UNIT: 30000,
  INTEGRATION: 60000,
  E2E: 120000,
  LOAD: 300000
};

const QUALITY_THRESHOLDS = {
  PERFORMANCE: 1000, // ms
  MEMORY: 500, // MB
  COVERAGE: 80, // percentage
  SUCCESS_RATE: 95 // percentage
};

/**
 * 🏗️ Enterprise Test Configuration Class
 * @class TestConfig
 * @extends EventEmitter
 */
class TestConfig extends EventEmitter {
  constructor(environment = process.env.NODE_ENV || 'test') {
    super();
    
    this.environment = environment;
    this.testRunId = uuidv4();
    this.startTime = Date.now();
    
    // 🏗️ Test Configuration
    this.config = this._loadTestConfiguration();
    
    // 🏗️ Test State Management
    this.state = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      currentSuite: null,
      performanceMetrics: new Map(),
      qualityViolations: []
    };

    // 🏗️ Service Instances
    this.prisma = null;
    this.redis = null;
    this.mockServices = new Map();
    
    this._initializeEventHandlers();
    this._setupGlobalHandlers();
  }

  /**
   * 🏗️ Load Enterprise Test Configuration
   * @private
   */
  _loadTestConfiguration() {
    const baseConfig = {
      // 🎯 Database Configuration
      database: {
        url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/mosa_forge_test',
        pool: {
          min: 1,
          max: 10,
          idleTimeout: 30000,
          connectionTimeout: 2000
        },
        isolation: {
          level: 'RepeatableRead',
          reset: 'transaction' // transaction, truncate, none
        }
      },

      // 🎯 Redis Configuration
      redis: {
        host: process.env.TEST_REDIS_HOST || 'localhost',
        port: process.env.TEST_REDIS_PORT || 6379,
        db: 15, // Use separate DB for tests
        lazyConnect: true
      },

      // 🎯 Performance Thresholds
      performance: {
        timeout: {
          unit: TEST_TIMEOUTS.UNIT,
          integration: TEST_TIMEOUTS.INTEGRATION,
          e2e: TEST_TIMEOUTS.E2E,
          load: TEST_TIMEOUTS.LOAD
        },
        memory: {
          warning: 300, // MB
          critical: 500 // MB
        },
        responseTime: {
          acceptable: 100, // ms
          degraded: 500, // ms
          unacceptable: 1000 // ms
        }
      },

      // 🎯 Quality Gates
      quality: {
        coverage: {
          minimum: 80,
          target: 90,
          excellent: 95
        },
        successRate: {
          minimum: 95,
          target: 98,
          excellent: 99.5
        },
        performance: {
          p95: 1000, // ms
          p99: 2000 // ms
        }
      },

      // 🎯 Mock Services Configuration
      mocks: {
        paymentService: {
          baseUrl: 'http://localhost:4010',
          timeout: 5000,
          enabled: true
        },
        authService: {
          baseUrl: 'http://localhost:4011',
          timeout: 5000,
          enabled: true
        },
        qualityService: {
          baseUrl: 'http://localhost:4012',
          timeout: 5000,
          enabled: true
        }
      },

      // 🎯 Security Testing
      security: {
        fuzzing: {
          enabled: true,
          iterations: 1000
        },
        penetration: {
          enabled: process.env.NODE_ENV === 'production',
          depth: 'medium'
        },
        compliance: {
          gdpr: true,
          pci: false,
          local: true // Ethiopian data protection
        }
      },

      // 🎯 Reporting & Output
      reporting: {
        format: ['console', 'json', 'junit'],
        outputDir: './test-results',
        archive: true,
        notify: {
          slack: process.env.SLACK_WEBHOOK_URL,
          email: process.env.TEST_NOTIFICATION_EMAIL
        }
      }
    };

    // 🎯 Environment-specific overrides
    const environmentOverrides = {
      development: {
        database: {
          reset: 'transaction'
        },
        performance: {
          timeout: {
            unit: 60000,
            integration: 120000
          }
        }
      },
      ci: {
        database: {
          reset: 'truncate'
        },
        reporting: {
          format: ['junit', 'json']
        }
      },
      production: {
        security: {
          penetration: {
            enabled: true,
            depth: 'high'
          }
        }
      }
    };

    return {
      ...baseConfig,
      ...(environmentOverrides[this.environment] || {})
    };
  }

  /**
   * 🏗️ Initialize Test Event Handlers
   * @private
   */
  _initializeEventHandlers() {
    this.on('test.start', (testInfo) => {
      this._handleTestStart(testInfo);
    });

    this.on('test.pass', (testInfo) => {
      this._handleTestPass(testInfo);
    });

    this.on('test.fail', (testInfo) => {
      this._handleTestFail(testInfo);
    });

    this.on('test.skip', (testInfo) => {
      this._handleTestSkip(testInfo);
    });

    this.on('suite.start', (suiteInfo) => {
      this._handleSuiteStart(suiteInfo);
    });

    this.on('suite.end', (suiteInfo) => {
      this._handleSuiteEnd(suiteInfo);
    });

    this.on('performance.metric', (metric) => {
      this._handlePerformanceMetric(metric);
    });

    this.on('quality.violation', (violation) => {
      this._handleQualityViolation(violation);
    });
  }

  /**
   * 🏗️ Setup Global Test Handlers
   * @private
   */
  _setupGlobalHandlers() {
    // Global unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      this._logError('UNHANDLED_REJECTION', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        testRunId: this.testRunId
      });
      
      if (this.config.environment === 'ci') {
        process.exit(1);
      }
    });

    // Global uncaught exception handler
    process.on('uncaughtException', (error) => {
      this._logError('UNCAUGHT_EXCEPTION', {
        error: error.message,
        stack: error.stack,
        testRunId: this.testRunId
      });
      
      process.exit(1);
    });

    // Global timeout handler
    if (process.env.CI) {
      const globalTimeout = setTimeout(() => {
        this._logError('GLOBAL_TIMEOUT', {
          testRunId: this.testRunId,
          duration: Date.now() - this.startTime
        });
        process.exit(1);
      }, TEST_TIMEOUTS.E2E * 10); // 20 minutes for CI

      // Clean up timeout on successful completion
      this.on('run.complete', () => {
        clearTimeout(globalTimeout);
      });
    }
  }

  /**
   * 🏗️ Initialize Test Database
   * @returns {Promise<PrismaClient>}
   */
  async initializeDatabase() {
    try {
      this.prisma = new PrismaClient({
        datasources: {
          db: {
            url: this.config.database.url
          }
        },
        log: ['warn', 'error']
      });

      // Test database connection
      await this.prisma.$connect();
      await this.prisma.$queryRaw`SELECT 1`;

      // Initialize test database state
      await this._resetDatabase();

      this._logInfo('DATABASE_INITIALIZED', {
        url: this.config.database.url,
        isolation: this.config.database.isolation.reset
      });

      return this.prisma;
    } catch (error) {
      this._logError('DATABASE_INIT_FAILED', {
        error: error.message,
        url: this.config.database.url
      });
      throw error;
    }
  }

  /**
   * 🏗️ Reset Database to Clean State
   * @private
   */
  async _resetDatabase() {
    if (this.config.database.isolation.reset === 'none') {
      return;
    }

    try {
      if (this.config.database.isolation.reset === 'truncate') {
        // Truncate all tables (faster but less isolated)
        const tables = await this.prisma.$queryRaw`
          SELECT tablename FROM pg_tables 
          WHERE schemaname = 'public' 
          AND tablename NOT LIKE '%migration%'
        `;

        for (const table of tables) {
          await this.prisma.$queryRaw`TRUNCATE TABLE "${table.tablename}" CASCADE`;
        }
      } else {
        // Use transactions for isolation (default)
        await this.prisma.$queryRaw`BEGIN ISOLATION LEVEL REPEATABLE READ`;
      }

      this._logInfo('DATABASE_RESET', {
        method: this.config.database.isolation.reset
      });
    } catch (error) {
      this._logError('DATABASE_RESET_FAILED', {
        error: error.message,
        method: this.config.database.isolation.reset
      });
      throw error;
    }
  }

  /**
   * 🏗️ Initialize Redis for Testing
   * @returns {Promise<Redis>}
   */
  async initializeRedis() {
    try {
      this.redis = new Redis(this.config.redis);
      
      // Test Redis connection
      await this.redis.ping();
      
      // Clear test database
      await this.redis.flushdb();

      this._logInfo('REDIS_INITIALIZED', {
        host: this.config.redis.host,
        port: this.config.redis.port,
        db: this.config.redis.db
      });

      return this.redis;
    } catch (error) {
      this._logError('REDIS_INIT_FAILED', {
        error: error.message,
        host: this.config.redis.host
      });
      throw error;
    }
  }

  /**
   * 🏗️ Initialize Mock Services
   * @returns {Promise<Object>}
   */
  async initializeMocks() {
    const mockPromises = [];

    if (this.config.mocks.paymentService.enabled) {
      mockPromises.push(this._setupPaymentServiceMock());
    }

    if (this.config.mocks.authService.enabled) {
      mockPromises.push(this._setupAuthServiceMock());
    }

    if (this.config.mocks.qualityService.enabled) {
      mockPromises.push(this._setupQualityServiceMock());
    }

    try {
      await Promise.all(mockPromises);
      this._logInfo('MOCKS_INITIALIZED', {
        services: Array.from(this.mockServices.keys())
      });
    } catch (error) {
      this._logError('MOCKS_INIT_FAILED', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🏗️ Setup Payment Service Mock
   * @private
   */
  async _setupPaymentServiceMock() {
    const { createServer } = require('http');
    const { createMockServer } = require('./mocks/payment-service-mock');

    const mockServer = await createMockServer(this.config.mocks.paymentService);
    this.mockServices.set('payment-service', mockServer);

    this._logInfo('PAYMENT_MOCK_STARTED', {
      baseUrl: this.config.mocks.paymentService.baseUrl
    });
  }

  /**
   * 🏗️ Setup Auth Service Mock
   * @private
   */
  async _setupAuthServiceMock() {
    const { createMockServer } = require('./mocks/auth-service-mock');
    
    const mockServer = await createMockServer(this.config.mocks.authService);
    this.mockServices.set('auth-service', mockServer);

    this._logInfo('AUTH_MOCK_STARTED', {
      baseUrl: this.config.mocks.authService.baseUrl
    });
  }

  /**
   * 🏗️ Setup Quality Service Mock
   * @private
   */
  async _setupQualityServiceMock() {
    const { createMockServer } = require('./mocks/quality-service-mock');
    
    const mockServer = await createMockServer(this.config.mocks.qualityService);
    this.mockServices.set('quality-service', mockServer);

    this._logInfo('QUALITY_MOCK_STARTED', {
      baseUrl: this.config.mocks.qualityService.baseUrl
    });
  }

  /**
   * 🏗️ Create Test Fixtures
   * @param {string} fixtureType - Type of fixture to create
   * @returns {Promise<Object>}
   */
  async createFixture(fixtureType, overrides = {}) {
    const fixtures = {
      student: this._createStudentFixture(overrides),
      expert: this._createExpertFixture(overrides),
      enrollment: this._createEnrollmentFixture(overrides),
      payment: this._createPaymentFixture(overrides),
      skill: this._createSkillFixture(overrides)
    };

    if (!fixtures[fixtureType]) {
      throw new Error(`Unknown fixture type: ${fixtureType}`);
    }

    const fixture = await fixtures[fixtureType];
    this._logInfo('FIXTURE_CREATED', { type: fixtureType, id: fixture.id });
    
    return fixture;
  }

  /**
   * 🏗️ Create Student Test Fixture
   * @private
   */
  async _createStudentFixture(overrides = {}) {
    const defaultStudent = {
      id: uuidv4(),
      faydaId: `TEST${Date.now()}`,
      phone: `+2519${Math.random().toString().slice(2, 11)}`,
      email: `student${Date.now()}@test.mosaforge.com`,
      firstName: 'Test',
      lastName: 'Student',
      status: 'ACTIVE',
      mindsetPhase: 'COMPLETED',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.prisma.student.create({
      data: { ...defaultStudent, ...overrides }
    });
  }

  /**
   * 🏗️ Create Expert Test Fixture
   * @private
   */
  async _createExpertFixture(overrides = {}) {
    const defaultExpert = {
      id: uuidv4(),
      faydaId: `EXPERT${Date.now()}`,
      phone: `+2519${Math.random().toString().slice(2, 11)}`,
      email: `expert${Date.now()}@test.mosaforge.com`,
      firstName: 'Test',
      lastName: 'Expert',
      status: 'ACTIVE',
      tier: 'STANDARD',
      qualityScore: 4.5,
      maxStudents: 50,
      currentStudents: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.prisma.expert.create({
      data: { ...defaultExpert, ...overrides }
    });
  }

  /**
   * 🏗️ Create Enrollment Test Fixture
   * @private
   */
  async _createEnrollmentFixture(overrides = {}) {
    const student = await this._createStudentFixture();
    const expert = await this._createExpertFixture();
    const skill = await this._createSkillFixture();
    const payment = await this._createPaymentFixture();

    const defaultEnrollment = {
      id: uuidv4(),
      studentId: student.id,
      expertId: expert.id,
      skillId: skill.id,
      paymentId: payment.id,
      status: 'ACTIVE',
      startDate: new Date(),
      expectedEndDate: new Date(Date.now() + (120 * 24 * 60 * 60 * 1000)),
      currentPhase: 'THEORY',
      traceId: uuidv4(),
      metadata: {
        bundleType: 'STANDARD_1999',
        revenueSplit: { mosa: 1000, expert: 999 }
      }
    };

    return await this.prisma.enrollment.create({
      data: { ...defaultEnrollment, ...overrides }
    });
  }

  /**
   * 🏗️ Create Payment Test Fixture
   * @private
   */
  async _createPaymentFixture(overrides = {}) {
    const defaultPayment = {
      id: uuidv4(),
      amount: 1999,
      currency: 'ETB',
      status: 'COMPLETED',
      provider: 'TELEBIRR',
      providerReference: `TEST${Date.now()}`,
      mosaRevenue: 1000,
      expertRevenue: 999,
      studentId: uuidv4(), // Will be overridden
      bundleId: uuidv4(), // Will be overridden
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.prisma.payment.create({
      data: { ...defaultPayment, ...overrides }
    });
  }

  /**
   * 🏗️ Create Skill Test Fixture
   * @private
   */
  async _createSkillFixture(overrides = {}) {
    const defaultSkill = {
      id: uuidv4(),
      name: `Test Skill ${Date.now()}`,
      category: 'ONLINE',
      description: 'Test skill for automated testing',
      isActive: true,
      theoryExercises: 100,
      practicalExercises: 50,
      assessmentExercises: 10,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.prisma.skill.create({
      data: { ...defaultSkill, ...overrides }
    });
  }

  /**
   * 🏗️ Performance Testing Utilities
   */
  async measurePerformance(operation, context = {}) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await operation();
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      const metrics = {
        duration: endTime - startTime,
        memoryUsed: (endMemory - startMemory) / 1024 / 1024, // MB
        timestamp: new Date().toISOString(),
        context
      };

      this.emit('performance.metric', metrics);
      
      // Check against thresholds
      if (metrics.duration > this.config.performance.responseTime.unacceptable) {
        this.emit('quality.violation', {
          type: 'PERFORMANCE_DEGRADATION',
          metric: 'response_time',
          value: metrics.duration,
          threshold: this.config.performance.responseTime.unacceptable,
          context
        });
      }

      return { result, metrics };
    } catch (error) {
      const endTime = performance.now();
      
      this.emit('performance.metric', {
        duration: endTime - startTime,
        error: error.message,
        timestamp: new Date().toISOString(),
        context
      });

      throw error;
    }
  }

  /**
   * 🏗️ Security Testing Utilities
   */
  async securityTest(operation, testCases) {
    const securityResults = {
      passed: 0,
      failed: 0,
      vulnerabilities: []
    };

    for (const testCase of testCases) {
      try {
        await operation(testCase.input);
        
        // If operation succeeds when it should fail (security issue)
        if (testCase.shouldFail) {
          securityResults.failed++;
          securityResults.vulnerabilities.push({
            type: testCase.type,
            input: testCase.input,
            expected: 'Should have failed',
            actual: 'Operation succeeded'
          });
        } else {
          securityResults.passed++;
        }
      } catch (error) {
        // If operation fails when it should succeed (false positive)
        if (!testCase.shouldFail) {
          securityResults.failed++;
          securityResults.vulnerabilities.push({
            type: testCase.type,
            input: testCase.input,
            expected: 'Should have succeeded',
            actual: error.message
          });
        } else {
          securityResults.passed++;
        }
      }
    }

    return securityResults;
  }

  /**
   * 🏗️ Quality Validation
   */
  validateQualityMetrics(metrics) {
    const violations = [];

    if (metrics.coverage < this.config.quality.coverage.minimum) {
      violations.push({
        metric: 'code_coverage',
        value: metrics.coverage,
        threshold: this.config.quality.coverage.minimum,
        severity: 'HIGH'
      });
    }

    if (metrics.successRate < this.config.quality.successRate.minimum) {
      violations.push({
        metric: 'success_rate',
        value: metrics.successRate,
        threshold: this.config.quality.successRate.minimum,
        severity: 'HIGH'
      });
    }

    if (metrics.performance?.p95 > this.config.quality.performance.p95) {
      violations.push({
        metric: 'performance_p95',
        value: metrics.performance.p95,
        threshold: this.config.quality.performance.p95,
        severity: 'MEDIUM'
      });
    }

    violations.forEach(violation => {
      this.emit('quality.violation', violation);
    });

    return {
      passed: violations.length === 0,
      violations
    };
  }

  /**
   * 🏗️ Event Handlers
   */
  _handleTestStart(testInfo) {
    this.state.totalTests++;
    this._logInfo('TEST_STARTED', testInfo);
  }

  _handleTestPass(testInfo) {
    this.state.passedTests++;
    this._logInfo('TEST_PASSED', testInfo);
  }

  _handleTestFail(testInfo) {
    this.state.failedTests++;
    this._logError('TEST_FAILED', testInfo);
  }

  _handleTestSkip(testInfo) {
    this.state.skippedTests++;
    this._logWarn('TEST_SKIPPED', testInfo);
  }

  _handleSuiteStart(suiteInfo) {
    this.state.currentSuite = suiteInfo.name;
    this._logInfo('SUITE_STARTED', suiteInfo);
  }

  _handleSuiteEnd(suiteInfo) {
    this._logInfo('SUITE_COMPLETED', {
      ...suiteInfo,
      duration: Date.now() - suiteInfo.startTime
    });
    this.state.currentSuite = null;
  }

  _handlePerformanceMetric(metric) {
    this.state.performanceMetrics.set(metric.context?.operation || 'unknown', metric);
  }

  _handleQualityViolation(violation) {
    this.state.qualityViolations.push(violation);
    this._logWarn('QUALITY_VIOLATION', violation);
  }

  /**
   * 🏗️ Generate Test Report
   */
  generateReport() {
    const report = {
      testRunId: this.testRunId,
      environment: this.environment,
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      summary: {
        total: this.state.totalTests,
        passed: this.state.passedTests,
        failed: this.state.failedTests,
        skipped: this.state.skippedTests,
        successRate: (this.state.passedTests / this.state.totalTests) * 100
      },
      performance: Object.fromEntries(this.state.performanceMetrics),
      quality: {
        violations: this.state.qualityViolations,
        status: this.state.qualityViolations.length === 0 ? 'PASSED' : 'FAILED'
      },
      recommendations: this._generateRecommendations()
    };

    this.emit('report.generated', report);
    return report;
  }

  /**
   * 🏗️ Generate Test Recommendations
   * @private
   */
  _generateRecommendations() {
    const recommendations = [];

    if (this.state.failedTests > 0) {
      recommendations.push({
        type: 'FAILING_TESTS',
        description: `${this.state.failedTests} tests are failing`,
        priority: 'HIGH',
        action: 'Review and fix failing tests before deployment'
      });
    }

    if (this.state.qualityViolations.length > 0) {
      recommendations.push({
        type: 'QUALITY_VIOLATIONS',
        description: `${this.state.qualityViolations.length} quality violations detected`,
        priority: 'MEDIUM',
        action: 'Address quality issues to maintain standards'
      });
    }

    const slowTests = Array.from(this.state.performanceMetrics.entries())
      .filter(([_, metric]) => metric.duration > this.config.performance.responseTime.degraded);

    if (slowTests.length > 0) {
      recommendations.push({
        type: 'PERFORMANCE_ISSUES',
        description: `${slowTests.length} slow operations detected`,
        priority: 'MEDIUM',
        action: 'Optimize slow operations for better performance'
      });
    }

    return recommendations;
  }

  /**
   * 🏗️ Cleanup Resources
   */
  async cleanup() {
    const cleanupTasks = [];

    // Rollback database transaction if using transaction isolation
    if (this.prisma && this.config.database.isolation.reset === 'transaction') {
      cleanupTasks.push(this.prisma.$queryRaw`ROLLBACK`);
    }

    // Disconnect Prisma
    if (this.prisma) {
      cleanupTasks.push(this.prisma.$disconnect());
    }

    // Disconnect Redis
    if (this.redis) {
      cleanupTasks.push(this.redis.quit());
    }

    // Stop mock servers
    for (const [name, server] of this.mockServices) {
      cleanupTasks.push(server.close());
    }

    try {
      await Promise.allSettled(cleanupTasks);
      this._logInfo('CLEANUP_COMPLETED', { testRunId: this.testRunId });
    } catch (error) {
      this._logError('CLEANUP_FAILED', { error: error.message });
    }

    // Generate final report
    const finalReport = this.generateReport();
    this.emit('run.complete', finalReport);
  }

  /**
   * 🏗️ Enterprise Logging
   */
  _logInfo(event, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      event,
      testRunId: this.testRunId,
      environment: this.environment,
      ...data
    };

    console.log(JSON.stringify(logEntry));
  }

  _logWarn(event, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      event,
      testRunId: this.testRunId,
      environment: this.environment,
      ...data
    };

    console.warn(JSON.stringify(logEntry));
  }

  _logError(event, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      event,
      testRunId: this.testRunId,
      environment: this.environment,
      ...data
    };

    console.error(JSON.stringify(logEntry));
  }
}

// 🏗️ Global Test Setup Hooks
const globalTestConfig = new TestConfig();

// Jest Global Setup
module.exports = async () => {
  console.log('🚀 Initializing MOSA FORGE Enterprise Test Environment...');
  
  try {
    await globalTestConfig.initializeDatabase();
    await globalTestConfig.initializeRedis();
    await globalTestConfig.initializeMocks();

    // Set global test timeout
    jest.setTimeout(TEST_TIMEOUTS.INTEGRATION);

    // Expose test utilities globally
    global.createFixture = (type, overrides) => 
      globalTestConfig.createFixture(type, overrides);
    
    global.measurePerformance = (operation, context) =>
      globalTestConfig.measurePerformance(operation, context);
    
    global.securityTest = (operation, testCases) =>
      globalTestConfig.securityTest(operation, testCases);

    console.log('✅ Enterprise Test Environment Ready');
    
    return {
      globalTestConfig,
      prisma: globalTestConfig.prisma,
      redis: globalTestConfig.redis
    };
  } catch (error) {
    console.error('❌ Test Environment Setup Failed:', error);
    await globalTestConfig.cleanup();
    process.exit(1);
  }
};

// 🏗️ Export for manual usage
module.exports.TestConfig = TestConfig;
module.exports.TEST_ENVIRONMENTS = TEST_ENVIRONMENTS;
module.exports.TEST_TIMEOUTS = TEST_TIMEOUTS;
module.exports.QUALITY_THRESHOLDS = QUALITY_THRESHOLDS;
module.exports.globalTestConfig = globalTestConfig;