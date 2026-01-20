/**
 * Hook to batch-fetch all notification-related data at the parent level
 * This eliminates N+1 queries in MobileNotificationItem by pre-loading:
 * - User profiles
 * - Follow statuses
 * - Active stories
 * - Comment like statuses
 * - Post content types (for reviews)
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationDataCache {
  profiles: Map<string, { id: string; username: string; avatar_url: string | null }>;
  followingIds: Set<string>;
  usersWithStories: Set<string>;
  userStories: Map<string, any[]>;
  likedCommentIds: Set<string>;
  postContentTypes: Map<string, 'review' | 'post'>;
  privateUserIds: Set<string>;
  pendingRequestUserIds: Set<string>;
  locationShareStatus: Map<string, boolean>;
}

interface Notification {
  id: string;
  type: string;
  data?: {
    user_id?: string;
    shared_by_user_id?: string;
    comment_id?: string;
    post_id?: string;
    location_id?: string;
    grouped_users?: Array<{ id: string; name: string; avatar: string }>;
  };
}

export const useNotificationData = (notifications: Notification[]) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cache, setCache] = useState<NotificationDataCache>({
    profiles: new Map(),
    followingIds: new Set(),
    usersWithStories: new Set(),
    userStories: new Map(),
    likedCommentIds: new Set(),
    postContentTypes: new Map(),
    privateUserIds: new Set(),
    pendingRequestUserIds: new Set(),
    locationShareStatus: new Map(),
  });
  
  const lastFetchRef = useRef<string>('');

  // Extract all unique IDs from notifications
  const extractedIds = useMemo(() => {
    const userIds = new Set<string>();
    const commentIds = new Set<string>();
    const postIds = new Set<string>();
    const locationShareKeys = new Set<string>(); // Format: "userId:locationId"

    notifications.forEach(n => {
      // User IDs from various sources
      if (n.data?.user_id) userIds.add(n.data.user_id);
      if (n.data?.shared_by_user_id) userIds.add(n.data.shared_by_user_id);
      
      // Grouped users in like notifications
      n.data?.grouped_users?.forEach(u => {
        if (u.id) userIds.add(u.id);
      });

      // Comment IDs for like status
      if (n.type === 'comment' && n.data?.comment_id) {
        commentIds.add(n.data.comment_id);
      }

      // Post IDs for content type detection
      if ((n.type === 'like' || n.type === 'comment') && n.data?.post_id) {
        postIds.add(n.data.post_id);
      }

      // Location shares
      if (n.type === 'location_share' && n.data?.location_id) {
        const uid = n.data.shared_by_user_id || n.data.user_id;
        if (uid) {
          locationShareKeys.add(`${uid}:${n.data.location_id}`);
        }
      }
    });

    return {
      userIds: Array.from(userIds),
      commentIds: Array.from(commentIds),
      postIds: Array.from(postIds),
      locationShareKeys: Array.from(locationShareKeys),
    };
  }, [notifications]);

  // Create a fetch key to detect changes
  const fetchKey = useMemo(() => {
    return JSON.stringify({
      userIds: extractedIds.userIds.sort(),
      commentIds: extractedIds.commentIds.sort(),
      postIds: extractedIds.postIds.sort(),
      locationShareKeys: extractedIds.locationShareKeys.sort(),
    });
  }, [extractedIds]);

  const fetchAllData = useCallback(async () => {
    if (!user || extractedIds.userIds.length === 0) {
      setLoading(false);
      return;
    }

    // Skip if we've already fetched this exact data
    if (lastFetchRef.current === fetchKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    lastFetchRef.current = fetchKey;

    try {
      const { userIds, commentIds, postIds, locationShareKeys } = extractedIds;

      // Parallel batch queries - ONE query per data type instead of per-notification
      const [
        profilesRes,
        followsRes,
        storiesRes,
        commentLikesRes,
        postsRes,
        privacyRes,
        pendingRequestsRes,
      ] = await Promise.all([
        // 1. Fetch all profiles at once
        userIds.length > 0
          ? supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', userIds)
          : Promise.resolve({ data: [], error: null }),

        // 2. Check which users the current user follows
        userIds.length > 0
          ? supabase
              .from('follows')
              .select('following_id')
              .eq('follower_id', user.id)
              .in('following_id', userIds)
          : Promise.resolve({ data: [], error: null }),

        // 3. Check which users have active stories
        userIds.length > 0
          ? supabase
              .from('stories')
              .select('id, user_id, media_url, media_type, created_at, location_id, location_name, location_address, metadata')
              .in('user_id', userIds)
              .gt('expires_at', new Date().toISOString())
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),

        // 4. Check which comments the user has liked
        commentIds.length > 0
          ? supabase
              .from('comment_likes')
              .select('comment_id')
              .eq('user_id', user.id)
              .in('comment_id', commentIds)
          : Promise.resolve({ data: [], error: null }),

        // 5. Get post content types for reviews
        postIds.length > 0
          ? supabase
              .from('posts')
              .select('id, rating, content_type')
              .in('id', postIds)
          : Promise.resolve({ data: [], error: null }),

        // 6. Check which users have private accounts
        userIds.length > 0
          ? supabase
              .from('user_privacy_settings')
              .select('user_id, is_private')
              .in('user_id', userIds)
              .eq('is_private', true)
          : Promise.resolve({ data: [], error: null }),

        // 7. Check pending follow requests from current user
        userIds.length > 0
          ? supabase
              .from('friend_requests')
              .select('requested_id')
              .eq('requester_id', user.id)
              .eq('status', 'pending')
              .in('requested_id', userIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      // 8. Check location share statuses (needs to be done separately due to complex key)
      const locationShareResults = new Map<string, boolean>();
      if (locationShareKeys.length > 0) {
        // Batch by unique user IDs and location IDs
        const uniqueUserIds = [...new Set(locationShareKeys.map(k => k.split(':')[0]))];
        const uniqueLocationIds = [...new Set(locationShareKeys.map(k => k.split(':')[1]))];
        
        const { data: shareData } = await supabase
          .from('user_location_shares')
          .select('user_id, location_id, expires_at')
          .in('user_id', uniqueUserIds)
          .in('location_id', uniqueLocationIds)
          .gt('expires_at', new Date().toISOString());

        const now = new Date();
        shareData?.forEach(share => {
          const key = `${share.user_id}:${share.location_id}`;
          const expiresAt = new Date(share.expires_at);
          locationShareResults.set(key, expiresAt > now);
        });
        
        // Set false for keys not found
        locationShareKeys.forEach(key => {
          if (!locationShareResults.has(key)) {
            locationShareResults.set(key, false);
          }
        });
      }

      // Build the cache
      const profiles = new Map<string, { id: string; username: string; avatar_url: string | null }>();
      profilesRes.data?.forEach((p: any) => {
        profiles.set(p.id, { id: p.id, username: p.username, avatar_url: p.avatar_url });
      });

      const followingIds = new Set<string>();
      followsRes.data?.forEach((f: any) => {
        followingIds.add(f.following_id);
      });

      const usersWithStories = new Set<string>();
      const userStories = new Map<string, any[]>();
      storiesRes.data?.forEach((s: any) => {
        usersWithStories.add(s.user_id);
        const existing = userStories.get(s.user_id) || [];
        const profile = profiles.get(s.user_id);
        existing.push({
          id: s.id,
          userId: s.user_id,
          userName: profile?.username || 'User',
          userAvatar: profile?.avatar_url || '',
          mediaUrl: s.media_url,
          mediaType: s.media_type,
          locationId: s.location_id || '',
          locationName: s.location_name || '',
          locationAddress: s.location_address || '',
          locationCategory: (s.metadata as any)?.category,
          timestamp: s.created_at,
          isViewed: false,
          bookingUrl: (s.metadata as any)?.booking_url,
        });
        userStories.set(s.user_id, existing);
      });

      const likedCommentIds = new Set<string>();
      commentLikesRes.data?.forEach((c: any) => {
        likedCommentIds.add(c.comment_id);
      });

      const postContentTypes = new Map<string, 'review' | 'post'>();
      postsRes.data?.forEach((p: any) => {
        const isReview = p.content_type === 'review' || p.rating != null;
        postContentTypes.set(p.id, isReview ? 'review' : 'post');
      });

      const privateUserIds = new Set<string>();
      privacyRes.data?.forEach((p: any) => {
        if (p.is_private) privateUserIds.add(p.user_id);
      });

      const pendingRequestUserIds = new Set<string>();
      pendingRequestsRes.data?.forEach((r: any) => {
        pendingRequestUserIds.add(r.requested_id);
      });

      setCache({
        profiles,
        followingIds,
        usersWithStories,
        userStories,
        likedCommentIds,
        postContentTypes,
        privateUserIds,
        pendingRequestUserIds,
        locationShareStatus: locationShareResults,
      });
    } catch (error) {
      console.error('Error batch-fetching notification data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, extractedIds, fetchKey]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Helper functions to get cached data
  const getProfile = useCallback((userId: string | undefined) => {
    if (!userId) return null;
    return cache.profiles.get(userId) || null;
  }, [cache.profiles]);

  const isFollowing = useCallback((userId: string | undefined) => {
    if (!userId) return false;
    return cache.followingIds.has(userId);
  }, [cache.followingIds]);

  const hasActiveStory = useCallback((userId: string | undefined) => {
    if (!userId) return false;
    return cache.usersWithStories.has(userId);
  }, [cache.usersWithStories]);

  const getUserStories = useCallback((userId: string | undefined) => {
    if (!userId) return [];
    return cache.userStories.get(userId) || [];
  }, [cache.userStories]);

  const isCommentLiked = useCallback((commentId: string | undefined) => {
    if (!commentId) return false;
    return cache.likedCommentIds.has(commentId);
  }, [cache.likedCommentIds]);

  const getPostContentType = useCallback((postId: string | undefined) => {
    if (!postId) return 'post';
    return cache.postContentTypes.get(postId) || 'post';
  }, [cache.postContentTypes]);

  const isUserPrivate = useCallback((userId: string | undefined) => {
    if (!userId) return false;
    return cache.privateUserIds.has(userId);
  }, [cache.privateUserIds]);

  const hasPendingRequest = useCallback((userId: string | undefined) => {
    if (!userId) return false;
    return cache.pendingRequestUserIds.has(userId);
  }, [cache.pendingRequestUserIds]);

  const isLocationShareActive = useCallback((userId: string | undefined, locationId: string | undefined) => {
    if (!userId || !locationId) return false;
    const key = `${userId}:${locationId}`;
    return cache.locationShareStatus.get(key) ?? false;
  }, [cache.locationShareStatus]);

  return {
    loading,
    getProfile,
    isFollowing,
    hasActiveStory,
    getUserStories,
    isCommentLiked,
    getPostContentType,
    isUserPrivate,
    hasPendingRequest,
    isLocationShareActive,
    refetch: fetchAllData,
  };
};
