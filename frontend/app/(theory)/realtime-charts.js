// (theory)/realtime-charts.js

/**
 * 🎯 ENTERPRISE REAL-TIME TRADING CHARTS
 * Production-ready live Forex charts for Mosa Forge learning engine
 * Features: WebSocket streaming, technical indicators, interactive learning
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

const { EventEmitter } = require('events');
const WebSocket = require('ws');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const { Logger } = require('../../utils/logger');
const { TechnicalIndicators } = require('../../utils/technical-indicators');
const { RateLimiterRedis } = require('rate-limiter-flexible');

class RealtimeCharts extends EventEmitter {
  constructor() {
    super();
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL);
    this.logger = new Logger('RealtimeCharts');
    this.technicalIndicators = new TechnicalIndicators();
    
    // WebSocket connections manager
    this.connections = new Map();
    this.marketDataFeeds = new Map();
    
    // Rate limiting for chart data requests
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redis,
      keyGenerator: (req) => `chart_limit:${req.userId}`,
      points: 100, // 100 requests per minute
      duration: 60,
    });

    // Configuration
    this.config = {
      supportedPairs: [
        'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
        'USD/CAD', 'NZD/USD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY'
      ],
      timeframes: ['1m', '5m', '15m', '1h', '4h', '1d', '1w'],
      maxConnectionsPerUser: 3,
      dataRetentionDays: 90,
      cacheTTL: 300 // 5 minutes
    };

    this.initialize();
  }

  /**
   * Initialize real-time chart system
   */
  async initialize() {
    try {
      await this.redis.ping();
      await this.initializeMarketDataFeeds();
      await this.warmUpChartCache();
      
      this.logger.info('Real-time charts system initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize real-time charts', error);
      throw error;
    }
  }

  /**
   * 🚀 INITIALIZE MARKET DATA FEEDS
   */
  async initializeMarketDataFeeds() {
    for (const pair of this.config.supportedPairs) {
      try {
        const feed = await this.createMarketDataFeed(pair);
        this.marketDataFeeds.set(pair, feed);
        
        feed.on('priceUpdate', (data) => {
          this.handlePriceUpdate(pair, data);
        });
        
        feed.on('error', (error) => {
          this.logger.error(`Market data feed error for ${pair}`, error);
        });
        
      } catch (error) {
        this.logger.error(`Failed to initialize feed for ${pair}`, error);
      }
    }
  }

  /**
   * 📊 CREATE MARKET DATA FEED
   */
  async createMarketDataFeed(currencyPair) {
    const feed = new EventEmitter();
    
    // Simulate real market data (replace with actual Forex data provider)
    const simulateMarketData = () => {
      const basePrice = this.getBasePriceForPair(currencyPair);
      const spread = 0.0002; // 2 pips spread
      const volatility = 0.0005; // 5 pips volatility
      
      const bid = basePrice + (Math.random() - 0.5) * volatility;
      const ask = bid + spread;
      
      const tick = {
        pair: currencyPair,
        timestamp: Date.now(),
        bid: this.roundToPips(bid),
        ask: this.roundToPips(ask),
        spread: this.roundToPips(spread),
        volume: Math.floor(Math.random() * 1000) + 100
      };
      
      feed.emit('priceUpdate', tick);
    };
    
    // Emit ticks every second for demo (adjust based on timeframe)
    const intervalId = setInterval(simulateMarketData, 1000);
    
    feed.destroy = () => {
      clearInterval(intervalId);
      feed.removeAllListeners();
    };
    
    return feed;
  }

  /**
   * 🔌 HANDLE CLIENT CONNECTION
   */
  async handleClientConnection(ws, request) {
    const connectionId = this.generateConnectionId();
    const userId = request.user?.id || 'anonymous';
    
    try {
      // Rate limiting check
      await this.rateLimiter.consume(`user:${userId}`);
      
      // Validate connection limits
      await this.validateConnectionLimits(userId);
      
      const connection = {
        id: connectionId,
        ws,
        userId,
        subscribedPairs: new Set(),
        subscribedTimeframes: new Set(),
        createdAt: Date.now(),
        metadata: {
          userAgent: request.headers['user-agent'],
          ipAddress: request.ip
        }
      };
      
      this.connections.set(connectionId, connection);
      
      // Send initial connection confirmation
      this.sendToConnection(connectionId, {
        type: 'CONNECTION_ESTABLISHED',
        connectionId,
        serverTime: Date.now(),
        supportedPairs: this.config.supportedPairs,
        timeframes: this.config.timeframes
      });
      
      this.logger.info('New chart connection established', { connectionId, userId });
      
      // Setup message handler
      ws.on('message', (data) => {
        this.handleClientMessage(connectionId, data);
      });
      
      // Setup close handler
      ws.on('close', () => {
        this.handleConnectionClose(connectionId);
      });
      
      // Setup error handler
      ws.on('error', (error) => {
        this.handleConnectionError(connectionId, error);
      });
      
      // Send initial market data
      await this.sendInitialMarketData(connectionId);
      
    } catch (error) {
      this.logger.error('Failed to handle client connection', error, { userId });
      ws.close(1008, 'Connection failed'); // Policy violation
    }
  }

  /**
   * 📨 HANDLE CLIENT MESSAGES
   */
  async handleClientMessage(connectionId, rawData) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    try {
      const message = this.parseMessage(rawData);
      
      if (!this.validateMessageStructure(message)) {
        this.sendError(connectionId, 'INVALID_MESSAGE_FORMAT');
        return;
      }
      
      switch (message.type) {
        case 'SUBSCRIBE_PAIR':
          await this.handleSubscribePair(connectionId, message.data);
          break;
          
        case 'UNSUBSCRIBE_PAIR':
          await this.handleUnsubscribePair(connectionId, message.data);
          break;
          
        case 'REQUEST_HISTORICAL_DATA':
          await this.handleHistoricalDataRequest(connectionId, message.data);
          break;
          
        case 'REQUEST_TECHNICAL_INDICATORS':
          await this.handleTechnicalIndicatorsRequest(connectionId, message.data);
          break;
          
        case 'SAVE_CHART_LAYOUT':
          await this.handleSaveChartLayout(connectionId, message.data);
          break;
          
        case 'PRACTICE_TRADE':
          await this.handlePracticeTrade(connectionId, message.data);
          break;
          
        case 'PING':
          this.sendToConnection(connectionId, { type: 'PONG', timestamp: Date.now() });
          break;
          
        default:
          this.sendError(connectionId, 'UNKNOWN_MESSAGE_TYPE');
      }
      
    } catch (error) {
      this.logger.error('Error handling client message', error, { connectionId });
      this.sendError(connectionId, 'MESSAGE_PROCESSING_ERROR');
    }
  }

  /**
   * 📈 HANDLE PRICE UPDATES
   */
  async handlePriceUpdate(pair, tickData) {
    // Update Redis cache with latest price
    const cacheKey = `market:latest:${pair}`;
    await this.redis.setex(cacheKey, 60, JSON.stringify(tickData));
    
    // Notify subscribed connections
    for (const [connectionId, connection] of this.connections) {
      if (connection.subscribedPairs.has(pair)) {
        this.sendToConnection(connectionId, {
          type: 'PRICE_UPDATE',
          data: tickData
        });
      }
    }
    
    // Store in historical data
    await this.storeHistoricalTick(pair, tickData);
    
    // Emit event for other services
    this.emit('priceUpdate', { pair, tick: tickData });
  }

  /**
   * 📊 HANDLE SUBSCRIBE TO PAIR
   */
  async handleSubscribePair(connectionId, data) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    const { pair, timeframe = '1m' } = data;
    
    if (!this.config.supportedPairs.includes(pair)) {
      this.sendError(connectionId, 'UNSUPPORTED_CURRENCY_PAIR');
      return;
    }
    
    if (!this.config.timeframes.includes(timeframe)) {
      this.sendError(connectionId, 'UNSUPPORTED_TIMEFRAME');
      return;
    }
    
    // Add to subscriptions
    connection.subscribedPairs.add(pair);
    connection.subscribedTimeframes.add(timeframe);
    
    // Send current market data
    const marketData = await this.getCurrentMarketData(pair, timeframe);
    this.sendToConnection(connectionId, {
      type: 'MARKET_DATA',
      pair,
      timeframe,
      data: marketData
    });
    
    this.logger.debug('Pair subscribed', { connectionId, pair, timeframe });
  }

  /**
   * 📉 HANDLE HISTORICAL DATA REQUEST
   */
  async handleHistoricalDataRequest(connectionId, data) {
    const { pair, timeframe, from, to, limit = 1000 } = data;
    
    try {
      const historicalData = await this.getHistoricalData(pair, timeframe, from, to, limit);
      
      this.sendToConnection(connectionId, {
        type: 'HISTORICAL_DATA',
        pair,
        timeframe,
        data: historicalData
      });
      
    } catch (error) {
      this.logger.error('Historical data request failed', error, { connectionId, pair });
      this.sendError(connectionId, 'HISTORICAL_DATA_ERROR');
    }
  }

  /**
   * 🧮 HANDLE TECHNICAL INDICATORS REQUEST
   */
  async handleTechnicalIndicatorsRequest(connectionId, data) {
    const { pair, timeframe, indicator, period, from, to } = data;
    
    try {
      const historicalData = await this.getHistoricalData(pair, timeframe, from, to);
      const indicatorData = this.calculateTechnicalIndicator(historicalData, indicator, period);
      
      this.sendToConnection(connectionId, {
        type: 'TECHNICAL_INDICATORS',
        pair,
        timeframe,
        indicator,
        data: indicatorData
      });
      
    } catch (error) {
      this.logger.error('Technical indicators calculation failed', error);
      this.sendError(connectionId, 'INDICATOR_CALCULATION_ERROR');
    }
  }

  /**
   * 💾 GET HISTORICAL DATA
   */
  async getHistoricalData(pair, timeframe, from, to, limit = 1000) {
    const cacheKey = `historical:${pair}:${timeframe}:${from}:${to}:${limit}`;
    
    // Try cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Generate or fetch historical data
    const historicalData = await this.generateHistoricalData(pair, timeframe, from, to, limit);
    
    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(historicalData));
    
    return historicalData;
  }

  /**
   * 📈 GENERATE HISTORICAL DATA (Simulated - replace with real data source)
   */
  async generateHistoricalData(pair, timeframe, from, to, limit) {
    const basePrice = this.getBasePriceForPair(pair);
    const candles = [];
    
    const intervalMs = this.getTimeframeMs(timeframe);
    let currentTime = from || Date.now() - (limit * intervalMs);
    const endTime = to || Date.now();
    
    let previousClose = basePrice;
    
    for (let i = 0; i < limit && currentTime < endTime; i++) {
      const volatility = this.getVolatilityForPair(pair);
      const change = (Math.random() - 0.5) * volatility * previousClose;
      const open = previousClose;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * volatility * 0.5;
      const low = Math.min(open, close) - Math.random() * volatility * 0.5;
      const volume = Math.floor(Math.random() * 1000) + 100;
      
      candles.push({
        timestamp: currentTime,
        open: this.roundToPips(open),
        high: this.roundToPips(high),
        low: this.roundToPips(low),
        close: this.roundToPips(close),
        volume
      });
      
      previousClose = close;
      currentTime += intervalMs;
    }
    
    return candles;
  }

  /**
   * 🧮 CALCULATE TECHNICAL INDICATORS
   */
  calculateTechnicalIndicator(data, indicator, period) {
    const prices = data.map(d => d.close);
    
    switch (indicator.toUpperCase()) {
      case 'SMA':
        return this.technicalIndicators.calculateSMA(prices, period);
        
      case 'EMA':
        return this.technicalIndicators.calculateEMA(prices, period);
        
      case 'RSI':
        return this.technicalIndicators.calculateRSI(prices, period);
        
      case 'MACD':
        return this.technicalIndicators.calculateMACD(prices);
        
      case 'BOLLINGER_BANDS':
        return this.technicalIndicators.calculateBollingerBands(prices, period);
        
      case 'STOCHASTIC':
        return this.technicalIndicators.calculateStochastic(data, period);
        
      default:
        throw new Error(`Unsupported indicator: ${indicator}`);
    }
  }

  /**
   * 🎯 HANDLE PRACTICE TRADES (Learning Feature)
   */
  async handlePracticeTrade(connectionId, tradeData) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    const { pair, direction, entryPrice, lotSize, stopLoss, takeProfit } = tradeData;
    
    try {
      // Validate trade parameters
      this.validatePracticeTrade(tradeData);
      
      // Get current market price
      const currentPrice = await this.getCurrentPrice(pair);
      
      // Simulate trade execution
      const trade = {
        id: this.generateTradeId(),
        pair,
        direction,
        entryPrice,
        currentPrice,
        lotSize,
        stopLoss,
        takeProfit,
        timestamp: Date.now(),
        pips: this.calculatePips(pair, entryPrice, currentPrice, direction),
        profitLoss: this.calculateProfitLoss(pair, entryPrice, currentPrice, lotSize, direction)
      };
      
      // Send trade confirmation
      this.sendToConnection(connectionId, {
        type: 'TRADE_EXECUTED',
        trade
      });
      
      // Store practice trade for learning analytics
      await this.storePracticeTrade(connection.userId, trade);
      
      this.logger.info('Practice trade executed', { 
        connectionId, 
        userId: connection.userId, 
        pair, 
        direction 
      });
      
    } catch (error) {
      this.logger.error('Practice trade failed', error, { connectionId });
      this.sendError(connectionId, 'TRADE_EXECUTION_ERROR');
    }
  }

  /**
   * 💾 STORE PRACTICE TRADE
   */
  async storePracticeTrade(userId, trade) {
    try {
      await this.prisma.practiceTrade.create({
        data: {
          userId,
          tradeId: trade.id,
          pair: trade.pair,
          direction: trade.direction,
          entryPrice: trade.entryPrice,
          lotSize: trade.lotSize,
          stopLoss: trade.stopLoss,
          takeProfit: trade.takeProfit,
          currentPrice: trade.currentPrice,
          pips: trade.pips,
          profitLoss: trade.profitLoss,
          metadata: {
            timestamp: trade.timestamp,
            connectionType: 'realtime_charts'
          }
        }
      });
      
      // Update cache for quick analytics
      const analyticsKey = `user:analytics:${userId}:trades`;
      await this.redis.incr(analyticsKey);
      
    } catch (error) {
      this.logger.error('Failed to store practice trade', error, { userId });
    }
  }

  /**
   * 🔧 UTILITY METHODS
   */
  
  getBasePriceForPair(pair) {
    const basePrices = {
      'EUR/USD': 1.1000,
      'GBP/USD': 1.2800,
      'USD/JPY': 150.00,
      'USD/CHF': 0.8800,
      'AUD/USD': 0.6600,
      'USD/CAD': 1.3500,
      'NZD/USD': 0.6100,
      'EUR/GBP': 0.8600,
      'EUR/JPY': 165.00,
      'GBP/JPY': 192.00
    };
    
    return basePrices[pair] || 1.0000;
  }

  getVolatilityForPair(pair) {
    const volatilities = {
      'EUR/USD': 0.0005,
      'GBP/USD': 0.0006,
      'USD/JPY': 0.0070,
      'USD/CHF': 0.0004,
      'AUD/USD': 0.0007,
      'USD/CAD': 0.0005,
      'NZD/USD': 0.0008,
      'EUR/GBP': 0.0004,
      'EUR/JPY': 0.0080,
      'GBP/JPY': 0.0090
    };
    
    return volatilities[pair] || 0.0005;
  }

  roundToPips(price) {
    return Math.round(price * 100000) / 100000;
  }

  getTimeframeMs(timeframe) {
    const intervals = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000,
      '1w': 604800000
    };
    
    return intervals[timeframe] || 60000;
  }

  calculatePips(pair, entryPrice, currentPrice, direction) {
    const priceDiff = direction === 'BUY' ? currentPrice - entryPrice : entryPrice - currentPrice;
    
    // Handle JPY pairs (2 decimal places for most, 3 for JPY)
    if (pair.includes('JPY')) {
      return this.roundToPips(priceDiff * 100);
    }
    
    return this.roundToPips(priceDiff * 10000);
  }

  calculateProfitLoss(pair, entryPrice, currentPrice, lotSize, direction) {
    const pips = this.calculatePips(pair, entryPrice, currentPrice, direction);
    const pipValue = 10; // Standard lot pip value
    return pips * pipValue * lotSize;
  }

  /**
   * 🛡️ VALIDATION METHODS
   */
  
  validateConnectionLimits(userId) {
    let userConnections = 0;
    
    for (const connection of this.connections.values()) {
      if (connection.userId === userId) {
        userConnections++;
      }
    }
    
    if (userConnections >= this.config.maxConnectionsPerUser) {
      throw new Error('MAX_CONNECTIONS_EXCEEDED');
    }
  }

  validatePracticeTrade(tradeData) {
    const { pair, direction, entryPrice, lotSize, stopLoss, takeProfit } = tradeData;
    
    if (!this.config.supportedPairs.includes(pair)) {
      throw new Error('UNSUPPORTED_CURRENCY_PAIR');
    }
    
    if (!['BUY', 'SELL'].includes(direction)) {
      throw new Error('INVALID_TRADE_DIRECTION');
    }
    
    if (lotSize <= 0 || lotSize > 100) {
      throw new Error('INVALID_LOT_SIZE');
    }
    
    // Validate risk management
    if (stopLoss && takeProfit) {
      const riskRewardRatio = Math.abs(takeProfit - entryPrice) / Math.abs(entryPrice - stopLoss);
      if (riskRewardRatio < 1) {
        throw new Error('RISK_REWARD_RATIO_TOO_LOW');
      }
    }
  }

  validateMessageStructure(message) {
    return message && 
           typeof message.type === 'string' && 
           typeof message.data === 'object';
  }

  /**
   * 🔄 CONNECTION MANAGEMENT
   */
  
  handleConnectionClose(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.logger.info('Chart connection closed', { 
        connectionId, 
        userId: connection.userId,
        duration: Date.now() - connection.createdAt 
      });
      
      this.connections.delete(connectionId);
    }
  }

  handleConnectionError(connectionId, error) {
    this.logger.error('Chart connection error', error, { connectionId });
    this.handleConnectionClose(connectionId);
  }

  sendToConnection(connectionId, message) {
    const connection = this.connections.get(connectionId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
      try {
        connection.ws.send(JSON.stringify(message));
      } catch (error) {
        this.logger.error('Failed to send message to connection', error, { connectionId });
        this.handleConnectionClose(connectionId);
      }
    }
  }

  sendError(connectionId, errorCode, details = null) {
    this.sendToConnection(connectionId, {
      type: 'ERROR',
      errorCode,
      details,
      timestamp: Date.now()
    });
  }

  /**
   * 🔥 WARM UP CHART CACHE
   */
  async warmUpChartCache() {
    try {
      for (const pair of this.config.supportedPairs) {
        for (const timeframe of this.config.timeframes) {
          const cacheKey = `market:initial:${pair}:${timeframe}`;
          const initialData = await this.generateHistoricalData(pair, timeframe, null, null, 100);
          
          await this.redis.setex(cacheKey, 600, JSON.stringify(initialData)); // 10 minutes
        }
      }
      
      this.logger.info('Chart cache warmed up successfully');
    } catch (error) {
      this.logger.error('Failed to warm up chart cache', error);
    }
  }

  /**
   * 🗄️ DATA STORAGE METHODS
   */
  
  async storeHistoricalTick(pair, tickData) {
    const storageKey = `ticks:${pair}:${Date.now()}`;
    await this.redis.setex(storageKey, 86400, JSON.stringify(tickData)); // 24 hours
  }

  async getCurrentMarketData(pair, timeframe) {
    const cacheKey = `market:current:${pair}:${timeframe}`;
    
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const data = await this.generateHistoricalData(pair, timeframe, null, null, 50);
    await this.redis.setex(cacheKey, 30, JSON.stringify(data)); // 30 seconds
    
    return data;
  }

  async getCurrentPrice(pair) {
    const cacheKey = `market:latest:${pair}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      const tick = JSON.parse(cached);
      return (tick.bid + tick.ask) / 2;
    }
    
    return this.getBasePriceForPair(pair);
  }

  /**
   * 🆔 GENERATION METHODS
   */
  
  generateConnectionId() {
    return `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateTradeId() {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  parseMessage(rawData) {
    try {
      return JSON.parse(rawData.toString());
    } catch (error) {
      throw new Error('INVALID_JSON_FORMAT');
    }
  }

  /**
   * 🧹 CLEANUP RESOURCES
   */
  async destroy() {
    try {
      // Close all WebSocket connections
      for (const [connectionId, connection] of this.connections) {
        connection.ws.close(1001, 'Server shutdown');
      }
      
      // Destroy market data feeds
      for (const [pair, feed] of this.marketDataFeeds) {
        if (feed.destroy) {
          feed.destroy();
        }
      }
      
      await this.redis.quit();
      await this.prisma.$disconnect();
      
      this.connections.clear();
      this.marketDataFeeds.clear();
      this.removeAllListeners();
      
      this.logger.info('Real-time charts system shutdown complete');
    } catch (error) {
      this.logger.error('Error during real-time charts cleanup', error);
    }
  }

  /**
   * 📊 GET SYSTEM STATISTICS
   */
  async getSystemStatistics() {
    return {
      activeConnections: this.connections.size,
      activeFeeds: this.marketDataFeeds.size,
      supportedPairs: this.config.supportedPairs.length,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
}

// Export singleton instance
module.exports = new RealtimeCharts();