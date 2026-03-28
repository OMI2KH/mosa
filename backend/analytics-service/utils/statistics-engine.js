// analytics-service/utils/statistics-engine.js

/**
 * 📈 Enterprise Statistics Engine
 * Advanced statistical calculations for completion analytics
 */

class StatisticsEngine {
  constructor() {
    this.precision = 6;
  }

  /**
   * Calculate correlation between two datasets
   */
  calculateCorrelation(dataset1, dataset2) {
    if (!dataset1 || !dataset2 || dataset1.length !== dataset2.length) {
      return 0;
    }

    const n = dataset1.length;
    const sum1 = dataset1.reduce((sum, value) => sum + value, 0);
    const sum2 = dataset2.reduce((sum, value) => sum + value, 0);
    
    const sum1Sq = dataset1.reduce((sum, value) => sum + value * value, 0);
    const sum2Sq = dataset2.reduce((sum, value) => sum + value * value, 0);
    
    const pSum = dataset1.reduce((sum, value, index) => sum + value * dataset2[index], );
    
    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
    
    return den === 0 ? 0 : Number((num / den).toFixed(this.precision));
  }

  /**
   * Calculate average with outlier detection
   */
  calculateAverage(values, excludeOutliers = true) {
    if (!values || values.length === 0) return 0;
    
    if (excludeOutliers) {
      const filtered = this.removeOutliers(values);
      return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
    }
    
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /**
   * Remove statistical outliers using IQR method
   */
  removeOutliers(values) {
    if (values.length < 4) return values;
    
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.filter(value => value >= lowerBound && value <= upperBound);
  }

  /**
   * Analyze frequency distribution
   */
  analyzeFrequency(values) {
    const frequency = {};
    values.forEach(value => {
      frequency[value] = (frequency[value] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .map(([value, count]) => ({
        value: Number(value),
        count,
        percentage: (count / values.length) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate progress consistency
   */
  calculateConsistency(intervals) {
    if (!intervals || intervals.length === 0) return 1;
    
    const average = this.calculateAverage(intervals);
    const variance = intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - average, 2);
    }, 0) / intervals.length;
    
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = standardDeviation / average;
    
    return Math.max(0, 1 - coefficientOfVariation);
  }

  /**
   * Analyze predictor strength
   */
  analyzePredictors(predictors) {
    const results = {};
    
    Object.keys(predictors[0] || {}).forEach(key => {
      const values = predictors.map(p => p[key]);
      results[key] = {
        average: this.calculateAverage(values),
        consistency: this.calculateConsistency(values),
        impact: this.calculatePredictorImpact(values, predictors)
      };
    });
    
    return results;
  }

  calculatePredictorImpact(values, predictors) {
    // Simplified impact calculation
    // In production, this would use machine learning models
    const completionRates = predictors.map(p => p.sessionAttendance || 0.5);
    return this.calculateCorrelation(values, completionRates);
  }
}

module.exports = {
  StatisticsEngine
};