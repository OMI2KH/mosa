// learning/daily-streak.jsx

/**
 * 🎯 ENTERPRISE DAILY STREAK SYSTEM
 * Production-ready streak tracking with gamification
 * Features: Streak persistence, motivation algorithms, milestone rewards
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Animated, 
  TouchableOpacity,
  Platform,
  AppState
} from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLearningContext } from '../contexts/learning-context';
import { useQualityMetrics } from '../hooks/use-quality-metrics';
import { Logger } from '../utils/logger';
import { StreakAnalytics } from '../utils/streak-analytics';

// Constants
const STREAK_CONFIG = {
  MAX_STREAK: 365,
  MILESTONES: [3, 7, 14, 30, 60, 90, 180, 365],
  REWARD_MULTIPLIERS: {
    3: 1.05,
    7: 1.10,
    14: 1.15,
    30: 1.25,
    60: 1.35,
    90: 1.50,
    180: 1.75,
    365: 2.00
  },
  TIMEZONE: 'Africa/Addis_Ababa',
  RESET_HOUR: 0, // Midnight Addis Ababa time
  GRACE_PERIOD_HOURS: 6
};

const StreakFlame = ({ size = 24, isActive = true, intensity = 1 }) => {
  const flameAnimation = useMemo(() => new Animated.Value(isActive ? 1 : 0.3), []);

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(flameAnimation, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(flameAnimation, {
            toValue: 0.8,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isActive, flameAnimation]);

  return (
    <Animated.View
      style={[
        styles.flameContainer,
        {
          width: size,
          height: size,
          transform: [{ scale: flameAnimation }],
          opacity: flameAnimation,
        },
      ]}
    >
      <LinearGradient
        colors={isActive ? ['#FFD700', '#FF6B00', '#FF0000'] : ['#666666', '#999999', '#CCCCCC']}
        style={styles.flameGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <View style={[styles.flameInner, { opacity: intensity }]} />
      </LinearGradient>
    </Animated.View>
  );
};

const StreakCalendar = ({ streakData, currentStreak }) => {
  const today = useMemo(() => new Date(), []);
  const last30Days = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date);
    }
    return days;
  }, [today]);

  const getDayStatus = useCallback((date) => {
    const dateString = date.toISOString().split('T')[0];
    const streakDay = streakData.daysCompleted.find(day => 
      day.date === dateString
    );
    
    const isToday = date.toDateString() === today.toDateString();
    const isCompleted = streakDay?.completed;
    const isCurrentStreakDay = streakData.currentStreak > 0 && 
      date >= new Date(streakData.lastActivityDate) &&
      date <= today;

    return { isToday, isCompleted, isCurrentStreakDay };
  }, [streakData, today]);

  return (
    <View style={styles.calendarContainer}>
      <Text style={styles.calendarTitle}>30-Day Progress</Text>
      <View style={styles.calendarGrid}>
        {last30Days.map((date, index) => {
          const { isToday, isCompleted, isCurrentStreakDay } = getDayStatus(date);
          
          return (
            <View key={index} style={styles.calendarDay}>
              <View
                style={[
                  styles.calendarDot,
                  isCompleted && styles.calendarDotCompleted,
                  isCurrentStreakDay && styles.calendarDotCurrentStreak,
                  isToday && styles.calendarDotToday,
                ]}
              >
                {isCompleted && <StreakFlame size={8} intensity={0.8} />}
              </View>
              <Text style={styles.calendarDayLabel}>
                {date.getDate()}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const MilestoneProgress = ({ currentStreak, nextMilestone }) => {
  const progress = useMemo(() => {
    const milestone = STREAK_CONFIG.MILESTONES.find(m => m > currentStreak) || 
                     STREAK_CONFIG.MILESTONES[STREAK_CONFIG.MILESTONES.length - 1];
    const progressPercent = (currentStreak / milestone) * 100;
    return { milestone, progressPercent };
  }, [currentStreak]);

  return (
    <View style={styles.milestoneContainer}>
      <View style={styles.milestoneHeader}>
        <Text style={styles.milestoneTitle}>Next Milestone</Text>
        <Text style={styles.milestoneCount}>
          {currentStreak}/{progress.milestone} days
        </Text>
      </View>
      <View style={styles.progressBar}>
        <LinearGradient
          colors={['#4CAF50', '#45a049']}
          style={[styles.progressFill, { width: `${Math.min(progress.progressPercent, 100)}%` }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>
      <Text style={styles.milestoneReward}>
        {STREAK_CONFIG.REWARD_MULTIPLIERS[progress.milestone]}x Progress Boost
      </Text>
    </View>
  );
};

const StreakMotivation = ({ currentStreak, lastActivity }) => {
  const motivations = useMemo(() => ({
    low: [
      "🔥 Start your journey today!",
      "🎯 Every expert started with day one",
      "💪 Build your wealth mindset now"
    ],
    medium: [
      "🚀 Amazing streak! Keep going!",
      "⭐ You're building powerful habits",
      "📈 Consistency creates mastery"
    ],
    high: [
      "🏆 Legendary streak! You're unstoppable!",
      "💎 Master level consistency",
      "🚀 You're in the top 1% of performers"
    ]
  }), []);

  const getMotivation = useCallback(() => {
    if (currentStreak === 0) return motivations.low[0];
    if (currentStreak < 7) return motivations.low[Math.floor(Math.random() * motivations.low.length)];
    if (currentStreak < 30) return motivations.medium[Math.floor(Math.random() * motivations.medium.length)];
    return motivations.high[Math.floor(Math.random() * motivations.high.length)];
  }, [currentStreak, motivations]);

  const [currentMotivation, setCurrentMotivation] = useState(getMotivation());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMotivation(getMotivation());
    }, 30000); // Change every 30 seconds

    return () => clearInterval(interval);
  }, [getMotivation]);

  return (
    <View style={styles.motivationContainer}>
      <Text style={styles.motivationText}>{currentMotivation}</Text>
    </View>
  );
};

export const DailyStreak = () => {
  const logger = useMemo(() => new Logger('DailyStreak'), []);
  const analytics = useMemo(() => new StreakAnalytics(), []);
  const { 
    streakData, 
    updateStreak, 
    completeDailyGoal,
    learningProgress 
  } = useLearningContext();
  
  const { trackQualityMetric } = useQualityMetrics();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationAnimation = useMemo(() => new Animated.Value(0), []);

  // Memoized computed values
  const computedValues = useMemo(() => {
    const currentMultiplier = Object.entries(STREAK_CONFIG.REWARD_MULTIPLIERS)
      .reverse()
      .find(([milestone]) => streakData.currentStreak >= parseInt(milestone))?.[1] || 1;

    const nextMilestone = STREAK_CONFIG.MILESTONES.find(m => m > streakData.currentStreak);
    const daysUntilNext = nextMilestone ? nextMilestone - streakData.currentStreak : 0;

    return {
      currentMultiplier,
      nextMilestone,
      daysUntilNext,
      hasCompletedToday: streakData.lastActivityDate === new Date().toISOString().split('T')[0]
    };
  }, [streakData]);

  // Streak validation and maintenance
  const validateAndMaintainStreak = useCallback(async () => {
    try {
      const today = new Date();
      const lastActivity = new Date(streakData.lastActivityDate);
      const timeDiff = today.getTime() - lastActivity.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

      if (daysDiff > 1) {
        // Streak broken
        await updateStreak({
          currentStreak: 0,
          longestStreak: Math.max(streakData.longestStreak, streakData.currentStreak),
          lastActivityDate: today.toISOString().split('T')[0],
          daysCompleted: streakData.daysCompleted
        });

        logger.warn('Streak reset due to missed day', {
          previousStreak: streakData.currentStreak,
          daysMissed: daysDiff
        });

        analytics.trackStreakBroken(streakData.currentStreak, daysDiff);
      }
    } catch (error) {
      logger.error('Error maintaining streak', error);
    }
  }, [streakData, updateStreak, logger, analytics]);

  // App state handling for streak checks
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        validateAndMaintainStreak();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Initial validation
    validateAndMaintainStreak();

    return () => {
      subscription.remove();
    };
  }, [validateAndMaintainStreak]);

  const handleCompleteDailyGoal = useCallback(async () => {
    if (isLoading || computedValues.hasCompletedToday) return;

    setIsLoading(true);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const newStreak = streakData.currentStreak + 1;
      
      const updatedStreakData = {
        currentStreak: newStreak,
        longestStreak: Math.max(streakData.longestStreak, newStreak),
        lastActivityDate: today,
        daysCompleted: [
          ...streakData.daysCompleted.filter(day => day.date !== today),
          { date: today, completed: true, timestamp: new Date().toISOString() }
        ]
      };

      // Update streak
      await updateStreak(updatedStreakData);
      
      // Complete daily goal with multiplier
      await completeDailyGoal(computedValues.currentMultiplier);

      // Track analytics
      analytics.trackDailyCompletion(newStreak, computedValues.currentMultiplier);
      trackQualityMetric('daily_consistency', newStreak);

      // Show celebration for milestones
      if (STREAK_CONFIG.MILESTONES.includes(newStreak)) {
        setShowCelebration(true);
        Animated.sequence([
          Animated.timing(celebrationAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.delay(2000),
          Animated.timing(celebrationAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => setShowCelebration(false));
      }

      logger.info('Daily goal completed', {
        streak: newStreak,
        multiplier: computedValues.currentMultiplier
      });

    } catch (error) {
      logger.error('Failed to complete daily goal', error);
      // TODO: Show error toast to user
    } finally {
      setIsLoading(false);
    }
  }, [
    isLoading,
    computedValues,
    streakData,
    updateStreak,
    completeDailyGoal,
    analytics,
    trackQualityMetric,
    logger,
    celebrationAnimation
  ]);

  const CelebrationOverlay = () => {
    if (!showCelebration) return null;

    return (
      <Animated.View 
        style={[
          styles.celebrationOverlay,
          { opacity: celebrationAnimation }
        ]}
      >
        <BlurView
          style={styles.celebrationBlur}
          blurType="light"
          blurAmount={10}
        />
        <View style={styles.celebrationContent}>
          <Text style={styles.celebrationTitle}>🎉 Amazing! 🎉</Text>
          <Text style={styles.celebrationSubtitle}>
            {streakData.currentStreak} Day Streak!
          </Text>
          <Text style={styles.celebrationText}>
            You've unlocked {computedValues.currentMultiplier}x progress boost!
          </Text>
        </View>
      </Animated.View>
    );
  };

  // Performance optimization: Memoize main component
  const StreakDisplay = useMemo(() => (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Daily Streak</Text>
        <View style={styles.streakBadge}>
          <StreakFlame 
            size={32} 
            isActive={streakData.currentStreak > 0}
            intensity={Math.min(streakData.currentStreak / 30, 1)}
          />
          <Text style={styles.streakCount}>
            {streakData.currentStreak}
          </Text>
        </View>
      </View>

      <StreakMotivation 
        currentStreak={streakData.currentStreak}
        lastActivity={streakData.lastActivityDate}
      />

      <MilestoneProgress 
        currentStreak={streakData.currentStreak}
        nextMilestone={computedValues.nextMilestone}
      />

      <StreakCalendar 
        streakData={streakData}
        currentStreak={streakData.currentStreak}
      />

      <TouchableOpacity
        style={[
          styles.completeButton,
          (isLoading || computedValues.hasCompletedToday) && styles.completeButtonDisabled
        ]}
        onPress={handleCompleteDailyGoal}
        disabled={isLoading || computedValues.hasCompletedToday}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={computedValues.hasCompletedToday ? 
            ['#4CAF50', '#45a049'] : 
            ['#FF6B00', '#FF8C00']
          }
          style={styles.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={styles.completeButtonText}>
            {computedValues.hasCompletedToday ? 
              "✅ Today Completed" : 
              `Complete Today's Goal ${computedValues.currentMultiplier}x`
            }
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{streakData.longestStreak}</Text>
          <Text style={styles.statLabel}>Longest Streak</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {Math.round(computedValues.currentMultiplier * 100)}%
          </Text>
          <Text style={styles.statLabel}>Progress Boost</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {computedValues.daysUntilNext || '🎯'}
          </Text>
          <Text style={styles.statLabel}>
            {computedValues.nextMilestone ? 'Days to Next' : 'Max Level'}
          </Text>
        </View>
      </View>

      <CelebrationOverlay />
    </LinearGradient>
  ), [streakData, computedValues, isLoading, handleCompleteDailyGoal, celebrationAnimation, showCelebration]);

  return StreakDisplay;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  flameContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flameGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flameInner: {
    width: '60%',
    height: '60%',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  motivationContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  motivationText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  milestoneContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  milestoneCount: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  milestoneReward: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  calendarContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  calendarTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calendarDay: {
    alignItems: 'center',
    width: '14%',
    marginBottom: 8,
  },
  calendarDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDotCompleted: {
    backgroundColor: 'transparent',
  },
  calendarDotCurrentStreak: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  calendarDotToday: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  calendarDayLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  completeButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  completeButtonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  celebrationBlur: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  celebrationContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    margin: 20,
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B00',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  celebrationSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  celebrationText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
});

export default DailyStreak;