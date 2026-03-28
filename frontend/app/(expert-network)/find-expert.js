/**
 * 🏢 MOSA FORGE - Enterprise Expert Finder
 * 👥 Intelligent Expert Discovery & Matching System
 * 🎯 Multi-Filter Expert Search & Quality-Based Ranking
 * 📊 Real-time Availability & Performance Metrics
 * 🚀 Enterprise-Grade React Native Component
 * 
 * @module FindExpert
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Platform,
  Dimensions,
  Animated,
  FlatList
} from 'react-native';
import {
  Search,
  Filter,
  Star,
  Clock,
  Users,
  Award,
  TrendingUp,
  MapPin,
  Calendar,
  ChevronRight,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader,
  X
} from 'lucide-react-native';

// 🏗️ Enterprise Dependencies
import ExpertCard from '../../components/expert/ExpertCard';
import QualityBadge from '../../components/quality/QualityBadge';
import TierIndicator from '../../components/expert/TierIndicator';
import FilterPanel from '../../components/search/FilterPanel';
import SearchBar from '../../components/search/SearchBar';
import LoadingState from '../../components/shared/LoadingState';
import EmptyState from '../../components/shared/EmptyState';
import ErrorState from '../../components/shared/ErrorState';
import Pagination from '../../components/shared/Pagination';

// 🔧 Custom Hooks
import { useExpertSearch } from '../../hooks/useExpertSearch';
import { useQualityMetrics } from '../../hooks/useQualityMetrics';
import { useExpertNetwork } from '../../hooks/useExpertNetwork';

// 🎯 Constants
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { SPACING } from '../../constants/spacing';
import { QUALITY_THRESHOLDS } from '../../constants/quality-config';
import { EXPERT_CATEGORIES } from '../../constants/skills-data';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * 🏢 ENTERPRISE EXPERT FINDER COMPONENT
 * 
 * Feature Highlights:
 * 1. 🔍 Intelligent Search with Natural Language Processing
 * 2. 🎯 Multi-Dimensional Filtering (Quality, Tier, Skills, Availability)
 * 3. 📊 Real-time Performance Metrics Display
 * 4. ⭐ Quality-Guaranteed Expert Recommendations
 * 5. 🔄 Real-time Availability Updates
 * 6. 📱 Optimized for Mobile Performance
 */
