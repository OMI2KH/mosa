/**
 * 🏢 MOSA FORGE - Enterprise Skills Navigation Layout
 * 🎯 Skills Catalog & Selection Management System
 * 📱 React Native Navigation with Dynamic Skill Categories
 * 🚀 Enterprise-Grade Performance & User Experience
 * 
 * @module SkillsLayout
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  StatusBar, 
  Platform,
  BackHandler,
  Alert 
} from 'react-native';
import { 
  createStackNavigator, 
  StackNavigationOptions 
} from '@react-navigation/stack';
import { 
  createMaterialTopTabNavigator, 
  MaterialTopTabNavigationOptions 
} from '@react-navigation/material-top-tabs';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 🏗️ Enterprise Dependencies
import EnterpriseHeader from '../../components/enterprise/EnterpriseHeader';
import LoadingScreen from '../../components/enterprise/LoadingScreen';
import NetworkStatus from '../../components/network/NetworkStatus';
import OfflineNotice from '../../components/network/OfflineNotice';

// 🎯 Skills Screens
import SkillsCatalogScreen from './skills-catalog';
import SkillCategoryScreen from './skill-category';
import SkillDetailScreen from './skill-detail';
import SkillEnrollmentScreen from './skill-enrollment';
import CompareSkillsScreen from './compare-skills';
import SkillRoadmapScreen from './skill-roadmap';

// 📊 Services
import SkillsService from '../../services/skills-service';
import AnalyticsService from '../../services/analytics-service';
import UserPreferences from '../../services/user-preferences';

// 🔧 Constants & Types
import { 
  SKILL_CATEGORIES, 
  SKILL_LEVELS, 
  ENTERPRISE_CONFIG 
} from '../../constants/skills';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/design-system';
import { logEvent, logError, logNavigation } from '../../utils/enterprise-logger';

const Stack = createStackNavigator();
const TopTab = createMaterialTopTabNavigator();

/**
 * 🎯 Skills Top Tab Navigator
 */
