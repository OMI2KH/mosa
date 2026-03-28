/**
 * 🎯 MOSA FORGE: Enterprise Expert Profile Card Component
 * 
 * @component ExpertCard
 * @description High-performance expert profile card with quality metrics display
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Real-time quality metrics display
 * - Tier-based visual indicators
 * - Performance bonus calculations
 * - Student capacity tracking
 * - Interactive enrollment actions
 */

import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Platform,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';

// 🏗️ Enterprise Constants
const EXPERT_TIERS = {
  MASTER: {
    name: 'Master Tier',
    color: '#FFD700',
    gradient: ['#FFD700', '#FFA500'],
    bonus: 20,
    minQuality: 4.7
  },
  SENIOR: {
    name: 'Senior Tier',
    color: '#C0C0C0', 
    gradient: ['#E8E8E8', '#C0C0C0'],
    bonus: 10,
    minQuality: 4.3
  },
  STANDARD: {
    name: 'Standard Tier',
    color: '#CD7F32',
    gradient: ['#CD7F32', '#8B4513'],
    bonus: 0,
    minQuality: 4.0
  }
};

const QUALITY_THRESHOLDS = {
  EXCELLENT: { min: 4.5, color: '#10B981', label: 'Excellent' },
  GOOD: { min: 4.0, color: '#3B82F6', label: 'Good' },
  FAIR: { min: 3.5, color: '#F59E0B', label: 'Fair' },
  POOR: { min: 0, color: '#EF4444', label: 'Needs Improvement' }
};

/**
 * 🏗️ Enterprise Expert Card Component
 * @param {Object} props - Component properties
 * @param {Object} props.expert - Expert data object
 * @param {Function} props.onPress - Card press handler
 * @param {Function} props.onEnroll - Enrollment action handler
 * @param {boolean} props.isSelected - Selection state
 * @param {string} props.variant - Display variant (compact/detailed)
 * @param {Object} props.style - Custom styles
 */
