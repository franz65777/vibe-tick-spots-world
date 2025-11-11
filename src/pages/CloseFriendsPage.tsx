import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, UserPlus, UserMinus, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
}

const CloseFriendsPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [closeFriends, setCloseFriends] = useState<User[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

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

      // Fetch all followers
      const { data: followsData, error: followsError } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', user.id);

      if (followsError) throw followsError;

      const followerIds = followsData?.map(f => f.follower_id) || [];

      if (followerIds.length > 0 || closeFriendIds.length > 0) {
        const allIds = [...new Set([...followerIds, ...closeFriendIds])];
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', allIds);

        if (profilesError) throw profilesError;

        const closeFriendsProfiles = profiles?.filter(p => closeFriendIds.includes(p.id)) || [];
        const followersProfiles = profiles?.filter(p => followerIds.includes(p.id)) || [];

        setCloseFriends(closeFriendsProfiles);
        setFollowers(followersProfiles);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Errore nel caricamento');
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

      toast.success('Aggiunto agli amici stretti');
      fetchData();
    } catch (error) {
      console.error('Error adding close friend:', error);
      toast.error('Errore durante l\'aggiunta');
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

      toast.success('Rimosso dagli amici stretti');
      fetchData();
    } catch (error) {
      console.error('Error removing close friend:', error);
      toast.error('Errore durante la rimozione');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Amici Stretti</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Cerca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        </div>

        {/* Close Friends List */}
        {filteredCloseFriends.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Amici Stretti ({closeFriends.length})
            </h3>
            {filteredCloseFriends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={friend.avatar_url || undefined} />
                    <AvatarFallback>{friend.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{friend.username}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCloseFriend(friend.id)}
                  disabled={actionLoading === friend.id}
                >
                  {actionLoading === friend.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserMinus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Followers List */}
        {filteredFollowers.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Aggiungi dai tuoi follower
            </h3>
            {filteredFollowers.map((follower) => (
              <div
                key={follower.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={follower.avatar_url || undefined} />
                    <AvatarFallback>{follower.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{follower.username}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addCloseFriend(follower.id)}
                  disabled={actionLoading === follower.id}
                >
                  {actionLoading === follower.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {filteredFollowers.length === 0 && filteredCloseFriends.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? 'Nessun risultato' : 'Nessun follower disponibile'}
          </div>
        )}
      </div>
    </div>
  );
};

export default CloseFriendsPage;