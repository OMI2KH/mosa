/**
 * 🏢 MOSA FORGE - Enterprise Wealth Mindset Layout
 * 💰 Wealth Consciousness Development Framework
 * 🧠 Financial Psychology & Mindset Transformation
 * 🚀 Multi-Phase Wealth Building Journey
 * 
 * @module WealthMindsetLayout
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  Platform,
  BackHandler,
  AppState
} from 'react-native';
import { 
  useNavigation, 
  useRoute, 
  useFocusEffect 
} from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// 🏗️ Enterprise Components
import WealthProgressTracker from '../../components/wealth/WealthProgressTracker';
import MindsetAssessment from '../../components/wealth/MindsetAssessment';
import FinancialPsychologyModule from '../../components/wealth/FinancialPsychologyModule';
import WealthCoachAI from '../../components/wealth/WealthCoachAI';
import MicroHabitTracker from '../../components/wealth/MicroHabitTracker';

// 🔧 Enterprise Utilities
import WealthMetrics from '../../utils/wealth-metrics';
import MindsetAnalytics from '../../utils/mindset-analytics';
import AchievementSystem from '../../utils/achievement-system';
import NotificationManager from '../../utils/notification-manager';

// 🎯 Enterprise Context
import { useWealthContext } from '../../contexts/WealthContext';
import { useUserContext } from '../../contexts/UserContext';
import { useLearningContext } from '../../contexts/LearningContext';

const WealthMindsetLayout = ({ children }) => {
  // 🔧 Navigation & Routing
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  // 🎯 Enterprise Contexts
  const { 
    wealthScore, 
    mindsetPhase, 
    progress, 
    updateProgress,
    dailyHabits,
    completeDailyHabit,
    wealthMilestones,
    unlockMilestone
  } = useWealthContext();

  const { user, profile, updateUserStats } = useUserContext();
  const { learningProgress, updateLearningProgress } = useLearningContext();

  // 🚀 State Management
  const [currentPhase, setCurrentPhase] = useState(mindsetPhase || 'foundation');
  const [isAssessmentActive, setIsAssessmentActive] = useState(false);
  const [showCoachAI, setShowCoachAI] = useState(false);
  const [dailyChallenge, setDailyChallenge] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [achievements, setAchievements] = useState([]);

  // 🎨 Animation Values
  const scrollY = useSharedValue(0);
  const headerOpacity = useSharedValue(1);
  const progressAnimation = useSharedValue(progress);
  const wealthScoreAnimation = useSharedValue(wealthScore);

  // 📊 Wealth Metrics
  const wealthMetrics = new WealthMetrics();
  const mindsetAnalytics = new MindsetAnalytics();
  const achievementSystem = new AchievementSystem();
  const notificationManager = new NotificationManager();

  /**
   * 🏗️ INITIALIZE WEALTH MINDSET SYSTEM
   */
  useEffect(() => {
    initializeWealthMindset();
    
    // 🔄 Set up daily challenge
    setupDailyChallenge();
    
    // 📱 Set up notifications
    setupNotifications();
    
    // 🎯 Load achievements
    loadAchievements();

    return () => {
      cleanup();
    };
  }, []);

  /**
   * 🔄 HANDLE APP STATE CHANGES
   */
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      appStateSubscription.remove();
    };
  }, []);

  /**
   * 🔙 HANDLE BACK NAVIGATION
   */
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return true;
        }
        
        // 🚨 Prevent exit during active assessment
        if (isAssessmentActive) {
          showExitWarning();
          return true;
        }
        
        return false;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => backHandler.remove();
    }, [navigation, isAssessmentActive])
  );

  /**
   * 🏗️ INITIALIZE WEALTH MINDSET
   */
  const initializeWealthMindset = async () => {
    try {
      // 📊 Load user's wealth profile
      await loadWealthProfile();
      
      // 🎯 Set up initial phase
      await determineInitialPhase();
      
      // 💡 Initialize coaching system
      await initializeCoachingSystem();
      
      // 📈 Start progress tracking
      startProgressTracking();

    } catch (error) {
      console.error('Failed to initialize wealth mindset:', error);
      // 🚨 Fallback to basic initialization
      initializeFallback();
    }
  };

  /**
   * 📊 LOAD WEALTH PROFILE
   */
  const loadWealthProfile = async () => {
    try {
      const profileData = await wealthMetrics.getUserWealthProfile(user.id);
      
      if (profileData) {
        // 🎯 Update context with profile data
        updateProgress(profileData.progress);
        setCurrentPhase(profileData.currentPhase);
        
        // 🎨 Animate wealth score
        wealthScoreAnimation.value = withSpring(
          profileData.wealthScore,
          { damping: 15, stiffness: 100 }
        );
      }
    } catch (error) {
      console.error('Failed to load wealth profile:', error);
    }
  };

  /**
   * 🎯 DETERMINE INITIAL PHASE
   */
  const determineInitialPhase = async () => {
    try {
      const assessmentResults = await mindsetAnalytics.assessMindsetLevel(user.id);
      
      if (assessmentResults.completed) {
        setCurrentPhase(assessmentResults.recommendedPhase);
      } else {
        // 🚀 Start with foundation phase
        setCurrentPhase('foundation');
        setIsAssessmentActive(true);
      }
    } catch (error) {
      console.error('Failed to determine initial phase:', error);
      setCurrentPhase('foundation');
    }
  };

  /**
   * 💡 INITIALIZE COACHING SYSTEM
   */
  const initializeCoachingSystem = async () => {
    try {
      // 🎯 Check for pending coach sessions
      const pendingSessions = await notificationManager.getPendingSessions('wealth_coach');
      
      if (pendingSessions.length > 0) {
        setShowCoachAI(true);
      }
    } catch (error) {
      console.error('Failed to initialize coaching system:', error);
    }
  };

  /**
   * 🎯 SET UP DAILY CHALLENGE
   */
  const setupDailyChallenge = async () => {
    try {
      const challenge = await achievementSystem.getDailyWealthChallenge();
      
      if (challenge) {
        setDailyChallenge(challenge);
        
        // 📱 Schedule notifications
        await notificationManager.scheduleChallengeReminders(challenge);
      }
    } catch (error) {
      console.error('Failed to set up daily challenge:', error);
    }
  };

  /**
   * 📱 SET UP NOTIFICATIONS
   */
  const setupNotifications = async () => {
    try {
      const userNotifications = await notificationManager.getUserNotifications(
        user.id,
        'wealth_mindset'
      );
      
      setNotifications(userNotifications);
      
      // 🔔 Set up notification listener
      notificationManager.setupNotificationListener(handleNotification);
    } catch (error) {
      console.error('Failed to set up notifications:', error);
    }
  };

  /**
   * 🏆 LOAD ACHIEVEMENTS
   */
  const loadAchievements = async () => {
    try {
      const userAchievements = await achievementSystem.getUserAchievements(user.id);
      setAchievements(userAchievements);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  };

  /**
   * 📈 START PROGRESS TRACKING
   */
  const startProgressTracking = () => {
    // 🕐 Update progress every minute
    const progressInterval = setInterval(async () => {
      const updatedProgress = await wealthMetrics.calculateProgress(user.id);
      progressAnimation.value = withSpring(updatedProgress, {
        damping: 20,
        stiffness: 90
      });
    }, 60000);

    return () => clearInterval(progressInterval);
  };

  /**
   * 📱 HANDLE NOTIFICATION
   */
  const handleNotification = (notification) => {
    // 🎯 Handle different notification types
    switch (notification.type) {
      case 'challenge_reminder':
        handleChallengeReminder(notification);
        break;
      case 'achievement_unlocked':
        handleAchievementUnlocked(notification);
        break;
      case 'coach_session':
        handleCoachSession(notification);
        break;
      case 'progress_update':
        handleProgressUpdate(notification);
        break;
    }
  };

  /**
   * 🎯 HANDLE CHALLENGE REMINDER
   */
  const handleChallengeReminder = (notification) => {
    // 💡 Show challenge reminder modal
    setDailyChallenge(notification.data.challenge);
  };

  /**
   * 🏆 HANDLE ACHIEVEMENT UNLOCKED
   */
  const handleAchievementUnlocked = (notification) => {
    // 🎉 Show achievement celebration
    const newAchievement = notification.data.achievement;
    setAchievements(prev => [...prev, newAchievement]);
    
    // 🎨 Animate celebration
    triggerAchievementCelebration(newAchievement);
  };

  /**
   * 💡 HANDLE COACH SESSION
   */
  const handleCoachSession = (notification) => {
    // 👨‍🏫 Show coach AI interface
    setShowCoachAI(true);
  };

  /**
   * 📈 HANDLE PROGRESS UPDATE
   */
  const handleProgressUpdate = (notification) => {
    // 📊 Update progress display
    const newProgress = notification.data.progress;
    progressAnimation.value = withSpring(newProgress, {
      damping: 20,
      stiffness: 90
    });
  };

  /**
   * 📱 HANDLE APP STATE CHANGE
   */
  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      // 🔄 Refresh data when app becomes active
      refreshWealthData();
    }
  };

  /**
   * 🔄 REFRESH WEALTH DATA
   */
  const refreshWealthData = async () => {
    try {
      await loadWealthProfile();
      await setupDailyChallenge();
      await loadAchievements();
    } catch (error) {
      console.error('Failed to refresh wealth data:', error);
    }
  };

  /**
   * 🚨 SHOW EXIT WARNING
   */
  const showExitWarning = () => {
    // ⚠️ Show warning modal
    alert(
      'Assessment in Progress',
      'You are currently in an assessment. Are you sure you want to exit?',
      [
        { text: 'Continue Assessment', style: 'cancel' },
        { text: 'Exit', onPress: () => navigation.goBack() }
      ]
    );
  };

  /**
   * 🎉 TRIGGER ACHIEVEMENT CELEBRATION
   */
  const triggerAchievementCelebration = (achievement) => {
    // 🎨 Add celebration animation logic here
    console.log('Celebrating achievement:', achievement);
  };

  /**
   * 🏗️ INITIALIZE FALLBACK
   */
  const initializeFallback = () => {
    // 🚀 Basic initialization for error recovery
    setCurrentPhase('foundation');
    progressAnimation.value = 0;
    wealthScoreAnimation.value = 0;
  };

  /**
   * 🧹 CLEANUP
   */
  const cleanup = () => {
    notificationManager.cleanup();
  };

  /**
   * 🎨 ANIMATED HEADER STYLE
   */
  const animatedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 50, 100],
      [1, 0.8, 0.6],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [0, 100],
      [0, -50],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }]
    };
  });

  /**
   * 🎨 ANIMATED PROGRESS STYLE
   */
  const animatedProgressStyle = useAnimatedStyle(() => {
    return {
      width: `${progressAnimation.value * 100}%`
    };
  });

  /**
   * 🎨 ANIMATED WEALTH SCORE STYLE
   */
  const animatedWealthScoreStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      wealthScoreAnimation.value,
      [0, 10, 100],
      [1, 1.1, 1.2],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale }]
    };
  });

  /**
   * 🎨 GET PHASE GRADIENT
   */
  const getPhaseGradient = () => {
    switch (currentPhase) {
      case 'foundation':
        return ['#4A90E2', '#63B8FF'];
      case 'growth':
        return ['#FFA726', '#FFB74D'];
      case 'mastery':
        return ['#66BB6A', '#81C784'];
      case 'legacy':
        return ['#AB47BC', '#BA68C8'];
      default:
        return ['#4A90E2', '#63B8FF'];
    }
  };

  /**
   * 🎨 GET PHASE ICON
   */
  const getPhaseIcon = () => {
    switch (currentPhase) {
      case 'foundation':
        return 'construct';
      case 'growth':
        return 'trending-up';
      case 'mastery':
        return 'trophy';
      case 'legacy':
        return 'people';
      default:
        return 'construct';
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#000"
        translucent={true}
      />

      {/* 🌈 BACKGROUND GRADIENT */}
      <LinearGradient
        colors={getPhaseGradient()}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* 🎯 ENTERPRISE WEALTH LAYOUT */}
      <View style={styles.container}>
        {/* 📱 HEADER SECTION */}
        <Animated.View style={[styles.header, animatedHeaderStyle]}>
          <View style={styles.headerContent}>
            {/* 🏢 LOGO & TITLE */}
            <View style={styles.brandSection}>
              <Ionicons 
                name="diamond" 
                size={24} 
                color="#FFFFFF" 
                style={styles.logo}
              />
              <View>
                <Text style={styles.appTitle}>MOSA FORGE</Text>
                <Text style={styles.sectionTitle}>Wealth Mindset</Text>
              </View>
            </View>

            {/* ⭐ PHASE INDICATOR */}
            <View style={styles.phaseIndicator}>
              <Ionicons 
                name={getPhaseIcon()} 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.phaseText}>
                {currentPhase.toUpperCase()} PHASE
              </Text>
            </View>
          </View>

          {/* 📊 PROGRESS TRACKER */}
          <WealthProgressTracker
            progress={progressAnimation}
            wealthScore={wealthScoreAnimation}
            currentPhase={currentPhase}
            style={styles.progressTracker}
          />
        </Animated.View>

        {/* 🎓 MAIN CONTENT AREA */}
        <View style={styles.contentContainer}>
          {/* 🧠 MINDSET ASSESSMENT (Conditional) */}
          {isAssessmentActive && (
            <MindsetAssessment
              onComplete={(results) => {
                setIsAssessmentActive(false);
                setCurrentPhase(results.recommendedPhase);
                updateProgress(results.initialProgress);
              }}
              onSkip={() => {
                setIsAssessmentActive(false);
                setCurrentPhase('foundation');
              }}
            />
          )}

          {/* 💰 WEALTH MINDSET CONTENT */}
          {!isAssessmentActive && (
            <>
              {/* 🎯 DAILY HABIT TRACKER */}
              <MicroHabitTracker
                habits={dailyHabits}
                onCompleteHabit={completeDailyHabit}
                dailyChallenge={dailyChallenge}
              />

              {/* 🧠 FINANCIAL PSYCHOLOGY MODULES */}
              <FinancialPsychologyModule
                currentPhase={currentPhase}
                progress={progress}
                onModuleComplete={(moduleId) => {
                  // 📈 Update learning progress
                  updateLearningProgress('wealth_mindset', moduleId);
                  
                  // 🎯 Check for phase completion
                  checkPhaseCompletion();
                }}
              />

              {/* 👨‍🏫 WEALTH COACH AI (Conditional) */}
              {showCoachAI && (
                <WealthCoachAI
                  onClose={() => setShowCoachAI(false)}
                  currentPhase={currentPhase}
                  progress={progress}
                />
              )}

              {/* 🎓 MAIN ROUTER CONTENT */}
              <View style={styles.routerContent}>
                {children}
              </View>
            </>
          )}
        </View>

        {/* 🏆 ACHIEVEMENTS BADGE */}
        {achievements.length > 0 && (
          <View style={styles.achievementsBadge}>
            <Ionicons name="trophy" size={20} color="#FFD700" />
            <Text style={styles.achievementsCount}>
              {achievements.length}
            </Text>
          </View>
        )}

        {/* 🔔 NOTIFICATIONS INDICATOR */}
        {notifications.length > 0 && (
          <View style={styles.notificationsBadge}>
            <Ionicons name="notifications" size={20} color="#FF3B30" />
            <Text style={styles.notificationsCount}>
              {notifications.length}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

/**
 * 🎨 ENTERPRISE STYLES
 */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    marginRight: 10,
  },
  appTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
  },
  phaseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  phaseText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  progressTracker: {
    marginTop: 10,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  routerContent: {
    flex: 1,
    marginTop: 20,
  },
  achievementsBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 70,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  achievementsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD700',
    marginLeft: 4,
  },
  notificationsBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 70,
    right: 70,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  notificationsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF3B30',
    marginLeft: 4,
  },
});

export default WealthMindsetLayout;

/**
 * 🎯 COMPONENT PROPS INTERFACE
 */
WealthMindsetLayout.propTypes = {
  children: PropTypes.node,
};

/**
 * 🎯 DEFAULT PROPS
 */
WealthMindsetLayout.defaultProps = {
  children: null,
};