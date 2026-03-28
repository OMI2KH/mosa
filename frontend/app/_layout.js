/**
 * 🏢 MOSA FORGE - Enterprise Mobile App Root Layout
 * 🎯 Global Navigation & Authentication Architecture
 * 📱 Responsive Layout with Platform Optimization
 * 🔐 Secure Session Management & State Persistence
 * 🚀 Production-Ready Enterprise Architecture
 * 
 * @module AppLayout
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Platform, useColorScheme, View, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import * as Localization from 'expo-localization';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// 🏗️ Enterprise Dependencies
import EnterpriseLogger from '../utils/enterprise-logger';
import AuthService from '../services/auth-service';
import PushNotificationService from '../services/push-notification-service';
import AnalyticsService from '../services/analytics-service';
import OfflineManager from '../utils/offline-manager';
import ErrorBoundary from '../components/shared/error-boundary';
import NetworkStatus from '../components/shared/network-status';
import AppUpdateChecker from '../components/shared/app-update-checker';

// 🔐 Authentication Context
import { AuthProvider, useAuth } from '../contexts/auth-context';

// 📊 Global State Contexts
import { PaymentProvider } from '../contexts/payment-context';
import { LearningProvider } from '../contexts/learning-context';
import { QualityProvider } from '../contexts/quality-context';
import { EnrollmentProvider } from '../contexts/enrollment-context';
import { TrainingProvider } from '../contexts/training-context';

// 🎨 Theme & Design System
import { ThemeProvider, useTheme } from '../theme/theme-context';
import { Colors, Typography, Spacing, Shadows } from '../theme/design-system';

// 📱 Navigation Components
import { BottomTabBar } from '../components/navigation/bottom-tab-bar';
import { NavigationHeader } from '../components/navigation/navigation-header';
import { LoadingScreen } from '../components/shared/loading-screen';

// 🔗 Screens (Lazy Loaded)
const AuthStack = React.lazy(() => import('./(auth)/auth-stack'));
const OnboardingStack = React.lazy(() => import('./(onboarding)/onboarding-stack'));
const MainTabNavigator = React.lazy(() => import('./main-tab-navigator'));
const AdminStack = React.lazy(() => import('./(admin)/admin-stack'));
const ExpertStack = React.lazy(() => import('./(expert-portal)/expert-stack'));

// 🏗️ Navigation Stack Instances
const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// 🎯 Keep splash screen visible while loading resources
SplashScreen.preventAutoHideAsync();

/**
 * 🏢 ENTERPRISE ROOT LAYOUT COMPONENT
 */
