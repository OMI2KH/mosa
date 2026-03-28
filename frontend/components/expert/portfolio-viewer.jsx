/**
 * 🏆 MOSA FORGE: Enterprise Portfolio Viewer Component
 * 
 * @component PortfolioViewer
 * @description Expert portfolio display with verification badges, quality metrics, and interactive elements
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Verified portfolio display with government stamps
 * - Quality metrics and tier badges
 * - Interactive project gallery
 * - Student success metrics
 * - Real-time verification status
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Animated,
  FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Video } from 'expo-av';
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';

// 🏗️ Enterprise Constants
const PORTFOLIO_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
  CERTIFICATE: 'certificate',
  STAMP: 'stamp'
};

const VERIFICATION_STATUS = {
  VERIFIED: 'verified',
  PENDING: 'pending',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

const TIER_CONFIG = {
  MASTER: {
    color: '#FFD700',
    badge: '🏆 Master',
    requirements: '4.7+ rating, 80%+ completion'
  },
  SENIOR: {
    color: '#C0C0C0', 
    badge: '🥈 Senior',
    requirements: '4.3+ rating, 75%+ completion'
  },
  STANDARD: {
    color: '#CD7F32',
    badge: '🥉 Standard',
    requirements: '4.0+ rating, 70%+ completion'
  }
};

/**
 * 🏆 Enterprise Portfolio Viewer Component
 * @param {Object} props - Component properties
 */
const PortfolioViewer = ({ 
  expertId,
  onEnrollPress,
  onQualityReport,
  showActionButtons = true,
  compactMode = false,
  enableInteractions = true
}) => {
  // 🏗️ State Management
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  const [imageLoadErrors, setImageLoadErrors] = useState(new Set());
  const [animation] = useState(new Animated.Value(0));

  // 🏗️ Animation Effects
  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // 🏗️ Data Fetching
  useEffect(() => {
    loadPortfolioData();
  }, [expertId]);

  /**
   * 🏗️ Load Portfolio Data with Error Handling
   */
  const loadPortfolioData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchPortfolioData(expertId);
      
      if (response.success) {
        setPortfolioData(response.data);
      } else {
        throw new Error(response.error || 'Failed to load portfolio');
      }
    } catch (error) {
      console.error('Portfolio loading error:', error);
      Alert.alert('Loading Error', 'Unable to load expert portfolio. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [expertId]);

  /**
   * 🏗️ Refresh Handler
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPortfolioData();
  }, [loadPortfolioData]);

  /**
   * 🏗️ Media Selection Handler
   */
  const handleMediaSelect = useCallback((mediaItem) => {
    if (mediaItem.type === PORTFOLIO_TYPES.VIDEO && !mediaItem.url) {
      Alert.alert('Video Unavailable', 'This video content is currently unavailable.');
      return;
    }
    
    setSelectedMedia(mediaItem);
    setMediaModalVisible(true);
  }, []);

  /**
   * 🏗️ Enrollment Handler
   */
  const handleEnrollPress = useCallback(() => {
    if (!portfolioData?.expert?.isAvailable) {
      Alert.alert(
        'Expert Unavailable',
        'This expert is currently not accepting new students. Please check back later or select another expert.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (onEnrollPress) {
      onEnrollPress({
        expertId: portfolioData.expert.id,
        expertName: portfolioData.expert.name,
        tier: portfolioData.expert.tier,
        qualityScore: portfolioData.qualityMetrics.overallScore
      });
    }
  }, [portfolioData, onEnrollPress]);

  /**
   * 🏗️ Quality Report Handler
   */
  const handleQualityReport = useCallback(() => {
    if (onQualityReport) {
      onQualityReport({
        expertId: portfolioData.expert.id,
        qualityMetrics: portfolioData.qualityMetrics
      });
    }
  }, [portfolioData, onQualityReport]);

  /**
   * 🏗️ Image Error Handler
   */
  const handleImageError = useCallback((mediaId) => {
    setImageLoadErrors(prev => new Set(prev).add(mediaId));
  }, []);

  // 🏗️ Loading State
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-gray-600 font-medium">Loading expert portfolio...</Text>
      </View>
    );
  }

  // 🏗️ Error State
  if (!portfolioData) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <MaterialIcons name="error-outline" size={48} color="#EF4444" />
        <Text className="mt-4 text-lg font-semibold text-gray-800">Portfolio Unavailable</Text>
        <Text className="mt-2 text-gray-600 text-center px-8">
          Unable to load expert portfolio. Please check your connection and try again.
        </Text>
        <TouchableOpacity 
          className="mt-6 bg-blue-500 px-6 py-3 rounded-full"
          onPress={loadPortfolioData}
        >
          <Text className="text-white font-semibold">Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { expert, portfolio, qualityMetrics, verification } = portfolioData;

  return (
    <Animated.View 
      style={{
        opacity: animation,
        transform: [{
          translateY: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0]
          })
        }]
      }}
      className="flex-1 bg-gray-50"
    >
      {/* 🏗️ Main Content */}
      <ScrollView 
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
        className="flex-1"
      >
        {/* 🏆 Expert Header Section */}
        <ExpertHeader 
          expert={expert}
          qualityMetrics={qualityMetrics}
          compactMode={compactMode}
        />

        {/* 📊 Quality Metrics Section */}
        {!compactMode && (
          <QualityMetricsSection 
            qualityMetrics={qualityMetrics}
            verification={verification}
          />
        )}

        {/* 🎯 Action Buttons */}
        {showActionButtons && enableInteractions && (
          <ActionButtons 
            onEnrollPress={handleEnrollPress}
            onQualityReport={handleQualityReport}
            expert={expert}
          />
        )}

        {/* 📁 Portfolio Content Tabs */}
        {!compactMode && (
          <PortfolioTabs 
            activeTab={activeTab}
            onTabChange={setActiveTab}
            portfolio={portfolio}
            onMediaSelect={handleMediaSelect}
            imageLoadErrors={imageLoadErrors}
            onImageError={handleImageError}
          />
        )}

        {/* ℹ️ Additional Information */}
        {!compactMode && (
          <AdditionalInfo 
            expert={expert}
            qualityMetrics={qualityMetrics}
          />
        )}
      </ScrollView>

      {/* 🖼️ Media Modal */}
      <MediaModal 
        visible={mediaModalVisible}
        media={selectedMedia}
        onClose={() => setMediaModalVisible(false)}
      />
    </Animated.View>
  );
};

