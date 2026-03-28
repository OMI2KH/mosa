/**
 * 🎯 MOSA FORGE: Enterprise Expert Payout Flow Component
 * 
 * @component ExpertPayoutFlow
 * @description Displays and manages expert payout schedule with real-time tracking
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - 333/333/333 Payout schedule visualization
 * - Real-time payout status tracking
 * - Quality bonus calculations
 * - Revenue split transparency
 * - Interactive payout management
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  Dimensions,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

// 🏗️ Enterprise Constants
const PAYOUT_PHASES = {
  START: {
    key: 'START',
    label: 'Course Start',
    amount: 333,
    description: 'Paid upon successful course commencement',
    icon: 'play-circle-outline',
    color: '#10B981'
  },
  MIDPOINT: {
    key: 'MIDPOINT',
    label: '75% Completion',
    amount: 333,
    description: 'Paid when student reaches 75% progress',
    icon: 'time-outline',
    color: '#F59E0B'
  },
  COMPLETION: {
    key: 'COMPLETION',
    label: 'Certification',
    amount: 333,
    description: 'Paid upon course completion and certification',
    icon: 'trophy-outline',
    color: '#8B5CF6'
  }
};

const QUALITY_TIERS = {
  MASTER: {
    name: 'Master Tier',
    bonus: 0.2,
    color: '#F59E0B',
    icon: 'star',
    threshold: 4.7
  },
  SENIOR: {
    name: 'Senior Tier',
    bonus: 0.1,
    color: '#6B7280',
    icon: 'star-half',
    threshold: 4.3
  },
  STANDARD: {
    name: 'Standard Tier',
    bonus: 0,
    color: '#10B981',
    icon: 'star-outline',
    threshold: 4.0
  }
};

/**
 * 🏗️ Enterprise Expert Payout Flow Component
 * @param {Object} props - Component properties
 * @param {Object} props.expert - Expert data object
 * @param {Array} props.enrollments - Current enrollments
 * @param {Function} props.onPayoutRequest - Payout request handler
 * @param {Function} props.onRefresh - Data refresh handler
 * @param {boolean} props.isLoading - Loading state
 */
