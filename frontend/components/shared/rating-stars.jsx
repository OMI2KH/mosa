/**
 * 🎯 MOSA FORGE: Enterprise Star Rating System
 * 
 * @component RatingStars
 * @description Enterprise-grade star rating system with quality metrics integration
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Interactive star rating with hover effects
 * - Quality score integration (0-5 with decimals)
 * - Performance-optimized rendering
 * - Accessibility (ARIA) compliant
 * - Real-time rating analytics
 * - Expert tier visualization
 * - Mobile-optimized touch interactions
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Text, 
  Animated, 
  StyleSheet,
  Platform,
  AccessibilityInfo
} from 'react-native';

// 🏗️ Enterprise Constants
const RATING_CONFIG = {
  MAX_STARS: 5,
  STAR_SIZE: 24,
  STAR_SPACING: 4,
  ANIMATION_DURATION: 200,
  QUALITY_THRESHOLDS: {
    MASTER: 4.7,
    SENIOR: 4.3,
    STANDARD: 4.0,
    DEVELOPING: 3.5
  },
  TIER_COLORS: {
    MASTER: '#FFD700', // Gold
    SENIOR: '#C0C0C0', // Silver
    STANDARD: '#CD7F32', // Bronze
    DEVELOPING: '#6B7280', // Gray
    PROBATION: '#EF4444'  // Red
  }
};

/**
 * 🏗️ Quality Tier Badge Component
 * @component QualityTierBadge
 */
const QualityTierBadge = ({ rating, size = 'medium' }) => {
  const getTierInfo = useCallback((score) => {
    if (score >= RATING_CONFIG.QUALITY_THRESHOLDS.MASTER) {
      return { tier: 'MASTER', label: 'Master', color: RATING_CONFIG.TIER_COLORS.MASTER };
    } else if (score >= RATING_CONFIG.QUALITY_THRESHOLDS.SENIOR) {
      return { tier: 'SENIOR', label: 'Senior', color: RATING_CONFIG.TIER_COLORS.SENIOR };
    } else if (score >= RATING_CONFIG.QUALITY_THRESHOLDS.STANDARD) {
      return { tier: 'STANDARD', label: 'Standard', color: RATING_CONFIG.TIER_COLORS.STANDARD };
    } else if (score >= RATING_CONFIG.QUALITY_THRESHOLDS.DEVELOPING) {
      return { tier: 'DEVELOPING', label: 'Developing', color: RATING_CONFIG.TIER_COLORS.DEVELOPING };
    } else {
      return { tier: 'PROBATION', label: 'Probation', color: RATING_CONFIG.TIER_COLORS.PROBATION };
    }
  }, []);

  const tierInfo = getTierInfo(rating);
  const sizeConfig = {
    small: { padding: 4, fontSize: 10, borderRadius: 8 },
    medium: { padding: 6, fontSize: 12, borderRadius: 10 },
    large: { padding: 8, fontSize: 14, borderRadius: 12 }
  };

  const styles = useMemo(() => StyleSheet.create({
    badge: {
      backgroundColor: tierInfo.color,
      paddingHorizontal: sizeConfig[size].padding,
      paddingVertical: sizeConfig[size].padding / 2,
      borderRadius: sizeConfig[size].borderRadius,
      alignSelf: 'flex-start'
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: sizeConfig[size].fontSize,
      fontWeight: '700',
      textAlign: 'center',
      includeFontPadding: false
    }
  }), [tierInfo.color, size]);

  return (
    <View style={styles.badge} testID={`quality-tier-badge-${tierInfo.tier.toLowerCase()}`}>
      <Text style={styles.badgeText} accessibilityLabel={`Quality tier: ${tierInfo.label}`}>
        {tierInfo.label}
      </Text>
    </View>
  );
};

/**
 * 🏗️ Individual Star Component
 * @component Star
 */
