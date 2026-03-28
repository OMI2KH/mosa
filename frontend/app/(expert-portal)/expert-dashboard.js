/**
 * 🎯 MOSA FORGE: Enterprise Expert Dashboard
 * 
 * @module ExpertDashboard
 * @description Main dashboard for experts with real-time metrics, quality tracking, and performance analytics
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time performance metrics
 * - Quality score monitoring
 * - Revenue and payout tracking
 * - Student roster management
 * - Session scheduling interface
 * - Tier progression tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  Alert,
  Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { EventEmitter } from 'events';

// 🏗️ Enterprise Components
import QualityDashboard from '../components/quality/QualityDashboard';
import RevenueTracker from '../components/expert/RevenueTracker';
import StudentRoster from '../components/expert/StudentRoster';
import SessionScheduler from '../components/expert/SessionScheduler';
import PerformanceMetrics from '../components/quality/PerformanceMetrics';
import TierProgression from '../components/quality/TierProgression';
import QuickActions from '../components/expert/QuickActions';

// 🏗️ Enterprise Services
import ExpertService from '../../services/expert-service';
import QualityService from '../../services/quality-service';
import PaymentService from '../../services/payment-service';
import AnalyticsService from '../../services/analytics-service';

// 🏗️ Enterprise Constants
const DASHBOARD_EVENTS = {
  DATA_REFRESH: 'data_refresh',
  QUALITY_ALERT: 'quality_alert',
  PAYOUT_RECEIVED: 'payout_received',
  SESSION_REMINDER: 'session_reminder',
  TIER_UPDATE: 'tier_update'
};

const QUALITY_THRESHOLDS = {
  MASTER: 4.7,
  SENIOR: 4.3,
  STANDARD: 4.0,
  WARNING: 3.8,
  CRITICAL: 3.5
};

/**
 * 🏗️ Enterprise Expert Dashboard Component
 * @component ExpertDashboard
 * @description Main dashboard for experts with real-time data and analytics
 */
