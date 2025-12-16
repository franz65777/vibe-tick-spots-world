import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import * as engagement from '@/services/socialEngagementService';

/**
 * Unified hook for social engagement (likes, comments, shares, saves)
 * Works across all tabs and contexts with real-time updates
 */

export const useSocialEngagement = (postId: string) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<engagement.Comment[]>([]);
  const [loading, setLoading] = useState(false);

  // Unique suffix per hook instance to avoid Supabase channel-name collisions.
  const channelSuffixRef = useRef(Math.random().toString(36).slice(2));

  // Load initial state
  useEffect(() => {
    if (!postId || !user) return;

    const loadEngagement = async () => {
      setLoading(true);
      try {
        const [likes, savedStatus, commentsData] = await Promise.all([
          engagement.getPostLikes(postId),
          engagement.isPostSaved(postId, user.id),
          engagement.getPostComments(postId),
        ]);

        setIsLiked(likes.isLiked);
        setLikeCount(likes.count);
        setIsSaved(savedStatus);
        setComments(commentsData);
      } catch (error) {
        console.error('Error loading engagement:', error);
      } finally {
        setLoading(false);
      }
    };

    loadEngagement();
  }, [postId, user]);

  // Real-time subscription for likes
  useEffect(() => {
    if (!postId) return;

    const suffix = channelSuffixRef.current;

    const likesChannel = supabase
      .channel(`post-likes-${postId}-${suffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_likes', filter: `post_id=eq.${postId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLikeCount((prev) => prev + 1);
            if (user && payload.new.user_id === user.id) {
              setIsLiked(true);
            }
          } else if (payload.eventType === 'DELETE') {
            setLikeCount((prev) => Math.max(0, prev - 1));
            if (user && payload.old.user_id === user.id) {
              setIsLiked(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesChannel);
    };
  }, [postId, user]);

  // Real-time subscription for comments
  useEffect(() => {
    if (!postId) return;

    const suffix = channelSuffixRef.current;

    const commentsChannel = supabase
      .channel(`post-comments-${postId}-${suffix}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new comment with profile data
            const { data: newComment } = await supabase
              .from('post_comments')
              .select(`
                id,
                content,
                created_at,
                user_id,
                profiles:user_id (
                  username,
                  avatar_url
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (newComment) {
              const profile = newComment.profiles as any;
              setComments((prev) => {
                // Avoid duplicates
                if (prev.some((c) => c.id === newComment.id)) return prev;
                return [
                  ...prev,
                  {
                    id: newComment.id,
                    post_id: postId,
                    content: newComment.content,
                    created_at: newComment.created_at,
                    user_id: newComment.user_id,
                    username: profile?.username || 'User',
                    avatar_url: profile?.avatar_url || null,
                  } as engagement.Comment,
                ];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [postId]);

  const toggleLike = useCallback(async () => {
    if (!user) return;

    const newLikedState = await engagement.togglePostLike(postId, user.id);
    setIsLiked(newLikedState);
    setLikeCount((prev) => (newLikedState ? prev + 1 : Math.max(0, prev - 1)));
  }, [postId, user]);

  const toggleSave = useCallback(async () => {
    if (!user) return;

    const newSavedState = await engagement.togglePostSave(postId, user.id);
    setIsSaved(newSavedState);
  }, [postId, user]);

  const addComment = useCallback(
    async (content: string, successMessage?: string, errorMessage?: string, emptyErrorMessage?: string) => {
      if (!user) return;

      const newComment = await engagement.addPostComment(
        postId,
        user.id,
        content,
        successMessage,
        errorMessage,
        emptyErrorMessage
      );
      if (newComment) {
        setComments((prev) => [...prev, newComment]);
      }
    },
    [postId, user]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!user) return;

      const success = await engagement.deletePostComment(commentId, user.id);
      if (success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    },
    [user]
  );

  const sharePost = useCallback(
    async (recipientIds: string[]) => {
      if (!user) return false;

      return await engagement.sharePost(postId, user.id, recipientIds);
    },
    [postId, user]
  );

  return {
    isLiked,
    isSaved,
    likeCount,
    comments,
    loading,
    toggleLike,
    toggleSave,
    addComment,
    deleteComment,
    sharePost,
  };
};

