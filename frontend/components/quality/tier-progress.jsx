/**
 * 🎯 MOSA FORGE: Enterprise Tier Progress Tracker Component
 * 
 * @component TierProgress
 * @description Real-time tier advancement tracker with quality metrics visualization
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time tier progression tracking
 * - Quality metrics visualization
 * - Performance-based advancement predictions
 * - Interactive goal setting
 * - Multi-tier progression system
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useQualityMetrics } from '../hooks/use-quality-metrics';
import { usePerformanceAnalytics } from '../hooks/use-performance-analytics';

// 🏗️ Enterprise Constants
const TIER_DEFINITIONS = {
  MASTER: {
    level: 5,
    minScore: 4.7,
    studentLimit: 'Unlimited',
    bonus: '+20%',
    color: '#FFD700',
    gradient: ['#FFD700', '#FFA500'],
    requirements: {
      qualityScore: 4.7,
      completionRate: 0.8,
      responseTime: 12,
      studentSatisfaction: 0.9
    }
  },
  SENIOR: {
    level: 4,
    minScore: 4.3,
    studentLimit: 100,
    bonus: '+10%',
    color: '#C0C0C0',
    gradient: ['#E8E8E8', '#C0C0C0'],
    requirements: {
      qualityScore: 4.3,
      completionRate: 0.75,
      responseTime: 18,
      studentSatisfaction: 0.85
    }
  },
  STANDARD: {
    level: 3,
    minScore: 4.0,
    studentLimit: 50,
    bonus: 'Base',
    color: '#CD7F32',
    gradient: ['#CD7F32', '#8B4513'],
    requirements: {
      qualityScore: 4.0,
      completionRate: 0.7,
      responseTime: 24,
      studentSatisfaction: 0.8
    }
  },
  DEVELOPING: {
    level: 2,
    minScore: 3.5,
    studentLimit: 25,
    bonus: '-10%',
    color: '#6B7280',
    gradient: ['#9CA3AF', '#6B7280'],
    requirements: {
      qualityScore: 3.5,
      completionRate: 0.6,
      responseTime: 36,
      studentSatisfaction: 0.7
    }
  },
  PROBATION: {
    level: 1,
    minScore: 0,
    studentLimit: 10,
    bonus: '-20%',
    color: '#EF4444',
    gradient: ['#F87171', '#EF4444'],
    requirements: {
      qualityScore: 3.5,
      completionRate: 0.5,
      responseTime: 48,
      studentSatisfaction: 0.6
    }
  }
};

const TIER_LEVELS = ['PROBATION', 'DEVELOPING', 'STANDARD', 'SENIOR', 'MASTER'];

/**
 * 🏗️ Enterprise Tier Progress Tracker Component
 * @param {Object} props
 * @param {string} props.expertId - Expert identifier
 * @param {boolean} props.realtime - Enable real-time updates
 * @param {Function} props.onTierChange - Tier change callback
 * @param {Object} props.style - Custom styling
 */
