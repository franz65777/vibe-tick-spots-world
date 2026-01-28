/**
 * Home Page Preloader Service
 * 
 * Orchestrates parallel fetching of all home page data during splash screen.
 * Results are written directly to React Query cache for instant availability.
 */

import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import { fetchOnboardingStatus, fetchStoriesCoalesced } from '@/lib/coalescedFetchers';

interface PreloadResult {
  success: boolean;
  duration: number;
}

/**
 * Preload all critical home page data during splash screen.
 * Fetches in parallel and populates React Query cache.
 * 
 * @param userId - Current authenticated user ID
 * @returns Promise that resolves when all data is cached (or timeout)
 */
export async function preloadHomePageData(userId: string | null): Promise<PreloadResult> {
  const startTime = performance.now();
  
  if (!userId) {
    console.log('⏳ Preloader: No user, skipping data preload');
    return { success: true, duration: 0 };
  }

  console.log('⏳ Preloader: Starting home page data preload...');

  try {
    // Run all fetches in parallel
    const results = await Promise.allSettled([
      // 1. Onboarding status
      fetchOnboardingStatus(userId).then(completed => {
        queryClient.setQueryData(['onboarding', userId], completed);
        return completed;
      }),

      // 2. Stories
      fetchStoriesCoalesced(userId).then(stories => {
        queryClient.setQueryData(['stories', userId], stories);
        return stories;
      }),

      // 3. User profile
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .then(({ data }) => {
          if (data) {
            queryClient.setQueryData(['profile', userId], data);
          }
          return data;
        }),

      // 4. Following list (for feed)
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .then(({ data }) => {
          const followingIds = data?.map(f => f.following_id) || [];
          queryClient.setQueryData(['following', userId], followingIds);
          return followingIds;
        }),

      // 5. User saved locations count (for quick stats)
      supabase
        .from('user_saved_locations')
        .select('location_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .then(({ count }) => {
          queryClient.setQueryData(['saved-locations-count', userId], count || 0);
          return count;
        }),

      // 6. Notifications count (unread)
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .then(({ count }) => {
          queryClient.setQueryData(['unread-notifications-count', userId], count || 0);
          return count;
        }),
    ]);

    const duration = performance.now() - startTime;
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`✅ Preloader: Completed ${successCount}/${results.length} fetches in ${duration.toFixed(0)}ms`);
    
    // Log any failures for debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`⚠️ Preloader: Fetch ${index} failed:`, result.reason);
      }
    });

    return { success: successCount > 0, duration };
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error('❌ Preloader: Failed to preload data:', error);
    return { success: false, duration };
  }
}

/**
 * Preload with timeout - ensures splash doesn't hang forever on slow networks.
 * 
 * @param userId - Current authenticated user ID
 * @param timeoutMs - Maximum time to wait (default 5 seconds)
 */
export async function preloadWithTimeout(
  userId: string | null, 
  timeoutMs: number = 3000 // Aligned with splash screen duration
): Promise<PreloadResult> {
  return Promise.race([
    preloadHomePageData(userId),
    new Promise<PreloadResult>((resolve) => 
      setTimeout(() => {
        console.log('⏰ Preloader: Timeout reached, proceeding anyway');
        resolve({ success: true, duration: timeoutMs });
      }, timeoutMs)
    )
  ]);
}
