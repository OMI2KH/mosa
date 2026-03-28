/**
 * 🏢 MOSA FORGE - Enterprise Payment History & Analytics
 * 💰 Comprehensive Payment Tracking & Financial Insights
 * 📊 Real-time Revenue Analytics & Transaction Management
 * 🎯 Subscription Management & Payment History
 * 🚀 Enterprise-Grade React Native Component
 * 
 * @module PaymentHistory
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { 
  LineChart, 
  BarChart, 
  PieChart 
} from 'react-native-chart-kit';
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  Download, 
  Filter, 
  Calendar, 
  CheckCircle, 
  Clock, 
  XCircle,
  AlertCircle,
  BarChart2,
  PieChart as PieChartIcon,
  List,
  ChevronRight,
  Eye,
  Receipt,
  Shield,
  TrendingDown,
  TrendingUp as TrendingUpIcon,
  Percent,
  Users,
  Award,
  Target,
  Repeat,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react-native';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  FadeInUp,
  SlideInLeft,
  SlideInRight,
} from 'react-native-reanimated';

// 🏗️ Enterprise Dependencies
import { useAuth } from '../../contexts/AuthContext';
import { usePayment } from '../../contexts/PaymentContext';
import { useNotification } from '../../hooks/useNotification';
import EnterpriseButton from '../../components/shared/EnterpriseButton';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import ErrorBoundary from '../../components/shared/ErrorBoundary';
import AnalyticsCard from '../../components/analytics/AnalyticsCard';
import PaymentCard from '../../components/payment/PaymentCard';
import FilterModal from '../../components/shared/FilterModal';
import DateRangePicker from '../../components/shared/DateRangePicker';
import ExportModal from '../../components/shared/ExportModal';

// 🎨 Design System
import Colors from '../../constants/Colors';
import Typography from '../../constants/Typography';
import Spacing from '../../constants/Spacing';
import Layout from '../../constants/Layout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * 🏢 ENTERPRISE PAYMENT HISTORY COMPONENT
 */
