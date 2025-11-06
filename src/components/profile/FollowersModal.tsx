import { UserCheck, UserMinus, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'followers' | 'following';
  userId?: string;
}

interface UserWithFollowStatus {
  id: string;
  username: string;
  avatar_url: string | null;
  isFollowing?: boolean;
}

const FollowersModal = ({ isOpen, onClose, type, userId }: FollowersModalProps) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const targetUserId = userId || currentUser?.id;
  const [users, setUsers] = useState<UserWithFollowStatus[]>([]);
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
          
          // Check follow status for each user
          if (currentUser) {
            const userIds = followUsers.map((u: any) => u.id);
            const { data: followsData } = await supabase
              .from('follows')
              .select('following_id')
              .eq('follower_id', currentUser.id)
              .in('following_id', userIds);
            
            const followingIds = new Set(followsData?.map(f => f.following_id) || []);
            
            const usersWithStatus = followUsers.map((u: any) => ({
              ...u,
              isFollowing: followingIds.has(u.id)
            }));
            
            setUsers(usersWithStatus);
          } else {
            setUsers(followUsers);
          }
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
  }, [targetUserId, type, isOpen, currentUser]);

  const followUser = async (targetId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: currentUser.id,
          following_id: targetId,
        });

      if (!error) {
        setUsers(prev => prev.map(u => 
          u.id === targetId ? { ...u, isFollowing: true } : u
        ));
      }
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const unfollowUser = async (targetId: string) => {
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetId);

      if (!error) {
        if (type === 'following') {
          setUsers(prev => prev.filter(u => u.id !== targetId));
        } else {
          setUsers(prev => prev.map(u => 
            u.id === targetId ? { ...u, isFollowing: false } : u
          ));
        }
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
                  <button
                    onClick={() => navigate(`/profile/${user.id}`)}
                    className="flex items-center gap-3 flex-1 hover:opacity-70 transition-opacity"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(user.username || 'User')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium text-foreground">{user.username || 'Unknown User'}</p>
                      <p className="text-sm text-muted-foreground">@{user.username}</p>
                    </div>
                  </button>
                  
                  {currentUser?.id !== user.id && (
                    isOwnProfile && type === 'following' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => unfollowUser(user.id)}
                        className="flex items-center gap-2"
                      >
                        <UserCheck className="w-4 h-4" />
                        {t('following', { ns: 'common' })}
                      </Button>
                    ) : isOwnProfile && type === 'followers' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFollower(user.id)}
                        className="flex items-center gap-2 text-destructive hover:bg-destructive/10"
                      >
                        <UserMinus className="w-4 h-4" />
                        {t('remove', { ns: 'common' })}
                      </Button>
                    ) : user.isFollowing ? (
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
                        onClick={() => followUser(user.id)}
                        className="flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        {t('follow', { ns: 'common' })}
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
