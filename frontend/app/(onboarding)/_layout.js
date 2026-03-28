// app/(onboarding)/_layout.js

/**
 * 🎯 ENTERPRISE ONBOARDING LAYOUT
 * Production-ready navigation structure for Mosa Forge onboarding flow
 * Features: Protected routes, progress tracking, state persistence, error boundaries
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Stack, useRouter, useSegments, useRootNavigation } from 'expo-router';
import { 
  View, 
  StyleSheet, 
  BackHandler, 
  AppState,
  Platform 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';

// Context & State Management
import { OnboardingProvider, useOnboarding } from '../../contexts/onboarding-context';
import { AuthProvider, useAuth } from '../../contexts/auth-context';
import { QualityProvider } from '../../contexts/quality-context';

// Components
import LoadingOverlay from '../../components/shared/loading-overlay';
import NetworkStatus from '../../components/shared/network-status';
import ErrorBoundary from '../../components/shared/error-boundary';
import SessionTimeout from '../../components/auth/session-timeout';
import ProgressTracker from '../../components/onboarding/progress-tracker';

// Services
import { OnboardingService } from '../../services/onboarding-service';
import { AnalyticsService } from '../../services/analytics-service';
import { CacheService } from '../../services/cache-service';

// Constants
import { 
  ONBOARDING_ROUTES, 
  ONBOARDING_STEPS,
  PROGRESS_CONFIG 
} from '../../constants/onboarding';

// Styles
import { Colors, Typography, Spacing } from '../../styles/design-system';

/**
 * 🛡️ MAIN ONBOARDING LAYOUT COMPONENT
 */
