/**
 * 🎯 MOSA FORGE: Enterprise Bundle Purchaser Component
 * 
 * @component BundlePurchaser
 * @description Handles 1,999 ETB bundle purchase flow with revenue distribution
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - 1,999 ETB bundle processing
 * - 1000/999 revenue split visualization
 * - 333/333/333 payout scheduling
 * - Telebirr & CBE Birr integration
 * - Quality bonus calculations
 * - Payment security & validation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// 🏗️ Custom Hooks & Services
import { usePayment } from '../../hooks/use-payment-distribution';
import { useAuth } from '../../contexts/auth-context';
import { PaymentService } from '../../services/payment-service';
import { AnalyticsService } from '../../services/analytics-service';

// 🏗️ Enterprise Constants
const BUNDLE_PRICE = 1999;
const REVENUE_SPLIT = {
  mosa: 1000,
  expert: 999
};
const PAYOUT_SCHEDULE = [
  { phase: 'START', amount: 333, label: 'Course Start' },
  { phase: 'MIDPOINT', amount: 333, label: '75% Completion' },
  { phase: 'COMPLETION', amount: 333, label: 'Certification' }
];

const PAYMENT_METHODS = [
  {
    id: 'telebirr',
    name: 'Telebirr',
    icon: 'phone-portrait',
    description: 'Instant payment via Telebirr',
    processingTime: 'Instant',
    fee: 0
  },
  {
    id: 'cbebirr',
    name: 'CBE Birr',
    icon: 'card',
    description: 'Secure payment via CBE Birr',
    processingTime: 'Instant',
    fee: 0
  },
  {
    id: 'bank-transfer',
    name: 'Bank Transfer',
    icon: 'business',
    description: 'Direct bank transfer',
    processingTime: '1-2 hours',
    fee: 5
  }
];

const INSTALLMENT_PLANS = [
  {
    id: 'full',
    name: 'Full Payment',
    amount: BUNDLE_PRICE,
    discount: 0,
    savings: 0,
    description: 'Pay once and save time'
  },
  {
    id: 'two-payments',
    name: '2 Payments',
    installments: [
      { due: 'Today', amount: 1099 },
      { due: 'In 30 days', amount: 900 }
    ],
    total: 1999,
    fee: 50,
    description: 'Split into two convenient payments'
  },
  {
    id: 'four-payments',
    name: '4 Payments',
    installments: [
      { due: 'Today', amount: 599 },
      { due: 'In 15 days', amount: 500 },
      { due: 'In 30 days', amount: 500 },
      { due: 'In 45 days', amount: 500 }
    ],
    total: 2099,
    fee: 100,
    description: 'Most flexible payment plan'
  }
];

/**
 * 🏗️ Enterprise Bundle Purchaser Component
 * @param {Object} props - Component properties
 */
