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
  SafeAreaView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useStore } from '../store/useStore';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { setUser } = useStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [religion, setReligion] = useState('Islam');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert(t('error'), t('fill_required_fields'));
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name,
        email,
        password,
        referralCode,
        religion,
      });

      // Save tokens and user info
      await AsyncStorage.setItem('token', res.data.token);
      await AsyncStorage.setItem('refreshToken', res.data.refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(res.data.user));

      setUser(res.data.user);
      
      // Show welcome message with Mosa introduction
      Alert.alert(
        '🎉 Welcome to Mosa!',
        'Your wealth-building journey begins now. Get ready to learn practical skills, earn XP, and unlock new opportunities in the Hayat Grid ecosystem!',
        [
          { 
            text: 'Start My Journey', 
            onPress: () => navigation.navigate('Survey') 
          }
        ]
      );

    } catch (err) {
      Alert.alert(
        t('error'),
        err.response?.data?.error || t('register_failed')
      );
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
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
      {[1, 2, 3].map(step => (
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
          {step < 3 && (
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
            <Text style={styles.stepTitle}>Personal Information</Text>
            <Text style={styles.stepDescription}>
              Let's start your journey to financial freedom
            </Text>

            <View style={styles.inputGroup}>
              <Ionicons name="person" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Create Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Additional Details</Text>
            <Text style={styles.stepDescription}>
              Help us personalize your Mosa experience
            </Text>

            <View style={styles.inputGroup}>
              <Ionicons name="gift" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Referral Code (Optional)"
                value={referralCode}
                onChangeText={setReferralCode}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="heart" size={20} color="#6B7280" style={styles.inputIcon} />
              <View style={styles.selectContainer}>
                <Text style={styles.selectLabel}>Religion</Text>
                <View style={styles.selectButtons}>
                  {['Islam', 'Orthodox', 'Other'].map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.selectButton,
                        religion === option && styles.selectButtonActive
                      ]}
                      onPress={() => setReligion(option)}
                    >
                      <Text style={[
                        styles.selectButtonText,
                        religion === option && styles.selectButtonTextActive
                      ]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.benefitsCard}>
              <Text style={styles.benefitsTitle}>What you'll get:</Text>
              <View style={styles.benefitItem}>
                <Ionicons name="flash" size={16} color="#D4A017" />
                <Text style={styles.benefitText}>Access to Mosa wealth-building lessons</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text style={styles.benefitText}>Earn XP and unlock achievements</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="storefront" size={16} color="#10B981" />
                <Text style={styles.benefitText}>Progress to Yachi marketplace</Text>
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Ready to Begin!</Text>
            <Text style={styles.stepDescription}>
              Review your information and start your journey
            </Text>

            <View style={styles.reviewCard}>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Name</Text>
                <Text style={styles.reviewValue}>{name}</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Email</Text>
                <Text style={styles.reviewValue}>{email}</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Religion</Text>
                <Text style={styles.reviewValue}>{religion}</Text>
              </View>
              {referralCode && (
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>Referral Code</Text>
                  <Text style={styles.reviewValue}>{referralCode}</Text>
                </View>
              )}
            </View>

            <View style={styles.welcomeMessage}>
              <Ionicons name="rocket" size={32} color="#D4A017" />
              <Text style={styles.welcomeTitle}>Welcome to Mosa!</Text>
              <Text style={styles.welcomeText}>
                Your journey to financial empowerment starts here. Learn practical skills, 
                build wealth, and join a community of like-minded individuals.
              </Text>
            </View>
          </View>
        );

      default:
        return null;
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
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Ionicons name="arrow-back" size={24} color="#2D5016" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Ionicons name="flash" size={32} color="#D4A017" />
              <Text style={styles.logoText}>MOSA</Text>
            </View>
            <View style={styles.placeholder} />
          </View>

          {/* Progress Steps */}
          {renderStepIndicator()}

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons */}
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
                  (!name || !email || !password) && styles.primaryButtonDisabled
                ]}
                onPress={nextStep}
                disabled={!name || !email || !password}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[
                  styles.completeButton,
                  loading && styles.completeButtonDisabled
                ]}
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <Text style={styles.completeButtonText}>Creating Account...</Text>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                    <Text style={styles.completeButtonText}>Start My Journey</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  backButton: {
    padding: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D5016',
    marginLeft: 8,
  },
  placeholder: {
    width: 40,
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
    width: 60,
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
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 16,
    zIndex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    paddingLeft: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#2D5016',
  },
  selectContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  selectLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  selectButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  selectButtonActive: {
    backgroundColor: '#2D5016',
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  selectButtonTextActive: {
    color: '#FFFFFF',
  },
  benefitsCard: {
    backgroundColor: '#F0F7F4',
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 12,
    flex: 1,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  reviewLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  reviewValue: {
    fontSize: 14,
    color: '#2D5016',
    fontWeight: '600',
  },
  welcomeMessage: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginTop: 12,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: currentStep === 1 ? 'flex-end' : 'space-between',
    marginBottom: 24,
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#D4A017',
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLink: {
    fontSize: 14,
    color: '#2D5016',
    fontWeight: '600',
  },
});
