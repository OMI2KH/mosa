/**
 * 🎯 MOSA FORGE: Enterprise Navigation Constants
 * 
 * @module NavigationConstants
 * @description Centralized navigation routes and configuration for MOSA FORGE platform
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Type-safe navigation routes
 * - Role-based access control
 * - Deep linking configuration
 * - Analytics tracking integration
 * - Multi-platform navigation (Mobile/Web/Admin)
 */

// 🏗️ Enterprise Route Constants
const ROUTE_TYPES = {
  AUTH: 'AUTH',
  ONBOARDING: 'ONBOARDING',
  MAIN: 'MAIN',
  MODAL: 'MODAL',
  DEEPLINK: 'DEEPLINK'
};

const USER_ROLES = {
  STUDENT: 'STUDENT',
  EXPERT: 'EXPERT',
  ADMIN: 'ADMIN',
  GUEST: 'GUEST'
};

const NAVIGATION_STATES = {
  AUTHENTICATED: 'AUTHENTICATED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  ONBOARDING: 'ONBOARDING',
  SUSPENDED: 'SUSPENDED'
};

/**
 * 🎯 MAIN NAVIGATION ROUTES - Enterprise Structure
 */
const ROUTES = {
  // 🔐 AUTHENTICATION FLOW
  AUTH: {
    ROOT: 'Auth',
    WELCOME: 'Welcome',
    FAYDA_REGISTRATION: 'FaydaRegistration',
    OTP_VERIFICATION: 'OTPVerification',
    PASSWORD_RECOVERY: 'PasswordRecovery',
    DUPLICATE_ALERT: 'DuplicateAlert',
    BIOMETRIC_SETUP: 'BiometricSetup'
  },

  // 🚀 ONBOARDING JOURNEY
  ONBOARDING: {
    ROOT: 'Onboarding',
    MINDSET_ASSESSMENT: 'MindsetAssessment',
    SKILL_SELECTION: 'SkillSelection',
    COMMITMENT_CHECK: 'CommitmentCheck',
    BUNDLE_OVERVIEW: 'BundleOverview'
  },

  // 💰 PAYMENT & ENROLLMENT
  PAYMENT: {
    ROOT: 'Payment',
    BUNDLE_PURCHASE: 'BundlePurchase',
    PAYMENT_METHODS: 'PaymentMethods',
    INSTALLMENT_PLANS: 'InstallmentPlans',
    PAYMENT_SUCCESS: 'PaymentSuccess',
    PAYMENT_FAILED: 'PaymentFailed'
  },

  // 🧠 MINDSET PHASE (FREE)
  MINDSET: {
    ROOT: 'Mindset',
    WEALTH_CONSCIOUSNESS: 'WealthConsciousness',
    DISCIPLINE_BUILDING: 'DisciplineBuilding',
    ACTION_TAKING: 'ActionTaking',
    FINANCIAL_PSYCHOLOGY: 'FinancialPsychology',
    MINDSET_ASSESSMENT: 'MindsetAssessment'
  },

  // 📚 THEORY PHASE (2 MONTHS)
  THEORY: {
    ROOT: 'Theory',
    DASHBOARD: 'TheoryDashboard',
    DUOLINGO_INTERFACE: 'DuolingoInterface',
    EXERCISE_PLAYER: 'ExercisePlayer',
    DECISION_SCENARIOS: 'DecisionScenarios',
    REALTIME_CHARTS: 'RealtimeCharts',
    PROGRESS_TRACKING: 'TheoryProgress'
  },

  // 👨‍🏫 EXPERT MATCHING
  EXPERT_SELECTION: {
    ROOT: 'ExpertSelection',
    EXPERT_CATALOG: 'ExpertCatalog',
    PORTFOLIO_VIEWER: 'PortfolioViewer',
    QUALITY_METRICS: 'QualityMetrics',
    ENROLLMENT_FLOW: 'EnrollmentFlow',
    EXPERT_DETAILS: 'ExpertDetails'
  },

  // 🛠️ HANDS-ON PHASE (2 MONTHS)
  HANDS_ON: {
    ROOT: 'HandsOn',
    TRAINING_DASHBOARD: 'TrainingDashboard',
    SESSION_JOINER: 'SessionJoiner',
    PRACTICAL_WORKSPACE: 'PracticalWorkspace',
    PROGRESS_VERIFICATION: 'ProgressVerification',
    EXPERT_FEEDBACK: 'ExpertFeedback'
  },

  // 🏆 CERTIFICATION PHASE
  CERTIFICATION: {
    ROOT: 'Certification',
    FINAL_ASSESSMENT: 'FinalAssessment',
    CERTIFICATE_VIEW: 'CertificateView',
    YACHI_INTEGRATION: 'YachiIntegration',
    INCOME_LAUNCHPAD: 'IncomeLaunchpad',
    CAREER_GUIDANCE: 'CareerGuidance'
  },

  // 📱 MAIN APP TABS
  MAIN_TABS: {
    ROOT: 'MainTabs',
    HOME: 'Home',
    LEARNING: 'Learning',
    PROGRESS: 'Progress',
    PROFILE: 'Profile'
  },

  // 👨‍🏫 EXPERT PORTAL
  EXPERT_PORTAL: {
    ROOT: 'ExpertPortal',
    DASHBOARD: 'ExpertDashboard',
    QUALITY_DASHBOARD: 'QualityDashboard',
    STUDENT_MANAGEMENT: 'StudentManagement',
    PAYOUT_TRACKER: 'PayoutTracker',
    SESSION_SCHEDULER: 'SessionScheduler',
    PERFORMANCE_ANALYTICS: 'PerformanceAnalytics'
  },

  // 🔧 MULTI-COURSE MANAGEMENT
  MULTI_COURSE: {
    ROOT: 'MultiCourse',
    COURSE_MANAGER: 'CourseManager',
    PROGRESS_OVERVIEW: 'ProgressOverview',
    SKILL_SWITCHER: 'SkillSwitcher',
    TIMELINE_VIEW: 'TimelineView'
  },

  // ⚙️ SETTINGS & PROFILE
  SETTINGS: {
    ROOT: 'Settings',
    PROFILE: 'Profile',
    NOTIFICATIONS: 'Notifications',
    SECURITY: 'Security',
    PAYMENT_METHODS: 'PaymentMethods',
    HELP_SUPPORT: 'HelpSupport'
  },

  // 🎯 ADMIN PORTAL
  ADMIN: {
    ROOT: 'Admin',
    PLATFORM_ANALYTICS: 'PlatformAnalytics',
    QUALITY_MONITORING: 'QualityMonitoring',
    REVENUE_MONITOR: 'RevenueMonitor',
    SYSTEM_HEALTH: 'SystemHealth',
    USER_MANAGEMENT: 'UserManagement',
    EXPERT_APPROVALS: 'ExpertApprovals'
  }
};

