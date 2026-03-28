// ecosystem.config.js

/**
 * 🚀 ENTERPRISE PM2 PRODUCTION CONFIGURATION
 * Microservices Orchestration for Mosa Forge Enterprise
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const os = require('os');

// Environment-based configurations
const ENVIRONMENTS = {
  development: {
    NODE_ENV: 'development',
    PORT: 3000,
    INSTANCES: 1,
    MAX_MEMORY: '512M',
    WATCH: true
  },
  staging: {
    NODE_ENV: 'staging', 
    PORT: 3000,
    INSTANCES: 'max',
    MAX_MEMORY: '1G',
    WATCH: false
  },
  production: {
    NODE_ENV: 'production',
    PORT: 3000,
    INSTANCES: 'max',
    MAX_MEMORY: '2G',
    WATCH: false
  }
};

// Get CPU count for optimal instance management
const CPU_CORES = os.cpus().length;
const MAX_INSTANCES = Math.max(2, Math.floor(CPU_CORES * 1.5));

// Microservices configuration
const MICROSERVICES = {
  // 🚀 API GATEWAY - Entry point for all requests
  'api-gateway': {
    name: 'mosa-forge-api-gateway',
    script: './services/api-gateway/server.js',
    instances: ENVIRONMENTS.production.INSTANCES,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      SERVICE_NAME: 'api-gateway'
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 3000
    },
    // 🔧 Performance Optimization
    node_args: '--max-http-header-size=16384 --max-old-space-size=4096',
    max_memory_restart: ENVIRONMENTS.production.MAX_MEMORY,
    
    // 📊 Monitoring & Logging
    log_file: './logs/api-gateway-combined.log',
    out_file: './logs/api-gateway-out.log',
    error_file: './logs/api-gateway-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // 🔄 Process Management
    min_uptime: '60s',
    max_restarts: 10,
    restart_delay: 4000,
    autorestart: true,
    
    // 🎯 Health Checks
    health_check_url: 'http://localhost:3000/health',
    health_check_interval: 30000,
    
    // 📈 Advanced Configuration
    kill_timeout: 5000,
    listen_timeout: 3000,
    shutdown_with_message: true
  },

  // 🔐 AUTHENTICATION SERVICE
  'auth-service': {
    name: 'mosa-forge-auth-service',
    script: './services/auth-service/server.js',
    instances: ENVIRONMENTS.production.INSTANCES,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      SERVICE_NAME: 'auth-service'
    },
    node_args: '--max-old-space-size=2048',
    max_memory_restart: '1G',
    log_file: './logs/auth-service-combined.log',
    out_file: './logs/auth-service-out.log',
    error_file: './logs/auth-service-error.log',
    min_uptime: '30s',
    max_restarts: 15,
    restart_delay: 2000,
    kill_timeout: 10000, // Longer timeout for auth transactions
    health_check_url: 'http://localhost:3001/health'
  },

  // 💰 PAYMENT SERVICE
  'payment-service': {
    name: 'mosa-forge-payment-service',
    script: './services/payment-service/server.js',
    instances: 2, // Fixed instances for payment reliability
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
      SERVICE_NAME: 'payment-service'
    },
    node_args: '--max-old-space-size=3072',
    max_memory_restart: '1.5G',
    log_file: './logs/payment-service-combined.log',
    out_file: './logs/payment-service-out.log',
    error_file: './logs/payment-service-error.log',
    min_uptime: '120s',
    max_restarts: 5, // Fewer restarts for payment stability
    restart_delay: 5000,
    kill_timeout: 15000, // Extended for payment processing
    health_check_url: 'http://localhost:3002/health'
  },

  // 👨‍🏫 EXPERT SERVICE
  'expert-service': {
    name: 'mosa-forge-expert-service',
    script: './services/expert-service/server.js',
    instances: ENVIRONMENTS.production.INSTANCES,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3003,
      SERVICE_NAME: 'expert-service'
    },
    node_args: '--max-old-space-size=2048',
    max_memory_restart: '1G',
    log_file: './logs/expert-service-combined.log',
    out_file: './logs/expert-service-out.log',
    error_file: './logs/expert-service-error.log',
    min_uptime: '45s',
    max_restarts: 10,
    restart_delay: 3000,
    health_check_url: 'http://localhost:3003/health'
  },

  // 🎓 STUDENT SERVICE
  'student-service': {
    name: 'mosa-forge-student-service',
    script: './services/student-service/server.js',
    instances: ENVIRONMENTS.production.INSTANCES,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3004,
      SERVICE_NAME: 'student-service'
    },
    node_args: '--max-old-space-size=2048',
    max_memory_restart: '1G',
    log_file: './logs/student-service-combined.log',
    out_file: './logs/student-service-out.log',
    error_file: './logs/student-service-error.log',
    min_uptime: '45s',
    max_restarts: 10,
    restart_delay: 3000,
    health_check_url: 'http://localhost:3004/health'
  },

  // 🛡️ QUALITY SERVICE
  'quality-service': {
    name: 'mosa-forge-quality-service',
    script: './services/quality-service/server.js',
    instances: 2, // Fixed for consistent quality monitoring
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3005,
      SERVICE_NAME: 'quality-service'
    },
    node_args: '--max-old-space-size=2048',
    max_memory_restart: '1G',
    log_file: './logs/quality-service-combined.log',
    out_file: './logs/quality-service-out.log',
    error_file: './logs/quality-service-error.log',
    min_uptime: '60s',
    max_restarts: 8,
    restart_delay: 4000,
    health_check_url: 'http://localhost:3005/health'
  },

  // 📚 LEARNING SERVICE
  'learning-service': {
    name: 'mosa-forge-learning-service',
    script: './services/learning-service/server.js',
    instances: ENVIRONMENTS.production.INSTANCES,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3006,
      SERVICE_NAME: 'learning-service'
    },
    node_args: '--max-old-space-size=3072',
    max_memory_restart: '1.5G',
    log_file: './logs/learning-service-combined.log',
    out_file: './logs/learning-service-out.log',
    error_file: './logs/learning-service-error.log',
    min_uptime: '45s',
    max_restarts: 10,
    restart_delay: 3000,
    health_check_url: 'http://localhost:3006/health'
  },

  // 🏋️ TRAINING SERVICE
  'training-service': {
    name: 'mosa-forge-training-service',
    script: './services/training-service/server.js',
    instances: ENVIRONMENTS.production.INSTANCES,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3007,
      SERVICE_NAME: 'training-service'
    },
    node_args: '--max-old-space-size=2048',
    max_memory_restart: '1G',
    log_file: './logs/training-service-combined.log',
    out_file: './logs/training-service-out.log',
    error_file: './logs/training-service-error.log',
    min_uptime: '45s',
    max_restarts: 10,
    restart_delay: 3000,
    health_check_url: 'http://localhost:3007/health'
  },

  // 🏆 CERTIFICATION SERVICE
  'certification-service': {
    name: 'mosa-forge-certification-service',
    script: './services/certification-service/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3008,
      SERVICE_NAME: 'certification-service'
    },
    node_args: '--max-old-space-size=2048',
    max_memory_restart: '1G',
    log_file: './logs/certification-service-combined.log',
    out_file: './logs/certification-service-out.log',
    error_file: './logs/certification-service-error.log',
    min_uptime: '60s',
    max_restarts: 8,
    restart_delay: 4000,
    health_check_url: 'http://localhost:3008/health'
  },

  // 📊 ANALYTICS SERVICE
  'analytics-service': {
    name: 'mosa-forge-analytics-service',
    script: './services/analytics-service/server.js',
    instances: 1, // Single instance for data consistency
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3009,
      SERVICE_NAME: 'analytics-service'
    },
    node_args: '--max-old-space-size=4096',
    max_memory_restart: '2G',
    log_file: './logs/analytics-service-combined.log',
    out_file: './logs/analytics-service-out.log',
    error_file: './logs/analytics-service-error.log',
    min_uptime: '120s',
    max_restarts: 5,
    restart_delay: 10000,
    kill_timeout: 30000,
    health_check_url: 'http://localhost:3009/health'
  }
};

// 🎯 DEPLOYMENT SCENARIOS
const DEPLOYMENT_SCENARIOS = {
  // 🚀 FULL PRODUCTION DEPLOYMENT
  production: {
    apps: Object.values(MICROSERVICES).map(service => ({
      ...service,
      env: {
        ...service.env,
        DEPLOYMENT: 'production',
        DATABASE_URL: process.env.PRODUCTION_DATABASE_URL,
        REDIS_URL: process.env.PRODUCTION_REDIS_URL,
        AWS_REGION: 'eu-central-1'
      }
    }))
  },

  // 🧪 STAGING ENVIRONMENT
  staging: {
    apps: Object.values(MICROSERVICES).map(service => ({
      ...service,
      instances: 1,
      exec_mode: 'fork',
      env: {
        ...service.env,
        NODE_ENV: 'staging',
        DEPLOYMENT: 'staging',
        DATABASE_URL: process.env.STAGING_DATABASE_URL,
        REDIS_URL: process.env.STAGING_REDIS_URL,
        AWS_REGION: 'eu-central-1'
      }
    }))
  },

  // 💻 DEVELOPMENT ENVIRONMENT
  development: {
    apps: Object.values(MICROSERVICES).map(service => ({
      ...service,
      instances: 1,
      exec_mode: 'fork',
      watch: ['./services', './shared'],
      ignore_watch: ['node_modules', 'logs', '.git'],
      env: {
        ...service.env,
        NODE_ENV: 'development',
        DEPLOYMENT: 'development',
        DATABASE_URL: process.env.DEVELOPMENT_DATABASE_URL,
        REDIS_URL: process.env.DEVELOPMENT_REDIS_URL,
        AWS_REGION: 'local'
      }
    }))
  },

  // 🔬 MICROSERVICE-SPECIFIC DEPLOYMENTS
  'api-gateway-only': {
    apps: [MICROSERVICES['api-gateway']]
  },

  'core-services': {
    apps: [
      MICROSERVICES['api-gateway'],
      MICROSERVICES['auth-service'],
      MICROSERVICES['payment-service'],
      MICROSERVICES['student-service'],
      MICROSERVICES['expert-service']
    ]
  },

  'learning-stack': {
    apps: [
      MICROSERVICES['learning-service'],
      MICROSERVICES['training-service'],
      MICROSERVICES['quality-service']
    ]
  }
};

// 🛠️ PM2 MODULE CONFIGURATION
const PM2_MODULES = {
  // 📊 MONITORING & METRICS
  'pm2-prometheus-exporter': {
    script: 'pm2-prometheus-exporter',
    env: {
      PORT: 9200
    }
  },

  // 🔍 LOG MANAGEMENT
  'pm2-logrotate': {
    max_size: '100M',
    retain: '30',
    compress: true,
    dateFormat: 'YYYY-MM-DD_HH-mm-ss',
    workerInterval: 30,
    rotateInterval: '0 0 * * *',
    rotateModule: true
  }
};

// 🚀 MAIN EXPORT - Dynamic configuration based on environment
module.exports = {
  /**
   * PM2 Application Configuration
   * Usage: 
   * - pm2 start ecosystem.config.js --env production
   * - pm2 start ecosystem.config.js --env staging
   * - pm2 start ecosystem.config.js --env development
   */
  apps: DEPLOYMENT_SCENARIOS[process.env.PM2_ENV || 'development'].apps,

  /**
   * 🔧 PM2 Deployment Configuration
   */
  deploy: {
    production: {
      user: 'mosaforge',
      host: ['api.mosaforge.com'],
      ref: 'origin/main',
      repo: 'git@github.com:mosa-forge/enterprise-platform.git',
      path: '/var/www/mosa-forge/production',
      'post-deploy': `
        npm install --production &&
        npx prisma generate &&
        npx prisma migrate deploy &&
        pm2 reload ecosystem.config.js --env production &&
        pm2 save
      `,
      env: {
        NODE_ENV: 'production'
      }
    },

    staging: {
      user: 'mosaforge',
      host: ['staging.mosaforge.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:mosa-forge/enterprise-platform.git',
      path: '/var/www/mosa-forge/staging',
      'post-deploy': `
        npm install &&
        npx prisma generate &&
        npx prisma migrate deploy &&
        pm2 reload ecosystem.config.js --env staging &&
        pm2 save
      `,
      env: {
        NODE_ENV: 'staging'
      }
    }
  },

  /**
   * 📈 PM2 MODULE CONFIGURATION
   */
  module: PM2_MODULES,

  /**
   * 🎯 GLOBAL PM2 CONFIGURATION
   */
  pm2: {
    /**
     * 🔍 LOGGING CONFIGURATION
     */
    log: {
      type: 'json', // JSON format for structured logging
      timestamp: true,
      worker: true
    },

    /**
     * 📊 METRICS CONFIGURATION  
     */
    metrics: {
      enabled: true,
      port: 9200,
      path: '/metrics'
    },

    /**
     * 🚨 ALERTING CONFIGURATION
     */
    alert: {
      enabled: true,
      mode: 'email',
      recipients: ['devops@mosaforge.com', 'alerts@mosaforge.com'],
      events: ['restart', 'stop', 'error']
    }
  }
};

