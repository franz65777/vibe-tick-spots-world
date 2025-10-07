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

  const isLocationSaved = post?.locations ? isPlaceSaved(post.locations.google_place_id || post.locations.id) : false;

  return (
    <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-0">
      <div className="relative bg-background w-full h-full max-w-5xl max-h-[100vh] md:max-h-[95vh] flex flex-col md:flex-row overflow-hidden md:rounded-lg">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-2 right-2 z-10 text-white hover:bg-white/10 rounded-full"
        >
          <X className="w-6 h-6" />
        </Button>

        {loading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : post ? (
          <>
            {/* Media Section - Left Side */}
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

              {/* Navigation arrows */}
              {post.media_urls.length > 1 && (
                <>
                  {currentMediaIndex > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={prevMedia}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                  )}
                  {currentMediaIndex < post.media_urls.length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={nextMedia}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  )}
                  
                  {/* Media indicator dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {post.media_urls.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentMediaIndex(index)}
                        className={`rounded-full transition-all ${
                          index === currentMediaIndex 
                            ? 'w-2 h-2 bg-blue-500' 
                            : 'w-1.5 h-1.5 bg-white/60'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Details Section - Right Side */}
            <div className="w-full md:w-[40%] flex flex-col bg-background">
              {/* User header at the top */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={post.profiles.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                    {post.profiles.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold text-sm">{post.profiles.username}</p>
              </div>

              {/* Scrollable Caption & Comments */}
              <ScrollArea className="flex-1 px-4 py-3">
                <div className="space-y-4">
                  {/* Caption */}
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
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MessageCircle className="w-12 h-12 text-muted-foreground/20 mb-2" />
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Be the first to comment</p>
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

              {/* Bottom section with actions */}
              <div className="border-t border-border">
                {/* Action buttons row */}
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleLike}
                      className="hover:opacity-60 transition-opacity"
                    >
                      <Heart 
                        className={`w-7 h-7 ${likedPosts.has(postId) ? 'fill-red-500 text-red-500' : ''}`} 
                      />
                    </button>
                    <button className="hover:opacity-60 transition-opacity">
                      <MessageCircle className="w-7 h-7" />
                    </button>
                    <button 
                      onClick={handleShare}
                      className="hover:opacity-60 transition-opacity"
                    >
                      <Send className="w-7 h-7" />
                    </button>
                  </div>
                  {post.locations && (
                    <button
                      onClick={isLocationSaved ? undefined : handlePinLocation}
                      disabled={savingLocation || isLocationSaved}
                      className={`hover:opacity-60 transition-opacity ${
                        isLocationSaved ? 'cursor-default opacity-100' : ''
                      }`}
                    >
                      <MapPin 
                        className={`w-7 h-7 ${
                          isLocationSaved 
                            ? 'fill-current' 
                            : ''
                        }`} 
                      />
                    </button>
                  )}
                </div>

                {/* Like count with avatars */}
                <div className="px-4 pb-2">
                  {post.likes_count > 0 && (
                    <div className="flex items-center gap-2 mb-1">
                      {postLikers.length > 0 && (
                        <div className="flex -space-x-2">
                          {postLikers.slice(0, 3).map((liker) => (
                            <Avatar key={liker.id} className="w-5 h-5 border-2 border-background">
                              <AvatarImage src={liker.avatar_url || undefined} />
                              <AvatarFallback className="bg-muted text-[10px]">
                                {liker.username[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                      )}
                      <p className="text-sm font-semibold">
                        {post.likes_count === 1 ? '1 like' : `${post.likes_count} likes`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="px-4 pb-3">
                  <p className="text-xs text-muted-foreground uppercase">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Comment input */}
                <div className="border-t border-border px-4 py-3">
                  <form onSubmit={handleCommentSubmit} className="flex gap-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="min-h-[40px] max-h-[80px] resize-none border-0 focus-visible:ring-0 p-0 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleCommentSubmit(e);
                        }
                      }}
                    />
                    <Button 
                      type="submit" 
                      disabled={!newComment.trim() || submittingComment}
                      variant="ghost"
                      className="text-primary font-semibold hover:text-primary/80 disabled:opacity-40"
                    >
                      Post
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full gap-2">
            <X className="w-12 h-12 text-destructive" />
            <p className="text-muted-foreground">Failed to load post</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetailModal;
