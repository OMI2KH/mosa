// hooks/use-expert-performance.js

/**
 * 🎯 ENTERPRISE EXPERT PERFORMANCE HOOK
 * Production-ready React hook for real-time expert performance tracking
 * Features: Quality metrics, tier calculations, real-time updates, performance analytics
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { useWebSocket } from './use-websocket';
import { Logger } from '../utils/logger';
import { PerformanceCalculator } from '../utils/performance-calculator';
import { EventEmitter } from 'events';

// 🎯 Performance event emitter for real-time updates
const performanceEmitter = new EventEmitter();
performanceEmitter.setMaxListeners(100);

export const useExpertPerformance = (expertId, options = {}) => {
  const {
    enabled = true,
    realTime = true,
    refreshInterval = 30000, // 30 seconds
    deepAnalytics = false
  } = options;

  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const logger = useRef(new Logger('useExpertPerformance'));
  const calculator = useRef(new PerformanceCalculator());
  
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState([]);
  const [qualityAlerts, setQualityAlerts] = useState([]);

  // 🎯 WebSocket for real-time performance updates
  const { lastMessage, sendMessage, connectionStatus } = useWebSocket(
    realTime ? `/ws/experts/${expertId}/performance` : null
  );

  /**
   * 🎯 MAIN PERFORMANCE QUERY
   */
  const {
    data: expertPerformance,
    error,
    isLoading,
    isFetching,
    refetch,
    isError
  } = useQuery({
    queryKey: ['expert-performance', expertId, deepAnalytics],
    queryFn: async () => {
      logger.current.info('Fetching expert performance data', { expertId, deepAnalytics });

      const response = await fetch(`/api/experts/${expertId}/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          includeDeepAnalytics: deepAnalytics,
          timeRange: '90d',
          metrics: [
            'qualityScore',
            'completionRate', 
            'studentSatisfaction',
            'responseTime',
            'revenueMetrics',
            'tierProgress'
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch expert performance');
      }

      const data = await response.json();
      
      // 🎯 Calculate derived metrics
      const enhancedData = calculator.current.enhancePerformanceData(data);
      
      // 🎯 Check for quality alerts
      const alerts = calculateQualityAlerts(enhancedData);
      if (alerts.length > 0) {
        setQualityAlerts(alerts);
        performanceEmitter.emit('qualityAlerts', alerts);
      }

      return enhancedData;
    },
    enabled: enabled && isAuthenticated && !!expertId,
    refetchInterval: realTime ? refreshInterval : false,
    staleTime: 60000, // 1 minute
    retry: (failureCount, error) => {
      // Don't retry on 404 or 403 errors
      if (error.message.includes('404') || error.message.includes('403')) {
        return false;
      }
      return failureCount < 3;
    },
    onSuccess: (data) => {
      logger.current.debug('Expert performance data fetched successfully', {
        expertId,
        qualityScore: data.qualityScore,
        currentTier: data.currentTier
      });
      
      setPerformanceMetrics(data);
      performanceEmitter.emit('performanceUpdated', data);
    },
    onError: (error) => {
      logger.current.error('Failed to fetch expert performance', error, { expertId });
      performanceEmitter.emit('performanceError', error);
    }
  });

  /**
   * 🎯 REAL-TIME PERFORMANCE UPDATES
   */
  useEffect(() => {
    if (!realTime || !lastMessage) return;

    try {
      const update = JSON.parse(lastMessage.data);
      
      if (update.type === 'PERFORMANCE_UPDATE') {
        logger.current.debug('Real-time performance update received', update);
        
        setRealTimeUpdates(prev => [update, ...prev.slice(0, 9)]); // Keep last 10 updates
        
        // 🎯 Optimistically update performance metrics
        if (performanceMetrics) {
          const updatedMetrics = calculator.current.applyRealTimeUpdate(
            performanceMetrics, 
            update
          );
          setPerformanceMetrics(updatedMetrics);
        }

        // 🎯 Trigger query invalidation for background refresh
        queryClient.invalidateQueries(['expert-performance', expertId]);
        
        performanceEmitter.emit('realTimeUpdate', update);
      }

      if (update.type === 'QUALITY_ALERT') {
        logger.current.warn('Quality alert received', update);
        setQualityAlerts(prev => [update.alert, ...prev]);
        performanceEmitter.emit('qualityAlert', update.alert);
      }

    } catch (error) {
      logger.current.error('Failed to process real-time update', error, { lastMessage });
    }
  }, [lastMessage, realTime, expertId, queryClient, performanceMetrics]);

  /**
   * 🎯 PERFORMANCE MUTATIONS
   */
  
  // 🎯 Refresh performance data
  const refreshPerformance = useMutation({
    mutationFn: async (forceRefresh = false) => {
      logger.current.info('Manual performance refresh triggered', { expertId, forceRefresh });
      
      if (forceRefresh) {
        // Clear cache and refetch
        queryClient.removeQueries(['expert-performance', expertId]);
      }
      
      return refetch();
    },
    onSuccess: () => {
      logger.current.debug('Performance refresh completed', { expertId });
      performanceEmitter.emit('performanceRefreshed');
    },
    onError: (error) => {
      logger.current.error('Performance refresh failed', error, { expertId });
    }
  });

  // 🎯 Update performance goals
  const updatePerformanceGoals = useMutation({
    mutationFn: async (goals) => {
      logger.current.info('Updating performance goals', { expertId, goals });

      const response = await fetch(`/api/experts/${expertId}/performance/goals`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          goals,
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update performance goals');
      }

      return response.json();
    },
    onSuccess: (updatedData) => {
      logger.current.debug('Performance goals updated successfully', { expertId });
      
      // 🎯 Update local state optimistically
      setPerformanceMetrics(prev => ({
        ...prev,
        performanceGoals: updatedData.goals
      }));

      queryClient.invalidateQueries(['expert-performance', expertId]);
      performanceEmitter.emit('goalsUpdated', updatedData);
    },
    onError: (error) => {
      logger.current.error('Failed to update performance goals', error, { expertId });
    }
  });

  // 🎯 Acknowledge quality alert
  const acknowledgeQualityAlert = useMutation({
    mutationFn: async (alertId) => {
      logger.current.info('Acknowledging quality alert', { expertId, alertId });

      const response = await fetch(`/api/experts/${expertId}/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge quality alert');
      }

      return response.json();
    },
    onSuccess: (data) => {
      logger.current.debug('Quality alert acknowledged', { alertId: data.alertId });
      
      // 🎯 Remove from local state
      setQualityAlerts(prev => prev.filter(alert => alert.id !== data.alertId));
      performanceEmitter.emit('alertAcknowledged', data.alertId);
    },
    onError: (error) => {
      logger.current.error('Failed to acknowledge quality alert', error, { expertId });
    }
  });

  /**
   * 🎯 CALCULATED PERFORMANCE METRICS
   */
  const calculatedMetrics = useCallback(() => {
    if (!performanceMetrics) return null;

    return {
      // 🎯 Core Metrics
      ...performanceMetrics,
      
      // 🎯 Derived Metrics
      tierProgress: calculator.current.calculateTierProgress(performanceMetrics),
      nextTierRequirements: calculator.current.getNextTierRequirements(performanceMetrics),
      performanceTrend: calculator.current.calculatePerformanceTrend(performanceMetrics),
      revenuePotential: calculator.current.calculateRevenuePotential(performanceMetrics),
      capacityUtilization: calculator.current.calculateCapacityUtilization(performanceMetrics),
      
      // 🎯 Quality Indicators
      qualityHealth: calculator.current.assessQualityHealth(performanceMetrics),
      improvementAreas: calculator.current.identifyImprovementAreas(performanceMetrics),
      strengths: calculator.current.identifyStrengths(performanceMetrics),
      
      // 🎯 Risk Assessment
      riskLevel: calculator.current.assessRiskLevel(performanceMetrics),
      retentionProbability: calculator.current.calculateRetentionProbability(performanceMetrics)
    };
  }, [performanceMetrics]);

  /**
   * 🎯 PERFORMANCE ACTIONS
   */
  
  // 🎯 Request performance review
  const requestPerformanceReview = useCallback(async () => {
    logger.current.info('Requesting performance review', { expertId });

    try {
      const response = await fetch(`/api/experts/${expertId}/performance/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to request performance review');
      }

      performanceEmitter.emit('reviewRequested');
      return await response.json();
    } catch (error) {
      logger.current.error('Failed to request performance review', error, { expertId });
      throw error;
    }
  }, [expertId, user?.token]);

  // 🎯 Export performance data
  const exportPerformanceData = useCallback(async (format = 'json') => {
    logger.current.info('Exporting performance data', { expertId, format });

    try {
      const response = await fetch(
        `/api/experts/${expertId}/performance/export?format=${format}`,
        {
          headers: {
            'Authorization': `Bearer ${user?.token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export performance data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expert-performance-${expertId}-${new Date().toISOString()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      performanceEmitter.emit('dataExported', { format, expertId });
    } catch (error) {
      logger.current.error('Failed to export performance data', error, { expertId });
      throw error;
    }
  }, [expertId, user?.token]);

  /**
   * 🎯 EVENT HANDLERS
   */
  
  // 🎯 Subscribe to performance events
  const subscribeToPerformanceEvents = useCallback((event, handler) => {
    performanceEmitter.on(event, handler);
    
    return () => {
      performanceEmitter.off(event, handler);
    };
  }, []);

  // 🎯 Unsubscribe from all events
  const unsubscribeFromAllEvents = useCallback(() => {
    performanceEmitter.removeAllListeners();
  }, []);

  /**
   * 🎯 QUALITY ALERT CALCULATION
   */
  const calculateQualityAlerts = (performanceData) => {
    const alerts = [];
    
    if (!performanceData) return alerts;

    // 🎯 Quality score alert
    if (performanceData.qualityScore < 4.0) {
      alerts.push({
        id: `quality-score-low-${Date.now()}`,
        type: 'QUALITY_SCORE_LOW',
        severity: performanceData.qualityScore < 3.5 ? 'HIGH' : 'MEDIUM',
        message: `Quality score (${performanceData.qualityScore}) below minimum threshold`,
        metric: 'qualityScore',
        currentValue: performanceData.qualityScore,
        threshold: 4.0,
        timestamp: new Date().toISOString()
      });
    }

    // 🎯 Completion rate alert
    if (performanceData.completionRate < 0.7) {
      alerts.push({
        id: `completion-rate-low-${Date.now()}`,
        type: 'COMPLETION_RATE_LOW',
        severity: 'HIGH',
        message: `Completion rate (${(performanceData.completionRate * 100).toFixed(1)}%) below 70% target`,
        metric: 'completionRate',
        currentValue: performanceData.completionRate,
        threshold: 0.7,
        timestamp: new Date().toISOString()
      });
    }

    // 🎯 Response time alert
    if (performanceData.averageResponseTime > 24) {
      alerts.push({
        id: `response-time-high-${Date.now()}`,
        type: 'RESPONSE_TIME_HIGH',
        severity: 'MEDIUM',
        message: `Average response time (${performanceData.averageResponseTime}h) exceeds 24h target`,
        metric: 'responseTime',
        currentValue: performanceData.averageResponseTime,
        threshold: 24,
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  };

  /**
   * 🎯 CLEANUP EFFECT
   */
  useEffect(() => {
    return () => {
      // Cleanup event listeners
      unsubscribeFromAllEvents();
      logger.current.debug('useExpertPerformance cleanup completed', { expertId });
    };
  }, [expertId, unsubscribeFromAllEvents]);

  /**
   * 🎯 RETURN HOOK INTERFACE
   */
  return {
    // 🎯 Data State
    performance: calculatedMetrics(),
    realTimeUpdates,
    qualityAlerts,
    
    // 🎯 Query State
    isLoading,
    isFetching,
    isError,
    error,
    
    // 🎯 Connection State
    connectionStatus,
    
    // 🎯 Actions
    refreshPerformance: refreshPerformance.mutate,
    updatePerformanceGoals: updatePerformanceGoals.mutate,
    acknowledgeQualityAlert: acknowledgeQualityAlert.mutate,
    requestPerformanceReview,
    exportPerformanceData,
    
    // 🎯 Event System
    subscribeToPerformanceEvents,
    unsubscribeFromAllEvents,
    
    // 🎯 Mutation States
    isRefreshing: refreshPerformance.isLoading,
    isUpdatingGoals: updatePerformanceGoals.isLoading,
    isAcknowledgingAlert: acknowledgeQualityAlert.isLoading,
    
    // 🎯 Derived States
    hasPerformanceData: !!performanceMetrics,
    isNearTierThreshold: calculatedMetrics()?.tierProgress?.isNearThreshold,
    requiresAttention: qualityAlerts.length > 0,
    
    // 🎯 Performance Indicators
    performanceHealth: calculatedMetrics()?.qualityHealth?.overall,
    improvementSuggestions: calculatedMetrics()?.improvementAreas,
    strengthAreas: calculatedMetrics()?.strengths
  };
};

/**
 * 🎯 PERFORMANCE CALCULATOR UTILITY
 */
class PerformanceCalculator {
  calculateTierProgress(performance) {
    if (!performance) return null;
    
    const { currentTier, qualityScore, completionRate } = performance;
    const tierThresholds = {
      PROBATION: { min: 0, max: 3.5 },
      DEVELOPING: { min: 3.5, max: 4.0 },
      STANDARD: { min: 4.0, max: 4.3 },
      SENIOR: { min: 4.3, max: 4.7 },
      MASTER: { min: 4.7, max: 5.0 }
    };

    const currentTierRange = tierThresholds[currentTier];
    if (!currentTierRange) return null;

    const progress = (qualityScore - currentTierRange.min) / 
                    (currentTierRange.max - currentTierRange.min);
    
    return {
      currentTier,
      progress: Math.min(Math.max(progress, 0), 1),
      nextTier: this.getNextTier(currentTier),
      isNearThreshold: progress > 0.8 || progress < 0.2,
      requirements: this.getTierRequirements(currentTier)
    };
  }

  getNextTier(currentTier) {
    const tierOrder = ['PROBATION', 'DEVELOPING', 'STANDARD', 'SENIOR', 'MASTER'];
    const currentIndex = tierOrder.indexOf(currentTier);
    return currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;
  }

  getTierRequirements(tier) {
    const requirements = {
      STANDARD: { qualityScore: 4.0, completionRate: 0.7, minRatings: 5 },
      SENIOR: { qualityScore: 4.3, completionRate: 0.75, minRatings: 15 },
      MASTER: { qualityScore: 4.7, completionRate: 0.8, minRatings: 30 }
    };
    return requirements[tier] || {};
  }

  calculatePerformanceTrend(performance) {
    if (!performance?.historicalData) return 'STABLE';
    
    const recentData = performance.historicalData.slice(-3);
    if (recentData.length < 2) return 'STABLE';

    const trend = recentData[recentData.length - 1].qualityScore - 
                 recentData[0].qualityScore;
    
    if (trend > 0.1) return 'IMPROVING';
    if (trend < -0.1) return 'DECLINING';
    return 'STABLE';
  }

  calculateRevenuePotential(performance) {
    if (!performance) return 0;
    
    const baseEarning = 999; // Base expert earning per student
    const bonusMultiplier = this.getBonusMultiplier(performance.currentTier);
    const capacity = performance.maxCapacity || 50;
    
    return baseEarning * bonusMultiplier * capacity;
  }

  getBonusMultiplier(tier) {
    const multipliers = {
      PROBATION: 0.8,
      DEVELOPING: 0.9,
      STANDARD: 1.0,
      SENIOR: 1.1,
      MASTER: 1.2
    };
    return multipliers[tier] || 1.0;
  }

  calculateCapacityUtilization(performance) {
    if (!performance?.currentStudents || !performance?.maxCapacity) return 0;
    return performance.currentStudents / performance.maxCapacity;
  }

  assessQualityHealth(performance) {
    if (!performance) return { overall: 'UNKNOWN', metrics: {} };
    
    const { qualityScore, completionRate, averageResponseTime } = performance;
    
    const metrics = {
      qualityScore: qualityScore >= 4.0 ? 'HEALTHY' : qualityScore >= 3.5 ? 'WARNING' : 'CRITICAL',
      completionRate: completionRate >= 0.7 ? 'HEALTHY' : completionRate >= 0.6 ? 'WARNING' : 'CRITICAL',
      responseTime: averageResponseTime <= 24 ? 'HEALTHY' : averageResponseTime <= 48 ? 'WARNING' : 'CRITICAL'
    };

    const criticalCount = Object.values(metrics).filter(m => m === 'CRITICAL').length;
    const warningCount = Object.values(metrics).filter(m => m === 'WARNING').length;

    const overall = criticalCount > 0 ? 'CRITICAL' : 
                   warningCount > 0 ? 'WARNING' : 'HEALTHY';

    return { overall, metrics };
  }

  identifyImprovementAreas(performance) {
    const areas = [];
    
    if (!performance) return areas;

    if (performance.qualityScore < 4.0) {
      areas.push({
        area: 'QUALITY_SCORE',
        current: performance.qualityScore,
        target: 4.0,
        priority: performance.qualityScore < 3.5 ? 'HIGH' : 'MEDIUM',
        suggestions: ['Focus on student feedback', 'Improve session preparation', 'Enhance communication skills']
      });
    }

    if (performance.completionRate < 0.7) {
      areas.push({
        area: 'COMPLETION_RATE',
        current: performance.completionRate,
        target: 0.7,
        priority: 'HIGH',
        suggestions: ['Improve student engagement', 'Provide better support', 'Adjust training pace']
      });
    }

    return areas;
  }

  identifyStrengths(performance) {
    const strengths = [];
    
    if (!performance) return strengths;

    if (performance.qualityScore >= 4.5) {
      strengths.push('EXCELLENT_QUALITY');
    }

    if (performance.completionRate >= 0.8) {
      strengths.push('HIGH_COMPLETION');
    }

    if (performance.averageResponseTime <= 12) {
      strengths.push('QUICK_RESPONSE');
    }

    return strengths;
  }

  assessRiskLevel(performance) {
    const health = this.assessQualityHealth(performance);
    
    if (health.overall === 'CRITICAL') return 'HIGH';
    if (health.overall === 'WARNING') return 'MEDIUM';
    return 'LOW';
  }

  calculateRetentionProbability(performance) {
    if (!performance) return 0.5;
    
    let probability = 0.5;
    
    // Quality score impact
    probability += (performance.qualityScore - 3.5) * 0.2;
    
    // Completion rate impact
    probability += (performance.completionRate - 0.6) * 0.3;
    
    // Response time impact
    probability += (24 - Math.min(performance.averageResponseTime, 48)) / 48 * 0.2;
    
    return Math.min(Math.max(probability, 0.1), 0.95);
  }

  enhancePerformanceData(rawData) {
    if (!rawData) return null;
    
    return {
      ...rawData,
      // Add calculated fields
      weeklyProgress: this.calculateWeeklyProgress(rawData),
      studentSatisfaction: this.calculateStudentSatisfaction(rawData),
      performanceVelocity: this.calculatePerformanceVelocity(rawData)
    };
  }

  applyRealTimeUpdate(currentMetrics, update) {
    return {
      ...currentMetrics,
      // Update relevant metrics based on real-time data
      qualityScore: update.qualityScore ?? currentMetrics.qualityScore,
      lastUpdated: update.timestamp,
      realTimeData: update
    };
  }

  calculateWeeklyProgress(performance) {
    // Implementation for weekly progress calculation
    return performance.weeklyProgress || 0;
  }

  calculateStudentSatisfaction(performance) {
    // Implementation for student satisfaction calculation
    return performance.studentSatisfaction || 0.8;
  }

  calculatePerformanceVelocity(performance) {
    // Implementation for performance velocity calculation
    return performance.performanceVelocity || 0;
  }

  getNextTierRequirements(performance) {
    const nextTier = this.getNextTier(performance?.currentTier);
    return this.getTierRequirements(nextTier);
  }
}

export default useExpertPerformance;