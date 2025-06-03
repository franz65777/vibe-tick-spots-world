
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  posts_count: number;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      console.log('useProfile: Starting to fetch profile for user:', user?.id);
      
      if (!user) {
        console.log('useProfile: No user found, setting loading to false');
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        console.log('useProfile: Fetching profile from database...');
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('useProfile: Error fetching profile:', error);
          setError(error.message);
        } else {
          console.log('useProfile: Profile fetched successfully:', data);
          setProfile(data);
        }
      } catch (err) {
        console.error('useProfile: Unexpected error:', err);
        setError('An unexpected error occurred');
      } finally {
        console.log('useProfile: Setting loading to false');
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) return { error: 'No user or profile found' };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return { error: error.message };
      }

      setProfile(data);
      return { data };
    } catch (err) {
      console.error('Unexpected error:', err);
      return { error: 'An unexpected error occurred' };
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile
  };
};
