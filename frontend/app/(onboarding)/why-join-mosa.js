/**
 * 🎯 MOSA FORGE: Enterprise Why Join Mosa Onboarding Screen
 * 
 * @component WhyJoinMosa
 * @description Strategic onboarding screen showcasing Mosa's value proposition
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Interactive value proposition showcase
 * - Animated statistics and metrics
 * - Personalized value calculation
 * - Quality guarantee visualization
 * - Conversion optimization
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  InteractionManager
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 🏗️ Enterprise Hooks & Context
import { useOnboardingProgress } from '../../../hooks/use-onboarding-progress';
import { useAnalytics } from '../../../hooks/use-analytics';
import { useAuth } from '../../../contexts/auth-context';

// 🏗️ Enterprise Components
import LoadingIndicator from '../../../components/shared/loading-indicator';
import AnimatedNumber from '../../../components/shared/animated-number';
import QualityBadge from '../../../components/quality/quality-badge';
import ProgressDots from '../../../components/shared/progress-dots';

// 🏗️ Enterprise Constants
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IS_IOS = Platform.OS === 'ios';
const IS_SMALL_DEVICE = SCREEN_WIDTH < 375;

/**
 * 🎯 Enterprise Why Join Mosa Component
 * @function WhyJoinMosa
 * @returns {React.Component}
 */
