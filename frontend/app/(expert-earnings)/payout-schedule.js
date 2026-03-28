/**
 * 🏢 MOSA FORGE - Enterprise Payout Schedule Interface
 * 💰 Expert Earnings Dashboard & Payout Tracking
 * 📅 333/333/333 Payment Schedule Visualization
 * 📊 Real-time Revenue Analytics & Performance Insights
 * 🚀 React Native Enterprise Application
 * 
 * @module PayoutSchedule
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Chip,
  Button,
  ProgressBar,
  Badge,
  Avatar,
  Divider,
  List,
  Surface,
  IconButton,
  Portal,
  Modal,
  ActivityIndicator
} from 'react-native-paper';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { 
  FadeInUp, 
  FadeIn, 
  SlideInLeft, 
  Layout 
} from 'react-native-reanimated';

// 🏗️ Enterprise Dependencies
import EnterpriseHeader from '../../components/layout/EnterpriseHeader';
import RevenueSplitCard from '../../components/payment/RevenueSplitCard';
import PayoutMilestoneCard from '../../components/payment/PayoutMilestoneCard';
import QualityBonusCard from '../../components/quality/QualityBonusCard';
import LoadingSkeleton from '../../components/feedback/LoadingSkeleton';
import ErrorBoundary from '../../components/error/ErrorBoundary';
import EmptyState from '../../components/feedback/EmptyState';

// 📊 Custom Hooks
import usePayoutSchedule from '../../hooks/usePayoutSchedule';
import useQualityMetrics from '../../hooks/useQualityMetrics';
import useRevenueAnalytics from '../../hooks/useRevenueAnalytics';
import useNotifications from '../../hooks/useNotifications';

// 🎨 Theme & Constants
import { COLORS, METRICS, TYPOGRAPHY, SPACING, SHADOWS } from '../../constants/theme';
import { PAYOUT_CONFIG, QUALITY_CONFIG } from '../../constants/payment';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 🏢 Payout Schedule Screen - Enterprise Expert Earnings Dashboard
 */
