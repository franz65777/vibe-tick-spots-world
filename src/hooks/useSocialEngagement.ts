import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import * as engagement from '@/services/socialEngagementService';
import { useRealtimeEvent } from './useCentralizedRealtime';

/**
 * Unified hook for social engagement (likes, comments, shares, saves)
 * Works across all tabs and contexts with real-time updates
 * 
 * OPTIMIZED: Uses centralized realtime instead of per-post channels
 * Reduces connections from 3 per post to 0 (uses shared channel)
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
  
  // Keep postId in ref for stable callbacks
  const postIdRef = useRef(postId);
  useEffect(() => {
    postIdRef.current = postId;
  }, [postId]);

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

  // Handle like events from centralized realtime
  const handleLikeEvent = useCallback((payload: any) => {
    if (payload.post_id !== postIdRef.current) return;
    
    // Determine if this is insert or delete based on payload structure
    // Inserts have all fields, deletes only have id and post_id
    const isInsert = !!payload.user_id && !!payload.created_at;
    
    if (isInsert) {
      setLikeCount(prev => (prev ?? 0) + 1);
      if (user && payload.user_id === user.id) {
        setIsLiked(true);
      }
    } else {
      setLikeCount(prev => Math.max(0, (prev ?? 0) - 1));
      if (user && payload.user_id === user.id) {
        setIsLiked(false);
      }
    }
  }, [user]);

  // Handle comment events from centralized realtime
  const handleCommentInsert = useCallback(async (payload: any) => {
    if (payload.post_id !== postIdRef.current) return;
    
    setCommentCount(prev => (prev ?? 0) + 1);
    
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
      .eq('id', payload.id)
      .single();
    
    if (newComment) {
      const profile = newComment.profiles as any;
      setComments(prev => {
        if (prev.some(c => c.id === newComment.id)) return prev;
        return [...prev, {
          id: newComment.id,
          post_id: postIdRef.current,
          content: newComment.content,
          created_at: newComment.created_at,
          user_id: newComment.user_id,
          username: profile?.username || 'User',
          avatar_url: profile?.avatar_url || null,
        } as engagement.Comment];
      });
    }
  }, []);

  const handleCommentDelete = useCallback((payload: any) => {
    if (payload.post_id !== postIdRef.current) return;
    
    setCommentCount(prev => Math.max(0, (prev ?? 0) - 1));
    setComments(prev => prev.filter(c => c.id !== payload.id));
  }, []);

  // Handle share events from centralized realtime
  const handleShareEvent = useCallback((payload: any) => {
    if (payload.post_id !== postIdRef.current) return;
    
    const isInsert = !!payload.shared_by && !!payload.shared_with;
    if (isInsert) {
      setShareCount(prev => (prev ?? 0) + 1);
    } else {
      setShareCount(prev => Math.max(0, (prev ?? 0) - 1));
    }
  }, []);

  // Subscribe to centralized realtime events
  useRealtimeEvent(['post_like_insert', 'post_like_delete'], handleLikeEvent);
  useRealtimeEvent('post_comment_insert', handleCommentInsert);
  useRealtimeEvent('post_comment_delete', handleCommentDelete);
  useRealtimeEvent(['post_share_insert', 'post_share_delete'], handleShareEvent);

  // Instant UI updates when the user comments/shares (in addition to realtime)
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent)?.detail as
        | { postId?: string; commentsDelta?: number; sharesDelta?: number }
        | undefined;

      if (!detail?.postId || detail.postId !== postId) return;

      if (typeof detail.commentsDelta === 'number') {
        setCommentCount((prev) => Math.max(0, (prev ?? 0) + detail.commentsDelta!));
      }
      if (typeof detail.sharesDelta === 'number') {
        setShareCount((prev) => Math.max(0, (prev ?? 0) + detail.sharesDelta!));
      }
    };

    window.addEventListener('post-engagement-updated', handler as EventListener);
    return () => window.removeEventListener('post-engagement-updated', handler as EventListener);
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