/**
 * 🏗️ DEEP LINKING CONFIGURATION - Enterprise Grade
 */
const DEEP_LINKS = {
  // 🔐 AUTHENTICATION
  EMAIL_VERIFICATION: 'mosaforge://auth/verify-email',
  PASSWORD_RESET: 'mosaforge://auth/reset-password',
  OTP_VERIFICATION: 'mosaforge://auth/otp',

  // 💰 PAYMENTS
  PAYMENT_SUCCESS: 'mosaforge://payment/success',
  PAYMENT_FAILED: 'mosaforge://payment/failed',
  INSTALLMENT_PLAN: 'mosaforge://payment/installment',

  // 🎓 LEARNING
  COURSE_START: 'mosaforge://learning/course-start',
  EXERCISE_LAUNCH: 'mosaforge://learning/exercise',
  SESSION_JOIN: 'mosaforge://learning/session-join',

  // 👨‍🏫 EXPERT
  EXPERT_PROFILE: 'mosaforge://expert/profile',
  STUDENT_MANAGEMENT: 'mosaforge://expert/students',
  SESSION_SCHEDULE: 'mosaforge://expert/schedule',

  // 🏆 CERTIFICATION
  CERTIFICATE_VIEW: 'mosaforge://certificate/view',
  YACHI_VERIFICATION: 'mosaforge://yachi/verify',

  // 📢 MARKETING
  SKILL_PROMOTION: 'mosaforge://skills/promotion',
  BUNDLE_OFFER: 'mosaforge://bundle/offer'
};

/**
 * 🎯 NAVIGATION PARAMETERS - Type-safe params
 */
