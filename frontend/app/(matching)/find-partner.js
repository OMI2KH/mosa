/**
 * 🏢 MOSA FORGE - Enterprise Partner Finding System
 * 🤝 Intelligent Student-Expert Matching Interface
 * ⭐ Quality-Driven Partner Selection
 * 📊 Real-time Availability & Performance Metrics
 * 🚀 React Native Enterprise Application
 * 
 * @module FindPartnerScreen
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlurView } from '@react-native-community/blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInLeft,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FastImage from 'react-native-fast-image';

// 🏗️ Enterprise Dependencies
import { useAuth } from '../../contexts/auth-context';
import { useEnrollment } from '../../contexts/enrollment-context';
import { useQuality } from '../../contexts/quality-context';
import PartnerCard from '../../components/matching/PartnerCard';
import QualityFilter from '../../components/matching/QualityFilter';
import AvailabilityBadge from '../../components/matching/AvailabilityBadge';
import MatchScoreIndicator from '../../components/matching/MatchScoreIndicator';
import LoadingOverlay from '../../components/shared/LoadingOverlay';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import { matchingService } from '../../services/matching-service';
import { analyticsService } from '../../services/analytics-service';
import { notificationService } from '../../services/notification-service';

// 📱 Screen Dimensions
const { width, height } = Dimensions.get('window');

const FindPartnerScreen = () => {
  // 🎯 Navigation & Context
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const { currentEnrollment } = useEnrollment();
  const { qualityMetrics } = useQuality();

  // 🎯 State Management
  const [partners, setPartners] = useState([]);
  const [filteredPartners, setFilteredPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [matchingInProgress, setMatchingInProgress] = useState(false);
  const [error, setError] = useState(null);

  // 🎯 Filter State
  const [filters, setFilters] = useState({
    minQualityScore: 4.0,
    availability: 'all',
    specialization: 'all',
    tier: 'all',
    maxDistance: 50, // kilometers
    minExperience: 0,
  });

  // 🎯 Sorting State
  const [sortBy, setSortBy] = useState('match_score');
  const [sortDirection, setSortDirection] = useState('desc');

  // 🎯 Animation Values
  const scaleAnim = useSharedValue(1);
  const opacityAnim = useSharedValue(1);
  const filterPanelAnim = useSharedValue(-300);

  // 🎯 Get Enrollment Data
  const enrollmentData = useMemo(() => {
    return route.params?.enrollmentData || currentEnrollment;
  }, [route.params, currentEnrollment]);

  /**
   * 📊 LOAD AVAILABLE PARTNERS
   */
  const loadAvailablePartners = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      // 🔍 Validate Enrollment Data
      if (!enrollmentData?.skillId) {
        throw new Error('Missing enrollment data. Please select a skill first.');
      }

      // 📊 Track Analytics Event
      await analyticsService.trackEvent('partner_finding_started', {
        userId: user.id,
        skillId: enrollmentData.skillId,
        timestamp: new Date().toISOString(),
      });

      // 🤝 Fetch Available Partners
      const partnersResponse = await matchingService.findAvailablePartners({
        studentId: user.id,
        skillId: enrollmentData.skillId,
        preferences: enrollmentData.preferences || {},
        filters: filters,
        limit: 50,
      });

      if (partnersResponse.success) {
        setPartners(partnersResponse.data.partners);
        applyFiltersAndSorting(partnersResponse.data.partners);
        
        // 📊 Track Success Analytics
        await analyticsService.trackEvent('partners_loaded', {
          userId: user.id,
          partnerCount: partnersResponse.data.partners.length,
          averageMatchScore: partnersResponse.data.averageMatchScore,
        });

      } else {
        throw new Error(partnersResponse.error || 'Failed to load partners');
      }

    } catch (err) {
      console.error('Error loading partners:', err);
      setError(err.message);
      
      // 🚨 Track Error Analytics
      await analyticsService.trackError('partner_loading_error', {
        userId: user.id,
        error: err.message,
        skillId: enrollmentData?.skillId,
      });

      // 🚨 Show Error Alert
      Alert.alert(
        'Loading Error',
        'Unable to load available partners. Please try again.',
        [
          { text: 'Retry', onPress: () => loadAvailablePartners(true) },
          { text: 'Go Back', onPress: () => navigation.goBack() },
        ]
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enrollmentData, user.id, filters]);

  /**
   * 🎯 APPLY FILTERS & SORTING
   */
  const applyFiltersAndSorting = useCallback((partnersList) => {
    let filtered = [...partnersList];

    // 🔍 Apply Quality Filter
    filtered = filtered.filter(
      partner => partner.qualityScore >= filters.minQualityScore
    );

    // 🕐 Apply Availability Filter
    if (filters.availability !== 'all') {
      filtered = filtered.filter(
        partner => partner.availability === filters.availability
      );
    }

    // 🎯 Apply Specialization Filter
    if (filters.specialization !== 'all') {
      filtered = filtered.filter(
        partner => partner.specializations?.includes(filters.specialization)
      );
    }

    // ⭐ Apply Tier Filter
    if (filters.tier !== 'all') {
      filtered = filtered.filter(
        partner => partner.tier === filters.tier
      );
    }

    // 📏 Apply Experience Filter
    filtered = filtered.filter(
      partner => partner.experienceYears >= filters.minExperience
    );

    // 📊 Apply Sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'match_score':
          comparison = b.matchScore - a.matchScore;
          break;
        case 'quality_score':
          comparison = b.qualityScore - a.qualityScore;
          break;
        case 'response_time':
          comparison = a.averageResponseTime - b.averageResponseTime;
          break;
        case 'experience':
          comparison = b.experienceYears - a.experienceYears;
          break;
        case 'rating':
          comparison = b.averageRating - a.averageRating;
          break;
        default:
          comparison = b.matchScore - a.matchScore;
      }

      return sortDirection === 'desc' ? comparison : -comparison;
    });

    setFilteredPartners(filtered);
  }, [filters, sortBy, sortDirection]);

  /**
   * 🤝 INITIATE PARTNER MATCHING
   */
  const initiatePartnerMatching = useCallback(async (partnerId) => {
    try {
      setMatchingInProgress(true);
      setSelectedPartner(partnerId);

      // 🎯 Validate Enrollment
      if (!enrollmentData?.id) {
        throw new Error('Missing enrollment data');
      }

      // 📊 Track Matching Initiation
      await analyticsService.trackEvent('partner_matching_initiated', {
        userId: user.id,
        partnerId,
        enrollmentId: enrollmentData.id,
        timestamp: new Date().toISOString(),
      });

      // 🤝 Send Matching Request
      const matchingResponse = await matchingService.initiateMatching({
        enrollmentId: enrollmentData.id,
        partnerId: partnerId,
        studentId: user.id,
        preferences: enrollmentData.preferences || {},
      });

      if (matchingResponse.success) {
        // 🎉 Track Successful Matching
        await analyticsService.trackEvent('partner_matching_successful', {
          userId: user.id,
          partnerId,
          matchScore: matchingResponse.data.matchScore,
          enrollmentId: enrollmentData.id,
        });

        // 📧 Send Notification
        await notificationService.sendMatchingNotification({
          userId: user.id,
          partnerId,
          enrollmentId: enrollmentData.id,
          matchScore: matchingResponse.data.matchScore,
        });

        // 🎉 Show Success Message
        Alert.alert(
          'Partner Matched! 🎉',
          `Successfully matched with ${matchingResponse.data.partnerName}. You'll be redirected to your dashboard.`,
          [
            {
              text: 'Go to Dashboard',
              onPress: () => navigation.navigate('StudentDashboard'),
            },
          ]
        );

        // 🔄 Update Local State
        setPartners(prev => 
          prev.map(partner => 
            partner.id === partnerId 
              ? { ...partner, isMatched: true, matchScore: matchingResponse.data.matchScore }
              : partner
          )
        );

      } else {
        throw new Error(matchingResponse.error || 'Matching failed');
      }

    } catch (err) {
      console.error('Error initiating matching:', err);
      
      // 🚨 Track Error Analytics
      await analyticsService.trackError('partner_matching_error', {
        userId: user.id,
        partnerId,
        error: err.message,
      });

      // 🚨 Show Error Alert
      Alert.alert(
        'Matching Failed',
        'Unable to match with partner. Please try again or select another partner.',
        [
          { text: 'Try Again', onPress: () => initiatePartnerMatching(partnerId) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );

    } finally {
      setMatchingInProgress(false);
      setSelectedPartner(null);
    }
  }, [enrollmentData, user.id, navigation]);

  /**
   * 📊 VIEW PARTNER DETAILS
   */
  const viewPartnerDetails = useCallback((partner) => {
    // 📊 Track Analytics
    analyticsService.trackEvent('partner_details_viewed', {
      userId: user.id,
      partnerId: partner.id,
      partnerTier: partner.tier,
      matchScore: partner.matchScore,
    });

    // 🧭 Navigate to Partner Details
    navigation.navigate('PartnerDetails', {
      partner,
      enrollmentData,
      onMatchSuccess: () => initiatePartnerMatching(partner.id),
    });
  }, [user.id, enrollmentData, navigation, initiatePartnerMatching]);

  /**
   * 🎯 UPDATE FILTERS
   */
  const updateFilter = useCallback((filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value,
    }));
  }, []);

  /**
   * 📊 UPDATE SORTING
   */
  const updateSorting = useCallback((newSortBy) => {
    if (sortBy === newSortBy) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(newSortBy);
      setSortDirection('desc');
    }
  }, [sortBy]);

  /**
   * 🔄 REFRESH DATA
   */
  const onRefresh = useCallback(() => {
    loadAvailablePartners(true);
  }, [loadAvailablePartners]);

  /**
   * 🎯 USE EFFECTS
   */
  useEffect(() => {
    // 📊 Load partners on mount
    loadAvailablePartners();

    // 📊 Track screen view
    analyticsService.trackScreenView('FindPartnerScreen', {
      userId: user.id,
      skillId: enrollmentData?.skillId,
    });

    // 🧹 Cleanup
    return () => {
      setPartners([]);
      setFilteredPartners([]);
    };
  }, []);

  useEffect(() => {
    // 🔄 Apply filters when they change
    if (partners.length > 0) {
      applyFiltersAndSorting(partners);
    }
  }, [filters, sortBy, sortDirection, partners, applyFiltersAndSorting]);

  /**
   * 🎨 RENDER PARTNER ITEM
   */
  const renderPartnerItem = useCallback(({ item, index }) => {
    return (
      <Animated.View
        entering={FadeInDown.delay(index * 100)}
        style={styles.partnerItemContainer}
      >
        <PartnerCard
          partner={item}
          onPress={() => viewPartnerDetails(item)}
          onMatchPress={() => initiatePartnerMatching(item.id)}
          isSelected={selectedPartner === item.id}
          isMatching={matchingInProgress && selectedPartner === item.id}
          enrollmentData={enrollmentData}
        />
      </Animated.View>
    );
  }, [viewPartnerDetails, initiatePartnerMatching, selectedPartner, matchingInProgress, enrollmentData]);

  /**
   * 🎨 RENDER FILTER PANEL
   */
  const renderFilterPanel = () => (
    <Animated.View 
      style={[
        styles.filterPanel,
        useAnimatedStyle(() => ({
          transform: [{ translateX: filterPanelAnim.value }],
        })),
      ]}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.filterGradient}
      >
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filters & Sorting</Text>
          <TouchableOpacity
            style={styles.closeFilterButton}
            onPress={() => filterPanelAnim.value = withSpring(-300)}
          >
            <Icon name="close" size={24} color="#6c757d" />
          </TouchableOpacity>
        </View>

        <QualityFilter
          minQualityScore={filters.minQualityScore}
          onQualityChange={(value) => updateFilter('minQualityScore', value)}
        />

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Availability</Text>
          <View style={styles.filterOptions}>
            {['all', 'available', 'limited', 'busy'].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.filterOption,
                  filters.availability === option && styles.filterOptionActive,
                ]}
                onPress={() => updateFilter('availability', option)}
              >
                <Text style={[
                  styles.filterOptionText,
                  filters.availability === option && styles.filterOptionTextActive,
                ]}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
                {option !== 'all' && (
                  <AvailabilityBadge status={option} size={16} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Tier</Text>
          <View style={styles.filterOptions}>
            {['all', 'master', 'senior', 'standard'].map((tier) => (
              <TouchableOpacity
                key={tier}
                style={[
                  styles.filterOption,
                  filters.tier === tier && styles.filterOptionActive,
                ]}
                onPress={() => updateFilter('tier', tier)}
              >
                <Text style={[
                  styles.filterOptionText,
                  filters.tier === tier && styles.filterOptionTextActive,
                ]}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Sort By</Text>
          <View style={styles.sortOptions}>
            {[
              { key: 'match_score', label: 'Best Match' },
              { key: 'quality_score', label: 'Quality Score' },
              { key: 'rating', label: 'Rating' },
              { key: 'experience', label: 'Experience' },
              { key: 'response_time', label: 'Response Time' },
            ].map((sortOption) => (
              <TouchableOpacity
                key={sortOption.key}
                style={[
                  styles.sortOption,
                  sortBy === sortOption.key && styles.sortOptionActive,
                ]}
                onPress={() => updateSorting(sortOption.key)}
              >
                <Text style={[
                  styles.sortOptionText,
                  sortBy === sortOption.key && styles.sortOptionTextActive,
                ]}>
                  {sortOption.label}
                </Text>
                {sortBy === sortOption.key && (
                  <Icon
                    name={sortDirection === 'desc' ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color="#007bff"
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  /**
   * 🎨 RENDER HEADER
   */
  const renderHeader = () => (
    <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
      <LinearGradient
        colors={['#007bff', '#0056b3']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Find Your Partner</Text>
            <Text style={styles.headerSubtitle}>
              {enrollmentData?.skillName || 'Select a partner to begin your journey'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => filterPanelAnim.value = withSpring(0)}
          >
            <Icon name="filter-variant" size={24} color="#ffffff" />
            {Object.values(filters).some(filter => filter !== 'all' && filter !== 4.0) && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>!</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{filteredPartners.length}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {filteredPartners.length > 0 
                ? Math.max(...filteredPartners.map(p => p.matchScore)).toFixed(1)
                : '0.0'
              }
            </Text>
            <Text style={styles.statLabel}>Best Match</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {filteredPartners.length > 0
                ? (filteredPartners.reduce((sum, p) => sum + p.qualityScore, 0) / filteredPartners.length).toFixed(1)
                : '0.0'
              }
            </Text>
            <Text style={styles.statLabel}>Avg Quality</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  /**
   * 🎨 RENDER EMPTY STATE
   */
  const renderEmptyState = () => (
    <Animated.View entering={FadeIn.delay(300)} style={styles.emptyState}>
      <Icon name="account-search" size={80} color="#6c757d" />
      <Text style={styles.emptyStateTitle}>No Partners Available</Text>
      <Text style={styles.emptyStateText}>
        {error 
          ? error
          : 'No partners match your current criteria. Try adjusting your filters or check back later.'
        }
      </Text>
      <TouchableOpacity
        style={styles.emptyStateButton}
        onPress={() => {
          setFilters({
            minQualityScore: 4.0,
            availability: 'all',
            specialization: 'all',
            tier: 'all',
            maxDistance: 50,
            minExperience: 0,
          });
          loadAvailablePartners(true);
        }}
      >
        <Text style={styles.emptyStateButtonText}>Reset Filters</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  /**
   * 🎨 RENDER LOADING STATE
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007bff" />
      <Text style={styles.loadingText}>Finding available partners...</Text>
      <Text style={styles.loadingSubtext}>
        Matching you with the best experts based on your preferences
      </Text>
    </View>
  );

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        {renderHeader()}

        {loading ? (
          renderLoadingState()
        ) : error && partners.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredPartners}
            renderItem={renderPartnerItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#007bff']}
                tintColor="#007bff"
              />
            }
            ListEmptyComponent={renderEmptyState}
            ListHeaderComponent={
              filteredPartners.length > 0 ? (
                <Animated.Text 
                  entering={FadeIn.duration(300)}
                  style={styles.resultsCount}
                >
                  Found {filteredPartners.length} partner{filteredPartners.length !== 1 ? 's' : ''}
                </Animated.Text>
              ) : null
            }
            getItemLayout={(data, index) => ({
              length: 200,
              offset: 200 * index,
              index,
            })}
            initialNumToRender={10}
            maxToRenderPerBatch={20}
            windowSize={21}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}

        {renderFilterPanel()}

        {matchingInProgress && (
          <LoadingOverlay
            message="Connecting you with your partner..."
            subMessage="This may take a few moments"
          />
        )}

        {/* Blur overlay when filter panel is open */}
        {filterPanelAnim.value === 0 && (
          <TouchableOpacity
            style={styles.blurOverlay}
            activeOpacity={1}
            onPress={() => filterPanelAnim.value = withSpring(-300)}
          >
            <BlurView
              style={styles.absolute}
              blurType="light"
              blurAmount={10}
              reducedTransparencyFallbackColor="white"
            />
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

/**
 * 🎨 STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    height: 160,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    zIndex: 10,
  },
  headerGradient: {
    flex: 1,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  filterButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  partnerItemContainer: {
    marginBottom: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    textAlign: 'center',
  },
  filterPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 300,
    backgroundColor: '#ffffff',
    zIndex: 1000,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  filterGradient: {
    flex: 1,
    padding: 20,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#343a40',
  },
  closeFilterButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
  },
  filterSection: {
    marginBottom: 25,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterOptionActive: {
    backgroundColor: '#007bff',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#ffffff',
  },
  sortOptions: {
    gap: 10,
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortOptionActive: {
    backgroundColor: '#e7f1ff',
    borderWidth: 1,
    borderColor: '#007bff',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#007bff',
    fontWeight: '600',
  },
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#343a40',
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    maxWidth: 300,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#343a40',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: '#007bff',
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FindPartnerScreen;

/**
 * 🎯 PROP TYPES
 */
FindPartnerScreen.propTypes = {
  // Add prop types if needed
};

/**
 * 🎯 DEFAULT PROPS
 */
FindPartnerScreen.defaultProps = {
  // Add default props if needed
};