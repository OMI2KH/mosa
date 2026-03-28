/**
 * 🎯 MOSA FORGE: Enterprise Payment Method Component
 * 
 * @component PaymentMethod
 * @description Handles payment method selection, validation, and processing for 1,999 ETB bundles
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Telebirr & CBE Birr integration
 * - 1,999 ETB bundle pricing
 * - Revenue split visualization (1000/999)
 * - Installment plan options
 * - Enterprise-grade error handling
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Dimensions,
  Animated,
  Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePayment } from '../../contexts/payment-context';
import { useAuth } from '../../contexts/auth-context';

// 🏗️ Enterprise Constants
const PAYMENT_METHODS = {
  TELEBIRR: {
    id: 'telebirr',
    name: 'Telebirr',
    icon: '📱',
    description: 'Instant payment via Telebirr',
    processingTime: 'Instant',
    fee: 0,
    limits: { min: 1, max: 50000 },
    supportedBanks: ['CBE', 'Awash', 'Dashen', 'Abyssinia']
  },
  CBE_BIRR: {
    id: 'cbe_birr',
    name: 'CBE Birr',
    icon: '🏦',
    description: 'Secure payment via Commercial Bank of Ethiopia',
    processingTime: '2-5 minutes',
    fee: 0,
    limits: { min: 1, max: 100000 },
    supportedBanks: ['CBE', 'All CBE Partner Banks']
  },
  INSTALLMENT: {
    id: 'installment',
    name: 'Installment Plan',
    icon: '💳',
    description: 'Pay in flexible installments',
    processingTime: 'Instant activation',
    fee: 50,
    limits: { min: 500, max: 1999 },
    supportedBanks: ['All Major Banks']
  }
};

const BUNDLE_PRICE = 1999;
const REVENUE_SPLIT = {
  mosa: 1000,
  expert: 999
};

const PAYMENT_PLANS = [
  {
    id: 'full',
    name: 'Full Payment',
    amount: 1999,
    savings: 0,
    description: 'Pay once and save time',
    installments: 1,
    recommended: true
  },
  {
    id: 'two_payments',
    name: '2 Payments',
    amount: 1049,
    total: 2098,
    savings: -99,
    description: '2 payments of 1,049 ETB',
    installments: 2,
    interval: 'monthly'
  },
  {
    id: 'three_payments',
    name: '3 Payments',
    amount: 733,
    total: 2199,
    savings: -200,
    description: '3 payments of 733 ETB',
    installments: 3,
    interval: 'monthly'
  }
];

/**
 * 🏗️ Enterprise Payment Method Component
 * @param {Object} props - Component properties
 * @param {Function} props.onPaymentMethodSelected - Callback when payment method is selected
 * @param {Object} props.enrollmentData - Student enrollment data
 * @param {Function} props.onError - Error handling callback
 */
