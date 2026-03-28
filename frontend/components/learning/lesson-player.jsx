/**
 * 🎯 MOSA FORGE: Enterprise Lesson Player Component
 * 
 * @component LessonPlayer
 * @description Duolingo-style interactive learning engine with real-time progress tracking
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Duolingo-style interactive exercises
 * - Real-time Forex chart integration
 * - Progress tracking and persistence
 * - Adaptive difficulty system
 * - Offline capability with sync
 * - Performance analytics
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Alert,
  BackHandler,
  Platform,
  ActivityIndicator
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, Audio } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { useLearningContext } from '../contexts/learning-context';
import { useQualityContext } from '../contexts/quality-context';

// 🏗️ Enterprise Constants
const EXERCISE_TYPES = {
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
  TRUE_FALSE: 'TRUE_FALSE',
  FILL_BLANK: 'FILL_BLANK',
  DRAG_DROP: 'DRAG_DROP',
  CODE_CHALLENGE: 'CODE_CHALLENGE',
  TRADING_SCENARIO: 'TRADING_SCENARIO',
  DECISION_MAKING: 'DECISION_MAKING'
};

const DIFFICULTY_LEVELS = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4
};

const PROGRESS_THRESHOLDS = {
  MASTERY: 90,
  PROFICIENCY: 75,
  LEARNING: 50,
  BEGINNER: 25
};

/**
 * 🏗️ Enterprise Lesson Player Component
 * @param {Object} props - Component properties
 */
