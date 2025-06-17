
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  current_city?: string;
  email?: string;
  posts_count?: number;
  follower_count?: number;
  following_count?: number;
  cities_visited?: number;
  places_visited?: number;
  created_at?: string;
  updated_at?: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // Profile doesn't exist, create one
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: user.email?.split('@')[0] || 'user',
              email: user.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (createError) throw createError;
          setProfile(newProfile);
        } else {
          throw fetchError;
        }
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) throw new Error('No user logged in');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Refresh profile data
      await fetchProfile();
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user?.id]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    refetch: fetchProfile
  };
};
