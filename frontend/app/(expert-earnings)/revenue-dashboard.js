/**
 * 🏢 MOSA FORGE - Enterprise Expert Revenue Dashboard
 * 💰 Real-time Earnings Analytics & Performance Insights
 * 📊 Multi-Dimensional Revenue Visualization & Forecasting
 * 🎯 Tier-Based Bonus Tracking & Quality Incentive Management
 * 🚀 Production-Ready Enterprise Dashboard
 * 
 * @module RevenueDashboard
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import {
  Card,
  Title,
  Subheading,
  Text,
  Button,
  ProgressBar,
  Chip,
  Divider,
  ActivityIndicator,
  List,
  IconButton,
  Menu,
  Portal,
  Dialog,
  TextInput
} from 'react-native-paper';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { BlurView } from '@react-native-community/blur';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';

// 🏗️ Enterprise Dependencies
import EnterpriseLogger from '../../utils/enterprise-logger';
import RevenueService from '../../services/revenue-service';
import NotificationService from '../../services/notification-service';
import AnalyticsTracker from '../../utils/analytics-tracker';

// 📊 Custom Components
import PerformanceCard from '../../components/expert/PerformanceCard';
import RevenueMetricCard from '../../components/expert/RevenueMetricCard';
import TierProgressCard from '../../components/expert/TierProgressCard';
import QualityInsightsCard from '../../components/expert/QualityInsightsCard';
import PayoutScheduleCard from '../../components/expert/PayoutScheduleCard';
import ForecastCard from '../../components/expert/ForecastCard';

// 🎨 Design System
import {
  Colors,
  Typography,
  Spacing,
  Shadows,
  Gradients,
  Icons
} from '../../design-system';

// 🔧 Utilities
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters';
import { validateNetwork, cacheResponse } from '../../utils/network-utils';

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - Spacing.xl * 2;
const CHART_HEIGHT = 220;

const RevenueDashboard = ({ navigation, route }) => {
  // 🔧 Initialization
  const dispatch = useDispatch();
  const logger = useMemo(() => new EnterpriseLogger({
    service: 'revenue-dashboard',
    module: 'frontend',
    environment: __DEV__ ? 'development' : 'production'
  }), []);

  // 🔐 Authentication & State
  const { expertId, accessToken } = useSelector(state => state.auth);
  const { currentTier, qualityScore } = useSelector(state => state.expert);
  const { isConnected, isReconnecting } = useSelector(state => state.network);

  // 🎯 State Management
  const [state, setState] = useState({
    // 📊 Dashboard State
    isLoading: true,
    isRefreshing: false,
    lastUpdated: null,
    
    // 💰 Revenue Data
    revenueData: null,
    revenueMetrics: null,
    revenueForecast: null,
    
    // 📈 Performance Data
    performanceData: null,
    qualityMetrics: null,
    tierProgress: null,
    
    // 💸 Payout Data
    payoutData: null,
    upcomingPayouts: [],
    pendingPayouts: [],
    
    // 🎛️ UI State
    selectedPeriod: 'monthly',
    selectedMetric: 'total_earnings',
    showFilters: false,
    showExportMenu: false,
    showDetailsModal: false,
    
    // 🚨 Error State
    error: null,
    hasData: false,
    
    // 📱 Interaction State
    isScrolling: false,
    scrollPosition: 0,
    visibleSection: 'overview'
  });

  // 🔗 Service Instances
  const [services] = useState({
    revenue: new RevenueService({ baseURL: process.env.API_BASE_URL }),
    notifications: new NotificationService(),
    analytics: new AnalyticsTracker({ userId: expertId })
  });

  // 🎛️ Period Options
  const PERIOD_OPTIONS = useMemo(() => [
    { id: 'weekly', label: 'Weekly', days: 7 },
    { id: 'monthly', label: 'Monthly', days: 30 },
    { id: 'quarterly', label: 'Quarterly', days: 90 },
    { id: 'yearly', label: 'Yearly', days: 365 },
    { id: 'custom', label: 'Custom', days: null }
  ], []);

  // 📊 Chart Configuration
  const CHART_CONFIG = useMemo(() => ({
    // 📈 Line Chart Config
    line: {
      backgroundColor: Colors.background.primary,
      backgroundGradientFrom: Colors.background.primary,
      backgroundGradientTo: Colors.background.secondary,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
      style: {
        borderRadius: 16,
        padding: Spacing.md
      },
      propsForDots: {
        r: "6",
        strokeWidth: "2",
        stroke: Colors.brand.primary
      }
    },
    
    // 📊 Bar Chart Config
    bar: {
      backgroundColor: Colors.background.primary,
      backgroundGradientFrom: Colors.background.primary,
      backgroundGradientTo: Colors.background.secondary,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
      style: {
        borderRadius: 16,
        padding: Spacing.md
      },
      barPercentage: 0.7
    },
    
    // 🥧 Pie Chart Config
    pie: {
      backgroundColor: Colors.background.primary,
      paddingLeft: 15,
      color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`
    }
  }), []);

  // 🎯 Effects & Lifecycle
  useFocusEffect(
    useCallback(() => {
      // 📊 Load initial data
      loadDashboardData();
      
      // 📈 Track dashboard view
      services.analytics.trackEvent('revenue_dashboard_viewed', {
        expertId,
        currentTier,
        qualityScore
      });
      
      // 🔔 Setup real-time updates
      setupRealtimeUpdates();
      
      return () => {
        // 🧹 Cleanup
        cleanupRealtimeUpdates();
      };
    }, [expertId, currentTier, state.selectedPeriod])
  );

  useEffect(() => {
    // 🌐 Network state listener
    const handleNetworkChange = () => {
      if (isConnected && !state.hasData) {
        loadDashboardData();
      }
    };

    handleNetworkChange();
  }, [isConnected]);

  // 🔧 Core Functions
  const loadDashboardData = async (forceRefresh = false) => {
    try {
      // 🛡️ Validation
      if (!validateNetwork(isConnected, isReconnecting)) {
        throw new Error('Network unavailable');
      }

      if (!expertId || !accessToken) {
        throw new Error('Authentication required');
      }

      // 🎯 Update loading state
      setState(prev => ({
        ...prev,
        isLoading: !forceRefresh,
        isRefreshing: forceRefresh,
        error: null
      }));

      // 🔄 Load all dashboard data in parallel
      await Promise.all([
        loadRevenueData(forceRefresh),
        loadPerformanceData(forceRefresh),
        loadPayoutData(forceRefresh),
        loadForecastData(forceRefresh)
      ]);

      // 🎉 Update state
      setState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        lastUpdated: new Date().toISOString(),
        hasData: true
      }));

      // 📊 Track successful load
      services.analytics.trackEvent('revenue_dashboard_loaded', {
        expertId,
        period: state.selectedPeriod,
        loadTime: Date.now()
      });

    } catch (error) {
      logger.error('Dashboard data loading failed', {
        error: error.message,
        expertId,
        forceRefresh
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: error.message,
        hasData: false
      }));

      // 🚨 Show error to user
      Alert.alert(
        'Load Error',
        'Failed to load dashboard data. Please check your connection and try again.',
        [
          { text: 'Retry', onPress: () => loadDashboardData(true) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  };

  const loadRevenueData = async (forceRefresh = false) => {
    try {
      const cacheKey = `revenue_data_${expertId}_${state.selectedPeriod}`;
      
      // 💾 Check cache first
      if (!forceRefresh) {
        const cached = await cacheResponse.get(cacheKey);
        if (cached) {
          setState(prev => ({
            ...prev,
            revenueData: cached.data,
            revenueMetrics: cached.metrics
          }));
          return;
        }
      }

      // 🔗 Fetch fresh data
      const response = await services.revenue.getExpertRevenue({
        expertId,
        period: state.selectedPeriod,
        includeBreakdown: true,
        includeComparisons: true
      });

      if (response.success) {
        const revenueData = response.data;
        
        // 📊 Calculate metrics
        const revenueMetrics = calculateRevenueMetrics(revenueData);
        
        // 💾 Cache response
        await cacheResponse.set(cacheKey, { data: revenueData, metrics: revenueMetrics }, 300); // 5 minutes
        
        setState(prev => ({
          ...prev,
          revenueData,
          revenueMetrics
        }));

      } else {
        throw new Error(response.error || 'Failed to load revenue data');
      }

    } catch (error) {
      logger.error('Revenue data loading failed', {
        error: error.message,
        expertId,
        period: state.selectedPeriod
      });
      throw error;
    }
  };

  const loadPerformanceData = async (forceRefresh = false) => {
    try {
      const cacheKey = `performance_data_${expertId}_${state.selectedPeriod}`;
      
      if (!forceRefresh) {
        const cached = await cacheResponse.get(cacheKey);
        if (cached) {
          setState(prev => ({
            ...prev,
            performanceData: cached.performance,
            qualityMetrics: cached.quality,
            tierProgress: cached.tier
          }));
          return;
        }
      }

      const response = await services.revenue.getExpertPerformance({
        expertId,
        period: state.selectedPeriod,
        includeQualityMetrics: true,
        includeTierProgress: true
      });

      if (response.success) {
        const { performance, quality, tier } = response.data;
        
        await cacheResponse.set(cacheKey, { performance, quality, tier }, 300);
        
        setState(prev => ({
          ...prev,
          performanceData: performance,
          qualityMetrics: quality,
          tierProgress: tier
        }));

      } else {
        throw new Error(response.error || 'Failed to load performance data');
      }

    } catch (error) {
      logger.error('Performance data loading failed', {
        error: error.message,
        expertId,
        period: state.selectedPeriod
      });
      throw error;
    }
  };

  const loadPayoutData = async (forceRefresh = false) => {
    try {
      const cacheKey = `payout_data_${expertId}`;
      
      if (!forceRefresh) {
        const cached = await cacheResponse.get(cacheKey);
        if (cached) {
          setState(prev => ({
            ...prev,
            payoutData: cached.payouts,
            upcomingPayouts: cached.upcoming,
            pendingPayouts: cached.pending
          }));
          return;
        }
      }

      const response = await services.revenue.getExpertPayouts({
        expertId,
        includeUpcoming: true,
        includePending: true,
        limit: 10
      });

      if (response.success) {
        const { payouts, upcoming, pending } = response.data;
        
        await cacheResponse.set(cacheKey, { payouts, upcoming, pending }, 180); // 3 minutes
        
        setState(prev => ({
          ...prev,
          payoutData: payouts,
          upcomingPayouts: upcoming,
          pendingPayouts: pending
        }));

      } else {
        throw new Error(response.error || 'Failed to load payout data');
      }

    } catch (error) {
      logger.error('Payout data loading failed', {
        error: error.message,
        expertId
      });
      throw error;
    }
  };

  const loadForecastData = async (forceRefresh = false) => {
    try {
      const cacheKey = `forecast_data_${expertId}_${state.selectedPeriod}`;
      
      if (!forceRefresh) {
        const cached = await cacheResponse.get(cacheKey);
        if (cached) {
          setState(prev => ({
            ...prev,
            revenueForecast: cached
          }));
          return;
        }
      }

      const response = await services.revenue.getRevenueForecast({
        expertId,
        period: state.selectedPeriod,
        forecastDays: 30,
        includeConfidence: true
      });

      if (response.success) {
        await cacheResponse.set(cacheKey, response.data, 600); // 10 minutes
        
        setState(prev => ({
          ...prev,
          revenueForecast: response.data
        }));

      } else {
        throw new Error(response.error || 'Failed to load forecast data');
      }

    } catch (error) {
      logger.error('Forecast data loading failed', {
        error: error.message,
        expertId,
        period: state.selectedPeriod
      });
      throw error;
    }
  };

  // 📊 Utility Functions
  const calculateRevenueMetrics = (revenueData) => {
    if (!revenueData) return null;

    const {
      totalEarnings,
      baseEarnings,
      bonusEarnings,
      qualityBonuses,
      tierBonuses,
      previousPeriodEarnings,
      growthRate
    } = revenueData;

    return {
      totalEarnings,
      baseEarnings,
      bonusEarnings,
      qualityBonuses,
      tierBonuses,
      previousPeriodEarnings,
      growthRate,
      
      // 📈 Derived metrics
      bonusPercentage: totalEarnings > 0 ? (bonusEarnings / totalEarnings) * 100 : 0,
      qualityBonusPercentage: totalEarnings > 0 ? (qualityBonuses / totalEarnings) * 100 : 0,
      tierBonusPercentage: totalEarnings > 0 ? (tierBonuses / totalEarnings) * 100 : 0,
      
      // 💰 Daily/Weekly averages
      dailyAverage: totalEarnings / PERIOD_OPTIONS.find(p => p.id === state.selectedPeriod)?.days || 0,
      weeklyAverage: totalEarnings * 7 / (PERIOD_OPTIONS.find(p => p.id === state.selectedPeriod)?.days || 30)
    };
  };

  const setupRealtimeUpdates = () => {
    // 🔄 Setup WebSocket or polling for real-time updates
    // This is a placeholder - implement based on your real-time infrastructure
    const updateInterval = setInterval(() => {
      if (state.visibleSection === 'overview' && isConnected) {
        loadDashboardData(true);
      }
    }, 300000); // 5 minutes

    return () => clearInterval(updateInterval);
  };

  const cleanupRealtimeUpdates = () => {
    // 🧹 Cleanup real-time connections
  };

  // 🎛️ UI Handlers
  const handlePeriodChange = (periodId) => {
    services.analytics.trackEvent('dashboard_period_changed', {
      from: state.selectedPeriod,
      to: periodId,
      expertId
    });

    setState(prev => ({
      ...prev,
      selectedPeriod: periodId,
      isLoading: true
    }));

    // 🔄 Reload data with new period
    setTimeout(() => loadDashboardData(true), 100);
  };

  const handleMetricSelect = (metricId) => {
    setState(prev => ({
      ...prev,
      selectedMetric: metricId
    }));
  };

  const handleRefresh = () => {
    services.analytics.trackEvent('dashboard_refreshed', {
      expertId,
      currentSection: state.visibleSection
    });

    loadDashboardData(true);
  };

  const handleExportData = (format) => {
    services.analytics.trackEvent('dashboard_data_exported', {
      format,
      expertId,
      period: state.selectedPeriod
    });

    // 📤 Implement export functionality
    Alert.alert(
      'Export Data',
      `Export dashboard data as ${format.toUpperCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Export', 
          onPress: () => exportDashboardData(format)
        }
      ]
    );
  };

  const exportDashboardData = async (format) => {
    try {
      // 📊 Prepare data for export
      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          expertId,
          period: state.selectedPeriod,
          format
        },
        revenueData: state.revenueData,
        performanceData: state.performanceData,
        payoutData: state.payoutData,
        forecastData: state.revenueForecast
      };

      // 📤 Implement actual export logic
      // This would typically call a backend service to generate and return the file
      Alert.alert(
        'Export Started',
        `Your data is being exported as ${format.toUpperCase()}. You will receive a notification when it's ready.`
      );

    } catch (error) {
      logger.error('Data export failed', {
        error: error.message,
        expertId,
        format
      });

      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
    }
  };

  const handleScroll = (event) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const section = scrollY > 400 ? 'details' : 'overview';
    
    if (section !== state.visibleSection) {
      setState(prev => ({ ...prev, visibleSection: section }));
    }
  };

  // 🎨 Render Functions
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Title style={styles.headerTitle}>Revenue Dashboard</Title>
        <Subheading style={styles.headerSubtitle}>
          Track your earnings and performance
        </Subheading>
      </View>
      
      <View style={styles.headerActions}>
        <Menu
          visible={state.showFilters}
          onDismiss={() => setState(prev => ({ ...prev, showFilters: false }))}
          anchor={
            <IconButton
              icon="filter-variant"
              size={24}
              onPress={() => setState(prev => ({ ...prev, showFilters: true }))}
            />
          }
        >
          <Menu.Item 
            title="Weekly" 
            onPress={() => handlePeriodChange('weekly')}
            leadingIcon={state.selectedPeriod === 'weekly' ? 'check' : undefined}
          />
          <Menu.Item 
            title="Monthly" 
            onPress={() => handlePeriodChange('monthly')}
            leadingIcon={state.selectedPeriod === 'monthly' ? 'check' : undefined}
          />
          <Menu.Item 
            title="Quarterly" 
            onPress={() => handlePeriodChange('quarterly')}
            leadingIcon={state.selectedPeriod === 'quarterly' ? 'check' : undefined}
          />
          <Menu.Item 
            title="Yearly" 
            onPress={() => handlePeriodChange('yearly')}
            leadingIcon={state.selectedPeriod === 'yearly' ? 'check' : undefined}
          />
        </Menu>

        <IconButton
          icon="refresh"
          size={24}
          onPress={handleRefresh}
          loading={state.isRefreshing}
        />
      </View>
    </View>
  );

  const renderPeriodChips = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.periodChipsContainer}
    >
      {PERIOD_OPTIONS.map((period) => (
        <Chip
          key={period.id}
          selected={state.selectedPeriod === period.id}
          onPress={() => handlePeriodChange(period.id)}
          style={styles.periodChip}
          selectedColor={Colors.brand.primary}
          mode="outlined"
        >
          {period.label}
        </Chip>
      ))}
    </ScrollView>
  );

  const renderRevenueOverview = () => {
    if (!state.revenueMetrics) return null;

    return (
      <Card style={styles.revenueOverviewCard}>
        <Card.Content>
          <View style={styles.revenueHeader}>
            <Title style={styles.revenueTitle}>Total Earnings</Title>
            <Chip 
              icon={state.revenueMetrics.growthRate >= 0 ? "trending-up" : "trending-down"}
              mode="outlined"
              style={[
                styles.growthChip,
                { backgroundColor: state.revenueMetrics.growthRate >= 0 ? 
                  Colors.success.light : Colors.error.light }
              ]}
              textStyle={{
                color: state.revenueMetrics.growthRate >= 0 ? 
                  Colors.success.dark : Colors.error.dark
              }}
            >
              {formatPercentage(state.revenueMetrics.growthRate)}
            </Chip>
          </View>
          
          <Text style={styles.revenueAmount}>
            {formatCurrency(state.revenueMetrics.totalEarnings)}
          </Text>
          
          <View style={styles.revenueBreakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Base Earnings</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(state.revenueMetrics.baseEarnings)}
              </Text>
            </View>
            
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Bonuses</Text>
              <Text style={[styles.breakdownValue, styles.bonusValue]}>
                {formatCurrency(state.revenueMetrics.bonusEarnings)}
                <Text style={styles.percentageText}>
                  {' '}({formatPercentage(state.revenueMetrics.bonusPercentage)})
                </Text>
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderRevenueChart = () => {
    if (!state.revenueData?.trends) return null;

    const chartData = {
      labels: state.revenueData.trends.map(t => 
        dayjs(t.date).format(state.selectedPeriod === 'weekly' ? 'ddd' : 'MMM D')
      ),
      datasets: [{
        data: state.revenueData.trends.map(t => t.earnings),
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 2
      }]
    };

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title style={styles.chartTitle}>Earnings Trend</Title>
          <LineChart
            data={chartData}
            width={CHART_WIDTH}
            height={CHART_HEIGHT}
            chartConfig={CHART_CONFIG.line}
            bezier
            style={styles.chart}
            yAxisLabel="ETB "
            yAxisSuffix=""
            fromZero
            withInnerLines={false}
            withOuterLines={true}
            withVerticalLines={false}
            withHorizontalLines={true}
            segments={5}
          />
        </Card.Content>
      </Card>
    );
  };

  const renderPerformanceCards = () => {
    if (!state.performanceData) return null;

    return (
      <View style={styles.performanceContainer}>
        <PerformanceCard 
          data={state.performanceData}
          period={state.selectedPeriod}
        />
        
        <QualityInsightsCard 
          metrics={state.qualityMetrics}
          currentScore={qualityScore}
        />
        
        <TierProgressCard 
          progress={state.tierProgress}
          currentTier={currentTier}
        />
      </View>
    );
  };

  const renderPayoutSchedule = () => {
    if (!state.upcomingPayouts?.length) return null;

    return (
      <PayoutScheduleCard 
        payouts={state.upcomingPayouts}
        pendingPayouts={state.pendingPayouts}
        onPayoutPress={(payoutId) => 
          navigation.navigate('PayoutDetails', { payoutId })
        }
      />
    );
  };

  const renderRevenueForecast = () => {
    if (!state.revenueForecast) return null;

    return (
      <ForecastCard 
        forecast={state.revenueForecast}
        period={state.selectedPeriod}
      />
    );
  };

  const renderMetricGrid = () => {
    if (!state.revenueMetrics) return null;

    const metrics = [
      {
        id: 'daily_average',
        label: 'Daily Average',
        value: formatCurrency(state.revenueMetrics.dailyAverage),
        icon: 'calendar-today',
        color: Colors.brand.primary
      },
      {
        id: 'quality_bonus',
        label: 'Quality Bonus',
        value: formatCurrency(state.revenueMetrics.qualityBonuses),
        icon: 'quality-high',
        color: Colors.success.dark
      },
      {
        id: 'tier_bonus',
        label: 'Tier Bonus',
        value: formatCurrency(state.revenueMetrics.tierBonuses),
        icon: 'trophy',
        color: Colors.warning.dark
      },
      {
        id: 'growth_rate',
        label: 'Growth Rate',
        value: formatPercentage(state.revenueMetrics.growthRate),
        icon: state.revenueMetrics.growthRate >= 0 ? 'trending-up' : 'trending-down',
        color: state.revenueMetrics.growthRate >= 0 ? 
          Colors.success.dark : Colors.error.dark
      }
    ];

    return (
      <View style={styles.metricGrid}>
        {metrics.map((metric) => (
          <RevenueMetricCard
            key={metric.id}
            metric={metric}
            isSelected={state.selectedMetric === metric.id}
            onPress={() => handleMetricSelect(metric.id)}
          />
        ))}
      </View>
    );
  };

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator 
        size="large" 
        color={Colors.brand.primary}
        style={styles.loadingIndicator}
      />
      <Text style={styles.loadingText}>Loading revenue data...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Icons.WifiOff size={64} color={Colors.error.main} />
      <Title style={styles.errorTitle}>Connection Error</Title>
      <Text style={styles.errorText}>
        {state.error || 'Unable to load dashboard data'}
      </Text>
      <Button 
        mode="contained" 
        onPress={() => loadDashboardData(true)}
        style={styles.retryButton}
      >
        Retry
      </Button>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icons.TrendingUp size={64} color={Colors.text.secondary} />
      <Title style={styles.emptyTitle}>No Revenue Data</Title>
      <Text style={styles.emptyText}>
        Start teaching students to see your earnings here
      </Text>
      <Button 
        mode="outlined" 
        onPress={() => navigation.navigate('StudentManagement')}
        style={styles.emptyButton}
      >
        View Students
      </Button>
    </View>
  );

  // 🎨 Main Render
  if (state.isLoading && !state.hasData) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderLoadingState()}
      </SafeAreaView>
    );
  }

  if (state.error && !state.hasData) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderErrorState()}
      </SafeAreaView>
    );
  }

  if (!state.hasData) {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderEmptyState()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={state.isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.brand.primary]}
            tintColor={Colors.brand.primary}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Period Selection */}
        {renderPeriodChips()}
        
        {/* Revenue Overview */}
        {renderRevenueOverview()}
        
        {/* Metric Grid */}
        {renderMetricGrid()}
        
        {/* Revenue Chart */}
        {renderRevenueChart()}
        
        {/* Performance Cards */}
        {renderPerformanceCards()}
        
        {/* Payout Schedule */}
        {renderPayoutSchedule()}
        
        {/* Revenue Forecast */}
        {renderRevenueForecast()}
        
        {/* Last Updated */}
        <View style={styles.lastUpdatedContainer}>
          <Text style={styles.lastUpdatedText}>
            Last updated: {dayjs(state.lastUpdated).fromNow()}
          </Text>
        </View>
      </ScrollView>
      
      {/* Export FAB */}
      <Portal>
        <Menu
          visible={state.showExportMenu}
          onDismiss={() => setState(prev => ({ ...prev, showExportMenu: false }))}
          anchor={
            <Button
              mode="contained"
              style={styles.exportFAB}
              onPress={() => setState(prev => ({ ...prev, showExportMenu: true }))}
              icon="download"
            >
              Export
            </Button>
          }
        >
          <Menu.Item 
            title="Export as PDF" 
            onPress={() => handleExportData('pdf')}
            leadingIcon="file-pdf-box"
          />
          <Menu.Item 
            title="Export as Excel" 
            onPress={() => handleExportData('excel')}
            leadingIcon="microsoft-excel"
          />
          <Menu.Item 
            title="Export as CSV" 
            onPress={() => handleExportData('csv')}
            leadingIcon="file-delimited"
          />
        </Menu>
      </Portal>
    </SafeAreaView>
  );
};

