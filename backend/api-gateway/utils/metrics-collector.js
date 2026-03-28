// api-gateway/utils/metrics-collector.js

/**
 * 📊 Metrics Collector for Circuit Breaker
 */

class MetricsCollector {
  constructor(options = {}) {
    this.service = options.service || 'unknown';
    this.circuitBreaker = options.circuitBreaker || false;
  }

  recordCounter(name, value, tags = {}) {
    // In production, this would send to Prometheus/DataDog/etc.
    const metric = {
      type: 'counter',
      name,
      value,
      tags: { service: this.service, ...tags },
      timestamp: new Date().toISOString()
    };

    if (this.circuitBreaker) {
      // Circuit breaker specific metrics handling
      console.log('[METRIC]', JSON.stringify(metric));
    }
  }

  recordGauge(name, value, tags = {}) {
    const metric = {
      type: 'gauge',
      name,
      value,
      tags: { service: this.service, ...tags },
      timestamp: new Date().toISOString()
    };

    console.log('[METRIC]', JSON.stringify(metric));
  }

  recordHistogram(name, value, tags = {}) {
    const metric = {
      type: 'histogram',
      name,
      value,
      tags: { service: this.service, ...tags },
      timestamp: new Date().toISOString()
    };

    console.log('[METRIC]', JSON.stringify(metric));
  }
}

module.exports = {
  MetricsCollector
};
