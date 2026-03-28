// navigation/learning-navigator.js

/**
 * 🎯 ENTERPRISE LEARNING NAVIGATOR
 * Production-ready navigation system for Mosa Forge learning journey
 * Features: Deep linking, progress tracking, offline support, seamless transitions
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { createRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { NavigationMonitor } from '../utils/navigation-monitor';
import { OfflineManager } from '../utils/offline-manager';

// Navigation Stack Instances
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

class LearningNavigator extends EventEmitter {
  constructor() {
    super();
    this.logger = new Logger('LearningNavigator');
    this.navigationMonitor = new NavigationMonitor();
    this.offlineManager = new OfflineManager();
    
    // Navigation state management
    this.navigationState = {
      currentRoute: null,
      previousRoute: null,
      progressData: {},
      sessionData: {},
      navigationHistory: [],
      isInitialized: false
    };

    // Screen references for direct navigation
    this.screenRefs = new Map();
    
    // Navigation configuration
    this.config = {
      animationEnabled: true,
      gestureEnabled: true,
      headerMode: 'float',
      deepLinkingEnabled: true,
      offlineFallback: true,
      performanceMonitoring: true
    };

    this.initialize();
  }

  /**
   * Initialize navigation system
   */
  async initialize() {
    try {
      await this.navigationMonitor.initialize();
      await this.setupDeepLinking();
      await this.loadNavigationState();
      
      this.navigationState.isInitialized = true;
      this.logger.info('Learning navigator initialized successfully');
      
      this.emit('navigatorReady');
    } catch (error) {
      this.logger.error('Failed to initialize learning navigator', error);
      throw error;
    }
  }

  /**
   * 🎯 MAIN LEARNING NAVIGATOR COMPONENT
   */
  LearningNavigatorComponent = () => {
    return (
      <NavigationContainer
        ref={this.navigationRef}
        onReady={this.handleNavigationReady}
        onStateChange={this.handleNavigationStateChange}
        linking={this.linkingConfig}
        fallback={this.renderFallbackScreen}
        theme={this.navigationTheme}
      >
        <Stack.Navigator
          initialRouteName="LearningDashboard"
          screenOptions={this.globalScreenOptions}
          screenListeners={this.globalScreenListeners}
        >
          {/* 🏠 MAIN LEARNING FLOW */}
          <Stack.Screen
            name="LearningDashboard"
            component={this.LearningDashboardScreen}
            options={this.dashboardOptions}
          />
          
          {/* 🧠 MINDSET PHASE STACK */}
          <Stack.Screen
            name="MindsetStack"
            component={this.MindsetStackNavigator}
            options={this.mindsetStackOptions}
          />
          
          {/* 📚 THEORY PHASE STACK */}
          <Stack.Screen
            name="TheoryStack"
            component={this.TheoryStackNavigator}
            options={this.theoryStackOptions}
          />
          
          {/* 🏋️ HANDS-ON PHASE STACK */}
          <Stack.Screen
            name="HandsOnStack"
            component={this.HandsOnStackNavigator}
            options={this.handsOnStackOptions}
          />
          
          {/* 🏆 CERTIFICATION STACK */}
          <Stack.Screen
            name="CertificationStack"
            component={this.CertificationStackNavigator}
            options={this.certificationStackOptions}
          />
          
          {/* 🔧 UTILITY SCREENS */}
          <Stack.Screen
            name="ExercisePlayer"
            component={this.ExercisePlayerScreen}
            options={this.exercisePlayerOptions}
          />
          
          <Stack.Screen
            name="ProgressAnalytics"
            component={this.ProgressAnalyticsScreen}
            options={this.analyticsOptions}
          />
          
          <Stack.Screen
            name="OfflineMode"
            component={this.OfflineModeScreen}
            options={this.offlineOptions}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  };

  /**
   * 🧠 MINDSET PHASE STACK NAVIGATOR
   */
  MindsetStackNavigator = () => {
    return (
      <Stack.Navigator
        screenOptions={this.mindsetScreenOptions}
        initialRouteName="MindsetAssessment"
      >
        <Stack.Screen
          name="MindsetAssessment"
          component={this.MindsetAssessmentScreen}
          options={this.assessmentOptions}
        />
        
        <Stack.Screen
          name="WealthConsciousness"
          component={this.WealthConsciousnessScreen}
          options={this.wealthConsciousnessOptions}
        />
        
        <Stack.Screen
          name="DisciplineBuilding"
          component={this.DisciplineBuildingScreen}
          options={this.disciplineBuildingOptions}
        />
        
        <Stack.Screen
          name="ActionTaking"
          component={this.ActionTakingScreen}
          options={this.actionTakingOptions}
        />
        
        <Stack.Screen
          name="FinancialPsychology"
          component={this.FinancialPsychologyScreen}
          options={this.financialPsychologyOptions}
        />
        
        <Stack.Screen
          name="MindsetCompletion"
          component={this.MindsetCompletionScreen}
          options={this.completionOptions}
        />
      </Stack.Navigator>
    );
  };

  /**
   * 📚 THEORY PHASE STACK NAVIGATOR
   */
  TheoryStackNavigator = () => {
    return (
      <Stack.Navigator
        screenOptions={this.theoryScreenOptions}
        initialRouteName="TheoryDashboard"
      >
        <Stack.Screen
          name="TheoryDashboard"
          component={this.TheoryDashboardScreen}
          options={this.theoryDashboardOptions}
        />
        
        <Stack.Screen
          name="DuolingoInterface"
          component={this.DuolingoInterfaceScreen}
          options={this.duolingoInterfaceOptions}
        />
        
        <Stack.Screen
          name="ExerciseCategory"
          component={this.ExerciseCategoryScreen}
          options={this.exerciseCategoryOptions}
        />
        
        <Stack.Screen
          name="DecisionScenario"
          component={this.DecisionScenarioScreen}
          options={this.decisionScenarioOptions}
        />
        
        <Stack.Screen
          name="RealtimeCharts"
          component={this.RealtimeChartsScreen}
          options={this.realtimeChartsOptions}
        />
        
        <Stack.Screen
          name="ProgressReview"
          component={this.ProgressReviewScreen}
          options={this.progressReviewOptions}
        />
      </Stack.Navigator>
    );
  };

  /**
   * 🏋️ HANDS-ON PHASE STACK NAVIGATOR
   */
  HandsOnStackNavigator = () => {
    return (
      <Stack.Navigator
        screenOptions={this.handsOnScreenOptions}
        initialRouteName="ExpertSelection"
      >
        <Stack.Screen
          name="ExpertSelection"
          component={this.ExpertSelectionScreen}
          options={this.expertSelectionOptions}
        />
        
        <Stack.Screen
          name="ExpertCatalog"
          component={this.ExpertCatalogScreen}
          options={this.expertCatalogOptions}
        />
        
        <Stack.Screen
          name="ExpertProfile"
          component={this.ExpertProfileScreen}
          options={this.expertProfileOptions}
        />
        
        <Stack.Screen
          name="TrainingDashboard"
          component={this.TrainingDashboardScreen}
          options={this.trainingDashboardOptions}
        />
        
        <Stack.Screen
          name="SessionJoiner"
          component={this.SessionJoinerScreen}
          options={this.sessionJoinerOptions}
        />
        
        <Stack.Screen
          name="PracticalWorkspace"
          component={this.PracticalWorkspaceScreen}
          options={this.practicalWorkspaceOptions}
        />
        
        <Stack.Screen
          name="ProgressVerification"
          component={this.ProgressVerificationScreen}
          options={this.progressVerificationOptions}
        />
      </Stack.Navigator>
    );
  };

  /**
   * 🏆 CERTIFICATION STACK NAVIGATOR
   */
  CertificationStackNavigator = () => {
    return (
      <Stack.Navigator
        screenOptions={this.certificationScreenOptions}
        initialRouteName="FinalAssessment"
      >
        <Stack.Screen
          name="FinalAssessment"
          component={this.FinalAssessmentScreen}
          options={this.finalAssessmentOptions}
        />
        
        <Stack.Screen
          name="CertificateView"
          component={this.CertificateViewScreen}
          options={this.certificateViewOptions}
        />
        
        <Stack.Screen
          name="YachiIntegration"
          component={this.YachiIntegrationScreen}
          options={this.yachiIntegrationOptions}
        />
        
        <Stack.Screen
          name="IncomeLaunchpad"
          component={this.IncomeLaunchpadScreen}
          options={this.incomeLaunchpadOptions}
        />
        
        <Stack.Screen
          name="CareerPathways"
          component={this.CareerPathwaysScreen}
          options={this.careerPathwaysOptions}
        />
      </Stack.Navigator>
    );
  };

  /**
   * 🎯 NAVIGATION CONFIGURATION
   */
  linkingConfig = {
    prefixes: ['mosaforge://', 'https://mosaforge.com', 'https://app.mosaforge.com'],
    config: {
      screens: {
        // Deep linking configuration
        LearningDashboard: 'dashboard',
        MindsetStack: {
          path: 'mindset',
          screens: {
            MindsetAssessment: 'assessment',
            WealthConsciousness: 'wealth',
            DisciplineBuilding: 'discipline',
            ActionTaking: 'action',
            FinancialPsychology: 'psychology',
            MindsetCompletion: 'completion'
          }
        },
        TheoryStack: {
          path: 'theory',
          screens: {
            TheoryDashboard: 'dashboard',
            DuolingoInterface: 'exercises',
            ExerciseCategory: 'category/:categoryId',
            DecisionScenario: 'scenario/:scenarioId',
            RealtimeCharts: 'charts',
            ProgressReview: 'progress'
          }
        },
        HandsOnStack: {
          path: 'hands-on',
          screens: {
            ExpertSelection: 'select-expert',
            ExpertCatalog: 'catalog',
            ExpertProfile: 'expert/:expertId',
            TrainingDashboard: 'training',
            SessionJoiner: 'session/:sessionId',
            PracticalWorkspace: 'workspace',
            ProgressVerification: 'verification'
          }
        },
        CertificationStack: {
          path: 'certification',
          screens: {
            FinalAssessment: 'assessment',
            CertificateView: 'certificate',
            YachiIntegration: 'yachi',
            IncomeLaunchpad: 'launchpad',
            CareerPathways: 'career'
          }
        },
        ExercisePlayer: 'exercise/:exerciseId',
        ProgressAnalytics: 'analytics',
        OfflineMode: 'offline'
      }
    }
  };

  /**
   * 🎨 NAVIGATION THEME
   */
  navigationTheme = {
    dark: false,
    colors: {
      primary: '#10B981', // Mosa brand green
      background: '#F8FAFC',
      card: '#FFFFFF',
      text: '#1E293B',
      border: '#E2E8F0',
      notification: '#EF4444',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444'
    },
    fonts: {
      regular: 'Inter-Regular',
      medium: 'Inter-Medium',
      bold: 'Inter-Bold',
      heavy: 'Inter-Black'
    }
  };

  /**
   * ⚙️ GLOBAL SCREEN OPTIONS
   */
  globalScreenOptions = {
    // Animation configurations
    animation: 'slide_from_right',
    animationDuration: 300,
    gestureEnabled: true,
    gestureDirection: 'horizontal',
    
    // Header configurations
    headerStyle: {
      backgroundColor: '#FFFFFF',
      elevation: 0,
      shadowOpacity: 0,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0'
    },
    headerTitleStyle: {
      fontFamily: 'Inter-Medium',
      fontSize: 18,
      color: '#1E293B'
    },
    headerTintColor: '#10B981',
    headerBackTitleVisible: false,
    
    // Content configurations
    contentStyle: {
      backgroundColor: '#F8FAFC'
    },
    
    // Performance optimizations
    freezeOnBlur: true,
    detachInactiveScreens: true
  };

  /**
   * 🎧 GLOBAL SCREEN LISTENERS
   */
  globalScreenListeners = {
    focus: (e) => {
      this.handleScreenFocus(e);
    },
    blur: (e) => {
      this.handleScreenBlur(e);
    },
    beforeRemove: (e) => {
      this.handleBeforeRemove(e);
    },
    transitionStart: (e) => {
      this.handleTransitionStart(e);
    },
    transitionEnd: (e) => {
      this.handleTransitionEnd(e);
    }
  };

  /**
   * 🧠 MINDSET SCREEN OPTIONS
   */
  mindsetScreenOptions = {
    ...this.globalScreenOptions,
    headerStyle: {
      backgroundColor: '#DBEAFE',
      elevation: 0,
      shadowOpacity: 0
    },
    headerTintColor: '#1D4ED8'
  };

  assessmentOptions = {
    title: 'Mindset Assessment',
    headerShown: true,
    animation: 'fade'
  };

  wealthConsciousnessOptions = {
    title: 'Wealth Consciousness',
    headerShown: true
  };

  disciplineBuildingOptions = {
    title: 'Discipline Building',
    headerShown: true
  };

  actionTakingOptions = {
    title: 'Action Taking',
    headerShown: true
  };

  financialPsychologyOptions = {
    title: 'Financial Psychology',
    headerShown: true
  };

  completionOptions = {
    title: 'Mindset Complete',
    headerShown: true,
    gestureEnabled: false // Prevent going back after completion
  };

  /**
   * 📚 THEORY SCREEN OPTIONS
   */
  theoryScreenOptions = {
    ...this.globalScreenOptions,
    headerStyle: {
      backgroundColor: '#D1FAE5',
      elevation: 0,
      shadowOpacity: 0
    },
    headerTintColor: '#047857'
  };

  theoryDashboardOptions = {
    title: 'Theory Phase',
    headerShown: true
  };

  duolingoInterfaceOptions = {
    title: 'Interactive Exercises',
    headerShown: true,
    animation: 'none' // Better for exercise transitions
  };

  exerciseCategoryOptions = {
    title: 'Exercise Category',
    headerShown: true
  };

  decisionScenarioOptions = {
    title: 'Decision Scenario',
    headerShown: false, // Full screen for scenarios
    animation: 'fade'
  };

  realtimeChartsOptions = {
    title: 'Live Trading Charts',
    headerShown: true,
    orientation: 'landscape' // Force landscape for charts
  };

  progressReviewOptions = {
    title: 'Progress Review',
    headerShown: true
  };

  /**
   * 🏋️ HANDS-ON SCREEN OPTIONS
   */
  handsOnScreenOptions = {
    ...this.globalScreenOptions,
    headerStyle: {
      backgroundColor: '#FEF3C7',
      elevation: 0,
      shadowOpacity: 0
    },
    headerTintColor: '#D97706'
  };

  expertSelectionOptions = {
    title: 'Choose Your Expert',
    headerShown: true
  };

  expertCatalogOptions = {
    title: 'Expert Directory',
    headerShown: true
  };

  expertProfileOptions = {
    title: 'Expert Profile',
    headerShown: true
  };

  trainingDashboardOptions = {
    title: 'Training Dashboard',
    headerShown: true
  };

  sessionJoinerOptions = {
    title: 'Training Session',
    headerShown: false, // Full screen for sessions
    animation: 'fade'
  };

  practicalWorkspaceOptions = {
    title: 'Practical Workspace',
    headerShown: true,
    orientation: 'all'
  };

  progressVerificationOptions = {
    title: 'Progress Verification',
    headerShown: true
  };

  /**
   * 🏆 CERTIFICATION SCREEN OPTIONS
   */
  certificationScreenOptions = {
    ...this.globalScreenOptions,
    headerStyle: {
      backgroundColor: '#E0E7FF',
      elevation: 0,
      shadowOpacity: 0
    },
    headerTintColor: '#3730A3'
  };

  finalAssessmentOptions = {
    title: 'Final Assessment',
    headerShown: true,
    gestureEnabled: false // Prevent navigation during assessment
  };

  certificateViewOptions = {
    title: 'Your Certificate',
    headerShown: true,
    gestureEnabled: false // Celebrate completion
  };

  yachiIntegrationOptions = {
    title: 'Yachi Verification',
    headerShown: true
  };

  incomeLaunchpadOptions = {
    title: 'Income Launchpad',
    headerShown: true
  };

  careerPathwaysOptions = {
    title: 'Career Pathways',
    headerShown: true
  };

  /**
   * 🔧 UTILITY SCREEN OPTIONS
   */
  exercisePlayerOptions = {
    title: 'Exercise Player',
    headerShown: false,
    animation: 'none'
  };

  analyticsOptions = {
    title: 'Progress Analytics',
    headerShown: true
  };

  offlineOptions = {
    title: 'Offline Mode',
    headerShown: true,
    gestureEnabled: false
  };

  /**
   * 🎯 NAVIGATION METHODS
   */

  /**
   * Navigate to specific screen with parameters
   */
  navigate = (screenName, params = {}, options = {}) => {
    if (!this.navigationRef.current) {
      this.logger.warn('Navigation ref not ready, queuing navigation', { screenName });
      this.queuedNavigation = { screenName, params, options };
      return;
    }

    try {
      this.navigationRef.current.navigate(screenName, params);
      this.logger.debug('Navigation executed', { screenName, params });
      
      // Track navigation for analytics
      this.navigationMonitor.trackNavigation(screenName, params);
      
    } catch (error) {
      this.logger.error('Navigation failed', error, { screenName, params });
      throw error;
    }
  };

  /**
   * Navigate to mindset phase
   */
  navigateToMindsetPhase = (params = {}) => {
    this.navigate('MindsetStack', params, {
      animation: 'fade',
      resetOnBlur: true
    });
  };

  /**
   * Navigate to theory phase
   */
  navigateToTheoryPhase = (params = {}) => {
    this.navigate('TheoryStack', params, {
      animation: 'slide_from_bottom'
    });
  };

  /**
   * Navigate to hands-on phase
   */
  navigateToHandsOnPhase = (params = {}) => {
    this.navigate('HandsOnStack', params, {
      animation: 'slide_from_right'
    });
  };

  /**
   * Navigate to certification phase
   */
  navigateToCertificationPhase = (params = {}) => {
    this.navigate('CertificationStack', params, {
      animation: 'slide_from_right'
    });
  };

  /**
   * Navigate to exercise player
   */
  navigateToExercise = (exerciseId, category = null) => {
    this.navigate('ExercisePlayer', {
      exerciseId,
      category,
      timestamp: Date.now()
    });
  };

  /**
   * Navigate to expert selection
   */
  navigateToExpertSelection = (skillId, currentProgress = 0) => {
    this.navigate('ExpertSelection', {
      skillId,
      currentProgress,
      selectionType: 'auto_match'
    });
  };

  /**
   * 🔄 NAVIGATION EVENT HANDLERS
   */

  /**
   * Handle navigation ready
   */
  handleNavigationReady = () => {
    this.logger.info('Navigation container ready');
    this.emit('navigationReady');
    
    // Process any queued navigation
    if (this.queuedNavigation) {
      setTimeout(() => {
        this.navigate(
          this.queuedNavigation.screenName,
          this.queuedNavigation.params,
          this.queuedNavigation.options
        );
        this.queuedNavigation = null;
      }, 100);
    }
  };

  /**
   * Handle navigation state changes
   */
  handleNavigationStateChange = (state) => {
    if (!state) return;

    const currentRoute = this.getCurrentRoute(state);
    const previousRoute = this.navigationState.currentRoute;

    // Update navigation state
    this.navigationState.previousRoute = previousRoute;
    this.navigationState.currentRoute = currentRoute;
    
    // Add to history (limit to 50 entries)
    this.navigationState.navigationHistory.unshift({
      route: currentRoute,
      timestamp: Date.now()
    });
    
    if (this.navigationState.navigationHistory.length > 50) {
      this.navigationState.navigationHistory.pop();
    }

    // Emit route change event
    this.emit('routeChanged', {
      current: currentRoute,
      previous: previousRoute,
      history: this.navigationState.navigationHistory
    });

    this.logger.debug('Navigation state updated', {
      current: currentRoute?.name,
      previous: previousRoute?.name
    });
  };

  /**
   * Handle screen focus
   */
  handleScreenFocus = (e) => {
    const screenName = e.target?.split('-')[0];
    this.logger.debug('Screen focused', { screenName });
    
    this.emit('screenFocus', screenName);
    
    // Track screen view for analytics
    this.navigationMonitor.trackScreenView(screenName);
    
    // Preload adjacent screens if needed
    this.preloadAdjacentScreens(screenName);
  };

  /**
   * Handle screen blur
   */
  handleScreenBlur = (e) => {
    const screenName = e.target?.split('-')[0];
    this.logger.debug('Screen blurred', { screenName });
    
    this.emit('screenBlur', screenName);
  };

  /**
   * Handle before remove
   */
  handleBeforeRemove = (e) => {
    // Prevent navigation in certain scenarios
    const { data } = e;
    
    if (data?.action?.type === 'GO_BACK') {
      const currentScreen = this.navigationState.currentRoute?.name;
      
      // Prevent going back from assessment screens
      if (this.isAssessmentScreen(currentScreen)) {
        e.preventDefault();
        this.showNavigationBlockModal();
        return;
      }
      
      // Prevent going back after completion
      if (this.isCompletionScreen(currentScreen)) {
        e.preventDefault();
        this.navigateToLearningDashboard();
        return;
      }
    }
  };

  /**
   * Handle transition start
   */
  handleTransitionStart = (e) => {
    this.emit('transitionStart', e.data);
  };

  /**
   * Handle transition end
   */
  handleTransitionEnd = (e) => {
    this.emit('transitionEnd', e.data);
  };

  /**
   * 🛠️ UTILITY METHODS
   */

  /**
   * Get current route from navigation state
   */
  getCurrentRoute = (state) => {
    try {
      const route = state.routes[state.index];
      
      if (route.state) {
        return this.getCurrentRoute(route.state);
      }
      
      return route;
    } catch (error) {
      this.logger.error('Error getting current route', error);
      return null;
    }
  };

  /**
   * Check if screen is assessment screen
   */
  isAssessmentScreen = (screenName) => {
    const assessmentScreens = [
      'MindsetAssessment',
      'FinalAssessment',
      'ProgressVerification'
    ];
    
    return assessmentScreens.includes(screenName);
  };

  /**
   * Check if screen is completion screen
   */
  isCompletionScreen = (screenName) => {
    const completionScreens = [
      'MindsetCompletion',
      'CertificateView',
      'IncomeLaunchpad'
    ];
    
    return completionScreens.includes(screenName);
  };

  /**
   * Preload adjacent screens for performance
   */
  preloadAdjacentScreens = (currentScreen) => {
    const preloadMap = {
      'MindsetAssessment': ['WealthConsciousness'],
      'TheoryDashboard': ['DuolingoInterface', 'ExerciseCategory'],
      'ExpertSelection': ['ExpertCatalog', 'ExpertProfile'],
      'TrainingDashboard': ['SessionJoiner', 'PracticalWorkspace']
    };

    const screensToPreload = preloadMap[currentScreen] || [];
    
    screensToPreload.forEach(screen => {
      this.emit('preloadScreen', screen);
    });
  };

  /**
   * Setup deep linking
   */
  async setupDeepLinking() {
    try {
      // Handle initial URL
      const initialUrl = await this.linking.getInitialURL();
      if (initialUrl) {
        this.handleDeepLink(initialUrl);
      }

      // Listen for URL events
      this.linkingEventListener = this.linking.addEventListener('url', ({ url }) => {
        this.handleDeepLink(url);
      });

      this.logger.info('Deep linking setup completed');
    } catch (error) {
      this.logger.error('Deep linking setup failed', error);
    }
  }

  /**
   * Handle deep link
   */
  handleDeepLink = (url) => {
    try {
      this.logger.info('Deep link received', { url });
      
      // Parse URL and extract route information
      const route = this.parseDeepLink(url);
      
      if (route) {
        this.navigate(route.screen, route.params, route.options);
        this.emit('deepLinkProcessed', route);
      }
    } catch (error) {
      this.logger.error('Deep link processing failed', error, { url });
    }
  };

  /**
   * Parse deep link URL
   */
  parseDeepLink = (url) => {
    // Implementation for parsing different URL formats
    // mosaforge://theory/exercises/category/forex-trading
    // https://app.mosaforge.com/hands-on/expert/12345
    
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(segment => segment);
    
    // Map URL paths to screen navigation
    const routeMappings = {
      'theory': 'TheoryStack',
      'mindset': 'MindsetStack',
      'hands-on': 'HandsOnStack',
      'certification': 'CertificationStack',
      'exercise': 'ExercisePlayer',
      'analytics': 'ProgressAnalytics'
    };

    if (pathSegments.length > 0) {
      const mainRoute = routeMappings[pathSegments[0]];
      
      if (mainRoute) {
        return {
          screen: mainRoute,
          params: this.extractParamsFromPath(pathSegments),
          options: { fromDeepLink: true }
        };
      }
    }
    
    return null;
  };

  /**
   * Extract parameters from path segments
   */
  extractParamsFromPath = (segments) => {
    const params = {};
    
    for (let i = 1; i < segments.length; i += 2) {
      if (segments[i + 1]) {
        params[segments[i]] = segments[i + 1];
      }
    }
    
    return params;
  };

  /**
   * Load navigation state from storage
   */
  async loadNavigationState() {
    try {
      const savedState = await this.offlineManager.get('navigationState');
      
      if (savedState) {
        this.navigationState = {
          ...this.navigationState,
          ...savedState
        };
        
        this.logger.debug('Navigation state loaded from storage');
      }
    } catch (error) {
      this.logger.error('Failed to load navigation state', error);
    }
  }

  /**
   * Save navigation state to storage
   */
  async saveNavigationState() {
    try {
      await this.offlineManager.set('navigationState', this.navigationState);
    } catch (error) {
      this.logger.error('Failed to save navigation state', error);
    }
  }

  /**
   * Show navigation block modal
   */
  showNavigationBlockModal = () => {
    // Implementation for showing modal when navigation is blocked
    this.emit('navigationBlocked', {
      screen: this.navigationState.currentRoute?.name,
      reason: 'assessment_in_progress'
    });
  };

  /**
   * Navigate to learning dashboard
   */
  navigateToLearningDashboard = () => {
    this.navigate('LearningDashboard', {}, { reset: true });
  };

  /**
   * Reset navigation to root
   */
  resetToRoot = () => {
    this.navigationRef.current?.resetRoot({
      index: 0,
      routes: [{ name: 'LearningDashboard' }]
    });
  };

  /**
   * Go back to previous screen
   */
  goBack = () => {
    if (this.navigationRef.current?.canGoBack()) {
      this.navigationRef.current.goBack();
    } else {
      this.navigateToLearningDashboard();
    }
  };

  /**
   * Get navigation history
   */
  getNavigationHistory = () => {
    return [...this.navigationState.navigationHistory];
  };

  /**
   * Clear navigation history
   */
  clearNavigationHistory = () => {
    this.navigationState.navigationHistory = [];
    this.logger.debug('Navigation history cleared');
  };

  /**
   * 🎯 SCREEN COMPONENTS (Placeholder implementations)
   */
  
  // Learning Dashboard
  LearningDashboardScreen = ({ navigation, route }) => {
    // Implementation would be in separate component file
    return null;
  };

  // Mindset Phase Screens
  MindsetAssessmentScreen = ({ navigation, route }) => null;
  WealthConsciousnessScreen = ({ navigation, route }) => null;
  DisciplineBuildingScreen = ({ navigation, route }) => null;
  ActionTakingScreen = ({ navigation, route }) => null;
  FinancialPsychologyScreen = ({ navigation, route }) => null;
  MindsetCompletionScreen = ({ navigation, route }) => null;

  // Theory Phase Screens
  TheoryDashboardScreen = ({ navigation, route }) => null;
  DuolingoInterfaceScreen = ({ navigation, route }) => null;
  ExerciseCategoryScreen = ({ navigation, route }) => null;
  DecisionScenarioScreen = ({ navigation, route }) => null;
  RealtimeChartsScreen = ({ navigation, route }) => null;
  ProgressReviewScreen = ({ navigation, route }) => null;

  // Hands-on Phase Screens
  ExpertSelectionScreen = ({ navigation, route }) => null;
  ExpertCatalogScreen = ({ navigation, route }) => null;
  ExpertProfileScreen = ({ navigation, route }) => null;
  TrainingDashboardScreen = ({ navigation, route }) => null;
  SessionJoinerScreen = ({ navigation, route }) => null;
  PracticalWorkspaceScreen = ({ navigation, route }) => null;
  ProgressVerificationScreen = ({ navigation, route }) => null;

  // Certification Phase Screens
  FinalAssessmentScreen = ({ navigation, route }) => null;
  CertificateViewScreen = ({ navigation, route }) => null;
  YachiIntegrationScreen = ({ navigation, route }) => null;
  IncomeLaunchpadScreen = ({ navigation, route }) => null;
  CareerPathwaysScreen = ({ navigation, route }) => null;

  // Utility Screens
  ExercisePlayerScreen = ({ navigation, route }) => null;
  ProgressAnalyticsScreen = ({ navigation, route }) => null;
  OfflineModeScreen = ({ navigation, route }) => null;

  /**
   * Fallback screen for errors
   */
  renderFallbackScreen = () => {
    // Simple fallback UI when navigation fails
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>
          Loading Mosa Forge...
        </Text>
      </View>
    );
  };

  /**
   * 🧹 CLEANUP
   */
  destroy = () => {
    try {
      // Remove event listeners
      this.linkingEventListener?.remove();
      
      // Clear references
      this.navigationRef = null;
      this.screenRefs.clear();
      
      // Save final state
      this.saveNavigationState();
      
      this.removeAllListeners();
      this.logger.info('Learning navigator destroyed');
    } catch (error) {
      this.logger.error('Error during navigator cleanup', error);
    }
  };
}

// Create navigation ref
const navigationRef = createRef();

// Export singleton instance
const learningNavigator = new LearningNavigator();
export default learningNavigator;

// Export navigation ref for direct access
export { navigationRef };

// Styles for fallback component
const styles = {
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC'
  },
  fallbackText: {
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter-Regular'
  }
};