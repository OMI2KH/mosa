import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Gamified Todo Card for Mosa Task Management
 * 
 * Props:
 *  - todo: { 
 *      id: string,
 *      title: string, 
 *      description: string,
 *      dueDate?: string,
 *      completed: boolean,
 *      completedAt?: string,
 *      type?: 'personal' | 'group' | 'tribe',
 *      category?: 'money' | 'skill' | 'trading' | 'learning',
 *      priority?: 'low' | 'medium' | 'high' | 'urgent',
 *      xpReward?: number,
 *      estimatedTime?: string,
 *      tags?: string[],
 *      recurrence?: 'daily' | 'weekly' | 'monthly',
 *      streak?: number,
 *      isOverdue?: boolean
 *    }
 *  - onPress: function to call when pressing the card
 *  - onLongPress?: function for long press actions
 *  - variant?: 'default' | 'compact' | 'focus'
 *  - showXP?: boolean - Show XP reward badge
 *  - showStreak?: boolean - Show streak counter
 *  - onComplete?: function - Manual completion handler
 */
export default function TodoCard({ 
  todo, 
  onPress, 
  onLongPress,
  variant = 'default',
  showXP = true,
  showStreak = true,
  onComplete
}) {
  
  const getCategoryStyles = () => {
    const categories = {
      money: {
        color: '#10B981',
        icon: 'cash',
        label: 'Wealth',
        gradient: ['#D1FAE5', '#ECFDF5']
      },
      skill: {
        color: '#F59E0B',
        icon: 'build',
        label: 'Skill',
        gradient: ['#FEF3C7', '#FEF7ED']
      },
      trading: {
        color: '#EF4444',
        icon: 'trending-up',
        label: 'Trading',
        gradient: ['#FEE2E2', '#FEF2F2']
      },
      learning: {
        color: '#3B82F6',
        icon: 'school',
        label: 'Learning',
        gradient: ['#DBEAFE', '#EFF6FF']
      }
    };
    return categories[todo.category] || categories.learning;
  };

  const getPriorityStyles = () => {
    const priorities = {
      low: { color: '#10B981', label: 'Low', icon: 'arrow-down' },
      medium: { color: '#F59E0B', label: 'Medium', icon: 'remove' },
      high: { color: '#EF4444', label: 'High', icon: 'arrow-up' },
      urgent: { color: '#DC2626', label: 'Urgent', icon: 'warning' }
    };
    return priorities[todo.priority] || priorities.medium;
  };

  const getTypeStyles = () => {
    const types = {
      personal: { color: '#6B7280', icon: 'person', label: 'Personal' },
      group: { color: '#8B5CF6', icon: 'people', label: 'Group' },
      tribe: { color: '#D4A017', icon: 'people-circle', label: 'Tribe' }
    };
    return types[todo.type] || types.personal;
  };

  const isDueSoon = () => {
    if (!todo.dueDate || todo.completed) return false;
    const dueDate = new Date(todo.dueDate);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 1 && diffDays >= 0;
  };

  const isOverdue = () => {
    if (!todo.dueDate || todo.completed) return false;
    const dueDate = new Date(todo.dueDate);
    const today = new Date();
    return dueDate < today;
  };

  const handlePress = () => {
    if (todo.completed) return;
    if (onComplete) {
      onComplete(todo);
    } else {
      onPress?.();
    }
  };

  const renderCompactCard = () => (
    <TouchableOpacity
      style={[
        styles.card,
        styles.compactCard,
        todo.completed && styles.cardCompleted,
        isOverdue() && styles.cardOverdue,
        isDueSoon() && styles.cardDueSoon
      ]}
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      disabled={todo.completed}
    >
      {/* Left Status Indicator */}
      <View style={[
        styles.statusIndicator,
        { backgroundColor: getCategoryStyles().color },
        todo.completed && styles.statusIndicatorCompleted
      ]} />

      {/* Content */}
      <View style={styles.compactContent}>
        <View style={styles.compactHeader}>
          <Text 
            style={[
              styles.compactTitle,
              todo.completed && styles.textCompleted
            ]}
            numberOfLines={1}
          >
            {todo.title}
          </Text>
          
          {/* XP Badge */}
          {showXP && todo.xpReward && !todo.completed && (
            <View style={styles.xpBadge}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.xpText}>{todo.xpReward}</Text>
            </View>
          )}
        </View>

        <View style={styles.compactFooter}>
          <View style={styles.compactMeta}>
            <Ionicons 
              name={getTypeStyles().icon} 
              size={12} 
              color="#6B7280" 
            />
            <Text style={styles.compactType}>
              {getTypeStyles().label}
            </Text>
          </View>
          
          {todo.dueDate && (
            <Text style={[
              styles.compactDueDate,
              isOverdue() && styles.dueDateOverdue,
              isDueSoon() && styles.dueDateDueSoon
            ]}>
              {isOverdue() ? 'Overdue' : 
               isDueSoon() ? 'Due today' : 
               new Date(todo.dueDate).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>

      {/* Completion Checkbox */}
      <TouchableOpacity 
        style={[
          styles.checkbox,
          todo.completed && styles.checkboxCompleted
        ]}
        onPress={() => onComplete?.(todo)}
      >
        {todo.completed && (
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderDefaultCard = () => (
    <TouchableOpacity
      style={[
        styles.card,
        styles.defaultCard,
        todo.completed && styles.cardCompleted,
        isOverdue() && styles.cardOverdue,
        isDueSoon() && styles.cardDueSoon
      ]}
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      disabled={todo.completed}
    >
      {/* Header with Category and Priority */}
      <View style={styles.header}>
        <View style={styles.categoryContainer}>
          <View style={[
            styles.categoryBadge,
            { backgroundColor: getCategoryStyles().color }
          ]}>
            <Ionicons 
              name={getCategoryStyles().icon} 
              size={12} 
              color="#FFFFFF" 
            />
            <Text style={styles.categoryText}>
              {getCategoryStyles().label}
            </Text>
          </View>

          {/* Priority Badge */}
          {todo.priority && todo.priority !== 'medium' && (
            <View style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityStyles().color }
            ]}>
              <Ionicons 
                name={getPriorityStyles().icon} 
                size={10} 
                color="#FFFFFF" 
              />
              <Text style={styles.priorityText}>
                {getPriorityStyles().label}
              </Text>
            </View>
          )}
        </View>

        {/* XP Reward */}
        {showXP && todo.xpReward && !todo.completed && (
          <View style={styles.xpReward}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.xpRewardText}>+{todo.xpReward} XP</Text>
          </View>
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text 
          style={[
            styles.title,
            todo.completed && styles.textCompleted
          ]}
          numberOfLines={2}
        >
          {todo.title}
        </Text>
        
        {todo.description && (
          <Text 
            style={[
              styles.description,
              todo.completed && styles.textCompleted
            ]}
            numberOfLines={2}
          >
            {todo.description}
          </Text>
        )}

        {/* Tags */}
        {todo.tags && todo.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {todo.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer Meta Information */}
        <View style={styles.footer}>
          <View style={styles.metaContainer}>
            {/* Task Type */}
            <View style={styles.metaItem}>
              <Ionicons 
                name={getTypeStyles().icon} 
                size={14} 
                color="#6B7280" 
              />
              <Text style={styles.metaText}>{getTypeStyles().label}</Text>
            </View>

            {/* Estimated Time */}
            {todo.estimatedTime && (
              <View style={styles.metaItem}>
                <Ionicons name="time" size={14} color="#6B7280" />
                <Text style={styles.metaText}>{todo.estimatedTime}</Text>
              </View>
            )}

            {/* Streak Counter */}
            {showStreak && todo.streak && todo.streak > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="flame" size={14} color="#EF4444" />
                <Text style={styles.streakText}>{todo.streak} days</Text>
              </View>
            )}
          </View>

          {/* Due Date */}
          {todo.dueDate && (
            <Text style={[
              styles.dueDate,
              isOverdue() && styles.dueDateOverdue,
              isDueSoon() && styles.dueDateDueSoon,
              todo.completed && styles.dueDateCompleted
            ]}>
              {todo.completed ? 'Completed' :
               isOverdue() ? 'Overdue' : 
               isDueSoon() ? 'Due today' : 
               `Due: ${new Date(todo.dueDate).toLocaleDateString()}`}
            </Text>
          )}
        </View>
      </View>

      {/* Completion Checkbox */}
      <TouchableOpacity 
        style={[
          styles.checkboxLarge,
          todo.completed && styles.checkboxCompleted
        ]}
        onPress={() => onComplete?.(todo)}
      >
        {todo.completed ? (
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
        ) : (
          <Ionicons 
            name="ellipse" 
            size={20} 
            color={getCategoryStyles().color} 
          />
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderFocusCard = () => (
    <TouchableOpacity
      style={[
        styles.card,
        styles.focusCard,
        { borderLeftColor: getCategoryStyles().color },
        todo.completed && styles.cardCompleted,
        isOverdue() && styles.cardOverdue,
      ]}
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      disabled={todo.completed}
    >
      <View style={styles.focusContent}>
        {/* Category Icon */}
        <View style={[
          styles.focusIcon,
          { backgroundColor: getCategoryStyles().color }
        ]}>
          <Ionicons 
            name={getCategoryStyles().icon} 
            size={20} 
            color="#FFFFFF" 
          />
        </View>

        {/* Content */}
        <View style={styles.focusTextContainer}>
          <Text 
            style={[
              styles.focusTitle,
              todo.completed && styles.textCompleted
            ]}
            numberOfLines={2}
          >
            {todo.title}
          </Text>
          
          {todo.description && (
            <Text 
              style={[
                styles.focusDescription,
                todo.completed && styles.textCompleted
              ]}
              numberOfLines={2}
            >
              {todo.description}
            </Text>
          )}

          {/* Progress Info */}
          <View style={styles.focusMeta}>
            {todo.estimatedTime && (
              <Text style={styles.focusTime}>{todo.estimatedTime}</Text>
            )}
            
            {showXP && todo.xpReward && (
              <View style={styles.focusXP}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.focusXPText}>+{todo.xpReward} XP</Text>
              </View>
            )}
          </View>
        </View>

        {/* Completion Checkbox */}
        <TouchableOpacity 
          style={[
            styles.checkbox,
            todo.completed && styles.checkboxCompleted
          ]}
          onPress={() => onComplete?.(todo)}
        >
          {todo.completed && (
            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Render based on variant
  if (variant === 'compact') {
    return renderCompactCard();
  }
  
  if (variant === 'focus') {
    return renderFocusCard();
  }
  
  return renderDefaultCard();
}

// Specialized Mosa Todo Cards
export function WealthTaskCard(props) {
  return <TodoCard {...props} />;
}

export function SkillTaskCard(props) {
  return <TodoCard {...props} />;
}

export function LearningTaskCard(props) {
  return <TodoCard {...props} />;
}

export function TribeTaskCard(props) {
  return <TodoCard {...props} />;
}

const styles = StyleSheet.create({
  // Base Card Styles
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardCompleted: {
    opacity: 0.7,
    backgroundColor: '#F9FAFB',
  },
  cardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  cardDueSoon: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  
  // Compact Variant
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  statusIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  statusIndicatorCompleted: {
    backgroundColor: '#10B981',
  },
  compactContent: {
    flex: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5016',
    flex: 1,
  },
  compactFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactType: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  compactDueDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Default Variant
  defaultCard: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 4,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  xpReward: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  xpRewardText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginLeft: 4,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    color: '#6B7280',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  streakText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
    marginLeft: 4,
  },
  dueDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  dueDateOverdue: {
    color: '#EF4444',
  },
  dueDateDueSoon: {
    color: '#F59E0B',
  },
  dueDateCompleted: {
    color: '#10B981',
  },
  
  // Focus Variant
  focusCard: {
    borderLeftWidth: 6,
    padding: 16,
  },
  focusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  focusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  focusTextContainer: {
    flex: 1,
  },
  focusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 4,
  },
  focusDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  focusMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  focusTime: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 12,
  },
  focusXP: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  focusXPText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginLeft: 2,
  },
  
  // Common Elements
  textCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  xpText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginLeft: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkboxLarge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 16,
    right: 16,
  },
  checkboxCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
});
