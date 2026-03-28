/**
 * 🎯 MOSA FORGE: Enterprise Expert Payout Schedule Component
 * 
 * @component PayoutSchedule
 * @description Expert revenue tracking, payout scheduling, and earnings visualization
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - 333/333/333 Payout schedule visualization
 * - Quality bonus calculations (up to 20%)
 * - Real-time revenue tracking
 * - Performance-based earnings
 * - Multi-enrollment payout aggregation
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
  TouchableOpacity,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Chart, Line, Area, XAxis, YAxis, Tooltip } from 'react-native-svg-charts';
import * as shape from 'd3-shape';
import { useFocusEffect } from '@react-navigation/native';

// 🏗️ Enterprise Constants
const PAYOUT_PHASES = {
  START: { label: 'Course Start', amount: 333, color: '#10B981' },
  MIDPOINT: { label: '75% Completion', amount: 333, color: '#3B82F6' },
  COMPLETION: { label: 'Certification', amount: 333, color: '#8B5CF6' }
};

const TIER_BONUSES = {
  MASTER: { multiplier: 1.2, label: 'Master Tier (+20%)', color: '#F59E0B' },
  SENIOR: { multiplier: 1.1, label: 'Senior Tier (+10%)', color: '#EF4444' },
  STANDARD: { multiplier: 1.0, label: 'Standard Tier', color: '#6B7280' }
};

const PAYOUT_STATUS = {
  PENDING: { label: 'Pending', color: '#6B7280', bgColor: '#F3F4F6' },
  PROCESSING: { label: 'Processing', color: '#F59E0B', bgColor: '#FEF3C7' },
  PAID: { label: 'Paid', color: '#10B981', bgColor: '#D1FAE5' },
  FAILED: { label: 'Failed', color: '#EF4444', bgColor: '#FEE2E2' }
};

/**
 * 🏗️ Enterprise Payout Schedule Component
 * @param {Object} props - Component properties
 */
