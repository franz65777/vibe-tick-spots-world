import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as engagementService from '@/services/postEngagementService';

/**
 * Hook for managing post engagement (likes, saves, shares)
 * Completely rewritten to use new service
 */
export const usePostEngagement = () => {
  const { user } = useAuth();
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserEngagement();
    } else {
      setLikedPosts(new Set());
      setSavedPosts(new Set());
    }
  }, [user]);

  const loadUserEngagement = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [liked, saved] = await Promise.all([
        engagementService.getUserLikedPosts(user.id),
        engagementService.getUserSavedPosts(user.id),
      ]);

      setLikedPosts(liked);
      setSavedPosts(saved);
    } catch (error) {
      console.error('Error loading user engagement:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (postId: string): Promise<boolean> => {
    if (!user) return false;

    const isLiked = likedPosts.has(postId);
    const success = await engagementService.togglePostLike(user.id, postId);

    if (success) {
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });
    }

    return success;
  };

  const toggleSave = async (postId: string): Promise<boolean> => {
    if (!user) return false;

    const isSaved = savedPosts.has(postId);
    const success = await engagementService.togglePostSave(user.id, postId);

    if (success) {
      setSavedPosts(prev => {
        const newSet = new Set(prev);
        if (isSaved) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });
    }

    return success;
  };

  const recordShare = async (postId: string): Promise<boolean> => {
    if (!user) return false;
    return await engagementService.recordPostShare(user.id, postId);
  };

  return {
    likedPosts,
    savedPosts,
    loading,
    toggleLike,
    toggleSave,
    recordShare,
    isLiked: (postId: string) => likedPosts.has(postId),
    isSaved: (postId: string) => savedPosts.has(postId),
    refetch: loadUserEngagement,
  };
};
