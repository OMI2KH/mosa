/**
 * 🏢 MOSA FORGE - Enterprise Tribe Community System
 * 👥 Community-Driven Learning & Collaboration Platform
 * 📊 Real-time Engagement & Network Effects
 * 🎯 Peer Support & Knowledge Sharing
 * 🚀 Enterprise-Grade React Native Implementation
 * 
 * @file tribe.js
 * @module TribeCommunityScreen
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, FontAwesome5, Ionicons, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

// 🏗️ Enterprise Components
import TribeCard from '../../components/tribe/TribeCard';
import CommunityPost from '../../components/tribe/CommunityPost';
import ExpertSpotlight from '../../components/tribe/ExpertSpotlight';
import AchievementBadge from '../../components/tribe/AchievementBadge';
import LiveSessionCard from '../../components/tribe/LiveSessionCard';

// 🎯 Enterprise Hooks
import useTribeState from '../../hooks/useTribeState';
import useCommunityAnalytics from '../../hooks/useCommunityAnalytics';
import useRealTimeUpdates from '../../hooks/useRealTimeUpdates';

// 💾 Enterprise Services
import TribeService from '../../services/tribe-service';
import NotificationService from '../../services/notification-service';
import AnalyticsService from '../../services/analytics-service';

// 🎨 Design System
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Spacing from '../../constants/Spacing';
import { Shadows, Gradients } from '../../constants/Styles';

const { width, height } = Dimensions.get('window');

const TribeCommunityScreen = () => {
  const navigation = useNavigation();
  
  // 🎯 State Management
  const [activeTab, setActiveTab] = useState('feed');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  
  // 📊 Animation States
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(height * 0.1))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];
  
  // 🏗️ Enterprise Hooks
  const {
    tribeData,
    communityPosts,
    liveSessions,
    expertSpotlights,
    achievements,
    userStats,
    loading: tribeLoading,
    error: tribeError,
    refreshTribeData,
    createPost,
    joinTribe,
    leaveTribe,
    upvotePost,
    commentOnPost,
    sharePost,
    joinLiveSession,
    followExpert
  } = useTribeState();

  const {
    communityMetrics,
    engagementTrends,
    topContributors,
    trendingTopics,
    updateAnalytics
  } = useCommunityAnalytics();

  const { realTimeUpdates, subscribeToUpdates, unsubscribeFromUpdates } = useRealTimeUpdates();

  // 🎯 Tab Configuration
  const tabs = [
    { id: 'feed', label: 'Feed', icon: 'home', color: Colors.primary },
    { id: 'tribes', label: 'Tribes', icon: 'people', color: Colors.secondary },
    { id: 'sessions', label: 'Live', icon: 'video', color: Colors.accent },
    { id: 'experts', label: 'Experts', icon: 'star', color: Colors.warning },
    { id: 'achievements', label: 'Badges', icon: 'award', color: Colors.success }
  ];

  // 📊 Initial Data Load
  useEffect(() => {
    loadInitialData();
    
    // 🎯 Subscribe to real-time updates
    subscribeToUpdates('tribe_updates', handleRealTimeUpdate);
    
    // 📈 Track screen view analytics
    AnalyticsService.trackScreenView('TribeCommunity', {
      userType: 'student',
      timestamp: new Date().toISOString()
    });

    return () => {
      unsubscribeFromUpdates('tribe_updates');
    };
  }, []);

  // 🎨 Animation Effects
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // 🔄 Focus Effect for Updates
  useFocusEffect(
    useCallback(() => {
      updateAnalytics();
      return () => {};
    }, [])
  );

  /**
   * 📊 LOAD INITIAL DATA
   */
  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // 🎯 Parallel data loading for performance
      await Promise.all([
        refreshTribeData(),
        updateAnalytics()
      ]);

      // 📈 Send load success analytics
      AnalyticsService.trackEvent('TribeLoadSuccess', {
        loadTime: Date.now(),
        dataPoints: communityPosts.length + liveSessions.length + expertSpotlights.length
      });

    } catch (error) {
      console.error('Tribe data load failed:', error);
      
      AnalyticsService.trackError('TribeLoadFailed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });

    } finally {
      setLoading(false);
    }
  };

  /**
   * 🔄 HANDLE REFRESH
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshTribeData();
      
      // 🎯 Send refresh analytics
      AnalyticsService.trackEvent('TribeRefresh', {
        timestamp: new Date().toISOString(),
        activeTab
      });

    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  /**
   * 🔔 HANDLE REAL-TIME UPDATE
   */
  const handleRealTimeUpdate = (update) => {
    switch (update.type) {
      case 'new_post':
        // 🎯 Show notification for new post
        NotificationService.showNotification({
          title: 'New Community Post',
          message: `${update.data.author} posted in ${update.data.tribe}`,
          type: 'info'
        });
        break;
      
      case 'live_session_started':
        // 🎯 Show notification for live session
        NotificationService.showNotification({
          title: 'Live Session Started',
          message: `${update.data.expert} started a live session`,
          type: 'warning',
          action: () => joinLiveSession(update.data.sessionId)
        });
        break;
      
      case 'expert_joined':
        // 🎯 Show notification for expert joining
        NotificationService.showNotification({
          title: 'Expert Joined Tribe',
          message: `${update.data.expertName} joined ${update.data.tribeName}`,
          type: 'success'
        });
        break;
    }
  };

  /**
   * 📝 CREATE NEW POST
   */
  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;

    try {
      const postData = {
        content: newPostContent,
        tribeId: tribeData?.id || 'general',
        tags: extractHashtags(newPostContent),
        mentions: extractMentions(newPostContent),
        media: [] // Add media upload functionality
      };

      const newPost = await createPost(postData);
      
      // 🎯 Analytics tracking
      AnalyticsService.trackEvent('PostCreated', {
        postId: newPost.id,
        tribeId: postData.tribeId,
        contentLength: newPostContent.length,
        hasTags: postData.tags.length > 0,
        hasMentions: postData.mentions.length > 0
      });

      // 🔄 Reset and close modal
      setNewPostContent('');
      setShowNewPostModal(false);

      // 📈 Send success notification
      NotificationService.showNotification({
        title: 'Post Created',
        message: 'Your post has been shared with the community',
        type: 'success'
      });

    } catch (error) {
      console.error('Post creation failed:', error);
      
      NotificationService.showNotification({
        title: 'Post Failed',
        message: 'Unable to create post. Please try again.',
        type: 'error'
      });
    }
  };

  /**
   * 🔍 EXTRACT HASHTAGS FROM TEXT
   */
  const extractHashtags = (text) => {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  };

  /**
   * 👥 EXTRACT MENTIONS FROM TEXT
   */
  const extractMentions = (text) => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(mention => mention.substring(1)) : [];
  };

  /**
   * 🎯 JOIN TRIBE
   */
  const handleJoinTribe = async (tribeId) => {
    try {
      await joinTribe(tribeId);
      
      AnalyticsService.trackEvent('TribeJoined', {
        tribeId,
        timestamp: new Date().toISOString()
      });

      NotificationService.showNotification({
        title: 'Tribe Joined',
        message: 'Welcome to the tribe! Start engaging with the community.',
        type: 'success'
      });

    } catch (error) {
      console.error('Join tribe failed:', error);
    }
  };

  /**
   * ⭐ UPVOTE POST
   */
  const handleUpvotePost = async (postId) => {
    try {
      await upvotePost(postId);
      
      AnalyticsService.trackEvent('PostUpvoted', {
        postId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Upvote failed:', error);
    }
  };

  /**
   * 💬 COMMENT ON POST
   */
  const handleCommentPost = async (postId, comment) => {
    try {
      await commentOnPost(postId, comment);
      
      AnalyticsService.trackEvent('PostCommented', {
        postId,
        commentLength: comment.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Comment failed:', error);
    }
  };

  /**
   * 📤 SHARE POST
   */
  const handleSharePost = async (postId) => {
    try {
      await sharePost(postId);
      
      AnalyticsService.trackEvent('PostShared', {
        postId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  /**
   * 🎥 JOIN LIVE SESSION
   */
  const handleJoinLiveSession = async (sessionId) => {
    try {
      await joinLiveSession(sessionId);
      
      AnalyticsService.trackEvent('LiveSessionJoined', {
        sessionId,
        timestamp: new Date().toISOString()
      });

      // 🚀 Navigate to live session screen
      navigation.navigate('LiveSession', { sessionId });

    } catch (error) {
      console.error('Join session failed:', error);
    }
  };

  /**
   * 👨‍🏫 FOLLOW EXPERT
   */
  const handleFollowExpert = async (expertId) => {
    try {
      await followExpert(expertId);
      
      AnalyticsService.trackEvent('ExpertFollowed', {
        expertId,
        timestamp: new Date().toISOString()
      });

      NotificationService.showNotification({
        title: 'Expert Followed',
        message: 'You will receive updates from this expert',
        type: 'success'
      });

    } catch (error) {
      console.error('Follow expert failed:', error);
    }
  };

  /**
   * 🎨 RENDER TAB CONTENT
   */
  const renderTabContent = () => {
    switch (activeTab) {
      case 'feed':
        return renderFeedContent();
      case 'tribes':
        return renderTribesContent();
      case 'sessions':
        return renderSessionsContent();
      case 'experts':
        return renderExpertsContent();
      case 'achievements':
        return renderAchievementsContent();
      default:
        return renderFeedContent();
    }
  };

  /**
   * 📰 RENDER FEED CONTENT
   */
  const renderFeedContent = () => (
    <Animated.View 
      style={[
        styles.tabContent,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      {/* 🔍 Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={24} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts, topics, or experts..."
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.filterButton}>
          <Feather name="filter" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* 📊 Community Metrics */}
      <View style={styles.metricsContainer}>
        <LinearGradient
          colors={Gradients.primary}
          style={styles.metricsCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{communityMetrics?.totalPosts || 0}</Text>
            <Text style={styles.metricLabel}>Posts</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{communityMetrics?.activeMembers || 0}</Text>
            <Text style={styles.metricLabel}>Members</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{communityMetrics?.engagementRate || '0%'}</Text>
            <Text style={styles.metricLabel}>Engagement</Text>
          </View>
        </LinearGradient>
      </View>

      {/* 📝 Community Posts */}
      <FlatList
        data={communityPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CommunityPost
            post={item}
            onUpvote={() => handleUpvotePost(item.id)}
            onComment={() => navigation.navigate('PostDetail', { postId: item.id })}
            onShare={() => handleSharePost(item.id)}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.postsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons name="forum" size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>No Posts Yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Be the first to share your learning journey!
            </Text>
          </View>
        }
      />
    </Animated.View>
  );

  /**
   * 👥 RENDER TRIBES CONTENT
   */
  const renderTribesContent = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      {/* 🎯 My Tribes */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Tribes</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={tribeData?.userTribes || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TribeCard
            tribe={item}
            onJoin={() => handleJoinTribe(item.id)}
            onLeave={() => leaveTribe(item.id)}
            isMember={item.isMember}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tribesList}
      />

      {/* 🔍 Discover Tribes */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Discover Tribes</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tribeData?.suggestedTribes || []}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <View style={styles.tribeGridItem}>
            <TribeCard
              tribe={item}
              onJoin={() => handleJoinTribe(item.id)}
              compact
            />
          </View>
        )}
        columnWrapperStyle={styles.tribeGrid}
        showsVerticalScrollIndicator={false}
      />
    </Animated.View>
  );

  /**
   * 🎥 RENDER SESSIONS CONTENT
   */
  const renderSessionsContent = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      {/* 🎯 Live Now */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Live Now</Text>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <FlatList
        horizontal
        data={liveSessions?.filter(s => s.isLive) || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LiveSessionCard
            session={item}
            onJoin={() => handleJoinLiveSession(item.id)}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sessionsList}
      />

      {/* ⏰ Upcoming Sessions */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={liveSessions?.filter(s => !s.isLive) || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LiveSessionCard
            session={item}
            onJoin={() => handleJoinLiveSession(item.id)}
            upcoming
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.upcomingList}
      />
    </Animated.View>
  );

  /**
   * 👨‍🏫 RENDER EXPERTS CONTENT
   */
  const renderExpertsContent = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      {/* ⭐ Featured Experts */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured Experts</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        horizontal
        data={expertSpotlights}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExpertSpotlight
            expert={item}
            onFollow={() => handleFollowExpert(item.id)}
            onMessage={() => navigation.navigate('Chat', { expertId: item.id })}
            isFollowing={item.isFollowing}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.expertsList}
      />

      {/* 🏆 Top Contributors */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Top Contributors</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>This Week</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={topContributors}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.contributorCard}>
            <View style={styles.contributorRank}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <Image
              source={{ uri: item.avatar }}
              style={styles.contributorAvatar}
            />
            <View style={styles.contributorInfo}>
              <Text style={styles.contributorName}>{item.name}</Text>
              <Text style={styles.contributorRole}>{item.role}</Text>
              <View style={styles.contributorStats}>
                <View style={styles.statItem}>
                  <MaterialIcons name="forum" size={16} color={Colors.textSecondary} />
                  <Text style={styles.statText}>{item.posts}</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialIcons name="thumb-up" size={16} color={Colors.textSecondary} />
                  <Text style={styles.statText}>{item.upvotes}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.followButton}>
              <Text style={styles.followButtonText}>
                {item.isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contributorsList}
      />
    </Animated.View>
  );

  /**
   * 🏆 RENDER ACHIEVEMENTS CONTENT
   */
  const renderAchievementsContent = () => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      {/* 🎯 My Achievements */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Achievements</Text>
        <Text style={styles.achievementCount}>
          {achievements?.earned?.length || 0} of {achievements?.total || 0}
        </Text>
      </View>

      <View style={styles.achievementsGrid}>
        {achievements?.earned?.map((badge) => (
          <AchievementBadge
            key={badge.id}
            badge={badge}
            earned
            onPress={() => navigation.navigate('BadgeDetail', { badgeId: badge.id })}
          />
        ))}
      </View>

      {/* 🎯 Available Achievements */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Achievements</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={achievements?.available || []}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <AchievementBadge
            badge={item}
            earned={false}
            onPress={() => navigation.navigate('BadgeDetail', { badgeId: item.id })}
          />
        )}
        columnWrapperStyle={styles.achievementGrid}
        showsVerticalScrollIndicator={false}
      />
    </Animated.View>
  );

  /**
   * 🎨 RENDER LOADING STATE
   */
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>Loading Community...</Text>
    </View>
  );

  /**
   * 🎨 RENDER ERROR STATE
   */
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <MaterialIcons name="error-outline" size={64} color={Colors.error} />
      <Text style={styles.errorTitle}>Unable to Load Community</Text>
      <Text style={styles.errorMessage}>
        {tribeError || 'Please check your connection and try again'}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={loadInitialData}
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* 🎯 Header */}
      <BlurView intensity={90} tint="light" style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Image
              source={{ uri: userStats?.avatar || 'https://via.placeholder.com/40' }}
              style={styles.profileAvatar}
            />
            <View>
              <Text style={styles.greetingText}>Welcome back,</Text>
              <Text style={styles.userName}>{userStats?.name || 'Student'}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color={Colors.textPrimary} />
              {userStats?.unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>
                    {userStats.unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>

      {/* 🎯 Tabs Navigation */}
      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          data={tabs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === item.id && styles.activeTabButton
              ]}
              onPress={() => setActiveTab(item.id)}
            >
              <MaterialIcons
                name={item.icon}
                size={20}
                color={activeTab === item.id ? Colors.white : Colors.textSecondary}
              />
              <Text style={[
                styles.tabText,
                activeTab === item.id && styles.activeTabText
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsList}
        />
      </View>

      {/* 📱 Main Content */}
      {loading ? renderLoadingState() : 
       tribeError ? renderErrorState() : 
       renderTabContent()}

      {/* ➕ New Post FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNewPostModal(true)}
      >
        <LinearGradient
          colors={Gradients.accent}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Feather name="edit-2" size={24} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      {/* 📝 New Post Modal */}
      {showNewPostModal && (
        <BlurView intensity={90} tint="dark" style={styles.modalOverlay}>
          <Animated.View style={[
            styles.modalContent,
            { transform: [{ translateY: slideAnim }] }
          ]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Post</Text>
              <TouchableOpacity
                onPress={() => setShowNewPostModal(false)}
              >
                <Feather name="x" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.postInput}
              placeholder="What's on your mind?"
              placeholderTextColor={Colors.textSecondary}
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
              maxLength={1000}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowNewPostModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.postButton,
                  !newPostContent.trim() && styles.postButtonDisabled
                ]}
                onPress={handleCreatePost}
                disabled={!newPostContent.trim()}
              >
                <Text style={styles.postButtonText}>Post</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </BlurView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  greetingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  userName: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    padding: Spacing.xs,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationCount: {
    ...Typography.caption,
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  tabsContainer: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabsList: {
    paddingHorizontal: Spacing.sm,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.xs,
    borderRadius: 20,
    marginVertical: Spacing.xs,
  },
  activeTabButton: {
    backgroundColor: Colors.primary,
    ...Shadows.small,
  },
  tabText: {
    ...Typography.body,
    marginLeft: Spacing.xs,
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: Colors.white,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginVertical: Spacing.md,
    ...Shadows.small,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    ...Typography.body,
    color: Colors.textPrimary,
  },
  filterButton: {
    padding: Spacing.xs,
  },
  metricsContainer: {
    marginBottom: Spacing.lg,
  },
  metricsCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: Spacing.lg,
    ...Shadows.medium,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    ...Typography.h3,
    color: Colors.white,
    fontWeight: 'bold',
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    height: '80%',
    backgroundColor: Colors.white,
    opacity: 0.3,
  },
  postsList: {
    paddingBottom: Spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyStateTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptyStateSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  seeAllText: {
    ...Typography.caption,
    color: Colors.primary,
  },
  tribesList: {
    paddingVertical: Spacing.sm,
  },
  tribeGridItem: {
    flex: 1,
    margin: Spacing.xs,
  },
  tribeGrid: {
    justifyContent: 'space-between',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
    marginRight: 4,
  },
  liveText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: 'bold',
  },
  sessionsList: {
    paddingVertical: Spacing.sm,
  },
  upcomingList: {
    paddingBottom: Spacing.xl,
  },
  expertsList: {
    paddingVertical: Spacing.sm,
  },
  contributorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.small,
  },
  contributorRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  rankText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  contributorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: Spacing.md,
  },
  contributorInfo: {
    flex: 1,
  },
  contributorName: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  contributorRole: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  contributorStats: {
    flexDirection: 'row',
    marginTop: Spacing.xs,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  statText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  followButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  followButtonText: {
    ...Typography.caption,
    color: Colors.white,
    fontWeight: '600',
  },
  contributorsList: {
    paddingBottom: Spacing.xl,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  achievementCount: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  achievementGrid: {
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    ...Typography.h4,
    color: Colors.error,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  retryButtonText: {
    ...Typography.subtitle,
    color: Colors.white,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    ...Shadows.large,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    ...Shadows.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  postInput: {
    minHeight: 120,
    ...Typography.body,
    color: Colors.textPrimary,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.lg,
  },
  cancelButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginRight: Spacing.md,
  },
  cancelButtonText: {
    ...Typography.subtitle,
    color: Colors.textSecondary,
  },
  postButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  postButtonDisabled: {
    backgroundColor: Colors.textSecondary + '40',
  },
  postButtonText: {
    ...Typography.subtitle,
    color: Colors.white,
    fontWeight: '600',
  },
});

export default TribeCommunityScreen;