/**
 * 🎯 MOSA FORGE: Enterprise Enrollment Wizard Component
 * 
 * @component EnrollmentWizard
 * @description Multi-step enrollment process with payment integration, expert matching, and quality guarantees
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Multi-step enrollment flow with progress tracking
 * - Real-time payment processing with Telebirr/CBE Birr
 * - Quality-guaranteed expert matching
 * - Duplicate enrollment prevention
 * - Offline capability with sync
 * - Comprehensive error handling and analytics
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
  AppState,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 🏗️ Enterprise Hooks & Context
import { useAuth } from '../../contexts/auth-context';
import { usePayment } from '../../contexts/payment-context';
import { useQuality } from '../../contexts/quality-context';
import { useEnrollment } from '../../contexts/enrollment-context';

// 🏗️ Enterprise Services
import { enrollmentService } from '../../services/enrollment-service';
import { paymentService } from '../../services/payment-service';
import { qualityService } from '../../services/quality-service';
import { analyticsService } from '../../services/analytics-service';

// 🏗️ Enterprise Components
import QualityScore from '../../components/shared/quality-score';
import ProgressBar from '../../components/shared/progress-bar';
import LoadingSpinner from '../../components/shared/loading-spinner';
import ErrorBoundary from '../../components/shared/error-boundary';
import NetworkStatus from '../../components/shared/network-status';

// 🏗️ Enterprise Constants
const ENROLLMENT_STEPS = {
  SKILL_SELECTION: 0,
  BUNDLE_CONFIRMATION: 1,
  PAYMENT_METHOD: 2,
  EXPERT_MATCHING: 3,
  ENROLLMENT_CONFIRMATION: 4,
  MINDSET_START: 5
};

const PAYMENT_METHODS = {
  TELEBIRR: 'telebirr',
  CBE_BIRR: 'cbe_birr',
  INSTALLMENT: 'installment'
};

const BUNDLE_PRICE = 1999;
const REVENUE_SPLIT = {
  mosa: 1000,
  expert: 999
};

/**
 * 🏗️ Enterprise Enrollment Wizard Component
 * @function EnrollmentWizard
 * @returns {React.Component}
 */
