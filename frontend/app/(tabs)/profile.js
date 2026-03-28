/**
 * 🏢 MOSA FORGE - Enterprise Profile Management System
 * 👤 User Profile, Settings & Account Management
 * 📊 Performance Analytics & Achievement Tracking
 * 🔐 Security & Privacy Controls
 * 🚀 React Native with Expo Router
 * 
 * @module ProfileScreen
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Platform,
  StatusBar
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRouter
} from 'expo-router';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import {
  MaterialCommunityIcons,
  FontAwesome5,
  Ionicons,
  Feather,
  AntDesign
} from '@expo/vector-icons';

// 🏗️ Enterprise Dependencies
import EnterpriseLogger from '../../utils/enterprise-logger';
import SecureStorage from '../../utils/secure-storage';
import API from '../../services/api';
import AuthContext from '../../contexts/auth-context';
import Analytics from '../../utils/analytics';

// 🎨 Design System Components
import {
  Colors,
  Typography,
  Spacing,
  Shadows,
  Gradients
} from '../../design-system';
import {
  Card,
  Button,
  Input,
  Switch,
  ProgressBar,
  Badge,
  Avatar,
  Divider,
  Skeleton,
  Modal,
  Toast
} from '../../components';

const logger = new EnterpriseLogger({
  service: 'profile-screen',
  module: 'frontend-app'
});

/**
 * 🏢 ENTERPRISE PROFILE SCREEN COMPONENT
 */
