// learning/quiz-component.jsx

/**
 * 🎯 ENTERPRISE QUIZ COMPONENT
 * Production-ready Duolingo-style interactive learning component
 * Features: Real-time progress, adaptive difficulty, instant feedback, performance analytics
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
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import { useProgressTracking } from '../hooks/use-progress-tracking';
import { usePerformanceAnalytics } from '../hooks/use-performance-analytics';
import { QuizEngine } from '../services/quiz-engine';
import { 
  HeartIcon, 
  StarIcon, 
  LightningIcon, 
  ChartIcon,
  TrophyIcon
} from '../components/icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const QuizComponent = ({ 
  skillId, 
  chapterId, 
  difficulty = 'beginner',
  onComplete,
  onProgressUpdate,
  enableAnalytics = true
}) => {
  // 🎯 STATE MANAGEMENT
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({
    totalQuestions: 0,
    correctAnswers: 0,
    timeSpent: 0,
    accuracy: 0
  });

  // 🎨 ANIMATIONS
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [pulseAnim] = useState(new Animated.Value(1));
  const [shakeAnim] = useState(new Animated.Value(0));

  // 🔧 HOOKS & SERVICES
  const { updateProgress, getChapterProgress } = useProgressTracking();
  const { trackQuizAttempt, trackQuestionResponse } = usePerformanceAnalytics();
  const quizEngine = useMemo(() => new QuizEngine(), []);

  // 📊 PERFORMANCE METRICS
  const [startTime, setStartTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  // 🚀 INITIALIZE QUIZ
  useEffect(() => {
    initializeQuizSession();
  }, [skillId, chapterId, difficulty]);

  /**
   * 🎯 INITIALIZE QUIZ SESSION
   */
  const initializeQuizSession = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load questions based on skill and difficulty
      const quizQuestions = await quizEngine.generateQuestions({
        skillId,
        chapterId,
        difficulty,
        count: 10,
        types: ['multiple_choice', 'true_false', 'fill_blank', 'scenario_based']
      });

      if (!quizQuestions || quizQuestions.length === 0) {
        throw new Error('NO_QUESTIONS_AVAILABLE');
      }

      setQuestions(quizQuestions);
      setCurrentQuestion(quizQuestions[0]);
      setSessionStats(prev => ({
        ...prev,
        totalQuestions: quizQuestions.length
      }));

      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true
        })
      ]).start();

      // Track session start
      if (enableAnalytics) {
        trackQuizAttempt({
          skillId,
          chapterId,
          difficulty,
          questionCount: quizQuestions.length
        });
      }

      setQuestionStartTime(Date.now());

    } catch (error) {
      console.error('Quiz initialization failed:', error);
      Alert.alert(
        'Loading Error',
        'Unable to load quiz questions. Please try again.',
        [{ text: 'Retry', onPress: initializeQuizSession }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [skillId, chapterId, difficulty]);

  /**
   * 🎯 HANDLE ANSWER SELECTION
   */
  const handleAnswerSelect = useCallback((answerId) => {
    if (isAnswerSubmitted) return;

    setSelectedAnswer(answerId);
    
    // Pulse animation for selection
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();
  }, [isAnswerSubmitted, pulseAnim]);

  /**
   * 🎯 SUBMIT ANSWER
   */
  const handleSubmitAnswer = useCallback(async () => {
    if (!selectedAnswer || isAnswerSubmitted) return;

    const answerTime = Date.now() - questionStartTime;
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    setIsAnswerSubmitted(true);

    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      timeSpent: prev.timeSpent + answerTime,
      accuracy: ((prev.correctAnswers + (isCorrect ? 1 : 0)) / (currentIndex + 1)) * 100
    }));

    // Handle correct/incorrect logic
    if (isCorrect) {
      handleCorrectAnswer();
    } else {
      handleIncorrectAnswer();
    }

    // Track performance analytics
    if (enableAnalytics) {
      trackQuestionResponse({
        questionId: currentQuestion.id,
        skillId,
        chapterId,
        answer: selectedAnswer,
        isCorrect,
        timeSpent: answerTime,
        difficulty: currentQuestion.difficulty
      });
    }

    // Progress tracking
    await updateProgress(skillId, chapterId, {
      questionsAttempted: currentIndex + 1,
      correctAnswers: isCorrect ? score + 1 : score,
      currentStreak: isCorrect ? streak + 1 : 0,
      accuracy: sessionStats.accuracy
    });

    // Notify parent component
    onProgressUpdate?.({
      currentIndex,
      totalQuestions: questions.length,
      accuracy: sessionStats.accuracy,
      streak,
      lives
    });

  }, [
    selectedAnswer, isAnswerSubmitted, currentQuestion, questionStartTime,
    currentIndex, score, streak, lives, skillId, chapterId, questions.length,
    trackQuestionResponse, updateProgress, onProgressUpdate
  ]);

  /**
   * 🎯 HANDLE CORRECT ANSWER
   */
  const handleCorrectAnswer = useCallback(() => {
    setScore(prev => prev + 1);
    setStreak(prev => prev + 1);
    
    // Celebration animation
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.spring(pulseAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true
      })
    ]).start();
  }, [pulseAnim]);

  /**
   * 🎯 HANDLE INCORRECT ANSWER
   */
  const handleIncorrectAnswer = useCallback(() => {
    setLives(prev => prev - 1);
    setStreak(0);

    // Shake animation for wrong answer
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();

    // Check if game over
    if (lives <= 1) {
      setTimeout(() => handleSessionComplete(), 1500);
    }
  }, [lives, shakeAnim]);

  /**
   * 🎯 MOVE TO NEXT QUESTION
   */
  const handleNextQuestion = useCallback(() => {
    if (currentIndex >= questions.length - 1) {
      handleSessionComplete();
      return;
    }

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    setCurrentQuestion(questions[nextIndex]);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setQuestionStartTime(Date.now());

    // Reset animations for new question
    slideAnim.setValue(50);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true
      })
    ]).start();
  }, [currentIndex, questions, fadeAnim, slideAnim]);

  /**
   * 🎯 HANDLE SESSION COMPLETION
   */
  const handleSessionComplete = useCallback(async () => {
    const sessionDuration = Date.now() - startTime;
    const finalStats = {
      ...sessionStats,
      finalScore: score,
      totalQuestions: questions.length,
      sessionDuration,
      completionDate: new Date().toISOString()
    };

    // Calculate mastery level
    const masteryLevel = calculateMasteryLevel(finalStats.accuracy, streak);

    // Update progress in database
    await updateProgress(skillId, chapterId, {
      completed: true,
      masteryLevel,
      finalScore: score,
      sessionStats: finalStats
    });

    // Analytics tracking
    if (enableAnalytics) {
      trackQuizAttempt({
        skillId,
        chapterId,
        difficulty,
        finalScore: score,
        accuracy: finalStats.accuracy,
        sessionDuration,
        masteryLevel,
        status: 'completed'
      });
    }

    // Call completion callback
    onComplete?.({
      score,
      totalQuestions: questions.length,
      accuracy: finalStats.accuracy,
      masteryLevel,
      streak: Math.max(streak, 0),
      sessionDuration
    });
  }, [
    score, questions.length, sessionStats, streak, skillId, chapterId,
    startTime, updateProgress, trackQuizAttempt, onComplete
  ]);

  /**
   * 🎯 CALCULATE MASTERY LEVEL
   */
  const calculateMasteryLevel = (accuracy, currentStreak) => {
    if (accuracy >= 90 && currentStreak >= 5) return 'MASTER';
    if (accuracy >= 80 && currentStreak >= 3) return 'ADVANCED';
    if (accuracy >= 70) return 'INTERMEDIATE';
    if (accuracy >= 60) return 'BEGINNER';
    return 'NOVICE';
  };

  /**
   * 🎯 GET ANSWER FEEDBACK
   */
  const getAnswerFeedback = useCallback(() => {
    if (!isAnswerSubmitted || !currentQuestion) return null;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    const correctAnswer = currentQuestion.answers.find(
      ans => ans.id === currentQuestion.correctAnswer
    );

    return {
      isCorrect,
      correctAnswer: correctAnswer?.text,
      explanation: currentQuestion.explanation,
      learningTip: currentQuestion.learningTip
    };
  }, [isAnswerSubmitted, selectedAnswer, currentQuestion]);

  /**
   * 🎯 RENDER QUESTION HEADER
   */
  const renderHeader = () => (
    <MotiView
      from={{ opacity: 0, translateY: -20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500 }}
      style={styles.header}
    >
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              {
                width: `${((currentIndex + 1) / questions.length) * 100}%`
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1}/{questions.length}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <HeartIcon size={20} color="#FF6B6B" />
          <Text style={styles.statText}>{lives}</Text>
        </View>
        <View style={styles.statItem}>
          <LightningIcon size={20} color="#FFD93D" />
          <Text style={styles.statText}>{streak}</Text>
        </View>
        <View style={styles.statItem}>
          <StarIcon size={20} color="#6BCF7F" />
          <Text style={styles.statText}>{score}</Text>
        </View>
      </View>
    </MotiView>
  );

  /**
   * 🎯 RENDER QUESTION CONTENT
   */
  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const feedback = getAnswerFeedback();

    return (
      <Animated.View
        style={[
          styles.questionContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.questionHeader}>
          <Text style={styles.difficultyBadge}>
            {currentQuestion.difficulty?.toUpperCase()}
          </Text>
          <Text style={styles.questionType}>
            {currentQuestion.type?.replace('_', ' ')}
          </Text>
        </View>

        <Text style={styles.questionText}>
          {currentQuestion.text}
        </Text>

        {currentQuestion.imageUrl && (
          <Image 
            source={{ uri: currentQuestion.imageUrl }}
            style={styles.questionImage}
            resizeMode="contain"
          />
        )}

        <View style={styles.answersContainer}>
          {currentQuestion.answers.map((answer, index) => (
            <AnswerButton
              key={answer.id}
              answer={answer}
              index={index}
              isSelected={selectedAnswer === answer.id}
              isSubmitted={isAnswerSubmitted}
              isCorrect={answer.id === currentQuestion.correctAnswer}
              onSelect={handleAnswerSelect}
            />
          ))}
        </View>

        {feedback && (
          <FeedbackPanel feedback={feedback} onNext={handleNextQuestion} />
        )}
      </Animated.View>
    );
  };

  /**
   * 🎯 RENDER LOADING STATE
   */
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <MotiView
        from={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', delay: 200 }}
      >
        <ActivityIndicator size="large" color="#6BCF7F" />
      </MotiView>
      <Text style={styles.loadingText}>Preparing your learning session...</Text>
    </View>
  );

  // 🎯 MAIN RENDER
  if (isLoading) {
    return renderLoading();
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.background}
      />
      
      {renderHeader()}
      {renderQuestion()}

      {!isAnswerSubmitted && selectedAnswer && (
        <MotiView
          from={{ opacity: 0, translateY: 50 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={styles.submitButtonContainer}
        >
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmitAnswer}
          >
            <Text style={styles.submitButtonText}>Submit Answer</Text>
          </TouchableOpacity>
        </MotiView>
      )}
    </View>
  );
};

