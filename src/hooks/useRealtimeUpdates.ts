
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RealtimeHooks {
  onLocationSaved?: (location: any) => void;
  onLocationUnsaved?: (locationId: string) => void;
  onNewStory?: (story: any) => void;
  onNewPost?: (post: any) => void;
}

export const useRealtimeUpdates = (hooks: RealtimeHooks) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    console.log('Setting up realtime subscriptions for user:', user.id);

    // Subscribe to user's saved locations changes
    const savedLocationsChannel = supabase
      .channel('user-saved-locations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_saved_locations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('New location saved:', payload.new);
          hooks.onLocationSaved?.(payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'user_saved_locations',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Location unsaved:', payload.old);
          hooks.onLocationUnsaved?.(payload.old.location_id);
        }
      )
      .subscribe();

    // Subscribe to new stories
    const storiesChannel = supabase
      .channel('stories')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stories'
        },
        (payload) => {
          console.log('New story:', payload.new);
          hooks.onNewStory?.(payload.new);
        }
      )
      .subscribe();

    // Subscribe to new posts
    const postsChannel = supabase
      .channel('posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          console.log('New post:', payload.new);
          hooks.onNewPost?.(payload.new);
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(savedLocationsChannel);
      supabase.removeChannel(storiesChannel);
      supabase.removeChannel(postsChannel);
    };
  }, [user, hooks]);
};
