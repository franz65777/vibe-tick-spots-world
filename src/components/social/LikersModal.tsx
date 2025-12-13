import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UserCheck, UserPlus } from 'lucide-react';

interface Liker {
  user_id: string;
  username: string;
  avatar_url: string | null;
  is_followed: boolean;
}

interface LikersModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
}

export const LikersModal: React.FC<LikersModalProps> = ({ isOpen, onClose, postId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [likers, setLikers] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && postId) {
      loadLikers();
    }
  }, [isOpen, postId]);

  const loadLikers = async () => {
    setLoading(true);
    try {
      // Get all likes for this post with user profiles
      const { data: likes } = await supabase
        .from('post_likes')
        .select(`
          user_id,
          profiles:user_id (
            id,
            username,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (!likes || likes.length === 0) {
        setLikers([]);
        setLoading(false);
        return;
      }

      // Get current user's follows
      let followingIds = new Set<string>();
      if (user?.id) {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        followingIds = new Set(follows?.map(f => f.following_id) || []);
      }

      // Map likes to Liker format
      const likersList = likes
        .map(like => {
          const profile = like.profiles as any;
          if (!profile) return null;
          
          return {
            user_id: like.user_id,
            username: profile.username || 'User',
            avatar_url: profile.avatar_url || null,
            is_followed: followingIds.has(like.user_id)
          };
        })
        .filter((u): u is Liker => u !== null);

      // Prioritize followed users, then others
      const followedUsers = likersList.filter(u => u.is_followed);
      const otherUsers = likersList.filter(u => !u.is_followed);

      setLikers([...followedUsers, ...otherUsers]);
    } catch (error) {
      console.error('Error loading likers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (likerId: string) => {
    if (!user?.id || likerId === user.id) return;
    
    setFollowLoading(likerId);
    try {
      const liker = likers.find(l => l.user_id === likerId);
      if (!liker) return;

      if (liker.is_followed) {
        // Unfollow
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', likerId);
      } else {
        // Follow
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: likerId });
      }

      // Update local state
      setLikers(prev => prev.map(l => 
        l.user_id === likerId 
          ? { ...l, is_followed: !l.is_followed }
          : l
      ));
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(null);
    }
  };

  const handleUserClick = (userId: string) => {
    onClose();
    navigate(`/profile/${userId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('likes', { ns: 'common', defaultValue: 'Likes' })}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : likers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noLikesYet', { ns: 'common', defaultValue: 'No likes yet' })}
            </div>
          ) : (
            <div className="space-y-2">
              {likers.map((liker) => (
                <div 
                  key={liker.user_id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <button
                    onClick={() => handleUserClick(liker.user_id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={liker.avatar_url || undefined} />
                      <AvatarFallback>
                        {liker.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm truncate">{liker.username}</span>
                  </button>
                  
                  {user?.id && liker.user_id !== user.id && (
                    <Button
                      variant={liker.is_followed ? "secondary" : "default"}
                      size="sm"
                      onClick={() => handleFollowToggle(liker.user_id)}
                      disabled={followLoading === liker.user_id}
                      className="ml-2"
                    >
                      {followLoading === liker.user_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : liker.is_followed ? (
                        <UserCheck className="w-4 h-4" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
