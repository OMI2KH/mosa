/**
 * 🏢 MOSA FORGE - Enterprise Income Tracking Dashboard
 * 💰 Real-time Earnings Monitoring & Financial Analytics
 * 📊 Multi-Source Income Aggregation & Performance Insights
 * 🎯 Goal Setting & Financial Planning Tools
 * 🚀 Enterprise-Grade React Native Frontend
 * 
 * @module IncomeTracking
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Alert,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🏗️ Enterprise Dependencies
import EnterpriseLogger from '../../utils/enterprise-logger';
import IncomeService from '../../services/income-service';
import AuthService from '../../services/auth-service';
import NotificationService from '../../services/notification-service';
import AnalyticsService from '../../services/analytics-service';

// 🎯 Custom Components
import IncomeCard from '../../components/income/IncomeCard';
import PerformanceChart from '../../components/charts/PerformanceChart';
import IncomeBreakdown from '../../components/income/IncomeBreakdown';
import GoalTracker from '../../components/goals/GoalTracker';
import QuickActions from '../../components/actions/QuickActions';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import ErrorBoundary from '../../components/common/ErrorBoundary';

// 🎨 Design System
import { 
  colors, 
  spacing, 
  typography, 
  shadows, 
  gradients,
  animations 
} from '../../design-system/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const IncomeTracking = ({ navigation, route }) => {
  // 🏗️ State Management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [incomeData, setIncomeData] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [goals, setGoals] = useState([]);
  const [quickActions, setQuickActions] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [stats, setStats] = useState({
    totalEarnings: 0,
    projectedEarnings: 0,
    averageDaily: 0,
    growthRate: 0,
    activeIncomeSources: 0
  });

  // 🎯 Animation States
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  // 🏗️ Service Instances
  const logger = useMemo(() => new EnterpriseLogger({
    service: 'income-tracking',
    module: 'frontend',
    environment: process.env.NODE_ENV
  }), []);

  const incomeService = useMemo(() => new IncomeService({
    baseURL: process.env.API_BASE_URL,
    cacheEnabled: true,
    realTimeUpdates: true
  }), []);

  const authService = useMemo(() => new AuthService(), []);
  const notificationService = useMemo(() => new NotificationService(), []);
  const analyticsService = useMemo(() => new AnalyticsService(), []);

  // 🔄 Lifecycle Methods
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        await performHealthCheck();
        await loadIncomeData();
        await loadGoals();
        await loadQuickActions();
        
        // 🎯 Start real-time updates
        startRealTimeUpdates();
        
        // 📊 Track analytics
        await analyticsService.trackPageView('income_tracking_dashboard');
        
        // 🎨 Trigger entrance animations
        triggerEntranceAnimations();
        
      } catch (error) {
        handleInitializationError(error);
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();

    // 🧹 Cleanup
    return () => {
      stopRealTimeUpdates();
    };
  }, []);

  // 🏥 Health Check
  const performHealthCheck = async () => {
    try {
      const healthStatus = await incomeService.healthCheck();
      
      if (!healthStatus.healthy) {
        throw new Error('Income service is temporarily unavailable');
      }
      
      logger.debug('Health check passed', {
        service: 'income-tracking',
        status: 'healthy'
      });
      
    } catch (error) {
      logger.error('Health check failed', {
        error: error.message,
        service: 'income-tracking'
      });
      
      throw error;
    }
  };

  // 💰 Load Income Data
  const loadIncomeData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // 🔍 Fetch comprehensive income data
      const [incomeSummary, performanceTrends, breakdown] = await Promise.all([
        incomeService.getIncomeSummary(selectedPeriod),
        incomeService.getPerformanceTrends(selectedPeriod),
        incomeService.getIncomeBreakdown(selectedPeriod)
      ]);

      // 📊 Process and update state
      const processedData = processIncomeData(incomeSummary, performanceTrends, breakdown);
      
      setIncomeData(processedData);
      setPerformanceData(performanceTrends);
      setStats(calculateStats(processedData, performanceTrends));

      // 💾 Cache data for offline access
      await cacheIncomeData(processedData);

      logger.debug('Income data loaded successfully', {
        period: selectedPeriod,
        dataPoints: performanceTrends.length
      });

    } catch (error) {
      handleDataLoadError(error);
      
      // 🔄 Attempt to load cached data
      const cachedData = await loadCachedData();
      if (cachedData) {
        setIncomeData(cachedData);
        logger.info('Loaded cached income data');
      }
      
    } finally {
      if (forceRefresh) {
        setRefreshing(false);
      }
    }
  };

  // 🎯 Process Income Data
  const processIncomeData = (summary, trends, breakdown) => {
    return {
      summary: {
        totalEarnings: summary.totalEarnings || 0,
        netEarnings: summary.netEarnings || 0,
        pendingPayouts: summary.pendingPayouts || 0,
        taxesWithheld: summary.taxesWithheld || 0,
        bonusesEarned: summary.bonusesEarned || 0
      },
      trends: trends.map(trend => ({
        date: trend.date,
        earnings: trend.earnings,
        transactions: trend.transactions,
        averageRating: trend.averageRating
      })),
      breakdown: {
        bySource: breakdown.bySource || {},
        bySkill: breakdown.bySkill || {},
        byTier: breakdown.byTier || {},
        byPaymentMethod: breakdown.byPaymentMethod || {}
      },
      lastUpdated: new Date().toISOString(),
      period: selectedPeriod
    };
  };

  // 📊 Calculate Statistics
  const calculateStats = (incomeData, performanceData) => {
    const stats = {
      totalEarnings: incomeData?.summary?.totalEarnings || 0,
      projectedEarnings: calculateProjectedEarnings(incomeData, performanceData),
      averageDaily: calculateAverageDaily(incomeData, selectedPeriod),
      growthRate: calculateGrowthRate(performanceData),
      activeIncomeSources: countActiveIncomeSources(incomeData?.breakdown?.bySource || {})
    };

    return stats;
  };

  // 🔮 Calculate Projected Earnings
  const calculateProjectedEarnings = (incomeData, performanceData) => {
    if (!performanceData || performanceData.length < 2) {
      return incomeData?.summary?.totalEarnings || 0;
    }

    const recentGrowth = performanceData.slice(-7); // Last 7 days
    const averageGrowth = recentGrowth.reduce((sum, day) => sum + (day.growth || 0), 0) / recentGrowth.length;
    
    return incomeData?.summary?.totalEarnings * (1 + averageGrowth);
  };

  // 📈 Calculate Growth Rate
  const calculateGrowthRate = (performanceData) => {
    if (!performanceData || performanceData.length < 2) {
      return 0;
    }

    const current = performanceData[performanceData.length - 1]?.earnings || 0;
    const previous = performanceData[performanceData.length - 2]?.earnings || 0;
    
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  };

  // 💾 Cache Management
  const cacheIncomeData = async (data) => {
    try {
      await AsyncStorage.setItem(
        'cached_income_data',
        JSON.stringify({
          data,
          timestamp: Date.now(),
          period: selectedPeriod
        })
      );
    } catch (error) {
      logger.error('Failed to cache income data', { error: error.message });
    }
  };

  const loadCachedData = async () => {
    try {
      const cached = await AsyncStorage.getItem('cached_income_data');
      if (cached) {
        const { data, timestamp, period } = JSON.parse(cached);
        
        // ⏰ Check if cache is still valid (1 hour)
        const isCacheValid = Date.now() - timestamp < 3600000;
        
        if (isCacheValid && period === selectedPeriod) {
          return data;
        }
      }
    } catch (error) {
      logger.error('Failed to load cached data', { error: error.message });
    }
    
    return null;
  };

  // 🎯 Load Goals
  const loadGoals = async () => {
    try {
      const goalsData = await incomeService.getIncomeGoals();
      setGoals(goalsData);
      
      logger.debug('Goals loaded successfully', {
        count: goalsData.length
      });
      
    } catch (error) {
      logger.error('Failed to load goals', { error: error.message });
      setGoals([]);
    }
  };

  // ⚡ Load Quick Actions
  const loadQuickActions = () => {
    const actions = [
      {
        id: 'request_payout',
        title: 'Request Payout',
        icon: 'cash-outline',
        color: colors.success[500],
        onPress: handleRequestPayout,
        disabled: stats.totalEarnings < 100
      },
      {
        id: 'set_goal',
        title: 'Set Income Goal',
        icon: 'flag-outline',
        color: colors.primary[500],
        onPress: handleSetGoal
      },
      {
        id: 'view_statements',
        title: 'View Statements',
        icon: 'document-text-outline',
        color: colors.info[500],
        onPress: handleViewStatements
      },
      {
        id: 'tax_calculator',
        title: 'Tax Calculator',
        icon: 'calculator-outline',
        color: colors.warning[500],
        onPress: handleTaxCalculator
      }
    ];
    
    setQuickActions(actions);
  };

  // 🔄 Real-time Updates
  const startRealTimeUpdates = () => {
    const updateInterval = setInterval(async () => {
      try {
        const updates = await incomeService.getRealTimeUpdates();
        
        if (updates && updates.length > 0) {
          handleRealTimeUpdates(updates);
        }
      } catch (error) {
        logger.error('Real-time update failed', { error: error.message });
      }
    }, 30000); // 30 seconds

    return () => clearInterval(updateInterval);
  };

  const stopRealTimeUpdates = () => {
    // Cleanup handled in useEffect return
  };

  const handleRealTimeUpdates = (updates) => {
    updates.forEach(update => {
      switch (update.type) {
        case 'payment_received':
          handlePaymentReceived(update.data);
          break;
        case 'bonus_awarded':
          handleBonusAwarded(update.data);
          break;
        case 'payout_processed':
          handlePayoutProcessed(update.data);
          break;
      }
    });
  };

  // 🎯 Event Handlers
  const handlePaymentReceived = (payment) => {
    // 📈 Update income data with new payment
    const updatedIncomeData = { ...incomeData };
    updatedIncomeData.summary.totalEarnings += payment.amount;
    updatedIncomeData.summary.pendingPayouts += payment.amount;
    
    setIncomeData(updatedIncomeData);
    
    // 📧 Show notification
    notificationService.showSuccess(
      'Payment Received',
      `ETB ${payment.amount.toLocaleString()} received for ${payment.skill}`
    );
    
    // 📊 Update analytics
    analyticsService.trackEvent('payment_received', {
      amount: payment.amount,
      skill: payment.skill,
      source: payment.source
    });
  };

  const handleBonusAwarded = (bonus) => {
    // 🎯 Update income data with bonus
    const updatedIncomeData = { ...incomeData };
    updatedIncomeData.summary.totalEarnings += bonus.amount;
    updatedIncomeData.summary.bonusesEarned += bonus.amount;
    
    setIncomeData(updatedIncomeData);
    
    // 🎉 Show celebration notification
    notificationService.showSuccess(
      'Bonus Awarded!',
      `ETB ${bonus.amount.toLocaleString()} quality bonus earned`,
      { 
        icon: '🎉',
        duration: 5000 
      }
    );
    
    // 📊 Update analytics
    analyticsService.trackEvent('bonus_awarded', {
      amount: bonus.amount,
      reason: bonus.reason,
      qualityScore: bonus.qualityScore
    });
  };

  const handlePayoutProcessed = (payout) => {
    // 💸 Update income data
    const updatedIncomeData = { ...incomeData };
    updatedIncomeData.summary.pendingPayouts -= payout.amount;
    
    setIncomeData(updatedIncomeData);
    
    // ✅ Show payout confirmation
    notificationService.showInfo(
      'Payout Processed',
      `ETB ${payout.amount.toLocaleString()} transferred to your account`
    );
    
    // 📊 Update analytics
    analyticsService.trackEvent('payout_processed', {
      amount: payout.amount,
      method: payout.method,
      transactionId: payout.transactionId
    });
  };

  const handleRequestPayout = async () => {
    try {
      // 🛡️ Validate eligibility
      const eligibility = await incomeService.checkPayoutEligibility();
      
      if (!eligibility.eligible) {
        Alert.alert(
          'Not Eligible',
          eligibility.reason || 'Minimum payout amount is ETB 100',
          [{ text: 'OK' }]
        );
        return;
      }

      // 💰 Show payout options
      Alert.alert(
        'Request Payout',
        `Available: ETB ${stats.totalEarnings.toLocaleString()}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Full Amount', 
            onPress: () => initiatePayout(stats.totalEarnings) 
          },
          { 
            text: 'Custom Amount', 
            onPress: () => showCustomPayoutModal() 
          }
        ]
      );
      
    } catch (error) {
      logger.error('Payout request failed', { error: error.message });
      notificationService.showError('Payout Request Failed', error.message);
    }
  };

  const initiatePayout = async (amount) => {
    try {
      setLoading(true);
      
      const result = await incomeService.requestPayout({
        amount,
        method: 'telebirr', // Default, could be configurable
        notes: 'Payout request from mobile app'
      });

      if (result.success) {
        notificationService.showSuccess(
          'Payout Requested',
          `ETB ${amount.toLocaleString()} payout initiated`
        );
        
        // 🔄 Refresh data
        await loadIncomeData(true);
        
        // 📊 Track event
        analyticsService.trackEvent('payout_requested', {
          amount,
          method: result.method,
          transactionId: result.transactionId
        });
      }
      
    } catch (error) {
      logger.error('Payout initiation failed', { error: error.message });
      notificationService.showError('Payout Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSetGoal = () => {
    navigation.navigate('GoalSetting', {
      currentIncome: stats.totalEarnings,
      period: selectedPeriod
    });
  };

  const handleViewStatements = () => {
    navigation.navigate('Statements', {
      period: selectedPeriod,
      incomeData
    });
  };

  const handleTaxCalculator = () => {
    navigation.navigate('TaxCalculator', {
      totalEarnings: stats.totalEarnings,
      period: selectedPeriod
    });
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    loadIncomeData();
    
    // 📊 Track period change
    analyticsService.trackEvent('period_changed', { period });
  };

  // 🎨 Animation Handlers
  const triggerEntranceAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  };

  // 🚨 Error Handling
  const handleInitializationError = (error) => {
    logger.error('Dashboard initialization failed', {
      error: error.message,
      stack: error.stack
    });
    
    setError(error.message);
    notificationService.showError('Initialization Failed', 'Unable to load income data');
  };

  const handleDataLoadError = (error) => {
    logger.error('Income data load failed', {
      error: error.message,
      period: selectedPeriod
    });
    
    setError(error.message);
    
    // 🚨 Show retry option
    if (!refreshing) {
      Alert.alert(
        'Connection Error',
        'Unable to load income data. Check your connection and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => loadIncomeData(true) }
        ]
      );
    }
  };

  // 🎯 Render Methods
  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.headerTop}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color={colors.white} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Income Tracking</Text>
          <Text style={styles.headerSubtitle}>Real-time earnings dashboard</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('IncomeSettings')}
        >
          <Ionicons name="settings-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.periodSelector}>
        {['daily', 'weekly', 'monthly', 'yearly'].map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive
            ]}
            onPress={() => handlePeriodChange(period)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period && styles.periodButtonTextActive
            ]}>
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderStatsOverview = () => (
    <Animated.View 
      style={[
        styles.statsContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <IncomeCard
        title="Total Earnings"
        amount={stats.totalEarnings}
        currency="ETB"
        icon="cash"
        color={colors.success[500]}
        trend={stats.growthRate}
        onPress={() => navigation.navigate('EarningsDetail')}
      />
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Projected</Text>
          <Text style={styles.statValue}>
            ETB {stats.projectedEarnings.toLocaleString()}
          </Text>
          <Feather name="trending-up" size={16} color={colors.success[500]} />
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Daily Avg</Text>
          <Text style={styles.statValue}>
            ETB {stats.averageDaily.toLocaleString()}
          </Text>
          <Feather name="calendar" size={16} color={colors.primary[500]} />
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Growth</Text>
          <Text style={[
            styles.statValue,
            { color: stats.growthRate >= 0 ? colors.success[500] : colors.error[500] }
          ]}>
            {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
          </Text>
          <MaterialIcons 
            name={stats.growthRate >= 0 ? "trending-up" : "trending-down"} 
            size={16} 
            color={stats.growthRate >= 0 ? colors.success[500] : colors.error[500]} 
          />
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Sources</Text>
          <Text style={styles.statValue}>
            {stats.activeIncomeSources}
          </Text>
          <Feather name="layers" size={16} color={colors.info[500]} />
        </View>
      </View>
    </Animated.View>
  );

  const renderPerformanceChart = () => (
    <Animated.View 
      style={[
        styles.chartContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Performance Trend</Text>
        <TouchableOpacity onPress={() => navigation.navigate('PerformanceAnalytics')}>
          <Text style={styles.seeAllText}>See Details</Text>
        </TouchableOpacity>
      </View>
      
      <PerformanceChart
        data={performanceData}
        period={selectedPeriod}
        height={200}
        onPointPress={(point) => {
          navigation.navigate('DailyDetail', { date: point.date });
        }}
      />
    </Animated.View>
  );

  const renderIncomeBreakdown = () => (
    <Animated.View 
      style={[
        styles.breakdownContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Income Breakdown</Text>
        <TouchableOpacity onPress={() => navigation.navigate('BreakdownDetail')}>
          <Text style={styles.seeAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      <IncomeBreakdown
        breakdown={incomeData?.breakdown}
        period={selectedPeriod}
        onSourcePress={(source) => {
          navigation.navigate('SourceDetail', { source });
        }}
      />
    </Animated.View>
  );

  const renderGoalTracker = () => (
    <Animated.View 
      style={[
        styles.goalsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Income Goals</Text>
        <TouchableOpacity onPress={handleSetGoal}>
          <Text style={styles.seeAllText}>Set Goal</Text>
        </TouchableOpacity>
      </View>
      
      <GoalTracker
        goals={goals}
        currentIncome={stats.totalEarnings}
        onGoalPress={(goal) => {
          navigation.navigate('GoalDetail', { goal });
        }}
      />
    </Animated.View>
  );

  const renderQuickActions = () => (
    <Animated.View 
      style={[
        styles.actionsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>
      
      <QuickActions
        actions={quickActions}
        columns={2}
        onActionPress={(action) => {
          if (action.onPress) {
            action.onPress();
          }
        }}
      />
    </Animated.View>
  );

  const renderLoading = () => (
    <LoadingOverlay 
      message="Loading your income data..."
      showProgress={true}
    />
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={64} color={colors.error[500]} />
      <Text style={styles.errorTitle}>Unable to Load Data</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={() => loadIncomeData(true)}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // 🎯 Main Render
  if (loading && !refreshing) {
    return renderLoading();
  }

  if (error && !incomeData) {
    return renderError();
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[colors.primary[900], colors.primary[800], colors.primary[700]]}
          style={styles.background}
        />
        
        {renderHeader()}
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadIncomeData(true)}
              colors={[colors.white]}
              tintColor={colors.white}
              title="Refreshing income data..."
              titleColor={colors.white}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderStatsOverview()}
          {renderPerformanceChart()}
          {renderIncomeBreakdown()}
          {renderGoalTracker()}
          {renderQuickActions()}
          
          {/* 📊 Last Updated Info */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Last updated: {new Date(incomeData?.lastUpdated).toLocaleTimeString()}
            </Text>
            <Text style={styles.footerNote}>
              Data updates in real-time
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

// 🎨 Styles
const styles = {
  container: {
    flex: 1,
    backgroundColor: colors.primary[900],
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 40,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: 'transparent',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h1,
    color: colors.white,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...typography.body2,
    color: colors.white,
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  settingsButton: {
    padding: spacing.xs,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: spacing.xs,
    marginTop: spacing.sm,
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.white,
    ...shadows.md,
  },
  periodButtonText: {
    ...typography.button,
    color: colors.white,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: colors.primary[700],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  statsContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: spacing.md,
  },
  statItem: {
    width: '50%',
    padding: spacing.md,
    alignItems: 'center',
  },
  statLabel: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.7,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h3,
    color: colors.white,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  chartContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  breakdownContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  goalsContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  actionsContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.white,
    fontWeight: '600',
  },
  seeAllText: {
    ...typography.button,
    color: colors.primary[300],
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  footerText: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.6,
  },
  footerNote: {
    ...typography.caption,
    color: colors.white,
    opacity: 0.4,
    marginTop: spacing.xs,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.primary[900],
  },
  errorTitle: {
    ...typography.h3,
    color: colors.white,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    ...typography.body1,
    color: colors.white,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    ...shadows.sm,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.white,
    fontWeight: '600',
  },
};

export default IncomeTracking;