/**
 * 🎯 MOSA FORGE: Enterprise Skill Selection Component
 * 
 * @component SkillSelection
 * @description Interactive 40+ skills selection with category organization
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - 40+ skills across 4 categories
 * - Interactive skill cards with package details
 * - Real-time selection validation
 * - Progress tracking and recommendations
 * - Commitment assessment integration
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  Animated,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// 🏗️ Custom Hooks
import { useAuth } from '../../../contexts/auth-context';
import { useSkills } from '../../../hooks/use-skills-data';
import { useProgressTracking } from '../../../hooks/use-progress-tracking';

// 🏗️ Enterprise Constants
const SKILL_CATEGORIES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  HEALTH_SPORTS: 'health_sports',
  BEAUTY_FASHION: 'beauty_fashion'
};

const SELECTION_LIMITS = {
  MAX_SKILLS: 3,
  MIN_SKILLS: 1
};

const PACKAGE_TIERS = {
  BASIC: { price: 1999, duration: '4 months', features: 5 },
  STANDARD: { price: 2999, duration: '6 months', features: 8 },
  PREMIUM: { price: 3999, duration: '8 months', features: 12 },
  PROFESSIONAL: { price: 4999, duration: '12 months', features: 15 },
  MASTERY: { price: 6999, duration: '16 months', features: 20 }
};

/**
 * 🏗️ Enterprise Skill Selection Component
 */
