// app/(admin-revenue)/_layout.js

/**
 * 🎯 ENTERPRISE REVENUE ADMIN LAYOUT
 * Production-ready layout for Mosa Forge Revenue Administration
 * Features: RBAC, Real-time Revenue Monitoring, Quality Analytics, Enterprise Security
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { 
  View, 
  Text, 
  StyleSheet, 
  Platform, 
  StatusBar,
  BackHandler,
  Alert
} from 'react-native';
import { useAuth } from '../../../contexts/auth-context';
import { useRevenue } from '../../../contexts/revenue-context';
import { useQuality } from '../../../contexts/quality-context';
import { 
  RevenueDashboardProvider,
  useRevenueDashboard 
} from '../../../contexts/revenue-dashboard-context';
import AdminSecurityWrapper from '../../../components/admin/admin-security-wrapper';
import RevenueHeader from '../../../components/admin/revenue/revenue-header';
import RevenueNavigation from '../../../components/admin/revenue/revenue-navigation';
import RealTimeMetricsBar from '../../../components/admin/revenue/real-time-metrics-bar';
import SystemHealthMonitor from '../../../components/admin/revenue/system-health-monitor';
import { 
  checkAdminPermissions, 
  ADMIN_PERMISSIONS,
  SECURITY_LEVELS 
} from '../../../utils/admin-security';
import { Logger } from '../../../utils/logger';
import { 
  RevenueCalculator, 
  FORMATTERS 
} from '../../../utils/revenue-calculations';

const logger = new Logger('RevenueAdminLayout');

// 🛡️ Security configuration for revenue admin
const REVENUE_ADMIN_CONFIG = {
  requiredPermissions: [
    ADMIN_PERMISSIONS.REVENUE_VIEW,
    ADMIN_PERMISSIONS.FINANCIAL_ANALYTICS,
    ADMIN_PERMISSIONS.SYSTEM_MONITORING
  ],
  securityLevel: SECURITY_LEVELS.HIGH,
  sessionTimeout: 15 * 60 * 1000, // 15 minutes
  auditLogging: true,
  biometricAuth: Platform.OS === 'ios' || Platform.OS === 'android'
};

/**
 * 🎯 MAIN REVENUE ADMIN LAYOUT COMPONENT
 */
export default function RevenueAdminLayout() {
  return (
    <AdminSecurityWrapper config={REVENUE_ADMIN_CONFIG}>
      <RevenueDashboardProvider>
        <RevenueLayoutContent />
      </RevenueDashboardProvider>
    </AdminSecurityWrapper>
  );
}

/**
 * 📊 REVENUE LAYOUT CONTENT WITH ENTERPRISE FEATURES
 */
