/**
 * 🎯 MOSA FORGE: Enterprise Enrollment Context
 * 
 * @module EnrollmentContext
 * @description Global state management for student enrollment lifecycle
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Multi-course enrollment management
 * - Real-time progress synchronization
 * - Quality guarantee state tracking
 * - Payment status monitoring
 * - Expert matching state management
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './auth-context';
import { useQuality } from './quality-context';
import { usePayment } from './payment-context';

// 🏗️ Enterprise Constants
const ENROLLMENT_STATES = {
  IDLE: 'idle',
  INITIATING: 'initiating',
  VALIDATING: 'validating',
  PAYMENT_VERIFYING: 'payment_verifying',
  EXPERT_MATCHING: 'expert_matching',
  QUALITY_CHECKING: 'quality_checking',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused',
  ERROR: 'error'
};

const ENROLLMENT_PHASES = {
  MINDSET: 'mindset',
  THEORY: 'theory',
  HANDS_ON: 'hands_on',
  CERTIFICATION: 'certification'
};

const ENROLLMENT_ACTIONS = {
  INITIATE_ENROLLMENT: 'INITIATE_ENROLLMENT',
  VALIDATION_SUCCESS: 'VALIDATION_SUCCESS',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  PAYMENT_VERIFIED: 'PAYMENT_VERIFIED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  EXPERT_MATCHED: 'EXPERT_MATCHED',
  EXPERT_MATCHING_FAILED: 'EXPERT_MATCHING_FAILED',
  QUALITY_CHECK_PASSED: 'QUALITY_CHECK_PASSED',
  QUALITY_CHECK_FAILED: 'QUALITY_CHECK_FAILED',
  ENROLLMENT_COMPLETED: 'ENROLLMENT_COMPLETED',
  ENROLLMENT_FAILED: 'ENROLLMENT_FAILED',
  UPDATE_PROGRESS: 'UPDATE_PROGRESS',
  PHASE_ADVANCED: 'PHASE_ADVANCED',
  COURSE_COMPLETED: 'COURSE_COMPLETED',
  COURSE_CANCELLED: 'COURSE_CANCELLED',
  QUALITY_ISSUE_DETECTED: 'QUALITY_ISSUE_DETECTED',
  EXPERT_SWITCH_INITIATED: 'EXPERT_SWITCH_INITIATED',
  EXPERT_SWITCH_COMPLETED: 'EXPERT_SWITCH_COMPLETED',
  SYNC_ENROLLMENTS: 'SYNC_ENROLLMENTS',
  RESET_ENROLLMENT: 'RESET_ENROLLMENT'
};

const ERROR_CODES = {
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  EXPERT_UNAVAILABLE: 'EXPERT_UNAVAILABLE',
  QUALITY_THRESHOLD: 'QUALITY_THRESHOLD',
  DUPLICATE_ENROLLMENT: 'DUPLICATE_ENROLLMENT',
  CAPACITY_EXCEEDED: 'CAPACITY_EXCEEDED',
  STUDENT_INELIGIBLE: 'STUDENT_INELIGIBLE',
  SKILL_UNAVAILABLE: 'SKILL_UNAVAILABLE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR'
};

/**
 * 🏗️ Enrollment State Reducer
 */
