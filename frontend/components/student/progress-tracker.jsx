// student/progress-tracker.jsx

/**
 * 🎯 ENTERPRISE PROGRESS TRACKER
 * Production-ready progress monitoring with real-time updates
 * Features: Multi-course tracking, quality metrics, completion forecasting
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  Dimensions,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { ProgressChart, LineChart } from 'react-native-chart-kit';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';

// Services
import ProgressService from '../../services/progress-service';
import QualityService from '../../services/quality-service';
import AnalyticsService from '../../services/analytics-service';

// Context
import { useAuth } from '../../contexts/auth-context';
import { useProgress } from '../../contexts/progress-context';

// Constants
import { ProgressConstants, QualityThresholds } from '../../constants/progress-config';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ProgressTracker = ({ studentId, courseId, showDetails = true }) => {
  // Context
  const { user } = useAuth();
  const { refreshProgress, progressData } = useProgress();

  // State
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [forecast, setForecast] = useState(null);
  
  // Animations
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(50), []);
  const pulseAnim = useMemo(() => new Animated.Value(1), []);

  /**
   * 📊 LOAD PROGRESS DATA
   */
  const loadProgressData = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Parallel data fetching for performance
      const [progressData, qualityMetrics, completionForecast] = await Promise.all([
        ProgressService.getStudentProgress(studentId || user.id, courseId),
        QualityService.getProgressMetrics(studentId || user.id, courseId),
        AnalyticsService.getCompletionForecast(studentId || user.id, courseId)
      ]);

      // Validate data integrity
      if (!progressData || typeof progressData.overallProgress !== 'number') {
        throw new Error('INVALID_PROGRESS_DATA');
      }

      setProgress(progressData);
      setMetrics(qualityMetrics);
      setForecast(completionForecast);

      // Update global context
      if (refreshProgress) {
        refreshProgress(progressData);
      }

      // Trigger animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start();

    } catch (err) {
      console.error('Progress data loading failed:', err);
      setError(err.message);
      
      // Show user-friendly error message
      const errorMessage = ProgressConstants.ERROR_MESSAGES[err.code] || 
                          'Failed to load progress data. Please try again.';
      
      if (showDetails) {
        Alert.alert('Loading Error', errorMessage);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [studentId, courseId, user?.id, fadeAnim, slideAnim, refreshProgress]);

  /**
   * 🔄 REFRESH HANDLER
   */
  const handleRefresh = useCallback(() => {
    loadProgressData(true);
    
    // Pulse animation on refresh
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, [loadProgressData, pulseAnim]);

  /**
   * 🎯 FOCUS EFFECT
   */
  useFocusEffect(
    useCallback(() => {
      loadProgressData();
      
      // Cleanup on unmount
      return () => {
        fadeAnim.setValue(0);
        slideAnim.setValue(50);
      };
    }, [loadProgressData, fadeAnim, slideAnim])
  );

  /**
   * 📈 RENDER PROGRESS CHART
   */
  const renderProgressChart = () => {
    if (!progress?.weeklyProgress) return null;

    const chartData = {
      labels: progress.weeklyProgress.map((_, index) => `W${index + 1}`),
      datasets: [
        {
          data: progress.weeklyProgress.map(w => w.completionRate / 100),
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Weekly Progress Trend</Text>
        <LineChart
          data={chartData}
          width={SCREEN_WIDTH - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#f8fafc',
            backgroundGradientTo: '#f1f5f9',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#22c55e'
            }
          }}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  /**
   * 🎯 RENDER COMPLETION FORECAST
   */
  const renderCompletionForecast = () => {
    if (!forecast) return null;

    const getForecastColor = () => {
      if (forecast.confidence > 0.8) return '#22c55e';
      if (forecast.confidence > 0.6) return '#eab308';
      return '#ef4444';
    };

    return (
      <Animated.View 
        style={[
          styles.forecastCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <LinearGradient
          colors={['#f8fafc', '#e2e8f0']}
          style={styles.forecastGradient}
        >
          <View style={styles.forecastHeader}>
            <Ionicons name="calendar" size={20} color="#475569" />
            <Text style={styles.forecastTitle}>Completion Forecast</Text>
          </View>
          
          <View style={styles.forecastContent}>
            <Text style={styles.forecastDate}>
              {new Date(forecast.estimatedCompletion).toLocaleDateString()}
            </Text>
            <Text style={[styles.confidenceText, { color: getForecastColor() }]}>
              {Math.round(forecast.confidence * 100)}% Confidence
            </Text>
          </View>

          {forecast.riskFactors.length > 0 && (
            <View style={styles.riskFactors}>
              <Text style={styles.riskTitle}>Attention Needed:</Text>
              {forecast.riskFactors.slice(0, 2).map((factor, index) => (
                <Text key={index} style={styles.riskFactor}>• {factor}</Text>
              ))}
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    );
  };

  /**
   * 📊 RENDER QUALITY METRICS
   */
  const renderQualityMetrics = () => {
    if (!metrics) return null;

    const metricsData = {
      labels: ['Understanding', 'Practice', 'Consistency'],
      data: [
        metrics.understandingScore / 100,
        metrics.practiceScore / 100, 
        metrics.consistencyScore / 100
      ]
    };

    return (
      <Animated.View 
        style={[
          styles.metricsCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <Text style={styles.metricsTitle}>Quality Metrics</Text>
        
        <View style={styles.metricsContent}>
          <ProgressChart
            data={metricsData}
            width={SCREEN_WIDTH - 120}
            height={140}
            strokeWidth={12}
            radius={32}
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#f8fafc',
              backgroundGradientTo: '#f1f5f9',
              decimalPlaces: 1,
              color: (opacity = 1, index) => {
                const colors = ['#22c55e', '#3b82f6', '#8b5cf6'];
                return colors[index] || `rgba(34, 197, 94, ${opacity})`;
              },
              labelColor: (opacity = 1) => `rgba(71, 85, 105, ${opacity})`,
            }}
            hideLegend={false}
            style={styles.metricsChart}
          />

          <View style={styles.metricsDetails}>
            <MetricItem 
              icon="psychology" 
              label="Understanding" 
              value={metrics.understandingScore} 
            />
            <MetricItem 
              icon="practice" 
              label="Practice" 
              value={metrics.practiceScore} 
            />
            <MetricItem 
              icon="consistency" 
              label="Consistency" 
              value={metrics.consistencyScore} 
            />
          </View>
        </View>
      </Animated.View>
    );
  };

  /**
   * 🎯 RENDER PROGRESS OVERVIEW
   */
  const renderProgressOverview = () => {
    if (!progress) return null;

    return (
      <Animated.View 
        style={[
          styles.overviewCard,
          { 
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: pulseAnim }
            ]
          }
        ]}
      >
        <LinearGradient
          colors={['#22c55e', '#16a34a']}
          style={styles.overviewGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>Overall Progress</Text>
            <View style={styles.progressBadge}>
              <Text style={styles.progressPercent}>
                {Math.round(progress.overallProgress)}%
              </Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View 
                style={[
                  styles.progressBarFill,
                  { 
                    width: `${progress.overallProgress}%`,
                    opacity: fadeAnim
                  }
                ]} 
              />
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatItem 
              icon="check-circle" 
              value={progress.completedModules} 
              label="Modules" 
            />
            <StatItem 
              icon="schedule" 
              value={`${progress.estimatedRemainingDays}d`} 
              label="Remaining" 
            />
            <StatItem 
              icon="trending-up" 
              value={`${progress.weeklyVelocity}%`} 
              label="Weekly" 
            />
            <StatItem 
              icon="grade" 
              value={progress.currentGrade || 'A'} 
              label="Grade" 
            />
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  /**
   * 📱 RENDER LOADING STATE
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <Animated.View style={[styles.loadingSkeleton, { opacity: pulseAnim }]} />
      <Animated.View style={[styles.loadingSkeleton, { opacity: pulseAnim }]} />
      <Animated.View style={[styles.loadingSkeleton, { opacity: pulseAnim }]} />
    </View>
  );

  /**
   * ❌ RENDER ERROR STATE
   */
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={48} color="#ef4444" />
      <Text style={styles.errorTitle}>Unable to Load Progress</Text>
      <Text style={styles.errorMessage}>
        {error || 'Please check your connection and try again'}
      </Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={handleRefresh}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  // Main render
  if (loading && !refreshing) {
    return renderLoadingState();
  }

  if (error && !progress) {
    return renderErrorState();
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#22c55e']}
          tintColor="#22c55e"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Progress Overview */}
      {renderProgressOverview()}

      {/* Quality Metrics */}
      {renderQualityMetrics()}

      {/* Completion Forecast */}
      {renderCompletionForecast()}

      {/* Progress Chart */}
      {showDetails && renderProgressChart()}

      {/* Recent Activity */}
      {showDetails && progress?.recentActivity && (
        <Animated.View 
          style={[
            styles.activityCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Text style={styles.activityTitle}>Recent Activity</Text>
          {progress.recentActivity.slice(0, 5).map((activity, index) => (
            <ActivityItem key={index} activity={activity} />
          ))}
        </Animated.View>
      )}
    </ScrollView>
  );
};

/**
 * 📊 METRIC ITEM COMPONENT
 */
const MetricItem = ({ icon, label, value }) => {
  const getIconName = (iconType) => {
    const icons = {
      psychology: 'brain',
      practice: 'dumbbell', 
      consistency: 'sync'
    };
    return icons[icon] || 'circle';
  };

  const getColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    return '#ef4444';
  };

  return (
    <View style={styles.metricItem}>
      <FontAwesome5 
        name={getIconName(icon)} 
        size={14} 
        color={getColor(value)} 
      />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: getColor(value) }]}>
        {value}%
      </Text>
    </View>
  );
};

/**
 * 📈 STAT ITEM COMPONENT
 */
const StatItem = ({ icon, value, label }) => (
  <View style={styles.statItem}>
    <MaterialIcons name={icon} size={20} color="#ffffff" />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

/**
 * 🔥 ACTIVITY ITEM COMPONENT
 */
const ActivityItem = ({ activity }) => {
  const getActivityIcon = (type) => {
    const icons = {
      module_complete: 'check-circle',
      exercise_submit: 'assignment',
      assessment_pass: 'emoji-events',
      session_attend: 'video-call'
    };
    return icons[type] || 'circle';
  };

  const getActivityColor = (type) => {
    const colors = {
      module_complete: '#22c55e',
      exercise_submit: '#3b82f6',
      assessment_pass: '#eab308',
      session_attend: '#8b5cf6'
    };
    return colors[type] || '#64748b';
  };

  return (
    <View style={styles.activityItem}>
      <View style={styles.activityIconContainer}>
        <MaterialIcons 
          name={getActivityIcon(activity.type)} 
          size={16} 
          color={getActivityColor(activity.type)} 
        />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityText}>{activity.description}</Text>
        <Text style={styles.activityTime}>
          {new Date(activity.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  loadingSkeleton: {
    height: 120,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  overviewCard: {
    margin: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  overviewGradient: {
    padding: 20,
    borderRadius: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  progressBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  metricsCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  metricsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  metricsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricsChart: {
    marginRight: 16,
  },
  metricsDetails: {
    flex: 1,
    gap: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricLabel: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  forecastCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  forecastGradient: {
    padding: 20,
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  forecastTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  forecastContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  forecastDate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  riskFactors: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  riskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 4,
  },
  riskFactor: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  activityCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  activityIconContainer: {
    width: 24,
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
});

export default ProgressTracker;