function RevenueLayoutContent() {
  const router = useRouter();
  const segments = useSegments();
  const { 
    user, 
    hasPermission, 
    logout,
    refreshSession 
  } = useAuth();
  
  const { 
    revenueData, 
    refreshRevenueData, 
    realTimeUpdates,
    systemHealth 
  } = useRevenueDashboard();
  
  const { qualityMetrics } = useQuality();
  
  const [activeSection, setActiveSection] = useState('dashboard');
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🛡️ SECURITY & PERMISSION VERIFICATION
  useEffect(() => {
    const verifyAccess = async () => {
      try {
        setIsLoading(true);
        
        // Enhanced permission check
        const hasRevenueAccess = await checkAdminPermissions(
          user?.id, 
          REVENUE_ADMIN_CONFIG.requiredPermissions
        );

        if (!hasRevenueAccess) {
          logger.warn('Unauthorized revenue admin access attempt', { userId: user?.id });
          router.replace('/(admin)/unauthorized');
          return;
        }

        // Initialize revenue dashboard
        await initializeRevenueDashboard();

        logger.info('Revenue admin access granted', { 
          userId: user?.id, 
          permissions: REVENUE_ADMIN_CONFIG.requiredPermissions 
        });

      } catch (error) {
        logger.error('Revenue admin access verification failed', error);
        Alert.alert(
          'Security Error',
          'Unable to verify administrative access. Please contact system administrator.',
          [{ text: 'OK', onPress: () => router.replace('/(admin)') }]
        );
      } finally {
        setIsLoading(false);
      }
    };

    verifyAccess();
  }, [user?.id]);

  // 🔄 AUTO-SESSION REFRESH & SECURITY MONITORING
  useEffect(() => {
    const activityMonitor = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      
      // Auto-logout after 15 minutes of inactivity
      if (inactiveTime > REVENUE_ADMIN_CONFIG.sessionTimeout) {
        handleAutoLogout();
      }
      
      // Refresh session every 5 minutes
      if (inactiveTime < 300000) { // 5 minutes
        refreshSession();
      }
    }, 60000); // Check every minute

    return () => clearInterval(activityMonitor);
  }, [lastActivity]);

  // 🔙 ANDROID BACK BUTTON HANDLER
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (segments.length > 2) {
        router.back();
        return true;
      }
      
      Alert.alert(
        'Exit Revenue Admin?',
        'Are you sure you want to exit the revenue dashboard?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Exit', 
            style: 'destructive',
            onPress: () => router.replace('/(admin)')
          }
        ]
      );
      return true;
    });

    return () => backHandler.remove();
  }, [segments]);

  // 📊 INITIALIZE REVENUE DASHBOARD
  const initializeRevenueDashboard = async () => {
    try {
      await refreshRevenueData();
      
      // Start real-time updates
      realTimeUpdates.start();
      
      logger.info('Revenue dashboard initialized successfully');
    } catch (error) {
      logger.error('Revenue dashboard initialization failed', error);
      throw error;
    }
  };

  // 🔐 AUTO-LOGOUT HANDLER
  const handleAutoLogout = () => {
    logger.warn('Auto-logout due to inactivity', { userId: user?.id });
    
    Alert.alert(
      'Session Expired',
      'Your admin session has expired due to inactivity.',
      [{ text: 'OK', onPress: () => logout() }]
    );
  };

  // 🎯 ACTIVITY TRACKING
  const trackUserActivity = () => {
    setLastActivity(Date.now());
  };

  // 🚨 SECURITY ALERT HANDLER
  const handleSecurityAlert = (alert) => {
    setSecurityAlerts(prev => [alert, ...prev.slice(0, 4)]); // Keep last 5 alerts
    
    logger.security('Revenue admin security alert', alert);
  };

  // 📱 SECTION CHANGE HANDLER
  const handleSectionChange = (section) => {
    trackUserActivity();
    setActiveSection(section);
  };

  // 🆘 EMERGENCY LOCKDOWN
  const emergencyLockdown = () => {
    Alert.alert(
      'Emergency Lockdown',
      'This will immediately lock all revenue administrative functions. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Lockdown', 
          style: 'destructive',
          onPress: () => {
            logger.security('EMERGENCY LOCKDOWN ACTIVATED', { userId: user?.id });
            router.replace('/(admin)/lockdown');
          }
        }
      ]
    );
  };

  // 🎨 RENDER LOADING STATE
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1a365d" />
        <View style={styles.loadingContent}>
          <Text style={styles.loadingTitle}>Mosa Forge Revenue</Text>
          <Text style={styles.loadingSubtitle}>Initializing Secure Admin Session...</Text>
          <View style={styles.securityBadge}>
            <Text style={styles.securityText}>🔒 HIGH SECURITY MODE</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} onTouchStart={trackUserActivity}>
      {/* 🎯 ENTERPRISE STACK CONFIGURATION */}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#f8fafc' }
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Revenue Dashboard',
            statusBarStyle: 'light',
            statusBarColor: '#1a365d'
          }}
        />
        <Stack.Screen
          name="analytics"
          options={{
            title: 'Revenue Analytics',
            statusBarStyle: 'light',
            statusBarColor: '#2d3748'
          }}
        />
        <Stack.Screen
          name="payouts"
          options={{
            title: 'Expert Payouts',
            statusBarStyle: 'light',
            statusBarColor: '#2d3748'
          }}
        />
        <Stack.Screen
          name="distribution"
          options={{
            title: 'Revenue Distribution',
            statusBarStyle: 'light',
            statusBarColor: '#2d3748'
          }}
        />
        <Stack.Screen
          name="reports"
          options={{
            title: 'Financial Reports',
            statusBarStyle: 'light',
            statusBarColor: '#2d3748'
          }}
        />
      </Stack>

      {/* 🛡️ ENTERPRISE SECURITY OVERLAY */}
      <AdminSecurityWrapper 
        config={REVENUE_ADMIN_CONFIG}
        onSecurityAlert={handleSecurityAlert}
      >
        {/* 📊 MAIN ADMIN INTERFACE */}
        <View style={styles.adminInterface}>
          {/* 🎯 REAL-TIME METRICS BAR */}
          <RealTimeMetricsBar
            revenueData={revenueData}
            qualityMetrics={qualityMetrics}
            systemHealth={systemHealth}
            onEmergencyLockdown={emergencyLockdown}
          />

          {/* 🏢 REVENUE HEADER */}
          <RevenueHeader
            user={user}
            activeSection={activeSection}
            securityAlerts={securityAlerts}
            onLogout={logout}
            onRefresh={refreshRevenueData}
          />

          {/* 🧭 INTELLIGENT NAVIGATION */}
          <RevenueNavigation
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            userPermissions={user?.permissions || []}
            revenueData={revenueData}
          />

          {/* 📈 SYSTEM HEALTH MONITOR */}
          <SystemHealthMonitor
            systemHealth={systemHealth}
            onAlert={handleSecurityAlert}
          />
        </View>
      </AdminSecurityWrapper>
    </View>
  );
}