const ProfileScreen = () => {
  // 🎯 Navigation & Routing
  const navigation = useNavigation();
  const router = useRouter();

  // 🏗️ State Management
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  // 🎨 Animation Values
  const scrollY = useSharedValue(0);
  const headerOpacity = useSharedValue(1);
  const profileScale = useSharedValue(1);

  // 🔐 Context
  const { user, logout, updateProfile } = React.useContext(AuthContext);

  /**
   * 📊 FETCH USER PROFILE DATA
   */
  const fetchUserProfile = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const response = await API.profile.getUserProfile({
        include: [
          'enrollments',
          'achievements',
          'notifications',
          'payment_history',
          'quality_metrics'
        ]
      });

      if (response.success) {
        setUserData(response.data);
        
        // 📈 Track Profile View
        await Analytics.trackEvent('profile_viewed', {
          user_id: response.data.id,
          timestamp: new Date().toISOString()
        });

        logger.info('User profile fetched successfully', {
          userId: response.data.id,
          enrollments: response.data.enrollments?.length || 0
        });
      } else {
        throw new Error(response.message || 'Failed to fetch profile');
      }

    } catch (error) {
      logger.error('Profile data fetch failed', {
        error: error.message,
        userId: user?.id
      });

      Toast.show({
        type: 'error',
        title: 'Profile Error',
        message: 'Failed to load profile data. Please try again.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  /**
   * 🔄 REFRESH HANDLER
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserProfile(true);
  }, [fetchUserProfile]);

  /**
   * 🏗️ INITIAL DATA LOADING
   */
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();

      // 📊 Track Screen View
      Analytics.trackScreenView('profile_screen');

      return () => {
        // 🧹 Cleanup animations
        scrollY.value = 0;
      };
    }, [fetchUserProfile])
  );

  /**
   * 🎨 ANIMATED HEADER STYLE
   */
  const animatedHeaderStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0.8],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [0, 100],
      [0, -20],
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }]
    };
  });

  /**
   * 🎨 ANIMATED PROFILE STYLE
   */
  const animatedProfileStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0.9],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale }]
    };
  });

  /**
   * 🔓 HANDLE LOGOUT
   */
  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // 📊 Track Logout
              await Analytics.trackEvent('user_logged_out', {
                userId: user?.id,
                timestamp: new Date().toISOString()
              });

              // 🔐 Secure Logout
              await logout();
              
              // 🚀 Navigate to Auth
              router.replace('/(auth)/login');
              
            } catch (error) {
              logger.error('Logout failed', {
                error: error.message,
                userId: user?.id
              });
              
              Toast.show({
                type: 'error',
                title: 'Logout Failed',
                message: 'Unable to logout. Please try again.'
              });
            }
          }
        }
      ]
    );
  };

  /**
   * 🔐 HANDLE SECURITY SETTINGS
   */
  const handleSecuritySettings = () => {
    setShowSecurityModal(true);
  };

  /**
   * 📱 HANDLE MENU ITEM PRESS
   */
  const handleMenuItemPress = (item) => {
    switch (item.id) {
      case 'edit_profile':
        setShowEditProfile(true);
        break;
      case 'security':
        handleSecuritySettings();
        break;
      case 'notifications':
        router.push('/(tabs)/notifications');
        break;
      case 'payment_methods':
        router.push('/payment/methods');
        break;
      case 'help_support':
        router.push('/help-support');
        break;
      case 'terms_privacy':
        router.push('/terms-privacy');
        break;
      default:
        logger.warn('Unknown menu item pressed', { itemId: item.id });
    }
  };

  /**
   * 🎯 RENDER PROFILE HEADER
   */
  const renderProfileHeader = () => {
    if (loading) {
      return (
        <Animated.View 
          style={[styles.profileHeader, animatedProfileStyle]}
          entering={FadeIn.duration(500)}
        >
          <Skeleton width={120} height={120} borderRadius={60} />
          <Skeleton width={200} height={24} style={{ marginTop: 16 }} />
          <Skeleton width={150} height={18} style={{ marginTop: 8 }} />
        </Animated.View>
      );
    }

    return (
      <Animated.View 
        style={[styles.profileHeader, animatedProfileStyle]}
        entering={FadeIn.duration(500)}
      >
        {/* 🎨 Profile Avatar with Gradient Border */}
        <View style={styles.avatarContainer}>
          <Avatar
            size={120}
            source={userData?.profile_picture ? { uri: userData.profile_picture } : null}
            name={userData?.full_name || user?.full_name}
            fallbackColor={Colors.primary}
            gradientBorder={Gradients.primary}
            showBadge={userData?.is_verified}
            badgeIcon="checkmark-circle"
            badgeColor={Colors.success}
          />
          
          {/* 🎯 Edit Profile Button */}
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => setShowEditProfile(true)}
          >
            <Feather name="edit-2" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>

        {/* 👤 User Information */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {userData?.full_name || user?.full_name || 'User'}
          </Text>
          <Text style={styles.userEmail}>
            {userData?.email || user?.email || 'user@example.com'}
          </Text>
          
          {/* 🆔 User ID Badge */}
          <View style={styles.userIdBadge}>
            <Text style={styles.userIdText}>
              ID: {userData?.fayda_id || user?.fayda_id || 'N/A'}
            </Text>
            {userData?.is_verified && (
              <MaterialCommunityIcons
                name="shield-check"
                size={16}
                color={Colors.success}
                style={{ marginLeft: 6 }}
              />
            )}
          </View>
        </View>

        {/* 📊 Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {userData?.active_enrollments || 0}
            </Text>
            <Text style={styles.statLabel}>Active Courses</Text>
          </View>
          <Divider orientation="vertical" height={40} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {userData?.completed_courses || 0}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <Divider orientation="vertical" height={40} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {userData?.total_earnings ? `ETB ${userData.total_earnings}` : 'ETB 0'}
            </Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  /**
   * 📊 RENDER PERFORMANCE METRICS
   */
  const renderPerformanceMetrics = () => {
    if (!userData?.performance_metrics) return null;

    const metrics = userData.performance_metrics;

    return (
      <Animated.View
        style={styles.performanceSection}
        entering={FadeInDown.duration(600).delay(200)}
      >
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="chart-line"
            size={24}
            color={Colors.primary}
          />
          <Text style={styles.sectionTitle}>Performance Metrics</Text>
        </View>

        <View style={styles.metricsGrid}>
          {/* 🎯 Completion Rate */}
          <Card style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Completion Rate</Text>
              <Badge
                variant={metrics.completion_rate >= 80 ? 'success' : 'warning'}
                size="small"
              >
                {metrics.completion_rate}%
              </Badge>
            </View>
            <ProgressBar
              progress={metrics.completion_rate / 100}
              color={metrics.completion_rate >= 80 ? Colors.success : Colors.warning}
              height={8}
            />
            <Text style={styles.metricDescription}>
              {metrics.completion_rate >= 80
                ? 'Excellent completion rate!'
                : 'Keep pushing to complete courses!'}
            </Text>
          </Card>

          {/* ⭐ Quality Score */}
          <Card style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Quality Score</Text>
              <View style={styles.starRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= Math.floor(metrics.quality_score) ? 'star' : 'star-outline'}
                    size={16}
                    color={Colors.warning}
                  />
                ))}
              </View>
            </View>
            <Text style={styles.metricValue}>{metrics.quality_score.toFixed(1)}/5.0</Text>
            <Text style={styles.metricDescription}>
              Based on expert feedback and course performance
            </Text>
          </Card>

          {/* 📈 Learning Progress */}
          <Card style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Learning Progress</Text>
              <Badge
                variant={metrics.learning_progress >= 70 ? 'success' : 'info'}
                size="small"
              >
                {metrics.learning_progress}%
              </Badge>
            </View>
            <ProgressBar
              progress={metrics.learning_progress / 100}
              color={Colors.primary}
              height={8}
              showPercentage
            />
            <Text style={styles.metricDescription}>
              Overall progress across all enrolled courses
            </Text>
          </Card>

          {/* 🏆 Achievements */}
          <Card style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricTitle}>Achievements</Text>
              <Badge variant="primary" size="small">
                {userData?.achievements?.length || 0}
              </Badge>
            </View>
            <View style={styles.achievementsPreview}>
              {userData?.achievements?.slice(0, 3).map((achievement, index) => (
                <View key={index} style={styles.achievementBadge}>
                  <MaterialCommunityIcons
                    name={achievement.icon || 'trophy'}
                    size={20}
                    color={Colors.primary}
                  />
                </View>
              ))}
            </View>
            <Text style={styles.metricDescription}>
              {userData?.achievements?.length || 0} badges earned
            </Text>
          </Card>
        </View>
      </Animated.View>
    );
  };

  /**
   * 📋 RENDER MENU ITEMS
   */
  const renderMenuItems = () => {
    const menuItems = [
      {
        id: 'enrollments',
        title: 'My Enrollments',
        description: 'View all your courses and progress',
        icon: 'book-open',
        iconType: 'feather',
        color: Colors.primary,
        route: '/(tabs)/enrollments'
      },
      {
        id: 'payment_history',
        title: 'Payment History',
        description: 'View all transactions and invoices',
        icon: 'credit-card',
        iconType: 'feather',
        color: Colors.success,
        route: '/payment/history'
      },
      {
        id: 'certificates',
        title: 'My Certificates',
        description: 'Download and share your certificates',
        icon: 'award',
        iconType: 'feather',
        color: Colors.warning,
        route: '/certificates'
      },
      {
        id: 'settings',
        title: 'Account Settings',
        description: 'Manage your account preferences',
        icon: 'settings',
        iconType: 'feather',
        color: Colors.info,
        route: '/settings'
      },
      {
        id: 'security',
        title: 'Security',
        description: 'Change password, 2FA, and security settings',
        icon: 'shield',
        iconType: 'feather',
        color: Colors.error,
        action: handleSecuritySettings
      },
      {
        id: 'help_support',
        title: 'Help & Support',
        description: 'FAQs, contact support, and guides',
        icon: 'help-circle',
        iconType: 'feather',
        color: Colors.secondary,
        route: '/help-support'
      }
    ];

    return (
      <Animated.View
        style={styles.menuSection}
        entering={FadeInUp.duration(600).delay(400)}
      >
        <View style={styles.sectionHeader}>
          <Feather name="grid" size={24} color={Colors.primary} />
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>

        <View style={styles.menuGrid}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => {
                if (item.route) {
                  router.push(item.route);
                } else if (item.action) {
                  item.action();
                }
                
                // 📊 Track Menu Item Click
                Analytics.trackEvent('profile_menu_item_clicked', {
                  item_id: item.id,
                  item_title: item.title
                });
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                {item.iconType === 'feather' ? (
                  <Feather name={item.icon} size={24} color={item.color} />
                ) : (
                  <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
                )}
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.gray400} />
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  };

  /**
   * 🔐 RENDER SECURITY MODAL
   */
  const renderSecurityModal = () => {
    const securityOptions = [
      {
        id: 'change_password',
        title: 'Change Password',
        description: 'Update your account password',
        icon: 'lock',
        action: () => router.push('/security/change-password')
      },
      {
        id: 'two_factor',
        title: 'Two-Factor Authentication',
        description: 'Add an extra layer of security',
        icon: 'shield',
        action: () => router.push('/security/two-factor')
      },
      {
        id: 'session_management',
        title: 'Active Sessions',
        description: 'Manage your logged-in devices',
        icon: 'monitor',
        action: () => router.push('/security/sessions')
      },
      {
        id: 'privacy_settings',
        title: 'Privacy Settings',
        description: 'Control your data and privacy',
        icon: 'eye-off',
        action: () => router.push('/security/privacy')
      }
    ];

    return (
      <Modal
        visible={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        title="Security Settings"
        showCloseButton
      >
        <ScrollView style={styles.modalContent}>
          {securityOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.securityOption}
              onPress={() => {
                option.action();
                setShowSecurityModal(false);
                
                Analytics.trackEvent('security_option_selected', {
                  option_id: option.id,
                  option_title: option.title
                });
              }}
              activeOpacity={0.7}
            >
              <View style={styles.securityOptionIcon}>
                <Feather name={option.icon} size={24} color={Colors.primary} />
              </View>
              <View style={styles.securityOptionContent}>
                <Text style={styles.securityOptionTitle}>{option.title}</Text>
                <Text style={styles.securityOptionDescription}>
                  {option.description}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.gray400} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Modal>
    );
  };

  /**
   * ✏️ RENDER EDIT PROFILE MODAL
   */
  const renderEditProfileModal = () => {
    const [formData, setFormData] = useState({
      full_name: userData?.full_name || '',
      phone_number: userData?.phone_number || '',
      bio: userData?.bio || ''
    });

    const [updating, setUpdating] = useState(false);

    const handleUpdateProfile = async () => {
      try {
        setUpdating(true);
        
        const response = await API.profile.updateProfile(formData);
        
        if (response.success) {
          setUserData(prev => ({ ...prev, ...formData }));
          setShowEditProfile(false);
          
          Toast.show({
            type: 'success',
            title: 'Profile Updated',
            message: 'Your profile has been updated successfully.'
          });
          
          Analytics.trackEvent('profile_updated', {
            fields_updated: Object.keys(formData)
          });
        } else {
          throw new Error(response.message);
        }
      } catch (error) {
        logger.error('Profile update failed', {
          error: error.message,
          formData
        });
        
        Toast.show({
          type: 'error',
          title: 'Update Failed',
          message: 'Failed to update profile. Please try again.'
        });
      } finally {
        setUpdating(false);
      }
    };

    return (
      <Modal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        title="Edit Profile"
        showCloseButton
        actionButtons={[
          {
            label: 'Cancel',
            variant: 'outline',
            onPress: () => setShowEditProfile(false)
          },
          {
            label: 'Save Changes',
            variant: 'primary',
            onPress: handleUpdateProfile,
            loading: updating,
            disabled: updating
          }
        ]}
      >
        <ScrollView style={styles.modalContent}>
          {/* 👤 Profile Picture Upload */}
          <TouchableOpacity style={styles.uploadAvatarContainer}>
            <Avatar
              size={100}
              source={userData?.profile_picture ? { uri: userData.profile_picture } : null}
              name={formData.full_name}
              fallbackColor={Colors.primary}
            />
            <View style={styles.uploadOverlay}>
              <Feather name="camera" size={24} color={Colors.white} />
            </View>
          </TouchableOpacity>

          {/* 📝 Form Fields */}
          <View style={styles.formGroup}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.full_name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, full_name: text }))}
              leftIcon={<Feather name="user" size={20} color={Colors.gray400} />}
            />
          </View>

          <View style={styles.formGroup}>
            <Input
              label="Phone Number"
              placeholder="Enter your phone number"
              value={formData.phone_number}
              onChangeText={(text) => setFormData(prev => ({ ...prev, phone_number: text }))}
              keyboardType="phone-pad"
              leftIcon={<Feather name="phone" size={20} color={Colors.gray400} />}
            />
          </View>

          <View style={styles.formGroup}>
            <Input
              label="Bio"
              placeholder="Tell us about yourself"
              value={formData.bio}
              onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
              multiline
              numberOfLines={4}
              leftIcon={<Feather name="edit" size={20} color={Colors.gray400} />}
            />
          </View>
        </ScrollView>
      </Modal>
    );
  };

  /**
   * 🎨 MAIN RENDER
   */
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {/* 🎨 Animated Header */}
      <Animated.View style={[styles.header, animatedHeaderStyle]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleLogout}
          >
            <Feather name="log-out" size={24} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* 📜 Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          scrollY.value = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* 🎯 Profile Header */}
        {renderProfileHeader()}

        {/* 📊 Performance Metrics */}
        {renderPerformanceMetrics()}

        {/* 📋 Menu Items */}
        {renderMenuItems()}

        {/* ℹ️ App Info */}
        <View style={styles.appInfoSection}>
          <Text style={styles.appVersion}>
            Mosa Forge v2.0.0
          </Text>
          <Text style={styles.appCopyright}>
            © 2024 Chereka. All rights reserved.
          </Text>
          <Text style={styles.appPoweredBy}>
            Powered by Oumer Muktar
          </Text>
        </View>

        {/* 📱 Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* 🔐 Security Modal */}
      {renderSecurityModal()}

      {/* ✏️ Edit Profile Modal */}
      {renderEditProfileModal()}
    </SafeAreaView>
  );
};