// 🎨 Styles
const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    ...Shadows.small,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...Typography.body2,
    color: Colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodChipsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  periodChip: {
    marginRight: Spacing.sm,
    backgroundColor: Colors.background.secondary,
  },
  revenueOverviewCard: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    ...Shadows.medium,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  revenueTitle: {
    ...Typography.h6,
    color: Colors.text.primary,
  },
  growthChip: {
    height: 24,
  },
  revenueAmount: {
    ...Typography.h2,
    color: Colors.brand.primary,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  revenueBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    flex: 1,
  },
  breakdownLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  breakdownValue: {
    ...Typography.body1,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  bonusValue: {
    color: Colors.success.dark,
  },
  percentageText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  chartCard: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    ...Shadows.medium,
  },
  chartTitle: {
    ...Typography.h6,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  chart: {
    marginVertical: Spacing.sm,
    borderRadius: 16,
  },
  performanceContainer: {
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingIndicator: {
    marginBottom: Spacing.lg,
  },
  loadingText: {
    ...Typography.body1,
    color: Colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    ...Typography.h5,
    color: Colors.error.main,
    marginVertical: Spacing.md,
  },
  errorText: {
    ...Typography.body1,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.brand.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    ...Typography.h5,
    color: Colors.text.secondary,
    marginVertical: Spacing.md,
  },
  emptyText: {
    ...Typography.body1,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    borderColor: Colors.brand.primary,
  },
  lastUpdatedContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  lastUpdatedText: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  exportFAB: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    backgroundColor: Colors.brand.primary,
    borderRadius: 24,
    ...Shadows.large,
  },
};

export default RevenueDashboard;