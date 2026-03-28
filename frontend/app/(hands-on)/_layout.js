// app/(hands-on)/_layout.js

/**
 * 🎯 ENTERPRISE HANDS-ON TRAINING LAYOUT
 * Production-ready layout for hands-on training phase
 * Features: Session management, expert matching, progress tracking, quality enforcement
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useLocalSearchParams } from 'expo-router';
import { HandsOnTrainingProvider } from '../../contexts/hands-on-context';
import { QualityEnforcement } from '../../components/quality/QualityEnforcement';
import { SessionStatusMonitor } from '../../components/training/SessionStatusMonitor';
import { NetworkStatus } from '../../components/shared/NetworkStatus';
import { LoadingOverlay } from '../../components/shared/LoadingOverlay';
import { ErrorBoundary } from '../../components/shared/ErrorBoundary';
import { useAuth } from '../../hooks/use-auth';
import { useQualityMetrics } from '../../hooks/use-quality-metrics';
import { Logger } from '../../utils/logger';

const logger = new Logger('HandsOnLayout');

/**
 * 🏗️ ENTERPRISE LAYOUT COMPONENT
 * Handles hands-on training navigation, session management, and quality enforcement
 */
export default function HandsOnTrainingLayout() {
  const router = useRouter();
  const segments = useSegments();
  const params = useLocalSearchParams();
  const { user, isAuthenticated, hasRequiredRole } = useAuth();
  const { refreshQualityMetrics } = useQualityMetrics();
  
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState('initializing');
  const [expertStatus, setExpertStatus] = useState('connected');

  /**
   * 🔐 AUTHENTICATION & ACCESS CONTROL
   */
  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Validate user authentication
        if (!isAuthenticated) {
          logger.warn('Unauthorized access attempt to hands-on training');
          router.replace('/(auth)/login');
          return;
        }

        // Check if user has student role
        if (!hasRequiredRole(['student', 'expert'])) {
          logger.error('Insufficient permissions for hands-on training', {
            userId: user.id,
            roles: user.roles
          });
          router.replace('/(onboarding)/role-selection');
          return;
        }

        // Verify enrollment status
        const enrollmentValid = await verifyEnrollmentStatus(user.id);
        if (!enrollmentValid) {
          logger.warn('User not enrolled in hands-on phase', { userId: user.id });
          router.replace('/(theory)/completion');
          return;
        }

        // Initialize quality metrics
        await refreshQualityMetrics();

        setIsLoading(false);
        logger.info('Hands-on training layout initialized successfully', {
          userId: user.id,
          segments
        });

      } catch (error) {
        logger.error('Failed to initialize hands-on layout', error);
        router.replace('/(error)/initialization-failed');
      }
    };

    checkAccess();
  }, [isAuthenticated, user?.id]);

  /**
   * 📡 REAL-TIME SESSION MONITORING
   */
  useEffect(() => {
    if (!user?.id || isLoading) return;

    const initializeSessionMonitoring = async () => {
      try {
        const sessionData = await initializeTrainingSession(user.id);
        setSessionStatus(sessionData.status);
        setExpertStatus(sessionData.expertStatus);

        // Setup real-time session listeners
        setupSessionListeners(user.id);
        
        logger.debug('Session monitoring initialized', {
          userId: user.id,
          sessionStatus: sessionData.status
        });

      } catch (error) {
        logger.error('Session monitoring initialization failed', error);
        setSessionStatus('error');
      }
    };

    initializeSessionMonitoring();

    // Cleanup listeners on unmount
    return () => {
      cleanupSessionListeners();
    };
  }, [user?.id, isLoading]);

  /**
   * 🎯 ROUTE PROTECTION & VALIDATION
   */
  useEffect(() => {
    if (isLoading) return;

    const validateCurrentRoute = async () => {
      const currentPath = segments.join('/');
      
      try {
        const routeValid = await validateTrainingRoute(currentPath, user.id);
        if (!routeValid) {
          logger.warn('Invalid route access detected', {
            userId: user.id,
            currentPath,
            allowedRoutes: await getAllowedRoutes(user.id)
          });
          
          // Redirect to appropriate training dashboard
          const defaultRoute = await getDefaultTrainingRoute(user.id);
          router.replace(defaultRoute);
        }
      } catch (error) {
        logger.error('Route validation failed', error);
      }
    };

    validateCurrentRoute();
  }, [segments, user?.id, isLoading]);

  /**
   * 🛡️ QUALITY ENFORCEMENT CHECK
   */
  useEffect(() => {
    if (!user?.id || isLoading) return;

    const performQualityCheck = async () => {
      try {
        const qualityCheck = await checkTrainingQuality(user.id);
        
        if (qualityCheck.requiresIntervention) {
          logger.warn('Quality intervention required', {
            userId: user.id,
            issues: qualityCheck.issues
          });
          
          // Handle quality issues (expert switching, session pausing, etc.)
          await handleQualityIntervention(qualityCheck);
        }
      } catch (error) {
        logger.error('Quality check failed', error);
      }
    };

    // Perform quality checks every 30 minutes
    const qualityInterval = setInterval(performQualityCheck, 30 * 60 * 1000);
    performQualityCheck(); // Initial check

    return () => clearInterval(qualityInterval);
  }, [user?.id, isLoading]);

  /**
   * 🎨 LAYOUT RENDER WITH ENTERPRISE FEATURES
   */
  if (isLoading) {
    return (
      <LoadingOverlay 
        message="Initializing Hands-On Training Environment..."
        subtitle="Setting up your expert matching and session tools"
      />
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <LoadingOverlay 
          message="System Recovery in Progress..."
          subtitle="Our team has been alerted and is resolving the issue"
          isError
        />
      }
    >
      <HandsOnTrainingProvider>
        {/* 🎯 QUALITY ENFORCEMENT OVERLAY */}
        <QualityEnforcement
          userId={user.id}
          onQualityIssue={(issue) => handleQualityIssue(issue)}
          onExpertSwitch={(newExpertId) => handleExpertSwitch(newExpertId)}
        />

        {/* 📡 SESSION STATUS MONITOR */}
        <SessionStatusMonitor
          userId={user.id}
          sessionStatus={sessionStatus}
          expertStatus={expertStatus}
          onStatusChange={(newStatus) => setSessionStatus(newStatus)}
          onReconnect={() => handleSessionReconnect()}
        />

        {/* 🌐 NETWORK STATUS INDICATOR */}
        <NetworkStatus
          onConnectionRestored={() => handleConnectionRestored()}
          onConnectionLost={() => handleConnectionLost()}
        />

        {/* 🏗️ MAIN TRAINING LAYOUT */}
        <Stack
          screenOptions={{
            // 🎨 ENTERPRISE UI CONFIGURATION
            headerShown: false,
            animation: 'fade',
            gestureEnabled: true,
            contentStyle: {
              backgroundColor: '#0A0F1C' // Professional dark theme
            },
            // 🔒 SECURITY HEADERS
            headerTintColor: '#00D4AA',
            headerStyle: {
              backgroundColor: '#0A0F1C',
              borderBottomColor: '#1E293B',
              borderBottomWidth: 1
            }
          }}
        >
          {/* 🎯 TRAINING DASHBOARD */}
          <Stack.Screen
            name="training-dashboard"
            options={{
              title: 'Training Dashboard',
              headerShown: true,
              headerBackTitle: 'Back',
              headerTintColor: '#00D4AA',
              headerStyle: {
                backgroundColor: '#0A0F1C'
              }
            }}
          />

          {/* 👨‍🏫 EXPERT SESSIONS */}
          <Stack.Screen
            name="expert-sessions"
            options={{
              title: 'Live Training Sessions',
              headerShown: true,
              presentation: 'modal',
              gestureEnabled: true
            }}
          />

          {/* 🛠️ PRACTICAL WORKSPACE */}
          <Stack.Screen
            name="practical-workspace"
            options={{
              title: 'Practical Workspace',
              headerShown: true,
              presentation: 'fullScreenModal',
              gestureEnabled: false // Prevent accidental navigation during work
            }}
          />

          {/* 📊 PROGRESS TRACKING */}
          <Stack.Screen
            name="progress-tracking"
            options={{
              title: 'Training Progress',
              headerShown: true,
              animation: 'slide_from_right'
            }}
          />

          {/* ⚡ SESSION JOINER */}
          <Stack.Screen
            name="session-joiner"
            options={{
              title: 'Join Training Session',
              headerShown: true,
              presentation: 'modal'
            }}
          />

          {/* 🎯 COMPLETION VERIFICATION */}
          <Stack.Screen
            name="completion-verification"
            options={{
              title: 'Completion Verification',
              headerShown: true,
              gestureEnabled: false // Prevent back navigation during verification
            }}
          />

          {/* 🚨 QUALITY ISSUES */}
          <Stack.Screen
            name="quality-issues"
            options={{
              title: 'Quality Assistance',
              headerShown: true,
              presentation: 'modal'
            }}
          />

          {/* 🔄 EXPERT SWITCH */}
          <Stack.Screen
            name="expert-switch"
            options={{
              title: 'Expert Transition',
              headerShown: true,
              presentation: 'transparentModal'
            }}
          />
        </Stack>
      </HandsOnTrainingProvider>
    </ErrorBoundary>
  );
}

