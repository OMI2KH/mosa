/**
 * 🎯 MOSA FORGE: Enterprise Multi-Course Layout
 * 
 * @module MultiCourseLayout
 * @description Handles multi-course enrollment, payment flows, and mindset session management
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Multi-course enrollment with 1,999 ETB payment per course
 * - Mindset session skip functionality (optional)
 * - Course switching with progress preservation
 * - Payment verification and revenue split enforcement
 * - Quality guarantee across multiple courses
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Platform, 
  BackHandler,
  AppState
} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/auth-context';
import { usePayment } from '../../contexts/payment-context';
import { useQuality } from '../../contexts/quality-context';
import { useEnrollment } from '../../contexts/enrollment-context';

// 🏗️ Enterprise Components
import CourseManager from './course-manager';
import ProgressOverview from './progress-overview';
import SkillSwitcher from './skill-switcher';
import BundlePurchase from '../bundle/bundle-purchase';
import PaymentMethods from '../bundle/payment-methods';
import MindsetSkipModal from '../../components/learning/mindset-skip-modal';
import QualityAlert from '../../components/quality/quality-alert';

// 🏗️ Enterprise Constants
const MULTI_COURSE_CONFIG = {
  MAX_CONCURRENT_COURSES: 3,
  BUNDLE_PRICE: 1999,
  MINDSET_SKIP_FEE: 0, // Free to skip mindset
  PAYMENT_REQUIRED: true,
  REVENUE_SPLIT: {
    mosa: 1000,
    expert: 999
  }
};

const COURSE_NAVIGATION_STATES = {
  MANAGER: 'manager',
  OVERVIEW: 'overview',
  SWITCHER: 'switcher',
  PAYMENT: 'payment',
  MINDSTET_SKIP: 'mindset_skip'
};

/**
 * 🏗️ Enterprise Multi-Course Layout Stack
 */
const Stack = createStackNavigator();

/**
 * 🎯 Main Multi-Course Layout Component
 * @component MultiCourseLayout
 */
