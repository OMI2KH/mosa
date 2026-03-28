/**
 * 🎯 MOSA FORGE: Enterprise App Navigator
 * 
 * @module AppNavigator
 * @description Main navigation controller with enterprise-grade routing, auth flows, and performance optimization
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Role-based navigation flows
 * - Authentication state management
 * - Deep linking support
 * - Performance optimization
 * - Offline navigation
 * - Analytics integration
 * - Error boundary protection
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Platform, Alert, BackHandler, AppState } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { EventEmitter } from 'events';

// 🏗️ Enterprise Context & State
import { useAuth } from '../contexts/auth-context';
import { usePayment } from '../contexts/payment-context';
import { useQuality } from '../contexts/quality-context';
import { useLearning } from '../contexts/learning-context';

// 🎯 Navigation Constants
const NAVIGATION_STATES = {
  AUTH: 'auth',
  ONBOARDING: 'onboarding',
  MAIN: 'main',
  EXPERT: 'expert',
  ADMIN: 'admin',
  LOADING: 'loading'
};

const NAVIGATION_EVENTS = {
  UNAUTHORIZED: 'unauthorized',
  SESSION_EXPIRED: 'session_expired',
  PAYMENT_REQUIRED: 'payment_required',
  QUALITY_ALERT: 'quality_alert',
  NETWORK_CHANGE: 'network_change'
};

/**
 * 🏗️ Enterprise Navigation Event Bus
 */
class NavigationEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Enterprise scale
  }

  emitNavigationEvent(event, data) {
    this.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
      navigationState: this.getCurrentState()
    });
  }

  getCurrentState() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      timestamp: Date.now()
    };
  }
}

// 🏗️ Global Navigation Event Bus
export const navigationEventBus = new NavigationEventBus();

/**
 * 🏗️ Performance-Optimized Stack Navigator
 */
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

/**
 * 🎯 Main Enterprise App Navigator Component
 */
