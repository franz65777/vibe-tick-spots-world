
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface BackendProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  posts_count: number;
  followers_count: number;
  following_count: number;
  cities_visited: number;
  places_visited: number;
}

export const useBackendProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BackendProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        // Try to fetch from backend, but use demo data for now
        console.log('Backend ready: Fetching profile for user:', user.id);
        
        // Demo profile data while backend is in demo mode
        const demoProfile: BackendProfile = {
          id: user.id,
          username: user.user_metadata?.username || `user_${user.id.substring(0, 8)}`,
          full_name: user.user_metadata?.full_name || 'Travel Enthusiast',
          avatar_url: user.user_metadata?.avatar_url || null,
          email: user.email || 'demo@spott.app',
          bio: 'Travel Enthusiast | Food Lover | Photographer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          posts_count: 24,
          followers_count: 1542,
          following_count: 892,
          cities_visited: 12,
          places_visited: 87
        };
        
        setProfile(demoProfile);
        setError(null);

        // TODO: Uncomment for production
        /*
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          throw error;
        }

        setProfile(data);
        */
      } catch (err: any) {
        console.error('Profile fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<BackendProfile>) => {
    if (!user || !profile) return { error: 'No user or profile found' };

    try {
      // TODO: Uncomment for production
      /*
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);
      return { data };
      */
      
      // Demo mode: just update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return { data: profile };
    } catch (err: any) {
      console.error('Profile update error:', err);
      return { error: err.message };
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile
  };
};
