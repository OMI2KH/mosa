// learning/realtime-chart.jsx

/**
 * 🎯 ENTERPRISE REAL-TIME TRADING CHARTS
 * Production-ready Forex/Crypto trading charts for Mosa Forge
 * Features: Live data, technical indicators, drawing tools, performance optimization
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  AppState,
  Platform 
} from 'react-native';
import { debounce, throttle } from 'lodash';
import { LineChart, CandlestickChart } from 'react-native-wagmi-charts';
import { TechnicalIndicators } from './components/technical-indicators';
import { DrawingTools } from './components/drawing-tools';
import { ChartControls } from './components/chart-controls';
import { useChartWebSocket } from '../hooks/use-chart-websocket';
import { useChartPerformance } from '../hooks/use-chart-performance';
import { ChartErrorBoundary } from './components/chart-error-boundary';
import { 
  ChartDataService, 
  RESOLUTION 
} from '../services/chart-data-service';
import { 
  AnalyticsService, 
  CHART_EVENTS 
} from '../services/analytics-service';

// Constants
const CHART_HEIGHT = 400;
const UPDATE_THROTTLE_MS = 100;
const DATA_POINTS_LIMIT = 1000;
const WEBSOCKET_RECONNECT_DELAY = 5000;

/**
 * 🎯 Main RealTimeChart Component
 */
