/**
 * Performance monitoring service for tracking and optimizing app performance
 */

// Cache for frequently accessed data
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data or fetch if not available/expired
 */
export function getCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  duration: number = CACHE_DURATION
): Promise<T> {
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < duration) {
    console.log(`Cache hit for: ${key}`);
    return Promise.resolve(cached.data as T);
  }
  
  console.log(`Cache miss for: ${key}`);
  return fetchFn().then((data) => {
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  });
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * Measure performance of an operation
 */
export async function measurePerformance<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await operation();
    const duration = performance.now() - startTime;
    
    console.log(`[Performance] ${operationName}: ${duration.toFixed(2)}ms`);
    
    // Log slow operations
    if (duration > 1000) {
      console.warn(`[Performance] Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[Performance] ${operationName} failed after ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

/**
 * Debounce function for expensive operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for limiting execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}
