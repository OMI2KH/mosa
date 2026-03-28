// certification/_layout.js

/**
 * 🎯 ENTERPRISE CERTIFICATION LAYOUT
 * Production-ready layout for certification flow
 * Features: Yachi integration, certificate generation, verification system
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Platform, 
  StatusBar,
  BackHandler,
  AppState
} from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useCertification } from '../../contexts/certification-context';
import { useAuth } from '../../contexts/auth-context';
import { CertificationProvider } from '../../contexts/certification-context';
import CertificationHeader from '../../components/certification/certification-header';
import CertificationProgress from '../../components/certification/certification-progress';
import NetworkStatus from '../../components/shared/network-status';
import LoadingOverlay from '../../components/shared/loading-overlay';
import ErrorBoundary from '../../components/shared/error-boundary';
import { Logger } from '../../utils/logger';

const logger = new Logger('CertificationLayout');

// 🎯 Certification flow steps
const CERTIFICATION_STEPS = {
  ASSESSMENT: 'assessment',
  REVIEW: 'review',
  GENERATION: 'generation',
  YACHI_INTEGRATION: 'yachi_integration',
  COMPLETION: 'completion'
};

function CertificationLayout() {
  return (
    <ErrorBoundary
      fallback={<CertificationErrorFallback />}
      onError={(error, errorInfo) => {
        logger.error('Certification layout error', error, errorInfo);
      }}
    >
      <CertificationProvider>
        <CertificationLayoutContent />
      </CertificationProvider>
    </ErrorBoundary>
  );
}

function CertificationLayoutContent() {
  const router = useRouter();
  const segments = useSegments();
  const { user, isAuthenticated } = useAuth();
  const {
    currentStep,
    certificationData,
    isLoading,
    error,
    isGeneratingCertificate,
    isYachiIntegrating,
    initializeCertification,
    validateEligibility,
    clearError,
    resetCertification
  } = useCertification();

  const [appState, setAppState] = useState(AppState.currentState);
  const [isOnline, setIsOnline] = useState(true);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // 🛡️ Authentication guard
  useEffect(() => {
    if (!isAuthenticated) {
      logger.warn('Unauthorized access to certification flow');
      router.replace('/(auth)/login');
      return;
    }
  }, [isAuthenticated, router]);

  // 🎯 Initialize certification flow
  useEffect(() => {
    const initializeFlow = async () => {
      try {
        logger.info('Initializing certification flow', { userId: user?.id });
        
        // Validate user eligibility
        const eligibility = await validateEligibility();
        
        if (!eligibility.isEligible) {
          logger.warn('User not eligible for certification', { 
            userId: user?.id, 
            reasons: eligibility.reasons 
          });
          router.replace('/(training)/completion');
          return;
        }

        // Initialize certification data
        await initializeCertification();
        logger.info('Certification flow initialized successfully');

      } catch (error) {
        logger.error('Failed to initialize certification flow', error);
        // Handle initialization error
      }
    };

    if (isAuthenticated && user?.id) {
      initializeFlow();
    }
  }, [isAuthenticated, user?.id]);

  // 🔄 Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
    };
  }, []);

  // ⚠️ Prevent back navigation during critical operations
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => backHandler.remove();
  }, [currentStep, isGeneratingCertificate, isYachiIntegrating]);

  // 🎯 Handle app state changes
  const handleAppStateChange = useCallback((nextAppState) => {
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground - refresh certification data
      logger.debug('App resumed, refreshing certification data');
      refreshCertificationData();
    }
    
    setAppState(nextAppState);
  }, [appState]);

  // ⬅️ Handle back button press
  const handleBackPress = useCallback(() => {
    // Prevent back during critical operations
    if (isGeneratingCertificate || isYachiIntegrating) {
      logger.warn('Back press blocked during critical operation');
      return true;
    }

    // Custom back navigation based on current step
    switch (currentStep) {
      case CERTIFICATION_STEPS.ASSESSMENT:
        // Confirm exit from certification flow
        showExitConfirmation();
        return true;
      
      case CERTIFICATION_STEPS.REVIEW:
        navigateToStep(CERTIFICATION_STEPS.ASSESSMENT);
        return true;
      
      case CERTIFICATION_STEPS.GENERATION:
        // Don't allow back during generation
        return true;
      
      case CERTIFICATION_STEPS.YACHI_INTEGRATION:
        navigateToStep(CERTIFICATION_STEPS.GENERATION);
        return true;
      
      case CERTIFICATION_STEPS.COMPLETION:
        // Navigate to dashboard from completion
        router.replace('/(dashboard)');
        return true;
      
      default:
        return false;
    }
  }, [currentStep, isGeneratingCertificate, isYachiIntegrating, router]);

  // 🎯 Navigate to specific step
  const navigateToStep = useCallback((step) => {
    logger.debug('Navigating to certification step', { from: currentStep, to: step });
    
    const routes = {
      [CERTIFICATION_STEPS.ASSESSMENT]: '/(certification)/assessment',
      [CERTIFICATION_STEPS.REVIEW]: '/(certification)/review',
      [CERTIFICATION_STEPS.GENERATION]: '/(certification)/generation',
      [CERTIFICATION_STEPS.YACHI_INTEGRATION]: '/(certification)/yachi-integration',
      [CERTIFICATION_STEPS.COMPLETION]: '/(certification)/completion'
    };

    if (routes[step]) {
      router.replace(routes[step]);
    }
  }, [currentStep, router]);

  // 🔄 Refresh certification data
  const refreshCertificationData = useCallback(async () => {
    try {
      logger.debug('Refreshing certification data');
      await initializeCertification();
    } catch (error) {
      logger.error('Failed to refresh certification data', error);
    }
  }, [initializeCertification]);

  // 🚪 Show exit confirmation
  const showExitConfirmation = useCallback(() => {
    // Implementation would use your preferred modal system
    logger.info('Show exit confirmation dialog');
    // For now, just navigate back
    router.back();
  }, [router]);

  // 🎯 Handle network status changes
  const handleNetworkChange = useCallback((online) => {
    setIsOnline(online);
    
    if (online) {
      // Re-sync when coming back online
      refreshCertificationData();
    }
  }, [refreshCertificationData]);

  // ❌ Handle errors
  const handleErrorDismiss = useCallback(() => {
    clearError();
  }, [clearError]);

  // 🔄 Get current progress
  const getCurrentProgress = useCallback(() => {
    const steps = Object.values(CERTIFICATION_STEPS);
    const currentIndex = steps.indexOf(currentStep);
    return currentIndex >= 0 ? (currentIndex / (steps.length - 1)) * 100 : 0;
  }, [currentStep]);

  // 🎨 Get header title based on current step
  const getHeaderTitle = useCallback(() => {
    const titles = {
      [CERTIFICATION_STEPS.ASSESSMENT]: 'Final Assessment',
      [CERTIFICATION_STEPS.REVIEW]: 'Review Results',
      [CERTIFICATION_STEPS.GENERATION]: 'Generating Certificate',
      [CERTIFICATION_STEPS.YACHI_INTEGRATION]: 'Yachi Integration',
      [CERTIFICATION_STEPS.COMPLETION]: 'Certification Complete'
    };
    
    return titles[currentStep] || 'Certification';
  }, [currentStep]);

  // 🛡️ Render loading state
  if (isLoading && !certificationData) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <LoadingOverlay 
          message="Initializing Certification..."
          showProgress={true}
        />
      </View>
    );
  }

  // 🎯 Main layout render
  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#FFFFFF" 
        translucent={false}
      />

      {/* Network Status Indicator */}
      <NetworkStatus 
        onNetworkChange={handleNetworkChange}
        showAlert={true}
      />

      {/* Certification Header */}
      <CertificationHeader
        title={getHeaderTitle()}
        currentStep={currentStep}
        onBackPress={handleBackPress}
        showBackButton={currentStep !== CERTIFICATION_STEPS.ASSESSMENT && 
                       currentStep !== CERTIFICATION_STEPS.COMPLETION}
      />

      {/* Progress Indicator */}
      {currentStep !== CERTIFICATION_STEPS.COMPLETION && (
        <CertificationProgress
          progress={getCurrentProgress()}
          currentStep={currentStep}
          steps={Object.values(CERTIFICATION_STEPS)}
          style={styles.progress}
        />
      )}

      {/* Main Content */}
      <View style={styles.content}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            gestureEnabled: !isGeneratingCertificate && !isYachiIntegrating,
            contentStyle: styles.stackContent
          }}
        >
          <Stack.Screen
            name="assessment"
            options={{
              gestureEnabled: true,
              animation: 'slide_from_right'
            }}
          />
          <Stack.Screen
            name="review"
            options={{
              gestureEnabled: true,
              animation: 'slide_from_right'
            }}
          />
          <Stack.Screen
            name="generation"
            options={{
              gestureEnabled: false, // Prevent swipe back during generation
              animation: 'fade'
            }}
          />
          <Stack.Screen
            name="yachi-integration"
            options={{
              gestureEnabled: false, // Prevent swipe back during integration
              animation: 'fade'
            }}
          />
          <Stack.Screen
            name="completion"
            options={{
              gestureEnabled: false, // Prevent swipe back from completion
              animation: 'fade'
            }}
          />
        </Stack>
      </View>

      {/* Global Loading Overlay */}
      {(isGeneratingCertificate || isYachiIntegrating) && (
        <LoadingOverlay
          message={
            isGeneratingCertificate 
              ? 'Generating your certificate...' 
              : 'Connecting to Yachi platform...'
          }
          showProgress={true}
          indeterminate={true}
        />
      )}

      {/* Global Error Modal */}
      {error && (
        <ErrorModal
          error={error}
          onDismiss={handleErrorDismiss}
          onRetry={refreshCertificationData}
        />
      )}
    </View>
  );
}

