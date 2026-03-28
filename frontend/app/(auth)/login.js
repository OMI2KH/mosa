/**
 * 🎯 MOSA FORGE: Enterprise Login Component
 * 
 * @file login.js
 * @description Enterprise-grade login with Fayda ID, biometric auth, and advanced security
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Fayda ID government verification
 * - Biometric authentication
 * - AI duplicate detection
 * - Advanced security monitoring
 * - Quality guarantee integration
 * - Real-time validation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  InteractionManager,
  AppState,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as LocalAuthentication from 'expo-local-authentication';
import { BlurView } from 'expo-blur';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// 🏗️ Enterprise Components
import EnterpriseInput from '../../components/auth/EnterpriseInput';
import SecurityBadge from '../../components/auth/SecurityBadge';
import BiometricToggle from '../../components/auth/BiometricToggle';
import LoadingOverlay from '../../components/auth/LoadingOverlay';
import SecurityChallenge from '../../components/auth/SecurityChallenge';
import NetworkStatusIndicator from '../../components/auth/NetworkStatusIndicator';

// 🏗️ Enterprise Hooks
import { useAuth } from '../../contexts/auth-context';
import { useFaydaValidation } from '../../hooks/use-fayda-validation';
import { useBiometricAuth } from '../../hooks/use-biometric-auth';
import { useSecurityMonitor } from '../../hooks/use-security-monitor';
import { usePerformance } from '../../hooks/use-performance';

// 🏗️ Enterprise Services
import { authService } from '../../services/auth-service';
import { validationService } from '../../services/validation-service';
import { securityService } from '../../services/security-service';

// 🏗️ Enterprise Constants
const LOGIN_CONFIG = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
  SESSION_TIMEOUT: 15 * 60 * 1000, // 15 minutes
  OTP_TIMEOUT: 120, // 2 minutes
  BIOMETRIC_TIMEOUT: 45, // 45 seconds
};

const SECURITY_LEVELS = {
  LOW: { level: 'low', color: '#22c55e', description: 'Standard Security' },
  MEDIUM: { level: 'medium', color: '#eab308', description: 'Enhanced Security' },
  HIGH: { level: 'high', color: '#f97316', description: 'High Security' },
  CRITICAL: { level: 'critical', color: '#ef4444', description: 'Maximum Security' },
};

/**
 * 🏗️ Enterprise Login Component
 * @component LoginScreen
 * @description Production-ready login with Fayda ID and advanced security
 */
