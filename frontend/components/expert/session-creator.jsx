// expert/session-creator.jsx

/**
 * 🎯 ENTERPRISE SESSION CREATOR
 * Production-ready session creation and management for Mosa Forge Experts
 * Features: Quality-aware scheduling, capacity management, real-time validation
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useExpert } from '../../contexts/expert-context';
import { useQuality } from '../../contexts/quality-context';
import { useTraining } from '../../contexts/training-context';
import { 
  Calendar, 
  Clock, 
  Users, 
  Star, 
  AlertTriangle,
  CheckCircle,
  X
} from 'react-native-feather';
import { 
  Button, 
  Input, 
  Card, 
  Badge, 
  Modal,
  DateTimePicker,
  QualityScore,
  TierBadge
} from '../../components/shared';
import { 
  sessionService, 
  qualityService, 
  capacityService 
} from '../../services';
import { 
  SESSION_TYPES, 
  MAX_SESSION_DURATION, 
  MIN_SESSION_DURATION,
  QUALITY_THRESHOLDS,
  CAPACITY_LIMITS
} from '../../constants/training-config';
import { logger, analytics } from '../../utils';

const SessionCreator = ({ route }) => {
  const navigation = useNavigation();
  const { expert, refreshExpertData } = useExpert();
  const { qualityMetrics, refreshQualityMetrics } = useQuality();
  const { refreshTrainingSessions } = useTraining();

  // 🎯 STATE MANAGEMENT
  const [sessionData, setSessionData] = useState({
    title: '',
    description: '',
    skillId: '',
    sessionType: 'PRACTICAL',
    scheduledDate: new Date(),
    duration: 120, // minutes
    maxStudents: 5,
    priceTier: 'STANDARD',
    requirements: [],
    materials: [],
    objectives: []
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [capacityCheck, setCapacityCheck] = useState(null);
  const [qualityWarnings, setQualityWarnings] = useState([]);

  // 🎯 MEMOIZED COMPUTED VALUES
  const computedValues = useMemo(() => {
    const currentLoad = expert?.currentSessions?.length || 0;
    const capacityLimit = CAPACITY_LIMITS[expert?.currentTier] || 50;
    const utilizationRate = (currentLoad / capacityLimit) * 100;
    const canCreateSession = utilizationRate < 95;

    return {
      currentLoad,
      capacityLimit,
      utilizationRate,
      canCreateSession,
      availableSlots: capacityLimit - currentLoad
    };
  }, [expert]);

  const qualityStatus = useMemo(() => {
    const score = qualityMetrics?.overallScore || 4.0;
    const completionRate = qualityMetrics?.completionRate || 0;
    
    const warnings = [];
    if (score < QUALITY_THRESHOLDS.MINIMUM_SCORE) {
      warnings.push('Your quality score is below minimum threshold');
    }
    if (completionRate < QUALITY_THRESHOLDS.MINIMUM_COMPLETION_RATE) {
      warnings.push('Completion rate needs improvement');
    }
    if (expert?.currentTier === 'PROBATION') {
      warnings.push('You are in probation tier - session creation limited');
    }

    return { warnings, isQualityOk: warnings.length === 0 };
  }, [qualityMetrics, expert]);

  // 🎯 EVENT HANDLERS
  const handleInputChange = useCallback((field, value) => {
    setSessionData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  }, [validationErrors]);

  const handleDateChange = useCallback((event, selectedDate) => {
    setShowCalendar(false);
    if (selectedDate) {
      const currentDate = new Date(sessionData.scheduledDate);
      currentDate.setFullYear(selectedDate.getFullYear());
      currentDate.setMonth(selectedDate.getMonth());
      currentDate.setDate(selectedDate.getDate());
      
      handleInputChange('scheduledDate', currentDate);
    }
  }, [sessionData.scheduledDate, handleInputChange]);

  const handleTimeChange = useCallback((event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const currentDate = new Date(sessionData.scheduledDate);
      currentDate.setHours(selectedTime.getHours());
      currentDate.setMinutes(selectedTime.getMinutes());
      
      handleInputChange('scheduledDate', currentDate);
    }
  }, [sessionData.scheduledDate, handleInputChange]);

  // 🎯 VALIDATION FUNCTIONS
  const validateSessionData = useCallback(async () => {
    const errors = {};
    const now = new Date();

    // Title validation
    if (!sessionData.title?.trim()) {
      errors.title = 'Session title is required';
    } else if (sessionData.title.length < 5) {
      errors.title = 'Title must be at least 5 characters';
    } else if (sessionData.title.length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }

    // Description validation
    if (!sessionData.description?.trim()) {
      errors.description = 'Session description is required';
    } else if (sessionData.description.length < 20) {
      errors.description = 'Description must be at least 20 characters';
    }

    // Date validation
    if (sessionData.scheduledDate <= now) {
      errors.scheduledDate = 'Session must be scheduled in the future';
    }

    // Duration validation
    if (sessionData.duration < MIN_SESSION_DURATION) {
      errors.duration = `Session must be at least ${MIN_SESSION_DURATION} minutes`;
    } else if (sessionData.duration > MAX_SESSION_DURATION) {
      errors.duration = `Session cannot exceed ${MAX_SESSION_DURATION} minutes`;
    }

    // Capacity validation
    if (sessionData.maxStudents < 1) {
      errors.maxStudents = 'Must have at least 1 student';
    } else if (sessionData.maxStudents > 10) {
      errors.maxStudents = 'Cannot exceed 10 students per session';
    }

    // Skill validation
    if (!sessionData.skillId) {
      errors.skillId = 'Please select a skill';
    }

    // Quality validation
    if (!qualityStatus.isQualityOk) {
      errors.quality = 'Quality standards not met';
    }

    // Capacity check
    try {
      const capacity = await capacityService.checkExpertCapacity(
        expert.id,
        sessionData.scheduledDate,
        sessionData.duration
      );
      
      if (!capacity.available) {
        errors.capacity = capacity.message || 'Capacity limit reached for this time';
      }
      setCapacityCheck(capacity);
    } catch (error) {
      logger.error('Capacity check failed', error);
      errors.capacity = 'Unable to verify capacity';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [sessionData, expert, qualityStatus]);

  // 🎯 SESSION CREATION
  const handleCreateSession = useCallback(async () => {
    if (!expert) {
      Alert.alert('Error', 'Expert data not loaded');
      return;
    }

    // Validate session data
    const isValid = await validateSessionData();
    if (!isValid) {
      Alert.alert('Validation Error', 'Please fix the errors before creating session');
      return;
    }

    setIsSubmitting(true);

    try {
      // 🎯 PRE-CREATION CHECKS
      const [qualityCheck, capacityCheck] = await Promise.all([
        qualityService.validateExpertForSession(expert.id),
        capacityService.getRealTimeCapacity(expert.id)
      ]);

      if (!qualityCheck.allowed) {
        Alert.alert(
          'Quality Restriction',
          qualityCheck.reason || 'Cannot create session due to quality issues'
        );
        return;
      }

      if (!capacityCheck.canCreateMore) {
        Alert.alert(
          'Capacity Limit Reached',
          capacityCheck.message || 'You have reached your session capacity limit'
        );
        return;
      }

      // 🎯 SESSION CREATION
      const sessionPayload = {
        ...sessionData,
        expertId: expert.id,
        expertTier: expert.currentTier,
        qualityScore: qualityMetrics.overallScore,
        status: 'SCHEDULED',
        metadata: {
          createdVia: 'expert_app',
          devicePlatform: Platform.OS,
          timestamp: new Date().toISOString()
        }
      };

      const newSession = await sessionService.createExpertSession(sessionPayload);

      // 🎯 POST-CREATION ACTIONS
      await Promise.all([
        refreshExpertData(),
        refreshQualityMetrics(),
        refreshTrainingSessions()
      ]);

      // 🎯 ANALYTICS
      analytics.track('session_created', {
        expertId: expert.id,
        expertTier: expert.currentTier,
        sessionType: sessionData.sessionType,
        duration: sessionData.duration,
        studentCount: sessionData.maxStudents,
        qualityScore: qualityMetrics.overallScore
      });

      // 🎯 SUCCESS HANDLING
      Alert.alert(
        'Session Created',
        'Your training session has been scheduled successfully',
        [
          {
            text: 'View Session',
            onPress: () => navigation.navigate('ExpertSessions', { 
              sessionId: newSession.id 
            })
          },
          {
            text: 'Create Another',
            style: 'cancel'
          }
        ]
      );

      // Reset form
      setSessionData({
        title: '',
        description: '',
        skillId: '',
        sessionType: 'PRACTICAL',
        scheduledDate: new Date(),
        duration: 120,
        maxStudents: 5,
        priceTier: 'STANDARD',
        requirements: [],
        materials: [],
        objectives: []
      });

    } catch (error) {
      logger.error('Session creation failed', error);
      
      Alert.alert(
        'Creation Failed',
        error.message || 'Unable to create session. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    sessionData, 
    expert, 
    qualityMetrics, 
    validateSessionData, 
    navigation,
    refreshExpertData,
    refreshQualityMetrics,
    refreshTrainingSessions
  ]);

  // 🎯 RENDER FUNCTIONS
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Create Training Session</Text>
      <View style={styles.expertInfo}>
        <TierBadge tier={expert?.currentTier} />
        <QualityScore score={qualityMetrics?.overallScore} />
      </View>
    </View>
  );

  const renderQualityWarnings = () => {
    if (!qualityStatus.warnings.length) return null;

    return (
      <Card style={styles.warningCard}>
        <View style={styles.warningHeader}>
          <AlertTriangle size={20} color="#DC2626" />
          <Text style={styles.warningTitle}>Quality Warnings</Text>
        </View>
        {qualityStatus.warnings.map((warning, index) => (
          <Text key={index} style={styles.warningText}>
            • {warning}
          </Text>
        ))}
      </Card>
    );
  };

  const renderCapacityInfo = () => (
    <Card style={styles.capacityCard}>
      <View style={styles.capacityHeader}>
        <Users size={20} color="#2563EB" />
        <Text style={styles.capacityTitle}>Capacity Overview</Text>
      </View>
      <View style={styles.capacityStats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{computedValues.currentLoad}</Text>
          <Text style={styles.statLabel}>Current Sessions</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{computedValues.availableSlots}</Text>
          <Text style={styles.statLabel}>Available Slots</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{computedValues.capacityLimit}</Text>
          <Text style={styles.statLabel}>Capacity Limit</Text>
        </View>
      </View>
      {!computedValues.canCreateSession && (
        <Text style={styles.capacityWarning}>
          Near capacity limit. Consider completing current sessions first.
        </Text>
      )}
    </Card>
  );

  const renderDateTimeSection = () => (
    <Card style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Schedule</Text>
      
      <View style={styles.datetimeRow}>
        <Button
          variant="outline"
          style={styles.dateButton}
          onPress={() => setShowCalendar(true)}
        >
          <Calendar size={16} color="#374151" />
          <Text style={styles.buttonText}>
            {sessionData.scheduledDate.toLocaleDateString()}
          </Text>
        </Button>

        <Button
          variant="outline"
          style={styles.timeButton}
          onPress={() => setShowTimePicker(true)}
        >
          <Clock size={16} color="#374151" />
          <Text style={styles.buttonText}>
            {sessionData.scheduledDate.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </Button>
      </View>

      {validationErrors.scheduledDate && (
        <Text style={styles.errorText}>{validationErrors.scheduledDate}</Text>
      )}

      {/* DateTime Pickers */}
      {showCalendar && (
        <DateTimePicker
          value={sessionData.scheduledDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={sessionData.scheduledDate}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </Card>
  );

  const renderSessionDetails = () => (
    <Card style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Session Details</Text>
      
      <Input
        label="Session Title"
        value={sessionData.title}
        onChangeText={(value) => handleInputChange('title', value)}
        placeholder="Enter a clear, descriptive title"
        error={validationErrors.title}
        maxLength={100}
      />

      <Input
        label="Description"
        value={sessionData.description}
        onChangeText={(value) => handleInputChange('description', value)}
        placeholder="Describe what students will learn and practice"
        multiline
        numberOfLines={4}
        error={validationErrors.description}
        maxLength={500}
      />

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Input
            label="Duration (minutes)"
            value={sessionData.duration.toString()}
            onChangeText={(value) => handleInputChange('duration', parseInt(value) || 0)}
            keyboardType="numeric"
            error={validationErrors.duration}
          />
        </View>
        
        <View style={styles.halfInput}>
          <Input
            label="Max Students"
            value={sessionData.maxStudents.toString()}
            onChangeText={(value) => handleInputChange('maxStudents', parseInt(value) || 0)}
            keyboardType="numeric"
            error={validationErrors.maxStudents}
          />
        </View>
      </View>
    </Card>
  );

  const renderSessionType = () => (
    <Card style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Session Type</Text>
      
      <View style={styles.typeGrid}>
        {Object.entries(SESSION_TYPES).map(([key, type]) => (
          <Button
            key={key}
            variant={sessionData.sessionType === key ? 'primary' : 'outline'}
            style={styles.typeButton}
            onPress={() => handleInputChange('sessionType', key)}
          >
            <type.icon size={20} color={sessionData.sessionType === key ? '#FFFFFF' : '#374151'} />
            <Text style={[
              styles.typeText,
              sessionData.sessionType === key && styles.typeTextActive
            ]}>
              {type.label}
            </Text>
          </Button>
        ))}
      </View>
    </Card>
  );

  const renderSubmitSection = () => (
    <View style={styles.submitSection}>
      {isSubmitting ? (
        <ActivityIndicator size="large" color="#10B981" />
      ) : (
        <Button
          variant="primary"
          style={styles.submitButton}
          onPress={handleCreateSession}
          disabled={!computedValues.canCreateSession || !qualityStatus.isQualityOk}
        >
          <CheckCircle size={20} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>
            Create Training Session
          </Text>
        </Button>
      )}
      
      {(!computedValues.canCreateSession || !qualityStatus.isQualityOk) && (
        <Text style={styles.disabledText}>
          Session creation is disabled due to capacity or quality restrictions
        </Text>
      )}
    </View>
  );

  // 🎯 MAIN RENDER
  if (!expert) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading expert data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderQualityWarnings()}
        {renderCapacityInfo()}
        {renderDateTimeSection()}
        {renderSessionDetails()}
        {renderSessionType()}
        {renderSubmitSection()}
      </ScrollView>
    </View>
  );
};

// 🎯 STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  expertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  warningText: {
    fontSize: 14,
    color: '#DC2626',
    marginBottom: 4,
  },
  capacityCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    marginBottom: 16,
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  capacityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  capacityStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  capacityWarning: {
    fontSize: 14,
    color: '#DC2626',
    fontStyle: 'italic',
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  datetimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    minWidth: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  typeText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  typeTextActive: {
    color: '#FFFFFF',
  },
  submitSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default SessionCreator;