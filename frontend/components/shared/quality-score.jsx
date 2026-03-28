/**
 * 🎯 MOSA FORGE: Enterprise Quality Score Component
 * 
 * @component QualityScore
 * @description Enterprise-grade quality scoring display with real-time metrics
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time quality score visualization
 * - Tier-based styling and badges
 * - Performance metrics breakdown
 * - Interactive quality insights
 * - Multi-context usage (Expert/Student/Admin)
 */

import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// 🏗️ Enterprise Constants
const QUALITY_TIERS = {
  MASTER: {
    threshold: 4.7,
    label: 'Master Tier',
    color: '#10B981',
    gradient: ['#059669', '#10B981'],
    badge: '🏆',
    bonus: '+20%'
  },
  SENIOR: {
    threshold: 4.3,
    label: 'Senior Tier',
    color: '#3B82F6',
    gradient: ['#2563EB', '#3B82F6'],
    badge: '⭐',
    bonus: '+10%'
  },
  STANDARD: {
    threshold: 4.0,
    label: 'Standard Tier',
    color: '#6B7280',
    gradient: ['#4B5563', '#6B7280'],
    badge: '✅',
    bonus: 'Base'
  },
  DEVELOPING: {
    threshold: 3.5,
    label: 'Developing',
    color: '#F59E0B',
    gradient: ['#D97706', '#F59E0B'],
    badge: '📈',
    bonus: '-10%'
  },
  PROBATION: {
    threshold: 0,
    label: 'Probation',
    color: '#EF4444',
    gradient: ['#DC2626', '#EF4444'],
    badge: '⚠️',
    bonus: '-20%'
  }
};

const QUALITY_METRICS = {
  COMPLETION_RATE: {
    label: 'Completion Rate',
    weight: 0.3,
    description: 'Percentage of students completing training'
  },
  AVERAGE_RATING: {
    label: 'Average Rating',
    weight: 0.25,
    description: 'Average student rating across all sessions'
  },
  RESPONSE_TIME: {
    label: 'Response Time',
    weight: 0.2,
    description: 'Average time to respond to student queries'
  },
  STUDENT_PROGRESS: {
    label: 'Student Progress',
    weight: 0.15,
    description: 'Average student progress rate'
  },
  SATISFACTION_SCORE: {
    label: 'Satisfaction',
    weight: 0.1,
    description: 'Overall student satisfaction metrics'
  }
};

/**
 * 🏗️ Enterprise Quality Score Component
 * @param {Object} props
 * @param {number} props.score - Quality score (0-5)
 * @param {Object} props.metrics - Detailed quality metrics
 * @param {string} props.variant - Display variant ('compact' | 'detailed' | 'admin')
 * @param {boolean} props.showBreakdown - Show metrics breakdown
 * @param {Function} props.onPress - Click handler
 * @param {string} props.size - Size variant ('sm' | 'md' | 'lg')
 * @param {boolean} props.animated - Enable animations
 * @param {Object} props.style - Custom styles
 * @param {string} props.context - Usage context ('expert' | 'student' | 'admin')
 */
