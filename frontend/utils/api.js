import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const api = axios.create({
  baseURL: Constants.expoConfig?.extra?.apiUrl || 'http://localhost:5001/api',
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await api.post('/auth/refresh', { refreshToken });
          await AsyncStorage.setItem('token', data.token);
          error.config.headers.Authorization = `Bearer ${data.token}`;
          return api(error.config);
        } catch (refreshError) {
          await AsyncStorage.clear();
          // For React Native, you might want to use navigation instead
          // navigation.navigate('Login');
          console.log('Token expired, please login again');
        }
      }
    }
    return Promise.reject(error);
  }
);

// NEW: Gamification API Endpoints

export const lessonsAPI = {
  // Get all lessons for a specific venture
  getByVenture: (venture) => api.get(`/lessons?venture=${venture}`),
  
  // Get a specific lesson
  getById: (lessonId) => api.get(`/lessons/${lessonId}`),
  
  // Mark lesson as completed
  completeLesson: (lessonId, userId) => 
    api.post(`/lessons/${lessonId}/complete`, { userId }),
  
  // Get user's lesson progress
  getProgress: (userId) => api.get(`/users/${userId}/progress`),
  
  // Get recommended next lessons
  getRecommendations: (userId) => api.get(`/users/${userId}/recommendations`),
};

export const userAPI = {
  // Update user XP
  updateXP: (userId, xp) => api.patch(`/users/${userId}/xp`, { xp }),
  
  // Update user streak
  updateStreak: (userId, streak) => api.patch(`/users/${userId}/streak`, { streak }),
  
  // Unlock new venture
  unlockVenture: (userId, venture) => api.post(`/users/${userId}/unlock-venture`, { venture }),
  
  // Get user achievements
  getAchievements: (userId) => api.get(`/users/${userId}/achievements`),
  
  // Add achievement
  addAchievement: (userId, achievementId) => 
    api.post(`/users/${userId}/achievements`, { achievementId }),
};

export const skillsAPI = {
  // Get skill progress
  getSkillProgress: (userId, skill) => 
    api.get(`/users/${userId}/skills/${skill}`),
  
  // Update skill progress
  updateSkillProgress: (userId, skill, progress) => 
    api.patch(`/users/${userId}/skills/${skill}`, { progress }),
};

export const venturesAPI = {
  // Get unlocked ventures
  getUnlockedVentures: (userId) => api.get(`/users/${userId}/ventures`),
  
  // Check if venture is accessible
  checkVentureAccess: (userId, venture) => 
    api.get(`/users/${userId}/ventures/${venture}/access`),
};

// NEW: Yachi Marketplace Integration
export const yachiAPI = {
  // Auto-list user in Yachi after completing relevant Mosa lessons
  createServiceProfile: (userId, skills) => 
    api.post('/yachi/service-providers', { userId, skills }),
  
  // Get user's Yachi service profile
  getServiceProfile: (userId) => 
    api.get(`/yachi/service-providers/${userId}`),
  
  // Update service availability
  updateAvailability: (userId, available) => 
    api.patch(`/yachi/service-providers/${userId}/availability`, { available }),
};

// NEW: Analytics for gamification
export const analyticsAPI = {
  trackLessonStart: (userId, lessonId) => 
    api.post('/analytics/lesson-start', { userId, lessonId }),
  
  trackLessonComplete: (userId, lessonId, timeSpent) => 
    api.post('/analytics/lesson-complete', { userId, lessonId, timeSpent }),
  
  trackAppOpen: (userId) => 
    api.post('/analytics/app-open', { userId }),
};

// NEW: Content Focus Engine Integration
export const focusAPI = {
  // Block distracting apps during learning sessions
  startFocusSession: (userId, duration) => 
    api.post('/focus/sessions', { userId, duration }),
  
  endFocusSession: (sessionId) => 
    api.patch(`/focus/sessions/${sessionId}/end`),
  
  getFocusStats: (userId) => 
    api.get(`/users/${userId}/focus-stats`),
};

export default api;