const enrollmentReducer = (state, action) => {
  switch (action.type) {
    case ENROLLMENT_ACTIONS.INITIATE_ENROLLMENT:
      return {
        ...state,
        currentEnrollment: {
          ...action.payload,
          status: ENROLLMENT_STATES.INITIATING,
          phase: ENROLLMENT_PHASES.MINDSET,
          progress: 0,
          startedAt: new Date().toISOString(),
          errors: []
        },
        isLoading: true,
        error: null
      };

    case ENROLLMENT_ACTIONS.VALIDATION_SUCCESS:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          status: ENROLLMENT_STATES.VALIDATING,
          validation: { ...action.payload, isValid: true }
        }
      };

    case ENROLLMENT_ACTIONS.VALIDATION_FAILED:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          status: ENROLLMENT_STATES.ERROR,
          errors: [...(state.currentEnrollment?.errors || []), action.payload]
        },
        isLoading: false,
        error: action.payload
      };

    case ENROLLMENT_ACTIONS.PAYMENT_VERIFIED:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          status: ENROLLMENT_STATES.PAYMENT_VERIFYING,
          payment: {
            ...action.payload,
            isVerified: true,
            verifiedAt: new Date().toISOString()
          }
        }
      };

    case ENROLLMENT_ACTIONS.PAYMENT_FAILED:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          status: ENROLLMENT_STATES.ERROR,
          errors: [...(state.currentEnrollment?.errors || []), action.payload]
        },
        isLoading: false,
        error: action.payload
      };

    case ENROLLMENT_ACTIONS.EXPERT_MATCHED:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          status: ENROLLMENT_STATES.EXPERT_MATCHING,
          expert: {
            ...action.payload.expert,
            matchedAt: new Date().toISOString(),
            matchScore: action.payload.matchScore
          }
        }
      };

    case ENROLLMENT_ACTIONS.EXPERT_MATCHING_FAILED:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          status: ENROLLMENT_STATES.ERROR,
          errors: [...(state.currentEnrollment?.errors || []), action.payload]
        },
        isLoading: false,
        error: action.payload
      };

    case ENROLLMENT_ACTIONS.QUALITY_CHECK_PASSED:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          status: ENROLLMENT_STATES.QUALITY_CHECKING,
          qualityCheck: {
            ...action.payload,
            passedAt: new Date().toISOString(),
            isPassed: true
          }
        }
      };

    case ENROLLMENT_ACTIONS.QUALITY_CHECK_FAILED:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          status: ENROLLMENT_STATES.ERROR,
          errors: [...(state.currentEnrollment?.errors || []), action.payload]
        },
        isLoading: false,
        error: action.payload
      };

    case ENROLLMENT_ACTIONS.ENROLLMENT_COMPLETED:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          ...action.payload,
          status: ENROLLMENT_STATES.ACTIVE,
          enrolledAt: new Date().toISOString()
        },
        enrollments: [...state.enrollments, { ...state.currentEnrollment, ...action.payload }],
        isLoading: false,
        error: null
      };

    case ENROLLMENT_ACTIONS.ENROLLMENT_FAILED:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          status: ENROLLMENT_STATES.ERROR,
          errors: [...(state.currentEnrollment?.errors || []), action.payload],
          failedAt: new Date().toISOString()
        },
        isLoading: false,
        error: action.payload
      };

    case ENROLLMENT_ACTIONS.UPDATE_PROGRESS:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          progress: action.payload.progress,
          lastActivity: new Date().toISOString(),
          currentPhase: action.payload.phase || state.currentEnrollment.currentPhase,
          metrics: {
            ...state.currentEnrollment.metrics,
            ...action.payload.metrics
          }
        }
      };

    case ENROLLMENT_ACTIONS.PHASE_ADVANCED:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          currentPhase: action.payload.phase,
          phaseStartedAt: new Date().toISOString(),
          progress: 0, // Reset progress for new phase
          previousPhase: state.currentEnrollment.currentPhase
        }
      };

    case ENROLLMENT_ACTIONS.COURSE_COMPLETED:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          status: ENROLLMENT_STATES.COMPLETED,
          completedAt: new Date().toISOString(),
          progress: 100,
          certificate: action.payload.certificate
        },
        enrollments: state.enrollments.map(enrollment =>
          enrollment.id === state.currentEnrollment.id
            ? { ...enrollment, status: ENROLLMENT_STATES.COMPLETED, completedAt: new Date().toISOString() }
            : enrollment
        )
      };

    case ENROLLMENT_ACTIONS.COURSE_CANCELLED:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          status: ENROLLMENT_STATES.CANCELLED,
          cancelledAt: new Date().toISOString(),
          cancellationReason: action.payload.reason
        },
        enrollments: state.enrollments.map(enrollment =>
          enrollment.id === state.currentEnrollment.id
            ? { ...enrollment, status: ENROLLMENT_STATES.CANCELLED }
            : enrollment
        )
      };

    case ENROLLMENT_ACTIONS.QUALITY_ISSUE_DETECTED:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          qualityIssues: [...(state.currentEnrollment.qualityIssues || []), action.payload],
          requiresExpertSwitch: action.payload.severity === 'HIGH'
        },
        showQualityAlert: true
      };

    case ENROLLMENT_ACTIONS.EXPERT_SWITCH_INITIATED:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          status: ENROLLMENT_STATES.EXPERT_MATCHING,
          previousExpert: state.currentEnrollment.expert,
          expert: null,
          isSwitchingExpert: true
        }
      };

    case ENROLLMENT_ACTIONS.EXPERT_SWITCH_COMPLETED:
      return {
        ...state,
        currentEnrollment: {
          ...state.currentEnrollment,
          status: ENROLLMENT_STATES.ACTIVE,
          expert: action.payload.expert,
          previousExpert: state.currentEnrollment.previousExpert,
          isSwitchingExpert: false,
          expertSwitchedAt: new Date().toISOString()
        }
      };

    case ENROLLMENT_ACTIONS.SYNC_ENROLLMENTS:
      return {
        ...state,
        enrollments: action.payload.enrollments,
        lastSynced: new Date().toISOString()
      };

    case ENROLLMENT_ACTIONS.RESET_ENROLLMENT:
      return {
        ...state,
        currentEnrollment: null,
        isLoading: false,
        error: null
      };

    default:
      return state;
  }
};

