/**
 * 🎯 MOSA FORGE: Enterprise Student Counter Component
 * 
 * @component StudentCounter
 * @description Real-time student capacity tracking with quality enforcement
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time student capacity tracking
 * - Quality-based capacity limits
 * - Tier-based visualization
 * - Performance monitoring
 * - Auto-refresh with WebSocket support
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';

// 🏗️ Enterprise Constants
const TIER_CONFIG = {
  MASTER: {
    maxStudents: 100,
    gradient: ['#FFD700', '#FFA500'],
    badgeColor: '#FFD700',
    label: 'Master Tier',
    qualityThreshold: 4.7,
    bonusMultiplier: 1.2
  },
  SENIOR: {
    maxStudents: 50,
    gradient: ['#C0C0C0', '#A0A0A0'],
    badgeColor: '#C0C0C0',
    label: 'Senior Tier',
    qualityThreshold: 4.3,
    bonusMultiplier: 1.1
  },
  STANDARD: {
    maxStudents: 25,
    gradient: ['#CD7F32', '#8B4513'],
    badgeColor: '#CD7F32',
    label: 'Standard Tier',
    qualityThreshold: 4.0,
    bonusMultiplier: 1.0
  },
  DEVELOPING: {
    maxStudents: 15,
    gradient: ['#808080', '#696969'],
    badgeColor: '#808080',
    label: 'Developing',
    qualityThreshold: 3.5,
    bonusMultiplier: 0.9
  },
  PROBATION: {
    maxStudents: 10,
    gradient: ['#FF4444', '#CC0000'],
    badgeColor: '#FF4444',
    label: 'Probation',
    qualityThreshold: 3.0,
    bonusMultiplier: 0.8
  }
};

const CAPACITY_THRESHOLDS = {
  OPTIMAL: 0.7,      // 70% - Green zone
  WARNING: 0.85,     // 85% - Yellow zone  
  CRITICAL: 0.95     // 95% - Red zone
};

/**
 * 🏗️ Enterprise Student Counter Component
 * @param {Object} props - Component properties
 * @param {string} props.expertId - Expert unique identifier
 * @param {string} props.tier - Current expert tier
 * @param {number} props.currentStudents - Current student count
 * @param {number} props.qualityScore - Current quality score
 * @param {boolean} props.realtime - Enable real-time updates
 * @param {Function} props.onCapacityUpdate - Callback for capacity changes
 * @param {Function} props.onTierChange - Callback for tier changes
 */
