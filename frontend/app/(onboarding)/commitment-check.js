// app/(onboarding)/commitment-check.js

/**
 * 🎯 ENTERPRISE COMMITMENT CHECK SYSTEM
 * Production-ready commitment assessment for Mosa Forge onboarding
 * Features: Mindset evaluation, financial readiness, psychological assessment
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../contexts/auth-context';
import { useOnboarding } from '../../contexts/onboarding-context';
import { CommitmentService } from '../../services/commitment-service';
import { Logger } from '../../utils/logger';

// Design System
import { 
  ProgressIndicator, 
  QualityScore,
  CommitmentMeter 
} from '../../components/shared';
import { 
  MindsetAssessmentCard,
  FinancialReadinessCard,
  TimeCommitmentCard,
  PsychologicalAssessmentCard 
} from '../../components/commitment';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const logger = new Logger('CommitmentCheck');

export default function CommitmentCheck() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, updateUserProfile } = useAuth();
  const { 
    onboardingData, 
    updateOnboardingProgress,
    clearOnboardingData 
  } = useOnboarding();

  // State Management
  const [currentStep, setCurrentStep] = useState(0);
  const [assessmentData, setAssessmentData] = useState({
    mindsetScore: 0,
    financialReadiness: 0,
    timeCommitment: 0,
    psychologicalReadiness: 0,
    riskTolerance: 'MODERATE',
    learningStyle: 'VISUAL',
    motivationFactors: [],
    potentialChallenges: [],
    commitmentLevel: 'LOW'
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [progressAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  // Assessment Steps Configuration
  const ASSESSMENT_STEPS = [
    {
      id: 'mindset',
      title: '🧠 Mindset Assessment',
      description: 'Evaluate your wealth consciousness and learning mindset',
      component: MindsetAssessmentCard,
      weight: 0.30,
      minScore: 70
    },
    {
      id: 'financial',
      title: '💰 Financial Readiness',
      description: 'Assess your financial commitment and investment readiness',
      component: FinancialReadinessCard,
      weight: 0.25,
      minScore: 60
    },
    {
      id: 'time',
      title: '⏱️ Time Commitment',
      description: 'Evaluate your available time and scheduling flexibility',
      component: TimeCommitmentCard,
      weight: 0.25,
      minScore: 75
    },
    {
      id: 'psychological',
      title: '💫 Psychological Readiness',
      description: 'Assess your motivation, resilience, and learning preferences',
      component: PsychologicalAssessmentCard,
      weight: 0.20,
      minScore: 65
    }
  ];

  /**
   * 🎯 INITIALIZE COMPONENT
   */
  useEffect(() => {
    initializeAssessment();
    setupBackHandler();
    animateEntrance();

    return () => {
      cleanupResources();
    };
  }, []);

  /**
   * 🚀 INITIALIZE ASSESSMENT
   */
  const initializeAssessment = useCallback(async () => {
    try {
      logger.info('Initializing commitment assessment', { 
        userId: user?.id,
        skillId: onboardingData?.selectedSkill?.id 
      });

      // Validate prerequisite data
      const validationResult = await validatePrerequisites();
      if (!validationResult.valid) {
        logger.warn('Prerequisites not met', validationResult.errors);
        handlePrerequisiteFailure(validationResult.errors);
        return;
      }

      // Load any previous assessment progress
      await loadPreviousProgress();

      logger.debug('Assessment initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize assessment', error);
      handleInitializationError(error);
    }
  }, [user, onboardingData]);

  /**
   * 🛡️ VALIDATE PREREQUISITES
   */
  const validatePrerequisites = async () => {
    const errors = [];

    // Fayda ID verification check
    if (!user?.faydaVerified) {
      errors.push('FAYDA_ID_NOT_VERIFIED');
    }

    // Skill selection check
    if (!onboardingData?.selectedSkill) {
      errors.push('NO_SKILL_SELECTED');
    }

    // Mindset phase completion check
    if (!onboardingData?.mindsetPhaseCompleted) {
      errors.push('MINDSET_PHASE_INCOMPLETE');
    }

    // Financial capability check
    if (!user?.financialProfile?.paymentMethodConfigured) {
      errors.push('PAYMENT_METHOD_NOT_CONFIGURED');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  /**
   * 📥 LOAD PREVIOUS PROGRESS
   */
  const loadPreviousProgress = async () => {
    try {
      const previousAssessment = await CommitmentService.getUserAssessment(user.id);
      
      if (previousAssessment) {
        setAssessmentData(prev => ({
          ...prev,
          ...previousAssessment.assessmentData
        }));
        
        setCurrentStep(previousAssessment.currentStep || 0);
        
        logger.debug('Loaded previous assessment progress', {
          currentStep: previousAssessment.currentStep,
          overallScore: previousAssessment.overallScore
        });
      }
    } catch (error) {
      logger.warn('No previous assessment found or failed to load', error);
    }
  };

  /**
   * 🎨 ANIMATE ENTRANCE
   */
  const animateEntrance = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(progressAnim, {
        toValue: calculateProgress(),
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false
      })
    ]).start();
  };

  /**
   * 🔄 HANDLE STEP COMPLETION
   */
  const handleStepComplete = useCallback(async (stepId, stepData) => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Validate step data
      const validation = validateStepData(stepId, stepData);
      if (!validation.isValid) {
        setValidationErrors(prev => ({
          ...prev,
          [stepId]: validation.errors
        }));
        return;
      }

      // Clear validation errors for this step
      setValidationErrors(prev => ({
        ...prev,
        [stepId]: []
      }));

      // Update assessment data
      const updatedData = {
        ...assessmentData,
        ...stepData
      };
      
      setAssessmentData(updatedData);

      // Calculate overall score
      const overallScore = calculateOverallScore(updatedData);
      updatedData.commitmentLevel = calculateCommitmentLevel(overallScore);

      // Save progress
      await saveAssessmentProgress(updatedData, currentStep);

      // Move to next step or complete
      if (currentStep < ASSESSMENT_STEPS.length - 1) {
        await navigateToStep(currentStep + 1);
      } else {
        await completeAssessment(updatedData);
      }

      logger.debug('Step completed successfully', { 
        stepId, 
        currentStep,
        overallScore 
      });

    } catch (error) {
      logger.error('Failed to complete step', error, { stepId, stepData });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save assessment progress. Please try again.');
    }
  }, [currentStep, assessmentData]);

  /**
   * 🛡️ VALIDATE STEP DATA
   */
  const validateStepData = (stepId, stepData) => {
    const errors = [];
    const stepConfig = ASSESSMENT_STEPS.find(step => step.id === stepId);

    if (!stepConfig) {
      return { isValid: false, errors: ['INVALID_STEP'] };
    }

    // Score validation
    if (typeof stepData[`${stepId}Score`] !== 'number') {
      errors.push('INVALID_SCORE_FORMAT');
    }

    if (stepData[`${stepId}Score`] < 0 || stepData[`${stepId}Score`] > 100) {
      errors.push('SCORE_OUT_OF_RANGE');
    }

    // Minimum score check
    if (stepData[`${stepId}Score`] < stepConfig.minScore) {
      errors.push('BELOW_MINIMUM_SCORE');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  /**
   * 📊 CALCULATE OVERALL SCORE
   */
  const calculateOverallScore = (data) => {
    let totalScore = 0;
    let totalWeight = 0;

    ASSESSMENT_STEPS.forEach(step => {
      const stepScore = data[`${step.id}Score`] || 0;
      totalScore += stepScore * step.weight;
      totalWeight += step.weight;
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  };

  /**
   * 🎯 CALCULATE COMMITMENT LEVEL
   */
  const calculateCommitmentLevel = (overallScore) => {
    if (overallScore >= 90) return 'EXCELLENT';
    if (overallScore >= 80) return 'HIGH';
    if (overallScore >= 70) return 'MODERATE';
    if (overallScore >= 60) return 'LOW';
    return 'INSUFFICIENT';
  };

  /**
   * 💾 SAVE ASSESSMENT PROGRESS
   */
  const saveAssessmentProgress = async (data, step) => {
    try {
      await CommitmentService.saveAssessmentProgress({
        userId: user.id,
        assessmentData: data,
        currentStep: step,
        overallScore: calculateOverallScore(data),
        commitmentLevel: calculateCommitmentLevel(calculateOverallScore(data)),
        updatedAt: new Date().toISOString()
      });

      // Update local progress
      await updateOnboardingProgress({
        commitmentAssessment: data,
        currentCommitmentStep: step
      });

    } catch (error) {
      logger.error('Failed to save assessment progress', error);
      throw error;
    }
  };

  /**
   * 🏁 COMPLETE ASSESSMENT
   */
  const completeAssessment = async (finalData) => {
    setIsSubmitting(true);

    try {
      const overallScore = calculateOverallScore(finalData);
      const commitmentLevel = calculateCommitmentLevel(overallScore);

      // Final validation
      if (overallScore < 70) {
        await handleAssessmentFailure(finalData, overallScore);
        return;
      }

      // Submit final assessment
      const result = await CommitmentService.submitFinalAssessment({
        userId: user.id,
        skillId: onboardingData.selectedSkill.id,
        assessmentData: finalData,
        overallScore,
        commitmentLevel,
        recommendedAction: generateRecommendation(finalData, overallScore),
        riskFactors: identifyRiskFactors(finalData)
      });

      // Update user profile
      await updateUserProfile({
        commitmentLevel,
        lastAssessmentDate: new Date().toISOString(),
        onboardingStage: 'COMMITMENT_COMPLETED'
      });

      // Navigate to next phase
      await handleAssessmentSuccess(result);

      logger.info('Assessment completed successfully', {
        userId: user.id,
        overallScore,
        commitmentLevel
      });

    } catch (error) {
      logger.error('Failed to complete assessment', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Submission Error',
        'Failed to submit your assessment. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 🚨 HANDLE ASSESSMENT FAILURE
   */
  const handleAssessmentFailure = async (data, score) => {
    const recommendations = generateImprovementRecommendations(data);
    
    Alert.alert(
      'Commitment Level Insufficient',
      `Your current commitment score is ${score}%. ${recommendations.join(' ')}`,
      [
        {
          text: 'Retry Assessment',
          onPress: () => resetAssessment()
        },
        {
          text: 'Review Mindset Phase',
          onPress: () => router.push('/(onboarding)/mindset-assessment'),
          style: 'cancel'
        },
        {
          text: 'Contact Support',
          onPress: () => router.push('/support')
        }
      ]
    );

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  /**
   * ✅ HANDLE ASSESSMENT SUCCESS
   */
  const handleAssessmentSuccess = async (result) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Show success animation
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.8,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();

    // Navigate to payment/bundle page
    setTimeout(() => {
      router.replace({
        pathname: '/(bundle)/bundle-purchase',
        params: {
          skillId: onboardingData.selectedSkill.id,
          commitmentScore: result.overallScore,
          commitmentLevel: result.commitmentLevel
        }
      });
    }, 1500);
  };

  /**
   * 🔄 NAVIGATE TO STEP
   */
  const navigateToStep = async (stepIndex) => {
    // Validate step index
    if (stepIndex < 0 || stepIndex >= ASSESSMENT_STEPS.length) {
      logger.error('Invalid step index', { stepIndex });
      return;
    }

    // Animation for step transition
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(progressAnim, {
        toValue: calculateProgress(stepIndex),
        duration: 500,
        useNativeDriver: false
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();

    setCurrentStep(stepIndex);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  /**
   * 📈 CALCULATE PROGRESS
   */
  const calculateProgress = (step = currentStep) => {
    return (step + 1) / ASSESSMENT_STEPS.length;
  };

  /**
   * 🔄 RESET ASSESSMENT
   */
  const resetAssessment = () => {
    Alert.alert(
      'Reset Assessment',
      'Are you sure you want to restart the commitment assessment?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Reset',
          onPress: async () => {
            setAssessmentData({
              mindsetScore: 0,
              financialReadiness: 0,
              timeCommitment: 0,
              psychologicalReadiness: 0,
              riskTolerance: 'MODERATE',
              learningStyle: 'VISUAL',
              motivationFactors: [],
              potentialChallenges: [],
              commitmentLevel: 'LOW'
            });
            setCurrentStep(0);
            setValidationErrors({});
            
            await clearOnboardingData();
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            
            logger.info('Assessment reset by user', { userId: user.id });
          }
        }
      ]
    );
  };

  /**
   * 🚨 HANDLE PREREQUISITE FAILURE
   */
  const handlePrerequisiteFailure = (errors) => {
    const errorMessages = {
      'FAYDA_ID_NOT_VERIFIED': 'Please complete Fayda ID verification first.',
      'NO_SKILL_SELECTED': 'Please select a skill to learn.',
      'MINDSET_PHASE_INCOMPLETE': 'Please complete the mindset assessment phase.',
      'PAYMENT_METHOD_NOT_CONFIGURED': 'Please configure your payment method.'
    };

    const message = errors.map(error => errorMessages[error] || error).join('\n');

    Alert.alert(
      'Requirements Not Met',
      message,
      [
        {
          text: 'Go Back',
          onPress: () => router.back()
        }
      ]
    );
  };

  /**
   * 🚨 HANDLE INITIALIZATION ERROR
   */
  const handleInitializationError = (error) => {
    Alert.alert(
      'Initialization Error',
      'Failed to initialize commitment assessment. Please try again.',
      [
        {
          text: 'Retry',
          onPress: initializeAssessment
        },
        {
          text: 'Go Back',
          onPress: () => router.back(),
          style: 'cancel'
        }
      ]
    );
  };

  /**
   * ⏪ SETUP BACK HANDLER
   */
  const setupBackHandler = () => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentStep > 0) {
        navigateToStep(currentStep - 1);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  };

  /**
   * 🧹 CLEANUP RESOURCES
   */
  const cleanupResources = () => {
    // Cleanup any ongoing animations or subscriptions
    progressAnim.stopAnimation();
    fadeAnim.stopAnimation();
  };

  /**
   * 💡 GENERATE RECOMMENDATION
   */
  const generateRecommendation = (data, overallScore) => {
    if (overallScore >= 85) {
      return 'PROCEED_IMMEDIATELY';
    } else if (overallScore >= 70) {
      return 'PROCEED_WITH_GUIDANCE';
    } else {
      return 'NEEDS_IMPROVEMENT';
    }
  };

  /**
   * 🎯 IDENTIFY RISK FACTORS
   */
  const identifyRiskFactors = (data) => {
    const risks = [];

    if (data.timeCommitment < 70) {
      risks.push('TIME_COMMITMENT_LOW');
    }

    if (data.financialReadiness < 60) {
      risks.push('FINANCIAL_READINESS_LOW');
    }

    if (data.psychologicalReadiness < 65) {
      risks.push('PSYCHOLOGICAL_READINESS_LOW');
    }

    return risks;
  };

  /**
   * 📝 GENERATE IMPROVEMENT RECOMMENDATIONS
   */
  const generateImprovementRecommendations = (data) => {
    const recommendations = [];

    if (data.mindsetScore < 70) {
      recommendations.push('Focus on developing your wealth consciousness and learning mindset.');
    }

    if (data.financialReadiness < 60) {
      recommendations.push('Consider our payment plan options to make the investment more manageable.');
    }

    if (data.timeCommitment < 75) {
      recommendations.push('Evaluate your schedule to ensure you can dedicate sufficient time for learning.');
    }

    if (data.psychologicalReadiness < 65) {
      recommendations.push('Work on building resilience and motivation strategies.');
    }

    return recommendations;
  };

  /**
   * 🎨 RENDER CURRENT STEP
   */
  const renderCurrentStep = () => {
    const currentStepConfig = ASSESSMENT_STEPS[currentStep];
    const StepComponent = currentStepConfig.component;

    if (!StepComponent) {
      logger.error('Step component not found', { currentStep });
      return null;
    }

    return (
      <StepComponent
        initialData={assessmentData}
        onComplete={(data) => handleStepComplete(currentStepConfig.id, data)}
        errors={validationErrors[currentStepConfig.id] || []}
        isSubmitting={isSubmitting}
      />
    );
  };

  /**
   * 🎨 RENDER PROGRESS INDICATOR
   */
  const renderProgressIndicator = () => (
    <View className="px-6 pt-4 pb-2 bg-white">
      <ProgressIndicator
        steps={ASSESSMENT_STEPS}
        currentStep={currentStep}
        progress={progressAnim}
        showLabels={true}
        onStepPress={navigateToStep}
      />
    </View>
  );

  /**
   * 🎨 RENDER HEADER
   */
  const renderHeader = () => (
    <LinearGradient
      colors={['#1e40af', '#3b82f6']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      className="px-6 pt-16 pb-6"
    >
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity
          onPress={() => currentStep > 0 ? navigateToStep(currentStep - 1) : router.back()}
          className="p-2 rounded-full bg-white/20"
        >
          <Text className="text-white text-lg font-bold">
            {currentStep > 0 ? '←' : '✕'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={resetAssessment}
          className="p-2 rounded-full bg-white/20"
        >
          <Text className="text-white text-sm font-medium">Reset</Text>
        </TouchableOpacity>
      </View>

      <View className="mb-2">
        <Text className="text-white text-2xl font-bold mb-1">
          {ASSESSMENT_STEPS[currentStep]?.title}
        </Text>
        <Text className="text-white/80 text-base">
          {ASSESSMENT_STEPS[currentStep]?.description}
        </Text>
      </View>

      <CommitmentMeter
        score={calculateOverallScore(assessmentData)}
        level={assessmentData.commitmentLevel}
        animated={true}
      />
    </LinearGradient>
  );

  /**
   * 🎨 RENDER FOOTER
   */
  const renderFooter = () => (
    <View className="px-6 py-4 bg-gray-50 border-t border-gray-200">
      <Text className="text-gray-600 text-xs text-center mb-2">
        Step {currentStep + 1} of {ASSESSMENT_STEPS.length}
      </Text>
      <QualityScore
        score={calculateOverallScore(assessmentData)}
        size="sm"
        showLabel={true}
      />
    </View>
  );

  // Render main component
  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="light" />
      
      <Animated.View 
        style={{ opacity: fadeAnim }}
        className="flex-1"
      >
        {renderHeader()}
        {renderProgressIndicator()}
        
        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          <View className="px-6 pt-6">
            {renderCurrentStep()}
          </View>
        </ScrollView>

        {renderFooter()}
      </Animated.View>

      {/* Loading Overlay */}
      {isSubmitting && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center">
          <View className="bg-white rounded-2xl p-6 items-center">
            <Text className="text-lg font-semibold mb-2">Processing Assessment</Text>
            <Text className="text-gray-600 text-center">
              Calculating your commitment level and generating recommendations...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// Export with error boundary
export { CommitmentCheck as default };