const RealTimeChart = React.memo(({
  symbol = 'EUR/USD',
  resolution = RESOLUTION.M15,
  showIndicators = true,
  showDrawingTools = true,
  autoRefresh = true,
  onChartReady = () => {},
  onChartError = () => {},
  theme = 'dark',
  userId = null,
  sessionId = null
}) => {
  // Refs
  const chartRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const dataBufferRef = useRef([]);
  const lastUpdateRef = useRef(Date.now());
  
  // State
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [activeIndicators, setActiveIndicators] = useState(['MA20', 'VOLUME']);
  const [timeframe, setTimeframe] = useState(resolution);
  const [chartType, setChartType] = useState('candlestick');

  // Services
  const chartDataService = useRef(new ChartDataService());
  const analyticsService = useRef(new AnalyticsService());

  // Custom Hooks
  const {
    connect,
    disconnect,
    lastMessage,
    connectionStatus
  } = useChartWebSocket({
    symbol,
    resolution: timeframe,
    onMessage: handleWebSocketMessage,
    onError: handleWebSocketError,
    onReconnect: handleWebSocketReconnect
  });

  const {
    startPerformanceMonitoring,
    stopPerformanceMonitoring,
    getPerformanceMetrics
  } = useChartPerformance();

  /**
   * 🎯 Handle WebSocket Messages
   */
  function handleWebSocketMessage(data) {
    try {
      if (!data || !data.price) return;

      const newDataPoint = {
        timestamp: data.timestamp || Date.now(),
        open: parseFloat(data.open),
        high: parseFloat(data.high),
        low: parseFloat(data.low),
        close: parseFloat(data.price),
        volume: parseFloat(data.volume) || 0
      };

      // Add to buffer
      dataBufferRef.current.push(newDataPoint);
      
      // Throttled update
      throttledDataUpdate();

      // Analytics
      analyticsService.current.trackEvent(CHART_EVENTS.DATA_RECEIVED, {
        symbol,
        resolution: timeframe,
        dataPoints: dataBufferRef.current.length
      });

    } catch (err) {
      handleError('WebSocket message processing failed', err);
    }
  }

  /**
   * 🎯 Throttled Data Update
   */
  const throttledDataUpdate = useMemo(
    () => throttle(() => {
      if (dataBufferRef.current.length === 0) return;

      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;

      if (timeSinceLastUpdate >= UPDATE_THROTTLE_MS) {
        processDataBuffer();
        lastUpdateRef.current = now;
      }
    }, UPDATE_THROTTLE_MS),
    []
  );

  /**
   * 🎯 Process Data Buffer
   */
  const processDataBuffer = useCallback(() => {
    try {
      const newData = [...dataBufferRef.current];
      dataBufferRef.current = [];

      setChartData(prevData => {
        const updatedData = [...prevData, ...newData];
        
        // Limit data points for performance
        if (updatedData.length > DATA_POINTS_LIMIT) {
          return updatedData.slice(-DATA_POINTS_LIMIT);
        }
        
        return updatedData;
      });

    } catch (err) {
      handleError('Data buffer processing failed', err);
    }
  }, []);

  /**
   * 🎯 Handle WebSocket Errors
   */
  function handleWebSocketError(error) {
    handleError('WebSocket connection error', error);
    setIsConnected(false);
    
    analyticsService.current.trackEvent(CHART_EVENTS.CONNECTION_ERROR, {
      symbol,
      error: error.message
    });
  }

  /**
   * 🎯 Handle WebSocket Reconnect
   */
  function handleWebSocketReconnect(attempt) {
    analyticsService.current.trackEvent(CHART_EVENTS.RECONNECT_ATTEMPT, {
      symbol,
      attempt,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 🎯 Error Handler
   */
  const handleError = useCallback((message, error) => {
    console.error(`[RealTimeChart] ${message}:`, error);
    setError(message);
    onChartError(error);
    
    analyticsService.current.trackError('chart_error', {
      message,
      error: error.message,
      symbol,
      userId,
      sessionId
    });
  }, [onChartError, symbol, userId, sessionId]);

  /**
   * 🎯 Initialize Chart Data
   */
  const initializeChartData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const historicalData = await chartDataService.current.getHistoricalData({
        symbol,
        resolution: timeframe,
        limit: 200
      });

      if (historicalData && historicalData.length > 0) {
        setChartData(historicalData);
        dataBufferRef.current = [];
      }

      setIsLoading(false);
      onChartReady();

      analyticsService.current.trackEvent(CHART_EVENTS.CHART_LOADED, {
        symbol,
        resolution: timeframe,
        dataPoints: historicalData.length
      });

    } catch (err) {
      handleError('Historical data loading failed', err);
      setIsLoading(false);
    }
  }, [symbol, timeframe, onChartReady, handleError]);

  /**
   * 🎯 Handle Timeframe Change
   */
  const handleTimeframeChange = useCallback(async (newTimeframe) => {
    try {
      setTimeframe(newTimeframe);
      
      // Disconnect current WebSocket
      disconnect();
      
      // Load new historical data
      await initializeChartData();
      
      // Reconnect with new timeframe
      connect();

      analyticsService.current.trackEvent(CHART_EVENTS.TIMEFRAME_CHANGED, {
        symbol,
        oldTimeframe: timeframe,
        newTimeframe
      });

    } catch (err) {
      handleError('Timeframe change failed', err);
    }
  }, [timeframe, symbol, disconnect, connect, initializeChartData]);

  /**
   * 🎯 Handle Chart Type Change
   */
  const handleChartTypeChange = useCallback((newChartType) => {
    setChartType(newChartType);
    
    analyticsService.current.trackEvent(CHART_EVENTS.CHART_TYPE_CHANGED, {
      symbol,
      chartType: newChartType
    });
  }, [symbol]);

  /**
   * 🎯 Handle App State Changes
   */
  const handleAppStateChange = useCallback((nextAppState) => {
    if (
      appStateRef.current.match(/inactive|background/) &&
      nextAppState === 'active' &&
      autoRefresh
    ) {
      // App came to foreground - reconnect
      connect();
    } else if (
      appStateRef.current === 'active' &&
      nextAppState.match(/inactive|background/) 
    ) {
      // App going to background - disconnect to save battery
      disconnect();
    }
    
    appStateRef.current = nextAppState;
  }, [autoRefresh, connect, disconnect]);

  /**
   * 🎯 Export Chart Data
   */
  const exportChartData = useCallback(() => {
    try {
      const exportData = {
        symbol,
        timeframe,
        data: chartData,
        exportedAt: new Date().toISOString(),
        indicators: activeIndicators
      };

      // In a real app, this would save to file or share
      console.log('Exporting chart data:', exportData);
      
      analyticsService.current.trackEvent(CHART_EVENTS.DATA_EXPORTED, {
        symbol,
        dataPoints: chartData.length
      });

      return exportData;
    } catch (err) {
      handleError('Data export failed', err);
    }
  }, [chartData, symbol, timeframe, activeIndicators, handleError]);

  /**
   * 🎯 Effect: Initialize on mount
   */
  useEffect(() => {
    startPerformanceMonitoring('chart_initialization');
    
    const init = async () => {
      await initializeChartData();
      connect();
    };

    init();

    return () => {
      stopPerformanceMonitoring();
      disconnect();
    };
  }, []);

  /**
   * 🎯 Effect: App state monitoring
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  /**
   * 🎯 Effect: Performance analytics
   */
  useEffect(() => {
    if (!isLoading && chartData.length > 0) {
      const metrics = getPerformanceMetrics();
      
      analyticsService.current.trackPerformance('chart_render', {
        symbol,
        dataPoints: chartData.length,
        renderTime: metrics.renderTime,
        memoryUsage: metrics.memoryUsage,
        platform: Platform.OS
      });
    }
  }, [isLoading, chartData.length, getPerformanceMetrics, symbol]);

  /**
   * 🎯 Render Chart based on type
   */
  const renderChart = () => {
    if (chartData.length === 0) {
      return renderEmptyState();
    }

    const chartProps = {
      data: chartData,
      height: CHART_HEIGHT,
      onDataUpdate: throttledDataUpdate,
      theme: theme === 'dark' ? 'dark' : 'light'
    };

    try {
      switch (chartType) {
        case 'candlestick':
          return (
            <CandlestickChart.Provider data={chartData}>
              <CandlestickChart height={CHART_HEIGHT}>
                <CandlestickChart.Candles />
                <CandlestickChart.Crosshair>
                  <CandlestickChart.Tooltip />
                </CandlestickChart.Crosshair>
              </CandlestickChart>
            </CandlestickChart.Provider>
          );

        case 'line':
          return (
            <LineChart.Provider data={chartData}>
              <LineChart height={CHART_HEIGHT}>
                <LineChart.Path />
                <LineChart.Crosshair>
                  <LineChart.Tooltip />
                </LineChart.Crosshair>
              </LineChart>
            </LineChart.Provider>
          );

        default:
          return renderEmptyState();
      }
    } catch (err) {
      handleError('Chart rendering failed', err);
      return renderErrorState();
    }
  };

  /**
   * 🎯 Render Empty State
   */
  const renderEmptyState = () => (
    <View style={[styles.chartContainer, styles.centerContent]}>
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>
          {isLoading ? 'Loading market data...' : 'No chart data available'}
        </Text>
        {error && (
          <Text style={styles.errorText}>
            {error}
          </Text>
        )}
      </View>
    </View>
  );

  /**
   * 🎯 Render Error State
   */
  const renderErrorState = () => (
    <View style={[styles.chartContainer, styles.centerContent]}>
      <View style={styles.errorState}>
        <Text style={styles.errorStateText}>
          Chart temporarily unavailable
        </Text>
        <Text style={styles.errorStateSubtext}>
          Please check your connection and try again
        </Text>
      </View>
    </View>
  );

  /**
   * 🎯 Main Render
   */
  return (
    <ChartErrorBoundary 
      onError={handleError}
      userId={userId}
      sessionId={sessionId}
    >
      <View style={styles.container}>
        {/* Chart Controls */}
        <ChartControls
          timeframe={timeframe}
          chartType={chartType}
          onTimeframeChange={handleTimeframeChange}
          onChartTypeChange={handleChartTypeChange}
          onExportData={exportChartData}
          connectionStatus={connectionStatus}
          theme={theme}
        />

        {/* Main Chart */}
        <View style={styles.chartContainer}>
          {renderChart()}
        </View>

        {/* Technical Indicators */}
        {showIndicators && (
          <TechnicalIndicators
            data={chartData}
            activeIndicators={activeIndicators}
            onIndicatorsChange={setActiveIndicators}
            theme={theme}
          />
        )}

        {/* Drawing Tools */}
        {showDrawingTools && (
          <DrawingTools
            chartRef={chartRef}
            onDrawingComplete={(drawing) => {
              analyticsService.current.trackEvent(CHART_EVENTS.DRAWING_CREATED, {
                symbol,
                drawingType: drawing.type
              });
            }}
            theme={theme}
          />
        )}

        {/* Connection Status */}
        <View style={styles.statusBar}>
          <Text style={[
            styles.statusText,
            { color: isConnected ? '#4CAF50' : '#F44336' }
          ]}>
            {isConnected ? 'Live' : 'Disconnected'} • {symbol} • {timeframe}
          </Text>
        </View>
      </View>
    </ChartErrorBoundary>
  );
});

