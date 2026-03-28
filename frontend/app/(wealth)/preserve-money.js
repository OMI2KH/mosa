/**
 * 🏢 MOSA FORGE - Enterprise Wealth Preservation Module
 * 💰 Smart Money Management & Financial Discipline
 * 📊 Expense Tracking & Savings Optimization
 * 🛡️ Emergency Fund Building & Risk Management
 * 🚀 Microservice-Ready Frontend Architecture
 * 
 * @module PreserveMoney
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS
} from 'react-native-reanimated';

// 🏗️ Enterprise Components
import WealthHeader from '../../components/wealth/WealthHeader';
import FinancialMetricCard from '../../components/wealth/FinancialMetricCard';
import ExpenseCategoryChart from '../../components/wealth/ExpenseCategoryChart';
import SavingsGoalTracker from '../../components/wealth/SavingsGoalTracker';
import EmergencyFundDashboard from '../../components/wealth/EmergencyFundDashboard';
import FinancialInsightsPanel from '../../components/wealth/FinancialInsightsPanel';
import ActionPlanWidget from '../../components/wealth/ActionPlanWidget';

// 🔧 Enterprise Hooks
import useWealthMetrics from '../../hooks/useWealthMetrics';
import useFinancialData from '../../hooks/useFinancialData';
import usePreservationActions from '../../hooks/usePreservationActions';

// 📊 Enterprise Services
import FinancialAnalyticsService from '../../services/financial-analytics-service';
import WealthPreservationService from '../../services/wealth-preservation-service';

// 🎨 Design System
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Spacing from '../../constants/Spacing';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

const PreserveMoney = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const scrollViewRef = useRef(null);

  // 🏗️ State Management
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [financialMetrics, setFinancialMetrics] = useState(null);
  const [expenseData, setExpenseData] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [emergencyFund, setEmergencyFund] = useState(null);
  const [financialInsights, setFinancialInsights] = useState([]);
  const [actionPlans, setActionPlans] = useState([]);

  // 🎯 Animation Values
  const headerHeight = useSharedValue(180);
  const scrollOffset = useSharedValue(0);
  const cardOpacity = useSharedValue(1);

  // 🔧 Custom Hooks
  const { metrics, refreshMetrics } = useWealthMetrics();
  const { financialData, refreshFinancialData } = useFinancialData();
  const { actions, executeAction } = usePreservationActions();

  // 🎯 Tab Configuration
  const TABS = [
    { id: 'overview', label: 'Overview', icon: 'pie-chart' },
    { id: 'expenses', label: 'Expenses', icon: 'cash-outline' },
    { id: 'savings', label: 'Savings', icon: 'trending-up' },
    { id: 'emergency', label: 'Emergency', icon: 'shield-checkmark' },
    { id: 'insights', label: 'Insights', icon: 'bulb-outline' }
  ];

  /**
   * 🏗️ INITIALIZE MODULE
   */
  useEffect(() => {
    initializeModule();
    setupEventListeners();

    return () => {
      cleanupEventListeners();
    };
  }, []);

  /**
   * 🔄 HANDLE PULL-TO-REFRESH
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAllData();
      showSuccessNotification('Data refreshed successfully');
    } catch (error) {
      showErrorNotification('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * 🏗️ INITIALIZE MODULE DATA
   */
  const initializeModule = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadFinancialMetrics(),
        loadExpenseData(),
        loadSavingsGoals(),
        loadEmergencyFund(),
        loadFinancialInsights(),
        loadActionPlans()
      ]);
    } catch (error) {
      console.error('Module initialization failed:', error);
      showErrorNotification('Failed to load financial data');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 📊 LOAD FINANCIAL METRICS
   */
  const loadFinancialMetrics = async () => {
    try {
      const metrics = await FinancialAnalyticsService.getFinancialMetrics();
      setFinancialMetrics(metrics);
    } catch (error) {
      console.error('Failed to load financial metrics:', error);
      throw error;
    }
  };

  /**
   * 💸 LOAD EXPENSE DATA
   */
  const loadExpenseData = async () => {
    try {
      const expenses = await WealthPreservationService.getExpenseCategories();
      setExpenseData(expenses);
    } catch (error) {
      console.error('Failed to load expense data:', error);
      throw error;
    }
  };

  /**
   * 🎯 LOAD SAVINGS GOALS
   */
  const loadSavingsGoals = async () => {
    try {
      const goals = await WealthPreservationService.getSavingsGoals();
      setSavingsGoals(goals);
    } catch (error) {
      console.error('Failed to load savings goals:', error);
      throw error;
    }
  };

  /**
   * 🛡️ LOAD EMERGENCY FUND
   */
  const loadEmergencyFund = async () => {
    try {
      const fund = await WealthPreservationService.getEmergencyFundStatus();
      setEmergencyFund(fund);
    } catch (error) {
      console.error('Failed to load emergency fund:', error);
      throw error;
    }
  };

  /**
   * 💡 LOAD FINANCIAL INSIGHTS
   */
  const loadFinancialInsights = async () => {
    try {
      const insights = await FinancialAnalyticsService.generateInsights();
      setFinancialInsights(insights);
    } catch (error) {
      console.error('Failed to load financial insights:', error);
      throw error;
    }
  };

  /**
   * 📝 LOAD ACTION PLANS
   */
  const loadActionPlans = async () => {
    try {
      const plans = await WealthPreservationService.getActionPlans();
      setActionPlans(plans);
    } catch (error) {
      console.error('Failed to load action plans:', error);
      throw error;
    }
  };

  /**
   * 🔄 REFRESH ALL DATA
   */
  const refreshAllData = async () => {
    await Promise.all([
      loadFinancialMetrics(),
      loadExpenseData(),
      loadSavingsGoals(),
      loadEmergencyFund(),
      loadFinancialInsights(),
      loadActionPlans()
    ]);
  };

  /**
   * 🎯 HANDLE TAB CHANGE
   */
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    
    // Animate scroll to top when changing tabs
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }

    // Track analytics for tab change
    trackTabAnalytics(tabId);
  };

  /**
   * 💰 ADD EXPENSE
   */
  const handleAddExpense = () => {
    navigation.navigate('AddExpense', {
      onSave: async (expenseData) => {
        try {
          await WealthPreservationService.addExpense(expenseData);
          await loadExpenseData();
          await loadFinancialMetrics();
          showSuccessNotification('Expense added successfully');
        } catch (error) {
          showErrorNotification('Failed to add expense');
        }
      }
    });
  };

  /**
   * 🎯 UPDATE SAVINGS GOAL
   */
  const handleUpdateGoal = async (goalId, updates) => {
    try {
      await WealthPreservationService.updateSavingsGoal(goalId, updates);
      await loadSavingsGoals();
      showSuccessNotification('Savings goal updated');
    } catch (error) {
      showErrorNotification('Failed to update goal');
    }
  };

  /**
   * 🛡️ CONTRIBUTE TO EMERGENCY FUND
   */
  const handleEmergencyContribution = async (amount) => {
    try {
      const result = await WealthPreservationService.contributeToEmergencyFund(amount);
      if (result.success) {
        await loadEmergencyFund();
        await loadFinancialMetrics();
        showSuccessNotification(`Contributed ${amount} ETB to emergency fund`);
      } else {
        showErrorNotification(result.message);
      }
    } catch (error) {
      showErrorNotification('Failed to contribute to emergency fund');
    }
  };

  /**
   * 💡 IMPLEMENT INSIGHT ACTION
   */
  const handleImplementInsight = async (insightId) => {
    try {
      const result = await FinancialAnalyticsService.implementInsight(insightId);
      if (result.success) {
        await loadFinancialInsights();
        await loadActionPlans();
        showSuccessNotification('Insight implemented successfully');
      }
    } catch (error) {
      showErrorNotification('Failed to implement insight');
    }
  };

  /**
   * 📊 TRACK TAB ANALYTICS
   */
  const trackTabAnalytics = (tabId) => {
    // Implement analytics tracking
    console.log(`Tab changed to: ${tabId}`);
  };

  /**
   * 🎨 ANIMATED HEADER STYLE
   */
  const animatedHeaderStyle = useAnimatedStyle(() => {
    return {
      height: withSpring(headerHeight.value, {
        damping: 20,
        stiffness: 90
      }),
      opacity: withTiming(cardOpacity.value, { duration: 300 })
    };
  });

  /**
   * 🔄 HANDLE SCROLL
   */
  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollOffset.value = offsetY;

    // Animate header on scroll
    if (offsetY > 50) {
      headerHeight.value = 120;
      cardOpacity.value = 0.9;
    } else {
      headerHeight.value = 180;
      cardOpacity.value = 1;
    }
  };

  /**
   * 🏗️ SETUP EVENT LISTENERS
   */
  const setupEventListeners = () => {
    // Setup any event listeners here
  };

  /**
   * 🧹 CLEANUP EVENT LISTENERS
   */
  const cleanupEventListeners = () => {
    // Cleanup event listeners here
  };

  /**
   * 📱 SHOW SUCCESS NOTIFICATION
   */
  const showSuccessNotification = (message) => {
    Alert.alert('Success', message, [{ text: 'OK' }]);
  };

  /**
   * ❌ SHOW ERROR NOTIFICATION
   */
  const showErrorNotification = (message) => {
    Alert.alert('Error', message, [{ text: 'OK' }]);
  };

  /**
   * 🎨 RENDER HEADER
   */
  const renderHeader = () => {
    return (
      <Animated.View style={[styles.headerContainer, animatedHeaderStyle]}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <WealthHeader
            title="Wealth Preservation"
            subtitle="Protect & Grow Your Money"
            icon="shield-checkmark"
            variant="preservation"
          />
          
          <View style={styles.headerMetrics}>
            <FinancialMetricCard
              title="Preservation Score"
              value={financialMetrics?.preservationScore || 0}
              unit="/100"
              trend="up"
              change={financialMetrics?.scoreChange || 0}
              size="small"
            />
            
            <FinancialMetricCard
              title="Monthly Savings"
              value={financialMetrics?.monthlySavings || 0}
              unit="ETB"
              trend={financialMetrics?.savingsTrend || 'neutral'}
              change={financialMetrics?.savingsChange || 0}
              size="small"
            />
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  /**
   * 🎨 RENDER TAB NAVIGATION
   */
  const renderTabNavigation = () => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabContainer}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabItem,
              activeTab === tab.id && styles.tabItemActive
            ]}
            onPress={() => handleTabChange(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={activeTab === tab.id ? Colors.white : Colors.gray}
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
    );
  };

  /**
   * 🎨 RENDER ACTIVE TAB CONTENT
   */
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewContent();
      case 'expenses':
        return renderExpensesContent();
      case 'savings':
        return renderSavingsContent();
      case 'emergency':
        return renderEmergencyContent();
      case 'insights':
        return renderInsightsContent();
      default:
        return renderOverviewContent();
    }
  };

  /**
   * 🎨 RENDER OVERVIEW CONTENT
   */
  const renderOverviewContent = () => {
    return (
      <View style={styles.contentContainer}>
        {/* Expense Categories */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
        >
          <ExpenseCategoryChart
            data={expenseData}
            onCategoryPress={(category) => {
              navigation.navigate('ExpenseDetails', { category });
            }}
          />
        </MotiView>

        {/* Savings Goals */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 100 }}
        >
          <SavingsGoalTracker
            goals={savingsGoals}
            onGoalUpdate={handleUpdateGoal}
            onGoalPress={(goal) => {
              navigation.navigate('GoalDetails', { goal });
            }}
          />
        </MotiView>

        {/* Emergency Fund Status */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 200 }}
        >
          <EmergencyFundDashboard
            fund={emergencyFund}
            onContribute={handleEmergencyContribution}
          />
        </MotiView>
      </View>
    );
  };

  /**
   * 🎨 RENDER EXPENSES CONTENT
   */
  const renderExpensesContent = () => {
    return (
      <View style={styles.contentContainer}>
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 100 }}
        >
          <ExpenseCategoryChart
            data={expenseData}
            expanded={true}
            showControls={true}
            onAddExpense={handleAddExpense}
          />
        </MotiView>

        {/* Expense Insights */}
        {financialInsights
          .filter(insight => insight.category === 'expense')
          .map((insight, index) => (
            <MotiView
              key={insight.id}
              from={{ opacity: 0, translateX: -20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 300, delay: index * 100 }}
            >
              <FinancialInsightsPanel
                insight={insight}
                onImplement={() => handleImplementInsight(insight.id)}
              />
            </MotiView>
          ))}
      </View>
    );
  };

  /**
   * 🎨 RENDER SAVINGS CONTENT
   */
  const renderSavingsContent = () => {
    return (
      <View style={styles.contentContainer}>
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 100 }}
        >
          <SavingsGoalTracker
            goals={savingsGoals}
            expanded={true}
            showControls={true}
            onGoalUpdate={handleUpdateGoal}
          />
        </MotiView>

        {/* Savings Action Plans */}
        {actionPlans
          .filter(plan => plan.category === 'savings')
          .map((plan, index) => (
            <MotiView
              key={plan.id}
              from={{ opacity: 0, translateX: 20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 300, delay: index * 100 }}
            >
              <ActionPlanWidget
                plan={plan}
                onExecute={() => executeAction(plan.id)}
              />
            </MotiView>
          ))}
      </View>
    );
  };

  /**
   * 🎨 RENDER EMERGENCY CONTENT
   */
  const renderEmergencyContent = () => {
    return (
      <View style={styles.contentContainer}>
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', delay: 100 }}
        >
          <EmergencyFundDashboard
            fund={emergencyFund}
            expanded={true}
            showControls={true}
            onContribute={handleEmergencyContribution}
          />
        </MotiView>

        {/* Emergency Preparedness Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.sectionTitle}>Emergency Preparedness Tips</Text>
          {[
            'Maintain 3-6 months of living expenses',
            'Keep emergency fund in liquid assets',
            'Regularly review and adjust fund amount',
            'Consider insurance for major risks',
            'Automate contributions to build fund faster'
          ].map((tip, index) => (
            <MotiView
              key={index}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300, delay: index * 100 }}
            >
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            </MotiView>
          ))}
        </View>
      </View>
    );
  };

  /**
   * 🎨 RENDER INSIGHTS CONTENT
   */
  const renderInsightsContent = () => {
    return (
      <View style={styles.contentContainer}>
        {/* All Financial Insights */}
        {financialInsights.map((insight, index) => (
          <MotiView
            key={insight.id}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: index * 100 }}
          >
            <FinancialInsightsPanel
              insight={insight}
              expanded={true}
              onImplement={() => handleImplementInsight(insight.id)}
            />
          </MotiView>
        ))}

        {/* Action Plans */}
        <Text style={styles.sectionTitle}>Recommended Actions</Text>
        {actionPlans.map((plan, index) => (
          <MotiView
            key={plan.id}
            from={{ opacity: 0, translateX: index % 2 === 0 ? -20 : 20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 300, delay: index * 100 }}
          >
            <ActionPlanWidget
              plan={plan}
              onExecute={() => executeAction(plan.id)}
            />
          </MotiView>
        ))}
      </View>
    );
  };

  /**
   * 🎨 RENDER LOADING STATE
   */
  const renderLoadingState = () => {
    return (
      <View style={styles.loadingContainer}>
        <MotiView
          from={{ rotate: '0deg' }}
          animate={{ rotate: '360deg' }}
          transition={{
            type: 'timing',
            duration: 1000,
            loop: true
          }}
        >
          <Ionicons name="refresh-circle" size={60} color={Colors.primary} />
        </MotiView>
        <Text style={styles.loadingText}>Loading Wealth Data...</Text>
      </View>
    );
  };

  /**
   * 🎨 MAIN RENDER
   */
  if (isLoading) {
    return renderLoadingState();
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      {renderHeader()}

      {/* Tab Navigation */}
      {renderTabNavigation()}

      {/* Main Content */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Active Tab Content */}
        {renderActiveTabContent()}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddExpense}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

/**
 * 🎨 STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? Spacing.xl : Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  headerMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  tabContainer: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.md,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginRight: Spacing.sm,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabLabel: {
    ...Typography.body,
    marginLeft: Spacing.xs,
    color: Colors.gray,
  },
  tabLabelActive: {
    ...Typography.bodyBold,
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.gray,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
    marginTop: Spacing.xl,
  },
  tipsContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  tipText: {
    ...Typography.body,
    color: Colors.text,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSpacing: {
    height: Spacing.xxl * 2,
  },
});

export default PreserveMoney;