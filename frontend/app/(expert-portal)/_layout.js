/**
 * 🎯 MOSA FORGE: Enterprise Expert Portal Layout
 * 
 * @file _layout.js
 * @description Root layout for Expert Portal with navigation, state management, and quality enforcement
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Multi-tab expert navigation
 * - Quality-based access control
 * - Real-time earnings dashboard
 * - Student roster management
 * - Session scheduling system
 * - Performance analytics integration
 */

import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { 
  Platform, 
  StatusBar, 
  AppState, 
  BackHandler,
  Alert 
} from 'react-native';
import { 
  SafeAreaView, 
  SafeAreaProvider 
} from 'react-native-safe-area-context';
import { 
  Provider as PaperProvider, 
  ActivityIndicator, 
  Snackbar 
} from 'react-native-paper';
import { EventEmitter } from 'events';

// 🏗️ Enterprise Components
import QualityEnforcementBanner from '../../components/quality/QualityEnforcementBanner';
import EarningsTrackerHeader from '../../components/expert/EarningsTrackerHeader';
import PerformanceMetricsProvider from '../../contexts/PerformanceMetricsProvider';
import QualityMetricsProvider from '../../contexts/QualityMetricsProvider';
import NetworkStatusMonitor from '../../components/shared/NetworkStatusMonitor';
import SessionTimeoutHandler from '../../components/auth/SessionTimeoutHandler';

// 🏗️ Enterprise Hooks
import { useQualityMetrics } from '../../hooks/use-quality-metrics';
import { useExpertPerformance } from '../../hooks/use-expert-performance';
import { useAuth } from '../../contexts/auth-context';
import { usePayment } from '../../contexts/payment-context';

// 🏗️ Enterprise Constants
const EXPERT_TIERS = {
  MASTER: { 
    name: 'Master Expert', 
    minQuality: 4.7, 
    color: '#FFD700',
    bonus: 0.2 
  },
  SENIOR: { 
    name: 'Senior Expert', 
    minQuality: 4.3, 
    color: '#C0C0C0',
    bonus: 0.1 
  },
  STANDARD: { 
    name: 'Standard Expert', 
    minQuality: 4.0, 
    color: '#CD7F32',
    bonus: 0 
  },
  DEVELOPING: { 
    name: 'Developing Expert', 
    minQuality: 3.5, 
    color: '#808080',
    bonus: -0.1 
  },
  PROBATION: { 
    name: 'Probation Expert', 
    minQuality: 0, 
    color: '#FF4444',
    bonus: -0.2 
  }
};

const TAB_ACCESS_LEVELS = {
  DASHBOARD: ['PROBATION', 'DEVELOPING', 'STANDARD', 'SENIOR', 'MASTER'],
  QUALITY: ['STANDARD', 'SENIOR', 'MASTER'],
  STUDENTS: ['DEVELOPING', 'STANDARD', 'SENIOR', 'MASTER'],
  EARNINGS: ['STANDARD', 'SENIOR', 'MASTER'],
  SESSIONS: ['STANDARD', 'SENIOR', 'MASTER']
};

/**
 * 🏗️ Enterprise Event Manager for Expert Portal
 */
class ExpertPortalEventManager extends EventEmitter {
  constructor() {
    super();
    this.events = {
      QUALITY_UPDATE: 'quality_updated',
      EARNINGS_UPDATE: 'earnings_updated',
      SESSION_REMINDER: 'session_reminder',
      STUDENT_ALERT: 'student_alert',
      PERFORMANCE_WARNING: 'performance_warning',
      TIER_CHANGE: 'tier_change'
    };
  }

  notifyQualityUpdate(metrics) {
    this.emit(this.events.QUALITY_UPDATE, {
      timestamp: new Date().toISOString(),
      metrics,
      severity: this._calculateQualitySeverity(metrics.overallScore)
    });
  }

  notifyEarningsUpdate(earnings) {
    this.emit(this.events.EARNINGS_UPDATE, {
      timestamp: new Date().toISOString(),
      earnings,
      nextPayout: this._calculateNextPayout(earnings)
    });
  }

  _calculateQualitySeverity(score) {
    if (score >= 4.5) return 'SUCCESS';
    if (score >= 4.0) return 'INFO';
    if (score >= 3.5) return 'WARNING';
    return 'ERROR';
  }

