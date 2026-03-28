/**
 * 🏢 MOSA FORGE - Enterprise Health & Sports Skills Interface
 * 🏥 Comprehensive Health, Fitness & Sports Training Platform
 * 🎯 Skill Selection & Expert Matching Interface
 * 📊 Real-time Availability & Quality Metrics
 * 🚀 React Native with Expo - Enterprise Architecture
 * 
 * @module HealthSkillsScreen
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Animated,
  FlatList,
  RefreshControl,
  Dimensions,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// 🏗️ Enterprise Dependencies
import EnterpriseHeader from '../../components/shared/EnterpriseHeader';
import SkillCategoryCard from '../../components/skills/SkillCategoryCard';
import ExpertPreviewCard from '../../components/skills/ExpertPreviewCard';
import QualityScoreBadge from '../../components/quality/QualityScoreBadge';
import AvailabilityIndicator from '../../components/skills/AvailabilityIndicator';
import PriceDisplay from '../../components/payment/PriceDisplay';
import LoadingOverlay from '../../components/shared/LoadingOverlay';
import ErrorBoundary from '../../components/shared/ErrorBoundary';

// 🎯 Context & Hooks
import { useAuth } from '../../contexts/AuthContext';
import { useEnrollment } from '../../contexts/EnrollmentContext';
import { usePayment } from '../../contexts/PaymentContext';
import { useQualityMetrics } from '../../hooks/useQualityMetrics';

// 📊 Constants
import { HEALTH_SPORTS_SKILLS, SKILL_CATEGORIES } from '../../constants/skills-data';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

const HealthSkillsScreen = () => {
  // 🎯 Navigation & Routing
  const navigation = useNavigation();
  const route = useRoute();
  const { categoryId = 'health_sports' } = route.params || {};

  // 🏗️ State Management
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [availableExperts, setAvailableExperts] = useState([]);
  const [filteredExperts, setFilteredExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    minQuality: 4.0,
    maxDistance: 50, // km
    availability: 'any',
    tier: 'all',
    sortBy: 'quality'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [enrollmentStage, setEnrollmentStage] = useState('skill_selection'); // skill_selection, expert_selection, confirmation

  // 🎯 Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // 🏗️ Context Hooks
  const { user, isAuthenticated } = useAuth();
  const { 
    initiateEnrollment, 
    checkEligibility, 
    enrollmentStatus,
    activeEnrollments 
  } = useEnrollment();
  const { paymentMethods, getInstallmentPlans } = usePayment();
  const { getExpertQualityMetrics } = useQualityMetrics();

  // 🏥 Health Skills Data
  const healthSkills = HEALTH_SPORTS_SKILLS;
  const currentCategory = SKILL_CATEGORIES.find(cat => cat.id === categoryId);

  // 📊 Filter Options
  const filterOptions = {
    qualityRanges: [
      { label: '4.0+ (Good)', value: 4.0 },
      { label: '4.3+ (Great)', value: 4.3 },
      { label: '4.5+ (Excellent)', value: 4.5 },
      { label: '4.7+ (Master)', value: 4.7 }
    ],
    availabilityOptions: [
      { label: 'Any Time', value: 'any' },
      { label: 'Within 24 Hours', value: '24h' },
      { label: 'Within Week', value: 'week' },
      { label: 'Weekends Only', value: 'weekends' }
    ],
    tierOptions: [
      { label: 'All Tiers', value: 'all' },
      { label: 'Master Tier', value: 'master' },
      { label: 'Senior Tier', value: 'senior' },
      { label: 'Standard Tier', value: 'standard' }
    ],
    sortOptions: [
      { label: 'Highest Quality', value: 'quality' },
      { label: 'Most Available', value: 'availability' },
      { label: 'Lowest Price', value: 'price' },
      { label: 'Closest Distance', value: 'distance' }
    ]
  };

  /**
   * 🎯 INITIALIZE SCREEN - Enterprise Grade
   */
  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      setLoading(true);
      
      // 🎯 Animate Screen Entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        })
      ]).start();

      // 🔍 Check User Eligibility
      await checkUserEligibility();

      // 📊 Load Available Experts
      await loadAvailableExperts();

      setLoading(false);

    } catch (error) {
      console.error('Screen initialization failed:', error);
      setLoading(false);
      showErrorAlert('Initialization Error', 'Failed to initialize health skills screen');
    }
  };

  /**
   * 🔍 CHECK USER ELIGIBILITY
   */
  const checkUserEligibility = async () => {
    if (!isAuthenticated) return;

    try {
      const eligibility = await checkEligibility({
        studentId: user.id,
        category: 'health_sports'
      });

      if (!eligibility.eligible) {
        Alert.alert(
          'Eligibility Check',
          eligibility.reasons?.join('\n') || 'You are not eligible for health skills enrollment',
          [
            { text: 'OK', onPress: () => navigation.goBack() },
            { text: 'Contact Support', onPress: () => navigation.navigate('Support') }
          ]
        );
      }

    } catch (error) {
      console.error('Eligibility check failed:', error);
    }
  };

  /**
   * 📊 LOAD AVAILABLE EXPERTS
   */
  const loadAvailableExperts = async (skillId = null) => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/experts/available`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          category: 'health_sports',
          skillId,
          filters: {
            minQuality: filters.minQuality,
            availability: filters.availability,
            tier: filters.tier !== 'all' ? filters.tier : undefined
          }
        })
      });

      if (!response.ok) throw new Error('Failed to load experts');

      const data = await response.json();
      setAvailableExperts(data.experts || []);
      applyFilters(data.experts || []);

    } catch (error) {
      console.error('Failed to load experts:', error);
      setAvailableExperts([]);
      setFilteredExperts([]);
    }
  };

  /**
   * 🎯 APPLY FILTERS
   */
  const applyFilters = (experts = availableExperts) => {
    let filtered = [...experts];

    // ⭐ Quality Filter
    filtered = filtered.filter(expert => expert.qualityScore >= filters.minQuality);

    // 🎯 Tier Filter
    if (filters.tier !== 'all') {
      filtered = filtered.filter(expert => expert.tier === filters.tier);
    }

    // 📍 Distance Filter (if location available)
    if (user?.location && filters.maxDistance < 1000) {
      filtered = filtered.filter(expert => {
        const distance = calculateDistance(user.location, expert.location);
        return distance <= filters.maxDistance;
      });
    }

    // 🔄 Sort Filter
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'quality':
          return b.qualityScore - a.qualityScore;
        case 'availability':
          return b.availabilityScore - a.availabilityScore;
        case 'price':
          return a.hourlyRate - b.hourlyRate;
        case 'distance':
          const distA = calculateDistance(user?.location, a.location);
          const distB = calculateDistance(user?.location, b.location);
          return distA - distB;
        default:
          return b.qualityScore - a.qualityScore;
      }
    });

    setFilteredExperts(filtered);
  };

  /**
   * 🎯 HANDLE SKILL SELECTION
   */
  const handleSkillSelection = async (skill) => {
    try {
      // 🎯 Haptic Feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      setSelectedSkill(skill);
      setEnrollmentStage('expert_selection');

      // 📊 Load Experts for Selected Skill
      setLoading(true);
      await loadAvailableExperts(skill.id);
      setLoading(false);

      // 📍 Scroll to Experts Section
      setTimeout(() => {
        expertsRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);

    } catch (error) {
      console.error('Skill selection failed:', error);
      showErrorAlert('Selection Error', 'Failed to select skill');
    }
  };

  /**
   * 👥 HANDLE EXPERT SELECTION
   */
  const handleExpertSelection = async (expert) => {
    try {
      // 🎯 Haptic Feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      setSelectedExpert(expert);
      setEnrollmentStage('confirmation');

      // 📊 Load Expert Quality Metrics
      const qualityMetrics = await getExpertQualityMetrics(expert.id);
      
      // 🎯 Show Expert Details Modal
      navigation.navigate('ExpertDetails', {
        expert,
        qualityMetrics,
        skill: selectedSkill
      });

    } catch (error) {
      console.error('Expert selection failed:', error);
      showErrorAlert('Selection Error', 'Failed to select expert');
    }
  };

  /**
   * 🎓 INITIATE ENROLLMENT
   */
  const initiateHealthEnrollment = async () => {
    if (!selectedSkill || !selectedExpert) {
      showErrorAlert('Selection Required', 'Please select both a skill and an expert');
      return;
    }

    try {
      setLoading(true);

      // 🎯 Prepare Enrollment Data
      const enrollmentData = {
        studentId: user.id,
        skillId: selectedSkill.id,
        expertId: selectedExpert.id,
        category: 'health_sports',
        paymentMethod: paymentMethods[0]?.id, // Default payment method
        preferences: {
          schedulePreference: 'flexible',
          learningStyle: user.learningStyle || 'practical',
          healthConsiderations: user.healthConsiderations || []
        },
        metadata: {
          enrollmentType: 'health_skills',
          bundlePrice: 1999,
          platformShare: 1000,
          expertEarnings: 999
        }
      };

      // 💰 Get Installment Plans
      const installmentPlans = await getInstallmentPlans(1999);
      
      // 🎯 Navigate to Enrollment Confirmation
      navigation.navigate('EnrollmentConfirmation', {
        enrollmentData,
        selectedSkill,
        selectedExpert,
        installmentPlans,
        category: 'health_sports'
      });

      setLoading(false);

    } catch (error) {
      console.error('Enrollment initiation failed:', error);
      setLoading(false);
      showErrorAlert('Enrollment Error', 'Failed to initiate enrollment process');
    }
  };

  /**
   * 🔄 HANDLE REFRESH
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAvailableExperts(selectedSkill?.id);
      setRefreshing(false);
    } catch (error) {
      console.error('Refresh failed:', error);
      setRefreshing(false);
    }
  };

  /**
   * 🎯 FILTERS MODAL
   */
  const renderFiltersModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showFilters}
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Experts</Text>
            <TouchableOpacity
              onPress={() => setShowFilters(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersContainer}>
            {/* ⭐ Quality Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Minimum Quality Score</Text>
              {filterOptions.qualityRanges.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    filters.minQuality === option.value && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilters({ ...filters, minQuality: option.value })}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.minQuality === option.value && styles.filterOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {filters.minQuality === option.value && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* 🎯 Tier Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Expert Tier</Text>
              {filterOptions.tierOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    filters.tier === option.value && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilters({ ...filters, tier: option.value })}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.tier === option.value && styles.filterOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {filters.tier === option.value && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* 🔄 Sort Options */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Sort By</Text>
              {filterOptions.sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    filters.sortBy === option.value && styles.filterOptionSelected
                  ]}
                  onPress={() => setFilters({ ...filters, sortBy: option.value })}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.sortBy === option.value && styles.filterOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {filters.sortBy === option.value && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setFilters({
                  minQuality: 4.0,
                  maxDistance: 50,
                  availability: 'any',
                  tier: 'all',
                  sortBy: 'quality'
                });
              }}
            >
              <Text style={styles.resetButtonText}>Reset Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                applyFilters();
                setShowFilters(false);
              }}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  /**
   * 🏥 RENDER SKILL CATEGORIES
   */
  const renderSkillCategories = () => (
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
        <Text style={styles.sectionTitle}>Health & Sports Skills</Text>
        <Text style={styles.sectionSubtitle}>
          Select a skill to find certified experts
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.skillsScrollView}
      >
        {healthSkills.map((skill, index) => (
          <Animated.View
            key={skill.id}
            style={[
              styles.skillCardWrapper,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim.interpolate({
                    inputRange: [0, 50],
                    outputRange: [0, index * 20]
                  })}
                ]
              }
            ]}
          >
            <SkillCategoryCard
              skill={skill}
              isSelected={selectedSkill?.id === skill.id}
              onPress={() => handleSkillSelection(skill)}
              showPrice={true}
              price={1999}
              features={[
                '4-Month Training',
                'Certified Expert',
                'Hands-on Practice',
                'Yachi Verification'
              ]}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </Animated.View>
  );

  /**
   * 👥 RENDER AVAILABLE EXPERTS
   */
  const renderAvailableExperts = () => {
    if (!selectedSkill) return null;

    return (
      <Animated.View
        style={[
          styles.expertsContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <View style={styles.expertsHeader}>
          <View>
            <Text style={styles.expertsTitle}>Available Experts</Text>
            <Text style={styles.expertsSubtitle}>
              For {selectedSkill.name}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.filtersButton}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="filter" size={20} color={COLORS.primary} />
            <Text style={styles.filtersButtonText}>Filters</Text>
          </TouchableOpacity>
        </View>

        {filteredExperts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={60} color={COLORS.gray} />
            <Text style={styles.emptyStateTitle}>No Experts Available</Text>
            <Text style={styles.emptyStateText}>
              Try adjusting your filters or check back later
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadAvailableExperts(selectedSkill.id)}
            >
              <Text style={styles.retryButtonText}>Refresh Experts</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={expertsRef}
            data={filteredExperts}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateX: slideAnim.interpolate({
                        inputRange: [0, 50],
                        outputRange: [0, index % 2 === 0 ? 20 : -20]
                      })
                    }
                  ]
                }}
              >
                <ExpertPreviewCard
                  expert={item}
                  onPress={() => handleExpertSelection(item)}
                  showQuality={true}
                  showAvailability={true}
                  showTier={true}
                  actionLabel="Select Expert"
                />
              </Animated.View>
            )}
            contentContainerStyle={styles.expertsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
          />
        )}
      </Animated.View>
    );
  };

  /**
   * 🎯 RENDER ENROLLMENT PROGRESS
   */
  const renderEnrollmentProgress = () => {
    if (enrollmentStage === 'skill_selection') return null;

    const steps = [
      { key: 'skill_selection', label: 'Select Skill', completed: true },
      { key: 'expert_selection', label: 'Choose Expert', completed: enrollmentStage !== 'skill_selection' },
      { key: 'confirmation', label: 'Confirm', completed: enrollmentStage === 'confirmation' }
    ];

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              <View style={styles.progressStep}>
                <View
                  style={[
                    styles.progressDot,
                    step.completed && styles.progressDotCompleted
                  ]}
                >
                  {step.completed && (
                    <Ionicons name="checkmark" size={16} color={COLORS.white} />
                  )}
                </View>
                <Text style={styles.progressLabel}>{step.label}</Text>
              </View>
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.progressLine,
                    step.completed && styles.progressLineCompleted
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  };

  /**
   * 🎯 RENDER ACTION BUTTONS
   */
  const renderActionButtons = () => {
    if (!selectedSkill) return null;

    return (
      <View style={styles.actionButtonsContainer}>
        {selectedExpert ? (
          <>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setSelectedExpert(null)}
            >
              <Text style={styles.secondaryButtonText}>Change Expert</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={initiateHealthEnrollment}
              disabled={loading}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.gradientButton}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Continue Enrollment</Text>
                    <PriceDisplay
                      amount={1999}
                      currency="ETB"
                      size="medium"
                      showBreakdown={false}
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              if (filteredExperts.length > 0) {
                handleExpertSelection(filteredExperts[0]);
              }
            }}
            disabled={filteredExperts.length === 0}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.gradientButton}
            >
              <Text style={styles.primaryButtonText}>
                {filteredExperts.length === 0 
                  ? 'No Experts Available' 
                  : 'Select Expert to Continue'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /**
   * 🏗️ RENDER SCREEN
   */
  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <EnterpriseHeader
          title="Health & Sports Skills"
          showBack={true}
          rightActions={[
            {
              icon: 'notifications-outline',
              onPress: () => navigation.navigate('Notifications')
            },
            {
              icon: 'help-circle-outline',
              onPress: () => navigation.navigate('Support')
            }
          ]}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 🎯 Enrollment Progress */}
          {renderEnrollmentProgress()}

          {/* 🏥 Skill Categories */}
          {renderSkillCategories()}

          {/* 👥 Available Experts */}
          {renderAvailableExperts()}

          {/* 📊 Quality Assurance Banner */}
          <View style={styles.qualityBanner}>
            <Ionicons name="shield-checkmark" size={24} color={COLORS.success} />
            <View style={styles.qualityBannerContent}>
              <Text style={styles.qualityBannerTitle}>Quality Guaranteed</Text>
              <Text style={styles.qualityBannerText}>
                All experts are verified and maintain 4.0+ quality score. 
                Auto-expert switching available if quality drops.
              </Text>
            </View>
          </View>

          {/* 💰 Pricing Information */}
          <View style={styles.pricingCard}>
            <Text style={styles.pricingTitle}>Complete Health Training</Text>
            <PriceDisplay
              amount={1999}
              currency="ETB"
              size="large"
              showBreakdown={true}
              breakdown={[
                { label: 'Platform Fee', amount: 1000 },
                { label: 'Expert Earnings', amount: 999 }
              ]}
            />
            <Text style={styles.pricingNote}>
              Includes 4-month training, expert guidance, certification, and Yachi verification
            </Text>
          </View>
        </ScrollView>

        {/* 🎯 Action Buttons */}
        {renderActionButtons()}

        {/* 🎯 Filters Modal */}
        {renderFiltersModal()}

        {/* 🌀 Loading Overlay */}
        <LoadingOverlay visible={loading} message="Loading health skills..." />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  sectionContainer: {
    paddingHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
  },
  sectionHeader: {
    marginBottom: SIZES.padding,
  },
  sectionTitle: {
    ...FONTS.h1,
    color: COLORS.text,
    marginBottom: SIZES.base,
  },
  sectionSubtitle: {
    ...FONTS.body3,
    color: COLORS.gray,
  },
  skillsScrollView: {
    marginHorizontal: -SIZES.padding,
    paddingHorizontal: SIZES.padding,
  },
  skillCardWrapper: {
    marginRight: SIZES.base,
    marginBottom: SIZES.base,
  },
  expertsContainer: {
    marginTop: SIZES.padding * 2,
    paddingHorizontal: SIZES.padding,
  },
  expertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.padding,
  },
  expertsTitle: {
    ...FONTS.h2,
    color: COLORS.text,
  },
  expertsSubtitle: {
    ...FONTS.body3,
    color: COLORS.gray,
    marginTop: 4,
  },
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.base,
    paddingVertical: SIZES.base / 2,
    backgroundColor: COLORS.primary + '10',
    borderRadius: SIZES.radius,
  },
  filtersButtonText: {
    ...FONTS.body4,
    color: COLORS.primary,
    marginLeft: 4,
  },
  expertsList: {
    paddingBottom: SIZES.padding,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.padding * 2,
  },
  emptyStateTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    marginTop: SIZES.padding,
    marginBottom: SIZES.base,
  },
  emptyStateText: {
    ...FONTS.body3,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SIZES.padding,
  },
  retryButton: {
    paddingHorizontal: SIZES.padding,
    paddingVertical: SIZES.base,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
  },
  retryButtonText: {
    ...FONTS.body4,
    color: COLORS.white,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: SIZES.padding,
    paddingTop: SIZES.padding,
  },
  progressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressDotCompleted: {
    backgroundColor: COLORS.primary,
  },
  progressLabel: {
    ...FONTS.body4,
    color: COLORS.gray,
    fontSize: 12,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 8,
  },
  progressLineCompleted: {
    backgroundColor: COLORS.primary,
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: SIZES.padding,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.medium,
  },
  primaryButton: {
    flex: 1,
    marginLeft: SIZES.base,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.padding,
    borderRadius: SIZES.radius,
  },
  primaryButtonText: {
    ...FONTS.h3,
    color: COLORS.white,
    marginRight: SIZES.base,
  },
  secondaryButton: {
    paddingVertical: SIZES.padding,
    paddingHorizontal: SIZES.padding,
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
    marginRight: SIZES.base,
  },
  secondaryButtonText: {
    ...FONTS.h4,
    color: COLORS.text,
  },
  qualityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.padding,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
    backgroundColor: COLORS.success + '10',
    borderRadius: SIZES.radius,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  qualityBannerContent: {
    flex: 1,
    marginLeft: SIZES.base,
  },
  qualityBannerTitle: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: 4,
  },
  qualityBannerText: {
    ...FONTS.body4,
    color: COLORS.gray,
  },
  pricingCard: {
    padding: SIZES.padding,
    marginHorizontal: SIZES.padding,
    marginTop: SIZES.padding,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    ...SHADOWS.medium,
  },
  pricingTitle: {
    ...FONTS.h3,
    color: COLORS.text,
    marginBottom: SIZES.padding,
  },
  pricingNote: {
    ...FONTS.body4,
    color: COLORS.gray,
    marginTop: SIZES.base,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: SIZES.radius * 2,
    borderTopRightRadius: SIZES.radius * 2,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.padding,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    ...FONTS.h2,
    color: COLORS.text,
  },
  closeButton: {
    padding: SIZES.base / 2,
  },
  filtersContainer: {
    padding: SIZES.padding,
  },
  filterSection: {
    marginBottom: SIZES.padding,
  },
  filterLabel: {
    ...FONTS.h4,
    color: COLORS.text,
    marginBottom: SIZES.base,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZES.base,
    paddingHorizontal: SIZES.base,
    marginBottom: SIZES.base / 2,
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
  },
  filterOptionSelected: {
    backgroundColor: COLORS.primary + '20',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  filterOptionText: {
    ...FONTS.body3,
    color: COLORS.text,
  },
  filterOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SIZES.padding,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  resetButton: {
    flex: 1,
    paddingVertical: SIZES.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.base,
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.radius,
  },
  resetButtonText: {
    ...FONTS.body3,
    color: COLORS.text,
  },
  applyButton: {
    flex: 1,
    paddingVertical: SIZES.base,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
  },
  applyButtonText: {
    ...FONTS.body3,
    color: COLORS.white,
    fontWeight: '600',
  },
});

// 🔧 Utility Functions
const calculateDistance = (location1, location2) => {
  if (!location1 || !location2) return 0;
  
  const R = 6371; // Earth's radius in km
  const dLat = toRad(location2.latitude - location1.latitude);
  const dLon = toRad(location2.longitude - location1.longitude);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(location1.latitude)) * Math.cos(toRad(location2.latitude)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const toRad = (value) => {
  return value * Math.PI / 180;
};

const showErrorAlert = (title, message) => {
  Alert.alert(
    title,
    message,
    [{ text: 'OK' }],
    { cancelable: true }
  );
};

// 🎯 Refs
const expertsRef = useRef(null);

export default HealthSkillsScreen;