/**
 * 🎯 ANSWER BUTTON COMPONENT
 */
const AnswerButton = React.memo(({ 
  answer, 
  index, 
  isSelected, 
  isSubmitted, 
  isCorrect, 
  onSelect 
}) => {
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePress = () => {
    onSelect(answer.id);
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      friction: 3,
      useNativeDriver: true
    }).start();
  };

  const getButtonStyle = () => {
    if (!isSubmitted) {
      return isSelected ? styles.answerSelected : styles.answerDefault;
    }

    if (isCorrect) {
      return styles.answerCorrect;
    }

    if (isSelected && !isCorrect) {
      return styles.answerIncorrect;
    }

    return styles.answerDefault;
  };

  const getButtonTextStyle = () => {
    if (!isSubmitted) {
      return isSelected ? styles.answerTextSelected : styles.answerTextDefault;
    }

    if (isCorrect || isSelected) {
      return styles.answerTextSubmitted;
    }

    return styles.answerTextDefault;
  };

  return (
    <MotiView
      from={{ opacity: 0, translateX: -50 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', delay: index * 100 }}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.answerButton, getButtonStyle()]}
          onPress={handlePress}
          disabled={isSubmitted}
        >
          <Text style={getButtonTextStyle()}>
            {answer.text}
          </Text>
          {isSubmitted && isCorrect && (
            <StarIcon size={16} color="#FFFFFF" style={styles.answerIcon} />
          )}
        </TouchableOpacity>
      </Animated.View>
    </MotiView>
  );
});

