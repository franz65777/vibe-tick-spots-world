
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
}

export const useUserProfile = (userId?: string) => {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
            .select(`
              id,
              username,
              full_name,
              bio,
              avatar_url,
              email,
              posts_count,
              follower_count,
              following_count,
              cities_visited,
              places_visited,
              created_at,
              user_type,
              business_verified,
              is_business_user,
              current_city
            `)
            .eq('id', userId)
            .single();
          
          profileData = result.data;
          profileError = result.error;
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
          followers_count: profileData.follower_count || 0, // Map follower_count to followers_count
          following_count: profileData.following_count || 0,
          cities_visited: profileData.cities_visited || 0,
          places_visited: profileData.places_visited || 0,
          is_following: isFollowing
        });
      } catch (err: any) {
        console.error('Error fetching user profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, currentUser]);

  const followUser = async () => {
    if (!currentUser || !userId || currentUser.id === userId) return;

    try {
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
        followers_count: prev.followers_count + 1
      } : null);
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
        followers_count: Math.max(0, prev.followers_count - 1)
      } : null);
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  return {
    profile,
    loading,
    error,
    followUser,
    unfollowUser
  };
};
