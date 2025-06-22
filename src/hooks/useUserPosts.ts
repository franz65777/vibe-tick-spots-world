
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Post {
  id: string;
  user_id: string;
  location_id?: string;
  caption?: string;
  media_urls: string[];
  created_at: string;
  likes_count: number;
  comments_count: number;
  saves_count: number;
  locations?: {
    id: string;
    name: string;
    address?: string;
  };
}

export const useUserPosts = (userId?: string) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    const fetchUserPosts = async () => {
      // Don't fetch if no user or still loading auth
      if (!user || !targetUserId) {
        console.log('❌ No user or target user ID available');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching posts for user:', targetUserId);
        
        // Check if user session is valid before making request
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          console.log('❌ No valid session found');
          setError('Authentication required');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('posts')
          .select(`
            id,
            user_id,
            location_id,
            caption,
            media_urls,
            created_at,
            likes_count,
            comments_count,
            saves_count,
            locations (
              id,
              name,
              address
            )
          `)
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching user posts:', error);
          throw error;
        }

        console.log('✅ User posts fetched:', data?.length || 0);
        setPosts(data || []);
        setError(null);
      } catch (err: any) {
        console.error('❌ Error in useUserPosts:', err);
        setError(err.message);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if user is authenticated
    if (user) {
      fetchUserPosts();
    } else {
      setLoading(false);
    }
  }, [targetUserId, user]);

  const refetch = async () => {
    if (!targetUserId || !user) return;
    
    setLoading(true);
    try {
      console.log('🔍 Refetching posts for user:', targetUserId);
      
      // Check session before refetch
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          location_id,
          caption,
          media_urls,
          created_at,
          likes_count,
          comments_count,
          saves_count,
          locations (
            id,
            name,
            address
          )
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error refetching user posts:', error);
        throw error;
      }

      console.log('✅ User posts refetched:', data?.length || 0);
      setPosts(data || []);
      setError(null);
    } catch (err: any) {
      console.error('❌ Error in refetch:', err);
      setError(err.message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    posts,
    loading,
    error,
    refetch
  };
};
