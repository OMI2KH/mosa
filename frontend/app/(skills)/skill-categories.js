/**
 * 🏢 MOSA FORGE - Enterprise Skill Categories Component
 * 🎯 Interactive Skill Discovery & Category Navigation
 * 📊 Visual Skill Representation & Popularity Analytics
 * 🔄 Dynamic Category Filtering & Recommendation Engine
 * 🚀 Enterprise-Ready Frontend Architecture
 * 
 * @component SkillCategories
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  RefreshControl,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

// 🏗️ Enterprise Dependencies
import EnterpriseLogger from '../../utils/enterprise-logger';
import AnalyticsService from '../../services/analytics-service';
import CategoryDataService from '../../services/category-data-service';
import PerformanceMonitor from '../../utils/performance-monitor';

// 🎨 Design System
import Colors from '../../design-system/colors';
import Typography from '../../design-system/typography';
import Spacing from '../../design-system/spacing';
import Shadows from '../../design-system/shadows';

// 📊 Constants
const CATEGORIES = [
  {
    id: 'online_skills',
    name: '💻 Online Skills',
    description: 'Digital skills for the modern economy',
    color: Colors.primary.blue,
    icon: 'laptop-mac',
    gradient: ['#4A90E2', '#357ABD'],
    skillCount: 10,
    popularity: 85,
    trending: true,
    features: ['Remote Work', 'High Income', 'Global Market']
  },
  {
    id: 'offline_skills',
    name: '🏗️ Offline Skills',
    description: 'Traditional skills with modern applications',
    color: Colors.primary.green,
    icon: 'tools',
    gradient: ['#34C759', '#2CA94E'],
    skillCount: 10,
    popularity: 75,
    trending: false,
    features: ['Local Demand', 'Physical Work', 'Steady Income']
  },
  {
    id: 'health_sports',
    name: '🏥 Health & Sports',
    description: 'Wellness and fitness professional skills',
    color: Colors.primary.red,
    icon: 'heart-pulse',
    gradient: ['#FF3B30', '#D70015'],
    skillCount: 10,
    popularity: 65,
    trending: true,
    features: ['Growing Industry', 'Health Focus', 'Service Sector']
  },
  {
    id: 'beauty_fashion',
    name: '💄 Beauty & Fashion',
    description: 'Creative and aesthetic professional skills',
    color: Colors.primary.purple,
    icon: 'sparkles',
    gradient: ['#AF52DE', '#8E44AD'],
    skillCount: 10,
    popularity: 70,
    trending: false,
    features: ['Creative Work', 'Client Service', 'Trend Based']
  }
];

const SKILLS_PER_CATEGORY = {
  online_skills: [
    { id: 'forex_trading', name: 'Forex Trading Mastery', icon: 'chart-line', difficulty: 'Advanced', earningPotential: 'High' },
    { id: 'graphic_design', name: 'Professional Graphic Design', icon: 'palette', difficulty: 'Intermediate', earningPotential: 'Medium' },
    { id: 'digital_marketing', name: 'Digital Marketing Pro', icon: 'bullhorn', difficulty: 'Intermediate', earningPotential: 'High' },
    { id: 'web_development', name: 'Full-Stack Web Development', icon: 'code', difficulty: 'Advanced', earningPotential: 'High' },
    { id: 'content_writing', name: 'Professional Content Writing', icon: 'pencil', difficulty: 'Beginner', earningPotential: 'Medium' },
    { id: 'video_editing', name: 'Video Editing Professional', icon: 'video', difficulty: 'Intermediate', earningPotential: 'High' },
    { id: 'social_media', name: 'Social Media Management', icon: 'instagram', difficulty: 'Beginner', earningPotential: 'Medium' },
    { id: 'ecommerce', name: 'E-commerce Management', icon: 'shopping', difficulty: 'Intermediate', earningPotential: 'High' },
    { id: 'data_analysis', name: 'Data Analysis & Visualization', icon: 'chart-bar', difficulty: 'Advanced', earningPotential: 'High' },
    { id: 'app_development', name: 'Mobile App Development', icon: 'cellphone', difficulty: 'Advanced', earningPotential: 'High' }
  ],
  offline_skills: [
    { id: 'woodworking', name: 'Professional Woodworking', icon: 'hammer', difficulty: 'Intermediate', earningPotential: 'Medium' },
    { id: 'construction', name: 'Construction & Masonry', icon: 'home', difficulty: 'Intermediate', earningPotential: 'Medium' },
    { id: 'painting', name: 'Professional Painting Services', icon: 'format-paint', difficulty: 'Beginner', earningPotential: 'Medium' },
    { id: 'door_window', name: 'Door & Window Installation', icon: 'door', difficulty: 'Intermediate', earningPotential: 'Medium' },
    { id: 'plumbing', name: 'Professional Plumbing Services', icon: 'pipe', difficulty: 'Intermediate', earningPotential: 'High' },
    { id: 'network_security', name: 'Network & Security Systems', icon: 'shield-check', difficulty: 'Advanced', earningPotential: 'High' },
    { id: 'solar_power', name: 'Solar & Power Systems', icon: 'solar-power', difficulty: 'Advanced', earningPotential: 'High' },
    { id: 'electrical', name: 'Professional Electrical Services', icon: 'flash', difficulty: 'Advanced', earningPotential: 'High' },
    { id: 'metal_fabrication', name: 'Metal Fabrication & Welding', icon: 'wrench', difficulty: 'Advanced', earningPotential: 'High' },
    { id: 'automotive', name: 'Automotive Repair & Maintenance', icon: 'car', difficulty: 'Intermediate', earningPotential: 'High' }
  ],
  health_sports: [
    { id: 'personal_training', name: 'Certified Personal Training', icon: 'dumbbell', difficulty: 'Intermediate', earningPotential: 'Medium' },
    { id: 'sports_coaching', name: 'Professional Sports Coaching', icon: 'soccer', difficulty: 'Advanced', earningPotential: 'High' },
    { id: 'nutrition', name: 'Nutrition & Diet Counseling', icon: 'food-apple', difficulty: 'Advanced', earningPotential: 'High' },
    { id: 'yoga', name: 'Yoga Instructor Certification', icon: 'yoga', difficulty: 'Intermediate', earningPotential: 'Medium' },
    { id: 'massage', name: 'Professional Massage Therapy', icon: 'hand', difficulty: 'Intermediate', earningPotential: 'Medium' },
    { id: 'first_aid', name: 'First Aid & Emergency Response', icon: 'medical-bag', difficulty: 'Beginner', earningPotential: 'Medium' },
    { id: 'dance', name: 'Dance Instruction & Choreography', icon: 'music', difficulty: 'Intermediate', earningPotential: 'Medium' },
    { id: 'martial_arts', name: 'Martial Arts Instruction', icon: 'karate', difficulty: 'Advanced', earningPotential: 'High' },
    { id: 'group_fitness', name: 'Group Fitness Instruction', icon: 'account-group', difficulty: 'Beginner', earningPotential: 'Medium' },
    { id: 'sports_events', name: 'Sports Event Management', icon: 'trophy', difficulty: 'Advanced', earningPotential: 'High' }
  ],
  beauty_fashion: [
    { id: 'hair_styling', name: 'Professional Hair Styling', icon: 'content-cut', difficulty: 'Intermediate', earningPotential: 'Medium' },
    { id: 'makeup', name: 'Professional Makeup Artistry', icon: 'brush', difficulty: 'Intermediate', earningPotential: 'High' },
    { id: 'fashion_design', name: 'Fashion Design & Creation', icon: 'hanger', difficulty: 'Advanced', earningPotential: 'High' },
    { id: 'nail_technology', name: 'Nail Technology & Art', icon: 'hand-pointing-up', difficulty: 'Beginner', earningPotential: 'Medium' },
    { id: 'skincare', name: 'Professional Skincare Services', icon: 'face-woman', difficulty: 'Intermediate', earningPotential: 'High' },
    { id: 'henna', name: 'Henna Art & Design', icon: 'draw', difficulty: 'Beginner', earningPotential: 'Medium' },
    { id: 'tailoring', name: 'Professional Tailoring Services', icon: 'needle', difficulty: 'Intermediate', earningPotential: 'Medium' },
    { id: 'jewelry', name: 'Jewelry Design & Creation', icon: 'diamond', difficulty: 'Intermediate', earningPotential: 'High' },
    { id: 'perfume', name: 'Perfume Creation & Business', icon: 'flower', difficulty: 'Advanced', earningPotential: 'High' },
    { id: 'beauty_salon', name: 'Beauty Salon Entrepreneurship', icon: 'store', difficulty: 'Advanced', earningPotential: 'High' }
  ]
};

const SkillCategories = () => {
  // 🏗️ State Management
  const [selectedCategory, setSelectedCategory] = useState('online_skills');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterEarning, setFilterEarning] = useState('all');
  const [animationValues] = useState(() => 
    CATEGORIES.reduce((acc, category) => {
      acc[category.id] = new Animated.Value(0);
      return acc;
    }, {})
  );

  // 🎯 Hooks
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const logger = useMemo(() => new EnterpriseLogger({ module: 'skill-categories' }), []);
  const analytics = useMemo(() => new AnalyticsService(), []);
  const categoryService = useMemo(() => new CategoryDataService(), []);
  const performanceMonitor = useMemo(() => new PerformanceMonitor('skill-categories'), []);

  // 📊 Metrics
  const [categoryMetrics, setCategoryMetrics] = useState({
    totalCategories: CATEGORIES.length,
    totalSkills: 40,
    popularSkills: [],
    trendingSkills: []
  });

  // 🔄 Lifecycle
  useEffect(() => {
    const componentStartTime = performance.now();
    
    // 🎯 Initialize component
    initializeComponent();

    // 📊 Log component load
    logger.info('Skill categories component mounted', {
      timestamp: new Date().toISOString(),
      initialCategory: selectedCategory
    });

    // 📈 Track analytics
    analytics.trackScreenView('SkillCategories', {
      category_count: CATEGORIES.length,
      skill_count: 40
    });

    const loadTime = performance.now() - componentStartTime;
    performanceMonitor.recordMetric('component_load_time', loadTime);

    return () => {
      // 🧹 Cleanup
      performanceMonitor.recordSessionEnd();
      logger.info('Skill categories component unmounted');
    };
  }, []);

  useEffect(() => {
    // 🔄 Load skills for selected category
    loadCategorySkills(selectedCategory);
    
    // 🎯 Animate category selection
    animateCategorySelection(selectedCategory);
    
    // 📊 Track category selection
    analytics.trackEvent('category_selected', {
      category_id: selectedCategory,
      category_name: CATEGORIES.find(c => c.id === selectedCategory)?.name
    });
  }, [selectedCategory]);

  // 🎯 Initialize Component
  const initializeComponent = async () => {
    try {
      setLoading(true);
      performanceMonitor.startSession();

      // 📊 Load category data
      const categoryData = await categoryService.loadCategoryData();
      
      // 📈 Load popular skills
      const popularSkills = await categoryService.getPopularSkills();
      
      // 🔥 Load trending skills
      const trendingSkills = await categoryService.getTrendingSkills();

      setCategoryMetrics(prev => ({
        ...prev,
        popularSkills,
        trendingSkills
      }));

      // 🎯 Load initial skills
      await loadCategorySkills(selectedCategory);

      setLoading(false);

      logger.info('Skill categories initialized successfully', {
        categoriesLoaded: CATEGORIES.length,
        skillsLoaded: skills.length
      });

    } catch (error) {
      logger.error('Failed to initialize skill categories', {
        error: error.message,
        stack: error.stack
      });
      setLoading(false);
    }
  };

  // 🔄 Load Category Skills
  const loadCategorySkills = async (categoryId) => {
    try {
      performanceMonitor.startOperation('load_category_skills');
      
      const categorySkills = SKILLS_PER_CATEGORY[categoryId] || [];
      
      // 🎯 Apply filters if any
      let filteredSkills = categorySkills;
      
      if (searchQuery) {
        filteredSkills = filteredSkills.filter(skill =>
          skill.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      if (filterDifficulty !== 'all') {
        filteredSkills = filteredSkills.filter(skill =>
          skill.difficulty.toLowerCase() === filterDifficulty.toLowerCase()
        );
      }
      
      if (filterEarning !== 'all') {
        filteredSkills = filteredSkills.filter(skill =>
          skill.earningPotential.toLowerCase() === filterEarning.toLowerCase()
        );
      }
      
      setSkills(filteredSkills);

      performanceMonitor.endOperation('load_category_skills');

      logger.debug('Category skills loaded', {
        categoryId,
        skillCount: filteredSkills.length,
        filtersApplied: {
          search: !!searchQuery,
          difficulty: filterDifficulty,
          earning: filterEarning
        }
      });

    } catch (error) {
      logger.error('Failed to load category skills', {
        categoryId,
        error: error.message
      });
      setSkills([]);
    }
  };

  // 🎨 Animate Category Selection
  const animateCategorySelection = (categoryId) => {
    CATEGORIES.forEach(category => {
      const targetValue = category.id === categoryId ? 1 : 0;
      Animated.spring(animationValues[category.id], {
        toValue: targetValue,
        tension: 50,
        friction: 7,
        useNativeDriver: true
      }).start();
    });
  };

  // 🎯 Handle Category Selection
  const handleCategorySelect = useCallback((categoryId) => {
    // ✨ Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }

    // 🎯 Set selected category
    setSelectedCategory(categoryId);
    
    // 🔄 Reset expanded category
    setExpandedCategory(prev => prev === categoryId ? null : categoryId);
    
    // 📊 Track interaction
    analytics.trackEvent('category_interaction', {
      action: 'select',
      category_id: categoryId,
      timestamp: new Date().toISOString()
    });
  }, [analytics]);

  // 🎯 Handle Skill Selection
  const handleSkillSelect = useCallback((skill) => {
    // ✨ Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // 📊 Track skill selection
    analytics.trackEvent('skill_selected', {
      skill_id: skill.id,
      skill_name: skill.name,
      category_id: selectedCategory,
      difficulty: skill.difficulty,
      earning_potential: skill.earningPotential
    });

    // 🚀 Navigate to skill details
    navigation.navigate('SkillDetails', {
      skillId: skill.id,
      skillName: skill.name,
      categoryId: selectedCategory
    });

    logger.info('Skill selected for details view', {
      skillId: skill.id,
      skillName: skill.name
    });
  }, [selectedCategory, navigation, analytics, logger]);

  // 🔄 Handle Refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      // 📊 Refresh category data
      await initializeComponent();
      
      // 📈 Track refresh
      analytics.trackEvent('categories_refreshed', {
        timestamp: new Date().toISOString(),
        category_count: CATEGORIES.length
      });
      
      logger.info('Skill categories refreshed successfully');
    } catch (error) {
      logger.error('Failed to refresh skill categories', {
        error: error.message
      });
    } finally {
      setRefreshing(false);
    }
  }, [analytics, logger]);

  // 🔍 Handle Search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    
    // 📊 Track search
    if (query.length > 0) {
      analytics.trackEvent('skill_search', {
        query,
        category_id: selectedCategory,
        result_count: skills.length
      });
    }
  }, [selectedCategory, skills.length, analytics]);

  // 🎯 Render Category Card
  const renderCategoryCard = useCallback((category) => {
    const isSelected = selectedCategory === category.id;
    const isExpanded = expandedCategory === category.id;
    const scale = animationValues[category.id].interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.05]
    });
    const shadowOpacity = animationValues[category.id].interpolate({
      inputRange: [0, 1],
      outputRange: [0.1, 0.3]
    });

    return (
      <Animated.View
        key={category.id}
        style={[
          styles.categoryCard,
          {
            transform: [{ scale }],
            shadowOpacity,
            elevation: isSelected ? 8 : 4
          }
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleCategorySelect(category.id)}
          style={styles.categoryTouchable}
        >
          <LinearGradient
            colors={category.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.categoryGradient}
          >
            {/* 🔥 Trending Badge */}
            {category.trending && (
              <View style={styles.trendingBadge}>
                <Icon name="fire" size={12} color={Colors.white} />
                <Text style={styles.trendingText}>Trending</Text>
              </View>
            )}

            {/* 🎯 Category Header */}
            <View style={styles.categoryHeader}>
              <View style={styles.categoryIconContainer}>
                <Icon name={category.icon} size={28} color={Colors.white} />
              </View>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryDescription}>
                  {category.description}
                </Text>
              </View>
            </View>

            {/* 📊 Category Stats */}
            <View style={styles.categoryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{category.skillCount}</Text>
                <Text style={styles.statLabel}>Skills</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{category.popularity}%</Text>
                <Text style={styles.statLabel}>Popular</Text>
              </View>
              <View style={styles.statItem}>
                <Icon 
                  name={isSelected ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color={Colors.white} 
                />
              </View>
            </View>

            {/* 🎯 Category Features */}
            {isSelected && (
              <Animated.View 
                style={[
                  styles.categoryFeatures,
                  { opacity: animationValues[category.id] }
                ]}
              >
                {category.features.map((feature, index) => (
                  <View key={index} style={styles.featureTag}>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </Animated.View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [selectedCategory, expandedCategory, animationValues, handleCategorySelect]);

  // 🎯 Render Skill Item
  const renderSkillItem = useCallback((skill) => {
    const difficultyColors = {
      Beginner: Colors.success.green,
      Intermediate: Colors.warning.orange,
      Advanced: Colors.danger.red
    };

    const earningColors = {
      Low: Colors.neutral.gray,
      Medium: Colors.warning.orange,
      High: Colors.success.green
    };

    return (
      <TouchableOpacity
        key={skill.id}
        style={styles.skillCard}
        activeOpacity={0.8}
        onPress={() => handleSkillSelect(skill)}
        onLongPress={() => {
          if (Platform.OS === 'ios') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }
        }}
      >
        {/* 🎨 Skill Icon */}
        <View style={styles.skillIconContainer}>
          <LinearGradient
            colors={['#FFFFFF', '#F5F5F5']}
            style={styles.skillIconGradient}
          >
            <Icon name={skill.icon} size={24} color={Colors.primary.blue} />
          </LinearGradient>
        </View>

        {/* 📝 Skill Info */}
        <View style={styles.skillInfo}>
          <Text style={styles.skillName} numberOfLines={2}>
            {skill.name}
          </Text>
          
          {/* 🎯 Difficulty & Earning Tags */}
          <View style={styles.skillTags}>
            <View style={[
              styles.difficultyTag,
              { backgroundColor: difficultyColors[skill.difficulty] + '20' }
            ]}>
              <Text style={[
                styles.tagText,
                { color: difficultyColors[skill.difficulty] }
              ]}>
                {skill.difficulty}
              </Text>
            </View>
            
            <View style={[
              styles.earningTag,
              { backgroundColor: earningColors[skill.earningPotential] + '20' }
            ]}>
              <Text style={[
                styles.tagText,
                { color: earningColors[skill.earningPotential] }
              ]}>
                {skill.earningPotential} Earning
              </Text>
            </View>
          </View>
        </View>

        {/* 🔗 Navigation Icon */}
        <View style={styles.navigationIcon}>
          <Icon name="chevron-right" size={24} color={Colors.neutral.gray} />
        </View>
      </TouchableOpacity>
    );
  }, [handleSkillSelect]);

  // 🎯 Render Filters
  const renderFilters = useCallback(() => (
    <View style={styles.filterContainer}>
      {/* 🔍 Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={Colors.neutral.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search skills..."
          placeholderTextColor={Colors.neutral.gray}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={20} color={Colors.neutral.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* 🎯 Difficulty Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterScrollContent}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterDifficulty === 'all' && styles.filterButtonActive
          ]}
          onPress={() => setFilterDifficulty('all')}
        >
          <Text style={[
            styles.filterButtonText,
            filterDifficulty === 'all' && styles.filterButtonTextActive
          ]}>
            All Levels
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterDifficulty === 'beginner' && styles.filterButtonActive
          ]}
          onPress={() => setFilterDifficulty('beginner')}
        >
          <Text style={[
            styles.filterButtonText,
            filterDifficulty === 'beginner' && styles.filterButtonTextActive
          ]}>
            👶 Beginner
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterDifficulty === 'intermediate' && styles.filterButtonActive
          ]}
          onPress={() => setFilterDifficulty('intermediate')}
        >
          <Text style={[
            styles.filterButtonText,
            filterDifficulty === 'intermediate' && styles.filterButtonTextActive
          ]}>
            🎯 Intermediate
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterDifficulty === 'advanced' && styles.filterButtonActive
          ]}
          onPress={() => setFilterDifficulty('advanced')}
        >
          <Text style={[
            styles.filterButtonText,
            filterDifficulty === 'advanced' && styles.filterButtonTextActive
          ]}>
            ⚡ Advanced
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 💰 Earning Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterScrollContent}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterEarning === 'all' && styles.filterButtonActive
          ]}
          onPress={() => setFilterEarning('all')}
        >
          <Text style={[
            styles.filterButtonText,
            filterEarning === 'all' && styles.filterButtonTextActive
          ]}>
            All Earnings
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterEarning === 'high' && styles.filterButtonActive
          ]}
          onPress={() => setFilterEarning('high')}
        >
          <Text style={[
            styles.filterButtonText,
            filterEarning === 'high' && styles.filterButtonTextActive
          ]}>
            💰 High
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterEarning === 'medium' && styles.filterButtonActive
          ]}
          onPress={() => setFilterEarning('medium')}
        >
          <Text style={[
            styles.filterButtonText,
            filterEarning === 'medium' && styles.filterButtonTextActive
          ]}>
            📈 Medium
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterEarning === 'low' && styles.filterButtonActive
          ]}
          onPress={() => setFilterEarning('low')}
        >
          <Text style={[
            styles.filterButtonText,
            filterEarning === 'low' && styles.filterButtonTextActive
          ]}>
            📊 Low
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  ), [searchQuery, filterDifficulty, filterEarning, handleSearch]);

  // 🎯 Render Stats Overview
  const renderStatsOverview = useCallback(() => (
    <View style={styles.statsContainer}>
      <LinearGradient
        colors={['#FFFFFF', '#F8F9FA']}
        style={styles.statsGradient}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>40</Text>
            <Text style={styles.statCardLabel}>Total Skills</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>4</Text>
            <Text style={styles.statCardLabel}>Categories</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>1999</Text>
            <Text style={styles.statCardLabel}>ETB Bundle</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statCardValue}>70%</Text>
            <Text style={styles.statCardLabel}>Success Rate</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  ), []);

  // 🎯 Render Loading State
  const renderLoadingState = useCallback(() => (
    <View style={styles.loadingContainer}>
      <Animated.View style={styles.loadingSpinner}>
        <Icon name="loading" size={40} color={Colors.primary.blue} />
      </Animated.View>
      <Text style={styles.loadingText}>Loading Skills...</Text>
    </View>
  ), []);

  // 🎯 Render Empty State
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Icon name="magnify-remove" size={60} color={Colors.neutral.gray} />
      <Text style={styles.emptyTitle}>No Skills Found</Text>
      <Text style={styles.emptyDescription}>
        Try adjusting your filters or search terms
      </Text>
      <TouchableOpacity
        style={styles.resetButton}
        onPress={() => {
          setSearchQuery('');
          setFilterDifficulty('all');
          setFilterEarning('all');
        }}
      >
        <Text style={styles.resetButtonText}>Reset Filters</Text>
      </TouchableOpacity>
    </View>
  ), []);

  return (
    <View style={[
      styles.container,
      { paddingTop: insets.top + Spacing.md }
    ]}>
      {/* 📱 Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🎯 Skill Categories</Text>
          <Text style={styles.headerSubtitle}>
            Choose from 40+ high-income skills
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.headerAction}
          onPress={handleRefresh}
        >
          <Icon name="refresh" size={24} color={Colors.primary.blue} />
        </TouchableOpacity>
      </View>

      {/* 📊 Stats Overview */}
      {renderStatsOverview()}

      {/* 🔄 Refresh Control */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary.blue]}
            tintColor={Colors.primary.blue}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 🎯 Categories Grid */}
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map(renderCategoryCard)}
        </View>

        {/* 🔍 Filters */}
        {renderFilters()}

        {/* 📊 Skills Section */}
        <View style={styles.skillsSection}>
          <View style={styles.skillsHeader}>
            <Text style={styles.skillsTitle}>
              {skills.length} Skills Available
            </Text>
            <TouchableOpacity>
              <Text style={styles.viewAllButton}>
                View All Skills →
              </Text>
            </TouchableOpacity>
          </View>

          {/* 🎯 Skills List */}
          {loading ? (
            renderLoadingState()
          ) : skills.length === 0 ? (
            renderEmptyState()
          ) : (
            <View style={styles.skillsList}>
              {skills.map(renderSkillItem)}
            </View>
          )}
        </View>

        {/* 📈 Performance Metrics */}
        <View style={styles.metricsSection}>
          <Text style={styles.metricsTitle}>Performance Insights</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Icon name="trending-up" size={24} color={Colors.success.green} />
              <Text style={styles.metricValue}>85%</Text>
              <Text style={styles.metricLabel}>Completion Rate</Text>
            </View>
            <View style={styles.metricItem}>
              <Icon name="currency-usd" size={24} color={Colors.warning.orange} />
              <Text style={styles.metricValue}>999+</Text>
              <Text style={styles.metricLabel}>Avg. Expert Earning</Text>
            </View>
            <View style={styles.metricItem}>
              <Icon name="clock-fast" size={24} color={Colors.primary.blue} />
              <Text style={styles.metricValue}>4</Text>
              <Text style={styles.metricLabel}>Months to Income</Text>
            </View>
          </View>
        </View>

        {/* 🚀 CTA Section */}
        <View style={styles.ctaSection}>
          <LinearGradient
            colors={['#4A90E2', '#357ABD']}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaTitle}>
              Ready to Transform Your Skills?
            </Text>
            <Text style={styles.ctaDescription}>
              Join 10,000+ Ethiopians who transformed their income with MOSA FORGE
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => {
                navigation.navigate('Enrollment', { categoryId: selectedCategory });
                analytics.trackEvent('enrollment_cta_clicked', {
                  category_id: selectedCategory
                });
              }}
            >
              <Text style={styles.ctaButtonText}>
                Start Your Journey - 1,999 ETB
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
};

// 🎨 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.heading1,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  headerAction: {
    padding: Spacing.sm,
  },
  statsContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Spacing.md,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  statsGradient: {
    padding: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
  },
  statCardValue: {
    ...Typography.heading2,
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statCardLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  categoriesGrid: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  categoryCard: {
    marginBottom: Spacing.md,
    borderRadius: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  categoryTouchable: {
    borderRadius: Spacing.lg,
    overflow: 'hidden',
  },
  categoryGradient: {
    padding: Spacing.lg,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.sm,
    marginBottom: Spacing.md,
  },
  trendingText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    ...Typography.heading2,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  categoryDescription: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...Typography.heading2,
    color: Colors.white,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: Spacing.xs,
  },
  categoryFeatures: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.sm,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  featureText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '500',
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
    padding: 0,
  },
  filterScroll: {
    marginBottom: Spacing.sm,
  },
  filterScrollContent: {
    paddingRight: Spacing.lg,
  },
  filterButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    borderRadius: Spacing.md,
    marginRight: Spacing.sm,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary.blue,
  },
  filterButtonText: {
    ...Typography.body,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: Colors.white,
  },
  skillsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  skillsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  skillsTitle: {
    ...Typography.heading2,
    color: Colors.text.primary,
  },
  viewAllButton: {
    ...Typography.body,
    color: Colors.primary.blue,
    fontWeight: '600',
  },
  skillsList: {
    backgroundColor: Colors.background.secondary,
    borderRadius: Spacing.lg,
    overflow: 'hidden',
  },
  skillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  skillIconContainer: {
    marginRight: Spacing.md,
  },
  skillIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    ...Typography.heading3,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  skillTags: {
    flexDirection: 'row',
  },
  difficultyTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.xs,
    marginRight: Spacing.sm,
  },
  earningTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.xs,
  },
  tagText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  navigationIcon: {
    marginLeft: Spacing.sm,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  loadingSpinner: {
    marginBottom: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
  emptyContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...Typography.heading3,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyDescription: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  resetButton: {
    backgroundColor: Colors.primary.blue,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.md,
  },
  resetButtonText: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '600',
  },
  metricsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  metricsTitle: {
    ...Typography.heading2,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: Spacing.md,
    borderRadius: Spacing.md,
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  metricValue: {
    ...Typography.heading2,
    color: Colors.text.primary,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  ctaSection: {
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  ctaGradient: {
    padding: Spacing.xl,
    borderRadius: Spacing.lg,
  },
  ctaTitle: {
    ...Typography.heading2,
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  ctaDescription: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.lg,
    borderRadius: Spacing.md,
    alignItems: 'center',
  },
  ctaButtonText: {
    ...Typography.heading3,
    color: Colors.primary.blue,
    fontWeight: '700',
  },
});

export default SkillCategories;