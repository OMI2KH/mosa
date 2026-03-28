/**
 * 🎯 MOSA FORGE: Enterprise Wealth Goal Management
 * 
 * @module WealthGoal
 * @description Manages student wealth goals, financial targets, and income planning
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Wealth goal setting with validation
 * - Income target planning and tracking
 * - Skill-income matching algorithms
 * - Progress visualization and analytics
 * - Financial milestone tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/auth-context';
import { useWealthGoals } from '../../hooks/use-wealth-goals';
import { WealthGoalChart } from '../../components/wealth/wealth-goal-chart';
import { IncomeTargetSelector } from '../../components/wealth/income-target-selector';
import { SkillIncomeMatcher } from '../../components/wealth/skill-income-matcher';
import { FinancialMilestones } from '../../components/wealth/financial-milestones';
import { apiService } from '../../services/api-service';
import { wealthGoalConfig } from '../../constants/wealth-config';

// 🏗️ Enterprise Constants
const WEALTH_CATEGORIES = {
  SURVIVAL: 'survival',
  COMFORT: 'comfort',
  PROSPERITY: 'prosperity',
  FREEDOM: 'freedom'
};

const INCOME_RANGES = {
  SURVIVAL: { min: 2000, max: 5000, label: 'Basic Needs' },
  COMFORT: { min: 5000, max: 15000, label: 'Comfortable Living' },
  PROSPERITY: { min: 15000, max: 50000, label: 'Professional Income' },
  FREEDOM: { min: 50000, max: 100000, label: 'Financial Freedom' }
};

/**
 * 🏗️ Enterprise Wealth Goal Component
 * @component WealthGoal
 * @description Main component for wealth goal setting and management
 */
