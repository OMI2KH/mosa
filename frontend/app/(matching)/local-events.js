/**
 * 🏢 MOSA FORGE - Enterprise Local Events & Community System
 * 🌍 Real-time Local Events Discovery & Networking
 * 🎯 Personalized Event Recommendations & Matching
 * 🔄 Dynamic Event Management & Participation Tracking
 * 🚀 Enterprise-Grade React Native Implementation
 * 
 * @module LocalEvents
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
  Image,
  Animated,
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Filter,
  Search,
  Star,
  ChevronRight,
  Share2,
  Bookmark,
  CheckCircle,
  XCircle,
  TrendingUp,
  Award,
  MessageSquare,
  Navigation,
  Phone,
  Globe,
  Mail,
  Heart,
  Flag,
  MoreVertical,
  Bell,
  Camera,
  Video,
  Mic,
  Users as UsersIcon,
  DollarSign,
  Shield,
  Target,
  Zap,
  Compass,
  Coffee,
  Briefcase,
  GraduationCap,
  Music,
  Palette,
  Dumbbell,
  Code,
  TrendingUp as TrendingUpIcon
} from 'lucide-react-native';

// 🏗️ Enterprise Dependencies
import EnterpriseLogger from '../../utils/enterprise-logger';
import LocationService from '../../services/location-service';
import EventService from '../../services/event-service';
import NotificationService from '../../services/notification-service';
import AnalyticsService from '../../services/analytics-service';
import NetworkManager from '../../utils/network-manager';

// 🎨 Custom Components
import GradientBackground from '../../components/shared/gradient-background';
import Header from '../../components/shared/header';
import Card from '../../components/shared/card';
import Badge from '../../components/shared/badge';
import Button from '../../components/shared/button';
import Loader from '../../components/shared/loader';
import EmptyState from '../../components/shared/empty-state';
import RatingStars from '../../components/shared/rating-stars';
import ProgressBar from '../../components/shared/progress-bar';
import SegmentedControl from '../../components/shared/segmented-control';
import Chip from '../../components/shared/chip';
import BottomSheet from '../../components/shared/bottom-sheet';

// 🔧 Utilities
import { formatDate, formatTime, formatCurrency, getTimeAgo } from '../../utils/formatters';
import { colors, spacing, typography, shadows, gradients } from '../../constants/design-system';
import { useAuth } from '../../contexts/auth-context';
import { useEvents } from '../../contexts/events-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * 🎯 MAIN LOCAL EVENTS COMPONENT
 */
