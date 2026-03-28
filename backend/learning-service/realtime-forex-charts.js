// learning-service/realtime-forex-charts.js

/**
 * 📈 ENTERPRISE REAL-TIME FOREX CHARTING ENGINE
 * Live trading charts, technical analysis, and market simulation for Ethiopian traders
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const WebSocket = require('ws');
const { Logger } = require('../utils/logger');
const { TechnicalAnalyzer } = require('../utils/technical-analyzer');
const { MarketSimulator } = require('../utils/market-simulator');
const { RiskCalculator } = require('../utils/risk-calculator');

class RealtimeForexCharts extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('RealtimeForexCharts');
    this.technicalAnalyzer = new TechnicalAnalyzer();
    this.marketSimulator = new MarketSimulator();
    this.riskCalculator = new RiskCalculator();

    // Configuration
    this.config = {
      // Data feed configuration
      dataFeed: {
        primary: 'DUMMY_FEED', // In production: 'OANDA', 'FXCM', 'DEFAULT'
        fallback: 'SIMULATION',
        updateInterval: 1000, // 1 second
        maxRetries: 5,
        timeout: 10000
      },
      
      // Chart configuration
      chart: {
        supportedTimeframes: ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'],
        maxDataPoints: 1000,
        compressionLevel: 'HIGH',
        cacheTTL: 300 // 5 minutes
      },
      
      // Currency pairs focus on Ethiopian market
      currencyPairs: [
        'ETBUSD', 'ETBEUR', 'ETBGBP', 'USDETB', 'EURETB', 'GBPETB',
        'USDJPY', 'EURUSD', 'GBPUSD', 'USDCHF', 'USDCAD', 'AUDUSD', 'NZDUSD'
      ],
      
      // Ethiopian trading hours (EAT - East Africa Time)
      tradingHours: {
        marketOpen: '08:00', // 8 AM EAT
        marketClose: '17:00', // 5 PM EAT
        breakStart: '12:00', // Lunch break
        breakEnd: '13:00'
      }
    };

    // WebSocket connections
    this.wsConnections = new Map();
    this.dataSubscribers = new Map();
    this.marketData = new Map();
    
    // Simulation state
    this.simulationEnabled = true;
    this.simulationTime = new Date();
    
    this.initialize();
  }

  /**
   * 🚀 INITIALIZE REAL-TIME FOREX CHARTS
   */
  async initialize() {
    try {
      await this.redis.ping();
      
      // Initialize market data for all currency pairs
      await this.initializeMarketData();
      
      // Start real-time data feeds
      await this.startDataFeeds();
      
      // Start simulation engine (for demo/learning)
      this.startSimulationEngine();
      
      // Initialize technical indicators
      await this.initializeTechnicalIndicators();
      
      this.logger.info('Real-time Forex charts initialized successfully');
      this.emit('chartsReady');
      
    } catch (error) {
      this.logger.error('Failed to initialize Forex charts', error);
      throw error;
    }
  }

  /**
   * 📊 INITIALIZE MARKET DATA
   */
  async initializeMarketData() {
    for (const pair of this.config.currencyPairs) {
      const initialData = await this.getInitialMarketData(pair);
      this.marketData.set(pair, {
        current: initialData,
        history: await this.loadHistoricalData(pair, '1h', 100),
        indicators: {},
        subscribers: new Set()
      });
    }
    
    this.logger.info('Market data initialized for all currency pairs');
  }

  /**
   * 📈 GET INITIAL MARKET DATA
   */
  async getInitialMarketData(currencyPair) {
    const cacheKey = `forex:initial:${currencyPair}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Generate realistic initial data
    const initialData = this.generateRealisticInitialData(currencyPair);
    
    // Cache for 1 hour
    await this.redis.setex(cacheKey, 3600, JSON.stringify(initialData));
    
    return initialData;
  }

  /**
   * 🎯 GENERATE REALISTIC INITIAL DATA
   */
  generateRealisticInitialData(currencyPair) {
    const baseRates = {
      'ETBUSD': { bid: 0.018, ask: 0.0182, spread: 0.0002 },
      'ETBEUR': { bid: 0.016, ask: 0.0162, spread: 0.0002 },
      'ETBGBP': { bid: 0.014, ask: 0.0142, spread: 0.0002 },
      'USDETB': { bid: 55.5, ask: 55.7, spread: 0.2 },
      'EURETB': { bid: 62.0, ask: 62.2, spread: 0.2 },
      'GBPETB': { bid: 70.5, ask: 70.7, spread: 0.2 },
      'USDJPY': { bid: 110.5, ask: 110.7, spread: 0.2 },
      'EURUSD': { bid: 1.1850, ask: 1.1852, spread: 0.0002 },
      'GBPUSD': { bid: 1.3750, ask: 1.3752, spread: 0.0002 }
    };

    const base = baseRates[currencyPair] || { bid: 1.0, ask: 1.0002, spread: 0.0002 };
    
    // Add some random variation
    const variation = (Math.random() - 0.5) * base.spread * 10;
    
    return {
      symbol: currencyPair,
      bid: this.roundToPrecision(base.bid + variation, 6),
      ask: this.roundToPrecision(base.ask + variation, 6),
      spread: base.spread,
      timestamp: new Date(),
      volume: Math.floor(Math.random() * 1000000) + 100000,
      high: this.roundToPrecision(base.bid + Math.abs(variation), 6),
      low: this.roundToPrecision(base.bid - Math.abs(variation), 6),
      open: base.bid,
      change: variation,
      changePercent: (variation / base.bid) * 100
    };
  }

  /**
   * 📚 LOAD HISTORICAL DATA
   */
  async loadHistoricalData(currencyPair, timeframe, limit = 100) {
    const cacheKey = `forex:history:${currencyPair}:${timeframe}:${limit}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Generate realistic historical data
    const historicalData = this.generateHistoricalData(currencyPair, timeframe, limit);
    
    // Cache for 15 minutes
    await this.redis.setex(cacheKey, 900, JSON.stringify(historicalData));
    
    return historicalData;
  }

  /**
   * 🏗️ GENERATE HISTORICAL DATA
   */
  generateHistoricalData(currencyPair, timeframe, limit) {
    const data = [];
    const basePrice = this.generateRealisticInitialData(currencyPair).bid;
    let currentPrice = basePrice;
    
    const now = new Date();
    const intervalMs = this.timeframeToMs(timeframe);
    
    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * intervalMs));
      
      // Realistic price movement based on Brownian motion
      const change = (Math.random() - 0.5) * basePrice * 0.002; // 0.2% max change
      currentPrice = this.roundToPrecision(currentPrice + change, 6);
      
      const high = currentPrice + Math.abs(change) * 2;
      const low = currentPrice - Math.abs(change) * 2;
      const volume = Math.floor(Math.random() * 1000000) + 100000;
      
      data.push({
        timestamp,
        open: this.roundToPrecision(currentPrice - change, 6),
        high: this.roundToPrecision(high, 6),
        low: this.roundToPrecision(low, 6),
        close: currentPrice,
        volume
      });
    }
    
    return data;
  }

  /**
   * 🔌 START DATA FEEDS
   */
  async startDataFeeds() {
    // Start WebSocket connections for real data (in production)
    if (process.env.NODE_ENV === 'production' && this.config.dataFeed.primary !== 'DUMMY_FEED') {
      await this.connectToDataFeed();
    }
    
    // Start interval-based updates for demo/simulation
    this.dataFeedInterval = setInterval(() => {
      this.updateAllMarketData();
    }, this.config.dataFeed.updateInterval);
    
    this.logger.info('Data feeds started successfully');
  }

  /**
   * 🔌 CONNECT TO DATA FEED
   */
  async connectToDataFeed() {
    try {
      // This would connect to real Forex data providers in production
      // For now, we'll simulate the connection
      this.logger.info('Connecting to Forex data feed...');
      
      // Simulate connection success
      setTimeout(() => {
        this.emit('dataFeedConnected');
        this.logger.info('Forex data feed connected successfully');
      }, 1000);
      
    } catch (error) {
      this.logger.error('Failed to connect to data feed', error);
      this.emit('dataFeedError', error);
      
      // Fallback to simulation
      this.enableSimulationMode();
    }
  }

  /**
   * 🎮 ENABLE SIMULATION MODE
   */
  enableSimulationMode() {
    this.simulationEnabled = true;
    this.logger.info('Simulation mode enabled');
    this.emit('simulationModeEnabled');
  }

  /**
   * 🔄 UPDATE ALL MARKET DATA
   */
  async updateAllMarketData() {
    const updatePromises = this.config.currencyPairs.map(pair => 
      this.updateMarketData(pair)
    );
    
    await Promise.all(updatePromises);
  }

  /**
   * 📈 UPDATE MARKET DATA FOR SPECIFIC PAIR
   */
  async updateMarketData(currencyPair) {
    try {
      const currentData = this.marketData.get(currencyPair);
      if (!currentData) return;

      // Get new price data
      const newPriceData = await this.getNewPriceData(currencyPair, currentData.current);
      
      // Update current data
      currentData.current = newPriceData;
      
      // Add to history
      this.addToHistory(currencyPair, newPriceData);
      
      // Calculate technical indicators
      await this.updateTechnicalIndicators(currencyPair);
      
      // Notify subscribers
      this.notifySubscribers(currencyPair, newPriceData);
      
      // Emit update event
      this.emit('marketDataUpdate', {
        symbol: currencyPair,
        data: newPriceData,
        timestamp: new Date()
      });

    } catch (error) {
      this.logger.error(`Failed to update market data for ${currencyPair}`, error);
    }
  }

  /**
   * 💹 GET NEW PRICE DATA
   */
  async getNewPriceData(currencyPair, previousData) {
    if (this.simulationEnabled) {
      return this.simulatePriceMovement(currencyPair, previousData);
    }
    
    // In production, this would fetch from real data feed
    return this.fetchRealPriceData(currencyPair);
  }

  /**
   * 🎮 SIMULATE PRICE MOVEMENT
   */
  simulatePriceMovement(currencyPair, previousData) {
    const volatility = this.getVolatilityForPair(currencyPair);
    const change = (Math.random() - 0.5) * volatility * previousData.bid;
    const newBid = this.roundToPrecision(previousData.bid + change, 6);
    const spread = previousData.spread;
    const newAsk = this.roundToPrecision(newBid + spread, 6);
    
    // Determine high/low based on movement
    const high = Math.max(newBid, previousData.high);
    const low = Math.min(newBid, previousData.low);
    
    return {
      ...previousData,
      bid: newBid,
      ask: newAsk,
      timestamp: new Date(),
      high,
      low,
      change: newBid - previousData.bid,
      changePercent: ((newBid - previousData.bid) / previousData.bid) * 100,
      volume: Math.floor(Math.random() * 1000000) + 100000
    };
  }

  /**
   * 📡 FETCH REAL PRICE DATA
   */
  async fetchRealPriceData(currencyPair) {
    // Placeholder for real data feed integration
    // This would connect to OANDA, FXCM, or other Forex data providers
    
    throw new Error('Real data feed not implemented - using simulation');
  }

  /**
   * 📊 ADD TO HISTORY
   */
  addToHistory(currencyPair, newData) {
    const marketData = this.marketData.get(currencyPair);
    if (!marketData) return;

    // Add to history array
    marketData.history.push({
      timestamp: newData.timestamp,
      open: newData.bid,
      high: newData.high,
      low: newData.low,
      close: newData.bid,
      volume: newData.volume
    });

    // Maintain history limit
    if (marketData.history.length > this.config.chart.maxDataPoints) {
      marketData.history = marketData.history.slice(-this.config.chart.maxDataPoints);
    }
  }

  /**
   * 📈 UPDATE TECHNICAL INDICATORS
   */
  async updateTechnicalIndicators(currencyPair) {
    const marketData = this.marketData.get(currencyPair);
    if (!marketData || marketData.history.length < 20) return;

    try {
      const indicators = await this.technicalAnalyzer.calculateAllIndicators(
        marketData.history,
        currencyPair
      );
      
      marketData.indicators = indicators;
      
      this.emit('indicatorsUpdated', {
        symbol: currencyPair,
        indicators,
        timestamp: new Date()
      });
      
    } catch (error) {
      this.logger.error(`Failed to update indicators for ${currencyPair}`, error);
    }
  }

  /**
   * 🔔 NOTIFY SUBSCRIBERS
   */
  notifySubscribers(currencyPair, data) {
    const marketData = this.marketData.get(currencyPair);
    if (!marketData) return;

    marketData.subscribers.forEach(subscriberId => {
      this.emit(`data:${subscriberId}`, {
        type: 'PRICE_UPDATE',
        symbol: currencyPair,
        data,
        timestamp: new Date()
      });
    });
  }

  /**
   * 🎯 START SIMULATION ENGINE
   */
  startSimulationEngine() {
    this.simulationInterval = setInterval(() => {
      this.advanceSimulationTime();
    }, 1000); // Advance time every second
    
    this.logger.info('Simulation engine started');
  }

  /**
   * ⏰ ADVANCE SIMULATION TIME
   */
  advanceSimulationTime() {
    this.simulationTime = new Date(this.simulationTime.getTime() + 60000); // Advance 1 minute
  }

  /**
   * 📊 INITIALIZE TECHNICAL INDICATORS
   */
  async initializeTechnicalIndicators() {
    for (const pair of this.config.currencyPairs) {
      await this.updateTechnicalIndicators(pair);
    }
    
    this.logger.info('Technical indicators initialized for all pairs');
  }

  /**
   * 🎯 GET CHART DATA
   */
  async getChartData(currencyPair, timeframe, options = {}) {
    const startTime = performance.now();
    
    try {
      const cacheKey = `chart:${currencyPair}:${timeframe}:${JSON.stringify(options)}`;
      
      // Try cache first
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const marketData = this.marketData.get(currencyPair);
      if (!marketData) {
        throw new Error(`No market data available for ${currencyPair}`);
      }

      // Get historical data for the specified timeframe
      const historicalData = await this.getTimeframeData(
        marketData.history,
        timeframe,
        options.limit || this.config.chart.maxDataPoints
      );

      // Apply technical indicators if requested
      let indicators = {};
      if (options.includeIndicators !== false) {
        indicators = marketData.indicators;
      }

      // Apply compression if needed
      const compressedData = this.compressChartData(historicalData, options.compression);

      const chartData = {
        symbol: currencyPair,
        timeframe,
        data: compressedData,
        current: marketData.current,
        indicators,
        metadata: {
          generatedAt: new Date(),
          dataPoints: compressedData.length,
          timeframe,
          compression: options.compression || 'NONE'
        }
      };

      // Cache the result
      await this.redis.setex(cacheKey, this.config.chart.cacheTTL, JSON.stringify(chartData));

      const processingTime = performance.now() - startTime;
      this.logger.debug('Chart data generated', { currencyPair, timeframe, processingTime });

      return chartData;

    } catch (error) {
      this.logger.error('Failed to get chart data', error, { currencyPair, timeframe });
      throw error;
    }
  }

  /**
   * ⏱️ GET TIMEFRAME DATA
   */
  async getTimeframeData(historicalData, timeframe, limit) {
    const intervalMs = this.timeframeToMs(timeframe);
    const groupedData = [];
    
    if (historicalData.length === 0) return groupedData;

    let currentGroup = null;
    let groupStartTime = null;

    for (const candle of historicalData) {
      const candleTime = new Date(candle.timestamp).getTime();
      
      if (!currentGroup || candleTime - groupStartTime >= intervalMs) {
        // Start new group
        if (currentGroup) {
          groupedData.push(currentGroup);
        }
        
        currentGroup = { ...candle };
        groupStartTime = candleTime;
      } else {
        // Update current group
        currentGroup.high = Math.max(currentGroup.high, candle.high);
        currentGroup.low = Math.min(currentGroup.low, candle.low);
        currentGroup.close = candle.close;
        currentGroup.volume += candle.volume;
      }
    }

    // Add the last group
    if (currentGroup) {
      groupedData.push(currentGroup);
    }

    // Return limited results
    return groupedData.slice(-limit);
  }

  /**
   * 🗜️ COMPRESS CHART DATA
   */
  compressChartData(data, compressionLevel = 'MEDIUM') {
    if (!compressionLevel || compressionLevel === 'NONE' || data.length <= 100) {
      return data;
    }

    const compressionRatios = {
      LOW: 2,
      MEDIUM: 4,
      HIGH: 8
    };

    const ratio = compressionRatios[compressionLevel] || 1;
    const compressed = [];

    for (let i = 0; i < data.length; i += ratio) {
      const chunk = data.slice(i, i + ratio);
      if (chunk.length === 0) continue;

      const compressedCandle = {
        timestamp: chunk[0].timestamp,
        open: chunk[0].open,
        high: Math.max(...chunk.map(c => c.high)),
        low: Math.min(...chunk.map(c => c.low)),
        close: chunk[chunk.length - 1].close,
        volume: chunk.reduce((sum, c) => sum + c.volume, 0)
      };

      compressed.push(compressedCandle);
    }

    return compressed;
  }

  /**
   * 📡 SUBSCRIBE TO REAL-TIME UPDATES
   */
  subscribeToUpdates(studentId, currencyPairs, callback) {
    const subscriptionId = this.generateSubscriptionId();
    
    currencyPairs.forEach(pair => {
      const marketData = this.marketData.get(pair);
      if (marketData) {
        marketData.subscribers.add(subscriptionId);
      }
    });

    // Store callback
    this.dataSubscribers.set(subscriptionId, {
      studentId,
      currencyPairs,
      callback,
      subscribedAt: new Date()
    });

    // Send initial data
    this.sendInitialData(subscriptionId, currencyPairs);

    this.logger.info('New subscription created', { studentId, subscriptionId, pairs: currencyPairs });

    return subscriptionId;
  }

  /**
   * 📵 UNSUBSCRIBE FROM UPDATES
   */
  unsubscribeFromUpdates(subscriptionId) {
    // Remove from all currency pair subscribers
    this.marketData.forEach((marketData, pair) => {
      marketData.subscribers.delete(subscriptionId);
    });

    // Remove callback
    this.dataSubscribers.delete(subscriptionId);

    this.logger.info('Subscription removed', { subscriptionId });
  }

  /**
   * 📨 SEND INITIAL DATA
   */
  async sendInitialData(subscriptionId, currencyPairs) {
    const subscriber = this.dataSubscribers.get(subscriptionId);
    if (!subscriber) return;

    const initialData = {};

    for (const pair of currencyPairs) {
      const marketData = this.marketData.get(pair);
      if (marketData) {
        initialData[pair] = {
          current: marketData.current,
          indicators: marketData.indicators
        };
      }
    }

    subscriber.callback({
      type: 'INITIAL_DATA',
      data: initialData,
      timestamp: new Date()
    });
  }

  /**
   * 💼 CREATE TRADING SIMULATION
   */
  async createTradingSimulation(studentId, options = {}) {
    const simulationId = this.generateSimulationId();
    
    const simulation = {
      id: simulationId,
      studentId,
      initialBalance: options.initialBalance || 10000,
      balance: options.initialBalance || 10000,
      currency: options.currency || 'USD',
      positions: [],
      history: [],
      startedAt: new Date(),
      riskLevel: options.riskLevel || 'MEDIUM',
      leverage: options.leverage || 1
    };

    // Store simulation
    await this.redis.setex(
      `simulation:${simulationId}`,
      86400, // 24 hours
      JSON.stringify(simulation)
    );

    this.logger.info('Trading simulation created', { simulationId, studentId });

    return simulation;
  }

  /**
   * 🎮 EXECUTE TRADE IN SIMULATION
   */
  async executeTrade(simulationId, tradeRequest) {
    const startTime = performance.now();
    
    try {
      const simulation = await this.getSimulation(simulationId);
      if (!simulation) {
        throw new Error('Simulation not found');
      }

      // Validate trade request
      this.validateTradeRequest(tradeRequest, simulation);

      // Get current market data
      const marketData = this.marketData.get(tradeRequest.symbol);
      if (!marketData) {
        throw new Error('Invalid currency pair');
      }

      // Calculate trade details
      const trade = await this.calculateTradeDetails(tradeRequest, marketData.current, simulation);

      // Check risk limits
      await this.validateRiskLimits(trade, simulation);

      // Execute trade
      const executedTrade = await this.executeSimulationTrade(trade, simulation);

      // Update simulation
      simulation.balance = executedTrade.newBalance;
      simulation.positions.push(executedTrade.position);
      simulation.history.push(executedTrade);

      // Save updated simulation
      await this.saveSimulation(simulation);

      const processingTime = performance.now() - startTime;

      this.emit('tradeExecuted', {
        simulationId,
        trade: executedTrade,
        processingTime
      });

      return executedTrade;

    } catch (error) {
      this.logger.error('Trade execution failed', error, { simulationId, tradeRequest });
      throw error;
    }
  }

  /**
   * 🛡️ VALIDATE TRADE REQUEST
   */
  validateTradeRequest(tradeRequest, simulation) {
    const { symbol, direction, volume, orderType } = tradeRequest;

    if (!symbol || !direction || !volume) {
      throw new Error('Missing required trade parameters');
    }

    if (!['BUY', 'SELL'].includes(direction)) {
      throw new Error('Invalid trade direction');
    }

    if (volume <= 0) {
      throw new Error('Trade volume must be positive');
    }

    if (orderType && !['MARKET', 'LIMIT', 'STOP'].includes(orderType)) {
      throw new Error('Invalid order type');
    }

    // Check if symbol is supported
    if (!this.config.currencyPairs.includes(symbol)) {
      throw new Error('Unsupported currency pair');
    }
  }

  /**
   * 📊 CALCULATE TRADE DETAILS
   */
  async calculateTradeDetails(tradeRequest, marketData, simulation) {
    const { symbol, direction, volume, orderType = 'MARKET' } = tradeRequest;

    const price = direction === 'BUY' ? marketData.ask : marketData.bid;
    const spread = marketData.spread;
    const notional = volume * price;
    const commission = this.calculateCommission(notional);
    const requiredMargin = this.calculateRequiredMargin(notional, simulation.leverage);

    return {
      symbol,
      direction,
      volume,
      orderType,
      entryPrice: price,
      spread,
      notional,
      commission,
      requiredMargin,
      timestamp: new Date(),
      simulationId: simulation.id
    };
  }

  /**
   * 💰 CALCULATE COMMISSION
   */
  calculateCommission(notional) {
    // Simple commission model: 0.1% of notional amount
    return notional * 0.001;
  }

  /**
   * 🏦 CALCULATE REQUIRED MARGIN
   */
  calculateRequiredMargin(notional, leverage) {
    return notional / leverage;
  }

  /**
   * 🛡️ VALIDATE RISK LIMITS
   */
  async validateRiskLimits(trade, simulation) {
    const riskAssessment = await this.riskCalculator.assessTradeRisk(trade, simulation);

    if (riskAssessment.riskLevel === 'HIGH') {
      throw new Error('Trade exceeds risk limits');
    }

    if (trade.requiredMargin > simulation.balance * 0.5) {
      throw new Error('Insufficient margin available');
    }

    return true;
  }

  /**
   * 🎯 EXECUTE SIMULATION TRADE
   */
  async executeSimulationTrade(trade, simulation) {
    const position = {
      id: this.generatePositionId(),
      symbol: trade.symbol,
      direction: trade.direction,
      volume: trade.volume,
      entryPrice: trade.entryPrice,
      entryTime: new Date(),
      margin: trade.requiredMargin,
      commission: trade.commission
    };

    const newBalance = simulation.balance - trade.commission;

    return {
      ...trade,
      position,
      newBalance,
      executedAt: new Date(),
      status: 'EXECUTED'
    };
  }

  /**
   * 💾 GET SIMULATION
   */
  async getSimulation(simulationId) {
    const simulationData = await this.redis.get(`simulation:${simulationId}`);
    return simulationData ? JSON.parse(simulationData) : null;
  }

  /**
   * 💾 SAVE SIMULATION
   */
  async saveSimulation(simulation) {
    await this.redis.setex(
      `simulation:${simulation.id}`,
      86400, // 24 hours
      JSON.stringify(simulation)
    );
  }

  /**
   * 📊 GET SIMULATION PERFORMANCE
   */
  async getSimulationPerformance(simulationId) {
    const simulation = await this.getSimulation(simulationId);
    if (!simulation) return null;

    const performance = await this.calculatePerformanceMetrics(simulation);
    return performance;
  }

  /**
   * 📈 CALCULATE PERFORMANCE METRICS
   */
  async calculatePerformanceMetrics(simulation) {
    const currentValues = await this.calculateCurrentPortfolioValue(simulation);
    
    return {
      simulationId: simulation.id,
      initialBalance: simulation.initialBalance,
      currentBalance: simulation.balance,
      portfolioValue: currentValues.totalValue,
      unrealizedPnL: currentValues.unrealizedPnL,
      realizedPnL: this.calculateRealizedPnL(simulation.history),
      totalReturn: ((currentValues.totalValue - simulation.initialBalance) / simulation.initialBalance) * 100,
      sharpeRatio: this.calculateSharpeRatio(simulation.history),
      maxDrawdown: this.calculateMaxDrawdown(simulation.history),
      winRate: this.calculateWinRate(simulation.history),
      riskMetrics: await this.riskCalculator.calculatePortfolioRisk(simulation)
    };
  }

  /**
   * 💰 CALCULATE CURRENT PORTFOLIO VALUE
   */
  async calculateCurrentPortfolioValue(simulation) {
    let unrealizedPnL = 0;
    let totalValue = simulation.balance;

    for (const position of simulation.positions) {
      const marketData = this.marketData.get(position.symbol);
      if (marketData) {
        const currentPrice = position.direction === 'BUY' ? marketData.current.bid : marketData.current.ask;
        const positionValue = position.volume * currentPrice;
        const entryValue = position.volume * position.entryPrice;
        const positionPnL = position.direction === 'BUY' ? 
          positionValue - entryValue : entryValue - positionValue;
        
        unrealizedPnL += positionPnL;
        totalValue += positionValue;
      }
    }

    return { totalValue, unrealizedPnL };
  }

  /**
   * 🔧 UTILITY METHODS
   */

  /**
   * 🆔 GENERATE SUBSCRIPTION ID
   */
  generateSubscriptionId() {
    return `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🆔 GENERATE SIMULATION ID
   */
  generateSimulationId() {
    return `SIM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 🆔 GENERATE POSITION ID
   */
  generatePositionId() {
    return `POS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * ⏱️ TIMEFRAME TO MILLISECONDS
   */
  timeframeToMs(timeframe) {
    const multipliers = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    };

    return multipliers[timeframe] || 60 * 1000;
  }

  /**
   * 🔢 ROUND TO PRECISION
   */
  roundToPrecision(value, precision) {
    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
  }

  /**
   * 📊 GET VOLATILITY FOR PAIR
   */
  getVolatilityForPair(currencyPair) {
    const volatilities = {
      'ETBUSD': 0.001,
      'ETBEUR': 0.001,
      'ETBGBP': 0.001,
      'USDETB': 0.002,
      'EURETB': 0.002,
      'GBPETB': 0.002,
      'USDJPY': 0.005,
      'EURUSD': 0.004,
      'GBPUSD': 0.005
    };

    return volatilities[currencyPair] || 0.003;
  }

  /**
   * 💰 CALCULATE REALIZED P&L
   */
  calculateRealizedPnL(tradeHistory) {
    return tradeHistory.reduce((total, trade) => {
      if (trade.status === 'CLOSED') {
        return total + (trade.realizedPnL || 0);
      }
      return total;
    }, 0);
  }

  /**
   * 📈 CALCULATE SHARPE RATIO
   */
  calculateSharpeRatio(tradeHistory) {
    // Simplified Sharpe ratio calculation
    if (tradeHistory.length < 2) return 0;

    const returns = tradeHistory
      .filter(trade => trade.realizedPnL)
      .map(trade => trade.realizedPnL);

    if (returns.length < 2) return 0;

    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sq, n) => sq + Math.pow(n - meanReturn, 2), 0) / returns.length
    );

    return stdDev === 0 ? 0 : meanReturn / stdDev;
  }

  /**
   * 📉 CALCULATE MAX DRAWDOWN
   */
  calculateMaxDrawdown(tradeHistory) {
    let maxDrawdown = 0;
    let peak = 0;

    tradeHistory.forEach(trade => {
      if (trade.balance > peak) {
        peak = trade.balance;
      }
      
      const drawdown = (peak - trade.balance) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    return maxDrawdown;
  }

  /**
   * 🏆 CALCULATE WIN RATE
   */
  calculateWinRate(tradeHistory) {
    const trades = tradeHistory.filter(trade => trade.realizedPnL !== undefined);
    if (trades.length === 0) return 0;

    const winningTrades = trades.filter(trade => trade.realizedPnL > 0);
    return (winningTrades.length / trades.length) * 100;
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      // Clear intervals
      if (this.dataFeedInterval) {
        clearInterval(this.dataFeedInterval);
      }
      
      if (this.simulationInterval) {
        clearInterval(this.simulationInterval);
      }

      // Close WebSocket connections
      this.wsConnections.forEach(ws => ws.close());
      this.wsConnections.clear();

      // Clear data structures
      this.dataSubscribers.clear();
      this.marketData.clear();

      // Close Redis connection
      await this.redis.quit();
      
      // Close Prisma connection
      await this.prisma.$disconnect();

      this.removeAllListeners();
      
      this.logger.info('Real-time Forex charts resources cleaned up');
    } catch (error) {
      this.logger.error('Error during Forex charts cleanup', error);
    }
  }
}

// Export singleton instance
module.exports = new RealtimeForexCharts();