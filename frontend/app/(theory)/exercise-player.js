// (theory)/exercise-player.js

/**
 * 🎯 ENTERPRISE EXERCISE PLAYER
 * Production-ready Duolingo-style exercise player for Mosa Forge
 * Features: Interactive exercises, real-time progress, adaptive learning, offline support
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  Platform,
  BackHandler
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LottieView from 'lottie-react-native';
import { Video, ResizeMode } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { Logger } from '../../utils/logger';
import { ProgressTracker } from '../../utils/progress-calculator';
import { ExerciseEngine } from '../../services/exercise-engine';
import { AnalyticsService } from '../../services/analytics-service';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

class EnterpriseExercisePlayer {
  constructor() {
    this.logger = new Logger('ExercisePlayer');
    this.progressTracker = new ProgressTracker();
    this.exerciseEngine = new ExerciseEngine();
    this.analytics = new AnalyticsService();
    this.currentSession = null;
    this.performanceMetrics = new Map();
  }

  /**
   * 🎯 INITIALIZE EXERCISE SESSION
   */
  async initializeSession(studentId, skillId, difficulty = 'beginner') {
    try {
      const sessionConfig = {
        studentId,
        skillId,
        difficulty,
        sessionId: this.generateSessionId(),
        startTime: Date.now(),
        deviceInfo: this.getDeviceInfo(),
        networkType: await this.getNetworkType()
      };

      this.currentSession = {
        ...sessionConfig,
        exercises: [],
        currentExerciseIndex: 0,
        performance: {
          correctAnswers: 0,
          totalAttempts: 0,
          timeSpent: 0,
          streak: 0,
          maxStreak: 0,
          hintsUsed: 0
        },
        state: 'active'
      };

      // Load initial exercise batch
      await this.loadExerciseBatch();

      // Start analytics session
      await this.analytics.track('exercise_session_started', sessionConfig);

      this.logger.info('Exercise session initialized', { sessionId: sessionConfig.sessionId });
      return this.currentSession;

    } catch (error) {
      this.logger.error('Failed to initialize exercise session', error);
      throw new Error('SESSION_INITIALIZATION_FAILED');
    }
  }

  /**
   * 🎮 LOAD EXERCISE BATCH
   */
  async loadExerciseBatch() {
    if (!this.currentSession) {
      throw new Error('NO_ACTIVE_SESSION');
    }

    try {
      const { studentId, skillId, difficulty } = this.currentSession;
      
      const exercises = await this.exerciseEngine.generateExercises({
        studentId,
        skillId,
        difficulty,
        count: 10, // Load in batches for performance
        excludeCompleted: true
      });

      this.currentSession.exercises = exercises;
      this.currentSession.currentExerciseIndex = 0;

      // Preload assets for smooth experience
      await this.preloadExerciseAssets(exercises);

      this.logger.debug('Exercise batch loaded', { 
        count: exercises.length,
        skillId,
        difficulty 
      });

    } catch (error) {
      this.logger.error('Failed to load exercise batch', error);
      throw new Error('EXERCISE_LOAD_FAILED');
    }
  }

  /**
   * 🖼️ PRELOAD EXERCISE ASSETS
   */
  async preloadExerciseAssets(exercises) {
    const assetPromises = exercises.map(async (exercise) => {
      if (exercise.mediaType === 'image' && exercise.mediaUrl) {
        // Preload images
        return this.preloadImage(exercise.mediaUrl);
      } else if (exercise.mediaType === 'animation' && exercise.animationData) {
        // Cache animation data
        return this.cacheAnimation(exercise.animationData);
      }
    });

    await Promise.allSettled(assetPromises);
  }

  /**
   * 🎯 EXECUTE EXERCISE PLAYER COMPONENT
   */
  ExercisePlayerComponent = ({ studentId, skillId, onComplete, onProgressUpdate }) => {
    const [currentExercise, setCurrentExercise] = useState(null);
    const [sessionState, setSessionState] = useState('loading');
    const [userAnswer, setUserAnswer] = useState('');
    const [showFeedback, setShowFeedback] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [streakCount, setStreakCount] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [hintsAvailable, setHintsAvailable] = useState(3);
    const [performance, setPerformance] = useState({
      correct: 0,
      total: 0,
      accuracy: 0,
      timeSpent: 0
    });

    const progressAnim = useRef(new Animated.Value(0)).current;
    const streakAnim = useRef(new Animated.Value(0)).current;
    const feedbackAnim = useRef(new Animated.Value(0)).current;
    const sessionRef = useRef(null);
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);

    /**
     * 🚀 INITIALIZE PLAYER
     */
    const initializePlayer = useCallback(async () => {
      try {
        setSessionState('loading');
        
        sessionRef.current = await this.initializeSession(studentId, skillId);
        await loadNextExercise();
        
        startTimeRef.current = Date.now();
        setSessionState('active');
        
        // Start progress tracking
        startProgressTracking();

      } catch (error) {
        this.logger.error('Player initialization failed', error);
        setSessionState('error');
      }
    }, [studentId, skillId]);

    /**
     * 📥 LOAD NEXT EXERCISE
     */
    const loadNextExercise = useCallback(async () => {
      if (!sessionRef.current) return;

      const { exercises, currentExerciseIndex } = sessionRef.current;

      if (currentExerciseIndex >= exercises.length) {
        // Load more exercises
        await this.loadExerciseBatch();
      }

      const nextExercise = sessionRef.current.exercises[sessionRef.current.currentExerciseIndex];
      
      if (nextExercise) {
        setCurrentExercise(nextExercise);
        setUserAnswer('');
        setShowFeedback(false);
        setTimeRemaining(nextExercise.timeLimit || 60);
        
        // Reset progress animation
        progressAnim.setValue(0);
        
        // Start timer if exercise has time limit
        if (nextExercise.timeLimit) {
          startExerciseTimer(nextExercise.timeLimit);
        }

        // Track exercise start
        this.analytics.track('exercise_started', {
          exerciseId: nextExercise.id,
          type: nextExercise.type,
          difficulty: nextExercise.difficulty
        });
      } else {
        // Session completed
        completeSession();
      }
    }, []);

    /**
     * ⏱️ START EXERCISE TIMER
     */
    const startExerciseTimer = useCallback((timeLimit) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      setTimeRemaining(timeLimit);
      
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, []);

    /**
     * 🕒 HANDLE TIME UP
     */
    const handleTimeUp = useCallback(() => {
      submitAnswer(''); // Submit empty answer when time up
    }, []);

    /**
     * 📤 SUBMIT ANSWER
     */
    const submitAnswer = useCallback(async (answer = userAnswer) => {
      if (!currentExercise || showFeedback) return;

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const isAnswerCorrect = await this.validateAnswer(currentExercise.id, answer);
      setIsCorrect(isAnswerCorrect);
      setShowFeedback(true);

      // Update performance metrics
      const newPerformance = {
        ...performance,
        total: performance.total + 1,
        correct: isAnswerCorrect ? performance.correct + 1 : performance.correct,
        timeSpent: performance.timeSpent + (Date.now() - startTimeRef.current)
      };
      newPerformance.accuracy = (newPerformance.correct / newPerformance.total) * 100;
      
      setPerformance(newPerformance);

      // Update streak
      if (isAnswerCorrect) {
        const newStreak = streakCount + 1;
        setStreakCount(newStreak);
        animateStreak(newStreak);
      } else {
        setStreakCount(0);
      }

      // Animate feedback
      Animated.spring(feedbackAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true
      }).start();

      // Track answer submission
      this.analytics.track('answer_submitted', {
        exerciseId: currentExercise.id,
        isCorrect: isAnswerCorrect,
        timeSpent: Date.now() - startTimeRef.current,
        streak: streakCount
      });

      // Progress to next exercise after delay
      setTimeout(() => {
        sessionRef.current.currentExerciseIndex++;
        loadNextExercise();
      }, 2000);

    }, [currentExercise, userAnswer, showFeedback, performance, streakCount]);

    /**
     * 🎭 ANIMATE STREAK
     */
    const animateStreak = useCallback((streak) => {
      Animated.sequence([
        Animated.spring(streakAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true
        }),
        Animated.delay(500),
        Animated.spring(streakAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true
        })
      ]).start();
    }, []);

    /**
     * 📊 START PROGRESS TRACKING
     */
    const startProgressTracking = useCallback(() => {
      const updateProgress = () => {
        if (sessionRef.current && currentExercise) {
          const progress = sessionRef.current.currentExerciseIndex / 
                         sessionRef.current.exercises.length;
          
          Animated.timing(progressAnim, {
            toValue: progress,
            duration: 500,
            useNativeDriver: true
          }).start();

          // Notify parent component
          onProgressUpdate?.({
            progress,
            exercisesCompleted: sessionRef.current.currentExerciseIndex,
            totalExercises: sessionRef.current.exercises.length,
            accuracy: performance.accuracy,
            streak: streakCount
          });
        }
      };

      // Update progress periodically
      const progressInterval = setInterval(updateProgress, 1000);
      return () => clearInterval(progressInterval);
    }, [currentExercise, performance, streakCount]);

    /**
     * 🏁 COMPETE SESSION
     */
    const completeSession = useCallback(async () => {
      if (!sessionRef.current) return;

      // Stop all timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Calculate final metrics
      const sessionDuration = Date.now() - sessionRef.current.startTime;
      const finalPerformance = {
        ...performance,
        sessionDuration,
        exercisesCompleted: sessionRef.current.currentExerciseIndex,
        finalAccuracy: performance.accuracy,
        finalStreak: streakCount
      };

      // Save session results
      await this.saveSessionResults(sessionRef.current, finalPerformance);

      // Track session completion
      await this.analytics.track('exercise_session_completed', finalPerformance);

      setSessionState('completed');
      onComplete?.(finalPerformance);

    }, [performance, streakCount]);

    /**
     * 💡 USE HINT
     */
    const useHint = useCallback(() => {
      if (hintsAvailable > 0 && currentExercise) {
        setHintsAvailable(prev => prev - 1);
        
        // Track hint usage
        this.analytics.track('hint_used', {
          exerciseId: currentExercise.id,
          hintsRemaining: hintsAvailable - 1
        });

        // Show hint logic would go here
        showHintForExercise(currentExercise);
      }
    }, [hintsAvailable, currentExercise]);

    // 🎯 EFFECTS
    useFocusEffect(
      useCallback(() => {
        initializePlayer();

        // Handle back button
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
          Alert.alert(
            'Exit Exercise Session',
            'Are you sure you want to exit? Your progress will be saved.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Exit', 
                style: 'destructive',
                onPress: () => {
                  completeSession();
                  return false;
                }
              }
            ]
          );
          return true;
        });

        return () => {
          backHandler.remove();
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
        };
      }, [])
    );

    // 🎨 RENDER METHODS
    const renderExerciseContent = () => {
      if (!currentExercise) return null;

      switch (currentExercise.type) {
        case 'multiple_choice':
          return renderMultipleChoice();
        case 'fill_blank':
          return renderFillBlank();
        case 'matching':
          return renderMatching();
        case 'interactive_chart':
          return renderInteractiveChart();
        case 'scenario_decision':
          return renderScenarioDecision();
        default:
          return renderDefaultExercise();
      }
    };

    const renderMultipleChoice = () => (
      <View style={styles.multipleChoiceContainer}>
        <Text style={styles.questionText}>{currentExercise.question}</Text>
        <View style={styles.optionsContainer}>
          {currentExercise.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                userAnswer === option && styles.optionSelected
              ]}
              onPress={() => setUserAnswer(option)}
              disabled={showFeedback}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );

    const renderFillBlank = () => (
      <View style={styles.fillBlankContainer}>
        <Text style={styles.questionText}>
          {currentExercise.question.replace('___', '')}
        </Text>
        <View style={styles.answerInputContainer}>
          <TextInput
            style={styles.answerInput}
            value={userAnswer}
            onChangeText={setUserAnswer}
            placeholder="Type your answer here..."
            editable={!showFeedback}
          />
        </View>
      </View>
    );

    const renderFeedback = () => {
      if (!showFeedback) return null;

      return (
        <Animated.View 
          style={[
            styles.feedbackContainer,
            {
              opacity: feedbackAnim,
              transform: [{
                scale: feedbackAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1]
                })
              }]
            }
          ]}
        >
          <BlurView
            style={styles.feedbackBlur}
            blurType="light"
            blurAmount={10}
          >
            <View style={[
              styles.feedbackContent,
              isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect
            ]}>
              <LottieView
                source={isCorrect ? 
                  require('../../assets/animations/success.json') :
                  require('../../assets/animations/error.json')
                }
                autoPlay
                loop={false}
                style={styles.feedbackAnimation}
              />
              <Text style={styles.feedbackText}>
                {isCorrect ? 
                  currentExercise.feedback?.correct || 'Great job! 🎉' :
                  currentExercise.feedback?.incorrect || `Correct: ${currentExercise.correctAnswer}`
                }
              </Text>
              {!isCorrect && currentExercise.explanation && (
                <Text style={styles.explanationText}>
                  {currentExercise.explanation}
                </Text>
              )}
            </View>
          </BlurView>
        </Animated.View>
      );
    };

    const renderProgressBar = () => (
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
          <Animated.View 
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                })
              }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {sessionRef.current?.currentExerciseIndex || 0} / {sessionRef.current?.exercises.length || 0}
        </Text>
      </View>
    );

    const renderStreakIndicator = () => (
      <Animated.View 
        style={[
          styles.streakContainer,
          {
            transform: [{
              scale: streakAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.2]
              })
            }]
          }
        ]}
      >
        <Text style={styles.streakText}>🔥 {streakCount}</Text>
        <Text style={styles.streakLabel}>Current Streak</Text>
      </Animated.View>
    );

    // 🎨 MAIN RENDER
    if (sessionState === 'loading') {
      return (
        <View style={styles.loadingContainer}>
          <LottieView
            source={require('../../assets/animations/loading.json')}
            autoPlay
            loop
            style={styles.loadingAnimation}
          />
          <Text style={styles.loadingText}>Preparing your exercises...</Text>
        </View>
      );
    }

    if (sessionState === 'error') {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load exercises</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={initializePlayer}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {renderProgressBar()}
          {renderStreakIndicator()}
          
          {/* Timer */}
          {timeRemaining > 0 && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{timeRemaining}s</Text>
            </View>
          )}

          {/* Hints */}
          <TouchableOpacity 
            style={styles.hintButton}
            onPress={useHint}
            disabled={hintsAvailable === 0}
          >
            <Text style={[
              styles.hintText,
              hintsAvailable === 0 && styles.hintDisabled
            ]}>
              💡 {hintsAvailable}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Exercise Content */}
        <View style={styles.exerciseContainer}>
          {renderExerciseContent()}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={[
              styles.submitButton,
              (!userAnswer || showFeedback) && styles.submitButtonDisabled
            ]}
            onPress={() => submitAnswer()}
            disabled={!userAnswer || showFeedback}
          >
            <Text style={styles.submitButtonText}>
              {showFeedback ? 'Next' : 'Submit Answer'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Feedback Overlay */}
        {renderFeedback()}
      </View>
    );
  };

  /**
   * 🎯 VALIDATE ANSWER
   */
  async validateAnswer(exerciseId, userAnswer) {
    try {
      const result = await this.exerciseEngine.validateAnswer(exerciseId, userAnswer);
      
      // Track validation metrics
      this.performanceMetrics.set(exerciseId, {
        userAnswer,
        isCorrect: result.isCorrect,
        timestamp: Date.now(),
        processingTime: result.processingTime
      });

      return result.isCorrect;

    } catch (error) {
      this.logger.error('Answer validation failed', error);
      return false;
    }
  }

  /**
   * 💾 SAVE SESSION RESULTS
   */
  async saveSessionResults(session, performance) {
    try {
      const sessionResult = {
        sessionId: session.sessionId,
        studentId: session.studentId,
        skillId: session.skillId,
        startTime: session.startTime,
        endTime: Date.now(),
        performance,
        exercisesAttempted: session.currentExerciseIndex,
        finalStreak: performance.finalStreak,
        accuracy: performance.finalAccuracy,
        deviceInfo: session.deviceInfo,
        networkType: session.networkType
      };

      await this.progressTracker.saveSessionResults(sessionResult);
      this.logger.info('Session results saved', { sessionId: session.sessionId });

    } catch (error) {
      this.logger.error('Failed to save session results', error);
      // Don't throw - we don't want to block UI
    }
  }

  /**
   * 🆔 GENERATE SESSION ID
   */
  generateSessionId() {
    return `ex_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 📱 GET DEVICE INFO
   */
  getDeviceInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      model: Platform.constants?.Model || 'unknown',
      screen: `${SCREEN_WIDTH}x${SCREEN_HEIGHT}`
    };
  }

  /**
   * 🌐 GET NETWORK TYPE
   */
  async getNetworkType() {
    // Implementation would use NetInfo or similar
    return 'wifi'; // Placeholder
  }
}

// 🎨 STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingAnimation: {
    width: 200,
    height: 200,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#6c757d',
    fontFamily: 'Inter-Medium',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressBackground: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#28a745',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
    fontFamily: 'Inter-Regular',
  },
  streakContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  streakText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    fontFamily: 'Inter-Bold',
  },
  streakLabel: {
    fontSize: 10,
    color: '#6c757d',
    fontFamily: 'Inter-Regular',
  },
  timerContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff3cd',
    borderRadius: 20,
    marginRight: 16,
  },
  timerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    fontFamily: 'Inter-Bold',
  },
  hintButton: {
    padding: 8,
  },
  hintText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  hintDisabled: {
    opacity: 0.5,
  },
  exerciseContainer: {
    flex: 1,
    padding: 20,
  },
  multipleChoiceContainer: {
    flex: 1,
  },
  questionText: {
    fontSize: 18,
    lineHeight: 24,
    color: '#212529',
    marginBottom: 24,
    fontFamily: 'Inter-Medium',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionSelected: {
    borderColor: '#007bff',
    backgroundColor: '#f8f9ff',
  },
  optionText: {
    fontSize: 16,
    color: '#212529',
    fontFamily: 'Inter-Regular',
  },
  fillBlankContainer: {
    flex: 1,
  },
  answerInputContainer: {
    marginTop: 16,
  },
  answerInput: {
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#ffffff',
    fontFamily: 'Inter-Regular',
  },
  actionContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  submitButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  feedbackContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  feedbackBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  feedbackContent: {
    margin: 20,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  feedbackCorrect: {
    backgroundColor: '#d4edda',
  },
  feedbackIncorrect: {
    backgroundColor: '#f8d7da',
  },
  feedbackAnimation: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  feedbackText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'Inter-Medium',
  },
  explanationText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6c757d',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#dc3545',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
  retryButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
});

// Export singleton instance
export default new EnterpriseExercisePlayer();