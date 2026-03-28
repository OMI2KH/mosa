/**
 * 🎯 MOSA FORGE: Enterprise Duplicate Alert Component
 * 
 * @component DuplicateAlert
 * @description AI-powered Fayda ID duplicate detection and resolution
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time Fayda ID duplicate detection
 * - AI-powered similarity analysis
 * - Multi-factor verification system
 * - Secure account recovery flows
 * - Government ID validation integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// 🏗️ Enterprise Hooks & Services
import { useAuth } from '../../../contexts/auth-context';
import { useFaydaValidation } from '../../../hooks/use-fayda-validation';
import { useSecurity } from '../../../hooks/use-security';
import { duplicateService } from '../../../services/duplicate-service';

// 🏗️ Design System
import { 
  Colors, 
  Typography, 
  Spacing, 
  Shadows, 
  Animations 
} from '../../../design-system/design-tokens';
import { 
  SecurityShield, 
  WarningTriangle, 
  SuccessCheck,
  IdentityVerified,
  AlertOctagon
} from '../../../components/icons/security-icons';

// 🏗️ Enterprise Constants
const DUPLICATE_SEVERITY = {
  LOW: 'LOW',        // Possible false positive
  MEDIUM: 'MEDIUM',  // Similar patterns detected
  HIGH: 'HIGH',      // Confirmed duplicate
  CRITICAL: 'CRITICAL' // Fraudulent activity suspected
};

const RESOLUTION_ACTIONS = {
  VERIFY_IDENTITY: 'VERIFY_IDENTITY',
  CONTACT_SUPPORT: 'CONTACT_SUPPORT',
  ACCOUNT_RECOVERY: 'ACCOUNT_RECOVERY',
  SECURITY_VERIFICATION: 'SECURITY_VERIFICATION'
};

/**
 * 🏗️ Enterprise Duplicate Alert Component
 * @component
 */
