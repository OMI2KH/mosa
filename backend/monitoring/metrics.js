// monitoring/metrics.js

/**
 * 🎯 ENTERPRISE PERFORMANCE METRICS SYSTEM
 * Production-ready metrics collection, aggregation, and monitoring
 * Real-time performance tracking for Mosa Forge microservices
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance, monitorEventLoopDelay } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../utils/logger');
const client = require('prom-client');

class EnterpriseMetrics extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('EnterpriseMetrics');
    
    // Prometheus metrics registry
    this.register = new client.Registry();
    
    // Initialize all metrics
    this.initializeMetrics();
    this.initializeCustomMetrics();
    this.initializeEventLoopMonitoring();
    
    this.metricsBuffer = new Map();
    this.bufferFlushInterval = null;
    
    this.initialize();
  }

  /**
   * 🚀 INITIALIZE METRICS SYSTEM
   */
  async initialize() {
    try {
      // Test connections
      await this.redis.ping();
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Set up periodic collection
      this.setupPeriodicCollection();
      
      // Start buffer flush interval
      this.bufferFlushInterval = setInterval(
        () => this.flushMetricsBuffer(),
        parseInt(process.env.METRICS_FLUSH_INTERVAL) || 30000
      );

      this.logger.info('Enterprise metrics system initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize metrics system', error);
      throw error;
    }
  }

  /**
   * 📊 INITIALIZE PROMETHEUS METRICS
   */
  initializeMetrics() {
    // HTTP metrics
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code', 'service'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code', 'service']
    });

    // Business metrics
    this.studentEnrollments = new client.Counter({
      name: 'student_enrollments_total',
      help: 'Total student enrollments',
      labelNames: ['skill', 'package', 'payment_method']
    });

    this.expertRegistrations = new client.Counter({
      name: 'expert_registrations_total',
      help: 'Total expert registrations',
      labelNames: ['tier', 'skill_category']
    });

    this.paymentTransactions = new client.Counter({
      name: 'payment_transactions_total',
      help: 'Total payment transactions processed',
      labelNames: ['gateway', 'status', 'amount_range']
    });

    this.revenueDistribution = new client.Gauge({
      name: 'revenue_distribution_etb',
      help: 'Current revenue distribution in ETB',
      labelNames: ['type'] // mosa_revenue, expert_earnings, bonuses
    });

    // Quality metrics
    this.expertQualityScores = new client.Gauge({
      name: 'expert_quality_score',
      help: 'Expert quality scores by tier',
      labelNames: ['expert_id', 'tier', 'skill']
    });

    this.studentCompletionRates = new client.Gauge({
      name: 'student_completion_rate',
      help: 'Student course completion rates',
      labelNames: ['skill', 'package', 'expert_tier']
    });

    // System performance metrics
    this.databaseQueryDuration = new client.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table', 'success'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
    });

    this.redisOperationDuration = new client.Histogram({
      name: 'redis_operation_duration_seconds',
      help: 'Redis operation duration in seconds',
      labelNames: ['operation', 'success'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1]
    });

    this.apiResponseTime = new client.Histogram({
      name: 'api_response_time_seconds',
      help: 'API response time by endpoint',
      labelNames: ['service', 'endpoint', 'method'],
      buckets: [0.1, 0.5, 1, 2, 5]
    });

    // Rate limiting metrics
    this.rateLimitHits = new client.Counter({
      name: 'rate_limit_hits_total',
      help: 'Total rate limit hits by key',
      labelNames: ['key', 'service']
    });

    // Register all metrics
    [
      this.httpRequestDuration,
      this.httpRequestsTotal,
      this.studentEnrollments,
      this.expertRegistrations,
      this.paymentTransactions,
      this.revenueDistribution,
      this.expertQualityScores,
      this.studentCompletionRates,
      this.databaseQueryDuration,
      this.redisOperationDuration,
      this.apiResponseTime,
      this.rateLimitHits
    ].forEach(metric => this.register.registerMetric(metric));

    this.logger.debug('Prometheus metrics initialized');
  }

  /**
   * 🎯 INITIALIZE CUSTOM BUSINESS METRICS
   */
  initializeCustomMetrics() {
    // Real-time capacity metrics
    this.capacityUtilization = new client.Gauge({
      name: 'capacity_utilization_percent',
      help: 'Current capacity utilization percentage',
      labelNames: ['service', 'resource_type']
    });

    // Quality enforcement metrics
    this.qualityEnforcementActions = new client.Counter({
      name: 'quality_enforcement_actions_total',
      help: 'Total quality enforcement actions taken',
      labelNames: ['action_type', 'expert_tier', 'reason']
    });

    // Learning progress metrics
    this.learningProgressMetrics = new client.Histogram({
      name: 'learning_progress_percentage',
      help: 'Student learning progress distribution',
      labelNames: ['skill', 'phase'],
      buckets: [25, 50, 75, 90, 100]
    });

    // Payment distribution metrics
    this.paymentDistribution = new client.Gauge({
      name: 'payment_distribution_etb',
      help: 'Payment distribution across experts and platform',
      labelNames: ['expert_id', 'payout_phase', 'tier']
    });

    // Fraud detection metrics
    this.fraudDetectionMetrics = new client.Counter({
      name: 'fraud_detection_events_total',
      help: 'Fraud detection events by type',
      labelNames: ['detection_type', 'severity', 'service']
    });

    // Register custom metrics
    [
      this.capacityUtilization,
      this.qualityEnforcementActions,
      this.learningProgressMetrics,
      this.paymentDistribution,
      this.fraudDetectionMetrics
    ].forEach(metric => this.register.registerMetric(metric));
  }

  /**
   * 🔄 INITIALIZE EVENT LOOP MONITORING
   */
  initializeEventLoopMonitoring() {
    // Monitor event loop delay
    this.eventLoopDelay = monitorEventLoopDelay({ resolution: 10 });
    this.eventLoopDelay.enable();

    this.eventLoopLag = new client.Gauge({
      name: 'nodejs_eventloop_lag_seconds',
      help: 'Node.js event loop lag in seconds'
    });

    this.register.registerMetric(this.eventLoopLag);
  }

  /**
   * ⚡ SETUP PERIODIC METRICS COLLECTION
   */
  setupPeriodicCollection() {
    // Collect system metrics every 30 seconds
    setInterval(() => this.collectSystemMetrics(), 30000);
    
    // Collect business metrics every minute
    setInterval(() => this.collectBusinessMetrics(), 60000);
    
    // Collect database metrics every 2 minutes
    setInterval(() => this.collectDatabaseMetrics(), 120000);
    
    // Collect Redis metrics every 30 seconds
    setInterval(() => this.collectRedisMetrics(), 30000);
    
    // Update capacity metrics every minute
    setInterval(() => this.updateCapacityMetrics(), 60000);
  }

  /**
   * 💾 COLLECT SYSTEM METRICS
   */
  async collectSystemMetrics() {
    try {
      const startTime = performance.now();

      // Event loop lag
      this.eventLoopLag.set(this.eventLoopDelay.mean / 1e9);

      // Memory usage
      const memoryUsage = process.memoryUsage();
      this.setGauge('nodejs_memory_usage_bytes', memoryUsage.heapUsed, { type: 'heap_used' });
      this.setGauge('nodejs_memory_usage_bytes', memoryUsage.heapTotal, { type: 'heap_total' });
      this.setGauge('nodejs_memory_usage_bytes', memoryUsage.rss, { type: 'rss' });

      // CPU usage
      const cpuUsage = process.cpuUsage();
      this.setGauge('nodejs_cpu_usage_microseconds', cpuUsage.user, { type: 'user' });
      this.setGauge('nodejs_cpu_usage_microseconds', cpuUsage.system, { type: 'system' });

      // Active handles and requests
      this.setGauge('nodejs_active_handles_total', process._getActiveHandles().length);
      this.setGauge('nodejs_active_requests_total', process._getActiveRequests().length);

      // Uptime
      this.setGauge('nodejs_uptime_seconds', process.uptime());

      const collectionTime = performance.now() - startTime;
      this.logger.metric('system_metrics_collection_time', collectionTime);

    } catch (error) {
      this.logger.error('Failed to collect system metrics', error);
    }
  }

  /**
   * 💰 COLLECT BUSINESS METRICS
   */
  async collectBusinessMetrics() {
    try {
      const startTime = performance.now();

      // Revenue metrics
      const revenueData = await this.collectRevenueMetrics();
      this.revenueDistribution.set({ type: 'mosa_revenue' }, revenueData.mosaRevenue);
      this.revenueDistribution.set({ type: 'expert_earnings' }, revenueData.expertEarnings);
      this.revenueDistribution.set({ type: 'bonuses_paid' }, revenueData.bonusesPaid);

      // Enrollment metrics
      const enrollmentStats = await this.collectEnrollmentMetrics();
      this.setGauge('active_students_total', enrollmentStats.activeStudents);
      this.setGauge('active_experts_total', enrollmentStats.activeExperts);

      // Quality metrics
      const qualityStats = await this.collectQualityMetrics();
      this.setGauge('average_quality_score', qualityStats.avgQualityScore);
      this.setGauge('master_tier_experts', qualityStats.masterTierCount);
      this.setGauge('completion_rate_percentage', qualityStats.completionRate);

      // Cache hit rates
      const cacheStats = await this.collectCacheMetrics();
      this.setGauge('redis_cache_hit_rate', cacheStats.hitRate);

      const collectionTime = performance.now() - startTime;
      this.logger.metric('business_metrics_collection_time', collectionTime);

    } catch (error) {
      this.logger.error('Failed to collect business metrics', error);
    }
  }

  /**
   * 🗄️ COLLECT DATABASE METRICS
   */
  async collectDatabaseMetrics() {
    try {
      const startTime = performance.now();

      // Database connection metrics
      const dbStats = await this.prisma.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;

      if (dbStats && dbStats[0]) {
        const stats = dbStats[0];
        this.setGauge('database_connections_total', parseInt(stats.total_connections));
        this.setGauge('database_connections_active', parseInt(stats.active_connections));
        this.setGauge('database_connections_idle', parseInt(stats.idle_connections));
      }

      // Table statistics
      const tableStats = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          relname,
          n_tup_ins,
          n_tup_upd,
          n_tup_del,
          n_live_tup,
          n_dead_tup
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
        LIMIT 10
      `;

      tableStats.forEach((table, index) => {
        this.setGauge('database_table_live_tuples', parseInt(table.n_live_tup), {
          table: table.relname,
          schema: table.schemaname
        });
      });

      const collectionTime = performance.now() - startTime;
      this.logger.metric('database_metrics_collection_time', collectionTime);

    } catch (error) {
      this.logger.error('Failed to collect database metrics', error);
    }
  }

  /**
   * 🔴 COLLECT REDIS METRICS
   */
  async collectRedisMetrics() {
    try {
      const startTime = performance.now();

      const redisInfo = await this.redis.info();
      const lines = redisInfo.split('\r\n');

      const metrics = {};
      lines.forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          metrics[key] = value;
        }
      });

      // Key Redis metrics
      this.setGauge('redis_connected_clients', parseInt(metrics.connected_clients || 0));
      this.setGauge('redis_used_memory_bytes', parseInt(metrics.used_memory || 0));
      this.setGauge('redis_commands_processed_total', parseInt(metrics.total_commands_processed || 0));
      this.setGauge('redis_keyspace_hits', parseInt(metrics.keyspace_hits || 0));
      this.setGauge('redis_keyspace_misses', parseInt(metrics.keyspace_misses || 0));

      // Calculate hit rate
      const hits = parseInt(metrics.keyspace_hits || 0);
      const misses = parseInt(metrics.keyspace_misses || 0);
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      this.setGauge('redis_cache_hit_rate_percent', hitRate);

      const collectionTime = performance.now() - startTime;
      this.logger.metric('redis_metrics_collection_time', collectionTime);

    } catch (error) {
      this.logger.error('Failed to collect Redis metrics', error);
    }
  }

  /**
   * 📈 UPDATE CAPACITY METRICS
   */
  async updateCapacityMetrics() {
    try {
      // Expert capacity utilization
      const expertCapacity = await this.prisma.expert.aggregate({
        _avg: {
          currentStudents: true,
          maxStudents: true
        },
        where: {
          status: 'ACTIVE'
        }
      });

      if (expertCapacity._avg.currentStudents && expertCapacity._avg.maxStudents) {
        const utilization = (expertCapacity._avg.currentStudents / expertCapacity._avg.maxStudents) * 100;
        this.capacityUtilization.set({ service: 'expert_service', resource_type: 'students' }, utilization);
      }

      // Service capacity metrics
      const serviceMetrics = await this.collectServiceCapacity();
      Object.entries(serviceMetrics).forEach(([service, utilization]) => {
        this.capacityUtilization.set({ service, resource_type: 'requests' }, utilization);
      });

    } catch (error) {
      this.logger.error('Failed to update capacity metrics', error);
    }
  }

  /**
   * 🎯 TRACK HTTP REQUEST METRICS
   */
  trackHttpRequest(method, route, statusCode, duration, service = 'unknown') {
    try {
      this.httpRequestDuration.observe(
        { method, route, status_code: statusCode, service },
        duration / 1000
      );

      this.httpRequestsTotal.inc({
        method,
        route,
        status_code: statusCode,
        service
      });

      // Buffer for aggregation
      const key = `http_${method}_${route}_${statusCode}`;
      this.bufferMetric(key, duration, service);

    } catch (error) {
      this.logger.error('Failed to track HTTP request', error);
    }
  }

  /**
   * 💳 TRACK PAYMENT METRICS
   */
  trackPaymentTransaction(gateway, status, amount, studentId) {
    try {
      const amountRange = this.getAmountRange(amount);
      
      this.paymentTransactions.inc({
        gateway,
        status,
        amount_range: amountRange
      });

      // Track revenue distribution
      if (status === 'COMPLETED') {
        this.revenueDistribution.set({ type: 'mosa_revenue' }, amount * 0.5003); // 1000/1999
        this.revenueDistribution.set({ type: 'expert_earnings' }, amount * 0.4997); // 999/1999
      }

      this.logger.metric('payment_processed', amount, { gateway, status, studentId });

    } catch (error) {
      this.logger.error('Failed to track payment transaction', error);
    }
  }

  /**
   * 🎓 TRACK ENROLLMENT METRICS
   */
  trackStudentEnrollment(skill, package, paymentMethod) {
    try {
      this.studentEnrollments.inc({
        skill,
        package,
        payment_method: paymentMethod
      });

      // Update active students count
      this.setGauge('active_students_total', 1, { operation: 'increment' });

    } catch (error) {
      this.logger.error('Failed to track student enrollment', error);
    }
  }

  /**
   * 👨‍🏫 TRACK EXPERT REGISTRATION
   */
  trackExpertRegistration(tier, skillCategory) {
    try {
      this.expertRegistrations.inc({
        tier,
        skill_category: skillCategory
      });

      // Update active experts count
      this.setGauge('active_experts_total', 1, { operation: 'increment' });

    } catch (error) {
      this.logger.error('Failed to track expert registration', error);
    }
  }

  /**
   * 🎯 TRACK QUALITY METRICS
   */
  trackExpertQuality(expertId, qualityScore, tier, skill) {
    try {
      this.expertQualityScores.set(
        { expert_id: expertId, tier, skill },
        qualityScore
      );

      // Emit quality event for real-time dashboards
      this.emit('expertQualityUpdated', {
        expertId,
        qualityScore,
        tier,
        skill,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Failed to track expert quality', error);
    }
  }

  /**
   * 📊 TRACK LEARNING PROGRESS
   */
  trackLearningProgress(studentId, skill, phase, progress) {
    try {
      this.learningProgressMetrics.observe(
        { skill, phase },
        progress
      );

      // Buffer for aggregation
      const key = `learning_${skill}_${phase}`;
      this.bufferMetric(key, progress);

    } catch (error) {
      this.logger.error('Failed to track learning progress', error);
    }
  }

  /**
   * 🛡️ TRACK QUALITY ENFORCEMENT
   */
  trackQualityEnforcement(actionType, expertTier, reason) {
    try {
      this.qualityEnforcementActions.inc({
        action_type: actionType,
        expert_tier: expertTier,
        reason
      });

      this.logger.metric('quality_enforcement_triggered', 1, {
        actionType,
        expertTier,
        reason
      });

    } catch (error) {
      this.logger.error('Failed to track quality enforcement', error);
    }
  }

  /**
   * 🔍 TRACK FRAUD DETECTION
   */
  trackFraudDetection(detectionType, severity, service) {
    try {
      this.fraudDetectionMetrics.inc({
        detection_type: detectionType,
        severity,
        service
      });

      this.logger.metric('fraud_detected', 1, {
        detectionType,
        severity,
        service
      });

    } catch (error) {
      this.logger.error('Failed to track fraud detection', error);
    }
  }

  /**
   * ⚡ BUFFER METRIC FOR AGGREGATION
   */
  bufferMetric(key, value, labels = {}) {
    const metricKey = JSON.stringify({ key, labels });
    
    if (!this.metricsBuffer.has(metricKey)) {
      this.metricsBuffer.set(metricKey, {
        sum: 0,
        count: 0,
        min: Infinity,
        max: -Infinity,
        labels
      });
    }

    const buffer = this.metricsBuffer.get(metricKey);
    buffer.sum += value;
    buffer.count += 1;
    buffer.min = Math.min(buffer.min, value);
    buffer.max = Math.max(buffer.max, value);
  }

  /**
   * 🚀 FLUSH METRICS BUFFER
   */
  async flushMetricsBuffer() {
    if (this.metricsBuffer.size === 0) return;

    try {
      const bufferCopy = new Map(this.metricsBuffer);
      this.metricsBuffer.clear();

      // Process buffered metrics (could send to analytics, update aggregates, etc.)
      for (const [key, data] of bufferCopy) {
        const { key: metricKey, labels } = JSON.parse(key);
        const avg = data.sum / data.count;

        // Store aggregated metrics
        await this.storeAggregatedMetric(metricKey, {
          average: avg,
          min: data.min,
          max: data.max,
          count: data.count,
          timestamp: new Date(),
          labels: data.labels
        });
      }

      this.logger.debug(`Flushed ${bufferCopy.size} buffered metrics`);

    } catch (error) {
      this.logger.error('Failed to flush metrics buffer', error);
    }
  }

  /**
   * 💾 STORE AGGREGATED METRIC
   */
  async storeAggregatedMetric(metricKey, aggregatedData) {
    try {
      const cacheKey = `metrics:aggregated:${metricKey}:${Date.now()}`;
      await this.redis.setex(
        cacheKey,
        3600, // 1 hour TTL
        JSON.stringify(aggregatedData)
      );

      // Emit for real-time processing
      this.emit('metricAggregated', {
        metricKey,
        ...aggregatedData
      });

    } catch (error) {
      this.logger.error('Failed to store aggregated metric', error);
    }
  }

  /**
   * 📈 COLLECT REVENUE METRICS
   */
  async collectRevenueMetrics() {
    try {
      const revenueData = await this.prisma.payment.aggregate({
        _sum: {
          amount: true
        },
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });

      const totalRevenue = revenueData._sum.amount || 0;

      return {
        mosaRevenue: totalRevenue * 0.5003,
        expertEarnings: totalRevenue * 0.4997,
        bonusesPaid: totalRevenue * 0.05 // Estimated 5% bonus pool
      };

    } catch (error) {
      this.logger.error('Failed to collect revenue metrics', error);
      return { mosaRevenue: 0, expertEarnings: 0, bonusesPaid: 0 };
    }
  }

  /**
   * 🎓 COLLECT ENROLLMENT METRICS
   */
  async collectEnrollmentMetrics() {
    try {
      const [activeStudents, activeExperts] = await Promise.all([
        this.prisma.student.count({
          where: { status: 'ACTIVE' }
        }),
        this.prisma.expert.count({
          where: { status: 'ACTIVE' }
        })
      ]);

      return {
        activeStudents,
        activeExperts
      };

    } catch (error) {
      this.logger.error('Failed to collect enrollment metrics', error);
      return { activeStudents: 0, activeExperts: 0 };
    }
  }

  /**
   * 🎯 COLLECT QUALITY METRICS
   */
  async collectQualityMetrics() {
    try {
      const [qualityStats, completionStats, tierStats] = await Promise.all([
        this.prisma.expert.aggregate({
          _avg: { qualityScore: true },
          where: { status: 'ACTIVE' }
        }),
        this.prisma.enrollment.aggregate({
          _avg: { progress: true },
          where: { status: 'IN_PROGRESS' }
        }),
        this.prisma.expert.groupBy({
          by: ['currentTier'],
          _count: { id: true },
          where: { status: 'ACTIVE' }
        })
      ]);

      const masterTierCount = tierStats.find(t => t.currentTier === 'MASTER')?._count.id || 0;

      return {
        avgQualityScore: qualityStats._avg.qualityScore || 0,
        completionRate: completionStats._avg.progress || 0,
        masterTierCount
      };

    } catch (error) {
      this.logger.error('Failed to collect quality metrics', error);
      return { avgQualityScore: 0, completionRate: 0, masterTierCount: 0 };
    }
  }

  /**
   * 🔴 COLLECT CACHE METRICS
   */
  async collectCacheMetrics() {
    try {
      const info = await this.redis.info('stats');
      const lines = info.split('\r\n');
      
      let hits = 0;
      let misses = 0;

      lines.forEach(line => {
        if (line.startsWith('keyspace_hits:')) {
          hits = parseInt(line.split(':')[1]);
        } else if (line.startsWith('keyspace_misses:')) {
          misses = parseInt(line.split(':')[1]);
        }
      });

      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      return { hitRate };

    } catch (error) {
      this.logger.error('Failed to collect cache metrics', error);
      return { hitRate: 0 };
    }
  }

  /**
   * 🔧 COLLECT SERVICE CAPACITY
   */
  async collectServiceCapacity() {
    try {
      // This would integrate with your service discovery and load balancers
      // For now, returning mock data - implement based on your infrastructure
      return {
        api_gateway: 65.5,
        auth_service: 42.3,
        payment_service: 78.9,
        expert_service: 55.1,
        student_service: 48.7,
        learning_service: 61.2
      };

    } catch (error) {
      this.logger.error('Failed to collect service capacity', error);
      return {};
    }
  }

  /**
   * 🎯 GET AMOUNT RANGE FOR METRICS
   */
  getAmountRange(amount) {
    if (amount <= 1000) return '0-1000';
    if (amount <= 5000) return '1001-5000';
    if (amount <= 10000) return '5001-10000';
    return '10000+';
  }

  /**
   * ⚡ SET GAUGE METRIC
   */
  setGauge(name, value, labels = {}) {
    const metric = this.register.getSingleMetric(name);
    if (metric) {
      metric.set(labels, value);
    }
  }

  /**
   * 📊 GET METRICS AS PROMETHEUS FORMAT
   */
  async getMetrics() {
    return await this.register.metrics();
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      clearInterval(this.bufferFlushInterval);
      this.eventLoopDelay.disable();
      await this.redis.quit();
      await this.prisma.$disconnect();
      this.removeAllListeners();
      this.logger.info('Metrics system resources cleaned up');
    } catch (error) {
      this.logger.error('Error during metrics cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new EnterpriseMetrics();