const EnterpriseAppNavigator = () => {
  // 🏗️ Enterprise State Management
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    userRole, 
    faydaVerified,
    logout,
    refreshSession
  } = useAuth();

  const { 
    paymentStatus, 
    hasActiveBundle,
    refreshPaymentStatus 
  } = usePayment();

  const { 
    qualityScore, 
    hasQualityAlerts,
    refreshQualityMetrics 
  } = useQuality();

  const { 
    currentCourse, 
    learningProgress,
    refreshLearningProgress 
  } = useLearning();

  // 🏗️ Navigation Refs & State
  const navigationRef = useRef();
  const routeNameRef = useRef();
  const netInfo = useNetInfo();
  const appState = useRef(AppState.currentState);

  // 🏗️ Navigation Configuration
  const navigationConfig = {
    headerMode: 'float',
    animation: 'slide_from_right',
    gestureEnabled: true,
    keyboardHandling: Platform.OS === 'ios',
    detachInactiveScreens: true
  };

  /**
   * 🏗️ Get User Navigation Flow Based on Role & State
   */
  const getUserNavigationFlow = useCallback(() => {
    if (!isAuthenticated || !user) {
      return NAVIGATION_STATES.AUTH;
    }

    // 🎯 Role-based navigation flows
    switch (userRole) {
      case 'STUDENT':
        return getStudentNavigationFlow();
      case 'EXPERT':
        return getExpertNavigationFlow();
      case 'ADMIN':
        return NAVIGATION_STATES.ADMIN;
      default:
        return NAVIGATION_STATES.AUTH;
    }
  }, [isAuthenticated, user, userRole, paymentStatus, faydaVerified]);

  /**
   * 🏗️ Student Navigation Flow Logic
   */
  const getStudentNavigationFlow = useCallback(() => {
    // Check onboarding completion
    if (!user?.onboardingCompleted) {
      return NAVIGATION_STATES.ONBOARDING;
    }

    // Check payment status
    if (!hasActiveBundle) {
      return 'payment-required';
    }

    // Check course progress
    if (currentCourse) {
      return NAVIGATION_STATES.MAIN;
    }

    return 'course-selection';
  }, [user, hasActiveBundle, currentCourse]);

  /**
   * 🏗️ Expert Navigation Flow Logic
   */
  const getExpertNavigationFlow = useCallback(() => {
    // Expert verification check
    if (!user?.expertProfile?.verified) {
      return 'expert-verification';
    }

    // Quality status check
    if (hasQualityAlerts) {
      return 'quality-review';
    }

    return NAVIGATION_STATES.EXPERT;
  }, [user, hasQualityAlerts]);

  /**
   * 🏗️ Handle Navigation State Changes
   */
  const handleNavigationStateChange = useCallback(async (state) => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

    if (previousRouteName !== currentRouteName) {
      // 🎯 Analytics Tracking
      navigationEventBus.emitNavigationEvent('SCREEN_VIEW', {
        previousScreen: previousRouteName,
        currentScreen: currentRouteName,
        userRole,
        userId: user?.id
      });

      // 🎯 Performance Monitoring
      monitorNavigationPerformance(previousRouteName, currentRouteName);
    }

    routeNameRef.current = currentRouteName;
  }, [user, userRole]);

  /**
   * 🏗️ Navigation Performance Monitoring
   */
  const monitorNavigationPerformance = useCallback((from, to) => {
    const startTime = Date.now();
    
    setTimeout(() => {
      const loadTime = Date.now() - startTime;
      
      navigationEventBus.emitNavigationEvent('NAVIGATION_PERFORMANCE', {
        from,
        to,
        loadTime,
        acceptable: loadTime < 1000,
        platform: Platform.OS
      });

      if (loadTime > 2000) {
        console.warn(`Slow navigation: ${from} -> ${to} took ${loadTime}ms`);
      }
    }, 0);
  }, []);

  /**
   * 🏗️ Handle Deep Links
   */
  const handleDeepLinks = useCallback((linking) => {
    const { url } = linking;
    
    if (!url) return;

    // 🎯 Parse deep link URLs
    try {
      const route = url.replace(/.*?:\/\//g, '');
      const routeParts = route.split('/');
      const routeName = routeParts[0];
      const params = routeParts.slice(1);

      navigationEventBus.emitNavigationEvent('DEEP_LINK_OPENED', {
        url,
        routeName,
        params
      });

      // 🎯 Route handling logic
      handleDeepLinkRouting(routeName, params);
    } catch (error) {
      navigationEventBus.emitNavigationEvent('DEEP_LINK_ERROR', {
        error: error.message,
        url
      });
    }
  }, []);

  /**
   * 🏗️ Deep Link Routing Logic
   */
  const handleDeepLinkRouting = useCallback((routeName, params) => {
    const routes = {
      'course': () => navigateToCourse(params[0]),
      'payment': () => navigateToPayment(params[0]),
      'certificate': () => navigateToCertificate(params[0]),
      'expert': () => navigateToExpertProfile(params[0])
    };

    if (routes[routeName]) {
      routes[routeName]();
    }
  }, []);

  /**
   * 🏗️ Navigation Helper Methods
   */
  const navigateToCourse = useCallback((courseId) => {
    navigationRef.current?.navigate('LearningStack', {
      screen: 'CourseDetail',
      params: { courseId }
    });
  }, []);

  const navigateToPayment = useCallback((bundleId) => {
    navigationRef.current?.navigate('PaymentStack', {
      screen: 'BundlePurchase',
      params: { bundleId }
    });
  }, []);

  /**
   * 🏗️ Handle Authentication State Changes
   */
  useEffect(() => {
    if (!isLoading) {
      const navigationFlow = getUserNavigationFlow();
      
      navigationEventBus.emitNavigationEvent('NAVIGATION_FLOW_CHANGE', {
        previousFlow: routeNameRef.current,
        newFlow: navigationFlow,
        userRole,
        isAuthenticated
      });

      // 🎯 Navigate to appropriate flow
      handleFlowNavigation(navigationFlow);
    }
  }, [isLoading, isAuthenticated, getUserNavigationFlow]);

  /**
   * 🏗️ Flow Navigation Handler
   */
  const handleFlowNavigation = useCallback((flow) => {
    if (!navigationRef.current) return;

    const currentRoute = navigationRef.current.getCurrentRoute()?.name;
    
    // Prevent unnecessary navigation
    if (currentRoute === flow) return;

    switch (flow) {
      case NAVIGATION_STATES.AUTH:
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'AuthStack' }]
        });
        break;
      
      case NAVIGATION_STATES.ONBOARDING:
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'OnboardingStack' }]
        });
        break;
      
      case NAVIGATION_STATES.MAIN:
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'MainApp' }]
        });
        break;
      
      case NAVIGATION_STATES.EXPERT:
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'ExpertApp' }]
        });
        break;
      
      default:
        console.warn('Unknown navigation flow:', flow);
    }
  }, []);

  /**
   * 🏗️ Network Connectivity Handler
   */
  useEffect(() => {
    if (netInfo.isConnected === false) {
      navigationEventBus.emitNavigationEvent(NAVIGATION_EVENTS.NETWORK_CHANGE, {
        isConnected: false,
        type: netInfo.type
      });

      // Show offline mode
      navigationRef.current?.navigate('OfflineScreen');
    } else if (netInfo.isConnected === true) {
      navigationEventBus.emitNavigationEvent(NAVIGATION_EVENTS.NETWORK_CHANGE, {
        isConnected: true,
        type: netInfo.type
      });

      // Refresh critical data
      refreshCriticalData();
    }
  }, [netInfo.isConnected]);

  /**
   * 🏗️ Refresh Critical Data on Reconnect
   */
  const refreshCriticalData = useCallback(async () => {
    try {
      await Promise.all([
        refreshSession(),
        refreshPaymentStatus(),
        refreshQualityMetrics(),
        refreshLearningProgress()
      ]);
    } catch (error) {
      navigationEventBus.emitNavigationEvent('DATA_REFRESH_ERROR', {
        error: error.message
      });
    }
  }, [refreshSession, refreshPaymentStatus, refreshQualityMetrics, refreshLearningProgress]);

  /**
   * 🏗️ App State Change Handler
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground
        navigationEventBus.emitNavigationEvent('APP_FOREGROUND', {
          timestamp: new Date().toISOString()
        });
        
        refreshCriticalData();
      } else if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        // App going to background
        navigationEventBus.emitNavigationEvent('APP_BACKGROUND', {
          timestamp: new Date().toISOString()
        });
      }

      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [refreshCriticalData]);

  /**
   * 🏗️ Hardware Back Button Handler (Android)
   */
  useEffect(() => {
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        const currentRoute = navigationRef.current?.getCurrentRoute();
        
        // 🎯 Custom back behavior for specific screens
        if (currentRoute?.name === 'PaymentScreen') {
          Alert.alert(
            'Exit Payment?',
            'Are you sure you want to leave? Your payment progress will be lost.',
            [
              { text: 'Stay', style: 'cancel' },
              { 
                text: 'Exit', 
                style: 'destructive',
                onPress: () => navigationRef.current?.goBack()
              }
            ]
          );
          return true;
        }

        // 🎯 Prevent exiting app on main screens
        if (['Home', 'Dashboard', 'Learning'].includes(currentRoute?.name)) {
          Alert.alert(
            'Exit Mosa Forge?',
            'Press back again to exit the application.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Exit', onPress: () => BackHandler.exitApp() }
            ]
          );
          return true;
        }

        return false;
      });

      return () => backHandler.remove();
    }
  }, []);

  /**
   * 🏗️ Error Boundary for Navigation
   */
  const onNavigationError = useCallback((error) => {
    navigationEventBus.emitNavigationEvent('NAVIGATION_ERROR', {
      error: error.message,
      stack: error.stack
    });

    // Fallback to safe navigation state
    navigationRef.current?.reset({
      index: 0,
      routes: [{ name: 'ErrorFallback' }]
    });
  }, []);

  /**
   * 🏗️ Render Loading State
   */
  if (isLoading) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Loading" component={LoadingScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  /**
   * 🎯 MAIN NAVIGATION RENDER
   */
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        routeNameRef.current = navigationRef.current.getCurrentRoute()?.name;
      }}
      onStateChange={handleNavigationStateChange}
      onUnhandledAction={onNavigationError}
      linking={linkingConfiguration}
      fallback={<LoadingScreen />}
      documentTitle={{
        formatter: (options, route) => 
          `Mosa Forge${options?.title || route?.name ? ` - ${options.title || route.name}` : ''}`
      }}
      theme={navigationTheme}
    >
      <RootNavigator />
    </NavigationContainer>
  );
};

