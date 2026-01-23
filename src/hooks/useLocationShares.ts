import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeEvent } from './useCentralizedRealtime';

interface LocationShare {
  id: string;
  user_id: string;
  location_id: string | null;
  location_name: string;
  location_address: string | null;
  latitude: number;
  longitude: number;
  share_type: string;
  expires_at: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export const useLocationShares = () => {
  const { user } = useAuth();
  const [shares, setShares] = useState<LocationShare[]>([]);
  const [loading, setLoading] = useState(true);
  const expiryTimerRef = useRef<number | null>(null);

  const fetchShares = useCallback(async () => {
    if (!user) return;
    
    try {
      const now = new Date();
      const { data, error } = await supabase
        .from('user_location_shares')
        .select('*')
        .gt('expires_at', now.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related profiles separately (no FK relation in schema cache)
      const userIds = Array.from(new Set((data || []).map((s: any) => s.user_id).filter(Boolean)));
      let profilesMap: Record<string, { id: string; username: string; avatar_url: string | null }> = {};

      if (userIds.length) {
        const { data: profiles, error: pError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds as string[]);
        if (pError) throw pError;
        profilesMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
      }

      // Transform data and double-check expiration on client side
      const transformedData = (data || [])
        .map((share: any) => ({
          ...share,
          user: profilesMap[share.user_id]
        }))
        .filter((share: any) => {
          if (!share.user) return false;
          // Extra client-side check to ensure no expired shares
          try {
            return new Date(share.expires_at) > now;
          } catch {
            return false;
          }
        }) || [];

      // Keep ONLY the most recent active share per user
      // The query is ordered by created_at DESC, so first occurrence is the latest
      const uniqueByUser = new Map<string, any>();
      for (const s of transformedData) {
        if (!uniqueByUser.has(s.user_id)) uniqueByUser.set(s.user_id, s);
      }
      const deduped = Array.from(uniqueByUser.values());

      // Update state
      setShares(deduped as LocationShare[]);

      // Schedule automatic refresh at next expiration to remove stale shares immediately
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
      }
      const nextExpiryTs = (deduped as any[]).reduce((min: number, s: any) => {
        const ts = new Date(s.expires_at).getTime();
        return isNaN(ts) ? min : Math.min(min, ts);
      }, Number.POSITIVE_INFINITY);

      if (Number.isFinite(nextExpiryTs)) {
        const delay = Math.max(0, nextExpiryTs - now.getTime() + 250);
        expiryTimerRef.current = window.setTimeout(() => {
          fetchShares();
        }, Math.min(delay, 5 * 60 * 1000));
      }
    } catch (error) {
      console.error('Error fetching location shares:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchShares();
    }
  }, [user, fetchShares]);

  // Subscribe to centralized realtime for location share events
  useRealtimeEvent(
    ['location_share_insert', 'location_share_update', 'location_share_delete'],
    useCallback(() => {
      fetchShares();
    }, [fetchShares])
  );

  // Keep shares fresh on tab focus/visibility changes
  useEffect(() => {
    const handler = () => {
      try { fetchShares(); } catch {}
    };
    window.addEventListener('focus', handler);
    document.addEventListener('visibilitychange', handler);
    return () => {
      window.removeEventListener('focus', handler);
      document.removeEventListener('visibilitychange', handler);
    };
  }, [fetchShares]);

  // Cleanup expiry timer on unmount
  useEffect(() => {
    return () => {
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
      }
    };
  }, []);

  // Soft cleanup: periodically drop expired shares from local state
  useEffect(() => {
    const interval = setInterval(() => {
      setShares(prev => prev.filter(s => {
        try { return new Date(s.expires_at) > new Date(); } catch { return false; }
      }));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return { shares, loading, refetch: fetchShares };
};