function SkillsTopTabNavigator() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      
      // 📊 Track analytics
      await AnalyticsService.trackScreenView('skills_catalog', {
        userType: 'student',
        timestamp: new Date().toISOString()
      });

      // 🗃️ Fetch skill categories from service
      const skillCategories = await SkillsService.getSkillCategories();
      
      // 🎯 Apply user preferences
      const userPrefs = await UserPreferences.getSkillPreferences();
      const filteredCategories = skillCategories.filter(category => 
        !userPrefs?.hiddenCategories?.includes(category.id)
      );

      setCategories(filteredCategories);
      
      // 📈 Track successful fetch
      await AnalyticsService.logEvent('skills_categories_loaded', {
        count: filteredCategories.length,
        source: 'api_service'
      });

    } catch (error) {
      logError('SkillsCategoriesFetchError', 'Failed to fetch skill categories', {
        error: error.message,
        stack: error.stack
      });
      
      setError(error.message);
      
      // 🚨 Show error notification
      Alert.alert(
        'Connection Error',
        'Unable to load skill categories. Please check your connection.',
        [
          {
            text: 'Retry',
            onPress: fetchCategories
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();

    // 🔄 Setup refresh interval
    const refreshInterval = setInterval(() => {
      fetchCategories();
    }, ENTERPRISE_CONFIG.REFRESH_INTERVALS.SKILLS_CATALOG);

    return () => clearInterval(refreshInterval);
  }, [fetchCategories]);

  // 🎯 Handle back button on Android
  useEffect(() => {
    const backAction = () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      
      Alert.alert(
        'Exit App',
        'Are you sure you want to exit MOSA FORGE?',
        [
          {
            text: 'Cancel',
            onPress: () => null,
            style: 'cancel'
          },
          { 
            text: 'Exit', 
            onPress: () => BackHandler.exitApp() 
          }
        ]
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  if (loading) {
    return (
      <LoadingScreen 
        message="Loading Skills Catalog..."
        showProgress={true}
      />
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <OfflineNotice 
          message="Unable to load skills data"
          showRetry={true}
          onRetry={fetchCategories}
        />
      </View>
    );
  }

  return (
    <View style={styles.tabContainer}>
      <NetworkStatus />
      
      <TopTab.Navigator
        initialRouteName="online_skills"
        screenOptions={{
          tabBarStyle: [
            styles.tabBar,
            { paddingTop: insets.top }
          ],
          tabBarContentContainerStyle: styles.tabBarContent,
          tabBarIndicatorStyle: styles.tabBarIndicator,
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarActiveTintColor: COLORS.primary.brand,
          tabBarInactiveTintColor: COLORS.text.secondary,
          tabBarPressColor: COLORS.primary.light,
          tabBarScrollEnabled: true,
          tabBarItemStyle: styles.tabBarItem,
          tabBarBounces: true,
          swipeEnabled: true,
          lazy: true,
          lazyPreloadDistance: 1,
          optimizationsEnabled: true
        }}
      >
        {categories.map((category) => (
          <TopTab.Screen
            key={category.id}
            name={category.id}
            options={{
              title: category.name,
              tabBarTestID: `tab-${category.id}`,
              tabBarAccessibilityLabel: `${category.name} skills tab`
            }}
          >
            {(props) => (
              <SkillCategoryScreen
                {...props}
                category={category}
                onSkillSelect={handleSkillSelect}
              />
            )}
          </TopTab.Screen>
        ))}
      </TopTab.Navigator>
    </View>
  );
}

/**
 * 🎯 Handle Skill Selection
 */
async function handleSkillSelect(skill, navigation) {
  try {
    // 📊 Track skill selection
    await AnalyticsService.logEvent('skill_selected', {
      skillId: skill.id,
      skillName: skill.name,
      category: skill.category,
      timestamp: new Date().toISOString()
    });

    // 🎯 Navigate to skill detail
    navigation.navigate('SkillDetail', {
      skill,
      previousScreen: 'SkillsCatalog'
    });

  } catch (error) {
    logError('SkillSelectionError', 'Failed to handle skill selection', {
      skillId: skill.id,
      error: error.message
    });
  }
}

/**
 * 🏢 Enterprise Skills Stack Navigator
 */
export default function SkillsLayout() {
  const [initialRoute, setInitialRoute] = useState('SkillsCatalog');
  const [appState, setAppState] = useState('active');
  const navigation = useNavigation();

  // 🎯 Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // 📊 Track app resume
        AnalyticsService.logEvent('app_resumed', {
          screen: 'skills_layout',
          timestamp: new Date().toISOString()
        });
      }
      setAppState(nextAppState);
    });

    return () => subscription.remove();
  }, [appState]);

  // 🎯 Navigation options configuration
  const stackScreenOptions = {
    headerShown: true,
    header: (props) => <EnterpriseHeader {...props} />,
    headerStyle: styles.header,
    headerTitleStyle: styles.headerTitle,
    headerTintColor: COLORS.primary.brand,
    headerBackTitleVisible: false,
    headerBackAccessibilityLabel: 'Go back',
    headerTitleAlign: 'center',
    headerShadowVisible: true,
    headerPressColorAndroid: COLORS.primary.light,
    animationEnabled: true,
    animationTypeForReplace: 'push',
    gestureEnabled: true,
    gestureDirection: 'horizontal',
    cardStyle: styles.card,
    cardOverlayEnabled: true,
    cardShadowEnabled: true,
    cardStyleInterpolator: ({ current, next, layouts }) => ({
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
          {
            scale: next
              ? next.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.9],
                })
              : 1,
          },
        ],
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.5],
        }),
      },
    }),
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background.primary}
        translucent={false}
      />
      
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={stackScreenOptions}
        screenListeners={{
          state: (e) => {
            // 📊 Track navigation state changes
            const currentRoute = e.data.state?.routes[e.data.state.index]?.name;
            logNavigation('skills_navigation_state_change', {
              currentRoute,
              timestamp: new Date().toISOString()
            });
          },
          beforeRemove: (e) => {
            // 🎯 Handle navigation with data persistence
            const { data } = e;
            if (data.action.type === 'GO_BACK') {
              AnalyticsService.logEvent('navigation_back', {
                fromScreen: data.target,
                timestamp: new Date().toISOString()
              });
            }
          }
        }}
      >
        {/* 🎯 Skills Catalog (Top Tabs) */}
        <Stack.Screen
          name="SkillsCatalog"
          component={SkillsTopTabNavigator}
          options={{
            title: 'Skills Catalog',
            headerShown: true,
            headerStyle: styles.catalogHeader,
            headerTitleStyle: styles.catalogHeaderTitle,
            headerRight: () => (
              <View style={styles.headerActions}>
                <SearchButton />
                <FilterButton />
                <CompareButton />
              </View>
            )
          }}
        />

        {/* 📱 Skill Detail Screen */}
        <Stack.Screen
          name="SkillDetail"
          component={SkillDetailScreen}
          options={({ route }) => ({
            title: route.params?.skill?.name || 'Skill Details',
            headerShown: true,
            headerBackTitle: 'Back',
            headerRight: () => (
              <View style={styles.detailHeaderActions}>
                <EnrollButton skill={route.params?.skill} />
                <ShareButton skill={route.params?.skill} />
                <BookmarkButton skill={route.params?.skill} />
              </View>
            )
          })}
          initialParams={{
            skill: null,
            previousScreen: 'SkillsCatalog'
          }}
        />

        {/* 🎓 Skill Enrollment Screen */}
        <Stack.Screen
          name="SkillEnrollment"
          component={SkillEnrollmentScreen}
          options={{
            title: 'Enroll in Skill',
            headerShown: true,
            presentation: 'modal',
            gestureEnabled: true,
            animation: 'slide_from_bottom',
            headerRight: () => (
              <CloseButton />
            )
          }}
        />

        {/* 🔄 Compare Skills Screen */}
        <Stack.Screen
          name="CompareSkills"
          component={CompareSkillsScreen}
          options={{
            title: 'Compare Skills',
            headerShown: true,
            headerRight: () => (
              <ClearComparisonButton />
            )
          }}
        />

        {/* 🗺️ Skill Roadmap Screen */}
        <Stack.Screen
          name="SkillRoadmap"
          component={SkillRoadmapScreen}
          options={({ route }) => ({
            title: `${route.params?.skill?.name || 'Skill'} Roadmap`,
            headerShown: true,
            headerRight: () => (
              <DownloadRoadmapButton />
            )
          })}
        />
      </Stack.Navigator>

      {/* 📊 Performance Monitoring */}
      {Platform.OS === 'ios' && (
        <PerformanceMonitor />
      )}
    </View>
  );
}

