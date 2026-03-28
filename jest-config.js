// jest.config.js

/**
 * 🎯 ENTERPRISE TESTING CONFIGURATION
 * Production-ready Jest configuration for Mosa Forge
 * Features: Multi-environment testing, coverage, performance, microservices
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const path = require('path');

module.exports = {
  // 🎯 ROOT CONFIGURATION
  displayName: 'Mosa Forge Enterprise',
  preset: '@shelf/jest-mongodb',
  
  // 📁 PROJECT STRUCTURE
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],
  
  projects: [
    // 🚀 MICROSERVICES TEST CONFIGURATIONS
    {
      displayName: 'API Gateway',
      testMatch: ['<rootDir>/api-gateway/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/api-gateway.setup.js']
    },
    {
      displayName: 'Auth Service',
      testMatch: ['<rootDir>/auth-service/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/auth-service.setup.js']
    },
    {
      displayName: 'Payment Service', 
      testMatch: ['<rootDir>/payment-service/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/payment-service.setup.js']
    },
    {
      displayName: 'Student Service',
      testMatch: ['<rootDir>/student-service/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/student-service.setup.js']
    },
    {
      displayName: 'Expert Service',
      testMatch: ['<rootDir>/expert-service/**/*.test.js'], 
      setupFilesAfterEnv: ['<rootDir>/tests/setup/expert-service.setup.js']
    },
    {
      displayName: 'Quality Service',
      testMatch: ['<rootDir>/quality-service/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/quality-service.setup.js']
    }
  ],

  // 🧪 TEST ENVIRONMENT & SETUP
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/global.setup.js',
    '<rootDir>/tests/setup/database.setup.js',
    '<rootDir>/tests/setup/redis.setup.js'
  ],
  globalSetup: '<rootDir>/tests/setup/global-setup.js',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.js',

  // 📊 COVERAGE CONFIGURATION
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{js,jsx}',
    '!src/index.js',
    '!src/server.js',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!**/mocks/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json',
    'clover',
    'text-summary'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // 🎯 MICROSERVICE-SPECIFIC COVERAGE TARGETS
    './auth-service/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './payment-service/': {
      branches: 95,
      functions: 95, 
      lines: 95,
      statements: 95
    },
    './student-service/': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // 🎭 MOCK CONFIGURATIONS
  moduleNameMapping: {
    // 🎯 MICROSERVICE ALIASES
    '^@/api-gateway/(.*)$': '<rootDir>/api-gateway/src/$1',
    '^@/auth-service/(.*)$': '<rootDir>/auth-service/src/$1',
    '^@/payment-service/(.*)$': '<rootDir>/payment-service/src/$1',
    '^@/student-service/(.*)$': '<rootDir>/student-service/src/$1',
    '^@/expert-service/(.*)$': '<rootDir>/expert-service/src/$1',
    '^@/quality-service/(.*)$': '<rootDir>/quality-service/src/$1',
    
    // 🔧 UTILITY ALIASES
    '^@/utils/(.*)$': '<rootDir>/shared/utils/$1',
    '^@/config/(.*)$': '<rootDir>/shared/config/$1',
    '^@/models/(.*)$': '<rootDir>/shared/models/$1',
    '^@/middleware/(.*)$': '<rootDir>/shared/middleware/$1',
    
    // 🧪 TEST UTILITIES
    '^@/test-utils/(.*)$': '<rootDir>/tests/utils/$1',
    '^@/test-data/(.*)$': '<rootDir>/tests/fixtures/$1'
  },

  // 🔌 EXTERNAL SERVICE MOCKS
  moduleNameMapper: {
    // 🏦 PAYMENT GATEWAYS
    '^telebirr-sdk$': '<rootDir>/tests/mocks/telebirr.mock.js',
    '^cbebirr-sdk$': '<rootDir>/tests/mocks/cbebirr.mock.js',
    
    // 🆔 GOVERNMENT APIS
    '^fayda-api$': '<rootDir>/tests/mocks/fayda-api.mock.js',
    
    // 📱 NOTIFICATION SERVICES
    '^twilio$': '<rootDir>/tests/mocks/twilio.mock.js',
    '^nodemailer$': '<rootDir>/tests/mocks/nodemailer.mock.js',
    
    // 💾 DATABASE & CACHE
    '^@prisma/client$': '<rootDir>/tests/mocks/prisma.mock.js',
    '^ioredis$': '<rootDir>/tests/mocks/redis.mock.js',
    
    // 📊 MONITORING
    '^prom-client$': '<rootDir>/tests/mocks/prometheus.mock.js',
    '^winston$': '<rootDir>/tests/mocks/winston.mock.js'
  },

  // 🧹 TRANSFORM CONFIGURATION
  transform: {
    '^.+\\.[tj]sx?$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { 
          targets: { 
            node: '18' 
          },
          modules: 'commonjs'
        }]
      ],
      plugins: [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-syntax-dynamic-import'
      ]
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(lodash-es|@microservices)/)'
  ],

  // 📝 TEST MATCHING PATTERNS
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx}',
    '<rootDir>/tests/**/*.{test,spec}.{js,jsx}',
    '<rootDir>/tests/integration/**/*.{test,spec}.{js,jsx}',
    '<rootDir>/tests/performance/**/*.{test,spec}.{js,jsx}'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/build/',
    '<rootDir>/coverage/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/benchmarks/'
  ],

  // ⚡ PERFORMANCE & PARALLELIZATION
  maxWorkers: '50%',
  workerIdleMemoryLimit: '512MB',
  testTimeout: 30000,
  slowTestThreshold: 10000,

  // 📋 REPORTING & OUTPUT
  verbose: true,
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'test-results',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true
    }],
    ['jest-html-reporter', {
      outputPath: 'test-results/test-report.html',
      pageTitle: 'Mosa Forge Test Report',
      includeFailureMsg: true,
      includeSuiteFailure: true
    }]
  ],

  // 🎯 WATCH MODE CONFIGURATION
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
    'jest-watch-select-projects',
    'jest-watch-suspend'
  ],
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/logs/',
    '<rootDir>/dist/',
    '<rootDir>/.git/'
  ],

  // 🔍 CUSTOM TEST EXTENSIONS
  moduleFileExtensions: [
    'js',
    'jsx',
    'json',
    'node',
    'mjs'
  ],

  // 🎪 GLOBAL TEST VARIABLES
  globals: {
    // 🏗️ PLATFORM CONFIGURATION
    'MOSA_PLATFORM': {
      PRICING: {
        BUNDLE_PRICE: 1999,
        EXPERT_SHARE: 999,
        PLATFORM_SHARE: 1000,
        PAYOUT_SCHEDULE: [333, 333, 333]
      },
      QUALITY: {
        MASTER_THRESHOLD: 4.7,
        SENIOR_THRESHOLD: 4.3,
        STANDARD_THRESHOLD: 4.0,
        MIN_COMPLETION_RATE: 0.7
      },
      BUSINESS: {
        SKILLS_COUNT: 40,
        TRAINING_DURATION: 4, // months
        GUARANTEED_COMPLETION: 0.7
      }
    },
    
    // 🧪 TEST ENVIRONMENT FLAGS
    'TEST_ENV': process.env.NODE_ENV || 'test',
    'IS_CI': !!process.env.CI,
    'IS_E2E': false
  },

  // 🚀 PERFORMANCE TESTING
  testRunner: 'jest-circus/runner',
  
  // 📊 METRICS COLLECTION
  reporters: process.env.CI 
    ? [
        'default',
        ['github-actions', { silent: false }],
        'jest-junit',
        'jest-html-reporters'
      ]
    : [
        'default',
        'jest-progress-bar',
        'jest-html-reporters'
      ],

  // 🔧 ADVANCED CONFIGURATION
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  resetMocks: true,
  resetModules: false,
  restoreMocks: true,
  errorOnDeprecated: true,

  // 🎯 CUSTOM CONDITIONS
  testEnvironmentOptions: {
    // 🗃️ DATABASE CONFIGURATION
    url: process.env.DATABASE_URL || 'postgresql://mosa_forge:password@localhost:5432/mosa_forge_test',
    
    // 🔐 AUTH CONFIGURATION  
    jwtSecret: process.env.JWT_SECRET || 'test-jwt-secret-mosa-forge-2024',
    
    // 💰 PAYMENT CONFIGURATION
    payment: {
      telebirr: {
        appId: 'test-app-id',
        appKey: 'test-app-key'
      },
      cbebirr: {
        merchantId: 'test-merchant-id',
        apiKey: 'test-api-key'
      }
    }
  },

  // 🎪 EXTENSIONS
  extensionsToTreatAsEsm: ['.js'],
  
  // 🔄 SEQUENTIAL MODE FOR INTEGRATION TESTS
  testSequencer: '<rootDir>/tests/utils/test-sequencer.js',
  
  // 📈 PERFORMANCE BUDGETS
  performance: {
    maxBundleSize: 5000000, // 5MB
    maxAssetSize: 1000000   // 1MB
  }
};