const Star = React.memo(({ 
  filled, 
  partial, 
  size, 
  onPress, 
  onHover, 
  isInteractive,
  testID 
}) => {
  const scaleAnim = useState(new Animated.Value(1))[0];
  const opacityAnim = useState(new Animated.Value(1))[0];

  const handlePress = useCallback(() => {
    if (!isInteractive) return;

    // Press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: RATING_CONFIG.ANIMATION_DURATION / 2,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: RATING_CONFIG.ANIMATION_DURATION / 2,
        useNativeDriver: true
      })
    ]).start();

    onPress?.();
  }, [isInteractive, scaleAnim, onPress]);

  const styles = useMemo(() => StyleSheet.create({
    starContainer: {
      width: size,
      height: size,
      marginHorizontal: RATING_CONFIG.STAR_SPACING / 2,
      position: 'relative'
    },
    starBase: {
      width: size,
      height: size,
      opacity: 0.3
    },
    starFilled: {
      position: 'absolute',
      width: size,
      height: size,
      top: 0,
      left: 0
    },
    starPartial: {
      position: 'absolute',
      width: size * (partial || 0),
      height: size,
      top: 0,
      left: 0,
      overflow: 'hidden'
    }
  }), [size, partial]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={onHover}
      disabled={!isInteractive}
      activeOpacity={isInteractive ? 0.7 : 1}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`Rate ${filled ? 'filled' : 'empty'} star`}
    >
      <Animated.View 
        style={[
          styles.starContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim
          }
        ]}
      >
        {/* Base empty star */}
        <Text style={[styles.starBase, { color: '#D1D5DB' }]}>
          ⭐
        </Text>
        
        {/* Filled star */}
        {filled && (
          <Text style={[styles.starFilled, { color: '#F59E0B' }]}>
            ⭐
          </Text>
        )}
        
        {/* Partial fill for decimal ratings */}
        {!filled && partial > 0 && (
          <View style={styles.starPartial}>
            <Text style={{ color: '#F59E0B' }}>
              ⭐
            </Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
});

/**
 * 🏗️ Main Rating Stars Component
 * @component RatingStars
 */
