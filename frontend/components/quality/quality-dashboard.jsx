/**
 * 🛡️ MOSA FORGE: Enterprise Quality Dashboard
 * 
 * @component QualityDashboard
 * @description Real-time quality metrics display and monitoring
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time quality metrics monitoring
 * - Expert tier visualization and management
 * - Performance analytics and insights
 * - Auto-enforcement status display
 * - Quality improvement recommendations
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Dimensions,
  Platform,
  Animated,
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';

// 🎯 Enterprise Components
import QualityScoreGauge from './QualityScoreGauge';
import PerformanceMetricsChart from './PerformanceMetricsChart';
import TierProgressIndicator from './TierProgressIndicator';
import QualityAlertSystem from './QualityAlertSystem';
import ImprovementRecommendations from './ImprovementRecommendations';

// 🏗️ Custom Hooks
import { useQualityMetrics } from '../../hooks/use-quality-metrics';
import { usePerformanceAnalytics } from '../../hooks/use-performance-analytics';
import { useRealTimeUpdates } from '../../hooks/use-real-time-updates';

// 🎨 Design System
import {
  Colors,
  Typography,
  Spacing,
  Shadows,
  Borders,
  Gradients
} from '../../design-system';

// 📊 Constants
const DASHBOARD_REFRESH_INTERVAL = 30000; // 30 seconds
const CRITICAL_THRESHOLD = 3.5;
const WARNING_THRESHOLD = 4.0;
const EXCELLENT_THRESHOLD = 4.5;

/**
 * 🛡️ Enterprise Quality Dashboard Component
 */