const StudentCounter = ({
  expertId,
  tier = 'STANDARD',
  currentStudents = 0,
  qualityScore = 4.0,
  realtime = true,
  onCapacityUpdate,
  onTierChange,
  style
}) => {
  // 🏗️ State Management
  const [studentData, setStudentData] = useState({
    current: currentStudents,
    active: currentStudents,
    pending: 0,
    completed: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [animation] = useState(new Animated.Value(0));

  // 🏗️ Memoized Configuration
  const config = useMemo(() => TIER_CONFIG[tier] || TIER_CONFIG.STANDARD, [tier]);
  
  // 🏗️ Calculated Values
  const capacityPercentage = useMemo(() => {
    return studentData.current / config.maxStudents;
  }, [studentData.current, config.maxStudents]);

  const capacityStatus = useMemo(() => {
    if (capacityPercentage >= CAPACITY_THRESHOLDS.CRITICAL) return 'critical';
    if (capacityPercentage >= CAPACITY_THRESHOLDS.WARNING) return 'warning';
    if (capacityPercentage >= CAPACITY_THRESHOLDS.OPTIMAL) return 'optimal';
    return 'good';
  }, [capacityPercentage]);

  const availableSlots = useMemo(() => {
    return config.maxStudents - studentData.current;
  }, [config.maxStudents, studentData.current]);

  const projectedEarnings = useMemo(() => {
    const baseEarnings = studentData.current * 999;
    const bonus = baseEarnings * (config.bonusMultiplier - 1);
    return {
      base: baseEarnings,
      bonus: bonus,
      total: baseEarnings + bonus
    };
  }, [studentData.current, config.bonusMultiplier]);

  // 🏗️ Animation Effects
  useEffect(() => {
    Animated.spring(animation, {
      toValue: capacityPercentage,
      tension: 50,
      friction: 7,
      useNativeDriver: false
    }).start();
  }, [capacityPercentage]);

  // 🏗️ Real-time Data Fetching
  const fetchStudentData = useCallback(async () => {
    if (!expertId) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/experts/${expertId}/students`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${await getAuthToken()}`,
            'Content-Type': 'application/json',
            'X-Client-Version': '1.0.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      setStudentData({
        current: data.currentStudents || 0,
        active: data.activeStudents || 0,
        pending: data.pendingEnrollments || 0,
        completed: data.completedStudents || 0
      });

      setLastUpdated(new Date());
      setConnectionStatus('connected');

      // 🏗️ Notify parent component of capacity changes
      if (onCapacityUpdate) {
        onCapacityUpdate({
          current: data.currentStudents,
          max: config.maxStudents,
          percentage: capacityPercentage,
          status: capacityStatus,
          availableSlots
        });
      }

    } catch (error) {
      console.error('StudentCounter: Failed to fetch student data', error);
      setConnectionStatus('disconnected');
      
      // 🏗️ Enterprise Error Handling
      handleDataFetchError(error);
    } finally {
      setLoading(false);
    }
  }, [expertId, config.maxStudents, onCapacityUpdate]);

  // 🏗️ WebSocket for Real-time Updates
  useEffect(() => {
    if (!realtime || !expertId) return;

    let ws = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connectWebSocket = () => {
      try {
        const wsUrl = `${process.env.EXPO_PUBLIC_WS_URL}/experts/${expertId}/students`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('StudentCounter: WebSocket connected');
          setConnectionStatus('connected');
          reconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'STUDENT_UPDATE') {
              setStudentData(prev => ({
                ...prev,
                current: data.currentStudents,
                active: data.activeStudents
              }));
              setLastUpdated(new Date());
            }

            if (data.type === 'TIER_UPDATE' && onTierChange) {
              onTierChange(data.newTier);
            }

          } catch (parseError) {
            console.error('StudentCounter: WebSocket message parse error', parseError);
          }
        };

        ws.onclose = () => {
          console.log('StudentCounter: WebSocket disconnected');
          setConnectionStatus('disconnected');
          
          // 🏗️ Auto-reconnect logic
          if (reconnectAttempts < maxReconnectAttempts) {
            setTimeout(connectWebSocket, Math.pow(2, reconnectAttempts) * 1000);
            reconnectAttempts++;
          }
        };

        ws.onerror = (error) => {
          console.error('StudentCounter: WebSocket error', error);
          setConnectionStatus('error');
        };

      } catch (error) {
        console.error('StudentCounter: WebSocket connection failed', error);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [expertId, realtime, onTierChange]);

  // 🏗️ Focus-based Data Refresh
  useFocusEffect(
    useCallback(() => {
      fetchStudentData();
      
      // 🏗️ Set up polling as fallback
      const pollInterval = setInterval(fetchStudentData, 30000); // 30 seconds
      
      return () => {
        clearInterval(pollInterval);
      };
    }, [fetchStudentData])
  );

  // 🏗️ Error Handling
  const handleDataFetchError = (error) => {
    // 🏗️ Enterprise error reporting
    if (error.message.includes('401') || error.message.includes('403')) {
      Alert.alert(
        'Authentication Required',
        'Please log in again to continue.',
        [{ text: 'OK', onPress: () => {/* Navigate to login */} }]
      );
    } else if (error.message.includes('500')) {
      Alert.alert(
        'Service Temporarily Unavailable',
        'Please try again in a few moments.',
        [{ text: 'Retry', onPress: fetchStudentData }]
      );
    } else {
      // 🏗️ Silent fail for network issues with retry
      setTimeout(fetchStudentData, 5000);
    }
  };

  // 🏗️ Capacity Warning Handler
  const handleCapacityWarning = () => {
    if (capacityStatus === 'critical') {
      Alert.alert(
        'Capacity Limit Reached',
        `You've reached ${Math.round(capacityPercentage * 100)}% of your student capacity. Consider improving quality metrics to increase your limit.`,
        [
          { text: 'View Quality Dashboard', onPress: () => {/* Navigate to quality dashboard */} },
          { text: 'Dismiss', style: 'cancel' }
        ]
      );
    } else if (capacityStatus === 'warning') {
      // 🏗️ Silent notification for warning state
      console.warn('StudentCounter: Approaching capacity limit');
    }
  };

  // 🏗️ Render Capacity Bar
  const renderCapacityBar = () => {
    const widthInterpolated = animation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%']
    });

    const getBarColor = () => {
      switch (capacityStatus) {
        case 'critical': return '#FF4444';
        case 'warning': return '#FFAA00';
        case 'optimal': return '#00C851';
        default: return '#33B5E5';
      }
    };

    return (
      <View style={styles.capacityBarContainer}>
        <View style={styles.capacityBarBackground}>
          <Animated.View 
            style={[
              styles.capacityBarFill,
              { 
                width: widthInterpolated,
                backgroundColor: getBarColor()
              }
            ]}
          />
        </View>
        <View style={styles.capacityLabels}>
          <Text style={styles.capacityLabel}>
            {studentData.current} / {config.maxStudents}
          </Text>
          <Text style={[
            styles.capacityStatus,
            styles[`capacityStatus_${capacityStatus}`]
          ]}>
            {capacityStatus.toUpperCase()}
          </Text>
        </View>
      </View>
    );
  };

  // 🏗️ Render Tier Badge
  const renderTierBadge = () => (
    <TouchableOpacity 
      style={styles.tierBadge}
      onPress={() => {/* Navigate to tier information */}}
    >
      <LinearGradient
        colors={config.gradient}
        style={styles.tierGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.tierText}>{config.label}</Text>
        <Text style={styles.tierSubtext}>Quality: {qualityScore}/5.0</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  // 🏗️ Render Connection Status
  const renderConnectionStatus = () => (
    <View style={styles.connectionContainer}>
      <View style={[
        styles.connectionDot,
        styles[`connectionDot_${connectionStatus}`]
      ]} />
      <Text style={styles.connectionText}>
        {connectionStatus === 'connected' ? 'Live' : 'Offline'}
      </Text>
      {loading && <ActivityIndicator size="small" color="#33B5E5" />}
    </View>
  );

  // 🏗️ Render Earnings Preview
  const renderEarningsPreview = () => (
    <View style={styles.earningsContainer}>
      <Text style={styles.earningsTitle}>Projected Monthly Earnings</Text>
      <View style={styles.earningsRow}>
        <View style={styles.earningsItem}>
          <Text style={styles.earningsLabel}>Base</Text>
          <Text style={styles.earningsValue}>
            {projectedEarnings.base.toLocaleString()} ETB
          </Text>
        </View>
        <View style={styles.earningsItem}>
          <Text style={styles.earningsLabel}>Bonus</Text>
          <Text style={[styles.earningsValue, styles.earningsBonus]}>
            +{projectedEarnings.bonus.toLocaleString()} ETB
          </Text>
        </View>
        <View style={styles.earningsItem}>
          <Text style={styles.earningsLabel}>Total</Text>
          <Text style={[styles.earningsValue, styles.earningsTotal]}>
            {projectedEarnings.total.toLocaleString()} ETB
          </Text>
        </View>
      </View>
    </View>
  );

  // 🏗️ Render Student Breakdown
  const renderStudentBreakdown = () => (
    <View style={styles.breakdownContainer}>
      <Text style={styles.breakdownTitle}>Student Breakdown</Text>
      <View style={styles.breakdownGrid}>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownNumber}>{studentData.active}</Text>
          <Text style={styles.breakdownLabel}>Active</Text>
        </View>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownNumber}>{studentData.pending}</Text>
          <Text style={styles.breakdownLabel}>Pending</Text>
        </View>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownNumber}>{studentData.completed}</Text>
          <Text style={styles.breakdownLabel}>Completed</Text>
        </View>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownNumber}>{availableSlots}</Text>
          <Text style={styles.breakdownLabel}>Available</Text>
        </View>
      </View>
    </View>
  );

  // 🏗️ Main Render
  return (
    <BlurView intensity={90} tint="light" style={[styles.container, style]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Student Capacity</Text>
          <Text style={styles.subtitle}>
            {availableSlots > 0 
              ? `${availableSlots} slots available` 
              : 'Capacity reached'
            }
          </Text>
        </View>
        {renderConnectionStatus()}
      </View>

      {renderCapacityBar()}
      {renderTierBadge()}
      
      <View style={styles.content}>
        {renderStudentBreakdown()}
        {renderEarningsPreview()}
      </View>

      {/* 🏗️ Capacity Warning Trigger */}
      {capacityStatus !== 'good' && (
        <View style={styles.warningIndicator}>
          <TouchableOpacity onPress={handleCapacityWarning}>
            <Text style={styles.warningText}>
              {capacityStatus === 'critical' ? '🚨 Capacity Critical' : '⚠️ Approaching Limit'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </BlurView>
  );
};

// 🏗️ Utility Functions
const getAuthToken = async () => {
  // Implementation for getting authentication token
  return 'bearer-token';
};

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  connectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connectionDot_connected: {
    backgroundColor: '#00C851',
  },
  connectionDot_disconnected: {
    backgroundColor: '#FF4444',
  },
  connectionDot_error: {
    backgroundColor: '#FFAA00',
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  capacityBarContainer: {
    marginBottom: 20,
  },
  capacityBarBackground: {
    height: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  capacityBarFill: {
    height: '100%',
    borderRadius: 6,
    transition: 'width 0.3s ease-in-out',
  },
  capacityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  capacityStatus: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  capacityStatus_good: {
    color: '#00C851',
  },
  capacityStatus_optimal: {
    color: '#33B5E5',
  },
  capacityStatus_warning: {
    color: '#FFAA00',
  },
  capacityStatus_critical: {
    color: '#FF4444',
  },
  tierBadge: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  tierGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tierText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tierSubtext: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  content: {
    gap: 16,
  },
  breakdownContainer: {
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    borderRadius: 16,
    padding: 16,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  breakdownGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  breakdownNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  earningsContainer: {
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    borderRadius: 16,
    padding: 16,
  },
  earningsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  earningsItem: {
    alignItems: 'center',
    flex: 1,
  },
  earningsLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  earningsBonus: {
    color: '#00C851',
  },
  earningsTotal: {
    color: '#33B5E5',
    fontSize: 16,
  },
  warningIndicator: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  warningText: {
    color: '#FF4444',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
});

// 🏗️ Performance Optimization
export default React.memo(StudentCounter, (prevProps, nextProps) => {
  return (
    prevProps.expertId === nextProps.expertId &&
    prevProps.tier === nextProps.tier &&
    prevProps.currentStudents === nextProps.currentStudents &&
    prevProps.qualityScore === nextProps.qualityScore &&
    prevProps.realtime === nextProps.realtime
  );
});

// 🏗️ Component Documentation
StudentCounter.propTypes = {
  // expertId: PropTypes.string.isRequired,
  // tier: PropTypes.oneOf(['MASTER', 'SENIOR', 'STANDARD', 'DEVELOPING', 'PROBATION']),
  // currentStudents: PropTypes.number,
  // qualityScore: PropTypes.number,
  // realtime: PropTypes.bool,
  // onCapacityUpdate: PropTypes.func,
  // onTierChange: PropTypes.func,
  // style: PropTypes.object,
};

StudentCounter.defaultProps = {
  tier: 'STANDARD',
  currentStudents: 0,
  qualityScore: 4.0,
  realtime: true,
};

export { StudentCounter };