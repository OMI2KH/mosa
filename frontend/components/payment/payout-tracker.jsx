/**
 * 🎯 MOSA FORGE: Enterprise Payout Tracker Component
 * 
 * @component PayoutTracker
 * @description Real-time expert payout tracking with revenue split visualization
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time payout tracking (333/333/333 schedule)
 * - Revenue split visualization (1000/999)
 * - Quality bonus calculations (up to 20%)
 * - Multi-payment gateway support
 * - Performance analytics
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
  Alert
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { BlurView } from '@react-native-community/blur';
import { useFocusEffect } from '@react-navigation/native';

// 🏗️ Enterprise Constants
const PAYOUT_SCHEDULE = {
  UPFRONT: { phase: 'START', amount: 333, label: 'Course Start' },
  MILESTONE: { phase: 'MIDPOINT', amount: 333, label: '75% Completion' },
  COMPLETION: { phase: 'COMPLETION', amount: 333, label: 'Certification' }
};

const QUALITY_TIERS = {
  MASTER: { threshold: 4.7, bonus: 0.2, color: '#FFD700' },
  SENIOR: { threshold: 4.3, bonus: 0.1, color: '#C0C0C0' },
  STANDARD: { threshold: 4.0, bonus: 0, color: '#CD7F32' }
};

const PAYMENT_GATEWAYS = {
  TELEBIRR: { name: 'Telebirr', color: '#00A859' },
  CBE_BIRR: { name: 'CBE Birr', color: '#E30613' }
};

/**
 * 🏗️ Enterprise Payout Tracker Component
 */
