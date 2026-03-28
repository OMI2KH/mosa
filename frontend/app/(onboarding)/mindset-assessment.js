// app/(onboarding)/mindset-assessment.js

/**
 * 🎯 ENTERPRISE MINDSET ASSESSMENT
 * Production-ready mindset evaluation for Mosa Forge
 * Features: Psychological profiling, progress tracking, commitment verification
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
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../contexts/auth-context';
import { useProgressTracking } from '../../hooks/use-progress-tracking';
import { useMindsetAssessment } from '../../hooks/use-mindset-assessment';
import { MindsetCalculator } from '../../utils/mindset-calculations';
import { Logger } from '../../utils/logger';

// Design System
const { width, height } = Dimensions.get('window');
const COLORS = {
  primary: '#0066CC',
  primaryDark: '#0052A3',
  secondary: '#00C896',
  danger: '#DC3545',
  warning: '#FFC107',
  success: '#28A745',
  dark: '#2D3748',
  light: '#F7FAFC',
  gray: {
    100: '#F7FAFC',
    200: '#EDF2F7',
    300: '#E2E8F0',
    400: '#CBD5E0',
    500: '#A0AEC0',
    600: '#718096',
    700: '#4A5568',
    800: '#2D3748',
    900: '#1A202C',
  }
};

const TYPOGRAPHY = {
  h1: { fontSize: 28, fontWeight: '700', lineHeight: 36 },
  h2: { fontSize: 24, fontWeight: '600', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

class MindsetAssessmentEngine {
  constructor() {
    this.logger = new Logger('MindsetAssessmentEngine');
    this.calculator = new MindsetCalculator();
    this.ASSESSMENT_CONFIG = {
      totalQuestions: 25,
      minCompletionScore: 70,
      maxTimeMinutes: 30,
      categories: [
        {
          id: 'wealth_consciousness',
          name: 'Wealth Consciousness',
          description: 'Transforming from consumer to creator mindset',
          questions: 6,
          weight: 0.25
        },
        {
          id: 'discipline_building',
          name: 'Discipline Building',
          description: 'Habit formation and consistency patterns',
          questions: 6,
          weight: 0.25
        },
        {
          id: 'action_taking',
          name: 'Action Taking',
          description: 'Overcoming procrastination and taking initiative',
          questions: 7,
          weight: 0.30
        },
        {
          id: 'financial_psychology',
          name: 'Financial Psychology',
          description: 'Money mindset and financial identity',
          questions: 6,
          weight: 0.20
        }
      ]
    };
  }

  generateAssessmentQuestions() {
    return [
      // Wealth Consciousness Questions (6)
      {
        id: 'wc_1',
        category: 'wealth_consciousness',
        type: 'likert',
        question: 'I believe I can create wealth through developing valuable skills',
        options: [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Neutral' },
          { value: 4, label: 'Agree' },
          { value: 5, label: 'Strongly Agree' }
        ],
        weight: 1.2
      },
      {
        id: 'wc_2',
        category: 'wealth_consciousness',
        type: 'scenario',
        question: 'When I see someone successful, my first thought is:',
        options: [
          { value: 1, label: 'They are lucky or privileged' },
          { value: 2, label: 'I could never achieve that' },
          { value: 3, label: 'I wonder what they did to get there' },
          { value: 4, label: 'I can learn from their journey' },
          { value: 5, label: 'I will create my own success story' }
        ],
        weight: 1.1
      },
      {
        id: 'wc_3',
        category: 'wealth_consciousness',
        type: 'likert',
        question: 'I see myself as a creator of value rather than just a consumer',
        options: [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Neutral' },
          { value: 4, label: 'Agree' },
          { value: 5, label: 'Strongly Agree' }
        ],
        weight: 1.3
      },
      {
        id: 'wc_4',
        category: 'wealth_consciousness',
        type: 'multiple_choice',
        question: 'What does "wealth" mean to you?',
        options: [
          { value: 1, label: 'Having lots of money' },
          { value: 2, label: 'Being able to buy what I want' },
          { value: 3, label: 'Financial security and freedom' },
          { value: 4, label: 'Creating value for others' },
          { value: 5, label: 'All of the above plus making a positive impact' }
        ],
        weight: 1.0
      },
      {
        id: 'wc_5',
        category: 'wealth_consciousness',
        type: 'likert',
        question: 'I believe skills are the new currency in the digital economy',
        options: [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Neutral' },
          { value: 4, label: 'Agree' },
          { value: 5, label: 'Strongly Agree' }
        ],
        weight: 1.1
      },
      {
        id: 'wc_6',
        category: 'wealth_consciousness',
        type: 'scenario',
        question: 'If you had 6 months to transform your income, you would:',
        options: [
          { value: 1, label: 'Look for a better job' },
          { value: 2, label: 'Start a small business' },
          { value: 3, label: 'Learn a high-income skill' },
          { value: 4, label: 'Build multiple income streams' },
          { value: 5, label: 'Master a skill and create a service business' }
        ],
        weight: 1.3
      },

      // Discipline Building Questions (6)
      {
        id: 'db_1',
        category: 'discipline_building',
        type: 'likert',
        question: 'I consistently follow through on my commitments',
        options: [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Neutral' },
          { value: 4, label: 'Agree' },
          { value: 5, label: 'Strongly Agree' }
        ],
        weight: 1.2
      },
      {
        id: 'db_2',
        category: 'discipline_building',
        type: 'scenario',
        question: 'When facing a challenging task, you typically:',
        options: [
          { value: 1, label: 'Avoid it until the last minute' },
          { value: 2, label: 'Do the easy parts first' },
          { value: 3, label: 'Break it down and start immediately' },
          { value: 4, label: 'Create a plan and stick to it' },
          { value: 5, label: 'Tackle the hardest part first with focus' }
        ],
        weight: 1.4
      },
      {
        id: 'db_3',
        category: 'discipline_building',
        type: 'multiple_choice',
        question: 'How do you handle distractions while working?',
        options: [
          { value: 1, label: 'I get distracted easily' },
          { value: 2, label: 'I try to focus but often get sidetracked' },
          { value: 3, label: 'I use some techniques to minimize distractions' },
          { value: 4, label: 'I have a dedicated workspace and time' },
          { value: 5, label: 'I use advanced focus techniques and time blocking' }
        ],
        weight: 1.1
      },
      {
        id: 'db_4',
        category: 'discipline_building',
        type: 'likert',
        question: 'I maintain consistent daily routines that support my goals',
        options: [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Neutral' },
          { value: 4, label: 'Agree' },
          { value: 5, label: 'Strongly Agree' }
        ],
        weight: 1.3
      },
      {
        id: 'db_5',
        category: 'discipline_building',
        type: 'scenario',
        question: 'When you miss a day of your planned routine, you:',
        options: [
          { value: 1, label: 'Give up entirely' },
          { value: 2, label: 'Feel guilty but continue inconsistently' },
          { value: 3, label: 'Start again the next day' },
          { value: 4, label: 'Analyze why and adjust your approach' },
          { value: 5, label: 'See it as part of the process and immediately get back on track' }
        ],
        weight: 1.2
      },
      {
        id: 'db_6',
        category: 'discipline_building',
        type: 'likert',
        question: 'I can delay gratification for long-term benefits',
        options: [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Neutral' },
          { value: 4, label: 'Agree' },
          { value: 5, label: 'Strongly Agree' }
        ],
        weight: 1.1
      },

      // Action Taking Questions (7)
      {
        id: 'at_1',
        category: 'action_taking',
        type: 'likert',
        question: 'I take action immediately when I have a good idea',
        options: [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Neutral' },
          { value: 4, label: 'Agree' },
          { value: 5, label: 'Strongly Agree' }
        ],
        weight: 1.3
      },
      {
        id: 'at_2',
        category: 'action_taking',
        type: 'scenario',
        question: 'When learning something new, you prefer to:',
        options: [
          { value: 1, label: 'Watch many tutorials first' },
          { value: 2, label: 'Read all available materials' },
          { value: 3, label: 'Start with basic practice' },
          { value: 4, label: 'Jump into a small project' },
          { value: 5, label: 'Build something useful while learning' }
        ],
        weight: 1.4
      },
      {
        id: 'at_3',
        category: 'action_taking',
        type: 'multiple_choice',
        question: 'How do you handle fear of failure?',
        options: [
          { value: 1, label: 'It often stops me from trying' },
          { value: 2, label: 'I proceed cautiously' },
          { value: 3, label: 'I acknowledge it but move forward' },
          { value: 4, label: 'I see failure as learning opportunity' },
          { value: 5, label: 'I embrace failure as essential for growth' }
        ],
        weight: 1.2
      },
      {
        id: 'at_4',
        category: 'action_taking',
        type: 'likert',
        question: 'I regularly step outside my comfort zone to grow',
        options: [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Neutral' },
          { value: 4, label: 'Agree' },
          { value: 5, label: 'Strongly Agree' }
        ],
        weight: 1.1
      },
      {
        id: 'at_5',
        category: 'action_taking',
        type: 'scenario',
        question: 'When you encounter an obstacle in a project, you:',
        options: [
          { value: 1, label: 'Give up and move to something else' },
          { value: 2, label: 'Wait for help or instructions' },
          { value: 3, label: 'Try a few different approaches' },
          { value: 4, label: 'Research solutions systematically' },
          { value: 5, label: 'See it as a puzzle and enjoy finding creative solutions' }
        ],
        weight: 1.3
      },
      {
        id: 'at_6',
        category: 'action_taking',
        type: 'likert',
        question: 'I make decisions quickly and adjust course as needed',
        options: [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Neutral' },
          { value: 4, label: 'Agree' },
          { value: 5, label: 'Strongly Agree' }
        ],
        weight: 1.2
      },
      {
        id: 'at_7',
        category: 'action_taking',
        type: 'multiple_choice',
        question: 'Your approach to perfectionism is:',
        options: [
          { value: 1, label: 'I need everything perfect before starting' },
          { value: 2, label: 'I often get stuck making things perfect' },
          { value: 3, label: 'I aim for good enough to get started' },
          { value: 4, label: 'I prioritize progress over perfection' },
          { value: 5, label: 'I launch quickly and improve based on feedback' }
        ],
        weight: 1.1
      },

      // Financial Psychology Questions (6)
      {
        id: 'fp_1',
        category: 'financial_psychology',
        type: 'likert',
        question: 'I believe my financial situation is within my control',
        options: [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Neutral' },
          { value: 4, label: 'Agree' },
          { value: 5, label: 'Strongly Agree' }
        ],
        weight: 1.3
      },
      {
        id: 'fp_2',
        category: 'financial_psychology',
        type: 'scenario',
        question: 'When thinking about money, you feel:',
        options: [
          { value: 1, label: 'Anxious and stressed' },
          { value: 2, label: 'Limited and restricted' },
          { value: 3, label: 'Neutral and practical' },
          { value: 4, label: 'Optimistic and resourceful' },
          { value: 5, label: 'Empowered and abundant' }
        ],
        weight: 1.4
      },
      {
        id: 'fp_3',
        category: 'financial_psychology',
        type: 'multiple_choice',
        question: 'How do you view investing in your education?',
        options: [
          { value: 1, label: 'As an expense to avoid' },
          { value: 2, label: 'As a necessary cost' },
          { value: 3, label: 'As a valuable investment' },
          { value: 4, label: 'As the best return on investment' },
          { value: 5, label: 'As essential for wealth creation' }
        ],
        weight: 1.2
      },
      {
        id: 'fp_4',
        category: 'financial_psychology',
        type: 'likert',
        question: 'I regularly educate myself about financial matters',
        options: [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Neutral' },
          { value: 4, label: 'Agree' },
          { value: 5, label: 'Strongly Agree' }
        ],
        weight: 1.1
      },
      {
        id: 'fp_5',
        category: 'financial_psychology',
        type: 'scenario',
        question: 'If you received 10,000 ETB unexpectedly, you would:',
        options: [
          { value: 1, label: 'Spend it on immediate needs' },
          { value: 2, label: 'Save most of it' },
          { value: 3, label: 'Pay off debts' },
          { value: 4, label: 'Invest in skill development' },
          { value: 5, label: 'Use it to start a income-generating project' }
        ],
        weight: 1.3
      },
      {
        id: 'fp_6',
        category: 'financial_psychology',
        type: 'likert',
        question: 'I see money as a tool for creating opportunities',
        options: [
          { value: 1, label: 'Strongly Disagree' },
          { value: 2, label: 'Disagree' },
          { value: 3, label: 'Neutral' },
          { value: 4, label: 'Agree' },
          { value: 5, label: 'Strongly Agree' }
        ],
        weight: 1.2
      }
    ];
  }

  calculateResults(answers) {
    try {
      const categoryScores = {};
      let totalScore = 0;
      let maxPossibleScore = 0;

      // Initialize category scores
      this.ASSESSMENT_CONFIG.categories.forEach(category => {
        categoryScores[category.id] = {
          rawScore: 0,
          maxScore: 0,
          percentage: 0,
          level: 'beginner'
        };
      });

      // Calculate scores
      Object.values(answers).forEach(answer => {
        const question = this.generateAssessmentQuestions().find(q => q.id === answer.questionId);
        if (question) {
          const category = question.category;
          const weightedScore = answer.value * question.weight;
          
          categoryScores[category].rawScore += weightedScore;
          categoryScores[category].maxScore += 5 * question.weight;
        }
      });

      // Calculate percentages and levels
      this.ASSESSMENT_CONFIG.categories.forEach(category => {
        const catScore = categoryScores[category.id];
        catScore.percentage = (catScore.rawScore / catScore.maxScore) * 100;
        catScore.level = this.getMindsetLevel(catScore.percentage);
        
        totalScore += catScore.percentage * category.weight;
        maxPossibleScore += 100 * category.weight;
      });

      const overallPercentage = (totalScore / maxPossibleScore) * 100;
      const overallLevel = this.getMindsetLevel(overallPercentage);
      const readinessScore = this.calculateReadinessScore(overallPercentage, categoryScores);

      return {
        overallScore: overallPercentage,
        overallLevel,
        readinessScore,
        categoryScores,
        isReadyForTraining: readinessScore >= this.ASSESSMENT_CONFIG.minCompletionScore,
        recommendations: this.generateRecommendations(categoryScores, overallLevel),
        assessmentDate: new Date().toISOString(),
        version: '1.0'
      };
    } catch (error) {
      this.logger.error('Error calculating assessment results', error);
      throw new Error('ASSESSMENT_CALCULATION_FAILED');
    }
  }

  getMindsetLevel(percentage) {
    if (percentage >= 85) return 'transformer';
    if (percentage >= 70) return 'achiever';
    if (percentage >= 55) return 'builder';
    if (percentage >= 40) return 'learner';
    return 'beginner';
  }

  calculateReadinessScore(overallScore, categoryScores) {
    // Base score from overall assessment
    let readinessScore = overallScore;

    // Adjust based on critical category performance
    const criticalCategories = ['action_taking', 'discipline_building'];
    criticalCategories.forEach(category => {
      if (categoryScores[category].percentage < 50) {
        readinessScore -= 10;
      } else if (categoryScores[category].percentage > 80) {
        readinessScore += 5;
      }
    });

    return Math.max(0, Math.min(100, readinessScore));
  }

  generateRecommendations(categoryScores, overallLevel) {
    const recommendations = [];

    Object.entries(categoryScores).forEach(([category, scores]) => {
      if (scores.percentage < 60) {
        const categoryConfig = this.ASSESSMENT_CONFIG.categories.find(c => c.id === category);
        recommendations.push({
          category,
          priority: 'high',
          message: `Focus on improving your ${categoryConfig.name.toLowerCase()} - ${categoryConfig.description}`,
          actions: this.getImprovementActions(category)
        });
      } else if (scores.percentage < 75) {
        const categoryConfig = this.ASSESSMENT_CONFIG.categories.find(c => c.id === category);
        recommendations.push({
          category,
          priority: 'medium',
          message: `Continue developing your ${categoryConfig.name.toLowerCase()} skills`,
          actions: this.getImprovementActions(category)
        });
      }
    });

    // Add overall recommendation
    if (overallLevel === 'transformer') {
      recommendations.push({
        category: 'overall',
        priority: 'low',
        message: 'You have an excellent mindset foundation! Ready for accelerated learning.',
        actions: ['Proceed to skill selection', 'Consider advanced learning paths']
      });
    }

    return recommendations;
  }

  getImprovementActions(category) {
    const actions = {
      wealth_consciousness: [
        'Read "The Millionaire Fastlane" by MJ DeMarco',
        'Follow successful Ethiopian entrepreneurs',
        'Practice identifying business opportunities daily',
        'Shift language from "I can\'t afford" to "How can I create value?"'
      ],
      discipline_building: [
        'Create a morning routine and stick to it for 21 days',
        'Use time blocking for important tasks',
        'Practice the "5-second rule" for immediate action',
        'Track your daily habits using a habit tracker'
      ],
      action_taking: [
        'Implement the "2-minute rule" for small tasks',
        'Start a small project this week',
        'Practice making quick decisions without overthinking',
        'Embrace imperfect action over perfect planning'
      ],
      financial_psychology: [
        'Track all expenses for 30 days',
        'Read "Rich Dad Poor Dad" by Robert Kiyosaki',
        'Set specific financial goals with deadlines',
        'Practice visualizing your financial success daily'
      ]
    };

    return actions[category] || ['Focus on consistent daily improvement'];
  }
}

// React Components
const QuestionCard = React.memo(({ 
  question, 
  currentAnswer, 
  onAnswer, 
  questionNumber, 
  totalQuestions 
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [question]);

  const handleAnswerSelect = useCallback((value) => {
    onAnswer(question.id, value);
  }, [question.id, onAnswer]);

  return (
    <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
      <View style={styles.questionContainer}>
        {/* Progress Header */}
        <View style={styles.progressHeader}>
          <Text style={styles.progressText}>
            Question {questionNumber} of {totalQuestions}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(questionNumber / totalQuestions) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* Question */}
        <View style={styles.questionContent}>
          <Text style={styles.categoryBadge}>
            {question.category.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={styles.questionText}>
            {question.question}
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                currentAnswer === option.value && styles.optionButtonSelected
              ]}
              onPress={() => handleAnswerSelect(option.value)}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View style={[
                  styles.optionIndicator,
                  currentAnswer === option.value && styles.optionIndicatorSelected
                ]}>
                  {currentAnswer === option.value && (
                    <View style={styles.optionIndicatorInner} />
                  )}
                </View>
                <Text style={[
                  styles.optionText,
                  currentAnswer === option.value && styles.optionTextSelected
                ]}>
                  {option.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Animated.View>
  );
});

