/**
 * 🏢 MOSA FORGE - Enterprise Skill Roadmap Component
 * 🗺️ Interactive Learning Path Visualization & Progress Tracking
 * 🎯 Personalized Skill Progression & Milestone Management
 * 📊 Real-time Progress Analytics & Performance Insights
 * 🚀 React Native Enterprise Architecture
 * 
 * @module SkillRoadmap
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator
} from 'react-native';
import {
  LineChart,
  BarChart,
  PieChart
} from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

// 🏗️ Enterprise Dependencies
import EnterpriseLogger from '../../utils/enterprise-logger';
import AnalyticsService from '../../services/analytics-service';
import ProgressTracking from '../../utils/progress-tracking';
import SkillAPI from '../../services/skill-api';
import { useAuth } from '../../contexts/auth-context';
import { useLearning } from '../../contexts/learning-context';

// 📱 Constants
const { width, height } = Dimensions.get('window');
const CHART_WIDTH = width - 40;
const CHART_HEIGHT = 220;

const SkillRoadmap = ({ route }) => {
  const { skillId, skillName, skillCategory } = route.params || {};
  
  // 🔐 Context & State
  const { user } = useAuth();
  const { currentCourse, progressData } = useLearning();
  const navigation = useNavigation();
  
  // 🎯 State Management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roadmapData, setRoadmapData] = useState(null);
  const [progressMetrics, setProgressMetrics] = useState(null);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [expandedModules, setExpandedModules] = useState({});
  const [animations] = useState({
    fadeAnim: new Animated.Value(0),
    slideAnim: new Animated.Value(50),
    scaleAnim: new Animated.Value(0.95)
  });

  // 🏗️ Service Initialization
  const logger = useMemo(() => new EnterpriseLogger({
    service: 'skill-roadmap',
    module: 'frontend',
    environment: __DEV__ ? 'development' : 'production'
  }), []);

  const analytics = useMemo(() => new AnalyticsService({
    userId: user?.id,
    skillId,
    context: 'skill_roadmap'
  }), [user?.id, skillId]);

  // 🔄 Lifecycle Management
  useFocusEffect(
    useCallback(() => {
      loadRoadmapData();
      analytics.trackEvent('PAGE_VIEW', { page: 'skill_roadmap', skillId });
      
      return () => {
        analytics.trackEvent('PAGE_LEAVE', { page: 'skill_roadmap', duration: 0 });
      };
    }, [skillId])
  );

  /**
   * 📊 LOAD ROADMAP DATA
   */
  const loadRoadmapData = async (forceRefresh = false) => {
    try {
      if (!forceRefresh) setLoading(true);
      
      const [roadmapResponse, metricsResponse] = await Promise.all([
        SkillAPI.getSkillRoadmap(skillId),
        ProgressTracking.getSkillProgressMetrics(skillId)
      ]);

      if (roadmapResponse.success && metricsResponse.success) {
        setRoadmapData(roadmapResponse.data);
        setProgressMetrics(metricsResponse.data);
        
        // 🎯 Auto-select current phase
        const currentPhase = findCurrentPhase(roadmapResponse.data.phases, metricsResponse.data);
        setSelectedPhase(currentPhase);

        logger.info('Roadmap data loaded successfully', {
          skillId,
          phases: roadmapResponse.data.phases?.length,
          currentPhase: currentPhase?.name
        });

        // 🎬 Trigger entrance animations
        triggerEntranceAnimations();
      } else {
        throw new Error('Failed to load roadmap data');
      }
    } catch (error) {
      logger.error('Roadmap data loading failed', {
        skillId,
        error: error.message,
        stack: error.stack
      });
      
      // 🚨 Show error state
      setRoadmapData({ error: true });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * 🔄 HANDLE REFRESH
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadRoadmapData(true);
    analytics.trackEvent('ROADMAP_REFRESH', { skillId });
  }, [skillId]);

  /**
   * 🎯 FIND CURRENT PHASE
   */
  const findCurrentPhase = (phases, metrics) => {
    if (!phases || !metrics) return phases?.[0] || null;
    
    const currentProgress = metrics.overallProgress || 0;
    
    for (let i = phases.length - 1; i >= 0; i--) {
      const phase = phases[i];
      if (currentProgress >= phase.startThreshold) {
        return phase;
      }
    }
    
    return phases[0];
  };

  /**
   * 🎬 TRIGGER ENTRANCE ANIMATIONS
   */
  const triggerEntranceAnimations = () => {
    Animated.parallel([
      Animated.timing(animations.fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.timing(animations.slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true
      }),
      Animated.spring(animations.scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      })
    ]).start();
  };

  /**
   * 🎯 HANDLE PHASE SELECTION
   */
  const handlePhaseSelect = (phase) => {
    setSelectedPhase(phase);
    analytics.trackEvent('PHASE_SELECT', {
      skillId,
      phaseId: phase.id,
      phaseName: phase.name
    });
  };

  /**
   * 📊 HANDLE MODULE EXPANSION
   */
  const handleModuleExpand = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
    
    analytics.trackEvent('MODULE_EXPAND', {
      skillId,
      moduleId,
      expanded: !expandedModules[moduleId]
    });
  };

  /**
   * 🚀 HANDLE START LEARNING
   */
  const handleStartLearning = (module) => {
    analytics.trackEvent('START_LEARNING', {
      skillId,
      moduleId: module.id,
      moduleName: module.name
    });
    
    navigation.navigate('LearningModule', {
      skillId,
      moduleId: module.id,
      moduleName: module.name
    });
  };

  /**
   * 📊 RENDER PROGRESS CHART
   */
  const renderProgressChart = () => {
    if (!progressMetrics || !progressMetrics.weeklyProgress) return null;

    const chartData = {
      labels: progressMetrics.weeklyProgress.map(w => w.week),
      datasets: [{
        data: progressMetrics.weeklyProgress.map(w => w.progress),
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 2
      }]
    };

    return (
      <Animated.View 
        style={[
          styles.chartContainer,
          {
            opacity: animations.fadeAnim,
            transform: [
              { translateY: animations.slideAnim },
              { scale: animations.scaleAnim }
            ]
          }
        ]}
      >
        <BlurView intensity={80} tint="dark" style={styles.chartBlurContainer}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Weekly Progress</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProgressAnalytics', { skillId })}>
              <MaterialIcons name="insights" size={24} color="#6C63FF" />
            </TouchableOpacity>
          </View>
          
          <LineChart
            data={chartData}
            width={CHART_WIDTH - 32}
            height={CHART_HEIGHT}
            chartConfig={{
              backgroundColor: 'transparent',
              backgroundGradientFrom: 'rgba(108, 99, 255, 0.1)',
              backgroundGradientTo: 'rgba(108, 99, 255, 0.05)',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(108, 99, 255, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#6C63FF'
              }
            }}
            bezier
            style={styles.chart}
          />
          
          <View style={styles.chartStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {progressMetrics.overallProgress || 0}%
              </Text>
              <Text style={styles.statLabel}>Overall</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {progressMetrics.weeklyAvgProgress || 0}%
              </Text>
              <Text style={styles.statLabel}>Weekly Avg</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {progressMetrics.completionEstimate || '--'}d
              </Text>
              <Text style={styles.statLabel}>Est. Completion</Text>
            </View>
          </View>
        </BlurView>
      </Animated.View>
    );
  };

  /**
   * 🏆 RENDER ACHIEVEMENT BADGES
   */
  const renderAchievementBadges = () => {
    if (!progressMetrics || !progressMetrics.achievements) return null;

    return (
      <Animated.View 
        style={[
          styles.badgesContainer,
          {
            opacity: animations.fadeAnim,
            transform: [
              { translateY: animations.slideAnim },
              { scale: animations.scaleAnim }
            ]
          }
        ]}
      >
        <Text style={styles.sectionTitle}>Achievements Unlocked</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.badgesScroll}
        >
          {progressMetrics.achievements.map((badge, index) => (
            <TouchableOpacity 
              key={badge.id}
              style={styles.badgeCard}
              onPress={() => navigation.navigate('AchievementDetails', { badgeId: badge.id })}
            >
              <LinearGradient
                colors={['#6C63FF', '#8A84FF']}
                style={styles.badgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <FontAwesome5 
                  name={badge.icon} 
                  size={24} 
                  color="#FFFFFF" 
                />
              </LinearGradient>
              <Text style={styles.badgeName}>{badge.name}</Text>
              <Text style={styles.badgeDate}>{badge.unlockedAt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

  /**
   * 📋 RENDER PHASE SELECTOR
   */
  const renderPhaseSelector = () => {
    if (!roadmapData || !roadmapData.phases) return null;

    return (
      <Animated.View 
        style={[
          styles.phaseSelector,
          {
            opacity: animations.fadeAnim,
            transform: [
              { translateY: animations.slideAnim },
              { scale: animations.scaleAnim }
            ]
          }
        ]}
      >
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.phaseScrollContent}
        >
          {roadmapData.phases.map((phase, index) => (
            <TouchableOpacity
              key={phase.id}
              style={[
                styles.phaseTab,
                selectedPhase?.id === phase.id && styles.phaseTabActive
              ]}
              onPress={() => handlePhaseSelect(phase)}
            >
              <LinearGradient
                colors={
                  selectedPhase?.id === phase.id 
                    ? ['#6C63FF', '#8A84FF'] 
                    : ['rgba(108, 99, 255, 0.1)', 'rgba(108, 99, 255, 0.05)']
                }
                style={styles.phaseTabGradient}
              >
                <View style={styles.phaseIndicator}>
                  <Text style={styles.phaseNumber}>{index + 1}</Text>
                </View>
                <Text style={[
                  styles.phaseName,
                  selectedPhase?.id === phase.id && styles.phaseNameActive
                ]}>
                  {phase.name}
                </Text>
                <Text style={styles.phaseDuration}>{phase.duration}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

  /**
   * 🎯 RENDER PHASE DETAILS
   */
  const renderPhaseDetails = () => {
    if (!selectedPhase) return null;

    return (
      <Animated.View 
        style={[
          styles.phaseDetails,
          {
            opacity: animations.fadeAnim,
            transform: [
              { translateY: animations.slideAnim },
              { scale: animations.scaleAnim }
            ]
          }
        ]}
      >
        <BlurView intensity={90} tint="dark" style={styles.phaseDetailsBlur}>
          <View style={styles.phaseHeader}>
            <View>
              <Text style={styles.phaseTitle}>{selectedPhase.name}</Text>
              <Text style={styles.phaseDescription}>{selectedPhase.description}</Text>
            </View>
            <View style={styles.phaseStats}>
              <View style={styles.phaseStat}>
                <Ionicons name="time-outline" size={16} color="#8A84FF" />
                <Text style={styles.phaseStatText}>{selectedPhase.duration}</Text>
              </View>
              <View style={styles.phaseStat}>
                <MaterialIcons name="check-circle-outline" size={16} color="#8A84FF" />
                <Text style={styles.phaseStatText}>
                  {selectedPhase.modules?.length || 0} modules
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.modulesContainer}>
            {selectedPhase.modules?.map((module, index) => (
              <TouchableOpacity
                key={module.id}
                style={[
                  styles.moduleCard,
                  module.completed && styles.moduleCardCompleted,
                  module.locked && styles.moduleCardLocked
                ]}
                onPress={() => !module.locked && handleModuleExpand(module.id)}
                disabled={module.locked}
              >
                <LinearGradient
                  colors={
                    module.completed 
                      ? ['#4CAF50', '#66BB6A']
                      : module.locked
                      ? ['#757575', '#9E9E9E']
                      : ['#6C63FF', '#8A84FF']
                  }
                  style={styles.moduleHeaderGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.moduleHeader}>
                    <View style={styles.moduleInfo}>
                      <Text style={styles.moduleNumber}>Module {index + 1}</Text>
                      <Text style={styles.moduleTitle}>{module.name}</Text>
                    </View>
                    <View style={styles.moduleStatus}>
                      {module.completed ? (
                        <MaterialIcons name="check-circle" size={24} color="#FFFFFF" />
                      ) : module.locked ? (
                        <MaterialIcons name="lock" size={24} color="#FFFFFF" />
                      ) : (
                        <MaterialIcons 
                          name={expandedModules[module.id] ? "expand-less" : "expand-more"} 
                          size={24} 
                          color="#FFFFFF" 
                        />
                      )}
                    </View>
                  </View>
                </LinearGradient>

                {expandedModules[module.id] && !module.locked && (
                  <View style={styles.moduleContent}>
                    <Text style={styles.moduleDescription}>{module.description}</Text>
                    
                    <View style={styles.moduleDetails}>
                      <View style={styles.detailItem}>
                        <Ionicons name="time-outline" size={16} color="#8A84FF" />
                        <Text style={styles.detailText}>{module.estimatedTime}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <MaterialIcons name="format-list-numbered" size={16} color="#8A84FF" />
                        <Text style={styles.detailText}>
                          {module.exercisesCount} exercises
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <FontAwesome5 name="star" size={16} color="#8A84FF" />
                        <Text style={styles.detailText}>
                          {module.difficulty}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.moduleActions}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          module.completed && styles.actionButtonCompleted
                        ]}
                        onPress={() => handleStartLearning(module)}
                      >
                        <Text style={styles.actionButtonText}>
                          {module.completed ? 'Review' : 'Start Learning'}
                        </Text>
                      </TouchableOpacity>
                      
                      {module.completed && (
                        <TouchableOpacity
                          style={styles.actionButtonOutline}
                          onPress={() => navigation.navigate('ModuleAnalytics', { moduleId: module.id })}
                        >
                          <Text style={styles.actionButtonOutlineText}>View Analytics</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </BlurView>
      </Animated.View>
    );
  };

  /**
   * ⚡ RENDER LOADING STATE
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <LottieView
        source={require('../../assets/animations/loading-roadmap.json')}
        autoPlay
        loop
        style={styles.loadingAnimation}
      />
      <Text style={styles.loadingText}>Loading Your Learning Roadmap...</Text>
    </View>
  );

  /**
   * 🚨 RENDER ERROR STATE
   */
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <LottieView
        source={require('../../assets/animations/error.json')}
        autoPlay
        loop={false}
        style={styles.errorAnimation}
      />
      <Text style={styles.errorTitle}>Unable to Load Roadmap</Text>
      <Text style={styles.errorMessage}>
        Please check your connection and try again
      </Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={handleRefresh}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * 📱 MAIN RENDER
   */
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6C63FF"
            colors={['#6C63FF']}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 🏆 Header Section */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: animations.fadeAnim,
              transform: [
                { translateY: animations.slideAnim },
                { scale: animations.scaleAnim }
              ]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.skillName}>{skillName}</Text>
            <Text style={styles.skillCategory}>{skillCategory}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => navigation.navigate('SkillSettings', { skillId })}
          >
            <MaterialIcons name="more-vert" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* 📊 Progress Overview */}
        {renderProgressChart()}

        {/* 🏆 Achievement Badges */}
        {renderAchievementBadges()}

        {/* 🎯 Phase Selector */}
        {renderPhaseSelector()}

        {/* 📋 Phase Details */}
        {renderPhaseDetails()}

        {/* 📈 Performance Insights */}
        {progressMetrics && (
          <Animated.View 
            style={[
              styles.insightsContainer,
              {
                opacity: animations.fadeAnim,
                transform: [
                  { translateY: animations.slideAnim },
                  { scale: animations.scaleAnim }
                ]
              }
            ]}
          >
            <Text style={styles.sectionTitle}>Performance Insights</Text>
            <View style={styles.insightsGrid}>
              <View style={styles.insightCard}>
                <MaterialIcons name="trending-up" size={24} color="#4CAF50" />
                <Text style={styles.insightValue}>
                  {progressMetrics.learningVelocity || 0}%
                </Text>
                <Text style={styles.insightLabel}>Learning Velocity</Text>
              </View>
              <View style={styles.insightCard}>
                <MaterialIcons name="auto-awesome" size={24} color="#FF9800" />
                <Text style={styles.insightValue}>
                  {progressMetrics.masteryLevel || 'Beginner'}
                </Text>
                <Text style={styles.insightLabel}>Mastery Level</Text>
              </View>
              <View style={styles.insightCard}>
                <MaterialIcons name="schedule" size={24} color="#2196F3" />
                <Text style={styles.insightValue}>
                  {progressMetrics.timeInvested || '0h'}
                </Text>
                <Text style={styles.insightLabel}>Time Invested</Text>
              </View>
              <View style={styles.insightCard}>
                <MaterialIcons name="emoji-events" size={24} color="#9C27B0" />
                <Text style={styles.insightValue}>
                  {progressMetrics.achievementsCount || 0}
                </Text>
                <Text style={styles.insightLabel}>Achievements</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* 🚀 Quick Actions */}
        <Animated.View 
          style={[
            styles.actionsContainer,
            {
              opacity: animations.fadeAnim,
              transform: [
                { translateY: animations.slideAnim },
                { scale: animations.scaleAnim }
              ]
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('LearningModule', { 
              skillId, 
              continue: true 
            })}
          >
            <LinearGradient
              colors={['#6C63FF', '#8A84FF']}
              style={styles.quickActionGradient}
            >
              <MaterialIcons name="play-arrow" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.quickActionText}>Continue Learning</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('PracticeSession', { skillId })}
          >
            <LinearGradient
              colors={['#FF6B6B', '#FF8E8E']}
              style={styles.quickActionGradient}
            >
              <MaterialIcons name="fitness-center" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.quickActionText}>Practice Session</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => navigation.navigate('SkillAnalytics', { skillId })}
          >
            <LinearGradient
              colors={['#4CAF50', '#66BB6A']}
              style={styles.quickActionGradient}
            >
              <MaterialIcons name="insights" size={24} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.quickActionText}>View Analytics</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* ⚡ Loading State */}
      {loading && renderLoadingState()}

      {/* 🚨 Error State */}
      {roadmapData?.error && renderErrorState()}
    </SafeAreaView>
  );
};

/**
 * 🎨 STYLESHEET
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E'
  },
  scrollContent: {
    paddingBottom: 100
  },
  
  // 🏆 Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },
  headerContent: {
    flex: 1,
    marginHorizontal: 16,
    alignItems: 'center'
  },
  skillName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  skillCategory: {
    fontSize: 14,
    color: '#8A84FF',
    marginTop: 4,
    textAlign: 'center'
  },
  menuButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },

  // 📊 Chart Styles
  chartContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  chartBlurContainer: {
    padding: 16,
    borderRadius: 20
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  statLabel: {
    fontSize: 12,
    color: '#8A84FF',
    marginTop: 4
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)'
  },

  // 🏆 Badges Styles
  badgesContainer: {
    marginHorizontal: 20,
    marginBottom: 24
  },
  badgesScroll: {
    marginTop: 12
  },
  badgeCard: {
    alignItems: 'center',
    marginRight: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16
  },
  badgeGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center'
  },
  badgeDate: {
    fontSize: 10,
    color: '#8A84FF',
    marginTop: 2
  },

  // 🎯 Phase Selector Styles
  phaseSelector: {
    marginHorizontal: 20,
    marginBottom: 24
  },
  phaseScrollContent: {
    paddingRight: 20
  },
  phaseTab: {
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    minWidth: 120
  },
  phaseTabActive: {
    elevation: 8,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  phaseTabGradient: {
    padding: 16,
    alignItems: 'center'
  },
  phaseIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  phaseNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  phaseName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4
  },
  phaseNameActive: {
    color: '#FFFFFF'
  },
  phaseDuration: {
    fontSize: 12,
    color: '#8A84FF'
  },

  // 📋 Phase Details Styles
  phaseDetails: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden'
  },
  phaseDetailsBlur: {
    padding: 20
  },
  phaseHeader: {
    marginBottom: 20
  },
  phaseTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8
  },
  phaseDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20
  },
  phaseStats: {
    flexDirection: 'row',
    marginTop: 12
  },
  phaseStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  phaseStatText: {
    fontSize: 14,
    color: '#8A84FF',
    marginLeft: 6
  },
  modulesContainer: {
    marginTop: 8
  },
  moduleCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  },
  moduleCardCompleted: {
    opacity: 0.8
  },
  moduleCardLocked: {
    opacity: 0.6
  },
  moduleHeaderGradient: {
    padding: 16
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  moduleInfo: {
    flex: 1
  },
  moduleNumber: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  moduleContent: {
    padding: 16
  },
  moduleDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: 16
  },
  moduleDetails: {
    flexDirection: 'row',
    marginBottom: 16
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  detailText: {
    fontSize: 12,
    color: '#8A84FF',
    marginLeft: 6
  },
  moduleActions: {
    flexDirection: 'row'
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8
  },
  actionButtonCompleted: {
    backgroundColor: '#4CAF50'
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  actionButtonOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  actionButtonOutlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF'
  },

  // 📈 Insights Styles
  insightsContainer: {
    marginHorizontal: 20,
    marginBottom: 24
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12
  },
  insightCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    marginRight: '4%'
  },
  insightValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8
  },
  insightLabel: {
    fontSize: 12,
    color: '#8A84FF',
    marginTop: 4
  },

  // 🚀 Quick Actions Styles
  actionsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 24
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 6
  },
  quickActionGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center'
  },

  // ⚡ Loading State Styles
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  loadingAnimation: {
    width: 200,
    height: 200
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 20
  },

  // 🚨 Error State Styles
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40
  },
  errorAnimation: {
    width: 150,
    height: 150
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20
  },
  errorMessage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 8
  },
  retryButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },

  // 📋 Section Styles
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12
  }
});

export default SkillRoadmap;