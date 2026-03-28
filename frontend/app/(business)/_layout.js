/**
 * 🏢 MOSA FORGE - Enterprise Business Layout System
 * 🎯 Business Dashboard Navigation & Layout Management
 * 📱 Responsive Layout System for Enterprise Applications
 * 🔐 Role-Based Access Control & Navigation Security
 * 🚀 Production-Ready Enterprise Architecture
 * 
 * @module BusinessLayout
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
  SafeAreaView,
  useColorScheme,
  AppState,
  BackHandler,
  Dimensions
} from 'react-native';
import { 
  Slot, 
  Stack, 
  Tabs, 
  useSegments, 
  useRootNavigationState,
  useRouter,
  useGlobalSearchParams
} from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';

// 🏗️ Enterprise Dependencies
import BusinessNavigationBar from '../../components/business/BusinessNavigationBar';
import BusinessSidebar from '../../components/business/BusinessSidebar';
import OfflineBanner from '../../components/shared/OfflineBanner';
import SessionTimeout from '../../components/auth/SessionTimeout';
import PerformanceMonitor from '../../components/shared/PerformanceMonitor';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import LoadingOverlay from '../../components/shared/LoadingOverlay';
import PermissionGuard from '../../components/auth/PermissionGuard';

// 📊 State Management
import { useAuth } from '../../contexts/AuthContext';
import { useBusiness } from '../../contexts/BusinessContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useAnalytics } from '../../hooks/useAnalytics';

// 🔧 Utilities
import { 
  BusinessPermissions, 
  BusinessRoutes, 
  NavigationConfig 
} from '../../constants/navigation';
import { 
  trackScreenView, 
  trackUserInteraction,
  logBusinessEvent 
} from '../../utils/analytics';
import { 
  validateBusinessAccess,
  checkRoutePermissions 
} from '../../utils/permissions';
import { 
  isTablet, 
  isLandscape,
  getResponsiveValue 
} from '../../utils/responsive';

// 🎨 Design System
import { 
  Colors, 
  Spacing, 
  Typography, 
  Shadows,
  Animations 
} from '../../design-system';
import { 
  BusinessIcons,
  LoadingIndicators 
} from '../../design-system/icons';

/**
 * 🏢 Business Layout Component
 * Main layout container for all business-related screens
 */
