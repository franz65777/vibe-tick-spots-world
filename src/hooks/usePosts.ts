
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Post {
  id: string;
  user_id: string;
  location_id?: string;
  caption?: string;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  saves_count: number;
  created_at: string;
  updated_at: string;
  metadata: any;
}

export const usePosts = (userId?: string) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching posts:', error);
        setPosts([]);
      } else {
        console.log('Posts fetched successfully:', data?.length || 0);
        setPosts(data || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const uploadPost = async (
    files: File[],
    caption?: string,
    locationId?: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      if (caption) formData.append('caption', caption);
      if (locationId) formData.append('locationId', locationId);

      const { data, error } = await supabase.functions.invoke('upload-post', {
        body: formData,
      });

      if (error) throw error;

      // Refresh posts
      await fetchPosts();
      return data.post;
    } catch (error) {
      console.error('Error uploading post:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const likePost = async (postId: string) => {
    if (!user) return;

    try {
      // Check if already liked
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .maybeSingle();

      if (existingLike) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({ user_id: user.id, post_id: postId });

        if (error) throw error;
      }

      await fetchPosts();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const savePost = async (postId: string) => {
    if (!user) return;

    try {
      // Check if already saved
      const { data: existingSave } = await supabase
        .from('post_saves')
        .select('id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .maybeSingle();

      if (existingSave) {
        // Unsave
        const { error } = await supabase
          .from('post_saves')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (error) throw error;
      } else {
        // Save
        const { error } = await supabase
          .from('post_saves')
          .insert({ user_id: user.id, post_id: postId });

        if (error) throw error;
      }

      await fetchPosts();
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [userId]);

  return {
    posts,
    loading,
    uploading,
    uploadPost,
    likePost,
    savePost,
    refetch: fetchPosts,
  };
};
