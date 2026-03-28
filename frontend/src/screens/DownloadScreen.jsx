import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  SafeAreaView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { yachiAPI } from '../utils/api';

const { width } = Dimensions.get('window');

export default function SkillTreeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { 
    lessons, 
    xp, 
    getUserLevel, 
    unlockedVentures,
    skillProgress,
    updateSkillProgress 
  } = useStore();

  const [activeTab, setActiveTab] = useState('skills');
  const [yachiProfile, setYachiProfile] = useState(null);

  const userLevel = getUserLevel();
  const mosaLessons = lessons.mosa || [];

  // Skill categories with progression requirements
  const skillTrees = {
    money: {
      title: 'Money Making',
      icon: 'cash',
      color: '#10B981',
      description: 'Learn to generate income from zero',
      skills: [
        {
          id: 'first-100',
          title: 'Make First ETB 100',
          description: 'Sell your first item or service',
          requiredXP: 0,
          completed: mosaLessons.some(l => l.title.includes('ETB 100') && l.completed),
          lessons: mosaLessons.filter(l => l.type === 'money' && l.title.includes('ETB 100'))
        },
        {
          id: 'scale-1k',
          title: 'Scale to ETB 1,000',
          description: 'Build consistent income streams',
          requiredXP: 100,
          completed: mosaLessons.some(l => l.title.includes('ETB 1k') && l.completed),
          lessons: mosaLessons.filter(l => l.type === 'money' && l.title.includes('ETB 1k'))
        },
        {
          id: 'master-10k',
          title: 'Master ETB 10,000+',
          description: 'Advanced income strategies',
          requiredXP: 500,
          completed: mosaLessons.some(l => l.title.includes('ETB 10k') && l.completed),
          lessons: mosaLessons.filter(l => l.type === 'money' && l.title.includes('ETB 10k'))
        }
      ]
    },
    practical: {
      title: 'Practical Skills',
      icon: 'build',
      color: '#F59E0B',
      description: 'Hands-on skills for immediate income',
      skills: [
        {
          id: 'carpentry',
          title: 'Carpentry & Woodwork',
          description: 'Furniture making and repairs',
          requiredXP: 50,
          completed: mosaLessons.some(l => l.title.toLowerCase().includes('carpentry') && l.completed),
          lessons: mosaLessons.filter(l => 
            l.type === 'skill' && l.title.toLowerCase().includes('carpentry')
          )
        },
        {
          id: 'plumbing',
          title: 'Plumbing Services',
          description: 'Basic plumbing repairs',
          requiredXP: 50,
          completed: mosaLessons.some(l => l.title.toLowerCase().includes('plumbing') && l.completed),
          lessons: mosaLessons.filter(l => 
            l.type === 'skill' && l.title.toLowerCase().includes('plumbing')
          )
        },
        {
          id: 'painting',
          title: 'Painting & Finishing',
          description: 'Professional painting services',
          requiredXP: 50,
          completed: mosaLessons.some(l => l.title.toLowerCase().includes('painting') && l.completed),
          lessons: mosaLessons.filter(l => 
            l.type === 'skill' && l.title.toLowerCase().includes('painting')
          )
        },
        {
          id: 'electrical',
          title: 'Electrical Work',
          description: 'Basic electrical repairs',
          requiredXP: 100,
          completed: mosaLessons.some(l => l.title.toLowerCase().includes('electrical') && l.completed),
          lessons: mosaLessons.filter(l => 
            l.type === 'skill' && l.title.toLowerCase().includes('electrical')
          )
        }
      ]
    },
    digital: {
      title: 'Digital Skills',
      icon: 'desktop',
      color: '#3B82F6',
      description: 'Online income opportunities',
      skills: [
        {
          id: 'freelancing',
          title: 'Freelancing',
          description: 'Sell services online',
          requiredXP: 100,
          completed: mosaLessons.some(l => l.title.toLowerCase().includes('freelancing') && l.completed),
          lessons: mosaLessons.filter(l => 
            l.type === 'skill' && l.title.toLowerCase().includes('freelancing')
          )
        },
        {
          id: 'marketing',
          title: 'Digital Marketing',
          description: 'Promote services online',
          requiredXP: 150,
          completed: mosaLessons.some(l => l.title.toLowerCase().includes('marketing') && l.completed),
          lessons: mosaLessons.filter(l => 
            l.type === 'skill' && l.title.toLowerCase().includes('marketing')
          )
        }
      ]
    },
    trading: {
      title: 'Trading & Investment',
      icon: 'trending-up',
      color: '#EF4444',
      description: 'Grow your wealth strategically',
      skills: [
        {
          id: 'forex-basics',
          title: 'Forex Basics',
          description: 'Currency trading fundamentals',
          requiredXP: 200,
          completed: mosaLessons.some(l => l.title.toLowerCase().includes('forex') && l.completed),
          lessons: mosaLessons.filter(l => l.type === 'trading')
        },
        {
          id: 'investment',
          title: 'Wealth Multiplication',
          description: 'Scale your earnings',
          requiredXP: 300,
          completed: mosaLessons.some(l => l.type === 'multiply' && l.completed),
          lessons: mosaLessons.filter(l => l.type === 'multiply')
        }
      ]
    }
  };

  useEffect(() => {
    checkYachiProfile();
  }, []);

  const checkYachiProfile = async () => {
    // Check if user has a Yachi service profile
    // This would integrate with your backend
    try {
      // const profile = await yachiAPI.getServiceProfile(user.id);
      // setYachiProfile(profile);
    } catch (error) {
      console.log('No Yachi profile yet');
    }
  };

  const handleSkillPress = (skillTree, skill) => {
    if (xp < skill.requiredXP) {
      Alert.alert(
        'XP Required',
        `You need ${skill.requiredXP} XP to unlock ${skill.title}. Keep learning!`,
        [{ text: 'Continue Learning' }]
      );
      return;
    }

    if (skill.lessons.length > 0) {
      navigation.navigate('Lessons');
    } else {
      Alert.alert(
        skill.title,
        skill.description,
        [
          { text: 'Later' },
          { text: 'Start Learning', onPress: () => navigation.navigate('Lessons') }
        ]
      );
    }
  };

  const handleUnlockYachi = async () => {
    if (!unlockedVentures.includes('yachi')) {
      Alert.alert(
        'Keep Learning!',
        'Complete 5 Mosa lessons to unlock Yachi Marketplace and start earning from your skills.',
        [{ text: 'Continue Learning' }]
      );
      return;
    }

    try {
      // Auto-create Yachi service profile based on completed skills
      const completedSkills = Object.values(skillTrees)
        .flatMap(tree => tree.skills)
        .filter(skill => skill.completed)
        .map(skill => skill.title);

      if (completedSkills.length === 0) {
        Alert.alert(
          'Build Skills First',
          'Complete some practical skills lessons to list services on Yachi.',
          [{ text: 'Start Learning', onPress: () => navigation.navigate('Lessons') }]
        );
        return;
      }

      // await yachiAPI.createServiceProfile(user.id, completedSkills);
      Alert.alert(
        '🎉 Welcome to Yachi!',
        `You're now listed as a service provider for: ${completedSkills.join(', ')}`,
        [
          { text: 'View Profile' },
          { text: 'Continue Learning' }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create Yachi profile. Please try again.');
    }
  };

  const renderSkillTree = (treeKey, tree) => {
    const totalSkills = tree.skills.length;
    const completedSkills = tree.skills.filter(skill => skill.completed).length;
    const progress = totalSkills > 0 ? (completedSkills / totalSkills) * 100 : 0;

    return (
      <View key={treeKey} style={styles.skillTree}>
        <View style={styles.treeHeader}>
          <View style={styles.treeTitleContainer}>
            <Ionicons name={tree.icon} size={24} color={tree.color} />
            <View style={styles.treeTextContainer}>
              <Text style={styles.treeTitle}>{tree.title}</Text>
              <Text style={styles.treeDescription}>{tree.description}</Text>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{completedSkills}/{totalSkills}</Text>
            <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
          </View>
        </View>

        <View style={styles.skillsContainer}>
          {tree.skills.map((skill, index) => (
            <TouchableOpacity
              key={skill.id}
              style={[
                styles.skillCard,
                skill.completed && styles.skillCardCompleted,
                xp < skill.requiredXP && styles.skillCardLocked
              ]}
              onPress={() => handleSkillPress(tree, skill)}
            >
              <View style={styles.skillHeader}>
                <View style={styles.skillIconContainer}>
                  {skill.completed ? (
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  ) : xp >= skill.requiredXP ? (
                    <Ionicons name="ellipse" size={24} color={tree.color} />
                  ) : (
                    <Ionicons name="lock-closed" size={24} color="#9CA3AF" />
                  )}
                </View>
                
                <View style={styles.skillInfo}>
                  <Text style={[
                    styles.skillTitle,
                    skill.completed && styles.skillTitleCompleted,
                    xp < skill.requiredXP && styles.skillTitleLocked
                  ]}>
                    {skill.title}
                  </Text>
                  <Text style={styles.skillDescription}>{skill.description}</Text>
                </View>

                <View style={styles.xpRequirement}>
                  {xp < skill.requiredXP && (
                    <Text style={styles.xpRequired}>{skill.requiredXP} XP</Text>
                  )}
                  {skill.completed && (
                    <Ionicons name="star" size={16} color="#F59E0B" />
                  )}
                </View>
              </View>

              {/* Progress connector line (except for last item) */}
              {index < tree.skills.length - 1 && (
                <View style={[
                  styles.connectorLine,
                  skill.completed && styles.connectorLineActive
                ]} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderYachiIntegration = () => (
    <View style={styles.yachiSection}>
      <View style={styles.yachiHeader}>
        <Ionicons name="storefront" size={32} color="#D4A017" />
        <View style={styles.yachiTextContainer}>
          <Text style={styles.yachiTitle}>Yachi Marketplace</Text>
          <Text style={styles.yachiSubtitle}>
            {unlockedVentures.includes('yachi') 
              ? 'Ready to start earning from your skills!' 
              : 'Unlock after completing 5 Mosa lessons'
            }
          </Text>
        </View>
      </View>

      {unlockedVentures.includes('yachi') ? (
        <View style={styles.yachiReady}>
          <Text style={styles.yachiReadyTitle}>Your Marketable Skills:</Text>
          {Object.values(skillTrees)
            .flatMap(tree => tree.skills)
            .filter(skill => skill.completed)
            .map(skill => (
              <View key={skill.id} style={styles.marketableSkill}>
                <Ionicons name="checkmark" size={16} color="#10B981" />
                <Text style={styles.marketableSkillText}>{skill.title}</Text>
              </View>
            ))
          }
          
          {Object.values(skillTrees)
            .flatMap(tree => tree.skills)
            .filter(skill => skill.completed).length === 0 ? (
            <Text style={styles.noSkillsText}>
              Complete some skills lessons to list services on Yachi.
            </Text>
          ) : (
            <TouchableOpacity style={styles.listServicesButton} onPress={handleUnlockYachi}>
              <Ionicons name="rocket" size={20} color="#FFFFFF" />
              <Text style={styles.listServicesButtonText}>List Services on Yachi</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.yachiLocked}>
          <Text style={styles.yachiLockedText}>
            Complete {5 - (mosaLessons.filter(l => l.completed).length)} more lessons to unlock
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${(mosaLessons.filter(l => l.completed).length / 5) * 100}%`,
                  backgroundColor: '#D4A017'
                }
              ]} 
            />
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Skill Tree</Text>
        <View style={styles.levelBadge}>
          <Ionicons name="flash" size={16} color="#FFFFFF" />
          <Text style={styles.levelText}>{userLevel}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'skills' && styles.tabActive]}
          onPress={() => setActiveTab('skills')}
        >
          <Text style={[styles.tabText, activeTab === 'skills' && styles.tabTextActive]}>
            Skills
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'yachi' && styles.tabActive]}
          onPress={() => setActiveTab('yachi')}
        >
          <Text style={[styles.tabText, activeTab === 'yachi' && styles.tabTextActive]}>
            Yachi Ready
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'skills' ? (
          <>
            {/* Overall Progress */}
            <View style={styles.overallProgress}>
              <Text style={styles.overallProgressTitle}>Your Mosa Journey</Text>
              <View style={styles.statsGrid}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{mosaLessons.filter(l => l.completed).length}</Text>
                  <Text style={styles.statLabel}>Lessons Completed</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{xp}</Text>
                  <Text style={styles.statLabel}>Total XP</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>
                    {Object.values(skillTrees).flatMap(tree => tree.skills).filter(skill => skill.completed).length}
                  </Text>
                  <Text style={styles.statLabel}>Skills Mastered</Text>
                </View>
              </View>
            </View>

            {/* Skill Trees */}
            {Object.entries(skillTrees).map(([key, tree]) => renderSkillTree(key, tree))}
          </>
        ) : (
          renderYachiIntegration()
        )}
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
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D4A017',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
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
  overallProgress: {
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
  overallProgressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D5016',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  skillTree: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  treeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  treeTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  treeTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  treeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D5016',
  },
  treeDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  progressContainer: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D5016',
  },
  progressPercent: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  skillsContainer: {
    position: 'relative',
  },
  skillCard: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  skillCardCompleted: {
    opacity: 0.9,
  },
  skillCardLocked: {
    opacity: 0.6,
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillIconContainer: {
    width: 40,
    alignItems: 'center',
  },
  skillInfo: {
    flex: 1,
    marginLeft: 8,
  },
  skillTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5016',
  },
  skillTitleCompleted: {
    color: '#10B981',
  },
  skillTitleLocked: {
    color: '#9CA3AF',
  },
  skillDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  xpRequirement: {
    alignItems: 'flex-end',
  },
  xpRequired: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  connectorLine: {
    position: 'absolute',
    left: 20,
    top: '100%',
    width: 2,
    height: 16,
    backgroundColor: '#E5E7EB',
    zIndex: -1,
  },
  connectorLineActive: {
    backgroundColor: '#10B981',
  },
  yachiSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  yachiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  yachiTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  yachiTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D5016',
  },
  yachiSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  yachiReady: {
    // Styles for when Yachi is unlocked
  },
  yachiReadyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D5016',
    marginBottom: 12,
  },
  marketableSkill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  marketableSkillText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  noSkillsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  listServicesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D4A017',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  listServicesButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  yachiLocked: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  yachiLockedText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
