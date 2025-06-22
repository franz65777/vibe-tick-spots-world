
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
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching posts for user:', targetUserId);
        
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

    fetchUserPosts();
  }, [targetUserId]);

  const refetch = async () => {
    if (!targetUserId) return;
    
    setLoading(true);
    try {
      console.log('🔍 Refetching posts for user:', targetUserId);
      
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