const ExpertDashboard = ({ navigation, route }) => {
  // 🏗️ State Management
  const [expertData, setExpertData] = useState(null);
  const [qualityMetrics, setQualityMetrics] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [studentRoster, setStudentRoster] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [performanceStats, setPerformanceStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [alerts, setAlerts] = useState([]);

  // 🏗️ Service Instances
  const expertService = ExpertService.getInstance();
  const qualityService = QualityService.getInstance();
  const paymentService = PaymentService.getInstance();
  const analyticsService = AnalyticsService.getInstance();
  // keep a stable emitter across renders
  const eventEmitterRef = useRef(new EventEmitter());
  // store interval id in a ref to avoid redeclaration and `this` usage
  const intervalRef = useRef(null);

  /**
   * 🏗️ Initialize Dashboard Data
   */
  useEffect(() => {
    initializeDashboard();
    setupEventListeners();
    startRealTimeUpdates();

    return () => {
      cleanupEventListeners();
      stopRealTimeUpdates();
    };
  }, []);

  /**
   * 🏗️ Refresh on Focus
   */
  useFocusEffect(
    useCallback(() => {
      refreshDashboardData();
    }, [])
  );

  /**
   * 🏗️ Initialize Dashboard
   */
  const initializeDashboard = async () => {
    try {
      setLoading(true);
      
      // 🎯 Parallel Data Loading for Performance
      await Promise.all([
        loadExpertProfile(),
        loadQualityMetrics(),
        loadRevenueData(),
        loadStudentRoster(),
        loadUpcomingSessions(),
        loadPerformanceStats()
      ]);

      setLastUpdated(new Date());
      trackDashboardView();

    } catch (error) {
      handleDashboardError(error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🏗️ Load Expert Profile Data
   */
  const loadExpertProfile = async () => {
    try {
      const profile = await expertService.getExpertProfile();
      
      if (!profile || !profile.id) {
        throw new Error('Invalid expert profile data');
      }

      setExpertData(profile);
      
      // 🏗️ Validate Expert Status
      if (profile.status !== 'ACTIVE') {
        addAlert({
          id: 'expert_inactive',
          type: 'warning',
          title: 'Account Review Needed',
          message: 'Your expert account requires verification',
          action: 'Contact Support',
          priority: 'high'
        });
      }

    } catch (error) {
      console.error('Expert profile loading failed:', error);
      throw new Error(`Profile load failed: ${error.message}`);
    }
  };

  /**
   * 🏗️ Load Quality Metrics
   */
  const loadQualityMetrics = async () => {
    try {
      const metrics = await qualityService.getExpertQualityMetrics();
      
      if (!metrics) {
        throw new Error('Quality metrics not available');
      }

      setQualityMetrics(metrics);
      
      // 🏗️ Quality Alerts
      checkQualityAlerts(metrics);

    } catch (error) {
      console.error('Quality metrics loading failed:', error);
      throw new Error(`Quality metrics load failed: ${error.message}`);
    }
  };

  /**
   * 🏗️ Load Revenue Data
   */
  const loadRevenueData = async () => {
    try {
      const revenue = await paymentService.getExpertRevenueData();
      
      if (!revenue) {
        throw new Error('Revenue data not available');
      }

      setRevenueData(revenue);
      
      // 🏗️ Payout Alerts
      checkPayoutAlerts(revenue);

    } catch (error) {
      console.error('Revenue data loading failed:', error);
      throw new Error(`Revenue data load failed: ${error.message}`);
    }
  };

  /**
   * 🏗️ Load Student Roster
   */
  const loadStudentRoster = async () => {
    try {
      const roster = await expertService.getStudentRoster();
      
      if (!Array.isArray(roster)) {
        throw new Error('Invalid student roster data');
      }

      setStudentRoster(roster);
      
      // 🏗️ Student Management Alerts
      checkStudentAlerts(roster);

    } catch (error) {
      console.error('Student roster loading failed:', error);
      throw new Error(`Student roster load failed: ${error.message}`);
    }
  };

  /**
   * 🏗️ Load Upcoming Sessions
   */
  const loadUpcomingSessions = async () => {
    try {
      const sessions = await expertService.getUpcomingSessions();
      
      if (!Array.isArray(sessions)) {
        throw new Error('Invalid sessions data');
      }

      setUpcomingSessions(sessions);
      
      // 🏗️ Session Reminders
      checkSessionReminders(sessions);

    } catch (error) {
      console.error('Sessions loading failed:', error);
      throw new Error(`Sessions load failed: ${error.message}`);
    }
  };

  /**
   * 🏗️ Load Performance Statistics
   */
  const loadPerformanceStats = async () => {
    try {
      const stats = await analyticsService.getExpertPerformanceStats();
      
      if (!stats) {
        throw new Error('Performance stats not available');
      }

      setPerformanceStats(stats);

    } catch (error) {
      console.error('Performance stats loading failed:', error);
      throw new Error(`Performance stats load failed: ${error.message}`);
    }
  };

  /**
   * 🏗️ Check Quality Alerts
   */
  const checkQualityAlerts = (metrics) => {
    const alerts = [];

    // Quality Score Alerts
    if (metrics.overallScore < QUALITY_THRESHOLDS.WARNING) {
      alerts.push({
        id: 'quality_warning',
        type: 'warning',
        title: 'Quality Score Alert',
        message: `Your quality score (${metrics.overallScore}) is below warning threshold`,
        action: 'View Improvement Plan',
        priority: 'medium'
      });
    }

    if (metrics.overallScore < QUALITY_THRESHOLDS.CRITICAL) {
      alerts.push({
        id: 'quality_critical',
        type: 'error',
        title: 'Critical Quality Alert',
        message: `Immediate action required. Quality score: ${metrics.overallScore}`,
        action: 'Contact Quality Manager',
        priority: 'high'
      });
    }

    // Completion Rate Alerts
    if (metrics.completionRate < 0.7) {
      alerts.push({
        id: 'completion_low',
        type: 'warning',
        title: 'Low Completion Rate',
        message: `Student completion rate (${(metrics.completionRate * 100).toFixed(1)}%) needs improvement`,
        action: 'Review Teaching Methods',
        priority: 'medium'
      });
    }

    // Response Time Alerts
    if (metrics.averageResponseTime > 24) {
      alerts.push({
        id: 'response_slow',
        type: 'info',
        title: 'Response Time Notice',
        message: `Average response time: ${metrics.averageResponseTime}h (Target: <24h)`,
        action: 'Improve Response Time',
        priority: 'low'
      });
    }

    setAlerts(prev => [...prev, ...alerts]);
  };

  /**
   * 🏗️ Check Payout Alerts
   */
  const checkPayoutAlerts = (revenue) => {
    const alerts = [];

    // Upcoming Payouts
    const upcomingPayouts = revenue.upcomingPayouts?.filter(p => 
      new Date(p.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    if (upcomingPayouts?.length > 0) {
      alerts.push({
        id: 'payout_upcoming',
        type: 'info',
        title: 'Upcoming Payouts',
        message: `${upcomingPayouts.length} payout(s) due this week`,
        action: 'View Payout Schedule',
        priority: 'low'
      });
    }

    // Bonus Eligibility
    if (revenue.potentialBonus > 0) {
      alerts.push({
        id: 'bonus_opportunity',
        type: 'success',
        title: 'Bonus Opportunity',
        message: `Earn up to ${revenue.potentialBonus} ETB bonus this month`,
        action: 'View Bonus Criteria',
        priority: 'medium'
      });
    }

    setAlerts(prev => [...prev, ...alerts]);
  };

  /**
   * 🏗️ Check Student Alerts
   */
  const checkStudentAlerts = (roster) => {
    const alerts = [];

    // At-risk Students
    const atRiskStudents = roster.filter(student => 
      student.progressRate < 0.5 && student.daysSinceLastActivity > 7
    );

    if (atRiskStudents.length > 0) {
      alerts.push({
        id: 'students_at_risk',
        type: 'warning',
        title: 'Students Need Attention',
        message: `${atRiskStudents.length} student(s) are falling behind`,
        action: 'Review Progress',
        priority: 'medium'
      });
    }

    // New Students
    const newStudents = roster.filter(student => 
      student.daysSinceEnrollment < 7
    );

    if (newStudents.length > 0) {
      alerts.push({
        id: 'new_students',
        type: 'info',
        title: 'New Students',
        message: `${newStudents.length} new student(s) enrolled`,
        action: 'Welcome Students',
        priority: 'low'
      });
    }

    setAlerts(prev => [...prev, ...alerts]);
  };

  /**
   * 🏗️ Check Session Reminders
   */
  const checkSessionReminders = (sessions) => {
    const now = new Date();
    const next24Hours = sessions.filter(session => {
      const sessionTime = new Date(session.scheduledTime);
      return sessionTime > now && sessionTime <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
    });

    if (next24Hours.length > 0) {
      setAlerts(prev => [...prev, {
        id: 'sessions_soon',
        type: 'info',
        title: 'Upcoming Sessions',
        message: `${next24Hours.length} session(s) in next 24 hours`,
        action: 'Review Schedule',
        priority: 'medium'
      }]);
    }
  };

  /**
   * 🏗️ Setup Event Listeners
   */
  const setupEventListeners = () => {
    const emitter = eventEmitterRef.current;
    emitter.on(DASHBOARD_EVENTS.DATA_REFRESH, handleDataRefresh);
    emitter.on(DASHBOARD_EVENTS.QUALITY_ALERT, handleQualityAlert);
    emitter.on(DASHBOARD_EVENTS.PAYOUT_RECEIVED, handlePayoutReceived);
    emitter.on(DASHBOARD_EVENTS.SESSION_REMINDER, handleSessionReminder);
    emitter.on(DASHBOARD_EVENTS.TIER_UPDATE, handleTierUpdate);
  };

  /**
   * 🏗️ Cleanup Event Listeners
   */
  const cleanupEventListeners = () => {
    eventEmitterRef.current.removeAllListeners();
  };

  /**
   * 🏗️ Start Real-time Updates
   */
  const startRealTimeUpdates = () => {
    // Refresh data every 5 minutes. Store id in ref to avoid redeclaration.
    intervalRef.current = setInterval(() => {
      refreshDashboardData();
    }, 5 * 60 * 1000);
  };

  /**
   * 🏗️ Stop Real-time Updates
   */
  const stopRealTimeUpdates = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  /**
   * 🏗️ Handle Data Refresh Event
   */
  const handleDataRefresh = (data) => {
    refreshDashboardData();
  };

  /**
   * 🏗️ Handle Quality Alert Event
   */
  const handleQualityAlert = (alert) => {
    addAlert({
      id: `quality_${Date.now()}`,
      type: 'warning',
      title: 'Quality Update',
      message: alert.message,
      action: 'View Details',
      priority: 'high'
    });
  };

  /**
   * 🏗️ Handle Payout Received Event
   */
  const handlePayoutReceived = (payout) => {
    addAlert({
      id: `payout_${payout.id}`,
      type: 'success',
      title: 'Payout Received',
      message: `ETB ${payout.amount} has been processed`,
      action: 'View Transaction',
      priority: 'medium'
    });

    // Refresh revenue data
    loadRevenueData();
  };

  /**
   * 🏗️ Handle Session Reminder Event
   */
  const handleSessionReminder = (session) => {
    addAlert({
      id: `session_reminder_${session.id}`,
      type: 'info',
      title: 'Session Starting Soon',
      message: `Session with ${session.studentName} in 30 minutes`,
      action: 'Join Session',
      priority: 'high'
    });
  };

  /**
   * 🏗️ Handle Tier Update Event
   */
  const handleTierUpdate = (update) => {
    addAlert({
      id: `tier_update_${Date.now()}`,
      type: 'success',
      title: 'Tier Promotion!',
      message: `Congratulations! You've been promoted to ${update.newTier} tier`,
      action: 'View Benefits',
      priority: 'medium'
    });

    // Refresh expert data
    loadExpertProfile();
  };

  /**
   * 🏗️ Add Alert
   */
  const addAlert = (alert) => {
    setAlerts(prev => {
      const existingIndex = prev.findIndex(a => a.id === alert.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = alert;
        return updated;
      }
      return [alert, ...prev].slice(0, 10); // Limit to 10 alerts
    });
  };

  /**
   * 🏗️ Remove Alert
   */
  const removeAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  /**
   * 🏗️ Refresh Dashboard Data
   */
  const refreshDashboardData = async () => {
    try {
      setRefreshing(true);
      
      await Promise.all([
        loadQualityMetrics(),
        loadRevenueData(),
        loadStudentRoster(),
        loadUpcomingSessions()
      ]);

      setLastUpdated(new Date());

    } catch (error) {
      console.error('Dashboard refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * 🏗️ Handle Dashboard Error
   */
  const handleDashboardError = (error) => {
    console.error('Dashboard initialization error:', error);
    
    addAlert({
      id: 'dashboard_error',
      type: 'error',
      title: 'Data Load Failed',
      message: 'Unable to load dashboard data. Please try again.',
      action: 'Retry',
      priority: 'high',
      onAction: initializeDashboard
    });

    // Track error analytics
    analyticsService.trackError('dashboard_initialization', error);
  };

  /**
   * 🏗️ Track Dashboard View
   */
  const trackDashboardView = () => {
    analyticsService.trackEvent('expert_dashboard_view', {
      expertId: expertData?.id,
      tier: expertData?.tier,
      studentCount: studentRoster.length,
      qualityScore: qualityMetrics?.overallScore
    });
  };

  /**
   * 🏗️ Handle Quick Action
   */
  const handleQuickAction = (action) => {
    switch (action) {
      case 'schedule_session':
        navigation.navigate('SessionScheduler');
        break;
      case 'view_students':
        navigation.navigate('StudentManagement');
        break;
      case 'quality_insights':
        navigation.navigate('QualityDashboard');
        break;
      case 'revenue_details':
        navigation.navigate('RevenueAnalytics');
        break;
      default:
        console.warn('Unknown quick action:', action);
    }
  };

  /**
   * 🏗️ Render Loading State
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingText}>Loading Expert Dashboard...</Text>
      <View style={styles.progressBar} />
    </View>
  );

  /**
   * 🏗️ Render Error State
   */
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Dashboard Unavailable</Text>
      <Text style={styles.errorMessage}>
        Unable to load expert dashboard data. Please check your connection and try again.
      </Text>
    </View>
  );

  /**
   * 🏗️ Render Main Dashboard
   */
  const renderDashboard = () => (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refreshDashboardData}
          colors={['#007AFF']}
          tintColor="#007AFF"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* 🎯 Header Section */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome back, {expertData?.firstName || 'Expert'}!
        </Text>
        <Text style={styles.subtitle}>
          {expertData?.tier ? `${expertData.tier} Tier` : 'Loading...'}
        </Text>
        {lastUpdated && (
          <Text style={styles.lastUpdated}>
            Updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        )}
      </View>

      {/* 🚨 Alerts Section */}
      {alerts.length > 0 && (
        <View style={styles.alertsSection}>
          <Text style={styles.sectionTitle}>Important Alerts</Text>
          {alerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={() => removeAlert(alert.id)}
              onAction={alert.onAction}
            />
          ))}
        </View>
      )}

      {/* 📊 Quality Dashboard */}
      <QualityDashboard
        metrics={qualityMetrics}
        tier={expertData?.tier}
        onQualityPress={() => navigation.navigate('QualityDetails')}
      />

      {/* 💰 Revenue Tracker */}
      <RevenueTracker
        revenueData={revenueData}
        onRevenuePress={() => navigation.navigate('RevenueDetails')}
      />

      {/* 🎯 Performance Metrics */}
      <PerformanceMetrics
        stats={performanceStats}
        onMetricsPress={() => navigation.navigate('PerformanceAnalytics')}
      />

      {/* 📈 Tier Progression */}
      <TierProgression
        currentTier={expertData?.tier}
        qualityScore={qualityMetrics?.overallScore}
        completionRate={qualityMetrics?.completionRate}
        onTierPress={() => navigation.navigate('TierBenefits')}
      />

      {/* 👥 Student Roster Preview */}
      <StudentRoster
        students={studentRoster.slice(0, 5)} // Preview only
        onViewAll={() => navigation.navigate('StudentManagement')}
        onStudentPress={(student) => navigation.navigate('StudentDetails', { studentId: student.id })}
      />

      {/* 🗓️ Upcoming Sessions */}
      <SessionScheduler
        sessions={upcomingSessions.slice(0, 3)} // Preview only
        onViewAll={() => navigation.navigate('SessionManagement')}
        onSessionPress={(session) => navigation.navigate('SessionDetails', { sessionId: session.id })}
      />

      {/* ⚡ Quick Actions */}
      <QuickActions onAction={handleQuickAction} />

      {/* 📊 Analytics Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {studentRoster.length} Active Students • 
          {(qualityMetrics?.overallScore || 0).toFixed(1)} Quality Score • 
          {revenueData?.totalEarnings ? ` ETB ${revenueData.totalEarnings}` : ' Calculating...'}
        </Text>
      </View>
    </ScrollView>
  );

  // 🎯 Main Render
  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? renderLoadingState() : 
       !expertData ? renderErrorState() : renderDashboard()}
    </SafeAreaView>
  );
};

/**
 * 🏗️ Alert Card Component
 */
const AlertCard = ({ alert, onDismiss, onAction }) => (
  <View style={[styles.alertCard, styles[`alert${alert.type.charAt(0).toUpperCase() + alert.type.slice(1)}`]]}>
    <View style={styles.alertContent}>
      <Text style={styles.alertTitle}>{alert.title}</Text>
      <Text style={styles.alertMessage}>{alert.message}</Text>
    </View>
    <View style={styles.alertActions}>
      {onAction && (
        <Text style={styles.alertAction} onPress={onAction}>
          {alert.action}
        </Text>
      )}
      <Text style={styles.alertDismiss} onPress={onDismiss}>
        Dismiss
      </Text>
    </View>
  </View>
);

/**
 * 🏗️ Enterprise Styles
 */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    width: 100,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC3545',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 12,
    color: '#ADB5BD',
  },
  alertsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  alertCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  alertSuccess: {
    backgroundColor: '#D4EDDA',
    borderLeftColor: '#28A745',
  },
  alertWarning: {
    backgroundColor: '#FFF3CD',
    borderLeftColor: '#FFC107',
  },
  alertError: {
    backgroundColor: '#F8D7DA',
    borderLeftColor: '#DC3545',
  },
  alertInfo: {
    backgroundColor: '#D1ECF1',
    borderLeftColor: '#17A2B8',
  },
  alertContent: {
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  alertAction: {
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 16,
  },
  alertDismiss: {
    color: '#6C757D',
    fontWeight: '600',
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  footerText: {
    fontSize: 12,
    color: '#6C757D',
    textAlign: 'center',
  },
});

// 🏗️ Performance Optimization
export default React.memo(ExpertDashboard);

/**
 * 🏗️ Prop Types Validation (for Enterprise Development)
 */
ExpertDashboard.propTypes = {
  navigation: PropTypes.object.isRequired,
  route: PropTypes.object,
};

/**
 * 🏗️ Default Props
 */
ExpertDashboard.defaultProps = {
  route: {},
};

/**
 * 🏗️ Export for Testing
 */
export { 
  ExpertDashboard, 
  DASHBOARD_EVENTS, 
  QUALITY_THRESHOLDS 
};