/**
 * 🎯 MOSA FORGE: Enterprise Progress Indicator Component
 * 
 * @component ProgressIndicator
 * @description Real-time progress tracking with quality metrics and adaptive learning
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time progress synchronization
 * - Quality score integration
 * - Adaptive learning path visualization
 * - Multi-phase progress tracking
 * - Performance analytics
 * - Offline capability with sync
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
  Alert,
  AppState
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';

// 🏗️ Enterprise Constants
const PROGRESS_STATES = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  BLOCKED: 'blocked',
  NEEDS_REVIEW: 'needs_review'
};

const PHASE_CONFIG = {
  MINDSET: {
    name: 'Mindset Foundation',
    duration: '4 Weeks',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED'],
    exercises: 20,
    weight: 0.15
  },
  THEORY: {
    name: 'Theory Mastery',
    duration: '2 Months',
    color: '#06B6D4',
    gradient: ['#06B6D4', '#0891B2'],
    exercises: 100,
    weight: 0.35
  },
  HANDS_ON: {
    name: 'Hands-on Immersion',
    duration: '2 Months',
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
    exercises: 50,
    weight: 0.40
  },
  CERTIFICATION: {
    name: 'Certification & Launch',
    duration: '2 Weeks',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#D97706'],
    exercises: 10,
    weight: 0.10
  }
};

const QUALITY_THRESHOLDS = {
  EXCELLENT: { min: 4.5, color: '#10B981', label: 'Excellent' },
  GOOD: { min: 4.0, color: '#F59E0B', label: 'Good' },
  NEEDS_IMPROVEMENT: { min: 3.5, color: '#EF4444', label: 'Needs Improvement' }
};

/**
 * 🏗️ Enterprise Progress Indicator Component
 * @param {Object} props - Component properties
 */
