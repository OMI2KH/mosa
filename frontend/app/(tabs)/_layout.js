/**
 * 🏢 MOSA FORGE - Enterprise Tab Navigation Layout
 * 📱 Main Navigation Structure for Mobile Application
 * 🎯 User Role-Based Tab Visibility & Access Control
 * 🔄 Dynamic Tab Management & State Persistence
 * 🚀 React Native Enterprise Architecture
 * 
 * @module TabLayout
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, Platform, BackHandler } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  useSharedValue,
  interpolate,
  runOnJS
} from 'react-native-reanimated';

// 🏗️ Enterprise Dependencies
import { useAuth } from '../../../contexts/auth-context';
import { useQuality } from '../../../contexts/quality-context';
import { usePayment } from '../../../contexts/payment-context';
import { useLearning } from '../../../contexts/learning-context';
import EnterpriseLogger from '../../../utils/enterprise-logger';
import NotificationManager from '../../../utils/notification-manager';

// 🎯 Tab Screens
import HomeScreen from './home';
import LearningScreen from './learning';
import ExpertScreen from './expert';
import ProfileScreen from './profile';
import AdminScreen from './admin';

// 📊 Icons (Using Expo Icons for Enterprise)
import { 
  Home as HomeIcon,
  BookOpen as LearningIcon,
  Users as ExpertIcon,
  User as ProfileIcon,
  Shield as AdminIcon,
  Bell as NotificationIcon,
  TrendingUp as AnalyticsIcon,
  Settings as SettingsIcon
} from 'lucide-react-native';

// 🎨 Enterprise Design System
import { 
  COLORS, 
  TYPOGRAPHY, 
  SPACING, 
  BORDER_RADIUS,
  SHADOWS,
  GRADIENTS 
} from '../../../design-system/constants';

const Tab = createBottomTabNavigator();

/**
 * 🏢 ENTERPRISE TAB LAYOUT COMPONENT
 */
