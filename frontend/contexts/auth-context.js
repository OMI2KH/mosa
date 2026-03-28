/**
 * 🎯 MOSA FORGE: Enterprise Authentication Context
 * 
 * @module AuthContext
 * @description Enterprise-grade authentication state management with Fayda ID integration
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Fayda ID government verification
 * - AI-powered duplicate detection
 * - JWT token management with refresh
 * - Role-based access control (RBAC)
 * - Biometric authentication support
 * - Real-time session management
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { 
  Platform, 
  AppState, 
  Alert,
  Linking 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import jwtDecode from 'jwt-decode';
import { v4 as uuidv4 } from 'uuid';

// 🏗️ Enterprise Constants
const AUTH_CONSTANTS = {
  // Storage Keys
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'mosa_forge_access_token',
    REFRESH_TOKEN: 'mosa_forge_refresh_token',
    USER_DATA: 'mosa_forge_user_data',
    SESSION_ID: 'mosa_forge_session_id',
    BIOMETRIC_ENABLED: 'mosa_forge_biometric_enabled'
  },

  // Token Configuration
  TOKEN_CONFIG: {
    ACCESS_TOKEN_EXPIRY: 15 * 60 * 1000, // 15 minutes
    REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
    AUTO_REFRESH_BUFFER: 5 * 60 * 1000 // 5 minutes before expiry
  },

  // User Roles
  ROLES: {
    STUDENT: 'student',
    EXPERT: 'expert',
    ADMIN: 'admin',
    QUALITY_MANAGER: 'quality_manager',
    FINANCE_MANAGER: 'finance_manager'
  },

  // Authentication States
  STATES: {
    IDLE: 'idle',
    LOADING: 'loading',
    AUTHENTICATED: 'authenticated',
    UNAUTHENTICATED: 'unauthenticated',
    EXPIRED: 'expired',
    LOCKED: 'locked',
    BIOMETRIC_REQUIRED: 'biometric_required'
  },

  // Error Codes
  ERROR_CODES: {
    FAYDA_VALIDATION_FAILED: 'FAYDA_VALIDATION_FAILED',
    DUPLICATE_USER: 'DUPLICATE_USER',
    INVALID_OTP: 'INVALID_OTP',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    BIOMETRIC_NOT_AVAILABLE: 'BIOMETRIC_NOT_AVAILABLE',
    NETWORK_ERROR: 'NETWORK_ERROR',
    SERVER_ERROR: 'SERVER_ERROR'
  }
};

// 🏗️ Authentication Actions
const AUTH_ACTIONS = {
  // Initialization
  INITIALIZE: 'INITIALIZE',
  INITIALIZATION_COMPLETE: 'INITIALIZATION_COMPLETE',

  // Authentication Flow
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',

  // Registration Flow
  REGISTER_START: 'REGISTER_START',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILURE: 'REGISTER_FAILURE',

  // OTP Management
  OTP_VERIFICATION_START: 'OTP_VERIFICATION_START',
  OTP_VERIFICATION_SUCCESS: 'OTP_VERIFICATION_SUCCESS',
  OTP_VERIFICATION_FAILURE: 'OTP_VERIFICATION_FAILURE',

  // Token Management
  TOKEN_REFRESH_START: 'TOKEN_REFRESH_START',
  TOKEN_REFRESH_SUCCESS: 'TOKEN_REFRESH_SUCCESS',
  TOKEN_REFRESH_FAILURE: 'TOKEN_REFRESH_FAILURE',

  // Session Management
  LOGOUT: 'LOGOUT',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  CLEAR_ERROR: 'CLEAR_ERROR',

  // Biometric Management
  BIOMETRIC_ENABLE: 'BIOMETRIC_ENABLE',
  BIOMETRIC_DISABLE: 'BIOMETRIC_DISABLE',
  BIOMETRIC_VERIFICATION: 'BIOMETRIC_VERIFICATION',

  // User Management
  UPDATE_USER_PROFILE: 'UPDATE_USER_PROFILE',
  UPDATE_USER_ROLES: 'UPDATE_USER_ROLES'
};

/**
 * 🏗️ Authentication Reducer - Enterprise State Management
 */
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.INITIALIZE:
      return {
        ...state,
        isLoading: true,
        isInitialized: false
      };

    case AUTH_ACTIONS.INITIALIZATION_COMPLETE:
      return {
        ...state,
        isLoading: false,
        isInitialized: true,
        state: action.payload.state || AUTH_CONSTANTS.STATES.UNAUTHENTICATED
      };

    case AUTH_ACTIONS.LOGIN_START:
    case AUTH_ACTIONS.REGISTER_START:
    case AUTH_ACTIONS.OTP_VERIFICATION_START:
      return {
        ...state,
        isLoading: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
    case AUTH_ACTIONS.REGISTER_SUCCESS:
      return {
        ...state,
        ...action.payload,
        isLoading: false,
        isAuthenticated: true,
        state: AUTH_CONSTANTS.STATES.AUTHENTICATED,
        error: null,
        loginAttempts: 0
      };

    case AUTH_ACTIONS.OTP_VERIFICATION_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isOTPVerified: true,
        error: null
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
    case AUTH_ACTIONS.REGISTER_FAILURE:
    case AUTH_ACTIONS.OTP_VERIFICATION_FAILURE:
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        state: AUTH_CONSTANTS.STATES.UNAUTHENTICATED,
        error: action.payload.error,
        loginAttempts: (state.loginAttempts || 0) + 1,
        // Auto-lock after 5 failed attempts
        ...(state.loginAttempts >= 4 && {
          state: AUTH_CONSTANTS.STATES.LOCKED,
          lockUntil: Date.now() + (15 * 60 * 1000) // 15 minutes
        })
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_SUCCESS:
      return {
        ...state,
        tokens: {
          ...state.tokens,
          ...action.payload.tokens
        },
        lastTokenRefresh: Date.now()
      };

    case AUTH_ACTIONS.TOKEN_REFRESH_FAILURE:
      return {
        ...state,
        state: AUTH_CONSTANTS.STATES.EXPIRED,
        error: action.payload.error
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isInitialized: true,
        state: AUTH_CONSTANTS.STATES.UNAUTHENTICATED
      };

    case AUTH_ACTIONS.SESSION_EXPIRED:
      return {
        ...state,
        state: AUTH_CONSTANTS.STATES.EXPIRED,
        isAuthenticated: false
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AUTH_ACTIONS.BIOMETRIC_ENABLE:
      return {
        ...state,
        biometricEnabled: true,
        biometricType: action.payload.biometricType
      };

    case AUTH_ACTIONS.BIOMETRIC_DISABLE:
      return {
        ...state,
        biometricEnabled: false,
        biometricType: null
      };

    case AUTH_ACTIONS.UPDATE_USER_PROFILE:
      return {
        ...state,
        user: {
          ...state.user,
          ...action.payload.updates
        }
      };

    case AUTH_ACTIONS.UPDATE_USER_ROLES:
      return {
        ...state,
        user: {
          ...state.user,
          roles: action.payload.roles
        }
      };

    default:
      return state;
  }
};

