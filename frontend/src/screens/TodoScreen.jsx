import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  SafeAreaView,
  RefreshControl,
  ScrollView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useStore } from '../store/useStore';

export default function ToDoScreen() {
  const { t } = useTranslation();
  const { addTodo, todos, updateXP, xp } = useStore();
  const [localTodos, setLocalTodos] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const res = await api.get('/todos');
      setLocalTodos(res.data);
      addTodo(res.data);
    } catch (err) {
      console.error('Failed to fetch todos:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTodos();
    setRefreshing(false);
  };

  const createGroupTodo = async () => {
    try {
      const groupActivities = [
        {
          title: '💰 Tribe Wealth Challenge',
          description: 'Collaborate with your tribe to complete a money-making project',
          type: 'group',
          xpReward: 50,
          category: 'money'
        },
        {
          title: '🔨 Skill Swap Session',
          description: 'Teach a skill to tribe members and learn from others',
          type: 'group', 
          xpReward: 30,
          category: 'skill'
        },
        {
          title: '📈 Investment Research Party',
          description: 'Research and discuss investment opportunities together',
          type: 'group',
          xpReward: 40,
          category: 'trading'
        }
      ];

      const randomActivity = groupActivities[Math.floor(Math.random() * groupActivities.length)];
      
      const res = await api.post('/todos', randomActivity);
      addTodo(res.data.todo);
      setLocalTodos([...localTodos, res.data.todo]);
      
      Alert.alert(
        '🎯 New Tribe Challenge!',
        `${randomActivity.title}\n\nEarn ${randomActivity.xpReward} XP when completed with your tribe!`,
        [{ text: 'Let\'s Go!', style: 'default' }]
      );
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.error || t('todo_creation_failed'));
    }
  };

  const createPersonalTodo = async (category) => {
    const personalTasks = {
      money: [
        { title: 'Make ETB 100 Today', description: 'Find one way to earn ETB 100 before sunset', xpReward: 25 },
        { title: 'Save ETB 50', description: 'Transfer ETB 50 to your savings account', xpReward: 20 },
        { title: 'Analyze Expenses', description: 'Review last week\'s spending and identify savings', xpReward: 15 }
      ],
      skill: [
        { title: 'Practice Carpentry', description: 'Spend 30 minutes practicing woodworking skills', xpReward: 20 },
        { title: 'Learn Plumbing Fix', description: 'Watch tutorial and practice one plumbing repair', xpReward: 25 },
        { title: 'Digital Skill Practice', description: 'Complete one online marketing tutorial', xpReward: 15 }
      ],
      trading: [
        { title: 'Research Forex Pairs', description: 'Study EUR/ETB and USD/ETB trends', xpReward: 20 },
        { title: 'Demo Trade Practice', description: 'Make 3 practice trades on demo account', xpReward: 30 },
        { title: 'Investment Reading', description: 'Read one chapter of investment book', xpReward: 15 }
      ]
    };

    const categoryTasks = personalTasks[category] || personalTasks.money;
    const randomTask = categoryTasks[Math.floor(Math.random() * categoryTasks.length)];
    
    try {
      const res = await api.post('/todos', {
        ...randomTask,
        type: 'personal',
        category: category
      });
      addTodo(res.data.todo);
      setLocalTodos([...localTodos, res.data.todo]);
      
      Alert.alert(
        '🎯 New Task Added!',
        `${randomTask.title}\n\nComplete to earn ${randomTask.xpReward} XP!`,
        [{ text: 'Got It!', style: 'default' }]
      );
    } catch (err) {
      Alert.alert(t('error'), 'Failed to create task');
    }
  };

  const completeTodo = async (todo) => {
    try {
      const res = await api.post(`/todos/${todo.id}/complete`);
      
      // Update local state
      const updatedTodos = localTodos.map(t => 
        t.id === todo.id ? { ...t, completed: true, completedAt: new Date() } : t
      );
      setLocalTodos(updatedTodos);

      // Award XP if available
      if (todo.xpReward) {
        updateXP(todo.xpReward);
      }

      Alert.alert(
        '✅ Task Completed!',
        todo.xpReward ? `You earned ${todo.xpReward} XP! 🔥` : 'Great work moving forward!',
        [{ text: 'Continue', style: 'default' }]
      );
    } catch (err) {
      Alert.alert(t('error'), err.response?.data?.error || t('todo_completion_failed'));
    }
  };

  const getFilteredTodos = () => {
    switch (activeFilter) {
      case 'completed':
        return localTodos.filter(todo => todo.completed);
      case 'pending':
        return localTodos.filter(todo => !todo.completed);
      case 'group':
        return localTodos.filter(todo => todo.type === 'group');
      case 'personal':
        return localTodos.filter(todo => todo.type === 'personal');
      default:
        return localTodos;
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      money: 'cash',
      skill: 'build',
      trading: 'trending-up',
      group: 'people'
    };
    return icons[category] || 'checkmark-circle';
  };

  const getCategoryColor = (category) => {
    const colors = {
      money: '#10B981',
      skill: '#F59E0B',
      trading: '#EF4444',
      group: '#3B82F6'
    };
    return colors[category] || '#6B7280';
  };

  const QuickAddButton = ({ category, title, icon }) => (
    <TouchableOpacity 
      style={styles.quickAddButton}
      onPress={() => createPersonalTodo(category)}
    >
      <Ionicons name={icon} size={20} color="#2D5016" />
      <Text style={styles.quickAddText}>{title}</Text>
    </TouchableOpacity>
  );

  const renderTodoItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.todoCard,
        item.completed && styles.todoCardCompleted,
        { borderLeftColor: getCategoryColor(item.category) }
      ]}
      onPress={() => !item.completed && completeTodo(item)}
      disabled={item.completed}
    >
      <View style={styles.todoHeader}>
        <View style={styles.todoTitleContainer}>
          <View style={styles.categoryIcon}>
            <Ionicons 
              name={getCategoryIcon(item.category)} 
              size={16} 
              color={item.completed ? '#9CA3AF' : getCategoryColor(item.category)} 
            />
          </View>
          <Text style={[
            styles.todoTitle,
            item.completed && styles.todoTitleCompleted
          ]}>
            {item.title}
          </Text>
        </View>
        
        {!item.completed && item.xpReward && (
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.xpText}>{item.xpReward}</Text>
          </View>
        )}
        
        {item.completed && (
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        )}
      </View>

      <Text style={[
        styles.todoDescription,
        item.completed && styles.todoDescriptionCompleted
      ]}>
        {item.description}
      </Text>

      <View style={styles.todoFooter}>
        <View style={styles.todoMeta}>
          <Ionicons 
            name={item.type === 'group' ? 'people' : 'person'} 
            size={14} 
            color="#9CA3AF" 
          />
          <Text style={styles.todoType}>
            {item.type === 'group' ? 'Tribe Activity' : 'Personal Task'}
          </Text>
        </View>
        
        {item.dueDate && (
          <Text style={styles.dueDate}>
            Due: {new Date(item.dueDate).toLocaleDateString()}
          </Text>
        )}
        
        {item.completed && item.completedAt && (
          <Text style={styles.completedDate}>
            Completed: {new Date(item.completedAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const filteredTodos = getFilteredTodos();
  const pendingCount = localTodos.filter(todo => !todo.completed).length;
  const completedCount = localTodos.filter(todo => todo.completed).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Wealth Tasks</Text>
          <View style={styles.xpDisplay}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.xpCount}>{xp} XP</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          Complete tasks to build wealth and earn XP
        </Text>
      </View>

      {/* Quick Add Section */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.quickAddSection}
      >
        <QuickAddButton 
          category="money" 
          title="Money Task" 
          icon="cash" 
        />
        <QuickAddButton 
          category="skill" 
          title="Skill Practice" 
          icon="build" 
        />
        <QuickAddButton 
          category="trading" 
          title="Trading Research" 
          icon="trending-up" 
        />
        <TouchableOpacity 
          style={[styles.quickAddButton, styles.groupButton]}
          onPress={createGroupTodo}
        >
          <Ionicons name="people" size={20} color="#3B82F6" />
          <Text style={styles.quickAddText}>Tribe Challenge</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {localTodos.filter(t => t.xpReward && t.completed).reduce((sum, t) => sum + t.xpReward, 0)}
          </Text>
          <Text style={styles.statLabel}>XP Earned</Text>
        </View>
      </View>

      {/* Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
      >
        {['all', 'pending', 'completed', 'personal', 'group'].map(filter => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterButton,
              activeFilter === filter && styles.filterButtonActive
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[
              styles.filterText,
              activeFilter === filter && styles.filterTextActive
            ]}>
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Todo List */}
      <FlatList 
        data={filteredTodos}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTodoItem}
        contentContainerStyle={styles.todoList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done" size={64} color="#E5E7EB" />
            <Text style={styles.emptyStateTitle}>No tasks found</Text>
            <Text style={styles.emptyStateText}>
              {activeFilter === 'completed' 
                ? 'Complete some tasks to see them here!'
                : 'Add some tasks to get started on your wealth journey!'
              }
            </Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => createPersonalTodo('money')}
            >
              <Text style={styles.emptyStateButtonText}>Create Your First Task</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D5016',
  },
  xpDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  xpCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginLeft: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  quickAddSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  groupButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  quickAddText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D5016',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
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
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: '#2D5016',
    borderColor: '#2D5016',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  todoList: {
    padding: 16,
  },
  todoCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
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
  categoryIcon: {
    marginRight: 8,
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
  todoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todoType: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  dueDate: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  completedDate: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
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