function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // 🏗️ Enterprise Refs
  const faydaInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const securityChallengeRef = useRef(null);
  const loginAttemptRef = useRef(0);
  const lastAttemptRef = useRef(null);
  const sessionTimerRef = useRef(null);

  // 🏗️ Enterprise State Management
  const [formData, setFormData] = useState({
    faydaId: '',
    password: '',
    rememberMe: false,
    enableBiometric: false,
  });
  
  const [validationState, setValidationState] = useState({
    faydaId: { isValid: false, isVerified: false, message: '' },
    password: { isValid: false, isVerified: false, message: '' },
    overall: { isValid: false, message: '' },
  });

  const [securityState, setSecurityState] = useState({
    level: SECURITY_LEVELS.HIGH,
    isLocked: false,
    lockoutUntil: null,
    remainingAttempts: LOGIN_CONFIG.MAX_ATTEMPTS,
    suspiciousActivity: false,
    challengeRequired: false,
  });

  const [uiState, setUiState] = useState({
    isLoading: false,
    isSubmitting: false,
    showBiometricPrompt: false,
    showSecurityChallenge: false,
    keyboardVisible: false,
    networkStatus: 'online',
  });

  // 🏗️ Enterprise Animations
  const shakeAnimation = useSharedValue(0);
  const securityPulse = useSharedValue(1);

  // 🏗️ Enterprise Hooks
  const auth = useAuth();
  const faydaValidation = useFaydaValidation();
  const biometricAuth = useBiometricAuth();
  const securityMonitor = useSecurityMonitor();
  const performance = usePerformance();

  /**
   * 🏗️ Component Initialization
   */
  useEffect(() => {
    const initializeEnterpriseLogin = async () => {
      try {
        performance.startTrace('login_initialization');
        
        // 🏗️ Initialize security monitoring
        await securityMonitor.initialize();
        
        // 🏗️ Check existing session and biometric status
        await checkExistingSession();
        
        // 🏗️ Setup security listeners
        setupSecurityListeners();
        
        // 🏗️ Check device security status
        await checkDeviceSecurity();
        
        // 🏗️ Handle deep links or redirects
        handleInitialParams();
        
        performance.stopTrace('login_initialization');
        
      } catch (error) {
        handleInitializationError(error);
      }
    };

    initializeEnterpriseLogin();

    return () => {
      // 🏗️ Cleanup security monitoring
      securityMonitor.cleanup();
      clearTimeout(sessionTimerRef.current);
    };
  }, []);

  /**
   * 🏗️ Check Existing Session
   */
  const checkExistingSession = useCallback(async () => {
    try {
      const sessionState = await authService.checkExistingSession();
      
      if (sessionState.isValid && sessionState.user) {
        // 🏗️ Check if biometric is enabled and available
        if (sessionState.biometricEnabled && await biometricAuth.isAvailable()) {
          setUiState(prev => ({ ...prev, showBiometricPrompt: true }));
          await handleBiometricAuthentication();
        } else {
          // 🏗️ Redirect to main app if valid session exists
          router.replace('/(tabs)');
        }
      }
    } catch (error) {
      console.warn('Session check failed:', error);
    }
  }, [router, biometricAuth]);

  /**
   * 🏗️ Setup Security Listeners
   */
  const setupSecurityListeners = useCallback(() => {
    const subscriptions = [
      securityMonitor.on('suspicious_activity', handleSuspiciousActivity),
      securityMonitor.on('security_level_change', handleSecurityLevelChange),
      securityMonitor.on('lockout_state_change', handleLockoutStateChange),
      AppState.addEventListener('change', handleAppStateChange),
    ];

    return () => subscriptions.forEach(sub => sub?.remove());
  }, [securityMonitor]);

  /**
   * 🏗️ Check Device Security
   */
  const checkDeviceSecurity = useCallback(async () => {
    try {
      const deviceSecurity = await securityService.checkDeviceSecurity();
      
      setSecurityState(prev => ({
        ...prev,
        level: deviceSecurity.securityLevel,
        challengeRequired: deviceSecurity.requiresChallenge,
      }));

      // 🏗️ Log device security status
      securityMonitor.logEvent('device_security_check', {
        level: deviceSecurity.securityLevel,
        hasBiometric: deviceSecurity.hasBiometric,
        isJailbroken: deviceSecurity.isJailbroken,
      });

    } catch (error) {
      console.error('Device security check failed:', error);
    }
  }, [securityMonitor]);

  /**
   * 🏗️ Handle Initial Parameters
   */
  const handleInitialParams = useCallback(() => {
    if (params.redirectReason) {
      handleRedirectReason(params.redirectReason);
    }
    
    if (params.faydaId) {
      setFormData(prev => ({ ...prev, faydaId: params.faydaId }));
    }
  }, [params]);

  /**
   * 🏗️ Handle Redirect Reasons
   */
  const handleRedirectReason = useCallback((reason) => {
    const reasonHandlers = {
      'session_expired': () => {
        showSecurityAlert('Session Expired', 'Your session has expired for security reasons.');
      },
      'security_concern': () => {
        setSecurityState(prev => ({ ...prev, challengeRequired: true }));
      },
      'password_changed': () => {
        showSecurityAlert('Password Updated', 'Please login with your new password.');
      },
      'account_recovered': () => {
        showSecurityAlert('Account Recovered', 'Your account has been successfully recovered.');
      },
    };

    reasonHandlers[reason]?.();
  }, []);

  /**
   * 🏗️ Handle Form Input Changes
   */
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 🏗️ Real-time validation
    if (field === 'faydaId') {
      validateFaydaId(value);
    } else if (field === 'password') {
      validatePassword(value);
    }
  }, []);

  /**
   * 🏗️ Validate Fayda ID with Government API
   */
  const validateFaydaId = useCallback(async (faydaId) => {
    if (!faydaId) {
      setValidationState(prev => ({
        ...prev,
        faydaId: { isValid: false, isVerified: false, message: '' }
      }));
      return;
    }

    try {
      // 🏗️ Basic format validation
      const formatValid = validationService.validateFaydaFormat(faydaId);
      if (!formatValid) {
        setValidationState(prev => ({
          ...prev,
          faydaId: { 
            isValid: false, 
            isVerified: false, 
            message: 'Invalid Fayda ID format' 
          }
        }));
        return;
      }

      // 🏗️ Real-time government API validation
      const validationResult = await faydaValidation.validate(faydaId);
      
      setValidationState(prev => ({
        ...prev,
        faydaId: {
          isValid: validationResult.isValid,
          isVerified: validationResult.isVerified,
          message: validationResult.message,
        }
      }));

      // 🏗️ Check for duplicate accounts
      if (validationResult.isValid) {
        await checkDuplicateAccount(faydaId);
      }

    } catch (error) {
      console.error('Fayda ID validation failed:', error);
      setValidationState(prev => ({
        ...prev,
        faydaId: {
          isValid: false,
          isVerified: false,
          message: 'Validation service unavailable'
        }
      }));
    }
  }, [faydaValidation]);

  /**
   * 🏗️ Check for Duplicate Accounts
   */
  const checkDuplicateAccount = useCallback(async (faydaId) => {
    try {
      const duplicateCheck = await authService.checkDuplicateAccount(faydaId);
      
      if (duplicateCheck.exists) {
        setValidationState(prev => ({
          ...prev,
          faydaId: {
            isValid: false,
            isVerified: false,
            message: 'Account with this Fayda ID already exists'
          }
        }));
        
        // 🏗️ Trigger security event for duplicate detection
        securityMonitor.logEvent('duplicate_account_detected', {
          faydaId,
          existingUserId: duplicateCheck.userId,
        });
      }
    } catch (error) {
      console.error('Duplicate check failed:', error);
    }
  }, [securityMonitor]);

  /**
   * 🏗️ Validate Password Strength
   */
  const validatePassword = useCallback((password) => {
    const validation = validationService.validatePassword(password);
    
    setValidationState(prev => ({
      ...prev,
      password: {
        isValid: validation.isValid,
        isVerified: false,
        message: validation.message,
      }
    }));
  }, []);

  /**
   * 🏗️ Handle Login Submission
   */
  const handleLogin = useCallback(async () => {
    // 🏗️ Validate form before submission
    if (!validateForm()) {
      triggerShakeAnimation();
      return;
    }

    // 🏗️ Check security lockout
    if (securityState.isLocked) {
      showLockoutAlert();
      return;
    }

    // 🏗️ Start security monitoring for this attempt
    securityMonitor.startLoginAttempt();

    setUiState(prev => ({ ...prev, isSubmitting: true }));

    try {
      performance.startTrace('login_attempt');

      // 🏗️ Execute login with security context
      const loginResult = await executeSecureLogin();

      if (loginResult.success) {
        await handleLoginSuccess(loginResult);
      } else {
        await handleLoginFailure(loginResult);
      }

      performance.stopTrace('login_attempt');

    } catch (error) {
      await handleLoginError(error);
    } finally {
      setUiState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [formData, securityState, securityMonitor, performance]);

  /**
   * 🏗️ Execute Secure Login Process
   */
  const executeSecureLogin = useCallback(async () => {
    const loginContext = {
      faydaId: formData.faydaId,
      password: formData.password,
      deviceInfo: await securityService.getDeviceInfo(),
      securityLevel: securityState.level,
      timestamp: new Date().toISOString(),
      attemptNumber: loginAttemptRef.current + 1,
    };

    // 🏗️ Security challenge if required
    if (securityState.challengeRequired) {
      const challengeResult = await securityChallengeRef.current?.execute();
      if (!challengeResult?.success) {
        throw new Error('Security challenge failed');
      }
    }

    // 🏗️ Execute login with enterprise service
    return await authService.enterpriseLogin(loginContext);
  }, [formData, securityState]);

  /**
   * 🏗️ Handle Successful Login
   */
  const handleLoginSuccess = useCallback(async (loginResult) => {
    // 🏗️ Reset security state
    loginAttemptRef.current = 0;
    setSecurityState(prev => ({
      ...prev,
      isLocked: false,
      lockoutUntil: null,
      remainingAttempts: LOGIN_CONFIG.MAX_ATTEMPTS,
    }));

    // 🏗️ Update authentication context
    await auth.setUser(loginResult.user);
    await auth.setTokens(loginResult.tokens);

    // 🏗️ Setup biometric if enabled
    if (formData.enableBiometric && await biometricAuth.isAvailable()) {
      await biometricAuth.enableForUser(loginResult.user.id);
    }

    // 🏗️ Log successful login
    securityMonitor.logEvent('login_success', {
      userId: loginResult.user.id,
      method: 'password',
      securityLevel: securityState.level,
    });

    // 🏗️ Navigate to main app
    InteractionManager.runAfterInteractions(() => {
      router.replace('/(tabs)');
    });

  }, [auth, biometricAuth, securityMonitor, router, formData, securityState]);

  /**
   * 🏗️ Handle Login Failure
   */
  const handleLoginFailure = useCallback(async (loginResult) => {
    // 🏗️ Increment attempt counter
    loginAttemptRef.current++;
    
    const remainingAttempts = LOGIN_CONFIG.MAX_ATTEMPTS - loginAttemptRef.current;
    
    setSecurityState(prev => ({
      ...prev,
      remainingAttempts,
      suspiciousActivity: loginResult.suspiciousActivity,
    }));

    // 🏗️ Check for lockout
    if (loginAttemptRef.current >= LOGIN_CONFIG.MAX_ATTEMPTS) {
      await handleAccountLockout();
      return;
    }

    // 🏗️ Show appropriate error message
    showLoginError(loginResult.error, remainingAttempts);

    // 🏗️ Log failed attempt
    securityMonitor.logEvent('login_failed', {
      faydaId: formData.faydaId,
      attempt: loginAttemptRef.current,
      reason: loginResult.error,
      remainingAttempts,
    });

    // 🏗️ Trigger security measures for suspicious activity
    if (loginResult.suspiciousActivity) {
      setSecurityState(prev => ({ ...prev, challengeRequired: true }));
    }

  }, [formData, securityMonitor]);

  /**
   * 🏗️ Handle Account Lockout
   */
  const handleAccountLockout = useCallback(async () => {
    const lockoutUntil = Date.now() + LOGIN_CONFIG.LOCKOUT_DURATION;
    
    setSecurityState(prev => ({
      ...prev,
      isLocked: true,
      lockoutUntil,
      remainingAttempts: 0,
    }));

    // 🏗️ Notify security system
    await securityService.lockAccount(formData.faydaId, lockoutUntil);
    
    // 🏗️ Log lockout event
    securityMonitor.logEvent('account_locked', {
      faydaId: formData.faydaId,
      lockoutUntil,
      reason: 'max_attempts_exceeded',
    });

    showLockoutAlert(lockoutUntil);
  }, [formData, securityMonitor]);

  /**
   * 🏗️ Handle Biometric Authentication
   */
  const handleBiometricAuthentication = useCallback(async () => {
    try {
      setUiState(prev => ({ ...prev, showBiometricPrompt: true }));
      
      const biometricResult = await biometricAuth.authenticate({
        promptMessage: 'Authenticate to access Mosa Forge',
        fallbackEnabled: true,
        timeout: LOGIN_CONFIG.BIOMETRIC_TIMEOUT,
      });

      if (biometricResult.success) {
        // 🏗️ Biometric success - proceed with biometric login
        const loginResult = await authService.biometricLogin({
          biometricToken: biometricResult.token,
          deviceId: await securityService.getDeviceId(),
        });

        if (loginResult.success) {
          await handleLoginSuccess(loginResult);
        } else {
          throw new Error(loginResult.error);
        }
      } else {
        throw new Error(biometricResult.error);
      }

    } catch (error) {
      console.error('Biometric authentication failed:', error);
      showSecurityAlert('Biometric Failed', 'Please use your password to login.');
    } finally {
      setUiState(prev => ({ ...prev, showBiometricPrompt: false }));
    }
  }, [biometricAuth, handleLoginSuccess]);

  /**
   * 🏗️ Validate Complete Form
   */
  const validateForm = useCallback(() => {
    const isFaydaValid = validationState.faydaId.isValid;
    const isPasswordValid = validationState.password.isValid && formData.password.length >= 8;
    const isOverallValid = isFaydaValid && isPasswordValid;

    setValidationState(prev => ({
      ...prev,
      overall: {
        isValid: isOverallValid,
        message: isOverallValid ? '' : 'Please check your credentials'
      }
    }));

    return isOverallValid;
  }, [validationState, formData]);

  /**
   * 🏗️ Trigger Shake Animation for Invalid Form
   */
  const triggerShakeAnimation = useCallback(() => {
    shakeAnimation.value = withSequence(
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, [shakeAnimation]);

  /**
   * 🏗️ Security Event Handlers
   */
  const handleSuspiciousActivity = useCallback((event) => {
    setSecurityState(prev => ({ 
      ...prev, 
      suspiciousActivity: true,
      challengeRequired: true,
    }));
    
    showSecurityAlert('Security Alert', 'Additional verification required for your security.');
  }, []);

  const handleSecurityLevelChange = useCallback((newLevel) => {
    setSecurityState(prev => ({ ...prev, level: newLevel }));
    securityPulse.value = withSpring(1.1, { damping: 2 });
  }, [securityPulse]);

  const handleLockoutStateChange = useCallback((lockoutState) => {
    setSecurityState(prev => ({
      ...prev,
      isLocked: lockoutState.isLocked,
      lockoutUntil: lockoutState.until,
    }));
  }, []);

  const handleAppStateChange = useCallback((nextAppState) => {
    if (nextAppState === 'background') {
      securityMonitor.logEvent('app_backgrounded', {
        screen: 'login',
        timestamp: new Date().toISOString(),
      });
    }
  }, [securityMonitor]);

  /**
   * 🏗️ UI Helper Functions
   */
  const showLoginError = useCallback((error, remainingAttempts) => {
    const errorMessages = {
      'invalid_credentials': `Invalid Fayda ID or password. ${remainingAttempts} attempts remaining.`,
      'account_locked': 'Your account has been locked due to multiple failed attempts.',
      'device_not_trusted': 'This device is not trusted. Additional verification required.',
      'network_error': 'Network connection issue. Please check your internet.',
      'service_unavailable': 'Authentication service is temporarily unavailable.',
    };

    Alert.alert(
      'Login Failed',
      errorMessages[error] || 'An unexpected error occurred. Please try again.',
      [{ text: 'OK', style: 'default' }]
    );
  }, []);

  const showLockoutAlert = useCallback((lockoutUntil = null) => {
    const message = lockoutUntil 
      ? `Account locked until ${new Date(lockoutUntil).toLocaleTimeString()}`
      : 'Your account has been locked for security reasons.';

    Alert.alert(
      'Account Locked',
      message,
      [
        { text: 'Contact Support', onPress: () => router.push('/support') },
        { text: 'OK', style: 'cancel' }
      ]
    );
  }, [router]);

  const showSecurityAlert = useCallback((title, message) => {
    Alert.alert(title, message, [{ text: 'OK', style: 'default' }]);
  }, []);

  const handleInitializationError = useCallback((error) => {
    console.error('Login initialization failed:', error);
    securityMonitor.logEvent('initialization_error', {
      error: error.message,
      component: 'login',
    });
  }, [securityMonitor]);

  const handleLoginError = useCallback(async (error) => {
    console.error('Login process error:', error);
    
    securityMonitor.logEvent('login_process_error', {
      error: error.message,
      faydaId: formData.faydaId,
      timestamp: new Date().toISOString(),
    });

    Alert.alert(
      'System Error',
      'Unable to process login request. Please try again.',
      [{ text: 'OK', style: 'default' }]
    );
  }, [formData, securityMonitor]);

  /**
   * 🏗️ Animated Styles
   */
  const animatedShakeStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shakeAnimation.value }],
    };
  });

  const securityBadgeStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: securityPulse.value }],
    };
  });

  // 🏗️ Render Enterprise Login Interface
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      
      {/* 🏗️ Security Background */}
      <BlurView intensity={20} style={StyleSheet.absoluteFill} />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 🏗️ Network Status */}
        <NetworkStatusIndicator />

        <Animated.View 
          style={[styles.content, animatedShakeStyle]}
          entering={FadeIn.duration(600)}
        >
          {/* 🏗️ Security Badge */}
          <Animated.View style={securityBadgeStyle}>
            <SecurityBadge 
              level={securityState.level}
              onPress={() => router.push('/security-info')}
            />
          </Animated.View>

          {/* 🏗️ Header */}
          <Animated.Text 
            style={styles.header}
            entering={FadeInUp.duration(800)}
          >
            Welcome to Mosa Forge
          </Animated.Text>

          <Animated.Text 
            style={styles.subtitle}
            entering={FadeInUp.duration(800).delay(100)}
          >
            Enter your Fayda ID to continue
          </Animated.Text>

          {/* 🏗️ Login Form */}
          <Animated.View 
            style={styles.form}
            entering={FadeInDown.duration(800).delay(200)}
          >
            {/* Fayda ID Input */}
            <EnterpriseInput
              ref={faydaInputRef}
              label="Fayda ID"
              placeholder="Enter your government Fayda ID"
              value={formData.faydaId}
              onChangeText={(value) => handleInputChange('faydaId', value)}
              validationState={validationState.faydaId}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              icon="id-card"
            />

            {/* Password Input */}
            <EnterpriseInput
              ref={passwordInputRef}
              label="Password"
              placeholder="Enter your password"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              validationState={validationState.password}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              icon="lock"
            />

            {/* 🏗️ Security Options */}
            <View style={styles.securityOptions}>
              <BiometricToggle
                value={formData.enableBiometric}
                onValueChange={(value) => handleInputChange('enableBiometric', value)}
                available={biometricAuth.isAvailable()}
              />
            </View>

            {/* 🏗️ Login Button */}
            <Animated.View entering={FadeInDown.duration(800).delay(400)}>
              <EnterpriseButton
                title="Login to Mosa Forge"
                onPress={handleLogin}
                disabled={!validationState.overall.isValid || uiState.isSubmitting}
                loading={uiState.isSubmitting}
                variant="primary"
                size="large"
              />
            </Animated.View>

            {/* 🏗️ Alternative Options */}
            <View style={styles.alternativeOptions}>
              <EnterpriseButton
                title="Use Biometric Login"
                onPress={handleBiometricAuthentication}
                variant="secondary"
                size="medium"
                disabled={!biometricAuth.isAvailable()}
                icon="fingerprint"
              />

              <EnterpriseButton
                title="Trouble Logging In?"
                onPress={() => router.push('/password-recovery')}
                variant="tertiary"
                size="small"
              />
            </View>
          </Animated.View>
        </Animated.View>
      </ScrollView>

      {/* 🏗️ Security Challenge Modal */}
      <SecurityChallenge
        ref={securityChallengeRef}
        visible={securityState.challengeRequired}
        onSuccess={() => setSecurityState(prev => ({ ...prev, challengeRequired: false }))}
        onFailure={() => {
          setSecurityState(prev => ({ ...prev, challengeRequired: false }));
          showSecurityAlert('Verification Failed', 'Please try logging in again.');
        }}
      />

      {/* 🏗️ Loading Overlay */}
      <LoadingOverlay
        visible={uiState.isLoading || uiState.showBiometricPrompt}
        message={
          uiState.showBiometricPrompt 
            ? 'Waiting for biometric authentication...' 
            : 'Securing your session...'
        }
        type={uiState.showBiometricPrompt ? 'biometric' : 'general'}
      />

      {/* 🏗️ Security Overlay for Lockout */}
      {securityState.isLocked && (
        <SecurityOverlay
          type="lockout"
          lockoutUntil={securityState.lockoutUntil}
          onContactSupport={() => router.push('/support')}
        />
      )}
    </KeyboardAvoidingView>
  );
}

/**
 * 🏗️ Enterprise Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    gap: 20,
  },
  securityOptions: {
    marginBottom: 10,
  },
  alternativeOptions: {
    gap: 12,
    marginTop: 20,
  },
});

// 🏗️ Performance Optimization
export default React.memo(LoginScreen);