/**
 * 🎨 ENTERPRISE STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
    ...Shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  headerButton: {
    padding: Spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  editProfileButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  userName: {
    ...Typography.h3,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  userEmail: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  userIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Spacing.sm,
  },
  userIdText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: Colors.gray50,
    paddingVertical: Spacing.md,
    borderRadius: Spacing.lg,
    marginTop: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...Typography.h4,
    color: Colors.primary,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  performanceSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.white,
    marginTop: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h5,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.xs,
  },
  metricCard: {
    width: '50%',
    padding: Spacing.sm,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  metricTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  metricValue: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginVertical: Spacing.xs,
  },
  metricDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  starRating: {
    flexDirection: 'row',
  },
  achievementsPreview: {
    flexDirection: 'row',
    marginVertical: Spacing.sm,
  },
  achievementBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  menuSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.white,
    marginTop: Spacing.md,
  },
  menuGrid: {
    marginTop: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  menuDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  modalContent: {
    maxHeight: 500,
  },
  securityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  securityOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  securityOptionContent: {
    flex: 1,
  },
  securityOptionTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  securityOptionDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  uploadAvatarContainer: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: Spacing.lg,
  },
  uploadOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.xs,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  appInfoSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    marginTop: Spacing.md,
  },
  appVersion: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  appCopyright: {
    ...Typography.caption,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
  },
  appPoweredBy: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: Spacing.xxl,
  },
});

export default ProfileScreen;