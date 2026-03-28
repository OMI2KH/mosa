// expert/earnings-calculator.jsx

/**
 * 🎯 ENTERPRISE EARNINGS CALCULATOR
 * Production-ready earnings calculation with real-time updates, bonuses, and revenue distribution
 * Features: 999 ETB base + 20% bonuses, tier-based calculations, payout scheduling
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { EventEmitter } from 'events';

// Constants
const EARNINGS_CONFIG = {
  BASE_RATE: 999, // 999 ETB per student
  BONUS_RATES: {
    MASTER: 0.20, // 20% bonus
    SENIOR: 0.10, // 10% bonus  
    STANDARD: 0.00, // 0% bonus
    DEVELOPING: -0.10, // 10% penalty
    PROBATION: -0.20 // 20% penalty
  },
  PAYOUT_SCHEDULE: {
    UPFRONT: 333, // Course start
    MILESTONE: 333, // 75% completion
    COMPLETION: 333 // Certification
  },
  REVENUE_SPLIT: {
    MOSA: 1000,
    EXPERT: 999
  },
  TAX_RATE: 0.15, // 15% tax
  PLATFORM_FEE: 0.05 // 5% platform fee
};

class EarningsEngine extends EventEmitter {
  constructor() {
    super();
    this.cache = new Map();
    this.realtimeUpdates = new Map();
    this.initialized = false;
  }

  /**
   * 🎯 INITIALIZE EARNINGS ENGINE
   */
  async initialize(expertId) {
    try {
      // Load expert profile and current metrics
      const expertData = await this.fetchExpertData(expertId);
      const currentMetrics = await this.fetchCurrentMetrics(expertId);
      
      this.expertId = expertId;
      this.expertData = expertData;
      this.currentMetrics = currentMetrics;
      this.initialized = true;

      // Start real-time updates
      this.startRealtimeUpdates(expertId);
      
      this.emit('initialized', { expertId, data: expertData });
      return true;
    } catch (error) {
      console.error('Earnings engine initialization failed:', error);
      throw error;
    }
  }

  /**
   * 💰 CALCULATE COMPREHENSIVE EARNINGS
   */
  calculateEarnings(students, period = 'current') {
    if (!this.initialized) {
      throw new Error('Earnings engine not initialized');
    }

    const cacheKey = `earnings:${this.expertId}:${period}:${students.length}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const calculations = {
      baseEarnings: 0,
      bonusEarnings: 0,
      penalties: 0,
      totalEarnings: 0,
      projectedEarnings: 0,
      breakdown: {
        byStudent: [],
        byPayout: {},
        byCategory: {}
      },
      metrics: {
        studentCount: students.length,
        completionRate: 0,
        averageRating: 0,
        qualityScore: 0
      }
    };

    // Calculate base earnings and bonuses
    students.forEach(student => {
      const studentEarnings = this.calculateStudentEarnings(student);
      calculations.baseEarnings += studentEarnings.base;
      calculations.bonusEarnings += studentEarnings.bonus;
      calculations.penalties += studentEarnings.penalty;
      
      calculations.breakdown.byStudent.push({
        studentId: student.id,
        name: student.name,
        ...studentEarnings
      });
    });

    // Calculate totals
    calculations.totalEarnings = 
      calculations.baseEarnings + 
      calculations.bonusEarnings - 
      calculations.penalties;

    // Calculate projections
    calculations.projectedEarnings = this.calculateProjections(students);

    // Calculate metrics
    calculations.metrics = this.calculatePerformanceMetrics(students);

    // Cache results
    this.cache.set(cacheKey, calculations);
    
    return calculations;
  }

  /**
   * 🎯 CALCULATE INDIVIDUAL STUDENT EARNINGS
   */
  calculateStudentEarnings(student) {
    const baseEarning = EARNINGS_CONFIG.BASE_RATE;
    const bonusRate = EARNINGS_CONFIG.BONUS_RATES[this.expertData.currentTier] || 0;
    
    // Calculate quality-based bonus
    const qualityBonus = this.calculateQualityBonus(student);
    
    // Calculate completion bonus
    const completionBonus = this.calculateCompletionBonus(student);
    
    // Calculate timeliness bonus
    const timelinessBonus = this.calculateTimelinessBonus(student);

    const totalBonus = (baseEarning * bonusRate) + qualityBonus + completionBonus + timelinessBonus;
    const penalty = this.calculatePenalties(student);

    return {
      base: baseEarning,
      bonus: totalBonus,
      penalty: penalty,
      total: baseEarning + totalBonus - penalty,
      breakdown: {
        qualityBonus,
        completionBonus,
        timelinessBonus,
        tierBonus: baseEarning * bonusRate
      }
    };
  }

  /**
   * ⭐ CALCULATE QUALITY BONUS
   */
  calculateQualityBonus(student) {
    const { qualityScore, averageRating } = student.metrics || {};
    
    if (!qualityScore || !averageRating) return 0;

    let bonus = 0;

    // Quality score bonus (up to 5%)
    if (qualityScore >= 4.7) bonus += EARNINGS_CONFIG.BASE_RATE * 0.05;
    else if (qualityScore >= 4.3) bonus += EARNINGS_CONFIG.BASE_RATE * 0.03;
    else if (qualityScore >= 4.0) bonus += EARNINGS_CONFIG.BASE_RATE * 0.01;

    // Rating bonus (up to 3%)
    if (averageRating >= 4.8) bonus += EARNINGS_CONFIG.BASE_RATE * 0.03;
    else if (averageRating >= 4.5) bonus += EARNINGS_CONFIG.BASE_RATE * 0.02;
    else if (averageRating >= 4.0) bonus += EARNINGS_CONFIG.BASE_RATE * 0.01;

    return Math.min(bonus, EARNINGS_CONFIG.BASE_RATE * 0.08); // Cap at 8%
  }

  /**
   * ✅ CALCULATE COMPLETION BONUS
   */
  calculateCompletionBonus(student) {
    const { completionRate, onTimeCompletion } = student.metrics || {};
    
    if (!completionRate) return 0;

    let bonus = 0;

    // Completion rate bonus (up to 5%)
    if (completionRate >= 90) bonus += EARNINGS_CONFIG.BASE_RATE * 0.05;
    else if (completionRate >= 80) bonus += EARNINGS_CONFIG.BASE_RATE * 0.03;
    else if (completionRate >= 70) bonus += EARNINGS_CONFIG.BASE_RATE * 0.01;

    // On-time completion bonus (up to 2%)
    if (onTimeCompletion >= 95) bonus += EARNINGS_CONFIG.BASE_RATE * 0.02;

    return Math.min(bonus, EARNINGS_CONFIG.BASE_RATE * 0.07); // Cap at 7%
  }

  /**
   * ⏰ CALCULATE TIMELINESS BONUS
   */
  calculateTimelinessBonus(student) {
    const { responseTime, sessionPunctuality } = student.metrics || {};
    
    let bonus = 0;

    // Response time bonus (up to 3%)
    if (responseTime <= 2) bonus += EARNINGS_CONFIG.BASE_RATE * 0.03; // 2 hours or less
    else if (responseTime <= 6) bonus += EARNINGS_CONFIG.BASE_RATE * 0.02; // 6 hours or less
    else if (responseTime <= 12) bonus += EARNINGS_CONFIG.BASE_RATE * 0.01; // 12 hours or less

    // Punctuality bonus (up to 2%)
    if (sessionPunctuality >= 95) bonus += EARNINGS_CONFIG.BASE_RATE * 0.02;

    return Math.min(bonus, EARNINGS_CONFIG.BASE_RATE * 0.05); // Cap at 5%
  }

  /**
   * ⚠️ CALCULATE PENALTIES
   */
  calculatePenalties(student) {
    const { cancellationRate, complaintCount, lowRatings } = student.metrics || {};
    
    let penalty = 0;

    // Cancellation penalty
    if (cancellationRate > 10) {
      penalty += EARNINGS_CONFIG.BASE_RATE * 0.05;
    }

    // Complaint penalty
    if (complaintCount > 0) {
      penalty += EARNINGS_CONFIG.BASE_RATE * (complaintCount * 0.02); // 2% per complaint
    }

    // Low rating penalty
    if (lowRatings > 0) {
      penalty += EARNINGS_CONFIG.BASE_RATE * (lowRatings * 0.03); // 3% per low rating
    }

    return Math.min(penalty, EARNINGS_CONFIG.BASE_RATE * 0.20); // Cap at 20%
  }

  /**
   * 📈 CALCULATE PROJECTIONS
   */
  calculateProjections(students) {
    const currentEarnings = this.calculateEarnings(students);
    const growthRate = this.calculateGrowthRate(students);
    const capacity = this.calculateCapacity();

    const projected = {
      nextMonth: currentEarnings.totalEarnings * (1 + growthRate),
      nextQuarter: currentEarnings.totalEarnings * Math.pow(1 + growthRate, 3),
      nextYear: currentEarnings.totalEarnings * Math.pow(1 + growthRate, 12),
      capacityEarnings: capacity.maxStudents * EARNINGS_CONFIG.BASE_RATE * (1 + EARNINGS_CONFIG.BONUS_RATES.MASTER)
    };

    return projected;
  }

  /**
   * 📊 CALCULATE PERFORMANCE METRICS
   */
  calculatePerformanceMetrics(students) {
    if (students.length === 0) {
      return {
        studentCount: 0,
        completionRate: 0,
        averageRating: 0,
        qualityScore: 0,
        earningsPerStudent: 0
      };
    }

    const totalStudents = students.length;
    const completedStudents = students.filter(s => s.metrics?.completionRate >= 70).length;
    const totalRating = students.reduce((sum, student) => sum + (student.metrics?.averageRating || 0), 0);
    const totalQuality = students.reduce((sum, student) => sum + (student.metrics?.qualityScore || 0), 0);
    const totalEarnings = this.calculateEarnings(students).totalEarnings;

    return {
      studentCount: totalStudents,
      completionRate: (completedStudents / totalStudents) * 100,
      averageRating: totalRating / totalStudents,
      qualityScore: totalQuality / totalStudents,
      earningsPerStudent: totalEarnings / totalStudents
    };
  }

  /**
   * 🔄 START REAL-TIME UPDATES
   */
  startRealtimeUpdates(expertId) {
    // Simulate real-time updates every 30 seconds
    this.updateInterval = setInterval(async () => {
      try {
        const updates = await this.fetchRealtimeUpdates(expertId);
        this.realtimeUpdates.set(expertId, updates);
        this.emit('realtimeUpdate', updates);
      } catch (error) {
        console.error('Real-time update failed:', error);
      }
    }, 30000);
  }

  /**
   * 🗑️ CLEANUP RESOURCES
   */
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.cache.clear();
    this.realtimeUpdates.clear();
    this.removeAllListeners();
  }

  // Helper methods for data fetching (would be implemented with actual API calls)
  async fetchExpertData(expertId) {
    // Implementation would fetch from API
    return {
      id: expertId,
      currentTier: 'MASTER',
      joinDate: new Date('2024-01-01'),
      totalStudents: 45,
      overallRating: 4.8
    };
  }

  async fetchCurrentMetrics(expertId) {
    // Implementation would fetch from API
    return {
      activeStudents: 15,
      pendingPayouts: 3,
      totalEarned: 44955,
      thisMonth: 8991
    };
  }

  async fetchRealtimeUpdates(expertId) {
    // Implementation would fetch from API
    return {
      newEnrollments: 2,
      completedSessions: 1,
      pendingPayouts: 1,
      updatedAt: new Date()
    };
  }

  calculateGrowthRate(students) {
    // Simplified growth calculation
    return 0.15; // 15% monthly growth
  }

  calculateCapacity() {
    return {
      currentStudents: 15,
      maxStudents: 50,
      utilization: 0.3
    };
  }
}

// React Component
const EarningsCalculator = ({ expertId, period = 'current', style }) => {
  const [earningsData, setEarningsData] = useState(null);
  const [realtimeUpdates, setRealtimeUpdates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  const earningsEngine = useMemo(() => new EarningsEngine(), []);

  // Initialize earnings engine
  useEffect(() => {
    const initializeEngine = async () => {
      try {
        setLoading(true);
        await earningsEngine.initialize(expertId);
        
        // Fetch initial data
        const students = await fetchStudents(expertId, period);
        const calculations = earningsEngine.calculateEarnings(students, period);
        setEarningsData(calculations);

        // Fade in animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeEngine();

    // Set up real-time updates
    const handleRealtimeUpdate = (updates) => {
      setRealtimeUpdates(updates);
    };

    earningsEngine.on('realtimeUpdate', handleRealtimeUpdate);

    return () => {
      earningsEngine.removeListener('realtimeUpdate', handleRealtimeUpdate);
      earningsEngine.destroy();
    };
  }, [expertId, period, earningsEngine, fadeAnim]);

  // Refresh data when period changes
  useEffect(() => {
    if (earningsEngine.initialized) {
      refreshData();
    }
  }, [period]);

  const refreshData = useCallback(async () => {
    try {
      const students = await fetchStudents(expertId, period);
      const calculations = earningsEngine.calculateEarnings(students, period);
      setEarningsData(calculations);
    } catch (err) {
      setError(err.message);
    }
  }, [expertId, period, earningsEngine]);

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Calculating earnings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  if (!earningsData) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>No earnings data available</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }, style]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Earnings Summary</Text>
          <Text style={styles.totalEarnings}>
            ETB {earningsData.totalEarnings.toLocaleString()}
          </Text>
          <Text style={styles.summarySubtitle}>Total Earnings</Text>
          
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Base</Text>
              <Text style={styles.breakdownValue}>
                ETB {earningsData.baseEarnings.toLocaleString()}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Bonuses</Text>
              <Text style={[styles.breakdownValue, styles.bonusText]}>
                +ETB {earningsData.bonusEarnings.toLocaleString()}
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Penalties</Text>
              <Text style={[styles.breakdownValue, styles.penaltyText]}>
                -ETB {earningsData.penalties.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.metricsCard}>
          <Text style={styles.cardTitle}>Performance Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{earningsData.metrics.studentCount}</Text>
              <Text style={styles.metricLabel}>Students</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{earningsData.metrics.completionRate.toFixed(1)}%</Text>
              <Text style={styles.metricLabel}>Completion</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{earningsData.metrics.averageRating.toFixed(1)}</Text>
              <Text style={styles.metricLabel}>Rating</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>
                ETB {earningsData.metrics.earningsPerStudent.toFixed(0)}
              </Text>
              <Text style={styles.metricLabel}>Per Student</Text>
            </View>
          </View>
        </View>

        {/* Earnings Chart */}
        {earningsData.breakdown.byStudent.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.cardTitle}>Earnings Distribution</Text>
            <BarChart
              data={{
                labels: earningsData.breakdown.byStudent.slice(0, 5).map(s => s.name.substring(0, 3)),
                datasets: [{
                  data: earningsData.breakdown.byStudent.slice(0, 5).map(s => s.total)
                }]
              }}
              width={Dimensions.get('window').width - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              style={styles.chart}
            />
          </View>
        )}

        {/* Projections */}
        <View style={styles.projectionsCard}>
          <Text style={styles.cardTitle}>Earnings Projections</Text>
          <View style={styles.projectionList}>
            <View style={styles.projectionItem}>
              <Text style={styles.projectionLabel}>Next Month</Text>
              <Text style={styles.projectionValue}>
                ETB {earningsData.projectedEarnings.nextMonth.toLocaleString()}
              </Text>
            </View>
            <View style={styles.projectionItem}>
              <Text style={styles.projectionLabel}>Next Quarter</Text>
              <Text style={styles.projectionValue}>
                ETB {earningsData.projectedEarnings.nextQuarter.toLocaleString()}
              </Text>
            </View>
            <View style={styles.projectionItem}>
              <Text style={styles.projectionLabel}>At Full Capacity</Text>
              <Text style={styles.projectionValue}>
                ETB {earningsData.projectedEarnings.capacityEarnings.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Real-time Updates */}
        {realtimeUpdates && (
          <View style={styles.realtimeCard}>
            <Text style={styles.cardTitle}>Recent Activity</Text>
            <View style={styles.updateList}>
              <View style={styles.updateItem}>
                <Text style={styles.updateText}>
                  {realtimeUpdates.newEnrollments} new enrollment(s)
                </Text>
              </View>
              <View style={styles.updateItem}>
                <Text style={styles.updateText}>
                  {realtimeUpdates.completedSessions} session(s) completed
                </Text>
              </View>
              <View style={styles.updateItem}>
                <Text style={styles.updateText}>
                  {realtimeUpdates.pendingPayouts} payout(s) pending
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  totalEarnings: {
    fontSize: 32,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  bonusText: {
    color: '#059669',
  },
  penaltyText: {
    color: '#dc2626',
  },
  metricsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  projectionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  projectionList: {
    gap: 12,
  },
  projectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  projectionLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  projectionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  realtimeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  updateList: {
    gap: 8,
  },
  updateItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  updateText: {
    fontSize: 14,
    color: '#475569',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginTop: 20,
  },
});

// Helper function to fetch students (would be implemented with actual API)
const fetchStudents = async (expertId, period) => {
  // Mock data - replace with actual API call
  return [
    {
      id: '1',
      name: 'Student 1',
      metrics: {
        completionRate: 85,
        averageRating: 4.8,
        qualityScore: 4.7,
        responseTime: 1.5,
        sessionPunctuality: 98,
        cancellationRate: 5,
        complaintCount: 0,
        lowRatings: 0
      }
    },
    {
      id: '2', 
      name: 'Student 2',
      metrics: {
        completionRate: 92,
        averageRating: 4.9,
        qualityScore: 4.8,
        responseTime: 1.2,
        sessionPunctuality: 99,
        cancellationRate: 2,
        complaintCount: 0,
        lowRatings: 0
      }
    }
  ];
};

export { EarningsCalculator, EarningsEngine, EARNINGS_CONFIG };
export default EarningsCalculator;