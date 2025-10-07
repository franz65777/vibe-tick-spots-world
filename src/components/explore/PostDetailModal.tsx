import React, { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, Share2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface PostLiker {
  id: string;
  username: string;
  avatar_url: string | null;
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
  const [postLikers, setPostLikers] = useState<PostLiker[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (isOpen && postId) {
      loadPostData();
      loadComments();
      loadPostLikers();
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

  const loadPostLikers = async () => {
    try {
      const { data: likes, error } = await supabase
        .from('post_likes')
        .select(`
          user_id,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .limit(10);

      if (error) throw error;

      const likers = likes?.map((like: any) => ({
        id: like.user_id,
        username: like.profiles?.username || 'User',
        avatar_url: like.profiles?.avatar_url || null,
      })) || [];

      setPostLikers(likers);
    } catch (error) {
      console.error('Error loading post likers:', error);
    }
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
      await loadPostLikers();
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
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-[60] flex items-center justify-center">
      <div className="relative bg-card border border-border w-full h-full max-w-6xl max-h-screen flex flex-col md:flex-row rounded-lg md:rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-muted/80 backdrop-blur-sm hover:bg-muted rounded-full"
        >
          <X className="w-5 h-5" />
        </Button>

        {loading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : post ? (
          <>
            {/* Media Section */}
            <div className="relative w-full md:w-2/3 bg-muted/20 flex items-center justify-center">
              {post.media_urls[currentMediaIndex]?.endsWith('.mp4') || 
               post.media_urls[currentMediaIndex]?.endsWith('.mov') ? (
                <video
                  src={post.media_urls[currentMediaIndex]}
                  controls
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <img
                  src={post.media_urls[currentMediaIndex]}
                  alt="Post"
                  className="max-w-full max-h-full object-contain"
                />
              )}

              {/* Navigation arrows for multiple media */}
              {post.media_urls.length > 1 && (
                <>
                  {currentMediaIndex > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={prevMedia}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background backdrop-blur-sm rounded-full shadow-lg"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                  )}
                  {currentMediaIndex < post.media_urls.length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextMedia}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/90 hover:bg-background backdrop-blur-sm rounded-full shadow-lg"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  )}
                  
                  {/* Media indicator dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-full">
                    {post.media_urls.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentMediaIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentMediaIndex ? 'bg-primary w-3' : 'bg-muted-foreground/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Details Section */}
            <div className="w-full md:w-1/3 flex flex-col bg-card">
              {/* User header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Avatar className="w-11 h-11 ring-2 ring-border">
                  <AvatarImage src={post.profiles.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {post.profiles.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{post.profiles.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Caption */}
              {post.caption && (
                <div className="p-4 border-b border-border">
                  <p className="text-sm leading-relaxed">{post.caption}</p>
                </div>
              )}

              {/* Comments section */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 pr-4">
                  {comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MessageCircle className="w-12 h-12 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">
                        No comments yet
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Be the first to share your thoughts!
                      </p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3 group">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={comment.avatar_url || undefined} />
                          <AvatarFallback className="bg-muted text-xs">
                            {comment.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="bg-muted/50 rounded-2xl px-3 py-2">
                            <p className="text-sm font-semibold mb-0.5">{comment.username}</p>
                            <p className="text-sm text-foreground/90 leading-relaxed break-words">
                              {comment.content}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5 px-3">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="border-t border-border p-4 space-y-3 bg-card">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLike}
                    className={`hover:scale-110 transition-transform ${
                      likedPosts.has(postId) ? 'text-red-500 hover:text-red-600' : 'hover:text-red-500'
                    }`}
                  >
                    <Heart 
                      className={`w-6 h-6 ${likedPosts.has(postId) ? 'fill-current' : ''}`} 
                    />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="hover:scale-110 transition-transform hover:text-primary"
                  >
                    <MessageCircle className="w-6 h-6" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleShare}
                    className="hover:scale-110 transition-transform hover:text-primary"
                  >
                    <Share2 className="w-6 h-6" />
                  </Button>
                </div>

                {/* Liked by avatars */}
                {postLikers.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {postLikers.slice(0, 3).map((liker) => (
                        <Avatar key={liker.id} className="w-6 h-6 ring-2 ring-card">
                          <AvatarImage src={liker.avatar_url || undefined} />
                          <AvatarFallback className="bg-muted text-[10px]">
                            {liker.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Liked by{' '}
                      <span className="font-semibold text-foreground">{postLikers[0].username}</span>
                      {postLikers.length > 1 && (
                        <span>
                          {' '}and{' '}
                          <span className="font-semibold text-foreground">
                            {postLikers.length - 1} other{postLikers.length > 2 ? 's' : ''}
                          </span>
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {/* Like count fallback */}
                {postLikers.length === 0 && post.likes_count > 0 && (
                  <div className="text-sm font-semibold">
                    {post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}
                  </div>
                )}

                {/* Add comment form */}
                <form onSubmit={handleCommentSubmit} className="flex items-end gap-2 pt-2">
                  <div className="flex-1 relative">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 min-h-[44px] max-h-[120px] resize-none rounded-2xl border-muted pr-12 focus-visible:ring-primary"
                      disabled={submittingComment}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (newComment.trim()) {
                            handleCommentSubmit(e);
                          }
                        }
                      }}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!newComment.trim() || submittingComment}
                    size="sm"
                    className="rounded-full px-6 h-[44px] font-semibold"
                  >
                    {submittingComment ? 'Posting...' : 'Post'}
                  </Button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full gap-3">
            <X className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">Failed to load post</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetailModal;
