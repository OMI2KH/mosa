// app/(expert-selection)/_layout.js

/**
 * 🎯 ENTERPRISE EXPERT SELECTION LAYOUT
 * Production-ready layout for expert matching and selection flow
 * Features: Quality-based routing, session management, real-time expert matching
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useLocalSearchParams } from 'expo-router';
import { 
  View, 
  StyleSheet, 
  StatusBar, 
  BackHandler,
  AppState
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

// Context & State Management
import { ExpertSelectionProvider } from '../../contexts/expert-selection-context';
import { useQualityMetrics } from '../../hooks/use-quality-metrics';
import { useAuth } from '../../contexts/auth-context';
import { useEnrollment } from '../../contexts/enrollment-context';

// Components
import LoadingOverlay from '../../components/shared/loading-overlay';
import NetworkStatus from '../../components/shared/network-status';
import QualityGate from '../../components/quality/quality-gate';
import SessionTimeoutHandler from '../../components/shared/session-timeout-handler';

export default function ExpertSelectionLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();
  const params = useLocalSearchParams();
  
  // Context Hooks
  const { user, isAuthenticated, hasValidFayda } = useAuth();
  const { currentEnrollment, enrollmentStatus } = useEnrollment();
  const { qualityScore, refreshQualityMetrics } = useQualityMetrics();

  // State Management
  const [isLoading, setIsLoading] = useState(true);
  const [qualityCheckPassed, setQualityCheckPassed] = useState(false);
  const [expertPoolReady, setExpertPoolReady] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  /**
   * 🛡️ INITIAL QUALITY AND AUTHENTICATION CHECK
   */
  useEffect(() => {
    const initializeLayout = async () => {
      try {
        setIsLoading(true);

        // 1. Authentication Check
        if (!isAuthenticated || !user) {
          router.replace('/(auth)/fayda-registration');
          return;
        }

        // 2. Fayda ID Verification Check
        if (!hasValidFayda) {
          router.replace('/(auth)/fayda-verification');
          return;
        }

        // 3. Enrollment Status Check
        if (!currentEnrollment || enrollmentStatus !== 'ACTIVE') {
          router.replace('/(onboarding)/skill-selection');
          return;
        }

        // 4. Quality Metrics Check
        await refreshQualityMetrics();
        
        if (qualityScore < 3.5) {
          setQualityCheckPassed(false);
          setIsLoading(false);
          return;
        }

        // 5. Load Expert Pool
        await loadExpertPool();

        setQualityCheckPassed(true);
        setExpertPoolReady(true);
        
      } catch (error) {
        console.error('Expert selection layout initialization failed:', error);
        router.replace('/(onboarding)/commitment-check');
      } finally {
        setIsLoading(false);
      }
    };

    initializeLayout();
  }, [isAuthenticated, user, currentEnrollment, enrollmentStatus]);

  /**
   * 🔧 LOAD EXPERT POOL WITH QUALITY FILTERS
   */
  const loadExpertPool = async () => {
    try {
      // Implementation would integrate with expert-service
      // Filter experts based on quality metrics, availability, and skill match
      
      const expertFilters = {
        minQualityScore: 4.0,
        maxStudentCapacity: 0.8, // 80% capacity utilization
        skillMatchThreshold: 0.7,
        availability: 'WITHIN_24_HOURS',
        tierPriority: ['MASTER', 'SENIOR', 'STANDARD']
      };

      // Cache expert pool for performance
      await cacheExpertPool(expertFilters);
      
    } catch (error) {
      console.error('Failed to load expert pool:', error);
      throw new Error('EXPERT_POOL_LOAD_FAILED');
    }
  };

  /**
   * 💾 CACHE EXPERT POOL FOR PERFORMANCE
   */
  const cacheExpertPool = async (filters) => {
    // Implementation would cache expert data for quick access
    // during the selection process
    
    const cacheKey = `expert_pool:${user.id}:${currentEnrollment.skillId}`;
    const cacheData = {
      filters,
      timestamp: Date.now(),
      ttl: 15 * 60 * 1000 // 15 minutes
    };

    // Store in async storage or context
    await storeExpertPoolCache(cacheKey, cacheData);
  };

  /**
   * 🎯 HANDLE BACK NAVIGATION WITH CONFIRMATION
   */
  useEffect(() => {
    const onBackPress = () => {
      const currentRoute = segments[segments.length - 1];
      
      // Prevent back navigation on certain screens
      if (currentRoute === 'expert-matching') {
        showExitConfirmation();
        return true;
      }

      // Allow normal back navigation
      return false;
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);

    return () => {
      BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    };
  }, [segments]);

  /**
   * ⏰ TRACK USER ACTIVITY FOR SESSION MANAGEMENT
   */
  useEffect(() => {
    const trackActivity = () => {
      setLastActivity(Date.now());
    };

    // Add event listeners for user activity
    const events = ['touchstart', 'mousedown', 'keypress', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, trackActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, trackActivity, true);
      });
    };
  }, []);

  /**
   * 🔄 HANDLE APP STATE CHANGES
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        // Refresh data when app becomes active
        refreshQualityMetrics();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * 🚫 SHOW EXIT CONFIRMATION DIALOG
   */
  const showExitConfirmation = () => {
    // Implementation would show a custom confirmation modal
    // asking user to confirm they want to leave expert selection
    
    Alert.alert(
      'Exit Expert Selection?',
      'Your progress will be saved, but you may lose your place in the queue.',
      [
        {
          text: 'Stay',
          style: 'cancel'
        },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => router.back()
        }
      ]
    );
  };

  /**
   * 🎨 RENDER QUALITY GATE COMPONENT
   */
  const renderQualityGate = () => (
    <QualityGate
      currentScore={qualityScore}
      requiredScore={3.5}
      onRetry={refreshQualityMetrics}
      onAlternativeAction={() => router.replace('/(onboarding)/improvement-plan')}
    />
  );

  /**
   * 📱 RENDER LOADING STATES
   */
  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <LoadingOverlay
          message="Preparing Expert Selection..."
          subMessage="Loading quality-verified experts for your skill"
          showProgress={true}
        />
      </View>
    );
  }

  /**
   * 🚫 RENDER QUALITY CHECK FAILED
   */
  if (!qualityCheckPassed) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        {renderQualityGate()}
      </View>
    );
  }

  /**
   * 🎯 MAIN LAYOUT RENDER
   */
  return (
    <ExpertSelectionProvider>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#FFFFFF" 
          animated={true}
        />
        
        {/* Network Status Indicator */}
        <NetworkStatus />
        
        {/* Session Timeout Handler */}
        <SessionTimeoutHandler 
          maxInactivity={30 * 60 * 1000} // 30 minutes
          onTimeout={() => router.replace('/(auth)/login')}
        />

        {/* Blurred Background for Modals */}
        <BlurView
          intensity={0}
          style={StyleSheet.absoluteFill}
          tint="light"
        />

        {/* Stack Navigator with Custom Header */}
        <Stack
          screenOptions={{
            headerShown: true,
            headerStyle: styles.headerStyle,
            headerTitleStyle: styles.headerTitleStyle,
            headerBackTitle: 'Back',
            headerTintColor: '#1E40AF',
            headerShadowVisible: false,
            animation: 'slide_from_right',
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
            contentStyle: styles.screenContent,
          }}
        >
          {/* Expert Catalog Screen */}
          <Stack.Screen
            name="expert-catalog"
            options={{
              title: 'Select Your Expert',
              headerRight: () => (
                <View style={styles.headerRight}>
                  {/* Quality Score Badge */}
                  <QualityScoreBadge score={qualityScore} />
                </View>
              ),
            }}
          />

          {/* Expert Portfolio Screen */}
          <Stack.Screen
            name="expert-portfolio"
            options={{
              title: 'Expert Profile',
              headerBackTitle: 'Back to Catalog',
              presentation: 'modal',
            }}
          />

          {/* Quality Metrics Screen */}
          <Stack.Screen
            name="quality-metrics"
            options={{
              title: 'Quality Assurance',
              headerBackTitle: 'Back',
            }}
          />

          {/* Enrollment Flow Screen */}
          <Stack.Screen
            name="enrollment-flow"
            options={{
              title: 'Complete Enrollment',
              headerShown: false, // Full screen enrollment
              presentation: 'fullScreenModal',
              gestureEnabled: false, // Prevent swipe to dismiss
            }}
          />

          {/* Matching Progress Screen */}
          <Stack.Screen
            name="matching-progress"
            options={{
              title: 'Finding Your Expert',
              headerShown: false,
              presentation: 'transparentModal',
            }}
          />

          {/* Alternative Experts Screen */}
          <Stack.Screen
            name="alternative-experts"
            options={{
              title: 'Alternative Options',
              headerBackTitle: 'Back',
            }}
          />
        </Stack>
      </View>
    </ExpertSelectionProvider>
  );
}

