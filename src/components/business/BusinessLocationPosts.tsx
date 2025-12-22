import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pin, Heart, MessageCircle, Bookmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Post {
  id: string;
  user_id: string;
  caption?: string;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  saves_count: number;
  created_at: string;
  is_pinned?: boolean;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

interface BusinessLocationPostsProps {
  posts: Post[];
  onPinToggle: (postId: string, isPinned: boolean) => void;
}

const BusinessLocationPosts = ({ posts, onPinToggle }: BusinessLocationPostsProps) => {
  const { t } = useTranslation();
  const [pinningPostId, setPinningPostId] = useState<string | null>(null);

  const handlePinToggle = async (postId: string, isPinned: boolean) => {
    setPinningPostId(postId);
    try {
      await onPinToggle(postId, isPinned);
      toast.success(isPinned 
        ? t('postUnpinned', { ns: 'business', defaultValue: 'Post unpinned' }) 
        : t('postPinnedToTop', { ns: 'business', defaultValue: 'Post pinned to top' }));
    } catch (error) {
      toast.error(t('failedToUpdatePinStatus', { ns: 'business', defaultValue: 'Failed to update pin status' }));
    } finally {
      setPinningPostId(null);
    }
  };

  // Sort posts: pinned posts first
  const sortedPosts = [...posts].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No posts yet for this location</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {sortedPosts.map((post) => (
        <Card key={post.id} className="overflow-hidden">
          <div className="relative">
            {/* Post Image */}
            {post.media_urls && post.media_urls.length > 0 && (
              <div className="aspect-square bg-muted">
                <img
                  src={post.media_urls[0]}
                  alt="Post"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Pin Badge */}
            {post.is_pinned && (
              <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                <Pin className="w-3 h-3 mr-1" />
                Pinned
              </Badge>
            )}
          </div>

          <div className="p-4 space-y-3">
            {/* User Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-sm font-medium">
                  {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium">
                  {post.profiles?.username || 'User'}
                </span>
              </div>

              {/* Pin/Unpin Button */}
              <Button
                variant={post.is_pinned ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePinToggle(post.id, post.is_pinned || false)}
                disabled={pinningPostId === post.id}
                className="gap-2"
              >
                <Pin className={`w-4 h-4 ${post.is_pinned ? 'fill-current' : ''}`} />
                {post.is_pinned ? 'Unpin' : 'Pin'}
              </Button>
            </div>

            {/* Caption */}
            {post.caption && (
              <p className="text-sm text-foreground">{post.caption}</p>
            )}

            {/* Post Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <span>{post.likes_count || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{post.comments_count || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Bookmark className="w-4 h-4" />
                <span>{post.saves_count || 0}</span>
              </div>
            </div>

            {/* Date */}
            <p className="text-xs text-muted-foreground">
              {new Date(post.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default BusinessLocationPosts;