const LocalEvents = ({ navigation, route }) => {
  // 🎯 Context & Services
  const { user, isAuthenticated } = useAuth();
  const { 
    events, 
    loading, 
    error, 
    refreshEvents, 
    registerForEvent,
    cancelRegistration,
    saveEvent,
    removeSavedEvent 
  } = useEvents();

  // 🏗️ State Management
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [eventDetailsModal, setEventDetailsModal] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    distance: 50, // km
    priceRange: { min: 0, max: 10000 },
    dateRange: { start: new Date(), end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    eventTypes: ['workshop', 'networking', 'conference', 'social'],
    sortBy: 'distance'
  });

  // 📊 Animation Values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(screenHeight))[0];

  // 🏗️ Service Instances
  const logger = useMemo(() => new EnterpriseLogger({ service: 'local-events' }), []);
  const locationService = useMemo(() => new LocationService(), []);
  const analyticsService = useMemo(() => new AnalyticsService({ service: 'local-events' }), []);
  const networkManager = useMemo(() => new NetworkManager(), []);

  /**
   * 🚀 COMPONENT INITIALIZATION
   */
  useEffect(() => {
    initializeComponent();
    return cleanupComponent;
  }, []);

  /**
   * 🏗️ INITIALIZE COMPONENT
   */
  const initializeComponent = async () => {
    try {
      // 📍 Get User Location
      await getUserLocation();

      // 📊 Track Page View
      await analyticsService.trackPageView('local-events', {
        userId: user?.id,
        timestamp: new Date().toISOString()
      });

      // 🔄 Start Fade Animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

    } catch (error) {
      logger.error('Component initialization failed', { error: error.message });
      Alert.alert('Initialization Error', 'Failed to initialize events system. Please try again.');
    }
  };

  /**
   * 🧹 CLEANUP COMPONENT
   */
  const cleanupComponent = () => {
    // 🔄 Stop location tracking
    locationService.stopTracking();
  };

  /**
   * 📍 GET USER LOCATION
   */
  const getUserLocation = async () => {
    try {
      const hasPermission = await locationService.requestPermission();
      
      if (hasPermission) {
        const location = await locationService.getCurrentLocation();
        setUserLocation(location);
        
        logger.debug('User location obtained', {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        });
      } else {
        logger.warn('Location permission denied');
        Alert.alert(
          'Location Access Required',
          'Enable location access to discover nearby events and get personalized recommendations.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => locationService.openSettings() }
          ]
        );
      }
    } catch (error) {
      logger.error('Failed to get user location', { error: error.message });
    }
  };

  /**
   * 🔄 HANDLE PULL TO REFRESH
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshEvents();
      await getUserLocation();
      
      await analyticsService.trackEvent('events_refresh', {
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Refresh failed', { error: error.message });
      Alert.alert('Refresh Error', 'Failed to refresh events. Please check your connection.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshEvents, user?.id]);

  /**
   * 🔍 FILTER EVENTS
   */
  const filteredEvents = useMemo(() => {
    let filtered = events.filter(event => {
      // 🎯 Active Tab Filter
      if (activeTab === 'upcoming' && new Date(event.date) < new Date()) return false;
      if (activeTab === 'past' && new Date(event.date) >= new Date()) return false;
      if (activeTab === 'saved' && !event.isSaved) return false;

      // 🎯 Category Filter
      if (selectedCategory !== 'all' && event.category !== selectedCategory) return false;

      // 🔍 Search Filter
      if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !event.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !event.organizer.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // 📍 Distance Filter (if location available)
      if (userLocation && event.location.coordinates) {
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          event.location.coordinates.latitude,
          event.location.coordinates.longitude
        );
        if (distance > filterOptions.distance) return false;
      }

      // 💰 Price Filter
      if (event.price > filterOptions.priceRange.max || event.price < filterOptions.priceRange.min) {
        return false;
      }

      // 📅 Date Filter
      const eventDate = new Date(event.date);
      if (eventDate < filterOptions.dateRange.start || eventDate > filterOptions.dateRange.end) {
        return false;
      }

      // 🎯 Event Type Filter
      if (filterOptions.eventTypes.length > 0 && !filterOptions.eventTypes.includes(event.type)) {
        return false;
      }

      return true;
    });

    // 🔄 Sorting
    filtered.sort((a, b) => {
      switch (filterOptions.sortBy) {
        case 'distance':
          if (userLocation && a.location.coordinates && b.location.coordinates) {
            const distanceA = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              a.location.coordinates.latitude,
              a.location.coordinates.longitude
            );
            const distanceB = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              b.location.coordinates.latitude,
              b.location.coordinates.longitude
            );
            return distanceA - distanceB;
          }
          return 0;
        case 'date':
          return new Date(a.date) - new Date(b.date);
        case 'price':
          return a.price - b.price;
        case 'popularity':
          return b.attendeesCount - a.attendeesCount;
        case 'rating':
          return b.rating - a.rating;
        default:
          return 0;
      }
    });

    return filtered;
  }, [events, activeTab, selectedCategory, searchQuery, userLocation, filterOptions]);

  /**
   * 📍 CALCULATE DISTANCE
   */
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  /**
   * 🎯 HANDLE EVENT REGISTRATION
   */
  const handleRegisterForEvent = async (eventId) => {
    try {
      if (!isAuthenticated) {
        navigation.navigate('Auth', { screen: 'Login' });
        return;
      }

      const result = await registerForEvent(eventId);

      if (result.success) {
        await analyticsService.trackEvent('event_registration', {
          userId: user.id,
          eventId,
          timestamp: new Date().toISOString()
        });

        Alert.alert(
          'Registration Successful!',
          'You have successfully registered for this event.',
          [
            { text: 'View Details', onPress: () => navigation.navigate('MyEvents') },
            { text: 'Continue Browsing', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      logger.error('Event registration failed', { error: error.message });
      Alert.alert('Registration Error', error.message || 'Failed to register for event.');
    }
  };

  /**
   * ❌ HANDLE REGISTRATION CANCELLATION
   */
  const handleCancelRegistration = async (eventId) => {
    Alert.alert(
      'Cancel Registration',
      'Are you sure you want to cancel your registration?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await cancelRegistration(eventId);
              
              if (result.success) {
                await analyticsService.trackEvent('event_registration_cancelled', {
                  userId: user.id,
                  eventId,
                  timestamp: new Date().toISOString()
                });

                Alert.alert('Cancelled', 'Your registration has been cancelled.');
              }
            } catch (error) {
              logger.error('Registration cancellation failed', { error: error.message });
              Alert.alert('Cancellation Error', error.message || 'Failed to cancel registration.');
            }
          }
        }
      ]
    );
  };

  /**
   * 💾 HANDLE SAVE EVENT
   */
  const handleSaveEvent = async (eventId) => {
    try {
      const result = await saveEvent(eventId);
      
      if (result.success) {
        await analyticsService.trackEvent('event_saved', {
          userId: user.id,
          eventId,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Event save failed', { error: error.message });
    }
  };

  /**
   * 📤 HANDLE EVENT SHARE
   */
  const handleShareEvent = async (event) => {
    try {
      const shareUrl = `https://mosaforge.com/events/${event.id}`;
      const message = `Join me at ${event.title} on ${formatDate(event.date)}! ${shareUrl}`;
      
      // 📱 Native sharing implementation would go here
      Alert.alert('Share Event', 'Share link copied to clipboard!');
      
      await analyticsService.trackEvent('event_shared', {
        userId: user.id,
        eventId: event.id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Event share failed', { error: error.message });
    }
  };

  /**
   * 📍 HANDLE GET DIRECTIONS
   */
  const handleGetDirections = (event) => {
    if (!event.location.coordinates) {
      Alert.alert('Location Unavailable', 'Event location coordinates are not available.');
      return;
    }

    const { latitude, longitude } = event.location.coordinates;
    const url = Platform.select({
      ios: `maps://?q=${event.location.address}&ll=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${event.location.address}`
    });

    // 🔗 Open maps application
    Alert.alert(
      'Get Directions',
      `Open in ${Platform.OS === 'ios' ? 'Maps' : 'Google Maps'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open', onPress: () => Linking.openURL(url) }
      ]
    );
  };

  /**
   * 🎨 RENDER EVENT ITEM
   */
  const renderEventItem = ({ item, index }) => (
    <Animated.View
      style={[
        styles.eventItemContainer,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0]
            })
          }]
        }
      ]}
    >
      <Card
        style={styles.eventCard}
        onPress={() => setEventDetailsModal(item)}
      >
        {/* 🎯 Event Header */}
        <View style={styles.eventHeader}>
          <View style={styles.eventCategoryBadge}>
            <Badge
              label={item.category}
              color={getCategoryColor(item.category)}
              size="small"
            />
          </View>
          <View style={styles.eventHeaderActions}>
            <TouchableOpacity
              onPress={() => handleSaveEvent(item.id)}
              style={styles.iconButton}
            >
              <Bookmark
                size={20}
                color={item.isSaved ? colors.primary.main : colors.text.secondary}
                fill={item.isSaved ? colors.primary.main : 'transparent'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleShareEvent(item)}
              style={styles.iconButton}
            >
              <Share2 size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 📝 Event Title & Description */}
        <Text style={styles.eventTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.eventDescription} numberOfLines={3}>
          {item.description}
        </Text>

        {/* 📍 Location & Date Info */}
        <View style={styles.eventInfoRow}>
          <View style={styles.eventInfoItem}>
            <MapPin size={16} color={colors.text.secondary} />
            <Text style={styles.eventInfoText} numberOfLines={1}>
              {item.location.name}
            </Text>
          </View>
          <View style={styles.eventInfoItem}>
            <Calendar size={16} color={colors.text.secondary} />
            <Text style={styles.eventInfoText}>
              {formatDate(item.date)}
            </Text>
          </View>
        </View>

        {/* ⏰ Time & Duration */}
        <View style={styles.eventInfoRow}>
          <View style={styles.eventInfoItem}>
            <Clock size={16} color={colors.text.secondary} />
            <Text style={styles.eventInfoText}>
              {formatTime(item.startTime)} - {formatTime(item.endTime)}
            </Text>
          </View>
          <View style={styles.eventInfoItem}>
            <Users size={16} color={colors.text.secondary} />
            <Text style={styles.eventInfoText}>
              {item.attendeesCount} attending
            </Text>
          </View>
        </View>

        {/* ⭐ Rating & Price */}
        <View style={styles.eventFooter}>
          <View style={styles.ratingContainer}>
            <RatingStars rating={item.rating} size={16} />
            <Text style={styles.ratingText}>
              {item.rating.toFixed(1)} ({item.reviewCount})
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={[
              styles.priceText,
              item.price === 0 && styles.freeText
            ]}>
              {item.price === 0 ? 'FREE' : `${formatCurrency(item.price)}`}
            </Text>
          </View>
        </View>

        {/* 🎯 Registration Status */}
        {item.isRegistered && (
          <View style={styles.registeredBadge}>
            <Badge
              label="Registered"
              color={colors.success.main}
              icon={CheckCircle}
              size="small"
            />
          </View>
        )}

        {/* 📍 Distance (if location available) */}
        {userLocation && item.location.coordinates && (
          <View style={styles.distanceBadge}>
            <Badge
              label={`${calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                item.location.coordinates.latitude,
                item.location.coordinates.longitude
              ).toFixed(1)} km`}
              color={colors.info.main}
              icon={Compass}
              size="small"
            />
          </View>
        )}
      </Card>
    </Animated.View>
  );

  /**
   * 🎯 RENDER CATEGORY CHIP
   */
  const renderCategoryChip = ({ item }) => (
    <Chip
      label={item.label}
      icon={getCategoryIcon(item.value)}
      selected={selectedCategory === item.value}
      onPress={() => setSelectedCategory(item.value)}
      style={styles.categoryChip}
    />
  );

  /**
   * 🏆 GET CATEGORY ICON
   */
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'business':
        return Briefcase;
      case 'education':
        return GraduationCap;
      case 'networking':
        return UsersIcon;
      case 'technology':
        return Code;
      case 'arts':
        return Palette;
      case 'sports':
        return Dumbbell;
      case 'music':
        return Music;
      case 'food':
        return Coffee;
      default:
        return Calendar;
    }
  };

  /**
   * 🎨 GET CATEGORY COLOR
   */
  const getCategoryColor = (category) => {
    switch (category) {
      case 'business':
        return colors.primary.main;
      case 'education':
        return colors.success.main;
      case 'networking':
        return colors.warning.main;
      case 'technology':
        return colors.info.main;
      case 'arts':
        return colors.purple;
      case 'sports':
        return colors.orange;
      case 'music':
        return colors.pink;
      case 'food':
        return colors.brown;
      default:
        return colors.text.secondary;
    }
  };

  /**
   * 🏗️ RENDER FILTER MODAL
   */
  const renderFilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={filterModalVisible}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[
          styles.filterModal,
          {
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, screenHeight]
              })
            }]
          }
        ]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Events</Text>
            <TouchableOpacity
              onPress={() => setFilterModalVisible(false)}
              style={styles.closeButton}
            >
              <XCircle size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent}>
            {/* 📍 Distance Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                <Compass size={18} color={colors.primary.main} /> Maximum Distance
              </Text>
              <Text style={styles.filterValue}>
                {filterOptions.distance} km
              </Text>
              <View style={styles.sliderContainer}>
                {/* 🎚️ Slider implementation would go here */}
              </View>
            </View>

            {/* 💰 Price Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                <DollarSign size={18} color={colors.primary.main} /> Price Range
              </Text>
              <View style={styles.priceRangeContainer}>
                <TextInput
                  style={styles.priceInput}
                  value={filterOptions.priceRange.min.toString()}
                  keyboardType="numeric"
                  placeholder="Min"
                />
                <Text style={styles.priceRangeSeparator}>-</Text>
                <TextInput
                  style={styles.priceInput}
                  value={filterOptions.priceRange.max.toString()}
                  keyboardType="numeric"
                  placeholder="Max"
                />
              </View>
            </View>

            {/* 🎯 Event Types Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                <Target size={18} color={colors.primary.main} /> Event Types
              </Text>
              <View style={styles.eventTypesContainer}>
                {['workshop', 'networking', 'conference', 'social'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.eventTypeChip,
                      filterOptions.eventTypes.includes(type) && styles.eventTypeChipSelected
                    ]}
                    onPress={() => {
                      setFilterOptions(prev => ({
                        ...prev,
                        eventTypes: prev.eventTypes.includes(type)
                          ? prev.eventTypes.filter(t => t !== type)
                          : [...prev.eventTypes, type]
                      }));
                    }}
                  >
                    <Text style={[
                      styles.eventTypeText,
                      filterOptions.eventTypes.includes(type) && styles.eventTypeTextSelected
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 🔄 Sorting Options */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                <TrendingUpIcon size={18} color={colors.primary.main} /> Sort By
              </Text>
              <SegmentedControl
                segments={[
                  { label: 'Distance', value: 'distance' },
                  { label: 'Date', value: 'date' },
                  { label: 'Price', value: 'price' },
                  { label: 'Popular', value: 'popularity' }
                ]}
                selected={filterOptions.sortBy}
                onSelect={(value) => setFilterOptions(prev => ({ ...prev, sortBy: value }))}
                style={styles.sortControl}
              />
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <Button
              title="Reset Filters"
              type="outline"
              onPress={() => {
                setFilterOptions({
                  distance: 50,
                  priceRange: { min: 0, max: 10000 },
                  dateRange: { start: new Date(), end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
                  eventTypes: ['workshop', 'networking', 'conference', 'social'],
                  sortBy: 'distance'
                });
              }}
              style={styles.resetButton}
            />
            <Button
              title="Apply Filters"
              onPress={() => {
                setFilterModalVisible(false);
                analyticsService.trackEvent('filters_applied', {
                  userId: user?.id,
                  filters: filterOptions,
                  timestamp: new Date().toISOString()
                });
              }}
              style={styles.applyButton}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  /**
   * 🏆 RENDER EVENT DETAILS MODAL
   */
  const renderEventDetailsModal = () => (
    <BottomSheet
      visible={!!eventDetailsModal}
      onClose={() => setEventDetailsModal(null)}
      height={screenHeight * 0.85}
    >
      {eventDetailsModal && (
        <ScrollView style={styles.eventDetailsContainer}>
          {/* 🎯 Event Header */}
          <View style={styles.eventDetailsHeader}>
            <View style={styles.eventDetailsCategory}>
              <Badge
                label={eventDetailsModal.category}
                color={getCategoryColor(eventDetailsModal.category)}
                size="medium"
              />
            </View>
            <Text style={styles.eventDetailsTitle}>{eventDetailsModal.title}</Text>
            <Text style={styles.eventDetailsOrganizer}>
              by {eventDetailsModal.organizer.name}
            </Text>
          </View>

          {/* 📍 Location Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsSectionTitle}>
              <MapPin size={18} color={colors.primary.main} /> Location
            </Text>
            <Text style={styles.detailsSectionText}>
              {eventDetailsModal.location.name}
            </Text>
            <Text style={styles.detailsSectionSubtext}>
              {eventDetailsModal.location.address}
            </Text>
            <Button
              title="Get Directions"
              icon={Navigation}
              type="outline"
              onPress={() => handleGetDirections(eventDetailsModal)}
              style={styles.directionsButton}
            />
          </View>

          {/* 📅 Date & Time Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsSectionTitle}>
              <Calendar size={18} color={colors.primary.main} /> Date & Time
            </Text>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeItem}>
                <Text style={styles.dateTimeLabel}>Date</Text>
                <Text style={styles.dateTimeValue}>
                  {formatDate(eventDetailsModal.date)}
                </Text>
              </View>
              <View style={styles.dateTimeItem}>
                <Text style={styles.dateTimeLabel}>Time</Text>
                <Text style={styles.dateTimeValue}>
                  {formatTime(eventDetailsModal.startTime)} - {formatTime(eventDetailsModal.endTime)}
                </Text>
              </View>
            </View>
          </View>

          {/* 📝 Event Description */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsSectionTitle}>
              <MessageSquare size={18} color={colors.primary.main} /> Description
            </Text>
            <Text style={styles.detailsDescription}>
              {eventDetailsModal.fullDescription || eventDetailsModal.description}
            </Text>
          </View>

          {/* 👥 Attendees & Capacity */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsSectionTitle}>
              <UsersIcon size={18} color={colors.primary.main} /> Attendance
            </Text>
            <View style={styles.capacityRow}>
              <View style={styles.capacityItem}>
                <Text style={styles.capacityLabel}>Attending</Text>
                <Text style={styles.capacityValue}>
                  {eventDetailsModal.attendeesCount}
                </Text>
              </View>
              <View style={styles.capacityItem}>
                <Text style={styles.capacityLabel}>Capacity</Text>
                <Text style={styles.capacityValue}>
                  {eventDetailsModal.capacity || 'Unlimited'}
                </Text>
              </View>
              <ProgressBar
                progress={eventDetailsModal.capacity ? 
                  (eventDetailsModal.attendeesCount / eventDetailsModal.capacity) * 100 : 0}
                style={styles.capacityProgress}
              />
            </View>
          </View>

          {/* ⭐ Ratings & Reviews */}
          <View style={styles.detailsSection}>
            <Text style={styles.detailsSectionTitle}>
              <Star size={18} color={colors.warning.main} /> Ratings
            </Text>
            <View style={styles.ratingRow}>
              <View style={styles.ratingOverall}>
                <Text style={styles.ratingScore}>
                  {eventDetailsModal.rating.toFixed(1)}
                </Text>
                <RatingStars rating={eventDetailsModal.rating} size={24} />
                <Text style={styles.ratingCount}>
                  ({eventDetailsModal.reviewCount} reviews)
                </Text>
              </View>
            </View>
          </View>

          {/* 🎯 Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {eventDetailsModal.isRegistered ? (
              <Button
                title="Cancel Registration"
                type="danger"
                icon={XCircle}
                onPress={() => {
                  handleCancelRegistration(eventDetailsModal.id);
                  setEventDetailsModal(null);
                }}
              />
            ) : (
              <Button
                title="Register Now"
                icon={CheckCircle}
                onPress={() => {
                  handleRegisterForEvent(eventDetailsModal.id);
                  setEventDetailsModal(null);
                }}
                disabled={eventDetailsModal.capacity && 
                  eventDetailsModal.attendeesCount >= eventDetailsModal.capacity}
              />
            )}
            
            <Button
              title="Save Event"
              type="outline"
              icon={Bookmark}
              onPress={() => {
                handleSaveEvent(eventDetailsModal.id);
                setEventDetailsModal(null);
              }}
            />
          </View>
        </ScrollView>
      )}
    </BottomSheet>
  );

  /**
   * 🏗️ RENDER MAIN CONTENT
   */
  return (
    <GradientBackground style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      <SafeAreaView style={styles.safeArea}>
        {/* 🎯 Header */}
        <Header
          title="Local Events"
          subtitle="Discover and join nearby events"
          leftIcon={Compass}
          rightIcons={[
            {
              icon: Bell,
              onPress: () => navigation.navigate('Notifications'),
              badge: 3
            },
            {
              icon: Filter,
              onPress: () => setFilterModalVisible(true)
            }
          ]}
        />

        {/* 🔍 Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color={colors.text.secondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events, topics, or organizers..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.text.secondary}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
              >
                <XCircle size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 🎯 Tabs Navigation */}
        <SegmentedControl
          segments={[
            { label: 'Upcoming', value: 'upcoming' },
            { label: 'Past', value: 'past' },
            { label: 'Saved', value: 'saved' }
          ]}
          selected={activeTab}
          onSelect={setActiveTab}
          style={styles.tabControl}
        />

        {/* 🏆 Categories */}
        <View style={styles.categoriesContainer}>
          <FlatList
            data={[
              { label: 'All', value: 'all' },
              { label: 'Business', value: 'business' },
              { label: 'Education', value: 'education' },
              { label: 'Networking', value: 'networking' },
              { label: 'Technology', value: 'technology' },
              { label: 'Arts', value: 'arts' },
              { label: 'Sports', value: 'sports' },
              { label: 'Music', value: 'music' },
              { label: 'Food', value: 'food' }
            ]}
            renderItem={renderCategoryChip}
            keyExtractor={item => item.value}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* 📍 Location Status */}
        {userLocation && (
          <View style={styles.locationStatus}>
            <Compass size={16} color={colors.success.main} />
            <Text style={styles.locationStatusText}>
              Showing events within {filterOptions.distance}km of your location
            </Text>
          </View>
        )}

        {/* 📊 Events List */}
        {loading ? (
          <Loader message="Loading events..." />
        ) : error ? (
          <EmptyState
            icon={XCircle}
            title="Unable to load events"
            message={error}
            action={{
              label: 'Try Again',
              onPress: refreshEvents
            }}
          />
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No events found"
            message="Try adjusting your filters or check back later for new events."
            action={{
              label: 'Clear Filters',
              onPress: () => {
                setSearchQuery('');
                setSelectedCategory('all');
                setFilterModalVisible(true);
              }
            }}
          />
        ) : (
          <FlatList
            data={filteredEvents}
            renderItem={renderEventItem}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.eventsList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary.main]}
                tintColor={colors.primary.main}
              />
            }
            ListHeaderComponent={
              <Text style={styles.eventsCount}>
                {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
              </Text>
            }
          />
        )}

        {/* ➕ Create Event Button */}
        <TouchableOpacity
          style={styles.createEventButton}
          onPress={() => navigation.navigate('CreateEvent')}
        >
          <View style={styles.createEventButtonInner}>
            <Calendar size={24} color={colors.white} />
            <Text style={styles.createEventButtonText}>Create Event</Text>
          </View>
        </TouchableOpacity>

        {/* 🎨 Modals */}
        {renderFilterModal()}
        {renderEventDetailsModal()}
      </SafeAreaView>
    </GradientBackground>
  );
};

/**
 * 🎨 STYLES
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.small,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  clearSearchButton: {
    padding: spacing.xs,
  },
  tabControl: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },
  categoriesContainer: {
    marginBottom: spacing.md,
  },
  categoriesList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  categoryChip: {
    marginRight: spacing.sm,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success.light,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: 8,
  },
  locationStatusText: {
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.success.dark,
    fontFamily: typography.family.medium,
  },
  eventsList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  eventsCount: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    fontFamily: typography.family.medium,
  },
  eventItemContainer: {
    marginBottom: spacing.md,
  },
  eventCard: {
    padding: spacing.md,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  eventCategoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  eventTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  eventDescription: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  eventInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  eventInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventInfoText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.family.bold,
    color: colors.text.primary,
  },
  freeText: {
    color: colors.success.main,
  },
  registeredBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  distanceBadge: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: screenHeight * 0.8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.family.bold,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  filterContent: {
    padding: spacing.lg,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterSectionTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.family.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterValue: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  sliderContainer: {
    height: 40,
    justifyContent: 'center',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: typography.sizes.md,
    color: colors.text.primary,
  },
  priceRangeSeparator: {
    marginHorizontal: spacing.md,
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
  },
  eventTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  eventTypeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.background.light,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  eventTypeChipSelected: {
    backgroundColor: colors.primary.light,
    borderColor: colors.primary.main,
    borderWidth: 1,
  },
  eventTypeText: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  eventTypeTextSelected: {
    color: colors.primary.main,
    fontFamily: typography.family.medium,
  },
  sortControl: {
    marginTop: spacing.sm,
  },
  filterActions: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  resetButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  applyButton: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  eventDetailsContainer: {
    padding: spacing.lg,
  },
  eventDetailsHeader: {
    marginBottom: spacing.lg,
  },
  eventDetailsCategory: {
    marginBottom: spacing.sm,
  },
  eventDetailsTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  eventDetailsOrganizer: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
  },
  detailsSection: {
    marginBottom: spacing.lg,
  },
  detailsSectionTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.family.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsSectionText: {
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  detailsSectionSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  directionsButton: {
    marginTop: spacing.sm,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateTimeItem: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  dateTimeValue: {
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    fontFamily: typography.family.medium,
  },
  detailsDescription: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capacityItem: {
    flex: 1,
  },
  capacityLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  capacityValue: {
    fontSize: typography.sizes.md,
    color: colors.text.primary,
    fontFamily: typography.family.medium,
  },
  capacityProgress: {
    marginTop: spacing.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingOverall: {
    alignItems: 'center',
    flex: 1,
  },
  ratingScore: {
    fontSize: typography.sizes.xxl,
    fontFamily: typography.family.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  ratingCount: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  actionButtonsContainer: {
    marginTop: spacing.lg,
  },
  createEventButton: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    backgroundColor: colors.primary.main,
    borderRadius: 30,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.medium,
  },
  createEventButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createEventButtonText: {
    color: colors.white,
    fontSize: typography.sizes.md,
    fontFamily: typography.family.semiBold,
    marginLeft: spacing.sm,
  },
});

export default LocalEvents;