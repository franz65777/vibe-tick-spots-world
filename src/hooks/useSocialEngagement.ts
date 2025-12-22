import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import * as engagement from '@/services/socialEngagementService';

/**
 * Unified hook for social engagement (likes, comments, shares, saves)
 * Works across all tabs and contexts with real-time updates
 */

export const useSocialEngagement = (postId: string, initialCounts?: { likes?: number; comments?: number; shares?: number }) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  // Use null to indicate "not yet loaded" vs 0 meaning "loaded but zero"
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [shareCount, setShareCount] = useState<number | null>(null);
  const [comments, setComments] = useState<engagement.Comment[]>([]);
  const [loading, setLoading] = useState(true);

  // Load initial state
  useEffect(() => {
    if (!postId) return;

    const loadEngagement = async () => {
      setLoading(true);
      try {
        // Fetch counts efficiently
        const [likesResult, commentsCountResult, sharesCountResult] = await Promise.all([
          user ? engagement.getPostLikes(postId) : Promise.resolve({ isLiked: false, count: initialCounts?.likes || 0 }),
          supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('post_id', postId),
          supabase.from('post_shares').select('*', { count: 'exact', head: true }).eq('post_id', postId),
        ]);

        setIsLiked(likesResult.isLiked);
        setLikeCount(likesResult.count);
        setCommentCount(commentsCountResult.count || 0);
        setShareCount(sharesCountResult.count || 0);

        // Also check saved status if user is logged in
        if (user) {
          const savedStatus = await engagement.isPostSaved(postId, user.id);
          setIsSaved(savedStatus);
        }
      } catch (error) {
        console.error('Error loading engagement:', error);
        // Fall back to initial counts on error
        setLikeCount(initialCounts?.likes ?? 0);
        setCommentCount(initialCounts?.comments ?? 0);
        setShareCount(initialCounts?.shares ?? 0);
      } finally {
        setLoading(false);
      }
    };

    loadEngagement();
  }, [postId, user]);

  // Real-time subscription for likes
  useEffect(() => {
    if (!postId) return;

    const likesChannel = supabase
      .channel(`post-likes-rt-${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_likes', filter: `post_id=eq.${postId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLikeCount(prev => (prev ?? 0) + 1);
            if (user && payload.new.user_id === user.id) {
              setIsLiked(true);
            }
          } else if (payload.eventType === 'DELETE') {
            setLikeCount(prev => Math.max(0, (prev ?? 0) - 1));
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

    const commentsChannel = supabase
      .channel(`post-comments-rt-${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            setCommentCount(prev => (prev ?? 0) + 1);
            
            // Fetch the new comment with profile data for the comments array
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
              setComments(prev => {
                // Avoid duplicates
                if (prev.some(c => c.id === newComment.id)) return prev;
                return [...prev, {
                  id: newComment.id,
                  post_id: postId,
                  content: newComment.content,
                  created_at: newComment.created_at,
                  user_id: newComment.user_id,
                  username: profile?.username || 'User',
                  avatar_url: profile?.avatar_url || null,
                } as engagement.Comment];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setCommentCount(prev => Math.max(0, (prev ?? 0) - 1));
            setComments(prev => prev.filter(c => c.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [postId]);

  // Real-time subscription for shares
  useEffect(() => {
    if (!postId) return;

    const sharesChannel = supabase
      .channel(`post-shares-rt-${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_shares', filter: `post_id=eq.${postId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setShareCount(prev => (prev ?? 0) + 1);
          } else if (payload.eventType === 'DELETE') {
            setShareCount(prev => Math.max(0, (prev ?? 0) - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sharesChannel);
    };
  }, [postId]);

  // Lazy load comments only when needed
  const loadComments = useCallback(async () => {
    if (!postId) return;
    const commentsData = await engagement.getPostComments(postId);
    setComments(commentsData);
  }, [postId]);

  const toggleLike = useCallback(async () => {
    if (!user) return;
    
    const newLikedState = await engagement.togglePostLike(postId, user.id);
    setIsLiked(newLikedState);
    setLikeCount(prev => newLikedState ? (prev ?? 0) + 1 : Math.max(0, (prev ?? 0) - 1));
  }, [postId, user]);

  const toggleSave = useCallback(async () => {
    if (!user) return;
    
    const newSavedState = await engagement.togglePostSave(postId, user.id);
    setIsSaved(newSavedState);
  }, [postId, user]);

  const addComment = useCallback(async (
    content: string,
    successMessage?: string,
    errorMessage?: string,
    emptyErrorMessage?: string
  ) => {
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
      setComments(prev => [...prev, newComment]);
      setCommentCount(prev => (prev ?? 0) + 1);
    }
  }, [postId, user]);

  const deleteComment = useCallback(async (commentId: string) => {
    if (!user) return;
    
    const success = await engagement.deletePostComment(commentId, user.id);
    if (success) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      setCommentCount(prev => Math.max(0, (prev ?? 0) - 1));
    }
  }, [user]);

  const sharePost = useCallback(async (recipientIds: string[]) => {
    if (!user) return false;
    
    return await engagement.sharePost(postId, user.id, recipientIds);
  }, [postId, user]);

  return {
    isLiked,
    isSaved,
    likeCount,
    commentCount,
    shareCount,
    comments,
    loading,
    toggleLike,
    toggleSave,
    addComment,
    deleteComment,
    sharePost,
    loadComments,
  };
};