/**
 * 🏗️ Root Navigator Component
 */
const RootNavigator = () => {
  const { isAuthenticated, userRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Loading" component={LoadingScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="AuthStack" component={AuthNavigator} />
      ) : (
        <>
          {userRole === 'STUDENT' && (
            <Stack.Screen name="StudentApp" component={StudentNavigator} />
          )}
          {userRole === 'EXPERT' && (
            <Stack.Screen name="ExpertApp" component={ExpertNavigator} />
          )}
          {userRole === 'ADMIN' && (
            <Stack.Screen name="AdminApp" component={AdminNavigator} />
          )}
        </>
      )}
      
      {/* 🎯 Global Modals */}
      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name="QualityAlert" component={QualityAlertModal} />
        <Stack.Screen name="PaymentModal" component={PaymentModal} />
        <Stack.Screen name="SessionExpired" component={SessionExpiredModal} />
      </Stack.Group>
    </Stack.Navigator>
  );
};

/**
 * 🏗️ Authentication Navigator
 */
const AuthNavigator = () => (
  <Stack.Navigator
    initialRouteName="FaydaRegistration"
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      gestureEnabled: true
    }}
  >
    <Stack.Screen name="FaydaRegistration" component={FaydaRegistrationScreen} />
    <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
    <Stack.Screen name="PasswordRecovery" component={PasswordRecoveryScreen} />
    <Stack.Screen name="DuplicateAlert" component={DuplicateAlertScreen} />
  </Stack.Navigator>
);

