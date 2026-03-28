/**
 * 🎯 MOSA FORGE: Enterprise Authentication Layout
 * 
 * @file _layout.js
 * @description Root authentication layout with enterprise security, Fayda ID integration, and quality enforcement
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Biometric authentication integration
 * - Fayda ID government verification
 * - AI-powered duplicate detection
 * - Enterprise-grade security protocols
 * - Quality guarantee enforcement
 * - Real-time monitoring
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments, useRootNavigation } from 'expo-router';
import { 
  View, 
  StyleSheet, 
  Platform, 
  AppState,
  BackHandler,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import * as SplashScreen from 'expo-splash-screen';
import * as LocalAuthentication from 'expo-local-authentication';

// 🏗️ Enterprise Context & Hooks
import { AuthProvider, useAuth } from '../../contexts/auth-context';
import { useBiometric } from '../../hooks/use-biometric-auth';
import { useFaydaValidation } from '../../hooks/use-fayda-validation';
import { useQualityMetrics } from '../../hooks/use-quality-metrics';

// 🏗️ Enterprise Components
import AuthLoadingScreen from '../../components/auth/AuthLoadingScreen';
import NetworkStatusBar from '../../components/auth/NetworkStatusBar';
import SecurityOverlay from '../../components/auth/SecurityOverlay';
import BiometricPrompt from '../../components/auth/BiometricPrompt';
import DuplicateDetectionModal from '../../components/auth/DuplicateDetectionModal';

// 🏗️ Enterprise Constants
const AUTH_CONFIG = {
  SESSION_TIMEOUT: 15 * 60 * 1000, // 15 minutes
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes
  BIOMETRIC_TIMEOUT: 45 * 1000, // 45 seconds
  NETWORK_TIMEOUT: 10000, // 10 seconds
};

const SECURITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * 🏗️ Enterprise Authentication Layout Component
 * @component AuthLayout
 * @description Root layout for all authentication flows with enterprise security
 */
