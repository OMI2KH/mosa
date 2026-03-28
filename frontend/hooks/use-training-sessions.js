// hooks/use-training-sessions.js

/**
 * 🎯 ENTERPRISE TRAINING SESSIONS HOOK
 * Production-ready session management for Mosa Forge
 * Features: Real-time session management, attendance tracking, expert matching, quality monitoring
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { useQualityMetrics } from './use-quality-metrics';
import { useWebSocket } from './use-websocket';
import { SessionService } from '../services/session-service';
import { Logger } from '../utils/logger';
import { EventEmitter } from 'events';

class TrainingSessionManager extends EventEmitter {
  constructor() {
    super();
    this.sessionService = new SessionService();
    this.logger = new Logger('TrainingSessionManager');
    this.activeSessions = new Map();
    this.sessionTimeouts = new Map();
    this.heartbeatIntervals = new Map();
  }

  // ... (rest of the manager class implementation from previous response)
}

export const useTrainingSessions = (options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 30000,
    realTimeUpdates = true,
    qualityMonitoring = true
  } = options;

  const { user, isAuthenticated, hasRole } = useAuth();
  const { trackQualityEvent, getExpertQualityScore } = useQualityMetrics();
  const { subscribe, unsubscribe, sendMessage } = useWebSocket();
  
  const [state, setState] = useState({
    sessions: [],
    activeSession: null,
    upcomingSessions: [],
    pastSessions: [],
    loading: false,
    error: null,
    lastUpdated: null,
    stats: {
      totalSessions: 0,
      completedSessions: 0,
      attendanceRate: 0,
      averageRating: 0
    }
  });

  const managerRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const qualityCheckTimerRef = useRef(null);

  /**
   * 🎯 INITIALIZE SESSION MANAGER
   */
  const initializeManager = useCallback(() => {
    if (!managerRef.current) {
      managerRef.current = new TrainingSessionManager();
      
      // Set up event listeners
      managerRef.current.on('sessionStarted', handleSessionStarted);
      managerRef.current.on('sessionEnded', handleSessionEnded);
      managerRef.current.on('attendanceUpdated', handleAttendanceUpdated);
      managerRef.current.on('qualityAlert', handleQualityAlert);
      managerRef.current.on('expertChanged', handleExpertChanged);
    }
    return managerRef.current;
  }, []);

  /**
   * 🎯 EVENT HANDLERS
   */
  const handleSessionStarted = useCallback((session) => {
    setState(prev => ({
      ...prev,
      activeSession: session,
      sessions: updateSessionInArray(prev.sessions, session)
    }));

    trackQualityEvent('SESSION_STARTED', {
      sessionId: session.id,
      expertId: session.expertId,
      studentId: session.studentId
    });

    logger.info('Session started', { sessionId: session.id });
  }, [trackQualityEvent]);

  const handleSessionEnded = useCallback((session) => {
    setState(prev => ({
      ...prev,
      activeSession: null,
      sessions: updateSessionInArray(prev.sessions, session),
      pastSessions: [session, ...prev.pastSessions.slice(0, 49)] // Keep last 50
    }));

    trackQualityEvent('SESSION_COMPLETED', {
      sessionId: session.id,
      expertId: session.expertId,
      studentId: session.studentId,
      duration: session.actualDuration,
      attendance: session.attendanceStatus
    });
  }, [trackQualityEvent]);

  const handleAttendanceUpdated = useCallback(({ sessionId, attendance }) => {
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(session =>
        session.id === sessionId
          ? { ...session, attendance }
          : session
      )
    }));
  }, []);

  const handleQualityAlert = useCallback((alert) => {
    logger.warn('Quality alert received', alert);
    
    // Trigger quality degradation handling
    if (alert.severity === 'HIGH') {
      handleExpertQualityDegradation(alert.sessionId, alert.expertId);
    }
  }, []);

  const handleExpertChanged = useCallback(({ sessionId, oldExpertId, newExpertId }) => {
    setState(prev => ({
      ...prev,
      sessions: prev.sessions.map(session =>
        session.id === sessionId
          ? { ...session, expertId: newExpertId, expertChanged: true }
          : session
      )
    }));

    trackQualityEvent('EXPERT_CHANGED', {
      sessionId,
      oldExpertId,
      newExpertId,
      reason: 'QUALITY_DEGRADATION'
    });
  }, [trackQualityEvent]);

  /**
   * 🎯 CORE HOOK FUNCTIONS
   */

  /**
   * 📥 LOAD SESSIONS - Comprehensive session loading with caching
   */
  const loadSessions = useCallback(async (filters = {}) => {
    if (!isAuthenticated) {
      throw new Error('AUTHENTICATION_REQUIRED');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const sessionData = await SessionService.getSessions({
        userId: user.id,
        userType: user.type,
        ...filters,
        include: ['expert', 'student', 'enrollment', 'ratings']
      });

      const organizedSessions = organizeSessions(sessionData.sessions);
      
      setState(prev => ({
        ...prev,
        ...organizedSessions,
        stats: calculateSessionStats(organizedSessions.sessions),
        lastUpdated: new Date(),
        loading: false
      }));

      // Initialize real-time tracking for active sessions
      if (realTimeUpdates) {
        initializeRealTimeTracking(organizedSessions.activeSessions);
      }

      logger.info('Sessions loaded successfully', {
        userId: user.id,
        sessionCount: sessionData.sessions.length
      });

      return sessionData;

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));

      logger.error('Failed to load sessions', error, { userId: user.id });
      throw error;
    }
  }, [isAuthenticated, user, realTimeUpdates]);

  /**
   * ➕ CREATE SESSION - Expert matching and validation
   */
  const createSession = useCallback(async (sessionData) => {
    if (!isAuthenticated) {
      throw new Error('AUTHENTICATION_REQUIRED');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 🛡️ PRE-VALIDATION CHECKS
      await validateSessionCreation(sessionData);

      // 👨‍🏫 EXPERT MATCHING WITH QUALITY CHECK
      const expertId = await findOptimalExpert(sessionData);

      const sessionPayload = {
        ...sessionData,
        expertId,
        status: 'SCHEDULED',
        createdBy: user.id,
        metadata: {
          creationSource: 'STUDENT_PORTAL',
          qualityScore: await getExpertQualityScore(expertId),
          createdAt: new Date().toISOString()
        }
      };

      const newSession = await SessionService.createSession(sessionPayload);

      setState(prev => ({
        ...prev,
        sessions: [newSession, ...prev.sessions],
        upcomingSessions: [newSession, ...prev.upcomingSessions],
        loading: false
      }));

      // 🔔 REAL-TIME NOTIFICATION
      if (managerRef.current) {
        managerRef.current.emit('sessionCreated', newSession);
      }

      trackQualityEvent('SESSION_CREATED', {
        sessionId: newSession.id,
        expertId: newSession.expertId,
        studentId: newSession.studentId,
        skillId: newSession.skillId
      });

      logger.info('Session created successfully', { sessionId: newSession.id });

      return newSession;

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false
      }));

      logger.error('Session creation failed', error, { sessionData });
      throw error;
    }
  }, [isAuthenticated, user, getExpertQualityScore, trackQualityEvent]);

  /**
   * ▶️ START SESSION - Attendance verification and quality checks
   */
  const startSession = useCallback(async (sessionId) => {
    if (!isAuthenticated) {
      throw new Error('AUTHENTICATION_REQUIRED');
    }

    try {
      const session = await SessionService.startSession(sessionId, {
        startedBy: user.id,
        startTime: new Date(),
        attendanceVerified: await verifyAttendance(sessionId),
        qualityCheck: await performPreSessionQualityCheck(sessionId)
      });

      setState(prev => ({
        ...prev,
        sessions: updateSessionInArray(prev.sessions, session),
        activeSession: session
      }));

      // 🎯 START REAL-TIME MONITORING
      if (realTimeUpdates) {
        startSessionMonitoring(session);
      }

      trackQualityEvent('SESSION_ACTIVE', {
        sessionId: session.id,
        expertId: session.expertId,
        startTime: session.actualStartTime
      });

      logger.info('Session started', { sessionId: session.id });

      return session;

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));

      logger.error('Session start failed', error, { sessionId });
      throw error;
    }
  }, [isAuthenticated, user, realTimeUpdates, trackQualityEvent]);

  /**
   * ⏹️ END SESSION - Completion verification and rating preparation
   */
  const endSession = useCallback(async (sessionId, endData = {}) => {
    if (!isAuthenticated) {
      throw new Error('AUTHENTICATION_REQUIRED');
    }

    try {
      const session = await SessionService.endSession(sessionId, {
        endedBy: user.id,
        endTime: new Date(),
        ...endData,
        completionVerified: await verifySessionCompletion(sessionId),
        qualityMetrics: await calculateSessionQualityMetrics(sessionId)
      });

      setState(prev => ({
        ...prev,
        sessions: updateSessionInArray(prev.sessions, session),
        activeSession: null,
        pastSessions: [session, ...prev.pastSessions.slice(0, 49)]
      }));

      // 🛑 STOP REAL-TIME MONITORING
      if (realTimeUpdates) {
        stopSessionMonitoring(sessionId);
      }

      trackQualityEvent('SESSION_COMPLETED', {
        sessionId: session.id,
        expertId: session.expertId,
        duration: session.actualDuration,
        completionStatus: session.completionStatus
      });

      logger.info('Session ended', { sessionId: session.id });

      return session;

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));

      logger.error('Session end failed', error, { sessionId });
      throw error;
    }
  }, [isAuthenticated, user, realTimeUpdates, trackQualityEvent]);

  /**
   * ✅ UPDATE ATTENDANCE - Real-time attendance tracking
   */
  const updateAttendance = useCallback(async (sessionId, attendanceData) => {
    try {
      const updatedSession = await SessionService.updateAttendance(sessionId, {
        ...attendanceData,
        verifiedBy: user.id,
        verificationTime: new Date(),
        verificationMethod: 'MANUAL' // or 'AUTOMATIC'
      });

      setState(prev => ({
        ...prev,
        sessions: updateSessionInArray(prev.sessions, updatedSession)
      }));

      // 🔔 REAL-TIME UPDATE
      if (managerRef.current) {
        managerRef.current.emit('attendanceUpdated', {
          sessionId,
          attendance: updatedSession.attendance
        });
      }

      trackQualityEvent('ATTENDANCE_UPDATED', {
        sessionId,
        expertId: updatedSession.expertId,
        studentId: updatedSession.studentId,
        attendanceStatus: updatedSession.attendanceStatus
      });

      return updatedSession;

    } catch (error) {
      logger.error('Attendance update failed', error, { sessionId, attendanceData });
      throw error;
    }
  }, [user, trackQualityEvent]);

  /**
   * 🔄 RESCHEDULE SESSION - With expert availability check
   */
  const rescheduleSession = useCallback(async (sessionId, newSchedule) => {
    try {
      // 🛡️ AVAILABILITY VALIDATION
      await validateExpertAvailability(sessionId, newSchedule);

      const rescheduledSession = await SessionService.rescheduleSession(sessionId, {
        ...newSchedule,
        rescheduledBy: user.id,
        rescheduledAt: new Date(),
        previousSchedule: state.sessions.find(s => s.id === sessionId)?.schedule
      });

      setState(prev => ({
        ...prev,
        sessions: updateSessionInArray(prev.sessions, rescheduledSession)
      }));

      trackQualityEvent('SESSION_RESCHEDULED', {
        sessionId,
        expertId: rescheduledSession.expertId,
        reason: newSchedule.reason
      });

      logger.info('Session rescheduled', { sessionId, newSchedule });

      return rescheduledSession;

    } catch (error) {
      logger.error('Session reschedule failed', error, { sessionId, newSchedule });
      throw error;
    }
  }, [user, state.sessions, trackQualityEvent]);

  /**
   * 🚨 CANCEL SESSION - With penalty calculation and expert notification
   */
  const cancelSession = useCallback(async (sessionId, cancellationData) => {
    try {
      const cancelledSession = await SessionService.cancelSession(sessionId, {
        ...cancellationData,
        cancelledBy: user.id,
        cancelledAt: new Date(),
        penaltyApplied: await calculateCancellationPenalty(sessionId, cancellationData.reason)
      });

      setState(prev => ({
        ...prev,
        sessions: updateSessionInArray(prev.sessions, cancelledSession)
      }));

      trackQualityEvent('SESSION_CANCELLED', {
        sessionId,
        expertId: cancelledSession.expertId,
        studentId: cancelledSession.studentId,
        reason: cancellationData.reason,
        penalty: cancelledSession.penaltyApplied
      });

      logger.info('Session cancelled', { sessionId, cancellationData });

      return cancelledSession;

    } catch (error) {
      logger.error('Session cancellation failed', error, { sessionId, cancellationData });
      throw error;
    }
  }, [user, trackQualityEvent]);

  /**
   * 📊 GET SESSION ANALYTICS
   */
  const getSessionAnalytics = useCallback(async (filters = {}) => {
    try {
      const analytics = await SessionService.getSessionAnalytics({
        userId: user.id,
        userType: user.type,
        ...filters
      });

      return analytics;

    } catch (error) {
      logger.error('Failed to get session analytics', error, { userId: user.id });
      throw error;
    }
  }, [user]);

  /**
   * 🎯 EXPERT MATCHING ALGORITHM
   */
  const findOptimalExpert = useCallback(async (sessionData) => {
    const { skillId, studentId, preferredSchedule, budget } = sessionData;

    try {
      const experts = await SessionService.findAvailableExperts({
        skillId,
        schedule: preferredSchedule,
        budgetRange: budget,
        studentLevel: await getStudentLevel(studentId),
        qualityThreshold: 4.0 // Minimum quality score
      });

      if (experts.length === 0) {
        throw new Error('NO_QUALIFIED_EXPERTS_AVAILABLE');
      }

      // 🎯 WEIGHTED SCORING ALGORITHM
      const scoredExperts = await Promise.all(
        experts.map(async (expert) => {
          const qualityScore = await getExpertQualityScore(expert.id);
          const availabilityScore = calculateAvailabilityScore(expert.availability, preferredSchedule);
          const proximityScore = await calculateProximityScore(studentId, expert.id);
          const ratingScore = expert.averageRating / 5; // Normalize to 0-1
          const responseTimeScore = calculateResponseTimeScore(expert.averageResponseTime);

          const totalScore = 
            (qualityScore * 0.3) +
            (availabilityScore * 0.25) +
            (proximityScore * 0.2) +
            (ratingScore * 0.15) +
            (responseTimeScore * 0.1);

          return { ...expert, matchScore: totalScore };
        })
      );

      // Select best matching expert
      const bestExpert = scoredExperts.reduce((best, current) =>
        current.matchScore > best.matchScore ? current : best
      );

      if (bestExpert.matchScore < 0.6) {
        throw new Error('NO_SUITABLE_EXPERT_FOUND');
      }

      logger.info('Expert matched successfully', {
        sessionData,
        expertId: bestExpert.id,
        matchScore: bestExpert.matchScore
      });

      return bestExpert.id;

    } catch (error) {
      logger.error('Expert matching failed', error, { sessionData });
      throw error;
    }
  }, [getExpertQualityScore]);

  /**
   * 🛡️ SESSION VALIDATION
   */
  const validateSessionCreation = useCallback(async (sessionData) => {
    const { studentId, skillId, schedule } = sessionData;

    // Check student enrollment status
    const enrollment = await SessionService.getStudentEnrollment(studentId, skillId);
    if (!enrollment || enrollment.status !== 'ACTIVE') {
      throw new Error('STUDENT_NOT_ENROLLED_IN_SKILL');
    }

    // Check for scheduling conflicts
    const conflicts = await SessionService.checkSchedulingConflicts(studentId, schedule);
    if (conflicts.length > 0) {
      throw new Error('SCHEDULING_CONFLICT_DETECTED');
    }

    // Validate session limits
    const sessionCount = await SessionService.getStudentSessionCount(studentId, skillId);
    const maxSessions = enrollment.package?.maxSessions || 10;
    if (sessionCount >= maxSessions) {
      throw new Error('SESSION_LIMIT_REACHED');
    }

    return true;
  }, []);

  /**
   * 🔄 REAL-TIME SESSION MONITORING
   */
  const initializeRealTimeTracking = useCallback((activeSessions) => {
    activeSessions.forEach(session => {
      // Subscribe to session updates
      subscribe(`session:${session.id}`, (update) => {
        handleRealTimeUpdate(update);
      });

      // Start heartbeat for active sessions
      if (session.status === 'ACTIVE') {
        startSessionMonitoring(session);
      }
    });
  }, [subscribe]);

  const startSessionMonitoring = useCallback((session) => {
    const interval = setInterval(async () => {
      try {
        // Check session health
        const health = await SessionService.checkSessionHealth(session.id);
        
        if (health.status === 'DEGRADED') {
          handleQualityAlert({
            sessionId: session.id,
            expertId: session.expertId,
            severity: 'MEDIUM',
            issue: health.issue
          });
        }

        // Update session duration
        setState(prev => ({
          ...prev,
          activeSession: {
            ...prev.activeSession,
            currentDuration: calculateCurrentDuration(session)
          }
        }));

      } catch (error) {
        logger.error('Session monitoring failed', error, { sessionId: session.id });
      }
    }, 30000); // Every 30 seconds

    // Store interval for cleanup
    if (!qualityCheckTimerRef.current) {
      qualityCheckTimerRef.current = new Map();
    }
    qualityCheckTimerRef.current.set(session.id, interval);
  }, [handleQualityAlert]);

  const stopSessionMonitoring = useCallback((sessionId) => {
    if (qualityCheckTimerRef.current?.has(sessionId)) {
      clearInterval(qualityCheckTimerRef.current.get(sessionId));
      qualityCheckTimerRef.current.delete(sessionId);
    }

    // Unsubscribe from real-time updates
    unsubscribe(`session:${sessionId}`);
  }, [unsubscribe]);

  const handleRealTimeUpdate = useCallback((update) => {
    const { type, sessionId, data } = update;

    switch (type) {
      case 'ATTENDANCE_UPDATE':
        handleAttendanceUpdated({ sessionId, attendance: data.attendance });
        break;
      
      case 'EXPERT_JOINED':
        setState(prev => ({
          ...prev,
          sessions: prev.sessions.map(session =>
            session.id === sessionId
              ? { ...session, expertJoined: true, expertJoinTime: new Date() }
              : session
          )
        }));
        break;
      
      case 'SESSION_PROGRESS':
        setState(prev => ({
          ...prev,
          sessions: prev.sessions.map(session =>
            session.id === sessionId
              ? { ...session, progress: data.progress }
              : session
          )
        }));
        break;
      
      case 'QUALITY_ALERT':
        handleQualityAlert({ sessionId, ...data });
        break;

      default:
        logger.warn('Unknown real-time update type', { type, sessionId });
    }
  }, [handleAttendanceUpdated, handleQualityAlert]);

  /**
   * 🚨 QUALITY DEGRADATION HANDLING
   */
  const handleExpertQualityDegradation = useCallback(async (sessionId, expertId) => {
    try {
      // Check if auto-expert switching is enabled
      const session = state.sessions.find(s => s.id === sessionId);
      if (session?.qualityGuaranteeEnabled) {
        
        // Find replacement expert
        const newExpertId = await findOptimalExpert({
          skillId: session.skillId,
          studentId: session.studentId,
          preferredSchedule: session.schedule
        });

        // Switch expert
        await SessionService.switchExpert(sessionId, newExpertId, {
          reason: 'QUALITY_DEGRADATION',
          originalExpertId: expertId,
          switchedBy: 'SYSTEM',
          qualityScoreBefore: await getExpertQualityScore(expertId)
        });

        // Update state
        setState(prev => ({
          ...prev,
          sessions: prev.sessions.map(s =>
            s.id === sessionId
              ? { ...s, expertId: newExpertId, expertChanged: true }
              : s
          )
        }));

        trackQualityEvent('EXPERT_AUTO_SWITCHED', {
          sessionId,
          oldExpertId: expertId,
          newExpertId,
          reason: 'QUALITY_DEGRADATION'
        });

        logger.info('Expert auto-switched due to quality degradation', {
          sessionId,
          oldExpertId: expertId,
          newExpertId
        });
      }
    } catch (error) {
      logger.error('Expert switching failed', error, { sessionId, expertId });
    }
  }, [state.sessions, findOptimalExpert, getExpertQualityScore, trackQualityEvent]);

  /**
   * 🧹 CLEANUP AND EFFECTS
   */
  useEffect(() => {
    if (isAuthenticated && autoRefresh) {
      // Initial load
      loadSessions();

      // Set up periodic refresh
      refreshTimerRef.current = setInterval(() => {
        loadSessions();
      }, refreshInterval);

      // Initialize session manager
      initializeManager();
    }

    return () => {
      // Cleanup timers
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }

      if (qualityCheckTimerRef.current) {
        qualityCheckTimerRef.current.forEach(interval => clearInterval(interval));
        qualityCheckTimerRef.current.clear();
      }

      // Cleanup session manager
      if (managerRef.current) {
        managerRef.current.removeAllListeners();
      }
    };
  }, [isAuthenticated, autoRefresh, refreshInterval, loadSessions, initializeManager]);

  /**
   * 🎯 HOOK RETURN VALUE
   */
  return {
    // State
    ...state,
    
    // Core Actions
    loadSessions,
    createSession,
    startSession,
    endSession,
    updateAttendance,
    rescheduleSession,
    cancelSession,
    
    // Analytics
    getSessionAnalytics,
    
    // Utility Functions
    refreshSessions: () => loadSessions(),
    clearError: () => setState(prev => ({ ...prev, error: null })),
    
    // Real-time Features
    isRealTimeConnected: realTimeUpdates,
    
    // Quality Features
    qualityMonitoringEnabled: qualityMonitoring
  };
};