const ExpertPayoutFlow = ({
  expert,
  enrollments = [],
  onPayoutRequest,
  onRefresh,
  isLoading = false
}) => {
  // 🏗️ State Management
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [animationValues] = useState({
    progress: new Animated.Value(0),
    pulse: new Animated.Value(1)
  });

  // 🏗️ Memoized Calculations
  const payoutData = useMemo(() => {
    return calculatePayoutData(enrollments, expert);
  }, [enrollments, expert]);

  const totalEarnings = useMemo(() => {
    return payoutData.reduce((total, data) => total + data.totalEarned, 0);
  }, [payoutData]);

  const pendingPayouts = useMemo(() => {
    return payoutData.reduce((total, data) => total + data.pendingAmount, 0);
  }, [payoutData]);

  // 🏗️ Effects
  useEffect(() => {
    startAnimations();
  }, []);

  useEffect(() => {
    if (enrollments.length > 0 && !selectedEnrollment) {
      setSelectedEnrollment(enrollments[0].id);
    }
  }, [enrollments]);

  // 🏗️ Animation Handlers
  const startAnimations = useCallback(() => {
    // Progress animation
    Animated.timing(animationValues.progress, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    // Pulse animation for pending payouts
    Animated.loop(
      Animated.sequence([
        Animated.timing(animationValues.pulse, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animationValues.pulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animationValues]);

  // 🏗️ Event Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const handlePayoutRequest = useCallback(async (payoutId) => {
    try {
      Alert.alert(
        'Confirm Payout Request',
        'Are you sure you want to request this payout?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Confirm', 
            style: 'destructive',
            onPress: () => onPayoutRequest?.(payoutId)
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to process payout request');
    }
  }, [onPayoutRequest]);

  const handleEnrollmentSelect = useCallback((enrollmentId) => {
    setSelectedEnrollment(enrollmentId);
  }, []);

  // 🏗️ Render Methods
  const renderHeader = () => (
    <LinearGradient
      colors={['#1E40AF', '#3B82F6']}
      style={styles.header}
    >
      <BlurView intensity={80} style={StyleSheet.absoluteFill} />
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Payout Schedule</Text>
        <Text style={styles.headerSubtitle}>
          999 ETB per student • Quality Bonuses up to 20%
        </Text>
        
        <View style={styles.earningsSummary}>
          <View style={styles.earningsItem}>
            <Text style={styles.earningsLabel}>Total Earned</Text>
            <Text style={styles.earningsValue}>
              {totalEarnings.toLocaleString()} ETB
            </Text>
          </View>
          <View style={styles.earningsDivider} />
          <View style={styles.earningsItem}>
            <Text style={styles.earningsLabel}>Pending</Text>
            <Animated.Text 
              style={[
                styles.earningsValue,
                { transform: [{ scale: animationValues.pulse }] }
              ]}
            >
              {pendingPayouts.toLocaleString()} ETB
            </Animated.Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  const renderQualityTier = () => {
    const tier = QUALITY_TIERS[expert?.tier] || QUALITY_TIERS.STANDARD;
    
    return (
      <View style={styles.qualityTier}>
        <View style={styles.tierHeader}>
          <Ionicons name={tier.icon} size={20} color={tier.color} />
          <Text style={[styles.tierName, { color: tier.color }]}>
            {tier.name}
          </Text>
        </View>
        <Text style={styles.tierBonus}>
          {tier.bonus > 0 ? `+${tier.bonus * 100}% Bonus` : 'Standard Rate'}
        </Text>
        <Text style={styles.tierThreshold}>
          Quality Score: {expert?.qualityScore?.toFixed(1) || 'N/A'} / {tier.threshold}+
        </Text>
      </View>
    );
  };

  const renderEnrollmentSelector = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.enrollmentSelector}
    >
      {enrollments.map((enrollment) => (
        <TouchableOpacity
          key={enrollment.id}
          style={[
            styles.enrollmentTab,
            selectedEnrollment === enrollment.id && styles.enrollmentTabActive
          ]}
          onPress={() => handleEnrollmentSelect(enrollment.id)}
        >
          <Text style={[
            styles.enrollmentTabText,
            selectedEnrollment === enrollment.id && styles.enrollmentTabTextActive
          ]}>
            {enrollment.student?.name || `Student ${enrollment.id.slice(-4)}`}
          </Text>
          <Text style={styles.enrollmentProgress}>
            {Math.round(enrollment.progress * 100)}%
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderPayoutSchedule = () => {
    const enrollmentData = payoutData.find(data => data.enrollmentId === selectedEnrollment);
    if (!enrollmentData) return null;

    return (
      <View style={styles.payoutSchedule}>
        <Text style={styles.scheduleTitle}>Payout Schedule - 333/333/333</Text>
        
        {Object.values(PAYOUT_PHASES).map((phase, index) => {
          const payout = enrollmentData.payouts.find(p => p.phase === phase.key);
          const isCompleted = payout?.status === 'PAID';
          const isPending = payout?.status === 'PENDING';
          const isAvailable = payout?.status === 'AVAILABLE';

          return (
            <Animated.View 
              key={phase.key}
              style={[
                styles.payoutPhase,
                {
                  opacity: animationValues.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1]
                  }),
                  transform: [{
                    translateY: animationValues.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0]
                    })
                  }]
                }
              ]}
            >
              <View style={styles.phaseHeader}>
                <View style={styles.phaseInfo}>
                  <Ionicons 
                    name={phase.icon} 
                    size={24} 
                    color={phase.color} 
                  />
                  <View style={styles.phaseText}>
                    <Text style={styles.phaseLabel}>{phase.label}</Text>
                    <Text style={styles.phaseDescription}>
                      {phase.description}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.phaseAmount}>
                  <Text style={styles.amountText}>
                    {phase.amount} ETB
                  </Text>
                  {payout?.bonusAmount > 0 && (
                    <Text style={styles.bonusText}>
                      +{payout.bonusAmount} ETB bonus
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.phaseStatus}>
                <View style={[
                  styles.statusBadge,
                  isCompleted && styles.statusBadgeCompleted,
                  isPending && styles.statusBadgePending,
                  isAvailable && styles.statusBadgeAvailable
                ]}>
                  <Text style={styles.statusText}>
                    {getStatusText(payout?.status)}
                  </Text>
                </View>

                {isAvailable && (
                  <TouchableOpacity
                    style={styles.requestButton}
                    onPress={() => handlePayoutRequest(payout.id)}
                  >
                    <Text style={styles.requestButtonText}>
                      Request Payout
                    </Text>
                  </TouchableOpacity>
                )}

                {isPending && (
                  <View style={styles.pendingInfo}>
                    <Ionicons name="time" size={16} color="#F59E0B" />
                    <Text style={styles.pendingText}>
                      Processing...
                    </Text>
                  </View>
                )}

                {isCompleted && payout?.paidAt && (
                  <View style={styles.completedInfo}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.completedText}>
                      Paid on {new Date(payout.paidAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>

              {index < Object.values(PAYOUT_PHASES).length - 1 && (
                <View style={styles.phaseConnector} />
              )}
            </Animated.View>
          );
        })}
      </View>
    );
  };

  const renderRevenueSplit = () => (
    <View style={styles.revenueSplit}>
      <Text style={styles.revenueTitle}>Revenue Distribution</Text>
      
      <View style={styles.splitContainer}>
        <View style={styles.splitItem}>
          <View style={[styles.splitColor, { backgroundColor: '#10B981' }]} />
          <Text style={styles.splitLabel}>Expert Earnings</Text>
          <Text style={styles.splitValue}>999 ETB</Text>
          <Text style={styles.splitPercentage}>(49.97%)</Text>
        </View>
        
        <View style={styles.splitItem}>
          <View style={[styles.splitColor, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.splitLabel}>Mosa Platform</Text>
          <Text style={styles.splitValue}>1000 ETB</Text>
          <Text style={styles.splitPercentage}>(50.03%)</Text>
        </View>
      </View>

      <View style={styles.splitBreakdown}>
        <Text style={styles.breakdownTitle}>Expert Payout Schedule:</Text>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownPhase}>• Course Start:</Text>
          <Text style={styles.breakdownAmount}>333 ETB</Text>
        </View>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownPhase}>• 75% Completion:</Text>
          <Text style={styles.breakdownAmount}>333 ETB</Text>
        </View>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownPhase}>• Certification:</Text>
          <Text style={styles.breakdownAmount}>333 ETB</Text>
        </View>
      </View>
    </View>
  );

  // 🏗️ Main Render
  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isLoading}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        
        <View style={styles.content}>
          {renderQualityTier()}
          
          {enrollments.length > 0 && (
            <>
              {renderEnrollmentSelector()}
              {renderPayoutSchedule()}
            </>
          )}
          
          {renderRevenueSplit()}

          {enrollments.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyStateTitle}>No Active Enrollments</Text>
              <Text style={styles.emptyStateText}>
                Payout information will appear here when you have active students
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

// 🏗️ Utility Functions
const calculatePayoutData = (enrollments, expert) => {
  return enrollments.map(enrollment => {
    const payouts = Object.values(PAYOUT_PHASES).map(phase => {
      const baseAmount = phase.amount;
      const bonusMultiplier = QUALITY_TIERS[expert?.tier]?.bonus || 0;
      const bonusAmount = Math.round(baseAmount * bonusMultiplier);
      const totalAmount = baseAmount + bonusAmount;

      // Determine payout status based on enrollment progress
      let status = 'LOCKED';
      if (phase.key === 'START' && enrollment.progress > 0) {
        status = 'PAID';
      } else if (phase.key === 'MIDPOINT' && enrollment.progress >= 0.75) {
        status = enrollment.progress >= 0.9 ? 'PAID' : 'AVAILABLE';
      } else if (phase.key === 'COMPLETION' && enrollment.progress >= 1) {
        status = 'AVAILABLE';
      }

      return {
        id: `${enrollment.id}-${phase.key}`,
        phase: phase.key,
        baseAmount,
        bonusAmount,
        totalAmount,
        status,
        paidAt: status === 'PAID' ? new Date().toISOString() : null
      };
    });

    const totalEarned = payouts
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.totalAmount, 0);

    const pendingAmount = payouts
      .filter(p => p.status === 'AVAILABLE')
      .reduce((sum, p) => sum + p.totalAmount, 0);

    return {
      enrollmentId: enrollment.id,
      studentName: enrollment.student?.name,
      progress: enrollment.progress,
      payouts,
      totalEarned,
      pendingAmount
    };
  });
};

const getStatusText = (status) => {
  const statusMap = {
    PAID: 'Paid',
    PENDING: 'Processing',
    AVAILABLE: 'Available',
    LOCKED: 'Locked'
  };
  return statusMap[status] || 'Unknown';
};

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E5E7EB',
    marginBottom: 24,
    textAlign: 'center',
  },
  earningsSummary: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  earningsItem: {
    flex: 1,
    alignItems: 'center',
  },
  earningsDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  earningsLabel: {
    fontSize: 14,
    color: '#E5E7EB',
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  qualityTier: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tierName: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  tierBonus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  tierThreshold: {
    fontSize: 14,
    color: '#6B7280',
  },
  enrollmentSelector: {
    marginBottom: 20,
  },
  enrollmentTab: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 120,
  },
  enrollmentTabActive: {
    backgroundColor: '#3B82F6',
  },
  enrollmentTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  enrollmentTabTextActive: {
    color: '#FFFFFF',
  },
  enrollmentProgress: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  payoutSchedule: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  scheduleTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  payoutPhase: {
    marginBottom: 16,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  phaseInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  phaseText: {
    marginLeft: 12,
    flex: 1,
  },
  phaseLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  phaseDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  phaseAmount: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  bonusText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  phaseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeCompleted: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeAvailable: {
    backgroundColor: '#DBEAFE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  requestButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 12,
    color: '#F59E0B',
    marginLeft: 4,
  },
  completedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
  },
  phaseConnector: {
    height: 20,
    width: 2,
    backgroundColor: '#E5E7EB',
    marginLeft: 11,
    marginTop: 4,
  },
  revenueSplit: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  revenueTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  splitContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  splitItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  splitColor: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  splitLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  splitValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  splitPercentage: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  splitBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownPhase: {
    fontSize: 14,
    color: '#6B7280',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

// 🏗️ Enterprise Export
export default React.memo(ExpertPayoutFlow);
export { PAYOUT_PHASES, QUALITY_TIERS };