export default function BusinessLayout() {
  // 🔄 State Management
  const [isOnline, setIsOnline] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));

  // 🎯 Hooks & Context
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const params = useGlobalSearchParams();

  // 🔐 Authentication & Business Context
  const { 
    user, 
    isAuthenticated, 
    checkSession, 
    logout,
    hasPermission 
  } = useAuth();
  
  const { 
    businessData, 
    loadBusinessData,
    currentView,
    setCurrentView 
  } = useBusiness();
  
  const { 
    unreadCount,
    fetchNotifications 
  } = useNotification();
  
  const { 
    trackEvent, 
    setUserProperties 
  } = useAnalytics();

  // 📱 Responsive Layout
  const tabletMode = isTablet();
  const landscapeMode = isLandscape();
  const isLargeScreen = tabletMode || landscapeMode;

  /**
   * 🎯 Initialize Business Layout
   */
  const initializeBusinessLayout = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 🔐 Verify Authentication
      if (!isAuthenticated || !user) {
        router.replace('/auth/login');
        return;
      }

      // 🏢 Verify Business Access
      const accessValid = await validateBusinessAccess(user.id);
      if (!accessValid) {
        router.replace('/auth/access-denied');
        return;
      }

      // 📊 Load Business Data
      await loadBusinessData();

      // 📱 Set Analytics User Properties
      await setUserProperties({
        userId: user.id,
        userRole: user.role,
        businessTier: businessData?.tier || 'standard',
        lastActive: new Date().toISOString()
      });

      // 🔔 Fetch Notifications
      await fetchNotifications();

      // 🎯 Track Layout Initialization
      await trackEvent('business_layout_initialized', {
        userId: user.id,
        deviceType: tabletMode ? 'tablet' : 'phone',
        orientation: landscapeMode ? 'landscape' : 'portrait'
      });

      setIsLoading(false);

    } catch (error) {
      console.error('Business layout initialization failed:', error);
      
      await trackEvent('business_layout_init_failed', {
        error: error.message,
        userId: user?.id
      });

      setIsLoading(false);
      
      // 🚨 Redirect to error screen
      router.replace('/error?type=layout_init');
    }
  }, [isAuthenticated, user, router, loadBusinessData, tabletMode, landscapeMode]);

  /**
   * 🌐 Network Status Monitoring
   */
  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const wasOnline = isOnline;
      const isNowOnline = state.isConnected && state.isInternetReachable;
      
      setIsOnline(isNowOnline);

      // 📊 Track Network Changes
      if (wasOnline !== isNowOnline) {
        trackEvent('network_status_changed', {
          online: isNowOnline,
          connectionType: state.type,
          userId: user?.id
        });
      }

      // 🔄 Auto-retry data sync when back online
      if (!wasOnline && isNowOnline) {
        handleNetworkRecovery();
      }
    });

    return () => unsubscribeNetInfo();
  }, [isOnline, user?.id]);

  /**
   * 📱 Screen Dimensions Monitoring
   */
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenDimensions(window);
      
      // 📊 Track Screen Size Changes
      trackEvent('screen_dimensions_changed', {
        width: window.width,
        height: window.height,
        orientation: window.width > window.height ? 'landscape' : 'portrait',
        userId: user?.id
      });
    });

    return () => subscription?.remove();
  }, [user?.id]);

  /**
   * 📱 App State Monitoring
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // 🔄 App came to foreground
        handleAppForeground();
      } else if (nextAppState.match(/inactive|background/)) {
        // ⏸️ App went to background
        handleAppBackground();
      }
      
      setAppState(nextAppState);
    });

    return () => subscription.remove();
  }, [appState]);

  /**
   * 🔙 Android Back Handler
   */
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // 🏢 Handle business-specific back navigation
        if (isSidebarOpen) {
          setIsSidebarOpen(false);
          return true;
        }

        // 🔄 Check if we're on main business screen
        const currentRoute = segments.join('/');
        const isMainScreen = currentRoute === '(business)';
        
        if (isMainScreen) {
          // 🏠 Confirm exit on main screen
          handleExitConfirmation();
          return true;
        }

        return false;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => 
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [segments, isSidebarOpen])
  );

  /**
   * 🔄 Handle Network Recovery
   */
  const handleNetworkRecovery = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 🔄 Sync pending data
      await Promise.all([
        loadBusinessData(),
        fetchNotifications(),
        checkSession()
      ]);

      // 🎯 Track Recovery
      await trackEvent('network_recovery_completed', {
        userId: user?.id,
        recoveryTime: new Date().toISOString()
      });

      setIsLoading(false);

    } catch (error) {
      console.error('Network recovery failed:', error);
      
      await trackEvent('network_recovery_failed', {
        error: error.message,
        userId: user?.id
      });
      
      setIsLoading(false);
    }
  }, [user?.id, loadBusinessData, fetchNotifications, checkSession]);

  /**
   * 📱 Handle App Foreground
   */
  const handleAppForeground = useCallback(async () => {
    try {
      // 🔄 Refresh session and data
      await Promise.all([
        checkSession(),
        fetchNotifications()
      ]);

      // 🎯 Track App Resume
      await trackEvent('app_resumed', {
        userId: user?.id,
        resumeTime: new Date().toISOString()
      });

    } catch (error) {
      console.error('App foreground handling failed:', error);
    }
  }, [user?.id, checkSession, fetchNotifications]);

  /**
   * ⏸️ Handle App Background
   */
  const handleAppBackground = useCallback(async () => {
    try {
      // 💾 Save any pending data
      // 📊 Track background event
      await trackEvent('app_backgrounded', {
        userId: user?.id,
        backgroundTime: new Date().toISOString()
      });

    } catch (error) {
      console.error('App background handling failed:', error);
    }
  }, [user?.id]);

  /**
   * 🏠 Handle Exit Confirmation
   */
  const handleExitConfirmation = () => {
    // 🚨 Implement exit confirmation modal
    Alert.alert(
      'Exit MOSA FORGE',
      'Are you sure you want to exit?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Exit', 
          style: 'destructive',
          onPress: () => BackHandler.exitApp()
        }
      ]
    );
    return true;
  };

  /**
   * 🔄 Handle Navigation
   */
  const handleNavigation = useCallback(async (route, params = {}) => {
    try {
      // 🔐 Check Route Permissions
      const hasAccess = await checkRoutePermissions(route, user?.role);
      if (!hasAccess) {
        router.push('/auth/access-denied');
        return;
      }

      // 📊 Track Navigation
      await trackEvent('business_navigation', {
        fromRoute: segments.join('/'),
        toRoute: route,
        userId: user?.id,
        userRole: user?.role
      });

      // 🎯 Update Current View
      setCurrentView(route);

      // 🚀 Navigate
      router.push({ pathname: route, params });

    } catch (error) {
      console.error('Navigation failed:', error);
      
      await trackEvent('navigation_failed', {
        error: error.message,
        route,
        userId: user?.id
      });
    }
  }, [segments, user?.id, user?.role, router, setCurrentView]);

  /**
   * 🚪 Handle Logout
   */
  const handleLogout = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // 📊 Track Logout
      await trackEvent('user_logout', {
        userId: user?.id,
        logoutTime: new Date().toISOString()
      });

      // 🔐 Perform Logout
      await logout();

      // 🏠 Redirect to Login
      router.replace('/auth/login');

    } catch (error) {
      console.error('Logout failed:', error);
      
      await trackEvent('logout_failed', {
        error: error.message,
        userId: user?.id
      });
      
      setIsLoading(false);
    }
  }, [user?.id, logout, router]);

  /**
   * 🎯 Handle Notification Press
   */
  const handleNotificationPress = useCallback(async (notification) => {
    try {
      // 📊 Track Notification Interaction
      await trackEvent('notification_pressed', {
        notificationId: notification.id,
        notificationType: notification.type,
        userId: user?.id
      });

      // 🎯 Handle Notification Routing
      switch (notification.type) {
        case 'payment_received':
          handleNavigation('/business/payments', { paymentId: notification.data.paymentId });
          break;
        case 'student_enrolled':
          handleNavigation('/business/students', { studentId: notification.data.studentId });
          break;
        case 'quality_alert':
          handleNavigation('/business/quality', { alertId: notification.data.alertId });
          break;
        default:
          handleNavigation('/business/notifications');
      }

    } catch (error) {
      console.error('Notification handling failed:', error);
    }
  }, [user?.id, handleNavigation]);

  /**
   * 🎨 Get Theme Colors
   */
  const themeColors = Colors[colorScheme || 'light'];
  const styles = createStyles(themeColors, tabletMode, landscapeMode);

  /**
   * 🔄 Render Loading State
   */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <LoadingOverlay 
          message="Loading Business Dashboard..."
          showProgress
        />
      </SafeAreaView>
    );
  }

  /**
   * 🔐 Render Authentication Guard
   */
  if (!isAuthenticated) {
    return <Slot />;
  }

  /**
   * 🏢 Render Business Layout
   */
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={themeColors.background.primary}
          animated
        />
        
        <SafeAreaView style={styles.safeArea}>
          {/* 🌐 Offline Banner */}
          {!isOnline && (
            <OfflineBanner 
              onRetry={handleNetworkRecovery}
            />
          )}

          {/* 📱 Performance Monitor (Dev only) */}
          {__DEV__ && (
            <PerformanceMonitor />
          )}

          {/* 🔐 Session Timeout */}
          <SessionTimeout 
            onTimeout={handleLogout}
            timeoutDuration={30 * 60 * 1000} // 30 minutes
          />

          {/* 🏢 Business Layout Container */}
          <View style={styles.layoutContainer}>
            {/* 📱 Sidebar (Tablet/Landscape) */}
            {isLargeScreen && (
              <BusinessSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                currentRoute={segments.join('/')}
                onNavigate={handleNavigation}
                user={user}
                businessData={businessData}
                unreadNotifications={unreadCount}
                onNotificationPress={handleNotificationPress}
                onLogout={handleLogout}
              />
            )}

            {/* 🎯 Main Content Area */}
            <View style={styles.contentContainer}>
              {/* 📱 Mobile Header (Phone/Portrait) */}
              {!isLargeScreen && (
                <BusinessNavigationBar
                  title={NavigationConfig[segments.join('/')]?.title || 'MOSA FORGE'}
                  onMenuPress={() => setIsSidebarOpen(true)}
                  onNotificationPress={() => handleNavigation('/business/notifications')}
                  onProfilePress={() => handleNavigation('/business/profile')}
                  unreadCount={unreadCount}
                  user={user}
                />
              )}

              {/* 🚀 Page Content */}
              <View style={styles.pageContainer}>
                <PermissionGuard 
                  requiredPermissions={BusinessPermissions[segments.join('/')] || []}
                  fallbackRoute="/auth/access-denied"
                >
                  <Slot />
                </PermissionGuard>
              </View>
            </View>
          </View>

          {/* 📱 Bottom Navigation (Phone/Portrait) */}
          {!isLargeScreen && (
            <BusinessNavigationBar
              type="bottom"
              currentRoute={segments.join('/')}
              onNavigate={handleNavigation}
              user={user}
              businessData={businessData}
            />
          )}
        </SafeAreaView>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

