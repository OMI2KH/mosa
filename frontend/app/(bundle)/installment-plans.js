// bundle/installment-plans.js

/**
 * 🎯 ENTERPRISE INSTALLMENT PLANS SYSTEM
 * Production-ready payment plan management for Mosa Forge
 * Features: Dynamic installment calculations, payment scheduling, risk assessment
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../utils/logger');
const { RiskAssessor } = require('../utils/risk-assessor');
const { PaymentCalculator } = require('../utils/payment-calculator');
const { RateLimiterRedis } = require('rate-limiter-flexible');

class InstallmentPlans extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('InstallmentPlans');
    this.riskAssessor = new RiskAssessor();
    this.paymentCalculator = new PaymentCalculator();
    
    // Rate limiting: max 5 plan creations per hour per user
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (req) => `installment_limit:${req.studentId}`,
      points: 5,
      duration: 3600,
    });

    this.BUNDLE_PRICE = 1999; // ETB
    this.initialize();
  }

  /**
   * Initialize installment system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.loadPlanTemplates();
      this.logger.info('Installment plans system initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize installment system', error);
      throw error;
    }
  }

  /**
   * 🎯 AVAILABLE INSTALLMENT PLANS
   */
  getAvailablePlans() {
    return {
      STANDARD: {
        id: 'standard_3_month',
        name: 'Standard 3-Month Plan',
        duration: 3, // months
        installmentCount: 3,
        downPayment: 666, // ETB
        monthlyPayment: 666, // ETB
        totalAmount: 1998, // ETB
        interest: 0,
        processingFee: 0,
        eligibility: {
          minCreditScore: 0,
          requiredDocuments: ['fayda_id'],
          maxActivePlans: 1
        },
        features: [
          '0% Interest',
          'No Processing Fees',
          'Flexible Payment Dates',
          'Auto-Debit Available'
        ]
      },
      EXTENDED: {
        id: 'extended_6_month',
        name: 'Extended 6-Month Plan',
        duration: 6, // months
        installmentCount: 6,
        downPayment: 333, // ETB
        monthlyPayment: 333, // ETB
        totalAmount: 1998, // ETB
        interest: 0,
        processingFee: 50, // ETB
        eligibility: {
          minCreditScore: 500,
          requiredDocuments: ['fayda_id', 'proof_of_income'],
          maxActivePlans: 1
        },
        features: [
          '0% Interest',
          'Small Monthly Payments',
          'Income Verification Required',
          'Credit Score Check'
        ]
      },
      ENTERPRISE: {
        id: 'enterprise_12_month',
        name: 'Enterprise 12-Month Plan',
        duration: 12, // months
        installmentCount: 12,
        downPayment: 166, // ETB
        monthlyPayment: 166, // ETB
        totalAmount: 1992, // ETB
        interest: 0,
        processingFee: 100, // ETB
        eligibility: {
          minCreditScore: 650,
          requiredDocuments: ['fayda_id', 'proof_of_income', 'bank_statement'],
          maxActivePlans: 1
        },
        features: [
          '0% Interest',
          'Lowest Monthly Payments',
          'Full Financial Verification',
          'Priority Support'
        ]
      },
      CUSTOM: {
        id: 'custom_plan',
        name: 'Custom Payment Plan',
        duration: null, // customizable
        installmentCount: null,
        downPayment: null,
        monthlyPayment: null,
        totalAmount: 1999, // ETB
        interest: 0,
        processingFee: 0,
        eligibility: {
          minCreditScore: 700,
          requiredDocuments: ['fayda_id', 'proof_of_income', 'bank_statement', 'collateral'],
          maxActivePlans: 1
        },
        features: [
          'Fully Customizable Terms',
          'Personalized Payment Schedule',
          'Financial Advisor Support',
          'Flexible Collateral Options'
        ]
      }
    };
  }

  /**
   * 🎯 GET ELIGIBLE PLANS FOR STUDENT
   */
  async getEligiblePlans(studentId, enrollmentData = {}) {
    const startTime = performance.now();

    try {
      // 🛡️ VALIDATION
      await this.validateStudentEligibility(studentId);

      // 🔍 RISK ASSESSMENT
      const riskProfile = await this.assessStudentRisk(studentId, enrollmentData);

      // 📊 PLAN ELIGIBILITY CALCULATION
      const eligiblePlans = await this.calculateEligiblePlans(riskProfile, enrollmentData);

      // 💾 CACHE RESULTS
      await this.cacheEligiblePlans(studentId, eligiblePlans);

      const processingTime = performance.now() - startTime;
      this.logger.metric('eligibility_check_time', processingTime, { studentId });

      return {
        success: true,
        studentId,
        riskProfile,
        eligiblePlans,
        recommendedPlan: this.getRecommendedPlan(eligiblePlans, riskProfile),
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Eligible plans check failed', error, { studentId });
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE STUDENT ELIGIBILITY
   */
  async validateStudentEligibility(studentId) {
    if (!studentId) {
      throw new Error('MISSING_STUDENT_ID');
    }

    // Check if student exists and is active
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        status: true,
        faydaId: true,
        creditScore: true,
        activeInstallments: true
      }
    });

    if (!student) {
      throw new Error('STUDENT_NOT_FOUND');
    }

    if (student.status !== 'ACTIVE') {
      throw new Error('STUDENT_NOT_ACTIVE');
    }

    if (!student.faydaId) {
      throw new Error('FAYDA_ID_REQUIRED');
    }

    // Check for existing active installments
    const activePlans = await this.prisma.installmentPlan.count({
      where: {
        studentId,
        status: { in: ['ACTIVE', 'PENDING'] }
      }
    });

    if (activePlans >= 1) {
      throw new Error('MAX_ACTIVE_PLANS_EXCEEDED');
    }

    this.logger.debug('Student eligibility validated', { studentId });
  }

  /**
   * 🔍 COMPREHENSIVE RISK ASSESSMENT
   */
  async assessStudentRisk(studentId, enrollmentData) {
    let riskScore = 500; // Base score

    // 1. Credit History Check
    const creditHistory = await this.getCreditHistory(studentId);
    riskScore += creditHistory.adjustment;

    // 2. Payment Behavior Analysis
    const paymentBehavior = await this.analyzePaymentBehavior(studentId);
    riskScore += paymentBehavior.adjustment;

    // 3. Income Verification
    const incomeAssessment = await this.assessIncome(enrollmentData.incomeProof);
    riskScore += incomeAssessment.adjustment;

    // 4. Employment Stability
    const employmentStability = await this.assessEmployment(enrollmentData.employment);
    riskScore += employmentStability.adjustment;

    // 5. Previous Platform Behavior
    const platformBehavior = await this.analyzePlatformBehavior(studentId);
    riskScore += platformBehavior.adjustment;

    // Ensure score stays within bounds
    riskScore = Math.max(300, Math.min(850, riskScore));

    const riskProfile = {
      score: riskScore,
      tier: this.getRiskTier(riskScore),
      factors: {
        creditHistory,
        paymentBehavior,
        incomeAssessment,
        employmentStability,
        platformBehavior
      },
      recommendations: this.generateRiskRecommendations(riskScore)
    };

    this.logger.debug('Risk assessment completed', { studentId, riskScore, tier: riskProfile.tier });

    return riskProfile;
  }

  /**
   * 📊 CALCULATE ELIGIBLE PLANS
   */
  async calculateEligiblePlans(riskProfile, enrollmentData) {
    const allPlans = this.getAvailablePlans();
    const eligiblePlans = {};

    Object.entries(allPlans).forEach(([planKey, plan]) => {
      if (this.isPlanEligible(plan, riskProfile, enrollmentData)) {
        eligiblePlans[planKey] = {
          ...plan,
          eligibilityScore: this.calculateEligibilityScore(plan, riskProfile),
          recommended: this.isPlanRecommended(plan, riskProfile),
          approvalProbability: this.calculateApprovalProbability(plan, riskProfile)
        };
      }
    });

    // Sort by eligibility score (descending)
    return Object.entries(eligiblePlans)
      .sort(([, a], [, b]) => b.eligibilityScore - a.eligibilityScore)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
  }

  /**
   * 🎯 CREATE INSTALLMENT PLAN
   */
  async createInstallmentPlan(planData) {
    const startTime = performance.now();

    try {
      const {
        studentId,
        planType,
        customTerms,
        paymentMethod,
        autoDebit = false
      } = planData;

      // 🛡️ VALIDATION
      await this.validatePlanCreation(studentId, planType, customTerms);

      // 💰 PAYMENT SCHEDULE GENERATION
      const paymentSchedule = await this.generatePaymentSchedule(planType, customTerms);

      // 🔐 RISK ASSESSMENT
      const riskAssessment = await this.assessStudentRisk(studentId, planData);

      // 📝 PLAN CREATION TRANSACTION
      const installmentPlan = await this.createPlanTransaction(
        studentId,
        planType,
        paymentSchedule,
        riskAssessment,
        paymentMethod,
        autoDebit
      );

      // 🔔 NOTIFICATIONS
      await this.sendPlanConfirmation(installmentPlan);

      const processingTime = performance.now() - startTime;
      this.logger.metric('plan_creation_time', processingTime, { studentId, planType });

      return {
        success: true,
        planId: installmentPlan.id,
        paymentSchedule: installmentPlan.paymentSchedule,
        nextPayment: installmentPlan.nextPaymentDue,
        riskAssessment: installmentPlan.riskTier,
        processingTime: `${processingTime.toFixed(2)}ms`
      };

    } catch (error) {
      this.logger.error('Installment plan creation failed', error, { studentId: planData.studentId });
      throw error;
    }
  }

  /**
   * 💰 GENERATE PAYMENT SCHEDULE
   */
  async generatePaymentSchedule(planType, customTerms = null) {
    const plans = this.getAvailablePlans();
    const plan = plans[planType];

    if (!plan) {
      throw new Error('INVALID_PLAN_TYPE');
    }

    if (planType === 'CUSTOM' && !customTerms) {
      throw new Error('CUSTOM_TERMS_REQUIRED');
    }

    const schedule = [];
    const startDate = new Date();
    let remainingAmount = this.BUNDLE_PRICE;

    if (planType === 'CUSTOM') {
      return this.generateCustomSchedule(customTerms, startDate);
    }

    // Add down payment
    if (plan.downPayment > 0) {
      schedule.push({
        sequence: 1,
        amount: plan.downPayment,
        dueDate: startDate,
        type: 'DOWN_PAYMENT',
        status: 'PENDING'
      });
      remainingAmount -= plan.downPayment;
    }

    // Add monthly installments
    const monthlyAmount = remainingAmount / plan.installmentCount;
    for (let i = 0; i < plan.installmentCount; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i + 1);

      schedule.push({
        sequence: i + 2,
        amount: Math.round(monthlyAmount),
        dueDate,
        type: 'INSTALLMENT',
        status: 'PENDING'
      });
    }

    // Add processing fee if applicable
    if (plan.processingFee > 0) {
      schedule.push({
        sequence: schedule.length + 1,
        amount: plan.processingFee,
        dueDate: startDate,
        type: 'PROCESSING_FEE',
        status: 'PENDING'
      });
    }

    return schedule;
  }

  /**
   * 🎛️ GENERATE CUSTOM SCHEDULE
   */
  generateCustomSchedule(customTerms, startDate) {
    const {
      downPayment,
      installmentCount,
      installmentAmount,
      paymentFrequency, // 'weekly', 'bi-weekly', 'monthly'
      startDelay = 0 // days
    } = customTerms;

    const schedule = [];
    let sequence = 1;
    let remainingAmount = this.BUNDLE_PRICE;

    // Validate custom terms
    if (downPayment + (installmentCount * installmentAmount) !== this.BUNDLE_PRICE) {
      throw new Error('INVALID_CUSTOM_TERMS');
    }

    // Add down payment
    if (downPayment > 0) {
      const downPaymentDate = new Date(startDate);
      downPaymentDate.setDate(downPaymentDate.getDate() + startDelay);

      schedule.push({
        sequence: sequence++,
        amount: downPayment,
        dueDate: downPaymentDate,
        type: 'DOWN_PAYMENT',
        status: 'PENDING'
      });
      remainingAmount -= downPayment;
    }

    // Add installments based on frequency
    for (let i = 0; i < installmentCount; i++) {
      const dueDate = new Date(startDate);
      
      switch (paymentFrequency) {
        case 'weekly':
          dueDate.setDate(dueDate.getDate() + startDelay + ((i + 1) * 7));
          break;
        case 'bi-weekly':
          dueDate.setDate(dueDate.getDate() + startDelay + ((i + 1) * 14));
          break;
        case 'monthly':
          dueDate.setMonth(dueDate.getMonth() + i + 1);
          dueDate.setDate(dueDate.getDate() + startDelay);
          break;
        default:
          throw new Error('INVALID_PAYMENT_FREQUENCY');
      }

      schedule.push({
        sequence: sequence++,
        amount: installmentAmount,
        dueDate,
        type: 'INSTALLMENT',
        status: 'PENDING'
      });
    }

    return schedule;
  }

  /**
   * 📝 CREATE PLAN TRANSACTION
   */
  async createPlanTransaction(studentId, planType, paymentSchedule, riskAssessment, paymentMethod, autoDebit) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Create installment plan
      const installmentPlan = await tx.installmentPlan.create({
        data: {
          studentId,
          planType,
          bundlePrice: this.BUNDLE_PRICE,
          totalAmount: this.calculateTotalAmount(planType),
          downPayment: this.getDownPaymentAmount(planType),
          installmentCount: paymentSchedule.filter(p => p.type === 'INSTALLMENT').length,
          paymentSchedule,
          riskTier: riskAssessment.tier,
          riskScore: riskAssessment.score,
          status: 'PENDING_APPROVAL',
          paymentMethod,
          autoDebitEnabled: autoDebit,
          metadata: {
            createdAt: new Date().toISOString(),
            riskFactors: riskAssessment.factors,
            approvalProbability: riskAssessment.score / 850
          }
        }
      });

      // 2. Create payment records
      const paymentRecords = await this.createPaymentRecords(installmentPlan.id, paymentSchedule, tx);

      // 3. Update student credit profile
      await tx.student.update({
        where: { id: studentId },
        data: {
          creditScore: riskAssessment.score,
          activeInstallments: { increment: 1 },
          lastCreditCheck: new Date()
        }
      });

      // 4. Cache plan details
      await this.cachePlanDetails(installmentPlan.id, installmentPlan);

      return {
        ...installmentPlan,
        paymentRecords
      };
    }, {
      maxWait: 5000,
      timeout: 10000
    });
  }

  /**
   * 💳 CREATE PAYMENT RECORDS
   */
  async createPaymentRecords(planId, paymentSchedule, transaction) {
    const paymentRecords = [];

    for (const payment of paymentSchedule) {
      const record = await transaction.payment.create({
        data: {
          installmentPlanId: planId,
          amount: payment.amount,
          dueDate: payment.dueDate,
          sequence: payment.sequence,
          type: payment.type,
          status: 'PENDING',
          metadata: {
            scheduled: true,
            autoDebitEligible: payment.type !== 'DOWN_PAYMENT'
          }
        }
      });
      paymentRecords.push(record);
    }

    return paymentRecords;
  }

  /**
   * 🔍 VALIDATE PLAN CREATION
   */
  async validatePlanCreation(studentId, planType, customTerms) {
    // Rate limiting
    try {
      await this.rateLimiter.consume(`student:${studentId}`);
    } catch (rateLimitError) {
      throw new Error('PLAN_CREATION_LIMIT_EXCEEDED');
    }

    // Plan type validation
    const availablePlans = this.getAvailablePlans();
    if (!availablePlans[planType]) {
      throw new Error('INVALID_PLAN_TYPE');
    }

    // Custom terms validation
    if (planType === 'CUSTOM') {
      this.validateCustomTerms(customTerms);
    }

    // Student eligibility re-check
    await this.validateStudentEligibility(studentId);

    this.logger.debug('Plan creation validation passed', { studentId, planType });
  }

  /**
   * 🛡️ VALIDATE CUSTOM TERMS
   */
  validateCustomTerms(customTerms) {
    const { downPayment, installmentCount, installmentAmount, paymentFrequency } = customTerms;

    if (!downPayment || !installmentCount || !installmentAmount || !paymentFrequency) {
      throw new Error('MISSING_CUSTOM_TERMS');
    }

    if (downPayment < 100) {
      throw new Error('MIN_DOWN_PAYMENT_100_ETB');
    }

    if (installmentCount < 2 || installmentCount > 24) {
      throw new Error('INSTALLMENT_COUNT_OUT_OF_RANGE');
    }

    if (installmentAmount < 50) {
      throw new Error('MIN_INSTALLMENT_50_ETB');
    }

    if (!['weekly', 'bi-weekly', 'monthly'].includes(paymentFrequency)) {
      throw new Error('INVALID_PAYMENT_FREQUENCY');
    }

    // Validate total amount
    const total = downPayment + (installmentCount * installmentAmount);
    if (total !== this.BUNDLE_PRICE) {
      throw new Error('TOTAL_AMOUNT_MISMATCH');
    }
  }

  /**
   * 📊 CALCULATE TOTAL AMOUNT
   */
  calculateTotalAmount(planType) {
    const plans = this.getAvailablePlans();
    const plan = plans[planType];
    return plan.totalAmount + (plan.processingFee || 0);
  }

  /**
   * 💰 GET DOWN PAYMENT AMOUNT
   */
  getDownPaymentAmount(planType) {
    const plans = this.getAvailablePlans();
    return plans[planType].downPayment || 0;
  }

  /**
   * 🎯 GET RECOMMENDED PLAN
   */
  getRecommendedPlan(eligiblePlans, riskProfile) {
    const plans = Object.values(eligiblePlans);
    
    if (plans.length === 0) {
      return null;
    }

    // Prefer plans with highest eligibility score
    return plans.reduce((best, current) => 
      current.eligibilityScore > best.eligibilityScore ? current : best
    );
  }

  /**
   * ✅ CHECK PLAN ELIGIBILITY
   */
  isPlanEligible(plan, riskProfile, enrollmentData) {
    // Check minimum credit score
    if (riskProfile.score < plan.eligibility.minCreditScore) {
      return false;
    }

    // Check document requirements
    const hasRequiredDocuments = this.checkDocumentRequirements(
      plan.eligibility.requiredDocuments,
      enrollmentData.documents
    );

    if (!hasRequiredDocuments) {
      return false;
    }

    return true;
  }

  /**
   * 📄 CHECK DOCUMENT REQUIREMENTS
   */
  checkDocumentRequirements(requiredDocs, providedDocs = []) {
    if (!Array.isArray(providedDocs)) {
      return false;
    }

    return requiredDocs.every(requiredDoc => 
      providedDocs.includes(requiredDoc)
    );
  }

  /**
   * 📈 CALCULATE ELIGIBILITY SCORE
   */
  calculateEligibilityScore(plan, riskProfile) {
    let score = 100; // Base score

    // Credit score factor (40%)
    const creditWeight = 0.4;
    const creditScore = (riskProfile.score / 850) * 100;
    score += creditScore * creditWeight;

    // Plan risk factor (30%)
    const riskWeight = 0.3;
    const planRisk = this.calculatePlanRisk(plan);
    score += (100 - planRisk) * riskWeight;

    // Document completeness (20%)
    const docWeight = 0.2;
    const docScore = plan.eligibility.requiredDocuments.length > 2 ? 80 : 100;
    score += docScore * docWeight;

    // Historical performance (10%)
    const historyWeight = 0.1;
    score += 90 * historyWeight; // Default good history

    return Math.min(100, Math.max(0, score));
  }
} // end class InstallmentPlans

module.exports = InstallmentPlans;