import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, ChevronLeft, ChevronRight, MapPin, MoreVertical, Trash2, EyeOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { usePostEngagement } from '@/hooks/usePostEngagement';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { usePostDeletion } from '@/hooks/usePostDeletion';
import { getPostComments, type PostComment } from '@/services/postCommentService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { PostCommentsDrawer } from './PostCommentsDrawer';

interface PostDetailModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  source?: 'pin' | 'search' | 'profile';
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

export const PostDetailModal = ({ postId, isOpen, onClose, source = 'search' }: PostDetailModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { likedPosts, toggleLike, refetch: refetchEngagement } = usePostEngagement();
  const { savePlace, isPlaceSaved } = useSavedPlaces();
  const { deletePost, deleting } = usePostDeletion();
  const [post, setPost] = useState<PostData | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [postLikers, setPostLikers] = useState<PostLiker[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [savingLocation, setSavingLocation] = useState(false);
  const [likingPost, setLikingPost] = useState(false);
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [mediaAspectRatio, setMediaAspectRatio] = useState<'vertical' | 'horizontal'>('vertical');

  useEffect(() => {
    if (isOpen && postId) {
      loadPostData();
      loadComments();
      loadPostLikers();
      setCurrentMediaIndex(0);
    }
  }, [isOpen, postId]);

  // Detect aspect ratio when media loads
  useEffect(() => {
    if (post && post.media_urls[currentMediaIndex]) {
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        setMediaAspectRatio(ratio > 1.2 ? 'horizontal' : 'vertical');
      };
      img.src = post.media_urls[currentMediaIndex];
    }
  }, [post, currentMediaIndex]);

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
    if (!user || !post || likingPost) return;

    setLikingPost(true);
    const isCurrentlyLiked = likedPosts.has(postId);
    const newLikeCount = isCurrentlyLiked ? post.likes_count - 1 : post.likes_count + 1;

    // Optimistic update
    setPost(prev => prev ? { ...prev, likes_count: newLikeCount } : null);

    const success = await toggleLike(postId);
    if (success) {
      // Reload engagement data to ensure sync
      await refetchEngagement();
      
      // Create notification for post owner
      if (post.user_id !== user.id && !isCurrentlyLiked) {
        supabase.from('notifications').insert({
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
      
      // Reload post data to get accurate count
      await loadPostData();
      await loadPostLikers();
    } else {
      // Revert on failure
      setPost(prev => prev ? { ...prev, likes_count: post.likes_count } : null);
    }
    
    setLikingPost(false);
  };

  const handleCommentAdded = (comment: PostComment) => {
    setComments([...comments, comment]);
    setPost(prev => prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : null);
  };

  const handleShare = async () => {
    if (!post || !user) return;
    
    try {
      const shareUrl = `${window.location.origin}/post/${postId}`;
      
      // Track share in database
      await supabase.from('post_shares').insert({
        post_id: postId,
        user_id: user.id,
        shared_at: new Date().toISOString()
      });
      
      if (navigator.share) {
        await navigator.share({
          title: `Check out this post by ${post.profiles.username}`,
          text: post.caption || 'Check out this post!',
          url: shareUrl,
        });
        toast.success('Post shared successfully!');
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      if ((error as Error).name !== 'AbortError') {
        toast.error('Failed to share post');
      }
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    
    const result = await deletePost(postId);
    if (result.success) {
      toast.success('Post deleted successfully');
      onClose();
    } else {
      toast.error('Failed to delete post');
    }
  };

  const handleHide = async () => {
    if (!user || !post) return;
    
    try {
      await supabase.from('hidden_posts').insert({
        user_id: user.id,
        post_id: postId,
      });
      toast.success('Post hidden');
      onClose();
    } catch (error) {
      console.error('Error hiding post:', error);
      toast.error('Failed to hide post');
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
  
  const getHeaderText = () => {
    switch (source) {
      case 'pin': return 'Pin';
      case 'profile': return 'Profile';
      default: return 'Post';
    }
  };

  const handleLocationClick = () => {
    if (post?.locations) {
      onClose();
      // Navigate to home page with map centered on this location and pin detail card open
      navigate('/', { 
        state: { 
          centerMap: {
            lat: post.locations.latitude,
            lng: post.locations.longitude,
            placeId: post.locations.google_place_id,
            name: post.locations.name
          },
          openPinDetail: {
            id: post.locations.google_place_id || post.locations.id,
            name: post.locations.name,
            category: post.locations.category,
            city: post.locations.city,
            lat: post.locations.latitude,
            lng: post.locations.longitude
          }
        } 
      });
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-0">
        <div className="relative bg-background w-full h-full max-w-2xl md:max-w-4xl max-h-[calc(100vh-80px)] md:max-h-[95vh] flex flex-col overflow-hidden md:rounded-lg mb-16 md:mb-0">
        
        {/* Top bar with back button, title, and menu */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-muted rounded-full"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            
            <div className="absolute left-1/2 -translate-x-1/2">
              <p className="font-semibold">{getHeaderText()}</p>
              {post && (
                <p className="text-xs text-muted-foreground">{post.profiles.username}</p>
              )}
            </div>
            
            {post && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-muted rounded-full"
                  >
                    <MoreVertical className="w-6 h-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {post.user_id === user.id ? (
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Post
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={handleHide}>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide Post
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : post ? (
          <>
            {/* Header - Avatar, Username, Location */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-background flex-shrink-0 mt-[57px]">
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarImage src={post.profiles.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {post.profiles.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <button
                  onClick={() => navigate(`/profile/${post.user_id}`)}
                  className="font-semibold text-sm truncate hover:opacity-70 text-left transition-opacity"
                >
                  {post.profiles.username}
                </button>
                {post.locations && (
                  <button
                    onClick={handleLocationClick}
                    className="text-xs text-muted-foreground hover:underline truncate text-left"
                  >
                    {post.locations.name}
                  </button>
                )}
              </div>
            </div>

            {/* Media Section */}
            <div 
              className="relative bg-white flex items-center justify-center flex-shrink-0" 
              style={{ 
                aspectRatio: mediaAspectRatio === 'vertical' ? '4/5' : '1.91/1',
                maxHeight: '65vh'
              }}
            >
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
                            ? 'w-2 h-2 bg-primary' 
                            : 'w-1.5 h-1.5 bg-white/60'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Action buttons - RIGHT below media */}
            <div className="px-4 py-3 border-b border-border bg-background flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Like button */}
                  <button
                    onClick={handleLike}
                    disabled={!user || likingPost}
                    className="flex items-center gap-1.5 hover:opacity-60 transition-opacity disabled:opacity-50"
                  >
                    <Heart 
                      className={`w-6 h-6 transition-colors ${likedPosts.has(postId) ? 'fill-red-500 text-red-500' : ''}`} 
                    />
                  </button>
                  
                  {/* Comment button */}
                  <button
                    onClick={() => setCommentsDrawerOpen(true)}
                    className="flex items-center gap-1.5 hover:opacity-60 transition-opacity"
                  >
                    <MessageCircle className="w-6 h-6" />
                  </button>
                  
                  {/* Share button */}
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 hover:opacity-60 transition-opacity"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Pin button - right aligned */}
                {post.locations && (
                  <button
                    onClick={handlePinLocation}
                    disabled={isLocationSaved || savingLocation}
                    className={`hover:opacity-60 transition-opacity ${
                      isLocationSaved ? 'cursor-default opacity-100' : 'cursor-pointer'
                    }`}
                  >
                    <MapPin 
                      className={`w-6 h-6 ${isLocationSaved ? 'fill-current' : ''}`}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Like count and timestamp */}
            <div className="px-4 py-2 bg-background flex-shrink-0">
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
                  <p className="text-sm">
                    <span className="font-semibold">{post.likes_count.toLocaleString()}</span>
                    {post.likes_count === 1 ? ' like' : ' likes'}
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground uppercase">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Comments Drawer */}
      <PostCommentsDrawer
        isOpen={commentsDrawerOpen}
        onClose={() => setCommentsDrawerOpen(false)}
        postId={postId}
        postOwnerId={post?.user_id || ''}
        comments={comments}
        onCommentAdded={handleCommentAdded}
      />
    </>
  );
};

export default PostDetailModal;
