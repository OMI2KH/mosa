// learning/skill-switcher.jsx

/**
 * 🎯 ENTERPRISE SKILL SWITCHER COMPONENT
 * Production-ready skill switching with payment enforcement
 * Features: Multi-course management, payment validation, enrollment locking
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Contexts
import { AuthContext } from '../../contexts/auth-context';
import { PaymentContext } from '../../contexts/payment-context';
import { EnrollmentContext } from '../../contexts/enrollment-context';

// Services
import { PaymentService } from '../../services/payment-service';
import { EnrollmentService } from '../../services/enrollment-service';
import { AnalyticsService } from '../../services/analytics-service';

// Components
import QualityBadge from '../../components/shared/quality-badge';
import PaymentModal from '../../components/payment/payment-modal';
import ConfirmationModal from '../../components/shared/confirmation-modal';

const SkillSwitcher = () => {
  const navigation = useNavigation();
  
  // Contexts
  const { user, faydaId } = useContext(AuthContext);
  const { activeEnrollments, refreshEnrollments } = useContext(EnrollmentContext);
  const { processBundlePayment } = useContext(PaymentContext);

  // State
  const [loading, setLoading] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [animation] = useState(new Animated.Value(0));

  // Constants
  const BUNDLE_PRICE = 1999;
  const MAX_CONCURRENT_COURSES = 3;

  /**
   * 🎯 LOAD AVAILABLE SKILLS
   */
  const loadAvailableSkills = useCallback(async () => {
    try {
      setLoading(true);
      
      const skills = await EnrollmentService.getAvailableSkills();
      const enrolledSkillIds = activeEnrollments.map(enrollment => enrollment.skillId);
      
      // Filter out already enrolled skills
      const filteredSkills = skills.filter(skill => 
        !enrolledSkillIds.includes(skill.id)
      );
      
      setAvailableSkills(filteredSkills);
      
      // Animate entrance
      Animated.timing(animation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
    } catch (error) {
      console.error('Failed to load skills:', error);
      Alert.alert('Error', 'Failed to load available skills. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeEnrollments, animation]);

  React.useEffect(() => {
    loadAvailableSkills();
  }, [loadAvailableSkills]);

  /**
   * 🛡️ VALIDATE SKILL SWITCH ELIGIBILITY
   */
  const validateSwitchEligibility = useCallback((skill) => {
    // Check if user has active expert enrollment
    const hasActiveExpertEnrollment = activeEnrollments.some(
      enrollment => enrollment.expertId && enrollment.status === 'ACTIVE'
    );

    if (hasActiveExpertEnrollment) {
      return {
        eligible: false,
        reason: 'EXPERT_ENROLLMENT_ACTIVE',
        message: 'Cannot switch skills while actively enrolled with an expert. Complete your current training first.'
      };
    }

    // Check maximum concurrent courses
    if (activeEnrollments.length >= MAX_CONCURRENT_COURSES) {
      return {
        eligible: false,
        reason: 'MAX_COURSES_REACHED',
        message: `Maximum of ${MAX_CONCURRENT_COURSES} concurrent courses allowed. Complete a course before starting another.`
      };
    }

    // Check if skill requires additional payment
    const alreadyPaidForSkill = activeEnrollments.some(
      enrollment => enrollment.skillId === skill.id
    );

    if (!alreadyPaidForSkill) {
      return {
        eligible: true,
        requiresPayment: true,
        message: `This skill requires a new bundle payment of ${BUNDLE_PRICE} ETB.`
      };
    }

    return {
      eligible: true,
      requiresPayment: false,
      message: 'You can switch to this skill immediately.'
    };
  }, [activeEnrollments]);

  /**
   * 💰 HANDLE SKILL SELECTION
   */
  const handleSkillSelect = useCallback(async (skill) => {
    const eligibility = validateSwitchEligibility(skill);
    
    if (!eligibility.eligible) {
      Alert.alert('Cannot Switch Skill', eligibility.message);
      return;
    }

    setSelectedSkill(skill);

    if (eligibility.requiresPayment) {
      setShowConfirmationModal(true);
    } else {
      await proceedWithSkillSwitch(skill);
    }
  }, [validateSwitchEligibility]);

  /**
   * 🚀 PROCEED WITH SKILL SWITCH
   */
  const proceedWithSkillSwitch = useCallback(async (skill) => {
    try {
      setLoading(true);

      // Track analytics
      await AnalyticsService.trackSkillSwitchAttempt({
        userId: user.id,
        faydaId,
        fromSkill: activeEnrollments[0]?.skillName,
        toSkill: skill.name,
        requiresPayment: true
      });

      // Show payment modal for new skill
      setShowPaymentModal(true);
      
    } catch (error) {
      console.error('Skill switch failed:', error);
      Alert.alert('Error', 'Failed to process skill switch. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user, faydaId, activeEnrollments]);

  /**
   * 💳 PROCESS BUNDLE PAYMENT
   */
  const handleBundlePayment = useCallback(async (paymentMethod) => {
    try {
      setLoading(true);
      
      const paymentResult = await processBundlePayment({
        amount: BUNDLE_PRICE,
        skillId: selectedSkill.id,
        skillName: selectedSkill.name,
        paymentMethod,
        type: 'SKILL_SWITCH'
      });

      if (paymentResult.success) {
        // Create new enrollment
        await EnrollmentService.createEnrollment({
          userId: user.id,
          skillId: selectedSkill.id,
          skillName: selectedSkill.name,
          paymentId: paymentResult.paymentId,
          bundlePrice: BUNDLE_PRICE
        });

        // Refresh enrollments
        await refreshEnrollments();

        // Track success
        await AnalyticsService.trackSkillSwitchSuccess({
          userId: user.id,
          faydaId,
          skillId: selectedSkill.id,
          skillName: selectedSkill.name,
          paymentId: paymentResult.paymentId,
          amount: BUNDLE_PRICE
        });

        // Show success message
        Alert.alert(
          'Skill Added Successfully!',
          `You have successfully enrolled in ${selectedSkill.name}. You can now access this skill from your dashboard.`,
          [
            {
              text: 'Continue Learning',
              onPress: () => navigation.navigate('LearningDashboard')
            }
          ]
        );

        setShowPaymentModal(false);
        setSelectedSkill(null);
      } else {
        throw new Error(paymentResult.error || 'Payment failed');
      }
      
    } catch (error) {
      console.error('Payment processing failed:', error);
      
      await AnalyticsService.trackSkillSwitchFailure({
        userId: user.id,
        faydaId,
        skillId: selectedSkill.id,
        error: error.message
      });

      Alert.alert(
        'Payment Failed',
        error.message || 'Unable to process payment. Please try again or contact support.'
      );
    } finally {
      setLoading(false);
    }
  }, [selectedSkill, user, faydaId, processBundlePayment, refreshEnrollments, navigation]);

  /**
   * 🎨 RENDER SKILL CARD
   */
  const renderSkillCard = useCallback((skill) => {
    const eligibility = validateSwitchEligibility(skill);
    const isDisabled = !eligibility.eligible;
    
    return (
      <Animated.View
        style={[
          styles.skillCard,
          {
            opacity: animation,
            transform: [
              {
                translateY: animation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.skillTouchable,
            isDisabled && styles.disabledCard
          ]}
          onPress={() => handleSkillSelect(skill)}
          disabled={isDisabled || loading}
        >
          <LinearGradient
            colors={['#f8f9fa', '#e9ecef']}
            style={styles.skillGradient}
          >
            <View style={styles.skillHeader}>
              <View style={styles.skillIconContainer}>
                <Ionicons 
                  name={skill.icon || 'cube-outline'} 
                  size={24} 
                  color="#495057" 
                />
              </View>
              
              <View style={styles.skillInfo}>
                <Text style={styles.skillName}>{skill.name}</Text>
                <Text style={styles.skillCategory}>{skill.category}</Text>
              </View>
              
              <QualityBadge 
                score={skill.qualityScore} 
                size="small" 
              />
            </View>

            <Text style={styles.skillDescription}>
              {skill.description}
            </Text>

            <View style={styles.skillFooter}>
              <View style={styles.durationBadge}>
                <Ionicons name="time-outline" size={14} color="#6c757d" />
                <Text style={styles.durationText}>4 months</Text>
              </View>
              
              <View style={styles.priceContainer}>
                {eligibility.requiresPayment && (
                  <>
                    <Text style={styles.priceOriginal}>1,999 ETB</Text>
                    <Ionicons name="lock-closed" size={16} color="#dc3545" />
                  </>
                )}
                
                {!eligibility.requiresPayment && eligibility.eligible && (
                  <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                )}
                
                {!eligibility.eligible && (
                  <Ionicons name="warning" size={16} color="#ffc107" />
                )}
              </View>
            </View>

            {!eligibility.eligible && (
              <View style={styles.warningContainer}>
                <Ionicons name="information-circle" size={14} color="#6c757d" />
                <Text style={styles.warningText}>
                  {eligibility.reason === 'EXPERT_ENROLLMENT_ACTIVE' 
                    ? 'Complete current training first'
                    : 'Maximum courses reached'
                  }
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [animation, validateSwitchEligibility, handleSkillSelect, loading]);

  /**
   * 📊 RENDER CURRENT ENROLLMENTS
   */
  const renderCurrentEnrollments = useCallback(() => {
    if (activeEnrollments.length === 0) {
      return null;
    }

    return (
      <View style={styles.currentEnrollmentsSection}>
        <Text style={styles.sectionTitle}>Current Enrollments</Text>
        {activeEnrollments.map((enrollment, index) => (
          <View key={enrollment.id} style={styles.enrollmentCard}>
            <View style={styles.enrollmentHeader}>
              <Text style={styles.enrollmentSkillName}>
                {enrollment.skillName}
              </Text>
              <View style={[
                styles.statusBadge,
                enrollment.status === 'ACTIVE' && styles.statusActive,
                enrollment.status === 'COMPLETED' && styles.statusCompleted
              ]}>
                <Text style={styles.statusText}>
                  {enrollment.status}
                </Text>
              </View>
            </View>
            
            <View style={styles.enrollmentProgress}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${enrollment.progress || 0}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(enrollment.progress || 0)}% Complete
              </Text>
            </View>

            {enrollment.expertId && (
              <View style={styles.expertInfo}>
                <Ionicons name="person-circle" size={16} color="#6c757d" />
                <Text style={styles.expertText}>
                  With Expert • {enrollment.expertName}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
    );
  }, [activeEnrollments]);

  if (loading && availableSkills.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading available skills...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add New Skill</Text>
          <Text style={styles.headerSubtitle}>
            Expand your expertise with additional skills
          </Text>
        </View>

        {/* Current Enrollments */}
        {renderCurrentEnrollments()}

        {/* Available Skills */}
        <View style={styles.availableSkillsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Skills</Text>
            <View style={styles.counterBadge}>
              <Text style={styles.counterText}>
                {availableSkills.length} skills available
              </Text>
            </View>
          </View>

          <Text style={styles.sectionDescription}>
            Each new skill requires a separate {BUNDLE_PRICE} ETB bundle payment. 
            You cannot switch skills while actively training with an expert.
          </Text>

          <View style={styles.skillsGrid}>
            {availableSkills.map((skill) => renderSkillCard(skill))}
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.paymentInfoCard}>
          <Ionicons name="information-circle" size={24} color="#007bff" />
          <View style={styles.paymentInfoContent}>
            <Text style={styles.paymentInfoTitle}>
              Bundle Payment Required
            </Text>
            <Text style={styles.paymentInfoText}>
              Each skill requires a separate {BUNDLE_PRICE} ETB payment covering:
              mindset training, theory mastery, hands-on practice, and certification.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedSkill(null);
        }}
        onPayment={handleBundlePayment}
        amount={BUNDLE_PRICE}
        skillName={selectedSkill?.name}
        loading={loading}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={showConfirmationModal}
        title="New Skill Payment Required"
        message={`To enroll in ${selectedSkill?.name}, a new bundle payment of ${BUNDLE_PRICE} ETB is required. This includes complete training and certification.`}
        confirmText={`Pay ${BUNDLE_PRICE} ETB`}
        cancelText="Cancel"
        onConfirm={() => {
          setShowConfirmationModal(false);
          setShowPaymentModal(true);
        }}
        onCancel={() => {
          setShowConfirmationModal(false);
          setSelectedSkill(null);
        }}
        type="warning"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    lineHeight: 22,
  },
  currentEnrollmentsSection: {
    padding: 24,
    paddingTop: 0,
    paddingBottom: 16,
  },
  availableSkillsSection: {
    padding: 24,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
    marginBottom: 20,
  },
  counterBadge: {
    backgroundColor: '#e7f3ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007bff',
  },
  skillsGrid: {
    gap: 16,
  },
  skillCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  skillTouchable: {
    borderRadius: 12,
  },
  disabledCard: {
    opacity: 0.6,
  },
  skillGradient: {
    padding: 20,
    borderRadius: 12,
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  skillIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  skillCategory: {
    fontSize: 14,
    color: '#6c757d',
  },
  skillDescription: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
    marginBottom: 16,
  },
  skillFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceOriginal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    flex: 1,
  },
  enrollmentCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  enrollmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  enrollmentSkillName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#d4edda',
  },
  statusCompleted: {
    backgroundColor: '#d1ecf1',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#155724',
    textTransform: 'uppercase',
  },
  enrollmentProgress: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6c757d',
  },
  expertInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expertText: {
    fontSize: 12,
    color: '#6c757d',
  },
  paymentInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e7f3ff',
    margin: 24,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  paymentInfoContent: {
    flex: 1,
  },
  paymentInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#004085',
    marginBottom: 4,
  },
  paymentInfoText: {
    fontSize: 14,
    color: '#004085',
    lineHeight: 20,
  },
});

export default SkillSwitcher;