const WealthGoal = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, updateUserProfile } = useAuth();
  const { 
    wealthGoals, 
    setWealthGoal, 
    calculateTimeline, 
    validateGoal,
    getRecommendedSkills 
  } = useWealthGoals();

  // 🏗️ State Management
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    monthlyIncome: null,
    timeline: 6,
    category: '',
    priority: 'medium',
    skills: [],
    currentIncome: 0,
    financialResponsibilities: []
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [animation] = useState(new Animated.Value(0));

  // 🏗️ Refs for performance
  const mountedRef = React.useRef(true);
  const debounceTimerRef = React.useRef(null);

  // 🏗️ Initialize component
  useEffect(() => {
    _initializeComponent();
    return () => {
      mountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * 🏗️ Initialize component data
   * @private
   */
  const _initializeComponent = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load user's existing wealth goals if any
      const existingGoals = await apiService.get(`/wealth-goals/user/${user.id}`);
      
      if (existingGoals && existingGoals.length > 0) {
        const activeGoal = existingGoals.find(goal => goal.status === 'active');
        if (activeGoal) {
          setFormData(prev => ({
            ...prev,
            monthlyIncome: activeGoal.targetIncome,
            timeline: activeGoal.timelineMonths,
            category: activeGoal.category,
            skills: activeGoal.skills || []
          }));
        }
      }

      // Calculate initial recommendations
      await _calculateRecommendations();

      // Start entrance animation
      Animated.timing(animation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();

    } catch (error) {
      _handleError('INITIALIZATION_ERROR', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user.id, animation]);

  /**
   * 🏗️ Calculate skill recommendations based on goals
   * @private
   */
  const _calculateRecommendations = useCallback(async () => {
    try {
      const recommended = await getRecommendedSkills({
        targetIncome: formData.monthlyIncome,
        timeline: formData.timeline,
        currentSkills: user.skills || []
      });

      if (mountedRef.current) {
        setRecommendations(recommended);
      }
    } catch (error) {
      console.warn('Failed to calculate recommendations:', error);
    }
  }, [formData.monthlyIncome, formData.timeline, user.skills, getRecommendedSkills]);

  /**
   * 🏗️ Handle income target selection
   * @param {number} income - Monthly income target
   */
  const handleIncomeSelect = useCallback((income) => {
    // Debounce rapid selections
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const category = _categorizeIncome(income);
      
      setFormData(prev => ({
        ...prev,
        monthlyIncome: income,
        category: category
      }));

      // Validate immediately
      const errors = validateGoal({
        ...formData,
        monthlyIncome: income,
        category: category
      });

      setValidationErrors(errors);

      // Recalculate recommendations
      _calculateRecommendations();
    }, 300);
  }, [formData, validateGoal, _calculateRecommendations]);

  /**
   * 🏗️ Categorize income level
   * @private
   */
  const _categorizeIncome = (income) => {
    if (income <= INCOME_RANGES.SURVIVAL.max) return WEALTH_CATEGORIES.SURVIVAL;
    if (income <= INCOME_RANGES.COMFORT.max) return WEALTH_CATEGORIES.COMFORT;
    if (income <= INCOME_RANGES.PROSPERITY.max) return WEALTH_CATEGORIES.PROSPERITY;
    return WEALTH_CATEGORIES.FREEDOM;
  };

  /**
   * 🏗️ Handle timeline change
   * @param {number} months - Timeline in months
   */
  const handleTimelineChange = useCallback((months) => {
    setFormData(prev => ({
      ...prev,
      timeline: months
    }));

    // Recalculate and validate
    const errors = validateGoal({
      ...formData,
      timeline: months
    });
    setValidationErrors(errors);
  }, [formData, validateGoal]);

  /**
   * 🏗️ Handle skill selection
   * @param {Array} selectedSkills - Selected skill IDs
   */
  const handleSkillSelect = useCallback((selectedSkills) => {
    setFormData(prev => ({
      ...prev,
      skills: selectedSkills
    }));
  }, []);

  /**
   * 🏗️ Validate form before submission
   * @returns {boolean} Validation result
   */
  const validateForm = useCallback(() => {
    const errors = validateGoal(formData);
    setValidationErrors(errors);
    
    const isValid = Object.keys(errors).length === 0;
    
    if (!isValid) {
      // Scroll to first error
      _scrollToError();
    }
    
    return isValid;
  }, [formData, validateGoal]);

  /**
   * 🏗️ Scroll to first validation error
   * @private
   */
  const _scrollToError = () => {
    // Implementation for scrolling to error field
    Alert.alert(
      'Validation Error',
      'Please check your inputs and try again.',
      [{ text: 'OK' }]
    );
  };

  /**
   * 🏗️ Handle goal submission
   */
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Create wealth goal object
      const wealthGoal = {
        userId: user.id,
        targetIncome: formData.monthlyIncome,
        timelineMonths: formData.timeline,
        category: formData.category,
        priority: formData.priority,
        selectedSkills: formData.skills,
        currentIncome: formData.currentIncome,
        financialResponsibilities: formData.financialResponsibilities,
        status: 'active',
        progress: 0,
        milestones: _generateMilestones(formData)
      };

      // Save to backend
      const result = await setWealthGoal(wealthGoal);

      // Update user profile with wealth goal reference
      await updateUserProfile({
        wealthGoalId: result.id,
        financialCategory: formData.category
      });

      // Navigate to next screen with success
      navigation.navigate('SkillSelection', {
        wealthGoal: result,
        preselectedSkills: formData.skills
      });

    } catch (error) {
      _handleError('GOAL_SUBMISSION_ERROR', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [formData, user.id, validateForm, setWealthGoal, updateUserProfile, navigation]);

  /**
   * 🏗️ Generate financial milestones
   * @private
   */
  const _generateMilestones = (goalData) => {
    const milestones = [];
    const monthlyTarget = goalData.monthlyIncome;
    const totalMonths = goalData.timeline;

    // Generate quarterly milestones
    for (let i = 3; i <= totalMonths; i += 3) {
      const progressPercentage = (i / totalMonths) * 100;
      const targetIncome = (monthlyTarget * progressPercentage) / 100;
      
      milestones.push({
        month: i,
        targetIncome: Math.round(targetIncome),
        type: 'quarterly',
        completed: false
      });
    }

    // Add final milestone
    milestones.push({
      month: totalMonths,
      targetIncome: monthlyTarget,
      type: 'final',
      completed: false
    });

    return milestones;
  };

  /**
   * 🏗️ Handle errors with proper logging and user feedback
   * @private
   */
  const _handleError = (errorType, error) => {
    console.error(`WealthGoal Error [${errorType}]:`, error);

    const errorMessages = {
      INITIALIZATION_ERROR: 'Failed to load your financial data. Please try again.',
      GOAL_SUBMISSION_ERROR: 'Unable to save your wealth goal. Please check your connection.',
      VALIDATION_ERROR: 'Please check your inputs and try again.',
      NETWORK_ERROR: 'Network connection issue. Please check your internet.',
      DEFAULT: 'An unexpected error occurred. Please try again.'
    };

    Alert.alert(
      'Error',
      errorMessages[errorType] || errorMessages.DEFAULT,
      [{ text: 'OK' }]
    );
  };

  /**
   * 🏗️ Render loading state
   */
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={wealthGoalConfig.colors.primary} />
      <Text style={styles.loadingText}>Analyzing your financial potential...</Text>
    </View>
  );

  /**
   * 🏗️ Render step 1 - Income Target Selection
   */
  const renderStep1 = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: animation,
          transform: [{
            translateY: animation.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })
          }]
        }
      ]}
    >
      <Text style={styles.stepTitle}>What's Your Income Target?</Text>
      <Text style={styles.stepDescription}>
        Set your monthly income goal. This helps us match you with the right skills.
      </Text>

      <IncomeTargetSelector
        selectedIncome={formData.monthlyIncome}
        onIncomeSelect={handleIncomeSelect}
        validationError={validationErrors.monthlyIncome}
      />

      {formData.monthlyIncome && (
        <View style={styles.incomeAnalysis}>
          <Text style={styles.analysisTitle}>
            {_getIncomeCategoryDescription(formData.category)}
          </Text>
          <Text style={styles.analysisText}>
            {_getIncomeTimelineAnalysis(formData.monthlyIncome, formData.timeline)}
          </Text>
        </View>
      )}
    </Animated.View>
  );

  /**
   * 🏗️ Render step 2 - Timeline Selection
   */
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Your Timeline</Text>
        <Text style={styles.stepDescription}>
        How soon do you want to achieve this income?
      </Text>

      <View style={styles.timelineContainer}>
        {[3, 6, 9, 12].map((months) => (
          <TouchableOpacity
            key={months}
            style={[
              styles.timelineOption,
              formData.timeline === months && styles.timelineOptionSelected
            ]}
            onPress={() => handleTimelineChange(months)}
          >
            <Text style={[
              styles.timelineText,
              formData.timeline === months && styles.timelineTextSelected
            ]}>
              {months} Months
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {formData.monthlyIncome && formData.timeline && (
        <WealthGoalChart
          targetIncome={formData.monthlyIncome}
          timeline={formData.timeline}
          currentIncome={formData.currentIncome}
        />
      )}
    </View>
  );

  /**
   * 🏗️ Render step 3 - Skill Matching
   */
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Matching Skills</Text>
      <Text style={styles.stepDescription}>
        Based on your goal, we recommend these high-income skills:
      </Text>

      <SkillIncomeMatcher
        targetIncome={formData.monthlyIncome}
        timeline={formData.timeline}
        selectedSkills={formData.skills}
        onSkillsChange={handleSkillSelect}
        recommendations={recommendations}
      />

      {validationErrors.skills && (
        <Text style={styles.errorText}>{validationErrors.skills}</Text>
      )}
    </View>
  );

  /**
   * 🏗️ Get income category description
   * @private
   */
  const _getIncomeCategoryDescription = (category) => {
    const descriptions = {
      [WEALTH_CATEGORIES.SURVIVAL]: '🎯 Basic Needs Level\nCover your essential expenses and build foundation',
      [WEALTH_CATEGORIES.COMFORT]: '🏠 Comfortable Living\nLive well and save for the future',
      [WEALTH_CATEGORIES.PROSPERITY]: '💼 Professional Income\nBuild career and financial security',
      [WEALTH_CATEGORIES.FREEDOM]: '🚀 Financial Freedom\nCreate wealth and multiple income streams'
    };
    return descriptions[category] || 'Set your income target';
  };

  /**
   * 🏗️ Get income timeline analysis
   * @private
   */
  const _getIncomeTimelineAnalysis = (income, timeline) => {
    const monthlyGrowth = income / timeline;
    return `You'll need to grow your income by approximately ${Math.round(monthlyGrowth)} ETB per month to reach your goal.`;
  };

  /**
   * 🏗️ Render navigation buttons
   */
  const renderNavigation = () => (
    <View style={styles.navigationContainer}>
      {currentStep > 1 && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep(currentStep - 1)}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[
          styles.nextButton,
          (!formData.monthlyIncome || loading) && styles.nextButtonDisabled
        ]}
        onPress={currentStep < 3 ? () => setCurrentStep(currentStep + 1) : handleSubmit}
        disabled={!formData.monthlyIncome || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.nextButtonText}>
            {currentStep < 3 ? 'Continue' : 'Set Wealth Goal'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // 🏗️ Main render
  if (loading && !formData.monthlyIncome) {
    return renderLoading();
  }

  return (
    <LinearGradient
      colors={wealthGoalConfig.gradient.background}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Define Your Wealth Goal</Text>
          <Text style={styles.subtitle}>
            Transform your financial future in 4 months
          </Text>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((step) => (
            <View
              key={step}
              style={[
                styles.progressStep,
                step <= currentStep && styles.progressStepActive,
                step < currentStep && styles.progressStepCompleted
              ]}
            />
          ))}
        </View>

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        {/* Financial Milestones Preview */}
        {formData.monthlyIncome && formData.timeline && (
          <FinancialMilestones
            milestones={_generateMilestones(formData)}
            compact={true}
          />
        )}
      </ScrollView>

      {/* Navigation */}
      {renderNavigation()}
    </LinearGradient>
  );
};

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  progressStep: {
    width: 30,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  progressStepActive: {
    backgroundColor: wealthGoalConfig.colors.primary,
  },
  progressStepCompleted: {
    backgroundColor: wealthGoalConfig.colors.success,
  },
  stepContainer: {
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  timelineContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timelineOption: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timelineOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: wealthGoalConfig.colors.primary,
  },
  timelineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  timelineTextSelected: {
    color: wealthGoalConfig.colors.primary,
    fontWeight: '600',
  },
  incomeAnalysis: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  analysisText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  backButton: {
    padding: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  nextButton: {
    flex: 1,
    marginLeft: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: wealthGoalConfig.colors.primary,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    color: wealthGoalConfig.colors.error,
    fontSize: 14,
    marginTop: 8,
  },
});

// 🏗️ Performance Optimization
export default React.memo(WealthGoal);

// 🏗️ Component Documentation
/**
 * @typedef {Object} WealthGoalData
 * @property {number} monthlyIncome - Target monthly income in ETB
 * @property {number} timeline - Timeline in months
 * @property {string} category - Wealth category
 * @property {string} priority - Goal priority level
 * @property {Array} skills - Selected skill IDs
 * @property {number} currentIncome - Current monthly income
 * @property {Array} financialResponsibilities - Financial obligations
 */

/**
 * @typedef {Object} WealthGoalProps
 * @property {Object} route - React Navigation route object
 * @property {Object} navigation - React Navigation navigation object
 */