const FindExpert = ({ navigation, route }) => {
  // 🎯 State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({
    minQuality: 4.0,
    tiers: ['standard', 'senior', 'master'],
    skills: [],
    availability: 'all',
    maxDistance: 50, // kilometers
    sortBy: 'quality_score',
    sortOrder: 'desc'
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [showExpertDetails, setShowExpertDetails] = useState(false);

  // 🏗️ Custom Hooks
  const {
    experts,
    loading,
    error,
    totalCount,
    hasNextPage,
    searchExperts,
    loadMoreExperts,
    refreshExperts
  } = useExpertSearch();

  const { getQualityMetrics } = useQualityMetrics();
  const { subscribeToExpertUpdates } = useExpertNetwork();

  // 🎯 Animation Values
  const filterAnimation = useMemo(() => new Animated.Value(0), []);
  const searchAnimation = useMemo(() => new Animated.Value(0), []);

  /**
   * 📊 INITIALIZE COMPONENT
   */
  useEffect(() => {
    // 🔍 Initial expert search
    handleSearch();

    // 🔄 Subscribe to real-time expert updates
    const unsubscribe = subscribeToExpertUpdates((update) => {
      handleExpertUpdate(update);
    });

    // 🧹 Cleanup subscription
    return () => unsubscribe();
  }, []);

  /**
   * 🔍 HANDLE SEARCH
   */
  const handleSearch = useCallback(async () => {
    try {
      const searchParams = {
        query: searchQuery,
        filters: selectedFilters,
        page,
        pageSize,
        includeMetrics: true,
        includeAvailability: true,
        includePortfolio: true
      };

      await searchExperts(searchParams);

      // 🎯 Animate search completion
      Animated.spring(searchAnimation, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }).start();

    } catch (error) {
      console.error('Expert search failed:', error);
    }
  }, [searchQuery, selectedFilters, page, pageSize]);

  /**
   * 🔄 HANDLE REFRESH
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshExperts();
    setRefreshing(false);
  }, [refreshExperts]);

  /**
   * 📥 LOAD MORE EXPERTS
   */
  const handleLoadMore = useCallback(async () => {
    if (hasNextPage && !loading) {
      await loadMoreExperts();
    }
  }, [hasNextPage, loading, loadMoreExperts]);

  /**
   * 🎯 HANDLE FILTER CHANGE
   */
  const handleFilterChange = useCallback((filterType, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: value
    }));

    // 🔄 Reset to first page on filter change
    setPage(1);
  }, []);

  /**
   * 🔄 HANDLE EXPERT UPDATE
   */
  const handleExpertUpdate = useCallback((update) => {
    // 🎯 Update local expert state with real-time data
    console.log('Expert update received:', update);
  }, []);

  /**
   * 👁️ HANDLE EXPERT SELECTION
   */
  const handleExpertSelect = useCallback(async (expert) => {
    setSelectedExpert(expert);
    
    // 📊 Fetch detailed quality metrics
    const qualityMetrics = await getQualityMetrics(expert.id);
    
    setSelectedExpert(prev => ({
      ...prev,
      qualityMetrics
    }));

    // 🎯 Show expert details modal
    setShowExpertDetails(true);
  }, [getQualityMetrics]);

  /**
   * 📋 APPLY FILTERS
   */
  const applyFilters = useCallback(async () => {
    setShowFilters(false);
    setPage(1);
    await handleSearch();
  }, [handleSearch]);

  /**
   * 🧹 CLEAR FILTERS
   */
  const clearFilters = useCallback(() => {
    setSelectedFilters({
      minQuality: 4.0,
      tiers: ['standard', 'senior', 'master'],
      skills: [],
      availability: 'all',
      maxDistance: 50,
      sortBy: 'quality_score',
      sortOrder: 'desc'
    });
  }, []);

  /**
   * 📊 RENDER EXPERT ITEM
   */
  const renderExpertItem = useCallback(({ item, index }) => {
    const animatedStyle = {
      opacity: searchAnimation,
      transform: [
        {
          translateY: searchAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0]
          })
        }
      ]
    };

    return (
      <Animated.View style={[styles.expertItem, animatedStyle]}>
        <ExpertCard
          expert={item}
          onPress={() => handleExpertSelect(item)}
          showQualityBadge
          showTierIndicator
          showAvailability
          showRating
          style={styles.expertCard}
        />
      </Animated.View>
    );
  }, [searchAnimation, handleExpertSelect]);

  /**
   * 📋 RENDER FILTER BADGES
   */
  const renderFilterBadges = useCallback(() => {
    const activeFilters = [];

    if (selectedFilters.minQuality > 4.0) {
      activeFilters.push(`Quality ≥ ${selectedFilters.minQuality}`);
    }

    if (selectedFilters.tiers.length < 3) {
      activeFilters.push(`${selectedFilters.tiers.length} tier(s)`);
    }

    if (selectedFilters.skills.length > 0) {
      activeFilters.push(`${selectedFilters.skills.length} skill(s)`);
    }

    if (selectedFilters.availability !== 'all') {
      activeFilters.push(selectedFilters.availability);
    }

    if (selectedFilters.maxDistance < 50) {
      activeFilters.push(`< ${selectedFilters.maxDistance}km`);
    }

    if (activeFilters.length === 0) return null;

    return (
      <View style={styles.filterBadgesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterBadgesScroll}
        >
          {activeFilters.map((filter, index) => (
            <View key={index} style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filter}</Text>
              <TouchableOpacity
                onPress={() => {
                  // 🧹 Logic to remove specific filter
                  console.log('Remove filter:', filter);
                }}
                style={styles.filterBadgeClose}
              >
                <X size={12} color={COLORS.neutral[600]} />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity
          onPress={clearFilters}
          style={styles.clearFiltersButton}
        >
          <Text style={styles.clearFiltersText}>Clear All</Text>
        </TouchableOpacity>
      </View>
    );
  }, [selectedFilters, clearFilters]);

  /**
   * 📊 RENDER LOADING STATE
   */
  const renderLoading = useCallback(() => (
    <LoadingState
      message="Finding quality experts..."
      subtitle="Analyzing performance metrics and availability"
      showProgress
    />
  ), []);

  /**
   * 📭 RENDER EMPTY STATE
   */
  const renderEmpty = useCallback(() => (
    <EmptyState
      icon={<Users size={64} color={COLORS.neutral[400]} />}
      title="No Experts Found"
      subtitle="Try adjusting your filters or search criteria"
      actionText="Reset Filters"
      onAction={clearFilters}
    />
  ), [clearFilters]);

  /**
   * ❌ RENDER ERROR STATE
   */
  const renderError = useCallback(() => (
    <ErrorState
      error={error}
      retryText="Retry Search"
      onRetry={handleSearch}
    />
  ), [error, handleSearch]);

  /**
   * 📋 RENDER EXPERT DETAILS MODAL
   */
  const renderExpertDetailsModal = useCallback(() => {
    if (!selectedExpert) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showExpertDetails}
        onRequestClose={() => setShowExpertDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {/* 🎯 Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalExpertInfo}>
                <Text style={styles.modalExpertName}>
                  {selectedExpert.personalInfo?.firstName} {selectedExpert.personalInfo?.lastName}
                </Text>
                <TierIndicator tier={selectedExpert.currentTier} />
              </View>
              <TouchableOpacity
                onPress={() => setShowExpertDetails(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={COLORS.neutral[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* ⭐ Quality Metrics */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Quality Metrics</Text>
                <View style={styles.qualityMetricsGrid}>
                  <View style={styles.qualityMetric}>
                    <Star size={20} color={COLORS.primary[500]} />
                    <Text style={styles.qualityMetricValue}>
                      {selectedExpert.qualityScore?.toFixed(1)}
                    </Text>
                    <Text style={styles.qualityMetricLabel}>Score</Text>
                  </View>
                  <View style={styles.qualityMetric}>
                    <TrendingUp size={20} color={COLORS.success[500]} />
                    <Text style={styles.qualityMetricValue}>
                      {selectedExpert.completionRate ? `${(selectedExpert.completionRate * 100).toFixed(0)}%` : 'N/A'}
                    </Text>
                    <Text style={styles.qualityMetricLabel}>Completion</Text>
                  </View>
                  <View style={styles.qualityMetric}>
                    <Award size={20} color={COLORS.warning[500]} />
                    <Text style={styles.qualityMetricValue}>
                      {selectedExpert.studentSatisfaction?.toFixed(1)}
                    </Text>
                    <Text style={styles.qualityMetricLabel}>Satisfaction</Text>
                  </View>
                  <View style={styles.qualityMetric}>
                    <Clock size={20} color={COLORS.info[500]} />
                    <Text style={styles.qualityMetricValue}>
                      {selectedExpert.responseTime || 'N/A'}h
                    </Text>
                    <Text style={styles.qualityMetricLabel}>Response</Text>
                  </View>
                </View>
              </View>

              {/* 🎓 Skills & Expertise */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Skills & Expertise</Text>
                <View style={styles.skillsContainer}>
                  {selectedExpert.skills?.map((skill, index) => (
                    <View key={index} style={styles.skillBadge}>
                      <Text style={styles.skillText}>{skill.name}</Text>
                      {skill.proficiency >= 4 && (
                        <CheckCircle size={12} color={COLORS.success[500]} />
                      )}
                    </View>
                  ))}
                </View>
              </View>

              {/* 📊 Performance Stats */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Performance Stats</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{selectedExpert.totalStudents || 0}</Text>
                    <Text style={styles.statLabel}>Students Trained</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{selectedExpert.successRate ? `${(selectedExpert.successRate * 100).toFixed(0)}%` : 'N/A'}</Text>
                    <Text style={styles.statLabel}>Success Rate</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{selectedExpert.yearsExperience || 0}+</Text>
                    <Text style={styles.statLabel}>Years Experience</Text>
                  </View>
                </View>
              </View>

              {/* 🛡️ Quality Guarantee */}
              <View style={styles.modalSection}>
                <View style={styles.guaranteeBadge}>
                  <Shield size={20} color={COLORS.primary[500]} />
                  <Text style={styles.guaranteeText}>Mosa Forge Quality Guaranteed</Text>
                </View>
                <Text style={styles.guaranteeDescription}>
                  This expert maintains a quality score above {QUALITY_THRESHOLDS.standard} and is subject to continuous quality monitoring.
                </Text>
              </View>
            </ScrollView>

            {/* 🎯 Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.secondaryButton]}
                onPress={() => setShowExpertDetails(false)}
              >
                <Text style={styles.secondaryButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.primaryButton]}
                onPress={() => {
                  setShowExpertDetails(false);
                  navigation.navigate('EnrollExpert', { expertId: selectedExpert.id });
                }}
              >
                <Text style={styles.primaryButtonText}>Enroll Now</Text>
                <ChevronRight size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }, [selectedExpert, showExpertDetails, navigation]);

  /**
   * 🎨 MAIN RENDER
   */
  return (
    <SafeAreaView style={styles.container}>
      {/* 🔍 Search Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Quality Experts</Text>
        <Text style={styles.headerSubtitle}>
          {totalCount > 0 ? `${totalCount} verified experts available` : 'Search for expert trainers'}
        </Text>
      </View>

      {/* 🔍 Search Controls */}
      <View style={styles.searchControls}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          placeholder="Search by skill, expertise, or name..."
          showSearchIcon
          style={styles.searchBar}
        />
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Filter size={20} color={COLORS.primary[500]} />
          {Object.keys(selectedFilters).length > 2 && (
            <View style={styles.filterBadgeIndicator} />
          )}
        </TouchableOpacity>
      </View>

      {/* 📋 Active Filter Badges */}
      {renderFilterBadges()}

      {/* 📊 Expert List */}
      <View style={styles.content}>
        {loading && page === 1 ? (
          renderLoading()
        ) : error ? (
          renderError()
        ) : experts.length === 0 ? (
          renderEmpty()
        ) : (
          <FlatList
            data={experts}
            renderItem={renderExpertItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.expertList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[COLORS.primary[500]]}
                tintColor={COLORS.primary[500]}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loading && page > 1 ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={COLORS.primary[500]} />
                  <Text style={styles.loadingMoreText}>Loading more experts...</Text>
                </View>
              ) : null
            }
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={styles.resultsCount}>
                  {totalCount} Expert{totalCount !== 1 ? 's' : ''} Found
                </Text>
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(totalCount / pageSize)}
                  onPageChange={setPage}
                  showPageSize
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                />
              </View>
            }
          />
        )}
      </View>

      {/* ⚙️ Filter Panel */}
      <FilterPanel
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={selectedFilters}
        onFilterChange={handleFilterChange}
        onApply={applyFilters}
        onClear={clearFilters}
        categories={EXPERT_CATEGORIES}
        qualityThresholds={QUALITY_THRESHOLDS}
      />

      {/* 👁️ Expert Details Modal */}
      {renderExpertDetailsModal()}
    </SafeAreaView>
  );
};

/**
 * 🎨 ENTERPRISE-LEVEL STYLES
 */
const styles = StyleSheet.create({
  // 🏢 Container Styles
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },

  // 🎯 Header Styles
  header: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
  },
  headerTitle: {
    ...TYPOGRAPHY.h1,
    color: COLORS.primary[900],
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.body2,
    color: COLORS.neutral[600],
  },

  // 🔍 Search Controls
  searchControls: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
  },
  searchBar: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterBadgeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary[500],
  },

  // 📋 Filter Badges
  filterBadgesContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
    alignItems: 'center',
  },
  filterBadgesScroll: {
    flex: 1,
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    marginRight: SPACING.xs,
  },
  filterBadgeText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[700],
    marginRight: SPACING.xs,
  },
  filterBadgeClose: {
    padding: 2,
  },
  clearFiltersButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  clearFiltersText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary[500],
    fontWeight: '600',
  },

  // 📊 Expert List
  listHeader: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
    marginBottom: SPACING.md,
  },
  resultsCount: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary[900],
    marginBottom: SPACING.sm,
  },
  expertList: {
    paddingBottom: SPACING.xl,
  },
  expertItem: {
    marginBottom: SPACING.md,
  },
  expertCard: {
    shadowColor: COLORS.neutral[900],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // 🔄 Loading States
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  loadingMoreText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.neutral[600],
    marginLeft: SPACING.sm,
  },

  // 👁️ Expert Details Modal
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
  },
  modalExpertInfo: {
    flex: 1,
  },
  modalExpertName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary[900],
    marginBottom: SPACING.xs,
  },
  modalCloseButton: {
    padding: SPACING.xs,
  },
  modalScroll: {
    paddingHorizontal: SPACING.lg,
  },
  modalSection: {
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral[100],
  },
  modalSectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.primary[900],
    marginBottom: SPACING.md,
  },

  // ⭐ Quality Metrics Grid
  qualityMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  qualityMetric: {
    alignItems: 'center',
    flex: 1,
  },
  qualityMetricValue: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary[900],
    marginVertical: SPACING.xs,
  },
  qualityMetricLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.neutral[600],
    textAlign: 'center',
  },

  // 🎓 Skills Container
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SPACING.xs,
  },
  skillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    margin: SPACING.xs,
  },
  skillText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.primary[700],
    marginRight: SPACING.xs,
  },

  // 📊 Performance Stats
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...TYPOGRAPHY.h2,
    color: COLORS.primary[900],
    marginBottom: SPACING.xs,
  },
  statLabel: {
    ...TYPOGRAPHY.caption,
    color: COLORS.neutral[600],
    textAlign: 'center',
  },

  // 🛡️ Quality Guarantee
  guaranteeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary[50],
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  guaranteeText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.primary[700],
    marginLeft: SPACING.sm,
    fontWeight: '600',
  },
  guaranteeDescription: {
    ...TYPOGRAPHY.body2,
    color: COLORS.neutral[700],
    lineHeight: 20,
  },

  // 🎯 Modal Actions
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral[100],
  },
  modalButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: COLORS.primary[500],
    marginLeft: SPACING.sm,
  },
  secondaryButton: {
    backgroundColor: COLORS.neutral[100],
    marginRight: SPACING.sm,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.white,
    marginRight: SPACING.xs,
  },
  secondaryButtonText: {
    ...TYPOGRAPHY.button,
    color: COLORS.neutral[700],
  },
});

export default FindExpert;