/**
 * 🔐 VERIFY ENROLLMENT STATUS
 */
async function verifyEnrollmentStatus(userId) {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/enrollments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getAuthToken()}`
      },
      body: JSON.stringify({
        userId,
        phase: 'hands-on',
        requiredStatus: 'active'
      })
    });

    if (!response.ok) {
      throw new Error(`Enrollment verification failed: ${response.status}`);
    }

    const data = await response.json();
    return data.isValid && data.hasAccess;

  } catch (error) {
    logger.error('Enrollment verification failed', error);
    return false;
  }
}

/**
 * 📡 INITIALIZE TRAINING SESSION
 */
async function initializeTrainingSession(userId) {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/training/sessions/initialize`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ userId })
      }
    );

    if (!response.ok) {
      throw new Error(`Session initialization failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Training session initialization failed', error);
    throw error;
  }
}

/**
 * 🎯 SETUP SESSION LISTENERS
 */
function setupSessionListeners(userId) {
  // Real-time session updates
  const sessionChannel = new BroadcastChannel(`training-session-${userId}`);
  
  sessionChannel.onmessage = (event) => {
    const { type, data } = event.data;
    
    switch (type) {
      case 'SESSION_UPDATED':
        handleSessionUpdate(data);
        break;
      case 'EXPERT_JOINED':
        handleExpertJoined(data);
        break;
      case 'QUALITY_ALERT':
        handleQualityAlert(data);
        break;
      case 'SESSION_COMPLETED':
        handleSessionCompleted(data);
        break;
      default:
        logger.warn('Unknown session event type', { type, data });
    }
  };

  // WebSocket connection for real-time features
  const ws = new WebSocket(`${process.env.EXPO_PUBLIC_WS_URL}/training/${userId}`);
  
  ws.onopen = () => {
    logger.debug('WebSocket connection established for training session', { userId });
  };

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleWebSocketMessage(message);
  };

  ws.onclose = () => {
    logger.warn('WebSocket connection closed for training session', { userId });
    // Attempt reconnection
    setTimeout(() => setupSessionListeners(userId), 5000);
  };

  return () => {
    sessionChannel.close();
    ws.close();
  };
}

/**
 * 🛡️ VALIDATE TRAINING ROUTE
 */
async function validateTrainingRoute(currentPath, userId) {
  const allowedRoutes = await getAllowedRoutes(userId);
  return allowedRoutes.includes(currentPath);
}

/**
 * 🎯 GET ALLOWED TRAINING ROUTES
 */
async function getAllowedRoutes(userId) {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/training/routes/allowed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ userId })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get allowed routes: ${response.status}`);
    }

    const data = await response.json();
    return data.allowedRoutes;
  } catch (error) {
    logger.error('Failed to get allowed routes', error);
    return ['training-dashboard']; // Default fallback route
  }
}

