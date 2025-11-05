import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export const useOptimizedProfile = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['profile', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) {
        // Se non esiste, crea profilo
        if (error.code === 'PGRST116') {
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
              id: targetUserId,
              username: user?.email?.split('@')[0] || 'user',
              email: user?.email,
            })
            .select()
            .single();
          console.log('Created new profile for', targetUserId);
          return newProfile as Profile;
        }
        console.error('Profile query error:', error);
        throw error;
      }

      console.log('Profile loaded:', data?.username);
      return data as Profile;
    },
    enabled: !!targetUserId,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
  });

  return {
    profile,
    loading: isLoading,
    error: error?.message,
    refetch,
  };
};