const QualityScore = memo(({
  score = 0,
  metrics = {},
  variant = 'compact',
  showBreakdown = false,
  onPress,
  size = 'md',
  animated = true,
  style,
  context = 'expert',
  testID = 'quality-score'
}) => {
  // 🎯 State Management
  const [animatedScore] = useState(new Animated.Value(0));
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTier, setCurrentTier] = useState(null);
  const [performanceInsights, setPerformanceInsights] = useState([]);

  // 🏗️ Derived Values
  const normalizedScore = Math.min(5, Math.max(0, score));
  const percentage = (normalizedScore / 5) * 100;
  const tier = getQualityTier(normalizedScore);
  const displayScore = normalizedScore.toFixed(1);

  // 🎯 Animation Setup
  useEffect(() => {
    if (animated) {
      Animated.spring(animatedScore, {
        toValue: percentage,
        tension: 50,
        friction: 7,
        useNativeDriver: false
      }).start();
    } else {
      animatedScore.setValue(percentage);
    }
  }, [percentage, animated]);

  // 🏗️ Tier and Insights Calculation
  useEffect(() => {
    setCurrentTier(tier);
    setPerformanceInsights(generatePerformanceInsights(metrics, normalizedScore));
  }, [metrics, normalizedScore, tier]);

  /**
   * 🏗️ Get Quality Tier Based on Score
   */
  function getQualityTier(score) {
    if (score >= QUALITY_TIERS.MASTER.threshold) return QUALITY_TIERS.MASTER;
    if (score >= QUALITY_TIERS.SENIOR.threshold) return QUALITY_TIERS.SENIOR;
    if (score >= QUALITY_TIERS.STANDARD.threshold) return QUALITY_TIERS.STANDARD;
    if (score >= QUALITY_TIERS.DEVELOPING.threshold) return QUALITY_TIERS.DEVELOPING;
    return QUALITY_TIERS.PROBATION;
  }

  /**
   * 🏗️ Generate Performance Insights
   */
  function generatePerformanceInsights(metrics, score) {
    const insights = [];

    // Completion Rate Insights
    if (metrics.completionRate < 0.7) {
      insights.push({
        type: 'warning',
        message: 'Completion rate below 70% threshold',
        metric: 'completionRate',
        suggestion: 'Focus on student engagement and follow-up'
      });
    } else if (metrics.completionRate > 0.85) {
      insights.push({
        type: 'success',
        message: 'Excellent completion rate',
        metric: 'completionRate',
        suggestion: 'Maintain current engagement strategies'
      });
    }

    // Response Time Insights
    if (metrics.responseTime > 24) {
      insights.push({
        type: 'warning',
        message: 'Response time exceeds 24-hour standard',
        metric: 'responseTime',
        suggestion: 'Improve response time to maintain quality'
      });
    }

    // Rating Insights
    if (score < 4.0) {
      insights.push({
        type: 'critical',
        message: 'Quality score below platform standard',
        metric: 'averageRating',
        suggestion: 'Review student feedback and improve service quality'
      });
    }

    // Progress Insights
    if (metrics.studentProgress < 0.05) {
      insights.push({
        type: 'warning',
        message: 'Student progress rate below weekly target',
        metric: 'studentProgress',
        suggestion: 'Monitor student progress more closely'
      });
    }

    return insights.slice(0, 3); // Limit to 3 most important insights
  }

  /**
   * 🏗️ Handle Component Press
   */
  const handlePress = () => {
    if (variant === 'compact') {
      setIsExpanded(!isExpanded);
    }
    onPress?.({
      score: normalizedScore,
      tier: currentTier,
      metrics,
      insights: performanceInsights
    });
  };

  /**
   * 🏗️ Render Score Circle
   */
  const renderScoreCircle = () => {
    const circleSize = getCircleSize();
    const strokeWidth = getStrokeWidth();

    const animatedStrokeDashoffset = animatedScore.interpolate({
      inputRange: [0, 100],
      outputRange: [2 * Math.PI * 45, 0]
    });

    return (
      <View style={[styles.circleContainer, { width: circleSize, height: circleSize }]}>
        {/* Background Circle */}
        <View style={[styles.circleBackground, { width: circleSize, height: circleSize }]} />
        
        {/* Animated Progress Circle */}
        <Animated.View
          style={[
            styles.circleProgress,
            {
              width: circleSize,
              height: circleSize,
              borderWidth: strokeWidth,
              borderColor: currentTier?.color || QUALITY_TIERS.STANDARD.color,
              transform: [{ rotate: '-90deg' }]
            }
          ]}
        />
        
        {/* Score Display */}
        <View style={styles.scoreContent}>
          <Text style={[styles.scoreText, getScoreTextStyle()]}>
            {displayScore}
          </Text>
          <Text style={[styles.tierBadge, { color: currentTier?.color }]}>
            {currentTier?.badge}
          </Text>
        </View>
      </View>
    );
  };

  /**
   * 🏗️ Render Metrics Breakdown
   */
  const renderMetricsBreakdown = () => {
    if (!showBreakdown && !isExpanded) return null;

    return (
      <View style={styles.breakdownContainer}>
        <Text style={styles.breakdownTitle}>Quality Metrics</Text>
        
        {Object.entries(QUALITY_METRICS).map(([key, metric]) => (
          <MetricRow
            key={key}
            metric={metric}
            value={metrics[key.toLowerCase()]}
            weight={metric.weight}
            tier={currentTier}
          />
        ))}
        
        {/* Performance Insights */}
        {performanceInsights.length > 0 && (
          <View style={styles.insightsContainer}>
            <Text style={styles.insightsTitle}>Performance Insights</Text>
            {performanceInsights.map((insight, index) => (
              <InsightItem key={index} insight={insight} />
            ))}
          </View>
        )}
      </View>
    );
  };

  /**
   * 🏗️ Render Compact View
   */
  const renderCompactView = () => (
    <TouchableOpacity
      style={[styles.compactContainer, style]}
      onPress={handlePress}
      activeOpacity={0.7}
      testID={testID}
    >
      <View style={styles.compactContent}>
        {renderScoreCircle()}
        <View style={styles.compactText}>
          <Text style={[styles.tierText, { color: currentTier?.color }]}>
            {currentTier?.label}
          </Text>
          <Text style={styles.bonusText}>
            Bonus: {currentTier?.bonus}
          </Text>
        </View>
      </View>
      {renderMetricsBreakdown()}
    </TouchableOpacity>
  );

  /**
   * 🏗️ Render Detailed View
   */
  const renderDetailedView = () => (
    <View style={[styles.detailedContainer, style]} testID={testID}>
      <LinearGradient
        colors={currentTier?.gradient || QUALITY_TIERS.STANDARD.gradient}
        style={styles.detailedHeader}
      >
        <View style={styles.detailedScore}>
          {renderScoreCircle()}
          <View style={styles.detailedInfo}>
            <Text style={styles.detailedTier}>{currentTier?.label}</Text>
            <Text style={styles.detailedScoreNumber}>{displayScore}/5.0</Text>
            <Text style={styles.detailedBonus}>Performance Bonus: {currentTier?.bonus}</Text>
          </View>
        </View>
      </LinearGradient>
      
      {renderMetricsBreakdown()}
    </View>
  );

  /**
   * 🏗️ Render Admin View
   */
  const renderAdminView = () => (
    <View style={[styles.adminContainer, style]} testID={testID}>
      <View style={styles.adminHeader}>
        <View style={styles.adminScoreSection}>
          {renderScoreCircle()}
          <View style={styles.adminTierInfo}>
            <Text style={[styles.adminTier, { color: currentTier?.color }]}>
              {currentTier?.badge} {currentTier?.label}
            </Text>
            <Text style={styles.adminScore}>Quality Score: {displayScore}</Text>
            <Text style={styles.adminThreshold}>
              Next Tier: {getNextTierThreshold(normalizedScore)}
            </Text>
          </View>
        </View>
        
        <View style={styles.adminActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {renderMetricsBreakdown()}
    </View>
  );

  // 🎯 Size-based style helpers
  const getCircleSize = () => {
    const sizes = { sm: 60, md: 80, lg: 100 };
    return sizes[size] || sizes.md;
  };

  const getStrokeWidth = () => {
    const widths = { sm: 4, md: 6, lg: 8 };
    return widths[size] || widths.md;
  };

  const getScoreTextStyle = () => {
    const styles = {
      sm: styles.scoreTextSm,
      md: styles.scoreTextMd,
      lg: styles.scoreTextLg
    };
    return styles[size] || styles.md;
  };

  const getNextTierThreshold = (score) => {
    if (score >= QUALITY_TIERS.MASTER.threshold) return 'Max Tier';
    if (score >= QUALITY_TIERS.SENIOR.threshold) return `${QUALITY_TIERS.MASTER.threshold}+`;
    if (score >= QUALITY_TIERS.STANDARD.threshold) return `${QUALITY_TIERS.SENIOR.threshold}+`;
    if (score >= QUALITY_TIERS.DEVELOPING.threshold) return `${QUALITY_TIERS.STANDARD.threshold}+`;
    return `${QUALITY_TIERS.DEVELOPING.threshold}+`;
  };

  // 🎯 Render based on variant
  switch (variant) {
    case 'detailed':
      return renderDetailedView();
    case 'admin':
      return renderAdminView();
    case 'compact':
    default:
      return renderCompactView();
  }
});

