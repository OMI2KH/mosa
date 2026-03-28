/**
 * 🎯 MOSA FORGE: Enterprise Mindset Phase Layout
 * 
 * @module MindsetLayout
 * @description Root layout for mindset phase with navigation, state management, and progress tracking
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Mindset phase navigation structure
 * - Progress persistence and synchronization
 * - Offline capability with conflict resolution
 * - Performance-optimized asset loading
 * - Deep linking and navigation state recovery
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { 
  View, 
  StyleSheet, 
  Platform, 
  AppState,
  NativeEventEmitter,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// 🏗️ Enterprise Contexts
import { MindsetProvider, useMindset } from '../../contexts/mindset-context';
import { AuthProvider, useAuth } from '../../contexts/auth-context';
import { QualityProvider } from '../../contexts/quality-context';
import { ProgressProvider } from '../../contexts/progress-context';

// 🏗️ Enterprise Components
import MindsetNavigationBar from '../../components/mindset/mindset-navigation-bar';
import ProgressOverlay from '../../components/mindset/progress-overlay';
import OfflineIndicator from '../../components/shared/offline-indicator';
import SyncStatus from '../../components/shared/sync-status';
import ErrorBoundary from '../../components/shared/error-boundary';

// 🏗️ Enterprise Hooks
import { useNetworkStatus } from '../../hooks/use-network-status';
import { usePerformanceMonitoring } from '../../hooks/use-performance-monitoring';
import { useDeepLinking } from '../../hooks/use-deep-linking';
import { useAppState } from '../../hooks/use-app-state';

// 🏗️ Enterprise Services
import { mindsetSyncService } from '../../services/mindset-sync-service';
import { analyticsService } from '../../services/analytics-service';
import { errorTrackingService } from '../../services/error-tracking-service';

// 🏗️ Constants
const MINDSET_PHASE_CONFIG = {
  TOTAL_WEEKS: 4,
  EXERCISES_PER_WEEK: 5,
  DURATION_DAYS: 28,
  COMPLETION_THRESHOLD: 0.8,
  SYNC_INTERVAL: 30000, // 30 seconds
  CACHE_TTL: 3600000, // 1 hour
};

/**
 * 🏗️ Mindset Layout Wrapper Component
 * @component MindsetLayoutWrapper
 * @description Enterprise wrapper with providers and error boundary
 */
