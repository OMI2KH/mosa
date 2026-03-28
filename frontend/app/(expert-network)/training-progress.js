/**
 * 🏢 MOSA FORGE - Enterprise Training Progress Dashboard
 * 📊 Real-time Training Analytics & Performance Tracking
 * 🎯 Multi-dimensional Progress Visualization & Insights
 * 🔄 Interactive Progress Management & Intervention System
 * 🚀 Enterprise-Grade React Native Dashboard
 * 
 * @module TrainingProgressDashboard
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Dimensions,
  Platform,
  Alert,
  Modal
} from 'react-native';
import {
  LineChart,
  BarChart,
  PieChart,
  ProgressChart
} from 'react-native-chart-kit';
import { BlurView } from '@react-native-community/blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

// 🏗️ Enterprise Dependencies
import EnterpriseLogger from '../../utils/enterprise-logger';
import TrainingProgressService from '../../services/training-progress-service';
import PerformanceAnalytics from '../../utils/performance-analytics';
import NotificationManager from '../../utils/notification-manager';
import OfflineManager from '../../utils/offline-manager';

// 🎯 UI Components
import ProgressCard from '../../components/progress/ProgressCard';
import MetricCard from '../../components/metrics/MetricCard';
import InterventionCard from '../../components/intervention/InterventionCard';
import PerformanceIndicator from '../../components/indicators/PerformanceIndicator';
import ActionButton from '../../components/buttons/ActionButton';
import FilterPanel from '../../components/filters/FilterPanel';
import InsightCard from '../../components/insights/InsightCard';
import LoadingOverlay from '../../components/overlays/LoadingOverlay';
import ErrorBoundary from '../../components/error/ErrorBoundary';

// 📊 Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 40;
const CHART_HEIGHT = 220;

const TrainingProgressDashboard = ({ route, navigation }) => {
  // 🎯 State Management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [offline, setOffline] = useState(false);
  
  // 📊 Progress Data
  const [progressData, setProgressData] = useState(null);
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [interventions, setInterventions] = useState([]);
  const [insights, setInsights] = useState([]);
  
  // 🎛️ Filter & Configuration
  const [timeRange, setTimeRange] = useState('7d');
  const [metricFocus, setMetricFocus] = useState('overall');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  
  // 🔄 Animation Values
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(SCREEN_HEIGHT);
  const scaleAnim = useSharedValue(0.9);
  
  // 🏗️ Service Instances
  const logger = useMemo(() => new EnterpriseLogger({
    service: 'training-progress-dashboard',
    module: 'frontend-app',
    environment: process.env.NODE_ENV
  }), []);

  const progressService = useMemo(() => new TrainingProgressService({
    baseURL: process.env.API_BASE_URL,
    cacheEnabled: true,
    realTimeUpdates: true
  }), []);

  const analytics = useMemo(() => new PerformanceAnalytics({
    metrics: ['completion', 'engagement', 'quality', 'retention'],
    weights: [0.3, 0.25, 0.25, 0.2]
  }), []);

  /**
   * 🚀 INITIALIZE DASHBOARD
   */
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        logger.info('Initializing training progress dashboard');
        
        // 📡 Check Network Connectivity
        const isOnline = await OfflineManager.checkConnectivity();
        setOffline(!isOnline);

        if (!isOnline) {
          // 💾 Load Cached Data
          await loadCachedData();
          setLoading(false);
          return;
        }

        // 📊 Load Progress Data
        await loadProgressData();
        
        // 📈 Initialize Performance Analytics
        await initializeAnalytics();
        
        // 🔔 Setup Real-time Updates
        await setupRealTimeUpdates();
        
        // 🎯 Start Entrance Animation
        startEntranceAnimation();
        
        setLoading(false);
        
        logger.info('Training progress dashboard initialized successfully');
        
      } catch (error) {
        logger.error('Dashboard initialization failed', { error: error.message });
        setError(error.message);
        setLoading(false);
      }
    };

    initializeDashboard();

    // 🧹 Cleanup
    return () => {
      cleanupDashboard();
    };
  }, []);

  /**
   * 📊 LOAD PROGRESS DATA
   */
  const loadProgressData = async (forceRefresh = false) => {
    try {
      const startTime = performance.now();
      
      const response = await progressService.getTrainingProgress({
        timeRange,
        metricFocus,
        includeAdvanced: showAdvancedMetrics,
        forceRefresh
      });

      if (response.success) {
        setProgressData(response.data);
        setPerformanceMetrics(response.metrics);
        setInterventions(response.interventions || []);
        setInsights(response.insights || []);
        
        // 💾 Cache Data for Offline Use
        await OfflineManager.cacheData('training_progress', response);
        
        const loadTime = performance.now() - startTime;
        logger.debug('Progress data loaded', { 
          dataPoints: response.data?.length || 0,
          loadTime: loadTime.toFixed(2)
        });
      } else {
        throw new Error(response.error || 'Failed to load progress data');
      }
      
    } catch (error) {
      logger.error('Progress data loading failed', { error: error.message });
      throw error;
    }
  };

  /**
   * 💾 LOAD CACHED DATA
   */
  const loadCachedData = async () => {
    try {
      const cachedData = await OfflineManager.getCachedData('training_progress');
      
      if (cachedData) {
        setProgressData(cachedData.data);
        setPerformanceMetrics(cachedData.metrics);
        setInterventions(cachedData.interventions || []);
        setInsights(cachedData.insights || []);
        
        logger.info('Loaded cached progress data', {
          cachedAt: cachedData.timestamp,
          dataPoints: cachedData.data?.length || 0
        });
      }
      
    } catch (error) {
      logger.warn('Cached data loading failed', { error: error.message });
    }
  };

  /**
   * 📈 INITIALIZE ANALYTICS
   */
  const initializeAnalytics = async () => {
    try {
      if (!progressData) return;

      const analyticsResults = await analytics.analyzePerformance(progressData);
      
      setPerformanceMetrics(prev => ({
        ...prev,
        analytics: analyticsResults
      }));

      // 🔍 Generate Insights
      const generatedInsights = await generateInsights(analyticsResults);
      setInsights(generatedInsights);

      logger.debug('Analytics initialized', {
        metrics: Object.keys(analyticsResults).length,
        insights: generatedInsights.length
      });
      
    } catch (error) {
      logger.error('Analytics initialization failed', { error: error.message });
    }
  };

  /**
   * 🔍 GENERATE INSIGHTS
   */
  const generateInsights = async (analyticsData) => {
    const insights = [];

    try {
      // 🎯 Performance Trends
      if (analyticsData.trends) {
        const positiveTrends = analyticsData.trends.filter(t => t.direction === 'positive');
        const negativeTrends = analyticsData.trends.filter(t => t.direction === 'negative');

        if (positiveTrends.length > 0) {
          insights.push({
            type: 'positive',
            title: 'Performance Improvement',
            description: `${positiveTrends.length} metrics showing positive trends`,
            metrics: positiveTrends.map(t => t.metric),
            priority: 'high'
          });
        }

        if (negativeTrends.length > 0) {
          insights.push({
            type: 'warning',
            title: 'Attention Required',
            description: `${negativeTrends.length} metrics showing negative trends`,
            metrics: negativeTrends.map(t => t.metric),
            priority: 'critical',
            action: 'review_performance'
          });
        }
      }

      // 🎯 Achievement Milestones
      if (analyticsData.milestones) {
        const recentMilestones = analyticsData.milestones.filter(m => 
          new Date(m.achievedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        );

        if (recentMilestones.length > 0) {
          insights.push({
            type: 'achievement',
            title: 'Recent Milestones',
            description: `Achieved ${recentMilestones.length} milestones this week`,
            milestones: recentMilestones,
            priority: 'medium'
          });
        }
      }

      // 🎯 Intervention Opportunities
      if (analyticsData.interventionOpportunities) {
        insights.push({
          type: 'opportunity',
          title: 'Improvement Opportunities',
          description: `${analyticsData.interventionOpportunities.length} areas identified for improvement`,
          opportunities: analyticsData.interventionOpportunities,
          priority: 'medium',
          action: 'view_opportunities'
        });
      }

      logger.debug('Insights generated', { insightsCount: insights.length });
      
    } catch (error) {
      logger.error('Insights generation failed', { error: error.message });
    }

    return insights;
  };

  /**
   * 🔄 SETUP REAL-TIME UPDATES
   */
  const setupRealTimeUpdates = async () => {
    try {
      // 📡 Subscribe to Progress Updates
      await progressService.subscribeToUpdates((update) => {
        handleRealTimeUpdate(update);
      });

      // 🔔 Setup Notifications
      await NotificationManager.subscribeToProgressNotifications({
        onMilestoneAchieved: handleMilestoneNotification,
        onInterventionRequired: handleInterventionNotification,
        onPerformanceAlert: handlePerformanceAlert
      });

      logger.info('Real-time updates initialized');
      
    } catch (error) {
      logger.error('Real-time updates setup failed', { error: error.message });
    }
  };

  /**
   * 📡 HANDLE REAL-TIME UPDATE
   */
  const handleRealTimeUpdate = (update) => {
    try {
      logger.debug('Processing real-time update', { updateType: update.type });

      switch (update.type) {
        case 'progress_update':
          handleProgressUpdate(update.data);
          break;
        case 'metric_update':
          handleMetricUpdate(update.data);
          break;
        case 'intervention_update':
          handleInterventionUpdate(update.data);
          break;
        case 'insight_update':
          handleInsightUpdate(update.data);
          break;
      }

      // 🔄 Trigger UI Update Animation
      triggerUpdateAnimation();
      
    } catch (error) {
      logger.error('Real-time update processing failed', { error: error.message });
    }
  };

  /**
   * 📊 HANDLE PROGRESS UPDATE
   */
  const handleProgressUpdate = (progressData) => {
    setProgressData(prev => {
      const updated = Array.isArray(prev) ? [...prev] : [];
      updated.push(progressData);
      return updated.slice(-100); // Keep last 100 data points
    });
  };

  /**
   * 🔄 TRIGGER UPDATE ANIMATION
   */
  const triggerUpdateAnimation = () => {
    scaleAnim.value = withSpring(1.05, {
      damping: 10,
      stiffness: 100
    }, () => {
      scaleAnim.value = withSpring(1);
    });
  };

  /**
   * 🎯 START ENTRANCE ANIMATION
   */
  const startEntranceAnimation = () => {
    fadeAnim.value = withTiming(1, { duration: 500 });
    slideAnim.value = withSpring(0, {
      damping: 20,
      stiffness: 90
    });
  };

  /**
   * 🔄 HANDLE REFRESH
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      await loadProgressData(true);
      await initializeAnalytics();
      
      // 🎯 Show Refresh Success
      Alert.alert('Success', 'Progress data refreshed successfully');
      
    } catch (error) {
      logger.error('Refresh failed', { error: error.message });
      Alert.alert('Error', 'Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [timeRange, metricFocus, showAdvancedMetrics]);

  /**
   * 🎛️ HANDLE FILTER CHANGE
   */
  const handleFilterChange = useCallback((filterType, value) => {
    logger.debug('Filter changed', { filterType, value });

    switch (filterType) {
      case 'timeRange':
        setTimeRange(value);
        break;
      case 'metricFocus':
        setMetricFocus(value);
        break;
      case 'comparisonMode':
        setComparisonMode(value);
        break;
      case 'advancedMetrics':
        setShowAdvancedMetrics(value);
        break;
    }

    // 📊 Reload data with new filters
    loadProgressData(true);
  }, []);

  /**
   * 🎯 HANDLE INTERVENTION ACTION
   */
  const handleInterventionAction = useCallback(async (interventionId, action) => {
    try {
      logger.info('Intervention action triggered', { interventionId, action });

      const result = await progressService.processInterventionAction({
        interventionId,
        action,
        timestamp: new Date().toISOString()
      });

      if (result.success) {
        // 🔄 Update Interventions List
        setInterventions(prev => 
          prev.map(intervention => 
            intervention.id === interventionId 
              ? { ...intervention, status: 'processed', processedAt: new Date() }
              : intervention
          )
        );

        // 🔔 Show Success Message
        Alert.alert('Success', 'Intervention action processed successfully');
        
        // 📊 Refresh Data
        await loadProgressData(true);
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      logger.error('Intervention action failed', { error: error.message });
      Alert.alert('Error', 'Failed to process intervention action');
    }
  }, []);

  /**
   * 📊 RENDER PROGRESS CHART
   */
  const renderProgressChart = () => {
    if (!progressData || progressData.length === 0) {
      return (
        <View style={styles.emptyChartContainer}>
          <Text style={styles.emptyChartText}>No progress data available</Text>
        </View>
      );
    }

    const chartData = {
      labels: progressData.map((d, i) => 
        i % Math.ceil(progressData.length / 5) === 0 ? d.date : ''
      ),
      datasets: [{
        data: progressData.map(d => d.value),
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 3
      }]
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Training Progress Trend</Text>
        <LineChart
          data={chartData}
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withVerticalLines={false}
          withHorizontalLines={false}
          withInnerLines={false}
          withOuterLines={false}
          withShadow={true}
          withDots={true}
          withHorizontalLabels={true}
          withVerticalLabels={true}
        />
      </View>
    );
  };

  /**
   * 📊 RENDER PERFORMANCE METRICS
   */
  const renderPerformanceMetrics = () => {
    if (!performanceMetrics || Object.keys(performanceMetrics).length === 0) {
      return null;
    }

    return (
      <View style={styles.metricsContainer}>
        <Text style={styles.sectionTitle}>Performance Metrics</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.metricsScroll}
        >
          {Object.entries(performanceMetrics).map(([key, metric]) => (
            <MetricCard
              key={key}
              title={metric.title}
              value={metric.value}
              unit={metric.unit}
              trend={metric.trend}
              change={metric.change}
              icon={metric.icon}
              onPress={() => handleMetricPress(key)}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  /**
   * 🎯 RENDER INTERVENTIONS
   */
  const renderInterventions = () => {
    if (!interventions || interventions.length === 0) {
      return null;
    }

    return (
      <View style={styles.interventionsContainer}>
        <View style={styles.interventionsHeader}>
          <Text style={styles.sectionTitle}>Required Interventions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Interventions')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {interventions.slice(0, 3).map((intervention) => (
          <InterventionCard
            key={intervention.id}
            intervention={intervention}
            onAction={(action) => handleInterventionAction(intervention.id, action)}
          />
        ))}
      </View>
    );
  };

  /**
   * 💡 RENDER INSIGHTS
   */
  const renderInsights = () => {
    if (!insights || insights.length === 0) {
      return null;
    }

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.sectionTitle}>Performance Insights</Text>
        {insights.slice(0, 2).map((insight, index) => (
          <InsightCard
            key={index}
            insight={insight}
            onPress={() => handleInsightPress(insight)}
          />
        ))}
      </View>
    );
  };

  /**
   * 🎯 HANDLE METRIC PRESS
   */
  const handleMetricPress = (metricKey) => {
    logger.debug('Metric pressed', { metricKey });
    navigation.navigate('MetricDetails', {
      metricKey,
      timeRange,
      comparisonMode
    });
  };

  /**
   * 💡 HANDLE INSIGHT PRESS
   */
  const handleInsightPress = (insight) => {
    logger.debug('Insight pressed', { insightType: insight.type });
    
    if (insight.action) {
      switch (insight.action) {
        case 'review_performance':
          navigation.navigate('PerformanceReview', { focus: insight.metrics });
          break;
        case 'view_opportunities':
          navigation.navigate('ImprovementOpportunities');
          break;
        default:
          Alert.alert('Insight', insight.description);
      }
    } else {
      Alert.alert(insight.title, insight.description);
    }
  };

  /**
   * 🧹 CLEANUP DASHBOARD
   */
  const cleanupDashboard = () => {
    try {
      progressService.unsubscribeFromUpdates();
      NotificationManager.unsubscribeAll();
      logger.info('Dashboard cleanup completed');
    } catch (error) {
      logger.error('Dashboard cleanup failed', { error: error.message });
    }
  };

  /**
   * 📱 RENDER OFFLINE INDICATOR
   */
  const renderOfflineIndicator = () => {
    if (!offline) return null;

    return (
      <View style={styles.offlineContainer}>
        <Text style={styles.offlineText}>⚠️ Offline Mode - Showing Cached Data</Text>
      </View>
    );
  };

  /**
   * 🔄 RENDER LOADING STATE
   */
  if (loading) {
    return <LoadingOverlay message="Loading Training Progress..." />;
  }

  /**
   * 🚨 RENDER ERROR STATE
   */
  if (error) {
    return (
      <ErrorBoundary
        error={error}
        onRetry={() => {
          setError(null);
          setLoading(true);
          loadProgressData(true);
        }}
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#3B82F6']}
              tintColor="#3B82F6"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* 🏆 HEADER */}
          <Animated.View style={[styles.header, animatedHeaderStyle]}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Training Progress Dashboard</Text>
              <Text style={styles.headerSubtitle}>
                Real-time performance tracking and insights
              </Text>
            </View>
            <View style={styles.headerActions}>
              <FilterPanel
                timeRange={timeRange}
                metricFocus={metricFocus}
                comparisonMode={comparisonMode}
                advancedMetrics={showAdvancedMetrics}
                onChange={handleFilterChange}
              />
            </View>
          </Animated.View>

          {renderOfflineIndicator()}

          {/* 📊 PROGRESS CHART */}
          <Animated.View style={[styles.section, animatedSectionStyle]}>
            {renderProgressChart()}
          </Animated.View>

          {/* ⭐ PERFORMANCE INDICATOR */}
          <Animated.View style={[styles.section, animatedSectionStyle]}>
            <PerformanceIndicator
              metrics={performanceMetrics}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </Animated.View>

          {/* 📈 PERFORMANCE METRICS */}
          <Animated.View style={[styles.section, animatedSectionStyle]}>
            {renderPerformanceMetrics()}
          </Animated.View>

          {/* 🎯 INTERVENTIONS */}
          <Animated.View style={[styles.section, animatedSectionStyle]}>
            {renderInterventions()}
          </Animated.View>

          {/* 💡 INSIGHTS */}
          <Animated.View style={[styles.section, animatedSectionStyle]}>
            {renderInsights()}
          </Animated.View>

          {/* 🚀 ACTION BUTTONS */}
          <Animated.View style={[styles.actionButtons, animatedSectionStyle]}>
            <ActionButton
              title="Detailed Analysis"
              icon="📊"
              onPress={() => navigation.navigate('DetailedAnalysis')}
              variant="primary"
            />
            <ActionButton
              title="Export Report"
              icon="📤"
              onPress={() => handleExportReport()}
              variant="secondary"
            />
            <ActionButton
              title="Schedule Review"
              icon="📅"
              onPress={() => navigation.navigate('ScheduleReview')}
              variant="tertiary"
            />
          </Animated.View>

          {/* 📊 REAL-TIME UPDATE INDICATOR */}
          {refreshing && (
            <View style={styles.updateIndicator}>
              <Text style={styles.updateText}>🔄 Updating data...</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* 🎯 FLOATING ACTION BUTTON */}
      <Animated.View style={[styles.fabContainer, animatedFabStyle]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleRefresh}
          activeOpacity={0.8}
        >
          <Text style={styles.fabIcon}>🔄</Text>
        </TouchableOpacity>
      </Animated.View>
    </GestureHandlerRootView>
  );
};

// 🎨 STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerContent: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  chartContainer: {
    marginBottom: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
  },
  emptyChartContainer: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  emptyChartText: {
    fontSize: 14,
    color: '#64748B',
  },
  metricsContainer: {
    marginBottom: 8,
  },
  metricsScroll: {
    marginHorizontal: -8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  interventionsContainer: {
    marginBottom: 8,
  },
  interventionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  insightsContainer: {
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  updateIndicator: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
  },
  updateText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  offlineContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  offlineText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

// 📊 CHART CONFIGURATION
const chartConfig = {
  backgroundColor: '#FFFFFF',
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#3B82F6',
  },
  propsForBackgroundLines: {
    strokeDasharray: '',
    stroke: '#E2E8F0',
    strokeWidth: 1,
  },
};

// 🎭 ANIMATED STYLES
const animatedHeaderStyle = useAnimatedStyle(() => ({
  opacity: fadeAnim.value,
  transform: [
    {
      translateY: slideAnim.value * 0.5,
    },
  ],
}));

const animatedSectionStyle = useAnimatedStyle(() => ({
  opacity: fadeAnim.value,
  transform: [
    {
      translateY: slideAnim.value,
    },
    {
      scale: scaleAnim.value,
    },
  ],
}));

const animatedFabStyle = useAnimatedStyle(() => ({
  opacity: fadeAnim.value,
  transform: [
    {
      scale: withSpring(fadeAnim.value, {
        damping: 15,
        stiffness: 100,
      }),
    },
  ],
}));

export default TrainingProgressDashboard;