const TierProgress = memo(({
  expertId,
  realtime = true,
  onTierChange,
  style,
  showDetails = true,
  compact = false
}) => {
  // 🏗️ State Management
  const [currentTier, setCurrentTier] = useState('STANDARD');
  const [progressData, setProgressData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [animation] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [expanded, setExpanded] = useState(!compact);

  // 🏗️ Custom Hooks
  const { 
    qualityMetrics, 
    refreshMetrics, 
    subscribeToUpdates 
  } = useQualityMetrics(expertId);

  const {
    trackTierView,
    trackTierInteraction,
    calculateAdvancementProbability
  } = usePerformanceAnalytics();

  // 🏗️ Animation Sequences
  const startProgressAnimation = useCallback(() => {
    Animated.parallel([
      Animated.timing(animation, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
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
      ),
    ]).start();
  }, [animation, pulseAnim]);

  // 🏗️ Tier Calculation Logic
  const calculateCurrentTier = useCallback((metrics) => {
    if (!metrics) return 'STANDARD';

    const { qualityScore, completionRate, averageResponseTime, studentSatisfaction } = metrics;

    // 🎯 Advanced Tier Calculation Algorithm
    if (qualityScore >= 4.7 && completionRate >= 0.8 && studentSatisfaction >= 0.9) {
      return 'MASTER';
    } else if (qualityScore >= 4.3 && completionRate >= 0.75 && studentSatisfaction >= 0.85) {
      return 'SENIOR';
    } else if (qualityScore >= 4.0 && completionRate >= 0.7 && studentSatisfaction >= 0.8) {
      return 'STANDARD';
    } else if (qualityScore >= 3.5 && completionRate >= 0.6 && studentSatisfaction >= 0.7) {
      return 'DEVELOPING';
    } else {
      return 'PROBATION';
    }
  }, []);

  // 🏗️ Progress Calculation
  const calculateTierProgress = useCallback((metrics, targetTier) => {
    if (!metrics || !targetTier) return 0;

    const currentTierIndex = TIER_LEVELS.indexOf(currentTier);
    const targetTierIndex = TIER_LEVELS.indexOf(targetTier);

    if (targetTierIndex <= currentTierIndex) return 100;

    const tierRequirements = TIER_DEFINITIONS[targetTier].requirements;
    let progress = 0;

    // Calculate progress based on metric requirements
    if (metrics.qualityScore) {
      const qualityProgress = Math.min(100, (metrics.qualityScore / tierRequirements.qualityScore) * 100);
      progress += qualityProgress * 0.4; // 40% weight
    }

    if (metrics.completionRate) {
      const completionProgress = Math.min(100, (metrics.completionRate / tierRequirements.completionRate) * 100);
      progress += completionProgress * 0.3; // 30% weight
    }

    if (metrics.averageResponseTime) {
      const responseProgress = Math.min(100, ((48 - metrics.averageResponseTime) / (48 - tierRequirements.responseTime)) * 100);
      progress += responseProgress * 0.2; // 20% weight
    }

    if (metrics.studentSatisfaction) {
      const satisfactionProgress = Math.min(100, (metrics.studentSatisfaction / tierRequirements.studentSatisfaction) * 100);
      progress += satisfactionProgress * 0.1; // 10% weight
    }

    return Math.max(0, Math.min(100, progress));
  }, [currentTier]);

  // 🏗️ Data Loading Effect
  useEffect(() => {
    const loadTierData = async () => {
      try {
        setIsLoading(true);
        await refreshMetrics();
        trackTierView(expertId, currentTier);
      } catch (error) {
        console.error('Failed to load tier data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTierData();
  }, [expertId, refreshMetrics, trackTierView]);

  // 🏗️ Real-time Updates
  useEffect(() => {
    if (!realtime || !expertId) return;

    const unsubscribe = subscribeToUpdates((newMetrics) => {
      const newTier = calculateCurrentTier(newMetrics);
      
      if (newTier !== currentTier) {
        setCurrentTier(newTier);
        onTierChange?.(newTier, currentTier);
        
        // 🎉 Tier Change Celebration
        if (TIER_LEVELS.indexOf(newTier) > TIER_LEVELS.indexOf(currentTier)) {
          triggerTierAdvancementCelebration(newTier);
        }
      }

      setProgressData(newMetrics);
    });

    return unsubscribe;
  }, [expertId, realtime, subscribeToUpdates, calculateCurrentTier, currentTier, onTierChange]);

  // 🏗️ Animation Trigger
  useEffect(() => {
    if (!isLoading && progressData) {
      startProgressAnimation();
    }
  }, [isLoading, progressData, startProgressAnimation]);

  // 🏗️ Tier Advancement Celebration
  const triggerTierAdvancementCelebration = (newTier) => {
    Alert.alert(
      '🎉 Tier Advancement!',
      `Congratulations! You've been promoted to ${newTier} Tier!`,
      [
        {
          text: 'View Benefits',
          onPress: () => showTierBenefits(newTier)
        },
        {
          text: 'Continue',
          style: 'cancel'
        }
      ]
    );
  };

  // 🏗️ Tier Benefits Modal
  const showTierBenefits = (tier) => {
    const benefits = TIER_DEFINITIONS[tier];
    Alert.alert(
      `${tier} Tier Benefits`,
      `• Student Limit: ${benefits.studentLimit}\n• Performance Bonus: ${benefits.bonus}\n• Quality Requirements: ${benefits.minScore}+ rating\n• Enhanced Visibility`,
      [{ text: 'Got It', style: 'default' }]
    );
  };

  // 🏗️ Progress Bar Component
  const ProgressBar = memo(({ progress, color, height = 8, animated = true }) => {
    const [widthAnim] = useState(new Animated.Value(0));

    useEffect(() => {
      if (animated) {
        Animated.timing(widthAnim, {
          toValue: progress,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      } else {
        widthAnim.setValue(progress);
      }
    }, [progress, animated, widthAnim]);

    return (
      <View style={[styles.progressBarContainer, { height }]}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              backgroundColor: color,
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    );
  });

  // 🏗️ Tier Badge Component
  const TierBadge = memo(({ tier, size = 'medium' }) => {
    const tierConfig = TIER_DEFINITIONS[tier] || TIER_DEFINITIONS.STANDARD;
    const sizeStyles = {
      small: { width: 24, height: 24 },
      medium: { width: 40, height: 40 },
      large: { width: 60, height: 60 }
    };

    return (
      <LinearGradient
        colors={tierConfig.gradient}
        style={[styles.tierBadge, sizeStyles[size]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[styles.tierBadgeText, styles[`tierBadgeText${size}`]]}>
          {tier.charAt(0)}
        </Text>
      </LinearGradient>
    );
  });

  // 🏗️ Metric Indicator Component
  const MetricIndicator = memo(({ label, value, target, format = 'percentage' }) => {
    const isMet = value >= target;
    const progress = Math.min(100, (value / target) * 100);

    const formatValue = (val) => {
      switch (format) {
        case 'percentage':
          return `${(val * 100).toFixed(1)}%`;
        case 'hours':
          return `${val}h`;
        case 'rating':
          return val.toFixed(1);
        default:
          return val;
      }
    };

    return (
      <View style={styles.metricContainer}>
        <View style={styles.metricHeader}>
          <Text style={styles.metricLabel}>{label}</Text>
          <Text style={[styles.metricValue, isMet && styles.metricValueMet]}>
            {formatValue(value)} / {formatValue(target)}
          </Text>
        </View>
        <ProgressBar
          progress={progress}
          color={isMet ? '#10B981' : '#EF4444'}
          height={6}
        />
      </View>
    );
  });

  // 🏗️ Next Tier Preview
  const NextTierPreview = memo(() => {
    const currentIndex = TIER_LEVELS.indexOf(currentTier);
    const nextTier = currentIndex < TIER_LEVELS.length - 1 ? TIER_LEVELS[currentIndex + 1] : null;

    if (!nextTier || !progressData) return null;

    const nextTierConfig = TIER_DEFINITIONS[nextTier];
    const progressToNextTier = calculateTierProgress(progressData, nextTier);
    const advancementProbability = calculateAdvancementProbability(progressData, nextTier);

    return (
      <BlurView intensity={80} style={styles.nextTierContainer}>
        <View style={styles.nextTierHeader}>
          <TierBadge tier={nextTier} size="small" />
          <Text style={styles.nextTierTitle}>Next: {nextTier} Tier</Text>
          <Text style={styles.nextTierProgress}>{progressToNextTier.toFixed(0)}%</Text>
        </View>
        
        <ProgressBar 
          progress={progressToNextTier} 
          color={nextTierConfig.color}
          animated={true}
        />

        <View style={styles.advancementInfo}>
          <Text style={styles.probabilityText}>
            Advancement Probability: {advancementProbability}%
          </Text>
          <Text style={styles.bonusText}>
            Potential Bonus: {nextTierConfig.bonus}
          </Text>
        </View>

        {showDetails && (
          <View style={styles.requirementsGrid}>
            <Text style={styles.requirementsTitle}>Requirements:</Text>
            <MetricIndicator
              label="Quality Score"
              value={progressData.qualityScore || 0}
              target={nextTierConfig.requirements.qualityScore}
              format="rating"
            />
            <MetricIndicator
              label="Completion Rate"
              value={progressData.completionRate || 0}
              target={nextTierConfig.requirements.completionRate}
              format="percentage"
            />
            <MetricIndicator
              label="Response Time"
              value={progressData.averageResponseTime || 48}
              target={nextTierConfig.requirements.responseTime}
              format="hours"
            />
            <MetricIndicator
              label="Student Satisfaction"
              value={progressData.studentSatisfaction || 0}
              target={nextTierConfig.requirements.studentSatisfaction}
              format="percentage"
            />
          </View>
        )}
      </BlurView>
    );
  });

  // 🏗️ Main Tier Progress Visualization
  const TierProgressVisualization = memo(() => {
    const currentIndex = TIER_LEVELS.indexOf(currentTier);
    const progressWidth = Dimensions.get('window').width - 80;

    return (
      <View style={styles.tierProgressContainer}>
        <View style={styles.tierTrack} />
        
        {TIER_LEVELS.map((tier, index) => {
          const tierConfig = TIER_DEFINITIONS[tier];
          const isCurrent = tier === currentTier;
          const isAchieved = index <= currentIndex;
          const position = (index / (TIER_LEVELS.length - 1)) * progressWidth;

          return (
            <Animated.View
              key={tier}
              style={[
                styles.tierMarker,
                {
                  left: position,
                  transform: [
                    { scale: isCurrent ? pulseAnim : new Animated.Value(1) }
                  ]
                }
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  trackTierInteraction('tier_marker_press', tier);
                  showTierBenefits(tier);
                }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={isAchieved ? tierConfig.gradient : ['#9CA3AF', '#6B7280']}
                  style={[
                    styles.tierMarkerCircle,
                    isCurrent && styles.currentTierMarker
                  ]}
                >
                  <Text style={[
                    styles.tierMarkerText,
                    isCurrent && styles.currentTierMarkerText
                  ]}>
                    {tierConfig.level}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <Text style={[
                styles.tierLabel,
                isCurrent && styles.currentTierLabel
              ]}>
                {tier}
              </Text>
              
              {isCurrent && (
                <View style={styles.currentTierIndicator}>
                  <Text style={styles.currentTierText}>Current Tier</Text>
                </View>
              )}
            </Animated.View>
          );
        })}
      </View>
    );
  });

  // 🏗️ Loading State
  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.skeletonContainer}>
          <View style={styles.skeletonHeader} />
          <View style={styles.skeletonProgress} />
          <View style={styles.skeletonMetrics} />
        </View>
      </View>
    );
  }

  // 🏗️ Main Render
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={['#F8FAFC', '#E2E8F0']}
        style={styles.gradientBackground}
      >
        {/* 🎯 Header Section */}
        <View style={styles.header}>
          <View style={styles.tierInfo}>
            <TierBadge tier={currentTier} size="large" />
            <View style={styles.tierDetails}>
              <Text style={styles.currentTierTitle}>{currentTier} Tier</Text>
              <Text style={styles.tierDescription}>
                {TIER_DEFINITIONS[currentTier].bonus} Bonus • {TIER_DEFINITIONS[currentTier].studentLimit} Students
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
            style={styles.expandButton}
          >
            <Text style={styles.expandButtonText}>
              {expanded ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 🎯 Progress Visualization */}
        <TierProgressVisualization />

        {/* 🎯 Expanded Details */}
        {expanded && (
          <Animated.View 
            style={[
              styles.expandedContent,
              {
                opacity: animation,
                transform: [
                  {
                    translateY: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* 🎯 Next Tier Preview */}
            <NextTierPreview />

            {/* 🎯 Quick Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => trackTierInteraction('improvement_plan', currentTier)}
              >
                <Text style={styles.actionButtonText}>View Improvement Plan</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryAction]}
                onPress={refreshMetrics}
              >
                <Text style={styles.secondaryActionText}>Refresh Metrics</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </LinearGradient>
    </View>
  );
});

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  gradientBackground: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  tierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierDetails: {
    marginLeft: 12,
  },
  currentTierTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  tierDescription: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  expandButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
  },
  tierProgressContainer: {
    height: 80,
    marginBottom: 24,
    position: 'relative',
  },
  tierTrack: {
    position: 'absolute',
    top: 35,
    left: 20,
    right: 20,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  tierMarker: {
    position: 'absolute',
    alignItems: 'center',
    top: 0,
  },
  tierMarkerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  currentTierMarker: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  tierMarkerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  currentTierMarkerText: {
    fontSize: 16,
  },
  tierLabel: {
    marginTop: 8,
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  currentTierLabel: {
    color: '#1F2937',
    fontWeight: '800',
    fontSize: 12,
  },
  currentTierIndicator: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
  },
  currentTierText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  expandedContent: {
    marginTop: 8,
  },
  nextTierContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(229, 231, 235, 0.8)',
  },
  nextTierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextTierTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  nextTierProgress: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10B981',
  },
  advancementInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  probabilityText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  bonusText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
  requirementsGrid: {
    marginTop: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  metricContainer: {
    marginBottom: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },
  metricValueMet: {
    color: '#10B981',
  },
  progressBarContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryAction: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryActionText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  tierBadge: {
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  tierBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  tierBadgeTextsmall: {
    fontSize: 10,
  },
  tierBadgeTextmedium: {
    fontSize: 16,
  },
  tierBadgeTextlarge: {
    fontSize: 20,
  },
  // Skeleton Loading Styles
  skeletonContainer: {
    padding: 20,
  },
  skeletonHeader: {
    height: 60,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 16,
  },
  skeletonProgress: {
    height: 80,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 16,
  },
  skeletonMetrics: {
    height: 120,
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
  },
});

// 🏗️ Performance Optimization
TierProgress.whyDidYouRender = {
  logOnDifferentValues: false,
  customName: 'TierProgress'
};

export { TierProgress, TIER_DEFINITIONS };
export default TierProgress;