export default function SkillSelection() {
  // 🎯 State Management
  const [selectedSkills, setSelectedSkills] = useState(new Map());
  const [selectedCategory, setSelectedCategory] = useState(SKILL_CATEGORIES.ONLINE);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // 🏗️ Hooks & Context
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, updateUserProfile } = useAuth();
  const { skills, categories, loading: skillsLoading } = useSkills();
  const { updateOnboardingProgress } = useProgressTracking();

  // 🎯 Memoized Computed Values
  const filteredSkills = useMemo(() => {
    if (!skills) return [];
    
    let filtered = skills.filter(skill => 
      skill.category === selectedCategory && 
      skill.isActive
    );

    if (searchQuery) {
      filtered = filtered.filter(skill =>
        skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    return filtered;
  }, [skills, selectedCategory, searchQuery]);

  const selectedCount = useMemo(() => selectedSkills.size, [selectedSkills]);
  const canProceed = useMemo(() => 
    selectedCount >= SELECTION_LIMITS.MIN_SKILLS && 
    selectedCount <= SELECTION_LIMITS.MAX_SKILLS,
    [selectedCount]
  );

  const totalMonthlyInvestment = useMemo(() => {
    let total = 0;
    selectedSkills.forEach((packageTier, skillId) => {
      const skill = skills?.find(s => s.id === skillId);
      if (skill) {
        total += PACKAGE_TIERS[packageTier].price;
      }
    });
    return total;
  }, [selectedSkills, skills]);

  // 🎯 Effects
  useEffect(() => {
    // Animation on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      })
    ]).start();

    // Load recommendations based on user profile
    loadSkillRecommendations();
  }, []);

  useEffect(() => {
    // Update progress when skills are selected
    if (selectedCount > 0) {
      updateOnboardingProgress('skill_selection', (selectedCount / SELECTION_LIMITS.MAX_SKILLS) * 100);
    }
  }, [selectedCount]);

  // 🎯 Enterprise Methods
  const loadSkillRecommendations = useCallback(async () => {
    try {
      // In production, this would call AI recommendation service
      const userProfile = {
        interests: user?.interests || [],
        background: user?.educationalBackground,
        careerGoals: user?.careerGoals,
        timeCommitment: user?.availableHours
      };

      // Mock AI recommendations based on profile
      const recommended = skills
        ?.filter(skill => 
          skill.demandScore > 8 && 
          skill.completionRate > 0.7
        )
        .slice(0, 5) || [];

      setRecommendations(recommended);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      // Fallback to popular skills
      setRecommendations(skills?.filter(s => s.popularity > 8).slice(0, 3) || []);
    } finally {
      setIsLoading(false);
    }
  }, [skills, user]);

  const handleSkillSelection = useCallback((skillId, packageTier = 'BASIC') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newSelection = new Map(selectedSkills);

    if (newSelection.has(skillId)) {
      // Deselect skill
      newSelection.delete(skillId);
    } else {
      // Check selection limits
      if (newSelection.size >= SELECTION_LIMITS.MAX_SKILLS) {
        Alert.alert(
          'Selection Limit Reached',
          `You can select up to ${SELECTION_LIMITS.MAX_SKILLS} skills. Please deselect one to add another.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Add skill with package tier
      newSelection.set(skillId, packageTier);
    }

    setSelectedSkills(newSelection);
  }, [selectedSkills]);

  const handlePackageChange = useCallback((skillId, newPackageTier) => {
    const newSelection = new Map(selectedSkills);
    if (newSelection.has(skillId)) {
      newSelection.set(skillId, newPackageTier);
      setSelectedSkills(newSelection);
    }
  }, [selectedSkills]);

  const validateSelections = useCallback(() => {
    if (selectedCount < SELECTION_LIMITS.MIN_SKILLS) {
      Alert.alert(
        'Selection Required',
        `Please select at least ${SELECTION_LIMITS.MIN_SKILLS} skill to continue.`,
        [{ text: 'OK' }]
      );
      return false;
    }

    if (selectedCount > SELECTION_LIMITS.MAX_SKILLS) {
      Alert.alert(
        'Too Many Selections',
        `You can only select up to ${SELECTION_LIMITS.MAX_SKILLS} skills.`,
        [{ text: 'OK' }]
      );
      return false;
    }

    // Validate package affordability
    if (totalMonthlyInvestment > (user?.monthlyBudget || 10000)) {
      Alert.alert(
        'Budget Consideration',
        'Your selected packages exceed your indicated budget. Consider adjusting package tiers.',
        [
          { text: 'Adjust Selection', style: 'cancel' },
          { text: 'Continue Anyway', onPress: () => proceedToCommitment() }
        ]
      );
      return false;
    }

    return true;
  }, [selectedCount, totalMonthlyInvestment, user]);

  const proceedToCommitment = useCallback(async () => {
    if (!validateSelections()) return;

    setIsSubmitting(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Prepare selection data
      const selectionData = Array.from(selectedSkills.entries()).map(([skillId, packageTier]) => {
        const skill = skills.find(s => s.id === skillId);
        return {
          skillId,
          skillName: skill.name,
          packageTier,
          packagePrice: PACKAGE_TIERS[packageTier].price,
          packageDuration: PACKAGE_TIERS[packageTier].duration,
          category: skill.category
        };
      });

      // Update user profile with selections
      await updateUserProfile({
        selectedSkills: selectionData,
        onboardingStage: 'skill_selection_completed',
        lastActive: new Date().toISOString()
      });

      // Navigate to commitment check
      router.push({
        pathname: '/(onboarding)/commitment-check',
        params: {
          selectedSkills: JSON.stringify(selectionData),
          totalInvestment: totalMonthlyInvestment,
          skillCount: selectedCount
        }
      });

    } catch (error) {
      console.error('Failed to save skill selections:', error);
      Alert.alert(
        'Save Failed',
        'Unable to save your skill selections. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedSkills, skills, totalMonthlyInvestment, selectedCount, validateSelections]);

  const getCategoryColor = useCallback((category) => {
    const colors = {
      [SKILL_CATEGORIES.ONLINE]: '#6366f1',
      [SKILL_CATEGORIES.OFFLINE]: '#10b981',
      [SKILL_CATEGORIES.HEALTH_SPORTS]: '#f59e0b',
      [SKILL_CATEGORIES.BEAUTY_FASHION]: '#ec4899'
    };
    return colors[category] || '#6b7280';
  }, []);

  const getPackageColor = useCallback((tier) => {
    const colors = {
      BASIC: '#6b7280',
      STANDARD: '#10b981',
      PREMIUM: '#3b82f6',
      PROFESSIONAL: '#8b5cf6',
      MASTERY: '#f59e0b'
    };
    return colors[tier] || '#6b7280';
  }, []);

  // 🎯 Render Methods
  const renderCategoryTabs = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.categoryTabs}
      contentContainerStyle={styles.categoryTabsContent}
    >
      {categories?.map((category) => (
        <TouchableOpacity
          key={category.id}
          style={[
            styles.categoryTab,
            selectedCategory === category.id && styles.categoryTabActive,
            { borderColor: getCategoryColor(category.id) }
          ]}
          onPress={() => {
            setSelectedCategory(category.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons 
            name={category.icon} 
            size={20} 
            color={selectedCategory === category.id ? getCategoryColor(category.id) : '#6b7280'} 
          />
          <Text style={[
            styles.categoryTabText,
            selectedCategory === category.id && styles.categoryTabTextActive,
            selectedCategory === category.id && { color: getCategoryColor(category.id) }
          ]}>
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSkillCard = useCallback((skill) => {
    const isSelected = selectedSkills.has(skill.id);
    const selectedPackage = selectedSkills.get(skill.id) || 'BASIC';
    const categoryColor = getCategoryColor(skill.category);

    return (
      <Animated.View 
        key={skill.id}
        style={[
          styles.skillCard,
          isSelected && [styles.skillCardSelected, { borderColor: categoryColor }],
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <TouchableOpacity
          onPress={() => handleSkillSelection(skill.id)}
          activeOpacity={0.7}
        >
          {/* Skill Header */}
          <View style={styles.skillHeader}>
            <View style={[styles.skillIconContainer, { backgroundColor: `${categoryColor}20` }]}>
              <Ionicons name={skill.icon} size={24} color={categoryColor} />
            </View>
            <View style={styles.skillInfo}>
              <Text style={styles.skillName}>{skill.name}</Text>
              <Text style={styles.skillDescription} numberOfLines={2}>
                {skill.description}
              </Text>
            </View>
            <View style={styles.skillMetrics}>
              <View style={styles.metric}>
                <Ionicons name="trending-up" size={16} color="#10b981" />
                <Text style={styles.metricText}>{skill.demandScore}/10</Text>
              </View>
              <View style={styles.metric}>
                <Ionicons name="people" size={16} color="#3b82f6" />
                <Text style={styles.metricText}>{skill.completionRate}%</Text>
              </View>
            </View>
          </View>

          {/* Skill Tags */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tagsContainer}
          >
            {skill.tags.map((tag, index) => (
              <View key={index} style={[styles.tag, { backgroundColor: `${categoryColor}20` }]}>
                <Text style={[styles.tagText, { color: categoryColor }]}>{tag}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Package Selection */}
          {isSelected && (
            <View style={styles.packageSection}>
              <Text style={styles.packageTitle}>Select Package Tier:</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.packageOptions}
              >
                {Object.entries(PACKAGE_TIERS).map(([tier, details]) => (
                  <TouchableOpacity
                    key={tier}
                    style={[
                      styles.packageOption,
                      selectedPackage === tier && [
                        styles.packageOptionSelected,
                        { borderColor: getPackageColor(tier) }
                      ]
                    ]}
                    onPress={() => handlePackageChange(skill.id, tier)}
                  >
                    <Text style={[
                      styles.packageTier,
                      selectedPackage === tier && { color: getPackageColor(tier) }
                    ]}>
                      {tier}
                    </Text>
                    <Text style={styles.packagePrice}>{details.price} ETB</Text>
                    <Text style={styles.packageDuration}>{details.duration}</Text>
                    <Text style={styles.packageFeatures}>
                      {details.features} features
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Selection Indicator */}
          <View style={styles.selectionIndicator}>
            {isSelected ? (
              <View style={[styles.selectedIndicator, { backgroundColor: categoryColor }]}>
                <Ionicons name="checkmark" size={16} color="#ffffff" />
                <Text style={styles.selectedText}>
                  {selectedPackage} Package - {PACKAGE_TIERS[selectedPackage].price} ETB
                </Text>
              </View>
            ) : (
              <Text style={styles.selectHint}>Tap to select this skill</Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [selectedSkills, fadeAnim, slideAnim, handleSkillSelection, handlePackageChange]);

  const renderRecommendations = () => (
    <View style={styles.recommendationsSection}>
      <Text style={styles.sectionTitle}>Recommended For You</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.recommendationsList}
      >
        {recommendations.map((skill) => (
          <TouchableOpacity
            key={skill.id}
            style={[styles.recommendationCard, { borderColor: getCategoryColor(skill.category) }]}
            onPress={() => handleSkillSelection(skill.id)}
          >
            <View style={styles.recommendationHeader}>
              <Ionicons name={skill.icon} size={20} color={getCategoryColor(skill.category)} />
              <Text style={styles.recommendationName} numberOfLines={1}>
                {skill.name}
              </Text>
            </View>
            <View style={styles.recommendationMetrics}>
              <Text style={styles.recommendationDemand}>
                {skill.demandScore}/10 demand
              </Text>
              <Text style={styles.recommendationCompletion}>
                {skill.completionRate}% completion
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderSelectionSummary = () => (
    <Animated.View 
      style={[
        styles.selectionSummary,
        { 
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <BlurView intensity={20} style={styles.selectionSummaryBlur}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Your Skill Selection</Text>
          <Text style={styles.skillCount}>
            {selectedCount}/{SELECTION_LIMITS.MAX_SKILLS}
          </Text>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.selectedSkillsList}
        >
          {Array.from(selectedSkills.entries()).map(([skillId, packageTier]) => {
            const skill = skills?.find(s => s.id === skillId);
            if (!skill) return null;
            
            return (
              <View 
                key={skillId} 
                style={[
                  styles.selectedSkillBadge,
                  { backgroundColor: `${getCategoryColor(skill.category)}20` }
                ]}
              >
                <Ionicons 
                  name={skill.icon} 
                  size={16} 
                  color={getCategoryColor(skill.category)} 
                />
                <Text style={[styles.selectedSkillName, { color: getCategoryColor(skill.category) }]}>
                  {skill.name}
                </Text>
                <Text style={styles.selectedPackageTier}>
                  {packageTier}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.investmentSummary}>
          <Text style={styles.investmentLabel}>Total Monthly Investment:</Text>
          <Text style={styles.investmentAmount}>{totalMonthlyInvestment} ETB</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            !canProceed && styles.continueButtonDisabled
          ]}
          onPress={proceedToCommitment}
          disabled={!canProceed || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <LinearGradient
              colors={canProceed ? ['#6366f1', '#8b5cf6'] : ['#9ca3af', '#6b7280']}
              style={styles.continueButtonGradient}
            >
              <Text style={styles.continueButtonText}>
                Continue to Commitment Check
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#ffffff" />
            </LinearGradient>
          )}
        </TouchableOpacity>
      </BlurView>
    </Animated.View>
  );

  // 🎯 Main Render
  if (isLoading || skillsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading available skills...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.headerText}>
            <Text style={styles.title}>Choose Your Skills</Text>
            <Text style={styles.subtitle}>
              Select 1-3 skills to master. Each skill includes mindset, theory, hands-on training, and certification.
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Main Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadSkillRecommendations}
            colors={['#6366f1']}
          />
        }
      >
        {/* Recommendations */}
        {recommendations.length > 0 && renderRecommendations()}

        {/* Category Tabs */}
        {renderCategoryTabs()}

        {/* Skills Grid */}
        <View style={styles.skillsGrid}>
          {filteredSkills.map(renderSkillCard)}
        </View>

        {/* Empty State */}
        {filteredSkills.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>No skills found</Text>
            <Text style={styles.emptyStateText}>
              Try adjusting your search or select a different category
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Selection Summary */}
      {selectedCount > 0 && renderSelectionSummary()}
    </View>
  );
}

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
  recommendationsSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  recommendationsList: {
    flexDirection: 'row',
  },
  recommendationCard: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
    minWidth: 140,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  recommendationMetrics: {
    marginTop: 4,
  },
  recommendationDemand: {
    fontSize: 12,
    color: '#10b981',
    marginBottom: 2,
  },
  recommendationCompletion: {
    fontSize: 12,
    color: '#3b82f6',
  },
  categoryTabs: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoryTabsContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    marginRight: 8,
    backgroundColor: '#ffffff',
  },
  categoryTabActive: {
    backgroundColor: '#f8fafc',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 6,
  },
  categoryTabTextActive: {
    fontWeight: '600',
  },
  skillsGrid: {
    padding: 20,
  },
  skillCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  skillCardSelected: {
    borderWidth: 2,
    shadowOpacity: 0.2,
    elevation: 6,
  },
  skillHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  skillIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  skillInfo: {
    flex: 1,
    marginRight: 12,
  },
  skillName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  skillDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  skillMetrics: {
    alignItems: 'flex-end',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  packageSection: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
    marginBottom: 12,
  },
  packageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  packageOptions: {
    flexDirection: 'row',
  },
  packageOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginRight: 8,
    minWidth: 100,
  },
  packageOptionSelected: {
    borderWidth: 2,
    backgroundColor: '#f8fafc',
  },
  packageTier: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  packageDuration: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  packageFeatures: {
    fontSize: 10,
    color: '#9ca3af',
  },
  selectionIndicator: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  selectedText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 6,
  },
  selectHint: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  selectionSummary: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
  },
  selectionSummaryBlur: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  skillCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  selectedSkillsList: {
    padding: 16,
  },
  selectedSkillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  selectedSkillName: {
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: 4,
  },
  selectedPackageTier: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  investmentSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  investmentLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  investmentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  continueButton: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});

// 🏗️ Performance Optimization
export default React.memo(SkillSelection);