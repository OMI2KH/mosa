/**
 * 🎯 MOSA FORGE: Enterprise Duolingo-Style Learning Interface
 * 
 * @module DuolingoInterface
 * @description Interactive exercise engine with real-time progress tracking
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Interactive exercise player with multiple question types
 * - Real-time progress tracking and adaptive learning
 * - Gamification with streaks, points, and achievements
 * - Offline capability with sync
 * - Performance analytics and A/B testing
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  AppState
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView, MotiText } from 'moti';
import { useSharedValue, withSpring } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';

// 🏗️ Enterprise Constants
const EXERCISE_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  FILL_IN_BLANK: 'fill_in_blank',
  DRAG_DROP: 'drag_drop',
  MATCHING: 'matching',
  CODE_COMPLETION: 'code_completion',
  TRADING_SCENARIO: 'trading_scenario',
  DECISION_TREE: 'decision_tree'
};

const DIFFICULTY_LEVELS = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4
};

const EXERCISE_STATES = {
  LOADING: 'loading',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PAUSED: 'paused'
};

/**
 * 🏗️ Enterprise Duolingo-Style Exercise Interface
 * @component DuolingoInterface
 */
const DuolingoInterface = ({ 
  exercise, 
  onComplete, 
  onProgress, 
  userId,
  enrollmentId,
  config = {} 
}) => {
  // 🏗️ State Management
  const [currentState, setCurrentState] = useState(EXERCISE_STATES.LOADING);
  const [userAnswer, setUserAnswer] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [streakCount, setStreakCount] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [exerciseProgress, setExerciseProgress] = useState(0);
  const [isCorrect, setIsCorrect] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // 🏗️ Animation Refs
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // 🏗️ Performance Tracking
  const startTimeRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const exerciseSessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // 🏗️ Configuration
  const defaultConfig = {
    enableHints: true,
    enableStreaks: true,
    enableSound: false,
    adaptiveDifficulty: true,
    timeLimit: null,
    maxAttempts: 3,
    showProgressBar: true,
    enableVibration: true
  };

  const mergedConfig = { ...defaultConfig, ...config };

  /**
   * 🏗️ Initialize Exercise Session
   */
  useEffect(() => {
    initializeExercise();
    startTimeRef.current = Date.now();

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      appStateSubscription.remove();
      trackExerciseAnalytics('session_ended');
    };
  }, []);

  /**
   * 🏗️ Handle App State Changes
   */
  const handleAppStateChange = useCallback((nextAppState) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      trackExerciseAnalytics('app_foreground');
    } else if (nextAppState.match(/inactive|background/)) {
      // App went to background
      trackExerciseAnalytics('app_background');
    }
    appStateRef.current = nextAppState;
  }, []);

  /**
   * 🏗️ Initialize Exercise
   */
  const initializeExercise = useCallback(async () => {
    try {
      setCurrentState(EXERCISE_STATES.LOADING);
      
      // Load user progress and preferences
      await loadUserProgress();
      
      // Initialize animations
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(progressAnim, {
          toValue: exerciseProgress,
          duration: 1000,
          useNativeDriver: false,
        })
      ]).start();

      setCurrentState(EXERCISE_STATES.ACTIVE);
      trackExerciseAnalytics('exercise_started');

    } catch (error) {
      console.error('Exercise initialization failed:', error);
      setCurrentState(EXERCISE_STATES.FAILED);
      trackExerciseAnalytics('initialization_failed', { error: error.message });
    }
  }, [exerciseProgress]);

  /**
   * 🏗️ Load User Progress
   */
  const loadUserProgress = async () => {
    // In production, this would fetch from your backend
    const userProgress = await AsyncStorage.getItem(`progress_${userId}_${enrollmentId}`);
    if (userProgress) {
      const progress = JSON.parse(userProgress);
      setStreakCount(progress.streakCount || 0);
      setExerciseProgress(progress.exerciseProgress || 0);
    }
  };

  /**
   * 🏗️ Handle Answer Selection
   */
  const handleAnswerSelect = useCallback(async (answer, optionIndex) => {
    if (currentState !== EXERCISE_STATES.ACTIVE) return;

    setSelectedOption(optionIndex);
    setUserAnswer(answer);

    // Visual feedback
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      })
    ]).start();

    // Check answer
    const correct = checkAnswer(answer);
    setIsCorrect(correct);

    if (correct) {
      await handleCorrectAnswer();
    } else {
      await handleIncorrectAnswer();
    }

    trackExerciseAnalytics('answer_submitted', { 
      correct, 
      timeSpent: Date.now() - startTimeRef.current,
      hintsUsed 
    });
  }, [currentState, hintsUsed]);

  /**
   * 🏗️ Check Answer with Advanced Validation
   */
  const checkAnswer = (userAnswer) => {
    if (!exercise || !exercise.correctAnswer) return false;

    switch (exercise.type) {
      case EXERCISE_TYPES.MULTIPLE_CHOICE:
        return userAnswer === exercise.correctAnswer;

      case EXERCISE_TYPES.FILL_IN_BLANK:
        return userAnswer.trim().toLowerCase() === exercise.correctAnswer.toLowerCase();

      case EXERCISE_TYPES.DRAG_DROP:
        return JSON.stringify(userAnswer) === JSON.stringify(exercise.correctAnswer);

      case EXERCISE_TYPES.MATCHING:
        return userAnswer.every((match, index) => 
          match.from === exercise.correctAnswer[index].from && 
          match.to === exercise.correctAnswer[index].to
        );

      case EXERCISE_TYPES.CODE_COMPLETION:
        return validateCodeAnswer(userAnswer, exercise.correctAnswer);

      case EXERCISE_TYPES.TRADING_SCENARIO:
        return validateTradingDecision(userAnswer, exercise.correctAnswer);

      default:
        return userAnswer === exercise.correctAnswer;
    }
  };

  /**
   * 🏗️ Validate Code Completion Answer
   */
  const validateCodeAnswer = (userCode, correctCode) => {
    // Normalize code for comparison
    const normalizeCode = (code) => 
      code.replace(/\s+/g, ' ').trim().replace(/;+/g, ';');
    
    return normalizeCode(userCode) === normalizeCode(correctCode);
  };

  /**
   * 🏗️ Validate Trading Decision
   */
  const validateTradingDecision = (userDecision, correctDecision) => {
    // Trading scenarios might have multiple valid approaches
    if (Array.isArray(correctDecision)) {
      return correctDecision.includes(userDecision);
    }
    return userDecision === correctDecision;
  };

  /**
   * 🏗️ Handle Correct Answer
   */
  const handleCorrectAnswer = async () => {
    setCurrentState(EXERCISE_STATES.COMPLETED);
    
    // Update streak
    const newStreak = streakCount + 1;
    setStreakCount(newStreak);

    // Update progress
    const newProgress = Math.min(exerciseProgress + (100 / exercise.totalQuestions), 100);
    setExerciseProgress(newProgress);

    // Celebration animation
    Animated.sequence([
      Animated.spring(pulseAnim, {
        toValue: 1.2,
        useNativeDriver: true,
      }),
      Animated.spring(pulseAnim, {
        toValue: 1,
        useNativeDriver: true,
      })
    ]).start();

    // Save progress
    await saveUserProgress(newProgress, newStreak);

    // Notify parent component
    onProgress?.({
      progress: newProgress,
      streak: newStreak,
      exerciseId: exercise.id,
      timeSpent: Date.now() - startTimeRef.current
    });

    // Auto-advance after delay
    setTimeout(() => {
      onComplete?.({
        success: true,
        exerciseId: exercise.id,
        streak: newStreak,
        timeSpent: Date.now() - startTimeRef.current,
        hintsUsed
      });
    }, 2000);

    trackExerciseAnalytics('exercise_completed', { 
      success: true, 
      streak: newStreak,
      timeSpent: Date.now() - startTimeRef.current
    });
  };

  /**
   * 🏗️ Handle Incorrect Answer
   */
  const handleIncorrectAnswer = async () => {
    // Shake animation for wrong answer
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true })
    ]).start();

    // Show explanation after delay
    setTimeout(() => {
      setShowExplanation(true);
    }, 500);

    trackExerciseAnalytics('answer_incorrect', { 
      attempts: (exercise.attempts || 0) + 1 
    });
  };

  /**
   * 🏗️ Use Hint
   */
  const useHint = useCallback(() => {
    if (!mergedConfig.enableHints) return;

    const newHintsUsed = hintsUsed + 1;
    setHintsUsed(newHintsUsed);

    // Hint animation
    Animated.timing(pulseAnim, {
      toValue: 1.05,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });

    trackExerciseAnalytics('hint_used', { 
      hintsUsed: newHintsUsed,
      exerciseId: exercise.id 
    });
  }, [hintsUsed, exercise?.id]);

  /**
   * 🏗️ Save User Progress
   */
  const saveUserProgress = async (progress, streak) => {
    const progressData = {
      userId,
      enrollmentId,
      exerciseId: exercise.id,
      progress,
      streak,
      lastUpdated: new Date().toISOString(),
      totalTimeSpent: timeSpent + (Date.now() - startTimeRef.current)
    };

    // Save locally
    await AsyncStorage.setItem(
      `progress_${userId}_${enrollmentId}`, 
      JSON.stringify(progressData)
    );

    // Sync with backend (debounced)
    debouncedSyncProgress(progressData);
  };

  /**
   * 🏗️ Debounced Progress Sync
   */
  const debouncedSyncProgress = useCallback(
    debounce(async (progressData) => {
      try {
        await fetch(`${process.env.API_URL}/learning/progress`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(progressData),
        });
      } catch (error) {
        console.error('Progress sync failed:', error);
        // Queue for retry
        await queueProgressForRetry(progressData);
      }
    }, 1000),
    []
  );

  /**
   * 🏗️ Track Exercise Analytics
   */
  const trackExerciseAnalytics = (event, additionalData = {}) => {
    const analyticsData = {
      event,
      userId,
      enrollmentId,
      exerciseId: exercise?.id,
      sessionId: exerciseSessionId.current,
      timestamp: new Date().toISOString(),
      currentState,
      streakCount,
      exerciseProgress,
      timeSpent: Date.now() - startTimeRef.current,
      hintsUsed,
      ...additionalData
    };

    // Send to analytics service
    if (typeof gtag !== 'undefined') {
      gtag('event', event, analyticsData);
    }

    // Log for debugging
    if (__DEV__) {
      console.log('Exercise Analytics:', analyticsData);
    }
  };

  /**
   * 🏗️ Render Exercise Based on Type
   */
  const renderExercise = () => {
    if (!exercise) return null;

    switch (exercise.type) {
      case EXERCISE_TYPES.MULTIPLE_CHOICE:
        return renderMultipleChoice();
      
      case EXERCISE_TYPES.FILL_IN_BLANK:
        return renderFillInBlank();
      
      case EXERCISE_TYPES.DRAG_DROP:
        return renderDragDrop();
      
      case EXERCISE_TYPES.MATCHING:
        return renderMatching();
      
      case EXERCISE_TYPES.CODE_COMPLETION:
        return renderCodeCompletion();
      
      case EXERCISE_TYPES.TRADING_SCENARIO:
        return renderTradingScenario();
      
      case EXERCISE_TYPES.DECISION_TREE:
        return renderDecisionTree();
      
      default:
        return renderMultipleChoice();
    }
  };

  /**
   * 🏗️ Render Multiple Choice Exercise
   */
  const renderMultipleChoice = () => (
    <MotiView
      from={{ opacity: 0, translateY: 50 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', delay: 200 }}
      style={styles.exerciseContainer}
    >
      <Text style={styles.questionText}>{exercise.question}</Text>
      
      <View style={styles.optionsContainer}>
        {exercise.options?.map((option, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleAnswerSelect(option.value, index)}
            disabled={currentState !== EXERCISE_STATES.ACTIVE}
            style={[
              styles.optionButton,
              selectedOption === index && styles.optionSelected,
              isCorrect !== null && selectedOption === index && (
                isCorrect ? styles.optionCorrect : styles.optionIncorrect
              )
            ]}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Text style={[
                styles.optionText,
                selectedOption === index && styles.optionTextSelected
              ]}>
                {option.label}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>
    </MotiView>
  );

  /**
   * 🏗️ Render Fill in Blank Exercise
   */
  const renderFillInBlank = () => (
    <MotiView
      from={{ opacity: 0, translateY: 50 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', delay: 200 }}
      style={styles.exerciseContainer}
    >
      <Text style={styles.questionText}>
        {exercise.question}
      </Text>
      
      <View style={styles.fillBlankContainer}>
        <TextInput
          style={[
            styles.textInput,
            isCorrect !== null && (
              isCorrect ? styles.inputCorrect : styles.inputIncorrect
            )
          ]}
          placeholder="Type your answer here..."
          onChangeText={setUserAnswer}
          editable={currentState === EXERCISE_STATES.ACTIVE}
          onSubmitEditing={() => handleAnswerSelect(userAnswer, null)}
        />
        
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => handleAnswerSelect(userAnswer, null)}
          disabled={!userAnswer || currentState !== EXERCISE_STATES.ACTIVE}
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </View>
    </MotiView>
  );

  /**
   * 🏗️ Render Trading Scenario Exercise
   */
  const renderTradingScenario = () => (
    <MotiView
      from={{ opacity: 0, translateY: 50 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', delay: 200 }}
      style={styles.exerciseContainer}
    >
      {/* Real-time chart integration */}
      <View style={styles.chartContainer}>
        <TradingChart 
          data={exercise.chartData}
          interactive={true}
          onDecision={(decision) => handleAnswerSelect(decision, null)}
        />
      </View>
      
      <Text style={styles.scenarioText}>{exercise.scenario}</Text>
      
      <View style={styles.tradingOptions}>
        {exercise.tradingOptions?.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.tradingOption,
              selectedOption === index && styles.tradingOptionSelected
            ]}
            onPress={() => handleAnswerSelect(option.action, index)}
          >
            <Text style={styles.tradingOptionText}>{option.label}</Text>
            <Text style={styles.tradingOptionRisk}>
              Risk: {option.riskLevel}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </MotiView>
  );

  /**
   * 🏗️ Render Progress Bar
   */
  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBarBackground}>
        <Animated.View 
          style={[
            styles.progressBarFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]} 
        />
      </View>
      <Text style={styles.progressText}>
        {Math.round(exerciseProgress)}% Complete
      </Text>
    </View>
  );

  /**
   * 🏗️ Render Streak Indicator
   */
  const renderStreakIndicator = () => (
    <View style={styles.streakContainer}>
      <LottieView
        source={require('../../assets/animations/fire.json')}
        autoPlay
        loop
        style={styles.streakAnimation}
      />
      <Text style={styles.streakText}>{streakCount}</Text>
      <Text style={styles.streakLabel}>Day Streak</Text>
    </View>
  );

  /**
   * 🏗️ Render Hint System
   */
  const renderHintSystem = () => (
    <TouchableOpacity 
      style={styles.hintButton}
      onPress={useHint}
      disabled={!mergedConfig.enableHints}
    >
      <Text style={styles.hintButtonText}>
        💡 Hint ({3 - hintsUsed} remaining)
      </Text>
    </TouchableOpacity>
  );

  /**
   * 🏗️ Render Explanation
   */
  const renderExplanation = () => {
    if (!showExplanation || !exercise.explanation) return null;

    return (
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        style={styles.explanationContainer}
      >
        <BlurView intensity={80} style={styles.explanationBlur}>
          <Text style={styles.explanationTitle}>Explanation</Text>
          <Text style={styles.explanationText}>{exercise.explanation}</Text>
          
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => setShowExplanation(false)}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </BlurView>
      </MotiView>
    );
  };

  // 🏗️ Main Render
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.background}
      />
      
      {/* Header Section */}
      <View style={styles.header}>
        {renderStreakIndicator()}
        {renderProgressBar()}
        {renderHintSystem()}
      </View>

      {/* Exercise Content */}
      <Animated.View 
        style={[
          styles.content,
          {
            transform: [
              { translateX: shakeAnim.interpolate({
                inputRange: [-1, 1],
                outputRange: [-10, 10]
              })}
            ]
          }
        ]}
      >
        {renderExercise()}
      </Animated.View>

      {/* Explanation Overlay */}
      {renderExplanation()}

      {/* Loading State */}
      {currentState === EXERCISE_STATES.LOADING && (
        <View style={styles.loadingContainer}>
          <LottieView
            source={require('../../assets/animations/loading.json')}
            autoPlay
            loop
            style={styles.loadingAnimation}
          />
          <Text style={styles.loadingText}>Loading Exercise...</Text>
        </View>
      )}

      {/* Completion Animation */}
      {currentState === EXERCISE_STATES.COMPLETED && (
        <MotiView
          from={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.completionContainer}
        >
          <LottieView
            source={require('../../assets/animations/success.json')}
            autoPlay
            loop={false}
            style={styles.completionAnimation}
          />
          <Text style={styles.completionText}>Excellent! 🎉</Text>
          <Text style={styles.streakUpdateText}>
            Streak: {streakCount} days
          </Text>
        </MotiView>
      )}
    </View>
  );
};

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  streakContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 10,
  },
  streakAnimation: {
    width: 40,
    height: 40,
  },
  streakText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  streakLabel: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 20,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CD964',
    borderRadius: 4,
  },
  progressText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  hintButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  hintButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  exerciseContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    lineHeight: 24,
    marginBottom: 25,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#F7FAFC',
    padding: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  optionSelected: {
    borderColor: '#667eea',
    backgroundColor: '#EDF2F7',
  },
  optionCorrect: {
    borderColor: '#48BB78',
    backgroundColor: '#F0FFF4',
  },
  optionIncorrect: {
    borderColor: '#F56565',
    backgroundColor: '#FFF5F5',
  },
  optionText: {
    fontSize: 16,
    color: '#4A5568',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#667eea',
  },
  fillBlankContainer: {
    gap: 15,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#F7FAFC',
  },
  inputCorrect: {
    borderColor: '#48BB78',
    backgroundColor: '#F0FFF4',
  },
  inputIncorrect: {
    borderColor: '#F56565',
    backgroundColor: '#FFF5F5',
  },
  submitButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  chartContainer: {
    height: 200,
    marginBottom: 20,
  },
  scenarioText: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 22,
    marginBottom: 20,
  },
  tradingOptions: {
    gap: 10,
  },
  tradingOption: {
    backgroundColor: '#F7FAFC',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  tradingOptionSelected: {
    borderColor: '#667eea',
    backgroundColor: '#EDF2F7',
  },
  tradingOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748',
    marginBottom: 5,
  },
  tradingOptionRisk: {
    fontSize: 12,
    color: '#718096',
  },
  explanationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  explanationBlur: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 25,
    width: '100%',
  },
  explanationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 15,
  },
  explanationText: {
    fontSize: 16,
    color: '#4A5568',
    lineHeight: 22,
    marginBottom: 20,
  },
  continueButton: {
    backgroundColor: '#667eea',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  loadingAnimation: {
    width: 100,
    height: 100,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#4A5568',
  },
  completionContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  completionAnimation: {
    width: 150,
    height: 150,
  },
  completionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginTop: 20,
  },
  streakUpdateText: {
    fontSize: 16,
    color: '#4A5568',
    marginTop: 10,
  },
});

// 🏗️ Utility Functions
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const queueProgressForRetry = async (progressData) => {
  try {
    const queue = await AsyncStorage.getItem('progress_retry_queue') || '[]';
    const queueArray = JSON.parse(queue);
    queueArray.push(progressData);
    await AsyncStorage.setItem('progress_retry_queue', JSON.stringify(queueArray));
  } catch (error) {
    console.error('Failed to queue progress for retry:', error);
  }
};

// 🏗️ Export with Enterprise Configuration
export default DuolingoInterface;
export {
  EXERCISE_TYPES,
  DIFFICULTY_LEVELS,
  EXERCISE_STATES
};