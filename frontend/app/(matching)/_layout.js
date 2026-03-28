/**
 * 🏢 MOSA FORGE - Enterprise Matching Flow Layout
 * 🎯 Expert-Student Matching & Connection Management
 * 🚀 Microservice-Ready Enterprise Architecture
 * 
 * @module MatchingLayout
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React from 'react';
import { Stack } from 'expo-router';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  Platform
} from 'react-native';
import { 
  useTheme, 
  Appbar, 
  ProgressBar, 
  FAB 
} from 'react-native-paper';
import { 
  MaterialCommunityIcons, 
  Ionicons 
} from '@expo/vector-icons';

// 🏗️ Enterprise Dependencies
import EnterpriseHeader from '../../components/enterprise/EnterpriseHeader';
import MatchingProgressIndicator from '../../components/matching/MatchingProgressIndicator';
import NetworkStatusIndicator from '../../components/shared/NetworkStatusIndicator';
import QualityBadge from '../../components/quality/QualityBadge';
import { useMatchingContext } from '../../contexts/matching-context';

// 🔐 Security & Analytics
import { withAuthProtection } from '../../hoc/withAuthProtection';
import { withAnalytics } from '../../hoc/withAnalytics';
import { useBiometricAuth } from '../../hooks/use-biometric-auth';

/**
 * 🏢 ENTERPRISE MATCHING FLOW LAYOUT
 * 
 * This layout manages the expert-student matching flow with:
 * - Multi-step progress tracking
 * - Real-time quality metrics
 * - Secure authentication
 * - Comprehensive analytics
 * - Enterprise-grade UI/UX
 */
const MatchingLayout = () => {
  // 🎨 Theme & Styling
  const theme = useTheme();
  const { colors } = theme;

  // 🎯 Context & State Management
  const { 
    matchingState, 
    currentStep, 
    totalSteps,
    matchingQuality,
    refreshMatching 
  } = useMatchingContext();

  // 🔐 Security
  const { isAuthenticated, biometricType } = useBiometricAuth();

  // 🎯 Calculate Progress
  const progressPercentage = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  // 🎨 Dynamic Styles
  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    headerContainer: {
      backgroundColor: colors.surface,
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      zIndex: 1000,
    },
    progressContainer: {
      backgroundColor: colors.surfaceVariant,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    contentContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    floatingActions: {
      position: 'absolute',
      bottom: 24,
      right: 16,
      zIndex: 1000,
    },
    networkStatus: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 60 : 16,
      right: 16,
      zIndex: 1001,
    },
    qualityIndicator: {
      position: 'absolute',
      top: Platform.OS === 'ios' ? 60 : 16,
      left: 16,
      zIndex: 1001,
    }
  });

  // 🔄 Refresh Matching Data
  const handleRefresh = () => {
    refreshMatching();
  };

  // 🚪 Handle Back Navigation
  const handleBack = () => {
    // Custom back logic with confirmation for active matching
    if (matchingState === 'active') {
      // Show confirmation dialog
      // If confirmed, navigate back
    }
  };

  // 💡 Show Help/Information
  const handleHelp = () => {
    // Show matching flow help
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      {/* 🌐 Network Status Indicator */}
      <View style={dynamicStyles.networkStatus}>
        <NetworkStatusIndicator />
      </View>

      {/* ⭐ Quality Indicator */}
      <View style={dynamicStyles.qualityIndicator}>
        <QualityBadge 
          score={matchingQuality?.overall || 0}
          size="small"
          showScore={true}
        />
      </View>

      {/* 🏢 Enterprise Header */}
      <EnterpriseHeader
        title="Expert Matching"
        subtitle="Find your perfect skills trainer"
        showBack={true}
        onBackPress={handleBack}
        rightActions={[
          {
            icon: 'help-circle-outline',
            onPress: handleHelp,
            color: colors.primary,
          },
          {
            icon: 'refresh',
            onPress: handleRefresh,
            color: colors.secondary,
            loading: matchingState === 'refreshing',
          }
        ]}
        backgroundColor={colors.surface}
        elevation={4}
      />

      {/* 📊 Progress Indicator */}
      <View style={dynamicStyles.progressContainer}>
        <MatchingProgressIndicator
          currentStep={currentStep}
          totalSteps={totalSteps}
          status={matchingState}
          qualityScore={matchingQuality?.overall}
        />
        
        {/* 📈 Progress Bar */}
        <ProgressBar
          progress={progressPercentage / 100}
          color={colors.primary}
          style={{ marginTop: 8, height: 4, borderRadius: 2 }}
        />
      </View>

      {/* 🎯 Main Content Area */}
      <View style={dynamicStyles.contentContainer}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            contentStyle: {
              backgroundColor: colors.background,
            },
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        >
          {/* 🔍 Skill Selection Screen */}
          <Stack.Screen
            name="skill-selection"
            options={{
              title: "Select Skill",
              animationTypeForReplace: 'push',
            }}
          />

          {/* 👥 Expert Matching Screen */}
          <Stack.Screen
            name="expert-matching"
            options={{
              title: "Find Expert",
              animationTypeForReplace: 'push',
            }}
          />

          {/* 📋 Expert Profile Screen */}
          <Stack.Screen
            name="expert-profile/[id]"
            options={{
              title: "Expert Profile",
              animationTypeForReplace: 'push',
            }}
          />

          {/* 🤝 Matching Confirmation Screen */}
          <Stack.Screen
            name="matching-confirmation"
            options={{
              title: "Confirm Match",
              animationTypeForReplace: 'push',
            }}
          />

          {/* 📊 Quality Assurance Screen */}
          <Stack.Screen
            name="quality-assurance"
            options={{
              title: "Quality Check",
              animationTypeForReplace: 'push',
            }}
          />

          {/* 📅 Schedule Setup Screen */}
          <Stack.Screen
            name="schedule-setup"
            options={{
              title: "Set Schedule",
              animationTypeForReplace: 'push',
            }}
          />

          {/* ✅ Matching Complete Screen */}
          <Stack.Screen
            name="matching-complete"
            options={{
              title: "Matching Complete",
              animationTypeForReplace: 'push',
            }}
          />
        </Stack>
      </View>

      {/* 🚀 Floating Action Button */}
      {matchingState === 'active' && currentStep < totalSteps && (
        <View style={dynamicStyles.floatingActions}>
          <FAB
            icon="arrow-right"
            onPress={() => {
              // Handle next step
            }}
            style={{
              backgroundColor: colors.primary,
              elevation: 6,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
            }}
            color={colors.onPrimary}
            size="medium"
          />
        </View>
      )}
    </SafeAreaView>
  );
};

