import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Share
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { analyticsAPI } from '../utils/api';

export default function LessonDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { lesson, venture, onComplete } = route.params;
  
  const { completeLesson, updateXP, currentStreak, user } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [lessonStarted, setLessonStarted] = useState(false);

  // Track time spent on lesson
  useEffect(() => {
    if (lessonStarted) {
      const timer = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [lessonStarted]);

  // Start analytics tracking when lesson opens
  useEffect(() => {
    const startLessonTracking = async () => {
      if (user?.id) {
        await analyticsAPI.trackLessonStart(user.id, lesson.id);
        setLessonStarted(true);
      }
    };
    
    startLessonTracking();
  }, []);

  const steps = [
    {
      type: 'content',
      title: 'Learn',
      content: lesson.content,
      icon: 'book'
    },
    {
      type: 'example',
      title: 'Real Example',
      content: getRealWorldExample(lesson.type),
      icon: 'bulb'
    },
    {
      type: 'action',
      title: 'Take Action',
      content: getActionStep(lesson.type, lesson.title),
      icon: 'rocket'
    },
    {
      type: 'quiz',
      title: 'Quick Check',
      questions: generateQuizQuestions(lesson.type),
      icon: 'help-circle'
    }
  ];

  const handleAnswerSelect = (questionIndex, answer) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleCompleteLesson = async () => {
    setLoading(true);
    try {
      // Check if all quiz questions are answered (if quiz exists)
      const quizStep = steps.find(step => step.type === 'quiz');
      if (quizStep && quizStep.questions) {
        const allAnswered = quizStep.questions.every((_, index) => quizAnswers[index] !== undefined);
        if (!allAnswered) {
          Alert.alert('Complete Quiz', 'Please answer all quiz questions before completing the lesson.');
          setLoading(false);
          return;
        }
      }

      // Complete lesson in store
      await completeLesson(venture, lesson.id);
      
      // Track completion analytics
      if (user?.id) {
        await analyticsAPI.trackLessonComplete(user.id, lesson.id, timeSpent);
      }

      // Show success message
      Alert.alert(
        '🎉 Lesson Completed!',
        `You earned ${lesson.xp} XP and maintained your ${currentStreak + 1}-day streak!`,
        [
          {
            text: 'Continue Learning',
            onPress: () => {
              if (onComplete) onComplete();
              navigation.goBack();
            }
          },
          {
            text: 'Share Achievement',
            onPress: shareAchievement
          }
        ]
      );

    } catch (error) {
      console.error('Error completing lesson:', error);
      Alert.alert('Error', 'Failed to complete lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const shareAchievement = async () => {
    try {
      await Share.share({
        message: `🔥 Just completed "${lesson.title}" on Mosa and earned ${lesson.xp} XP! Join me in building wealth skills. #MosaApp #WealthBuilding`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];
    
    switch (step.type) {
      case 'content':
        return (
          <View style={styles.contentStep}>
            <Text style={styles.contentText}>{step.content}</Text>
            {lesson.isGroup && (
              <View style={styles.groupTip}>
                <Ionicons name="people" size={20} color="#3B82F6" />
                <Text style={styles.groupTipText}>
                  This is a group activity! Find learning partners in your tribe.
                </Text>
              </View>
            )}
          </View>
        );

      case 'example':
        return (
          <View style={styles.exampleStep}>
            <Text style={styles.exampleTitle}>Real World Application</Text>
            <Text style={styles.exampleContent}>{step.content}</Text>
            <View style={styles.successStory}>
              <Ionicons name="trophy" size={24} color="#D4A017" />
              <Text style={styles.successStoryText}>
                Many Mosa users have successfully applied this to earn their first ETB 1,000+
              </Text>
            </View>
          </View>
        );

      case 'action':
        return (
          <View style={styles.actionStep}>
            <Text style={styles.actionTitle}>Your Turn to Act</Text>
            <Text style={styles.actionContent}>{step.content}</Text>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="document-text" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Start This Project</Text>
            </TouchableOpacity>
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Pro Tips:</Text>
              <Text style={styles.tip}>• Take before/after photos</Text>
              <Text style={styles.tip}>• Track your time and costs</Text>
              <Text style={styles.tip}>• Share your results with your tribe</Text>
            </View>
          </View>
        );

      case 'quiz':
        return (
          <View style={styles.quizStep}>
            <Text style={styles.quizTitle}>Knowledge Check</Text>
            {step.questions.map((question, index) => (
              <View key={index} style={styles.questionContainer}>
                <Text style={styles.questionText}>{question.question}</Text>
                {question.options.map((option, optionIndex) => (
                  <TouchableOpacity
                    key={optionIndex}
                    style={[
                      styles.optionButton,
                      quizAnswers[index] === optionIndex && styles.optionSelected
                    ]}
                    onPress={() => handleAnswerSelect(index, optionIndex)}
                  >
                    <Text style={[
                      styles.optionText,
                      quizAnswers[index] === optionIndex && styles.optionTextSelected
                    ]}>
                      {option}
                    </Text>
                    {quizAnswers[index] === optionIndex && (
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2D5016" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.lessonType}>{lesson.type.toUpperCase()}</Text>
          <Text style={styles.lessonTitle} numberOfLines={1}>{lesson.title}</Text>
        </View>
        
        <View style={styles.xpBadge}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={styles.xpText}>{lesson.xp} XP</Text>
        </View>
      </View>

      {/* Progress Steps */}
      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <View key={index} style={styles.stepItem}>
            <View style={[
              styles.stepIcon,
              index <= currentStep && styles.stepIconActive,
              index < currentStep && styles.stepIconCompleted
            ]}>
              <Ionicons 
                name={step.icon} 
                size={16} 
                color={index <= currentStep ? '#FFFFFF' : '#9CA3AF'} 
              />
            </View>
            <Text style={[
              styles.stepText,
              index <= currentStep && styles.stepTextActive
            ]}>
              {step.title}
            </Text>
            {index < steps.length - 1 && (
              <View style={[
                styles.stepConnector,
                index < currentStep && styles.stepConnectorActive
              ]} />
            )}
          </View>
        ))}
      </View>

      {/* Content Area */}
      <ScrollView style={styles.contentContainer}>
        {renderStepContent()}
      </ScrollView>

      {/* Navigation Footer */}
      <View style={styles.footer}>
        <View style={styles.footerStats}>
          <Text style={styles.timeSpent}>⏱️ {Math.floor(timeSpent / 60)}m {timeSpent % 60}s</Text>
          <Text style={styles.stepCounter}>
            Step {currentStep + 1} of {steps.length}
          </Text>
        </View>

        <View style={styles.navigationButtons}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.secondaryButton} onPress={prevStep}>
              <Ionicons name="arrow-back" size={20} color="#2D5016" />
              <Text style={styles.secondaryButtonText}>Previous</Text>
            </TouchableOpacity>
          )}

          {currentStep < steps.length - 1 ? (
            <TouchableOpacity style={styles.primaryButton} onPress={nextStep}>
              <Text style={styles.primaryButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.completeButton, loading && styles.completeButtonDisabled]}
              onPress={handleCompleteLesson}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.completeButtonText}>Complete Lesson</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

// Helper functions for dynamic content
function getRealWorldExample(lessonType) {
  const examples = {
    money: "Sarah started by selling homemade candles to neighbors. Within 2 weeks, she made ETB 1,200 and reinvested in better materials to scale up.",
    preserve: "Mike automated ETB 500 monthly savings into a separate account. After 6 months, he had ETB 3,000 saved for emergencies without feeling the impact.",
    multiply: "Alemitu turned ETB 2,000 into a small catering business by preparing lunch boxes for office workers. She now earns ETB 8,000 monthly profit.",
    skill: "John learned basic carpentry through Mosa and started fixing furniture. His first paid job earned him ETB 800 for 3 hours of work.",
    trading: "Elena started with a demo account, practiced for 2 weeks, then invested ETB 1,000. She now makes consistent 5-10% monthly returns."
  };
  return examples[lessonType] || "Many successful Mosa users have applied these principles to transform their financial situation.";
}

function getActionStep(lessonType, lessonTitle) {
  if (lessonTitle.includes('ETB 100')) {
    return "Identify one item you can sell today. Take photos, set a fair price, and post it on local marketplaces. Your goal: make your first ETB 100 within 24 hours.";
  }
  
  const actions = {
    money: "Create a list of 3 money-making ideas you can start this week. Choose one and take the first step today.",
    preserve: "Open a separate savings account and set up an automatic transfer of ETB 50 from your next income.",
    multiply: "Identify one skill you can monetize and calculate how much you could earn per hour. Set your first price.",
    skill: "Practice the core technique demonstrated in this lesson. Document your progress with photos or notes.",
    trading: "Open a demo trading account and practice the strategy covered for at least 30 minutes."
  };
  return actions[lessonType] || "Apply what you've learned by taking one concrete action today.";
}

function generateQuizQuestions(lessonType) {
  const questionBanks = {
    money: [
      {
        question: "What's the most important first step in making money?",
        options: [
          "Taking immediate action on a small idea",
          "Waiting for the perfect opportunity",
          "Asking others for money",
          "Studying for years first"
        ],
        correct: 0
      }
    ],
    preserve: [
      {
        question: "Why is an emergency fund crucial?",
        options: [
          "It prevents debt during unexpected expenses",
          "It makes you look responsible",
          "Banks require it",
          "It's not really necessary"
        ],
        correct: 0
      }
    ],
    multiply: [
      {
        question: "What does 'reinvesting profits' mean?",
        options: [
          "Using earnings to grow your business further",
          "Spending money on luxuries",
          "Giving money away",
          "Hiding money under mattress"
        ],
        correct: 0
      }
    ],
    skill: [
      {
        question: "How can you quickly validate if a skill is marketable?",
        options: [
          "Offer the service at a small price to first clients",
          "Wait until you're an expert",
          "Ask family if they like it",
          "Post on social media"
        ],
        correct: 0
      }
    ],
    trading: [
      {
        question: "What's the golden rule of trading?",
        options: [
          "Never risk more than you can afford to lose",
          "Always follow the crowd",
          "Buy when prices are highest",
          "Trade with emotions"
        ],
        correct: 0
      }
    ]
  };

  return questionBanks[lessonType] || [
    {
      question: "What's the key to success in wealth building?",
      options: [
        "Consistent action and learning",
        "Waiting for luck",
        "Following get-rich-quick schemes",
        "Avoiding all risks"
      ],
      correct: 0
    }
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  lessonType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D4A017',
    marginBottom: 2,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5016',
    textAlign: 'center',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  xpText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginLeft: 4,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepIconActive: {
    backgroundColor: '#2D5016',
  },
  stepIconCompleted: {
    backgroundColor: '#10B981',
  },
  stepText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  stepTextActive: {
    color: '#2D5016',
  },
  stepConnector: {
    position: 'absolute',
    top: 16,
    right: -16,
    width: 32,
    height: 2,
    backgroundColor: '#F3F4F6',
    zIndex: -1,
  },
  stepConnectorActive: {
    backgroundColor: '#10B981',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  contentStep: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
    marginBottom: 16,
  },
  groupTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
  },
  groupTipText: {
    fontSize: 14,
    color: '#3B82F6',
    marginLeft: 8,
    flex: 1,
  },
  exampleStep: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
  },
  exampleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 12,
  },
  exampleContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
    marginBottom: 16,
  },
  successStory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 8,
  },
  successStoryText: {
    fontSize: 14,
    color: '#F59E0B',
    marginLeft: 12,
    flex: 1,
    fontStyle: 'italic',
  },
  actionStep: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 12,
  },
  actionContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4B5563',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4A017',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tipsContainer: {
    backgroundColor: '#F0F7F4',
    padding: 16,
    borderRadius: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 8,
  },
  tip: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  quizStep: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
  },
  quizTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 20,
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5016',
    marginBottom: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: '#F0F7F4',
    borderColor: '#10B981',
  },
  optionText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  optionTextSelected: {
    color: '#10B981',
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeSpent: {
    fontSize: 14,
    color: '#6B7280',
  },
  stepCounter: {
    fontSize: 14,
    color: '#6B7280',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2D5016',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    color: '#2D5016',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2D5016',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#10B981',
    flex: 1,
  },
  completeButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});