// 🛠️ UTILITY FUNCTIONS FOR PM2 MANAGEMENT
class PM2ConfigManager {
  /**
   * Get service configuration by name
   */
  static getServiceConfig(serviceName) {
    return MICROSERVICES[serviceName];
  }

  /**
   * Get deployment scenario
   */
  static getDeploymentScenario(scenarioName) {
    return DEPLOYMENT_SCENARIOS[scenarioName];
  }

  /**
   * Generate health check configuration
   */
  static generateHealthChecks() {
    return Object.values(MICROSERVICES).map(service => ({
      name: service.name,
      url: service.env.health_check_url || `http://localhost:${service.env.PORT}/health`,
      interval: 30000
    }));
  }

  /**
   * Validate configuration
   */
  static validateConfig() {
    const errors = [];
    
    Object.entries(MICROSERVICES).forEach(([name, config]) => {
      if (!config.script) {
        errors.push(`Missing script for service: ${name}`);
      }
      if (!config.env.PORT) {
        errors.push(`Missing PORT for service: ${name}`);
      }
    });

    if (errors.length > 0) {
      throw new Error(`PM2 Configuration Errors:\n${errors.join('\n')}`);
    }

    return true;
  }
}

// Export utility class
module.exports.PM2ConfigManager = PM2ConfigManager;

/**
 * 🎯 USAGE EXAMPLES:
 * 
 * # Start all services in production
 * pm2 start ecosystem.config.js --env production
 * 
 * # Start only core services
 * pm2 start ecosystem.config.js --env core-services  
 * 
 * # Monitor services
 * pm2 monit
 * 
 * # View logs
 * pm2 logs
 * 
 * # Restart specific service
 * pm2 restart mosa-forge-auth-service
 * 
 * # Scale service
 * pm2 scale mosa-forge-api-gateway 4
 */

console.log(`
🚀 MOSA FORGE PM2 ENTERPRISE CONFIGURATION
=========================================

📊 Available Deployment Scenarios:
• production    - Full production deployment
• staging       - Staging environment  
• development   - Development setup
• core-services - Core microservices only
• learning-stack- Learning-focused services

🛠️ Usage:
pm2 start ecosystem.config.js --env [scenario]

🔍 Monitoring:
pm2 monit          # Real-time monitoring
pm2 logs           # View all logs
pm2 status         # Service status

📈 Scaling:
pm2 scale [app-name] [instances]  # Scale service

✅ Configuration Validated: ${PM2ConfigManager.validateConfig()}
`);