// 🎯 Enhanced with Enterprise Features
const EnhancedMatchingLayout = withAnalytics(
  withAuthProtection(MatchingLayout, {
    requireBiometric: true,
    requireExpertSelection: false,
    requirePaymentConfirmation: true,
    allowedUserTypes: ['student', 'admin'],
  }),
  {
    screenName: 'MatchingFlow',
    trackEvents: [
      'matching_started',
      'skill_selected',
      'expert_viewed',
      'matching_confirmed',
      'quality_verified',
      'schedule_set',
      'matching_completed',
    ],
    trackUserJourney: true,
  }
);

export default EnhancedMatchingLayout;

// 🎨 Component Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  statusBar: {
    backgroundColor: '#ffffff',
    barStyle: 'dark-content',
  },
});

// 🎯 Export Configuration
export const matchingLayoutConfig = {
  // 🔄 Navigation Configuration
  navigation: {
    type: 'stack',
    headerMode: 'none',
    gestureEnabled: true,
    animationEnabled: true,
  },

  // 🛡️ Security Configuration
  security: {
    requireAuth: true,
    requireBiometric: true,
    allowedRoles: ['student', 'admin'],
    sessionTimeout: 30, // minutes
  },

  // 📊 Analytics Configuration
  analytics: {
    enabled: true,
    trackPageViews: true,
    trackUserJourney: true,
    sampleRate: 1.0,
  },

  // 🎨 UI Configuration
  ui: {
    theme: 'light',
    primaryColor: '#2196F3',
    secondaryColor: '#FF9800',
    qualityColor: '#4CAF50',
    warningColor: '#FFC107',
    errorColor: '#F44336',
  },

  // ⚡ Performance Configuration
  performance: {
    lazyLoad: true,
    preloadScreens: 1,
    imageOptimization: true,
    cacheEnabled: true,
  },

  // 🌐 Network Configuration
  network: {
    retryAttempts: 3,
    timeout: 30000,
    offlineSupport: true,
    backgroundSync: true,
  },
};

