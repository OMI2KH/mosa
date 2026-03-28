/**
 * 🏢 MOSA FORGE - Enterprise Home Dashboard
 * 🏠 Main Landing Page & Dashboard Interface
 * 📊 Real-time Platform Analytics & Performance Metrics
 * 🚀 Personalized Learning Journey & Course Recommendations
 * 💰 Revenue Tracking & Expert Performance Insights
 * 🎯 Enterprise-Grade React Native Implementation
 * 
 * @module HomeDashboard
 * @version Enterprise 2.0
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
  TouchableOpacity,
  SafeAreaView,
  Image,
  Dimensions,
  StatusBar,
  Platform,
  Alert,
  Animated,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';

// 🏗️ Enterprise Components
import DashboardHeader from '../../components/shared/DashboardHeader';
import PlatformMetricsCard from '../../components/analytics/PlatformMetricsCard';
import LearningProgressCard from '../../components/learning/LearningProgressCard';
import RevenueInsightsCard from '../../components/revenue/RevenueInsightsCard';
import QuickActionsPanel from '../../components/actions/QuickActionsPanel';
import CourseRecommendations from '../../components/recommendations/CourseRecommendations';
import PerformanceChart from '../../components/charts/PerformanceChart';
import AnnouncementCarousel from '../../components/notifications/AnnouncementCarousel';

// 🎯 Custom Hooks
import useAuth from '../../hooks/useAuth';
import usePlatformMetrics from '../../hooks/usePlatformMetrics';
import useLearningProgress from '../../hooks/useLearningProgress';
import useRevenueAnalytics from '../../hooks/useRevenueAnalytics';
import useNotifications from '../../hooks/useNotifications';

// 🚀 Enterprise Configuration
const { width, height } = Dimensions.get('window');
const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight;

const HomeDashboard = () => {
  // 🔄 Navigation & Authentication
  const navigation = useNavigation();
  const { user, isAuthenticated, userRole, logout } = useAuth();

  // 🎯 State Management
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [greeting, setGreeting] = useState('');
  const [scrollY] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 📊 Data Hooks
  const {
    platformMetrics,
    loading: metricsLoading,
    error: metricsError,
    refreshMetrics,
    lastUpdated
  } = usePlatformMetrics();

  const {
    learningProgress,
    loading: progressLoading,
    error: progressError,
    refreshProgress
  } = useLearningProgress();

  const {
    revenueAnalytics,
    loading: revenueLoading,
    error: revenueError,
    refreshRevenue
  } = useRevenueAnalytics();

  const {
    unreadNotifications,
    announcements,
    loading: notificationsLoading,
    refreshNotifications
  } = useNotifications();

  // 🎨 Animation Values
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [280, 120],
    extrapolate: 'clamp'
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 80, 100],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp'
  });

  // 🕐 Set Greeting Based on Time
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  // 🔄 Load Initial Data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // 🔄 Refresh on Focus
  useFocusEffect(
    useCallback(() => {
      refreshDashboardData();
    }, [])
  );

  /**
   * 📊 LOAD DASHBOARD DATA
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // ⚡ Parallel Data Loading
      await Promise.allSettled([
        refreshMetrics(),
        refreshProgress(),
        refreshRevenue(),
        refreshNotifications()
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Dashboard data loading failed:', error);
      setError('Failed to load dashboard data. Please try again.');
      setLoading(false);
    }
  };

  /**
   * 🔄 REFRESH DASHBOARD DATA
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadDashboardData();
    } catch (error) {
      console.error('Refresh failed:', error);
      Alert.alert('Refresh Error', 'Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  /**
   * 📊 GET USER-SPECIFIC DASHBOARD CONTENT
   */
  const getDashboardContent = useMemo(() => {
    switch (userRole) {
      case 'student':
        return <StudentDashboardContent />;
      case 'expert':
        return <ExpertDashboardContent />;
      case 'admin':
        return <AdminDashboardContent />;
      default:
        return <GuestDashboardContent />;
    }
  }, [userRole]);

  /**
   * 🎓 STUDENT DASHBOARD CONTENT
   */
  const StudentDashboardContent = () => (
    <>
      {/* 📚 Learning Progress Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🎯 Your Learning Journey</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Progress')}>
            <Text style={styles.seeAll}>View All →</Text>
          </TouchableOpacity>
        </View>
        <LearningProgressCard
          progress={learningProgress}
          loading={progressLoading}
          onPress={() => navigation.navigate('CourseDetails', { courseId: learningProgress.activeCourseId })}
        />
      </View>

      {/* 🚀 Quick Actions for Students */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 Quick Actions</Text>
        <QuickActionsPanel
          actions={[
            {
              icon: 'book',
              title: 'Continue Learning',
              subtitle: 'Resume your current course',
              action: () => navigation.navigate('Learning'),
              color: '#4CAF50'
            },
            {
              icon: 'calendar',
              title: 'Schedule Session',
              subtitle: 'Book time with your expert',
              action: () => navigation.navigate('Sessions'),
              color: '#2196F3'
            },
            {
              icon: 'star',
              title: 'Give Feedback',
              subtitle: 'Rate your expert',
              action: () => navigation.navigate('Feedback'),
              color: '#FF9800'
            },
            {
              icon: 'certificate',
              title: 'Get Certified',
              subtitle: 'Complete certification',
              action: () => navigation.navigate('Certification'),
              color: '#9C27B0'
            }
          ]}
        />
      </View>

      {/* 💡 Course Recommendations */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💡 Recommended for You</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Skills')}>
            <Text style={styles.seeAll}>Browse All →</Text>
          </TouchableOpacity>
        </View>
        <CourseRecommendations
          userId={user?.id}
          skillCategory={learningProgress?.currentSkillCategory}
          limit={3}
        />
      </View>
    </>
  );

  /**
   * 👨‍🏫 EXPERT DASHBOARD CONTENT
   */
  const ExpertDashboardContent = () => (
    <>
      {/* 💰 Revenue & Performance Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💰 Earnings & Performance</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Earnings')}>
            <Text style={styles.seeAll}>Details →</Text>
          </TouchableOpacity>
        </View>
        <RevenueInsightsCard
          analytics={revenueAnalytics}
          loading={revenueLoading}
          showDetailed={true}
        />
      </View>

      {/* 📊 Performance Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Quality Metrics</Text>
        <View style={styles.metricsGrid}>
          {[
            { label: 'Quality Score', value: '4.8', icon: 'star', color: '#FFD700' },
            { label: 'Students', value: '42', icon: 'users', color: '#4CAF50' },
            { label: 'Completion', value: '92%', icon: 'check-circle', color: '#2196F3' },
            { label: 'Rating', value: '4.9', icon: 'thumbs-up', color: '#FF9800' }
          ].map((metric, index) => (
            <View key={index} style={styles.metricCard}>
              <View style={[styles.metricIcon, { backgroundColor: metric.color + '20' }]}>
                <FontAwesome5 name={metric.icon} size={20} color={metric.color} />
              </View>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 👥 Student Management */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>👥 Your Students</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Students')}>
            <Text style={styles.seeAll}>Manage →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.studentList}>
          {/* Student list component would go here */}
          <Text style={styles.comingSoon}>Student Management Coming Soon</Text>
        </View>
      </View>
    </>
  );

  /**
   * 👑 ADMIN DASHBOARD CONTENT
   */
  const AdminDashboardContent = () => (
    <>
      {/* 📊 Platform Overview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Platform Overview</Text>
        <PlatformMetricsCard
          metrics={platformMetrics}
          loading={metricsLoading}
          showDetailed={true}
        />
      </View>

      {/* 📈 Performance Charts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Platform Performance</Text>
        <PerformanceChart
          data={platformMetrics?.performanceTrends || []}
          type="line"
          height={200}
        />
      </View>

      {/* 💰 Revenue Analytics */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>💰 Revenue Analytics</Text>
          <TouchableOpacity onPress={() => navigation.navigate('RevenueAnalytics')}>
            <Text style={styles.seeAll}>Details →</Text>
          </TouchableOpacity>
        </View>
        <RevenueInsightsCard
          analytics={revenueAnalytics}
          loading={revenueLoading}
          showBreakdown={true}
        />
      </View>

      {/* 🚨 System Health */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚨 System Health</Text>
        <View style={styles.healthGrid}>
          {[
            { service: 'API Gateway', status: 'healthy', latency: '45ms' },
            { service: 'Database', status: 'healthy', latency: '120ms' },
            { service: 'Payment', status: 'warning', latency: '280ms' },
            { service: 'Learning', status: 'healthy', latency: '75ms' }
          ].map((service, index) => (
            <View key={index} style={styles.healthCard}>
              <View style={styles.healthHeader}>
                <Text style={styles.healthService}>{service.service}</Text>
                <View style={[
                  styles.healthStatus,
                  { backgroundColor: service.status === 'healthy' ? '#4CAF50' : '#FF9800' }
                ]}>
                  <Text style={styles.healthStatusText}>{service.status}</Text>
                </View>
              </View>
              <Text style={styles.healthLatency}>Latency: {service.latency}</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );

  /**
   * 👋 GUEST DASHBOARD CONTENT
   */
  const GuestDashboardContent = () => (
    <>
      {/* 🚀 Hero Section */}
      <View style={styles.heroSection}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.heroGradient}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>🚀 Transform Your Skills</Text>
            <Text style={styles.heroSubtitle}>
              Join 10,000+ Ethiopians mastering high-income skills in just 4 months
            </Text>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => navigation.navigate('Auth', { screen: 'Register' })}
            >
              <Text style={styles.heroButtonText}>Start Your Journey - 1,999 ETB</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* 💡 Features Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Why Choose MOSA FORGE?</Text>
        <View style={styles.featuresGrid}>
          {[
            {
              icon: 'shield-checkmark',
              title: 'Quality Guaranteed',
              description: 'Auto-expert switching if quality drops'
            },
            {
              icon: 'cash',
              title: 'Income Ready',
              description: 'Start earning immediately after certification'
            },
            {
              icon: 'time',
              title: '4-Month Program',
              description: 'From zero to income in just 4 months'
            },
            {
              icon: 'school',
              title: '40+ Skills',
              description: 'Choose from our extensive skill catalog'
            }
          ].map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon} size={32} color="#667eea" />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 📊 Platform Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Platform Statistics</Text>
        <View style={styles.statsGrid}>
          {[
            { value: '10,000+', label: 'Students Trained' },
            { value: '500+', label: 'Verified Experts' },
            { value: '95%', label: 'Completion Rate' },
            { value: '₵50M+', label: 'Revenue Generated' }
          ].map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </>
  );

  /**
   * 🏆 DASHBOARD HEADER
   */
  const DashboardHeaderComponent = () => (
    <Animated.View style={[styles.header, { height: headerHeight }]}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={StyleSheet.absoluteFill}
      />
      
      <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
        {/* User Greeting */}
        <View style={styles.userGreeting}>
          <View>
            <Text style={styles.greetingText}>{greeting}</Text>
            <Text style={styles.userName}>
              {user?.firstName || 'Guest'}
              {user?.lastName ? ` ${user.lastName}` : ''}
            </Text>
          </View>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user?.firstName?.charAt(0) || 'G'}
              </Text>
            </View>
          )}
        </View>

        {/* User Stats */}
        {isAuthenticated && (
          <View style={styles.userStats}>
            {[
              { label: 'Courses', value: learningProgress?.activeCourses || 0 },
              { label: 'Progress', value: `${learningProgress?.overallProgress || 0}%` },
              { label: 'Streak', value: `${learningProgress?.learningStreak || 0} days` }
            ].map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Notifications & Actions */}
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color="#fff" />
          {unreadNotifications > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationCount}>
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  /**
   * 📱 MAIN RENDER
   */
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <Ionicons name="alert-circle-outline" size={64} color="#FF5252" />
        <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadDashboardData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* 📢 Announcements Carousel */}
      {announcements.length > 0 && (
        <AnnouncementCarousel announcements={announcements} />
      )}

      {/* 🏆 Dashboard Header */}
      <DashboardHeaderComponent />

      {/* 📱 Main Content */}
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea']}
            tintColor="#667eea"
          />
        }
      >
        {/* 📊 Role-Specific Dashboard Content */}
        {getDashboardContent}

        {/* 🏢 Platform Stats (All Users) */}
        {isAuthenticated && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏢 MOSA FORGE Platform</Text>
            <View style={styles.platformStats}>
              <View style={styles.platformStat}>
                <MaterialIcons name="people" size={24} color="#667eea" />
                <View style={styles.platformStatInfo}>
                  <Text style={styles.platformStatValue}>
                    {platformMetrics?.totalStudents?.toLocaleString() || '0'}
                  </Text>
                  <Text style={styles.platformStatLabel}>Active Students</Text>
                </View>
              </View>
              <View style={styles.platformStat}>
                <FontAwesome5 name="user-tie" size={24} color="#764ba2" />
                <View style={styles.platformStatInfo}>
                  <Text style={styles.platformStatValue}>
                    {platformMetrics?.totalExperts?.toLocaleString() || '0'}
                  </Text>
                  <Text style={styles.platformStatLabel}>Verified Experts</Text>
                </View>
              </View>
              <View style={styles.platformStat}>
                <Ionicons name="trending-up" size={24} color="#4CAF50" />
                <View style={styles.platformStatInfo}>
                  <Text style={styles.platformStatValue}>
                    {platformMetrics?.completionRate || '0'}%
                  </Text>
                  <Text style={styles.platformStatLabel}>Completion Rate</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 📱 Quick Access Tabs */}
        <View style={styles.tabContainer}>
          {[
            { id: 'learning', icon: 'book', label: 'Learn', color: '#4CAF50' },
            { id: 'experts', icon: 'user-tie', label: 'Experts', color: '#2196F3' },
            { id: 'courses', icon: 'graduation-cap', label: 'Courses', color: '#FF9800' },
            { id: 'earnings', icon: 'wallet', label: 'Earnings', color: '#9C27B0' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabItem}
              onPress={() => navigation.navigate(tab.id)}
            >
              <View style={[styles.tabIcon, { backgroundColor: tab.color + '20' }]}>
                <FontAwesome5 name={tab.icon} size={20} color={tab.color} />
              </View>
              <Text style={styles.tabLabel}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 📝 Last Updated */}
        {lastUpdated && (
          <View style={styles.lastUpdated}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.lastUpdatedText}>
              Updated {new Date(lastUpdated).toLocaleTimeString()}
            </Text>
          </View>
        )}

        {/* 🚀 Footer CTA for Guests */}
        {!isAuthenticated && (
          <View style={styles.footerCta}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.footerGradient}
            >
              <Text style={styles.footerTitle}>Ready to Transform Your Future?</Text>
              <Text style={styles.footerSubtitle}>
                Join Ethiopia's #1 skills training platform
              </Text>
              <View style={styles.footerButtons}>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonPrimary]}
                  onPress={() => navigation.navigate('Auth', { screen: 'Register' })}
                >
                  <Text style={styles.footerButtonText}>Start Free Trial</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButton, styles.footerButtonSecondary]}
                  onPress={() => navigation.navigate('Skills')}
                >
                  <Text style={styles.footerButtonSecondaryText}>Browse Courses</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* 📄 Empty Space for Scroll */}
        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

