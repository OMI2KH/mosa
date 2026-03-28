// payment/revenue-split-display.jsx

/**
 * 🎯 ENTERPRISE REVENUE SPLIT DISPLAY
 * Production-ready visualization for 1000/999 revenue distribution
 * Real-time calculations with animations and interactive elements
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { usePaymentDistribution } from '../../hooks/use-payment-distribution';
import { Logger } from '../../utils/logger';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_IOS = Platform.OS === 'ios';
const IS_TABLET = SCREEN_WIDTH >= 768;

// 🎨 Design System Constants
const COLORS = {
  // Primary Brand Colors
  primary: '#0066FF',
  primaryDark: '#0052CC',
  primaryLight: '#3385FF',
  
  // Revenue Split Colors
  mosaRevenue: '#00C851', // Green for Mosa Platform
  expertRevenue: '#FF6B35', // Orange for Experts
  bonusRevenue: '#FFD700', // Gold for Bonuses
  
  // UI Colors
  background: '#0A0F1C',
  surface: '#1A1F2C',
  card: '#252A38',
  textPrimary: '#FFFFFF',
  textSecondary: '#8F9BB3',
  textTertiary: '#5A6376',
  border: '#2D3548',
  success: '#00D68F',
  warning: '#FFAA00',
  error: '#FF3D71',
  
  // Gradients
  gradientStart: '#0066FF',
  gradientEnd: '#00D4FF',
  expertGradientStart: '#FF6B35',
  expertGradientEnd: '#FF8E53',
  mosaGradientStart: '#00C851',
  mosaGradientEnd: '#00E676'
};

const TYPOGRAPHY = {
  h1: IS_TABLET ? 32 : 24,
  h2: IS_TABLET ? 24 : 20,
  h3: IS_TABLET ? 20 : 18,
  body: IS_TABLET ? 16 : 14,
  caption: IS_TABLET ? 14 : 12,
  small: IS_TABLET ? 12 : 10
};

const SPACING = {
  xs: IS_TABLET ? 8 : 4,
  sm: IS_TABLET ? 12 : 8,
  md: IS_TABLET ? 16 : 12,
  lg: IS_TABLET ? 24 : 16,
  xl: IS_TABLET ? 32 : 24,
  xxl: IS_TABLET ? 48 : 32
};

const ANIMATION_CONFIG = {
  duration: 800,
  useNativeDriver: true,
  friction: 8,
  tension: 40
};

/**
 * 🎯 MAIN REVENUE SPLIT DISPLAY COMPONENT
 */