const ResultsScreen = React.memo(({ results, onContinue, onRetry }) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    // Animate score counting
    const timer = setTimeout(() => {
      const increment = results.overallScore / 50;
      let current = 0;
      
      const counter = setInterval(() => {
        current += increment;
        if (current >= results.overallScore) {
          current = results.overallScore;
          clearInterval(counter);
        }
        setDisplayScore(Math.floor(current));
      }, 30);

      return () => clearInterval(counter);
    }, 500);

    return () => clearTimeout(timer);
  }, [results.overallScore]);

  const getScoreColor = (score) => {
    if (score >= 80) return COLORS.success;
    if (score >= 60) return COLORS.secondary;
    if (score >= 40) return COLORS.warning;
    return COLORS.danger;
  };

  const getLevelDescription = (level) => {
    const levels = {
      transformer: 'You have an exceptional mindset ready for rapid growth and income generation!',
      achiever: 'You have a strong foundation and are ready to build valuable skills.',
      builder: 'You have good potential with some areas for development.',
      learner: 'You have the right attitude but need to strengthen your foundation.',
      beginner: 'Focus on building fundamental mindset habits first.'
    };
    return levels[level] || 'Continue developing your mindset for success.';
  };

  return (
    <ScrollView style={styles.resultsContainer}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.resultsHeader}
      >
        <Text style={styles.resultsTitle}>Assessment Complete</Text>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreText}>{displayScore}%</Text>
          <Text style={styles.scoreLabel}>Overall Score</Text>
        </View>
        <Text style={styles.levelText}>
          {results.overallLevel.toUpperCase()} LEVEL
        </Text>
        <Text style={styles.levelDescription}>
          {getLevelDescription(results.overallLevel)}
        </Text>
      </LinearGradient>

      <View style={styles.resultsContent}>
        {/* Category Scores */}
        <View style={styles.categoryScores}>
          <Text style={styles.sectionTitle}>Category Breakdown</Text>
          {Object.entries(results.categoryScores).map(([category, score]) => (
            <View key={category} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryName}>
                  {category.replace('_', ' ').toUpperCase()}
                </Text>
                <Text style={[styles.categoryPercent, { color: getScoreColor(score.percentage) }]}>
                  {Math.round(score.percentage)}%
                </Text>
              </View>
              <View style={styles.categoryProgressBar}>
                <View 
                  style={[
                    styles.categoryProgressFill,
                    { 
                      width: `${score.percentage}%`,
                      backgroundColor: getScoreColor(score.percentage)
                    }
                  ]} 
                />
              </View>
              <Text style={styles.categoryLevel}>
                {score.level.toUpperCase()} LEVEL
              </Text>
            </View>
          ))}
        </View>

        {/* Recommendations */}
        {results.recommendations.length > 0 && (
          <View style={styles.recommendations}>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            {results.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationItem}>
                <View style={[
                  styles.priorityIndicator,
                  { backgroundColor: rec.priority === 'high' ? COLORS.danger : rec.priority === 'medium' ? COLORS.warning : COLORS.success }
                ]} />
                <View style={styles.recommendationContent}>
                  <Text style={styles.recommendationText}>{rec.message}</Text>
                  {rec.actions && (
                    <View style={styles.actionsList}>
                      {rec.actions.map((action, actionIndex) => (
                        <Text key={actionIndex} style={styles.actionText}>• {action}</Text>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.resultsActions}>
          {results.isReadyForTraining ? (
            <>
              <Text style={styles.readyText}>
                🎉 You're ready to start your skills journey!
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onContinue}
              >
                <Text style={styles.primaryButtonText}>
                  Continue to Skill Selection
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.notReadyText}>
                We recommend strengthening your mindset foundation first
              </Text>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onRetry}
              >
                <Text style={styles.secondaryButtonText}>
                  Review Mindset Materials
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
});

// Main Component
export default function MindsetAssessment() {
  const router = useRouter();
  const { user } = useAuth();
  const { updateProgress } = useProgressTracking();
  const { submitAssessment, loading } = useMindsetAssessment();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [assessmentEngine] = useState(() => new MindsetAssessmentEngine());
  const [questions] = useState(() => assessmentEngine.generateAssessmentQuestions());
  const [startTime] = useState(() => Date.now());

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion?.id];

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(prev => prev - 1);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [currentQuestionIndex]);

  const handleAnswer = useCallback((questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Calculate and submit results
      const assessmentResults = assessmentEngine.calculateResults(answers);
      setResults(assessmentResults);
      
      // Submit to backend
      submitAssessment({
        userId: user.id,
        answers,
        results: assessmentResults,
        duration: Date.now() - startTime,
        metadata: {
          appVersion: '1.0',
          deviceType: 'mobile'
        }
      });

      // Update progress
      updateProgress('mindset_assessment_completed', {
        score: assessmentResults.overallScore,
        readiness: assessmentResults.readinessScore,
        isReady: assessmentResults.isReadyForTraining
      });
    }
  }, [currentQuestionIndex, questions.length, answers, assessmentEngine, user, submitAssessment, updateProgress, startTime]);

  const handleContinue = useCallback(() => {
    router.push('/(onboarding)/skill-selection');
  }, [router]);

  const handleRetry = useCallback(() => {
    setResults(null);
    setCurrentQuestionIndex(0);
    setAnswers({});
  }, []);

  const canProceed = currentAnswer !== undefined;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Analyzing your results...</Text>
      </View>
    );
  }

  if (results) {
    return <ResultsScreen 
      results={results} 
      onContinue={handleContinue}
      onRetry={handleRetry}
    />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <QuestionCard
          question={currentQuestion}
          currentAnswer={currentAnswer}
          onAnswer={handleAnswer}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
        />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            canProceed ? styles.nextButtonActive : styles.nextButtonDisabled
          ]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text style={styles.nextButtonText}>
            {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.footerNote}>
          Be honest with your answers - this helps us personalize your learning journey
        </Text>
      </View>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: