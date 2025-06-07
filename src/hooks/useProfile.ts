
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { backendService } from '@/services/backendService';
import { useBackendProfile } from './useBackendProfile';

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
  const { profile: backendProfile, loading: backendLoading, error: backendError, updateProfile: updateBackendProfile } = useBackendProfile();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const config = backendService.getConfig();
    
    if (config.enableRealDatabase && backendProfile) {
      // Use backend data when available
      setProfile(backendProfile);
      setLoading(backendLoading);
      setError(backendError);
    } else {
      // Use demo data
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const demoProfile: Profile = {
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
        cities_visited: 12
      };
      
      setProfile(demoProfile);
      setLoading(false);
      setError(null);
    }
  }, [user, backendProfile, backendLoading, backendError]);

  const updateProfile = async (updates: Partial<Profile>) => {
    const config = backendService.getConfig();
    
    if (config.enableRealDatabase) {
      return await updateBackendProfile(updates);
    } else {
      // Demo mode: just update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return { data: profile };
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile
  };
};
