/**
 * 🎯 MOSA FORGE: Enterprise Password Recovery Flow
 * 
 * @component RecoveryFlow
 * @description Enterprise-grade password recovery with Fayda ID verification, OTP, and security
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Fayda ID government verification
 * - Multi-channel OTP delivery (SMS/Email)
 * - AI duplicate account detection
 * - Security threat monitoring
 * - Progressive disclosure UI
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
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// 🏗️ Enterprise Constants
const RECOVERY_STEPS = {
  FAYDA_VERIFICATION: 'fayda_verification',
  OTP_VERIFICATION: 'otp_verification',
  PASSWORD_RESET: 'password_reset',
  SUCCESS: 'success'
};

const OTP_DELIVERY_METHODS = {
  SMS: 'sms',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp'
};

const SECURITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

/**
 * 🏗️ Enterprise Recovery Flow Component
 * @function RecoveryFlow
 * @param {Object} props - Component properties
 */
const RecoveryFlow = ({
  onRecoveryComplete,
  onBackToLogin,
  maxAttempts = 3,
  otpExpiryMinutes = 10,
  enableBiometric = false,
  securityLevel = SECURITY_LEVELS.HIGH
}) => {
  // 🏗️ Navigation
  const navigation = useNavigation();

  // 🏗️ State Management
  const [currentStep, setCurrentStep] = useState(RECOVERY_STEPS.FAYDA_VERIFICATION);
  const [faydaId, setFaydaId] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(maxAttempts);
  const [otpDeliveryMethod, setOtpDeliveryMethod] = useState(OTP_DELIVERY_METHODS.SMS);
  const [countdown, setCountdown] = useState(0);
  const [securityThreats, setSecurityThreats] = useState([]);
  const [recoverySession, setRecoverySession] = useState(null);

  // 🏗️ Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // 🏗️ Refs
  const otpInputRefs = useRef([]);
  const passwordStrengthRef = useRef(null);

  /**
   * 🏗️ Initialize Component Animations
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
  }, []);

  /**
   * 🏗️ Handle Countdown Timer
   */
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  /**
   * 🏗️ Trigger Shake Animation for Errors
   */
  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // 🏗️ Haptic Feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [shakeAnim]);

  /**
   * 🎯 ENTERPRISE METHOD: Validate Fayda ID Format
   * @param {string} id - Fayda ID to validate
   * @returns {Object} Validation result
   */
  const validateFaydaId = useCallback((id) => {
    const validation = {
      isValid: false,
      errors: [],
      warnings: [],
      securityLevel: SECURITY_LEVELS.LOW
    };

    // 🏗️ Basic Format Validation
    if (!id || id.trim().length === 0) {
      validation.errors.push('Fayda ID is required');
      return validation;
    }

    const cleanId = id.trim().replace(/\s+/g, '');

    // 🏗️ Length Validation (Ethiopian ID standards)
    if (cleanId.length < 10 || cleanId.length > 13) {
      validation.errors.push('Fayda ID must be between 10-13 characters');
    }

    // 🏗️ Numeric Validation
    if (!/^\d+$/.test(cleanId)) {
      validation.errors.push('Fayda ID must contain only numbers');
    }

    // 🏗️ Checksum Validation (Basic implementation)
    if (cleanId.length === 13) {
      // Add advanced checksum validation here
      const checksum = cleanId.slice(-1);
      const baseId = cleanId.slice(0, -1);
      // Implement actual checksum algorithm for Ethiopian IDs
    }

    validation.isValid = validation.errors.length === 0;
    
    if (validation.isValid) {
      validation.securityLevel = cleanId.length === 13 ? SECURITY_LEVELS.HIGH : SECURITY_LEVELS.MEDIUM;
    }

    return validation;
  }, []);

  /**
   * 🎯 ENTERPRISE METHOD: Verify Fayda ID with Government API
   * @param {string} faydaId - Fayda ID to verify
   * @returns {Promise<Object>} Verification result
   */
  const verifyFaydaIdWithGovernment = useCallback(async (faydaId) => {
    setIsLoading(true);
    
    try {
      // 🏗️ Simulate API call to government verification service
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/verify-fayda`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Enterprise-Key': process.env.EXPO_PUBLIC_ENTERPRISE_KEY,
        },
        body: JSON.stringify({
          faydaId: faydaId.trim(),
          sessionId: recoverySession?.id,
          timestamp: new Date().toISOString(),
          securityLevel: securityLevel
        }),
      });

      if (!response.ok) {
        throw new Error('Government verification service unavailable');
      }

      const result = await response.json();

      // 🏗️ Handle different verification outcomes
      if (result.status === 'VERIFIED') {
        return {
          success: true,
          data: result.data,
          securityFlags: result.securityFlags || [],
          requiresAdditionalAuth: result.requiresAdditionalAuth || false
        };
      } else if (result.status === 'DUPLICATE_DETECTED') {
        // 🏗️ AI-powered duplicate detection
        setSecurityThreats(prev => [...prev, {
          type: 'DUPLICATE_ACCOUNT',
          severity: 'HIGH',
          message: 'Multiple accounts detected with same Fayda ID',
          timestamp: new Date().toISOString()
        }]);
        
        return {
          success: false,
          error: 'DUPLICATE_ACCOUNT',
          message: 'This Fayda ID is already associated with another account',
          recoveryOptions: result.recoveryOptions
        };
      } else if (result.status === 'SUSPICIOUS_ACTIVITY') {
        setSecurityThreats(prev => [...prev, {
          type: 'SUSPICIOUS_VERIFICATION',
          severity: 'CRITICAL',
          message: 'Suspicious verification pattern detected',
          timestamp: new Date().toISOString()
        }]);
        
        return {
          success: false,
          error: 'SUSPICIOUS_ACTIVITY',
          message: 'Security verification failed. Please contact support.',
          lockoutDuration: result.lockoutDuration
        };
      } else {
        return {
          success: false,
          error: 'VERIFICATION_FAILED',
          message: 'Fayda ID verification failed. Please check your ID and try again.'
        };
      }
    } catch (error) {
      console.error('Fayda verification error:', error);
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Unable to verify Fayda ID. Please check your connection.'
      };
    } finally {
      setIsLoading(false);
    }
  }, [recoverySession, securityLevel]);

  /**
   * 🎯 ENTERPRISE METHOD: Send OTP to User
   * @param {string} faydaId - Verified Fayda ID
   * @param {string} method - OTP delivery method
   * @returns {Promise<Object>} OTP sending result
   */
  const sendOtp = useCallback(async (faydaId, method = OTP_DELIVERY_METHODS.SMS) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/send-recovery-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Enterprise-Key': process.env.EXPO_PUBLIC_ENTERPRISE_KEY,
        },
        body: JSON.stringify({
          faydaId: faydaId.trim(),
          deliveryMethod: method,
          sessionId: recoverySession?.id,
          purpose: 'PASSWORD_RECOVERY',
          securityContext: {
            ipAddress: 'detected', // Would be actual IP in production
            userAgent: 'mobile-app',
            timestamp: new Date().toISOString()
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 🏗️ Start countdown timer
        setCountdown(otpExpiryMinutes * 60);
        setOtpDeliveryMethod(method);
        
        // 🏗️ Haptic success feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        return {
          success: true,
          otpExpiry: result.otpExpiry,
          maskedDestination: result.maskedDestination,
          retryAvailable: result.retryAvailable
        };
      } else {
        throw new Error(result.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('OTP sending error:', error);
      triggerShake();
      
      return {
        success: false,
        error: 'OTP_SEND_FAILED',
        message: 'Unable to send verification code. Please try again.'
      };
    } finally {
      setIsLoading(false);
    }
  }, [recoverySession, otpExpiryMinutes, triggerShake]);

  /**
   * 🎯 ENTERPRISE METHOD: Verify OTP Code
   * @param {string} faydaId - Verified Fayda ID
   * @param {Array} otpArray - OTP code as array
   * @returns {Promise<Object>} OTP verification result
   */
  const verifyOtp = useCallback(async (faydaId, otpArray) => {
    const otp = otpArray.join('');
    
    if (otp.length !== 6) {
      triggerShake();
      return {
        success: false,
        error: 'INVALID_OTP_LENGTH',
        message: 'Please enter complete 6-digit code'
      };
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/verify-recovery-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Enterprise-Key': process.env.EXPO_PUBLIC_ENTERPRISE_KEY,
        },
        body: JSON.stringify({
          faydaId: faydaId.trim(),
          otpCode: otp,
          sessionId: recoverySession?.id,
          attemptsRemaining: attemptsRemaining - 1,
          securityCheck: {
            timestamp: new Date().toISOString(),
            deviceFingerprint: 'mobile-app-fingerprint' // Would be actual fingerprint
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 🏗️ OTP verified successfully
        setAttemptsRemaining(maxAttempts);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        return {
          success: true,
          recoveryToken: result.recoveryToken,
          tokenExpiry: result.tokenExpiry,
          securityLevel: result.securityLevel
        };
      } else {
        // 🏗️ Handle OTP verification failure
        const remaining = attemptsRemaining - 1;
        setAttemptsRemaining(remaining);

        if (remaining <= 0) {
          return {
            success: false,
            error: 'MAX_ATTEMPTS_EXCEEDED',
            message: 'Too many failed attempts. Account temporarily locked.',
            lockoutDuration: result.lockoutDuration || 900 // 15 minutes
          };
        }

        triggerShake();
        return {
          success: false,
          error: 'INVALID_OTP',
          message: `Invalid verification code. ${remaining} attempts remaining.`,
          attemptsRemaining: remaining
        };
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      triggerShake();
      
      return {
        success: false,
        error: 'VERIFICATION_FAILED',
        message: 'Unable to verify code. Please try again.'
      };
    } finally {
      setIsLoading(false);
    }
  }, [recoverySession, attemptsRemaining, maxAttempts, triggerShake]);

  /**
   * 🎯 ENTERPRISE METHOD: Reset Password
   * @param {string} faydaId - Verified Fayda ID
   * @param {string} newPassword - New password
   * @param {string} recoveryToken - Recovery token from OTP verification
   * @returns {Promise<Object>} Password reset result
   */
  const resetPassword = useCallback(async (faydaId, newPassword, recoveryToken) => {
    // 🏗️ Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isStrong) {
      triggerShake();
      return {
        success: false,
        error: 'WEAK_PASSWORD',
        message: 'Password does not meet security requirements',
        validation: passwordValidation
      };
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Enterprise-Key': process.env.EXPO_PUBLIC_ENTERPRISE_KEY,
          'Authorization': `Bearer ${recoveryToken}`
        },
        body: JSON.stringify({
          faydaId: faydaId.trim(),
          newPassword: newPassword,
          sessionId: recoverySession?.id,
          securityContext: {
            timestamp: new Date().toISOString(),
            passwordStrength: passwordValidation.score,
            previousPasswordHash: 'hashed_previous' // Would be actual hash
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 🏗️ Password reset successful
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // 🏗️ Security logging
        setSecurityThreats(prev => [...prev, {
          type: 'PASSWORD_RESET_SUCCESS',
          severity: 'INFO',
          message: 'Password successfully reset',
          timestamp: new Date().toISOString(),
          changeType: 'recovery'
        }]);

        return {
          success: true,
          message: 'Password reset successfully',
          nextSteps: result.nextSteps,
          securityRecommendations: result.securityRecommendations
        };
      } else {
        throw new Error(result.message || 'Password reset failed');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      triggerShake();
      
      return {
        success: false,
        error: 'RESET_FAILED',
        message: 'Unable to reset password. Please try again.'
      };
    } finally {
      setIsLoading(false);
    }
  }, [recoverySession]);

  /**
   * 🏗️ Validate Password Strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  const validatePasswordStrength = useCallback((password) => {
    const validation = {
      isStrong: false,
      score: 0,
      feedback: [],
      requirements: {
        minLength: 8,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumbers: false,
        hasSpecialChars: false
      }
    };

    if (password.length >= 8) {
      validation.score += 25;
      validation.requirements.minLength = true;
    } else {
      validation.feedback.push('At least 8 characters required');
    }

    if (/[A-Z]/.test(password)) {
      validation.score += 25;
      validation.requirements.hasUpperCase = true;
    } else {
      validation.feedback.push('Include uppercase letters');
    }

    if (/[a-z]/.test(password)) {
      validation.score += 25;
      validation.requirements.hasLowerCase = true;
    } else {
      validation.feedback.push('Include lowercase letters');
    }

    if (/[0-9]/.test(password)) {
      validation.score += 15;
      validation.requirements.hasNumbers = true;
    } else {
      validation.feedback.push('Include numbers');
    }

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      validation.score += 10;
      validation.requirements.hasSpecialChars = true;
    } else {
      validation.feedback.push('Include special characters');
    }

    validation.isStrong = validation.score >= 80;
    return validation;
  }, []);

  /**
   * 🏗️ Handle Fayda ID Submission
   */
  const handleFaydaIdSubmit = async () => {
    // 🏗️ Validate Fayda ID format
    const validation = validateFaydaId(faydaId);
    if (!validation.isValid) {
      Alert.alert('Invalid Fayda ID', validation.errors[0]);
      triggerShake();
      return;
    }

    // 🏗️ Verify with government API
    const verificationResult = await verifyFaydaIdWithGovernment(faydaId);
    
    if (verificationResult.success) {
      // 🏗️ Proceed to OTP step
      setRecoverySession(verificationResult.data.session);
      setCurrentStep(RECOVERY_STEPS.OTP_VERIFICATION);
      
      // 🏗️ Send OTP automatically
      await sendOtp(faydaId);
    } else {
      Alert.alert(
        'Verification Failed',
        verificationResult.message,
        verificationResult.recoveryOptions ? [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Another Method', onPress: handleAlternativeVerification }
        ] : [{ text: 'OK' }]
      );
    }
  };

  /**
   * 🏗️ Handle OTP Verification
   */
  const handleOtpVerify = async () => {
    const verificationResult = await verifyOtp(faydaId, otpCode);
    
    if (verificationResult.success) {
      setRecoverySession(prev => ({
        ...prev,
        recoveryToken: verificationResult.recoveryToken
      }));
      setCurrentStep(RECOVERY_STEPS.PASSWORD_RESET);
    } else {
      Alert.alert('Verification Failed', verificationResult.message);
    }
  };

  /**
   * 🏗️ Handle Password Reset
   */
  const handlePasswordReset = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      triggerShake();
      return;
    }

    const resetResult = await resetPassword(faydaId, newPassword, recoverySession.recoveryToken);
    
    if (resetResult.success) {
      setCurrentStep(RECOVERY_STEPS.SUCCESS);
      
      // 🏗️ Call completion callback
      if (onRecoveryComplete) {
        onRecoveryComplete({
          faydaId,
          timestamp: new Date().toISOString(),
          securityLevel: resetResult.securityLevel
        });
      }
    } else {
      Alert.alert('Reset Failed', resetResult.message);
    }
  };

  /**
   * 🏗️ Handle OTP Input Change
   */
  const handleOtpChange = (value, index) => {
    const newOtpCode = [...otpCode];
    newOtpCode[index] = value;
    setOtpCode(newOtpCode);

    // 🏗️ Auto-advance to next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // 🏗️ Auto-submit when complete
    if (newOtpCode.every(digit => digit !== '') && index === 5) {
      handleOtpVerify();
    }
  };

  /**
   * 🏗️ Handle OTP Backspace
   */
  const handleOtpBackspace = (index) => {
    if (otpCode[index] === '' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  /**
   * 🏗️ Resend OTP
   */
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    
    const result = await sendOtp(faydaId, otpDeliveryMethod);
    if (!result.success) {
      Alert.alert('Error', result.message);
    }
  };

  /**
   * 🏗️ Render Fayda ID Verification Step
   */
  const renderFaydaVerification = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Text style={styles.title}>Account Recovery</Text>
      <Text style={styles.subtitle}>
        Enter your Fayda ID to recover your account
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Fayda ID</Text>
        <TextInput
          style={[
            styles.textInput,
            securityThreats.length > 0 && styles.inputError
          ]}
          placeholder="Enter your 10-13 digit Fayda ID"
          value={faydaId}
          onChangeText={setFaydaId}
          keyboardType="number-pad"
          maxLength={13}
          autoComplete="off"
          autoCapitalize="none"
          editable={!isLoading}
        />
        
        {securityThreats.length > 0 && (
          <View style={styles.securityAlert}>
            <Text style={styles.securityAlertText}>
              ⚠️ Security verification required
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          isLoading && styles.buttonDisabled
        ]}
        onPress={handleFaydaIdSubmit}
        disabled={isLoading || !faydaId.trim()}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Verify Identity</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onBackToLogin}
      >
        <Text style={styles.secondaryButtonText}>Back to Login</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  /**
   * 🏗️ Render OTP Verification Step
   */
  const renderOtpVerification = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Text style={styles.title}>Verify Your Identity</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code sent to your {otpDeliveryMethod === OTP_DELIVERY_METHODS.SMS ? 'phone' : 'email'}
      </Text>

      <View style={styles.otpContainer}>
        {otpCode.map((digit, index) => (
          <TextInput
            key={index}
            ref={ref => otpInputRefs.current[index] = ref}
            style={[
              styles.otpInput,
              digit && styles.otpInputFilled,
              attemptsRemaining < maxAttempts && styles.otpInputError
            ]}
            value={digit}
            onChangeText={(value) => handleOtpChange(value, index)}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace') {
                handleOtpBackspace(index);
              }
            }}
            keyboardType="number-pad"
            maxLength={1}
            editable={!isLoading}
          />
        ))}
      </View>

      <View style={styles.otpFooter}>
        <Text style={styles.countdownText}>
          {countdown > 0 
            ? `Resend code in ${Math.floor(countdown / 60)}:${(countdown % 60).toString().padStart(2, '0')}`
            : "Didn't receive the code?"
          }
        </Text>
        
        <TouchableOpacity
          onPress={handleResendOtp}
          disabled={countdown > 0 || isLoading}
        >
          <Text style={[
            styles.resendText,
            (countdown > 0 || isLoading) && styles.resendTextDisabled
          ]}>
            Resend Code
          </Text>
        </TouchableOpacity>
      </View>

      {attemptsRemaining < maxAttempts && (
        <View style={styles.attemptsWarning}>
          <Text style={styles.attemptsText}>
            {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.primaryButton,
          isLoading && styles.buttonDisabled
        ]}
        onPress={handleOtpVerify}
        disabled={isLoading || otpCode.some(digit => !digit)}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Verify Code</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  /**
   * 🏗️ Render Password Reset Step
   */
  const renderPasswordReset = () => {
    const passwordValidation = validatePasswordStrength(newPassword);
    
    return (
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
          Choose a strong password to secure your account
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter new password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoComplete="password-new"
            editable={!isLoading}
          />
          
          {/* 🏗️ Password Strength Indicator */}
          {newPassword.length > 0 && (
            <View style={styles.passwordStrength}>
              <View style={[
                styles.strengthBar,
                { width: `${passwordValidation.score}%` },
                passwordValidation.score < 50 && styles.strengthWeak,
                passwordValidation.score >= 50 && passwordValidation.score < 80 && styles.strengthMedium,
                passwordValidation.score >= 80 && styles.strengthStrong
              ]} />
              <Text style={styles.strengthText}>
                {passwordValidation.score < 50 ? 'Weak' : 
                 passwordValidation.score < 80 ? 'Medium' : 'Strong'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={[
              styles.textInput,
              confirmPassword && newPassword !== confirmPassword && styles.inputError
            ]}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="password-new"
            editable={!isLoading}
          />
          
          {confirmPassword && newPassword !== confirmPassword && (
            <Text style={styles.errorText}>Passwords do not match</Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            isLoading && styles.buttonDisabled
          ]}
          onPress={handlePasswordReset}
          disabled={isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Reset Password</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  /**
   * 🏗️ Render Success Step
   */
  const renderSuccess = () => (
    <Animated.View 
      style={[
        styles.stepContainer,
        styles.successContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.successIcon}>
        <Text style={styles.successIconText}>✓</Text>
      </View>
      
      <Text style={styles.successTitle}>Password Reset Successful</Text>
      <Text style={styles.successSubtitle}>
        Your password has been updated successfully. You can now login with your new password.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onBackToLogin}
      >
        <Text style={styles.primaryButtonText}>Back to Login</Text>
      </TouchableOpacity>

      <View style={styles.securityTips}>
        <Text style={styles.securityTipsTitle}>Security Tips:</Text>
        <Text style={styles.securityTipsText}>
          • Use a unique password for Mosa Forge{'\n'}
          • Enable two-factor authentication{'\n'}
          • Regularly update your password{'\n'}
          • Monitor your account activity
        </Text>
      </View>
    </Animated.View>
  );

  // 🏗️ Main Render
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[styles.content, { transform: [{ translateX: shakeAnim }] }]}>
          {/* 🏗️ Progress Indicator */}
          <View style={styles.progressContainer}>
            {Object.values(RECOVERY_STEPS).map((step, index) => (
              <React.Fragment key={step}>
                <View style={[
                  styles.progressStep,
                  currentStep === step && styles.progressStepActive,
                  Object.values(RECOVERY_STEPS).indexOf(currentStep) > index && styles.progressStepCompleted
                ]}>
                  <Text style={styles.progressStepText}>
                    {Object.values(RECOVERY_STEPS).indexOf(currentStep) > index ? '✓' : index + 1}
                  </Text>
                </View>
                {index < Object.values(RECOVERY_STEPS).length - 1 && (
                  <View style={styles.progressLine} />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* 🏗️ Render Current Step */}
          {currentStep === RECOVERY_STEPS.FAYDA_VERIFICATION && renderFaydaVerification()}
          {currentStep === RECOVERY_STEPS.OTP_VERIFICATION && renderOtpVerification()}
          {currentStep === RECOVERY_STEPS.PASSWORD_RESET && renderPasswordReset()}
          {currentStep === RECOVERY_STEPS.SUCCESS && renderSuccess()}
        </Animated.View>
      </ScrollView>

      {/* 🏗️ Security Badge */}
      <View style={styles.securityBadge}>
        <Text style={styles.securityBadgeText}>🔒 Enterprise Security</Text>
      </View>
    </KeyboardAvoidingView>
  );
};

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  progressStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStepActive: {
    backgroundColor: '#667eea',
  },
  progressStepCompleted: {
    backgroundColor: '#4CAF50',
  },
  progressStepText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
  stepContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#f8f9fa',
  },
  otpInputFilled: {
    borderColor: '#667eea',
    backgroundColor: '#ffffff',
  },
  otpInputError: {
    borderColor: '#dc3545',
  },
  otpFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  countdownText: {
    color: '#666',
    fontSize: 14,
  },
  resendText: {
    color: '#667eea',
    fontWeight: '600',
    fontSize: 14,
  },
  resendTextDisabled: {
    color: '#999',
  },
  attemptsWarning: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  attemptsText: {
    color: '#856404',
    textAlign: 'center',
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  secondaryButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  securityTips: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    width: '100%',
  },
  securityTipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  securityTipsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  passwordStrength: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
    marginRight: 8,
    flex: 1,
  },
  strengthWeak: {
    backgroundColor: '#dc3545',
  },
  strengthMedium: {
    backgroundColor: '#ffc107',
  },
  strengthStrong: {
    backgroundColor: '#28a745',
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 4,
  },
  securityAlert: {
    backgroundColor: '#f8d7da',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  securityAlertText: {
    color: '#721c24',
    fontSize: 14,
    fontWeight: '500',
  },
  securityBadge: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  securityBadgeText: {
    color: '#667eea',
    fontSize: 12,
    fontWeight: '600',
  },
});

// 🏗️ Enterprise Export
export default RecoveryFlow;
export { RECOVERY_STEPS, OTP_DELIVERY_METHODS, SECURITY_LEVELS };