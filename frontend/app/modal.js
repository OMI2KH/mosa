/**
 * 🏢 MOSA FORGE - Enterprise Modal System
 * 🎯 Reusable Modal Components & State Management
 * 📱 Responsive Design & Accessibility
 * 🔄 Animation & Transition Management
 * 🚀 Microservice-Ready Enterprise Architecture
 * 
 * @module ModalSystem
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  View,
  Modal as RNModal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Keyboard,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 🏗️ Enterprise Dependencies
import EnterpriseLogger from '../../utils/enterprise-logger';
import PerformanceTracker from '../../utils/performance-tracker';

// 🎯 Design System
import { Colors, Typography, Spacing, Elevation, Animations } from '../../constants/design-system';
import { Icon } from '../components/shared/Icon';
import { Text } from '../components/shared/Text';
import { Button } from '../components/shared/Button';

/**
 * 🎯 MODAL CONTEXT - Global Modal State Management
 */
const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modalStack, setModalStack] = useState([]);
  const logger = new EnterpriseLogger({ service: 'modal-system', module: 'frontend' });
  const performanceTracker = useRef(new PerformanceTracker('modal-system'));

  /**
   * 📱 SHOW MODAL - Enterprise Grade
   */
  const showModal = (modalConfig) => {
    const modalId = `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    try {
      // 🎯 Validate Modal Configuration
      const validatedConfig = validateModalConfig(modalConfig);
      
      // 📊 Performance Tracking
      performanceTracker.current.startTracking('modal_show');

      // 🔄 Add to Modal Stack
      setModalStack(prevStack => {
        const newStack = [...prevStack];
        newStack.push({
          id: modalId,
          ...validatedConfig,
          createdAt: new Date().toISOString(),
          metadata: {
            stackPosition: newStack.length + 1,
            traceId: modalConfig.traceId
          }
        });

        logger.business('Modal opened', {
          modalId,
          type: validatedConfig.type,
          stackPosition: newStack.length,
          traceId: modalConfig.traceId
        });

        return newStack;
      });

      // 📱 Accessibility Announcement
      if (validatedConfig.accessibilityLabel) {
        announceForAccessibility(`${validatedConfig.accessibilityLabel} modal opened`);
      }

      // 🎯 Performance Metrics
      const loadTime = performance.now() - startTime;
      performanceTracker.current.recordMetric('modal_load_time', loadTime);

      return modalId;

    } catch (error) {
      logger.error('Modal opening failed', {
        modalId,
        error: error.message,
        config: modalConfig
      });
      throw error;
    }
  };

  /**
   * ❌ HIDE MODAL
   */
  const hideModal = (modalId) => {
    const startTime = performance.now();

    try {
      setModalStack(prevStack => {
        const modalToClose = prevStack.find(modal => modal.id === modalId);
        if (!modalToClose) return prevStack;

        // 🔄 Remove from stack with animation
        const newStack = prevStack.filter(modal => modal.id !== modalId);

        logger.business('Modal closed', {
          modalId,
          type: modalToClose.type,
          duration: Date.now() - new Date(modalToClose.createdAt).getTime()
        });

        return newStack;
      });

      // 🎯 Performance Metrics
      const closeTime = performance.now() - startTime;
      performanceTracker.current.recordMetric('modal_close_time', closeTime);

    } catch (error) {
      logger.error('Modal closing failed', {
        modalId,
        error: error.message
      });
    }
  };

  /**
   * 📊 HIDE ALL MODALS
   */
  const hideAllModals = () => {
    if (modalStack.length === 0) return;

    logger.business('All modals closed', {
      modalCount: modalStack.length,
      modalTypes: modalStack.map(m => m.type)
    });

    setModalStack([]);
  };

  /**
   * 🔄 UPDATE MODAL
   */
  const updateModal = (modalId, updates) => {
    setModalStack(prevStack => 
      prevStack.map(modal => 
        modal.id === modalId ? { ...modal, ...updates } : modal
      )
    );
  };

  /**
   * 🎯 GET CURRENT MODAL
   */
  const getCurrentModal = () => {
    return modalStack.length > 0 ? modalStack[modalStack.length - 1] : null;
  };

  /**
   * 📊 GET MODAL STACK INFO
   */
  const getModalStackInfo = () => {
    return {
      count: modalStack.length,
      modals: modalStack.map(m => ({
        id: m.id,
        type: m.type,
        createdAt: m.createdAt
      })),
      currentModal: getCurrentModal()
    };
  };

  return (
    <ModalContext.Provider
      value={{
        showModal,
        hideModal,
        hideAllModals,
        updateModal,
        getCurrentModal,
        getModalStackInfo,
        modalStack
      }}
    >
      {children}
      
      {/* 🔄 Modal Stack Renderer */}
      {modalStack.map((modal, index) => (
        <ModalRenderer
          key={modal.id}
          modal={modal}
          isTop={index === modalStack.length - 1}
          zIndex={1000 + index}
          onClose={() => hideModal(modal.id)}
        />
      ))}
    </ModalContext.Provider>
  );
};

/**
 * 🎯 USE MODAL HOOK - React Hook for Modal Management
 */
export const useModal = () => {
  const context = useContext(ModalContext);
  
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }

  return context;
};

/**
 * 📱 MODAL RENDERER - Enterprise Modal Component
 */
const ModalRenderer = ({ modal, isTop, zIndex, onClose }) => {
  const {
    type = 'centered',
    content,
    title,
    showCloseButton = true,
    closeOnBackdropPress = true,
    closeOnEscape = true,
    backdropOpacity = 0.5,
    backdropBlur = Platform.OS === 'ios',
    animationType = 'fade',
    animationDuration = 300,
    onCloseComplete,
    onOpenComplete,
    customStyles = {},
    preventKeyboardDismiss = false,
    statusBarStyle = 'dark-content',
    safeAreaEnabled = true
  } = modal;

  const [visible, setVisible] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(type === 'bottom' ? 1 : 0)).current;
  const insets = useSafeAreaInsets();
  const logger = useRef(new EnterpriseLogger({ service: 'modal-renderer', module: 'frontend' }));

  useEffect(() => {
    // 🎯 Open Modal with Animation
    setVisible(true);
    
    const openAnimation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: animationDuration,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: animationDuration,
        useNativeDriver: true
      })
    ]);

    openAnimation.start(() => {
      if (onOpenComplete) onOpenComplete();
      logger.current.debug('Modal animation completed', { modalId: modal.id });
    });

    // ⌨️ Keyboard Listener
    const keyboardDidShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      handleKeyboardShow
    );
    const keyboardDidHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      handleKeyboardHide
    );

    // 🎯 Escape Key Listener (Web)
    if (closeOnEscape && Platform.OS === 'web') {
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          handleClose();
        }
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);

  /**
   * ⌨️ HANDLE KEYBOARD SHOW
   */
  const handleKeyboardShow = (e) => {
    setKeyboardVisible(true);
    
    // 📱 Adjust modal position for keyboard
    if (type === 'bottom' || type === 'input') {
      Animated.timing(slideAnim, {
        toValue: -e.endCoordinates.height / 2,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  };

  /**
   * ⌨️ HANDLE KEYBOARD HIDE
   */
  const handleKeyboardHide = () => {
    setKeyboardVisible(false);
    
    if (type === 'bottom' || type === 'input') {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  };

  /**
   * ❌ HANDLE CLOSE
   */
  const handleClose = () => {
    const closeAnimation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: animationDuration,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: type === 'bottom' ? 1 : 0,
        duration: animationDuration,
        useNativeDriver: true
      })
    ]);

    closeAnimation.start(() => {
      setVisible(false);
      onClose();
      if (onCloseComplete) onCloseComplete();
      logger.current.debug('Modal closed', { modalId: modal.id });
    });
  };

  /**
   * 🎯 GET MODAL STYLES BASED ON TYPE
   */
  const getModalStyles = () => {
    const baseStyles = {
      centered: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg
      },
      bottom: {
        justifyContent: 'flex-end',
        alignItems: 'stretch'
      },
      fullscreen: {
        flex: 1
      },
      sidebar: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: Dimensions.get('window').width * 0.85
      }
    };

    return baseStyles[type] || baseStyles.centered;
  };

  /**
   * 🎯 GET CONTENT STYLES BASED ON TYPE
   */
  const getContentStyles = () => {
    const baseStyles = {
      centered: {
        maxWidth: 500,
        width: '100%',
        maxHeight: '90%',
        borderRadius: Spacing.lg,
        margin: Spacing.lg
      },
      bottom: {
        borderTopLeftRadius: Spacing.lg,
        borderTopRightRadius: Spacing.lg,
        marginTop: safeAreaEnabled ? insets.top : 0,
        maxHeight: '90%'
      },
      fullscreen: {
        flex: 1,
        borderRadius: 0
      },
      sidebar: {
        flex: 1,
        borderTopLeftRadius: Spacing.lg,
        borderBottomLeftRadius: Spacing.lg
      }
    };

    return [styles.content, baseStyles[type], customStyles.content];
  };

  // 🎯 Backdrop Component
  const BackdropComponent = backdropBlur && Platform.OS === 'ios' ? BlurView : View;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeOnEscape ? handleClose : null}
      statusBarTranslucent
      hardwareAccelerated
      presentationStyle={type === 'fullscreen' ? 'fullScreen' : 'overFullScreen'}
    >
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor="transparent"
        translucent
      />
      
      <View style={[styles.container, { zIndex }]}>
        {/* 🎯 Backdrop */}
        <TouchableWithoutFeedback
          onPress={closeOnBackdropPress && !keyboardVisible ? handleClose : null}
          disabled={!closeOnBackdropPress || keyboardVisible}
        >
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, backdropOpacity]
                })
              }
            ]}
          >
            {backdropBlur && Platform.OS === 'ios' ? (
              <BackdropComponent
                style={styles.blurBackdrop}
                blurType="dark"
                blurAmount={10}
                reducedTransparencyFallbackColor={Colors.backdrop}
              />
            ) : null}
          </Animated.View>
        </TouchableWithoutFeedback>

        {/* 🎯 Modal Content */}
        <Animated.View
          style={[
            styles.modalContainer,
            getModalStyles(),
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, type === 'bottom' ? Dimensions.get('window').height : 0]
                  })
                }
              ]
            }
          ]}
          pointerEvents="box-none"
        >
          <SafeAreaView
            style={[
              getContentStyles(),
              keyboardVisible && type !== 'fullscreen' && styles.keyboardOpen
            ]}
          >
            {/* 🎯 Header */}
            {(title || showCloseButton) && (
              <View style={[styles.header, customStyles.header]}>
                {title && (
                  <Text style={[styles.title, customStyles.title]} variant="h3">
                    {title}
                  </Text>
                )}
                
                {showCloseButton && (
                  <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeButton}
                    accessibilityLabel="Close modal"
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="close" size={24} color={Colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* 🎯 Content */}
            <View style={[styles.body, customStyles.body]}>
              {typeof content === 'function' ? content({ closeModal: handleClose }) : content}
            </View>

            {/* 🎯 Footer (if provided) */}
            {modal.footer && (
              <View style={[styles.footer, customStyles.footer]}>
                {typeof modal.footer === 'function' 
                  ? modal.footer({ closeModal: handleClose })
                  : modal.footer
                }
              </View>
            )}
          </SafeAreaView>
        </Animated.View>
      </View>
    </RNModal>
  );
};

/**
 * 🎯 ENTERPRISE MODAL COMPONENTS
 */

/**
 * 📱 CONFIRMATION MODAL
 */
export const ConfirmationModal = ({
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  type = "warning",
  icon,
  isLoading = false,
  confirmButtonProps = {},
  cancelButtonProps = {}
}) => {
  const { hideModal } = useModal();

  const handleConfirm = async () => {
    try {
      if (onConfirm) {
        await onConfirm();
      }
      hideModal();
    } catch (error) {
      // Error handled by caller
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    hideModal();
  };

  const getTypeStyles = () => {
    const types = {
      warning: {
        icon: 'alert-circle',
        iconColor: Colors.warning,
        backgroundColor: Colors.warningLight
      },
      success: {
        icon: 'check-circle',
        iconColor: Colors.success,
        backgroundColor: Colors.successLight
      },
      error: {
        icon: 'x-circle',
        iconColor: Colors.error,
        backgroundColor: Colors.errorLight
      },
      info: {
        icon: 'info',
        iconColor: Colors.info,
        backgroundColor: Colors.infoLight
      }
    };

    return types[type] || types.info;
  };

  const typeStyles = getTypeStyles();

  return (
    <View style={styles.confirmationContainer}>
      {/* 🎯 Icon */}
      <View style={[styles.confirmationIconContainer, { backgroundColor: typeStyles.backgroundColor }]}>
        <Icon
          name={icon || typeStyles.icon}
          size={48}
          color={typeStyles.iconColor}
        />
      </View>

      {/* 🎯 Title */}
      <Text style={styles.confirmationTitle} variant="h2" align="center">
        {title}
      </Text>

      {/* 🎯 Message */}
      {message && (
        <Text style={styles.confirmationMessage} variant="body" align="center">
          {message}
        </Text>
      )}

      {/* 🎯 Actions */}
      <View style={styles.confirmationActions}>
        <Button
          variant="outline"
          onPress={handleCancel}
          disabled={isLoading}
          style={styles.confirmationCancelButton}
          {...cancelButtonProps}
        >
          {cancelText}
        </Button>
        
        <Button
          variant={type === 'error' ? 'danger' : 'primary'}
          onPress={handleConfirm}
          loading={isLoading}
          style={styles.confirmationConfirmButton}
          {...confirmButtonProps}
        >
          {confirmText}
        </Button>
      </View>
    </View>
  );
};

/**
 * 📊 LOADING MODAL
 */
export const LoadingModal = ({
  title = "Processing",
  message = "Please wait while we process your request",
  progress,
  showProgress = false,
  spinnerSize = 48,
  spinnerColor = Colors.primary
}) => {
  return (
    <View style={styles.loadingContainer}>
      {/* 🌀 Spinner */}
      <View style={styles.loadingSpinnerContainer}>
        <Icon
          name="loader"
          size={spinnerSize}
          color={spinnerColor}
          style={styles.loadingSpinner}
        />
      </View>

      {/* 🎯 Title */}
      <Text style={styles.loadingTitle} variant="h3" align="center">
        {title}
      </Text>

      {/* 📝 Message */}
      <Text style={styles.loadingMessage} variant="body" align="center">
        {message}
      </Text>

      {/* 📊 Progress Bar */}
      {showProgress && progress !== undefined && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`
                }
              ]}
            />
          </View>
          <Text style={styles.progressText} variant="caption">
            {Math.round(progress * 100)}%
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * 💰 PAYMENT MODAL
 */
