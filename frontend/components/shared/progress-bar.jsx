// shared/progress-bar.jsx

/**
 * 🎯 ENTERPRISE PROGRESS BAR COMPONENT
 * Production-ready progress indicators for Mosa Forge
 * Features: Multi-type progress bars, animations, accessibility, real-time updates
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  AccessibilityInfo,
  Platform,
  I18nManager
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQualityMetrics } from '../../hooks/use-quality-metrics';

// 🎨 Design System Constants
const PROGRESS_CONFIG = {
  // Animation Config
  ANIMATION_DURATION: 800,
  SPRING_CONFIG: { tension: 120, friction: 14 },

  // Color Schemes
  COLOR_SCHEMES: {
    PRIMARY: ['#00C6FF', '#0072FF'],
    SUCCESS: ['#00D27A', '#00B16A'],
    WARNING: ['#FFB800', '#FF9500'],
    DANGER: ['#FF3B30', '#FF2D55'],
    QUALITY_MASTER: ['#8A2BE2', '#4B0082'],
    QUALITY_SENIOR: ['#00C9FF', '#0095FF'],
    QUALITY_STANDARD: ['#00D2FF', '#00B8FF']
  },

  // Size Variants
  SIZES: {
    SMALL: { height: 6, fontSize: 10, borderRadius: 3 },
    MEDIUM: { height: 12, fontSize: 12, borderRadius: 6 },
    LARGE: { height: 16, fontSize: 14, borderRadius: 8 },
    XLARGE: { height: 20, fontSize: 16, borderRadius: 10 }
  },

  // Quality Thresholds
  QUALITY_THRESHOLDS: {
    MASTER: 90,
    SENIOR: 80,
    STANDARD: 70,
    DEVELOPING: 60,
    WARNING: 50
  }
};

/**
 * 🎯 ENTERPRISE PROGRESS BAR COMPONENT
 */
