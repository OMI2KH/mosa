// expert/quality-badge.jsx

/**
 * 🎯 ENTERPRISE QUALITY BADGE COMPONENT
 * Production-ready quality score display with real-time updates
 * Features: Dynamic tier display, performance metrics, interactive tooltips
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, memo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity,
  Dimensions 
} from 'react-native';
import PropTypes from 'prop-types'; // { added import }
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQualityMetrics } from '../../hooks/use-quality-metrics';
import { Logger } from '../../utils/logger';

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BADGE_SIZES = {
  SMALL: { width: 80, height: 32, fontSize: 12 },
  MEDIUM: { width: 100, height: 40, fontSize: 14 },
  LARGE: { width: 120, height: 48, fontSize: 16 },
  XLARGE: { width: 140, height: 56, fontSize: 18 }
};

const TIER_CONFIG = {
  MASTER: {
    label: 'Master',
    gradient: ['#FFD700', '#FFA500'],
    icon: 'trophy',
    textColor: '#7A5B00',
    shadowColor: '#FFD700',
    minScore: 4.7
  },
  SENIOR: {
    label: 'Senior',
    gradient: ['#C0C0C0', '#A0A0A0'],
    icon: 'star',
    textColor: '#4A4A4A',
    shadowColor: '#C0C0C0',
    minScore: 4.3
  },
  STANDARD: {
    label: 'Standard',
    gradient: ['#CD7F32', '#A56A2B'],
    icon: 'checkmark-circle',
    textColor: '#5D4037',
    shadowColor: '#CD7F32',
    minScore: 4.0
  },
  DEVELOPING: {
    label: 'Developing',
    gradient: ['#90CAF9', '#64B5F6'],
    icon: 'trending-up',
    textColor: '#0D47A1',
    shadowColor: '#90CAF9',
    minScore: 3.5
  },
  PROBATION: {
    label: 'Probation',
    gradient: ['#EF5350', '#E53935'],
    icon: 'warning',
    textColor: '#B71C1C',
    shadowColor: '#EF5350',
    minScore: 0
  }
};

const QualityBadge = memo(({
  expertId,
  qualityScore = 0,
  size = 'MEDIUM',
  showScore = true,
  showTier = true,
  interactive = false,
  onPress,
  animationEnabled = true,
  testID = 'quality-badge'
}) => {
  const logger = new Logger('QualityBadge');
  const { getRealTimeMetrics, subscribeToUpdates } = useQualityMetrics();
  const [currentScore, setCurrentScore] = useState(qualityScore);
  const [isLoading, setIsLoading] = useState(!qualityScore);
  const [scaleAnim] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [showTooltip, setShowTooltip] = useState(false);

  // 🎯 Determine tier based on score
  const determineTier = (score) => {
    if (score >= TIER_CONFIG.MASTER.minScore) return 'MASTER';
    if (score >= TIER_CONFIG.SENIOR.minScore) return 'SENIOR';
    if (score >= TIER_CONFIG.STANDARD.minScore) return 'STANDARD';
    if (score >= TIER_CONFIG.DEVELOPING.minScore) return 'DEVELOPING';
    return 'PROBATION';
  };

  const currentTier = determineTier(currentScore);
  const tierConfig = TIER_CONFIG[currentTier];
  const badgeSize = BADGE_SIZES[size];

  // 🔄 Real-time quality updates
  useEffect(() => {
    let unsubscribe = null;

    const initializeQualityData = async () => {
      try {
        setIsLoading(true);
        
        if (expertId) {
          // Fetch real-time metrics
          const metrics = await getRealTimeMetrics(expertId);
          if (metrics?.qualityScore) {
            setCurrentScore(metrics.qualityScore);
          }

          // Subscribe to real-time updates
          unsubscribe = subscribeToUpdates(expertId, (updatedMetrics) => {
            if (updatedMetrics.qualityScore !== currentScore) {
              animateScoreChange(updatedMetrics.qualityScore);
            }
          });
        }
      } catch (error) {
        logger.error('Failed to initialize quality data', error, { expertId });
      } finally {
        setIsLoading(false);
      }
    };

    initializeQualityData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [expertId]);

  // 🎨 Score change animation
  const animateScoreChange = (newScore) => {
    if (!animationEnabled) {
      setCurrentScore(newScore);
      return;
    }

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setCurrentScore(newScore);
  };

  // 💫 Pulse animation for attention
  const startPulseAnimation = () => {
    if (!animationEnabled) return;

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
  };

  // 🛑 Stop pulse animation
  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // 🎯 Format score display
  const formatScore = (score) => {
    if (score === 0) return 'N/A';
    return score % 1 === 0 ? score.toString() : score.toFixed(1);
  };

  // 📊 Get quality progress percentage
  const getProgressPercentage = () => {
    const currentTierMin = tierConfig.minScore;
    let nextTierMin = 5.0; // Maximum score

    if (currentTier === 'PROBATION') nextTierMin = TIER_CONFIG.DEVELOPING.minScore;
    else if (currentTier === 'DEVELOPING') nextTierMin = TIER_CONFIG.STANDARD.minScore;
    else if (currentTier === 'STANDARD') nextTierMin = TIER_CONFIG.SENIOR.minScore;
    else if (currentTier === 'SENIOR') nextTierMin = TIER_CONFIG.MASTER.minScore;

    const range = nextTierMin - currentTierMin;
    const progress = currentScore - currentTierMin;
    
    return Math.min((progress / range) * 100, 100);
  };

  // 🎨 Render progress bar
  const renderProgressBar = () => {
    if (!showScore || currentTier === 'MASTER') return null;

    const progress = getProgressPercentage();
    
    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View 
            style={[
              styles.progressBarFill,
              { 
                width: `${progress}%`,
                backgroundColor: tierConfig.shadowColor
              }
            ]}
          />
        </View>
      </View>
    );
  };

  // 💬 Render tooltip
  const renderTooltip = () => {
    if (!showTooltip || !interactive) return null;

    const nextTier = 
      currentTier === 'PROBATION' ? 'Developing' :
      currentTier === 'DEVELOPING' ? 'Standard' :
      currentTier === 'STANDARD' ? 'Senior' :
      currentTier === 'SENIOR' ? 'Master' : 'Max Level';

    const pointsToNext = currentTier === 'MASTER' ? 0 : 
      (TIER_CONFIG[
        currentTier === 'PROBATION' ? 'DEVELOPING' :
        currentTier === 'DEVELOPING' ? 'STANDARD' :
        currentTier === 'STANDARD' ? 'SENIOR' : 'MASTER'
      ].minScore - currentScore).toFixed(1);

    return (
      <View style={styles.tooltipContainer}>
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>Quality Rating</Text>
          <View style={styles.tooltipRow}>
            <Text style={styles.tooltipLabel}>Current Score:</Text>
            <Text style={styles.tooltipValue}>{formatScore(currentScore)}/5.0</Text>
          </View>
          <View style={styles.tooltipRow}>
            <Text style={styles.tooltipLabel}>Tier:</Text>
            <Text style={[styles.tooltipValue, { color: tierConfig.textColor }]}>
              {tierConfig.label}
            </Text>
          </View>
          {currentTier !== 'MASTER' && (
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>Next Tier:</Text>
              <Text style={styles.tooltipValue}>
                {nextTier} (+{pointsToNext})
              </Text>
            </View>
          )}
          {renderProgressBar()}
        </View>
        <View style={styles.tooltipArrow} />
      </View>
    );
  };

  // 🎨 Main badge content
  const renderBadgeContent = () => (
    <Animated.View
      style={[
        styles.badgeContainer,
        {
          transform: [
            { scale: scaleAnim },
            { scale: pulseAnim }
          ],
          width: badgeSize.width,
          height: badgeSize.height,
        },
      ]}
    >
      <LinearGradient
        colors={tierConfig.gradient}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Tier Icon */}
        <Ionicons 
          name={tierConfig.icon} 
          size={badgeSize.fontSize} 
          color={tierConfig.textColor}
          style={styles.icon}
        />

        {/* Score Display */}
        {showScore && (
          <Text style={[
            styles.scoreText,
            { 
              fontSize: badgeSize.fontSize,
              color: tierConfig.textColor
            }
          ]}>
            {formatScore(currentScore)}
          </Text>
        )}

        {/* Tier Label */}
        {showTier && (
          <Text style={[
            styles.tierText,
            { 
              fontSize: Math.max(badgeSize.fontSize - 4, 8),
              color: tierConfig.textColor
            }
          ]}>
            {tierConfig.label}
          </Text>
        )}
      </LinearGradient>

      {/* Glow Effect */}
      <View 
        style={[
          styles.glowEffect,
          { 
            shadowColor: tierConfig.shadowColor,
            backgroundColor: tierConfig.shadowColor
          }
        ]} 
      />
    </Animated.View>
  );

  // 🔄 Loading state
  if (isLoading) {
    return (
      <View 
        style={[
          styles.skeletonContainer,
          {
            width: badgeSize.width,
            height: badgeSize.height,
          }
        ]}
        testID={`${testID}-skeleton`}
      >
        <View style={styles.skeletonContent} />
      </View>
    );
  }

  // 🎯 Interactive vs Static badge
  if (interactive) {
    return (
      <View style={styles.interactiveContainer}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={startPulseAnimation}
          onLongPress={() => setShowTooltip(true)}
          onPressOut={() => {
            // merged duplicate handlers: stop pulse animation and hide tooltip
            stopPulseAnimation();
            setShowTooltip(false);
          }}
          delayLongPress={500}
          activeOpacity={0.8}
          testID={testID}
        >
          {renderBadgeContent()}
        </TouchableOpacity>
        {renderTooltip()}
      </View>
    );
  }

  return (
    <View testID={testID}>
      {renderBadgeContent()}
    </View>
  );
});

