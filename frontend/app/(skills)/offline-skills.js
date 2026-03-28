/**
 * 🏢 MOSA FORGE - Enterprise Offline Skills Interface
 * 🔨 Hands-on Professional Skills & Physical Services
 * 🏗️ Construction, Woodworking, Plumbing & Technical Trades
 * 💼 Income-Generating Practical Skills for Ethiopia
 * 🚀 React Native Enterprise Application
 * 
 * @module OfflineSkills
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  FlatList,
  RefreshControl,
  Animated,
  StatusBar
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🏗️ Enterprise Components
import SkillCategoryCard from '../../components/skills/SkillCategoryCard';
import OfflineSkillCard from '../../components/skills/OfflineSkillCard';
import FeaturedExpertsSection from '../../components/experts/FeaturedExpertsSection';
import EnrollmentProgressBar from '../../components/enrollment/EnrollmentProgressBar';
import QuickStatsBar from '../../components/dashboard/QuickStatsBar';

// 🎨 Design System
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Spacing from '../../constants/Spacing';

// 🔧 Enterprise Services
import { 
  getOfflineSkills, 
  getFeaturedOfflineExperts,
  getStudentEnrollmentProgress,
  trackSkillView
} from '../../services/skills-service';
import { 
  initiateBundleEnrollment,
  checkEnrollmentEligibility 
} from '../../services/enrollment-service';

// 🎯 Enterprise Constants
import { OFFLINE_SKILL_CATEGORIES, SKILL_LEVELS } from '../../constants/skills-data';
import { ENROLLMENT_STATUS } from '../../constants/enrollment';

const { width, height } = Dimensions.get('window');

const OfflineSkills = () => {
  const navigation = useNavigation();
  
  // 🏗️ State Management
  const [skills, setSkills] = useState([]);
  const [featuredExperts, setFeaturedExperts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [enrollmentProgress, setEnrollmentProgress] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [quickStats, setQuickStats] = useState({
    totalSkills: 0,
    enrolledSkills: 0,
    completedSkills: 0,
    estimatedEarnings: 0
  });

  // 🎯 Animations
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  /**
   * 📊 LOAD INITIAL DATA
   */
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 🎯 Parallel Data Loading
      await Promise.all([
        loadSkillsData(),
        loadFeaturedExperts(),
        loadEnrollmentProgress(),
        loadQuickStats()
      ]);

      // 🎨 Animate Content
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
        })
      ]).start();

    } catch (error) {
      console.error('Failed to load offline skills data:', error);
      // 🚨 Show error state
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 🔄 LOAD SKILLS DATA
   */
  const loadSkillsData = async () => {
    try {
      const skillsData = await getOfflineSkills(selectedCategory);
      setSkills(skillsData);
      
      // 📊 Update quick stats
      setQuickStats(prev => ({
        ...prev,
        totalSkills: skillsData.length
      }));
    } catch (error) {
      console.error('Failed to load skills data:', error);
      throw error;
    }
  };

  /**
   * 👥 LOAD FEATURED EXPERTS
   */
  const loadFeaturedExperts = async () => {
    try {
      const experts = await getFeaturedOfflineExperts();
      setFeaturedExperts(experts);
    } catch (error) {
      console.error('Failed to load featured experts:', error);
      throw error;
    }
  };

  /**
   * 📈 LOAD ENROLLMENT PROGRESS
   */
  const loadEnrollmentProgress = async () => {
    try {
      const progress = await getStudentEnrollmentProgress('offline');
      setEnrollmentProgress(progress);
    } catch (error) {
      console.error('Failed to load enrollment progress:', error);
      throw error;
    }
  };

  /**
   * 📊 LOAD QUICK STATS
   */
  const loadQuickStats = async () => {
    try {
      // 💾 Load from cache first
      const cachedStats = await AsyncStorage.getItem('offline_skills_stats');
      
      if (cachedStats) {
        setQuickStats(JSON.parse(cachedStats));
      } else {
        // 📈 Calculate initial stats
        const stats = {
          totalSkills: 0,
          enrolledSkills: 0,
          completedSkills: 0,
          estimatedEarnings: 15000 // Base estimation
        };
        setQuickStats(stats);
        await AsyncStorage.setItem('offline_skills_stats', JSON.stringify(stats));
      }
    } catch (error) {
      console.error('Failed to load quick stats:', error);
    }
  };

  /**
   * 🔄 PULL TO REFRESH
   */
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadInitialData();
    setIsRefreshing(false);
  }, [loadInitialData]);

  /**
   * 🎯 SKILL CATEGORY SELECTION
   */
  const handleCategorySelect = async (categoryId) => {
    try {
      setSelectedCategory(categoryId);
      
      // 📊 Track category view
      await trackSkillView({
        type: 'category',
        categoryId,
        skillType: 'offline'
      });

      // 🔄 Filter skills
      const filteredSkills = await getOfflineSkills(categoryId);
      setSkills(filteredSkills);

      // 🎨 Animate filter change
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true
      }).start();

    } catch (error) {
      console.error('Failed to filter skills by category:', error);
    }
  };

  /**
   * 🔨 SKILL SELECTION HANDLER
   */
  const handleSkillSelect = async (skill) => {
    try {
      // 📊 Track skill view
      await trackSkillView({
        type: 'skill',
        skillId: skill.id,
        skillName: skill.name
      });

      // 🎯 Check enrollment eligibility
      const eligibility = await checkEnrollmentEligibility({
        skillId: skill.id,
        skillType: 'offline'
      });

      // 🚀 Navigate to skill details
      navigation.navigate('SkillDetails', {
        skill,
        eligibility,
        fromCategory: 'offline'
      });

    } catch (error) {
      console.error('Failed to handle skill selection:', error);
    }
  };

  /**
   * 🚀 QUICK ENROLLMENT HANDLER
   */
  const handleQuickEnrollment = async (skillId) => {
    try {
      // 🎯 Initiate enrollment process
      const enrollmentResult = await initiateBundleEnrollment({
        skillId,
        skillType: 'offline',
        paymentMethod: 'telebirr', // Default
        installmentPlan: 'full'
      });

      if (enrollmentResult.success) {
        // 🎉 Navigate to enrollment confirmation
        navigation.navigate('EnrollmentConfirmation', {
          enrollmentId: enrollmentResult.enrollmentId,
          skillId,
          amount: enrollmentResult.amount
        });

        // 📈 Update local stats
        setQuickStats(prev => ({
          ...prev,
          enrolledSkills: prev.enrolledSkills + 1
        }));
      }

    } catch (error) {
      console.error('Failed to initiate quick enrollment:', error);
    }
  };

  /**
   * 👁️‍🗨️ SKILL PREVIEW HANDLER
   */
  const handleSkillPreview = (skill) => {
    // 🎬 Show skill preview modal
    navigation.navigate('SkillPreview', {
      skill,
      previewType: 'offline'
    });
  };

  /**
   * 🏆 RENDER SKILL CATEGORY FILTER
   */
  const renderCategoryFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.categoryFilterContainer}
      contentContainerStyle={styles.categoryFilterContent}
    >
      <TouchableOpacity
        style={[
          styles.categoryChip,
          selectedCategory === 'all' && styles.categoryChipSelected
        ]}
        onPress={() => handleCategorySelect('all')}
      >
        <Icon 
          name="format-list-bulleted" 
          size={20} 
          color={selectedCategory === 'all' ? Colors.primary : Colors.textSecondary} 
        />
        <Text style={[
          styles.categoryChipText,
          selectedCategory === 'all' && styles.categoryChipTextSelected
        ]}>
          All Skills
        </Text>
      </TouchableOpacity>

      {OFFLINE_SKILL_CATEGORIES.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryChip,
            selectedCategory === category.id && styles.categoryChipSelected
          ]}
          onPress={() => handleCategorySelect(category.id)}
        >
          <Icon 
            name={category.icon} 
            size={20} 
            color={selectedCategory === category.id ? Colors.primary : Colors.textSecondary} 
          />
          <Text style={[
            styles.categoryChipText,
            selectedCategory === category.id && styles.categoryChipTextSelected
          ]}>
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  /**
   * 🔨 RENDER SKILL CARD
   */
  const renderSkillCard = ({ item }) => (
    <OfflineSkillCard
      skill={item}
      onSelect={() => handleSkillSelect(item)}
      onQuickEnroll={() => handleQuickEnrollment(item.id)}
      onPreview={() => handleSkillPreview(item)}
      enrollmentProgress={enrollmentProgress[item.id]}
    />
  );

  /**
   * 📊 RENDER QUICK STATS BAR
   */
  const renderQuickStats = () => (
    <QuickStatsBar
      stats={quickStats}
      onStatsPress={() => navigation.navigate('MyProgress', { skillType: 'offline' })}
    />
  );

  /**
   * 🏆 RENDER FEATURED EXPERTS
   */
  const renderFeaturedExperts = () => (
    <FeaturedExpertsSection
      experts={featuredExperts}
      title="Featured Construction Experts"
      subtitle="Learn from certified professionals"
      onExpertPress={(expert) => navigation.navigate('ExpertProfile', { expert })}
      onSeeAllPress={() => navigation.navigate('ExpertDirectory', { category: 'offline' })}
    />
  );

  /**
   * 🎯 RENDER EMPTY STATE
   */
  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Icon name="hammer-wrench" size={80} color={Colors.textSecondary} />
      <Text style={styles.emptyStateTitle}>No Skills Found</Text>
      <Text style={styles.emptyStateText}>
        Try selecting a different category or check back later for new offline skills.
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={onRefresh}
      >
        <Text style={styles.emptyStateButtonText}>Refresh Skills</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * 🎨 RENDER HEADER
   */
  const renderHeader = () => (
    <LinearGradient
      colors={[Colors.primary, Colors.primaryDark]}
      style={styles.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={styles.headerContent}>
        <View style={styles.headerTitleContainer}>
          <Icon name="hammer" size={32} color={Colors.white} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Offline Skills</Text>
            <Text style={styles.headerSubtitle}>
              Master practical, hands-on skills for income generation
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerActionButton}
          onPress={() => navigation.navigate('MyEnrollments')}
        >
          <Icon name="bookmark-check" size={20} color={Colors.white} />
          <Text style={styles.headerActionButtonText}>My Courses</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  // 📱 Focus Effect
  useFocusEffect(
    useCallback(() => {
      loadInitialData();
      return () => {
        // 🧹 Cleanup animations
        fadeAnim.setValue(0);
        slideAnim.setValue(50);
      };
    }, [loadInitialData])
  );

  // 🎨 Render Main Component
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      
      {renderHeader()}
      
      <Animated.View 
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* 📊 Quick Stats */}
          {renderQuickStats()}

          {/* 🏗️ Enrollment Progress */}
          {enrollmentProgress && Object.keys(enrollmentProgress).length > 0 && (
            <View style={styles.progressSection}>
              <Text style={styles.sectionTitle}>Your Learning Progress</Text>
              <EnrollmentProgressBar progress={enrollmentProgress} />
            </View>
          )}

          {/* 🎯 Category Filter */}
          <View style={styles.categorySection}>
            <Text style={styles.sectionTitle}>Skill Categories</Text>
            {renderCategoryFilter()}
          </View>

          {/* 🔨 Skills Grid */}
          <View style={styles.skillsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedCategory === 'all' ? 'All Offline Skills' : 
                 OFFLINE_SKILL_CATEGORIES.find(c => c.id === selectedCategory)?.name + ' Skills'}
              </Text>
              <Text style={styles.skillsCount}>{skills.length} skills available</Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading offline skills...</Text>
              </View>
            ) : skills.length === 0 ? (
              renderEmptyState()
            ) : (
              <FlatList
                data={skills}
                renderItem={renderSkillCard}
                keyExtractor={(item) => item.id}
                numColumns={2}
                scrollEnabled={false}
                columnWrapperStyle={styles.skillsGrid}
                contentContainerStyle={styles.skillsList}
              />
            )}
          </View>

          {/* 👥 Featured Experts */}
          {featuredExperts.length > 0 && renderFeaturedExperts()}

          {/* 💡 Call to Action */}
          <View style={styles.ctaSection}>
            <LinearGradient
              colors={[Colors.secondary, Colors.secondaryDark]}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name="lightbulb-on" size={40} color={Colors.white} />
              <Text style={styles.ctaTitle}>Ready to Build Your Future?</Text>
              <Text style={styles.ctaText}>
                Master practical skills that are in high demand across Ethiopia. 
                Start earning within 4 months with our guaranteed training program.
              </Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => navigation.navigate('SkillSelector', { type: 'offline' })}
              >
                <Text style={styles.ctaButtonText}>Start Your Journey</Text>
                <Icon name="arrow-right" size={20} color={Colors.white} />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