const MultiCourseLayout = ({ navigation, route }) => {
  // 🏗️ Enterprise State Management
  const [currentState, setCurrentState] = useState(COURSE_NAVIGATION_STATES.MANAGER);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [mindsetSkipConfig, setMindsetSkipConfig] = useState(null);
  const [paymentFlowData, setPaymentFlowData] = useState(null);
  const [qualityAlerts, setQualityAlerts] = useState([]);

  // 🏗️ Enterprise Context Hooks
  const { 
    user, 
    isAuthenticated, 
    faydaId,
    hasActiveSubscription 
  } = useAuth();

  const {
    initiatePayment,
    verifyPaymentStatus,
    paymentMethods,
    isPaymentProcessing
  } = usePayment();

  const {
    qualityMetrics,
    checkExpertAvailability,
    getSkillQualityScore
  } = useQuality();

  const {
    enrollments,
    activeEnrollments,
    completedEnrollments,
    enrollInNewCourse,
    switchActiveCourse,
    getEnrollmentProgress,
    canEnrollInMoreCourses
  } = useEnrollment();

  /**
   * 🏗️ Handle Android Back Button
   */
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (currentState !== COURSE_NAVIGATION_STATES.MANAGER) {
          setCurrentState(COURSE_NAVIGATION_STATES.MANAGER);
          return true;
        }
        return false;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => {
        BackHandler.removeEventListener('hardwareBackPress', onBackPress);
      };
    }, [currentState])
  );

  /**
   * 🏗️ App State Management for Payment Flow
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && paymentFlowData) {
        // Check payment status when app becomes active
        checkPendingPaymentStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [paymentFlowData]);

  /**
   * 🏗️ Check Pending Payment Status
   */
  const checkPendingPaymentStatus = async () => {
    if (!paymentFlowData?.paymentId) return;

    try {
      const paymentStatus = await verifyPaymentStatus(paymentFlowData.paymentId);
      
      if (paymentStatus.status === 'COMPLETED') {
        // Payment successful, proceed with enrollment
        await handlePaymentSuccess(paymentFlowData);
      } else if (paymentStatus.status === 'FAILED') {
        setQualityAlerts(prev => [...prev, {
          id: Date.now(),
          type: 'error',
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again.',
          action: 'retry_payment'
        }]);
      }
    } catch (error) {
      console.error('Payment status check failed:', error);
    }
  };

  /**
   * 🎯 MAIN FLOW: Handle New Course Selection
   */
  const handleNewCourseSelection = useCallback(async (skillData) => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', { screen: 'FaydaRegistration' });
      return;
    }

    // 🏗️ Validate user can enroll in more courses
    if (!canEnrollInMoreCourses()) {
      setQualityAlerts(prev => [...prev, {
        id: Date.now(),
        type: 'warning',
        title: 'Course Limit Reached',
        message: `You can only enroll in ${MULTI_COURSE_CONFIG.MAX_CONCURRENT_COURSES} courses simultaneously.`,
        action: 'upgrade_request'
      }]);
      return;
    }

    // 🏗️ Check if user already has this skill enrolled
    const existingEnrollment = enrollments.find(
      enrollment => 
        enrollment.skillId === skillData.id && 
        ['ACTIVE', 'PENDING'].includes(enrollment.status)
    );

    if (existingEnrollment) {
      setQualityAlerts(prev => [...prev, {
        id: Date.now(),
        type: 'info',
        title: 'Course Already Enrolled',
        message: 'You are already enrolled in this course. Switching to it now.',
        action: 'switch_course'
      }]);
      
      await handleCourseSwitch(existingEnrollment.id);
      return;
    }

    setSelectedSkill(skillData);
    
    // 🏗️ Check if user has completed mindset in another course
    const hasCompletedMindset = enrollments.some(
      enrollment => enrollment.mindsetCompleted
    );

    if (hasCompletedMindset) {
      // Show mindset skip option
      setMindsetSkipConfig({
        skillId: skillData.id,
        skillName: skillData.name,
        skipAvailable: true,
        skipFee: MULTI_COURSE_CONFIG.MINDSET_SKIP_FEE
      });
      setCurrentState(COURSE_NAVIGATION_STATES.MINDSTET_SKIP);
    } else {
      // Proceed directly to payment
      await initiatePaymentFlow(skillData);
    }
  }, [isAuthenticated, enrollments, canEnrollInMoreCourses]);

  /**
   * 🏗️ Initiate Payment Flow for New Course
   */
  const initiatePaymentFlow = async (skillData, skipMindset = false) => {
    try {
      const paymentPayload = {
        amount: MULTI_COURSE_CONFIG.BUNDLE_PRICE,
        skillId: skillData.id,
        skillName: skillData.name,
        bundleType: 'NEW_COURSE',
        revenueSplit: MULTI_COURSE_CONFIG.REVENUE_SPLIT,
        metadata: {
          skipMindset,
          multiCourse: true,
          existingEnrollments: enrollments.length
        }
      };

      setPaymentFlowData({
        skillData,
        skipMindset,
        timestamp: Date.now()
      });

      const paymentResult = await initiatePayment(paymentPayload);
      
      if (paymentResult.requiresGateway) {
        setCurrentState(COURSE_NAVIGATION_STATES.PAYMENT);
      } else {
        // Handle direct payment (wallet, etc.)
        await handlePaymentSuccess({
          ...paymentFlowData,
          paymentId: paymentResult.paymentId
        });
      }
    } catch (error) {
      setQualityAlerts(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        title: 'Payment Initiation Failed',
        message: 'Unable to start payment process. Please try again.',
        action: 'retry_initiation'
      }]);
    }
  };

  /**
   * 🏗️ Handle Successful Payment
   */
  const handlePaymentSuccess = async (paymentData) => {
    try {
      const enrollmentData = {
        skillId: paymentData.skillData.id,
        paymentId: paymentData.paymentId,
        skipMindset: paymentData.skipMindset,
        bundlePrice: MULTI_COURSE_CONFIG.BUNDLE_PRICE,
        traceId: `multi_course_${Date.now()}`
      };

      const enrollmentResult = await enrollInNewCourse(enrollmentData);

      if (enrollmentResult.success) {
        setQualityAlerts(prev => [...prev, {
          id: Date.now(),
          type: 'success',
          title: 'Enrollment Successful',
          message: `You are now enrolled in ${paymentData.skillData.name}`,
          action: 'view_course'
        }]);

        // Reset payment flow
        setPaymentFlowData(null);
        setCurrentState(COURSE_NAVIGATION_STATES.MANAGER);

        // Navigate to new course
        navigation.navigate('LearningStack', {
          screen: 'CourseDashboard',
          params: { enrollmentId: enrollmentResult.enrollmentId }
        });
      }
    } catch (error) {
      setQualityAlerts(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        title: 'Enrollment Failed',
        message: 'Payment was successful but enrollment failed. Contact support.',
        action: 'contact_support'
      }]);
    }
  };

  /**
   * 🏗️ Handle Course Switching
   */
  const handleCourseSwitch = async (enrollmentId) => {
    try {
      await switchActiveCourse(enrollmentId);
      
      setQualityAlerts(prev => [...prev, {
        id: Date.now(),
        type: 'success',
        title: 'Course Switched',
        message: 'You have successfully switched courses.',
        action: 'view_course'
      }]);

      // Navigate to switched course
      navigation.navigate('LearningStack', {
        screen: 'CourseDashboard',
        params: { enrollmentId }
      });
    } catch (error) {
      setQualityAlerts(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        title: 'Switch Failed',
        message: 'Unable to switch courses. Please try again.',
        action: 'retry_switch'
      }]);
    }
  };

  /**
   * 🏗️ Handle Mindset Skip Decision
   */
  const handleMindsetSkipDecision = async (decision) => {
    if (decision === 'skip') {
      await initiatePaymentFlow(selectedSkill, true);
    } else {
      await initiatePaymentFlow(selectedSkill, false);
    }
    
    setMindsetSkipConfig(null);
  };

  /**
   * 🏗️ Render Current Navigation State
   */
  const renderCurrentState = () => {
    switch (currentState) {
      case COURSE_NAVIGATION_STATES.OVERVIEW:
        return (
          <ProgressOverview
            enrollments={enrollments}
            onCourseSwitch={handleCourseSwitch}
            onBack={() => setCurrentState(COURSE_NAVIGATION_STATES.MANAGER)}
          />
        );

      case COURSE_NAVIGATION_STATES.SWITCHER:
        return (
          <SkillSwitcher
            currentEnrollments={activeEnrollments}
            onSkillSelect={handleNewCourseSelection}
            onCourseSwitch={handleCourseSwitch}
            onBack={() => setCurrentState(COURSE_NAVIGATION_STATES.MANAGER)}
          />
        );

      case COURSE_NAVIGATION_STATES.PAYMENT:
        return (
          <View style={styles.paymentContainer}>
            <PaymentMethods
              paymentData={paymentFlowData}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentFailed={(error) => {
                setQualityAlerts(prev => [...prev, {
                  id: Date.now(),
                  type: 'error',
                  title: 'Payment Failed',
                  message: error.message,
                  action: 'retry_payment'
                }]);
                setCurrentState(COURSE_NAVIGATION_STATES.MANAGER);
              }}
              onBack={() => setCurrentState(COURSE_NAVIGATION_STATES.MANAGER)}
            />
          </View>
        );

      case COURSE_NAVIGATION_STATES.MANAGER:
      default:
        return (
          <CourseManager
            enrollments={enrollments}
            activeEnrollments={activeEnrollments}
            completedEnrollments={completedEnrollments}
            onNewCourseSelect={handleNewCourseSelection}
            onCourseSwitch={handleCourseSwitch}
            onViewProgress={() => setCurrentState(COURSE_NAVIGATION_STATES.OVERVIEW)}
            onSwitchCourse={() => setCurrentState(COURSE_NAVIGATION_STATES.SWITCHER)}
            maxConcurrentCourses={MULTI_COURSE_CONFIG.MAX_CONCURRENT_COURSES}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* 🏗️ Main Content */}
      <View style={styles.content}>
        {renderCurrentState()}
      </View>

      {/* 🏗️ Quality Alerts */}
      <View style={styles.alertsContainer}>
        {qualityAlerts.map(alert => (
          <QualityAlert
            key={alert.id}
            type={alert.type}
            title={alert.title}
            message={alert.message}
            action={alert.action}
            onAction={() => handleQualityAlertAction(alert)}
            onDismiss={() => removeQualityAlert(alert.id)}
            autoDismiss={alert.type !== 'error'}
          />
        ))}
      </View>

      {/* 🏗️ Mindset Skip Modal */}
      {mindsetSkipConfig && (
        <MindsetSkipModal
          visible={!!mindsetSkipConfig}
          skillName={mindsetSkipConfig.skillName}
          skipFee={mindsetSkipConfig.skipFee}
          onSkip={() => handleMindsetSkipDecision('skip')}
          onComplete={() => handleMindsetSkipDecision('complete')}
          onCancel={() => {
            setMindsetSkipConfig(null);
            setCurrentState(COURSE_NAVIGATION_STATES.MANAGER);
          }}
        />
      )}

      {/* 🏗️ Payment Processing Overlay */}
      {isPaymentProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.processingText}>
            Processing Payment...
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * 🏗️ Handle Quality Alert Actions
 */
const handleQualityAlertAction = (alert) => {
  switch (alert.action) {
    case 'retry_payment':
      setCurrentState(COURSE_NAVIGATION_STATES.PAYMENT);
      break;
    case 'switch_course':
      // Already handled in alert creation
      break;
    case 'contact_support':
      navigation.navigate('Support', { issue: 'enrollment_failed' });
      break;
    default:
      break;
  }
};

/**
 * 🏗️ Remove Quality Alert
 */
const removeQualityAlert = (alertId) => {
  setQualityAlerts(prev => prev.filter(alert => alert.id !== alertId));
};

/**
 * 🏗️ Enterprise Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
  },
  paymentContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  alertsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
});

/**
 * 🏗️ Multi-Course Navigator Component
 */
const MultiCourseNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F9FAFB' },
        animationEnabled: Platform.OS === 'ios',
      }}
    >
      <Stack.Screen
        name="MultiCourseMain"
        component={MultiCourseLayout}
        options={{
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
};

// 🏗️ Enterprise Export Pattern
export default MultiCourseNavigator;

// 🏗️ Named Exports for Testing and Enterprise Use
export {
  MultiCourseLayout,
  MULTI_COURSE_CONFIG,
  COURSE_NAVIGATION_STATES
};

// 🏗️ Prop Types for Enterprise Development
MultiCourseLayout.propTypes = {
  navigation: PropTypes.object.isRequired,
  route: PropTypes.object.isRequired,
};

/**
 * 🏗️ Performance Optimization
 * Memoized component to prevent unnecessary re-renders
 */
export const MemoizedMultiCourseLayout = React.memo(MultiCourseLayout);