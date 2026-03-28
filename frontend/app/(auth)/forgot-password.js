/**
 * 🎯 MOSA FORGE: Enterprise Forgot Password System
 * 
 * @module ForgotPassword
 * @description Secure password recovery with OTP verification and Fayda ID integration
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Fayda ID government verification
 * - Multi-channel OTP delivery (SMS/Email)
 * - Rate limiting and brute force protection
 * - Secure token management with expiration
 * - Audit logging and security monitoring
 * - Duplicate account detection
 */

import React, { useState, useRef, useEffect } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

// 🏗️ Enterprise Services
import AuthService from '../../services/auth-service';
import SecurityService from '../../services/security-service';
import AnalyticsService from '../../services/analytics-service';

// 🏗️ Enterprise Constants
const OTP_CONFIG = {
  LENGTH: 6,
  TIMEOUT: 300, // 5 minutes
  RESEND_COOLDOWN: 60, // 60 seconds
  MAX_ATTEMPTS: 3
};

const SECURITY_CONFIG = {
  MAX_OTP_REQUESTS_PER_HOUR: 5,
  LOCKOUT_DURATION: 900, // 15 minutes
  SESSION_TIMEOUT: 1800 // 30 minutes
};

/**
 * 🏗️ Enterprise Forgot Password Component
 * @component ForgotPassword
 */
