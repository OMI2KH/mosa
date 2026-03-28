/**
 * 🎯 MOSA FORGE: Enterprise Onboarding System
 * 
 * @module OnboardingScreen
 * @description Complete user onboarding with mindset assessment, skill selection, and commitment verification
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Multi-step onboarding with progress tracking
 * - Mindset assessment and evaluation
 * - 40+ skills catalog with intelligent selection
 * - Commitment verification system
 * - Quality guarantee enrollment
 * - Real-time validation and error handling
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  Platform,
  BackHandler,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';

// 🏗️ Enterprise Hooks & Context
import { useAuth } from '../../contexts/auth-context';
import { useOnboarding } from '../../hooks/use-onboarding';
import { useSkills } from '../../hooks/use-skills-data';
import { useQualityMetrics } from '../../hooks/use-quality-metrics';

// 🏗️ Enterprise Components
import LoadingOverlay from '../../components/shared/LoadingOverlay';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import NetworkStatus from '../../components/shared/NetworkStatus';
import QualityScore from '../../components/quality/QualityScore';

// 🏗️ Enterprise Services
import { onboardingService } from '../../services/onboarding-service';
import { analyticsService } from '../../services/analytics-service';
import { qualityService } from '../../services/quality-service';

// 🏗️ Enterprise Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const ONBOARDING_STEPS = {
  WELCOME: 0,
  MINDSET_ASSESSMENT: 1,
  SKILL_SELECTION: 2,
  COMMITMENT_CHECK: 3,
  QUALITY_GUARANTEE: 4,
  COMPLETION: 5
};

const MINDSET_CATEGORIES = {
  WEALTH_CONSCIOUSNESS: 'wealth_consciousness',
  DISCIPLINE: 'discipline',
  ACTION_TAKING: 'action_taking',
  FINANCIAL_PSYCHOLOGY: 'financial_psychology'
};

/**
 * 🏗️ Enterprise Onboarding Screen Component
 * @component OnboardingScreen
 */
