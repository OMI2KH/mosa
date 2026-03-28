/**
 * 🎯 MOSA FORGE: Enterprise Quality Alert System
 * 
 * @component QualityAlert
 * @description Real-time quality monitoring and alert system for expert performance
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time quality threshold monitoring
 * - Multi-tier alert system (Warning, Critical, Emergency)
 * - Auto-enforcement actions
 * - Performance improvement suggestions
 * - Student protection mechanisms
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useQualityMetrics } from '../hooks/use-quality-metrics';
import { useAuth } from '../contexts/auth-context';

// 🏗️ Enterprise Constants
const ALERT_TYPES = {
  WARNING: {
    level: 'WARNING',
    color: '#FFA500',
    bgColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    icon: 'warning',
    severity: 1
  },
  CRITICAL: {
    level: 'CRITICAL', 
    color: '#DC3545',
    bgColor: '#F8D7DA',
    borderColor: '#F5C6CB',
    icon: 'alert-circle',
    severity: 2
  },
  EMERGENCY: {
    level: 'EMERGENCY',
    color: '#721C24',
    bgColor: '#F5C6CB',
    borderColor: '#F1B0B7',
    icon: 'skull',
    severity: 3
  }
};

const QUALITY_THRESHOLDS = {
  MASTER_TIER: 4.7,
  SENIOR_TIER: 4.3,
  STANDARD_TIER: 4.0,
  MINIMUM_ACCEPTABLE: 3.5,
  AUTO_SUSPENSION: 3.0
};

const ALERT_ACTIONS = {
  QUALITY_DROP: 'QUALITY_DROP',
  COMPLETION_RATE_LOW: 'COMPLETION_RATE_LOW',
  RESPONSE_TIME_SLOW: 'RESPONSE_TIME_SLOW',
  STUDENT_COMPLAINTS: 'STUDENT_COMPLAINTS',
  TIER_DEMOTION: 'TIER_DEMOTION',
  AUTO_SUSPENSION: 'AUTO_SUSPENSION'
};

/**
 * 🏗️ Enterprise Quality Alert Component
 * @param {Object} props
 * @param {string} props.expertId - Expert identifier
 * @param {string} props.variant - Alert display variant ('compact' | 'expanded' | 'dashboard')
 * @param {boolean} props.autoDismiss - Auto-dismiss non-critical alerts
 * @param {Function} props.onAction - Callback for alert actions
 * @param {Function} props.onDismiss - Callback for alert dismissal
 */
