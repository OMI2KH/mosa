import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle, 
  ActivityIndicator,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  
  const getVariantStyles = () => {
    const variants = {
      primary: {
        backgroundColor: '#2D5016',
        borderColor: '#2D5016',
        textColor: '#FFFFFF'
      },
      secondary: {
        backgroundColor: '#D4A017',
        borderColor: '#D4A017', 
        textColor: '#FFFFFF'
      },
      success: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
        textColor: '#FFFFFF'
      },
      warning: {
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
        textColor: '#FFFFFF'
      },
      danger: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
        textColor: '#FFFFFF'
      },
      ghost: {
        backgroundColor: 'transparent',
        borderColor: '#2D5016',
        textColor: '#2D5016'
      }
    };
    return variants[variant] || variants.primary;
  };

  const getSizeStyles = () => {
    const sizes = {
      small: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        fontSize: 14,
        iconSize: 16
      },
      medium: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        fontSize: 16,
        iconSize: 18
      },
      large: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        fontSize: 18,
        iconSize: 20
      }
    };
    return sizes[size] || sizes.medium;
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: disabled ? '#9CA3AF' : variantStyles.backgroundColor,
          borderColor: disabled ? '#9CA3AF' : variantStyles.borderColor,
          borderWidth: variant === 'ghost' ? 2 : 0,
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          width: fullWidth ? '100%' : 'auto',
          opacity: disabled ? 0.6 : 1,
        },
        style
      ]}
      activeOpacity={0.8}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variantStyles.textColor} 
        />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Ionicons 
              name={icon} 
              size={sizeStyles.iconSize} 
              color={variantStyles.textColor} 
              style={styles.iconLeft}
            />
          )}
          
          <Text 
            style={[
              styles.text,
              {
                color: variantStyles.textColor,
                fontSize: sizeStyles.fontSize,
                fontWeight: size === 'large' ? 'bold' : '600'
              },
              textStyle
            ]}
          >
            {title}
          </Text>

          {icon && iconPosition === 'right' && (
            <Ionicons 
              name={icon} 
              size={sizeStyles.iconSize} 
              color={variantStyles.textColor} 
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

// Specialized button components for common use cases
export function PrimaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="secondary" {...props} />;
}

export function SuccessButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="success" {...props} />;
}

export function WarningButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="warning" {...props} />;
}

export function DangerButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="danger" {...props} />;
}

export function GhostButton(props: Omit<ButtonProps, 'variant'>) {
  return <Button variant="ghost" {...props} />;
}

// Specialized Mosa-themed buttons
export function WealthButton(props: Omit<ButtonProps, 'variant' | 'icon'>) {
  return (
    <Button 
      variant="primary" 
      icon="trending-up"
      iconPosition="right"
      {...props} 
    />
  );
}

export function SkillButton(props: Omit<ButtonProps, 'variant' | 'icon'>) {
  return (
    <Button 
      variant="secondary" 
      icon="build"
      iconPosition="right"
      {...props} 
    />
  );
}

export function LearningButton(props: Omit<ButtonProps, 'variant' | 'icon'>) {
  return (
    <Button 
      variant="success" 
      icon="school"
      iconPosition="right"
      {...props} 
    />
  );
}

export function TribeButton(props: Omit<ButtonProps, 'variant' | 'icon'>) {
  return (
    <Button 
      variant="warning" 
      icon="people"
      iconPosition="right"
      {...props} 
    />
  );
}

export function XPButton(props: Omit<ButtonProps, 'variant' | 'icon'>) {
  return (
    <Button 
      variant="ghost" 
      icon="star"
      iconPosition="right"
      {...props} 
    />
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
    fontWeight: '600',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});