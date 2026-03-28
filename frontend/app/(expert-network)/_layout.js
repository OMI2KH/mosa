/**
 * 🏢 MOSA FORGE - Expert Network Navigation Layout
 * 🧭 Enterprise-Grade Expert Portal Navigation Architecture
 * 🔐 Role-Based Route Protection & Access Control
 * 📱 Responsive Navigation with Dynamic Tabs
 * 🎯 Progressive Enhancement & Performance Optimization
 * 
 * @module ExpertNetworkLayout
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  Platform,
  BackHandler,
  Alert
} from 'react-native';
import { 
  createDrawerNavigator, 
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem 
} from '@react-navigation/drawer';
import { 
  createStackNavigator, 
  CardStyleInterpolators 
} from '@react-navigation/stack';
import { 
  createBottomTabNavigator, 
  BottomTabBar 
} from '@react-navigation/bottom-tabs';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetInfo } from '@react-native-community/netinfo';

// 🏗️ Enterprise Dependencies
import EnterpriseLogger from '../../utils/enterprise-logger';
import SecurityManager from '../../utils/security-manager';
import PerformanceMonitor from '../../utils/performance-monitor';
import AnalyticsTracker from '../../utils/analytics-tracker';
import NetworkInterceptor from '../../utils/network-interceptor';

// 🎨 Design System Components
import { 
  MOSAColors, 
  MOSATypography, 
  MOSASpacing, 
  MOSAIcons 
} from '../../design-system';
import { 
  LoadingOverlay, 
  ErrorBoundary, 
  NetworkStatusBar,
  SessionTimeoutModal,
  PermissionGuard
} from '../../components/shared';

// 📱 Expert Portal Screens
import ExpertDashboard from './dashboard';
import StudentRoster from './student-roster';
import QualityDashboard from './quality-dashboard';
import SessionScheduler from './session-scheduler';
import PayoutTracker from './payout-tracker';
import PerformanceAnalytics from './performance-analytics';
import Settings from './settings';
import HelpSupport from './help-support';
import TrainingResources from './training-resources';

// 🧩 Navigation Components
import ExpertTabBar from '../../components/navigation/ExpertTabBar';
import ExpertDrawerContent from '../../components/navigation/ExpertDrawerContent';
import NavigationHeader from '../../components/navigation/NavigationHeader';
import NavigationGuard from '../../components/navigation/NavigationGuard';

// 🔧 Constants & Configurations
import { 
  EXPERT_ROUTES, 
  EXPERT_PERMISSIONS, 
  NAVIGATION_CONFIG,
  SESSION_TIMEOUT,
  CACHE_CONFIG 
} from '../../constants/navigation';

// 🏗️ Create Navigation Instances
const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * 🎯 EXPERT BOTTOM TAB NAVIGATOR
 * Primary navigation for expert portal with 5 main tabs
 */
