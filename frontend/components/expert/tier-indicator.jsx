/**
 * 🎯 MOSA FORGE: Enterprise Tier Indicator Component
 * 
 * @component TierIndicator
 * @description Displays expert tier status with dynamic badges, progress tracking, and quality metrics
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Dynamic tier badges with quality scoring
 * - Progress tracking for tier advancement
 * - Performance metrics display
 * - Interactive tier tooltips
 * - Quality threshold indicators
 * - Bonus eligibility display
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';

// 🏗️ Enterprise Constants
const TIER_CONFIG = {
  MASTER: {
    level: 5,
    label: 'Master Tier',
    color: '#FFD700',
    gradient: ['#FFD700', '#FFA500'],
    icon: 'crown',
    bonus: '+20%',
    minScore: 4.7,
    maxStudents: 'Unlimited',
    requirements: {
      qualityScore: 4.7,
      completionRate: 0.8,
      studentSatisfaction: 0.9,
      responseTime: 12
    }
  },
  SENIOR: {
    level: 4,
    label: 'Senior Tier',
    color: '#C0C0C0',
    gradient: ['#E8E8E8', '#C0C0C0'],
    icon: 'award',
    bonus: '+10%',
    minScore: 4.3,
    maxStudents: 100,
    requirements: {
      qualityScore: 4.3,
      completionRate: 0.75,
      studentSatisfaction: 0.85,
      responseTime: 18
    }
  },
  STANDARD: {
    level: 3,
    label: 'Standard Tier',
    color: '#CD7F32',
    gradient: ['#CD7F32', '#8B4513'],
    icon: 'star',
    bonus: 'Base',
    minScore: 4.0,
    maxStudents: 50,
    requirements: {
      qualityScore: 4.0,
      completionRate: 0.7,
      studentSatisfaction: 0.8,
      responseTime: 24
    }
  },
  DEVELOPING: {
    level: 2,
    label: 'Developing',
    color: '#4A90E2',
    gradient: ['#4A90E2', '#357ABD'],
    icon: 'seedling',
    bonus: '-10%',
    minScore: 3.5,
    maxStudents: 25,
    requirements: {
      qualityScore: 3.5,
      completionRate: 0.6,
      studentSatisfaction: 0.7,
      responseTime: 36
    }
  },
  PROBATION: {
    level: 1,
    label: 'Probation',
    color: '#FF6B6B',
    gradient: ['#FF6B6B', '#EE5C5C'],
    icon: 'warning',
    bonus: '-20%',
    minScore: 0,
    maxStudents: 10,
    requirements: {
      qualityScore: 3.5,
      completionRate: 0.5,
      studentSatisfaction: 0.6,
      responseTime: 48
    }
  }
};

const QUALITY_METRICS = {
  QUALITY_SCORE: 'qualityScore',
  COMPLETION_RATE: 'completionRate',
  RESPONSE_TIME: 'responseTime',
  STUDENT_SATISFACTION: 'studentSatisfaction'
};

/**
 * 🏆 Enterprise Tier Indicator Component
 * @param {Object} props
 * @param {string} props.tier - Expert tier (MASTER, SENIOR, STANDARD, DEVELOPING, PROBATION)
 * @param {number} props.qualityScore - Current quality score (0-5)
 * @param {Object} props.metrics - Quality metrics object
 * @param {number} props.metrics.completionRate - Course completion rate (0-1)
 * @param {number} props.metrics.responseTime - Average response time in hours
 * @param {number} props.metrics.studentSatisfaction - Student satisfaction score (0-1)
 * @param {boolean} props.showProgress - Whether to show progress to next tier
 * @param {boolean} props.compact - Compact mode for small spaces
 * @param {Function} props.onPress - Callback when tier badge is pressed
 * @param {string} props.size - Size variant: 'sm', 'md', 'lg'
 * @param {boolean} props.interactive - Whether the badge is interactive
 */