// 🏗️ Initial State
const initialState = {
  // Authentication State
  isInitialized: false,
  isLoading: false,
  isAuthenticated: false,
  isOTPVerified: false,
  state: AUTH_CONSTANTS.STATES.IDLE,

  // User Data
  user: null,
  tokens: null,
  sessionId: null,

  // Security
  loginAttempts: 0,
  lockUntil: null,
  biometricEnabled: false,
  biometricType: null,

  // Error Handling
  error: null,
  lastTokenRefresh: null,

  // Metadata
  faydaVerified: false,
  duplicateCheckCompleted: false
};

/**
 * 🏗️ Enterprise Authentication Context
 */
const AuthContext = createContext();

/**
 * 🏗️ Authentication Provider Component
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 */
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const tokenRefreshTimeoutRef = React.useRef(null);
  const appStateSubscriptionRef = React.useRef(null);

  /**
   * 🏗️ Initialize Authentication System
   */
  const initializeAuth = useCallback(async () => {
    dispatch({ type: AUTH_ACTIONS.INITIALIZE });
    
    try {
      const sessionId = uuidv4();
      
      // Check for existing session
      const [accessToken, userData, biometricEnabled] = await Promise.all([
        AsyncStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.USER_DATA),
        AsyncStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.BIOMETRIC_ENABLED)
      ]);

      if (accessToken && userData) {
        const parsedUserData = JSON.parse(userData);
        const tokenData = jwtDecode(accessToken);

        // Check token expiry
        if (tokenData.exp * 1000 > Date.now()) {
          // Valid token found
          dispatch({
            type: AUTH_ACTIONS.INITIALIZATION_COMPLETE,
            payload: {
              state: AUTH_CONSTANTS.STATES.AUTHENTICATED,
              user: parsedUserData,
              tokens: { accessToken },
              sessionId,
              biometricEnabled: biometricEnabled === 'true'
            }
          });

          // Schedule token refresh
          scheduleTokenRefresh(tokenData.exp);
        } else {
          // Token expired, try to refresh
          await handleTokenRefresh();
        }
      } else {
        // No existing session
        dispatch({
          type: AUTH_ACTIONS.INITIALIZATION_COMPLETE,
          payload: { state: AUTH_CONSTANTS.STATES.UNAUTHENTICATED }
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      dispatch({
        type: AUTH_ACTIONS.INITIALIZATION_COMPLETE,
        payload: { state: AUTH_CONSTANTS.STATES.UNAUTHENTICATED }
      });
    }
  }, []);

  /**
   * 🏗️ Schedule Automatic Token Refresh
   */
  const scheduleTokenRefresh = useCallback((expiryTimestamp) => {
    if (tokenRefreshTimeoutRef.current) {
      clearTimeout(tokenRefreshTimeoutRef.current);
    }

    const refreshTime = (expiryTimestamp * 1000) - Date.now() - AUTH_CONSTANTS.TOKEN_CONFIG.AUTO_REFRESH_BUFFER;
    
    if (refreshTime > 0) {
      tokenRefreshTimeoutRef.current = setTimeout(() => {
        handleTokenRefresh();
      }, refreshTime);
    }
  }, []);

  /**
   * 🏗️ Handle Token Refresh
   */
  const handleTokenRefresh = useCallback(async () => {
    dispatch({ type: AUTH_ACTIONS.TOKEN_REFRESH_START });

    try {
      const refreshToken = await AsyncStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN);
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      // Call refresh token endpoint
      const response = await fetch(`${process.env.API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const { accessToken, refreshToken: newRefreshToken } = await response.json();
      
      // Store new tokens
      await Promise.all([
        AsyncStorage.setItem(AUTH_CONSTANTS.STORAGE_KEYS.ACCESS_TOKEN, accessToken),
        AsyncStorage.setItem(AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken)
      ]);

      const tokenData = jwtDecode(accessToken);

      dispatch({
        type: AUTH_ACTIONS.TOKEN_REFRESH_SUCCESS,
        payload: {
          tokens: { accessToken, refreshToken: newRefreshToken }
        }
      });

      scheduleTokenRefresh(tokenData.exp);

    } catch (error) {
      console.error('Token refresh error:', error);
      dispatch({
        type: AUTH_ACTIONS.TOKEN_REFRESH_FAILURE,
        payload: { error: error.message }
      });
      
      // Logout user on refresh failure
      await logout();
    }
  }, []);

  /**
   * 🎯 ENTERPRISE METHOD: Register with Fayda ID
   */
  const registerWithFayda = useCallback(async (registrationData) => {
    dispatch({ type: AUTH_ACTIONS.REGISTER_START });

    try {
      const { faydaId, phoneNumber, email, password, userType } = registrationData;

      // Validate Fayda ID format
      if (!isValidFaydaId(faydaId)) {
        throw new Error('Invalid Fayda ID format');
      }

      // Call registration endpoint
      const response = await fetch(`${process.env.API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          faydaId,
          phoneNumber,
          email,
          password,
          userType,
          deviceInfo: await getDeviceInfo(),
          traceId: uuidv4()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (result.errorCode === AUTH_CONSTANTS.ERROR_CODES.DUPLICATE_USER) {
          throw new Error('This Fayda ID is already registered. Please use a different ID or contact support.');
        } else if (result.errorCode === AUTH_CONSTANTS.ERROR_CODES.FAYDA_VALIDATION_FAILED) {
          throw new Error('Fayda ID verification failed. Please check your ID and try again.');
        } else {
          throw new Error(result.message || 'Registration failed');
        }
      }

      // Store user data and tokens
      await Promise.all([
        AsyncStorage.setItem(AUTH_CONSTANTS.STORAGE_KEYS.USER_DATA, JSON.stringify(result.user)),
        AsyncStorage.setItem(AUTH_CONSTANTS.STORAGE_KEYS.ACCESS_TOKEN, result.tokens.accessToken),
        AsyncStorage.setItem(AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN, result.tokens.refreshToken)
      ]);

      const tokenData = jwtDecode(result.tokens.accessToken);

      dispatch({
        type: AUTH_ACTIONS.REGISTER_SUCCESS,
        payload: {
          user: result.user,
          tokens: result.tokens,
          sessionId: uuidv4(),
          faydaVerified: true
        }
      });

      scheduleTokenRefresh(tokenData.exp);

      return result;

    } catch (error) {
      console.error('Registration error:', error);
      dispatch({
        type: AUTH_ACTIONS.REGISTER_FAILURE,
        payload: { error: error.message }
      });
      throw error;
    }
  }, []);

  /**
   * 🎯 ENTERPRISE METHOD: Login with Credentials
   */
  const login = useCallback(async (credentials) => {
    // Check if account is locked
    if (state.lockUntil && Date.now() < state.lockUntil) {
      const remainingTime = Math.ceil((state.lockUntil - Date.now()) / 60000);
      throw new Error(`Account temporarily locked. Try again in ${remainingTime} minutes.`);
    }

    dispatch({ type: AUTH_ACTIONS.LOGIN_START });

    try {
      const { identifier, password, useBiometric = false } = credentials;

      let loginPayload = {
        identifier,
        password,
        deviceInfo: await getDeviceInfo(),
        traceId: uuidv4()
      };

      if (useBiometric) {
        const biometricCredentials = await Keychain.getGenericPassword();
        if (!biometricCredentials) {
          throw new Error('Biometric credentials not found');
        }
        loginPayload = {
          ...loginPayload,
          password: biometricCredentials.password,
          biometricAuth: true
        };
      }

      const response = await fetch(`${process.env.API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginPayload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Login failed');
      }

      // Store authentication data
      await Promise.all([
        AsyncStorage.setItem(AUTH_CONSTANTS.STORAGE_KEYS.USER_DATA, JSON.stringify(result.user)),
        AsyncStorage.setItem(AUTH_CONSTANTS.STORAGE_KEYS.ACCESS_TOKEN, result.tokens.accessToken),
        AsyncStorage.setItem(AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN, result.tokens.refreshToken)
      ]);

      const tokenData = jwtDecode(result.tokens.accessToken);

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: result.user,
          tokens: result.tokens,
          sessionId: uuidv4(),
          faydaVerified: result.user.faydaVerified || false
        }
      });

      scheduleTokenRefresh(tokenData.exp);

      return result;

    } catch (error) {
      console.error('Login error:', error);
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: error.message }
      });
      throw error;
    }
  }, [state.lockUntil]);

  /**
   * 🎯 ENTERPRISE METHOD: Verify OTP
   */
  const verifyOTP = useCallback(async (otpData) => {
    dispatch({ type: AUTH_ACTIONS.OTP_VERIFICATION_START });

    try {
      const { phoneNumber, otpCode, operation } = otpData; // operation: 'login', 'register', 'reset_password'

      const response = await fetch(`${process.env.API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          otpCode,
          operation,
          traceId: uuidv4()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.errorCode === AUTH_CONSTANTS.ERROR_CODES.INVALID_OTP) {
          throw new Error('Invalid OTP code. Please try again.');
        }
        throw new Error(result.message || 'OTP verification failed');
      }

      dispatch({
        type: AUTH_ACTIONS.OTP_VERIFICATION_SUCCESS,
        payload: { operation }
      });

      return result;

    } catch (error) {
      console.error('OTP verification error:', error);
      dispatch({
        type: AUTH_ACTIONS.OTP_VERIFICATION_FAILURE,
        payload: { error: error.message }
      });
      throw error;
    }
  }, []);

  /**
   * 🎯 ENTERPRISE METHOD: Logout
   */
  const logout = useCallback(async () => {
    try {
      // Call logout endpoint to invalidate tokens
      const accessToken = await AsyncStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.ACCESS_TOKEN);
      
      if (accessToken) {
        await fetch(`${process.env.API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ traceId: uuidv4() })
        }).catch(error => {
          console.error('Logout API call failed:', error);
          // Continue with local logout even if API call fails
        });
      }

      // Clear all stored data
      await Promise.all([
        AsyncStorage.multiRemove([
          AUTH_CONSTANTS.STORAGE_KEYS.ACCESS_TOKEN,
          AUTH_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN,
          AUTH_CONSTANTS.STORAGE_KEYS.USER_DATA,
          AUTH_CONSTANTS.STORAGE_KEYS.SESSION_ID,
          AUTH_CONSTANTS.STORAGE_KEYS.BIOMETRIC_ENABLED
        ]),
        Keychain.resetGenericPassword()
      ]);

      // Clear any timeouts
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
      }

      dispatch({ type: AUTH_ACTIONS.LOGOUT });

    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if there are errors
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  }, []);

  /**
   * 🎯 ENTERPRISE METHOD: Enable Biometric Authentication
   */
  const enableBiometricAuth = useCallback(async (credentials) => {
    try {
      const supportedBiometry = await Keychain.getSupportedBiometryType();
      
      if (!supportedBiometry) {
        throw new Error('Biometric authentication is not available on this device');
      }

      // Store credentials in secure keychain
      await Keychain.setGenericPassword(
        credentials.identifier,
        credentials.password,
        {
          service: 'mosa_forge_auth',
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS
        }
      );

      await AsyncStorage.setItem(
        AUTH_CONSTANTS.STORAGE_KEYS.BIOMETRIC_ENABLED, 
        'true'
      );

      dispatch({
        type: AUTH_ACTIONS.BIOMETRIC_ENABLE,
        payload: { biometricType: supportedBiometry }
      });

    } catch (error) {
      console.error('Enable biometric error:', error);
      throw error;
    }
  }, []);

  /**
   * 🎯 ENTERPRISE METHOD: Disable Biometric Authentication
   */
  const disableBiometricAuth = useCallback(async () => {
    try {
      await Promise.all([
        Keychain.resetGenericPassword(),
        AsyncStorage.setItem(
          AUTH_CONSTANTS.STORAGE_KEYS.BIOMETRIC_ENABLED, 
          'false'
        )
      ]);

      dispatch({ type: AUTH_ACTIONS.BIOMETRIC_DISABLE });

    } catch (error) {
      console.error('Disable biometric error:', error);
      throw error;
    }
  }, []);

  /**
   * 🎯 ENTERPRISE METHOD: Update User Profile
   */
  const updateUserProfile = useCallback(async (updates) => {
    try {
      const accessToken = await AsyncStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.ACCESS_TOKEN);
      
      const response = await fetch(`${process.env.API_BASE_URL}/user/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...updates,
          traceId: uuidv4()
        })
      });

      if (!response.ok) {
        throw new Error('Profile update failed');
      }

      const result = await response.json();

      // Update local storage
      const currentUserData = await AsyncStorage.getItem(AUTH_CONSTANTS.STORAGE_KEYS.USER_DATA);
      const updatedUserData = {
        ...JSON.parse(currentUserData),
        ...result.user
      };

      await AsyncStorage.setItem(
        AUTH_CONSTANTS.STORAGE_KEYS.USER_DATA, 
        JSON.stringify(updatedUserData)
      );

      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER_PROFILE,
        payload: { updates: result.user }
      });

      return result;

    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  }, []);

  /**
   * 🏗️ Utility: Validate Fayda ID Format
   */
  const isValidFaydaId = (faydaId) => {
    // Ethiopian Fayda ID validation logic
    const faydaRegex = /^\d{10,15}$/; // Basic format check
    return faydaRegex.test(faydaId);
  };

  /**
   * 🏗️ Utility: Get Device Information
   */
  const getDeviceInfo = async () => {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      model: Platform.constants?.Model || 'unknown',
      brand: Platform.constants?.Brand || 'unknown',
      appVersion: process.env.APP_VERSION || '1.0.0',
      timestamp: new Date().toISOString()
    };
  };

  /**
   * 🏗️ Utility: Check Permission
   */
  const hasPermission = useCallback((permission) => {
    if (!state.user || !state.user.roles) return false;

    // Role-based permission checking
    const userRoles = state.user.roles;
    const permissions = getPermissionsForRoles(userRoles);

    return permissions.includes(permission);
  }, [state.user]);

  /**
   * 🏗️ Utility: Get Permissions for Roles
   */
  const getPermissionsForRoles = (roles) => {
    const rolePermissions = {
      [AUTH_CONSTANTS.ROLES.STUDENT]: [
        'enroll_course',
        'access_learning',
        'rate_expert',
        'view_progress'
      ],
      [AUTH_CONSTANTS.ROLES.EXPERT]: [
        'manage_students',
        'conduct_training',
        'view_earnings',
        'update_availability'
      ],
      [AUTH_CONSTANTS.ROLES.ADMIN]: [
        'manage_users',
        'view_analytics',
        'system_config',
        'all_permissions'
      ],
      [AUTH_CONSTANTS.ROLES.QUALITY_MANAGER]: [
        'monitor_quality',
        'manage_tiers',
        'review_experts'
      ],
      [AUTH_CONSTANTS.ROLES.FINANCE_MANAGER]: [
        'view_revenue',
        'process_payments',
        'financial_reports'
      ]
    };

    return roles.flatMap(role => rolePermissions[role] || []);
  };

  /**
   * 🏗️ Clear Error
   */
  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  // 🏗️ Effect: Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // 🏗️ Effect: Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' && state.isAuthenticated) {
        // Schedule token refresh check when app comes back to foreground
        // This handles cases where app was in background during token expiry
      }
    };

    appStateSubscriptionRef.current = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (appStateSubscriptionRef.current) {
        appStateSubscriptionRef.current.remove();
      }
    };
  }, [state.isAuthenticated]);

  // 🏗️ Effect: Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tokenRefreshTimeoutRef.current) {
        clearTimeout(tokenRefreshTimeoutRef.current);
      }
    };
  }, []);

  // 🏗️ Context Value
  const contextValue = {
    // State
    ...state,

    // Actions
    registerWithFayda,
    login,
    verifyOTP,
    logout,
    enableBiometricAuth,
    disableBiometricAuth,
    updateUserProfile,
    clearError,
    hasPermission,

    // Utilities
    isStudent: state.user?.roles?.includes(AUTH_CONSTANTS.ROLES.STUDENT),
    isExpert: state.user?.roles?.includes(AUTH_CONSTANTS.ROLES.EXPERT),
    isAdmin: state.user?.roles?.includes(AUTH_CONSTANTS.ROLES.ADMIN),
    isFaydaVerified: state.faydaVerified
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 🏗️ Custom Hook to Use Authentication Context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

/**
 * 🏗️ Higher-Order Component for Authentication Protection
 */
export const withAuth = (Component) => {
  return (props) => {
    const auth = useAuth();
    return <Component {...props} auth={auth} />;
  };
};

/**
 * 🏗️ Higher-Order Component for Role-Based Protection
 */
export const withRole = (requiredRole) => (Component) => {
  return (props) => {
    const auth = useAuth();
    
    if (!auth.isAuthenticated || !auth.user?.roles?.includes(requiredRole)) {
      // Show access denied or redirect
      return null;
    }
    
    return <Component {...props} />;
  };
};

export default AuthContext;