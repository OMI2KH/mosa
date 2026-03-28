// shared/status-badge.jsx

/**
 * 🎯 ENTERPRISE STATUS BADGE COMPONENT
 * Production-ready status indicator system for Mosa Forge
 * Features: Multiple status types, quality scoring, tier indicators, real-time updates
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { memo, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity,
  Platform 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// 🎨 Design System Constants
const DESIGN_SYSTEM = {
  colors: {
    // Primary Status Colors
    success: {
      primary: '#10B981',
      secondary: '#ECFDF5',
      gradient: ['#10B981', '#059669'],
      text: '#065F46'
    },
    warning: {
      primary: '#F59E0B',
      secondary: '#FFFBEB',
      gradient: ['#F59E0B', '#D97706'],
      text: '#92400E'
    },
    error: {
      primary: '#EF4444',
      secondary: '#FEF2F2',
      gradient: ['#EF4444', '#DC2626'],
      text: '#991B1B'
    },
    info: {
      primary: '#3B82F6',
      secondary: '#EFF6FF',
      gradient: ['#3B82F6', '#2563EB'],
      text: '#1E40AF'
    },
    neutral: {
      primary: '#6B7280',
      secondary: '#F9FAFB',
      gradient: ['#6B7280', '#4B5563'],
      text: '#374151'
    },
    
    // Expert Tier Colors
    master: {
      primary: '#8B5CF6',
      secondary: '#FAF5FF',
      gradient: ['#8B5CF6', '#7C3AED'],
      text: '#5B21B6'
    },
    senior: {
      primary: '#06B6D4',
      secondary: '#ECFEFF',
      gradient: ['#06B6D4', '#0891B2'],
      text: '#0E7490'
    },
    standard: {
      primary: '#10B981',
      secondary: '#ECFDF5',
      gradient: ['#10B981', '#059669'],
      text: '#065F46'
    },
    developing: {
      primary: '#F59E0B',
      secondary: '#FFFBEB',
      gradient: ['#F59E0B', '#D97706'],
      text: '#92400E'
    },
    probation: {
      primary: '#EF4444',
      secondary: '#FEF2F2',
      gradient: ['#EF4444', '#DC2626'],
      text: '#991B1B'
    },

    // Quality Score Colors
    quality: {
      excellent: '#10B981',
      good: '#22C55E',
      average: '#EAB308',
      poor: '#F97316',
      critical: '#EF4444'
    }
  },
  
  typography: {
    xs: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500'
    },
    sm: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '600'
    },
    base: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600'
    },
    lg: {
      fontSize: 18,
      lineHeight: 28,
      fontWeight: '700'
    }
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20
  },
  
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6
    }
  }
};

// 📊 STATUS TYPE DEFINITIONS
const STATUS_CONFIG = {
  // 🎓 Learning Journey Statuses
  learning: {
    NOT_STARTED: { 
      label: 'Not Started', 
      type: 'neutral',
      icon: '⏳'
    },
    IN_PROGRESS: { 
      label: 'In Progress', 
      type: 'info',
      icon: '🚀'
    },
    COMPLETED: { 
      label: 'Completed', 
      type: 'success',
      icon: '✅'
    },
    BEHIND_SCHEDULE: { 
      label: 'Behind Schedule', 
      type: 'warning',
      icon: '⚠️'
    },
    AT_RISK: { 
      label: 'At Risk', 
      type: 'error',
      icon: '🔴'
    }
  },

  // 👨‍🏫 Expert Statuses
  expert: {
    ACTIVE: { 
      label: 'Active', 
      type: 'success',
      icon: '⭐'
    },
    PENDING_VERIFICATION: { 
      label: 'Pending Verification', 
      type: 'warning',
      icon: '⏳'
    },
    SUSPENDED: { 
      label: 'Suspended', 
      type: 'error',
      icon: '❌'
    },
    ON_LEAVE: { 
      label: 'On Leave', 
      type: 'info',
      icon: '🏖️'
    },
    PROBATION: { 
      label: 'Probation', 
      type: 'error',
      icon: '🔍'
    }
  },

  // 💰 Payment Statuses
  payment: {
    PENDING: { 
      label: 'Pending', 
      type: 'warning',
      icon: '⏳'
    },
    COMPLETED: { 
      label: 'Completed', 
      type: 'success',
      icon: '✅'
    },
    FAILED: { 
      label: 'Failed', 
      type: 'error',
      icon: '❌'
    },
    REFUNDED: { 
      label: 'Refunded', 
      type: 'info',
      icon: '↩️'
    },
    IN_DISPUTE: { 
      label: 'In Dispute', 
      type: 'error',
      icon: '⚖️'
    }
  },

  // 🛡️ Quality Statuses
  quality: {
    EXCELLENT: { 
      label: 'Excellent', 
      type: 'success',
      icon: '🌟🌟🌟'
    },
    GOOD: { 
      label: 'Good', 
      type: 'success',
      icon: '🌟🌟'
    },
    AVERAGE: { 
      label: 'Average', 
      type: 'warning',
      icon: '🌟'
    },
    NEEDS_IMPROVEMENT: { 
      label: 'Needs Improvement', 
      type: 'warning',
      icon: '📉'
    },
    CRITICAL: { 
      label: 'Critical', 
      type: 'error',
      icon: '🚨'
    }
  },

  // 📊 Session Statuses
  session: {
    SCHEDULED: { 
      label: 'Scheduled', 
      type: 'info',
      icon: '📅'
    },
    IN_PROGRESS: { 
      label: 'Live', 
      type: 'success',
      icon: '🔴'
    },
    COMPLETED: { 
      label: 'Completed', 
      type: 'success',
      icon: '✅'
    },
    CANCELLED: { 
      label: 'Cancelled', 
      type: 'error',
      icon: '❌'
    },
    MISSED: { 
      label: 'Missed', 
      type: 'error',
      icon: '⏰'
    }
  },

  // 🏆 Tier Statuses
  tier: {
    MASTER: { 
      label: 'Master Tier', 
      type: 'master',
      icon: '👑'
    },
    SENIOR: { 
      label: 'Senior Tier', 
      type: 'senior',
      icon: '⭐'
    },
    STANDARD: { 
      label: 'Standard Tier', 
      type: 'standard',
      icon: '✅'
    },
    DEVELOPING: { 
      label: 'Developing', 
      type: 'developing',
      icon: '🌱'
    },
    PROBATION: { 
      label: 'Probation', 
      type: 'probation',
      icon: '🔍'
    }
  }
};

/**
 * 🎯 ENTERPRISE STATUS BADGE COMPONENT
 */