/**
 * 🎯 Styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  chartContainer: {
    height: CHART_HEIGHT,
    backgroundColor: '#2D2D2D',
    borderWidth: 1,
    borderColor: '#404040',
    borderRadius: 8,
    margin: 8,
    overflow: 'hidden',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorState: {
    alignItems: 'center',
    padding: 20,
  },
  errorStateText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorStateSubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  statusBar: {
    padding: 8,
    backgroundColor: '#2D2D2D',
    borderTopWidth: 1,
    borderTopColor: '#404040',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

// Performance optimization
RealTimeChart.whyDidYouRender = {
  logOnDifferentValues: false,
  customName: 'RealTimeChart'
};

// Display name for dev tools
RealTimeChart.displayName = 'RealTimeChart';

export default RealTimeChart;

/**
 * 🎯 Prop Types Validation (for development)
 */
if (__DEV__) {
  RealTimeChart.propTypes = {
    symbol: PropTypes.string,
    resolution: PropTypes.oneOf(Object.values(RESOLUTION)),
    showIndicators: PropTypes.bool,
    showDrawingTools: PropTypes.bool,
    autoRefresh: PropTypes.bool,
    onChartReady: PropTypes.func,
    onChartError: PropTypes.func,
    theme: PropTypes.oneOf(['dark', 'light']),
    userId: PropTypes.string,
    sessionId: PropTypes.string,
  };

  RealTimeChart.defaultProps = {
    symbol: 'EUR/USD',
    resolution: RESOLUTION.M15,
    showIndicators: true,
    showDrawingTools: true,
    autoRefresh: true,
    onChartReady: () => {},
    onChartError: () => {},
    theme: 'dark',
  };
}