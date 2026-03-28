// learning/duolingo-player.jsx

/**
 * 🎯 ENTERPRISE DUOLINGO-STYLE EXERCISE PLAYER
 * Production-ready interactive learning engine for Mosa Forge
 * Features: Real-time progress, adaptive difficulty, gamification, performance analytics
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  Alert,
  Platform,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MotiView, MotiText } from 'moti';
import { useProgressTracking } from '../hooks/use-progress-tracking';
import { usePerformanceAnalytics } from '../hooks/use-performance-analytics';
import { ExerciseEngine } from '../services/exercise-engine';
import { 
  HeartIcon, 
  StarIcon, 
  TrophyIcon,
  LightningIcon,
  ChartBarIcon,
  ClockIcon
} from '../components/Icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 🎯 Exercise types for different learning modalities
const EXERCISE_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  FILL_IN_BLANK: 'fill_in_blank',
  MATCHING: 'matching',
  SEQUENCING: 'sequencing',
  CODE_COMPLETION: 'code_completion',
  TRADING_SCENARIO: 'trading_scenario',
  DECISION_TREE: 'decision_tree'
};

// 🏆 Difficulty levels with adaptive progression
const DIFFICULTY_LEVELS = {
  BEGINNER: { multiplier: 1, timeLimit: 60, streakBonus: 1.0 },
  INTERMEDIATE: { multiplier: 1.5, timeLimit: 45, streakBonus: 1.2 },
  ADVANCED: { multiplier: 2.0, timeLimit: 30, streakBonus: 1.5 },
  EXPERT: { multiplier: 3.0, timeLimit: 20, streakBonus: 2.0 }
};

const DuolingoPlayer = ({ 
  skillId, 
  courseId, 
  studentId, 
  onExerciseComplete,
  onSessionEnd,
  initialDifficulty = 'BEGINNER'
}) => {
  // 🎯 State Management
  const [currentExercise, setCurrentExercise] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isCorrect, setIsCorrect] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [livesRemaining, setLivesRemaining] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionStats, setSessionStats] = useState({
    exercisesCompleted: 0,
    correctAnswers: 0,
    totalTime: 0,
    pointsEarned: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [exerciseHistory, setExerciseHistory] = useState([]);

  // 🎨 Animation Values
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const slideAnim = useMemo(() => new Animated.Value(50), []);
  const progressAnim = useMemo(() => new Animated.Value(0), []);
  const shakeAnim = useMemo(() => new Animated.Value(0), []);

  // 🔧 Custom Hooks
  const { 
    updateProgress, 
    getSkillProgression,
    recordExerciseAttempt 
  } = useProgressTracking(skillId, studentId);

  const {
    trackExerciseStart,
    trackExerciseComplete,
    trackSessionMetrics,
    recordPerformanceEvent
  } = usePerformanceAnalytics(studentId);

  // 🎯 Exercise Engine Instance
  const exerciseEngine = useMemo(() => 
    new ExerciseEngine(skillId, initialDifficulty), 
    [skillId, initialDifficulty]
  );

  /**
   * 🚀 INITIALIZE EXERCISE SESSION
   */
  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    try {
      setIsLoading(true);
      
      // Track session start
      await trackExerciseStart(skillId, courseId);
      
      // Load first exercise
      await loadNextExercise();
      
      // Start animations
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
        })
      ]).start();

    } catch (error) {
      console.error('Session initialization failed:', error);
      Alert.alert('Error', 'Failed to start exercise session');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 📥 LOAD NEXT EXERCISE
   */
  const loadNextExercise = async () => {
    try {
      const exercise = await exerciseEngine.generateExercise();
      
      if (!exercise) {
        await endSession();
        return;
      }

      setCurrentExercise(exercise);
      setUserAnswer('');
      setSelectedOptions([]);
      setIsCorrect(null);
      setShowExplanation(false);
      
      // Set time limit based on difficulty
      const difficultyConfig = DIFFICULTY_LEVELS[exercise.difficulty];
      setTimeRemaining(difficultyConfig.timeLimit);

      // Update progress animation
      Animated.timing(progressAnim, {
        toValue: (sessionStats.exercisesCompleted + 1) / 10, // 10 exercises per session
        duration: 300,
        useNativeDriver: false,
      }).start();

      // Record exercise view
      await recordPerformanceEvent('EXERCISE_VIEWED', {
        exerciseId: exercise.id,
        difficulty: exercise.difficulty,
        type: exercise.type
      });

    } catch (error) {
      console.error('Failed to load exercise:', error);
      Alert.alert('Error', 'Failed to load next exercise');
    }
  };

  /**
   * ✅ SUBMIT ANSWER
   */
  const handleSubmitAnswer = async () => {
    if (!currentExercise || isCorrect !== null) return;

    try {
      const startTime = Date.now();
      const isAnswerCorrect = exerciseEngine.validateAnswer(
        currentExercise, 
        userAnswer, 
        selectedOptions
      );

      setIsCorrect(isAnswerCorrect);
      
      // Update streak
      if (isAnswerCorrect) {
        setStreakCount(prev => prev + 1);
      } else {
        setStreakCount(0);
        setLivesRemaining(prev => prev - 1);
        
        // Shake animation for wrong answer
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        ]).start();
      }

      // Calculate points
      const pointsEarned = calculatePoints(isAnswerCorrect, streakCount, timeRemaining);
      
      // Update session stats
      const newStats = {
        exercisesCompleted: sessionStats.exercisesCompleted + 1,
        correctAnswers: sessionStats.correctAnswers + (isAnswerCorrect ? 1 : 0),
        totalTime: sessionStats.totalTime + (currentExercise.timeLimit - timeRemaining),
        pointsEarned: sessionStats.pointsEarned + pointsEarned
      };
      setSessionStats(newStats);

      // Record attempt
      await recordExerciseAttempt({
        exerciseId: currentExercise.id,
        isCorrect: isAnswerCorrect,
        timeSpent: currentExercise.timeLimit - timeRemaining,
        userAnswer,
        selectedOptions,
        pointsEarned,
        streakCount: isAnswerCorrect ? streakCount + 1 : 0
      });

      // Track completion
      await trackExerciseComplete(currentExercise.id, isAnswerCorrect, pointsEarned);

      // Show explanation after delay
      setTimeout(() => {
        setShowExplanation(true);
      }, 1500);

    } catch (error) {
      console.error('Answer submission failed:', error);
      Alert.alert('Error', 'Failed to submit answer');
    }
  };

  /**
   * 🎯 CALCULATE POINTS WITH BONUSES
   */
  const calculatePoints = (isCorrect, streak, timeLeft) => {
    if (!isCorrect) return 0;

    const basePoints = 10;
    const streakBonus = Math.min(streak * 2, 20); // Max 20 bonus points
    const timeBonus = Math.floor((timeLeft / 60) * 10); // Time-based bonus
    const difficultyMultiplier = DIFFICULTY_LEVELS[currentExercise.difficulty].multiplier;

    return Math.floor((basePoints + streakBonus + timeBonus) * difficultyMultiplier);
  };

  /**
   * ➡️ CONTINUE TO NEXT EXERCISE
   */
  const handleContinue = async () => {
    // Add exercise to history
    setExerciseHistory(prev => [...prev, {
      ...currentExercise,
      userAnswer,
      isCorrect,
      timestamp: Date.now()
    }]);

    // Check if session should end
    if (livesRemaining <= 0 || sessionStats.exercisesCompleted >= 10) {
      await endSession();
      return;
    }

    await loadNextExercise();
  };

  /**
   * 🏁 END SESSION
   */
  const endSession = async () => {
    try {
      // Update overall progress
      const progression = await updateProgress({
        exercisesCompleted: sessionStats.exercisesCompleted,
        accuracy: sessionStats.correctAnswers / sessionStats.exercisesCompleted,
        pointsEarned: sessionStats.pointsEarned,
        timeSpent: sessionStats.totalTime
      });

      // Track session metrics
      await trackSessionMetrics({
        skillId,
        sessionDuration: sessionStats.totalTime,
        totalExercises: sessionStats.exercisesCompleted,
        accuracy: sessionStats.correctAnswers / sessionStats.exercisesCompleted,
        points: sessionStats.pointsEarned,
        streak: streakCount
      });

      // Call completion callback
      if (onSessionEnd) {
        onSessionEnd({
          ...sessionStats,
          streakCount,
          livesRemaining,
          progression
        });
      }

    } catch (error) {
      console.error('Session end failed:', error);
    }
  };

  /**
   * ⏰ TIMER MANAGEMENT
   */
  useEffect(() => {
    if (!currentExercise || isCorrect !== null) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentExercise, isCorrect]);

  const handleTimeUp = () => {
    setIsCorrect(false);
    setLivesRemaining(prev => prev - 1);
    setStreakCount(0);
    
    // Record timeout event
    recordPerformanceEvent('EXERCISE_TIMEOUT', {
      exerciseId: currentExercise.id,
      timeLimit: currentExercise.timeLimit
    });
  };

  /**
   * 🎨 RENDER EXERCISE BASED ON TYPE
   */
  const renderExerciseContent = () => {
    if (!currentExercise) return null;

    switch (currentExercise.type) {
      case EXERCISE_TYPES.MULTIPLE_CHOICE:
        return renderMultipleChoice();
      
      case EXERCISE_TYPES.FILL_IN_BLANK:
        return renderFillInBlank();
      
      case EXERCISE_TYPES.MATCHING:
        return renderMatchingExercise();
      
      case EXERCISE_TYPES.TRADING_SCENARIO:
        return renderTradingScenario();
      
      case EXERCISE_TYPES.DECISION_TREE:
        return renderDecisionTree();
      
      default:
        return renderMultipleChoice();
    }
  };

  /**
   * 🔘 MULTIPLE CHOICE RENDERER
   */
  const renderMultipleChoice = () => (
    <View style={styles.optionsContainer}>
      {currentExercise.options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.optionButton,
            selectedOptions.includes(option.id) && styles.optionSelected
          ]}
          onPress={() => handleOptionSelect(option.id)}
          disabled={isCorrect !== null}
        >
          <MotiText 
            style={styles.optionText}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: index * 100 }}
          >
            {option.text}
          </MotiText>
        </TouchableOpacity>
      ))}
    </View>
  );

  /**
   * 📝 FILL IN BLANK RENDERER
   */
  const renderFillInBlank = () => (
    <View style={styles.fillBlankContainer}>
      <Text style={styles.questionText}>
        {currentExercise.question.replace('___', '')}
      </Text>
      <TextInput
        style={[
          styles.answerInput,
          isCorrect !== null && (
            isCorrect ? styles.correctAnswer : styles.incorrectAnswer
          )
        ]}
        value={userAnswer}
        onChangeText={setUserAnswer}
        placeholder="Type your answer..."
        editable={isCorrect === null}
        autoCapitalize="none"
      />
    </View>
  );

  /**
   * 📊 TRADING SCENARIO RENDERER
   */
  const renderTradingScenario = () => (
    <View style={styles.tradingContainer}>
      <Text style={styles.scenarioText}>{currentExercise.scenario}</Text>
      
      {/* Real-time chart simulation */}
      <View style={styles.chartContainer}>
        {/* Chart visualization would go here */}
        <Text style={styles.chartPlaceholder}>
          Real-time Trading Chart
        </Text>
      </View>

      <View style={styles.tradingOptions}>
        {currentExercise.actions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.tradingAction}
            onPress={() => handleTradingAction(action)}
          >
            <Text style={styles.actionText}>{action}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  /**
   * 🌳 DECISION TREE RENDERER
   */
  const renderDecisionTree = () => (
    <View style={styles.decisionContainer}>
      <Text style={styles.decisionPrompt}>{currentExercise.prompt}</Text>
      
      <View style={styles.decisionPath}>
        {currentExercise.choices.map((choice, index) => (
          <TouchableOpacity
            key={index}
            style={styles.decisionOption}
            onPress={() => handleDecisionChoice(choice)}
          >
            <Text style={styles.decisionText}>{choice.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  /**
   * 🎮 GAMIFICATION ELEMENTS
   */
  const renderGameElements = () => (
    <View style={styles.gameHeader}>
      {/* Lives */}
      <View style={styles.livesContainer}>
        {[...Array(3)].map((_, index) => (
          <HeartIcon
            key={index}
            filled={index < livesRemaining}
            style={styles.heartIcon}
          />
        ))}
      </View>

      {/* Streak */}
      <View style={styles.streakContainer}>
        <LightningIcon style={styles.streakIcon} />
        <Text style={styles.streakText}>{streakCount}</Text>
      </View>

      {/* Points */}
      <View style={styles.pointsContainer}>
        <StarIcon style={styles.starIcon} />
        <Text style={styles.pointsText}>{sessionStats.pointsEarned}</Text>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <Animated.View 
          style={[
            styles.progressBar,
            { width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            })}
          ]} 
        />
      </View>
    </View>
  );

  /**
   * 📊 PERFORMANCE FEEDBACK
   */
  const renderFeedback = () => {
    if (isCorrect === null) return null;

    return (
      <MotiView
        style={[
          styles.feedbackContainer,
          isCorrect ? styles.correctFeedback : styles.incorrectFeedback
        ]}
        from={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <Text style={styles.feedbackText}>
          {isCorrect ? '🎉 Correct! Well done!' : '💡 Not quite right'}
        </Text>
        
        {showExplanation && currentExercise.explanation && (
          <Text style={styles.explanationText}>
            {currentExercise.explanation}
          </Text>
        )}

        {showExplanation && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
          >
            <Text style={styles.continueText}>
              {livesRemaining > 0 && sessionStats.exercisesCompleted < 10 
                ? 'Continue' 
                : 'Finish Session'
              }
            </Text>
          </TouchableOpacity>
        )}
      </MotiView>
    );
  };

  // 🎨 MAIN RENDER
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <MotiView
          from={{ rotate: '0deg' }}
          animate={{ rotate: '360deg' }}
          transition={{
            type: 'timing',
            duration: 1000,
            loop: true,
          }}
          style={styles.loadingSpinner}
        />
        <Text style={styles.loadingText}>Preparing your learning session...</Text>
      </View>
    );
  }

  if (!currentExercise) {
    return (
      <View style={styles.completeContainer}>
        <TrophyIcon size={64} color="#FFD700" />
        <Text style={styles.completeTitle}>Session Complete!</Text>
        <Text style={styles.completeSubtitle}>
          Great work! You earned {sessionStats.pointsEarned} points.
        </Text>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }] 
        }
      ]}
    >
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={StyleSheet.absoluteFill}
      />

      {/* Game Elements Header */}
      {renderGameElements()}

      {/* Main Content */}
      <View style={styles.contentContainer}>
        
        {/* Exercise Header */}
        <View style={styles.exerciseHeader}>
          <Text style={styles.difficultyBadge}>
            {currentExercise.difficulty}
          </Text>
          <View style={styles.timerContainer}>
            <ClockIcon color="#FFF" />
            <Text style={styles.timerText}>{timeRemaining}s</Text>
          </View>
        </View>

        {/* Exercise Content */}
        <Animated.View 
          style={[
            styles.exerciseContent,
            { transform: [{ translateX: shakeAnim }] }
          ]}
        >
          <Text style={styles.exerciseType}>
            {currentExercise.type.replace('_', ' ').toUpperCase()}
          </Text>
          
          <Text style={styles.questionText}>
            {currentExercise.question}
          </Text>

          {renderExerciseContent()}
        </Animated.View>

        {/* Submit Button */}
        {isCorrect === null && (
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!userAnswer && selectedOptions.length === 0) && styles.submitDisabled
            ]}
            onPress={handleSubmitAnswer}
            disabled={!userAnswer && selectedOptions.length === 0}
          >
            <Text style={styles.submitText}>Submit Answer</Text>
          </TouchableOpacity>
        )}

        {/* Feedback */}
        {renderFeedback()}
      </View>
    </Animated.View>
  );
};

