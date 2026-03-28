/**
 * 🏢 MOSA FORGE - Enterprise Skills Exploration Interface
 * 🎯 Interactive Skills Catalog & Personalized Recommendations
 * 📊 Real-time Demand Analytics & Income Potential Display
 * 🔄 Dynamic Skill Filtering & Category Navigation
 * 🚀 Production-Ready React Native Component
 * 
 * @module ExploreSkills
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  RefreshControl,
  Animated,
  TextInput,
  Platform,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

// 🏗️ Enterprise Dependencies
import EnterpriseLogger from '../../services/enterprise-logger';
import SkillAnalytics from '../../services/skill-analytics';
import RecommendationEngine from '../../services/recommendation-engine';
import CartManager from '../../services/cart-manager';

// 📁 Local Components
import SkillCard from '../../components/skills/SkillCard';
import CategoryFilter from '../../components/skills/CategoryFilter';
import IncomeCalculator from '../../components/skills/IncomeCalculator';
import LoadingSkeleton from '../../components/shared/LoadingSkeleton';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import SearchBar from '../../components/shared/SearchBar';

// 📊 Constants
const { width, height } = Dimensions.get('window');
const CATEGORIES = [
  { id: 'all', name: 'All Skills', icon: 'grid', color: '#4F46E5' },
  { id: 'online', name: 'Online Skills', icon: 'laptop', color: '#10B981' },
  { id: 'offline', name: 'Offline Skills', icon: 'hammer', color: '#F59E0B' },
  { id: 'health', name: 'Health & Sports', icon: 'heartbeat', color: '#EF4444' },
  { id: 'beauty', name: 'Beauty & Fashion', icon: 'spa', color: '#8B5CF6' }
];

const SKILL_DIFFICULTY = {
  beginner: { label: 'Beginner', color: '#10B981', icon: 'seedling' },
  intermediate: { label: 'Intermediate', color: '#F59E0B', icon: 'tree' },
  advanced: { label: 'Advanced', color: '#EF4444', icon: 'mountain' }
};

/**
 * 🎯 ENTERPRISE SKILLS EXPLORATION SCREEN
 */