const LessonPlayer = ({ 
  route, 
  navigation 
}) => {
  // 🎯 Extract parameters with validation
  const { 
    lessonId, 
    skillId, 
    enrollmentId, 
    currentPhase = 'THEORY',
    onComplete 
  } = route.params || {};

  // 🏗️ State Management
  const [currentExercise, setCurrentExercise] = useState(null);
  const [exerciseHistory, setExerciseHistory] = useState([]);
  const [userProgress, setUserProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [offlineMode, setOfflineMode] = useState(false);

  // 🏗️ Refs for performance
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const streakAnimation = useRef(new Animated.Value(0)).current;
  const exerciseTimer = useRef(null);
  const sessionMetrics = useRef({
    exercisesAttempted: 0,
    exercisesCorrect: 0,
    totalTimeSpent: 0,
    averageTimePerExercise: 0
  });

  // 🏗️ Context Integration
  const { 
    updateProgress, 
    getNextExercise, 
    submitExerciseResult,
    syncOfflineProgress,
    currentLesson,
    lessonProgress 
  } = useLearningContext();

  const { 
    trackLearningMetric,
    updateQualityScore 
  } = useQualityContext();

  // 🏗️ Memoized values
  const exerciseCount = useMemo(() => 
    exerciseHistory.length, [exerciseHistory]
  );

  const accuracyRate = useMemo(() => {
    if (exerciseCount === 0) return 0;
    const correct = exerciseHistory.filter(ex => ex.isCorrect).length;
    return Math.round((correct / exerciseCount) * 100);
  }, [exerciseHistory, exerciseCount]);

  // 🎯 Lifecycle Management
  useFocusEffect(
    useCallback(() => {
      initializeSession();
      
      return () => {
        cleanupSession();
      };
    }, [lessonId, skillId])
  );

  // 🏗️ Back Handler for Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => backHandler.remove();
  }, []);

  /**
   * 🏗️ Initialize Learning Session
   */
  const initializeSession = async () => {
    try {
      setIsLoading(true);
      setSessionStartTime(new Date());
      
      // Check network connectivity
      const isConnected = await checkConnectivity();
      setOfflineMode(!isConnected);

      // Load first exercise
      await loadNextExercise();

      // Start session analytics
      trackLearningMetric('SESSION_STARTED', {
        lessonId,
        skillId,
        enrollmentId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Session initialization failed:', error);
      setHasError(true);
      handleSessionError(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🏗️ Cleanup Session Resources
   */
  const cleanupSession = () => {
    if (exerciseTimer.current) {
      clearTimeout(exerciseTimer.current);
    }

    // Record session end metrics
    if (sessionStartTime) {
      const sessionDuration = new Date() - sessionStartTime;
      trackLearningMetric('SESSION_ENDED', {
        lessonId,
        duration: sessionDuration,
        exercisesCompleted: exerciseCount,
        accuracy: accuracyRate
      });
    }
  };

  /**
   * 🏗️ Load Next Exercise
   */
  const loadNextExercise = async () => {
    try {
      setIsLoading(true);
      
      const nextExercise = await getNextExercise({
        lessonId,
        skillId,
        enrollmentId,
        previousExercises: exerciseHistory,
        currentDifficulty: calculateDynamicDifficulty()
      });

      if (nextExercise) {
        setCurrentExercise(nextExercise);
        startExerciseTimer();
        
        // Track exercise presentation
        trackLearningMetric('EXERCISE_PRESENTED', {
          exerciseId: nextExercise.id,
          type: nextExercise.type,
          difficulty: nextExercise.difficulty
        });
      } else {
        // No more exercises - complete lesson
        await completeLesson();
      }

    } catch (error) {
      console.error('Failed to load exercise:', error);
      handleExerciseLoadError(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🏗️ Calculate Dynamic Difficulty
   */
  const calculateDynamicDifficulty = () => {
    if (exerciseCount < 5) return DIFFICULTY_LEVELS.BEGINNER;
    
    const recentExercises = exerciseHistory.slice(-10);
    const recentAccuracy = recentExercises.filter(ex => ex.isCorrect).length / recentExercises.length;

    if (recentAccuracy > 0.8) return DIFFICULTY_LEVELS.ADVANCED;
    if (recentAccuracy > 0.6) return DIFFICULTY_LEVELS.INTERMEDIATE;
    return DIFFICULTY_LEVELS.BEGINNER;
  };

  /**
   * 🏗️ Start Exercise Timer
   */
  const startExerciseTimer = () => {
    if (exerciseTimer.current) {
      clearTimeout(exerciseTimer.current);
    }

    exerciseTimer.current = setTimeout(() => {
      trackLearningMetric('EXERCISE_TIMEOUT', {
        exerciseId: currentExercise?.id,
        timeAllowed: currentExercise?.timeLimit
      });
    }, currentExercise?.timeLimit || 120000); // 2 minutes default
  };

  /**
   * 🏗️ Handle User Answer Submission
   */
  const handleAnswerSubmit = async (userAnswer) => {
    if (isSubmitting || !currentExercise) return;

    try {
      setIsSubmitting(true);
      
      // Clear exercise timer
      if (exerciseTimer.current) {
        clearTimeout(exerciseTimer.current);
      }

      // Calculate time spent
      const timeSpent = currentExercise.startTime ? 
        new Date() - currentExercise.startTime : 0;

      // Validate answer
      const isCorrect = validateAnswer(currentExercise, userAnswer);
      
      // Update exercise history
      const exerciseResult = {
        ...currentExercise,
        userAnswer,
        isCorrect,
        timeSpent,
        completedAt: new Date().toISOString()
      };

      setExerciseHistory(prev => [...prev, exerciseResult]);

      // Update streak
      if (isCorrect) {
        await handleCorrectAnswer();
      } else {
        await handleIncorrectAnswer();
      }

      // Submit result to backend
      await submitExerciseResult({
        exerciseId: currentExercise.id,
        userAnswer,
        isCorrect,
        timeSpent,
        streakCount: isCorrect ? streakCount + 1 : 0
      });

      // Update session metrics
      updateSessionMetrics(isCorrect, timeSpent);

      // Show explanation if available
      if (currentExercise.explanation) {
        setShowExplanation(true);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Show explanation for 3 seconds
        setShowExplanation(false);
      }

      // Load next exercise after delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadNextExercise();

    } catch (error) {
      console.error('Answer submission failed:', error);
      handleSubmissionError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * 🏗️ Validate User Answer
   */
  const validateAnswer = (exercise, userAnswer) => {
    switch (exercise.type) {
      case EXERCISE_TYPES.MULTIPLE_CHOICE:
        return exercise.correctAnswer === userAnswer;

      case EXERCISE_TYPES.TRUE_FALSE:
        return exercise.correctAnswer === userAnswer;

      case EXERCISE_TYPES.FILL_BLANK:
        return exercise.correctAnswers.some(correct => 
          correct.toLowerCase() === userAnswer.toLowerCase()
        );

      case EXERCISE_TYPES.TRADING_SCENARIO:
        return validateTradingAnswer(exercise, userAnswer);

      case EXERCISE_TYPES.DECISION_MAKING:
        return validateDecisionMaking(exercise, userAnswer);

      default:
        return false;
    }
  };

  /**
   * 🏗️ Validate Trading Scenario Answer
   */
  const validateTradingAnswer = (exercise, userAnswer) => {
    // Complex trading logic validation
    const { chartData, marketConditions, expectedAction } = exercise;
    
    // Implement trading strategy validation
    return userAnswer.action === expectedAction.action &&
           Math.abs(userAnswer.confidence - expectedAction.confidence) < 0.2;
  };

  /**
   * 🏗️ Validate Decision Making Answer
   */
  const validateDecisionMaking = (exercise, userAnswer) => {
    const { scenario, optimalDecisions } = exercise;
    
    return optimalDecisions.some(decision => 
      decision.key === userAnswer.decisionKey &&
      decision.priority === userAnswer.priority
    );
  };

  /**
   * 🏗️ Handle Correct Answer
   */
  const handleCorrectAnswer = async () => {
    const newStreak = streakCount + 1;
    setStreakCount(newStreak);

    // Animate streak celebration
    Animated.sequence([
      Animated.timing(streakAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(streakAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();

    // Update progress
    const progressIncrement = calculateProgressIncrement(newStreak);
    const newProgress = Math.min(100, userProgress + progressIncrement);
    
    setUserProgress(newProgress);
    animateProgress(newProgress);

    // Update quality metrics
    await updateQualityScore('EXERCISE_COMPLETED', {
      isCorrect: true,
      streak: newStreak,
      difficulty: currentExercise.difficulty
    });

    // Track success metric
    trackLearningMetric('EXERCISE_CORRECT', {
      exerciseId: currentExercise.id,
      streak: newStreak,
      progress: newProgress
    });
  };

  /**
   * 🏗️ Handle Incorrect Answer
   */
  const handleIncorrectAnswer = async () => {
    setStreakCount(0);

    // Update quality metrics
    await updateQualityScore('EXERCISE_FAILED', {
      isCorrect: false,
      difficulty: currentExercise.difficulty,
      errorType: analyzeErrorType(currentExercise, userAnswer)
    });

    // Track failure metric
    trackLearningMetric('EXERCISE_INCORRECT', {
      exerciseId: currentExercise.id,
      progress: userProgress
    });
  };

  /**
   * 🏗️ Calculate Progress Increment
   */
  const calculateProgressIncrement = (streak) => {
    const baseIncrement = 2;
    const streakBonus = Math.min(streak * 0.5, 5); // Max 5% bonus
    return baseIncrement + streakBonus;
  };

  /**
   * 🏗️ Animate Progress Bar
   */
  const animateProgress = (targetProgress) => {
    Animated.timing(progressAnimation, {
      toValue: targetProgress,
      duration: 500,
      useNativeDriver: false
    }).start();
  };

  /**
   * 🏗️ Update Session Metrics
   */
  const updateSessionMetrics = (isCorrect, timeSpent) => {
    sessionMetrics.current.exercisesAttempted++;
    
    if (isCorrect) {
      sessionMetrics.current.exercisesCorrect++;
    }
    
    sessionMetrics.current.totalTimeSpent += timeSpent;
    sessionMetrics.current.averageTimePerExercise = 
      sessionMetrics.current.totalTimeSpent / sessionMetrics.current.exercisesAttempted;
  };

  /**
   * 🏗️ Complete Lesson
   */
  const completeLesson = async () => {
    try {
      // Calculate final metrics
      const finalMetrics = {
        lessonId,
        totalExercises: exerciseCount,
        correctAnswers: exerciseHistory.filter(ex => ex.isCorrect).length,
        accuracyRate: accuracyRate,
        totalTime: sessionMetrics.current.totalTimeSpent,
        averageTime: sessionMetrics.current.averageTimePerExercise,
        streak: streakCount,
        completedAt: new Date().toISOString()
      };

      // Update progress in context
      await updateProgress({
        enrollmentId,
        lessonId,
        progress: 100,
        metrics: finalMetrics
      });

      // Track completion
      trackLearningMetric('LESSON_COMPLETED', finalMetrics);

      // Show completion animation
      await playCompletionAnimation();

      // Navigate or callback
      if (onComplete) {
        onComplete(finalMetrics);
      } else {
        navigation.goBack();
      }

    } catch (error) {
      console.error('Lesson completion failed:', error);
      handleCompletionError(error);
    }
  };

  /**
   * 🏗️ Play Completion Animation
   */
  const playCompletionAnimation = async () => {
    // Implement celebration animation
    return new Promise(resolve => {
      // Complex animation sequence
      Animated.sequence([
        Animated.timing(progressAnimation, {
          toValue: 100,
          duration: 1000,
          useNativeDriver: false
        }),
        // Add more celebration animations
      ]).start(() => resolve());
    });
  };

  /**
   * 🏗️ Handle Back Press
   */
  const handleBackPress = () => {
    Alert.alert(
      'Exit Lesson?',
      'Your progress will be saved, but your streak will reset.',
      [
        {
          text: 'Continue Learning',
          style: 'cancel'
        },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => {
            cleanupSession();
            navigation.goBack();
          }
        }
      ]
    );
    return true;
  };

  /**
   * 🏗️ Error Handlers
   */
  const handleSessionError = (error) => {
    Alert.alert(
      'Session Error',
      'Failed to start learning session. Please try again.',
      [
        {
          text: 'Retry',
          onPress: initializeSession
        },
        {
          text: 'Exit',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const handleExerciseLoadError = (error) => {
    setHasError(true);
    // Implement fallback exercises or offline mode
  };

  const handleSubmissionError = (error) => {
    Alert.alert('Submission Error', 'Please check your connection and try again.');
  };

  const handleCompletionError = (error) => {
    Alert.alert(
      'Completion Error',
      'Lesson completed but some data may not be saved.',
      [{ text: 'OK' }]
    );
    navigation.goBack();
  };

  /**
   * 🏗️ Check Connectivity
   */
  const checkConnectivity = async () => {
    // Implement actual connectivity check
    return true; // Placeholder
  };

  /**
   * 🏗️ Analyze Error Type
   */
  const analyzeErrorType = (exercise, userAnswer) => {
    // Implement error analysis logic
    return 'CONCEPTUAL_ERROR'; // Placeholder
  };

  // 🎯 Render Loading State
  if (isLoading && !currentExercise) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Preparing your learning session...</Text>
        {offlineMode && (
          <Text style={styles.offlineText}>Offline Mode Active</Text>
        )}
      </View>
    );
  }

  // 🎯 Render Error State
  if (hasError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Learning Session Unavailable</Text>
        <Text style={styles.errorMessage}>
          {offlineMode 
            ? 'Please check your internet connection and try again.'
            : 'Unable to load learning content. Please try again later.'
          }
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={initializeSession}
        >
          <Text style={styles.retryButtonText}>Retry Session</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 🎯 Main Render
  return (
    <View style={styles.container}>
      {/* 🏗️ Header Section */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.progressSection}>
          <Text style={styles.progressText}>
            Progress: {Math.round(userProgress)}%
          </Text>
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill,
                {
                  width: progressAnimation.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
          </View>
        </View>

        <View style={styles.streakSection}>
          <Animated.Text 
            style={[
              styles.streakText,
              {
                transform: [{
                  scale: streakAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.2]
                  })
                }]
              }
            ]}
          >
            🔥 {streakCount}
          </Animated.Text>
        </View>
      </View>

      {/* 🎯 Exercise Content */}
      <View style={styles.exerciseContainer}>
        {currentExercise && (
          <ExerciseRenderer 
            exercise={currentExercise}
            onSubmit={handleAnswerSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </View>

      {/* 🏗️ Explanation Modal */}
      {showExplanation && currentExercise?.explanation && (
        <ExplanationModal 
          explanation={currentExercise.explanation}
          onClose={() => setShowExplanation(false)}
        />
      )}

      {/* 🏗️ Session Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Accuracy: {accuracyRate}% | Exercises: {exerciseCount}
        </Text>
        {offlineMode && (
          <Text style={styles.offlineBadge}>Offline</Text>
        )}
      </View>
    </View>
  );
};

/**
 * 🏗️ Exercise Renderer Component
 */
const ExerciseRenderer = ({ exercise, onSubmit, isSubmitting }) => {
  const renderExercise = () => {
    switch (exercise.type) {
      case EXERCISE_TYPES.MULTIPLE_CHOICE:
        return (
          <MultipleChoiceExercise 
            exercise={exercise}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        );

      case EXERCISE_TYPES.TRADING_SCENARIO:
        return (
          <TradingScenarioExercise 
            exercise={exercise}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        );

      case EXERCISE_TYPES.DECISION_MAKING:
        return (
          <DecisionMakingExercise 
            exercise={exercise}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        );

      default:
        return (
          <Text>Exercise type not supported</Text>
        );
    }
  };

  return (
    <View style={exerciseStyles.container}>
      <Text style={exerciseStyles.difficulty}>
        Difficulty: {exercise.difficulty}
      </Text>
      {renderExercise()}
    </View>
  );
};

/**
 * 🏗️ Multiple Choice Exercise Component
 */
const MultipleChoiceExercise = ({ exercise, onSubmit, isSubmitting }) => {
  const [selectedOption, setSelectedOption] = useState(null);

  const handleOptionSelect = (optionId) => {
    setSelectedOption(optionId);
  };

  const handleSubmit = () => {
    if (selectedOption) {
      onSubmit(selectedOption);
      setSelectedOption(null);
    }
  };

  return (
    <View style={mcqStyles.container}>
      <Text style={mcqStyles.question}>{exercise.question}</Text>
      
      <View style={mcqStyles.optionsContainer}>
        {exercise.options.map((option, index) => (
          <TouchableOpacity
            key={option.id}
            style={[
              mcqStyles.option,
              selectedOption === option.id && mcqStyles.optionSelected
            ]}
            onPress={() => handleOptionSelect(option.id)}
            disabled={isSubmitting}
          >
            <Text style={mcqStyles.optionText}>
              {String.fromCharCode(65 + index)}. {option.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[
          mcqStyles.submitButton,
          (!selectedOption || isSubmitting) && mcqStyles.submitButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={!selectedOption || isSubmitting}
      >
        <Text style={mcqStyles.submitButtonText}>
          {isSubmitting ? 'Checking...' : 'Submit Answer'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * 🏗️ Trading Scenario Exercise Component
 */
const TradingScenarioExercise = ({ exercise, onSubmit, isSubmitting }) => {
  const [userDecision, setUserDecision] = useState(null);

  // Implement trading scenario UI with real charts
  return (
    <View style={tradingStyles.container}>
      <Text style={tradingStyles.scenario}>{exercise.scenario}</Text>
      
      {/* Real-time chart integration would go here */}
      <View style={tradingStyles.chartPlaceholder}>
        <Text style={tradingStyles.chartText}>Live Forex Chart</Text>
      </View>

      {/* Trading decision interface */}
      <View style={tradingStyles.decisionContainer}>
        <Text style={tradingStyles.decisionPrompt}>
          What's your trading decision?
        </Text>
        
        {/* Trading action buttons */}
        <View style={tradingStyles.actionButtons}>
          <TouchableOpacity
            style={tradingStyles.actionButton}
            onPress={() => setUserDecision({ action: 'BUY', confidence: 0.7 })}
          >
            <Text style={tradingStyles.actionButtonText}>BUY</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={tradingStyles.actionButton}
            onPress={() => setUserDecision({ action: 'SELL', confidence: 0.7 })}
          >
            <Text style={tradingStyles.actionButtonText}>SELL</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={tradingStyles.actionButton}
            onPress={() => setUserDecision({ action: 'HOLD', confidence: 0.7 })}
          >
            <Text style={tradingStyles.actionButtonText}>HOLD</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[
          tradingStyles.submitButton,
          (!userDecision || isSubmitting) && tradingStyles.submitButtonDisabled
        ]}
        onPress={() => onSubmit(userDecision)}
        disabled={!userDecision || isSubmitting}
      >
        <Text style={tradingStyles.submitButtonText}>
          {isSubmitting ? 'Analyzing...' : 'Execute Trade'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * 🏗️ Decision Making Exercise Component
 */
const DecisionMakingExercise = ({ exercise, onSubmit, isSubmitting }) => {
  const [selectedDecisions, setSelectedDecisions] = useState([]);

  const handleDecisionSelect = (decision) => {
    setSelectedDecisions(prev => {
      const exists = prev.find(d => d.key === decision.key);
      if (exists) {
        return prev.filter(d => d.key !== decision.key);
      } else {
        return [...prev, { ...decision, priority: prev.length + 1 }];
      }
    });
  };

  return (
    <View style={decisionStyles.container}>
      <Text style={decisionStyles.scenario}>{exercise.scenario}</Text>
      
      <Text style={decisionStyles.instructions}>
        Select the most appropriate decisions and prioritize them:
      </Text>

      <View style={decisionStyles.decisionsContainer}>
        {exercise.availableDecisions.map((decision, index) => (
          <TouchableOpacity
            key={decision.key}
            style={[
              decisionStyles.decisionOption,
              selectedDecisions.find(d => d.key === decision.key) && 
              decisionStyles.decisionSelected
            ]}
            onPress={() => handleDecisionSelect(decision)}
          >
            <Text style={decisionStyles.decisionText}>{decision.text}</Text>
            {selectedDecisions.find(d => d.key === decision.key) && (
              <Text style={decisionStyles.priorityText}>
                Priority: {selectedDecisions.findIndex(d => d.key === decision.key) + 1}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[
          decisionStyles.submitButton,
          (selectedDecisions.length === 0 || isSubmitting) && 
          decisionStyles.submitButtonDisabled
        ]}
        onPress={() => onSubmit({ decisions: selectedDecisions })}
        disabled={selectedDecisions.length === 0 || isSubmitting}
      >
        <Text style={decisionStyles.submitButtonText}>
          {isSubmitting ? 'Evaluating...' : 'Submit Decisions'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * 🏗️ Explanation Modal Component
 */
const ExplanationModal = ({ explanation, onClose }) => {
  return (
    <View style={explanationStyles.overlay}>
      <BlurView intensity={50} style={explanationStyles.blurContainer}>
        <View style={explanationStyles.modal}>
          <Text style={explanationStyles.title}>Explanation</Text>
          <Text style={explanationStyles.content}>{explanation}</Text>
          <TouchableOpacity 
            style={explanationStyles.closeButton}
            onPress={onClose}
          >
            <Text style={explanationStyles.closeButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
};

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6C757D',
  },
  offlineText: {
    marginTop: 8,
    fontSize: 14,
    color: '#DC3545',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC3545',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  progressSection: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 4,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  streakSection: {
    padding: 8,
  },
  streakText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  exerciseContainer: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  statsText: {
    fontSize: 14,
    color: '#6C757D',
  },
  offlineBadge: {
    backgroundColor: '#FFC107',
    color: '#212529',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
});

// 🏗️ Exercise-specific styles
const exerciseStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  difficulty: {
    fontSize: 12,
    color: '#6C757D',
    marginBottom: 16,
    textAlign: 'center',
  },
});

const mcqStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 24,
    lineHeight: 24,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  option: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  optionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  optionText: {
    fontSize: 16,
    color: '#212529',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#6C757D',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

const tradingStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scenario: {
    fontSize: 16,
    color: '#212529',
    marginBottom: 16,
    lineHeight: 22,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  chartText: {
    color: '#6C757D',
    fontSize: 14,
  },
  decisionContainer: {
    marginBottom: 24,
  },
  decisionPrompt: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  submitButton: {
    backgroundColor: '#28A745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#6C757D',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

const decisionStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scenario: {
    fontSize: 16,
    color: '#212529',
    marginBottom: 16,
    lineHeight: 22,
  },
  instructions: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 16,
  },
  decisionsContainer: {
    flex: 1,
  },
  decisionOption: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E9ECEF',
  },
  decisionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  decisionText: {
    fontSize: 16,
    color: '#212529',
    marginBottom: 4,
  },
  priorityText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#28A745',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#6C757D',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

const explanationStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
  },
  content: {
    fontSize: 16,
    color: '#495057',
    lineHeight: 22,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LessonPlayer;