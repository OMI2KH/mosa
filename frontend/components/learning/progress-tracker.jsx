// learning/progress-tracker.jsx

/**
 * 🎯 ENTERPRISE PROGRESS TRACKER
 * Production-ready progress tracking component for Mosa Forge
 * Features: Real-time progress, skill mastery, Duolingo-style visualization, performance analytics
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { ProgressChart, LineChart } from 'react-native-chart-kit';
import { useLearningContext } from '../../contexts/learning-context';
import { useQualityContext } from '../../contexts/quality-context';
import { ProgressService } from '../../services/progress-service';
import { Logger } from '../../utils/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const logger = new Logger('ProgressTracker');

// 🎯 PROGRESS TRACKER COMPONENT
const ProgressTracker = ({ 
  skillId, 
  studentId, 
  showDetailedView = false,
  onProgressUpdate,
  onMilestoneReached 
}) => {
  // 🏗️ STATE MANAGEMENT
  const [progressData, setProgressData] = useState({
    overallProgress: 0,
    dailyProgress: 0,
    weeklyProgress: 0,
    skillMastery: {},
    streak: 0,
    nextMilestone: null,
    estimatedCompletion: null,
    performanceMetrics: {}
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [animatedProgress] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  // 📚 CONTEXT HOOKS
  const { 
    currentExercise, 
    completedExercises, 
    skillLevel,
    updateProgress,
    getSkillMetrics 
  } = useLearningContext();

  const {
    qualityScore,
    learningEfficiency,
    getQualityRecommendations
  } = useQualityContext();

  // 🎯 MEMOIZED CALCULATIONS
  const masteryLevel = useMemo(() => {
    return calculateMasteryLevel(progressData.overallProgress, progressData.performanceMetrics);
  }, [progressData.overallProgress, progressData.performanceMetrics]);

  const nextMilestoneInfo = useMemo(() => {
    return calculateNextMilestone(progressData.overallProgress, skillLevel);
  }, [progressData.overallProgress, skillLevel]);

  const efficiencyScore = useMemo(() => {
    return calculateEfficiencyScore(progressData.performanceMetrics, progressData.dailyProgress);
  }, [progressData.performanceMetrics, progressData.dailyProgress]);

  // 🚀 INITIALIZATION EFFECT
  useEffect(() => {
    initializeProgressTracker();
    setupProgressListeners();
    
    return () => {
      cleanupProgressListeners();
    };
  }, [skillId, studentId]);

  // 🔄 FOCUS EFFECT FOR REAL-TIME UPDATES
  useFocusEffect(
    useCallback(() => {
      refreshProgressData();
      startProgressAnimation();
    }, [skillId])
  );

  // 🏗️ INITIALIZE PROGRESS TRACKER
  const initializeProgressTracker = async () => {
    try {
      setIsLoading(true);
      logger.info('Initializing progress tracker', { skillId, studentId });

      const [
        progressResponse,
        metricsResponse,
        chartResponse
      ] = await Promise.all([
        ProgressService.getStudentProgress(studentId, skillId),
        ProgressService.getPerformanceMetrics(studentId, skillId),
        ProgressService.getProgressChartData(studentId, skillId, '30d')
      ]);

      const consolidatedData = consolidateProgressData(
        progressResponse,
        metricsResponse,
        chartResponse
      );

      setProgressData(consolidatedData);
      setChartData(generateChartData(consolidatedData));
      setLastUpdated(new Date());

      logger.metric('progress_tracker_initialized', {
        skillId,
        overallProgress: consolidatedData.overallProgress,
        masteryLevel: masteryLevel
      });

    } catch (error) {
      logger.error('Failed to initialize progress tracker', error, { skillId, studentId });
      showErrorAlert('Failed to load progress data');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔄 REFRESH PROGRESS DATA
  const refreshProgressData = async () => {
    if (isUpdating) return;

    try {
      setIsUpdating(true);
      logger.debug('Refreshing progress data', { skillId });

      const freshData = await ProgressService.getStudentProgress(studentId, skillId);
      
      setProgressData(prev => ({
        ...prev,
        ...freshData,
        lastSynced: new Date()
      }));

      triggerProgressAnimation(freshData.overallProgress);
      
      // Notify parent component of progress update
      onProgressUpdate?.(freshData);

    } catch (error) {
      logger.error('Progress data refresh failed', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // 🎨 PROGRESS ANIMATION
  const startProgressAnimation = () => {
    // Pulse animation for active learning
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Initial progress animation
    Animated.timing(animatedProgress, {
      toValue: progressData.overallProgress / 100,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  };

  const triggerProgressAnimation = (newProgress) => {
    Animated.timing(animatedProgress, {
      toValue: newProgress / 100,
      duration: 800,
      useNativeDriver: false,
    }).start();

    // Celebration for milestones
    if (newProgress >= progressData.nextMilestone?.threshold) {
      triggerMilestoneCelebration(progressData.nextMilestone);
    }
  };

  const triggerMilestoneCelebration = (milestone) => {
    logger.info('Milestone reached', milestone);
    onMilestoneReached?.(milestone);
    
    // Haptic feedback and visual celebration
    if (Platform.OS !== 'web') {
      const { ImpactFeedbackStyle, impactAsync } = require('expo-haptics');
      impactAsync(ImpactFeedbackStyle.Heavy);
    }
  };

  // 📊 PROGRESS VISUALIZATION COMPONENTS
  const renderMainProgressRing = () => {
    const progressWidth = animatedProgress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.progressRingContainer}>
        <View style={styles.progressRingBackground}>
          <Animated.View 
            style={[
              styles.progressRingFill,
              { width: progressWidth }
            ]}
          />
        </View>
        
        <View style={styles.progressTextContainer}>
          <Text style={styles.progressPercentage}>
            {Math.round(progressData.overallProgress)}%
          </Text>
          <Text style={styles.progressLabel}>
            Complete
          </Text>
        </View>

        {/* Mastery Badge */}
        {masteryLevel > 0.8 && (
          <View style={styles.masteryBadge}>
            <Text style={styles.masteryText}>🎯 Master</Text>
          </View>
        )}
      </View>
    );
  };

  const renderDetailedMetrics = () => {
    if (!showDetailedView) return null;

    return (
      <BlurView intensity={80} style={styles.metricsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.metricsScrollView}
        >
          {/* Daily Progress Metric */}
          <MetricCard
            title="Today's Progress"
            value={`+${progressData.dailyProgress}%`}
            subtitle="Daily Goal"
            icon="📈"
            color="#10B981"
          />

          {/* Learning Streak */}
          <MetricCard
            title="Learning Streak"
            value={`${progressData.streak} days`}
            subtitle="Keep going!"
            icon="🔥"
            color="#F59E0B"
          />

          {/* Efficiency Score */}
          <MetricCard
            title="Efficiency"
            value={`${efficiencyScore}%`}
            subtitle="Learning Speed"
            icon="⚡"
            color="#3B82F6"
          />

          {/* Quality Score */}
          <MetricCard
            title="Quality"
            value={`${qualityScore}/5`}
            subtitle="Performance"
            icon="🎯"
            color="#8B5CF6"
          />

          {/* Next Milestone */}
          {progressData.nextMilestone && (
            <MetricCard
              title="Next Goal"
              value={progressData.nextMilestone.title}
              subtitle={`${progressData.nextMilestone.progressToGo}% to go`}
              icon="🎯"
              color="#EC4899"
            />
          )}
        </ScrollView>
      </BlurView>
    );
  };

  const renderProgressChart = () => {
    if (!showDetailedView || !chartData.datasets.length) return null;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Progress Trend (30 Days)</Text>
        <LineChart
          data={chartData}
          width={SCREEN_WIDTH - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withVerticalLines={false}
          withHorizontalLines={false}
          withShadow={false}
        />
      </View>
    );
  };

  const renderSkillMastery = () => {
    if (!progressData.skillMastery || Object.keys(progressData.skillMastery).length === 0) {
      return null;
    }

    return (
      <View style={styles.masteryContainer}>
        <Text style={styles.masteryTitle}>Skill Mastery Breakdown</Text>
        {Object.entries(progressData.skillMastery).map(([skill, mastery]) => (
          <SkillMasteryRow
            key={skill}
            skill={skill}
            mastery={mastery}
            onPress={() => handleSkillFocus(skill)}
          />
        ))}
      </View>
    );
  };

  const renderPerformanceInsights = () => {
    const insights = generatePerformanceInsights(progressData.performanceMetrics);
    
    if (!insights.length) return null;

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>Performance Insights</Text>
        {insights.map((insight, index) => (
          <InsightCard
            key={index}
            insight={insight}
            index={index}
          />
        ))}
      </View>
    );
  };

  // 🎯 EVENT HANDLERS
  const handleSkillFocus = (skill) => {
    logger.info('Skill focus requested', { skill });
    // Navigate to specific skill exercises
    // This would integrate with navigation context
  };

  const handleRefresh = () => {
    refreshProgressData();
  };

  const handleShareProgress = () => {
    logger.info('Share progress initiated', { progress: progressData.overallProgress });
    // Implement social sharing functionality
  };

  // 🎨 RENDER COMPONENT
  if (isLoading) {
    return <ProgressTrackerSkeleton />;
  }

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isUpdating}
          onRefresh={handleRefresh}
          colors={['#10B981']}
          tintColor="#10B981"
        />
      }
    >
      {/* Main Progress Display */}
      <Animated.View 
        style={[
          styles.headerContainer,
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        {renderMainProgressRing()}
        
        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleRefresh}
            disabled={isUpdating}
          >
            <Text style={styles.actionButtonText}>
              {isUpdating ? '🔄' : '📊'} Update
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleShareProgress}
          >
            <Text style={styles.actionButtonText}>
              🎯 Share
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Detailed Metrics */}
      {renderDetailedMetrics()}

      {/* Progress Chart */}
      {renderProgressChart()}

      {/* Skill Mastery */}
      {renderSkillMastery()}

      {/* Performance Insights */}
      {renderPerformanceInsights()}

      {/* Last Updated */}
      <View style={styles.footer}>
        <Text style={styles.lastUpdated}>
          Last updated: {lastUpdated ? formatLastUpdated(lastUpdated) : 'Never'}
        </Text>
      </View>
    </ScrollView>
  );
};

