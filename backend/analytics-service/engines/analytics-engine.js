// analytics-service/engines/analytics-engine.js

/**
 * 📈 Enterprise Analytics Engine
 * Core analytics processing and calculations
 */

class AnalyticsEngine {
  constructor() {
    this.weights = {
      revenue: 0.3,
      growth: 0.25,
      quality: 0.25,
      engagement: 0.2
    };
  }

  calculatePlatformHealth(metrics) {
    const scores = {
      revenue: this.calculateRevenueHealth(metrics.revenue),
      growth: this.calculateGrowthHealth(metrics.growth),
      quality: this.calculateQualityHealth(metrics.quality),
      engagement: this.calculateEngagementHealth(metrics.engagement)
    };

    const overall = Object.keys(scores).reduce((total, key) => {
      return total + (scores[key] * this.weights[key]);
    }, 0);

    return {
      overall: Math.min(100, overall * 100),
      components: scores,
      status: this.getHealthStatus(overall)
    };
  }

  calculateRevenueHealth(revenueData) {
    if (!revenueData) return 0;
    
    const growthRate = revenueData.trends?.growthRate || 0;
    const stability = revenueData.trends?.stability || 0;
    const diversity = revenueData.distribution?.diversity || 0;

    return (growthRate * 0.4) + (stability * 0.4) + (diversity * 0.2);
  }

  calculateGrowthHealth(growthData) {
    if (!growthData) return 0;
    
    const userGrowth = growthData.userGrowth?.trend || 0;
    const expertGrowth = growthData.expertGrowth?.trend || 0;
    const enrollmentGrowth = growthData.enrollmentGrowth?.trend || 0;

    return (userGrowth * 0.3) + (expertGrowth * 0.3) + (enrollmentGrowth * 0.4);
  }

  calculateQualityHealth(qualityData) {
    if (!qualityData) return 0;
    
    const completionRate = qualityData.completionRate || 0;
    const averageRating = qualityData.averageRating || 0;
    const satisfaction = qualityData.satisfaction || 0;

    return (completionRate * 0.4) + (averageRating * 0.3) + (satisfaction * 0.3);
  }

  calculateEngagementHealth(engagementData) {
    if (!engagementData) return 0;
    
    const activeUsers = engagementData.activeUsers || 0;
    const sessionDuration = engagementData.sessionDuration || 0;
    const retention = engagementData.retention || 0;

    return (activeUsers * 0.3) + (sessionDuration * 0.3) + (retention * 0.4);
  }

  getHealthStatus(score) {
    if (score >= 0.8) return 'EXCELLENT';
    if (score >= 0.7) return 'GOOD';
    if (score >= 0.6) return 'FAIR';
    return 'NEEDS_ATTENTION';
  }
}

module.exports = {
  AnalyticsEngine
};