export default function OnboardingLayout() {
  return (
    <ErrorBoundary 
      fallback={<OnboardingErrorFallback />}
      context="onboarding-layout"
    >
      <AuthProvider>
        <QualityProvider>
          <OnboardingProvider>
            <OnboardingLayoutContent />
          </OnboardingProvider>
        </QualityProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

/**
 * 🎯 ONBOARDING LAYOUT CONTENT
 * Handles navigation state, progress tracking, and route protection
 */
function OnboardingLayoutContent() {
  const router = useRouter();
  const segments = useSegments();
  const rootNavigation = useRootNavigation();

  // Context hooks
  const { 
    state, 
    dispatch, 
    restoreOnboardingState,
    clearOnboardingState 
  } = useOnboarding();
  
  const { isAuthenticated, user, isFaydaVerified } = useAuth();

  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [isNetworkConnected, setIsNetworkConnected] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);
  const [navigationReady, setNavigationReady] = useState(false);

  /**
   * 🔄 INITIALIZATION EFFECT
   */
  useEffect(() => {
    initializeOnboarding();
    
    // Navigation readiness check
    const checkNavigationReady = setTimeout(() => {
      if (rootNavigation?.isReady()) {
        setNavigationReady(true);
      }
    }, 1000);

    return () => clearTimeout(checkNavigationReady);
  }, []);

  /**
   * 🎯 INITIALIZE ONBOARDING FLOW
   */
  const initializeOnboarding = async () => {
    try {
      setIsLoading(true);

      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      setIsNetworkConnected(netInfo.isConnected);

      // Validate authentication
      if (!isAuthenticated || !user) {
        await handleUnauthenticatedAccess();
        return;
      }

      // Validate Fayda verification
      if (!isFaydaVerified) {
        router.replace('/(auth)/fayda-registration');
        return;
      }

      // Restore onboarding state from cache
      await restoreOnboardingState(user.id);

      // Track onboarding start
      AnalyticsService.trackOnboardingStart(user.id);

    } catch (error) {
      console.error('Onboarding initialization failed:', error);
      AnalyticsService.trackError('onboarding_init_failed', error);
      
      // Fallback to mindset assessment
      router.replace('/(onboarding)/mindset-assessment');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🛡️ HANDLE UNAUTHENTICATED ACCESS
   */
  const handleUnauthenticatedAccess = async () => {
    const cachedAuth = await CacheService.get('auth_state');
    
    if (cachedAuth?.isAuthenticated) {
      // Attempt to restore session
      dispatch({ type: 'RESTORE_STATE', payload: cachedAuth });
    } else {
      // Redirect to authentication
      router.replace('/(auth)/fayda-registration');
    }
  };

  /**
   * 🌐 NETWORK STATUS MONITORING
   */
  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const wasConnected = isNetworkConnected;
      const isConnected = state.isConnected;
      
      setIsNetworkConnected(isConnected);

      if (wasConnected && !isConnected) {
        AnalyticsService.trackEvent('network_disconnected', {
          screen: segments.join('/')
        });
      } else if (!wasConnected && isConnected) {
        AnalyticsService.trackEvent('network_connected', {
          screen: segments.join('/')
        });
        // Sync pending data when connection restored
        syncPendingData();
      }
    });

    return () => unsubscribeNetInfo();
  }, [isNetworkConnected, segments]);

  /**
   * 📱 APP STATE MONITORING
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        handleAppForeground();
      } else if (nextAppState.match(/inactive|background/)) {
        // App going to background
        handleAppBackground();
      }
      
      setAppState(nextAppState);
    });

    return () => subscription.remove();
  }, [appState]);

  /**
   * 📲 HANDLE APP FOREGROUND
   */
  const handleAppForeground = async () => {
    try {
      // Refresh user data
      await refreshUserData();
      
      // Sync progress with backend
      await syncOnboardingProgress();
      
      AnalyticsService.trackEvent('app_foreground', {
        currentStep: state.currentStep,
        userId: user?.id
      });
    } catch (error) {
      console.error('App foreground handling failed:', error);
    }
  };

  /**
   * 📴 HANDLE APP BACKGROUND
   */
  const handleAppBackground = async () => {
    try {
      // Save current state to cache
      if (user?.id && state.currentStep) {
        await CacheService.set(
          `onboarding_${user.id}`, 
          state, 
          { ttl: 24 * 60 * 60 * 1000 } // 24 hours
        );
      }

      AnalyticsService.trackEvent('app_background', {
        currentStep: state.currentStep,
        userId: user?.id
      });
    } catch (error) {
      console.error('App background handling failed:', error);
    }
  };

  /**
   * 🔄 SYNC PENDING DATA
   */
  const syncPendingData = async () => {
    try {
      const pendingActions = await CacheService.get('pending_actions');
      
      if (pendingActions?.length > 0) {
        await OnboardingService.syncPendingActions(pendingActions);
        await CacheService.remove('pending_actions');
        
        AnalyticsService.trackEvent('pending_data_synced', {
          actionCount: pendingActions.length
        });
      }
    } catch (error) {
      console.error('Pending data sync failed:', error);
    }
  };

  /**
   * 🔄 REFRESH USER DATA
   */
  const refreshUserData = async () => {
    try {
      // Implementation depends on your auth service
      // await AuthService.refreshUserProfile();
    } catch (error) {
      console.error('User data refresh failed:', error);
    }
  };

  /**
   * 📊 SYNC ONBOARDING PROGRESS
   */
  const syncOnboardingProgress = async () => {
    try {
      if (user?.id && state.currentStep) {
        await OnboardingService.updateProgress(user.id, {
          currentStep: state.currentStep,
          completedSteps: state.completedSteps,
          progressPercentage: calculateProgressPercentage(),
          lastActiveAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Progress sync failed:', error);
      // Queue for retry
      await queuePendingAction('sync_progress', state);
    }
  };

  /**
   * 📝 QUEUE PENDING ACTION
   */
  const queuePendingAction = async (actionType, payload) => {
    try {
      const pendingActions = await CacheService.get('pending_actions') || [];
      pendingActions.push({
        type: actionType,
        payload,
        timestamp: Date.now(),
        id: generateActionId()
      });
      
      await CacheService.set('pending_actions', pendingActions);
    } catch (error) {
      console.error('Failed to queue pending action:', error);
    }
  };

  /**
   * 🎯 CALCULATE PROGRESS PERCENTAGE
   */
  const calculateProgressPercentage = () => {
    const totalSteps = Object.keys(ONBOARDING_STEPS).length;
    const completedSteps = state.completedSteps.length;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  /**
   * 🛑 BACK HANDLER FOR ANDROID
   */
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        const currentRoute = segments[segments.length - 1];
        
        // Prevent back navigation on certain screens
        if (currentRoute === 'mindset-assessment') {
          // Show exit confirmation instead of going back
          showExitConfirmation();
          return true;
        }

        // Allow default back behavior
        return false;
      };

      if (Platform.OS === 'android') {
        BackHandler.addEventListener('hardwareBackPress', onBackPress);

        return () => {
          BackHandler.removeEventListener('hardwareBackPress', onBackPress);
        };
      }
    }, [segments])
  );

  /**
   * 🚨 SHOW EXIT CONFIRMATION
   */
  const showExitConfirmation = () => {
    // Implementation depends on your UI library
    // Alert.alert('Exit Onboarding', 'Are you sure you want to exit? Your progress will be saved.', [
    //   { text: 'Cancel', style: 'cancel' },
    //   { text: 'Exit', onPress: handleOnboardingExit }
    // ]);
  };

  /**
   * 🚪 HANDLE ONBOARDING EXIT
   */
  const handleOnboardingExit = async () => {
    try {
      // Save current progress
      if (user?.id) {
        await OnboardingService.saveProgress(user.id, state);
      }

      // Track exit event
      AnalyticsService.trackOnboardingExit(user?.id, {
        currentStep: state.currentStep,
        progressPercentage: calculateProgressPercentage(),
        completedSteps: state.completedSteps.length
      });

      // Navigate to dashboard
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      console.error('Onboarding exit failed:', error);
      router.replace('/(tabs)/dashboard'); // Force navigation
    }
  };

  /**
   * 🎯 RENDER PROGRESS TRACKER
   */
  const renderProgressTracker = () => {
    if (!state.currentStep || isLoading) return null;

    const showProgress = PROGRESS_CONFIG[state.currentStep]?.showProgress;
    
    if (showProgress) {
      return (
        <ProgressTracker
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
          totalSteps={Object.keys(ONBOARDING_STEPS).length}
          progressPercentage={calculateProgressPercentage()}
          style={styles.progressTracker}
        />
      );
    }

    return null;
  };

  /**
   * ⚠️ RENDER ERROR FALLBACK
   */
  if (!navigationReady || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingOverlay 
          message="Preparing your onboarding journey..."
          showProgress={true}
        />
        <StatusBar style="auto" />
      </View>
    );
  }

  /**
   * 🎨 MAIN RENDER
   */
  return (
    <View style={styles.container}>
      <StatusBar 
        style="dark" 
        backgroundColor={Colors.background.primary}
        translucent={false}
      />

      {/* Network Status Indicator */}
      {!isNetworkConnected && (
        <NetworkStatus 
          isConnected={isNetworkConnected}
          onRetry={syncPendingData}
        />
      )}

      {/* Progress Tracker */}
      {renderProgressTracker()}

      {/* Session Timeout Handler */}
      <SessionTimeout 
        maxInactiveTime={30 * 60 * 1000} // 30 minutes
        onTimeout={handleOnboardingExit}
      />

      {/* Stack Navigator */}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
          contentStyle: styles.screenContent,
          presentation: 'card',
        }}
      >
        <Stack.Screen
          name="mindset-assessment"
          options={{
            title: 'Mindset Assessment',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="skill-selection"
          options={{
            title: 'Choose Your Skill',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="commitment-check"
          options={{
            title: 'Commitment Check',
            animation: 'slide_from_left',
          }}
        />
        <Stack.Screen
          name="bundle-purchase"
          options={{
            title: 'Enrollment Bundle',
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </View>
  );
}

/**
 * 🚨 ONBOARDING ERROR FALLBACK COMPONENT
 */
function OnboardingErrorFallback({ error, resetError }) {
  const router = useRouter();

  const handleRetry = () => {
    if (resetError) {
      resetError();
    } else {
      router.replace('/(onboarding)/mindset-assessment');
    }
  };

  const handleExit = () => {
    router.replace('/(tabs)/dashboard');
  };

  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorContent}>
        {/* Error illustration component would go here */}
        <Text style={styles.errorTitle}>Onboarding Issue</Text>
        <Text style={styles.errorMessage}>
          We encountered a problem loading your onboarding journey. 
          Please try again or contact support if the issue persists.
        </Text>
        
        <View style={styles.errorActions}>
          <Button
            title="Try Again"
            onPress={handleRetry}
            style={styles.retryButton}
          />
          <Button
            title="Exit to Dashboard"
            onPress={handleExit}
            variant="outline"
            style={styles.exitButton}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * 🎨 STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenContent: {
    backgroundColor: Colors.background.primary,
  },
  progressTracker: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  errorTitle: {
    ...Typography.heading3,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  errorMessage: {
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: Typography.lineHeight.large,
  },
  errorActions: {
    width: '100%',
    gap: Spacing.md,
  },
  retryButton: {
    width: '100%',
  },
  exitButton: {
    width: '100%',
  },
});

// Utility functions
const generateActionId = () => {
  return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};