/**
 * 🛠️ UTILITY FUNCTIONS
 */

// Update session in array
const updateSessionInArray = (sessions, updatedSession) =>
  sessions.map(session =>
    session.id === updatedSession.id ? updatedSession : session
  );

// Organize sessions by status
const organizeSessions = (sessions) => {
  const now = new Date();
  
  return {
    sessions,
    activeSession: sessions.find(s => s.status === 'ACTIVE'),
    upcomingSessions: sessions
      .filter(s => s.status === 'SCHEDULED' && new Date(s.scheduledStart) > now)
      .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart)),
    pastSessions: sessions
      .filter(s => ['COMPLETED', 'CANCELLED'].includes(s.status))
      .sort((a, b) => new Date(b.actualEnd || b.scheduledEnd) - new Date(a.actualEnd || a.scheduledEnd))
  };
};

// Calculate session statistics
const calculateSessionStats = (sessions) => {
  const completedSessions = sessions.filter(s => s.status === 'COMPLETED');
  const attendedSessions = completedSessions.filter(s => s.attendanceStatus === 'PRESENT');
  
  return {
    totalSessions: sessions.length,
    completedSessions: completedSessions.length,
    attendanceRate: completedSessions.length > 0 
      ? (attendedSessions.length / completedSessions.length) * 100 
      : 0,
    averageRating: completedSessions.length > 0
      ? completedSessions.reduce((sum, session) => sum + (session.finalRating || 0), 0) / completedSessions.length
      : 0
  };
};

// Error message formatting
const getErrorMessage = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  return error.message || 'An unexpected error occurred';
};

// Availability scoring
const calculateAvailabilityScore = (expertAvailability, preferredSchedule) => {
  // Implementation depends on availability data structure
  return 0.8; // Placeholder
};

// Proximity scoring
const calculateProximityScore = async (studentId, expertId) => {
  // Implementation for geographic proximity
  return 0.7; // Placeholder
};

// Response time scoring
const calculateResponseTimeScore = (responseTime) => {
  if (!responseTime) return 0.5;
  // Normalize response time (lower is better)
  return Math.max(0, 1 - (responseTime / 3600000)); // 1 hour max
};

// Duration calculation
const calculateCurrentDuration = (session) => {
  if (!session.actualStartTime) return 0;
  return Date.now() - new Date(session.actualStartTime).getTime();
};

// Export utility functions for testing
export const TrainingSessionUtils = {
  updateSessionInArray,
  organizeSessions,
  calculateSessionStats,
  calculateAvailabilityScore,
  calculateProximityScore,
  calculateResponseTimeScore
};

export default useTrainingSessions;