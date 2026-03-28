// contexts/quality-context.js

/**
 * 🎯 ENTERPRISE QUALITY CONTEXT
 * Production-ready React Context for global quality state management
 * Real-time quality metrics, expert tier tracking, performance monitoring
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { 
  QualityService, 
  QualityMetrics, 
  ExpertTier,
  QualityAlert 
} from '../services/quality-service';
import { useAuth } from './auth-context';
import { Logger } from '../utils/logger';
import { EventEmitter } from 'events';

// 🎯 Quality State Interface
const QualityState = {
  // Real-time Quality Metrics
  expertMetrics: new Map(), // expertId -> QualityMetrics
  studentFeedback: new Map(), // sessionId -> RatingData
  
  // Tier Management
  expertTiers: new Map(), // expertId -> ExpertTier
  tierThresholds: {
    MASTER: 4.7,
    SENIOR: 4.3,
    STANDARD: 4.0,
    DEVELOPING: 3.5,
    PROBATION: 0.0
  },
  
  // Performance Monitoring
  qualityAlerts: [],
  performanceTrends: new Map(), // expertId -> PerformanceTrend
  
  // System State
  isLoading: false,
  lastUpdated: null,
  error: null,
  
  // Real-time Connections
  isConnected: false,
  reconnectAttempts: 0
};

// 🎯 Quality Action Types
const QualityActionTypes = {
  // Data Loading
  LOAD_QUALITY_DATA: 'LOAD_QUALITY_DATA',
  LOAD_QUALITY_DATA_SUCCESS: 'LOAD_QUALITY_DATA_SUCCESS',
  LOAD_QUALITY_DATA_FAILURE: 'LOAD_QUALITY_DATA_FAILURE',
  
  // Real-time Updates
  UPDATE_EXPERT_METRICS: 'UPDATE_EXPERT_METRICS',
  UPDATE_STUDENT_FEEDBACK: 'UPDATE_STUDENT_FEEDBACK',
  UPDATE_EXPERT_TIER: 'UPDATE_EXPERT_TIER',
  
  // Alerts & Notifications
  ADD_QUALITY_ALERT: 'ADD_QUALITY_ALERT',
  RESOLVE_QUALITY_ALERT: 'RESOLVE_QUALITY_ALERT',
  CLEAR_QUALITY_ALERTS: 'CLEAR_QUALITY_ALERTS',
  
  // System Management
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_CONNECTION_STATUS: 'SET_CONNECTION_STATUS',
  
  // Performance Optimization
  CACHE_METRICS: 'CACHE_METRICS',
  INVALIDATE_CACHE: 'INVALIDATE_CACHE'
};

// 🎯 Quality Reducer - Enterprise State Management
const qualityReducer = (state, action) => {
  const { type, payload } = action;

  switch (type) {
    
    // 🎯 DATA LOADING ACTIONS
    case QualityActionTypes.LOAD_QUALITY_DATA:
      return {
        ...state,
        isLoading: true,
        error: null
      };
      
    case QualityActionTypes.LOAD_QUALITY_DATA_SUCCESS:
      return {
        ...state,
        ...payload,
        isLoading: false,
        lastUpdated: new Date(),
        error: null
      };
      
    case QualityActionTypes.LOAD_QUALITY_DATA_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: payload.error,
        lastUpdated: new Date()
      };
      
    // 🔄 REAL-TIME UPDATE ACTIONS
    case QualityActionTypes.UPDATE_EXPERT_METRICS:
      const updatedExpertMetrics = new Map(state.expertMetrics);
      updatedExpertMetrics.set(payload.expertId, payload.metrics);
      
      return {
        ...state,
        expertMetrics: updatedExpertMetrics,
        lastUpdated: new Date()
      };
      
    case QualityActionTypes.UPDATE_STUDENT_FEEDBACK:
      const updatedFeedback = new Map(state.studentFeedback);
      updatedFeedback.set(payload.sessionId, payload.feedback);
      
      // Auto-calculate impact on expert metrics
      const impactedExpertId = payload.feedback.expertId;
      if (impactedExpertId) {
        const currentMetrics = state.expertMetrics.get(impactedExpertId);
        if (currentMetrics) {
          const updatedMetrics = QualityService.calculateUpdatedMetrics(
            currentMetrics, 
            payload.feedback
          );
          updatedExpertMetrics.set(impactedExpertId, updatedMetrics);
        }
      }
      
      return {
        ...state,
        studentFeedback: updatedFeedback,
        expertMetrics: updatedExpertMetrics,
        lastUpdated: new Date()
      };
      
    case QualityActionTypes.UPDATE_EXPERT_TIER:
      const updatedTiers = new Map(state.expertTiers);
      updatedTiers.set(payload.expertId, payload.tier);
      
      // Check for tier change alerts
      const previousTier = state.expertTiers.get(payload.expertId);
      let newAlerts = [...state.qualityAlerts];
      
      if (previousTier && previousTier !== payload.tier) {
        const tierAlert = {
          id: `tier-change-${Date.now()}`,
          type: payload.tier > previousTier ? 'TIER_PROMOTION' : 'TIER_DEMOTION',
          expertId: payload.expertId,
          previousTier,
          newTier: payload.tier,
          timestamp: new Date(),
          severity: payload.tier > previousTier ? 'success' : 'warning'
        };
        newAlerts = [tierAlert, ...newAlerts.slice(0, 49)]; // Keep last 50 alerts
      }
      
      return {
        ...state,
        expertTiers: updatedTiers,
        qualityAlerts: newAlerts,
        lastUpdated: new Date()
      };
      
    // 🚨 ALERT MANAGEMENT ACTIONS
    case QualityActionTypes.ADD_QUALITY_ALERT:
      return {
        ...state,
        qualityAlerts: [payload.alert, ...state.qualityAlerts.slice(0, 49)]
      };
      
    case QualityActionTypes.RESOLVE_QUALITY_ALERT:
      return {
        ...state,
        qualityAlerts: state.qualityAlerts.filter(alert => alert.id !== payload.alertId)
      };
      
    case QualityActionTypes.CLEAR_QUALITY_ALERTS:
      return {
        ...state,
        qualityAlerts: []
      };
      
    // ⚙️ SYSTEM MANAGEMENT ACTIONS
    case QualityActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: payload.isLoading
      };
      
    case QualityActionTypes.SET_ERROR:
      return {
        ...state,
        error: payload.error,
        isLoading: false
      };
      
    case QualityActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
      
    case QualityActionTypes.SET_CONNECTION_STATUS:
      return {
        ...state,
        isConnected: payload.isConnected,
        reconnectAttempts: payload.reconnectAttempts || state.reconnectAttempts
      };
      
    // 🗄️ PERFORMANCE OPTIMIZATION ACTIONS
    case QualityActionTypes.CACHE_METRICS:
      // Cache expert metrics for offline use
      localStorage.setItem('quality_metrics_cache', JSON.stringify({
        expertMetrics: Array.from(state.expertMetrics.entries()),
        expertTiers: Array.from(state.expertTiers.entries()),
        cachedAt: new Date().toISOString()
      }));
      return state;
      
    case QualityActionTypes.INVALIDATE_CACHE:
      localStorage.removeItem('quality_metrics_cache');
      return state;
      
    default:
      return state;
  }
};

// 🎯 Create Quality Context
const QualityContext = createContext();

// 🎯 Quality Provider Component
export const QualityProvider = ({ children }) => {
  const [state, dispatch] = useReducer(qualityReducer, QualityState);
  const { user, isAuthenticated } = useAuth();
  const logger = new Logger('QualityContext');
  
  // 🎯 Real-time Event Emitter
  const eventEmitter = new EventEmitter();
  
  // 🎯 Service Instance
  const qualityService = new QualityService();

  // 🔧 Action Creators
  const actions = {
    
    // 🎯 DATA LOADING ACTIONS
    loadQualityData: useCallback(async (expertIds = []) => {
      if (!isAuthenticated || !user) {
        dispatch({
          type: QualityActionTypes.SET_ERROR,
          payload: { error: 'Authentication required' }
        });
        return;
      }

      dispatch({ type: QualityActionTypes.SET_LOADING, payload: { isLoading: true } });
      
      try {
        // Try to load from cache first for better UX
        const cachedData = loadCachedQualityData();
        if (cachedData) {
          dispatch({
            type: QualityActionTypes.LOAD_QUALITY_DATA_SUCCESS,
            payload: cachedData
          });
        }

        // Fetch fresh data from API
        const qualityData = await qualityService.getQualityMetrics(expertIds);
        
        dispatch({
          type: QualityActionTypes.LOAD_QUALITY_DATA_SUCCESS,
          payload: qualityData
        });
        
        // Cache the fresh data
        dispatch({ type: QualityActionTypes.CACHE_METRICS });
        
        logger.info('Quality data loaded successfully', { expertCount: expertIds.length });
        
      } catch (error) {
        dispatch({
          type: QualityActionTypes.LOAD_QUALITY_DATA_FAILURE,
          payload: { error: error.message }
        });
        
        logger.error('Failed to load quality data', error);
      }
    }, [isAuthenticated, user]),
    
    // 🔄 REAL-TIME UPDATE ACTIONS
    updateExpertMetrics: useCallback((expertId, metrics) => {
      dispatch({
        type: QualityActionTypes.UPDATE_EXPERT_METRICS,
        payload: { expertId, metrics }
      });
      
      // Emit real-time event
      eventEmitter.emit('expertMetricsUpdated', { expertId, metrics });
    }, []),
    
    updateStudentFeedback: useCallback((sessionId, feedback) => {
      dispatch({
        type: QualityActionTypes.UPDATE_STUDENT_FEEDBACK,
        payload: { sessionId, feedback }
      });
      
      // Auto-calculate tier changes
      const newTier = calculateExpertTier(feedback.expertId);
      if (newTier) {
        actions.updateExpertTier(feedback.expertId, newTier);
      }
      
      eventEmitter.emit('studentFeedbackUpdated', { sessionId, feedback });
    }, []),
    
    updateExpertTier: useCallback((expertId, tier) => {
      dispatch({
        type: QualityActionTypes.UPDATE_EXPERT_TIER,
        payload: { expertId, tier }
      });
      
      eventEmitter.emit('expertTierUpdated', { expertId, tier });
    }, []),
    
    // 🚨 ALERT MANAGEMENT ACTIONS
    addQualityAlert: useCallback((alert) => {
      const qualityAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        ...alert
      };
      
      dispatch({
        type: QualityActionTypes.ADD_QUALITY_ALERT,
        payload: { alert: qualityAlert }
      });
      
      eventEmitter.emit('qualityAlertAdded', qualityAlert);
    }, []),
    
    resolveQualityAlert: useCallback((alertId) => {
      dispatch({
        type: QualityActionTypes.RESOLVE_QUALITY_ALERT,
        payload: { alertId }
      });
      
      eventEmitter.emit('qualityAlertResolved', { alertId });
    }, []),
    
    clearQualityAlerts: useCallback(() => {
      dispatch({ type: QualityActionTypes.CLEAR_QUALITY_ALERTS });
    }, []),
    
    // ⚙️ SYSTEM MANAGEMENT ACTIONS
    setLoading: useCallback((isLoading) => {
      dispatch({
        type: QualityActionTypes.SET_LOADING,
        payload: { isLoading }
      });
    }, []),
    
    setError: useCallback((error) => {
      dispatch({
        type: QualityActionTypes.SET_ERROR,
        payload: { error }
      });
    }, []),
    
    clearError: useCallback(() => {
      dispatch({ type: QualityActionTypes.CLEAR_ERROR });
    }, []),
    
    setConnectionStatus: useCallback((isConnected, reconnectAttempts = 0) => {
      dispatch({
        type: QualityActionTypes.SET_CONNECTION_STATUS,
        payload: { isConnected, reconnectAttempts }
      });
    }, []),
    
    // 🗄️ PERFORMANCE OPTIMIZATION ACTIONS
    invalidateCache: useCallback(() => {
      dispatch({ type: QualityActionTypes.INVALIDATE_CACHE });
    }, [])
  };

  // 🎯 Utility Functions
  const calculateExpertTier = useCallback((expertId) => {
    const metrics = state.expertMetrics.get(expertId);
    if (!metrics || !metrics.qualityScore) return null;
    
    const score = metrics.qualityScore;
    const thresholds = state.tierThresholds;
    
    if (score >= thresholds.MASTER) return 'MASTER';
    if (score >= thresholds.SENIOR) return 'SENIOR';
    if (score >= thresholds.STANDARD) return 'STANDARD';
    if (score >= thresholds.DEVELOPING) return 'DEVELOPING';
    return 'PROBATION';
  }, [state.expertMetrics, state.tierThresholds]);

  const loadCachedQualityData = useCallback(() => {
    try {
      const cached = localStorage.getItem('quality_metrics_cache');
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      const cacheAge = Date.now() - new Date(parsed.cachedAt).getTime();
      
      // Only use cache if less than 5 minutes old
      if (cacheAge < 5 * 60 * 1000) {
        return {
          expertMetrics: new Map(parsed.expertMetrics),
          expertTiers: new Map(parsed.expertTiers)
        };
      }
    } catch (error) {
      logger.warn('Failed to load cached quality data', error);
    }
    return null;
  }, []);

  // 🎯 Selector Functions - Optimized data access
  const selectors = {
    
    // Expert Data Selectors
    getExpertMetrics: useCallback((expertId) => {
      return state.expertMetrics.get(expertId) || null;
    }, [state.expertMetrics]),
    
    getExpertTier: useCallback((expertId) => {
      return state.expertTiers.get(expertId) || 'STANDARD';
    }, [state.expertTiers]),
    
    getExpertQualityScore: useCallback((expertId) => {
      const metrics = state.expertMetrics.get(expertId);
      return metrics ? metrics.qualityScore : 4.0; // Default score
    }, [state.expertMetrics]),
    
    // Alert Selectors
    getActiveAlerts: useCallback(() => {
      return state.qualityAlerts.filter(alert => 
        !alert.resolvedAt && alert.timestamp > Date.now() - 24 * 60 * 60 * 1000
      );
    }, [state.qualityAlerts]),
    
    getCriticalAlerts: useCallback(() => {
      return state.qualityAlerts.filter(alert => 
        alert.severity === 'critical' && !alert.resolvedAt
      );
    }, [state.qualityAlerts]),
    
    // Performance Selectors
    getPerformanceTrend: useCallback((expertId) => {
      const trend = state.performanceTrends.get(expertId);
      return trend || { direction: 'stable', change: 0 };
    }, [state.performanceTrends]),
    
    // System Status Selectors
    isDataStale: useCallback(() => {
      if (!state.lastUpdated) return true;
      return Date.now() - state.lastUpdated.getTime() > 5 * 60 * 1000; // 5 minutes
    }, [state.lastUpdated]),
    
    // Bulk Data Selectors
    getAllExpertMetrics: useCallback(() => {
      return Array.from(state.expertMetrics.entries());
    }, [state.expertMetrics]),
    
    getExpertsByTier: useCallback((tier) => {
      return Array.from(state.expertTiers.entries())
        .filter(([_, expertTier]) => expertTier === tier)
        .map(([expertId]) => expertId);
    }, [state.expertTiers])
  };

  // 🎯 Real-time Connection Management
  useEffect(() => {
    if (!isAuthenticated) return;
    
    let reconnectTimeout;
    let isMounted = true;
    
    const setupRealTimeConnection = async (attempt = 0) => {
      try {
        actions.setConnectionStatus(false, attempt);
        
        await qualityService.connectRealTime({
          onExpertMetricsUpdate: (data) => {
            if (isMounted) {
              actions.updateExpertMetrics(data.expertId, data.metrics);
            }
          },
          
          onStudentFeedback: (data) => {
            if (isMounted) {
              actions.updateStudentFeedback(data.sessionId, data.feedback);
            }
          },
          
          onTierChange: (data) => {
            if (isMounted) {
              actions.updateExpertTier(data.expertId, data.tier);
            }
          },
          
          onQualityAlert: (alert) => {
            if (isMounted) {
              actions.addQualityAlert(alert);
            }
          }
        });
        
        if (isMounted) {
          actions.setConnectionStatus(true, 0);
          logger.info('Real-time quality connection established');
        }
        
      } catch (error) {
        if (isMounted) {
          logger.error('Real-time connection failed', error);
          actions.setConnectionStatus(false, attempt + 1);
          
          // Exponential backoff reconnect
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          reconnectTimeout = setTimeout(() => {
            if (isMounted && attempt < 5) {
              setupRealTimeConnection(attempt + 1);
            }
          }, delay);
        }
      }
    };
    
    setupRealTimeConnection();
    
    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      qualityService.disconnectRealTime();
      actions.setConnectionStatus(false, 0);
    };
  }, [isAuthenticated]);

  // 🎯 Initial Data Loading
  useEffect(() => {
    if (isAuthenticated && user) {
      // Load initial quality data for user's experts
      const userExpertIds = user.role === 'expert' ? [user.id] : [];
      actions.loadQualityData(userExpertIds);
    }
  }, [isAuthenticated, user]);

  // 🎯 Auto-cache on updates
  useEffect(() => {
    if (state.lastUpdated && !state.isLoading) {
      const cacheTimer = setTimeout(() => {
        dispatch({ type: QualityActionTypes.CACHE_METRICS });
      }, 1000); // Debounce caching
      
      return () => clearTimeout(cacheTimer);
    }
  }, [state.lastUpdated, state.isLoading]);

  // 🎯 Context Value
  const contextValue = {
    // State
    ...state,
    
    // Actions
    actions,
    
    // Selectors
    selectors,
    
    // Event System
    eventEmitter,
    
    // Service
    qualityService
  };

  return (
    <QualityContext.Provider value={contextValue}>
      {children}
    </QualityContext.Provider>
  );
};

// 🎯 Custom Hook for Quality Context
export const useQuality = () => {
  const context = useContext(QualityContext);
  
  if (!context) {
    throw new Error('useQuality must be used within a QualityProvider');
  }
  
  return context;
};

// 🎯 Specialized Hooks for Common Patterns
export const useExpertQuality = (expertId) => {
  const { selectors, actions, eventEmitter } = useQuality();
  
  const [localMetrics, setLocalMetrics] = React.useState(() => 
    selectors.getExpertMetrics(expertId)
  );
  
  // Real-time updates for specific expert
  useEffect(() => {
    if (!expertId) return;
    
    const handleExpertUpdate = (data) => {
      if (data.expertId === expertId) {
        setLocalMetrics(data.metrics);
      }
    };
    
    eventEmitter.on('expertMetricsUpdated', handleExpertUpdate);
    
    return () => {
      eventEmitter.off('expertMetricsUpdated', handleExpertUpdate);
    };
  }, [expertId, eventEmitter]);
  
  return {
    metrics: localMetrics,
    tier: selectors.getExpertTier(expertId),
    qualityScore: selectors.getExpertQualityScore(expertId),
    refresh: () => actions.loadQualityData([expertId])
  };
};

export const useQualityAlerts = () => {
  const { state, selectors, actions } = useQuality();
  
  return {
    alerts: state.qualityAlerts,
    activeAlerts: selectors.getActiveAlerts(),
    criticalAlerts: selectors.getCriticalAlerts(),
    addAlert: actions.addQualityAlert,
    resolveAlert: actions.resolveQualityAlert,
    clearAlerts: actions.clearQualityAlerts
  };
};

export const useQualityDashboard = () => {
  const { state, selectors, actions } = useQuality();
  
  const dashboardData = React.useMemo(() => {
    const allMetrics = selectors.getAllExpertMetrics();
    const totalExperts = allMetrics.length;
    
    const tierDistribution = {
      MASTER: selectors.getExpertsByTier('MASTER').length,
      SENIOR: selectors.getExpertsByTier('SENIOR').length,
      STANDARD: selectors.getExpertsByTier('STANDARD').length,
      DEVELOPING: selectors.getExpertsByTier('DEVELOPING').length,
      PROBATION: selectors.getExpertsByTier('PROBATION').length
    };
    
    const averageQualityScore = totalExperts > 0 
      ? allMetrics.reduce((sum, [_, metrics]) => sum + (metrics.qualityScore || 0), 0) / totalExperts
      : 0;
    
    return {
      totalExperts,
      tierDistribution,
      averageQualityScore,
      lastUpdated: state.lastUpdated,
      isConnected: state.isConnected
    };
  }, [state.expertMetrics, state.expertTiers, state.lastUpdated, state.isConnected]);
  
  return {
    ...dashboardData,
    refresh: actions.loadQualityData,
    isLoading: state.isLoading
  };
};

export default QualityContext;