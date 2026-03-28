// components/auth/fayda-input.jsx

/**
 * 🎯 ENTERPRISE FAYDA ID INPUT COMPONENT
 * Production-ready government ID verification input
 * Features: Real-time validation, duplicate detection, biometric support
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
  Keyboard,
  Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useFaydaValidation } from '../../hooks/use-fayda-validation';
import { styles } from './fayda-input.styles';

const FaydaInput = React.memo(({
  onValidationComplete,
  onDuplicateDetected,
  onValidationError,
  initialValue = '',
  autoFocus = true,
  required = true,
  disabled = false,
  testID = 'fayda-input',
  containerStyle,
  inputStyle,
  label = 'Fayda ID',
  placeholder = 'Enter your government ID',
  maxLength = 30,
  ...props
}) => {
  // 🎯 STATE MANAGEMENT
  const [faydaId, setFaydaId] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  
  // 🎯 ANIMATIONS
  const labelPosition = useRef(new Animated.Value(initialValue ? 1 : 0)).current;
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  
  // 🎯 CUSTOM HOOKS
  const {
    validateFaydaId,
    checkDuplicate,
    isValidationInProgress,
    validationResult,
    clearValidation,
    resetState
  } = useFaydaValidation();

  // 🎯 REFS
  const inputRef = useRef(null);
  const validationTimeoutRef = useRef(null);
  const debounceRef = useRef(null);

  /**
   * 🎯 HANDLE FAYDA ID CHANGE WITH DEBOUNCE
   */
  const handleFaydaIdChange = useCallback(async (text) => {
    // Clean input - remove spaces and special characters
    const cleanedText = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    setFaydaId(cleanedText);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Reset validation state for new input
    if (validationResult) {
      clearValidation();
    }

    // Animate label
    animateLabel(cleanedText.length > 0);

    // Debounced validation for better UX and performance
    debounceRef.current = setTimeout(async () => {
      if (cleanedText.length >= 10) { // Minimum length for validation
        await performValidation(cleanedText);
      } else if (cleanedText.length > 0) {
        setShowValidation(true);
      }
    }, 500);
  }, [validationResult]);

  /**
   * 🎯 PERFORM COMPREHENSIVE VALIDATION
   */
  const performValidation = async (id) => {
    try {
      setShowValidation(true);
      
      // Start pulse animation during validation
      startPulseAnimation();

      // Step 1: Basic format validation
      const formatValid = validateBasicFormat(id);
      if (!formatValid) {
        handleValidationError('INVALID_FORMAT', 'Please enter a valid Fayda ID format');
        return;
      }

      // Step 2: Advanced validation with government API
      const validation = await validateFaydaId(id);
      
      if (validation.isValid) {
        // Step 3: Duplicate detection check
        const duplicateCheck = await checkDuplicate(id);
        
        if (duplicateCheck.isDuplicate) {
          handleDuplicateDetected(duplicateCheck);
        } else {
          handleValidationSuccess(validation);
        }
      } else {
        handleValidationError(validation.errorCode, validation.message);
      }
    } catch (error) {
      handleValidationError('VALIDATION_FAILED', 'Validation service unavailable');
    } finally {
      stopPulseAnimation();
    }
  };

  /**
   * 🎯 VALIDATE BASIC FAYDA ID FORMAT
   */
  const validateBasicFormat = (id) => {
    // Ethiopian government ID format validation
    const faydaRegex = /^[A-Z0-9]{10,30}$/;
    
    // Additional checks based on known Fayda ID patterns
    const hasValidStructure = id.length >= 10 && id.length <= 30;
    const hasValidCharacters = faydaRegex.test(id);
    const notSequential = !/(.)\1{4,}/.test(id); // No 5+ repeating characters
    const notConsecutive = !/(0123|1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321|3210)/.test(id);
    
    return hasValidStructure && hasValidCharacters && notSequential && notConsecutive;
  };

  /**
   * 🎯 HANDLE VALIDATION SUCCESS
   */
  const handleValidationSuccess = (validation) => {
    // Trigger success animation
    triggerSuccessAnimation();
    
    // Notify parent component
    if (onValidationComplete) {
      onValidationComplete({
        faydaId,
        isValid: true,
        metadata: validation.metadata,
        timestamp: new Date().toISOString()
      });
    }

    // Dismiss keyboard on success
    if (Platform.OS !== 'web') {
      Keyboard.dismiss();
    }
  };

  /**
   * 🎯 HANDLE DUPLICATE DETECTION
   */
  const handleDuplicateDetected = (duplicateCheck) => {
    // Trigger warning animation
    triggerWarningAnimation();
    
    // Notify parent component
    if (onDuplicateDetected) {
      onDuplicateDetected({
        faydaId,
        existingAccount: duplicateCheck.existingAccount,
        suggestion: duplicateCheck.suggestion,
        recoveryOptions: duplicateCheck.recoveryOptions
      });
    }

    // Show duplicate alert
    Alert.alert(
      'Account Already Exists',
      `This Fayda ID is already registered. ${duplicateCheck.suggestion}`,
      [
        {
          text: 'Recover Account',
          onPress: () => handleAccountRecovery(duplicateCheck.existingAccount)
        },
        {
          text: 'Use Different ID',
          style: 'cancel',
          onPress: resetInput
        }
      ]
    );
  };

  /**
   * 🎯 HANDLE VALIDATION ERROR
   */
  const handleValidationError = (errorCode, message) => {
    // Trigger error animation
    triggerErrorAnimation();
    
    // Notify parent component
    if (onValidationError) {
      onValidationError({
        faydaId,
        errorCode,
        message,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * 🎯 ANIMATION CONTROLS
   */
  const animateLabel = (hasValue) => {
    Animated.timing(labelPosition, {
      toValue: hasValue ? 1 : 0,
      duration: 200,
      useNativeDriver: true
    }).start();
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnimation.stopAnimation();
    Animated.timing(pulseAnimation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true
    }).start();
  };

  const triggerSuccessAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnimation, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  };

  const triggerErrorAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true
      })
    ]).start();
  };

  const triggerWarningAnimation = () => {
    Animated.sequence([
      Animated.timing(pulseAnimation, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(pulseAnimation, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
  };

  /**
   * 🎯 HANDLE ACCOUNT RECOVERY
   */
  const handleAccountRecovery = (existingAccount) => {
    // Navigate to account recovery flow
    if (onDuplicateDetected) {
      onDuplicateDetected({
        faydaId,
        existingAccount,
        action: 'RECOVERY_INITIATED'
      });
    }
  };

  /**
   * 🎯 RESET INPUT FIELD
   */
  const resetInput = () => {
    setFaydaId('');
    setShowValidation(false);
    clearValidation();
    resetState();
    animateLabel(false);
    
    // Refocus input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  /**
   * 🎯 HANDLE FOCUS STATES
   */
  const handleFocus = () => {
    setIsFocused(true);
    setIsTouched(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    
    // Perform validation on blur if minimum length met
    if (faydaId.length >= 10) {
      performValidation(faydaId);
    }
  };

  /**
   * 🎯 GET VALIDATION STATUS STYLES
   */
  const getValidationStyles = () => {
    if (!showValidation || isValidationInProgress) {
      return styles.inputNeutral;
    }

    switch (validationResult?.status) {
      case 'VALID':
        return styles.inputValid;
      case 'INVALID':
        return styles.inputInvalid;
      case 'DUPLICATE':
        return styles.inputWarning;
      default:
        return styles.inputNeutral;
    }
  };

  const getValidationIcon = () => {
    if (isValidationInProgress) {
      return <ActivityIndicator size="small" color="#666" />;
    }

    if (!showValidation) return null;

    switch (validationResult?.status) {
      case 'VALID':
        return <Ionicons name="checkmark-circle" size={20} color="#10B981" />;
      case 'INVALID':
        return <Ionicons name="close-circle" size={20} color="#EF4444" />;
      case 'DUPLICATE':
        return <Ionicons name="warning" size={20} color="#F59E0B" />;
      default:
        return null;
    }
  };

  const getValidationMessage = () => {
    if (isValidationInProgress) {
      return 'Verifying Fayda ID with government database...';
    }

    if (!showValidation) return null;

    return validationResult?.message || null;
  };

  /**
   * 🎯 CLEANUP ON UNMOUNT
   */
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  /**
   * 🎯 RENDER COMPONENT
   */
  return (
    <View style={[styles.container, containerStyle]} testID={testID}>
      {/* 🎯 ANIMATED LABEL */}
      <Animated.Text
        style={[
          styles.label,
          {
            transform: [
              {
                translateY: labelPosition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              },
              {
                scale: labelPosition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.8]
                })
              }
            ]
          }
        ]}
        numberOfLines={1}
      >
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Animated.Text>

      {/* 🎯 MAIN INPUT CONTAINER */}
      <Animated.View
        style={[
          styles.inputContainer,
          getValidationStyles(),
          isFocused && styles.inputFocused,
          disabled && styles.inputDisabled,
          {
            transform: [
              { translateX: shakeAnimation },
              { scale: pulseAnimation }
            ]
          }
        ]}
      >
        {/* 🎯 BLUR BACKGROUND FOR iOS */}
        {Platform.OS === 'ios' && (
          <BlurView intensity={isFocused ? 20 : 8} style={styles.blurView} />
        )}

        {/* 🎯 FAYDA ID INPUT */}
        <TextInput
          ref={inputRef}
          value={faydaId}
          onChangeText={handleFaydaIdChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isFocused ? '' : placeholder}
          placeholderTextColor="#9CA3AF"
          style={[styles.input, inputStyle]}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          maxLength={maxLength}
          editable={!disabled}
          selectTextOnFocus={!disabled}
          keyboardType="default"
          returnKeyType="done"
          blurOnSubmit={true}
          importantForAutofill="no"
          textContentType="none" // Prevent iOS autofill
          testID={`${testID}-field`}
          {...props}
        />

        {/* 🎯 VALIDATION STATUS ICON */}
        <View style={styles.validationIcon}>
          {getValidationIcon()}
        </View>

        {/* 🎯 CLEAR BUTTON */}
        {faydaId.length > 0 && !disabled && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={resetInput}
            testID={`${testID}-clear`}
          >
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* 🎯 VALIDATION MESSAGE */}
      {getValidationMessage() && (
        <Text
          style={[
            styles.validationMessage,
            validationResult?.status === 'VALID' && styles.validationMessageValid,
            validationResult?.status === 'INVALID' && styles.validationMessageInvalid,
            validationResult?.status === 'DUPLICATE' && styles.validationMessageWarning
          ]}
          testID={`${testID}-message`}
        >
          {getValidationMessage()}
        </Text>
      )}

      {/* 🎯 SECURITY FOOTER */}
      <View style={styles.securityFooter}>
        <Ionicons name="shield-checkmark" size={12} color="#6B7280" />
        <Text style={styles.securityText}>
          Securely verified with Ethiopian government database
        </Text>
      </View>
    </View>
  );
});

// 🎯 DISPLAY NAME FOR DEBUGGING
FaydaInput.displayName = 'FaydaInput';

export { FaydaInput };