/**
 * 🎨 ENTERPRISE-LEVEL STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Medium',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 120,
    paddingBottom: 100,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: STATUSBAR_HEIGHT + 16,
    paddingBottom: 24,
  },
  userGreeting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  userName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    marginTop: 4,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#fff',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  headerActions: {
    position: 'absolute',
    top: STATUSBAR_HEIGHT + 16,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    marginRight: 16,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#FF5252',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationCount: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  menuButton: {
    opacity: 0.9,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  seeAll: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#667eea',
  },
  heroSection: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  heroGradient: {
    padding: 24,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  heroButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 4,
  },
  heroButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#667eea',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 4,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#667eea',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 4,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  studentList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoon: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#999',
    fontStyle: 'italic',
  },
  healthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  healthCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthService: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  healthStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  healthStatusText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#fff',
  },
  healthLatency: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  platformStats: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  platformStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  platformStatInfo: {
    marginLeft: 12,
  },
  platformStatValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 2,
  },
  platformStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 20,
    paddingVertical: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
  },
  tabIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#333',
  },
  lastUpdated: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lastUpdatedText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginLeft: 8,
  },
  footerCta: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
  },
  footerGradient: {
    padding: 24,
    alignItems: 'center',
  },
  footerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  footerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 20,
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  footerButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  footerButtonPrimary: {
    backgroundColor: '#fff',
  },
  footerButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  footerButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#667eea',
  },
  footerButtonSecondaryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  bottomSpacer: {
    height: 100,
  },
});

export default HomeDashboard;