const QualityDashboard = ({ 
  expertId, 
  viewMode = 'expert', // 'expert' | 'admin' | 'student'
  onQualityAlert,
  onTierChange,
  onImprovementPlan
}) => {
  // 🏗️ State Management
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d'); // '7d', '30d', '90d', '1y'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'metrics', 'improvement', 'history'
  const [animation] = useState(new Animated.Value(0));
  const [lastUpdated, setLastUpdated] = useState(null);

  // 🏗️ Custom Hooks
  const {
    qualityMetrics,
    loading,
    error,
    refreshMetrics,
    subscribeToUpdates,
    unsubscribeFromUpdates
  } = useQualityMetrics(expertId);

  const {
    performanceTrends,
    comparativeAnalysis,
    predictiveInsights,
    calculateROI
  } = usePerformanceAnalytics(expertId, selectedTimeframe);

  const { realTimeData, connectionStatus } = useRealTimeUpdates(
    `quality:expert:${expertId}`
  );

  // 🎯 Real-time Data Integration
  const displayMetrics = useMemo(() => {
    return realTimeData || qualityMetrics;
  }, [realTimeData, qualityMetrics]);

  // 🏗️ Effects & Lifecycle
  useEffect(() => {
    // Start entrance animation
    Animated.timing(animation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Subscribe to real-time updates
    subscribeToUpdates();

    // Set up refresh interval
    const interval = setInterval(() => {
      refreshMetrics();
      setLastUpdated(new Date());
    }, DASHBOARD_REFRESH_INTERVAL);

    return () => {
      unsubscribeFromUpdates();
      clearInterval(interval);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Refresh data when screen comes into focus
      refreshMetrics();
      setLastUpdated(new Date());
    }, [])
  );

  // 🎯 Event Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshMetrics();
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Refresh failed:', error);
      Alert.alert('Refresh Error', 'Failed to update quality metrics');
    } finally {
      setRefreshing(false);
    }
  }, [refreshMetrics]);

  const handleTimeframeChange = useCallback((timeframe) => {
    setSelectedTimeframe(timeframe);
    // Analytics tracking
    trackEvent('quality_dashboard_timeframe_change', { timeframe });
  }, []);

  const handleImprovementPlanCreate = useCallback((planData) => {
    onImprovementPlan?.(planData);
    // Trigger improvement plan creation
    createImprovementPlan(planData);
  }, [onImprovementPlan]);

  // 🎨 Animation Styles
  const animatedStyle = {
    opacity: animation,
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0],
        }),
      },
    ],
  };

  // 📊 Computed Values
  const overallScore = useMemo(() => {
    return displayMetrics?.overallScore || 0;
  }, [displayMetrics]);

  const qualityStatus = useMemo(() => {
    if (overallScore >= EXCELLENT_THRESHOLD) return 'excellent';
    if (overallScore >= WARNING_THRESHOLD) return 'good';
    if (overallScore >= CRITICAL_THRESHOLD) return 'warning';
    return 'critical';
  }, [overallScore]);

  const tierProgress = useMemo(() => {
    const currentTier = displayMetrics?.currentTier || 'STANDARD';
    const nextTier = getNextTier(currentTier);
    const progress = calculateTierProgress(overallScore, currentTier);
    
    return {
      currentTier,
      nextTier,
      progress,
      requirements: getTierRequirements(nextTier)
    };
  }, [displayMetrics, overallScore]);

  const improvementAreas = useMemo(() => {
    return identifyImprovementAreas(displayMetrics);
  }, [displayMetrics]);

  const financialImpact = useMemo(() => {
    return calculateFinancialImpact(displayMetrics, performanceTrends);
  }, [displayMetrics, performanceTrends]);

  // 🎯 Render Methods
  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={Gradients.quality[qualityStatus]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>Quality Dashboard</Text>
            <Text style={styles.subtitle}>
              {viewMode === 'expert' ? 'Your Performance Metrics' : 
               viewMode === 'admin' ? 'Expert Quality Monitoring' : 
               'Expert Quality Overview'}
            </Text>
          </View>
          
          <View style={styles.statusSection}>
            <View style={[styles.statusIndicator, styles[`status_${qualityStatus}`]]}>
              <Text style={styles.statusText}>
                {qualityStatus.toUpperCase()}
              </Text>
            </View>
            {lastUpdated && (
              <Text style={styles.lastUpdated}>
                Updated: {lastUpdated.toLocaleTimeString()}
              </Text>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const renderConnectionStatus = () => (
    <View style={styles.connectionStatus}>
      <View style={[styles.connectionDot, styles[`connection_${connectionStatus}`]]} />
      <Text style={styles.connectionText}>
        {connectionStatus === 'connected' ? 'Live Updates' : 
         connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
      </Text>
    </View>
  );

  const renderQualityScore = () => (
    <View style={styles.scoreSection}>
      <Text style={styles.sectionTitle}>Overall Quality Score</Text>
      <QualityScoreGauge
        score={overallScore}
        maxScore={5}
        thresholds={{
          critical: CRITICAL_THRESHOLD,
          warning: WARNING_THRESHOLD,
          excellent: EXCELLENT_THRESHOLD
        }}
        size={180}
        strokeWidth={12}
        animationDuration={1000}
      />
      <View style={styles.scoreDetails}>
        <Text style={styles.scoreValue}>{overallScore.toFixed(1)}</Text>
        <Text style={styles.scoreOutOf}>/ 5.0</Text>
      </View>
      {financialImpact && (
        <Text style={styles.financialImpact}>
          {financialImpact.impact}: {financialImpact.amount} ETB
        </Text>
      )}
    </View>
  );

  const renderTierProgress = () => (
    <View style={styles.tierSection}>
      <Text style={styles.sectionTitle}>Tier Progress</Text>
      <TierProgressIndicator
        currentTier={tierProgress.currentTier}
        nextTier={tierProgress.nextTier}
        progress={tierProgress.progress}
        requirements={tierProgress.requirements}
        onTierPress={() => setActiveTab('improvement')}
      />
    </View>
  );

  const renderKeyMetrics = () => (
    <View style={styles.metricsSection}>
      <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {displayMetrics?.completionRate?.toFixed(1) || '0'}%
          </Text>
          <Text style={styles.metricLabel}>Completion Rate</Text>
          <Text style={styles.metricTarget}>Target: 70%+</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {displayMetrics?.averageRating?.toFixed(1) || '0'}/5
          </Text>
          <Text style={styles.metricLabel}>Average Rating</Text>
          <Text style={styles.metricTarget}>Target: 4.0+</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {displayMetrics?.responseTime?.toFixed(0) || '0'}h
          </Text>
          <Text style={styles.metricLabel}>Response Time</Text>
          <Text style={styles.metricTarget}>Target: 24h</Text>
        </View>
        
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {displayMetrics?.studentSatisfaction?.toFixed(1) || '0'}%
          </Text>
          <Text style={styles.metricLabel}>Satisfaction</Text>
          <Text style={styles.metricTarget}>Target: 80%+</Text>
        </View>
      </View>
    </View>
  );

  const renderPerformanceTrends = () => (
    <View style={styles.trendsSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Performance Trends</Text>
        <View style={styles.timeframeSelector}>
          {['7d', '30d', '90d', '1y'].map((timeframe) => (
            <TouchableOpacity
              key={timeframe}
              style={[
                styles.timeframeButton,
                selectedTimeframe === timeframe && styles.timeframeButtonActive
              ]}
              onPress={() => handleTimeframeChange(timeframe)}
            >
              <Text style={[
                styles.timeframeText,
                selectedTimeframe === timeframe && styles.timeframeTextActive
              ]}>
                {timeframe}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <PerformanceMetricsChart
        data={performanceTrends}
        timeframe={selectedTimeframe}
        height={200}
        showPredictions={viewMode !== 'student'}
      />
    </View>
  );

  const renderQualityAlerts = () => (
    <View style={styles.alertsSection}>
      <Text style={styles.sectionTitle}>Quality Alerts</Text>
      <QualityAlertSystem
        metrics={displayMetrics}
        onAlertPress={onQualityAlert}
        maxAlerts={3}
        showAll={viewMode === 'admin'}
      />
    </View>
  );

  const renderImprovementRecommendations = () => (
    <View style={styles.improvementSection}>
      <Text style={styles.sectionTitle}>Improvement Opportunities</Text>
      <ImprovementRecommendations
        areas={improvementAreas}
        metrics={displayMetrics}
        onPlanCreate={handleImprovementPlanCreate}
        viewMode={viewMode}
      />
    </View>
  );

  const renderComparativeAnalysis = () => {
    if (viewMode === 'student') return null;
    
    return (
      <View style={styles.comparativeSection}>
        <Text style={styles.sectionTitle}>Comparative Analysis</Text>
        <View style={styles.comparativeGrid}>
          <View style={styles.comparativeItem}>
            <Text style={styles.comparativeValue}>
              #{comparativeAnalysis?.percentile || 0}
            </Text>
            <Text style={styles.comparativeLabel}>Platform Rank</Text>
          </View>
          <View style={styles.comparativeItem}>
            <Text style={styles.comparativeValue}>
              {comparativeAnalysis?.tierAverage?.toFixed(1) || '0'}/5
            </Text>
            <Text style={styles.comparativeLabel}>Tier Average</Text>
          </View>
          <View style={styles.comparativeItem}>
            <Text style={styles.comparativeValue}>
              {comparativeAnalysis?.improvementRate?.toFixed(1) || '0'}%
            </Text>
            <Text style={styles.comparativeLabel}>Improvement Rate</Text>
          </View>
        </View>
      </View>
    );
  };

  // 🎯 Main Render
  if (loading && !displayMetrics) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Quality Metrics...</Text>
      </View>
    );
  }

  if (error && !displayMetrics) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load quality data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, animatedStyle]}>
          {renderConnectionStatus()}
          {renderQualityScore()}
          {renderTierProgress()}
          {renderKeyMetrics()}
          {renderPerformanceTrends()}
          {renderQualityAlerts()}
          {renderImprovementRecommendations()}
          {renderComparativeAnalysis()}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

// 🎯 Utility Functions
const calculateTierProgress = (score, currentTier) => {
  const tierThresholds = {
    STANDARD: { min: 4.0, max: 4.3 },
    SENIOR: { min: 4.3, max: 4.7 },
    MASTER: { min: 4.7, max: 5.0 }
  };

  const threshold = tierThresholds[currentTier];
  if (!threshold) return 0;

  const range = threshold.max - threshold.min;
  const progress = (score - threshold.min) / range;
  return Math.max(0, Math.min(1, progress));
};

const getNextTier = (currentTier) => {
  const tierOrder = ['STANDARD', 'SENIOR', 'MASTER'];
  const currentIndex = tierOrder.indexOf(currentTier);
  return currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;
};

const getTierRequirements = (tier) => {
  const requirements = {
    SENIOR: {
      minScore: 4.3,
      completionRate: 75,
      studentSatisfaction: 85
    },
    MASTER: {
      minScore: 4.7,
      completionRate: 80,
      studentSatisfaction: 90
    }
  };
  return requirements[tier] || {};
};

const identifyImprovementAreas = (metrics) => {
  if (!metrics) return [];
  
  const areas = [];
  
  if (metrics.completionRate < 70) {
    areas.push({
      area: 'completion_rate',
      priority: 'high',
      description: 'Student completion rate below target',
      recommendation: 'Focus on student engagement and follow-up'
    });
  }
  
  if (metrics.averageRating < 4.0) {
    areas.push({
      area: 'student_ratings',
      priority: 'high',
      description: 'Average rating needs improvement',
      recommendation: 'Review student feedback and adjust teaching methods'
    });
  }
  
  if (metrics.responseTime > 24) {
    areas.push({
      area: 'response_time',
      priority: 'medium',
      description: 'Response time exceeds 24 hours',
      recommendation: 'Implement quicker response system'
    });
  }
  
  return areas;
};

const calculateFinancialImpact = (metrics, trends) => {
  if (!metrics || !trends) return null;
  
  const baseEarning = 999; // Base expert earning per student
  const bonusPercentage = metrics.qualityScore >= 4.7 ? 0.2 : 
                         metrics.qualityScore >= 4.3 ? 0.1 : 0;
  
  const potentialBonus = baseEarning * bonusPercentage;
  
  return {
    impact: bonusPercentage > 0 ? 'Quality Bonus' : 'Base Rate',
    amount: baseEarning + potentialBonus
  };
};

const trackEvent = (eventName, properties = {}) => {
  // Implementation for analytics tracking
  console.log(`Tracking: ${eventName}`, properties);
};

const createImprovementPlan = async (planData) => {
  // Implementation for creating improvement plan
  console.log('Creating improvement plan:', planData);
};

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    height: 120,
    ...Shadows.medium,
  },
  headerGradient: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : Spacing.xl,
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSection: {
    flex: 1,
  },
  title: {
    ...Typography.heading1,
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body2,
    color: Colors.text.inverse,
    opacity: 0.9,
  },
  statusSection: {
    alignItems: 'flex-end',
  },
  statusIndicator: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Borders.radius.full,
    marginBottom: Spacing.xs,
  },
  status_excellent: {
    backgroundColor: Colors.semantic.success,
  },
  status_good: {
    backgroundColor: Colors.semantic.warning,
  },
  status_warning: {
    backgroundColor: Colors.semantic.caution,
  },
  status_critical: {
    backgroundColor: Colors.semantic.error,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  lastUpdated: {
    ...Typography.caption,
    color: Colors.text.inverse,
    opacity: 0.8,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.background.tertiary,
    borderRadius: Borders.radius.full,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  connection_connected: {
    backgroundColor: Colors.semantic.success,
  },
  connection_connecting: {
    backgroundColor: Colors.semantic.warning,
  },
  connection_disconnected: {
    backgroundColor: Colors.semantic.error,
  },
  connectionText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  scoreSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.background.secondary,
    borderRadius: Borders.radius.lg,
    ...Shadows.light,
  },
  sectionTitle: {
    ...Typography.heading3,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  scoreDetails: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.md,
  },
  scoreValue: {
    ...Typography.heading1,
    color: Colors.text.primary,
    marginRight: Spacing.xs,
  },
  scoreOutOf: {
    ...Typography.body1,
    color: Colors.text.secondary,
  },
  financialImpact: {
    ...Typography.body2,
    color: Colors.semantic.success,
    marginTop: Spacing.sm,
    fontWeight: '600',
  },
  tierSection: {
    marginBottom: Spacing.xl,
  },
  metricsSection: {
    marginBottom: Spacing.xl,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: Colors.background.secondary,
    padding: Spacing.md,
    borderRadius: Borders.radius.md,
    marginBottom: Spacing.md,
    ...Shadows.light,
    alignItems: 'center',
  },
  metricValue: {
    ...Typography.heading2,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  metricLabel: {
    ...Typography.body2,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  metricTarget: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  trendsSection: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.background.tertiary,
    borderRadius: Borders.radius.md,
    padding: 2,
  },
  timeframeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Borders.radius.sm,
  },
  timeframeButtonActive: {
    backgroundColor: Colors.background.primary,
    ...Shadows.light,
  },
  timeframeText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  timeframeTextActive: {
    color: Colors.text.primary,
    fontWeight: '600',
  },
  alertsSection: {
    marginBottom: Spacing.xl,
  },
  improvementSection: {
    marginBottom: Spacing.xl,
  },
  comparativeSection: {
    marginBottom: Spacing.xl,
  },
  comparativeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  comparativeItem: {
    alignItems: 'center',
    flex: 1,
    padding: Spacing.md,
    backgroundColor: Colors.background.secondary,
    marginHorizontal: Spacing.xs,
    borderRadius: Borders.radius.md,
    ...Shadows.light,
  },
  comparativeValue: {
    ...Typography.heading3,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  comparativeLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    ...Typography.body1,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    padding: Spacing.xl,
  },
  errorText: {
    ...Typography.body1,
    color: Colors.text.secondary,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Borders.radius.md,
  },
  retryButtonText: {
    ...Typography.button,
    color: Colors.text.inverse,
  },
});

// 🏗️ Performance Optimization
export default React.memo(QualityDashboard, (prevProps, nextProps) => {
  return prevProps.expertId === nextProps.expertId &&
         prevProps.viewMode === nextProps.viewMode;
});