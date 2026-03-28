// expert/course-starter.jsx

/**
 * 🎯 ENTERPRISE COURSE STARTER COMPONENT
 * Production-ready expert course initiation system
 * Features: Quality validation, capacity management, session scheduling
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { 
  FadeInUp, 
  SlideInRight, 
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';

// Custom Hooks & Services
import { useExpertPerformance } from '../../hooks/use-expert-performance';
import { useQualityMetrics } from '../../hooks/use-quality-metrics';
import { useTrainingSessions } from '../../hooks/use-training-sessions';
import { ExpertService } from '../../services/expert-service';
import { QualityService } from '../../services/quality-service';

// Components
import QualityBadge from '../components/quality/quality-badge';
import TierIndicator from '../components/expert/tier-indicator';
import CapacityTracker from '../components/expert/capacity-tracker';
import SessionScheduler from '../components/expert/session-scheduler';
import StudentRoster from '../components/expert/student-roster';
import ProgressChart from '../components/analytics/progress-chart';

// Constants
import { QUALITY_THRESHOLDS, CAPACITY_LIMITS } from '../../constants/quality-config';
import { EXPERT_TIERS, TIER_BENEFITS } from '../../constants/expert-config';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const CourseStarter = ({ route }) => {
  const navigation = useNavigation();
  const { courseId, studentId, enrollmentId } = route.params || {};

  // State Management
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [expertData, setExpertData] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [qualityCheck, setQualityCheck] = useState(null);
  const [capacityStatus, setCapacityStatus] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Custom Hooks
  const { 
    expertPerformance, 
    refreshPerformance,
    calculateEarningsPotential 
  } = useExpertPerformance();

  const { 
    qualityMetrics, 
    refreshQualityMetrics,
    checkQualityCompliance 
  } = useQualityMetrics();

  const {
    scheduleSession,
    validateSessionTime,
    getRecommendedSlots
  } = useTrainingSessions();

  // Animation Values
  const scaleAnimation = useSharedValue(1);
  const opacityAnimation = useSharedValue(1);

  // Animated Styles
  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnimation.value }],
    opacity: opacityAnimation.value
  }));

  /**
   * 🎯 INITIALIZE COMPONENT DATA
   */
  useEffect(() => {
    initializeCourseStarter();
  }, [courseId, studentId]);

  /**
   * 🔄 REFRESH DATA
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await initializeCourseStarter();
    setRefreshing(false);
  }, []);

  /**
   * 🚀 INITIALIZE COURSE STARTER
   */
  const initializeCourseStarter = async () => {
    try {
      setIsLoading(true);

      // Parallel data fetching for performance
      const [expertResponse, studentResponse, courseResponse, qualityResponse] = await Promise.all([
        ExpertService.getExpertProfile(),
        ExpertService.getStudentProfile(studentId),
        ExpertService.getCourseDetails(courseId),
        QualityService.checkExpertReadiness()
      ]);

      // Validate all responses
      if (!expertResponse.success) throw new Error('Failed to load expert profile');
      if (!studentResponse.success) throw new Error('Failed to load student profile');
      if (!courseResponse.success) throw new Error('Failed to load course details');
      if (!qualityResponse.success) throw new Error('Failed to load quality metrics');

      setExpertData(expertResponse.data);
      setStudentData(studentResponse.data);
      setCourseData(courseResponse.data);
      setQualityCheck(qualityResponse.data);

      // Check capacity and available slots
      await checkCapacityAndSlots(expertResponse.data.id);

      // Refresh performance metrics
      await refreshPerformance();
      await refreshQualityMetrics();

    } catch (error) {
      console.error('Course starter initialization failed:', error);
      Alert.alert(
        'Initialization Error',
        'Failed to load course starter data. Please try again.',
        [{ text: 'Retry', onPress: initializeCourseStarter }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 📊 CHECK CAPACITY AND AVAILABLE SLOTS
   */
  const checkCapacityAndSlots = async (expertId) => {
    try {
      const [capacityResponse, slotsResponse] = await Promise.all([
        ExpertService.getCurrentCapacity(expertId),
        ExpertService.getAvailableSlots(expertId, 7) // Next 7 days
      ]);

      if (capacityResponse.success) {
        setCapacityStatus(capacityResponse.data);
      }

      if (slotsResponse.success) {
        setAvailableSlots(slotsResponse.data.slots || []);
      }

    } catch (error) {
      console.error('Capacity check failed:', error);
      setCapacityStatus({ currentStudents: 0, maxCapacity: 0, available: true });
    }
  };

  /**
   * ✅ VALIDATE COURSE START READINESS
   */
  const validateStartReadiness = () => {
    const validations = [];

    // Quality compliance check
    if (qualityCheck?.complianceStatus !== 'COMPLIANT') {
      validations.push('Quality standards not met. Please check your quality dashboard.');
    }

    // Capacity check
    if (capacityStatus && !capacityStatus.available) {
      validations.push('Maximum capacity reached. Cannot add more students.');
    }

    // Tier-specific validations
    if (expertData?.currentTier === 'PROBATION') {
      validations.push('Account under probation. Please contact support.');
    }

    // Session availability check
    if (availableSlots.length === 0) {
      validations.push('No available time slots. Please update your schedule.');
    }

    // Student readiness check
    if (studentData?.mindsetPhaseCompleted !== true) {
      validations.push('Student has not completed mindset phase.');
    }

    return validations;
  };

  /**
   * 🚀 START COURSE SESSION
   */
  const handleStartCourse = async (selectedSlot) => {
    if (isStarting) return;

    // Validate readiness
    const validations = validateStartReadiness();
    if (validations.length > 0) {
      Alert.alert(
        'Cannot Start Course',
        validations.join('\n\n'),
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsStarting(true);
      animateButtonPress();

      // Create session with quality tracking
      const sessionData = {
        expertId: expertData.id,
        studentId: studentId,
        courseId: courseId,
        enrollmentId: enrollmentId,
        scheduledTime: selectedSlot.startTime,
        duration: courseData.duration || 120, // Default 2 hours
        qualityThreshold: qualityMetrics?.currentScore || 4.0,
        metadata: {
          tier: expertData.currentTier,
          studentLevel: studentData.skillLevel,
          courseType: courseData.type
        }
      };

      const sessionResponse = await scheduleSession(sessionData);

      if (!sessionResponse.success) {
        throw new Error(sessionResponse.error || 'Failed to create session');
      }

      // Track quality metrics
      await QualityService.recordSessionStart({
        expertId: expertData.id,
        sessionId: sessionResponse.data.sessionId,
        studentId: studentId,
        timestamp: new Date().toISOString()
      });

      // Navigate to session interface
      navigation.navigate('TrainingSession', {
        sessionId: sessionResponse.data.sessionId,
        expertId: expertData.id,
        studentId: studentId,
        courseId: courseId
      });

      // Show success message
      showSuccessAnimation();

    } catch (error) {
      console.error('Course start failed:', error);
      Alert.alert(
        'Start Failed',
        error.message || 'Unable to start course session. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsStarting(false);
      resetButtonAnimation();
    }
  };

  /**
   * 🎨 ANIMATION HANDLERS
   */
  const animateButtonPress = () => {
    scaleAnimation.value = withSpring(0.95);
    opacityAnimation.value = withSpring(0.8);
  };

  const resetButtonAnimation = () => {
    scaleAnimation.value = withSpring(1);
    opacityAnimation.value = withSpring(1);
  };

  const showSuccessAnimation = () => {
    // Could implement Lottie animation here
  };

  /**
   * 📅 HANDLE SLOT SELECTION
   */
  const handleSlotSelect = (slot) => {
    Alert.alert(
      'Confirm Session',
      `Start course with ${studentData?.name} on ${new Date(slot.startTime).toLocaleDateString()} at ${new Date(slot.startTime).toLocaleTimeString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: () => handleStartCourse(slot),
          style: 'default'
        }
      ]
    );
  };

  /**
   * 🎯 RENDER LOADING STATE
   */
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
        <Text style={styles.loadingText}>Loading Course Starter...</Text>
      </View>
    );
  }

  /**
   * 🎯 RENDER MAIN COMPONENT
   */
  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0066FF']}
            tintColor="#0066FF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
          <LinearGradient
            colors={['#0066FF', '#0052CC']}
            style={styles.headerGradient}
          >
            <Text style={styles.headerTitle}>Start Course Session</Text>
            <Text style={styles.headerSubtitle}>
              {courseData?.name || 'Loading...'}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* Expert Status Card */}
        <Animated.View 
          entering={SlideInRight.delay(200).duration(500)}
          style={styles.statusCard}
        >
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.expertName}>
                {expertData?.name || 'Expert'}
              </Text>
              <TierIndicator 
                tier={expertData?.currentTier} 
                size="medium"
              />
            </View>
            <QualityBadge 
              score={qualityMetrics?.currentScore} 
              showValue 
            />
          </View>

          {/* Performance Metrics */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {expertPerformance?.completionRate || 0}%
              </Text>
              <Text style={styles.metricLabel}>Completion</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {expertPerformance?.studentCount || 0}
              </Text>
              <Text style={styles.metricLabel}>Students</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                {capacityStatus?.currentStudents || 0}/{capacityStatus?.maxCapacity || 0}
              </Text>
              <Text style={styles.metricLabel}>Capacity</Text>
            </View>
          </View>
        </Animated.View>

        {/* Student Information */}
        <Animated.View 
          entering={SlideInRight.delay(300).duration(500)}
          style={styles.studentCard}
        >
          <Text style={styles.cardTitle}>Student Information</Text>
          {studentData && (
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{studentData.name}</Text>
              <Text style={styles.studentDetail}>
                Skill Level: {studentData.skillLevel || 'Beginner'}
              </Text>
              <Text style={styles.studentDetail}>
                Mindset Phase: {studentData.mindsetPhaseCompleted ? 'Completed' : 'In Progress'}
              </Text>
              <Text style={styles.studentDetail}>
                Previous Experience: {studentData.previousExperience || 'None'}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Quality Compliance Check */}
        <Animated.View 
          entering={SlideInRight.delay(400).duration(500)}
          style={styles.qualityCard}
        >
          <Text style={styles.cardTitle}>Quality Check</Text>
          {qualityCheck && (
            <View style={[
              styles.complianceStatus,
              qualityCheck.complianceStatus === 'COMPLIANT' 
                ? styles.compliant 
                : styles.nonCompliant
            ]}>
              <Text style={styles.complianceText}>
                {qualityCheck.complianceStatus === 'COMPLIANT' 
                  ? '✅ All quality standards met' 
                  : '❌ Quality standards not met'
                }
              </Text>
              {qualityCheck.issues && qualityCheck.issues.length > 0 && (
                <View style={styles.issuesList}>
                  {qualityCheck.issues.map((issue, index) => (
                    <Text key={index} style={styles.issueText}>
                      • {issue}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Available Time Slots */}
        <Animated.View 
          entering={SlideInRight.delay(500).duration(500)}
          style={styles.slotsCard}
        >
          <Text style={styles.cardTitle}>Available Time Slots</Text>
          {availableSlots.length > 0 ? (
            <View style={styles.slotsList}>
              {availableSlots.map((slot, index) => (
                <AnimatedTouchable
                  key={slot.id}
                  entering={ZoomIn.delay(100 * index).duration(400)}
                  style={styles.slotItem}
                  onPress={() => handleSlotSelect(slot)}
                  disabled={isStarting}
                >
                  <LinearGradient
                    colors={['#F8FAFF', '#E8F0FF']}
                    style={styles.slotGradient}
                  >
                    <Text style={styles.slotDate}>
                      {new Date(slot.startTime).toLocaleDateString()}
                    </Text>
                    <Text style={styles.slotTime}>
                      {new Date(slot.startTime).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Text>
                    <Text style={styles.slotDuration}>
                      {slot.duration} minutes
                    </Text>
                  </LinearGradient>
                </AnimatedTouchable>
              ))}
            </View>
          ) : (
            <View style={styles.noSlots}>
              <Text style={styles.noSlotsText}>
                No available time slots
              </Text>
              <TouchableOpacity 
                style={styles.scheduleButton}
                onPress={() => navigation.navigate('ScheduleManager')}
              >
                <Text style={styles.scheduleButtonText}>
                  Manage Schedule
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View 
          entering={SlideInRight.delay(600).duration(500)}
          style={styles.actionsCard}
        >
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('StudentProfile', { studentId })}
            >
              <Text style={styles.actionIcon}>👤</Text>
              <Text style={styles.actionText}>Student Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('CourseMaterials', { courseId })}
            >
              <Text style={styles.actionIcon}>📚</Text>
              <Text style={styles.actionText}>Materials</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('QualityDashboard')}
            >
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionText}>Quality</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('SessionHistory')}
            >
              <Text style={styles.actionIcon}>🕒</Text>
              <Text style={styles.actionText}>History</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Start Session Button */}
      {availableSlots.length > 0 && (
        <Animated.View 
          style={[styles.footer, animatedButtonStyle]}
          entering={FadeInUp.delay(700).duration(500)}
        >
          <BlurView intensity={80} style={styles.footerBlur}>
            <TouchableOpacity
              style={[
                styles.startButton,
                (isStarting || validateStartReadiness().length > 0) && styles.startButtonDisabled
              ]}
              onPress={() => handleSlotSelect(availableSlots[0])}
              disabled={isStarting || validateStartReadiness().length > 0}
            >
              {isStarting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <LinearGradient
                  colors={['#0066FF', '#0052CC']}
                  style={styles.startButtonGradient}
                >
                  <Text style={styles.startButtonText}>
                    Start Course Session
                  </Text>
                  <Text style={styles.startButtonSubtext}>
                    With {studentData?.name || 'Student'}
                  </Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </BlurView>
        </Animated.View>
      )}
    </View>
  );
};

/**
 * 🎨 ENTERPRISE-LEVEL STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Medium',
  },
  header: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
  },
  headerGradient: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter-Medium',
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  expertName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0066FF',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Inter-Regular',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  studentInfo: {
    gap: 8,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'Inter-SemiBold',
  },
  studentDetail: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  qualityCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  complianceStatus: {
    padding: 16,
    borderRadius: 12,
  },
  compliant: {
    backgroundColor: '#F0FFF4',
    borderLeftWidth: 4,
    borderLeftColor: '#00C851',
  },
  nonCompliant: {
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 4,
    borderLeftColor: '#FF4444',
  },
  complianceText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  issuesList: {
    marginTop: 8,
  },
  issueText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  slotsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  slotsList: {
    gap: 12,
  },
  slotItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  slotGradient: {
    padding: 16,
    borderRadius: 12,
  },
  slotDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  slotTime: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0066FF',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  slotDuration: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  noSlots: {
    alignItems: 'center',
    padding: 20,
  },
  noSlotsText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  scheduleButton: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 100,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFF',
    borderRadius: 12,
    minWidth: '22%',
  },
  actionIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#1A1A1A',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  footerBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  startButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  startButtonDisabled: {
    opacity: 0.6,
  },
  startButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  startButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Inter-Medium',
  },
});

export default CourseStarter;