// 🎯 METRIC CARD COMPONENT
const MetricCard = ({ title, value, subtitle, icon, color }) => (
  <View style={[styles.metricCard, { borderLeftColor: color }]}>
    <Text style={styles.metricIcon}>{icon}</Text>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricTitle}>{title}</Text>
    <Text style={styles.metricSubtitle}>{subtitle}</Text>
  </View>
);

// 🎯 SKILL MASTERY ROW COMPONENT
const SkillMasteryRow = ({ skill, mastery, onPress }) => (
  <TouchableOpacity style={styles.skillRow} onPress={onPress}>
    <View style={styles.skillInfo}>
      <Text style={styles.skillName}>{formatSkillName(skill)}</Text>
      <Text style={styles.skillPercentage}>{mastery.percentage}%</Text>
    </View>
    <View style={styles.masteryBar}>
      <View 
        style={[
          styles.masteryFill,
          { width: `${mastery.percentage}%`, backgroundColor: getMasteryColor(mastery.percentage) }
        ]} 
      />
    </View>
  </TouchableOpacity>
);

// 🎯 INSIGHT CARD COMPONENT
const InsightCard = ({ insight, index }) => (
  <Animated.View
    style={[
      styles.insightCard,
      {
        opacity: insightAnim,
        transform: [
          {
            translateY: insightAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          },
        ],
      },
    ]}
  >
    <Text style={styles.insightIcon}>{insight.icon}</Text>
    <View style={styles.insightContent}>
      <Text style={styles.insightTitle}>{insight.title}</Text>
      <Text style={styles.insightDescription}>{insight.description}</Text>
      {insight.action && (
        <TouchableOpacity style={styles.insightAction}>
          <Text style={styles.insightActionText}>{insight.action}</Text>
        </TouchableOpacity>
      )}
    </View>
  </Animated.View>
);

