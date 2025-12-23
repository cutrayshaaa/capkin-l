// Performance monitoring utilities

interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100; // Keep only last 100 metrics

  // Measure API call performance
  async measureApiCall<T>(
    name: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    const timestamp = Date.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - start;
      
      this.addMetric({
        name,
        duration,
        timestamp,
        success: true
      });
      
      // if (import.meta.env.VITE_DEBUG_MODE === 'true') {
      // }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.addMetric({
        name,
        duration,
        timestamp,
        success: false,
        error: errorMessage
      });
      
      // if (import.meta.env.VITE_DEBUG_MODE === 'true') {
      // }
      
      throw error;
    }
  }

  // Measure component render performance
  measureRender(componentName: string, renderFn: () => void): void {
    const start = performance.now();
    const timestamp = Date.now();
    
    try {
      renderFn();
      const duration = performance.now() - start;
      
      this.addMetric({
        name: `render:${componentName}`,
        duration,
        timestamp,
        success: true
      });
      
      // if (import.meta.env.VITE_DEBUG_MODE === 'true' && duration > 16) { // Only log slow renders (>16ms)
      // }
    } catch (error) {
      const duration = performance.now() - start;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.addMetric({
        name: `render:${componentName}`,
        duration,
        timestamp,
        success: false,
        error: errorMessage
      });
      

    }
  }

  // Measure function execution time
  async measureFunction<T>(
    name: string,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const start = performance.now();
    const timestamp = Date.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.addMetric({
        name,
        duration,
        timestamp,
        success: true
      });
      
      // if (import.meta.env.VITE_DEBUG_MODE === 'true') {
      // }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.addMetric({
        name,
        duration,
        timestamp,
        success: false,
        error: errorMessage
      });
      
      // if (import.meta.env.VITE_DEBUG_MODE === 'true') {
      // }
      
      throw error;
    }
  }

  // Add metric to the list
  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the last maxMetrics entries
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // Get performance statistics
  getStats(): {
    totalCalls: number;
    successRate: number;
    averageDuration: number;
    slowestCalls: PerformanceMetrics[];
    recentErrors: PerformanceMetrics[];
  } {
    const totalCalls = this.metrics.length;
    const successfulCalls = this.metrics.filter(m => m.success).length;
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
    
    const averageDuration = totalCalls > 0 
      ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / totalCalls 
      : 0;
    
    const slowestCalls = [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
    
    const recentErrors = this.metrics
      .filter(m => !m.success)
      .slice(-10);
    
    return {
      totalCalls,
      successRate,
      averageDuration,
      slowestCalls,
      recentErrors
    };
  }

  // Get metrics by name pattern
  getMetricsByName(namePattern: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.name.includes(namePattern));
  }

  // Clear all metrics
  clearMetrics(): void {
    this.metrics = [];
  }

  // Export metrics for debugging
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export function measureApiCall<T>(
  name: string,
  apiCall: () => Promise<T>
): Promise<T> {
  return performanceMonitor.measureApiCall(name, apiCall);
}

export function measureFunction<T>(
  name: string,
  fn: () => Promise<T> | T
): Promise<T> {
  return performanceMonitor.measureFunction(name, fn);
}

export function measureRender(componentName: string, renderFn: () => void): void {
  performanceMonitor.measureRender(componentName, renderFn);
}

// React Hook for performance monitoring
export function usePerformanceMonitor() {
  const [stats, setStats] = React.useState(performanceMonitor.getStats());
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setStats(performanceMonitor.getStats());
    }, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return {
    stats,
    clearMetrics: () => {
      performanceMonitor.clearMetrics();
      setStats(performanceMonitor.getStats());
    },
    exportMetrics: () => performanceMonitor.exportMetrics()
  };
}

// Performance debugging component
export function PerformanceDebugger() {
  const { stats, clearMetrics, exportMetrics } = usePerformanceMonitor();
  
  if (import.meta.env.VITE_DEBUG_MODE !== 'true') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-sm text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">Performance</h3>
        <div className="flex gap-1">
          <button 
            onClick={clearMetrics}
            className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs"
          >
            Clear
          </button>
          <button 
            onClick={() => {
              const data = exportMetrics();
              navigator.clipboard.writeText(data);
            }}
            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
          >
            Export
          </button>
        </div>
      </div>
      
      <div className="space-y-1">
        <div>Calls: {stats.totalCalls}</div>
        <div>Success: {stats.successRate.toFixed(1)}%</div>
        <div>Avg: {stats.averageDuration.toFixed(1)}ms</div>
        
        {stats.slowestCalls.length > 0 && (
          <div className="mt-2">
            <div className="font-medium">Slowest:</div>
            {stats.slowestCalls.slice(0, 3).map((call, i) => (
              <div key={i} className="text-gray-600">
                {call.name}: {call.duration.toFixed(1)}ms
              </div>
            ))}
          </div>
        )}
        
        {stats.recentErrors.length > 0 && (
          <div className="mt-2">
            <div className="font-medium text-red-600">Recent Errors:</div>
            {stats.recentErrors.slice(0, 2).map((error, i) => (
              <div key={i} className="text-red-600">
                {error.name}: {error.error}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Import React for the hook
import React from 'react';