/**
 * 🎨 STYLESHEET
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerStyle: {
    backgroundColor: '#FFFFFF',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleStyle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    fontFamily: 'Inter-SemiBold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  screenContent: {
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  qualityGateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
  },
});

/**
 * 🎯 QUALITY SCORE BADGE COMPONENT
 */
const QualityScoreBadge = ({ score }) => {
  const getScoreColor = (score) => {
    if (score >= 4.5) return '#10B981';
    if (score >= 4.0) return '#3B82F6';
    if (score >= 3.5) return '#F59E0B';
    return '#EF4444';
  };

  const getScoreText = (score) => {
    if (score >= 4.5) return 'Excellent';
    if (score >= 4.0) return 'Good';
    if (score >= 3.5) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <View style={badgeStyles.container}>
      <View 
        style={[
          badgeStyles.scoreCircle,
          { backgroundColor: getScoreColor(score) }
        ]}
      >
        <Text style={badgeStyles.scoreText}>
          {score.toFixed(1)}
        </Text>
      </View>
      <Text style={badgeStyles.scoreLabel}>
        {getScoreText(score)}
      </Text>
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scoreCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  scoreLabel: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },
});

// Export for testing and storybook
export { 
  ExpertSelectionLayout as default, 
  QualityScoreBadge 
};