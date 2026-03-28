/**
 * 🏢 MOSA FORGE - Enterprise Lessons Dashboard
 * 📚 Interactive Learning Interface & Progress Tracking
 * 🎯 Duolingo-style Exercise Player & Decision Scenarios
 * 📊 Real-time Progress Analytics & Skill Development
 * 🚀 React Native Enterprise Architecture
 * 
 * @module LessonsDashboard
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  Alert,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5, Ionicons, AntDesign } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🏗️ Enterprise Components
import HeaderNavigation from '../../components/navigation/HeaderNavigation';
import SkillProgressCard from '../../components/learning/SkillProgressCard';
import ExerciseCard from '../../components/learning/ExerciseCard';
import ProgressRing from '../../components/ui/ProgressRing';
import QuickActions from '../../components/ui/QuickActions';
import EmptyState from '../../components/ui/EmptyState';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import ErrorBoundary from '../../components/ui/ErrorBoundary';

// 🏗️ Enterprise Hooks
import useLearningProgress from '../../hooks/useLearningProgress';
import useExerciseEngine from '../../hooks/useExerciseEngine';
import useAnalytics from '../../hooks/useAnalytics';
import useNetworkStatus from '../../hooks/useNetworkStatus';

// 🏗️ Enterprise Services
import LearningService from '../../services/learning-service';
import ProgressService from '../../services/progress-service';
import NotificationService from '../../services/notification-service';

const { width, height } = Dimensions.get('window');

const LessonsDashboard = () => {
  // 🎯 Navigation
  const navigation = useNavigation();
  
  // 🔄 State Management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('in_progress');
  const [dailyStreak, setDailyStreak] = useState(0);
  const [xpPoints, setXpPoints] = useState(0);
  const [lessons, setLessons] = useState([]);
  const [currentSkill, setCurrentSkill] = useState(null);
  const [recommendedExercises, setRecommendedExercises] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  
  // 🏗️ Enterprise Hooks
  const { progress, updateProgress, isLoading: progressLoading } = useLearningProgress();
  const { generateExercise, submitExercise, isLoading: exerciseLoading } = useExerciseEngine();
  const { trackEvent, logError } = useAnalytics();
  const { isConnected, isInternetReachable } = useNetworkStatus();
  
  // 🎯 Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // 🏗️ Service Instances
  const learningService = useRef(null);
  const progressService = useRef(null);
  const notificationService = useRef(null);

  /**
   * 🏗️ INITIALIZE SERVICES
   */
  useEffect(() => {
    initializeServices();
    return () => cleanupServices();
  }, []);

  /**
   * 📊 LOAD DASHBOARD DATA
   */
  useEffect(() => {
    if (learningService.current && progressService.current) {
      loadDashboardData();
    }
  }, [learningService.current, progressService.current]);

  /**
   * 🎯 HANDLE FOCUS EFFECT
   */
  useFocusEffect(
    React.useCallback(() => {
      // 🎬 Entrance Animation
      animateEntrance();
      
      // 📊 Refresh Data
      if (!loading) {
        refreshDashboardData();
      }
      
      // 📈 Track View
      trackEvent('lessons_dashboard_viewed', {
        timestamp: new Date().toISOString()
      });
      
      return () => {
        // Cleanup animations
        fadeAnim.stopAnimation();
        slideAnim.stopAnimation();
      };
    }, [loading])
  );

  /**
   * 🏗️ INITIALIZE ENTERPRISE SERVICES
   */
  const initializeServices = async () => {
    try {
      learningService.current = new LearningService({
        baseURL: process.env.EXPO_PUBLIC_LEARNING_API_URL,
        timeout: 30000
      });

      progressService.current = new ProgressService({
        syncInterval: 300000, // 5 minutes
        offlineStorage: true
      });

      notificationService.current = new NotificationService({
        channelId: 'learning_notifications',
        importance: 'high'
      });

      // 🏥 Service Health Check
      await verifyServicesHealth();

    } catch (error) {
      logError('Service initialization failed', {
        error: error.message,
        component: 'LessonsDashboard'
      });
    }
  };

  /**
   * 🏥 VERIFY SERVICES HEALTH
   */
  const verifyServicesHealth = async () => {
    try {
      const healthChecks = await Promise.allSettled([
        learningService.current?.healthCheck(),
        progressService.current?.healthCheck()
      ]);

      const allHealthy = healthChecks.every(check => 
        check.status === 'fulfilled' && check.value?.healthy
      );

      if (!allHealthy) {
        Alert.alert(
          'Service Warning',
          'Some learning services are temporarily unavailable. Offline mode activated.',
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      logError('Service health check failed', {
        error: error.message
      });
    }
  };

  /**
   * 📊 LOAD DASHBOARD DATA
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      trackEvent('lessons_dashboard_data_loading_started');

      // ⚡ Parallel Data Loading
      const [
        progressData,
        lessonsData,
        skillData,
        exercisesData,
        streakData,
        achievementsData
      ] = await Promise.allSettled([
        progressService.current.getCurrentProgress(),
        learningService.current.getActiveLessons(),
        learningService.current.getCurrentSkill(),
        learningService.current.getRecommendedExercises(),
        progressService.current.getDailyStreak(),
        progressService.current.getRecentAchievements()
      ]);

      // 🎯 Process Results
      if (progressData.status === 'fulfilled') {
        updateProgress(progressData.value);
      }

      if (lessonsData.status === 'fulfilled') {
        setLessons(lessonsData.value);
      }

      if (skillData.status === 'fulfilled') {
        setCurrentSkill(skillData.value);
      }

      if (exercisesData.status === 'fulfilled') {
        setRecommendedExercises(exercisesData.value);
      }

      if (streakData.status === 'fulfilled') {
        setDailyStreak(streakData.value);
      }

      if (achievementsData.status === 'fulfilled') {
        setAchievements(achievementsData.value);
      }

      // 💾 Calculate XP Points
      calculateXpPoints();

      trackEvent('lessons_dashboard_data_loading_completed', {
        lessonsCount: lessonsData.value?.length || 0,
        exercisesCount: exercisesData.value?.length || 0
      });

    } catch (error) {
      logError('Dashboard data loading failed', {
        error: error.message,
        stack: error.stack
      });
      
      Alert.alert(
        'Loading Error',
        'Unable to load learning data. Please try again.',
        [{ text: 'Retry', onPress: loadDashboardData }]
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🔄 REFRESH DASHBOARD DATA
   */
  const refreshDashboardData = async () => {
    try {
      setRefreshing(true);
      trackEvent('lessons_dashboard_refresh_started');

      await Promise.all([
        loadDashboardData(),
        new Promise(resolve => setTimeout(resolve, 1000)) // Minimum refresh time
      ]);

      trackEvent('lessons_dashboard_refresh_completed');
      
      // 🎉 Show success feedback
      notificationService.current.showSuccess('Dashboard refreshed successfully');

    } catch (error) {
      logError('Dashboard refresh failed', {
        error: error.message
      });
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * 🎯 CALCULATE XP POINTS
   */
  const calculateXpPoints = () => {
    const baseXp = (progress?.completedLessons || 0) * 10;
    const streakBonus = dailyStreak * 5;
    const achievementBonus = achievements.length * 25;
    const totalXp = baseXp + streakBonus + achievementBonus;
    
    setXpPoints(totalXp);
  };

  /**
   * 🎬 ANIMATE ENTRANCE
   */
  const animateEntrance = () => {
    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.95);

    // Parallel entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true
      })
    ]).start();
  };

  /**
   * 🎓 HANDLE LESSON SELECTION
   */
  const handleLessonSelect = async (lesson) => {
    try {
      trackEvent('lesson_selected', {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        skillId: lesson.skillId
      });

      // 🎯 Check lesson prerequisites
      const prerequisitesMet = await checkPrerequisites(lesson);
      
      if (!prerequisitesMet) {
        Alert.alert(
          'Prerequisites Required',
          'Complete previous lessons to unlock this lesson.',
          [{ text: 'OK' }]
        );
        return;
      }

      // 🚀 Navigate to lesson
      navigation.navigate('LessonDetail', {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        skillId: lesson.skillId
      });

    } catch (error) {
      logError('Lesson selection failed', {
        error: error.message,
        lessonId: lesson.id
      });
      
      Alert.alert(
        'Error',
        'Unable to open lesson. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * 🎯 CHECK PREREQUISITES
   */
  const checkPrerequisites = async (lesson) => {
    try {
      if (!lesson.prerequisites || lesson.prerequisites.length === 0) {
        return true;
      }

      const progress = await progressService.current.getLessonProgress(lesson.prerequisites);
      return progress.every(p => p.completed);

    } catch (error) {
      logError('Prerequisite check failed', {
        error: error.message,
        lessonId: lesson.id
      });
      return false;
    }
  };

  /**
   * 🎮 HANDLE EXERCISE START
   */
  const handleExerciseStart = async (exercise) => {
    try {
      trackEvent('exercise_started', {
        exerciseId: exercise.id,
        exerciseType: exercise.type,
        difficulty: exercise.difficulty
      });

      // 🚀 Generate exercise content
      const exerciseContent = await generateExercise({
        skillId: exercise.skillId,
        difficulty: exercise.difficulty,
        type: exercise.type
      });

      // 🎯 Navigate to exercise player
      navigation.navigate('ExercisePlayer', {
        exercise: exerciseContent,
        onComplete: handleExerciseComplete
      });

    } catch (error) {
      logError('Exercise start failed', {
        error: error.message,
        exerciseId: exercise.id
      });
      
      Alert.alert(
        'Exercise Error',
        'Unable to start exercise. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * ✅ HANDLE EXERCISE COMPLETION
   */
  const handleExerciseComplete = async (result) => {
    try {
      trackEvent('exercise_completed', {
        exerciseId: result.exerciseId,
        score: result.score,
        timeSpent: result.timeSpent
      });

      // 📊 Submit exercise result
      const submissionResult = await submitExercise(result);

      if (submissionResult.success) {
        // 🎉 Show celebration for high scores
        if (result.score >= 80) {
          triggerCelebration();
        }

        // 📈 Update local progress
        await updateLocalProgress(submissionResult.progress);

        // 🔄 Refresh dashboard
        refreshDashboardData();

        // 📧 Show success notification
        notificationService.current.showSuccess(
          `Exercise completed! +${submissionResult.xpEarned} XP earned`
        );
      }

    } catch (error) {
      logError('Exercise completion failed', {
        error: error.message,
        result: result
      });
    }
  };

  /**
   * 🎉 TRIGGER CELEBRATION
   */
  const triggerCelebration = () => {
    setShowCelebration(true);
    
    // Auto-hide celebration
    setTimeout(() => {
      setShowCelebration(false);
    }, 3000);
  };

  /**
   * 📈 UPDATE LOCAL PROGRESS
   */
  const updateLocalProgress = async (newProgress) => {
    try {
      // Update progress state
      updateProgress(newProgress);

      // Sync with local storage
      await AsyncStorage.setItem(
        'learning_progress',
        JSON.stringify(newProgress)
      );

    } catch (error) {
      logError('Local progress update failed', {
        error: error.message
      });
    }
  };

  /**
   * 🚀 HANDLE QUICK ACTION
   */
  const handleQuickAction = (action) => {
    trackEvent('quick_action_triggered', { action });

    switch (action) {
      case 'continue_learning':
        continueLastLesson();
        break;
      case 'practice_skills':
        navigation.navigate('SkillPractice');
        break;
      case 'view_achievements':
        navigation.navigate('Achievements');
        break;
      case 'set_goals':
        navigation.navigate('GoalSetting');
        break;
    }
  };

  /**
   * 📚 CONTINUE LAST LESSON
   */
  const continueLastLesson = () => {
    const lastLesson = lessons.find(lesson => 
      lesson.status === 'in_progress' || 
      lesson.lastAccessed
    );

    if (lastLesson) {
      handleLessonSelect(lastLesson);
    } else if (lessons.length > 0) {
      handleLessonSelect(lessons[0]);
    } else {
      Alert.alert(
        'No Lessons Available',
        'Start by selecting a skill to learn.',
        [
          { text: 'Browse Skills', onPress: () => navigation.navigate('Skills') },
          { text: 'Cancel' }
        ]
      );
    }
  };

  /**
   * 🧹 CLEANUP SERVICES
   */
  const cleanupServices = () => {
    learningService.current?.cleanup();
    progressService.current?.cleanup();
    notificationService.current?.cleanup();
  };

  /**
   * 📱 RENDER LOADING STATE
   */
  const renderLoading = () => (
    <LoadingOverlay
      message="Loading your learning dashboard..."
      showProgress={true}
    />
  );

  /**
   * 📊 RENDER EMPTY STATE
   */
  const renderEmptyState = () => (
    <EmptyState
      icon="book-open"
      title="Start Your Learning Journey"
      message="Select a skill to begin your 4-month transformation"
      actionLabel="Browse Skills"
      onAction={() => navigation.navigate('Skills')}
    />
  );

  /**
   * 🎯 RENDER HEADER
   */
  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.headerContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <HeaderNavigation
        title="Learning Dashboard"
        showBack={false}
        rightActions={[
          {
            icon: 'notifications',
            onPress: () => navigation.navigate('Notifications'),
            badgeCount: 3
          },
          {
            icon: 'settings',
            onPress: () => navigation.navigate('Settings')
          }
        ]}
      />

      {/* 🎯 Progress Overview */}
      <View style={styles.progressOverview}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Daily Streak</Text>
            <View style={styles.streakContainer}>
              <MaterialIcons name="local-fire-department" size={20} color="#FF6B35" />
              <Text style={styles.statValue}>{dailyStreak} days</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>XP Points</Text>
            <View style={styles.xpContainer}>
              <FontAwesome5 name="medal" size={18} color="#FFD700" />
              <Text style={styles.statValue}>{xpPoints.toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Completed</Text>
            <View style={styles.completedContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#4CD964" />
              <Text style={styles.statValue}>
                {progress?.completedLessons || 0}/{progress?.totalLessons || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* 🎯 Overall Progress Ring */}
        <View style={styles.overallProgressContainer}>
          <ProgressRing
            size={80}
            strokeWidth={8}
            progress={progress?.overallProgress || 0}
            color="#6C63FF"
            showLabel={true}
            labelStyle={styles.progressLabel}
          />
          <View style={styles.progressTextContainer}>
            <Text style={styles.progressTitle}>Overall Progress</Text>
            <Text style={styles.progressSubtitle}>4-Month Journey</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  /**
   * 🎯 RENDER CURRENT SKILL
   */
  const renderCurrentSkill = () => {
    if (!currentSkill) return null;

    return (
      <Animated.View 
        style={[
          styles.skillSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <SkillProgressCard
          skill={currentSkill}
          onPress={() => navigation.navigate('SkillDetail', { skillId: currentSkill.id })}
          showActions={true}
        />
      </Animated.View>
    );
  };

  /**
   * 📚 RENDER LESSONS SECTION
   */
  const renderLessonsSection = () => (
    <Animated.View 
      style={[
        styles.sectionContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Lessons</Text>
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => navigation.navigate('AllLessons')}
        >
          <Text style={styles.viewAllText}>View All</Text>
          <AntDesign name="right" size={16} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      {lessons.length === 0 ? (
        <View style={styles.emptyLessonsContainer}>
          <Text style={styles.emptyLessonsText}>No active lessons</Text>
          <TouchableOpacity 
            style={styles.browseSkillsButton}
            onPress={() => navigation.navigate('Skills')}
          >
            <Text style={styles.browseSkillsText}>Browse Skills</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.lessonsScrollContainer}
        >
          {lessons.slice(0, 5).map((lesson, index) => (
            <TouchableOpacity
              key={lesson.id}
              style={styles.lessonCard}
              onPress={() => handleLessonSelect(lesson)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#6C63FF', '#8A84FF']}
                style={styles.lessonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.lessonIconContainer}>
                  <MaterialIcons 
                    name={getLessonIcon(lesson.type)} 
                    size={24} 
                    color="#FFFFFF" 
                  />
                </View>
                <Text style={styles.lessonTitle} numberOfLines={2}>
                  {lesson.title}
                </Text>
                <View style={styles.lessonFooter}>
                  <Text style={styles.lessonDuration}>
                    {lesson.duration} min
                  </Text>
                  <View style={styles.lessonStatus}>
                    <View style={[
                      styles.statusIndicator,
                      { backgroundColor: getStatusColor(lesson.status) }
                    ]} />
                    <Text style={styles.statusText}>
                      {lesson.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );

  /**
   * 🎮 RENDER EXERCISES SECTION
   */
  const renderExercisesSection = () => (
    <Animated.View 
      style={[
        styles.sectionContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Practice Exercises</Text>
        <Text style={styles.sectionSubtitle}>Duolingo-style interactive learning</Text>
      </View>

      {recommendedExercises.length === 0 ? (
        <View style={styles.emptyExercisesContainer}>
          <ActivityIndicator size="small" color="#6C63FF" />
          <Text style={styles.emptyExercisesText}>
            Generating personalized exercises...
          </Text>
        </View>
      ) : (
        <View style={styles.exercisesGrid}>
          {recommendedExercises.slice(0, 4).map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              onPress={() => handleExerciseStart(exercise)}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );

  /**
   * ⚡ RENDER QUICK ACTIONS
   */
  const renderQuickActions = () => (
    <Animated.View 
      style={[
        styles.quickActionsContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <QuickActions
        actions={[
          {
            id: 'continue_learning',
            icon: 'play-circle',
            label: 'Continue',
            color: '#6C63FF'
          },
          {
            id: 'practice_skills',
            icon: 'dumbbell',
            label: 'Practice',
            color: '#FF6B35'
          },
          {
            id: 'view_achievements',
            icon: 'trophy',
            label: 'Achievements',
            color: '#FFD700'
          },
          {
            id: 'set_goals',
            icon: 'target',
            label: 'Goals',
            color: '#4CD964'
          }
        ]}
        onActionPress={handleQuickAction}
      />
    </Animated.View>
  );

  /**
   * 🎉 RENDER CELEBRATION
   */
  const renderCelebration = () => {
    if (!showCelebration) return null;

    return (
      <View style={styles.celebrationOverlay}>
        <LinearGradient
          colors={['rgba(108, 99, 255, 0.95)', 'rgba(255, 107, 53, 0.95)']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.celebrationContent}>
          <MaterialIcons name="celebration" size={60} color="#FFFFFF" />
          <Text style={styles.celebrationTitle}>Excellent Work!</Text>
          <Text style={styles.celebrationMessage}>
            You've completed an exercise with high score!
          </Text>
          <Text style={styles.celebrationXp}>+50 XP Earned</Text>
        </View>
      </View>
    );
  };

  /**
   * 🔧 UTILITY FUNCTIONS
   */
  const getLessonIcon = (type) => {
    switch (type) {
      case 'theory': return 'menu-book';
      case 'practice': return 'code';
      case 'quiz': return 'quiz';
      case 'project': return 'assignment';
      default: return 'school';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#4CD964';
      case 'in_progress': return '#FFD700';
      case 'pending': return '#FF6B35';
      default: return '#8E8E93';
    }
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F8F9FF', '#FFFFFF']}
          style={StyleSheet.absoluteFillObject}
        />

        {loading ? (
          renderLoading()
        ) : (
          <Animated.ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refreshDashboardData}
                colors={['#6C63FF']}
                tintColor="#6C63FF"
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* 🎯 Header & Progress */}
            {renderHeader()}

            {/* ⚡ Quick Actions */}
            {renderQuickActions()}

            {/* 🎯 Current Skill */}
            {renderCurrentSkill()}

            {/* 📚 Lessons Section */}
            {renderLessonsSection()}

            {/* 🎮 Exercises Section */}
            {renderExercisesSection()}

            {/* 📱 Network Status Indicator */}
            {!isConnected && (
              <View style={styles.networkStatus}>
                <MaterialIcons name="wifi-off" size={16} color="#FF6B35" />
                <Text style={styles.networkStatusText}>
                  Offline Mode - Progress will sync when online
                </Text>
              </View>
            )}

            {/* 📊 Analytics Footer */}
            <View style={styles.analyticsFooter}>
              <Text style={styles.analyticsText}>
                {lessons.length} lessons • {recommendedExercises.length} exercises • {dailyStreak} day streak
              </Text>
            </View>
          </Animated.ScrollView>
        )}

        {/* 🎉 Celebration Overlay */}
        {renderCelebration()}

        {/* 🚀 Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('SkillSelection')}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#6C63FF', '#8A84FF']}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

/**
 * 🎨 ENTERPRISE STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 100
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20
  },
  progressOverview: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  statItem: {
    alignItems: 'center',
    flex: 1
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 6,
    fontFamily: 'Inter-Regular'
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: 'Inter-Bold'
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E5EA'
  },
  overallProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  progressTextContainer: {
    flex: 1
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: 'Inter-Bold',
    marginBottom: 4
  },
  progressSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: 'Inter-Regular'
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
    fontFamily: 'Inter-SemiBold'
  },
  skillSection: {
    paddingHorizontal: 20,
    marginTop: 20
  },
  sectionContainer: {
    marginTop: 24,
    paddingHorizontal: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: 'Inter-Bold'
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: 'Inter-Regular'
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  viewAllText: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold'
  },
  lessonsScrollContainer: {
    paddingRight: 20
  },
  lessonCard: {
    width: width * 0.6,
    height: 160,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5
  },
  lessonGradient: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between'
  },
  lessonIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    lineHeight: 22,
    marginBottom: 12
  },
  lessonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  lessonDuration: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Inter-Regular'
  },
  lessonStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'Inter-Regular',
    textTransform: 'capitalize'
  },
  emptyLessonsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed'
  },
  emptyLessonsText: {
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: 'Inter-Regular',
    marginBottom: 12
  },
  browseSkillsButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12
  },
  browseSkillsText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold'
  },
  exercisesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  emptyExercisesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  emptyExercisesText: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: 'Inter-Regular',
    marginTop: 12
  },
  quickActionsContainer: {
    marginTop: 20,
    paddingHorizontal: 20
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    marginHorizontal: 20,
    borderRadius: 12
  },
  networkStatusText: {
    fontSize: 12,
    color: '#FF6B35',
    fontFamily: 'Inter-Regular'
  },
  analyticsFooter: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20
  },
  analyticsText: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'Inter-Regular'
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  celebrationContent: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10
  },
  celebrationTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8
  },
  celebrationMessage: {
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16
  },
  celebrationXp: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFD700',
    fontFamily: 'Inter-Bold'
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10
  },
  fabGradient: {
    flex: 1,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default LessonsDashboard;