// 🎯 Route Configuration
export const matchingRoutes = [
  {
    name: 'skill-selection',
    path: 'skill-selection',
    component: 'SkillSelectionScreen',
    title: 'Select Skill',
    description: 'Choose from 40+ enterprise skills',
    icon: 'book-outline',
    requiresAuth: true,
    analyticsEvent: 'skill_selection_viewed',
  },
  {
    name: 'expert-matching',
    path: 'expert-matching',
    component: 'ExpertMatchingScreen',
    title: 'Find Expert',
    description: 'AI-powered expert matching',
    icon: 'account-search-outline',
    requiresAuth: true,
    requiresSkill: true,
    analyticsEvent: 'expert_matching_viewed',
  },
  {
    name: 'expert-profile',
    path: 'expert-profile/:id',
    component: 'ExpertProfileScreen',
    title: 'Expert Profile',
    description: 'View expert details and quality metrics',
    icon: 'account-details-outline',
    requiresAuth: true,
    requiresExpert: true,
    analyticsEvent: 'expert_profile_viewed',
  },
  {
    name: 'matching-confirmation',
    path: 'matching-confirmation',
    component: 'MatchingConfirmationScreen',
    title: 'Confirm Match',
    description: 'Confirm your expert selection',
    icon: 'check-circle-outline',
    requiresAuth: true,
    requiresExpert: true,
    analyticsEvent: 'matching_confirmation_viewed',
  },
  {
    name: 'quality-assurance',
    path: 'quality-assurance',
    component: 'QualityAssuranceScreen',
    title: 'Quality Check',
    description: 'Quality metrics and guarantee',
    icon: 'shield-check-outline',
    requiresAuth: true,
    requiresConfirmation: true,
    analyticsEvent: 'quality_assurance_viewed',
  },
  {
    name: 'schedule-setup',
    path: 'schedule-setup',
    component: 'ScheduleSetupScreen',
    title: 'Set Schedule',
    description: 'Plan your training sessions',
    icon: 'calendar-clock',
    requiresAuth: true,
    requiresQualityCheck: true,
    analyticsEvent: 'schedule_setup_viewed',
  },
  {
    name: 'matching-complete',
    path: 'matching-complete',
    component: 'MatchingCompleteScreen',
    title: 'Matching Complete',
    description: 'Ready to start your journey',
    icon: 'trophy-outline',
    requiresAuth: true,
    requiresSchedule: true,
    analyticsEvent: 'matching_complete_viewed',
  },
];

// 🎯 Export Helper Functions
export const getMatchingRoute = (routeName) => {
  return matchingRoutes.find(route => route.name === routeName);
};

export const isMatchingRouteProtected = (routeName) => {
  const route = getMatchingRoute(routeName);
  return route ? route.requiresAuth : true;
};

export const getMatchingRouteRequirements = (routeName) => {
  const route = getMatchingRoute(routeName);
  return route ? {
    requiresAuth: route.requiresAuth,
    requiresSkill: route.requiresSkill || false,
    requiresExpert: route.requiresExpert || false,
    requiresConfirmation: route.requiresConfirmation || false,
    requiresQualityCheck: route.requiresQualityCheck || false,
    requiresSchedule: route.requiresSchedule || false,
  } : {};
};

// 🎯 Export Constants
export const MATCHING_STATES = {
  IDLE: 'idle',
  SKILL_SELECTING: 'skill_selecting',
  EXPERT_SEARCHING: 'expert_searching',
  EXPERT_VIEWING: 'expert_viewing',
  CONFIRMING: 'confirming',
  QUALITY_CHECKING: 'quality_checking',
  SCHEDULING: 'scheduling',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export const MATCHING_STEPS = {
  SKILL_SELECTION: 1,
  EXPERT_MATCHING: 2,
  EXPERT_PROFILE: 3,
  CONFIRMATION: 4,
  QUALITY_ASSURANCE: 5,
  SCHEDULE_SETUP: 6,
  COMPLETION: 7,
};

export const MATCHING_QUALITY_THRESHOLDS = {
  EXCELLENT: 4.5,
  GOOD: 4.0,
  AVERAGE: 3.5,
  BELOW_AVERAGE: 3.0,
};

// 🎯 Export Types
export type MatchingRoute = {
  name: string;
  path: string;
  component: string;
  title: string;
  description: string;
  icon: string;
  requiresAuth: boolean;
  requiresSkill?: boolean;
  requiresExpert?: boolean;
  requiresConfirmation?: boolean;
  requiresQualityCheck?: boolean;
  requiresSchedule?: boolean;
  analyticsEvent?: string;
};

export type MatchingState = 
  | 'idle'
  | 'skill_selecting'
  | 'expert_searching'
  | 'expert_viewing'
  | 'confirming'
  | 'quality_checking'
  | 'scheduling'
  | 'completed'
  | 'failed';

export type MatchingQuality = {
  overall: number;
  expertise: number;
  communication: number;
  availability: number;
  studentSatisfaction: number;
  tier: 'standard' | 'senior' | 'master';
};

// 🎯 Default Export
export default EnhancedMatchingLayout;