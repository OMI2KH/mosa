// src/navigation/Navigation.jsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Import all enhanced screens
import HomeScreen from '../screens/HomeScreen';
import LessonsScreen from '../screens/LessonsScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SurveyScreen from '../screens/SurveyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ToDoScreen from '../screens/TodoScreen';
import TribeDashboardScreen from '../screens/TribeDashboardScreen';

// Import new gamified screens
import LessonDetailScreen from '../screens/LessonDetailScreen';
import QuizScreen from '../screens/QuizScreen';
import SkillTreeScreen from '../screens/SkillTreeScreen';
import AchievementScreen from '../screens/AchievementScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tab Navigator for authenticated users
function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'flash' : 'flash-outline';
          } else if (route.name === 'Learn') {
            iconName = focused ? 'school' : 'school-outline';
          } else if (route.name === 'Skills') {
            iconName = focused ? 'build' : 'build-outline';
          } else if (route.name === 'Tasks') {
            iconName = focused ? 'checkmark-done' : 'checkmark-done-outline';
          } else if (route.name === 'Tribe') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2D5016',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: '#2D5016',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Mosa Dashboard',
          headerShown: true,
        }}
      />
      <Tab.Screen 
        name="Learn" 
        component={LessonsScreen}
        options={{
          title: 'Mosa Lessons',
          headerShown: true,
        }}
      />
      <Tab.Screen 
        name="Skills" 
        component={SkillTreeScreen}
        options={{
          title: 'Skill Tree',
          headerShown: true,
        }}
      />
      <Tab.Screen 
        name="Tasks" 
        component={ToDoScreen}
        options={{
          title: 'Wealth Tasks',
          headerShown: true,
        }}
      />
      <Tab.Screen 
        name="Tribe" 
        component={TribeDashboardScreen}
        options={{
          title: 'Tribe Hub',
          headerShown: true,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'My Profile',
          headerShown: true,
        }}
      />
    </Tab.Navigator>
  );
}

// Auth Stack Navigator
function AuthStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen 
        name="Survey" 
        component={SurveyScreen}
        options={{
          headerShown: true,
          title: 'Discover Your Archetype',
          headerStyle: {
            backgroundColor: '#2D5016',
          },
          headerTintColor: '#FFFFFF',
        }}
      />
    </Stack.Navigator>
  );
}

// Main App Navigator with proper routing
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Auth"
        screenOptions={{ headerShown: false }}
      >
        {/* Auth Flow */}
        <Stack.Screen name="Auth" component={AuthStackNavigator} />
        
        {/* Main App Flow */}
        <Stack.Screen name="Main" component={MainTabNavigator} />
        
        {/* Modal Screens */}
        <Stack.Screen 
          name="LessonDetail" 
          component={LessonDetailScreen}
          options={{
            headerShown: true,
            title: 'Lesson Details',
            headerStyle: {
              backgroundColor: '#2D5016',
            },
            headerTintColor: '#FFFFFF',
            presentation: 'modal',
          }}
        />
        
        <Stack.Screen 
          name="Quiz" 
          component={QuizScreen}
          options={{
            headerShown: true,
            title: 'Knowledge Check',
            headerStyle: {
              backgroundColor: '#2D5016',
            },
            headerTintColor: '#FFFFFF',
            presentation: 'modal',
          }}
        />
        
        <Stack.Screen 
          name="Achievements" 
          component={AchievementScreen}
          options={{
            headerShown: true,
            title: 'My Achievements',
            headerStyle: {
              backgroundColor: '#2D5016',
            },
            headerTintColor: '#FFFFFF',
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Custom navigation utilities
export const navigationUtils = {
  // Navigate to lesson completion with XP reward
  navigateToLessonCompletion: (navigation, lesson, xpEarned) => {
    navigation.navigate('LessonDetail', {
      lesson,
      xpEarned,
      showCompletion: true,
    });
  },

  // Navigate to skill unlock
  navigateToSkillUnlock: (navigation, skill, venture) => {
    navigation.navigate('Skills', {
      screen: 'SkillTree',
      params: {
        unlockedSkill: skill,
        venture,
        showCelebration: true,
      },
    });
  },

  // Navigate to venture unlock
  navigateToVentureUnlock: (navigation, venture) => {
    navigation.navigate('Home', {
      unlockedVenture: venture,
      showCelebration: true,
    });
  },

  // Navigate to achievement unlock
  navigateToAchievementUnlock: (navigation, achievement) => {
    navigation.navigate('Achievements', {
      unlockedAchievement: achievement,
    });
  },

  // Reset navigation to home
  resetToHome: (navigation) => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  },

  // Navigate to auth flow
  navigateToAuth: (navigation) => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  },
};

// Navigation constants
export const NAVIGATION_ROUTES = {
  AUTH: {
    LOGIN: 'Login',
    REGISTER: 'Register',
    SURVEY: 'Survey',
  },
  MAIN: {
    HOME: 'Home',
    LEARN: 'Learn',
    SKILLS: 'Skills',
    TASKS: 'Tasks',
    TRIBE: 'Tribe',
    PROFILE: 'Profile',
  },
  MODALS: {
    LESSON_DETAIL: 'LessonDetail',
    QUIZ: 'Quiz',
    ACHIEVEMENTS: 'Achievements',
  },
};

// Screen options configuration
export const SCREEN_OPTIONS = {
  DEFAULT_HEADER: {
    headerStyle: {
      backgroundColor: '#2D5016',
    },
    headerTintColor: '#FFFFFF',
    headerTitleStyle: {
      fontWeight: 'bold',
      fontSize: 18,
    },
  },
  MODAL: {
    presentation: 'modal',
    animation: 'slide_from_bottom',
  },
  FULL_SCREEN_MODAL: {
    presentation: 'fullScreenModal',
    animation: 'slide_from_bottom',
  },
};
