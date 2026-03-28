/**
 * 🏢 MOSA FORGE - Enterprise Skill Detail Component
 * 🎯 Interactive Skill Discovery & Enrollment Interface
 * 📊 Real-time Market Demand & Earning Potential
 * 👥 Expert Showcase & Quality Metrics
 * 🚀 React Native with Expo Router
 * 
 * @component SkillDetailScreen
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

// 🏗️ Enterprise Components
import EnterpriseLoading from '../../components/shared/EnterpriseLoading';
import SkillMetricsCard from '../../components/skills/SkillMetricsCard';
import ExpertShowcase from '../../components/skills/ExpertShowcase';
import MarketInsights from '../../components/skills/MarketInsights';
import EnrollmentFlow from '../../components/skills/EnrollmentFlow';
import QualityBadge from '../../components/shared/QualityBadge';
import ProgressTracker from '../../components/shared/ProgressTracker';

// 📊 Enterprise Hooks
import useSkillDetail from '../../hooks/useSkillDetail';
import useEnrollmentManager from '../../hooks/useEnrollmentManager';
import usePaymentHandler from '../../hooks/usePaymentHandler';
import useUserProgress from '../../hooks/useUserProgress';

// 🎨 Enterprise Design System
import {
  Colors,
  Typography,
  Spacing,
  Shadows,
  Gradients,
  Animations
} from '../../design-system/theme';

const { width, height } = Dimensions.get('window');

const SkillDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { skillId } = params;

  // 🎯 State Management
  const [skillData, setSkillData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [enrollmentStatus, setEnrollmentStatus] = useState(null);
  const [animation] = useState(new Animated.Value(0));

  // 🏗️ Enterprise Hooks
  const {
    fetchSkillDetail,
    fetchExpertsForSkill,
    fetchMarketInsights,
    calculateEarningPotential
  } = useSkillDetail();

  const {
    checkEnrollmentStatus,
    initiateEnrollment,
    cancelEnrollment
  } = useEnrollmentManager();

  const {
    userProgress,
    hasPrerequisites,
    isEligibleForSkill
  } = useUserProgress();

  const {
    processPayment,
    paymentMethods
  } = usePaymentHandler();

  // 📊 Animation Effects
  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true
    }).start();
  }, []);

  // 📈 Load Skill Data
  const loadSkillData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [
        skillDetail,
        experts,
        marketInsights,
        enrollmentCheck
      ] = await Promise.all([
        fetchSkillDetail(skillId),
        fetchExpertsForSkill(skillId),
        fetchMarketInsights(skillId),
        checkEnrollmentStatus(skillId)
      ]);

      const earningPotential = calculateEarningPotential(skillDetail);

      setSkillData({
        ...skillDetail,
        experts,
        marketInsights,
        earningPotential
      });

      setEnrollmentStatus(enrollmentCheck);

    } catch (error) {
      console.error('Failed to load skill data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [skillId]);

  // 🔄 Refresh Handler
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadSkillData();
  }, [loadSkillData]);

  // 🎯 Initial Load
  useEffect(() => {
    loadSkillData();
  }, [loadSkillData]);

  // 💰 Handle Enrollment
  const handleEnrollment = useCallback(async () => {
    try {
      if (!isEligibleForSkill(skillId)) {
        // 🚨 Show eligibility modal
        router.push({
          pathname: '/(modals)/eligibility-check',
          params: { skillId }
        });
        return;
      }

      // 🎯 Initiate Enrollment Flow
      const enrollmentResult = await initiateEnrollment({
        skillId,
        preferences: {
          learningStyle: userProgress.learningStyle,
          availability: userProgress.availability
        }
      });

      if (enrollmentResult.success) {
        // 📊 Navigate to payment flow
        router.push({
          pathname: '/(payment)/bundle-checkout',
          params: {
            skillId,
            enrollmentId: enrollmentResult.enrollmentId
          }
        });
      }

    } catch (error) {
      console.error('Enrollment failed:', error);
    }
  }, [skillId, userProgress]);

  // 🔄 Handle Cancellation
  const handleCancellation = useCallback(async () => {
    try {
      const cancellationResult = await cancelEnrollment(skillId);
      
      if (cancellationResult.success) {
        setEnrollmentStatus(null);
        // 📧 Show success message
      }
    } catch (error) {
      console.error('Cancellation failed:', error);
    }
  }, [skillId]);

  // 📊 Render Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <EnterpriseLoading
          message="Loading skill details..."
          showProgress={true}
        />
      </SafeAreaView>
    );
  }

  // 🚨 Render Error State
  if (!skillData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Skill Not Found</Text>
          <Text style={styles.errorMessage}>
            The requested skill could not be loaded. Please try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 🎨 Animation Styles
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0]
  });

  const opacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* 🎯 Skill Header Section */}
        <Animated.View
          style={[
            styles.headerSection,
            {
              opacity,
              transform: [{ translateY }]
            }
          ]}
        >
          <LinearGradient
            colors={Gradients.primary}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.headerContent}>
              <View style={styles.skillHeader}>
                <View style={styles.skillIconContainer}>
                  <Image
                    source={{ uri: skillData.icon }}
                    style={styles.skillIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.skillTitleContainer}>
                  <Text style={styles.skillCategory}>
                    {skillData.category}
                  </Text>
                  <Text style={styles.skillTitle}>
                    {skillData.name}
                  </Text>
                  <View style={styles.skillMetaRow}>
                    <QualityBadge
                      score={skillData.qualityScore}
                      size="small"
                    />
                    <Text style={styles.skillDifficulty}>
                      {skillData.difficulty} • {skillData.duration} months
                    </Text>
                  </View>
                </View>
              </View>

              {/* 🎯 Skill Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {skillData.experts?.length || 0}
                  </Text>
                  <Text style={styles.statLabel}>Experts</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {skillData.completionRate}%
                  </Text>
                  <Text style={styles.statLabel}>Success Rate</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {skillData.averageSalary}
                  </Text>
                  <Text style={styles.statLabel}>Avg Salary</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* 📊 Navigation Tabs */}
        <View style={styles.tabContainer}>
          {['overview', 'experts', 'market', 'curriculum'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabItem,
                selectedTab === tab && styles.tabItemActive
              ]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab && styles.tabTextActive
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {selectedTab === tab && (
                <View style={styles.tabIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* 🎯 Tab Content */}
        <View style={styles.contentContainer}>
          {selectedTab === 'overview' && (
            <>
              {/* 📈 Skill Metrics */}
              <SkillMetricsCard
                skillId={skillId}
                metrics={skillData.metrics}
              />

              {/* 💰 Earning Potential */}
              <View style={styles.earningCard}>
                <View style={styles.earningHeader}>
                  <MaterialIcons
                    name="attach-money"
                    size={24}
                    color={Colors.success}
                  />
                  <Text style={styles.earningTitle}>
                    Earning Potential
                  </Text>
                </View>
                <View style={styles.earningGrid}>
                  <View style={styles.earningItem}>
                    <Text style={styles.earningValue}>
                      ETB {skillData.earningPotential?.entryLevel || '8,000'}
                    </Text>
                    <Text style={styles.earningLabel}>
                      Entry Level
                    </Text>
                  </View>
                  <View style={styles.earningItem}>
                    <Text style={styles.earningValue}>
                      ETB {skillData.earningPotential?.midLevel || '15,000'}
                    </Text>
                    <Text style={styles.earningLabel}>
                      Mid Level
                    </Text>
                  </View>
                  <View style={styles.earningItem}>
                    <Text style={styles.earningValue}>
                      ETB {skillData.earningPotential?.expertLevel || '25,000'}
                    </Text>
                    <Text style={styles.earningLabel}>
                      Expert Level
                    </Text>
                  </View>
                </View>
                <ProgressTracker
                  currentLevel={userProgress.currentLevel}
                  targetLevel="expert"
                  skillId={skillId}
                />
              </View>

              {/* 🎓 Prerequisites */}
              {skillData.prerequisites?.length > 0 && (
                <View style={styles.prerequisitesCard}>
                  <Text style={styles.sectionTitle}>
                    Prerequisites
                  </Text>
                  <View style={styles.prerequisitesList}>
                    {skillData.prerequisites.map((prereq, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.prerequisiteItem}
                        onPress={() =>
                          router.push(`/(skills)/skill-detail?skillId=${prereq.id}`)
                        }
                      >
                        <View style={styles.prerequisiteCheck}>
                          {hasPrerequisites(prereq.id) ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color={Colors.success}
                            />
                          ) : (
                            <Ionicons
                              name="ellipse-outline"
                              size={20}
                              color={Colors.gray}
                            />
                          )}
                        </View>
                        <Text style={styles.prerequisiteText}>
                          {prereq.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}

          {selectedTab === 'experts' && (
            <ExpertShowcase
              experts={skillData.experts}
              skillId={skillId}
              onExpertSelect={(expertId) =>
                router.push(`/(experts)/expert-detail?expertId=${expertId}`)
              }
            />
          )}

          {selectedTab === 'market' && (
            <MarketInsights
              insights={skillData.marketInsights}
              skillId={skillId}
            />
          )}

          {selectedTab === 'curriculum' && (
            <View style={styles.curriculumContainer}>
              <Text style={styles.sectionTitle}>
                4-Month Learning Journey
              </Text>
              
              {skillData.curriculum?.phases?.map((phase, index) => (
                <View key={index} style={styles.phaseCard}>
                  <View style={styles.phaseHeader}>
                    <View style={styles.phaseNumber}>
                      <Text style={styles.phaseNumberText}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.phaseTitleContainer}>
                      <Text style={styles.phaseTitle}>
                        {phase.title}
                      </Text>
                      <Text style={styles.phaseDuration}>
                        {phase.duration}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.phaseContent}>
                    {phase.modules?.map((module, modIndex) => (
                      <View key={modIndex} style={styles.moduleItem}>
                        <View style={styles.moduleIcon}>
                          <FontAwesome5
                            name={module.icon}
                            size={16}
                            color={Colors.primary}
                          />
                        </View>
                        <View style={styles.moduleDetails}>
                          <Text style={styles.moduleTitle}>
                            {module.title}
                          </Text>
                          <Text style={styles.moduleDescription}>
                            {module.description}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 📊 Enrollment Flow (Conditional) */}
        {enrollmentStatus?.status === 'active' ? (
          <View style={styles.activeEnrollmentCard}>
            <View style={styles.enrollmentStatusHeader}>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={Colors.success}
              />
              <Text style={styles.enrollmentStatusTitle}>
                You're Enrolled!
              </Text>
            </View>
            <ProgressTracker
              currentProgress={enrollmentStatus.progress}
              skillId={skillId}
              showMilestones={true}
            />
            <View style={styles.enrollmentActions}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={() =>
                  router.push('/(learning)/course-dashboard')
                }
              >
                <Text style={styles.continueButtonText}>
                  Continue Learning
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancellation}
              >
                <Text style={styles.cancelButtonText}>
                  Cancel Enrollment
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <EnrollmentFlow
            skillId={skillId}
            skillData={skillData}
            enrollmentStatus={enrollmentStatus}
            onEnrollPress={handleEnrollment}
            onPaymentSelect={(method) =>
              router.push({
                pathname: '/(payment)/payment-method',
                params: { method, skillId }
              })
            }
          />
        )}
      </ScrollView>

      {/* 🎯 Floating Action Button for Quick Actions */}
      {!enrollmentStatus?.status && (
        <Animated.View
          style={[
            styles.fabContainer,
            {
              opacity,
              transform: [{ translateY }]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.fab}
            onPress={handleEnrollment}
          >
            <LinearGradient
              colors={Gradients.primary}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.fabText}>
                Enroll Now - ETB 1,999
              </Text>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={Colors.white}
              />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

// 🎨 Enterprise Design System Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background
  },
  scrollView: {
    flex: 1
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl
  },
  errorTitle: {
    ...Typography.heading2,
    color: Colors.error,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.gray,
    textAlign: 'center',
    marginBottom: Spacing.xl
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.sm
  },
  retryButtonText: {
    ...Typography.button,
    color: Colors.white
  },
  headerSection: {
    marginBottom: Spacing.lg
  },
  headerGradient: {
    borderBottomLeftRadius: Spacing.xl,
    borderBottomRightRadius: Spacing.xl,
    ...Shadows.large
  },
  headerContent: {
    padding: Spacing.xl,
    paddingTop: Spacing.xxl
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg
  },
  skillIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: Colors.white,
    borderRadius: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
    ...Shadows.medium
  },
  skillIcon: {
    width: 60,
    height: 60
  },
  skillTitleContainer: {
    flex: 1
  },
  skillCategory: {
    ...Typography.caption,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: Spacing.xs
  },
  skillTitle: {
    ...Typography.heading1,
    color: Colors.white,
    marginBottom: Spacing.sm
  },
  skillMetaRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  skillDifficulty: {
    ...Typography.caption,
    color: Colors.white,
    opacity: 0.9,
    marginLeft: Spacing.sm
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Spacing.md,
    padding: Spacing.md,
    ...Shadows.medium
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statValue: {
    ...Typography.heading2,
    color: Colors.primary
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.gray,
    marginTop: Spacing.xs
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.lightGray,
    marginHorizontal: Spacing.md
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    position: 'relative'
  },
  tabItemActive: {
    // Active state handled by indicator
  },
  tabText: {
    ...Typography.button,
    color: Colors.gray
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600'
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: '80%',
    height: 3,
    backgroundColor: Colors.primary,
    borderRadius: 1.5
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg
  },
  earningCard: {
    backgroundColor: Colors.white,
    borderRadius: Spacing.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium
  },
  earningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg
  },
  earningTitle: {
    ...Typography.heading3,
    color: Colors.text,
    marginLeft: Spacing.md
  },
  earningGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg
  },
  earningItem: {
    alignItems: 'center',
    flex: 1
  },
  earningValue: {
    ...Typography.heading2,
    color: Colors.success
  },
  earningLabel: {
    ...Typography.caption,
    color: Colors.gray,
    marginTop: Spacing.xs
  },
  prerequisitesCard: {
    backgroundColor: Colors.white,
    borderRadius: Spacing.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium
  },
  sectionTitle: {
    ...Typography.heading3,
    color: Colors.text,
    marginBottom: Spacing.lg
  },
  prerequisitesList: {
    // Styles for prerequisites list
  },
  prerequisiteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray
  },
  prerequisiteCheck: {
    width: 24,
    alignItems: 'center',
    marginRight: Spacing.md
  },
  prerequisiteText: {
    ...Typography.body,
    color: Colors.text,
    flex: 1
  },
  curriculumContainer: {
    // Curriculum container styles
  },
  phaseCard: {
    backgroundColor: Colors.white,
    borderRadius: Spacing.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.medium
  },
  phaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg
  },
  phaseNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md
  },
  phaseNumberText: {
    ...Typography.heading3,
    color: Colors.white
  },
  phaseTitleContainer: {
    flex: 1
  },
  phaseTitle: {
    ...Typography.heading3,
    color: Colors.text
  },
  phaseDuration: {
    ...Typography.caption,
    color: Colors.gray,
    marginTop: Spacing.xs
  },
  phaseContent: {
    // Phase content styles
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray
  },
  moduleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
    marginTop: 2
  },
  moduleDetails: {
    flex: 1
  },
  moduleTitle: {
    ...Typography.bodyBold,
    color: Colors.text,
    marginBottom: Spacing.xs
  },
  moduleDescription: {
    ...Typography.caption,
    color: Colors.gray
  },
  activeEnrollmentCard: {
    backgroundColor: Colors.white,
    borderRadius: Spacing.md,
    padding: Spacing.lg,
    margin: Spacing.lg,
    ...Shadows.large
  },
  enrollmentStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg
  },
  enrollmentStatusTitle: {
    ...Typography.heading3,
    color: Colors.success,
    marginLeft: Spacing.md
  },
  enrollmentActions: {
    flexDirection: 'row',
    marginTop: Spacing.lg
  },
  continueButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.sm,
    marginRight: Spacing.md
  },
  continueButtonText: {
    ...Typography.button,
    color: Colors.white,
    textAlign: 'center'
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.errorLight,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.sm
  },
  cancelButtonText: {
    ...Typography.button,
    color: Colors.error,
    textAlign: 'center'
  },
  fabContainer: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg
  },
  fab: {
    borderRadius: Spacing.md,
    overflow: 'hidden',
    ...Shadows.large
  },
  fabGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl
  },
  fabText: {
    ...Typography.heading3,
    color: Colors.white,
    marginRight: Spacing.md
  }
});

export default SkillDetailScreen;