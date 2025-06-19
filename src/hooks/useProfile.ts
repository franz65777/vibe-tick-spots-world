
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { backendService } from '@/services/backendService';

interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  current_city?: string;
  is_private?: boolean;
  default_location_privacy?: string;
  follower_count?: number;
  following_count?: number;
  posts_count?: number;
  places_visited?: number;
  cities_visited?: number;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const config = backendService.getConfig();

  const loadProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (!config.enableRealDatabase) {
        // Demo mode
        const demoProfile: Profile = {
          id: user.id,
          username: 'demo_user',
          full_name: 'Demo User',
          avatar_url: 'https://i.pravatar.cc/150?img=1',
          bio: 'Travel enthusiast and food lover',
          current_city: 'New York',
          is_private: false,
          default_location_privacy: 'followers',
          follower_count: 250,
          following_count: 180,
          posts_count: 45,
          places_visited: 127,
          cities_visited: 15
        };
        setProfile(demoProfile);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    try {
      if (!config.enableRealDatabase) {
        // Demo mode - just update local state
        setProfile(prev => prev ? { ...prev, ...updates } : null);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  return {
    profile,
    loading,
    updateProfile,
    refreshProfile: loadProfile
  };
};
