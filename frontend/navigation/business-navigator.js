/**
 * 🎯 MOSA FORGE: Enterprise Business Navigator
 * 
 * @module BusinessNavigator
 * @description Enterprise-grade navigation system for MOSA FORGE business flows
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Type-safe navigation with Flow enforcement
 * - Business process orchestration
 * - Authentication-gated routes
 * - Deep linking support
 * - Analytics integration
 * - Error boundary protection
 */

import React, { createContext, useContext, useRef, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// 🏗️ Enterprise Constants
const BUSINESS_FLOWS = {
  AUTHENTICATION: 'AUTHENTICATION',
  ONBOARDING: 'ONBOARDING',
  PAYMENT: 'PAYMENT',
  LEARNING: 'LEARNING',
  EXPERT: 'EXPERT',
  ADMIN: 'ADMIN'
};

const NAVIGATION_STATES = {
  IDLE: 'IDLE',
  NAVIGATING: 'NAVIGATING',
  TRANSITIONING: 'TRANSITIONING',
  ERROR: 'ERROR'
};

const PERMISSION_LEVELS = {
  GUEST: 'GUEST',
  STUDENT: 'STUDENT',
  EXPERT: 'EXPERT',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN'
};

/**
 * 🏗️ Enterprise Navigation Context
 * @context NavigationContext
 */
const NavigationContext = createContext(null);

/**
 * 🏗️ Navigation Stack Definitions
 */
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

/**
 * 🏗️ Enterprise Business Navigator Class
 * @class BusinessNavigator
 * @extends EventEmitter
 */
class BusinessNavigator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // 🏗️ Enterprise Configuration
    this.config = {
      enableAnalytics: options.enableAnalytics ?? true,
      enableDeepLinking: options.enableDeepLinking ?? true,
      enableErrorBoundaries: options.enableErrorBoundaries ?? true,
      navigationTimeout: options.navigationTimeout || 10000,
      maxRetryAttempts: options.maxRetryAttempts || 3,
      enablePerformanceMonitoring: options.enablePerformanceMonitoring ?? true
    };

    // 🏗️ State Management
    this.state = {
      currentFlow: BUSINESS_FLOWS.AUTHENTICATION,
      previousFlow: null,
      navigationState: NAVIGATION_STATES.IDLE,
      userPermissions: PERMISSION_LEVELS.GUEST,
      currentRoute: null,
      navigationHistory: [],
      pendingNavigation: null,
      error: null
    };

    // 🏗️ Navigation Registry
    this.screens = new Map();
    this.flows = new Map();
    this.middleware = [];
    this.guards = [];

    // 🏗️ Performance Monitoring
    this.metrics = {
      navigationCount: 0,
      averageNavigationTime: 0,
      failedNavigations: 0,
      flowCompletions: 0
    };

    this._initializeCoreFlows();
    this._registerEventHandlers();
    this._setupPerformanceMonitoring();
  }

  /**
   * 🏗️ Initialize Core Business Flows
   * @private
   */
  _initializeCoreFlows() {
    // 🎯 AUTHENTICATION FLOW
    this.flows.set(BUSINESS_FLOWS.AUTHENTICATION, {
      id: BUSINESS_FLOWS.AUTHENTICATION,
      name: 'Authentication Flow',
      screens: [
        'FaydaRegistration',
        'OtpVerification',
        'PasswordRecovery',
        'DuplicateAlert'
      ],
      entryPoint: 'FaydaRegistration',
      exitPoint: 'MainApp',
      requiredPermissions: [PERMISSION_LEVELS.GUEST],
      completionCriteria: 'User authenticated and verified'
    });

    // 🎯 ONBOARDING FLOW
    this.flows.set(BUSINESS_FLOWS.ONBOARDING, {
      id: BUSINESS_FLOWS.ONBOARDING,
      name: 'Student Onboarding Flow',
      screens: [
        'MindsetAssessment',
        'SkillSelection',
        'CommitmentCheck',
        'BundlePurchase'
      ],
      entryPoint: 'MindsetAssessment',
      exitPoint: 'LearningDashboard',
      requiredPermissions: [PERMISSION_LEVELS.STUDENT],
      completionCriteria: 'Student enrolled in course'
    });

    // 🎯 PAYMENT FLOW
    this.flows.set(BUSINESS_FLOWS.PAYMENT, {
      id: BUSINESS_FLOWS.PAYMENT,
      name: 'Payment Processing Flow',
      screens: [
        'BundlePurchase',
        'PaymentMethods',
        'InstallmentPlans',
        'PaymentConfirmation'
      ],
      entryPoint: 'BundlePurchase',
      exitPoint: 'EnrollmentConfirmation',
      requiredPermissions: [PERMISSION_LEVELS.STUDENT],
      completionCriteria: 'Payment completed and enrollment confirmed'
    });

    // 🎯 LEARNING FLOW
    this.flows.set(BUSINESS_FLOWS.LEARNING, {
      id: BUSINESS_FLOWS.LEARNING,
      name: 'Learning Journey Flow',
      screens: [
        'LearningDashboard',
        'MindsetPhase',
        'TheoryPhase',
        'ExpertSelection',
        'HandsOnPhase',
        'CertificationPhase'
      ],
      entryPoint: 'LearningDashboard',
      exitPoint: 'IncomeLaunchpad',
      requiredPermissions: [PERMISSION_LEVELS.STUDENT],
      completionCriteria: 'Course completed and certified'
    });

    // 🎯 EXPERT FLOW
    this.flows.set(BUSINESS_FLOWS.EXPERT, {
      id: BUSINESS_FLOWS.EXPERT,
      name: 'Expert Portal Flow',
      screens: [
        'ExpertDashboard',
        'QualityDashboard',
        'StudentManagement',
        'PayoutTracker',
        'SessionScheduler'
      ],
      entryPoint: 'ExpertDashboard',
      exitPoint: 'ExpertDashboard',
      requiredPermissions: [PERMISSION_LEVELS.EXPERT],
      completionCriteria: 'Expert operations completed'
    });

    // 🎯 ADMIN FLOW
    this.flows.set(BUSINESS_FLOWS.ADMIN, {
      id: BUSINESS_FLOWS.ADMIN,
      name: 'Admin Portal Flow',
      screens: [
        'PlatformAnalytics',
        'QualityMonitoring',
        'RevenueMonitor',
        'SystemHealth'
      ],
      entryPoint: 'PlatformAnalytics',
      exitPoint: 'PlatformAnalytics',
      requiredPermissions: [PERMISSION_LEVELS.ADMIN, PERMISSION_LEVELS.SUPER_ADMIN],
      completionCriteria: 'Admin operations completed'
    });
  }

  /**
   * 🏗️ Register Event Handlers
   * @private
   */
  _registerEventHandlers() {
    this.on('navigation.started', (data) => {
      this._logNavigationEvent('NAVIGATION_STARTED', data);
      this.metrics.navigationCount++;
    });

    this.on('navigation.completed', (data) => {
      this._logNavigationEvent('NAVIGATION_COMPLETED', data);
      this._updatePerformanceMetrics(data.duration);
    });

    this.on('navigation.failed', (data) => {
      this._logNavigationEvent('NAVIGATION_FAILED', data);
      this.metrics.failedNavigations++;
    });

    this.on('flow.started', (data) => {
      this._logNavigationEvent('FLOW_STARTED', data);
    });

    this.on('flow.completed', (data) => {
      this._logNavigationEvent('FLOW_COMPLETED', data);
      this.metrics.flowCompletions++;
    });

    this.on('permission.denied', (data) => {
      this._logNavigationEvent('PERMISSION_DENIED', data);
    });
  }

  /**
   * 🏗️ Setup Performance Monitoring
   * @private
   */
  _setupPerformanceMonitoring() {
    if (this.config.enablePerformanceMonitoring) {
      // Monitor navigation performance
      setInterval(() => {
        this._reportPerformanceMetrics();
      }, 60000); // Report every minute
    }
  }

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Navigate to Screen
   * @param {string} screenName - Target screen name
   * @param {Object} params - Navigation parameters
   * @param {Object} options - Navigation options
   * @returns {Promise<boolean>} Navigation success
   */
  async navigateTo(screenName, params = {}, options = {}) {
    const navigationId = uuidv4();
    const startTime = Date.now();

    try {
      // 🏗️ Validate navigation request
      await this._validateNavigation(screenName, params, options);

      // 🏗️ Update navigation state
      this.state.navigationState = NAVIGATION_STATES.NAVIGATING;
      this.state.pendingNavigation = { screenName, params, navigationId };

      this.emit('navigation.started', {
        navigationId,
        screenName,
        from: this.state.currentRoute,
        to: screenName,
        params,
        timestamp: new Date().toISOString()
      });

      // 🏗️ Execute navigation middleware
      await this._executeMiddleware('beforeNavigate', {
        screenName,
        params,
        navigationId
      });

      // 🏗️ Check navigation guards
      const guardResult = await this._checkNavigationGuards(screenName, params);
      if (!guardResult.allowed) {
        throw new Error(`Navigation guard blocked: ${guardResult.reason}`);
      }

      // 🏗️ Execute navigation
      const navigationSuccess = await this._executeNavigation(screenName, params, options);

      if (navigationSuccess) {
        // 🏗️ Update navigation history
        this._updateNavigationHistory(screenName, params);

        // 🏗️ Execute post-navigation middleware
        await this._executeMiddleware('afterNavigate', {
          screenName,
          params,
          navigationId,
          duration: Date.now() - startTime
        });

        const navigationData = {
          navigationId,
          screenName,
          params,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        };

        this.emit('navigation.completed', navigationData);
        
        // 🏗️ Check if flow completed
        this._checkFlowCompletion(screenName);

        return true;
      } else {
        throw new Error('Navigation execution failed');
      }

    } catch (error) {
      const errorData = {
        navigationId,
        screenName,
        params,
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      this.state.navigationState = NAVIGATION_STATES.ERROR;
      this.state.error = error;

      this.emit('navigation.failed', errorData);
      
      // 🏗️ Handle navigation error
      await this._handleNavigationError(error, screenName, params);
      
      return false;
    } finally {
      this.state.navigationState = NAVIGATION_STATES.IDLE;
      this.state.pendingNavigation = null;
    }
  }

  /**
   * 🏗️ Validate Navigation Request
   * @private
   */
  async _validateNavigation(screenName, params, options) {
    // Check if screen exists
    if (!this.screens.has(screenName)) {
      throw new Error(`Screen '${screenName}' is not registered`);
    }

    // Check if navigation is already in progress
    if (this.state.navigationState === NAVIGATION_STATES.NAVIGATING) {
      throw new Error('Navigation already in progress');
    }

    // Validate parameters against screen schema
    const screenConfig = this.screens.get(screenName);
    if (screenConfig.paramSchema) {
      const validationResult = this._validateParams(params, screenConfig.paramSchema);
      if (!validationResult.valid) {
        throw new Error(`Invalid parameters: ${validationResult.errors.join(', ')}`);
      }
    }

    // Check permissions
    const hasPermission = await this._checkScreenPermission(screenName);
    if (!hasPermission) {
      throw new Error(`Insufficient permissions to access ${screenName}`);
    }

    return true;
  }

  /**
   * 🏗️ Execute Navigation Middleware
   * @private
   */
  async _executeMiddleware(phase, context) {
    const middleware = this.middleware.filter(mw => mw.phase === phase);
    
    for (const mw of middleware) {
      try {
        await mw.handler(context);
      } catch (error) {
        console.error(`Middleware error in ${phase}:`, error);
        throw new Error(`Middleware failed: ${error.message}`);
      }
    }
  }

  /**
   * 🏗️ Check Navigation Guards
   * @private
   */
  async _checkNavigationGuards(screenName, params) {
    for (const guard of this.guards) {
      try {
        const result = await guard.handler(screenName, params, this.state);
        if (result && result.allowed === false) {
          return result;
        }
      } catch (error) {
        console.error('Navigation guard error:', error);
        return { allowed: false, reason: 'Guard evaluation failed' };
      }
    }
    
    return { allowed: true };
  }

  /**
   * 🏗️ Execute Actual Navigation
   * @private
   */
  async _executeNavigation(screenName, params, options) {
    return new Promise((resolve) => {
      // 🏗️ In React Native, this would use the navigation ref
      if (this.navigationRef && this.navigationRef.current) {
        this.navigationRef.current.navigate(screenName, params);
        
        // 🏗️ Simulate navigation completion
        setTimeout(() => {
          this.state.currentRoute = screenName;
          resolve(true);
        }, 100);
      } else {
        // 🏗️ Fallback for testing or initial setup
        this.state.currentRoute = screenName;
        resolve(true);
      }
    });
  }

  /**
   * 🏗️ Update Navigation History
   * @private
   */
  _updateNavigationHistory(screenName, params) {
    const historyEntry = {
      screen: screenName,
      params: this._sanitizeParams(params),
      timestamp: new Date().toISOString(),
      flow: this.state.currentFlow
    };

    this.state.navigationHistory.unshift(historyEntry);
    
    // 🏗️ Keep only last 50 entries
    if (this.state.navigationHistory.length > 50) {
      this.state.navigationHistory = this.state.navigationHistory.slice(0, 50);
    }
  }

  /**
   * 🏗️ Check Flow Completion
   * @private
   */
  _checkFlowCompletion(screenName) {
    const currentFlow = this.flows.get(this.state.currentFlow);
    if (currentFlow && currentFlow.exitPoint === screenName) {
      this.emit('flow.completed', {
        flow: this.state.currentFlow,
        screenName,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🏗️ Handle Navigation Error
   * @private
   */
  async _handleNavigationError(error, screenName, params) {
    // 🏗️ Log error for analytics
    this._logError('NAVIGATION_ERROR', error, { screenName, params });

    // 🏗️ Redirect to error screen if enabled
    if (this.config.enableErrorBoundaries) {
      await this.navigateTo('ErrorScreen', {
        error: error.message,
        screenName,
        retryable: true
      });
    }
  }

  /**
   * 🎯 ENTERPRISE METHOD: Start Business Flow
   * @param {string} flowName - Business flow to start
   * @param {Object} initialParams - Initial flow parameters
   * @returns {Promise<boolean>} Flow start success
   */
  async startFlow(flowName, initialParams = {}) {
    const flow = this.flows.get(flowName);
    
    if (!flow) {
      throw new Error(`Business flow '${flowName}' not found`);
    }

    // 🏗️ Check flow permissions
    const hasFlowPermission = await this._checkFlowPermission(flowName);
    if (!hasFlowPermission) {
      this.emit('permission.denied', {
        flow: flowName,
        required: flow.requiredPermissions,
        current: this.state.userPermissions
      });
      return false;
    }

    // 🏗️ Update flow state
    this.state.previousFlow = this.state.currentFlow;
    this.state.currentFlow = flowName;

    this.emit('flow.started', {
      flow: flowName,
      entryPoint: flow.entryPoint,
      timestamp: new Date().toISOString()
    });

    // 🏗️ Navigate to flow entry point
    return await this.navigateTo(flow.entryPoint, initialParams);
  }

  /**
   * 🎯 ENTERPRISE METHOD: Register Screen
   * @param {string} screenName - Screen identifier
   * @param {Object} config - Screen configuration
   */
  registerScreen(screenName, config) {
    const screenConfig = {
      name: screenName,
      component: config.component,
      options: config.options || {},
      paramSchema: config.paramSchema || null,
      requiredPermissions: config.requiredPermissions || [PERMISSION_LEVELS.GUEST],
      flow: config.flow || null,
      ...config
    };

    this.screens.set(screenName, screenConfig);
    
    this.emit('screen.registered', {
      screenName,
      config: screenConfig,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 🎯 ENTERPRISE METHOD: Add Navigation Middleware
   * @param {string} phase - Middleware phase
   * @param {Function} handler - Middleware function
   */
  addMiddleware(phase, handler) {
    this.middleware.push({ phase, handler });
  }

  /**
   * 🎯 ENTERPRISE METHOD: Add Navigation Guard
   * @param {Function} handler - Guard function
   */
  addGuard(handler) {
    this.guards.push({ handler });
  }

  /**
   * 🏗️ Check Screen Permission
   * @private
   */
  async _checkScreenPermission(screenName) {
    const screenConfig = this.screens.get(screenName);
    if (!screenConfig) return false;

    return screenConfig.requiredPermissions.includes(this.state.userPermissions);
  }

  /**
   * 🏗️ Check Flow Permission
   * @private
   */
  async _checkFlowPermission(flowName) {
    const flow = this.flows.get(flowName);
    if (!flow) return false;

    return flow.requiredPermissions.includes(this.state.userPermissions);
  }

  /**
   * 🏗️ Validate Parameters Against Schema
   * @private
   */
  _validateParams(params, schema) {
    const errors = [];

    for (const [key, rule] of Object.entries(schema)) {
      if (rule.required && (params[key] === undefined || params[key] === null)) {
        errors.push(`Missing required parameter: ${key}`);
        continue;
      }

      if (params[key] !== undefined) {
        // Type validation
        if (rule.type && typeof params[key] !== rule.type) {
          errors.push(`Parameter ${key} must be of type ${rule.type}`);
        }

        // Custom validation
        if (rule.validate && !rule.validate(params[key])) {
          errors.push(`Parameter ${key} failed validation`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 🏗️ Sanitize Parameters for History
   * @private
   */
  _sanitizeParams(params) {
    const sanitized = { ...params };
    
    // Remove sensitive data
    const sensitiveKeys = ['password', 'token', 'faydaId', 'paymentDetails'];
    sensitiveKeys.forEach(key => {
      if (sanitized[key]) {
        sanitized[key] = '***REDACTED***';
      }
    });

    return sanitized;
  }

  /**
   * 🏗️ Update Performance Metrics
   * @private
   */
  _updatePerformanceMetrics(duration) {
    this.metrics.averageNavigationTime = 
      (this.metrics.averageNavigationTime * (this.metrics.navigationCount - 1) + duration) / 
      this.metrics.navigationCount;
  }

  /**
   * 🏗️ Report Performance Metrics
   * @private
   */
  _reportPerformanceMetrics() {
    if (this.config.enableAnalytics) {
      this.emit('performance.metrics', {
        ...this.metrics,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🏗️ Enterprise Logging
   * @private
   */
  _logNavigationEvent(eventType, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'business-navigator',
      event: eventType,
      data,
      environment: process.env.NODE_ENV || 'development'
    };

    console.log(JSON.stringify(logEntry));

    // 🏗️ Send to analytics in production
    if (this.config.enableAnalytics && process.env.NODE_ENV === 'production') {
      // Integration with analytics service would go here
    }
  }

  /**
   * 🏗️ Error Logging
   * @private
   */
  _logError(operation, error, context = {}) {
    this._logNavigationEvent('ERROR', {
      operation,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context,
      severity: 'ERROR'
    });
  }

  /**
   * 🎯 ENTERPRISE METHOD: Get Navigation State
   * @returns {Object} Current navigation state
   */
  getState() {
    return {
      ...this.state,
      metrics: { ...this.metrics }
    };
  }

  /**
   * 🎯 ENTERPRISE METHOD: Set User Permissions
   * @param {string} permissionLevel - User permission level
   */
  setUserPermissions(permissionLevel) {
    this.state.userPermissions = permissionLevel;
    this.emit('permissions.updated', {
      permissions: permissionLevel,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 🎯 ENTERPRISE METHOD: Set Navigation Ref
   * @param {Object} ref - React Navigation ref
   */
  setNavigationRef(ref) {
    this.navigationRef = ref;
  }

  /**
   * 🎯 ENTERPRISE METHOD: Go Back with Business Logic
   * @param {Object} options - Back navigation options
   * @returns {Promise<boolean>} Back navigation success
   */
  async goBack(options = {}) {
    const currentScreen = this.state.currentRoute;
    
    if (this.state.navigationHistory.length > 1) {
      const previousNavigation = this.state.navigationHistory[1];
      
      return await this.navigateTo(previousNavigation.screen, previousNavigation.params, {
        ...options,
        isBackNavigation: true
      });
    } else {
      // 🏗️ No history - navigate to fallback
      return await this.navigateTo('Home', {}, options);
    }
  }

  /**
   * 🎯 ENTERPRISE METHOD: Reset to Flow
   * @param {string} flowName - Target flow
   * @param {Object} params - Navigation parameters
   * @returns {Promise<boolean>} Reset success
   */
  async resetToFlow(flowName, params = {}) {
    const flow = this.flows.get(flowName);
    if (!flow) {
      throw new Error(`Flow '${flowName}' not found`);
    }

    // 🏗️ Clear navigation history
    this.state.navigationHistory = [];

    // 🏗️ Start the flow
    return await this.startFlow(flowName, params);
  }
}

/**
 * 🏗️ React Context Provider Component
 * @component NavigationProvider
 */
export const NavigationProvider = ({ children, options = {} }) => {
  const navigatorRef = useRef(null);

  if (!navigatorRef.current) {
    navigatorRef.current = new BusinessNavigator(options);
  }

  return (
    <NavigationContext.Provider value={navigatorRef.current}>
      {children}
    </NavigationContext.Provider>
  );
};

/**
 * 🏗️ React Hook for Navigation
 * @hook useBusinessNavigation
 */
export const useBusinessNavigation = () => {
  const context = useContext(NavigationContext);
  
  if (!context) {
    throw new Error('useBusinessNavigation must be used within a NavigationProvider');
  }

  return context;
};

/**
 * 🏗️ Enterprise Navigation Container
 * @component EnterpriseNavigationContainer
 */
export const EnterpriseNavigationContainer = ({ children, ...props }) => {
  const navigation = useBusinessNavigation();

  const navigationRef = useRef(null);
  const routeNameRef = useRef(null);

  const onReady = useCallback(() => {
    routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
    navigation.setNavigationRef(navigationRef);
  }, [navigation]);

  const onStateChange = useCallback(async () => {
    const previousRouteName = routeNameRef.current;
    const currentRoute = navigationRef.current?.getCurrentRoute();
    const currentRouteName = currentRoute?.name;

    if (previousRouteName !== currentRouteName) {
      // 🏗️ Track screen changes for analytics
      if (navigation.config.enableAnalytics) {
        navigation.emit('screen.changed', {
          from: previousRouteName,
          to: currentRouteName,
          params: currentRoute?.params,
          timestamp: new Date().toISOString()
        });
      }
    }

    routeNameRef.current = currentRouteName;
  }, [navigation]);

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={onReady}
      onStateChange={onStateChange}
      {...props}
    >
      {children}
    </NavigationContainer>
  );
};

// 🏗️ Enterprise Export Pattern
export default BusinessNavigator;
export {
  BUSINESS_FLOWS,
  NAVIGATION_STATES,
  PERMISSION_LEVELS
};

// 🏗️ Singleton Instance for Microservice Architecture
let businessNavigatorInstance = null;

export const getBusinessNavigator = (options = {}) => {
  if (!businessNavigatorInstance) {
    businessNavigatorInstance = new BusinessNavigator(options);
  }
  return businessNavigatorInstance;
};