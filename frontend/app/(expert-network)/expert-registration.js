/**
 * 🏢 MOSA FORGE - Enterprise Expert Registration Frontend
 * 👨‍🏫 Expert Onboarding & Portfolio Management Interface
 * 🛡️ Multi-Step Verification & Document Upload
 * 📊 Real-time Quality Assessment & Tier Preview
 * 🚀 React Native with Expo Enterprise Architecture
 * 
 * @module ExpertRegistration
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  SafeAreaView,
  Image,
  Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeIn,
  FadeInUp,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming
} from 'react-native-reanimated';

// 🏗️ Enterprise Components
import EnterpriseHeader from '../../components/shared/EnterpriseHeader';
import ProgressStepper from '../../components/shared/ProgressStepper';
import DocumentUploader from '../../components/expert/DocumentUploader';
import QualityScorePreview from '../../components/expert/QualityScorePreview';
import TierBadge from '../../components/expert/TierBadge';
import FormInput from '../../components/shared/FormInput';
import PrimaryButton from '../../components/shared/PrimaryButton';
import SecondaryButton from '../../components/shared/SecondaryButton';

// 🛠️ Enterprise Services
import ExpertService from '../../services/expert-service';
import AuthService from '../../services/auth-service';
import ValidationService from '../../services/validation-service';
import UploadService from '../../services/upload-service';

// 🎨 Enterprise Styles
import { Colors, Typography, Spacing, Shadows, Gradients } from '../../theme/enterprise-theme';
import { useTheme } from '../../contexts/ThemeContext';

const { width, height } = Dimensions.get('window');

const ExpertRegistration = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // 🎯 Registration State
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    // 👤 Personal Information
    personalInfo: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      phoneNumber: '',
      email: '',
      gender: '',
      address: ''
    },
    // 🏦 Bank Information
    bankInfo: {
      accountNumber: '',
      bankName: '',
      accountHolderName: '',
      branchName: ''
    },
    // 💼 Professional Information
    professionalInfo: {
      yearsOfExperience: 0,
      previousClients: 0,
      hourlyRate: 0,
      bio: '',
      specialties: []
    },
    // 🎓 Skills & Certifications
    skills: [],
    certifications: [],
    // 📁 Documents
    documents: {
      faydaId: null,
      portfolio: null,
      certificates: [],
      bankStatement: null,
      profilePhoto: null
    },
    // 🎯 Preferences
    preferences: {
      preferredStudents: 0,
      availability: [],
      communicationPreference: 'in_app',
      timezone: 'Africa/Addis_Ababa'
    }
  });

  // 📊 Quality Assessment State
  const [qualityAssessment, setQualityAssessment] = useState({
    overallScore: 0,
    estimatedTier: 'standard',
    strengths: [],
    improvementAreas: [],
    progress: 0
  });

  // 🚨 Error State
  const [errors, setErrors] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);

  // 🔍 Validation State
  const [validationStatus, setValidationStatus] = useState({
    personalInfo: false,
    bankInfo: false,
    professionalInfo: false,
    documents: false,
    skills: false
  });

  // 🔄 Refs
  const scrollViewRef = useRef();
  const progressAnimation = useSharedValue(0);

  // 📊 Step Configuration
  const steps = [
    { id: 1, title: 'Personal Info', description: 'Basic information & Fayda ID' },
    { id: 2, title: 'Professional Details', description: 'Experience & Skills' },
    { id: 3, title: 'Document Upload', description: 'Portfolio & Certificates' },
    { id: 4, title: 'Bank Details', description: 'Payment Information' },
    { id: 5, title: 'Review & Submit', description: 'Final verification' }
  ];

  // 🎯 Initialize Registration
  useEffect(() => {
    initializeRegistration();
    requestPermissions();
  }, []);

  const initializeRegistration = async () => {
    try {
      // 🏗️ Load saved draft if exists
      const savedDraft = await AsyncStorage.getItem('expert_registration_draft');
      if (savedDraft) {
        setRegistrationData(JSON.parse(savedDraft));
      }

      // 🔍 Pre-fill user data if available
      const userData = await AuthService.getCurrentUser();
      if (userData) {
        setRegistrationData(prev => ({
          ...prev,
          personalInfo: {
            ...prev.personalInfo,
            email: userData.email,
            phoneNumber: userData.phoneNumber
          }
        }));
      }

    } catch (error) {
      console.error('Registration initialization failed:', error);
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need camera roll permissions to upload documents.');
      }
    }
  };

  // 🔄 Navigation Handlers
  const handleNextStep = () => {
    if (currentStep < steps.length) {
      validateCurrentStep().then(isValid => {
        if (isValid) {
          setCurrentStep(prev => {
            const newStep = prev + 1;
            progressAnimation.value = withSpring((newStep / steps.length) * 100);
            scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
            return newStep;
          });
        }
      });
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => {
        const newStep = prev - 1;
        progressAnimation.value = withSpring((newStep / steps.length) * 100);
        scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
        return newStep;
      });
    }
  };

  // ✅ Validation
  const validateCurrentStep = async () => {
    setErrors({});
    setValidationErrors([]);

    let isValid = true;
    const stepErrors = {};

    switch (currentStep) {
      case 1: // Personal Information
        isValid = await validatePersonalInfo();
        break;
      case 2: // Professional Details
        isValid = await validateProfessionalInfo();
        break;
      case 3: // Documents
        isValid = await validateDocuments();
        break;
      case 4: // Bank Details
        isValid = await validateBankInfo();
        break;
      case 5: // Review
        isValid = await validateCompleteRegistration();
        break;
    }

    if (!isValid) {
      Alert.alert('Validation Error', 'Please fix the errors before proceeding.');
    }

    return isValid;
  };

  const validatePersonalInfo = async () => {
    const errors = {};
    const { personalInfo } = registrationData;

    // 🆔 First Name
    if (!personalInfo.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    // 🆔 Last Name
    if (!personalInfo.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    // 📅 Date of Birth
    if (!personalInfo.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else {
      const age = calculateAge(personalInfo.dateOfBirth);
      if (age < 18) {
        errors.dateOfBirth = 'You must be at least 18 years old';
      }
    }

    // 📱 Phone Number
    if (!personalInfo.phoneNumber) {
      errors.phoneNumber = 'Phone number is required';
    } else if (!ValidationService.validatePhoneNumber(personalInfo.phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid Ethiopian phone number';
    }

    // 📧 Email
    if (!personalInfo.email) {
      errors.email = 'Email is required';
    } else if (!ValidationService.validateEmail(personalInfo.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 📝 Form Handlers
  const handleInputChange = (section, field, value) => {
    setRegistrationData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));

    // 🧹 Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // 📁 Document Upload
  const handleDocumentUpload = async (documentType) => {
    try {
      setLoading(true);

      let result;
      if (documentType === 'profilePhoto') {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true
        });
      } else {
        result = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          copyToCacheDirectory: true
        });
      }

      if (!result.canceled) {
        const file = result.assets[0];
        
        // 📤 Upload to cloud storage
        const uploadResult = await UploadService.uploadDocument(file, documentType);

        if (uploadResult.success) {
          // 💾 Update registration data
          setRegistrationData(prev => ({
            ...prev,
            documents: {
              ...prev.documents,
              [documentType]: uploadResult.data
            }
          }));

          // 📊 Update quality assessment
          await updateQualityAssessment();

          Alert.alert('Success', `${documentType.replace(/([A-Z])/g, ' $1')} uploaded successfully`);
        } else {
          throw new Error(uploadResult.error);
        }
      }
    } catch (error) {
      Alert.alert('Upload Failed', error.message || 'Failed to upload document');
      console.error('Document upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🎯 Update Quality Assessment
  const updateQualityAssessment = async () => {
    try {
      const assessment = await ExpertService.calculateQualityScore(registrationData);
      setQualityAssessment(assessment);
    } catch (error) {
      console.error('Quality assessment update failed:', error);
    }
  };

  // 🚀 Submit Registration
  const handleSubmitRegistration = async () => {
    try {
      setSubmitting(true);

      // ✅ Final validation
      const isValid = await validateCompleteRegistration();
      if (!isValid) {
        Alert.alert('Validation Failed', 'Please complete all required fields.');
        return;
      }

      // 🏢 Submit to backend
      const submissionData = {
        ...registrationData,
        metadata: {
          deviceId: Expo.Constants.deviceId,
          platform: Platform.OS,
          appVersion: Expo.Constants.manifest.version,
          submittedAt: new Date().toISOString()
        }
      };

      const result = await ExpertService.submitRegistration(submissionData);

      if (result.success) {
        // 🎉 Success
        await AsyncStorage.removeItem('expert_registration_draft');
        
        navigation.navigate('RegistrationSuccess', {
          registrationId: result.data.registrationId,
          estimatedTier: qualityAssessment.estimatedTier,
          nextSteps: result.data.nextSteps
        });
      } else {
        throw new Error(result.error || 'Registration failed');
      }

    } catch (error) {
      Alert.alert('Submission Failed', error.message || 'Failed to submit registration');
      console.error('Registration submission error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 💾 Save Draft
  const saveDraft = async () => {
    try {
      await AsyncStorage.setItem(
        'expert_registration_draft',
        JSON.stringify(registrationData)
      );
      Alert.alert('Draft Saved', 'Your registration progress has been saved.');
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  // 📊 Calculate Age
  const calculateAge = (dateString) => {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // 🎨 Render Steps
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <PersonalInfoStep 
          data={registrationData.personalInfo}
          onChange={(field, value) => handleInputChange('personalInfo', field, value)}
          errors={errors}
        />;
      case 2:
        return <ProfessionalInfoStep 
          data={registrationData.professionalInfo}
          skills={registrationData.skills}
          onChange={(field, value) => handleInputChange('professionalInfo', field, value)}
          onSkillsChange={(skills) => handleInputChange('skills', skills)}
          errors={errors}
        />;
      case 3:
        return <DocumentUploadStep 
          documents={registrationData.documents}
          onUpload={handleDocumentUpload}
          loading={loading}
          qualityAssessment={qualityAssessment}
        />;
      case 4:
        return <BankInfoStep 
          data={registrationData.bankInfo}
          onChange={(field, value) => handleInputChange('bankInfo', field, value)}
          errors={errors}
        />;
      case 5:
        return <ReviewStep 
          registrationData={registrationData}
          qualityAssessment={qualityAssessment}
          validationStatus={validationStatus}
        />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 🏢 Enterprise Header */}
      <EnterpriseHeader
        title="Expert Registration"
        subtitle="Join Mosa Forge's Elite Network"
        showBack={currentStep > 1}
        onBack={handlePreviousStep}
        rightAction={{
          icon: 'save',
          onPress: saveDraft,
          label: 'Save Draft'
        }}
      />

      {/* 📊 Progress Indicator */}
      <View style={styles.progressContainer}>
        <ProgressStepper
          steps={steps}
          currentStep={currentStep}
          onStepPress={(step) => {
            if (step <= currentStep) {
              setCurrentStep(step);
              progressAnimation.value = withSpring((step / steps.length) * 100);
            }
          }}
        />
        
        {/* 🎯 Quality Preview */}
        {currentStep >= 3 && (
          <Animated.View entering={FadeInUp.delay(200)}>
            <QualityScorePreview
              score={qualityAssessment.overallScore}
              tier={qualityAssessment.estimatedTier}
              progress={qualityAssessment.progress}
              strengths={qualityAssessment.strengths}
            />
          </Animated.View>
        )}
      </View>

      {/* 📜 Main Content */}
      <KeyboardAvoidingView 
        style={styles.contentContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 🎯 Step Content */}
          <Animated.View 
            entering={SlideInRight.duration(300)}
            style={styles.stepContent}
          >
            {renderStepContent()}
          </Animated.View>

          {/* 📊 Tier Preview (For later steps) */}
          {currentStep >= 2 && (
            <Animated.View 
              entering={FadeIn.delay(400)}
              style={styles.tierPreviewContainer}
            >
              <TierBadge
                tier={qualityAssessment.estimatedTier}
                score={qualityAssessment.overallScore}
                size="large"
                animated
              />
              <Text style={styles.tierDescription}>
                Based on your current information, you qualify for{' '}
                <Text style={styles.tierHighlight}>
                  {qualityAssessment.estimatedTier.toUpperCase()}
                </Text>{' '}
                tier
              </Text>
            </Animated.View>
          )}

          {/* 🚨 Validation Errors */}
          {validationErrors.length > 0 && (
            <View style={styles.validationErrorContainer}>
              <Text style={styles.validationErrorTitle}>Validation Issues:</Text>
              {validationErrors.map((error, index) => (
                <Text key={index} style={styles.validationError}>
                  • {error}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 🔄 Action Buttons */}
      <BlurView intensity={90} tint={theme.mode} style={styles.actionContainer}>
        <View style={styles.buttonRow}>
          {currentStep > 1 && (
            <SecondaryButton
              title="Back"
              onPress={handlePreviousStep}
              icon="arrow-back"
              style={styles.backButton}
              disabled={submitting}
            />
          )}

          {currentStep < steps.length ? (
            <PrimaryButton
              title="Continue"
              onPress={handleNextStep}
              icon="arrow-forward"
              style={styles.continueButton}
              loading={loading}
              disabled={loading || submitting}
            />
          ) : (
            <PrimaryButton
              title="Submit Registration"
              onPress={handleSubmitRegistration}
              icon="checkmark-circle"
              style={styles.submitButton}
              loading={submitting}
              disabled={submitting}
              gradient={Gradients.success}
            />
          )}
        </View>

        {/* 📝 Progress Indicator */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View 
              style={[
                styles.progressBarFill,
                useAnimatedStyle(() => ({
                  width: `${progressAnimation.value}%`
                }))
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            Step {currentStep} of {steps.length}
          </Text>
        </View>
      </BlurView>
    </SafeAreaView>
  );
};

// 👤 Personal Information Step Component
const PersonalInfoStep = ({ data, onChange, errors }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepDescription}>
        Provide your basic information for identity verification
      </Text>

      <View style={styles.formContainer}>
        {/* 👤 Name Fields */}
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <FormInput
              label="First Name"
              value={data.firstName}
              onChangeText={(text) => onChange('firstName', text)}
              placeholder="Enter first name"
              error={errors.firstName}
              required
              autoCapitalize="words"
            />
          </View>
          <View style={styles.halfInput}>
            <FormInput
              label="Last Name"
              value={data.lastName}
              onChangeText={(text) => onChange('lastName', text)}
              placeholder="Enter last name"
              error={errors.lastName}
              required
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* 📅 Date of Birth */}
        <FormInput
          label="Date of Birth"
          value={data.dateOfBirth}
          onChangeText={(text) => onChange('dateOfBirth', text)}
          placeholder="YYYY-MM-DD"
          error={errors.dateOfBirth}
          required
          keyboardType="numeric"
        />

        {/* 📱 Contact Information */}
        <FormInput
          label="Phone Number"
          value={data.phoneNumber}
          onChangeText={(text) => onChange('phoneNumber', text)}
          placeholder="+251 9XX XXX XXX"
          error={errors.phoneNumber}
          required
          keyboardType="phone-pad"
          prefix="+251"
        />

        <FormInput
          label="Email Address"
          value={data.email}
          onChangeText={(text) => onChange('email', text)}
          placeholder="Enter your email"
          error={errors.email}
          required
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* 🚻 Gender Selection */}
        <View style={styles.genderContainer}>
          <Text style={styles.inputLabel}>Gender</Text>
          <View style={styles.genderOptions}>
            {['Male', 'Female', 'Other'].map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.genderOption,
                  data.gender === gender && styles.genderOptionSelected
                ]}
                onPress={() => onChange('gender', gender)}
              >
                <Text style={[
                  styles.genderOptionText,
                  data.gender === gender && styles.genderOptionTextSelected
                ]}>
                  {gender}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 🏠 Address */}
        <FormInput
          label="Address"
          value={data.address}
          onChangeText={(text) => onChange('address', text)}
          placeholder="Enter your address"
          multiline
          numberOfLines={3}
        />

        {/* ℹ️ Information Notice */}
        <View style={styles.infoNotice}>
          <Text style={styles.infoNoticeText}>
            💡 Your information is secured with bank-level encryption and 
            will only be used for verification purposes.
          </Text>
        </View>
      </View>
    </View>
  );
};