const DuplicateAlert = () => {
  // 🎯 Router & Params
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // 🏗️ State Management
  const [duplicateData, setDuplicateData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [resolutionStep, setResolutionStep] = useState('DETECTION');
  const [verificationMethod, setVerificationMethod] = useState(null);
  const [securityChecks, setSecurityChecks] = useState([]);
  const [animation] = useState(new Animated.Value(0));

  // 🏗️ Enterprise Hooks
  const { user, logout, updateSecurityStatus } = useAuth();
  const { validateFaydaWithBiometrics } = useFaydaValidation();
  const { initiateSecurityVerification } = useSecurity();

  // 🏗️ Animation Sequences
  useEffect(() => {
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animations.pulse(animation, 1000)
    ]).start();
  }, []);

  // 🏗️ Load Duplicate Analysis
  useEffect(() => {
    loadDuplicateAnalysis();
  }, [params.faydaId]);

  /**
   * 🏗️ Load Comprehensive Duplicate Analysis
   */
  const loadDuplicateAnalysis = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const analysis = await duplicateService.analyzeDuplicate({
        faydaId: params.faydaId,
        userData: {
          phone: params.phone,
          email: params.email,
          name: params.name
        },
        deviceFingerprint: await duplicateService.getDeviceFingerprint(),
        locationData: await duplicateService.getLocationData()
      });

      setDuplicateData(analysis);
      
      // 🚨 Trigger haptic feedback based on severity
      triggerHapticFeedback(analysis.severity);
      
      // 📊 Log security event
      await duplicateService.logSecurityEvent({
        type: 'DUPLICATE_DETECTED',
        severity: analysis.severity,
        faydaId: params.faydaId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      handleDuplicateError(error);
    } finally {
      setIsLoading(false);
    }
  }, [params.faydaId]);

  /**
   * 🏗️ Trigger Haptic Feedback Based on Severity
   */
  const triggerHapticFeedback = (severity) => {
    const hapticMap = {
      [DUPLICATE_SEVERITY.LOW]: Haptics.NotificationFeedbackType.Warning,
      [DUPLICATE_SEVERITY.MEDIUM]: Haptics.NotificationFeedbackType.Error,
      [DUPLICATE_SEVERITY.HIGH]: Haptics.NotificationFeedbackType.Error,
      [DUPLICATE_SEVERITY.CRITICAL]: Haptics.NotificationFeedbackType.Error
    };

    Haptics.notificationAsync(hapticMap[severity] || Haptics.NotificationFeedbackType.Warning);
  };

  /**
   * 🏗️ Handle Duplicate Analysis Errors
   */
  const handleDuplicateError = (error) => {
    console.error('Duplicate analysis error:', error);
    
    // 🚨 Show emergency fallback UI
    Alert.alert(
      'Security Verification Required',
      'We detected an issue with your account verification. Please contact support immediately.',
      [
        {
          text: 'Contact Support',
          onPress: () => router.push('/support/emergency'),
          style: 'destructive'
        },
        {
          text: 'Try Again',
          onPress: loadDuplicateAnalysis
        }
      ]
    );
  };

  /**
   * 🏗️ Start Resolution Process
   */
  const startResolutionProcess = async (action) => {
    try {
      setIsLoading(true);
      
      switch (action) {
        case RESOLUTION_ACTIONS.VERIFY_IDENTITY:
          await handleIdentityVerification();
          break;
          
        case RESOLUTION_ACTIONS.SECURITY_VERIFICATION:
          await handleSecurityVerification();
          break;
          
        case RESOLUTION_ACTIONS.ACCOUNT_RECOVERY:
          await handleAccountRecovery();
          break;
          
        case RESOLUTION_ACTIONS.CONTACT_SUPPORT:
          await handleContactSupport();
          break;
          
        default:
          throw new Error('Invalid resolution action');
      }
      
    } catch (error) {
      console.error('Resolution process error:', error);
      Alert.alert('Resolution Failed', 'Please try another verification method.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 🏗️ Handle Identity Verification Flow
   */
  const handleIdentityVerification = async () => {
    setResolutionStep('IDENTITY_VERIFICATION');
    
    try {
      // 🎯 Biometric + Government ID verification
      const verificationResult = await validateFaydaWithBiometrics({
        faydaId: params.faydaId,
        requireLivePhoto: true,
        requireGovernmentApi: true
      });

      if (verificationResult.success) {
        await handleVerificationSuccess(verificationResult);
      } else {
        throw new Error(verificationResult.error || 'Verification failed');
      }
      
    } catch (error) {
      throw new Error(`Identity verification failed: ${error.message}`);
    }
  };

  /**
   * 🏗️ Handle Security Verification Flow
   */
  const handleSecurityVerification = async () => {
    setResolutionStep('SECURITY_VERIFICATION');
    
    try {
      const securityResult = await initiateSecurityVerification({
        faydaId: params.faydaId,
        verificationType: 'MULTI_FACTOR',
        methods: ['SMS', 'EMAIL', 'BIOMETRIC']
      });

      setSecurityChecks(securityResult.checks);
      
      // 🎯 Monitor security check completion
      const completed = await duplicateService.monitorSecurityChecks(
        securityResult.verificationId
      );

      if (completed) {
        await handleVerificationSuccess(securityResult);
      }
      
    } catch (error) {
      throw new Error(`Security verification failed: ${error.message}`);
    }
  };

  /**
   * 🏗️ Handle Account Recovery Flow
   */
  const handleAccountRecovery = async () => {
    setResolutionStep('ACCOUNT_RECOVERY');
    router.push('/auth/account-recovery');
  };

  /**
   * 🏗️ Handle Contact Support Flow
   */
  const handleContactSupport = async () => {
    setResolutionStep('CONTACT_SUPPORT');
    
    // 🎯 Pre-fill support ticket with duplicate data
    const supportData = {
      faydaId: params.faydaId,
      duplicateAnalysis: duplicateData,
      timestamp: new Date().toISOString(),
      urgency: duplicateData.severity === DUPLICATE_SEVERITY.CRITICAL ? 'HIGH' : 'MEDIUM'
    };

    router.push({
      pathname: '/support/contact',
      params: { initialData: JSON.stringify(supportData) }
    });
  };

  /**
   * 🏗️ Handle Successful Verification
   */
  const handleVerificationSuccess = async (result) => {
    try {
      // 🎯 Update security status
      await updateSecurityStatus({
        faydaId: params.faydaId,
        verificationLevel: 'ENHANCED',
        duplicateResolved: true,
        resolutionTimestamp: new Date().toISOString()
      });

      // 🎯 Log resolution event
      await duplicateService.logSecurityEvent({
        type: 'DUPLICATE_RESOLVED',
        severity: duplicateData.severity,
        faydaId: params.faydaId,
        resolutionMethod: resolutionStep,
        timestamp: new Date().toISOString()
      });

      // 🎯 Show success and redirect
      Alert.alert(
        'Identity Verified Successfully',
        'Your account has been secured and verified. You can now continue with registration.',
        [
          {
            text: 'Continue',
            onPress: () => router.replace('/auth/registration-complete')
          }
        ]
      );

    } catch (error) {
      console.error('Verification success handling error:', error);
      throw error;
    }
  };

  /**
   * 🏗️ Render Severity Badge
   */
  const renderSeverityBadge = () => {
    const severityConfig = {
      [DUPLICATE_SEVERITY.LOW]: {
        color: Colors.warning.500,
        icon: WarningTriangle,
        label: 'Low Risk'
      },
      [DUPLICATE_SEVERITY.MEDIUM]: {
        color: Colors.warning.700,
        icon: AlertOctagon,
        label: 'Medium Risk'
      },
      [DUPLICATE_SEVERITY.HIGH]: {
        color: Colors.error.600,
        icon: SecurityShield,
        label: 'High Risk'
      },
      [DUPLICATE_SEVERITY.CRITICAL]: {
        color: Colors.error.800,
        icon: SecurityShield,
        label: 'Critical Risk'
      }
    };

    const config = severityConfig[duplicateData?.severity] || severityConfig[DUPLICATE_SEVERITY.MEDIUM];
    const IconComponent = config.icon;

    return (
      <View style={[styles.severityBadge, { backgroundColor: config.color }]}>
        <IconComponent size={20} color={Colors.white} />
        <Text style={styles.severityText}>{config.label}</Text>
      </View>
    );
  };

  /**
   * 🏗️ Render Duplicate Details
   */
  const renderDuplicateDetails = () => {
    if (!duplicateData?.matches?.length) return null;

    return (
      <View style={styles.detailsContainer}>
        <Text style={styles.detailsTitle}>Duplicate Detection Details</Text>
        
        {duplicateData.matches.slice(0, 3).map((match, index) => (
          <View key={index} style={styles.matchItem}>
            <View style={styles.matchHeader}>
              <Text style={styles.matchType}>{match.type}</Text>
              <Text style={styles.matchConfidence}>
                {Math.round(match.confidence * 100)}% Match
              </Text>
            </View>
            <Text style={styles.matchDetails}>
              {match.details || 'Similar identity pattern detected'}
            </Text>
            {match.timestamp && (
              <Text style={styles.matchTimestamp}>
                First detected: {new Date(match.timestamp).toLocaleDateString()}
              </Text>
            )}
          </View>
        ))}
      </View>
    );
  };

  /**
   * 🏗️ Render Resolution Options
   */
  const renderResolutionOptions = () => {
    const options = [
      {
        id: RESOLUTION_ACTIONS.VERIFY_IDENTITY,
        title: 'Verify My Identity',
        description: 'Use biometric verification and government ID to prove your identity',
        icon: IdentityVerified,
        recommended: duplicateData?.severity === DUPLICATE_SEVERITY.HIGH,
        disabled: false
      },
      {
        id: RESOLUTION_ACTIONS.SECURITY_VERIFICATION,
        title: 'Security Verification',
        description: 'Complete multi-factor authentication and security questions',
        icon: SecurityShield,
        recommended: duplicateData?.severity === DUPLICATE_SEVERITY.MEDIUM,
        disabled: false
      },
      {
        id: RESOLUTION_ACTIONS.ACCOUNT_RECOVERY,
        title: 'Account Recovery',
        description: 'Recover access to your existing account if you have one',
        icon: SuccessCheck,
        recommended: false,
        disabled: false
      },
      {
        id: RESOLUTION_ACTIONS.CONTACT_SUPPORT,
        title: 'Contact Support',
        description: 'Get help from our security team to resolve this issue',
        icon: AlertOctagon,
        recommended: duplicateData?.severity === DUPLICATE_SEVERITY.CRITICAL,
        disabled: false
      }
    ];

    return (
      <View style={styles.optionsContainer}>
        <Text style={styles.optionsTitle}>Choose Resolution Method</Text>
        
        {options.map((option) => {
          const IconComponent = option.icon;
          
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                option.recommended && styles.recommendedOption,
                option.disabled && styles.disabledOption
              ]}
              onPress={() => !option.disabled && startResolutionProcess(option.id)}
              disabled={option.disabled}
            >
              <View style={styles.optionHeader}>
                <View style={styles.optionIcon}>
                  <IconComponent 
                    size={24} 
                    color={option.disabled ? Colors.neutral.400 : Colors.primary.600} 
                  />
                </View>
                
                <View style={styles.optionText}>
                  <Text style={[
                    styles.optionTitle,
                    option.disabled && styles.disabledText
                  ]}>
                    {option.title}
                  </Text>
                  <Text style={[
                    styles.optionDescription,
                    option.disabled && styles.disabledText
                  ]}>
                    {option.description}
                  </Text>
                </View>
                
                {option.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  /**
   * 🏗️ Render Security Checks
   */
  const renderSecurityChecks = () => {
    if (!securityChecks.length) return null;

    return (
      <View style={styles.securityContainer}>
        <Text style={styles.securityTitle}>Security Verification Steps</Text>
        
        {securityChecks.map((check, index) => (
          <View key={check.id} style={styles.checkItem}>
            <View style={styles.checkIndicator}>
              {check.completed ? (
                React.createElement(SuccessCheck, { size: 20, color: Colors.success.500 })
              ) : (
                <ActivityIndicator size="small" color={Colors.primary.600} />
              )}
            </View>
            <Text style={styles.checkText}>{check.description}</Text>
          </View>
        ))}
      </View>
    );
  };

  /**
   * 🏗️ Render Loading State
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary.600} />
      <Text style={styles.loadingText}>Analyzing security situation...</Text>
      <Text style={styles.loadingSubtext}>
        Checking for duplicate identities and security patterns
      </Text>
    </View>
  );

  /**
   * 🏗️ Render Main Content
   */
  const renderMainContent = () => (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* 🎯 Header Section */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: animation,
            transform: [{
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }]
          }
        ]}
      >
        <View style={styles.iconContainer}>
          <SecurityShield size={64} color={Colors.error.600} />
        </View>
        
        <Text style={styles.title}>Duplicate Identity Detected</Text>
        <Text style={styles.subtitle}>
          We found another account with similar identity information. 
          This is a security measure to protect your account.
        </Text>
        
        {renderSeverityBadge()}
      </Animated.View>

      {/* 🎯 Details Section */}
      {renderDuplicateDetails()}

      {/* 🎯 Security Checks (if in progress) */}
      {resolutionStep === 'SECURITY_VERIFICATION' && renderSecurityChecks()}

      {/* 🎯 Resolution Options */}
      {resolutionStep === 'DETECTION' && renderResolutionOptions()}

      {/* 🎯 Security Notice */}
      <View style={styles.securityNotice}>
        <Text style={styles.noticeTitle}>Security Notice</Text>
        <Text style={styles.noticeText}>
          • Your information is protected with bank-level encryption{'\n'}
          • All verification processes are logged for security{'\n'}
          • We never share your personal data with third parties{'\n'}
          • Government ID verification is fully encrypted
        </Text>
      </View>
    </ScrollView>
  );

  // 🎯 Main Render
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[Colors.background.primary, Colors.background.secondary]}
        style={StyleSheet.absoluteFill}
      />
      
      {isLoading ? renderLoadingState() : renderMainContent()}
    </View>
  );
};

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.heading4,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  loadingSubtext: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.error.50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  title: {
    ...Typography.heading1,
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.bodyLarge,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 24,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Spacing.sm,
    ...Shadows.small,
  },
  severityText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  detailsContainer: {
    backgroundColor: Colors.background.surface,
    borderRadius: Spacing.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  detailsTitle: {
    ...Typography.heading4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  matchItem: {
    backgroundColor: Colors.background.secondary,
    borderRadius: Spacing.sm,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  matchType: {
    ...Typography.caption,
    color: Colors.text.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  matchConfidence: {
    ...Typography.caption,
    color: Colors.error.600,
    fontWeight: '600',
  },
  matchDetails: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
  },
  matchTimestamp: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    fontSize: 12,
  },
  optionsContainer: {
    marginBottom: Spacing.xl,
  },
  optionsTitle: {
    ...Typography.heading4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  optionCard: {
    backgroundColor: Colors.background.surface,
    borderRadius: Spacing.md,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  recommendedOption: {
    borderWidth: 2,
    borderColor: Colors.primary.200,
    backgroundColor: Colors.primary.50,
  },
  disabledOption: {
    opacity: 0.6,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  optionIcon: {
    marginRight: Spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    ...Typography.heading5,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  optionDescription: {
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  disabledText: {
    color: Colors.neutral.400,
  },
  recommendedBadge: {
    backgroundColor: Colors.primary.500,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.xs,
  },
  recommendedText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '600',
    fontSize: 10,
  },
  securityContainer: {
    backgroundColor: Colors.background.surface,
    borderRadius: Spacing.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.small,
  },
  securityTitle: {
    ...Typography.heading4,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  checkIndicator: {
    width: 24,
    marginRight: Spacing.md,
  },
  checkText: {
    ...Typography.body,
    color: Colors.text.primary,
    flex: 1,
  },
  securityNotice: {
    backgroundColor: Colors.info.50,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info.500,
    borderRadius: Spacing.sm,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  noticeTitle: {
    ...Typography.heading5,
    color: Colors.info.700,
    marginBottom: Spacing.sm,
  },
  noticeText: {
    ...Typography.caption,
    color: Colors.info.700,
    lineHeight: 18,
  },
});

export default DuplicateAlert;

// 🏗️ Performance Optimization
export const MemoizedDuplicateAlert = React.memo(DuplicateAlert);

// 🏗️ Component Configuration
DuplicateAlert.displayName = 'DuplicateAlert';
DuplicateAlert.config = {
  analytics: {
    trackEvents: true,
    logSecurityIssues: true
  },
  security: {
    requireBiometrics: true,
    encryptionLevel: 'ENTERPRISE',
    autoLogout: true
  }
};