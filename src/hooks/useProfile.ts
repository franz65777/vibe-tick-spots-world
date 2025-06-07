
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
  followers_count?: number;
  following_count?: number;
  cities_visited?: number;
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
        
        // Set a timeout for the profile fetch
        const profilePromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 3000)
        );

        const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

        if (error) {
          console.error('useProfile: Error fetching profile:', error);
          
          // For demo purposes, create a fallback profile
          console.log('useProfile: Creating fallback demo profile');
          const demoProfile: Profile = {
            id: user.id,
            username: user.user_metadata?.username || `user_${user.id.substring(0, 8)}`,
            full_name: user.user_metadata?.full_name || 'Demo User',
            avatar_url: user.user_metadata?.avatar_url || null,
            email: user.email || 'demo@example.com',
            bio: 'This is a demo profile',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            posts_count: 5
          };
          
          setProfile(demoProfile);
          setError(null);
        } else {
          console.log('useProfile: Profile fetched successfully:', data);
          setProfile(data);
        }
      } catch (err: any) {
        console.error('useProfile: Unexpected error or timeout:', err);
        
        // For demo purposes, create a fallback profile even on timeout
        console.log('useProfile: Creating fallback demo profile due to timeout');
        const demoProfile: Profile = {
          id: user.id,
          username: user.user_metadata?.username || `user_${user.id.substring(0, 8)}`,
          full_name: user.user_metadata?.full_name || 'Demo User',
          avatar_url: user.user_metadata?.avatar_url || null,
          email: user.email || 'demo@example.com',
          bio: 'This is a demo profile',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          posts_count: 5
        };
        
        setProfile(demoProfile);
        setError(null);
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
