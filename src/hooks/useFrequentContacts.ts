import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FrequentContact {
  id: string;
  username: string;
  avatar_url: string;
  message_count: number;
}

export const useFrequentContacts = () => {
  const { user } = useAuth();
  const [frequentContacts, setFrequentContacts] = useState<FrequentContact[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadFrequentContacts();
    }
  }, [user]);

  const loadFrequentContacts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get message counts with each user
      const { data: messages } = await supabase
        .from('direct_messages')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(500);

      if (!messages) {
        setFrequentContacts([]);
        return;
      }

      // Count interactions per user
      const userCounts = new Map<string, number>();
      messages.forEach(msg => {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        userCounts.set(otherId, (userCounts.get(otherId) || 0) + 1);
      });

      // Get top 6 most frequent contacts
      const sortedUsers = Array.from(userCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([id, count]) => ({ id, count }));

      if (sortedUsers.length === 0) {
        setFrequentContacts([]);
        return;
      }

      // Fetch profiles for these users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', sortedUsers.map(u => u.id));

      if (!profiles) {
        setFrequentContacts([]);
        return;
      }

      // Combine with message counts and sort by frequency
      const frequents = sortedUsers
        .map(({ id, count }) => {
          const profile = profiles.find(p => p.id === id);
          return profile ? {
            id: profile.id,
            username: profile.username || 'Unknown',
            avatar_url: profile.avatar_url || '',
            message_count: count
          } : null;
        })
        .filter((c): c is FrequentContact => c !== null);

      setFrequentContacts(frequents);
    } catch (error) {
      console.error('Error loading frequent contacts:', error);
      setFrequentContacts([]);
    } finally {
      setLoading(false);
    }
  };

  return { frequentContacts, loading, refresh: loadFrequentContacts };
};
