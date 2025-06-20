
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface PlaceLike {
  id: string;
  user_id: string;
  place_id: string;
  created_at: string;
}

interface SavedPlace {
  id: string;
  user_id: string;
  place_id: string;
  place_name: string;
  place_category?: string;
  city?: string;
  coordinates?: any;
  created_at: string;
}

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
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load user's liked and saved places
  useEffect(() => {
    if (user) {
      loadUserEngagement();
    }
  }, [user]);

  const loadUserEngagement = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load liked places
      const { data: likes } = await supabase
        .from('place_likes')
        .select('place_id')
        .eq('user_id', user.id);

      // Load saved places
      const { data: saves } = await supabase
        .from('saved_places')
        .select('place_id')
        .eq('user_id', user.id);

      setLikedPlaces(new Set(likes?.map(l => l.place_id) || []));
      setSavedPlaces(new Set(saves?.map(s => s.place_id) || []));
    } catch (error) {
      console.error('Error loading user engagement:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (placeId: string) => {
    if (!user) return false;

    const isLiked = likedPlaces.has(placeId);
    
    // Optimistic update
    setLikedPlaces(prev => {
      const newSet = new Set(prev);
      if (isLiked) {
        newSet.delete(placeId);
      } else {
        newSet.add(placeId);
      }
      return newSet;
    });

    try {
      if (isLiked) {
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
          .insert({ user_id: user.id, place_id: placeId });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error toggling like:', error);
      
      // Revert optimistic update on error
      setLikedPlaces(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(placeId);
        } else {
          newSet.delete(placeId);
        }
        return newSet;
      });

      toast({
        title: "Error",
        description: `Failed to ${isLiked ? 'unlike' : 'like'} place`,
        variant: "destructive",
      });

      return false;
    }
  };

  const toggleSave = async (place: any) => {
    if (!user) return false;

    const isSaved = savedPlaces.has(place.id);
    
    // Optimistic update
    setSavedPlaces(prev => {
      const newSet = new Set(prev);
      if (isSaved) {
        newSet.delete(place.id);
      } else {
        newSet.add(place.id);
      }
      return newSet;
    });

    try {
      if (isSaved) {
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
            city: place.city,
            coordinates: place.coordinates,
          });

        if (error) throw error;
      }

      return true;
    } catch (error) {
      console.error('Error toggling save:', error);
      
      // Revert optimistic update on error
      setSavedPlaces(prev => {
        const newSet = new Set(prev);
        if (isSaved) {
          newSet.add(place.id);
        } else {
          newSet.delete(place.id);
        }
        return newSet;
      });

      toast({
        title: "Error",
        description: `Failed to ${isSaved ? 'unsave' : 'save'} place`,
        variant: "destructive",
      });

      return false;
    }
  };

  const addComment = async (placeId: string, content: string) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('place_comments')
        .insert({
          user_id: user.id,
          place_id: placeId,
          content: content.trim(),
        })
        .select(`
          *,
          profiles!place_comments_user_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully",
      });

      return data;
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
      return null;
    }
  };

  const getComments = async (placeId: string): Promise<PlaceComment[]> => {
    try {
      const { data, error } = await supabase
        .from('place_comments')
        .select(`
          *,
          profiles!place_comments_user_id_fkey (
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('place_id', placeId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  };

  const shareWithFriends = async (place: any, friendIds: string[]) => {
    if (!user) return false;

    try {
      const shareData = friendIds.map(friendId => ({
        sender_id: user.id,
        recipient_id: friendId,
        place_id: place.id,
        place_name: place.name,
        place_data: {
          name: place.name,
          category: place.category,
          city: place.city,
          coordinates: place.coordinates,
          image: place.image,
        },
      }));

      const { error } = await supabase
        .from('shared_places')
        .insert(shareData);

      if (error) throw error;

      // Create notifications for recipients
      const notifications = friendIds.map(friendId => ({
        user_id: friendId,
        type: 'place_shared',
        title: 'Place shared with you',
        message: `${user.user_metadata?.full_name || 'Someone'} shared "${place.name}" with you`,
        data: {
          sender_id: user.id,
          place_id: place.id,
          place_name: place.name,
        },
      }));

      await supabase
        .from('notifications')
        .insert(notifications);

      toast({
        title: "Shared successfully",
        description: `Shared "${place.name}" with ${friendIds.length} friend${friendIds.length > 1 ? 's' : ''}`,
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
  };

  return {
    likedPlaces,
    savedPlaces,
    loading,
    isLiked: (placeId: string) => likedPlaces.has(placeId),
    isSaved: (placeId: string) => savedPlaces.has(placeId),
    toggleLike,
    toggleSave,
    addComment,
    getComments,
    shareWithFriends,
    refetch: loadUserEngagement,
  };
};