const ExploreSkills = () => {
  // 🔄 Navigation
  const navigation = useNavigation();
  
  // 🎯 State Management
  const [skills, setSkills] = useState([]);
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  
  // 🎨 Animation States
  const [scrollY] = useState(new Animated.Value(0));
  const [headerOpacity] = useState(new Animated.Value(1));
  const [categoryScrollX] = useState(new Animated.Value(0));
  
  // 📊 Analytics State
  const [analytics, setAnalytics] = useState({
    totalSkills: 0,
    popularSkills: [],
    trendingSkills: [],
    completionRates: {},
    incomePotential: {}
  });

  // 🏗️ Service Instances
  const logger = useMemo(() => new EnterpriseLogger('explore-skills'), []);
  const skillAnalytics = useMemo(() => new SkillAnalytics(), []);
  const recommendationEngine = useMemo(() => new RecommendationEngine(), []);
  const cartManager = useMemo(() => new CartManager(), []);

  /**
   * 📥 INITIAL DATA LOADING
   */
  const loadSkillsData = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      logger.info('Loading skills exploration data', { forceRefresh });

      // 🎯 Fetch Skills Data
      const skillsData = await fetchEnterpriseSkills(forceRefresh);
      setSkills(skillsData);
      setFilteredSkills(skillsData);

      // 📊 Load Analytics
      const analyticsData = await skillAnalytics.getSkillsAnalytics();
      setAnalytics(analyticsData);

      // 🛒 Load Cart Items
      const cartData = await cartManager.getCartItems();
      setCartItems(cartData);

      logger.success('Skills data loaded successfully', {
        count: skillsData.length,
        categories: new Set(skillsData.map(s => s.category)).size
      });

    } catch (error) {
      logger.error('Failed to load skills data', {
        error: error.message,
        stack: error.stack
      });
      setError(error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [logger, skillAnalytics, cartManager]);

  /**
   * 🔄 INITIAL LOAD & FOCUS MANAGEMENT
   */
  useEffect(() => {
    loadSkillsData();
    
    // 📊 Analytics Tracking
    skillAnalytics.trackScreenView('explore-skills');
    
    return () => {
      // 🧹 Cleanup
      logger.debug('Explore skills screen unmounted');
    };
  }, [loadSkillsData, skillAnalytics, logger]);

  /**
   * 🔄 REFRESH ON FOCUS
   */
  useFocusEffect(
    useCallback(() => {
      // 🔄 Refresh cart data when screen gains focus
      const refreshCart = async () => {
        try {
          const updatedCart = await cartManager.getCartItems();
          setCartItems(updatedCart);
        } catch (error) {
          logger.warn('Failed to refresh cart data', { error: error.message });
        }
      };
      
      refreshCart();
      
      // 📈 Track screen focus
      skillAnalytics.trackUserInteraction('screen_focus', 'explore_skills');
      
    }, [cartManager, skillAnalytics, logger])
  );

  /**
   * 🔍 FILTER SKILLS
   */
  const filterSkills = useCallback(() => {
    let filtered = [...skills];
    
    // 🎯 Category Filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(skill => skill.category === selectedCategory);
    }
    
    // 🔍 Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(skill =>
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    setFilteredSkills(filtered);
    
    // 📊 Track filtering activity
    skillAnalytics.trackUserInteraction('filter_skills', {
      category: selectedCategory,
      searchQuery,
      resultCount: filtered.length
    });
  }, [skills, selectedCategory, searchQuery, skillAnalytics]);

  /**
   * 🔄 APPLY FILTERS
   */
  useEffect(() => {
    filterSkills();
  }, [filterSkills]);

  /**
   * 🎯 HANDLE CATEGORY SELECTION
   */
  const handleCategorySelect = useCallback((categoryId) => {
    // ✨ Haptic Feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setSelectedCategory(categoryId);
    
    // 📊 Analytics
    skillAnalytics.trackUserInteraction('select_category', {
      category: categoryId,
      timestamp: new Date().toISOString()
    });
    
    // 🎨 Animation
    Animated.timing(categoryScrollX, {
      toValue: categoryId === 'all' ? 0 : 
               categoryId === 'online' ? 1 :
               categoryId === 'offline' ? 2 :
               categoryId === 'health' ? 3 : 4,
      duration: 300,
      useNativeDriver: true
    }).start();
  }, [skillAnalytics, categoryScrollX]);

  /**
   * 🔍 HANDLE SEARCH
   */
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    
    if (query.trim()) {
      skillAnalytics.trackUserInteraction('search_skills', {
        query,
        resultCount: filteredSkills.length
      });
    }
  }, [filteredSkills.length, skillAnalytics]);

  /**
   * 🎯 HANDLE SKILL SELECTION
   */
  const handleSkillSelect = useCallback(async (skill) => {
    // ✨ Haptic Feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setSelectedSkill(skill);
    
    // 📊 Track Skill View
    await skillAnalytics.trackSkillView(skill.id);
    
    // 🧭 Navigate to Skill Details
    navigation.navigate('SkillDetails', {
      skillId: skill.id,
      skillName: skill.name,
      skillData: skill
    });
    
    logger.info('Skill selected for details view', {
      skillId: skill.id,
      skillName: skill.name
    });
  }, [navigation, skillAnalytics, logger]);

  /**
   * 🛒 HANDLE ADD TO CART
   */
  const handleAddToCart = useCallback(async (skill) => {
    try {
      // ✨ Haptic Feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // 🛒 Add to Cart
      const updatedCart = await cartManager.addToCart({
        skillId: skill.id,
        skillName: skill.name,
        price: 1999,
        category: skill.category,
        estimatedDuration: skill.estimatedDuration,
        incomePotential: skill.incomePotential
      });
      
      setCartItems(updatedCart);
      
      // 📊 Analytics
      skillAnalytics.trackUserInteraction('add_to_cart', {
        skillId: skill.id,
        skillName: skill.name,
        price: 1999
      });
      
      // 🎯 Show Success Feedback
      // (You would typically use a toast notification component here)
      logger.success('Skill added to cart', {
        skillId: skill.id,
        cartCount: updatedCart.length
      });
      
    } catch (error) {
      logger.error('Failed to add skill to cart', {
        skillId: skill.id,
        error: error.message
      });
      
      // ✨ Error Haptic Feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [cartManager, skillAnalytics, logger]);

  /**
   * 🔄 HANDLE PULL TO REFRESH
   */
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadSkillsData(true);
    
    // 📊 Track Refresh
    skillAnalytics.trackUserInteraction('pull_to_refresh', 'explore_skills');
  }, [loadSkillsData, skillAnalytics]);

  /**
   * 🎯 GET RECOMMENDED SKILLS
   */
  const getRecommendedSkills = useCallback(async () => {
    try {
      const recommendations = await recommendationEngine.getPersonalizedRecommendations();
      return recommendations.slice(0, 3); // Top 3 recommendations
    } catch (error) {
      logger.warn('Failed to get recommended skills', { error: error.message });
      return [];
    }
  }, [recommendationEngine, logger]);

  /**
   * 📊 RENDER SKILL ITEM
   */
  const renderSkillItem = useCallback(({ item, index }) => {
    const isInCart = cartItems.some(cartItem => cartItem.skillId === item.id);
    
    return (
      <SkillCard
        skill={item}
        index={index}
        isInCart={isInCart}
        onSelect={() => handleSkillSelect(item)}
        onAddToCart={() => handleAddToCart(item)}
        animationDelay={index * 100}
      />
    );
  }, [handleSkillSelect, handleAddToCart, cartItems]);

  /**
   * 🎯 RENDER CATEGORY FILTERS
   */
  const renderCategoryFilters = () => (
    <CategoryFilter
      categories={CATEGORIES}
      selectedCategory={selectedCategory}
      onSelectCategory={handleCategorySelect}
      scrollX={categoryScrollX}
    />
  );

  /**
   * 📊 RENDER ANALYTICS SECTION
   */
  const renderAnalyticsSection = () => (
    <View style={styles.analyticsSection}>
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        style={styles.analyticsGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.analyticsContent}>
          <View style={styles.analyticsItem}>
            <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
            <Text style={styles.analyticsNumber}>
              {analytics.totalSkills.toLocaleString()}
            </Text>
            <Text style={styles.analyticsLabel}>Skills Available</Text>
          </View>
          
          <View style={styles.analyticsDivider} />
          
          <View style={styles.analyticsItem}>
            <FontAwesome5 name="user-graduate" size={22} color="#FFFFFF" />
            <Text style={styles.analyticsNumber}>
              {analytics.completionRates.average || '85%'}
            </Text>
            <Text style={styles.analyticsLabel}>Success Rate</Text>
          </View>
          
          <View style={styles.analyticsDivider} />
          
          <View style={styles.analyticsItem}>
            <MaterialIcons name="attach-money" size={24} color="#FFFFFF" />
            <Text style={styles.analyticsNumber}>
              {analytics.incomePotential.average || '15K'}
            </Text>
            <Text style={styles.analyticsLabel}>Avg. Monthly Income</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  /**
   * 🎯 RENDER TRENDING SKILLS
   */
  const renderTrendingSkills = () => {
    if (!analytics.trendingSkills?.length) return null;
    
    return (
      <View style={styles.trendingSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="trending-up" size={24} color="#4F46E5" />
          <Text style={styles.sectionTitle}>🔥 Trending Now</Text>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.trendingScroll}
        >
          {analytics.trendingSkills.slice(0, 5).map((skill, index) => (
            <TouchableOpacity
              key={skill.id}
              style={styles.trendingCard}
              onPress={() => handleSkillSelect(skill)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#F3F4F6', '#E5E7EB']}
                style={styles.trendingGradient}
              >
                <View style={styles.trendingContent}>
                  <Text style={styles.trendingRank}>#{index + 1}</Text>
                  <Text style={styles.trendingName} numberOfLines={1}>
                    {skill.name}
                  </Text>
                  <View style={styles.trendingStats}>
                    <Text style={styles.trendingStat}>
                      📈 {skill.growthRate || '25%'} growth
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  /**
   * 📱 RENDER LOADING STATE
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <LoadingSkeleton type="skills" count={6} />
    </View>
  );

  /**
   * ⚠️ RENDER ERROR STATE
   */
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={64} color="#EF4444" />
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => loadSkillsData(true)}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * 📊 RENDER EMPTY STATE
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search" size={64} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>No skills found</Text>
      <Text style={styles.emptyMessage}>
        Try adjusting your search or filter criteria
      </Text>
    </View>
  );

  /**
   * 🏗️ RENDER HEADER
   */
  const renderHeader = () => {
    const headerHeight = scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [120, 80],
      extrapolate: 'clamp'
    });

    const headerTranslate = scrollY.interpolate({
      inputRange: [0, 100],
      outputRange: [0, -50],
      extrapolate: 'clamp'
    });

    return (
      <Animated.View style={[
        styles.header,
        {
          height: headerHeight,
          transform: [{ translateY: headerTranslate }]
        }
      ]}>
        <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
            style={StyleSheet.absoluteFill}
          />
        </BlurView>
        
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Explore Skills</Text>
            <Text style={styles.headerSubtitle}>
              Master high-income skills in 4 months
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => navigation.navigate('Cart')}
          >
            <View style={styles.cartBadge}>
              <Text style={styles.cartCount}>{cartItems.length}</Text>
            </View>
            <Ionicons name="cart" size={24} color="#4F46E5" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {/* 🏗️ Header */}
        {renderHeader()}
        
        {/* 🔍 Search Bar */}
        <SearchBar
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search 40+ skills..."
          style={styles.searchBar}
        />
        
        {/* 📊 Analytics Section */}
        {!isLoading && !error && renderAnalyticsSection()}
        
        {/* 🔥 Trending Skills */}
        {!isLoading && !error && renderTrendingSkills()}
        
        {/* 🎯 Category Filters */}
        {renderCategoryFilters()}
        
        {/* 📱 Main Content */}
        <Animated.FlatList
          data={filteredSkills}
          renderItem={renderSkillItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.skillsGrid}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#4F46E5']}
              tintColor="#4F46E5"
            />
          }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          ListEmptyComponent={
            isLoading ? renderLoadingState() :
            error ? renderErrorState() :
            renderEmptyState()
          }
          ListFooterComponent={
            !isLoading && !error && filteredSkills.length > 0 ? (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Showing {filteredSkills.length} of {skills.length} skills
                </Text>
              </View>
            ) : null
          }
        />
        
        {/* 💰 Income Calculator Modal */}
        <IncomeCalculator
          visible={selectedSkill !== null}
          skill={selectedSkill}
          onClose={() => setSelectedSkill(null)}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

/**
 * 🏗️ STYLESHEET
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  cartButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  cartCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    marginHorizontal: 20,
    marginTop: 120,
    marginBottom: 16,
  },
  analyticsSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  analyticsGradient: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  analyticsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  analyticsItem: {
    alignItems: 'center',
    flex: 1,
  },
  analyticsDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  analyticsNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  analyticsLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  trendingSection: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  trendingScroll: {
    flexDirection: 'row',
  },
  trendingCard: {
    width: width * 0.4,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  trendingGradient: {
    padding: 16,
  },
  trendingContent: {
    alignItems: 'center',
  },
  trendingRank: {
    fontSize: 32,
    fontWeight: '800',
    color: '#4F46E5',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-black',
  },
  trendingName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  trendingStats: {
    marginTop: 8,
  },
  trendingStat: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  skillsGrid: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
});

/**
 * 🎯 FETCH ENTERPRISE SKILLS
 */
const fetchEnterpriseSkills = async (forceRefresh = false) => {
  // 🏗️ This would be replaced with actual API call
  // For now, returning mock data for demonstration
  
  return [
    {
      id: 'forex-trading',
      name: 'Forex Trading Mastery',
      category: 'online',
      difficulty: 'advanced',
      description: 'Master currency trading with proven SMC strategies',
      duration: '4 months',
      incomePotential: '15,000 - 30,000 ETB/month',
      rating: 4.8,
      students: 1250,
      tags: ['high-income', 'flexible', 'global'],
      icon: '💹',
      color: '#10B981'
    },
    {
      id: 'graphic-design',
      name: 'Professional Graphic Design',
      category: 'online',
      difficulty: 'intermediate',
      description: 'Create stunning designs for brands and businesses',
      duration: '4 months',
      incomePotential: '8,000 - 20,000 ETB/month',
      rating: 4.6,
      students: 980,
      tags: ['creative', 'in-demand', 'freelance'],
      icon: '🎨',
      color: '#8B5CF6'
    },
    {
      id: 'woodworking',
      name: 'Professional Woodworking',
      category: 'offline',
      difficulty: 'intermediate',
      description: 'Master furniture making and carpentry techniques',
      duration: '4 months',
      incomePotential: '10,000 - 25,000 ETB/month',
      rating: 4.7,
      students: 650,
      tags: ['hands-on', 'high-demand', 'entrepreneur'],
      icon: '🪚',
      color: '#F59E0B'
    },
    {
      id: 'personal-training',
      name: 'Certified Personal Training',
      category: 'health',
      difficulty: 'beginner',
      description: 'Become a certified fitness trainer and coach',
      duration: '4 months',
      incomePotential: '6,000 - 15,000 ETB/month',
      rating: 4.5,
      students: 720,
      tags: ['health', 'fitness', 'coaching'],
      icon: '💪',
      color: '#EF4444'
    },
    {
      id: 'hair-styling',
      name: 'Professional Hair Styling',
      category: 'beauty',
      difficulty: 'beginner',
      description: 'Master braiding, weaving, and modern hairstyling',
      duration: '4 months',
      incomePotential: '8,000 - 20,000 ETB/month',
      rating: 4.9,
      students: 1100,
      tags: ['beauty', 'creative', 'high-demand'],
      icon: '💇',
      color: '#EC4899'
    },
    {
      id: 'web-development',
      name: 'Full-Stack Web Development',
      category: 'online',
      difficulty: 'advanced',
      description: 'Build modern web applications from scratch',
      duration: '4 months',
      incomePotential: '12,000 - 30,000 ETB/month',
      rating: 4.7,
      students: 890,
      tags: ['tech', 'high-income', 'remote'],
      icon: '💻',
      color: '#3B82F6'
    }
  ];
};

export default ExploreSkills;