const TierIndicator = ({
  tier = 'STANDARD',
  qualityScore = 4.0,
  metrics = {},
  showProgress = true,
  compact = false,
  onPress,
  size = 'md',
  interactive = true
}) => {
  // 🏗️ State Management
  const [isExpanded, setIsExpanded] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // 🎯 Current Tier Configuration
  const currentTier = useMemo(() => TIER_CONFIG[tier] || TIER_CONFIG.STANDARD, [tier]);

  // 🎯 Next Tier Calculation
  const nextTier = useMemo(() => {
    const tiers = Object.values(TIER_CONFIG);
    const currentIndex = tiers.findIndex(t => t.level === currentTier.level);
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  }, [currentTier]);

  // 🎯 Progress to Next Tier
  const progressToNextTier = useMemo(() => {
    if (!nextTier) return 1; // Master tier is max

    const currentRequirements = currentTier.requirements;
    const nextRequirements = nextTier.requirements;
    
    // Calculate progress based on quality score (primary metric)
    const currentScore = qualityScore;
    const currentMin = currentRequirements.qualityScore;
    const nextMin = nextRequirements.qualityScore;
    
    if (currentScore >= nextMin) return 1;
    if (currentScore <= currentMin) return 0;
    
    return (currentScore - currentMin) / (nextMin - currentMin);
  }, [qualityScore, currentTier, nextTier]);

  // 🎯 Quality Metrics Status
  const metricsStatus = useMemo(() => {
    const status = {};
    const requirements = currentTier.requirements;

    Object.keys(requirements).forEach(key => {
      const currentValue = metrics[key] || 0;
      const requiredValue = requirements[key];
      
      if (key === 'responseTime') {
        // Lower response time is better
        status[key] = {
          current: currentValue,
          required: requiredValue,
          met: currentValue <= requiredValue,
          progress: Math.max(0, Math.min(1, (requiredValue - currentValue) / requiredValue))
        };
      } else {
        // Higher values are better
        status[key] = {
          current: key === 'completionRate' || key === 'studentSatisfaction' 
            ? Math.round(currentValue * 100) 
            : currentValue,
          required: key === 'completionRate' || key === 'studentSatisfaction'
            ? Math.round(requiredValue * 100)
            : requiredValue,
          met: currentValue >= requiredValue,
          progress: Math.max(0, Math.min(1, currentValue / requiredValue))
        };
      }
    });

    return status;
  }, [metrics, currentTier]);

  // 🎯 All Requirements Met for Next Tier
  const canAdvance = useMemo(() => {
    if (!nextTier) return false;
    
    const nextRequirements = nextTier.requirements;
    return Object.keys(nextRequirements).every(key => {
      const currentValue = metrics[key] || 0;
      const requiredValue = nextRequirements[key];
      
      if (key === 'responseTime') {
        return currentValue <= requiredValue;
      }
      return currentValue >= requiredValue;
    });
  }, [metrics, nextTier]);

  // 🎯 Animation Handlers
  const handlePress = useCallback(() => {
    if (!interactive) return;

    if (onPress) {
      onPress({ tier: currentTier, metrics, canAdvance });
      return;
    }

    // Toggle expanded view
    const toValue = isExpanded ? 0 : 1;
    
    Animated.spring(animation, {
      toValue,
      tension: 50,
      friction: 7,
      useNativeDriver: true
    }).start();

    setIsExpanded(!isExpanded);
  }, [interactive, onPress, isExpanded, animation, currentTier, metrics, canAdvance]);

  const handleLongPress = useCallback(() => {
    if (!interactive) return;
    setTooltipVisible(true);
    setTimeout(() => setTooltipVisible(false), 3000);
  }, [interactive]);

  // 🎯 Size Configuration
  const sizeConfig = useMemo(() => {
    const configs = {
      sm: {
        container: 24,
        icon: 12,
        text: 10,
        padding: 4
      },
      md: {
        container: 32,
        icon: 16,
        text: 12,
        padding: 6
      },
      lg: {
        container: 48,
        icon: 20,
        text: 14,
        padding: 8
      }
    };
    return configs[size] || configs.md;
  }, [size]);

  // 🎯 Render Tier Icon
  const renderTierIcon = useCallback(() => {
    const { icon, color } = currentTier;
    const iconSize = sizeConfig.icon;

    switch (icon) {
      case 'crown':
        return <FontAwesome5 name="crown" size={iconSize} color={color} />;
      case 'award':
        return <FontAwesome5 name="award" size={iconSize} color={color} />;
      case 'star':
        return <Ionicons name="star" size={iconSize} color={color} />;
      case 'seedling':
        return <FontAwesome5 name="seedling" size={iconSize} color={color} />;
      case 'warning':
        return <Ionicons name="warning" size={iconSize} color={color} />;
      default:
        return <Ionicons name="star" size={iconSize} color={color} />;
    }
  }, [currentTier, sizeConfig]);

  // 🎯 Render Compact Badge
  const renderCompactBadge = useCallback(() => (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      disabled={!interactive}
      activeOpacity={interactive ? 0.7 : 1}
    >
      <LinearGradient
        colors={currentTier.gradient}
        style={[
          styles.compactBadge,
          {
            width: sizeConfig.container,
            height: sizeConfig.container,
            borderRadius: sizeConfig.container / 2,
            padding: sizeConfig.padding
          }
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {renderTierIcon()}
      </LinearGradient>
    </TouchableOpacity>
  ), [currentTier, sizeConfig, interactive, handlePress, handleLongPress, renderTierIcon]);

  // 🎯 Render Standard Badge
  const renderStandardBadge = useCallback(() => (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      disabled={!interactive}
      activeOpacity={interactive ? 0.7 : 1}
      style={styles.standardContainer}
    >
      <LinearGradient
        colors={currentTier.gradient}
        style={[
          styles.standardBadge,
          {
            paddingHorizontal: sizeConfig.padding * 2,
            paddingVertical: sizeConfig.padding,
            borderRadius: sizeConfig.container / 2
          }
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.badgeContent}>
          {renderTierIcon()}
          <Text style={[
            styles.tierLabel,
            { fontSize: sizeConfig.text, marginLeft: sizeConfig.padding }
          ]}>
            {currentTier.label}
          </Text>
        </View>
        
        {/* Quality Score */}
        <View style={styles.qualityScore}>
          <Text style={[
            styles.qualityScoreText,
            { fontSize: sizeConfig.text - 2 }
          ]}>
            {qualityScore.toFixed(1)}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  ), [currentTier, qualityScore, sizeConfig, interactive, handlePress, handleLongPress, renderTierIcon]);

  // 🎯 Render Progress Bar
  const renderProgressBar = useCallback(() => {
    if (!showProgress || !nextTier) return null;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>{currentTier.label}</Text>
          <Text style={styles.progressLabel}>{nextTier.label}</Text>
        </View>
        
        <View style={styles.progressBar}>
          <LinearGradient
            colors={currentTier.gradient}
            style={[
              styles.progressFill,
              { width: `${progressToNextTier * 100}%` }
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
        
        <Text style={styles.progressText}>
          {canAdvance ? 'Ready for Promotion!' : `${Math.round(progressToNextTier * 100)}% to next tier`}
        </Text>
      </View>
    );
  }, [showProgress, nextTier, currentTier, progressToNextTier, canAdvance]);

  // 🎯 Render Metrics Breakdown
  const renderMetricsBreakdown = useCallback(() => {
    if (!isExpanded) return null;

    return (
      <Animated.View 
        style={[
          styles.metricsContainer,
          {
            opacity: animation,
            transform: [{
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0]
              })
            }]
          }
        ]}
      >
        <BlurView intensity={20} style={styles.metricsBlur}>
          <View style={styles.metricsHeader}>
            <Text style={styles.metricsTitle}>Quality Metrics</Text>
            <Text style={styles.bonusText}>Bonus: {currentTier.bonus}</Text>
          </View>

          {/* Metrics List */}
          {Object.entries(metricsStatus).map(([key, metric]) => (
            <View key={key} style={styles.metricRow}>
              <View style={styles.metricInfo}>
                <Text style={styles.metricName}>
                  {key === 'qualityScore' ? 'Quality Score' :
                   key === 'completionRate' ? 'Completion Rate' :
                   key === 'responseTime' ? 'Response Time' :
                   'Satisfaction'}
                </Text>
                <Text style={styles.metricValue}>
                  {key === 'responseTime' ? `${metric.current}h` :
                   key === 'completionRate' || key === 'studentSatisfaction' ? `${metric.current}%` :
                   metric.current}
                  <Text style={styles.metricRequired}>
                    / {key === 'responseTime' ? `${metric.required}h` :
                       key === 'completionRate' || key === 'studentSatisfaction' ? `${metric.required}%` :
                       metric.required}
                  </Text>
                </Text>
              </View>
              
              <View style={styles.metricStatus}>
                {metric.met ? (
                  <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
                ) : (
                  <MaterialIcons name="error" size={20} color="#FF6B6B" />
                )}
              </View>
            </View>
          ))}

          {/* Next Tier Requirements */}
          {nextTier && (
            <View style={styles.nextTierContainer}>
              <Text style={styles.nextTierTitle}>
                Next: {nextTier.label} ({nextTier.bonus} Bonus)
              </Text>
              <View style={styles.requirementsList}>
                {Object.entries(nextTier.requirements).map(([key, value]) => (
                  <Text key={key} style={styles.requirementText}>
                    • {key === 'qualityScore' ? 'Quality Score' :
                       key === 'completionRate' ? 'Completion Rate' :
                       key === 'responseTime' ? 'Response Time' :
                       'Satisfaction'}: {
                      key === 'completionRate' || key === 'studentSatisfaction' ? 
                      `${Math.round(value * 100)}%` : 
                      key === 'responseTime' ? `${value}h` : value
                    }
                  </Text>
                ))}
              </View>
            </View>
          )}
        </BlurView>
      </Animated.View>
    );
  }, [isExpanded, animation, currentTier, metricsStatus, nextTier]);

  // 🎯 Render Tooltip
  const renderTooltip = useCallback(() => {
    if (!tooltipVisible) return null;

    return (
      <View style={styles.tooltip}>
        <Text style={styles.tooltipTitle}>{currentTier.label}</Text>
        <Text style={styles.tooltipText}>
          Quality: {qualityScore.toFixed(1)} • Bonus: {currentTier.bonus}
        </Text>
        <Text style={styles.tooltipText}>
          Capacity: {currentTier.maxStudents} students
        </Text>
      </View>
    );
  }, [tooltipVisible, currentTier, qualityScore]);

  // 🎯 Main Render
  return (
    <View style={styles.container}>
      {compact ? renderCompactBadge() : renderStandardBadge()}
      
      {renderProgressBar()}
      {renderMetricsBreakdown()}
      {renderTooltip()}
    </View>
  );
};

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
  },
  compactBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  standardContainer: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  standardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 120,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  qualityScore: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  qualityScoreText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 12,
    width: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  metricsContainer: {
    marginTop: 16,
    width: Dimensions.get('window').width * 0.8,
    maxWidth: 320,
  },
  metricsBlur: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
  },
  metricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  metricsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  bonusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  metricInfo: {
    flex: 1,
  },
  metricName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  metricRequired: {
    fontSize: 12,
    fontWeight: '400',
    color: '#888',
  },
  metricStatus: {
    marginLeft: 12,
  },
  nextTierContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  nextTierTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  requirementsList: {
    paddingLeft: 8,
  },
  requirementText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  tooltip: {
    position: 'absolute',
    top: -80,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 12,
    borderRadius: 8,
    minWidth: 160,
    zIndex: 1000,
  },
  tooltipTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
    marginBottom: 2,
  },
});

// 🏗️ Performance Optimization
export default React.memo(TierIndicator);

// 🏗️ Prop Types for Enterprise Development
/**
 * @type {React.ComponentType<{
 *   tier: 'MASTER' | 'SENIOR' | 'STANDARD' | 'DEVELOPING' | 'PROBATION'
 *   qualityScore: number
 *   metrics: {
 *     completionRate: number
 *     responseTime: number
 *     studentSatisfaction: number
 *   }
 *   showProgress: boolean
 *   compact: boolean
 *   onPress: Function
 *   size: 'sm' | 'md' | 'lg'
 *   interactive: boolean
 * }>}
 */
export { TierIndicator };