const WhyJoinMosa = () => {
  // 🏗️ Enterprise Hooks
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { trackEvent, trackScreenView } = useAnalytics();
  const { updateOnboardingStep, getOnboardingProgress } = useOnboardingProgress();
  const { user, profile } = useAuth();

  // 🏗️ State Management
  const [isLoading, setIsLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [userMetrics, setUserMetrics] = useState(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  // 🏗️ Animation Refs
  const scrollX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnimations = useRef([]);

  // 🏗️ Component Refs
  const scrollViewRef = useRef(null);
  const autoScrollTimer = useRef(null);

  // 🏗️ Enterprise Configuration
  const SLIDES = [
    {
      id: 'value-proposition',
      title: 'From Zero to Income in 4 Months',
      subtitle: 'Guaranteed Skills Transformation',
      icon: '🚀',
      color: ['#667eea', '#764ba2'],
      metrics: {
        completionRate: 70,
        incomeIncrease: 500,
        timeToIncome: 4
      }
    },
    {
      id: 'quality-guarantee',
      title: 'Quality-Guaranteed Training',
      subtitle: 'Auto-Enforced Expert Standards',
      icon: '🛡️',
      color: ['#f093fb', '#f5576c'],
      metrics: {
        expertQuality: 4.5,
        satisfactionRate: 95,
        supportResponse: 24
      }
    },
    {
      id: 'revenue-model',
      title: '1,999 ETB All-Inclusive',
      subtitle: 'Complete 4-Month Journey',
      icon: '💰',
      color: ['#4facfe', '#00f2fe'],
      metrics: {
        bundlePrice: 1999,
        expertEarnings: 999,
        platformRevenue: 1000
      }
    },
    {
      id: 'yachi-integration',
      title: 'Instant Yachi Verification',
      subtitle: 'Start Earning Immediately',
      icon: '🎯',
      color: ['#43e97b', '#38f9d7'],
      metrics: {
        verificationTime: 0,
        incomeReady: 100,
        employerRecognition: 90
      }
    }
  ];

  /**
   * 🏗️ Component Initialization
   */
  useEffect(() => {
    const initComponent = async () => {
      try {
        // Track screen view for analytics
        await trackScreenView('why_join_mosa', {
          user_id: user?.id,
          onboarding_step: 2,
          timestamp: new Date().toISOString()
        });

        // Load user-specific metrics
        await loadUserMetrics();

        // Initialize animations after load
        InteractionManager.runAfterInteractions(() => {
          startEntranceAnimation();
          startAutoScroll();
        });

      } catch (error) {
        console.error('Component initialization failed:', error);
        trackEvent('onboarding_error', {
          error: error.message,
          component: 'why_join_mosa'
        });
      } finally {
        setIsLoading(false);
      }
    };

    initComponent();

    // 🏗️ Cleanup function
    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, []);

  /**
   * 🏗️ Load User-Specific Metrics
   */
  const loadUserMetrics = async () => {
    try {
      // Simulate API call for user metrics
      const metrics = {
        potentialIncome: calculatePotentialIncome(),
        skillDemand: getSkillDemandMetrics(),
        localSuccessRate: getLocalSuccessRate(),
        personalizedTimeline: getPersonalizedTimeline()
      };

      setUserMetrics(metrics);
      
      trackEvent('user_metrics_loaded', {
        user_id: user?.id,
        metrics_count: Object.keys(metrics).length
      });

    } catch (error) {
      console.error('Failed to load user metrics:', error);
      trackEvent('metrics_load_failed', { error: error.message });
    }
  };

  /**
   * 🏗️ Calculate Potential Income Based on User Profile
   */
  const calculatePotentialIncome = () => {
    const baseIncome = 8000; // Base monthly income in ETB
    const experienceMultiplier = profile?.experienceLevel === 'beginner' ? 1 : 1.5;
    const educationMultiplier = profile?.educationLevel === 'higher' ? 1.2 : 1;
    
    return Math.round(baseIncome * experienceMultiplier * educationMultiplier);
  };

  /**
   * 🏗️ Get Skill Demand Metrics
   */
  const getSkillDemandMetrics = () => {
    // This would typically come from analytics service
    return {
      highDemandSkills: ['Forex Trading', 'Digital Marketing', 'Web Development'],
      averageSalary: 12000,
      employmentRate: 85
    };
  };

  /**
   * 🏗️ Get Local Success Rate
   */
  const getLocalSuccessRate = () => {
    // Regional success metrics
    return {
      completionRate: 72,
      incomeAchievement: 78,
      satisfactionScore: 94
    };
  };

  /**
   * 🏗️ Get Personalized Timeline
   */
  const getPersonalizedTimeline = () => {
    return {
      mindsetPhase: '1 week',
      theoryMastery: '6 weeks',
      handsOnTraining: '8 weeks',
      certification: '1 week',
      totalDuration: '4 months'
    };
  };

  /**
   * 🏗️ Start Entrance Animation Sequence
   */
  const startEntranceAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start(() => {
      setHasAnimated(true);
      triggerSlideAnimations();
    });
  };

  /**
   * 🏗️ Trigger Slide-Specific Animations
   */
  const triggerSlideAnimations = () => {
    slideAnimations.current.forEach((animation, index) => {
      if (animation && index === currentSlide) {
        animation.start();
      }
    });
  };

  /**
   * 🏗️ Start Auto-Scroll for Engagement
   */
  const startAutoScroll = () => {
    autoScrollTimer.current = setInterval(() => {
      const nextSlide = (currentSlide + 1) % SLIDES.length;
      scrollToSlide(nextSlide);
    }, 5000); // Change slide every 5 seconds
  };

  /**
   * 🏗️ Scroll to Specific Slide
   */
  const scrollToSlide = (slideIndex) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: slideIndex * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentSlide(slideIndex);
      triggerHapticFeedback('light');
    }
  };

  /**
   * 🏗️ Handle Scroll Event
   */
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const slideIndex = Math.round(
          event.nativeEvent.contentOffset.x / SCREEN_WIDTH
        );
        if (slideIndex !== currentSlide) {
          setCurrentSlide(slideIndex);
          triggerHapticFeedback('light');
        }
      },
    }
  );

  /**
   * 🏗️ Trigger Haptic Feedback
   */
  const triggerHapticFeedback = (type = 'medium') => {
    if (IS_IOS) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle[type]);
    }
  };

  /**
   * 🏗️ Handle Continue Action
   */
  const handleContinue = async () => {
    try {
      triggerHapticFeedback('heavy');
      
      // Track conversion event
      await trackEvent('onboarding_continue', {
        user_id: user?.id,
        screen: 'why_join_mosa',
        slide_index: currentSlide,
        timestamp: new Date().toISOString()
      });

      // Update onboarding progress
      await updateOnboardingStep('why_join_mosa_completed', {
        slides_viewed: currentSlide + 1,
        time_spent: Math.floor(performance.now() / 1000)
      });

      // Navigate to next screen
      router.push('/(onboarding)/skill-selection');

    } catch (error) {
      console.error('Continue action failed:', error);
      trackEvent('onboarding_continue_failed', { error: error.message });
    }
  };

  /**
   * 🏗️ Handle Skip Action
   */
  const handleSkip = async () => {
    triggerHapticFeedback('medium');
    
    await trackEvent('onboarding_skipped', {
      user_id: user?.id,
        screen: 'why_join_mosa',
      progress: getOnboardingProgress()
    });

    router.push('/(onboarding)/skill-selection');
  };

  /**
   * 🏗️ Render Slide Content
   */
  const renderSlideContent = (slide, index) => {
    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH,
    ];

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [100, 0, 100],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    return (
      <View key={slide.id} style={styles.slide}>
        <Animated.View
          style={[
            styles.slideContent,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Slide Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={slide.color}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.iconText}>{slide.icon}</Text>
            </LinearGradient>
          </View>

          {/* Slide Title */}
          <Text style={styles.slideTitle}>{slide.title}</Text>
          <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>

          {/* Slide Metrics */}
          <View style={styles.metricsContainer}>
            {Object.entries(slide.metrics).map(([key, value], metricIndex) => (
              <View key={key} style={styles.metricItem}>
                <AnimatedNumber
                  value={value}
                  duration={1500}
                  delay={metricIndex * 300}
                  style={styles.metricValue}
                  formatter={(val) => {
                    if (typeof val === 'number') {
                      if (key.includes('Rate') || key.includes('Rate')) {
                        return `${val}%`;
                      }
                      if (key.includes('Price') || key.includes('Earnings') || key.includes('Revenue')) {
                        return `${val.toLocaleString()} ETB`;
                      }
                      if (key.includes('Time')) {
                        return `${val} hours`;
                      }
                      return val.toString();
                    }
                    return val;
                  }}
                />
                <Text style={styles.metricLabel}>
                  {formatMetricLabel(key)}
                </Text>
              </View>
            ))}
          </View>

          {/* Additional Content Based on Slide */}
          {renderAdditionalContent(slide.id)}
        </Animated.View>
      </View>
    );
  };

  /**
   * 🏗️ Render Additional Slide-Specific Content
   */
  const renderAdditionalContent = (slideId) => {
    switch (slideId) {
      case 'quality-guarantee':
        return (
          <View style={styles.qualityContainer}>
            <QualityBadge
              tier="ENTERPRISE"
              score={4.7}
              size="large"
              animated={true}
            />
            <Text style={styles.qualityDescription}>
              Auto-enforced quality standards with real-time monitoring and instant expert switching
            </Text>
          </View>
        );

      case 'revenue-model':
        return (
          <View style={styles.revenueContainer}>
            <View style={styles.revenueSplit}>
              <View style={styles.revenueItem}>
                <Text style={styles.revenueLabel}>Platform</Text>
                <Text style={styles.revenueValue}>1,000 ETB</Text>
              </View>
              <View style={styles.revenueDivider} />
              <View style={styles.revenueItem}>
                <Text style={styles.revenueLabel}>Expert</Text>
                <Text style={styles.revenueValue}>999 ETB</Text>
              </View>
            </View>
            <Text style={styles.revenueNote}>
              Transparent 1000/999 revenue split with performance bonuses
            </Text>
          </View>
        );

      case 'yachi-integration':
        return (
          <View style={styles.yachiContainer}>
            <View style={styles.benefitList}>
              <Text style={styles.benefitItem}>✅ Instant service provider verification</Text>
              <Text style={styles.benefitItem}>✅ Direct client matching</Text>
              <Text style={styles.benefitItem}>✅ Secure payment processing</Text>
              <Text style={styles.benefitItem}>✅ Portfolio showcasing</Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  /**
   * 🏗️ Format Metric Labels for Display
   */
  const formatMetricLabel = (key) => {
    const labelMap = {
      completionRate: 'Completion Rate',
      incomeIncrease: 'Income Increase %',
      timeToIncome: 'Months to Income',
      expertQuality: 'Expert Quality Score',
      satisfactionRate: 'Satisfaction Rate',
      supportResponse: 'Support Response (hrs)',
      bundlePrice: 'Bundle Price',
      expertEarnings: 'Expert Earnings',
      platformRevenue: 'Platform Revenue',
      verificationTime: 'Verification Time (days)',
      incomeReady: 'Income Ready %',
      employerRecognition: 'Employer Recognition %'
    };

    return labelMap[key] || key;
  };

  // 🏗️ Show Loading State
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <LoadingIndicator
          size="large"
          color="#667eea"
          message="Preparing your Mosa journey..."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background Gradient */}
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          accessibilityLabel="Skip onboarding"
          accessibilityRole="button"
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>

        <ProgressDots
          currentIndex={currentSlide}
          totalCount={SLIDES.length}
          style={styles.progressDots}
        />

        <View style={styles.placeholder} />
      </View>

      {/* Main Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Slides ScrollView */}
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH}
          style={styles.scrollView}
        >
          {SLIDES.map((slide, index) => renderSlideContent(slide, index))}
        </Animated.ScrollView>

        {/* Slide Indicators */}
        <View style={styles.indicatorContainer}>
          {SLIDES.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.indicator,
                currentSlide === index && styles.indicatorActive,
              ]}
              onPress={() => scrollToSlide(index)}
              accessibilityLabel={`Go to slide ${index + 1}`}
            />
          ))}
        </View>
      </Animated.View>

      {/* Action Section */}
      <BlurView intensity={80} tint="dark" style={styles.actionContainer}>
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Personalized Metrics */}
        {userMetrics && (
          <View style={styles.personalizedMetrics}>
            <Text style={styles.personalizedTitle}>
              Your Potential with Mosa
            </Text>
            <View style={styles.metricRow}>
              <Text style={styles.personalizedMetric}>
                💰 {userMetrics.potentialIncome.toLocaleString()} ETB/month potential
              </Text>
              <Text style={styles.personalizedMetric}>
                ⚡ {userMetrics.personalizedTimeline.totalDuration} to income
              </Text>
            </View>
          </View>
        )}

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          accessibilityLabel="Continue to skill selection"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.continueButtonText}>
              Discover Your Skills Journey
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </BlurView>
    </SafeAreaView>
  );
};

