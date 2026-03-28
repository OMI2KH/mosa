/**
 * 🏢 MOSA FORGE - Make Money & Income Generation Module
 * 💰 Real-time Income Dashboard & Earning Opportunities
 * 📊 Performance Analytics & Revenue Projections
 * 🚀 Interactive Income Visualization & Goal Tracking
 * 
 * @module MakeMoney
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Dimensions,
  Animated,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather, MaterialIcons, FontAwesome5, Ionicons, AntDesign } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// 🏗️ Enterprise Components
import RevenueChart from '../../components/charts/RevenueChart';
import IncomeCard from '../../components/cards/IncomeCard';
import OpportunityCard from '../../components/cards/OpportunityCard';
import GoalProgress from '../../components/goals/GoalProgress';
import QuickActionButton from '../../components/buttons/QuickActionButton';
import PerformanceBadge from '../../components/badges/PerformanceBadge';

// 🎯 Custom Hooks
import { useEarnings } from '../../hooks/useEarnings';
import { useOpportunities } from '../../hooks/useOpportunities';
import { usePerformance } from '../../hooks/usePerformance';
import { useGoals } from '../../hooks/useGoals';

// 🔧 Utilities
import { formatCurrency } from '../../utils/formatters';
import { hapticFeedback } from '../../utils/haptics';
import { trackEvent } from '../../utils/analytics';

// 🎨 Design System
import { Colors, Typography, Spacing, Shadows, Gradients } from '../../design-system';
import LoadingOverlay from '../../components/overlays/LoadingOverlay';
import ErrorBoundary from '../../components/errors/ErrorBoundary';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const MakeMoney = () => {
  // 🔄 Navigation
  const navigation = useNavigation();
  
  // 🎯 State Management
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('monthly');
  const [showOpportunities, setShowOpportunities] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // 📊 Custom Hooks
  const {
    earnings,
    loading: earningsLoading,
    error: earningsError,
    refreshEarnings,
    totalEarnings,
    projectedEarnings,
    earningsGrowth
  } = useEarnings();

  const {
    opportunities,
    loading: opportunitiesLoading,
    error: opportunitiesError,
    refreshOpportunities,
    activeOpportunities,
    recommendedOpportunities
  } = useOpportunities();

  const {
    performance,
    loading: performanceLoading,
    error: performanceError,
    refreshPerformance,
    overallScore,
    rank,
    improvementAreas
  } = usePerformance();

  const {
    goals,
    loading: goalsLoading,
    error: goalsError,
    refreshGoals,
    activeGoal,
    goalProgress
  } = useGoals();

  // ⚡ Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // 🎯 Tab Configurations
  const TABS = [
    { id: 'overview', label: 'Overview', icon: 'pie-chart' },
    { id: 'earnings', label: 'Earnings', icon: 'dollar-sign' },
    { id: 'opportunities', label: 'Opportunities', icon: 'trending-up' },
    { id: 'goals', label: 'Goals', icon: 'target' },
    { id: 'performance', label: 'Performance', icon: 'activity' }
  ];

  // 🕐 Timeframe Options
  const TIMEFRAMES = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'quarterly', label: 'Quarterly' },
    { id: 'yearly', label: 'Yearly' }
  ];

  // 🔄 Initial Load
  useEffect(() => {
    initializeDashboard();
    
    // 🎯 Track Screen View
    trackEvent('make_money_screen_view', {
      timestamp: new Date().toISOString(),
      user_type: 'student'
    });
  }, []);

  // 🎯 Screen Focus Effect
  useFocusEffect(
    useCallback(() => {
      // 🔄 Refresh data when screen comes into focus
      refreshDashboard();
      
      // ⚡ Trigger haptic feedback
      hapticFeedback('light');
      
      return () => {
        // 🧹 Cleanup animations
        fadeAnim.stopAnimation();
        slideAnim.stopAnimation();
      };
    }, [])
  );

  /**
   * 🏗️ Initialize Dashboard
   */
  const initializeDashboard = async () => {
    try {
      setIsAnimating(true);
      
      // 🎯 Start entrance animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();

      // 📊 Load all data
      await Promise.all([
        refreshEarnings(),
        refreshOpportunities(),
        refreshPerformance(),
        refreshGoals()
      ]);

      // 🎯 Animate progress bars
      Animated.timing(progressAnim, {
        toValue: goalProgress?.percentage || 0,
        duration: 1500,
        useNativeDriver: false,
      }).start();

      setIsAnimating(false);
      setLoading(false);

    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      setLoading(false);
      showErrorAlert('Initialization Error', 'Failed to load dashboard data');
    }
  };

  /**
   * 🔄 Refresh Dashboard
   */
  const refreshDashboard = async () => {
    setRefreshing(true);
    
    try {
      await Promise.all([
        refreshEarnings(),
        refreshOpportunities(),
        refreshPerformance(),
        refreshGoals()
      ]);
      
      // ⚡ Success haptic feedback
      hapticFeedback('success');
      
      // 🎯 Track refresh event
      trackEvent('dashboard_refresh', {
        timestamp: new Date().toISOString(),
        earnings_refreshed: true,
        opportunities_refreshed: true
      });

    } catch (error) {
      console.error('Dashboard refresh failed:', error);
      hapticFeedback('error');
      showErrorAlert('Refresh Error', 'Failed to refresh dashboard data');
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * 🎯 Handle Tab Change
   */
  const handleTabChange = (tabId) => {
    // ⚡ Haptic feedback
    hapticFeedback('selection');
    
    // 🎯 Update active tab
    setActiveTab(tabId);
    
    // 📊 Track tab change
    trackEvent('tab_change', {
      from_tab: activeTab,
      to_tab: tabId,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * 💰 Handle Withdrawal Request
   */
  const handleWithdraw = () => {
    // ⚡ Haptic feedback
    hapticFeedback('medium');
    
    // 🚀 Navigate to withdrawal screen
    navigation.navigate('Withdraw', {
      availableBalance: totalEarnings?.available || 0,
      currency: 'ETB'
    });
    
    // 📊 Track withdrawal initiation
    trackEvent('withdrawal_initiated', {
      available_balance: totalEarnings?.available,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * 🎯 Handle Opportunity Selection
   */
  const handleOpportunitySelect = (opportunity) => {
    // ⚡ Haptic feedback
    hapticFeedback('light');
    
    // 🚀 Navigate to opportunity details
    navigation.navigate('OpportunityDetail', {
      opportunityId: opportunity.id,
      opportunityType: opportunity.type,
      estimatedEarnings: opportunity.estimatedEarnings
    });
    
    // 📊 Track opportunity selection
    trackEvent('opportunity_selected', {
      opportunity_id: opportunity.id,
      opportunity_type: opportunity.type,
      estimated_earnings: opportunity.estimatedEarnings
    });
  };

  /**
   * 🎯 Handle Goal Selection
   */
  const handleGoalSelect = (goal) => {
    // ⚡ Haptic feedback
    hapticFeedback('light');
    
    // 🎯 Set selected goal
    setSelectedGoal(goal);
    
    // 🚀 Show goal details modal or navigate
    navigation.navigate('GoalDetail', {
      goalId: goal.id,
      goalTitle: goal.title,
      currentProgress: goal.progress,
      targetAmount: goal.target
    });
    
    // 📊 Track goal selection
    trackEvent('goal_selected', {
      goal_id: goal.id,
      goal_type: goal.type,
      current_progress: goal.progress
    });
  };

  /**
   * 📊 Handle Timeframe Change
   */
  const handleTimeframeChange = (timeframe) => {
    // ⚡ Haptic feedback
    hapticFeedback('selection');
    
    // 🎯 Update timeframe
    setSelectedTimeframe(timeframe);
    
    // 🔄 Refresh earnings with new timeframe
    refreshEarnings(timeframe);
    
    // 📊 Track timeframe change
    trackEvent('timeframe_changed', {
      previous_timeframe: selectedTimeframe,
      new_timeframe: timeframe,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * ⚡ Quick Action Handlers
   */
  const quickActions = [
    {
      id: 'withdraw',
      label: 'Withdraw',
      icon: 'arrow-up-circle',
      color: Colors.success,
      onPress: handleWithdraw,
      disabled: !totalEarnings?.available || totalEarnings.available < 100
    },
    {
      id: 'transfer',
      label: 'Transfer',
      icon: 'repeat',
      color: Colors.info,
      onPress: () => navigation.navigate('Transfer'),
      disabled: false
    },
    {
      id: 'invest',
      label: 'Invest',
      icon: 'trending-up',
      color: Colors.warning,
      onPress: () => navigation.navigate('Invest'),
      disabled: false
    },
    {
      id: 'history',
      label: 'History',
      icon: 'clock',
      color: Colors.secondary,
      onPress: () => navigation.navigate('EarningHistory'),
      disabled: false
    }
  ];

  /**
   * 🎨 Render Header
   */
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
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Income Dashboard</Text>
          <Text style={styles.subtitle}>
            Track, grow, and manage your earnings
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <LinearGradient
            colors={Gradients.primary}
            style={styles.profileGradient}
          >
            <Feather name="user" size={20} color={Colors.white} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* 🎯 Performance Badge */}
      {overallScore > 0 && (
        <View style={styles.performanceContainer}>
          <PerformanceBadge
            score={overallScore}
            rank={rank}
            size="medium"
            showLabel={true}
          />
        </View>
      )}
    </Animated.View>
  );

  /**
   * 💰 Render Earnings Overview
   */
  const renderEarningsOverview = () => (
    <Animated.View 
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Earnings Overview</Text>
        <View style={styles.timeframeSelector}>
          {TIMEFRAMES.map((timeframe) => (
            <TouchableOpacity
              key={timeframe.id}
              style={[
                styles.timeframeButton,
                selectedTimeframe === timeframe.id && styles.timeframeButtonActive
              ]}
              onPress={() => handleTimeframeChange(timeframe.id)}
            >
              <Text style={[
                styles.timeframeText,
                selectedTimeframe === timeframe.id && styles.timeframeTextActive
              ]}>
                {timeframe.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 📊 Earnings Cards */}
      <View style={styles.earningsGrid}>
        <IncomeCard
          title="Total Earned"
          amount={totalEarnings?.total || 0}
          currency="ETB"
          change={earningsGrowth}
          period="this month"
          icon="dollar-sign"
          color={Colors.success}
          loading={earningsLoading}
        />

        <IncomeCard
          title="Available"
          amount={totalEarnings?.available || 0}
          currency="ETB"
          subtitle="Ready to withdraw"
          icon="credit-card"
          color={Colors.info}
          loading={earningsLoading}
        />

        <IncomeCard
          title="Projected"
          amount={projectedEarnings || 0}
          currency="ETB"
          subtitle="Next 30 days"
          icon="trending-up"
          color={Colors.warning}
          loading={earningsLoading}
        />

        <IncomeCard
          title="Pending"
          amount={totalEarnings?.pending || 0}
          currency="ETB"
          subtitle="In processing"
          icon="clock"
          color={Colors.secondary}
          loading={earningsLoading}
        />
      </View>

      {/* 📈 Revenue Chart */}
      {earnings?.chartData && earnings.chartData.length > 0 && (
        <View style={styles.chartContainer}>
          <RevenueChart
            data={earnings.chartData}
            timeframe={selectedTimeframe}
            currency="ETB"
            showTooltip={true}
            animated={true}
          />
        </View>
      )}
    </Animated.View>
  );

  /**
   * 🎯 Render Opportunities
   */
  const renderOpportunities = () => {
    if (!showOpportunities || opportunities.length === 0) return null;

    return (
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Earning Opportunities</Text>
          <TouchableOpacity 
            style={styles.seeAllButton}
            onPress={() => navigation.navigate('Opportunities')}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <Feather name="chevron-right" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.opportunitiesScroll}
          contentContainerStyle={styles.opportunitiesContent}
        >
          {recommendedOpportunities.slice(0, 5).map((opportunity, index) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              index={index}
              onSelect={() => handleOpportunitySelect(opportunity)}
              style={styles.opportunityCard}
            />
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

  /**
   * 🎯 Render Goals
   */
  const renderGoals = () => {
    if (!activeGoal) return null;

    return (
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Goal</Text>
          <TouchableOpacity 
            style={styles.seeAllButton}
            onPress={() => navigation.navigate('Goals')}
          >
            <Text style={styles.seeAllText}>All Goals</Text>
            <Feather name="chevron-right" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <GoalProgress
          goal={activeGoal}
          progress={goalProgress}
          animated={true}
          onPress={() => handleGoalSelect(activeGoal)}
          showDetails={true}
        />
      </Animated.View>
    );
  };

  /**
   * ⚡ Render Quick Actions
   */
  const renderQuickActions = () => (
    <Animated.View 
      style={[
        styles.quickActionsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Text style={styles.quickActionsTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {quickActions.map((action) => (
          <QuickActionButton
            key={action.id}
            action={action}
            size="medium"
            showLabel={true}
            animated={true}
          />
        ))}
      </View>
    </Animated.View>
  );

  /**
   * 📊 Render Performance Insights
   */
  const renderPerformanceInsights = () => {
    if (!performance || !improvementAreas || improvementAreas.length === 0) return null;

    return (
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Performance Insights</Text>
          <TouchableOpacity 
            style={styles.seeAllButton}
            onPress={() => navigation.navigate('Performance')}
          >
            <Text style={styles.seeAllText}>Details</Text>
            <Feather name="chevron-right" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.insightsContainer}>
          {improvementAreas.slice(0, 3).map((insight, index) => (
            <View key={index} style={styles.insightCard}>
              <View style={styles.insightIconContainer}>
                <Feather name="alert-circle" size={20} color={Colors.warning} />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>
                  {insight.description}
                </Text>
                {insight.action && (
                  <TouchableOpacity style={styles.insightAction}>
                    <Text style={styles.insightActionText}>
                      {insight.action}
                    </Text>
                    <Feather name="arrow-right" size={14} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      </Animated.View>
    );
  };

  /**
   * 🎯 Render Active Tab Content
   */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            {renderEarningsOverview()}
            {renderQuickActions()}
            {renderOpportunities()}
            {renderGoals()}
            {renderPerformanceInsights()}
          </>
        );
      
      case 'earnings':
        return (
          <>
            {renderEarningsOverview()}
            {renderQuickActions()}
          </>
        );
      
      case 'opportunities':
        return (
          <View style={styles.fullTabContent}>
            <Text style={styles.tabTitle}>All Opportunities</Text>
            {opportunitiesLoading ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : (
              <ScrollView style={styles.opportunitiesList}>
                {opportunities.map((opportunity) => (
                  <OpportunityCard
                    key={opportunity.id}
                    opportunity={opportunity}
                    expanded={true}
                    onSelect={() => handleOpportunitySelect(opportunity)}
                    style={styles.fullOpportunityCard}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        );
      
      case 'goals':
        return (
          <View style={styles.fullTabContent}>
            <Text style={styles.tabTitle}>Your Goals</Text>
            {goalsLoading ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : (
              <ScrollView style={styles.goalsList}>
                {goals.map((goal) => (
                  <GoalProgress
                    key={goal.id}
                    goal={goal}
                    expanded={true}
                    onPress={() => handleGoalSelect(goal)}
                    style={styles.fullGoalCard}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        );
      
      case 'performance':
        return (
          <View style={styles.fullTabContent}>
            <Text style={styles.tabTitle}>Performance Analytics</Text>
            {performanceLoading ? (
              <ActivityIndicator size="large" color={Colors.primary} />
            ) : (
              <ScrollView style={styles.performanceContent}>
                {/* Performance details would go here */}
                <Text>Performance analytics coming soon...</Text>
              </ScrollView>
            )}
          </View>
        );
      
      default:
        return null;
    }
  };

  /**
   * 🚨 Show Error Alert
   */
  const showErrorAlert = (title, message) => {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Try Again',
          onPress: refreshDashboard,
          style: 'default'
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  // 🎨 Loading State
  if (loading || isAnimating) {
    return <LoadingOverlay message="Loading your income dashboard..." />;
  }

  // 🚨 Error State
  if (earningsError || opportunitiesError || performanceError || goalsError) {
    return (
      <ErrorBoundary
        error={earningsError || opportunitiesError || performanceError || goalsError}
        onRetry={refreshDashboard}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 🎨 Background Gradient */}
      <LinearGradient
        colors={Gradients.background}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* 🔄 Refresh Control */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshDashboard}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
            title="Refreshing..."
            titleColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 🎯 Header */}
        {renderHeader()}

        {/* 🎨 Tab Navigation */}
        <View style={styles.tabContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabButton,
                  activeTab === tab.id && styles.tabButtonActive
                ]}
                onPress={() => handleTabChange(tab.id)}
              >
                <Feather 
                  name={tab.icon} 
                  size={18} 
                  color={activeTab === tab.id ? Colors.white : Colors.textSecondary} 
                />
                <Text style={[
                  styles.tabLabel,
                  activeTab === tab.id && styles.tabLabelActive
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 🎯 Tab Content */}
        <View style={styles.tabContent}>
          {renderTabContent()}
        </View>

        {/* 📱 Bottom Safe Area */}
        <View style={styles.bottomSafeArea} />
      </ScrollView>

      {/* 💰 Floating Withdraw Button */}
      {totalEarnings?.available > 100 && activeTab === 'overview' && (
        <Animated.View 
          style={[
            styles.floatingButtonContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.floatingButton}
            onPress={handleWithdraw}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={Gradients.success}
              style={styles.floatingButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Feather name="arrow-up-circle" size={24} color={Colors.white} />
              <Text style={styles.floatingButtonText}>
                Withdraw {formatCurrency(totalEarnings.available, 'ETB')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl * 2,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...Typography.heading1,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  profileButton: {
    marginLeft: Spacing.md,
  },
  profileGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.medium,
  },
  performanceContainer: {
    marginTop: Spacing.sm,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.heading2,
    color: Colors.textPrimary,
  },
  timeframeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 8,
    padding: 2,
  },
  timeframeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  timeframeButtonActive: {
    backgroundColor: Colors.primary,
  },
  timeframeText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  timeframeTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  earningsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
    marginBottom: Spacing.lg,
  },
  chartContainer: {
    height: 200,
    marginTop: Spacing.lg,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    ...Typography.caption,
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  opportunitiesScroll: {
    marginHorizontal: -Spacing.lg,
  },
  opportunitiesContent: {
    paddingHorizontal: Spacing.lg,
  },
  opportunityCard: {
    width: SCREEN_WIDTH * 0.75,
    marginRight: Spacing.md,
  },
  quickActionsContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  quickActionsTitle: {
    ...Typography.heading3,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  insightsContainer: {
    marginTop: Spacing.md,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'center',
  },
  insightIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  insightDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  insightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  insightActionText: {
    ...Typography.caption,
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  tabContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  tabScrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    marginRight: Spacing.sm,
    backgroundColor: Colors.surfaceVariant,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
    ...Shadows.small,
  },
  tabLabel: {
    ...Typography.subtitle,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  tabLabelActive: {
    color: Colors.white,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  fullTabContent: {
    marginHorizontal: Spacing.lg,
  },
  tabTitle: {
    ...Typography.heading2,
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  opportunitiesList: {
    marginTop: Spacing.md,
  },
  fullOpportunityCard: {
    marginBottom: Spacing.md,
  },
  goalsList: {
    marginTop: Spacing.md,
  },
  fullGoalCard: {
    marginBottom: Spacing.md,
  },
  performanceContent: {
    marginTop: Spacing.md,
  },
  bottomSafeArea: {
    height: Spacing.xl * 2,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 1000,
  },
  floatingButton: {
    ...Shadows.large,
  },
  floatingButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: 16,
  },
  floatingButtonText: {
    ...Typography.heading3,
    color: Colors.white,
    marginLeft: Spacing.md,
    fontWeight: '600',
  },
});

export default MakeMoney;