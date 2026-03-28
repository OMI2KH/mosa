/**
 * 🏢 MOSA FORGE - Enterprise Expert Training Enrollment
 * 👨‍🏫 Expert Skill Enhancement & Quality Improvement Platform
 * 🎯 Personalized Training Paths & Certification Tracks
 * 📊 Performance-Based Skill Development
 * 🚀 Enterprise-Grade Frontend Architecture
 * 
 * @module ExpertTrainingEnrollment
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Text,
  Card,
  Button,
  IconButton,
  ProgressBar,
  Chip,
  Divider,
  List,
  Badge,
  Avatar,
  useTheme
} from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';

// 🏗️ Enterprise Dependencies
import EnterpriseLogger from '../../utils/enterprise-logger';
import AnalyticsService from '../../services/analytics-service';
import TrainingService from '../../services/training-service';
import AuthContext from '../../contexts/auth-context';
import LoadingOverlay from '../../components/shared/loading-overlay';
import ErrorBoundary from '../../components/shared/error-boundary';
import NetworkStatus from '../../components/shared/network-status';

// 🎯 Custom Components
import SkillCard from '../../components/expert/skill-card';
import TrainingPathCard from '../../components/expert/training-path-card';
import CertificationTrackCard from '../../components/expert/certification-track-card';
import ProgressTracker from '../../components/expert/progress-tracker';
import QualityMetricsDisplay from '../../components/expert/quality-metrics-display';

const ExpertTrainingEnrollment = () => {
  // 🎨 Theme & Navigation
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  
  // 🔐 Context
  const { user, expertProfile } = React.useContext(AuthContext);
  
  // 📊 State Management
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [trainingPaths, setTrainingPaths] = useState([]);
  const [certificationTracks, setCertificationTracks] = useState([]);
  const [recommendedTrainings, setRecommendedTrainings] = useState([]);
  const [activeEnrollments, setActiveEnrollments] = useState([]);
  const [qualityMetrics, setQualityMetrics] = useState(null);
  const [tierInfo, setTierInfo] = useState(null);
  const [availableCredits, setAvailableCredits] = useState(0);
  
  // 🏗️ Service Instances
  const logger = new EnterpriseLogger('expert-training-enrollment');
  const analytics = new AnalyticsService();
  const trainingService = new TrainingService();

  // 🎯 Animation References
  const scrollViewRef = React.useRef();
  const headerAnimationRef = React.useRef();

  /**
   * 🚀 INITIALIZE COMPONENT
   */
  useEffect(() => {
    initializeComponent();
    setupEventListeners();
    
    // 📊 Track Analytics
    analytics.trackPageView('expert_training_enrollment', {
      expertId: expertProfile?.id,
      tier: expertProfile?.currentTier
    });
    
    return () => {
      cleanupEventListeners();
    };
  }, []);

  /**
   * 🏗️ INITIALIZE COMPONENT DATA
   */
  const initializeComponent = async () => {
    try {
      setLoading(true);
      
      // 🔄 Load All Required Data
      await Promise.all([
        loadExpertData(),
        loadTrainingData(),
        loadQualityMetrics(),
        loadActiveEnrollments()
      ]);
      
      logger.info('Component initialized successfully', {
        expertId: expertProfile?.id,
        loadedData: ['expert', 'training', 'quality', 'enrollments']
      });
      
    } catch (error) {
      logger.error('Component initialization failed', {
        error: error.message,
        stack: error.stack
      });
      
      Alert.alert(
        'Initialization Error',
        'Failed to load training data. Please try again.',
        [{ text: 'Retry', onPress: initializeComponent }]
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🔍 LOAD EXPERT DATA
   */
  const loadExpertData = async () => {
    try {
      // 🎯 Load expert-specific data
      const [tierData, creditData] = await Promise.all([
        trainingService.getExpertTierInfo(expertProfile.id),
        trainingService.getAvailableCredits(expertProfile.id)
      ]);
      
      setTierInfo(tierData);
      setAvailableCredits(creditData.availableCredits);
      
    } catch (error) {
      logger.error('Failed to load expert data', {
        expertId: expertProfile.id,
        error: error.message
      });
      throw error;
    }
  };

  /**
   * 📚 LOAD TRAINING DATA
   */
  const loadTrainingData = async () => {
    try {
      // 🔄 Load all training-related data in parallel
      const [paths, tracks, recommendations] = await Promise.all([
        trainingService.getTrainingPaths(expertProfile.id),
        trainingService.getCertificationTracks(expertProfile.currentTier),
        trainingService.getRecommendedTrainings(expertProfile.id)
      ]);
      
      setTrainingPaths(paths);
      setCertificationTracks(tracks);
      setRecommendedTrainings(recommendations);
      
    } catch (error) {
      logger.error('Failed to load training data', {
        expertId: expertProfile.id,
        error: error.message
      });
      throw error;
    }
  };

  /**
   * 📊 LOAD QUALITY METRICS
   */
  const loadQualityMetrics = async () => {
    try {
      const metrics = await trainingService.getQualityMetrics(expertProfile.id);
      setQualityMetrics(metrics);
    } catch (error) {
      logger.warn('Failed to load quality metrics', {
        expertId: expertProfile.id,
        error: error.message
      });
      // Don't throw error - continue without metrics
    }
  };

  /**
   * 🎓 LOAD ACTIVE ENROLLMENTS
   */
  const loadActiveEnrollments = async () => {
    try {
      const enrollments = await trainingService.getActiveEnrollments(expertProfile.id);
      setActiveEnrollments(enrollments);
    } catch (error) {
      logger.error('Failed to load active enrollments', {
        expertId: expertProfile.id,
        error: error.message
      });
      throw error;
    }
  };

  /**
   * 🔄 HANDLE REFRESH
   */
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await initializeComponent();
    setRefreshing(false);
    
    // 🎉 Refresh Animation
    if (headerAnimationRef.current) {
      headerAnimationRef.current.pulse(800);
    }
  }, []);

  /**
   * 🎯 SELECT SKILL
   */
  const handleSelectSkill = (skill) => {
    setSelectedSkill(skill);
    
    // 📊 Analytics
    analytics.trackEvent('skill_selected', {
      skillId: skill.id,
      skillName: skill.name,
      expertId: expertProfile.id
    });
    
    // 🎬 Animation
    if (skill) {
      navigation.navigate('SkillTrainingDetail', { skill });
    }
  };

  /**
   * 🚀 ENROLL IN TRAINING
   */
  const handleEnrollInTraining = async (training) => {
    try {
      // 🛡️ Validation Checks
      if (availableCredits < training.requiredCredits) {
        Alert.alert(
          'Insufficient Credits',
          `You need ${training.requiredCredits - availableCredits} more credits to enroll in this training.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Get Credits', onPress: () => navigation.navigate('CreditPurchase') }
          ]
        );
        return;
      }
      
      // 🎯 Show Confirmation Dialog
      Alert.alert(
        'Enroll in Training',
        `Are you sure you want to enroll in "${training.title}"?\n\nRequired Credits: ${training.requiredCredits}\nDuration: ${training.duration}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enroll',
            style: 'destructive',
            onPress: async () => {
              await processEnrollment(training);
            }
          }
        ]
      );
      
    } catch (error) {
      logger.error('Enrollment preparation failed', {
        trainingId: training.id,
        error: error.message
      });
      
      Alert.alert('Enrollment Error', 'Failed to prepare enrollment. Please try again.');
    }
  };

  /**
   * 🔄 PROCESS ENROLLMENT
   */
  const processEnrollment = async (training) => {
    try {
      setLoading(true);
      
      // 📊 Analytics
      analytics.trackEvent('training_enrollment_started', {
        trainingId: training.id,
        trainingTitle: training.title,
        expertId: expertProfile.id
      });
      
      // 💾 Process Enrollment
      const enrollmentResult = await trainingService.enrollInTraining({
        expertId: expertProfile.id,
        trainingId: training.id,
        trainingType: training.type,
        requiredCredits: training.requiredCredits
      });
      
      if (enrollmentResult.success) {
        // 🎉 Success Handling
        await handleEnrollmentSuccess(enrollmentResult, training);
      } else {
        throw new Error(enrollmentResult.error || 'Enrollment failed');
      }
      
    } catch (error) {
      logger.error('Enrollment processing failed', {
        trainingId: training.id,
        error: error.message
      });
      
      Alert.alert(
        'Enrollment Failed',
        error.message || 'Failed to process enrollment. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🎉 HANDLE ENROLLMENT SUCCESS
   */
  const handleEnrollmentSuccess = async (enrollmentResult, training) => {
    // 📊 Analytics
    analytics.trackEvent('training_enrollment_completed', {
      trainingId: training.id,
      enrollmentId: enrollmentResult.enrollmentId,
      expertId: expertProfile.id
    });
    
    // 🔄 Update Local State
    setAvailableCredits(prev => prev - training.requiredCredits);
    setActiveEnrollments(prev => [...prev, enrollmentResult.enrollment]);
    
    // 🎬 Success Animation
    if (headerAnimationRef.current) {
      headerAnimationRef.current.bounce(1000);
    }
    
    // 📧 Show Success Message
    Alert.alert(
      '🎉 Enrollment Successful!',
      `You have successfully enrolled in "${training.title}".\n\nEnrollment ID: ${enrollmentResult.enrollmentId}\n\nYou will be redirected to your training dashboard.`,
      [
        {
          text: 'Go to Dashboard',
          onPress: () => navigation.navigate('TrainingDashboard', {
            enrollmentId: enrollmentResult.enrollmentId
          })
        },
        {
          text: 'Continue Browsing',
          style: 'cancel'
        }
      ]
    );
  };

  /**
   * 📊 VIEW TRAINING DETAILS
   */
  const handleViewTrainingDetails = (training) => {
    navigation.navigate('TrainingDetail', {
      training,
      expertId: expertProfile.id,
      availableCredits
    });
    
    // 📊 Analytics
    analytics.trackEvent('training_details_viewed', {
      trainingId: training.id,
      trainingType: training.type,
      expertId: expertProfile.id
    });
  };

  /**
   * 🎓 VIEW CERTIFICATION DETAILS
   */
  const handleViewCertificationDetails = (certification) => {
    navigation.navigate('CertificationDetail', {
      certification,
      expertId: expertProfile.id,
      currentTier: expertProfile.currentTier
    });
    
    // 📊 Analytics
    analytics.trackEvent('certification_details_viewed', {
      certificationId: certification.id,
      expertId: expertProfile.id,
      tier: expertProfile.currentTier
    });
  };

  /**
   * 📈 VIEW QUALITY INSIGHTS
   */
  const handleViewQualityInsights = () => {
    if (qualityMetrics) {
      navigation.navigate('QualityInsights', {
        metrics: qualityMetrics,
        expertId: expertProfile.id
      });
      
      // 📊 Analytics
      analytics.trackEvent('quality_insights_viewed', {
        expertId: expertProfile.id,
        qualityScore: qualityMetrics.overallScore
      });
    }
  };

  /**
   * 🏆 VIEW TIER BENEFITS
   */
  const handleViewTierBenefits = () => {
    if (tierInfo) {
      navigation.navigate('TierBenefits', {
        tierInfo,
        expertId: expertProfile.id,
        currentTier: expertProfile.currentTier
      });
      
      // 📊 Analytics
      analytics.trackEvent('tier_benefits_viewed', {
        expertId: expertProfile.id,
        currentTier: expertProfile.currentTier
      });
    }
  };

  /**
   * ⚙️ SETUP EVENT LISTENERS
   */
  const setupEventListeners = () => {
    // 🎯 Listen for enrollment updates
    const enrollmentSubscription = trainingService.onEnrollmentUpdate(
      expertProfile.id,
      (update) => {
        handleEnrollmentUpdate(update);
      }
    );
    
    // 📊 Listen for quality metric updates
    const qualitySubscription = trainingService.onQualityUpdate(
      expertProfile.id,
      (update) => {
        handleQualityUpdate(update);
      }
    );
    
    // Store subscriptions for cleanup
    return () => {
      enrollmentSubscription?.unsubscribe();
      qualitySubscription?.unsubscribe();
    };
  };

  /**
   * 🔄 HANDLE ENROLLMENT UPDATES
   */
  const handleEnrollmentUpdate = (update) => {
    // 🔄 Update active enrollments
    setActiveEnrollments(prev => 
      prev.map(enrollment => 
        enrollment.id === update.enrollmentId 
          ? { ...enrollment, ...update.data }
          : enrollment
      )
    );
    
    // 📊 Analytics
    analytics.trackEvent('enrollment_updated', {
      enrollmentId: update.enrollmentId,
      updateType: update.type,
      expertId: expertProfile.id
    });
  };

  /**
   * 📈 HANDLE QUALITY UPDATES
   */
  const handleQualityUpdate = (update) => {
    // 🔄 Update quality metrics
    setQualityMetrics(prev => ({
      ...prev,
      ...update.data
    }));
    
    // 🎯 Log quality update
    logger.info('Quality metrics updated', {
      expertId: expertProfile.id,
      updateType: update.type,
      newScore: update.data.overallScore
    });
  };

  /**
   * 🧹 CLEANUP EVENT LISTENERS
   */
  const cleanupEventListeners = () => {
    // Cleanup handled in setupEventListeners return function
  };

  /**
   * 🎨 RENDER HEADER SECTION
   */
  const renderHeader = () => (
    <Animatable.View 
      ref={headerAnimationRef}
      animation="fadeInDown"
      duration={800}
      style={styles.headerContainer}
    >
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <Avatar.Image 
            size={50}
            source={{ uri: expertProfile?.avatar || 'https://via.placeholder.com/50' }}
            style={styles.avatar}
          />
          <View style={styles.headerText}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.expertName}>
              {expertProfile?.personalInfo?.firstName || 'Expert'}
            </Text>
            <View style={styles.tierBadgeContainer}>
              <Badge 
                size={24}
                style={[
                  styles.tierBadge,
                  { backgroundColor: getTierColor(expertProfile?.currentTier) }
                ]}
              >
                {expertProfile?.currentTier?.toUpperCase() || 'STANDARD'}
              </Badge>
            </View>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          <IconButton
            icon="bell-outline"
            size={24}
            onPress={() => navigation.navigate('Notifications')}
            style={styles.headerIcon}
          />
          <IconButton
            icon="account-circle"
            size={24}
            onPress={() => navigation.navigate('ExpertProfile')}
            style={styles.headerIcon}
          />
        </View>
      </View>
      
      {/* 🎯 Quick Stats */}
      <View style={styles.quickStatsContainer}>
        <Card style={styles.statCard}>
          <Card.Content>
            <Text style={styles.statLabel}>Available Credits</Text>
            <Text style={styles.statValue}>{availableCredits}</Text>
            <Button 
              mode="contained" 
              compact
              onPress={() => navigation.navigate('CreditPurchase')}
              style={styles.creditButton}
            >
              Get More
            </Button>
          </Card.Content>
        </Card>
        
        <Card style={styles.statCard}>
          <Card.Content>
            <Text style={styles.statLabel}>Active Trainings</Text>
            <Text style={styles.statValue}>{activeEnrollments.length}</Text>
            <Button 
              mode="outlined" 
              compact
              onPress={() => navigation.navigate('TrainingDashboard')}
              style={styles.trainingButton}
            >
              View All
            </Button>
          </Card.Content>
        </Card>
        
        {qualityMetrics && (
          <TouchableOpacity onPress={handleViewQualityInsights}>
            <Card style={styles.statCard}>
              <Card.Content>
                <Text style={styles.statLabel}>Quality Score</Text>
                <View style={styles.qualityScoreContainer}>
                  <Text style={styles.statValue}>
                    {qualityMetrics.overallScore.toFixed(1)}
                  </Text>
                  <ProgressBar 
                    progress={qualityMetrics.overallScore / 5}
                    color={getQualityColor(qualityMetrics.overallScore)}
                    style={styles.qualityProgress}
                  />
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )}
      </View>
    </Animatable.View>
  );

  /**
   * 🎯 RENDER RECOMMENDED TRAININGS
   */
  const renderRecommendedTrainings = () => (
    <Animatable.View animation="fadeInUp" duration={600} delay={200}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🎯 Recommended for You</Text>
        <Button 
          mode="text" 
          onPress={() => navigation.navigate('AllTrainings')}
          icon="chevron-right"
        >
          See All
        </Button>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.horizontalScroll}
      >
        {recommendedTrainings.map((training, index) => (
          <TrainingPathCard
            key={training.id}
            training={training}
            index={index}
            onEnroll={() => handleEnrollInTraining(training)}
            onViewDetails={() => handleViewTrainingDetails(training)}
            availableCredits={availableCredits}
          />
        ))}
        
        {recommendedTrainings.length === 0 && (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <LottieView
                source={require('../../assets/animations/empty-training.json')}
                autoPlay
                loop
                style={styles.emptyAnimation}
              />
              <Text style={styles.emptyText}>
                No recommended trainings found
              </Text>
              <Button 
                mode="contained"
                onPress={() => navigation.navigate('SkillAssessment')}
              >
                Take Skill Assessment
              </Button>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </Animatable.View>
  );

  /**
   * 📚 RENDER CERTIFICATION TRACKS
   */
  const renderCertificationTracks = () => (
    <Animatable.View animation="fadeInUp" duration={600} delay={400}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🏆 Certification Tracks</Text>
        <TouchableOpacity onPress={handleViewTierBenefits}>
          <Chip 
            icon="crown"
            mode="outlined"
            style={styles.tierChip}
          >
            {expertProfile?.currentTier || 'Standard'} Tier
          </Chip>
        </TouchableOpacity>
      </View>
      
      <View style={styles.certificationGrid}>
        {certificationTracks.map((track, index) => (
          <CertificationTrackCard
            key={track.id}
            certification={track}
            index={index}
            currentTier={expertProfile?.currentTier}
            onViewDetails={() => handleViewCertificationDetails(track)}
          />
        ))}
      </View>
    </Animatable.View>
  );

  /**
   * 📈 RENDER QUALITY METRICS
   */
  const renderQualityMetrics = () => {
    if (!qualityMetrics) return null;
    
    return (
      <Animatable.View animation="fadeInUp" duration={600} delay={600}>
        <TouchableOpacity onPress={handleViewQualityInsights}>
          <Card style={styles.qualityCard}>
            <Card.Content>
              <View style={styles.qualityHeader}>
                <Text style={styles.sectionTitle}>📈 Quality Performance</Text>
                <IconButton 
                  icon="chevron-right" 
                  size={20}
                  onPress={handleViewQualityInsights}
                />
              </View>
              
              <QualityMetricsDisplay 
                metrics={qualityMetrics}
                compact={true}
              />
              
              <View style={styles.improvementTips}>
                <Text style={styles.improvementTitle}>
                  💡 Improvement Tips
                </Text>
                {qualityMetrics.improvementAreas?.slice(0, 2).map((area, index) => (
                  <Chip 
                    key={index}
                    mode="outlined"
                    style={styles.improvementChip}
                    onPress={() => navigation.navigate('TrainingDetail', {
                      training: area.recommendedTraining
                    })}
                  >
                    {area.area}: {area.recommendation}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  /**
   * 🎓 RENDER ACTIVE ENROLLMENTS
   */
  const renderActiveEnrollments = () => (
    <Animatable.View animation="fadeInUp" duration={600} delay={800}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📚 Active Trainings</Text>
        <Button 
          mode="text"
          onPress={() => navigation.navigate('TrainingDashboard')}
          icon="arrow-right"
        >
          Dashboard
        </Button>
      </View>
      
      {activeEnrollments.length > 0 ? (
        <List.Section>
          {activeEnrollments.slice(0, 3).map((enrollment) => (
            <List.Item
              key={enrollment.id}
              title={enrollment.trainingTitle}
              description={`Progress: ${enrollment.progress}% • Due: ${enrollment.dueDate}`}
              left={props => (
                <List.Icon 
                  {...props}
                  icon={getTrainingIcon(enrollment.trainingType)}
                  color={theme.colors.primary}
                />
              )}
              right={props => (
                <ProgressBar 
                  progress={enrollment.progress / 100}
                  color={theme.colors.primary}
                  style={styles.enrollmentProgress}
                />
              )}
              onPress={() => navigation.navigate('TrainingSession', {
                enrollmentId: enrollment.id
              })}
              style={styles.enrollmentItem}
            />
          ))}
          
          {activeEnrollments.length > 3 && (
            <Button 
              mode="outlined"
              onPress={() => navigation.navigate('TrainingDashboard')}
              style={styles.viewAllButton}
            >
              View All {activeEnrollments.length} Trainings
            </Button>
          )}
        </List.Section>
      ) : (
        <Card style={styles.emptyCard}>
          <Card.Content style={styles.emptyContent}>
            <LottieView
              source={require('../../assets/animations/start-learning.json')}
              autoPlay
              loop
              style={styles.emptyAnimation}
            />
            <Text style={styles.emptyText}>
              No active trainings. Start your learning journey!
            </Text>
            <Button 
              mode="contained"
              onPress={() => navigation.navigate('AllTrainings')}
              style={styles.startButton}
            >
              Browse Trainings
            </Button>
          </Card.Content>
        </Card>
      )}
    </Animatable.View>
  );

  /**
   * 🎨 RENDER FOOTER
   */
  const renderFooter = () => (
    <Animatable.View animation="fadeInUp" duration={600} delay={1000}>
      <Card style={styles.footerCard}>
        <Card.Content>
          <View style={styles.footerContent}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerTitle}>
                Need Help Choosing?
              </Text>
              <Text style={styles.footerText}>
                Our AI trainer can recommend the perfect training path for your goals.
              </Text>
            </View>
            <Button 
              mode="contained"
              onPress={() => navigation.navigate('AITrainer')}
              icon="robot"
              style={styles.footerButton}
            >
              AI Trainer
            </Button>
          </View>
        </Card.Content>
      </Card>
    </Animatable.View>
  );

  /**
   * 🎨 GET TIER COLOR
   */
  const getTierColor = (tier) => {
    const colors = {
      standard: '#4CAF50', // Green
      senior: '#2196F3',   // Blue
      master: '#FF9800'    // Orange
    };
    return colors[tier?.toLowerCase()] || colors.standard;
  };

  /**
   * 🎨 GET QUALITY COLOR
   */
  const getQualityColor = (score) => {
    if (score >= 4.5) return '#4CAF50'; // Green
    if (score >= 4.0) return '#FF9800'; // Orange
    if (score >= 3.5) return '#FF5722'; // Red-Orange
    return '#F44336'; // Red
  };

  /**
   * 🎨 GET TRAINING ICON
   */
  const getTrainingIcon = (type) => {
    const icons = {
      technical: 'code-braces',
      soft_skills: 'account-group',
      quality: 'star',
      certification: 'certificate',
      advanced: 'rocket'
    };
    return icons[type] || 'school';
  };

  /**
   * 🎯 MAIN RENDER
   */
  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar 
          barStyle="dark-content"
          backgroundColor={theme.colors.background}
        />
        
        <NetworkStatus />
        
        {loading ? (
          <LoadingOverlay 
            message="Loading your training portal..."
            showAnimation={true}
          />
        ) : (
          <>
            {/* 🎯 Header Section */}
            {renderHeader()}
            
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={[theme.colors.primary]}
                  tintColor={theme.colors.primary}
                />
              }
            >
              {/* 🎯 Recommended Trainings */}
              {renderRecommendedTrainings()}
              
              <Divider style={styles.divider} />
              
              {/* 🏆 Certification Tracks */}
              {renderCertificationTracks()}
              
              <Divider style={styles.divider} />
              
              {/* 📈 Quality Metrics */}
              {renderQualityMetrics()}
              
              <Divider style={styles.divider} />
              
              {/* 📚 Active Enrollments */}
              {renderActiveEnrollments()}
              
              {/* 🎨 Footer */}
              {renderFooter()}
              
              {/* 📱 Bottom Spacing */}
              <View style={styles.bottomSpacing} />
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </ErrorBoundary>
  );
};

/**
 * 🎨 STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 0 : 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
  },
  headerText: {
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 12,
    color: '#666',
  },
  expertName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tierBadgeContainer: {
    marginTop: 4,
  },
  tierBadge: {
    alignSelf: 'flex-start',
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginLeft: 8,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  creditButton: {
    marginTop: 4,
  },
  trainingButton: {
    marginTop: 4,
  },
  qualityScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityProgress: {
    flex: 1,
    marginLeft: 8,
    height: 6,
    borderRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tierChip: {
    marginLeft: 8,
  },
  horizontalScroll: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  emptyCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyAnimation: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  startButton: {
    marginTop: 8,
  },
  certificationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    justifyContent: 'space-between',
  },
  qualityCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 3,
  },
  qualityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  improvementTips: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  improvementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  improvementChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  enrollmentItem: {
    paddingVertical: 8,
  },
  enrollmentProgress: {
    width: 60,
    height: 6,
    borderRadius: 3,
  },
  viewAllButton: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  divider: {
    marginHorizontal: 16,
    marginVertical: 16,
  },
  footerCard: {
    margin: 16,
    marginTop: 24,
    elevation: 4,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flex: 1,
    marginRight: 16,
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footerButton: {
    minWidth: 120,
  },
  bottomSpacing: {
    height: 100,
  },
});

export default ExpertTrainingEnrollment;
