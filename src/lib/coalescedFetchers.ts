/**
 * Coalesced Fetchers for Homepage Data
 * 
 * Prevents "thundering herd" by deduplicating identical concurrent requests.
 * Critical for 20k+ concurrent users to prevent server overload.
 */

import { supabase } from '@/integrations/supabase/client';
import { coalesce, createCache } from './requestCoalescing';

// Cache for onboarding status (30 seconds)
const onboardingCache = createCache<{ completed: boolean }>(30_000);

// Cache for stories (10 seconds - shorter because stories update more frequently)
const storiesCache = createCache<any[]>(10_000);

/**
 * Coalesced onboarding status check.
 * Multiple components checking onboarding simultaneously will share one DB call.
 */
export async function fetchOnboardingStatus(userId: string): Promise<boolean> {
  const cacheKey = `onboarding:${userId}`;
  
  // Check cache first
  const cached = onboardingCache.get(cacheKey);
  if (cached !== undefined) {
    return cached.completed;
  }
  
  // Coalesce concurrent requests
  return coalesce(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error checking onboarding status:', error);
        return true; // Default to completed on error
      }
      
      const completed = data?.onboarding_completed ?? false;
      onboardingCache.set(cacheKey, { completed });
      return completed;
    },
    100 // 100ms deduplication window
  );
}

/**
 * Coalesced stories fetch.
 * Prevents multiple components from fetching stories simultaneously.
 */
export async function fetchStoriesCoalesced(userId: string | null): Promise<any[]> {
  const cacheKey = `stories:${userId || 'anon'}`;
  
  // Check cache first
  const cached = storiesCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  
  // Coalesce concurrent requests
  return coalesce(
    cacheKey,
    async () => {
      let query = supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userId) {
        query = query.or(`expires_at.gt.${new Date().toISOString()},user_id.eq.${userId}`);
      } else {
        query = query.gt('expires_at', new Date().toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching stories:', error);
        return [];
      }
      
      const stories = data || [];
      storiesCache.set(cacheKey, stories);
      return stories;
    },
    100 // 100ms deduplication window
  );
}

/**
 * Coalesced location lookup by ID.
 * Used for navigation state handling when opening locations from notifications.
 */
export async function fetchLocationById(locationId: string): Promise<{
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  address: string | null;
} | null> {
  return coalesce(
    `location:${locationId}`,
    async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name, category, latitude, longitude, address')
        .eq('id', locationId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching location:', error);
        return null;
      }
      
      return data;
    },
    500 // 500ms window for location lookups (they're often repeated)
  );
}

/**
 * Clear all caches - useful for logout or manual refresh.
 */
export function clearAllCaches(): void {
  onboardingCache.clear();
  storiesCache.clear();
}

/**
 * Invalidate specific user's cached data.
 */
export function invalidateUserCache(userId: string): void {
  onboardingCache.del(`onboarding:${userId}`);
  storiesCache.del(`stories:${userId}`);
}
