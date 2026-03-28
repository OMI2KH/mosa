/**
 * 📱 MOSA FORGE - Enterprise Investment Tracking Dashboard
 * 💰 Real-time Wealth Monitoring & Investment Analytics
 * 📊 Portfolio Performance & Risk Assessment
 * 🎯 Goal-Based Investment Strategy
 * 🚀 React Native Enterprise Application
 * 
 * @module InvestmentTracking
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  IconButton,
  SegmentedButtons,
  ProgressBar,
  Chip,
  DataTable,
  Surface,
  Divider
} from 'react-native-paper';
import {
  LineChart,
  PieChart,
  BarChart,
  ProgressChart
} from 'react-native-chart-kit';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🏗️ Enterprise Components
import LoadingOverlay from '../../components/shared/LoadingOverlay';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import NetworkStatus from '../../components/shared/NetworkStatus';
import SecurityWarning from '../../components/shared/SecurityWarning';

// 🎯 Custom Hooks
import useAuth from '../../hooks/useAuth';
import useInvestment from '../../hooks/useInvestment';
import useAnalytics from '../../hooks/useAnalytics';

// 📊 Services
import InvestmentService from '../../services/investment-service';
import RiskAssessmentService from '../../services/risk-assessment-service';
import PortfolioOptimizer from '../../services/portfolio-optimizer';

// 🎨 Design System
import Colors from '../../constants/colors';
import Typography from '../../constants/typography';
import Spacing from '../../constants/spacing';
import Shadows from '../../constants/shadows';

const { width: screenWidth } = Dimensions.get('window');

/**
 * 💰 INVESTMENT TRACKING DASHBOARD - Enterprise Grade
 */
