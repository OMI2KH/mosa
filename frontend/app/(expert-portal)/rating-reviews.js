// (expert-portal)/rating-reviews.js

/**
 * 🎯 ENTERPRISE EXPERT RATING & REVIEWS DASHBOARD
 * Production-ready rating management for Mosa Forge Experts
 * Features: Real-time metrics, quality analytics, performance tracking, review management
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Rating, AirbnbRating } from 'react-native-ratings';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';

// Custom hooks and services
import { useExpertPerformance } from '../../hooks/use-expert-performance';
import { useQualityMetrics } from '../../hooks/use-quality-metrics';
import { RatingService } from '../../services/rating-service';
import { AnalyticsService } from '../../services/analytics-service';

// Components
import QualityScoreGauge from '../../components/quality/QualityScoreGauge';
import PerformanceChart from '../../components/quality/PerformanceChart';
import ReviewCard from '../../components/quality/ReviewCard';
import TierProgressBar from '../../components/quality/TierProgressBar';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import ErrorBoundary from '../../components/shared/ErrorBoundary';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ExpertRatingReviews = ({ route, navigation }) => {
  const expertId = route.params?.expertId;
  
  // State management
  const [ratingsData, setRatingsData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('90d');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartData, setChartData] = useState([]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Custom hooks
  const {
    expertPerformance,
    loading: performanceLoading,
    error: performanceError,
    refreshPerformance
  } = useExpertPerformance(expertId);

  const {
    qualityMetrics,
    refreshMetrics,
    calculateTierProgress
  } = useQualityMetrics(expertId);

  // Period options
  const PERIOD_OPTIONS = [
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '90 Days', value: '90d' },
    { label: '1 Year', value: '1y' }
  ];

  const FILTER_OPTIONS = [
    { label: 'All Reviews', value: 'all' },
    { label: '5 Stars', value: '5' },
    { label: '4 Stars', value: '4' },
    { label: '3 Stars', value: '3' },
    { label: '1-2 Stars', value: '1-2' },
    { label: 'With Comments', value: 'comments' }
  ];

  /**
   * 🎯 LOAD RATING DATA
   */
  const loadRatingData = useCallback(async (showRefresh = false) => {
    if (!showRefresh) setLoading(true);
    setError(null);

    try {
      const [ratingsResponse, reviewsResponse, analyticsResponse] = await Promise.all([
        RatingService.getExpertRatings(expertId, selectedPeriod),
        RatingService.getExpertReviews(expertId, selectedFilter, selectedPeriod),
        AnalyticsService.getRatingAnalytics(expertId, selectedPeriod)
      ]);

      // Validate responses
      if (!ratingsResponse.success) throw new Error(ratingsResponse.error);
      if (!reviewsResponse.success) throw new Error(reviewsResponse.error);
      if (!analyticsResponse.success) throw new Error(analyticsResponse.error);

      setRatingsData(ratingsResponse.data);
      setReviews(reviewsResponse.data.reviews || []);
      setAnalytics(analyticsResponse.data);
      
      // Process chart data
      processChartData(analyticsResponse.data.trendData);

      // Refresh hooks data
      await Promise.all([
        refreshPerformance(),
        refreshMetrics()
      ]);

    } catch (err) {
      console.error('Failed to load rating data:', err);
      setError(err.message || 'Failed to load rating data');
      AnalyticsService.trackError('RatingDashboardLoadError', err, { expertId });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [expertId, selectedPeriod, selectedFilter]);

  /**
   * 📊 PROCESS CHART DATA
   */
  const processChartData = (trendData) => {
    if (!trendData || !Array.isArray(trendData)) {
      setChartData([]);
      return;
    }

    const processedData = trendData.map((item, index) => ({
      id: index,
      date: new Date(item.date).toLocaleDateString('en-ET', { month: 'short', day: 'numeric' }),
      rating: item.averageRating,
      count: item.ratingCount,
      tier: item.tier,
      qualityScore: item.qualityScore
    }));

    setChartData(processedData);
  };

  /**
   * 🔄 REFRESH HANDLER
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadRatingData(true);
  }, [loadRatingData]);

  /**
   * 📅 PERIOD CHANGE HANDLER
   */
  const handlePeriodChange = useCallback((period) => {
    setSelectedPeriod(period);
    AnalyticsService.trackEvent('RatingPeriodChanged', { expertId, period });
  }, [expertId]);

  /**
   * 🎛️ FILTER CHANGE HANDLER
   */
  const handleFilterChange = useCallback((filter) => {
    setSelectedFilter(filter);
    AnalyticsService.trackEvent('ReviewFilterChanged', { expertId, filter });
  }, [expertId]);

  /**
   * 📈 CALCULATE RATING DISTRIBUTION
   */
  const ratingDistribution = useMemo(() => {
    if (!ratingsData?.distribution) return null;

    const total = Object.values(ratingsData.distribution).reduce((sum, count) => sum + count, 0);
    
    return {
      5: { count: ratingsData.distribution[5] || 0, percentage: ((ratingsData.distribution[5] || 0) / total) * 100 },
      4: { count: ratingsData.distribution[4] || 0, percentage: ((ratingsData.distribution[4] || 0) / total) * 100 },
      3: { count: ratingsData.distribution[3] || 0, percentage: ((ratingsData.distribution[3] || 0) / total) * 100 },
      2: { count: ratingsData.distribution[2] || 0, percentage: ((ratingsData.distribution[2] || 0) / total) * 100 },
      1: { count: ratingsData.distribution[1] || 0, percentage: ((ratingsData.distribution[1] || 0) / total) * 100 },
      total
    };
  }, [ratingsData]);

  /**
   * 🎯 CALCULATE PERFORMANCE METRICS
   */
  const performanceMetrics = useMemo(() => {
    if (!expertPerformance || !qualityMetrics) return null;

    return {
      currentTier: expertPerformance.currentTier,
      nextTier: expertPerformance.nextTier,
      tierProgress: calculateTierProgress(),
      qualityScore: qualityMetrics.overallScore,
      responseRate: expertPerformance.responseRate || 0,
      completionRate: expertPerformance.completionRate || 0,
      studentSatisfaction: expertPerformance.studentSatisfaction || 0
    };
  }, [expertPerformance, qualityMetrics, calculateTierProgress]);

  /**
   * 🏆 GET TIER CONFIGURATION
   */
  const tierConfig = useMemo(() => {
    const config = {
      MASTER: { 
        color: '#FFD700', 
        icon: 'crown',
        gradient: ['#FFD700', '#FFA500'],
        bonus: '+20%'
      },
      SENIOR: { 
        color: '#C0C0C0', 
        icon: 'award',
        gradient: ['#E8E8E8', '#C0C0C0'],
        bonus: '+10%'
      },
      STANDARD: { 
        color: '#CD7F32', 
        icon: 'star',
        gradient: ['#CD7F32', '#8B4513'],
        bonus: 'Base'
      },
      DEVELOPING: { 
        color: '#6B7280', 
        icon: 'trending-up',
        gradient: ['#6B7280', '#4B5563'],
        bonus: '-10%'
      },
      PROBATION: { 
        color: '#EF4444', 
        icon: 'warning',
        gradient: ['#EF4444', '#DC2626'],
        bonus: '-20%'
      }
    };

    return config[performanceMetrics?.currentTier] || config.STANDARD;
  }, [performanceMetrics]);

  /**
   * 🎭 ANIMATION EFFECTS
   */
  useEffect(() => {
    if (!loading && !error) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [loading, error, fadeAnim, slideAnim]);

  /**
   * 🎯 FOCUS EFFECT
   */
  useFocusEffect(
    useCallback(() => {
      loadRatingData();
      
      // Analytics tracking
      AnalyticsService.trackScreenView('ExpertRatingDashboard', { expertId });

      return () => {
        // Cleanup animations
        fadeAnim.setValue(0);
        slideAnim.setValue(50);
      };
    }, [loadRatingData, expertId])
  );

  /**
   * 📱 RENDER LOADING STATE
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <LoadingSkeleton type="rating-dashboard" />
    </View>
  );

  /**
   * ❌ RENDER ERROR STATE
   */
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={64} color="#EF4444" />
      <Text style={styles.errorTitle}>Unable to Load Ratings</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={handleRefresh}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * 📊 RENDER RATING SUMMARY
   */
  const renderRatingSummary = () => (
    <Animated.View 
      style={[
        styles.summaryCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <LinearGradient
        colors={tierConfig.gradient}
        style={styles.summaryGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.summaryHeader}>
          <View style={styles.tierBadge}>
            <FontAwesome5 
              name={tierConfig.icon} 
              size={20} 
              color="#FFFFFF" 
            />
            <Text style={styles.tierText}>
              {performanceMetrics?.currentTier} Tier
            </Text>
          </View>
          <Text style={styles.bonusText}>
            {tierConfig.bonus} Bonus
          </Text>
        </View>

        <View style={styles.ratingOverview}>
          <View style={styles.ratingMain}>
            <Text style={styles.averageRating}>
              {ratingsData?.averageRating?.toFixed(1) || '0.0'}
            </Text>
            <Rating
              type="star"
              ratingCount={5}
              imageSize={20}
              readonly
              startingValue={ratingsData?.averageRating || 0}
              style={styles.ratingStars}
            />
            <Text style={styles.ratingCount}>
              {ratingDistribution?.total || 0} ratings
            </Text>
          </View>

          <View style={styles.qualityScore}>
            <QualityScoreGauge
              score={performanceMetrics?.qualityScore || 0}
              size={80}
              strokeWidth={8}
            />
            <Text style={styles.qualityLabel}>Quality Score</Text>
          </View>
        </View>

        {performanceMetrics && (
          <TierProgressBar
            currentTier={performanceMetrics.currentTier}
            nextTier={performanceMetrics.nextTier}
            progress={performanceMetrics.tierProgress}
            style={styles.tierProgress}
          />
        )}
      </LinearGradient>
    </Animated.View>
  );

  /**
   * 📈 RENDER PERFORMANCE METRICS
   */
  const renderPerformanceMetrics = () => (
    <Animated.View 
      style={[
        styles.metricsGrid,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.metricCard}>
        <View style={styles.metricHeader}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.metricLabel}>Completion Rate</Text>
        </View>
        <Text style={styles.metricValue}>
          {performanceMetrics?.completionRate?.toFixed(1) || 0}%
        </Text>
        <Text style={styles.metricTarget}>Target: 70%+</Text>
      </View>

      <View style={styles.metricCard}>
        <View style={styles.metricHeader}>
          <Ionicons name="time" size={20} color="#3B82F6" />
          <Text style={styles.metricLabel}>Response Rate</Text>
        </View>
        <Text style={styles.metricValue}>
          {performanceMetrics?.responseRate?.toFixed(1) || 0}%
        </Text>
        <Text style={styles.metricTarget}>Target: 90%+</Text>
      </View>

      <View style={styles.metricCard}>
        <View style={styles.metricHeader}>
          <Ionicons name="happy" size={20} color="#8B5CF6" />
          <Text style={styles.metricLabel}>Satisfaction</Text>
        </View>
        <Text style={styles.metricValue}>
          {performanceMetrics?.studentSatisfaction?.toFixed(1) || 0}%
        </Text>
        <Text style={styles.metricTarget}>Target: 80%+</Text>
      </View>

      <View style={styles.metricCard}>
        <View style={styles.metricHeader}>
          <MaterialIcons name="trending-up" size={20} color="#F59E0B" />
          <Text style={styles.metricLabel}>Trend</Text>
        </View>
        <Text style={[
          styles.metricValue,
          { color: analytics?.trend === 'improving' ? '#10B981' : 
                   analytics?.trend === 'declining' ? '#EF4444' : '#6B7280' }
        ]}>
          {analytics?.trend?.toUpperCase() || 'STABLE'}
        </Text>
        <Text style={styles.metricTarget}>Last 90 days</Text>
      </View>
    </Animated.View>
  );

  /**
   * 📊 RENDER RATING DISTRIBUTION
   */
  const renderRatingDistribution = () => (
    <Animated.View 
      style={[
        styles.distributionCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Text style={styles.sectionTitle}>Rating Distribution</Text>
      
      {[5, 4, 3, 2, 1].map((stars) => (
        <View key={stars} style={styles.distributionRow}>
          <View style={styles.starsContainer}>
            <Text style={styles.starsLabel}>{stars} stars</Text>
            <Rating
              type="star"
              ratingCount={5}
              imageSize={12}
              readonly
              startingValue={stars}
              style={styles.smallStars}
            />
          </View>
          
          <View style={styles.barContainer}>
            <View 
              style={[
                styles.percentageBar,
                { 
                  width: `${ratingDistribution?.[stars]?.percentage || 0}%`,
                  backgroundColor: stars >= 4 ? '#10B981' : 
                                 stars >= 3 ? '#F59E0B' : '#EF4444'
                }
              ]} 
            />
          </View>
          
          <Text style={styles.percentageText}>
            {ratingDistribution?.[stars]?.count || 0} ({ratingDistribution?.[stars]?.percentage?.toFixed(1) || 0}%)
          </Text>
        </View>
      ))}
    </Animated.View>
  );

  /**
   * 📈 RENDER PERFORMANCE CHART
   */
  const renderPerformanceChart = () => (
    <Animated.View 
      style={[
        styles.chartCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.chartHeader}>
        <Text style={styles.sectionTitle}>Performance Trend</Text>
        <View style={styles.periodSelector}>
          {PERIOD_OPTIONS.map((period) => (
            <TouchableOpacity
              key={period.value}
              style={[
                styles.periodButton,
                selectedPeriod === period.value && styles.periodButtonActive
              ]}
              onPress={() => handlePeriodChange(period.value)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period.value && styles.periodButtonTextActive
              ]}>
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <PerformanceChart
        data={chartData}
        period={selectedPeriod}
        height={200}
        showTierMarkers={true}
      />
    </Animated.View>
  );

  /**
   * 💬 RENDER REVIEWS LIST
   */
  const renderReviewsList = () => (
    <Animated.View 
      style={[
        styles.reviewsSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.reviewsHeader}>
        <Text style={styles.sectionTitle}>
          Student Reviews ({reviews.length})
        </Text>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {FILTER_OPTIONS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterButton,
                selectedFilter === filter.value && styles.filterButtonActive
              ]}
              onPress={() => handleFilterChange(filter.value)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedFilter === filter.value && styles.filterButtonTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.reviewsList}>
        {reviews.length === 0 ? (
          <View style={styles.emptyReviews}>
            <MaterialIcons name="reviews" size={48} color="#9CA3AF" />
            <Text style={styles.emptyReviewsText}>
              No reviews found for selected filter
            </Text>
          </View>
        ) : (
          reviews.map((review, index) => (
            <ReviewCard
              key={review.id}
              review={review}
              index={index}
              onHelpfulPress={() => handleHelpfulPress(review.id)}
              onReplyPress={() => handleReplyPress(review)}
            />
          ))
        )}
      </View>
    </Animated.View>
  );

  /**
   * 👍 HELPFUL PRESS HANDLER
   */
  const handleHelpfulPress = async (reviewId) => {
    try {
      const response = await RatingService.markReviewHelpful(reviewId, expertId);
      
      if (response.success) {
        // Update local state
        setReviews(prev => prev.map(review => 
          review.id === reviewId 
            ? { ...review, helpfulCount: (review.helpfulCount || 0) + 1, isHelpful: true }
            : review
        ));
        
        AnalyticsService.trackEvent('ReviewMarkedHelpful', { reviewId, expertId });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to mark review as helpful');
      console.error('Helpful press error:', error);
    }
  };

  /**
   * 💬 REPLY PRESS HANDLER
   */
  const handleReplyPress = (review) => {
    navigation.navigate('ReviewReply', { 
      review,
      expertId,
      onReplySubmitted: loadRatingData
    });
  };

  // Main render
  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#10B981', '#3B82F6', '#8B5CF6']}
              tintColor="#10B981"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Loading State */}
          {loading && renderLoadingState()}

          {/* Error State */}
          {error && !loading && renderErrorState()}

          {/* Content */}
          {!loading && !error && ratingsData && (
            <View style={styles.content}>
              {renderRatingSummary()}
              {renderPerformanceMetrics()}
              {renderRatingDistribution()}
              {renderPerformanceChart()}
              {renderReviewsList()}
            </View>
          )}
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
};

// 🎨 ENTERPRISE-LEVEL STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    borderRadius: 16,
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  summaryGradient: {
    borderRadius: 16,
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tierText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  bonusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  ratingOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingMain: {
    alignItems: 'flex-start',
  },
  averageRating: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  ratingStars: {
    marginBottom: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  qualityScore: {
    alignItems: 'center',
  },
  qualityLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  tierProgress: {
    marginTop: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 6,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  metricTarget: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  distributionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  starsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 6,
    width: 40,
  },
  smallStars: {
    marginLeft: 4,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  percentageBar: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    fontSize: 12,
    color: '#6B7280',
    width: 60,
    textAlign: 'right',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
  },
  periodButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 6,
    backgroundColor: '#F3F4F6',
  },
  periodButtonActive: {
    backgroundColor: '#3B82F6',
  },
  periodButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  reviewsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  reviewsHeader: {
    marginBottom: 16,
  },
  filterScroll: {
    marginTop: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  reviewsList: {
    minHeight: 200,
  },
  emptyReviews: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyReviewsText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
});

export default ExpertRatingReviews;