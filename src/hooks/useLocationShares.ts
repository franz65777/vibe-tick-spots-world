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
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match interface
      const transformedData = data?.map(share => ({
        ...share,
        user: Array.isArray(share.profiles) ? share.profiles[0] : share.profiles
      })).filter(share => share.user) || [];

      setShares(transformedData as LocationShare[]);
    } catch (error) {
      console.error('Error fetching location shares:', error);
    } finally {
      setLoading(false);
    }
  };

  return { shares, loading, refetch: fetchShares };
};