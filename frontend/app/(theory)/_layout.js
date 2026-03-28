// (theory)/_layout.js

/**
 * 🎯 ENTERPRISE THEORY PHASE LAYOUT
 * Production-ready layout for Duolingo-style theory learning interface
 * Features: Progress tracking, exercise routing, real-time state management
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  StatusBar, 
  BackHandler,
  AppState
} from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { TheoryProvider } from '../../contexts/theory-context';
import { ProgressProvider } from '../../contexts/progress-context';
import { QualityMonitor } from '../../components/quality/quality-monitor';
import { NetworkStatus } from '../../components/shared/network-status';
import { LoadingOverlay } from '../../components/shared/loading-overlay';
import { ErrorBoundary } from '../../components/shared/error-boundary';
import { useAuth } from '../../hooks/use-auth';
import { useTheoryProgress } from '../../hooks/use-theory-progress';
import { useQualityMetrics } from '../../hooks/use-quality-metrics';
import { Logger } from '../../utils/logger';
import { TheorySessionManager } from '../../services/theory-session-manager';

const logger = new Logger('TheoryLayout');

export default function TheoryLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isAuthenticated } = useAuth();
  const { currentProgress, updateProgress } = useTheoryProgress();
  const { trackMetric } = useQualityMetrics();
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [sessionState, setSessionState] = useState({
    isActive: false,
    currentExercise: null,
    startTime: null,
    completedExercises: 0,
    streakCount: 0
  });

  // 🎯 Initialize theory session
  const initializeSession = useCallback(async () => {
    try {
      setIsLoading(true);
      logger.info('Initializing theory session', { userId: user?.id });

      // Validate user authentication and enrollment
      if (!isAuthenticated || !user?.id) {
        logger.warn('User not authenticated, redirecting to auth');
        router.replace('/(auth)/fayda-registration');
        return;
      }

      // Check theory phase enrollment
      const enrollmentStatus = await TheorySessionManager.validateEnrollment(user.id);
      if (!enrollmentStatus.isEnrolled) {
        logger.warn('User not enrolled in theory phase', { userId: user.id });
        router.replace('/(onboarding)/skill-selection');
        return;
      }

      // Load current progress and session state
      const [progress, session] = await Promise.all([
        TheorySessionManager.loadUserProgress(user.id),
        TheorySessionManager.resumeOrCreateSession(user.id)
      ]);

      setSessionState({
        isActive: true,
        currentExercise: session.currentExercise,
        startTime: session.startTime,
        completedExercises: session.completedExercises,
        streakCount: session.streakCount
      });

      await updateProgress(progress);

      // Track session start for analytics
      await trackMetric('theory_session_started', {
        userId: user.id,
        skillId: progress.currentSkill,
        timestamp: new Date().toISOString()
      });

      logger.info('Theory session initialized successfully', {
        userId: user.id,
        currentExercise: session.currentExercise?.id
      });

    } catch (error) {
      logger.error('Failed to initialize theory session', error, { userId: user?.id });
      setHasNetworkError(true);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, router, updateProgress, trackMetric]);

  // 🔄 Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' && sessionState.isActive) {
        // Auto-save progress when app goes to background
        TheorySessionManager.autoSaveProgress({
          userId: user?.id,
          sessionState,
          currentProgress
        }).catch(error => 
          logger.error('Auto-save failed', error)
        );
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [sessionState, currentProgress, user?.id]);

  // 🚫 Handle Android back button
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (segments.includes('theory') && sessionState.isActive) {
          // Show confirmation before exiting theory session
          TheorySessionManager.showExitConfirmation(() => {
            handleSessionEnd('user_exit');
          });
          return true; // Prevent default back behavior
        }
        return false;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => 
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [segments, sessionState.isActive])
  );

  // 🎯 Session lifecycle management
  const handleSessionEnd = useCallback(async (reason = 'normal_completion') => {
    try {
      logger.info('Ending theory session', { reason, userId: user?.id });

      const sessionDuration = sessionState.startTime ? 
        Date.now() - new Date(sessionState.startTime).getTime() : 0;

      // Save final progress
      await TheorySessionManager.completeSession({
        userId: user?.id,
        sessionState,
        duration: sessionDuration,
        completionReason: reason
      });

      // Track session completion metrics
      await trackMetric('theory_session_completed', {
        userId: user?.id,
        duration: sessionDuration,
        exercisesCompleted: sessionState.completedExercises,
        streak: sessionState.streakCount,
        reason
      });

      setSessionState(prev => ({ ...prev, isActive: false }));

      // Redirect based on completion reason
      if (reason === 'normal_completion') {
        router.replace('/(theory)/session-complete');
      } else if (reason === 'daily_limit_reached') {
        router.replace('/(theory)/daily-limit-reached');
      }

    } catch (error) {
      logger.error('Error ending theory session', error, { userId: user?.id });
    }
  }, [sessionState, user?.id, router, trackMetric]);

  // 📊 Progress update handler
  const handleProgressUpdate = useCallback(async (newProgress, exerciseResult) => {
    try {
      logger.debug('Updating theory progress', { 
        userId: user?.id,
        progress: newProgress 
      });

      // Update local state
      setSessionState(prev => ({
        ...prev,
        completedExercises: prev.completedExercises + 1,
        streakCount: exerciseResult.isCorrect ? prev.streakCount + 1 : 0,
        currentExercise: exerciseResult.nextExercise
      }));

      // Update progress in database
      await updateProgress(newProgress);

      // Track exercise completion for quality metrics
      await trackMetric('theory_exercise_completed', {
        userId: user?.id,
        exerciseId: exerciseResult.exerciseId,
        isCorrect: exerciseResult.isCorrect,
        timeSpent: exerciseResult.timeSpent,
        streak: exerciseResult.isCorrect ? sessionState.streakCount + 1 : 0
      });

      // Check for daily exercise limit
      if (sessionState.completedExercises + 1 >= TheorySessionManager.DAILY_EXERCISE_LIMIT) {
        handleSessionEnd('daily_limit_reached');
      }

      // Check for skill completion
      if (newProgress.completionPercentage >= 100) {
        handleSessionEnd('skill_completed');
      }

    } catch (error) {
      logger.error('Failed to update progress', error, { userId: user?.id });
      throw error;
    }
  }, [user?.id, updateProgress, trackMetric, sessionState, handleSessionEnd]);

  // 🌐 Network error recovery
  const handleRetry = useCallback(() => {
    setHasNetworkError(false);
    initializeSession();
  }, [initializeSession]);

  // 🎯 Render loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a365d" />
        <LoadingOverlay 
          message="Loading your theory session..."
          showProgress={true}
        />
      </View>
    );
  }

  // 🚫 Render error state
  if (hasNetworkError) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#dc2626" />
        <NetworkStatus 
          onRetry={handleRetry}
          message="Unable to load theory session. Please check your connection."
        />
      </View>
    );
  }

  return (
    <ErrorBoundary 
      fallback={<NetworkStatus onRetry={handleRetry} />}
    >
      <TheoryProvider
        value={{
          sessionState,
          onProgressUpdate: handleProgressUpdate,
          onSessionEnd: handleSessionEnd
        }}
      >
        <ProgressProvider>
          <View style={styles.container}>
            <StatusBar 
              barStyle="light-content" 
              backgroundColor="#1a365d" 
              translucent={false}
            />
            
            {/* 🎯 Quality Monitoring Overlay */}
            <QualityMonitor 
              context="theory"
              userId={user?.id}
              onQualityAlert={(alert) => {
                logger.warn('Quality alert triggered', alert);
                // Handle quality degradation
                if (alert.severity === 'high') {
                  TheorySessionManager.pauseSession(user?.id);
                }
              }}
            />

            {/* 🧭 Stack Navigator for Theory Flow */}
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                gestureEnabled: true,
                contentStyle: styles.stackContent,
                presentation: 'card'
              }}
            >
              <Stack.Screen
                name="index"
                options={{
                  title: "Theory Phase",
                  animation: 'fade'
                }}
              />
              <Stack.Screen
                name="duolingo-interface"
                options={{
                  title: "Interactive Exercises",
                  gestureEnabled: false
                }}
              />
              <Stack.Screen
                name="exercise-player"
                options={{
                  title: "Exercise",
                  animation: 'slide_from_bottom'
                }}
              />
              <Stack.Screen
                name="decision-scenarios"
                options={{
                  title: "Decision Scenarios",
                  animation: 'slide_from_right'
                }}
              />
              <Stack.Screen
                name="realtime-charts"
                options={{
                  title: "Live Trading Charts",
                  orientation: 'landscape'
                }}
              />
              <Stack.Screen
                name="session-complete"
                options={{
                  title: "Session Complete",
                  gestureEnabled: false,
                  animation: 'fade'
                }}
              />
              <Stack.Screen
                name="daily-limit-reached"
                options={{
                  title: "Daily Limit Reached",
                  gestureEnabled: false
                }}
              />
            </Stack>
          </View>
        </ProgressProvider>
      </TheoryProvider>
    </ErrorBoundary>
  );
}

