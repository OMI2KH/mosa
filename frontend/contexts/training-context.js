// contexts/training-context.js

/**
 * 🎯 ENTERPRISE TRAINING CONTEXT
 * Production-ready React Context for training session management
 * Features: Real-time session tracking, expert matching, progress monitoring
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth-context';
import { useQuality } from './quality-context';
import { TrainingService } from '../services/training-service';
import { Logger } from '../utils/logger';

// Initialize logger
const logger = new Logger('TrainingContext');

// 🎯 ACTION TYPES
const TRAINING_ACTIONS = {
  // Session Management
  SET_ACTIVE_SESSIONS: 'SET_ACTIVE_SESSIONS',
  SET_COMPLETED_SESSIONS: 'SET_COMPLETED_SESSIONS',
  SET_UPCOMING_SESSIONS: 'SET_UPCOMING_SESSIONS',
  
  // Session Operations
  SET_CURRENT_SESSION: 'SET_CURRENT_SESSION',
  UPDATE_SESSION_STATUS: 'UPDATE_SESSION_STATUS',
  ADD_SESSION: 'ADD_SESSION',
  REMOVE_SESSION: 'REMOVE_SESSION',
  
  // Expert Matching
  SET_AVAILABLE_EXPERTS: 'SET_AVAILABLE_EXPERTS',
  SET_MATCHED_EXPERT: 'SET_MATCHED_EXPERT',
  SET_EXPERT_LOADING: 'SET_EXPERT_LOADING',
  
  // Progress Tracking
  SET_SESSION_PROGRESS: 'SET_SESSION_PROGRESS',
  SET_OVERALL_PROGRESS: 'SET_OVERALL_PROGRESS',
  UPDATE_ATTENDANCE: 'UPDATE_ATTENDANCE',
  
  // Real-time Updates
  SET_REALTIME_STATUS: 'SET_REALTIME_STATUS',
  UPDATE_SESSION_METRICS: 'UPDATE_SESSION_METRICS',
  
  // Error Handling
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Loading States
  SET_LOADING: 'SET_LOADING',
  SET_SESSION_LOADING: 'SET_SESSION_LOADING'
};

// 🏗️ INITIAL STATE
const initialState = {
  // Session Collections
  activeSessions: [],
  completedSessions: [],
  upcomingSessions: [],
  
  // Current Session
  currentSession: null,
  sessionProgress: 0,
  
  // Expert Management
  availableExperts: [],
  matchedExpert: null,
  expertLoading: false,
  
  // Progress Tracking
  overallProgress: {
    completedSessions: 0,
    totalSessions: 0,
    attendanceRate: 0,
    averageRating: 0,
    skillMastery: {}
  },
  
  // Real-time Data
  realtimeStatus: {
    isLive: false,
    participants: 0,
    sessionDuration: 0,
    lastUpdate: null
  },
  
  // UI State
  loading: {
    sessions: false,
    experts: false,
    progress: false
  },
  
  // Error Handling
  error: null,
  
  // Metadata
  lastFetched: null,
  cacheStatus: 'FRESH'
};

// 🔄 REDUCER FUNCTION
function trainingReducer(state, action) {
  logger.debug('Dispatching action:', { type: action.type, payload: action.payload });

  switch (action.type) {
    // 🎯 SESSION MANAGEMENT
    case TRAINING_ACTIONS.SET_ACTIVE_SESSIONS:
      return {
        ...state,
        activeSessions: action.payload,
        lastFetched: new Date().toISOString(),
        loading: { ...state.loading, sessions: false }
      };

    case TRAINING_ACTIONS.SET_COMPLETED_SESSIONS:
      return {
        ...state,
        completedSessions: action.payload,
        lastFetched: new Date().toISOString()
      };

    case TRAINING_ACTIONS.SET_UPCOMING_SESSIONS:
      return {
        ...state,
        upcomingSessions: action.payload,
        lastFetched: new Date().toISOString()
      };

    // 🎯 CURRENT SESSION OPERATIONS
    case TRAINING_ACTIONS.SET_CURRENT_SESSION:
      return {
        ...state,
        currentSession: action.payload.session,
        sessionProgress: action.payload.progress || 0,
        loading: { ...state.loading, sessions: false }
      };

    case TRAINING_ACTIONS.UPDATE_SESSION_STATUS:
      return {
        ...state,
        currentSession: state.currentSession ? {
          ...state.currentSession,
          status: action.payload.status,
          updatedAt: new Date().toISOString()
        } : null,
        activeSessions: state.activeSessions.map(session =>
          session.id === action.payload.sessionId
            ? { ...session, status: action.payload.status }
            : session
        )
      };

    case TRAINING_ACTIONS.ADD_SESSION:
      return {
        ...state,
        upcomingSessions: [...state.upcomingSessions, action.payload],
        lastFetched: new Date().toISOString()
      };

    case TRAINING_ACTIONS.REMOVE_SESSION:
      return {
        ...state,
        upcomingSessions: state.upcomingSessions.filter(
          session => session.id !== action.payload
        ),
        activeSessions: state.activeSessions.filter(
          session => session.id !== action.payload
        )
      };

    // 👨‍🏫 EXPERT MANAGEMENT
    case TRAINING_ACTIONS.SET_AVAILABLE_EXPERTS:
      return {
        ...state,
        availableExperts: action.payload,
        expertLoading: false,
        loading: { ...state.loading, experts: false }
      };

    case TRAINING_ACTIONS.SET_MATCHED_EXPERT:
      return {
        ...state,
        matchedExpert: action.payload,
        expertLoading: false
      };

    case TRAINING_ACTIONS.SET_EXPERT_LOADING:
      return {
        ...state,
        expertLoading: action.payload
      };

    // 📊 PROGRESS TRACKING
    case TRAINING_ACTIONS.SET_SESSION_PROGRESS:
      return {
        ...state,
        sessionProgress: action.payload,
        currentSession: state.currentSession ? {
          ...state.currentSession,
          progress: action.payload,
          lastProgressUpdate: new Date().toISOString()
        } : null
      };

    case TRAINING_ACTIONS.SET_OVERALL_PROGRESS:
      return {
        ...state,
        overallProgress: action.payload,
        loading: { ...state.loading, progress: false }
      };

    case TRAINING_ACTIONS.UPDATE_ATTENDANCE:
      return {
        ...state,
        currentSession: state.currentSession ? {
          ...state.currentSession,
          attendance: action.payload.attendance,
          isPresent: action.payload.isPresent
        } : null
      };

    // 🔄 REAL-TIME UPDATES
    case TRAINING_ACTIONS.SET_REALTIME_STATUS:
      return {
        ...state,
        realtimeStatus: {
          ...state.realtimeStatus,
          ...action.payload,
          lastUpdate: new Date().toISOString()
        }
      };

    case TRAINING_ACTIONS.UPDATE_SESSION_METRICS:
      return {
        ...state,
        currentSession: state.currentSession ? {
          ...state.currentSession,
          metrics: {
            ...state.currentSession.metrics,
            ...action.payload
          }
        } : null
      };

    // 🚨 ERROR HANDLING
    case TRAINING_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: {
          sessions: false,
          experts: false,
          progress: false
        }
      };

    case TRAINING_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    // ⏳ LOADING STATES
    case TRAINING_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: { ...state.loading, ...action.payload }
      };

    case TRAINING_ACTIONS.SET_SESSION_LOADING:
      return {
        ...state,
        loading: { ...state.loading, sessions: action.payload }
      };

    default:
      logger.warn('Unknown action type:', action.type);
      return state;
  }
}

// 🎯 CREATE CONTEXT
const TrainingContext = createContext();

// 🏗️ PROVIDER COMPONENT
export function TrainingProvider({ children }) {
  const [state, dispatch] = useReducer(trainingReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const { updateQualityMetrics } = useQuality();
  const queryClient = useQueryClient();
  const trainingService = new TrainingService();

  // 🔍 DERIVED STATE
  const hasActiveSessions = state.activeSessions.length > 0;
  const hasUpcomingSessions = state.upcomingSessions.length > 0;
  const isSessionLive = state.realtimeStatus.isLive;
  const canStartNewSession = !state.expertLoading && hasUpcomingSessions;

  // 🎯 ACTION CREATORS
  const actions = {
    // Session Management
    setActiveSessions: useCallback((sessions) => {
      dispatch({ type: TRAINING_ACTIONS.SET_ACTIVE_SESSIONS, payload: sessions });
    }, []),

    setCompletedSessions: useCallback((sessions) => {
      dispatch({ type: TRAINING_ACTIONS.SET_COMPLETED_SESSIONS, payload: sessions });
    }, []),

    setUpcomingSessions: useCallback((sessions) => {
      dispatch({ type: TRAINING_ACTIONS.SET_UPCOMING_SESSIONS, payload: sessions });
    }, []),

    // Session Operations
    setCurrentSession: useCallback((session, progress = 0) => {
      dispatch({ 
        type: TRAINING_ACTIONS.SET_CURRENT_SESSION, 
        payload: { session, progress } 
      });
    }, []),

    updateSessionStatus: useCallback((sessionId, status) => {
      dispatch({ 
        type: TRAINING_ACTIONS.UPDATE_SESSION_STATUS, 
        payload: { sessionId, status } 
      });
    }, []),

    addSession: useCallback((session) => {
      dispatch({ type: TRAINING_ACTIONS.ADD_SESSION, payload: session });
    }, []),

    removeSession: useCallback((sessionId) => {
      dispatch({ type: TRAINING_ACTIONS.REMOVE_SESSION, payload: sessionId });
    }, []),

    // Expert Management
    setAvailableExperts: useCallback((experts) => {
      dispatch({ type: TRAINING_ACTIONS.SET_AVAILABLE_EXPERTS, payload: experts });
    }, []),

    setMatchedExpert: useCallback((expert) => {
      dispatch({ type: TRAINING_ACTIONS.SET_MATCHED_EXPERT, payload: expert });
    }, []),

    setExpertLoading: useCallback((loading) => {
      dispatch({ type: TRAINING_ACTIONS.SET_EXPERT_LOADING, payload: loading });
    }, []),

    // Progress Tracking
    setSessionProgress: useCallback((progress) => {
      dispatch({ type: TRAINING_ACTIONS.SET_SESSION_PROGRESS, payload: progress });
    }, []),

    setOverallProgress: useCallback((progress) => {
      dispatch({ type: TRAINING_ACTIONS.SET_OVERALL_PROGRESS, payload: progress });
    }, []),

    updateAttendance: useCallback((attendance, isPresent) => {
      dispatch({ 
        type: TRAINING_ACTIONS.UPDATE_ATTENDANCE, 
        payload: { attendance, isPresent } 
      });
    }, []),

    // Real-time Updates
    setRealtimeStatus: useCallback((status) => {
      dispatch({ type: TRAINING_ACTIONS.SET_REALTIME_STATUS, payload: status });
    }, []),

    updateSessionMetrics: useCallback((metrics) => {
      dispatch({ type: TRAINING_ACTIONS.UPDATE_SESSION_METRICS, payload: metrics });
    }, []),

    // Error Handling
    setError: useCallback((error) => {
      dispatch({ type: TRAINING_ACTIONS.SET_ERROR, payload: error });
    }, []),

    clearError: useCallback(() => {
      dispatch({ type: TRAINING_ACTIONS.CLEAR_ERROR });
    }, []),

    // Loading States
    setLoading: useCallback((loadingState) => {
      dispatch({ type: TRAINING_ACTIONS.SET_LOADING, payload: loadingState });
    }, []),

    setSessionLoading: useCallback((loading) => {
      dispatch({ type: TRAINING_ACTIONS.SET_SESSION_LOADING, payload: loading });
    }, [])
  };

  // 🎯 REACT QUERY INTEGRATION

  // Fetch all sessions for current user
  const { refetch: refetchSessions } = useQuery({
    queryKey: ['training-sessions', user?.id],
    queryFn: async () => {
      if (!isAuthenticated || !user?.id) {
        throw new Error('User not authenticated');
      }

      actions.setSessionLoading(true);
      actions.clearError();

      try {
        const sessions = await trainingService.getUserSessions(user.id);
        
        // Categorize sessions
        const active = sessions.filter(s => s.status === 'ACTIVE');
        const completed = sessions.filter(s => s.status === 'COMPLETED');
        const upcoming = sessions.filter(s => s.status === 'SCHEDULED');

        actions.setActiveSessions(active);
        actions.setCompletedSessions(completed);
        actions.setUpcomingSessions(upcoming);

        logger.info('Sessions fetched successfully', { 
          total: sessions.length,
          active: active.length,
          completed: completed.length,
          upcoming: upcoming.length
        });

        return sessions;
      } catch (error) {
        logger.error('Failed to fetch sessions', error);
        actions.setError(error.message);
        throw error;
      } finally {
        actions.setSessionLoading(false);
      }
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Fetch session progress
  const { refetch: refetchProgress } = useQuery({
    queryKey: ['training-progress', user?.id],
    queryFn: async () => {
      if (!isAuthenticated || !user?.id) {
        throw new Error('User not authenticated');
      }

      actions.setLoading({ progress: true });
      actions.clearError();

      try {
        const progress = await trainingService.getUserProgress(user.id);
        actions.setOverallProgress(progress);

        logger.debug('Progress data fetched', { progress });
        return progress;
      } catch (error) {
        logger.error('Failed to fetch progress', error);
        actions.setError(error.message);
        throw error;
      } finally {
        actions.setLoading({ progress: false });
      }
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  // 🎯 MUTATIONS

  // Start a training session
  const startSessionMutation = useMutation({
    mutationFn: async (sessionId) => {
      actions.setLoading({ sessions: true });
      actions.clearError();

      try {
        const session = await trainingService.startSession(sessionId);
        
        // Update local state
        actions.updateSessionStatus(sessionId, 'ACTIVE');
        actions.setCurrentSession(session, 0);
        
        // Update quality context
        updateQualityMetrics('SESSION_STARTED', {
          sessionId,
          expertId: session.expertId,
          startTime: new Date().toISOString()
        });

        logger.info('Session started successfully', { sessionId, expertId: session.expertId });
        return session;
      } catch (error) {
        logger.error('Failed to start session', error);
        actions.setError(error.message);
        throw error;
      } finally {
        actions.setLoading({ sessions: false });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['training-sessions']);
    }
  });

  // Complete a training session
  const completeSessionMutation = useMutation({
    mutationFn: async ({ sessionId, completionData }) => {
      actions.setLoading({ sessions: true });
      actions.clearError();

      try {
        const result = await trainingService.completeSession(sessionId, completionData);
        
        // Update local state
        actions.updateSessionStatus(sessionId, 'COMPLETED');
        actions.setCurrentSession(null, 0);
        
        // Update quality context
        updateQualityMetrics('SESSION_COMPLETED', {
          sessionId,
          expertId: result.expertId,
          duration: result.duration,
          rating: completionData.rating
        });

        logger.info('Session completed successfully', { 
          sessionId, 
          expertId: result.expertId,
          duration: result.duration
        });

        return result;
      } catch (error) {
        logger.error('Failed to complete session', error);
        actions.setError(error.message);
        throw error;
      } finally {
        actions.setLoading({ sessions: false });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['training-sessions']);
      queryClient.invalidateQueries(['training-progress']);
    }
  });

  // Match with expert
  const matchExpertMutation = useMutation({
    mutationFn: async (skillId) => {
      actions.setExpertLoading(true);
      actions.clearError();

      try {
        const experts = await trainingService.findAvailableExperts(skillId);
        actions.setAvailableExperts(experts);

        if (experts.length > 0) {
          const matchedExpert = trainingService.autoMatchExpert(experts);
          actions.setMatchedExpert(matchedExpert);
          
          logger.info('Expert matched successfully', { 
            skillId, 
            expertId: matchedExpert.id,
            tier: matchedExpert.currentTier
          });

          return matchedExpert;
        }

        return null;
      } catch (error) {
        logger.error('Failed to match expert', error);
        actions.setError(error.message);
        throw error;
      } finally {
        actions.setExpertLoading(false);
      }
    }
  });

  // Update session progress
  const updateProgressMutation = useMutation({
    mutationFn: async ({ sessionId, progress }) => {
      try {
        await trainingService.updateSessionProgress(sessionId, progress);
        actions.setSessionProgress(progress);
        
        logger.debug('Progress updated', { sessionId, progress });
        return progress;
      } catch (error) {
        logger.error('Failed to update progress', error);
        actions.setError(error.message);
        throw error;
      }
    }
  });

  // 🎯 REAL-TIME UPDATES
  useEffect(() => {
    if (!state.currentSession || !isAuthenticated) return;

    let intervalId;

    const setupRealTimeUpdates = () => {
      // Update real-time status every 30 seconds
      intervalId = setInterval(async () => {
        try {
          const realtimeData = await trainingService.getRealtimeSessionData(state.currentSession.id);
          
          actions.setRealtimeStatus({
            isLive: realtimeData.isLive,
            participants: realtimeData.participants,
            sessionDuration: realtimeData.duration
          });

          // Update session metrics if available
          if (realtimeData.metrics) {
            actions.updateSessionMetrics(realtimeData.metrics);
          }
        } catch (error) {
          logger.warn('Failed to fetch real-time data', error);
        }
      }, 30000);
    };

    setupRealTimeUpdates();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [state.currentSession?.id, isAuthenticated]);

  // 🎯 AUTO-REFRESH SESSIONS
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(() => {
      refetchSessions();
      refetchProgress();
    }, 300000); // Refresh every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, refetchSessions, refetchProgress]);

  // 🎯 CONTEXT VALUE
  const contextValue = {
    // State
    ...state,
    
    // Derived State
    hasActiveSessions,
    hasUpcomingSessions,
    isSessionLive,
    canStartNewSession,
    
    // Actions
    ...actions,
    
    // Mutations
    mutations: {
      startSession: startSessionMutation.mutateAsync,
      completeSession: completeSessionMutation.mutateAsync,
      matchExpert: matchExpertMutation.mutateAsync,
      updateProgress: updateProgressMutation.mutateAsync
    },
    
    // Mutation States
    mutationStates: {
      startingSession: startSessionMutation.isLoading,
      completingSession: completeSessionMutation.isLoading,
      matchingExpert: matchExpertMutation.isLoading,
      updatingProgress: updateProgressMutation.isLoading
    },
    
    // Refetch Functions
    refetchSessions,
    refetchProgress
  };

  return (
    <TrainingContext.Provider value={contextValue}>
      {children}
    </TrainingContext.Provider>
  );
}

// 🎯 CUSTOM HOOK
export function useTraining() {
  const context = useContext(TrainingContext);
  
  if (!context) {
    throw new Error('useTraining must be used within a TrainingProvider');
  }
  
  return context;
}

// 🎯 HOOK FOR SESSION-SPECIFIC OPERATIONS
export function useTrainingSession(sessionId) {
  const { 
    currentSession, 
    updateSessionStatus, 
    setSessionProgress,
    mutations,
    mutationStates 
  } = useTraining();

  const isCurrentSession = currentSession?.id === sessionId;

  const startSession = useCallback(() => {
    if (!sessionId) throw new Error('Session ID required');
    return mutations.startSession(sessionId);
  }, [sessionId, mutations]);

  const completeSession = useCallback((completionData) => {
    if (!sessionId) throw new Error('Session ID required');
    return mutations.completeSession({ sessionId, completionData });
  }, [sessionId, mutations]);

  const updateProgress = useCallback((progress) => {
    if (!sessionId) throw new Error('Session ID required');
    return mutations.updateProgress({ sessionId, progress });
  }, [sessionId, mutations]);

  return {
    session: isCurrentSession ? currentSession : null,
    isCurrentSession,
    startSession,
    completeSession,
    updateProgress,
    updateSessionStatus: () => updateSessionStatus(sessionId, 'status'),
    isLoading: mutationStates.startingSession || mutationStates.completingSession
  };
}

export default TrainingContext;