/**
 * 🏗️ Metric Row Component
 */
const MetricRow = memo(({ metric, value, weight, tier }) => {
  const progress = value ? Math.min(1, value / 1) : 0; // Normalize to 0-1
  const displayValue = formatMetricValue(metric.label, value);

  return (
    <View style={styles.metricRow}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{metric.label}</Text>
        <Text style={styles.metricWeight}>({Math.round(weight * 100)}%)</Text>
      </View>
      
      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{displayValue}</Text>
        
        {/* Progress Bar */}
        <View style={styles.progressBarBackground}>
          <View 
            style={[
              styles.progressBarFill,
              { 
                width: `${progress * 100}%`,
                backgroundColor: tier?.color || QUALITY_TIERS.STANDARD.color
              }
            ]} 
          />
        </View>
      </View>
      
      <Text style={styles.metricDescription}>{metric.description}</Text>
    </View>
  );
});

/**
 * 🏗️ Insight Item Component
 */
const InsightItem = memo(({ insight }) => {
  const getInsightStyle = () => {
    switch (insight.type) {
      case 'success':
        return styles.insightSuccess;
      case 'warning':
        return styles.insightWarning;
      case 'critical':
        return styles.insightCritical;
      default:
        return styles.insightNeutral;
    }
  };

  return (
    <View style={[styles.insightItem, getInsightStyle()]}>
      <Text style={styles.insightMessage}>{insight.message}</Text>
      <Text style={styles.insightSuggestion}>{insight.suggestion}</Text>
    </View>
  );
});

