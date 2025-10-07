import React, { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { usePostEngagement } from '@/hooks/usePostEngagement';
import { getPostComments, addPostComment, type PostComment } from '@/services/postCommentService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface PostDetailModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface PostData {
  id: string;
  user_id: string;
  caption: string | null;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

export const PostDetailModal = ({ postId, isOpen, onClose }: PostDetailModalProps) => {
  const { user } = useAuth();
  const { likedPosts, toggleLike, refetch: refetchEngagement } = usePostEngagement();
  const [post, setPost] = useState<PostData | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (isOpen && postId) {
      loadPostData();
      loadComments();
    }
  }, [isOpen, postId]);

  const loadPostData = async () => {
    try {
      setLoading(true);
      const { data: postData, error } = await supabase
        .from('posts')
        .select('id, user_id, caption, media_urls, likes_count, comments_count, created_at')
        .eq('id', postId)
        .single();

      if (error) throw error;

      // Fetch profile separately
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', postData.user_id)
        .single();

      setPost({
        ...postData,
        profiles: {
          username: profileData?.username || 'User',
          avatar_url: profileData?.avatar_url || null,
        },
      });
    } catch (error) {
      console.error('Error loading post:', error);
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    const fetchedComments = await getPostComments(postId);
    setComments(fetchedComments);
  };

  const handleLike = async () => {
    if (!user || !post) return;

    const success = await toggleLike(postId);
    if (success) {
      // Create notification for post owner
      if (post.user_id !== user.id && !likedPosts.has(postId)) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          type: 'like',
          title: 'New like on your post',
          message: `${user.user_metadata?.username || 'Someone'} liked your post`,
          data: {
            post_id: postId,
            user_id: user.id,
            user_name: user.user_metadata?.username,
            user_avatar: user.user_metadata?.avatar_url,
          },
        });
      }
      await loadPostData();
      await refetchEngagement();
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || !post) return;

    setSubmittingComment(true);
    try {
      const comment = await addPostComment(postId, user.id, newComment);
      if (comment) {
        setComments([...comments, comment]);
        setNewComment('');
        
        // Create notification for post owner
        if (post.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            type: 'comment',
            title: 'New comment on your post',
            message: `${user.user_metadata?.username || 'Someone'} commented: "${newComment.slice(0, 50)}${newComment.length > 50 ? '...' : ''}"`,
            data: {
              post_id: postId,
              user_id: user.id,
              user_name: user.user_metadata?.username,
              user_avatar: user.user_metadata?.avatar_url,
              comment: newComment,
            },
          });
        }
        
        await loadPostData(); // Refresh comment count
        toast.success('Comment added');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Check out this post by ${post.profiles.username}`,
          text: post.caption || 'Check out this post!',
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const nextMedia = () => {
    if (post && currentMediaIndex < post.media_urls.length - 1) {
      setCurrentMediaIndex(currentMediaIndex + 1);
    }
  };

  const prevMedia = () => {
    if (currentMediaIndex > 0) {
      setCurrentMediaIndex(currentMediaIndex - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="relative bg-background w-full h-full max-w-6xl max-h-screen flex flex-col md:flex-row">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </Button>

        {loading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : post ? (
          <>
            {/* Media Section */}
            <div className="relative w-full md:w-2/3 bg-black flex items-center justify-center">
              <img
                src={post.media_urls[currentMediaIndex]}
                alt="Post"
                className="max-w-full max-h-full object-contain"
              />

              {/* Navigation arrows for multiple media */}
              {post.media_urls.length > 1 && (
                <>
                  {currentMediaIndex > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={prevMedia}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                  )}
                  {currentMediaIndex < post.media_urls.length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextMedia}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  )}
                  
                  {/* Media indicator dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {post.media_urls.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentMediaIndex ? 'bg-white w-3' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Details Section */}
            <div className="w-full md:w-1/3 flex flex-col bg-background">
              {/* User header */}
              <div className="p-4 border-b flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={post.profiles.avatar_url || undefined} />
                  <AvatarFallback>{post.profiles.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{post.profiles.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Caption */}
              {post.caption && (
                <div className="p-4 border-b">
                  <p className="text-sm">{post.caption}</p>
                </div>
              )}

              {/* Comments section */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No comments yet. Be the first to comment!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={comment.avatar_url || undefined} />
                        <AvatarFallback>{comment.username?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-semibold">{comment.username}</span>{' '}
                          <span className="text-muted-foreground">{comment.content}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Actions */}
              <div className="border-t p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLike}
                    className={likedPosts.has(postId) ? 'text-red-500' : ''}
                  >
                    <Heart className={`w-6 h-6 ${likedPosts.has(postId) ? 'fill-current' : ''}`} />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <MessageCircle className="w-6 h-6" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleShare}>
                    <Share2 className="w-6 h-6" />
                  </Button>
                </div>

                <div className="text-sm font-semibold">
                  {post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}
                </div>

                {/* Add comment form */}
                <form onSubmit={handleCommentSubmit} className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                    disabled={submittingComment}
                  />
                  <Button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    size="sm"
                  >
                    Post
                  </Button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <p className="text-muted-foreground">Failed to load post</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetailModal;