const PaymentMethod = ({ 
  onPaymentMethodSelected, 
  enrollmentData, 
  onError,
  onRevenueSplitDisplay 
}) => {
  // 🏗️ Hooks & State Management
  const { processPayment, validatePaymentMethod, paymentState } = usePayment();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('full');
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showRevenueSplit, setShowRevenueSplit] = useState(false);
  
  // 🏗️ Animation Values
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(50), []);
  const pulseAnim = useMemo(() => new Animated.Value(1), []);

  // 🏗️ Memoized Computed Values
  const currentPlan = useMemo(() => 
    PAYMENT_PLANS.find(plan => plan.id === selectedPlan) || PAYMENT_PLANS[0],
    [selectedPlan]
  );

  const totalAmount = useMemo(() => 
    selectedPlan === 'full' ? BUNDLE_PRICE : currentPlan.total,
    [selectedPlan, currentPlan]
  );

  const isMethodSupported = useCallback((method) => {
    if (!user?.phoneNumber && method.id === 'telebirr') {
      return { supported: false, reason: 'Phone number required for Telebirr' };
    }
    
    if (totalAmount > method.limits.max) {
      return { supported: false, reason: `Amount exceeds ${method.name} limit` };
    }
    
    if (totalAmount < method.limits.min) {
      return { supported: false, reason: `Amount below ${method.name} minimum` };
    }
    
    return { supported: true };
  }, [user, totalAmount]);

  // 🏗️ Lifecycle Effects
  React.useEffect(() => {
    // Animate component entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideAnim]);

  React.useEffect(() => {
    // Pulse animation for recommended plan
    if (currentPlan.recommended) {
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
          }),
        ])
      ).start();
    }
  }, [currentPlan.recommended, pulseAnim]);

  // 🏗️ Enterprise Event Handlers
  const handleMethodSelection = useCallback(async (method) => {
    try {
      setValidationErrors({});
      
      // Validate method support
      const supportCheck = isMethodSupported(method);
      if (!supportCheck.supported) {
        setValidationErrors(prev => ({
          ...prev,
          [method.id]: supportCheck.reason
        }));
        return;
      }

      // Validate payment method
      const validation = await validatePaymentMethod(method.id, totalAmount);
      if (!validation.valid) {
        setValidationErrors(prev => ({
          ...prev,
          [method.id]: validation.error
        }));
        return;
      }

      setSelectedMethod(method);
      
      // Trigger revenue split visualization
      if (onRevenueSplitDisplay) {
        onRevenueSplitDisplay({
          mosa: REVENUE_SPLIT.mosa,
          expert: REVENUE_SPLIT.expert,
          total: BUNDLE_PRICE
        });
      }

    } catch (error) {
      console.error('Payment method selection error:', error);
      handleError('METHOD_SELECTION_FAILED', error);
    }
  }, [validatePaymentMethod, totalAmount, isMethodSupported, onRevenueSplitDisplay]);

  const handlePaymentProcessing = useCallback(async () => {
    if (!selectedMethod) {
      setValidationErrors({ general: 'Please select a payment method' });
      return;
    }

    try {
      setIsProcessing(true);
      
      const paymentData = {
        method: selectedMethod.id,
        amount: totalAmount,
        bundleId: enrollmentData.bundleId,
        studentId: user.id,
        skillId: enrollmentData.skillId,
        plan: selectedPlan,
        revenueSplit: REVENUE_SPLIT,
        metadata: {
          device: Platform.OS,
          timestamp: new Date().toISOString(),
          userAgent: 'MosaForge-Mobile'
        }
      };

      // Process payment
      const result = await processPayment(paymentData);
      
      if (result.success) {
        // Success callback
        onPaymentMethodSelected({
          method: selectedMethod,
          plan: currentPlan,
          paymentId: result.paymentId,
          revenueSplit: REVENUE_SPLIT
        });
      } else {
        throw new Error(result.error || 'Payment processing failed');
      }

    } catch (error) {
      console.error('Payment processing error:', error);
      handleError('PAYMENT_PROCESSING_FAILED', error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    selectedMethod, 
    totalAmount, 
    enrollmentData, 
    user, 
    selectedPlan, 
    processPayment, 
    onPaymentMethodSelected, 
    currentPlan
  ]);

  const handleError = useCallback((errorCode, error) => {
    const errorMessages = {
      METHOD_SELECTION_FAILED: 'Failed to select payment method',
      PAYMENT_PROCESSING_FAILED: 'Payment processing failed',
      VALIDATION_FAILED: 'Payment validation failed',
      NETWORK_ERROR: 'Network connection issue'
    };

    const userMessage = errorMessages[errorCode] || 'An unexpected error occurred';
    
    setValidationErrors({ general: userMessage });
    
    if (onError) {
      onError({
        code: errorCode,
        message: userMessage,
        originalError: error,
        timestamp: new Date().toISOString()
      });
    }

    // Show alert for critical errors
    if (errorCode === 'PAYMENT_PROCESSING_FAILED') {
      Alert.alert('Payment Error', userMessage);
    }
  }, [onError]);

  const handlePlanSelection = useCallback((planId) => {
    setSelectedPlan(planId);
    setValidationErrors({});
  }, []);

  // 🏗️ Render Helper Functions
  const renderPaymentMethod = useCallback((method) => {
    const isSelected = selectedMethod?.id === method.id;
    const supportCheck = isMethodSupported(method);
    const isDisabled = !supportCheck.supported;
    const hasError = validationErrors[method.id];

    return (
      <Animated.View
        style={[
          styles.methodCard,
          isSelected && styles.methodCardSelected,
          isDisabled && styles.methodCardDisabled
        ]}
      >
        <TouchableOpacity
          style={styles.methodTouchable}
          onPress={() => !isDisabled && handleMethodSelection(method)}
          disabled={isDisabled}
          activeOpacity={0.7}
        >
          <View style={styles.methodHeader}>
            <View style={styles.methodIconContainer}>
              <Text style={styles.methodIcon}>{method.icon}</Text>
            </View>
            <View style={styles.methodInfo}>
              <Text style={[
                styles.methodName,
                isDisabled && styles.methodNameDisabled
              ]}>
                {method.name}
              </Text>
              <Text style={styles.methodDescription}>
                {method.description}
              </Text>
            </View>
            <View style={styles.selectionIndicator}>
              {isSelected && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.selectedIcon}>✓</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.methodDetails}>
            <Text style={styles.processingTime}>
              ⏱️ {method.processingTime}
            </Text>
            {method.fee > 0 && (
              <Text style={styles.feeText}>
                Fee: {method.fee} ETB
              </Text>
            )}
          </View>

          {hasError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{hasError}</Text>
            </View>
          )}

          {isDisabled && !hasError && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                {supportCheck.reason}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }, [selectedMethod, isMethodSupported, validationErrors, handleMethodSelection]);

  const renderPaymentPlan = useCallback((plan) => {
    const isSelected = selectedPlan === plan.id;
    const isRecommended = plan.recommended;

    return (
      <Animated.View
        style={[
          styles.planCard,
          isSelected && styles.planCardSelected,
          isRecommended && { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <TouchableOpacity
          style={styles.planTouchable}
          onPress={() => handlePlanSelection(plan.id)}
          activeOpacity={0.8}
        >
          <View style={styles.planHeader}>
            <Text style={[
              styles.planName,
              isSelected && styles.planNameSelected
            ]}>
              {plan.name}
            </Text>
            {isRecommended && (
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>Recommended</Text>
              </View>
            )}
          </View>

          <View style={styles.planDetails}>
            <Text style={styles.planAmount}>
              {plan.installments > 1 ? 
                `${plan.amount} ETB` : 
                `${plan.amount} ETB`
              }
            </Text>
            <Text style={styles.planDescription}>
              {plan.description}
            </Text>
          </View>

          {plan.installments > 1 && (
            <View style={styles.planTotal}>
              <Text style={styles.totalText}>
                Total: {plan.total} ETB
              </Text>
              {plan.savings < 0 && (
                <Text style={styles.savingsNegative}>
                  +{Math.abs(plan.savings)} ETB
                </Text>
              )}
            </View>
          )}

          {plan.savings > 0 && (
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>
                Save {plan.savings} ETB
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }, [selectedPlan, pulseAnim, handlePlanSelection]);

  const renderRevenueSplit = useCallback(() => (
    <View style={styles.revenueSplitContainer}>
      <Text style={styles.revenueSplitTitle}>Revenue Distribution</Text>
      <View style={styles.revenueSplitBar}>
        <View 
          style={[
            styles.revenueSegmentMosa, 
            { flex: REVENUE_SPLIT.mosa }
          ]}
        >
          <Text style={styles.revenueText}>
            Mosa: {REVENUE_SPLIT.mosa} ETB
          </Text>
        </View>
        <View 
          style={[
            styles.revenueSegmentExpert,
            { flex: REVENUE_SPLIT.expert }
          ]}
        >
          <Text style={styles.revenueText}>
            Expert: {REVENUE_SPLIT.expert} ETB
          </Text>
        </View>
      </View>
      <View style={styles.payoutSchedule}>
        <Text style={styles.payoutTitle}>Expert Payout Schedule:</Text>
        <Text style={styles.payoutItem}>• 333 ETB - Course Start</Text>
        <Text style={styles.payoutItem}>• 333 ETB - 75% Completion</Text>
        <Text style={styles.payoutItem}>• 333 ETB - Certification</Text>
      </View>
    </View>
  ), []);

  // 🏗️ Main Render Function
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradientBackground}
      />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 🎯 Header Section */}
          <View style={styles.header}>
            <Text style={styles.title}>Payment Method</Text>
            <Text style={styles.subtitle}>
              Complete your 1,999 ETB bundle purchase
            </Text>
          </View>

          {/* 💰 Bundle Price Display */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Total Amount</Text>
            <Text style={styles.priceValue}>{totalAmount} ETB</Text>
            <Text style={styles.bundleNote}>
              Includes: Theory + Hands-on Training + Certification + Yachi Verification
            </Text>
          </View>

          {/* 📊 Revenue Split Visualization */}
          <TouchableOpacity 
            style={styles.revenueToggle}
            onPress={() => setShowRevenueSplit(!showRevenueSplit)}
          >
            <Text style={styles.revenueToggleText}>
              {showRevenueSplit ? 'Hide' : 'Show'} Revenue Distribution
            </Text>
          </TouchableOpacity>

          {showRevenueSplit && renderRevenueSplit()}

          {/* 💳 Payment Plans */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Plan</Text>
            <View style={styles.plansContainer}>
              {PAYMENT_PLANS.map(renderPaymentPlan)}
            </View>
          </View>

          {/* 📱 Payment Methods */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Payment Method</Text>
            <View style={styles.methodsContainer}>
              {Object.values(PAYMENT_METHODS).map(renderPaymentMethod)}
            </View>
          </View>

          {/* 🛡️ Security Badge */}
          <View style={styles.securityContainer}>
            <Text style={styles.securityText}>🔒 Secure Payment</Text>
            <Text style={styles.securityDescription}>
              Encrypted transaction • Ethiopian data centers • Bank-level security
            </Text>
          </View>

          {/* 📝 Support Information */}
          <View style={styles.supportContainer}>
            <Text style={styles.supportTitle}>Need Help?</Text>
            <Text style={styles.supportText}>
              Contact support: +251 XXX XXX XXX
            </Text>
            <Text style={styles.supportText}>
              Email: payment-support@mosaforge.com
            </Text>
          </View>
        </ScrollView>

        {/* 🎯 Payment Action Button */}
        <BlurView intensity={80} style={styles.actionContainer}>
          <View style={styles.actionContent}>
            <View style={styles.amountSummary}>
              <Text style={styles.amountLabel}>To Pay:</Text>
              <Text style={styles.amountValue}>{totalAmount} ETB</Text>
            </View>
            
            <TouchableOpacity
              style={[
                styles.payButton,
                (!selectedMethod || isProcessing) && styles.payButtonDisabled
              ]}
              onPress={handlePaymentProcessing}
              disabled={!selectedMethod || isProcessing}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.payButtonGradient}
              >
                {isProcessing ? (
                  <Text style={styles.payButtonText}>Processing...</Text>
                ) : (
                  <Text style={styles.payButtonText}>
                    Pay {totalAmount} ETB
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {validationErrors.general && (
            <View style={styles.generalError}>
              <Text style={styles.generalErrorText}>
                {validationErrors.general}
              </Text>
            </View>
          )}
        </BlurView>
      </Animated.View>
    </View>
  );
};

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 200,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120, // Space for action button
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  priceContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  priceLabel: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#28a745',
    marginBottom: 8,
  },
  bundleNote: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 18,
  },
  revenueToggle: {
    backgroundColor: '#e9ecef',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  revenueToggleText: {
    color: '#495057',
    fontWeight: '600',
  },
  revenueSplitContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  revenueSplitTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 15,
  },
  revenueSplitBar: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
  },
  revenueSegmentMosa: {
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  revenueSegmentExpert: {
    backgroundColor: '#764ba2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  revenueText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  payoutSchedule: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 15,
  },
  payoutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  payoutItem: {
    fontSize: 13,
    color: '#6c757d',
    marginBottom: 4,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#495057',
    marginBottom: 16,
  },
  plansContainer: {
    gap: 12,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: '#667eea',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  planTouchable: {
    flex: 1,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  planNameSelected: {
    color: '#667eea',
  },
  recommendedBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  planDetails: {
    marginBottom: 8,
  },
  planAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#28a745',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  planTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '500',
  },
  savingsNegative: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '500',
  },
  savingsBadge: {
    backgroundColor: '#ffc107',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  savingsText: {
    color: '#212529',
    fontSize: 12,
    fontWeight: '600',
  },
  methodsContainer: {
    gap: 12,
  },
  methodCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardSelected: {
    borderColor: '#667eea',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  methodCardDisabled: {
    opacity: 0.6,
  },
  methodTouchable: {
    flex: 1,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  methodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodIcon: {
    fontSize: 20,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 2,
  },
  methodNameDisabled: {
    color: '#6c757d',
  },
  methodDescription: {
    fontSize: 14,
    color: '#6c757d',
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  methodDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  processingTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  feeText: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  errorText: {
    color: '#721c24',
    fontSize: 12,
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  warningText: {
    color: '#856404',
    fontSize: 12,
  },
  securityContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  securityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#28a745',
    marginBottom: 4,
  },
  securityDescription: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  supportContainer: {
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountSummary: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#495057',
  },
  payButton: {
    flex: 1,
    maxWidth: 200,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  generalError: {
    backgroundColor: '#f8d7da',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  generalErrorText: {
    color: '#721c24',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default PaymentMethod;