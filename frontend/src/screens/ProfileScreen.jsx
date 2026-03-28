import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useStore } from '../store/useStore';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { 
    user, 
    xp, 
    currentStreak, 
    unlockedVentures, 
    achievements,
    getUserLevel,
    getVentureProgress,
    lessons
  } = useStore();

  const [subscription, setSubscription] = useState(null);
  const [prayers, setPrayers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const userLevel = getUserLevel();
  const mosaProgress = getVentureProgress('mosa');
  const totalLessonsCompleted = Object.values(lessons).flat().filter(l => l.completed).length;

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const [subRes, prayerRes] = await Promise.all([
        api.get('/subscriptions'),
        api.get('/prayers')
      ]);
      
      setSubscription(subRes.data || null);
      setPrayers(prayerRes.data || []);
    } catch (error) {
      console.error('Profile fetch error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfileData();
    setRefreshing(false);
  };

  const subscribe = async () => {
    try {
      const res = await api.post('/subscriptions/create', {
        paymentMethod: 'telebirr',
        plan: 'basic',
      });
      setSubscription(res.data.subscription);
      Alert.alert(t('success'), t('subscribe_49_etb') + ' – Forge unlocked.');
    } catch (err) {
      Alert.alert(
        t('error'),
        err.response?.data?.error || t('subscription_failed')
      );
    }
  };

  const schedulePrayers = async () => {
    try {
      await api.post('/prayers/schedule');
      const res = await api.get('/prayers');
      setPrayers(res.data || []);
      Alert.alert(t('success'), t('prayer_scheduled'));
    } catch (err) {
      Alert.alert(
        t('error'),
        err.response?.data?.error || t('prayer_schedule_failed')
      );
    }
  };

  const StatCircle = ({ value, label, color = '#2D5016' }) => (
    <View style={styles.statCircle}>
      <View style={[styles.statCircleInner, { borderColor: color }]}>
        <Text style={[styles.statCircleValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.statCircleLabel}>{label}</Text>
    </View>
  );

  const AchievementBadge = ({ icon, title, description, unlocked, color }) => (
    <View style={[styles.achievementBadge, !unlocked && styles.achievementLocked]}>
      <View style={[styles.achievementIcon, { backgroundColor: unlocked ? color : '#E5E7EB' }]}>
        <Ionicons name={icon} size={20} color={unlocked ? '#FFFFFF' : '#9CA3AF'} />
      </View>
      <View style={styles.achievementText}>
        <Text style={[styles.achievementTitle, !unlocked && styles.achievementTitleLocked]}>
          {title}
        </Text>
        <Text style={styles.achievementDescription}>{description}</Text>
      </View>
      {unlocked ? (
        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
      ) : (
        <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
      )}
    </View>
  );

  const VentureCard = ({ venture, unlocked, progress }) => (
    <View style={[styles.ventureCard, unlocked && styles.ventureCardUnlocked]}>
      <View style={styles.ventureHeader}>
        <View style={styles.ventureIconContainer}>
          <Ionicons 
            name={getVentureIcon(venture)} 
            size={24} 
            color={unlocked ? getVentureColor(venture) : '#9CA3AF'} 
          />
        </View>
        <View style={styles.ventureInfo}>
          <Text style={[styles.ventureName, unlocked && styles.ventureNameUnlocked]}>
            {getVentureName(venture)}
          </Text>
          <Text style={styles.ventureDescription}>
            {getVentureDescription(venture)}
          </Text>
        </View>
        {unlocked ? (
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        ) : (
          <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
        )}
      </View>
      {unlocked && progress && (
        <View style={styles.ventureProgress}>
          <Text style={styles.ventureProgressText}>
            {progress.completed}/{progress.total} lessons
          </Text>
          <View style={styles.ventureProgressBar}>
            <View 
              style={[
                styles.ventureProgressFill, 
                { width: `${progress.percentage}%`, backgroundColor: getVentureColor(venture) }
              ]} 
            />
          </View>
        </View>
      )}
    </View>
  );

  const getVentureIcon = (venture) => {
    const icons = {
      mosa: 'flash',
      yachi: 'storefront',
      chereka: 'color-palette',
      sifr: 'code-slash',
      azmera: 'people'
    };
    return icons[venture] || 'cube';
  };

  const getVentureColor = (venture) => {
    const colors = {
      mosa: '#D4A017',
      yachi: '#10B981',
      chereka: '#8B5CF6',
      sifr: '#3B82F6',
      azmera: '#EF4444'
    };
    return colors[venture] || '#6B7280';
  };

  const getVentureName = (venture) => {
    const names = {
      mosa: 'Mosa',
      yachi: 'Yachi Marketplace',
      chereka: 'Chereka Creative',
      sifr: 'Sifr Tech',
      azmera: 'Azmera Relationships'
    };
    return names[venture] || venture;
  };

  const getVentureDescription = (venture) => {
    const descriptions = {
      mosa: 'Wealth Building & Skills',
      yachi: 'Home Services Marketplace',
      chereka: 'Creative Work & Branding',
      sifr: 'Tech Creation & Innovation',
      azmera: 'Relationships & Community'
    };
    return descriptions[venture] || 'Hayat Grid Venture';
  };

  const renderOverviewTab = () => (
    <>
      {/* User Info Card */}
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || t('guest')}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.levelBadge}>
              <Ionicons name="flash" size={16} color="#FFFFFF" />
              <Text style={styles.levelText}>Level {userLevel}</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCircle value={xp} label="Total XP" color="#F59E0B" />
          <StatCircle value={currentStreak} label="Day Streak" color="#EF4444" />
          <StatCircle value={totalLessonsCompleted} label="Lessons" color="#3B82F6" />
          <StatCircle value={unlockedVentures.length} label="Ventures" color="#10B981" />
        </View>
      </View>

      {/* Mosa Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mosa Progress</Text>
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Wealth Building Journey</Text>
            <Text style={styles.progressPercent}>{Math.round(mosaProgress.percentage)}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${mosaProgress.percentage}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {mosaProgress.completed} of {mosaProgress.total} lessons completed
          </Text>
        </View>
      </View>

      {/* Venture Unlocks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hayat Grid Ventures</Text>
        {['mosa', 'yachi', 'chereka', 'sifr', 'azmera'].map(venture => (
          <VentureCard
            key={venture}
            venture={venture}
            unlocked={unlockedVentures.includes(venture)}
            progress={getVentureProgress(venture)}
          />
        ))}
      </View>
    </>
  );

  const renderAchievementsTab = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Achievements & Badges</Text>
      
      <AchievementBadge
        icon="school"
        title="First Lesson"
        description="Complete your first Mosa lesson"
        unlocked={totalLessonsCompleted > 0}
        color="#3B82F6"
      />
      
      <AchievementBadge
        icon="flame"
        title="Week Warrior"
        description="Maintain a 7-day streak"
        unlocked={currentStreak >= 7}
        color="#EF4444"
      />
      
      <AchievementBadge
        icon="star"
        title="XP Master"
        description="Reach 1000 total XP"
        unlocked={xp >= 1000}
        color="#F59E0B"
      />
      
      <AchievementBadge
        icon="storefront"
        title="Market Ready"
        description="Unlock Yachi Marketplace"
        unlocked={unlockedVentures.includes('yachi')}
        color="#10B981"
      />
      
      <AchievementBadge
        icon="build"
        title="Skill Master"
        description="Complete 10 practical skills lessons"
        unlocked={lessons.mosa?.filter(l => l.completed && l.type === 'skill').length >= 10}
        color="#8B5CF6"
      />
    </View>
  );

  const renderSettingsTab = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account & Settings</Text>
      
      {/* Subscription */}
      <View style={styles.settingCard}>
        <View style={styles.settingHeader}>
          <Ionicons name="card" size={24} color="#D4A017" />
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Subscription</Text>
            <Text style={styles.settingSubtitle}>
              {subscription ? `${subscription.plan} (${subscription.status})` : t('free_upgrade')}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.settingButton} onPress={subscribe}>
          <Text style={styles.settingButtonText}>
            {subscription ? 'Manage' : 'Upgrade for 49 ETB'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Prayers */}
      <View style={styles.settingCard}>
        <View style={styles.settingHeader}>
          <Ionicons name="time" size={24} color="#2D5016" />
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Prayer Reminders</Text>
            <Text style={styles.settingSubtitle}>
              {prayers.length > 0 ? `${prayers.length} scheduled` : 'No prayers scheduled'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.settingButton} onPress={schedulePrayers}>
          <Text style={styles.settingButtonText}>
            {prayers.length > 0 ? 'Reschedule' : 'Schedule Prayers'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Archetype */}
      <View style={styles.settingCard}>
        <View style={styles.settingHeader}>
          <Ionicons name="person" size={24} color="#3B82F6" />
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Learning Archetype</Text>
            <Text style={styles.settingSubtitle}>
              {user?.archetype || t('awaiting_forge')}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.settingButton}>
          <Text style={styles.settingButtonText}>Retake Survey</Text>
        </TouchableOpacity>
      </View>

      {/* Credits */}
      <View style={styles.settingCard}>
        <View style={styles.settingHeader}>
          <Ionicons name="wallet" size={24} color="#10B981" />
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Account Credits</Text>
            <Text style={styles.settingSubtitle}>
              {user?.credits || 0} ETB available
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.settingButton}>
          <Text style={styles.settingButtonText}>Add Credits</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['overview', 'achievements', 'settings'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'achievements' && renderAchievementsTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D5016',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#2D5016',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#2D5016',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D4A017',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#2D5016',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCircle: {
    alignItems: 'center',
  },
  statCircleInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statCircleValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statCircleLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 16,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5016',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
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
    backgroundColor: '#D4A017',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
  },
  ventureCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    opacity: 0.7,
  },
  ventureCardUnlocked: {
    opacity: 1,
  },
  ventureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ventureIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  ventureInfo: {
    flex: 1,
    marginLeft: 12,
  },
  ventureName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  ventureNameUnlocked: {
    color: '#2D5016',
  },
  ventureDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  ventureProgress: {
    marginTop: 12,
  },
  ventureProgressText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  ventureProgressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  ventureProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  achievementLocked: {
    opacity: 0.7,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  achievementText: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5016',
    marginBottom: 2,
  },
  achievementTitleLocked: {
    color: '#9CA3AF',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingInfo: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5016',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingButton: {
    backgroundColor: '#2D5016',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  settingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});