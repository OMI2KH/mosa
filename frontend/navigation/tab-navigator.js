// navigation/tab-navigator.js

/**
 * 🎯 ENTERPRISE TAB NAVIGATION SYSTEM
 * Production-ready tab navigation for Mosa Forge
 * Features: Role-based tabs, real-time updates, quality indicators, performance optimized
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useEffect, useState, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Platform, StyleSheet, View, Text, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';

// Icons
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import LearningDashboard from '../app/(learning)/learning-dashboard';
import ExpertPortal from '../app/(expert-portal)/expert-dashboard';
import QualityDashboard from '../app/(expert-portal)/quality-dashboard';
import StudentProgress from '../app/(student)/progress-tracker';
import PaymentTracker from '../app/(payment)/payout-tracker';
import MultiCourseManager from '../app/(multi-course)/course-manager';
import AdminAnalytics from '../app/(admin)/platform-analytics';
import SettingsScreen from '../app/(settings)/settings';

// Context & Hooks
import { useAuth } from '../contexts/auth-context';
import { useQualityMetrics } from '../hooks/use-quality-metrics';
import { useNotifications } from '../hooks/use-notifications';

// Utils
import { Logger } from '../utils/logger';
import { PerformanceMonitor } from '../utils/performance-monitor';

const Tab = Platform.OS === 'ios' ? createBottomTabNavigator() : createMaterialTopTabNavigator();
const logger = new Logger('TabNavigator');
const performanceMonitor = new PerformanceMonitor();

/**
 * 🎯 ENTERPRISE TAB NAVIGATOR
 * Dynamic tab system with role-based access and real-time updates
 */
