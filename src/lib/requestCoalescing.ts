/**
 * Request Coalescing Utility
 * 
 * Prevents "thundering herd" by batching identical concurrent requests.
 * When multiple components request the same data simultaneously,
 * only one network request is made and all callers share the result.
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

// Global cache for pending requests
const pendingRequests = new Map<string, PendingRequest<any>>();

// Default deduplication window (ms)
const DEFAULT_DEDUPE_WINDOW = 100;

/**
 * Coalesce identical requests within a time window.
 * Multiple calls with the same key will share a single network request.
 * 
 * @param key - Unique identifier for the request
 * @param fetcher - Function that performs the actual fetch
 * @param dedupeWindow - Time window (ms) to deduplicate requests (default: 100ms)
 * @returns Promise resolving to the fetch result
 * 
 * @example
 * // Multiple components calling this simultaneously only trigger one fetch
 * const user = await coalesce(
 *   `user:${userId}`,
 *   () => supabase.from('profiles').select('*').eq('id', userId).single()
 * );
 */
export async function coalesce<T>(
  key: string,
  fetcher: () => Promise<T>,
  dedupeWindow: number = DEFAULT_DEDUPE_WINDOW
): Promise<T> {
  const now = Date.now();
  const pending = pendingRequests.get(key);

  // If there's a recent pending request, return its promise
  if (pending && now - pending.timestamp < dedupeWindow) {
    return pending.promise;
  }

  // Create a new request
  const promise = fetcher().finally(() => {
    // Clean up after the dedupe window expires
    setTimeout(() => {
      const current = pendingRequests.get(key);
      if (current?.promise === promise) {
        pendingRequests.delete(key);
      }
    }, dedupeWindow);
  });

  pendingRequests.set(key, { promise, timestamp: now });
  return promise;
}

/**
 * Create a coalescing wrapper for a fetcher function.
 * Useful for creating reusable coalesced fetch functions.
 * 
 * @example
 * const fetchUser = createCoalescingFetcher(
 *   (userId: string) => `user:${userId}`,
 *   (userId: string) => supabase.from('profiles').select('*').eq('id', userId).single()
 * );
 * 
 * // Multiple calls with same userId share one request
 * await Promise.all([fetchUser('abc'), fetchUser('abc'), fetchUser('abc')]);
 */
export function createCoalescingFetcher<TArgs extends any[], TResult>(
  keyFn: (...args: TArgs) => string,
  fetcher: (...args: TArgs) => Promise<TResult>,
  dedupeWindow: number = DEFAULT_DEDUPE_WINDOW
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => {
    const key = keyFn(...args);
    return coalesce(key, () => fetcher(...args), dedupeWindow);
  };
}

/**
 * Batch multiple requests into a single request.
 * Collects individual requests within a time window and processes them together.
 * 
 * @example
 * const batcher = createBatcher<string, Profile>(
 *   async (userIds) => {
 *     const { data } = await supabase
 *       .from('profiles')
 *       .select('*')
 *       .in('id', userIds);
 *     return new Map(data?.map(p => [p.id, p]) ?? []);
 *   },
 *   50 // 50ms batch window
 * );
 * 
 * // These calls will be batched into a single query
 * const [user1, user2, user3] = await Promise.all([
 *   batcher.load('user1'),
 *   batcher.load('user2'),
 *   batcher.load('user3'),
 * ]);
 */
export function createBatcher<TKey, TValue>(
  batchFn: (keys: TKey[]) => Promise<Map<TKey, TValue>>,
  batchWindow: number = 50
) {
  let pendingKeys: TKey[] = [];
  let pendingResolvers: Map<TKey, {
    resolve: (value: TValue | undefined) => void;
    reject: (error: any) => void;
  }[]> = new Map();
  let batchTimeout: NodeJS.Timeout | null = null;

  const executeBatch = async () => {
    const keys = [...new Set(pendingKeys)];
    const resolvers = new Map(pendingResolvers);
    
    pendingKeys = [];
    pendingResolvers = new Map();
    batchTimeout = null;

    try {
      const results = await batchFn(keys);
      resolvers.forEach((callbacks, key) => {
        const value = results.get(key);
        callbacks.forEach(({ resolve }) => resolve(value));
      });
    } catch (error) {
      resolvers.forEach((callbacks) => {
        callbacks.forEach(({ reject }) => reject(error));
      });
    }
  };

  const load = (key: TKey): Promise<TValue | undefined> => {
    return new Promise((resolve, reject) => {
      pendingKeys.push(key);
      
      if (!pendingResolvers.has(key)) {
        pendingResolvers.set(key, []);
      }
      pendingResolvers.get(key)!.push({ resolve, reject });

      if (!batchTimeout) {
        batchTimeout = setTimeout(executeBatch, batchWindow);
      }
    });
  };

  const loadMany = (keys: TKey[]): Promise<(TValue | undefined)[]> => {
    return Promise.all(keys.map(load));
  };

  return { load, loadMany };
}

/**
 * Simple in-memory cache with TTL for frequently accessed data.
 */
export function createCache<T>(defaultTtl: number = 30_000) {
  const cache = new Map<string, { value: T; expiresAt: number }>();

  const get = (key: string): T | undefined => {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return undefined;
    }
    return entry.value;
  };

  const set = (key: string, value: T, ttl: number = defaultTtl): void => {
    cache.set(key, { value, expiresAt: Date.now() + ttl });
  };

  const has = (key: string): boolean => {
    return get(key) !== undefined;
  };

  const del = (key: string): void => {
    cache.delete(key);
  };

  const clear = (): void => {
    cache.clear();
  };

  const getOrSet = async (
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = defaultTtl
  ): Promise<T> => {
    const cached = get(key);
    if (cached !== undefined) return cached;

    const value = await fetcher();
    set(key, value, ttl);
    return value;
  };

  return { get, set, has, del, clear, getOrSet };
}
