// analytics-service/config/capacity-config.js

/**
 * 🎛️ Capacity Utilization Configuration
 * Enterprise-grade configuration management
 */

module.exports = {
  // 🎯 Performance Thresholds
  thresholds: {
    highUtilization: 0.85,    // 85% capacity
    optimalUtilization: 0.75,  // 75% capacity  
    lowUtilization: 0.5,       // 50% capacity
    criticalQuality: 3.5,      // Minimum quality score
    excellentQuality: 4.5      // Excellent quality threshold
  },

  // ⚡ Real-time Monitoring
  monitoring: {
    expertCheckInterval: 5 * 60 * 1000,    // 5 minutes
    platformUpdateInterval: 30 * 60 * 1000, // 30 minutes
    cacheTTL: 5 * 60,                       // 5 minutes
    retentionPeriod: 90                     // 90 days
  },

  // 📈 Forecasting Parameters
  forecasting: {
    historicalDays: 180,        // 6 months historical data
    seasonalityPeriods: 4,      // Quarterly seasonality
    confidenceInterval: 0.95,   // 95% confidence
    growthSmoothing: 0.3        // Exponential smoothing factor
  },

  // 🎚️ Tier Configuration
  tiers: {
    MASTER: { baseCapacity: 1000, qualityBonus: 0.2 },
    SENIOR: { baseCapacity: 100, qualityBonus: 0.1 },
    STANDARD: { baseCapacity: 50, qualityBonus: 0 },
    DEVELOPING: { baseCapacity: 25, qualityPenalty: -0.1 },
    PROBATION: { baseCapacity: 10, qualityPenalty: -0.2 }
  },

  // 🔧 Optimization Weights
  optimization: {
    qualityWeight: 0.4,
    utilizationWeight: 0.3,
    revenueWeight: 0.2,
    studentSatisfactionWeight: 0.1
  }
};