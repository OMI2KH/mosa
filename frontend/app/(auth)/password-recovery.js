// app/(auth)/password-recovery.js

/**
 * 🔐 ENTERPRISE PASSWORD RECOVERY SYSTEM
 * Secure, multi-step password recovery with Fayda ID verification and OTP authentication
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/auth-context';
import { useSecurity } from '../../hooks/use-security';
import { Logger } from '../../utils/logger';
import { SecureStorage } from '../../utils/secure-storage';
import { NetworkMonitor } from '../../utils/network-monitor';

const logger = new Logger('PasswordRecovery');

// Recovery steps
const RECOVERY_STEPS = {
  FAYDA_VERIFICATION: 1,
  OTP_VERIFICATION: 2,
  PASSWORD_RESET: 3,
  SUCCESS: 4
};

// Security configurations
const SECURITY_CONFIG = {
  MAX_ATTEMPTS: 3,
  OTP_EXPIRY_MINUTES: 10,
  LOCKOUT_DURATION: 15, // minutes
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_REQUIREMENTS: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  }
};

export default function PasswordRecovery() {
  const router = useRouter();
  const { initiatePasswordRecovery, verifyRecoveryOTP, resetPassword } = useAuth();
  const { validateFaydaId, checkRateLimit, logSecurityEvent } = useSecurity();
  
  // State management
  const [currentStep, setCurrentStep] = useState(RECOVERY_STEPS.FAYDA_VERIFICATION);
  const [faydaId, setFaydaId] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(SECURITY_CONFIG.MAX_ATTEMPTS);
  const [otpExpiry, setOtpExpiry] = useState(null);
  const [lockoutUntil, setLockoutUntil] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [recoveryToken, setRecoveryToken] = useState('');

  // Refs for input management
  const faydaInputRef = useRef(null);
  const otpInputRefs = useRef([]);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Network monitoring
  const networkMonitor = new NetworkMonitor();

  /**
   * 🎯 INITIALIZE COMPONENT
   */
  useEffect(() => {
    initializeRecovery();
    return () => cleanup();
  }, []);

  /**
   * 🚀 INITIALIZE RECOVERY PROCESS
   */
  const initializeRecovery = async () => {
    try {
      await SecureStorage.initialize();
      await checkExistingLockout();
      
      logger.info('Password recovery component initialized');
      logSecurityEvent('PASSWORD_RECOVERY_INITIATED', {
        timestamp: new Date().toISOString(),
        userAgent: Platform.OS
      });
    } catch (error) {
      logger.error('Failed to initialize password recovery', error);
      showErrorAlert('Initialization failed. Please try again.');
    }
  };

  /**
   * 🔍 CHECK EXISTING LOCKOUT
   */
  const checkExistingLockout = async () => {
    try {
      const lockoutTime = await SecureStorage.getItem('recovery_lockout_until');
      if (lockoutTime) {
        const lockoutDate = new Date(lockoutTime);
        if (lockoutDate > new Date()) {
          setLockoutUntil(lockoutDate);
          showLockoutAlert(lockoutDate);
        } else {
          await SecureStorage.removeItem('recovery_lockout_until');
        }
      }
    } catch (error) {
      logger.error('Error checking lockout status', error);
    }
  };

  /**
   * 🔄 HANDLE FAYDA ID VERIFICATION
   */
  const handleFaydaVerification = async () => {
    if (isLoading || lockoutUntil) return;

    // Validate Fayda ID format
    if (!validateFaydaIdFormat(faydaId)) {
      triggerShakeAnimation();
      showErrorAlert('Please enter a valid Fayda ID');
      return;
    }

    // Check rate limiting
    if (await checkRateLimit(`recovery_attempts:${faydaId}`)) {
      showErrorAlert('Too many attempts. Please try again later.');
      return;
    }

    setIsLoading(true);

    try {
      // Validate network connectivity
      if (!(await networkMonitor.isConnected())) {
        throw new Error('NETWORK_UNAVAILABLE');
      }

      // Verify Fayda ID with government service
      const verificationResult = await validateFaydaId(faydaId);
      
      if (!verificationResult.isValid) {
        throw new Error('FAYDA_ID_NOT_FOUND');
      }

      if (verificationResult.isDuplicate) {
        throw new Error('ACCOUNT_DUPLICATE_DETECTED');
      }

      // Initiate password recovery process
      const recoveryResponse = await initiatePasswordRecovery(faydaId);
      
      if (recoveryResponse.success) {
        setRecoveryToken(recoveryResponse.recoveryToken);
        startOtpTimer();
        navigateToStep(RECOVERY_STEPS.OTP_VERIFICATION);
        
        logSecurityEvent('PASSWORD_RECOVERY_OTP_SENT', {
          faydaId: maskFaydaId(faydaId),
          channel: recoveryResponse.channel,
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(recoveryResponse.error || 'RECOVERY_INITIATION_FAILED');
      }

    } catch (error) {
      handleRecoveryError(error, 'Fayda verification');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🔢 HANDLE OTP VERIFICATION
   */
  const handleOtpVerification = async () => {
    if (isLoading) return;

    const otpCode = otp.join('');
    
    // Validate OTP format
    if (otpCode.length !== 6 || !/^\d+$/.test(otpCode)) {
      triggerShakeAnimation();
      showErrorAlert('Please enter a valid 6-digit OTP');
      return;
    }

    // Check OTP expiry
    if (otpExpiry && new Date() > otpExpiry) {
      showErrorAlert('OTP has expired. Please request a new one.');
      return;
    }

    setIsLoading(true);

    try {
      const verificationResult = await verifyRecoveryOTP(faydaId, otpCode, recoveryToken);
      
      if (verificationResult.success) {
        setRecoveryToken(verificationResult.newToken || recoveryToken);
        navigateToStep(RECOVERY_STEPS.PASSWORD_RESET);
        
        logSecurityEvent('PASSWORD_RECOVERY_OTP_VERIFIED', {
          faydaId: maskFaydaId(faydaId),
          timestamp: new Date().toISOString()
        });
      } else {
        handleFailedAttempt();
        throw new Error(verificationResult.error || 'OTP_VERIFICATION_FAILED');
      }

    } catch (error) {
      handleRecoveryError(error, 'OTP verification');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🔑 HANDLE PASSWORD RESET
   */
  const handlePasswordReset = async () => {
    if (isLoading) return;

    // Validate password requirements
    const passwordValidation = validatePasswordRequirements(newPassword);
    if (!passwordValidation.isValid) {
      triggerShakeAnimation();
      showErrorAlert(passwordValidation.message);
      return;
    }

    // Confirm password match
    if (newPassword !== confirmPassword) {
      triggerShakeAnimation();
      showErrorAlert('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const resetResult = await resetPassword(faydaId, newPassword, recoveryToken);
      
      if (resetResult.success) {
        await SecureStorage.removeItem('recovery_lockout_until');
        setAttemptsRemaining(SECURITY_CONFIG.MAX_ATTEMPTS);
        navigateToStep(RECOVERY_STEPS.SUCCESS);
        
        logSecurityEvent('PASSWORD_RESET_SUCCESSFUL', {
          faydaId: maskFaydaId(faydaId),
          timestamp: new Date().toISOString(),
          strength: passwordStrength
        });

        // Schedule automatic redirect
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 3000);

      } else {
        throw new Error(resetResult.error || 'PASSWORD_RESET_FAILED');
      }

    } catch (error) {
      handleRecoveryError(error, 'Password reset');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🚨 HANDLE FAILED ATTEMPTS
   */
  const handleFailedAttempt = async () => {
    const newAttempts = attemptsRemaining - 1;
    setAttemptsRemaining(newAttempts);

    if (newAttempts <= 0) {
      const lockoutTime = new Date(Date.now() + SECURITY_CONFIG.LOCKOUT_DURATION * 60 * 1000);
      setLockoutUntil(lockoutTime);
      
      await SecureStorage.setItem('recovery_lockout_until', lockoutTime.toISOString());
      
      showLockoutAlert(lockoutTime);
      
      logSecurityEvent('PASSWORD_RECOVERY_LOCKOUT', {
        faydaId: maskFaydaId(faydaId),
        lockoutUntil: lockoutTime.toISOString(),
        timestamp: new Date().toISOString()
      });
    } else {
      showErrorAlert(`Incorrect OTP. ${newAttempts} attempt(s) remaining.`);
    }
  };

  /**
   * 🎯 HANDLE RECOVERY ERRORS
   */
  const handleRecoveryError = (error, context) => {
    logger.error(`Password recovery error in ${context}`, error);
    
    switch (error.message) {
      case 'FAYDA_ID_NOT_FOUND':
        showErrorAlert('Fayda ID not found. Please check and try again.');
        break;
      case 'ACCOUNT_DUPLICATE_DETECTED':
        showErrorAlert('Duplicate account detected. Please contact support.');
        break;
      case 'OTP_EXPIRED':
        showErrorAlert('OTP has expired. Please request a new one.');
        break;
      case 'INVALID_OTP':
        showErrorAlert('Invalid OTP. Please check and try again.');
        break;
      case 'NETWORK_UNAVAILABLE':
        showErrorAlert('Network unavailable. Please check your connection.');
        break;
      case 'RATE_LIMIT_EXCEEDED':
        showErrorAlert('Too many attempts. Please try again later.');
        break;
      default:
        showErrorAlert('An error occurred. Please try again.');
    }

    triggerShakeAnimation();
  };

  /**
   * 🔄 NAVIGATE BETWEEN STEPS
   */
  const navigateToStep = (step) => {
    Animated.timing(slideAnim, {
      toValue: step,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setCurrentStep(step);
  };

  /**
   * 🔄 RESEND OTP
   */
  const handleResendOtp = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      const resendResult = await initiatePasswordRecovery(faydaId);
      
      if (resendResult.success) {
        setRecoveryToken(resendResult.recoveryToken);
        startOtpTimer();
        showSuccessAlert('New OTP sent successfully');
        
        logSecurityEvent('PASSWORD_RECOVERY_OTP_RESENT', {
          faydaId: maskFaydaId(faydaId),
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(resendResult.error || 'OTP_RESEND_FAILED');
      }

    } catch (error) {
      handleRecoveryError(error, 'OTP resend');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ⏰ START OTP TIMER
   */
  const startOtpTimer = () => {
    const expiryTime = new Date(Date.now() + SECURITY_CONFIG.OTP_EXPIRY_MINUTES * 60 * 1000);
    setOtpExpiry(expiryTime);
  };

  /**
   * 🔢 HANDLE OTP INPUT CHANGE
   */
  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance to next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (index === 5 && value) {
      const completeOtp = newOtp.join('');
      if (completeOtp.length === 6) {
        handleOtpVerification();
      }
    }
  };

  /**
   * 🔤 HANDLE OTP KEY PRESS
   */
  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  /**
   * 💪 VALIDATE PASSWORD STRENGTH
   */
  const validatePasswordStrength = (password) => {
    let strength = 0;
    const requirements = SECURITY_CONFIG.PASSWORD_REQUIREMENTS;

    // Length check
    if (password.length >= requirements.minLength) strength += 25;

    // Uppercase check
    if (requirements.requireUppercase && /[A-Z]/.test(password)) strength += 25;

    // Lowercase check
    if (requirements.requireLowercase && /[a-z]/.test(password)) strength += 25;

    // Numbers check
    if (requirements.requireNumbers && /\d/.test(password)) strength += 15;

    // Special characters check
    if (requirements.requireSpecialChars && /[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 10;

    setPasswordStrength(strength);
    return strength;
  };

  /**
   * 🛡️ VALIDATE PASSWORD REQUIREMENTS
   */
  const validatePasswordRequirements = (password) => {
    const requirements = SECURITY_CONFIG.PASSWORD_REQUIREMENTS;
    const errors = [];

    if (password.length < requirements.minLength) {
      errors.push(`at least ${requirements.minLength} characters`);
    }

    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('one uppercase letter');
    }

    if (requirements.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('one lowercase letter');
    }

    if (requirements.requireNumbers && !/\d/.test(password)) {
      errors.push('one number');
    }

    if (requirements.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('one special character');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        message: `Password must contain: ${errors.join(', ')}`
      };
    }

    return { isValid: true };
  };

  /**
   * 🎨 GET PASSWORD STRENGTH COLOR
   */
  const getPasswordStrengthColor = () => {
    if (passwordStrength >= 80) return '#10B981'; // Green
    if (passwordStrength >= 60) return '#F59E0B'; // Yellow
    if (passwordStrength >= 40) return '#EF4444'; // Red
    return '#6B7280'; // Gray
  };

  /**
   * 🎨 GET PASSWORD STRENGTH LABEL
   */
  const getPasswordStrengthLabel = () => {
    if (passwordStrength >= 80) return 'Strong';
    if (passwordStrength >= 60) return 'Good';
    if (passwordStrength >= 40) return 'Weak';
    return 'Very Weak';
  };

  /**
   * 📳 TRIGGER SHAKE ANIMATION
   */
  const triggerShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  /**
   * 🚨 SHOW ERROR ALERT
   */
  const showErrorAlert = (message) => {
    Alert.alert('Error', message, [{ text: 'OK' }]);
  };

  /**
   * ✅ SHOW SUCCESS ALERT
   */
  const showSuccessAlert = (message) => {
    Alert.alert('Success', message, [{ text: 'OK' }]);
  };

  /**
   * 🔒 SHOW LOCKOUT ALERT
   */
  const showLockoutAlert = (lockoutTime) => {
    const minutesRemaining = Math.ceil((lockoutTime - new Date()) / (60 * 1000));
    Alert.alert(
      'Account Locked',
      `Too many failed attempts. Try again in ${minutesRemaining} minutes.`,
      [{ text: 'OK' }]
    );
  };

  /**
   * 🔍 VALIDATE FAYDA ID FORMAT
   */
  const validateFaydaIdFormat = (id) => {
    // Ethiopian Fayda ID format validation
    const faydaRegex = /^[A-Z0-9]{10,15}$/;
    return faydaRegex.test(id);
  };

  /**
   * 🎭 MASK FAYDA ID FOR LOGGING
   */
  const maskFaydaId = (id) => {
    if (id.length <= 4) return '***';
    return `${id.substring(0, 3)}***${id.substring(id.length - 2)}`;
  };

  /**
   * 🧹 CLEANUP FUNCTION
   */
  const cleanup = () => {
    // Clear any sensitive data from memory
    setFaydaId('');
    setOtp(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmPassword('');
    setRecoveryToken('');
  };

  /**
   * 🎯 RENDER FAYDA VERIFICATION STEP
   */
  const renderFaydaVerification = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          transform: [{
            translateX: slideAnim.interpolate({
              inputRange: [1, 2],
              outputRange: [0, -400]
            })
          }]
        }
      ]}
    >
      <Text style={styles.title}>Reset Your Password</Text>
      <Text style={styles.subtitle}>
        Enter your Fayda ID to receive a verification code
      </Text>

      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <TextInput
          ref={faydaInputRef}
          style={[
            styles.input,
            lockoutUntil && styles.inputDisabled
          ]}
          placeholder="Enter Fayda ID"
          value={faydaId}
          onChangeText={setFaydaId}
          editable={!lockoutUntil && !isLoading}
          autoCapitalize="characters"
          autoComplete="username"
          keyboardType="default"
          returnKeyType="done"
          onSubmitEditing={handleFaydaVerification}
        />
      </Animated.View>

      <TouchableOpacity
        style={[
          styles.button,
          (!faydaId || isLoading || lockoutUntil) && styles.buttonDisabled
        ]}
        onPress={handleFaydaVerification}
        disabled={!faydaId || isLoading || lockoutUntil}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Send Verification Code</Text>
        )}
      </TouchableOpacity>

      {lockoutUntil && (
        <Text style={styles.lockoutText}>
          Account locked. Try again at {lockoutUntil.toLocaleTimeString()}
        </Text>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  /**
   * 🔢 RENDER OTP VERIFICATION STEP
   */
  const renderOtpVerification = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          transform: [{
            translateX: slideAnim.interpolate({
              inputRange: [1, 2, 3],
              outputRange: [400, 0, -400]
            })
          }]
        }
      ]}
    >
      <Text style={styles.title}>Enter Verification Code</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to your registered phone number
      </Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={ref => otpInputRefs.current[index] = ref}
            style={styles.otpInput}
            value={digit}
            onChangeText={(value) => handleOtpChange(value, index)}
            onKeyPress={(e) => handleOtpKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            editable={!isLoading}
            selectTextOnFocus
          />
        ))}
      </View>

      {otpExpiry && (
        <Text style={styles.timerText}>
          Code expires in {Math.ceil((otpExpiry - new Date()) / 1000 / 60)} minutes
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.button,
          (otp.join('').length !== 6 || isLoading) && styles.buttonDisabled
        ]}
        onPress={handleOtpVerification}
        disabled={otp.join('').length !== 6 || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Verify Code</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleResendOtp}
        disabled={isLoading}
      >
        <Text style={styles.resendButtonText}>
          Didn't receive code? Resend
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigateToStep(RECOVERY_STEPS.FAYDA_VERIFICATION)}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  /**
   * 🔑 RENDER PASSWORD RESET STEP
   */
  const renderPasswordReset = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          transform: [{
            translateX: slideAnim.interpolate({
              inputRange: [2, 3, 4],
              outputRange: [400, 0, -400]
            })
          }]
        }
      ]}
    >
      <Text style={styles.title}>Create New Password</Text>
      <Text style={styles.subtitle}>
        Your new password must be different from previous passwords
      </Text>

      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <TextInput
          ref={passwordInputRef}
          style={styles.input}
          placeholder="New Password"
          value={newPassword}
          onChangeText={(text) => {
            setNewPassword(text);
            validatePasswordStrength(text);
          }}
          secureTextEntry
          editable={!isLoading}
          autoComplete="password-new"
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
        />

        {newPassword.length > 0 && (
          <View style={styles.passwordStrengthContainer}>
            <View style={styles.passwordStrengthBar}>
              <View 
                style={[
                  styles.passwordStrengthFill,
                  { 
                    width: `${passwordStrength}%`,
                    backgroundColor: getPasswordStrengthColor()
                  }
                ]} 
              />
            </View>
            <Text style={styles.passwordStrengthText}>
              Strength: {getPasswordStrengthLabel()}
            </Text>
          </View>
        )}

        <TextInput
          ref={confirmPasswordInputRef}
          style={styles.input}
          placeholder="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          editable={!isLoading}
          autoComplete="password-new"
          returnKeyType="done"
          onSubmitEditing={handlePasswordReset}
        />
      </Animated.View>

      <TouchableOpacity
        style={[
          styles.button,
          (!newPassword || !confirmPassword || isLoading) && styles.buttonDisabled
        ]}
        onPress={handlePasswordReset}
        disabled={!newPassword || !confirmPassword || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Reset Password</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigateToStep(RECOVERY_STEPS.OTP_VERIFICATION)}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  /**
   * ✅ RENDER SUCCESS STEP
   */
  const renderSuccess = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          transform: [{
            translateX: slideAnim.interpolate({
              inputRange: [3, 4],
              outputRange: [400, 0]
            })
          }]
        }
      ]}
    >
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Password Reset Successful</Text>
        <Text style={styles.successMessage}>
          Your password has been reset successfully. You will be redirected to login shortly.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace('/(auth)/login')}
      >
        <Text style={styles.buttonText}>Continue to Login</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.appName}>Mosa Forge</Text>
          <Text style={styles.tagline}>Enterprise Skills Platform</Text>
        </View>

        <View style={styles.content}>
          {currentStep === RECOVERY_STEPS.FAYDA_VERIFICATION && renderFaydaVerification()}
          {currentStep === RECOVERY_STEPS.OTP_VERIFICATION && renderOtpVerification()}
          {currentStep === RECOVERY_STEPS.PASSWORD_RESET && renderPasswordReset()}
          {currentStep === RECOVERY_STEPS.SUCCESS && renderSuccess()}
        </View>

        <View style={styles.footer}>
          <Text style={styles.securityNotice}>
            🔒 Your security is our priority. All data is encrypted and secure.
          </Text>
          <Text style={styles.poweredBy}>
            Powered by Chereka | Founded by Oumer Muktar
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  stepContainer: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpInput: {
    width: 50,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  button: {
    backgroundColor: '#1E40AF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  resendButtonText: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '500',
  },
  timerText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  lockoutText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  passwordStrengthContainer: {
    marginBottom: 16,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 4,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  securityNotice: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  poweredBy: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});