// 🎨 ENTERPRISE STYLING
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a365d', // Mosa Forge brand blue
  },
  stackContent: {
    backgroundColor: 'transparent',
  },
  header: {
    backgroundColor: '#1a365d',
    borderBottomWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
});

// 🔧 Performance optimization
export const theoryLayoutConfig = {
  initialRouteName: 'index',
  screenOptions: {
    lazy: true,
    detachInactiveScreens: true,
    freezeOnBlur: true,
  },
};

// 🎯 TypeScript-style prop definitions (for documentation)
/**
 * @typedef {Object} TheoryLayoutProps
 * @property {Object} user - Authenticated user object
 * @property {string} user.id - User ID
 * @property {boolean} isAuthenticated - Authentication status
 */

/**
 * @typedef {Object} SessionState
 * @property {boolean} isActive - Whether session is active
 * @property {Object} currentExercise - Current exercise data
 * @property {Date} startTime - Session start time
 * @property {number} completedExercises - Number of completed exercises
 * @property {number} streakCount - Current correct answer streak
 */

/**
 * @typedef {Object} ExerciseResult
 * @property {string} exerciseId - Exercise identifier
 * @property {boolean} isCorrect - Whether answer was correct
 * @property {number} timeSpent - Time spent in milliseconds
 * @property {Object} nextExercise - Next exercise data
 */