export const PaymentModal = ({
  amount = 1999,
  currency = "ETB",
  paymentMethods = ['telebirr', 'cbe_birr', 'bank_transfer'],
  selectedMethod,
  onMethodSelect,
  onPaymentComplete,
  installmentOptions,
  isLoading = false
}) => {
  const [selectedInstallment, setSelectedInstallment] = useState(1);
  const { hideModal } = useModal();

  const calculateInstallmentAmount = (installments) => {
    return (amount / installments).toFixed(2);
  };

  const handlePayment = async () => {
    try {
      if (onPaymentComplete) {
        await onPaymentComplete({
          amount,
          currency,
          method: selectedMethod,
          installments: selectedInstallment
        });
      }
      hideModal();
    } catch (error) {
      // Error handled by caller
    }
  };

  return (
    <View style={styles.paymentContainer}>
      {/* 💰 Amount Display */}
      <View style={styles.paymentAmountContainer}>
        <Text style={styles.paymentAmount} variant="h1">
          {amount.toLocaleString()} {currency}
        </Text>
        <Text style={styles.paymentLabel} variant="body">
          Total Amount
        </Text>
      </View>

      {/* 🎯 Payment Methods */}
      <View style={styles.paymentMethodsContainer}>
        <Text style={styles.sectionTitle} variant="h4">
          Select Payment Method
        </Text>
        
        <View style={styles.paymentMethodsList}>
          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method}
              style={[
                styles.paymentMethodItem,
                selectedMethod === method && styles.paymentMethodItemSelected
              ]}
              onPress={() => onMethodSelect?.(method)}
            >
              <Icon
                name={getPaymentMethodIcon(method)}
                size={32}
                color={selectedMethod === method ? Colors.primary : Colors.textSecondary}
              />
              <Text style={styles.paymentMethodName} variant="body">
                {getPaymentMethodName(method)}
              </Text>
              {selectedMethod === method && (
                <Icon name="check" size={20} color={Colors.primary} style={styles.selectedIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 🔄 Installment Options */}
      {installmentOptions && installmentOptions.length > 1 && (
        <View style={styles.installmentContainer}>
          <Text style={styles.sectionTitle} variant="h4">
            Payment Plan
          </Text>
          
          <View style={styles.installmentOptions}>
            {installmentOptions.map((option) => (
              <TouchableOpacity
                key={option.installments}
                style={[
                  styles.installmentOption,
                  selectedInstallment === option.installments && styles.installmentOptionSelected
                ]}
                onPress={() => setSelectedInstallment(option.installments)}
              >
                <Text style={styles.installmentText} variant="body">
                  {option.installments} payment{option.installments > 1 ? 's' : ''}
                </Text>
                <Text style={styles.installmentAmount} variant="h4">
                  {calculateInstallmentAmount(option.installments)} {currency}
                </Text>
                <Text style={styles.installmentNote} variant="caption">
                  each
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* 🎯 Payment Summary */}
      <View style={styles.paymentSummary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel} variant="body">
            Amount
          </Text>
          <Text style={styles.summaryValue} variant="body">
            {amount.toLocaleString()} {currency}
          </Text>
        </View>
        
        {selectedInstallment > 1 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel} variant="body">
              Per Installment
            </Text>
            <Text style={styles.summaryValue} variant="body">
              {calculateInstallmentAmount(selectedInstallment)} {currency}
            </Text>
          </View>
        )}
        
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={styles.summaryTotalLabel} variant="h4">
            Total
          </Text>
          <Text style={styles.summaryTotalValue} variant="h4">
            {amount.toLocaleString()} {currency}
          </Text>
        </View>
      </View>

      {/* ✅ Proceed Button */}
      <Button
        variant="primary"
        size="large"
        onPress={handlePayment}
        loading={isLoading}
        disabled={!selectedMethod || isLoading}
        style={styles.paymentButton}
      >
        Proceed to Payment
      </Button>
    </View>
  );
};

/**
 * 🎯 SKILL SELECTION MODAL
 */
export const SkillSelectionModal = ({
  skills,
  selectedSkills = [],
  onSkillSelect,
  maxSelections = 3,
  categoryFilter,
  searchQuery = '',
  onSearchChange
}) => {
  const [filteredSkills, setFilteredSkills] = useState(skills);
  const [selected, setSelected] = useState(selectedSkills);
  const [search, setSearch] = useState(searchQuery);

  useEffect(() => {
    let filtered = skills;
    
    // 🔍 Search Filter
    if (search) {
      filtered = filtered.filter(skill =>
        skill.name.toLowerCase().includes(search.toLowerCase()) ||
        skill.description?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // 🏷️ Category Filter
    if (categoryFilter) {
      filtered = filtered.filter(skill => skill.category === categoryFilter);
    }
    
    setFilteredSkills(filtered);
  }, [skills, search, categoryFilter]);

  const handleSkillSelect = (skillId) => {
    let newSelected;
    
    if (selected.includes(skillId)) {
      // ❌ Deselect
      newSelected = selected.filter(id => id !== skillId);
    } else {
      // ✅ Select (check max limit)
      if (selected.length >= maxSelections) {
        // 🚫 Max selections reached - replace oldest selection
        newSelected = [...selected.slice(1), skillId];
      } else {
        newSelected = [...selected, skillId];
      }
    }
    
    setSelected(newSelected);
    onSkillSelect?.(newSelected);
  };

  const isSkillSelected = (skillId) => selected.includes(skillId);

  return (
    <View style={styles.skillSelectionContainer}>
      {/* 🔍 Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search skills..."
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            onSearchChange?.(text);
          }}
          placeholderTextColor={Colors.textSecondary}
        />
      </View>

      {/* 🏷️ Category Filter */}
      {categories && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryItem,
                categoryFilter === category.id && styles.categoryItemSelected
              ]}
              onPress={() => onCategorySelect?.(category.id)}
            >
              <Text
                style={[
                  styles.categoryText,
                  categoryFilter === category.id && styles.categoryTextSelected
                ]}
                variant="caption"
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* 🎯 Skills Grid */}
      <FlatList
        data={filteredSkills}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.skillsGrid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.skillCard,
              isSkillSelected(item.id) && styles.skillCardSelected
            ]}
            onPress={() => handleSkillSelect(item.id)}
          >
            <View style={styles.skillIconContainer}>
              <Icon
                name={item.icon || 'code'}
                size={32}
                color={isSkillSelected(item.id) ? Colors.primary : Colors.textSecondary}
              />
            </View>
            
            <Text
              style={[
                styles.skillName,
                isSkillSelected(item.id) && styles.skillNameSelected
              ]}
              variant="body"
              numberOfLines={2}
            >
              {item.name}
            </Text>
            
            <Text
              style={styles.skillDescription}
              variant="caption"
              numberOfLines={2}
            >
              {item.description}
            </Text>
            
            {isSkillSelected(item.id) && (
              <View style={styles.selectedBadge}>
                <Icon name="check" size={16} color={Colors.white} />
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="search" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyStateText} variant="body" align="center">
              No skills found matching your search
            </Text>
          </View>
        }
      />

      {/* 🎯 Selection Summary */}
      {selected.length > 0 && (
        <View style={styles.selectionSummary}>
          <Text style={styles.summaryText} variant="body">
            {selected.length} of {maxSelections} skills selected
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedSkillsList}>
            {selected.map(skillId => {
              const skill = skills.find(s => s.id === skillId);
              return skill ? (
                <View key={skillId} style={styles.selectedSkillTag}>
                  <Text style={styles.selectedSkillText} variant="caption">
                    {skill.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleSkillSelect(skillId)}
                    style={styles.removeSkillButton}
                  >
                    <Icon name="x" size={12} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ) : null;
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

/**
 * 🛠️ UTILITY FUNCTIONS
 */

/**
 * 🎯 VALIDATE MODAL CONFIG
 */
const validateModalConfig = (config) => {
  const requiredFields = ['content'];
  const missingFields = requiredFields.filter(field => !config[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  const defaultConfig = {
    type: 'centered',
    showCloseButton: true,
    closeOnBackdropPress: true,
    closeOnEscape: true,
    backdropOpacity: 0.5,
    animationType: 'fade',
    animationDuration: 300,
    preventKeyboardDismiss: false,
    statusBarStyle: 'dark-content',
    safeAreaEnabled: true
  };

  return { ...defaultConfig, ...config };
};

/**
 * 🔊 ANNOUNCE FOR ACCESSIBILITY
 */
const announceForAccessibility = (message) => {
  if (Platform.OS === 'ios') {
    // iOS accessibility announcement
    AccessibilityInfo.announceForAccessibility(message);
  } else if (Platform.OS === 'android') {
    // Android TalkBack
    AccessibilityInfo.announceForAccessibility(message);
  }
};

/**
 * 💰 GET PAYMENT METHOD ICON
 */
const getPaymentMethodIcon = (method) => {
  const icons = {
    telebirr: 'smartphone',
    cbe_birr: 'credit-card',
    bank_transfer: 'bank',
    credit_card: 'credit-card',
    wallet: 'wallet'
  };
  
  return icons[method] || 'credit-card';
};

/**
 * 💰 GET PAYMENT METHOD NAME
 */
const getPaymentMethodName = (method) => {
  const names = {
    telebirr: 'Telebirr',
    cbe_birr: 'CBE Birr',
    bank_transfer: 'Bank Transfer',
    credit_card: 'Credit Card',
    wallet: 'Digital Wallet'
  };
  
  return names[method] || method;
};

/**
 * 🎨 STYLES
 */
const styles = StyleSheet.create({
  // 🎯 Container Styles
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent'
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.backdrop
  },
  blurBackdrop: {
    ...StyleSheet.absoluteFillObject
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  content: {
    backgroundColor: Colors.background,
    ...Elevation.large,
    overflow: 'hidden'
  },
  keyboardOpen: {
    marginBottom: Platform.OS === 'ios' ? 20 : 0
  },

  // 🎯 Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  title: {
    flex: 1,
    marginRight: Spacing.md,
    color: Colors.textPrimary
  },
  closeButton: {
    padding: Spacing.xs,
    borderRadius: 20
  },

  // 🎯 Body Styles
  body: {
    flex: 1,
    padding: Spacing.lg
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface
  },

  // 🎯 Confirmation Modal Styles
  confirmationContainer: {
    padding: Spacing.xl,
    alignItems: 'center'
  },
  confirmationIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg
  },
  confirmationTitle: {
    marginBottom: Spacing.md,
    textAlign: 'center'
  },
  confirmationMessage: {
    marginBottom: Spacing.xl,
    textAlign: 'center',
    color: Colors.textSecondary
  },
  confirmationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: Spacing.lg
  },
  confirmationCancelButton: {
    flex: 1,
    marginRight: Spacing.sm
  },
  confirmationConfirmButton: {
    flex: 1,
    marginLeft: Spacing.sm
  },

  // 🎯 Loading Modal Styles
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingSpinnerContainer: {
    marginBottom: Spacing.lg
  },
  loadingSpinner: {
    ...Animations.spin
  },
  loadingTitle: {
    marginBottom: Spacing.md,
    textAlign: 'center'
  },
  loadingMessage: {
    marginBottom: Spacing.xl,
    textAlign: 'center',
    color: Colors.textSecondary
  },
  progressContainer: {
    width: '100%',
    marginTop: Spacing.lg
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.xs
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2
  },
  progressText: {
    textAlign: 'center',
    color: Colors.textSecondary
  },

  // 💰 Payment Modal Styles
  paymentContainer: {
    padding: Spacing.lg
  },
  paymentAmountContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl
  },
  paymentAmount: {
    color: Colors.primary,
    marginBottom: Spacing.xs
  },
  paymentLabel: {
    color: Colors.textSecondary
  },
  paymentMethodsContainer: {
    marginBottom: Spacing.xl
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    color: Colors.textPrimary
  },
  paymentMethodsList: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  paymentMethodItem: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    marginHorizontal: Spacing.xs,
    borderRadius: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface
  },
  paymentMethodItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight
  },
  paymentMethodName: {
    marginTop: Spacing.sm,
    textAlign: 'center'
  },
  selectedIndicator: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs
  },
  installmentContainer: {
    marginBottom: Spacing.xl
  },
  installmentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  installmentOption: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    marginHorizontal: Spacing.xs,
    borderRadius: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface
  },
  installmentOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight
  },
  installmentText: {
    marginBottom: Spacing.xs
  },
  installmentAmount: {
    color: Colors.primary
  },
  installmentNote: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  paymentSummary: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.md,
    padding: Spacing.lg,
    marginBottom: Spacing.xl
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
    paddingTop: Spacing.md
  },
  summaryLabel: {
    color: Colors.textSecondary
  },
  summaryValue: {
    color: Colors.textPrimary
  },
  summaryTotalLabel: {
    color: Colors.textPrimary
  },
  summaryTotalValue: {
    color: Colors.primary
  },
  paymentButton: {
    marginTop: Spacing.lg
  },

  // 🎯 Skill Selection Modal Styles
  skillSelectionContainer: {
    flex: 1
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    ...Elevation.small
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: Typography.body.fontSize,
    fontFamily: Typography.body.fontFamily
  },
  categoryFilter: {
    marginBottom: Spacing.lg
  },
  categoryItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border
  },
  categoryItemSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary
  },
  categoryText: {
    color: Colors.textSecondary
  },
  categoryTextSelected: {
    color: Colors.white
  },
  skillsGrid: {
    paddingBottom: Spacing.xl
  },
  skillCard: {
    flex: 1,
    margin: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    minHeight: 120,
    ...Elevation.small
  },
  skillCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight
  },
  skillIconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.sm
  },
  skillName: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
    color: Colors.textPrimary
  },
  skillNameSelected: {
    color: Colors.primary
  },
  skillDescription: {
    textAlign: 'center',
    color: Colors.textSecondary
  },
  selectedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Elevation.small
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2
  },
  emptyStateText: {
    marginTop: Spacing.lg,
    color: Colors.textSecondary
  },
  selectionSummary: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.md,
    padding: Spacing.lg,
    marginTop: 'auto'
  },
  summaryText: {
    marginBottom: Spacing.sm,
    color: Colors.textSecondary
  },
  selectedSkillsList: {
    flexDirection: 'row'
  },
  selectedSkillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginRight: Spacing.sm
  },
  selectedSkillText: {
    color: Colors.white,
    marginRight: Spacing.xs
  },
  removeSkillButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default {
  ModalProvider,
  useModal,
  ConfirmationModal,
  LoadingModal,
  PaymentModal,
  SkillSelectionModal
};