const ExpertTabNavigator = React.memo(() => {
  const navigation = useNavigation();
  const route = useRoute();
  const [badgeCounts, setBadgeCounts] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');
  const logger = EnterpriseLogger.getInstance();

  // 📊 Track tab changes for analytics
  useFocusEffect(
    useCallback(() => {
      const trackTabChange = async () => {
        try {
          await AnalyticsTracker.trackEvent('expert_tab_changed', {
            from: activeTab,
            to: route.name,
            timestamp: new Date().toISOString()
          });
          setActiveTab(route.name);
        } catch (error) {
          logger.error('Failed to track tab change', { error: error.message });
        }
      };

      trackTabChange();
    }, [route.name])
  );

  return (
    <ErrorBoundary
      fallback={<LoadingOverlay message="Navigation error occurred" />}
    >
      <Tab.Navigator
        initialRouteName="dashboard"
        tabBar={props => (
          <ExpertTabBar
            {...props}
            badgeCounts={badgeCounts}
            activeTab={activeTab}
          />
        )}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarStyle: styles.tabBar,
          lazy: true,
          unmountOnBlur: false
        }}
      >
        {/* 🎯 Dashboard Tab */}
        <Tab.Screen
          name="dashboard"
          component={ExpertDashboard}
          options={{
            tabBarLabel: EXPERT_ROUTES.dashboard.label,
            tabBarIcon: ({ focused, color, size }) => (
              <MOSAIcons.Dashboard 
                size={size} 
                color={color} 
                filled={focused}
              />
            ),
            tabBarTestID: 'tab-dashboard'
          }}
          listeners={{
            tabPress: e => {
              AnalyticsTracker.trackEvent('expert_dashboard_tab_pressed');
            }
          }}
        />

        {/* 👥 Student Roster Tab */}
        <Tab.Screen
          name="student-roster"
          component={StudentRoster}
          options={{
            tabBarLabel: EXPERT_ROUTES.studentRoster.label,
            tabBarIcon: ({ focused, color, size }) => (
              <MOSAIcons.Students 
                size={size} 
                color={color} 
                filled={focused}
              />
            ),
            tabBarBadge: badgeCounts.students || undefined,
            tabBarTestID: 'tab-students'
          }}
          listeners={{
            tabPress: e => {
              AnalyticsTracker.trackEvent('expert_students_tab_pressed');
            }
          }}
        />

        {/* ⭐ Quality Dashboard Tab */}
        <Tab.Screen
          name="quality-dashboard"
          component={QualityDashboard}
          options={{
            tabBarLabel: EXPERT_ROUTES.qualityDashboard.label,
            tabBarIcon: ({ focused, color, size }) => (
              <MOSAIcons.Quality 
                size={size} 
                color={color} 
                filled={focused}
              />
            ),
            tabBarBadge: badgeCounts.qualityAlerts || undefined,
            tabBarTestID: 'tab-quality'
          }}
          listeners={{
            tabPress: e => {
              AnalyticsTracker.trackEvent('expert_quality_tab_pressed');
            }
          }}
        />

        {/* 📅 Session Scheduler Tab */}
        <Tab.Screen
          name="session-scheduler"
          component={SessionScheduler}
          options={{
            tabBarLabel: EXPERT_ROUTES.sessionScheduler.label,
            tabBarIcon: ({ focused, color, size }) => (
              <MOSAIcons.Calendar 
                size={size} 
                color={color} 
                filled={focused}
              />
            ),
            tabBarBadge: badgeCounts.upcomingSessions || undefined,
            tabBarTestID: 'tab-sessions'
          }}
          listeners={{
            tabPress: e => {
              AnalyticsTracker.trackEvent('expert_sessions_tab_pressed');
            }
          }}
        />

        {/* 💰 Payout Tracker Tab */}
        <Tab.Screen
          name="payout-tracker"
          component={PayoutTracker}
          options={{
            tabBarLabel: EXPERT_ROUTES.payoutTracker.label,
            tabBarIcon: ({ focused, color, size }) => (
              <MOSAIcons.Payout 
                size={size} 
                color={color} 
                filled={focused}
              />
            ),
            tabBarBadge: badgeCounts.pendingPayouts || undefined,
            tabBarTestID: 'tab-payouts'
          }}
          listeners={{
            tabPress: e => {
              AnalyticsTracker.trackEvent('expert_payouts_tab_pressed');
            }
          }}
        />
      </Tab.Navigator>
    </ErrorBoundary>
  );
});

/**
 * 🎯 EXPERT STACK NAVIGATOR
 * Secondary navigation for screens accessed from drawer or deeper navigation
 */