const PayoutTracker = ({ expertId, onPayoutUpdate, refreshInterval = 30000 }) => {
  // 🏗️ State Management
  const [payoutData, setPayoutData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [analytics, setAnalytics] = useState({});
  
  // 🏗️ Animation Values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  // 🏗️ Performance Optimization
  const memoizedPayoutService = useMemo(() => new PayoutService(), []);
  const screenWidth = Dimensions.get('window').width;

  /**
   * 🏗️ Initialize Component
   */
  useEffect(() => {
    _initializeComponent();
    _startAutoRefresh();
    
    return () => {
      _cleanup();
    };
  }, [expertId]);

  /**
   * 🏗️ Handle Screen Focus
   */
  useFocusEffect(
    useCallback(() => {
      _refreshData();
      return () => {};
    }, [expertId])
  );

  /**
   * 🏗️ Initialize Component with Animations
   */
  const _initializeComponent = async () => {
    try {
      await _loadPayoutData();
      _startEntranceAnimations();
    } catch (err) {
      _handleError(err);
    }
  };

  /**
   * 🏗️ Load Payout Data with Caching
   */
  const _loadPayoutData = async (forceRefresh = false) => {
    if (!forceRefresh && !loading) setLoading(true);
    
    try {
      const data = await memoizedPayoutService.getExpertPayouts(expertId, {
        includeAnalytics: true,
        includeHistory: true,
        forceRefresh
      });

      setPayoutData(data.payouts);
      setAnalytics(data.analytics);
      setLastUpdated(new Date());
      setError(null);

      // Notify parent component
      onPayoutUpdate?.(data.payouts);

    } catch (err) {
      _handleError(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * 🏗️ Start Entrance Animations
   */
  const _startEntranceAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();
  };

  /**
   * 🏗️ Start Auto-Refresh
   */
  const _startAutoRefresh = () => {
    const interval = setInterval(() => {
      _refreshData(false);
    }, refreshInterval);

    return () => clearInterval(interval);
  };

  /**
   * 🏗️ Refresh Data with Pull-to-Refresh
   */
  const _refreshData = (showRefresh = true) => {
    if (showRefresh) setRefreshing(true);
    _loadPayoutData(true);
  };

  /**
   * 🏗️ Handle Errors Gracefully
   */
  const _handleError = (error) => {
    console.error('PayoutTracker Error:', error);
    setError(error.message);
    
    // Show user-friendly error message
    Alert.alert(
      'Connection Issue',
      'Unable to load payout data. Please check your connection and try again.',
      [{ text: 'Retry', onPress: () => _refreshData() }]
    );
  };

  /**
   * 🏗️ Cleanup Resources
   */
  const _cleanup = () => {
    memoizedPayoutService.cleanup();
  };

  /**
   * 🎯 Calculate Total Earnings
   */
  const _calculateTotalEarnings = useCallback(() => {
    if (!payoutData) return 0;
    
    return payoutData.reduce((total, payout) => {
      return total + (payout.amount + (payout.bonusAmount || 0));
    }, 0);
  }, [payoutData]);

  /**
   * 🎯 Calculate Pending Payouts
   */
  const _calculatePendingPayouts = useCallback(() => {
    if (!payoutData) return 0;
    
    return payoutData
      .filter(payout => payout.status === 'PENDING')
      .reduce((total, payout) => total + payout.amount, 0);
  }, [payoutData]);

  /**
   * 🎯 Get Quality Tier Info
   */
  const _getQualityTierInfo = useCallback(() => {
    const qualityScore = analytics.qualityScore || 0;
    
    for (const [tier, config] of Object.entries(QUALITY_TIERS)) {
      if (qualityScore >= config.threshold) {
        return { tier, ...config };
      }
    }
    
    return { tier: 'DEVELOPING', bonus: 0, color: '#6B7280' };
  }, [analytics.qualityScore]);

  /**
   * 🎯 Format Currency for Display
   */
  const _formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 0
    }).format(amount);
  };

  /**
   * 🎯 Render Loading State
   */
  const _renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <Animated.View style={[styles.skeletonCard, { opacity: pulseAnim }]}>
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '70%' }]} />
        <View style={[styles.skeletonLine, { width: '50%' }]} />
      </Animated.View>
      {_startPulseAnimation()}
    </View>
  );

  /**
   * 🎯 Start Pulse Animation
   */
  const _startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      ])
    ).start();
  };

  /**
   * 🎯 Render Error State
   */
  const _renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>📡</Text>
      <Text style={styles.errorTitle}>Connection Lost</Text>
      <Text style={styles.errorMessage}>
        {error || 'Unable to load payout data'}
      </Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={() => _refreshData()}
      >
        <Text style={styles.retryButtonText}>Retry Connection</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * 🎯 Render Payout Summary Card
   */
  const _renderSummaryCard = () => {
    const totalEarnings = _calculateTotalEarnings();
    const pendingPayouts = _calculatePendingPayouts();
    const tierInfo = _getQualityTierInfo();

    return (
      <Animated.View 
        style={[
          styles.summaryCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Revenue Summary</Text>
          <View style={[styles.tierBadge, { backgroundColor: tierInfo.color }]}>
            <Text style={styles.tierText}>{tierInfo.tier}</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Earned</Text>
            <Text style={styles.summaryValue}>
              {_formatCurrency(totalEarnings)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={[styles.summaryValue, styles.pendingValue]}>
              {_formatCurrency(pendingPayouts)}
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Quality Bonus</Text>
            <Text style={[styles.summaryValue, styles.bonusValue]}>
              +{tierInfo.bonus * 100}%
            </Text>
          </View>
        </View>

        {_renderRevenueSplitChart()}
      </Animated.View>
    );
  };

  /**
   * 🎯 Render Revenue Split Chart
   */
  const _renderRevenueSplitChart = () => {
    const chartData = [
      {
        name: 'Mosa Platform',
        amount: 1000,
        color: '#3B82F6',
        legendFontColor: '#6B7280',
        legendFontSize: 12
      },
      {
        name: 'Expert Earnings',
        amount: 999,
        color: '#10B981',
        legendFontColor: '#6B7280',
        legendFontSize: 12
      }
    ];

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Revenue Split per Student (1,999 ETB)</Text>
        <PieChart
          data={chartData}
          width={screenWidth - 80}
          height={120}
          chartConfig={{
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>
    );
  };

  /**
   * 🎯 Render Payout Schedule
   */
  const _renderPayoutSchedule = () => (
    <Animated.View 
      style={[
        styles.scheduleCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Text style={styles.scheduleTitle}>Payout Schedule (333/333/333)</Text>
      
      {Object.values(PAYOUT_SCHEDULE).map((schedule, index) => (
        <View key={schedule.phase} style={styles.scheduleItem}>
          <View style={styles.schedulePhase}>
            <View style={styles.phaseIndicator}>
              <Text style={styles.phaseNumber}>{index + 1}</Text>
            </View>
            <View style={styles.phaseInfo}>
              <Text style={styles.phaseLabel}>{schedule.label}</Text>
              <Text style={styles.phaseAmount}>
                {_formatCurrency(schedule.amount)}
              </Text>
            </View>
          </View>
          
          {_renderPayoutStatus(schedule.phase)}
        </View>
      ))}
    </Animated.View>
  );

  /**
   * 🎯 Render Payout Status
   */
  const _renderPayoutStatus = (phase) => {
    if (!payoutData) return null;
    
    const payout = payoutData.find(p => p.phase === phase);
    
    if (!payout) {
      return (
        <View style={[styles.statusBadge, styles.statusPending]}>
          <Text style={styles.statusText}>Pending</Text>
        </View>
      );
    }

    const statusConfig = {
      PAID: { style: styles.statusPaid, text: 'Paid' },
      PENDING: { style: styles.statusPending, text: 'Processing' },
      FAILED: { style: styles.statusFailed, text: 'Failed' }
    };

    const config = statusConfig[payout.status] || statusConfig.PENDING;

    return (
      <View style={[styles.statusBadge, config.style]}>
        <Text style={styles.statusText}>{config.text}</Text>
      </View>
    );
  };

  /**
   * 🎯 Render Earnings Chart
   */
  const _renderEarningsChart = () => {
    if (!analytics.earningsHistory) return null;

    const chartData = {
      labels: analytics.earningsHistory.map(month => month.month.substring(0, 3)),
      datasets: [
        {
          data: analytics.earningsHistory.map(month => month.amount),
          color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };

    return (
      <Animated.View 
        style={[
          styles.chartCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Text style={styles.chartTitle}>Earnings Trend</Text>
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={200}
          chartConfig={{
            backgroundColor: '#FFFFFF',
            backgroundGradientFrom: '#FFFFFF',
            backgroundGradientTo: '#FFFFFF',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#10B981'
            }
          }}
          bezier
          style={styles.chart}
        />
      </Animated.View>
    );
  };

  /**
   * 🎯 Render Payment Methods
   */
  const _renderPaymentMethods = () => (
    <Animated.View 
      style={[
        styles.methodsCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Text style={styles.methodsTitle}>Payment Methods</Text>
      
      <View style={styles.methodsGrid}>
        {Object.values(PAYMENT_GATEWAYS).map((gateway) => (
          <View key={gateway.name} style={styles.methodItem}>
            <View 
              style={[
                styles.methodIcon, 
                { backgroundColor: gateway.color }
              ]}
            >
              <Text style={styles.methodIconText}>💰</Text>
            </View>
            <Text style={styles.methodName}>{gateway.name}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  /**
   * 🎯 Main Render Method
   */
  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => _refreshData(true)}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 🏗️ Loading State */}
        {loading && !payoutData && _renderLoadingState()}

        {/* 🏗️ Error State */}
        {error && _renderErrorState()}

        {/* 🏗️ Data Display */}
        {payoutData && !loading && (
          <>
            {_renderSummaryCard()}
            {_renderPayoutSchedule()}
            {_renderEarningsChart()}
            {_renderPaymentMethods()}
          </>
        )}

        {/* 🏗️ Last Updated Indicator */}
        {lastUpdated && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

/**
 * 🏗️ Enterprise Payout Service Class
 */
class PayoutService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * 🏗️ Get Expert Payouts with Caching
   */
  async getExpertPayouts(expertId, options = {}) {
    const cacheKey = `payouts_${expertId}`;
    
    // Check cache first
    if (!options.forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      // 🏗️ Simulate API call - replace with actual API
      const data = await this._fetchPayoutData(expertId, options);
      
      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('PayoutService Error:', error);
      throw error;
    }
  }

  /**
   * 🏗️ Fetch Payout Data from API
   */
  async _fetchPayoutData(expertId, options) {
    // 🏗️ Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 🏗️ Mock data - replace with actual API call
    return {
      payouts: [
        {
          id: '1',
          phase: 'START',
          amount: 333,
          bonusAmount: 66.6, // 20% bonus for Master tier
          status: 'PAID',
          paymentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          gateway: 'TELEBIRR'
        },
        {
          id: '2',
          phase: 'MIDPOINT',
          amount: 333,
          bonusAmount: 66.6,
          status: 'PENDING',
          expectedDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        },
        {
          id: '3',
          phase: 'COMPLETION',
          amount: 333,
          bonusAmount: 66.6,
          status: 'PENDING',
          expectedDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)
        }
      ],
      analytics: {
        qualityScore: 4.8,
        totalStudents: 25,
        completionRate: 0.85,
        earningsHistory: [
          { month: '2024-01', amount: 24500 },
          { month: '2024-02', amount: 31200 },
          { month: '2024-03', amount: 28700 },
          { month: '2024-04', amount: 35600 },
          { month: '2024-05', amount: 41200 },
          { month: '2024-06', amount: 38900 }
        ]
      }
    };
  }

  /**
   * 🏗️ Cleanup Resources
   */
  cleanup() {
    this.cache.clear();
  }
}

/**
 * 🏗️ Enterprise Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  skeletonCard: {
    backgroundColor: '#E5E7EB',
    padding: 20,
    borderRadius: 12,
    width: '100%',
  },
  skeletonLine: {
    backgroundColor: '#D1D5DB',
    height: 16,
    borderRadius: 4,
    marginBottom: 12,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tierText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  pendingValue: {
    color: '#F59E0B',
  },
  bonusValue: {
    color: '#10B981',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scheduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  schedulePhase: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  phaseIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  phaseNumber: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  phaseInfo: {
    flex: 1,
  },
  phaseLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  phaseAmount: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusPaid: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusFailed: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chart: {
    borderRadius: 16,
  },
  methodsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  methodsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  methodsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  methodItem: {
    alignItems: 'center',
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodIconText: {
    fontSize: 20,
  },
  methodName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

// 🏗️ Enhanced TouchableOpacity for better performance
const TouchableOpacity = ({ style, onPress, children, ...props }) => {
  return (
    <View style={style}>
      <Text onPress={onPress} {...props}>
        {children}
      </Text>
    </View>
  );
};

// 🏗️ Enterprise Export
export default React.memo(PayoutTracker);

// 🏗️ Additional Exports for Enterprise Use
export { PAYOUT_SCHEDULE, QUALITY_TIERS, PAYMENT_GATEWAYS };