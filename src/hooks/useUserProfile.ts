
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { sendLocalizedNotification } from '@/services/notificationLocalizationService';

interface UserProfile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  bio: string | null;
  created_at: string;
  posts_count: number;
  followers_count: number;
  following_count: number;
  cities_visited: number;
  places_visited: number;
  is_following?: boolean;
  is_private?: boolean;
  been_cards_visibility?: string;
  can_view_content?: boolean;
  follow_request_status?: string | null;
}

export const useUserProfile = (userId?: string) => {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCounts = async () => {
      if (!userId) return { followers: 0, following: 0 };

      const [followersRes, followingRes] = await Promise.all([
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', userId),
        supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', userId),
      ]);

      return {
        followers: followersRes.count || 0,
        following: followingRes.count || 0,
      };
    };

    const fetchProfile = async () => {
      if (!userId) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        // SECURITY: Check if viewing own profile vs another user's profile
        const isOwnProfile = currentUser?.id === userId;

        let profileData;
        let profileError;

        if (isOwnProfile) {
          // Can access full profile data for own profile
          const result = await supabase
            .from('profiles')
            .select(
              `
              id,
              username,
              full_name,
              bio,
              avatar_url,
              email,
              posts_count,
              cities_visited,
              places_visited,
              created_at,
              user_type,
              business_verified,
              is_business_user,
              current_city
            `
            )
            .eq('id', userId)
            .single();

          profileData = result.data;
          profileError = result.error;
          
          // Add privacy fields for own profile
          if (profileData) {
            profileData.is_private = false;
            profileData.been_cards_visibility = 'everyone';
            profileData.can_view_content = true;
          }
        } else {
          // Use security definer function for other users (safe data only)
          const result = await supabase
            .rpc('get_safe_profile_data', { profile_id: userId })
            .single();

          profileData = result.data;
          profileError = result.error;
        }

        if (profileError) throw profileError;

        // Check if current user is following this user
        let isFollowing = false;
        if (currentUser && currentUser.id !== userId) {
          const { data: followData } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', userId)
            .single();

          isFollowing = !!followData;
        }

        // Check if user can view content (for private accounts)
        let canViewContent = true;
        if (currentUser && currentUser.id !== userId) {
          const { data: canView } = await supabase
            .rpc('can_view_user_content', { 
              viewer_id: currentUser.id, 
              target_user_id: userId 
            });
          canViewContent = canView ?? true;
        }

        // Check for pending follow request
        let followRequestStatus = null;
        if (currentUser && currentUser.id !== userId && !isFollowing && profileData?.is_private) {
          const { data: requestStatus } = await supabase
            .rpc('get_follow_request_status', {
              requester_id: currentUser.id,
              requested_id: userId
            });
          followRequestStatus = requestStatus;
        }

        // Always compute follower/following counts live from follows table
        const counts = await fetchCounts();

        if (cancelled) return;

        // Map database field names to interface - only include sensitive data for own profile
        setProfile({
          id: profileData.id,
          username: profileData.username,
          full_name: isOwnProfile ? profileData.full_name : null,
          avatar_url: profileData.avatar_url,
          email: isOwnProfile ? profileData.email : null,
          bio: profileData.bio,
          created_at: profileData.created_at,
          posts_count: profileData.posts_count || 0,
          followers_count: counts.followers,
          following_count: counts.following,
          cities_visited: profileData.cities_visited || 0,
          places_visited: profileData.places_visited || 0,
          is_following: isFollowing,
          is_private: profileData.is_private ?? false,
          been_cards_visibility: profileData.been_cards_visibility ?? 'everyone',
          can_view_content: canViewContent,
          follow_request_status: followRequestStatus,
        });
      } catch (err: any) {
        console.error('Error fetching user profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();

    // Live updates: refresh counts when follows changes for this profile
    const channel = userId
      ? supabase
          .channel(`user-profile-follows-${userId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'follows', filter: `following_id=eq.${userId}` },
            async () => {
              try {
                const counts = await fetchCounts();
                if (cancelled) return;
                setProfile((prev) =>
                  prev
                    ? { ...prev, followers_count: counts.followers, following_count: counts.following }
                    : prev
                );
              } catch (e) {
                console.error('Error updating follower counts:', e);
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${userId}` },
            async () => {
              try {
                const counts = await fetchCounts();
                if (cancelled) return;
                setProfile((prev) =>
                  prev
                    ? { ...prev, followers_count: counts.followers, following_count: counts.following }
                    : prev
                );
              } catch (e) {
                console.error('Error updating follower counts:', e);
              }
            }
          )
          .subscribe()
      : null;

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [userId, currentUser]);

  const followUser = async () => {
    if (!currentUser || !userId || currentUser.id === userId) return;

    try {
      // Check if target user is private
      const isPrivate = profile?.is_private ?? false;

      if (isPrivate) {
        // For private accounts, create a follow request instead
        const { error } = await supabase
          .from('friend_requests')
          .insert({
            requester_id: currentUser.id,
            requested_id: userId,
            status: 'pending'
          });

        if (error) throw error;

        // Get current user's profile for notification
        const { data: followerProfile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', currentUser.id)
          .single();

        // Create notification for follow request
        await sendLocalizedNotification(
          userId,
          'follow_request',
          {
            user_id: currentUser.id,
            user_name: followerProfile?.username,
            avatar_url: followerProfile?.avatar_url,
          },
          {
            username: followerProfile?.username || 'Someone'
          }
        );

        setProfile(prev => prev ? {
          ...prev,
          follow_request_status: 'pending'
        } : null);
      } else {
        // For public accounts, follow directly
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: userId
          });

        if (error) throw error;

        // Get current user's profile for notification
        const { data: followerProfile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', currentUser.id)
          .single();

        // Create localized notification
        await sendLocalizedNotification(
          userId,
          'new_follower',
          {
            user_id: currentUser.id,
            user_name: followerProfile?.username,
            avatar_url: followerProfile?.avatar_url,
          },
          {
            username: followerProfile?.username || 'Someone'
          }
        );

        setProfile(prev => prev ? {
          ...prev,
          is_following: true,
          followers_count: prev.followers_count + 1,
          can_view_content: true
        } : null);
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const unfollowUser = async () => {
    if (!currentUser || !userId) return;

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId);

      if (error) throw error;

      setProfile(prev => prev ? {
        ...prev,
        is_following: false,
        followers_count: Math.max(0, prev.followers_count - 1),
        can_view_content: !prev.is_private // If private, can't view after unfollowing
      } : null);
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const cancelFollowRequest = async () => {
    if (!currentUser || !userId) return;

    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('requester_id', currentUser.id)
        .eq('requested_id', userId)
        .eq('status', 'pending');

      if (error) throw error;

      setProfile(prev => prev ? {
        ...prev,
        follow_request_status: null
      } : null);
    } catch (error) {
      console.error('Error canceling follow request:', error);
    }
  };

  return {
    profile,
    loading,
    error,
    followUser,
    unfollowUser,
    cancelFollowRequest
  };
};