const ProgressIndicator = React.memo(({
  enrollmentId,
  studentId,
  currentPhase = 'MINDSET',
  onPhaseChange,
  onQualityAlert,
  showDetailedView = false,
  compactMode = false,
  interactive = true,
  refreshInterval = 30000, // 30 seconds
  enableHaptics = true,
  enableAnimations = true,
  ...props
}) => {
  // 🏗️ State Management
  const [progressData, setProgressData] = useState({
    overallProgress: 0,
    currentPhase: currentPhase,
    phaseProgress: 0,
    completedExercises: 0,
    totalExercises: 0,
    qualityScore: 0,
    streak: 0,
    estimatedCompletion: null,
    lastSynced: null,
    isSyncing: false
  });

  const [phases, setPhases] = useState({});
  const [animations] = useState({
    progress: new Animated.Value(0),
    pulse: new Animated.Value(1),
    shake: new Animated.Value(0)
  });
  
  const [appState, setAppState] = useState(AppState.currentState);
  const [isOnline, setIsOnline] = useState(true);
  const [hasUpdates, setHasUpdates] = useState(false);

  // 🏗️ Refs for cleanup
  const refreshIntervalRef = React.useRef();
  const syncTimeoutRef = React.useRef();
  const mountedRef = React.useRef(true);

  // 🏗️ Memoized calculations
  const { qualityLevel, qualityConfig } = useMemo(() => {
    const score = progressData.qualityScore;
    let level = QUALITY_THRESHOLDS.NEEDS_IMPROVEMENT;
    
    if (score >= QUALITY_THRESHOLDS.EXCELLENT.min) {
      level = QUALITY_THRESHOLDS.EXCELLENT;
    } else if (score >= QUALITY_THRESHOLDS.GOOD.min) {
      level = QUALITY_THRESHOLDS.GOOD;
    }
    
    return { qualityLevel: level, qualityConfig: level };
  }, [progressData.qualityScore]);

  const completionEstimate = useMemo(() => {
    if (!progressData.estimatedCompletion) return 'Calculating...';
    
    const now = new Date();
    const completion = new Date(progressData.estimatedCompletion);
    const diffTime = Math.abs(completion - now);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays} days`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`;
    return `${Math.ceil(diffDays / 30)} months`;
  }, [progressData.estimatedCompletion]);

  // 🏗️ Animation controllers
  const progressAnimation = useCallback(() => {
    if (!enableAnimations) return;

    Animated.parallel([
      Animated.timing(animations.progress, {
        toValue: progressData.phaseProgress / 100,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false
      }),
      Animated.sequence([
        Animated.timing(animations.pulse, {
          toValue: 1.1,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(animations.pulse, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true
        })
      ])
    ]).start();
  }, [progressData.phaseProgress, enableAnimations]);

  const triggerQualityAlert = useCallback(() => {
    if (!enableAnimations || !enableHaptics) return;

    Animated.sequence([
      Animated.timing(animations.shake, {
        toValue: 1,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: true
      }),
      Animated.timing(animations.shake, {
        toValue: -1,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: true
      }),
      Animated.timing(animations.shake, {
        toValue: 0,
        duration: 100,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ]).start();

    if (enableHaptics) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [enableAnimations, enableHaptics]);

  // 🏗️ Data synchronization
  const syncProgressData = useCallback(async (forceSync = false) => {
    if (!mountedRef.current) return;

    try {
      setProgressData(prev => ({ ...prev, isSyncing: true }));

      // Simulate API call to progress service
      const response = await fetchProgressData(enrollmentId, forceSync);
      
      if (mountedRef.current && response) {
        setProgressData(prev => ({
          ...response,
          isSyncing: false,
          lastSynced: new Date()
        }));

        // Trigger animations if progress increased
        if (response.phaseProgress > prev.phaseProgress) {
          progressAnimation();
        }

        // Trigger quality alerts if score dropped significantly
        if (response.qualityScore < prev.qualityScore - 0.3) {
          triggerQualityAlert();
          onQualityAlert?.({
            previousScore: prev.qualityScore,
            currentScore: response.qualityScore,
            phase: response.currentPhase
          });
        }

        // Notify phase changes
        if (response.currentPhase !== prev.currentPhase) {
          onPhaseChange?.({
            from: prev.currentPhase,
            to: response.currentPhase,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Progress sync failed:', error);
      if (mountedRef.current) {
        setProgressData(prev => ({ ...prev, isSyncing: false }));
      }
    }
  }, [enrollmentId, onPhaseChange, onQualityAlert, progressAnimation, triggerQualityAlert]);

  // 🏗️ Offline support with optimistic updates
  const updateLocalProgress = useCallback((updates) => {
    setProgressData(prev => {
      const newData = { ...prev, ...updates, hasUpdates: true };
      setHasUpdates(true);
      return newData;
    });
  }, []);

  const syncPendingUpdates = useCallback(async () => {
    if (!hasUpdates || !isOnline) return;

    try {
      await syncProgressData(true);
      setHasUpdates(false);
    } catch (error) {
      console.error('Failed to sync pending updates:', error);
    }
  }, [hasUpdates, isOnline, syncProgressData]);

  // 🏗️ Effects for lifecycle management
  useEffect(() => {
    mountedRef.current = true;
    
    // Initial data load
    syncProgressData();

    // Set up periodic refresh
    refreshIntervalRef.current = setInterval(() => {
      syncProgressData();
    }, refreshInterval);

    // Set up app state monitoring
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      mountedRef.current = false;
      clearInterval(refreshIntervalRef.current);
      appStateSubscription.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Refresh data when screen comes into focus
      syncProgressData();
    }, [syncProgressData])
  );

  useEffect(() => {
    // Sync pending updates when coming online
    if (isOnline && hasUpdates) {
      syncPendingUpdates();
    }
  }, [isOnline, hasUpdates, syncPendingUpdates]);

  // 🏗️ Event handlers
  const handleAppStateChange = useCallback((nextAppState) => {
    setAppState(nextAppState);
    
    if (nextAppState === 'active') {
      // App came to foreground, sync data
      syncProgressData();
    }
  }, [syncProgressData]);

  const handleRetrySync = useCallback(() => {
    syncProgressData(true);
  }, [syncProgressData]);

  const handlePhasePress = useCallback((phase) => {
    if (!interactive) return;

    // Show phase details or navigate to phase
    Alert.alert(
      PHASE_CONFIG[phase].name,
      `Duration: ${PHASE_CONFIG[phase].duration}\n` +
      `Weight: ${(PHASE_CONFIG[phase].weight * 100).toFixed(0)}%\n` +
      `Status: ${getPhaseStatus(phase, progressData.currentPhase)}`,
      [{ text: 'OK', style: 'default' }]
    );
  }, [interactive, progressData.currentPhase]);

  // 🏗️ Render helpers
  const getPhaseStatus = (phase, currentPhase) => {
    const phaseOrder = ['MINDSET', 'THEORY', 'HANDS_ON', 'CERTIFICATION'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    const phaseIndex = phaseOrder.indexOf(phase);

    if (phaseIndex < currentIndex) return PROGRESS_STATES.COMPLETED;
    if (phaseIndex === currentIndex) return PROGRESS_STATES.IN_PROGRESS;
    if (phaseIndex === currentIndex + 1) return PROGRESS_STATES.BLOCKED;
    return PROGRESS_STATES.NOT_STARTED;
  };

  const renderPhaseIndicator = (phase) => {
    const status = getPhaseStatus(phase, progressData.currentPhase);
    const config = PHASE_CONFIG[phase];
    const isCurrent = phase === progressData.currentPhase;
    const isCompleted = status === PROGRESS_STATES.COMPLETED;
    const isBlocked = status === PROGRESS_STATES.BLOCKED;

    return (
      <TouchableOpacity
        key={phase}
        style={[
          styles.phaseContainer,
          isCurrent && styles.currentPhase,
          isBlocked && styles.blockedPhase
        ]}
        onPress={() => handlePhasePress(phase)}
        disabled={!interactive || isBlocked}
        activeOpacity={0.7}
      >
        <View style={styles.phaseHeader}>
          <View style={styles.phaseTitleContainer}>
            <View style={[
              styles.phaseStatusIndicator,
              { backgroundColor: config.color },
              isCompleted && styles.completedStatus,
              isCurrent && styles.currentStatus
            ]} />
            <Text style={[
              styles.phaseName,
              isCurrent && styles.currentPhaseName,
              isCompleted && styles.completedPhaseName
            ]}>
              {config.name}
            </Text>
          </View>
          <Text style={styles.phaseDuration}>
            {config.duration}
          </Text>
        </View>

        {isCurrent && (
          <View style={styles.currentPhaseProgress}>
            <View style={styles.progressBarBackground}>
              <Animated.View 
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: config.color,
                    width: animations.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    }),
                    transform: [{ scale: animations.pulse }]
                  }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(progressData.phaseProgress)}% Complete
            </Text>
          </View>
        )}

        {isCompleted && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>✓ Completed</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCompactView = () => (
    <TouchableOpacity 
      style={styles.compactContainer}
      onPress={() => onPhaseChange?.({ showDetailed: true })}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={PHASE_CONFIG[progressData.currentPhase].gradient}
        style={styles.compactGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.compactContent}>
          <View style={styles.compactProgress}>
            <Text style={styles.compactPercentage}>
              {Math.round(progressData.overallProgress)}%
            </Text>
            <Text style={styles.compactLabel}>Overall</Text>
          </View>
          
          <View style={styles.compactDivider} />
          
          <View style={styles.compactPhase}>
            <Text style={styles.compactPhaseName}>
              {PHASE_CONFIG[progressData.currentPhase].name}
            </Text>
            <Text style={styles.compactPhaseProgress}>
              {Math.round(progressData.phaseProgress)}% complete
            </Text>
          </View>

          <View style={[
            styles.qualityBadge,
            { backgroundColor: qualityConfig.color }
          ]}>
            <Text style={styles.qualityBadgeText}>
              {qualityConfig.label}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderDetailedView = () => (
    <View style={styles.detailedContainer}>
      {/* Header with overall progress */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#1F2937', '#374151']}
          style={styles.headerGradient}
        >
          <View style={styles.overallProgress}>
            <View style={styles.overallProgressText}>
              <Text style={styles.overallPercentage}>
                {Math.round(progressData.overallProgress)}%
              </Text>
              <Text style={styles.overallLabel}>Course Complete</Text>
            </View>
            
            <View style={styles.statsContainer}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{progressData.streak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {progressData.completedExercises}/{progressData.totalExercises}
                </Text>
                <Text style={styles.statLabel}>Exercises</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: qualityConfig.color }]}>
                  {progressData.qualityScore.toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>Quality</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Phase progression */}
      <View style={styles.phasesContainer}>
        <Text style={styles.sectionTitle}>Learning Journey</Text>
        {Object.keys(PHASE_CONFIG).map(renderPhaseIndicator)}
      </View>

      {/* Sync status */}
      <View style={styles.syncStatus}>
        <Text style={styles.syncText}>
          {progressData.isSyncing ? 'Syncing...' : 
           `Last synced: ${formatLastSynced(progressData.lastSynced)}`}
        </Text>
        {hasUpdates && (
          <Text style={styles.pendingUpdatesText}>• Updates pending sync</Text>
        )}
      </View>
    </View>
  );

  // 🏗️ Main render
  if (compactMode) {
    return renderCompactView();
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        props.style,
        {
          transform: [
            {
              translateX: animations.shake.interpolate({
                inputRange: [-1, 1],
                outputRange: [-8, 8]
              })
            }
          ]
        }
      ]}
    >
      {showDetailedView ? renderDetailedView() : renderCompactView()}
      
      {/* Offline indicator */}
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Text style={styles.offlineText}>Offline - Updates will sync when online</Text>
        </View>
      )}
    </Animated.View>
  );
});

// 🏗️ Utility functions
const fetchProgressData = async (enrollmentId, forceSync = false) => {
  // In production, this would make actual API calls
  try {
    const response = await fetch(
      `${process.env.API_BASE_URL}/progress/${enrollmentId}?forceSync=${forceSync}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch progress data:', error);
    throw error;
  }
};

const formatLastSynced = (timestamp) => {
  if (!timestamp) return 'Never';
  
  const now = new Date();
  const lastSync = new Date(timestamp);
  const diffMinutes = Math.floor((now - lastSync) / (1000 * 60));
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
  return `${Math.floor(diffMinutes / 1440)}d ago`;
};

const getAuthToken = async () => {
  // Implementation would get from secure storage
  return 'mock-token';
};

// 🏗️ Styles
const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  compactContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  compactGradient: {
    padding: 16,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactProgress: {
    alignItems: 'center',
  },
  compactPercentage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  compactLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  compactDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  compactPhase: {
    flex: 1,
  },
  compactPhaseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  compactPhaseProgress: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  qualityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  qualityBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailedContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 20,
  },
  overallProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overallProgressText: {
    alignItems: 'flex-start',
  },
  overallPercentage: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  overallLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  phasesContainer: {
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  phaseContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  currentPhase: {
    borderColor: '#3B82F6',
    borderWidth: 2,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  blockedPhase: {
    opacity: 0.6,
  },
  phaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  phaseTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  phaseStatusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  completedStatus: {
    backgroundColor: '#10B981',
  },
  currentStatus: {
    transform: [{ scale: 1.2 }],
  },
  phaseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  currentPhaseName: {
    color: '#1E40AF',
  },
  completedPhaseName: {
    color: '#065F46',
  },
  phaseDuration: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  currentPhaseProgress: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  completedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  syncStatus: {
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncText: {
    fontSize: 12,
    color: '#6B7280',
  },
  pendingUpdatesText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  offlineIndicator: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  offlineText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '500',
  },
});

// 🏗️ Prop types and default props
ProgressIndicator.defaultProps = {
  currentPhase: 'MINDSET',
  showDetailedView: false,
  compactMode: false,
  interactive: true,
  refreshInterval: 30000,
  enableHaptics: true,
  enableAnimations: true,
};

// 🏗️ Performance optimization
ProgressIndicator.whyDidYouRender = {
  logOnDifferentValues: false,
  customName: 'ProgressIndicator'
};

export default ProgressIndicator;
export { PROGRESS_STATES, PHASE_CONFIG, QUALITY_THRESHOLDS };