/**
 * 🎯 Header Action Buttons
 */
const SearchButton = () => {
  const navigation = useNavigation();

  const handleSearch = useCallback(() => {
    navigation.navigate('SkillSearch');
  }, [navigation]);

  return (
    <EnterpriseHeader.Button
      icon="search"
      onPress={handleSearch}
      accessibilityLabel="Search skills"
      testID="header-search-button"
    />
  );
};

const FilterButton = () => {
  const [filters, setFilters] = useState({});

  const handleFilter = useCallback(() => {
    // 🎯 Navigate to filter screen
    Alert.alert(
      'Filter Skills',
      'Filter functionality coming soon',
      [{ text: 'OK' }]
    );
  }, []);

  return (
    <EnterpriseHeader.Button
      icon="filter"
      onPress={handleFilter}
      accessibilityLabel="Filter skills"
      testID="header-filter-button"
      badge={Object.keys(filters).length > 0 ? '!' : null}
    />
  );
};

const CompareButton = () => {
  const navigation = useNavigation();
  const comparisonCount = useComparisonCount();

  const handleCompare = useCallback(() => {
    if (comparisonCount > 0) {
      navigation.navigate('CompareSkills');
    } else {
      Alert.alert(
        'Compare Skills',
        'Please select skills to compare first',
        [{ text: 'OK' }]
      );
    }
  }, [navigation, comparisonCount]);

  return (
    <EnterpriseHeader.Button
      icon="compare"
      onPress={handleCompare}
      accessibilityLabel="Compare skills"
      testID="header-compare-button"
      badge={comparisonCount > 0 ? comparisonCount.toString() : null}
    />
  );
};

