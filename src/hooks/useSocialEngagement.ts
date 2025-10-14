import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as engagement from '@/services/socialEngagementService';

/**
 * Unified hook for social engagement (likes, comments, shares, saves)
 * Works across all tabs and contexts
 */

export const useSocialEngagement = (postId: string) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<engagement.Comment[]>([]);
  const [loading, setLoading] = useState(false);

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

  const toggleLike = useCallback(async () => {
    if (!user) return;
    
    const newLikedState = await engagement.togglePostLike(postId, user.id);
    setIsLiked(newLikedState);
    setLikeCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1));
  }, [postId, user]);

  const toggleSave = useCallback(async () => {
    if (!user) return;
    
    const newSavedState = await engagement.togglePostSave(postId, user.id);
    setIsSaved(newSavedState);
  }, [postId, user]);

  const addComment = useCallback(async (content: string) => {
    if (!user) return;
    
    const newComment = await engagement.addPostComment(postId, user.id, content);
    if (newComment) {
      setComments(prev => [...prev, newComment]);
    }
  }, [postId, user]);

  const deleteComment = useCallback(async (commentId: string) => {
    if (!user) return;
    
    const success = await engagement.deletePostComment(commentId, user.id);
    if (success) {
      setComments(prev => prev.filter(c => c.id !== commentId));
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
    comments,
    loading,
    toggleLike,
    toggleSave,
    addComment,
    deleteComment,
    sharePost,
  };
};