/**
 * 🏗️ Student Main Navigator
 */
const StudentNavigator = () => (
  <Tab.Navigator
    initialRouteName="Learning"
    screenOptions={tabScreenOptions}
    detachInactiveScreens={true}
  >
    <Tab.Screen 
      name="Learning" 
      component={LearningStack}
      options={{
        tabBarIcon: ({ focused }) => (
          <LearningIcon focused={focused} />
        ),
        tabBarBadge: getLearningBadgeCount()
      }}
    />
    <Tab.Screen 
      name="Progress" 
      component={ProgressStack}
      options={{
        tabBarIcon: ({ focused }) => (
          <ProgressIcon focused={focused} />
        )
      }}
    />
    <Tab.Screen 
      name="Experts" 
      component={ExpertsStack}
      options={{
        tabBarIcon: ({ focused }) => (
          <ExpertsIcon focused={focused} />
        )
      }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileStack}
      options={{
        tabBarIcon: ({ focused }) => (
          <ProfileIcon focused={focused} />
        )
      }}
    />
  </Tab.Navigator>
);

/**
 * 🏗️ Learning Stack Navigator
 */
const LearningStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="LearningDashboard" 
      component={LearningDashboard}
      options={{ headerShown: false }}
    />
    <Stack.Screen 
      name="CourseDetail" 
      component={CourseDetailScreen}
      options={{ 
        headerTitle: 'Course Details',
        headerBackTitle: 'Back'
      }}
    />
    <Stack.Screen 
      name="ExercisePlayer" 
      component={ExercisePlayerScreen}
      options={{ 
        headerShown: false,
        gestureEnabled: false // Prevent accidental back during exercise
      }}
    />
    <Stack.Screen 
      name="MindsetPhase" 
      component={MindsetPhaseScreen}
      options={{ headerTitle: 'Mindset Foundation' }}
    />
  </Stack.Navigator>
);

/**
 * 🏗️ Expert Navigator
 */