export default function TabLayout() {
  // 🎯 Context Hooks
  const { user, userRole, isAuthenticated, logout } = useAuth();
  const { qualityScore, tier } = useQuality();
  const { activeSubscriptions, pendingPayments } = usePayment();
  const { activeCourses, progress } = useLearning();
  
  // 🏗️ State Management
  const [activeTab, setActiveTab] = useState('home');
  const [notificationCount, setNotificationCount] = useState(0);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [tabBarVisible, setTabBarVisible] = useState(true);
  const [lastTabChange, setLastTabChange] = useState(Date.now());

  // 📊 Enterprise Logger
  const logger = new EnterpriseLogger({
    service: 'tab-navigation',
    module: 'frontend',
    environment: process.env.NODE_ENV
  });

  // 🔄 Navigation Hooks
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();

  // 🎨 Animation Values
  const tabBarOpacity = useSharedValue(1);
  const tabBarScale = useSharedValue(1);
  const notificationBadgeScale = useSharedValue(0);

  /**
   * 🏗️ INITIALIZE ENTERPRISE COMPONENT
   */
  useEffect(() => {
    initializeTabLayout();
    return cleanupTabLayout;
  }, []);

  /**
   * 🔄 HANDLE NAVIGATION STATE CHANGES
   */
  useEffect(() => {
    handleNavigationStateChange();
  }, [route, isFocused]);

  /**
   * 🔔 HANDLE NOTIFICATION UPDATES
   */
  useEffect(() => {
    setupNotificationListener();
    return removeNotificationListener;
  }, []);

  /**
   * 🎯 INITIALIZE TAB LAYOUT
   */
  const initializeTabLayout = async () => {
    try {
      // 📊 Log Tab Initialization
      logger.system('Enterprise Tab Layout initialized', {
        userRole,
        tier,
        activeCourses: activeCourses.length
      });

      // 🔔 Setup Notification Manager
      await setupNotificationManager();

      // 🎯 Check Admin Mode Access
      checkAdminModeAccess();

      // 📱 Handle Back Button (Android)
      if (Platform.OS === 'android') {
        setupBackHandler();
      }

    } catch (error) {
      logger.error('Tab layout initialization failed', {
        error: error.message,
        stack: error.stack
      });
    }
  };

  /**
   * 🔔 SETUP NOTIFICATION MANAGER
   */
  const setupNotificationManager = async () => {
    try {
      const notificationManager = new NotificationManager({
        userId: user?.id,
        userRole
      });

      // 📊 Get Unread Notification Count
      const count = await notificationManager.getUnreadCount();
      setNotificationCount(count);

      // 🎯 Animate Notification Badge
      if (count > 0) {
        notificationBadgeScale.value = withSpring(1, {
          damping: 15,
          stiffness: 150
        });
      }

    } catch (error) {
      logger.warn('Notification manager setup failed', {
        error: error.message
      });
    }
  };

  /**
   * 🎯 CHECK ADMIN MODE ACCESS
   */
  const checkAdminModeAccess = () => {
    const hasAdminAccess = userRole === 'admin' || userRole === 'super_admin';
    const hasAdminPrivileges = user?.permissions?.includes('admin_access');
    
    setIsAdminMode(hasAdminAccess && hasAdminPrivileges);
  };

  /**
   * 🔄 HANDLE NAVIGATION STATE CHANGE
   */
  const handleNavigationStateChange = () => {
    // 📊 Log Navigation State
    const currentRoute = route.name;
    const previousTab = activeTab;
    
    if (currentRoute !== previousTab) {
      setActiveTab(currentRoute);
      setLastTabChange(Date.now());
      
      // 📈 Log Tab Change
      logger.debug('Tab navigation changed', {
        from: previousTab,
        to: currentRoute,
        timestamp: new Date().toISOString()
      });
    }

    // 🎯 Handle Tab Bar Visibility
    const shouldHideTabBar = shouldHideTabBarForRoute(currentRoute);
    setTabBarVisible(!shouldHideTabBar);

    // 🎨 Animate Tab Bar
    animateTabBar(!shouldHideTabBar);
  };

  /**
   * 🎨 ANIMATE TAB BAR
   */
  const animateTabBar = (visible) => {
    tabBarOpacity.value = withTiming(visible ? 1 : 0, {
      duration: 300
    });
    
    tabBarScale.value = withSpring(visible ? 1 : 0.9, {
      damping: 15,
      stiffness: 150
    });
  };

  /**
   * 🎯 CUSTOM TAB BAR COMPONENT
   */
  const EnterpriseTabBar = ({ state, descriptors, navigation }) => {
    // 🎨 Animated Styles
    const animatedTabBarStyle = useAnimatedStyle(() => {
      return {
        opacity: tabBarOpacity.value,
        transform: [{ scale: tabBarScale.value }]
      };
    });

    const animatedBadgeStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: notificationBadgeScale.value }]
      };
    });

    /**
     * 🎯 HANDLE TAB PRESS
     */
    const handleTabPress = (route, index) => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        // 🎯 Prevent Rapid Tab Switching
        const now = Date.now();
        if (now - lastTabChange < 300) {
          logger.warn('Tab switch rate limited', {
            route: route.name,
            timeSinceLastChange: now - lastTabChange
          });
          return;
        }

        // 📊 Log Tab Press
        logger.debug('Tab pressed', {
          route: route.name,
          index,
          previousTab: activeTab
        });

        // 🎯 Navigate to Tab
        navigation.navigate(route.name);
        
        // 🔄 Update Active Tab
        setActiveTab(route.name);
        setLastTabChange(now);
      }
    };

    /**
     * 🎯 GET TAB CONFIGURATION
     */
    const getTabConfig = (routeName) => {
      const configs = {
        home: {
          label: 'Home',
          icon: HomeIcon,
          showBadge: false,
          color: activeTab === 'home' ? COLORS.primary : COLORS.gray[500],
          gradient: activeTab === 'home' ? GRADIENTS.primary : null
        },
        learning: {
          label: 'Learning',
          icon: LearningIcon,
          showBadge: activeCourses.length > 0,
          badgeCount: activeCourses.length,
          color: activeTab === 'learning' ? COLORS.success : COLORS.gray[500],
          gradient: activeTab === 'learning' ? GRADIENTS.success : null
        },
        expert: {
          label: 'Expert',
          icon: ExpertIcon,
          showBadge: false,
          color: activeTab === 'expert' ? COLORS.warning : COLORS.gray[500],
          gradient: activeTab === 'expert' ? GRADIENTS.warning : null
        },
        profile: {
          label: 'Profile',
          icon: ProfileIcon,
          showBadge: notificationCount > 0,
          badgeCount: notificationCount,
          color: activeTab === 'profile' ? COLORS.info : COLORS.gray[500],
          gradient: activeTab === 'profile' ? GRADIENTS.info : null
        },
        admin: {
          label: 'Admin',
          icon: AdminIcon,
          showBadge: pendingPayments > 0,
          badgeCount: pendingPayments,
          color: activeTab === 'admin' ? COLORS.danger : COLORS.gray[500],
          gradient: activeTab === 'admin' ? GRADIENTS.danger : null,
          restricted: !isAdminMode
        }
      };

      return configs[routeName] || configs.home;
    };

    /**
     * 🎯 RENDER TAB BAR ITEM
     */
    const renderTabItem = (route, index) => {
      const config = getTabConfig(route.name);
      
      // 🚫 Skip restricted tabs
      if (config.restricted) return null;

      const isActive = activeTab === route.name;
      const { options } = descriptors[route.key];

      return (
        <TouchableOpacity
          key={route.key}
          accessibilityRole="button"
          accessibilityState={isActive ? { selected: true } : {}}
          accessibilityLabel={options.tabBarAccessibilityLabel}
          testID={options.tabBarTestID}
          onPress={() => handleTabPress(route, index)}
          onLongPress={() => handleTabLongPress(route)}
          style={styles.tabItem}
          activeOpacity={0.7}
        >
          <View style={[
            styles.tabItemContainer,
            isActive && styles.tabItemActive
          ]}>
            {/* 🎯 Tab Icon */}
            <View style={styles.tabIconContainer}>
              <config.icon
                size={24}
                color={config.color}
                fill={isActive ? config.color : 'transparent'}
              />
              
              {/* 📊 Badge Indicator */}
              {config.showBadge && config.badgeCount > 0 && (
                <Animated.View style={[
                  styles.badge,
                  animatedBadgeStyle
                ]}>
                  <Text style={styles.badgeText}>
                    {config.badgeCount > 99 ? '99+' : config.badgeCount}
                  </Text>
                </Animated.View>
              )}
            </View>

            {/* 🏷️ Tab Label */}
            <Text style={[
              styles.tabLabel,
              isActive && styles.tabLabelActive
            ]}>
              {config.label}
            </Text>

            {/* 🎯 Active Indicator */}
            {isActive && (
              <View style={[
                styles.activeIndicator,
                { backgroundColor: config.color }
              ]} />
            )}
          </View>
        </TouchableOpacity>
      );
    };

    /**
     * 🎯 HANDLE TAB LONG PRESS
     */
    const handleTabLongPress = (route) => {
      logger.debug('Tab long pressed', {
        route: route.name,
        timestamp: new Date().toISOString()
      });

      // 🎯 Show Tab Options Menu
      // (Could implement context menu for advanced tab operations)
    };

    return (
      <Animated.View style={[styles.tabBarContainer, animatedTabBarStyle]}>
        {/* 🎨 Blur Background */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={90} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidBackground]} />
        )}

        {/* 🎯 Tab Items */}
        <View style={styles.tabItemsContainer}>
          {state.routes.map(renderTabItem)}
        </View>

        {/* 📊 Quality Score Indicator (Only for Students) */}
        {userRole === 'student' && qualityScore > 0 && (
          <View style={styles.qualityIndicator}>
            <Text style={styles.qualityScore}>
              ⭐ {qualityScore.toFixed(1)}
            </Text>
            <Text style={styles.tierBadge}>
              {tier.toUpperCase()}
            </Text>
          </View>
        )}
      </Animated.View>
    );
  };

  /**
   * 🎯 GET VISIBLE TABS BASED ON USER ROLE
   */
  const getVisibleTabs = () => {
    const allTabs = [
      { name: 'home', component: HomeScreen },
      { name: 'learning', component: LearningScreen },
      { name: 'expert', component: ExpertScreen },
      { name: 'profile', component: ProfileScreen },
      { name: 'admin', component: AdminScreen }
    ];

    // 🎯 Role-Based Tab Filtering
    return allTabs.filter(tab => {
      switch (userRole) {
        case 'student':
          return ['home', 'learning', 'expert', 'profile'].includes(tab.name);
        case 'expert':
          return ['home', 'expert', 'profile'].includes(tab.name);
        case 'admin':
        case 'super_admin':
          return ['home', 'admin', 'profile'].includes(tab.name);
        default:
          return ['home', 'profile'].includes(tab.name);
      }
    });
  };

  /**
   * 🚫 CHECK IF TAB BAR SHOULD BE HIDDEN
   */
  const shouldHideTabBarForRoute = (routeName) => {
    const hideTabBarRoutes = [
      'course-detail',
      'session-detail',
      'payment-process',
      'certification-view'
    ];

    return hideTabBarRoutes.includes(routeName);
  };

  /**
   * 🔧 SETUP BACK HANDLER (Android)
   */
  const setupBackHandler = () => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // 🎯 Custom back navigation logic
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }

      // 🚫 Exit app on root screen
      if (activeTab === 'home') {
        BackHandler.exitApp();
        return true;
      }

      // 🎯 Navigate to home tab
      navigation.navigate('home');
      return true;
    });

    return () => backHandler.remove();
  };

  /**
   * 🧹 CLEANUP TAB LAYOUT
   */
  const cleanupTabLayout = () => {
    logger.system('Enterprise Tab Layout cleanup', {
      activeTab,
      sessionDuration: Date.now() - lastTabChange
    });
  };

  /**
   * 🔔 SETUP NOTIFICATION LISTENER
   */
  const setupNotificationListener = () => {
    // 🎯 Listen for notification updates
    // (Implementation depends on notification service)
  };

  /**
   * 🔔 REMOVE NOTIFICATION LISTENER
   */
  const removeNotificationListener = () => {
    // 🎯 Clean up notification listeners
  };

  return (
    <Tab.Navigator
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: { display: 'none' } // Hide default tab bar
      }}
      tabBar={props => <EnterpriseTabBar {...props} />}
      sceneContainerStyle={styles.sceneContainer}
    >
      {getVisibleTabs().map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            // 🎯 Screen-specific options
            ...getScreenOptions(tab.name)
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

/**
 * 🎯 GET SCREEN OPTIONS
 */
const getScreenOptions = (screenName) => {
  const options = {
    home: {
      title: 'Mosa Forge Home',
      animation: 'slide_from_right'
    },
    learning: {
      title: 'Learning Dashboard',
      animation: 'slide_from_bottom'
    },
    expert: {
      title: 'Expert Portal',
      animation: 'slide_from_left'
    },
    profile: {
      title: 'My Profile',
      animation: 'fade'
    },
    admin: {
      title: 'Admin Dashboard',
      animation: 'slide_from_top'
    }
  };

  return options[screenName] || {};
};

/**
 * 🎨 ENTERPRISE STYLES
 */
const styles = StyleSheet.create({
  // 📱 Tab Bar Container
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 90 : 80,
    backgroundColor: Platform.OS === 'ios' ? 'transparent' : COLORS.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    ...SHADOWS.medium
  },

  // 🤖 Android Background
  androidBackground: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl
  },

  // 🎯 Tab Items Container
  tabItemsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: Platform.OS === 'ios' ? SPACING.xl : SPACING.lg
  },

  // 🏷️ Tab Item
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm
  },

  // 🏷️ Tab Item Container
  tabItemContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.lg,
    position: 'relative'
  },

  // 🎯 Active Tab Item
  tabItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)'
  },

  // 🎨 Tab Icon Container
  tabIconContainer: {
    position: 'relative',
    marginBottom: SPACING.xs
  },

  // 🏷️ Tab Label
  tabLabel: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.gray[600],
    fontWeight: '500',
    marginTop: 2
  },

  // 🎯 Active Tab Label
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },

  // 📊 Badge
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small
  },

  // 📊 Badge Text
  badgeText: {
    ...TYPOGRAPHY.caption,
    fontSize: 9,
    color: COLORS.white,
    fontWeight: '800',
    paddingHorizontal: 4
  },

  // 🎯 Active Indicator
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 4,
    height: 4,
    borderRadius: 2
  },

  // ⭐ Quality Indicator
  qualityIndicator: {
    position: 'absolute',
    top: -20,
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.medium
  },

  // ⭐ Quality Score
  qualityScore: {
    ...TYPOGRAPHY.caption,
    color: COLORS.warning,
    fontWeight: '700',
    marginRight: SPACING.xs
  },

  // 🎯 Tier Badge
  tierBadge: {
    ...TYPOGRAPHY.caption,
    fontSize: 8,
    color: COLORS.white,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
    fontWeight: '800'
  },

  // 🎬 Scene Container
  sceneContainer: {
    flex: 1,
    backgroundColor: COLORS.background
  }
});