// 🎯 Error Fallback Component
function CertificationErrorFallback() {
  const router = useRouter();
  
  const handleReset = useCallback(() => {
    // Reset and navigate to dashboard
    router.replace('/(dashboard)');
  }, [router]);

  const handleRetry = useCallback(() => {
    // Reload the certification flow
    router.replace('/(certification)/assessment');
  }, [router]);

  return (
    <View style={styles.errorContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />
      
      <View style={styles.errorContent}>
        <Text style={styles.errorTitle}>Certification System Error</Text>
        <Text style={styles.errorMessage}>
          We encountered an issue with the certification system. 
          This might be due to network connectivity or system maintenance.
        </Text>
        
        <View style={styles.errorActions}>
          <TouchableOpacity
            style={[styles.errorButton, styles.primaryButton]}
            onPress={handleRetry}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.errorButton, styles.secondaryButton]}
            onPress={handleReset}
          >
            <Text style={styles.secondaryButtonText}>Return to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// 🎯 Error Modal Component
function ErrorModal({ error, onDismiss, onRetry }) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={!!error}
      onRequestClose={onDismiss}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>System Error</Text>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={styles.errorText}>
              {error?.message || 'An unexpected error occurred'}
            </Text>
            
            {error?.code && (
              <Text style={styles.errorCode}>
                Error Code: {error.code}
              </Text>
            )}
          </View>
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.secondaryButton]}
              onPress={onDismiss}
            >
              <Text style={styles.secondaryButtonText}>Dismiss</Text>
            </TouchableOpacity>
            
            {onRetry && (
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={onRetry}
              >
                <Text style={styles.primaryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  stackContent: {
    backgroundColor: '#F8FAFC',
  },
  progress: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    padding: 24,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  errorActions: {
    width: '100%',
    gap: 12,
  },
  errorButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  errorCode: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Performance optimization
export const config = {
  initialRouteName: 'assessment',
  screens: {
    assessment: {
      path: 'assessment',
    },
    review: {
      path: 'review',
    },
    generation: {
      path: 'generation',
    },
    'yachi-integration': {
      path: 'yachi-integration',
    },
    completion: {
      path: 'completion',
    },
  },
};

// Memoize the layout to prevent unnecessary re-renders
export default React.memo(CertificationLayout);