const RatingStars = React.memo(({
  // Core props
  rating = 0,
  onRatingChange,
  maxStars = RATING_CONFIG.MAX_STARS,
  
  // Display options
  showQualityTier = false,
  showRatingValue = false,
  showReviewCount = false,
  size = 'medium',
  theme = 'default',
  
  // Interaction options
  interactive = false,
  readonly = false,
  
  // Analytics & tracking
  ratingContext = 'general',
  expertId,
  studentId,
  
  // Accessibility
  accessibilityLabel = 'Star rating system',
  
  // Style overrides
  containerStyle,
  starsContainerStyle,
  
  // Test IDs
  testID = 'rating-stars',
  
  // Additional data
  reviewCount = 0,
  qualityMetrics = {}
}) => {
  // 🏗️ State Management
  const [currentRating, setCurrentRating] = useState(rating);
  const [hoverRating, setHoverRating] = useState(0);
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);
  
  // 🏗️ Refs
  const ratingAnalytics = React.useRef({
    initialRating: rating,
    ratingChanges: 0,
    lastRatingTime: null
  });

  // 🏗️ Size Configuration
  const sizeConfig = useMemo(() => ({
    small: { starSize: 16, fontSize: 12, spacing: 8 },
    medium: { starSize: 24, fontSize: 14, spacing: 12 },
    large: { starSize: 32, fontSize: 16, spacing: 16 }
  }), []);

  // 🏗️ Theme Configuration
  const themeConfig = useMemo(() => ({
    default: {
      activeColor: '#F59E0B',
      inactiveColor: '#D1D5DB',
      textColor: '#374151'
    },
    premium: {
      activeColor: '#FFD700',
      inactiveColor: '#E5E7EB',
      textColor: '#1F2937'
    },
    minimal: {
      activeColor: '#000000',
      inactiveColor: '#E5E7EB',
      textColor: '#6B7280'
    }
  }), []);

  // 🏗️ Effects
  useEffect(() => {
    setCurrentRating(rating);
  }, [rating]);

  useEffect(() => {
    // Check accessibility state
    AccessibilityInfo.isScreenReaderEnabled().then(setIsAccessibilityEnabled);
    
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsAccessibilityEnabled
    );
    
    return () => subscription?.remove();
  }, []);

  // 🏗️ Event Handlers
  const handleStarPress = useCallback((starIndex) => {
    if (readonly || !interactive) return;

    const newRating = starIndex + 1;
    setCurrentRating(newRating);
    
    // Track analytics
    ratingAnalytics.current.ratingChanges++;
    ratingAnalytics.current.lastRatingTime = new Date().toISOString();
    
    // Call parent handler
    onRatingChange?.(newRating, {
      previousRating: rating,
      context: ratingContext,
      expertId,
      studentId,
      analytics: ratingAnalytics.current
    });

    // Log rating event for quality monitoring
    if (process.env.NODE_ENV === 'development') {
      console.log('RatingStars: Rating changed', {
        from: rating,
        to: newRating,
        context: ratingContext,
        expertId,
        studentId,
        timestamp: new Date().toISOString()
      });
    }
  }, [readonly, interactive, onRatingChange, rating, ratingContext, expertId, studentId]);

  const handleStarHover = useCallback((starIndex) => {
    if (readonly || !interactive || Platform.OS !== 'web') return;
    setHoverRating(starIndex + 1);
  }, [readonly, interactive]);

  // 🏗️ Star Calculation Logic
  const { fullStars, partialStar } = useMemo(() => {
    const numericRating = hoverRating > 0 ? hoverRating : currentRating;
    const fullStars = Math.floor(numericRating);
    const partial = numericRating - fullStars;
    
    return {
      fullStars,
      partialStar: partial > 0 ? partial : 0
    };
  }, [currentRating, hoverRating]);

  // 🏗️ Render Stars
  const renderStars = useCallback(() => {
    const stars = [];
    const currentSize = sizeConfig[size].starSize;
    const isCurrentlyInteractive = interactive && !readonly;

    for (let i = 0; i < maxStars; i++) {
      const isFilled = i < fullStars;
      const isPartial = i === fullStars && partialStar > 0;
      
      stars.push(
        <Star
          key={`star-${i}`}
          filled={isFilled}
          partial={isPartial ? partialStar : 0}
          size={currentSize}
          onPress={() => handleStarPress(i)}
          onHover={() => handleStarHover(i)}
          isInteractive={isCurrentlyInteractive}
          testID={`${testID}-star-${i + 1}`}
        />
      );
    }

    return stars;
  }, [
    maxStars, 
    fullStars, 
    partialStar, 
    size, 
    sizeConfig, 
    interactive, 
    readonly, 
    handleStarPress, 
    handleStarHover, 
    testID
  ]);

  // 🏗️ Styles
  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'column',
      alignItems: 'flex-start'
    },
    starsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: showRatingValue || showReviewCount || showQualityTier ? 4 : 0
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginTop: 2
    },
    ratingText: {
      fontSize: sizeConfig[size].fontSize,
      color: themeConfig[theme].textColor,
      fontWeight: '500',
      marginLeft: sizeConfig[size].spacing
    },
    reviewCountText: {
      fontSize: sizeConfig[size].fontSize - 2,
      color: '#6B7280',
      marginLeft: 4
    },
    qualityMetrics: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2
    },
    metricBadge: {
      backgroundColor: '#E5E7EB',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      marginRight: 4
    },
    metricText: {
      fontSize: 10,
      color: '#374151',
      fontWeight: '500'
    },
    accessibilityLabel: {
      position: 'absolute',
      opacity: 0,
      height: 0,
      width: 0
    }
  }), [size, sizeConfig, theme, themeConfig, showRatingValue, showReviewCount, showQualityTier]);

  // 🏗️ Quality Metrics Display
  const renderQualityMetrics = useCallback(() => {
    if (!qualityMetrics || Object.keys(qualityMetrics).length === 0) return null;

    return (
      <View style={styles.qualityMetrics}>
        {qualityMetrics.completionRate && (
          <View style={styles.metricBadge}>
            <Text style={styles.metricText}>
              {Math.round(qualityMetrics.completionRate * 100)}% Complete
            </Text>
          </View>
        )}
        {qualityMetrics.responseTime && (
          <View style={styles.metricBadge}>
            <Text style={styles.metricText}>
              {qualityMetrics.responseTime}h Response
            </Text>
          </View>
        )}
      </View>
    );
  }, [qualityMetrics, styles]);

  // 🏗️ Main Render
  return (
    <View 
      style={[styles.container, containerStyle]}
      testID={testID}
      accessible={true}
      accessibilityRole="adjustable"
      accessibilityLabel={`${accessibilityLabel}. Current rating: ${currentRating} out of ${maxStars} stars`}
      accessibilityValue={{
        min: 0,
        max: maxStars,
        now: currentRating
      }}
    >
      {/* Hidden accessibility label for screen readers */}
      {isAccessibilityEnabled && (
        <Text style={styles.accessibilityLabel}>
          {`Rating: ${currentRating} out of ${maxStars} stars. ${interactive && !readonly ? 'Select to change rating.' : ''}`}
        </Text>
      )}
      
      {/* Stars Row */}
      <View style={[styles.starsRow, starsContainerStyle]}>
        {renderStars()}
        
        {/* Rating Value */}
        {showRatingValue && (
          <Text style={styles.ratingText} testID={`${testID}-value`}>
            {currentRating.toFixed(1)}
          </Text>
        )}
      </View>
      
      {/* Information Row */}
      {(showQualityTier || showReviewCount || qualityMetrics) && (
        <View style={styles.infoRow}>
          {/* Quality Tier Badge */}
          {showQualityTier && (
            <QualityTierBadge 
              rating={currentRating} 
              size={size}
            />
          )}
          
          {/* Review Count */}
          {showReviewCount && reviewCount > 0 && (
            <Text style={styles.reviewCountText} testID={`${testID}-review-count`}>
              ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
            </Text>
          )}
          
          {/* Quality Metrics */}
          {qualityMetrics && renderQualityMetrics()}
        </View>
      )}
    </View>
  );
});