/**
 * 🎨 Create Stylesheet
 */
const createStyles = (colors, isTablet, isLandscape) => 
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    safeArea: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.primary,
    },
    layoutContainer: {
      flex: 1,
      flexDirection: isTablet || isLandscape ? 'row' : 'column',
    },
    contentContainer: {
      flex: 1,
      flexDirection: 'column',
    },
    pageContainer: {
      flex: 1,
      paddingHorizontal: getResponsiveValue({
        phone: Spacing.md,
        tablet: Spacing.lg,
        desktop: Spacing.xl
      }),
      paddingTop: getResponsiveValue({
        phone: Spacing.sm,
        tablet: Spacing.md,
        desktop: Spacing.lg
      }),
      paddingBottom: getResponsiveValue({
        phone: Spacing.xl, // Extra space for bottom nav
        tablet: Spacing.lg,
        desktop: Spacing.lg
      }),
      backgroundColor: colors.background.secondary,
    },
    headerContainer: {
      backgroundColor: colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.light,
      ...Shadows.small,
    },
    headerTitle: {
      ...Typography.heading.h3,
      color: colors.text.primary,
      fontWeight: '600',
    },
    headerSubtitle: {
      ...Typography.body.small,
      color: colors.text.secondary,
      marginTop: Spacing.xs,
    },
  });

