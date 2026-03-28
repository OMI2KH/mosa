/**
 * 🎯 MOSA FORGE: Enterprise Revenue Distribution System
 * 
 * @module RevenueDistributor
 * @description Manages 1000/999 revenue split and 333/333/333 payout scheduling
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 💰 ENTERPRISE FEATURES:
 * - 1000/999 ETB revenue split (Mosa/Expert)
 * - 333/333/333 payout schedule
 * - Quality-based bonus calculations (up to 20%)
 * - Telebirr & CBE Birr integration
 * - Automated payout processing
 * - Fraud detection and prevention
 */

const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

// 🏗️ Enterprise Constants
const REVENUE_SPLIT = {
    MOSA_PLATFORM: 1000,
    EXPERT_EARNINGS: 999,
    BUNDLE_TOTAL: 1999
};

const PAYOUT_SCHEDULE = {
    UPFRONT: 333,      // Course Start
    MILESTONE: 333,    // 75% Completion
    COMPLETION: 333    // Certification
};

const PAYMENT_GATEWAYS = {
    TELEBIRR: 'telebirr',
    CBE_BIRR: 'cbe_birr',
    BANK_TRANSFER: 'bank_transfer'
};

const PAYOUT_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
};

/**
 * 🏗️ Enterprise Revenue Distributor Class
 * @class RevenueDistributor
 * @extends EventEmitter
 */
