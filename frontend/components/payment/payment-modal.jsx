// payment/payment-modal.jsx

/**
 * 🎯 ENTERPRISE PAYMENT MODAL COMPONENT
 * Production-ready payment modal for Mosa Forge
 * Features: 1,999 ETB bundle, revenue split visualization, multiple payment methods
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  Platform,
  StyleSheet
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { usePayment } from '../hooks/use-payment-distribution';
import { useAuth } from '../contexts/auth-context';
import { Logger } from '../utils/logger';
import { PaymentVisualization } from './revenue-split-display';
import { PaymentSecurityBadge } from './security-badge';
import { LoadingSpinner } from '../components/shared/loading-spinner';
import { QualityScore } from '../components/shared/quality-score';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const logger = new Logger('PaymentModal');

export const PaymentModal = ({
  visible = false,
  onClose,
  onSuccess,
  onError,
  bundleDetails,
  expert,
  student,
  enrollmentData
}) => {
  // 🎯 STATE MANAGEMENT
  const [paymentStep, setPaymentStep] = useState('method-selection');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [animation] = useState(new Animated.Value(0));
  const [securityChecks, setSecurityChecks] = useState({
    faydaVerified: false,
    deviceTrusted: false,
    paymentSecure: true
  });

  // 🎯 HOOKS & CONTEXT
  const { 
    processPayment, 
    calculateRevenueSplit, 
    validatePaymentMethod,
    getPaymentMethods 
  } = usePayment();
  
  const { user, faydaData } = useAuth();

  // 🎯 PAYMENT CONFIGURATION
  const PAYMENT_CONFIG = {
    bundlePrice: 1999,
    currency: 'ETB',
    revenueSplit: {
      mosa: 1000,
      expert: 999
    },
    payoutSchedule: [333, 333, 333],
    methods: {
      telebirr: {
        id: 'telebirr',
        name: 'Telebirr',
        icon: '📱',
        fees: 0,
        processingTime: 'Instant',
        limits: { min: 1, max: 50000 }
      },
      cbebirr: {
        id: 'cbebirr',
        name: 'CBE Birr',
        icon: '🏦',
        fees: 0,
        processingTime: 'Instant',
        limits: { min: 1, max: 100000 }
      },
      bankTransfer: {
        id: 'bank',
        name: 'Bank Transfer',
        icon: '💳',
        fees: 5,
        processingTime: '1-2 hours',
        limits: { min: 100, max: 500000 }
      },
      installment: {
        id: 'installment',
        name: 'Installment Plan',
        icon: '📅',
        fees: 50,
        processingTime: 'Instant',
        limits: { min: 1999, max: 1999 }
      }
    }
  };

  // 🎯 ANIMATION EFFECTS
  useEffect(() => {
    if (visible) {
      Animated.spring(animation, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }).start();
      
      // Initialize security checks
      initializeSecurityChecks();
    } else {
      Animated.spring(animation, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }).start();
    }
  }, [visible]);

  // 🎯 SECURITY INITIALIZATION
  const initializeSecurityChecks = useCallback(async () => {
    try {
      const checks = {
        faydaVerified: !!faydaData?.verified,
        deviceTrusted: await checkDeviceTrust(),
        paymentSecure: true
      };
      setSecurityChecks(checks);
      
      logger.info('Security checks initialized', checks);
    } catch (error) {
      logger.error('Security initialization failed', error);
    }
  }, [faydaData]);

  // 🎯 DEVICE TRUST CHECK
  const checkDeviceTrust = async () => {
    // Implement device fingerprinting and trust assessment
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 100);
    });
  };

  // 🎯 PAYMENT METHOD SELECTION
  const handleMethodSelect = useCallback(async (methodId) => {
    try {
      setSelectedMethod(methodId);
      
      // Validate payment method
      const validation = await validatePaymentMethod(methodId, PAYMENT_CONFIG.bundlePrice);
      
      if (!validation.valid) {
        Alert.alert('Payment Method Unavailable', validation.message);
        return;
      }

      logger.info('Payment method selected', { methodId, validation });
      setPaymentStep('confirmation');
    } catch (error) {
      logger.error('Method selection failed', error);
      onError?.('METHOD_SELECTION_FAILED');
    }
  }, [validatePaymentMethod, onError]);

  // 🎯 PAYMENT PROCESSING
  const handlePaymentProcess = useCallback(async () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      // 🛡️ SECURITY VALIDATION
      if (!securityChecks.faydaVerified) {
        throw new Error('FAYDA_VERIFICATION_REQUIRED');
      }

      // 💰 PAYMENT EXECUTION
      const paymentResult = await processPayment({
        amount: PAYMENT_CONFIG.bundlePrice,
        currency: PAYMENT_CONFIG.currency,
        method: selectedMethod,
        studentId: student?.id,
        expertId: expert?.id,
        bundleId: bundleDetails?.id,
        revenueSplit: PAYMENT_CONFIG.revenueSplit,
        payoutSchedule: PAYMENT_CONFIG.payoutSchedule,
        metadata: {
          deviceInfo: Platform.OS,
          timestamp: new Date().toISOString(),
          securityChecks
        }
      });

      if (paymentResult.success) {
        setPaymentStatus('success');
        logger.info('Payment processed successfully', { 
          paymentId: paymentResult.paymentId,
          amount: PAYMENT_CONFIG.bundlePrice 
        });

        // 🎉 SUCCESS HANDLING
        setTimeout(() => {
          onSuccess?.(paymentResult);
          handleClose();
        }, 2000);
      } else {
        throw new Error(paymentResult.error || 'PAYMENT_FAILED');
      }
    } catch (error) {
      logger.error('Payment processing failed', error);
      setPaymentStatus('error');
      
      // 🚨 ERROR HANDLING
      handlePaymentError(error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    selectedMethod, 
    securityChecks, 
    processPayment, 
    student, 
    expert, 
    bundleDetails, 
    onSuccess, 
    onError
  ]);

  // 🎯 PAYMENT ERROR HANDLING
  const handlePaymentError = useCallback((error) => {
    const errorMessages = {
      'FAYDA_VERIFICATION_REQUIRED': 'Fayda ID verification required for payment',
      'INSUFFICIENT_FUNDS': 'Insufficient funds in your account',
      'NETWORK_ERROR': 'Network connection failed. Please try again',
      'PAYMENT_FAILED': 'Payment processing failed. Please try another method',
      'TIMEOUT': 'Payment timeout. Please check your connection'
    };

    const message = errorMessages[error.message] || 'Payment failed. Please try again';
    
    Alert.alert('Payment Failed', message, [
      { text: 'Try Again', onPress: () => setPaymentStatus('idle') },
      { text: 'Cancel', onPress: handleClose, style: 'cancel' }
    ]);

    onError?.(error.message);
  }, [onError]);

  // 🎯 MODAL CLOSE HANDLER
  const handleClose = useCallback(() => {
    if (isProcessing) {
      Alert.alert(
        'Payment in Progress',
        'Are you sure you want to cancel this payment?',
        [
          { text: 'Continue Payment', style: 'cancel' },
          { 
            text: 'Cancel Payment', 
            onPress: () => {
              setIsProcessing(false);
              setPaymentStatus('idle');
              setPaymentStep('method-selection');
              setSelectedMethod(null);
              onClose?.();
            },
            style: 'destructive'
          }
        ]
      );
    } else {
      setPaymentStep('method-selection');
      setSelectedMethod(null);
      setPaymentStatus('idle');
      onClose?.();
    }
  }, [isProcessing, onClose]);

  // 🎯 RENDER METHODS
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <Text style={styles.title}>Complete Your Enrollment</Text>
        <Text style={styles.subtitle}>
          Secure payment for {PAYMENT_CONFIG.bundlePrice} ETB bundle
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={handleClose}
        disabled={isProcessing}
      >
        <Text style={styles.closeButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSecurityStatus = () => (
    <View style={styles.securitySection}>
      <PaymentSecurityBadge checks={securityChecks} />
      <View style={styles.securityDetails}>
        <Text style={styles.securityTitle}>Secure Payment</Text>
        <Text style={styles.securitySubtitle}>
          {securityChecks.faydaVerified ? 'Fayda Verified • ' : ''}
          Encrypted • Ethiopian Data Centers
        </Text>
      </View>
    </View>
  );

  const renderRevenueSplit = () => (
    <View style={styles.revenueSection}>
      <Text style={styles.sectionTitle}>Revenue Distribution</Text>
      <PaymentVisualization
        totalAmount={PAYMENT_CONFIG.bundlePrice}
        mosaShare={PAYMENT_CONFIG.revenueSplit.mosa}
        expertShare={PAYMENT_CONFIG.revenueSplit.expert}
        payoutSchedule={PAYMENT_CONFIG.payoutSchedule}
        expert={expert}
      />
    </View>
  );

  const renderPaymentMethods = () => (
    <View style={styles.methodsSection}>
      <Text style={styles.sectionTitle}>Select Payment Method</Text>
      <ScrollView 
        style={styles.methodsList}
        showsVerticalScrollIndicator={false}
      >
        {Object.values(PAYMENT_CONFIG.methods).map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.methodButton,
              selectedMethod === method.id && styles.methodButtonSelected
            ]}
            onPress={() => handleMethodSelect(method.id)}
            disabled={isProcessing}
          >
            <View style={styles.methodInfo}>
              <Text style={styles.methodIcon}>{method.icon}</Text>
              <View style={styles.methodDetails}>
                <Text style={styles.methodName}>{method.name}</Text>
                <Text style={styles.methodMeta}>
                  {method.processingTime} • {method.fees === 0 ? 'No fees' : `${method.fees} ETB fee`}
                </Text>
              </View>
            </View>
            <View style={[
              styles.radioButton,
              selectedMethod === method.id && styles.radioButtonSelected
            ]}>
              {selectedMethod === method.id && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderInstallmentPlan = () => (
    <View style={styles.installmentSection}>
      <Text style={styles.installmentTitle}>Installment Plan Available</Text>
      <View style={styles.installmentPlan}>
        <View style={styles.installmentItem}>
          <Text style={styles.installmentAmount}>666 ETB</Text>
          <Text style={styles.installmentLabel}>Today</Text>
        </View>
        <Text style={styles.installmentDivider}>→</Text>
        <View style={styles.installmentItem}>
          <Text style={styles.installmentAmount}>666 ETB</Text>
          <Text style={styles.installmentLabel}>Month 2</Text>
        </View>
        <Text style={styles.installmentDivider}>→</Text>
        <View style={styles.installmentItem}>
          <Text style={styles.installmentAmount}>667 ETB</Text>
          <Text style={styles.installmentLabel}>Month 3</Text>
        </View>
      </View>
    </View>
  );

  const renderConfirmation = () => (
    <View style={styles.confirmationSection}>
      <Text style={styles.sectionTitle}>Confirm Payment</Text>
      
      <View style={styles.confirmationDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount:</Text>
          <Text style={styles.detailValue}>{PAYMENT_CONFIG.bundlePrice} ETB</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Method:</Text>
          <Text style={styles.detailValue}>
            {PAYMENT_CONFIG.methods[selectedMethod]?.name}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Expert:</Text>
          <Text style={styles.detailValue}>{expert?.name}</Text>
        </View>

        {expert && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quality Score:</Text>
            <QualityScore score={expert.qualityScore} size="small" />
          </View>
        )}
      </View>

      {selectedMethod === 'installment' && renderInstallmentPlan()}
    </View>
  );

  const renderPaymentStatus = () => {
    if (paymentStatus === 'processing') {
      return (
        <View style={styles.statusSection}>
          <LoadingSpinner size="large" />
          <Text style={styles.statusText}>Processing your payment...</Text>
          <Text style={styles.statusSubtext}>
            Please don't close this window
          </Text>
        </View>
      );
    }

    if (paymentStatus === 'success') {
      return (
        <View style={[styles.statusSection, styles.statusSuccess]}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.statusText}>Payment Successful!</Text>
          <Text style={styles.statusSubtext}>
            You're now enrolled in the course
          </Text>
        </View>
      );
    }

    if (paymentStatus === 'error') {
      return (
        <View style={[styles.statusSection, styles.statusError]}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.statusText}>Payment Failed</Text>
          <Text style={styles.statusSubtext}>
            Please try another payment method
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderActionButtons = () => {
    if (paymentStatus === 'processing') {
      return null;
    }

    if (paymentStatus === 'success' || paymentStatus === 'error') {
      return (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleClose}
          >
            <Text style={styles.buttonText}>
              {paymentStatus === 'success' ? 'Start Learning' : 'Try Again'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleClose}
          disabled={isProcessing}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Cancel
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            (!selectedMethod || isProcessing) && styles.buttonDisabled
          ]}
          onPress={handlePaymentProcess}
          disabled={!selectedMethod || isProcessing}
        >
          {isProcessing ? (
            <LoadingSpinner size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              Pay {PAYMENT_CONFIG.bundlePrice} ETB
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // 🎯 MODAL CONTENT
  const renderContent = () => {
    if (paymentStatus === 'processing' || paymentStatus === 'success' || paymentStatus === 'error') {
      return renderPaymentStatus();
    }

    return (
      <>
        {renderSecurityStatus()}
        {renderRevenueSplit()}
        
        {paymentStep === 'method-selection' && renderPaymentMethods()}
        {paymentStep === 'confirmation' && renderConfirmation()}
      </>
    );
  };

  // 🎯 MAIN RENDER
  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {Platform.OS === 'ios' && (
          <BlurView
            style={styles.absolute}
            blurType="dark"
            blurAmount={10}
            reducedTransparencyFallbackColor="rgba(0, 0, 0, 0.7)"
          />
        )}
        
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SCREEN_HEIGHT, 0]
                })
              }]
            }
          ]}
        >
          <View style={styles.modalContent}>
            {renderHeader()}
            
            <ScrollView 
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContentContainer}
            >
              {renderContent()}
            </ScrollView>

            {renderActionButtons()}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// 🎯 STYLES
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.9,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalContent: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
    fontWeight: '300',
    lineHeight: 24,
  },
  securitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  securityDetails: {
    flex: 1,
    marginLeft: 12,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  securitySubtitle: {
    fontSize: 12,
    color: '#666',
  },
  revenueSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  methodsSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  methodsList: {
    maxHeight: 300,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  methodButtonSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  methodMeta: {
    fontSize: 12,
    color: '#666',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#10B981',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  confirmationSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  confirmationDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  installmentSection: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  installmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EA580C',
    marginBottom: 12,
  },
  installmentPlan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  installmentItem: {
    alignItems: 'center',
    flex: 1,
  },
  installmentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  installmentLabel: {
    fontSize: 12,
    color: '#666',
  },
  installmentDivider: {
    fontSize: 16,
    color: '#D1D5DB',
    fontWeight: '300',
  },
  statusSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  statusSuccess: {
    backgroundColor: '#F0FDF4',
  },
  statusError: {
    backgroundColor: '#FEF2F2',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F4',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: '#10B981',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#374151',
  },
});

export default PaymentModal;