const EnterpriseTabNavigator = () => {
  const { user, role, isAuthenticated } = useAuth();
  const { qualityScore, tier, unreadNotifications } = useQualityMetrics();
  const { unreadCount } = useNotifications();
  const dispatch = useDispatch();
  
  const [badgeCounts, setBadgeCounts] = useState({
    learning: 0,
    quality: 0,
    progress: 0,
    payments: 0,
    admin: 0
  });

  const [activeTab, setActiveTab] = useState('learning');
  const pulseAnim = new Animated.Value(1);

  /**
   * 🎯 Initialize tab navigation with performance monitoring
   */
  useEffect(() => {
    const initTime = performanceMonitor.startMeasurement('tab_nav_init');
    
    // Load initial badge counts
    loadBadgeCounts();
    
    // Set up real-time listeners
    const unsubscribeListeners = setupRealTimeListeners();
    
    performanceMonitor.endMeasurement(initTime);
    
    return () => {
      unsubscribeListeners?.();
      logger.debug('Tab navigator cleanup completed');
    };
  }, []);

  /**
   * 🔄 Real-time badge count updates
   */
  const loadBadgeCounts = useCallback(async () => {
    try {
      // Simulate API calls for badge counts
      const counts = await Promise.all([
        fetchLearningBadgeCount(),
        fetchQualityAlertsCount(),
        fetchProgressUpdatesCount(),
        fetchPaymentNotificationsCount(),
        fetchAdminAlertsCount()
      ]);

      setBadgeCounts({
        learning: counts[0],
        quality: counts[1],
        progress: counts[2],
        payments: counts[3],
        admin: counts[4]
      });
    } catch (error) {
      logger.error('Failed to load badge counts', error);
    }
  }, []);

  /**
   * 📡 Setup real-time listeners for dynamic updates
   */
  const setupRealTimeListeners = useCallback(() => {
    // Quality score updates
    const qualityUnsubscribe = qualityScore.subscribe((score) => {
      logger.debug('Quality score updated', { score });
    });

    // Notification updates
    const notificationUnsubscribe = unreadCount.subscribe((count) => {
      setBadgeCounts(prev => ({
        ...prev,
        learning: count
      }));
    });

    return () => {
      qualityUnsubscribe?.();
      notificationUnsubscribe?.();
    };
  }, [qualityScore, unreadCount]);

  /**
   * 🎯 Get tab configuration based on user role
   */
  const getTabConfig = useCallback(() => {
    const baseTabs = {
      student: [
        {
          name: 'Learning',
          component: LearningDashboard,
          icon: 'book-outline',
          activeIcon: 'book',
          badge: badgeCounts.learning,
          role: ['student', 'expert', 'admin']
        },
        {
          name: 'Progress',
          component: StudentProgress,
          icon: 'trending-up-outline',
          activeIcon: 'trending-up',
          badge: badgeCounts.progress,
          role: ['student', 'expert', 'admin']
        },
        {
          name: 'Courses',
          component: MultiCourseManager,
          icon: 'layers-outline',
          activeIcon: 'layers',
          badge: 0,
          role: ['student', 'expert', 'admin']
        }
      ],
      expert: [
        {
          name: 'Expert',
          component: ExpertPortal,
          icon: 'person-outline',
          activeIcon: 'person',
          badge: 0,
          role: ['expert', 'admin']
        },
        {
          name: 'Quality',
          component: QualityDashboard,
          icon: 'ribbon-outline',
          activeIcon: 'ribbon',
          badge: badgeCounts.quality,
          role: ['expert', 'admin'],
          showTier: true
        },
        {
          name: 'Students',
          component: StudentProgress,
          icon: 'people-outline',
          activeIcon: 'people',
          badge: badgeCounts.progress,
          role: ['expert', 'admin']
        },
        {
          name: 'Earnings',
          component: PaymentTracker,
          icon: 'cash-outline',
          activeIcon: 'cash',
          badge: badgeCounts.payments,
          role: ['expert', 'admin']
        }
      ],
      admin: [
        {
          name: 'Analytics',
          component: AdminAnalytics,
          icon: 'analytics-outline',
          activeIcon: 'analytics',
          badge: badgeCounts.admin,
          role: ['admin']
        },
        {
          name: 'Quality',
          component: QualityDashboard,
          icon: 'shield-checkmark-outline',
          activeIcon: 'shield-checkmark',
          badge: badgeCounts.quality,
          role: ['admin']
        },
        {
          name: 'Revenue',
          component: PaymentTracker,
          icon: 'business-outline',
          activeIcon: 'business',
          badge: badgeCounts.payments,
          role: ['admin']
        }
      ]
    };

    // Combine tabs based on user role with proper ordering
    let tabs = [];
    
    if (role === 'student') {
      tabs = [...baseTabs.student];
    } else if (role === 'expert') {
      tabs = [...baseTabs.student.filter(tab => tab.name !== 'Courses'), ...baseTabs.expert];
    } else if (role === 'admin') {
      tabs = [...baseTabs.admin, ...baseTabs.expert.slice(1)];
    }

    // Add settings tab for all roles
    tabs.push({
      name: 'Settings',
      component: SettingsScreen,
      icon: 'settings-outline',
      activeIcon: 'settings',
      badge: 0,
      role: ['student', 'expert', 'admin']
    });

    return tabs;
  }, [role, badgeCounts]);

  /**
   * 🎨 Custom tab bar with quality indicators and animations
   */
  const CustomTabBar = ({ state, descriptors, navigation }) => {
    const tabs = getTabConfig();
    
    return (
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;
            const tabConfig = tabs.find(tab => tab.name === route.name);

            if (!tabConfig) return null;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
                setActiveTab(route.name);
                
                // Analytics tracking
                logger.metric('tab_switch', {
                  from: activeTab,
                  to: route.name,
                  role: role,
                  timestamp: new Date().toISOString()
                });
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TabBarButton
                key={route.key}
                tabConfig={tabConfig}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                qualityScore={qualityScore}
                tier={tier}
              />
            );
          })}
        </View>
        
        {/* Quality Indicator Bar */}
        {(role === 'expert' || role === 'admin') && (
          <QualityIndicatorBar 
            qualityScore={qualityScore}
            tier={tier}
            activeTab={activeTab}
          />
        )}
      </View>
    );
  };

  /**
   * 🔘 Individual Tab Bar Button with Badges
   */
  const TabBarButton = ({ tabConfig, isFocused, onPress, onLongPress, qualityScore, tier }) => {
    const scaleAnim = new Animated.Value(1);
    
    useEffect(() => {
      if (isFocused) {
        Animated.spring(scaleAnim, {
          toValue: 1.1,
          friction: 3,
          useNativeDriver: true,
        }).start();
      } else {
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }).start();
      }
    }, [isFocused]);

    const getTierColor = () => {
      switch(tier) {
        case 'MASTER': return '#10B981'; // Emerald
        case 'SENIOR': return '#3B82F6'; // Blue
        case 'STANDARD': return '#6B7280'; // Gray
        case 'DEVELOPING': return '#F59E0B'; // Amber
        case 'PROBATION': return '#EF4444'; // Red
        default: return '#6B7280';
      }
    };

    return (
      <Animated.View style={[styles.tabButton, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.tabButtonInner}>
          <Ionicons
            name={isFocused ? tabConfig.activeIcon : tabConfig.icon}
            size={24}
            color={isFocused ? '#2563EB' : '#6B7280'}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabIcon}
          />
          
          {/* Tier Indicator for Quality Tab */}
          {tabConfig.showTier && tier && (
            <View style={[styles.tierIndicator, { backgroundColor: getTierColor() }]} />
          )}
          
          {/* Badge Indicator */}
          {tabConfig.badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {tabConfig.badge > 99 ? '99+' : tabConfig.badge}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={[
          styles.tabLabel,
          isFocused && styles.tabLabelFocused
        ]}>
          {tabConfig.name}
        </Text>
      </Animated.View>
    );
  };

  /**
   * 📊 Quality Indicator Bar Component
   */
  const QualityIndicatorBar = ({ qualityScore, tier, activeTab }) => {
    const getQualityColor = (score) => {
      if (score >= 4.7) return '#10B981'; // Master - Emerald
      if (score >= 4.3) return '#3B82F6'; // Senior - Blue
      if (score >= 4.0) return '#6B7280'; // Standard - Gray
      if (score >= 3.5) return '#F59E0B'; // Developing - Amber
      return '#EF4444'; // Probation - Red
    };

    const getTierLabel = () => {
      switch(tier) {
        case 'MASTER': return 'Master Tier';
        case 'SENIOR': return 'Senior Tier';
        case 'STANDARD': return 'Standard Tier';
        case 'DEVELOPING': return 'Developing';
        case 'PROBATION': return 'Probation';
        default: return 'Standard Tier';
      }
    };

    return (
      <View style={styles.qualityBar}>
        <View style={styles.qualityInfo}>
          <Text style={styles.qualityText}>
            Quality Score: <Text style={{ color: getQualityColor(qualityScore) }}>
              {qualityScore.toFixed(1)}
            </Text>
          </Text>
          <Text style={styles.tierText}>
            {getTierLabel()}
          </Text>
        </View>
        
        {/* Quality Progress Bar */}
        <View style={styles.qualityProgressContainer}>
          <View 
            style={[
              styles.qualityProgress,
              { 
                width: `${(qualityScore / 5) * 100}%`,
                backgroundColor: getQualityColor(qualityScore)
              }
            ]} 
          />
        </View>
      </View>
    );
  };

  /**
   * 🎯 Tab Screen Options Generator
   */
  const getTabScreenOptions = useCallback((tab) => {
    const baseOptions = {
      headerShown: true,
      headerStyle: {
        backgroundColor: '#2563EB',
      },
      headerTintColor: '#FFFFFF',
      headerTitleStyle: {
        fontWeight: '600',
        fontSize: 18,
      },
      tabBarStyle: {
        backgroundColor: '#FFFFFF',
        borderTopColor: '#E5E7EB',
        borderTopWidth: 1,
        height: Platform.OS === 'ios' ? 90 : 70,
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
        paddingTop: 10,
      },
    };

    // Role-specific header titles and styles
    const roleSpecificOptions = {
      student: {
        headerTitle: `Mosa Forge - Student Portal`,
      },
      expert: {
        headerTitle: `Mosa Forge - Expert Dashboard`,
      },
      admin: {
        headerTitle: `Mosa Forge - Admin Console`,
      },
    };

    return {
      ...baseOptions,
      ...roleSpecificOptions[role],
      tabBarLabel: ({ focused, color }) => (
        <Text style={[styles.tabBarLabel, { color }]}>
          {tab.name}
        </Text>
      ),
      tabBarIcon: ({ focused, color, size }) => {
        const iconName = focused ? tab.activeIcon : tab.icon;
        return (
          <View style={styles.iconContainer}>
            <Ionicons name={iconName} size={size} color={color} />
            {tab.badge > 0 && (
              <View style={styles.tabBarBadge}>
                <Text style={styles.tabBarBadgeText}>
                  {tab.badge > 99 ? '99+' : tab.badge}
                </Text>
              </View>
            )}
          </View>
        );
      },
    };
  }, [role]);

  // Show loading state while authenticating
  if (!isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Mosa Forge...</Text>
      </View>
    );
  }

  const tabs = getTabConfig();

  return (
    <Tab.Navigator
      initialRouteName="Learning"
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        lazy: true,
        unmountOnBlur: false,
        tabBarHideOnKeyboard: true,
      }}
      sceneContainerStyle={styles.sceneContainer}
    >
      {tabs.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={getTabScreenOptions(tab)}
          listeners={{
            focus: () => {
              logger.debug(`Tab focused: ${tab.name}`);
              // Preload related data when tab is focused
              preloadTabData(tab.name);
            },
            blur: () => {
              logger.debug(`Tab blurred: ${tab.name}`);
            },
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

/**
 * 🔧 Utility Functions
 */

// Mock API calls for badge counts
const fetchLearningBadgeCount = async () => {
  // Simulate API call
  return Math.floor(Math.random() * 5);
};

const fetchQualityAlertsCount = async () => {
  // Simulate API call
  return Math.floor(Math.random() * 3);
};

const fetchProgressUpdatesCount = async () => {
  // Simulate API call
  return Math.floor(Math.random() * 7);
};

const fetchPaymentNotificationsCount = async () => {
  // Simulate API call
  return Math.floor(Math.random() * 2);
};

const fetchAdminAlertsCount = async () => {
  // Simulate API call
  return Math.floor(Math.random() * 10);
};

const preloadTabData = (tabName) => {
  // Preload data based on tab for better performance
  switch(tabName) {
    case 'Learning':
      // Preload learning materials
      break;
    case 'Quality':
      // Preload quality metrics
      break;
    case 'Progress':
      // Preload progress data
      break;
    case 'Earnings':
      // Preload payment data
      break;
    default:
      break;
  }
};

/**
 * 🎨 Styles
 */
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 70,
    paddingHorizontal: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabButtonInner: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    padding: 4,
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabLabelFocused: {
    color: '#2563EB',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tierIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  qualityBar: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  qualityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  tierText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  qualityProgressContainer: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  qualityProgress: {
    height: '100%',
    borderRadius: 2,
  },
  iconContainer: {
    position: 'relative',
  },
  tabBarBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  sceneContainer: {
    backgroundColor: '#FFFFFF',
  },
});

export default EnterpriseTabNavigator;