const NAVIGATION_PARAMS = {
  // 🔐 AUTH PARAMS
  AUTH: {
    FAYDA_ID: 'faydaId',
    PHONE_NUMBER: 'phoneNumber',
    EMAIL: 'email',
    USER_TYPE: 'userType'
  },

  // 💰 PAYMENT PARAMS
  PAYMENT: {
    BUNDLE_ID: 'bundleId',
    AMOUNT: 'amount',
    CURRENCY: 'currency',
    PAYMENT_METHOD: 'paymentMethod',
    INSTALLMENT_PLAN: 'installmentPlan'
  },

  // 🎓 LEARNING PARAMS
  LEARNING: {
    ENROLLMENT_ID: 'enrollmentId',
    SKILL_ID: 'skillId',
    EXPERT_ID: 'expertId',
    PHASE: 'phase',
    EXERCISE_ID: 'exerciseId',
    SESSION_ID: 'sessionId'
  },

  // 👨‍🏫 EXPERT PARAMS
  EXPERT: {
    EXPERT_ID: 'expertId',
    TIER: 'tier',
    QUALITY_SCORE: 'qualityScore',
    STUDENT_COUNT: 'studentCount'
  },

  // 🏆 CERTIFICATION PARAMS
  CERTIFICATION: {
    CERTIFICATE_ID: 'certificateId',
    YACHI_TOKEN: 'yachiToken',
    VERIFICATION_URL: 'verificationUrl'
  },

  // 📊 ANALYTICS PARAMS
  ANALYTICS: {
    SOURCE: 'source',
    CAMPAIGN: 'campaign',
    MEDIUM: 'medium',
    CONTENT: 'content'
  }
};

/**
 * 🏗️ ROLE-BASED NAVIGATION CONFIGURATION
 */
const ROLE_BASED_ROUTES = {
  [USER_ROLES.STUDENT]: [
    ROUTES.MAIN_TABS.HOME,
    ROUTES.LEARNING.THEORY.DASHBOARD,
    ROUTES.HANDS_ON.TRAINING_DASHBOARD,
    ROUTES.CERTIFICATION.CERTIFICATE_VIEW,
    ROUTES.MULTI_COURSE.COURSE_MANAGER,
    ROUTES.SETTINGS.PROFILE
  ],

  [USER_ROLES.EXPERT]: [
    ROUTES.EXPERT_PORTAL.DASHBOARD,
    ROUTES.EXPERT_PORTAL.STUDENT_MANAGEMENT,
    ROUTES.EXPERT_PORTAL.SESSION_SCHEDULER,
    ROUTES.EXPERT_PORTAL.PAYOUT_TRACKER,
    ROUTES.EXPERT_PORTAL.QUALITY_DASHBOARD,
    ROUTES.SETTINGS.PROFILE
  ],

  [USER_ROLES.ADMIN]: [
    ROUTES.ADMIN.PLATFORM_ANALYTICS,
    ROUTES.ADMIN.QUALITY_MONITORING,
    ROUTES.ADMIN.REVENUE_MONITOR,
    ROUTES.ADMIN.SYSTEM_HEALTH,
    ROUTES.ADMIN.USER_MANAGEMENT,
    ROUTES.ADMIN.EXPERT_APPROVALS
  ],

  [USER_ROLES.GUEST]: [
    ROUTES.AUTH.WELCOME,
    ROUTES.AUTH.FAYDA_REGISTRATION,
    ROUTES.ONBOARDING.SKILL_SELECTION
  ]
};

/**
 * 🎯 NAVIGATION FLOW CONFIGURATION - Enterprise Journey Mapping
 */