const OnboardingScreen = () => {
  // 🏗️ Refs & State Management
  const scrollViewRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // 🏗️ Navigation & Routing
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  
  // 🏗️ Enterprise Context
  const { user, updateUserProfile } = useAuth();
  const { skills, categories, loading: skillsLoading } = useSkills();
  const { trackMetric } = useQualityMetrics();
  
  // 🏗️ State Management
  const [currentStep, setCurrentStep] = useState(ONBOARDING_STEPS.WELCOME);
  const [onboardingData, setOnboardingData] = useState({
    mindsetScores: {},
    selectedSkills: [],
    commitmentLevel: null,
    qualityAgreement: false,
    estimatedCompletion: null,
    learningPreferences: {}
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showQualityScore, setShowQualityScore] = useState(false);

  // 🏗️ Animation Values
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 5],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp'
  });

  // 🏗️ Side Effects
  useEffect(() => {
    // Track onboarding start
    analyticsService.trackEvent('onboarding_started', {
      userId: user?.id,
      timestamp: new Date().toISOString()
    });

    // Handle Android back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    // Update progress animation
    Animated.timing(progressAnim, {
      toValue: currentStep,
      duration: 500,
      useNativeDriver: false
    }).start();
  }, [currentStep]);

  /**
   * 🏗️ Handle Back Press with Confirmation
   */
  const handleBackPress = useCallback(() => {
    if (currentStep > ONBOARDING_STEPS.WELCOME) {
      Alert.alert(
        'Exit Onboarding?',
        'Your progress will be saved, but you\'ll need to complete onboarding to access the platform.',
        [
          { text: 'Continue', style: 'cancel' },
          { 
            text: 'Exit', 
            style: 'destructive',
            onPress: () => navigation.goBack()
          }
        ]
      );
      return true;
    }
    return false;
  }, [currentStep, navigation]);

  /**
   * 🏗️ Validate Current Step
   */
  const validateStep = useCallback((step) => {
    const newErrors = {};

    switch (step) {
      case ONBOARDING_STEPS.MINDSET_ASSESSMENT:
        if (Object.keys(onboardingData.mindsetScores).length < 4) {
          newErrors.mindset = 'Please complete all mindset assessments';
        }
        break;

      case ONBOARDING_STEPS.SKILL_SELECTION:
        if (onboardingData.selectedSkills.length === 0) {
          newErrors.skills = 'Please select at least one skill to learn';
        } else if (onboardingData.selectedSkills.length > 3) {
          newErrors.skills = 'You can select up to 3 skills to start';
        }
        break;

      case ONBOARDING_STEPS.COMMITMENT_CHECK:
        if (!onboardingData.commitmentLevel) {
          newErrors.commitment = 'Please confirm your commitment level';
        }
        break;

      case ONBOARDING_STEPS.QUALITY_GUARANTEE:
        if (!onboardingData.qualityAgreement) {
          newErrors.quality = 'You must agree to the quality guarantee terms';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [onboardingData]);

  /**
   * 🏗️ Navigate to Next Step
   */
  const handleNextStep = useCallback(async () => {
    if (!validateStep(currentStep)) {
      // 🎯 Shake animation for errors
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 100, useNativeDriver: true })
      ]).start();
      return;
    }

    // 🏗️ Track step completion
    analyticsService.trackEvent('onboarding_step_completed', {
      step: currentStep,
      userId: user?.id,
      data: onboardingData
    });

    if (currentStep < ONBOARDING_STEPS.COMPLETION) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      // Scroll to top for next step
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      await completeOnboarding();
    }
  }, [currentStep, onboardingData, validateStep]);

  /**
   * 🏗️ Navigate to Previous Step
   */
  const handlePreviousStep = useCallback(() => {
    if (currentStep > ONBOARDING_STEPS.WELCOME) {
      setCurrentStep(currentStep - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [currentStep]);

  /**
   * 🏗️ Update Mindset Assessment
   */
  const updateMindsetScore = useCallback((category, score, responses) => {
    setOnboardingData(prev => ({
      ...prev,
      mindsetScores: {
        ...prev.mindsetScores,
        [category]: {
          score,
          responses,
          timestamp: new Date().toISOString()
        }
      }
    }));

    // 🎯 Track quality metric
    trackMetric('mindset_assessment', {
      category,
      score,
      userId: user?.id
    });
  }, [user?.id, trackMetric]);

  /**
   * 🏗️ Toggle Skill Selection
   */
  const toggleSkillSelection = useCallback((skillId) => {
    setOnboardingData(prev => {
      const isSelected = prev.selectedSkills.includes(skillId);
      let newSelectedSkills;

      if (isSelected) {
        newSelectedSkills = prev.selectedSkills.filter(id => id !== skillId);
      } else {
        if (prev.selectedSkills.length >= 3) {
          Alert.alert(
            'Maximum Skills Reached',
            'You can select up to 3 skills to start. Master one skill before adding more.',
            [{ text: 'OK' }]
          );
          return prev;
        }
        newSelectedSkills = [...prev.selectedSkills, skillId];
      }

      // 🎯 Track skill selection
      analyticsService.trackEvent('skill_selected', {
        skillId,
        selected: !isSelected,
        totalSelected: newSelectedSkills.length,
        userId: user?.id
      });

      return { ...prev, selectedSkills: newSelectedSkills };
    });
  }, [user?.id]);

  /**
   * 🏗️ Update Commitment Level
   */
  const updateCommitmentLevel = useCallback((level, hoursPerWeek) => {
    setOnboardingData(prev => ({
      ...prev,
      commitmentLevel: level,
      learningPreferences: {
        ...prev.learningPreferences,
        estimatedHoursPerWeek: hoursPerWeek,
        preferredLearningTimes: []
      }
    }));
  }, []);

  /**
   * 🏗️ Complete Onboarding Process
   */
  const completeOnboarding = useCallback(async () => {
    setLoading(true);

    try {
      // 🏗️ Validate final data
      if (!validateStep(ONBOARDING_STEPS.QUALITY_GUARANTEE)) {
        throw new Error('Please complete all required steps');
      }

      // 🏗️ Calculate mindset score
      const mindsetScore = calculateOverallMindsetScore(onboardingData.mindsetScores);
      
      // 🏗️ Prepare onboarding payload
      const onboardingPayload = {
        userId: user.id,
        faydaId: user.faydaId,
        mindsetAssessment: onboardingData.mindsetScores,
        selectedSkills: onboardingData.selectedSkills,
        commitmentLevel: onboardingData.commitmentLevel,
        learningPreferences: onboardingData.learningPreferences,
        qualityAgreement: onboardingData.qualityAgreement,
        estimatedCompletion: calculateEstimatedCompletion(onboardingData),
        onboardingCompletedAt: new Date().toISOString(),
        metadata: {
          platform: 'mobile',
          version: '1.0.0',
          deviceInfo: Platform.OS
        }
      };

      // 🏗️ Submit to backend
      const result = await onboardingService.completeOnboarding(onboardingPayload);

      if (result.success) {
        // 🎯 Update user profile
        await updateUserProfile({
          onboardingCompleted: true,
          mindsetScore,
          primarySkills: onboardingData.selectedSkills,
          commitmentLevel: onboardingData.commitmentLevel
        });

        // 🎯 Track successful onboarding
        analyticsService.trackEvent('onboarding_completed', {
          userId: user.id,
          mindsetScore,
          skillsCount: onboardingData.selectedSkills.length,
          commitmentLevel: onboardingData.commitmentLevel,
          duration: result.duration
        });

        // 🎯 Show quality score
        setShowQualityScore(true);
        
        // 🎯 Navigate to main app after delay
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainApp' }]
          });
        }, 3000);

      } else {
        throw new Error(result.error || 'Failed to complete onboarding');
      }

    } catch (error) {
      console.error('Onboarding completion error:', error);
      
      Alert.alert(
        'Onboarding Failed',
        error.message || 'Please check your connection and try again.',
        [
          { text: 'Try Again', onPress: () => setLoading(false) },
          { text: 'Contact Support', onPress: () => navigation.navigate('Support') }
        ]
      );
    }
  }, [onboardingData, user, navigation, updateUserProfile, validateStep]);

  /**
   * 🏗️ Calculate Overall Mindset Score
   */
  const calculateOverallMindsetScore = (mindsetScores) => {
    const categories = Object.values(MINDSET_CATEGORIES);
    const totalScore = categories.reduce((sum, category) => {
      return sum + (mindsetScores[category]?.score || 0);
    }, 0);
    
    return Math.round((totalScore / categories.length) * 10) / 10;
  };

  /**
   * 🏗️ Calculate Estimated Completion
   */
  const calculateEstimatedCompletion = (data) => {
    const baseDuration = 16; // 4 months in weeks
    const skillCount = data.selectedSkills.length;
    const commitmentFactor = data.commitmentLevel === 'HIGH' ? 0.8 : 1;
    
    return Math.ceil(baseDuration * skillCount * commitmentFactor);
  };

  // 🏗️ Render Current Step
  const renderCurrentStep = () => {
    switch (currentStep) {
      case ONBOARDING_STEPS.WELCOME:
        return <WelcomeStep onNext={handleNextStep} />;
      
      case ONBOARDING_STEPS.MINDSET_ASSESSMENT:
        return (
          <MindsetAssessmentStep
            scores={onboardingData.mindsetScores}
            onUpdateScore={updateMindsetScore}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
            error={errors.mindset}
          />
        );
      
      case ONBOARDING_STEPS.SKILL_SELECTION:
        return (
          <SkillSelectionStep
            skills={skills}
            categories={categories}
            selectedSkills={onboardingData.selectedSkills}
            onToggleSkill={toggleSkillSelection}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
            error={errors.skills}
            loading={skillsLoading}
          />
        );
      
      case ONBOARDING_STEPS.COMMITMENT_CHECK:
        return (
          <CommitmentCheckStep
            commitmentLevel={onboardingData.commitmentLevel}
            onUpdateCommitment={updateCommitmentLevel}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
            error={errors.commitment}
          />
        );
      
      case ONBOARDING_STEPS.QUALITY_GUARANTEE:
        return (
          <QualityGuaranteeStep
            agreed={onboardingData.qualityAgreement}
            onAgreementChange={(agreed) => 
              setOnboardingData(prev => ({ ...prev, qualityAgreement: agreed }))
            }
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
            error={errors.quality}
          />
        );
      
      case ONBOARDING_STEPS.COMPLETION:
        return <CompletionStep loading={loading} />;
      
      default:
        return <WelcomeStep onNext={handleNextStep} />;
    }
  };

  // 🏗️ Render Progress Bar
  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBackground}>
        <Animated.View 
          style={[
            styles.progressFill,
            { width: progressWidth }
          ]} 
        />
      </View>
      <Text style={styles.progressText}>
        Step {currentStep + 1} of {Object.keys(ONBOARDING_STEPS).length}
      </Text>
    </View>
  );

  if (showQualityScore) {
    return (
      <QualityScore
        score={calculateOverallMindsetScore(onboardingData.mindsetScores)}
        skillsCount={onboardingData.selectedSkills.length}
        commitmentLevel={onboardingData.commitmentLevel}
        onComplete={() => setShowQualityScore(false)}
      />
    );
  }

  return (
    <ErrorBoundary>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        <NetworkStatus />
        
        {/* 🏗️ Progress Bar */}
        {currentStep !== ONBOARDING_STEPS.COMPLETION && renderProgressBar()}

        {/* 🏗️ Main Content */}
        <Animated.View 
          style={[
            styles.content,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderCurrentStep()}
          </ScrollView>
        </Animated.View>

        <LoadingOverlay visible={loading} message="Completing your onboarding..." />
      </View>
    </ErrorBoundary>
  );
};

