import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

  useEffect(() => {
    if (user) {
      fetchShares();
      
      // Subscribe to realtime updates
      const subscription = supabase
        .channel('location_shares_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_location_shares'
        }, () => {
          fetchShares();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchShares = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_location_shares')
        .select('*')
        .gt('expires_at', new Date().toISOString())
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

      // Transform data to match interface
      const transformedData = (data || [])
        .map((share: any) => ({
          ...share,
          user: profilesMap[share.user_id]
        }))
        .filter((share: any) => share.user) || [];

      setShares(transformedData as LocationShare[]);
    } catch (error) {
      console.error('Error fetching location shares:', error);
    } finally {
      setLoading(false);
    }
  };

  return { shares, loading, refetch: fetchShares };
};