const NAVIGATION_FLOWS = {
  // 🆕 NEW STUDENT JOURNEY
  NEW_STUDENT: [
    ROUTES.AUTH.WELCOME,
    ROUTES.AUTH.FAYDA_REGISTRATION,
    ROUTES.AUTH.OTP_VERIFICATION,
    ROUTES.ONBOARDING.MINDSET_ASSESSMENT,
    ROUTES.ONBOARDING.SKILL_SELECTION,
    ROUTES.ONBOARDING.COMMITMENT_CHECK,
    ROUTES.PAYMENT.BUNDLE_PURCHASE,
    ROUTES.MINDSET.WEALTH_CONSCIOUSNESS,
    ROUTES.THEORY.DUOLINGO_INTERFACE,
    ROUTES.EXPERT_SELECTION.EXPERT_CATALOG,
    ROUTES.HANDS_ON.TRAINING_DASHBOARD,
    ROUTES.CERTIFICATION.FINAL_ASSESSMENT,
    ROUTES.CERTIFICATION.CERTIFICATE_VIEW
  ],

  // 👨‍🏫 EXPERT ONBOARDING
  EXPERT_ONBOARDING: [
    ROUTES.AUTH.WELCOME,
    ROUTES.AUTH.FAYDA_REGISTRATION,
    ROUTES.EXPERT_PORTAL.DASHBOARD,
    ROUTES.EXPERT_PORTAL.QUALITY_DASHBOARD,
    ROUTES.EXPERT_PORTAL.STUDENT_MANAGEMENT
  ],

  // 🔄 MULTI-COURSE FLOW
  MULTI_COURSE: [
    ROUTES.MULTI_COURSE.COURSE_MANAGER,
    ROUTES.MULTI_COURSE.PROGRESS_OVERVIEW,
    ROUTES.MULTI_COURSE.SKILL_SWITCHER,
    ROUTES.MULTI_COURSE.TIMELINE_VIEW
  ],

  // 💰 PAYMENT FLOW
  PAYMENT: [
    ROUTES.PAYMENT.BUNDLE_PURCHASE,
    ROUTES.PAYMENT.PAYMENT_METHODS,
    ROUTES.PAYMENT.INSTALLMENT_PLANS,
    ROUTES.PAYMENT.PAYMENT_SUCCESS
  ]
};

/**
 * 🏗️ NAVIGATION GUARDS - Enterprise Access Control
 */
const NAVIGATION_GUARDS = {
  // 🔐 AUTHENTICATION GUARDS
  AUTH_REQUIRED: [
    ROUTES.MAIN_TABS.ROOT,
    ROUTES.THEORY.ROOT,
    ROUTES.HANDS_ON.ROOT,
    ROUTES.EXPERT_PORTAL.ROOT,
    ROUTES.ADMIN.ROOT
  ],

  // 💰 PAYMENT REQUIRED
  PAYMENT_REQUIRED: [
    ROUTES.THEORY.DUOLINGO_INTERFACE,
    ROUTES.EXPERT_SELECTION.EXPERT_CATALOG,
    ROUTES.HANDS_ON.TRAINING_DASHBOARD
  ],

  // 🎓 COURSE ENROLLMENT REQUIRED
  ENROLLMENT_REQUIRED: [
    ROUTES.THEORY.EXERCISE_PLAYER,
    ROUTES.HANDS_ON.SESSION_JOINER,
    ROUTES.CERTIFICATION.FINAL_ASSESSMENT
  ],

  // 👨‍🏫 EXPERT VERIFICATION REQUIRED
  EXPERT_VERIFIED: [
    ROUTES.EXPERT_PORTAL.STUDENT_MANAGEMENT,
    ROUTES.EXPERT_PORTAL.SESSION_SCHEDULER,
    ROUTES.EXPERT_PORTAL.PAYOUT_TRACKER
  ],

  // ⚙️ ADMIN PRIVILEGES REQUIRED
  ADMIN_REQUIRED: [
    ROUTES.ADMIN.PLATFORM_ANALYTICS,
    ROUTES.ADMIN.QUALITY_MONITORING,
    ROUTES.ADMIN.USER_MANAGEMENT
  ]
};

/**
 * 🎯 ANALYTICS EVENT MAPPING - Enterprise Tracking
 */
const ANALYTICS_EVENTS = {
  // 🧭 NAVIGATION EVENTS
  SCREEN_VIEW: 'screen_view',
  NAVIGATION_START: 'navigation_start',
  NAVIGATION_COMPLETE: 'navigation_complete',
  NAVIGATION_ERROR: 'navigation_error',

  // 🔐 AUTH EVENTS
  LOGIN_ATTEMPT: 'login_attempt',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  REGISTRATION_COMPLETE: 'registration_complete',

  // 💰 PAYMENT EVENTS
  PAYMENT_STARTED: 'payment_started',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  BUNDLE_PURCHASED: 'bundle_purchased',

  // 🎓 LEARNING EVENTS
  COURSE_STARTED: 'course_started',
  EXERCISE_COMPLETED: 'exercise_completed',
  PHASE_COMPLETED: 'phase_completed',
  CERTIFICATION_EARNED: 'certification_earned',

  // 👨‍🏫 EXPERT EVENTS
  EXPERT_MATCHED: 'expert_matched',
  SESSION_COMPLETED: 'session_completed',
  QUALITY_RATING: 'quality_rating'
};

/**
 * 🏗️ NAVIGATION CONFIGURATION - Enterprise Settings
 */