const ProgressBar = React.memo(({
  // Core Props
  progress = 0,
  total = 100,
  type = 'default',
  variant = 'linear',
  size = 'medium',
  showLabel = true,
  showPercentage = true,
  animated = true,
  qualityBased = false,

  // Styling Props
  colorScheme = 'primary',
  customColors,
  gradient = true,
  striped = false,
  animatedStripes = false,

  // Label Configuration
  labelPosition = 'top',
  customLabel,
  formatLabel,
  labelStyle,

  // Accessibility
  accessibilityLabel,
  accessibilityHint,

  // Animation
  animationType = 'spring',
  delay = 0,

  // Quality Integration
  qualityMetric,
  expertTier,

  // Events
  onProgressComplete,
  onQualityChange,

  // Performance
  throttleUpdates = true,

  ...rest
}) => {
  // 🎯 STATE MANAGEMENT
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);
  const [previousQuality, setPreviousQuality] = useState(null);

  // 🔧 REFS
  const animationProgress = useRef(new Animated.Value(0)).current;
  const stripeAnimation = useRef(new Animated.Value(0)).current;
  const throttleTimeout = useRef(null);
  const mounted = useRef(true);

  // 🎯 HOOKS
  const { getQualityColor, calculateQualityScore } = useQualityMetrics();

  // 📊 CALCULATED VALUES
  const normalizedProgress = Math.max(0, Math.min(100, (progress / total) * 100));
  const percentage = Math.round(normalizedProgress);
  const currentSize = PROGRESS_CONFIG.SIZES[size] || PROGRESS_CONFIG.SIZES.MEDIUM;

  // 🎨 COLOR MANAGEMENT
  const colors = React.useMemo(() => {
    if (customColors) return customColors;
    if (qualityBased && qualityMetric) {
      return getQualityColor(qualityMetric, expertTier);
    }
    return PROGRESS_CONFIG.COLOR_SCHEMES[colorScheme] || PROGRESS_CONFIG.COLOR_SCHEMES.PRIMARY;
  }, [customColors, qualityBased, qualityMetric, expertTier, colorScheme, getQualityColor]);

  // 🏷️ LABEL GENERATION
  const progressLabel = React.useMemo(() => {
    if (customLabel) return customLabel;
    if (formatLabel) return formatLabel(progress, total, percentage);
    
    if (qualityBased && qualityMetric) {
      return `Quality Score: ${qualityMetric}/100`;
    }
    
    return showPercentage ? `${percentage}%` : `${progress}/${total}`;
  }, [customLabel, formatLabel, progress, total, percentage, qualityBased, qualityMetric, showPercentage]);

  // ♿ ACCESSIBILITY
  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      handleAccessibilityChange
    );
    AccessibilityInfo.isScreenReaderEnabled().then(handleAccessibilityChange);

    return () => {
      subscription.remove();
      mounted.current = false;
    };
  }, []);

  // 📈 PROGRESS ANIMATION
  useEffect(() => {
    if (!mounted.current) return;

    const updateProgress = () => {
      const targetProgress = normalizedProgress / 100;

      if (animated) {
        if (animationType === 'spring') {
          Animated.spring(animationProgress, {
            toValue: targetProgress,
            ...PROGRESS_CONFIG.SPRING_CONFIG,
            useNativeDriver: false,
          }).start(handleAnimationComplete);
        } else {
          Animated.timing(animationProgress, {
            toValue: targetProgress,
            duration: PROGRESS_CONFIG.ANIMATION_DURATION,
            delay,
            useNativeDriver: false,
          }).start(handleAnimationComplete);
        }
      } else {
        animationProgress.setValue(targetProgress);
        setDisplayProgress(normalizedProgress);
      }
    };

    if (throttleUpdates && throttleTimeout.current) {
      clearTimeout(throttleTimeout.current);
    }

    const executeUpdate = throttleUpdates 
      ? () => {
          throttleTimeout.current = setTimeout(updateProgress, 16);
        }
      : updateProgress;

    executeUpdate();

    return () => {
      if (throttleTimeout.current) {
        clearTimeout(throttleTimeout.current);
      }
    };
  }, [normalizedProgress, animated, animationType, delay, throttleUpdates]);

  // 🎪 STRIPE ANIMATION
  useEffect(() => {
    if (striped && animatedStripes) {
      const animation = Animated.loop(
        Animated.timing(stripeAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        })
      );
      animation.start();

      return () => animation.stop();
    }
  }, [striped, animatedStripes]);

  // 🎯 QUALITY METRICS TRACKING
  useEffect(() => {
    if (qualityBased && qualityMetric !== previousQuality) {
      onQualityChange?.({
        previousQuality,
        currentQuality: qualityMetric,
        tier: expertTier,
        progress: normalizedProgress
      });
      setPreviousQuality(qualityMetric);
    }
  }, [qualityBased, qualityMetric, previousQuality, expertTier, normalizedProgress, onQualityChange]);

  // 🔧 EVENT HANDLERS
  const handleAccessibilityChange = (enabled) => {
    setIsAccessibilityEnabled(enabled);
  };

  const handleAnimationComplete = ({ finished }) => {
    if (finished && mounted.current) {
      setDisplayProgress(normalizedProgress);
      
      if (normalizedProgress >= 100) {
        onProgressComplete?.({
          progress: normalizedProgress,
          actualProgress: progress,
          total,
          timestamp: Date.now()
        });
      }
    }
  };

  const getAccessibilityLabel = () => {
    if (accessibilityLabel) return accessibilityLabel;
    
    if (qualityBased) {
      return `Quality progress: ${qualityMetric} percent. ${expertTier} tier.`;
    }
    
    return `Progress: ${progressLabel}. ${percentage} percent complete.`;
  };

  // 🎨 RENDER HELPERS
  const renderLabel = () => {
    if (!showLabel) return null;

    const labelComponent = (
      <Text
        style={[
          styles.label,
          labelStyle,
          {
            fontSize: currentSize.fontSize,
            color: getTextColor()
          }
        ]}
        numberOfLines={1}
        accessible={false} // Parent handles accessibility
      >
        {progressLabel}
      </Text>
    );

    switch (labelPosition) {
      case 'top':
        return (
          <View style={styles.labelContainer}>
            {labelComponent}
          </View>
        );
      case 'bottom':
        return (
          <View style={[styles.labelContainer, styles.labelBottom]}>
            {labelComponent}
          </View>
        );
      case 'inside':
        return (
          <View style={styles.insideLabelContainer}>
            {labelComponent}
          </View>
        );
      case 'floating':
        return (
          <View 
            style={[
              styles.floatingLabel,
              { left: `${Math.min(percentage, 95)}%` }
            ]}
            pointerEvents="none"
          >
            {labelComponent}
          </View>
        );
      default:
        return null;
    }
  };

  const renderProgressBar = () => {
    const progressStyle = {
      height: currentSize.height,
      borderRadius: currentSize.borderRadius,
      transform: [
        {
          scaleX: animationProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1]
          })
        }
      ]
    };

    const stripeStyle = striped ? {
      transform: [
        {
          translateX: stripeAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 20]
          })
        }
      ]
    } : {};

    return (
      <View style={[styles.track, { height: currentSize.height, borderRadius: currentSize.borderRadius }]}>
        <Animated.View 
          style={[
            styles.progress,
            progressStyle,
            gradient ? null : { backgroundColor: colors[0] },
            striped && styles.striped,
            stripeStyle
          ]}
        >
          {gradient && (
            <LinearGradient
              colors={colors}
              start={[0, 0]}
              end={[1, 0]}
              style={StyleSheet.absoluteFill}
            />
          )}
          {labelPosition === 'inside' && renderLabel()}
        </Animated.View>
        
        {labelPosition === 'floating' && renderLabel()}
      </View>
    );
  };

  const getTextColor = () => {
    // Adaptive text color based on background
    const backgroundColor = colors[0];
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  // 🎯 MAIN RENDER
  return (
    <View
      style={[styles.container, rest.style]}
      accessible={true}
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityHint={accessibilityHint || `Progress indicator showing ${progressLabel}`}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: percentage
      }}
      importantForAccessibility="yes"
    >
      {labelPosition === 'top' && renderLabel()}
      
      <View style={styles.barContainer}>
        {renderProgressBar()}
      </View>

      {labelPosition === 'bottom' && renderLabel()}
    </View>
  );
});

