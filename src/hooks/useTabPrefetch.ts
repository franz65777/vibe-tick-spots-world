import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook per pre-caricare i dati delle tab vicine in background
 * Garantisce transizioni istantanee tra Home, Explore, Feed, Profile
 */
export const useTabPrefetch = (currentTab: 'home' | 'explore' | 'feed' | 'profile' | 'add') => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const prefetchData = async () => {
      // Prefetch basato sulla tab corrente
      switch (currentTab) {
        case 'home':
          // Da Home, prefetch Explore e Feed
          prefetchExploreData();
          prefetchFeedData();
          break;
        
        case 'explore':
          // Da Explore, prefetch Home e Feed
          prefetchHomeData();
          prefetchFeedData();
          break;
        
        case 'feed':
          // Da Feed, prefetch Explore e Profile
          prefetchExploreData();
          prefetchProfileData();
          break;
        
        case 'profile':
          // Da Profile, prefetch Feed
          prefetchFeedData();
          break;
        
        case 'add':
          // Da Add, prefetch Home
          prefetchHomeData();
          break;
      }
    };

    // Prefetch dopo 500ms per non bloccare UI
    const timer = setTimeout(prefetchData, 500);
    return () => clearTimeout(timer);
  }, [currentTab, user?.id]);

  const prefetchHomeData = () => {
    // Prefetch user location e stories
    queryClient.prefetchQuery({
      queryKey: ['stories', user?.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('stories')
          .select('*, profiles(username, avatar_url)')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(20);
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchExploreData = () => {
    // Prefetch follow suggestions
    queryClient.prefetchQuery({
      queryKey: ['follow-suggestions', user?.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, full_name')
          .neq('id', user?.id)
          .limit(10);
        return data || [];
      },
      staleTime: 10 * 60 * 1000,
    });
  };

  const prefetchFeedData = () => {
    // Prefetch feed posts
    queryClient.prefetchQuery({
      queryKey: ['feed', user?.id],
      queryFn: async () => {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user!.id);
        
        if (!following || following.length === 0) return [];

        const followingIds = following.map(f => f.following_id);
        const { data: posts } = await supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id(id, username, avatar_url, full_name),
            locations:location_id(id, name, address, city, latitude, longitude, category)
          `)
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .limit(20);
        
        return posts || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  };

  const prefetchProfileData = () => {
    // Prefetch profile data
    queryClient.prefetchQuery({
      queryKey: ['profile', user?.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user!.id)
          .single();
        return data;
      },
      staleTime: 10 * 60 * 1000,
    });

    // Prefetch user posts
    queryClient.prefetchQuery({
      queryKey: ['user-posts', user?.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(12);
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  };
};
