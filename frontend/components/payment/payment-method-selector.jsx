// payment/payment-method-selector.jsx

/**
 * 🎯 ENTERPRISE PAYMENT METHOD SELECTOR
 * Production-ready payment method selection component for Mosa Forge
 * Features: Telebirr, CBE Birr integration, revenue split visualization, secure payment flow
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePayment } from '../../contexts/payment-context';
import { useAuth } from '../../contexts/auth-context';
import { Logger } from '../../utils/logger';
import { PaymentSecurity } from '../../utils/payment-security';
import { RevenueSplitVisualization } from './revenue-split-visualization';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Payment method configurations
const PAYMENT_METHODS = {
  TELEBIRR: {
    id: 'telebirr',
    name: 'Telebirr',
    icon: '📱',
    description: 'Instant payment via Telebirr',
    processingFee: 0.015, // 1.5%
    minAmount: 1,
    maxAmount: 50000,
    supportedBanks: ['CBE', 'Awash', 'Dashen', 'Abyssinia'],
    color: '#FF6B35',
    gradient: ['#FF6B35', '#FF8E35'],
    isAvailable: true,
  },
  CBE_BIRR: {
    id: 'cbe_birr',
    name: 'CBE Birr',
    icon: '🏦',
    description: 'CBE Birr mobile payment',
    processingFee: 0.02, // 2%
    minAmount: 1,
    maxAmount: 100000,
    supportedBanks: ['CBE'],
    color: '#2E86AB',
    gradient: ['#2E86AB', '#4CB5C3'],
    isAvailable: true,
  },
  BANK_TRANSFER: {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    icon: '💳',
    description: 'Direct bank transfer',
    processingFee: 0,
    minAmount: 100,
    maxAmount: 500000,
    supportedBanks: ['All Ethiopian Banks'],
    color: '#A23B72',
    gradient: ['#A23B72', '#C45BAA'],
    isAvailable: true,
  },
  INSTALLMENT: {
    id: 'installment',
    name: 'Installment Plan',
    icon: '📅',
    description: 'Pay in 3 monthly installments',
    processingFee: 0.05, // 5%
    minAmount: 1999,
    maxAmount: 10000,
    supportedBanks: ['CBE', 'Dashen', 'Awash'],
    color: '#F18F01',
    gradient: ['#F18F01', '#F9A826'],
    isAvailable: true,
  },
};

export const PaymentMethodSelector = React.memo(({
  bundleAmount = 1999,
  onPaymentMethodSelect,
  onPaymentSuccess,
  onPaymentError,
  enabled = true,
  showRevenueSplit = true,
  compactMode = false,
}) => {
  const logger = useMemo(() => new Logger('PaymentMethodSelector'), []);
  const paymentSecurity = useMemo(() => new PaymentSecurity(), []);
  
  const { user, faydaId } = useAuth();
  const {
    selectedPaymentMethod,
    setPaymentMethod,
    processPayment,
    paymentStatus,
    revenueSplit,
  } = usePayment();

  const insets = useSafeAreaInsets();
  const [selectedMethod, setSelectedMethod] = useState(selectedPaymentMethod);
  const [isProcessing, setIsProcessing] = useState(false);
  const [animation] = useState(new Animated.Value(0));
  const [securityCheck, setSecurityCheck] = useState(null);

  // Calculate payment amounts with fees
  const paymentAmounts = useMemo(() => {
    const baseAmount = bundleAmount;
    return Object.keys(PAYMENT_METHODS).reduce((acc, methodKey) => {
      const method = PAYMENT_METHODS[methodKey];
      const fee = baseAmount * method.processingFee;
      const totalAmount = baseAmount + fee;
      
      acc[method.id] = {
        baseAmount,
        processingFee: fee,
        totalAmount,
        formattedTotal: `ETB ${totalAmount.toLocaleString('en-ET')}`,
        formattedFee: fee > 0 ? `ETB ${fee.toLocaleString('en-ET')}` : 'No fee',
      };
      return acc;
    }, {});
  }, [bundleAmount]);

  // Revenue split breakdown
  const revenueBreakdown = useMemo(() => ({
    platform: 1000,
    expert: 999,
    total: 1999,
    platformPercentage: 50.03,
    expertPercentage: 49.97,
  }), []);

  // Security verification
  const performSecurityCheck = useCallback(async (paymentMethod) => {
    try {
      setSecurityCheck({ status: 'checking', method: paymentMethod.id });
      
      const securityResult = await paymentSecurity.verifyPaymentEligibility({
        userId: user.id,
        faydaId,
        paymentMethod: paymentMethod.id,
        amount: paymentAmounts[paymentMethod.id].totalAmount,
        deviceInfo: Platform.OS,
      });

      if (!securityResult.isEligible) {
        throw new Error(securityResult.reason || 'PAYMENT_SECURITY_CHECK_FAILED');
      }

      setSecurityCheck({ status: 'verified', method: paymentMethod.id });
      return true;
    } catch (error) {
      logger.error('Security check failed', error);
      setSecurityCheck({ status: 'failed', method: paymentMethod.id, error: error.message });
      return false;
    }
  }, [user, faydaId, paymentAmounts, paymentSecurity, logger]);

  // Handle payment method selection
  const handleMethodSelect = useCallback(async (method) => {
    if (!enabled || isProcessing) return;

    try {
      logger.debug('Payment method selected', { method: method.id });
      
      // Perform security check
      const isSecure = await performSecurityCheck(method);
      if (!isSecure) {
        Alert.alert(
          'Security Verification Failed',
          'Unable to proceed with payment due to security restrictions.',
          [{ text: 'OK' }]
        );
        return;
      }

      setSelectedMethod(method);
      
      // Animation
      Animated.spring(animation, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Notify parent component
      if (onPaymentMethodSelect) {
        onPaymentMethodSelect(method);
      }

      // Update payment context
      setPaymentMethod(method);

    } catch (error) {
      logger.error('Method selection failed', error);
      onPaymentError?.(error);
    }
  }, [enabled, isProcessing, animation, onPaymentMethodSelect, setPaymentMethod, onPaymentError, performSecurityCheck, logger]);

  // Handle payment initiation
  const handlePaymentInitiation = useCallback(async () => {
    if (!selectedMethod || isProcessing) return;

    try {
      setIsProcessing(true);
      logger.info('Payment initiation started', { 
        method: selectedMethod.id, 
        amount: paymentAmounts[selectedMethod.id].totalAmount 
      });

      // Final security validation
      const finalSecurityCheck = await paymentSecurity.finalValidation({
        userId: user.id,
        paymentMethod: selectedMethod.id,
        amount: paymentAmounts[selectedMethod.id].totalAmount,
        timestamp: Date.now(),
      });

      if (!finalSecurityCheck.valid) {
        throw new Error(finalSecurityCheck.reason || 'FINAL_VALIDATION_FAILED');
      }

      // Process payment
      const paymentResult = await processPayment({
        method: selectedMethod.id,
        amount: paymentAmounts[selectedMethod.id].totalAmount,
        bundleAmount,
        revenueSplit: revenueBreakdown,
        securityToken: finalSecurityCheck.token,
        userMetadata: {
          faydaId: user.faydaId,
          phone: user.phone,
          email: user.email,
        },
      });

      if (paymentResult.success) {
        logger.info('Payment processed successfully', { 
          transactionId: paymentResult.transactionId,
          method: selectedMethod.id 
        });
        
        onPaymentSuccess?.(paymentResult);
      } else {
        throw new Error(paymentResult.error || 'PAYMENT_PROCESSING_FAILED');
      }

    } catch (error) {
      logger.error('Payment initiation failed', error);
      
      // Enhanced error handling with specific messages
      let errorMessage = 'Payment failed. Please try again.';
      if (error.message.includes('insufficient_funds')) {
        errorMessage = 'Insufficient funds. Please check your account balance.';
      } else if (error.message.includes('network_error')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('security')) {
        errorMessage = 'Security verification failed. Please contact support.';
      }

      Alert.alert('Payment Failed', errorMessage, [{ text: 'OK' }]);
      onPaymentError?.(error);
    } finally {
      setIsProcessing(false);
    }
  }, [
    selectedMethod,
    isProcessing,
    paymentAmounts,
    bundleAmount,
    revenueBreakdown,
    user,
    processPayment,
    onPaymentSuccess,
    onPaymentError,
    paymentSecurity,
    logger,
  ]);

  // Render payment method card
  const renderPaymentMethodCard = useCallback((method) => {
    const isSelected = selectedMethod?.id === method.id;
    const amountInfo = paymentAmounts[method.id];
    const isMethodAvailable = method.isAvailable && enabled && !isProcessing;
    
    const cardStyle = {
      opacity: isMethodAvailable ? 1 : 0.6,
      transform: [
        {
          scale: isSelected 
            ? animation.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] })
            : 1,
        },
      ],
    };

    return (
      <Animated.View key={method.id} style={cardStyle}>
        <TouchableOpacity
          onPress={() => handleMethodSelect(method)}
          disabled={!isMethodAvailable}
          activeOpacity={0.7}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            borderWidth: 2,
            borderColor: isSelected ? method.color : 'transparent',
            shadowColor: method.color,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isSelected ? 0.3 : 0,
            shadowRadius: 8,
            elevation: isSelected ? 8 : 2,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 24, marginRight: 12 }}>{method.icon}</Text>
              
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 18, 
                  fontWeight: '700',
                  marginBottom: 4,
                }}>
                  {method.name}
                </Text>
                
                <Text style={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  fontSize: 14,
                  marginBottom: 8,
                }}>
                  {method.description}
                </Text>

                {/* Amount breakdown */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                    {amountInfo.formattedTotal}
                  </Text>
                  
                  {amountInfo.processingFee > 0 && (
                    <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}>
                      +{amountInfo.formattedFee} fee
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Security status indicator */}
            {securityCheck?.method === method.id && (
              <View style={{ 
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                backgroundColor: 
                  securityCheck.status === 'verified' ? 'rgba(76, 217, 100, 0.2)' :
                  securityCheck.status === 'checking' ? 'rgba(255, 204, 0, 0.2)' :
                  'rgba(255, 59, 48, 0.2)',
              }}>
                <Text style={{ 
                  color: 
                    securityCheck.status === 'verified' ? '#4CD964' :
                    securityCheck.status === 'checking' ? '#FFCC00' :
                    '#FF3B30',
                  fontSize: 10,
                  fontWeight: '600',
                }}>
                  {securityCheck.status === 'verified' ? '✓ Secure' :
                   securityCheck.status === 'checking' ? 'Checking...' : 'Failed'}
                </Text>
              </View>
            )}
          </View>

          {/* Supported banks */}
          {method.supportedBanks && (
            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255, 255, 255, 0.1)',
            }}>
              <Text style={{ 
                color: 'rgba(255, 255, 255, 0.6)', 
                fontSize: 12,
                marginRight: 8,
                marginBottom: 4,
              }}>
                Supports:
              </Text>
              {method.supportedBanks.map((bank, index) => (
                <Text
                  key={bank}
                  style={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    fontSize: 12,
                    fontWeight: '500',
                    marginRight: 8,
                    marginBottom: 4,
                  }}
                >
                  {bank}{index < method.supportedBanks.length - 1 ? ',' : ''}
                </Text>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }, [selectedMethod, paymentAmounts, enabled, isProcessing, securityCheck, animation, handleMethodSelect]);

  // Installment plan details
  const renderInstallmentPlan = useMemo(() => {
    if (selectedMethod?.id !== 'installment') return null;

    const installmentAmount = (bundleAmount * 1.05) / 3; // 5% fee split over 3 months
    
    return (
      <View style={{
        backgroundColor: 'rgba(241, 143, 1, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginTop: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#F18F01',
      }}>
        <Text style={{ 
          color: '#FFFFFF', 
          fontSize: 16, 
          fontWeight: '700',
          marginBottom: 8,
        }}>
          📅 Installment Plan
        </Text>
        
        <View style={{ marginLeft: 8 }}>
          <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, marginBottom: 4 }}>
            • 3 monthly payments of ETB {installmentAmount.toLocaleString('en-ET')}
          </Text>
          <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, marginBottom: 4 }}>
            • 5% processing fee included
          </Text>
          <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 }}>
            • Start learning immediately after first payment
          </Text>
        </View>
      </View>
    );
  }, [selectedMethod, bundleAmount]);

  if (compactMode) {
    return (
      <View style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 12,
      }}>
        <Text style={{ 
          color: '#FFFFFF', 
          fontSize: 16, 
          fontWeight: '600',
          marginBottom: 8,
        }}>
          Payment Method
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Object.values(PAYMENT_METHODS)
            .filter(method => method.isAvailable)
            .map(method => (
              <TouchableOpacity
                key={method.id}
                onPress={() => handleMethodSelect(method)}
                style={{
                  backgroundColor: selectedMethod?.id === method.id ? method.color : 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginRight: 8,
                  minWidth: 80,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 20, marginBottom: 4 }}>{method.icon}</Text>
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: 12, 
                  fontWeight: '600',
                  textAlign: 'center',
                }}>
                  {method.name}
                </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ 
      flex: 1,
      paddingBottom: insets.bottom,
    }}>
      {/* Header */}
      <View style={{ 
        paddingHorizontal: 20, 
        paddingTop: 20, 
        paddingBottom: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
      }}>
        <Text style={{ 
          color: '#FFFFFF', 
          fontSize: 24, 
          fontWeight: '800',
          marginBottom: 8,
          textAlign: 'center',
        }}>
          Choose Payment Method
        </Text>
        
        <Text style={{ 
          color: 'rgba(255, 255, 255, 0.7)', 
          fontSize: 16,
          textAlign: 'center',
        }}>
          Secure payment processed in Ethiopian Birr
        </Text>
      </View>

      {/* Revenue Split Visualization */}
      {showRevenueSplit && (
        <RevenueSplitVisualization
          breakdown={revenueBreakdown}
          compact={true}
          style={{ marginHorizontal: 20, marginBottom: 16 }}
        />
      )}

      {/* Payment Methods */}
      <ScrollView 
        style={{ flex: 1, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
      >
        {Object.values(PAYMENT_METHODS)
          .filter(method => method.isAvailable)
          .map(renderPaymentMethodCard)}
        
        {renderInstallmentPlan}

        {/* Security Badge */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 24,
          padding: 16,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
        }}>
          <Text style={{ fontSize: 20, marginRight: 8 }}>🛡️</Text>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
              Bank-Level Security
            </Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 12 }}>
              All payments are encrypted and secure
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Payment Button */}
      {selectedMethod && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 20,
          paddingBottom: insets.bottom + 20,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        }}>
          <LinearGradient
            colors={selectedMethod.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              onPress={handlePaymentInitiation}
              disabled={isProcessing || !enabled}
              style={{
                paddingVertical: 18,
                paddingHorizontal: 24,
                alignItems: 'center',
                opacity: isProcessing || !enabled ? 0.6 : 1,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isProcessing ? (
                  <>
                    <Text style={{ fontSize: 20, marginRight: 12 }}>⏳</Text>
                    <Text style={{ 
                      color: '#FFFFFF', 
                      fontSize: 18, 
                      fontWeight: '700' 
                    }}>
                      Processing...
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={{ fontSize: 20, marginRight: 12 }}>
                      {selectedMethod.icon}
                    </Text>
                    <View>
                      <Text style={{ 
                        color: '#FFFFFF', 
                        fontSize: 18, 
                        fontWeight: '700',
                        textAlign: 'center',
                      }}>
                        Pay {paymentAmounts[selectedMethod.id].formattedTotal}
                      </Text>
                      <Text style={{ 
                        color: 'rgba(255, 255, 255, 0.8)', 
                        fontSize: 12,
                        textAlign: 'center',
                      }}>
                        via {selectedMethod.name}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </View>
  );
});

// Prop validation
PaymentMethodSelector.propTypes = {
  bundleAmount: PropTypes.number,
  onPaymentMethodSelect: PropTypes.func,
  onPaymentSuccess: PropTypes.func,
  onPaymentError: PropTypes.func,
  enabled: PropTypes.bool,
  showRevenueSplit: PropTypes.bool,
  compactMode: PropTypes.bool,
};

PaymentMethodSelector.defaultProps = {
  bundleAmount: 1999,
  enabled: true,
  showRevenueSplit: true,
  compactMode: false,
};

export default PaymentMethodSelector;