const StatusBadge = memo(({
  // Core Props
  type = 'learning',
  status = 'NOT_STARTED',
  label,
  icon,
  
  // Styling Props
  size = 'md',
  variant = 'solid',
  showIcon = true,
  animated = false,
  pulse = false,
  
  // Interactive Props
  onPress,
  onLongPress,
  disabled = false,
  
  // Quality & Metrics
  qualityScore,
  progress,
  showProgress = false,
  
  // Customization
  customColor,
  customBackground,
  testID,
  
  // Accessibility
  accessibilityLabel,
  accessibilityHint
}) => {
  // 🎨 GET STATUS CONFIGURATION
  const statusConfig = useMemo(() => {
    // Handle custom quality score
    if (type === 'quality' && qualityScore) {
      return getQualityStatusConfig(qualityScore);
    }
    
    // Handle custom progress
    if (type === 'learning' && progress !== undefined) {
      return getProgressStatusConfig(progress);
    }
    
    // Get from predefined config
    return STATUS_CONFIG[type]?.[status] || STATUS_CONFIG.learning.NOT_STARTED;
  }, [type, status, qualityScore, progress]);

  // 🎯 GET COLOR SCHEME
  const colorScheme = useMemo(() => {
    if (customColor && customBackground) {
      return {
        primary: customColor,
        secondary: customBackground,
        gradient: [customColor, customColor],
        text: customColor
      };
    }
    return DESIGN_SYSTEM.colors[statusConfig.type] || DESIGN_SYSTEM.colors.neutral;
  }, [statusConfig.type, customColor, customBackground]);

  // 📏 SIZE CONFIGURATION
  const sizeConfig = useMemo(() => ({
    xs: { paddingVertical: 2, paddingHorizontal: 6, iconSize: 12 },
    sm: { paddingVertical: 4, paddingHorizontal: 8, iconSize: 14 },
    md: { paddingVertical: 6, paddingHorizontal: 12, iconSize: 16 },
    lg: { paddingVertical: 8, paddingHorizontal: 16, iconSize: 18 },
    xl: { paddingVertical: 10, paddingHorizontal: 20, iconSize: 20 }
  }[size]), [size]);

  // 🎭 VARIANT STYLES
  const variantStyles = useMemo(() => {
    const baseStyle = {
      borderRadius: DESIGN_SYSTEM.borderRadius.md,
      borderWidth: variant === 'outline' ? 1.5 : 0,
      borderColor: variant === 'outline' ? colorScheme.primary : 'transparent',
      ...DESIGN_SYSTEM.shadows.sm
    };

    switch (variant) {
      case 'solid':
        return {
          ...baseStyle,
          backgroundColor: colorScheme.primary,
        };
      
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
        };
      
      case 'subtle':
        return {
          ...baseStyle,
          backgroundColor: colorScheme.secondary,
          borderWidth: 0,
        };
      
      case 'gradient':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      
      default:
        return baseStyle;
    }
  }, [variant, colorScheme]);

  // ✨ TEXT STYLES
  const textStyles = useMemo(() => {
    const textColor = variant === 'solid' ? '#FFFFFF' : colorScheme.text;
    
    return {
      color: textColor,
      ...DESIGN_SYSTEM.typography[size === 'xs' ? 'xs' : 'sm'],
      fontWeight: '600'
    };
  }, [variant, colorScheme, size]);

  // 🔄 PULSE ANIMATION
  const pulseAnimation = useMemo(() => {
    if (!pulse || !animated) return null;
    
    const pulseAnim = new Animated.Value(1);
    
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
    
    return {
      transform: [{ scale: pulseAnim }]
    };
  }, [pulse, animated]);

  // 🎯 RENDER CONTENT
  const renderContent = () => (
    <View style={[
      styles.container,
      variantStyles,
      sizeConfig,
      pulseAnimation,
      disabled && styles.disabled
    ]}>
      {/* Gradient Background */}
      {variant === 'gradient' && (
        <LinearGradient
          colors={colorScheme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
          borderRadius={DESIGN_SYSTEM.borderRadius.md}
        />
      )}
      
      {/* Blur Background for iOS */}
      {Platform.OS === 'ios' && variant === 'subtle' && (
        <BlurView
          intensity={20}
          tint="light"
          style={StyleSheet.absoluteFillObject}
          borderRadius={DESIGN_SYSTEM.borderRadius.md}
        />
      )}
      
      <View style={styles.content}>
        {/* Icon */}
        {showIcon && statusConfig.icon && (
          <Text 
            style={[
              styles.icon,
              { fontSize: sizeConfig.iconSize, marginRight: sizeConfig.paddingHorizontal / 2 }
            ]}
            allowFontScaling={false}
          >
            {statusConfig.icon}
          </Text>
        )}
        
        {/* Label */}
        <Text 
          style={[styles.label, textStyles]}
          numberOfLines={1}
          ellipsizeMode="tail"
          allowFontScaling={false}
        >
          {label || statusConfig.label}
        </Text>
        
        {/* Quality Score */}
        {qualityScore && (
          <Text 
            style={[styles.qualityScore, textStyles]}
            allowFontScaling={false}
          >
            {qualityScore.toFixed(1)}
          </Text>
        )}
        
        {/* Progress Indicator */}
        {showProgress && progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${Math.min(Math.max(progress, 0), 100)}%`,
                    backgroundColor: variant === 'solid' ? '#FFFFFF' : colorScheme.primary
                  }
                ]} 
              />
            </View>
          </View>
        )}
      </View>
    </View>
  );

  // 🎯 RENDER INTERACTIVE OR STATIC
  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        disabled={disabled}
        style={styles.touchable}
        testID={testID}
        accessibilityLabel={accessibilityLabel || `${statusConfig.label} status badge`}
        accessibilityHint={accessibilityHint || 'Double tap to interact'}
        accessibilityRole="button"
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return (
    <View 
      testID={testID}
      accessibilityLabel={accessibilityLabel || `${statusConfig.label} status badge`}
      accessibilityRole="text"
    >
      {renderContent()}
    </View>
  );
});

/**
 * 🎯 QUALITY SCORE STATUS CONFIG
 */
const getQualityStatusConfig = (qualityScore) => {
  if (qualityScore >= 4.7) return STATUS_CONFIG.quality.EXCELLENT;
  if (qualityScore >= 4.3) return STATUS_CONFIG.quality.GOOD;
  if (qualityScore >= 4.0) return STATUS_CONFIG.quality.AVERAGE;
  if (qualityScore >= 3.5) return STATUS_CONFIG.quality.NEEDS_IMPROVEMENT;
  return STATUS_CONFIG.quality.CRITICAL;
};

/**
 * 📈 PROGRESS STATUS CONFIG
 */
const getProgressStatusConfig = (progress) => {
  if (progress >= 100) return STATUS_CONFIG.learning.COMPLETED;
  if (progress >= 75) return STATUS_CONFIG.learning.IN_PROGRESS;
  if (progress >= 50) return STATUS_CONFIG.learning.IN_PROGRESS;
  if (progress >= 25) return STATUS_CONFIG.learning.BEHIND_SCHEDULE;
  return STATUS_CONFIG.learning.AT_RISK;
};

/**
 * 🎨 STYLESHEET
 */
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  touchable: {
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  label: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  qualityScore: {
    marginLeft: 4,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  progressContainer: {
    marginLeft: 8,
    width: 40,
  },
  progressBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});

// 🏆 COMPONENT PROPERTIES
StatusBadge.displayName = 'StatusBadge';
StatusBadge.STATUS_TYPES = Object.keys(STATUS_CONFIG);
StatusBadge.SIZES = ['xs', 'sm', 'md', 'lg', 'xl'];
StatusBadge.VARIANTS = ['solid', 'outline', 'subtle', 'gradient'];

/**
 * 🎯 SPECIALIZED BADGE COMPONENTS
 */

// Expert Tier Badge
export const ExpertTierBadge = memo(({ tier, size = 'md', ...props }) => (
  <StatusBadge
    type="tier"
    status={tier}
    size={size}
    variant="gradient"
    showIcon={true}
    {...props}
  />
));

// Quality Score Badge
export const QualityScoreBadge = memo(({ score, size = 'sm', ...props }) => (
  <StatusBadge
    type="quality"
    qualityScore={score}
    size={size}
    variant="solid"
    showProgress={false}
    {...props}
  />
));

// Learning Progress Badge
export const LearningProgressBadge = memo(({ progress, size = 'md', ...props }) => (
  <StatusBadge
    type="learning"
    progress={progress}
    size={size}
    variant="subtle"
    showProgress={true}
    showIcon={true}
    {...props}
  />
));

// Payment Status Badge
export const PaymentStatusBadge = memo(({ status, size = 'sm', ...props }) => (
  <StatusBadge
    type="payment"
    status={status}
    size={size}
    variant="outline"
    showIcon={true}
    {...props}
  />
));

// Session Status Badge
export const SessionStatusBadge = memo(({ status, size = 'sm', pulse, ...props }) => (
  <StatusBadge
    type="session"
    status={status}
    size={size}
    variant="solid"
    showIcon={true}
    pulse={pulse || status === 'IN_PROGRESS'}
    animated={true}
    {...props}
  />
));

export default StatusBadge;