/**
 * 🏗️ Enterprise Stylesheet
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0c29',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  skipButton: {
    padding: 8,
  },
  skipButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  progressDots: {
    flex: 1,
    marginHorizontal: 20,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  slideContent: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 48,
  },
  slideTitle: {
    fontSize: IS_SMALL_DEVICE ? 24 : 28,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: IS_SMALL_DEVICE ? 32 : 36,
  },
  slideSubtitle: {
    fontSize: IS_SMALL_DEVICE ? 16 : 18,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: IS_SMALL_DEVICE ? 22 : 24,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: IS_SMALL_DEVICE ? 20 : 24,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: IS_SMALL_DEVICE ? 12 : 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  qualityContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  qualityDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  revenueContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  revenueSplit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  revenueItem: {
    alignItems: 'center',
    flex: 1,
  },
  revenueLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
  },
  revenueDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16,
  },
  revenueNote: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  yachiContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  benefitList: {
    width: '100%',
  },
  benefitItem: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    lineHeight: 20,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: '#ffffff',
    width: 24,
  },
  actionContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 20,
  },
  personalizedMetrics: {
    marginBottom: 20,
  },
  personalizedTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  personalizedMetric: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
    textAlign: 'center',
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
  },
});

export default WhyJoinMosa;