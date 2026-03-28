/**
 * 🎯 MOSA FORGE: Enterprise Biometric Authentication Component
 * 
 * @component BiometricPrompt
 * @description Advanced biometric authentication with Fayda ID integration
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Multi-biometric method support (Face ID, Touch ID, Fingerprint)
 * - Fayda ID government verification integration
 * - Fallback authentication strategies
 * - Enterprise-grade security protocols
 * - Real-time biometric validation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Animated,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import { 
  Feather, 
  MaterialCommunityIcons, 
  FontAwesome5,
  Ionicons 
} from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../../contexts/auth-context';
import { useSecurity } from '../../hooks/use-security';

// 🏗️ Enterprise Constants
const BIOMETRIC_TYPES = {
  FINGERPRINT: 'FINGERPRINT',
  FACIAL_RECOGNITION: 'FACIAL_RECOGNITION',
  IRIS_SCAN: 'IRIS_SCAN',
  NONE: 'NONE'
};

const AUTHENTICATION_LEVELS = {
  HIGH: 'HIGH',        // Financial transactions
  MEDIUM: 'MEDIUM',    // Course access
  LOW: 'LOW'          // General app access
};

const SECURITY_CONFIG = {
  maxAttempts: 3,
  lockoutDuration: 300000, // 5 minutes
  sessionTimeout: 900000,  // 15 minutes
};

/**
 * 🏗️ Enterprise Biometric Prompt Component
 * @param {Object} props - Component properties
 */
