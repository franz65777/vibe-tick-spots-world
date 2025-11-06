import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserBlocking = (targetUserId?: string) => {
  const { user } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !targetUserId) {
      setLoading(false);
      return;
    }

    checkBlockStatus();
  }, [user, targetUserId]);

  const checkBlockStatus = async () => {
    if (!user || !targetUserId) return;

    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_user_id', targetUserId)
        .maybeSingle();

      if (error) throw error;
      setIsBlocked(!!data);
    } catch (error) {
      console.error('Error checking block status:', error);
    } finally {
      setLoading(false);
    }
  };

  const blockUser = async () => {
    if (!user || !targetUserId) return false;

    try {
      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_user_id: targetUserId
        });

      if (error) throw error;
      setIsBlocked(true);
      return true;
    } catch (error) {
      console.error('Error blocking user:', error);
      return false;
    }
  };

  const unblockUser = async () => {
    if (!user || !targetUserId) return false;

    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_user_id', targetUserId);

      if (error) throw error;
      setIsBlocked(false);
      return true;
    } catch (error) {
      console.error('Error unblocking user:', error);
      return false;
    }
  };

  return {
    isBlocked,
    loading,
    blockUser,
    unblockUser
  };
};
