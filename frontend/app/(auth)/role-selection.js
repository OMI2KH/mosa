// (auth)/role-selection.js

/**
 * 🎯 ENTERPRISE ROLE SELECTION & VERIFICATION SYSTEM
 * Advanced role selection with expert proof validation and trademark verification
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  Animated,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../contexts/auth-context';
import { useQuality } from '../../contexts/quality-context';
import { Logger } from '../../utils/logger';
import { DocumentScanner } from '../../components/document-scanner';
import { TrademarkVerifier } from '../../components/trademark-verifier';
import { GeolocationService } from '../../services/geolocation-service';
import { FileUploadService } from '../../services/file-upload-service';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const RoleSelectionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user, updateUserRole, completeOnboarding } = useAuth();
  const { validateExpertProof, verifyTrainingLocation } = useQuality();
  
  const logger = new Logger('RoleSelection');
  const [selectedRole, setSelectedRole] = useState(null);
  const [verificationStep, setVerificationStep] = useState('role-selection');
  const [loading, setLoading] = useState(false);
  const [expertProofs, setExpertProofs] = useState({
    certificates: [],
    portfolio: [],
    trademarks: [],
    locationProof: null
  });
  const [animation] = useState(new Animated.Value(0));
  const [geolocation, setGeolocation] = useState(null);
  const [verificationResults, setVerificationResults] = useState({});

  // Available roles with detailed requirements
  const ROLES = {
    STUDENT: {
      id: 'STUDENT',
      title: '🎓 Student',
      description: 'Learn skills and get certified in 4 months',
      requirements: [],
      color: '#4CAF50',
      icon: '🎓',
      fee: '1,999 ETB',
      features: [
        '4-month comprehensive training',
        'Duolingo-style interactive learning',
        'Hands-on expert guidance',
        'Yachi certification & verification',
        'Income generation ready'
      ]
    },
    EXPERT: {
      id: 'EXPERT',
      title: '👨‍🏫 Expert Trainer',
      description: 'Train students and earn 999 ETB per student + bonuses',
      requirements: [
        'Professional certification or portfolio',
        'Minimum 2 years experience',
        'Business trademark verification',
        'Training location verification',
        'Quality commitment agreement'
      ],
      color: '#2196F3',
      icon: '👨‍🏫',
      earnings: '999 ETB/student + up to 20% bonus',
      capacity: 'Quality-based unlimited scaling'
    }
  };

  useEffect(() => {
    startEntranceAnimation();
    initializeGeolocation();
  }, []);

  /**
   * 🎬 START ENTRANCE ANIMATION
   */
  const startEntranceAnimation = () => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  /**
   * 📍 INITIALIZE GEOLOCATION
   */
  const initializeGeolocation = async () => {
    try {
      const location = await GeolocationService.getCurrentPosition();
      setGeolocation(location);
      logger.info('Geolocation initialized', { location });
    } catch (error) {
      logger.error('Geolocation initialization failed', error);
    }
  };

  /**
   * 🎯 HANDLE ROLE SELECTION
   */
  const handleRoleSelection = useCallback(async (role) => {
    setSelectedRole(role);
    
    if (role.id === 'STUDENT') {
      // Direct progression for students
      await proceedAsStudent();
    } else {
      // Expert requires verification
      setVerificationStep('expert-verification');
    }
  }, []);

  /**
   * 🎓 PROCEED AS STUDENT
   */
  const proceedAsStudent = async () => {
    try {
      setLoading(true);
      
      // Update user role in backend
      await updateUserRole('STUDENT');
      
      // Complete onboarding
      await completeOnboarding();
      
      logger.info('Student role selected successfully', { userId: user.id });
      
      // Navigate to student dashboard
      navigation.replace('StudentDashboard');
      
    } catch (error) {
      logger.error('Student role selection failed', error);
      Alert.alert('Selection Error', 'Failed to proceed as student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 📄 HANDLE DOCUMENT UPLOAD
   */
  const handleDocumentUpload = async (type, document) => {
    try {
      setLoading(true);
      
      // Upload document to secure storage
      const uploadResult = await FileUploadService.uploadExpertDocument(
        user.id,
        type,
        document
      );

      // Update local state
      setExpertProofs(prev => ({
        ...prev,
        [type]: [...prev[type], uploadResult]
      }));

      logger.info('Document uploaded successfully', { type, documentId: uploadResult.id });
      
    } catch (error) {
      logger.error('Document upload failed', error);
      Alert.alert('Upload Error', 'Failed to upload document. Please try again.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🏢 HANDLE TRAINING LOCATION VERIFICATION
   */
  const handleLocationVerification = async (locationData) => {
    try {
      setLoading(true);
      
      const verificationResult = await verifyTrainingLocation({
        expertId: user.id,
        location: locationData,
        geolocation,
        timestamp: new Date()
      });

      setExpertProofs(prev => ({
        ...prev,
        locationProof: verificationResult
      }));

      setVerificationResults(prev => ({
        ...prev,
        location: verificationResult
      }));

      logger.info('Training location verified', verificationResult);
      
    } catch (error) {
      logger.error('Location verification failed', error);
      Alert.alert('Verification Error', 'Failed to verify training location.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * ®️ HANDLE TRADEMARK VERIFICATION
   */
  const handleTrademarkVerification = async (trademarkData) => {
    try {
      setLoading(true);
      
      const verificationResult = await TrademarkVerifier.verifyBusinessTrademark(
        user.id,
        trademarkData
      );

      setExpertProofs(prev => ({
        ...prev,
        trademarks: [verificationResult]
      }));

      setVerificationResults(prev => ({
        ...prev,
        trademark: verificationResult
      }));

      logger.info('Trademark verified successfully', verificationResult);
      
    } catch (error) {
      logger.error('Trademark verification failed', error);
      Alert.alert('Verification Error', 'Failed to verify trademark.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * ✅ VALIDATE EXPERT PROOFS
   */
  const validateAllExpertProofs = () => {
    const validations = {
      certificates: expertProofs.certificates.length >= 1,
      portfolio: expertProofs.portfolio.length >= 3,
      trademarks: expertProofs.trademarks.length >= 1,
      location: expertProofs.locationProof !== null
    };

    const allValid = Object.values(validations).every(v => v);
    
    if (!allValid) {
      const missing = Object.entries(validations)
        .filter(([_, valid]) => !valid)
        .map(([key]) => key)
        .join(', ');
      
      Alert.alert(
        'Incomplete Verification',
        `Please complete the following: ${missing}`
      );
      return false;
    }

    return true;
  };

  /**
   * 👨‍🏫 PROCEED AS EXPERT
   */
  const proceedAsExpert = async () => {
    try {
      if (!validateAllExpertProofs()) return;

      setLoading(true);

      // Submit all proofs for final validation
      const expertValidation = await validateExpertProof({
        expertId: user.id,
        proofs: expertProofs,
        geolocation,
        userData: user
      });

      if (!expertValidation.valid) {
        Alert.alert(
          'Verification Failed',
          expertValidation.reason || 'Expert verification failed. Please check your documents.'
        );
        return;
      }

      // Update user role
      await updateUserRole('EXPERT', {
        verificationStatus: 'VERIFIED',
        expertTier: 'STANDARD',
        proofs: expertProofs,
        validatedAt: new Date()
      });

      // Complete onboarding
      await completeOnboarding();

      logger.info('Expert role verified and activated', {
        userId: user.id,
        validation: expertValidation
      });

      // Navigate to expert dashboard
      navigation.replace('ExpertDashboard');

    } catch (error) {
      logger.error('Expert verification failed', error);
      Alert.alert('Verification Error', 'Failed to complete expert verification.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🎨 RENDER ROLE SELECTION SCREEN
   */
  const renderRoleSelection = () => {
    const slideIn = {
      transform: [{
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0],
        }),
      }],
      opacity: animation,
    };

    return (
      <Animated.View style={[styles.container, slideIn]}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Path</Text>
          <Text style={styles.subtitle}>
            Select your role to continue your journey with Mosa Forge
          </Text>
        </View>

        <ScrollView 
          style={styles.rolesContainer}
          showsVerticalScrollIndicator={false}
        >
          {Object.values(ROLES).map((role, index) => (
            <Animated.View
              key={role.id}
              style={[
                styles.roleCard,
                { borderColor: role.color },
                selectedRole?.id === role.id && styles.roleCardSelected
              ]}
            >
              <TouchableOpacity
                style={styles.roleButton}
                onPress={() => handleRoleSelection(role)}
                disabled={loading}
              >
                <View style={styles.roleHeader}>
                  <Text style={styles.roleIcon}>{role.icon}</Text>
                  <View style={styles.roleTextContainer}>
                    <Text style={styles.roleTitle}>{role.title}</Text>
                    <Text style={styles.roleDescription}>{role.description}</Text>
                  </View>
                </View>

                {/* Role-specific details */}
                {role.id === 'STUDENT' && (
                  <View style={styles.roleDetails}>
                    <Text style={styles.feeText}>Bundle Price: {role.fee}</Text>
                    <View style={styles.featuresList}>
                      {role.features.map((feature, idx) => (
                        <Text key={idx} style={styles.featureText}>• {feature}</Text>
                      ))}
                    </View>
                  </View>
                )}

                {role.id === 'EXPERT' && (
                  <View style={styles.roleDetails}>
                    <Text style={styles.earningsText}>
                      Earnings: {role.earnings}
                    </Text>
                    <Text style={styles.capacityText}>
                      Capacity: {role.capacity}
                    </Text>
                    <View style={styles.requirementsContainer}>
                      <Text style={styles.requirementsTitle}>Requirements:</Text>
                      {role.requirements.map((req, idx) => (
                        <Text key={idx} style={styles.requirementText}>• {req}</Text>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.selectionIndicator}>
                  <View
                    style={[
                      styles.radioButton,
                      selectedRole?.id === role.id && styles.radioButtonSelected
                    ]}
                  >
                    {selectedRole?.id === role.id && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Powered by Chereka • Founded by Oumer Muktar
          </Text>
        </View>
      </Animated.View>
    );
  };

  /**
   * 📋 RENDER EXPERT VERIFICATION SCREEN
   */
  const renderExpertVerification = () => {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setVerificationStep('role-selection')}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Expert Verification</Text>
          <Text style={styles.subtitle}>
            Complete the following steps to become a verified expert
          </Text>
        </View>

        <ScrollView style={styles.verificationContainer}>
          {/* Certificate Upload */}
          <VerificationStep
            title="Professional Certificates"
            description="Upload your professional certifications or diplomas"
            status={expertProofs.certificates.length > 0 ? 'completed' : 'pending'}
            onPress={() => navigation.navigate('DocumentUpload', {
              type: 'certificates',
              onUpload: (doc) => handleDocumentUpload('certificates', doc)
            })}
          />

          {/* Portfolio Upload */}
          <VerificationStep
            title="Portfolio Evidence"
            description="Showcase your previous work (minimum 3 projects)"
            status={expertProofs.portfolio.length >= 3 ? 'completed' : 'pending'}
            onPress={() => navigation.navigate('DocumentUpload', {
              type: 'portfolio',
              onUpload: (doc) => handleDocumentUpload('portfolio', doc)
            })}
          />

          {/* Trademark Verification */}
          <VerificationStep
            title="Business Trademark"
            description="Verify your business name and trademark"
            status={expertProofs.trademarks.length > 0 ? 'completed' : 'pending'}
            onPress={() => navigation.navigate('TrademarkVerification', {
              onVerify: handleTrademarkVerification
            })}
          />

          {/* Training Location Verification */}
          <VerificationStep
            title="Training Location"
            description="Verify your training facility or workspace"
            status={expertProofs.locationProof ? 'completed' : 'pending'}
            onPress={() => navigation.navigate('LocationVerification', {
              onVerify: handleLocationVerification
            })}
          />

          {/* Quality Commitment */}
          <VerificationStep
            title="Quality Commitment"
            description="Agree to maintain Mosa Forge quality standards"
            status="pending"
            onPress={() => navigation.navigate('QualityAgreement')}
          />
        </ScrollView>

        <View style={styles.verificationFooter}>
          <TouchableOpacity
            style={[
              styles.verifyButton,
              (!validateAllExpertProofs() || loading) && styles.verifyButtonDisabled
            ]}
            onPress={proceedAsExpert}
            disabled={!validateAllExpertProofs() || loading}
          >
            <Text style={styles.verifyButtonText}>
              {loading ? 'Verifying...' : 'Complete Verification'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /**
   * ✅ VERIFICATION STEP COMPONENT
   */
  const VerificationStep = ({ title, description, status, onPress }) => {
    const getStatusColor = () => {
      switch (status) {
        case 'completed': return '#4CAF50';
        case 'pending': return '#FF9800';
        default: return '#9E9E9E';
      }
    };

    const getStatusText = () => {
      switch (status) {
        case 'completed': return 'Verified';
        case 'pending': return 'Pending';
        default: return 'Not Started';
      }
    };

    return (
      <TouchableOpacity 
        style={styles.verificationStep}
        onPress={onPress}
        disabled={loading}
      >
        <View style={styles.stepHeader}>
          <View style={styles.stepTitleContainer}>
            <Text style={styles.stepTitle}>{title}</Text>
            <Text style={styles.stepDescription}>{description}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render based on current step
  return verificationStep === 'role-selection' 
    ? renderRoleSelection() 
    : renderExpertVerification();
};

/**
 * 🎨 STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
  },
  rolesContainer: {
    flex: 1,
    marginBottom: 20,
  },
  roleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  roleCardSelected: {
    borderColor: '#4299E1',
    shadowColor: '#4299E1',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  roleButton: {
    flex: 1,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  roleIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
  roleDetails: {
    marginTop: 12,
    paddingLeft: 48,
  },
  feeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 8,
  },
  earningsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    marginBottom: 4,
  },
  capacityText: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 12,
  },
  featuresList: {
    marginTop: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
    marginBottom: 4,
  },
  requirementsContainer: {
    marginTop: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 18,
    marginBottom: 2,
  },
  selectionIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CBD5E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#4299E1',
    backgroundColor: '#4299E1',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4299E1',
    fontWeight: '500',
  },
  verificationContainer: {
    flex: 1,
    marginBottom: 20,
  },
  verificationStep: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  verificationFooter: {
    paddingVertical: 20,
  },
  verifyButton: {
    backgroundColor: '#4299E1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4299E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonDisabled: {
    backgroundColor: '#CBD5E0',
    shadowOpacity: 0,
    elevation: 0,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default RoleSelectionScreen;