const InvestmentTracking = ({ navigation, route }) => {
  // 🔐 Authentication Context
  const { user, session, isAuthenticated } = useAuth();
  
  // 📊 Investment Context
  const {
    portfolio,
    isLoading,
    error,
    refreshPortfolio,
    updateInvestment,
    calculatePerformance
  } = useInvestment();

  // 📈 Analytics Context
  const { trackEvent, logAnalytics } = useAnalytics();

  // 🏗️ State Management
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1M');
  const [activeTab, setActiveTab] = useState('overview');
  const [riskProfile, setRiskProfile] = useState('moderate');
  const [goalProgress, setGoalProgress] = useState({});
  const [marketInsights, setMarketInsights] = useState([]);
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [securityAlert, setSecurityAlert] = useState(null);

  // 💾 Service Instances
  const investmentService = useMemo(() => new InvestmentService(), []);
  const riskService = useMemo(() => new RiskAssessmentService(), []);
  const portfolioOptimizer = useMemo(() => new PortfolioOptimizer(), []);

  /**
   * 🎯 INITIALIZE DASHBOARD
   */
  useEffect(() => {
    if (isAuthenticated) {
      initializeDashboard();
      startRealTimeUpdates();
    }

    return () => {
      stopRealTimeUpdates();
    };
  }, [isAuthenticated]);

  /**
   * 🏗️ INITIALIZE DASHBOARD
   */
  const initializeDashboard = useCallback(async () => {
    try {
      // 📊 Load Portfolio Data
      await refreshPortfolio();

      // 🎯 Load Investment Goals
      await loadInvestmentGoals();

      // 📈 Load Market Insights
      await loadMarketInsights();

      // 🛡️ Check Security Status
      await checkSecurityStatus();

      // 🎯 Track Analytics
      trackEvent('investment_dashboard_viewed', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logAnalytics('dashboard_initialization_failed', {
        error: error.message,
        userId: user.id
      });
      
      Alert.alert(
        'Initialization Error',
        'Failed to initialize investment dashboard. Please try again.',
        [{ text: 'Retry', onPress: initializeDashboard }]
      );
    }
  }, [user, refreshPortfolio]);

  /**
   * 🔄 START REAL-TIME UPDATES
   */
  const startRealTimeUpdates = useCallback(() => {
    const updateInterval = setInterval(async () => {
      if (isAuthenticated) {
        await refreshMarketData();
        await updatePerformanceMetrics();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(updateInterval);
  }, [isAuthenticated]);

  /**
   * 🛑 STOP REAL-TIME UPDATES
   */
  const stopRealTimeUpdates = useCallback(() => {
    // Cleanup function for intervals
  }, []);

  /**
   * 🔄 REFRESH MARKET DATA
   */
  const refreshMarketData = useCallback(async () => {
    try {
      const marketData = await investmentService.getRealTimeMarketData();
      setMarketInsights(marketData.insights);
      
      // 🎯 Update portfolio with latest market prices
      if (portfolio?.investments) {
        const updatedPortfolio = await investmentService.updatePortfolioPrices(portfolio);
        // Update context or local state as needed
      }
    } catch (error) {
      console.error('Market data refresh failed:', error);
    }
  }, [portfolio, investmentService]);

  /**
   * 📈 UPDATE PERFORMANCE METRICS
   */
  const updatePerformanceMetrics = useCallback(async () => {
    if (!portfolio) return;

    try {
      const performance = await calculatePerformance(selectedTimeframe);
      // Update local performance metrics state
    } catch (error) {
      console.error('Performance metrics update failed:', error);
    }
  }, [portfolio, selectedTimeframe, calculatePerformance]);

  /**
   * 🎯 LOAD INVESTMENT GOALS
   */
  const loadInvestmentGoals = useCallback(async () => {
    try {
      const goals = await investmentService.getInvestmentGoals(user.id);
      
      const progress = goals.reduce((acc, goal) => {
        acc[goal.id] = {
          current: goal.currentAmount,
          target: goal.targetAmount,
          progress: (goal.currentAmount / goal.targetAmount) * 100,
          deadline: goal.deadline
        };
        return acc;
      }, {});

      setGoalProgress(progress);
    } catch (error) {
      console.error('Investment goals loading failed:', error);
    }
  }, [user, investmentService]);

  /**
   * 📈 LOAD MARKET INSIGHTS
   */
  const loadMarketInsights = useCallback(async () => {
    try {
      const insights = await investmentService.getMarketInsights({
        timeframe: selectedTimeframe,
        riskProfile
      });
      setMarketInsights(insights);
    } catch (error) {
      console.error('Market insights loading failed:', error);
    }
  }, [selectedTimeframe, riskProfile, investmentService]);

  /**
   * 🛡️ CHECK SECURITY STATUS
   */
  const checkSecurityStatus = useCallback(async () => {
    try {
      const securityCheck = await riskService.assessPortfolioSecurity(portfolio);
      
      if (securityCheck.riskLevel === 'HIGH') {
        setSecurityAlert({
          level: 'high',
          message: securityCheck.recommendations[0],
          action: 'review_portfolio'
        });
      }
    } catch (error) {
      console.error('Security check failed:', error);
    }
  }, [portfolio, riskService]);

  /**
   * 🔄 HANDLE PULL-TO-REFRESH
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      await Promise.all([
        refreshPortfolio(),
        loadMarketInsights(),
        updatePerformanceMetrics()
      ]);
      
      trackEvent('dashboard_refreshed', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logAnalytics('dashboard_refresh_failed', {
        error: error.message,
        userId: user.id
      });
    } finally {
      setRefreshing(false);
    }
  }, [user, refreshPortfolio, loadMarketInsights, updatePerformanceMetrics]);

  /**
   * 📊 RENDER PORTFOLIO OVERVIEW
   */
  const renderPortfolioOverview = useMemo(() => {
    if (!portfolio) return null;

    return (
      <Surface style={styles.overviewCard} elevation={2}>
        <View style={styles.overviewHeader}>
          <Title style={styles.overviewTitle}>Portfolio Overview</Title>
          <Chip icon="trending-up" mode="outlined">
            {portfolio.performance?.overallReturn || '0%'}
          </Chip>
        </View>

        <View style={styles.overviewMetrics}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Total Value</Text>
            <Text style={styles.metricValue}>
              ETB {portfolio.totalValue?.toLocaleString() || '0'}
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Daily Change</Text>
            <Text style={[
              styles.metricValue,
              portfolio.dailyChange >= 0 ? styles.positive : styles.negative
            ]}>
              {portfolio.dailyChange >= 0 ? '+' : ''}{portfolio.dailyChange || '0'}%
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Risk Level</Text>
            <View style={styles.riskIndicator}>
              <View style={[
                styles.riskBar,
                { width: `${portfolio.riskLevel * 100}%` }
              ]} />
              <Text style={styles.metricValue}>
                {portfolio.riskLevel < 0.3 ? 'Low' : 
                 portfolio.riskLevel < 0.7 ? 'Moderate' : 'High'}
              </Text>
            </View>
          </View>
        </View>

        <ProgressBar
          progress={portfolio.diversificationScore || 0.5}
          color={Colors.primary}
          style={styles.diversificationBar}
        />
        <Paragraph style={styles.diversificationText}>
          Diversification Score: {(portfolio.diversificationScore * 100).toFixed(0)}%
        </Paragraph>
      </Surface>
    );
  }, [portfolio]);

  /**
   * 📈 RENDER PERFORMANCE CHART
   */
  const renderPerformanceChart = useMemo(() => {
    if (!portfolio?.performanceHistory) return null;

    const chartData = {
      labels: portfolio.performanceHistory.map(point => point.date),
      datasets: [{
        data: portfolio.performanceHistory.map(point => point.value),
        color: (opacity = 1) => `rgba(0, 150, 136, ${opacity})`,
        strokeWidth: 2
      }]
    };

    const chartConfig = {
      backgroundColor: Colors.surface,
      backgroundGradientFrom: Colors.surface,
      backgroundGradientTo: Colors.surface,
      decimalPlaces: 2,
      color: (opacity = 1) => `rgba(0, 150, 136, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      style: {
        borderRadius: 16
      },
      propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: Colors.primary
      }
    };

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <View style={styles.chartHeader}>
            <Title>Performance History</Title>
            <SegmentedButtons
              value={selectedTimeframe}
              onValueChange={setSelectedTimeframe}
              buttons={[
                { value: '1W', label: '1W' },
                { value: '1M', label: '1M' },
                { value: '3M', label: '3M' },
                { value: '1Y', label: '1Y' }
              ]}
              style={styles.timeframeSelector}
            />
          </View>
          
          <LineChart
            data={chartData}
            width={screenWidth - 48}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            yAxisLabel="ETB "
            yAxisSuffix=""
            withVerticalLines={false}
            withHorizontalLines={true}
            withInnerLines={false}
            withShadow={false}
            withDots={true}
            withVerticalLabels={true}
            withHorizontalLabels={true}
          />
        </Card.Content>
      </Card>
    );
  }, [portfolio, selectedTimeframe]);

  /**
   * 🎯 RENDER INVESTMENT GOALS
   */
  const renderInvestmentGoals = useMemo(() => {
    if (Object.keys(goalProgress).length === 0) return null;

    return (
      <Card style={styles.goalsCard}>
        <Card.Content>
          <View style={styles.goalsHeader}>
            <Title>Investment Goals</Title>
            <Button
              mode="text"
              onPress={() => navigation.navigate('GoalManagement')}
              icon="plus"
            >
              Add Goal
            </Button>
          </View>

          {Object.entries(goalProgress).map(([goalId, goal]) => (
            <View key={goalId} style={styles.goalItem}>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>Goal #{goalId.slice(0, 8)}</Text>
                <Text style={styles.goalTarget}>
                  ETB {goal.current.toLocaleString()} / ETB {goal.target.toLocaleString()}
                </Text>
              </View>
              
              <ProgressBar
                progress={goal.progress / 100}
                color={Colors.secondary}
                style={styles.goalProgressBar}
              />
              
              <Text style={styles.goalProgressText}>
                {goal.progress.toFixed(1)}% Complete
              </Text>
              
              <Text style={styles.goalDeadline}>
                Deadline: {new Date(goal.deadline).toLocaleDateString()}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  }, [goalProgress, navigation]);

  /**
   * 📊 RENDER ASSET ALLOCATION
   */
  const renderAssetAllocation = useMemo(() => {
    if (!portfolio?.assetAllocation) return null;

    const pieData = portfolio.assetAllocation.map(asset => ({
      name: asset.category,
      population: asset.percentage,
      color: asset.color,
      legendFontColor: Colors.text,
      legendFontSize: 12
    }));

    return (
      <Card style={styles.allocationCard}>
        <Card.Content>
          <Title>Asset Allocation</Title>
          
          <View style={styles.allocationContainer}>
            <PieChart
              data={pieData}
              width={screenWidth - 48}
              height={180}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
            
            <View style={styles.allocationLegend}>
              {portfolio.assetAllocation.map(asset => (
                <View key={asset.category} style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: asset.color }]} />
                  <Text style={styles.legendText}>
                    {asset.category}: {asset.percentage}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  }, [portfolio]);

  /**
   * 📈 RENDER MARKET INSIGHTS
   */
  const renderMarketInsights = useMemo(() => {
    if (marketInsights.length === 0) return null;

    return (
      <Card style={styles.insightsCard}>
        <Card.Content>
          <View style={styles.insightsHeader}>
            <Title>Market Insights</Title>
            <IconButton
              icon="refresh"
              size={20}
              onPress={loadMarketInsights}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {marketInsights.map((insight, index) => (
              <Surface key={index} style={styles.insightItem} elevation={1}>
                <View style={styles.insightHeader}>
                  <MaterialCommunityIcons
                    name={insight.type === 'bullish' ? 'trending-up' : 'trending-down'}
                    size={24}
                    color={insight.type === 'bullish' ? Colors.success : Colors.error}
                  />
                  <Text style={styles.insightCategory}>{insight.category}</Text>
                </View>
                
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription} numberOfLines={3}>
                  {insight.description}
                </Text>
                
                <View style={styles.insightMetrics}>
                  <Chip icon="clock" compact style={styles.insightChip}>
                    {insight.timeframe}
                  </Chip>
                  <Chip icon="chart-bar" compact style={styles.insightChip}>
                    {insight.confidence}%
                  </Chip>
                </View>
              </Surface>
            ))}
          </ScrollView>
        </Card.Content>
      </Card>
    );
  }, [marketInsights, loadMarketInsights]);

  /**
   * 🎯 RENDER QUICK ACTIONS
   */
  const renderQuickActions = useMemo(() => {
    const actions = [
      {
        id: 'add_investment',
        title: 'Add Investment',
        icon: 'plus-circle',
        color: Colors.primary,
        onPress: () => navigation.navigate('AddInvestment')
      },
      {
        id: 'rebalance',
        title: 'Rebalance',
        icon: 'scale-balance',
        color: Colors.secondary,
        onPress: () => handleRebalancePortfolio()
      },
      {
        id: 'analytics',
        title: 'Analytics',
        icon: 'chart-box',
        color: Colors.info,
        onPress: () => setShowAdvancedMetrics(true)
      },
      {
        id: 'withdraw',
        title: 'Withdraw',
        icon: 'bank-transfer',
        color: Colors.warning,
        onPress: () => navigation.navigate('Withdrawal')
      }
    ];

    return (
      <View style={styles.actionsContainer}>
        {actions.map(action => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionButton}
            onPress={action.onPress}
          >
            <Surface style={[styles.actionIcon, { backgroundColor: action.color }]} elevation={2}>
              <MaterialCommunityIcons name={action.icon} size={24} color={Colors.white} />
            </Surface>
            <Text style={styles.actionTitle}>{action.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [navigation]);

  /**
   * 🔄 HANDLE PORTFOLIO REBALANCE
   */
  const handleRebalancePortfolio = useCallback(async () => {
    try {
      const optimization = await portfolioOptimizer.optimizePortfolio(portfolio, riskProfile);
      
      Alert.alert(
        'Rebalance Recommendation',
        `Recommended changes to optimize your portfolio:\n\n${optimization.recommendations.join('\n')}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Apply Changes', onPress: () => applyRebalance(optimization) }
        ]
      );
    } catch (error) {
      Alert.alert('Rebalance Failed', 'Unable to generate rebalance recommendations.');
    }
  }, [portfolio, riskProfile, portfolioOptimizer]);

  /**
   * 🎯 APPLY PORTFOLIO REBALANCE
   */
  const applyRebalance = useCallback(async (optimization) => {
    try {
      await investmentService.applyRebalance(portfolio.id, optimization.changes);
      await refreshPortfolio();
      
      trackEvent('portfolio_rebalanced', {
        userId: user.id,
        changes: optimization.changes.length
      });
      
      Alert.alert('Success', 'Portfolio rebalanced successfully!');
    } catch (error) {
      Alert.alert('Rebalance Failed', 'Unable to apply rebalance changes.');
    }
  }, [portfolio, user, investmentService, refreshPortfolio]);

  /**
   * 🚨 RENDER SECURITY ALERTS
   */
  const renderSecurityAlerts = useMemo(() => {
    if (!securityAlert) return null;

    return (
      <SecurityWarning
        level={securityAlert.level}
        message={securityAlert.message}
        action={securityAlert.action}
        onDismiss={() => setSecurityAlert(null)}
        onAction={() => handleSecurityAction(securityAlert.action)}
      />
    );
  }, [securityAlert]);

  /**
   * 🛡️ HANDLE SECURITY ACTION
   */
  const handleSecurityAction = useCallback((action) => {
    switch (action) {
      case 'review_portfolio':
        navigation.navigate('SecurityReview', { portfolioId: portfolio.id });
        break;
      case 'enable_2fa':
        navigation.navigate('SecuritySettings');
        break;
      default:
        break;
    }
  }, [navigation, portfolio]);

  /**
   * 🎯 MAIN RENDER
   */
  if (!isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <MaterialCommunityIcons name="lock" size={64} color={Colors.textLight} />
        <Title style={styles.authTitle}>Authentication Required</Title>
        <Paragraph style={styles.authText}>
          Please sign in to access investment tracking
        </Paragraph>
        <Button mode="contained" onPress={() => navigation.navigate('Auth')}>
          Sign In
        </Button>
      </View>
    );
  }

  if (isLoading && !refreshing) {
    return <LoadingOverlay message="Loading investment portfolio..." />;
  }

  if (error) {
    return (
      <ErrorBoundary
        error={error}
        onRetry={initializeDashboard}
        message="Unable to load investment data"
      />
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <NetworkStatus />
        
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {/* 🚨 Security Alerts */}
          {renderSecurityAlerts}

          {/* 📊 Portfolio Overview */}
          {renderPortfolioOverview}

          {/* 📈 Performance Chart */}
          {renderPerformanceChart}

          {/* 🎯 Quick Actions */}
          {renderQuickActions}

          {/* 🎯 Investment Goals */}
          {renderInvestmentGoals}

          {/* 📊 Asset Allocation */}
          {renderAssetAllocation}

          {/* 📈 Market Insights */}
          {renderMarketInsights}

          {/* 📊 Advanced Metrics Toggle */}
          {showAdvancedMetrics && renderAdvancedMetrics()}

          {/* 📝 Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              📈 Past performance is not indicative of future results. 
              Investments carry risk, including possible loss of principal.
            </Text>
          </View>
        </ScrollView>

        {/* 🔧 Bottom Navigation */}
        <Surface style={styles.bottomNav} elevation={4}>
          <SegmentedButtons
            value={activeTab}
            onValueChange={setActiveTab}
            buttons={[
              {
                value: 'overview',
                icon: 'view-dashboard',
                label: 'Overview'
              },
              {
                value: 'investments',
                icon: 'chart-line',
                label: 'Investments'
              },
              {
                value: 'analytics',
                icon: 'chart-box',
                label: 'Analytics'
              },
              {
                value: 'goals',
                icon: 'flag',
                label: 'Goals'
              }
            ]}
            style={styles.bottomNavButtons}
          />
        </Surface>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

/**
 * 📊 RENDER ADVANCED METRICS
 */
const renderAdvancedMetrics = () => {
  // Advanced metrics component implementation
  return (
    <Card style={styles.advancedMetricsCard}>
      <Card.Content>
        <Title>Advanced Metrics</Title>
        {/* Add advanced metrics components here */}
      </Card.Content>
    </Card>
  );
};

/**
 * 🎨 STYLESHEET
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  authTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    color: Colors.text,
  },
  authText: {
    textAlign: 'center',
    color: Colors.textLight,
    marginBottom: Spacing.xl,
  },
  overviewCard: {
    margin: Spacing.md,
    padding: Spacing.lg,
    borderRadius: 16,
    ...Shadows.medium,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  overviewTitle: {
    fontSize: Typography.h3,
    fontWeight: '600',
    color: Colors.text,
  },
  overviewMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: Typography.caption,
    color: Colors.textLight,
    marginBottom: Spacing.xs,
  },
  metricValue: {
    fontSize: Typography.h4,
    fontWeight: '600',
    color: Colors.text,
  },
  positive: {
    color: Colors.success,
  },
  negative: {
    color: Colors.error,
  },
  riskIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60,
  },
  riskBar: {
    height: 4,
    backgroundColor: Colors.warning,
    borderRadius: 2,
    marginRight: Spacing.xs,
  },
  diversificationBar: {
    marginTop: Spacing.md,
  },
  diversificationText: {
    fontSize: Typography.caption,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  chartCard: {
    margin: Spacing.md,
    marginTop: 0,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  timeframeSelector: {
    maxWidth: 200,
  },
  chart: {
    marginVertical: Spacing.sm,
    borderRadius: 8,
  },
  goalsCard: {
    margin: Spacing.md,
    marginTop: 0,
  },
  goalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  goalItem: {
    marginBottom: Spacing.lg,
  },
  goalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  goalName: {
    fontSize: Typography.body,
    fontWeight: '600',
    color: Colors.text,
  },
  goalTarget: {
    fontSize: Typography.body,
    color: Colors.textLight,
  },
  goalProgressBar: {
    marginBottom: Spacing.xs,
  },
  goalProgressText: {
    fontSize: Typography.caption,
    color: Colors.textLight,
    textAlign: 'right',
  },
  goalDeadline: {
    fontSize: Typography.caption,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  allocationCard: {
    margin: Spacing.md,
    marginTop: 0,
  },
  allocationContainer: {
    alignItems: 'center',
  },
  allocationLegend: {
    marginTop: Spacing.md,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  legendText: {
    fontSize: Typography.caption,
    color: Colors.text,
  },
  insightsCard: {
    margin: Spacing.md,
    marginTop: 0,
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  insightItem: {
    width: 280,
    marginRight: Spacing.md,
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  insightCategory: {
    fontSize: Typography.caption,
    color: Colors.textLight,
    marginLeft: Spacing.xs,
    textTransform: 'uppercase',
  },
  insightTitle: {
    fontSize: Typography.body,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  insightDescription: {
    fontSize: Typography.caption,
    color: Colors.textLight,
    lineHeight: 16,
    marginBottom: Spacing.sm,
  },
  insightMetrics: {
    flexDirection: 'row',
  },
  insightChip: {
    marginRight: Spacing.xs,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    ...Shadows.small,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  actionTitle: {
    fontSize: Typography.caption,
    color: Colors.text,
    textAlign: 'center',
  },
  advancedMetricsCard: {
    margin: Spacing.md,
    marginTop: 0,
  },
  disclaimer: {
    padding: Spacing.md,
    margin: Spacing.md,
    marginTop: 0,
    backgroundColor: Colors.infoLight,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  disclaimerText: {
    fontSize: Typography.caption,
    color: Colors.text,
    fontStyle: 'italic',
  },
  bottomNav: {
    padding: Spacing.sm,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: Colors.surface,
  },
  bottomNavButtons: {
    height: 48,
  },
});

export default InvestmentTracking;