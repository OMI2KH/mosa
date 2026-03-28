/**
 * 🎯 MOSA FORGE: Enterprise Progress Tracking Hook
 * 
 * @hook useProgressTracking
 * @description Enterprise-grade learning progress tracking with real-time updates, quality monitoring, and performance analytics
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time progress synchronization
 * - Quality threshold monitoring
 * - Performance analytics & insights
 * - Offline capability with conflict resolution
 * - Multi-phase progress tracking
 * - Automated milestone completion
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { useQualityMetrics } from './use-quality-metrics';
import { useErrorHandler } from './use-error-handler';

// 🏗️ Enterprise Constants
const PROGRESS_STATES = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
  NEEDS_REVIEW: 'needs_review'
};

const PROGRESS_PHASES = {
  MINDSET: 'mindset',
  THEORY: 'theory',
  HANDS_ON: 'hands_on',
  CERTIFICATION: 'certification'
};

const QUALITY_THRESHOLDS = {
  MINIMUM_COMPLETION_RATE: 0.7,
  MAXIMUM_INACTIVITY_DAYS: 7,
  MINIMUM_WEEKLY_PROGRESS: 0.05, // 5% per week
  EXCELLENT_PERFORMANCE: 0.85
};

const CACHE_KEYS = {
  PROGRESS: 'progress',
  MILESTONES: 'milestones',
  ANALYTICS: 'analytics',
  RECOMMENDATIONS: 'recommendations'
};

/**
 * 🏗️ Enterprise Progress Tracking Hook
 * @param {string} enrollmentId - Student enrollment ID
 * @param {Object} options - Configuration options
 * @returns {Object} Progress tracking state and methods
 */