export default function AppLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState(null);
  const [appConfig, setAppConfig] = useState(null);
  const [isNetworkConnected, setIsNetworkConnected] = useState(true);

  // 📊 Enterprise Logger Instance
  const logger = React.useRef(
    new EnterpriseLogger({
      service: 'mobile-app',
      module: 'app-layout',
      environment: process.env.EXPO_PUBLIC_ENVIRONMENT || 'development'
    })
  );

  /**
   * 🏗️ Initialize Enterprise Services
   */
  const initializeAppServices = useCallback(async () => {
    const startTime = Date.now();
    const initializationId = `init_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      logger.current.info('Initializing enterprise app services...', {
        initializationId,
        platform: Platform.OS,
        version: process.env.EXPO_PUBLIC_APP_VERSION || '2.0.0'
      });

      // 📱 Platform-Specific Configuration
      await configurePlatformSpecificSettings();

      // 📦 Load App Configuration
      const config = await loadAppConfiguration();
      setAppConfig(config);

      // 🔐 Check Authentication State
      const authState = await checkAuthenticationState();
      
      // 🎯 Determine Initial Route
      const route = await determineInitialRoute(authState);
      setInitialRoute(route);

      // 🔗 Initialize Services
      await initializeCoreServices(authState);

      // 📊 Record Initialization Metrics
      const initializationTime = Date.now() - startTime;
      logger.current.performance('App initialization completed', {
        initializationId,
        initializationTime,
        initialRoute: route,
        authState: authState.isAuthenticated
      });

      setAppIsReady(true);

    } catch (error) {
      logger.current.critical('App initialization failed', {
        error: error.message,
        stack: error.stack,
        initializationId
      });

      // 🚨 Show initialization error
      Alert.alert(
        'Initialization Error',
        'Failed to initialize application. Please restart the app.',
        [{ text: 'Restart', onPress: () => initializeAppServices() }]
      );
    }
  }, []);

  /**
   * 📱 Configure Platform-Specific Settings
   */
  const configurePlatformSpecificSettings = async () => {
    // 📱 iOS Specific Configuration
    if (Platform.OS === 'ios') {
      // Configure iOS-specific settings
      await configureIOSSpecifics();
    }

    // 🤖 Android Specific Configuration
    if (Platform.OS === 'android') {
      // Configure Android-specific settings
      await configureAndroidSpecifics();
    }

    // 🌍 Localization Configuration
    const locale = await Localization.getLocales();
    logger.current.debug('Device localization configured', {
      locale: locale[0]?.languageCode,
      region: locale[0]?.regionCode
    });
  };

  /**
   * 📦 Load App Configuration
   */
  const loadAppConfiguration = async () => {
    const config = {
      // 🔗 API Configuration
      api: {
        baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
        timeout: 30000,
        retryAttempts: 3
      },

      // 🔐 Security Configuration
      security: {
        encryptionEnabled: true,
        biometricAuth: true,
        sessionTimeout: 3600 // 1 hour
      },

      // 📊 Analytics Configuration
      analytics: {
        enabled: true,
        trackingId: process.env.EXPO_PUBLIC_ANALYTICS_ID,
        autoScreenTracking: true
      },

      // 📱 Feature Flags
      features: {
        offlineMode: true,
        pushNotifications: true,
        deepLinking: true,
        appUpdates: true
      },

      // 🎨 Theme Configuration
      theme: {
        primaryColor: Colors.primary,
        secondaryColor: Colors.secondary,
        darkMode: colorScheme === 'dark'
      }
    };

    // 💾 Load saved preferences
    const savedPreferences = await AsyncStorage.getItem('app_preferences');
    if (savedPreferences) {
      const preferences = JSON.parse(savedPreferences);
      config.theme = { ...config.theme, ...preferences.theme };
    }

    return config;
  };

  /**
   * 🔐 Check Authentication State
   */
  const checkAuthenticationState = async () => {
    try {
      const authService = new AuthService();
      const authState = await authService.getCurrentSession();

      // 🔍 Validate session integrity
      if (authState.isAuthenticated) {
        const isValid = await authService.validateSession(authState.session);
        if (!isValid) {
          await authService.clearSession();
          return { isAuthenticated: false, user: null, session: null };
        }
      }

      return authState;

    } catch (error) {
      logger.current.error('Authentication state check failed', {
        error: error.message
      });
      return { isAuthenticated: false, user: null, session: null };
    }
  };

  /**
   * 🎯 Determine Initial Route
   */
  const determineInitialRoute = async (authState) => {
    // 🏠 Return to previous screen if exists
    const lastScreen = await AsyncStorage.getItem('last_screen');
    if (lastScreen && authState.isAuthenticated) {
      return lastScreen;
    }

    // 🆕 First time user
    const hasCompletedOnboarding = await AsyncStorage.getItem('has_completed_onboarding');
    if (!hasCompletedOnboarding) {
      return 'Onboarding';
    }

    // 🔐 Authentication check
    if (!authState.isAuthenticated) {
      return 'Auth';
    }

    // 👥 Role-based routing
    if (authState.user?.role === 'admin') {
      return 'Admin';
    }

    if (authState.user?.role === 'expert') {
      return 'Expert';
    }

    // 🎓 Default student route
    return 'Main';
  };

  /**
   * 🔗 Initialize Core Services
   */
  const initializeCoreServices = async (authState) => {
    const services = [];

    // 📱 Push Notifications
    if (appConfig?.features.pushNotifications) {
      services.push(initializePushNotifications(authState));
    }

    // 📊 Analytics
    if (appConfig?.analytics.enabled) {
      services.push(initializeAnalytics(authState));
    }

    // 📴 Offline Manager
    if (appConfig?.features.offlineMode) {
      services.push(initializeOfflineManager());
    }

    // 🔄 App Update Checker
    if (appConfig?.features.appUpdates) {
      services.push(checkForAppUpdates());
    }

    // ⚡ Initialize all services in parallel
    await Promise.allSettled(services);
  };

  /**
   * 📱 Initialize Push Notifications
   */
  const initializePushNotifications = async (authState) => {
    try {
      const pushService = new PushNotificationService();
      
      // 🔧 Configure notifications
      await pushService.configure({
        permissions: {
          alert: true,
          badge: true,
          sound: true
        },
        categories: [
          {
            identifier: 'enrollment_updates',
            actions: [
              { identifier: 'view', title: 'View', options: { foreground: true } },
              { identifier: 'dismiss', title: 'Dismiss', options: { destructive: true } }
            ]
          },
          {
            identifier: 'payment_updates',
            actions: [
              { identifier: 'view_payment', title: 'View Payment', options: { foreground: true } }
            ]
          }
        ]
      });

      // 📱 Register device token
      if (authState.isAuthenticated) {
        await pushService.registerDevice(authState.user.id);
      }

      logger.current.debug('Push notifications initialized');

    } catch (error) {
      logger.current.error('Push notifications initialization failed', {
        error: error.message
      });
    }
  };

  /**
   * 📊 Initialize Analytics
   */
  const initializeAnalytics = async (authState) => {
    try {
      const analytics = new AnalyticsService({
        trackingId: appConfig.analytics.trackingId,
        autoScreenTracking: appConfig.analytics.autoScreenTracking
      });

      // 👤 Identify user if authenticated
      if (authState.isAuthenticated && authState.user) {
        await analytics.identifyUser({
          userId: authState.user.id,
          traits: {
            name: authState.user.name,
            email: authState.user.email,
            role: authState.user.role,
            tier: authState.user.tier
          }
        });
      }

      // 📈 Track app launch
      await analytics.trackEvent('app_launched', {
        platform: Platform.OS,
        version: process.env.EXPO_PUBLIC_APP_VERSION,
        locale: Localization.locale
      });

      logger.current.debug('Analytics initialized');

    } catch (error) {
      logger.current.error('Analytics initialization failed', {
        error: error.message
      });
    }
  };

  /**
   * 📴 Initialize Offline Manager
   */
  const initializeOfflineManager = async () => {
    try {
      const offlineManager = new OfflineManager({
        storage: AsyncStorage,
        maxQueueSize: 100,
        retryInterval: 5000
      });

      // 🎯 Start offline queue processing
      offlineManager.startProcessing();

      logger.current.debug('Offline manager initialized');

    } catch (error) {
      logger.current.error('Offline manager initialization failed', {
        error: error.message
      });
    }
  };

  /**
   * 🔄 Check for App Updates
   */
  const checkForAppUpdates = async () => {
    try {
      // 🏗️ This would integrate with your app update service
      // For now, we'll just log the check
      logger.current.debug('App update check completed');

    } catch (error) {
      logger.current.error('App update check failed', {
        error: error.message
      });
    }
  };

  /**
   * 🌐 Network Status Handler
   */
  const handleNetworkChange = useCallback((isConnected) => {
    setIsNetworkConnected(isConnected);
    
    if (!isConnected) {
      logger.current.warn('Network connection lost');
    } else {
      logger.current.info('Network connection restored');
    }
  }, []);

  /**
   * 🎯 Handle Layout Ready
   */
  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  /**
   * ⚡ Effect: Initialize App
   */
  useEffect(() => {
    initializeAppServices();
  }, [initializeAppServices]);

  /**
   * ⏳ Show Loading Screen while initializing
   */
  if (!appIsReady || !initialRoute) {
    return (
      <ThemeProvider>
        <SafeAreaProvider>
          <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
            <LoadingScreen 
              message="Initializing MOSA FORGE..."
              showProgress={true}
            />
          </SafeAreaView>
        </SafeAreaProvider>
      </ThemeProvider>
    );
  }

  /**
   * 🏢 Main App Render
   */
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <PaymentProvider>
            <LearningProvider>
              <QualityProvider>
                <EnrollmentProvider>
                  <TrainingProvider>
                    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
                      <SafeAreaProvider>
                        <AppNavigation 
                          initialRoute={initialRoute}
                          appConfig={appConfig}
                          onNetworkChange={handleNetworkChange}
                        />
                      </SafeAreaProvider>
                    </GestureHandlerRootView>
                  </TrainingProvider>
                </EnrollmentProvider>
              </QualityProvider>
            </LearningProvider>
          </PaymentProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

/**
 * 🗺️ APP NAVIGATION COMPONENT
 */
function AppNavigation({ initialRoute, appConfig, onNetworkChange }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { colors } = useTheme();
  const colorScheme = useColorScheme();

  // 🎨 Navigation Theme Configuration
  const navigationTheme = React.useMemo(() => {
    const baseTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.notification
      },
      fonts: {
        regular: Typography.fontFamily.regular,
        medium: Typography.fontFamily.medium,
        bold: Typography.fontFamily.bold
      }
    };
  }, [colorScheme, colors]);

  /**
   * 🛡️ Render Protected Screen
   */
  const renderProtectedScreen = (ScreenComponent, options = {}) => {
    if (isLoading) {
      return <LoadingScreen />;
    }

    if (!isAuthenticated) {
      return <AuthStack />;
    }

    return <ScreenComponent {...options} />;
  };

  /**
   * 👤 Role-Based Screen Renderer
   */
  const renderRoleBasedScreen = () => {
    if (isLoading) {
      return <LoadingScreen />;
    }

    if (!isAuthenticated) {
      return <AuthStack />;
    }

    // 👑 Admin Portal
    if (user?.role === 'admin') {
      return (
        <React.Suspense fallback={<LoadingScreen />}>
          <AdminStack />
        </React.Suspense>
      );
    }

    // 👨‍🏫 Expert Portal
    if (user?.role === 'expert') {
      return (
        <React.Suspense fallback={<LoadingScreen />}>
          <ExpertStack />
        </React.Suspense>
      );
    }

    // 🎓 Student Portal (Default)
    return (
      <React.Suspense fallback={<LoadingScreen />}>
        <MainTabNavigator />
      </React.Suspense>
    );
  };

  /**
   * 🏠 Main App Navigator
   */
  const MainNavigator = () => (
    <RootStack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        header: (props) => <NavigationHeader {...props} />,
        animation: Platform.OS === 'ios' ? 'default' : 'fade',
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        contentStyle: {
          backgroundColor: colors.background
        }
      }}
    >
      {/* 🆕 Onboarding Flow */}
      <RootStack.Screen
        name="Onboarding"
        options={{ headerShown: false }}
      >
        {() => (
          <React.Suspense fallback={<LoadingScreen />}>
            <OnboardingStack />
          </React.Suspense>
        )}
      </RootStack.Screen>

      {/* 🔐 Authentication Flow */}
      <RootStack.Screen
        name="Auth"
        options={{ headerShown: false }}
      >
        {() => (
          <React.Suspense fallback={<LoadingScreen />}>
            <AuthStack />
          </React.Suspense>
        )}
      </RootStack.Screen>

      {/* 🏠 Main App Tabs */}
      <RootStack.Screen
        name="Main"
        options={{ headerShown: false }}
      >
        {renderRoleBasedScreen}
      </RootStack.Screen>

      {/* 👑 Admin Portal */}
      <RootStack.Screen
        name="Admin"
        options={{ headerShown: false }}
      >
        {() => renderProtectedScreen(AdminStack)}
      </RootStack.Screen>

      {/* 👨‍🏫 Expert Portal */}
      <RootStack.Screen
        name="Expert"
        options={{ headerShown: false }}
      >
        {() => renderProtectedScreen(ExpertStack)}
      </RootStack.Screen>
    </RootStack.Navigator>
  );

  return (
    <>
      {/* 📱 Status Bar Configuration */}
      <StatusBar
        style={colorScheme === 'dark' ? 'light' : 'dark'}
        backgroundColor={colors.background}
        translucent={true}
      />

      {/* 🌐 Network Status Monitor */}
      <NetworkStatus onNetworkChange={onNetworkChange} />

      {/* 🔄 App Update Checker */}
      {appConfig?.features.appUpdates && <AppUpdateChecker />}

      {/* 🗺️ Navigation Container */}
      <NavigationContainer
        theme={navigationTheme}
        onStateChange={async (state) => {
          // 💾 Save last screen for return
          if (state?.routes) {
            const currentRoute = state.routes[state.index];
            await AsyncStorage.setItem('last_screen', currentRoute.name);
          }
        }}
        linking={{
          prefixes: [
            'mosaforge://',
            'https://mosaforge.com',
            'https://*.mosaforge.com'
          ],
          config: {
            screens: {
              Auth: {
                screens: {
                  Login: 'login',
                  Register: 'register',
                  ForgotPassword: 'forgot-password'
                }
              },
              Main: {
                screens: {
                  Home: 'home',
                  Learning: 'learning/:courseId',
                  Progress: 'progress',
                  Profile: 'profile'
                }
              },
              Expert: {
                screens: {
                  Dashboard: 'expert/dashboard',
                  Students: 'expert/students',
                  Earnings: 'expert/earnings'
                }
              }
            }
          }
        }}
        fallback={<LoadingScreen />}
      >
        <MainNavigator />
      </NavigationContainer>
    </>
  );
}

/**
 * 📱 Platform-Specific Configuration Functions
 */
async function configureIOSSpecifics() {
  // iOS-specific configurations
  // Example: Configure appearance, safe areas, etc.
}

async function configureAndroidSpecifics() {
  // Android-specific configurations
  // Example: Configure status bar, navigation bar, etc.
}