// 🎯 ENVIRONMENT-SPECIFIC OVERRIDES
if (process.env.NODE_ENV === 'ci') {
  module.exports.maxWorkers = 2;
  module.exports.testTimeout = 60000;
  module.exports.coverageThreshold = {
    global: {
      branches: 70,
      functions: 75,
      lines: 75,
      statements: 75
    }
  };
}

if (process.env.NODE_ENV === 'e2e') {
  module.exports.testMatch = ['<rootDir>/tests/e2e/**/*.test.js'];
  module.exports.setupFilesAfterEnv = [
    '<rootDir>/tests/setup/e2e.setup.js'
  ];
  module.exports.testTimeout = 120000;
  module.exports.maxWorkers = 1;
  module.exports.globals.IS_E2E = true;
}

if (process.env.NODE_ENV === 'performance') {
  module.exports.testMatch = ['<rootDir>/tests/performance/**/*.test.js'];
  module.exports.reporters = ['default'];
  module.exports.testTimeout = 300000;
}

// 🎯 MICROSERVICE-SPECIFIC CONFIGURATION EXPORTS
module.exports.getMicroserviceConfig = (serviceName) => {
  const baseConfig = { ...module.exports };
  
  const serviceConfigs = {
    'auth-service': {
      testEnvironmentOptions: {
        fayda: {
          apiUrl: process.env.FAYDA_API_URL || 'https://fayda-api.test.et',
          timeout: 30000
        }
      }
    },
    'payment-service': {
      testTimeout: 45000,
      testEnvironmentOptions: {
        payment: {
          timeout: 30000,
          retryAttempts: 3
        }
      }
    },
    'quality-service': {
      collectCoverageFrom: [
        '**/quality-service/src/**/*.js',
        '!**/quality-service/src/**/*.test.js'
      ]
    }
  };

  return serviceConfigs[serviceName] 
    ? { ...baseConfig, ...serviceConfigs[serviceName] }
    : baseConfig;
};

// 🎯 UTILITY FUNCTIONS FOR TEST CONFIGURATION
module.exports.createDatabaseConfig = (databaseName) => ({
  databaseUrl: `postgresql://mosa_forge:password@localhost:5432/${databaseName}_test`,
  timeout: 30000
});

module.exports.createRedisConfig = () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: 1 // Test database
});