// 🎨 STYLESHEET
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTextContainer: {
    marginLeft: Spacing.md,
  },
  headerTitle: {
    ...Typography.heading2,
    color: Colors.white,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
    maxWidth: width * 0.6,
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
  },
  headerActionButtonText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  contentContainer: {
    flex: 1,
  },
  progressSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.xl,
    borderRadius: 16,
    elevation: 4,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  categorySection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  categoryFilterContainer: {
    marginTop: Spacing.md,
  },
  categoryFilterContent: {
    paddingRight: Spacing.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  skillsSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.heading3,
    color: Colors.text,
    fontWeight: '700',
  },
  skillsCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  skillsGrid: {
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  skillsList: {
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  emptyStateContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginVertical: Spacing.lg,
  },
  emptyStateTitle: {
    ...Typography.heading4,
    color: Colors.text,
    marginTop: Spacing.md,
    fontWeight: '600',
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  emptyStateButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    ...Typography.button,
    color: Colors.white,
    fontWeight: '600',
  },
  ctaSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  ctaGradient: {
    padding: Spacing.xl,
    borderRadius: 20,
    alignItems: 'center',
  },
  ctaTitle: {
    ...Typography.heading4,
    color: Colors.white,
    marginTop: Spacing.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  ctaText: {
    ...Typography.body,
    color: Colors.white,
    opacity: 0.9,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.lg,
  },
  ctaButtonText: {
    ...Typography.button,
    color: Colors.secondary,
    fontWeight: '700',
    marginRight: Spacing.sm,
  },
});

export default OfflineSkills;