const ExpertStackNavigator = React.memo(() => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const logger = EnterpriseLogger.getInstance();

  // 🔐 Check expert permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const expertData = await AsyncStorage.getItem('expert_data');
        if (!expertData) {
          navigation.navigate('Auth', { screen: 'Login' });
          return;
        }

        const parsedData = JSON.parse(expertData);
        const permissions = await SecurityManager.checkExpertPermissions(
          parsedData.tier,
          parsedData.status
        );

        setHasPermission(permissions.canAccessExpertPortal);
        
        if (!permissions.canAccessExpertPortal) {
          Alert.alert(
            'Access Denied',
            'You do not have permission to access the expert portal.',
            [{ text: 'OK', onPress: () => navigation.navigate('Auth') }]
          );
        }
      } catch (error) {
        logger.error('Permission check failed', { error: error.message });
        navigation.navigate('Auth', { screen: 'Login' });
      } finally {
        setIsLoading(false);
      }
    };

    checkPermissions();
  }, []);

  if (isLoading) {
    return <LoadingOverlay message="Verifying permissions..." />;
  }

  if (!hasPermission) {
    return null; // Will redirect via Alert
  }

  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        animationEnabled: true
      }}
    >
      {/* 🎯 Main Tab Navigator */}
      <Stack.Screen 
        name="MainTabs" 
        component={ExpertTabNavigator}
        options={{
          headerShown: false,
          gestureEnabled: false
        }}
      />

      {/* 📊 Performance Analytics Screen */}
      <Stack.Screen
        name="performance-analytics"
        component={PerformanceAnalytics}
        options={{
          headerShown: true,
          header: props => (
            <NavigationHeader
              {...props}
              title="Performance Analytics"
              showBackButton={true}
              showNotifications={true}
            />
          ),
          animationTypeForReplace: 'push'
        }}
      />

      {/* ⚙️ Settings Screen */}
      <Stack.Screen
        name="settings"
        component={Settings}
        options={{
          headerShown: true,
          header: props => (
            <NavigationHeader
              {...props}
              title="Settings"
              showBackButton={true}
              showProfile={true}
            />
          )
        }}
      />

      {/* ❓ Help & Support Screen */}
      <Stack.Screen
        name="help-support"
        component={HelpSupport}
        options={{
          headerShown: true,
          header: props => (
            <NavigationHeader
              {...props}
              title="Help & Support"
              showBackButton={true}
              showHelp={false}
            />
          )
        }}
      />

      {/* 📚 Training Resources Screen */}
      <Stack.Screen
        name="training-resources"
        component={TrainingResources}
        options={{
          headerShown: true,
          header: props => (
            <NavigationHeader
              {...props}
              title="Training Resources"
              showBackButton={true}
            />
          )
        }}
      />
    </Stack.Navigator>
  );
});

/**
 * 🎯 CUSTOM DRAWER CONTENT
 * Enhanced drawer with expert-specific features and analytics
 */