const NAVIGATION_CONFIG = {
  // ⚡ PERFORMANCE SETTINGS
  ANIMATION_DURATION: 300,
  LAZY_LOAD_TIMEOUT: 1000,
  PRELOAD_SCREENS: [
    ROUTES.MAIN_TABS.HOME,
    ROUTES.LEARNING.THEORY.DASHBOARD,
    ROUTES.SETTINGS.PROFILE
  ],

  // 🔒 SECURITY SETTINGS
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  MAX_NAVIGATION_HISTORY: 50,
  ALLOWED_DEEPLINK_DOMAINS: [
    'mosaforge.com',
    'api.mosaforge.com',
    'yachi.com'
  ],

  // 📱 PLATFORM SPECIFIC
  PLATFORM: {
    IOS: {
      HEADER_HEIGHT: 44,
      TAB_BAR_HEIGHT: 83
    },
    ANDROID: {
      HEADER_HEIGHT: 56,
      TAB_BAR_HEIGHT: 56
    },
    WEB: {
      HEADER_HEIGHT: 64,
      TAB_BAR_HEIGHT: 72
    }
  },

  // 🎨 UI/UX CONSTANTS
  TRANSITION_PRESETS: {
    MODAL: 'modal',
    SLIDE: 'slide',
    FADE: 'fade',
    NONE: 'none'
  },

  HEADER_MODES: {
    FLOAT: 'float',
    STACK: 'stack',
    SCREEN: 'screen'
  }
};

/**
 * 🎯 ENTERPRISE NAVIGATION UTILITIES
 */
class NavigationUtils {
  /**
   * 🏗️ Check if user has access to route
   * @param {string} route - Route to check
   * @param {string} userRole - User role
   * @param {Object} userPermissions - User permissions
   * @returns {boolean} Access granted
   */
  static hasAccess(route, userRole, userPermissions = {}) {
    // Check role-based access
    const roleRoutes = ROLE_BASED_ROUTES[userRole] || [];
    if (!roleRoutes.includes(route)) {
      return false;
    }

    // Check navigation guards
    if (NAVIGATION_GUARDS.AUTH_REQUIRED.includes(route) && !userPermissions.isAuthenticated) {
      return false;
    }

    if (NAVIGATION_GUARDS.ADMIN_REQUIRED.includes(route) && userRole !== USER_ROLES.ADMIN) {
      return false;
    }

    if (NAVIGATION_GUARDS.EXPERT_VERIFIED.includes(route) && !userPermissions.isExpertVerified) {
      return false;
    }

    return true;
  }

  /**
   * 🏗️ Get route parameters schema
   * @param {string} route - Route name
   * @returns {Object} Parameters schema
   */
  static getRouteParams(route) {
    const paramsMap = {
      [ROUTES.LEARNING.EXERCISE_PLAYER]: {
        exerciseId: 'string',
        enrollmentId: 'string',
        skillId: 'string'
      },
      [ROUTES.PAYMENT.BUNDLE_PURCHASE]: {
        bundleId: 'string',
        amount: 'number',
        skillId: 'string'
      },
      [ROUTES.EXPERT_SELECTION.EXPERT_DETAILS]: {
        expertId: 'string',
        skillId: 'string'
      },
      [ROUTES.CERTIFICATION.CERTIFICATE_VIEW]: {
        certificateId: 'string',
        enrollmentId: 'string'
      }
    };

    return paramsMap[route] || {};
  }

