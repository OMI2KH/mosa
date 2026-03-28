// app/(auth)/otp-verification.js

/**
 * 🔐 ENTERPRISE OTP VERIFICATION SYSTEM
 * Secure OTP validation with Fayda ID integration, fraud detection, and real-time monitoring
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/auth-context';
import { useSecurity } from '../../hooks/use-security';
import { Logger } from '../../utils/logger';
import { OTPManager } from '../../services/otp-manager';
import { FaydaValidator } from '../../services/fayda-validator';

const OTP_VERIFICATION = {
  MAX_ATTEMPTS: 3,
  OTP_LENGTH: 6,
  RESEND_COOLDOWN: 60, // seconds
  VERIFICATION_TIMEOUT: 300, // seconds
  BLOCK_DURATION: 900 // 15 minutes after max attempts
};

export default function OTPVerification() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { verifyOTP, resendOTP, updateUserSession } = useAuth();
  const { checkSuspiciousActivity, logSecurityEvent } = useSecurity();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const [timeLeft, setTimeLeft] = useState(OTP_VERIFICATION.VERIFICATION_TIMEOUT);
  const [securityCheck, setSecurityCheck] = useState(null);

  const inputRefs = useRef([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const logger = new Logger('OTPVerification');

  // Extract parameters with validation
  const faydaId = params.faydaId || '';
  const phoneNumber = params.phoneNumber || '';
  const verificationType = params.type || 'registration';
  const sessionId = params.sessionId || '';

  /**
   * 🚀 INITIALIZE COMPONENT
   */
  useEffect(() => {
    initializeVerification();
    startTimer();
    performSecurityCheck();

    return () => {
      // Cleanup
      clearTimers();
    };
  }, []);

  /**
   * ⏰ START VERIFICATION TIMER
   */
  const startTimer = useCallback(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleVerificationTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /**
   * 🛡️ PERFORM SECURITY CHECK
   */
  const performSecurityCheck = async () => {
    try {
      const securityResult = await checkSuspiciousActivity({
        faydaId,
        phoneNumber,
        type: 'otp_verification',
        ipAddress: params.ipAddress,
        userAgent: params.userAgent
      });

      setSecurityCheck(securityResult);

      if (securityResult.riskLevel === 'HIGH') {
        logger.warn('High risk OTP verification attempt', {
          faydaId,
          phoneNumber,
          riskScore: securityResult.riskScore
        });
        
        await logSecurityEvent({
          type: 'HIGH_RISK_OTP_ATTEMPT',
          faydaId,
          phoneNumber,
          riskScore: securityResult.riskScore,
          metadata: securityResult
        });
      }
    } catch (error) {
      logger.error('Security check failed', error);
    }
  };

  /**
   * 🚀 INITIALIZE VERIFICATION PROCESS
   */
  const initializeVerification = async () => {
    try {
      // Validate required parameters
      if (!faydaId || !phoneNumber) {
        logger.error('Missing required parameters', { faydaId, phoneNumber });
        Alert.alert(
          'Validation Error',
          'Required information is missing. Please restart the registration process.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      // Log verification start
      await logSecurityEvent({
        type: 'OTP_VERIFICATION_STARTED',
        faydaId,
        phoneNumber,
        verificationType
      });

      logger.info('OTP verification initialized', {
        faydaId,
        phoneNumber: maskPhoneNumber(phoneNumber),
        verificationType
      });

    } catch (error) {
      logger.error('Verification initialization failed', error);
      Alert.alert('Error', 'Failed to initialize verification. Please try again.');
    }
  };

  /**
   * 🔢 HANDLE OTP INPUT CHANGE
   */
  const handleOtpChange = (value, index) => {
    if (!/^\d?$/.test(value)) return; // Only allow numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < OTP_VERIFICATION.OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (newOtp.every(digit => digit !== '') && index === OTP_VERIFICATION.OTP_LENGTH - 1) {
      handleVerification();
    }
  };

  /**
   * ⌨️ HANDLE KEY PRESS
   */
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  /**
   * 📱 HANDLE PASTE
   */
  const handlePaste = async (text) => {
    const digits = text.replace(/[^\d]/g, '').slice(0, OTP_VERIFICATION.OTP_LENGTH);
    
    if (digits.length === OTP_VERIFICATION.OTP_LENGTH) {
      const newOtp = digits.split('');
      setOtp(newOtp);
      
      // Focus last input
      inputRefs.current[OTP_VERIFICATION.OTP_LENGTH - 1]?.focus();
    }
  };

  /**
   * ✅ HANDLE VERIFICATION
   */
  const handleVerification = async () => {
    if (loading) return;

    const otpCode = otp.join('');
    
    // Validate OTP format
    if (otpCode.length !== OTP_VERIFICATION.OTP_LENGTH) {
      showErrorAnimation();
      Alert.alert('Invalid OTP', 'Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    
    try {
      // Check if blocked due to too many attempts
      if (attempts >= OTP_VERIFICATION.MAX_ATTEMPTS) {
        await handleMaxAttemptsReached();
        return;
      }

      // Perform verification
      const verificationResult = await verifyOTP({
        faydaId,
        phoneNumber,
        otp: otpCode,
        sessionId,
        verificationType,
        deviceInfo: {
          platform: Platform.OS,
          userAgent: params.userAgent,
          ipAddress: params.ipAddress
        }
      });

      if (verificationResult.success) {
        await handleVerificationSuccess(verificationResult);
      } else {
        await handleVerificationFailure(verificationResult);
      }

    } catch (error) {
      await handleVerificationError(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🎉 HANDLE VERIFICATION SUCCESS
   */
  const handleVerificationSuccess = async (result) => {
    setVerificationStatus('success');
    
    // Log successful verification
    await logSecurityEvent({
      type: 'OTP_VERIFICATION_SUCCESS',
      faydaId,
      phoneNumber,
      verificationType,
      metadata: {
        attempts,
        sessionId
      }
    });

    logger.info('OTP verification successful', {
      faydaId,
      phoneNumber: maskPhoneNumber(phoneNumber),
      attempts
    });

    // Update user session
    await updateUserSession(result.user);

    // Show success animation
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to next screen based on verification type
    setTimeout(() => {
      navigateAfterVerification(result.user);
    }, 1000);
  };

  /**
   * ❌ HANDLE VERIFICATION FAILURE
   */
  const handleVerificationFailure = async (result) => {
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    // Show error animation
    showErrorAnimation();

    // Log failed attempt
    await logSecurityEvent({
      type: 'OTP_VERIFICATION_FAILED',
      faydaId,
      phoneNumber,
      verificationType,
      metadata: {
        attempt: newAttempts,
        reason: result.reason,
        remainingAttempts: OTP_VERIFICATION.MAX_ATTEMPTS - newAttempts
      }
    });

    logger.warn('OTP verification failed', {
      faydaId,
      phoneNumber: maskPhoneNumber(phoneNumber),
      attempt: newAttempts,
      reason: result.reason
    });

    // Show appropriate error message
    if (newAttempts >= OTP_VERIFICATION.MAX_ATTEMPTS) {
      await handleMaxAttemptsReached();
    } else {
      const remaining = OTP_VERIFICATION.MAX_ATTEMPTS - newAttempts;
      Alert.alert(
        'Invalid OTP',
        `The OTP you entered is incorrect. You have ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`,
        [{ text: 'Try Again' }]
      );
    }

    // Clear OTP for retry
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  /**
   * 🚫 HANDLE MAX ATTEMPTS REACHED
   */
  const handleMaxAttemptsReached = async () => {
    setVerificationStatus('blocked');
    
    await logSecurityEvent({
      type: 'OTP_VERIFICATION_BLOCKED',
      faydaId,
      phoneNumber,
      verificationType,
      metadata: {
        attempts: OTP_VERIFICATION.MAX_ATTEMPTS,
        blockDuration: OTP_VERIFICATION.BLOCK_DURATION
      }
    });

    logger.warn('OTP verification blocked - max attempts reached', {
      faydaId,
      phoneNumber: maskPhoneNumber(phoneNumber),
      attempts: OTP_VERIFICATION.MAX_ATTEMPTS
    });

    Alert.alert(
      'Too Many Attempts',
      `You have exceeded the maximum number of OTP attempts. Please try again after ${OTP_VERIFICATION.BLOCK_DURATION / 60} minutes.`,
      [
        {
          text: 'OK',
          onPress: () => router.replace('/(auth)/fayda-registration')
        }
      ]
    );
  };

  /**
   * ⚠️ HANDLE VERIFICATION ERROR
   */
  const handleVerificationError = async (error) => {
    logger.error('OTP verification error', error);
    
    await logSecurityEvent({
      type: 'OTP_VERIFICATION_ERROR',
      faydaId,
      phoneNumber,
      verificationType,
      metadata: { error: error.message }
    });

    Alert.alert(
      'Verification Error',
      'An error occurred during verification. Please try again.',
      [{ text: 'OK' }]
    );
  };

  /**
   * ⏰ HANDLE VERIFICATION TIMEOUT
   */
  const handleVerificationTimeout = async () => {
    setVerificationStatus('timeout');
    
    await logSecurityEvent({
      type: 'OTP_VERIFICATION_TIMEOUT',
      faydaId,
      phoneNumber,
      verificationType
    });

    logger.warn('OTP verification timeout', {
      faydaId,
      phoneNumber: maskPhoneNumber(phoneNumber)
    });

    Alert.alert(
      'Verification Timeout',
      'The OTP verification period has expired. Please request a new OTP.',
      [
        {
          text: 'Request New OTP',
          onPress: handleResendOTP
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => router.back()
        }
      ]
    );
  };

  /**
   * 🔄 HANDLE RESEND OTP
   */
  const handleResendOTP = async () => {
    if (resendLoading || cooldown > 0) return;

    setResendLoading(true);

    try {
      const resendResult = await resendOTP({
        faydaId,
        phoneNumber,
        verificationType,
        sessionId
      });

      if (resendResult.success) {
        // Start cooldown timer
        setCooldown(OTP_VERIFICATION.RESEND_COOLDOWN);
        startCooldownTimer();

        // Reset OTP fields
        setOtp(['', '', '', '', '', '']);
        setAttempts(0);
        setTimeLeft(OTP_VERIFICATION.VERIFICATION_TIMEOUT);
        setVerificationStatus('pending');
        
        inputRefs.current[0]?.focus();

        // Log resend event
        await logSecurityEvent({
          type: 'OTP_RESEND_REQUESTED',
          faydaId,
          phoneNumber,
          verificationType
        });

        Alert.alert('OTP Sent', 'A new verification code has been sent to your phone.');
        
        logger.info('OTP resent successfully', {
          faydaId,
          phoneNumber: maskPhoneNumber(phoneNumber)
        });

      } else {
        throw new Error(resendResult.message || 'Failed to resend OTP');
      }

    } catch (error) {
      logger.error('OTP resend failed', error);
      
      await logSecurityEvent({
        type: 'OTP_RESEND_FAILED',
        faydaId,
        phoneNumber,
        verificationType,
        metadata: { error: error.message }
      });

      Alert.alert('Error', 'Failed to send new OTP. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  /**
   * ⏱️ START COOLDOWN TIMER
   */
  const startCooldownTimer = () => {
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /**
   * 🎬 SHOW ERROR ANIMATION
   */
  const showErrorAnimation = () => {
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
  };

  /**
   * 🧭 NAVIGATE AFTER VERIFICATION
   */
  const navigateAfterVerification = (userData) => {
    switch (verificationType) {
      case 'registration':
        router.replace({
          pathname: '/(onboarding)/mindset-assessment',
          params: { faydaId, ...userData }
        });
        break;
      
      case 'login':
        router.replace({
          pathname: '/(tabs)/dashboard',
          params: { ...userData }
        });
        break;
      
      case 'password_reset':
        router.replace({
          pathname: '/(auth)/password-recovery',
          params: { faydaId, ...userData }
        });
        break;
      
      default:
        router.replace({
          pathname: '/(tabs)/dashboard',
          params: { ...userData }
        });
    }
  };

  /**
   * 🧹 CLEANUP TIMERS
   */
  const clearTimers = () => {
    // This would clear any intervals if we stored their IDs
  };

  /**
   * 📱 MASK PHONE NUMBER FOR LOGGING
   */
  const maskPhoneNumber = (phone) => {
    if (!phone || phone.length < 4) return '***';
    return `${phone.slice(0, 2)}****${phone.slice(-2)}`;
  };

  /**
   * 🕒 FORMAT TIME
   */
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render cooldown button
  const renderResendButton = () => {
    if (cooldown > 0) {
      return (
        <Text style={styles.cooldownText}>
          Resend OTP in {formatTime(cooldown)}
        </Text>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.resendButton, resendLoading && styles.buttonDisabled]}
        onPress={handleResendOTP}
        disabled={resendLoading}
      >
        {resendLoading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.resendButtonText}>Resend OTP</Text>
        )}
      </TouchableOpacity>
    );
  };

  // Render security warning if high risk
  const renderSecurityWarning = () => {
    if (securityCheck?.riskLevel === 'HIGH') {
      return (
        <View style={styles.securityWarning}>
          <Text style={styles.securityWarningText}>
            🔒 Unusual activity detected. Please ensure you're using a secure connection.
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Verify Your Identity</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to {maskPhoneNumber(phoneNumber)}
          </Text>
        </View>

        {/* Security Warning */}
        {renderSecurityWarning()}

        {/* OTP Input Fields */}
        <Animated.View 
          style={[
            styles.otpContainer,
            { transform: [{ translateX: shakeAnim }] }
          ]}
        >
          <Text style={styles.otpLabel}>Verification Code</Text>
          
          <View style={styles.otpInputsContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => inputRefs.current[index] = ref}
                style={[
                  styles.otpInput,
                  digit && styles.otpInputFilled,
                  verificationStatus === 'success' && styles.otpInputSuccess,
                  attempts > 0 && styles.otpInputError
                ]}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                onPaste={handlePaste}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!loading && verificationStatus === 'pending'}
                accessibilityLabel={`OTP digit ${index + 1}`}
              />
            ))}
          </View>

          {/* Timer */}
          <Text style={styles.timerText}>
            Code expires in: {formatTime(timeLeft)}
          </Text>

          {/* Attempts Counter */}
          {attempts > 0 && (
            <Text style={styles.attemptsText}>
              Attempts: {attempts}/{OTP_VERIFICATION.MAX_ATTEMPTS}
            </Text>
          )}
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (loading || otp.some(digit => !digit)) && styles.buttonDisabled
            ]}
            onPress={handleVerification}
            disabled={loading || otp.some(digit => !digit)}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyButtonText}>
                {verificationStatus === 'success' ? 'Verified ✓' : 'Verify Code'}
              </Text>
            )}
          </TouchableOpacity>

          {renderResendButton()}
        </View>

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Text style={styles.securityInfoText}>
            🔐 Your verification code is secure and encrypted
          </Text>
          <Text style={styles.securityInfoText}>
            ⚠️ Never share this code with anyone
          </Text>
        </View>

        {/* Debug Info (Development only) */}
        {__DEV__ && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>Session: {sessionId}</Text>
            <Text style={styles.debugText}>Fayda: {faydaId}</Text>
            <Text style={styles.debugText}>Type: {verificationType}</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
  },
  securityWarning: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    marginBottom: 20,
  },
  securityWarningText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '500',
  },
  otpContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  otpLabel: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 16,
    fontWeight: '600',
  },
  otpInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
  },
  otpInput: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: '#E1E5E9',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  otpInputFilled: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  otpInputSuccess: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4',
  },
  otpInputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF0F0',
  },
  timerText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
    marginBottom: 8,
  },
  attemptsText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
  },
  actionsContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  verifyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  resendButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cooldownText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  securityInfo: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  securityInfoText: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 8,
    textAlign: 'center',
  },
  debugInfo: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#F1F3F4',
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#5F6368',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});