const PaymentHistory = () => {
  const navigation = useNavigation();
  const { user, isAuthenticated } = useAuth();
  const { 
    paymentHistory, 
    loading, 
    error, 
    refreshPaymentHistory,
    getPaymentAnalytics,
    generateReceipt,
    exportPaymentHistory,
    totalRevenue,
    activeSubscriptions,
    pendingPayments,
  } = usePayment();
  
  const { showNotification, showError } = useNotification();

  // 🏗️ State Management
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date(),
  });
  const [viewMode, setViewMode] = useState('list'); // 'list', 'chart', 'analytics'
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc', 'date_asc', 'amount_desc', 'amount_asc'

  // 🎯 Filter Options
  const filterOptions = [
    { id: 'all', label: 'All Payments', icon: 'List' },
    { id: 'completed', label: 'Completed', icon: 'CheckCircle', color: Colors.success },
    { id: 'pending', label: 'Pending', icon: 'Clock', color: Colors.warning },
    { id: 'failed', label: 'Failed', icon: 'XCircle', color: Colors.danger },
    { id: 'refunded', label: 'Refunded', icon: 'Repeat', color: Colors.info },
    { id: 'subscription', label: 'Subscriptions', icon: 'CreditCard', color: Colors.primary },
    { id: 'course', label: 'Course Payments', icon: 'Award', color: Colors.secondary },
  ];

  // 🎯 Sort Options
  const sortOptions = [
    { id: 'date_desc', label: 'Newest First' },
    { id: 'date_asc', label: 'Oldest First' },
    { id: 'amount_desc', label: 'Highest Amount' },
    { id: 'amount_asc', label: 'Lowest Amount' },
  ];

  /**
   * 📊 LOAD PAYMENT DATA
   */
  const loadPaymentData = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // 📈 Load Payment History
      await refreshPaymentHistory();
      
      // 📊 Load Analytics Data
      const analytics = await getPaymentAnalytics({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        filter: selectedFilter,
      });
      setAnalyticsData(analytics);
      
      showNotification({
        title: 'Payment Data Updated',
        message: 'Your payment history has been refreshed',
        type: 'success',
      });
      
    } catch (error) {
      showError({
        title: 'Data Load Error',
        message: 'Failed to load payment data. Please try again.',
        error,
      });
    } finally {
      setRefreshing(false);
    }
  }, [dateRange, selectedFilter]);

  /**
   * 🔄 REFRESH HANDLER
   */
  const handleRefresh = useCallback(() => {
    loadPaymentData();
  }, [loadPaymentData]);

  /**
   * 📅 DATE RANGE CHANGE HANDLER
   */
  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
    loadPaymentData();
  };

  /**
   * 🎯 FILTER CHANGE HANDLER
   */
  const handleFilterChange = (filterId) => {
    setSelectedFilter(filterId);
    setShowFilterModal(false);
    loadPaymentData();
  };

  /**
   * 🔍 SEARCH HANDLER
   */
  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  /**
   * 📊 SORT HANDLER
   */
  const handleSortChange = (sortId) => {
    setSortBy(sortId);
  };

  /**
   * 📄 PAYMENT DETAILS HANDLER
   */
  const handlePaymentDetails = async (payment) => {
    setSelectedPayment(payment);
    setShowPaymentDetails(true);
  };

  /**
   * 🧾 GENERATE RECEIPT HANDLER
   */
  const handleGenerateReceipt = async (paymentId) => {
    try {
      const receipt = await generateReceipt(paymentId);
      
      Alert.alert(
        'Receipt Generated',
        'Your payment receipt has been generated successfully.',
        [
          { text: 'View', onPress: () => navigation.navigate('ReceiptViewer', { receipt }) },
          { text: 'Download', onPress: () => downloadReceipt(receipt) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      
    } catch (error) {
      showError({
        title: 'Receipt Generation Failed',
        message: 'Failed to generate receipt. Please try again.',
        error,
      });
    }
  };

  /**
   * 📤 EXPORT DATA HANDLER
   */
  const handleExportData = async (format) => {
    try {
      const exportedData = await exportPaymentHistory({
        format,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        filter: selectedFilter,
      });
      
      showNotification({
        title: 'Export Successful',
        message: `Payment history exported as ${format.toUpperCase()}`,
        type: 'success',
      });
      
    } catch (error) {
      showError({
        title: 'Export Failed',
        message: 'Failed to export payment history. Please try again.',
        error,
      });
    }
  };

  /**
   * 📊 FILTERED PAYMENTS
   */
  const filteredPayments = React.useMemo(() => {
    if (!paymentHistory) return [];
    
    let filtered = [...paymentHistory];
    
    // 🎯 Apply Status Filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(payment => {
        if (selectedFilter === 'subscription') return payment.type === 'subscription';
        if (selectedFilter === 'course') return payment.type === 'course_payment';
        return payment.status === selectedFilter;
      });
    }
    
    // 🔍 Apply Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.transactionId?.toLowerCase().includes(query) ||
        payment.description?.toLowerCase().includes(query) ||
        payment.amount?.toString().includes(query)
      );
    }
    
    // 📊 Apply Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'date_asc':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'amount_desc':
          return b.amount - a.amount;
        case 'amount_asc':
          return a.amount - b.amount;
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [paymentHistory, selectedFilter, searchQuery, sortBy]);

  /**
   * 📈 REVENUE CHART DATA
   */
  const revenueChartData = React.useMemo(() => {
    if (!analyticsData?.revenueTrend) {
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          data: [0, 0, 0, 0, 0, 0],
        }],
      };
    }
    
    return {
      labels: analyticsData.revenueTrend.map(item => item.month),
      datasets: [{
        data: analyticsData.revenueTrend.map(item => item.amount),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Green
        strokeWidth: 2,
      }],
    };
  }, [analyticsData]);

  /**
   * 🎯 PAYMENT DISTRIBUTION DATA
   */
  const paymentDistributionData = React.useMemo(() => {
    if (!analyticsData?.paymentDistribution) {
      return [
        { name: 'Subscriptions', amount: 0, color: Colors.primary, legendFontColor: Colors.text, legendFontSize: 12 },
        { name: 'Courses', amount: 0, color: Colors.secondary, legendFontColor: Colors.text, legendFontSize: 12 },
        { name: 'Refunds', amount: 0, color: Colors.info, legendFontColor: Colors.text, legendFontSize: 12 },
      ];
    }
    
    return [
      {
        name: 'Subscriptions',
        amount: analyticsData.paymentDistribution.subscription || 0,
        color: Colors.primary,
        legendFontColor: Colors.text,
        legendFontSize: 12,
      },
      {
        name: 'Courses',
        amount: analyticsData.paymentDistribution.course || 0,
        color: Colors.secondary,
        legendFontColor: Colors.text,
        legendFontSize: 12,
      },
      {
        name: 'Other',
        amount: analyticsData.paymentDistribution.other || 0,
        color: Colors.warning,
        legendFontColor: Colors.text,
        legendFontSize: 12,
      },
    ];
  }, [analyticsData]);

  /**
   * 🏆 KEY METRICS
   */
  const keyMetrics = React.useMemo(() => {
    if (!analyticsData) return [];
    
    return [
      {
        id: 'total_revenue',
        title: 'Total Revenue',
        value: `ETB ${analyticsData.totalRevenue?.toLocaleString() || '0'}`,
        change: analyticsData.revenueGrowth || 0,
        icon: 'DollarSign',
        color: Colors.success,
      },
      {
        id: 'active_subscriptions',
        title: 'Active Subscriptions',
        value: analyticsData.activeSubscriptions?.toString() || '0',
        change: analyticsData.subscriptionGrowth || 0,
        icon: 'CreditCard',
        color: Colors.primary,
      },
      {
        id: 'success_rate',
        title: 'Success Rate',
        value: `${analyticsData.successRate || 0}%`,
        change: analyticsData.successRateChange || 0,
        icon: 'Percent',
        color: Colors.info,
      },
      {
        id: 'avg_transaction',
        title: 'Avg Transaction',
        value: `ETB ${analyticsData.averageTransaction?.toLocaleString() || '0'}`,
        change: analyticsData.averageTransactionChange || 0,
        icon: 'TrendingUp',
        color: Colors.secondary,
      },
    ];
  }, [analyticsData]);

  /**
   * 🎯 FOCUS EFFECT
   */
  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        loadPaymentData();
      }
      
      return () => {
        // Cleanup if needed
      };
    }, [isAuthenticated, loadPaymentData])
  );

  /**
   * 📊 RENDER LOADING STATE
   */
  const renderLoadingState = () => (
    <View style={styles.centerContainer}>
      <LoadingSpinner size="large" />
      <Text style={styles.loadingText}>Loading Payment History...</Text>
    </View>
  );

  /**
   * 📊 RENDER ERROR STATE
   */
  const renderErrorState = () => (
    <View style={styles.centerContainer}>
      <AlertCircle size={48} color={Colors.danger} />
      <Text style={styles.errorTitle}>Payment Data Unavailable</Text>
      <Text style={styles.errorMessage}>
        We couldn't load your payment history. Please check your connection and try again.
      </Text>
      <EnterpriseButton
        title="Retry"
        onPress={loadPaymentData}
        icon="RefreshCw"
        style={{ marginTop: Spacing.lg }}
      />
    </View>
  );

  /**
   * 📊 RENDER EMPTY STATE
   */
  const renderEmptyState = () => (
    <Animated.View 
      entering={FadeIn.duration(500)}
      style={styles.centerContainer}
    >
      <CreditCard size={64} color={Colors.muted} />
      <Text style={styles.emptyTitle}>No Payment History</Text>
      <Text style={styles.emptyMessage}>
        You haven't made any payments yet. Start your learning journey today!
      </Text>
      <EnterpriseButton
        title="Explore Courses"
        onPress={() => navigation.navigate('Courses')}
        icon="ArrowRight"
        style={{ marginTop: Spacing.lg }}
      />
    </Animated.View>
  );

  /**
   * 🎯 RENDER HEADER
   */
  const renderHeader = () => (
    <Animated.View 
      entering={FadeInDown.duration(500)}
      style={styles.header}
    >
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.headerTitle}>Payment History</Text>
          <Text style={styles.headerSubtitle}>
            Track and manage all your transactions
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowExportModal(true)}
          >
            <Download size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 🔍 Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search payments..."
          placeholderTextColor={Colors.muted}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery ? (
          <TouchableOpacity
            style={styles.searchClear}
            onPress={() => setSearchQuery('')}
          >
            <XCircle size={20} color={Colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 🎯 View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        {['list', 'chart', 'analytics'].map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.viewModeButton,
              viewMode === mode && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode(mode)}
          >
            {mode === 'list' && <List size={16} color={viewMode === mode ? Colors.white : Colors.text} />}
            {mode === 'chart' && <BarChart2 size={16} color={viewMode === mode ? Colors.white : Colors.text} />}
            {mode === 'analytics' && <PieChartIcon size={16} color={viewMode === mode ? Colors.white : Colors.text} />}
            <Text style={[
              styles.viewModeText,
              viewMode === mode && styles.viewModeTextActive,
            ]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  /**
   * 📊 RENDER KEY METRICS
   */
  const renderKeyMetrics = () => (
    <Animated.View 
      entering={SlideInLeft.duration(500)}
      style={styles.metricsContainer}
    >
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.metricsScrollContent}
      >
        {keyMetrics.map((metric, index) => (
          <AnalyticsCard
            key={metric.id}
            metric={metric}
            delay={index * 100}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );

  /**
   * 📈 RENDER REVENUE CHART
   */
  const renderRevenueChart = () => (
    <Animated.View 
      entering={FadeInUp.duration(500)}
      style={styles.chartContainer}
    >
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Revenue Trend</Text>
        <View style={styles.chartPeriod}>
          <Text style={styles.chartPeriodText}>
            {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
          </Text>
        </View>
      </View>
      <LineChart
        data={revenueChartData}
        width={SCREEN_WIDTH - Spacing.xl * 2}
        height={220}
        chartConfig={{
          backgroundColor: Colors.background,
          backgroundGradientFrom: Colors.card,
          backgroundGradientTo: Colors.card,
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '6',
            strokeWidth: '2',
            stroke: Colors.success,
          },
        }}
        bezier
        style={styles.chart}
        withVerticalLines={false}
        withHorizontalLines={true}
        withInnerLines={false}
        withOuterLines={false}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        withShadow={true}
        fromZero={true}
      />
    </Animated.View>
  );

  /**
   * 🎯 RENDER PAYMENT DISTRIBUTION
   */
  const renderPaymentDistribution = () => (
    <Animated.View 
      entering={SlideInRight.duration(500)}
      style={styles.distributionContainer}
    >
      <View style={styles.distributionHeader}>
        <Text style={styles.distributionTitle}>Payment Distribution</Text>
        <TouchableOpacity>
          <Text style={styles.distributionAction}>View Details</Text>
        </TouchableOpacity>
      </View>
      <PieChart
        data={paymentDistributionData}
        width={SCREEN_WIDTH - Spacing.xl * 2}
        height={200}
        chartConfig={{
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        }}
        accessor="amount"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
      />
      <View style={styles.distributionLegend}>
        {paymentDistributionData.map((item, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: item.color }]} />
            <Text style={styles.legendText}>{item.name}</Text>
            <Text style={styles.legendAmount}>ETB {item.amount.toLocaleString()}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );

  /**
   * 📄 RENDER PAYMENT LIST
   */
  const renderPaymentList = () => (
    <Animated.View 
      entering={FadeInUp.duration(500)}
      style={styles.paymentListContainer}
    >
      <View style={styles.paymentListHeader}>
        <Text style={styles.paymentListTitle}>
          Transactions ({filteredPayments.length})
        </Text>
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort by:</Text>
          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => {
              // Show sort options modal
              Alert.alert(
                'Sort Transactions',
                'Choose sorting option',
                sortOptions.map(option => ({
                  text: option.label,
                  onPress: () => handleSortChange(option.id),
                }))
              );
            }}
          >
            <Text style={styles.sortButtonText}>
              {sortOptions.find(opt => opt.id === sortBy)?.label}
            </Text>
            <ChevronRight size={16} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.paymentScrollView}
        showsVerticalScrollIndicator={false}
      >
        {filteredPayments.map((payment, index) => (
          <PaymentCard
            key={payment.id}
            payment={payment}
            index={index}
            onPress={() => handlePaymentDetails(payment)}
            onGenerateReceipt={() => handleGenerateReceipt(payment.id)}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );

  /**
   * 🧾 RENDER PAYMENT DETAILS MODAL
   */
  const renderPaymentDetailsModal = () => (
    <Modal
      visible={showPaymentDetails}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowPaymentDetails(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Payment Details</Text>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setShowPaymentDetails(false)}
          >
            <XCircle size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {selectedPayment && (
          <ScrollView style={styles.modalContent}>
            {/* 🎯 Payment Status */}
            <View style={styles.detailSection}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(selectedPayment.status).background }
              ]}>
                {getStatusIcon(selectedPayment.status)}
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(selectedPayment.status).text }
                ]}>
                  {selectedPayment.status.charAt(0).toUpperCase() + selectedPayment.status.slice(1)}
                </Text>
              </View>
            </View>

            {/* 💰 Payment Information */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Payment Information</Text>
              <DetailRow label="Transaction ID" value={selectedPayment.transactionId} />
              <DetailRow label="Date & Time" value={
                new Date(selectedPayment.createdAt).toLocaleString()
              } />
              <DetailRow label="Amount" value={
                `ETB ${selectedPayment.amount.toLocaleString()}`
              } />
              <DetailRow label="Payment Method" value={
                selectedPayment.paymentMethod?.charAt(0).toUpperCase() + 
                selectedPayment.paymentMethod?.slice(1)
              } />
            </View>

            {/* 🎯 Course/Subscription Details */}
            {selectedPayment.course && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Course Details</Text>
                <DetailRow label="Course" value={selectedPayment.course.name} />
                <DetailRow label="Skill" value={selectedPayment.course.skill} />
                <DetailRow label="Expert" value={selectedPayment.course.expert} />
              </View>
            )}

            {/* 🛡️ Security Information */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Security Information</Text>
              <View style={styles.securityInfo}>
                <Shield size={20} color={Colors.success} />
                <Text style={styles.securityText}>
                  This transaction is secured with bank-level encryption
                </Text>
              </View>
            </View>

            {/* 📤 Actions */}
            <View style={styles.actionButtons}>
              <EnterpriseButton
                title="Generate Receipt"
                onPress={() => handleGenerateReceipt(selectedPayment.id)}
                icon="Receipt"
                style={styles.actionButton}
              />
              <EnterpriseButton
                title="Report Issue"
                onPress={() => navigation.navigate('Support', { 
                  transactionId: selectedPayment.transactionId 
                })}
                icon="AlertCircle"
                variant="outline"
                style={styles.actionButton}
              />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  /**
   * 🎯 MAIN RENDER
   */
  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        
        {renderHeader()}

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading && !refreshing ? (
            renderLoadingState()
          ) : error ? (
            renderErrorState()
          ) : filteredPayments.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {viewMode === 'analytics' && (
                <>
                  {renderKeyMetrics()}
                  {renderRevenueChart()}
                  {renderPaymentDistribution()}
                </>
              )}
              
              {viewMode === 'chart' && (
                <>
                  {renderRevenueChart()}
                  {renderPaymentDistribution()}
                  {renderKeyMetrics()}
                </>
              )}
              
              {viewMode === 'list' && (
                <>
                  {renderKeyMetrics()}
                  {renderPaymentList()}
                </>
              )}
            </>
          )}
        </ScrollView>

        {/* 🎯 Modals */}
        {renderPaymentDetailsModal()}
        
        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          options={filterOptions}
          selected={selectedFilter}
          onSelect={handleFilterChange}
          title="Filter Payments"
        />
        
        <DateRangePicker
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          value={dateRange}
          onChange={handleDateRangeChange}
        />
        
        <ExportModal
          visible={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExportData}
          formats={['pdf', 'csv', 'excel']}
        />
      </SafeAreaView>
    </ErrorBoundary>
  );
};