  /**
   * 🏗️ Validate navigation parameters
   * @param {string} route - Route name
   * @param {Object} params - Navigation parameters
   * @returns {Object} Validation result
   */
  static validateParams(route, params) {
    const schema = this.getRouteParams(route);
    const errors = [];

    for (const [key, type] of Object.entries(schema)) {
      if (!params[key]) {
        errors.push(`Missing required parameter: ${key}`);
        continue;
      }

      if (typeof params[key] !== type) {
        errors.push(`Invalid type for ${key}: expected ${type}, got ${typeof params[key]}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 🏗️ Generate deep link URL
   * @param {string} deepLink - Deep link key
   * @param {Object} params - URL parameters
   * @returns {string} Formatted deep link URL
   */
  static generateDeepLink(deepLink, params = {}) {
    const baseUrl = DEEP_LINKS[deepLink];
    if (!baseUrl) {
      throw new Error(`Unknown deep link: ${deepLink}`);
    }

    if (Object.keys(params).length === 0) {
      return baseUrl;
    }

    const queryParams = new URLSearchParams(params);
    return `${baseUrl}?${queryParams.toString()}`;
  }

  /**
   * 🏗️ Parse deep link URL
   * @param {string} url - Deep link URL
   * @returns {Object} Parsed result
   */
  static parseDeepLink(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      const params = Object.fromEntries(urlObj.searchParams);

      // Find matching deep link
      const deepLink = Object.entries(DEEP_LINKS).find(([, value]) => 
        value.replace('mosaforge://', '') === path.replace('/', '')
      );

      if (!deepLink) {
        return { isValid: false, error: 'Unknown deep link' };
      }

      return {
        isValid: true,
        deepLink: deepLink[0],
        route: this.mapDeepLinkToRoute(deepLink[0]),
        params
      };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }

  /**
   * 🏗️ Map deep link to internal route
   * @param {string} deepLink - Deep link key
   * @returns {string} Internal route
   */
  static mapDeepLinkToRoute(deepLink) {
    const mapping = {
      EMAIL_VERIFICATION: ROUTES.AUTH.OTP_VERIFICATION,
      PASSWORD_RESET: ROUTES.AUTH.PASSWORD_RECOVERY,
      PAYMENT_SUCCESS: ROUTES.PAYMENT.PAYMENT_SUCCESS,
      COURSE_START: ROUTES.THEORY.DASHBOARD,
      CERTIFICATE_VIEW: ROUTES.CERTIFICATION.CERTIFICATE_VIEW
    };

    return mapping[deepLink] || ROUTES.MAIN_TABS.HOME;
  }

  /**
   * 🏗️ Get navigation flow for user journey
   * @param {string} userRole - User role
   * @param {string} journeyType - Journey type
   * @returns {Array} Navigation flow
   */
  static getNavigationFlow(userRole, journeyType) {
    const flowMap = {
      [USER_ROLES.STUDENT]: {
        NEW: NAVIGATION_FLOWS.NEW_STUDENT,
        MULTI_COURSE: NAVIGATION_FLOWS.MULTI_COURSE,
        PAYMENT: NAVIGATION_FLOWS.PAYMENT
      },
      [USER_ROLES.EXPERT]: {
        NEW: NAVIGATION_FLOWS.EXPERT_ONBOARDING
      }
    };

    return flowMap[userRole]?.[journeyType] || [];
  }

  /**
   * 🏗️ Track navigation analytics
   * @param {string} event - Analytics event
   * @param {Object} data - Event data
   */
  static trackNavigation(event, data = {}) {
    const analyticsEvent = {
      event,
      timestamp: new Date().toISOString(),
      ...data,
      platform: 'mobile', // or 'web', 'admin'
      version: '1.0.0'
    };

    // In production, this would send to analytics service
    console.log('ANALYTICS:', analyticsEvent);
    
    // Example: Send to analytics service
    // AnalyticsService.track(event, analyticsEvent);
  }
}

/**
 * 🏗️ ENTERPRISE EXPORTS
 */
module.exports = {
  // 🎯 Core Constants
  ROUTE_TYPES,
  USER_ROLES,
  NAVIGATION_STATES,
  
  // 🗺️ Route Definitions
  ROUTES,
  DEEP_LINKS,
  NAVIGATION_PARAMS,
  
  // 🔐 Access Control
  ROLE_BASED_ROUTES,
  NAVIGATION_GUARDS,
  NAVIGATION_FLOWS,
  
  // 📊 Analytics
  ANALYTICS_EVENTS,
  
  // ⚙️ Configuration
  NAVIGATION_CONFIG,
  
  // 🛠️ Utilities
  NavigationUtils
};

// 🏗️ TypeScript-style type definitions for better IDE support
/**
 * @typedef {Object} NavigationParams
 * @property {string} [faydaId]
 * @property {string} [phoneNumber]
 * @property {string} [enrollmentId]
 * @property {string} [skillId]
 * @property {string} [expertId]
 * @property {string} [bundleId]
 * @property {number} [amount]
 */

/**
 * @typedef {Object} NavigationResult
 * @property {boolean} success
 * @property {string} [error]
 * @property {string} [redirectTo]
 */

/**
 * @typedef {Object} DeepLinkResult
 * @property {boolean} isValid
 * @property {string} [deepLink]
 * @property {string} [route]
 * @property {Object} [params]
 * @property {string} [error]
 */