/**
 * 🏗️ Initial State
 */
const initialState = {
  // Current active enrollment process
  currentEnrollment: null,
  
  // All user enrollments
  enrollments: [],
  
  // UI state
  isLoading: false,
  error: null,
  
  // Multi-course management
  activeEnrollmentId: null,
  
  // Sync state
  lastSynced: null,
  isSyncing: false,
  
  // Quality monitoring
  showQualityAlert: false,
  qualityIssues: [],
  
  // Performance metrics
  metrics: {
    totalEnrollments: 0,
    completedEnrollments: 0,
    successRate: 0,
    averageCompletionTime: 0
  }
};

/**
 * 🏗️ Enrollment Context Creation
 */
const EnrollmentContext = createContext();

/**
 * 🏗️ Enrollment Provider Component
 */
export function EnrollmentProvider({ children }) {
  const [state, dispatch] = useReducer(enrollmentReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const { trackQualityEvent, getQualityMetrics } = useQuality();
  const { verifyPayment, getPaymentStatus } = usePayment();
  const queryClient = useQueryClient();

  /**
   * 🎯 Enterprise Enrollment Initialization
   */
  const initiateEnrollment = useCallback(async (enrollmentData) => {
    if (!isAuthenticated) {
      throw new Error('Authentication required for enrollment');
    }

    const enrollmentId = `enr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const initialEnrollment = {
      id: enrollmentId,
      studentId: user.id,
      skillId: enrollmentData.skillId,
      skillName: enrollmentData.skillName,
      bundleId: enrollmentData.bundleId,
      paymentId: enrollmentData.paymentId,
      status: ENROLLMENT_STATES.INITIATING,
      phase: ENROLLMENT_PHASES.MINDSET,
      progress: 0,
      startedAt: new Date().toISOString(),
      metadata: {
        bundleType: 'STANDARD_1999',
        revenueSplit: { mosa: 1000, expert: 999 },
        payoutSchedule: [
          { phase: 'START', amount: 333, paid: false },
          { phase: 'MIDPOINT', amount: 333, paid: false },
          { phase: 'COMPLETION', amount: 333, paid: false }
        ]
      }
    };

    dispatch({
      type: ENROLLMENT_ACTIONS.INITIATE_ENROLLMENT,
      payload: initialEnrollment
    });

    try {
      // 🏗️ Enterprise Validation Chain
      await validateEnrollmentData(initialEnrollment);
      dispatch({ type: ENROLLMENT_ACTIONS.VALIDATION_SUCCESS, payload: { validatedAt: new Date().toISOString() } });

      // 🏗️ Payment Verification
      const paymentVerification = await verifyPayment(initialEnrollment.paymentId);
      dispatch({ type: ENROLLMENT_ACTIONS.PAYMENT_VERIFIED, payload: paymentVerification });

      // 🏗️ Expert Matching
      const expertMatch = await findQualifiedExpert(initialEnrollment.skillId);
      dispatch({ type: ENROLLMENT_ACTIONS.EXPERT_MATCHED, payload: expertMatch });

      // 🏗️ Quality Check
      const qualityCheck = await validateExpertQuality(expertMatch.expert.id);
      dispatch({ type: ENROLLMENT_ACTIONS.QUALITY_CHECK_PASSED, payload: qualityCheck });

      // 🏗️ Complete Enrollment
      const completedEnrollment = await completeEnrollmentProcess({
        ...initialEnrollment,
        expertId: expertMatch.expert.id,
        expertName: expertMatch.expert.name,
        expertTier: expertMatch.expert.tier
      });

      dispatch({
        type: ENROLLMENT_ACTIONS.ENROLLMENT_COMPLETED,
        payload: completedEnrollment
      });

      // 🏗️ Track Quality Event
      trackQualityEvent('ENROLLMENT_COMPLETED', {
        enrollmentId: initialEnrollment.id,
        skillId: initialEnrollment.skillId,
        expertId: expertMatch.expert.id,
        studentId: user.id
      });

      return completedEnrollment;

    } catch (error) {
      console.error('Enrollment process failed:', error);
      
      const errorPayload = {
        code: error.code || ERROR_CODES.SYSTEM_ERROR,
        message: error.message,
        timestamp: new Date().toISOString(),
        enrollmentId: initialEnrollment.id
      };

      dispatch({
        type: ENROLLMENT_ACTIONS.ENROLLMENT_FAILED,
        payload: errorPayload
      });

      // 🏗️ Track Quality Event for Failure
      trackQualityEvent('ENROLLMENT_FAILED', {
        enrollmentId: initialEnrollment.id,
        error: error.code,
        reason: error.message
      });

      throw error;
    }
  }, [isAuthenticated, user, trackQualityEvent, verifyPayment]);

  /**
   * 🏗️ Enrollment Data Validation
   */
  const validateEnrollmentData = async (enrollment) => {
    try {
      const response = await fetch('/api/enrollment/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(enrollment)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Validation failed');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Validation failed: ${error.message}`);
    }
  };

  /**
   * 🏗️ Qualified Expert Matching
   */
  const findQualifiedExpert = async (skillId) => {
    try {
      const response = await fetch('/api/experts/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ skillId, studentId: user.id })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Expert matching failed');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Expert matching failed: ${error.message}`);
    }
  };

  /**
   * 🏗️ Expert Quality Validation
   */
  const validateExpertQuality = async (expertId) => {
    try {
      const qualityMetrics = await getQualityMetrics(expertId);
      
      if (qualityMetrics.overallScore < 4.0) {
        throw new Error('Expert does not meet quality requirements');
      }

      if (qualityMetrics.completionRate < 0.7) {
        throw new Error('Expert completion rate below threshold');
      }

      return {
        expertId,
        overallScore: qualityMetrics.overallScore,
        completionRate: qualityMetrics.completionRate,
        averageRating: qualityMetrics.averageRating,
        isValid: true
      };
    } catch (error) {
      throw new Error(`Quality validation failed: ${error.message}`);
    }
  };

  /**
   * 🏗️ Complete Enrollment Process
   */
  const completeEnrollmentProcess = async (enrollmentData) => {
    try {
      const response = await fetch('/api/enrollment/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(enrollmentData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Enrollment completion failed');
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Enrollment completion failed: ${error.message}`);
    }
  };

  /**
   * 🎯 Update Enrollment Progress
   */
  const updateProgress = useCallback((progressData) => {
    dispatch({
      type: ENROLLMENT_ACTIONS.UPDATE_PROGRESS,
      payload: progressData
    });

    // 🏗️ Sync with backend
    syncProgressWithBackend(progressData);
  }, []);

  /**
   * 🎯 Advance to Next Phase
   */
  const advanceToNextPhase = useCallback((nextPhase) => {
    dispatch({
      type: ENROLLMENT_ACTIONS.PHASE_ADVANCED,
      payload: { phase: nextPhase }
    });

    // 🏗️ Track phase advancement
    trackQualityEvent('PHASE_ADVANCED', {
      enrollmentId: state.currentEnrollment?.id,
      fromPhase: state.currentEnrollment?.currentPhase,
      toPhase: nextPhase,
      studentId: user.id
    });
  }, [state.currentEnrollment, user.id, trackQualityEvent]);

  /**
   * 🎯 Complete Course
   */
  const completeCourse = useCallback(async (certificateData) => {
    try {
      const response = await fetch('/api/enrollment/complete-course', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          enrollmentId: state.currentEnrollment.id,
          certificateData
        })
      });

      if (!response.ok) {
        throw new Error('Course completion failed');
      }

      const result = await response.json();

      dispatch({
        type: ENROLLMENT_ACTIONS.COURSE_COMPLETED,
        payload: { certificate: result.certificate }
      });

      // 🏗️ Track completion event
      trackQualityEvent('COURSE_COMPLETED', {
        enrollmentId: state.currentEnrollment.id,
        skillId: state.currentEnrollment.skillId,
        duration: result.duration,
        studentId: user.id
      });

    } catch (error) {
      console.error('Course completion failed:', error);
      throw error;
    }
  }, [state.currentEnrollment, user, trackQualityEvent]);

  /**
   * 🎯 Cancel Enrollment
   */
  const cancelEnrollment = useCallback(async (reason) => {
    try {
      const response = await fetch('/api/enrollment/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          enrollmentId: state.currentEnrollment.id,
          reason
        })
      });

      if (!response.ok) {
        throw new Error('Enrollment cancellation failed');
      }

      dispatch({
        type: ENROLLMENT_ACTIONS.COURSE_CANCELLED,
        payload: { reason }
      });

      // 🏗️ Track cancellation event
      trackQualityEvent('ENROLLMENT_CANCELLED', {
        enrollmentId: state.currentEnrollment.id,
        reason,
        studentId: user.id
      });

    } catch (error) {
      console.error('Enrollment cancellation failed:', error);
      throw error;
    }
  }, [state.currentEnrollment, user, trackQualityEvent]);

  /**
   * 🎯 Initiate Expert Switch (Quality Guarantee)
   */
  const initiateExpertSwitch = useCallback(async (reason) => {
    dispatch({ type: ENROLLMENT_ACTIONS.EXPERT_SWITCH_INITIATED });

    try {
      const newExpert = await findQualifiedExpert(state.currentEnrollment.skillId);
      
      dispatch({
        type: ENROLLMENT_ACTIONS.EXPERT_SWITCH_COMPLETED,
        payload: { expert: newExpert.expert }
      });

      // 🏗️ Track expert switch
      trackQualityEvent('EXPERT_SWITCHED', {
        enrollmentId: state.currentEnrollment.id,
        fromExpert: state.currentEnrollment.expert.id,
        toExpert: newExpert.expert.id,
        reason,
        studentId: user.id
      });

    } catch (error) {
      console.error('Expert switch failed:', error);
      
      // Revert to previous state
      dispatch({
        type: ENROLLMENT_ACTIONS.EXPERT_SWITCH_COMPLETED,
        payload: { expert: state.currentEnrollment.previousExpert }
      });
      
      throw error;
    }
  }, [state.currentEnrollment, user, trackQualityEvent]);

  /**
   * 🎯 Sync Enrollments with Backend
   */
  const syncEnrollments = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch('/api/enrollment/user-enrollments', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        const enrollments = await response.json();
        
        dispatch({
          type: ENROLLMENT_ACTIONS.SYNC_ENROLLMENTS,
          payload: { enrollments }
        });

        // 🏗️ Update React Query cache
        queryClient.setQueryData(['enrollments', user.id], enrollments);
      }
    } catch (error) {
      console.error('Enrollment sync failed:', error);
    }
  }, [isAuthenticated, user, queryClient]);

  /**
   * 🎯 Reset Current Enrollment
   */
  const resetEnrollment = useCallback(() => {
    dispatch({ type: ENROLLMENT_ACTIONS.RESET_ENROLLMENT });
  }, []);

  /**
   * 🏗️ Progress Sync with Backend
   */
  const syncProgressWithBackend = async (progressData) => {
    try {
      await fetch('/api/enrollment/progress', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          enrollmentId: state.currentEnrollment.id,
          ...progressData
        })
      });
    } catch (error) {
      console.error('Progress sync failed:', error);
    }
  };

  /**
   * 🏗️ React Query for Enrollment Data
   */
  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['enrollments', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/enrollment/user-enrollments', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch enrollments');
      return response.json();
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });

  /**
   * 🏗️ Effect for Initial Data Sync
   */
  useEffect(() => {
    if (isAuthenticated && enrollmentsData) {
      dispatch({
        type: ENROLLMENT_ACTIONS.SYNC_ENROLLMENTS,
        payload: { enrollments: enrollmentsData }
      });
    }
  }, [isAuthenticated, enrollmentsData]);

  /**
   * 🏗️ Effect for Periodic Sync
   */
  useEffect(() => {
    if (!isAuthenticated) return;

    const syncInterval = setInterval(syncEnrollments, 30000); // Sync every 30 seconds

    return () => clearInterval(syncInterval);
  }, [isAuthenticated, syncEnrollments]);

  /**
   * 🏗️ Context Value
   */
  const contextValue = {
    // State
    ...state,
    
    // Actions
    initiateEnrollment,
    updateProgress,
    advanceToNextPhase,
    completeCourse,
    cancelEnrollment,
    initiateExpertSwitch,
    syncEnrollments,
    resetEnrollment,
    
    // Derived State
    activeEnrollment: state.enrollments.find(e => e.id === state.activeEnrollmentId) || state.currentEnrollment,
    mindsetEnrollment: state.enrollments.find(e => e.phase === ENROLLMENT_PHASES.MINDSET),
    theoryEnrollment: state.enrollments.find(e => e.phase === ENROLLMENT_PHASES.THEORY),
    handsOnEnrollment: state.enrollments.find(e => e.phase === ENROLLMENT_PHASES.HANDS_ON),
    
    // Status Helpers
    isEnrolling: state.isLoading,
    hasActiveEnrollment: state.enrollments.some(e => e.status === ENROLLMENT_STATES.ACTIVE),
    hasCompletedEnrollment: state.enrollments.some(e => e.status === ENROLLMENT_STATES.COMPLETED),
    
    // Constants
    ENROLLMENT_STATES,
    ENROLLMENT_PHASES,
    ERROR_CODES
  };

  return (
    <EnrollmentContext.Provider value={contextValue}>
      {children}
    </EnrollmentContext.Provider>
  );
}