/**
 * 🎨 ENTERPRISE-LEVEL STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a365d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 32,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#cbd5e0',
    marginBottom: 24,
    textAlign: 'center',
  },
  securityBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  securityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 1,
  },
  adminInterface: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  // 🎯 ENTERPRISE TYPOGRAPHY SCALE
  typography: {
    h1: {
      fontSize: 28,
      fontWeight: '800',
      color: '#1a365d',
    },
    h2: {
      fontSize: 24,
      fontWeight: '700',
      color: '#2d3748',
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      color: '#4a5568',
    },
    body: {
      fontSize: 16,
      color: '#718096',
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      color: '#a0aec0',
    },
  },
  // 🛡️ SECURITY STATUS INDICATORS
  security: {
    high: {
      backgroundColor: '#48bb78',
      color: '#ffffff',
    },
    medium: {
      backgroundColor: '#ed8936',
      color: '#ffffff',
    },
    low: {
      backgroundColor: '#f56565',
      color: '#ffffff',
    },
  },
  // 💰 REVENUE COLOR SCHEME
  revenue: {
    mosa: {
      primary: '#1a365d',
      secondary: '#2d3748',
      accent: '#4299e1',
    },
    expert: {
      primary: '#2f855a',
      secondary: '#38a169',
      accent: '#68d391',
    },
    platform: {
      primary: '#744210',
      secondary: '#ed8936',
      accent: '#f6ad55',
    },
  },
});

/**
 * 🎯 PERFORMANCE OPTIMIZATIONS
 */

// Memoized security validator
const SecurityValidator = React.memo(({ user, config }) => {
  const [isValid, setIsValid] = useState(false);
  
  useEffect(() => {
    validateSecurity();
  }, [user, config]);

  const validateSecurity = async () => {
    try {
      const valid = await checkAdminPermissions(user?.id, config.requiredPermissions);
      setIsValid(valid);
    } catch (error) {
      setIsValid(false);
      logger.error('Security validation failed', error);
    }
  };

  return isValid;
});

// Optimized activity tracker
const useActivityTracker = (timeout = 900000) => { // 15 minutes
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    const handleActivity = () => setLastActivity(Date.now());
    
    // Track multiple activity types
    const events = ['touchstart', 'mousedown', 'keypress', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  return lastActivity;
};

export {
  REVENUE_ADMIN_CONFIG,
  SecurityValidator,
  useActivityTracker,
};