/**
 * 🎯 MOSA FORGE: Enterprise Achievement Popup Component
 * 
 * @component AchievementPopup
 * @description Displays interactive achievement notifications with animations and rewards
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Multi-type achievement system (Milestone, Streak, Skill, Bonus)
 * - Real-time reward animations
 * - Progress tracking integration
 * - Social sharing capabilities
 * - Performance-optimized animations
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
  StyleSheet,
  Platform,
  Vibration
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// 🏗️ Enterprise Constants
const ACHIEVEMENT_TYPES = {
  MILESTONE: 'milestone',
  STREAK: 'streak',
  SKILL_MASTERY: 'skill_mastery',
  BONUS: 'bonus',
  COMPLETION: 'completion',
  QUALITY: 'quality'
};

const ACHIEVEMENT_CONFIG = {
  [ACHIEVEMENT_TYPES.MILESTONE]: {
    icon: 'trophy',
    color: '#FFD700',
    gradient: ['#FFD700', '#FFA500'],
    duration: 4000,
    haptic: 'success'
  },
  [ACHIEVEMENT_TYPES.STREAK]: {
    icon: 'flame',
    color: '#FF6B35',
    gradient: ['#FF6B35', '#FF8E53'],
    duration: 3500,
    haptic: 'warning'
  },
  [ACHIEVEMENT_TYPES.SKILL_MASTERY]: {
    icon: 'school',
    color: '#4ECDC4',
    gradient: ['#4ECDC4', '#44A08D'],
    duration: 4500,
    haptic: 'success'
  },
  [ACHIEVEMENT_TYPES.BONUS]: {
    icon: 'gift',
    color: '#9B59B6',
    gradient: ['#9B59B6', '#8E44AD'],
    duration: 3000,
    haptic: 'light'
  },
  [ACHIEVEMENT_TYPES.COMPLETION]: {
    icon: 'checkmark-done-circle',
    color: '#2ECC71',
    gradient: ['#2ECC71', '#27AE60'],
    duration: 5000,
    haptic: 'heavy'
  },
  [ACHIEVEMENT_TYPES.QUALITY]: {
    icon: 'star',
    color: '#F1C40F',
    gradient: ['#F1C40F', '#F39C12'],
    duration: 4000,
    haptic: 'medium'
  }
};

const RARITY_LEVELS = {
  COMMON: { name: 'Common', color: '#95A5A6', multiplier: 1 },
  RARE: { name: 'Rare', color: '#3498DB', multiplier: 1.5 },
  EPIC: { name: 'Epic', color: '#9B59B6', multiplier: 2 },
  LEGENDARY: { name: 'Legendary', color: '#F1C40F', multiplier: 3 },
  MYTHIC: { name: 'Mythic', color: '#E74C3C', multiplier: 5 }
};

/**
 * 🏗️ Enterprise Achievement Popup Component
 * @param {Object} props - Component properties
 */
