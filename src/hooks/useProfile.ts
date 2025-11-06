
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
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if user session is valid before making request
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.log('❌ No valid session found for profile fetch');
        setError('Authentication required');
        setLoading(false);
        return;
      }

      console.log('🔍 Fetching profile for user:', user.id);

      const runFetch = async () => {
        return await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
      };

      let { data, error: fetchError } = await runFetch();

      // Handle expired JWT once with refresh + retry
      if (fetchError && (fetchError.code === 'PGRST303' || /JWT expired/i.test(fetchError.message || ''))) {
        console.warn('🔁 Profile fetch received bad_jwt, attempting refresh...');
        const { error: refreshErr } = await supabase.auth.refreshSession();
        if (refreshErr) {
          console.error('❌ Refresh failed, signing out:', refreshErr);
          await supabase.auth.signOut();
          setError('Session expired');
          setLoading(false);
          setProfile(null);
          return;
        }
        ({ data, error: fetchError } = await runFetch());
      }

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // Profile doesn't exist, create one
          console.log('📝 Creating new profile for user:', user.id);
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
          console.log('✅ Profile created successfully');
          setProfile(newProfile);
        } else {
          throw fetchError;
        }
      } else {
        console.log('✅ Profile fetched successfully');
        setProfile(data);
      }
    } catch (err: any) {
      console.error('❌ Error fetching profile:', err);
      setError('Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user?.id) throw new Error('No user logged in');

    try {
      console.log('📝 Updating profile for user:', user.id);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      console.log('✅ Profile updated successfully');
      // Refresh profile data
      await fetchProfile();
    } catch (err) {
      console.error('❌ Error updating profile:', err);
      throw err;
    }
  };

  useEffect(() => {
    // Only fetch profile if user is authenticated
    if (user?.id) {
      fetchProfile();
    } else {
      setProfile(null);
      setLoading(false);
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
