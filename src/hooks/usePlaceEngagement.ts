
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PlaceComment {
  id: string;
  user_id: string;
  place_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    username?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export const usePlaceEngagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());

  const isLiked = useCallback((placeId: string) => {
    return likedPlaces.has(placeId);
  }, [likedPlaces]);

  const isSaved = useCallback((placeId: string) => {
    return savedPlaces.has(placeId);
  }, [savedPlaces]);

  const toggleLike = useCallback(async (placeId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to like places.",
        variant: "destructive",
      });
      return false;
    }

    const wasLiked = likedPlaces.has(placeId);
    
    // Optimistic update
    setLikedPlaces(prev => {
      const newSet = new Set(prev);
      if (wasLiked) {
        newSet.delete(placeId);
      } else {
        newSet.add(placeId);
      }
      return newSet;
    });

    try {
      if (wasLiked) {
        // Unlike
        const { error } = await supabase
          .from('place_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', placeId);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('place_likes')
          .insert({
            user_id: user.id,
            place_id: placeId
          });

        if (error) throw error;
      }

      toast({
        title: wasLiked ? "Removed from favorites" : "Added to favorites",
        description: wasLiked ? "Place unliked" : "Place liked",
      });

      return true;
    } catch (error) {
      console.error('Error toggling like:', error);
      
      // Revert optimistic update
      setLikedPlaces(prev => {
        const newSet = new Set(prev);
        if (wasLiked) {
          newSet.add(placeId);
        } else {
          newSet.delete(placeId);
        }
        return newSet;
      });

      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive",
      });

      return false;
    }
  }, [user, likedPlaces, toast]);

  const toggleSave = useCallback(async (place: any) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save places.",
        variant: "destructive",
      });
      return false;
    }

    const wasSaved = savedPlaces.has(place.id);
    
    // Optimistic update
    setSavedPlaces(prev => {
      const newSet = new Set(prev);
      if (wasSaved) {
        newSet.delete(place.id);
      } else {
        newSet.add(place.id);
      }
      return newSet;
    });

    try {
      if (wasSaved) {
        // Unsave
        const { error } = await supabase
          .from('saved_places')
          .delete()
          .eq('user_id', user.id)
          .eq('place_id', place.id);

        if (error) throw error;
      } else {
        // Save
        const { error } = await supabase
          .from('saved_places')
          .insert({
            user_id: user.id,
            place_id: place.id,
            place_name: place.name,
            place_category: place.category,
            city: place.city || 'Unknown',
            coordinates: place.coordinates || {}
          });

        if (error) throw error;
      }

      toast({
        title: wasSaved ? "Removed from saved" : "Saved",
        description: wasSaved ? "Place removed from saved" : "Place saved",
      });

      return true;
    } catch (error) {
      console.error('Error toggling save:', error);
      
      // Revert optimistic update
      setSavedPlaces(prev => {
        const newSet = new Set(prev);
        if (wasSaved) {
          newSet.add(place.id);
        } else {
          newSet.delete(place.id);
        }
        return newSet;
      });

      toast({
        title: "Error",
        description: "Failed to update save status",
        variant: "destructive",
      });

      return false;
    }
  }, [user, savedPlaces, toast]);

  const addComment = useCallback(async (placeId: string, content: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to comment.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('place_comments')
        .insert({
          user_id: user.id,
          place_id: placeId,
          content: content.trim()
        });

      if (error) throw error;

      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });

      return true;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast]);

  const getComments = useCallback(async (placeId: string): Promise<PlaceComment[]> => {
    try {
      // First get the comments
      const { data: comments, error: commentsError } = await supabase
        .from('place_comments')
        .select('*')
        .eq('place_id', placeId)
        .order('created_at', { ascending: false });

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
        return [];
      }

      if (!comments || comments.length === 0) {
        return [];
      }

      // Get unique user IDs
      const userIds = [...new Set(comments.map(comment => comment.user_id))];

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Return comments without profile data
        return comments.map(comment => ({
          ...comment,
          profiles: undefined
        }));
      }

      // Create a map of user profiles for quick lookup
      const profileMap = new Map();
      profiles?.forEach(profile => {
        profileMap.set(profile.id, profile);
      });

      // Combine comments with profile data
      return comments.map(comment => ({
        ...comment,
        profiles: profileMap.get(comment.user_id) || undefined
      }));

    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }, []);

  const shareWithFriends = useCallback(async (place: any, friendIds: string[]) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to share places.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const sharePromises = friendIds.map(friendId =>
        supabase
          .from('shared_places')
          .insert({
            sender_id: user.id,
            recipient_id: friendId,
            place_id: place.id,
            place_name: place.name,
            place_data: {
              name: place.name,
              category: place.category,
              city: place.city,
              image: place.image,
              coordinates: place.coordinates
            }
          })
      );

      await Promise.all(sharePromises);

      toast({
        title: "Place shared",
        description: `Shared with ${friendIds.length} friend${friendIds.length !== 1 ? 's' : ''}`,
      });

      return true;
    } catch (error) {
      console.error('Error sharing place:', error);
      toast({
        title: "Error",
        description: "Failed to share place",
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast]);

  return {
    isLiked,
    isSaved,
    toggleLike,
    toggleSave,
    addComment,
    getComments,
    shareWithFriends
  };
};
