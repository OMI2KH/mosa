import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  SafeAreaView 
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useStore } from '../store/useStore';

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { 
    user, 
    tribe, 
    level, 
    setTribe, 
    setLevel,
    xp,
    currentStreak,
    unlockedVentures,
    getUserLevel,
    getVentureProgress,
    lessons,
    loadLessons
  } = useStore();

  const [refreshing, setRefreshing] = useState(false);
  const [dailyGoal, setDailyGoal] = useState(1); // 1 lesson per day
  const [motivationalQuote, setMotivationalQuote] = useState('');

  const userLevel = getUserLevel();
  const mosaProgress = getVentureProgress('mosa');
  const completedToday = checkCompletedToday();

  const motivationalQuotes = [
    "Every ETB you earn today builds the foundation for tomorrow's wealth.",
    "Small skills mastered today create big opportunities tomorrow.",
    "Your financial freedom is built one lesson at a time.",
    "The wealthiest people started exactly where you are now.",
    "Every skill learned is money earned waiting to happen."
  ];

  useEffect(() => {
    initializeHomeScreen();
    setMotivationalQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  }, []);

  const initializeHomeScreen = async () => {
    try {
      const res = await api.get('/tribes');
      if (res.data.length > 0) {
        setTribe(res.data[0]);
        setLevel(res.data[0].level);
      }
      
      // Load lessons if not already loaded
      if (!lessons.mosa || lessons.mosa.length === 0) {
        await loadLessons('mosa');
      }
    } catch (error) {
      console.error('Home screen initialization error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initializeHomeScreen();
    setRefreshing(false);
  };

  function checkCompletedToday() {
    const today = new Date().toDateString();
    const allLessons = Object.values(lessons).flat();
    return allLessons.some(lesson => 
      lesson.completed && new Date(lesson.completedAt).toDateString() === today
    );
  }

  const getNextVenture = () => {
    if (!unlockedVentures.includes('yachi')) return 'Yachi Marketplace';
    if (!unlockedVentures.includes('chereka')) return 'Chereka Creative';
    if (!unlockedVentures.includes('sifr')) return 'Sifr Tech';
    return 'All Ventures Unlocked!';
  };

  const getNextVentureRequirements = () => {
    if (!unlockedVentures.includes('yachi')) {
      const needed = 5 - mosaProgress.completed;
      return `${needed} more lesson${needed !== 1 ? 's' : ''} to unlock`;
    }
    if (!unlockedVentures.includes('chereka')) {
      const needed = 500 - xp;
      return `${needed} more XP to unlock`;
    }
    if (!unlockedVentures.includes('sifr')) {
      const needed = 1000 - xp;
      return `${needed} more XP to unlock`;
    }
    return 'Master of Hayat Grid!';
  };

  const QuickActionButton = ({ icon, title, subtitle, onPress, color = '#2D5016' }) => (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#FFFFFF" />
      </View>
      <View style={styles.actionText}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>
              {t('welcome')}, {user?.name?.split(' ')[0] || t('guest')}! 👋
            </Text>
            <Text style={styles.welcomeSubtitle}>{motivationalQuote}</Text>
          </View>
          
          <View style={styles.levelSection}>
            <View style={styles.levelBadge}>
              <Ionicons name="flash" size={16} color="#FFFFFF" />
              <Text style={styles.levelText}>{userLevel}</Text>
            </View>
          </View>
        </View>

        {/* Daily Progress */}
        <View style={styles.dailyProgress}>
          <View style={styles.dailyProgressHeader}>
            <Text style={styles.dailyProgressTitle}>Today's Progress</Text>
            <View style={styles.streakContainer}>
              <Ionicons name="flame" size={16} color="#EF4444" />
              <Text style={styles.streakText}>{currentStreak} day streak</Text>
            </View>
          </View>
          
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${(completedToday ? 1 : 0) / dailyGoal * 100}%` }
              ]} 
            />
          </View>
          
          <Text style={styles.dailyGoalText}>
            {completedToday ? '🎉 Daily goal completed!' : `Complete 1 lesson to maintain streak`}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            title="Total XP"
            value={xp}
            subtitle="Experience Points"
            icon="star"
            color="#F59E0B"
          />
          <StatCard
            title="Lessons"
            value={mosaProgress.completed}
            subtitle={`${mosaProgress.total} total`}
            icon="book"
            color="#3B82F6"
          />
          <StatCard
            title="Skills"
            value={Object.values(lessons).flat().filter(l => l.completed && l.type === 'skill').length}
            subtitle="Practical skills"
            icon="build"
            color="#10B981"
          />
          <StatCard
            title="Ventures"
            value={unlockedVentures.length}
            subtitle="Unlocked apps"
            icon="apps"
            color="#8B5CF6"
          />
        </View>

        {/* Next Venture Unlock */}
        <View style={styles.nextVenture}>
          <Text style={styles.nextVentureTitle}>Next Venture: {getNextVenture()}</Text>
          <Text style={styles.nextVentureSubtitle}>{getNextVentureRequirements()}</Text>
          <View style={styles.ventureProgress}>
            <View style={styles.ventureProgressBar}>
              <View 
                style={[
                  styles.ventureProgressFill,
                  { 
                    width: `${unlockedVentures.includes('yachi') ? 
                      unlockedVentures.includes('chereka') ?
                        unlockedVentures.includes('sifr') ? 100 : 66
                      : 33
                    : 0}%`
                  }
                ]} 
              />
            </View>
            <View style={styles.ventureMarkers}>
              <View style={[styles.ventureMarker, unlockedVentures.includes('mosa') && styles.ventureMarkerActive]}>
                <Text style={styles.ventureMarkerText}>Mosa</Text>
              </View>
              <View style={[styles.ventureMarker, unlockedVentures.includes('yachi') && styles.ventureMarkerActive]}>
                <Text style={styles.ventureMarkerText}>Yachi</Text>
              </View>
              <View style={[styles.ventureMarker, unlockedVentures.includes('chereka') && styles.ventureMarkerActive]}>
                <Text style={styles.ventureMarkerText}>Chereka</Text>
              </View>
              <View style={[styles.ventureMarker, unlockedVentures.includes('sifr') && styles.ventureMarkerActive]}>
                <Text style={styles.ventureMarkerText}>Sifr</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <QuickActionButton
            icon="school"
            title="Continue Learning"
            subtitle={`${mosaProgress.total - mosaProgress.completed} lessons remaining`}
            onPress={() => navigation.navigate('Lessons')}
            color="#2D5016"
          />
          
          <QuickActionButton
            icon="trending-up"
            title="Skill Tree"
            subtitle="View your progress and unlocks"
            onPress={() => navigation.navigate('SkillTree')}
            color="#D4A017"
          />

          {unlockedVentures.includes('yachi') && (
            <QuickActionButton
              icon="storefront"
              title="Yachi Marketplace"
              subtitle="Start earning from your skills"
              onPress={() => Alert.alert('Yachi', 'Launching Yachi Marketplace...')}
              color="#10B981"
            />
          )}

          <QuickActionButton
            icon="people"
            title="Tribe Dashboard"
            subtitle={`${tribe?.name || 'Join a tribe'}`}
            onPress={() => navigation.navigate('TribeDashboard')}
            color="#3B82F6"
          />

          <QuickActionButton
            icon="trophy"
            title="Achievements"
            subtitle="View your badges and rewards"
            onPress={() => navigation.navigate('Achievements')}
            color="#F59E0B"
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.recentActivity}>
          <Text style={styles.sectionTitle}>Recent Progress</Text>
          {lessons.mosa && lessons.mosa.filter(l => l.completed).slice(-3).reverse().map(lesson => (
            <View key={lesson.id} style={styles.activityItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <View style={styles.activityText}>
                <Text style={styles.activityTitle}>{lesson.title}</Text>
                <Text style={styles.activitySubtitle}>+{lesson.xp} XP • {lesson.type}</Text>
              </View>
            </View>
          ))}
          {lessons.mosa && lessons.mosa.filter(l => l.completed).length === 0 && (
            <Text style={styles.noActivityText}>
              Complete your first lesson to see progress here!
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  levelSection: {
    marginLeft: 12,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4A017',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  dailyProgress: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dailyProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyProgressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5016',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
    marginLeft: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  dailyGoalText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    margin: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  nextVenture: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nextVentureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 4,
  },
  nextVentureSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  ventureProgress: {
    marginBottom: 8,
  },
  ventureProgressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  ventureProgressFill: {
    height: '100%',
    backgroundColor: '#D4A017',
    borderRadius: 3,
  },
  ventureMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ventureMarker: {
    alignItems: 'center',
    opacity: 0.5,
  },
  ventureMarkerActive: {
    opacity: 1,
  },
  ventureMarkerText: {
    fontSize: 10,
    color: '#2D5016',
    fontWeight: '600',
  },
  quickActions: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 16,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5016',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  recentActivity: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityText: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D5016',
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  noActivityText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});