/**
 * 🎯 Business Stack Navigator Configuration
 * Defines all business-related screen configurations
 */
export const BusinessStack = () => (
  <Stack
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      gestureEnabled: true,
      gestureDirection: 'horizontal',
      contentStyle: {
        backgroundColor: Colors.light.background.secondary,
      },
    }}
  >
    {/* 🏠 Business Dashboard */}
    <Stack.Screen
      name="index"
      options={{
        title: 'Dashboard',
        animationTypeForReplace: 'push',
      }}
    />

    {/* 👥 Student Management */}
    <Stack.Screen
      name="students"
      options={{
        title: 'Students',
        gestureEnabled: true,
      }}
    />
    <Stack.Screen
      name="students/[id]"
      options={{
        title: 'Student Details',
        gestureEnabled: true,
      }}
    />

    {/* 💰 Payments & Revenue */}
    <Stack.Screen
      name="payments"
      options={{
        title: 'Payments',
        gestureEnabled: true,
      }}
    />
    <Stack.Screen
      name="payments/[id]"
      options={{
        title: 'Payment Details',
        gestureEnabled: true,
      }}
    />

    {/* ⭐ Quality Management */}
    <Stack.Screen
      name="quality"
      options={{
        title: 'Quality Dashboard',
        gestureEnabled: true,
      }}
    />
    <Stack.Screen
      name="quality/metrics"
      options={{
        title: 'Quality Metrics',
        gestureEnabled: true,
      }}
    />

    {/* 📊 Analytics & Reports */}
    <Stack.Screen
      name="analytics"
      options={{
        title: 'Analytics',
        gestureEnabled: true,
      }}
    />
    <Stack.Screen
      name="analytics/reports"
      options={{
        title: 'Detailed Reports',
        gestureEnabled: true,
      }}
    />

    {/* 🔔 Notifications */}
    <Stack.Screen
      name="notifications"
      options={{
        title: 'Notifications',
        gestureEnabled: true,
      }}
    />

    {/* 👤 Profile & Settings */}
    <Stack.Screen
      name="profile"
      options={{
        title: 'Profile',
        gestureEnabled: true,
      }}
    />
    <Stack.Screen
      name="settings"
      options={{
        title: 'Settings',
        gestureEnabled: true,
      }}
    />

    {/* 🛠️ Tools & Resources */}
    <Stack.Screen
      name="tools"
      options={{
        title: 'Tools',
        gestureEnabled: true,
      }}
    />
    <Stack.Screen
      name="resources"
      options={{
        title: 'Resources',
        gestureEnabled: true,
      }}
    />

    {/* ❓ Help & Support */}
    <Stack.Screen
      name="help"
      options={{
        title: 'Help Center',
        gestureEnabled: true,
      }}
    />
    <Stack.Screen
      name="support"
      options={{
        title: 'Support',
        gestureEnabled: true,
      }}
    />
  </Stack>
);

/**
 * 🎯 Business Tabs Configuration
 * Alternative tab-based navigation for specific business flows
 */
