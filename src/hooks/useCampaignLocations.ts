/**
 * Hook to fetch and cache marketing campaign data for map locations
 * Uses request coalescing and memoization to prevent redundant queries
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { filterValidUUIDs } from '@/utils/uuidValidation';

interface CampaignData {
  locationId: string;
  campaignType: string;
}

interface UseCampaignLocationsResult {
  campaignMap: Map<string, string>; // locationId -> campaignType
  campaignLocationIds: Set<string>;
  loading: boolean;
  refetch: (locationIds: string[]) => void;
}

// Global in-memory cache for campaigns
const campaignCache = {
  data: new Map<string, string>(),
  lastFetch: 0,
  fetchedIds: new Set<string>(),
  TTL: 5 * 60 * 1000, // 5 minutes
};

// Request coalescing - prevent duplicate concurrent fetches
let pendingFetch: Promise<CampaignData[]> | null = null;
let pendingLocationIds: string[] = [];

export function useCampaignLocations(locationIds: string[]): UseCampaignLocationsResult {
  const [campaignMap, setCampaignMap] = useState<Map<string, string>>(() => {
    // Initialize from cache if available
    const now = Date.now();
    if (now - campaignCache.lastFetch < campaignCache.TTL) {
      return new Map(campaignCache.data);
    }
    return new Map();
  });
  const [loading, setLoading] = useState(false);
  const lastFetchedIdsRef = useRef<string>('');

  // Compute which IDs we actually need to fetch (not in cache)
  const idsToFetch = useMemo(() => {
    const now = Date.now();
    const cacheValid = now - campaignCache.lastFetch < campaignCache.TTL;
    
    if (!cacheValid) {
      // Cache expired, fetch all
      return locationIds.filter(Boolean);
    }
    
    // Only fetch IDs not in cache
    return locationIds.filter(id => id && !campaignCache.fetchedIds.has(id));
  }, [locationIds]);

  const fetchCampaigns = useCallback(async (ids: string[]) => {
    // Filter out non-UUID strings (e.g., Google Place IDs) to prevent DB errors
    const validUUIDs = filterValidUUIDs(ids);
    if (validUUIDs.length === 0) return;

    // Request coalescing: if there's already a pending fetch, add to it
    if (pendingFetch) {
      // Add new IDs to pending request (only valid UUIDs)
      validUUIDs.forEach(id => {
        if (!pendingLocationIds.includes(id)) {
          pendingLocationIds.push(id);
        }
      });
      // Wait for the existing fetch to complete
      await pendingFetch;
      // Update state from cache
      setCampaignMap(new Map(campaignCache.data));
      return;
    }

    setLoading(true);
    pendingLocationIds = [...validUUIDs];

    try {
      const fetchPromise = (async () => {
        const { data, error } = await supabase
          .from('marketing_campaigns')
          .select('location_id, campaign_type')
          .in('location_id', pendingLocationIds)
          .eq('is_active', true)
          .gt('end_date', new Date().toISOString());
        
        if (error) throw error;
        return (data || []).map(c => ({
          locationId: c.location_id,
          campaignType: c.campaign_type,
        }));
      })();

      pendingFetch = fetchPromise;
      const campaigns = await fetchPromise;

      // Update cache
      campaigns.forEach(c => {
        campaignCache.data.set(c.locationId, c.campaignType);
      });
      
      // Mark all fetched IDs as cached (even if no campaign found)
      pendingLocationIds.forEach(id => {
        campaignCache.fetchedIds.add(id);
      });
      
      campaignCache.lastFetch = Date.now();

      // Update state
      setCampaignMap(new Map(campaignCache.data));
    } catch (error) {
      console.warn('Failed to fetch campaign locations:', error);
    } finally {
      setLoading(false);
      pendingFetch = null;
      pendingLocationIds = [];
    }
  }, []);

  // Fetch on mount or when new IDs appear
  useEffect(() => {
    const idsKey = idsToFetch.sort().join(',');
    if (idsKey === lastFetchedIdsRef.current) return;
    if (idsToFetch.length === 0) return;
    
    lastFetchedIdsRef.current = idsKey;
    fetchCampaigns(idsToFetch);
  }, [idsToFetch, fetchCampaigns]);

  // Derived set for quick lookup
  const campaignLocationIds = useMemo(() => {
    return new Set(campaignMap.keys());
  }, [campaignMap]);

  const refetch = useCallback((ids: string[]) => {
    // Force refetch by clearing cache for these IDs
    ids.forEach(id => campaignCache.fetchedIds.delete(id));
    fetchCampaigns(ids);
  }, [fetchCampaigns]);

  return {
    campaignMap,
    campaignLocationIds,
    loading,
    refetch,
  };
}

// Clear cache (useful for testing or when campaigns are updated)
export function clearCampaignCache() {
  campaignCache.data.clear();
  campaignCache.fetchedIds.clear();
  campaignCache.lastFetch = 0;
}
