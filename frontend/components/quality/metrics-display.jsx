// quality/metrics-display.jsx

/**
 * 🎯 ENTERPRISE QUALITY METRICS DISPLAY
 * Production-ready React component for expert performance metrics
 * Real-time quality monitoring with auto-enforcement indicators
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useQualityMetrics } from '../hooks/use-quality-metrics';
import { Logger } from '../utils/logger';

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const QUALITY_THRESHOLDS = {
  MASTER: { min: 4.7, color: '#10B981', label: 'Master Tier' },
  SENIOR: { min: 4.3, color: '#3B82F6', label: 'Senior Tier' },
  STANDARD: { min: 4.0, color: '#6B7280', label: 'Standard Tier' },
  DEVELOPING: { min: 3.5, color: '#F59E0B', label: 'Developing' },
  PROBATION: { min: 0, color: '#EF4444', label: 'Probation' }
};

const PERFORMANCE_METRICS = {
  RESPONSE_TIME: { threshold: 24, unit: 'hours', optimal: 12 },
  COMPLETION_RATE: { threshold: 70, unit: '%', optimal: 80 },
  STUDENT_SATISFACTION: { threshold: 80, unit: '%', optimal: 90 },
  WEEKLY_PROGRESS: { threshold: 5, unit: '%', optimal: 10 }
};

const QualityMetricsDisplay = memo(({
  expertId,
  autoRefresh = true,
  refreshInterval = 30000,
  showDetails = true,
  compact = false,
  onMetricsUpdate,
  onTierChange,
  onQualityAlert
}) => {
  const logger = new Logger('QualityMetricsDisplay');
  
  // State management
  const [metrics, setMetrics] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [animationValues] = useState({
    fadeAnim: new Animated.Value(0),
    scaleAnim: new Animated.Value(0.95),
    progressAnim: new Animated.Value(0)
  });

  // Custom hooks
  const {
    getExpertMetrics,
    subscribeToUpdates,
    unsubscribeFromUpdates,
    calculatePerformanceScore,
    formatMetricValue
  } = useQualityMetrics();

  // 🔄 Real-time metrics subscription
  useEffect(() => {
    if (!expertId) return;

    const handleMetricsUpdate = (updatedMetrics) => {
      logger.debug('Real-time metrics update received', { expertId, metrics: updatedMetrics });
      setMetrics(updatedMetrics);
      setLastUpdated(new Date());
      
      // Trigger animations
      animateMetricsUpdate();
      
      // Callback for parent components
      onMetricsUpdate?.(updatedMetrics);
      
      // Check for tier changes
      if (metrics && metrics.currentTier !== updatedMetrics.currentTier) {
        onTierChange?.(updatedMetrics.currentTier, metrics.currentTier);
      }
      
      // Check for quality alerts
      checkQualityAlerts(updatedMetrics);
    };

    // Subscribe to real-time updates
    subscribeToUpdates(expertId, handleMetricsUpdate);

    // Initial metrics load
    loadMetrics();

    // Auto-refresh interval
    let refreshTimer;
    if (autoRefresh) {
      refreshTimer = setInterval(loadMetrics, refreshInterval);
    }

    return () => {
      unsubscribeFromUpdates(expertId, handleMetricsUpdate);
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [expertId, autoRefresh, refreshInterval]);

  // 🎭 Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(animationValues.fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(animationValues.scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  /**
   * 📊 Load expert metrics
   */
  const loadMetrics = useCallback(async () => {
    if (!expertId) return;

    try {
      setIsRefreshing(true);
      const expertMetrics = await getExpertMetrics(expertId);
      
      if (expertMetrics) {
        setMetrics(expertMetrics);
        setLastUpdated(new Date());
        logger.debug('Metrics loaded successfully', { expertId });
      }
    } catch (error) {
      logger.error('Failed to load metrics', error, { expertId });
    } finally {
      setIsRefreshing(false);
    }
  }, [expertId, getExpertMetrics]);

  /**
   * 🎬 Animate metrics update
   */
  const animateMetricsUpdate = () => {
    Animated.sequence([
      Animated.timing(animationValues.scaleAnim, {
        toValue: 1.02,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(animationValues.scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };

  /**
   * 🚨 Check for quality alerts
   */
  const checkQualityAlerts = (currentMetrics) => {
    const alerts = [];

    // Quality score alerts
    if (currentMetrics.qualityScore < QUALITY_THRESHOLDS.STANDARD.min) {
      alerts.push({
        type: 'CRITICAL',
        message: `Quality score below standard (${currentMetrics.qualityScore})`,
        metric: 'qualityScore'
      });
    }

    // Completion rate alerts
    if (currentMetrics.completionRate < PERFORMANCE_METRICS.COMPLETION_RATE.threshold) {
      alerts.push({
        type: 'WARNING',
        message: `Completion rate below target (${currentMetrics.completionRate}%)`,
        metric: 'completionRate'
      });
    }

    // Response time alerts
    if (currentMetrics.averageResponseTime > PERFORMANCE_METRICS.RESPONSE_TIME.threshold) {
      alerts.push({
        type: 'WARNING', 
        message: `Response time too high (${currentMetrics.averageResponseTime}h)`,
        metric: 'responseTime'
      });
    }

    // Trigger alert callbacks
    alerts.forEach(alert => onQualityAlert?.(alert));
  };

  /**
   * 🎯 Calculate performance score (0-100)
   */
  const calculateOverallPerformance = useCallback((metrics) => {
    if (!metrics) return 0;

    const weights = {
      qualityScore: 0.4,
      completionRate: 0.3,
      studentSatisfaction: 0.2,
      weeklyProgress: 0.1
    };

    let score = 0;
    
    // Quality Score (0-5 scale → 0-100)
    score += (metrics.qualityScore / 5) * 100 * weights.qualityScore;
    
    // Completion Rate (already in percentage)
    score += metrics.completionRate * weights.completionRate;
    
    // Student Satisfaction (already in percentage)  
    score += metrics.studentSatisfaction * weights.studentSatisfaction;
    
    // Weekly Progress (0-100 scale)
    score += Math.min(metrics.weeklyProgress * 10, 100) * weights.weeklyProgress;

    return Math.round(score);
  }, []);

  /**
   * 🏆 Get current tier information
   */
  const getCurrentTierInfo = useCallback((qualityScore) => {
    for (const [tier, config] of Object.entries(QUALITY_THRESHOLDS)) {
      if (qualityScore >= config.min) {
        return {
          tier,
          color: config.color,
          label: config.label,
          nextTier: getNextTier(tier),
          progressToNext: calculateTierProgress(qualityScore, tier)
        };
      }
    }
    return QUALITY_THRESHOLDS.PROBATION;
  }, []);

  /**
   * 📈 Calculate progress to next tier
   */
  const calculateTierProgress = (currentScore, currentTier) => {
    const tiers = ['PROBATION', 'DEVELOPING', 'STANDARD', 'SENIOR', 'MASTER'];
    const currentIndex = tiers.indexOf(currentTier);
    
    if (currentIndex === tiers.length - 1) return 100; // Already at highest tier
    
    const nextTier = tiers[currentIndex + 1];
    const currentMin = QUALITY_THRESHOLDS[currentTier].min;
    const nextMin = QUALITY_THRESHOLDS[nextTier].min;
    
    const progress = ((currentScore - currentMin) / (nextMin - currentMin)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  /**
   * 🔼 Get next tier information
   */
  const getNextTier = (currentTier) => {
    const tiers = ['PROBATION', 'DEVELOPING', 'STANDARD', 'SENIOR', 'MASTER'];
    const currentIndex = tiers.indexOf(currentTier);
    
    if (currentIndex < tiers.length - 1) {
      const nextTier = tiers[currentIndex + 1];
      return {
        tier: nextTier,
        minScore: QUALITY_THRESHOLDS[nextTier].min,
        bonus: calculateTierBonus(nextTier)
      };
    }
    return null;
  };

  /**
   * 💰 Calculate tier bonus percentage
   */
  const calculateTierBonus = (tier) => {
    const bonuses = {
      MASTER: 20,
      SENIOR: 10, 
      STANDARD: 0,
      DEVELOPING: -10,
      PROBATION: -20
    };
    return bonuses[tier] || 0;
  };

  /**
   * 🎨 Render quality score gauge
   */
  const renderQualityGauge = () => {
    if (!metrics) return null;

    const tierInfo = getCurrentTierInfo(metrics.qualityScore);
    const performanceScore = calculateOverallPerformance(metrics);

    return (
      <View style={styles.gaugeContainer}>
        <LinearGradient
          colors={['#1F2937', '#374151']}
          style={styles.gaugeBackground}
        >
          {/* Performance Score */}
          <View style={styles.performanceScore}>
            <Text style={styles.performanceScoreText}>{performanceScore}</Text>
            <Text style={styles.performanceScoreLabel}>Performance</Text>
          </View>

          {/* Quality Score */}
          <View style={styles.qualityScoreSection}>
            <Text style={styles.qualityScore}>{metrics.qualityScore.toFixed(1)}</Text>
            <Text style={styles.qualityScoreLabel}>Quality Score</Text>
            
            {/* Tier Badge */}
            <View style={[styles.tierBadge, { backgroundColor: tierInfo.color }]}>
              <Text style={styles.tierBadgeText}>{tierInfo.label}</Text>
            </View>
          </View>

          {/* Progress to Next Tier */}
          {tierInfo.nextTier && (
            <View style={styles.tierProgressSection}>
              <Text style={styles.tierProgressText}>
                {tierInfo.progressToNext.toFixed(0)}% to {tierInfo.nextTier.tier}
              </Text>
              <View style={styles.progressBarBackground}>
                <Animated.View 
                  style={[
                    styles.progressBarFill,
                    { 
                      width: animationValues.progressAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%']
                      }),
                      backgroundColor: tierInfo.color
                    }
                  ]}
                />
              </View>
              <Text style={styles.nextTierBonus}>
                +{tierInfo.nextTier.bonus}% Bonus
              </Text>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  /**
   * 📊 Render performance metrics grid
   */
  const renderPerformanceMetrics = () => {
    if (!metrics || compact) return null;

    const metricsData = [
      {
        key: 'completionRate',
        label: 'Completion Rate',
        value: metrics.completionRate,
        unit: '%',
        threshold: PERFORMANCE_METRICS.COMPLETION_RATE.threshold,
        optimal: PERFORMANCE_METRICS.COMPLETION_RATE.optimal
      },
      {
        key: 'studentSatisfaction', 
        label: 'Student Satisfaction',
        value: metrics.studentSatisfaction,
        unit: '%',
        threshold: PERFORMANCE_METRICS.STUDENT_SATISFACTION.threshold,
        optimal: PERFORMANCE_METRICS.STUDENT_SATISFACTION.optimal
      },
      {
        key: 'responseTime',
        label: 'Avg Response Time',
        value: metrics.averageResponseTime,
        unit: 'h',
        threshold: PERFORMANCE_METRICS.RESPONSE_TIME.threshold,
        optimal: PERFORMANCE_METRICS.RESPONSE_TIME.optimal,
        invert: true // Lower is better
      },
      {
        key: 'weeklyProgress',
        label: 'Weekly Progress',
        value: metrics.weeklyProgress,
        unit: '%',
        threshold: PERFORMANCE_METRICS.WEEKLY_PROGRESS.threshold,
        optimal: PERFORMANCE_METRICS.WEEKLY_PROGRESS.optimal
      }
    ];

    return (
      <View style={styles.metricsGrid}>
        <Text style={styles.metricsGridTitle}>Performance Metrics</Text>
        <View style={styles.metricsRow}>
          {metricsData.map((metric, index) => (
            <MetricCard
              key={metric.key}
              metric={metric}
              index={index}
              total={metricsData.length}
            />
          ))}
        </View>
      </View>
    );
  };

  /**
   * 📈 Render metric trend indicators
   */
  const renderTrendIndicators = () => {
    if (!metrics?.trends || compact) return null;

    return (
      <View style={styles.trendsContainer}>
        <Text style={styles.trendsTitle}>30-Day Trends</Text>
        <View style={styles.trendsGrid}>
          {Object.entries(metrics.trends).map(([key, trend]) => (
            <TrendIndicator
              key={key}
              metric={key}
              trend={trend}
              currentValue={metrics[key]}
            />
          ))}
        </View>
      </View>
    );
  };

  /**
   * 🕒 Render last updated timestamp
   */
  const renderLastUpdated = () => (
    <View style={styles.lastUpdated}>
      <Text style={styles.lastUpdatedText}>
        Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Loading...'}
      </Text>
      <TouchableOpacity onPress={loadMetrics} style={styles.refreshButton}>
        <Text style={styles.refreshButtonText}>
          {isRefreshing ? '⟳' : '↻'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // 🎨 Main render
  if (!expertId) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Expert ID required</Text>
      </View>
    );
  }

  if (!metrics && !isRefreshing) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading quality metrics...</Text>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: animationValues.fadeAnim,
          transform: [{ scale: animationValues.scaleAnim }]
        }
      ]}
    >
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={loadMetrics}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quality Gauge */}
        {renderQualityGauge()}

        {/* Performance Metrics Grid */}
        {showDetails && renderPerformanceMetrics()}

        {/* Trend Indicators */}
        {showDetails && renderTrendIndicators()}

        {/* Last Updated */}
        {renderLastUpdated()}
      </ScrollView>
    </Animated.View>
  );
});

/**
 * 📊 Individual Metric Card Component
 */
const MetricCard = memo(({ metric, index, total }) => {
  const isOptimal = metric.invert 
    ? metric.value <= metric.optimal
    : metric.value >= metric.optimal;
  
  const isWarning = metric.invert
    ? metric.value > metric.threshold
    : metric.value < metric.threshold;

  const getMetricColor = () => {
    if (isOptimal) return '#10B981'; // Green
    if (isWarning) return '#EF4444'; // Red
    return '#F59E0B'; // Yellow
  };

  return (
    <View 
      style={[
        styles.metricCard,
        { 
          marginRight: index < total - 1 ? 8 : 0,
          minWidth: (SCREEN_WIDTH - 48) / total 
        }
      ]}
    >
      <LinearGradient
        colors={['#1F2937', '#111827']}
        style={styles.metricCardBackground}
      >
        <Text style={styles.metricValue} numberOfLines={1}>
          {metric.value}{metric.unit}
        </Text>
        <Text style={styles.metricLabel} numberOfLines={2}>
          {metric.label}
        </Text>
        
        {/* Status Indicator */}
        <View style={[styles.metricStatus, { backgroundColor: getMetricColor() }]} />
        
        {/* Threshold Indicator */}
        <Text style={styles.metricThreshold}>
          Target: {metric.threshold}{metric.unit}
        </Text>
      </LinearGradient>
    </View>
  );
});

/**
 * 📈 Trend Indicator Component
 */
const TrendIndicator = memo(({ metric, trend, currentValue }) => {
  const getTrendIcon = () => {
    if (trend > 0.1) return '↗️';
    if (trend < -0.1) return '↘️';
    return '→';
  };

  const getTrendColor = () => {
    if (trend > 0.1) return '#10B981';
    if (trend < -0.1) return '#EF4444';
    return '#6B7280';
  };

  const formatTrendText = () => {
    const absTrend = Math.abs(trend);
    if (absTrend < 0.1) return 'Stable';
    return `${(trend * 100).toFixed(1)}%`;
  };

  return (
    <View style={styles.trendItem}>
      <Text style={styles.trendMetric}>{metric}</Text>
      <View style={styles.trendValueContainer}>
        <Text style={styles.trendValue}>{currentValue}</Text>
        <Text style={[styles.trendIcon, { color: getTrendColor() }]}>
          {getTrendIcon()}
        </Text>
      </View>
      <Text style={[styles.trendText, { color: getTrendColor() }]}>
        {formatTrendText()}
      </Text>
    </View>
  );
});

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  gaugeContainer: {
    margin: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gaugeBackground: {
    padding: 24,
    borderRadius: 20,
  },
  performanceScore: {
    alignItems: 'center',
    marginBottom: 20,
  },
  performanceScoreText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  performanceScoreLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  qualityScoreSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qualityScore: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  qualityScoreLabel: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 4,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  tierBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tierProgressSection: {
    alignItems: 'center',
  },
  tierProgressText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 8,
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  nextTierBonus: {
    color: '#10B981',
    fontSize: 11,
    marginTop: 6,
    fontWeight: '600',
  },
  metricsGrid: {
    margin: 16,
    marginTop: 0,
  },
  metricsGridTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  metricCardBackground: {
    padding: 12,
    borderRadius: 12,
    minHeight: 100,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 8,
    flex: 1,
  },
  metricStatus: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  metricThreshold: {
    color: '#6B7280',
    fontSize: 10,
  },
  trendsContainer: {
    margin: 16,
    marginTop: 0,
  },
  trendsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  trendsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  trendItem: {
    width: '48%',
    backgroundColor: '#1F2937',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  trendMetric: {
    color: '#9CA3AF',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  trendValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  trendValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 6,
  },
  trendIcon: {
    fontSize: 14,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  lastUpdated: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
  },
  lastUpdatedText: {
    color: '#6B7280',
    fontSize: 12,
  },
  refreshButton: {
    padding: 6,
  },
  refreshButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
});

export default QualityMetricsDisplay;