const QualityAlert = ({
  expertId,
  variant = 'expanded',
  autoDismiss = true,
  onAction,
  onDismiss,
  ...props
}) => {
  // 🏗️ State Management
  const [isVisible, setIsVisible] = useState(false);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const [animation] = useState(new Animated.Value(0));
  const [pulseAnimation] = useState(new Animated.Value(1));

  // 🏗️ Enterprise Hooks
  const { qualityData, refreshMetrics, subscribeToUpdates } = useQualityMetrics(expertId);
  const { user, hasPermission } = useAuth();

  // 🏗️ Memoized Computed Values
  const alertConfig = useMemo(() => {
    if (!currentAlert) return null;
    return ALERT_TYPES[currentAlert.type] || ALERT_TYPES.WARNING;
  }, [currentAlert]);

  const shouldShowAlert = useMemo(() => {
    if (!currentAlert) return false;
    if (dismissedAlerts.has(currentAlert.id)) return false;
    if (!hasPermission('view_quality_alerts')) return false;
    return true;
  }, [currentAlert, dismissedAlerts, hasPermission]);

  // 🏗️ Alert Detection Engine
  const detectQualityAlerts = useCallback((metrics) => {
    const alerts = [];

    // 🚨 Quality Score Alerts
    if (metrics.qualityScore < QUALITY_THRESHOLDS.MINIMUM_ACCEPTABLE) {
      alerts.push({
        id: `quality-drop-${Date.now()}`,
        type: metrics.qualityScore < QUALITY_THRESHOLDS.AUTO_SUSPENSION ? 'EMERGENCY' : 'CRITICAL',
        action: ALERT_ACTIONS.QUALITY_DROP,
        title: 'Quality Score Alert',
        message: `Your quality score has dropped to ${metrics.qualityScore.toFixed(1)}`,
        metric: 'qualityScore',
        currentValue: metrics.qualityScore,
        threshold: QUALITY_THRESHOLDS.MINIMUM_ACCEPTABLE,
        timestamp: new Date().toISOString()
      });
    }

    // 🚨 Completion Rate Alerts
    if (metrics.completionRate < 0.7) {
      alerts.push({
        id: `completion-rate-${Date.now()}`,
        type: metrics.completionRate < 0.6 ? 'CRITICAL' : 'WARNING',
        action: ALERT_ACTIONS.COMPLETION_RATE_LOW,
        title: 'Completion Rate Alert',
        message: `Student completion rate is ${(metrics.completionRate * 100).toFixed(1)}%`,
        metric: 'completionRate',
        currentValue: metrics.completionRate,
        threshold: 0.7,
        timestamp: new Date().toISOString()
      });
    }

    // 🚨 Response Time Alerts
    if (metrics.averageResponseTime > 24) {
      alerts.push({
        id: `response-time-${Date.now()}`,
        type: metrics.averageResponseTime > 48 ? 'CRITICAL' : 'WARNING',
        action: ALERT_ACTIONS.RESPONSE_TIME_SLOW,
        title: 'Response Time Alert',
        message: `Average response time is ${metrics.averageResponseTime}h`,
        metric: 'averageResponseTime',
        currentValue: metrics.averageResponseTime,
        threshold: 24,
        timestamp: new Date().toISOString()
      });
    }

    // 🚨 Student Complaint Alerts
    if (metrics.studentComplaints > 2) {
      alerts.push({
        id: `complaints-${Date.now()}`,
        type: metrics.studentComplaints > 5 ? 'EMERGENCY' : 'CRITICAL',
        action: ALERT_ACTIONS.STUDENT_COMPLAINTS,
        title: 'Student Feedback Alert',
        message: `${metrics.studentComplaints} student complaints received`,
        metric: 'studentComplaints',
        currentValue: metrics.studentComplaints,
        threshold: 2,
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  }, []);

  // 🏗️ Alert Priority Sorting
  const prioritizeAlerts = useCallback((alerts) => {
    return alerts.sort((a, b) => {
      const severityA = ALERT_TYPES[a.type]?.severity || 0;
      const severityB = ALERT_TYPES[b.type]?.severity || 0;
      
      if (severityB !== severityA) {
        return severityB - severityA;
      }
      
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }, []);

  // 🏗️ Alert Display Management
  const showAlert = useCallback((alert) => {
    if (dismissedAlerts.has(alert.id)) return;

    setCurrentAlert(alert);
    setIsVisible(true);

    // 🎬 Entrance Animation
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // ⏰ Auto-dismiss for non-critical alerts
    if (autoDismiss && alert.type === 'WARNING') {
      setTimeout(() => {
        dismissAlert(alert.id);
      }, 10000);
    }
  }, [animation, pulseAnimation, autoDismiss, dismissedAlerts]);

  // 🏗️ Alert Dismissal
  const dismissAlert = useCallback((alertId) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
    setIsVisible(false);
    setCurrentAlert(null);
    
    Animated.timing(animation, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();

    onDismiss?.(alertId);
  }, [animation, onDismiss]);

  // 🏗️ Alert Action Handler
  const handleAction = useCallback((action, alert) => {
    switch (action) {
      case ALERT_ACTIONS.QUALITY_DROP:
        onAction?.({
          type: 'VIEW_IMPROVEMENT_PLAN',
          alertId: alert.id,
          expertId,
          metric: alert.metric
        });
        break;

      case ALERT_ACTIONS.COMPLETION_RATE_LOW:
        onAction?.({
          type: 'ANALYZE_COMPLETION_DATA',
          alertId: alert.id,
          expertId,
          metric: alert.metric
        });
        break;

      case ALERT_ACTIONS.RESPONSE_TIME_SLOW:
        onAction?.({
          type: 'OPTIMIZE_RESPONSE_TIME',
          alertId: alert.id,
          expertId,
          metric: alert.metric
        });
        break;

      case ALERT_ACTIONS.AUTO_SUSPENSION:
        onAction?.({
          type: 'APPEAL_SUSPENSION',
          alertId: alert.id,
          expertId,
          metric: alert.metric
        });
        break;

      default:
        onAction?.({
          type: 'VIEW_DETAILS',
          alertId: alert.id,
          expertId
        });
    }

    dismissAlert(alert.id);
  }, [onAction, dismissAlert, expertId]);

  // 🏗️ Real-time Quality Monitoring
  useEffect(() => {
    if (!qualityData) return;

    const alerts = detectQualityAlerts(qualityData);
    const prioritizedAlerts = prioritizeAlerts(alerts);

    if (prioritizedAlerts.length > 0 && !isVisible) {
      showAlert(prioritizedAlerts[0]);
    }
  }, [qualityData, detectQualityAlerts, prioritizeAlerts, isVisible, showAlert]);

  // 🏗️ Subscription to Real-time Updates
  useEffect(() => {
    const unsubscribe = subscribeToUpdates((updatedMetrics) => {
      refreshMetrics();
    });

    return () => {
      unsubscribe?.();
    };
  }, [subscribeToUpdates, refreshMetrics]);

  // 🏗️ Animation Styles
  const animatedStyle = {
    opacity: animation,
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, 0],
        }),
      },
      {
        scale: pulseAnimation,
      },
    ],
  };

  // 🏗️ Compact Variant Renderer
  const renderCompactAlert = () => (
    <TouchableOpacity
      style={[
        styles.compactContainer,
        { backgroundColor: alertConfig.bgColor, borderColor: alertConfig.borderColor }
      ]}
      onPress={() => handleAction(currentAlert.action, currentAlert)}
      activeOpacity={0.8}
    >
      <View style={styles.compactContent}>
        <Ionicons 
          name={alertConfig.icon} 
          size={16} 
          color={alertConfig.color} 
        />
        <Text 
          style={[styles.compactTitle, { color: alertConfig.color }]}
          numberOfLines={1}
        >
          {currentAlert.title}
        </Text>
        <TouchableOpacity
          onPress={() => dismissAlert(currentAlert.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={14} color={alertConfig.color} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // 🏗️ Expanded Variant Renderer
  const renderExpandedAlert = () => (
    <Animated.View style={[styles.expandedContainer, animatedStyle]}>
      <BlurView intensity={90} tint="light" style={styles.blurContainer}>
        <View style={[
          styles.expandedContent,
          { backgroundColor: alertConfig.bgColor, borderLeftColor: alertConfig.color }
        ]}>
          {/* 🚨 Alert Header */}
          <View style={styles.alertHeader}>
            <View style={styles.titleContainer}>
              <Ionicons 
                name={alertConfig.icon} 
                size={20} 
                color={alertConfig.color} 
              />
              <Text style={[styles.alertTitle, { color: alertConfig.color }]}>
                {currentAlert.title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => dismissAlert(currentAlert.id)}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="close" size={18} color={alertConfig.color} />
            </TouchableOpacity>
          </View>

          {/* 📊 Alert Message */}
          <Text style={styles.alertMessage}>
            {currentAlert.message}
          </Text>

          {/* 📈 Metric Details */}
          <View style={styles.metricContainer}>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Current Value:</Text>
              <Text style={[styles.metricValue, { color: alertConfig.color }]}>
                {formatMetricValue(currentAlert.metric, currentAlert.currentValue)}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Required Threshold:</Text>
              <Text style={styles.metricValue}>
                {formatMetricValue(currentAlert.metric, currentAlert.threshold)}
              </Text>
            </View>
          </View>

          {/* 🛠️ Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: alertConfig.color }]}
              onPress={() => handleAction(currentAlert.action, currentAlert)}
            >
              <Text style={styles.actionButtonText}>
                {getActionButtonText(currentAlert.action)}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => dismissAlert(currentAlert.id)}
            >
              <Text style={[styles.secondaryButtonText, { color: alertConfig.color }]}>
                Dismiss
              </Text>
            </TouchableOpacity>
          </View>

          {/* ⏰ Timestamp */}
          <Text style={styles.timestamp}>
            {formatTimestamp(currentAlert.timestamp)}
          </Text>
        </View>
      </BlurView>
    </Animated.View>
  );

  // 🏗️ Dashboard Variant Renderer
  const renderDashboardAlert = () => (
    <View style={[
      styles.dashboardContainer,
      { borderColor: alertConfig.borderColor, backgroundColor: alertConfig.bgColor }
    ]}>
      <View style={styles.dashboardHeader}>
        <View style={styles.dashboardTitleContainer}>
          <Ionicons 
            name={alertConfig.icon} 
            size={16} 
            color={alertConfig.color} 
          />
          <Text style={[styles.dashboardTitle, { color: alertConfig.color }]}>
            {currentAlert.title}
          </Text>
        </View>
        <View style={[styles.severityBadge, { backgroundColor: alertConfig.color }]}>
          <Text style={styles.severityText}>
            {currentAlert.type}
          </Text>
        </View>
      </View>
      
      <Text style={styles.dashboardMessage} numberOfLines={2}>
        {currentAlert.message}
      </Text>
      
      <View style={styles.dashboardActions}>
        <TouchableOpacity
          style={styles.dashboardButton}
          onPress={() => handleAction(currentAlert.action, currentAlert)}
        >
          <Text style={[styles.dashboardButtonText, { color: alertConfig.color }]}>
            View Details
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // 🏗️ Main Render Logic
  if (!shouldShowAlert || !currentAlert || !alertConfig) {
    return null;
  }

  return (
    <View style={styles.container} {...props}>
      {variant === 'compact' && renderCompactAlert()}
      {variant === 'expanded' && renderExpandedAlert()}
      {variant === 'dashboard' && renderDashboardAlert()}
    </View>
  );
};

// 🏗️ Utility Functions
const formatMetricValue = (metric, value) => {
  switch (metric) {
    case 'qualityScore':
      return value.toFixed(1);
    case 'completionRate':
      return `${(value * 100).toFixed(1)}%`;
    case 'averageResponseTime':
      return `${value}h`;
    case 'studentComplaints':
      return value.toString();
    default:
      return value?.toString() || 'N/A';
  }
};

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-ET', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short'
  });
};

const getActionButtonText = (action) => {
  const actionTexts = {
    [ALERT_ACTIONS.QUALITY_DROP]: 'View Improvement Plan',
    [ALERT_ACTIONS.COMPLETION_RATE_LOW]: 'Analyze Completion Data',
    [ALERT_ACTIONS.RESPONSE_TIME_SLOW]: 'Optimize Response Time',
    [ALERT_ACTIONS.STUDENT_COMPLAINTS]: 'Review Feedback',
    [ALERT_ACTIONS.TIER_DEMOTION]: 'Appeal Decision',
    [ALERT_ACTIONS.AUTO_SUSPENSION]: 'Appeal Suspension'
  };

  return actionTexts[action] || 'View Details';
};

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
  },
  // Compact Variant Styles
  compactContainer: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 4,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginHorizontal: 8,
  },
  // Expanded Variant Styles
  expandedContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  blurContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  expandedContent: {
    padding: 16,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
  },
  alertMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  metricContainer: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 10,
    color: '#888',
    textAlign: 'center',
  },
  // Dashboard Variant Styles
  dashboardContainer: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginVertical: 4,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dashboardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dashboardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  dashboardMessage: {
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
    marginBottom: 8,
  },
  dashboardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  dashboardButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  dashboardButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

// 🏗️ Performance Optimization
export default React.memo(QualityAlert);

// 🏗️ Export Constants for Enterprise Use
export { 
  ALERT_TYPES, 
  ALERT_ACTIONS, 
  QUALITY_THRESHOLDS 
};