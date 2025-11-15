import React, { useEffect, useState, memo, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOptimizedFeed } from '@/hooks/useOptimizedFeed';
import { useQuery } from '@tanstack/react-query';
import { useTabPrefetch } from '@/hooks/useTabPrefetch';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useStories } from '@/hooks/useStories';
import StoriesViewer from '@/components/StoriesViewer';
import { getPostLikesWithUsers, PostLikeUser, getPostComments, addPostComment, deletePostComment, Comment } from '@/services/socialEngagementService';
import { useTranslation } from 'react-i18next';
import { CommentDrawer } from '@/components/social/CommentDrawer';
import { ShareModal } from '@/components/social/ShareModal';
import { messageService } from '@/services/messageService';
import { toast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useQueryClient } from '@tanstack/react-query';

// Lazy load heavy component
const FeedPostItem = lazy(() => import('@/components/feed/FeedPostItem'));

const FeedPage = memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  
  // Prefetch altre tab per transizioni istantanee
  useTabPrefetch('feed');
  
  const [feedType, setFeedType] = useState<'forYou' | 'promotions'>('forYou');
  
  // Usa React Query per feed "Per te" - post degli utenti seguiti (esclusi business post)
  const { posts: forYouFeed, loading: feedLoading } = useOptimizedFeed();
  
  // Query separata per le promozioni - carica i POST BUSINESS (is_business_post = true)
  const { data: promotionsFeed = [], isLoading: promotionsLoading } = useQuery({
    queryKey: ['promotions-feed', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Carica post business (is_business_post = true) con profili e locations
      const { data: businessPosts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('is_business_post', true)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Business posts feed error:', error);
        return [];
      }
      
      const posts = businessPosts || [];
      if (posts.length === 0) return [];
      
      // Carica profili business e locations in parallelo
      const userIds = Array.from(new Set(posts.map((p: any) => p.user_id).filter(Boolean)));
      const locationIds = Array.from(new Set(posts.map((p: any) => p.location_id).filter(Boolean)));
      
      const [businessProfilesRes, locationsRes] = await Promise.all([
        userIds.length > 0
          ? supabase
              .from('business_profiles')
              .select('user_id, business_name, location_id, verification_status')
              .in('user_id', userIds)
              .eq('verification_status', 'verified')
          : Promise.resolve({ data: [], error: null }),
        locationIds.length > 0
          ? supabase
              .from('locations')
              .select('id, name, address, city, latitude, longitude, category, image_url')
              .in('id', locationIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      
      const businessProfiles = (businessProfilesRes as any).data || [];
      const locations = (locationsRes as any).data || [];
      
      // Per ottenere avatar business, carica le locations dei business profiles
      const bizLocationIds = businessProfiles.map((bp: any) => bp.location_id).filter(Boolean);
      const { data: bizLocations } = await supabase
        .from('locations')
        .select('id, image_url')
        .in('id', bizLocationIds);
      
      const bizLocMap = new Map((bizLocations || []).map((l: any) => [l.id, l.image_url]));
      
      // Crea mappe
      const businessProfileMap = new Map(
        businessProfiles.map((bp: any) => [
          bp.user_id,
          {
            id: bp.user_id,
            username: bp.business_name,
            avatar_url: bp.location_id ? bizLocMap.get(bp.location_id) : null,
            is_business: true,
          },
        ])
      );
      const locationMap = new Map(locations.map((l: any) => [l.id, l]));
      
      // Arricchisci i post con profili e locations
      const enriched = posts
        .map((p: any) => ({
          ...p,
          profiles: businessProfileMap.get(p.user_id) || null,
          locations: p.location_id ? locationMap.get(p.location_id) : null,
        }))
        .filter((p: any) => p.profiles); // Mostra solo post di business verificati
      
      console.log('✅ Business posts loaded:', enriched.length);
      return enriched;
    },
    enabled: feedType === 'promotions',
    staleTime: 5 * 60 * 1000,
  });
  
  // Seleziona il feed appropriato in base al tipo
  const feedItems = feedType === 'promotions' ? promotionsFeed : forYouFeed;
  const loading = feedType === 'promotions' ? promotionsLoading : feedLoading;
  
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());
  const [storiesViewerOpen, setStoriesViewerOpen] = useState(false);
  const [selectedUserStoryIndex, setSelectedUserStoryIndex] = useState(0);
  const [filteredStories, setFilteredStories] = useState<typeof stories>([]);
  const [postLikes, setPostLikes] = useState<Map<string, PostLikeUser[]>>(new Map());
  // Comment drawer state
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  
  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  
  const { stories } = useStories();

  // Hide bottom navigation when overlays are open
  useEffect(() => {
    const isOpen = commentDrawerOpen || shareModalOpen;
    window.dispatchEvent(new CustomEvent(isOpen ? 'ui:overlay-open' : 'ui:overlay-close'));
    return () => {
      window.dispatchEvent(new CustomEvent('ui:overlay-close'));
    };
  }, [commentDrawerOpen, shareModalOpen]);

  // Carica likes quando cambiano i feedItems
  useEffect(() => {
    if (!user?.id || feedItems.length === 0) return;
    
    const loadLikes = async () => {
      const likesMap = new Map<string, PostLikeUser[]>();
      await Promise.all(
        feedItems.slice(0, 10).map(async (item: any) => {
          const postId = item.id;
          const likes = await getPostLikesWithUsers(postId, user.id, 3);
          likesMap.set(postId, likes);
        })
      );
      setPostLikes(likesMap);
    };
    
    loadLikes();
  }, [feedItems, user?.id]);

  const handleAvatarClick = (userId: string, isBusiness: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    // Filter only this user's active (non-expired) stories
    const now = new Date().toISOString();
    const userStories = stories.filter(s => 
      s.user_id === userId && 
      new Date(s.expires_at).toISOString() > now
    );
    
    if (userStories.length > 0) {
      // Set filtered stories to only this user's stories
      setFilteredStories(userStories);
      setSelectedUserStoryIndex(0); // Always start from the first story of this user
      setStoriesViewerOpen(true);
    } else {
      // SEMPRE naviga al profilo pubblico, mai al dashboard business
      navigate(`/profile/${userId}`);
    }
  };

  const handleLocationClick = (postId: string, locationId: string, latitude: number, longitude: number, locationName: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/', {
      state: {
        centerMap: {
          lat: latitude,
          lng: longitude,
          locationId: locationId,
          shouldFocus: true
        },
        openPinDetail: {
          id: locationId,
          name: locationName || '',
          lat: latitude,
          lng: longitude,
          sourcePostId: postId
        }
      }
    });
  };

  const toggleCaption = (postId: string) => {
    setExpandedCaptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const handleCommentClick = async (postId: string) => {
    setCommentPostId(postId);
    setCommentDrawerOpen(true);
    
    // Load comments
    const postComments = await getPostComments(postId);
    setComments(postComments);
  };

  const handleAddComment = async (content: string) => {
    if (!user?.id || !commentPostId) return;
    
    const newComment = await addPostComment(commentPostId, user.id, content);
    if (newComment) {
      setComments(prev => [...prev, newComment]);
      // Invalida cache per aggiornare count
      queryClient.invalidateQueries({ queryKey: ['feed', user.id] });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user?.id) return;
    
    const success = await deletePostComment(commentId, user.id);
    if (success) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      // Invalida cache per aggiornare count
      queryClient.invalidateQueries({ queryKey: ['feed', user.id] });
    }
  };

  const handleShareClick = (postId: string) => {
    setSharePostId(postId);
    setShareModalOpen(true);
  };

  const handleShare = async (recipientIds: string[]) => {
    if (!sharePostId) return false;
    
    const postItem = feedItems.find(item => item.id === sharePostId);
    if (!postItem) return false;

    try {
      const postData = {
        id: sharePostId,
        caption: postItem.caption,
        media_urls: postItem.media_urls || []
      };

      await Promise.all(
        recipientIds.map(recipientId => 
          messageService.sendPostShare(recipientId, postData)
        )
      );

      toast({
        title: "✅ Post condiviso!",
        description: `Condiviso con ${recipientIds.length} ${recipientIds.length === 1 ? 'persona' : 'persone'}`,
      });

      return true;
    } catch (error) {
      console.error('Error sharing post:', error);
      toast({
        title: "Error",
        description: "Failed to share post",
        variant: "destructive",
      });
      return false;
    }
  };


  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background shadow-sm shrink-0 w-full">
          <div className="py-3 pl-4 flex justify-start w-full">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="h-auto p-0 hover:bg-transparent font-bold text-lg gap-1.5 -ml-2 justify-start text-left"
                >
                  {feedType === 'forYou' ? t('forYou') : t('promotions')}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-background z-50 rounded-lg">
                <DropdownMenuItem 
                  onClick={() => setFeedType('forYou')}
                  className="cursor-pointer focus:bg-accent"
                >
                  <div className="flex flex-col py-1">
                    <span className="font-semibold">{t('forYou')}</span>
                    <span className="text-xs text-muted-foreground">{t('forYouDesc')}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setFeedType('promotions')}
                  className="cursor-pointer focus:bg-accent"
                >
                  <div className="flex flex-col py-1">
                    <span className="font-semibold">{t('promotions')}</span>
                    <span className="text-xs text-muted-foreground">{t('promotionsDesc')}</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Feed Content */}
        <div className="flex-1 overflow-y-scroll pb-24 scrollbar-hide bg-background">
          {feedItems.length === 0 && loading ? (
            <div className="py-4 w-full">
              {[1,2,3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center gap-3 px-3 py-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="aspect-square w-full" />
                </div>
              ))}
            </div>
           ) : feedItems.length === 0 ? (
            <div className="text-center py-12 px-4 text-muted-foreground w-full">
              <p className="mb-2">{t('feedEmpty')}</p>
              <p className="text-sm">{t('startFollowing')}</p>
              <Button
                onClick={() => navigate('/explore')}
                variant="link"
                className="mt-4"
              >
                {t('exploreUsers')}
              </Button>
            </div>
           ) : (
            <div className="space-y-0 bg-background">
              {feedItems.map((item) => {
                const profile = item.profiles as any;
                const userId = item.user_id;
                const userHasStory = stories.some(s => s.user_id === userId);

                return (
                  <Suspense key={item.id} fallback={<Skeleton className="h-96 w-full" />}>
                    <FeedPostItem
                      item={item}
                      profile={profile}
                      userHasStory={userHasStory}
                      postLikes={postLikes}
                      expandedCaptions={expandedCaptions}
                      isPromotionFeed={feedType === 'promotions'}
                      onAvatarClick={handleAvatarClick}
                      onLocationClick={handleLocationClick}
                      onCommentClick={handleCommentClick}
                      onShareClick={handleShareClick}
                      onToggleCaption={toggleCaption}
                    />
                  </Suspense>
                );
              })}
            </div>
          )}
        </div>

        {/* Comment Drawer */}
        <CommentDrawer
          isOpen={commentDrawerOpen}
          onClose={() => {
            setCommentDrawerOpen(false);
            setCommentPostId(null);
            setComments([]);
          }}
          comments={comments}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
        />

        {/* Share Modal */}
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => {
            setShareModalOpen(false);
            setSharePostId(null);
          }}
          onShare={handleShare}
          postId={sharePostId || undefined}
        />

        {/* Stories Viewer */}
        {storiesViewerOpen && filteredStories.length > 0 && (
          <StoriesViewer
            stories={filteredStories.map((s) => ({
              id: s.id,
              userId: s.user_id,
              userName: 'User',
              userAvatar: '',
              mediaUrl: s.media_url,
              mediaType: s.media_type as 'image' | 'video',
              locationId: s.location_id || '',
              locationName: s.location_name || '',
              locationAddress: s.location_address || '',
              timestamp: s.created_at,
              isViewed: false
            }))}
            initialStoryIndex={selectedUserStoryIndex}
            onClose={() => {
              setStoriesViewerOpen(false);
              setFilteredStories([]);
            }}
            onStoryViewed={() => {}}
          />
        )}
      </div>
    </div>
  );
});

FeedPage.displayName = 'FeedPage';

export default FeedPage;
