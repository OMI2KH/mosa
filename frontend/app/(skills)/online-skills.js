/**
 * 🏢 MOSA FORGE - Enterprise Online Skills Catalog
 * 💻 Comprehensive Digital Skills Showcase & Enrollment
 * 🎯 Interactive Skill Selection & Bundle Customization
 * 📊 Real-time Demand Analytics & Expert Availability
 * 🚀 React Native Enterprise Architecture
 * 
 * @module OnlineSkills
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

// 🏗️ Enterprise Dependencies
import EnterpriseHeader from '../../components/shared/EnterpriseHeader';
import SkillCard from '../../components/skills/SkillCard';
import BundleCalculator from '../../components/payment/BundleCalculator';
import ExpertAvailability from '../../components/expert/ExpertAvailability';
import DemandIndicator from '../../components/analytics/DemandIndicator';
import QualityBadge from '../../components/quality/QualityBadge';
import { useAuth } from '../../contexts/AuthContext';
import { usePayment } from '../../contexts/PaymentContext';
import { useSkills } from '../../contexts/SkillsContext';

// 📱 Device Configuration
const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const isIOS = Platform.OS === 'ios';

/**
 * 🎯 Online Skills Catalog Component
 */
const OnlineSkills = () => {
  // 🎯 Navigation & Context
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { selectedBundle, updateBundle } = usePayment();
  const { skills, loading, error, refreshSkills } = useSkills();

  // 🎯 State Management
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expertAvailability, setExpertAvailability] = useState({});
  const [demandData, setDemandData] = useState({});
  const [selectedExperts, setSelectedExperts] = useState([]);

  // 🎯 Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // 🎯 Categories Configuration
  const categories = [
    { id: 'all', label: 'All Skills', icon: 'grid', count: 0 },
    { id: 'high_demand', label: 'High Demand', icon: 'trending-up', count: 0 },
    { id: 'beginner_friendly', label: 'Beginner Friendly', icon: 'user-check', count: 0 },
    { id: 'premium', label: 'Premium Skills', icon: 'award', count: 0 },
    { id: 'fast_track', label: 'Fast Track', icon: 'zap', count: 0 },
  ];

  // 🎯 Online Skills Data
  const onlineSkills = [
    {
      id: 'forex_trading',
      title: 'Forex Trading Mastery',
      tagline: 'Master Global Currency Markets',
      description: 'Complete forex trading system with ICT, SMC, Price Action, Supply/Demand, and Fibonacci strategies. Start earning from global markets.',
      icon: '📈',
      difficulty: 'Advanced',
      duration: '4 months',
      averageIncome: '15,000-30,000 ETB/month',
      demand: 'very_high',
      category: 'high_demand',
      expertCount: 42,
      rating: 4.8,
      features: [
        'Live Trading Sessions',
        'Risk Management System',
        'Market Analysis Tools',
        'Trading Psychology',
        'Certificate of Mastery'
      ],
      bundlePrice: 1999,
      requirements: ['Basic Math Skills', 'Internet Access', 'Discipline'],
      expectedOutcome: 'Consistent monthly income from forex trading'
    },
    {
      id: 'graphic_design',
      title: 'Professional Graphic Design',
      tagline: 'Create Stunning Visual Content',
      description: 'Master Adobe Creative Suite for logo design, social media graphics, print materials, UI/UX, and branding. Build a professional portfolio.',
      icon: '🎨',
      difficulty: 'Intermediate',
      duration: '3 months',
      averageIncome: '8,000-15,000 ETB/month',
      demand: 'high',
      category: 'beginner_friendly',
      expertCount: 35,
      rating: 4.7,
      features: [
        'Adobe Suite Mastery',
        'Portfolio Development',
        'Client Project Work',
        'Freelance Setup',
        'Design Certificate'
      ],
      bundlePrice: 1999,
      requirements: ['Creative Mindset', 'Computer Access', 'Basic Drawing Skills'],
      expectedOutcome: 'Professional graphic designer ready for freelance or employment'
    },
    {
      id: 'digital_marketing',
      title: 'Digital Marketing Pro',
      tagline: 'Dominate Online Marketing',
      description: 'Complete digital marketing training covering SEO, Social Media Marketing, Email Marketing, PPC, and Analytics. Launch successful campaigns.',
      icon: '📱',
      difficulty: 'Intermediate',
      duration: '3 months',
      averageIncome: '10,000-20,000 ETB/month',
      demand: 'very_high',
      category: 'high_demand',
      expertCount: 38,
      rating: 4.6,
      features: [
        'SEO Optimization',
        'Social Media Strategy',
        'Google Ads Certification',
        'Analytics Dashboard',
        'Marketing Certificate'
      ],
      bundlePrice: 1999,
      requirements: ['Basic Computer Skills', 'Internet Access', 'Analytical Thinking'],
      expectedOutcome: 'Certified digital marketing professional'
    },
    {
      id: 'web_development',
      title: 'Full-Stack Web Development',
      tagline: 'Build Modern Web Applications',
      description: 'Comprehensive web development training covering Frontend, Backend, E-commerce, WordPress, and Mobile Responsive development.',
      icon: '💻',
      difficulty: 'Advanced',
      duration: '4 months',
      averageIncome: '12,000-25,000 ETB/month',
      demand: 'high',
      category: 'premium',
      expertCount: 45,
      rating: 4.9,
      features: [
        'React & Node.js',
        'Database Management',
        'E-commerce Development',
        'WordPress Customization',
        'Web Development Certificate'
      ],
      bundlePrice: 1999,
      requirements: ['Logical Thinking', 'Basic Programming', 'Problem Solving'],
      expectedOutcome: 'Full-stack web developer ready for employment'
    },
    {
      id: 'content_writing',
      title: 'Professional Content Writing',
      tagline: 'Master Digital Content Creation',
      description: 'Learn professional content writing for blogs, SEO, copywriting, technical writing, and social media. Build a writing portfolio.',
      icon: '✍️',
      difficulty: 'Beginner',
      duration: '2 months',
      averageIncome: '6,000-12,000 ETB/month',
      demand: 'medium',
      category: 'beginner_friendly',
      expertCount: 28,
      rating: 4.5,
      features: [
        'SEO Writing Techniques',
        'Copywriting Mastery',
        'Portfolio Development',
        'Freelance Platform Setup',
        'Writing Certificate'
      ],
      bundlePrice: 1999,
      requirements: ['Good English Skills', 'Writing Passion', 'Research Ability'],
      expectedOutcome: 'Professional content writer for online platforms'
    },
    {
      id: 'video_editing',
      title: 'Video Editing Professional',
      tagline: 'Create Engaging Video Content',
      description: 'Professional video editing training for YouTube, social media, corporate videos, documentaries, and music videos.',
      icon: '🎬',
      difficulty: 'Intermediate',
      duration: '3 months',
      averageIncome: '8,000-18,000 ETB/month',
      demand: 'high',
      category: 'fast_track',
      expertCount: 32,
      rating: 4.7,
      features: [
        'Adobe Premiere Pro',
        'After Effects',
        'Color Grading',
        'Audio Editing',
        'Video Editing Certificate'
      ],
      bundlePrice: 1999,
      requirements: ['Creative Vision', 'Computer Access', 'Basic Video Knowledge'],
      expectedOutcome: 'Professional video editor for content creation'
    },
    {
      id: 'social_media',
      title: 'Social Media Management',
      tagline: 'Build Powerful Social Presence',
      description: 'Complete social media management training covering strategy, content creation, analytics, advertising, and community management.',
      icon: '📲',
      difficulty: 'Beginner',
      duration: '2 months',
      averageIncome: '7,000-15,000 ETB/month',
      demand: 'very_high',
      category: 'fast_track',
      expertCount: 30,
      rating: 4.6,
      features: [
        'Platform Strategy',
        'Content Calendar',
        'Analytics Dashboard',
        'Ad Campaign Management',
        'Social Media Certificate'
      ],
      bundlePrice: 1999,
      requirements: ['Social Media Savvy', 'Creative Thinking', 'Communication Skills'],
      expectedOutcome: 'Certified social media manager'
    },
    {
      id: 'ecommerce',
      title: 'E-commerce Management',
      tagline: 'Launch Successful Online Stores',
      description: 'Complete e-commerce training covering Shopify, Amazon, dropshipping, inventory management, and digital marketing.',
      icon: '🛒',
      difficulty: 'Intermediate',
      duration: '3 months',
      averageIncome: '15,000-30,000 ETB/month',
      demand: 'high',
      category: 'premium',
      expertCount: 36,
      rating: 4.8,
      features: [
        'Shopify Store Setup',
        'Amazon FBA',
        'Dropshipping System',
        'Inventory Management',
        'E-commerce Certificate'
      ],
      bundlePrice: 1999,
      requirements: ['Business Mindset', 'Basic Computer Skills', 'Customer Service'],
      expectedOutcome: 'E-commerce entrepreneur or manager'
    },
    {
      id: 'data_analysis',
      title: 'Data Analysis & Visualization',
      tagline: 'Transform Data into Insights',
      description: 'Professional data analysis training covering Excel, SQL, data visualization, reporting, and Python for data analysis.',
      icon: '📊',
      difficulty: 'Advanced',
      duration: '4 months',
      averageIncome: '12,000-25,000 ETB/month',
      demand: 'very_high',
      category: 'premium',
      expertCount: 40,
      rating: 4.8,
      features: [
        'Excel Advanced',
        'SQL Database Queries',
        'Data Visualization',
        'Python for Data',
        'Data Analysis Certificate'
      ],
      bundlePrice: 1999,
      requirements: ['Analytical Mindset', 'Basic Math', 'Logical Thinking'],
      expectedOutcome: 'Data analyst for businesses'
    },
    {
      id: 'mobile_app',
      title: 'Mobile App Development',
      tagline: 'Build iOS & Android Apps',
      description: 'Complete mobile app development training covering React Native, Flutter, iOS, Android, and backend integration.',
      icon: '📱',
      difficulty: 'Advanced',
      duration: '4 months',
      averageIncome: '15,000-30,000 ETB/month',
      demand: 'high',
      category: 'premium',
      expertCount: 44,
      rating: 4.9,
      features: [
        'React Native',
        'Flutter Development',
        'Backend Integration',
        'App Store Deployment',
        'App Development Certificate'
      ],
      bundlePrice: 1999,
      requirements: ['Programming Basics', 'Problem Solving', 'Creative Thinking'],
      expectedOutcome: 'Mobile app developer for companies or freelance'
    }
  ];

  // 🎯 Initialize Component
  useEffect(() => {
    initializeComponent();
    loadExpertAvailability();
    loadDemandData();
    startAnimations();
  }, []);

  // 🎯 Filter Skills Based on Category and Search
  useEffect(() => {
    filterSkills();
    updateCategoryCounts();
  }, [selectedCategory, searchQuery, onlineSkills]);

  // 🎯 Initialize Component
  const initializeComponent = () => {
    // Load from context if available
    if (skills && skills.length > 0) {
      setFilteredSkills(skills.filter(skill => skill.category === 'online'));
    } else {
      setFilteredSkills(onlineSkills);
    }
  };

  // 🎯 Start Animations
  const startAnimations = () => {
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
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  };

  // 🎯 Filter Skills
  const filterSkills = () => {
    let filtered = [...onlineSkills];

    // Apply category filter
    if (selectedCategory !== 'all') {
      switch (selectedCategory) {
        case 'high_demand':
          filtered = filtered.filter(skill => skill.demand === 'very_high' || skill.demand === 'high');
          break;
        case 'beginner_friendly':
          filtered = filtered.filter(skill => skill.difficulty === 'Beginner');
          break;
        case 'premium':
          filtered = filtered.filter(skill => skill.category === 'premium');
          break;
        case 'fast_track':
          filtered = filtered.filter(skill => skill.duration === '2 months' || skill.duration === '3 months');
          break;
      }
    }

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(skill =>
        skill.title.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.tagline.toLowerCase().includes(query) ||
        skill.features.some(feature => feature.toLowerCase().includes(query))
      );
    }

    setFilteredSkills(filtered);
  };

  // 🎯 Update Category Counts
  const updateCategoryCounts = () => {
    const updatedCategories = categories.map(category => {
      let count = 0;
      switch (category.id) {
        case 'all':
          count = onlineSkills.length;
          break;
        case 'high_demand':
          count = onlineSkills.filter(s => s.demand === 'very_high' || s.demand === 'high').length;
          break;
        case 'beginner_friendly':
          count = onlineSkills.filter(s => s.difficulty === 'Beginner').length;
          break;
        case 'premium':
          count = onlineSkills.filter(s => s.category === 'premium').length;
          break;
        case 'fast_track':
          count = onlineSkills.filter(s => s.duration === '2 months' || s.duration === '3 months').length;
          break;
      }
      return { ...category, count };
    });
    // Update categories with counts
  };

  // 🎯 Load Expert Availability
  const loadExpertAvailability = async () => {
    try {
      // Simulated API call
      const availability = {};
      onlineSkills.forEach(skill => {
        availability[skill.id] = {
          available: Math.random() > 0.3,
          count: skill.expertCount,
          averageRating: skill.rating,
          responseTime: '2-24 hours'
        };
      });
      setExpertAvailability(availability);
    } catch (error) {
      console.error('Error loading expert availability:', error);
    }
  };

  // 🎯 Load Demand Data
  const loadDemandData = async () => {
    try {
      // Simulated API call
      const demand = {};
      onlineSkills.forEach(skill => {
        demand[skill.id] = {
          level: skill.demand,
          trend: Math.random() > 0.5 ? 'up' : 'stable',
          enrollmentRate: Math.floor(Math.random() * 100) + 50,
          completionRate: Math.floor(Math.random() * 30) + 70
        };
      });
      setDemandData(demand);
    } catch (error) {
      console.error('Error loading demand data:', error);
    }
  };

  // 🎯 Handle Skill Selection
  const handleSkillSelect = useCallback((skill) => {
    setSelectedSkill(skill);
    setShowDetailModal(true);
  }, []);

  // 🎯 Handle Enrollment Start
  const handleEnroll = useCallback(() => {
    if (!isAuthenticated) {
      router.push('/(auth)/login');
      return;
    }

    if (selectedSkill) {
      // Update payment context with selected skill
      updateBundle({
        ...selectedBundle,
        skillId: selectedSkill.id,
        skillName: selectedSkill.title,
        bundlePrice: selectedSkill.bundlePrice,
        category: 'online'
      });

      setShowDetailModal(false);
      setShowBundleModal(true);
    }
  }, [selectedSkill, isAuthenticated, selectedBundle]);

  // 🎯 Handle Bundle Confirmation
  const handleBundleConfirm = useCallback(() => {
    if (selectedSkill) {
      router.push({
        pathname: '/(enrollment)/bundle-confirmation',
        params: {
          skillId: selectedSkill.id,
          skillName: selectedSkill.title,
          bundlePrice: selectedSkill.bundlePrice,
          category: 'online'
        }
      });
      setShowBundleModal(false);
    }
  }, [selectedSkill]);

  // 🎯 Handle Refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      refreshSkills(),
      loadExpertAvailability(),
      loadDemandData()
    ]);
    setIsRefreshing(false);
  }, [refreshSkills]);

  // 🎯 Render Category Tab
  const renderCategoryTab = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryTab,
        selectedCategory === item.id && styles.categoryTabActive
      ]}
      onPress={() => setSelectedCategory(item.id)}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name={item.icon}
        size={20}
        color={selectedCategory === item.id ? '#FFFFFF' : '#666'}
      />
      <Text style={[
        styles.categoryLabel,
        selectedCategory === item.id && styles.categoryLabelActive
      ]}>
        {item.label}
      </Text>
      {item.count > 0 && (
        <View style={styles.categoryCount}>
          <Text style={styles.categoryCountText}>{item.count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // 🎯 Render Skill Card
  const renderSkillCard = ({ item, index }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          { translateY: slideAnim },
          { scale: scaleAnim }
        ]
      }}
    >
      <SkillCard
        skill={item}
        onSelect={() => handleSkillSelect(item)}
        expertAvailability={expertAvailability[item.id]}
        demandData={demandData[item.id]}
        index={index}
      />
    </Animated.View>
  );

  // 🎯 Render Skill Detail Modal
  const renderSkillDetailModal = () => (
    <Modal
      visible={showDetailModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDetailModal(false)}
    >
      <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
        <SafeAreaView style={styles.modalContainer}>
          <Animated.ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedSkill?.title}</Text>
              <View style={styles.modalIconContainer}>
                <Text style={styles.modalIcon}>{selectedSkill?.icon}</Text>
              </View>
            </View>

            {/* Skill Tagline */}
            <Text style={styles.skillTagline}>{selectedSkill?.tagline}</Text>

            {/* Skill Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Feather name="clock" size={18} color="#666" />
                <Text style={styles.statText}>{selectedSkill?.duration}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialIcons name="school" size={18} color="#666" />
                <Text style={styles.statText}>{selectedSkill?.difficulty}</Text>
              </View>
              <View style={styles.statItem}>
                <FontAwesome5 name="money-bill-wave" size={16} color="#666" />
                <Text style={styles.statText}>{selectedSkill?.averageIncome}</Text>
              </View>
            </View>

            {/* Demand Indicator */}
            <View style={styles.demandSection}>
              <DemandIndicator level={selectedSkill?.demand} />
              <QualityBadge rating={selectedSkill?.rating} />
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Course Overview</Text>
              <Text style={styles.description}>{selectedSkill?.description}</Text>
            </View>

            {/* Features */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What You'll Learn</Text>
              {selectedSkill?.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* Requirements */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Requirements</Text>
              {selectedSkill?.requirements.map((req, index) => (
                <View key={index} style={styles.requirementItem}>
                  <Ionicons name="ellipse" size={10} color="#666" />
                  <Text style={styles.requirementText}>{req}</Text>
                </View>
              ))}
            </View>

            {/* Expected Outcome */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Expected Outcome</Text>
              <Text style={styles.outcomeText}>{selectedSkill?.expectedOutcome}</Text>
            </View>

            {/* Expert Availability */}
            {expertAvailability[selectedSkill?.id] && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Expert Availability</Text>
                <ExpertAvailability
                  availability={expertAvailability[selectedSkill?.id]}
                  skillId={selectedSkill?.id}
                />
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.secondaryButtonText}>Explore More</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleEnroll}
              >
                <LinearGradient
                  colors={['#4F46E5', '#7C3AED']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.primaryButtonText}>Enroll Now - 1,999 ETB</Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.ScrollView>
        </SafeAreaView>
      </BlurView>
    </Modal>
  );

  // 🎯 Render Bundle Modal
  const renderBundleModal = () => (
    <Modal
      visible={showBundleModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowBundleModal(false)}
    >
      <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.bundleModalContent}>
            <BundleCalculator
              skill={selectedSkill}
              onConfirm={handleBundleConfirm}
              onCancel={() => setShowBundleModal(false)}
            />
          </View>
        </SafeAreaView>
      </BlurView>
    </Modal>
  );

  // 🎯 Render Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <EnterpriseHeader title="Online Skills" />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading Skills Catalog...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 🎯 Render Error State
  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <EnterpriseHeader title="Online Skills" />
        <View style={styles.errorContent}>
          <MaterialIcons name="error-outline" size={64} color="#DC2626" />
          <Text style={styles.errorTitle}>Failed to Load Skills</Text>
          <Text style={styles.errorMessage}>{error.message || 'Please check your connection'}</Text>
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

  // 🎯 Main Render
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <EnterpriseHeader
        title="Online Skills"
        subtitle="Master Digital Skills for Global Opportunities"
        showBack={true}
        rightActions={[
          {
            icon: 'search',
            onPress: () => router.push('/(search)/skills-search'),
          },
          {
            icon: 'filter-list',
            onPress: () => router.push('/(filters)/skills-filter'),
          }
        ]}
      />

      {/* Category Tabs */}
      <Animated.View
        style={[
          styles.categoriesContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <FlatList
          data={categories}
          renderItem={renderCategoryTab}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </Animated.View>

      {/* Skills Grid */}
      <FlatList
        data={filteredSkills}
        renderItem={renderSkillCard}
        keyExtractor={(item) => item.id}
        numColumns={isTablet ? 2 : 1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.skillsGrid}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>No Skills Found</Text>
            <Text style={styles.emptyStateText}>
              Try changing your search or filter criteria
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.headerInfo}>
            <Text style={styles.skillsCount}>
              {filteredSkills.length} Online Skills Available
            </Text>
            <Text style={styles.headerSubtitle}>
              Learn in-demand digital skills with expert guidance
            </Text>
          </View>
        }
      />

      {/* Modals */}
      {renderSkillDetailModal()}
      {renderBundleModal()}

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(enrollment)/quick-enrollment')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#4F46E5', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fabGradient}
          >
            <MaterialIcons name="flash-on" size={24} color="#FFFFFF" />
            <Text style={styles.fabText}>Quick Enroll</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

// 🎨 Styles
const styles = StyleSheet.create({
  // 🏗️ Container Styles
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },

  // 🎯 Category Styles
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  categoryTabActive: {
    backgroundColor: '#4F46E5',
  },
  categoryLabel: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666',
  },
  categoryLabelActive: {
    color: '#FFFFFF',
  },
  categoryCount: {
    marginLeft: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryCountText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },

  // 📊 Skills Grid Styles
  skillsGrid: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  headerInfo: {
    marginVertical: 16,
  },
  skillsCount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },

  // 🎭 Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 100,
    paddingBottom: isIOS ? 40 : 24,
  },
  bundleModalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 100,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    textAlign: 'center',
    marginHorizontal: 12,
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalIcon: {
    fontSize: 20,
  },
  skillTagline: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4F46E5',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 4,
  },
  demandSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    lineHeight: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    marginLeft: 10,
    lineHeight: 20,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    marginLeft: 10,
    lineHeight: 20,
  },
  outcomeText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
    lineHeight: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 32,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#4B5563',
  },
  primaryButton: {
    flex: 2,
  },
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginRight: 8,
  },

  // 🚀 FAB Styles
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fab: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  fabText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default OnlineSkills;