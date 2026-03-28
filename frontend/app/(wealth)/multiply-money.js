/**
 * 🏢 MOSA FORGE - Enterprise Wealth Multiplication Interface
 * 💰 Interactive Money Multiplication Strategy Builder
 * 📊 Real-time Wealth Projection & Financial Simulation
 * 🎯 Goal-Based Investment Strategy Customization
 * 🚀 Enterprise-Grade React Native Interface
 * 
 * @module MultiplyMoney
 * @version Enterprise 2.0
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  Platform,
  Alert,
  BackHandler
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🏗️ Enterprise Components
import WealthSimulator from '../../components/wealth/WealthSimulator';
import InvestmentCalculator from '../../components/wealth/InvestmentCalculator';
import FinancialDashboard from '../../components/wealth/FinancialDashboard';
import StrategyBuilder from '../../components/wealth/StrategyBuilder';
import ProgressTracker from '../../components/wealth/ProgressTracker';

// 🎯 Custom Hooks
import { useWealthContext } from '../../contexts/wealth-context';
import { useFinancialMetrics } from '../../hooks/use-financial-metrics';
import { useInvestmentStrategies } from '../../hooks/use-investment-strategies';

// 📊 Enterprise Constants
import { 
  WEALTH_MULTIPLICATION_STRATEGIES,
  INVESTMENT_VEHICLES,
  FINANCIAL_GOALS
} from '../../constants/wealth-strategies';

const { width, height } = Dimensions.get('window');

export default function MultiplyMoney() {
  // 🔄 Navigation
  const router = useRouter();
  
  // 🎯 State Management
  const [activeTab, setActiveTab] = useState('simulator');
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [simulationResults, setSimulationResults] = useState(null);
  const [userGoals, setUserGoals] = useState([]);
  const [investmentAmount, setInvestmentAmount] = useState(1999); // Base bundle price
  const [timeHorizon, setTimeHorizon] = useState(12); // Months

  // 🎨 Animation Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // 🏗️ Context & Hooks
  const { 
    wealthData, 
    updateWealthData,
    calculateNetWorth,
    generateWealthReport 
  } = useWealthContext();

  const { 
    metrics,
    calculateROI,
    calculateCompoundedReturns,
    analyzeRiskProfile 
  } = useFinancialMetrics();

  const { 
    strategies,
    recommendedStrategy,
    generateStrategy,
    optimizeStrategy 
  } = useInvestmentStrategies();

  /**
   * 🚀 INITIALIZE COMPONENT
   */
  useEffect(() => {
    initializeComponent();
    
    // 🎨 Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();

    // 🔙 Handle back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    return () => {
      backHandler.remove();
    };
  }, []);

  /**
   * 🏗️ INITIALIZE COMPONENT
   */
  const initializeComponent = async () => {
    try {
      setIsLoading(true);
      
      // 📊 Load user financial data
      await loadFinancialData();
      
      // 🎯 Load user goals
      await loadUserGoals();
      
      // 💡 Generate initial strategy
      await generateInitialStrategy();
      
      setIsLoading(false);
      
    } catch (error) {
      console.error('Initialization failed:', error);
      showErrorAlert('Initialization Error', 'Failed to load wealth multiplication tools');
    }
  };

  /**
   * 📊 LOAD FINANCIAL DATA
   */
  const loadFinancialData = async () => {
    try {
      // 💾 Load from AsyncStorage
      const storedData = await AsyncStorage.getItem('user_financial_data');
      
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setFinancialData(parsedData);
        updateWealthData(parsedData);
      } else {
        // 🎯 Initialize default financial data
        const defaultData = initializeDefaultFinancialData();
        setFinancialData(defaultData);
        await AsyncStorage.setItem('user_financial_data', JSON.stringify(defaultData));
      }
      
    } catch (error) {
      console.error('Failed to load financial data:', error);
      throw error;
    }
  };

  /**
   * 🎯 LOAD USER GOALS
   */
  const loadUserGoals = async () => {
    try {
      const storedGoals = await AsyncStorage.getItem('user_financial_goals');
      
      if (storedGoals) {
        setUserGoals(JSON.parse(storedGoals));
      } else {
        // 🎯 Set default goals
        const defaultGoals = FINANCIAL_GOALS.slice(0, 3);
        setUserGoals(defaultGoals);
        await AsyncStorage.setItem('user_financial_goals', JSON.stringify(defaultGoals));
      }
      
    } catch (error) {
      console.error('Failed to load user goals:', error);
    }
  };

  /**
   * 💡 GENERATE INITIAL STRATEGY
   */
  const generateInitialStrategy = async () => {
    try {
      const strategy = await generateStrategy({
        investmentAmount,
        timeHorizon,
        riskProfile: 'moderate',
        goals: userGoals
      });
      
      setSelectedStrategy(strategy);
      
    } catch (error) {
      console.error('Failed to generate initial strategy:', error);
    }
  };

  /**
   * 🎯 HANDLE STRATEGY SELECTION
   */
  const handleStrategySelect = async (strategy) => {
    try {
      setSelectedStrategy(strategy);
      
      // 📊 Run simulation for selected strategy
      const results = await runWealthSimulation(strategy);
      setSimulationResults(results);
      
      // 💾 Save selected strategy
      await AsyncStorage.setItem('selected_wealth_strategy', JSON.stringify(strategy));
      
      // 🎯 Show success feedback
      showSuccessFeedback(`Strategy "${strategy.name}" selected`);
      
    } catch (error) {
      console.error('Strategy selection failed:', error);
      showErrorAlert('Strategy Error', 'Failed to select strategy');
    }
  };

  /**
   * 📊 RUN WEALTH SIMULATION
   */
  const runWealthSimulation = async (strategy) => {
    try {
      const simulator = new WealthSimulator();
      
      const simulationData = {
        initialInvestment: investmentAmount,
        monthlyContribution: calculateMonthlyContribution(strategy),
        timePeriod: timeHorizon,
        expectedReturns: strategy.expectedReturns,
        riskFactors: strategy.riskFactors,
        taxImplications: strategy.taxImplications
      };
      
      const results = await simulator.runSimulation(simulationData);
      return results;
      
    } catch (error) {
      console.error('Wealth simulation failed:', error);
      throw error;
    }
  };

  /**
   * 💰 CALCULATE MONTHLY CONTRIBUTION
   */
  const calculateMonthlyContribution = (strategy) => {
    // 🎯 Based on strategy type and user financial capacity
    const baseContribution = investmentAmount / timeHorizon;
    
    switch (strategy.type) {
      case 'aggressive':
        return baseContribution * 1.5;
      case 'moderate':
        return baseContribution;
      case 'conservative':
        return baseContribution * 0.7;
      default:
        return baseContribution;
    }
  };

  /**
   * 🚀 START WEALTH JOURNEY
   */
  const startWealthJourney = async () => {
    if (!selectedStrategy) {
      showErrorAlert('Strategy Required', 'Please select a wealth multiplication strategy');
      return;
    }
    
    try {
      // 🎯 Validate financial readiness
      const readiness = await validateFinancialReadiness();
      
      if (!readiness.ready) {
        showFinancialReadinessAlert(readiness.reasons);
        return;
      }
      
      // 📊 Create wealth journey plan
      const journeyPlan = await createWealthJourneyPlan();
      
      // 🗺️ Navigate to implementation phase
      router.push({
        pathname: '/(wealth)/wealth-journey',
        params: {
          strategy: JSON.stringify(selectedStrategy),
          plan: JSON.stringify(journeyPlan),
          investmentAmount: investmentAmount.toString()
        }
      });
      
    } catch (error) {
      console.error('Wealth journey start failed:', error);
      showErrorAlert('Journey Start Failed', 'Unable to start wealth multiplication journey');
    }
  };

  /**
   * ✅ VALIDATE FINANCIAL READINESS
   */
  const validateFinancialReadiness = async () => {
    const readinessChecks = [];
    
    // ✅ Emergency fund check
    const emergencyFundStatus = await checkEmergencyFund();
    readinessChecks.push(emergencyFundStatus);
    
    // ✅ Debt-to-income ratio check
    const debtRatioStatus = await checkDebtRatio();
    readinessChecks.push(debtRatioStatus);
    
    // ✅ Investment knowledge check
    const knowledgeStatus = await checkInvestmentKnowledge();
    readinessChecks.push(knowledgeStatus);
    
    const ready = readinessChecks.every(check => check.passed);
    const reasons = readinessChecks.filter(check => !check.passed).map(check => check.reason);
    
    return { ready, reasons };
  };

  /**
   * 📈 CREATE WEALTH JOURNEY PLAN
   */
  const createWealthJourneyPlan = async () => {
    const plan = {
      strategy: selectedStrategy,
      timeline: timeHorizon,
      milestones: generateMilestones(),
      actionSteps: generateActionSteps(),
      monitoringSchedule: generateMonitoringSchedule(),
      riskMitigation: generateRiskMitigationPlan(),
      created: new Date().toISOString()
    };
    
    // 💾 Save plan
    await AsyncStorage.setItem('wealth_journey_plan', JSON.stringify(plan));
    
    return plan;
  };

  /**
   * 🎯 GENERATE MILESTONES
   */
  const generateMilestones = () => {
    const milestones = [];
    const quarter = Math.floor(timeHorizon / 4);
    
    for (let i = 1; i <= 4; i++) {
      const month = quarter * i;
      const targetAmount = calculateMilestoneTarget(month);
      
      milestones.push({
        month,
        targetAmount,
        description: `Month ${month} Milestone`,
        metrics: ['investment_growth', 'portfolio_diversification', 'risk_adjustment']
      });
    }
    
    return milestones;
  };

  /**
   * 📋 GENERATE ACTION STEPS
   */
  const generateActionSteps = () => {
    const steps = [
      {
        step: 1,
        title: 'Portfolio Setup',
        description: 'Configure initial investment portfolio',
        deadline: 'Week 1',
        priority: 'high',
        completed: false
      },
      {
        step: 2,
        title: 'Risk Assessment',
        description: 'Complete risk tolerance assessment',
        deadline: 'Week 2',
        priority: 'high',
        completed: false
      },
      {
        step: 3,
        title: 'First Investment',
        description: 'Make initial investment',
        deadline: 'Month 1',
        priority: 'critical',
        completed: false
      },
      {
        step: 4,
        title: 'Diversification Setup',
        description: 'Set up portfolio diversification',
        deadline: 'Month 2',
        priority: 'medium',
        completed: false
      }
    ];
    
    return steps;
  };

  /**
   * 🔄 RENDER ACTIVE TAB CONTENT
   */
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'simulator':
        return (
          <WealthSimulator
            investmentAmount={investmentAmount}
            timeHorizon={timeHorizon}
            strategy={selectedStrategy}
            onSimulationComplete={(results) => setSimulationResults(results)}
            financialData={financialData}
          />
        );
        
      case 'calculator':
        return (
          <InvestmentCalculator
            initialAmount={investmentAmount}
            onAmountChange={setInvestmentAmount}
            onTimeHorizonChange={setTimeHorizon}
            strategies={strategies}
            onStrategySelect={handleStrategySelect}
          />
        );
        
      case 'dashboard':
        return (
          <FinancialDashboard
            financialData={financialData}
            metrics={metrics}
            goals={userGoals}
            onGoalUpdate={(goals) => setUserGoals(goals)}
          />
        );
        
      case 'strategy':
        return (
          <StrategyBuilder
            selectedStrategy={selectedStrategy}
            onStrategySelect={handleStrategySelect}
            recommendedStrategy={recommendedStrategy}
            userGoals={userGoals}
          />
        );
        
      case 'progress':
        return (
          <ProgressTracker
            simulationResults={simulationResults}
            milestones={generateMilestones()}
            timeHorizon={timeHorizon}
            onMilestoneUpdate={(updated) => console.log('Milestone updated:', updated)}
          />
        );
        
      default:
        return null;
    }
  };

  /**
   * 🔙 HANDLE BACK PRESS
   */
  const handleBackPress = () => {
    if (activeTab !== 'simulator') {
      setActiveTab('simulator');
      return true;
    }
    return false;
  };

  /**
   * 🚨 SHOW ERROR ALERT
   */
  const showErrorAlert = (title, message) => {
    Alert.alert(
      title,
      message,
      [{ text: 'OK', style: 'cancel' }]
    );
  };

  /**
   * ✅ SHOW SUCCESS FEEDBACK
   */
  const showSuccessFeedback = (message) => {
    // 🎯 Implement success feedback (toast or animation)
    console.log('Success:', message);
  };

  /**
   * 💰 SHOW FINANCIAL READINESS ALERT
   */
  const showFinancialReadinessAlert = (reasons) => {
    Alert.alert(
      'Financial Readiness Check',
      `Please address these areas before starting:\n\n• ${reasons.join('\n• ')}`,
      [
        { text: 'Fix Issues', onPress: () => router.push('/(wealth)/financial-readiness') },
        { text: 'Continue Anyway', style: 'destructive', onPress: startWealthJourney }
      ]
    );
  };

  /**
   * 🎨 RENDER LOADING STATE
   */
  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.loadingGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <MaterialCommunityIcons name="finance" size={64} color="#fff" />
        <Text style={styles.loadingText}>Loading Wealth Tools...</Text>
        <View style={styles.loadingSpinner}>
          {/* Add loading animation */}
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View 
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        {/* 🎯 HEADER */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color="#2D3748" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Multiply Money</Text>
            <Text style={styles.headerSubtitle}>Wealth Multiplication Strategy</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.helpButton}
            onPress={() => router.push('/(wealth)/wealth-education')}
          >
            <Ionicons name="help-circle-outline" size={28} color="#2D3748" />
          </TouchableOpacity>
        </View>

        {/* 🎯 QUICK STATS */}
        <View style={styles.quickStatsContainer}>
          <LinearGradient
            colors={['#4FD1C5', '#38B2AC']}
            style={styles.statsGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Investment</Text>
              <Text style={styles.statValue}>ETB {investmentAmount.toLocaleString()}</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Timeframe</Text>
              <Text style={styles.statValue}>{timeHorizon} Months</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Projected ROI</Text>
              <Text style={styles.statValue}>
                {simulationResults?.roi ? `${simulationResults.roi.toFixed(1)}%` : '--'}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* 🎯 NAVIGATION TABS */}
        <View style={styles.tabContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            {[
              { id: 'simulator', icon: 'trending-up', label: 'Simulator' },
              { id: 'calculator', icon: 'calculator', label: 'Calculator' },
              { id: 'dashboard', icon: 'speedometer', label: 'Dashboard' },
              { id: 'strategy', icon: 'strategy', label: 'Strategy' },
              { id: 'progress', icon: 'progress-check', label: 'Progress' }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabButton,
                  activeTab === tab.id && styles.tabButtonActive
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <MaterialCommunityIcons 
                  name={tab.icon} 
                  size={22} 
                  color={activeTab === tab.id ? '#fff' : '#4A5568'} 
                />
                <Text style={[
                  styles.tabLabel,
                  activeTab === tab.id && styles.tabLabelActive
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 📊 MAIN CONTENT */}
        <View style={styles.contentContainer}>
          <ScrollView 
            style={styles.contentScroll}
            showsVerticalScrollIndicator={false}
          >
            {renderActiveTab()}
          </ScrollView>
        </View>

        {/* 🚀 ACTION BUTTONS */}
        <BlurView intensity={90} style={styles.actionBar}>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.push('/(wealth)/wealth-education')}
          >
            <MaterialCommunityIcons name="school" size={20} color="#4A5568" />
            <Text style={styles.secondaryButtonText}>Learn More</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={startWealthJourney}
            disabled={!selectedStrategy || isLoading}
          >
            <LinearGradient
              colors={selectedStrategy ? ['#667eea', '#764ba2'] : ['#CBD5E0', '#A0AEC0']}
              style={styles.primaryButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <FontAwesome5 name="rocket" size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {selectedStrategy ? 'Start Wealth Journey' : 'Select Strategy'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </BlurView>
      </Animated.View>

      {/* 📱 SAFE AREA BOTTOM */}
      {Platform.OS === 'ios' && <View style={styles.safeAreaBottom} />}
    </SafeAreaView>
  );
}

/**
 * 🎨 STYLESHEET
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  loadingSpinner: {
    marginTop: 24,
  },
  animatedContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginTop: 2,
  },
  helpButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickStatsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statsGradient: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  tabContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tabScrollContent: {
    paddingRight: 20,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#EDF2F7',
  },
  tabButtonActive: {
    backgroundColor: '#4C51BF',
  },
  tabLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  tabLabelActive: {
    color: '#fff',
  },
  contentContainer: {
    flex: 1,
  },
  contentScroll: {
    flex: 1,
  },
  actionBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#EDF2F7',
    marginRight: 12,
  },
  secondaryButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
  },
  primaryButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  primaryButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  safeAreaBottom: {
    height: 20,
    backgroundColor: '#F7FAFC',
  },
});

/**
 * 💰 INITIALIZE DEFAULT FINANCIAL DATA
 */
const initializeDefaultFinancialData = () => {
  return {
    monthlyIncome: 5000,
    monthlyExpenses: 3000,
    currentSavings: 10000,
    currentInvestments: 0,
    debtAmount: 0,
    emergencyFund: 3000,
    riskTolerance: 'moderate',
    investmentExperience: 'beginner',
    financialGoals: [
      {
        id: 'goal_1',
        title: 'Build Emergency Fund',
        targetAmount: 15000,
        currentAmount: 3000,
        deadline: '6 months',
        priority: 'high'
      },
      {
        id: 'goal_2',
        title: 'Start Investing',
        targetAmount: 5000,
        currentAmount: 0,
        deadline: '3 months',
        priority: 'medium'
      }
    ],
    updatedAt: new Date().toISOString()
  };
};

/**
 * 📊 CALCULATE MILESTONE TARGET
 */
const calculateMilestoneTarget = (month) => {
  // Simplified calculation - would use compound interest formula in production
  const monthlyGrowthRate = 0.015; // 1.5% monthly growth
  return 1999 * Math.pow(1 + monthlyGrowthRate, month);
};

/**
 * ✅ CHECK EMERGENCY FUND
 */
const checkEmergencyFund = async () => {
  try {
    const data = await AsyncStorage.getItem('user_financial_data');
    if (!data) return { passed: false, reason: 'No financial data found' };
    
    const financialData = JSON.parse(data);
    const monthlyExpenses = financialData.monthlyExpenses || 3000;
    const emergencyFund = financialData.emergencyFund || 0;
    
    // 🎯 Rule: 3-6 months of expenses
    const minEmergencyFund = monthlyExpenses * 3;
    const passed = emergencyFund >= minEmergencyFund;
    
    return {
      passed,
      reason: passed ? 'Emergency fund sufficient' : `Emergency fund should be at least ETB ${minEmergencyFund.toLocaleString()}`
    };
    
  } catch (error) {
    return { passed: false, reason: 'Unable to check emergency fund' };
  }
};

/**
 * 💳 CHECK DEBT RATIO
 */
const checkDebtRatio = async () => {
  try {
    const data = await AsyncStorage.getItem('user_financial_data');
    if (!data) return { passed: false, reason: 'No financial data found' };
    
    const financialData = JSON.parse(data);
    const monthlyIncome = financialData.monthlyIncome || 5000;
    const debtAmount = financialData.debtAmount || 0;
    
    // 🎯 Rule: Debt-to-income ratio < 36%
    const debtRatio = debtAmount / monthlyIncome;
    const passed = debtRatio < 0.36;
    
    return {
      passed,
      reason: passed ? 'Debt ratio acceptable' : 'Debt ratio too high for investment'
    };
    
  } catch (error) {
    return { passed: false, reason: 'Unable to check debt ratio' };
  }
};

/**
 * 🎓 CHECK INVESTMENT KNOWLEDGE
 */
const checkInvestmentKnowledge = async () => {
  try {
    const assessment = await AsyncStorage.getItem('investment_knowledge_assessment');
    
    if (!assessment) {
      return { passed: false, reason: 'Complete investment knowledge assessment' };
    }
    
    const score = JSON.parse(assessment).score || 0;
    const passed = score >= 70; // 70% minimum score
    
    return {
      passed,
      reason: passed ? 'Investment knowledge sufficient' : 'Improve investment knowledge'
    };
    
  } catch (error) {
    return { passed: false, reason: 'Unable to check investment knowledge' };
  }
};

/**
 * 📅 GENERATE MONITORING SCHEDULE
 */
const generateMonitoringSchedule = () => {
  return {
    weekly: ['portfolio_performance', 'market_updates'],
    monthly: ['goal_progress', 'risk_assessment', 'rebalancing_check'],
    quarterly: ['strategy_review', 'performance_analysis', 'tax_optimization'],
    annually: ['comprehensive_review', 'goal_adjustment', 'strategy_optimization']
  };
};

/**
 * 🛡️ GENERATE RISK MITIGATION PLAN
 */
const generateRiskMitigationPlan = () => {
  return {
    diversification: {
      strategy: 'Multi-asset diversification',
      allocation: {
        equities: 60,
        fixed_income: 25,
        alternatives: 10,
        cash: 5
      }
    },
    hedging: {
      strategies: ['stop_loss_orders', 'option_hedging', 'asset_correlation']
    },
    contingency: {
      emergency_withdrawal: '3 months notice',
      risk_cap: 'Maximum 20% drawdown',
      rebalancing_trigger: '5% allocation deviation'
    }
  };
};