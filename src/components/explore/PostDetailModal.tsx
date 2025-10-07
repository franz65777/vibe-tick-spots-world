import React, { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, Send, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { usePostEngagement } from '@/hooks/usePostEngagement';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
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
  location_id: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  locations?: {
    id: string;
    name: string;
    category: string;
    city: string;
    latitude: number;
    longitude: number;
    google_place_id: string | null;
  } | null;
}

export const PostDetailModal = ({ postId, isOpen, onClose }: PostDetailModalProps) => {
  const { user } = useAuth();
  const { likedPosts, toggleLike, refetch: refetchEngagement } = usePostEngagement();
  const { savePlace, isPlaceSaved } = useSavedPlaces();
  const [post, setPost] = useState<PostData | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [postLikers, setPostLikers] = useState<PostLiker[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

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
        .select(`
          id, 
          user_id, 
          caption, 
          media_urls, 
          likes_count, 
          comments_count, 
          created_at,
          location_id,
          locations (
            id,
            name,
            category,
            city,
            latitude,
            longitude,
            google_place_id
          )
        `)
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
      } as PostData);
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

  const handlePinLocation = async () => {
    if (!post?.locations || savingLocation) return;

    setSavingLocation(true);
    try {
      const location = post.locations;
      await savePlace({
        id: location.google_place_id || location.id,
        name: location.name,
        category: location.category,
        city: location.city,
        coordinates: {
          lat: location.latitude,
          lng: location.longitude
        }
      });
      toast.success(`Saved ${location.name} to your pins!`);
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Failed to save location');
    } finally {
      setSavingLocation(false);
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
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-[60] flex items-center justify-center p-0 md:p-4">
      <div className="relative bg-card w-full h-full md:max-w-5xl md:max-h-[90vh] md:rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background/90 rounded-full"
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
            <div className="relative w-full md:w-[60%] bg-black flex items-center justify-center">
              {post.media_urls[currentMediaIndex]?.endsWith('.mp4') || 
               post.media_urls[currentMediaIndex]?.endsWith('.mov') ? (
                <video
                  src={post.media_urls[currentMediaIndex]}
                  controls
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={post.media_urls[currentMediaIndex]}
                  alt="Post"
                  className="w-full h-full object-contain"
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
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/60 hover:bg-background/80 backdrop-blur-sm rounded-full"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                  )}
                  {currentMediaIndex < post.media_urls.length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextMedia}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/60 hover:bg-background/80 backdrop-blur-sm rounded-full"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  )}
                  
                  {/* Media indicator dots */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {post.media_urls.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentMediaIndex(index)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          index === currentMediaIndex ? 'bg-white w-2 h-2' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Details Section */}
            <div className="w-full md:w-[40%] flex flex-col bg-card">
              {/* User header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={post.profiles.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {post.profiles.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{post.profiles.username}</p>
                </div>
              </div>

              {/* Caption & Comments section */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {/* Caption with username */}
                  {post.caption && (
                    <div className="flex gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={post.profiles.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {post.profiles.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold mr-2">{post.profiles.username}</span>
                          {post.caption}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Comments */}
                  {comments.length === 0 && !post.caption && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <MessageCircle className="w-10 h-10 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                    </div>
                  )}
                  
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={comment.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted text-xs">
                          {comment.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-semibold mr-2">{comment.username}</span>
                          {comment.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="border-t border-border">
                {/* Action buttons */}
                <div className="px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleLike}
                      className="h-9 w-9 hover:scale-110 transition-transform"
                    >
                      <Heart 
                        className={`w-6 h-6 ${likedPosts.has(postId) ? 'fill-red-500 text-red-500' : 'text-foreground'}`} 
                      />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-9 w-9 hover:scale-110 transition-transform"
                    >
                      <MessageCircle className="w-6 h-6" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleShare}
                      className="h-9 w-9 hover:scale-110 transition-transform"
                    >
                      <Send className="w-6 h-6" />
                    </Button>
                  </div>
                  {post.locations && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePinLocation}
                      disabled={savingLocation || isPlaceSaved(post.locations.google_place_id || post.locations.id)}
                      className="h-9 w-9 hover:scale-110 transition-transform"
                    >
                      <MapPin 
                        className={`w-6 h-6 ${
                          isPlaceSaved(post.locations.google_place_id || post.locations.id) 
                            ? 'fill-current text-primary' 
                            : 'text-foreground'
                        }`} 
                      />
                    </Button>
                  )}
                </div>

                {/* Like count */}
                <div className="px-4 pb-2">
                  {postLikers.length > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {postLikers.slice(0, 3).map((liker) => (
                          <Avatar key={liker.id} className="w-5 h-5 border-2 border-card">
                            <AvatarImage src={liker.avatar_url || undefined} />
                            <AvatarFallback className="bg-muted text-[9px]">
                              {liker.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <p className="text-xs text-foreground">
                        Liked by{' '}
                        <span className="font-semibold">{postLikers[0].username}</span>
                        {postLikers.length > 1 && (
                          <span> and <span className="font-semibold">{postLikers.length - 1} other{postLikers.length > 2 ? 's' : ''}</span></span>
                        )}
                      </p>
                    </div>
                  ) : post.likes_count > 0 ? (
                    <p className="text-sm font-semibold">{post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}</p>
                  ) : null}
                </div>

                {/* Timestamp */}
                <div className="px-4 pb-2">
                  <p className="text-xs text-muted-foreground uppercase">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Add comment form */}
                <div className="px-4 py-3 border-t border-border">
                  <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 min-h-[36px] max-h-[100px] resize-none border-0 focus-visible:ring-0 px-0 text-sm"
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
                    <Button
                      type="submit"
                      variant="ghost"
                      disabled={!newComment.trim() || submittingComment}
                      className="text-primary font-semibold hover:text-primary/80 px-0"
                    >
                      Post
                    </Button>
                  </form>
                </div>
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