/**
 * 🎯 SPECIALIZED PROGRESS BAR VARIANTS
 */

// 📊 QUALITY SCORE PROGRESS BAR
export const QualityProgressBar = React.memo(({ qualityScore, expertTier, ...props }) => {
  const { getQualityDisplayInfo } = useQualityMetrics();
  const { color, label, tier } = getQualityDisplayInfo(qualityScore, expertTier);

  return (
    <ProgressBar
      progress={qualityScore}
      total={100}
      qualityBased={true}
      qualityMetric={qualityScore}
      expertTier={tier}
      colorScheme={color}
      customLabel={label}
      showPercentage={true}
      size="medium"
      variant="linear"
      {...props}
    />
  );
});

// 🎓 LEARNING PROGRESS BAR
export const LearningProgressBar = React.memo(({ 
  completedExercises, 
  totalExercises, 
  phase,
  ...props 
}) => {
  const getPhaseColor = (phase) => {
    const phaseColors = {
      mindset: ['#FF6B6B', '#FF8E53'],
      theory: ['#4ECDC4', '#00B4DB'],
      handsOn: ['#45B7D1', '#96C93D'],
      certification: ['#FFA62E', '#EA384D']
    };
    return phaseColors[phase] || PROGRESS_CONFIG.COLOR_SCHEMES.PRIMARY;
  };

  return (
    <ProgressBar
      progress={completedExercises}
      total={totalExercises}
      customColors={getPhaseColor(phase)}
      customLabel={`${phase.charAt(0).toUpperCase() + phase.slice(1)}: ${completedExercises}/${totalExercises}`}
      showPercentage={false}
      size="large"
      {...props}
    />
  );
});

// 💰 REVENUE PROGRESS BAR
export const RevenueProgressBar = React.memo(({ currentRevenue, targetRevenue, payoutPhase, ...props }) => {
  const getPayoutColor = (phase) => {
    const payoutColors = {
      upfront: ['#00C9FF', '#0095FF'],
      milestone: ['#00D2FF', '#00B8FF'],
      completion: ['#00D27A', '#00B16A']
    };
    return payoutColors[phase] || PROGRESS_CONFIG.COLOR_SCHEMES.PRIMARY;
  };

  const formatRevenueLabel = (current, target) => {
    return `Revenue: ${current.toLocaleString()} ETB / ${target.toLocaleString()} ETB`;
  };

  return (
    <ProgressBar
      progress={currentRevenue}
      total={targetRevenue}
      customColors={getPayoutColor(payoutPhase)}
      formatLabel={formatRevenueLabel}
      showPercentage={false}
      size="medium"
      {...props}
    />
  );
});

// 🏆 TIER PROGRESS BAR
export const TierProgressBar = React.memo(({ currentTier, nextTier, progressToNextTier, ...props }) => {
  const tierRequirements = {
    STANDARD: { min: 0, max: 70, color: ['#00C9FF', '#0095FF'] },
    SENIOR: { min: 70, max: 80, color: ['#00D2FF', '#00B8FF'] },
    MASTER: { min: 80, max: 90, color: ['#8A2BE2', '#4B0082'] }
  };

  const currentTierReq = tierRequirements[currentTier] || tierRequirements.STANDARD;
  const normalizedProgress = ((progressToNextTier - currentTierReq.min) / 
                            (currentTierReq.max - currentTierReq.min)) * 100;

  return (
    <ProgressBar
      progress={normalizedProgress}
      total={100}
      customColors={currentTierReq.color}
      customLabel={`${currentTier} → ${nextTier}: ${Math.round(progressToNextTier)}%`}
      showPercentage={true}
      size="small"
      {...props}
    />
  );
});

// 🎨 STYLES
const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 4,
  },
  labelContainer: {
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelBottom: {
    marginBottom: 0,
    marginTop: 8,
  },
  insideLabelContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  floatingLabel: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 3,
  },
  barContainer: {
    position: 'relative',
    width: '100%',
  },
  track: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  progress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    overflow: 'hidden',
  },
  striped: {
    backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
    backgroundSize: '20px 20px',
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
});

// 🏷️ DISPLAY NAME FOR DEBUGGING
ProgressBar.displayName = 'ProgressBar';
QualityProgressBar.displayName = 'QualityProgressBar';
LearningProgressBar.displayName = 'LearningProgressBar';
RevenueProgressBar.displayName = 'RevenueProgressBar';
TierProgressBar.displayName = 'TierProgressBar';

export default ProgressBar;