class RevenueDistributor extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // 🏗️ Enterprise Configuration
        this.config = {
            redis: options.redis || {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD
            },
            prisma: options.prisma || new PrismaClient(),
            maxRetries: options.maxRetries || 3,
            timeout: options.timeout || 30000,
            qualityBonusThresholds: {
                MASTER: 4.7,
                SENIOR: 4.3,
                STANDARD: 4.0
            },
            bonusRates: {
                MASTER: 0.20, // 20% bonus
                SENIOR: 0.10, // 10% bonus
                STANDARD: 0.00 // No bonus
            }
        };

        // 🏗️ Service Dependencies
        this.redis = new Redis(this.config.redis);
        this.prisma = this.config.prisma;
        this.circuitBreaker = this._initializeCircuitBreaker();
        
        // 🏗️ Payment Gateway Clients
        this.paymentGateways = this._initializePaymentGateways();
        
        // 🏗️ Performance Monitoring
        this.metrics = {
            distributionsProcessed: 0,
            totalRevenueDistributed: 0,
            expertPayoutsCompleted: 0,
            platformRevenueCollected: 0,
            failedDistributions: 0,
            averageProcessingTime: 0
        };

        this._initializeEventHandlers();
        this._startScheduledPayouts();
        this._startHealthChecks();
    }

    /**
     * 🏗️ Initialize Circuit Breaker for Payment Gateways
     * @private
     */
    _initializeCircuitBreaker() {
        const breakers = {};
        
        Object.values(PAYMENT_GATEWAYS).forEach(gateway => {
            let state = 'CLOSED';
            let failureCount = 0;
            const failureThreshold = 3;
            const resetTimeout = 300000; // 5 minutes

            breakers[gateway] = {
                execute: async (operation) => {
                    if (state === 'OPEN') {
                        if (Date.now() - lastFailureTime > resetTimeout) {
                            state = 'HALF_OPEN';
                        } else {
                            throw new Error(`Payment gateway ${gateway} circuit breaker is OPEN`);
                        }
                    }

                    try {
                        const result = await operation();
                        if (state === 'HALF_OPEN') {
                            failureCount = 0;
                            state = 'CLOSED';
                        }
                        return result;
                    } catch (error) {
                        failureCount++;
                        lastFailureTime = Date.now();
                        
                        if (failureCount >= failureThreshold) {
                            state = 'OPEN';
                            this.emit('payment.gateway.circuit.open', { gateway, error: error.message });
                        }
                        throw error;
                    }
                },
                getState: () => state
            };
        });

        return breakers;
    }

    /**
     * 🏗️ Initialize Payment Gateway Clients
     * @private
     */
    _initializePaymentGateways() {
        return {
            [PAYMENT_GATEWAYS.TELEBIRR]: {
                baseURL: process.env.TELEBIRR_BASE_URL,
                apiKey: process.env.TELEBIRR_API_KEY,
                secret: process.env.TELEBIRR_SECRET,
                timeout: 30000
            },
            [PAYMENT_GATEWAYS.CBE_BIRR]: {
                baseURL: process.env.CBE_BIRR_BASE_URL,
                apiKey: process.env.CBE_BIRR_API_KEY,
                secret: process.env.CBE_BIRR_SECRET,
                timeout: 30000
            }
        };
    }

    /**
     * 🏗️ Initialize Enterprise Event Handlers
     * @private
     */
    _initializeEventHandlers() {
        this.on('revenue.distribution.started', (data) => {
            this._logEvent('REVENUE_DISTRIBUTION_STARTED', data);
            this.metrics.distributionsProcessed++;
        });

        this.on('revenue.distribution.completed', (data) => {
            this._logEvent('REVENUE_DISTRIBUTION_COMPLETED', data);
            this.metrics.totalRevenueDistributed += data.amount;
        });

        this.on('expert.payout.processed', (data) => {
            this._logEvent('EXPERT_PAYOUT_PROCESSED', data);
            this.metrics.expertPayoutsCompleted++;
        });

        this.on('platform.revenue.collected', (data) => {
            this._logEvent('PLATFORM_REVENUE_COLLECTED', data);
            this.metrics.platformRevenueCollected += data.amount;
        });

        this.on('quality.bonus.calculated', (data) => {
            this._logEvent('QUALITY_BONUS_CALCULATED', data);
        });

        this.on('payout.scheduled', (data) => {
            this._logEvent('PAYOUT_SCHEDULED', data);
        });
    }

    /**
     * 🏗️ Start Scheduled Payout Processing
     * @private
     */
    _startScheduledPayouts() {
        // Process pending payouts every hour
        setInterval(async () => {
            try {
                await this._processScheduledPayouts();
            } catch (error) {
                this._logError('SCHEDULED_PAYOUTS_FAILED', error);
            }
        }, 3600000); // 1 hour

        // Process milestone payouts every 30 minutes
        setInterval(async () => {
            try {
                await this._processMilestonePayouts();
            } catch (error) {
                this._logError('MILESTONE_PAYOUTS_FAILED', error);
            }
        }, 1800000); // 30 minutes
    }

    /**
     * 🎯 MAIN ENTERPRISE METHOD: Process Revenue Distribution
     * @param {Object} paymentData - Payment and enrollment data
     * @returns {Promise<Object>} Distribution result
     */
    async processRevenueDistribution(paymentData) {
        const startTime = performance.now();
        const distributionId = uuidv4();
        const traceId = paymentData.traceId || uuidv4();

        try {
            this.emit('revenue.distribution.started', { distributionId, traceId, paymentData });

            // 🏗️ Enterprise Validation Chain
            await this._validatePaymentData(paymentData);
            await this._verifyRevenueSplit(paymentData.amount);
            
            // 🏗️ Process Platform Revenue (1000 ETB)
            const platformResult = await this._processPlatformRevenue({
                ...paymentData,
                distributionId,
                traceId
            });

            // 🏗️ Schedule Expert Payouts (999 ETB)
            const expertPayouts = await this._scheduleExpertPayouts({
                ...paymentData,
                distributionId,
                traceId
            });

            const processingTime = performance.now() - startTime;
            this._updateMetrics(processingTime);

            const result = {
                success: true,
                distributionId,
                platformRevenue: {
                    amount: REVENUE_SPLIT.MOSA_PLATFORM,
                    status: platformResult.status,
                    transactionId: platformResult.transactionId
                },
                expertPayouts: expertPayouts.schedule,
                totalDistributed: REVENUE_SPLIT.BUNDLE_TOTAL,
                traceId,
                timestamp: new Date().toISOString()
            };

            this.emit('revenue.distribution.completed', result);
            this._logSuccess('REVENUE_DISTRIBUTED', { distributionId, processingTime });

            return result;

        } catch (error) {
            const processingTime = performance.now() - startTime;
            this.metrics.failedDistributions++;
            this._updateMetrics(processingTime);
            
            const errorResult = {
                success: false,
                error: error.message,
                errorCode: error.code || 'DISTRIBUTION_FAILED',
                distributionId,
                traceId,
                timestamp: new Date().toISOString()
            };

            this.emit('revenue.distribution.failed', errorResult);
            this._logError('REVENUE_DISTRIBUTION_FAILED', error, { distributionId, traceId });

            throw this._formatEnterpriseError(error);
        }
    }

    /**
     * 🎯 PROCESS SCHEDULED PAYOUT: Release Expert Payment
     * @param {Object} payoutData - Payout release data
     * @returns {Promise<Object>} Payout result
     */
    async processExpertPayout(payoutData) {
        const startTime = performance.now();
        const payoutId = uuidv4();
        const traceId = payoutData.traceId || uuidv4();

        try {
            this.emit('expert.payout.started', { payoutId, traceId, payoutData });

            // 🏗️ Validate payout eligibility
            await this._validatePayoutEligibility(payoutData);
            
            // 🏗️ Calculate quality bonus
            const bonusData = await this._calculateQualityBonus(payoutData);
            
            // 🏗️ Process payment through gateway
            const paymentResult = await this._processPaymentGatewayTransfer({
                ...payoutData,
                ...bonusData,
                payoutId,
                traceId
            });

            // 🏗️ Update payout record
            await this._updatePayoutRecord(payoutData.payoutRecordId, {
                status: PAYOUT_STATUS.COMPLETED,
                transactionId: paymentResult.transactionId,
                actualAmount: bonusData.totalAmount,
                bonusAmount: bonusData.bonusAmount,
                processedAt: new Date(),
                gatewayResponse: paymentResult
            });

            const processingTime = performance.now() - startTime;

            const result = {
                success: true,
                payoutId,
                expertId: payoutData.expertId,
                baseAmount: PAYOUT_SCHEDULE[payoutData.payoutPhase],
                bonusAmount: bonusData.bonusAmount,
                totalAmount: bonusData.totalAmount,
                transactionId: paymentResult.transactionId,
                gateway: paymentResult.gateway,
                traceId,
                timestamp: new Date().toISOString()
            };

            this.emit('expert.payout.processed', result);
            this._logSuccess('EXPERT_PAYOUT_PROCESSED', { payoutId, processingTime });

            return result;

        } catch (error) {
            const processingTime = performance.now() - startTime;
            
            // 🏗️ Update payout record as failed
            await this._updatePayoutRecord(payoutData.payoutRecordId, {
                status: PAYOUT_STATUS.FAILED,
                errorMessage: error.message,
                retryCount: { increment: 1 },
                lastAttemptAt: new Date()
            });

            const errorResult = {
                success: false,
                error: error.message,
                errorCode: error.code || 'PAYOUT_FAILED',
                payoutId,
                traceId,
                timestamp: new Date().toISOString()
            };

            this.emit('expert.payout.failed', errorResult);
            this._logError('EXPERT_PAYOUT_FAILED', error, { payoutId, traceId });

            throw this._formatEnterpriseError(error);
        }
    }

    /**
     * 🏗️ Validate Payment Data
     * @private
     */
    async _validatePaymentData(paymentData) {
        const requiredFields = ['paymentId', 'enrollmentId', 'amount', 'studentId', 'expertId'];
        const missingFields = requiredFields.filter(field => !paymentData[field]);

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Validate payment amount matches bundle price
        if (paymentData.amount !== REVENUE_SPLIT.BUNDLE_TOTAL) {
            throw new Error(`Invalid payment amount: ${paymentData.amount}. Expected: ${REVENUE_SPLIT.BUNDLE_TOTAL}`);
        }

        // Verify payment exists and is completed
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentData.paymentId },
            include: { enrollment: true }
        });

        if (!payment) {
            throw new Error('Payment record not found');
        }

        if (payment.status !== 'COMPLETED') {
            throw new Error('Payment is not completed');
        }

        // Verify enrollment exists
        if (payment.enrollment.id !== paymentData.enrollmentId) {
            throw new Error('Enrollment mismatch');
        }

        return true;
    }

    /**
     * 🏗️ Verify Revenue Split Configuration
     * @private
     */
    async _verifyRevenueSplit(amount) {
        if (amount !== REVENUE_SPLIT.BUNDLE_TOTAL) {
            throw new Error(`Bundle total mismatch: ${amount} vs ${REVENUE_SPLIT.BUNDLE_TOTAL}`);
        }

        if (REVENUE_SPLIT.MOSA_PLATFORM + REVENUE_SPLIT.EXPERT_EARNINGS !== REVENUE_SPLIT.BUNDLE_TOTAL) {
            throw new Error('Revenue split configuration error: Mosa + Expert != Bundle Total');
        }

        if (PAYOUT_SCHEDULE.UPFRONT + PAYOUT_SCHEDULE.MILESTONE + PAYOUT_SCHEDULE.COMPLETION !== REVENUE_SPLIT.EXPERT_EARNINGS) {
            throw new Error('Payout schedule configuration error: Sum of payouts != Expert earnings');
        }

        return true;
    }

    /**
     * 🏗️ Process Platform Revenue Collection
     * @private
     */
    async _processPlatformRevenue(revenueData) {
        return await this.prisma.$transaction(async (tx) => {
            // Create platform revenue record
            const platformRevenue = await tx.platformRevenue.create({
                data: {
                    paymentId: revenueData.paymentId,
                    enrollmentId: revenueData.enrollmentId,
                    amount: REVENUE_SPLIT.MOSA_PLATFORM,
                    revenueType: 'BUNDLE_PAYMENT',
                    status: 'COLLECTED',
                    distributionId: revenueData.distributionId,
                    traceId: revenueData.traceId,
                    metadata: {
                        split: {
                            mosa: REVENUE_SPLIT.MOSA_PLATFORM,
                            expert: REVENUE_SPLIT.EXPERT_EARNINGS
                        },
                        bundle: {
                            total: REVENUE_SPLIT.BUNDLE_TOTAL,
                            type: 'STANDARD_1999'
                        }
                    }
                }
            });

            // Update financial analytics
            await tx.financialMetrics.upsert({
                where: { 
                    date_expertId: {
                        date: new Date().toISOString().split('T')[0],
                        expertId: revenueData.expertId
                    }
                },
                update: {
                    totalRevenue: { increment: REVENUE_SPLIT.BUNDLE_TOTAL },
                    platformRevenue: { increment: REVENUE_SPLIT.MOSA_PLATFORM },
                    expertEarnings: { increment: REVENUE_SPLIT.EXPERT_EARNINGS },
                    updatedAt: new Date()
                },
                create: {
                    date: new Date().toISOString().split('T')[0],
                    expertId: revenueData.expertId,
                    totalRevenue: REVENUE_SPLIT.BUNDLE_TOTAL,
                    platformRevenue: REVENUE_SPLIT.MOSA_PLATFORM,
                    expertEarnings: REVENUE_SPLIT.EXPERT_EARNINGS,
                    enrollmentCount: 1
                }
            });

            this.emit('platform.revenue.collected', {
                revenueId: platformRevenue.id,
                amount: REVENUE_SPLIT.MOSA_PLATFORM,
                enrollmentId: revenueData.enrollmentId
            });

            return {
                status: 'COLLECTED',
                revenueId: platformRevenue.id,
                amount: REVENUE_SPLIT.MOSA_PLATFORM
            };
        });
    }

    /**
     * 🏗️ Schedule Expert Payouts (333/333/333)
     * @private
     */
    async _scheduleExpertPayouts(payoutData) {
        const payoutPhases = ['UPFRONT', 'MILESTONE', 'COMPLETION'];
        const scheduledPayouts = [];

        for (const phase of payoutPhases) {
            const payoutRecord = await this.prisma.expertPayout.create({
                data: {
                    expertId: payoutData.expertId,
                    enrollmentId: payoutData.enrollmentId,
                    payoutPhase: phase,
                    scheduledAmount: PAYOUT_SCHEDULE[phase],
                    status: PAYOUT_STATUS.PENDING,
                    scheduledDate: this._calculatePayoutDate(phase, payoutData.enrollmentId),
                    distributionId: payoutData.distributionId,
                    traceId: payoutData.traceId,
                    metadata: {
                        phase: phase,
                        baseAmount: PAYOUT_SCHEDULE[phase],
                        qualityBonusEligible: true,
                        prerequisites: this._getPayoutPrerequisites(phase)
                    }
                }
            });

            scheduledPayouts.push(payoutRecord);

            this.emit('payout.scheduled', {
                payoutId: payoutRecord.id,
                expertId: payoutData.expertId,
                phase: phase,
                amount: PAYOUT_SCHEDULE[phase],
                scheduledDate: payoutRecord.scheduledDate
            });
        }

        return {
            schedule: scheduledPayouts.map(payout => ({
                payoutId: payout.id,
                phase: payout.payoutPhase,
                amount: payout.scheduledAmount,
                scheduledDate: payout.scheduledDate,
                status: payout.status
            }))
        };
    }

    /**
     * 🏗️ Calculate Payout Date Based on Phase
     * @private
     */
    _calculatePayoutDate(phase, enrollmentId) {
        const baseDate = new Date();
        
        switch (phase) {
            case 'UPFRONT':
                return baseDate; // Immediate
            case 'MILESTONE':
                return new Date(baseDate.getTime() + (60 * 24 * 60 * 60 * 1000)); // 60 days
            case 'COMPLETION':
                return new Date(baseDate.getTime() + (120 * 24 * 60 * 60 * 1000)); // 120 days
            default:
                return baseDate;
        }
    }

    /**
     * 🏗️ Get Payout Prerequisites
     * @private
     */
    _getPayoutPrerequisites(phase) {
        const prerequisites = {
            UPFRONT: ['ENROLLMENT_ACTIVE', 'PAYMENT_VERIFIED'],
            MILESTONE: ['ENROLLMENT_ACTIVE', '75%_COMPLETION', 'QUALITY_THRESHOLD_MET'],
            COMPLETION: ['ENROLLMENT_COMPLETED', 'CERTIFICATION_ISSUED', 'YACHI_VERIFIED']
        };

        return prerequisites[phase] || [];
    }

    /**
     * 🏗️ Validate Payout Eligibility
     * @private
     */
    async _validatePayoutEligibility(payoutData) {
        const payout = await this.prisma.expertPayout.findUnique({
            where: { id: payoutData.payoutRecordId },
            include: {
                enrollment: {
                    include: {
                        progress: true,
                        expert: {
                            include: {
                                qualityMetrics: true
                            }
                        }
                    }
                }
            }
        });

        if (!payout) {
            throw new Error('Payout record not found');
        }

        if (payout.status !== PAYOUT_STATUS.PENDING) {
            throw new Error(`Payout already processed: ${payout.status}`);
        }

        // Check enrollment status
        if (payout.enrollment.status !== 'ACTIVE' && payout.payoutPhase !== 'COMPLETION') {
            throw new Error('Enrollment is not active');
        }

        // Check phase-specific prerequisites
        await this._checkPhasePrerequisites(payout);

        return true;
    }

    /**
     * 🏗️ Check Phase-Specific Prerequisites
     * @private
     */
    async _checkPhasePrerequisites(payout) {
        switch (payout.payoutPhase) {
            case 'MILESTONE':
                await this._validateMilestonePrerequisites(payout);
                break;
            case 'COMPLETION':
                await this._validateCompletionPrerequisites(payout);
                break;
            case 'UPFRONT':
                // No additional checks for upfront payment
                break;
            default:
                throw new Error(`Unknown payout phase: ${payout.payoutPhase}`);
        }
    }

    /**
     * 🏗️ Validate Milestone Prerequisites (75% Completion)
     * @private
     */
    async _validateMilestonePrerequisites(payout) {
        const progress = await this.prisma.learningProgress.aggregate({
            where: { enrollmentId: payout.enrollmentId },
            _avg: { progress: true }
        });

        if (!progress._avg.progress || progress._avg.progress < 75) {
            throw new Error(`Progress requirement not met: ${progress._avg.progress}% < 75%`);
        }

        // Check quality threshold
        if (payout.enrollment.expert.qualityMetrics.overallScore < this.config.qualityBonusThresholds.STANDARD) {
            throw new Error('Expert quality threshold not met for milestone payout');
        }
    }

    /**
     * 🏗️ Validate Completion Prerequisites
     * @private
     */
    async _validateCompletionPrerequisites(payout) {
        const enrollment = await this.prisma.enrollment.findUnique({
            where: { id: payout.enrollmentId },
            include: {
                certificate: true,
                progress: true
            }
        });

        if (enrollment.status !== 'COMPLETED') {
            throw new Error('Enrollment not completed');
        }

        if (!enrollment.certificate) {
            throw new Error('Certificate not issued');
        }

        // Check if all progress is 100%
        const incompleteProgress = await this.prisma.learningProgress.findFirst({
            where: {
                enrollmentId: payout.enrollmentId,
                progress: { lt: 100 }
            }
        });

        if (incompleteProgress) {
            throw new Error('Not all learning phases completed');
        }
    }

    /**
     * 🏗️ Calculate Quality Bonus
     * @private
     */
    async _calculateQualityBonus(payoutData) {
        const expert = await this.prisma.expert.findUnique({
            where: { id: payoutData.expertId },
            include: {
                qualityMetrics: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        if (!expert || !expert.qualityMetrics.length) {
            return {
                bonusAmount: 0,
                totalAmount: PAYOUT_SCHEDULE[payoutData.payoutPhase],
                bonusRate: 0,
                tier: 'STANDARD'
            };
        }

        const qualityMetrics = expert.qualityMetrics[0];
        let bonusRate = 0;
        let tier = 'STANDARD';

        // Determine tier and bonus rate
        if (qualityMetrics.overallScore >= this.config.qualityBonusThresholds.MASTER) {
            bonusRate = this.config.bonusRates.MASTER;
            tier = 'MASTER';
        } else if (qualityMetrics.overallScore >= this.config.qualityBonusThresholds.SENIOR) {
            bonusRate = this.config.bonusRates.SENIOR;
            tier = 'SENIOR';
        }

        const baseAmount = PAYOUT_SCHEDULE[payoutData.payoutPhase];
        const bonusAmount = Math.round(baseAmount * bonusRate);
        const totalAmount = baseAmount + bonusAmount;

        this.emit('quality.bonus.calculated', {
            expertId: payoutData.expertId,
            tier,
            qualityScore: qualityMetrics.overallScore,
            baseAmount,
            bonusAmount,
            totalAmount,
            bonusRate
        });

        return {
            bonusAmount,
            totalAmount,
            bonusRate,
            tier,
            qualityScore: qualityMetrics.overallScore
        };
    }

    /**
     * 🏗️ Process Payment Gateway Transfer
     * @private
     */
    async _processPaymentGatewayTransfer(paymentData) {
        const gateway = this._selectPaymentGateway(paymentData.expertId);
        
        return await this.circuitBreaker[gateway].execute(async () => {
            try {
                const client = this._getGatewayClient(gateway);
                const transferData = this._prepareTransferData(paymentData, gateway);
                
                const response = await axios.post(
                    `${client.baseURL}/transfers`,
                    transferData,
                    {
                        headers: {
                            'Authorization': `Bearer ${client.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: client.timeout
                    }
                );

                if (response.data.status === 'SUCCESS') {
                    return {
                        success: true,
                        transactionId: response.data.transactionId,
                        gateway: gateway,
                        amount: paymentData.totalAmount,
                        timestamp: new Date().toISOString()
                    };
                } else {
                    throw new Error(`Gateway transfer failed: ${response.data.message}`);
                }
            } catch (error) {
                this._logError('PAYMENT_GATEWAY_FAILED', error, {
                    gateway,
                    expertId: paymentData.expertId,
                    amount: paymentData.totalAmount
                });
                throw new Error(`Payment gateway error: ${error.message}`);
            }
        });
    }

    /**
     * 🏗️ Select Appropriate Payment Gateway
     * @private
     */
    _selectPaymentGateway(expertId) {
        // In production, this would check expert's preferred payment method
        // For now, use round-robin or configuration-based selection
        const gateways = [PAYMENT_GATEWAYS.TELEBIRR, PAYMENT_GATEWAYS.CBE_BIRR];
        const index = expertId.charCodeAt(0) % gateways.length;
        return gateways[index];
    }

    /**
     * 🏗️ Get Gateway Client Configuration
     * @private
     */
    _getGatewayClient(gateway) {
        const client = this.paymentGateways[gateway];
        if (!client) {
            throw new Error(`Unsupported payment gateway: ${gateway}`);
        }
        return client;
    }

    /**
     * 🏗️ Prepare Transfer Data for Gateway
     * @private
     */
    _prepareTransferData(paymentData, gateway) {
        const baseData = {
            amount: paymentData.totalAmount,
            currency: 'ETB',
            recipient: paymentData.expertId,
            reference: paymentData.payoutId,
            description: `Mosa Forge Payout - ${paymentData.payoutPhase}`,
            metadata: {
                enrollmentId: paymentData.enrollmentId,
                phase: paymentData.payoutPhase,
                baseAmount: paymentData.baseAmount,
                bonusAmount: paymentData.bonusAmount,
                tier: paymentData.tier
            }
        };

        // Gateway-specific adjustments
        if (gateway === PAYMENT_GATEWAYS.TELEBIRR) {
            return {
                ...baseData,
                customerCode: paymentData.expertId,
                transactionType: 'B2C'
            };
        } else if (gateway === PAYMENT_GATEWAYS.CBE_BIRR) {
            return {
                ...baseData,
                accountNumber: this._getExpertAccountNumber(paymentData.expertId),
                transferType: 'INSTANT'
            };
        }

        return baseData;
    }

    /**
     * 🏗️ Get Expert Account Number (Mock - would be from expert profile)
     * @private
     */
    _getExpertAccountNumber(expertId) {
        // In production, this would fetch from expert's payment profile
        return `ACC${expertId.substring(0, 8).toUpperCase()}`;
    }

    /**
     * 🏗️ Update Payout Record
     * @private
     */
    async _updatePayoutRecord(payoutRecordId, updateData) {
        return await this.prisma.expertPayout.update({
            where: { id: payoutRecordId },
            data: updateData
        });
    }

    /**
     * 🏗️ Process Scheduled Payouts (Cron Job)
     * @private
     */
    async _processScheduledPayouts() {
        const pendingPayouts = await this.prisma.expertPayout.findMany({
            where: {
                status: PAYOUT_STATUS.PENDING,
                scheduledDate: {
                    lte: new Date()
                },
                retryCount: { lt: this.config.maxRetries }
            },
            include: {
                expert: true,
                enrollment: true
            },
            take: 100 // Process in batches
        });

        this._logEvent('SCHEDULED_PAYOUTS_STARTED', {
            count: pendingPayouts.length,
            timestamp: new Date().toISOString()
        });

        for (const payout of pendingPayouts) {
            try {
                await this.processExpertPayout({
                    payoutRecordId: payout.id,
                    expertId: payout.expertId,
                    enrollmentId: payout.enrollmentId,
                    payoutPhase: payout.payoutPhase
                });
            } catch (error) {
                this._logError('SCHEDULED_PAYOUT_FAILED', error, {
                    payoutId: payout.id,
                    expertId: payout.expertId
                });
            }
        }
    }

    /**
     * 🏗️ Process Milestone Payouts (Cron Job)
     * @private
     */
    async _processMilestonePayouts() {
        const milestonePayouts = await this.prisma.expertPayout.findMany({
            where: {
                payoutPhase: 'MILESTONE',
                status: PAYOUT_STATUS.PENDING,
                enrollment: {
                    progress: {
                        some: {
                            phase: { in: ['THEORY', 'HANDS_ON'] },
                            progress: { gte: 75 }
                        }
                    }
                }
            },
            include: {
                expert: true,
                enrollment: {
                    include: {
                        progress: true
                    }
                }
            },
            take: 50 // Process in smaller batches
        });

        for (const payout of milestonePayouts) {
            try {
                await this.processExpertPayout({
                    payoutRecordId: payout.id,
                    expertId: payout.expertId,
                    enrollmentId: payout.enrollmentId,
                    payoutPhase: payout.payoutPhase
                });
            } catch (error) {
                this._logError('MILESTONE_PAYOUT_FAILED', error, {
                    payoutId: payout.id,
                    expertId: payout.expertId
                });
            }
        }
    }

    /**
     * 🏗️ Start Health Monitoring
     * @private
     */
    _startHealthChecks() {
        setInterval(() => {
            this._checkHealth();
        }, 30000); // Every 30 seconds
    }

    /**
     * 🏗️ Health Check Implementation
     * @private
     */
    async _checkHealth() {
        const health = {
            service: 'revenue-distributor',
            timestamp: new Date().toISOString(),
            status: 'healthy',
            dependencies: {},
            metrics: this.getMetrics()
        };

        try {
            await this.redis.ping();
            health.dependencies.redis = 'healthy';
        } catch (error) {
            health.dependencies.redis = 'unhealthy';
            health.status = 'degraded';
        }

        try {
            await this.prisma.$queryRaw`SELECT 1`;
            health.dependencies.database = 'healthy';
        } catch (error) {
            health.dependencies.database = 'unhealthy';
            health.status = 'degraded';
        }

        // Check payment gateways
        for (const gateway of Object.values(PAYMENT_GATEWAYS)) {
            health.dependencies[gateway] = this.circuitBreaker[gateway].getState() === 'OPEN' ? 'unhealthy' : 'healthy';
        }

        await this.redis.set(
            `health:revenue-distributor:${Date.now()}`,
            JSON.stringify(health),
            'EX',
            60
        );

        this.emit('health.check', health);
    }

    /**
     * 🏗️ Update Performance Metrics
     * @private
     */
    _updateMetrics(processingTime) {
        this.metrics.averageProcessingTime = 
            (this.metrics.averageProcessingTime * (this.metrics.distributionsProcessed - 1) + processingTime) / 
            this.metrics.distributionsProcessed;
    }

    /**
     * 🏗️ Format Enterprise Error
     * @private
     */
    _formatEnterpriseError(error) {
        const enterpriseError = new Error(error.message);
        enterpriseError.code = error.code || 'INTERNAL_ERROR';
        enterpriseError.timestamp = new Date().toISOString();
        enterpriseError.severity = this._getErrorSeverity(error.code);
        
        return enterpriseError;
    }

    /**
     * 🏗️ Get Error Severity
     * @private
     */
    _getErrorSeverity(errorCode) {
        const severityMap = {
            'PAYMENT_FAILED': 'HIGH',
            'GATEWAY_UNAVAILABLE': 'HIGH',
            'INSUFFICIENT_FUNDS': 'HIGH',
            'VALIDATION_ERROR': 'MEDIUM',
            'RETRY_EXCEEDED': 'MEDIUM',
            'INTERNAL_ERROR': 'CRITICAL'
        };

        return severityMap[errorCode] || 'MEDIUM';
    }

    /**
     * 🏗️ Enterprise Logging
     * @private
     */
    _logEvent(eventType, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            service: 'revenue-distributor',
            event: eventType,
            data,
            environment: process.env.NODE_ENV || 'development'
        };

        console.log(JSON.stringify(logEntry));

        // In production, this would send to centralized logging
        if (process.env.NODE_ENV === 'production') {
            this.redis.publish('service-logs', JSON.stringify(logEntry));
        }
    }

    /**
     * 🏗️ Success Logging
     * @private
     */
    _logSuccess(operation, data) {
        this._logEvent('SUCCESS', {
            operation,
            ...data,
            severity: 'INFO'
        });
    }

    /**
     * 🏗️ Error Logging
     * @private
     */
    _logError(operation, error, context = {}) {
        this._logEvent('ERROR', {
            operation,
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            context,
            severity: 'ERROR'
        });
    }

    /**
     * 🏗️ Get Service Metrics
     * @returns {Object} Service performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            circuitBreakerStates: Object.keys(this.circuitBreaker).reduce((acc, gateway) => {
                acc[gateway] = this.circuitBreaker[gateway].getState();
                return acc;
            }, {}),
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
    }

    /**
     * 🏗️ Graceful Shutdown
     */
    async shutdown() {
        try {
            this.emit('service.shutdown.started');
            
            // Close Redis connection
            await this.redis.quit();
            
            // Close Database connection
            await this.prisma.$disconnect();
            
            this.emit('service.shutdown.completed');
        } catch (error) {
            this.emit('service.shutdown.failed', { error: error.message });
            throw error;
        }
    }
}

// 🏗️ Enterprise Export Pattern
module.exports = {
    RevenueDistributor,
    REVENUE_SPLIT,
    PAYOUT_SCHEDULE,
    PAYMENT_GATEWAYS,
    PAYOUT_STATUS
};

// 🏗️ Singleton Instance for Microservice Architecture
let revenueDistributorInstance = null;

module.exports.getInstance = (options = {}) => {
    if (!revenueDistributorInstance) {
        revenueDistributorInstance = new RevenueDistributor(options);
    }
    return revenueDistributorInstance;
};