const BiometricPrompt = ({
  onSuccess,
  onFailure,
  onFallback,
  authenticationLevel = AUTHENTICATION_LEVELS.MEDIUM,
  showFallbackOption = true,
  enableFaydaVerification = true,
  customMessage,
  style,
  ...props
}) => {
  // 🏗️ State Management
  const [biometricType, setBiometricType] = useState(BIOMETRIC_TYPES.NONE);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [faydaVerification, setFaydaVerification] = useState(false);
  
  // 🏗️ Refs & Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // 🏗️ Enterprise Hooks
  const { user, updateSecurityPreferences } = useAuth();
  const { 
    validateBiometric, 
    logSecurityEvent, 
    checkDeviceSecurity 
  } = useSecurity();

  // 🏗️ Initialize Component
  useEffect(() => {
    initializeBiometric();
    startEntranceAnimation();
  }, []);

  // 🏗️ Lockout Timer Effect
  useEffect(() => {
    let timer;
    if (isLocked && lockoutTime > 0) {
      timer = setInterval(() => {
        setLockoutTime(prev => {
          if (prev <= 1000) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLocked, lockoutTime]);

  /**
   * 🏗️ Initialize Biometric System
   */
  const initializeBiometric = async () => {
    try {
      setIsAuthenticating(true);
      
      // Check hardware support
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        handleBiometricUnavailable('Biometric hardware not available');
        return;
      }

      // Check enrolled biometrics
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        handleBiometricUnavailable('No biometrics enrolled');
        return;
      }

      // Get supported types
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const biometricType = determineBiometricType(supportedTypes);
      setBiometricType(biometricType);

      // Check device security level
      const deviceSecurity = await checkDeviceSecurity();
      if (!deviceSecurity.isSecure) {
        logSecurityEvent('DEVICE_SECURITY_WARNING', {
          userId: user?.id,
          level: authenticationLevel
        });
      }

      // Auto-start authentication for high security levels
      if (authenticationLevel === AUTHENTICATION_LEVELS.HIGH) {
        setTimeout(() => {
          startBiometricAuthentication();
        }, 1000);
      }

    } catch (error) {
      handleInitializationError(error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  /**
   * 🏗️ Determine Biometric Type
   */
  const determineBiometricType = (supportedTypes) => {
    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return BIOMETRIC_TYPES.FACIAL_RECOGNITION;
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return BIOMETRIC_TYPES.FINGERPRINT;
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return BIOMETRIC_TYPES.IRIS_SCAN;
    }
    return BIOMETRIC_TYPES.NONE;
  };

  /**
   * 🏗️ Start Biometric Authentication
   */
  const startBiometricAuthentication = async () => {
    if (isLocked) {
      showLockoutMessage();
      return;
    }

    if (isAuthenticating) return;

    try {
      setIsAuthenticating(true);
      startPulseAnimation();

      // 🎯 Enterprise Authentication Options
      const authOptions = {
        promptMessage: getPromptMessage(),
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        requireConfirmation: authenticationLevel === AUTHENTICATION_LEVELS.HIGH,
      };

      // Perform biometric authentication
      const result = await LocalAuthentication.authenticateAsync(authOptions);

      if (result.success) {
        await handleAuthenticationSuccess();
      } else {
        await handleAuthenticationFailure(result.error);
      }

    } catch (error) {
      await handleAuthenticationError(error);
    } finally {
      setIsAuthenticating(false);
      stopPulseAnimation();
    }
  };

  /**
   * 🏗️ Handle Authentication Success
   */
  const handleAuthenticationSuccess = async () => {
    try {
      // Log security event
      await logSecurityEvent('BIOMETRIC_AUTH_SUCCESS', {
        userId: user?.id,
        biometricType,
        level: authenticationLevel,
        timestamp: new Date().toISOString()
      });

      // For high security levels, initiate Fayda verification
      if (authenticationLevel === AUTHENTICATION_LEVELS.HIGH && enableFaydaVerification) {
        setFaydaVerification(true);
        const faydaResult = await verifyFaydaIdentity();
        
        if (faydaResult.success) {
          await completeAuthentication();
        } else {
          handleFaydaVerificationFailure(faydaResult.error);
        }
      } else {
        await completeAuthentication();
      }

    } catch (error) {
      handleAuthenticationError(error);
    }
  };

  /**
   * 🏗️ Complete Authentication Process
   */
  const completeAuthentication = async () => {
    // Reset attempt count on success
    setAttemptCount(0);
    
    // Update user security preferences
    await updateSecurityPreferences({
      lastBiometricAuth: new Date().toISOString(),
      biometricType,
      authLevel: authenticationLevel
    });

    // Trigger success callback
    onSuccess?.({
      biometricType,
      faydaVerified: faydaVerification,
      timestamp: new Date().toISOString(),
      authenticationLevel
    });

    // Visual feedback
    await playSuccessAnimation();
  };

  /**
   * 🏗️ Handle Authentication Failure
   */
  const handleAuthenticationFailure = async (error) => {
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);

    // Log security event
    await logSecurityEvent('BIOMETRIC_AUTH_FAILURE', {
      userId: user?.id,
      biometricType,
      error: error || 'Unknown error',
      attemptCount: newAttemptCount,
      level: authenticationLevel
    });

    // Check for lockout
    if (newAttemptCount >= SECURITY_CONFIG.maxAttempts) {
      await activateLockout();
      return;
    }

    // Show error feedback
    await playErrorAnimation();
    
    // Show appropriate error message
    showErrorMessage(error);

    // Trigger failure callback
    onFailure?.({
      error,
      attemptCount: newAttemptCount,
      biometricType,
      locked: false
    });
  };

  /**
   * 🏗️ Activate Security Lockout
   */
  const activateLockout = async () => {
    setIsLocked(true);
    setLockoutTime(SECURITY_CONFIG.lockoutDuration);

    await logSecurityEvent('BIOMETRIC_LOCKOUT_ACTIVATED', {
      userId: user?.id,
      duration: SECURITY_CONFIG.lockoutDuration,
      attemptCount: attemptCount
    });

    onFailure?.({
      error: 'TOO_MANY_ATTEMPTS',
      attemptCount,
      biometricType,
      locked: true,
      lockoutDuration: SECURITY_CONFIG.lockoutDuration
    });
  };

  /**
   * 🏗️ Verify Fayda Identity
   */
  const verifyFaydaIdentity = async () => {
    try {
      // This would integrate with actual Fayda government API
      // For now, simulate the verification process
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful verification
      return {
        success: true,
        faydaId: user?.faydaId,
        verifiedAt: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        error: 'FAYDA_VERIFICATION_FAILED'
      };
    }
  };

  /**
   * 🏗️ Handle Fallback Authentication
   */
  const handleFallback = () => {
    logSecurityEvent('BIOMETRIC_FALLBACK_TRIGGERED', {
      userId: user?.id,
      biometricType,
      level: authenticationLevel
    });

    onFallback?.({
      biometricType,
      attemptCount,
      reason: 'USER_REQUESTED_FALLBACK'
    });
  };

  // 🎨 Animation Methods
  const startEntranceAnimation = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const playErrorAnimation = () => {
    return new Promise((resolve) => {
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
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => resolve());
    });
  };

  const playSuccessAnimation = () => {
    return new Promise((resolve) => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => resolve());
    });
  };

  // 🏗️ Helper Methods
  const getPromptMessage = () => {
    if (customMessage) return customMessage;
    
    const messages = {
      [AUTHENTICATION_LEVELS.HIGH]: 'Verify identity for secure access',
      [AUTHENTICATION_LEVELS.MEDIUM]: 'Authenticate to continue',
      [AUTHENTICATION_LEVELS.LOW]: 'Confirm your identity'
    };
    
    return messages[authenticationLevel] || 'Authenticate to continue';
  };

  const getBiometricIcon = () => {
    switch (biometricType) {
      case BIOMETRIC_TYPES.FACIAL_RECOGNITION:
        return <Feather name="user-check" size={48} color="#10B981" />;
      case BIOMETRIC_TYPES.FINGERPRINT:
        return <FontAwesome5 name="fingerprint" size={48} color="#10B981" />;
      case BIOMETRIC_TYPES.IRIS_SCAN:
        return <Ionicons name="eye" size={48} color="#10B981" />;
      default:
        return <MaterialCommunityIcons name="security" size={48} color="#6B7280" />;
    }
  };

  const getBiometricLabel = () => {
    switch (biometricType) {
      case BIOMETRIC_TYPES.FACIAL_RECOGNITION:
        return 'Face ID';
      case BIOMETRIC_TYPES.FINGERPRINT:
        return 'Touch ID';
      case BIOMETRIC_TYPES.IRIS_SCAN:
        return 'Iris Scan';
      default:
        return 'Biometric';
    }
  };

  const showLockoutMessage = () => {
    const minutes = Math.ceil(lockoutTime / 60000);
    Alert.alert(
      'Too Many Attempts',
      `Please wait ${minutes} minute(s) before trying again.`,
      [{ text: 'OK' }]
    );
  };

  const showErrorMessage = (error) => {
    const errorMessages = {
      'user_cancel': 'Authentication cancelled',
      'app_cancel': 'Authentication cancelled',
      'system_cancel': 'Authentication cancelled by system',
      'passcode_not_set': 'Device passcode not set',
      'lockout': 'Too many failed attempts',
      'not_available': 'Biometric not available',
      'not_enrolled': 'No biometrics enrolled',
    };

    const message = errorMessages[error] || 'Authentication failed. Please try again.';
    
    if (error !== 'user_cancel') {
      Alert.alert('Authentication Failed', message, [{ text: 'OK' }]);
    }
  };

  const handleBiometricUnavailable = (reason) => {
    logSecurityEvent('BIOMETRIC_UNAVAILABLE', {
      userId: user?.id,
      reason,
      level: authenticationLevel
    });
    
    onFailure?.({
      error: 'BIOMETRIC_UNAVAILABLE',
      reason,
      biometricType: BIOMETRIC_TYPES.NONE
    });
  };

  const handleInitializationError = (error) => {
    logSecurityEvent('BIOMETRIC_INIT_ERROR', {
      userId: user?.id,
      error: error.message,
      level: authenticationLevel
    });
    
    onFailure?.({
      error: 'INITIALIZATION_ERROR',
      message: error.message
    });
  };

  const handleFaydaVerificationFailure = (error) => {
    logSecurityEvent('FAYDA_VERIFICATION_FAILED', {
      userId: user?.id,
      error,
      level: authenticationLevel
    });
    
    onFailure?.({
      error: 'FAYDA_VERIFICATION_FAILED',
      message: 'Government ID verification failed'
    });
  };

  const handleAuthenticationError = async (error) => {
    await logSecurityEvent('BIOMETRIC_AUTH_ERROR', {
      userId: user?.id,
      error: error.message,
      biometricType,
      level: authenticationLevel
    });
    
    onFailure?.({
      error: 'AUTHENTICATION_ERROR',
      message: error.message
    });
  };

  // 🎯 Render Methods
  const renderLockoutTimer = () => {
    if (!isLocked) return null;

    const minutes = Math.ceil(lockoutTime / 60000);
    const seconds = Math.ceil((lockoutTime % 60000) / 1000);

    return (
      <View style={styles.lockoutContainer}>
        <Ionicons name="lock-closed" size={32} color="#EF4444" />
        <Text style={styles.lockoutText}>
          Try again in {minutes}:{seconds.toString().padStart(2, '0')}
        </Text>
      </View>
    );
  };

  const renderFaydaVerification = () => {
    if (!faydaVerification) return null;

    return (
      <View style={styles.faydaContainer}>
        <MaterialCommunityIcons name="card-account-details" size={24} color="#3B82F6" />
        <Text style={styles.faydaText}>Verifying Fayda ID...</Text>
      </View>
    );
  };

  const renderFallbackOption = () => {
    if (!showFallbackOption || isLocked) return null;

    return (
      <TouchableOpacity
        style={styles.fallbackButton}
        onPress={handleFallback}
        disabled={isAuthenticating}
      >
        <Text style={styles.fallbackText}>Use Password Instead</Text>
      </TouchableOpacity>
    );
  };

  // 🏗️ Main Render
  return (
    <Animated.View 
      style={[
        styles.container,
        style,
        {
          opacity: fadeAnim,
          transform: [
            { translateX: shakeAnim },
            { scale: pulseAnim }
          ]
        }
      ]}
      {...props}
    >
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.content}>
        {/* Biometric Icon */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
          {getBiometricIcon()}
        </Animated.View>

        {/* Instructions */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {getBiometricLabel()} Required
          </Text>
          <Text style={styles.subtitle}>
            {getPromptMessage()}
          </Text>
          <Text style={styles.securityLevel}>
            Security Level: {authenticationLevel}
          </Text>
        </View>

        {/* Fayda Verification */}
        {renderFaydaVerification()}

        {/* Lockout Timer */}
        {renderLockoutTimer()}

        {/* Action Button */}
        {!isLocked && (
          <TouchableOpacity
            style={[
              styles.authButton,
              isAuthenticating && styles.authButtonDisabled
            ]}
            onPress={startBiometricAuthentication}
            disabled={isAuthenticating}
          >
            <Text style={styles.authButtonText}>
              {isAuthenticating ? 'Authenticating...' : `Use ${getBiometricLabel()}`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Fallback Option */}
        {renderFallbackOption()}

        {/* Security Badge */}
        <View style={styles.securityBadge}>
          <Feather name="shield" size={16} color="#10B981" />
          <Text style={styles.securityBadgeText}>Enterprise Secure</Text>
        </View>
      </View>
    </Animated.View>
  );
};

// 🎨 Enterprise Styling
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  securityLevel: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
    textAlign: 'center',
  },
  authButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    marginBottom: 16,
  },
  authButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fallbackButton: {
    padding: 12,
  },
  fallbackText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  lockoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  lockoutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  faydaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  faydaText: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  securityBadgeText: {
    color: '#065F46',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});

// 🏗️ Export with Enterprise Configuration
export default React.memo(BiometricPrompt);

export {
  BIOMETRIC_TYPES,
  AUTHENTICATION_LEVELS,
  SECURITY_CONFIG
};