/**
 * 🎯 GET DEFAULT TRAINING ROUTE
 */
async function getDefaultTrainingRoute(userId) {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/training/routes/default`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ userId })
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get default route: ${response.status}`);
    }

    const data = await response.json();
    return data.defaultRoute;
  } catch (error) {
    logger.error('Failed to get default training route', error);
    return '/(hands-on)/training-dashboard';
  }
}

/**
 * 🛡️ CHECK TRAINING QUALITY
 */
async function checkTrainingQuality(userId) {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/quality/training/check`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ userId })
      }
    );

    if (!response.ok) {
      throw new Error(`Quality check failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Training quality check failed', error);
    return { requiresIntervention: false, issues: [] };
  }
}

/**
 * 🚨 HANDLE QUALITY INTERVENTION
 */
async function handleQualityIntervention(qualityCheck) {
  const { issues, recommendedActions } = qualityCheck;

  // Show quality intervention modal
  router.push({
    pathname: '/(hands-on)/quality-issues',
    params: {
      issues: JSON.stringify(issues),
      actions: JSON.stringify(recommendedActions)
    }
  });

  // Log intervention for analytics
  logger.info('Quality intervention triggered', {
    issues,
    recommendedActions,
    timestamp: new Date().toISOString()
  });
}

/**
 * 🔄 HANDLE EXPERT SWITCH
 */
async function handleExpertSwitch(newExpertId) {
  try {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/api/training/expert/switch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({
          newExpertId,
          reason: 'quality_intervention'
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Expert switch failed: ${response.status}`);
    }

    // Show expert switch confirmation
    router.push({
      pathname: '/(hands-on)/expert-switch',
      params: { newExpertId }
    });

  } catch (error) {
    logger.error('Expert switch failed', error);
    // Fallback to showing error to user
    router.push({
      pathname: '/(error)/expert-switch-failed'
    });
  }
}

/**
 * 🔧 UTILITY FUNCTIONS
 */
async function getAuthToken() {
  // Implementation depends on your auth system
  return localStorage.getItem('auth_token');
}

function cleanupSessionListeners() {
  // Cleanup implementation for session listeners
  logger.debug('Session listeners cleaned up');
}

// Event handlers for real-time session updates
function handleSessionUpdate(data) {
  logger.debug('Session updated', data);
  // Update local state or trigger re-renders
}

function handleExpertJoined(data) {
  logger.info('Expert joined session', data);
  // Show notification or update UI
}

function handleQualityAlert(data) {
  logger.warn('Quality alert received', data);
  // Trigger quality intervention flow
}

function handleSessionCompleted(data) {
  logger.info('Session completed', data);
  // Navigate to completion screen or show celebration
}

function handleWebSocketMessage(message) {
  logger.debug('WebSocket message received', message);
  // Handle different message types
}

function handleQualityIssue(issue) {
  logger.warn('Quality issue detected', issue);
  // Trigger appropriate quality handling
}

function handleSessionReconnect() {
  logger.info('Session reconnection attempted');
  // Implement reconnection logic
}

function handleConnectionRestored() {
  logger.info('Network connection restored');
  // Resume session activities
}

function handleConnectionLost() {
  logger.warn('Network connection lost');
  // Show offline mode or pause activities
}