/**
 * 🎯 MOSA FORGE: Enterprise Quality Improvement Suggestions
 * 
 * @component ImprovementSuggestions
 * @description AI-powered expert improvement recommendations with actionable insights
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - AI-driven improvement recommendations
 * - Tier-based progression guidance
 * - Performance gap analysis
 * - Actionable improvement plans
 * - Real-time quality monitoring integration
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  RefreshControl,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useQualityMetrics } from '../hooks/use-quality-metrics';
import { usePerformanceAnalytics } from '../hooks/use-performance-analytics';

// 🏗️ Enterprise Constants
const TIER_THRESHOLDS = {
  MASTER: { min: 4.7, max: 5.0 },
  SENIOR: { min: 4.3, max: 4.69 },
  STANDARD: { min: 4.0, max: 4.29 },
  DEVELOPING: { min: 3.5, max: 3.99 },
  PROBATION: { min: 0.0, max: 3.49 }
};

const IMPROVEMENT_CATEGORIES = {
  RESPONSE_TIME: 'response_time',
  COMPLETION_RATE: 'completion_rate',
  STUDENT_SATISFACTION: 'student_satisfaction',
  TEACHING_QUALITY: 'teaching_quality',
  TECHNICAL_SKILLS: 'technical_skills',
  COMMUNICATION: 'communication'
};

const PRIORITY_LEVELS = {
  CRITICAL: { color: '#EF4444', label: 'Critical', weight: 5 },
  HIGH: { color: '#F59E0B', label: 'High', weight: 4 },
  MEDIUM: { color: '#EAB308', label: 'Medium', weight: 3 },
  LOW: { color: '#10B981', label: 'Low', weight: 2 },
  INFO: { color: '#3B82F6', label: 'Info', weight: 1 }
};

/**
 * 🏗️ Enterprise Improvement Suggestions Component
 * @param {Object} props - Component properties
 */