/**
 * 🏗️ Welcome Step Component
 */
const WelcomeStep = ({ onNext }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
      <View style={styles.welcomeHeader}>
        <LottieView
          source={require('../../assets/animations/welcome.json')}
          autoPlay
          loop
          style={styles.welcomeAnimation}
        />
        
        <Text style={styles.welcomeTitle}>
          Welcome to{'\n'}Mosa Forge 🚀
        </Text>
        
        <Text style={styles.welcomeSubtitle}>
          Your journey from zero to income starts here
        </Text>
      </View>

      <View style={styles.featuresGrid}>
        <View style={styles.featureCard}>
          <Text style={styles.featureEmoji}>🎯</Text>
          <Text style={styles.featureTitle}>4-Month Program</Text>
          <Text style={styles.featureDescription}>
            From beginner to certified professional
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureEmoji}>💰</Text>
          <Text style={styles.featureTitle}>1,999 ETB</Text>
          <Text style={styles.featureDescription}>
            All-inclusive bundle pricing
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureEmoji}>🛡️</Text>
          <Text style={styles.featureTitle}>Quality Guarantee</Text>
          <Text style={styles.featureDescription}>
            Auto-expert switching if quality drops
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureEmoji}>🎓</Text>
          <Text style={styles.featureTitle}>Yachi Verified</Text>
          <Text style={styles.featureDescription}>
            Start earning immediately after completion
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onNext}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#667EEA', '#764BA2']}
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.primaryButtonText}>Start My Journey</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

