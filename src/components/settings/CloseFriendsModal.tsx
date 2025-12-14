import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import closeFriendsIcon from '@/assets/settings-close-friends.png';

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface CloseFriendsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CloseFriendsModal: React.FC<CloseFriendsModalProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [closeFriends, setCloseFriends] = useState<User[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user && open) {
      fetchData();
    }
  }, [user, open]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch close friends
      const { data: closeFriendsData, error: cfError } = await supabase
        .from('close_friends')
        .select('friend_id')
        .eq('user_id', user.id);

      if (cfError) throw cfError;

      const closeFriendIds = closeFriendsData?.map(cf => cf.friend_id) || [];

      // Fetch users I follow (following)
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (followsError) throw followsError;

      const followingIds = followsData?.map(f => f.following_id) || [];

      if (followingIds.length > 0 || closeFriendIds.length > 0) {
        const allIds = [...new Set([...followingIds, ...closeFriendIds])];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', allIds);
        if (profilesError) throw profilesError;

        const closeFriendsProfiles = profiles?.filter(p => closeFriendIds.includes(p.id)) || [];
        const followingProfiles = profiles?.filter(p => followingIds.includes(p.id)) || [];

        setCloseFriends(closeFriendsProfiles);
        setFollowers(followingProfiles);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(t('errorLoading', { ns: 'common' }));
    } finally {
      setLoading(false);
    }
  };

  const addCloseFriend = async (friendId: string) => {
    if (!user) return;
    
    setActionLoading(friendId);
    try {
      const { error } = await supabase
        .from('close_friends')
        .insert({ user_id: user.id, friend_id: friendId });

      if (error) throw error;

      toast.success(t('addedToCloseFriends', { ns: 'settings' }));
      fetchData();
    } catch (error) {
      console.error('Error adding close friend:', error);
      toast.error(t('errorAdding', { ns: 'settings' }));
    } finally {
      setActionLoading(null);
    }
  };

  const removeCloseFriend = async (friendId: string) => {
    if (!user) return;
    
    setActionLoading(friendId);
    try {
      const { error } = await supabase
        .from('close_friends')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', friendId);

      if (error) throw error;

      toast.success(t('removedFromCloseFriends', { ns: 'settings' }));
      fetchData();
    } catch (error) {
      console.error('Error removing close friend:', error);
      toast.error(t('errorRemoving', { ns: 'settings' }));
    } finally {
      setActionLoading(null);
    }
  };

  const filteredFollowers = followers.filter(f => 
    !closeFriends.some(cf => cf.id === f.id) &&
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCloseFriends = closeFriends.filter(cf =>
    cf.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-full p-0 [&>button]:hidden">
        <div className="h-full flex flex-col">
          <SheetHeader className="pt-[calc(env(safe-area-inset-top)+8px)] p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <SheetTitle className="text-lg font-semibold flex items-center gap-3">
                <img src={closeFriendsIcon} alt="" className="w-10 h-10 object-contain" />
                {t('closeFriends', { ns: 'settings' })}
              </SheetTitle>
            </div>
          </SheetHeader>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder', { ns: 'settings' })}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-full"
                />
              </div>

              {/* Close Friends List */}
              {filteredCloseFriends.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground px-1">
                    {t('closeFriends', { ns: 'settings' })} ({closeFriends.length})
                  </h3>
                  {filteredCloseFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback>{friend.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <p className="font-medium">{friend.username}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeCloseFriend(friend.id)}
                        disabled={actionLoading === friend.id}
                        className="rounded-full"
                      >
                        {actionLoading === friend.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          t('remove', { ns: 'common' })
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Followers List */}
              {filteredFollowers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground px-1">
                    {t('addFromFollowing', { ns: 'settings', defaultValue: t('addFromFollowers', { ns: 'settings', defaultValue: 'Add from people you follow' }) })}
                  </h3>
                  {filteredFollowers.map((follower) => (
                    <div
                      key={follower.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={follower.avatar_url || undefined} />
                          <AvatarFallback>{follower.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <p className="font-medium">{follower.username}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addCloseFriend(follower.id)}
                        disabled={actionLoading === follower.id}
                        className="rounded-full"
                      >
                        {actionLoading === follower.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          t('add', { ns: 'common' })
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {filteredFollowers.length === 0 && filteredCloseFriends.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  {searchQuery 
                    ? t('noResults', { ns: 'common' }) 
                    : t('noFollowingAvailable', { ns: 'settings', defaultValue: t('noFollowersAvailable', { ns: 'settings', defaultValue: 'No following available' }) })}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CloseFriendsModal;
