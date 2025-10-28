import { UserCheck, UserMinus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'followers' | 'following';
  userId?: string;
}

const FollowersModal = ({ isOpen, onClose, type, userId }: FollowersModalProps) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const targetUserId = userId || currentUser?.id;
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFollowData = async () => {
      if (!targetUserId) {
        setUsers([]);
        setLoading(false);
        return;
      }

      try {
        let query = supabase
          .from('follows')
          .select(`
            ${type === 'followers' ? 'follower_id' : 'following_id'},
            profiles!${type === 'followers' ? 'follows_follower_id_fkey' : 'follows_following_id_fkey'} (
              id,
              username,
              avatar_url
            )
          `);

        if (type === 'followers') {
          query = query.eq('following_id', targetUserId);
        } else {
          query = query.eq('follower_id', targetUserId);
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching follow data:', error);
          setUsers([]);
        } else {
          const followUsers = data?.map((item: any) => item.profiles).filter(Boolean) || [];
          setUsers(followUsers);
        }
      } catch (error) {
        console.error('Error fetching follow data:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchFollowData();
    }
  }, [targetUserId, type, isOpen]);

  const unfollowUser = async (targetId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetId);

      if (!error) {
        setUsers(prev => prev.filter(u => u.id !== targetId));
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const removeFollower = async (followerId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', currentUser.id);

      if (!error) {
        setUsers(prev => prev.filter(u => u.id !== followerId));
      }
    } catch (error) {
      console.error('Error removing follower:', error);
    }
  };

  const getInitials = (username: string) => {
    return username ? username.substring(0, 2).toUpperCase() : 'U';
  };

  const isOwnProfile = currentUser?.id === targetUserId;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-background w-full h-[80vh] rounded-t-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {type === 'followers' ? t('followers', { ns: 'common' }) : t('following', { ns: 'common' })}
          </h2>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>
        
        <ScrollArea className="h-[calc(80vh-80px)]">
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {type === 'followers' ? t('noFollowers', { ns: 'profile' }) : t('noFollowing', { ns: 'profile' })}
              </div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      {user.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={user.username || 'User'} 
                          className="w-full h-full rounded-full object-cover" 
                        />
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground">
                          {getInitials(user.username || 'User')}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.username || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                  </div>
                  
                  {isOwnProfile && (
                    type === 'following' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unfollowUser(user.id)}
                        className="flex items-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        {t('following', { ns: 'common' })}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFollower(user.id)}
                        className="flex items-center gap-2 text-destructive hover:bg-destructive/10"
                      >
                        <UserMinus className="w-4 h-4" />
                        {t('remove', { ns: 'common' })}
                      </Button>
                    )
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default FollowersModal;
