import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, ChevronLeft, ChevronRight, MapPin, MoreHorizontal, Trash2, EyeOff, X, Star } from 'lucide-react';
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
import PostShareModal from './PostShareModal';
import { ReviewModal } from './ReviewModal';
import { getPostReviews, type PostReview } from '@/services/reviewService';

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
  saves_count: number;
  shares_count: number;
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
  const [sharesCount, setSharesCount] = useState<number>(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviews, setReviews] = useState<PostReview[]>([]);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && postId) {
      loadPostData();
      loadComments();
      loadPostLikers();
      loadReviews();
      refetchEngagement();
      setCurrentMediaIndex(0);
    }
  }, [isOpen, postId]);

  const loadReviews = async () => {
    const fetchedReviews = await getPostReviews(postId);
    setReviews(fetchedReviews);
  };

  // Track scroll position for media index
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !post || post.media_urls.length <= 1) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const containerWidth = container.offsetWidth;
      const index = Math.round(scrollLeft / containerWidth);
      setCurrentMediaIndex(index);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [post]);

  // Detect aspect ratio when media loads
  useEffect(() => {
    if (post && post.media_urls[currentMediaIndex]) {
      const mediaUrl = post.media_urls[currentMediaIndex];
      
      // Check if it's a video
      if (mediaUrl.endsWith('.mp4') || mediaUrl.endsWith('.mov')) {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          const ratio = video.videoWidth / video.videoHeight;
          setMediaAspectRatio(ratio > 1.1 ? 'horizontal' : 'vertical');
        };
        video.src = mediaUrl;
      } else {
        const img = new Image();
        img.onload = () => {
          const ratio = img.width / img.height;
          setMediaAspectRatio(ratio > 1.1 ? 'horizontal' : 'vertical');
        };
        img.src = mediaUrl;
      }
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
          saves_count,
          shares_count,
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
        .maybeSingle();

      if (error) throw error;
      if (!postData) {
        toast.error('Post not found');
        setPost(null);
        return;
      }

      // Fetch profile separately
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', postData.user_id)
        .maybeSingle();

      setPost({
        ...postData,
        profiles: {
          username: profileData?.username || 'User',
          avatar_url: profileData?.avatar_url || null,
        },
      } as PostData);
      
      // Update shares count from the loaded data
      setSharesCount(postData.shares_count || 0);
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
        .select('user_id')
        .eq('post_id', postId)
        .limit(10);

      if (error) throw error;

      if (!likes || likes.length === 0) {
        setPostLikers([]);
        return;
      }

      // Fetch profiles separately
      const userIds = likes.map(like => like.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const likers = likes.map(like => {
        const profile = profiles?.find(p => p.id === like.user_id);
        return {
          id: like.user_id,
          username: profile?.username || 'User',
          avatar_url: profile?.avatar_url || null,
        };
      });

      setPostLikers(likers);
    } catch (error) {
      console.error('Error loading post likers:', error);
    }
  };

  const handleLike = async () => {
    if (!user || !post || likingPost) return;

    setLikingPost(true);
    try {
      console.log('Toggling like for post:', postId, 'User:', user.id);
      const isCurrentlyLiked = likedPosts.has(postId);

      const success = await toggleLike(postId);
      console.log('Toggle like result:', success);
      
      if (success) {
        // Refetch engagement state
        await refetchEngagement();
        
        // Create notification for post owner (only on new like)
        if (post.user_id !== user.id && !isCurrentlyLiked) {
          try {
            // Fetch current user's profile data
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', user.id)
              .maybeSingle();

            await supabase.from('notifications').insert({
              user_id: post.user_id,
              type: 'like',
              title: 'New like on your post',
              message: `${profile?.username || 'Someone'} liked your post`,
              data: {
                post_id: postId,
                user_id: user.id,
                user_name: profile?.username,
                user_avatar: profile?.avatar_url,
                post_image: post.media_urls?.[0],
                caption: post.caption
              },
            });
          } catch (err) {
            console.error('Error creating notification:', err);
          }
        }
        
        // Reload post data (counts updated by DB trigger)
        await loadPostData();
        await loadPostLikers();
        toast.success(isCurrentlyLiked ? 'Post unliked' : 'Post liked');
      } else {
        toast.error('Failed to toggle like. Please try again.');
      }
    } catch (error) {
      console.error('Error in handleLike:', error);
      toast.error('Failed to toggle like');
    } finally {
      setLikingPost(false);
    }
  };

  const handleCommentAdded = async (comment: PostComment) => {
    setComments([...comments, comment]);
    await loadPostData();
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
      <div className="fixed inset-0 bg-background z-[100] flex flex-col overflow-hidden pb-20">
        {/* Top bar with back button and title */}
        <div className="flex-shrink-0 bg-background border-b border-border">
          <div className="flex items-center px-4 py-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-muted rounded-full"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
            
            <div className="flex-1 text-center">
              <p className="font-semibold">{getHeaderText()}</p>
            </div>
            
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center w-full h-full">
            <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : post ? (
          <div className="flex flex-col flex-1 overflow-y-auto">
            {/* Header - Avatar, Username, Location */}
            <div className="px-4 py-2 flex items-center gap-3 bg-background flex-shrink-0">
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
                    className="text-xs text-muted-foreground hover:underline truncate text-left flex items-center gap-1"
                  >
                    {post.locations.name}
                  </button>
                )}
              </div>
              
              {/* 3-dot menu moved here */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-muted rounded-full flex-shrink-0"
                    >
                      <MoreHorizontal className="w-5 h-5" />
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

            {/* Media Section with Horizontal Scrolling */}
            {post.media_urls.length > 1 ? (
              <div 
                ref={scrollContainerRef}
                className="relative bg-black flex-shrink-0 overflow-x-auto snap-x snap-mandatory scrollbar-hide"
              >
                <div className="flex">
                  {post.media_urls.map((url, index) => (
                    <div 
                      key={index}
                      className="snap-center flex-shrink-0 flex items-center justify-center" 
                      style={{ 
                        width: '100vw',
                        maxWidth: '100%',
                        aspectRatio: mediaAspectRatio === 'vertical' ? '4/5' : '16/9',
                        maxHeight: '60vh'
                      }}
                    >
                      {url.endsWith('.mp4') || url.endsWith('.mov') ? (
                        <video
                          src={url}
                          controls
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={url}
                          alt={`Post ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Media indicator dots */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
                  {post.media_urls.map((_, index) => (
                    <div
                      key={index}
                      className={`rounded-full transition-all ${
                        index === currentMediaIndex 
                          ? 'w-2 h-2 bg-primary' 
                          : 'w-1.5 h-1.5 bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div 
                className="relative bg-black flex items-center justify-center flex-shrink-0" 
                style={{ 
                  aspectRatio: mediaAspectRatio === 'vertical' ? '4/5' : '16/9',
                  maxHeight: '60vh'
                }}
              >
                {post.media_urls[0]?.endsWith('.mp4') || 
                 post.media_urls[0]?.endsWith('.mov') ? (
                  <video
                    src={post.media_urls[0]}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={post.media_urls[0]}
                    alt="Post"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}

            {/* Action buttons - RIGHT below media */}
            <div className="px-4 py-2 bg-background flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Like button with count */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleLike}
                      disabled={!user || likingPost}
                      className="flex items-center gap-1.5 hover:opacity-60 transition-opacity disabled:opacity-50"
                    >
                      <Heart 
                        className={`w-6 h-6 transition-colors ${likedPosts.has(postId) ? 'fill-red-500 text-red-500' : ''}`} 
                      />
                    </button>
                    {post.likes_count > 0 && (
                      <span className="text-sm text-muted-foreground">{post.likes_count}</span>
                    )}
                  </div>
                  
                  {/* Comment button with count */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCommentsDrawerOpen(true)}
                      className="flex items-center gap-1.5 hover:opacity-60 transition-opacity"
                    >
                      <MessageCircle className="w-6 h-6" />
                    </button>
                    {post.comments_count > 0 && (
                      <span className="text-sm text-muted-foreground">{post.comments_count}</span>
                    )}
                  </div>
                  
                  {/* Share button with count */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShareOpen(true)}
                      className="flex items-center gap-1.5 hover:opacity-60 transition-opacity"
                    >
                      <Send className="w-6 h-6" />
                    </button>
                    {sharesCount > 0 && (
                      <span className="text-sm text-muted-foreground">{sharesCount}</span>
                    )}
                  </div>
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

            {/* Like count section - more compact without showing likers */}
            <div className="px-4 py-1 bg-background flex-shrink-0">
              {(post.likes_count > 0 || post.saves_count > 0 || sharesCount > 0) && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {post.likes_count > 0 && (
                    <span>{post.likes_count} {post.likes_count === 1 ? 'like' : 'likes'}</span>
                  )}
                  {post.saves_count > 0 && (
                    <span>{post.saves_count} {post.saves_count === 1 ? 'save' : 'saves'}</span>
                  )}
                  {sharesCount > 0 && (
                    <span>{sharesCount} {sharesCount === 1 ? 'share' : 'shares'}</span>
                  )}
                </div>
              )}
            </div>

            {/* Caption and interaction */}
            <div className="px-4 py-3 bg-background flex-shrink-0">
              {post.likes_count > 0 && (
                <div className="flex items-center gap-2 mb-2">
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

              {/* Caption */}
              {post.caption && (
                <p className="text-sm mb-2">
                  <button
                    onClick={() => navigate(`/profile/${post.user_id}`)}
                    className="font-semibold hover:opacity-70 mr-2"
                  >
                    {post.profiles.username}
                  </button>
                  <span>{post.caption}</span>
                </p>
              )}

              {/* View comments button */}
              {post.comments_count > 0 && (
                <button
                  onClick={() => setCommentsDrawerOpen(true)}
                  className="text-sm text-muted-foreground hover:text-foreground mb-3"
                >
                  View all {post.comments_count} {post.comments_count === 1 ? 'comment' : 'comments'}
                </button>
              )}

              {/* Timestamp - subtle and small, left-aligned */}
              <p className="text-[10px] text-muted-foreground/60 text-left">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full gap-2">
            <X className="w-12 h-12 text-destructive" />
            <p className="text-muted-foreground">Failed to load post</p>
          </div>
        )}
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

      {/* Share Modal */}
      {/* Share Modal */}
      <PostShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        post={post ? { id: post.id, caption: post.caption, media_urls: post.media_urls } : null}
        onShared={async () => { await loadPostData(); }}
      />

      {/* Review Modal */}
      {post && (
        <ReviewModal
          postId={postId}
          locationId={post.location_id}
          locationName={post.locations?.name}
          isOpen={reviewOpen}
          onClose={() => setReviewOpen(false)}
          onReviewSubmitted={() => {
            loadReviews();
            loadPostData();
          }}
        />
      )}
    </>
  );
};

export default PostDetailModal;