const EnrollmentWizard = () => {
  // 🏗️ Refs & State Management
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const appState = useRef(AppState.currentState);
  
  // 🏗️ Context Hooks
  const { user, faydaId, isAuthenticated } = useAuth();
  const { 
    initiatePayment, 
    processPayment, 
    paymentStatus, 
    resetPayment 
  } = usePayment();
  const { 
    getQualifiedExperts, 
    qualityMetrics, 
    validateExpertQuality 
  } = useQuality();
  const { 
    startEnrollment, 
    enrollmentStatus, 
    resetEnrollment 
  } = useEnrollment();

  // 🏗️ Component State
  const [currentStep, setCurrentStep] = useState(ENROLLMENT_STEPS.SKILL_SELECTION);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [selectedBundle, setSelectedBundle] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [matchedExpert, setMatchedExpert] = useState(null);
  const [enrollmentData, setEnrollmentData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // 🏗️ Animation Values
  const progressAnimation = useSharedValue(0);
  const stepAnimation = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  // 🏗️ Analytics & Tracking
  const sessionId = useRef(`enrollment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const startTime = useRef(Date.now());

  /**
   * 🏗️ Initialize Enrollment Analytics
   */
  useEffect(() => {
    analyticsService.track('enrollment_started', {
      sessionId: sessionId.current,
      userId: user?.id,
      faydaId,
      timestamp: new Date().toISOString()
    });

    return () => {
      const duration = Date.now() - startTime.current;
      analyticsService.track('enrollment_session_ended', {
        sessionId: sessionId.current,
        duration,
        completedStep: currentStep,
        success: currentStep === ENROLLMENT_STEPS.MINDSET_START
      });
    };
  }, []);

  /**
   * 🏗️ Handle App State Changes
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - sync data
        handleAppForeground();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  /**
   * 🏗️ Handle Android Back Button
   */
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => backHandler.remove();
  }, [currentStep]);

  /**
   * 🏗️ Update Progress Animation
   */
  useEffect(() => {
    const progress = (currentStep / (Object.keys(ENROLLMENT_STEPS).length - 1)) * 100;
    progressAnimation.value = withSpring(progress, {
      damping: 20,
      stiffness: 90
    });
  }, [currentStep]);

  /**
   * 🏗️ Handle Step Transitions
   */
  useEffect(() => {
    stepAnimation.value = withTiming(currentStep, {
      duration: 400
    });
  }, [currentStep]);

  /**
   * 🏗️ Handle Back Button Press
   */
  const handleBackPress = () => {
    if (currentStep > ENROLLMENT_STEPS.SKILL_SELECTION) {
      goToPreviousStep();
      return true;
    }
    return false;
  };

  /**
   * 🏗️ Handle App Coming to Foreground
   */
  const handleAppForeground = useCallback(async () => {
    // Sync any pending operations
    if (paymentStatus === 'processing') {
      await checkPaymentStatus();
    }
  }, [paymentStatus]);

  /**
   * 🏗️ Navigation Functions
   */
  const goToNextStep = useCallback(() => {
    if (currentStep < ENROLLMENT_STEPS.MINDSET_START) {
      setCurrentStep(prev => prev + 1);
      analyticsService.track('enrollment_step_completed', {
        step: currentStep,
        sessionId: sessionId.current
      });
    }
  }, [currentStep]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > ENROLLMENT_STEPS.SKILL_SELECTION) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  /**
   * 🏗️ Step 1: Skill Selection Handler
   */
  const handleSkillSelection = useCallback(async (skill) => {
    try {
      setLoading(true);
      setError(null);

      // Validate skill availability
      const isAvailable = await enrollmentService.validateSkillAvailability(skill.id);
      
      if (!isAvailable) {
        throw new Error('This skill is currently unavailable for enrollment');
      }

      // Check for duplicate enrollment
      const hasExistingEnrollment = await enrollmentService.checkDuplicateEnrollment(
        user.id,
        skill.id
      );

      if (hasExistingEnrollment) {
        Alert.alert(
          'Duplicate Enrollment',
          'You already have an active enrollment for this skill. Would you like to view your current progress?',
          [
            { text: 'View Progress', onPress: () => navigation.navigate('MyCourses') },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }

      setSelectedSkill(skill);
      setEnrollmentData(prev => ({ ...prev, skillId: skill.id }));
      
      analyticsService.track('skill_selected', {
        skillId: skill.id,
        skillName: skill.name,
        category: skill.category,
        sessionId: sessionId.current
      });

      goToNextStep();
    } catch (error) {
      handleError(error, 'skill_selection');
    } finally {
      setLoading(false);
    }
  }, [user, navigation]);

  /**
   * 🏗️ Step 2: Bundle Confirmation Handler
   */
  const handleBundleConfirmation = useCallback(async () => {
    try {
      setLoading(true);
      
      const bundle = {
        id: `bundle_${selectedSkill.id}_${Date.now()}`,
        skillId: selectedSkill.id,
        price: BUNDLE_PRICE,
        revenueSplit: REVENUE_SPLIT,
        inclusions: [
          '4-month complete training',
          'Mindset foundation phase (FREE)',
          'Quality-guaranteed expert matching',
          'Hands-on practical training',
          'Mosa Enterprise certification',
          'Yachi platform verification',
          'Income generation support'
        ],
        payoutSchedule: [
          { phase: 'START', amount: 333, description: 'Course commencement' },
          { phase: 'MIDPOINT', amount: 333, description: '75% completion' },
          { phase: 'COMPLETION', amount: 333, description: 'Certification' }
        ]
      };

      setSelectedBundle(bundle);
      setEnrollmentData(prev => ({ ...prev, bundle }));

      analyticsService.track('bundle_confirmed', {
        bundleId: bundle.id,
        price: bundle.price,
        skillId: selectedSkill.id,
        sessionId: sessionId.current
      });

      goToNextStep();
    } catch (error) {
      handleError(error, 'bundle_confirmation');
    } finally {
      setLoading(false);
    }
  }, [selectedSkill]);

  /**
   * 🏗️ Step 3: Payment Processing Handler
   */
  const handlePaymentProcessing = useCallback(async (method) => {
    try {
      setLoading(true);
      setPaymentMethod(method);
      setError(null);

      analyticsService.track('payment_initiated', {
        paymentMethod: method,
        amount: BUNDLE_PRICE,
        sessionId: sessionId.current
      });

      // Initialize payment
      const paymentResult = await initiatePayment({
        amount: BUNDLE_PRICE,
        currency: 'ETB',
        method,
        bundleId: selectedBundle.id,
        userId: user.id,
        faydaId,
        metadata: {
          revenueSplit: REVENUE_SPLIT,
          skill: selectedSkill,
          sessionId: sessionId.current
        }
      });

      if (paymentResult.success) {
        setEnrollmentData(prev => ({ 
          ...prev, 
          paymentId: paymentResult.paymentId,
          paymentMethod: method 
        }));

        analyticsService.track('payment_processing', {
          paymentId: paymentResult.paymentId,
          method,
          sessionId: sessionId.current
        });

        goToNextStep();
      } else {
        throw new Error(paymentResult.error || 'Payment initialization failed');
      }
    } catch (error) {
      handleError(error, 'payment_processing');
      
      // Reset payment state on error
      resetPayment();
    } finally {
      setLoading(false);
    }
  }, [selectedBundle, selectedSkill, user, faydaId]);

  /**
   * 🏗️ Step 4: Expert Matching Handler
   */
  const handleExpertMatching = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      analyticsService.track('expert_matching_started', {
        skillId: selectedSkill.id,
        sessionId: sessionId.current
      });

      // Find qualified experts with quality guarantees
      const experts = await getQualifiedExperts({
        skillId: selectedSkill.id,
        qualityThreshold: 4.0,
        maxResults: 5,
        includeMetrics: true
      });

      if (!experts || experts.length === 0) {
        throw new Error('No qualified experts available for this skill at the moment. Please try again later.');
      }

      // Select best matching expert
      const bestExpert = experts[0];
      
      // Validate expert quality
      const qualityValid = await validateExpertQuality(bestExpert.id);
      
      if (!qualityValid) {
        throw new Error('Selected expert does not meet quality requirements');
      }

      setMatchedExpert(bestExpert);
      setEnrollmentData(prev => ({ 
        ...prev, 
        expertId: bestExpert.id,
        expertName: bestExpert.name,
        expertTier: bestExpert.tier,
        expertQualityScore: bestExpert.qualityScore
      }));

      analyticsService.track('expert_matched', {
        expertId: bestExpert.id,
        expertTier: bestExpert.tier,
        qualityScore: bestExpert.qualityScore,
        skillId: selectedSkill.id,
        sessionId: sessionId.current
      });

      goToNextStep();
    } catch (error) {
      handleError(error, 'expert_matching');
    } finally {
      setLoading(false);
    }
  }, [selectedSkill]);

  /**
   * 🏗️ Step 5: Final Enrollment Confirmation
   */
  const handleEnrollmentConfirmation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      analyticsService.track('enrollment_confirmation_started', {
        sessionId: sessionId.current,
        enrollmentData: {
          skillId: selectedSkill.id,
          expertId: matchedExpert.id,
          paymentId: enrollmentData.paymentId
        }
      });

      // Start the enrollment process
      const enrollmentResult = await startEnrollment({
        studentId: user.id,
        skillId: selectedSkill.id,
        expertId: matchedExpert.id,
        paymentId: enrollmentData.paymentId,
        bundleId: selectedBundle.id,
        traceId: sessionId.current,
        metadata: {
          faydaId,
          revenueSplit: REVENUE_SPLIT,
          qualityScore: matchedExpert.qualityScore,
          expertTier: matchedExpert.tier
        }
      });

      if (enrollmentResult.success) {
        analyticsService.track('enrollment_completed', {
          enrollmentId: enrollmentResult.enrollmentId,
          sessionId: sessionId.current,
          duration: Date.now() - startTime.current
        });

        goToNextStep();
      } else {
        throw new Error(enrollmentResult.error || 'Enrollment failed');
      }
    } catch (error) {
      handleError(error, 'enrollment_confirmation');
    } finally {
      setLoading(false);
    }
  }, [selectedSkill, matchedExpert, enrollmentData, user, selectedBundle]);

  /**
   * 🏗️ Comprehensive Error Handler
   */
  const handleError = useCallback((error, context) => {
    console.error(`Enrollment Error [${context}]:`, error);
    
    setError({
      message: error.message,
      code: error.code,
      context,
      timestamp: new Date().toISOString()
    });

    analyticsService.track('enrollment_error', {
      context,
      error: error.message,
      code: error.code,
      sessionId: sessionId.current,
      retryCount,
      step: currentStep
    });

    // Show user-friendly error message
    let userMessage = error.message;
    
    if (error.code === 'NETWORK_ERROR') {
      userMessage = 'Network connection issue. Please check your internet and try again.';
    } else if (error.code === 'PAYMENT_FAILED') {
      userMessage = 'Payment processing failed. Please try a different payment method.';
    } else if (error.code === 'EXPERT_UNAVAILABLE') {
      userMessage = 'No qualified experts available at the moment. Please try again later.';
    }

    Alert.alert(
      'Enrollment Issue',
      userMessage,
      [
        { 
          text: 'Try Again', 
          onPress: () => {
            setRetryCount(prev => prev + 1);
            setError(null);
          } 
        },
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => navigation.goBack()
        }
      ]
    );
  }, [currentStep, retryCount, navigation]);

  /**
   * 🏗️ Check Payment Status
   */
  const checkPaymentStatus = useCallback(async () => {
    try {
      if (enrollmentData.paymentId) {
        const status = await paymentService.getPaymentStatus(enrollmentData.paymentId);
        
        if (status === 'completed') {
          // Payment completed, proceed to next step
          goToNextStep();
        } else if (status === 'failed') {
          throw new Error('Payment failed. Please try again.');
        }
      }
    } catch (error) {
      handleError(error, 'payment_status_check');
    }
  }, [enrollmentData.paymentId]);

  /**
   * 🏗️ Animated Button Style
   */
  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }]
    };
  });

  /**
   * 🏗️ Handle Button Press Animation
   */
  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.95);
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1);
  };

  /**
   * 🏗️ Render Current Step Component
   */
  const renderCurrentStep = () => {
    const stepProps = {
      onNext: goToNextStep,
      onBack: goToPreviousStep,
      onError: handleError,
      enrollmentData,
      setEnrollmentData,
      loading,
      error
    };

    switch (currentStep) {
      case ENROLLMENT_STEPS.SKILL_SELECTION:
        return (
          <SkillSelectionStep
            {...stepProps}
            onSkillSelect={handleSkillSelection}
            selectedSkill={selectedSkill}
          />
        );
      
      case ENROLLMENT_STEPS.BUNDLE_CONFIRMATION:
        return (
          <BundleConfirmationStep
            {...stepProps}
            selectedSkill={selectedSkill}
            bundle={selectedBundle}
            onBundleConfirm={handleBundleConfirmation}
          />
        );
      
      case ENROLLMENT_STEPS.PAYMENT_METHOD:
        return (
          <PaymentMethodStep
            {...stepProps}
            onPaymentMethodSelect={handlePaymentProcessing}
            selectedMethod={paymentMethod}
          />
        );
      
      case ENROLLMENT_STEPS.EXPERT_MATCHING:
        return (
          <ExpertMatchingStep
            {...stepProps}
            onExpertMatch={handleExpertMatching}
            selectedSkill={selectedSkill}
          />
        );
      
      case ENROLLMENT_STEPS.ENROLLMENT_CONFIRMATION:
        return (
          <EnrollmentConfirmationStep
            {...stepProps}
            onEnrollmentConfirm={handleEnrollmentConfirmation}
            selectedSkill={selectedSkill}
            matchedExpert={matchedExpert}
            bundle={selectedBundle}
          />
        );
      
      case ENROLLMENT_STEPS.MINDSET_START:
        return (
          <MindsetStartStep
            {...stepProps}
            enrollmentData={enrollmentData}
            onComplete={() => navigation.navigate('MindsetPhase')}
          />
        );
      
      default:
        return null;
    }
  };

  /**
   * 🏗️ Main Render
   */
  return (
    <ErrorBoundary>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* 🏗️ Network Status Indicator */}
        <NetworkStatus
          onStatusChange={setIsOnline}
          showAlert={true}
        />

        {/* 🏗️ Header with Progress */}
        <BlurView intensity={80} tint="light" style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={goToPreviousStep}
              style={styles.backButton}
              disabled={currentStep === ENROLLMENT_STEPS.SKILL_SELECTION || loading}
            >
              <Text style={[
                styles.backButtonText,
                (currentStep === ENROLLMENT_STEPS.SKILL_SELECTION || loading) && 
                styles.backButtonDisabled
              ]}>
                ← Back
              </Text>
            </TouchableOpacity>

            <View style={styles.progressContainer}>
              <Text style={styles.stepText}>
                Step {currentStep + 1} of {Object.keys(ENROLLMENT_STEPS).length}
              </Text>
              <ProgressBar
                progress={progressAnimation}
                height={8}
                backgroundColor="#E5E7EB"
                progressColor="#10B981"
                style={styles.progressBar}
              />
            </View>

            <View style={styles.placeholder} />
          </View>
        </BlurView>

        {/* 🏗️ Main Content */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {renderCurrentStep()}
        </ScrollView>

        {/* 🏗️ Loading Overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <BlurView intensity={90} style={styles.loadingBlur}>
              <LoadingSpinner
                size="large"
                color="#10B981"
                message="Processing..."
              />
            </BlurView>
          </View>
        )}
      </View>
    </ErrorBoundary>
  );
};

/**
 * 🏗️ Step 1: Skill Selection Component
 */
const SkillSelectionStep = ({ 
  onSkillSelect, 
  selectedSkill, 
  onNext, 
  onError,
  loading 
}) => {
  const [skills, setSkills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const skillsData = await enrollmentService.getAvailableSkills();
      const categoriesData = [...new Set(skillsData.map(skill => skill.category))];
      
      setSkills(skillsData);
      setCategories(['all', ...categoriesData]);
    } catch (error) {
      onError(error, 'load_skills');
    }
  };

  const filteredSkills = selectedCategory === 'all' 
    ? skills 
    : skills.filter(skill => skill.category === selectedCategory);

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choose Your Skill Path</Text>
      <Text style={styles.stepSubtitle}>
        Select from 40+ enterprise skills. Transform your future in 4 months.
      </Text>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonSelected
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryText,
              selectedCategory === category && styles.categoryTextSelected
            ]}>
              {category === 'all' ? 'All Skills' : category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Skills Grid */}
      <View style={styles.skillsGrid}>
        {filteredSkills.map(skill => (
          <TouchableOpacity
            key={skill.id}
            style={[
              styles.skillCard,
              selectedSkill?.id === skill.id && styles.skillCardSelected
            ]}
            onPress={() => onSkillSelect(skill)}
            disabled={loading}
          >
            <LinearGradient
              colors={selectedSkill?.id === skill.id 
                ? ['#10B981', '#059669'] 
                : ['#F8FAFC', '#F1F5F9']
              }
              style={styles.skillGradient}
            >
              <Text style={[
                styles.skillName,
                selectedSkill?.id === skill.id && styles.skillNameSelected
              ]}>
                {skill.name}
              </Text>
              <Text style={styles.skillCategory}>
                {skill.category}
              </Text>
              <Text style={styles.skillDescription}>
                {skill.description}
              </Text>
              
              {/* Skill Metrics */}
              <View style={styles.skillMetrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>4</Text>
                  <Text style={styles.metricLabel}>Months</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>70%+</Text>
                  <Text style={styles.metricLabel}>Completion</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricValue}>₵{skill.earningPotential}</Text>
                  <Text style={styles.metricLabel}>Potential</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* Continue Button */}
      {selectedSkill && (
        <Animated.View style={[styles.continueButtonContainer, animatedButtonStyle]}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={onNext}
            onPressIn={handleButtonPressIn}
            onPressOut={handleButtonPressOut}
            disabled={loading}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.continueButtonGradient}
            >
              <Text style={styles.continueButtonText}>
                Continue with {selectedSkill.name}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

/**
 * 🏗️ Step 2: Bundle Confirmation Component
 */
const BundleConfirmationStep = ({ 
  selectedSkill, 
  bundle, 
  onBundleConfirm, 
  onBack 
}) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Complete Training Bundle</Text>
      <Text style={styles.stepSubtitle}>
        Everything you need to master {selectedSkill?.name} and start earning
      </Text>

      <View style={styles.bundleCard}>
        <LinearGradient
          colors={['#6366F1', '#4F46E5']}
          style={styles.bundleGradient}
        >
          <Text style={styles.bundlePrice}>1,999 ETB</Text>
          <Text style={styles.bundleDescription}>One-time payment</Text>
          
          <View style={styles.revenueSplit}>
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Platform Fee</Text>
              <Text style={styles.splitValue}>1,000 ETB</Text>
            </View>
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Expert Earnings</Text>
              <Text style={styles.splitValue}>999 ETB</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.inclusionsContainer}>
          <Text style={styles.inclusionsTitle}>What's Included:</Text>
          {bundle?.inclusions.map((inclusion, index) => (
            <View key={index} style={styles.inclusionItem}>
              <Text style={styles.inclusionIcon}>✓</Text>
              <Text style={styles.inclusionText}>{inclusion}</Text>
            </View>
          ))}
        </View>

        <View style={styles.payoutSchedule}>
          <Text style={styles.payoutTitle}>Expert Payout Schedule:</Text>
          {bundle?.payoutSchedule.map((payout, index) => (
            <View key={index} style={styles.payoutItem}>
              <Text style={styles.payoutPhase}>{payout.phase}</Text>
              <Text style={styles.payoutAmount}>{payout.amount} ETB</Text>
              <Text style={styles.payoutDescription}>{payout.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.confirmButton} onPress={onBundleConfirm}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.confirmButtonGradient}
          >
            <Text style={styles.confirmButtonText}>
              Confirm & Continue to Payment
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * 🏗️ Step 3: Payment Method Component
 */
const PaymentMethodStep = ({ 
  onPaymentMethodSelect, 
  selectedMethod, 
  onBack 
}) => {
  const paymentMethods = [
    {
      id: PAYMENT_METHODS.TELEBIRR,
      name: 'Telebirr',
      icon: '📱',
      description: 'Instant payment via Telebirr',
      fee: 0
    },
    {
      id: PAYMENT_METHODS.CBE_BIRR,
      name: 'CBE Birr',
      icon: '🏦',
      description: 'Secure payment via Commercial Bank',
      fee: 0
    },
    {
      id: PAYMENT_METHODS.INSTALLMENT,
      name: 'Installment Plan',
      icon: '💳',
      description: 'Pay in 3 monthly installments',
      fee: 100,
      installments: [
        { amount: 666, due: 'Today' },
        { amount: 666, due: '30 days' },
        { amount: 667, due: '60 days' }
      ]
    }
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Payment Method</Text>
      <Text style={styles.stepSubtitle}>
        Choose how you'd like to pay your 1,999 ETB training fee
      </Text>

      <View style={styles.paymentMethods}>
        {paymentMethods.map(method => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentMethod,
              selectedMethod === method.id && styles.paymentMethodSelected
            ]}
            onPress={() => onPaymentMethodSelect(method.id)}
          >
            <View style={styles.paymentHeader}>
              <Text style={styles.paymentIcon}>{method.icon}</Text>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentName}>{method.name}</Text>
                <Text style={styles.paymentDescription}>{method.description}</Text>
              </View>
              {selectedMethod === method.id && (
                <View style={styles.selectedIndicator}>
                  <Text style={styles.selectedIcon}>✓</Text>
                </View>
              )}
            </View>

            {method.installments && (
              <View style={styles.installmentContainer}>
                <Text style={styles.installmentTitle}>Installment Plan:</Text>
                {method.installments.map((installment, index) => (
                  <View key={index} style={styles.installmentItem}>
                    <Text style={styles.installmentAmount}>{installment.amount} ETB</Text>
                    <Text style={styles.installmentDue}>Due {installment.due}</Text>
                  </View>
                ))}
              </View>
            )}

            {method.fee > 0 && (
              <Text style={styles.processingFee}>
                +{method.fee} ETB processing fee
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        {selectedMethod && (
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={() => onPaymentMethodSelect(selectedMethod)}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.confirmButtonGradient}
            >
              <Text style={styles.confirmButtonText}>
                Continue with {selectedMethod}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

/**
 * 🏗️ Step 4: Expert Matching Component
 */
const ExpertMatchingStep = ({ 
  onExpertMatch, 
  selectedSkill, 
  onBack,
  loading 
}) => {
  const [matchingProgress, setMatchingProgress] = useState(0);

  useEffect(() => {
    // Simulate matching progress
    const interval = setInterval(() => {
      setMatchingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (matchingProgress >= 100) {
      // Auto-proceed when matching is complete
      onExpertMatch();
    }
  }, [matchingProgress]);

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Finding Your Expert Guide</Text>
      <Text style={styles.stepSubtitle}>
        Matching you with a quality-verified expert for {selectedSkill?.name}
      </Text>

      <View style={styles.matchingContainer}>
        <View style={styles.matchingAnimation}>
          <LoadingSpinner
            size="large"
            color="#10B981"
            message={`Finding experts... ${matchingProgress}%`}
          />
        </View>

        <View style={styles.matchingDetails}>
          <Text style={styles.matchingTitle}>Quality Guarantee Process:</Text>
          
          <View style={styles.qualityStep}>
            <Text style={styles.qualityStepIcon}>🔍</Text>
            <View style={styles.qualityStepContent}>
              <Text style={styles.qualityStepTitle}>Screening Experts</Text>
              <Text style={styles.qualityStepDescription}>
                Verifying quality scores above 4.0
              </Text>
            </View>
          </View>

          <View style={styles.qualityStep}>
            <Text style={styles.qualityStepIcon}>📊</Text>
            <View style={styles.qualityStepContent}>
              <Text style={styles.qualityStepTitle}>Checking Performance</Text>
              <Text style={styles.qualityStepDescription}>
                Validating 70%+ completion rates
              </Text>
            </View>
          </View>

          <View style={styles.qualityStep}>
            <Text style={styles.qualityStepIcon}>🎯</Text>
            <View style={styles.qualityStepContent}>
              <Text style={styles.qualityStepTitle}>Matching Algorithm</Text>
              <Text style={styles.qualityStepDescription}>
                Finding the best expert for your learning style
              </Text>
            </View>
          </View>

          <View style={styles.qualityStep}>
            <Text style={styles.qualityStepIcon}>🛡️</Text>
            <View style={styles.qualityStepContent}>
              <Text style={styles.qualityStepTitle}>Quality Lock</Text>
              <Text style={styles.qualityStepDescription}>
                Ensuring expert meets all quality standards
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.matchingNote}>
          This process ensures you get the best possible expert for your journey
        </Text>
      </View>
    </View>
  );
};

/**
 * 🏗️ Step 5: Enrollment Confirmation Component
 */
const EnrollmentConfirmationStep = ({
  onEnrollmentConfirm,
  selectedSkill,
  matchedExpert,
  bundle,
  onBack,
  loading
}) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Confirm Your Enrollment</Text>
      <Text style={styles.stepSubtitle}>
        Review your details before starting your journey
      </Text>

      <View style={styles.confirmationCard}>
        {/* Skill Details */}
        <View style={styles.confirmationSection}>
          <Text style={styles.sectionTitle}>Skill & Training</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Selected Skill:</Text>
            <Text style={styles.detailValue}>{selectedSkill?.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Duration:</Text>
            <Text style={styles.detailValue}>4 Months</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Training Model:</Text>
            <Text style={styles.detailValue}>Theory + Hands-on</Text>
          </View>
        </View>

        {/* Expert Details */}
        <View style={styles.confirmationSection}>
          <Text style={styles.sectionTitle}>Your Expert Guide</Text>
          <View style={styles.expertCard}>
            <View style={styles.expertHeader}>
              <Text style={styles.expertName}>{matchedExpert?.name}</Text>
              <QualityScore
                score={matchedExpert?.qualityScore}
                tier={matchedExpert?.tier}
                size="small"
              />
            </View>
            <Text style={styles.expertTier}>{matchedExpert?.tier} Tier Expert</Text>
            <Text style={styles.expertBio}>
              {matchedExpert?.bio || 'Experienced professional with proven track record'}
            </Text>
            <View style={styles.expertMetrics}>
              <View style={styles.expertMetric}>
                <Text style={styles.metricValue}>{matchedExpert?.completionRate}%</Text>
                <Text style={styles.metricLabel}>Completion</Text>
              </View>
              <View style={styles.expertMetric}>
                <Text style={styles.metricValue}>{matchedExpert?.studentCount}</Text>
                <Text style={styles.metricLabel}>Students</Text>
              </View>
              <View style={styles.expertMetric}>
                <Text style={styles.metricValue}>{matchedExpert?.rating}</Text>
                <Text style={styles.metricLabel}>Rating</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.confirmationSection}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Bundle Price:</Text>
            <Text style={styles.detailValue}>1,999 ETB</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Platform Fee:</Text>
            <Text style={styles.detailValue}>1,000 ETB</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Expert Earnings:</Text>
            <Text style={styles.detailValue}>999 ETB</Text>
          </View>
          <View style={[styles.detailRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Paid:</Text>
            <Text style={styles.totalValue}>1,999 ETB</Text>
          </View>
        </View>

        {/* Quality Guarantee */}
        <View style={styles.qualityGuarantee}>
          <Text style={styles.guaranteeTitle}>🛡️ Quality Guarantee</Text>
          <Text style={styles.guaranteeText}>
            If your expert's quality drops below 4.0, we'll automatically match you with a new quality-verified expert at no extra cost.
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.confirmEnrollmentButton}
          onPress={onEnrollmentConfirm}
          disabled={loading}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.confirmEnrollmentGradient}
          >
            <Text style={styles.confirmEnrollmentText}>
              {loading ? 'Processing...' : 'Confirm Enrollment'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * 🏗️ Step 6: Mindset Phase Start Component
 */
const MindsetStartStep = ({ enrollmentData, onComplete }) => {
  useEffect(() => {
    // Auto-navigate after 3 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <View style={styles.successContainer}>
      <LinearGradient
        colors={['#10B981', '#059669']}
        style={styles.successGradient}
      >
        <View style={styles.successContent}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Enrollment Complete!</Text>
          <Text style={styles.successMessage}>
            Welcome to your {enrollmentData.skill?.name} journey
          </Text>
          
          <View style={styles.nextSteps}>
            <Text style={styles.nextStepsTitle}>What's Next:</Text>
            <View style={styles.nextStep}>
              <Text style={styles.nextStepIcon}>🧠</Text>
              <Text style={styles.nextStepText}>
                Start your FREE 4-week Mindset Foundation
              </Text>
            </View>
            <View style={styles.nextStep}>
              <Text style={styles.nextStepIcon}>📚</Text>
              <Text style={styles.nextStepText}>
                Begin interactive theory exercises
              </Text>
            </View>
            <View style={styles.nextStep}>
              <Text style={styles.nextStepIcon}>👨‍🏫</Text>
              <Text style={styles.nextStepText}>
                Connect with your expert guide
              </Text>
            </View>
          </View>

          <View style={styles.loadingNext}>
            <LoadingSpinner
              size="small"
              color="#FFFFFF"
              message="Starting your mindset phase..."
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

/**
 * 🏗️ Enterprise Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: {
    padding: 8
  },
  backButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600'
  },
  backButtonDisabled: {
    color: '#9CA3AF',
    opacity: 0.5
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20
  },
  stepText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    fontWeight: '500'
  },
  progressBar: {
    width: '100%'
  },
  placeholder: {
    width: 60
  },
  content: {
    flex: 1
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 100
  },
  stepContainer: {
    padding: 20
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center'
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24
  },
  // Skill Selection Styles
  categoryContainer: {
    marginBottom: 24
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8
  },
  categoryButtonSelected: {
    backgroundColor: '#10B981'
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500'
  },
  categoryTextSelected: {
    color: '#FFFFFF'
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  skillCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  skillCardSelected: {
    elevation: 8,
    shadowOpacity: 0.2
  },
  skillGradient: {
    padding: 16,
    minHeight: 180
  },
  skillName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4
  },
  skillNameSelected: {
    color: '#FFFFFF'
  },
  skillCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  skillDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 16
  },
  skillMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  metric: {
    alignItems: 'center'
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937'
  },
  metricLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2
  },
  continueButtonContainer: {
    marginTop: 24
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  continueButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center'
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  // Bundle Confirmation Styles
  bundleCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12
  },
  bundleGradient: {
    padding: 24,
    alignItems: 'center'
  },
  bundlePrice: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4
  },
  bundleDescription: {
    fontSize: 16,
    color: '#E5E7EB',
    marginBottom: 20
  },
  revenueSplit: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%'
  },
  splitItem: {
    alignItems: 'center'
  },
  splitLabel: {
    fontSize: 14,
    color: '#E5E7EB',
    marginBottom: 4
  },
  splitValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  inclusionsContainer: {
    padding: 24
  },
  inclusionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16
  },
  inclusionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  inclusionIcon: {
    fontSize: 16,
    color: '#10B981',
    marginRight: 12,
    fontWeight: '600'
  },
  inclusionText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1
  },
  payoutSchedule: {
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  payoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16
  },
  payoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8
  },
  payoutPhase: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1
  },
  payoutAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginRight: 12
  },
  payoutDescription: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  // Payment Method Styles
  paymentMethods: {
    marginBottom: 24
  },
  paymentMethod: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F3F4F6'
  },
  paymentMethodSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4'
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  paymentIcon: {
    fontSize: 24,
    marginRight: 12
  },
  paymentInfo: {
    flex: 1
  },
  paymentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  paymentDescription: {
    fontSize: 14,
    color: '#6B7280'
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center'
  },
  selectedIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  installmentContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8
  },
  installmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8
  },
  installmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  installmentAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669'
  },
  installmentDue: {
    fontSize: 12,
    color: '#6B7280'
  },
  processingFee: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
    fontWeight: '500'
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F3F4F6'
  },
  confirmButton: {
    flex: 1,
    marginLeft: 12,
    borderRadius: 8,
    overflow: 'hidden'
  },
  confirmButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  // Matching Styles
  matchingContainer: {
    alignItems: 'center',
    paddingVertical: 40
  },
  matchingAnimation: {
    marginBottom: 40
  },
  matchingDetails: {
    width: '100%'
  },
  matchingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center'
  },
  qualityStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  qualityStepIcon: {
    fontSize: 24,
    marginRight: 16
  },
  qualityStepContent: {
    flex: 1
  },
  qualityStepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  qualityStepDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20
  },
  matchingNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    flex: 1,
    marginLeft: 12
  },
  // Confirmation Styles
  confirmationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12
  },
  confirmationSection: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280'
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937'
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 8
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937'
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669'
  },
  expertCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16
  },
  expertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  expertName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937'
  },
  expertTier: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8
  },
  expertBio: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16
  },
  expertMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  expertMetric: {
    alignItems: 'center'
  },
  qualityGuarantee: {
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981'
  },
  guaranteeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 8
  },
  guaranteeText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20
  },
  confirmEnrollmentButton: {
    flex: 1,
    marginLeft: 12,
    borderRadius: 8,
    overflow: 'hidden'
  },
  confirmEnrollmentGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  confirmEnrollmentText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  // Success Styles
  successContainer: {
    flex: 1
  },
  successGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  successContent: {
    alignItems: 'center'
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 24
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center'
  },
  successMessage: {
    fontSize: 18,
    color: '#E5E7EB',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 28
  },
  nextSteps: {
    width: '100%',
    marginBottom: 40
  },
  nextStepsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center'
  },
  nextStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12
  },
  nextStepIcon: {
    fontSize: 20,
    marginRight: 12
  },
  nextStepText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1
  },
  loadingNext: {
    marginTop: 20
  },
  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  loadingBlur: {
    padding: 40,
    borderRadius: 20,
    overflow: 'hidden'
  }
});

export default EnrollmentWizard;