/**
 * 🎯 FEEDBACK PANEL COMPONENT
 */
const FeedbackPanel = React.memo(({ feedback, onNext }) => {
  const { isCorrect, correctAnswer, explanation, learningTip } = feedback;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', delay: 500 }}
      style={[
        styles.feedbackContainer,
        isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect
      ]}
    >
      <View style={styles.feedbackHeader}>
        <Text style={styles.feedbackTitle}>
          {isCorrect ? '🎉 Correct!' : '💡 Almost There!'}
        </Text>
        {!isCorrect && (
          <Text style={styles.correctAnswer}>
            Correct: {correctAnswer}
          </Text>
        )}
      </View>

      {explanation && (
        <Text style={styles.explanationText}>
          {explanation}
        </Text>
      )}

      {learningTip && (
        <View style={styles.learningTip}>
          <Text style={styles.learningTipTitle}>Pro Tip 💎</Text>
          <Text style={styles.learningTipText}>{learningTip}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.nextButton}
        onPress={onNext}
      >
        <Text style={styles.nextButtonText}>
          Continue Learning
        </Text>
      </TouchableOpacity>
    </MotiView>
  );
});

/**
 * 🎯 STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6BCF7F',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 6,
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },
  questionContainer: {
    flex: 1,
    padding: 24,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  difficultyBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667eea',
    backgroundColor: '#F0F4FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  questionType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666666',
    textTransform: 'capitalize',
  },
  questionText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: '#333333',
    marginBottom: 24,
    textAlign: 'center',
  },
  questionImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: 24,
  },
  answersContainer: {
    gap: 12,
  },
  answerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    minHeight: 60,
  },
  answerDefault: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8E8E8',
  },
  answerSelected: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  answerCorrect: {
    backgroundColor: '#6BCF7F',
    borderColor: '#6BCF7F',
  },
  answerIncorrect: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  answerTextDefault: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
  },
  answerTextSelected: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  answerTextSubmitted: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  answerIcon: {
    marginLeft: 8,
  },
  submitButtonContainer: {
    position: 'absolute',
    bottom: 30,
    left: 24,
    right: 24,
  },
  submitButton: {
    backgroundColor: '#6BCF7F',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#6BCF7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  feedbackContainer: {
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  feedbackCorrect: {
    backgroundColor: '#6BCF7F',
  },
  feedbackIncorrect: {
    backgroundColor: '#FFA726',
  },
  feedbackHeader: {
    marginBottom: 12,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  correctAnswer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  explanationText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 16,
  },
  learningTip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  learningTipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  learningTipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  nextButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
});

export default QuizComponent;