// 🏗️ Component Properties
RatingStars.displayName = 'RatingStars';

RatingStars.defaultProps = {
  rating: 0,
  maxStars: 5,
  interactive: false,
  readonly: false,
  showQualityTier: false,
  showRatingValue: false,
  showReviewCount: false,
  size: 'medium',
  theme: 'default',
  testID: 'rating-stars',
  reviewCount: 0
};

/**
 * 🏗️ Rating Analytics Hook
 * @hook useRatingAnalytics
 */
export const useRatingAnalytics = (context = 'general') => {
  const [analytics, setAnalytics] = useState({
    totalRatings: 0,
    averageRating: 0,
    ratingDistribution: Array(5).fill(0),
    qualityScore: 0
  });

  const updateAnalytics = useCallback((newRating, previousRating = 0) => {
    setAnalytics(prev => {
      const newDistribution = [...prev.ratingDistribution];
      if (previousRating > 0) {
        newDistribution[Math.floor(previousRating) - 1]--;
      }
      newDistribution[Math.floor(newRating) - 1]++;
      
      const totalRatings = newDistribution.reduce((sum, count) => sum + count, 0);
      const averageRating = newDistribution.reduce((sum, count, index) => 
        sum + (count * (index + 1)), 0) / totalRatings;
      
      // Calculate quality score (weighted average)
      const qualityScore = newDistribution.reduce((sum, count, index) => {
        const weight = (index + 1) / 5; // Normalize to 0-1
        return sum + (count * weight);
      }, 0) / totalRatings * 5; // Scale back to 0-5

      return {
        totalRatings,
        averageRating: Number(averageRating.toFixed(2)),
        ratingDistribution: newDistribution,
        qualityScore: Number(qualityScore.toFixed(2))
      };
    });
  }, []);

  return {
    analytics,
    updateAnalytics
  };
};

/**
 * 🏗️ WithRatingContext HOC
 * @hoc withRatingContext
 */
export const withRatingContext = (WrappedComponent) => {
  return React.forwardRef((props, ref) => {
    const ratingContext = useRatingAnalytics(props.ratingContext);
    
    return (
      <WrappedComponent
        ref={ref}
        {...props}
        ratingAnalytics={ratingContext.analytics}
        onRatingChange={(rating, metadata) => {
          ratingContext.updateAnalytics(rating, metadata?.previousRating);
          props.onRatingChange?.(rating, metadata);
        }}
      />
    );
  });
};

// 🏗️ Enhanced RatingStars with Analytics
export const RatingStarsWithAnalytics = withRatingContext(RatingStars);

/**
 * 🏗️ Enterprise Export Pattern
 */
export {
  QualityTierBadge,
  RATING_CONFIG
};

export default RatingStars;