const MindsetLayoutWrapper = ({ children, enrollmentData }) => {
  return (
    <ErrorBoundary
      fallback={<MindsetErrorFallback />}
      onError={errorTrackingService.captureException}
    >
      <GestureHandlerRootView style={styles.gestureContainer}>
        <AuthProvider>
          <QualityProvider>
            <ProgressProvider>
              <MindsetProvider enrollmentData={enrollmentData}>
                <MindsetLayoutContent>
                  {children}
                </MindsetLayoutContent>
              </MindsetProvider>
            </ProgressProvider>
          </QualityProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

/**
 * 🏗️ Mindset Layout Content Component
 * @component MindsetLayoutContent
 * @description Main layout with navigation, state management, and monitoring
 */
const MindsetLayoutContent = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  
  // 🏗️ Enterprise Hooks
  const { isConnected, connectionType } = useNetworkStatus();
  const { trackPerformance, startTrace, endTrace } = usePerformanceMonitoring();
  const { handleDeepLink, restoreNavigationState } = useDeepLinking();
  const appState = useAppState();
  
  // 🏗️ Enterprise Contexts
  const { 
    currentWeek, 
    currentExercise, 
    progress,
    syncProgress,
    restoreProgress,
    isSyncing,
    lastSyncTime
  } = useMindset();
  
  const { user, isAuthenticated } = useAuth();
  
  // 🏗️ Refs for performance optimization
  const syncIntervalRef = useRef(null);
  const performanceTraceRef = useRef(null);
  const navigationStateRef = useRef({
    lastPath: pathname,
    visitedScreens: new Set(),
    navigationStartTime: Date.now()
  });

  /**
   * 🏗️ Initialize Mindset Phase
   */
  const initializeMindsetPhase = useCallback(async () => {
    const traceId = startTrace('mindset_phase_initialization');
    
    try {
      // 🎯 Pre-load critical assets
      await Promise.all([
        SplashScreen.preventAutoHideAsync(),
        preloadMindsetAssets(),
        initializeProgressTracking(),
      ]);

      // 🎯 Restore navigation state from deep links or previous session
      await restoreNavigationState('mindset');
      
      // 🎯 Initialize progress from local storage or server
      await restoreProgress();
      
      // 🎯 Start performance monitoring
      trackPerformance('mindset_layout_mount', {
        week: currentWeek,
        exercise: currentExercise,
        progress: progress.overall
      });

      // 🎯 Log mindset phase entry
      analyticsService.trackEvent('mindset_phase_entered', {
        userId: user?.id,
        enrollmentId: enrollmentData?.id,
        currentWeek,
        currentExercise,
        connectionType
      });

    } catch (error) {
      errorTrackingService.captureException(error, {
        context: 'mindset_layout_initialization',
        userId: user?.id
      });
    } finally {
      await SplashScreen.hideAsync();
      endTrace(traceId);
    }
  }, [currentWeek, currentExercise, progress, user]);

  /**
   * 🏗️ Pre-load Mindset Assets
   */
  const preloadMindsetAssets = async () => {
    const assetsToPreload = [
      // Exercise content and media
      require('../../assets/mindset/exercise-background.png'),
      require('../../assets/mindset/success-animation.json'),
      require('../../assets/mindset/progress-indicator.png'),
      
      // Weekly content assets
      ...Array.from({ length: MINDSET_PHASE_CONFIG.TOTAL_WEEKS }, (_, i) => 
        require(`../../assets/mindset/week-${i + 1}/header.jpg`)
      ),
    ];

    try {
      await Promise.all(assetsToPreload.map(asset => 
        Asset.fromModule(asset).downloadAsync()
      ));
    } catch (error) {
      console.warn('Some mindset assets failed to preload:', error);
    }
  };

  /**
   * 🏗️ Initialize Progress Tracking
   */
  const initializeProgressTracking = async () => {
    try {
      // Initialize local progress database
      await mindsetSyncService.initializeLocalDB();
      
      // Set up sync interval
      syncIntervalRef.current = setInterval(async () => {
        if (isConnected && !isSyncing) {
          await syncProgress();
        }
      }, MINDSET_PHASE_CONFIG.SYNC_INTERVAL);

    } catch (error) {
      errorTrackingService.captureException(error, {
        context: 'progress_tracking_initialization'
      });
    }
  };

  /**
   * 🏗️ Handle Navigation State Changes
   */
  const handleNavigationStateChange = useCallback((newPathname) => {
    const navigationData = {
      from: navigationStateRef.current.lastPath,
      to: newPathname,
      duration: Date.now() - navigationStateRef.current.navigationStartTime,
      week: currentWeek,
      exercise: currentExercise
    };

    // Track navigation for analytics
    analyticsService.trackEvent('mindset_navigation', navigationData);
    
    // Update navigation state
    navigationStateRef.current = {
      ...navigationStateRef.current,
      lastPath: newPathname,
      visitedScreens: navigationStateRef.current.visitedScreens.add(newPathname),
      navigationStartTime: Date.now()
    };

    // Performance monitoring for screen transitions
    trackPerformance('screen_transition', navigationData);
  }, [currentWeek, currentExercise]);

  /**
   * 🏗️ Handle App State Changes
   */
  const handleAppStateChange = useCallback(async (nextAppState) => {
    if (nextAppState === 'background') {
      // Sync progress when app goes to background
      if (isConnected) {
        await syncProgress();
      }
      
      // Track session end
      analyticsService.trackEvent('mindset_session_ended', {
        duration: Date.now() - navigationStateRef.current.navigationStartTime,
        progress: progress.overall,
        week: currentWeek,
        exercise: currentExercise
      });
    } else if (nextAppState === 'active') {
      // Restore state when app becomes active
      navigationStateRef.current.navigationStartTime = Date.now();
      
      // Sync if we have network connection
      if (isConnected && Date.now() - lastSyncTime > MINDSET_PHASE_CONFIG.SYNC_INTERVAL) {
        await syncProgress();
      }
    }
  }, [isConnected, syncProgress, lastSyncTime, currentWeek, currentExercise, progress]);

  /**
   * 🏗️ Handle Deep Links
   */
  const handleIncomingDeepLink = useCallback(async (url) => {
    try {
      const navigationAction = await handleDeepLink(url);
      if (navigationAction?.type === 'mindset') {
        router.replace(navigationAction.screen);
      }
    } catch (error) {
      errorTrackingService.captureException(error, {
        context: 'deep_link_handling',
        url
      });
    }
  }, [handleDeepLink, router]);

  // 🎯 Effect: Initialize mindset phase
  useEffect(() => {
    initializeMindsetPhase();

    return () => {
      // Cleanup on unmount
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // 🎯 Effect: Handle pathname changes
  useEffect(() => {
    handleNavigationStateChange(pathname);
  }, [pathname]);

  // 🎯 Effect: Handle app state changes
  useEffect(() => {
    handleAppStateChange(appState);
  }, [appState]);

  // 🎯 Effect: Handle network status changes
  useEffect(() => {
    if (isConnected && !isSyncing) {
      // Sync immediately when connection is restored
      syncProgress();
    }
  }, [isConnected]);

  /**
   * 🏗️ Render Screen Header Configuration
   */
  const renderScreenHeader = (route) => {
    const headerConfig = {
      // Week screens
      '(week1)': { 
        title: 'Wealth Consciousness',
        subtitle: 'Week 1 - Mindset Foundation',
        showProgress: true,
        showBack: false
      },
      '(week2)': { 
        title: 'Discipline Building', 
        subtitle: 'Week 2 - Habit Formation',
        showProgress: true,
        showBack: true
      },
      '(week3)': { 
        title: 'Action Taking',
        subtitle: 'Week 3 - Overcoming Procrastination', 
        showProgress: true,
        showBack: true
      },
      '(week4)': { 
        title: 'Financial Psychology',
        subtitle: 'Week 4 - Money Mindset',
        showProgress: true, 
        showBack: true
      },
      
      // Exercise screens
      '(exercises)': {
        title: getExerciseTitle(currentExercise),
        subtitle: `Week ${currentWeek} - Exercise ${currentExercise}`,
        showProgress: true,
        showBack: true
      },
      
      // Assessment screens  
      '(assessment)': {
        title: 'Mindset Assessment',
        subtitle: 'Evaluate Your Progress',
        showProgress: true,
        showBack: true
      },
      
      // Default configuration
      default: {
        title: 'Mindset Foundation',
        subtitle: '4-Week Transformation',
        showProgress: true,
        showBack: true
      }
    };

    return headerConfig[route] || headerConfig.default;
  };

  /**
   * 🏗️ Get Exercise Title
   */
  const getExerciseTitle = (exerciseId) => {
    const exerciseTitles = {
      1: 'Wealth Reflection',
      2: 'Opportunity Identification', 
      3: 'Mindset Assessment',
      4: 'Daily Journal Practice',
      5: 'Financial Self-Evaluation',
      // ... more exercise titles
    };
    
    return exerciseTitles[exerciseId] || `Exercise ${exerciseId}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#1a365d" />
      
      {/* 🏗️ Network Status Indicator */}
      <OfflineIndicator 
        isConnected={isConnected}
        connectionType={connectionType}
      />
      
      {/* 🏗️ Sync Status Indicator */}
      <SyncStatus 
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        progress={progress.syncProgress}
      />
      
      {/* 🏗️ Progress Overlay */}
      <ProgressOverlay
        currentWeek={currentWeek}
        currentExercise={currentExercise}
        overallProgress={progress.overall}
        weekProgress={progress.weekly[currentWeek]}
        isVisible={progress.showOverlay}
      />
      
      {/* 🏗️ Stack Navigator with Enterprise Configuration */}
      <Stack
        screenOptions={({ route }) => {
          const headerConfig = renderScreenHeader(route.name);
          
          return {
            // 🎯 Header Configuration
            headerStyle: {
              backgroundColor: '#1a365d',
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 0,
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontFamily: 'Inter-Bold',
              fontSize: 18,
              fontWeight: '600',
            },
            headerBackTitleVisible: false,
            headerShadowVisible: false,
            
            // 🎯 Animation Configuration
            animation: 'slide_from_right',
            animationDuration: 300,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            
            // 🎯 Performance Optimization
            freezeOnBlur: false,
            detachInactiveScreens: Platform.OS === 'android',
            
            // 🎯 Custom Header
            header: (props) => (
              <MindsetNavigationBar
                {...props}
                {...headerConfig}
                progress={progress.overall}
                currentWeek={currentWeek}
                onBackPress={props.navigation.goBack}
                onProgressPress={() => {/* Show progress details */}}
              />
            ),
          };
        }}
      >
        {/* 🎯 Mindset Phase Screens */}
        
        {/* Week 1: Wealth Consciousness */}
        <Stack.Screen
          name="(week1)"
          options={{
            title: "Wealth Consciousness",
            headerShown: true,
          }}
        />
        
        {/* Week 2: Discipline Building */}
        <Stack.Screen
          name="(week2)" 
          options={{
            title: "Discipline Building",
            headerShown: true,
          }}
        />
        
        {/* Week 3: Action Taking */
        <Stack.Screen
          name="(week3)"
          options={{
            title: "Action Taking", 
            headerShown: true,
          }}
        />
        
        {/* Week 4: Financial Psychology */}
        <Stack.Screen
          name="(week4)"
          options={{
            title: "Financial Psychology",
            headerShown: true,
          }}
        />
        
        {/* Exercise Screens */}
        <Stack.Screen
          name="(exercises)/[exerciseId]"
          options={({ route }) => ({
            title: getExerciseTitle(route.params.exerciseId),
            headerShown: true,
          })}
        />
        
        {/* Assessment Screens */}
        <Stack.Screen
          name="(assessment)/[assessmentId]"
          options={{
            title: "Mindset Assessment",
            headerShown: true,
          }}
        />
        
        {/* Progress Overview */}
        <Stack.Screen
          name="progress"
          options={{
            title: "Your Progress",
            headerShown: true,
            presentation: 'modal',
          }}
        />
        
        {/* Resources Screen */}
        <Stack.Screen
          name="resources"
          options={{
            title: "Learning Resources", 
            headerShown: true,
          }}
        />
      </Stack>
      
      {/* 🏗️ Global Mindset Components */}
      <View style={styles.globalComponents}>
        {/* Progress indicator that stays visible across screens */}
        {/* Weekly progress tracker */}
        {/* Motivation prompts */}
      </View>
    </View>
  );
};

/**
 * 🏗️ Mindset Error Fallback Component
 * @component MindsetErrorFallback  
 * @description Graceful error handling for mindset phase
 */
const MindsetErrorFallback = ({ error, resetError }) => {
  const router = useRouter();
  
  const handleReset = async () => {
    try {
      // Attempt to restore progress from backup
      await mindsetSyncService.restoreFromBackup();
      resetError();
    } catch (backupError) {
      // If backup fails, redirect to mindset start
      router.replace('/(mindset)/(week1)');
    }
  };

  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Mindset Phase Unavailable</Text>
      <Text style={styles.errorDescription}>
        We're having trouble loading your mindset exercises. Don't worry, your progress is safe.
      </Text>
      
      <View style={styles.errorActions}>
        <Button 
          title="Try Again" 
          onPress={handleReset}
          style={styles.primaryButton}
        />
        <Button 
          title="Contact Support" 
          onPress={() => router.push('/support')}
          style={styles.secondaryButton}
        />
      </View>
    </View>
  );
};

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  gestureContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  globalComponents: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1a365d',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorActions: {
    gap: 12,
    width: '100%',
    maxWidth: 280,
  },
  primaryButton: {
    backgroundColor: '#1a365d',
    paddingVertical: 16,
    borderRadius: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1a365d',
    paddingVertical: 16,
    borderRadius: 12,
  },
});

// 🏗️ Performance Optimization: Memoize the layout
export default React.memo(MindsetLayoutWrapper);

// 🏗️ TypeScript-style prop validation in development
if (__DEV__) {
  const PropTypes = require('prop-types');
  MindsetLayoutWrapper.propTypes = {
    children: PropTypes.node,
    enrollmentData: PropTypes.shape({
      id: PropTypes.string.isRequired,
      studentId: PropTypes.string.isRequired,
      skillId: PropTypes.string.isRequired,
      startDate: PropTypes.instanceOf(Date).isRequired,
    }),
  };
}