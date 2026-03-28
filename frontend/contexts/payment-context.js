// contexts/payment-context.js

/**
 * 🎯 ENTERPRISE PAYMENT CONTEXT
 * Production-ready payment state management for Mosa Forge
 * Features: 1000/999 revenue split, 333/333/333 payout schedule, Telebirr/CBE integration
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { Platform, Alert, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../utils/logger';
import { PaymentService } from '../services/payment-service';
import { useAuth } from './auth-context';

// 🎯 Payment Constants
const PAYMENT_CONSTANTS = {
  BUNDLE_PRICE: 1999,
  PLATFORM_SHARE: 1000,
  EXPERT_SHARE: 999,
  PAYOUT_SCHEDULE: [333, 333, 333],
  QUALITY_BONUS_RATES: {
    MASTER: 0.20, // +20%
    SENIOR: 0.10, // +10%
    STANDARD: 0.00, // Base
    DEVELOPING: -0.10, // -10%
    PROBATION: -0.20 // -20%
  },
  PAYMENT_METHODS: {
    TELEBIRR: 'telebirr',
    CBE_BIRR: 'cbe_birr',
    AMOLE: 'amole',
    CBE_DIRECT: 'cbe_direct',
    BANK_TRANSFER: 'bank_transfer'
  },
  PAYMENT_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled'
  }
};

// 🎯 Initial State
const initialState = {
  // 💰 Payment Transactions
  transactions: [],
  currentTransaction: null,
  
  // 🎯 Bundle Information
  bundle: {
    price: PAYMENT_CONSTANTS.BUNDLE_PRICE,
    platformShare: PAYMENT_CONSTANTS.PLATFORM_SHARE,
    expertShare: PAYMENT_CONSTANTS.EXPERT_SHARE,
    payoutSchedule: PAYMENT_CONSTANTS.PAYOUT_SCHEDULE
  },
  
  // 💳 Payment Methods
  paymentMethods: [],
  selectedPaymentMethod: null,
  
  // 📊 Payment State
  paymentStatus: 'idle', // idle, processing, success, error
  paymentError: null,
  
  // 💸 Revenue Distribution
  revenueDistribution: {
    platform: 0,
    expert: 0,
    paidOut: 0,
    pending: 0
  },
  
  // 🏦 Payout Tracking
  payouts: [],
  upcomingPayouts: [],
  
  // 🔄 Installment Plans
  installmentPlans: [],
  activeInstallment: null,
  
  // 📱 UI State
  isPaymentModalVisible: false,
  isProcessing: false,
  
  // 🎯 Quality Bonuses
  qualityBonuses: [],
  expertTier: 'STANDARD',
  
  // 💾 Cache State
  lastUpdated: null,
  isSyncing: false
};

// 🎯 Action Types
const PAYMENT_ACTIONS = {
  // 💰 Transaction Actions
  INITIATE_PAYMENT: 'INITIATE_PAYMENT',
  PROCESS_PAYMENT_START: 'PROCESS_PAYMENT_START',
  PROCESS_PAYMENT_SUCCESS: 'PROCESS_PAYMENT_SUCCESS',
  PROCESS_PAYMENT_FAILURE: 'PROCESS_PAYMENT_FAILURE',
  UPDATE_TRANSACTION: 'UPDATE_TRANSACTION',
  
  // 🎯 Bundle Actions
  SET_BUNDLE_INFO: 'SET_BUNDLE_INFO',
  UPDATE_REVENUE_SPLIT: 'UPDATE_REVENUE_SPLIT',
  
  // 💳 Payment Method Actions
  SET_PAYMENT_METHODS: 'SET_PAYMENT_METHODS',
  SELECT_PAYMENT_METHOD: 'SELECT_PAYMENT_METHOD',
  
  // 💸 Revenue Actions
  UPDATE_REVENUE_DISTRIBUTION: 'UPDATE_REVENUE_DISTRIBUTION',
  ADD_PAYOUT: 'ADD_PAYOUT',
  UPDATE_PAYOUT_STATUS: 'UPDATE_PAYOUT_STATUS',
  
  // 🔄 Installment Actions
  SET_INSTALLMENT_PLANS: 'SET_INSTALLMENT_PLANS',
  ACTIVATE_INSTALLMENT: 'ACTIVATE_INSTALLMENT',
  UPDATE_INSTALLMENT_PROGRESS: 'UPDATE_INSTALLMENT_PROGRESS',
  
  // 🎯 Quality Actions
  SET_EXPERT_TIER: 'SET_EXPERT_TIER',
  UPDATE_QUALITY_BONUS: 'UPDATE_QUALITY_BONUS',
  
  // 📱 UI Actions
  SET_PAYMENT_MODAL_VISIBLE: 'SET_PAYMENT_MODAL_VISIBLE',
  SET_PROCESSING: 'SET_PROCESSING',
  
  // 💾 Cache Actions
  SET_LAST_UPDATED: 'SET_LAST_UPDATED',
  SET_SYNCING: 'SET_SYNCING',
  RESTORE_STATE: 'RESTORE_STATE',
  
  // 🗑️ Cleanup Actions
  RESET_PAYMENT: 'RESET_PAYMENT',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// 🎯 Payment Reducer
const paymentReducer = (state, action) => {
  switch (action.type) {
    
    // 💰 Transaction Actions
    case PAYMENT_ACTIONS.INITIATE_PAYMENT:
      return {
        ...state,
        currentTransaction: action.payload,
        paymentStatus: 'processing',
        isProcessing: true,
        paymentError: null
      };
    
    case PAYMENT_ACTIONS.PROCESS_PAYMENT_SUCCESS:
      return {
        ...state,
        transactions: [action.payload, ...state.transactions],
        currentTransaction: action.payload,
        paymentStatus: 'success',
        isProcessing: false,
        isPaymentModalVisible: false,
        lastUpdated: new Date().toISOString()
      };
    
    case PAYMENT_ACTIONS.PROCESS_PAYMENT_FAILURE:
      return {
        ...state,
        paymentStatus: 'error',
        paymentError: action.payload,
        isProcessing: false
      };
    
    case PAYMENT_ACTIONS.UPDATE_TRANSACTION:
      return {
        ...state,
        transactions: state.transactions.map(tx =>
          tx.id === action.payload.id ? { ...tx, ...action.payload.updates } : tx
        ),
        currentTransaction: state.currentTransaction?.id === action.payload.id 
          ? { ...state.currentTransaction, ...action.payload.updates }
          : state.currentTransaction
      };
    
    // 🎯 Bundle Actions
    case PAYMENT_ACTIONS.SET_BUNDLE_INFO:
      return {
        ...state,
        bundle: { ...state.bundle, ...action.payload }
      };
    
    case PAYMENT_ACTIONS.UPDATE_REVENUE_SPLIT:
      return {
        ...state,
        revenueDistribution: { ...state.revenueDistribution, ...action.payload }
      };
    
    // 💳 Payment Method Actions
    case PAYMENT_ACTIONS.SET_PAYMENT_METHODS:
      return {
        ...state,
        paymentMethods: action.payload,
        selectedPaymentMethod: action.payload[0] || null
      };
    
    case PAYMENT_ACTIONS.SELECT_PAYMENT_METHOD:
      return {
        ...state,
        selectedPaymentMethod: action.payload
      };
    
    // 💸 Revenue Actions
    case PAYMENT_ACTIONS.UPDATE_REVENUE_DISTRIBUTION:
      return {
        ...state,
        revenueDistribution: { ...state.revenueDistribution, ...action.payload }
      };
    
    case PAYMENT_ACTIONS.ADD_PAYOUT:
      return {
        ...state,
        payouts: [action.payload, ...state.payouts],
        upcomingPayouts: state.upcomingPayouts.filter(p => p.id !== action.payload.id)
      };
    
    // 🔄 Installment Actions
    case PAYMENT_ACTIONS.SET_INSTALLMENT_PLANS:
      return {
        ...state,
        installmentPlans: action.payload
      };
    
    case PAYMENT_ACTIONS.ACTIVATE_INSTALLMENT:
      return {
        ...state,
        activeInstallment: action.payload
      };
    
    // 🎯 Quality Actions
    case PAYMENT_ACTIONS.SET_EXPERT_TIER:
      return {
        ...state,
        expertTier: action.payload
      };
    
    case PAYMENT_ACTIONS.UPDATE_QUALITY_BONUS:
      return {
        ...state,
        qualityBonuses: action.payload
      };
    
    // 📱 UI Actions
    case PAYMENT_ACTIONS.SET_PAYMENT_MODAL_VISIBLE:
      return {
        ...state,
        isPaymentModalVisible: action.payload
      };
    
    case PAYMENT_ACTIONS.SET_PROCESSING:
      return {
        ...state,
        isProcessing: action.payload
      };
    
    // 💾 Cache Actions
    case PAYMENT_ACTIONS.SET_LAST_UPDATED:
      return {
        ...state,
        lastUpdated: action.payload
      };
    
    case PAYMENT_ACTIONS.SET_SYNCING:
      return {
        ...state,
        isSyncing: action.payload
      };
    
    case PAYMENT_ACTIONS.RESTORE_STATE:
      return {
        ...initialState,
        ...action.payload,
        paymentStatus: 'idle',
        isProcessing: false,
        paymentError: null
      };
    
    // 🗑️ Cleanup Actions
    case PAYMENT_ACTIONS.RESET_PAYMENT:
      return {
        ...initialState,
        lastUpdated: new Date().toISOString()
      };
    
    case PAYMENT_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        paymentError: null,
        paymentStatus: 'idle'
      };
    
    default:
      return state;
  }
};

// 🎯 Create Context
const PaymentContext = createContext();

// 🎯 Payment Provider Component
export const PaymentProvider = ({ children }) => {
  const [state, dispatch] = useReducer(paymentReducer, initialState);
  const { user, isAuthenticated } = useAuth();
  const logger = new Logger('PaymentContext');
  const paymentService = new PaymentService();

  // 🎯 Calculate Quality Bonus
  const calculateQualityBonus = useCallback((baseAmount, tier) => {
    const bonusRate = PAYMENT_CONSTANTS.QUALITY_BONUS_RATES[tier] || 0;
    const bonusAmount = baseAmount * bonusRate;
    return {
      bonusRate,
      bonusAmount,
      totalAmount: baseAmount + bonusAmount
    };
  }, []);

  // 🎯 Calculate Payout Schedule
  const calculatePayoutSchedule = useCallback((expertShare, tier = 'STANDARD') => {
    const basePayouts = PAYMENT_CONSTANTS.PAYOUT_SCHEDULE.map((amount, index) => {
      const bonusInfo = calculateQualityBonus(amount, tier);
      return {
        id: `payout-${Date.now()}-${index}`,
        amount: bonusInfo.totalAmount,
        baseAmount: amount,
        bonusAmount: bonusInfo.bonusAmount,
        bonusRate: bonusInfo.bonusRate,
        dueDate: new Date(Date.now() + (index * 30 * 24 * 60 * 60 * 1000)), // 30-day intervals
        status: 'pending',
        tier,
        phase: index + 1 // 1, 2, 3
      };
    });

    return basePayouts;
  }, [calculateQualityBonus]);

  // 🎯 Initialize Payment Context
  const initializePayment = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_SYNCING, payload: true });

      // 🎯 Load payment methods
      const methods = await paymentService.getPaymentMethods();
      dispatch({ type: PAYMENT_ACTIONS.SET_PAYMENT_METHODS, payload: methods });

      // 🎯 Load user transactions
      const transactions = await paymentService.getUserTransactions(user.id);
      dispatch({ 
        type: PAYMENT_ACTIONS.RESTORE_STATE, 
        payload: { transactions } 
      });

      // 🎯 Load revenue distribution for experts
      if (user.role === 'expert') {
        const revenueData = await paymentService.getRevenueDistribution(user.id);
        dispatch({ 
          type: PAYMENT_ACTIONS.UPDATE_REVENUE_DISTRIBUTION, 
          payload: revenueData 
        });

        const payouts = await paymentService.getExpertPayouts(user.id);
        dispatch({ 
          type: PAYMENT_ACTIONS.RESTORE_STATE, 
          payload: { payouts } 
        });

        // 🎯 Set expert tier for bonus calculations
        if (user.expertProfile?.tier) {
          dispatch({ 
            type: PAYMENT_ACTIONS.SET_EXPERT_TIER, 
            payload: user.expertProfile.tier 
          });
        }
      }

      // 🎯 Load installment plans
      const plans = await paymentService.getInstallmentPlans();
      dispatch({ type: PAYMENT_ACTIONS.SET_INSTALLMENT_PLANS, payload: plans });

      dispatch({ type: PAYMENT_ACTIONS.SET_LAST_UPDATED, payload: new Date().toISOString() });
      
      logger.info('Payment context initialized successfully', { userId: user.id });

    } catch (error) {
      logger.error('Failed to initialize payment context', error);
      dispatch({ 
        type: PAYMENT_ACTIONS.PROCESS_PAYMENT_FAILURE, 
        payload: 'Failed to load payment data' 
      });
    } finally {
      dispatch({ type: PAYMENT_ACTIONS.SET_SYNCING, payload: false });
    }
  }, [isAuthenticated, user, paymentService, logger]);

  // 🎯 Process Payment
  const processPayment = useCallback(async (paymentData) => {
    if (!isAuthenticated || !user) {
      throw new Error('User must be authenticated to process payments');
    }

    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_PROCESSING, payload: true });
      dispatch({ type: PAYMENT_ACTIONS.INITIATE_PAYMENT, payload: paymentData });

      // 🎯 Validate payment data
      const validation = validatePaymentData(paymentData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // 🎯 Process payment with service
      const result = await paymentService.processPayment({
        ...paymentData,
        userId: user.id,
        userFaydaId: user.faydaId,
        bundlePrice: PAYMENT_CONSTANTS.BUNDLE_PRICE
      });

      // 🎯 Update state with successful payment
      dispatch({ 
        type: PAYMENT_ACTIONS.PROCESS_PAYMENT_SUCCESS, 
        payload: result.transaction 
      });

      // 🎯 For experts, update revenue distribution
      if (user.role === 'expert' && result.revenueDistribution) {
        dispatch({ 
          type: PAYMENT_ACTIONS.UPDATE_REVENUE_DISTRIBUTION, 
          payload: result.revenueDistribution 
        });
      }

      logger.info('Payment processed successfully', {
        transactionId: result.transaction.id,
        amount: result.transaction.amount,
        method: result.transaction.paymentMethod
      });

      return result;

    } catch (error) {
      logger.error('Payment processing failed', error, { paymentData });
      
      dispatch({ 
        type: PAYMENT_ACTIONS.PROCESS_PAYMENT_FAILURE, 
        payload: error.message 
      });

      // 🎯 Show user-friendly error message
      const userMessage = getPaymentErrorMessage(error);
      Alert.alert('Payment Failed', userMessage);

      throw error;
    } finally {
      dispatch({ type: PAYMENT_ACTIONS.SET_PROCESSING, payload: false });
    }
  }, [isAuthenticated, user, paymentService, logger]);

  // 🎯 Validate Payment Data
  const validatePaymentData = useCallback((paymentData) => {
    const errors = [];

    if (!paymentData.amount || paymentData.amount !== PAYMENT_CONSTANTS.BUNDLE_PRICE) {
      errors.push('Invalid payment amount');
    }

    if (!paymentData.paymentMethod) {
      errors.push('Payment method is required');
    }

    if (!paymentData.courseId) {
      errors.push('Course selection is required');
    }

    if (paymentData.installmentPlan && !paymentData.installmentTerms) {
      errors.push('Installment terms are required for installment payments');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // 🎯 Get Payment Error Message
  const getPaymentErrorMessage = useCallback((error) => {
    const errorMap = {
      'INSUFFICIENT_FUNDS': 'Insufficient funds in your account',
      'NETWORK_ERROR': 'Network connection failed. Please check your internet',
      'PAYMENT_DECLINED': 'Payment was declined by your bank',
      'TIMEOUT': 'Payment timeout. Please try again',
      'INVALID_CARD': 'Invalid card details',
      'DAILY_LIMIT_EXCEEDED': 'Daily payment limit exceeded'
    };

    return errorMap[error.code] || 'Payment failed. Please try again or use a different method';
  }, []);

  // 🎯 Retry Failed Payment
  const retryPayment = useCallback(async (transactionId) => {
    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_PROCESSING, payload: true });

      const transaction = state.transactions.find(tx => tx.id === transactionId);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const result = await paymentService.retryPayment(transactionId);
      
      dispatch({ 
        type: PAYMENT_ACTIONS.UPDATE_TRANSACTION, 
        payload: { id: transactionId, updates: result.transaction } 
      });

      logger.info('Payment retry successful', { transactionId });

      return result;

    } catch (error) {
      logger.error('Payment retry failed', error, { transactionId });
      throw error;
    } finally {
      dispatch({ type: PAYMENT_ACTIONS.SET_PROCESSING, payload: false });
    }
  }, [state.transactions, paymentService, logger]);

  // 🎯 Request Refund
  const requestRefund = useCallback(async (transactionId, reason) => {
    try {
      const result = await paymentService.requestRefund(transactionId, reason);
      
      dispatch({ 
        type: PAYMENT_ACTIONS.UPDATE_TRANSACTION, 
        payload: { id: transactionId, updates: result.transaction } 
      });

      logger.info('Refund requested successfully', { transactionId, reason });

      return result;

    } catch (error) {
      logger.error('Refund request failed', error, { transactionId, reason });
      throw error;
    }
  }, [paymentService, logger]);

  // 🎯 Calculate Revenue Split
  const calculateRevenueSplit = useCallback((totalAmount, tier = 'STANDARD') => {
    const platformShare = PAYMENT_CONSTANTS.PLATFORM_SHARE;
    const baseExpertShare = PAYMENT_CONSTANTS.EXPERT_SHARE;
    
    const bonusInfo = calculateQualityBonus(baseExpertShare, tier);
    
    return {
      platform: platformShare,
      expert: {
        base: baseExpertShare,
        bonus: bonusInfo.bonusAmount,
        total: bonusInfo.totalAmount
      },
      payoutSchedule: calculatePayoutSchedule(baseExpertShare, tier),
      tier,
      bonusRate: bonusInfo.bonusRate
    };
  }, [calculateQualityBonus, calculatePayoutSchedule]);

  // 🎯 Get Payment Analytics
  const getPaymentAnalytics = useCallback(async () => {
    if (!isAuthenticated || !user) return null;

    try {
      return await paymentService.getPaymentAnalytics(user.id);
    } catch (error) {
      logger.error('Failed to fetch payment analytics', error);
      return null;
    }
  }, [isAuthenticated, user, paymentService, logger]);

  // 🎯 Sync Payment Data
  const syncPaymentData = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      dispatch({ type: PAYMENT_ACTIONS.SET_SYNCING, payload: true });

      // 🎯 Sync transactions
      const transactions = await paymentService.getUserTransactions(user.id);
      dispatch({ 
        type: PAYMENT_ACTIONS.RESTORE_STATE, 
        payload: { transactions } 
      });

      // 🎯 Sync revenue for experts
      if (user.role === 'expert') {
        const revenueData = await paymentService.getRevenueDistribution(user.id);
        dispatch({ 
          type: PAYMENT_ACTIONS.UPDATE_REVENUE_DISTRIBUTION, 
          payload: revenueData 
        });
      }

      dispatch({ type: PAYMENT_ACTIONS.SET_LAST_UPDATED, payload: new Date().toISOString() });
      
      logger.debug('Payment data synced successfully', { userId: user.id });

    } catch (error) {
      logger.error('Payment data sync failed', error);
    } finally {
      dispatch({ type: PAYMENT_ACTIONS.SET_SYNCING, payload: false });
    }
  }, [isAuthenticated, user, paymentService, logger]);

  // 🎯 Clear Payment Error
  const clearError = useCallback(() => {
    dispatch({ type: PAYMENT_ACTIONS.CLEAR_ERROR });
  }, []);

  // 🎯 Reset Payment State
  const resetPayment = useCallback(() => {
    dispatch({ type: PAYMENT_ACTIONS.RESET_PAYMENT });
  }, []);

  // 🎯 Effect: Initialize on mount and auth change
  useEffect(() => {
    if (isAuthenticated && user) {
      initializePayment();
    }
  }, [isAuthenticated, user, initializePayment]);

  // 🎯 Effect: App state change handler for syncing
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && isAuthenticated) {
        syncPaymentData();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, syncPaymentData]);

  // 🎯 Context Value
  const contextValue = {
    // 💰 State
    ...state,
    constants: PAYMENT_CONSTANTS,

    // 🎯 Actions
    processPayment,
    retryPayment,
    requestRefund,
    calculateRevenueSplit,
    getPaymentAnalytics,
    syncPaymentData,
    clearError,
    resetPayment,

    // 💳 Payment Methods
    selectPaymentMethod: (method) => 
      dispatch({ type: PAYMENT_ACTIONS.SELECT_PAYMENT_METHOD, payload: method }),

    // 📱 UI Controls
    setPaymentModalVisible: (visible) => 
      dispatch({ type: PAYMENT_ACTIONS.SET_PAYMENT_MODAL_VISIBLE, payload: visible }),

    // 🎯 Utility Getters
    getTotalRevenue: () => state.revenueDistribution.platform + state.revenueDistribution.expert,
    getPendingPayouts: () => state.payouts.filter(p => p.status === 'pending'),
    getCompletedTransactions: () => state.transactions.filter(t => t.status === 'completed'),
    
    // 🔄 Installment Helpers
    activateInstallment: (plan) => 
      dispatch({ type: PAYMENT_ACTIONS.ACTIVATE_INSTALLMENT, payload: plan })
  };

  return (
    <PaymentContext.Provider value={contextValue}>
      {children}
    </PaymentContext.Provider>
  );
};

// 🎯 Custom Hook for Payment Context
export const usePayment = () => {
  const context = useContext(PaymentContext);
  
  if (!context) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  
  return context;
};

// 🎯 Export Constants for External Use
export { PAYMENT_CONSTANTS, PAYMENT_ACTIONS };

export default PaymentContext;