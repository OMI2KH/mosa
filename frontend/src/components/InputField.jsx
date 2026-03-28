import React from 'react';
import { 
  TextInput, 
  View, 
  Text, 
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputFieldProps {
  // Basic props
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  
  // Input types
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  
  // Styling
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'filled' | 'outlined';
  className?: string;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  
  // Features
  icon?: string;
  iconPosition?: 'left' | 'right';
  onIconPress?: () => void;
  disabled?: boolean;
  required?: boolean;
  
  // Validation
  error?: string;
  success?: string;
  warning?: string;
  showCharacterCount?: boolean;
  maxLength?: number;
  
  // Accessibility
  accessibilityLabel?: string;
  testID?: string;
}

export default function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  
  // Input types
  multiline = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  
  // Styling
  size = 'medium',
  variant = 'outlined',
  className = '',
  style,
  inputStyle,
  
  // Features
  icon,
  iconPosition = 'left',
  onIconPress,
  disabled = false,
  required = false,
  
  // Validation
  error,
  success,
  warning,
  showCharacterCount = false,
  maxLength,
  
  // Accessibility
  accessibilityLabel,
  testID,
}: InputFieldProps) {
  
  const getSizeStyles = () => {
    const sizes = {
      small: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        fontSize: 14,
        minHeight: 40,
      },
      medium: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        minHeight: 48,
      },
      large: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        fontSize: 18,
        minHeight: 56,
      }
    };
    return sizes[size] || sizes.medium;
  };

  const getVariantStyles = () => {
    const baseStyle = {
      borderWidth: 1,
      borderRadius: 12,
      backgroundColor: '#FFFFFF',
    };

    const variants = {
      default: {
        ...baseStyle,
        borderColor: '#E5E7EB',
        backgroundColor: '#FFFFFF',
      },
      filled: {
        ...baseStyle,
        borderColor: 'transparent',
        backgroundColor: '#F9FAFB',
      },
      outlined: {
        ...baseStyle,
        borderColor: '#D1D5DB',
        backgroundColor: '#FFFFFF',
      }
    };
    return variants[variant] || variants.outlined;
  };

  const getStatusStyles = () => {
    if (error) {
      return {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
        iconColor: '#EF4444',
        iconName: 'alert-circle'
      };
    }
    if (success) {
      return {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4',
        iconColor: '#10B981',
        iconName: 'checkmark-circle'
      };
    }
    if (warning) {
      return {
        borderColor: '#F59E0B',
        backgroundColor: '#FFFBEB',
        iconColor: '#F59E0B',
        iconName: 'warning'
      };
    }
    return {
      borderColor: '#D1D5DB',
      backgroundColor: '#FFFFFF',
      iconColor: '#6B7280',
      iconName: icon
    };
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();
  const statusStyles = getStatusStyles();
  const characterCount = value?.length || 0;

  const renderIcon = () => {
    if (!statusStyles.iconName) return null;

    const iconElement = (
      <Ionicons 
        name={statusStyles.iconName as any} 
        size={20} 
        color={statusStyles.iconColor} 
      />
    );

    if (onIconPress) {
      return (
        <TouchableOpacity onPress={onIconPress} style={styles.iconButton}>
          {iconElement}
        </TouchableOpacity>
      );
    }

    return <View style={styles.icon}>{iconElement}</View>;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Label Section */}
      {(label || showCharacterCount) && (
        <View style={styles.labelContainer}>
          {label && (
            <Text style={[
              styles.label,
              error && styles.labelError,
              success && styles.labelSuccess,
              warning && styles.labelWarning
            ]}>
              {label}
              {required && <Text style={styles.required}> *</Text>}
            </Text>
          )}
          
          {showCharacterCount && maxLength && (
            <Text style={[
              styles.characterCount,
              characterCount > maxLength && styles.characterCountError
            ]}>
              {characterCount}/{maxLength}
            </Text>
          )}
        </View>
      )}

      {/* Input Container */}
      <View style={[
        styles.inputContainer,
        variantStyles,
        {
          borderColor: statusStyles.borderColor,
          backgroundColor: disabled ? '#F3F4F6' : statusStyles.backgroundColor,
          minHeight: multiline ? 100 : sizeStyles.minHeight,
        },
        error && styles.containerError,
        success && styles.containerSuccess,
        warning && styles.containerWarning,
        disabled && styles.containerDisabled,
      ]}>
        {/* Left Icon */}
        {iconPosition === 'left' && renderIcon()}

        {/* Text Input */}
        <TextInput
          style={[
            styles.input,
            {
              paddingVertical: sizeStyles.paddingVertical,
              paddingHorizontal: sizeStyles.paddingHorizontal,
              fontSize: sizeStyles.fontSize,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            inputStyle,
            disabled && styles.inputDisabled,
          ]}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={!disabled}
          maxLength={maxLength}
          numberOfLines={multiline ? 4 : 1}
          accessibilityLabel={accessibilityLabel || label}
          testID={testID}
        />

        {/* Right Icon */}
        {iconPosition === 'right' && renderIcon()}

        {/* Secure Text Toggle */}
        {secureTextEntry && value && (
          <TouchableOpacity 
            style={styles.secureToggle}
            onPress={onIconPress}
          >
            <Ionicons 
              name={secureTextEntry ? 'eye-off' : 'eye'} 
              size={20} 
              color="#6B7280" 
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Status Messages */}
      {error && (
        <View style={styles.statusContainer}>
          <Ionicons name="alert-circle" size={16} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {success && !error && (
        <View style={styles.statusContainer}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.successText}>{success}</Text>
        </View>
      )}
      
      {warning && !error && !success && (
        <View style={styles.statusContainer}>
          <Ionicons name="warning" size={16} color="#F59E0B" />
          <Text style={styles.warningText}>{warning}</Text>
        </View>
      )}
    </View>
  );
}

// Specialized Mosa-themed input components
export function WealthInput(props: Omit<InputFieldProps, 'icon'>) {
  return (
    <InputField 
      icon="cash"
      iconPosition="left"
      variant="outlined"
      {...props}
    />
  );
}

export function SkillInput(props: Omit<InputFieldProps, 'icon'>) {
  return (
    <InputField 
      icon="build"
      iconPosition="left"
      variant="outlined"
      {...props}
    />
  );
}

export function EmailInput(props: Omit<InputFieldProps, 'keyboardType' | 'icon' | 'autoCapitalize'>) {
  return (
    <InputField 
      keyboardType="email-address"
      autoCapitalize="none"
      icon="mail"
      iconPosition="left"
      {...props}
    />
  );
}

export function PasswordInput(props: Omit<InputFieldProps, 'secureTextEntry' | 'icon' | 'autoCapitalize'>) {
  return (
    <InputField 
      secureTextEntry={true}
      autoCapitalize="none"
      icon="lock-closed"
      iconPosition="left"
      {...props}
    />
  );
}

export function AmountInput(props: Omit<InputFieldProps, 'keyboardType' | 'icon'>) {
  return (
    <InputField 
      keyboardType="numeric"
      icon="card"
      iconPosition="left"
      placeholder="0.00"
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D5016',
  },
  labelError: {
    color: '#EF4444',
  },
  labelSuccess: {
    color: '#10B981',
  },
  labelWarning: {
    color: '#F59E0B',
  },
  required: {
    color: '#EF4444',
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  characterCountError: {
    color: '#EF4444',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  containerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  containerSuccess: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  containerWarning: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  containerDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  icon: {
    padding: 12,
    justifyContent: 'center',
  },
  iconButton: {
    padding: 12,
    justifyContent: 'center',
  },
  secureToggle: {
    padding: 12,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    color: '#2D5016',
    fontWeight: '500',
  },
  inputDisabled: {
    color: '#9CA3AF',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginLeft: 4,
    fontWeight: '500',
  },
  successText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '500',
  },
  warningText: {
    fontSize: 12,
    color: '#F59E0B',
    marginLeft: 4,
    fontWeight: '500',
  },
});