const EnrollButton = ({ skill }) => {
  const navigation = useNavigation();

  const handleEnroll = useCallback(async () => {
    if (!skill) return;

    try {
      // 📊 Track enrollment initiation
      await AnalyticsService.logEvent('enrollment_initiated', {
        skillId: skill.id,
        skillName: skill.name,
        timestamp: new Date().toISOString()
      });

      // 🎯 Navigate to enrollment screen
      navigation.navigate('SkillEnrollment', { skill });

    } catch (error) {
      logError('EnrollmentInitiationError', 'Failed to initiate enrollment', {
        skillId: skill.id,
        error: error.message
      });
    }
  }, [skill, navigation]);

  return (
    <EnterpriseHeader.Button
      icon="enroll"
      onPress={handleEnroll}
      accessibilityLabel="Enroll in skill"
      testID="enroll-button"
      variant="primary"
    />
  );
};

const ShareButton = ({ skill }) => {
  const handleShare = useCallback(async () => {
    if (!skill) return;

    try {
      // 📱 Native sharing implementation
      if (Platform.OS === 'web') {
        // 🌐 Web sharing
        if (navigator.share) {
          await navigator.share({
            title: `${skill.name} - MOSA FORGE`,
            text: `Learn ${skill.name} on MOSA FORGE and start earning!`,
            url: `https://mosaforge.com/skills/${skill.id}`
          });
        }
      } else {
        // 📲 React Native sharing
        const Share = require('react-native-share').default;
        await Share.open({
          title: 'Share Skill',
          message: `Check out ${skill.name} on MOSA FORGE!`,
          url: `https://mosaforge.com/skills/${skill.id}`
        });
      }

      // 📊 Track sharing
      await AnalyticsService.logEvent('skill_shared', {
        skillId: skill.id,
        platform: Platform.OS,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logError('ShareError', 'Failed to share skill', {
        skillId: skill.id,
        error: error.message
      });
    }
  }, [skill]);

  return (
    <EnterpriseHeader.Button
      icon="share"
      onPress={handleShare}
      accessibilityLabel="Share skill"
      testID="share-button"
    />
  );
};

const BookmarkButton = ({ skill }) => {
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    checkBookmarkStatus();
  }, [skill]);

  const checkBookmarkStatus = async () => {
    if (!skill) return;
    
    const bookmarks = await UserPreferences.getBookmarks();
    setIsBookmarked(bookmarks.some(b => b.skillId === skill.id));
  };

  const handleBookmark = useCallback(async () => {
    if (!skill) return;

    try {
      if (isBookmarked) {
        // 🗑️ Remove bookmark
        await UserPreferences.removeBookmark(skill.id);
        setIsBookmarked(false);
        
        await AnalyticsService.logEvent('bookmark_removed', {
          skillId: skill.id,
          timestamp: new Date().toISOString()
        });
      } else {
        // 📌 Add bookmark
        await UserPreferences.addBookmark({
          skillId: skill.id,
          skillName: skill.name,
          timestamp: new Date().toISOString()
        });
        setIsBookmarked(true);
        
        await AnalyticsService.logEvent('bookmark_added', {
          skillId: skill.id,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logError('BookmarkError', 'Failed to toggle bookmark', {
        skillId: skill.id,
        error: error.message
      });
    }
  }, [skill, isBookmarked]);

  return (
    <EnterpriseHeader.Button
      icon={isBookmarked ? 'bookmark-filled' : 'bookmark'}
      onPress={handleBookmark}
      accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark skill'}
      testID="bookmark-button"
      variant={isBookmarked ? 'primary' : 'default'}
    />
  );
};

const CloseButton = () => {
  const navigation = useNavigation();

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <EnterpriseHeader.Button
      icon="close"
      onPress={handleClose}
      accessibilityLabel="Close"
      testID="close-button"
    />
  );
};

const ClearComparisonButton = () => {
  const { clearComparison } = useComparison();

  const handleClear = useCallback(() => {
    Alert.alert(
      'Clear Comparison',
      'Are you sure you want to clear all compared skills?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear',
          onPress: clearComparison,
          style: 'destructive'
        }
      ]
    );
  }, [clearComparison]);

  return (
    <EnterpriseHeader.Button
      icon="clear"
      onPress={handleClear}
      accessibilityLabel="Clear comparison"
      testID="clear-comparison-button"
    />
  );
};