const ExpertCard = memo(({
  expert,
  onPress,
  onEnroll,
  isSelected = false,
  variant = 'detailed',
  style,
  ...props
}) => {
  // 🎯 State Management
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  // 🏗️ Animation Handlers
  const handlePressIn = useCallback(() => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  }, [scaleAnim]);

  // 🏗️ Quality Calculations
  const qualityScore = expert.qualityMetrics?.overallScore || 0;
  const completionRate = expert.qualityMetrics?.completionRate || 0;
  const responseTime = expert.qualityMetrics?.responseTime || 24;
  
  // 🎯 Tier Determination
  const expertTier = React.useMemo(() => {
    if (qualityScore >= EXPERT_TIERS.MASTER.minQuality) return EXPERT_TIERS.MASTER;
    if (qualityScore >= EXPERT_TIERS.SENIOR.minQuality) return EXPERT_TIERS.SENIOR;
    return EXPERT_TIERS.STANDARD;
  }, [qualityScore]);

  // 🏗️ Quality Level
  const qualityLevel = React.useMemo(() => {
    if (qualityScore >= QUALITY_THRESHOLDS.EXCELLENT.min) return QUALITY_THRESHOLDS.EXCELLENT;
    if (qualityScore >= QUALITY_THRESHOLDS.GOOD.min) return QUALITY_THRESHOLDS.GOOD;
    if (qualityScore >= QUALITY_THRESHOLDS.FAIR.min) return QUALITY_THRESHOLDS.FAIR;
    return QUALITY_THRESHOLDS.POOR;
  }, [qualityScore]);

  // 💰 Earnings Calculation
  const potentialEarnings = React.useMemo(() => {
    const baseEarning = 999; // Base expert revenue
    const bonus = (baseEarning * expertTier.bonus) / 100;
    return {
      base: baseEarning,
      bonus: bonus,
      total: baseEarning + bonus,
      formatted: `ETB ${(baseEarning + bonus).toLocaleString()}`
    };
  }, [expertTier.bonus]);

  // 🎯 Capacity Calculation
  const capacityInfo = React.useMemo(() => {
    const current = expert.currentStudents || 0;
    const max = expert.maxStudents || 50;
    const percentage = (current / max) * 100;
    
    return {
      current,
      max,
      percentage,
      isFull: percentage >= 95,
      isLimited: percentage >= 80,
      available: max - current
    };
  }, [expert.currentStudents, expert.maxStudents]);

  // 🏗️ Skill Badges
  const primarySkills = React.useMemo(() => {
    return expert.skills?.slice(0, 3) || [];
  }, [expert.skills]);

  // 🎯 Performance Metrics
  const performanceMetrics = React.useMemo(() => [
    {
      label: 'Completion Rate',
      value: `${Math.round(completionRate * 100)}%`,
      icon: 'check-circle',
      color: completionRate >= 0.7 ? '#10B981' : '#EF4444'
    },
    {
      label: 'Avg. Response',
      value: `${responseTime}h`,
      icon: 'clock',
      color: responseTime <= 12 ? '#10B981' : responseTime <= 24 ? '#F59E0B' : '#EF4444'
    },
    {
      label: 'Students',
      value: `${capacityInfo.current}/${capacityInfo.max}`,
      icon: 'users',
      color: capacityInfo.isLimited ? '#F59E0B' : '#3B82F6'
    }
  ], [completionRate, responseTime, capacityInfo]);

  // 🏗️ Event Handlers
  const handleCardPress = useCallback(() => {
    onPress?.(expert);
  }, [onPress, expert]);

  const handleEnrollPress = useCallback(() => {
    if (capacityInfo.isFull) {
      Alert.alert(
        'Capacity Full',
        'This expert has reached maximum student capacity. Please select another expert.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (qualityScore < 4.0) {
      Alert.alert(
        'Quality Notice',
        'This expert is currently below quality thresholds. We recommend selecting a higher-rated expert.',
        [
          { text: 'Select Another', style: 'cancel' },
          { 
            text: 'Continue Anyway', 
            style: 'default',
            onPress: () => onEnroll?.(expert)
          }
        ]
      );
      return;
    }

    onEnroll?.(expert);
  }, [onEnroll, expert, capacityInfo.isFull, qualityScore]);

  // 🎯 Animation Effects
  React.useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [opacityAnim]);

  // 🏗️ Compact Variant Render
  if (variant === 'compact') {
    return (
      <Animated.View
        style={[
          styles.compactContainer,
          { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          isSelected && styles.selectedContainer,
          style
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handleCardPress}
          style={styles.compactTouchable}
        >
          {/* 🎯 Compact Header */}
          <View style={styles.compactHeader}>
            <View style={styles.compactAvatar}>
              <Text style={styles.compactAvatarText}>
                {expert.name?.charAt(0)?.toUpperCase() || 'E'}
              </Text>
              <View style={[styles.statusIndicator, 
                expert.isOnline ? styles.online : styles.offline
              ]} />
            </View>
            
            <View style={styles.compactInfo}>
              <Text style={styles.compactName} numberOfLines={1}>
                {expert.name || 'Expert Name'}
              </Text>
              <Text style={styles.compactTitle} numberOfLines={1}>
                {expert.title || 'Professional Trainer'}
              </Text>
            </View>

            <View style={styles.compactMetrics}>
              <View style={[styles.tierBadgeCompact, 
                { backgroundColor: expertTier.color }
              ]}>
                <Text style={styles.tierBadgeText}>
                  {expertTier.name.split(' ')[0]}
                </Text>
              </View>
              <Text style={styles.qualityScoreCompact}>
                {qualityScore.toFixed(1)}
              </Text>
            </View>
          </View>

          {/* 🏗️ Quick Stats */}
          <View style={styles.compactStats}>
            {performanceMetrics.map((metric, index) => (
              <View key={metric.label} style={styles.compactStat}>
                <FontAwesome5 
                  name={metric.icon} 
                  size={12} 
                  color={metric.color}
                  solid 
                />
                <Text style={styles.compactStatText}>
                  {metric.value}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // 🎯 Detailed Variant Render
  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
        isSelected && styles.selectedContainer,
        style
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handleCardPress}
        style={styles.touchable}
        disabled={!onPress}
      >
        {/* 🏗️ Premium Header with Gradient */}
        <LinearGradient
          colors={expertTier.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            {/* 🎯 Expert Avatar & Basic Info */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {expert.name?.charAt(0)?.toUpperCase() || 'E'}
                  </Text>
                  {expert.profileImage && (
                    <BlurView intensity={80} style={StyleSheet.absoluteFill} />
                  )}
                </View>
                <View style={[
                  styles.statusIndicator,
                  expert.isOnline ? styles.online : styles.offline
                ]} />
              </View>

              <View style={styles.basicInfo}>
                <Text style={styles.expertName} numberOfLines={1}>
                  {expert.name || 'Expert Name'}
                </Text>
                <Text style={styles.expertTitle} numberOfLines={1}>
                  {expert.title || 'Professional Trainer'}
                </Text>
                <Text style={styles.expertExperience}>
                  {expert.experience || '2+'} years experience
                </Text>
              </View>
            </View>

            {/* 🏗️ Tier & Quality Badge */}
            <View style={styles.tierSection}>
              <View style={[styles.tierBadge, 
                { backgroundColor: expertTier.color }
              ]}>
                <MaterialIcons name="workspace-premium" size={16} color="#000" />
                <Text style={styles.tierBadgeText}>
                  {expertTier.name}
                </Text>
              </View>
              
              <View style={styles.qualityBadge}>
                <View style={[styles.qualityDot, 
                  { backgroundColor: qualityLevel.color }
                ]} />
                <Text style={styles.qualityScore}>
                  {qualityScore.toFixed(1)}
                </Text>
                <Text style={styles.qualityLabel}>
                  {qualityLevel.label}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* 🎯 Main Content */}
        <View style={styles.content}>
          {/* 🏗️ Performance Metrics Grid */}
          <View style={styles.metricsGrid}>
            {performanceMetrics.map((metric, index) => (
              <View key={metric.label} style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <FontAwesome5 
                    name={metric.icon} 
                    size={14} 
                    color={metric.color}
                    solid 
                  />
                  <Text style={styles.metricValue}>
                    {metric.value}
                  </Text>
                </View>
                <Text style={styles.metricLabel}>
                  {metric.label}
                </Text>
              </View>
            ))}
          </View>

          {/* 💰 Earnings & Bonus Display */}
          <View style={styles.earningsSection}>
            <Text style={styles.earningsTitle}>Potential Earnings</Text>
            <View style={styles.earningsBreakdown}>
              <View style={styles.earningItem}>
                <Text style={styles.earningLabel}>Base Revenue</Text>
                <Text style={styles.earningValue}>ETB 999</Text>
              </View>
              <View style={styles.earningItem}>
                <Text style={styles.earningLabel}>Quality Bonus</Text>
                <Text style={[styles.earningValue, styles.bonusValue]}>
                  +{expertTier.bonus}% (ETB {potentialEarnings.bonus})
                </Text>
              </View>
              <View style={styles.earningItem}>
                <Text style={styles.earningLabel}>Total Potential</Text>
                <Text style={[styles.earningValue, styles.totalEarning]}>
                  {potentialEarnings.formatted}
                </Text>
              </View>
            </View>
          </View>

          {/* 🎯 Skills & Specializations */}
          {primarySkills.length > 0 && (
            <View style={styles.skillsSection}>
              <Text style={styles.skillsTitle}>Specializations</Text>
              <View style={styles.skillsContainer}>
                {primarySkills.map((skill, index) => (
                  <View key={skill.id} style={styles.skillBadge}>
                    <Text style={styles.skillText}>
                      {skill.name}
                    </Text>
                  </View>
                ))}
                {expert.skills?.length > 3 && (
                  <View style={styles.moreSkillsBadge}>
                    <Text style={styles.moreSkillsText}>
                      +{expert.skills.length - 3} more
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* 🏗️ Capacity Indicator */}
          <View style={styles.capacitySection}>
            <View style={styles.capacityHeader}>
              <Text style={styles.capacityTitle}>
                Student Capacity
              </Text>
              <Text style={[
                styles.capacityStatus,
                capacityInfo.isFull && styles.capacityFull
              ]}>
                {capacityInfo.isFull ? 'Full' : 
                 capacityInfo.isLimited ? 'Limited' : 'Available'}
              </Text>
            </View>
            <View style={styles.capacityBar}>
              <View 
                style={[
                  styles.capacityFill,
                  { 
                    width: `${Math.min(capacityInfo.percentage, 100)}%`,
                    backgroundColor: capacityInfo.isFull ? '#EF4444' : 
                                   capacityInfo.isLimited ? '#F59E0B' : '#10B981'
                  }
                ]} 
              />
            </View>
            <Text style={styles.capacityText}>
              {capacityInfo.available} spots available of {capacityInfo.max}
            </Text>
          </View>

          {/* 📝 Portfolio Preview */}
          {expert.portfolioItems && expert.portfolioItems.length > 0 && (
            <View style={styles.portfolioSection}>
              <Text style={styles.portfolioTitle}>Portfolio Highlights</Text>
              <View style={styles.portfolioItems}>
                {expert.portfolioItems.slice(0, 2).map((item, index) => (
                  <View key={item.id} style={styles.portfolioItem}>
                    <MaterialIcons name="work-outline" size={16} color="#6B7280" />
                    <Text style={styles.portfolioText} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 🎯 Action Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.enrollButton,
              (capacityInfo.isFull || qualityScore < 4.0) && styles.enrollButtonDisabled
            ]}
            onPress={handleEnrollPress}
            disabled={capacityInfo.isFull || qualityScore < 4.0}
          >
            <LinearGradient
              colors={capacityInfo.isFull ? ['#9CA3AF', '#6B7280'] : expertTier.gradient}
              style={styles.enrollButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons 
                name={capacityInfo.isFull ? "person-off" : "person-add"} 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={styles.enrollButtonText}>
                {capacityInfo.isFull ? 'Capacity Full' : 
                 qualityScore < 4.0 ? 'Below Quality' : 'Select Expert'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={handleCardPress}
          >
            <Text style={styles.detailsButtonText}>
              View Details
            </Text>
            <MaterialIcons name="chevron-right" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// 🏗️ Enterprise Styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  selectedContainer: {
    borderWidth: 2,
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  touchable: {
    flex: 1,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  online: {
    backgroundColor: '#10B981',
  },
  offline: {
    backgroundColor: '#6B7280',
  },
  basicInfo: {
    flex: 1,
  },
  expertName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  expertTitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  expertExperience: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tierSection: {
    alignItems: 'flex-end',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 4,
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  qualityScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 4,
  },
  qualityLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    padding: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 6,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  earningsSection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  earningsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  earningsBreakdown: {
    gap: 8,
  },
  earningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  earningValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  bonusValue: {
    color: '#10B981',
  },
  totalEarning: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  skillsSection: {
    marginBottom: 16,
  },
  skillsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  moreSkillsBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  moreSkillsText: {
    fontSize: 12,
    color: '#6B7280',
  },
  capacitySection: {
    marginBottom: 16,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  capacityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  capacityStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  capacityFull: {
    color: '#EF4444',
  },
  capacityBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  capacityFill: {
    height: '100%',
    borderRadius: 4,
  },
  capacityText: {
    fontSize: 12,
    color: '#6B7280',
  },
  portfolioSection: {
    marginBottom: 16,
  },
  portfolioTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  portfolioItems: {
    gap: 8,
  },
  portfolioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
  },
  portfolioText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },
  enrollButton: {
    flex: 1,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  enrollButtonDisabled: {
    opacity: 0.6,
  },
  enrollButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  enrollButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  detailsButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },

  // 🎯 Compact Variant Styles
  compactContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  compactTouchable: {
    padding: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  compactAvatarText: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 40,
    fontSize: 16,
    fontWeight: 'bold',
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  compactTitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  compactMetrics: {
    alignItems: 'flex-end',
  },
  tierBadgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  tierBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  qualityScoreCompact: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  compactStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  compactStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactStatText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
});

// 🏗️ Prop Types for Enterprise Development
ExpertCard.propTypes = {
  // expert: PropTypes.shape({
  //   id: PropTypes.string.isRequired,
  //   name: PropTypes.string,
  //   title: PropTypes.string,
  //   experience: PropTypes.number,
  //   isOnline: PropTypes.bool,
  //   profileImage: PropTypes.string,
  //   qualityMetrics: PropTypes.shape({
  //     overallScore: PropTypes.number,
  //     completionRate: PropTypes.number,
  //     responseTime: PropTypes.number,
  //   }),
  //   skills: PropTypes.arrayOf(PropTypes.shape({
  //     id: PropTypes.string,
  //     name: PropTypes.string,
  //   })),
  //   currentStudents: PropTypes.number,
  //   maxStudents: PropTypes.number,
  //   portfolioItems: PropTypes.array,
  // }).isRequired,
  onPress: PropTypes.func,
  onEnroll: PropTypes.func,
  isSelected: PropTypes.bool,
  variant: PropTypes.oneOf(['compact', 'detailed']),
  style: PropTypes.object,
};

// 🎯 Default Props
ExpertCard.defaultProps = {
  variant: 'detailed',
  isSelected: false,
};

// 🏗️ Enterprise Export
export default ExpertCard;

// 🎯 Additional Exports for Enterprise Use
export { EXPERT_TIERS, QUALITY_THRESHOLDS };