const ForgotPassword = () => {
  const router = useRouter();
  
  // 🏗️ State Management
  const [step, setStep] = useState('IDENTIFICATION'); // IDENTIFICATION, OTP_VERIFICATION, PASSWORD_RESET
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [securityLock, setSecurityLock] = useState(false);

  // 🏗️ Form Data
  const [formData, setFormData] = useState({
    faydaId: '',
    phoneNumber: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 🏗️ OTP Management
  const [otpData, setOtpData] = useState({
    attempts: 0,
    token: null,
    expiresAt: null
  });

  // 🏗️ Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // 🏗️ Refs
  const otpInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  /**
   * 🏗️ Component Initialization
   */
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();

    // 🏗️ Check for existing security locks
    checkSecurityStatus();
  }, []);

  /**
   * 🏗️ Cooldown Timer Effect
   */
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  /**
   * 🏗️ Check Security Status
   */
  const checkSecurityStatus = async () => {
    try {
      const securityStatus = await SecurityService.checkPasswordResetStatus();
      if (securityStatus.isLocked) {
        setSecurityLock(true);
        setCooldown(securityStatus.lockoutRemaining);
        
        AnalyticsService.logSecurityEvent('PASSWORD_RESET_LOCKOUT_VIEW', {
          reason: securityStatus.lockReason,
          remainingTime: securityStatus.lockoutRemaining
        });
      }
    } catch (error) {
      console.error('Security status check failed:', error);
    }
  };

  /**
   * 🏗️ Validate Fayda ID Format
   */
  const validateFaydaId = (faydaId) => {
    const faydaRegex = /^[A-Z0-9]{10,15}$/;
    return faydaRegex.test(faydaId);
  };

  /**
   * 🏗️ Validate Ethiopian Phone Number
   */
  const validatePhoneNumber = (phone) => {
    const ethiopianPhoneRegex = /^(?:\+251|0)(9[0-9]{8})$/;
    return ethiopianPhoneRegex.test(phone);
  };

  /**
   * 🏗️ Validate Password Strength
   */
  const validatePasswordStrength = (password) => {
    const requirements = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const strength = Object.values(requirements).filter(Boolean).length;
    return {
      isValid: Object.values(requirements).every(Boolean),
      strength,
      requirements
    };
  };

  /**
   * 🏗️ Handle Identification Submission
   */
  const handleIdentificationSubmit = async () => {
    if (securityLock) {
      showSecurityAlert();
      return;
    }

    // 🏗️ Input Validation
    if (!formData.faydaId.trim() || !formData.phoneNumber.trim()) {
      triggerShakeAnimation();
      showAlert('Validation Error', 'Please enter both Fayda ID and phone number');
      return;
    }

    if (!validateFaydaId(formData.faydaId)) {
      triggerShakeAnimation();
      showAlert('Invalid Fayda ID', 'Please enter a valid government-issued Fayda ID');
      return;
    }

    if (!validatePhoneNumber(formData.phoneNumber)) {
      triggerShakeAnimation();
      showAlert('Invalid Phone Number', 'Please enter a valid Ethiopian phone number');
      return;
    }

    setLoading(true);

    try {
      // 🏗️ Enterprise Security Check
      const securityCheck = await SecurityService.validatePasswordResetRequest({
        faydaId: formData.faydaId,
        phoneNumber: formData.phoneNumber,
        timestamp: new Date().toISOString(),
        userAgent: 'mobile-app'
      });

      if (!securityCheck.allowed) {
        setSecurityLock(true);
        setCooldown(securityCheck.lockoutDuration || SECURITY_CONFIG.LOCKOUT_DURATION);
        
        AnalyticsService.logSecurityEvent('PASSWORD_RESET_BLOCKED', {
          faydaId: formData.faydaId,
          reason: securityCheck.reason,
          attemptCount: securityCheck.attemptCount
        });

        showSecurityAlert(securityCheck.reason);
        setLoading(false);
        return;
      }

      // 🏗️ Verify User Identity
      const identityVerification = await AuthService.verifyUserIdentity({
        faydaId: formData.faydaId,
        phoneNumber: formData.phoneNumber
      });

      if (!identityVerification.verified) {
        AnalyticsService.logSecurityEvent('IDENTITY_VERIFICATION_FAILED', {
          faydaId: formData.faydaId,
          reason: identityVerification.reason
        });

        showAlert(
          'Identity Verification Failed',
          identityVerification.reason === 'USER_NOT_FOUND' 
            ? 'No account found with these credentials'
            : 'Unable to verify your identity. Please contact support.'
        );
        setLoading(false);
        return;
      }

      // 🏗️ Check for Duplicate Accounts
      if (identityVerification.duplicateAccounts) {
        AnalyticsService.logSecurityEvent('DUPLICATE_ACCOUNT_DETECTED', {
          faydaId: formData.faydaId,
          duplicateCount: identityVerification.duplicateAccounts.length
        });

        showAlert(
          'Account Issue Detected',
          'Multiple accounts found with this Fayda ID. Please contact customer support.'
        );
        setLoading(false);
        return;
      }

      // 🏗️ Send OTP
      const otpResponse = await AuthService.initiatePasswordReset({
        faydaId: formData.faydaId,
        phoneNumber: formData.phoneNumber,
        channel: 'SMS', // Could be 'EMAIL' or 'SMS'
        deviceInfo: {
          platform: Platform.OS,
          userAgent: 'mobile-app'
        }
      });

      if (otpResponse.success) {
        setOtpData({
          attempts: 0,
          token: otpResponse.token,
          expiresAt: otpResponse.expiresAt
        });
        
        setStep('OTP_VERIFICATION');
        
        AnalyticsService.logAuthEvent('PASSWORD_RESET_OTP_SENT', {
          faydaId: formData.faydaId,
          channel: 'SMS'
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(otpResponse.error || 'Failed to send OTP');
      }

    } catch (error) {
      console.error('Password reset initiation failed:', error);
      
      AnalyticsService.logError('PASSWORD_RESET_INITIATION_FAILED', {
        faydaId: formData.faydaId,
        error: error.message
      });

      showAlert(
        'Request Failed',
        'Unable to process your request. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🏗️ Handle OTP Verification
   */
  const handleOtpVerification = async () => {
    if (otpData.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      showAlert(
        'Maximum Attempts Exceeded',
        'You have exceeded the maximum OTP attempts. Please request a new OTP.'
      );
      return;
    }

    if (formData.otp.length !== OTP_CONFIG.LENGTH) {
      triggerShakeAnimation();
      showAlert('Invalid OTP', 'Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);

    try {
      const verificationResult = await AuthService.verifyPasswordResetOtp({
        token: otpData.token,
        otp: formData.otp,
        faydaId: formData.faydaId
      });

      if (verificationResult.verified) {
        setStep('PASSWORD_RESET');
        
        AnalyticsService.logAuthEvent('PASSWORD_RESET_OTP_VERIFIED', {
          faydaId: formData.faydaId
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setOtpData(prev => ({
          ...prev,
          attempts: prev.attempts + 1
        }));

        const remainingAttempts = OTP_CONFIG.MAX_ATTEMPTS - (otpData.attempts + 1);
        
        AnalyticsService.logSecurityEvent('PASSWORD_RESET_OTP_FAILED', {
          faydaId: formData.faydaId,
          attempt: otpData.attempts + 1,
          remainingAttempts
        });

        showAlert(
          'Invalid OTP',
          `The OTP you entered is incorrect. ${remainingAttempts} attempt(s) remaining.`
        );

        triggerShakeAnimation();
      }

    } catch (error) {
      console.error('OTP verification failed:', error);
      
      AnalyticsService.logError('PASSWORD_RESET_OTP_VERIFICATION_FAILED', {
        faydaId: formData.faydaId,
        error: error.message
      });

      showAlert('Verification Failed', 'Unable to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🏗️ Handle Password Reset
   */
  const handlePasswordReset = async () => {
    // 🏗️ Password Validation
    if (!formData.newPassword || !formData.confirmPassword) {
      triggerShakeAnimation();
      showAlert('Validation Error', 'Please enter and confirm your new password');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      triggerShakeAnimation();
      showAlert('Password Mismatch', 'New password and confirmation do not match');
      return;
    }

    const passwordValidation = validatePasswordStrength(formData.newPassword);
    if (!passwordValidation.isValid) {
      triggerShakeAnimation();
      showAlert(
        'Weak Password',
        'Password must contain at least 8 characters with uppercase, lowercase, numbers, and special characters.'
      );
      return;
    }

    setLoading(true);

    try {
      const resetResult = await AuthService.completePasswordReset({
        token: otpData.token,
        faydaId: formData.faydaId,
        newPassword: formData.newPassword,
        deviceInfo: {
          platform: Platform.OS,
          timestamp: new Date().toISOString()
        }
      });

      if (resetResult.success) {
        AnalyticsService.logAuthEvent('PASSWORD_RESET_COMPLETED', {
          faydaId: formData.faydaId
        });

        showSuccessAlert();
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // 🏗️ Redirect to login after successful reset
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 2000);
      } else {
        throw new Error(resetResult.error || 'Password reset failed');
      }

    } catch (error) {
      console.error('Password reset failed:', error);
      
      AnalyticsService.logError('PASSWORD_RESET_COMPLETION_FAILED', {
        faydaId: formData.faydaId,
        error: error.message
      });

      showAlert('Reset Failed', 'Unable to reset your password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🏗️ Resend OTP
   */
  const handleResendOtp = async () => {
    if (cooldown > 0) return;

    setLoading(true);

    try {
      const otpResponse = await AuthService.resendPasswordResetOtp({
        faydaId: formData.faydaId,
        phoneNumber: formData.phoneNumber,
        token: otpData.token
      });

      if (otpResponse.success) {
        setCooldown(OTP_CONFIG.RESEND_COOLDOWN);
        setOtpData(prev => ({
          ...prev,
          token: otpResponse.token,
          expiresAt: otpResponse.expiresAt,
          attempts: 0
        }));

        AnalyticsService.logAuthEvent('PASSWORD_RESET_OTP_RESENT', {
          faydaId: formData.faydaId
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        showAlert('OTP Sent', 'A new OTP has been sent to your registered phone number.');
      } else {
        throw new Error(otpResponse.error || 'Failed to resend OTP');
      }

    } catch (error) {
      console.error('OTP resend failed:', error);
      showAlert('Resend Failed', 'Unable to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🏗️ Animation Helpers
   */
  const triggerShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  /**
   * 🏗️ Alert Helpers
   */
  const showAlert = (title, message) => {
    Alert.alert(title, message, [{ text: 'OK' }]);
  };

  const showSecurityAlert = (reason = 'Too many failed attempts') => {
    Alert.alert(
      'Security Lock',
      `Password reset is temporarily locked. ${reason}. Please try again in ${Math.ceil(cooldown / 60)} minutes.`,
      [{ text: 'OK' }]
    );
  };

  const showSuccessAlert = () => {
    Alert.alert(
      'Password Reset Successful',
      'Your password has been successfully reset. You will be redirected to login.',
      [{ text: 'OK' }]
    );
  };

  /**
   * 🏗️ Render Identification Step
   */
  const renderIdentificationStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Text style={styles.title}>Reset Your Password</Text>
      <Text style={styles.subtitle}>
        Enter your Fayda ID and phone number to receive a verification code
      </Text>

      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Fayda ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your government Fayda ID"
            value={formData.faydaId}
            onChangeText={(text) => setFormData(prev => ({ ...prev, faydaId: text }))}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!securityLock}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+251 9xx xxx xxx"
            value={formData.phoneNumber}
            onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
            keyboardType="phone-pad"
            editable={!securityLock}
            placeholderTextColor="#999"
          />
        </View>
      </Animated.View>

      {securityLock && (
        <View style={styles.securityAlert}>
          <Text style={styles.securityAlertText}>
            🔒 Security Lock: Try again in {Math.ceil(cooldown / 60)} minutes
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.button,
          (securityLock || loading) && styles.buttonDisabled
        ]}
        onPress={handleIdentificationSubmit}
        disabled={securityLock || loading}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {securityLock ? 'Temporarily Locked' : 'Send Verification Code'}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>← Back to Login</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  /**
   * 🏗️ Render OTP Verification Step
   */
  const renderOtpStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Text style={styles.title}>Enter Verification Code</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to your registered phone number
      </Text>

      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Verification Code</Text>
          <TextInput
            ref={otpInputRef}
            style={styles.input}
            placeholder="Enter 6-digit code"
            value={formData.otp}
            onChangeText={(text) => setFormData(prev => ({ ...prev, otp: text.replace(/[^0-9]/g, '') }))}
            keyboardType="number-pad"
            maxLength={6}
            placeholderTextColor="#999"
          />
          <Text style={styles.otpHint}>
            {OTP_CONFIG.MAX_ATTEMPTS - otpData.attempts} attempts remaining
          </Text>
        </View>
      </Animated.View>

      <TouchableOpacity
        style={[
          styles.button,
          (formData.otp.length !== 6 || loading) && styles.buttonDisabled
        ]}
        onPress={handleOtpVerification}
        disabled={formData.otp.length !== 6 || loading}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify Code</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.resendButton,
          cooldown > 0 && styles.resendButtonDisabled
        ]}
        onPress={handleResendOtp}
        disabled={cooldown > 0 || loading}
      >
        <Text style={styles.resendButtonText}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep('IDENTIFICATION')}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  /**
   * 🏗️ Render Password Reset Step
   */
  const renderPasswordResetStep = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Text style={styles.title}>Create New Password</Text>
      <Text style={styles.subtitle}>
        Enter a strong password that you haven't used before
      </Text>

      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            ref={passwordInputRef}
            style={styles.input}
            placeholder="Enter new password"
            value={formData.newPassword}
            onChangeText={(text) => setFormData(prev => ({ ...prev, newPassword: text }))}
            secureTextEntry
            placeholderTextColor="#999"
          />
          {formData.newPassword && (
            <PasswordStrengthIndicator password={formData.newPassword} />
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            ref={confirmPasswordInputRef}
            style={styles.input}
            placeholder="Confirm new password"
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
            secureTextEntry
            placeholderTextColor="#999"
          />
          {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
            <Text style={styles.errorText}>Passwords do not match</Text>
          )}
        </View>
      </Animated.View>

      <TouchableOpacity
        style={[
          styles.button,
          loading && styles.buttonDisabled
        ]}
        onPress={handlePasswordReset}
        disabled={loading}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Reset Password</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setStep('OTP_VERIFICATION')}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  /**
   * 🏗️ Main Render
   */
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#f5f7fa', '#c3cfe2']}
        style={styles.background}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <BlurView intensity={80} style={styles.blurContainer}>
              
              {step === 'IDENTIFICATION' && renderIdentificationStep()}
              {step === 'OTP_VERIFICATION' && renderOtpStep()}
              {step === 'PASSWORD_RESET' && renderPasswordResetStep()}

              {/* 🏗️ Security Footer */}
              <View style={styles.securityFooter}>
                <Text style={styles.securityText}>
                  🔒 Secured by Mosa Forge Enterprise
                </Text>
                <Text style={styles.versionText}>
                  v1.0.0 | Powered by Chereka
                </Text>
              </View>

            </BlurView>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

/**
 * 🏗️ Password Strength Indicator Component
 */
const PasswordStrengthIndicator = ({ password }) => {
  const validation = React.useMemo(() => {
    const requirements = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const strength = Object.values(requirements).filter(Boolean).length;
    return { requirements, strength };
  }, [password]);

  const getStrengthColor = () => {
    if (validation.strength <= 2) return '#ff4757';
    if (validation.strength <= 3) return '#ffa502';
    return '#2ed573';
  };

  const getStrengthText = () => {
    if (validation.strength <= 2) return 'Weak';
    if (validation.strength <= 3) return 'Medium';
    return 'Strong';
  };

  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthBar}>
        <View 
          style={[
            styles.strengthFill,
            { 
              width: `${(validation.strength / 5) * 100}%`,
              backgroundColor: getStrengthColor()
            }
          ]} 
        />
      </View>
      <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
        {getStrengthText()} Password
      </Text>
    </View>
  );
};

/**
 * 🏗️ Enterprise Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  blurContainer: {
    padding: 30,
  },
  stepContainer: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#7f8c8d',
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2c3e50',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2c3e50',
  },
  otpHint: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
    textAlign: 'right',
  },
  button: {
    borderRadius: 12,
    marginTop: 10,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  gradient: {
    padding: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  resendButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 15,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '500',
  },
  backButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
  },
  securityAlert: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff4757',
    marginBottom: 20,
  },
  securityAlertText: {
    color: '#ff4757',
    fontSize: 14,
    fontWeight: '500',
  },
  strengthContainer: {
    marginTop: 10,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 5,
  },
  errorText: {
    color: '#ff4757',
    fontSize: 12,
    marginTop: 5,
  },
  securityFooter: {
    marginTop: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
  },
  securityText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  versionText: {
    fontSize: 10,
    color: '#bdc3c7',
  },
});

export default ForgotPassword;