export const useProgressTracking = (enrollmentId, options = {}) => {
  // 🏗️ Hook Dependencies
  const { user } = useAuth();
  const { updateQualityMetrics } = useQualityMetrics();
  const { handleError, captureException } = useErrorHandler();
  const queryClient = useQueryClient();

  // 🏗️ Configuration
  const config = {
    realTimeUpdates: options.realTimeUpdates ?? true,
    offlineSupport: options.offlineSupport ?? true,
    qualityMonitoring: options.qualityMonitoring ?? true,
    analyticsEnabled: options.analyticsEnabled ?? true,
    autoSaveDelay: options.autoSaveDelay ?? 2000, // 2 seconds
    syncInterval: options.syncInterval ?? 30000, // 30 seconds
    retryAttempts: options.retryAttempts ?? 3
  };

  // 🏗️ State Management
  const [progress, setProgress] = useState({
    currentPhase: PROGRESS_PHASES.MINDSET,
    overallProgress: 0,
    phaseProgress: {},
    lastActivity: null,
    streak: 0,
    estimatedCompletion: null
  });

  const [performance, setPerformance] = useState({
    completionRate: 0,
    averageScore: 0,
    timeSpent: 0,
    efficiency: 0,
    qualityScore: 0
  });

  const [milestones, setMilestones] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [offlineQueue, setOfflineQueue] = useState([]);

  // 🏗️ Refs for tracking
  const autoSaveTimeoutRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const activityTrackerRef = useRef({
    startTime: Date.now(),
    activeTime: 0,
    lastAction: null
  });

  // 🏗️ React Query for Server State
  const {
    data: serverProgress,
    isLoading: progressLoading,
    error: progressError,
    refetch: refetchProgress
  } = useQuery({
    queryKey: [CACHE_KEYS.PROGRESS, enrollmentId],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/progress/${enrollmentId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        captureException(error, {
          context: 'fetchProgress',
          enrollmentId,
          userId: user?.id
        });
        throw error;
      }
    },
    enabled: !!enrollmentId && !!user?.token,
    refetchInterval: config.realTimeUpdates ? config.syncInterval : false,
    retry: config.retryAttempts,
    staleTime: 60000 // 1 minute
  });

  // 🏗️ Milestones Query
  const {
    data: serverMilestones,
    isLoading: milestonesLoading
  } = useQuery({
    queryKey: [CACHE_KEYS.MILESTONES, enrollmentId],
    queryFn: async () => {
      const response = await fetch(`/api/milestones/${enrollmentId}`);
      if (!response.ok) throw new Error('Failed to fetch milestones');
      return response.json();
    },
    enabled: !!enrollmentId
  });

  // 🏗️ Progress Mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (progressData) => {
      setIsSyncing(true);
      
      try {
        const response = await fetch(`/api/progress/${enrollmentId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...progressData,
            timestamp: new Date().toISOString(),
            deviceId: await getDeviceId(),
            syncId: generateSyncId()
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        setLastSync(new Date());
        return result;
      } catch (error) {
        // 🏗️ Offline Queue Management
        if (config.offlineSupport && !navigator.onLine) {
          setOfflineQueue(prev => [...prev, {
            type: 'PROGRESS_UPDATE',
            data: progressData,
            timestamp: new Date().toISOString(),
            retryCount: 0
          }]);
        }
        
        captureException(error, {
          context: 'updateProgress',
          enrollmentId,
          progressData
        });
        
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    onSuccess: (data) => {
      // 🏗️ Update local cache
      queryClient.setQueryData(
        [CACHE_KEYS.PROGRESS, enrollmentId],
        data
      );

      // 🏗️ Trigger quality metrics update
      if (config.qualityMonitoring) {
        updateQualityMetrics(enrollmentId, data);
      }

      // 🏗️ Analytics event
      if (config.analyticsEnabled) {
        trackProgressEvent('progress_updated', data);
      }
    },
    onError: (error) => {
      handleError(error, {
        title: 'Sync Failed',
        message: 'Progress will be saved locally and synced later',
        severity: 'warning'
      });
    }
  });

  // 🏗️ Exercise Completion Mutation
  const completeExerciseMutation = useMutation({
    mutationFn: async (exerciseData) => {
      const { exerciseId, score, timeSpent, attempts, metadata } = exerciseData;
      
      const completionData = {
        exerciseId,
        score,
        timeSpent,
        attempts,
        metadata,
        completedAt: new Date().toISOString(),
        phase: progress.currentPhase
      };

      // 🏗️ Update local state immediately for better UX
      const updatedProgress = calculateProgressAfterExercise(
        progress,
        completionData
      );
      
      setProgress(updatedProgress);

      // 🏗️ Schedule auto-save
      scheduleAutoSave(updatedProgress);

      return completionData;
    }
  });

  // 🏗️ Effect for Server State Synchronization
  useEffect(() => {
    if (serverProgress) {
      setProgress(prev => ({
        ...prev,
        ...serverProgress,
        // 🏗️ Conflict resolution: Prefer server state but preserve local unsaved changes
        lastActivity: prev.lastActivity || serverProgress.lastActivity
      }));
    }
  }, [serverProgress]);

  // 🏗️ Effect for Milestones
  useEffect(() => {
    if (serverMilestones) {
      setMilestones(serverMilestones);
      checkMilestoneCompletions(serverMilestones, progress);
    }
  }, [serverMilestones, progress]);

  // 🏗️ Effect for Real-time Updates
  useEffect(() => {
    if (config.realTimeUpdates) {
      syncIntervalRef.current = setInterval(() => {
        handleBackgroundSync();
      }, config.syncInterval);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    }
  }, [config.realTimeUpdates, config.syncInterval]);

  // 🏗️ Effect for Offline Queue Processing
  useEffect(() => {
    if (navigator.onLine && offlineQueue.length > 0) {
      processOfflineQueue();
    }
  }, [navigator.onLine, offlineQueue.length]);

  // 🏗️ Effect for Performance Analytics
  useEffect(() => {
    if (progress.overallProgress > 0) {
      const newPerformance = calculatePerformanceMetrics(progress);
      setPerformance(newPerformance);

      // 🏗️ Check quality thresholds
      checkQualityThresholds(newPerformance);
    }
  }, [progress.overallProgress]);

  /**
   * 🏗️ Schedule Auto-save
   * @param {Object} progressData - Progress data to save
   */
  const scheduleAutoSave = useCallback((progressData) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      updateProgressMutation.mutate(progressData);
    }, config.autoSaveDelay);
  }, [config.autoSaveDelay, updateProgressMutation]);

  /**
   * 🏗️ Handle Background Sync
   */
  const handleBackgroundSync = useCallback(async () => {
    if (isSyncing || !user?.token) return;

    try {
      await refetchProgress();
      setLastSync(new Date());
    } catch (error) {
      captureException(error, {
        context: 'backgroundSync',
        enrollmentId
      });
    }
  }, [isSyncing, user?.token, refetchProgress, enrollmentId]);

  /**
   * 🏗️ Process Offline Queue
   */
  const processOfflineQueue = useCallback(async () => {
    const queue = [...offlineQueue];
    const successfulUpdates = [];
    const failedUpdates = [];

    for (const item of queue) {
      try {
        await updateProgressMutation.mutateAsync(item.data);
        successfulUpdates.push(item);
      } catch (error) {
        if (item.retryCount < config.retryAttempts) {
          failedUpdates.push({
            ...item,
            retryCount: item.retryCount + 1
          });
        } else {
          captureException(error, {
            context: 'offlineQueueItem',
            item,
            enrollmentId
          });
        }
      }
    }

    // 🏗️ Update queue after processing
    setOfflineQueue(failedUpdates);

    // 🏗️ Analytics for offline sync
    if (successfulUpdates.length > 0) {
      trackProgressEvent('offline_sync_completed', {
        successful: successfulUpdates.length,
        failed: failedUpdates.length,
        total: queue.length
      });
    }
  }, [offlineQueue, updateProgressMutation, config.retryAttempts, enrollmentId]);

  /**
   * 🏗️ Complete Exercise
   * @param {Object} exerciseData - Exercise completion data
   */
  const completeExercise = useCallback(async (exerciseData) => {
    try {
      // 🏗️ Update activity tracker
      updateActivityTracker('exercise_completed');

      // 🏗️ Execute completion mutation
      const result = await completeExerciseMutation.mutateAsync(exerciseData);

      // 🏗️ Check for phase completion
      checkPhaseCompletion(progress, exerciseData);

      return result;
    } catch (error) {
      handleError(error, {
        title: 'Exercise Completion Failed',
        message: 'Please try again or continue offline',
        severity: 'error'
      });
      throw error;
    }
  }, [completeExerciseMutation, progress]);

  /**
   * 🏗️ Update Activity Tracker
   * @param {string} action - User action type
   */
  const updateActivityTracker = useCallback((action) => {
    const now = Date.now();
    const tracker = activityTrackerRef.current;

    // 🏗️ Calculate active time since last action
    if (tracker.lastAction) {
      const timeSinceLastAction = now - tracker.lastAction;
      if (timeSinceLastAction < 300000) { // 5 minutes threshold
        tracker.activeTime += timeSinceLastAction;
      }
    }

    tracker.lastAction = now;

    // 🏗️ Update progress with new activity
    setProgress(prev => ({
      ...prev,
      lastActivity: new Date().toISOString(),
      streak: calculateStreak(prev.streak, prev.lastActivity)
    }));
  }, []);

  /**
   * 🏗️ Calculate Progress After Exercise
   * @param {Object} currentProgress - Current progress state
   * @param {Object} exerciseData - Exercise completion data
   * @returns {Object} Updated progress
   */
  const calculateProgressAfterExercise = useCallback((currentProgress, exerciseData) => {
    const { phase, score, timeSpent } = exerciseData;
    
    // 🏗️ Calculate phase progress
    const phaseProgress = {
      ...currentProgress.phaseProgress,
      [phase]: {
        completed: (currentProgress.phaseProgress[phase]?.completed || 0) + 1,
        total: currentProgress.phaseProgress[phase]?.total || 100,
        averageScore: calculateRunningAverage(
          currentProgress.phaseProgress[phase]?.averageScore || 0,
          currentProgress.phaseProgress[phase]?.completed || 0,
          score
        ),
        totalTime: (currentProgress.phaseProgress[phase]?.totalTime || 0) + timeSpent
      }
    };

    // 🏗️ Calculate overall progress
    const overallProgress = calculateOverallProgress(phaseProgress);

    // 🏗️ Update estimated completion
    const estimatedCompletion = calculateEstimatedCompletion(
      overallProgress,
      currentProgress.lastActivity
    );

    return {
      ...currentProgress,
      phaseProgress,
      overallProgress,
      estimatedCompletion,
      lastActivity: new Date().toISOString()
    };
  }, []);

  /**
   * 🏗️ Check Phase Completion
   * @param {Object} currentProgress - Current progress state
   * @param {Object} exerciseData - Exercise completion data
   */
  const checkPhaseCompletion = useCallback((currentProgress, exerciseData) => {
    const { phase } = exerciseData;
    const phaseData = currentProgress.phaseProgress[phase];
    
    if (!phaseData) return;

    const completionRate = phaseData.completed / phaseData.total;
    
    // 🏗️ Check if phase is complete (100% completion required)
    if (completionRate >= 1) {
      completePhase(phase);
    }
  }, []);

  /**
   * 🏗️ Complete Phase
   * @param {string} phase - Phase to complete
   */
  const completePhase = useCallback(async (phase) => {
    try {
      const nextPhase = getNextPhase(phase);
      
      const phaseCompletionData = {
        phase,
        completedAt: new Date().toISOString(),
        nextPhase,
        metadata: {
          exercisesCompleted: progress.phaseProgress[phase]?.completed || 0,
          averageScore: progress.phaseProgress[phase]?.averageScore || 0,
          totalTime: progress.phaseProgress[phase]?.totalTime || 0
        }
      };

      // 🏗️ Update progress with new phase
      setProgress(prev => ({
        ...prev,
        currentPhase: nextPhase,
        phaseProgress: {
          ...prev.phaseProgress,
          [phase]: {
            ...prev.phaseProgress[phase],
            completedAt: new Date().toISOString(),
            status: PROGRESS_STATES.COMPLETED
          }
        }
      }));

      // 🏗️ Send phase completion to server
      await fetch(`/api/progress/${enrollmentId}/phase-completion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(phaseCompletionData)
      });

      // 🏗️ Analytics event
      trackProgressEvent('phase_completed', phaseCompletionData);

    } catch (error) {
      captureException(error, {
        context: 'completePhase',
        phase,
        enrollmentId
      });
    }
  }, [enrollmentId, user?.token, progress.phaseProgress]);

  /**
   * 🏗️ Check Quality Thresholds
   * @param {Object} performanceData - Performance metrics
   */
  const checkQualityThresholds = useCallback((performanceData) => {
    const warnings = [];

    // 🏗️ Check completion rate
    if (performanceData.completionRate < QUALITY_THRESHOLDS.MINIMUM_COMPLETION_RATE) {
      warnings.push({
        type: 'LOW_COMPLETION_RATE',
        message: 'Your completion rate is below the recommended threshold',
        severity: 'warning',
        suggestedAction: 'Focus on completing more exercises'
      });
    }

    // 🏗️ Check inactivity
    const daysInactive = calculateDaysInactive(progress.lastActivity);
    if (daysInactive > QUALITY_THRESHOLDS.MAXIMUM_INACTIVITY_DAYS) {
      warnings.push({
        type: 'INACTIVITY_WARNING',
        message: `You haven't been active for ${daysInactive} days`,
        severity: 'warning',
        suggestedAction: 'Resume your learning journey'
      });
    }

    // 🏗️ Check weekly progress
    const weeklyProgress = calculateWeeklyProgress(progress);
    if (weeklyProgress < QUALITY_THRESHOLDS.MINIMUM_WEEKLY_PROGRESS) {
      warnings.push({
        type: 'SLOW_PROGRESS',
        message: 'Your weekly progress is below the recommended pace',
        severity: 'info',
        suggestedAction: 'Try to complete at least 5% per week'
      });
    }

    // 🏗️ Emit warnings if any
    if (warnings.length > 0) {
      warnings.forEach(warning => {
        trackProgressEvent('quality_warning', warning);
      });
    }
  }, [progress]);

  /**
   * 🏗️ Get Progress Insights
   * @returns {Object} Progress insights and recommendations
   */
  const getProgressInsights = useCallback(() => {
    const insights = {
      strengths: [],
      areasForImprovement: [],
      recommendations: [],
      predictedCompletion: progress.estimatedCompletion
    };

    // 🏗️ Analyze phase performance
    Object.entries(progress.phaseProgress).forEach(([phase, data]) => {
      if (data.averageScore >= 90) {
        insights.strengths.push({
          phase,
          score: data.averageScore,
          message: `Excellent performance in ${phase} phase`
        });
      } else if (data.averageScore < 70) {
        insights.areasForImprovement.push({
          phase,
          score: data.averageScore,
          message: `Consider reviewing ${phase} concepts`
        });
      }
    });

    // 🏗️ Generate recommendations
    if (performance.efficiency < 0.5) {
      insights.recommendations.push({
        type: 'EFFICIENCY',
        message: 'Try to reduce time spent per exercise',
        action: 'practice_more'
      });
    }

    if (performance.streak < 3) {
      insights.recommendations.push({
        type: 'CONSISTENCY',
        message: 'Maintain a consistent learning schedule',
        action: 'set_reminders'
      });
    }

    return insights;
  }, [progress, performance]);

  /**
   * 🏗️ Export Progress Data
   * @returns {Object} Comprehensive progress data for export
   */
  const exportProgressData = useCallback(() => {
    return {
      progress: {
        ...progress,
        serverProgress: serverProgress || null
      },
      performance,
      milestones,
      insights: getProgressInsights(),
      metadata: {
        exportedAt: new Date().toISOString(),
        enrollmentId,
        userId: user?.id,
        version: '1.0.0'
      }
    };
  }, [progress, serverProgress, performance, milestones, getProgressInsights, enrollmentId, user?.id]);

  // 🏗️ Utility Functions

  /**
   * Calculate Overall Progress
   */
  const calculateOverallProgress = (phaseProgress) => {
    const phases = Object.values(phaseProgress);
    if (phases.length === 0) return 0;

    const totalWeight = phases.reduce((sum, phase) => sum + (phase.weight || 1), 0);
    const weightedProgress = phases.reduce((sum, phase) => {
      const progress = phase.completed / phase.total;
      return sum + (progress * (phase.weight || 1));
    }, 0);

    return Math.min(100, (weightedProgress / totalWeight) * 100);
  };

  /**
   * Calculate Performance Metrics
   */
  const calculatePerformanceMetrics = (progressData) => {
    const phases = Object.values(progressData.phaseProgress);
    
    const completionRate = phases.length > 0 
      ? phases.reduce((sum, phase) => sum + (phase.completed / phase.total), 0) / phases.length
      : 0;

    const averageScore = phases.length > 0
      ? phases.reduce((sum, phase) => sum + (phase.averageScore || 0), 0) / phases.length
      : 0;

    const totalTime = phases.reduce((sum, phase) => sum + (phase.totalTime || 0), 0);
    
    const efficiency = totalTime > 0 
      ? (completionRate * 100) / (totalTime / 3600000) // per hour
      : 0;

    return {
      completionRate: Math.round(completionRate * 100),
      averageScore: Math.round(averageScore),
      timeSpent: totalTime,
      efficiency: Math.round(efficiency * 100) / 100,
      qualityScore: calculateQualityScore(completionRate, averageScore, efficiency)
    };
  };

  /**
   * Calculate Quality Score
   */
  const calculateQualityScore = (completionRate, averageScore, efficiency) => {
    return Math.round(
      (completionRate * 0.4) + 
      (averageScore / 100 * 0.4) + 
      (Math.min(efficiency, 2) / 2 * 0.2) * 100
    );
  };

  /**
   * Calculate Streak
   */
  const calculateStreak = (currentStreak, lastActivity) => {
    if (!lastActivity) return 1;
    
    const lastActivityDate = new Date(lastActivity);
    const today = new Date();
    const diffTime = Math.abs(today - lastActivityDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays === 1 ? currentStreak + 1 : 1;
  };

  /**
   * Get Next Phase
   */
  const getNextPhase = (currentPhase) => {
    const phaseOrder = [
      PROGRESS_PHASES.MINDSET,
      PROGRESS_PHASES.THEORY,
      PROGRESS_PHASES.HANDS_ON,
      PROGRESS_PHASES.CERTIFICATION
    ];

    const currentIndex = phaseOrder.indexOf(currentPhase);
    return currentIndex < phaseOrder.length - 1 ? phaseOrder[currentIndex + 1] : null;
  };

  /**
   * Generate Sync ID
   */
  const generateSyncId = () => {
    return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Get Device ID
   */
  const getDeviceId = async () => {
    // Implementation for device identification
    return localStorage.getItem('deviceId') || `device_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Track Progress Event
   */
  const trackProgressEvent = (event, data) => {
    if (config.analyticsEnabled) {
      // Integrate with analytics service
      console.log('Progress Event:', event, data);
    }
  };

  // 🏗️ Hook Return Value
  return {
    // 🎯 State
    progress,
    performance,
    milestones,
    isSyncing,
    lastSync,
    isLoading: progressLoading || milestonesLoading,
    error: progressError,

    // 🎯 Actions
    completeExercise,
    updateProgress: updateProgressMutation.mutate,
    refetchProgress,
    exportProgressData,

    // 🎯 Insights
    insights: getProgressInsights(),
    recommendations: getProgressInsights().recommendations,

    // 🎯 Utilities
    getProgressForPhase: (phase) => progress.phaseProgress[phase] || {},
    getCurrentPhase: () => progress.currentPhase,
    getOverallProgress: () => progress.overallProgress,
    getEstimatedCompletion: () => progress.estimatedCompletion,

    // 🎯 Quality Monitoring
    qualityStatus: {
      isOnTrack: performance.completionRate >= QUALITY_THRESHOLDS.MINIMUM_COMPLETION_RATE,
      needsAttention: performance.completionRate < QUALITY_THRESHOLDS.MINIMUM_COMPLETION_RATE,
      isExcellent: performance.qualityScore >= QUALITY_THRESHOLDS.EXCELLENT_PERFORMANCE * 100
    }
  };
};

// 🏗️ Export Constants for External Use
export {
  PROGRESS_STATES,
  PROGRESS_PHASES,
  QUALITY_THRESHOLDS
};

// 🏗️ Export Utility Functions
export const ProgressUtils = {
  calculateOverallProgress,
  calculatePerformanceMetrics,
  calculateQualityScore,
  calculateStreak
};