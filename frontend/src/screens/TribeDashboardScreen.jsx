import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  TextInput, 
  StyleSheet, 
  SafeAreaView,
  ScrollView,
  RefreshControl,
  Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useStore } from '../store/useStore';

export default function TribeDashboardScreen() {
  const { t } = useTranslation();
  const { tribe, setLevel, user, xp } = useStore();
  const [todos, setTodos] = useState([]);
  const [members, setMembers] = useState([]);
  const [businessName, setBusinessName] = useState('');
  const [proof, setProof] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [tribeStats, setTribeStats] = useState({
    totalXP: 0,
    completedProjects: 0,
    activeMembers: 0,
    tribeLevel: 1
  });

  useEffect(() => {
    loadTribeData();
  }, []);

  const loadTribeData = async () => {
    try {
      const [todosRes, membersRes, statsRes] = await Promise.all([
        api.get('/todos?type=group'),
        api.get(`/tribes/${tribe?.id}/members`),
        api.get(`/tribes/${tribe?.id}/stats`)
      ]);
      
      setTodos(todosRes.data);
      setMembers(membersRes.data);
      setTribeStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch tribe data:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTribeData();
    setRefreshing(false);
  };

  const upgradeTribe = async () => {
    if (!businessName || !proof) {
      Alert.alert(t('error'), t('business_and_proof_required'));
      return;
    }
    try {
      const res = await api.post(`/tribes/${tribe.id}/upgrade`, { 
        businessName, 
        proof,
        userXP: xp // Include user's XP for contribution
      });
      
      setLevel(res.data.tribe.level);
      setTribeStats(prev => ({ ...prev, tribeLevel: res.data.tribe.level }));
      
      Alert.alert(
        '🎉 Tribe Level Up!',
        `"${res.data.tiktokTitle}"\n\nYour tribe is now Level ${res.data.tribe.level}! Collective wealth building in action!`,
        [{ text: 'Celebrate!', style: 'default' }]
      );
      
      // Clear form
      setBusinessName('');
      setProof('');
      
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.error || t('upgrade_failed'));
    }
  };

  const createGroupChallenge = async () => {
    const challenges = [
      {
        title: '💰 Collective Savings Challenge',
        description: 'Save ETB 5,000 as a tribe this month',
        xpReward: 100,
        category: 'money',
        goal: 5000,
        current: 0
      },
      {
        title: '🔨 Skill Building Marathon',
        description: 'Complete 50 skill lessons collectively',
        xpReward: 150,
        category: 'skill',
        goal: 50,
        current: 0
      },
      {
        title: '📈 Investment Research Project',
        description: 'Research and present 5 investment opportunities',
        xpReward: 120,
        category: 'trading',
        goal: 5,
        current: 0
      },
      {
        title: '🚀 Tribe Business Idea',
        description: 'Develop and validate one business idea together',
        xpReward: 200,
        category: 'business',
        goal: 1,
        current: 0
      }
    ];

    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    
    try {
      const res = await api.post('/todos', {
        ...randomChallenge,
        type: 'group',
        tribeId: tribe.id
      });
      
      setTodos([...todos, res.data.todo]);
      
      Alert.alert(
        '🎯 New Tribe Challenge!',
        `${randomChallenge.title}\n\n${randomChallenge.description}\n\nReward: ${randomChallenge.xpReward} XP for the tribe!`,
        [{ text: 'Let\'s Do It!', style: 'default' }]
      );
    } catch (err) {
      Alert.alert(t('error'), 'Failed to create tribe challenge');
    }
  };

  const completeGroupTodo = async (todo) => {
    try {
      const res = await api.post(`/todos/${todo.id}/complete`);
      
      // Update local state
      const updatedTodos = todos.map(t => 
        t.id === todo.id ? { ...t, completed: true, completedAt: new Date() } : t
      );
      setTodos(updatedTodos);

      // Update tribe stats
      setTribeStats(prev => ({
        ...prev,
        completedProjects: prev.completedProjects + 1,
        totalXP: prev.totalXP + (todo.xpReward || 0)
      }));

      Alert.alert(
        '✅ Tribe Challenge Completed!',
        `Your tribe earned ${todo.xpReward || 50} XP! 🔥\n\n"Great things in business are never done by one person. They're done by a team of people." - Steve Jobs`,
        [{ text: 'Continue', style: 'default' }]
      );
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.error || 'Failed to complete challenge');
    }
  };

  const StatCard = ({ value, label, icon, color }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={20} color="#FFFFFF" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const MemberCard = ({ member }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberInitial}>
          {member.name?.charAt(0)?.toUpperCase() || 'U'}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name}</Text>
        <Text style={styles.memberXP}>{member.xp || 0} XP</Text>
        <Text style={styles.memberRole}>{member.role || 'Member'}</Text>
      </View>
      {member.isOnline && (
        <View style={styles.onlineIndicator} />
      )}
    </View>
  );

  const renderTodoItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.todoCard,
        item.completed && styles.todoCardCompleted
      ]}
      onPress={() => !item.completed && completeGroupTodo(item)}
      disabled={item.completed}
    >
      <View style={styles.todoHeader}>
        <View style={styles.todoTitleContainer}>
          <Text style={[
            styles.todoTitle,
            item.completed && styles.todoTitleCompleted
          ]}>
            {item.title}
          </Text>
          {!item.completed && item.xpReward && (
            <View style={styles.xpBadge}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.xpText}>{item.xpReward}</Text>
            </View>
          )}
        </View>
        {item.completed ? (
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        ) : (
          <Ionicons name="ellipse" size={20} color="#E5E7EB" />
        )}
      </View>

      <Text style={[
        styles.todoDescription,
        item.completed && styles.todoDescriptionCompleted
      ]}>
        {item.description}
      </Text>

      {item.goal && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${(item.current / item.goal) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {item.current}/{item.goal} completed
          </Text>
        </View>
      )}

      <View style={styles.todoFooter}>
        <View style={styles.participants}>
          <Ionicons name="people" size={16} color="#6B7280" />
          <Text style={styles.participantsText}>
            {members.length} tribe members
          </Text>
        </View>
        {item.dueDate && (
          <Text style={styles.dueDate}>
            Due: {new Date(item.dueDate).toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderOverviewTab = () => (
    <>
      {/* Tribe Stats */}
      <View style={styles.statsGrid}>
        <StatCard 
          value={tribeStats.tribeLevel} 
          label="Tribe Level" 
          icon="trophy" 
          color="#D4A017" 
        />
        <StatCard 
          value={tribeStats.totalXP} 
          label="Total XP" 
          icon="flash" 
          color="#F59E0B" 
        />
        <StatCard 
          value={tribeStats.completedProjects} 
          label="Projects" 
          icon="checkmark-done" 
          color="#10B981" 
        />
        <StatCard 
          value={members.length} 
          label="Members" 
          icon="people" 
          color="#3B82F6" 
        />
      </View>

      {/* Tribe Level Upgrade */}
      <View style={styles.upgradeSection}>
        <Text style={styles.sectionTitle}>Level Up Your Tribe</Text>
        <Text style={styles.sectionDescription}>
          Collaborate on business ventures to increase your tribe's level and unlock new opportunities
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Business Venture Name"
          value={businessName}
          onChangeText={setBusinessName}
          placeholderTextColor="#9CA3AF"
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Proof of Progress (URL, description, or evidence)"
          value={proof}
          onChangeText={setProof}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          placeholderTextColor="#9CA3AF"
        />

        <TouchableOpacity 
          style={[
            styles.upgradeButton,
            (!businessName || !proof) && styles.upgradeButtonDisabled
          ]}
          onPress={upgradeTribe}
          disabled={!businessName || !proof}
        >
          <Ionicons name="rocket" size={20} color="#FFFFFF" />
          <Text style={styles.upgradeButtonText}>Submit for Level Up</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderChallengesTab = () => (
    <View style={styles.challengesSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Active Tribe Challenges</Text>
        <TouchableOpacity 
          style={styles.createChallengeButton}
          onPress={createGroupChallenge}
        >
          <Ionicons name="add" size={20} color="#2D5016" />
          <Text style={styles.createChallengeText}>New Challenge</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={todos.filter(todo => !todo.completed)}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTodoItem}
        contentContainerStyle={styles.todoList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people" size={64} color="#E5E7EB" />
            <Text style={styles.emptyStateTitle}>No Active Challenges</Text>
            <Text style={styles.emptyStateText}>
              Create a tribe challenge to start collaborating and earning collective XP!
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={createGroupChallenge}
            >
              <Text style={styles.emptyStateButtonText}>Create First Challenge</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );

  const renderMembersTab = () => (
    <View style={styles.membersSection}>
      <Text style={styles.sectionTitle}>Tribe Members</Text>
      <Text style={styles.sectionDescription}>
        Your wealth-building companions on this journey
      </Text>

      <FlatList
        data={members}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => <MemberCard member={item} />}
        contentContainerStyle={styles.membersList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.tribeInfo}>
          <View style={styles.tribeBadge}>
            <Ionicons name="people" size={24} color="#D4A017" />
          </View>
          <View style={styles.tribeText}>
            <Text style={styles.tribeName}>{tribe?.name || 'Your Tribe'}</Text>
            <Text style={styles.tribeLevel}>Level {tribeStats.tribeLevel} • {members.length} Members</Text>
          </View>
        </View>
        <View style={styles.tribeXP}>
          <Ionicons name="flash" size={16} color="#F59E0B" />
          <Text style={styles.tribeXPText}>{tribeStats.totalXP} Tribe XP</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['overview', 'challenges', 'members'].map(tab => (
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
        {activeTab === 'challenges' && renderChallengesTab()}
        {activeTab === 'members' && renderMembersTab()}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tribeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tribeBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tribeText: {
    flex: 1,
  },
  tribeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 2,
  },
  tribeLevel: {
    fontSize: 14,
    color: '#6B7280',
  },
  tribeXP: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tribeXPText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  upgradeSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    fontSize: 16,
    color: '#2D5016',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4A017',
    padding: 16,
    borderRadius: 12,
  },
  upgradeButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  challengesSection: {
    flex: 1,
  },
  createChallengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7F4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2D5016',
  },
  createChallengeText: {
    color: '#2D5016',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  todoList: {
    paddingBottom: 16,
  },
  todoCard: {
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
  todoCardCompleted: {
    opacity: 0.7,
    backgroundColor: '#F9FAFB',
  },
  todoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  todoTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5016',
    flex: 1,
  },
  todoTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  xpText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginLeft: 4,
  },
  todoDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  todoDescriptionCompleted: {
    color: '#9CA3AF',
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  todoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participants: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantsText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  dueDate: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  membersSection: {
    flex: 1,
  },
  membersList: {
    paddingBottom: 16,
  },
  memberCard: {
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
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D4A017',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 2,
  },
  memberXP: {
    fontSize: 14,
    color: '#F59E0B',
    fontWeight: '600',
    marginBottom: 2,
  },
  memberRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: '#2D5016',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