export default function AuthLayout() {
  return (
    <AuthProvider>
      <EnterpriseAuthLayout>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            gestureEnabled: false,
            contentStyle: styles.stackContent,
          }}
        >
          <Stack.Screen
            name="fayda-registration"
            options={{
              title: 'Fayda ID Registration',
              animationTypeForReplace: 'push',
            }}
          />
          <Stack.Screen
            name="otp-verification"
            options={{
              title: 'OTP Verification',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="password-recovery"
            options={{
              title: 'Password Recovery',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="duplicate-alert"
            options={{
              title: 'Duplicate Detection',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="biometric-setup"
            options={{
              title: 'Biometric Setup',
              animation: 'slide_from_right',
            }}
          />
        </Stack>
      </EnterpriseAuthLayout>
    </AuthProvider>
  );
}

/**
 * 🏗️ Enterprise Auth Layout Wrapper
 * @component EnterpriseAuthLayout
 * @description Handles enterprise security, monitoring, and quality enforcement
 */
function EnterpriseAuthLayout({ children }) {
  const router = useRouter();
  const segments = useSegments();
  const navigation = useRootNavigation();
  
  // 🏗️ Enterprise State Management
  const [appIsReady, setAppIsReady] = useState(false);
  const [securityLevel, setSecurityLevel] = useState(SECURITY_LEVELS.HIGH);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState(null);

  // 🏗️ Enterprise Hooks
  const auth = useAuth();
  const biometric = useBiometric();
  const faydaValidation = useFaydaValidation();
  const qualityMetrics = useQualityMetrics();

  // 🏗️ Network State
  const [isConnected, setIsConnected] = useState(true);
  const [networkType, setNetworkType] = useState('unknown');

  // 🏗️ Security States
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [showSecurityOverlay, setShowSecurityOverlay] = useState(false);
  const [suspiciousActivity, setSuspiciousActivity] = useState(false);

  /**
   * 🏗️ Initialize Enterprise Authentication System
   */
  useEffect(() => {
    async function prepare() {
      try {
        // Keep splash screen visible
        await SplashScreen.preventAutoHideAsync();

        // 🏗️ Initialize enterprise services
        await initializeEnterpriseServices();

        // 🏗️ Check existing authentication state
        await checkAuthenticationState();

        // 🏗️ Setup security monitoring
        setupSecurityMonitoring();

      } catch (error) {
        console.error('🏗️ Enterprise Auth Initialization Failed:', error);
        handleInitializationError(error);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  /**
   * 🏗️ Initialize Enterprise Services
   */
  const initializeEnterpriseServices = useCallback(async () => {
    try {
      // Initialize biometric authentication
      const biometricAvailable = await biometric.initialize();
      
      // Initialize Fayda validation service
      await faydaValidation.initialize();

      // Initialize quality metrics
      await qualityMetrics.initialize();

      // Setup network monitoring
      setupNetworkMonitoring();

      // Setup session monitoring
      setupSessionMonitoring();

      console.log('🏗️ Enterprise Auth Services Initialized');
    } catch (error) {
      throw new Error(`Service initialization failed: ${error.message}`);
    }
  }, [biometric, faydaValidation, qualityMetrics]);

  /**
   * 🏗️ Check Authentication State
   */
  const checkAuthenticationState = useCallback(async () => {
    try {
      const authState = await auth.checkAuthState();
      
      if (authState.isAuthenticated) {
        // Check if biometric is required
        if (authState.requiresBiometric && biometric.isAvailable) {
          setShowBiometricPrompt(true);
        } else {
          // Redirect to main app
          router.replace('/(tabs)');
        }
      } else {
        // Check for lockout state
        const lockoutState = await checkLockoutState();
        if (lockoutState.isLocked) {
          setIsLocked(true);
          setLockoutUntil(lockoutState.until);
        }
      }
    } catch (error) {
      console.error('Auth state check failed:', error);
    }
  }, [auth, biometric, router]);

  /**
   * 🏗️ Setup Network Monitoring
   */
  const setupNetworkMonitoring = useCallback(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      setNetworkType(state.type);

      // Log network changes for security monitoring
      if (!state.isConnected) {
        logSecurityEvent('NETWORK_DISCONNECTED', {
          type: state.type,
          timestamp: new Date().toISOString()
        });
      }

      // Adjust security level based on network
      updateSecurityLevelBasedOnNetwork(state);
    });

    return unsubscribe;
  }, []);

  /**
   * 🏗️ Setup Session Monitoring
   */
  const setupSessionMonitoring = useCallback(() => {
    const activities = [
      'mousedown',
      'mousemove', 
      'keypress',
      'scroll',
      'touchstart',
      'touchmove'
    ];

    const updateActivity = () => {
      setLastActivity(Date.now());
    };

    activities.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Check session timeout every minute
    const sessionInterval = setInterval(() => {
      const idleTime = Date.now() - lastActivity;
      if (idleTime > AUTH_CONFIG.SESSION_TIMEOUT && auth.isAuthenticated) {
        handleSessionTimeout();
      }
    }, 60000);

    return () => {
      activities.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
      clearInterval(sessionInterval);
    };
  }, [lastActivity, auth.isAuthenticated]);

  /**
   * 🏗️ Setup Security Monitoring
   */
  const setupSecurityMonitoring = useCallback(() => {
    // Monitor app state changes
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Monitor hardware back button (Android)
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      appStateSubscription.remove();
      backHandler.remove();
    };
  }, []);

  /**
   * 🏗️ Handle App State Changes
   */
  const handleAppStateChange = useCallback((nextAppState) => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // Log app backgrounding for security
      logSecurityEvent('APP_BACKGROUNDED', {
        timestamp: new Date().toISOString(),
        securityLevel
      });
    } else if (nextAppState === 'active') {
      // Check if biometric is required when returning to app
      if (auth.isAuthenticated && biometric.isAvailable && biometric.isEnabled) {
        setShowBiometricPrompt(true);
      }
    }
  }, [auth.isAuthenticated, biometric, securityLevel]);

  /**
   * 🏗️ Handle Hardware Back Press
   */
  const handleBackPress = useCallback(() => {
    const route = segments[segments.length - 1];
    
    // Prevent back navigation on certain screens
    if (route === 'fayda-registration' || route === 'otp-verification') {
      // Show exit confirmation instead of going back
      showExitConfirmation();
      return true;
    }
    
    return false;
  }, [segments]);

  /**
   * 🏗️ Update Security Level Based on Network
   */
  const updateSecurityLevelBasedOnNetwork = useCallback((networkState) => {
    let newSecurityLevel = SECURITY_LEVELS.HIGH;

    if (!networkState.isConnected) {
      newSecurityLevel = SECURITY_LEVELS.CRITICAL;
    } else if (networkState.type === 'cellular') {
      newSecurityLevel = SECURITY_LEVELS.MEDIUM;
    } else if (networkState.type === 'wifi') {
      // Check if it's a trusted network
      newSecurityLevel = isTrustedNetwork(networkState) ? SECURITY_LEVELS.MEDIUM : SECURITY_LEVELS.HIGH;
    }

    setSecurityLevel(newSecurityLevel);
    
    // Log security level changes
    if (newSecurityLevel !== securityLevel) {
      logSecurityEvent('SECURITY_LEVEL_CHANGED', {
        from: securityLevel,
        to: newSecurityLevel,
        networkType: networkState.type,
        timestamp: new Date().toISOString()
      });
    }
  }, [securityLevel]);

  /**
   * 🏗️ Check Lockout State
   */
  const checkLockoutState = useCallback(async () => {
    try {
      const lockoutData = await auth.getLockoutState();
      
      if (lockoutData.isLocked && lockoutData.until > Date.now()) {
        return {
          isLocked: true,
          until: lockoutData.until,
          attempts: lockoutData.attempts
        };
      }
      
      return { isLocked: false, until: null, attempts: 0 };
    } catch (error) {
      console.error('Lockout state check failed:', error);
      return { isLocked: false, until: null, attempts: 0 };
    }
  }, [auth]);

  /**
   * 🏗️ Handle Session Timeout
   */
  const handleSessionTimeout = useCallback(() => {
    logSecurityEvent('SESSION_TIMEOUT', {
      userId: auth.user?.id,
      timestamp: new Date().toISOString()
    });

    // Show security overlay
    setShowSecurityOverlay(true);

    // Sign out after timeout
    setTimeout(() => {
      auth.signOut();
      router.replace('/(auth)/fayda-registration');
      setShowSecurityOverlay(false);
    }, 5000);
  }, [auth, router]);

  /**
   * 🏗️ Handle Initialization Error
   */
  const handleInitializationError = useCallback((error) => {
    logSecurityEvent('INITIALIZATION_FAILED', {
      error: error.message,
      timestamp: new Date().toISOString(),
      securityLevel: SECURITY_LEVELS.CRITICAL
    });

    // Fallback to basic auth without enterprise features
    setSecurityLevel(SECURITY_LEVELS.LOW);
  }, []);

  /**
   * 🏗️ Handle Biometric Success
   */
  const handleBiometricSuccess = useCallback(() => {
    setShowBiometricPrompt(false);
    logSecurityEvent('BIOMETRIC_SUCCESS', {
      userId: auth.user?.id,
      timestamp: new Date().toISOString()
    });
  }, [auth.user]);

  /**
   * 🏗️ Handle Biometric Failure
   */
  const handleBiometricFailure = useCallback((error) => {
    logSecurityEvent('BIOMETRIC_FAILED', {
      error: error.message,
      userId: auth.user?.id,
      timestamp: new Date().toISOString()
    });

    // Fallback to password or sign out based on security level
    if (securityLevel === SECURITY_LEVELS.CRITICAL) {
      auth.signOut();
      router.replace('/(auth)/fayda-registration');
    }
  }, [auth, router, securityLevel]);

  /**
   * 🏗️ Log Security Event
   */
  const logSecurityEvent = useCallback((eventType, data) => {
    const securityEvent = {
      type: eventType,
      service: 'auth-layout',
      timestamp: new Date().toISOString(),
      securityLevel,
      deviceId: Platform.OS,
      ...data
    };

    console.log('🔐 Security Event:', securityEvent);

    // Send to security monitoring service
    if (isConnected) {
      // In production, this would send to your security monitoring service
      auth.logSecurityEvent(securityEvent).catch(console.error);
    }
  }, [securityLevel, isConnected, auth]);

  /**
   * 🏗️ Show Exit Confirmation
   */
  const showExitConfirmation = useCallback(() => {
    // Implementation for exit confirmation dialog
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
    }
  }, []);

  /**
   * 🏗️ Check if Network is Trusted
   */
  const isTrustedNetwork = useCallback((networkState) => {
    // Implement network trust evaluation
    // This would check against known trusted networks
    return false; // Default to not trusted for security
  }, []);

  // 🏗️ Show loading screen while initializing
  if (!appIsReady) {
    return <AuthLoadingScreen type="enterprise" />;
  }

  // 🏗️ Show lockout screen if account is locked
  if (isLocked) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <SecurityOverlay
          type="lockout"
          duration={lockoutUntil - Date.now()}
          onContactSupport={() => router.push('/support')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* 🏗️ Network Status Indicator */}
      <NetworkStatusBar 
        isConnected={isConnected}
        networkType={networkType}
        securityLevel={securityLevel}
      />

      {/* 🏗️ Main Auth Content */}
      <View style={styles.content}>
        {children}
      </View>

      {/* 🏗️ Biometric Authentication Prompt */}
      {showBiometricPrompt && (
        <BiometricPrompt
          visible={showBiometricPrompt}
          onSuccess={handleBiometricSuccess}
          onFailure={handleBiometricFailure}
          onCancel={() => setShowBiometricPrompt(false)}
          timeout={AUTH_CONFIG.BIOMETRIC_TIMEOUT}
          securityLevel={securityLevel}
        />
      )}

      {/* 🏗️ Security Overlay for Critical States */}
      {showSecurityOverlay && (
        <SecurityOverlay
          type="session_timeout"
          onAction={() => setShowSecurityOverlay(false)}
        />
      )}

      {/* 🏗️ Duplicate Detection Modal */}
      <DuplicateDetectionModal />
    </View>
  );
}

/**
 * 🏗️ Enterprise Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  stackContent: {
    backgroundColor: '#ffffff',
  },
});

/**
 * 🏗️ Performance Optimization Configuration
 */
// Enable React Native's new architecture features
export const unstable_settings = {
  // Ensure authentication state is preserved
  initialRouteName: 'fayda-registration',
};

/**
 * 🏗️ Error Boundary for Authentication Layout
 */
export class AuthLayoutErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🏗️ Auth Layout Error:', error, errorInfo);
    
    // Log to error monitoring service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <SecurityOverlay
            type="error"
            error={this.state.error}
            onRetry={() => this.setState({ hasError: false, error: null })}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

// 🏗️ Export with Error Boundary
export default function AuthLayoutWithErrorBoundary(props) {
  return (
    <AuthLayoutErrorBoundary>
      <AuthLayout {...props} />
    </AuthLayoutErrorBoundary>
  );
}