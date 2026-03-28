import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lessonsAPI, userAPI } from '../utils/api';

export const useStore = create(
  persist(
    (set, get) => ({
      // Existing state
      user: null,
      tribe: null,
      todos: [],
      level: 'Ember',
      
      // NEW: Gamification State
      lessons: {
        mosa: [],
        sifr: [],
        yachi: [],
        chereka: [],
        azmera: []
      },
      xp: 0,
      currentStreak: 0,
      lastLessonDate: null,
      unlockedVentures: ['mosa'], // Start with Mosa unlocked
      achievements: [],
      skillProgress: {},
      
      // Existing actions
      setUser: (user) => set({ user }),
      setTribe: (tribe) => set({ tribe }),
      addTodo: (todo) =>
        set((state) => ({
          todos: Array.isArray(todo) ? [...state.todos, ...todo] : [...state.todos, todo],
        })),
      setLevel: (level) => set({ level }),
      clearStore: () =>
        set({
          user: null,
          tribe: null,
          todos: [],
          level: 'Ember',
          // NEW: Reset gamification state
          lessons: {
            mosa: [], sifr: [], yachi: [], chereka: [], azmera: []
          },
          xp: 0,
          currentStreak: 0,
          lastLessonDate: null,
          unlockedVentures: ['mosa'],
          achievements: [],
          skillProgress: {}
        }),

      // NEW: Gamification Actions
      
      // Load lessons from backend
      loadLessons: async (venture = 'mosa') => {
        try {
          const response = await lessonsAPI.getByVenture(venture);
          const lessons = response.data.map(lesson => ({
            ...lesson,
            completed: false,
            xpEarned: 0,
            completedAt: null
          }));
          
          set((state) => ({
            lessons: {
              ...state.lessons,
              [venture]: lessons
            }
          }));
        } catch (error) {
          console.error('Error loading lessons:', error);
        }
      },

      // Complete a lesson and earn XP
      completeLesson: async (venture, lessonId) => {
        const state = get();
        const lesson = state.lessons[venture]?.find(l => l.id === lessonId);
        
        if (!lesson || lesson.completed) return;

        try {
          // Update backend
          await lessonsAPI.completeLesson(lessonId, state.user?.id);
          await userAPI.updateXP(state.user?.id, lesson.xp);
          
          // Update local state
          const today = new Date().toDateString();
          const lastDate = state.lastLessonDate;
          const newStreak = lastDate === today ? state.currentStreak : 
                           lastDate === new Date(Date.now() - 86400000).toDateString() ? 
                           state.currentStreak + 1 : 1;

          set((state) => ({
            xp: state.xp + lesson.xp,
            currentStreak: newStreak,
            lastLessonDate: today,
            lessons: {
              ...state.lessons,
              [venture]: state.lessons[venture].map(l =>
                l.id === lessonId 
                  ? { ...l, completed: true, xpEarned: lesson.xp, completedAt: new Date() }
                  : l
              )
            }
          }));

          // Check for achievements and venture unlocks
          get().checkAchievements();
          get().checkVentureUnlocks();

        } catch (error) {
          console.error('Error completing lesson:', error);
        }
      },

      // Check and update daily streak
      checkDailyStreak: () => {
        const state = get();
        const today = new Date().toDateString();
        const lastDate = state.lastLessonDate;
        
        if (lastDate && lastDate !== today) {
          const yesterday = new Date(Date.now() - 86400000).toDateString();
          if (lastDate !== yesterday) {
            // Streak broken
            set({ currentStreak: 0 });
          }
        }
      },

      // Check for venture unlocks based on XP and completed lessons
      checkVentureUnlocks: () => {
        const state = get();
        const { xp, lessons } = state;
        const completedMosaLessons = lessons.mosa.filter(l => l.completed).length;
        const newUnlocks = [...state.unlockedVentures];

        // Unlock Yachi after completing 5 Mosa lessons
        if (completedMosaLessons >= 5 && !newUnlocks.includes('yachi')) {
          newUnlocks.push('yachi');
        }

        // Unlock Chereka after reaching 500 XP
        if (xp >= 500 && !newUnlocks.includes('chereka')) {
          newUnlocks.push('chereka');
        }

        // Unlock Sifr after reaching 1000 XP
        if (xp >= 1000 && !newUnlocks.includes('sifr')) {
          newUnlocks.push('sifr');
        }

        if (newUnlocks.length > state.unlockedVentures.length) {
          set({ unlockedVentures: newUnlocks });
        }
      },

      // Check for achievement unlocks
      checkAchievements: () => {
        const state = get();
        const { xp, currentStreak, lessons } = state;
        const newAchievements = [...state.achievements];
        
        // First Lesson Achievement
        const completedLessons = Object.values(lessons).flat().filter(l => l.completed).length;
        if (completedLessons === 1 && !newAchievements.includes('first_lesson')) {
          newAchievements.push('first_lesson');
        }

        // Streak Achievements
        if (currentStreak >= 7 && !newAchievements.includes('week_streak')) {
          newAchievements.push('week_streak');
        }

        // XP Achievements
        if (xp >= 1000 && !newAchievements.includes('xp_master')) {
          newAchievements.push('xp_master');
        }

        if (newAchievements.length > state.achievements.length) {
          set({ achievements: newAchievements });
        }
      },

      // Update skill progress
      updateSkillProgress: (skill, progress) => {
        set((state) => ({
          skillProgress: {
            ...state.skillProgress,
            [skill]: progress
          }
        }));
      },

      // Get user level based on XP
      getUserLevel: () => {
        const xp = get().xp;
        if (xp >= 2000) return 'Flame';
        if (xp >= 1000) return 'Blaze';
        if (xp >= 500) return 'Spark';
        if (xp >= 100) return 'Ember';
        return 'Kindling';
      },

      // Get progress for a specific venture
      getVentureProgress: (venture) => {
        const state = get();
        const ventureLessons = state.lessons[venture] || [];
        const completed = ventureLessons.filter(l => l.completed).length;
        const total = ventureLessons.length;
        
        return {
          completed,
          total,
          percentage: total > 0 ? (completed / total) * 100 : 0
        };
      }
    }),
    {
      name: 'mosa-forge-storage',
      getStorage: () => AsyncStorage, // Updated for React Native
    }
  )
);
