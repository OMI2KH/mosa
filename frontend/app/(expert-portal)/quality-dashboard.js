// expert-portal/quality-dashboard.js

/**
 * 🎯 ENTERPRISE QUALITY DASHBOARD
 * Production-ready quality metrics dashboard for Mosa Forge Experts
 * Real-time quality monitoring, performance analytics, improvement recommendations
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  Animated,
  Dimensions 
} from 'react-native';
import { 
  LineChart, 
  BarChart, 
  PieChart 
} from 'react-native-chart-kit';
import { BlurView } from '@react-native-community/blur';
import { EventEmitter } from 'events';

// Custom hooks and services
import { useQualityMetrics } from '../../hooks/use-quality-metrics';
import { useExpertPerformance } from '../../hooks/use-expert-performance';
import { QualityService } from '../../services/quality-service';
import { AnalyticsService } from '../../services/analytics-service';

// Components
import QualityScoreCard from '../../components/quality/QualityScoreCard';
import MetricsDisplay from '../../components/quality/MetricsDisplay';
import TierProgress from '../../components/quality/TierProgress';
import QualityAlert from '../../components/quality/QualityAlert';
import ImprovementSuggestions from '../../components/quality/ImprovementSuggestions';
import PerformanceChart from '../../components/quality/PerformanceChart';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

class QualityDashboardEngine extends EventEmitter {
  constructor() {
    super();
    this.qualityService = new QualityService();
    this.analyticsService = new AnalyticsService();
    this.cache = new Map();
    this.realTimeInterval = null;
    this.METRICS_UPDATE_INTERVAL = 30000; // 30 seconds
  }

  async initialize(expertId) {
    try {
      await this.loadInitialMetrics(expertId);
      this.startRealTimeUpdates(expertId);
      this.emit('engineReady', { expertId, timestamp: Date.now() });
    } catch (error) {
      this.emit('engineError', { error, context: 'initialization' });
      throw error;
    }
  }

  async loadInitialMetrics(expertId) {
    const cacheKey = `expert:${expertId}:metrics`;
    
    // Try cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
        this.emit('metricsLoaded', cached.data);
        return cached.data;
      }
    }

    // Load from multiple services in parallel
    const [qualityMetrics, performanceData, tierInfo, recommendations] = await Promise.all([
      this.qualityService.getExpertQualityMetrics(expertId),
      this.analyticsService.getPerformanceAnalytics(expertId),
      this.qualityService.getTierInformation(expertId),
      this.qualityService.getImprovementRecommendations(expertId)
    ]);

    const consolidatedData = {
      ...qualityMetrics,
      performance: performanceData,
      tier: tierInfo,
      recommendations,
      lastUpdated: new Date().toISOString(),
      cacheKey
    };

    this.cache.set(cacheKey, {
      data: consolidatedData,
      timestamp: Date.now()
    });

    this.emit('metricsLoaded', consolidatedData);
    return consolidatedData;
  }

  startRealTimeUpdates(expertId) {
    this.realTimeInterval = setInterval(async () => {
      try {
        const updates = await this.qualityService.getRealTimeUpdates(expertId);
        this.emit('realTimeUpdate', updates);
        
        // Update cache
        const cacheKey = `expert:${expertId}:metrics`;
        if (this.cache.has(cacheKey)) {
          const cached = this.cache.get(cacheKey);
          this.cache.set(cacheKey, {
            ...cached,
            data: { ...cached.data, ...updates }
          });
        }
      } catch (error) {
        this.emit('realTimeError', { error, context: 'realTimeUpdate' });
      }
    }, this.METRICS_UPDATE_INTERVAL);
  }

  stopRealTimeUpdates() {
    if (this.realTimeInterval) {
      clearInterval(this.realTimeInterval);
      this.realTimeInterval = null;
    }
  }

  destroy() {
    this.stopRealTimeUpdates();
    this.cache.clear();
    this.removeAllListeners();
  }
}

const QualityDashboard = ({ expertId, navigation }) => {
  // State management
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [realTimeUpdates, setRealTimeUpdates] = useState({});
  const [error, setError] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Custom hooks
  const { 
    qualityMetrics, 
    refreshMetrics, 
    subscribeToUpdates 
  } = useQualityMetrics(expertId);

  const {
    performanceData,
    tierProgress,
    capacityMetrics
  } = useExpertPerformance(expertId);

  // Dashboard engine instance
  const dashboardEngine = useMemo(() => new QualityDashboardEngine(), []);

  // Initialize dashboard
  useEffect(() => {
    initializeDashboard();

    return () => {
      dashboardEngine.destroy();
    };
  }, [expertId]);

  const initializeDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      await dashboardEngine.initialize(expertId);

      // Set up event listeners
      dashboardEngine.on('metricsLoaded', handleMetricsLoaded);
      dashboardEngine.on('realTimeUpdate', handleRealTimeUpdate);
      dashboardEngine.on('engineError', handleEngineError);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

    } catch (err) {
      handleEngineError(err);
    }
  }, [expertId, dashboardEngine]);

  const handleMetricsLoaded = useCallback((data) => {
    setDashboardData(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  const handleRealTimeUpdate = useCallback((updates) => {
    setRealTimeUpdates(prev => ({ ...prev, ...updates }));
    setDashboardData(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const handleEngineError = useCallback((error) => {
    console.error('Dashboard Engine Error:', error);
    setError(error.message || 'Failed to load quality dashboard');
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      await dashboardEngine.loadInitialMetrics(expertId);
    } catch (err) {
      handleEngineError(err);
    }
  }, [expertId, dashboardEngine]);

  // Memoized computed values
  const consolidatedData = useMemo(() => {
    if (!dashboardData) return null;

    return {
      ...dashboardData,
      ...realTimeUpdates,
      // Merge with hook data
      qualityMetrics: qualityMetrics || dashboardData.qualityMetrics,
      performance: performanceData || dashboardData.performance,
      tier: tierProgress || dashboardData.tier
    };
  }, [dashboardData, realTimeUpdates, qualityMetrics, performanceData, tierProgress]);

  const criticalAlerts = useMemo(() => {
    if (!consolidatedData?.qualityMetrics) return [];

    const alerts = [];
    const { qualityScore, completionRate, responseTime, studentSatisfaction } = consolidatedData.qualityMetrics;

    if (qualityScore < 4.0) {
      alerts.push({
        type: 'critical',
        title: 'Quality Score Below Standard',
        message: 'Immediate improvement required to maintain Standard tier',
        action: 'View Improvement Plan'
      });
    }

    if (completionRate < 0.7) {
      alerts.push({
        type: 'warning',
        title: 'Low Completion Rate',
        message: `${(completionRate * 100).toFixed(1)}% completion rate below 70% target`,
        action: 'Analyze Student Progress'
      });
    }

    if (responseTime > 24) {
      alerts.push({
        type: 'warning',
        title: 'Slow Response Time',
        message: `Average response time ${responseTime}h exceeds 24h target`,
        action: 'Optimize Response Workflow'
      });
    }

    if (studentSatisfaction < 0.8) {
      alerts.push({
        type: 'warning',
        title: 'Student Satisfaction Concern',
        message: `${(studentSatisfaction * 100).toFixed(1)}% satisfaction below 80% target`,
        action: 'Review Student Feedback'
      });
    }

    return alerts;
  }, [consolidatedData]);

  const performanceChartData = useMemo(() => {
    if (!consolidatedData?.performance?.trend) return null;

    return {
      labels: consolidatedData.performance.trend.map((_, index) => `Week ${index + 1}`),
      datasets: [
        {
          data: consolidatedData.performance.trend.map(item => item.qualityScore * 20), // Convert to 0-100 scale
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Green
          strokeWidth: 2
        },
        {
          data: consolidatedData.performance.trend.map(item => item.completionRate * 100),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Blue
          strokeWidth: 2
        }
      ],
      legend: ['Quality Score', 'Completion Rate']
    };
  }, [consolidatedData]);

  const ratingDistributionData = useMemo(() => {
    if (!consolidatedData?.performance?.ratingDistribution) return null;

    const distribution = consolidatedData.performance.ratingDistribution;
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);

    return [
      {
        name: '5 Stars',
        population: distribution[5] || 0,
        color: '#10b981',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: '4 Stars',
        population: distribution[4] || 0,
        color: '#60a5fa',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: '3 Stars',
        population: distribution[3] || 0,
        color: '#f59e0b',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: '2 Stars',
        population: distribution[2] || 0,
        color: '#f97316',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      },
      {
        name: '1 Star',
        population: distribution[1] || 0,
        color: '#ef4444',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      }
    ].filter(item => item.population > 0);
  }, [consolidatedData]);

  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={[styles.loadingContent, { opacity: fadeAnim }]}>
          <Text style={styles.loadingText}>Loading Quality Dashboard...</Text>
          <View style={styles.loadingSpinner} />
        </Animated.View>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Quality Dashboard Unavailable</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.retryText} onPress={handleRefresh}>
          Tap to retry
        </Text>
      </View>
    );
  }

  // Main dashboard render
  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#10b981']}
            tintColor="#10b981"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Quality Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Real-time performance monitoring
          </Text>
          {consolidatedData?.lastUpdated && (
            <Text style={styles.lastUpdated}>
              Updated: {new Date(consolidatedData.lastUpdated).toLocaleTimeString()}
            </Text>
          )}
        </View>

        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <View style={styles.alertsSection}>
            {criticalAlerts.map((alert, index) => (
              <QualityAlert
                key={index}
                type={alert.type}
                title={alert.title}
                message={alert.message}
                action={alert.action}
                onActionPress={() => navigation.navigate('ImprovementPlan')}
              />
            ))}
          </View>
        )}

        {/* Quality Score Card */}
        {consolidatedData?.qualityMetrics && (
          <QualityScoreCard
            qualityScore={consolidatedData.qualityMetrics.qualityScore}
            currentTier={consolidatedData.tier?.currentTier}
            nextTier={consolidatedData.tier?.nextTier}
            progress={consolidatedData.tier?.progress}
            onTierPress={() => navigation.navigate('TierDetails')}
          />
        )}

        {/* Key Metrics Grid */}
        {consolidatedData?.qualityMetrics && (
          <View style={styles.metricsGrid}>
            <MetricsDisplay
              title="Completion Rate"
              value={`${(consolidatedData.qualityMetrics.completionRate * 100).toFixed(1)}%`}
              target="70%"
              status={
                consolidatedData.qualityMetrics.completionRate >= 0.7 ? 'success' : 
                consolidatedData.qualityMetrics.completionRate >= 0.6 ? 'warning' : 'error'
              }
              trend={consolidatedData.performance?.completionTrend}
            />
            <MetricsDisplay
              title="Avg Response Time"
              value={`${consolidatedData.qualityMetrics.responseTime}h`}
              target="24h"
              status={
                consolidatedData.qualityMetrics.responseTime <= 24 ? 'success' : 
                consolidatedData.qualityMetrics.responseTime <= 48 ? 'warning' : 'error'
              }
              trend={consolidatedData.performance?.responseTrend}
            />
            <MetricsDisplay
              title="Student Satisfaction"
              value={`${(consolidatedData.qualityMetrics.studentSatisfaction * 100).toFixed(1)}%`}
              target="80%"
              status={
                consolidatedData.qualityMetrics.studentSatisfaction >= 0.8 ? 'success' : 
                consolidatedData.qualityMetrics.studentSatisfaction >= 0.7 ? 'warning' : 'error'
              }
              trend={consolidatedData.performance?.satisfactionTrend}
            />
            <MetricsDisplay
              title="Weekly Progress"
              value={`${(consolidatedData.qualityMetrics.weeklyProgress * 100).toFixed(1)}%`}
              target="5%"
              status={
                consolidatedData.qualityMetrics.weeklyProgress >= 0.05 ? 'success' : 
                consolidatedData.qualityMetrics.weeklyProgress >= 0.03 ? 'warning' : 'error'
              }
              trend={consolidatedData.performance?.progressTrend}
            />
          </View>
        )}

        {/* Performance Charts */}
        <View style={styles.chartsSection}>
          <Text style={styles.sectionTitle}>Performance Trends</Text>
          
          {performanceChartData && (
            <PerformanceChart
              data={performanceChartData}
              height={200}
              style={styles.chart}
            />
          )}

          {ratingDistributionData && (
            <View style={styles.pieChartContainer}>
              <Text style={styles.chartTitle}>Rating Distribution</Text>
              <PieChart
                data={ratingDistributionData}
                width={SCREEN_WIDTH - 40}
                height={180}
                chartConfig={pieChartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
              />
            </View>
          )}
        </View>

        {/* Tier Progress */}
        {consolidatedData?.tier && (
          <TierProgress
            currentTier={consolidatedData.tier.currentTier}
            nextTier={consolidatedData.tier.nextTier}
            progress={consolidatedData.tier.progress}
            requirements={consolidatedData.tier.requirements}
            onRequirementsPress={() => navigation.navigate('TierRequirements')}
          />
        )}

        {/* Improvement Suggestions */}
        {consolidatedData?.recommendations && consolidatedData.recommendations.length > 0 && (
          <ImprovementSuggestions
            suggestions={consolidatedData.recommendations}
            onSuggestionPress={(suggestion) => 
              navigation.navigate('SuggestionDetails', { suggestion })
            }
          />
        )}

        {/* Capacity Metrics */}
        {capacityMetrics && (
          <View style={styles.capacitySection}>
            <Text style={styles.sectionTitle}>Capacity Utilization</Text>
            <View style={styles.capacityGrid}>
              <View style={styles.capacityItem}>
                <Text style={styles.capacityLabel}>Current Students</Text>
                <Text style={styles.capacityValue}>
                  {capacityMetrics.currentStudents}/{capacityMetrics.maxCapacity}
                </Text>
                <Text style={styles.capacityPercentage}>
                  {((capacityMetrics.currentStudents / capacityMetrics.maxCapacity) * 100).toFixed(1)}%
                </Text>
              </View>
              <View style={styles.capacityItem}>
                <Text style={styles.capacityLabel}>Available Slots</Text>
                <Text style={styles.capacityValue}>
                  {capacityMetrics.availableSlots}
                </Text>
                <Text style={styles.capacityPercentage}>
                  {((capacityMetrics.availableSlots / capacityMetrics.maxCapacity) * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Quality metrics update every 30 seconds
          </Text>
          <Text style={styles.footerNote}>
            Maintain 4.0+ quality score for Standard tier eligibility
          </Text>
        </View>
      </ScrollView>

      {/* Real-time update indicator */}
      {Object.keys(realTimeUpdates).length > 0 && (
        <BlurView
          style={styles.updateIndicator}
          blurType="light"
          blurAmount={10}
        >
          <Text style={styles.updateText}>Live updates applied</Text>
        </BlurView>
      )}
    </View>
  );
};

// Chart configurations
const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#ffffff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#22c55e'
  }
};

const pieChartConfig = {
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  loadingSpinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#e2e8f0',
    borderTopColor: '#10b981',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8fafc',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  retryText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#94a3b8',
  },
  alertsSection: {
    marginBottom: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  chartsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 16,
  },
  chart: {
    marginBottom: 20,
  },
  pieChartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  capacitySection: {
    marginBottom: 24,
  },
  capacityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  capacityItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  capacityLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  capacityValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  capacityPercentage: {
    fontSize: 12,
    color: '#64748b',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  footerNote: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
  },
  updateIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  updateText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '500',
  },
});

export default QualityDashboard;