/**
 * 🏗️ Custom Hook for Enrollment Context
 */
export function useEnrollment() {
  const context = useContext(EnrollmentContext);
  
  if (!context) {
    throw new Error('useEnrollment must be used within an EnrollmentProvider');
  }
  
  return context;
}

/**
 * 🏗️ Enrollment Status Helper Hook
 */
export function useEnrollmentStatus(enrollmentId) {
  const { enrollments } = useEnrollment();
  
  return enrollments.find(enrollment => enrollment.id === enrollmentId) || null;
}

/**
 * 🏗️ Multi-Course Management Hook
 */
export function useMultiCourseManagement() {
  const { enrollments, updateProgress, advanceToNextPhase } = useEnrollment();
  
  const activeEnrollments = enrollments.filter(
    e => e.status === ENROLLMENT_STATES.ACTIVE
  );
  
  const completedEnrollments = enrollments.filter(
    e => e.status === ENROLLMENT_STATES.COMPLETED
  );
  
  const switchActiveCourse = useCallback((enrollmentId) => {
    // Implementation for switching between active courses
  }, []);
  
  return {
    activeEnrollments,
    completedEnrollments,
    totalEnrollments: enrollments.length,
    switchActiveCourse,
    canEnrollInNewCourse: activeEnrollments.length < 3 // Limit to 3 active courses
  };
}

export default EnrollmentContext;