import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NativeWindStyleSheet } from 'nativewind';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nextProvider } from 'react-i18next';
import i18n from './src/utils/i18n';
import { useStore } from './src/store/useStore';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SurveyScreen from './src/screens/SurveyScreen';
import HomeScreen from './src/screens/HomeScreen';
import TribeDashboardScreen from './src/screens/TribeDashboardScreen';
import LessonsScreen from './src/screens/LessonsScreen';
import ToDoScreen from './src/screens/TodoScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DownloadScreen from './src/screens/DownloadScreen';

// NEW: Gamified Lesson Screens
import LessonDetailScreen from './src/screens/LessonDetailScreen';
import QuizScreen from './src/screens/QuizScreen';
import SkillTreeScreen from './src/screens/SkillTreeScreen';
import AchievementScreen from './src/screens/AchievementScreen';

NativeWindStyleSheet.setOutput({ default: 'native' });

const Stack = createNativeStackNavigator();

export default function App() {
  const { setUser, loadLessons, checkDailyStreak } = useStore();
  const [loading, setLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Home'>('Login');

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          setUser(user);
          
          // NEW: Load user's lesson progress and check streak
          await loadLessons('mosa');
          await checkDailyStreak();
          
          setInitialRoute('Home');
        }
      } catch (err) {
        console.log('Failed to load user from storage', err);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();

    // NEW: Configure notifications for gamification
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // NEW: Schedule daily reminder notifications
    scheduleDailyReminders();
  }, []);

  // NEW: Function to schedule gamification notifications
  const scheduleDailyReminders = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔥 Don't break your streak!",
        body: "Complete a Mosa lesson today to keep your streak alive!",
        data: { screen: 'Lessons' },
      },
      trigger: {
        hour: 18, // 6 PM
        minute: 0,
        repeats: true,
      },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-primary/10">
        <StatusBar barStyle="dark-content" backgroundColor="#D4A017" />
        <ActivityIndicator size="large" color="#2D5016" />
        <Text className="mt-4 text-primary font-bold text-lg">Loading Mosa...</Text>
        <Text className="mt-2 text-gray-600">Building your wealth journey</Text>
      </View>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <StatusBar barStyle="dark-content" backgroundColor="#D4A017" />
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute}>
          {/* Auth Flow */}
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Survey" component={SurveyScreen} options={{ title: 'Forge Your Path' }} />
          
          {/* Main Mosa App Flow */}
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ 
              title: 'Mosa Forge',
              headerStyle: {
                backgroundColor: '#D4A017',
              },
              headerTintColor: '#fff',
            }} 
          />
          
          {/* NEW: Gamified Learning Flow */}
          <Stack.Screen 
            name="Lessons" 
            component={LessonsScreen} 
            options={{ 
              title: 'Mosa Lessons',
              headerStyle: {
                backgroundColor: '#2D5016',
              },
              headerTintColor: '#fff',
            }} 
          />
          <Stack.Screen 
            name="LessonDetail" 
            component={LessonDetailScreen} 
            options={({ route }) => ({ 
              title: route.params?.lesson?.title || 'Lesson',
              headerStyle: {
                backgroundColor: '#2D5016',
              },
              headerTintColor: '#fff',
            })} 
          />
          <Stack.Screen 
            name="Quiz" 
            component={QuizScreen} 
            options={{ 
              title: 'Lesson Quiz',
              headerStyle: {
                backgroundColor: '#2D5016',
              },
              headerTintColor: '#fff',
            }} 
          />
          <Stack.Screen 
            name="SkillTree" 
            component={SkillTreeScreen} 
            options={{ 
              title: 'Skill Tree',
              headerStyle: {
                backgroundColor: '#2D5016',
              },
              headerTintColor: '#fff',
            }} 
          />
          <Stack.Screen 
            name="Achievements" 
            component={AchievementScreen} 
            options={{ 
              title: 'Achievements',
              headerStyle: {
                backgroundColor: '#2D5016',
              },
              headerTintColor: '#fff',
            }} 
          />
          
          {/* Existing Screens */}
          <Stack.Screen name="TribeDashboard" component={TribeDashboardScreen} options={{ title: 'Tribe Dashboard' }} />
          <Stack.Screen name="ToDo" component={ToDoScreen} options={{ title: 'To-Dos' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
          <Stack.Screen name="Download" component={DownloadScreen} options={{ title: 'Download' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </I18nextProvider>
  );
}