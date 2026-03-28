/**
 * 🏢 MOSA FORGE - Enterprise Billing Management System
 * 💰 Subscription & Payment Management Interface
 * 📊 Real-time Billing Analytics & Revenue Tracking
 * 🔄 Auto-Renewal & Payment Method Management
 * 🚀 Enterprise-Grade React Native Implementation
 * 
 * @module BillingManagement
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay
} from 'react-native-reanimated';

// 🏗️ Enterprise Components
import EnterpriseHeader from '../../components/shared/EnterpriseHeader';
import PaymentCard from '../../components/payment/PaymentCard';
import BillingAnalyticsCard from '../../components/analytics/BillingAnalyticsCard';
import SubscriptionPlanCard from '../../components/subscription/SubscriptionPlanCard';
import InvoiceList from '../../components/billing/InvoiceList';
import PaymentMethodSelector from '../../components/payment/PaymentMethodSelector';
import SecurityBadge from '../../components/shared/SecurityBadge';

// 🔧 Enterprise Services
import BillingService from '../../services/billing-service';
import PaymentService from '../../services/payment-service';
import AnalyticsService from '../../services/analytics-service';
import NotificationService from '../../services/notification-service';

// 🎯 Enterprise Constants
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  SHADOWS,
  ANIMATIONS,
  ENTERPRISE_CONFIG
} from '../../constants/enterprise-theme';

const BillingManagement = () => {
  // 🏗️ Navigation
  const navigation = useNavigation();

  // 🎯 State Management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [billingData, setBillingData] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // 🎯 Animation Values
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.95);
  const slideAnim = useSharedValue(50);

  // 🏗️ Initialize Services
  const billingService = new BillingService();
  const paymentService = new PaymentService();
  const analyticsService = new AnalyticsService();
  const notificationService = new NotificationService();

  /**
   * 📊 LOAD BILLING DATA - Enterprise Grade
   */
  const loadBillingData = useCallback(async () => {
    try {
      setLoading(true);
      
      // 🔄 Parallel Data Fetching
      const [
        billingResponse,
        subscriptionsResponse,
        invoicesResponse,
        paymentMethodsResponse,
        analyticsResponse
      ] = await Promise.allSettled([
        billingService.getBillingSummary(),
        billingService.getActiveSubscriptions(),
        billingService.getRecentInvoices({ limit: 10 }),
        paymentService.getPaymentMethods(),
        analyticsService.getBillingAnalytics({ period: '30d' })
      ]);

      // 🎯 Handle Responses
      const billingData = billingResponse.status === 'fulfilled' ? billingResponse.value : null;
      const subscriptionsData = subscriptionsResponse.status === 'fulfilled' ? subscriptionsResponse.value : [];
      const invoicesData = invoicesResponse.status === 'fulfilled' ? invoicesResponse.value : [];
      const paymentMethodsData = paymentMethodsResponse.status === 'fulfilled' ? paymentMethodsResponse.value : [];
      const analyticsData = analyticsResponse.status === 'fulfilled' ? analyticsResponse.value : null;

      // 💾 Update State
      setBillingData(billingData);
      setSubscriptions(subscriptionsData);
      setInvoices(invoicesData);
      setPaymentMethods(paymentMethodsData);
      setAnalytics(analyticsData);

      // 📊 Record Analytics Event
      await analyticsService.trackEvent('billing_page_view', {
        timestamp: new Date().toISOString(),
        hasActiveSubscriptions: subscriptionsData.length > 0,
        totalPaymentMethods: paymentMethodsData.length
      });

      // 🎯 Trigger Animations
      fadeAnim.value = withTiming(1, { duration: 500 });
      scaleAnim.value = withSpring(1, { damping: 15 });
      slideAnim.value = withSpring(0, { damping: 20 });

    } catch (error) {
      console.error('Failed to load billing data:', error);
      
      // 🚨 Show Error Notification
      notificationService.showErrorNotification({
        title: 'Data Load Failed',
        message: 'Unable to load billing information. Please try again.',
        action: {
          label: 'Retry',
          onPress: loadBillingData
        }
      });

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * 🔄 PULL TO REFRESH
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadBillingData();
  }, [loadBillingData]);

  /**
   * 💰 MAKE PAYMENT - Enterprise Grade
   */
  const handleMakePayment = useCallback(async (invoiceId, amount) => {
    try {
      setProcessingPayment(true);
      
      // 🎯 Show Processing Animation
      const processingAnimation = withSequence(
        withTiming(1.05, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );

      // 💸 Process Payment
      const paymentResult = await paymentService.processPayment({
        invoiceId,
        amount,
        currency: 'ETB',
        paymentMethod: paymentMethods[0]?.id // Default to first payment method
      });

      if (paymentResult.success) {
        // ✅ Payment Success
        notificationService.showSuccessNotification({
          title: 'Payment Successful',
          message: `Payment of ${amount} ETB processed successfully.`,
          duration: 3000
        });

        // 🔄 Refresh Data
        loadBillingData();

        // 📊 Record Analytics
        await analyticsService.trackEvent('payment_success', {
          amount,
          invoiceId,
          paymentMethod: paymentMethods[0]?.type,
          timestamp: new Date().toISOString()
        });

      } else {
        // ❌ Payment Failed
        notificationService.showErrorNotification({
          title: 'Payment Failed',
          message: paymentResult.error || 'Unable to process payment. Please try again.',
          action: {
            label: 'Retry',
            onPress: () => handleMakePayment(invoiceId, amount)
          }
        });
      }

    } catch (error) {
      console.error('Payment processing failed:', error);
      
      notificationService.showErrorNotification({
        title: 'Payment Error',
        message: 'An unexpected error occurred. Please try again later.',
        action: {
          label: 'Contact Support',
          onPress: () => navigation.navigate('Support')
        }
      });

    } finally {
      setProcessingPayment(false);
    }
  }, [paymentMethods, loadBillingData]);

  /**
   * 🔄 UPDATE PAYMENT METHOD
   */
  const handleUpdatePaymentMethod = useCallback(async (methodId, updates) => {
    try {
      const result = await paymentService.updatePaymentMethod(methodId, updates);
      
      if (result.success) {
        notificationService.showSuccessNotification({
          title: 'Payment Method Updated',
          message: 'Your payment method has been updated successfully.',
          duration: 2000
        });

        loadBillingData();
      }

    } catch (error) {
      notificationService.showErrorNotification({
        title: 'Update Failed',
        message: 'Unable to update payment method. Please try again.'
      });
    }
  }, [loadBillingData]);

  /**
   * 📄 VIEW INVOICE DETAILS
   */
  const handleViewInvoice = useCallback((invoice) => {
    navigation.navigate('InvoiceDetails', { 
      invoiceId: invoice.id,
      invoiceData: invoice 
    });
  }, [navigation]);

  /**
   * 🎯 MANAGE SUBSCRIPTION
   */
  const handleManageSubscription = useCallback((subscription) => {
    Alert.alert(
      'Manage Subscription',
      'What would you like to do?',
      [
        {
          text: 'Upgrade Plan',
          onPress: () => navigation.navigate('UpgradePlan', { subscriptionId: subscription.id }),
          style: 'default'
        },
        {
          text: 'Cancel Subscription',
          onPress: () => handleCancelSubscription(subscription.id),
          style: 'destructive'
        },
        {
          text: 'View Details',
          onPress: () => navigation.navigate('SubscriptionDetails', { subscriptionId: subscription.id }),
          style: 'default'
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  }, [navigation]);

  /**
   * ❌ CANCEL SUBSCRIPTION
   */
  const handleCancelSubscription = useCallback(async (subscriptionId) => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel this subscription?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await billingService.cancelSubscription(subscriptionId);
              
              if (result.success) {
                notificationService.showSuccessNotification({
                  title: 'Subscription Cancelled',
                  message: 'Your subscription has been cancelled successfully.',
                  duration: 3000
                });

                loadBillingData();
              }
            } catch (error) {
              notificationService.showErrorNotification({
                title: 'Cancellation Failed',
                message: 'Unable to cancel subscription. Please try again.'
              });
            }
          }
        }
      ]
    );
  }, [loadBillingData]);

  /**
   * 📊 RENDER BILLING OVERVIEW
   */
  const renderBillingOverview = () => (
    <Animated.View 
      style={[
        styles.overviewContainer,
        useAnimatedStyle(() => ({
          opacity: fadeAnim.value,
          transform: [
            { scale: scaleAnim.value },
            { translateY: slideAnim.value }
          ]
        }))
      ]}
    >
      {/* 💰 Current Balance */}
      <View style={styles.balanceCard}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.balanceGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.balanceHeader}>
            <Icon name="account-balance-wallet" size={24} color={COLORS.white} />
            <Text style={styles.balanceTitle}>Current Balance</Text>
          </View>
          
          <Text style={styles.balanceAmount}>
            {billingData?.currentBalance?.toLocaleString('en-ET') || '0'} ETB
          </Text>
          
          <View style={styles.balanceActions}>
            <TouchableOpacity 
              style={styles.balanceButton}
              onPress={() => navigation.navigate('AddFunds')}
            >
              <Icon name="add" size={20} color={COLORS.white} />
              <Text style={styles.balanceButtonText}>Add Funds</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.balanceButton, styles.balanceButtonOutline]}
              onPress={() => navigation.navigate('WithdrawFunds')}
            >
              <Icon name="arrow-forward" size={20} color={COLORS.primary} />
              <Text style={[styles.balanceButtonText, { color: COLORS.primary }]}>
                Withdraw
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* 📊 Billing Analytics */}
      {analytics && (
        <BillingAnalyticsCard
          analytics={analytics}
          onViewDetails={() => navigation.navigate('BillingAnalytics')}
        />
      )}

      {/* 💳 Payment Methods */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <TouchableOpacity onPress={() => setShowAddPaymentMethod(true)}>
            <Icon name="add-circle" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <PaymentMethodSelector
          paymentMethods={paymentMethods}
          selectedMethod={paymentMethods[0]}
          onSelectMethod={(method) => handleUpdatePaymentMethod(method.id, { default: true })}
          onAddMethod={() => setShowAddPaymentMethod(true)}
          onEditMethod={(method) => navigation.navigate('EditPaymentMethod', { methodId: method.id })}
        />

        <SecurityBadge 
          level="enterprise"
          message="Bank-level encryption for all transactions"
          style={styles.securityBadge}
        />
      </View>
    </Animated.View>
  );

  /**
   * 📄 RENDER INVOICES TAB
   */
  const renderInvoicesTab = () => (
    <View style={styles.tabContainer}>
      <InvoiceList
        invoices={invoices}
        onViewInvoice={handleViewInvoice}
        onPayInvoice={handleMakePayment}
        loading={loading}
        emptyMessage="No invoices found"
      />
    </View>
  );

  /**
   * 🔄 RENDER SUBSCRIPTIONS TAB
   */
  const renderSubscriptionsTab = () => (
    <View style={styles.tabContainer}>
      <FlatList
        data={subscriptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionPlanCard
            subscription={item}
            onManage={handleManageSubscription}
            onUpgrade={() => navigation.navigate('UpgradePlan', { subscriptionId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="subscriptions" size={64} color={COLORS.gray} />
            <Text style={styles.emptyText}>No active subscriptions</Text>
            <TouchableOpacity 
              style={styles.emptyButton}
              onPress={() => navigation.navigate('BrowsePlans')}
            >
              <Text style={styles.emptyButtonText}>Browse Plans</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.subscriptionsList}
      />
    </View>
  );

  /**
   * 🎯 RENDER LOADING STATE
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Loading billing information...</Text>
    </View>
  );

  /**
   * 🎯 RENDER ERROR STATE
   */
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Icon name="error-outline" size={64} color={COLORS.error} />
      <Text style={styles.errorTitle}>Unable to Load Data</Text>
      <Text style={styles.errorMessage}>
        There was an issue loading your billing information.
      </Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={loadBillingData}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * 🎯 RENDER CONTENT
   */
  const renderContent = () => {
    if (loading && !refreshing) {
      return renderLoadingState();
    }

    if (!billingData && !loading) {
      return renderErrorState();
    }

    return (
      <ScrollView
        style={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 🎯 Tab Navigation */}
        <View style={styles.tabNavigation}>
          {['overview', 'invoices', 'subscriptions'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                selectedTab === tab && styles.tabButtonActive
              ]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={[
                styles.tabButtonText,
                selectedTab === tab && styles.tabButtonTextActive
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {selectedTab === tab && (
                <View style={styles.tabIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* 🎯 Tab Content */}
        {selectedTab === 'overview' && renderBillingOverview()}
        {selectedTab === 'invoices' && renderInvoicesTab()}
        {selectedTab === 'subscriptions' && renderSubscriptionsTab()}

        {/* 🛡️ Security Footer */}
        <View style={styles.securityFooter}>
          <Icon name="security" size={16} color={COLORS.success} />
          <Text style={styles.securityText}>
            Protected by enterprise-grade security • PCI DSS compliant
          </Text>
        </View>
      </ScrollView>
    );
  };

  /**
   * 🎯 USE FOCUS EFFECT
   */
  useFocusEffect(
    useCallback(() => {
      loadBillingData();
      
      // 🎯 Reset animations on focus
      fadeAnim.value = 0;
      scaleAnim.value = 0.95;
      slideAnim.value = 50;

      return () => {
        // Cleanup if needed
      };
    }, [loadBillingData])
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 🏗️ Enterprise Header */}
      <EnterpriseHeader
        title="Billing Management"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
        actions={[
          {
            icon: 'receipt',
            onPress: () => navigation.navigate('TransactionHistory'),
            badge: invoices.filter(i => i.status === 'unpaid').length
          },
          {
            icon: 'help',
            onPress: () => navigation.navigate('BillingSupport')
          }
        ]}
      />

      {/* 🎯 Main Content */}
      {renderContent()}

      {/* 💳 Add Payment Method Modal */}
      {showAddPaymentMethod && (
        <BlurView intensity={90} style={StyleSheet.absoluteFill}>
          <View style={styles.modalContainer}>
            <PaymentCard
              mode="add"
              onComplete={() => {
                setShowAddPaymentMethod(false);
                loadBillingData();
              }}
              onCancel={() => setShowAddPaymentMethod(false)}
            />
          </View>
        </BlurView>
      )}

      {/* ⚡ Processing Overlay */}
      {processingPayment && (
        <View style={styles.processingOverlay}>
          <BlurView intensity={80} style={StyleSheet.absoluteFill} />
          <View style={styles.processingContent}>
            <ActivityIndicator size="large" color={COLORS.white} />
            <Text style={styles.processingText}>Processing Payment...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

/**
 * 🎨 ENTERPRISE STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.error,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  errorMessage: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    ...SHADOWS.md,
  },
  retryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
    fontWeight: '600',
  },
  overviewContainer: {
    paddingBottom: SPACING.xl,
  },
  balanceCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: SPACING.lg,
    ...SHADOWS.lg,
  },
  balanceGradient: {
    padding: SPACING.xl,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  balanceTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.white,
    marginLeft: SPACING.sm,
    fontWeight: '600',
  },
  balanceAmount: {
    ...TYPOGRAPHY.display,
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 40,
    marginBottom: SPACING.xl,
  },
  balanceActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  balanceButtonOutline: {
    backgroundColor: COLORS.white,
  },
  balanceButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
    marginLeft: SPACING.sm,
    fontWeight: '600',
  },
  sectionContainer: {
    marginTop: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  securityBadge: {
    marginTop: SPACING.md,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.xs,
    marginVertical: SPACING.lg,
    ...SHADOWS.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },
  tabButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '60%',
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tabContainer: {
    minHeight: 400,
  },
  subscriptionsList: {
    paddingBottom: SPACING.xl,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  emptyButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
    fontWeight: '600',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  securityText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  processingContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: SPACING.xl,
    borderRadius: 20,
    alignItems: 'center',
  },
  processingText: {
    ...TYPOGRAPHY.body,
    color: COLORS.white,
    marginTop: SPACING.md,
  },
});

export default BillingManagement;