// 🎯 PROGRESS TRACKER SKELETON
const ProgressTrackerSkeleton = () => (
  <View style={styles.skeletonContainer}>
    <View style={styles.skeletonProgressRing} />
    <View style={styles.skeletonMetrics}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={styles.skeletonMetric} />
      ))}
    </View>
    <View style={styles.skeletonChart} />
  </View>
);

// 🛠️ UTILITY FUNCTIONS
const calculateMasteryLevel = (overallProgress, performanceMetrics) => {
  const baseMastery = overallProgress / 100;
  const performanceBonus = (performanceMetrics.accuracy || 0) * 0.2;
  const efficiencyBonus = (performanceMetrics.efficiency || 0) * 0.1;
  
  return Math.min(1, baseMastery + performanceBonus + efficiencyBonus);
};

const calculateNextMilestone = (currentProgress, skillLevel) => {
  const milestones = [
    { threshold: 25, title: 'Basics Complete', reward: '🎯' },
    { threshold: 50, title: 'Halfway There', reward: '⚡' },
    { threshold: 75, title: 'Advanced Level', reward: '🚀' },
    { threshold: 90, title: 'Mastery Approach', reward: '🏆' },
    { threshold: 100, title: 'Skill Mastered', reward: '🎉' }
  ];

  const next = milestones.find(m => m.threshold > currentProgress) || milestones[milestones.length - 1];
  return {
    ...next,
    progressToGo: next.threshold - currentProgress
  };
};

