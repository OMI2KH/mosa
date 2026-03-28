// components/auth/auth-form.jsx

/**
 * 🎯 ENTERPRISE AUTH FORM COMPONENT
 * Production-ready authentication form with Fayda ID integration
 * Features: Government verification, OTP management, duplicate prevention
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/auth-context';
import { useFaydaValidation } from '../../hooks/use-fayda-validation';
import { Logger } from '../../utils/logger';
import { Validators } from '../../utils/validators';
import { Formatters } from '../../utils/formatters';

// Animation constants
const ANIMATION_DURATION = 300;
const SHAKE_ANIMATION_DURATION = 500;

const AuthForm = ({ 
  mode = 'login', // 'login' | 'register' | 'forgot-password' | 'otp-verification'
  onSuccess,
  onModeChange,
  initialFaydaId = '',
  showBackButton = true
}) => {
  // 🔧 Hooks & Refs
  const router = useRouter();
  const { 
    login, 
    register, 
    verifyOtp, 
    resendOtp, 
    resetPassword,
    isLoading,
    error: authError 
  } = useAuth();
  
  const { 
    validateFaydaId,
    checkDuplicateId,
    isDuplicate,
    validationError,
    isValidationLoading 
  } = useFaydaValidation();

  // 🎯 State Management
  const [formData, setFormData] = useState({
    faydaId: initialFaydaId,
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    otpCode: '',
    fullName: '',
    dateOfBirth: ''
  });

  const [formErrors, setFormErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [submissionAttempts, setSubmissionAttempts] = useState(0);

  // 🎪 Animation Refs
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(50)).current;

  // 📱 Refs for input focus management
  const faydaIdRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const otpRef = useRef(null);
  const fullNameRef = useRef(null);

  // 🔧 Logger instance
  const logger = new Logger('AuthForm');

  // 🎯 Animation Effects
  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimation, {
        toValue: 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // 🔄 OTP Resend Cooldown Timer
  useEffect(() => {
    let interval;
    if (otpResendCooldown > 0) {
      interval = setInterval(() => {
        setOtpResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpResendCooldown]);

  // 🎯 Input Handlers
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field-specific errors when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    // Real-time Fayda ID validation
    if (field === 'faydaId' && value.length === 10) {
      handleFaydaIdValidation(value);
    }
  }, [formErrors]);

  const handleFaydaIdValidation = useCallback(async (faydaId) => {
    try {
      const isValid = await validateFaydaId(faydaId);
      if (!isValid) {
        setFormErrors(prev => ({
          ...prev,
          faydaId: 'Invalid Fayda ID format'
        }));
        triggerShakeAnimation();
      }
      
      if (mode === 'register') {
        const isDuplicate = await checkDuplicateId(faydaId);
        if (isDuplicate) {
          setFormErrors(prev => ({
            ...prev,
            faydaId: 'This Fayda ID is already registered'
          }));
          triggerShakeAnimation();
        }
      }
    } catch (error) {
      logger.error('Fayda ID validation failed', error);
    }
  }, [mode, validateFaydaId, checkDuplicateId]);

  // 🎪 Animation Methods
  const triggerShakeAnimation = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: SHAKE_ANIMATION_DURATION / 3,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: SHAKE_ANIMATION_DURATION / 3,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: SHAKE_ANIMATION_DURATION / 3,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnimation]);

  // 🛡️ Validation Methods
  const validateForm = useCallback(() => {
    const errors = {};
    let isValid = true;

    switch (mode) {
      case 'login':
        if (!formData.faydaId) {
          errors.faydaId = 'Fayda ID is required';
          isValid = false;
        } else if (!Validators.isValidFaydaId(formData.faydaId)) {
          errors.faydaId = 'Invalid Fayda ID format';
          isValid = false;
        }

        if (!formData.password) {
          errors.password = 'Password is required';
          isValid = false;
        } else if (formData.password.length < 8) {
          errors.password = 'Password must be at least 8 characters';
          isValid = false;
        }
        break;

      case 'register':
        if (!formData.faydaId) {
          errors.faydaId = 'Fayda ID is required';
          isValid = false;
        } else if (!Validators.isValidFaydaId(formData.faydaId)) {
          errors.faydaId = 'Invalid Fayda ID format';
          isValid = false;
        }

        if (!formData.phoneNumber) {
          errors.phoneNumber = 'Phone number is required';
          isValid = false;
        } else if (!Validators.isValidEthiopianPhone(formData.phoneNumber)) {
          errors.phoneNumber = 'Invalid Ethiopian phone number';
          isValid = false;
        }

        if (!formData.email) {
          errors.email = 'Email is required';
          isValid = false;
        } else if (!Validators.isValidEmail(formData.email)) {
          errors.email = 'Invalid email format';
          isValid = false;
        }

        if (!formData.fullName) {
          errors.fullName = 'Full name is required';
          isValid = false;
        } else if (formData.fullName.length < 2) {
          errors.fullName = 'Full name must be at least 2 characters';
          isValid = false;
        }

        if (!formData.password) {
          errors.password = 'Password is required';
          isValid = false;
        } else if (!Validators.isStrongPassword(formData.password)) {
          errors.password = 'Password must contain uppercase, lowercase, number and special character';
          isValid = false;
        }

        if (!formData.confirmPassword) {
          errors.confirmPassword = 'Please confirm your password';
          isValid = false;
        } else if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = 'Passwords do not match';
          isValid = false;
        }
        break;

      case 'forgot-password':
        if (!formData.faydaId) {
          errors.faydaId = 'Fayda ID is required';
          isValid = false;
        } else if (!Validators.isValidFaydaId(formData.faydaId)) {
          errors.faydaId = 'Invalid Fayda ID format';
          isValid = false;
        }
        break;

      case 'otp-verification':
        if (!formData.otpCode) {
          errors.otpCode = 'OTP code is required';
          isValid = false;
        } else if (!Validators.isValidOtp(formData.otpCode)) {
          errors.otpCode = 'OTP must be 6 digits';
          isValid = false;
        }
        break;
    }

    setFormErrors(errors);
    
    if (!isValid) {
      triggerShakeAnimation();
      logger.warn('Form validation failed', { errors, mode });
    }

    return isValid;
  }, [mode, formData, triggerShakeAnimation]);

  // 🚀 Form Submission Handlers
  const handleSubmit = useCallback(async () => {
    // Rate limiting check
    if (submissionAttempts >= 5) {
      Alert.alert(
        'Too Many Attempts',
        'Please wait 15 minutes before trying again',
        [{ text: 'OK' }]
      );
      return;
    }

    setSubmissionAttempts(prev => prev + 1);

    if (!validateForm()) {
      return;
    }

    try {
      let result;

      switch (mode) {
        case 'login':
          result = await login({
            faydaId: formData.faydaId,
            password: formData.password,
            deviceInfo: {
              platform: Platform.OS,
              userAgent: 'MosaForge-Mobile-App'
            }
          });
          break;

        case 'register':
          result = await register({
            faydaId: formData.faydaId,
            phoneNumber: formData.phoneNumber,
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
            dateOfBirth: formData.dateOfBirth,
            deviceInfo: {
              platform: Platform.OS,
              userAgent: 'MosaForge-Mobile-App'
            }
          });
          
          if (result.success) {
            setCurrentStep(2); // Move to OTP verification
          }
          break;

        case 'forgot-password':
          result = await resetPassword(formData.faydaId);
          if (result.success) {
            setCurrentStep(2); // Move to OTP verification
          }
          break;

        case 'otp-verification':
          result = await verifyOtp({
            faydaId: formData.faydaId,
            otpCode: formData.otpCode,
            verificationType: mode === 'register' ? 'registration' : 'password_reset'
          });
          break;
      }

      if (result.success) {
        logger.info(`${mode} successful`, { faydaId: formData.faydaId });
        await onSuccess?.(result);
      } else {
        logger.warn(`${mode} failed`, { error: result.error });
        triggerShakeAnimation();
      }

    } catch (error) {
      logger.error('Form submission error', error);
      Alert.alert(
        'Authentication Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
      triggerShakeAnimation();
    }
  }, [mode, formData, validateForm, submissionAttempts, triggerShakeAnimation]);

  const handleResendOtp = useCallback(async () => {
    if (otpResendCooldown > 0) return;

    try {
      const result = await resendOtp(formData.faydaId);
      if (result.success) {
        setOtpResendCooldown(60); // 60 seconds cooldown
        Alert.alert('Success', 'OTP has been resent to your registered phone number');
      } else {
        Alert.alert('Error', 'Failed to resend OTP. Please try again.');
      }
    } catch (error) {
      logger.error('OTP resend failed', error);
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    }
  }, [formData.faydaId, otpResendCooldown, resendOtp]);

  // 🎨 Render Methods
  const renderLoginForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Login with Fayda ID</Text>
      
      <Animated.View style={[styles.inputContainer, { transform: [{ translateX: shakeAnimation }] }]}>
        <TextInput
          ref={faydaIdRef}
          style={[styles.input, formErrors.faydaId && styles.inputError]}
          placeholder="Enter your Fayda ID"
          value={Formatters.formatFaydaId(formData.faydaId)}
          onChangeText={(value) => handleInputChange('faydaId', Formatters.normalizeFaydaId(value))}
          keyboardType="number-pad"
          maxLength={10}
          autoCapitalize="none"
          autoComplete="off"
          editable={!isLoading}
        />
        {formErrors.faydaId && <Text style={styles.errorText}>{formErrors.faydaId}</Text>}
      </Animated.View>

      <Animated.View style={[styles.inputContainer, { transform: [{ translateX: shakeAnimation }] }]}>
        <View style={styles.passwordContainer}>
          <TextInput
            ref={passwordRef}
            style={[styles.input, styles.passwordInput, formErrors.password && styles.inputError]}
            placeholder="Enter your password"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password"
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.visibilityToggle}
            onPress={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            <Text style={styles.visibilityToggleText}>
              {showPassword ? '🙈' : '👁️'}
            </Text>
          </TouchableOpacity>
        </View>
        {formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}
      </Animated.View>

      <TouchableOpacity
        style={styles.forgotPasswordLink}
        onPress={() => onModeChange?.('forgot-password')}
        disabled={isLoading}
      >
        <Text style={styles.linkText}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRegistrationForm = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Create Account</Text>
      
      {[
        { ref: faydaIdRef, field: 'faydaId', placeholder: 'Fayda ID', keyboard: 'number-pad', max: 10 },
        { ref: fullNameRef, field: 'fullName', placeholder: 'Full Name', keyboard: 'default' },
        { ref: phoneRef, field: 'phoneNumber', placeholder: 'Phone Number', keyboard: 'phone-pad' },
        { ref: emailRef, field: 'email', placeholder: 'Email Address', keyboard: 'email-address' },
      ].map(({ ref, field, placeholder, keyboard, max }) => (
        <Animated.View key={field} style={[styles.inputContainer, { transform: [{ translateX: shakeAnimation }] }]}>
          <TextInput
            ref={ref}
            style={[styles.input, formErrors[field] && styles.inputError]}
            placeholder={placeholder}
            value={formData[field]}
            onChangeText={(value) => handleInputChange(field, value)}
            keyboardType={keyboard}
            maxLength={max}
            autoCapitalize={field === 'email' ? 'none' : 'words'}
            autoComplete={field === 'email' ? 'email' : 'off'}
            editable={!isLoading}
          />
          {formErrors[field] && <Text style={styles.errorText}>{formErrors[field]}</Text>}
        </Animated.View>
      ))}

      <Animated.View style={[styles.inputContainer, { transform: [{ translateX: shakeAnimation }] }]}>
        <View style={styles.passwordContainer}>
          <TextInput
            ref={passwordRef}
            style={[styles.input, styles.passwordInput, formErrors.password && styles.inputError]}
            placeholder="Create Password"
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="password-new"
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.visibilityToggle}
            onPress={() => setShowPassword(!showPassword)}
            disabled={isLoading}
          >
            <Text style={styles.visibilityToggleText}>
              {showPassword ? '🙈' : '👁️'}
            </Text>
          </TouchableOpacity>
        </View>
        {formErrors.password && <Text style={styles.errorText}>{formErrors.password}</Text>}
      </Animated.View>

      <Animated.View style={[styles.inputContainer, { transform: [{ translateX: shakeAnimation }] }]}>
        <View style={styles.passwordContainer}>
          <TextInput
            ref={confirmPasswordRef}
            style={[styles.input, styles.passwordInput, formErrors.confirmPassword && styles.inputError]}
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoComplete="password-new"
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.visibilityToggle}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            disabled={isLoading}
          >
            <Text style={styles.visibilityToggleText}>
              {showConfirmPassword ? '🙈' : '👁️'}
            </Text>
          </TouchableOpacity>
        </View>
        {formErrors.confirmPassword && <Text style={styles.errorText}>{formErrors.confirmPassword}</Text>}
      </Animated.View>
    </View>
  );

  const renderOtpVerification = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Verify Your Account</Text>
      <Text style={styles.otpDescription}>
        Enter the 6-digit OTP sent to your registered phone number
      </Text>
      
      <Animated.View style={[styles.inputContainer, { transform: [{ translateX: shakeAnimation }] }]}>
        <TextInput
          ref={otpRef}
          style={[styles.input, styles.otpInput, formErrors.otpCode && styles.inputError]}
          placeholder="000000"
          value={formData.otpCode}
          onChangeText={(value) => handleInputChange('otpCode', value.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
          editable={!isLoading}
        />
        {formErrors.otpCode && <Text style={styles.errorText}>{formErrors.otpCode}</Text>}
      </Animated.View>

      <TouchableOpacity
        style={[styles.resendButton, otpResendCooldown > 0 && styles.resendButtonDisabled]}
        onPress={handleResendOtp}
        disabled={otpResendCooldown > 0 || isLoading}
      >
        <Text style={styles.resendButtonText}>
          {otpResendCooldown > 0 
            ? `Resend OTP in ${otpResendCooldown}s` 
            : 'Resend OTP'
          }
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderForgotPassword = () => (
    <View style={styles.formSection}>
      <Text style={styles.sectionTitle}>Reset Your Password</Text>
      <Text style={styles.otpDescription}>
        Enter your Fayda ID to receive password reset instructions
      </Text>
      
      <Animated.View style={[styles.inputContainer, { transform: [{ translateX: shakeAnimation }] }]}>
        <TextInput
          ref={faydaIdRef}
          style={[styles.input, formErrors.faydaId && styles.inputError]}
          placeholder="Enter your Fayda ID"
          value={Formatters.formatFaydaId(formData.faydaId)}
          onChangeText={(value) => handleInputChange('faydaId', Formatters.normalizeFaydaId(value))}
          keyboardType="number-pad"
          maxLength={10}
          autoCapitalize="none"
          editable={!isLoading}
        />
        {formErrors.faydaId && <Text style={styles.errorText}>{formErrors.faydaId}</Text>}
      </Animated.View>
    </View>
  );

  // 🎯 Main Render
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View 
          style={[
            styles.animatedContainer,
            {
              opacity: fadeAnimation,
              transform: [{ translateY: slideAnimation }]
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            {showBackButton && (
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => router.back()}
                disabled={isLoading}
              >
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.title}>
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Join Mosa Forge'}
              {mode === 'otp-verification' && 'Verify Account'}
              {mode === 'forgot-password' && 'Reset Password'}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'login' && 'Sign in to continue your journey'}
              {mode === 'register' && 'Start your skills transformation today'}
              {mode === 'otp-verification' && 'Secure your account with OTP'}
              {mode === 'forgot-password' && 'We\'ll help you regain access'}
            </Text>
          </View>

          {/* Form Content */}
          <View style={styles.formContent}>
            {mode === 'login' && renderLoginForm()}
            {mode === 'register' && renderRegistrationForm()}
            {mode === 'otp-verification' && renderOtpVerification()}
            {mode === 'forgot-password' && renderForgotPassword()}

            {/* Error Display */}
            {authError && (
              <View style={styles.authErrorContainer}>
                <Text style={styles.authErrorText}>{authError}</Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (isLoading || isValidationLoading) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={isLoading || isValidationLoading}
            >
              {isLoading || isValidationLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && currentStep === 1 ? 'Continue' : 'Create Account'}
                  {mode === 'otp-verification' && 'Verify & Continue'}
                  {mode === 'forgot-password' && currentStep === 1 ? 'Send Reset Code' : 'Reset Password'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Mode Switch Links */}
            <View style={styles.modeSwitchContainer}>
              {mode === 'login' ? (
                <TouchableOpacity
                  style={styles.modeSwitchButton}
                  onPress={() => onModeChange?.('register')}
                  disabled={isLoading}
                >
                  <Text style={styles.modeSwitchText}>
                    Don't have an account? <Text style={styles.modeSwitchHighlight}>Sign Up</Text>
                  </Text>
                </TouchableOpacity>
              ) : mode === 'register' ? (
                <TouchableOpacity
                  style={styles.modeSwitchButton}
                  onPress={() => onModeChange?.('login')}
                  disabled={isLoading}
                >
                  <Text style={styles.modeSwitchText}>
                    Already have an account? <Text style={styles.modeSwitchHighlight}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              ) : mode === 'forgot-password' && (
                <TouchableOpacity
                  style={styles.modeSwitchButton}
                  onPress={() => onModeChange?.('login')}
                  disabled={isLoading}
                >
                  <Text style={styles.modeSwitchText}>
                    Remember your password? <Text style={styles.modeSwitchHighlight}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Security Notice */}
            <View style={styles.securityNotice}>
              <Text style={styles.securityNoticeText}>
                🔒 Your data is secured with bank-level encryption and government-grade Fayda ID verification
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// 🎨 Enterprise-Grade Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 24,
    color: '#6366F1',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  formContent: {
    flex: 1,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  visibilityToggle: {
    position: 'absolute',
    right: 16,
    top: 14,
    padding: 4,
  },
  visibilityToggleText: {
    fontSize: 18,
  },
  otpInput: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  authErrorContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    marginBottom: 16,
  },
  authErrorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  linkText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
  },
  otpDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  resendButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modeSwitchContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modeSwitchButton: {
    padding: 8,
  },
  modeSwitchText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  modeSwitchHighlight: {
    color: '#6366F1',
    fontWeight: '600',
  },
  securityNotice: {
    backgroundColor: '#F0F9FF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  securityNoticeText: {
    color: '#0369A1',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default React.memo(AuthForm);