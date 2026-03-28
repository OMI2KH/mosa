/**
 * 🏢 MOSA FORGE - Enterprise Expert Matching Preferences
 * 🎯 AI-Powered Expert Matching & Preference Management
 * 📊 Smart Preference Learning & Optimization
 * 👥 Multi-Criteria Expert Selection Interface
 * 🚀 React Native with Expo - Enterprise Grade
 * 
 * @module MatchingPreferences
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// 🏗️ Enterprise Dependencies
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  SlideInRight,
  useAnimatedStyle,
  withSpring,
  useSharedValue
} from 'react-native-reanimated';

// 🎯 Custom Components
import PreferenceCard from '../../components/matching/PreferenceCard';
import ExpertQualityBadge from '../../components/matching/ExpertQualityBadge';
import MatchingScoreIndicator from '../../components/matching/MatchingScoreIndicator';
import SmartRecommendation from '../../components/matching/SmartRecommendation';

// 🔧 Custom Hooks
import useMatchingPreferences from '../../hooks/useMatchingPreferences';
import useExpertRecommendations from '../../hooks/useExpertRecommendations';
import useMatchingAnalytics from '../../hooks/useMatchingAnalytics';

// 📊 Constants & Config
import { MATCHING_CONFIG } from '../../constants/matchingConfig';
import { PREFERENCE_CATEGORIES } from '../../constants/preferenceCategories';

const MatchingPreferences = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // 🎯 State Management
  const [preferences, setPreferences] = useState({
    // 👥 Expert Profile Preferences
    expertProfile: {
      tier: 'any',
      minQualityScore: 4.0,
      experienceLevel: 'any',
      certificationType: 'any'
    },
    
    // 🕐 Availability Preferences
    availability: {
      preferredDays: [],
      preferredTimeSlots: [],
      timezone: 'local',
      maxResponseTime: 24, // hours
    },
    
    // 💬 Communication Preferences
    communication: {
      language: 'amharic',
      communicationStyle: 'balanced',
      feedbackFrequency: 'weekly',
      meetingFormat: ['video', 'in_person']
    },
    
    // 🎓 Learning Style Preferences
    learningStyle: {
      pace: 'moderate',
      interactionLevel: 'high',
      practicalFocus: 'balanced',
      assessmentStyle: 'project_based'
    },
    
    // 💰 Financial Preferences
    financial: {
      maxPriceSensitivity: 'standard',
      paymentSchedule: 'milestone',
      bonusExpectations: 'performance_based'
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [matchScore, setMatchScore] = useState(0);
  const [expertCount, setExpertCount] = useState(0);

  // 🎯 Custom Hooks
  const { savePreferences, loadPreferences, validatePreferences } = useMatchingPreferences();
  const { getRecommendations, calculateMatchScore } = useExpertRecommendations();
  const { trackPreferenceChange, logMatchingEvent } = useMatchingAnalytics();

  // 🎨 Animation Values
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(1);

  // 📱 Component Constants
  const skillId = params.skillId || '';
  const studentId = params.studentId || '';
  const enrollmentId = params.enrollmentId || '';

  /**
   * 📱 Load Saved Preferences
   */
  const loadSavedPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const savedPreferences = await loadPreferences(studentId, skillId);
      
      if (savedPreferences) {
        setPreferences(savedPreferences);
        
        // 🎯 Calculate initial match score
        const initialScore = await calculateMatchScore(savedPreferences, skillId);
        setMatchScore(initialScore);
        
        // 🔍 Get initial recommendations
        const initialRecommendations = await getRecommendations(savedPreferences, skillId);
        setRecommendations(initialRecommendations);
        
        // 👥 Update expert count
        setExpertCount(initialRecommendations.length);
        
        // 📊 Track preference load
        await trackPreferenceChange('load', savedPreferences);
      }
      
    } catch (error) {
      console.error('Failed to load preferences:', error);
      Alert.alert('Error', 'Failed to load saved preferences');
    } finally {
      setIsLoading(false);
    }
  }, [studentId, skillId]);

  /**
   * 🔄 Refresh Preferences
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSavedPreferences();
    setRefreshing(false);
  }, [loadSavedPreferences]);

  /**
   * 🎯 Handle Preference Change
   */
  const handlePreferenceChange = useCallback((category, key, value) => {
    // 📊 Track preference change
    trackPreferenceChange('update', { category, key, value });
    
    // 🎨 Animation feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // 🔄 Update preferences
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  }, [trackPreferenceChange]);

  /**
   * 💾 Save Preferences
   */
  const handleSavePreferences = async () => {
    try {
      setIsSaving(true);
      
      // ✅ Validate preferences
      const validation = validatePreferences(preferences);
      
      if (!validation.valid) {
        Alert.alert('Validation Error', validation.errors.join('\n'));
        return;
      }
      
      // 💾 Save to storage
      const saveResult = await savePreferences(studentId, skillId, preferences);
      
      if (saveResult.success) {
        // 🎯 Recalculate match score
        const newMatchScore = await calculateMatchScore(preferences, skillId);
        setMatchScore(newMatchScore);
        
        // 🔍 Get updated recommendations
        const newRecommendations = await getRecommendations(preferences, skillId);
        setRecommendations(newRecommendations);
        
        // 👥 Update expert count
        setExpertCount(newRecommendations.length);
        
        // 📊 Log matching event
        await logMatchingEvent('preferences_saved', {
          studentId,
          skillId,
          matchScore: newMatchScore,
          expertCount: newRecommendations.length
        });
        
        // 🎨 Success feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        Alert.alert(
          'Success',
          'Preferences saved successfully!',
          [
            {
              text: 'Continue to Matching',
              onPress: () => router.push({
                pathname: '/(matching)/expert-matching',
                params: { 
                  studentId, 
                  skillId, 
                  enrollmentId,
                  preferences: JSON.stringify(preferences)
                }
              })
            },
            {
              text: 'Stay Here',
              style: 'cancel'
            }
          ]
        );
      } else {
        throw new Error('Failed to save preferences');
      }
      
    } catch (error) {
      console.error('Failed to save preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 🧹 Reset to Default Preferences
   */
  const handleResetPreferences = () => {
    Alert.alert(
      'Reset Preferences',
      'Are you sure you want to reset all preferences to default?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            // 📊 Track reset event
            await trackPreferenceChange('reset', preferences);
            
            // 🔄 Reset to defaults
            setPreferences({
              expertProfile: {
                tier: 'any',
                minQualityScore: 4.0,
                experienceLevel: 'any',
                certificationType: 'any'
              },
              availability: {
                preferredDays: [],
                preferredTimeSlots: [],
                timezone: 'local',
                maxResponseTime: 24,
              },
              communication: {
                language: 'amharic',
                communicationStyle: 'balanced',
                feedbackFrequency: 'weekly',
                meetingFormat: ['video', 'in_person']
              },
              learningStyle: {
                pace: 'moderate',
                interactionLevel: 'high',
                practicalFocus: 'balanced',
                assessmentStyle: 'project_based'
              },
              financial: {
                maxPriceSensitivity: 'standard',
                paymentSchedule: 'milestone',
                bonusExpectations: 'performance_based'
              }
            });
            
            // 🎯 Haptic feedback
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }
      ]
    );
  };

  /**
   * 📊 Load Initial Data
   */
  useEffect(() => {
    loadSavedPreferences();
  }, [loadSavedPreferences]);

  /**
   * 🎨 Animated Styles
   */
  const animatedSaveButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
      opacity: opacityValue.value
    };
  });

  /**
   * 🎯 Render Preference Category
   */
  const renderPreferenceCategory = (categoryKey, categoryConfig) => {
    const categoryData = preferences[categoryKey];
    
    return (
      <Animated.View 
        key={categoryKey}
        entering={FadeInDown.delay(100).springify()}
        style={styles.categoryContainer}
      >
        <View style={styles.categoryHeader}>
          <MaterialIcons 
            name={categoryConfig.icon} 
            size={24} 
            color="#4F46E5" 
          />
          <Text style={styles.categoryTitle}>
            {categoryConfig.title}
          </Text>
        </View>
        
        <Text style={styles.categoryDescription}>
          {categoryConfig.description}
        </Text>
        
        <View style={styles.preferenceGrid}>
          {Object.entries(categoryConfig.fields).map(([fieldKey, fieldConfig], index) => (
            <PreferenceCard
              key={fieldKey}
              title={fieldConfig.label}
              description={fieldConfig.description}
              value={categoryData[fieldKey]}
              options={fieldConfig.options}
              type={fieldConfig.type}
              onChange={(value) => handlePreferenceChange(categoryKey, fieldKey, value)}
              disabled={isLoading || isSaving}
            />
          ))}
        </View>
      </Animated.View>
    );
  };

  /**
   * 📱 Main Render
   */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading your preferences...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 🎯 Header */}
      <Animated.View 
        entering={FadeIn.duration(500)}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={isSaving}
        >
          <Ionicons name="arrow-back" size={24} color="#4F46E5" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Expert Matching Preferences</Text>
          <Text style={styles.headerSubtitle}>
            Customize your ideal learning experience
          </Text>
        </View>
      </Animated.View>

      {/* 📊 Match Score & Stats */}
      <Animated.View 
        entering={SlideInRight.delay(200)}
        style={styles.statsContainer}
      >
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{matchScore}%</Text>
            <Text style={styles.statLabel}>Match Score</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{expertCount}</Text>
            <Text style={styles.statLabel}>Available Experts</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <ExpertQualityBadge 
              score={preferences.expertProfile.minQualityScore}
              size="medium"
            />
            <Text style={styles.statLabel}>Min Quality</Text>
          </View>
        </View>
        
        <MatchingScoreIndicator 
          score={matchScore}
          size="large"
          showLabel={true}
        />
      </Animated.View>

      {/* 🔍 Smart Recommendations */}
      {recommendations.length > 0 && (
        <Animated.View 
          entering={FadeInDown.delay(300)}
          style={styles.recommendationsContainer}
        >
          <SmartRecommendation
            recommendations={recommendations.slice(0, 3)}
            onSelectRecommendation={(rec) => {
              handlePreferenceChange(rec.category, rec.key, rec.value);
            }}
          />
        </Animated.View>
      )}

      {/* 📝 Preferences Form */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.preferencesContainer}>
          {Object.entries(PREFERENCE_CATEGORIES).map(([categoryKey, categoryConfig]) => 
            renderPreferenceCategory(categoryKey, categoryConfig)
          )}
        </View>
      </ScrollView>

      {/* 💾 Action Buttons */}
      <Animated.View 
        style={[styles.actionContainer, animatedSaveButtonStyle]}
        entering={FadeInUp.delay(400)}
      >
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={handleResetPreferences}
            disabled={isSaving}
          >
            <Ionicons name="refresh" size={20} color="#6B7280" />
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSavePreferences}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  Save & Continue to Matching
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        <Text style={styles.footerText}>
          Your preferences help us match you with the perfect expert for optimal learning outcomes
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
};

/**
 * 🎨 Styles
 */
const styles = StyleSheet.create({
  // 🏗️ Container Styles
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  
  // 🎯 Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  
  headerContent: {
    flex: 1,
  },
  
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter-Bold',
  },
  
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Inter-Regular',
  },
  
  // 📊 Stats Styles
  statsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Inter-Bold',
  },
  
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: 'Inter-Regular',
  },
  
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  
  // 🔍 Recommendations Styles
  recommendationsContainer: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  
  // 📝 Preferences Styles
  scrollView: {
    flex: 1,
  },
  
  preferencesContainer: {
    padding: 20,
  },
  
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 12,
    fontFamily: 'Inter-SemiBold',
  },
  
  categoryDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  
  preferenceGrid: {
    gap: 12,
  },
  
  // 💾 Action Styles
  actionContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
  },
  
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
  },
  
  resetButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
    fontFamily: 'Inter-SemiBold',
  },
  
  saveButton: {
    backgroundColor: '#4F46E5',
  },
  
  saveButtonDisabled: {
    backgroundColor: '#A5B4FC',
    opacity: 0.8,
  },
  
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
    fontFamily: 'Inter-SemiBold',
  },
  
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'Inter-Regular',
  },
});

export default MatchingPreferences;