const ImprovementSuggestions = memo(({
  expertId,
  autoRefresh = true,
  showActions = true,
  compactMode = false,
  onSuggestionSelect,
  onImprovementPlanCreate,
  refreshInterval = 300000, // 5 minutes
  maxSuggestions = 10,
  theme = 'light'
}) => {
  // 🏗️ State Management
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [viewMode, setViewMode] = useState('priority'); // 'priority', 'category', 'timeline'
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // 🏗️ Custom Hooks
  const {
    qualityMetrics,
    loading: metricsLoading,
    error: metricsError,
    refreshMetrics,
    calculatePerformanceGaps,
    getTierProgression
  } = useQualityMetrics(expertId);

  const {
    trackSuggestionView,
    trackImprovementAction,
    trackTierProgression
  } = usePerformanceAnalytics();

  // 🏗️ Effects
  useEffect(() => {
    if (expertId) {
      loadImprovementSuggestions();
    }
  }, [expertId, viewMode]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadImprovementSuggestions, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  useEffect(() => {
    // Animate component entrance
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
  }, []);

  // 🏗️ Core Business Logic
  const loadImprovementSuggestions = useCallback(async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      setIsLoading(true);

      await refreshMetrics();
      const newSuggestions = await generateAISuggestions();
      
      setSuggestions(newSuggestions.slice(0, maxSuggestions));
      
      // Track analytics
      trackSuggestionView(expertId, newSuggestions.length);
      
    } catch (error) {
      console.error('Failed to load improvement suggestions:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [expertId, isRefreshing, maxSuggestions]);

  /**
   * 🎯 AI-Powered Suggestion Generation
   */
  const generateAISuggestions = useCallback(async () => {
    if (!qualityMetrics) return [];

    const gaps = calculatePerformanceGaps();
    const tierProgression = getTierProgression();
    
    const generatedSuggestions = [];

    // 🏗️ Response Time Improvements
    if (gaps.responseTime > 2) {
      generatedSuggestions.push({
        id: 'response-time-1',
        category: IMPROVEMENT_CATEGORIES.RESPONSE_TIME,
        title: 'Reduce Response Time',
        description: `Your average response time is ${qualityMetrics.responseTime}h, exceeding the 24h standard by ${gaps.responseTime}h`,
        priority: gaps.responseTime > 10 ? PRIORITY_LEVELS.CRITICAL : PRIORITY_LEVELS.HIGH,
        impact: 0.15, // 15% impact on quality score
        effort: 'MEDIUM',
        timeline: '2 weeks',
        actions: [
          'Set up response time alerts',
          'Use template responses for common questions',
          'Schedule dedicated response windows',
          'Enable mobile notifications'
        ],
        metrics: {
          current: qualityMetrics.responseTime,
          target: 24,
          unit: 'hours'
        },
        aiConfidence: 0.92
      });
    }

    // 🏗️ Completion Rate Improvements
    if (gaps.completionRate > 0.05) {
      generatedSuggestions.push({
        id: 'completion-rate-1',
        category: IMPROVEMENT_CATEGORIES.COMPLETION_RATE,
        title: 'Improve Course Completion',
        description: `${(gaps.completionRate * 100).toFixed(1)}% below target completion rate of 70%`,
        priority: gaps.completionRate > 0.15 ? PRIORITY_LEVELS.CRITICAL : PRIORITY_LEVELS.HIGH,
        impact: 0.25,
        effort: 'HIGH',
        timeline: '1 month',
        actions: [
          'Implement progress check-ins',
          'Create milestone celebrations',
          'Offer additional support sessions',
          'Personalize learning paths'
        ],
        metrics: {
          current: qualityMetrics.completionRate,
          target: 0.7,
          unit: 'percentage'
        },
        aiConfidence: 0.88
      });
    }

    // 🏗️ Student Satisfaction Improvements
    if (gaps.studentSatisfaction > 0.3) {
      generatedSuggestions.push({
        id: 'satisfaction-1',
        category: IMPROVEMENT_CATEGORIES.STUDENT_SATISFACTION,
        title: 'Enhance Student Experience',
        description: `Student satisfaction score ${gaps.studentSatisfaction.toFixed(1)} points below target`,
        priority: gaps.studentSatisfaction > 0.5 ? PRIORITY_LEVELS.CRITICAL : PRIORITY_LEVELS.MEDIUM,
        impact: 0.20,
        effort: 'MEDIUM',
        timeline: '3 weeks',
        actions: [
          'Conduct student feedback sessions',
          'Improve communication clarity',
          'Add interactive elements to sessions',
          'Provide timely and constructive feedback'
        ],
        metrics: {
          current: qualityMetrics.studentSatisfaction,
          target: 4.5,
          unit: 'stars'
        },
        aiConfidence: 0.85
      });
    }

    // 🏗️ Tier Progression Guidance
    if (tierProgression.canProgress) {
      generatedSuggestions.push({
        id: 'tier-progression-1',
        category: IMPROVEMENT_CATEGORIES.TEACHING_QUALITY,
        title: `Progress to ${tierProgression.nextTier} Tier`,
        description: `You're ${tierProgression.pointsNeeded} points away from ${tierProgression.nextTier} tier with ${tierProgression.bonusPercentage}% bonus`,
        priority: PRIORITY_LEVELS.HIGH,
        impact: 0.30,
        effort: tierProgression.effort,
        timeline: tierProgression.estimatedTimeline,
        actions: tierProgression.recommendedActions,
        metrics: {
          current: qualityMetrics.overallScore,
          target: tierProgression.nextTierThreshold,
          unit: 'rating'
        },
        aiConfidence: 0.95
      });
    }

    // 🏗️ Teaching Quality Improvements
    if (qualityMetrics.teachingQuality < 4.3) {
      generatedSuggestions.push({
        id: 'teaching-quality-1',
        category: IMPROVEMENT_CATEGORIES.TEACHING_QUALITY,
        title: 'Enhance Teaching Methodology',
        description: 'Incorporate more practical examples and real-world scenarios',
        priority: PRIORITY_LEVELS.MEDIUM,
        impact: 0.18,
        effort: 'MEDIUM',
        timeline: '2 weeks',
        actions: [
          'Add case studies to sessions',
          'Use more visual aids',
          'Implement hands-on exercises',
          'Record and review teaching sessions'
        ],
        metrics: {
          current: qualityMetrics.teachingQuality,
          target: 4.5,
          unit: 'rating'
        },
        aiConfidence: 0.80
      });
    }

    // 🏗️ Sort by priority and impact
    return generatedSuggestions.sort((a, b) => {
      const priorityScoreA = a.priority.weight * a.impact;
      const priorityScoreB = b.priority.weight * b.impact;
      return priorityScoreB - priorityScoreA;
    });

  }, [qualityMetrics, calculatePerformanceGaps, getTierProgression]);

  /**
   * 🏗️ Handle Suggestion Selection
   */
  const handleSuggestionSelect = useCallback((suggestion) => {
    setSelectedSuggestion(suggestion);
    trackSuggestionView(expertId, 1, suggestion.id);
    
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    }
  }, [expertId, onSuggestionSelect]);

  /**
   * 🏗️ Create Improvement Plan
   */
  const handleCreateImprovementPlan = useCallback(async (suggestion) => {
    try {
      const plan = {
        expertId,
        suggestionId: suggestion.id,
        title: suggestion.title,
        actions: suggestion.actions,
        timeline: suggestion.timeline,
        targetMetrics: suggestion.metrics,
        createdAt: new Date().toISOString()
      };

      trackImprovementAction(expertId, 'plan_created', suggestion.id);
      
      if (onImprovementPlanCreate) {
        await onImprovementPlanCreate(plan);
      }

      // Show success feedback
      // In production, this would use a toast notification system
      console.log('Improvement plan created successfully');

    } catch (error) {
      console.error('Failed to create improvement plan:', error);
      trackImprovementAction(expertId, 'plan_failed', suggestion.id);
    }
  }, [expertId, onImprovementPlanCreate]);

  /**
   * 🏗️ Mark Suggestion as Implemented
   */
  const handleMarkImplemented = useCallback(async (suggestionId) => {
    try {
      // In production, this would call an API
      trackImprovementAction(expertId, 'suggestion_implemented', suggestionId);
      
      // Remove from current suggestions
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
      
    } catch (error) {
      console.error('Failed to mark suggestion as implemented:', error);
    }
  }, [expertId]);

  // 🏗️ Render Methods
  const renderPriorityBadge = (priority) => (
    <View style={[styles.priorityBadge, { backgroundColor: priority.color }]}>
      <Text style={styles.priorityText}>{priority.label}</Text>
    </View>
  );

  const renderImpactMeter = (impact) => {
    const width = `${impact * 100}%`;
    return (
      <View style={styles.impactContainer}>
        <Text style={styles.impactLabel}>Impact: {(impact * 100).toFixed(0)}%</Text>
        <View style={styles.impactBar}>
          <View style={[styles.impactFill, { width }]} />
        </View>
      </View>
    );
  };

  const renderEffortBadge = (effort) => {
    const effortConfig = {
      LOW: { color: '#10B981', label: 'Low Effort' },
      MEDIUM: { color: '#EAB308', label: 'Medium Effort' },
      HIGH: { color: '#EF4444', label: 'High Effort' }
    };
    
    const config = effortConfig[effort] || effortConfig.MEDIUM;
    
    return (
      <View style={[styles.effortBadge, { backgroundColor: config.color }]}>
        <Text style={styles.effortText}>{config.label}</Text>
      </View>
    );
  };

  const renderSuggestionCard = (suggestion, index) => (
    <Animated.View
      key={suggestion.id}
      style={[
        styles.suggestionCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <TouchableOpacity
        onPress={() => handleSuggestionSelect(suggestion)}
        style={[
          styles.cardContent,
          selectedSuggestion?.id === suggestion.id && styles.selectedCard
        ]}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.suggestionTitle} numberOfLines={2}>
              {suggestion.title}
            </Text>
            {renderPriorityBadge(suggestion.priority)}
          </View>
          {renderEffortBadge(suggestion.effort)}
        </View>

        {/* Description */}
        <Text style={styles.suggestionDescription}>
          {suggestion.description}
        </Text>

        {/* Impact Meter */}
        {renderImpactMeter(suggestion.impact)}

        {/* Metrics */}
        <View style={styles.metricsContainer}>
          <Text style={styles.metricsText}>
            Current: {suggestion.metrics.current} {suggestion.metrics.unit} → 
            Target: {suggestion.metrics.target} {suggestion.metrics.unit}
          </Text>
        </View>

        {/* Timeline */}
        <View style={styles.timelineContainer}>
          <Text style={styles.timelineText}>
            🗓️ Timeline: {suggestion.timeline}
          </Text>
        </View>

        {/* AI Confidence */}
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceText}>
            AI Confidence: {(suggestion.aiConfidence * 100).toFixed(0)}%
          </Text>
        </View>

        {/* Actions */}
        {showActions && (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.planButton]}
              onPress={() => handleCreateImprovementPlan(suggestion)}
            >
              <Text style={styles.actionButtonText}>Create Plan</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.implementedButton]}
              onPress={() => handleMarkImplemented(suggestion.id)}
            >
              <Text style={styles.actionButtonText}>Mark Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Animated.View
      style={[
        styles.emptyState,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={['#F8FAFC', '#E2E8F0']}
        style={styles.emptyStateGradient}
      >
        <Text style={styles.emptyStateTitle}>🎯 Excellent Performance!</Text>
        <Text style={styles.emptyStateDescription}>
          Your quality metrics are meeting or exceeding all targets. 
          Keep up the great work!
        </Text>
        <Text style={styles.emptyStateSubtitle}>
          Current Quality Score: {qualityMetrics?.overallScore?.toFixed(1) || 'N/A'}/5.0
        </Text>
      </LinearGradient>
    </Animated.View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      {[1, 2, 3].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <View style={styles.skeletonHeader} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonActions} />
        </View>
      ))}
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>Unable to Load Suggestions</Text>
      <Text style={styles.errorDescription}>
        {metricsError?.message || 'Please check your connection and try again.'}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={loadImprovementSuggestions}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  // 🏗️ Main Render
  if (metricsLoading && suggestions.length === 0) {
    return renderLoadingState();
  }

  if (metricsError && suggestions.length === 0) {
    return renderErrorState();
  }

  return (
    <View style={[
      styles.container,
      theme === 'dark' && styles.containerDark,
      compactMode && styles.containerCompact
    ]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Improvement Suggestions
        </Text>
        <Text style={styles.headerSubtitle}>
          {suggestions.length} actionable recommendations
        </Text>
        
        {/* View Mode Selector */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.viewModeContainer}
        >
          {['priority', 'category', 'timeline'].map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.viewModeButton,
                viewMode === mode && styles.viewModeButtonActive
              ]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[
                styles.viewModeText,
                viewMode === mode && styles.viewModeTextActive
              ]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={loadImprovementSuggestions}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {suggestions.length === 0 ? (
          renderEmptyState()
        ) : (
          <View style={styles.suggestionsList}>
            {suggestions.map((suggestion, index) =>
              renderSuggestionCard(suggestion, index)
            )}
          </View>
        )}
      </ScrollView>

      {/* Selected Suggestion Detail Modal */}
      {selectedSuggestion && (
        <BlurView intensity={80} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedSuggestion.title}</Text>
            <Text style={styles.modalDescription}>
              {selectedSuggestion.description}
            </Text>
            
            <ScrollView style={styles.actionsList}>
              {selectedSuggestion.actions.map((action, index) => (
                <Text key={index} style={styles.actionItem}>
                  • {action}
                </Text>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedSuggestion(null)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      )}
    </View>
  );
});

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  containerDark: {
    backgroundColor: '#1F2937',
  },
  containerCompact: {
    maxHeight: 400,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  viewModeContainer: {
    flexDirection: 'row',
  },
  viewModeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  viewModeButtonActive: {
    backgroundColor: '#3B82F6',
  },
  viewModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  viewModeTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  suggestionsList: {
    padding: 16,
  },
  suggestionCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  selectedCard: {
    backgroundColor: '#F0F9FF',
    borderColor: '#3B82F6',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    lineHeight: 20,
  },
  suggestionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  effortBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  effortText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  impactContainer: {
    marginBottom: 12,
  },
  impactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  impactBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  impactFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  metricsContainer: {
    marginBottom: 8,
  },
  metricsText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  timelineContainer: {
    marginBottom: 8,
  },
  timelineText: {
    fontSize: 12,
    color: '#6B7280',
  },
  confidenceContainer: {
    marginBottom: 12,
  },
  confidenceText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  planButton: {
    backgroundColor: '#3B82F6',
  },
  implementedButton: {
    backgroundColor: '#10B981',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyStateGradient: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  emptyStateSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  skeletonHeader: {
    height: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 12,
    width: '70%',
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
    width: '90%',
  },
  skeletonActions: {
    height: 32,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 8,
  },
  errorState: {
    padding: 24,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionsList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  actionItem: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  closeButton: {
    backgroundColor: '#6B7280',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

// 🏗️ Prop Types for Enterprise Development
ImprovementSuggestions.defaultProps = {
  autoRefresh: true,
  showActions: true,
  compactMode: false,
  refreshInterval: 300000,
  maxSuggestions: 10,
  theme: 'light'
};

// 🏗️ Performance Optimization
ImprovementSuggestions.whyDidYouRender = {
  logOnDifferentValues: false,
  customName: 'ImprovementSuggestions'
};

export { ImprovementSuggestions, IMPROVEMENT_CATEGORIES, PRIORITY_LEVELS };
export default ImprovementSuggestions;