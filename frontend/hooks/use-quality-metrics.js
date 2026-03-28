// hooks/use-quality-metrics.js

/**
 * 🎯 ENTERPRISE QUALITY METRICS HOOK
 * Production-ready React hook for quality data management
 * Features: Real-time metrics, caching, performance optimization, error boundaries
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { debounce, throttle } from 'lodash';
import { Alert } from 'react-native';

// 🎯 Quality Metrics Service
class QualityMetricsService {
  constructor() {
    this.baseURL = process.env.EXPO_PUBLIC_API_URL;
    this.cache = new Map();
    this.subscribers = new Map();
  }

  // 🛡️ Fetch expert quality metrics with caching
  async fetchExpertMetrics(expertId, options = {}) {
    const cacheKey = `expert:${expertId}:metrics`;
    const cacheTTL = options.cacheTTL || 300000; // 5 minutes default

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < cacheTTL) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(`${this.baseURL}/quality/experts/${expertId}/metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${options.token}`
        },
        signal: options.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      // Notify subscribers
      this.notifySubscribers(`expert:${expertId}`, data);

      return data;
    } catch (error) {
      console.error('Failed to fetch expert metrics:', error);
      throw error;
    }
  }

  // 📊 Fetch student quality insights
  async fetchStudentQualityInsights(studentId, options = {}) {
    const cacheKey = `student:${studentId}:quality-insights`;

    try {
      const response = await fetch(`${this.baseURL}/quality/students/${studentId}/insights`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${options.token}`
        },
        signal: options.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Failed to fetch student quality insights:', error);
      throw error;
    }
  }

  // 🎯 Submit quality feedback
  async submitQualityFeedback(feedbackData, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}/quality/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${options.token}`
        },
        body: JSON.stringify(feedbackData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Invalidate relevant caches
      this.invalidateCache(`expert:${feedbackData.expertId}`);
      this.invalidateCache(`student:${feedbackData.studentId}`);

      return result;
    } catch (error) {
      console.error('Failed to submit quality feedback:', error);
      throw error;
    }
  }

  // 📈 Fetch quality trends
  async fetchQualityTrends(params, options = {}) {
    const cacheKey = `quality:trends:${JSON.stringify(params)}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const queryParams = new URLSearchParams(params);
      const response = await fetch(`${this.baseURL}/quality/trends?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${options.token}`
        },
        signal: options.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Failed to fetch quality trends:', error);
      throw error;
    }
  }

  // 🔄 Real-time subscription
  subscribeToQualityUpdates(entityType, entityId, callback) {
    const key = `${entityType}:${entityId}`;
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);

    return () => {
      const subscribers = this.subscribers.get(key);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  // 📢 Notify subscribers
  notifySubscribers(key, data) {
    const subscribers = this.subscribers.get(key);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in quality metrics subscriber:', error);
        }
      });
    }
  }

  // 🗑️ Invalidate cache
  invalidateCache(pattern) {
    for (const [key] of this.cache) {
      if (key.startsWith(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // 🧹 Clear all cache
  clearCache() {
    this.cache.clear();
  }
}

// 🎯 Singleton instance
const qualityMetricsService = new QualityMetricsService();

/**
 * 🎯 ENTERPRISE USE QUALITY METRICS HOOK
 */
