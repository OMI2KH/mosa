/**
 * 🏢 MOSA FORGE - Enterprise Plan Upgrade Interface
 * 💰 Subscription Management & Service Enhancement
 * 🎯 Multi-Tier Plan Comparison & Feature Analysis
 * 🔄 Seamless Upgrade/Downgrade Management
 * 🚀 Enterprise-Grade React Native Component
 * 
 * @module PlanUpgrade
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';

// 🏗️ Enterprise Dependencies
import { AuthContext } from '../../contexts/AuthContext';
import { PaymentContext } from '../../contexts/PaymentContext';
import { SubscriptionContext } from '../../contexts/SubscriptionContext';
import { usePlanAnalytics } from '../../hooks/usePlanAnalytics';
import { usePaymentProcessing } from '../../hooks/usePaymentProcessing';
import NotificationService from '../../services/NotificationService';

// 🎨 Design System Components
import { 
  Card, 
  Button, 
  Badge, 
  ProgressBar, 
  FeatureCard, 
  PriceCard,
  LoadingOverlay,
  ErrorBoundary,
  ConfirmationModal
} from '../../components/shared';

// 🔗 Navigation
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const PlanUpgrade = () => {
  // 🔧 State Management
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentFeatures, setCurrentFeatures] = useState([]);
  const [upgradeFeatures, setUpgradeFeatures] = useState([]);
  const [plans, setPlans] = useState([]);
  const [userPlan, setUserPlan] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // 🎯 Animation States
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(width));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  // 🔗 Context Hooks
  const { user, isAuthenticated, refreshUserData } = useContext(AuthContext);
  const { 
    processPayment, 
    getPaymentMethods, 
    getInstallmentOptions,
    validatePayment 
  } = useContext(PaymentContext);
  const { 
    currentSubscription, 
    availablePlans, 
    upgradeSubscription,
    calculateProratedAmount,
    getSubscriptionHistory 
  } = useContext(SubscriptionContext);

  // 🔍 Custom Hooks
  const { trackPlanView, trackUpgradeAttempt, trackUpgradeSuccess } = usePlanAnalytics();
  const { processSubscriptionPayment, validatePromoCode } = usePaymentProcessing();

  // 🧭 Navigation
  const navigation = useNavigation();
  const route = useRoute();

  // 📊 Available Plans Configuration
  const planConfig = {
    basic: {
      id: 'basic',
      name: 'የመሠረት እቅድ',
      description: 'For beginners starting their skill journey',
      price: 1999,
      originalPrice: 2999,
      savings: 1000,
      currency: 'ETB',
      billingPeriod: 'per_course',
      features: [
        '🎓 1 Skill Training',
        '👨‍🏫 Standard Expert Matching',
        '📚 Basic Learning Materials',
        '⏱️ 4-Month Duration',
        '📊 Basic Progress Tracking',
        '🏆 Completion Certificate'
      ],
      limitations: [
        'Limited to 1 active course',
        'Standard support response (24h)',
        'Basic reporting only'
      ],
      colorScheme: ['#4CAF50', '#2E7D32'],
      icon: 'school-outline'
    },
    pro: {
      id: 'pro',
      name: 'ፕሮፌሽናል እቅድ',
      description: 'For serious learners building multiple skills',
      price: 3499,
      originalPrice: 4999,
      savings: 1500,
      currency: 'ETB',
      billingPeriod: 'quarterly',
      features: [
        '🎓 3 Skills Bundle',
        '👨‍🏫 Priority Expert Matching',
        '📚 Advanced Learning Materials',
        '⏱️ 6-Month Duration',
        '📊 Advanced Progress Analytics',
        '🏆 Professional Certificate',
        '🤝 Networking Access',
        '🎯 Career Guidance'
      ],
      limitations: [
        'Up to 3 active courses',
        'Priority support (12h response)',
        'Advanced reporting'
      ],
      colorScheme: ['#2196F3', '#0D47A1'],
      icon: 'briefcase-outline',
      popular: true
    },
    enterprise: {
      id: 'enterprise',
      name: 'የድርጅት እቅድ',
      description: 'For organizations and advanced professionals',
      price: 8999,
      originalPrice: 12999,
      savings: 4000,
      currency: 'ETB',
      billingPeriod: 'annual',
      features: [
        '🎓 Unlimited Skills Access',
        '👨‍🏫 Premium Expert Matching',
        '📚 Premium Learning Materials',
        '⏱️ 12-Month Duration',
        '📊 Enterprise Analytics Dashboard',
        '🏆 Gold Certification',
        '🤝 Premium Networking',
        '🎯 Executive Career Coaching',
        '👥 Team Management Tools',
        '📈 Business Integration'
      ],
      limitations: [
        'Unlimited courses',
        '24/7 Premium Support',
        'Custom reporting and analytics',
        'Dedicated account manager'
      ],
      colorScheme: ['#FF9800', '#E65100'],
      icon: 'domain',
      featured: true
    }
  };

  // 📋 Installment Options
  const installmentOptions = {
    full: {
      id: 'full',
      name: 'Full Payment',
      description: 'Pay in full and save on processing fees',
      discount: 0.05, // 5% discount
      installments: 1
    },
    two_payments: {
      id: 'two_payments',
      name: '2 Installments',
      description: 'Pay half now, half in 30 days',
      discount: 0,
      installments: 2
    },
    three_payments: {
      id: 'three_payments',
      name: '3 Installments',
      description: 'Spread payments over 3 months',
      discount: 0,
      installments: 3,
      processingFee: 0.03 // 3% processing fee
    }
  };

  // 🚀 Initialize Component
  useEffect(() => {
    initializeComponent();
    
    // 📊 Track plan view analytics
    trackPlanView('plan_upgrade_screen');
    
    // 🎭 Start entrance animations
    animateEntrance();
  }, []);

  // 🔄 Initialize Component Data
  const initializeComponent = async () => {
    try {
      setIsLoading(true);
      
      // 📋 Load user's current plan
      await loadUserPlan();
      
      // 💰 Load payment methods
      await loadPaymentMethods();
      
      // 📊 Load available plans
      await loadAvailablePlans();
      
      // 🔍 Compare features
      comparePlanFeatures();
      
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert('Initialization Error', 'Failed to load plan data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 📋 Load User's Current Plan
  const loadUserPlan = async () => {
    try {
      if (currentSubscription) {
        setUserPlan(currentSubscription);
        
        // 🔍 Check if there's a plan upgrade in route params
        const targetPlanId = route.params?.planId;
        if (targetPlanId && planConfig[targetPlanId]) {
          setSelectedPlan(planConfig[targetPlanId]);
        }
      }
    } catch (error) {
      console.error('Error loading user plan:', error);
    }
  };

  // 💰 Load Payment Methods
  const loadPaymentMethods = async () => {
    try {
      const methods = await getPaymentMethods();
      setPaymentMethods(methods);
      
      // 🎯 Select default payment method
      if (methods.length > 0) {
        const defaultMethod = methods.find(m => m.isDefault) || methods[0];
        setSelectedPaymentMethod(defaultMethod);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  // 📊 Load Available Plans
  const loadAvailablePlans = async () => {
    try {
      // 🔄 Get available plans from subscription context
      const available = await availablePlans();
      
      // 🎯 Filter out current plan if user has one
      const filteredPlans = available.filter(plan => 
        !userPlan || plan.id !== userPlan.planId
      );
      
      // 📋 Map to our plan configuration
      const mappedPlans = filteredPlans.map(plan => ({
        ...plan,
        ...planConfig[plan.id]
      }));
      
      setPlans(mappedPlans);
    } catch (error) {
      console.error('Error loading available plans:', error);
    }
  };

  // 🔍 Compare Plan Features
  const comparePlanFeatures = () => {
    if (!userPlan) return;
    
    const currentPlan = planConfig[userPlan.planId];
    if (!currentPlan) return;
    
    setCurrentFeatures(currentPlan.features || []);
    
    // 🎯 If a plan is selected, compare features
    if (selectedPlan) {
      const upgradePlan = planConfig[selectedPlan.id];
      if (upgradePlan) {
        setUpgradeFeatures(upgradePlan.features || []);
      }
    }
  };

  // 🎭 Animate Component Entrance
  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
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

  // 🔄 Refresh Data
  const onRefresh = async () => {
    setRefreshing(true);
    await initializeComponent();
    setRefreshing(false);
  };

  // 🎯 Handle Plan Selection
  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setUpgradeFeatures(plan.features || []);
    
    // 📊 Track upgrade attempt
    trackUpgradeAttempt(plan.id, userPlan?.planId);
    
    // 🎭 Animate selection
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    });
  };

  // 💰 Calculate Upgrade Price
  const calculateUpgradePrice = () => {
    if (!selectedPlan || !userPlan) return selectedPlan?.price || 0;
    
    try {
      // 🔄 Calculate prorated amount
      const proratedAmount = calculateProratedAmount(
        userPlan.planId,
        selectedPlan.id,
        userPlan.startDate
      );
      
      return proratedAmount || selectedPlan.price;
    } catch (error) {
      console.error('Error calculating upgrade price:', error);
      return selectedPlan.price;
    }
  };

  // 🎯 Handle Upgrade Confirmation
  const confirmUpgrade = () => {
    if (!selectedPlan) {
      Alert.alert('No Plan Selected', 'Please select a plan to upgrade to.');
      return;
    }
    
    if (!selectedPaymentMethod) {
      Alert.alert('No Payment Method', 'Please select a payment method.');
      return;
    }
    
    setShowConfirmation(true);
  };

  // 🔄 Process Upgrade Payment
  const processUpgrade = async () => {
    try {
      setIsProcessing(true);
      setShowConfirmation(false);
      
      // 📊 Track upgrade start
      trackUpgradeAttempt(selectedPlan.id, userPlan?.planId);
      
      // 💰 Calculate final amount
      const finalAmount = calculateUpgradePrice();
      
      // 🔄 Prepare payment data
      const paymentData = {
        amount: finalAmount,
        currency: selectedPlan.currency,
        planId: selectedPlan.id,
        currentPlanId: userPlan?.planId,
        paymentMethodId: selectedPaymentMethod.id,
        installmentOption: 'full', // Default to full payment
        metadata: {
          upgradeType: userPlan ? 'upgrade' : 'new',
          userId: user?.id,
          timestamp: new Date().toISOString()
        }
      };
      
      // 💸 Process payment
      const paymentResult = await processSubscriptionPayment(paymentData);
      
      if (paymentResult.success) {
        // 🔄 Update subscription
        const upgradeResult = await upgradeSubscription(
          selectedPlan.id,
          paymentResult.transactionId
        );
        
        if (upgradeResult.success) {
          // 🎉 Upgrade successful
          trackUpgradeSuccess(selectedPlan.id, userPlan?.planId, finalAmount);
          
          // 📧 Send notification
          await NotificationService.sendPlanUpgradeNotification(
            user?.email,
            userPlan?.planId,
            selectedPlan.id,
            finalAmount
          );
          
          // 🔄 Refresh user data
          await refreshUserData();
          
          // 🎯 Show success message
          Alert.alert(
            'Upgrade Successful!',
            `Your plan has been upgraded to ${selectedPlan.name}. You now have access to all premium features.`,
            [
              {
                text: 'Explore Features',
                onPress: () => navigation.navigate('Dashboard')
              },
              {
                text: 'Continue',
                style: 'default'
              }
            ]
          );
          
          // 🧭 Navigate to dashboard
          navigation.navigate('Dashboard');
          
        } else {
          throw new Error('Subscription update failed');
        }
      } else {
        throw new Error('Payment processing failed');
      }
      
    } catch (error) {
      console.error('Upgrade processing error:', error);
      
      Alert.alert(
        'Upgrade Failed',
        error.message || 'Failed to process upgrade. Please try again.',
        [
          {
            text: 'Try Again',
            onPress: () => setShowConfirmation(true)
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // 💰 Open Payment Methods
  const openPaymentMethods = () => {
    setShowPaymentMethods(true);
  };

  // 🔄 Render Plan Card
  const renderPlanCard = (plan) => {
    const isSelected = selectedPlan?.id === plan.id;
    const isCurrent = userPlan?.planId === plan.id;
    
    return (
      <Animated.View
        style={[
          styles.planCardContainer,
          {
            transform: [{ scale: isSelected ? scaleAnim : 1 }]
          }
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handlePlanSelect(plan)}
          disabled={isCurrent || isProcessing}
        >
          <LinearGradient
            colors={plan.colorScheme}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.planCard,
              isSelected && styles.selectedPlanCard,
              isCurrent && styles.currentPlanCard
            ]}
          >
            {isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current Plan</Text>
              </View>
            )}
            
            {plan.popular && (
              <View style={styles.popularBadge}>
                <Icon name="crown" size={16} color="#FFD700" />
                <Text style={styles.popularBadgeText}>Most Popular</Text>
              </View>
            )}
            
            <View style={styles.planHeader}>
              <Icon name={plan.icon} size={32} color="#FFFFFF" />
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planDescription}>{plan.description}</Text>
            </View>
            
            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                {plan.price.toLocaleString()} {plan.currency}
              </Text>
              {plan.originalPrice && (
                <Text style={styles.originalPrice}>
                  {plan.originalPrice.toLocaleString()} {plan.currency}
                </Text>
              )}
              {plan.savings > 0 && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>
                    Save {plan.savings.toLocaleString()} {plan.currency}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={styles.featuresContainer}>
              {plan.features.slice(0, 4).map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Icon name="check-circle" size={16} color="#4CAF50" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
              
              {plan.features.length > 4 && (
                <Text style={styles.moreFeaturesText}>
                  +{plan.features.length - 4} more features
                </Text>
              )}
            </View>
            
            <View style={styles.actionContainer}>
              {isCurrent ? (
                <View style={styles.currentPlanButton}>
                  <Text style={styles.currentPlanButtonText}>Current Plan</Text>
                </View>
              ) : (
                <Button
                  title={isSelected ? 'Selected' : 'Select Plan'}
                  variant={isSelected ? 'primary' : 'outline'}
                  size="medium"
                  onPress={() => handlePlanSelect(plan)}
                  icon={isSelected ? 'check-circle' : 'arrow-right'}
                  disabled={isProcessing}
                />
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // 💰 Render Payment Method
  const renderPaymentMethod = (method) => {
    const isSelected = selectedPaymentMethod?.id === method.id;
    
    return (
      <TouchableOpacity
        key={method.id}
        style={[
          styles.paymentMethodItem,
          isSelected && styles.selectedPaymentMethod
        ]}
        onPress={() => setSelectedPaymentMethod(method)}
      >
        <View style={styles.paymentMethodIcon}>
          <Icon 
            name={ 
              method.type === 'telebirr' ? 'cellphone' :
              method.type === 'cbe_birr' ? 'bank' :
              method.type === 'card' ? 'credit-card' : 'wallet'
            } 
            size={24} 
            color={isSelected ? '#2196F3' : '#666'} 
          />
        </View>
        <View style={styles.paymentMethodInfo}>
          <Text style={styles.paymentMethodName}>{method.name}</Text>
          <Text style={styles.paymentMethodDescription}>
            {method.description || `Pay with ${method.type}`}
          </Text>
          {method.isDefault && (
            <Badge text="Default" variant="success" size="small" />
          )}
        </View>
        {isSelected && (
          <Icon name="check-circle" size={24} color="#4CAF50" />
        )}
      </TouchableOpacity>
    );
  };

  // 📊 Render Feature Comparison
  const renderFeatureComparison = () => {
    if (!selectedPlan || !userPlan) return null;
    
    const currentPlan = planConfig[userPlan.planId];
    if (!currentPlan) return null;
    
    const allFeatures = [...new Set([
      ...currentPlan.features,
      ...selectedPlan.features
    ])];
    
    return (
      <View style={styles.featureComparisonContainer}>
        <Text style={styles.sectionTitle}>Feature Comparison</Text>
        
        <View style={styles.comparisonHeader}>
          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonColumnTitle}>Current Plan</Text>
            <Text style={styles.comparisonPlanName}>{currentPlan.name}</Text>
          </View>
          <View style={styles.comparisonColumn}>
            <Text style={styles.comparisonColumnTitle}>Upgrade To</Text>
            <Text style={styles.comparisonPlanName}>{selectedPlan.name}</Text>
          </View>
        </View>
        
        <ScrollView style={styles.featuresList}>
          {allFeatures.map((feature, index) => {
            const hasCurrent = currentPlan.features.includes(feature);
            const hasUpgrade = selectedPlan.features.includes(feature);
            
            return (
              <View key={index} style={styles.featureRow}>
                <View style={styles.featureCheckColumn}>
                  {hasCurrent ? (
                    <Icon name="check-circle" size={20} color="#4CAF50" />
                  ) : (
                    <Icon name="close-circle" size={20} color="#F44336" />
                  )}
                </View>
                <Text style={styles.featureText}>{feature}</Text>
                <View style={styles.featureCheckColumn}>
                  {hasUpgrade ? (
                    <Icon name="check-circle" size={20} color="#4CAF50" />
                  ) : (
                    <Icon name="close-circle" size={20} color="#F44336" />
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // 🔄 Render Loading State
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingOverlay 
          message="Loading Plan Options..."
          showProgress={true}
        />
      </SafeAreaView>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#2196F3', '#4CAF50']}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* 🎯 Header Section */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-left" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Upgrade Your Plan</Text>
              <View style={styles.headerRight} />
            </View>

            {/* 📊 Current Plan Section */}
            {userPlan && (
              <View style={styles.currentPlanSection}>
                <Text style={styles.sectionTitle}>Your Current Plan</Text>
                <LinearGradient
                  colors={['#E3F2FD', '#F1F8E9']}
                  style={styles.currentPlanCard}
                >
                  <View style={styles.currentPlanHeader}>
                    <Icon name="check-circle" size={24} color="#4CAF50" />
                    <Text style={styles.currentPlanName}>
                      {planConfig[userPlan.planId]?.name || userPlan.planId}
                    </Text>
                  </View>
                  <Text style={styles.currentPlanDescription}>
                    {planConfig[userPlan.planId]?.description || 'Your current subscription plan'}
                  </Text>
                  <View style={styles.currentPlanDetails}>
                    <Text style={styles.currentPlanDetail}>
                      Valid until: {new Date(userPlan.endDate).toLocaleDateString()}
                    </Text>
                    <Text style={styles.currentPlanDetail}>
                      Status: <Text style={styles.activeStatus}>Active</Text>
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* 📋 Available Plans Section */}
            <View style={styles.plansSection}>
              <Text style={styles.sectionTitle}>Available Plans</Text>
              <Text style={styles.sectionDescription}>
                Choose the perfect plan for your learning journey
              </Text>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.plansScrollView}
              >
                {Object.values(planConfig).map(plan => (
                  <View key={plan.id} style={styles.planWrapper}>
                    {renderPlanCard(plan)}
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* 🔍 Feature Comparison */}
            {selectedPlan && renderFeatureComparison()}

            {/* 💰 Payment Section */}
            {selectedPlan && (
              <View style={styles.paymentSection}>
                <Text style={styles.sectionTitle}>Payment Details</Text>
                
                {/* 💳 Payment Method Selection */}
                <TouchableOpacity
                  style={styles.paymentMethodSelector}
                  onPress={openPaymentMethods}
                >
                  <View style={styles.paymentMethodPreview}>
                    <Icon 
                      name={ 
                        selectedPaymentMethod?.type === 'telebirr' ? 'cellphone' :
                        selectedPaymentMethod?.type === 'cbe_birr' ? 'bank' :
                        selectedPaymentMethod?.type === 'card' ? 'credit-card' : 'wallet'
                      } 
                      size={24} 
                      color="#2196F3" 
                    />
                    <View style={styles.paymentMethodPreviewInfo}>
                      <Text style={styles.paymentMethodPreviewName}>
                        {selectedPaymentMethod?.name || 'Select Payment Method'}
                      </Text>
                      <Text style={styles.paymentMethodPreviewDescription}>
                        {selectedPaymentMethod?.description || 'Choose how you want to pay'}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={24} color="#999" />
                  </View>
                </TouchableOpacity>

                {/* 💵 Price Summary */}
                <View style={styles.priceSummary}>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceLabel}>Plan Price:</Text>
                    <Text style={styles.priceValue}>
                      {selectedPlan.price.toLocaleString()} {selectedPlan.currency}
                    </Text>
                  </View>
                  
                  {userPlan && (
                    <View style={styles.priceRow}>
                      <Text style={styles.priceLabel}>Prorated Adjustment:</Text>
                      <Text style={[styles.priceValue, styles.discountValue]}>
                        -{(selectedPlan.price - calculateUpgradePrice()).toLocaleString()} {selectedPlan.currency}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.divider} />
                  
                  <View style={styles.priceRow}>
                    <Text style={styles.totalPriceLabel}>Total Amount:</Text>
                    <Text style={styles.totalPriceValue}>
                      {calculateUpgradePrice().toLocaleString()} {selectedPlan.currency}
                    </Text>
                  </View>
                </View>

                {/* ⚡ Upgrade Button */}
                <Button
                  title={`Upgrade to ${selectedPlan.name}`}
                  variant="primary"
                  size="large"
                  icon="arrow-up-circle"
                  onPress={confirmUpgrade}
                  loading={isProcessing}
                  disabled={!selectedPaymentMethod || isProcessing}
                  style={styles.upgradeButton}
                />

                {/* 🔒 Security Notice */}
                <View style={styles.securityNotice}>
                  <Icon name="shield-check" size={16} color="#4CAF50" />
                  <Text style={styles.securityText}>
                    Your payment is secured with bank-level encryption
                  </Text>
                </View>
              </View>
            )}

            {/* 📞 Support Section */}
            <View style={styles.supportSection}>
              <Text style={styles.supportTitle}>Need Help Choosing?</Text>
              <Text style={styles.supportDescription}>
                Our education advisors are here to help you select the perfect plan.
              </Text>
              <Button
                title="Contact Support"
                variant="outline"
                size="medium"
                icon="headset"
                onPress={() => Linking.openURL('tel:+251123456789')}
              />
            </View>
          </ScrollView>
        </Animated.View>

        {/* 💳 Payment Methods Modal */}
        <ConfirmationModal
          visible={showPaymentMethods}
          title="Select Payment Method"
          onClose={() => setShowPaymentMethods(false)}
          onConfirm={() => setShowPaymentMethods(false)}
          confirmText="Select"
          showCancel={false}
        >
          <ScrollView style={styles.paymentMethodsList}>
            {paymentMethods.map(renderPaymentMethod)}
          </ScrollView>
          
          <TouchableOpacity
            style={styles.addPaymentMethodButton}
            onPress={() => navigation.navigate('PaymentMethods')}
          >
            <Icon name="plus-circle" size={20} color="#2196F3" />
            <Text style={styles.addPaymentMethodText}>Add New Payment Method</Text>
          </TouchableOpacity>
        </ConfirmationModal>

        {/* 🎯 Upgrade Confirmation Modal */}
        <ConfirmationModal
          visible={showConfirmation}
          title="Confirm Plan Upgrade"
          message={`Are you sure you want to upgrade to ${selectedPlan?.name}?`}
          onClose={() => setShowConfirmation(false)}
          onConfirm={processUpgrade}
          confirmText="Confirm Upgrade"
          cancelText="Cancel"
          confirmLoading={isProcessing}
          type="warning"
        >
          <View style={styles.confirmationDetails}>
            <View style={styles.confirmationDetailRow}>
              <Text style={styles.confirmationDetailLabel}>Plan:</Text>
              <Text style={styles.confirmationDetailValue}>{selectedPlan?.name}</Text>
            </View>
            
            <View style={styles.confirmationDetailRow}>
              <Text style={styles.confirmationDetailLabel}>Amount:</Text>
              <Text style={styles.confirmationDetailValue}>
                {calculateUpgradePrice().toLocaleString()} {selectedPlan?.currency}
              </Text>
            </View>
            
            <View style={styles.confirmationDetailRow}>
              <Text style={styles.confirmationDetailLabel}>Payment Method:</Text>
              <Text style={styles.confirmationDetailValue}>
                {selectedPaymentMethod?.name}
              </Text>
            </View>
          </View>
        </ConfirmationModal>

        {/* ⚡ Processing Overlay */}
        {isProcessing && (
          <BlurView intensity={90} style={styles.processingOverlay}>
            <View style={styles.processingContent}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.processingText}>
                Processing your upgrade...
              </Text>
              <Text style={styles.processingSubtext}>
                Please don't close the app
              </Text>
            </View>
          </BlurView>
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  currentPlanSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  currentPlanCard: {
    padding: 20,
    borderRadius: 12,
    marginTop: 12,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPlanName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  currentPlanDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  currentPlanDetails: {
    marginTop: 12,
  },
  currentPlanDetail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  activeStatus: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  plansSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  plansScrollView: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  planWrapper: {
    marginRight: 16,
    width: width * 0.8,
  },
  planCardContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  planCard: {
    padding: 24,
    borderRadius: 16,
  },
  selectedPlanCard: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 8,
  },
  currentPlanCard: {
    opacity: 0.9,
  },
  currentBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  popularBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  price: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  originalPrice: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    textDecorationLine: 'line-through',
    marginTop: 4,
  },
  savingsBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  savingsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
  },
  moreFeaturesText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
    marginTop: 8,
  },
  actionContainer: {
    marginTop: 'auto',
  },
  currentPlanButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  currentPlanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  featureComparisonContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    borderRadius: 12,
    marginHorizontal: 20,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  comparisonColumn: {
    alignItems: 'center',
    flex: 1,
  },
  comparisonColumnTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  comparisonPlanName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  featuresList: {
    maxHeight: 300,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  featureCheckColumn: {
    width: 40,
    alignItems: 'center',
  },
  paymentSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    borderRadius: 12,
    marginHorizontal: 20,
  },
  paymentMethodSelector: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  paymentMethodPreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodPreviewInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodPreviewName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  paymentMethodPreviewDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  priceSummary: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 16,
    color: '#666',
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  discountValue: {
    color: '#4CAF50',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  totalPriceLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  totalPriceValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2196F3',
  },
  upgradeButton: {
    marginTop: 8,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  securityText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  paymentMethodsList: {
    maxHeight: 400,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
  },
  selectedPaymentMethod: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  paymentMethodIcon: {
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: '#666',
  },
  addPaymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginTop: 12,
  },
  addPaymentMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    marginLeft: 8,
  },
  confirmationDetails: {
    marginTop: 16,
  },
  confirmationDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  confirmationDetailLabel: {
    fontSize: 16,
    color: '#666',
  },
  confirmationDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContent: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 8,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  supportSection: {
    padding: 20,
    backgroundColor: '#E3F2FD',
    marginTop: 20,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 40,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1565C0',
    marginBottom: 8,
  },
  supportDescription: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 16,
  },
});

export default PlanUpgrade;