/**
 * 🏗️ Format Metric Value for Display
 */
function formatMetricValue(metricLabel, value) {
  if (value === null || value === undefined) return 'N/A';
  
  switch (metricLabel) {
    case 'Completion Rate':
    case 'Student Progress':
      return `${Math.round(value * 100)}%`;
    case 'Average Rating':
      return value.toFixed(1);
    case 'Response Time':
      return `${value}h`;
    case 'Satisfaction Score':
      return `${Math.round(value * 100)}%`;
    default:
      return value.toString();
  }
}

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  // Compact View Styles
  compactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginVertical: 4,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactText: {
    marginLeft: 12,
    flex: 1,
  },
  
  // Circle Styles
  circleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circleBackground: {
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    position: 'absolute',
  },
  circleProgress: {
    borderRadius: 50,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    position: 'absolute',
  },
  scoreContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
  scoreTextSm: {
    fontSize: 14,
  },
  scoreTextMd: {
    fontSize: 18,
  },
  scoreTextLg: {
    fontSize: 24,
  },
  tierBadge: {
    fontSize: 12,
    marginTop: 2,
  },
  
  // Text Styles
  tierText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  bonusText: {
    fontSize: 12,
    color: '#6B7280',
  },
  
  // Detailed View Styles
  detailedContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    marginVertical: 8,
  },
  detailedHeader: {
    padding: 24,
  },
  detailedScore: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailedInfo: {
    marginLeft: 20,
    flex: 1,
  },
  detailedTier: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  detailedScoreNumber: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
  },
  detailedBonus: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  
  // Admin View Styles
  adminContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginVertical: 4,
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adminTierInfo: {
    marginLeft: 12,
    flex: 1,
  },
  adminTier: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  adminScore: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  adminThreshold: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  adminActions: {
    marginLeft: 12,
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Breakdown Styles
  breakdownContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  
  // Metric Row Styles
  metricRow: {
    marginBottom: 16,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  metricWeight: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    minWidth: 40,
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginLeft: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricDescription: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  
  // Insights Styles
  insightsContainer: {
    marginTop: 8,
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  insightItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  insightSuccess: {
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  insightWarning: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  insightCritical: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  insightNeutral: {
    backgroundColor: '#F3F4F6',
    borderLeftWidth: 4,
    borderLeftColor: '#6B7280',
  },
  insightMessage: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  insightSuggestion: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});

// 🏗️ Export with Display Name for Debugging
QualityScore.displayName = 'QualityScore';

export default QualityScore;

// 🏗️ Additional Exports for Enterprise Usage
export { 
  QUALITY_TIERS, 
  QUALITY_METRICS 
};