const ExpertNavigator = () => (
  <Drawer.Navigator
    initialRouteName="ExpertDashboard"
    drawerContent={(props) => <ExpertDrawerContent {...props} />}
    screenOptions={{
      headerShown: true,
      drawerType: 'front',
      overlayColor: 'transparent'
    }}
  >
    <Drawer.Screen 
      name="ExpertDashboard" 
      component={ExpertDashboardScreen}
      options={{ drawerLabel: 'Dashboard' }}
    />
    <Drawer.Screen 
      name="QualityDashboard" 
      component={QualityDashboardScreen}
      options={{ drawerLabel: 'Quality Metrics' }}
    />
    <Drawer.Screen 
      name="StudentManagement" 
      component={StudentManagementScreen}
      options={{ drawerLabel: 'Students' }}
    />
    <Drawer.Screen 
      name="PayoutTracker" 
      component={PayoutTrackerScreen}
      options={{ drawerLabel: 'Earnings' }}
    />
    <Drawer.Screen 
      name="SessionScheduler" 
      component={SessionSchedulerScreen}
      options={{ drawerLabel: 'Sessions' }}
    />
  </Drawer.Navigator>
);

/**
 * 🏗️ Navigation Configuration Objects
 */
const linkingConfiguration = {
  prefixes: ['mosaforge://', 'https://mosaforge.com', 'https://*.mosaforge.com'],
  config: {
    initialRouteName: 'Loading',
    screens: {
      AuthStack: {
        path: 'auth',
        screens: {
          FaydaRegistration: 'register',
          OtpVerification: 'verify',
          PasswordRecovery: 'recover'
        }
      },
      StudentApp: {
        path: 'app',
        screens: {
          Learning: 'learn',
          Progress: 'progress',
          Experts: 'experts',
          Profile: 'profile'
        }
      },
      ExpertApp: {
        path: 'expert',
        screens: {
          ExpertDashboard: 'dashboard',
          QualityDashboard: 'quality',
          StudentManagement: 'students'
        }
      }
    }
  }
};

const navigationTheme = {
  dark: false,
  colors: {
    primary: '#10B981', // Mosa brand green
    background: '#FFFFFF',
    card: '#F8FAFC',
    text: '#1E293B',
    border: '#E2E8F0',
    notification: '#EF4444',
  },
};

const tabScreenOptions = {
  headerShown: false,
  tabBarStyle: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E2E8F0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    height: Platform.OS === 'ios' ? 85 : 60,
  },
  tabBarActiveTintColor: '#10B981',
  tabBarInactiveTintColor: '#64748B',
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '600',
  },
};

/**
 * 🏗️ Navigation Helper Functions
 */
const getLearningBadgeCount = () => {
  // Implementation for showing badge counts
  const { pendingExercises, newContent } = useLearning();
  return pendingExercises + newContent || undefined;
};

/**
 * 🏗️ Screen Components (Placeholder implementations)
 */
const LoadingScreen = () => null;
const FaydaRegistrationScreen = () => null;
const OtpVerificationScreen = () => null;
const PasswordRecoveryScreen = () => null;
const DuplicateAlertScreen = () => null;
const LearningDashboard = () => null;
const CourseDetailScreen = () => null;
const ExercisePlayerScreen = () => null;
const MindsetPhaseScreen = () => null;
const ExpertDashboardScreen = () => null;
const QualityDashboardScreen = () => null;
const StudentManagementScreen = () => null;
const PayoutTrackerScreen = () => null;
const SessionSchedulerScreen = () => null;
const QualityAlertModal = () => null;
const PaymentModal = () => null;
const SessionExpiredModal = () => null;
const ExpertDrawerContent = () => null;
const LearningIcon = () => null;
const ProgressIcon = () => null;
const ExpertsIcon = () => null;
const ProfileIcon = () => null;

/**
 * 🏗️ Export Enterprise Navigator
 */
export default React.memo(EnterpriseAppNavigator);

// 🎯 Utility exports for programmatic navigation
export { 
  navigationEventBus, 
  NAVIGATION_STATES, 
  NAVIGATION_EVENTS 
};