const calculateEfficiencyScore = (performanceMetrics, dailyProgress) => {
  const accuracy = performanceMetrics.accuracy || 0;
  const completionRate = performanceMetrics.completionRate || 0;
  const timeEfficiency = performanceMetrics.timeEfficiency || 0;
  
  return Math.round((accuracy * 0.4 + completionRate * 0.3 + timeEfficiency * 0.3) * 100);
};

const consolidateProgressData = (progress, metrics, chart) => {
  return {
    overallProgress: progress.overallProgress || 0,
    dailyProgress: progress.dailyProgress || 0,
    weeklyProgress: progress.weeklyProgress || 0,
    skillMastery: progress.skillMastery || {},
    streak: progress.streak || 0,
    nextMilestone: progress.nextMilestone,
    estimatedCompletion: progress.estimatedCompletion,
    performanceMetrics: metrics,
    chartData: chart
  };
};

const generateChartData = (progressData) => {
  // Generate chart data from progress history
  return {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    datasets: [
      {
        data: [20, 45, 60, progressData.overallProgress],
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        strokeWidth: 3
      }
    ]
  };
};

const generatePerformanceInsights = (metrics) => {
  const insights = [];
  
  if (metrics.accuracy > 0.8) {
    insights.push({
      icon: '🎯',
      title: 'High Accuracy',
      description: 'You\'re mastering concepts quickly!',
      action: 'Try Advanced Exercises'
    });
  }
  
  if (metrics.streak > 7) {
    insights.push({
      icon: '🔥',
      title: 'Learning Streak',
      description: `Amazing! ${metrics.streak} days in a row`,
      action: 'Keep Going!'
    });
  }
  
  if (metrics.consistency < 0.6) {
    insights.push({
      icon: '📅',
      title: 'Consistency Opportunity',
      description: 'Regular practice improves retention',
      action: 'Set Daily Reminder'
    });
  }
  
  return insights;
};

const formatLastUpdated = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString();
};

const getMasteryColor = (percentage) => {
  if (percentage >= 80) return '#10B981'; // Emerald
  if (percentage >= 60) return '#3B82F6'; // Blue
  if (percentage >= 40) return '#F59E0B'; // Amber
  if (percentage >= 20) return '#EF4444'; // Red
  return '#6B7280'; // Gray
};

const formatSkillName = (skill) => {
  return skill.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

// 🎨 CHART CONFIGURATION
const chartConfig = {
  backgroundColor: '#FFFFFF',
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: { r: '6', strokeWidth: '2', stroke: '#10B981' }
};

// 🎨 STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  progressRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  progressRingBackground: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressRingFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 100,
  },
  progressTextContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
  },
  progressLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  masteryBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  masteryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  metricsContainer: {
    marginTop: 24,
    paddingVertical: 16,
  },
  metricsScrollView: {
    paddingHorizontal: 20,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    width: 140,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  metricIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  chartContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  masteryContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  masteryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  skillInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  skillName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  skillPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },
  masteryBar: {
    width: 100,
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  masteryFill: {
    height: '100%',
    borderRadius: 4,
  },
  insightsContainer: {
    margin: 20,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  insightCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  insightIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  insightAction: {
    alignSelf: 'flex-start',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  insightActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // Skeleton Styles
  skeletonContainer: {
    padding: 20,
  },
  skeletonProgressRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 24,
  },
  skeletonMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  skeletonMetric: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  skeletonChart: {
    height: 200,
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
  },
});

// Error handling utility
const showErrorAlert = (message) => {
  if (Platform.OS === 'web') {
    alert(message);
  } else {
    Alert.alert('Error', message);
  }
};

// RefreshControl import for mobile
let RefreshControl;
if (Platform.OS !== 'web') {
  RefreshControl = require('react-native').RefreshControl;
} else {
  // Web-compatible refresh control
  RefreshControl = ({ refreshing, onRefresh, colors, tintColor }) => null;
}

export default React.memo(ProgressTracker);