const BundlePurchaser = ({ 
  skill, 
  expert, 
  onPaymentSuccess, 
  onPaymentFailed,
  showRevenueSplit = true 
}) => {
  // 🏗️ Hooks & State Management
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { calculateRevenueSplit, calculatePayoutSchedule } = usePayment();

  // 🏗️ State Management
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(INSTALLMENT_PLANS[0]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [animation] = useState(new Animated.Value(0));
  const [securityCheck, setSecurityCheck] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // 🏗️ Derived State
  const totalAmount = selectedPlan.total || selectedPlan.amount;
  const finalAmount = totalAmount + (selectedPlan.fee || 0);
  const revenueSplit = calculateRevenueSplit(BUNDLE_PRICE);
  const payoutSchedule = calculatePayoutSchedule(revenueSplit.expert);

  // 🏗️ Animation Effects
  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // 🏗️ Analytics Tracking
  useEffect(() => {
    AnalyticsService.track('bundle_purchase_viewed', {
      skillId: skill?.id,
      expertId: expert?.id,
      bundlePrice: BUNDLE_PRICE
    });
  }, [skill?.id, expert?.id]);

  /**
   * 🏗️ Handle Payment Method Selection
   */
  const handleMethodSelect = useCallback((method) => {
    setSelectedMethod(method);
    AnalyticsService.track('payment_method_selected', {
      method: method.id,
      skillId: skill?.id
    });
  }, [skill?.id]);

  /**
   * 🏗️ Handle Installment Plan Selection
   */
  const handlePlanSelect = useCallback((plan) => {
    setSelectedPlan(plan);
    AnalyticsService.track('installment_plan_selected', {
      plan: plan.id,
      totalAmount: plan.total || plan.amount
    });
  }, []);

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Process Bundle Purchase
   */
  const handlePurchase = async () => {
    // 🏗️ Validation Chain
    if (!selectedMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method to continue.');
      return;
    }

    if (!securityCheck) {
      Alert.alert('Security Check Required', 'Please confirm this is your device.');
      return;
    }

    if (!termsAccepted) {
      Alert.alert('Terms Acceptance Required', 'Please accept the terms and conditions.');
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      // 🏗️ Payment Data Preparation
      const paymentData = {
        userId: user.id,
        skillId: skill?.id,
        expertId: expert?.id,
        bundleAmount: BUNDLE_PRICE,
        paymentAmount: finalAmount,
        paymentMethod: selectedMethod.id,
        installmentPlan: selectedPlan.id,
        revenueSplit: {
          mosa: revenueSplit.mosa,
          expert: revenueSplit.expert
        },
        payoutSchedule: payoutSchedule,
        metadata: {
          faydaId: user.faydaId,
          deviceId: await AnalyticsService.getDeviceId(),
          timestamp: new Date().toISOString()
        }
      };

      AnalyticsService.track('payment_initiated', paymentData);

      // 🏗️ Process Payment via Enterprise Service
      const result = await PaymentService.processBundlePurchase(paymentData);

      if (result.success) {
        setPaymentStatus('success');
        AnalyticsService.track('payment_succeeded', {
          paymentId: result.paymentId,
          amount: finalAmount
        });

        // 🏗️ Success Animation & Navigation
        await playSuccessAnimation();
        
        if (onPaymentSuccess) {
          onPaymentSuccess(result);
        } else {
          navigation.navigate('EnrollmentConfirmation', {
            paymentId: result.paymentId,
            skill: skill,
            expert: expert
          });
        }

      } else {
        throw new Error(result.error || 'Payment processing failed');
      }

    } catch (error) {
      setPaymentStatus('failed');
      console.error('Payment Error:', error);
      
      AnalyticsService.track('payment_failed', {
        error: error.message,
        method: selectedMethod.id,
        amount: finalAmount
      });

      // 🏗️ Enterprise Error Handling
      handlePaymentError(error);
      
      if (onPaymentFailed) {
        onPaymentFailed(error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 🏗️ Payment Error Handler
   */
  const handlePaymentError = (error) => {
    const errorConfig = {
      'INSUFFICIENT_FUNDS': {
        title: 'Insufficient Funds',
        message: 'Your account balance is insufficient. Please try another payment method.',
        actions: [
          { text: 'Change Method', style: 'default' },
          { text: 'Add Funds', style: 'cancel' }
        ]
      },
      'NETWORK_ERROR': {
        title: 'Network Issue',
        message: 'Unable to connect to payment service. Please check your internet connection.',
        actions: [
          { text: 'Retry', style: 'default' },
          { text: 'Cancel', style: 'cancel' }
        ]
      },
      'TIMEOUT': {
        title: 'Payment Timeout',
        message: 'The payment request timed out. Please try again.',
        actions: [
          { text: 'Retry', style: 'default' },
          { text: 'Cancel', style: 'cancel' }
        ]
      },
      'DEFAULT': {
        title: 'Payment Failed',
        message: 'We encountered an issue processing your payment. Please try again or contact support.',
        actions: [
          { text: 'Try Again', style: 'default' },
          { text: 'Contact Support', style: 'default' },
          { text: 'Cancel', style: 'cancel' }
        ]
      }
    };

    const config = errorConfig[error.code] || errorConfig.DEFAULT;
    
    Alert.alert(config.title, config.message, config.actions);
  };

  /**
   * 🏗️ Success Animation Sequence
   */
  const playSuccessAnimation = () => {
    return new Promise((resolve) => {
      Animated.sequence([
        Animated.timing(animation, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(resolve);
    });
  };

  /**
   * 🏗️ Render Payment Method Selection
   */
  const renderPaymentMethods = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select Payment Method</Text>
      <View style={styles.methodsContainer}>
        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodCard,
              selectedMethod?.id === method.id && styles.methodCardSelected
            ]}
            onPress={() => handleMethodSelect(method)}
            disabled={isProcessing}
          >
            <View style={styles.methodHeader}>
              <View style={styles.methodIconContainer}>
                <Ionicons name={method.icon} size={24} color="#4A90E2" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodName}>{method.name}</Text>
                <Text style={styles.methodDescription}>{method.description}</Text>
              </View>
              <View style={styles.radioContainer}>
                <View style={[
                  styles.radio,
                  selectedMethod?.id === method.id && styles.radioSelected
                ]}>
                  {selectedMethod?.id === method.id && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </View>
            </View>
            
            <View style={styles.methodDetails}>
              <Text style={styles.methodDetail}>
                Processing: {method.processingTime}
              </Text>
              {method.fee > 0 && (
                <Text style={styles.methodDetail}>
                  Fee: {method.fee} ETB
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  /**
   * 🏗️ Render Installment Plans
   */
  const renderInstallmentPlans = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Choose Payment Plan</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.plansContainer}
      >
        {INSTALLMENT_PLANS.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              selectedPlan.id === plan.id && styles.planCardSelected
            ]}
            onPress={() => handlePlanSelect(plan)}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={selectedPlan.id === plan.id 
                ? ['#667eea', '#764ba2'] 
                : ['#f5f7fa', '#c3cfe2']
              }
              style={styles.planGradient}
            >
              <Text style={[
                styles.planName,
                selectedPlan.id === plan.id && styles.planNameSelected
              ]}>
                {plan.name}
              </Text>
              
              {plan.installments ? (
                <View style={styles.installmentsContainer}>
                  {plan.installments.map((installment, index) => (
                    <View key={index} style={styles.installmentRow}>
                      <Text style={styles.installmentDue}>{installment.due}</Text>
                      <Text style={styles.installmentAmount}>
                        {installment.amount} ETB
                      </Text>
                    </View>
                  ))}
                  <View style={styles.installmentTotal}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalAmount}>{plan.total} ETB</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.fullPaymentContainer}>
                  <Text style={styles.fullPaymentAmount}>
                    {plan.amount} ETB
                  </Text>
                  <Text style={styles.fullPaymentText}>One-time payment</Text>
                </View>
              )}
              
              {plan.fee > 0 && (
                <Text style={styles.planFee}>+ {plan.fee} ETB fee</Text>
              )}
              
              <Text style={styles.planDescription}>{plan.description}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  /**
   * 🏗️ Render Revenue Split Visualization
   */
  const renderRevenueSplit = () => {
    if (!showRevenueSplit) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Revenue Distribution</Text>
        <View style={styles.revenueContainer}>
          <View style={styles.revenueSplit}>
            <View style={styles.revenueItem}>
              <View style={[styles.revenueBar, styles.mosaRevenue]} />
              <View style={styles.revenueInfo}>
                <Text style={styles.revenueLabel}>Mosa Platform</Text>
                <Text style={styles.revenueAmount}>{revenueSplit.mosa} ETB</Text>
                <Text style={styles.revenuePercentage}>
                  {((revenueSplit.mosa / BUNDLE_PRICE) * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
            
            <View style={styles.revenueItem}>
              <View style={[styles.revenueBar, styles.expertRevenue]} />
              <View style={styles.revenueInfo}>
                <Text style={styles.revenueLabel}>Expert Earnings</Text>
                <Text style={styles.revenueAmount}>{revenueSplit.expert} ETB</Text>
                <Text style={styles.revenuePercentage}>
                  {((revenueSplit.expert / BUNDLE_PRICE) * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.payoutSchedule}>
            <Text style={styles.payoutTitle}>Expert Payout Schedule</Text>
            {payoutSchedule.map((payout, index) => (
              <View key={index} style={styles.payoutItem}>
                <View style={styles.payoutPhase}>
                  <Ionicons 
                    name={getPayoutIcon(payout.phase)} 
                    size={20} 
                    color="#4CAF50" 
                  />
                  <Text style={styles.payoutLabel}>{payout.label}</Text>
                </View>
                <Text style={styles.payoutAmount}>{payout.amount} ETB</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  /**
   * 🏗️ Get Payout Phase Icon
   */
  const getPayoutIcon = (phase) => {
    const icons = {
      START: 'play-circle',
      MIDPOINT: 'time',
      COMPLETION: 'trophy'
    };
    return icons[phase] || 'cash';
  };

  /**
   * 🏗️ Render Security Checks
   */
  const renderSecurityChecks = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Security Verification</Text>
      
      <TouchableOpacity
        style={styles.securityCheck}
        onPress={() => setSecurityCheck(!securityCheck)}
        disabled={isProcessing}
      >
        <View style={styles.checkboxContainer}>
          <View style={[
            styles.checkbox,
            securityCheck && styles.checkboxChecked
          ]}>
            {securityCheck && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>
        </View>
        <View style={styles.securityText}>
          <Text style={styles.securityTitle}>
            This is my personal device
          </Text>
          <Text style={styles.securityDescription}>
            I confirm that I'm using my own secure device for this transaction
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.securityCheck}
        onPress={() => setTermsAccepted(!termsAccepted)}
        disabled={isProcessing}
      >
        <View style={styles.checkboxContainer}>
          <View style={[
            styles.checkbox,
            termsAccepted && styles.checkboxChecked
          ]}>
            {termsAccepted && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
          </View>
        </View>
        <View style={styles.securityText}>
          <Text style={styles.securityTitle}>
            Accept Terms & Conditions
          </Text>
          <Text style={styles.securityDescription}>
            I agree to the Mosa Forge terms of service and privacy policy
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  /**
   * 🏗️ Render Payment Summary
   */
  const renderPaymentSummary = () => (
    <View style={styles.summaryContainer}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.summaryGradient}
      >
        <Text style={styles.summaryTitle}>Payment Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Bundle Price</Text>
          <Text style={styles.summaryValue}>{BUNDLE_PRICE} ETB</Text>
        </View>
        
        {selectedPlan.fee > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Processing Fee</Text>
            <Text style={styles.summaryValue}>+ {selectedPlan.fee} ETB</Text>
          </View>
        )}
        
        <View style={styles.summaryDivider} />
        
        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>{finalAmount} ETB</Text>
        </View>
        
        <Text style={styles.summaryNote}>
          Includes 4-month training, certification, and Yachi verification
        </Text>
      </LinearGradient>
    </View>
  );

  /**
   * 🏗️ Render Purchase Button
   */
  const renderPurchaseButton = () => {
    const isDisabled = !selectedMethod || !securityCheck || !termsAccepted || isProcessing;
    
    return (
      <TouchableOpacity
        style={[
          styles.purchaseButton,
          isDisabled && styles.purchaseButtonDisabled
        ]}
        onPress={handlePurchase}
        disabled={isDisabled}
      >
        <LinearGradient
          colors={isDisabled ? ['#cccccc', '#999999'] : ['#4CAF50', '#45a049']}
          style={styles.buttonGradient}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={20} color="#FFFFFF" />
              <Text style={styles.purchaseButtonText}>
                Pay {finalAmount} ETB
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // 🏗️ Main Component Render
  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: animation,
          transform: [{
            translateY: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })
          }]
        }
      ]}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* 🏗️ Bundle Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.headerGradient}
          >
            <Text style={styles.headerTitle}>Mosa Forge Bundle</Text>
            <Text style={styles.headerSubtitle}>
              4-Month Skills Transformation
            </Text>
            <Text style={styles.headerPrice}>{BUNDLE_PRICE} ETB</Text>
          </LinearGradient>
        </View>

        {/* 🏗️ Bundle Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>What's Included</Text>
          {[
            '4-Month Complete Training Program',
            'Duolingo-style Interactive Learning',
            'Hands-on Expert Guidance',
            'Mosa Enterprise Certification',
            'Yachi Platform Verification',
            'Income Generation Ready'
          ].map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* 🏗️ Component Sections */}
        {renderInstallmentPlans()}
        {renderPaymentMethods()}
        {renderRevenueSplit()}
        {renderSecurityChecks()}
        {renderPaymentSummary()}

        {/* 🏗️ Security Badge */}
        <View style={styles.securityBadge}>
          <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
          <Text style={styles.securityBadgeText}>
            Secure Payment • Encrypted • PCI Compliant
          </Text>
        </View>
      </ScrollView>

      {/* 🏗️ Fixed Purchase Button */}
      <View style={styles.footer}>
        {renderPurchaseButton()}
      </View>

      {/* 🏗️ Processing Overlay */}
      {isProcessing && (
        <BlurView intensity={80} style={styles.processingOverlay}>
          <View style={styles.processingContent}>
            <ActivityIndicator size="large" color="#4A90E2" />
            <Text style={styles.processingText}>
              Processing Payment...
            </Text>
            <Text style={styles.processingSubtext}>
              Please don't close the app
            </Text>
          </View>
        </BlurView>
      )}
    </Animated.View>
  );
};

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
  },
  headerGradient: {
    padding: 30,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
  },
  headerPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  featuresSection: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333333',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666666',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333333',
  },
  methodsContainer: {
    gap: 12,
  },
  methodCard: {
    borderWidth: 2,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    padding: 15,
    backgroundColor: '#FFFFFF',
  },
  methodCardSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F8FF',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  methodDescription: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  radioContainer: {
    marginLeft: 'auto',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#4A90E2',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  methodDetails: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  methodDetail: {
    fontSize: 12,
    color: '#666666',
  },
  plansContainer: {
    marginHorizontal: -5,
  },
  planCard: {
    width: 200,
    marginHorizontal: 5,
    borderRadius: 15,
    overflow: 'hidden',
  },
  planCardSelected: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  planGradient: {
    padding: 20,
    borderRadius: 15,
  },
  planName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
  },
  planNameSelected: {
    color: '#FFFFFF',
  },
  installmentsContainer: {
    gap: 8,
  },
  installmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  installmentDue: {
    fontSize: 12,
    color: '#666666',
  },
  installmentAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  installmentTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  fullPaymentContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  fullPaymentAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  fullPaymentText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 5,
  },
  planFee: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 5,
  },
  planDescription: {
    fontSize: 11,
    color: '#666666',
    marginTop: 10,
    textAlign: 'center',
  },
  revenueContainer: {
    gap: 20,
  },
  revenueSplit: {
    gap: 15,
  },
  revenueItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueBar: {
    width: 60,
    height: 8,
    borderRadius: 4,
    marginRight: 15,
  },
  mosaRevenue: {
    backgroundColor: '#667eea',
  },
  expertRevenue: {
    backgroundColor: '#4CAF50',
  },
  revenueInfo: {
    flex: 1,
  },
  revenueLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  revenueAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  revenuePercentage: {
    fontSize: 12,
    color: '#666666',
  },
  payoutSchedule: {
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 10,
  },
  payoutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333333',
  },
  payoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  payoutPhase: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  payoutLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666666',
  },
  payoutAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  securityCheck: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  securityText: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  securityDescription: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
  },
  summaryContainer: {
    margin: 20,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryGradient: {
    padding: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: 10,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  summaryNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  securityBadge: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  securityBadgeText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  purchaseButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    gap: 10,
  },
  purchaseButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContent: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  processingText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    color: '#333333',
  },
  processingSubtext: {
    fontSize: 