const RevenueSplitDisplay = React.memo(({
  bundlePrice = 1999,
  mosaRevenue = 1000,
  expertRevenue = 999,
  showBreakdown = true,
  showAnimations = true,
  compactMode = false,
  onRevenueClick,
  performanceBonus = 0,
  expertTier = 'STANDARD',
  interactive = true,
  theme = 'dark'
}) => {
  const logger = useMemo(() => new Logger('RevenueSplitDisplay'), []);
  const { calculateBonus, formatCurrency } = usePaymentDistribution();
  
  // 🎭 Animation States
  const [animationProgress] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [opacityAnim] = useState(new Animated.Value(0));
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [isExpanded, setIsExpanded] = useState(!compactMode);

  // 📊 Revenue Calculations
  const revenueData = useMemo(() => {
    const total = mosaRevenue + expertRevenue;
    const mosaPercentage = (mosaRevenue / total) * 100;
    const expertPercentage = (expertRevenue / total) * 100;
    
    const expertWithBonus = expertRevenue + performanceBonus;
    const expertTotalPercentage = (expertWithBonus / total) * 100;
    
    return {
      total,
      mosa: {
        amount: mosaRevenue,
        percentage: mosaPercentage,
        label: 'Mosa Platform'
      },
      expert: {
        baseAmount: expertRevenue,
        bonusAmount: performanceBonus,
        totalAmount: expertWithBonus,
        percentage: expertPercentage,
        totalPercentage: expertTotalPercentage,
        label: 'Expert Earnings'
      },
      breakdown: {
        platformOperations: mosaRevenue * 0.4, // 40%
        qualityEnforcement: mosaRevenue * 0.3,  // 30%
        profitGrowth: mosaRevenue * 0.3,        // 30%
        expertPayouts: [
          { phase: 'Course Start', amount: 333, percentage: 33.3 },
          { phase: '75% Completion', amount: 333, percentage: 33.3 },
          { phase: 'Certification', amount: 333, percentage: 33.3 }
        ]
      }
    };
  }, [mosaRevenue, expertRevenue, performanceBonus]);

  // 🚀 Animation Effects
  useEffect(() => {
    if (showAnimations) {
      const animations = [
        Animated.spring(animationProgress, {
          toValue: 1,
          ...ANIMATION_CONFIG
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          ...ANIMATION_CONFIG
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true
        })
      ];

      Animated.stagger(150, animations).start();
    } else {
      animationProgress.setValue(1);
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
    }
  }, [showAnimations]);

  // 🎯 Segment Click Handler
  const handleSegmentClick = useCallback((segment) => {
    if (!interactive) return;
    
    logger.info('Revenue segment clicked', { segment });
    setSelectedSegment(segment);
    setIsExpanded(true);
    
    if (onRevenueClick) {
      onRevenueClick(segment);
    }
  }, [interactive, onRevenueClick]);

  // 📱 Responsive Calculations
  const chartHeight = useMemo(() => 
    compactMode ? (IS_TABLET ? 120 : 80) : (IS_TABLET ? 200 : 140)
  , [compactMode]);

  const segmentWidths = useMemo(() => ({
    mosa: animationProgress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', `${revenueData.mosa.percentage}%`]
    }),
    expert: animationProgress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', `${revenueData.expert.percentage}%`]
    })
  }), [animationProgress, revenueData]);

  // 🎨 Render Methods
  const renderMainChart = () => (
    <View style={[
      styles.chartContainer,
      compactMode && styles.chartContainerCompact
    ]}>
      {/* Mosa Platform Revenue Segment */}
      <TouchableOpacity
        activeOpacity={interactive ? 0.7 : 1}
        onPress={() => handleSegmentClick('mosa')}
        style={styles.segmentTouchable}
      >
        <Animated.View 
          style={[
            styles.revenueSegment,
            styles.mosaSegment,
            { 
              width: segmentWidths.mosa,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim
            }
          ]}
        >
          <LinearGradient
            colors={[COLORS.mosaGradientStart, COLORS.mosaGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          
          {/* Segment Label */}
          <View style={styles.segmentLabel}>
            <Text style={styles.segmentAmount}>
              {formatCurrency(revenueData.mosa.amount)}
            </Text>
            <Text style={styles.segmentPercentage}>
              {revenueData.mosa.percentage.toFixed(1)}%
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {/* Expert Revenue Segment */}
      <TouchableOpacity
        activeOpacity={interactive ? 0.7 : 1}
        onPress={() => handleSegmentClick('expert')}
        style={styles.segmentTouchable}
      >
        <Animated.View 
          style={[
            styles.revenueSegment,
            styles.expertSegment,
            { 
              width: segmentWidths.expert,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim
            }
          ]}
        >
          <LinearGradient
            colors={[COLORS.expertGradientStart, COLORS.expertGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          
          {/* Bonus Overlay if Applicable */}
          {revenueData.expert.bonusAmount > 0 && (
            <Animated.View 
              style={[
                styles.bonusOverlay,
                {
                  width: animationProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', `${(revenueData.expert.bonusAmount / revenueData.expert.totalAmount) * 100}%`]
                  })
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.8)', 'rgba(255, 215, 0, 0.4)']}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          )}
          
          {/* Segment Label */}
          <View style={styles.segmentLabel}>
            <Text style={styles.segmentAmount}>
              {formatCurrency(revenueData.expert.totalAmount)}
            </Text>
            <Text style={styles.segmentPercentage}>
              {revenueData.expert.totalPercentage.toFixed(1)}%
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );

  const renderLegend = () => (
    <View style={[
      styles.legendContainer,
      compactMode && styles.legendContainerCompact
    ]}>
      {/* Mosa Platform Legend */}
      <TouchableOpacity
        style={styles.legendItem}
        onPress={() => handleSegmentClick('mosa')}
        activeOpacity={interactive ? 0.7 : 1}
      >
        <View style={[styles.legendColor, { backgroundColor: COLORS.mosaRevenue }]} />
        <View style={styles.legendTextContainer}>
          <Text style={styles.legendTitle}>Mosa Platform</Text>
          <Text style={styles.legendSubtitle}>
            {formatCurrency(revenueData.mosa.amount)} • {revenueData.mosa.percentage.toFixed(1)}%
          </Text>
        </View>
        {interactive && (
          <Text style={styles.legendArrow}>›</Text>
        )}
      </TouchableOpacity>

      {/* Expert Earnings Legend */}
      <TouchableOpacity
        style={styles.legendItem}
        onPress={() => handleSegmentClick('expert')}
        activeOpacity={interactive ? 0.7 : 1}
      >
        <LinearGradient
          colors={[COLORS.expertGradientStart, COLORS.expertGradientEnd]}
          style={styles.legendColor}
        />
        <View style={styles.legendTextContainer}>
          <Text style={styles.legendTitle}>Expert Earnings</Text>
          <Text style={styles.legendSubtitle}>
            {formatCurrency(revenueData.expert.totalAmount)} • {revenueData.expert.totalPercentage.toFixed(1)}%
            {revenueData.expert.bonusAmount > 0 && (
              <Text style={styles.bonusText}>
                {' '}(+{formatCurrency(revenueData.expert.bonusAmount)} bonus)
              </Text>
            )}
          </Text>
        </View>
        {interactive && (
          <Text style={styles.legendArrow}>›</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderDetailedBreakdown = () => {
    if (!showBreakdown || !isExpanded) return null;

    return (
      <Animated.View 
        style={[
          styles.breakdownContainer,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* Mosa Platform Breakdown */}
        <View style={styles.breakdownSection}>
          <Text style={styles.breakdownTitle}>Mosa Platform Allocation</Text>
          <View style={styles.breakdownItems}>
            <View style={styles.breakdownItem}>
              <View style={styles.breakdownDot} />
              <Text style={styles.breakdownLabel}>Platform Operations</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(revenueData.breakdown.platformOperations)}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: COLORS.primary }]} />
              <Text style={styles.breakdownLabel}>Quality Enforcement</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(revenueData.breakdown.qualityEnforcement)}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.breakdownLabel}>Profit & Growth</Text>
              <Text style={styles.breakdownValue}>
                {formatCurrency(revenueData.breakdown.profitGrowth)}
              </Text>
            </View>
          </View>
        </View>

        {/* Expert Payout Schedule */}
        <View style={styles.breakdownSection}>
          <Text style={styles.breakdownTitle}>Expert Payout Schedule</Text>
          <View style={styles.breakdownItems}>
            {revenueData.breakdown.expertPayouts.map((payout, index) => (
              <View key={index} style={styles.breakdownItem}>
                <View style={[styles.breakdownDot, { backgroundColor: COLORS.expertRevenue }]} />
                <Text style={styles.breakdownLabel}>{payout.phase}</Text>
                <Text style={styles.breakdownValue}>
                  {formatCurrency(payout.amount)} • {payout.percentage.toFixed(1)}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Performance Bonus Info */}
        {revenueData.expert.bonusAmount > 0 && (
          <View style={styles.bonusSection}>
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.1)', 'rgba(255, 215, 0, 0.05)']}
              style={styles.bonusGradient}
            >
              <Text style={styles.bonusTitle}>🎯 Performance Bonus Active</Text>
              <Text style={styles.bonusDescription}>
                {expertTier} Tier Bonus: +{formatCurrency(revenueData.expert.bonusAmount)}
              </Text>
            </LinearGradient>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderCompactView = () => (
    <TouchableOpacity
      style={styles.compactContainer}
      onPress={() => setIsExpanded(!isExpanded)}
      activeOpacity={0.8}
    >
      <View style={styles.compactHeader}>
        <Text style={styles.compactTitle}>Revenue Split</Text>
        <Text style={styles.compactArrow}>
          {isExpanded ? '▼' : '▶'}
        </Text>
      </View>
      {renderMainChart()}
      {renderLegend()}
    </TouchableOpacity>
  );

  // 🎯 Main Render
  if (compactMode) {
    return renderCompactView();
  }

  return (
    <BlurView intensity={20} style={styles.container} tint="dark">
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Revenue Distribution</Text>
          <Text style={styles.subtitle}>
            Total Bundle: {formatCurrency(bundlePrice)} ETB
          </Text>
        </View>

        {/* Main Chart */}
        {renderMainChart()}

        {/* Legend */}
        {renderLegend()}

        {/* Detailed Breakdown */}
        {renderDetailedBreakdown()}

        {/* Footer Notes */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 Revenue split ensures sustainable platform growth while rewarding expert performance
          </Text>
        </View>
      </ScrollView>
    </BlurView>
  );
});

// 🎨 STYLESHEET
const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
    borderRadius: IS_TABLET ? 20 : 16,
    overflow: 'hidden',
    margin: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.h2,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  chartContainer: {
    height: 200,
    flexDirection: 'row',
    borderRadius: IS_TABLET ? 16 : 12,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartContainerCompact: {
    height: 80,
    marginBottom: SPACING.sm,
  },
  segmentTouchable: {
    flex: 1,
  },
  revenueSegment: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mosaSegment: {
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  expertSegment: {
    position: 'relative',
  },
  bonusOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    borderTopRightRadius: IS_TABLET ? 16 : 12,
    borderBottomRightRadius: IS_TABLET ? 16 : 12,
  },
  segmentLabel: {
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  segmentAmount: {
    fontSize: TYPOGRAPHY.h3,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  segmentPercentage: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: SPACING.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  legendContainer: {
    marginBottom: SPACING.lg,
  },
  legendContainerCompact: {
    marginBottom: SPACING.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: IS_TABLET ? 12 : 8,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  legendColor: {
    width: IS_TABLET ? 16 : 12,
    height: IS_TABLET ? 16 : 12,
    borderRadius: IS_TABLET ? 8 : 6,
    marginRight: SPACING.sm,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  legendSubtitle: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  bonusText: {
    color: COLORS.bonusRevenue,
    fontWeight: '600',
  },
  legendArrow: {
    fontSize: TYPOGRAPHY.h2,
    color: COLORS.textTertiary,
    fontWeight: '300',
  },
  breakdownContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: IS_TABLET ? 16 : 12,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  breakdownSection: {
    marginBottom: SPACING.lg,
  },
  breakdownTitle: {
    fontSize: TYPOGRAPHY.h3,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  breakdownItems: {
    gap: SPACING.sm,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.mosaRevenue,
    marginRight: SPACING.sm,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  breakdownValue: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  bonusSection: {
    marginTop: SPACING.md,
  },
  bonusGradient: {
    padding: SPACING.md,
    borderRadius: IS_TABLET ? 12 : 8,
    alignItems: 'center',
  },
  bonusTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '700',
    color: COLORS.bonusRevenue,
    marginBottom: SPACING.xs,
  },
  bonusDescription: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  compactContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: IS_TABLET ? 16 : 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    margin: SPACING.xs,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  compactTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  compactArrow: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textTertiary,
  },
  footer: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: 'rgba(0, 102, 255, 0.1)',
    borderRadius: IS_TABLET ? 12 : 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  footerText: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

// Performance optimization
RevenueSplitDisplay.whyDidYouRender = false;

export default RevenueSplitDisplay;