// 🎨 ENTERPRISE-LEVEL STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
  },
  loadingSpinner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: '#fff',
    borderTopColor: 'transparent',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    fontFamily: 'Inter-Medium',
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  livesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heartIcon: {
    marginHorizontal: 2,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakIcon: {
    marginRight: 4,
  },
  streakText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  starIcon: {
    marginRight: 4,
  },
  pointsText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFD700',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  difficultyBadge: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    textTransform: 'uppercase',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timerText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    marginLeft: 4,
  },
  exerciseContent: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  exerciseType: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#667eea',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questionText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#2D3748',
    lineHeight: 24,
    marginBottom: 30,
    textAlign: 'center',
  },
  optionsContainer: {
    marginTop: 10,
  },
  optionButton: {
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#667eea',
    backgroundColor: '#EDF2F7',
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#2D3748',
    lineHeight: 22,
  },
  fillBlankContainer: {
    alignItems: 'center',
  },
  answerInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#2D3748',
    marginTop: 20,
  },
  correctAnswer: {
    borderColor: '#48BB78',
    backgroundColor: '#F0FFF4',
  },
  incorrectAnswer: {
    borderColor: '#F56565',
    backgroundColor: '#FFF5F5',
  },
  tradingContainer: {
    flex: 1,
  },
  scenarioText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#4A5568',
    lineHeight: 22,
    marginBottom: 20,
  },
  chartContainer: {
    height: 150,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartPlaceholder: {
    color: '#A0AEC0',
    fontFamily: 'Inter-Regular',
  },
  tradingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tradingAction: {
    width: '48%',
    backgroundColor: '#EDF2F7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#2D3748',
    textAlign: 'center',
  },
  decisionContainer: {
    flex: 1,
  },
  decisionPrompt: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#4A5568',
    lineHeight: 22,
    marginBottom: 30,
  },
  decisionPath: {
    flex: 1,
    justifyContent: 'space-around',
  },
  decisionOption: {
    backgroundColor: '#EDF2F7',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  decisionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#2D3748',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#667eea',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  submitDisabled: {
    backgroundColor: '#A0AEC0',
    shadowOpacity: 0,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  feedbackContainer: {
    marginTop: 30,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  correctFeedback: {
    backgroundColor: '#F0FFF4',
    borderColor: '#48BB78',
    borderWidth: 2,
  },
  incorrectFeedback: {
    backgroundColor: '#FFF5F5',
    borderColor: '#F56565',
    borderWidth: 2,
  },
  feedbackText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  explanationText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4A5568',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  continueButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
    padding: 40,
  },
  completeTitle: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginTop: 20,
    marginBottom: 10,
  },
  completeSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default DuolingoPlayer;