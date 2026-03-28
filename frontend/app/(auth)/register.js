// app/(auth)/register.js

/**
 * 🎯 ENTERPRISE USER REGISTRATION SYSTEM
 * Secure, multi-step registration with Fayda ID verification, OTP authentication, and AI duplicate prevention
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
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  BackHandler
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/auth-context';
import { useSecurity } from '../../hooks/use-security';
import { Logger } from '../../utils/logger';
import { SecureStorage } from '../../utils/secure-storage';
import { NetworkMonitor } from '../../utils/network-monitor';
import { DuplicateDetector } from '../../utils/duplicate-detector';

const logger = new Logger('UserRegistration');
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Enterprise registration configuration
const ENTERPRISE_CONFIG = {
  STEPS: {
    FAYDA_VERIFICATION: 1,
    OTP_VERIFICATION: 2,
    PERSONAL_DETAILS: 3,
    ACCOUNT_SETUP: 4,
    SUCCESS: 5
  },
  SECURITY: {
    MAX_OTP_ATTEMPTS: 3,
    OTP_EXPIRY_MINUTES: 10,
    LOCKOUT_DURATION: 15,
    PASSWORD_MIN_LENGTH: 8,
    SESSION_TIMEOUT: 300000 // 5 minutes
  },
  VALIDATION: {
    FAYDA_ID_PATTERN: /^[A-Z0-9]{10,15}$/,
    ETHIOPIAN_PHONE_PATTERN: /^(?:\+251|0)(9[0-9]{8})$/,
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    NAME_PATTERN: /^[A-Za-z\s]{2,50}$/
  }
};

export default function EnterpriseRegistration() {
  const router = useRouter();
  const { 
    registerUser, 
    verifyRegistrationOTP, 
    checkFaydaAvailability,
    completeRegistration,
    clearRegistrationSession
  } = useAuth();
  
  const { 
    validateFaydaId, 
    checkRateLimit, 
    logSecurityEvent,
    encryptSensitiveData 
  } = useSecurity();
  
  const duplicateDetector = new DuplicateDetector();
  const networkMonitor = new NetworkMonitor();

  // Enterprise state management
  const [registrationState, setRegistrationState] = useState({
    currentStep: ENTERPRISE_CONFIG.STEPS.FAYDA_VERIFICATION,
    formData: {
      faydaId: '',
      otp: ['', '', '', '', '', ''],
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      userType: 'student',
      termsAccepted: false,
      marketingConsent: false
    },
    isLoading: false,
    security: {
      otpAttemptsRemaining: ENTERPRISE_CONFIG.SECURITY.MAX_OTP_ATTEMPTS,
      otpExpiry: null,
      lockoutUntil: null,
      sessionStartTime: Date.now()
    },
    validation: {
      passwordStrength: 0,
      faydaValidation: { isValid: false, isAvailable: false, message: '' },
      fieldErrors: {}
    },
    system: {
      registrationToken: '',
      lastActivity: Date.now(),
      networkStatus: 'online'
    }
  });

  // Enterprise refs collection
  const enterpriseRefs = {
    inputs: {
      fayda: useRef(null),
      otp: useRef([]),
      firstName: useRef(null),
      lastName: useRef(null),
      email: useRef(null),
      phone: useRef(null),
      password: useRef(null),
      confirmPassword: useRef(null)
    },
    animations: {
      slide: useRef(new Animated.Value(0)).current,
      shake: useRef(new Animated.Value(0)).current,
      progress: useRef(new Animated.Value(0)).current,
      fade: useRef(new Animated.Value(1)).current
    },
    timers: {
      sessionTimeout: useRef(null),
      otpCountdown: useRef(null),
      inactivity: useRef(null)
    }
  };

  /**
   * 🚀 ENTERPRISE COMPONENT INITIALIZATION
   */
  useEffect(() => {
    initializeEnterpriseRegistration();
    
    // Setup security monitoring
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    return () => {
      cleanupEnterpriseResources();
      backHandler.remove();
    };
  }, []);

  /**
   * 🎯 INITIALIZE ENTERPRISE REGISTRATION
   */
  const initializeEnterpriseRegistration = async () => {
    try {
      await SecureStorage.initialize();
      await monitorNetworkStatus();
      await checkExistingSecurityLockout();
      startSessionMonitoring();
      startInactivityTimer();
      
      logger.info('Enterprise registration system initialized', {
        timestamp: new Date().toISOString(),
        device: Platform.OS,
        version: '2.0.0'
      });
      
      logSecurityEvent('ENTERPRISE_REGISTRATION_INITIATED', {
        sessionId: generateSessionId(),
        userAgent: Platform.OS,
        screenSize: `${SCREEN_WIDTH}x${SCREEN_HEIGHT}`
      });
      
    } catch (error) {
      logger.error('Enterprise registration initialization failed', error);
      showEnterpriseAlert(
        'System Initialization Failed', 
        'Please restart the application and try again.',
        'critical'
      );
    }
  };

  /**
   * 📡 MONITOR NETWORK STATUS
   */
  const monitorNetworkStatus = async () => {
    const isOnline = await networkMonitor.isConnected();
    updateSystemState('networkStatus', isOnline ? 'online' : 'offline');
    
    if (!isOnline) {
      showEnterpriseAlert(
        'Network Unavailable',
        'Please check your internet connection to continue registration.',
        'warning'
      );
    }
  };

  /**
   * 🔒 CHECK EXISTING SECURITY LOCKOUT
   */
  const checkExistingSecurityLockout = async () => {
    try {
      const lockoutData = await SecureStorage.getItem('enterprise_registration_lockout');
      if (lockoutData) {
        const { lockoutUntil, reason } = JSON.parse(lockoutData);
        const lockoutDate = new Date(lockoutUntil);
        
        if (lockoutDate > new Date()) {
          updateSecurityState('lockoutUntil', lockoutDate);
          showEnterpriseLockoutAlert(lockoutDate, reason);
        } else {
          await SecureStorage.removeItem('enterprise_registration_lockout');
        }
      }
    } catch (error) {
      logger.error('Security lockout check failed', error);
    }
  };

  /**
   * ⏰ START SESSION MONITORING
   */
  const startSessionMonitoring = () => {
    enterpriseRefs.timers.sessionTimeout.current = setInterval(() => {
      const sessionAge = Date.now() - registrationState.system.sessionStartTime;
      if (sessionAge > ENTERPRISE_CONFIG.SECURITY.SESSION_TIMEOUT) {
        handleSessionTimeout();
      }
    }, 30000); // Check every 30 seconds
  };

  /**
   * 🕒 START INACTIVITY TIMER
   */
  const startInactivityTimer = () => {
    enterpriseRefs.timers.inactivity.current = setInterval(() => {
      const inactiveTime = Date.now() - registrationState.system.lastActivity;
      if (inactiveTime > 120000) { // 2 minutes
        showInactivityWarning();
      }
    }, 30000);
  };

  /**
   * 🎯 HANDLE FAYDA ID VERIFICATION - ENTERPRISE GRADE
   */
  const handleFaydaVerification = async () => {
    if (isOperationBlocked()) return;

    const faydaId = registrationState.formData.faydaId.trim().toUpperCase();

    // Multi-layer validation
    const validationResult = validateFaydaIdEnterprise(faydaId);
    if (!validationResult.isValid) {
      triggerEnterpriseShakeAnimation();
      showEnterpriseAlert('Validation Error', validationResult.message, 'error');
      return;
    }

    // Advanced rate limiting
    if (await checkEnterpriseRateLimit(`registration:${faydaId}`)) {
      showEnterpriseAlert('Security Limit', 'Too many verification attempts. Please try again later.', 'warning');
      return;
    }

    updateLoadingState(true);

    try {
      // Enterprise network validation
      if (!await validateEnterpriseNetwork()) {
        throw new Error('NETWORK_UNRELIABLE');
      }

      // Phase 1: AI-Powered Duplicate Detection
      const duplicateAnalysis = await duplicateDetector.analyzeRegistrationPattern(faydaId);
      if (duplicateAnalysis.riskLevel === 'HIGH') {
        logSecurityEvent('AI_DUPLICATE_PREVENTION', {
          faydaId: maskSensitiveData(faydaId),
          confidence: duplicateAnalysis.confidence,
          patterns: duplicateAnalysis.riskPatterns,
          timestamp: new Date().toISOString()
        });
        throw new Error('AI_DUPLICATE_PREVENTED');
      }

      // Phase 2: Government API Verification
      const governmentVerification = await validateFaydaId(faydaId);
      if (!governmentVerification.isValid) {
        throw new Error('GOVERNMENT_VERIFICATION_FAILED');
      }

      // Phase 3: Platform Availability Check
      const platformAvailability = await checkFaydaAvailability(faydaId);
      if (!platformAvailability.isAvailable) {
        throw new Error('PLATFORM_DUPLICATE_DETECTED');
      }

      // Phase 4: Enterprise Registration Initiation
      const enterpriseRegistration = await registerUser({
        faydaId,
        verificationData: governmentVerification,
        securityContext: {
          sessionId: generateSessionId(),
          deviceFingerprint: await generateDeviceFingerprint(),
          riskScore: duplicateAnalysis.riskScore
        }
      });

      if (enterpriseRegistration.success) {
        await handleSuccessfulFaydaVerification(enterpriseRegistration, faydaId);
      } else {
        throw new Error(enterpriseRegistration.error || 'ENTERPRISE_REGISTRATION_FAILED');
      }

    } catch (error) {
      await handleEnterpriseRegistrationError(error, 'Fayda Verification');
    } finally {
      updateLoadingState(false);
    }
  };

  /**
   * 🎯 HANDLE SUCCESSFUL FAYDA VERIFICATION
   */
  const handleSuccessfulFaydaVerification = async (registrationResponse, faydaId) => {
    updateSystemState('registrationToken', registrationResponse.registrationToken);
    
    updateValidationState('faydaValidation', {
      isValid: true,
      isAvailable: true,
      message: 'Government ID verified successfully'
    });

    startEnterpriseOtpTimer();
    navigateToEnterpriseStep(ENTERPRISE_CONFIG.STEPS.OTP_VERIFICATION);

    logSecurityEvent('ENTERPRISE_VERIFICATION_SUCCESS', {
      faydaId: maskSensitiveData(faydaId),
      sessionId: generateSessionId(),
      verificationMethod: registrationResponse.verificationMethod,
      timestamp: new Date().toISOString()
    });

    showEnterpriseAlert('Verification Successful', 'Please check your phone for the verification code.', 'success');
  };

  /**
   * 🔢 ENTERPRISE OTP VERIFICATION
   */
  const handleOtpVerification = async () => {
    if (registrationState.isLoading) return;

    const otpCode = registrationState.formData.otp.join('');
    const otpValidation = validateEnterpriseOtp(otpCode);

    if (!otpValidation.isValid) {
      triggerEnterpriseShakeAnimation();
      showEnterpriseAlert('OTP Error', otpValidation.message, 'error');
      return;
    }

    if (isOtpExpired()) {
      showEnterpriseAlert('OTP Expired', 'Please request a new verification code.', 'warning');
      return;
    }

    updateLoadingState(true);

    try {
      const verificationResult = await verifyRegistrationOTP(
        registrationState.formData.faydaId,
        otpCode,
        registrationState.system.registrationToken,
        {
          sessionId: generateSessionId(),
          deviceFingerprint: await generateDeviceFingerprint()
        }
      );

      if (verificationResult.success) {
        await handleSuccessfulOtpVerification(verificationResult);
      } else {
        await handleFailedOtpAttempt();
        throw new Error(verificationResult.error || 'ENTERPRISE_OTP_VERIFICATION_FAILED');
      }

    } catch (error) {
      await handleEnterpriseRegistrationError(error, 'OTP Verification');
    } finally {
      updateLoadingState(false);
    }
  };

  /**
   * 🎯 HANDLE SUCCESSFUL OTP VERIFICATION
   */
  const handleSuccessfulOtpVerification = async (verificationResult) => {
    updateSystemState('registrationToken', verificationResult.newToken || registrationState.system.registrationToken);
    navigateToEnterpriseStep(ENTERPRISE_CONFIG.STEPS.PERSONAL_DETAILS);

    logSecurityEvent('ENTERPRISE_OTP_VERIFIED', {
      faydaId: maskSensitiveData(registrationState.formData.faydaId),
      sessionId: generateSessionId(),
      timestamp: new Date().toISOString()
    });

    showEnterpriseAlert('Identity Verified', 'Please complete your personal information.', 'success');
  };

  /**
   * 👤 ENTERPRISE PERSONAL DETAILS VALIDATION
   */
  const handlePersonalDetails = async () => {
    if (registrationState.isLoading) return;

    const validation = validateEnterprisePersonalDetails();
    if (!validation.isValid) {
      triggerEnterpriseShakeAnimation();
      showEnterpriseAlert('Validation Error', validation.message, 'error');
      return;
    }

    updateLoadingState(true);

    try {
      // Advanced phone number validation for Ethiopia
      if (!validateEthiopianPhoneEnterprise(registrationState.formData.phone)) {
        throw new Error('ADVANCED_PHONE_VALIDATION_FAILED');
      }

      // Enterprise email validation
      if (!validateEnterpriseEmail(registrationState.formData.email)) {
        throw new Error('ENTERPRISE_EMAIL_VALIDATION_FAILED');
      }

      // Proceed to account setup
      navigateToEnterpriseStep(ENTERPRISE_CONFIG.STEPS.ACCOUNT_SETUP);

    } catch (error) {
      await handleEnterpriseRegistrationError(error, 'Personal Details Validation');
    } finally {
      updateLoadingState(false);
    }
  };

  /**
   * 🔑 ENTERPRISE ACCOUNT SETUP
   */
  const handleAccountSetup = async () => {
    if (registrationState.isLoading) return;

    const passwordValidation = validateEnterprisePassword(registrationState.formData.password);
    if (!passwordValidation.isValid) {
      triggerEnterpriseShakeAnimation();
      showEnterpriseAlert('Password Requirements', passwordValidation.message, 'error');
      return;
    }

    if (registrationState.formData.password !== registrationState.formData.confirmPassword) {
      triggerEnterpriseShakeAnimation();
      showEnterpriseAlert('Password Mismatch', 'Passwords do not match. Please check and try again.', 'error');
      return;
    }

    if (!registrationState.formData.termsAccepted) {
      triggerEnterpriseShakeAnimation();
      showEnterpriseAlert('Terms Required', 'You must accept the Terms of Service and Privacy Policy to continue.', 'warning');
      return;
    }

    updateLoadingState(true);

    try {
      const encryptedData = await encryptSensitiveData({
        faydaId: registrationState.formData.faydaId,
        password: registrationState.formData.password,
        personalInfo: {
          firstName: registrationState.formData.firstName,
          lastName: registrationState.formData.lastName,
          email: registrationState.formData.email,
          phone: registrationState.formData.phone
        }
      });

      const registrationData = {
        ...encryptedData,
        userType: registrationState.formData.userType,
        registrationToken: registrationState.system.registrationToken,
        securityContext: {
          sessionId: generateSessionId(),
          deviceFingerprint: await generateDeviceFingerprint(),
          passwordStrength: registrationState.validation.passwordStrength
        }
      };

      const completionResult = await completeRegistration(registrationData);

      if (completionResult.success) {
        await handleSuccessfulRegistration(completionResult);
      } else {
        throw new Error(completionResult.error || 'ENTERPRISE_REGISTRATION_COMPLETION_FAILED');
      }

    } catch (error) {
      await handleEnterpriseRegistrationError(error, 'Account Setup');
    } finally {
      updateLoadingState(false);
    }
  };

  /**
   * 🎉 HANDLE SUCCESSFUL REGISTRATION
   */
  const handleSuccessfulRegistration = async (completionResult) => {
    // Clear all security locks
    await SecureStorage.removeItem('enterprise_registration_lockout');
    updateSecurityState('otpAttemptsRemaining', ENTERPRISE_CONFIG.SECURITY.MAX_OTP_ATTEMPTS);

    navigateToEnterpriseStep(ENTERPRISE_CONFIG.STEPS.SUCCESS);

    logSecurityEvent('ENTERPRISE_REGISTRATION_COMPLETED', {
      faydaId: maskSensitiveData(registrationState.formData.faydaId),
      userType: registrationState.formData.userType,
      sessionId: generateSessionId(),
      timestamp: new Date().toISOString(),
      securityScore: completionResult.securityScore
    });

    // Schedule automatic redirect with progress indication
    setTimeout(() => {
      router.replace({
        pathname: '/(auth)/login',
        params: { 
          welcome: 'true',
          email: registrationState.formData.email 
        }
      });
    }, 5000);
  };

  /**
   * 🚨 ENTERPRISE ERROR HANDLING
   */
  const handleEnterpriseRegistrationError = async (error, context) => {
    logger.error(`Enterprise registration error in ${context}`, error, {
      sessionId: generateSessionId(),
      faydaId: maskSensitiveData(registrationState.formData.faydaId)
    });

    const errorMapping = {
      'GOVERNMENT_VERIFICATION_FAILED': {
        title: 'Verification Failed',
        message: 'Fayda ID could not be verified with government records.',
        type: 'error'
      },
      'AI_DUPLICATE_PREVENTED': {
        title: 'Duplicate Detected',
        message: 'This ID shows patterns of previous registration attempts.',
        type: 'warning'
      },
      'PLATFORM_DUPLICATE_DETECTED': {
        title: 'Already Registered',
        message: 'This Fayda ID is already registered with Mosa Forge.',
        type: 'error'
      },
      'ADVANCED_PHONE_VALIDATION_FAILED': {
        title: 'Invalid Phone',
        message: 'Please enter a valid Ethiopian phone number.',
        type: 'error'
      },
      'ENTERPRISE_EMAIL_VALIDATION_FAILED': {
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
        type: 'error'
      },
      'NETWORK_UNRELIABLE': {
        title: 'Network Issue',
        message: 'Unable to establish secure connection. Please try again.',
        type: 'warning'
      }
    };

    const errorConfig = errorMapping[error.message] || {
      title: 'System Error',
      message: 'An unexpected error occurred. Please try again.',
      type: 'error'
    };

    showEnterpriseAlert(errorConfig.title, errorConfig.message, errorConfig.type);
    triggerEnterpriseShakeAnimation();

    // Log security event for errors
    logSecurityEvent('ENTERPRISE_REGISTRATION_ERROR', {
      context,
      error: error.message,
      sessionId: generateSessionId(),
      timestamp: new Date().toISOString()
    });
  };

  /**
   * 🔄 ENTERPRISE STATE MANAGEMENT
   */
  const updateRegistrationState = (updates) => {
    setRegistrationState(prev => ({
      ...prev,
      ...updates,
      system: { ...prev.system, lastActivity: Date.now() }
    }));
  };

  const updateLoadingState = (isLoading) => {
    updateRegistrationState({ isLoading });
  };

  const updateSecurityState = (key, value) => {
    updateRegistrationState({ 
      security: { ...registrationState.security, [key]: value } 
    });
  };

  const updateValidationState = (key, value) => {
    updateRegistrationState({ 
      validation: { ...registrationState.validation, [key]: value } 
    });
  };

  const updateSystemState = (key, value) => {
    updateRegistrationState({ 
      system: { ...registrationState.system, [key]: value } 
    });
  };

  /**
   * 🎯 ENTERPRISE VALIDATION FUNCTIONS
   */
  const validateFaydaIdEnterprise = (faydaId) => {
    if (!faydaId) {
      return { isValid: false, message: 'Fayda ID is required' };
    }

    if (!ENTERPRISE_CONFIG.VALIDATION.FAYDA_ID_PATTERN.test(faydaId)) {
      return { isValid: false, message: 'Invalid Fayda ID format (10-15 alphanumeric characters)' };
    }

    return { isValid: true };
  };

  const validateEnterpriseOtp = (otp) => {
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return { isValid: false, message: 'Please enter a valid 6-digit OTP' };
    }

    return { isValid: true };
  };

  const validateEnterprisePersonalDetails = () => {
    const errors = [];
    const { firstName, lastName, email, phone } = registrationState.formData;

    if (!ENTERPRISE_CONFIG.VALIDATION.NAME_PATTERN.test(firstName)) {
      errors.push('valid first name');
    }

    if (!ENTERPRISE_CONFIG.VALIDATION.NAME_PATTERN.test(lastName)) {
      errors.push('valid last name');
    }

    if (!email || !validateEnterpriseEmail(email)) {
      errors.push('valid email address');
    }

    if (!phone || !validateEthiopianPhoneEnterprise(phone)) {
      errors.push('valid Ethiopian phone number');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        message: `Please provide: ${errors.join(', ')}`
      };
    }

    return { isValid: true };
  };

  const validateEnterprisePassword = (password) => {
    const requirements = [
      { test: password.length >= 8, message: 'at least 8 characters' },
      { test: /[A-Z]/.test(password), message: 'one uppercase letter' },
      { test: /[a-z]/.test(password), message: 'one lowercase letter' },
      { test: /\d/.test(password), message: 'one number' },
      { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), message: 'one special character' }
    ];

    const failed = requirements.filter(req => !req.test);
    
    if (failed.length > 0) {
      return {
        isValid: false,
        message: `Password must contain: ${failed.map(f => f.message).join(', ')}`
      };
    }

    return { isValid: true };
  };

  const validateEnterpriseEmail = (email) => {
    return ENTERPRISE_CONFIG.VALIDATION.EMAIL_PATTERN.test(email);
  };

  const validateEthiopianPhoneEnterprise = (phone) => {
    return ENTERPRISE_CONFIG.VALIDATION.ETHIOPIAN_PHONE_PATTERN.test(phone.replace(/\s/g, ''));
  };

  /**
   * 🛡️ ENTERPRISE SECURITY FUNCTIONS
   */
  const isOperationBlocked = () => {
    return registrationState.isLoading || 
           registrationState.security.lockoutUntil ||
           registrationState.system.networkStatus === 'offline';
  };

  const isOtpExpired = () => {
    return registrationState.security.otpExpiry && new Date() > registrationState.security.otpExpiry;
  };

  const checkEnterpriseRateLimit = async (key) => {
    return await checkRateLimit(`enterprise_${key}`);
  };

  const validateEnterpriseNetwork = async () => {
    const isOnline = await networkMonitor.isConnected();
    const isStable = await networkMonitor.isConnectionStable();
    return isOnline && isStable;
  };

  /**
   * ⚡ ENTERPRISE ANIMATION FUNCTIONS
   */
  const navigateToEnterpriseStep = (step) => {
    Animated.parallel([
      Animated.timing(enterpriseRefs.animations.slide, {
        toValue: step,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(enterpriseRefs.animations.progress, {
        toValue: (step - 1) * 25,
        duration: 500,
        useNativeDriver: false,
      })
    ]).start();
    
    updateRegistrationState({ currentStep: step });
  };

  const triggerEnterpriseShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(enterpriseRefs.animations.shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(enterpriseRefs.animations.shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(enterpriseRefs.animations.shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(enterpriseRefs.animations.shake, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  /**
   * 🔄 ENTERPRISE UI RENDERERS
   */
  const renderEnterpriseProgress = () => (
    <View style={styles.enterpriseProgressContainer}>
      <View style={styles.enterpriseProgressBar}>
        <Animated.View 
          style={[
            styles.enterpriseProgressFill,
            { width: enterpriseRefs.animations.progress }
          ]} 
        />
      </View>
      <Text style={styles.enterpriseProgressText}>
        Security Verification {registrationState.currentStep * 25}%
      </Text>
    </View>
  );

  const renderEnterpriseHeader = () => (
    <View style={styles.enterpriseHeader}>
      <Text style={styles.enterpriseTitle}>Mosa Forge</Text>
      <Text style={styles.enterpriseSubtitle}>Enterprise Registration</Text>
      {renderEnterpriseProgress()}
    </View>
  );

  // ... Additional render methods for each step with enterprise styling

  /**
   * 🧹 ENTERPRISE CLEANUP
   */
  const cleanupEnterpriseResources = () => {
    // Clear all timers
    Object.values(enterpriseRefs.timers).forEach(timer => {
      if (timer.current) clearInterval(timer.current);
    });

    // Clear sensitive data
    setRegistrationState({
      currentStep: ENTERPRISE_CONFIG.STEPS.FAYDA_VERIFICATION,
      formData: {
        faydaId: '',
        otp: ['', '', '', '', '', ''],
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        userType: 'student',
        termsAccepted: false,
        marketingConsent: false
      },
      isLoading: false,
      security: {
        otpAttemptsRemaining: ENTERPRISE_CONFIG.SECURITY.MAX_OTP_ATTEMPTS,
        otpExpiry: null,
        lockoutUntil: null,
        sessionStartTime: Date.now()
      },
      validation: {
        passwordStrength: 0,
        faydaValidation: { isValid: false, isAvailable: false, message: '' },
        fieldErrors: {}
      },
      system: {
        registrationToken: '',
        lastActivity: Date.now(),
        networkStatus: 'online'
      }
    });

    // Clear registration session
    clearRegistrationSession();
  };

  return (
    <SafeAreaView style={styles.enterpriseContainer}>
      <KeyboardAvoidingView 
        style={styles.enterpriseKeyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.enterpriseScrollView}
          contentContainerStyle={styles.enterpriseScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderEnterpriseHeader()}
          
          <View style={styles.enterpriseStepsContainer}>
            {/* Step rendering based on currentStep */}
            {registrationState.currentStep === ENTERPRISE_CONFIG.STEPS.FAYDA_VERIFICATION && 
             renderEnterpriseFaydaStep()}
            {registrationState.currentStep === ENTERPRISE_CONFIG.STEPS.OTP_VERIFICATION && 
             renderEnterpriseOtpStep()}
            {registrationState.currentStep === ENTERPRISE_CONFIG.STEPS.PERSONAL_DETAILS && 
             renderEnterprisePersonalStep()}
            {registrationState.currentStep === ENTERPRISE_CONFIG.STEPS.ACCOUNT_SETUP && 
             renderEnterpriseAccountStep()}
            {registrationState.currentStep === ENTERPRISE_CONFIG.STEPS.SUCCESS && 
             renderEnterpriseSuccessStep()}
          </View>

          <View style={styles.enterpriseSecurityBadge}>
            <Text style={styles.securityBadgeText}>🔒 Enterprise Grade Security</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Enterprise Styles
const styles = StyleSheet.create({
  enterpriseContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  enterpriseKeyboardView: {
    flex: 1,
  },
  enterpriseScrollView: {
    flex: 1,
  },
  enterpriseScrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  enterpriseHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  enterpriseTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  enterpriseSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 24,
  },
  enterpriseProgressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  enterpriseProgressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  enterpriseProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  enterpriseProgressText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  enterpriseStepsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  enterpriseSecurityBadge: {
    alignItems: 'center',
    marginTop: 24,
    padding: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  securityBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  // ... Additional enterprise styles for each component
});

// Utility functions
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const maskSensitiveData = (data) => {
  if (!data || data.length <= 4) return '***';
  return `${data.substring(0, 3)}***${data.substring(data.length - 2)}`;
};

const generateDeviceFingerprint = async () => {
  // Implementation for device fingerprint generation
  return `device_${Platform.OS}_${SCREEN_WIDTH}x${SCREEN_HEIGHT}`;
};

const showEnterpriseAlert = (title, message, type = 'info') => {
  const config = {
    error: { backgroundColor: '#DC2626', color: '#FFFFFF' },
    warning: { backgroundColor: '#D97706', color: '#FFFFFF' },
    success: { backgroundColor: '#059669', color: '#FFFFFF' },
    info: { backgroundColor: '#2563EB', color: '#FFFFFF' },
    critical: { backgroundColor: '#7C2D12', color: '#FFFFFF' }
  };

  Alert.alert(title, message, [{ text: 'OK' }]);
};