/**
 * 📝 DETAIL ROW COMPONENT
 */
const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

/**
 * 🎨 STATUS UTILITIES
 */
const getStatusColor = (status) => {
  switch (status) {
    case 'completed':
      return { background: Colors.successLight, text: Colors.success };
    case 'pending':
      return { background: Colors.warningLight, text: Colors.warning };
    case 'failed':
      return { background: Colors.dangerLight, text: Colors.danger };
    case 'refunded':
      return { background: Colors.infoLight, text: Colors.info };
    default:
      return { background: Colors.mutedLight, text: Colors.muted };
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case 'completed':
      return <CheckCircle size={16} color={Colors.success} />;
    case 'pending':
      return <Clock size={16} color={Colors.warning} />;
    case 'failed':
      return <XCircle size={16} color={Colors.danger} />;
    case 'refunded':
      return <Repeat size={16} color={Colors.info} />;
    default:
      return <AlertCircle size={16} color={Colors.muted} />;
  }
};

/**
 * 🎨 STYLES
 */
const styles = StyleSheet.create({
  // 🏗️ Container Styles
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },

  // 🎯 Header Styles
  header: {
    padding: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? Spacing.xl : Spacing.lg,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.h1,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.muted,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // 🔍 Search Styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchClear: {
    position: 'absolute',
    right: Spacing.md,
  },

  // 🎯 View Mode Styles
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius,
    padding: 2,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.borderRadius - 2,
    gap: Spacing.xs,
  },
  viewModeButtonActive: {
    backgroundColor: Colors.primary,
  },
  viewModeText: {
    ...Typography.caption,
    color: Colors.text,
  },
  viewModeTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },

  // 📊 Metrics Styles
  metricsContainer: {
    marginTop: Spacing.md,
  },
  metricsScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },

  // 📈 Chart Styles
  chartContainer: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  chartTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  chartPeriod: {
    backgroundColor: Colors.mutedLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius,
  },
  chartPeriodText: {
    ...Typography.caption,
    color: Colors.muted,
  },
  chart: {
    marginVertical: Spacing.md,
    borderRadius: Layout.borderRadius,
  },

  // 🎯 Distribution Styles
  distributionContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.card,
    borderRadius: Layout.borderRadius,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  distributionTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  distributionAction: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  distributionLegend: {
    marginTop: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  legendText: {
    ...Typography.body,
    flex: 1,
    color: Colors.text,
  },
  legendAmount: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text,
  },

  // 📄 Payment List Styles
  paymentListContainer: {
    margin: Spacing.lg,
    flex: 1,
  },
  paymentListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  paymentListTitle: {
    ...Typography.h3,
    color: Colors.text,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sortLabel: {
    ...Typography.caption,
    color: Colors.muted,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sortButtonText: {
    ...Typography.caption,
    color: Colors.text,
    fontWeight: '600',
  },
  paymentScrollView: {
    flex: 1,
  },

  // 🧾 Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    ...Typography.h1,
    color: Colors.text,
  },
  modalClose: {
    padding: Spacing.xs,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },

  // 📝 Detail Styles
  detailSection: {
    marginBottom: Spacing.xl,
  },
  detailSectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailLabel: {
    ...Typography.body,
    color: Colors.muted,
  },
  detailValue: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius,
    gap: Spacing.xs,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    padding: Spacing.md,
    borderRadius: Layout.borderRadius,
    gap: Spacing.sm,
  },
  securityText: {
    ...Typography.caption,
    flex: 1,
    color: Colors.success,
  },
  actionButtons: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  actionButton: {
    width: '100%',
  },

  // 📊 Loading & Error Styles
  loadingText: {
    ...Typography.body,
    color: Colors.muted,
    marginTop: Spacing.md,
  },
  errorTitle: {
    ...Typography.h3,
    color: Colors.danger,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyMessage: {
    ...Typography.body,
    color: Colors.muted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
});

export default PaymentHistory;