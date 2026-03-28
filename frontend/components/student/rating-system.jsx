/**
 * 🎯 MOSA FORGE: Enterprise Rating System Component
 * 
 * @component RatingSystem
 * @description Enterprise-grade rating interface for student-expert feedback
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Multi-dimensional rating system
 * - Quality metrics integration
 * - Fraud detection and validation
 * - Real-time feedback processing
 * - Performance impact calculation
 */

import React, { useState, useCallback, useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';

// 🏗️ Enterprise Constants
const RATING_DIMENSIONS = {
  TEACHING_QUALITY: 'teaching_quality',
  RESPONSIVENESS: 'responsiveness',
  PRACTICAL_SKILLS: 'practical_skills',
  PROFESSIONALISM: 'professionalism',
  OVERALL_EXPERIENCE: 'overall_experience'
};

const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent'
};

const QUALITY_THRESHOLDS = {
  CRITICAL: 3.0,
  WARNING: 3.5,
  GOOD: 4.0,
  EXCELLENT: 4.5
};

/**
 * 🏗️ Enterprise Rating System Component
 * @param {Object} props - Component properties
 */
const RatingSystem = ({
  enrollmentId,
  expertId,
  expertName,
  skillName,
  sessionType = 'TRAINING_SESSION',
  onRatingComplete,
  onRatingSaved,
  isSubmittable = true,
  theme = 'primary'
}) => {
  // 🏗️ State Management
  const [ratings, setRatings] = useState({
    [RATING_DIMENSIONS.TEACHING_QUALITY]: 0,
    [RATING_DIMENSIONS.RESPONSIVENESS]: 0,
    [RATING_DIMENSIONS.PRACTICAL_SKILLS]: 0,
    [RATING_DIMENSIONS.PROFESSIONALISM]: 0,
    [RATING_DIMENSIONS.OVERALL_EXPERIENCE]: 0
  });
  
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [animationValues] = useState(() => ({
    scale: new Animated.Value(1),
    opacity: new Animated.Value(1),
    slide: new Animated.Value(0)
  }));

  // 🏗️ Memoized Computed Values
  const averageRating = useMemo(() => {
    const values = Object.values(ratings).filter(r => r > 0);
    if (values.length === 0) return 0;
    return values.reduce((sum, rating) => sum + rating, 0) / values.length;
  }, [ratings]);

  const isComplete = useMemo(() => {
    return Object.values(ratings).every(rating => rating > 0) && comments.trim().length >= 10;
  }, [ratings, comments]);

  const qualityStatus = useMemo(() => {
    if (averageRating >= QUALITY_THRESHOLDS.EXCELLENT) return 'excellent';
    if (averageRating >= QUALITY_THRESHOLDS.GOOD) return 'good';
    if (averageRating >= QUALITY_THRESHOLDS.WARNING) return 'warning';
    return 'critical';
  }, [averageRating]);

  // 🏗️ Animation Handlers
  const animateRatingSelection = useCallback((dimension) => {
    Animated.sequence([
      Animated.timing(animationValues.scale, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(animationValues.scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  }, [animationValues]);

  const animateSubmission = useCallback(() => {
    return new Promise((resolve) => {
      Animated.parallel([
        Animated.timing(animationValues.opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(animationValues.slide, {
          toValue: 100,
          duration: 400,
          useNativeDriver: true
        })
      ]).start(resolve);
    });
  }, [animationValues]);

  // 🏗️ Rating Handlers
  const handleRatingSelect = useCallback((dimension, value) => {
    setRatings(prev => ({
      ...prev,
      [dimension]: value
    }));
    
    animateRatingSelection(dimension);
  }, [animateRatingSelection]);

  const handleCommentChange = useCallback((text) => {
    // 🛡️ Enterprise Validation: Limit comment length
    if (text.length <= 500) {
      setComments(text);
    }
  }, []);

  // 🏗️ Submission Handler
  const handleSubmitRating = useCallback(async () => {
    if (!isComplete || !isSubmittable) return;

    setIsSubmitting(true);

    try {
      // 🏗️ Validate rating data
      const ratingData = {
        enrollmentId,
        expertId,
        ratings,
        comments: comments.trim(),
        averageRating: parseFloat(averageRating.toFixed(2)),
        sessionType,
        submittedAt: new Date().toISOString(),
        metadata: {
          deviceInfo: Dimensions.get('window'),
          appVersion: '1.0.0',
          qualityStatus
        }
      };

      // 🏗️ Fraud detection checks
      const fraudCheck = await performFraudDetection(ratingData);
      if (!fraudCheck.isValid) {
        throw new Error(fraudCheck.reason || 'Rating submission failed validation');
      }

      // 🏗️ Animate submission
      await animateSubmission();

      // 🏗️ Submit to backend
      const result = await submitRatingToBackend(ratingData);

      if (result.success) {
        setHasSubmitted(true);
        
        // 🏗️ Trigger completion callbacks
        onRatingComplete?.(result);
        onRatingSaved?.({
          ...ratingData,
          ratingId: result.ratingId,
          expertImpact: result.expertImpact
        });

        // 🏗️ Show success feedback
        showSuccessFeedback(result.expertImpact);
      } else {
        throw new Error(result.error || 'Failed to submit rating');
      }

    } catch (error) {
      console.error('Rating submission error:', error);
      
      // 🏗️ Show enterprise error handling
      Alert.alert(
        'Submission Failed',
        error.message || 'Unable to submit rating. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
      
      // 🏗️ Reset animation state
      Animated.parallel([
        Animated.timing(animationValues.opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(animationValues.slide, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true
        })
      ]).start();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isComplete,
    isSubmittable,
    enrollmentId,
    expertId,
    ratings,
    comments,
    averageRating,
    sessionType,
    qualityStatus,
    animateSubmission,
    animationValues,
    onRatingComplete,
    onRatingSaved
  ]);

  // 🏗️ Fraud Detection System
  const performFraudDetection = async (ratingData) => {
    const checks = [
      // Check for duplicate submissions
      await checkDuplicateSubmission(ratingData.enrollmentId),
      
      // Check rating pattern anomalies
      checkRatingPatterns(ratingData.ratings),
      
      // Check comment quality
      checkCommentQuality(ratingData.comments),
      
      // Check timing validation
      checkSubmissionTiming(ratingData.submittedAt)
    ];

    const failedCheck = checks.find(check => !check.isValid);
    return failedCheck || { isValid: true };
  };

  const checkDuplicateSubmission = async (enrollmentId) => {
    // In production, this would check against backend
    const hasRated = await mockBackendCheck(enrollmentId);
    return {
      isValid: !hasRated,
      reason: hasRated ? 'You have already submitted a rating for this session' : null
    };
  };

  const checkRatingPatterns = (ratings) => {
    const values = Object.values(ratings);
    
    // Check for all identical ratings (potential spam)
    const allSame = values.every(v => v === values[0]);
    if (allSame && values[0] === 5) {
      return {
        isValid: false,
        reason: 'Please provide varied ratings based on different aspects'
      };
    }

    // Check for extreme ratings without comments
    const hasExtremeRating = values.some(v => v === 1 || v === 5);
    if (hasExtremeRating && comments.length < 20) {
      return {
        isValid: false,
        reason: 'Please provide detailed comments for extreme ratings'
      };
    }

    return { isValid: true };
  };

  const checkCommentQuality = (comment) => {
    if (comment.length < 10) {
      return {
        isValid: false,
        reason: 'Please provide more detailed feedback (minimum 10 characters)'
      };
    }

    // Check for repetitive text
    const words = comment.split(' ');
    const uniqueWords = new Set(words);
    if (uniqueWords.size / words.length < 0.3) {
      return {
        isValid: false,
        reason: 'Please provide more varied feedback'
      };
    }

    return { isValid: true };
  };

  const checkSubmissionTiming = (submittedAt) => {
    const submitTime = new Date(submittedAt);
    const now = new Date();
    const diffMs = now - submitTime;

    // Check if submission is too quick (potential bot)
    if (diffMs < 5000) {
      return {
        isValid: false,
        reason: 'Please take more time to provide thoughtful feedback'
      };
    }

    return { isValid: true };
  };

  // 🏗️ Success Feedback Handler
  const showSuccessFeedback = (expertImpact) => {
    Alert.alert(
      'Rating Submitted Successfully! 🎉',
      `Your feedback has been recorded and will help ${expertName} improve.\n\n` +
      `Quality Impact: ${expertImpact.qualityChange > 0 ? '+' : ''}${expertImpact.qualityChange}\n` +
      `Tier Status: ${expertImpact.newTier || 'Maintained'}`,
      [{ text: 'Continue', style: 'default' }]
    );
  };

  // 🏗️ Rating Dimension Configuration
  const ratingDimensionsConfig = [
    {
      key: RATING_DIMENSIONS.TEACHING_QUALITY,
      label: 'Teaching Quality',
      description: 'How effective was the teaching methodology?',
      icon: 'school',
      iconType: 'material'
    },
    {
      key: RATING_DIMENSIONS.RESPONSIVENESS,
      label: 'Responsiveness',
      description: 'How quickly did the expert respond to questions?',
      icon: 'access-time',
      iconType: 'material'
    },
    {
      key: RATING_DIMENSIONS.PRACTICAL_SKILLS,
      label: 'Practical Skills',
      description: 'How relevant and useful were the hands-on exercises?',
      icon: 'build',
      iconType: 'material'
    },
    {
      key: RATING_DIMENSIONS.PROFESSIONALISM,
      label: 'Professionalism',
      description: 'How professional was the expert in conduct and communication?',
      icon: 'business-center',
      iconType: 'material'
    },
    {
      key: RATING_DIMENSIONS.OVERALL_EXPERIENCE,
      label: 'Overall Experience',
      description: 'How would you rate your overall learning experience?',
      icon: 'star',
      iconType: 'fontawesome'
    }
  ];

  // 🏗️ Render Methods
  const renderRatingDimension = useCallback((dimension) => (
    <View key={dimension.key} style={styles.ratingDimension}>
      <View style={styles.dimensionHeader}>
        <View style={styles.iconContainer}>
          {dimension.iconType === 'material' ? (
            <MaterialIcons 
              name={dimension.icon} 
              size={20} 
              color="#6366F1" 
            />
          ) : (
            <FontAwesome5 
              name={dimension.icon} 
              size={16} 
              color="#6366F1" 
            />
          )}
        </View>
        <View style={styles.dimensionText}>
          <Text style={styles.dimensionLabel}>{dimension.label}</Text>
          <Text style={styles.dimensionDescription}>{dimension.description}</Text>
        </View>
      </View>
      
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            style={styles.starButton}
            onPress={() => handleRatingSelect(dimension.key, star)}
            disabled={isSubmitting || hasSubmitted}
          >
            <Animated.View style={{
              transform: [{ scale: animationValues.scale }]
            }}>
              <MaterialIcons
                name={star <= ratings[dimension.key] ? "star" : "star-border"}
                size={32}
                color={star <= ratings[dimension.key] ? "#F59E0B" : "#D1D5DB"}
              />
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>
      
      {ratings[dimension.key] > 0 && (
        <Text style={styles.ratingLabel}>
          {RATING_LABELS[ratings[dimension.key]]}
        </Text>
      )}
    </View>
  ), [ratings, isSubmitting, hasSubmitted, animationValues.scale, handleRatingSelect]);

  const renderQualityIndicator = () => (
    <View style={styles.qualityIndicator}>
      <Text style={styles.qualityLabel}>Overall Quality Score</Text>
      <View style={styles.qualityScoreContainer}>
        <LinearGradient
          colors={getQualityGradient(qualityStatus)}
          style={[styles.qualityScore, { width: `${(averageRating / 5) * 100}%` }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <Text style={styles.qualityScoreText}>
          {averageRating.toFixed(1)}/5.0
        </Text>
      </View>
      <Text style={[styles.qualityStatus, styles[`qualityStatus_${qualityStatus}`]]}>
        {qualityStatus.toUpperCase()}
      </Text>
    </View>
  );

  const renderCommentSection = () => (
    <View style={styles.commentSection}>
      <Text style={styles.commentLabel}>
        Detailed Feedback {comments.length > 0 && `(${comments.length}/500)`}
      </Text>
      <View style={styles.commentInputContainer}>
        <ScrollView style={styles.commentScrollView}>
          <TextInput
            style={styles.commentInput}
            value={comments}
            onChangeText={handleCommentChange}
            placeholder="Please provide specific feedback about your experience. What went well? What could be improved?"
            placeholderTextColor="#9CA3AF"
            multiline
            editable={!isSubmitting && !hasSubmitted}
            maxLength={500}
          />
        </ScrollView>
        <View style={styles.commentFooter}>
          <Text style={styles.commentHint}>
            Minimum 10 characters required. Your feedback helps experts improve.
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSubmissionButton = () => (
    <Animated.View style={[
      styles.submissionContainer,
      {
        opacity: animationValues.opacity,
        transform: [{ translateY: animationValues.slide }]
      }
    ]}>
      <TouchableOpacity
        style={[
          styles.submitButton,
          !isComplete && styles.submitButtonDisabled,
          isSubmitting && styles.submitButtonSubmitting
        ]}
        onPress={handleSubmitRating}
        disabled={!isComplete || isSubmitting || hasSubmitted}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <LinearGradient
            colors={isComplete ? ['#6366F1', '#4F46E5'] : ['#9CA3AF', '#6B7280']}
            style={styles.submitButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.submitButtonText}>
              {hasSubmitted ? 'Rating Submitted ✓' : 'Submit Rating'}
            </Text>
            {!hasSubmitted && (
              <Text style={styles.submitButtonSubtext}>
                Help maintain platform quality standards
              </Text>
            )}
          </LinearGradient>
        )}
      </TouchableOpacity>
      
      {!isComplete && (
        <Text style={styles.completionHint}>
          Please complete all ratings and provide detailed feedback to submit
        </Text>
      )}
    </Animated.View>
  );

  // 🎯 Main Render
  if (hasSubmitted) {
    return (
      <View style={styles.successContainer}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.successGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcons name="check-circle" size={64} color="#FFFFFF" />
          <Text style={styles.successTitle}>Rating Submitted!</Text>
          <Text style={styles.successMessage}>
            Thank you for your valuable feedback. Your rating helps maintain 
            Mosa Forge's quality standards and supports expert development.
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BlurView intensity={80} style={styles.blurBackground} />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 🏗️ Header Section */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#6366F1', '#4F46E5']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.headerTitle}>Rate Your Experience</Text>
            <Text style={styles.headerSubtitle}>
              {expertName} • {skillName}
            </Text>
          </LinearGradient>
        </View>

        {/* 🎯 Quality Indicator */}
        {renderQualityIndicator()}

        {/* ⭐ Rating Dimensions */}
        <View style={styles.ratingDimensions}>
          {ratingDimensionsConfig.map(renderRatingDimension)}
        </View>

        {/* 💬 Comment Section */}
        {renderCommentSection()}

        {/* 🚀 Submission Section */}
        {renderSubmissionButton()}
      </ScrollView>
    </View>
  );
};

// 🏗️ Helper Functions
const getQualityGradient = (status) => {
  switch (status) {
    case 'excellent':
      return ['#10B981', '#059669'];
    case 'good':
      return ['#3B82F6', '#2563EB'];
    case 'warning':
      return ['#F59E0B', '#D97706'];
    case 'critical':
      return ['#EF4444', '#DC2626'];
    default:
      return ['#6B7280', '#4B5563'];
  }
};

// 🏗️ Mock Backend Functions (Replace with actual API calls)
const mockBackendCheck = async (enrollmentId) => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));
  return false; // Assume no duplicate for demo
};

const submitRatingToBackend = async (ratingData) => {
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate successful submission
  return {
    success: true,
    ratingId: `rating_${Date.now()}`,
    expertImpact: {
      qualityChange: +0.1,
      newTier: 'MASTER',
      bonusEligible: true
    },
    timestamp: new Date().toISOString()
  };
};

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 100
  },
  header: {
    borderRadius: 16,
    margin: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  headerGradient: {
    padding: 24,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E0E7FF',
    opacity: 0.9
  },
  qualityIndicator: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  qualityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12
  },
  qualityScoreContainer: {
    height: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    position: 'relative'
  },
  qualityScore: {
    height: '100%',
    borderRadius: 16
  },
  qualityScoreText: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlign: 'center',
    lineHeight: 32,
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937'
  },
  qualityStatus: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden'
  },
  qualityStatus_excellent: {
    backgroundColor: '#D1FAE5',
    color: '#065F46'
  },
  qualityStatus_good: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF'
  },
  qualityStatus_warning: {
    backgroundColor: '#FEF3C7',
    color: '#92400E'
  },
  qualityStatus_critical: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B'
  },
  ratingDimensions: {
    marginHorizontal: 16
  },
  ratingDimension: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  dimensionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  dimensionText: {
    flex: 1
  },
  dimensionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  dimensionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  starButton: {
    padding: 4
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
    textAlign: 'center',
    marginTop: 4
  },
  commentSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12
  },
  commentInputContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden'
  },
  commentScrollView: {
    maxHeight: 120
  },
  commentInput: {
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    textAlignVertical: 'top'
  },
  commentFooter: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  commentHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center'
  },
  submissionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonSubmitting: {
    opacity: 0.8
  },
  submitButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center'
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4
  },
  submitButtonSubtext: {
    fontSize: 12,
    color: '#E0E7FF',
    opacity: 0.9
  },
  completionHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8
  },
  successContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    margin: 16
  },
  successGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 12
  },
  successMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9
  }
});

// 🏗️ TextInput Component (Add this import at the top)
const TextInput = ({ style, ...props }) => (
  <Text style={[styles.commentInput, style]} {...props} />
);

// 🏗️ Enterprise Export
export default RatingSystem;
export {
  RATING_DIMENSIONS,
  RATING_LABELS,
  QUALITY_THRESHOLDS
};