const DownloadRoadmapButton = () => {
  const handleDownload = useCallback(async () => {
    try {
      // 📊 Track download attempt
      await AnalyticsService.logEvent('roadmap_download_initiated', {
        timestamp: new Date().toISOString()
      });

      Alert.alert(
        'Download Roadmap',
        'Roadmap download functionality coming soon!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      logError('RoadmapDownloadError', 'Failed to download roadmap', {
        error: error.message
      });
    }
  }, []);

  return (
    <EnterpriseHeader.Button
      icon="download"
      onPress={handleDownload}
      accessibilityLabel="Download roadmap"
      testID="download-roadmap-button"
    />
  );
};

/**
 * 🔧 Custom Hooks
 */
function useComparisonCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const loadComparisonCount = async () => {
      const comparison = await UserPreferences.getComparison();
      setCount(comparison.length);
    };

    loadComparisonCount();

    // 🔄 Listen for comparison changes
    const subscription = UserPreferences.subscribeToComparison((newComparison) => {
      setCount(newComparison.length);
    });

    return () => subscription.unsubscribe();
  }, []);

  return count;
}

function useComparison() {
  const clearComparison = useCallback(async () => {
    try {
      await UserPreferences.clearComparison();
      
      await AnalyticsService.logEvent('comparison_cleared', {
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logError('ClearComparisonError', 'Failed to clear comparison', {
        error: error.message
      });
    }
  }, []);

  return { clearComparison };
}

/**
 * 📊 Performance Monitor Component (iOS only)
 */
const PerformanceMonitor = () => {
  const [performanceMetrics, setPerformanceMetrics] = useState(null);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      // 🚀 iOS Performance monitoring
      const monitorPerformance = () => {
        // Implement iOS performance monitoring
        // This would typically use React Native Performance or custom monitoring
      };

      monitorPerformance();
    }
  }, []);

  return null;
};

/**
 * 🎨 Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  tabContainer: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
  },
  header: {
    backgroundColor: COLORS.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    elevation: 0,
    shadowOpacity: 0,
    height: 60,
  },
  catalogHeader: {
    backgroundColor: COLORS.primary.brand,
    borderBottomWidth: 0,
    elevation: 4,
    shadowColor: COLORS.primary.dark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    height: 80,
  },
  headerTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  catalogHeaderTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.white,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.md,
    gap: SPACING.sm,
  },
  detailHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.md,
    gap: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.background.primary,
  },
  tabBar: {
    backgroundColor: COLORS.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    elevation: 2,
    shadowColor: COLORS.shadow.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBarContent: {
    paddingHorizontal: SPACING.md,
  },
  tabBarIndicator: {
    backgroundColor: COLORS.primary.brand,
    height: 3,
    borderRadius: 1.5,
  },
  tabBarLabel: {
    ...TYPOGRAPHY.label,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tabBarItem: {
    width: 'auto',
    minWidth: 100,
    paddingHorizontal: SPACING.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.background.secondary,
  },
});

/**
 * 🎯 Performance Optimization
 */
export const MemoizedSkillsLayout = React.memo(SkillsLayout);

/**
 * 🚀 Type Definitions
 */
/**
 * @typedef {Object} Skill
 * @property {string} id - Unique skill identifier
 * @property {string} name - Skill name
 * @property {string} category - Skill category
 * @property {string} description - Skill description
 * @property {number} difficulty - Skill difficulty level (1-5)
 * @property {number} duration - Duration in months
 * @property {number} earningPotential - Monthly earning potential in ETB
 * @property {string[]} prerequisites - Required prerequisites
 * @property {Object} certification - Certification details
 * @property {string} icon - Skill icon
 * @property {string} color - Skill color
 */

/**
 * @typedef {Object} SkillCategory
 * @property {string} id - Category identifier
 * @property {string} name - Category name
 * @property {string} description - Category description
 * @property {string} icon - Category icon
 * @property {string} color - Category color
 * @property {Skill[]} skills - Skills in this category
 */

/**
 * 🎯 Export Types for TypeScript/Flow
 */
export type { Skill, SkillCategory };

/**
 * 🎯 Default Export
 */
export default MemoizedSkillsLayout;