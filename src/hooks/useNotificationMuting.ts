import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const useNotificationMuting = (targetUserId?: string) => {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !targetUserId) {
      setLoading(false);
      return;
    }

    fetchMuteStatus();
  }, [user?.id, targetUserId]);

  const fetchMuteStatus = async () => {
    if (!user || !targetUserId) return;

    try {
      const { data, error } = await supabase
        .from('user_notification_settings')
        .select('is_muted')
        .eq('user_id', user.id)
        .eq('business_id', targetUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching mute status:', error);
      }

      setIsMuted(data?.is_muted || false);
    } catch (error) {
      console.error('Error fetching mute status:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMute = async () => {
    if (!user || !targetUserId) return;

    try {
      const newMuteState = !isMuted;

      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: user.id,
          business_id: targetUserId,
          is_muted: newMuteState,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,business_id'
        });

      if (error) throw error;

      setIsMuted(newMuteState);
      toast.success(newMuteState ? 'Notifications muted' : 'Notifications enabled');
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast.error('Failed to update notification settings');
    }
  };

  return {
    isMuted,
    loading,
    toggleMute
  };
};
