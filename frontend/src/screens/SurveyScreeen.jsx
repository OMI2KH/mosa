import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import api from '../utils/api';
import { useStore } from '../store/useStore';

export default function SurveyScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { setUser } = useStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [skills, setSkills] = useState('');
  const [passions, setPassions] = useState('');
  const [risk, setRisk] = useState('');
  const [learningStyle, setLearningStyle] = useState('');
  const [incomeGoal, setIncomeGoal] = useState('');
  const [timeCommitment, setTimeCommitment] = useState('');
  const [loading, setLoading] = useState(false);

  const archetypeData = {
    preserver: {
      name: 'Preserver Ember',
      icon: 'shield-checkmark',
      color: '#3B82F6',
      description: 'You value security and steady growth. Your path focuses on building solid foundations and preserving wealth through reliable methods.',
      strengths: ['Disciplined saving', 'Risk management', 'Long-term planning'],
      recommended: ['Wealth preservation lessons', 'Emergency fund building', 'Safe investment strategies']
    },
    multiplier: {
      name: 'Multiplier Flame',
      icon: 'trending-up',
      color: '#D4A017',
      description: 'You seek growth and opportunity. Your path focuses on scaling income and multiplying wealth through strategic investments and business.',
      strengths: ['Opportunity spotting', 'Strategic thinking', 'Growth mindset'],
      recommended: ['Business scaling lessons', 'Investment strategies', 'Market analysis']
    },
    creator: {
      name: 'Creator Spark',
      icon: 'build',
      color: '#10B981',
      description: 'You are hands-on and innovative. Your path focuses on creating value through skills, craftsmanship, and entrepreneurial ventures.',
      strengths: ['Practical skills', 'Creativity', 'Problem-solving'],
      recommended: ['Skill-based income', 'Product creation', 'Service businesses']
    }
  };

  const riskOptions = [
    {
      value: 'low',
      label: 'Low Risk',
      description: 'I prefer safe, predictable outcomes',
      archetype: 'preserver',
      icon: 'shield-half'
    },
    {
      value: 'medium', 
      label: 'Medium Risk',
      description: 'I balance safety with growth opportunities',
      archetype: 'multiplier',
      icon: 'scale'
    },
    {
      value: 'high',
      label: 'High Risk',
      description: 'I pursue high-growth opportunities aggressively',
      archetype: 'creator',
      icon: 'rocket'
    }
  ];

  const learningOptions = [
    { value: 'visual', label: 'Visual Learner', icon: 'eye' },
    { value: 'hands-on', label: 'Hands-On Learner', icon: 'build' },
    { value: 'theoretical', label: 'Theoretical Learner', icon: 'book' },
    { value: 'social', label: 'Social Learner', icon: 'people' }
  ];

  const incomeOptions = [
    { value: 'supplemental', label: 'Supplemental Income', amount: 'ETB 1,000-5,000/month' },
    { value: 'part-time', label: 'Part-Time Income', amount: 'ETB 5,000-15,000/month' },
    { value: 'full-time', label: 'Full-Time Income', amount: 'ETB 15,000-50,000/month' },
    { value: 'wealth-building', label: 'Wealth Building', amount: 'ETB 50,000+/month' }
  ];

  const timeOptions = [
    { value: 'minimal', label: '2-5 hours/week', description: 'Slow and steady progress' },
    { value: 'moderate', label: '5-15 hours/week', description: 'Balanced commitment' },
    { value: 'intensive', label: '15+ hours/week', description: 'Rapid skill development' }
  ];

  const submitSurvey = async () => {
    if (!skills || !passions || !risk || !learningStyle || !incomeGoal || !timeCommitment) {
      Alert.alert(t('error'), 'Please complete all sections to discover your archetype');
      return;
    }

    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error'), t('location_permission_needed'));
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const surveyData = { 
        skills, 
        passions, 
        risk, 
        learningStyle, 
        incomeGoal, 
        timeCommitment 
      };

      const res = await api.post('/auth/survey', {
        surveyData,
        location: { 
          lat: location.coords.latitude, 
          lng: location.coords.longitude 
        },
      });

      const storedUser = JSON.parse(await AsyncStorage.getItem('user') || '{}');
      const updatedUser = { 
        ...storedUser, 
        archetype: res.data.archetype,
        surveyCompleted: true 
      };

      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Move to results step
      setCurrentStep(4);

    } catch (err) {
      Alert.alert(
        t('error'),
        err.response?.data?.error || t('survey_failed')
      );
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map(step => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            step === currentStep && styles.stepCircleActive,
            step < currentStep && styles.stepCircleCompleted
          ]}>
            {step < currentStep ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : (
              <Text style={[
                styles.stepNumber,
                step === currentStep && styles.stepNumberActive
              ]}>
                {step}
              </Text>
            )}
          </View>
          {step < 4 && (
            <View style={[
              styles.stepConnector,
              step < currentStep && styles.stepConnectorActive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Skills & Passions</Text>
            <Text style={styles.stepDescription}>
              Tell us about your current abilities and what excites you
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>What skills do you already have?</Text>
              <Text style={styles.inputHint}>
                (e.g., carpentry, cooking, digital skills, trading, etc.)
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="List your skills and experience..."
                value={skills}
                onChangeText={setSkills}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>What are you passionate about?</Text>
              <Text style={styles.inputHint}>
                (What activities make you lose track of time?)
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your passions and interests..."
                value={passions}
                onChangeText={setPassions}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Learning Style & Goals</Text>
            <Text style={styles.stepDescription}>
              Help us personalize your Mosa learning experience
            </Text>

            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>How do you learn best?</Text>
              {learningOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionCard,
                    learningStyle === option.value && styles.optionCardSelected
                  ]}
                  onPress={() => setLearningStyle(option.value)}
                >
                  <Ionicons 
                    name={option.icon} 
                    size={24} 
                    color={learningStyle === option.value ? '#2D5016' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.optionText,
                    learningStyle === option.value && styles.optionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Your income goal:</Text>
              {incomeOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionCard,
                    incomeGoal === option.value && styles.optionCardSelected
                  ]}
                  onPress={() => setIncomeGoal(option.value)}
                >
                  <View style={styles.incomeOption}>
                    <Text style={[
                      styles.optionText,
                      incomeGoal === option.value && styles.optionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.incomeAmount}>{option.amount}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Risk Profile & Commitment</Text>
            <Text style={styles.stepDescription}>
              Understanding your preferences helps us recommend the right path
            </Text>

            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Your risk tolerance:</Text>
              {riskOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionCard,
                    risk === option.value && styles.optionCardSelected
                  ]}
                  onPress={() => setRisk(option.value)}
                >
                  <Ionicons 
                    name={option.icon} 
                    size={24} 
                    color={risk === option.value ? '#2D5016' : '#6B7280'} 
                  />
                  <View style={styles.riskOption}>
                    <Text style={[
                      styles.optionText,
                      risk === option.value && styles.optionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.riskDescription}>{option.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Weekly time commitment:</Text>
              {timeOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionCard,
                    timeCommitment === option.value && styles.optionCardSelected
                  ]}
                  onPress={() => setTimeCommitment(option.value)}
                >
                  <Ionicons 
                    name="time" 
                    size={24} 
                    color={timeCommitment === option.value ? '#2D5016' : '#6B7280'} 
                  />
                  <View style={styles.timeOption}>
                    <Text style={[
                      styles.optionText,
                      timeCommitment === option.value && styles.optionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={styles.timeDescription}>{option.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 4:
        const archetype = riskOptions.find(opt => opt.value === risk)?.archetype || 'multiplier';
        const userArchetype = archetypeData[archetype];

        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Your Mosa Archetype</Text>
            <Text style={styles.stepDescription}>
              Discover your wealth-building personality
            </Text>

            <View style={styles.archetypeCard}>
              <View style={[styles.archetypeHeader, { backgroundColor: userArchetype.color }]}>
                <Ionicons name={userArchetype.icon} size={32} color="#FFFFFF" />
                <Text style={styles.archetypeName}>{userArchetype.name}</Text>
              </View>
              
              <View style={styles.archetypeBody}>
                <Text style={styles.archetypeDescription}>
                  {userArchetype.description}
                </Text>

                <View style={styles.strengthsSection}>
                  <Text style={styles.sectionTitle}>Your Strengths</Text>
                  {userArchetype.strengths.map((strength, index) => (
                    <View key={index} style={styles.strengthItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.strengthText}>{strength}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.recommendedSection}>
                  <Text style={styles.sectionTitle}>Recommended Path</Text>
                  {userArchetype.recommended.map((item, index) => (
                    <View key={index} style={styles.recommendedItem}>
                      <Ionicons name="play" size={16} color="#D4A017" />
                      <Text style={styles.recommendedText}>{item}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.ctaSection}>
                  <Text style={styles.ctaText}>
                    Ready to start your personalized wealth-building journey?
                  </Text>
                  <TouchableOpacity 
                    style={styles.startButton}
                    onPress={() => navigation.navigate('Home')}
                  >
                    <Ionicons name="flash" size={20} color="#FFFFFF" />
                    <Text style={styles.startButtonText}>Begin My Mosa Journey</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return skills.trim() && passions.trim();
      case 2: return learningStyle && incomeGoal;
      case 3: return risk && timeCommitment;
      default: return true;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="flash" size={32} color="#D4A017" />
              <Text style={styles.logoText}>MOSA ARCHETYPE</Text>
            </View>
            <Text style={styles.headerSubtitle}>Discover Your Wealth-Building Path</Text>
          </View>

          {/* Progress Steps */}
          {currentStep < 4 && renderStepIndicator()}

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons */}
          {currentStep < 4 && (
            <View style={styles.navigation}>
              {currentStep > 1 && (
                <TouchableOpacity style={styles.secondaryButton} onPress={prevStep}>
                  <Ionicons name="arrow-back" size={20} color="#2D5016" />
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              {currentStep < 3 ? (
                <TouchableOpacity 
                  style={[
                    styles.primaryButton,
                    !canProceed() && styles.primaryButtonDisabled
                  ]}
                  onPress={nextStep}
                  disabled={!canProceed()}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.completeButton,
                    (!canProceed() || loading) && styles.completeButtonDisabled
                  ]}
                  onPress={submitSurvey}
                  disabled={!canProceed() || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="analytics" size={20} color="#FFFFFF" />
                      <Text style={styles.completeButtonText}>Discover My Archetype</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D5016',
    marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#2D5016',
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepConnector: {
    width: 50,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  stepConnectorActive: {
    backgroundColor: '#10B981',
  },
  stepContent: {
    flex: 1,
    marginBottom: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5016',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#2D5016',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionGroup: {
    marginBottom: 32,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5016',
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: '#2D5016',
    backgroundColor: '#F0F7F4',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 12,
    flex: 1,
  },
  optionTextSelected: {
    color: '#2D5016',
  },
  incomeOption: {
    flex: 1,
    marginLeft: 12,
  },
  incomeAmount: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 4,
  },
  riskOption: {
    flex: 1,
    marginLeft: 12,
  },
  riskDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  timeOption: {
    flex: 1,
    marginLeft: 12,
  },
  timeDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  archetypeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  archetypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#D4A017',
  },
  archetypeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  archetypeBody: {
    padding: 24,
  },
  archetypeDescription: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  strengthsSection: {
    marginBottom: 24,
  },
  recommendedSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 16,
  },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  strengthText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 12,
    flex: 1,
  },
  recommendedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendedText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 12,
    flex: 1,
  },
  ctaSection: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  ctaText: {
    fontSize: 16,
    color: '#2D5016',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4A017',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: currentStep === 1 ? 'flex-end' : 'space-between',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#2D5016',
  },
  primaryButtonDisabled: {
    backgroundColor: '#9CA3AF',
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#D4A017',
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
