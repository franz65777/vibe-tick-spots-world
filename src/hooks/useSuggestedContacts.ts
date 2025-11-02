import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SuggestedContact {
  id: string;
  username: string;
  avatar_url: string;
}

export const useSuggestedContacts = (excludeIds: string[] = []) => {
  const { user } = useAuth();
  const [suggestedContacts, setSuggestedContacts] = useState<SuggestedContact[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadSuggestedContacts();
    }
  }, [user, excludeIds]);

  const loadSuggestedContacts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get users that the current user follows
      const { data: following, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followError) {
        console.error('Error loading following:', followError);
        setSuggestedContacts([]);
        return;
      }

      if (!following || following.length === 0) {
        setSuggestedContacts([]);
        return;
      }

      const followingIds = following.map(f => f.following_id);

      // Get message counts with these users
      const { data: messages } = await supabase
        .from('direct_messages')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      // Count messages with each followed user
      const messageCounts = new Map<string, number>();
      messages?.forEach(msg => {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        if (followingIds.includes(otherId)) {
          messageCounts.set(otherId, (messageCounts.get(otherId) || 0) + 1);
        }
      });

      // Get users with few or no messages (suggested contacts), excluding frequent contacts
      const suggestedIds = followingIds
        .filter(id => !excludeIds.includes(id)) // Exclude already frequent contacts
        .filter(id => (messageCounts.get(id) || 0) < 5) // Less than 5 messages
        .slice(0, 12); // Limit to 12 suggestions

      if (suggestedIds.length === 0) {
        setSuggestedContacts([]);
        return;
      }

      // Fetch profiles for suggested users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', suggestedIds);

      if (!profiles) {
        setSuggestedContacts([]);
        return;
      }

      const suggested = profiles.map(profile => ({
        id: profile.id,
        username: profile.username || 'Unknown',
        avatar_url: profile.avatar_url || '',
      }));

      setSuggestedContacts(suggested);
    } catch (error) {
      console.error('Error loading suggested contacts:', error);
      setSuggestedContacts([]);
    } finally {
      setLoading(false);
    }
  };

  return { suggestedContacts, loading, refresh: loadSuggestedContacts };
};