export const useQualityMetrics = (options = {}) => {
  const {
    enableRealTime = true,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 2 * 60 * 1000, // 2 minutes
    retry = 3,
    retryDelay = 1000
  } = options;

  const queryClient = useQueryClient();
  const [realTimeData, setRealTimeData] = useState(new Map());
  const subscriptionRefs = useRef(new Set());

  // 🧹 Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptionRefs.current.forEach(unsubscribe => unsubscribe());
      subscriptionRefs.current.clear();
    };
  }, []);

  // 🎯 USE EXPERT QUALITY METRICS
  const useExpertQualityMetrics = (expertId, queryOptions = {}) => {
    return useQuery({
      queryKey: ['quality', 'experts', expertId, 'metrics'],
      queryFn: async ({ signal }) => {
        if (!expertId) throw new Error('Expert ID is required');
        
        return await qualityMetricsService.fetchExpertMetrics(expertId, {
          signal,
          token: queryOptions.token,
          cacheTTL: cacheTime
        });
      },
      enabled: !!expertId && (queryOptions.enabled !== false),
      staleTime,
      cacheTime,
      retry,
      retryDelay,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      ...queryOptions
    });
  };

  // 📊 USE STUDENT QUALITY INSIGHTS
  const useStudentQualityInsights = (studentId, queryOptions = {}) => {
    return useQuery({
      queryKey: ['quality', 'students', studentId, 'insights'],
      queryFn: async ({ signal }) => {
        if (!studentId) throw new Error('Student ID is required');
        
        return await qualityMetricsService.fetchStudentQualityInsights(studentId, {
          signal,
          token: queryOptions.token
        });
      },
      enabled: !!studentId && (queryOptions.enabled !== false),
      staleTime,
      cacheTime,
      retry,
      retryDelay,
      ...queryOptions
    });
  };

  // 📈 USE QUALITY TRENDS
  const useQualityTrends = (params = {}, queryOptions = {}) => {
    return useQuery({
      queryKey: ['quality', 'trends', params],
      queryFn: async ({ signal }) => {
        return await qualityMetricsService.fetchQualityTrends(params, {
          signal,
          token: queryOptions.token
        });
      },
      enabled: queryOptions.enabled !== false,
      staleTime,
      cacheTime,
      retry,
      retryDelay,
      ...queryOptions
    });
  };

  // 🎯 SUBMIT QUALITY FEEDBACK MUTATION
  const useSubmitQualityFeedback = (mutationOptions = {}) => {
    return useMutation({
      mutationFn: async (feedbackData) => {
        return await qualityMetricsService.submitQualityFeedback(feedbackData, {
          token: mutationOptions.token
        });
      },
      onSuccess: (data, variables) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries({
          queryKey: ['quality', 'experts', variables.expertId]
        });
        queryClient.invalidateQueries({
          queryKey: ['quality', 'students', variables.studentId]
        });
        queryClient.invalidateQueries({
          queryKey: ['quality', 'trends']
        });

        mutationOptions.onSuccess?.(data, variables);
      },
      onError: (error, variables, context) => {
        console.error('Quality feedback submission failed:', error);
        mutationOptions.onError?.(error, variables, context);
        
        // Show error alert in production
        if (process.env.NODE_ENV === 'production') {
          Alert.alert(
            'Submission Failed',
            'Unable to submit quality feedback. Please try again.',
            [{ text: 'OK' }]
          );
        }
      },
      retry: 2,
      ...mutationOptions
    });
  };

  // 🔄 REAL-TIME QUALITY UPDATES
  const useRealTimeQualityUpdates = (entityType, entityId, callback) => {
    useEffect(() => {
      if (!enableRealTime || !entityId || !entityType) return;

      const unsubscribe = qualityMetricsService.subscribeToQualityUpdates(
        entityType,
        entityId,
        (data) => {
          // Update real-time data map
          setRealTimeData(prev => new Map(prev.set(`${entityType}:${entityId}`, data)));
          
          // Call provided callback
          callback?.(data);
        }
      );

      subscriptionRefs.current.add(unsubscribe);

      return () => {
        unsubscribe();
        subscriptionRefs.current.delete(unsubscribe);
      };
    }, [entityType, entityId, enableRealTime, callback]);
  };

  // 📊 GET REAL-TIME METRICS
  const getRealTimeMetrics = useCallback((entityType, entityId) => {
    return realTimeData.get(`${entityType}:${entityId}`);
  }, [realTimeData]);

  // 🎯 CALCULATE QUALITY SCORE
  const calculateQualityScore = useCallback((metrics) => {
    if (!metrics) return 0;

    const {
      averageRating = 0,
      completionRate = 0,
      responseTime = 0,
      studentSatisfaction = 0,
      sessionQuality = 0
    } = metrics;

    // 🎯 Enterprise scoring algorithm
    const weights = {
      averageRating: 0.35,
      completionRate: 0.25,
      responseTime: 0.15,
      studentSatisfaction: 0.15,
      sessionQuality: 0.10
    };

    // Normalize response time (lower is better)
    const normalizedResponseTime = Math.max(0, 1 - (responseTime / 48)); // 48 hours max

    const score = (
      (averageRating / 5) * weights.averageRating +
      (completionRate / 100) * weights.completionRate +
      normalizedResponseTime * weights.responseTime +
      (studentSatisfaction / 100) * weights.studentSatisfaction +
      (sessionQuality / 5) * weights.sessionQuality
    ) * 5; // Scale to 5-point system

    return Math.min(5, Math.max(0, Number(score.toFixed(2))));
  }, []);

  // 🏆 DETERMINE QUALITY TIER
  const determineQualityTier = useCallback((qualityScore, ratingCount = 0) => {
    if (ratingCount < 3) return 'PENDING';
    
    if (qualityScore >= 4.7) return 'MASTER';
    if (qualityScore >= 4.3) return 'SENIOR';
    if (qualityScore >= 4.0) return 'STANDARD';
    if (qualityScore >= 3.5) return 'DEVELOPING';
    return 'PROBATION';
  }, []);

  // 📈 CALCULATE TREND DIRECTION
  const calculateTrendDirection = useCallback((current, previous) => {
    if (!previous || current === previous) return 'stable';
    return current > previous ? 'improving' : 'declining';
  }, []);

  // 🔄 DEBOUNCED METRICS REFRESH
  const debouncedRefresh = useMemo(
    () => debounce((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    }, 500),
    [queryClient]
  );

  // 📊 BATCHED METRICS UPDATE
  const batchedMetricsUpdate = useMemo(
    () => throttle((updates) => {
      // Process multiple metric updates efficiently
      updates.forEach(({ entityType, entityId, data }) => {
        const key = `${entityType}:${entityId}`;
        setRealTimeData(prev => new Map(prev.set(key, data)));
      });
    }, 100),
    []
  );

  // 🎯 QUALITY THRESHOLDS
  const qualityThresholds = useMemo(() => ({
    MASTER: { min: 4.7, color: '#10B981', label: 'Master' },
    SENIOR: { min: 4.3, color: '#3B82F6', label: 'Senior' },
    STANDARD: { min: 4.0, color: '#6B7280', label: 'Standard' },
    DEVELOPING: { min: 3.5, color: '#F59E0B', label: 'Developing' },
    PROBATION: { min: 0, color: '#EF4444', label: 'Probation' }
  }), []);

  // 🛡️ ERROR BOUNDARY UTILITIES
  const useQualityErrorBoundary = (error) => {
    useEffect(() => {
      if (error) {
        // Log to monitoring service in production
        if (process.env.NODE_ENV === 'production') {
          console.error('Quality metrics error:', error);
          // Here you would integrate with your error monitoring service
          // Sentry.captureException(error);
        }
      }
    }, [error]);
  };

  // 🧹 CACHE MANAGEMENT
  const clearQualityCache = useCallback(() => {
    qualityMetricsService.clearCache();
    queryClient.removeQueries({ queryKey: ['quality'] });
    setRealTimeData(new Map());
  }, [queryClient]);

  // 📊 PERFORMANCE MONITORING
  const useQualityPerformance = (operationName) => {
    const startTimeRef = useRef(0);

    useEffect(() => {
      startTimeRef.current = performance.now();

      return () => {
        const duration = performance.now() - startTimeRef.current;
        
        // Log performance metrics
        if (duration > 1000) { // Warn if operation takes more than 1 second
          console.warn(`Quality operation ${operationName} took ${duration.toFixed(2)}ms`);
        }

        // Send to analytics in production
        if (process.env.NODE_ENV === 'production') {
          // analytics.track('quality_operation_performance', { operationName, duration });
        }
      };
    }, [operationName]);
  };

  return {
    // 🎯 Core Hooks
    useExpertQualityMetrics,
    useStudentQualityInsights,
    useQualityTrends,
    useSubmitQualityFeedback,
    
    // 🔄 Real-time Features
    useRealTimeQualityUpdates,
    getRealTimeMetrics,
    
    // 📊 Calculation Utilities
    calculateQualityScore,
    determineQualityTier,
    calculateTrendDirection,
    
    // 🛠️ Management Utilities
    debouncedRefresh,
    batchedMetricsUpdate,
    clearQualityCache,
    
    // 🎯 Configuration
    qualityThresholds,
    
    // 🛡️ Error Handling
    useQualityErrorBoundary,
    useQualityPerformance,
    
    // 📈 Service Instance (for advanced usage)
    service: qualityMetricsService
  };
};

/**
 * 🎯 QUALITY METRICS CONTEXT PROVIDER
 */
export const QualityMetricsProvider = ({ children, options = {} }) => {
  const qualityMetrics = useQualityMetrics(options);
  
  return (
    <QualityMetricsContext.Provider value={qualityMetrics}>
      {children}
    </QualityMetricsContext.Provider>
  );
};

/**
 * 🎯 QUALITY METRICS CONTEXT
 */
import { createContext, useContext } from 'react';

export const QualityMetricsContext = createContext(null);

export const useQualityMetricsContext = () => {
  const context = useContext(QualityMetricsContext);
  if (!context) {
    throw new Error('useQualityMetricsContext must be used within a QualityMetricsProvider');
  }
  return context;
};

export default useQualityMetrics;