const PayoutSchedule = ({ expertId, onRevenueUpdate, refreshTrigger }) => {
  // 🏗️ State Management
  const [payoutData, setPayoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    totalEarnings: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    qualityBonus: 0,
    expectedMonthly: 0
  });

  // 🏗️ Animation Values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  // 🏗️ Chart Dimensions
  const chartHeight = 200;
  const { width: screenWidth } = Dimensions.get('window');

  /**
   * 🏗️ Initialize Component
   */
  useEffect(() => {
    _initializeComponent();
    _startPulseAnimation();
  }, []);

  /**
   * 🏗️ Refresh on Focus
   */
  useFocusEffect(
    useCallback(() => {
      _loadPayoutData();
      return () => {
        // Cleanup if needed
      };
    }, [expertId])
  );

  /**
   * 🏗️ External Refresh Trigger
   */
  useEffect(() => {
    if (refreshTrigger) {
      _handleRefresh();
    }
  }, [refreshTrigger]);

  /**
   * 🏗️ Initialize Component with Animations
   */
  const _initializeComponent = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();

    _loadPayoutData();
  };

  /**
   * 🏗️ Pulse Animation for Important Metrics
   */
  const _startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  };

  /**
   * 🏗️ Load Payout Data from API
   */
  const _loadPayoutData = async () => {
    try {
      setError(null);
      const data = await _fetchPayoutData();
      setPayoutData(data);
      _calculateMetrics(data);
      
      // Notify parent component of revenue update
      onRevenueUpdate?.(data.metrics.totalEarnings);
    } catch (err) {
      setError(err.message);
      _logError('LOAD_PAYOUT_DATA_FAILED', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * 🏗️ Fetch Payout Data with Error Handling
   */
  const _fetchPayoutData = async () => {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/experts/${expertId}/payouts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${await _getAuthToken()}`,
        'Content-Type': 'application/json',
        'X-Request-ID': _generateRequestId()
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch payout data: ${response.status}`);
    }

    const data = await response.json();
    return _transformPayoutData(data);
  };

  /**
   * 🏗️ Transform API Data to Component Format
   */
  const _transformPayoutData = (apiData) => {
    return {
      expert: apiData.expert,
      enrollments: apiData.enrollments.map(enrollment => ({
        ...enrollment,
        payouts: enrollment.payouts.map(payout => ({
          ...payout,
          phase: PAYOUT_PHASES[payout.phase],
          status: PAYOUT_STATUS[payout.status],
          payableAmount: _calculatePayableAmount(payout, apiData.expert.tier)
        }))
      })),
      metrics: apiData.metrics,
      tier: TIER_BONUSES[apiData.expert.tier] || TIER_BONUSES.STANDARD
    };
  };

  /**
   * 🏗️ Calculate Payable Amount with Bonuses
   */
  const _calculatePayableAmount = (payout, expertTier) => {
    const baseAmount = payout.amount;
    const tierMultiplier = TIER_BONUSES[expertTier]?.multiplier || 1;
    const qualityBonus = payout.qualityBonus || 0;
    
    return (baseAmount * tierMultiplier) + qualityBonus;
  };

  /**
   * 🏗️ Calculate Comprehensive Metrics
   */
  const _calculateMetrics = (data) => {
    if (!data) return;

    const allPayouts = data.enrollments.flatMap(e => e.payouts);
    const paidPayouts = allPayouts.filter(p => p.status.key === 'PAID');
    const pendingPayouts = allPayouts.filter(p => p.status.key === 'PENDING');

    const totalEarnings = paidPayouts.reduce((sum, payout) => sum + payout.payableAmount, 0);
    const pendingAmount = pendingPayouts.reduce((sum, payout) => sum + payout.payableAmount, 0);
    const qualityBonus = allPayouts.reduce((sum, payout) => sum + (payout.qualityBonus || 0), 0);

    setMetrics({
      totalEarnings,
      pendingPayouts: pendingAmount,
      completedPayouts: totalEarnings,
      qualityBonus,
      expectedMonthly: _calculateExpectedMonthly(data.enrollments, data.expert.tier)
    });
  };

  /**
   * 🏗️ Calculate Expected Monthly Revenue
   */
  const _calculateExpectedMonthly = (enrollments, tier) => {
    const activeEnrollments = enrollments.filter(e => 
      e.status === 'ACTIVE' && e.progress < 100
    );
    
    const tierMultiplier = TIER_BONUSES[tier]?.multiplier || 1;
    const monthlyPotential = activeEnrollments.length * 333 * tierMultiplier;
    
    return monthlyPotential;
  };

  /**
   * 🏗️ Handle Pull-to-Refresh
   */
  const _handleRefresh = () => {
    setRefreshing(true);
    _loadPayoutData();
  };

  /**
   * 🏗️ Get Authentication Token
   */
  const _getAuthToken = async () => {
    // Implementation would integrate with your auth system
    return 'expert-auth-token';
  };

  /**
   * 🏗️ Generate Unique Request ID
   */
  const _generateRequestId = () => {
    return `payout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * 🏗️ Format Currency for Display
   */
  const _formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0
    }).format(amount);
  };

  /**
   * 🏗️ Enterprise Logging
   */
  const _logError = (operation, error) => {
    console.error(`[PayoutSchedule] ${operation}:`, {
      error: error.message,
      expertId,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * 🏗️ Memoized Revenue Chart Data
   */
  const chartData = useMemo(() => {
    if (!payoutData) return [];

    const monthlyEarnings = {};
    payoutData.enrollments.forEach(enrollment => {
      enrollment.payouts.forEach(payout => {
        if (payout.status.key === 'PAID' && payout.paidAt) {
          const month = new Date(payout.paidAt).toISOString().substring(0, 7);
          monthlyEarnings[month] = (monthlyEarnings[month] || 0) + payout.payableAmount;
        }
      });
    });

    return Object.entries(monthlyEarnings)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  }, [payoutData]);

  /**
   * 🏗️ Render Loading State
   */
  const _renderLoading = () => (
    <View style={styles.loadingContainer}>
      <Animated.View style={[styles.skeletonCard, { opacity: fadeAnim }]} />
      <Animated.View style={[styles.skeletonCard, { opacity: fadeAnim }]} />
      <Animated.View style={[styles.skeletonCard, { opacity: fadeAnim }]} />
    </View>
  );

  /**
   * 🏗️ Render Error State
   */
  const _renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>Failed to load payout data</Text>
      <Text style={styles.errorSubtext}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={_handleRefresh}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * 🏗️ Render Revenue Overview Card
   */
  const _renderRevenueOverview = () => (
    <Animated.View 
      style={[
        styles.revenueCard,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradientCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.revenueHeader}>
          <Text style={styles.revenueTitle}>Total Revenue</Text>
          <View style={[styles.tierBadge, { backgroundColor: payoutData.tier.color }]}>
            <Text style={styles.tierBadgeText}>{payoutData.tier.label}</Text>
          </View>
        </View>
        
        <Animated.Text 
          style={[
            styles.revenueAmount,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          {_formatCurrency(metrics.totalEarnings)}
        </Animated.Text>
        
        <View style={styles.revenueBreakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Pending</Text>
            <Text style={styles.breakdownValue}>
              {_formatCurrency(metrics.pendingPayouts)}
            </Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Quality Bonus</Text>
            <Text style={[styles.breakdownValue, styles.bonusText]}>
              +{_formatCurrency(metrics.qualityBonus)}
            </Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Expected This Month</Text>
            <Text style={styles.breakdownValue}>
              {_formatCurrency(metrics.expectedMonthly)}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  /**
   * 🏗️ Render Revenue Trend Chart
   */
  const _renderRevenueChart = () => (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Revenue Trend (Last 6 Months)</Text>
      {chartData.length > 0 ? (
        <View style={styles.chartContainer}>
          <YAxis
            data={chartData}
            yAccessor={({ item }) => item.amount}
            contentInset={{ top: 20, bottom: 20 }}
            svg={{ fill: 'grey', fontSize: 10 }}
            numberOfTicks={5}
            formatLabel={(value) => `ETB ${value / 1000}k`}
          />
          <Chart
            style={{ flex: 1, marginLeft: 16 }}
            data={chartData}
            yAccessor={({ item }) => item.amount}
            xAccessor={({ item }) => item.month}
            contentInset={{ top: 20, bottom: 20 }}
            curve={shape.curveNatural}
            svg={{ fill: 'rgba(59, 130, 246, 0.1)' }}
          >
            <Area />
            <Line 
              stroke="rgb(59, 130, 246)" 
              strokeWidth={2}
            />
            <Tooltip />
          </Chart>
        </View>
      ) : (
        <View style={styles.emptyChart}>
          <Text style={styles.emptyChartText}>No payout data available</Text>
        </View>
      )}
    </View>
  );

  /**
   * 🏗️ Render Payout Schedule
   */
  const _renderPayoutSchedule = () => (
    <View style={styles.scheduleCard}>
      <Text style={styles.scheduleTitle}>Payout Schedule</Text>
      <Text style={styles.scheduleSubtitle}>
        333/333/333 ETB per student with tier bonuses
      </Text>
      
      {payoutData.enrollments.map((enrollment) => (
        <View key={enrollment.id} style={styles.enrollmentCard}>
          <View style={styles.enrollmentHeader}>
            <Text style={styles.enrollmentSkill}>{enrollment.skillName}</Text>
            <Text style={styles.enrollmentStudent}>{enrollment.studentName}</Text>
          </View>
          
          <View style={styles.payoutsContainer}>
            {enrollment.payouts.map((payout, index) => (
              <View key={index} style={styles.payoutRow}>
                <View style={styles.payoutPhase}>
                  <View 
                    style={[
                      styles.phaseIndicator,
                      { backgroundColor: payout.phase.color }
                    ]} 
                  />
                  <Text style={styles.phaseLabel}>{payout.phase.label}</Text>
                </View>
                
                <View style={styles.payoutAmounts}>
                  <Text style={styles.baseAmount}>
                    {_formatCurrency(payout.phase.amount)}
                  </Text>
                  {payout.qualityBonus > 0 && (
                    <Text style={styles.bonusAmount}>
                      +{_formatCurrency(payout.qualityBonus)} bonus
                    </Text>
                  )}
                </View>
                
                <View style={styles.payoutStatus}>
                  <View 
                    style={[
                      styles.statusBadge,
                      { backgroundColor: payout.status.bgColor }
                    ]}
                  >
                    <Text style={[styles.statusText, { color: payout.status.color }]}>
                      {payout.status.label}
                    </Text>
                  </View>
                  {payout.paidAt && (
                    <Text style={styles.paidDate}>
                      {new Date(payout.paidAt).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
          
          <View style={styles.enrollmentTotal}>
            <Text style={styles.totalLabel}>Total for this enrollment:</Text>
            <Text style={styles.totalAmount}>
              {_formatCurrency(
                enrollment.payouts.reduce((sum, p) => sum + p.payableAmount, 0)
              )}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  /**
   * 🏗️ Render Payout Phases Legend
   */
  const _renderPayoutLegend = () => (
    <View style={styles.legendCard}>
      <Text style={styles.legendTitle}>Payout Structure</Text>
      <View style={styles.legendItems}>
        {Object.entries(PAYOUT_PHASES).map(([key, phase]) => (
          <View key={key} style={styles.legendItem}>
            <View 
              style={[
                styles.legendColor,
                { backgroundColor: phase.color }
              ]} 
            />
            <Text style={styles.legendText}>
              {phase.label}: {_formatCurrency(phase.amount)}
            </Text>
          </View>
        ))}
      </View>
      
      <View style={styles.tierInfo}>
        <Text style={styles.tierInfoTitle}>Tier Bonuses</Text>
        {Object.entries(TIER_BONUSES).map(([tier, data]) => (
          <View key={tier} style={styles.tierItem}>
            <View style={[styles.tierDot, { backgroundColor: data.color }]} />
            <Text style={styles.tierText}>{data.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  /**
   * 🏗️ Main Render Method
   */
  if (loading) {
    return _renderLoading();
  }

  if (error) {
    return _renderError();
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={_handleRefresh}
            colors={['#667eea', '#764ba2']}
            tintColor="#667eea"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {_renderRevenueOverview()}
        {_renderRevenueChart()}
        {_renderPayoutLegend()}
        {payoutData && _renderPayoutSchedule()}
        
        {/* 🏗️ Empty State */}
        {payoutData?.enrollments.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Active Enrollments</Text>
            <Text style={styles.emptyStateText}>
              Your payout schedule will appear here once students enroll in your courses.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// 🏗️ Enterprise Stylesheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  skeletonCard: {
    height: 120,
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
    opacity: 0.6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  revenueCard: {
    margin: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  gradientCard: {
    padding: 24,
    borderRadius: 20,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  revenueTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tierBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  revenueAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  revenueBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bonusText: {
    color: '#10B981',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  chartContainer: {
    height: 200,
    flexDirection: 'row',
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    color: '#6B7280',
    fontSize: 14,
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  scheduleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  scheduleSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  enrollmentCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  enrollmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  enrollmentSkill: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  enrollmentStudent: {
    fontSize: 14,
    color: '#6B7280',
  },
  payoutsContainer: {
    gap: 12,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  payoutPhase: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  phaseIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  phaseLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  payoutAmounts: {
    alignItems: 'flex-end',
    flex: 1,
  },
  baseAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  bonusAmount: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  payoutStatus: {
    alignItems: 'flex-end',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paidDate: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  enrollmentTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  legendCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  legendTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  legendItems: {
    gap: 12,
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  tierInfo: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tierInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  tierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  tierText: {
    fontSize: 14,
    color: '#374151',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

// 🏗️ Enhanced Export with Error Boundary
const withErrorBoundary = (Component) => {
  return function ErrorBoundaryWrapper(props) {
    const [hasError, setHasError] = useState(false);
    
    const handleError = useCallback((error, errorInfo) => {
      console.error('[PayoutSchedule Error Boundary]:', error, errorInfo);
      setHasError(true);
    }, []);
    
    if (hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Component Error</Text>
          <Text style={styles.errorSubtext}>
            Something went wrong displaying the payout schedule
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => setHasError(false)}
          >
            <Text style={styles.retryButtonText}>Reload Component</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <ErrorBoundary onError={handleError}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

// 🏗️ Simple Error Boundary for React Native
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  componentDidCatch(error, errorInfo) {
    this.props.onError?.(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    
    return this.props.children;
  }
}

// 🏗️ Enterprise Export
export default withErrorBoundary(PayoutSchedule);

// 🏗️ Additional Utility Exports
export { PAYOUT_PHASES, TIER_BONUSES, PAYOUT_STATUS };