const AchievementPopup = ({
  achievement = null,
  visible = false,
  onClose = () => {},
  onShare = null,
  onCollectReward = null,
  autoHide = true,
  showProgress = true,
  enableHaptics = true,
  enableAnimations = true,
  theme = 'light'
}) => {
  // 🎯 Refs for animation control
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  // 🎯 State management
  const [isVisible, setIsVisible] = useState(visible);
  const [showDetails, setShowDetails] = useState(false);
  const [collected, setCollected] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // 🎯 Animation sequences
  const enterAnimation = useCallback(() => {
    if (!enableAnimations) {
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
      slideAnim.setValue(0);
      return;
    }

    // Reset animations
    scaleAnim.setValue(0);
    opacityAnim.setValue(0);
    slideAnim.setValue(50);
    progressAnim.setValue(0);
    glowAnim.setValue(0);

    // Main entrance sequence
    Animated.parallel([
      // Scale animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      // Opacity animation
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      // Slide animation
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      })
    ]).start(() => {
      // Progress bar animation
      if (showProgress && achievement?.progress) {
        Animated.timing(progressAnim, {
          toValue: achievement.progress,
          duration: 1500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      }

      // Glow pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          })
        ])
      ).start();
    });
  }, [enableAnimations, achievement?.progress, showProgress]);

  const exitAnimation = useCallback(() => {
    if (!enableAnimations) {
      handleClose();
      return;
    }

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start(handleClose);
  }, [enableAnimations]);

  // 🎯 Handle haptic feedback
  const triggerHaptic = useCallback((type) => {
    if (!enableHaptics) return;

    try {
      switch (type) {
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        default:
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.warn('Haptics not available:', error);
    }
  }, [enableHaptics]);

  // 🎯 Handle achievement display
  useEffect(() => {
    if (achievement && visible) {
      setIsVisible(true);
      setCollected(false);
      setShowDetails(false);
      
      // Trigger haptic feedback based on achievement type
      const config = ACHIEVEMENT_CONFIG[achievement.type] || ACHIEVEMENT_CONFIG[ACHIEVEMENT_TYPES.MILESTONE];
      triggerHaptic(config.haptic);

      // Start enter animation
      enterAnimation();

      // Auto-hide timer
      if (autoHide) {
        const duration = config.duration;
        setTimeRemaining(duration);
        
        const timer = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev <= 1000) {
              clearInterval(timer);
              exitAnimation();
              return 0;
            }
            return prev - 1000;
          });
        }, 1000);

        return () => clearInterval(timer);
      }
    }
  }, [achievement, visible, autoHide]);

  // 🎯 Handle close with cleanup
  const handleClose = useCallback(() => {
    setIsVisible(false);
    setShowDetails(false);
    setCollected(false);
    onClose();
  }, [onClose]);

  // 🎯 Handle reward collection
  const handleCollectReward = useCallback(() => {
    if (collected) return;

    setCollected(true);
    triggerHaptic('success');

    // Collection animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (onCollectReward) {
        onCollectReward(achievement);
      }
      
      // Auto-close after collection
      setTimeout(() => {
        exitAnimation();
      }, 1000);
    });
  }, [collected, achievement, onCollectReward, exitAnimation]);

  // 🎯 Handle share action
  const handleShare = useCallback(() => {
    triggerHaptic('light');
    if (onShare) {
      onShare(achievement);
    }
  }, [achievement, onShare, triggerHaptic]);

  // 🎯 Render nothing if no achievement or not visible
  if (!achievement || !isVisible) {
    return null;
  }

  // 🎯 Get achievement configuration
  const config = ACHIEVEMENT_CONFIG[achievement.type] || ACHIEVEMENT_CONFIG[ACHIEVEMENT_TYPES.MILESTONE];
  const rarity = RARITY_LEVELS[achievement.rarity] || RARITY_LEVELS.COMMON;

  // 🎯 Animation transforms
  const animatedStyle = {
    transform: [
      { scale: scaleAnim },
      { translateY: slideAnim }
    ],
    opacity: opacityAnim
  };

  const glowStyle = {
    opacity: glowAnim,
    transform: [
      {
        scale: glowAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.1]
        })
      }
    ]
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%']
  });

  // 🎯 Calculate time remaining for auto-hide
  const secondsRemaining = Math.ceil(timeRemaining / 1000);

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={exitAnimation}
    >
      {/* 🎯 Backdrop with blur */}
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={autoHide ? exitAnimation : undefined}
      >
        <BlurView
          intensity={Platform.OS === 'ios' ? 30 : 50}
          tint={theme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        
        {/* 🎯 Main achievement card */}
        <Animated.View style={[styles.container, animatedStyle]}>
          {/* 🎯 Glow effect */}
          <Animated.View
            style={[
              styles.glow,
              { backgroundColor: config.color },
              glowStyle
            ]}
          />
          
          {/* 🎯 Achievement header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: config.color }]}>
              <Ionicons
                name={config.icon}
                size={32}
                color="#FFFFFF"
                style={styles.icon}
              />
              
              {/* 🎯 Rarity badge */}
              <View style={[styles.rarityBadge, { backgroundColor: rarity.color }]}>
                <Text style={styles.rarityText}>
                  {rarity.name}
                </Text>
              </View>
            </View>
            
            <View style={styles.titleContainer}>
              <Text style={[styles.title, theme === 'dark' && styles.titleDark]}>
                {achievement.title}
              </Text>
              <Text style={[styles.subtitle, theme === 'dark' && styles.subtitleDark]}>
                {achievement.subtitle}
              </Text>
            </View>
            
            {/* 🎯 Auto-hide timer */}
            {autoHide && (
              <View style={styles.timer}>
                <Text style={styles.timerText}>
                  {secondsRemaining}s
                </Text>
              </View>
            )}
          </View>

          {/* 🎯 Achievement description */}
          <View style={styles.descriptionContainer}>
            <Text style={[styles.description, theme === 'dark' && styles.descriptionDark]}>
              {achievement.description}
            </Text>
          </View>

          {/* 🎯 Progress bar for progressive achievements */}
          {showProgress && achievement.progress !== undefined && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    { 
                      width: progressWidth,
                      backgroundColor: config.color
                    }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(achievement.progress)}% Complete
              </Text>
            </View>
          )}

          {/* 🎯 Rewards section */}
          {achievement.rewards && achievement.rewards.length > 0 && (
            <View style={styles.rewardsContainer}>
              <Text style={[styles.rewardsTitle, theme === 'dark' && styles.rewardsTitleDark]}>
                Rewards Unlocked
              </Text>
              <View style={styles.rewardsList}>
                {achievement.rewards.map((reward, index) => (
                  <View key={index} style={styles.rewardItem}>
                    <Ionicons
                      name={reward.icon || 'gift'}
                      size={20}
                      color={config.color}
                    />
                    <Text style={[styles.rewardText, theme === 'dark' && styles.rewardTextDark]}>
                      {reward.amount} {reward.type}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 🎯 Action buttons */}
          <View style={styles.actionsContainer}>
            {/* 🎯 Details toggle */}
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => {
                triggerHaptic('light');
                setShowDetails(!showDetails);
              }}
            >
              <Ionicons
                name={showDetails ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={config.color}
              />
              <Text style={[styles.buttonText, { color: config.color }]}>
                {showDetails ? 'Less' : 'More'} Details
              </Text>
            </TouchableOpacity>

            {/* 🎯 Share button */}
            {onShare && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleShare}
              >
                <Ionicons
                  name="share-social"
                  size={20}
                  color={config.color}
                />
                <Text style={[styles.buttonText, { color: config.color }]}>
                  Share
                </Text>
              </TouchableOpacity>
            )}

            {/* 🎯 Collect reward button */}
            {onCollectReward && achievement.rewards && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: config.color }]}
                onPress={handleCollectReward}
                disabled={collected}
              >
                <Ionicons
                  name={collected ? 'checkmark' : 'download'}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  {collected ? 'Collected!' : 'Collect Reward'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 🎯 Expanded details */}
          {showDetails && achievement.details && (
            <View style={styles.detailsContainer}>
              <Text style={[styles.detailsTitle, theme === 'dark' && styles.detailsTitleDark]}>
                Achievement Details
              </Text>
              {achievement.details.map((detail, index) => (
                <View key={index} style={styles.detailItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={config.color}
                  />
                  <Text style={[styles.detailText, theme === 'dark' && styles.detailTextDark]}>
                    {detail}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

// 🎯 Enterprise Stylesheet
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    height: 200,
    borderRadius: 100,
    opacity: 0.1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  icon: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  rarityBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  rarityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 4,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7F8C8D',
  },
  subtitleDark: {
    color: '#BDC3C7',
  },
  timer: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    color: '#34495E',
    textAlign: 'center',
  },
  descriptionDark: {
    color: '#ECF0F1',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#ECF0F1',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7F8C8D',
    textAlign: 'center',
  },
  rewardsContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  rewardsTitleDark: {
    color: '#FFFFFF',
  },
  rewardsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2C3E50',
    marginLeft: 4,
  },
  rewardTextDark: {
    color: '#2C3E50', // Keep dark for light background
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 120,
    justifyContent: 'center',
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  secondaryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  detailsTitleDark: {
    color: '#FFFFFF',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#34495E',
    marginLeft: 8,
    flex: 1,
  },
  detailTextDark: {
    color: '#ECF0F1',
  },
});

// 🎯 Export with enterprise configuration
export default AchievementPopup;
export { ACHIEVEMENT_TYPES, ACHIEVEMENT_CONFIG, RARITY_LEVELS };