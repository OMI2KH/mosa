import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert 
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import api, { lessonsAPI } from '../utils/api';

export default function LessonsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { 
    lessons, 
    xp, 
    currentStreak, 
    completeLesson, 
    getVentureProgress,
    getUserLevel,
    unlockedVentures 
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [mosaLessons, setMosaLessons] = useState([]);

  // Categories for Mosa lessons
  const categories = [
    { id: 'all', name: 'All Skills', icon: 'apps', color: '#6B7280' },
    { id: 'money', name: 'Money Making', icon: 'cash', color: '#10B981' },
    { id: 'preserve', name: 'Wealth Preservation', icon: 'shield-checkmark', color: '#3B82F6' },
    { id: 'multiply', name: 'Wealth Multiplication', icon: 'trending-up', color: '#8B5CF6' },
    { id: 'skill', name: 'Practical Skills', icon: 'build', color: '#F59E0B' },
    { id: 'trading', name: 'Forex Trading', icon: 'bar-chart', color: '#EF4444' },
  ];

  useEffect(() => {
    loadMosaLessons();
  }, []);

  const loadMosaLessons = async () => {
    try {
      // If lessons aren't loaded in store, fetch them
      if (!lessons.mosa || lessons.mosa.length === 0) {
        const response = await lessonsAPI.getByVenture('mosa');
        const formattedLessons = response.data.map(lesson => ({
          ...lesson,
          completed: false,
          xpEarned: 0
        }));
        setMosaLessons(formattedLessons);
      } else {
        setMosaLessons(lessons.mosa);
      }
    } catch (error) {
      console.error('Failed to fetch Mosa lessons:', error);
      Alert.alert('Error', 'Failed to load lessons. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLessons = selectedCategory === 'all' 
    ? mosaLessons 
    : mosaLessons.filter(lesson => lesson.type === selectedCategory);

  const handleLessonPress = (lesson) => {
    if (lesson.completed) {
      Alert.alert('Lesson Completed', 'You have already completed this lesson! 🔥');
      return;
    }

    navigation.navigate('LessonDetail', { 
      lesson,
      venture: 'mosa',
      onComplete: () => handleLessonComplete(lesson.id)
    });
  };

  const handleLessonComplete = async (lessonId) => {
    await completeLesson('mosa', lessonId);
    // Refresh lessons to show completion
    loadMosaLessons();
  };

  const getCategoryProgress = (categoryId) => {
    const categoryLessons = categoryId === 'all' 
      ? mosaLessons 
      : mosaLessons.filter(lesson => lesson.type === categoryId);
    
    const completed = categoryLessons.filter(lesson => lesson.completed).length;
    const total = categoryLessons.length;
    
    return total > 0 ? (completed / total) * 100 : 0;
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item.id && styles.categoryItemSelected
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Ionicons 
        name={item.icon} 
        size={20} 
        color={selectedCategory === item.id ? '#FFFFFF' : item.color} 
      />
      <Text style={[
        styles.categoryText,
        selectedCategory === item.id && styles.categoryTextSelected
      ]}>
        {item.name}
      </Text>
      <View style={styles.progressPill}>
        <Text style={styles.progressText}>
          {Math.round(getCategoryProgress(item.id))}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderLessonItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.lessonCard,
        item.completed && styles.lessonCardCompleted
      ]}
      onPress={() => handleLessonPress(item)}
    >
      <View style={styles.lessonHeader}>
        <View style={styles.lessonTitleContainer}>
          <Text style={styles.lessonTitle}>{item.title}</Text>
          {item.completed && (
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          )}
        </View>
        
        <View style={styles.xpBadge}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={styles.xpText}>{item.xp} XP</Text>
        </View>
      </View>

      <Text style={styles.lessonContent}>{item.content}</Text>

      <View style={styles.lessonFooter}>
        <View style={[
          styles.typeBadge,
          { backgroundColor: getCategoryColor(item.type) }
        ]}>
          <Text style={styles.typeText}>
            {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
          </Text>
        </View>

        {item.isGroup && (
          <View style={styles.groupBadge}>
            <Ionicons name="people" size={14} color="#3B82F6" />
            <Text style={styles.groupText}>Group Activity</Text>
          </View>
        )}

        {item.completed && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>Completed</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const getCategoryColor = (type) => {
    const colorMap = {
      money: '#10B981',
      preserve: '#3B82F6',
      multiply: '#8B5CF6',
      skill: '#F59E0B',
      trading: '#EF4444'
    };
    return colorMap[type] || '#6B7280';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D4A017" />
        <Text style={styles.loadingText}>Loading Mosa Lessons...</Text>
      </View>
    );
  }

  const userLevel = getUserLevel();
  const mosaProgress = getVentureProgress('mosa');

  return (
    <View style={styles.container}>
      {/* Header with XP and Streak */}
      <View style={styles.header}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="flash" size={20} color="#D4A017" />
            <Text style={styles.statValue}>{userLevel}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="star" size={20} color="#F59E0B" />
            <Text style={styles.statValue}>{xp}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="flame" size={20} color="#EF4444" />
            <Text style={styles.statValue}>{currentStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>

        {/* Progress to Yachi Unlock */}
        {!unlockedVentures.includes('yachi') && (
          <View style={styles.unlockContainer}>
            <Text style={styles.unlockText}>
              Complete {5 - mosaProgress.completed} more lessons to unlock Yachi Marketplace!
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(mosaProgress.completed / 5) * 100}%` }
                ]} 
              />
            </View>
          </View>
        )}
      </View>

      {/* Category Filter */}
      <View style={styles.categoriesContainer}>
        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={renderCategoryItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Lessons List */}
      <FlatList
        data={filteredLessons}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderLessonItem}
        contentContainerStyle={styles.lessonsList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No lessons found</Text>
            <Text style={styles.emptyStateSubtext}>
              Try selecting a different category
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D5016',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  unlockContainer: {
    backgroundColor: '#F0F7F4',
    padding: 12,
    borderRadius: 8,
  },
  unlockText: {
    fontSize: 14,
    color: '#2D5016',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryItemSelected: {
    backgroundColor: '#2D5016',
    borderColor: '#2D5016',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 6,
    marginRight: 8,
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  progressPill: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  progressText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2D5016',
  },
  lessonsList: {
    padding: 16,
  },
  lessonCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#D4A017',
  },
  lessonCardCompleted: {
    borderLeftColor: '#10B981',
    opacity: 0.9,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  lessonTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5016',
    flex: 1,
    marginRight: 8,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginLeft: 4,
  },
  lessonContent: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  lessonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  groupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  groupText: {
    fontSize: 10,
    color: '#3B82F6',
    marginLeft: 4,
  },
  completedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  completedText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#065F46',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