// 🎨 STYLES
const styles = StyleSheet.create({
  interactiveContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  badgeContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  gradientBackground: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  glowEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    opacity: 0.1,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  icon: {
    marginRight: 4,
  },
  scoreText: {
    fontWeight: '800',
    fontFamily: 'System',
    marginRight: 4,
    includeFontPadding: false,
  },
  tierText: {
    fontWeight: '600',
    fontFamily: 'System',
    includeFontPadding: false,
  },
  skeletonContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#E1E9EE',
  },
  skeletonContent: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // Tooltip Styles
  tooltipContainer: {
    position: 'absolute',
    top: '100%',
    marginTop: 8,
    alignItems: 'center',
    zIndex: 1000,
  },
  tooltip: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 160,
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'white',
    marginTop: -1,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1A1A1A',
  },
  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tooltipLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  tooltipValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  // Progress Bar Styles
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});

// Prop Types
QualityBadge.propTypes = {
  expertId: PropTypes.string,
  qualityScore: PropTypes.number,
  size: PropTypes.oneOf(['SMALL', 'MEDIUM', 'LARGE', 'XLARGE']),
  showScore: PropTypes.bool,
  showTier: PropTypes.bool,
  interactive: PropTypes.bool,
  onPress: PropTypes.func,
  animationEnabled: PropTypes.bool,
  testID: PropTypes.string,
};

QualityBadge.defaultProps = {
  size: 'MEDIUM',
  showScore: true,
  showTier: true,
  interactive: false,
  animationEnabled: true,
};

export { QualityBadge, TIER_CONFIG, BADGE_SIZES };