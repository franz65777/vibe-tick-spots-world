import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, ChevronLeft, ChevronRight, MapPin, MoreHorizontal, Trash2, EyeOff, X, Star, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useSocialEngagement } from '@/hooks/useSocialEngagement';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { usePostDeletion } from '@/hooks/usePostDeletion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { CommentDrawer } from '@/components/social/CommentDrawer';
import { ShareModal } from '@/components/social/ShareModal';
import { ReviewModal } from './ReviewModal';
import { getPostReviews, type PostReview } from '@/services/reviewService';
import { getLocationRanking } from '@/services/locationRankingService';

interface PostDetailModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  source?: 'pin' | 'search' | 'profile';
  openCommentsOnLoad?: boolean;
  openShareOnLoad?: boolean;
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

export const PostDetailModal = ({ postId, isOpen, onClose, source = 'search', openCommentsOnLoad, openShareOnLoad }: PostDetailModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const engagement = useSocialEngagement(postId);
  const { savePlace, isPlaceSaved } = useSavedPlaces();
  const { deletePost, deleting } = usePostDeletion();
  const [post, setPost] = useState<PostData | null>(null);
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
  const [locationRanking, setLocationRanking] = useState<number | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && postId) {
      loadPostData();
      loadPostLikers();
      loadReviews();
      setCurrentMediaIndex(0);
      if (openCommentsOnLoad) setCommentsDrawerOpen(true);
      if (openShareOnLoad) setShareOpen(true);
    }
  }, [isOpen, postId, openCommentsOnLoad, openShareOnLoad]);

  const loadLocationRankingData = async (locId: string) => {
    const ranking = await getLocationRanking(locId);
    setLocationRanking(ranking);
  };

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

  // Detect media aspect ratio
  useEffect(() => {
    if (post?.media_urls?.[0]) {
      const img = new Image();
      img.onload = () => {
        setMediaAspectRatio(img.width > img.height ? 'horizontal' : 'vertical');
      };
      img.src = post.media_urls[0];
    }
  }, [post]);

  const loadPostData = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          caption,
          comments_count,
          created_at,
          id,
          likes_count,
          location_id,
          media_urls,
          rating,
          saves_count,
          shares_count,
          user_id,
          profiles(username, avatar_url),
          locations(id, name, category, city, latitude, longitude, google_place_id)
        `)
        .eq('id', postId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Post not found');
      
      setPost({
        ...data,
        profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
        locations: Array.isArray(data.locations) ? data.locations[0] : data.locations,
      } as any);

      if (data?.location_id) {
        loadLocationRankingData(data.location_id);
      }
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPostLikers = async () => {
    try {
      const { data, error } = await supabase
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
        .limit(5);

      if (error) throw error;

      const likers = data
        ?.map((like: any) => ({
          id: like.profiles.id,
          username: like.profiles.username,
          avatar_url: like.profiles.avatar_url
        }))
        .filter(Boolean) || [];

      setPostLikers(likers);
    } catch (error) {
      console.error('Error loading post likers:', error);
    }
  };

  const handleLikePost = async () => {
    if (!user || !postId || likingPost) return;
    setLikingPost(true);
    try {
      await engagement.toggleLike();
      await loadPostData();
      await loadPostLikers();
    } finally {
      setLikingPost(false);
    }
  };

  const handleSaveLocation = async () => {
    if (!post?.locations || !user || savingLocation) return;

    setSavingLocation(true);
    try {
      await savePlace({
        id: post.locations.google_place_id || post.locations.id,
        google_place_id: post.locations.google_place_id,
        name: post.locations.name,
        address: '',
        city: post.locations.city,
        latitude: post.locations.latitude,
        longitude: post.locations.longitude,
        category: post.locations.category,
        coordinates: {
          lat: post.locations.latitude,
          lng: post.locations.longitude
        }
      });
      toast.success('Location saved');
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Failed to save location');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleDeletePost = async () => {
    const success = await deletePost(postId);
    if (success) {
      onClose();
      toast.success('Post deleted');
    }
  };

  const nextMedia = () => {
    if (!post) return;
    const container = scrollContainerRef.current;
    if (container) {
      const nextIndex = Math.min(currentMediaIndex + 1, post.media_urls.length - 1);
      container.scrollTo({
        left: nextIndex * container.offsetWidth,
        behavior: 'smooth'
      });
    }
  };

  const prevMedia = () => {
    const container = scrollContainerRef.current;
    if (container) {
      const prevIndex = Math.max(currentMediaIndex - 1, 0);
      container.scrollTo({
        left: prevIndex * container.offsetWidth,
        behavior: 'smooth'
      });
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white text-sm">Loading post...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="text-center p-6">
          <p className="text-white text-lg mb-4">Post not found</p>
          <Button onClick={onClose} variant="outline">Close</Button>
        </div>
      </div>
    );
  }

  const hasMultipleMedia = post.media_urls.length > 1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/90 z-50"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 pointer-events-none">
        <div className="relative w-full h-full max-w-5xl pointer-events-auto flex items-center justify-center">
          <div className="relative bg-background rounded-none md:rounded-2xl w-full h-full md:h-auto md:max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl">
            
            {/* Left: Media Section */}
            <div className="relative flex-shrink-0 w-full md:w-[60%] bg-black flex items-center justify-center">
              {/* Media Carousel */}
              <div
                ref={scrollContainerRef}
                className="w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide flex"
              >
                {post.media_urls.map((url, idx) => (
                  <div key={idx} className="snap-center flex-shrink-0 w-full h-full flex items-center justify-center">
                    <img
                      src={url}
                      alt={`Post media ${idx + 1}`}
                      className={`max-w-full max-h-full object-contain ${
                        mediaAspectRatio === 'horizontal' ? 'w-full' : 'h-full'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Navigation Arrows */}
              {hasMultipleMedia && (
                <>
                  {currentMediaIndex > 0 && (
                    <button
                      onClick={prevMedia}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white backdrop-blur-sm transition-all z-10"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  )}
                  {currentMediaIndex < post.media_urls.length - 1 && (
                    <button
                      onClick={nextMedia}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white backdrop-blur-sm transition-all z-10"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  )}
                </>
              )}

              {/* Media Indicators */}
              {hasMultipleMedia && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {post.media_urls.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentMediaIndex
                          ? 'w-6 bg-white'
                          : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white backdrop-blur-sm transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Right: Content Section */}
            <div className="flex-1 flex flex-col bg-background overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={post.profiles.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {post.profiles.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{post.profiles.username}</p>
                    {post.locations && (
                      <button
                        onClick={() => {
                          onClose();
                          navigate('/explore', {
                            state: {
                              openLocationDetail: {
                                id: post.locations!.id,
                                name: post.locations!.name,
                                google_place_id: post.locations!.google_place_id
                              }
                            }
                          });
                        }}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{post.locations.name}</span>
                      </button>
                    )}
                  </div>
                  {locationRanking && (
                    <div className="shrink-0 flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                      <span className="text-lg font-bold text-primary">{locationRanking}</span>
                      <span className="text-xs text-primary">/10</span>
                    </div>
                  )}
                </div>

                {/* More Options */}
                {user?.id === post.user_id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete post
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {/* Caption */}
                {post.caption && (
                  <div className="space-y-1">
                    <p className="text-sm leading-relaxed">{post.caption}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </p>
                  </div>
                )}

                {/* Engagement Stats */}
                <div className="flex items-center gap-4 py-2">
                  <div className="flex items-center gap-1.5">
                    <button onClick={handleLikePost} disabled={likingPost}>
                      <Heart className={`w-5 h-5 ${engagement.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                    <span className="text-sm font-medium">{engagement.likeCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setCommentsDrawerOpen(true)}>
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium">{engagement.comments.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setShareOpen(true)}>
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                  <button onClick={() => engagement.toggleSave()} className="ml-auto">
                    <Bookmark className={`w-5 h-5 ${engagement.isSaved ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
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
            <AlertDialogAction onClick={handleDeletePost} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Comment Drawer */}
      <CommentDrawer
        isOpen={commentsDrawerOpen}
        onClose={() => setCommentsDrawerOpen(false)}
        comments={engagement.comments}
        onAddComment={engagement.addComment}
        onDeleteComment={engagement.deleteComment}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        onShare={engagement.sharePost}
      />

      {/* Review Modal */}
      {post.locations && (
        <ReviewModal
          isOpen={reviewOpen}
          onClose={() => setReviewOpen(false)}
          postId={postId}
          locationId={post.locations.id}
          locationName={post.locations.name}
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
