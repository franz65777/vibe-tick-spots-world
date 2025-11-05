import React, { useState, useEffect } from 'react';
import { MapPin, Star, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { CommentDrawer } from '@/components/social/CommentDrawer';
import { ShareModal } from '@/components/social/ShareModal';
import { PostActions } from '@/components/feed/PostActions';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { getPostComments, addPostComment, deletePostComment, type Comment } from '@/services/socialEngagementService';

interface PostDetailModalMobileProps {
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
  saves_count: number;
  shares_count: number;
  rating: number | null;
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
  } | null;
}

export const PostDetailModalMobile = ({ postId, isOpen, onClose }: PostDetailModalMobileProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentsDrawerOpen, setCommentsDrawerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [expandedCaption, setExpandedCaption] = useState(false);

  useEffect(() => {
    if (isOpen && postId) {
      loadPostData();
    }
  }, [isOpen, postId]);

  const loadPostData = async () => {
    try {
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();

      if (postError) throw postError;
      if (!postData) throw new Error('Post not found');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', postData.user_id)
        .single();

      let locationData = null;
      if (postData.location_id) {
        const { data: locData } = await supabase
          .from('locations')
          .select('id, name, category, city, latitude, longitude')
          .eq('id', postData.location_id)
          .single();
        locationData = locData;
      }
      
      setPost({
        ...postData,
        profiles: profileData,
        locations: locationData,
      } as any);
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentClick = async () => {
    setCommentsDrawerOpen(true);
    const postComments = await getPostComments(postId);
    setComments(postComments);
  };

  const handleAddComment = async (content: string) => {
    if (!user?.id) return;
    const newComment = await addPostComment(postId, user.id, content);
    if (newComment) {
      setComments(prev => [...prev, newComment]);
      // Reload post to update count
      loadPostData();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user?.id) return;
    const success = await deletePostComment(commentId, user.id);
    if (success) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      loadPostData();
    }
  };

  const handleLocationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post?.locations) return;
    onClose();
    navigate('/', {
      state: {
        centerMap: {
          lat: post.locations.latitude,
          lng: post.locations.longitude,
          locationId: post.locations.id,
          shouldFocus: true
        },
        openPinDetail: {
          id: post.locations.id,
          name: post.locations.name,
          lat: post.locations.latitude,
          lng: post.locations.longitude
        }
      }
    });
  };

  const renderCaption = () => {
    if (!post?.caption) return null;
    const caption = post.caption;
    const username = post.profiles.username;
    const userId = post.user_id;
    
    const firstLine = caption.split('\n')[0];
    const MAX_LENGTH = 80;
    const hasMultipleLines = caption.trim().length > firstLine.trim().length;
    const firstLineIsTooLong = firstLine.length > MAX_LENGTH;
    const hasMoreContent = hasMultipleLines || firstLineIsTooLong;
    
    const displayFirstLine = firstLineIsTooLong && !expandedCaption 
      ? firstLine.substring(0, MAX_LENGTH)
      : firstLine;

    return (
      <div className="text-sm text-left">
        <span className="text-foreground">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              navigate(`/profile/${userId}`);
            }}
            className="font-semibold hover:opacity-70"
          >
            {username}
          </button>
          {' '}
          <span className="inline">
            {expandedCaption ? (
              <>
                <span className="whitespace-pre-wrap">{caption}</span>
                {' '}
                {hasMoreContent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCaption(false);
                    }}
                    className="text-muted-foreground hover:text-foreground font-medium"
                  >
                    meno
                  </button>
                )}
              </>
            ) : (
              <>
                <span>{displayFirstLine}</span>
                {hasMoreContent && '... '}
                {hasMoreContent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCaption(true);
                    }}
                    className="text-muted-foreground hover:text-foreground font-medium"
                  >
                    altro
                  </button>
                )}
              </>
            )}
          </span>
        </span>
      </div>
    );
  };

  if (!isOpen) return null;

  if (loading || !post) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasMultipleMedia = post.media_urls.length > 1;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-10 w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted"
        >
          <X className="w-5 h-5" />
        </button>

        <article className="min-h-screen pb-20">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-3 border-b border-border">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                  navigate(`/profile/${post.user_id}`);
                }}
                className="shrink-0"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={post.profiles.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {post.profiles.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
              <div className="flex-1 min-w-0">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    navigate(`/profile/${post.user_id}`);
                  }}
                  className="font-semibold text-sm hover:opacity-70 block truncate text-left"
                >
                  {post.profiles.username}
                </button>
                {post.locations && (
                  <button
                    onClick={handleLocationClick}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate"
                  >
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{post.locations.name}</span>
                  </button>
                )}
              </div>
            </div>
            {post.rating && post.rating > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                <span className="text-sm font-semibold">{post.rating}</span>
              </div>
            )}
          </div>

          {/* Media */}
          {post.media_urls.length > 0 && (
            <div className="relative">
              {hasMultipleMedia ? (
                <Carousel className="w-full" gutter={false}>
                  <CarouselContent className="-ml-0">
                    {post.media_urls.map((url, idx) => {
                      const isVideo = url.includes('.mp4') || url.includes('.mov') || url.includes('.webm');
                      return (
                        <CarouselItem key={idx} className="pl-0">
                          <div className="aspect-square w-full">
                            {isVideo ? (
                              <video
                                src={url}
                                className="w-full h-full object-cover"
                                controls
                                playsInline
                                loop
                              />
                            ) : (
                              <img
                                src={url}
                                alt={`Post ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                        </CarouselItem>
                      );
                    })}
                  </CarouselContent>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </Carousel>
              ) : (() => {
                const isVideo = post.media_urls[0].includes('.mp4') || post.media_urls[0].includes('.mov') || post.media_urls[0].includes('.webm');
                return (
                  <div className="aspect-square w-full">
                    {isVideo ? (
                      <video
                        src={post.media_urls[0]}
                        className="w-full h-full object-cover"
                        controls
                        playsInline
                        loop
                      />
                    ) : (
                      <img
                        src={post.media_urls[0]}
                        alt="Post"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Actions and Content */}
          <div className="px-3 py-2 space-y-2.5">
            <PostActions
              postId={post.id}
              likesCount={post.likes_count || 0}
              commentsCount={post.comments_count || 0}
              sharesCount={post.shares_count || 0}
              locationId={post.location_id}
              locationName={post.locations?.name}
              onCommentClick={handleCommentClick}
              onShareClick={() => setShareOpen(true)}
            />

            {/* Caption */}
            {post.caption && renderCaption()}

            {/* Timestamp */}
            <p className="text-xs text-muted-foreground uppercase text-left">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </article>
      </div>

      {/* Comment Drawer */}
      <CommentDrawer
        isOpen={commentsDrawerOpen}
        onClose={() => {
          setCommentsDrawerOpen(false);
          setComments([]);
        }}
        comments={comments}
        onAddComment={handleAddComment}
        onDeleteComment={handleDeleteComment}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        onShare={async () => true}
        postId={post.id}
      />
    </>
  );
};

export default PostDetailModalMobile;