// 💼 Professional Information Step Component
const ProfessionalInfoStep = ({ data, skills, onChange, onSkillsChange, errors }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [availableSkills] = useState([
    'Forex Trading', 'Graphic Design', 'Web Development', 'Digital Marketing',
    'Content Writing', 'Video Editing', 'Social Media Management', 'Data Analysis',
    'Mobile App Development', 'E-commerce Management', 'Woodworking', 'Construction',
    'Painting Services', 'Plumbing', 'Electrical Services', 'Personal Training',
    'Sports Coaching', 'Nutrition Counseling', 'Hair Styling', 'Makeup Artistry'
  ]);

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Professional Details</Text>
      <Text style={styles.stepDescription}>
        Tell us about your expertise and experience
      </Text>

      <View style={styles.formContainer}>
        {/* 📊 Experience */}
        <FormInput
          label="Years of Experience"
          value={data.yearsOfExperience.toString()}
          onChangeText={(text) => onChange('yearsOfExperience', parseInt(text) || 0)}
          placeholder="Enter years of experience"
          keyboardType="numeric"
          suffix="years"
        />

        <FormInput
          label="Previous Clients"
          value={data.previousClients.toString()}
          onChangeText={(text) => onChange('previousClients', parseInt(text) || 0)}
          placeholder="Number of clients served"
          keyboardType="numeric"
        />

        {/* 🎯 Skills Selection */}
        <View style={styles.skillsContainer}>
          <Text style={styles.inputLabel}>Select Your Skills *</Text>
          <Text style={styles.inputSubtitle}>
            Choose at least 1 skill you're certified to teach
          </Text>
          
          <View style={styles.skillsGrid}>
            {availableSkills.map((skill) => {
              const isSelected = skills.includes(skill);
              return (
                <TouchableOpacity
                  key={skill}
                  style={[
                    styles.skillChip,
                    isSelected && styles.skillChipSelected
                  ]}
                  onPress={() => {
                    const newSkills = isSelected
                      ? skills.filter(s => s !== skill)
                      : [...skills, skill];
                    onSkillsChange(newSkills);
                  }}
                >
                  <Text style={[
                    styles.skillChipText,
                    isSelected && styles.skillChipTextSelected
                  ]}>
                    {skill}
                  </Text>
                  {isSelected && (
                    <View style={styles.skillCheckmark}>
                      <Text style={styles.skillCheckmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          
          {skills.length > 0 && (
            <Text style={styles.selectedSkillsCount}>
              {skills.length} skill{skills.length !== 1 ? 's' : ''} selected
            </Text>
          )}
        </View>

        {/* 💰 Hourly Rate */}
        <FormInput
          label="Expected Hourly Rate"
          value={data.hourlyRate.toString()}
          onChangeText={(text) => onChange('hourlyRate', parseInt(text) || 0)}
          placeholder="Enter hourly rate in ETB"
          keyboardType="numeric"
          prefix="ETB"
        />

        {/* 📝 Professional Bio */}
        <View style={styles.bioContainer}>
          <Text style={styles.inputLabel}>Professional Bio *</Text>
          <Text style={styles.inputSubtitle}>
            Describe your expertise, achievements, and teaching approach
          </Text>
          <TextInput
            style={[
              styles.bioInput,
              errors.bio && styles.inputError
            ]}
            value={data.bio}
            onChangeText={(text) => onChange('bio', text)}
            placeholder="Tell us about your professional background..."
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
          <Text style={styles.bioCharacterCount}>
            {data.bio.length}/500 characters
          </Text>
        </View>

        {/* 🏆 Specialties */}
        <View style={styles.specialtiesContainer}>
          <Text style={styles.inputLabel}>Specialties</Text>
          <Text style={styles.inputSubtitle}>
            List your areas of specialization (comma separated)
          </Text>
          <TextInput
            style={styles.specialtiesInput}
            value={data.specialties.join(', ')}
            onChangeText={(text) => onChange('specialties', text.split(',').map(s => s.trim()))}
            placeholder="e.g., Advanced Forex Strategies, UI/UX Design, SEO Optimization"
          />
        </View>
      </View>
    </View>
  );
};

// 📁 Document Upload Step Component
const DocumentUploadStep = ({ documents, onUpload, loading, qualityAssessment }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const documentRequirements = {
    faydaId: {
      title: 'Fayda ID',
      description: 'Government issued ID card',
      required: true,
      acceptedFormats: ['jpg', 'png', 'pdf'],
      maxSize: '5MB'
    },
    portfolio: {
      title: 'Portfolio',
      description: 'Showcase your previous work',
      required: true,
      acceptedFormats: ['pdf', 'jpg', 'png', 'doc'],
      maxSize: '20MB'
    },
    certificates: {
      title: 'Certificates',
      description: 'Professional certifications',
      required: true,
      acceptedFormats: ['pdf', 'jpg', 'png'],
      maxSize: '10MB each'
    },
    bankStatement: {
      title: 'Bank Statement',
      description: 'Recent bank statement',
      required: true,
      acceptedFormats: ['pdf', 'jpg', 'png'],
      maxSize: '10MB'
    },
    profilePhoto: {
      title: 'Profile Photo',
      description: 'Professional headshot',
      required: true,
      acceptedFormats: ['jpg', 'png'],
      maxSize: '5MB'
    }
  };

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Document Upload</Text>
      <Text style={styles.stepDescription}>
        Upload required documents for verification
      </Text>

      {/* 📊 Quality Progress */}
      <View style={styles.qualityProgressContainer}>
        <View style={styles.qualityProgressHeader}>
          <Text style={styles.qualityProgressTitle}>Verification Progress</Text>
          <Text style={styles.qualityProgressPercent}>
            {Math.round(qualityAssessment.progress * 100)}%
          </Text>
        </View>
        <View style={styles.qualityProgressBar}>
          <View 
            style={[
              styles.qualityProgressFill,
              { width: `${qualityAssessment.progress * 100}%` }
            ]} 
          />
        </View>
        <Text style={styles.qualityProgressText}>
          {qualityAssessment.strengths.length} strength{qualityAssessment.strengths.length !== 1 ? 's' : ''} identified
        </Text>
      </View>

      {/* 📁 Document Upload Areas */}
      <ScrollView style={styles.documentsScroll}>
        {Object.entries(documentRequirements).map(([key, requirement]) => (
          <View key={key} style={styles.documentCard}>
            <View style={styles.documentHeader}>
              <View style={styles.documentTitleContainer}>
                <Text style={styles.documentTitle}>{requirement.title}</Text>
                {requirement.required && (
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredBadgeText}>Required</Text>
                  </View>
                )}
              </View>
              {documents[key] ? (
                <View style={styles.documentUploaded}>
                  <Text style={styles.documentUploadedText}>✓ Uploaded</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => onUpload(key)}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Text style={styles.uploadButtonText}>Upload</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.documentDescription}>
              {requirement.description}
            </Text>

            <View style={styles.documentDetails}>
              <Text style={styles.documentDetail}>
                📁 Formats: {requirement.acceptedFormats.join(', ')}
              </Text>
              <Text style={styles.documentDetail}>
                📏 Max Size: {requirement.maxSize}
              </Text>
            </View>

            {documents[key] && (
              <View style={styles.documentPreview}>
                <Text style={styles.documentPreviewText}>
                  📎 {documents[key].name || 'Document uploaded'}
                </Text>
                <TouchableOpacity
                  style={styles.documentRemove}
                  onPress={() => onUpload(key)} // Re-upload
                >
                  <Text style={styles.documentRemoveText}>Change</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* ℹ️ Upload Guidelines */}
      <View style={styles.uploadGuidelines}>
        <Text style={styles.guidelinesTitle}>📋 Upload Guidelines</Text>
        <Text style={styles.guideline}>• Ensure documents are clear and legible</Text>
        <Text style={styles.guideline}>• Files must be in original format (no screenshots)</Text>
        <Text style={styles.guideline}>• Certificates should show issue date and authority</Text>
        <Text style={styles.guideline}>• Bank statement should be recent (within 3 months)</Text>
        <Text style={styles.guideline}>• Profile photo should be professional and recent</Text>
      </View>
    </View>
  );
};

// 🏦 Bank Information Step Component
const BankInfoStep = ({ data, onChange, errors }) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [ethiopianBanks] = useState([
    'Commercial Bank of Ethiopia',
    'Awash Bank',
    'Dashen Bank',
    'Bank of Abyssinia',
    'Nib International Bank',
    'Hibret Bank',
    'Oromia International Bank',
    'Cooperative Bank of Oromia',
    'Enat Bank',
    'Zemen Bank'
  ]);

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Bank Details</Text>
      <Text style={styles.stepDescription}>
        Provide your bank information for payments
      </Text>

      <View style={styles.formContainer}>
        {/* 🏦 Bank Selection */}
        <View style={styles.bankSelector}>
          <Text style={styles.inputLabel}>Bank Name *</Text>
          <View style={styles.bankOptions}>
            {ethiopianBanks.map((bank) => (
              <TouchableOpacity
                key={bank}
                style={[
                  styles.bankOption,
                  data.bankName === bank && styles.bankOptionSelected
                ]}
                onPress={() => onChange('bankName', bank)}
              >
                <Text style={[
                  styles.bankOptionText,
                  data.bankName === bank && styles.bankOptionTextSelected
                ]}>
                  {bank}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 🏢 Account Details */}
        <FormInput
          label="Account Number *"
          value={data.accountNumber}
          onChangeText={(text) => onChange('accountNumber', text)}
          placeholder="Enter account number"
          error={errors.accountNumber}
          required
          keyboardType="numeric"
          maxLength={16}
        />

        <FormInput
          label="Account Holder Name *"
          value={data.accountHolderName}
          onChangeText={(text) => onChange('accountHolderName', text)}
          placeholder="Name as it appears on account"
          error={errors.accountHolderName}
          required
          autoCapitalize="words"
        />

        <FormInput
          label="Branch Name"
          value={data.branchName}
          onChangeText={(text) => onChange('branchName', text)}
          placeholder="Enter branch name"
        />

        {/* 💳 Account Verification */}
        <View style={styles.verificationContainer}>
          <Text style={styles.verificationTitle}>Account Verification</Text>
          <Text style={styles.verificationText}>
            Your bank account will be verified through our secure payment gateway.
            You'll receive a small test deposit (1-5 ETB) to confirm account ownership.
          </Text>
        </View>

        {/* 🔒 Security Notice */}
        <View style={styles.securityNotice}>
          <Text style={styles.securityNoticeIcon}>🔒</Text>
          <Text style={styles.securityNoticeText}>
            Your bank information is encrypted and stored securely. 
            We never share your financial details with third parties.
          </Text>
        </View>

        {/* 📋 Payment Schedule */}
        <View style={styles.paymentSchedule}>
          <Text style={styles.paymentScheduleTitle}>Payment Schedule</Text>
          <View style={styles.paymentMilestone}>
            <View style={styles.milestoneDot} />
            <Text style={styles.milestoneText}>
              <Text style={styles.milestoneAmount}>333 ETB</Text> - Course Start
            </Text>
          </View>
          <View style={styles.paymentMilestone}>
            <View style={styles.milestoneDot} />
            <Text style={styles.milestoneText}>
              <Text style={styles.milestoneAmount}>333 ETB</Text> - 75% Completion
            </Text>
          </View>
          <View style={styles.paymentMilestone}>
            <View style={styles.milestoneDot} />
            <Text style={styles.milestoneText}>
              <Text style={styles.milestoneAmount}>333 ETB</Text> - Certification
            </Text>
          </View>   