export const BusinessTabs = () => (
  <Tabs
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: Colors.light.background.primary,
        borderTopWidth: 1,
        borderTopColor: Colors.light.border.light,
        height: 60,
        paddingBottom: Spacing.sm,
        paddingTop: Spacing.sm,
      },
      tabBarActiveTintColor: Colors.light.primary.main,
      tabBarInactiveTintColor: Colors.light.text.secondary,
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
      },
      tabBarIconStyle: {
        marginBottom: 2,
      },
    }}
  >
    <Tabs.Screen
      name="dashboard"
      options={{
        title: 'Dashboard',
        tabBarIcon: ({ color, size }) => (
          <BusinessIcons.Dashboard color={color} size={size} />
        ),
      }}
    />
    <Tabs.Screen
      name="students"
      options={{
        title: 'Students',
        tabBarIcon: ({ color, size }) => (
          <BusinessIcons.Students color={color} size={size} />
        ),
      }}
    />
    <Tabs.Screen
      name="payments"
      options={{
        title: 'Payments',
        tabBarIcon: ({ color, size }) => (
          <BusinessIcons.Payments color={color} size={size} />
        ),
      }}
    />
    <Tabs.Screen
      name="quality"
      options={{
        title: 'Quality',
        tabBarIcon: ({ color, size }) => (
          <BusinessIcons.Quality color={color} size={size} />
        ),
      }}
    />
    <Tabs.Screen
      name="analytics"
      options={{
        title: 'Analytics',
        tabBarIcon: ({ color, size }) => (
          <BusinessIcons.Analytics color={color} size={size} />
        ),
      }}
    />
  </Tabs>
);

/**
 * 🎯 Export Layout Configuration
 */
export const LayoutConfig = {
  // 📱 Responsive Breakpoints
  breakpoints: {
    phone: 480,
    tablet: 768,
    desktop: 1024,
  },

  // 🎨 Theme Configuration
  themes: {
    light: {
      primary: Colors.light.primary.main,
      background: Colors.light.background.primary,
      text: Colors.light.text.primary,
    },
    dark: {
      primary: Colors.dark.primary.main,
      background: Colors.dark.background.primary,
      text: Colors.dark.text.primary,
    },
  },

  // 📊 Analytics Configuration
  analytics: {
    enabled: true,
    trackScreenViews: true,
    trackUserInteractions: true,
    trackPerformance: true,
  },

  // 🔐 Security Configuration
  security: {
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    autoLogout: true,
    encryption: true,
  },

  // 🌐 Network Configuration
  network: {
    retryAttempts: 3,
    retryDelay: 1000,
    offlineSupport: true,
    backgroundSync: true,
  },

  // 📱 Performance Configuration
  performance: {
    imageOptimization: true,
    codeSplitting: true,
    lazyLoading: true,
    memoryManagement: true,
  },
};

/**
 * 🎯 Export Navigation Helpers
 */
export const NavigationHelpers = {
  /**
   * Navigate to business route with permission check
   */
  navigateToBusinessRoute: async (route, params = {}, context) => {
    const { user, hasPermission } = context || {};
    
    // 🔐 Check permission
    const requiredPermissions = BusinessPermissions[route] || [];
    const hasAccess = await hasPermission?.(requiredPermissions);
    
    if (!hasAccess) {
      throw new Error('Insufficient permissions for this route');
    }

    // 🚀 Navigate
    return { route, params };
  },

  /**
   * Get current business route configuration
   */
  getCurrentRouteConfig: (segments) => {
    const route = segments.join('/');
    return NavigationConfig[route] || {};
  },

  /**
   * Check if user can access route
   */
  canAccessRoute: async (route, userRole) => {
    const requiredPermissions = BusinessPermissions[route] || [];
    
    // 🔐 Check against user role
    const userPermissions = BusinessPermissions.roles[userRole] || [];
    
    return requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
  },
};

/**
 * 🎯 Export Layout Hooks
 */
export const useBusinessLayout = () => {
  const router = useRouter();
  const segments = useSegments();
  const { user, isAuthenticated } = useAuth();
  const { businessData } = useBusiness();

  /**
   * Get current business context
   */
  const getBusinessContext = () => ({
    user,
    isAuthenticated,
    businessData,
    currentRoute: segments.join('/'),
    routeConfig: NavigationConfig[segments.join('/')] || {},
  });

  /**
   * Refresh business data
   */
  const refreshBusinessData = async () => {
    // 🔄 Implement data refresh logic
  };

  /**
   * Check route access
   */
  const checkRouteAccess = async (route) => {
    return await NavigationHelpers.canAccessRoute(route, user?.role);
  };

  return {
    getBusinessContext,
    refreshBusinessData,
    checkRouteAccess,
    currentRoute: segments.join('/'),
    isAuthenticated,
    user,
    businessData,
  };
};