const CustomDrawerContent = React.memo((props) => {
  const navigation = useNavigation();
  const [expertData, setExpertData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const logger = EnterpriseLogger.getInstance();

  // 📊 Load expert data and notifications
  useEffect(() => {
    const loadExpertData = async () => {
      try {
        const storedData = await AsyncStorage.getItem('expert_data');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setExpertData(parsedData);
          
          // Fetch notifications
          const expertNotifications = await fetchExpertNotifications(parsedData.id);
          setNotifications(expertNotifications);
          setUnreadCount(expertNotifications.filter(n => !n.read).length);
        }
      } catch (error) {
        logger.error('Failed to load expert drawer data', { error: error.message });
      }
    };

    loadExpertData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadExpertData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ExpertDrawerContent
      {...props}
      expertData={expertData}
      notifications={notifications}
      unreadCount={unreadCount}
      onNotificationPress={(notification) => {
        AnalyticsTracker.trackEvent('drawer_notification_pressed', {
          notificationId: notification.id,
          type: notification.type
        });
        handleNotificationNavigation(notification, navigation);
      }}
      onProfilePress={() => {
        AnalyticsTracker.trackEvent('drawer_profile_pressed');
        navigation.navigate('settings');
      }}
      onLogoutPress={async () => {
        AnalyticsTracker.trackEvent('drawer_logout_pressed');
        await handleExpertLogout(navigation);
      }}
    />
  );
});

/**
 * 🎯 EXPERT NETWORK LAYOUT COMPONENT
 * Main layout component orchestrating the entire expert portal navigation
 */
const ExpertNetworkLayout = React.memo(() => {
  const navigation = useNavigation();
  const route = useRoute();
  const netInfo = useNetInfo();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const logger = EnterpriseLogger.getInstance();

  // 🛡️ Security & Session Management
  useEffect(() => {
    const checkSession = async () => {
      try {
        const sessionValid = await SecurityManager.validateExpertSession();
        if (!sessionValid) {
          setSessionExpired(true);
        }
      } catch (error) {
        logger.error('Session validation failed', { error: error.message });
      }
    };

    // Check session every minute
    const sessionInterval = setInterval(checkSession, 60000);
    checkSession(); // Initial check

    return () => clearInterval(sessionInterval);
  }, []);

  // ⏰ Session timeout handler
  useEffect(() => {
    const handleInteraction = () => {
      setLastInteraction(Date.now());
    };

    const events = ['mousedown', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, handleInteraction);
    });

    const checkTimeout = setInterval(() => {
      const idleTime = Date.now() - lastInteraction;
      if (idleTime > SESSION_TIMEOUT.EXPERT_PORTAL) {
        setSessionExpired(true);
      }
    }, 60000); // Check every minute

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
      clearInterval(checkTimeout);
    };
  }, [lastInteraction]);

  // 📊 Performance Monitoring
  useEffect(() => {
    const monitor = PerformanceMonitor.getInstance();
    const unsubscribe = monitor.onMetricsUpdate((metrics) => {
      setPerformanceMetrics(metrics);
      
      // Log performance issues
      if (metrics.fps < 30) {
        logger.warn('Low FPS detected in expert portal', { fps: metrics.fps });
      }
    });

    return () => unsubscribe();
  }, []);

  // 🔄 Handle back button on Android
  useEffect(() => {
    const backAction = () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      } else {
        Alert.alert(
          'Exit Expert Portal?',
          'Are you sure you want to exit the expert portal?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', onPress: () => BackHandler.exitApp() }
          ]
        );
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  // 🌐 Network Interception
  useEffect(() => {
    if (netInfo.isConnected === false) {
      logger.warn('Expert portal lost network connection');
    } else if (netInfo.isConnected === true) {
      logger.info('Expert portal network connection restored');
    }
  }, [netInfo.isConnected]);

  // 🎯 Handle session expiration
  const handleSessionRenewal = useCallback(async () => {
    try {
      const renewed = await SecurityManager.renewExpertSession();
      if (renewed) {
        setSessionExpired(false);
        setLastInteraction(Date.now());
        AnalyticsTracker.trackEvent('expert_session_renewed');
      } else {
        await handleExpertLogout(navigation);
      }
    } catch (error) {
      logger.error('Session renewal failed', { error: error.message });
      await handleExpertLogout(navigation);
    }
  }, [navigation]);

  const handleSessionLogout = useCallback(async () => {
    await handleExpertLogout(navigation);
  }, [navigation]);

  return (
    <ErrorBoundary
      fallback={
        <View style={styles.errorContainer}>
          <MOSAIcons.Error size={64} color={MOSAColors.error.main} />
          <Text style={styles.errorText}>
            Navigation error occurred. Please restart the app.
          </Text>
        </View>
      }
    >
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={MOSAColors.background.primary}
          animated={true}
        />

        {/* 🌐 Network Status Bar */}
        <NetworkStatusBar
          isConnected={netInfo.isConnected}
          connectionType={netInfo.type}
        />

        {/* 🛡️ Navigation Guard */}
        <NavigationGuard
          userType="expert"
          requiredPermissions={EXPERT_PERMISSIONS.BASIC_ACCESS}
          onUnauthorized={() => navigation.navigate('Auth')}
        />

        {/* 🧭 Drawer Navigator */}
        <Drawer.Navigator
          initialRouteName="ExpertStack"
          drawerContent={props => <CustomDrawerContent {...props} />}
          screenOptions={{
            headerShown: false,
            drawerType: 'front',
            drawerStyle: styles.drawer,
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            swipeEnabled: true,
            swipeEdgeWidth: 50,
            gestureHandlerProps: {
              enableTrackpadTwoFingerGesture: true
            }
          }}
        >
          <Drawer.Screen
            name="ExpertStack"
            component={ExpertStackNavigator}
            options={{
              drawerLabel: 'Dashboard',
              drawerIcon: ({ color, size }) => (
                <MOSAIcons.Dashboard size={size} color={color} />
              )
            }}
          />
        </Drawer.Navigator>

        {/* ⏰ Session Timeout Modal */}
        <SessionTimeoutModal
          visible={sessionExpired}
          onRenew={handleSessionRenewal}
          onLogout={handleSessionLogout}
          remainingTime={SESSION_TIMEOUT.EXPERT_PORTAL - (Date.now() - lastInteraction)}
          userType="expert"
        />

        {/* 📊 Performance Debug Overlay (Development only) */}
        {__DEV__ && (
          <View style={styles.debugOverlay}>
            <Text style={styles.debugText}>
              FPS: {performanceMetrics.fps || 'N/A'} | 
              Memory: {performanceMetrics.memory || 'N/A'}MB
            </Text>
          </View>
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
});

/**
 * 🔧 UTILITY FUNCTIONS
 */

/**
 * 📲 Fetch expert notifications
 */
const fetchExpertNotifications = async (expertId) => {
  try {
    const response = await NetworkInterceptor.get(
      `/api/v1/experts/${expertId}/notifications`,
      {
        headers: await SecurityManager.getAuthHeaders(),
        timeout: 10000
      }
    );

    return response.data.notifications || [];
  } catch (error) {
    EnterpriseLogger.getInstance().error('Failed to fetch notifications', {
      expertId,
      error: error.message
    });
    return [];
  }
};

/**
 * 🧭 Handle notification navigation
 */
const handleNotificationNavigation = (notification, navigation) => {
  const { type, data } = notification;
  
  switch (type) {
    case 'session_reminder':
      navigation.navigate('session-scheduler', { sessionId: data.sessionId });
      break;
    case 'quality_alert':
      navigation.navigate('quality-dashboard', { alertId: data.alertId });
      break;
    case 'payout_processed':
      navigation.navigate('payout-tracker', { transactionId: data.transactionId });
      break;
    case 'student_assigned':
      navigation.navigate('student-roster', { studentId: data.studentId });
      break;
    default:
      navigation.navigate('MainTabs', { screen: 'dashboard' });
  }
};

/**
 * 🚪 Handle expert logout
 */
const handleExpertLogout = async (navigation) => {
  try {
    // Track logout event
    await AnalyticsTracker.trackEvent('expert_logout', {
      timestamp: new Date().toISOString()
    });

    // Clear local storage
    await AsyncStorage.multiRemove([
      'expert_data',
      'expert_session',
      'expert_permissions'
    ]);

    // Clear cache
    await NetworkInterceptor.clearCache();

    // Navigate to auth
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }]
    });

  } catch (error) {
    EnterpriseLogger.getInstance().error('Logout failed', {
      error: error.message
    });
  }
};

