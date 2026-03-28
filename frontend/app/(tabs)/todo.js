/**
 * 🏢 MOSA FORGE - Enterprise To-Do Management System
 * 📋 Student Task Tracking & Progress Management
 * 🎯 Interactive Learning Milestones & Deadlines
 * 📊 Real-time Progress Analytics & Achievement Tracking
 * 🚀 Production-Ready React Native Component
 * 
 * @module TodoScreen
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, SlideInRight } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';

// 🏗️ Enterprise Components
import EnterpriseHeader from '../../components/shared/EnterpriseHeader';
import TaskCard from '../../components/todo/TaskCard';
import AchievementBadge from '../../components/todo/AchievementBadge';
import ProgressRing from '../../components/shared/ProgressRing';
import EmptyState from '../../components/shared/EmptyState';

// 📊 Enterprise Services
import TodoService from '../../services/todo-service';
import AnalyticsService from '../../services/analytics-service';
import NotificationService from '../../services/notification-service';

// 🔧 Enterprise Utils
import { formatDate, calculateTimeRemaining, generateTaskId } from '../../utils/date-utils';
import { colors, typography, spacing, shadows } from '../../constants/design-system';

/**
 * 🎯 MAIN TODO SCREEN COMPONENT
 */
const TodoScreen = ({ navigation }) => {
  // 🏗️ State Management
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    completionRate: 0
  });
  const [achievements, setAchievements] = useState([]);
  const [showCompleted, setShowCompleted] = useState(true);
  const [newTaskText, setNewTaskText] = useState('');

  // 🔄 Refs
  const flatListRef = React.useRef(null);

  /**
   * 📱 LOAD INITIAL DATA
   */
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);

      // 📊 Load Tasks
      const todoService = new TodoService();
      const taskData = await todoService.getTasks();
      setTasks(taskData);
      applyFilters(taskData, activeFilter, searchQuery);

      // 🏆 Load Achievements
      const achievementsData = await todoService.getAchievements();
      setAchievements(achievementsData.slice(0, 3)); // Show top 3

      // 📈 Calculate Statistics
      calculateStatistics(taskData);

      // 🔔 Check for Notifications
      await checkPendingNotifications();

      // 📊 Track Analytics
      AnalyticsService.trackScreenView('todo_screen');

    } catch (error) {
      console.error('Failed to load todo data:', error);
      Alert.alert('Error', 'Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery]);

  /**
   * 🔄 ON FOCUS REFRESH
   */
  useFocusEffect(
    useCallback(() => {
      loadInitialData();
      return () => {
        // Cleanup if needed
      };
    }, [loadInitialData])
  );

  /**
   * 🎯 APPLY FILTERS
   */
  const applyFilters = (taskList, filter, query) => {
    let filtered = taskList;

    // 🔍 Apply Status Filter
    switch (filter) {
      case 'pending':
        filtered = filtered.filter(task => !task.completed);
        break;
      case 'completed':
        filtered = filtered.filter(task => task.completed);
        break;
      case 'overdue':
        filtered = filtered.filter(task => 
          !task.completed && 
          task.dueDate && 
          new Date(task.dueDate) < new Date()
        );
        break;
      case 'today':
        const today = new Date().toDateString();
        filtered = filtered.filter(task => 
          new Date(task.dueDate).toDateString() === today
        );
        break;
      case 'high_priority':
        filtered = filtered.filter(task => task.priority === 'high');
        break;
    }

    // 🔤 Apply Search Query
    if (query.trim() !== '') {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query.toLowerCase()) ||
        task.description?.toLowerCase().includes(query.toLowerCase())
      );
    }

    setFilteredTasks(filtered);
  };

  /**
   * 📊 CALCULATE STATISTICS
   */
  const calculateStatistics = (taskList) => {
    const total = taskList.length;
    const completed = taskList.filter(task => task.completed).length;
    const pending = total - completed;
    const overdue = taskList.filter(task => 
      !task.completed && 
      task.dueDate && 
      new Date(task.dueDate) < new Date()
    ).length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    setStats({
      total,
      completed,
      pending,
      overdue,
      completionRate
    });
  };

  /**
   * 🆕 ADD NEW TASK
   */
  const handleAddTask = async () => {
    if (!newTaskText.trim()) {
      Alert.alert('Error', 'Please enter a task description');
      return;
    }

    try {
      const todoService = new TodoService();
      const newTask = {
        id: generateTaskId(),
        title: newTaskText.trim(),
        description: '',
        completed: false,
        priority: 'medium',
        category: 'learning',
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await todoService.addTask(newTask);
      
      // 📱 Update Local State
      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks);
      applyFilters(updatedTasks, activeFilter, searchQuery);
      calculateStatistics(updatedTasks);
      
      // 📊 Track Analytics
      AnalyticsService.trackEvent('task_added', {
        category: newTask.category,
        priority: newTask.priority
      });

      // 🔔 Send Notification
      NotificationService.scheduleNotification({
        title: 'Task Added',
        body: `"${newTask.title}" has been added to your todo list`,
        data: { taskId: newTask.id }
      });

      // 🧹 Clear Input
      setNewTaskText('');

      // 🎉 Show Success Feedback
      Alert.alert('Success', 'Task added successfully!');

    } catch (error) {
      console.error('Failed to add task:', error);
      Alert.alert('Error', 'Failed to add task. Please try again.');
    }
  };

  /**
   * ✅ TOGGLE TASK COMPLETION
   */
  const handleToggleTask = async (taskId) => {
    try {
      const todoService = new TodoService();
      const updatedTasks = tasks.map(task => {
        if (task.id === taskId) {
          const updatedTask = {
            ...task,
            completed: !task.completed,
            updatedAt: new Date().toISOString(),
            completedAt: !task.completed ? new Date().toISOString() : null
          };
          
          // 🔄 Update in Database
          todoService.updateTask(taskId, updatedTask);
          return updatedTask;
        }
        return task;
      });

      setTasks(updatedTasks);
      applyFilters(updatedTasks, activeFilter, searchQuery);
      calculateStatistics(updatedTasks);

      // 📊 Track Analytics
      const task = tasks.find(t => t.id === taskId);
      AnalyticsService.trackEvent('task_toggled', {
        taskId,
        completed: !task.completed,
        category: task.category
      });

      // 🏆 Check for Achievement Unlock
      await checkAchievementUnlock(updatedTasks);

      // 🔔 Send Notification
      if (!task.completed) {
        NotificationService.scheduleNotification({
          title: 'Task Completed! 🎉',
          body: `You completed "${task.title}"`,
          data: { taskId }
        });
      }

    } catch (error) {
      console.error('Failed to toggle task:', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
    }
  };

  /**
   * 🗑️ DELETE TASK
   */
  const handleDeleteTask = (taskId) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const todoService = new TodoService();
              await todoService.deleteTask(taskId);
              
              const updatedTasks = tasks.filter(task => task.id !== taskId);
              setTasks(updatedTasks);
              applyFilters(updatedTasks, activeFilter, searchQuery);
              calculateStatistics(updatedTasks);

              // 📊 Track Analytics
              AnalyticsService.trackEvent('task_deleted', { taskId });

            } catch (error) {
              console.error('Failed to delete task:', error);
              Alert.alert('Error', 'Failed to delete task. Please try again.');
            }
          }
        }
      ]
    );
  };

  /**
   * ✏️ EDIT TASK
   */
  const handleEditTask = (task) => {
    navigation.navigate('TaskEditor', {
      task,
      onSave: (updatedTask) => {
        const updatedTasks = tasks.map(t => 
          t.id === updatedTask.id ? updatedTask : t
        );
        setTasks(updatedTasks);
        applyFilters(updatedTasks, activeFilter, searchQuery);
      }
    });
  };

  /**
   * 🏆 CHECK ACHIEVEMENT UNLOCK
   */
  const checkAchievementUnlock = async (taskList) => {
    try {
      const todoService = new TodoService();
      const completedCount = taskList.filter(t => t.completed).length;
      
      // 🎯 Check for Milestone Achievements
      if (completedCount % 10 === 0 && completedCount > 0) {
        const achievement = {
          id: `milestone_${completedCount}`,
          title: `${completedCount} Tasks Completed`,
          description: `You've completed ${completedCount} tasks!`,
          icon: 'trophy',
          unlockedAt: new Date().toISOString()
        };

        await todoService.unlockAchievement(achievement);
        
        // 📱 Update Local State
        setAchievements(prev => [achievement, ...prev].slice(0, 3));

        // 🔔 Show Achievement Notification
        NotificationService.scheduleNotification({
          title: 'Achievement Unlocked! 🏆',
          body: achievement.description,
          data: { achievementId: achievement.id }
        });

        // 🎉 Show Achievement Modal
        navigation.navigate('AchievementUnlocked', { achievement });
      }
    } catch (error) {
      console.error('Failed to check achievements:', error);
    }
  };

  /**
   * 🔔 CHECK PENDING NOTIFICATIONS
   */
  const checkPendingNotifications = async () => {
    try {
      const todoService = new TodoService();
      const overdueTasks = tasks.filter(task => 
        !task.completed && 
        task.dueDate && 
        new Date(task.dueDate) < new Date()
      );

      if (overdueTasks.length > 0) {
        NotificationService.scheduleNotification({
          title: 'Overdue Tasks',
          body: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
          data: { filter: 'overdue' }
        });
      }
    } catch (error) {
      console.error('Failed to check notifications:', error);
    }
  };

  /**
   * 🔄 HANDLE REFRESH
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  };

  /**
   * 🔍 HANDLE SEARCH
   */
  const handleSearch = (query) => {
    setSearchQuery(query);
    applyFilters(tasks, activeFilter, query);
  };

  /**
   * 🎯 HANDLE FILTER CHANGE
   */
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    applyFilters(tasks, filter, searchQuery);
  };

  /**
   * 📋 RENDER TASK ITEM
   */
  const renderTaskItem = ({ item, index }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 100)}
      style={styles.taskItemContainer}
    >
      <TaskCard
        task={item}
        onToggle={() => handleToggleTask(item.id)}
        onEdit={() => handleEditTask(item)}
        onDelete={() => handleDeleteTask(item.id)}
        onPress={() => navigation.navigate('TaskDetail', { task: item })}
      />
    </Animated.View>
  );

  /**
   * 🏆 RENDER ACHIEVEMENT BADGE
   */
  const renderAchievementBadge = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('Achievements')}
      activeOpacity={0.7}
    >
      <AchievementBadge achievement={item} />
    </TouchableOpacity>
  );

  /**
   * 📊 RENDER STATS CARD
   */
  const renderStatsCard = () => (
    <Animated.View 
      entering={FadeIn.delay(200)}
      style={styles.statsCard}
    >
      <LinearGradient
        colors={[colors.primaryLight, colors.primary]}
        style={styles.statsGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>Progress Overview</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Analytics')}>
            <Icon name="chart-box" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContent}>
          <View style={styles.progressContainer}>
            <ProgressRing
              size={80}
              progress={stats.completionRate / 100}
              color={colors.success}
              backgroundColor={colors.white + '40'}
              strokeWidth={8}
            >
              <Text style={styles.progressText}>
                {Math.round(stats.completionRate)}%
              </Text>
            </ProgressRing>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.statValueSuccess]}>
                {stats.completed}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.statValueWarning]}>
                {stats.pending}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, styles.statValueDanger]}>
                {stats.overdue}
              </Text>
              <Text style={styles.statLabel}>Overdue</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  /**
   * 🎯 RENDER FILTER BAR
   */
  const renderFilterBar = () => {
    const filters = [
      { key: 'all', label: 'All', icon: 'format-list-bulleted' },
      { key: 'pending', label: 'Pending', icon: 'clock-outline' },
      { key: 'today', label: 'Today', icon: 'calendar-today' },
      { key: 'high_priority', label: 'High', icon: 'flag' },
      { key: 'overdue', label: 'Overdue', icon: 'alert' },
    ];

    return (
      <Animated.View 
        entering={SlideInRight.delay(100)}
        style={styles.filterBar}
      >
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === item.key && styles.filterButtonActive
              ]}
              onPress={() => handleFilterChange(item.key)}
            >
              <Icon
                name={item.icon}
                size={16}
                color={activeFilter === item.key ? colors.white : colors.textSecondary}
              />
              <Text style={[
                styles.filterButtonText,
                activeFilter === item.key && styles.filterButtonTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filterList}
        />
      </Animated.View>
    );
  };

  /**
   * 🔍 RENDER SEARCH BAR
   */
  const renderSearchBar = () => (
    <Animated.View 
      entering={FadeInDown.delay(50)}
      style={styles.searchContainer}
    >
      <View style={styles.searchBar}>
        <Icon name="magnify" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  /**
   * 🆕 RENDER ADD TASK INPUT
   */
  const renderAddTaskInput = () => (
    <Animated.View 
      entering={FadeInDown}
      style={styles.addTaskContainer}
    >
      <View style={styles.addTaskInputWrapper}>
        <TextInput
          style={styles.addTaskInput}
          placeholder="What needs to be done?"
          placeholderTextColor={colors.textSecondary}
          value={newTaskText}
          onChangeText={setNewTaskText}
          onSubmitEditing={handleAddTask}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.addTaskButton,
            !newTaskText.trim() && styles.addTaskButtonDisabled
          ]}
          onPress={handleAddTask}
          disabled={!newTaskText.trim()}
        >
          <Icon 
            name="plus" 
            size={24} 
            color={newTaskText.trim() ? colors.white : colors.textTertiary} 
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  /**
   * 🏆 RENDER ACHIEVEMENTS SECTION
   */
  const renderAchievementsSection = () => {
    if (achievements.length === 0) return null;

    return (
      <Animated.View 
        entering={FadeInDown.delay(300)}
        style={styles.achievementsSection}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Achievements</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Achievements')}
            style={styles.seeAllButton}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <Icon name="chevron-right" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={achievements}
          keyExtractor={(item) => item.id}
          renderItem={renderAchievementBadge}
          contentContainerStyle={styles.achievementsList}
        />
      </Animated.View>
    );
  };

  /**
   * 📋 RENDER TASK LIST
   */
  const renderTaskList = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      );
    }

    if (filteredTasks.length === 0) {
      return (
        <EmptyState
          icon="checkbox-marked-circle-outline"
          title={searchQuery ? "No tasks found" : "No tasks yet"}
          description={
            searchQuery 
              ? "Try a different search term"
              : "Add your first task to get started"
          }
          actionLabel={searchQuery ? "Clear Search" : "Add Task"}
          onAction={() => {
            if (searchQuery) {
              handleSearch('');
            } else {
              setNewTaskText('Example: Complete mindset phase');
            }
          }}
        />
      );
    }

    return (
      <FlatList
        ref={flatListRef}
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTaskItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.taskList}
        initialNumToRender={10}
        maxToRenderPerBatch={20}
        windowSize={10}
      />
    );
  };

  /**
   * 🎯 MAIN RENDER
   */
  return (
    <SafeAreaView style={styles.container}>
      {/* 🔹 Enterprise Header */}
      <EnterpriseHeader
        title="To-Do List"
        subtitle="Track your learning journey"
        showBackButton={false}
        rightActions={[
          {
            icon: 'filter-variant',
            onPress: () => navigation.navigate('AdvancedFilters', {
              currentFilter: activeFilter,
              onFilterApply: handleFilterChange
            })
          },
          {
            icon: 'cog-outline',
            onPress: () => navigation.navigate('Settings')
          }
        ]}
      />

      {/* 📊 Stats Card */}
      {renderStatsCard()}

      {/* 🔍 Search Bar */}
      {renderSearchBar()}

      {/* 🎯 Filter Bar */}
      {renderFilterBar()}

      {/* 🏆 Achievements Section */}
      {renderAchievementsSection()}

      {/* 📋 Task List */}
      {renderTaskList()}

      {/* 🆕 Add Task Input */}
      {renderAddTaskInput()}

      {/* 🔔 Quick Actions FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('QuickAdd')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.fabGradient}
        >
          <Icon name="lightning-bolt" size={24} color={colors.white} />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

/**
 * 🎨 ENTERPRISE STYLES
 */
const styles = StyleSheet.create({
  // 🏗️ Container Styles
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // 📊 Stats Card Styles
  statsCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: spacing.lg,
    overflow: 'hidden',
    ...shadows.large,
  },
  statsGradient: {
    padding: spacing.lg,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  statsTitle: {
    ...typography.title3,
    color: colors.white,
    fontWeight: '600',
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressContainer: {
    marginRight: spacing.xl,
  },
  progressText: {
    ...typography.title2,
    color: colors.white,
    fontWeight: '700',
  },
  statsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    marginBottom: spacing.md,
  },
  statValue: {
    ...typography.title1,
    color: colors.white,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statValueSuccess: {
    color: colors.success,
  },
  statValueWarning: {
    color: colors.warning,
  },
  statValueDanger: {
    color: colors.danger,
  },
  statLabel: {
    ...typography.caption,
    color: colors.white + 'CC',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // 🔍 Search Styles
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.small,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.sm,
    paddingVertical: spacing.xs,
  },

  // 🎯 Filter Styles
  filterBar: {
    marginBottom: spacing.md,
  },
  filterList: {
    paddingHorizontal: spacing.lg,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    ...shadows.small,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.white,
  },

  // 🏆 Achievements Styles
  achievementsSection: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.title3,
    color: colors.text,
    fontWeight: '600',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '500',
  },
  achievementsList: {
    paddingHorizontal: spacing.lg,
  },

  // 📋 Task List Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  taskList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  taskItemContainer: {
    marginBottom: spacing.md,
  },

  // 🆕 Add Task Styles
  addTaskContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addTaskInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: spacing.xl,
    ...shadows.medium,
  },
  addTaskInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  addTaskButton: {
    backgroundColor: colors.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  addTaskButtonDisabled: {
    backgroundColor: colors.surface,
  },

  // 🔔 FAB Styles
  fab: {
    position: 'absolute',
    bottom: 80,
    right: spacing.lg,
    ...shadows.large,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 🎨 Typography Overrides
  ...typography,
});

export default TodoScreen;