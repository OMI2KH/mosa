// student/quality-feedback.jsx

/**
 * 🎯 ENTERPRISE QUALITY FEEDBACK COMPONENT
 * Production-ready quality reporting interface for Mosa Forge
 * Features: Real-time feedback, category scoring, fraud detection, quality metrics
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useQualityMetrics } from '../hooks/use-quality-metrics';
import { useAuth } from '../contexts/auth-context';
import { QualityScore } from '../components/shared/quality-score';
import { RatingStars } from '../components/shared/rating-stars';
import { StatusBadge } from '../components/shared/status-badge';
import { Logger } from '../utils/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Quality categories with detailed descriptions
const QUALITY_CATEGORIES = {
  expertise: {
    label: 'Expert Knowledge',
    description: 'Depth of subject matter expertise and accuracy',
    icon: '🎯'
  },
  communication: {
    label: 'Communication Skills',
    description: 'Clarity, patience, and effectiveness in explaining concepts',
    icon: '💬'
  },
  practical: {
    label: 'Practical Application',
    description: 'Relevance and quality of hands-on training',
    icon: '🛠️'
  },
  punctuality: {
    label: 'Punctuality & Preparation',
    description: 'Timeliness and session preparation',
    icon: '⏰'
  },
  support: {
    label: 'Ongoing Support',
    description: 'Availability and helpfulness outside sessions',
    icon: '🤝'
  },
  results: {
    label: 'Results Delivery',
    description: 'Effectiveness in achieving learning outcomes',
    icon: '📈'
  }
};

export const QualityFeedback = React.memo(({
  sessionId,
  expertId,
  expertName,
  sessionTitle,
  onFeedbackSubmitted,
  onCancelled,
  isVisible = true
}) => {
  const logger = useMemo(() => new Logger('QualityFeedback'), []);
  const { user } = useAuth();
  const {
    submitQualityFeedback,
    submitRating,
    isSubmitting,
    qualityMetrics,
    fraudDetection
  } = useQualityMetrics();

  // State management
  const [overallRating, setOverallRating] = useState(0);
  const [categoryRatings, setCategoryRatings] = useState({});
  const [comment, setComment] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isFraudCheck, setIsFraudCheck] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState(0);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Animation values
  const slideAnim = useMemo(() => new Animated.Value(SCREEN_WIDTH), []);
  const pulseAnim = useMemo(() => new Animated.Value(1), []);

  // Total steps in feedback process
  const TOTAL_STEPS = 4;

  /**
   * 🎯 Initialize component animations
   */
  React.useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [isVisible, fadeAnim, slideAnim]);

  /**
   * 🛡️ Validate feedback submission
   */
  const validateSubmission = useCallback(() => {
    if (overallRating === 0) {
      Alert.alert(
        'Rating Required',
        'Please provide an overall rating before submitting your feedback.',
        [{ text: 'OK' }]
      );
      return false;
    }

    if (Object.keys(categoryRatings).length < 3) {
      Alert.alert(
        'Detailed Feedback Needed',
        'Please rate at least 3 quality categories to provide meaningful feedback.',
        [{ text: 'OK' }]
      );
      return false;
    }

    if (comment.length < 10 && overallRating < 4) {
      Alert.alert(
        'Feedback Details Required',
        'Please provide more details about your experience to help improve quality.',
        [{ text: 'OK' }]
      );
      return false;
    }

    return true;
  }, [overallRating, categoryRatings, comment]);

  /**
   * 🔍 Perform fraud detection checks
   */
  const performFraudDetection = useCallback(async () => {
    setIsFraudCheck(true);
    
    try {
      const fraudIndicators = await fraudDetection.checkSubmissionPatterns({
        studentId: user.id,
        expertId,
        rating: overallRating,
        categoryRatings,
        commentLength: comment.length,
        submissionTime: Date.now()
      });

      if (fraudIndicators.score > 0.7) {
        Alert.alert(
          'Unusual Feedback Pattern',
          'We detected unusual patterns in your feedback. Please ensure your feedback is genuine and accurate.',
          [
            { text: 'Edit Feedback', style: 'cancel' },
            { 
              text: 'Submit Anyway', 
              style: 'destructive',
              onPress: () => handleFinalSubmission(fraudIndicators.score)
            }
          ]
        );
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Fraud detection failed', error);
      return true; // Proceed on error
    } finally {
      setIsFraudCheck(false);
    }
  }, [user.id, expertId, overallRating, categoryRatings, comment, fraudDetection, logger]);

  /**
   * 🚀 Handle feedback submission
   */
  const handleSubmitFeedback = useCallback(async () => {
    if (!validateSubmission()) return;

    setCurrentStep(3); // Move to fraud detection step

    const fraudCheckPassed = await performFraudDetection();
    if (fraudCheckPassed) {
      await handleFinalSubmission(0);
    }
  }, [validateSubmission, performFraudDetection]);

  /**
   * 💾 Final submission with progress tracking
   */
  const handleFinalSubmission = useCallback(async (fraudScore = 0) => {
    setCurrentStep(4);
    setSubmissionProgress(0);

    try {
      const feedbackData = {
        sessionId,
        expertId,
        studentId: user.id,
        overallRating,
        categoryRatings,
        comment: comment.trim(),
        fraudScore,
        metadata: {
          deviceInfo: `${SCREEN_WIDTH}x${Dimensions.get('window').height}`,
          submissionTime: new Date().toISOString(),
          appVersion: '1.0.0'
        }
      };

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setSubmissionProgress(prev => {
          const newProgress = prev + 10;
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 100);

      // Submit feedback
      const result = await submitQualityFeedback(feedbackData);
      
      clearInterval(progressInterval);
      setSubmissionProgress(100);

      // Submit rating for expert tier calculation
      await submitRating({
        ...feedbackData,
        rating: overallRating,
        categories: categoryRatings
      });

      // Success animation
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();

      // Notify parent component
      setTimeout(() => {
        onFeedbackSubmitted?.(result);
      }, 1000);

      logger.info('Quality feedback submitted successfully', {
        sessionId,
        expertId,
        overallRating,
        fraudScore
      });

    } catch (error) {
      logger.error('Feedback submission failed', error);
      Alert.alert(
        'Submission Failed',
        'Unable to submit feedback. Please check your connection and try again.',
        [
          { text: 'Cancel', style: 'cancel', onPress: onCancelled },
          { text: 'Retry', onPress: handleSubmitFeedback }
        ]
      );
      setCurrentStep(2);
    }
  }, [
    sessionId,
    expertId,
    user.id,
    overallRating,
    categoryRatings,
    comment,
    submitQualityFeedback,
    submitRating,
    pulseAnim,
    onFeedbackSubmitted,
    onCancelled,
    logger,
    handleSubmitFeedback
  ]);

  /**
   * 🎯 Update category rating
   */
  const handleCategoryRating = useCallback((category, rating) => {
    setCategoryRatings(prev => ({
      ...prev,
      [category]: rating
    }));

    // Auto-calculate overall rating if 3+ categories rated
    const ratedCategories = Object.keys({ ...prev, [category]: rating });
    if (ratedCategories.length >= 3) {
      const average = ratedCategories.reduce((sum, cat) => 
        sum + (cat === category ? rating : prev[cat]), 0
      ) / ratedCategories.length;
      
      if (overallRating === 0) {
        setOverallRating(Math.round(average * 2) / 2); // Round to nearest 0.5
      }
    }
  }, [overallRating]);

  /**
   * 📊 Calculate quality insights
   */
  const qualityInsights = useMemo(() => {
    const ratedCategories = Object.keys(categoryRatings);
    if (ratedCategories.length === 0) return null;

    const strengths = ratedCategories.filter(cat => categoryRatings[cat] >= 4);
    const improvements = ratedCategories.filter(cat => categoryRatings[cat] <= 3);

    return {
      strengths: strengths.slice(0, 2),
      improvements: improvements.slice(0, 2),
      completeness: Math.round((ratedCategories.length / Object.keys(QUALITY_CATEGORIES).length) * 100)
    };
  }, [categoryRatings]);

  /**
   * 🎨 Render step indicators
   */
  const renderStepIndicator = () => (
    <View className="flex-row justify-center mb-6">
      {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
        <View
          key={index}
          className={`flex-1 h-1 mx-1 rounded-full ${
            index + 1 <= currentStep 
              ? 'bg-green-500' 
              : 'bg-gray-300'
          }`}
        />
      ))}
    </View>
  );

  /**
   * 🎯 Render overall rating step
   */
  const renderOverallRating = () => (
    <Animated.View 
      style={{ transform: [{ scale: pulseAnim }] }}
      className="items-center"
    >
      <Text className="text-2xl font-bold text-center text-gray-800 mb-2">
        How was your learning experience?
      </Text>
      <Text className="text-lg text-center text-gray-600 mb-6">
        Rate your overall session with {expertName}
      </Text>
      
      <RatingStars
        rating={overallRating}
        onRatingChange={setOverallRating}
        size={42}
        animated={true}
        showLabel={true}
      />

      {overallRating > 0 && (
        <Animated.View 
          style={{ opacity: fadeAnim }}
          className="mt-6 p-4 bg-blue-50 rounded-xl w-full"
        >
          <Text className="text-sm text-blue-800 text-center font-medium">
            {overallRating >= 4 
              ? 'Great! Your expert will appreciate your feedback.' 
              : 'Thanks for your honest feedback. This helps us maintain quality standards.'
            }
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );

  /**
   * 📊 Render category ratings step
   */
  const renderCategoryRatings = () => (
    <View className="flex-1">
      <Text className="text-2xl font-bold text-center text-gray-800 mb-2">
        Rate Specific Areas
      </Text>
      <Text className="text-lg text-center text-gray-600 mb-6">
        Help us understand what went well and what can improve
      </Text>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        {Object.entries(QUALITY_CATEGORIES).map(([key, category]) => (
          <View
            key={key}
            className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-200"
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center flex-1">
                <Text className="text-2xl mr-3">{category.icon}</Text>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-800">
                    {category.label}
                  </Text>
                  <Text className="text-sm text-gray-600 mt-1">
                    {category.description}
                  </Text>
                </View>
              </View>
            </View>

            <RatingStars
              rating={categoryRatings[key] || 0}
              onRatingChange={(rating) => handleCategoryRating(key, rating)}
              size={32}
              showLabel={false}
            />
          </View>
        ))}
      </ScrollView>

      {qualityInsights && (
        <View className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
          <Text className="font-semibold text-gray-800 mb-2">
            Feedback Insights
          </Text>
          {qualityInsights.strengths.length > 0 && (
            <Text className="text-sm text-green-700 mb-1">
              💪 Strengths: {qualityInsights.strengths.map(cat => 
                QUALITY_CATEGORIES[cat].label).join(', ')}
            </Text>
          )}
          {qualityInsights.improvements.length > 0 && (
            <Text className="text-sm text-orange-700">
              📈 Improvements: {qualityInsights.improvements.map(cat => 
                QUALITY_CATEGORIES[cat].label).join(', ')}
            </Text>
          )}
        </View>
      )}
    </View>
  );

  /**
   * 💬 Render comment step
   */
  const renderCommentStep = () => (
    <View className="flex-1">
      <Text className="text-2xl font-bold text-center text-gray-800 mb-2">
        Additional Feedback
      </Text>
      <Text className="text-lg text-center text-gray-600 mb-6">
        Share specific details about your experience (optional)
      </Text>

      <View className="bg-white rounded-xl p-4 border border-gray-300 flex-1">
        <ScrollView className="flex-1">
          <Text className="text-gray-800 text-lg leading-6">
            {comment || 'Start typing your feedback...'}
          </Text>
        </ScrollView>
        
        <View className="border-t border-gray-200 pt-3 mt-3">
          <Text className="text-xs text-gray-500 text-right">
            {comment.length}/1000 characters
          </Text>
        </View>
      </View>

      <View className="flex-row mt-4 space-x-3">
        <TouchableOpacity
          className="flex-1 bg-gray-500 rounded-xl py-4"
          onPress={() => setComment('')}
          disabled={!comment}
        >
          <Text className="text-white text-center font-semibold text-lg">
            Clear
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="flex-1 bg-blue-500 rounded-xl py-4"
          onPress={() => {
            // Show comment input modal
            Alert.prompt(
              'Detailed Feedback',
              'Share specific details about what went well and what could improve:',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Save', 
                  onPress: (text) => setComment(text || '')
                }
              ],
              'plain-text',
              comment
            );
          }}
        >
          <Text className="text-white text-center font-semibold text-lg">
            Add Details
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * 🔍 Render fraud detection step
   */
  const renderFraudDetection = () => (
    <View className="items-center justify-center py-8">
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text className="text-xl font-semibold text-gray-800 mt-4 mb-2">
        Verifying Feedback
      </Text>
      <Text className="text-base text-center text-gray-600">
        Ensuring feedback quality and authenticity...
      </Text>
    </View>
  );

  /**
   * 📤 Render submission progress
   */
  const renderSubmissionProgress = () => (
    <View className="items-center justify-center py-8">
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
          {submissionProgress < 100 ? (
            <ActivityIndicator size="large" color="#10B981" />
          ) : (
            <Text className="text-3xl">✅</Text>
          )}
        </View>
      </Animated.View>

      <Text className="text-xl font-semibold text-gray-800 mt-4 mb-2">
        {submissionProgress < 100 ? 'Submitting Feedback' : 'Success!'}
      </Text>
      
      <Text className="text-base text-center text-gray-600 mb-4">
        {submissionProgress < 100 
          ? 'Your feedback is being processed...' 
          : 'Thank you for helping maintain quality standards!'
        }
      </Text>

      <View className="w-full bg-gray-200 rounded-full h-3">
        <View 
          className="bg-green-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${submissionProgress}%` }}
        />
      </View>
      
      <Text className="text-sm text-gray-500 mt-2">
        {submissionProgress}% Complete
      </Text>
    </View>
  );

  /**
   * 🎯 Render current step content
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderOverallRating();
      case 2:
        return renderCategoryRatings();
      case 3:
        return renderCommentStep();
      case 4:
        return isFraudCheck ? renderFraudDetection() : renderSubmissionProgress();
      default:
        return renderOverallRating();
    }
  };

  /**
   * 🎯 Render action buttons
   */
  const renderActionButtons = () => {
    if (currentStep >= 4) return null;

    const canProceed = currentStep === 1 ? overallRating > 0 : true;
    const isLastStep = currentStep === 3;

    return (
      <View className="flex-row space-x-3 mt-6">
        {currentStep > 1 && (
          <TouchableOpacity
            className="flex-1 bg-gray-500 rounded-xl py-4"
            onPress={() => setCurrentStep(prev => prev - 1)}
            disabled={isSubmitting}
          >
            <Text className="text-white text-center font-semibold text-lg">
              Back
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          className={`flex-1 rounded-xl py-4 ${
            canProceed ? 'bg-green-500' : 'bg-gray-400'
          }`}
          onPress={isLastStep ? handleSubmitFeedback : () => setCurrentStep(prev => prev + 1)}
          disabled={!canProceed || isSubmitting}
        >
          <Text className="text-white text-center font-semibold text-lg">
            {isLastStep ? 'Submit Feedback' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Don't render if not visible
  if (!isVisible) return null;

  return (
    <Animated.View 
      style={{
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }]
      }}
      className="flex-1 bg-gray-50"
    >
      {/* Header */}
      <LinearGradient
        colors={['#3B82F6', '#1D4ED8']}
        className="px-6 py-4 rounded-b-3xl"
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">
              Session Feedback
            </Text>
            <Text className="text-blue-100 text-base mt-1">
              {sessionTitle}
            </Text>
          </View>
          <StatusBadge 
            status="feedback" 
            text={`Step ${currentStep}/${TOTAL_STEPS}`}
          />
        </View>
        
        {renderStepIndicator()}
      </LinearGradient>

      {/* Content */}
      <View className="flex-1 px-6 py-6">
        {renderStepContent()}
        {renderActionButtons()}
      </View>

      {/* Quality Metrics Footer */}
      <BlurView intensity={80} className="px-6 py-4 border-t border-gray-200">
        <Text className="text-xs text-gray-600 text-center">
          Your feedback directly impacts expert quality ratings and tier advancement.
          All feedback is verified for authenticity.
        </Text>
      </BlurView>
    </Animated.View>
  );
});

// Display name for debugging
QualityFeedback.displayName = 'QualityFeedback';

export default QualityFeedback;