  _calculateNextPayout(earnings) {
    const today = new Date();
    const nextPayout = new Date(today);
    
    // Payouts on 1st, 11th, 21st of each month (333 ETB schedule)
    if (today.getDate() < 10) {
      nextPayout.setDate(10);
    } else if (today.getDate() < 20) {
      nextPayout.setDate(20);
    } else {
      nextPayout.setMonth(today.getMonth() + 1);
      nextPayout.setDate(1);
    }
    
    return nextPayout;
  }
}

// 🏗️ Global Event Manager Instance
const expertEventManager = new ExpertPortalEventManager();

/**
 * 🏗️ Expert Portal Layout Component
 */
export default function ExpertPortalLayout() {
  // 🏗️ State Management
  const [appState, setAppState] = useState(AppState.currentState);
  const [isLoading, setIsLoading] = useState(true);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [expertTier, setExpertTier] = useState(null);
  const [qualityMetrics, setQualityMetrics] = useState(null);
  const [pendingSessions, setPendingSessions] = useState(0);

  // 🏗️ Enterprise Context Hooks
  const { expert, isAuthenticated, logout, refreshSession } = useAuth();
  const { 
    qualityScore, 
    completionRate, 
    studentSatisfaction, 
    loadQualityMetrics,
    hasQualityAlerts 
  } = useQualityMetrics();
  
  const { 
    currentEarnings, 
    pendingPayouts, 
    totalStudents,
    loadPerformanceMetrics 
  } = useExpertPerformance();
  
  const { revenueSplit, payoutSchedule } = usePayment();

  /**
   * 🏗️ Initialize Expert Portal
   */
  useEffect(() => {
    const initializePortal = async () => {
      try {
        setIsLoading(true);
        
        // 🎯 Parallel Data Loading for Performance
        await Promise.all([
          loadExpertProfile(),
          loadQualityMetrics(),
          loadPerformanceMetrics(),
          initializeEventListeners(),
          checkPendingSessions()
        ]);

        // 🎯 Determine Expert Tier
        const tier = calculateExpertTier(qualityScore);
        setExpertTier(tier);

        // 🎯 Notify Initialization Complete
        expertEventManager.notifyQualityUpdate({
          overallScore: qualityScore,
          completionRate,
          studentSatisfaction
        });

        setIsLoading(false);

      } catch (error) {
        console.error('Expert portal initialization failed:', error);
        showSnackbar('Failed to load expert dashboard. Please restart the app.');
        setIsLoading(false);
      }
    };

    initializePortal();

    // 🏗️ Cleanup Function
    return () => {
      removeEventListeners();
    };
  }, []);

  /**
   * 🏗️ App State Management
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - refresh data
        refreshSession();
        loadQualityMetrics();
        loadPerformanceMetrics();
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, [appState]);

  /**
   * 🏗️ Hardware Back Handler for Android
   */
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (expert?.id) {
        // Show confirmation before exiting expert portal
        Alert.alert(
          'Exit Expert Portal?',
          'Are you sure you want to exit the expert portal?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', onPress: () => BackHandler.exitApp() }
          ]
        );
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [expert?.id]);

  /**
   * 🏗️ Load Expert Profile Data
   */
  const loadExpertProfile = async () => {
    try {
      // This would typically call an API service
      const profile = await expertService.getProfile(expert.id);
      
      if (!profile.isActive) {
        throw new Error('Expert account is not active');
      }

      if (profile.qualityScore < 3.5) {
        showSnackbar('Quality score below minimum threshold. Some features may be restricted.');
      }

      return profile;
    } catch (error) {
      console.error('Failed to load expert profile:', error);
      throw error;
    }
  };

  /**
   * 🏗️ Calculate Expert Tier Based on Quality Metrics
   */
  const calculateExpertTier = (qualityScore) => {
    if (qualityScore >= 4.7) return EXPERT_TIERS.MASTER;
    if (qualityScore >= 4.3) return EXPERT_TIERS.SENIOR;
    if (qualityScore >= 4.0) return EXPERT_TIERS.STANDARD;
    if (qualityScore >= 3.5) return EXPERT_TIERS.DEVELOPING;
    return EXPERT_TIERS.PROBATION;
  };

  /**
   * 🏗️ Initialize Event Listeners
   */
  const initializeEventListeners = () => {
    // Quality Metrics Updates
    expertEventManager.on(expertEventManager.events.QUALITY_UPDATE, (data) => {
      setQualityMetrics(data.metrics);
      const newTier = calculateExpertTier(data.metrics.overallScore);
      
      if (newTier !== expertTier) {
        setExpertTier(newTier);
        showSnackbar(`Tier updated: ${newTier.name}`);
      }
    });

    // Earnings Updates
    expertEventManager.on(expertEventManager.events.EARNINGS_UPDATE, (data) => {
      showSnackbar(`Earnings updated. Next payout: ${formatDate(data.nextPayout)}`);
    });

    // Session Reminders
    expertEventManager.on(expertEventManager.events.SESSION_REMINDER, (data) => {
      showSnackbar(`Upcoming session: ${data.sessionTitle} in 15 minutes`);
    });

    // Performance Warnings
    expertEventManager.on(expertEventManager.events.PERFORMANCE_WARNING, (data) => {
      Alert.alert('Performance Alert', data.message);
    });
  };

  /**
   * 🏗️ Remove Event Listeners
   */
  const removeEventListeners = () => {
    expertEventManager.removeAllListeners();
  };

  /**
   * 🏗️ Check for Pending Sessions
   */
  const checkPendingSessions = async () => {
    try {
      const sessions = await trainingService.getPendingSessions(expert.id);
      setPendingSessions(sessions.length);
      
      if (sessions.length > 0) {
        expertEventManager.emit(expertEventManager.events.SESSION_REMINDER, {
          sessionTitle: `${sessions.length} pending sessions`,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to check pending sessions:', error);
    }
  };

  /**
   * 🏗️ Show Snackbar Notification
   */
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  /**
   * 🏗️ Check Tab Access Permission
   */
  const hasTabAccess = (tabName) => {
    if (!expertTier) return false;
    
    const allowedTiers = TAB_ACCESS_LEVELS[tabName.toUpperCase()];
    return allowedTiers.includes(expertTier.name.toUpperCase().split(' ')[0]);
  };

  /**
   * 🏗️ Format Date Utility
   */
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-ET', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // 🏗️ Show Loading State
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#1a1a1a'
        }}>
          <ActivityIndicator 
            size="large" 
            color={expertTier?.color || '#6366f1'} 
          />
          <Text style={{ 
            marginTop: 16, 
            color: '#fff', 
            fontSize: 16,
            fontFamily: 'Inter-Medium'
          }}>
            Loading Expert Portal...
          </Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // 🏗️ Main Layout Render
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <PerformanceMetricsProvider>
          <QualityMetricsProvider>
            {/* 🏗️ Network Status Monitor */}
            <NetworkStatusMonitor 
              onStatusChange={setConnectionStatus}
            />

            {/* 🏗️ Session Timeout Handler */}
            <SessionTimeoutHandler 
              onTimeout={() => {
                logout();
                showSnackbar('Session expired. Please login again.');
              }}
            />

            {/* 🏗️ Status Bar Configuration */}
            <StatusBar
              barStyle="light-content"
              backgroundColor={expertTier?.color || "#6366f1"}
              translucent={false}
            />

            {/* 🏗️ Quality Enforcement Banner */}
            <QualityEnforcementBanner
              qualityScore={qualityScore}
              tier={expertTier}
              hasAlerts={hasQualityAlerts}
              onImprovementPress={() => {
                // Navigate to quality improvement screen
                router.push('/expert-portal/quality-improvement');
              }}
            />

            {/* 🏗️ Earnings Tracker Header */}
            <EarningsTrackerHeader
              currentEarnings={currentEarnings}
              pendingPayouts={pendingPayouts}
              tier={expertTier}
              revenueSplit={revenueSplit}
              onEarningsPress={() => {
                router.push('/expert-portal/earnings-breakdown');
              }}
            />

            {/* 🏗️ Main Tab Navigator */}
            <Tabs
              screenOptions={{
                // 🎯 Global Tab Styles
                tabBarStyle: {
                  backgroundColor: '#1a1a1a',
                  borderTopColor: '#333',
                  borderTopWidth: 1,
                  height: Platform.OS === 'ios' ? 90 : 70,
                  paddingBottom: Platform.OS === 'ios' ? 30 : 10,
                  paddingTop: 10,
                },
                tabBarActiveTintColor: expertTier?.color || '#6366f1',
                tabBarInactiveTintColor: '#888',
                tabBarLabelStyle: {
                  fontSize: 12,
                  fontFamily: 'Inter-Medium',
                  marginBottom: 4,
                },
                headerStyle: {
                  backgroundColor: expertTier?.color || '#6366f1',
                  elevation: 0,
                  shadowOpacity: 0,
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                  fontFamily: 'Inter-Bold',
                  fontSize: 18,
                },
                // 🎯 Disable gesture for back navigation in expert portal
                headerLeft: () => null,
              }}
            >

              {/* 🏗️ Dashboard Tab */}
              <Tabs.Screen
                name="dashboard"
                options={{
                  title: 'Dashboard',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="speedometer" size={size} color={color} />
                  ),
                  headerTitle: `Expert Dashboard - ${expertTier?.name || 'Loading...'}`,
                  // 🎯 Quality-based access control
                  tabBarButton: hasTabAccess('dashboard') ? undefined : () => null,
                }}
              />

              {/* 🏗️ Quality Tab */}
              <Tabs.Screen
                name="quality"
                options={{
                  title: 'Quality',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="trending-up" size={size} color={color} />
                  ),
                  headerTitle: 'Quality Metrics',
                  tabBarBadge: hasQualityAlerts ? '!' : undefined,
                  tabBarBadgeStyle: {
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    fontSize: 12,
                  },
                  // 🎯 Quality-based access control
                  tabBarButton: hasTabAccess('quality') ? undefined : () => null,
                }}
              />

              {/* 🏗️ Students Tab */}
              <Tabs.Screen
                name="students"
                options={{
                  title: 'Students',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="people" size={size} color={color} />
                  ),
                  headerTitle: 'Student Roster',
                  tabBarBadge: totalStudents > 0 ? totalStudents.toString() : undefined,
                  // 🎯 Quality-based access control
                  tabBarButton: hasTabAccess('students') ? undefined : () => null,
                }}
              />

              {/* 🏗️ Sessions Tab */}
              <Tabs.Screen
                name="sessions"
                options={{
                  title: 'Sessions',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="calendar" size={size} color={color} />
                  ),
                  headerTitle: 'Training Sessions',
                  tabBarBadge: pendingSessions > 0 ? pendingSessions.toString() : undefined,
                  // 🎯 Quality-based access control
                  tabBarButton: hasTabAccess('sessions') ? undefined : () => null,
                }}
              />

              {/* 🏗️ Earnings Tab */}
              <Tabs.Screen
                name="earnings"
                options={{
                  title: 'Earnings',
                  tabBarIcon: ({ color, size }) => (
                    <Ionicons name="cash" size={size} color={color} />
                  ),
                  headerTitle: 'Earnings & Payouts',
                  // 🎯 Quality-based access control
                  tabBarButton: hasTabAccess('earnings') ? undefined : () => null,
                }}
              />

            </Tabs>

            {/* 🏗️ Connection Status Indicator */}
            {connectionStatus === 'offline' && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: '#ef4444',
                padding: 8,
                alignItems: 'center'
              }}>
                <Text style={{ color: '#fff', fontSize: 12 }}>
                  Offline Mode - Limited functionality
                </Text>
              </View>
            )}

            {/* 🏗️ Global Snackbar */}
            <Snackbar
              visible={snackbarVisible}
              onDismiss={() => setSnackbarVisible(false)}
              duration={4000}
              action={{
                label: 'Dismiss',
                onPress: () => setSnackbarVisible(false),
              }}
              style={{
                backgroundColor: '#1a1a1a',
                borderLeftColor: expertTier?.color || '#6366f1',
                borderLeftWidth: 4,
              }}
            >
              {snackbarMessage}
            </Snackbar>

          </QualityMetricsProvider>
        </PerformanceMetricsProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

// 🏗️ Export Event Manager for use in other components
export { expertEventManager, EXPERT_TIERS };