/**
 * 🏆 Expert Header Component
 */
const ExpertHeader = ({ expert, qualityMetrics, compactMode }) => {
  const tierConfig = TIER_CONFIG[expert.tier] || TIER_CONFIG.STANDARD;

  return (
    <LinearGradient
      colors={['#1E40AF', '#3B82F6']}
      className="px-6 pt-8 pb-6 rounded-b-3xl shadow-2xl"
    >
      <View className={`${compactMode ? 'flex-row items-center' : ''}`}>
        {/* Profile Image */}
        <View className={`relative ${compactMode ? 'mr-4' : 'self-center'}`}>
          <Image
            source={{ uri: expert.profileImage || 'https://via.placeholder.com/120' }}
            className={`rounded-full border-4 border-white ${compactMode ? 'w-16 h-16' : 'w-24 h-24'}`}
            resizeMode="cover"
          />
          
          {/* Online Status Badge */}
          {expert.isOnline && (
            <View className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
          )}

          {/* Tier Badge */}
          <View 
            className="absolute -top-2 -right-2 px-2 py-1 rounded-full border-2 border-white"
            style={{ backgroundColor: tierConfig.color }}
          >
            <Text className="text-xs font-bold text-white">{tierConfig.badge}</Text>
          </View>
        </View>

        <View className={`flex-1 ${compactMode ? '' : 'mt-4 items-center'}`}>
          {/* Name and Title */}
          <Text className="text-2xl font-bold text-white text-center">
            {expert.name}
          </Text>
          <Text className="text-blue-100 text-center mt-1 font-medium">
            {expert.title}
          </Text>

          {/* Rating and Reviews */}
          <View className="flex-row items-center justify-center mt-2">
            <View className="flex-row items-center">
              <MaterialIcons name="star" size={20} color="#FFD700" />
              <Text className="text-white font-bold ml-1">
                {qualityMetrics.overallScore.toFixed(1)}
              </Text>
            </View>
            <Text className="text-blue-200 mx-2">•</Text>
            <Text className="text-blue-200">
              {expert.reviewCount} reviews
            </Text>
            <Text className="text-blue-200 mx-2">•</Text>
            <Text className="text-blue-200">
              {expert.studentCount} students
            </Text>
          </View>

          {/* Specialization Tags */}
          {!compactMode && expert.specializations && (
            <View className="flex-row flex-wrap justify-center mt-3">
              {expert.specializations.slice(0, 3).map((spec, index) => (
                <View
                  key={index}
                  className="bg-blue-400 px-3 py-1 rounded-full mr-2 mb-2"
                >
                  <Text className="text-white text-xs font-medium">{spec}</Text>
                </View>
              ))}
              {expert.specializations.length > 3 && (
                <View className="bg-blue-300 px-3 py-1 rounded-full">
                  <Text className="text-white text-xs font-medium">
                    +{expert.specializations.length - 3} more
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </LinearGradient>
  );
};

/**
 * 📊 Quality Metrics Section
 */
const QualityMetricsSection = ({ qualityMetrics, verification }) => {
  const metrics = [
    {
      label: 'Completion Rate',
      value: `${Math.round(qualityMetrics.completionRate * 100)}%`,
      icon: 'check-circle',
      color: qualityMetrics.completionRate >= 0.7 ? '#10B981' : '#EF4444'
    },
    {
      label: 'Avg Response Time',
      value: `${qualityMetrics.responseTime}h`,
      icon: 'access-time',
      color: qualityMetrics.responseTime <= 24 ? '#10B981' : '#F59E0B'
    },
    {
      label: 'Student Satisfaction',
      value: `${Math.round(qualityMetrics.satisfactionRate * 100)}%`,
      icon: 'sentiment-satisfied',
      color: qualityMetrics.satisfactionRate >= 0.8 ? '#10B981' : '#EF4444'
    },
    {
      label: 'Success Rate',
      value: `${Math.round(qualityMetrics.successRate * 100)}%`,
      icon: 'trending-up',
      color: qualityMetrics.successRate >= 0.75 ? '#10B981' : '#F59E0B'
    }
  ];

  return (
    <View className="mx-6 mt-6 bg-white rounded-2xl shadow-lg p-6">
      <Text className="text-xl font-bold text-gray-800 mb-4">Quality Metrics</Text>
      
      <View className="grid grid-cols-2 gap-4">
        {metrics.map((metric, index) => (
          <View key={index} className="bg-gray-50 rounded-xl p-4">
            <View className="flex-row items-center justify-between mb-2">
              <MaterialIcons name={metric.icon} size={20} color={metric.color} />
              <Text className="text-lg font-bold" style={{ color: metric.color }}>
                {metric.value}
              </Text>
            </View>
            <Text className="text-gray-600 text-sm">{metric.label}</Text>
          </View>
        ))}
      </View>

      {/* Verification Status */}
      <View className="mt-6 pt-4 border-t border-gray-200">
        <View className="flex-row items-center justify-between">
          <Text className="text-gray-700 font-medium">Verification Status</Text>
          <View className={`flex-row items-center px-3 py-1 rounded-full ${
            verification.status === VERIFICATION_STATUS.VERIFIED 
              ? 'bg-green-100' 
              : 'bg-yellow-100'
          }`}>
            <MaterialIcons 
              name={
                verification.status === VERIFICATION_STATUS.VERIFIED 
                  ? 'verified' 
                  : 'pending'
              } 
              size={16} 
              color={
                verification.status === VERIFICATION_STATUS.VERIFIED 
                  ? '#10B981' 
                  : '#F59E0B'
              } 
            />
            <Text className={`ml-1 text-xs font-medium ${
              verification.status === VERIFICATION_STATUS.VERIFIED 
                ? 'text-green-800' 
                : 'text-yellow-800'
            }`}>
              {verification.status.charAt(0).toUpperCase() + verification.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Verification Details */}
        {verification.details && (
          <View className="mt-2">
            {verification.details.faydaId && (
              <View className="flex-row items-center mt-1">
                <MaterialIcons name="fingerprint" size={14} color="#6B7280" />
                <Text className="text-gray-600 text-sm ml-2">
                  Fayda ID: {verification.details.faydaId}
                </Text>
              </View>
            )}
            {verification.details.certificates && (
              <View className="flex-row items-center mt-1">
                <MaterialIcons name="card-membership" size={14} color="#6B7280" />
                <Text className="text-gray-600 text-sm ml-2">
                  {verification.details.certificates} verified certificates
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

/**
 * 🎯 Action Buttons Component
 */
const ActionButtons = ({ onEnrollPress, onQualityReport, expert }) => {
  return (
    <View className="mx-6 mt-6 flex-row space-x-4">
      {/* Primary Enrollment Button */}
      <TouchableOpacity
        onPress={onEnrollPress}
        disabled={!expert.isAvailable}
        className={`flex-1 flex-row items-center justify-center py-4 rounded-2xl shadow-lg ${
          expert.isAvailable 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
            : 'bg-gray-400'
        }`}
      >
        <FontAwesome5 
          name="user-graduate" 
          size={20} 
          color="white" 
        />
        <Text className="text-white font-bold text-lg ml-3">
          {expert.isAvailable ? 'Enroll Now' : 'Not Available'}
        </Text>
      </TouchableOpacity>

      {/* Secondary Quality Report Button */}
      <TouchableOpacity
        onPress={onQualityReport}
        className="w-14 h-14 bg-white border-2 border-gray-300 rounded-2xl shadow-lg items-center justify-center"
      >
        <Ionicons name="stats-chart" size={24} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );
};

/**
 * 📁 Portfolio Tabs Component
 */
const PortfolioTabs = ({ 
  activeTab, 
  onTabChange, 
  portfolio, 
  onMediaSelect,
  imageLoadErrors,
  onImageError 
}) => {
  const tabs = [
    { id: 'projects', label: 'Projects', icon: 'work' },
    { id: 'certificates', label: 'Certificates', icon: 'card-membership' },
    { id: 'reviews', label: 'Reviews', icon: 'rate-review' },
    { id: 'students', label: 'Students', icon: 'school' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'projects':
        return <ProjectsTab portfolio={portfolio} onMediaSelect={onMediaSelect} />;
      case 'certificates':
        return <CertificatesTab portfolio={portfolio} onMediaSelect={onMediaSelect} />;
      case 'reviews':
        return <ReviewsTab portfolio={portfolio} />;
      case 'students':
        return <StudentsTab portfolio={portfolio} />;
      default:
        return null;
    }
  };

  return (
    <View className="mx-6 mt-6 bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Tab Headers */}
      <View className="flex-row border-b border-gray-200">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            className={`flex-1 py-4 items-center ${
              activeTab === tab.id 
                ? 'border-b-2 border-blue-500' 
                : ''
            }`}
          >
            <MaterialIcons
              name={tab.icon}
              size={20}
              color={activeTab === tab.id ? '#3B82F6' : '#9CA3AF'}
            />
            <Text
              className={`text-xs font-medium mt-1 ${
                activeTab === tab.id ? 'text-blue-500' : 'text-gray-500'
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View className="p-4">
        {renderTabContent()}
      </View>
    </View>
  );
};

/**
 * 🛠️ Projects Tab Component
 */
const ProjectsTab = ({ portfolio, onMediaSelect }) => {
  if (!portfolio.projects || portfolio.projects.length === 0) {
    return (
      <View className="items-center py-8">
        <MaterialIcons name="work-outline" size={48} color="#9CA3AF" />
        <Text className="text-gray-500 mt-2 text-center">
          No projects available yet
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={portfolio.projects}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => onMediaSelect(item)}
          className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200"
        >
          <View className="flex-row">
            {item.thumbnail && (
              <Image
                source={{ uri: item.thumbnail }}
                className="w-16 h-16 rounded-lg mr-4"
                resizeMode="cover"
              />
            )}
            <View className="flex-1">
              <Text className="font-semibold text-gray-800 text-lg">
                {item.title}
              </Text>
              <Text className="text-gray-600 text-sm mt-1">
                {item.description}
              </Text>
              {item.technologies && (
                <View className="flex-row flex-wrap mt-2">
                  {item.technologies.slice(0, 3).map((tech, index) => (
                    <View
                      key={index}
                      className="bg-blue-100 px-2 py-1 rounded mr-2 mb-1"
                    >
                      <Text className="text-blue-800 text-xs">{tech}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );
};

/**
 * 📜 Certificates Tab Component
 */
const CertificatesTab = ({ portfolio, onMediaSelect }) => {
  if (!portfolio.certificates || portfolio.certificates.length === 0) {
    return (
      <View className="items-center py-8">
        <MaterialIcons name="card-membership" size={48} color="#9CA3AF" />
        <Text className="text-gray-500 mt-2 text-center">
          No certificates available yet
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={portfolio.certificates}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <TouchableOpacity
          onPress={() => onMediaSelect(item)}
          className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200"
        >
          <View className="flex-row items-center">
            <MaterialIcons name="verified" size={24} color="#10B981" />
            <View className="ml-4 flex-1">
              <Text className="font-semibold text-gray-800">
                {item.title}
              </Text>
              <Text className="text-gray-600 text-sm mt-1">
                {item.issuer} • {item.issueDate}
              </Text>
              {item.verificationUrl && (
                <Text className="text-blue-500 text-xs mt-1">
                  Verified: {item.verificationUrl}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );
};

/**
 * ⭐ Reviews Tab Component
 */
const ReviewsTab = ({ portfolio }) => {
  if (!portfolio.reviews || portfolio.reviews.length === 0) {
    return (
      <View className="items-center py-8">
        <MaterialIcons name="rate-review" size={48} color="#9CA3AF" />
        <Text className="text-gray-500 mt-2 text-center">
          No reviews yet
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={portfolio.reviews}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="font-semibold text-gray-800">
                {item.studentName}
              </Text>
              <View className="flex-row items-center mt-1">
                {[...Array(5)].map((_, index) => (
                  <MaterialIcons
                    key={index}
                    name="star"
                    size={16}
                    color={index < item.rating ? '#FFD700' : '#D1D5DB'}
                  />
                ))}
                <Text className="text-gray-500 text-sm ml-2">
                  {item.date}
                </Text>
              </View>
              <Text className="text-gray-700 mt-2 leading-5">
                {item.comment}
              </Text>
            </View>
          </View>
        </View>
      )}
    />
  );
};

/**
 * 👥 Students Tab Component
 */
const StudentsTab = ({ portfolio }) => {
  if (!portfolio.studentSuccess || portfolio.studentSuccess.length === 0) {
    return (
      <View className="items-center py-8">
        <FontAwesome5 name="user-graduate" size={48} color="#9CA3AF" />
        <Text className="text-gray-500 mt-2 text-center">
          No student success stories yet
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={portfolio.studentSuccess}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center">
              <Text className="text-blue-600 font-bold text-lg">
                {item.name.charAt(0)}
              </Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="font-semibold text-gray-800">
                {item.name}
              </Text>
              <Text className="text-gray-600 text-sm">
                Completed: {item.completionDate}
              </Text>
              {item.currentRole && (
                <Text className="text-green-600 text-sm font-medium mt-1">
                  Now: {item.currentRole}
                </Text>
              )}
            </View>
          </View>
          {item.testimonial && (
            <Text className="text-gray-700 mt-3 text-sm italic">
              "{item.testimonial}"
            </Text>
          )}
        </View>
      )}
    />
  );
};

/**
 * ℹ️ Additional Information Component
 */
const AdditionalInfo = ({ expert, qualityMetrics }) => {
  return (
    <View className="mx-6 mt-6 bg-white rounded-2xl shadow-lg p-6 mb-8">
      <Text className="text-xl font-bold text-gray-800 mb-4">
        About {expert.name.split(' ')[0]}
      </Text>

      {/* Bio */}
      {expert.bio && (
        <Text className="text-gray-700 leading-6 mb-6">
          {expert.bio}
        </Text>
      )}

      {/* Experience and Education */}
      <View className="space-y-4">
        {expert.experienceYears && (
          <View className="flex-row items-center">
            <MaterialIcons name="work" size={20} color="#6B7280" />
            <Text className="text-gray-700 ml-3">
              {expert.experienceYears} years of experience
            </Text>
          </View>
        )}

        {expert.education && (
          <View className="flex-row items-start">
            <MaterialIcons name="school" size={20} color="#6B7280" />
            <Text className="text-gray-700 ml-3 flex-1">
              {expert.education}
            </Text>
          </View>
        )}

        {expert.languages && (
          <View className="flex-row items-start">
            <MaterialIcons name="language" size={20} color="#6B7280" />
            <Text className="text-gray-700 ml-3 flex-1">
              Languages: {expert.languages.join(', ')}
            </Text>
          </View>
        )}
      </View>

      {/* Teaching Philosophy */}
      {expert.teachingPhilosophy && (
        <View className="mt-6 p-4 bg-blue-50 rounded-xl">
          <Text className="text-blue-800 font-semibold mb-2">
            Teaching Philosophy
          </Text>
          <Text className="text-blue-700 text-sm leading-5">
            {expert.teachingPhilosophy}
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * 🖼️ Media Modal Component
 */
const MediaModal = ({ visible, media, onClose }) => {
  if (!media) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={100} className="flex-1 justify-center items-center">
        <View className="bg-white rounded-2xl overflow-hidden m-4 max-w-2xl w-full">
          {/* Header */}
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-800">
              {media.title}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="p-4 items-center">
            {media.type === PORTFOLIO_TYPES.IMAGE && (
              <Image
                source={{ uri: media.url }}
                className="w-full h-80 rounded-lg"
                resizeMode="contain"
              />
            )}

            {media.type === PORTFOLIO_TYPES.VIDEO && (
              <Video
                source={{ uri: media.url }}
                className="w-full h-80 rounded-lg"
                resizeMode="contain"
                useNativeControls
                isLooping
              />
            )}

            {media.type === PORTFOLIO_TYPES.CERTIFICATE && (
              <View className="w-full items-center p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                <MaterialIcons name="verified" size={48} color="#F59E0B" />
                <Text className="text-lg font-bold text-yellow-800 mt-2">
                  Verified Certificate
                </Text>
                <Text className="text-yellow-700 text-center mt-2">
                  {media.description}
                </Text>
              </View>
            )}

            {/* Description */}
            {media.description && (
              <Text className="text-gray-700 mt-4 text-center leading-5">
                {media.description}
              </Text>
            )}
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

/**
 * 🏗️ API Service Functions
 */
const fetchPortfolioData = async (expertId) => {
  try {
    // In production, this would be a real API call
    const response = await fetch(`${process.env.API_BASE_URL}/experts/${expertId}/portfolio`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('API fetch error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// 🏗️ Export with Enterprise Configuration
export default PortfolioViewer;

// 🏗️ Additional Exports for Enterprise Use
export {
  PORTFOLIO_TYPES,
  VERIFICATION_STATUS,
  TIER_CONFIG
};