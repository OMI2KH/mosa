/**
 * 🏢 MOSA FORGE - Enterprise Skill Details Screen
 * 🎓 Comprehensive Skill Information & Enrollment Flow
 * 📊 Real-time Market Insights & Earnings Potential
 * 👥 Expert Profiles & Quality Metrics Display
 * 🚀 Enterprise-Grade React Native Implementation
 * 
 * @module SkillDetailsScreen
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  RefreshControl,
  Platform,
  InteractionManager
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Text,
  Button,
  Card,
  Avatar,
  Chip,
  ProgressBar,
  Divider,
  IconButton,
  Badge,
  Surface
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';

// 🏗️ Enterprise Dependencies
import EnterpriseHeader from '../../components/shared/EnterpriseHeader';
import LoadingOverlay from '../../components/shared/LoadingOverlay';
import NetworkStatus from '../../components/shared/NetworkStatus';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import SkillMetricsChart from '../../components/skills/SkillMetricsChart';
import ExpertCarousel from '../../components/skills/ExpertCarousel';
import EnrollmentWizard from '../../components/enrollment/EnrollmentWizard';
import MarketInsights from '../../components/skills/MarketInsights';

// 📊 Services
import SkillService from '../../services/skill-service';
import ExpertService from '../../services/expert-service';
import EnrollmentService from '../../services/enrollment-service';
import AnalyticsService from '../../services/analytics-service';

// 🎯 Constants
import { COLORS, TYPOGRAPHY, SPACING, SHADOWS, ANIMATIONS } from '../../constants/design-system';
import { SKILL_CATEGORIES, EARNING_POTENTIAL } from '../../constants/skills-data';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SkillDetailsScreen = memo(() => {
  // 🎯 Navigation & Params
  const router = useRouter();
  const params = useLocalSearchParams();
  const skillId = params.id;
  const category = params.category;

  // 🏗️ State Management
  const [skillData, setSkillData] = useState(null);
  const [experts, setExperts] = useState([]);
  const [marketInsights, setMarketInsights] = useState(null);
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [enrollmentStep, setEnrollmentStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [favorite, setFavorite] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));

  // 📊 Metrics State
  const [completionRate, setCompletionRate] = useState(0);
  const [studentSatisfaction, setStudentSatisfaction] = useState(0);
  const [enrollmentTrend, setEnrollmentTrend] = useState(0);
  const [revenueImpact, setRevenueImpact] = useState(0);

  // 🎯 Animation Values
  const headerOpacity = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  // 🔍 Fetch Skill Details
  const fetchSkillDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 🎯 Concurrent Data Fetching
      const [skillResponse, expertsResponse, insightsResponse, metricsResponse] = await Promise.all([
        SkillService.getSkillDetails(skillId),
        ExpertService.getExpertsBySkill(skillId),
        SkillService.getMarketInsights(skillId),
        SkillService.getSkillMetrics(skillId)
      ]);

      // ✅ Validate Responses
      if (!skillResponse.success) {
        throw new Error(skillResponse.error || 'Failed to fetch skill details');
      }

      // 🏗️ Update State
      setSkillData(skillResponse.data);
      setExperts(expertsResponse.data || []);
      setMarketInsights(insightsResponse.data);
      
      // 📊 Update Metrics
      if (metricsResponse.success) {
        setCompletionRate(metricsResponse.data.completionRate || 0);
        setStudentSatisfaction(metricsResponse.data.studentSatisfaction || 0);
        setEnrollmentTrend(metricsResponse.data.enrollmentTrend || 0);
        setRevenueImpact(metricsResponse.data.revenueImpact || 0);
      }

      // 📈 Track Analytics
      await AnalyticsService.trackSkillView(skillId, skillResponse.data.name);

    } catch (err) {
      console.error('Skill details fetch error:', err);
      setError(err.message || 'Failed to load skill details');
      
      // 📊 Track Error Analytics
      await AnalyticsService.trackError('skill_details_fetch', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skillId]);

  // 🔄 Pull to Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSkillDetails();
    
    // 🎯 Haptic Feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [fetchSkillDetails]);

  // 📊 Handle Enrollment
  const handleEnrollment = useCallback(async (expertId = null) => {
    try {
      // 🎯 Haptic Feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // 📊 Track Enrollment Attempt
      await AnalyticsService.trackEnrollmentAttempt(skillId, expertId);

      // 🔄 Navigate to Enrollment Flow
      router.push({
        pathname: '/(enrollment)/enrollment-flow',
        params: {
          skillId,
          expertId: expertId || selectedExpert?.id,
          skillName: skillData?.name,
          bundlePrice: 1999
        }
      });

    } catch (err) {
      console.error('Enrollment initiation error:', err);
      setError('Failed to initiate enrollment');
      
      // 📊 Track Error Analytics
      await AnalyticsService.trackError('enrollment_initiation', err.message);
    }
  }, [skillId, selectedExpert, skillData, router]);

  // ⭐ Toggle Favorite
  const toggleFavorite = useCallback(async () => {
    try {
      setFavorite(!favorite);
      
      // 🎯 Haptic Feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // 💾 Save to User Preferences
      await SkillService.toggleFavoriteSkill(skillId, !favorite);
      
      // 📊 Track Analytics
      await AnalyticsService.trackFavoriteToggle(skillId, !favorite);

    } catch (err) {
      console.error('Favorite toggle error:', err);
      // Revert on error
      setFavorite(!favorite);
    }
  }, [favorite, skillId]);

  // 👥 Handle Expert Selection
  const handleExpertSelect = useCallback((expert) => {
    setSelectedExpert(expert);
    
    // 🎯 Haptic Feedback
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }

    // 📊 Track Expert Selection
    AnalyticsService.trackExpertSelection(skillId, expert.id);
  }, [skillId]);

  // 🏗️ Initial Load
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      await InteractionManager.runAfterInteractions(async () => {
        if (mounted) {
          await fetchSkillDetails();
          
          // 🎯 Animate Header
          Animated.timing(animatedValue, {
            toValue: 100,
            duration: 500,
            useNativeDriver: true,
          }).start();
        }
      });
    };

    loadData();

    // 🧹 Cleanup
    return () => {
      mounted = false;
      animatedValue.stopAnimation();
    };
  }, [fetchSkillDetails, animatedValue]);

  // 🎯 Render Loading State
  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <EnterpriseHeader 
          title="Skill Details" 
          showBack 
          onBackPress={() => router.back()}
        />
        <LoadingOverlay 
          message="Loading skill details..."
          showProgress
        />
        <NetworkStatus />
      </View>
    );
  }

  // 🚨 Render Error State
  if (error) {
    return (
      <View style={styles.container}>
        <EnterpriseHeader 
          title="Skill Details" 
          showBack 
          onBackPress={() => router.back()}
        />
        <ErrorBoundary 
          error={error}
          onRetry={fetchSkillDetails}
          retryText="Retry Loading"
        />
        <NetworkStatus />
      </View>
    );
  }

  // 📊 Calculate Skill Difficulty
  const getDifficultyLevel = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return { label: 'Beginner', color: COLORS.success, icon: 'star-outline' };
      case 'intermediate': return { label: 'Intermediate', color: COLORS.warning, icon: 'star-half' };
      case 'advanced': return { label: 'Advanced', color: COLORS.error, icon: 'star' };
      default: return { label: 'Beginner', color: COLORS.success, icon: 'star-outline' };
    }
  };

  // 💰 Calculate Earning Potential
  const calculateEarningPotential = (skillLevel) => {
    const baseEarnings = EARNING_POTENTIAL[skillLevel] || { min: 5000, max: 15000 };
    return {
      monthly: `ETB ${baseEarnings.min.toLocaleString()} - ${baseEarnings.max.toLocaleString()}`,
      annual: `ETB ${(baseEarnings.min * 12).toLocaleString()} - ${(baseEarnings.max * 12).toLocaleString()}`
    };
  };

  // 🎯 Render Skill Header
  const renderSkillHeader = () => {
    const difficulty = getDifficultyLevel(skillData?.difficulty);
    const earnings = calculateEarningPotential(skillData?.level || 'beginner');

    return (
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.headerGradient}
      >
        <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons 
                name="arrow-left" 
                size={24} 
                color={COLORS.white} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={toggleFavorite}
              style={styles.favoriteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons 
                name={favorite ? "heart" : "heart-outline"} 
                size={24} 
                color={favorite ? COLORS.error : COLORS.white} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.skillInfo}>
            <View style={styles.skillIconContainer}>
              <MaterialCommunityIcons 
                name={skillData?.icon || 'star'} 
                size={48} 
                color={COLORS.white} 
              />
            </View>
            
            <Text style={styles.skillName} numberOfLines={2}>
              {skillData?.name || 'Skill Name'}
            </Text>
            
            <View style={styles.skillMeta}>
              <Chip 
                mode="outlined"
                textStyle={styles.categoryChipText}
                style={[styles.categoryChip, { borderColor: COLORS.white }]}
              >
                {SKILL_CATEGORIES[category] || 'Category'}
              </Chip>
              
              <Chip 
                icon={difficulty.icon}
                mode="flat"
                style={[styles.difficultyChip, { backgroundColor: difficulty.color }]}
                textStyle={styles.difficultyChipText}
              >
                {difficulty.label}
              </Chip>
            </View>
          </View>

          <View style={styles.earningPotential}>
            <View style={styles.earningCard}>
              <MaterialCommunityIcons 
                name="cash-multiple" 
                size={20} 
                color={COLORS.success} 
              />
              <Text style={styles.earningLabel}>Monthly Potential</Text>
              <Text style={styles.earningValue}>{earnings.monthly}</Text>
            </View>
            
            <View style={styles.earningDivider} />
            
            <View style={styles.earningCard}>
              <MaterialCommunityIcons 
                name="chart-line" 
                size={20} 
                color={COLORS.info} 
              />
              <Text style={styles.earningLabel}>Annual Potential</Text>
              <Text style={styles.earningValue}>{earnings.annual}</Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>
    );
  };

  // 📊 Render Skill Metrics
  const renderSkillMetrics = () => (
    <Surface style={styles.metricsContainer}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons 
          name="chart-bar" 
          size={24} 
          color={COLORS.primary} 
        />
        <Text style={styles.sectionTitle}>Skill Performance Metrics</Text>
      </View>

      <SkillMetricsChart 
        completionRate={completionRate}
        studentSatisfaction={studentSatisfaction}
        enrollmentTrend={enrollmentTrend}
        revenueImpact={revenueImpact}
      />

      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <View style={styles.metricIconContainer}>
            <MaterialCommunityIcons 
              name="check-circle" 
              size={20} 
              color={COLORS.success} 
            />
          </View>
          <Text style={styles.metricLabel}>Completion</Text>
          <Text style={styles.metricValue}>{Math.round(completionRate * 100)}%</Text>
          <ProgressBar 
            progress={completionRate}
            color={COLORS.success}
            style={styles.metricProgress}
          />
        </View>

        <View style={styles.metricItem}>
          <View style={styles.metricIconContainer}>
            <MaterialCommunityIcons 
              name="emoticon-happy" 
              size={20} 
              color={COLORS.warning} 
            />
          </View>
          <Text style={styles.metricLabel}>Satisfaction</Text>
          <Text style={styles.metricValue}>{studentSatisfaction.toFixed(1)}/5</Text>
          <ProgressBar 
            progress={studentSatisfaction / 5}
            color={COLORS.warning}
            style={styles.metricProgress}
          />
        </View>

        <View style={styles.metricItem}>
          <View style={styles.metricIconContainer}>
            <MaterialCommunityIcons 
              name="trending-up" 
              size={20} 
              color={COLORS.info} 
            />
          </View>
          <Text style={styles.metricLabel}>Enrollment Trend</Text>
          <Text style={styles.metricValue}>{enrollmentTrend > 0 ? '+' : ''}{Math.round(enrollmentTrend)}%</Text>
          <ProgressBar 
            progress={Math.abs(enrollmentTrend) / 100}
            color={COLORS.info}
            style={styles.metricProgress}
          />
        </View>

        <View style={styles.metricItem}>
          <View style={styles.metricIconContainer}>
            <MaterialCommunityIcons 
              name="cash" 
              size={20} 
              color={COLORS.error} 
            />
          </View>
          <Text style={styles.metricLabel}>Revenue Impact</Text>
          <Text style={styles.metricValue}>+{Math.round(revenueImpact)}%</Text>
          <ProgressBar 
            progress={revenueImpact / 100}
            color={COLORS.error}
            style={styles.metricProgress}
          />
        </View>
      </View>
    </Surface>
  );

  // 📝 Render Skill Description
  const renderSkillDescription = () => (
    <Card style={styles.descriptionCard}>
      <Card.Content>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons 
            name="information" 
            size={24} 
            color={COLORS.primary} 
          />
          <Text style={styles.sectionTitle}>Skill Overview</Text>
        </View>
        
        <Text style={styles.descriptionText}>
          {skillData?.description || 'No description available.'}
        </Text>

        <Divider style={styles.divider} />

        <View style={styles.learningOutcomes}>
          <Text style={styles.outcomesTitle}>What You'll Learn</Text>
          {skillData?.outcomes?.map((outcome, index) => (
            <View key={index} style={styles.outcomeItem}>
              <MaterialCommunityIcons 
                name="check-circle" 
                size={16} 
                color={COLORS.success} 
              />
              <Text style={styles.outcomeText}>{outcome}</Text>
            </View>
          )) || (
            <Text style={styles.noOutcomesText}>Learning outcomes not specified</Text>
          )}
        </View>

        <Divider style={styles.divider} />

        <View style={styles.prerequisites}>
          <Text style={styles.prerequisitesTitle}>Prerequisites</Text>
          {skillData?.prerequisites?.map((prereq, index) => (
            <Chip key={index} style={styles.prerequisiteChip} mode="outlined">
              {prereq}
            </Chip>
          )) || (
            <Text style={styles.noPrerequisitesText}>No prerequisites required</Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  // 👥 Render Available Experts
  const renderAvailableExperts = () => (
    <View style={styles.expertsSection}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons 
          name="account-group" 
          size={24} 
          color={COLORS.primary} 
        />
        <Text style={styles.sectionTitle}>Available Experts</Text>
        <Badge style={styles.expertCountBadge}>
          {experts.length}
        </Badge>
      </View>

      {experts.length > 0 ? (
        <ExpertCarousel 
          experts={experts}
          onExpertSelect={handleExpertSelect}
          selectedExpert={selectedExpert}
        />
      ) : (
        <Card style={styles.noExpertsCard}>
          <Card.Content style={styles.noExpertsContent}>
            <MaterialCommunityIcons 
              name="account-search" 
              size={48} 
              color={COLORS.disabled} 
            />
            <Text style={styles.noExpertsText}>
              No experts currently available for this skill
            </Text>
            <Text style={styles.noExpertsSubtext}>
              Check back later or explore similar skills
            </Text>
          </Card.Content>
        </Card>
      )}

      {selectedExpert && (
        <Card style={styles.selectedExpertCard}>
          <Card.Content>
            <View style={styles.selectedExpertHeader}>
              <Avatar.Image 
                size={48}
                source={{ uri: selectedExpert.avatar }}
                style={styles.selectedExpertAvatar}
              />
              <View style={styles.selectedExpertInfo}>
                <Text style={styles.selectedExpertName}>
                  {selectedExpert.name}
                </Text>
                <View style={styles.selectedExpertMeta}>
                  <Chip 
                    icon="star"
                    style={styles.expertRatingChip}
                    textStyle={styles.expertRatingText}
                  >
                    {selectedExpert.rating.toFixed(1)}
                  </Chip>
                  <Chip 
                    icon="briefcase"
                    style={styles.expertExperienceChip}
                    textStyle={styles.expertExperienceText}
                  >
                    {selectedExpert.experience} years
                  </Chip>
                </View>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            <Text style={styles.selectedExpertBio} numberOfLines={3}>
              {selectedExpert.bio || 'No bio available.'}
            </Text>
            
            <Button 
              mode="contained"
              onPress={() => handleEnrollment(selectedExpert.id)}
              style={styles.selectExpertButton}
              labelStyle={styles.selectExpertButtonLabel}
              icon="check"
            >
              Select This Expert
            </Button>
          </Card.Content>
        </Card>
      )}
    </View>
  );

  // 📈 Render Market Insights
  const renderMarketInsights = () => (
    <MarketInsights 
      insights={marketInsights}
      skillName={skillData?.name}
      category={category}
    />
  );

  // 🎯 Render Enrollment CTA
  const renderEnrollmentCTA = () => (
    <BlurView intensity={90} style={styles.enrollmentCTA}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.ctaGradient}
      >
        <View style={styles.ctaContent}>
          <View style={styles.ctaTextContainer}>
            <Text style={styles.ctaTitle}>
              Start Your 4-Month Journey
            </Text>
            <Text style={styles.ctaSubtitle}>
              From Zero to Income in 4 Months - Guaranteed
            </Text>
            
            <View style={styles.pricingInfo}>
              <Text style={styles.originalPrice}>
                ETB 3,998
              </Text>
              <Text style={styles.currentPrice}>
                ETB 1,999
              </Text>
              <Badge style={styles.discountBadge}>
                50% OFF
              </Badge>
            </View>

            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons 
                  name="check-circle" 
                  size={16} 
                  color={COLORS.success} 
                />
                <Text style={styles.featureText}>4-Month Complete Program</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons 
                  name="check-circle" 
                  size={16} 
                  color={COLORS.success} 
                />
                <Text style={styles.featureText}>Guaranteed Expert Matching</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons 
                  name="check-circle" 
                  size={16} 
                  color={COLORS.success} 
                />
                <Text style={styles.featureText}>Yachi Verification Included</Text>
              </View>
              <View style={styles.featureItem}>
                <MaterialCommunityIcons 
                  name="check-circle" 
                  size={16} 
                  color={COLORS.success} 
                />
                <Text style={styles.featureText}>Quality Guarantee</Text>
              </View>
            </View>
          </View>

          <Button 
            mode="contained"
            onPress={() => handleEnrollment()}
            style={styles.enrollButton}
            labelStyle={styles.enrollButtonLabel}
            icon="rocket-launch"
            contentStyle={styles.enrollButtonContent}
          >
            Enroll Now - ETB 1,999
          </Button>

          <View style={styles.paymentOptions}>
            <Text style={styles.paymentOptionsText}>
              Flexible payment options available
            </Text>
            <View style={styles.paymentIcons}>
              <FontAwesome5 name="cc-visa" size={20} color={COLORS.white} />
              <FontAwesome5 name="cc-mastercard" size={20} color={COLORS.white} />
              <MaterialCommunityIcons name="cellphone" size={20} color={COLORS.white} />
              <Ionicons name="md-bank" size={20} color={COLORS.white} />
            </View>
          </View>
        </View>
      </LinearGradient>
    </BlurView>
  );

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <NetworkStatus />
        
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
              progressBackgroundColor={COLORS.white}
            />
          }
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {renderSkillHeader()}
          {renderSkillMetrics()}
          {renderSkillDescription()}
          {renderAvailableExperts()}
          {renderMarketInsights()}
          
          {/* Spacer for CTA */}
          <View style={styles.ctaSpacer} />
        </ScrollView>

        {renderEnrollmentCTA()}

        {/* Enrollment Wizard Modal */}
        <EnrollmentWizard 
          visible={enrollmentStep > 0}
          step={enrollmentStep}
          skillData={skillData}
          selectedExpert={selectedExpert}
          onClose={() => setEnrollmentStep(0)}
          onComplete={() => {
            setEnrollmentStep(0);
            router.push('/(dashboard)/learning-dashboard');
          }}
        />
      </View>
    </ErrorBoundary>
  );
});

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: Platform.OS === 'ios' ? 120 : 100,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.xxxl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    ...SHADOWS.elevation8,
  },
  headerContent: {
    paddingHorizontal: SPACING.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  backButton: {
    padding: SPACING.xs,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  favoriteButton: {
    padding: SPACING.xs,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  skillInfo: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  skillIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.elevation4,
  },
  skillName: {
    ...TYPOGRAPHY.h1,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  skillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  categoryChip: {
    backgroundColor: 'transparent',
  },
  categoryChipText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.caption.fontSize,
  },
  difficultyChip: {
    paddingHorizontal: SPACING.sm,
  },
  difficultyChipText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.caption.fontSize,
  },
  earningPotential: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  earningCard: {
    flex: 1,
    alignItems: 'center',
  },
  earningDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: SPACING.md,
  },
  earningLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  earningValue: {
    ...TYPOGRAPHY.h3,
    color: COLORS.white,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  metricsContainer: {
    marginTop: -SPACING.xl,
    marginHorizontal: SPACING.lg,
    borderRadius: 16,
    padding: SPACING.lg,
    ...SHADOWS.elevation4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  metricItem: {
    width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.md) / 2,
    alignItems: 'center',
  },
  metricIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.elevation2,
  },
  metricLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  metricValue: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginVertical: SPACING.xs,
    textAlign: 'center',
  },
  metricProgress: {
    width: '100%',
    height: 4,
    marginTop: SPACING.xs,
  },
  descriptionCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: 16,
    ...SHADOWS.elevation4,
  },
  descriptionText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    lineHeight: 24,
  },
  divider: {
    marginVertical: SPACING.lg,
    backgroundColor: COLORS.border,
  },
  learningOutcomes: {
    marginTop: SPACING.md,
  },
  outcomesTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  outcomeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  outcomeText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    flex: 1,
    marginLeft: SPACING.sm,
    lineHeight: 20,
  },
  noOutcomesText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  prerequisites: {
    marginTop: SPACING.md,
  },
  prerequisitesTitle: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  prerequisiteChip: {
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  noPrerequisitesText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  expertsSection: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  expertCountBadge: {
    marginLeft: SPACING.sm,
    backgroundColor: COLORS.primary,
  },
  noExpertsCard: {
    marginTop: SPACING.md,
    borderRadius: 16,
    ...SHADOWS.elevation2,
  },
  noExpertsContent: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  noExpertsText: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  noExpertsSubtext: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  selectedExpertCard: {
    marginTop: SPACING.lg,
    borderRadius: 16,
    ...SHADOWS.elevation4,
  },
  selectedExpertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedExpertAvatar: {
    marginRight: SPACING.md,
  },
  selectedExpertInfo: {
    flex: 1,
  },
  selectedExpertName: {
    ...TYPOGRAPHY.h4,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  selectedExpertMeta: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  expertRatingChip: {
    backgroundColor: COLORS.warning + '20',
  },
  expertRatingText: {
    color: COLORS.warning,
    fontSize: TYPOGRAPHY.caption.fontSize,
  },
  expertExperienceChip: {
    backgroundColor: COLORS.info + '20',
  },
  expertExperienceText: {
    color: COLORS.info,
    fontSize: TYPOGRAPHY.caption.fontSize,
  },
  selectedExpertBio: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  selectExpertButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
  },
  selectExpertButtonLabel: {
    ...TYPOGRAPHY.button,
  },
  ctaSpacer: {
    height: Platform.OS === 'ios' ? 160 : 140,
  },
  enrollmentCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...SHADOWS.elevation16,
  },
  ctaGradient: {
    paddingTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xxxl : SPACING.xxl,
  },
  ctaContent: {
    alignItems: 'center',
  },
  ctaTextContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  ctaTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  ctaSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.white,
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  pricingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  originalPrice: {
    ...TYPOGRAPHY.body,
    color: COLORS.white,
    opacity: 0.7,
    textDecorationLine: 'line-through',
    marginRight: SPACING.sm,
  },
  currentPrice: {
    ...TYPOGRAPHY.h1,
    color: COLORS.white,
    marginRight: SPACING.sm,
  },
  discountBadge: {
    backgroundColor: COLORS.error,
  },
  featuresList: {
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  featureText: {
    ...TYPOGRAPHY.body,
    color: COLORS.white,
    marginLeft: SPACING.sm,
  },
  enrollButton: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    ...SHADOWS.elevation8,
  },
  enrollButtonLabel: {
    ...TYPOGRAPHY.button,
    color: COLORS.primary,
  },
  enrollButtonContent: {
    paddingVertical: SPACING.md,
  },
  paymentOptions: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  paymentOptionsText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    opacity: 0.8,
    marginBottom: SPACING.xs,
  },
  paymentIcons: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
});

export default SkillDetailsScreen;