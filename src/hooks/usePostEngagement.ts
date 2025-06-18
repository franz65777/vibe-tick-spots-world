
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const usePostEngagement = () => {
  const { user } = useAuth();
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      loadUserEngagement();
    }
  }, [user]);

  const loadUserEngagement = async () => {
    if (!user) return;

    try {
      // Load liked posts
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);

      // Load saved posts
      const { data: saves } = await supabase
        .from('post_saves')
        .select('post_id')
        .eq('user_id', user.id);

      setLikedPosts(new Set(likes?.map(l => l.post_id) || []));
      setSavedPosts(new Set(saves?.map(s => s.post_id) || []));
    } catch (error) {
      console.error('Error loading user engagement:', error);
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) return false;

    try {
      const isLiked = likedPosts.has(postId);

      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (!error) {
          setLikedPosts(prev => {
            const newSet = new Set(prev);
            newSet.delete(postId);
            return newSet;
          });
        }
      } else {
        // Like
        const { error } = await supabase
          .from('post_likes')
          .insert({ user_id: user.id, post_id: postId });

        if (!error) {
          setLikedPosts(prev => new Set([...prev, postId]));
        }
      }

      return true;
    } catch (error) {
      console.error('Error toggling like:', error);
      return false;
    }
  };

  const toggleSave = async (postId: string) => {
    if (!user) return false;

    try {
      const isSaved = savedPosts.has(postId);

      if (isSaved) {
        // Unsave
        const { error } = await supabase
          .from('post_saves')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (!error) {
          setSavedPosts(prev => {
            const newSet = new Set(prev);
            newSet.delete(postId);
            return newSet;
          });
        }
      } else {
        // Save
        const { error } = await supabase
          .from('post_saves')
          .insert({ user_id: user.id, post_id: postId });

        if (!error) {
          setSavedPosts(prev => new Set([...prev, postId]));
        }
      }

      return true;
    } catch (error) {
      console.error('Error toggling save:', error);
      return false;
    }
  };

  return {
    likedPosts,
    savedPosts,
    toggleLike,
    toggleSave,
    isLiked: (postId: string) => likedPosts.has(postId),
    isSaved: (postId: string) => savedPosts.has(postId),
    refetch: loadUserEngagement
  };
};