/**
 * 🎨 STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MOSAColors.background.primary,
  },
  tabBar: {
    height: Platform.OS === 'ios' ? 85 : 60,
    paddingBottom: Platform.OS === 'ios' ? 30 : 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: MOSAColors.border.light,
    backgroundColor: MOSAColors.background.primary,
    elevation: 8,
    shadowColor: MOSAColors.shadow.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  drawer: {
    width: 300,
    backgroundColor: MOSAColors.background.primary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: MOSAColors.background.primary,
    padding: MOSASpacing.xl,
  },
  errorText: {
    ...MOSATypography.bodyLarge,
    color: MOSAColors.text.primary,
    textAlign: 'center',
    marginTop: MOSASpacing.lg,
  },
  debugOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: MOSASpacing.sm,
    paddingVertical: MOSASpacing.xs,
    borderRadius: MOSASpacing.xs,
  },
  debugText: {
    ...MOSATypography.caption,
    color: MOSAColors.text.inverse,
    fontSize: 10,
  },
});

// 🏷️ Display name for debugging
ExpertNetworkLayout.displayName = 'ExpertNetworkLayout';
ExpertTabNavigator.displayName = 'ExpertTabNavigator';
ExpertStackNavigator.displayName = 'ExpertStackNavigator';
CustomDrawerContent.displayName = 'CustomDrawerContent';

export default ExpertNetworkLayout;