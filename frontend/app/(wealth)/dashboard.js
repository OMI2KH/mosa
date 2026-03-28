/**
 * 🏢 MOSA FORGE - Enterprise Student Dashboard
 * 💰 Wealth Creation & Skill Development Hub
 * 📊 Real-time Progress Tracking & Performance Analytics
 * 🎯 Personalized Learning Path & Income Projection
 * 🚀 Enterprise-Grade React Native Dashboard
 * 
 * @module StudentDashboard
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  Platform,
  Dimensions,
  Animated,
  TouchableOpacity,
  Alert
} from 'react-native';
import {
  Text,
  Card,
  ProgressBar,
  Chip,
  Button,
  IconButton,
  Avatar,
  Surface,
  Divider,
  Menu,
  Badge,
  ActivityIndicator
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🏗️ Enterprise Components
import HeaderNavigation from '../../components/navigation/HeaderNavigation';
import WealthMeter from '../../components/wealth/WealthMeter';
import SkillProgressCard from '../../components/skills/SkillProgressCard';
import IncomeProjectionChart from '../../components/wealth/IncomeProjectionChart';
import QuickActionsGrid from '../../components/navigation/QuickActionsGrid';
import RecentActivityFeed from '../../components/activity/RecentActivityFeed';
import QualityScoreDisplay from '../../components/quality/QualityScoreDisplay';
import ExpertConnectionCard from '../../components/expert/ExpertConnectionCard';
import MilestoneTracker from '../../components/progress/MilestoneTracker';
import ResourceRecommendation from '../../components/learning/ResourceRecommendation';

// 🎯 Custom Hooks
import useAuth from '../../hooks/useAuth';
import useDashboardData from '../../hooks/useDashboardData';
import useNotifications from '../../hooks/useNotifications';
import usePerformanceMetrics from '../../hooks/usePerformanceMetrics';

// 📊 Constants & Config
import {
  APP_CONFIG,
  DASHBOARD_CONFIG,
  WEALTH_CONFIG,
  LEARNING_PATHS,
  SKILL_CATEGORIES
} from '../../constants/dashboard';
import { formatCurrency, formatPercentage, formatDate } from '../../utils/formatters';

const { width, height } = Dimensions.get('window');

const StudentDashboard = ({ navigation, route }) => {
  // 🔐 Authentication & User Context
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const { 
    dashboardData, 
    isLoading: dataLoading, 
    refreshDashboard,
    error: dashboardError 
  } = useDashboardData();
  const { unreadCount, refreshNotifications } = useNotifications();
  const { metrics, refreshMetrics } = usePerformanceMetrics();

  // 🎯 State Management
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedCard, setExpandedCard] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [animationValues] = useState({
    fadeAnim: new Animated.Value(0),
    slideAnim: new Animated.Value(30),
    scaleAnim: new Animated.Value(0.95)
  });

  // 📊 Dashboard Data States
  const [wealthMetrics, setWealthMetrics] = useState({
    currentBalance: 0,
    projectedIncome: 0,
    totalEarnings: 0,
    growthRate: 0
  });

  const [learningProgress, setLearningProgress] = useState({
    currentSkill: null,
    completionPercentage: 0,
    daysRemaining: 0,
    nextMilestone: null
  });

  const [expertConnections, setExpertConnections] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [qualityMetrics, setQualityMetrics] = useState({
    overallScore: 0,
    breakdown: {},
    trend: 'stable'
  });

  // 🎯 Initialize Dashboard
  useEffect(() => {
    initializeDashboard();
    startEntranceAnimation();
  }, []);

  // 🔄 Refresh on Focus
  useFocusEffect(
    useCallback(() => {
      refreshDashboardData();
      return () => {
        // Cleanup if needed
      };
    }, [])
  );

  /**
   * 🏗️ INITIALIZE DASHBOARD
   */
  const initializeDashboard = async () => {
    try {
      await Promise.all([
        loadDashboardData(),
        refreshNotifications(),
        refreshMetrics()
      ]);
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
      showErrorAlert('Initialization Error', 'Failed to load dashboard data');
    }
  };

  /**
   * 📊 LOAD DASHBOARD DATA
   */
  const loadDashboardData = async () => {
    if (!dashboardData) return;

    // 💰 Wealth Metrics
    setWealthMetrics({
      currentBalance: dashboardData.wealth?.currentBalance || 0,
      projectedIncome: dashboardData.wealth?.projectedIncome || 0,
      totalEarnings: dashboardData.wealth?.totalEarnings || 0,
      growthRate: dashboardData.wealth?.growthRate || 0
    });

    // 🎓 Learning Progress
    setLearningProgress({
      currentSkill: dashboardData.learning?.currentSkill || null,
      completionPercentage: dashboardData.learning?.completionPercentage || 0,
      daysRemaining: dashboardData.learning?.daysRemaining || 0,
      nextMilestone: dashboardData.learning?.nextMilestone || null
    });

    // 👥 Expert Connections
    setExpertConnections(dashboardData.experts || []);

    // 📝 Recent Activities
    setRecentActivities(dashboardData.activities || []);

    // ⭐ Quality Metrics
    setQualityMetrics(dashboardData.quality || {
      overallScore: 0,
      breakdown: {},
      trend: 'stable'
    });
  };

  /**
   * 🎬 START ENTRANCE ANIMATION
   */
  const startEntranceAnimation = () => {
    Animated.parallel([
      Animated.timing(animationValues.fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(animationValues.slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(animationValues.scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  };

  /**
   * 🔄 REFRESH DASHBOARD DATA
   */
  const refreshDashboardData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshDashboard(),
        refreshUser(),
        refreshNotifications(),
        refreshMetrics()
      ]);
      
      // 🎯 Trigger haptic feedback on successful refresh
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error) {
      console.error('Dashboard refresh failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showErrorAlert('Refresh Error', 'Failed to refresh dashboard data');
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * 🎯 HANDLE QUICK ACTION
   */
  const handleQuickAction = (action) => {
    // 🎯 Trigger haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    switch (action.id) {
      case 'continue_learning':
        navigation.navigate('LearningSession', {
          skillId: learningProgress.currentSkill?.id
        });
        break;

      case 'schedule_session':
        navigation.navigate('SessionScheduler', {
          expertId: expertConnections[0]?.id
        });
        break;

      case 'view_progress':
        navigation.navigate('ProgressAnalytics');
        break;

      case 'earnings_tracker':
        navigation.navigate('EarningsDashboard');
        break;

      case 'resource_library':
        navigation.navigate('ResourceLibrary');
        break;

      case 'certification':
        navigation.navigate('CertificationCenter');
        break;

      default:
        console.log('Action not implemented:', action.id);
    }
  };

  /**
   * 💰 NAVIGATE TO WEALTH SECTION
   */
  const navigateToWealthSection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('WealthDashboard', {
      initialMetrics: wealthMetrics
    });
  };

  /**
   * 🎓 NAVIGATE TO LEARNING SECTION
   */
  const navigateToLearningSection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('LearningPath', {
      currentProgress: learningProgress
    });
  };

  /**
   * ⭐ NAVIGATE TO QUALITY SECTION
   */
  const navigateToQualitySection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('QualityMetrics', {
      metrics: qualityMetrics
    });
  };

  /**
   * 👥 NAVIGATE TO EXPERT SECTION
   */
  const navigateToExpertSection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('ExpertNetwork', {
      connections: expertConnections
    });
  };

  /**
   * 🚨 SHOW ERROR ALERT
   */
  const showErrorAlert = (title, message) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Try Again', onPress: refreshDashboardData },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  /**
   * 📊 RENDER LOADING STATE
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator 
        size="large" 
        color={APP_CONFIG.colors.primary}
        style={styles.loadingIndicator}
      />
      <Text style={styles.loadingText}>
        Loading your wealth creation journey...
      </Text>
    </View>
  );

  /**
   * 📊 RENDER ERROR STATE
   */
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <IconButton
        icon="alert-circle"
        size={64}
        color={APP_CONFIG.colors.error}
      />
      <Text style={styles.errorTitle}>
        Unable to Load Dashboard
      </Text>
      <Text style={styles.errorMessage}>
        {dashboardError?.message || 'Please check your connection and try again'}
      </Text>
      <Button
        mode="contained"
        onPress={refreshDashboardData}
        style={styles.retryButton}
        icon="refresh"
      >
        Retry
      </Button>
    </View>
  );

  /**
   * 💰 RENDER WEALTH OVERVIEW CARD
   */
  const renderWealthOverview = () => (
    <TouchableOpacity onPress={navigateToWealthSection} activeOpacity={0.9}>
      <Surface style={styles.wealthCard}>
        <LinearGradient
          colors={['#4c669f', '#3b5998', '#192f6a']}
          style={styles.wealthGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.wealthHeader}>
            <View>
              <Text style={styles.wealthTitle}>Wealth Creation</Text>
              <Text style={styles.wealthSubtitle}>Your Financial Journey</Text>
            </View>
            <IconButton
              icon="trending-up"
              size={24}
              color="#fff"
            />
          </View>

          <View style={styles.wealthMetrics}>
            <View style={styles.wealthMetric}>
              <Text style={styles.wealthMetricLabel}>Current Balance</Text>
              <Text style={styles.wealthMetricValue}>
                {formatCurrency(wealthMetrics.currentBalance)}
              </Text>
            </View>

            <View style={styles.wealthMetric}>
              <Text style={styles.wealthMetricLabel}>Projected Income</Text>
              <Text style={styles.wealthMetricValue}>
                {formatCurrency(wealthMetrics.projectedIncome)}/month
              </Text>
            </View>
          </View>

          <WealthMeter
            currentValue={wealthMetrics.currentBalance}
            targetValue={wealthMetrics.projectedIncome}
            growthRate={wealthMetrics.growthRate}
          />

          <View style={styles.wealthFooter}>
            <Chip
              icon="rocket-launch"
              mode="outlined"
              textStyle={{ color: '#fff' }}
              style={styles.wealthChip}
            >
              {formatPercentage(wealthMetrics.growthRate)} Growth
            </Chip>
            <Button
              mode="text"
              textColor="#fff"
              onPress={navigateToWealthSection}
              compact
            >
              View Details →
            </Button>
          </View>
        </LinearGradient>
      </Surface>
    </TouchableOpacity>
  );

  /**
   * 🎓 RENDER LEARNING PROGRESS CARD
   */
  const renderLearningProgress = () => (
    <TouchableOpacity onPress={navigateToLearningSection} activeOpacity={0.9}>
      <Card style={styles.learningCard}>
        <Card.Content>
          <View style={styles.learningHeader}>
            <View>
              <Text style={styles.learningTitle}>Skill Development</Text>
              <Text style={styles.learningSubtitle}>
                {learningProgress.currentSkill?.name || 'Select a Skill'}
              </Text>
            </View>
            <Badge size={24} style={styles.progressBadge}>
              {formatPercentage(learningProgress.completionPercentage)}
            </Badge>
          </View>

          <ProgressBar
            progress={learningProgress.completionPercentage / 100}
            color={APP_CONFIG.colors.primary}
            style={styles.progressBar}
          />

          <View style={styles.learningDetails}>
            <View style={styles.learningDetail}>
              <IconButton
                icon="calendar-clock"
                size={20}
                iconColor={APP_CONFIG.colors.secondary}
              />
              <Text style={styles.learningDetailText}>
                {learningProgress.daysRemaining} days remaining
              </Text>
            </View>

            {learningProgress.nextMilestone && (
              <View style={styles.learningDetail}>
                <IconButton
                  icon="flag-checkered"
                  size={20}
                  iconColor={APP_CONFIG.colors.success}
                />
                <Text style={styles.learningDetailText}>
                  Next: {learningProgress.nextMilestone.title}
                </Text>
              </View>
            )}
          </View>

          <SkillProgressCard
            skill={learningProgress.currentSkill}
            progress={learningProgress.completionPercentage}
            compact
          />
        </Card.Content>

        <Card.Actions>
          <Button
            mode="contained"
            onPress={() => handleQuickAction({ id: 'continue_learning' })}
            icon="play-circle"
            compact
          >
            Continue Learning
          </Button>
          <Button
            mode="outlined"
            onPress={navigateToLearningSection}
            compact
          >
            View All
          </Button>
        </Card.Actions>
      </Card>
    </TouchableOpacity>
  );

  /**
   * 👥 RENDER EXPERT CONNECTIONS
   */
  const renderExpertConnections = () => (
    <TouchableOpacity onPress={navigateToExpertSection} activeOpacity={0.9}>
      <Card style={styles.expertCard}>
        <Card.Content>
          <View style={styles.expertHeader}>
            <Text style={styles.expertTitle}>Expert Network</Text>
            <Badge size={24} style={styles.expertBadge}>
              {expertConnections.length}
            </Badge>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.expertScroll}
          >
            {expertConnections.slice(0, 3).map((expert, index) => (
              <ExpertConnectionCard
                key={expert.id}
                expert={expert}
                index={index}
                onPress={() => navigation.navigate('ExpertProfile', { expertId: expert.id })}
                compact
              />
            ))}
          </ScrollView>

          {expertConnections.length === 0 && (
            <View style={styles.emptyState}>
              <IconButton
                icon="account-search"
                size={48}
                iconColor={APP_CONFIG.colors.disabled}
              />
              <Text style={styles.emptyStateText}>
                No expert connections yet
              </Text>
              <Button
                mode="text"
                onPress={() => navigation.navigate('FindExperts')}
                compact
              >
                Find Experts
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  /**
   * ⭐ RENDER QUALITY METRICS
   */
  const renderQualityMetrics = () => (
    <TouchableOpacity onPress={navigateToQualitySection} activeOpacity={0.9}>
      <Card style={styles.qualityCard}>
        <Card.Content>
          <QualityScoreDisplay
            score={qualityMetrics.overallScore}
            breakdown={qualityMetrics.breakdown}
            trend={qualityMetrics.trend}
            showDetails={false}
          />
        </Card.Content>
        <Card.Actions>
          <Button
            mode="text"
            onPress={navigateToQualitySection}
            icon="chart-box"
            compact
          >
            View Details
          </Button>
        </Card.Actions>
      </Card>
    </TouchableOpacity>
  );

  /**
   * 📊 RENDER INCOME PROJECTION
   */
  const renderIncomeProjection = () => (
    <Card style={styles.incomeCard}>
      <Card.Content>
        <Text style={styles.incomeTitle}>Income Projection</Text>
        <IncomeProjectionChart
          currentIncome={wealthMetrics.currentBalance}
          projectedIncome={wealthMetrics.projectedIncome}
          timeframe="6 months"
          compact
        />
      </Card.Content>
    </Card>
  );

  /**
   * 🎯 RENDER QUICK ACTIONS
   */
  const renderQuickActions = () => (
    <QuickActionsGrid
      actions={DASHBOARD_CONFIG.quickActions}
      onActionPress={handleQuickAction}
      columns={3}
    />
  );

  /**
   * 📝 RENDER RECENT ACTIVITY
   */
  const renderRecentActivity = () => (
    <RecentActivityFeed
      activities={recentActivities}
      maxItems={5}
      onViewAll={() => navigation.navigate('ActivityHistory')}
    />
  );

  /**
   * 🏆 RENDER MILESTONE TRACKER
   */
  const renderMilestoneTracker = () => (
    <MilestoneTracker
      currentMilestone={learningProgress.nextMilestone}
      progress={learningProgress.completionPercentage}
      onMilestonePress={(milestone) => 
        navigation.navigate('MilestoneDetails', { milestoneId: milestone.id })
      }
    />
  );

  /**
   * 📚 RENDER RESOURCE RECOMMENDATIONS
   */
  const renderResourceRecommendations = () => (
    <ResourceRecommendation
      skillId={learningProgress.currentSkill?.id}
      category={learningProgress.currentSkill?.category}
      onResourcePress={(resource) => 
        navigation.navigate('ResourceViewer', { resourceId: resource.id })
      }
    />
  );

  // 🎯 Main Dashboard Render
  if (authLoading || dataLoading) {
    return renderLoadingState();
  }

  if (dashboardError) {
    return renderErrorState();
  }

  return (
    <SafeAreaView style={styles.container}>
      <HeaderNavigation
        title="Wealth Creation Hub"
        showNotifications={true}
        notificationCount={unreadCount}
        onNotificationPress={() => navigation.navigate('Notifications')}
        showMenu={true}
        onMenuPress={() => setShowMenu(!showMenu)}
      />

      {showMenu && (
        <Menu
          visible={showMenu}
          onDismiss={() => setShowMenu(false)}
          anchor={{ x: width - 50, y: 100 }}
          style={styles.menu}
        >
          <Menu.Item
            onPress={() => {
              setShowMenu(false);
              navigation.navigate('Settings');
            }}
            title="Settings"
            leadingIcon="cog"
          />
          <Menu.Item
            onPress={() => {
              setShowMenu(false);
              navigation.navigate('HelpCenter');
            }}
            title="Help Center"
            leadingIcon="help-circle"
          />
          <Menu.Item
            onPress={() => {
              setShowMenu(false);
              navigation.navigate('Feedback');
            }}
            title="Send Feedback"
            leadingIcon="message-alert"
          />
        </Menu>
      )}

      <Animated.View
        style={[
          styles.dashboardContent,
          {
            opacity: animationValues.fadeAnim,
            transform: [
              { translateY: animationValues.slideAnim },
              { scale: animationValues.scaleAnim }
            ]
          }
        ]}
      >
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshDashboardData}
              colors={[APP_CONFIG.colors.primary]}
              tintColor={APP_CONFIG.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 💰 Wealth Overview Section */}
          {renderWealthOverview()}

          {/* 🎓 Learning Progress Section */}
          {renderLearningProgress()}

          {/* 👥 Expert Connections Section */}
          {renderExpertConnections()}

          {/* ⭐ Quality Metrics Section */}
          {renderQualityMetrics()}

          {/* 🎯 Quick Actions Grid */}
          {renderQuickActions()}

          {/* 📊 Income Projection Section */}
          {renderIncomeProjection()}

          {/* 🏆 Milestone Tracker */}
          {renderMilestoneTracker()}

          {/* 📝 Recent Activity Feed */}
          {renderRecentActivity()}

          {/* 📚 Resource Recommendations */}
          {renderResourceRecommendations()}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

// 🎨 Enterprise Dashboard Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONFIG.colors.background,
  },
  dashboardContent: {
    flex: 1,
  },
  scrollContent: {
    padding: APP_CONFIG.spacing.md,
    paddingBottom: APP_CONFIG.spacing.xl * 2,
  },

  // 💰 Wealth Card Styles
  wealthCard: {
    borderRadius: APP_CONFIG.borderRadius.lg,
    elevation: 8,
    marginBottom: APP_CONFIG.spacing.lg,
    overflow: 'hidden',
  },
  wealthGradient: {
    padding: APP_CONFIG.spacing.lg,
  },
  wealthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: APP_CONFIG.spacing.md,
  },
  wealthTitle: {
    fontSize: APP_CONFIG.typography.h4,
    fontWeight: 'bold',
    color: '#fff',
  },
  wealthSubtitle: {
    fontSize: APP_CONFIG.typography.body2,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: APP_CONFIG.spacing.xs,
  },
  wealthMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: APP_CONFIG.spacing.md,
  },
  wealthMetric: {
    flex: 1,
  },
  wealthMetricLabel: {
    fontSize: APP_CONFIG.typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: APP_CONFIG.spacing.xs,
  },
  wealthMetricValue: {
    fontSize: APP_CONFIG.typography.h5,
    fontWeight: 'bold',
    color: '#fff',
  },
  wealthFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: APP_CONFIG.spacing.md,
  },
  wealthChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // 🎓 Learning Card Styles
  learningCard: {
    borderRadius: APP_CONFIG.borderRadius.lg,
    elevation: 4,
    marginBottom: APP_CONFIG.spacing.lg,
  },
  learningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: APP_CONFIG.spacing.md,
  },
  learningTitle: {
    fontSize: APP_CONFIG.typography.h5,
    fontWeight: 'bold',
    color: APP_CONFIG.colors.text.primary,
  },
  learningSubtitle: {
    fontSize: APP_CONFIG.typography.body2,
    color: APP_CONFIG.colors.text.secondary,
    marginTop: APP_CONFIG.spacing.xs,
  },
  progressBadge: {
    backgroundColor: APP_CONFIG.colors.primary,
    color: '#fff',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: APP_CONFIG.spacing.md,
  },
  learningDetails: {
    marginBottom: APP_CONFIG.spacing.md,
  },
  learningDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: APP_CONFIG.spacing.sm,
  },
  learningDetailText: {
    fontSize: APP_CONFIG.typography.body2,
    color: APP_CONFIG.colors.text.secondary,
    marginLeft: APP_CONFIG.spacing.xs,
  },

  // 👥 Expert Card Styles
  expertCard: {
    borderRadius: APP_CONFIG.borderRadius.lg,
    elevation: 4,
    marginBottom: APP_CONFIG.spacing.lg,
  },
  expertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: APP_CONFIG.spacing.md,
  },
  expertTitle: {
    fontSize: APP_CONFIG.typography.h5,
    fontWeight: 'bold',
    color: APP_CONFIG.colors.text.primary,
  },
  expertBadge: {
    backgroundColor: APP_CONFIG.colors.secondary,
    color: '#fff',
  },
  expertScroll: {
    flexDirection: 'row',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: APP_CONFIG.spacing.xl,
  },
  emptyStateText: {
    fontSize: APP_CONFIG.typography.body1,
    color: APP_CONFIG.colors.text.secondary,
    marginTop: APP_CONFIG.spacing.sm,
    marginBottom: APP_CONFIG.spacing.md,
    textAlign: 'center',
  },

  // ⭐ Quality Card Styles
  qualityCard: {
    borderRadius: APP_CONFIG.borderRadius.lg,
    elevation: 4,
    marginBottom: APP_CONFIG.spacing.lg,
  },

  // 📊 Income Card Styles
  incomeCard: {
    borderRadius: APP_CONFIG.borderRadius.lg,
    elevation: 4,
    marginBottom: APP_CONFIG.spacing.lg,
  },
  incomeTitle: {
    fontSize: APP_CONFIG.typography.h5,
    fontWeight: 'bold',
    color: APP_CONFIG.colors.text.primary,
    marginBottom: APP_CONFIG.spacing.md,
  },

  // 🎯 Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: APP_CONFIG.colors.background,
  },
  loadingIndicator: {
    marginBottom: APP_CONFIG.spacing.lg,
  },
  loadingText: {
    fontSize: APP_CONFIG.typography.body1,
    color: APP_CONFIG.colors.text.secondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: APP_CONFIG.colors.background,
    padding: APP_CONFIG.spacing.xl,
  },
  errorTitle: {
    fontSize: APP_CONFIG.typography.h5,
    fontWeight: 'bold',
    color: APP_CONFIG.colors.text.primary,
    marginTop: APP_CONFIG.spacing.md,
    marginBottom: APP_CONFIG.spacing.sm,
  },
  errorMessage: {
    fontSize: APP_CONFIG.typography.body1,
    color: APP_CONFIG.colors.text.secondary,
    textAlign: 'center',
    marginBottom: APP_CONFIG.spacing.lg,
  },
  retryButton: {
    marginTop: APP_CONFIG.spacing.md,
  },

  // 🍔 Menu Styles
  menu: {
    marginTop: APP_CONFIG.spacing.md,
    borderRadius: APP_CONFIG.borderRadius.md,
    elevation: 8,
  },
});

export default StudentDashboard;