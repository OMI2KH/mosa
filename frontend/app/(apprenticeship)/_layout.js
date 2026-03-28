// (apprenticeship)/_layout.js

/**
 * 🎯 ENTERPRISE APPRENTICESHIP LAYOUT
 * Production-ready layout for apprenticeship journey
 * Features: Quality tracking, progress monitoring, expert matching
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useContext, useEffect, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { Platform, StatusBar, AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { ApprenticeProvider, useApprenticeContext } from '../../contexts/apprentice-context';
import { QualityContext } from '../../contexts/quality-context';
import { AuthContext } from '../../contexts/auth-context';
import { LoadingOverlay } from '../../components/shared/loading-overlay';
import { QualityGate } from '../../components/quality/quality-gate';
import { NetworkStatus } from '../../components/shared/network-status';
import { SessionTimeout } from '../../components/shared/session-timeout';
import { useQualityMetrics } from '../../hooks/use-quality-metrics';
import { useProgressTracking } from '../../hooks/use-progress-tracking';
import { Logger } from '../../utils/logger';

const logger = new Logger('ApprenticeshipLayout');

/**
 * 🎯 LAYOUT CONTENT COMPONENT
 */
function ApprenticeshipLayoutContent() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isAuthenticated, faydaId } = useContext(AuthContext);
  const { qualityScore, refreshQualityMetrics, checkQualityStandards } = useQualityMetrics();
  const { currentProgress, updateProgress, validateProgress } = useProgressTracking();
  const apprenticeContext = useApprenticeContext();

  const {
    currentPhase,
    currentSession,
    expert,
    isLoading,
    error,
    refreshApprenticeData,
    validatePhaseTransition,
    checkSessionReadiness
  } = apprenticeContext;

  /**
   * 🛡️ AUTHENTICATION GUARD
   */
  useEffect(() => {
    const checkAuthentication = async () => {
      if (!isAuthenticated || !faydaId) {
        logger.warn('Unauthorized access attempt to apprenticeship', {
          isAuthenticated,
          hasFaydaId: !!faydaId,
          route: segments.join('/')
        });
        router.replace('/(auth)/fayda-registration');
        return;
      }

      // Validate user has active enrollment
      if (!apprenticeContext.hasActiveEnrollment) {
        logger.info('User without active enrollment accessing apprenticeship', { faydaId });
        router.replace('/(onboarding)/skill-selection');
      }
    };

    checkAuthentication();
  }, [isAuthenticated, faydaId, segments]);

  /**
   * 📊 QUALITY MONITORING
   */
  useFocusEffect(
    useCallback(() => {
      const monitorQuality = async () => {
        try {
          await refreshQualityMetrics();
          await checkQualityStandards();

          // Check if expert meets quality requirements
          if (expert && qualityScore < 4.0) {
            logger.warn('Expert quality below threshold', {
              expertId: expert.id,
              qualityScore,
              currentPhase
            });
          }
        } catch (error) {
          logger.error('Quality monitoring failed', error);
        }
      };

      monitorQuality();

      // Set up quality monitoring interval
      const qualityInterval = setInterval(monitorQuality, 300000); // 5 minutes

      return () => clearInterval(qualityInterval);
    }, [expert, qualityScore, currentPhase])
  );

  /**
   * 🔄 PROGRESS VALIDATION
   */
  useFocusEffect(
    useCallback(() => {
      const validateCurrentProgress = async () => {
        try {
          const isValid = await validateProgress(currentPhase, currentSession);
          if (!isValid) {
            logger.warn('Progress validation failed', { currentPhase, currentSession });
            await refreshApprenticeData();
          }
        } catch (error) {
          logger.error('Progress validation error', error);
        }
      };

      validateCurrentProgress();
    }, [currentPhase, currentSession])
  );

  /**
   * 🎯 PHASE-BASED ROUTE PROTECTION
   */
  useEffect(() => {
    const enforcePhaseRouting = async () => {
      if (isLoading || !currentPhase) return;

      const currentRoute = segments[segments.length - 1] || '';
      const allowedRoutes = getPhaseAllowedRoutes(currentPhase);

      if (!allowedRoutes.includes(currentRoute) && currentRoute !== 'index') {
        logger.info('Route not allowed for current phase', {
          currentPhase,
          currentRoute,
          allowedRoutes
        });
        
        const targetRoute = getPhaseDefaultRoute(currentPhase);
        router.replace(`/(apprenticeship)/${targetRoute}`);
      }
    };

    enforcePhaseRouting();
  }, [currentPhase, segments, isLoading]);

  /**
   * 📱 APP STATE MANAGEMENT
   */
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === 'active') {
        // Refresh data when app becomes active
        await refreshApprenticeData();
        await refreshQualityMetrics();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => subscription.remove();
  }, []);

  /**
   * 🚨 ERROR HANDLING
   */
  useEffect(() => {
    if (error) {
      logger.error('Apprenticeship context error', error);
      
      // Handle specific error types
      switch (error.code) {
        case 'EXPERT_QUALITY_ISSUE':
          router.replace('/(apprenticeship)/expert-quality-alert');
          break;
        case 'SESSION_EXPIRED':
          router.replace('/(apprenticeship)/session-expired');
          break;
        case 'PHASE_COMPLETION_FAILED':
          router.replace('/(apprenticeship)/phase-transition-error');
          break;
        default:
          // Log but don't redirect for generic errors
          break;
      }
    }
  }, [error]);

  /**
   * 🎯 GET PHASE-ALLOWED ROUTES
   */
  const getPhaseAllowedRoutes = (phase) => {
    const phaseRoutes = {
      'mindset': ['mindset-assessment', 'wealth-consciousness', 'discipline-building', 'action-taking', 'financial-psychology'],
      'theory': ['duolingo-interface', 'exercise-player', 'decision-scenarios', 'realtime-charts', 'theory-progress'],
      'expert-selection': ['expert-catalog', 'portfolio-viewer', 'quality-metrics', 'enrollment-flow', 'expert-confirmation'],
      'hands-on': ['training-dashboard', 'session-joiner', 'practical-workspace', 'progress-verification', 'session-feedback'],
      'certification': ['final-assessment', 'certificate-view', 'yachi-integration', 'income-launchpad', 'completion-celebration']
    };

    return phaseRoutes[phase] || [];
  };

  /**
   * 🎯 GET PHASE DEFAULT ROUTE
   */
  const getPhaseDefaultRoute = (phase) => {
    const defaultRoutes = {
      'mindset': 'mindset-assessment',
      'theory': 'duolingo-interface',
      'expert-selection': 'expert-catalog',
      'hands-on': 'training-dashboard',
      'certification': 'final-assessment'
    };

    return defaultRoutes[phase] || 'index';
  };

  /**
   * 🎨 GET HEADER CONFIGURATION
   */
  const getHeaderConfig = (phase) => {
    const headerConfigs = {
      'mindset': {
        title: 'Mindset Foundation',
        showProgress: true,
        showQuality: false,
        showExpert: false
      },
      'theory': {
        title: 'Theory Mastery',
        showProgress: true,
        showQuality: true,
        showExpert: false
      },
      'expert-selection': {
        title: 'Choose Your Expert',
        showProgress: true,
        showQuality: true,
        showExpert: true
      },
      'hands-on': {
        title: 'Hands-On Training',
        showProgress: true,
        showQuality: true,
        showExpert: true
      },
      'certification': {
        title: 'Certification',
        showProgress: true,
        showQuality: true,
        showExpert: true
      }
    };

    return headerConfigs[phase] || {
      title: 'Apprenticeship',
      showProgress: true,
      showQuality: true,
      showExpert: true
    };
  };

  const headerConfig = getHeaderConfig(currentPhase);

  if (isLoading) {
    return <LoadingOverlay message="Loading your apprenticeship journey..." />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        animated={true}
      />
      
      {/* 🛡️ QUALITY GATE PROTECTION */}
      <QualityGate
        minimumScore={4.0}
        currentScore={qualityScore}
        onQualityFail={() => router.replace('/(apprenticeship)/quality-warning')}
      />

      {/* 🌐 NETWORK STATUS */}
      <NetworkStatus />

      {/* ⏰ SESSION TIMEOUT */}
      <SessionTimeout
        timeout={30 * 60 * 1000} // 30 minutes
        onTimeout={() => router.replace('/(auth)/session-expired')}
      />

      {/* 🎯 STACK NAVIGATOR */}
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#FFFFFF',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5E5',
          },
          headerTitleStyle: {
            fontFamily: 'Inter-SemiBold',
            fontSize: 18,
            color: '#1A1A1A',
          },
          headerBackTitle: 'Back',
          headerTintColor: '#007AFF',
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      >
        {/* 🏠 INDEX SCREEN */}
        <Stack.Screen
          name="index"
          options={{
            headerShown: true,
            title: headerConfig.title,
            headerRight: () => (
              <HeaderActions
                showProgress={headerConfig.showProgress}
                showQuality={headerConfig.showQuality}
                showExpert={headerConfig.showExpert}
                progress={currentProgress}
                qualityScore={qualityScore}
                expert={expert}
              />
            ),
          }}
        />

        {/* 🧠 MINDSET PHASE */}
        <Stack.Screen
          name="mindset-assessment"
          options={{
            title: 'Mindset Assessment',
            headerBackTitle: 'Home',
          }}
        />
        <Stack.Screen
          name="wealth-consciousness"
          options={{
            title: 'Wealth Consciousness',
            headerBackTitle: 'Mindset',
          }}
        />
        <Stack.Screen
          name="discipline-building"
          options={{
            title: 'Discipline Building',
            headerBackTitle: 'Mindset',
          }}
        />
        <Stack.Screen
          name="action-taking"
          options={{
            title: 'Action Taking',
            headerBackTitle: 'Mindset',
          }}
        />
        <Stack.Screen
          name="financial-psychology"
          options={{
            title: 'Financial Psychology',
            headerBackTitle: 'Mindset',
          }}
        />

        {/* 📚 THEORY PHASE */}
        <Stack.Screen
          name="duolingo-interface"
          options={{
            title: 'Interactive Learning',
            headerBackTitle: 'Home',
          headerRight: () => <TheoryProgressIndicator progress={currentProgress?.theory || 0} />,
          gestureEnabled: false, // Prevent swipe back during exercises
          headerLeft: () => null, // Remove back button during critical exercises
          headerBackVisible: false,
          headerBackButtonMenuEnabled: false,
        }}
        />
        <Stack.Screen
          name="exercise-player"
          options={{
            title: 'Skill Exercise',
            headerShown: false, // Fullscreen for exercises
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="decision-scenarios"
          options={{
            title: 'Decision Scenarios',
            headerBackTitle: 'Theory',
          }}
        />
        <Stack.Screen
          name="realtime-charts"
          options={{
            title: 'Live Trading Charts',
            headerBackTitle: 'Theory',
          }}
        />
        <Stack.Screen
          name="theory-progress"
          options={{
            title: 'Theory Progress',
            headerBackTitle: 'Theory',
            presentation: 'modal',
          }}
        />

        {/* 👨‍🏫 EXPERT SELECTION */}
        <Stack.Screen
          name="expert-catalog"
          options={{
            title: 'Available Experts',
            headerBackTitle: 'Home',
            headerRight: () => <ExpertFilterButton />,
          }}
        />
        <Stack.Screen
          name="portfolio-viewer"
          options={{
            title: 'Expert Portfolio',
            headerBackTitle: 'Experts',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="quality-metrics"
          options={{
            title: 'Quality Metrics',
            headerBackTitle: 'Expert',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="enrollment-flow"
          options={{
            title: 'Confirm Enrollment',
            headerBackTitle: 'Expert',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="expert-confirmation"
          options={{
            title: 'Expert Confirmed',
            headerShown: false,
            gestureEnabled: false,
          }}
        />

        {/* 🏋️ HANDS-ON TRAINING */}
        <Stack.Screen
          name="training-dashboard"
          options={{
            title: 'Training Dashboard',
            headerBackTitle: 'Home',
            headerRight: () => <TrainingSessionActions />,
          }}
        />
        <Stack.Screen
          name="session-joiner"
          options={{
            title: 'Join Session',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="practical-workspace"
          options={{
            title: 'Practical Workspace',
            headerBackTitle: 'Dashboard',
            headerRight: () => <WorkspaceTools />,
          }}
        />
        <Stack.Screen
          name="progress-verification"
          options={{
            title: 'Progress Verification',
            headerBackTitle: 'Workspace',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="session-feedback"
          options={{
            title: 'Session Feedback',
            headerBackTitle: 'Dashboard',
            presentation: 'modal',
          }}
        />

        {/* 🏆 CERTIFICATION */}
        <Stack.Screen
          name="final-assessment"
          options={{
            title: 'Final Assessment',
            headerBackTitle: 'Home',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="certificate-view"
          options={{
            title: 'Your Certificate',
            headerBackTitle: 'Assessment',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="yachi-integration"
          options={{
            title: 'Yachi Verification',
            headerBackTitle: 'Certificate',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="income-launchpad"
          options={{
            title: 'Income Launchpad',
            headerBackTitle: 'Yachi',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="completion-celebration"
          options={{
            title: 'Congratulations!',
            headerShown: false,
            gestureEnabled: false,
          }}
        />

        {/* ⚠️ ERROR & QUALITY SCREENS */}
        <Stack.Screen
          name="expert-quality-alert"
          options={{
            title: 'Quality Alert',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="session-expired"
          options={{
            title: 'Session Expired',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="phase-transition-error"
          options={{
            title: 'Transition Error',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="quality-warning"
          options={{
            title: 'Quality Warning',
            headerShown: false,
            gestureEnabled: false,
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}

/**
 * 🎯 HEADER ACTIONS COMPONENT
 */
function HeaderActions({ showProgress, showQuality, showExpert, progress, qualityScore, expert }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {showProgress && progress && (
        <ProgressBadge progress={progress.overall} />
      )}
      
      {showQuality && qualityScore && (
        <QualityScoreBadge score={qualityScore} />
      )}
      
      {showExpert && expert && (
        <ExpertAvatar expert={expert} />
      )}
      
      <ApprenticeshipMenu />
    </View>
  );
}

/**
 * 🎯 MAIN LAYOUT EXPORT
 */
export default function ApprenticeshipLayout() {
  return (
    <ApprenticeProvider>
      <ApprenticeshipLayoutContent />
    </ApprenticeProvider>
  );
}

// 🎯 PERFORMANCE OPTIMIZATIONS
export const config = {
  initialRouteName: 'index',
  screens: {
    'mindset-assessment': 'mindset/assessment',
    'wealth-consciousness': 'mindset/wealth',
    'discipline-building': 'mindset/discipline',
    'action-taking': 'mindset/action',
    'financial-psychology': 'mindset/psychology',
    'duolingo-interface': 'theory/learning',
    'exercise-player': 'theory/exercise',
    'decision-scenarios': 'theory/scenarios',
    'realtime-charts': 'theory/charts',
    'theory-progress': 'theory/progress',
    'expert-catalog': 'experts/catalog',
    'portfolio-viewer': 'experts/portfolio',
    'quality-metrics': 'experits/quality',
    'enrollment-flow': 'experts/enroll',
    'expert-confirmation': 'experts/confirm',
    'training-dashboard': 'training/dashboard',
    'session-joiner': 'training/join',
    'practical-workspace': 'training/workspace',
    'progress-verification': 'training/progress',
    'session-feedback': 'training/feedback',
    'final-assessment': 'certification/assessment',
    'certificate-view': 'certification/certificate',
    'yachi-integration': 'certification/yachi',
    'income-launchpad': 'certification/launchpad',
    'completion-celebration': 'certification/celebration',
  },
};

// 🎯 DEEP LINKING CONFIG
export const linking = {
  prefixes: ['mosaforge://apprenticeship', 'https://mosaforge.com/apprenticeship'],
  config,
};