const PayoutSchedule = () => {
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('monthly');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState(0);

  // 📊 Custom Hooks Initialization
  const {
    payoutSchedule,
    isLoading: scheduleLoading,
    error: scheduleError,
    refreshSchedule,
    initiateWithdrawal,
    getUpcomingPayouts,
    getPayoutHistory
  } = usePayoutSchedule();

  const {
    qualityMetrics,
    isLoading: qualityLoading,
    refreshQualityMetrics,
    calculateQualityBonus
  } = useQualityMetrics();

  const {
    revenueAnalytics,
    isLoading: analyticsLoading,
    refreshAnalytics,
    getEarningsForecast
  } = useRevenueAnalytics();

  const {
    showSuccess,
    showError,
    showInfo
  } = useNotifications();

  /**
   * 🔄 Handle Refresh
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshSchedule(),
        refreshQualityMetrics(),
        refreshAnalytics()
      ]);
      showSuccess('Data refreshed successfully');
    } catch (error) {
      showError('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, [refreshSchedule, refreshQualityMetrics, refreshAnalytics]);

  /**
   * 🎯 Handle Payout Selection
   */
  const handlePayoutSelect = (payout) => {
    setSelectedPayout(payout);
    setShowDetails(true);
  };

  /**
   * 💸 Handle Withdrawal Request
   */
  const handleWithdrawalRequest = async () => {
    try {
      setShowWithdrawalModal(false);
      
      const result = await initiateWithdrawal({
        amount: withdrawalAmount,
        method: 'telebirr',
        notes: 'Expert withdrawal request'
      });

      if (result.success) {
        showSuccess(`Withdrawal of ${withdrawalAmount} ETB initiated`);
        handleRefresh();
      } else {
        showError('Withdrawal request failed');
      }
    } catch (error) {
      showError('Withdrawal processing error');
    }
  };

  /**
   * 📊 Calculate Total Earnings
   */
  const calculateTotalEarnings = () => {
    if (!payoutSchedule || !revenueAnalytics) return 0;
    
    const completed = payoutSchedule.completedPayouts || [];
    const pending = payoutSchedule.pendingPayouts || [];
    
    const completedTotal = completed.reduce((sum, payout) => sum + payout.amount, 0);
    const pendingTotal = pending.reduce((sum, payout) => sum + payout.amount, 0);
    
    return completedTotal + pendingTotal;
  };

  /**
   * 🎯 Calculate Quality Bonus
   */
  const calculateBonusEarnings = () => {
    if (!qualityMetrics || !revenueAnalytics) return 0;
    
    const qualityBonus = calculateQualityBonus(qualityMetrics);
    const tierBonus = revenueAnalytics.tierBonus || 0;
    
    return qualityBonus + tierBonus;
  };

  /**
   * 📅 Format Date
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ET', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  /**
   * 💰 Format Currency
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-ET', {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2
    }).format(amount);
  };

  /**
   * 📊 Render Earnings Summary
   */
  const renderEarningsSummary = () => (
    <Animated.View entering={FadeInUp.duration(500)}>
      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryHeader}>
            <Title style={styles.summaryTitle}>Earnings Overview</Title>
            <Chip 
              icon="calendar" 
              mode="outlined"
              onPress={() => setSelectedTimeframe(
                selectedTimeframe === 'monthly' ? 'quarterly' : 'monthly'
              )}
            >
              {selectedTimeframe === 'monthly' ? 'Monthly' : 'Quarterly'}
            </Chip>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.earningsGrid}>
            <View style={styles.earningsColumn}>
              <Text style={styles.earningsLabel}>Total Earned</Text>
              <Title style={styles.earningsAmount}>
                {formatCurrency(calculateTotalEarnings())}
              </Title>
              <ProgressBar 
                progress={0.75} 
                color={COLORS.success} 
                style={styles.progressBar}
              />
            </View>

            <View style={styles.earningsColumn}>
              <Text style={styles.earningsLabel}>Pending</Text>
              <Title style={[styles.earningsAmount, styles.pendingAmount]}>
                {formatCurrency(payoutSchedule?.pendingAmount || 0)}
              </Title>
              <ProgressBar 
                progress={0.25} 
                color={COLORS.warning} 
                style={styles.progressBar}
              />
            </View>

            <View style={styles.earningsColumn}>
              <Text style={styles.earningsLabel}>Bonuses</Text>
              <Title style={[styles.earningsAmount, styles.bonusAmount]}>
                {formatCurrency(calculateBonusEarnings())}
              </Title>
              <View style={styles.bonusBadge}>
                <Badge size={8} style={styles.bonusDot} />
                <Text style={styles.bonusText}>Quality + Tier</Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    </Animated.View>
  );

  /**
   * 📅 Render Payout Schedule
   */
  const renderPayoutSchedule = () => (
    <Animated.View entering={FadeInUp.duration(600).delay(100)}>
      <Card style={styles.scheduleCard}>
        <Card.Content>
          <View style={styles.scheduleHeader}>
            <Title style={styles.scheduleTitle}>333/333/333 Payout Schedule</Title>
            <IconButton
              icon="information-outline"
              size={20}
              onPress={() => showInfo('Each enrollment follows the 333 ETB payout schedule: Enrollment, Mid-Course, Completion')}
            />
          </View>

          <View style={styles.milestoneContainer}>
            {PAYOUT_CONFIG.MILESTONES.map((milestone, index) => (
              <PayoutMilestoneCard
                key={milestone.id}
                milestone={milestone}
                index={index}
                totalMilestones={PAYOUT_CONFIG.MILESTONES.length}
                payoutData={payoutSchedule?.milestones?.[milestone.id]}
                onPress={() => handlePayoutSelect(milestone)}
              />
            ))}
          </View>
        </Card.Content>
      </Card>
    </Animated.View>
  );

  /**
   * 📊 Render Revenue Analytics
   */
  const renderRevenueAnalytics = () => {
    if (!revenueAnalytics || analyticsLoading) {
      return <LoadingSkeleton type="chart" />;
    }

    const chartData = {
      labels: revenueAnalytics.monthlyLabels || [],
      datasets: [{
        data: revenueAnalytics.monthlyEarnings || [],
        color: (opacity = 1) => COLORS.primary,
        strokeWidth: 2
      }]
    };

    return (
      <Animated.View entering={FadeInUp.duration(600).delay(200)}>
        <Card style={styles.analyticsCard}>
          <Card.Content>
            <Title style={styles.analyticsTitle}>Revenue Analytics</Title>
            
            <LineChart
              data={chartData}
              width={SCREEN_WIDTH - METRICS.screenPadding * 2 - 32}
              height={220}
              chartConfig={{
                backgroundColor: COLORS.surface,
                backgroundGradientFrom: COLORS.surface,
                backgroundGradientTo: COLORS.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => COLORS.primary,
                labelColor: (opacity = 1) => COLORS.textSecondary,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: COLORS.primary
                }
              }}
              bezier
              style={styles.chart}
            />

            <View style={styles.analyticsGrid}>
              <Surface style={styles.metricCard}>
                <Text style={styles.metricLabel}>Avg. per Student</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(revenueAnalytics.avgPerStudent || 0)}
                </Text>
              </Surface>

              <Surface style={styles.metricCard}>
                <Text style={styles.metricLabel}>Completion Rate</Text>
                <Text style={styles.metricValue}>
                  {((revenueAnalytics.completionRate || 0) * 100).toFixed(1)}%
                </Text>
              </Surface>

              <Surface style={styles.metricCard}>
                <Text style={styles.metricLabel}>Forecast</Text>
                <Text style={styles.metricValue}>
                  {formatCurrency(revenueAnalytics.forecast || 0)}
                </Text>
              </Surface>
            </View>
          </Card.Content>
        </Card>
      </Animated.View>
    );
  };

  /**
   * ⭐ Render Quality Bonuses
   */
  const renderQualityBonuses = () => {
    if (!qualityMetrics || qualityLoading) {
      return <LoadingSkeleton type="card" />;
    }

    return (
      <Animated.View entering={FadeInUp.duration(600).delay(300)}>
        <QualityBonusCard
          qualityMetrics={qualityMetrics}
          tier={revenueAnalytics?.tier || 'standard'}
          onPress={() => navigation.navigate('QualityDashboard')}
        />
      </Animated.View>
    );
  };

  /**
   * 💰 Render Payout History
   */
  const renderPayoutHistory = () => {
    const history = getPayoutHistory(selectedTimeframe);

    if (!history || history.length === 0) {
      return (
        <EmptyState
          icon="cash-multiple"
          title="No Payout History"
          message="Your payout history will appear here once you complete enrollments"
        />
      );
    }

    return (
      <Animated.View entering={FadeInUp.duration(600).delay(400)}>
        <Card style={styles.historyCard}>
          <Card.Content>
            <View style={styles.historyHeader}>
              <Title style={styles.historyTitle}>Payout History</Title>
              <Button
                mode="text"
                onPress={() => navigation.navigate('PayoutHistory')}
              >
                View All
              </Button>
            </View>

            <List.Section>
              {history.slice(0, 5).map((payout, index) => (
                <React.Fragment key={payout.id}>
                  <List.Item
                    title={`${payout.studentName} - ${payout.skill}`}
                    description={`${formatDate(payout.date)} • ${payout.milestone}`}
                    left={props => (
                      <Avatar.Icon 
                        {...props} 
                        icon={
                          payout.status === 'completed' ? 'check-circle' :
                          payout.status === 'pending' ? 'clock' : 'alert-circle'
                        }
                        style={[
                          styles.avatar,
                          payout.status === 'completed' && styles.avatarCompleted,
                          payout.status === 'pending' && styles.avatarPending
                        ]}
                      />
                    )}
                    right={props => (
                      <Text style={styles.payoutAmount}>
                        {formatCurrency(payout.amount)}
                      </Text>
                    )}
                    onPress={() => handlePayoutSelect(payout)}
                  />
                  {index < history.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List.Section>
          </Card.Content>
        </Card>
      </Animated.View>
    );
  };

  /**
   * 🏆 Render Quick Actions
   */
  const renderQuickActions = () => (
    <Animated.View entering={FadeInUp.duration(600).delay(500)}>
      <Card style={styles.actionsCard}>
        <Card.Content>
          <Title style={styles.actionsTitle}>Quick Actions</Title>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowWithdrawalModal(true)}
              disabled={!payoutSchedule?.availableBalance}
            >
              <Surface style={[
                styles.actionSurface,
                !payoutSchedule?.availableBalance && styles.actionDisabled
              ]}>
                <MaterialCommunityIcons
                  name="bank-transfer-out"
                  size={32}
                  color={COLORS.primary}
                />
                <Text style={styles.actionLabel}>Withdraw</Text>
                <Text style={styles.actionSubtext}>
                  Available: {formatCurrency(payoutSchedule?.availableBalance || 0)}
                </Text>
              </Surface>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('TaxDocuments')}
            >
              <Surface style={styles.actionSurface}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={32}
                  color={COLORS.secondary}
                />
                <Text style={styles.actionLabel}>Tax Docs</Text>
                <Text style={styles.actionSubtext}>Download statements</Text>
              </Surface>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('PerformanceReview')}
            >
              <Surface style={styles.actionSurface}>
                <MaterialCommunityIcons
                  name="trending-up"
                  size={32}
                  color={COLORS.success}
                />
                <Text style={styles.actionLabel}>Performance</Text>
                <Text style={styles.actionSubtext}>View analytics</Text>
              </Surface>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('PaymentMethods')}
            >
              <Surface style={styles.actionSurface}>
                <MaterialCommunityIcons
                  name="credit-card-settings-outline"
                  size={32}
                  color={COLORS.warning}
                />
                <Text style={styles.actionLabel}>Payment Methods</Text>
                <Text style={styles.actionSubtext}>Manage accounts</Text>
              </Surface>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    </Animated.View>
  );

  /**
   * 📱 Render Main Content
   */
  const renderContent = () => {
    if (scheduleLoading || qualityLoading || analyticsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <LoadingSkeleton type="dashboard" />
        </View>
      );
    }

    if (scheduleError) {
      return (
        <EmptyState
          icon="alert-circle-outline"
          title="Unable to Load Data"
          message={scheduleError.message || "Please check your connection and try again"}
          actionLabel="Retry"
          onAction={handleRefresh}
        />
      );
    }

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderEarningsSummary()}
        {renderPayoutSchedule()}
        {renderRevenueAnalytics()}
        {renderQualityBonuses()}
        {renderPayoutHistory()}
        {renderQuickActions()}
        
        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  /**
   * 💰 Render Withdrawal Modal
   */
  const renderWithdrawalModal = () => (
    <Portal>
      <Modal
        visible={showWithdrawalModal}
        onDismiss={() => setShowWithdrawalModal(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Card style={styles.modalCard}>
          <Card.Content>
            <Title style={styles.modalTitle}>Request Withdrawal</Title>
            <Paragraph style={styles.modalDescription}>
              Available balance: {formatCurrency(payoutSchedule?.availableBalance || 0)}
            </Paragraph>
            
            <View style={styles.amountInput}>
              <Text style={styles.amountLabel}>Amount (ETB)</Text>
              <TextInput
                style={styles.amountField}
                value={withdrawalAmount.toString()}
                onChangeText={(text) => {
                  const amount = parseFloat(text) || 0;
                  const maxAmount = payoutSchedule?.availableBalance || 0;
                  setWithdrawalAmount(Math.min(amount, maxAmount));
                }}
                keyboardType="numeric"
                placeholder="Enter amount"
              />
            </View>

            <View style={styles.quickAmounts}>
              {[500, 1000, 2000, 5000].map((amount) => (
                <Chip
                  key={amount}
                  mode="outlined"
                  onPress={() => setWithdrawalAmount(amount)}
                  style={styles.quickAmountChip}
                >
                  {amount} ETB
                </Chip>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowWithdrawalModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleWithdrawalRequest}
                disabled={withdrawalAmount <= 0 || withdrawalAmount > (payoutSchedule?.availableBalance || 0)}
                style={styles.modalButton}
                loading={refreshing}
              >
                Request Withdrawal
              </Button>
            </View>
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );

  /**
   * 📄 Render Payout Details Modal
   */
  const renderPayoutDetailsModal = () => (
    <Portal>
      <Modal
        visible={showDetails}
        onDismiss={() => setShowDetails(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Card style={styles.modalCard}>
          <Card.Content>
            {selectedPayout && (
              <>
                <View style={styles.detailHeader}>
                  <Title style={styles.detailTitle}>
                    {selectedPayout.studentName || selectedPayout.name}
                  </Title>
                  <Badge 
                    style={[
                      styles.detailBadge,
                      selectedPayout.status === 'completed' && styles.badgeCompleted,
                      selectedPayout.status === 'pending' && styles.badgePending
                    ]}
                  >
                    {selectedPayout.status}
                  </Badge>
                </View>
                
                <Divider style={styles.divider} />
                
                <List.Section>
                  <List.Item
                    title="Amount"
                    description={formatCurrency(selectedPayout.amount)}
                    left={props => <List.Icon {...props} icon="cash" />}
                  />
                  
                  {selectedPayout.date && (
                    <List.Item
                      title="Date"
                      description={formatDate(selectedPayout.date)}
                      left={props => <List.Icon {...props} icon="calendar" />}
                    />
                  )}
                  
                  {selectedPayout.milestone && (
                    <List.Item
                      title="Milestone"
                      description={selectedPayout.milestone}
                      left={props => <List.Icon {...props} icon="flag" />}
                    />
                  )}
                  
                  {selectedPayout.skill && (
                    <List.Item
                      title="Skill"
                      description={selectedPayout.skill}
                      left={props => <List.Icon {...props} icon="book" />}
                    />
                  )}
                  
                  {selectedPayout.transactionId && (
                    <List.Item
                      title="Transaction ID"
                      description={selectedPayout.transactionId}
                      left={props => <List.Icon {...props} icon="receipt" />}
                    />
                  )}
                </List.Section>
                
                <Button
                  mode="contained"
                  onPress={() => setShowDetails(false)}
                  style={styles.closeButton}
                >
                  Close Details
                </Button>
              </>
            )}
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <EnterpriseHeader
          title="Payout Schedule"
          subtitle="Track your 333/333/333 earnings"
          showBack={false}
          actions={[
            {
              icon: 'bell-outline',
              onPress: () => navigation.navigate('Notifications'),
              badge: true
            },
            {
              icon: 'help-circle-outline',
              onPress: () => navigation.navigate('HelpCenter'),
            }
          ]}
        />
        
        {renderContent()}
        {renderWithdrawalModal()}
        {renderPayoutDetailsModal()}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

/**
 * 🎨 Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: METRICS.screenPadding,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: METRICS.screenPadding,
  },
  
  // Summary Card
  summaryCard: {
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  summaryTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  divider: {
    marginVertical: SPACING.md,
    backgroundColor: COLORS.border,
  },
  earningsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  earningsColumn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  earningsLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  earningsAmount: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  pendingAmount: {
    color: COLORS.warning,
  },
  bonusAmount: {
    color: COLORS.success,
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
  },
  bonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  bonusDot: {
    backgroundColor: COLORS.success,
    marginRight: SPACING.xs,
  },
  bonusText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.success,
  },
  
  // Schedule Card
  scheduleCard: {
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  scheduleTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  milestoneContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Analytics Card
  analyticsCard: {
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  analyticsTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  chart: {
    marginVertical: SPACING.sm,
    borderRadius: METRICS.borderRadius,
    overflow: 'hidden',
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  metricCard: {
    flex: 1,
    marginHorizontal: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: METRICS.borderRadius,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  metricLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  metricValue: {
    ...TYPOGRAPHY.h4,
    color: COLORS.textPrimary,
  },
  
  // History Card
  historyCard: {
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  historyTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
  },
  avatar: {
    backgroundColor: COLORS.surface,
  },
  avatarCompleted: {
    backgroundColor: COLORS.successLight,
  },
  avatarPending: {
    backgroundColor: COLORS.warningLight,
  },
  payoutAmount: {
    ...TYPOGRAPHY.body1,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  
  // Actions Card
  actionsCard: {
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  actionsTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    marginBottom: SPACING.sm,
  },
  actionSurface: {
    padding: SPACING.md,
    borderRadius: METRICS.borderRadius,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    ...TYPOGRAPHY.body1,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  actionSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  
  // Modal Styles
  modalContainer: {
    paddingHorizontal: METRICS.screenPadding,
  },
  modalCard: {
    borderRadius: METRICS.borderRadiusLarge,
    ...SHADOWS.large,
  },
  modalTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  modalDescription: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  amountInput: {
    marginBottom: SPACING.md,
  },
  amountLabel: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  amountField: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: METRICS.borderRadius,
    padding: SPACING.sm,
    ...TYPOGRAPHY.body1,
    color: COLORS.textPrimary,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.md,
  },
  quickAmountChip: {
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  
  // Detail Modal Styles
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  detailTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    flex: 1,
  },
  detailBadge: {
    paddingHorizontal: SPACING.sm,
  },
  badgeCompleted: {
    backgroundColor: COLORS.successLight,
  },
  badgePending: {
    backgroundColor: COLORS.warningLight,
  },
  closeButton: {
    marginTop: SPACING.md,
  },
  
  // Utility Styles
  bottomSpacer: {
    height: SPACING.xl,
  },
});

export default PayoutSchedule;