/**
 * 🏗️ Mindset Assessment Step Component
 */
const MindsetAssessmentStep = ({ 
  scores, 
  onUpdateScore, 
  onNext, 
  onPrevious, 
  error 
}) => {
  const [currentCategory, setCurrentCategory] = useState(MINDSET_CATEGORIES.WEALTH_CONSCIOUSNESS);
  const [currentResponses, setCurrentResponses] = useState({});

  const categories = [
    {
      id: MINDSET_CATEGORIES.WEALTH_CONSCIOUSNESS,
      title: 'Wealth Consciousness',
      description: 'Transform from consumer to creator mindset',
      questions: [
        {
          id: 1,
          question: 'When you see someone successful, what is your first thought?',
          options: [
            { id: 'a', text: 'They must have connections or luck', score: 1 },
            { id: 'b', text: 'I could learn from their journey', score: 3 },
            { id: 'c', text: 'I can achieve that too with hard work', score: 5 }
          ]
        },
        // Add more questions...
      ]
    },
    // Add other categories...
  ];

  const currentCategoryData = categories.find(cat => cat.id === currentCategory);

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Mindset Assessment</Text>
      <Text style={styles.stepDescription}>
        Complete this assessment to evaluate your readiness for success
      </Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Category Progress */}
      <View style={styles.categoryProgress}>
        {categories.map((category, index) => (
          <View key={category.id} style={styles.categoryProgressItem}>
            <View 
              style={[
                styles.categoryProgressDot,
                scores[category.id] ? styles.completedDot : 
                currentCategory === category.id ? styles.activeDot : styles.inactiveDot
              ]}
            />
            {index < categories.length - 1 && <View style={styles.categoryProgressLine} />}
          </View>
        ))}
      </View>

      {/* Current Category Assessment */}
      <View style={styles.assessmentContainer}>
        <Text style={styles.categoryTitle}>{currentCategoryData.title}</Text>
        <Text style={styles.categoryDescription}>{currentCategoryData.description}</Text>

        {/* Render questions */}
        {currentCategoryData.questions.map(question => (
          <View key={question.id} style={styles.questionContainer}>
            <Text style={styles.questionText}>{question.question}</Text>
            {question.options.map(option => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  currentResponses[question.id] === option.id && styles.selectedOption
                ]}
                onPress={() => setCurrentResponses(prev => ({
                  ...prev,
                  [question.id]: option.id
                }))}
              >
                <Text style={styles.optionText}>{option.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Navigation Buttons */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onPrevious}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.primaryButton,
            Object.keys(currentResponses).length < currentCategoryData.questions.length && 
            styles.disabledButton
          ]}
          onPress={() => {
            const score = calculateCategoryScore(currentResponses, currentCategoryData.questions);
            onUpdateScore(currentCategory, score, currentResponses);
            
            const currentIndex = categories.findIndex(cat => cat.id === currentCategory);
            if (currentIndex < categories.length - 1) {
              setCurrentCategory(categories[currentIndex + 1].id);
              setCurrentResponses({});
            } else {
              onNext();
            }
          }}
          disabled={Object.keys(currentResponses).length < currentCategoryData.questions.length}
        >
          <Text style={styles.primaryButtonText}>
            {currentCategory === categories[categories.length - 1].id ? 'Continue' : 'Next Category'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * 🏗️ Skill Selection Step Component
 */
const SkillSelectionStep = ({
  skills,
  categories,
  selectedSkills,
  onToggleSkill,
  onNext,
  onPrevious,
  error,
  loading
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSkills = skills.filter(skill => {
    const matchesCategory = selectedCategory === 'all' || skill.category === selectedCategory;
    const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <View style={styles.stepContainer}>
        <LoadingOverlay visible={true} message="Loading skills catalog..." />
      </View>
    );
  }

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Choose Your Skills</Text>
      <Text style={styles.stepDescription}>
        Select 1-3 skills to master. You can always add more later.
      </Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
      >
        <TouchableOpacity
          style={[
            styles.categoryButton,
            selectedCategory === 'all' && styles.selectedCategoryButton
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text style={[
            styles.categoryButtonText,
            selectedCategory === 'all' && styles.selectedCategoryButtonText
          ]}>
            All Skills
          </Text>
        </TouchableOpacity>

        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && styles.selectedCategoryButton
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={[
              styles.categoryButtonText,
              selectedCategory === category.id && styles.selectedCategoryButtonText
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Skills Grid */}
      <ScrollView style={styles.skillsGrid}>
        {filteredSkills.map(skill => (
          <TouchableOpacity
            key={skill.id}
            style={[
              styles.skillCard,
              selectedSkills.includes(skill.id) && styles.selectedSkillCard
            ]}
            onPress={() => onToggleSkill(skill.id)}
          >
            <View style={styles.skillHeader}>
              <Text style={styles.skillEmoji}>{skill.emoji}</Text>
              <View style={styles.skillInfo}>
                <Text style={styles.skillName}>{skill.name}</Text>
                <Text style={styles.skillDescription}>{skill.description}</Text>
              </View>
              <View style={[
                styles.selectionIndicator,
                selectedSkills.includes(skill.id) && styles.selectedIndicator
              ]}>
                {selectedSkills.includes(skill.id) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </View>

            <View style={styles.skillMetrics}>
              <Text style={styles.skillMetric}>
                📚 {skill.duration} months
              </Text>
              <Text style={styles.skillMetric}>
                💰 {skill.earningPotential}
              </Text>
              <Text style={styles.skillMetric}>
                🎯 {skill.difficulty}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Selection Summary */}
      {selectedSkills.length > 0 && (
        <View style={styles.selectionSummary}>
          <Text style={styles.summaryText}>
            Selected: {selectedSkills.length}/3 skills
          </Text>
        </View>
      )}

      {/* Navigation Buttons */}
      <View style={styles.navigationButtons}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onPrevious}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.primaryButton,
            selectedSkills.length === 0 && styles.disabledButton
          ]}
          onPress={onNext}
          disabled={selectedSkills.length === 0}
        >
          <Text style={styles.primaryButtonText}>
            Continue ({selectedSkills.length})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * 🏗️ Commitment Check Step Component
 */
const CommitmentCheckStep = ({
  commitmentLevel,
  onUpdateCommitment,
  onNext,
  onPrevious,
  error
}) => {
  const commitmentOptions = [
    {
      level: 'HIGH',
      title: 'High Commitment',
      description: '15-20 hours per week',
      benefits: ['Fastest progress', 'Early completion bonus', 'Priority expert matching'],
      color: '#10B981'
    },
    {
      level: 'MEDIUM', 
      title: 'Medium Commitment',
      description: '8-12 hours per week',
      benefits: ['Steady progress', 'Flexible schedule', 'Good work-life balance'],
      color: '#F59E0B'
    },
    {
      level: 'LOW',
      title: 'Low Commitment',
      description: '4-6 hours per week',
      benefits: ['Slow but steady', 'Minimal time investment', 'Extended timeline'],
      color: '#EF4444'
    }
  ];

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Commitment Level</Text>
      <Text style={styles.stepDescription}>
        Your success depends on consistent effort. Choose wisely.
      </Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.commitmentOptions}>
        {commitmentOptions.map(option => (
          <TouchableOpacity
            key={option.level}
            style={[
              styles.commitmentCard,
              commitmentLevel === option.level && styles.selectedCommitmentCard,
              { borderColor: option.color }
            ]}
            onPress={() => onUpdateCommitment(option.level, option.description)}
          >
            <View style={[styles.commitmentHeader, { backgroundColor: option.color }]}>
              <Text style={styles.commitmentTitle}>{option.title}</Text>
              <Text style={styles.commitmentDescription}>{option.description}</Text>
            </View>

            <View style={styles.benefitsList}>
              {option.benefits.map((benefit, index) => (
                <Text key={index} style={styles.benefitItem}>
                  ✓ {benefit}
                </Text>
              ))}
            </View>

            <View style={styles.commitmentFooter}>
              <Text style={styles.completionTime}>
                Estimated completion: {option.level === 'HIGH' ? '3-4' : 
                                     option.level === 'MEDIUM' ? '4-5' : '5-6'} months
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.navigationButtons}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onPrevious}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.primaryButton,
            !commitmentLevel && styles.disabledButton
          ]}
          onPress={onNext}
          disabled={!commitmentLevel}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * 🏗️ Quality Guarantee Step Component
 */
const QualityGuaranteeStep = ({
  agreed,
  onAgreementChange,
  onNext,
  onPrevious,
  error
}) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Quality Guarantee</Text>
      <Text style={styles.stepDescription}>
        Our commitment to your success
      </Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.qualityFeatures}>
        <View style={styles.qualityFeature}>
          <Text style={styles.featureEmoji}>🛡️</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Auto-Expert Switching</Text>
            <Text style={styles.featureDescription}>
              If your expert's quality drops below 4.0 stars, we automatically match you with a better one
            </Text>
          </View>
        </View>

        <View style={styles.qualityFeature}>
          <Text style={styles.featureEmoji}>💰</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Money-Back Guarantee</Text>
            <Text style={styles.featureDescription}>
              7-day cooling period with full refund if not satisfied
            </Text>
          </View>
        </View>

        <View style={styles.qualityFeature}>
          <Text style={styles.featureEmoji}>🎯</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Yachi Verification</Text>
            <Text style={styles.featureDescription}>
              Automatic Yachi provider status upon completion
            </Text>
          </View>
        </View>

        <View style={styles.qualityFeature}>
          <Text style={styles.featureEmoji}>📈</Text>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Income Ready</Text>
            <Text style={styles.featureDescription}>
              Start earning within 2 weeks of certification
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.agreementContainer}>
        <TouchableOpacity 
          style={styles.checkbox}
          onPress={() => onAgreementChange(!agreed)}
        >
          <View style={[
            styles.checkboxInner,
            agreed && styles.checkboxChecked
          ]}>
            {agreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>

        <Text style={styles.agreementText}>
          I understand and agree to the{' '}
          <Text style={styles.linkText}>Quality Guarantee Terms</Text>{' '}
          and{' '}
          <Text style={styles.linkText}>Platform Policies</Text>
        </Text>
      </View>

      <View style={styles.navigationButtons}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onPrevious}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.primaryButton,
            !agreed && styles.disabledButton
          ]}
          onPress={onNext}
          disabled={!agreed}
        >
          <Text style={styles.primaryButtonText}>Complete Onboarding</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * 🏗️ Completion Step Component
 */
const CompletionStep = ({ loading }) => {
  return (
    <View style={styles.stepContainer}>
      <View style={styles.completionContent}>
        <LottieView
          source={require('../../assets/animations/success.json')}
          autoPlay
          loop={false}
          style={styles.completionAnimation}
        />
        
        <Text style={styles.completionTitle}>
          Welcome Aboard! 🎉
        </Text>
        
        <Text style={styles.completionDescription}>
          Your journey to mastery begins now. Get ready to transform your skills and income.
        </Text>

        <View style={styles.nextSteps}>
          <Text style={styles.nextStepsTitle}>What's Next:</Text>
          <Text style={styles.nextStep}>1. Complete Mindset Phase (FREE)</Text>
          <Text style={styles.nextStep}>2. Start Theory Mastery</Text>
          <Text style={styles.nextStep}>3. Get Matched with Expert</Text>
          <Text style={styles.nextStep}>4. Begin Hands-on Training</Text>
        </View>
      </View>

      {loading && (
        <LoadingOverlay visible={true} message="Setting up your learning environment..." />
      )}
    </View>
  );
};

// 🏗️ Helper Functions
const calculateCategoryScore = (responses, questions) => {
  let totalScore = 0;
  let maxScore = 0;

  questions.forEach(question => {
    const responseId = responses[question.id];
    if (responseId) {
      const option = question.options.find(opt => opt.id === responseId);
      totalScore += option.score;
      maxScore += 5; // Assuming max score per question is 5
    }
  });

  return maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
};

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667EEA',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeAnimation: {
    width: 200,
    height: 200,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1E293B',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#64748B',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
  },
  // Add more styles for other components...
});

export default OnboardingScreen;