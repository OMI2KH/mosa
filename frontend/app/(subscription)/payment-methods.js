/**
 * 🏢 MOSA FORGE - Enterprise Payment Methods Component
 * 💰 Secure Payment Gateway Integration & Management
 * 🔐 Multi-Gateway Support with Bank-Level Security
 * 📊 Real-time Payment Status & Transaction Analytics
 * 🚀 Enterprise-Grade React Native Component
 * 
 * @module PaymentMethods
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 🏗️ Enterprise Dependencies
import EnterpriseLogger from '../../services/enterprise-logger';
import PaymentService from '../../services/payment-service';
import SecurityService from '../../services/security-service';
import AnalyticsService from '../../services/analytics-service';

// 🎯 Custom Components
import PaymentCard from '../../components/payment/PaymentCard';
import PaymentGatewayCard from '../../components/payment/PaymentGatewayCard';
import SecurityBadge from '../../components/security/SecurityBadge';
import ProgressIndicator from '../../components/common/ProgressIndicator';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import RetryButton from '../../components/common/RetryButton';

// 🎨 Design System
import { 
  Colors, 
  Typography, 
  Spacing, 
  Shadows, 
  Gradients,
  Animations 
} from '../../design-system';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 🏢 Enterprise Payment Methods Component
 */
const PaymentMethods = () => {
  // 🎯 Navigation & Routing
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  // 🔧 Refs
  const loggerRef = useRef(new EnterpriseLogger({ module: 'PaymentMethods' }));
  const paymentServiceRef = useRef(new PaymentService());
  const securityServiceRef = useRef(new SecurityService());
  const analyticsRef = useRef(new AnalyticsService());

  // 🎨 Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // 📊 State Management
  const [state, setState] = useState({
    // 💰 Payment State
    paymentMethods: [],
    selectedMethod: null,
    isLoading: true,
    isProcessing: false,
    hasError: false,
    
    // 🔐 Security State
    isBiometricEnabled: false,
    isSecureSession: true,
    securityLevel: 'high',
    
    // 📊 Analytics State
    transactionHistory: [],
    paymentStats: null,
    
    // 🔧 Feature Flags
    features: {
      installmentPlans: true,
      biometricAuth: true,
      realTimeUpdates: true,
      multiCurrency: false,
      saveCards: true
    }
  });

  // 🎯 Route Parameters
  const bundleAmount = route.params?.bundleAmount || 1999;
  const skillId = route.params?.skillId;
  const expertId = route.params?.expertId;
  const enrollmentId = route.params?.enrollmentId;

  /**
   * 🏗️ Component Initialization
   */
  useEffect(() => {
    initializeComponent();
    
    // 📊 Start Analytics Session
    analyticsRef.current.startSession('payment_methods_screen');
    
    return () => {
      // 🧹 Cleanup
      analyticsRef.current.endSession('payment_methods_screen');
    };
  }, []);

  /**
   * 🏗️ Initialize Component
   */
  const initializeComponent = async () => {
    try {
      loggerRef.current.info('Initializing payment methods component');
      
      // 🎯 Start Animations
      startEntranceAnimations();
      
      // 🔐 Check Biometric Availability
      await checkBiometricAvailability();
      
      // 💰 Load Payment Methods
      await loadPaymentMethods();
      
      // 📊 Load Payment Analytics
      await loadPaymentAnalytics();
      
      // ✅ Mark as initialized
      setState(prev => ({ ...prev, isLoading: false }));
      
      loggerRef.current.success('Payment methods component initialized successfully');
      
    } catch (error) {
      loggerRef.current.error('Payment methods initialization failed', { error: error.message });
      setState(prev => ({ ...prev, isLoading: false, hasError: true }));
      
      // 🚨 Show Error Alert
      showErrorAlert(
        'Initialization Error',
        'Failed to initialize payment methods. Please try again.',
        error.message
      );
    }
  };

  /**
   * 🎬 Start Entrance Animations
   */
  const startEntranceAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  };

  /**
   * 🔐 Check Biometric Availability
   */
  const checkBiometricAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const biometricTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      const isBiometricEnabled = hasHardware && isEnrolled && biometricTypes.length > 0;
      
      setState(prev => ({ 
        ...prev, 
        isBiometricEnabled,
        securityLevel: isBiometricEnabled ? 'very_high' : 'high'
      }));
      
      loggerRef.current.info('Biometric availability checked', { 
        hasHardware, 
        isEnrolled, 
        biometricTypes: biometricTypes.length,
        isBiometricEnabled 
      });
      
    } catch (error) {
      loggerRef.current.warn('Biometric check failed', { error: error.message });
    }
  };

  /**
   * 💰 Load Payment Methods
   */
  const loadPaymentMethods = async () => {
    try {
      loggerRef.current.info('Loading payment methods');
      
      const paymentMethods = await paymentServiceRef.current.getAvailablePaymentMethods({
        bundleAmount,
        currency: 'ETB',
        country: 'ET'
      });
      
      setState(prev => ({ 
        ...prev, 
        paymentMethods,
        selectedMethod: paymentMethods.length > 0 ? paymentMethods[0] : null
      }));
      
      loggerRef.current.success('Payment methods loaded', { 
        count: paymentMethods.length,
        methods: paymentMethods.map(m => m.type)
      });
      
    } catch (error) {
      loggerRef.current.error('Failed to load payment methods', { error: error.message });
      throw error;
    }
  };

  /**
   * 📊 Load Payment Analytics
   */
  const loadPaymentAnalytics = async () => {
    try {
      const [transactionHistory, paymentStats] = await Promise.all([
        paymentServiceRef.current.getTransactionHistory({ limit: 5 }),
        paymentServiceRef.current.getPaymentStats()
      ]);
      
      setState(prev => ({ 
        ...prev, 
        transactionHistory,
        paymentStats
      }));
      
    } catch (error) {
      loggerRef.current.warn('Failed to load payment analytics', { error: error.message });
    }
  };

  /**
   * 🎯 Handle Payment Method Selection
   */
  const handleMethodSelection = useCallback((method) => {
    setState(prev => ({ ...prev, selectedMethod: method }));
    
    // 📊 Track Selection Analytics
    analyticsRef.current.trackEvent('payment_method_selected', {
      methodType: method.type,
      methodId: method.id,
      bundleAmount
    });
    
    // 🎯 Animate Selection
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    });
  }, [bundleAmount]);

  /**
   * 🔐 Process Secure Payment
   */
  const processSecurePayment = async () => {
    if (!state.selectedMethod) {
      showErrorAlert('No Method Selected', 'Please select a payment method to continue.');
      return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true }));
      
      // 📊 Start Payment Analytics
      const paymentStartTime = Date.now();
      analyticsRef.current.trackEvent('payment_initiated', {
        method: state.selectedMethod.type,
        amount: bundleAmount,
        skillId,
        expertId
      });

      // 🔐 Verify Security Session
      const isSessionSecure = await securityServiceRef.current.verifyPaymentSession();
      if (!isSessionSecure) {
        throw new Error('Security session verification failed');
      }

      // 🛡️ Perform Biometric Authentication if Enabled
      if (state.features.biometricAuth && state.isBiometricEnabled) {
        const biometricResult = await performBiometricAuthentication();
        if (!biometricResult.success) {
          throw new Error('Biometric authentication failed');
        }
      }

      // 💰 Process Payment
      const paymentResult = await paymentServiceRef.current.processPayment({
        method: state.selectedMethod,
        amount: bundleAmount,
        currency: 'ETB',
        metadata: {
          skillId,
          expertId,
          enrollmentId,
          timestamp: new Date().toISOString(),
          sessionId: analyticsRef.current.getSessionId()
        }
      });

      // 📊 Track Payment Success
      const paymentDuration = Date.now() - paymentStartTime;
      analyticsRef.current.trackEvent('payment_completed', {
        method: state.selectedMethod.type,
        amount: bundleAmount,
        transactionId: paymentResult.transactionId,
        duration: paymentDuration,
        success: true
      });

      // 🎯 Navigate to Success Screen
      navigation.navigate('PaymentSuccess', {
        transactionId: paymentResult.transactionId,
        amount: bundleAmount,
        method: state.selectedMethod.type,
        skillId,
        expertId
      });

    } catch (error) {
      loggerRef.current.error('Payment processing failed', { 
        error: error.message,
        method: state.selectedMethod?.type,
        amount: bundleAmount
      });

      // 📊 Track Payment Failure
      analyticsRef.current.trackEvent('payment_failed', {
        method: state.selectedMethod?.type,
        amount: bundleAmount,
        error: error.message,
        skillId,
        expertId
      });

      // 🚨 Show Error Alert
      showErrorAlert(
        'Payment Failed',
        'We were unable to process your payment. Please try again or use a different payment method.',
        error.message
      );

    } finally {
      setState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  /**
   * 🛡️ Perform Biometric Authentication
   */
  const performBiometricAuthentication = async () => {
    try {
      loggerRef.current.info('Initiating biometric authentication');
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to complete payment',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel'
      });

      if (result.success) {
        loggerRef.current.success('Biometric authentication successful');
        return { success: true };
      } else {
        loggerRef.current.warn('Biometric authentication failed', { 
          error: result.error,
          warning: result.warning 
        });
        return { 
          success: false, 
          error: result.error,
          warning: result.warning 
        };
      }
    } catch (error) {
      loggerRef.current.error('Biometric authentication error', { error: error.message });
      return { success: false, error: error.message };
    }
  };

  /**
   * 💳 Add New Payment Method
   */
  const handleAddPaymentMethod = () => {
    navigation.navigate('AddPaymentMethod', {
      bundleAmount,
      skillId,
      expertId,
      enrollmentId
    });
  };

  /**
   * 🔄 Retry Failed Operation
   */
  const handleRetry = async () => {
    setState(prev => ({ ...prev, hasError: false, isLoading: true }));
    await initializeComponent();
  };

  /**
   * 🚨 Show Error Alert
   */
  const showErrorAlert = (title, message, details = '') => {
    Alert.alert(
      title,
      `${message}${details ? `\n\nDetails: ${details}` : ''}`,
      [
        { 
          text: 'Try Again', 
          onPress: handleRetry,
          style: 'default'
        },
        { 
          text: 'Cancel', 
          style: 'cancel' 
        }
      ],
      { cancelable: true }
    );
  };

  /**
   * 🎨 Render Loading State
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary.default} />
      <Text style={styles.loadingText}>Loading payment methods...</Text>
      <ProgressIndicator 
        type="dots" 
        color={Colors.primary.default}
        size="medium"
      />
    </View>
  );

  /**
   * 🎨 Render Error State
   */
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Icon 
        name="alert-circle-outline" 
        size={64} 
        color={Colors.error.default} 
      />
      <Text style={styles.errorTitle}>Unable to Load Payment Methods</Text>
      <Text style={styles.errorMessage}>
        We encountered an issue loading your payment methods. This could be due to network issues or server problems.
      </Text>
      <RetryButton 
        onPress={handleRetry}
        label="Try Again"
        style={styles.retryButton}
      />
      <TouchableOpacity 
        style={styles.supportButton}
        onPress={() => navigation.navigate('Support')}
      >
        <Text style={styles.supportButtonText}>Contact Support</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * 🎨 Render Payment Method Card
   */
  const renderPaymentMethodCard = (method, index) => {
    const isSelected = state.selectedMethod?.id === method.id;
    
    return (
      <Animated.View
        key={method.id}
        style={[
          styles.paymentMethodCard,
          isSelected && styles.selectedPaymentMethodCard,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: isSelected ? scaleAnim : 1 }
            ]
          }
        ]}
      >
        <PaymentCard
          type={method.type}
          lastFour={method.lastFour}
          expiryDate={method.expiryDate}
          isDefault={method.isDefault}
          isSelected={isSelected}
          onPress={() => handleMethodSelection(method)}
          style={styles.paymentCard}
        />
      </Animated.View>
    );
  };

  /**
   * 🎨 Render Payment Gateway Card
   */
  const renderPaymentGatewayCard = (gateway) => (
    <Animated.View
      key={gateway.id}
      style={[
        styles.gatewayCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <PaymentGatewayCard
        gateway={gateway}
        amount={bundleAmount}
        onPress={() => handleMethodSelection(gateway)}
        isSelected={state.selectedMethod?.id === gateway.id}
      />
    </Animated.View>
  );

  /**
   * 🎨 Render Security Indicators
   */
  const renderSecurityIndicators = () => (
    <View style={styles.securityContainer}>
      <SecurityBadge 
        level={state.securityLevel}
        showDetails={true}
        style={styles.securityBadge}
      />
      <View style={styles.securityFeatures}>
        <View style={styles.securityFeature}>
          <Icon name="shield-check" size={20} color={Colors.success.default} />
          <Text style={styles.securityFeatureText}>Bank-Level Encryption</Text>
        </View>
        <View style={styles.securityFeature}>
          <Icon name="lock" size={20} color={Colors.success.default} />
          <Text style={styles.securityFeatureText}>PCI DSS Compliant</Text>
        </View>
        <View style={styles.securityFeature}>
          <Icon name="currency-eth" size={20} color={Colors.success.default} />
          <Text style={styles.securityFeatureText}>Ethiopian Banking Standards</Text>
        </View>
      </View>
    </View>
  );

  /**
   * 🎨 Render Payment Summary
   */
  const renderPaymentSummary = () => (
    <View style={styles.paymentSummary}>
      <Text style={styles.summaryTitle}>Payment Summary</Text>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Bundle Amount</Text>
        <Text style={styles.summaryValue}>{bundleAmount.toLocaleString()} ETB</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Platform Fee</Text>
        <Text style={styles.summaryValue}>1,000 ETB</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Expert Earnings</Text>
        <Text style={styles.summaryValue}>999 ETB</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.summaryRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{bundleAmount.toLocaleString()} ETB</Text>
      </View>
    </View>
  );

  /**
   * 🎨 Render Main Content
   */
  const renderMainContent = () => {
    const savedMethods = state.paymentMethods.filter(m => m.type === 'card');
    const gateways = state.paymentMethods.filter(m => m.type !== 'card');

    return (
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* 🎯 Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Payment Method</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* 📊 Payment Summary */}
        {renderPaymentSummary()}

        {/* 💳 Saved Payment Methods */}
        {savedMethods.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Saved Payment Methods</Text>
            {savedMethods.map(renderPaymentMethodCard)}
          </View>
        )}

        {/* 🏦 Payment Gateways */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Gateways</Text>
          {gateways.map(renderPaymentGatewayCard)}
        </View>

        {/* ➕ Add New Payment Method */}
        <TouchableOpacity 
          style={styles.addMethodButton}
          onPress={handleAddPaymentMethod}
        >
          <Icon name="plus-circle" size={24} color={Colors.primary.default} />
          <Text style={styles.addMethodText}>Add New Payment Method</Text>
        </TouchableOpacity>

        {/* 🔐 Security Indicators */}
        {renderSecurityIndicators()}

        {/* 📊 Payment Analytics (If Available) */}
        {state.paymentStats && (
          <View style={styles.analyticsContainer}>
            <Text style={styles.analyticsTitle}>Payment Statistics</Text>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsValue}>{state.paymentStats.successRate}%</Text>
                <Text style={styles.analyticsLabel}>Success Rate</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsValue}>{state.paymentStats.averageTime}s</Text>
                <Text style={styles.analyticsLabel}>Avg. Processing Time</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    );
  };

  /**
   * 🎨 Render Payment Button
   */
  const renderPaymentButton = () => {
    const isDisabled = !state.selectedMethod || state.isProcessing;
    
    return (
      <View style={styles.paymentButtonContainer}>
        <TouchableOpacity
          style={[
            styles.paymentButton,
            isDisabled && styles.paymentButtonDisabled
          ]}
          onPress={processSecurePayment}
          disabled={isDisabled}
          activeOpacity={0.8}
        >
          {state.isProcessing ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <View style={styles.paymentButtonContent}>
              <Icon name="lock" size={20} color={Colors.white} />
              <Text style={styles.paymentButtonText}>
                Pay {bundleAmount.toLocaleString()} ETB
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        {/* 🔒 Security Notice */}
        <Text style={styles.securityNotice}>
          <Icon name="shield-check" size={14} color={Colors.success.default} />
          {' '}Your payment is secured with bank-level encryption
        </Text>
      </View>
    );
  };

  /**
   * 🎨 Main Render
   */
  return (
    <ErrorBoundary 
      fallback={<Text>Payment methods are currently unavailable</Text>}
    >
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* 🎨 Background Gradient */}
        <View style={styles.backgroundGradient} />
        
        {/* 📱 Main Content */}
        {state.isLoading ? renderLoadingState() : 
         state.hasError ? renderErrorState() : renderMainContent()}
        
        {/* 💰 Payment Button (Conditional) */}
        {!state.isLoading && !state.hasError && renderPaymentButton()}
        
        {/* 🔒 Biometric Indicator */}
        {state.isBiometricEnabled && (
          <View style={styles.biometricIndicator}>
            <Icon name="fingerprint" size={16} color={Colors.success.default} />
            <Text style={styles.biometricText}>Biometric Authentication Available</Text>
          </View>
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

/**
 * 🎨 Enterprise-Grade Styles
 */
const styles = StyleSheet.create({
  // 🏗️ Layout Styles
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background.gradient,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  
  // 🎯 Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backButton: {
    padding: Spacing.xs,
    borderRadius: 8,
    backgroundColor: Colors.background.secondary,
  },
  headerTitle: {
    ...Typography.heading3,
    color: Colors.text.primary,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  
  // 💰 Payment Summary Styles
  paymentSummary: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    ...Shadows.medium,
  },
  summaryTitle: {
    ...Typography.heading4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    ...Typography.body2,
    color: Colors.text.secondary,
  },
  summaryValue: {
    ...Typography.body1,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border.light,
    marginVertical: Spacing.md,
  },
  totalLabel: {
    ...Typography.heading4,
    color: Colors.text.primary,
  },
  totalValue: {
    ...Typography.heading3,
    color: Colors.primary.default,
    fontWeight: '700',
  },
  
  // 📑 Section Styles
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.heading4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  
  // 💳 Payment Method Styles
  paymentMethodCard: {
    marginBottom: Spacing.md,
  },
  selectedPaymentMethodCard: {
    ...Shadows.medium,
  },
  paymentCard: {
    borderRadius: 12,
  },
  
  // 🏦 Gateway Card Styles
  gatewayCard: {
    marginBottom: Spacing.md,
  },
  
  // ➕ Add Method Styles
  addMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border.light,
    borderStyle: 'dashed',
  },
  addMethodText: {
    ...Typography.body1,
    color: Colors.primary.default,
    marginLeft: Spacing.sm,
    fontWeight: '600',
  },
  
  // 🔐 Security Styles
  securityContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  securityBadge: {
    marginBottom: Spacing.md,
  },
  securityFeatures: {
    marginTop: Spacing.sm,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  securityFeatureText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginLeft: Spacing.xs,
  },
  
  // 📊 Analytics Styles
  analyticsContainer: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 16,
    padding: Spacing.lg,
  },
  analyticsTitle: {
    ...Typography.heading4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  analyticsItem: {
    alignItems: 'center',
  },
  analyticsValue: {
    ...Typography.heading3,
    color: Colors.primary.default,
    fontWeight: '700',
  },
  analyticsLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  
  // 💰 Payment Button Styles
  paymentButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  paymentButton: {
    backgroundColor: Colors.primary.default,
    borderRadius: 12,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.medium,
  },
  paymentButtonDisabled: {
    backgroundColor: Colors.background.disabled,
  },
  paymentButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentButtonText: {
    ...Typography.heading4,
    color: Colors.white,
    marginLeft: Spacing.sm,
    fontWeight: '700',
  },
  securityNotice: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  
  // 🔒 Biometric Styles
  biometricIndicator: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success.light,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
  },
  biometricText: {
    ...Typography.caption,
    color: Colors.success.default,
    marginLeft: Spacing.xs,
    fontWeight: '600',
  },
  
  // ⏳ Loading Styles
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
  },
  loadingText: {
    ...Typography.body1,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
  },
  
  // 🚨 Error Styles
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    padding: Spacing.xl,
  },
  errorTitle: {
    ...Typography.heading3,
    color: Colors.error.default,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    ...Typography.body1,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  retryButton: {
    marginBottom: Spacing.md,
  },
  supportButton: {
    padding: Spacing.md,
  },
  supportButtonText: {
    ...Typography.body1,
    color: Colors.primary.default,
    fontWeight: '600',
  },
});

export default PaymentMethods;